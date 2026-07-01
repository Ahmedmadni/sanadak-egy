import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader, EmptyState, StatusPill } from "../ui";
import type { OrderRow, TenantWithRole } from "../types";

const STATUSES = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"];
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

  const load = async () => {
    const { data } = await supabase.from("orders" as any).select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [tenant.id]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { sfx.tap(); load(); }
  };

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "الطلبات" : "Orders"} subtitle={lang === "ar" ? "متابعة طلبات العملاء وتحديث حالتها" : "Track customer orders and update status"} />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد طلبات بعد." : "No orders yet."} />}
      <div className="grid gap-3">
        {rows.map((o) => (
          <motion.div key={o.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0"><ShoppingBag className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">#{o.serial_no}</span>
                <span className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{o.customer_name || (lang === "ar" ? "عميل" : "Customer")}</span>
                <StatusPill status={o.status} map={STATUS_MAP} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {o.delivery_type} · {o.total} {o.currency} · {o.payment_status}
                {o.customer_phone ? ` · ${o.customer_phone}` : ""}
              </div>
            </div>
            <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="h-9 rounded-full border border-input bg-background px-3 text-xs">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
