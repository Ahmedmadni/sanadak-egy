import { useState } from "react";
import { motion } from "motion/react";
import { Store, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { CATEGORY_CONFIG } from "./types";

function slugify(name: string, seed: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "store"}-${seed.slice(0, 6)}`;
}

export function RegisterBusiness({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const { lang } = useSanadak();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", category: "restaurants", area: "", phone: "", description: "" });

  const categories = Object.entries(CATEGORY_CONFIG);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: plan } = await supabase.from("plans" as any).select("id").eq("code", "free").maybeSingle();
      const seed = crypto.randomUUID();
      const { error } = await supabase.from("tenants" as any).insert({
        slug: slugify(form.name, seed),
        name: form.name,
        category: form.category,
        area: form.area || null,
        phone: form.phone || null,
        description: form.description || null,
        owner_id: userId,
        plan_id: (plan as any)?.id ?? null,
        status: "pending",
      });
      if (error) throw error;
      sfx.success();
      toast.success(lang === "ar" ? "تم إنشاء مساحة عملك! بانتظار توثيق فريق سندك." : "Your workspace was created! Pending verification.");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

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
          <p className={`mt-2 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar"
              ? "لوحة تحكم مستقلة لإدارة فروعك وموظفيك ومنتجاتك وحجوزاتك — تفعَّل فور مراجعة فريقنا."
              : "An independent dashboard for branches, staff, catalog and bookings — activated once our team verifies it."}
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onSubmit={submit} className="glass-card rounded-3xl p-6 grid grid-cols-2 gap-3"
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
          <button disabled={busy} type="submit"
            className="col-span-2 h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="h-4 w-4" /> {lang === "ar" ? "إنشاء مساحة العمل" : "Create workspace"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
