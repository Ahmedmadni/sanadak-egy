/** Client-side booking-list decisions mirror the authenticated booking-status RPC. */
export type CustomerBookingFilter = "upcoming" | "all" | "completed" | "cancelled";

export const CUSTOMER_BOOKING_STATUSES: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    pending: "بانتظار التأكيد",
    confirmed: "مؤكد",
    completed: "مكتمل",
    cancelled: "ملغي",
    no_show: "لم يحضر",
  },
  en: {
    pending: "Awaiting confirmation",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No show",
  },
};

export function customerBookingCanCancel(
  booking: { status: string; slot_start: string },
  now: Date = new Date(),
): boolean {
  const time = Date.parse(booking.slot_start);
  return (
    (booking.status === "pending" || booking.status === "confirmed") &&
    Number.isFinite(time) &&
    time > now.getTime()
  );
}

export function bookingTimeCairo(value: string, lang: "ar" | "en"): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function bookingHasMore(responseLength: number, pageSize = 30): boolean {
  return Number.isInteger(pageSize) && pageSize > 0 && responseLength === pageSize;
}
