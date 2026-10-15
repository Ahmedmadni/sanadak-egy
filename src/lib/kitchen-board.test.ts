import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAdvanceKitchenOrder,
  groupKitchenOrders,
  kitchenNextStatus,
  kitchenOrderAgeMinutes,
  kitchenOrderIsDelayed,
  KITCHEN_STAGES,
} from "./kitchen-board";

const now = new Date("2026-10-15T10:00:00Z");

describe("kitchen state machine", () => {
  it("keeps the five active kitchen columns", () => {
    assert.deepEqual(KITCHEN_STAGES, [
      "pending", "confirmed", "preparing", "ready", "out_for_delivery",
    ]);
  });

  it("exposes only permitted forward actions", () => {
    for (const [status, target] of [
      ["pending", "confirmed"],
      ["confirmed", "preparing"],
      ["preparing", "ready"],
      ["out_for_delivery", "delivered"],
    ]) {
      const order = { status, delivery_type: "delivery" };
      assert.equal(kitchenNextStatus(order), target);
      assert.equal(canAdvanceKitchenOrder(order, target), true);
    }
    assert.equal(kitchenNextStatus({ status: "ready", delivery_type: "delivery" }), "out_for_delivery");
    assert.equal(kitchenNextStatus({ status: "ready", delivery_type: "pickup" }), "delivered");
    assert.equal(kitchenNextStatus({ status: "ready", delivery_type: "dine_in" }), "delivered");
  });

  it("never offers invalid transitions or revives completed orders", () => {
    for (const status of ["cancelled", "delivered", "other"]) {
      assert.equal(kitchenNextStatus({ status, delivery_type: "pickup" }), null);
    }
    assert.equal(canAdvanceKitchenOrder({ status: "pending", delivery_type: "delivery" }, "delivered"), false);
    assert.equal(canAdvanceKitchenOrder({ status: "ready", delivery_type: "delivery" }, "delivered"), false);
    assert.equal(canAdvanceKitchenOrder({ status: "ready", delivery_type: "pickup" }, "out_for_delivery"), false);
    assert.equal(canAdvanceKitchenOrder({ status: "confirmed", delivery_type: "pickup" }, "cancelled"), false);
  });
});

describe("kitchen groups and time", () => {
  it("sorts oldest orders first and skips terminal orders", () => {
    const data = [
      { id: "new", status: "pending", delivery_type: "pickup", created_at: "2026-10-15T09:20:00Z" },
      { id: "delivered", status: "delivered", delivery_type: "pickup", created_at: "2026-10-15T08:00:00Z" },
      { id: "ready", status: "ready", delivery_type: "delivery", created_at: "2026-10-15T09:10:00Z" },
      { id: "old", status: "pending", delivery_type: "pickup", created_at: "2026-10-15T09:00:00Z" },
    ];
    const groups = groupKitchenOrders(data);
    assert.deepEqual(groups.pending.map(x => x.id), ["old", "new"]);
    assert.deepEqual(groups.ready.map(x => x.id), ["ready"]);
    assert.equal(Object.values(groups).flat().some(x => x.id === "delivered"), false);
  });

  it("flags overdue preparation, not fulfilled orders", () => {
    const created_at = "2026-10-15T09:40:00Z";
    assert.equal(kitchenOrderAgeMinutes(created_at, now), 20);
    assert.equal(kitchenOrderAgeMinutes("invalid", now), 0);
    assert.equal(kitchenOrderAgeMinutes("2026-10-15T10:05:00Z", now), 0);
    assert.equal(kitchenOrderIsDelayed({ status: "preparing", created_at }, now), true);
    assert.equal(kitchenOrderIsDelayed({ status: "ready", created_at }, now), false);
    assert.equal(kitchenOrderIsDelayed({ status: "delivered", created_at }, now), false);
    assert.equal(kitchenOrderIsDelayed({ status: "pending", created_at }, now, 30), false);
  });
});
