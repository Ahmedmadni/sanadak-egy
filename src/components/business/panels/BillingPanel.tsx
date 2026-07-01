import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CreditCard, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader } from "../ui";
import type { PlanRow, SubscriptionRow, TenantWithRole } from "../types";

export function BillingPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const canManage = tenant.role === "owner";

  const load = async () => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("plans" as any).select("*").eq("is_active", true).order("sort_order"),
      supabase.from("subscriptions" as any).select("*").eq("tenant_id", tenant.id).order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPlans((p as any) ?? []);
    setSub((s as any) ?? null);
  };
  useEffect(() => { load(); }, [tenant.id]);

  const currentPlan = plans.find((p) => p.id === tenant.plan_id);

  const requestUpgrade = async (plan: PlanRow) => {
    setBusy(plan.id);
    try {
      const { error } = await supabase.from("support_tickets" as any).insert({
        tenant_id: tenant.id,
        subject: lang === "ar" ? `طلب ترقية إلى باقة ${plan.name_ar}` : `Upgrade request to ${plan.name_en}`,
        body: lang === "ar" ? `صاحب النشاط "${tenant.name}" يطلب الترقية إلى باقة ${plan.name_ar}.` : `Owner of "${tenant.name}" requests upgrade to ${plan.name_en}.`,
        priority: "normal",
      });
      if (error) throw error;
      sfx.success();
      toast.success(lang === "ar" ? "تم إرسال طلب الترقية لفريق سندك." : "Upgrade request sent to the Sanadak team.");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(null); }
  };

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "الاشتراك والفوترة" : "Subscription & billing"} />

      <div className="glass-card rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0"><CreditCard className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? `باقتك الحالية: ${currentPlan?.name_ar ?? "—"}` : `Current plan: ${currentPlan?.name_en ?? "—"}`}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {sub ? `${sub.status} · ${lang === "ar" ? "ينتهي في" : "renews"} ${new Date(sub.current_period_end).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}` : (lang === "ar" ? "لا يوجد اشتراك مسجل" : "No subscription on record")}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.id === tenant.plan_id;
          return (
            <motion.div key={p.id} layout className={`glass-card rounded-2xl p-5 ${isCurrent ? "ring-2 ring-[var(--emerald)]" : ""}`}>
              <div className={`font-semibold text-lg ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? p.name_ar : p.name_en}</div>
              <div className="mt-1 text-2xl font-bold">{p.price_monthly} <span className="text-sm text-muted-foreground">{p.currency}/{lang === "ar" ? "شهر" : "mo"}</span></div>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[var(--emerald)]" /> {p.limits?.products === -1 ? (lang === "ar" ? "منتجات غير محدودة" : "Unlimited products") : `${p.limits?.products ?? 0} ${lang === "ar" ? "منتج" : "products"}`}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[var(--emerald)]" /> {p.limits?.branches === -1 ? (lang === "ar" ? "فروع غير محدودة" : "Unlimited branches") : `${p.limits?.branches ?? 0} ${lang === "ar" ? "فرع" : "branches"}`}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[var(--emerald)]" /> {p.ai_quota_monthly} {lang === "ar" ? "عملية AI شهرياً" : "AI ops / month"}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[var(--emerald)]" /> {lang === "ar" ? "عمولة المنصة" : "Platform commission"}: {p.commission_rate ?? 0}%</li>
                {p.features?.analytics && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[var(--emerald)]" /> {lang === "ar" ? "تحليلات متقدمة" : "Analytics"}</li>}
                {p.features?.api && <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[var(--emerald)]" /> API</li>}
              </ul>
              {canManage && !isCurrent && (
                <button disabled={busy === p.id} onClick={() => requestUpgrade(p)} className="mt-4 w-full h-10 rounded-full bg-gradient-brand text-primary-foreground text-sm font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="h-3.5 w-3.5" /> {lang === "ar" ? "طلب الترقية" : "Request plan"}
                </button>
              )}
              {isCurrent && <div className="mt-4 text-center text-xs text-[var(--emerald)] font-medium">{lang === "ar" ? "باقتك الحالية" : "Current plan"}</div>}
            </motion.div>
          );
        })}
      </div>
      <p className={`mt-4 text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
        {lang === "ar" ? "الدفع الإلكتروني غير مُفعّل بعد — يتم مراجعة طلبات الترقية يدوياً من فريق سندك." : "Online payment isn't wired up yet — upgrade requests are reviewed manually by the Sanadak team."}
      </p>
    </div>
  );
}
