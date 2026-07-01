import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles, ImageOff, Wand2, ArrowUpCircle, Camera, PaintBucket,
  FileText, Search as SearchIcon, Megaphone, Share2, Lock, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader } from "../ui";
import type { PlanRow, TenantWithRole } from "../types";

type Feature = {
  id: string;
  icon: any;
  labelAr: string; labelEn: string;
  descAr: string; descEn: string;
  kind: "text" | "image";
};

const FEATURES: Feature[] = [
  { id: "bg_remove", icon: ImageOff, labelAr: "إزالة الخلفية", labelEn: "Background removal", descAr: "إزالة خلفية صور المنتجات تلقائياً", descEn: "Auto-remove product photo backgrounds", kind: "image" },
  { id: "enhance", icon: Wand2, labelAr: "تحسين الصور", labelEn: "Image enhancement", descAr: "تحسين وضوح وألوان صور المنتجات", descEn: "Sharpen and color-correct product photos", kind: "image" },
  { id: "upscale", icon: ArrowUpCircle, labelAr: "تكبير الصور", labelEn: "Image upscaling", descAr: "رفع دقة الصور دون فقد الجودة", descEn: "Upscale images without losing quality", kind: "image" },
  { id: "product_photo", icon: Camera, labelAr: "تصوير منتج بالذكاء الاصطناعي", labelEn: "AI product photography", descAr: "توليد صور منتج احترافية", descEn: "Generate studio-quality product shots", kind: "image" },
  { id: "bg_generate", icon: PaintBucket, labelAr: "توليد خلفيات", labelEn: "AI background generation", descAr: "خلفيات إبداعية مطابقة لهوية متجرك", descEn: "Creative backgrounds matching your brand", kind: "image" },
  { id: "description", icon: FileText, labelAr: "توليد وصف المنتج", labelEn: "Product description generator", descAr: "وصف تسويقي جاهز لمنتجك", descEn: "Ready-to-use marketing copy for your item", kind: "text" },
  { id: "seo", icon: SearchIcon, labelAr: "محتوى SEO", labelEn: "SEO content generator", descAr: "عناوين ووصف محسّن لمحركات البحث", descEn: "Search-optimized titles & meta copy", kind: "text" },
  { id: "marketing", icon: Megaphone, labelAr: "محتوى تسويقي", labelEn: "Marketing content generator", descAr: "نصوص إعلانية جاهزة للنشر", descEn: "Ready-to-publish ad copy", kind: "text" },
  { id: "social", icon: Share2, labelAr: "منشورات السوشيال ميديا", labelEn: "Social media post generator", descAr: "منشور جاهز لإنستجرام وفيسبوك", descEn: "Ready posts for Instagram & Facebook", kind: "text" },
];

function generateCopy(featureId: string, tenantName: string, category: string, prompt: string, lang: "ar" | "en") {
  const subject = prompt || tenantName;
  if (lang === "ar") {
    switch (featureId) {
      case "description": return `${subject} من ${tenantName} — جودة مضمونة وتجربة تستحق الثقة. اطلب الآن عبر سندك واستمتع بأفضل خدمة في فئة ${category}.`;
      case "seo": return `${subject} | ${tenantName} — أفضل ${category} بالقرب منك. احجز أو اطلب الآن عبر منصة سندك.`;
      case "marketing": return `🔥 عرض خاص من ${tenantName}! جرّب ${subject} اليوم واستمتع بتجربة لا تُنسى. اطلب الآن عبر سندك.`;
      case "social": return `✨ ${subject} وصل لعندكم من ${tenantName}!\n📍 اطلبوا الآن عبر تطبيق سندك.\n#سندك #${category}`;
      default: return subject;
    }
  }
  switch (featureId) {
    case "description": return `${subject} by ${tenantName} — quality you can trust. Order now on Sanadak for the best ${category} experience.`;
    case "seo": return `${subject} | ${tenantName} — top-rated ${category} near you. Book or order now on Sanadak.`;
    case "marketing": return `🔥 Special offer from ${tenantName}! Try ${subject} today — order now on Sanadak.`;
    case "social": return `✨ ${subject} just landed at ${tenantName}!\n📍 Order now on the Sanadak app.\n#Sanadak #${category}`;
    default: return subject;
  }
}

