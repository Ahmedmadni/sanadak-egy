import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CheckCircle2,
  LoaderCircle,
  Minus,
  PackageOpen,
  Plus,
  Send,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Customer } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type StoreOrderItem = Pick<
  Tables<"catalog_items">,
  "id" | "name" | "price" | "currency" | "image_url" | "stock" | "variants"
>;

type CartLine = Omit<StoreOrderItem, "variants"> & {
  qty: number;
  variant: string | null;
};

type OrderResult = {
  order_id: string;
  serial_no: number;
  subtotal: number;
  total: number;
  currency: string;
};

type Props = {
  tenantId: string;
  tenantName: string;
  items: StoreOrderItem[];
  selectedItem: StoreOrderItem | null;
  customer: Customer;
  lang: "ar" | "en";
  dir: "rtl" | "ltr";
  onCustomerChange: (customer: Customer) => void;
  onCloseItem: () => void;
};

function variantOptions(value: StoreOrderItem["variants"]) {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      if (typeof option === "string") return option.trim();
      if (
        option &&
        typeof option === "object" &&
        !Array.isArray(option) &&
        typeof option.label === "string"
      ) {
        return option.label.trim();
      }
      return "";
    })
    .filter(Boolean);
}

function lineKey(itemId: string, variant: string | null) {
  return `${itemId}::${variant ?? ""}`;
}

function isSavedLine(value: unknown): value is Pick<CartLine, "id" | "qty" | "variant"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.id === "string" &&
    typeof line.qty === "number" &&
    Number.isInteger(line.qty) &&
    line.qty > 0 &&
    line.qty <= 99 &&
    (line.variant === null || typeof line.variant === "string")
  );
}

