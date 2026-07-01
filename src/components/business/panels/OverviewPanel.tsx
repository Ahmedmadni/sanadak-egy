import { useEffect, useState } from "react";
import { Package, CalendarCheck, ShoppingBag, Star, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { PanelHeader, StatCard } from "../ui";
import type { TenantWithRole, SubscriptionRow } from "../types";

export function OverviewPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const [counts, setCounts] = useState({ catalog: 0, orders: 0, bookings: 0, reviews: 0 });
  const [sub, setSub] = useState<SubscriptionRow | null>(null);

  useEffect(() => {
    (async () => {
      const [c, o, b, r, s] = await Promise.all([
        supabase.from("catalog_items" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("orders" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("bookings" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("reviews" as any).select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("subscriptions" as any).select("*").eq("tenant_id", tenant.id).order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setCounts({ catalog: c.count ?? 0, orders: o.count ?? 0, bookings: b.count ?? 0, reviews: r.count ?? 0 });
      setSub((s.data as any) ?? null);
      await supabase.rpc("check_subscription_expiry" as any, { _tenant: tenant.id });
    })();
  }, [tenant.id]);

  const daysLeft = sub ? Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000) : null;

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? `أهلاً بك في ${tenant.name}` : `Welcome to ${tenant.name}`}
        subtitle={lang === "ar" ? "نظرة عامة على أداء نشاطك التجاري" : "A snapshot of your business performance"}
      />

      {tenant.status === "pending" && (
        <div className="mb-6 glass-card rounded-2xl p-4 flex items-center gap-3 border border-[var(--ember)]/30">
          <AlertTriangle className="h-5 w-5 text-[var(--ember)] shrink-0" />
          <p className={`text-sm ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "حسابك بانتظار التوثيق من فريق سندك، لن يظهر متجرك للعملاء حتى تتم الموافقة." : "Your account is pending verification and won't be visible to customers until approved."}
          </p>
        </div>
      )}
      {tenant.status === "hidden" && (
        <div className="mb-6 glass-card rounded-2xl p-4 flex items-center gap-3 border border-destructive/30">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className={`text-sm ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "متجرك مخفي حالياً عن العملاء (غالباً بسبب انتهاء الاشتراك). جدد اشتراكك من قسم الفوترة." : "Your store is currently hidden from customers (usually due to an expired subscription). Renew from Billing."}
          </p>
        </div>
      )}
      {sub && daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && tenant.status === "active" && (
        <div className="mb-6 glass-card rounded-2xl p-4 flex items-center gap-3 border border-[var(--ember)]/30">
          <AlertTriangle className="h-5 w-5 text-[var(--ember)] shrink-0" />
          <p className={`text-sm ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? `باقي ${daysLeft} يوم على انتهاء اشتراكك.` : `${daysLeft} day(s) left on your subscription.`}
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={lang === "ar" ? "عناصر القائمة" : "Catalog items"} value={counts.catalog} icon={<Package className="h-5 w-5" />} />
        <StatCard label={lang === "ar" ? "الطلبات" : "Orders"} value={counts.orders} icon={<ShoppingBag className="h-5 w-5" />} />
        <StatCard label={lang === "ar" ? "الحجوزات" : "Bookings"} value={counts.bookings} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label={lang === "ar" ? "التقييمات" : "Reviews"} value={counts.reviews} icon={<Star className="h-5 w-5" />} />
      </div>
    </div>
  );
}
