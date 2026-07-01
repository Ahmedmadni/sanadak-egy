import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader, EmptyState, StatusPill } from "../ui";
import type { BookingRow, TenantWithRole } from "../types";

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"];
const STATUS_MAP: Record<string, string> = {
  pending: "bg-[var(--ember)]/15 text-[var(--ember)]",
  confirmed: "bg-blue-500/15 text-blue-500",
  completed: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  cancelled: "bg-destructive/15 text-destructive",
  no_show: "bg-destructive/15 text-destructive",
};

export function BookingsPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<BookingRow[]>([]);

  const load = async () => {
    const { data } = await supabase.from("bookings" as any).select("*").eq("tenant_id", tenant.id).order("slot_start", { ascending: true });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [tenant.id]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { sfx.tap(); load(); }
  };

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "الحجوزات" : "Bookings"} subtitle={lang === "ar" ? "تقويم الحجوزات وحالتها" : "Booking calendar and status"} />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد حجوزات بعد." : "No bookings yet."} />}
      <div className="grid gap-3">
        {rows.map((b) => (
          <motion.div key={b.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0"><CalendarCheck className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">#{b.serial_no}</span>
                <span className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{b.customer_name || (lang === "ar" ? "عميل" : "Customer")}</span>
                <StatusPill status={b.status} map={STATUS_MAP} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(b.slot_start).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                {b.customer_phone ? ` · ${b.customer_phone}` : ""}
              </div>
            </div>
            <select value={b.status} onChange={(e) => setStatus(b.id, e.target.value)} className="h-9 rounded-full border border-input bg-background px-3 text-xs">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
