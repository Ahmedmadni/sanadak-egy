import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSearch } from "./HeroSearch";
import { HeroCategoryRail } from "./HeroCategoryRail";
import { LiveStats } from "./LiveStats";
import { useSanadak } from "@/lib/sanadak-context";

export function Hero() {
  const { t, lang } = useSanadak();

  return (
    <>
      <section className="relative flex min-h-[78svh] items-center justify-center overflow-hidden px-4 pb-16 pt-28 md:min-h-[84svh] md:pb-20 md:pt-32">
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
        >
          <source src="/sanadak-bg.mp4" type="video/mp4" />
        </video>
        <div className="hero-video-overlay absolute inset-0 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto w-full max-w-4xl text-center"
        >
          <h1 className={`text-balance text-4xl font-bold leading-[1.15] text-hero-foreground sm:text-5xl md:text-7xl ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("hero_h1_a")} <span className="text-hero-accent">{t("hero_h1_b")}</span>
          </h1>
          <p className={`mx-auto mt-5 max-w-2xl text-pretty text-base leading-8 text-hero-muted md:mt-6 md:text-lg ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("hero_sub")}
          </p>

          <HeroSearch />

          <div className="mt-5 flex flex-col items-stretch justify-center gap-3 px-4 sm:flex-row sm:items-center sm:px-0">
            <Button asChild size="lg" className={`h-12 rounded-full px-7 shadow-glow ${lang === "ar" ? "font-arabic" : ""}`}>
              <a href="#categories">
                {t("cta_start")}
                <ArrowRight className={lang === "ar" ? "rotate-180" : ""} />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className={`h-12 rounded-full border-hero-border bg-hero-surface px-7 text-hero-foreground shadow-none backdrop-blur-md hover:bg-hero-surface-hover hover:text-hero-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
              <a href="#categories">{t("cta_explore")}</a>
            </Button>
          </div>
        </motion.div>
      </section>

      <HeroCategoryRail />
      <LiveStats />
    </>
  );
}