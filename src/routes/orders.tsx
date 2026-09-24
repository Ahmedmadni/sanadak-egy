import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Clock3, PackageCheck, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/use-auth";
import { useSanadak } from "@/lib/sanadak-context";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "طلباتي | سندك" }] }),
  component: CustomerOrdersPage,
});

type OrderCard = Pick<
  Tables<"orders">,
  "id" | "tenant_id" | "serial_no" | "status" | "total" | "currency" | "delivery_type" | "payment_status" | "created_at"
> & { tenantName: string; tenantSlug: string };

const statusTone: Record<string, string> = {
  pending: "bg-[var(--ember)]/15 text-[var(--ember)]",
  confirmed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  preparing: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  ready: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  out_for_delivery: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  delivered: "bg-[var(--emerald)]/25 text-[var(--emerald)]",
  cancelled: "bg-destructive/15 text-destructive",
};

function CustomerOrdersPage() {
  const { user, loading } = useAuth();
  const { lang } = useSanadak();
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderCard[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  const copy = useMemo(() => lang === "ar" ? {
    label: "الطلبات", title: "طلباتي", subtitle: "تابع حالة طلباتك ومعلومات استلامها أو توصيلها.",
    empty: "لا توجد طلبات مرتبطة بهذا الحساب حتى الآن.", explore: "استكشف الأنشطة",
    total: "الإجمالي", statuses: { pending: "قيد المراجعة", confirmed: "مؤكد", preparing: "جارٍ التجهيز", ready: "جاهز", out_for_delivery: "خرج للتوصيل", delivered: "تم التسليم", cancelled: "ملغي" } as Record<string, string>,
    delivery: { pickup: "استلام من النشاط", delivery: "توصيل للعنوان", dine_in: "داخل النشاط" } as Record<string, string>,
  } : {
    label: "Orders", title: "My orders", subtitle: "Track your order status and fulfilment details.",
    empty: "No orders are linked to this account yet.", explore: "Explore businesses",
    total: "Total", statuses: { pending: "Pending review", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready", out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled" } as Record<string, string>,
    delivery: { pickup: "Pickup", delivery: "Home delivery", dine_in: "Dine in" } as Record<string, string>,
  }, [lang]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", search: { redirect: "/orders" } });
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingRows(true);
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id,tenant_id,serial_no,status,total,currency,delivery_type,payment_status,created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        setLoadingRows(false);
        return;
      }
      const ids = [...new Set((orders ?? []).map((order) => order.tenant_id))];
      const { data: tenants } = ids.length
        ? await supabase.from("tenants").select("id,name,slug").in("id", ids)
        : { data: [] as Pick<Tables<"tenants">, "id" | "name" | "slug">[] };
      const tenantById = new Map((tenants ?? []).map((tenant) => [tenant.id, tenant]));
      setRows((orders ?? []).map((order) => {
        const tenant = tenantById.get(order.tenant_id);
        return { ...order, tenantName: tenant?.name ?? (lang === "ar" ? "نشاط غير متاح" : "Unavailable business"), tenantSlug: tenant?.slug ?? "" };
      }));
      setLoadingRows(false);
    };
    void load();
  }, [lang, user]);

  if (loading || !user) return <main className="min-h-screen" />;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="relative mx-auto max-w-3xl">
        <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
          <p className={`text-sm font-medium text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>{copy.label}</p>
          <h1 className={`mt-1 text-3xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>{copy.title}</h1>
          <p className={`mt-2 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{copy.subtitle}</p>
        </motion.header>

        {loadingRows ? <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">…</div> : rows.length === 0 ? (
          <section className="rounded-3xl border border-border/70 bg-background/80 px-6 py-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-9 w-9 text-[var(--emerald)]" />
            <p className={`mt-4 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{copy.empty}</p>
            <Link to="/search" search={{ q: "" }} className={`mt-6 inline-flex h-10 items-center rounded-full bg-gradient-brand px-5 text-sm font-medium text-primary-foreground shadow-glow ${lang === "ar" ? "font-arabic" : ""}`}>{copy.explore}</Link>
          </section>
        ) : <div className="grid gap-3">{rows.map((order) => (
          <motion.article key={order.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                {order.tenantSlug ? <Link to="/store/$slug" params={{ slug: order.tenantSlug }} className="text-base font-bold hover:text-[var(--emerald)]">{order.tenantName}</Link> : <p className="text-base font-bold">{order.tenantName}</p>}
                <p className={`mt-1 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{copy.delivery[order.delivery_type] ?? order.delivery_type}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[order.status] ?? "bg-muted text-muted-foreground"} ${lang === "ar" ? "font-arabic" : ""}`}>{copy.statuses[order.status] ?? order.status}</span>
            </div>
            <div className="mt-5 grid gap-2 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:grid-cols-2">
              <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--emerald)]" />{new Date(order.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-[var(--emerald)]" />{copy.total}: <strong className="text-foreground">{order.total} {order.currency}</strong></span>
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span>#{order.serial_no}</span><span>{order.payment_status}</span></div>
          </motion.article>
        ))}</div>}
      </div>
    </main>
  );
}
