import { KITCHEN_TRANSITIONS } from "@/lib/kitchen-board";

export type MerchantOrderFilter = "all" | "active" | "delivered" | "cancelled";

export const ACTIVE_ORDER_STATUSES = [
  "pending", "confirmed", "preparing", "ready", "out_for_delivery",
] as const;

export function merchantOrderFilterStatuses(filter: MerchantOrderFilter): string[] | null {
  if (filter === "active") return [...ACTIVE_ORDER_STATUSES];
  if (filter === "delivered" || filter === "cancelled") return [filter];
  return null;
}

export function canChangeMerchantOrderStatus(current: string, next: string): boolean {
  return (KITCHEN_TRANSITIONS[current] ?? []).includes(next);
}

export const ORDER_STATUS_LABELS: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    pending: "جديد", confirmed: "مؤكد", preparing: "قيد التحضير",
    ready: "جاهز", out_for_delivery: "خرج للتوصيل",
    delivered: "تم التسليم", cancelled: "ملغي",
  },
  en: {
    pending: "New", confirmed: "Confirmed", preparing: "Preparing",
    ready: "Ready", out_for_delivery: "Out for delivery",
    delivered: "Delivered", cancelled: "Cancelled",
  },
};

export const PAYMENT_LABELS: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    pending: "الدفع قيد الانتظار", paid: "تم تسجيل الدفع",
    failed: "فشل الدفع", refunded: "مسترد", unpaid: "غير مدفوع",
  },
  en: {
    pending: "Payment pending", paid: "Payment recorded",
    failed: "Payment failed", refunded: "Refunded", unpaid: "Unpaid",
  },
};
