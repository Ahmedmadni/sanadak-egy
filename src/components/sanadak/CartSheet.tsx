import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSanadak } from "@/lib/sanadak-context";
import { ShoppingBag, Calendar, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { openWhatsApp, generateSerial } from "@/lib/whatsapp";
import { sfx } from "@/lib/sanadak-sounds";

export function CartSheet() {
  const { cartOpen, setCartOpen, cart, removeFromCart, clearCart, bookings, cancelBooking, t, lang, dir, customer, setCustomer } = useSanadak();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const checkout = () => {
    if (!customer.name || !customer.phone) {
      sfx.error();
      toast.error(t("needs_info"));
      return;
    }
    const serial = generateSerial("SND");
    const lines = cart.map((i) =>
      `${i.name}${i.variant ? ` (${i.variant})` : ""}${i.store ? ` — ${i.store}` : ""} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} ${t("sar")}`
    );
    openWhatsApp({
      type: "order",
      serial,
      customer,
      lines,
      total: `${total.toLocaleString()} ${t("sar")}`,
      totalLabel: t("total"),
    }, lang);
    sfx.success();
    toast.success(`${t("submitted")} · ${serial}`);
    clearCart();
    setCartOpen(false);
  };

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className={lang === "ar" ? "font-arabic text-2xl" : "text-2xl"}>{t("cart")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1">
          <div>
            <div className={`flex items-center gap-2 text-sm font-medium mb-3 ${lang === "ar" ? "font-arabic" : ""}`}>
              <ShoppingBag className="h-4 w-4 text-[var(--emerald)]" /> {t("cart")}
            </div>
            {cart.length === 0 ? (
              <p className={`text-sm text-muted-foreground py-6 text-center ${lang === "ar" ? "font-arabic" : ""}`}>{t("cart_empty")}</p>
            ) : (
              <div className="space-y-2">
                {cart.map((i) => (
                  <div key={`${i.id}-${i.variant ?? ""}`} className="flex items-center gap-3 glass-panel rounded-2xl p-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground text-xs font-bold">{i.qty}×</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${lang === "ar" ? "font-arabic" : ""}`}>{i.name}</div>
                      <div className={`text-xs text-muted-foreground truncate ${lang === "ar" ? "font-arabic" : ""}`}>
                        {i.store ? `${i.store} · ` : ""}{i.variant ? `${i.variant} · ` : ""}{(i.price * i.qty).toLocaleString()} {t("sar")}
                      </div>
                    </div>
                    <button onClick={() => { removeFromCart(i.id, i.variant); sfx.tap(); }} className="h-8 w-8 grid place-items-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className={`flex items-center gap-2 text-sm font-medium mb-3 ${lang === "ar" ? "font-arabic" : ""}`}>
              <Calendar className="h-4 w-4 text-[var(--emerald)]" /> {t("bookings")}
            </div>
            {bookings.length === 0 ? (
              <p className={`text-sm text-muted-foreground py-6 text-center ${lang === "ar" ? "font-arabic" : ""}`}>{t("no_bookings")}</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="glass-panel rounded-2xl p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground"><Calendar className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${lang === "ar" ? "font-arabic" : ""}`}>{b.title}</div>
                      <div className={`text-xs text-muted-foreground truncate ${lang === "ar" ? "font-arabic" : ""}`}>
                        {b.subtitle}{b.day ? ` · ${b.day}` : ""}{b.time ? ` · ${b.time}` : ""}
                      </div>
                      <div className="text-[10px] text-[var(--emerald)] font-mono mt-0.5">{b.serial}</div>
                    </div>
                    <button onClick={() => cancelBooking(b.id)} className={`text-xs text-muted-foreground hover:text-destructive ${lang === "ar" ? "font-arabic" : ""}`}>{t("cancel")}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div>
              <div className={`text-sm font-medium mb-3 ${lang === "ar" ? "font-arabic" : ""}`}>{t("customer_info")}</div>
              <div className="grid gap-2">
                <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder={t("name_placeholder")} className="h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
                <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder={t("phone_placeholder")} dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
                <input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder={t("address_placeholder")} className="h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
              </div>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-foreground/10 pt-4 mt-4 space-y-3">
            <div className={`flex items-center justify-between font-medium ${lang === "ar" ? "font-arabic" : ""}`}>
              <span>{t("total")}</span>
              <span>{total.toLocaleString()} {t("sar")}</span>
            </div>
            <button
              onClick={checkout}
              className={`w-full bg-[#25D366] text-white h-12 rounded-full font-medium shadow-glow hover:scale-[1.01] transition flex items-center justify-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}
            >
              <MessageCircle className="h-4 w-4" /> {t("checkout")}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
