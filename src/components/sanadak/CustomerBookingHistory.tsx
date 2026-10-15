import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { bookingTimeCairo, CUSTOMER_BOOKING_STATUSES } from "@/lib/customer-booking-tracking";

type HistoryRow = Pick<
  Tables<"booking_status_history">,
  "id" | "booking_id" | "previous_status" | "status" | "created_at"
>;

/** Authenticated order history is fetched only when the user expands a booking. */
export function CustomerBookingHistory({
  bookingId,
  lang,
}: {
  bookingId: string;
  lang: "ar" | "en";
}) {
  const ar = lang === "ar";
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [retry, setRetry] = useState(0);
  const labels = CUSTOMER_BOOKING_STATUSES[lang];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRows([]);
    void (async () => {
      try {
        const { data, error: historyError } = await supabase
          .from("booking_status_history")
          .select("id,booking_id,previous_status,status,created_at")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: true })
          .limit(201);
        if (!active) return;
        if (historyError) throw historyError;
        setTruncated((data ?? []).length > 200);
        setRows((data ?? []).slice(0, 200));
      } catch (cause) {
        if (active) setError((cause as Error).message || (ar ? "تعذر تحميل السجل" : "Cannot load history"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookingId, retry, ar]);

  if (loading) return (
    <p role="status" className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {ar ? "جارٍ تحميل سجل الحالة…" : "Loading status history…"}
    </p>
  );

  if (error) return (
    <div role="alert" className="mt-3 rounded-xl border border-destructive/30 p-3 text-xs text-destructive">
      <p>{error}</p>
      <button type="button" onClick={() => setRetry((v) => v + 1)} className="mt-2 inline-flex items-center gap-1 underline">
        <RefreshCw className="h-3.5 w-3.5" />{ar ? "إعادة المحاولة" : "Retry"}
      </button>
    </div>
  );

  return (
    <div className="mt-3 border-s border-[var(--emerald)]/30 ps-4">
      {!rows.length
        ? <p className="text-xs text-muted-foreground">{ar ? "لا توجد تغييرات حالة مسجلة بعد." : "No recorded status changes yet."}</p>
        : <ol className="space-y-3">
          {rows.map((entry) => (
            <li key={entry.id} className="relative text-xs text-muted-foreground before:absolute before:-start-[1.31rem] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-[var(--emerald)]">
              <span className="font-medium text-foreground">
                {labels[entry.previous_status] ?? entry.previous_status ?? "—"} {" → "}
                {labels[entry.status] ?? entry.status}
              </span>
              <time className="mt-1 block" dateTime={entry.created_at}>{bookingTimeCairo(entry.created_at, lang)}</time>
            </li>
          ))}
        </ol>}
      {truncated && <p role="status" className="mt-3 text-xs text-[var(--ember)]">
        {ar ? "يتم عرض أول 200 تغيير فقط لهذا الحجز." : "Only the first 200 changes for this booking are shown."}
      </p>}
    </div>
  );
}
