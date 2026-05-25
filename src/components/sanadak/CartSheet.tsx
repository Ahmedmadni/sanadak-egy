import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSanadak } from "@/lib/sanadak-context";
import { ShoppingBag, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function CartSheet() {
  const { cartOpen, setCartOpen, cart, removeFromCart, clearCart, bookings, cancelBooking, t, lang, dir } = useSanadak();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className={lang === "ar" ? "font-arabic text-2xl" : "text-2xl"}>{t("cart")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <ShoppingBag className="h-4 w-4 text-[var(--emerald)]" /> {t("cart")}
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("cart_empty")}</p>
            ) : (
              <div className="space-y-2">
                {cart.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 glass-panel rounded-2xl p-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground text-xs font-bold">{i.qty}×</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">{(i.price * i.qty).toLocaleString()} {t("sar")}</div>
                    </div>
                    <button onClick={() => removeFromCart(i.id)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-3">
              <Calendar className="h-4 w-4 text-[var(--emerald)]" /> {t("bookings")}
            </div>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("no_bookings")}</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="glass-panel rounded-2xl p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground"><Calendar className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{b.doctor}</div>
                      <div className="text-xs text-muted-foreground">{b.specialty} · {b.day} · {b.time}</div>
                    </div>
                    <button onClick={() => cancelBooking(b.id)} className="text-xs text-muted-foreground hover:text-destructive">{t("cancel")}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="border-t border-foreground/10 pt-4 mt-4 space-y-3">
            <div className="flex items-center justify-between font-medium">
              <span>{t("total")}</span>
              <span>{total.toLocaleString()} {t("sar")}</span>
            </div>
            <button
              onClick={() => { toast.success(t("submitted")); clearCart(); setCartOpen(false); }}
              className="w-full bg-gradient-brand text-primary-foreground h-12 rounded-full font-medium shadow-glow"
            >
              {t("checkout")}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
