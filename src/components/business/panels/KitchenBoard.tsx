import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Clock3, LoaderCircle, RefreshCw, Truck, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import {
  canAdvanceKitchenOrder,
  groupKitchenOrders,
  kitchenNextStatus,
  kitchenOrderAgeMinutes,
  kitchenOrderIsDelayed,
  KITCHEN_STAGES,
} from "@/lib/kitchen-board";
import type { KitchenStage } from "@/lib/kitchen-board";
import type { OrderRow, TenantWithRole } from "../types";
import { EmptyState, PanelHeader } from "../ui";

type KitchenItem = Pick<Tables<"order_items">, "id" | "order_id" | "name" | "qty" | "variants">;
type ItemGroups = Record<string, KitchenItem[]>;

const STAGE_LABELS: Record<KitchenStage, { ar: string; en: string }> = {
  pending: { ar: "بانتظار التأكيد", en: "New orders" },
  confirmed: { ar: "تم التأكيد", en: "Confirmed" },
  preparing: { ar: "قيد التحضير", en: "Preparing" },
  ready: { ar: "جاهز للتسليم", en: "Ready" },
  out_for_delivery: { ar: "خرج للتوصيل", en: "On delivery" },
};

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  confirmed: { ar: "تأكيد الطلب", en: "Confirm order" },
  preparing: { ar: "بدء التحضير", en: "Start preparing" },
  ready: { ar: "الطلب جاهز", en: "Mark ready" },
  out_for_delivery: { ar: "خارج للتوصيل", en: "Send to delivery" },
  delivered: { ar: "تم التسليم", en: "Mark delivered" },
};

const STATUS_STYLE: Record<KitchenStage, string> = {
  pending: "border-[var(--ember)]/30 bg-[var(--ember)]/5",
  confirmed: "border-blue-500/25 bg-blue-500/5",
  preparing: "border-[var(--emerald)]/25 bg-[var(--emerald)]/5",
  ready: "border-[var(--emerald)]/40 bg-[var(--emerald)]/10",
  out_for_delivery: "border-blue-500/30 bg-blue-500/5",
};

function variantSummary(value: KitchenItem["variants"]): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const selected = (value as Record<string, unknown>).selection;
  return typeof selected === "string" && selected.trim() ? selected.trim() : null;
}

