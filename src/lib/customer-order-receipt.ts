/** Presentation-only helpers: receipt prices and totals always come from saved server snapshots. */
export function receiptVariantLabels(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value).flatMap((entry) => {
    if (typeof entry === "string") {
      const label = entry.trim();
      return label ? [label.slice(0, 100)] : [];
    }
    if (typeof entry === "number" && Number.isFinite(entry)) return [String(entry)];
    return [];
  }).slice(0, 12);
}

export function canShowMoreOrders(displayedCount: number, pageSize: number): boolean {
  return Number.isInteger(pageSize) && pageSize > 0 && displayedCount === pageSize;
}

export function readableOrderMoney(amount: number, currency: string, language: "ar" | "en"): string {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(language === "ar" ? "ar-EG" : "en-EG")} ${currency}`;
  }
}

export const CUSTOMER_ORDER_STATUS_LABELS: Record<"ar" | "en", Record<string, string>> = {
  ar: {
    pending: "قيد المراجعة", confirmed: "مؤكد", preparing: "جارٍ التجهيز",
    ready: "جاهز", out_for_delivery: "خرج للتوصيل", delivered: "تم التسليم",
    cancelled: "ملغي",
  },
  en: {
    pending: "Pending review", confirmed: "Confirmed", preparing: "Preparing",
    ready: "Ready", out_for_delivery: "Out for delivery", delivered: "Delivered",
    cancelled: "Cancelled",
  },
};

export function isOrderComplete(status: string): boolean {
  return status === "delivered" || status === "cancelled";
}
