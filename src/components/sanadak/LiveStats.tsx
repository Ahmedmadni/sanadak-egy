import { useEffect, useState } from "react";
import { Building2, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { publicViewsRequired, queryPublicStorefront } from "@/lib/public-storefront";

type TrustStats = { tenants: number | null; reviews: number | null };

export function LiveStats() {
  const { lang } = useSanadak();
  const ar = lang === "ar";
  const [stats, setStats] = useState<TrustStats>({ tenants: null, reviews: null });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        // The current public RLS policies define which merchants and reviews
        // visitors may count. Never invent a rating or a minimum tenant count.
        const [tenantResult, reviewResult] = await Promise.all([
          queryPublicStorefront<number>("tenants", async (table, legacy) => {
            let query = supabase.from(table as "tenants")
              .select("id", { count: "exact", head: true });
            if (legacy) query = query.eq("status", "active");
            const { count, error } = await query;
            return { data: count, error };
          }, { requireView: publicViewsRequired }),
          queryPublicStorefront<number>("reviews", async (table, legacy) => {
            let query = supabase.from(table as "reviews")
              .select("id", { count: "exact", head: true });
            if (legacy) query = query.eq("is_approved", true);
            const { count, error } = await query;
            return { data: count, error };
          }, { requireView: publicViewsRequired }),
        ]);
        if (!active) return;
        setStats({
          tenants: tenantResult.error ? null : tenantResult.data,
          reviews: reviewResult.error ? null : reviewResult.data,
        });
      } catch {
        if (active) setStats({ tenants: null, reviews: null });
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <aside
      aria-label={ar ? "مؤشرات المنصة" : "Marketplace indicators"}
      className={`border-b border-border bg-secondary/50 px-4 py-4 text-xs text-muted-foreground ${ar ? "font-arabic" : ""}`}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-8">
        {stats.tenants !== null && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{ar ? `${stats.tenants} نشاط تجاري متاح` : `${stats.tenants} businesses available`}</span>
          </div>
        )}
        {stats.reviews !== null && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>{ar ? `${stats.reviews} تقييم منشور` : `${stats.reviews} published reviews`}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>{ar ? "اكتشف الأنشطة والخدمات المحلية" : "Discover local businesses and services"}</span>
        </div>
      </div>
    </aside>
  );
}
