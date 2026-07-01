import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";

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
    <div className={`mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--ember)]" />
        {lang === "ar" ? `+${Math.max(stats.tenants, 1)} نشاط تجاري منضم` : `${Math.max(stats.tenants, 1)}+ businesses joined`}
      </div>
      <div className="h-3 w-px bg-foreground/10" />
      <div>{stats.avgRating} · {lang === "ar" ? `${stats.reviews} تقييم` : `${stats.reviews} reviews`}</div>
      <div className="h-3 w-px bg-foreground/10 hidden sm:block" />
      <div className="hidden sm:block">{lang === "ar" ? "القاهرة · الإسكندرية · الجيزة" : "Cairo · Alexandria · Giza"}</div>
    </div>
  );
}
