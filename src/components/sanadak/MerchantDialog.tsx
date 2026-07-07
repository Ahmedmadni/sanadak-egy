import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSanadak } from "@/lib/sanadak-context";
import { useNavigate } from "@tanstack/react-router";
import { Phone, Store, ArrowRight, ArrowLeft } from "lucide-react";
import { sfx } from "@/lib/sanadak-sounds";
import { MERCHANT_LOCAL } from "@/lib/whatsapp";

export function MerchantDialog() {
  const { merchantOpen, setMerchantOpen, t, lang, dir } = useSanadak();
  const navigate = useNavigate();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const startRegistration = () => {
    sfx.tap();
    setMerchantOpen(false);
    navigate({ to: "/business" });
  };

  return (
    <Dialog open={merchantOpen} onOpenChange={setMerchantOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={lang === "ar" ? "font-arabic text-2xl" : "text-2xl"}>
            <span className="inline-flex items-center gap-2"><Store className="h-5 w-5 text-[var(--emerald)]" /> {t("merchant_title")}</span>
          </DialogTitle>
          <DialogDescription className={lang === "ar" ? "font-arabic" : ""}>{t("merchant_sub")}</DialogDescription>
        </DialogHeader>

        <button onClick={startRegistration} className={`group bg-gradient-brand text-primary-foreground h-14 rounded-2xl font-medium shadow-glow flex items-center justify-center gap-2 hover:scale-[1.01] transition ${lang === "ar" ? "font-arabic" : ""}`}>
          {lang === "ar" ? "سجّل نشاطك الآن" : "Register your business now"}
          <Arrow className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <div className={`text-center text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>— {t("merchant_or")} —</div>

        <a href={`tel:${MERCHANT_LOCAL}`} className="flex items-center justify-between glass-panel rounded-2xl px-4 py-3 hover:bg-foreground/5 transition">
          <span className={`text-sm font-medium flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}><Phone className="h-4 w-4 text-[var(--emerald)]" /> {t("merchant_call")}</span>
          <span dir="ltr" className="font-semibold tracking-wider text-[var(--emerald)]">{MERCHANT_LOCAL}</span>
        </a>

        <p className={`text-[11px] text-muted-foreground text-center ${lang === "ar" ? "font-arabic" : ""}`}>
          {lang === "ar" ? "التسجيل يشمل بيانات النشاط، الباقة، الأوراق النظامية، وإثبات السداد — يُراجعها فريق سندك قبل التفعيل." : "Registration covers your business info, plan, legal documents and payment proof — reviewed by our team before activation."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
