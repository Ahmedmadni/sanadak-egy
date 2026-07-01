import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Pencil, Trash2, X, Save, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader, EmptyState } from "../ui";
import type { BranchRow, TenantWithRole } from "../types";

export function BranchesPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<BranchRow[]>([]);
  const [editing, setEditing] = useState<Partial<BranchRow> | null>(null);
  const [busy, setBusy] = useState(false);
  const canManage = tenant.role === "owner" || tenant.role === "manager";

  const load = async () => {
    const { data } = await supabase.from("branches" as any).select("*").eq("tenant_id", tenant.id).order("created_at");
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [tenant.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        tenant_id: tenant.id, name: editing.name!, address: editing.address ?? null,
        phone: editing.phone ?? null, is_active: editing.is_active ?? true,
      };
      if (editing.id) {
        const { error } = await supabase.from("branches" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("branches" as any).insert(payload);
        if (error) throw error;
      }
      sfx.success(); setEditing(null); load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا الفرع؟" : "Delete this branch?")) return;
    const { error } = await supabase.from("branches" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "الفروع" : "Branches"}
        subtitle={lang === "ar" ? "إدارة فروع نشاطك التجاري" : "Manage your business locations"}
        action={canManage && (
          <button onClick={() => { setEditing({ is_active: true }); sfx.open(); }} className="bg-gradient-brand text-primary-foreground h-10 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium shadow-glow">
            <Plus className="h-4 w-4" /> {lang === "ar" ? "فرع جديد" : "New branch"}
          </button>
        )}
      />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد فروع بعد." : "No branches yet."} />}
      <div className="grid gap-3">
        {rows.map((b) => (
          <motion.div key={b.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0"><MapPin className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>{b.name}</div>
              <div className="text-xs text-muted-foreground truncate">{b.address}{b.phone ? ` · ${b.phone}` : ""}</div>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${b.is_active ? "bg-[var(--emerald)]/15 text-[var(--emerald)]" : "bg-foreground/10 text-foreground/60"}`}>
              {b.is_active ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "متوقف" : "Inactive")}
            </span>
            {canManage && (
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(b); sfx.tap(); }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(b.id)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-6 w-full max-w-lg shadow-float">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{editing.id ? (lang === "ar" ? "تعديل الفرع" : "Edit branch") : (lang === "ar" ? "فرع جديد" : "New branch")}</h2>
              <button type="button" onClick={() => setEditing(null)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={lang === "ar" ? "اسم الفرع" : "Branch name"} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} placeholder={lang === "ar" ? "العنوان" : "Address"} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder={lang === "ar" ? "الهاتف" : "Phone"} dir="ltr" className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                {lang === "ar" ? "فرع نشط" : "Active branch"}
              </label>
            </div>
            <button disabled={busy} type="submit" className="mt-5 w-full h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50">
              <Save className="h-4 w-4" /> {lang === "ar" ? "حفظ" : "Save"}
            </button>
          </motion.form>
        </div>
      )}
    </div>
  );
}
