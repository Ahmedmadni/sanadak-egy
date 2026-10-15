import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Clock3, PackageCheck, RefreshCw, ShoppingBag, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/use-auth";
import { useSanadak } from "@/lib/sanadak-context";
import { canShowMoreOrders, CUSTOMER_ORDER_STATUS_LABELS, readableOrderMoney } from "@/lib/customer-order-receipt";
import { CustomerOrderDetails } from "@/components/sanadak/CustomerOrderDetails";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "طلباتي | سندك" }] }),
  component: CustomerOrdersPage,
});

type OrderCard = Pick<
  Tables<"orders">,
  "id" | "tenant_id" | "serial_no" | "status" | "subtotal" | "delivery_fee" | "total" | "currency" | "delivery_type" | "payment_status" | "created_at" | "customer_address" | "notes"
> & { tenantName: string; tenantSlug: string };
const PAGE_SIZE = 30;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const requestId = useRef(0);

  const copy = useMemo(() => lang === "ar" ? {
    label: "الطلبات", title: "طلباتي", subtitle: "تابع حالة طلباتك ومعلومات استلامها أو توصيلها.",
    empty: "لا توجد طلبات مرتبطة بهذا الحساب حتى الآن.", explore: "استكشف الأنشطة",
    total: "الإجمالي", details: "تفاصيل الطلب وسجل الحالة", review: "قيّم تجربتك", statuses: CUSTOMER_ORDER_STATUS_LABELS.ar,
    delivery: { pickup: "استلام من النشاط", delivery: "توصيل للعنوان", dine_in: "داخل النشاط" } as Record<string, string>,
  } : {
    label: "Orders", title: "My orders", subtitle: "Track your order status and fulfilment details.",
    empty: "No orders are linked to this account yet.", explore: "Explore businesses",
    total: "Total", details: "Receipt and status history", review: "Rate your experience", statuses: CUSTOMER_ORDER_STATUS_LABELS.en,
    delivery: { pickup: "Pickup", delivery: "Home delivery", dine_in: "Dine in" } as Record<string, string>,
  }, [lang]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth", search: { redirect: "/orders" } });
  }, [loading, navigate, user]);

  const loadOrders = useCallback(async (offset = 0, append = false) => {
    if (!user?.id) return;
    const request = ++requestId.current;
    if (append) setLoadingMore(true);
    else {
      setLoadingRows(true);
      setRows([]);
      setHasMore(false);
      setExpanded({});
    }
    setError("");
    try {
      const { data: orders, error: orderError } = await supabase
        .from("orders")
        .select("id,tenant_id,serial_no,status,subtotal,delivery_fee,total,currency,delivery_type,payment_status,created_at,customer_address,notes")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (request !== requestId.current) return;
      if (orderError) throw orderError;
      const tenantsIds = [...new Set((orders ?? []).map((order) => order.tenant_id))];
      const { data: tenants, error: tenantError } = tenantsIds.length
        ? await supabase.from("tenants").select("id,name,slug").in("id", tenantsIds)
        : { data: [] as Pick<Tables<"tenants">, "id" | "name" | "slug">[], error: null };
      if (request !== requestId.current) return;
      // Orders stay readable even if the business was subsequently hidden.
      const tenantById = new Map((tenantError ? [] : tenants ?? []).map((tenant) => [tenant.id, tenant]));
      const next = (orders ?? []).map((order) => {
        const tenant = tenantById.get(order.tenant_id);
        return {
          ...order,
          tenantName: tenant?.name ?? (lang === "ar" ? "نشاط غير متاح" : "Unavailable business"),
          tenantSlug: tenant?.slug ?? "",
        };
      });
      setRows((previous) => append
        ? [...previous, ...next.filter((order) => !previous.some((row) => row.id === order.id))]
        : next);
      setHasMore(canShowMoreOrders((orders ?? []).length, PAGE_SIZE));
    } catch (cause) {
      if (request === requestId.current) {
        setError((cause as Error).message || (lang === "ar" ? "تعذر تحميل الطلبات" : "Unable to load orders"));
      }
    } finally {
      if (request === requestId.current) {
        setLoadingRows(false);
        setLoadingMore(false);
      }
    }
  }, [lang, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      requestId.current += 1;
      setRows([]);
      return;
    }
    void loadOrders();
    return () => { requestId.current += 1; };
  }, [loadOrders, user?.id]);

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

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={loadingRows || loadingMore}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingRows ? "animate-spin" : ""}`} />
            {lang === "ar" ? "تحديث الطلبات" : "Refresh orders"}
          </button>
        </div>
        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
            <span>{error}</span>
            <button type="button" onClick={() => void loadOrders()} className="ms-3 underline">{lang === "ar" ? "إعادة المحاولة" : "Retry"}</button>
          </div>
        )}
        {loadingRows ? <div role="status" className="grid min-h-48 place-items-center text-sm text-muted-foreground">{lang === "ar" ? "جارٍ تحميل الطلبات…" : "Loading orders…"}</div> : error && rows.length === 0 ? null : rows.length === 0 ? (
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
              <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--emerald)]" />{new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(order.created_at))}</span>
              <span className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-[var(--emerald)]" />{copy.total}: <strong className="text-foreground">{readableOrderMoney(order.total, order.currency, lang)}</strong></span>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>#{order.serial_no}</span>
              <div className="flex items-center gap-3">
                <span>{order.payment_status}</span>
                {order.status === "delivered" && (
                  <Link
                    to="/reviews"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--emerald)]/30 px-3 font-semibold text-[var(--emerald)] transition hover:bg-[var(--emerald)]/10 ${lang === "ar" ? "font-arabic" : ""}`}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {copy.review}
                  </Link>
                )}
              </div>
            </div>
            <details
              className="group mt-4 border-t border-border/60 pt-3"
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setExpanded((previous) => ({ ...previous, [order.id]: isOpen }));
              }}
            >
              <summary className={`flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>
                {copy.details}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              {expanded[order.id] && <CustomerOrderDetails order={order} lang={lang} />}
            </details>
          </motion.article>
        ))}</div>}
        {!loadingRows && hasMore && !error && (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadOrders(rows.length, true)}
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
          >
            {loadingMore
              ? (lang === "ar" ? "جارٍ تحميل المزيد…" : "Loading more…")
              : (lang === "ar" ? "عرض المزيد من الطلبات" : "Show more orders")}
          </button>
        )}
      </div>
    </main>
  );
}
