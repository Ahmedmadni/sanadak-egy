import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Store, Send, ArrowLeft, ArrowRight, CheckCircle2, Landmark, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { allCategoryEntries, type PlanRow } from "./types";
import { DocumentUpload } from "./DocumentUpload";

type RegistrationPlan = Pick<PlanRow, "id" | "code" | "name_ar" | "name_en" | "price_monthly" | "currency">;

function slugify(name: string, seed: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "store"}-${seed.slice(0, 6)}`;
}

const PAYMENT_INSTRUCTIONS = {
  bank_transfer: {
    ar: "تحويل بنكي إلى: بنك مصر — رقم الحساب 1234567890123 — باسم شركة سند لتقنية المعلومات",
    en: "Bank transfer to: Banque Misr — Account 1234567890123 — Sanad Information Technology Co.",
  },
  vodafone_cash: {
    ar: "فودافون كاش إلى الرقم: 01120016502",
    en: "Vodafone Cash to: 01120016502",
  },
};

export function RegisterBusiness({ onCreated }: { onCreated: () => void }) {
  const { lang } = useSanadak();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<RegistrationPlan[]>([]);
  const [form, setForm] = useState({ name: "", category: "restaurants", area: "", phone: "", description: "", plan_code: "" });
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "vodafone_cash">("vodafone_cash");
  const [reference, setReference] = useState("");
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());
  const REQUIRED_KINDS = ["commercial_register", "owner_id", "payment_receipt"];
  const markUploaded = (kind: string) => setUploaded((s) => new Set(s).add(kind));
  const allRequiredUploaded = REQUIRED_KINDS.every((k) => uploaded.has(k));

  const categories = allCategoryEntries();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("plans")
        .select("id, code, name_ar, name_en, price_monthly, currency")
        .eq("is_active", true)
        .order("sort_order");
      const rows: RegistrationPlan[] = data ?? [];
      setPlans(rows);
      if (rows[0]) setForm((f) => ({ ...f, plan_code: rows[0].code }));
    })();
  }, []);

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const plan = plans.find((p) => p.code === form.plan_code);
      if (!plan) throw new Error(lang === "ar" ? "اختر باقة اشتراك صالحة" : "Choose a valid subscription plan");
      const seed = crypto.randomUUID();
      const { data, error } = await (supabase.rpc as any)("request_tenant_onboarding", {
        _name: form.name,
        _category: form.category,
        _plan: plan.id,
        _slug: slugify(form.name, seed),
        _area: form.area || null,
        _phone: form.phone || null,
        _description: form.description || null,
      });
      if (error) throw error;
      if (!data) throw new Error(lang === "ar" ? "تعذر إنشاء طلب الانضمام" : "Could not create onboarding request");
      setTenantId(data as string);
      sfx.success();
      setStep(2);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitReceipt = async () => {
    if (!allRequiredUploaded || !tenantId) {
      toast.error(lang === "ar" ? "يرجى رفع السجل التجاري وبطاقة الرقم القومي وإيصال السداد أولاً" : "Please upload the commercial register, owner ID and payment receipt first");
      return;
    }
    setBusy(true);
    try {
      await supabase.rpc("submit_payment_info", {
        _tenant: tenantId,
        _method: paymentMethod,
        _reference: reference.trim(),
      });
      sfx.success();
      toast.success(lang === "ar" ? "تم إرسال طلبك للمراجعة" : "Your request was sent for review");
      setStep(3);
      onCreated();
    } finally {
      setBusy(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen grid place-items-center px-4 pt-24 pb-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-8 max-w-md text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-[var(--emerald)]" />
          <h1 className={`mt-4 text-2xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "تم إرسال طلبك" : "Request submitted"}</h1>
          <p className={`mt-2 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "سيراجع فريق سندك بياناتك ومستنداتك والسداد، وستصلك رسالة فور الاعتماد." : "The Sanadak team will review your info, documents and payment, and notify you once approved."}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-brand grid place-items-center text-primary-foreground shadow-glow mb-4">
            <Store className="h-6 w-6" />
          </div>
          <h1 className={`text-3xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "أنشئ مساحة عملك على سندك" : "Create your Sanadak business workspace"}
          </h1>
          <div className={`mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            <span className={step === 1 ? "text-[var(--emerald)] font-semibold" : ""}>1. البيانات والباقة</span>
            <span>—</span>
            <span className={step === 2 ? "text-[var(--emerald)] font-semibold" : ""}>2. المستندات والسداد</span>
          </div>
        </motion.div>

        {step === 1 && (
          <motion.form
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={createTenant} className="glass-card rounded-3xl p-6 grid grid-cols-2 gap-3"
          >
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={lang === "ar" ? "اسم النشاط التجاري" : "Business name"}
              className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
            <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="col-span-2 h-11 rounded-xl border border-input bg-background px-3 text-sm">
              {categories.map(([value, cfg]) => (
                <option key={value} value={value}>{lang === "ar" ? cfg.labelAr : cfg.labelEn}</option>
              ))}
            </select>
            <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
              placeholder={lang === "ar" ? "المنطقة" : "Area"}
              className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={lang === "ar" ? "رقم الهاتف" : "Phone"} dir="ltr"
              className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={lang === "ar" ? "وصف مختصر" : "Short description"} rows={3}
              className="col-span-2 rounded-xl border border-input bg-background px-4 py-2 text-sm" />

            <div className="col-span-2 mt-2">
              <div className={`text-sm font-medium mb-2 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "اختر باقة الاشتراك" : "Choose a subscription plan"}</div>
              <div className="grid grid-cols-3 gap-2">
                {plans.map((p) => (
                  <button key={p.id} type="button" onClick={() => setForm({ ...form, plan_code: p.code })}
                    className={`rounded-xl border p-3 text-start transition ${form.plan_code === p.code ? "border-[var(--emerald)] bg-[var(--emerald)]/5" : "border-input"}`}>
                    <div className={`text-sm font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? p.name_ar : p.name_en}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.price_monthly} {p.currency}/{lang === "ar" ? "شهر" : "mo"}</div>
                  </button>
                ))}
              </div>
            </div>

            <button disabled={busy} type="submit"
              className="col-span-2 mt-2 h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50">
              {lang === "ar" ? "التالي: المستندات والسداد" : "Next: documents & payment"}
              {lang === "ar" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </button>
          </motion.form>
        )}

        {step === 2 && tenantId && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6">
            <div className={`text-sm font-semibold mb-3 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "الأوراق النظامية" : "Legal documents"}</div>
            <div className="grid gap-2">
              <DocumentUpload tenantId={tenantId} kind="commercial_register" required onUploaded={() => markUploaded("commercial_register")} label={lang === "ar" ? "السجل التجاري" : "Commercial register"} />
              <DocumentUpload tenantId={tenantId} kind="owner_id" required onUploaded={() => markUploaded("owner_id")} label={lang === "ar" ? "بطاقة الرقم القومي لصاحب النشاط" : "Owner's national ID"} />
              <DocumentUpload tenantId={tenantId} kind="activity_license" label={lang === "ar" ? "ترخيص النشاط (إن وجد)" : "Activity license (if any)"} note={lang === "ar" ? "اختياري — قد يطلبه الأدمن حسب نوع النشاط" : "Optional — may be requested depending on activity type"} />
            </div>

            <div className={`text-sm font-semibold mt-6 mb-3 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "سداد الاشتراك" : "Subscription payment"}</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => setPaymentMethod("vodafone_cash")}
                className={`h-11 rounded-xl border text-sm inline-flex items-center justify-center gap-2 ${paymentMethod === "vodafone_cash" ? "border-[var(--emerald)] bg-[var(--emerald)]/5" : "border-input"}`}>
                <Smartphone className="h-4 w-4" /> {lang === "ar" ? "فودافون كاش" : "Vodafone Cash"}
              </button>
              <button type="button" onClick={() => setPaymentMethod("bank_transfer")}
                className={`h-11 rounded-xl border text-sm inline-flex items-center justify-center gap-2 ${paymentMethod === "bank_transfer" ? "border-[var(--emerald)] bg-[var(--emerald)]/5" : "border-input"}`}>
                <Landmark className="h-4 w-4" /> {lang === "ar" ? "تحويل بنكي" : "Bank transfer"}
              </button>
            </div>
            <p className={`text-xs text-muted-foreground glass-panel rounded-xl p-3 ${lang === "ar" ? "font-arabic" : ""}`}>
              {lang === "ar" ? PAYMENT_INSTRUCTIONS[paymentMethod].ar : PAYMENT_INSTRUCTIONS[paymentMethod].en}
            </p>
            <div className="mt-3 grid gap-2">
              <input value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder={lang === "ar" ? "رقم العملية / المرجع (اختياري، اكتبه قبل رفع الإيصال)" : "Transaction / reference number (optional, fill before uploading)"}
                dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <DocumentUpload tenantId={tenantId} kind="payment_receipt" required referenceNote={reference} onUploaded={() => markUploaded("payment_receipt")} label={lang === "ar" ? "إيصال السداد" : "Payment receipt"} />
            </div>

            <button disabled={!allRequiredUploaded || busy} onClick={submitReceipt}
              className="mt-6 w-full h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="h-4 w-4" /> {lang === "ar" ? "إرسال للمراجعة" : "Submit for review"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
