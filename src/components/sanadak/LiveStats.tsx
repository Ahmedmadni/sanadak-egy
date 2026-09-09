import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { Building2, MapPin, Star } from "lucide-react";

export function LiveStats() {
  const { lang } = useSanadak();
  const [stats, setStats] = useState({ tenants: 0, reviews: 0, avgRating: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: tenants }, { data: reviews }] = await Promise.all([
        supabase.from("tenants" as any).select("id", { count: "exact", head: true }),
        supabase.from("reviews" as any).select("rating").eq("is_approved", true),
      ]);
      const ratings = ((reviews as any[]) ?? []).map((r) => r.rating);
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 4.9;
      setStats({ tenants: tenants ?? 0, reviews: ratings.length, avgRating: Math.round(avg * 10) / 10 });
    })();
  }, []);

  return (
    <aside aria-label={lang === "ar" ? "مؤشرات الثقة" : "Trust indicators"} className={`border-b border-border bg-secondary/50 px-4 py-4 text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-8">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        {lang === "ar" ? `+${Math.max(stats.tenants, 1)} نشاط تجاري منضم` : `${Math.max(stats.tenants, 1)}+ businesses joined`}
      </div>
      <span className="hidden h-3 w-px bg-border sm:block" />
      <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-accent text-accent" />{stats.avgRating} · {lang === "ar" ? `${stats.reviews} تقييم` : `${stats.reviews} reviews`}</div>
      <span className="hidden h-3 w-px bg-border sm:block" />
      <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{lang === "ar" ? "القاهرة · الإسكندرية · الجيزة" : "Cairo · Alexandria · Giza"}</div>
      </div>
    </aside>
  );
}
