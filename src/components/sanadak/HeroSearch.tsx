import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={submit} className="relative z-10 mx-auto mt-8 w-full max-w-2xl px-4 sm:px-0">
      <Search className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "right-9 sm:right-5" : "left-9 sm:left-5"} h-4 w-4 text-hero-muted`} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={lang === "ar" ? "ابحث عن مطعم، عيادة، صالون، متجر..." : "Search restaurants, clinics, salons, shops..."}
        className={`h-14 w-full rounded-full border border-hero-border bg-hero-surface text-hero-foreground shadow-float backdrop-blur-md placeholder:text-hero-muted focus:outline-none focus:ring-2 focus:ring-primary/60 ${dir === "rtl" ? "pr-12 pl-28" : "pl-12 pr-28"} ${lang === "ar" ? "font-arabic" : ""}`}
      />
      <Button type="submit" className={`absolute top-1/2 h-11 -translate-y-1/2 rounded-full px-5 shadow-glow ${dir === "rtl" ? "left-5 sm:left-1.5" : "right-5 sm:right-1.5"} ${lang === "ar" ? "font-arabic" : ""}`}>
        {lang === "ar" ? "بحث" : "Search"}
      </Button>
    </form>
  );
}
