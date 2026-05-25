import { useEffect, useState } from "react";
import { Moon, Sun, Globe } from "lucide-react";
import logo from "@/assets/sanadak-logo.png";

export function Nav() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
      <nav className="glass-panel rounded-full px-3 py-2 flex items-center gap-2 w-full max-w-3xl">
        <a href="#" className="flex items-center gap-2 pl-2 pr-3">
          <img src={logo} alt="Sanadak" className="h-7 w-7 rounded-md object-contain" />
          <span className="font-semibold tracking-tight text-sm">Sanadak</span>
          <span className="font-arabic text-sm text-muted-foreground hidden sm:inline">سندك</span>
        </a>
        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground mx-auto">
          {["Services", "Food", "Health", "Shopping", "Track"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} className="px-3 py-1.5 rounded-full hover:text-foreground hover:bg-foreground/5 transition-colors">{l}</a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button aria-label="Language" className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5 transition-colors">
            <Globe className="h-4 w-4" />
          </button>
          <button aria-label="Theme" onClick={() => setDark(!dark)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5 transition-colors">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a href="#start" className="bg-gradient-brand text-primary-foreground text-sm font-medium px-4 h-9 rounded-full grid place-items-center shadow-glow hover:opacity-95 transition">
            ابدأ
          </a>
        </div>
      </nav>
    </header>
  );
}
