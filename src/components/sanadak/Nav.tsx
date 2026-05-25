import { useEffect, useState } from "react";
import { Moon, Sun, Globe, ShoppingCart } from "lucide-react";
import logo from "@/assets/sanadak-logo.png";
import { useSanadak } from "@/lib/sanadak-context";

export function Nav() {
  const [dark, setDark] = useState(false);
  const { lang, setLang, t, cart, bookings, setCartOpen, setMerchantOpen } = useSanadak();
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const badge = cart.reduce((s, i) => s + i.qty, 0) + bookings.length;

  const links: Array<[string, keyof ReturnType<typeof useSanadak>["t"] extends never ? string : string]> = [
    ["#services", "nav_services"],
    ["#food", "nav_food"],
    ["#health", "nav_health"],
    ["#shopping", "nav_shopping"],
    ["#track", "nav_track"],
  ];

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
      <nav className="glass-panel rounded-full px-3 py-2 flex items-center gap-2 w-full max-w-4xl">
        <a href="#" className="flex items-center gap-2 ps-2 pe-3">
          <img src={logo} alt="Sanadak" className="h-7 w-7 rounded-md object-contain" />
          <span className="font-semibold tracking-tight text-sm">Sanadak</span>
          <span className="font-arabic text-sm text-muted-foreground hidden sm:inline">سندك</span>
        </a>
        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground mx-auto">
          {links.map(([href, k]) => (
            <a key={href} href={href} className={`px-3 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors ${lang === "ar" ? "font-arabic" : ""}`}>
              {t(k as any)}
            </a>
          ))}
          <button onClick={() => setMerchantOpen(true)} className={`px-3 py-1.5 rounded-full text-[var(--emerald)] hover:bg-[var(--emerald)]/10 transition-colors ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("nav_merchant")}
          </button>
        </div>
        <div className="ms-auto flex items-center gap-1">
          <button onClick={() => setCartOpen(true)} aria-label="Cart" className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5 transition-colors">
            <ShoppingCart className="h-4 w-4" />
            {badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[var(--ember)] text-[10px] font-bold text-white grid place-items-center">{badge}</span>
            )}
          </button>
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} aria-label="Language" className="h-9 px-2.5 grid place-items-center rounded-full hover:bg-foreground/5 transition-colors text-xs font-semibold gap-1 flex">
            <Globe className="h-3.5 w-3.5" />
            {lang === "ar" ? "EN" : "ع"}
          </button>
          <button aria-label="Theme" onClick={() => setDark(!dark)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5 transition-colors">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a href="#start" className={`bg-gradient-brand text-primary-foreground text-sm font-medium px-4 h-9 rounded-full grid place-items-center shadow-glow hover:opacity-95 transition ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("cta_start")}
          </a>
        </div>
      </nav>
    </header>
  );
}
