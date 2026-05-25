import { motion } from "motion/react";
import { Phone, Store, ArrowUpRight } from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";

const PHONE = "01120016502";

export function MerchantSection() {
  const { t, setMerchantOpen, lang } = useSanadak();
  return (
    <section id="merchant" className="relative py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative max-w-6xl mx-auto glass-card rounded-[2.5rem] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-hero opacity-70" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-gradient-aurora opacity-30 blur-3xl rounded-full animate-spin-slow" />
        <div className="relative grid md:grid-cols-2 gap-10 p-10 md:p-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs">
              <Store className="h-3.5 w-3.5 text-[var(--emerald)]" />
              <span className={lang === "ar" ? "font-arabic" : ""}>{t("nav_merchant")}</span>
            </div>
            <h2 className={`mt-5 text-4xl md:text-5xl font-bold leading-tight ${lang === "ar" ? "font-arabic" : ""}`}>
              {t("merchant_title")}
            </h2>
            <p className={`mt-4 text-muted-foreground max-w-md ${lang === "ar" ? "font-arabic" : ""}`}>
              {t("merchant_sub")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => setMerchantOpen(true)} className="bg-gradient-brand text-primary-foreground px-6 h-12 rounded-full inline-flex items-center gap-2 font-medium shadow-glow hover:scale-[1.02] transition">
                {t("nav_merchant")} <ArrowUpRight className="h-4 w-4" />
              </button>
              <a href={`tel:${PHONE}`} className="glass-panel px-6 h-12 rounded-full inline-flex items-center gap-2 font-medium hover:bg-foreground/5">
                <Phone className="h-4 w-4 text-[var(--emerald)]" />
                <span dir="ltr" className="tracking-wider">{PHONE}</span>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="glass-panel rounded-3xl p-6 shadow-float">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-brand grid place-items-center text-primary-foreground"><Store className="h-5 w-5" /></div>
                <div>
                  <div className="font-medium">{lang === "ar" ? "متجرك في سندك" : "Your store on Sanadak"}</div>
                  <div className="text-xs text-muted-foreground">{lang === "ar" ? "ابدأ البيع خلال ٤٨ ساعة" : "Start selling within 48 hours"}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  { v: "+30K", l: lang === "ar" ? "عميل شهرياً" : "Monthly buyers" },
                  { v: "0%", l: lang === "ar" ? "رسوم اشتراك" : "Setup fees" },
                  { v: "48h", l: lang === "ar" ? "تفعيل المتجر" : "Live in" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-foreground/5 bg-background/40 p-3">
                    <div className="text-xl font-bold text-gradient-brand">{s.v}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
