import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, Globe, ShoppingCart, Volume2, VolumeX, Menu, X, Bot } from "lucide-react";
import logo from "@/assets/sanadak-logo.png";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx, setSoundEnabled } from "@/lib/sanadak-sounds";

export function Nav() {
  const [mobile, setMobile] = useState(false);
  const { lang, setLang, t, cart, bookings, setCartOpen, setMerchantOpen, setAssistantOpen, sound, setSound, theme, toggleTheme } = useSanadak();
  setSoundEnabled(sound);

  const badge = cart.reduce((s, i) => s + i.qty, 0) + bookings.length;

  const links: Array<[string, string]> = [
    ["/restaurants", "nav_food"],
    ["/cafes", "nav_cafes"],
    ["/shops", "nav_shops"],
    ["/halls", "nav_halls"],
    ["/super", "nav_super"],
    ["/pharmacy", "nav_pharmacy"],
    ["/medical", "nav_health"],
  ];

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-3">
      <nav className="glass-panel rounded-full px-3 py-2 flex items-center gap-2 w-full max-w-5xl">
        <Link to="/" className="flex items-center gap-2 ps-2 pe-2">
          <img src={logo} alt="Sanadak" className="h-7 w-7 rounded-md object-contain" />
          <span className="font-semibold tracking-tight text-sm">Sanadak</span>
          <span className="font-arabic text-sm text-muted-foreground hidden sm:inline">سندك</span>
        </Link>
        <div className="hidden lg:flex items-center gap-0.5 text-xs text-muted-foreground mx-auto">
          {links.map(([to, k]) => (
            <Link key={to} to={to} onClick={() => sfx.tap()} activeProps={{ className: "text-foreground bg-foreground/5" }} className={`px-2.5 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors ${lang === "ar" ? "font-arabic" : ""}`}>
              {t(k)}
            </Link>
          ))}
          <button onClick={() => { setMerchantOpen(true); sfx.open(); }} className={`px-2.5 py-1.5 rounded-full text-[var(--emerald)] hover:bg-[var(--emerald)]/10 transition-colors ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("nav_merchant")}
          </button>
        </div>
        <div className="ms-auto flex items-center gap-1">
          <button onClick={() => { setAssistantOpen(true); sfx.open(); }} aria-label={t("open_assistant")} title={t("open_assistant")} className="hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-foreground/5 text-[var(--emerald)]">
            <Bot className="h-4 w-4" />
          </button>
          <button onClick={() => { setSound(!sound); sfx.tap(); }} aria-label="Sound" title={sound ? t("sound_on") : t("sound_off")} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5">
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={() => { setCartOpen(true); sfx.open(); }} aria-label="Cart" className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5">
            <ShoppingCart className="h-4 w-4" />
            {badge > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-[var(--ember)] text-[10px] font-bold text-white grid place-items-center">{badge}</span>}
          </button>
          <button onClick={() => { setLang(lang === "ar" ? "en" : "ar"); sfx.tap(); }} aria-label="Language" className="h-9 px-2.5 rounded-full hover:bg-foreground/5 text-xs font-semibold flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />{lang === "ar" ? "EN" : "ع"}
          </button>
          <button aria-label="Theme" onClick={() => { toggleTheme(); sfx.tap(); }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobile(!mobile)} className="lg:hidden h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5">
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>
      {mobile && (
        <div className="lg:hidden absolute top-16 left-3 right-3 glass-panel rounded-2xl p-3 flex flex-col gap-1 text-sm">
          {links.map(([to, k]) => (
            <Link key={to} to={to} onClick={() => { setMobile(false); sfx.tap(); }} className={`px-3 py-2 rounded-lg hover:bg-foreground/5 ${lang === "ar" ? "font-arabic" : ""}`}>{t(k)}</Link>
          ))}
          <button onClick={() => { setMerchantOpen(true); setMobile(false); }} className={`text-start px-3 py-2 rounded-lg text-[var(--emerald)] hover:bg-[var(--emerald)]/10 ${lang === "ar" ? "font-arabic" : ""}`}>{t("nav_merchant")}</button>
        </div>
      )}
    </header>
  );
}
