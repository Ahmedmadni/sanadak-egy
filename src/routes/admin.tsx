import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Store, ShieldCheck, ArrowLeft, X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "إدارة المتاجر · سندك" },
      { name: "description", content: "لوحة تحكم إدارة المتاجر في سندك" },
    ],
  }),
  component: AdminPage,
});

type StoreRow = {
  id: string;
  name: string;
  category: string;
  area: string | null;
  phone: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

const CATEGORIES = [
  ["restaurants", "مطاعم"],
  ["cafes", "كافيهات"],
  ["shops", "محلات"],
  ["halls", "قاعات أفراح"],
  ["super", "سوبرماركت"],
  ["pharmacy", "صيدليات"],
  ["medical", "طبي"],
];

function AdminPage() {
  const { lang } = useSanadak();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [editing, setEditing] = useState<Partial<StoreRow> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const load = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setStores((data as StoreRow[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        name: editing.name!,
        category: editing.category!,
        area: editing.area ?? null,
        phone: editing.phone ?? null,
        description: editing.description ?? null,
        image_url: editing.image_url ?? null,
      };
      if (editing.id) {
        const { error } = await supabase.from("stores").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success(lang === "ar" ? "تم التحديث" : "Updated");
      } else {
        const { error } = await supabase.from("stores").insert({ ...payload, owner_id: user?.id });
        if (error) throw error;
        toast.success(lang === "ar" ? "تمت الإضافة" : "Added");
      }
      sfx.success();
      setEditing(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا المتجر؟" : "Delete this store?")) return;
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      sfx.tap();
      toast.success(lang === "ar" ? "تم الحذف" : "Deleted");
      load();
    }
  };

  if (loading) return <main className="min-h-screen grid place-items-center"><div className="text-sm text-muted-foreground">...</div></main>;
  if (!user) return null;

  if (!isAdmin) {
    return (
      <main className="min-h-screen grid place-items-center px-4 pt-24">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center">
          <ShieldCheck className="h-10 w-10 mx-auto text-[var(--ember)]" />
          <h1 className={`mt-3 text-2xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "وصول مقيّد" : "Restricted"}
          </h1>
          <p className={`mt-2 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar"
              ? "هذه الصفحة مخصصة للمشرفين فقط. تواصل مع مالك المنصة لمنحك صلاحية الإدارة."
              : "Admins only. Contact the platform owner to be granted admin access."}
          </p>
          <p className="mt-3 text-xs text-muted-foreground" dir="ltr">User ID: {user.id}</p>
          <Link to="/" className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--emerald)]"><ArrowLeft className="h-4 w-4" /> Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen pt-28 pb-20 px-4">
      <div className="absolute inset-0 bg-gradient-hero opacity-50 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--emerald)]" /> Admin
            </div>
            <h1 className={`mt-3 text-4xl md:text-5xl font-bold text-gradient-brand ${lang === "ar" ? "font-arabic" : ""}`}>
              {lang === "ar" ? "إدارة المتاجر" : "Stores admin"}
            </h1>
            <p className={`mt-2 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
              {lang === "ar" ? "أضف، عدّل، أو احذف بيانات المتاجر في منصة سندك." : "Add, edit, or delete stores on Sanadak."}
            </p>
          </div>
          <button onClick={() => { setEditing({ category: "restaurants" }); sfx.open(); }} className="bg-gradient-brand text-primary-foreground h-12 px-6 rounded-full inline-flex items-center gap-2 font-medium shadow-glow hover:scale-[1.02] transition">
            <Plus className="h-4 w-4" /> {lang === "ar" ? "متجر جديد" : "New store"}
          </button>
        </motion.div>

        <div className="mt-8 grid gap-3">
          {stores.length === 0 && (
            <div className={`glass-card rounded-2xl p-10 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
              {lang === "ar" ? "لا توجد متاجر بعد. أضف أول متجر!" : "No stores yet. Add the first one!"}
            </div>
          )}
          {stores.map((s) => (
            <motion.div key={s.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0">
                {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover rounded-xl" /> : <Store className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>{s.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {s.category}{s.area ? ` · ${s.area}` : ""}{s.phone ? ` · ${s.phone}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(s); sfx.tap(); }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(s.id)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onSubmit={save}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-3xl p-6 w-full max-w-lg shadow-float"
          >
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>
                {editing.id ? (lang === "ar" ? "تعديل المتجر" : "Edit store") : (lang === "ar" ? "متجر جديد" : "New store")}
              </h2>
              <button type="button" onClick={() => setEditing(null)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={lang === "ar" ? "اسم المتجر" : "Store name"} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <select required value={editing.category ?? "restaurants"} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={editing.area ?? ""} onChange={(e) => setEditing({ ...editing, area: e.target.value })} placeholder={lang === "ar" ? "المنطقة" : "Area"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder={lang === "ar" ? "رقم الهاتف" : "Phone"} dir="ltr" className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder={lang === "ar" ? "رابط الصورة (اختياري)" : "Image URL (optional)"} dir="ltr" className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder={lang === "ar" ? "وصف المتجر" : "Description"} rows={3} className="col-span-2 rounded-xl border border-input bg-background px-4 py-2 text-sm" />
            </div>
            <button disabled={busy} type="submit" className={`mt-5 w-full h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 ${lang === "ar" ? "font-arabic" : ""}`}>
              <Save className="h-4 w-4" /> {lang === "ar" ? "حفظ" : "Save"}
            </button>
          </motion.form>
        </div>
      )}
    </main>
  );
}
