// Creates a Paymob card-payment checkout link for a tenant's subscription.
// Called by the business owner from onboarding (step 2) or the Billing
// panel. Requires PAYMOB_API_KEY, PAYMOB_CARD_INTEGRATION_ID, and
// PAYMOB_IFRAME_ID to be set as Supabase Edge Function secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYMOB_BASE = "https://accept.paymob.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id } = await req.json();
    if (!tenant_id) throw new Error("tenant_id is required");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is signed in and owns this tenant, using their own JWT (RLS-scoped).
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Not authenticated");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership } = await admin
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || membership.role !== "owner") throw new Error("Not the owner of this tenant");

    const { data: tenant } = await admin.from("tenants").select("id, name, plan_id, phone, email").eq("id", tenant_id).single();
    if (!tenant) throw new Error("Tenant not found");

    const { data: plan } = await admin.from("plans").select("id, price_monthly, currency").eq("id", tenant.plan_id).single();
    if (!plan) throw new Error("Plan not found");
    if (Number(plan.price_monthly) <= 0) throw new Error("This plan has no charge — nothing to pay");

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenant_id)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    const amountCents = Math.round(Number(plan.price_monthly) * 100);

    const apiKey = Deno.env.get("PAYMOB_API_KEY");
    const integrationId = Deno.env.get("PAYMOB_CARD_INTEGRATION_ID");
    const iframeId = Deno.env.get("PAYMOB_IFRAME_ID");
    if (!apiKey || !integrationId || !iframeId) {
      throw new Error("Paymob is not configured yet — add PAYMOB_API_KEY, PAYMOB_CARD_INTEGRATION_ID and PAYMOB_IFRAME_ID as edge function secrets");
    }

    // 1. Auth
    const authRes = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const authJson = await authRes.json();
    if (!authRes.ok || !authJson.token) throw new Error(`Paymob auth failed: ${JSON.stringify(authJson)}`);
    const authToken = authJson.token;

    // 2. Order
    const orderRes = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: plan.currency || "EGP",
        merchant_order_id: `${tenant_id}-${Date.now()}`,
        items: [],
      }),
    });
    const orderJson = await orderRes.json();
    if (!orderRes.ok || !orderJson.id) throw new Error(`Paymob order failed: ${JSON.stringify(orderJson)}`);

    // 3. Payment key
    const keyRes = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderJson.id,
        currency: plan.currency || "EGP",
        integration_id: Number(integrationId),
        billing_data: {
          apartment: "NA", floor: "NA", street: "NA", building: "NA",
          city: "Cairo", country: "EG", state: "NA",
          first_name: tenant.name || "Merchant", last_name: "Sanadak",
          phone_number: tenant.phone || "+201000000000",
          email: tenant.email || "merchant@sanadak.app",
        },
      }),
    });
    const keyJson = await keyRes.json();
    if (!keyRes.ok || !keyJson.token) throw new Error(`Paymob payment key failed: ${JSON.stringify(keyJson)}`);

    await admin.from("payment_intentions").insert({
      tenant_id, subscription_id: subscription?.id ?? null, provider: "paymob",
      provider_order_id: String(orderJson.id), amount_cents: amountCents, currency: plan.currency || "EGP",
      status: "pending",
    });

    const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${keyJson.token}`;

    return new Response(JSON.stringify({ checkout_url: checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
