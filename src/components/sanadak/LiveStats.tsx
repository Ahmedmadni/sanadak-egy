import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { Building2, MapPin, Star } from "lucide-react";

type PublicStats = {
  tenants: number | null;
  reviews: number | null;
};

export function LiveStats() {
  const { lang } = useSanadak();
  const [stats, setStats] = useState<PublicStats>({ tenants: null, reviews: null });

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        // Count all public rows rather than fetching a sample of review ratings.
        // Never invent tenant counts or a 4.9-star score for an empty marketplace.
        const [tenantResult, reviewResult] = await Promise.all([
          supabase.from("storefront_tenants" as any).select("id", { count: "exact", head: true }),
          supabase.from("storefront_reviews" as any).select("id", { count: "exact", head: true }),
        ]);
        if (!active) return;
        setStats({
          tenants: tenantResult.error ? null : tenantResult.count,
          reviews: reviewResult.error ? null : reviewResult.count,
        });
      } catch {
        if (active) setStats({ tenants: null, reviews: null });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const ar = lang === "ar";

  return (
    <aside
      aria-label={ar ? "مؤشرات المنصة" : "Marketplace indicators"}
      className={`border-b border-border bg-secondary/50 px-4 py-4 text-xs text-muted-foreground ${ar ? "font-arabic" : ""}`}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-x-8">
        {stats.tenants !== null && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              {ar
                ? `${stats.tenants} نشاط تجاري متاح`
                : `${stats.tenants} businesses available`}
            </span>
          </div>
        )}
        {stats.reviews !== null && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent" aria-hidden="true" />
            <span>
              {ar
                ? `${stats.reviews} تقييم منشور`
                : `${stats.reviews} published reviews`}
            </span>
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
