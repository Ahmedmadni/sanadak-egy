import { useEffect, useState } from "react";
import { Moon, Sun, Globe, ShoppingCart, Volume2, VolumeX, Menu, X } from "lucide-react";
import logo from "@/assets/sanadak-logo.png";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx, setSoundEnabled } from "@/lib/sanadak-sounds";

export function Nav() {
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { lang, setLang, t, cart, bookings, setCartOpen, setMerchantOpen, sound, setSound } = useSanadak();
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => { setSoundEnabled(sound); }, [sound]);

  const badge = cart.reduce((s, i) => s + i.qty, 0) + bookings.length;

  const links: Array<[string, string]> = [
    ["#restaurants", "nav_food"],
    ["#cafes", "nav_cafes"],
    ["#shops", "nav_shops"],
    ["#halls", "nav_halls"],
    ["#super", "nav_super"],
    ["#pharmacy", "nav_pharmacy"],
    ["#medical", "nav_health"],
  ];

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-3">
      <nav className="glass-panel rounded-full px-3 py-2 flex items-center gap-2 w-full max-w-5xl">
        <a href="#" className="flex items-center gap-2 ps-2 pe-2">
          <img src={logo} alt="Sanadak" className="h-7 w-7 rounded-md object-contain" />
          <span className="font-semibold tracking-tight text-sm">Sanadak</span>
          <span className="font-arabic text-sm text-muted-foreground hidden sm:inline">سندك</span>
        </a>
        <div className="hidden lg:flex items-center gap-0.5 text-xs text-muted-foreground mx-auto">
          {links.map(([href, k]) => (
            <a key={href} href={href} onClick={() => sfx.tap()} className={`px-2.5 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors ${lang === "ar" ? "font-arabic" : ""}`}>
              {t(k)}
            </a>
          ))}
          <button onClick={() => { setMerchantOpen(true); sfx.open(); }} className={`px-2.5 py-1.5 rounded-full text-[var(--emerald)] hover:bg-[var(--emerald)]/10 transition-colors ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("nav_merchant")}
          </button>
        </div>
        <div className="ms-auto flex items-center gap-1">
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
          <button aria-label="Theme" onClick={() => setDark(!dark)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setMobile(!mobile)} className="lg:hidden h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5">
            {mobile ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <a href="#categories" onClick={() => sfx.tap()} className={`hidden sm:grid bg-gradient-brand text-primary-foreground text-sm font-medium px-4 h-9 rounded-full place-items-center shadow-glow hover:opacity-95 ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("cta_start")}
          </a>
        </div>
      </nav>
      {mobile && (
        <div className="lg:hidden absolute top-16 left-3 right-3 glass-panel rounded-2xl p-3 flex flex-col gap-1 text-sm">
          {links.map(([href, k]) => (
            <a key={href} href={href} onClick={() => { setMobile(false); sfx.tap(); }} className={`px-3 py-2 rounded-lg hover:bg-foreground/5 ${lang === "ar" ? "font-arabic" : ""}`}>{t(k)}</a>
          ))}
          <button onClick={() => { setMerchantOpen(true); setMobile(false); }} className={`text-start px-3 py-2 rounded-lg text-[var(--emerald)] hover:bg-[var(--emerald)]/10 ${lang === "ar" ? "font-arabic" : ""}`}>{t("nav_merchant")}</button>
        </div>
      )}
    </header>
  );
}
