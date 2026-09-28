import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, CalendarX, ChevronDown, Clock3, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/use-auth";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

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
type BookingHistory = Pick<Tables<"booking_status_history">, "id" | "booking_id" | "previous_status" | "status" | "created_at">;

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
  const [historyByBooking, setHistoryByBooking] = useState<Record<string, BookingHistory[]>>({});
  const [loadingRows, setLoadingRows] = useState(true);
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

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoadingRows(true);
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id,tenant_id,item_id,branch_id,slot_start,slot_end,status,serial_no")
        .eq("customer_id", user.id)
        .order("slot_start", { ascending: true });

      if (error) {
        toast.error(error.message);
        setLoadingRows(false);
        return;
      }

      const tenantIds = [...new Set((bookings ?? []).map((booking) => booking.tenant_id))];
      const bookingIds = (bookings ?? []).map((booking) => booking.id);
      const itemIds = [...new Set((bookings ?? []).flatMap((booking) => (booking.item_id ? [booking.item_id] : [])))];
      const branchIds = [...new Set((bookings ?? []).flatMap((booking) => (booking.branch_id ? [booking.branch_id] : [])))];
      const [tenantsResult, itemsResult, branchesResult, historyResult] = await Promise.all([
        tenantIds.length
          ? supabase.from("tenants").select("id,name,slug").in("id", tenantIds)
          : Promise.resolve({ data: [] as Pick<Tables<"tenants">, "id" | "name" | "slug">[] }),
        itemIds.length
          ? supabase.from("catalog_items").select("id,name").in("id", itemIds)
          : Promise.resolve({ data: [] as Pick<Tables<"catalog_items">, "id" | "name">[] }),
        branchIds.length
          ? supabase.from("branches").select("id,name").in("id", branchIds)
          : Promise.resolve({ data: [] as Pick<Tables<"branches">, "id" | "name">[] }),
        bookingIds.length
          ? supabase.from("booking_status_history").select("id,booking_id,previous_status,status,created_at").in("booking_id", bookingIds).order("created_at")
          : Promise.resolve({ data: [] as BookingHistory[] }),
      ]);

      const tenantById = new Map((tenantsResult.data ?? []).map((tenant) => [tenant.id, tenant]));
      const itemById = new Map((itemsResult.data ?? []).map((item) => [item.id, item]));
      const branchById = new Map((branchesResult.data ?? []).map((branch) => [branch.id, branch]));
      const nextHistory = (historyResult.data ?? []).reduce<Record<string, BookingHistory[]>>((groups, entry) => {
        (groups[entry.booking_id] ??= []).push(entry);
        return groups;
      }, {});
      setHistoryByBooking(nextHistory);
      setRows(
        (bookings ?? []).map((booking) => {
          const tenant = tenantById.get(booking.tenant_id);
          return {
            ...booking,
            tenantName: tenant?.name ?? (lang === "ar" ? "نشاط غير متاح" : "Unavailable business"),
            tenantSlug: tenant?.slug ?? "",
            itemName: booking.item_id ? (itemById.get(booking.item_id)?.name ?? null) : null,
            branchName: booking.branch_id ? (branchById.get(booking.branch_id)?.name ?? null) : null,
          };
        }),
      );
      setLoadingRows(false);
    };

    void load();
  }, [lang, user]);

  const cancelBooking = async (booking: BookingCard) => {
    if (!window.confirm(copy.cancelConfirm)) return;
    setCancellingId(booking.id);
    const { error } = await supabase.rpc("set_booking_status", {
      _booking: booking.id,
      _status: "cancelled",
    });
    setCancellingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRows((current) =>
      current.map((row) => (row.id === booking.id ? { ...row, status: "cancelled" } : row)),
    );
    sfx.tap();
    toast.success(copy.cancelled);
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

        {loadingRows ? (
          <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">…</div>
        ) : rows.length === 0 ? (
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
              const canCancel =
                ["pending", "confirmed"].includes(booking.status) &&
                new Date(booking.slot_start).getTime() > Date.now();
              const date = new Date(booking.slot_start);
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
                      {date.toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" })}
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
                        disabled={cancellingId === booking.id}
                        onClick={() => void cancelBooking(booking)}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-destructive/30 px-4 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 ${lang === "ar" ? "font-arabic" : ""}`}
                      >
                        <CalendarX className="h-3.5 w-3.5" />
                        {cancellingId === booking.id ? copy.cancelling : copy.cancel}
                      </button>
                    )}
                  </div>

                  <details className="group mt-4 border-t border-border/60 pt-3">
                    <summary className={`flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>
                      {copy.history}<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 grid gap-2 border-s border-[var(--emerald)]/30 ps-4">
                      {(historyByBooking[booking.id] ?? []).length === 0 ? <p className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{copy.historyEmpty}</p> : (historyByBooking[booking.id] ?? []).map((entry) => (
                        <div key={entry.id} className="relative text-xs text-muted-foreground before:absolute before:-start-[1.31rem] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-[var(--emerald)]">
                          <span className={`font-medium text-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{copy.statuses[entry.previous_status] ?? entry.previous_status} → {copy.statuses[entry.status] ?? entry.status}</span>
                          <span className="mt-0.5 block">{new Date(entry.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
