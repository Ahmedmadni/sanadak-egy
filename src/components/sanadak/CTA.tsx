import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";
import { useSanadak } from "@/lib/sanadak-context";

export function CTA() {
  const { t, lang } = useSanadak();
  return (
    <section id="start" className="relative py-32 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
        className="relative max-w-5xl mx-auto glass-card rounded-[2.5rem] p-12 md:p-20 text-center overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-aurora opacity-25 blur-3xl rounded-full animate-spin-slow" />
        <div className="relative">
          <Logo variant="icon" className="h-14 w-14 mx-auto rounded-2xl shadow-glow" />
          <h2 className={`text-4xl md:text-6xl font-bold mt-6 leading-tight ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("cta_final_a")} <span className="text-gradient-brand">{lang === "ar" ? "سندك" : "Sanadak"}</span>
          </h2>
          <p className={`mt-4 text-muted-foreground max-w-lg mx-auto ${lang === "ar" ? "font-arabic" : ""}`}>
            {t("cta_final_sub")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#" className={`bg-[var(--graphite)] text-[var(--background)] dark:bg-foreground dark:text-background px-6 h-12 rounded-full flex items-center gap-2 font-medium shadow-float ${lang === "ar" ? "font-arabic" : ""}`}>
              {t("download_ios")} <ArrowRight className={`h-4 w-4 ${lang === "ar" ? "rotate-180" : ""}`} />
            </a>
            <a href="#" className={`glass-panel px-6 h-12 rounded-full flex items-center gap-2 font-medium ${lang === "ar" ? "font-arabic" : ""}`}>
              {t("download_android")} <ArrowRight className={`h-4 w-4 ${lang === "ar" ? "rotate-180" : ""}`} />
            </a>
          </div>
        </div>
      </motion.div>

      <footer className={`max-w-6xl mx-auto mt-20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
        <div className="flex items-center gap-2">
          <Logo variant="icon" className="h-5 w-5 rounded" />
          <span>{t("footer_rights")}</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-foreground">{t("privacy")}</a>
          <a href="#" className="hover:text-foreground">{t("terms")}</a>
          <a href="tel:01120016502" className="hover:text-foreground">{t("contact")}</a>
        </div>
      </footer>
    </section>
  );
}
