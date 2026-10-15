/**
 * Cairo-local calendar helpers for the public booking experience.
 * Never derive the business date from the visitor's local timezone.
 */
export const BUSINESS_TIME_ZONE = "Africa/Cairo";

export function cairoDateValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function bookingDays(count: number, fromDate = new Date()): string[] {
  const safeCount = Math.max(0, Math.min(60, Math.trunc(count)));
  const today = new Date(`${cairoDateValue(fromDate)}T12:00:00Z`);
  return Array.from({ length: safeCount }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}