export function AiStudioPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!tenant.plan_id) return;
    const { data: p } = await supabase.from("plans" as any).select("*").eq("id", tenant.plan_id).maybeSingle();
    setPlan((p as any) ?? null);
    const periodMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { count } = await supabase.from("ai_usage" as any).select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id).eq("period_month", periodMonth);
    setUsedThisMonth(count ?? 0);
  };
  useEffect(() => { load(); }, [tenant.id, tenant.plan_id]);

  const quota = plan?.ai_quota_monthly ?? 0;
  const enabled = !!plan?.features?.ai_studio;
  const remaining = Math.max(0, quota - usedThisMonth);

  const run = async (feature: Feature) => {
    if (!enabled) return;
    if (remaining <= 0) {
      toast.error(lang === "ar" ? "استنفدت رصيد الذكاء الاصطناعي هذا الشهر." : "You've used all your AI quota this month.");
      return;
    }
    if (feature.kind === "image") {
      toast.info(lang === "ar" ? "قريباً — يتطلب ربط مزود توليد صور بالذكاء الاصطناعي." : "Coming soon — requires connecting an image-AI provider.");
      return;
    }
    setBusy(feature.id);
    try {
      const text = generateCopy(feature.id, tenant.name, tenant.category, prompts[feature.id] ?? "", lang);
      await new Promise((r) => setTimeout(r, 400));
      setResults((r) => ({ ...r, [feature.id]: text }));
      await supabase.from("ai_usage" as any).insert({ tenant_id: tenant.id, feature: feature.id, tokens: text.length });
      sfx.success();
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(lang === "ar" ? "تم النسخ" : "Copied");
  };

  if (!plan) return null;

  if (!enabled) {
    return (
      <div>
        <PanelHeader title={lang === "ar" ? "استوديو الذكاء الاصطناعي" : "AI Studio"} />
        <div className="glass-card rounded-2xl p-8 text-center">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className={`text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "استوديو الذكاء الاصطناعي متاح لباقتي Pro وPremium فقط. قم بالترقية من قسم الفوترة." : "AI Studio is available on Pro and Premium plans. Upgrade from Billing."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "استوديو الذكاء الاصطناعي" : "AI Studio"}
        subtitle={lang === "ar" ? `${remaining} من ${quota} عملية متبقية هذا الشهر` : `${remaining} of ${quota} operations left this month`}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <motion.div key={f.id} layout className="glass-card rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0"><Icon className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? f.labelAr : f.labelEn}</div>
                  <p className={`text-xs text-muted-foreground mt-0.5 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? f.descAr : f.descEn}</p>
                </div>
              </div>
              {f.kind === "text" && (
                <input
                  value={prompts[f.id] ?? ""}
                  onChange={(e) => setPrompts((p) => ({ ...p, [f.id]: e.target.value }))}
                  placeholder={lang === "ar" ? "اسم المنتج أو الموضوع (اختياري)" : "Product / topic (optional)"}
                  className="mt-3 w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
                />
              )}
              <button
                disabled={busy === f.id || (f.kind === "text" && remaining <= 0)}
                onClick={() => run(f)}
                className="mt-3 w-full h-9 rounded-full bg-gradient-brand text-primary-foreground text-sm font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" /> {f.kind === "image" ? (lang === "ar" ? "قريباً" : "Coming soon") : (lang === "ar" ? "توليد" : "Generate")}
              </button>
              {results[f.id] && (
                <div className="mt-3 glass-panel rounded-xl p-3 text-xs whitespace-pre-wrap relative">
                  {results[f.id]}
                  <button onClick={() => copy(results[f.id])} className="absolute top-2 end-2 h-6 w-6 grid place-items-center rounded-full hover:bg-foreground/10"><Copy className="h-3 w-3" /></button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
