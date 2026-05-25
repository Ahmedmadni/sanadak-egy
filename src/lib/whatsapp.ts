// WhatsApp booking helper — opens wa.me with a localized order message
// Uses the master merchant number 01120016502 (Egypt) for all bookings.

export const MERCHANT_PHONE = "201120016502"; // intl format for wa.me
export const MERCHANT_LOCAL = "01120016502";

let counter = 0;
function pad(n: number, w: number) {
  return n.toString().padStart(w, "0");
}

export function generateSerial(prefix = "SND") {
  counter = (counter + 1) % 1000;
  const d = new Date();
  const stamp = `${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}${pad(d.getHours(), 2)}${pad(d.getMinutes(), 2)}`;
  const rand = Math.floor(Math.random() * 90 + 10);
  return `${prefix}-${stamp}-${rand}${pad(counter, 3)}`;
}

export type WaOrder = {
  type: "order" | "booking" | "reservation" | "merchant";
  serial: string;
  storeName?: string;
  customer?: { name?: string; phone?: string; address?: string };
  lines: string[]; // human-readable lines for the body
  totalLabel?: string;
  total?: string;
  notes?: string;
};

const titles = {
  ar: {
    order: "طلب جديد عبر سندك",
    booking: "حجز جديد عبر سندك",
    reservation: "حجز قاعة عبر سندك",
    merchant: "طلب إضافة متجر إلى سندك",
    serial: "رقم الطلب",
    store: "المتجر / النشاط",
    customer: "العميل",
    items: "التفاصيل",
    total: "الإجمالي",
    notes: "ملاحظات",
    sent_from: "تم الإرسال من موقع سندك Sanadak",
  },
  en: {
    order: "New order via Sanadak",
    booking: "New booking via Sanadak",
    reservation: "Hall reservation via Sanadak",
    merchant: "New merchant request",
    serial: "Order No.",
    store: "Store / Business",
    customer: "Customer",
    items: "Details",
    total: "Total",
    notes: "Notes",
    sent_from: "Sent from Sanadak website",
  },
};

export function buildWaMessage(o: WaOrder, lang: "ar" | "en" = "ar") {
  const tr = titles[lang];
  const head =
    o.type === "order" ? tr.order : o.type === "booking" ? tr.booking : o.type === "reservation" ? tr.reservation : tr.merchant;
  const parts: string[] = [];
  parts.push(`🟢 *${head}*`);
  parts.push(`${tr.serial}: *${o.serial}*`);
  if (o.storeName) parts.push(`${tr.store}: ${o.storeName}`);
  if (o.customer && (o.customer.name || o.customer.phone || o.customer.address)) {
    const c = [o.customer.name, o.customer.phone, o.customer.address].filter(Boolean).join(" · ");
    parts.push(`${tr.customer}: ${c}`);
  }
  if (o.lines.length) {
    parts.push("");
    parts.push(`*${tr.items}:*`);
    o.lines.forEach((l) => parts.push(`• ${l}`));
  }
  if (o.total) {
    parts.push("");
    parts.push(`*${o.totalLabel ?? tr.total}:* ${o.total}`);
  }
  if (o.notes) parts.push(`${tr.notes}: ${o.notes}`);
  parts.push("");
  parts.push(`— ${tr.sent_from}`);
  return parts.join("\n");
}

export function openWhatsApp(o: WaOrder, lang: "ar" | "en" = "ar") {
  const text = encodeURIComponent(buildWaMessage(o, lang));
  const url = `https://wa.me/${MERCHANT_PHONE}?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
