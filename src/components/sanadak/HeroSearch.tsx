import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

export function HeroSearch() {
  const { lang, dir } = useSanadak();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    sfx.tap();
    navigate({ to: "/search", search: { q } });
  };

  return (
    <form onSubmit={submit} className="relative z-10 mt-8 w-full max-w-xl mx-auto">
      <Search className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "right-5" : "left-5"} h-4 w-4 text-muted-foreground`} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={lang === "ar" ? "ابحث عن مطعم، عيادة، صالون، متجر..." : "Search restaurants, clinics, salons, shops..."}
        className={`w-full h-14 rounded-full glass-panel shadow-glow ${dir === "rtl" ? "pr-12 pl-32" : "pl-12 pr-32"} text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/40 ${lang === "ar" ? "font-arabic" : ""}`}
      />
      <button type="submit" className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "left-1.5" : "right-1.5"} h-11 px-5 rounded-full bg-gradient-brand text-primary-foreground text-sm font-medium shadow-glow ${lang === "ar" ? "font-arabic" : ""}`}>
        {lang === "ar" ? "بحث" : "Search"}
      </button>
    </form>
  );
}
