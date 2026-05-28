import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { UtensilsCrossed, Coffee, ShoppingBag, Building2, ShoppingCart, Pill, Stethoscope, ArrowUpLeft, Sparkles } from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

const cats = [
  { to: "/restaurants", icon: UtensilsCrossed, key: "cat_restaurants", desc: "cat_restaurants_desc", grad: "from-amber-500 via-orange-600 to-rose-600" },
  { to: "/cafes",       icon: Coffee,          key: "cat_cafes",       desc: "cat_cafes_desc",       grad: "from-amber-700 via-orange-700 to-pink-600" },
  { to: "/shops",       icon: ShoppingBag,     key: "cat_shops",       desc: "cat_shops_desc",       grad: "from-emerald-500 via-teal-600 to-indigo-700" },
  { to: "/halls",       icon: Building2,       key: "cat_halls",       desc: "cat_halls_desc",       grad: "from-indigo-600 via-purple-600 to-rose-600" },
  { to: "/super",       icon: ShoppingCart,    key: "cat_super",       desc: "cat_super_desc",       grad: "from-emerald-500 via-lime-500 to-teal-600" },
  { to: "/pharmacy",    icon: Pill,            key: "cat_pharmacy",    desc: "cat_pharmacy_desc",    grad: "from-rose-500 via-red-600 to-pink-700" },
  { to: "/medical",     icon: Stethoscope,     key: "nav_health",      desc: "health_desc",          grad: "from-blue-500 via-indigo-600 to-purple-700" },
] as const;

export function HomeCategories() {
  const { t, lang } = useSanadak();
  return (
    <section id="categories" className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-[var(--emerald)]" />
            <span className={lang === "ar" ? "font-arabic" : ""}>{t("sec_categories_title")}</span>
          </div>
          <h2 className={`mt-5 text-4xl md:text-6xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("headline_a")} <span className="text-gradient-brand">{t("headline_b")}</span>
          </h2>
          <p className={`mt-3 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{t("cinematic_intro")}</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cats.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.to}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
              >
                <Link to={c.to} onClick={() => sfx.open()} className="group relative block glass-card rounded-3xl p-6 overflow-hidden h-full">
                  <div className={`absolute -top-12 ${lang === "ar" ? "-left-12" : "-right-12"} w-44 h-44 bg-gradient-to-br ${c.grad} opacity-20 blur-3xl rounded-full group-hover:opacity-40 transition-opacity`} />
                  <div className="relative flex items-start gap-4">
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${c.grad} grid place-items-center text-white shadow-glow shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-lg font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{t(c.key)}</div>
                      <p className={`mt-1 text-sm text-muted-foreground line-clamp-2 ${lang === "ar" ? "font-arabic" : ""}`}>{t(c.desc)}</p>
                      <div className={`mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>
                        {t("visit_section")} <ArrowUpLeft className="h-3.5 w-3.5 group-hover:-translate-y-0.5 group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
