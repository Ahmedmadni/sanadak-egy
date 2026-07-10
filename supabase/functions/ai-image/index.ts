// AI Studio image features: background removal, enhancement, AI product
// photography, and AI background generation. Requires OPENAI_API_KEY as an
// edge function secret — returns a clear error (surfaced as a toast) until
// then, it does not silently no-op.
//
// Enforces the plan's AI quota server-side (the text-generation features in
// AiStudioPanel only check quota client-side, which is fine since they're
// free to run; this one spends real API credit, so it's checked here too).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPTS: Record<string, (extra: string) => string> = {
  bg_remove: () => "Remove the background completely. Keep the main product exactly as-is (same shape, colors, proportions), place it on a plain transparent/white background. Do not alter the product itself.",
  enhance: () => "Enhance this product photo: improve lighting, sharpness, and color accuracy. Keep the product, composition, and background exactly as they are — do not add or remove anything.",
  product_photo: (extra) => `Professional studio product photography, clean minimal background, soft even lighting, high detail, commercial e-commerce style. ${extra}`.trim(),
  bg_generate: (extra) => `Keep the main product in this image exactly as-is. Replace only the background with a creative, on-brand backdrop. ${extra}`.trim(),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id, mode, image_url, prompt } = await req.json();
    if (!tenant_id || !mode) throw new Error("tenant_id and mode are required");
    if (!PROMPTS[mode]) throw new Error(`Unknown mode: ${mode}`);
    if ((mode === "bg_remove" || mode === "enhance") && !image_url) throw new Error("This feature needs a source image");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Not authenticated");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership } = await admin.from("tenant_members").select("role").eq("tenant_id", tenant_id).eq("user_id", user.id).maybeSingle();
    if (!membership) throw new Error("Not a member of this tenant");

    const { data: tenant } = await admin.from("tenants").select("id, plan_id").eq("id", tenant_id).single();
    if (!tenant) throw new Error("Tenant not found");
    const { data: plan } = await admin.from("plans").select("features, ai_quota_monthly").eq("id", tenant.plan_id).single();
    if (!plan?.features?.ai_studio) throw new Error("AI Studio is not available on this plan");

    const periodMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { count: usedThisMonth } = await admin.from("ai_usage").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant_id).eq("period_month", periodMonth);
    if ((usedThisMonth ?? 0) >= (plan.ai_quota_monthly ?? 0)) throw new Error("Monthly AI quota reached");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("AI image generation is not configured yet — add OPENAI_API_KEY as an edge function secret");

    const fullPrompt = PROMPTS[mode](prompt || "");
    let resJson: any;

    if (image_url) {
      const imgRes = await fetch(image_url);
      if (!imgRes.ok) throw new Error("Could not fetch the source image");
      const imgBlob = await imgRes.blob();
      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("prompt", fullPrompt);
      form.append("size", "1024x1024");
      form.append("image", imgBlob, "source.png");
      const editRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      resJson = await editRes.json();
      if (!editRes.ok) throw new Error(`OpenAI edit failed: ${JSON.stringify(resJson)}`);
    } else {
      const genRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt: fullPrompt, size: "1024x1024", n: 1 }),
      });
      resJson = await genRes.json();
      if (!genRes.ok) throw new Error(`OpenAI generation failed: ${JSON.stringify(resJson)}`);
    }

    const b64 = resJson.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const path = `${tenant_id}/ai/${crypto.randomUUID()}.png`;
    const { error: uploadErr } = await admin.storage.from("tenant-media").upload(path, bytes, { contentType: "image/png" });
    if (uploadErr) throw uploadErr;
    const publicUrl = admin.storage.from("tenant-media").getPublicUrl(path).data.publicUrl;

    await admin.from("ai_usage").insert({ tenant_id, user_id: user.id, feature: mode, tokens: 1 });

    return new Response(JSON.stringify({ image_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
