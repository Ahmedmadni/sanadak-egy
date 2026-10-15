import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { readableOrderMoney, receiptVariantLabels, CUSTOMER_ORDER_STATUS_LABELS } from "@/lib/customer-order-receipt";

type OrderItem = Pick<
  Tables<"order_items">,
  "id" | "order_id" | "name" | "qty" | "unit_price" | "total" | "variants"
>;
type OrderHistory = Pick<
  Tables<"order_status_history">,
  "id" | "order_id" | "previous_status" | "status" | "created_at"
>;
type ReceiptOrder = Pick<
  Tables<"orders">,
  "id" | "subtotal" | "delivery_fee" | "total" | "currency" | "customer_address" | "notes" | "delivery_type"
>;

export function CustomerOrderDetails({ order, lang }: { order: ReceiptOrder; lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const names = CUSTOMER_ORDER_STATUS_LABELS[lang];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setItems([]);
    setHistory([]);
    void (async () => {
      try {
        // The authenticated customer's own order determines read authorization
        // through the existing RLS policies. Never use a service-role key here.
        const [itemsResult, historyResult] = await Promise.all([
          supabase.from("order_items")
            .select("id,order_id,name,qty,unit_price,total,variants")
            .eq("order_id", order.id)
            .order("created_at", { ascending: true })
            .limit(101),
          supabase.from("order_status_history")
            .select("id,order_id,previous_status,status,created_at")
            .eq("order_id", order.id)
            .order("created_at", { ascending: true })
            .limit(201),
        ]);
        if (!active) return;
        if (itemsResult.error) throw itemsResult.error;
        if (historyResult.error) throw historyResult.error;
        setItems((itemsResult.data ?? []).slice(0, 100));
        setHistory((historyResult.data ?? []).slice(0, 200));
        setTruncated((itemsResult.data ?? []).length > 100 || (historyResult.data ?? []).length > 200);
      } catch (cause) {
        if (active) setError((cause as Error).message || (ar ? "تعذر تحميل التفاصيل" : "Unable to load details"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [order.id, retry, ar]);

  if (loading) return <p role="status" className="flex items-center gap-2 py-4 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />{ar ? "جارٍ تحميل الإيصال…" : "Loading receipt…"}</p>;

  if (error) return (
    <div role="alert" className="my-3 rounded-xl border border-destructive/30 p-3 text-xs text-destructive">
      <p>{error}</p>
      <button type="button" className="mt-2 inline-flex items-center gap-1 underline" onClick={() => setRetry((value) => value + 1)}>
        <RefreshCw className="h-3.5 w-3.5" />{ar ? "إعادة المحاولة" : "Retry"}
      </button>
    </div>
  );

  return (
    <div className="space-y-5 py-4">
      <section aria-label={ar ? "أصناف الطلب" : "Order items"}>
        <h3 className="mb-2 text-xs font-bold text-foreground">{ar ? "تفاصيل الأصناف" : "Itemized receipt"}</h3>
        {!items.length ? (
          <p className="text-xs text-muted-foreground">{ar ? "لا توجد أصناف ظاهرة لهذا الطلب." : "No item snapshots are available."}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex min-w-0 items-start justify-between gap-3 rounded-xl bg-foreground/[0.035] px-3 py-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-foreground">{item.qty} × {item.name}</span>
                  {receiptVariantLabels(item.variants).length > 0 && (
                    <span className="mt-1 block break-words text-[11px] text-muted-foreground">
                      {receiptVariantLabels(item.variants).join(" · ")}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {readableOrderMoney(item.unit_price, order.currency, lang)} {ar ? "للوحدة" : "per unit"}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{readableOrderMoney(item.total, order.currency, lang)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 space-y-2 border-t border-border/70 pt-3 text-xs">
          <div className="flex justify-between gap-2 text-muted-foreground"><span>{ar ? "مجموع الأصناف" : "Subtotal"}</span><span>{readableOrderMoney(order.subtotal, order.currency, lang)}</span></div>
          <div className="flex justify-between gap-2 text-muted-foreground"><span>{ar ? "رسوم التوصيل" : "Delivery fee"}</span><span>{readableOrderMoney(order.delivery_fee, order.currency, lang)}</span></div>
          <div className="flex justify-between gap-2 font-bold text-foreground"><span>{ar ? "الإجمالي المعتمد" : "Order total"}</span><span>{readableOrderMoney(order.total, order.currency, lang)}</span></div>
        </div>
      </section>
      {order.delivery_type === "delivery" && order.customer_address && (
        <p className="break-words text-xs text-muted-foreground"><strong className="text-foreground">{ar ? "عنوان التوصيل:" : "Delivery address:"}</strong> {order.customer_address}</p>
      )}
      {order.notes && <p className="break-words text-xs text-muted-foreground"><strong className="text-foreground">{ar ? "ملاحظات:" : "Notes:"}</strong> {order.notes}</p>}
      <section aria-label={ar ? "سجل حالات الطلب" : "Order status history"}>
        <h3 className="mb-2 text-xs font-bold text-foreground">{ar ? "سجل الحالة" : "Status history"}</h3>
        {!history.length ? <p className="text-xs text-muted-foreground">{ar ? "لا توجد تحديثات للحالة بعد." : "No status changes yet."}</p> : (
          <ol className="space-y-3 border-s-2 border-[var(--emerald)]/25 ps-3">
            {history.map((event) => (
              <li key={event.id} className="text-xs">
                <span className="font-medium text-foreground">
                  {names[event.previous_status] ?? event.previous_status ?? "—"} {" → "} {names[event.status] ?? event.status}
                </span>
                <time dateTime={event.created_at} className="mt-0.5 block text-[11px] text-muted-foreground">
                  {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
                    dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo",
                  }).format(new Date(event.created_at))}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
      {truncated && <p role="status" className="text-xs text-[var(--ember)]">{ar ? "بعض تفاصيل الطلب الطويل لم تُعرض بالكامل." : "Some older details were omitted due to safety limits."}</p>}
    </div>
  );
}
