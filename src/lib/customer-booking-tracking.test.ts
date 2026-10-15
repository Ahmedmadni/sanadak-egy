import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingHasMore,
  bookingTimeCairo,
  customerBookingCanCancel,
  CUSTOMER_BOOKING_STATUSES,
} from "./customer-booking-tracking";

describe("customer booking cancellation", () => {
  const now = new Date("2026-10-16T12:00:00.000Z");
  it("allows only future pending and confirmed bookings", () => {
    for (const status of ["pending", "confirmed"]) {
      assert.equal(customerBookingCanCancel({ status, slot_start: "2026-10-16T12:00:01Z" }, now), true);
      assert.equal(customerBookingCanCancel({ status, slot_start: "2026-10-16T12:00:00Z" }, now), false);
      assert.equal(customerBookingCanCancel({ status, slot_start: "2026-10-15T12:00:00Z" }, now), false);
    }
    for (const status of ["cancelled", "completed", "no_show", "invalid"]) {
      assert.equal(customerBookingCanCancel({ status, slot_start: "2026-11-01T12:00:00Z" }, now), false);
    }
  });
  it("does not offer cancellation for malformed time", () => {
    assert.equal(customerBookingCanCancel({ status: "pending", slot_start: "not a date" }, now), false);
  });
});

describe("customer booking lists", () => {
  it("formats both winter and summer Cairo-local hours independent of the device", () => {
    assert.match(bookingTimeCairo("2026-01-15T10:00:00Z", "en"), /12:00/);
    assert.match(bookingTimeCairo("2026-07-15T10:00:00Z", "en"), /13:00/);
  });
  it("offers pagination only for a full positive page", () => {
    assert.equal(bookingHasMore(30), true);
    assert.equal(bookingHasMore(29), false);
    assert.equal(bookingHasMore(0), false);
    assert.equal(bookingHasMore(0, 0), false);
  });
  it("keeps status labels localized without implying final confirmation", () => {
    assert.equal(CUSTOMER_BOOKING_STATUSES.ar.pending, "بانتظار التأكيد");
    assert.equal(CUSTOMER_BOOKING_STATUSES.en.no_show, "No show");
  });
});
