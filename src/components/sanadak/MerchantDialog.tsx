import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSanadak } from "@/lib/sanadak-context";
import { Phone, Store, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { openWhatsApp, generateSerial, MERCHANT_LOCAL } from "@/lib/whatsapp";
import { sfx } from "@/lib/sanadak-sounds";
import { supabase } from "@/integrations/supabase/client";

export function MerchantDialog() {
  const { merchantOpen, setMerchantOpen, t, lang } = useSanadak();
  const [form, setForm] = useState({ store: "", owner: "", phone: "", category: "", area: "", description: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const serial = generateSerial("MERCH");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("store_requests" as any).insert({
        store_name: form.store,
        owner_name: form.owner,
        phone: form.phone,
        category: form.category,
        area: form.area || null,
        description: form.description || null,
        submitted_by: user?.id ?? null,
      });
      if (error) throw error;
      sfx.success();
      toast.success(`${lang === "ar" ? "تم إرسال طلبك للمراجعة" : "Request submitted for review"} · ${serial}`);
      // Notify merchant team via WhatsApp as well
      openWhatsApp({
        type: "merchant", serial,
        storeName: form.store,
        customer: { name: form.owner, phone: form.phone, address: form.area },
        lines: [`${t("category")}: ${form.category}`, form.description ? `📝 ${form.description}` : ""].filter(Boolean),
      }, lang);
      setForm({ store: "", owner: "", phone: "", category: "", area: "", description: "" });
      setMerchantOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={merchantOpen} onOpenChange={setMerchantOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={lang === "ar" ? "font-arabic text-2xl" : "text-2xl"}>
            <span className="inline-flex items-center gap-2"><Store className="h-5 w-5 text-[var(--emerald)]" /> {t("merchant_title")}</span>
          </DialogTitle>
          <DialogDescription className={lang === "ar" ? "font-arabic" : ""}>{t("merchant_sub")}</DialogDescription>
        </DialogHeader>

        <a href={`tel:${MERCHANT_LOCAL}`} className="flex items-center justify-between glass-panel rounded-2xl px-4 py-3 hover:bg-foreground/5 transition">
          <span className={`text-sm font-medium flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}><Phone className="h-4 w-4 text-[var(--emerald)]" /> {t("merchant_call")}</span>
          <span dir="ltr" className="font-semibold tracking-wider text-[var(--emerald)]">{MERCHANT_LOCAL}</span>
        </a>

        <div className={`text-center text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>— {t("merchant_or")} —</div>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input required value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} placeholder={t("store_name")} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          <input required value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder={t("owner_name")} className="h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t("phone")} dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={t("category")} className="h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder={lang === "ar" ? "المنطقة" : "Area"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={lang === "ar" ? "وصف مختصر للمتجر" : "Short description"} rows={2} className="col-span-2 rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30" />
          <button disabled={busy} type="submit" className={`col-span-2 bg-gradient-brand text-primary-foreground h-12 rounded-full font-medium shadow-glow hover:scale-[1.01] transition flex items-center justify-center gap-2 disabled:opacity-50 ${lang === "ar" ? "font-arabic" : ""}`}>
            <Send className="h-4 w-4" /> {lang === "ar" ? "إرسال للمراجعة" : "Submit for review"}
          </button>
          <p className={`col-span-2 text-[11px] text-muted-foreground text-center ${lang === "ar" ? "font-arabic" : ""}`}>
            <MessageCircle className="inline h-3 w-3 mr-1" />
            {lang === "ar" ? "سيتم مراجعة طلبك من قِبَل فريق سندك والرد عليك عبر واتساب." : "Our team will review and reply via WhatsApp."}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
