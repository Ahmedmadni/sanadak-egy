import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, LoaderCircle, PackageCheck, PackageX, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { readableOrderMoney } from "@/lib/customer-order-receipt";
import { CustomerOrderDetails } from "@/components/sanadak/CustomerOrderDetails";
import {
  canChangeMerchantOrderStatus,
  merchantOrderFilterStatuses,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
  type MerchantOrderFilter,
} from "@/lib/merchant-order-filter";
import { PanelHeader, EmptyState } from "../ui";
import type { OrderRow, TenantWithRole } from "../types";
import { KITCHEN_TRANSITIONS } from "@/lib/kitchen-board";

const PAGE_SIZE = 30;
const STATUS_MAP: Record<string, string> = {
  pending: "bg-[var(--ember)]/15 text-[var(--ember)]",
  confirmed: "bg-blue-500/15 text-blue-500",
  preparing: "bg-blue-500/15 text-blue-500",
  ready: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  out_for_delivery: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  delivered: "bg-[var(--emerald)]/25 text-[var(--emerald)]",
  cancelled: "bg-destructive/15 text-destructive",
};

export function OrdersPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const ar = lang === "ar";
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<MerchantOrderFilter>("active");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (offset = 0, append = false) => {
    const request = ++requestId.current;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setRows([]);
      setHasMore(false);
      setExpanded({});
    }
    setError("");
    try {
      let query = supabase.from("orders")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      const statuses = merchantOrderFilterStatuses(filter);
      if (statuses) query = query.in("status", statuses);
      const { data, error: loadError } = await query.range(offset, offset + PAGE_SIZE - 1);
      if (request !== requestId.current) return;
      if (loadError) throw loadError;
      const incoming = (data ?? []) as OrderRow[];
      setRows((previous) => append
        ? [...previous, ...incoming.filter((order) => !previous.some((row) => row.id === order.id))]
        : incoming);
      setHasMore(incoming.length === PAGE_SIZE);
    } catch (cause) {
      if (request === requestId.current) {
        setError((cause as Error).message || (ar ? "تعذر تحميل الطلبات" : "Could not load orders"));
      }
    } finally {
      if (request === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [tenant.id, filter, ar]);

  useEffect(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]);

  const setStatus = async (order: OrderRow, next: string) => {
    if (updatingId || !canChangeMerchantOrderStatus(order.status, next)) return;
    if (next === "cancelled" && !window.confirm(
      ar
        ? "إلغاء الطلب نهائي، وسيُعاد المخزون المحجوز وفق قواعد النظام. هل تريد المتابعة؟"
        : "Cancellation is final; reserved inventory will be released according to system rules. Continue?",
    )) return;

    setUpdatingId(order.id);
    try {
      const { error: statusError } = await supabase.rpc("set_order_status", {
        _order: order.id,
        _status: next,
      });
      if (statusError) throw statusError;
      sfx.tap();
      toast.success(ar ? "تم تحديث حالة الطلب" : "Order status updated");
      await load();
    } catch (cause) {
      toast.error((cause as Error).message || (ar ? "تعذر تحديث الطلب" : "Failed to update order"));
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  const labels = ORDER_STATUS_LABELS[lang];
  const paymentLabels = PAYMENT_LABELS[lang];
  const filters: { value: MerchantOrderFilter; ar: string; en: string }[] = [
    { value: "active", ar: "النشطة", en: "Active" },
    { value: "delivered", ar: "المسلّمة", en: "Delivered" },
    { value: "cancelled", ar: "الملغاة", en: "Cancelled" },
    { value: "all", ar: "جميع الطلبات", en: "All orders" },
  ];

  return (
    <div className="min-w-0">
      <PanelHeader
        title={ar ? "إدارة الطلبات" : "Order management"}
        subtitle={ar ? "حالة الطلبات والمنتجات والإيصالات حسب نشاطك التجاري" : "Order statuses, products and receipts for your business"}
        action={
          <button type="button" onClick={() => void load()} disabled={loading || loadingMore}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {ar ? "تحديث" : "Refresh"}
          </button>
        }
      />
      <div role="group" aria-label={ar ? "تصفية الطلبات" : "Filter orders"} className="mb-4 flex flex-wrap gap-2">
        {filters.map((option) => (
          <button type="button" key={option.value}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`min-h-10 rounded-full border px-4 text-xs font-medium transition ${filter === option.value ? "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]" : "border-border hover:bg-foreground/5"}`}>
            {ar ? option.ar : option.en}
          </button>
        ))}
      </div>
      {!loading && !error && (
        <p className="mb-4 text-xs text-muted-foreground">
          {ar ? `الطلبات المعروضة: ${rows.length}` : `Orders shown: ${rows.length}`}
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-destructive/30 p-4 text-xs text-destructive">
          {error}
          <button type="button" className="ms-3 underline" onClick={() => void load()}>
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}
      {loading && (
        <div role="status" className="grid min-h-40 place-items-center text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <EmptyState text={ar ? "لا توجد طلبات مطابقة لهذا التصنيف." : "No orders match this filter."} />
      )}
      {!loading && rows.length > 0 && (
        <div className="grid gap-3">
          {rows.map((order) => {
            const nextStatuses = KITCHEN_TRANSITIONS[order.status] ?? [];
            return (
              <motion.article key={order.id} layout className="glass-card flex min-w-0 flex-wrap items-center gap-4 rounded-2xl p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{order.serial_no}</span>
                    <span className={`break-words font-semibold ${ar ? "font-arabic" : ""}`}>{order.customer_name || (ar ? "عميل" : "Customer")}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_MAP[order.status] ?? "bg-muted text-muted-foreground"}`}>
                      {labels[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <time dateTime={order.created_at}>
                      {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
                        dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo",
                      }).format(new Date(order.created_at))}
                    </time>
                    <span>{readableOrderMoney(order.total, order.currency, lang)}</span>
                    <span>{paymentLabels[order.payment_status] ?? order.payment_status}</span>
                    {order.customer_phone && <span dir="ltr">{order.customer_phone}</span>}
                  </div>
                  {order.inventory_reserved_at && (
                    <div className={`mt-2 flex items-center gap-1.5 text-[11px] ${order.inventory_released_at ? "text-muted-foreground" : "text-[var(--emerald)]"}`}>
                      {order.inventory_released_at ? <PackageX className="h-3.5 w-3.5" /> : <PackageCheck className="h-3.5 w-3.5" />}
                      {order.inventory_released_at
                        ? (ar ? "تم إرجاع المخزون" : "Inventory released")
                        : (ar ? "المخزون محجوز" : "Inventory reserved")}
                    </div>
                  )}
                </div>
                {nextStatuses.length > 0 && (
                  <select value="" disabled={updatingId !== null}
                    aria-label={ar ? "تغيير حالة الطلب" : "Change order status"}
                    onChange={(event) => void setStatus(order, event.target.value)}
                    className="h-10 max-w-full rounded-full border border-input bg-background px-3 text-xs disabled:opacity-50">
                    <option value="">{updatingId === order.id ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "تغيير الحالة" : "Change status")}</option>
                    {nextStatuses.map((status) => (
                      <option key={status} value={status}>{labels[status] ?? status}</option>
                    ))}
                  </select>
                )}
                <details
                  className="group basis-full border-t border-border/60 pt-3"
                  onToggle={(event) => {
                    const open = event.currentTarget.open;
                    setExpanded((previous) => ({ ...previous, [order.id]: open }));
                  }}
                >
                  <summary className={`flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[var(--emerald)] ${ar ? "font-arabic" : ""}`}>
                    {ar ? "الأصناف والإيصال وسجل الحالة" : "Items, receipt and status history"}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  {expanded[order.id] && <CustomerOrderDetails order={order} lang={lang} />}
                </details>
              </motion.article>
            );
          })}
        </div>
      )}
      {!loading && !error && hasMore && (
        <button type="button" disabled={loadingMore}
          onClick={() => void load(rows.length, true)}
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm font-medium hover:bg-foreground/5 disabled:opacity-50">
          {loadingMore ? (ar ? "جارٍ تحميل المزيد…" : "Loading more…") : (ar ? "عرض المزيد" : "Show more")}
        </button>
      )}
    </div>
  );
}
