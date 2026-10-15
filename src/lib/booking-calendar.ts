/**
 * A portable iCalendar invitation for a booking receipt.
 *
 * A newly submitted booking is TENTATIVE: calendar export must never imply
 * that the merchant has confirmed an appointment.
 */
export type BookingCalendarInput = {
  bookingId: string;
  serialNo: number;
  start: string;
  end: string;
  status: string;
  businessName: string;
  serviceName: string;
  branchName?: string | null;
  lang: "ar" | "en";
};

const encoder = new TextEncoder();

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** RFC 5545 content lines are folded at no more than 75 UTF-8 octets. */
function foldLine(value: string): string {
  const lines: string[] = [];
  let line = "";
  let bytes = 0;
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75 && line) {
      lines.push(line);
      line = " " + character;
      bytes = 1 + size;
    } else {
      line += character;
      bytes += size;
    }
  }
  lines.push(line);
  return lines.join("\r\n");
}

function calendarUtc(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid booking calendar date");
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function bookingCalendarFilename(serialNo: number): string {
  if (!Number.isSafeInteger(serialNo) || serialNo < 0) throw new Error("Invalid booking number");
  return `sanadak-booking-${serialNo}.ics`;
}

export function createBookingCalendar(
  input: BookingCalendarInput,
  createdAt: string = new Date().toISOString(),
): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.bookingId)) {
    throw new Error("Invalid booking identifier");
  }
  bookingCalendarFilename(input.serialNo);
  if (Date.parse(input.end) <= Date.parse(input.start)) {
    throw new Error("Booking end must be after start");
  }
  const stamp = calendarUtc(createdAt);
  const start = calendarUtc(input.start);
  const end = calendarUtc(input.end);
  const confirmed = input.status === "confirmed";
  const ar = input.lang === "ar";
  const summary = ar
    ? `طلب حجز #${input.serialNo}: ${input.serviceName} - ${input.businessName}`
    : `Booking request #${input.serialNo}: ${input.serviceName} - ${input.businessName}`;
  const description = ar
    ? confirmed
      ? "تم تأكيد الحجز بواسطة النشاط التجاري."
      : "هذا طلب حجز مبدئي، وليس تأكيدًا نهائيًا. انتظر تواصل النشاط التجاري لتأكيد الموعد."
    : confirmed
      ? "This booking has been confirmed by the business."
      : "This is a pending booking request, not a confirmed appointment. Wait for the business to confirm it.";
  const contentLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sanadak//Customer Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${input.bookingId}@sanadak.example`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeCalendarText(summary)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    ...(input.branchName
      ? [`LOCATION:${escapeCalendarText(input.branchName)}`]
      : []),
    `STATUS:${confirmed ? "CONFIRMED" : "TENTATIVE"}`,
    `TRANSP:${confirmed ? "OPAQUE" : "TRANSPARENT"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return contentLines.map(foldLine).join("\r\n") + "\r\n";
}
