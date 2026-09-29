import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader } from "../ui";
import { ImageUpload } from "../ImageUpload";
import { allCategoryEntries, type TenantWithRole } from "../types";

export function ProfilePanel({ tenant, onUpdated }: { tenant: TenantWithRole; onUpdated: () => void }) {
  const { lang } = useSanadak();
  const [form, setForm] = useState({
    name: tenant.name, description: tenant.description ?? "", area: tenant.area ?? "",
    phone: tenant.phone ?? "", email: tenant.email ?? "", image_url: tenant.image_url ?? "", cover_url: tenant.cover_url ?? "",
    category: tenant.category,
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await (supabase.rpc as any)("update_tenant_profile", {
        _tenant: tenant.id,
        _name: form.name,
        _category: form.category,
        _area: form.area || null,
        _phone: form.phone || null,
        _email: form.email || null,
        _description: form.description || null,
        _image_url: form.image_url || null,
        _cover_url: form.cover_url || null,
      });
      if (error) throw error;
      sfx.success();
      toast.success(lang === "ar" ? "تم حفظ الملف الشخصي" : "Profile saved");
      onUpdated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const canEdit = tenant.role === "owner" || tenant.role === "manager";

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "الملف الشخصي للنشاط" : "Business profile"} subtitle={tenant.slug} />
      <form onSubmit={save} className="glass-card rounded-3xl p-6 grid grid-cols-2 gap-3 max-w-2xl">
        <input disabled={!canEdit} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={lang === "ar" ? "اسم النشاط" : "Business name"} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm disabled:opacity-60" />
        <select disabled value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
          title={lang === "ar" ? "تغيير نوع النشاط يتطلب اعتماد المشرف" : "Changing the activity type requires admin approval"}
          className="col-span-2 h-11 rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-60">
          {allCategoryEntries().map(([value, cfg]) => (
            <option key={value} value={value}>{lang === "ar" ? cfg.labelAr : cfg.labelEn}</option>
          ))}
        </select>
        <input disabled={!canEdit} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
          placeholder={lang === "ar" ? "المنطقة" : "Area"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm disabled:opacity-60" />
        <input disabled={!canEdit} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder={lang === "ar" ? "الهاتف" : "Phone"} dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm disabled:opacity-60" />
        <input disabled={!canEdit} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email" dir="ltr" className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm disabled:opacity-60" />
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <div className={`text-xs text-muted-foreground mb-2 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "الشعار" : "Logo"}</div>
            {canEdit ? (
              <ImageUpload tenantId={tenant.id} value={form.image_url || null} onChange={(url) => setForm({ ...form, image_url: url })} />
            ) : (
              form.image_url && <img src={form.image_url} className="h-24 w-24 rounded-2xl object-cover" />
            )}
          </div>
          <div>
            <div className={`text-xs text-muted-foreground mb-2 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "صورة الغلاف" : "Cover image"}</div>
            {canEdit ? (
              <ImageUpload tenantId={tenant.id} value={form.cover_url || null} onChange={(url) => setForm({ ...form, cover_url: url })} shape="wide" />
            ) : (
              form.cover_url && <img src={form.cover_url} className="w-full h-32 rounded-2xl object-cover" />
            )}
          </div>
        </div>
        <textarea disabled={!canEdit} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={lang === "ar" ? "الوصف" : "Description"} rows={4} className="col-span-2 rounded-xl border border-input bg-background px-4 py-2 text-sm disabled:opacity-60" />
        {canEdit && (
          <button disabled={busy} type="submit" className="col-span-2 h-12 rounded-full bg-gradient-brand text-primary-foreground font-medium shadow-glow flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> {lang === "ar" ? "حفظ" : "Save"}
          </button>
        )}
      </form>
    </div>
  );
}
