import { motion } from "motion/react";
import { ArrowRight, Sparkles, MapPin, ShoppingBag, Stethoscope, UtensilsCrossed } from "lucide-react";
import { Logo } from "./Logo";
import { useSanadak } from "@/lib/sanadak-context";

export function Hero() {
  const { t, lang } = useSanadak();

  const orbits = [
    { Icon: UtensilsCrossed, label: t("nav_food"), angle: 0, r: 220, delay: 0 },
    { Icon: Stethoscope, label: t("nav_health"), angle: 72, r: 240, delay: 0.2 },
    { Icon: ShoppingBag, label: t("nav_shopping"), angle: 144, r: 220, delay: 0.4 },
    { Icon: MapPin, label: t("nav_track"), angle: 216, r: 240, delay: 0.6 },
    { Icon: Sparkles, label: lang === "ar" ? "خدمات" : "Services", angle: 288, r: 220, delay: 0.8 },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-24 overflow-hidden">
      {/* Video background */}
      <video
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        poster=""
      >
        <source src="/sanadak-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-aurora opacity-25 blur-3xl rounded-full animate-spin-slow pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
        className={`relative z-10 glass-panel rounded-full px-4 py-1.5 flex items-center gap-2 text-xs text-muted-foreground mb-8 ${lang === "ar" ? "font-arabic" : ""}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)] animate-pulse-glow" />
        {t("brand_tag")}
      </motion.div>

      <div className="relative grid place-items-center w-full">
        <div className="absolute w-[520px] h-[520px] rounded-full border border-foreground/5" />
        <div className="absolute w-[380px] h-[380px] rounded-full border border-foreground/5" />

        {orbits.map(({ Icon, label, angle, r, delay }, i) => {
          const x = Math.cos((angle * Math.PI) / 180) * r;
          const y = Math.sin((angle * Math.PI) / 180) * r;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ x, y }} className="absolute hidden md:flex"
            >
              <div className="glass-card rounded-2xl px-3 py-2 flex items-center gap-2 animate-float-slow" style={{ animationDelay: `${delay}s` }}>
                <div className="h-7 w-7 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={lang === "ar" ? "font-arabic text-xs" : "text-xs"}>{label}</span>
              </div>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="relative z-10"
        >
          <div className="absolute inset-0 bg-gradient-brand rounded-full blur-3xl opacity-40 scale-110" />
          <div className="relative glass-card rounded-3xl p-6 shadow-glow">
            <img src={logo} alt="Sanadak سندك" className="h-24 w-24 md:h-28 md:w-28 object-contain" />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
        className="relative z-10 text-center mt-12 px-4 max-w-3xl"
      >
        <h1 className={`text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] ${lang === "ar" ? "font-arabic" : ""}`}>
          {t("hero_h1_a")} <span className="text-gradient-brand">{t("hero_h1_b")}</span>
        </h1>
        <p className={`mt-5 text-base md:text-lg text-muted-foreground max-w-xl mx-auto ${lang === "ar" ? "font-arabic" : ""}`}>
          {t("hero_sub")}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#services" className={`group bg-gradient-brand text-primary-foreground px-6 h-12 rounded-full flex items-center gap-2 font-medium shadow-glow hover:scale-[1.02] transition-transform ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("cta_start")}
            <ArrowRight className={`h-4 w-4 group-hover:translate-x-0.5 transition-transform ${lang === "ar" ? "rotate-180" : ""}`} />
          </a>
          <a href="#services" className={`glass-panel px-6 h-12 rounded-full flex items-center gap-2 font-medium hover:bg-foreground/5 transition-colors ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("cta_explore")}
          </a>
        </div>

        <div className={`mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
          <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--ember)]" /> {t("users")}</div>
          <div className="h-3 w-px bg-foreground/10" />
          <div>{t("rating")}</div>
          <div className="h-3 w-px bg-foreground/10 hidden sm:block" />
          <div className="hidden sm:block">{t("cities")}</div>
        </div>
      </motion.div>
    </section>
  );
}
