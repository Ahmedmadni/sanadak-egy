import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import {
  cairoDayKey,
  calendarQueryBounds,
  calendarWeek,
  countBookingStatuses,
  nextBookingStatuses,
  shiftCalendarDay,
} from "@/lib/merchant-booking-calendar";
import { EmptyState, PanelHeader } from "../ui";
import type { BookingRow, TenantWithRole } from "../types";

type BookingHistory = Pick<
  Tables<"booking_status_history">,
  "id" | "booking_id" | "previous_status" | "status" | "changed_by_name" | "created_at"
>;
type StatusFilter = "all" | "pending" | "confirmed" | "completed";

const STATUS_MAP: Record<string, string> = {
  pending: "bg-[var(--ember)]/15 text-[var(--ember)]",
  confirmed: "bg-blue-500/15 text-blue-500",
  completed: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  cancelled: "bg-destructive/15 text-destructive",
  no_show: "bg-destructive/15 text-destructive",
};
const STATUS_LABELS = {
  ar: {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    completed: "مكتمل",
    cancelled: "ملغي",
    no_show: "لم يحضر",
  },
  en: {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
  },
};

function bookingDateLabel(day: string, lang: "ar" | "en", options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}

function bookingTimeLabel(instant: string, lang: "ar" | "en") {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(instant));
}

function panelTitle(category: string, lang: "ar" | "en") {
  if (category === "medical") return lang === "ar" ? "مواعيد العيادة" : "Clinic appointments";
  if (category === "halls") return lang === "ar" ? "حجوزات القاعة" : "Venue reservations";
  if (category === "salon") return lang === "ar" ? "مواعيد الصالون" : "Salon appointments";
  return lang === "ar" ? "تقويم الحجوزات" : "Booking calendar";
}

