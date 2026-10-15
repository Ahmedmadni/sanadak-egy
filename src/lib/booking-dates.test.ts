import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingDays, cairoDateValue, BUSINESS_TIME_ZONE } from "./booking-dates";

describe("Egypt-local booking dates", () => {
  it("always uses the Africa/Cairo timezone", () => {
    assert.equal(BUSINESS_TIME_ZONE, "Africa/Cairo");
    assert.equal(cairoDateValue(new Date("2026-01-01T21:30:00Z")), "2026-01-01");
    assert.equal(cairoDateValue(new Date("2026-01-01T22:30:00Z")), "2026-01-02");
  });

  it("uses Cairo's summer time rather than browser or UTC midnight", () => {
    assert.equal(cairoDateValue(new Date("2026-07-01T20:30:00Z")), "2026-07-01");
    assert.equal(cairoDateValue(new Date("2026-07-01T21:30:00Z")), "2026-07-02");
  });

  it("rolls the date range across the Gregorian year boundary", () => {
    assert.deepEqual(bookingDays(3, new Date("2026-12-31T22:30:00Z")), [
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });

  it("caps booking range at the 60-day backend horizon", () => {
    assert.equal(bookingDays(1000, new Date("2026-01-01T12:00:00Z")).length, 60);
    assert.deepEqual(bookingDays(-2, new Date("2026-01-01T12:00:00Z")), []);
  });
});
