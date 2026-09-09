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
          className="absolute inset-0 h-full w-full object-cover object-left pointer-events-none"
        >
          <source src="/sanadak-bg.mp4" type="video/mp4" />
        </video>

        {/* Keep the clean left side of the video visible; use only a very light global tone. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8, 24, 28, 0.10), rgba(8, 24, 28, 0.06) 45%, rgba(8, 24, 28, 0.20))",
          }}
        />

        {/* Concentrate the mask over the problematic right side where the wrong video text appears. */}
        <div
          className="absolute inset-y-0 right-0 w-[44%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to left, rgba(7, 23, 28, 0.88) 0%, rgba(7, 23, 28, 0.74) 28%, rgba(7, 23, 28, 0.42) 58%, rgba(7, 23, 28, 0.10) 82%, transparent 100%)",
          }}
        />

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