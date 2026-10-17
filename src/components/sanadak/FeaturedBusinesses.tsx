import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Store, MapPin, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { publicViewsRequired, queryPublicStorefront } from "@/lib/public-storefront";

type Tenant = { id: string; slug: string; name: string; category: string; area: string | null; image_url: string | null; verified_at: string | null };

export function FeaturedBusinesses() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<Tenant[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await queryPublicStorefront<Tenant[]>(
        "tenants",
        async (table, legacy) => {
          let query = supabase.from(table as "tenants")
            .select("id, slug, name, category, area, image_url, verified_at")
            .order("verified_at", { ascending: false, nullsFirst: false })
            .limit(8);
          if (legacy) query = query.eq("status", "active");
          const { data, error } = await query;
          return { data, error };
        },
        { requireView: publicViewsRequired },
      );
      if (active && !result.error) setRows(result.data ?? []);
    })().catch(() => { /* Do not invent featured businesses after a failed read. */ });
    return () => { active = false; };
  }, []);

  if (rows.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
      className="relative z-10 mt-16 w-full max-w-5xl mx-auto px-4"
    >
      <div className={`text-center text-xs text-muted-foreground mb-4 ${lang === "ar" ? "font-arabic" : ""}`}>
        {lang === "ar" ? "أعمال منضمة حديثاً على سندك" : "Recently joined on Sanadak"}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 justify-center flex-wrap">
        {rows.map((r) => (
          <a
            key={r.id}
            href={`/store/${r.slug}`}
            onClick={() => sfx.tap()}
            className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 shrink-0 hover:scale-[1.02] transition-transform"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground overflow-hidden shrink-0">
              {r.image_url ? <img src={r.image_url} className="h-full w-full object-cover" /> : <Store className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-semibold flex items-center gap-1 ${lang === "ar" ? "font-arabic" : ""}`}>
                {r.name}
                {r.verified_at && <BadgeCheck className="h-3.5 w-3.5 text-[var(--emerald)]" />}
              </div>
              {r.area && <div className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.area}</div>}
            </div>
          </a>
        ))}
      </div>
    </motion.div>
  );
}
