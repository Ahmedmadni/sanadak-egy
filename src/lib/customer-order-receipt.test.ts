import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canShowMoreOrders,
  isOrderComplete,
  readableOrderMoney,
  receiptVariantLabels,
  CUSTOMER_ORDER_STATUS_LABELS,
} from "./customer-order-receipt";

describe("saved order receipts", () => {
  it("normalizes only safe scalar variant snapshot labels", () => {
    assert.deepEqual(receiptVariantLabels({ selection: " Large ", color: "Red", count: 2, metadata: { price: 0 } }), [
      "Large", "Red", "2",
    ]);
    assert.deepEqual(receiptVariantLabels(null), []);
    assert.deepEqual(receiptVariantLabels(["Do not show"]), []);
    assert.deepEqual(receiptVariantLabels({ selection: "   ", broken: Number.POSITIVE_INFINITY }), []);
  });

  it("caps suspiciously long labels and excessive option fields", () => {
    const options = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i), "x".repeat(150)]));
    const labels = receiptVariantLabels(options);
    assert.equal(labels.length, 12);
    assert.ok(labels.every((label) => label.length === 100));
  });

  it("formats backend monetary snapshots and never accepts NaN", () => {
    assert.match(readableOrderMoney(120.5, "EGP", "en"), /120/);
    assert.match(readableOrderMoney(120.5, "EGP", "ar"), /١٢٠|120/);
    assert.equal(readableOrderMoney(Number.NaN, "EGP", "en"), "—");
    assert.match(readableOrderMoney(120, "unrecognized", "en"), /unrecognized/);
  });

  it("does not fabricate pages from a short response", () => {
    assert.equal(canShowMoreOrders(50, 50), true);
    assert.equal(canShowMoreOrders(49, 50), false);
    assert.equal(canShowMoreOrders(50, 0), false);
  });

  it("detects terminal order states without implying payment", () => {
    assert.equal(isOrderComplete("delivered"), true);
    assert.equal(isOrderComplete("cancelled"), true);
    assert.equal(isOrderComplete("ready"), false);
    assert.equal(isOrderComplete("paid"), false);
  });

  it("provides bilingual status labels", () => {
    assert.equal(CUSTOMER_ORDER_STATUS_LABELS.ar.preparing, "جارٍ التجهيز");
    assert.equal(CUSTOMER_ORDER_STATUS_LABELS.en.out_for_delivery, "Out for delivery");
  });
});
