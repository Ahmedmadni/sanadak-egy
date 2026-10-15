import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_ORDER_STATUSES, merchantOrderFilterStatuses,
  canChangeMerchantOrderStatus, ORDER_STATUS_LABELS, PAYMENT_LABELS,
} from "./merchant-order-filter";

describe("merchant order filters", () => {
  it("groups every actionable state, without terminal orders", () => {
    assert.deepEqual(merchantOrderFilterStatuses("active"), [...ACTIVE_ORDER_STATUSES]);
    assert.equal(ACTIVE_ORDER_STATUSES.includes("cancelled" as never), false);
    assert.equal(ACTIVE_ORDER_STATUSES.includes("delivered" as never), false);
  });

  it("separates completed, cancelled and all orders", () => {
    assert.deepEqual(merchantOrderFilterStatuses("delivered"), ["delivered"]);
    assert.deepEqual(merchantOrderFilterStatuses("cancelled"), ["cancelled"]);
    assert.equal(merchantOrderFilterStatuses("all"), null);
  });

  it("only offers backend-permitted status transitions", () => {
    assert.equal(canChangeMerchantOrderStatus("pending", "confirmed"), true);
    assert.equal(canChangeMerchantOrderStatus("pending", "delivered"), false);
    assert.equal(canChangeMerchantOrderStatus("preparing", "ready"), true);
    assert.equal(canChangeMerchantOrderStatus("cancelled", "confirmed"), false);
    assert.equal(canChangeMerchantOrderStatus("delivered", "cancelled"), false);
  });

  it("makes localized statuses and payment state explicit", () => {
    assert.equal(ORDER_STATUS_LABELS.ar.preparing, "قيد التحضير");
    assert.equal(ORDER_STATUS_LABELS.en.out_for_delivery, "Out for delivery");
    assert.equal(PAYMENT_LABELS.ar.pending, "الدفع قيد الانتظار");
    assert.equal(PAYMENT_LABELS.en.paid, "Payment recorded");
  });
});
