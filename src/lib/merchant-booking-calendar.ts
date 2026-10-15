/**
 * Merchant booking calendar utilities.
 * Group dates by the business timezone instead of the operator's device timezone.
 */
const CAIRO_TIME_ZONE = "Africa/Cairo";

export function cairoDayKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function shiftCalendarDay(day: string, amount: number): string {
  const base = new Date(`${day}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + amount);
  return base.toISOString().slice(0, 10);
}

export function calendarWeek(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftCalendarDay(start, index));
}

/**
 * Query a conservative UTC interval enclosing all seven Cairo-local days,
 * regardless of seasonal DST transitions (+02/+03).
 */
export function calendarQueryBounds(start: string): { from: string; to: string } {
  return {
    from: `${shiftCalendarDay(start, -1)}T00:00:00.000Z`,
    to: `${shiftCalendarDay(start, 8)}T00:00:00.000Z`,
  };
}

export function nextBookingStatuses(status: string): string[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["completed", "no_show", "cancelled"];
    default:
      return [];
  }
}

export function countBookingStatuses(
  rows: readonly { status: string }[],
): { pending: number; confirmed: number; completed: number } {
  return {
    pending: rows.filter((row) => row.status === "pending").length,
    confirmed: rows.filter((row) => row.status === "confirmed").length,
    completed: rows.filter((row) => row.status === "completed").length,
  };
}
