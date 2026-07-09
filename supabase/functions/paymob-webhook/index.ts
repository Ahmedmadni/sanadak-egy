// Paymob "Transaction Processed" webhook. Verifies the HMAC signature,
// then marks the matching payment_intentions row + subscription as paid.
// Does NOT auto-approve the tenant — document review by an admin (in the
// Onboarding panel) is still a separate, required step.
//
// Requires PAYMOB_HMAC_SECRET as an edge function secret. Configure this
// function's URL as the "Transaction processed callback" in the Paymob
// dashboard (Settings -> Payment Integrations -> Callback URLs).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Exact field order per Paymob's HMAC documentation for the transaction
// callback — do not reorder. Verify against the Paymob dashboard docs
// before going live; this is untested against a real account.
const HMAC_FIELDS = [
  "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction",
  "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded",
  "is_standalone_payment", "is_voided", "order.id", "owner", "pending",
  "source_data.pan", "source_data.sub_type", "source_data.type", "success",
];

function getPath(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

async function hmacHex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const receivedHmac = url.searchParams.get("hmac") ?? "";
    const body = await req.json();
    const obj = body.obj ?? body;

    const hmacSecret = Deno.env.get("PAYMOB_HMAC_SECRET");
    if (!hmacSecret) throw new Error("PAYMOB_HMAC_SECRET is not configured");

    const message = HMAC_FIELDS.map((f) => String(getPath(obj, f))).join("");
    const computed = await hmacHex(hmacSecret, message);

    if (computed !== receivedHmac) {
      return new Response(JSON.stringify({ error: "Invalid HMAC" }), { status: 401 });
    }

    if (obj.success !== true || obj.pending === true) {
      return new Response(JSON.stringify({ ok: true, note: "Ignored — not a successful, final transaction" }), { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const orderId = String(obj.order?.id ?? "");
    const { data: intention } = await admin
      .from("payment_intentions")
      .select("*")
      .eq("provider_order_id", orderId)
      .maybeSingle();

    if (!intention) {
      return new Response(JSON.stringify({ ok: true, note: "No matching payment intention" }), { status: 200 });
    }

    await admin.from("payment_intentions").update({
      status: "paid", raw_webhook: obj,
    }).eq("id", intention.id);

    if (intention.subscription_id) {
      await admin.from("subscriptions").update({
        payment_verified_at: new Date().toISOString(),
        payment_provider: "paymob",
        payment_method: "paymob",
        provider_transaction_id: String(obj.id ?? ""),
      }).eq("id", intention.subscription_id);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400 });
  }
});
