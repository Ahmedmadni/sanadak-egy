import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, Globe, ShoppingCart, Volume2, VolumeX, Menu, X, Bot, LogIn, LogOut, ShieldCheck, User } from "lucide-react";
import { Logo } from "./Logo";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx, setSoundEnabled } from "@/lib/sanadak-sounds";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

export function Nav() {
  const [mobile, setMobile] = useState(false);
  const { lang, setLang, t, cart, bookings, setCartOpen, setMerchantOpen, setAssistantOpen, sound, setSound, theme, toggleTheme } = useSanadak();
  const { user, isAdmin, signOut } = useAuth();
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
        <Link to="/" className="flex items-center gap-2 ps-1 pe-2">
          <Logo variant="horizontal" className="h-8 w-auto object-contain hidden sm:block" />
          <Logo variant="icon" className="h-8 w-8 object-contain sm:hidden" />
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
          {isAdmin && (
            <Link to="/admin" onClick={() => sfx.tap()} className={`px-2.5 py-1.5 rounded-full text-[var(--ember)] hover:bg-[var(--ember)]/10 transition-colors inline-flex items-center gap-1 ${lang === "ar" ? "font-arabic" : ""}`}>
              <ShieldCheck className="h-3.5 w-3.5" /> {lang === "ar" ? "إدارة" : "Admin"}
            </Link>
          )}
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
          {user ? (
            <button onClick={async () => { await signOut(); sfx.tap(); toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Signed out"); }} aria-label="Logout" title={user.email ?? ""} className="h-9 px-2.5 rounded-full hover:bg-foreground/5 text-xs font-medium flex items-center gap-1">
              <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">{lang === "ar" ? "خروج" : "Logout"}</span>
            </button>
          ) : (
            <Link to="/auth" onClick={() => sfx.tap()} className="h-9 px-2.5 rounded-full bg-gradient-brand text-primary-foreground text-xs font-semibold flex items-center gap-1 shadow-glow">
              <LogIn className="h-3.5 w-3.5" /><span className="hidden sm:inline">{lang === "ar" ? "دخول" : "Login"}</span>
            </Link>
          )}
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
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobile(false)} className={`px-3 py-2 rounded-lg text-[var(--ember)] hover:bg-[var(--ember)]/10 inline-flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
              <ShieldCheck className="h-4 w-4" /> {lang === "ar" ? "إدارة المتاجر" : "Stores admin"}
            </Link>
          )}
          {!user && (
            <Link to="/auth" onClick={() => setMobile(false)} className={`px-3 py-2 rounded-lg text-foreground hover:bg-foreground/5 inline-flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}>
              <User className="h-4 w-4" /> {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
