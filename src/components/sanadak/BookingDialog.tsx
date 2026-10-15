import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  RotateCw,
  Send,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { sfx } from "@/lib/sanadak-sounds";
import { BUSINESS_TIME_ZONE, bookingDays } from "@/lib/booking-dates";
import { bookingCalendarFilename, createBookingCalendar } from "@/lib/booking-calendar";

type Branch = Pick<Tables<"branches">, "id" | "name" | "address">;
type Staff = Pick<Tables<"staff">, "id" | "name" | "role" | "specialty" | "branch_id">;

type BookingItem = {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_minutes: number | null;
};

type Customer = {
  name: string;
  phone: string;
  address: string;
};

type Slot = {
  slot_start: string;
  slot_end: string;
};

type BookingResult = {
  booking_id: string;
  serial_no: number;
  slot_end: string;
  slot_start: string;
  status: string;
};

type BookingDialogProps = {
  tenantId: string;
  tenantName: string;
  item: BookingItem;
  branches: Branch[];
  staff: Staff[];
  customer: Customer;
  lang: "ar" | "en";
  onCustomerChange: (customer: Customer) => void;
  onClose: () => void;
};

function dateParts(value: string, lang: "ar" | "en") {
  const locale = lang === "ar" ? "ar-EG" : "en-EG";
  const date = new Date(`${value}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(date),
    day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date),
  };
}

function timeLabel(value: string, lang: "ar" | "en") {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-EG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

function fullDateLabel(value: string, lang: "ar" | "en") {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

function localizedError(message: string, lang: "ar" | "en") {
  if (message.includes("selected time is no longer available")) {
    return lang === "ar"
      ? "سبقك عميل آخر لهذا الموعد. اختر موعدًا آخر."
      : "Another customer just took this time. Please choose another slot.";
  }
  if (message.includes("business is not available")) {
    return lang === "ar"
      ? "النشاط غير متاح للحجز حاليًا."
      : "This business is not available for booking.";
  }
  if (message.includes("booking date is outside")) {
    return lang === "ar"
      ? "اختر موعدًا خلال الستين يومًا القادمة."
      : "Choose a date within the next 60 days.";
  }
  return message;
}

export function BookingDialog({
  tenantId,
  tenantName,
  item,
  branches,
  staff,
  customer,
  lang,
  onCustomerChange,
  onClose,
}: BookingDialogProps) {
  const reduceMotion = useReducedMotion();
  const days = useMemo(() => bookingDays(14), []);
  const [branchId, setBranchId] = useState<string | null>(branches[0]?.id ?? null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotAt, setSlotAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  const visibleStaff = useMemo(
    () => staff.filter((member) => !branchId || !member.branch_id || member.branch_id === branchId),
    [branchId, staff],
  );

  useEffect(() => {
    if (staffId && !visibleStaff.some((member) => member.id === staffId)) setStaffId(null);
  }, [staffId, visibleStaff]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [busy, onClose]);

  useEffect(() => {
    let active = true;
    setLoadingSlots(true);
    setAvailabilityError("");
    setSlotAt("");

    void (async () => {
      try {
        const { data, error } = await supabase.rpc("get_booking_availability", {
          _tenant: tenantId,
          _item: item.id,
          _date: selectedDate,
          _branch: branchId ?? undefined,
          _staff: staffId ?? undefined,
        });
        if (!active) return;
        if (error) {
          setSlots([]);
          setAvailabilityError(localizedError(error.message, lang));
        } else {
          setSlots(data ?? []);
        }
      } catch (error) {
        if (active) {
          setSlots([]);
          setAvailabilityError(
            localizedError(
              (error as Error).message ||
                (lang === "ar" ? "تعذر تحميل المواعيد" : "Times could not be loaded"),
              lang,
            ),
          );
        }
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [branchId, item.id, lang, refreshKey, selectedDate, staffId, tenantId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slotAt) {
      toast.error(lang === "ar" ? "اختر موعدًا متاحًا أولًا" : "Choose an available time first");
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error(lang === "ar" ? "أدخل الاسم ورقم الهاتف" : "Enter your name and phone number");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_booking", {
        _tenant: tenantId,
        _item: item.id,
        _slot_start: slotAt,
        _customer_name: customer.name,
        _customer_phone: customer.phone,
        _branch: branchId ?? undefined,
        _staff: staffId ?? undefined,
        _notes: notes.trim() || undefined,
      });
      if (error) throw error;
      const booking = data?.[0];
      if (!booking)
        throw new Error(lang === "ar" ? "تعذر تأكيد الحجز" : "Booking could not be confirmed");
      setResult(booking);
      sfx.success();
    } catch (error) {
      const message = localizedError((error as Error).message || "", lang);
      toast.error(message);
      if ((error as Error).message.includes("selected time is no longer available")) {
        setSlotAt("");
        setRefreshKey((value) => value + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  const downloadCalendar = () => {
    if (!result) return;
    try {
      const ics = createBookingCalendar({
        bookingId: result.booking_id,
        serialNo: result.serial_no,
        start: result.slot_start,
        end: result.slot_end,
        status: result.status,
        businessName: tenantName,
        serviceName: item.name,
        branchName: branches.find((branch) => branch.id === branchId)?.name,
        lang,
      });
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = bookingCalendarFilename(result.serial_no);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      toast.error(lang === "ar" ? "تعذر إنشاء ملف التقويم" : "Could not create calendar invite");
    }
  };

  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const selectedStaff = staff.find((member) => member.id === staffId);
  const arabic = lang === "ar";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md grid place-items-center p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      role="presentation"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
        dir={arabic ? "rtl" : "ltr"}
        className="glass-card relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-background/95 shadow-float"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand" />
        <header className="flex items-start gap-4 border-b border-border/70 px-5 py-5 sm:px-7">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--emerald)]/12 text-[var(--emerald)]">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{tenantName}</p>
            <h2
              id="booking-dialog-title"
              className={`truncate text-lg font-bold sm:text-xl ${arabic ? "font-arabic" : ""}`}
            >
              {arabic ? `احجز ${item.name}` : `Book ${item.name}`}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" /> {item.duration_minutes}{" "}
                {arabic ? "دقيقة" : "min"}
              </span>
              <span>
                {item.price} {item.currency}
              </span>
              <span>{arabic ? "المواعيد بتوقيت القاهرة" : "Times shown in Cairo time"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={arabic ? "إغلاق" : "Close"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="success"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid flex-1 place-items-center overflow-y-auto px-5 py-10 text-center sm:px-8"
            >
              <div className="max-w-md">
                <motion.div
                  initial={reduceMotion ? false : { scale: 0.7 }}
                  animate={{ scale: 1 }}
                  className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--emerald)]/12 text-[var(--emerald)]"
                >
                  <CheckCircle2 className="h-10 w-10" />
                </motion.div>
                <h3 className={`mt-5 text-2xl font-bold ${arabic ? "font-arabic" : ""}`}>
                  {arabic ? "تم استلام حجزك" : "Your booking is in"}
                </h3>
                <p
                  className={`mt-2 text-sm leading-6 text-muted-foreground ${arabic ? "font-arabic" : ""}`}
                >
                  {arabic
                    ? "أرسلنا طلب الحجز للنشاط، وسيتم التواصل معك على رقم الهاتف للتأكيد النهائي."
                    : "The business received your request and will contact you by phone for final confirmation."}
                </p>

                <div className="mt-6 rounded-3xl border border-[var(--emerald)]/20 bg-[var(--emerald)]/5 p-5 text-start">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">
                      {arabic ? "رقم الحجز" : "Booking number"}
                    </span>
                    <strong dir="ltr" className="text-lg">
                      #{result.serial_no}
                    </strong>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--emerald)]/15 pt-3">
                    <span className="text-xs text-muted-foreground">
                      {arabic ? "الموعد" : "Appointment"}
                    </span>
                    <strong className="text-sm">
                      {fullDateLabel(result.slot_start, lang)} ·{" "}
                      {timeLabel(result.slot_start, lang)}
                    </strong>
                  </div>
                  {selectedBranch && (
                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--emerald)]/15 pt-3">
                      <span className="text-xs text-muted-foreground">
                        {arabic ? "الفرع" : "Branch"}
                      </span>
                      <strong className="text-sm">{selectedBranch.name}</strong>
                    </div>
                  )}
                  {selectedStaff && (
                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--emerald)]/15 pt-3">
                      <span className="text-xs text-muted-foreground">
                        {arabic ? "مقدم الخدمة" : "Provider"}
                      </span>
                      <strong className="text-sm">{selectedStaff.name}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={downloadCalendar}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--emerald)]/35 px-4 text-sm font-semibold text-[var(--emerald)] transition hover:bg-[var(--emerald)]/10"
                >
                  <CalendarPlus className="h-4 w-4" />
                  {arabic ? "احفظ طلب الحجز في التقويم" : "Save request to calendar"}
                </button>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {arabic
                    ? "سيُحفظ كتذكير مبدئي. لا يصبح الحجز مؤكدًا إلا بعد موافقة النشاط."
                    : "Saved as a tentative reminder until the business confirms your booking."}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 h-12 w-full rounded-full bg-gradient-brand font-medium text-primary-foreground shadow-glow"
                >
                  {arabic ? "تم" : "Done"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="booking-form"
              initial={false}
              animate={{ opacity: 1 }}
              onSubmit={submit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]">
                  <div className="min-w-0 space-y-7">
                    {branches.length > 0 && (
                      <section aria-labelledby="booking-branch-heading">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--emerald)]/12 text-xs font-bold text-[var(--emerald)]">
                            1
                          </span>
                          <h3
                            id="booking-branch-heading"
                            className={`text-sm font-bold ${arabic ? "font-arabic" : ""}`}
                          >
                            {arabic ? "اختر الفرع" : "Choose a branch"}
                          </h3>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {branches.map((branch) => {
                            const selected = branch.id === branchId;
                            return (
                              <button
                                key={branch.id}
                                type="button"
                                onClick={() => {
                                  setBranchId(branch.id);
                                  setStaffId(null);
                                  sfx.tap();
                                }}
                                aria-pressed={selected}
                                className={`relative flex min-h-20 items-start gap-3 rounded-2xl border p-3 text-start transition ${selected ? "border-[var(--emerald)] bg-[var(--emerald)]/7 shadow-sm" : "border-border bg-card/60 hover:border-[var(--emerald)]/35"}`}
                              >
                                <MapPin
                                  className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-[var(--emerald)]" : "text-muted-foreground"}`}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold">{branch.name}</span>
                                  {branch.address && (
                                    <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">
                                      {branch.address}
                                    </span>
                                  )}
                                </span>
                                {selected && (
                                  <Check className="h-4 w-4 shrink-0 text-[var(--emerald)]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {visibleStaff.length > 0 && (
                      <section aria-labelledby="booking-staff-heading">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--emerald)]/12 text-xs font-bold text-[var(--emerald)]">
                            {branches.length > 0 ? 2 : 1}
                          </span>
                          <h3
                            id="booking-staff-heading"
                            className={`text-sm font-bold ${arabic ? "font-arabic" : ""}`}
                          >
                            {arabic ? "اختر مقدم الخدمة" : "Choose a provider"}
                          </h3>
                          <span className="text-[11px] text-muted-foreground">
                            {arabic ? "اختياري" : "Optional"}
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                          <button
                            type="button"
                            onClick={() => {
                              setStaffId(null);
                              sfx.tap();
                            }}
                            aria-pressed={!staffId}
                            className={`flex min-w-32 items-center gap-2 rounded-2xl border px-3 py-3 text-start transition ${!staffId ? "border-[var(--emerald)] bg-[var(--emerald)]/7" : "border-border bg-card/60 hover:border-[var(--emerald)]/35"}`}
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground/5">
                              <UsersRound className="h-4 w-4" />
                            </span>
                            <span className="text-xs font-semibold">
                              {arabic ? "أي مقدم متاح" : "Any available"}
                            </span>
                          </button>
                          {visibleStaff.map((member) => {
                            const selected = member.id === staffId;
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => {
                                  setStaffId(member.id);
                                  sfx.tap();
                                }}
                                aria-pressed={selected}
                                className={`flex min-w-40 items-center gap-2 rounded-2xl border px-3 py-3 text-start transition ${selected ? "border-[var(--emerald)] bg-[var(--emerald)]/7" : "border-border bg-card/60 hover:border-[var(--emerald)]/35"}`}
                              >
                                <span
                                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${selected ? "bg-[var(--emerald)] text-white" : "bg-foreground/5"}`}
                                >
                                  <UserRound className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-semibold">
                                    {member.name}
                                  </span>
                                  {(member.specialty || member.role) && (
                                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                      {member.specialty || member.role}
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    <section aria-labelledby="booking-time-heading">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--emerald)]/12 text-xs font-bold text-[var(--emerald)]">
                          {(branches.length > 0 ? 1 : 0) + (visibleStaff.length > 0 ? 1 : 0) + 1}
                        </span>
                        <h3
                          id="booking-time-heading"
                          className={`text-sm font-bold ${arabic ? "font-arabic" : ""}`}
                        >
                          {arabic ? "اختر اليوم والموعد" : "Choose date and time"}
                        </h3>
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {days.map((day, index) => {
                          const parts = dateParts(day, lang);
                          const selected = day === selectedDate;
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setSelectedDate(day);
                                sfx.tap();
                              }}
                              aria-pressed={selected}
                              className={`min-w-[4.4rem] rounded-2xl border px-2 py-3 text-center transition ${selected ? "border-[var(--emerald)] bg-[var(--emerald)] text-white shadow-glow" : "border-border bg-card/60 hover:border-[var(--emerald)]/35"}`}
                            >
                              <span className="block text-[10px] font-medium opacity-80">
                                {index === 0 ? (arabic ? "اليوم" : "Today") : parts.weekday}
                              </span>
                              <span className="my-0.5 block text-lg font-bold leading-none">
                                {parts.day}
                              </span>
                              <span className="block text-[10px] opacity-80">{parts.month}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 min-h-28 rounded-2xl border border-border bg-card/50 p-3">
                        {loadingSlots ? (
                          <div className="grid min-h-24 place-items-center text-muted-foreground">
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                            <span className="sr-only">
                              {arabic ? "جاري تحميل المواعيد" : "Loading times"}
                            </span>
                          </div>
                        ) : availabilityError ? (
                          <div className="grid min-h-24 place-items-center text-center">
                            <div>
                              <p className="text-sm text-destructive">{availabilityError}</p>
                              <button
                                type="button"
                                onClick={() => setRefreshKey((value) => value + 1)}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--emerald)]"
                              >
                                <RotateCw className="h-3.5 w-3.5" />{" "}
                                {arabic ? "إعادة المحاولة" : "Try again"}
                              </button>
                            </div>
                          </div>
                        ) : slots.length === 0 ? (
                          <div className="grid min-h-24 place-items-center text-center text-sm text-muted-foreground">
                            <div>
                              <Clock3 className="mx-auto mb-2 h-5 w-5 opacity-60" />
                              {arabic
                                ? "لا توجد مواعيد متاحة في هذا اليوم"
                                : "No available times on this day"}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {slots.map((slot) => {
                              const selected = slot.slot_start === slotAt;
                              return (
                                <button
                                  key={slot.slot_start}
                                  type="button"
                                  onClick={() => {
                                    setSlotAt(slot.slot_start);
                                    sfx.tap();
                                  }}
                                  aria-pressed={selected}
                                  className={`h-10 rounded-xl border text-xs font-semibold transition ${selected ? "border-[var(--emerald)] bg-[var(--emerald)] text-white" : "border-border bg-background hover:border-[var(--emerald)]/50 hover:text-[var(--emerald)]"}`}
                                >
                                  {timeLabel(slot.slot_start, lang)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <aside className="lg:border-s lg:border-border/70 lg:ps-7">
                    <div className="lg:sticky lg:top-0">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--emerald)]/12 text-xs font-bold text-[var(--emerald)]">
                          {(branches.length > 0 ? 1 : 0) + (visibleStaff.length > 0 ? 1 : 0) + 2}
                        </span>
                        <h3 className={`text-sm font-bold ${arabic ? "font-arabic" : ""}`}>
                          {arabic ? "بيانات التواصل" : "Contact details"}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs text-muted-foreground">
                            {arabic ? "الاسم" : "Name"}
                          </span>
                          <input
                            required
                            autoComplete="name"
                            value={customer.name}
                            onChange={(event) =>
                              onCustomerChange({ ...customer, name: event.target.value })
                            }
                            className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/15"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs text-muted-foreground">
                            {arabic ? "رقم الهاتف" : "Phone"}
                          </span>
                          <input
                            required
                            autoComplete="tel"
                            inputMode="tel"
                            dir="ltr"
                            value={customer.phone}
                            onChange={(event) =>
                              onCustomerChange({ ...customer, phone: event.target.value })
                            }
                            className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/15"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs text-muted-foreground">
                            {arabic ? "ملاحظات" : "Notes"}{" "}
                            <span className="opacity-60">({arabic ? "اختياري" : "optional"})</span>
                          </span>
                          <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            maxLength={500}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-[var(--emerald)] focus:ring-2 focus:ring-[var(--emerald)]/15"
                            placeholder={
                              arabic
                                ? "أي تفاصيل تساعد مقدم الخدمة"
                                : "Anything the provider should know"
                            }
                          />
                        </label>
                      </div>

                      {slotAt && (
                        <div className="mt-4 rounded-2xl bg-[var(--emerald)]/7 p-3 text-xs">
                          <div className="flex items-center gap-2 font-semibold text-[var(--emerald)]">
                            <CalendarDays className="h-4 w-4" /> {fullDateLabel(slotAt, lang)}
                          </div>
                          <div className="mt-1 ps-6 text-muted-foreground">
                            {timeLabel(slotAt, lang)}
                            {selectedBranch ? ` · ${selectedBranch.name}` : ""}
                            {selectedStaff ? ` · ${selectedStaff.name}` : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-border/70 bg-background/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p
                  className={`text-center text-[11px] leading-5 text-muted-foreground sm:text-start ${arabic ? "font-arabic" : ""}`}
                >
                  {arabic
                    ? "سيظل الموعد خاضعًا للتأكيد النهائي من النشاط."
                    : "The business will provide final confirmation."}
                </p>
                <button
                  disabled={busy || loadingSlots || !slotAt}
                  type="submit"
                  className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 text-sm font-medium text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
                >
                  {busy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {busy
                    ? arabic
                      ? "جاري التأكيد..."
                      : "Confirming..."
                    : arabic
                      ? "تأكيد الحجز"
                      : "Confirm booking"}
                </button>
              </footer>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
