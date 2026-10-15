import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cairoDayKey,
  calendarQueryBounds,
  calendarWeek,
  countBookingStatuses,
  nextBookingStatuses,
  shiftCalendarDay,
} from "./merchant-booking-calendar";

describe("Cairo-local merchant calendar", () => {
  it("uses Cairo's real day at winter midnight", () => {
    assert.equal(cairoDayKey("2026-01-01T21:59:00Z"), "2026-01-01");
    assert.equal(cairoDayKey("2026-01-01T22:01:00Z"), "2026-01-02");
  });

  it("uses Cairo's real day in daylight-saving time", () => {
    assert.equal(cairoDayKey("2026-07-01T20:59:00Z"), "2026-07-01");
    assert.equal(cairoDayKey("2026-07-01T21:01:00Z"), "2026-07-02");
  });

  it("moves across month/year boundaries without using browser-local time", () => {
    assert.equal(shiftCalendarDay("2026-12-31", 1), "2027-01-01");
    assert.deepEqual(calendarWeek("2026-12-29"), [
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
      "2027-01-04",
    ]);
  });

  it("queries a safe interval covering Cairo midnight during both seasons", () => {
    const bounds = calendarQueryBounds("2026-10-22");
    assert.equal(bounds.from, "2026-10-21T00:00:00.000Z");
    assert.equal(bounds.to, "2026-10-30T00:00:00.000Z");
    assert.ok(new Date("2026-10-22T21:30:00Z") >= new Date(bounds.from));
    assert.ok(new Date("2026-10-29T20:45:00Z") < new Date(bounds.to));
  });

  it("restricts booking state changes to server-permitted transitions", () => {
    assert.deepEqual(nextBookingStatuses("pending"), ["confirmed", "cancelled"]);
    assert.deepEqual(nextBookingStatuses("confirmed"), ["completed", "no_show", "cancelled"]);
    for (const status of ["cancelled", "completed", "no_show", "unknown"]) {
      assert.deepEqual(nextBookingStatuses(status), []);
    }
  });

  it("counts the three actionable summary states", () => {
    assert.deepEqual(countBookingStatuses([
      { status: "pending" },
      { status: "pending" },
      { status: "confirmed" },
      { status: "completed" },
      { status: "cancelled" },
    ]), { pending: 2, confirmed: 1, completed: 1 });
  });
});
