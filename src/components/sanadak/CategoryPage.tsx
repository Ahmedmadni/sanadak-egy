import { ReactNode, useState } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Search, Sparkles } from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";

type Props = {
  titleKey: string;
  descKey: string;
  badge?: string;
  children: (query: string) => ReactNode;
};

export function CategoryPage({ titleKey, descKey, badge, children }: Props) {
  const { t, lang, dir } = useSanadak();
  const [q, setQ] = useState("");
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  return (
    <main className="relative min-h-screen pt-28 pb-20">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none opacity-60" />
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />

      <div className="relative max-w-6xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/" className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition ${lang === "ar" ? "font-arabic" : ""}`}>
            <Arrow className="h-4 w-4" /> {t("back_home")}
          </Link>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              {badge && (
                <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--emerald)]" />
                  <span className={lang === "ar" ? "font-arabic" : ""}>{badge}</span>
                </div>
              )}
              <h1 className={`text-4xl md:text-6xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>
                <span className="text-gradient-brand">{t(titleKey)}</span>
              </h1>
              <p className={`mt-3 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t(descKey)}</p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "right-3" : "left-3"} h-4 w-4 text-muted-foreground`} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search_placeholder")}
                className={`w-full h-12 rounded-full glass-panel ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"} text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/40 ${lang === "ar" ? "font-arabic" : ""}`}
              />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mt-10">
          {children(q)}
        </motion.div>
      </div>
    </main>
  );
}
