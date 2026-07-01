import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "motion/react";
import { Search, Store, MapPin, BadgeCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { categoryConfig } from "@/components/business/types";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "البحث · سندك" },
      { name: "description", content: "ابحث عن الأعمال التجارية المسجلة على منصة سندك." },
    ],
  }),
  component: SearchPage,
});

type Tenant = {
  id: string; slug: string; name: string; category: string; area: string | null;
  description: string | null; image_url: string | null; verified_at: string | null;
};

function SearchPage() {
  const { q } = Route.useSearch();
  const { t, lang, dir } = useSanadak();
  const [query, setQuery] = useState(q);
  const [rows, setRows] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  useEffect(() => { setQuery(q); }, [q]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let req = supabase.from("tenants" as any).select("id, slug, name, category, area, description, image_url, verified_at");
      if (query.trim()) {
        const like = `%${query.trim()}%`;
        req = req.or(`name.ilike.${like},description.ilike.${like},area.ilike.${like},category.ilike.${like}`);
      }
      const { data } = await req.order("verified_at", { ascending: false, nullsFirst: false }).limit(60);
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [query]);

  return (
    <main className="relative min-h-screen pt-28 pb-20">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none opacity-60" />
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />

      <div className="relative max-w-5xl mx-auto px-4">
        <Link to="/" className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition ${lang === "ar" ? "font-arabic" : ""}`}>
          <Arrow className="h-4 w-4" /> {t("back_home")}
        </Link>

        <h1 className={`mt-6 text-3xl md:text-5xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>
          <span className="text-gradient-brand">{lang === "ar" ? "نتائج البحث" : "Search results"}</span>
        </h1>

        <div className="relative mt-6 max-w-lg">
          <Search className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "right-4" : "left-4"} h-4 w-4 text-muted-foreground`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder")}
            className={`w-full h-12 rounded-full glass-panel ${dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"} text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/40 ${lang === "ar" ? "font-arabic" : ""}`}
          />
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loading && rows.length === 0 && (
            <div className={`col-span-full glass-card rounded-2xl p-10 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
              {t("no_results")}
            </div>
          )}
          {rows.map((r, i) => {
            const cfg = categoryConfig(r.category);
            return (
              <motion.a
                key={r.id} href={`/store/${r.slug}`}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card rounded-2xl p-4 block hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
                    {r.image_url ? <img src={r.image_url} className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold flex items-center gap-1 truncate ${lang === "ar" ? "font-arabic" : ""}`}>
                      {r.name}
                      {r.verified_at && <BadgeCheck className="h-3.5 w-3.5 text-[var(--emerald)] shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{lang === "ar" ? cfg.labelAr : cfg.labelEn}</span>
                      {r.area && <><span>·</span><MapPin className="h-3 w-3" /> {r.area}</>}
                    </div>
                  </div>
                </div>
                {r.description && <p className={`mt-3 text-sm text-foreground/80 line-clamp-2 ${lang === "ar" ? "font-arabic" : ""}`}>{r.description}</p>}
              </motion.a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