export function BookingsPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const ar = lang === "ar";
  const [weekStart, setWeekStart] = useState(() => cairoDayKey(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => cairoDayKey(new Date()));
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [historyByBooking, setHistoryByBooking] = useState<Record<string, BookingHistory[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const requestId = useRef(0);

  const weekDays = useMemo(() => calendarWeek(weekStart), [weekStart]);
  const bounds = useMemo(() => calendarQueryBounds(weekStart), [weekStart]);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError("");
    // Do not briefly expose a previous tenant's schedule while switching accounts.
    setRows([]);
    setHistoryByBooking({});
    setTruncated(false);

    try {
      const { data, error: loadError } = await supabase
        .from("bookings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .gte("slot_start", bounds.from)
        .lt("slot_start", bounds.to)
        .order("slot_start", { ascending: true })
        .limit(1000);
      if (request !== requestId.current) return;
      if (loadError) throw loadError;

      // Bounds are intentionally wide to cover Cairo DST. Only expose
      // bookings in the requested seven business-local days.
      const wantedDays = new Set(calendarWeek(weekStart));
      const filtered = (data ?? []).filter((booking) =>
        wantedDays.has(cairoDayKey(booking.slot_start)),
      );
      setRows(filtered);
      setTruncated((data ?? []).length === 1000);
    } catch (cause) {
      if (request !== requestId.current) return;
      setRows([]);
      setError((cause as Error).message || (ar ? "تعذر تحميل الحجوزات" : "Bookings could not be loaded"));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [ar, bounds.from, bounds.to, tenant.id, weekStart]);

  useEffect(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]);

  const dailyRows = useMemo(
    () => rows.filter((booking) => cairoDayKey(booking.slot_start) === selectedDay),
    [rows, selectedDay],
  );
  const visibleRows = useMemo(
    () => dailyRows.filter((booking) => filter === "all" || booking.status === filter),
    [dailyRows, filter],
  );
  const counts = useMemo(() => countBookingStatuses(dailyRows), [dailyRows]);

  useEffect(() => {
    let active = true;
    setHistoryByBooking({});
    const bookingIds = visibleRows.slice(0, 100).map((booking) => booking.id);
    if (!bookingIds.length) return () => { active = false; };
    void (async () => {
      const { data, error: historyError } = await supabase
        .from("booking_status_history")
        .select("id,booking_id,previous_status,status,changed_by_name,created_at")
        .in("booking_id", bookingIds)
        .order("created_at");
      if (!active || historyError) return;
      setHistoryByBooking((data ?? []).reduce<Record<string, BookingHistory[]>>((group, entry) => {
        (group[entry.booking_id] ??= []).push(entry);
        return group;
      }, {}));
    })();
    return () => { active = false; };
  }, [visibleRows]);

  const navigate = (amount: number) => {
    setWeekStart((day) => shiftCalendarDay(day, amount));
    setSelectedDay((day) => shiftCalendarDay(day, amount));
    setHistoryByBooking({});
    sfx.tap();
  };

  const setStatus = async (booking: BookingRow, nextStatus: string) => {
    if (!nextBookingStatuses(booking.status).includes(nextStatus) || busyId) return;
    if (nextStatus === "cancelled" && !window.confirm(
      ar ? "إلغاء الحجز نهائي. هل تريد المتابعة؟" : "Cancel this booking permanently?",
    )) return;

    setBusyId(booking.id);
    try {
      const { error: statusError } = await supabase.rpc("set_booking_status", {
        _booking: booking.id,
        _status: nextStatus,
      });
      if (statusError) throw statusError;
      sfx.tap();
      toast.success(ar ? "تم تحديث حالة الحجز" : "Booking status updated");
      await load();
    } catch (cause) {
      toast.error((cause as Error).message || (ar ? "تعذر تحديث الحجز" : "Could not update booking"));
    } finally {
      setBusyId(null);
    }
  };

  const statusNames = STATUS_LABELS[lang];
  const filters: { value: StatusFilter; ar: string; en: string }[] = [
    { value: "all", ar: "الكل", en: "All" },
    { value: "pending", ar: "قيد الانتظار", en: "Pending" },
    { value: "confirmed", ar: "المؤكدة", en: "Confirmed" },
    { value: "completed", ar: "المكتملة", en: "Completed" },
  ];

  return (
    <div className="min-w-0">
      <PanelHeader
        title={panelTitle(tenant.category, lang)}
        subtitle={ar ? "اعرض المواعيد حسب اليوم وتابع حالات الحجوزات" : "Browse appointments by day and manage booking status"}
        action={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium disabled:opacity-40"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {ar ? "تحديث" : "Refresh"}
          </button>
        }
      />

      <div className="glass-card mb-5 rounded-2xl p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">
            {bookingDateLabel(weekDays[0], lang, { day: "numeric", month: "long", year: "numeric" })}
            <span className="mx-2 text-muted-foreground">—</span>
            {bookingDateLabel(weekDays[6], lang, { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate(-7)}
              aria-label={ar ? "الأسبوع السابق" : "Previous week"}
              className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-foreground/5"
            ><ChevronLeft className="h-4 w-4" /></button>
            <button
              type="button"
              onClick={() => {
                const today = cairoDayKey(new Date());
                setWeekStart(today);
                setSelectedDay(today);
              }}
              className="h-10 rounded-full border border-border px-4 text-xs font-medium hover:bg-foreground/5"
            >{ar ? "اليوم" : "Today"}</button>
            <button
              type="button"
              onClick={() => navigate(7)}
              aria-label={ar ? "الأسبوع التالي" : "Next week"}
              className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-foreground/5"
            ><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label={ar ? "اختر يوم الحجز" : "Choose booking day"}>
          {weekDays.map((day) => {
            const dayBookings = rows.filter((booking) => cairoDayKey(booking.slot_start) === day);
            const active = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                aria-pressed={active}
                aria-label={bookingDateLabel(day, lang, { weekday: "long", day: "numeric", month: "long" })}
                className={`flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition sm:min-h-24 ${active ? "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]" : "border-border/60 hover:border-foreground/25"}`}
              >
                <span className="text-[10px] font-medium sm:text-xs">
                  {bookingDateLabel(day, lang, { weekday: "short" })}
                </span>
                <span className="text-base font-bold tabular-nums sm:text-xl">
                  {bookingDateLabel(day, lang, { day: "numeric" })}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {dayBookings.length} {ar ? "حجز" : "bookings"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-[var(--ember)]/10 px-3 py-2 text-[var(--ember)]">
          {ar ? "قيد الانتظار" : "Pending"}: {counts.pending}
        </span>
        <span className="rounded-full bg-blue-500/10 px-3 py-2 text-blue-500">
          {ar ? "مؤكد" : "Confirmed"}: {counts.confirmed}
        </span>
        <span className="rounded-full bg-[var(--emerald)]/10 px-3 py-2 text-[var(--emerald)]">
          {ar ? "مكتمل" : "Completed"}: {counts.completed}
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={ar ? "فلترة الحجوزات" : "Filter bookings"}>
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`min-h-9 rounded-full border px-3 text-xs transition ${filter === option.value ? "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]" : "border-border hover:bg-foreground/5"}`}
          >{ar ? option.ar : option.en}</button>
        ))}
      </div>

      {truncated && (
        <p role="status" className="mb-4 rounded-xl border border-[var(--ember)]/30 p-3 text-xs">
          {ar ? "عدد الحجوزات كبير؛ تُعرض أول 1000 نتيجة فقط للفترة المحددة." : "This period exceeds the first 1000 results; some bookings may be omitted."}
        </p>
      )}
      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="underline">
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}
      {loading && <div className="flex justify-center py-8" role="status"><LoaderCircle className="h-6 w-6 animate-spin" /></div>}
      {!loading && !error && visibleRows.length === 0 && (
        <EmptyState text={ar ? "لا توجد حجوزات مطابقة في هذا اليوم." : "No matching bookings on this day."} />
      )}
      {!loading && !error && (
        <div className="grid gap-3">
          {visibleRows.map((booking) => {
            const nextStatuses = nextBookingStatuses(booking.status);
            return (
              <motion.div
                key={booking.id}
                layout
                className="glass-card flex min-w-0 flex-wrap items-center gap-3 rounded-2xl p-4 sm:gap-4"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{booking.serial_no}</span>
                    <span className={`break-words font-semibold ${ar ? "font-arabic" : ""}`}>
                      {booking.customer_name || (ar ? "عميل" : "Customer")}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_MAP[booking.status] ?? "bg-foreground/10 text-foreground/70"}`}>
                      {statusNames[booking.status as keyof typeof statusNames] || booking.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <time dateTime={booking.slot_start}>{bookingTimeLabel(booking.slot_start, lang)}</time>
                    {booking.customer_phone && <span dir="ltr">{booking.customer_phone}</span>}
                  </div>
                </div>
                {nextStatuses.length > 0 && (
                  <select
                    value=""
                    disabled={busyId !== null}
                    aria-label={ar ? "تغيير حالة الحجز" : "Change booking status"}
                    onChange={(event) => void setStatus(booking, event.target.value)}
                    className="h-10 max-w-full rounded-full border border-input bg-background px-3 text-xs disabled:opacity-40"
                  >
                    <option value="">{busyId === booking.id ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "تغيير الحالة" : "Change status")}</option>
                    {nextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusNames[status as keyof typeof statusNames] || status}
                      </option>
                    ))}
                  </select>
                )}
                <details className="group basis-full border-t border-border/60 pt-3">
                  <summary className={`flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[var(--emerald)] ${ar ? "font-arabic" : ""}`}>
                    {ar ? "سجل الحالة" : "Status history"}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 grid gap-2 border-s border-[var(--emerald)]/30 ps-4">
                    {(historyByBooking[booking.id] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {ar ? "لا توجد تحديثات حالة بعد." : "No status updates yet."}
                      </p>
                    ) : (historyByBooking[booking.id] ?? []).map((entry) => (
                      <div key={entry.id} className="relative text-xs text-muted-foreground before:absolute before:-start-[1.31rem] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-[var(--emerald)]">
                        <span className="font-medium text-foreground">
                          {statusNames[entry.previous_status as keyof typeof statusNames] || entry.previous_status || "—"}
                          {" → "}
                          {statusNames[entry.status as keyof typeof statusNames] || entry.status}
                        </span>
                        {entry.changed_by_name && (
                          <span className="mt-0.5 block">
                            {ar ? `بواسطة ${entry.changed_by_name}` : `By ${entry.changed_by_name}`}
                          </span>
                        )}
                        <time className="mt-0.5 block" dateTime={entry.created_at}>
                          {new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Africa/Cairo",
                          }).format(new Date(entry.created_at))}
                        </time>
                      </div>
                    ))}
                  </div>
                </details>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
