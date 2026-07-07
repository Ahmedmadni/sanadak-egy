import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Pencil, Trash2, X, Save, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader, EmptyState } from "../ui";
import { ImageUpload } from "../ImageUpload";
import { categoryConfig, type CatalogItemRow, type TenantWithRole, type PlanRow } from "../types";

export function CatalogPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const cfg = categoryConfig(tenant.category);
  const [rows, setRows] = useState<CatalogItemRow[]>([]);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [editing, setEditing] = useState<Partial<CatalogItemRow> & { variantsText?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const canManage = tenant.role === "owner" || tenant.role === "manager";

  const load = async () => {
    const { data } = await supabase.from("catalog_items" as any).select("*").eq("tenant_id", tenant.id).order("sort_order");
    setRows((data as any) ?? []);
    if (tenant.plan_id) {
      const { data: p } = await supabase.from("plans" as any).select("*").eq("id", tenant.plan_id).maybeSingle();
      setPlan((p as any) ?? null);
    }
  };
  useEffect(() => { load(); }, [tenant.id, tenant.plan_id]);

  const limit = plan?.limits?.products ?? -1;
  const atLimit = limit !== -1 && rows.length >= limit;

  const openNew = () => {
    if (atLimit) {
      toast.error(lang === "ar" ? `باقتك تسمح بحد أقصى ${limit} عنصر. قم بالترقية لإضافة المزيد.` : `Your plan allows up to ${limit} items. Upgrade to add more.`);
      return;
    }
    setEditing({ kind: cfg.catalogKind, is_active: true, price: 0 });
    sfx.open();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const variants = (editing.variantsText ?? "")
        .split(",").map((v) => v.trim()).filter(Boolean).map((v) => ({ label: v }));
      const payload = {
        tenant_id: tenant.id, kind: editing.kind ?? cfg.catalogKind, name: editing.name!,
        description: editing.description ?? null, price: Number(editing.price) || 0,
        image_url: editing.image_url ?? null,
        stock: cfg.usesStock ? (editing.stock ?? null) : null,
        duration_minutes: cfg.usesDuration ? (editing.duration_minutes ?? null) : null,
        variants: cfg.usesVariants ? variants : [],
        is_active: editing.is_active ?? true,
      };
      if (editing.id) {
        const { error } = await supabase.from("catalog_items" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catalog_items" as any).insert(payload);
        if (error) throw error;
      }
      sfx.success(); setEditing(null); load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا العنصر؟" : "Delete this item?")) return;
    const { error } = await supabase.from("catalog_items" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const catalogLabel = lang === "ar" ? cfg.catalogLabelAr : cfg.catalogLabelEn;

  return (
    <div>
      <PanelHeader
        title={catalogLabel}
        subtitle={limit !== -1 ? (lang === "ar" ? `${rows.length} من ${limit} — حسب باقتك` : `${rows.length} of ${limit} — plan limit`) : undefined}
        action={canManage && (
          <button onClick={openNew} className="bg-gradient-brand text-primary-foreground h-10 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium shadow-glow">
            <Plus className="h-4 w-4" /> {lang === "ar" ? "إضافة" : "Add"}
          </button>
        )}
      />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد عناصر بعد." : "No items yet."} />}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((it) => (
          <motion.div key={it.id} layout className="glass-card rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
                {it.image_url ? <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>{it.name}</div>
                <div className="text-xs text-muted-foreground">{it.price} {it.currency}{it.duration_minutes ? ` · ${it.duration_minutes}m` : ""}{it.stock !== null ? ` · stock ${it.stock}` : ""}</div>
              </div>
            </div>
            {canManage && (
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => { setEditing({ ...it, variantsText: (it.variants as any[])?.map((v: any) => v.label).join(", ") }); sfx.tap(); }} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(it.id)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-6 w-full max-w-lg shadow-float max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{editing.id ? (lang === "ar" ? "تعديل" : "Edit") : (lang === "ar" ? "عنصر جديد" : "New item")}</h2>
              <button type="button" onClick={() => setEditing(null)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={lang === "ar" ? "الاسم" : "Name"} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input required type="number" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} placeholder={lang === "ar" ? "السعر" : "Price"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              {cfg.usesStock && (
                <input type="number" value={editing.stock ?? ""} onChange={(e) => setEditing({ ...editing, stock: e.target.value === "" ? null : Number(e.target.value) })} placeholder={lang === "ar" ? "المخزون" : "Stock"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              )}
              {cfg.usesDuration && (
                <input type="number" value={editing.duration_minutes ?? ""} onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value === "" ? null : Number(e.target.value) })} placeholder={lang === "ar" ? "المدة (دقائق)" : "Duration (min)"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              )}
              {cfg.usesVariants && (
                <input value={editing.variantsText ?? ""} onChange={(e) => setEditing({ ...editing, variantsText: e.target.value })} placeholder={lang === "ar" ? "الأحجام/الأنواع (مفصولة بفاصلة)" : "Variants, comma separated"} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              )}
              <div className="col-span-2">
                <ImageUpload tenantId={tenant.id} value={editing.image_url ?? null} onChange={(url) => setEditing({ ...editing, image_url: url })} />
              </div>
              <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder={lang === "ar" ? "الوصف" : "Description"} rows={3} className="col-span-2 rounded-xl border border-input bg-background px-4 py-2 text-sm" />
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                {lang === "ar" ? "متاح للعرض" : "Visible to customers"}
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
