import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Building2, Coffee, Pill, ShoppingBag, ShoppingCart, Stethoscope, UtensilsCrossed } from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

const categories = [
  { to: "/restaurants", key: "nav_food", icon: UtensilsCrossed },
  { to: "/cafes", key: "nav_cafes", icon: Coffee },
  { to: "/medical", key: "nav_health", icon: Stethoscope },
  { to: "/shops", key: "nav_shops", icon: ShoppingBag },
  { to: "/super", key: "nav_super", icon: ShoppingCart },
  { to: "/pharmacy", key: "nav_pharmacy", icon: Pill },
  { to: "/halls", key: "nav_halls", icon: Building2 },
] as const;

export function HeroCategoryRail() {
  const { t, lang } = useSanadak();

  return (
    <section aria-label={t("nav_categories")} className="border-b border-border bg-background px-4 py-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto flex max-w-6xl snap-x snap-mandatory gap-2 overflow-x-auto pb-1 scrollbar-none md:justify-center"
      >
        {categories.map(({ to, key, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => sfx.tap()}
            className={`group flex h-11 shrink-0 snap-start items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-card-foreground transition-colors hover:border-primary/40 hover:bg-secondary ${lang === "ar" ? "font-arabic" : ""}`}
          >
            <Icon className="h-4 w-4 text-primary transition-transform group-hover:-translate-y-0.5" />
            {t(key)}
          </Link>
        ))}
      </motion.div>
    </section>
  );
}