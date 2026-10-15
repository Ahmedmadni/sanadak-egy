import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingCalendarFilename, createBookingCalendar } from "./booking-calendar";

const sample = {
  bookingId: "a24d02ac-62a6-4c6f-b69c-106314a6bd31",
  serialNo: 112,
  start: "2026-10-16T15:00:00.000Z",
  end: "2026-10-16T15:30:00.000Z",
  status: "pending",
  businessName: "Sanadak Clinic",
  serviceName: "Consultation",
  branchName: "Main branch",
  lang: "en" as const,
};

describe("calendar receipt", () => {
  it("generates an interoperable CRLF calendar with precise UTC interval", () => {
    const file = createBookingCalendar(sample, "2026-10-15T10:00:00.000Z");
    assert.ok(file.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
    assert.ok(file.endsWith("END:VCALENDAR\r\n"));
    assert.match(file, /DTSTART:20261016T150000Z/);
    assert.match(file, /DTEND:20261016T153000Z/);
    assert.match(file, /DTSTAMP:20261015T100000Z/);
    assert.match(file, /STATUS:TENTATIVE/);
    assert.match(file, /TRANSP:TRANSPARENT/);
    assert.match(file, /pending booking request/);
  });

  it("uses confirmed status only for a confirmed booking", () => {
    const file = createBookingCalendar({ ...sample, status: "confirmed" });
    assert.match(file, /STATUS:CONFIRMED/);
    assert.match(file, /TRANSP:OPAQUE/);
    assert.equal(bookingCalendarFilename(112), "sanadak-booking-112.ics");
  });

  it("escapes malicious text rather than adding calendar entries", () => {
    const file = createBookingCalendar({
      ...sample, businessName: "Cafe\\Street, 7; Level\r\nBEGIN:VEVENT\r\nSUMMARY:EVIL",
    });
    assert.equal(file.split("\r\n").filter(x => x === "BEGIN:VEVENT").length, 1);
    assert.ok(file.includes("\\nBEGIN:VEVENT\\nSUMMARY:EVIL"));
    assert.ok(file.includes("\\,") && file.includes("\\;"));
  });

  it("folds Unicode content lines within 75 UTF-8 octets", () => {
    const file = createBookingCalendar({
      ...sample, businessName: "عيادة سندك ".repeat(24), lang: "ar",
    });
    for (const line of file.trimEnd().split("\r\n")) {
      assert.ok(new TextEncoder().encode(line).length <= 75, line);
    }
    assert.ok(file.includes("\r\n "));
  });

  it("rejects invalid identifiers and unsafe booking dates", () => {
    assert.throws(() => createBookingCalendar({ ...sample, bookingId: "abc" }), /identifier/);
    assert.throws(() => createBookingCalendar({ ...sample, start: "not a date" }), /date/);
    assert.throws(() => createBookingCalendar({ ...sample, end: sample.start }), /after start/);
    assert.throws(() => bookingCalendarFilename(-1), /number/);
  });
});
