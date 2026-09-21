import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { LoaderCircle, PackageCheck, PackageX, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader, EmptyState, StatusPill } from "../ui";
import type { OrderRow, TenantWithRole } from "../types";

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};
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
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  }, [tenant.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    if (status === "cancelled") {
      const confirmed = window.confirm(
        lang === "ar"
          ? "إلغاء الطلب نهائي ولا يمكن التراجع عنه. سيتم إرجاع المخزون المحجوز. هل تريد المتابعة؟"
          : "Cancellation is final and releases reserved inventory. Continue?",
      );
      if (!confirmed) return;
    }

    setUpdatingId(id);
    const { error } = await supabase.rpc("set_order_status", {
      _order: id,
      _status: status,
    });
    if (error) {
      toast.error(error.message);
    } else {
      sfx.tap();
      await load();
    }
    setUpdatingId(null);
  };

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "الطلبات" : "Orders"}
        subtitle={
          lang === "ar"
            ? "متابعة طلبات العملاء وتحديث حالتها"
            : "Track customer orders and update status"
        }
      />
      {rows.length === 0 && (
        <EmptyState text={lang === "ar" ? "لا توجد طلبات بعد." : "No orders yet."} />
      )}
      <div className="grid gap-3">
        {rows.map((o) => (
          <motion.div
            key={o.id}
            layout
            className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4"
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">#{o.serial_no}</span>
                <span className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>
                  {o.customer_name || (lang === "ar" ? "عميل" : "Customer")}
                </span>
                <StatusPill status={o.status} map={STATUS_MAP} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {o.delivery_type} · {o.total} {o.currency} · {o.payment_status}
                {o.customer_phone ? ` · ${o.customer_phone}` : ""}
              </div>
              {o.inventory_reserved_at && (
                <div
                  className={`mt-2 flex items-center gap-1.5 text-[11px] ${o.inventory_released_at ? "text-muted-foreground" : "text-[var(--emerald)]"}`}
                >
                  {o.inventory_released_at ? (
                    <PackageX className="h-3.5 w-3.5" />
                  ) : (
                    <PackageCheck className="h-3.5 w-3.5" />
                  )}
                  {o.inventory_released_at
                    ? lang === "ar"
                      ? "تم إرجاع المخزون"
                      : "Inventory released"
                    : lang === "ar"
                      ? "المخزون محجوز"
                      : "Inventory reserved"}
                </div>
              )}
            </div>
            {updatingId === o.id ? (
              <div className="grid h-9 w-9 place-items-center">
                <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <select
                value={o.status}
                disabled={(NEXT_STATUSES[o.status] ?? []).length === 0}
                onChange={(e) => setStatus(o.id, e.target.value)}
                className="h-9 rounded-full border border-input bg-background px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value={o.status}>{o.status}</option>
                {(NEXT_STATUSES[o.status] ?? []).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
