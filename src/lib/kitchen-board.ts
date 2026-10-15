/**
 * Kitchen-stage rules mirror the existing set_order_status RPC transition contract.
 * UI actions do not bypass server authorization or inventory state enforcement.
 */
export type KitchenStage = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery";

export type KitchenOrder = {
  id: string;
  status: string;
  delivery_type: string;
  created_at: string;
};

export const KITCHEN_STAGES: readonly KitchenStage[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
];

export const KITCHEN_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/**
 * Show one primary forward-only action for staff. Other lifecycle
 * transitions, including cancellation, remain available in Orders.
 */
export function kitchenNextStatus(order: Pick<KitchenOrder, "status" | "delivery_type">): string | null {
  switch (order.status) {
    case "pending":
      return "confirmed";
    case "confirmed":
      return "preparing";
    case "preparing":
      return "ready";
    case "ready":
      return order.delivery_type === "delivery" ? "out_for_delivery" : "delivered";
    case "out_for_delivery":
      return "delivered";
    default:
      return null;
  }
}

export function canAdvanceKitchenOrder(
  order: Pick<KitchenOrder, "status" | "delivery_type">,
  target: string,
): boolean {
  return (
    kitchenNextStatus(order) === target &&
    (KITCHEN_TRANSITIONS[order.status] ?? []).includes(target)
  );
}

export function groupKitchenOrders<T extends KitchenOrder>(
  orders: readonly T[],
): Record<KitchenStage, T[]> {
  const grouped = {
    pending: [] as T[],
    confirmed: [] as T[],
    preparing: [] as T[],
    ready: [] as T[],
    out_for_delivery: [] as T[],
  };
  for (const order of orders) {
    if (Object.prototype.hasOwnProperty.call(grouped, order.status)) {
      grouped[order.status as KitchenStage].push(order);
    }
  }
  for (const status of KITCHEN_STAGES) {
    grouped[status].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    );
  }
  return grouped;
}

export function kitchenOrderAgeMinutes(
  createdAt: string,
  now = new Date(),
): number {
  const difference = now.getTime() - Date.parse(createdAt);
  if (!Number.isFinite(difference)) return 0;
  return Math.max(0, Math.floor(difference / 60_000));
}

export function kitchenOrderIsDelayed(
  order: Pick<KitchenOrder, "status" | "created_at">,
  now = new Date(),
  thresholdMinutes = 20,
): boolean {
  return (
    ["pending", "confirmed", "preparing"].includes(order.status) &&
    kitchenOrderAgeMinutes(order.created_at, now) >= thresholdMinutes
  );
}