function timeLabel(value: string, lang: "ar" | "en") {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function money(value: number, currency: string, lang: "ar" | "en") {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

/** Staff-only board: all reads are tenant-scoped; status writes use the existing authorized RPC. */
export function KitchenBoard({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const ar = lang === "ar";
  const requestId = useRef(0);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemGroups>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [itemsError, setItemsError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  const load = useCallback(async (silent = false) => {
    const request = ++requestId.current;
    if (!silent) setInitialLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const { data, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("tenant_id", tenant.id)
        .in("status", [...KITCHEN_STAGES])
        .order("created_at", { ascending: true })
        .limit(150);
      if (request !== requestId.current) return;
      if (orderError) throw orderError;

      const orders = data ?? [];
      const ids = orders.map((order) => order.id);
      let fetchedItems: KitchenItem[] = [];
      let fetchItemsError = "";
      if (ids.length) {
        const result = await supabase
          .from("order_items")
          .select("id,order_id,name,qty,variants")
          .in("order_id", ids)
          .order("created_at", { ascending: true });
        if (request !== requestId.current) return;
        if (result.error) fetchItemsError = result.error.message;
        else {
          fetchedItems = result.data ?? [];
          // Supabase may cap a response at 1000 rows. Do not show an
          // incomplete kitchen ticket or allow advancing it silently.
          if (fetchedItems.length >= 1000) {
            fetchItemsError = ar
              ? "تجاوزت تفاصيل الأصناف حد التحميل الآمن؛ افتح قائمة الطلبات للتحقق قبل تغيير الحالة."
              : "Item details reached the safe query limit. Verify orders before changing status.";
          }
        }
      }

      const grouped = fetchedItems.reduce<ItemGroups>((acc, item) => {
        (acc[item.order_id] ??= []).push(item);
        return acc;
      }, {});
      if (request !== requestId.current) return;
      setRows(orders);
      setItems(grouped);
      setItemsError(fetchItemsError);
      setTruncated(orders.length === 150);
      setClock(new Date());
    } catch (cause) {
      if (request !== requestId.current) return;
      setError((cause as Error).message || (ar ? "تعذر تحميل الطلبات" : "Could not load orders"));
    } finally {
      if (request === requestId.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [ar, tenant.id]);

  useEffect(() => {
    void load();
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const interval = window.setInterval(refreshIfVisible, 30_000);
    // Pick up changes immediately when staff returns to the kitchen tab.
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      requestId.current += 1;
    };
  }, [load]);

  const advance = async (order: OrderRow) => {
    const next = kitchenNextStatus(order);
    if (!next || !canAdvanceKitchenOrder(order, next) || savingId) return;
    setSavingId(order.id);
    try {
      const { error: statusError } = await supabase.rpc("set_order_status", {
        _order: order.id,
        _status: next,
      });
      if (statusError) throw statusError;
      sfx.tap();
      toast.success(ar ? "تم تحديث الطلب" : "Order updated");
      await load(true);
    } catch (cause) {
      toast.error((cause as Error).message || (ar ? "تعذر تحديث الطلب" : "Could not update order"));
      await load(true);
    } finally {
      setSavingId(null);
    }
  };

  const grouped = useMemo(() => groupKitchenOrders(rows), [rows]);
  const activeCount = rows.length;

  return (
    <div className="min-w-0">
      <PanelHeader
        title={ar ? "لوحة تحضير الطلبات" : "Kitchen order board"}
        subtitle={ar ? "الطلبات النشطة تتحدث كل 30 ثانية عند فتح الصفحة" : "Active orders refresh every 30 seconds while this tab is visible"}
        action={
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing || initialLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {ar ? "تحديث" : "Refresh"}
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2">
          <ChefHat className="h-4 w-4 text-[var(--emerald)]" />
          {ar ? `${activeCount} طلب نشط` : `${activeCount} active orders`}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2 text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          {ar ? "الأوقات حسب توقيت القاهرة" : "Times in Cairo"}
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 p-4 text-xs text-destructive">
          <span>{error}</span>
          <button type="button" className="underline" onClick={() => void load(true)}>
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}
      {itemsError && (
        <p role="alert" className="mb-4 rounded-2xl border border-[var(--ember)]/30 p-3 text-xs">
          {ar ? "تعذر تحميل تفاصيل المنتجات؛ لا تُحدّث الطلب قبل التحقق منها: " : "Item details unavailable; verify them before advancing orders: "}
          {itemsError}
        </p>
      )}
      {truncated && (
        <p role="status" className="mb-4 rounded-2xl border border-[var(--ember)]/30 p-3 text-xs">
          {ar ? "هناك 150 طلبًا نشطًا أو أكثر؛ قد لا تظهر بعض الطلبات حتى تُستكمل الأقدم." : "150 or more active orders exist. Newer orders may be omitted until older orders are completed."}
        </p>
      )}

      {initialLoading && (
        <div role="status" className="grid place-items-center py-12">
          <LoaderCircle className="h-6 w-6 animate-spin text-[var(--emerald)]" />
        </div>
      )}
      {!initialLoading && !error && rows.length === 0 && (
        <EmptyState text={ar ? "لا توجد طلبات نشطة الآن." : "No active orders right now."} />
      )}

      {!initialLoading && rows.length > 0 && (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {KITCHEN_STAGES.map((stage) => (
            <section key={stage} aria-label={ar ? STAGE_LABELS[stage].ar : STAGE_LABELS[stage].en} className="min-w-0">
              <div className={`mb-3 flex items-center justify-between gap-2 rounded-xl border p-3 ${STATUS_STYLE[stage]}`}>
                <h3 className="text-sm font-semibold">{ar ? STAGE_LABELS[stage].ar : STAGE_LABELS[stage].en}</h3>
                <span className="rounded-full bg-background/80 px-2.5 py-1 text-xs font-semibold tabular-nums">{grouped[stage].length}</span>
              </div>
              <div className="grid gap-3">
                {grouped[stage].map((order) => {
                  const next = kitchenNextStatus(order);
                  const elapsed = kitchenOrderAgeMinutes(order.created_at, clock);
                  const delayed = kitchenOrderIsDelayed(order, clock);
                  return (
                    <article key={order.id} className="glass-card min-w-0 rounded-2xl border border-border/70 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-base font-bold tabular-nums">#{order.serial_no}</span>
                          <div className="mt-1 truncate text-sm font-medium">{order.customer_name || (ar ? "عميل" : "Customer")}</div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] tabular-nums ${delayed ? "bg-[var(--ember)]/15 text-[var(--ember)]" : "bg-foreground/5 text-muted-foreground"}`}>
                          {ar ? `${elapsed} دقيقة` : `${elapsed} min`}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <time dateTime={order.created_at}>{timeLabel(order.created_at, lang)}</time>
                        {order.delivery_type === "delivery" ? <Truck className="h-3.5 w-3.5" /> : <UtensilsCrossed className="h-3.5 w-3.5" />}
                        <span>{order.delivery_type === "delivery" ? (ar ? "توصيل" : "Delivery") : order.delivery_type === "dine_in" ? (ar ? "داخل المكان" : "Dine-in") : (ar ? "استلام" : "Pickup")}</span>
                      </div>
                      <div className="mt-3 border-t border-border/60 pt-3">
                        <div className="mb-2 text-xs font-semibold">{ar ? "الأصناف" : "Items"}</div>
                        {items[order.id]?.length ? (
                          <ul className="space-y-2">
                            {items[order.id].map((item) => (
                              <li key={item.id} className="flex items-start gap-2 text-xs">
                                <span className="shrink-0 rounded-md bg-[var(--emerald)]/10 px-1.5 py-0.5 font-semibold tabular-nums text-[var(--emerald)]">{item.qty}×</span>
                                <span className="min-w-0 break-words">
                                  {item.name}
                                  {variantSummary(item.variants) && <span className="mt-0.5 block text-muted-foreground">{variantSummary(item.variants)}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="text-xs text-muted-foreground">{ar ? "تفاصيل الأصناف غير متاحة." : "Item details unavailable."}</p>}
                      </div>
                      {order.notes && (
                        <div className="mt-3 rounded-xl bg-[var(--ember)]/10 p-3 text-xs leading-5">
                          <strong>{ar ? "ملاحظة: " : "Note: "}</strong>
                          <span className="break-words">{order.notes}</span>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <span className="text-xs font-semibold tabular-nums">{money(order.total, order.currency, lang)}</span>
                      </div>
                      {next && (
                        <button
                          type="button"
                          disabled={savingId !== null || initialLoading || !!itemsError || !(items[order.id]?.length)}
                          onClick={() => void advance(order)}
                          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {savingId === order.id && <LoaderCircle className="h-4 w-4 animate-spin" />}
                          {ar ? ACTION_LABELS[next].ar : ACTION_LABELS[next].en}
                        </button>
                      )}
                    </article>
                  );
                })}
                {!grouped[stage].length && (
                  <div className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                    {ar ? "لا توجد طلبات" : "No orders"}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