function money(value: number, currency: string, lang: "ar" | "en") {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

export function StoreCartCheckout({
  tenantId,
  tenantName,
  items,
  selectedItem,
  customer,
  lang,
  dir,
  onCustomerChange,
  onCloseItem,
}: Props) {
  const arabic = lang === "ar";
  const reduceMotion = useReducedMotion();
  const storageKey = `sanadak-store-cart:${tenantId}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);

  const variants = useMemo(
    () => (selectedItem ? variantOptions(selectedItem.variants) : []),
    [selectedItem],
  );

  useEffect(() => {
    if (!selectedItem) return;
    const options = variantOptions(selectedItem.variants);
    setSelectedVariant(options[0] ?? null);
    setQuantity(1);
  }, [selectedItem]);

  useEffect(() => {
    const catalog = new Map(items.map((item) => [item.id, item]));
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (Array.isArray(saved)) {
        const restoredQuantity = new Map<string, number>();
        setCart(
          saved
            .filter(isSavedLine)
            .slice(0, 50)
            .flatMap((line) => {
              const item = catalog.get(line.id);
              if (!item || item.stock === 0) return [];
              const validVariants = variantOptions(item.variants);
              if (
                validVariants.length &&
                (!line.variant || !validVariants.includes(line.variant))
              ) {
                return [];
              }
              const alreadyRestored = restoredQuantity.get(item.id) ?? 0;
              const qty = Math.min(line.qty, Math.max(0, (item.stock ?? 99) - alreadyRestored), 99);
              if (qty < 1) return [];
              restoredQuantity.set(item.id, alreadyRestored + qty);
              const { variants: _variants, ...cartItem } = item;
              return [{ ...cartItem, qty, variant: validVariants.length ? line.variant : null }];
            }),
        );
      }
    } catch {
      localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, [items, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      storageKey,
      JSON.stringify(cart.map(({ id, qty, variant }) => ({ id, qty, variant }))),
    );
  }, [cart, hydrated, storageKey]);

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const total = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const currency = cart[0]?.currency ?? selectedItem?.currency ?? "EGP";
  const selectedInCart = selectedItem
    ? cart.reduce((sum, line) => sum + (line.id === selectedItem.id ? line.qty : 0), 0)
    : 0;
  const maxAddQuantity = selectedItem
    ? Math.max(0, Math.min(99, (selectedItem.stock ?? 99) - selectedInCart))
    : 0;

  const addSelected = () => {
    if (!selectedItem || maxAddQuantity < 1) return;
    if (variants.length && !selectedVariant) {
      toast.error(arabic ? "اختر النوع أولًا" : "Choose an option first");
      return;
    }
    if (cart.length && cart[0].currency !== selectedItem.currency) {
      toast.error(
        arabic
          ? "لا يمكن جمع عملات مختلفة في طلب واحد"
          : "Different currencies cannot share one order",
      );
      return;
    }
    const key = lineKey(selectedItem.id, selectedVariant);
    const existing = cart.some((line) => lineKey(line.id, line.variant) === key);
    if (!existing && cart.length >= 50) {
      toast.error(
        arabic
          ? "الطلب الواحد يقبل 50 اختيارًا كحد أقصى"
          : "One order supports up to 50 selections",
      );
      return;
    }
    const qtyToAdd = Math.min(quantity, maxAddQuantity);
    setCart((current) => {
      const currentLine = current.find((line) => lineKey(line.id, line.variant) === key);
      if (currentLine) {
        return current.map((line) =>
          lineKey(line.id, line.variant) === key
            ? { ...line, qty: Math.min(99, line.qty + qtyToAdd) }
            : line,
        );
      }
      const { variants: _variants, ...item } = selectedItem;
      return [...current, { ...item, qty: qtyToAdd, variant: selectedVariant }];
    });
    sfx.add();
    toast.success(arabic ? "أضيف إلى السلة" : "Added to cart");
    onCloseItem();
  };

  const changeQuantity = (key: string, delta: number) => {
    setCart((current) => {
      const target = current.find((line) => lineKey(line.id, line.variant) === key);
      if (!target) return current;
      const itemTotal = current.reduce(
        (sum, line) => sum + (line.id === target.id ? line.qty : 0),
        0,
      );
      const max = Math.min(99, target.stock ?? 99);
      if (delta > 0 && itemTotal >= max) {
        toast.error(arabic ? "وصلت للكمية المتاحة" : "Available quantity reached");
        return current;
      }
      return current.flatMap((line) => {
        if (lineKey(line.id, line.variant) !== key) return [line];
        const qty = line.qty + delta;
        return qty > 0 ? [{ ...line, qty }] : [];
      });
    });
    sfx.tap();
  };

  const removeLine = (key: string) => {
    setCart((current) => current.filter((line) => lineKey(line.id, line.variant) !== key));
    sfx.tap();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cart.length) return;
    if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error(arabic ? "أدخل الاسم ورقم الهاتف" : "Enter your name and phone number");
      return;
    }
    if (deliveryType === "delivery" && !customer.address.trim()) {
      toast.error(arabic ? "أدخل عنوان التوصيل" : "Enter the delivery address");
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("create_order", {
        _tenant: tenantId,
        _items: cart.map((line) => ({
          item_id: line.id,
          qty: line.qty,
          variants: line.variant ? { selection: line.variant } : {},
        })),
        _customer_name: customer.name.trim(),
        _customer_phone: customer.phone.trim(),
        _customer_address: deliveryType === "delivery" ? customer.address.trim() : undefined,
        _delivery_type: deliveryType,
        _notes: notes.trim() || undefined,
      });
      if (error) throw error;
      const receipt = data?.[0];
      if (!receipt) throw new Error("Order receipt was not returned");
      setResult(receipt);
      setCart([]);
      setNotes("");
      sfx.success();
      toast.success(arabic ? "تم إرسال طلبك" : "Order sent");
    } catch (error) {
      sfx.error();
      toast.error(
        (error as Error).message || (arabic ? "تعذر إرسال الطلب" : "Could not send order"),
      );
    } finally {
      setBusy(false);
    }
  };

  const closeCart = () => {
    setCartOpen(false);
    window.setTimeout(() => setResult(null), reduceMotion ? 0 : 250);
  };

  return (
    <>
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onCloseItem}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-item-title"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(event) => event.stopPropagation()}
            className="glass-card w-full max-w-md rounded-3xl p-5 shadow-float sm:p-6"
          >
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-brand text-primary-foreground">
                {selectedItem.image_url ? (
                  <img src={selectedItem.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ShoppingBag className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="store-item-title"
                  className={`text-lg font-bold ${arabic ? "font-arabic" : ""}`}
                >
                  {selectedItem.name}
                </h2>
                <p className="mt-1 font-semibold text-[var(--emerald)]">
                  {money(selectedItem.price, selectedItem.currency, lang)}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseItem}
                aria-label={arabic ? "إغلاق" : "Close"}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {variants.length > 0 && (
              <div className="mt-6">
                <div className={`mb-2 text-sm font-medium ${arabic ? "font-arabic" : ""}`}>
                  {arabic ? "اختر النوع" : "Choose an option"}
                </div>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        selectedVariant === variant
                          ? "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]"
                          : "border-foreground/10 hover:border-foreground/25"
                      }`}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-foreground/[0.04] p-3">
              <span className={`text-sm font-medium ${arabic ? "font-arabic" : ""}`}>
                {arabic ? "الكمية" : "Quantity"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  aria-label={arabic ? "تقليل الكمية" : "Decrease quantity"}
                  className="grid h-9 w-9 place-items-center rounded-full border border-foreground/10 disabled:opacity-35"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <strong className="w-6 text-center" dir="ltr">
                  {quantity}
                </strong>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(maxAddQuantity, value + 1))}
                  disabled={quantity >= maxAddQuantity}
                  aria-label={arabic ? "زيادة الكمية" : "Increase quantity"}
                  className="grid h-9 w-9 place-items-center rounded-full border border-foreground/10 disabled:opacity-35"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {maxAddQuantity < 1 ? (
              <p
                className={`mt-5 text-center text-sm text-muted-foreground ${arabic ? "font-arabic" : ""}`}
              >
                {arabic
                  ? "أضفت كل الكمية المتاحة إلى السلة."
                  : "All available quantity is already in your cart."}
              </p>
            ) : (
              <button
                type="button"
                onClick={addSelected}
                className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-brand font-medium text-primary-foreground shadow-glow ${arabic ? "font-arabic" : ""}`}
              >
                <ShoppingBag className="h-4 w-4" />
                {arabic ? "أضف إلى السلة" : "Add to cart"}
                <span className="opacity-80">
                  · {money(selectedItem.price * quantity, selectedItem.currency, lang)}
                </span>
              </button>
            )}
          </motion.div>
        </div>
      )}

      {itemCount > 0 && (
        <motion.button
          type="button"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setCartOpen(true)}
          className={`fixed bottom-5 left-1/2 z-40 flex h-14 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-foreground px-5 text-background shadow-float transition hover:scale-[1.01] sm:bottom-7 ${arabic ? "font-arabic" : ""}`}
        >
          <span className="flex items-center gap-2 font-medium">
            <span
              className="grid h-8 min-w-8 place-items-center rounded-full bg-background/15 px-2"
              dir="ltr"
            >
              {itemCount}
            </span>
            {arabic ? "عرض السلة" : "View cart"}
          </span>
          <strong>{money(total, currency, lang)}</strong>
        </motion.button>
      )}

      <Sheet open={cartOpen} onOpenChange={(open) => (open ? setCartOpen(true) : closeCart())}>
        <SheetContent
          side={dir === "rtl" ? "left" : "right"}
          className="flex w-full flex-col p-0 sm:max-w-lg"
        >
          {result ? (
            <div className="grid min-h-full place-items-center overflow-y-auto p-6 text-center">
              <div className="w-full max-w-sm">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--emerald)]/12 text-[var(--emerald)]">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className={`mt-5 text-2xl font-bold ${arabic ? "font-arabic" : ""}`}>
                  {arabic ? "تم استلام طلبك" : "Your order is in"}
                </h2>
                <p
                  className={`mt-2 text-sm leading-6 text-muted-foreground ${arabic ? "font-arabic" : ""}`}
                >
                  {arabic
                    ? `تم إرسال الطلب إلى ${tenantName} وسيتم التواصل معك للتأكيد.`
                    : `${tenantName} received the order and will contact you to confirm.`}
                </p>
                <div className="mt-6 rounded-3xl border border-[var(--emerald)]/20 bg-[var(--emerald)]/5 p-5 text-start">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">
                      {arabic ? "رقم الطلب" : "Order number"}
                    </span>
                    <strong dir="ltr" className="text-lg">
                      #{result.serial_no}
                    </strong>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 border-t border-[var(--emerald)]/15 pt-3">
                    <span className="text-xs text-muted-foreground">
                      {arabic ? "الإجمالي" : "Total"}
                    </span>
                    <strong>{money(result.total, result.currency, lang)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCart}
                  className={`mt-6 h-12 w-full rounded-full bg-gradient-brand font-medium text-primary-foreground shadow-glow ${arabic ? "font-arabic" : ""}`}
                >
                  {arabic ? "تم" : "Done"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <SheetHeader className="border-b border-foreground/10 px-5 py-5 text-start sm:px-6">
                <SheetTitle
                  className={`flex items-center gap-2 text-xl ${arabic ? "font-arabic" : ""}`}
                >
                  <ShoppingBag className="h-5 w-5 text-[var(--emerald)]" />
                  {arabic ? "سلة الطلب" : "Your cart"}
                </SheetTitle>
                <SheetDescription className={arabic ? "font-arabic" : ""}>
                  {tenantName} · {itemCount} {arabic ? "قطعة" : itemCount === 1 ? "item" : "items"}
                </SheetDescription>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6">
                {cart.length === 0 ? (
                  <div className="grid place-items-center py-16 text-center">
                    <PackageOpen className="h-10 w-10 text-muted-foreground" />
                    <p
                      className={`mt-3 text-sm text-muted-foreground ${arabic ? "font-arabic" : ""}`}
                    >
                      {arabic ? "السلة فارغة" : "Your cart is empty"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((line) => {
                      const key = lineKey(line.id, line.variant);
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 rounded-2xl border border-foreground/10 p-3"
                        >
                          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-brand text-primary-foreground">
                            {line.image_url ? (
                              <img
                                src={line.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ShoppingBag className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate text-sm font-semibold ${arabic ? "font-arabic" : ""}`}
                            >
                              {line.name}
                            </div>
                            <div
                              className={`mt-0.5 truncate text-xs text-muted-foreground ${arabic ? "font-arabic" : ""}`}
                            >
                              {line.variant ? `${line.variant} · ` : ""}
                              {money(line.price * line.qty, line.currency, lang)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 rounded-full bg-foreground/[0.04] p-1">
                            <button
                              type="button"
                              onClick={() => changeQuantity(key, -1)}
                              aria-label={arabic ? "تقليل" : "Decrease"}
                              className="grid h-7 w-7 place-items-center rounded-full hover:bg-background"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium" dir="ltr">
                              {line.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(key, 1)}
                              aria-label={arabic ? "زيادة" : "Increase"}
                              className="grid h-7 w-7 place-items-center rounded-full hover:bg-background"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(key)}
                            aria-label={arabic ? "حذف" : "Remove"}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {cart.length > 0 && (
                  <>
                    <section>
                      <h3 className={`text-sm font-semibold ${arabic ? "font-arabic" : ""}`}>
                        {arabic ? "طريقة الاستلام" : "Fulfilment"}
                      </h3>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          {
                            value: "pickup" as const,
                            label: arabic ? "استلام" : "Pickup",
                            Icon: Store,
                          },
                          {
                            value: "delivery" as const,
                            label: arabic ? "توصيل" : "Delivery",
                            Icon: Truck,
                          },
                        ].map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDeliveryType(value)}
                            className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${deliveryType === value ? "border-[var(--emerald)] bg-[var(--emerald)]/10 text-[var(--emerald)]" : "border-foreground/10"}`}
                          >
                            <Icon className="h-4 w-4" /> {label}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className={`text-sm font-semibold ${arabic ? "font-arabic" : ""}`}>
                        {arabic ? "بيانات التواصل" : "Contact details"}
                      </h3>
                      <div className="mt-3 grid gap-3">
                        <input
                          required
                          maxLength={200}
                          value={customer.name}
                          onChange={(event) =>
                            onCustomerChange({ ...customer, name: event.target.value })
                          }
                          placeholder={arabic ? "الاسم" : "Name"}
                          className="h-11 rounded-xl border border-input bg-background px-4 text-sm"
                        />
                        <input
                          required
                          maxLength={40}
                          value={customer.phone}
                          onChange={(event) =>
                            onCustomerChange({ ...customer, phone: event.target.value })
                          }
                          placeholder={arabic ? "رقم الهاتف" : "Phone number"}
                          dir="ltr"
                          className="h-11 rounded-xl border border-input bg-background px-4 text-sm"
                        />
                        {deliveryType === "delivery" && (
                          <input
                            required
                            maxLength={500}
                            value={customer.address}
                            onChange={(event) =>
                              onCustomerChange({ ...customer, address: event.target.value })
                            }
                            placeholder={
                              arabic ? "عنوان التوصيل بالتفصيل" : "Full delivery address"
                            }
                            className="h-11 rounded-xl border border-input bg-background px-4 text-sm"
                          />
                        )}
                        <textarea
                          maxLength={2000}
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder={
                            arabic ? "ملاحظات للطلب (اختياري)" : "Order notes (optional)"
                          }
                          rows={3}
                          className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm"
                        />
                      </div>
                    </section>
                  </>
                )}
              </div>

              {cart.length > 0 && (
                <footer className="border-t border-foreground/10 bg-background/95 px-5 py-4 backdrop-blur sm:px-6">
                  <div
                    className={`mb-3 flex items-center justify-between ${arabic ? "font-arabic" : ""}`}
                  >
                    <span className="text-sm text-muted-foreground">
                      {arabic ? "الإجمالي" : "Total"}
                    </span>
                    <strong className="text-lg">{money(total, currency, lang)}</strong>
                  </div>
                  <button
                    disabled={busy}
                    type="submit"
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-brand font-medium text-primary-foreground shadow-glow disabled:opacity-50 ${arabic ? "font-arabic" : ""}`}
                  >
                    {busy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {busy
                      ? arabic
                        ? "جارٍ الإرسال..."
                        : "Sending..."
                      : arabic
                        ? "تأكيد الطلب"
                        : "Place order"}
                  </button>
                </footer>
              )}
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
