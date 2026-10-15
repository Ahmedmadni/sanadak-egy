import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, CalendarX, ChevronDown, Clock3, MapPin, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/use-auth";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { bookingHasMore, bookingTimeCairo, customerBookingCanCancel, type CustomerBookingFilter } from "@/lib/customer-booking-tracking";
import { CustomerBookingHistory } from "@/components/sanadak/CustomerBookingHistory";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "حجوزاتي | سندك" }] }),
  component: CustomerBookingsPage,
});

type BookingCard = Pick<
  Tables<"bookings">,
  "id" | "tenant_id" | "item_id" | "slot_start" | "slot_end" | "status" | "serial_no" | "branch_id"
> & {
  tenantName: string;
  tenantSlug: string;
  itemName: string | null;
  branchName: string | null;
};
const PAGE_SIZE = 30;

const statusTone: Record<string, string> = {
  pending: "bg-[var(--ember)]/15 text-[var(--ember)]",
  confirmed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  cancelled: "bg-destructive/15 text-destructive",
  no_show: "bg-destructive/15 text-destructive",
};

function CustomerBookingsPage() {
  const { user, loading } = useAuth();
  const { lang } = useSanadak();
  const navigate = useNavigate();
  const [rows, setRows] = useState<BookingCard[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<CustomerBookingFilter>("upcoming");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loadedOwnerId, setLoadedOwnerId] = useState<string | null>(null);
  const requestId = useRef(0);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      lang === "ar"
        ? {
            title: "حجوزاتي",
            subtitle: "تابع مواعيدك القادمة وحالة كل حجز.",
            empty: "لا توجد حجوزات مرتبطة بهذا الحساب حتى الآن.",
            explore: "استكشف الأنشطة",
            cancel: "إلغاء الحجز",
            cancelling: "جارٍ الإلغاء…",
            cancelled: "تم إلغاء الحجز.",
            cancelConfirm: "هل تريد إلغاء هذا الحجز؟ لا يمكن التراجع عن الإلغاء.",
            signIn: "سجّل الدخول لعرض حجوزاتك.",
            signInAction: "تسجيل الدخول",
            booking: "حجز",
            service: "الخدمة",
            branch: "الفرع",
            history: "سجل الحالة",
            historyEmpty: "لا توجد تحديثات حالة بعد.",
            review: "قيّم تجربتك",
            statuses: {
              pending: "بانتظار التأكيد",
              confirmed: "مؤكد",
              completed: "مكتمل",
              cancelled: "ملغي",
              no_show: "لم يحضر",
            } as Record<string, string>,
          }
        : {
            title: "My bookings",
            subtitle: "Keep track of your upcoming appointments and their status.",
            empty: "No bookings are linked to this account yet.",
            explore: "Explore businesses",
            cancel: "Cancel booking",
            cancelling: "Cancelling…",
            cancelled: "Booking cancelled.",
            cancelConfirm: "Cancel this booking? This action cannot be undone.",
            signIn: "Sign in to see your bookings.",
            signInAction: "Sign in",
            booking: "Booking",
            service: "Service",
            branch: "Branch",
            history: "Status history",
            historyEmpty: "No status updates yet.",
            review: "Rate your experience",
            statuses: {
              pending: "Awaiting confirmation",
              confirmed: "Confirmed",
              completed: "Completed",
              cancelled: "Cancelled",
              no_show: "No show",
            } as Record<string, string>,
          },
    [lang],
  );

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", search: { redirect: "/bookings" } });
    }
  }, [loading, navigate, user]);

  const userId = user?.id;
  const loadBookings = useCallback(async (offset = 0, append = false) => {
    if (!userId) return;
    const request = ++requestId.current;
    if (append) setLoadingMore(true);
    else {
      setLoadingRows(true);
      setLoadedOwnerId(userId);
      setRows([]);
      setExpanded({});
      setHasMore(false);
    }
    setError("");

    try {
      let query = supabase.from("bookings")
        .select("id,tenant_id,item_id,branch_id,slot_start,slot_end,status,serial_no")
        .eq("customer_id", userId);
      if (filter === "upcoming") {
        query = query.in("status", ["pending", "confirmed"])
          .gte("slot_start", new Date().toISOString());
      } else if (filter === "completed" || filter === "cancelled") {
        query = query.eq("status", filter);
      }
      const { data: bookings, error: loadError } = await query
        .order("slot_start", { ascending: filter === "upcoming" })
        .range(offset, offset + PAGE_SIZE - 1);
      if (request !== requestId.current) return;
      if (loadError) throw loadError;

      const tenantIds = [...new Set((bookings ?? []).map((booking) => booking.tenant_id))];
      const itemIds = [...new Set((bookings ?? []).flatMap((booking) => booking.item_id ? [booking.item_id] : []))];
      const branchIds = [...new Set((bookings ?? []).flatMap((booking) => booking.branch_id ? [booking.branch_id] : []))];
      const [tenantsResult, itemsResult, branchesResult] = await Promise.all([
        tenantIds.length
          ? supabase.from("tenants").select("id,name,slug").in("id", tenantIds)
          : Promise.resolve({ data: [] as Pick<Tables<"tenants">, "id" | "name" | "slug">[] }),
        itemIds.length
          ? supabase.from("catalog_items").select("id,name").in("id", itemIds)
          : Promise.resolve({ data: [] as Pick<Tables<"catalog_items">, "id" | "name">[] }),
        branchIds.length
          ? supabase.from("branches").select("id,name").in("id", branchIds)
          : Promise.resolve({ data: [] as Pick<Tables<"branches">, "id" | "name">[] }),
      ]);
      if (request !== requestId.current) return;

      // Merchant details may no longer be public. Retain the customer's own
      // booking record with neutral fallbacks instead of exposing hidden data.
      const tenantById = new Map((tenantsResult.data ?? []).map((tenant) => [tenant.id, tenant]));
      const itemById = new Map((itemsResult.data ?? []).map((item) => [item.id, item]));
      const branchById = new Map((branchesResult.data ?? []).map((branch) => [branch.id, branch]));
      const mapped: BookingCard[] = (bookings ?? []).map((booking) => {
        const tenant = tenantById.get(booking.tenant_id);
        return {
          ...booking,
          tenantName: tenant?.name ?? (lang === "ar" ? "نشاط غير متاح" : "Unavailable business"),
          tenantSlug: tenant?.slug ?? "",
          itemName: booking.item_id ? (itemById.get(booking.item_id)?.name ?? null) : null,
          branchName: booking.branch_id ? (branchById.get(booking.branch_id)?.name ?? null) : null,
        };
      });
      setRows((previous) => append
        ? [...previous, ...mapped.filter((booking) => !previous.some((row) => row.id === booking.id))]
        : mapped);
      setHasMore(bookingHasMore((bookings ?? []).length, PAGE_SIZE));
    } catch (cause) {
      if (request === requestId.current) {
        setError((cause as Error).message || (lang === "ar" ? "تعذر تحميل الحجوزات" : "Unable to load bookings"));
      }
    } finally {
      if (request === requestId.current) {
        setLoadingRows(false);
        setLoadingMore(false);
      }
    }
  }, [filter, lang, userId]);

  useEffect(() => {
    if (!userId) {
      requestId.current += 1;
      setRows([]);
      setLoadedOwnerId(null);
      return;
    }
    void loadBookings();
    return () => { requestId.current += 1; };
  }, [loadBookings, userId]);

  const cancelBooking = async (booking: BookingCard) => {
    if (cancellingId || !customerBookingCanCancel(booking) || !window.confirm(copy.cancelConfirm)) return;
    setCancellingId(booking.id);
    try {
      const { error: cancelError } = await supabase.rpc("set_booking_status", {
        _booking: booking.id,
        _status: "cancelled",
      });
      if (cancelError) throw cancelError;
      sfx.tap();
      toast.success(copy.cancelled);
      await loadBookings();
    } catch (cause) {
      toast.error((cause as Error).message || (lang === "ar" ? "تعذر إلغاء الحجز" : "Cannot cancel booking"));
      await loadBookings();
    } finally {
      setCancellingId(null);
    }
  };

  if (loading || !user) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="relative mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7"
        >
          <p className={`text-sm font-medium text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>
            {copy.booking}
          </p>
          <h1 className={`mt-1 text-3xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>
            {copy.title}
          </h1>
          <p className={`mt-2 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {copy.subtitle}
          </p>
        </motion.header>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label={lang === "ar" ? "تصفية الحجوزات" : "Filter bookings"} className="flex flex-wrap gap-2">
            {([
              ["upcoming", "القادمة", "Upcoming"],
              ["all", "الكل", "All"],
              ["completed", "المكتملة", "Completed"],
              ["cancelled", "الملغاة", "Cancelled"],
            ] as const).map(([value, labelAr, labelEn]) => (
              <button
                type="button" key={value} aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`min-h-10 rounded-full border px-3 text-xs font-semibold transition ${filter === value ? "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]" : "border-border hover:bg-foreground/5"}`}
              >{lang === "ar" ? labelAr : labelEn}</button>
            ))}
          </div>
          <button type="button" onClick={() => void loadBookings()} disabled={loadingRows || loadingMore}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loadingRows ? "animate-spin" : ""}`} />
            {lang === "ar" ? "تحديث" : "Refresh"}
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
            <span>{error}</span>
            <button type="button" onClick={() => void loadBookings()} className="underline">{lang === "ar" ? "إعادة المحاولة" : "Retry"}</button>
          </div>
        )}

        {loadingRows || loadedOwnerId !== user.id ? (
          <div role="status" className="grid min-h-48 place-items-center text-sm text-muted-foreground">
            {lang === "ar" ? "جارٍ تحميل الحجوزات…" : "Loading bookings…"}
          </div>
        ) : error && rows.length === 0 ? null : rows.length === 0 ? (
          <section className="rounded-3xl border border-border/70 bg-background/80 px-6 py-12 text-center shadow-sm">
            <CalendarCheck className="mx-auto h-9 w-9 text-[var(--emerald)]" />
            <p className={`mt-4 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{copy.empty}</p>
            <Link
              to="/search"
              search={{ q: "" }}
              className={`mt-6 inline-flex h-10 items-center rounded-full bg-gradient-brand px-5 text-sm font-medium text-primary-foreground shadow-glow ${lang === "ar" ? "font-arabic" : ""}`}
            >
              {copy.explore}
            </Link>
          </section>
        ) : (
          <div className="grid gap-3">
            {rows.map((booking) => {
              const canCancel = customerBookingCanCancel(booking);
              return (
                <motion.article
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {booking.tenantSlug ? (
                        <Link to="/store/$slug" params={{ slug: booking.tenantSlug }} className="text-base font-bold hover:text-[var(--emerald)]">
                          {booking.tenantName}
                        </Link>
                      ) : (
                        <p className="text-base font-bold">{booking.tenantName}</p>
                      )}
                      <p className={`mt-1 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
                        {booking.itemName ? `${copy.service}: ${booking.itemName}` : copy.booking}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[booking.status] ?? "bg-muted text-muted-foreground"} ${lang === "ar" ? "font-arabic" : ""}`}>
                      {copy.statuses[booking.status] ?? booking.status}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-2 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-[var(--emerald)]" />
                      {bookingTimeCairo(booking.slot_start, lang)}
                    </span>
                    {booking.branchName && (
                      <span className={`flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
                        <MapPin className="h-4 w-4 text-[var(--emerald)]" /> {copy.branch}: {booking.branchName}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">#{booking.serial_no}</span>
                    {booking.status === "completed" && (
                      <Link
                        to="/reviews"
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--emerald)]/30 px-4 text-xs font-semibold text-[var(--emerald)] transition hover:bg-[var(--emerald)]/10 ${lang === "ar" ? "font-arabic" : ""}`}
                      >
                        <Star className="h-3.5 w-3.5" />
                        {copy.review}
                      </Link>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={cancellingId !== null}
                        onClick={() => void cancelBooking(booking)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-destructive/30 px-4 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 ${lang === "ar" ? "font-arabic" : ""}`}
                      >
                        <CalendarX className="h-3.5 w-3.5" />
                        {cancellingId === booking.id ? copy.cancelling : copy.cancel}
                      </button>
                    )}
                  </div>

                  <details
                    className="group mt-4 border-t border-border/60 pt-3"
                    onToggle={(event) => {
                      const open = event.currentTarget.open;
                      setExpanded((previous) => ({ ...previous, [booking.id]: open }));
                    }}
                  >
                    <summary className={`flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>
                      {copy.history}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    {expanded[booking.id] && <CustomerBookingHistory bookingId={booking.id} lang={lang} />}
                  </details>
                </motion.article>
              );
            })}
          </div>
        )}

        {!loadingRows && !error && hasMore && (
          <button type="button" disabled={loadingMore} onClick={() => void loadBookings(rows.length, true)}
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm font-semibold hover:bg-foreground/5 disabled:opacity-50">
            {loadingMore
              ? (lang === "ar" ? "جارٍ التحميل…" : "Loading…")
              : (lang === "ar" ? "عرض المزيد من الحجوزات" : "Show more bookings")}
          </button>
        )}
      </div>
    </main>
  );
}
