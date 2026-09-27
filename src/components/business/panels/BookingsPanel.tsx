import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader, EmptyState, StatusPill } from "../ui";
import type { BookingRow, TenantWithRole } from "../types";
import type { Tables } from "@/integrations/supabase/types";

type BookingHistory = Pick<Tables<"booking_status_history">, "id" | "booking_id" | "previous_status" | "status" | "changed_by_name" | "created_at">;

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
  const [historyByBooking, setHistoryByBooking] = useState<Record<string, BookingHistory[]>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("bookings").select("*").eq("tenant_id", tenant.id).order("slot_start", { ascending: true });
    const bookings = data ?? [];
    const bookingIds = bookings.map((booking) => booking.id);
    const { data: history } = bookingIds.length
      ? await supabase.from("booking_status_history").select("id,booking_id,previous_status,status,changed_by_name,created_at").in("booking_id", bookingIds).order("created_at")
      : { data: [] as BookingHistory[] };
    setHistoryByBooking((history ?? []).reduce<Record<string, BookingHistory[]>>((groups, entry) => {
      (groups[entry.booking_id] ??= []).push(entry);
      return groups;
    }, {}));
    setRows(bookings);
  }, [tenant.id]);
  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc("set_booking_status", {
      _booking: id,
      _status: status,
    });
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
            <details className="group basis-full border-t border-border/60 pt-3">
              <summary className={`flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>
                {lang === "ar" ? "سجل الحالة" : "Status history"}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 grid gap-2 border-s border-[var(--emerald)]/30 ps-4">
                {(historyByBooking[b.id] ?? []).length === 0 ? <p className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "لا توجد تحديثات حالة بعد." : "No status updates yet."}</p> : (historyByBooking[b.id] ?? []).map((entry) => (
                  <div key={entry.id} className="relative text-xs text-muted-foreground before:absolute before:-start-[1.31rem] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-[var(--emerald)]">
                          <span className={`font-medium text-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{entry.previous_status} → {entry.status}</span>
                          {entry.changed_by_name && <span className={`mt-0.5 block ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? `بواسطة ${entry.changed_by_name}` : `By ${entry.changed_by_name}`}</span>}
                          <span className="mt-0.5 block">{new Date(entry.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                ))}
              </div>
            </details>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
