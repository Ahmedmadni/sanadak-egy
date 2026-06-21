import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, Store, ShieldCheck, ArrowLeft, X, Save,
  Inbox, Users, Check, Clock, ShieldOff, ShieldPlus, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم · سندك" },
      { name: "description", content: "لوحة تحكم سندك: المتاجر، طلبات الانضمام، وإدارة المستخدمين." },
    ],
  }),
  component: AdminPage,
});

type StoreRow = {
  id: string; name: string; category: string; area: string | null;
  phone: string | null; description: string | null; image_url: string | null; created_at: string;
};
type RequestRow = {
  id: string; store_name: string; owner_name: string | null; phone: string | null;
  category: string; area: string | null; description: string | null; image_url: string | null;
  status: string; notes: string | null; submitted_by: string | null; created_at: string;
};
type ProfileRow = { id: string; full_name: string | null; phone: string | null; created_at: string };
type RoleRow = { user_id: string; role: string };

const CATEGORIES: [string, string][] = [
  ["restaurants", "مطاعم"], ["cafes", "كافيهات"], ["shops", "محلات"],
  ["halls", "قاعات أفراح"], ["super", "سوبرماركت"],
  ["pharmacy", "صيدليات"], ["medical", "طبي"],
];

type Tab = "stores" | "requests" | "users";

function AdminPage() {
  const { lang } = useSanadak();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("requests");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

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

  const tabs: { id: Tab; ar: string; en: string; icon: React.ReactNode }[] = [
    { id: "requests", ar: "طلبات الانضمام", en: "Requests", icon: <Inbox className="h-4 w-4" /> },
    { id: "stores", ar: "المتاجر", en: "Stores", icon: <Store className="h-4 w-4" /> },
    { id: "users", ar: "المستخدمون", en: "Users", icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <main className="relative min-h-screen pt-28 pb-20 px-4">
      <div className="absolute inset-0 bg-gradient-hero opacity-50 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--emerald)]" /> Admin
          </div>
          <h1 className={`mt-3 text-4xl md:text-5xl font-bold text-gradient-brand ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "لوحة تحكم سندك" : "Sanadak control center"}
          </h1>
          <p className={`mt-2 text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "إدارة المتاجر، اعتماد طلبات التجار، وصلاحيات المستخدمين." : "Manage stores, approve merchant requests, and user permissions."}
          </p>
        </motion.div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tt) => (
            <button key={tt.id}
              onClick={() => { setTab(tt.id); sfx.tap(); }}
              className={`h-10 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium transition ${tab === tt.id ? "bg-gradient-brand text-primary-foreground shadow-glow" : "glass-panel hover:bg-foreground/5"} ${lang === "ar" ? "font-arabic" : ""}`}>
              {tt.icon} {lang === "ar" ? tt.ar : tt.en}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "requests" && <RequestsPanel />}
          {tab === "stores" && <StoresPanel ownerId={user.id} />}
          {tab === "users" && <UsersPanel currentUserId={user.id} />}
        </div>
      </div>
    </main>
  );
}

/* ============================ REQUESTS ============================ */

function RequestsPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("store_requests" as any).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as unknown as RequestRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (r: RequestRow) => {
    setBusy(r.id);
    try {
      const { error: insErr } = await supabase.from("stores").insert({
        name: r.store_name, category: r.category, area: r.area,
        phone: r.phone, description: r.description, image_url: r.image_url,
      });
      if (insErr) throw insErr;
      const { error: updErr } = await supabase.from("store_requests" as any).update({ status: "approved" }).eq("id", r.id);
      if (updErr) throw updErr;
      sfx.success();
      toast.success(lang === "ar" ? "تمت الموافقة وإضافة المتجر" : "Approved and added to stores");
      load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(null); }
  };
  const reject = async (r: RequestRow) => {
    setBusy(r.id);
    const { error } = await supabase.from("store_requests" as any).update({ status: "rejected" }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { sfx.tap(); toast.success(lang === "ar" ? "تم الرفض" : "Rejected"); load(); }
    setBusy(null);
  };
  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا الطلب؟" : "Delete this request?")) return;
    const { error } = await supabase.from("store_requests" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { load(); }
  };

  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <div className="grid gap-3">
      {rows.length === 0 && (
        <div className={`glass-card rounded-2xl p-10 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
          {lang === "ar" ? "لا توجد طلبات حالياً." : "No requests yet."}
        </div>
      )}
      {[...pending, ...others].map((r) => (
        <motion.div key={r.id} layout className="glass-card rounded-2xl p-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{r.store_name}</div>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {r.category}{r.area ? ` · ${r.area}` : ""}{r.owner_name ? ` · ${r.owner_name}` : ""}{r.phone ? ` · ${r.phone}` : ""}
              </div>
              {r.description && <p className={`text-sm mt-2 text-foreground/80 ${lang === "ar" ? "font-arabic" : ""}`}>{r.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {r.status === "pending" && (
                <>
                  <button disabled={busy === r.id} onClick={() => approve(r)} className="h-9 px-3 rounded-full bg-[var(--emerald)] text-white text-sm inline-flex items-center gap-1 disabled:opacity-50">
                    <Check className="h-4 w-4" /> {lang === "ar" ? "اعتماد" : "Approve"}
                  </button>
                  <button disabled={busy === r.id} onClick={() => reject(r)} className="h-9 px-3 rounded-full bg-destructive/15 text-destructive text-sm inline-flex items-center gap-1 disabled:opacity-50">
                    <X className="h-4 w-4" /> {lang === "ar" ? "رفض" : "Reject"}
                  </button>
                </>
              )}
              <button onClick={() => del(r.id)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string; icon: React.ReactNode }> = {
    pending:  { c: "bg-[var(--ember)]/15 text-[var(--ember)]",   label: "قيد المراجعة", icon: <Clock className="h-3 w-3" /> },
    approved: { c: "bg-[var(--emerald)]/15 text-[var(--emerald)]", label: "معتمد",       icon: <Check className="h-3 w-3" /> },
    rejected: { c: "bg-destructive/15 text-destructive",          label: "مرفوض",        icon: <X className="h-3 w-3" /> },
  };
  const m = map[status] ?? map.pending;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.c}`}>{m.icon} {m.label}</span>;
}

/* ============================ STORES ============================ */

function StoresPanel({ ownerId }: { ownerId: string }) {
  const { lang } = useSanadak();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [editing, setEditing] = useState<Partial<StoreRow> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setStores((data as StoreRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        name: editing.name!, category: editing.category!,
        area: editing.area ?? null, phone: editing.phone ?? null,
        description: editing.description ?? null, image_url: editing.image_url ?? null,
      };
      if (editing.id) {
        const { error } = await supabase.from("stores").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success(lang === "ar" ? "تم التحديث" : "Updated");
      } else {
        const { error } = await supabase.from("stores").insert({ ...payload, owner_id: ownerId });
        if (error) throw error;
        toast.success(lang === "ar" ? "تمت الإضافة" : "Added");
      }
      sfx.success(); setEditing(null); load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا المتجر؟" : "Delete this store?")) return;
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { sfx.tap(); toast.success(lang === "ar" ? "تم الحذف" : "Deleted"); load(); }
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => { setEditing({ category: "restaurants" }); sfx.open(); }} className="bg-gradient-brand text-primary-foreground h-11 px-5 rounded-full inline-flex items-center gap-2 font-medium shadow-glow hover:scale-[1.02] transition">
          <Plus className="h-4 w-4" /> {lang === "ar" ? "متجر جديد" : "New store"}
        </button>
      </div>
      <div className="grid gap-3">
        {stores.length === 0 && (
          <div className={`glass-card rounded-2xl p-10 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "لا توجد متاجر بعد." : "No stores yet."}
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

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-6 w-full max-w-lg shadow-float">
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
    </div>
  );
}

/* ============================ USERS ============================ */

function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const { lang } = useSanadak();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pe) toast.error(pe.message); else setProfiles((p as ProfileRow[]) ?? []);
    if (re) toast.error(re.message); else setRoles((r as RoleRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const isAdminUser = (uid: string) => roles.some((x) => x.user_id === uid && x.role === "admin");

  const grant = async (uid: string) => {
    setBusy(uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" as any });
    if (error) toast.error(error.message); else { sfx.success(); toast.success(lang === "ar" ? "تم منح صلاحية الإدارة" : "Admin granted"); load(); }
    setBusy(null);
  };
  const revoke = async (uid: string) => {
    if (uid === currentUserId && !confirm(lang === "ar" ? "هل تريد سحب صلاحياتك أنت؟" : "Revoke your own admin role?")) return;
    setBusy(uid);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin" as any);
    if (error) toast.error(error.message); else { sfx.tap(); toast.success(lang === "ar" ? "تم سحب الصلاحية" : "Admin revoked"); load(); }
    setBusy(null);
  };

  return (
    <div className="grid gap-3">
      {profiles.length === 0 && (
        <div className={`glass-card rounded-2xl p-10 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
          {lang === "ar" ? "لا يوجد مستخدمون مسجَّلون بعد." : "No registered users yet."}
        </div>
      )}
      {profiles.map((p) => {
        const admin = isAdminUser(p.id);
        const isMe = p.id === currentUserId;
        return (
          <motion.div key={p.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-brand grid place-items-center text-primary-foreground text-sm font-bold shrink-0">
              {(p.full_name ?? "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>
                {p.full_name || (lang === "ar" ? "مستخدم بدون اسم" : "Unnamed user")}
                {isMe && <span className="ms-2 text-[11px] text-muted-foreground">({lang === "ar" ? "أنت" : "you"})</span>}
              </div>
              <div className="text-xs text-muted-foreground truncate" dir="ltr">{p.id}{p.phone ? ` · ${p.phone}` : ""}</div>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${admin ? "bg-[var(--emerald)]/15 text-[var(--emerald)]" : "bg-foreground/10 text-foreground/70"}`}>
              <ShieldCheck className="h-3 w-3" /> {admin ? "Admin" : "User"}
            </span>
            {admin ? (
              <button disabled={busy === p.id} onClick={() => revoke(p.id)} className="h-9 px-3 rounded-full bg-destructive/15 text-destructive text-sm inline-flex items-center gap-1 disabled:opacity-50">
                <ShieldOff className="h-4 w-4" /> {lang === "ar" ? "سحب الصلاحية" : "Revoke"}
              </button>
            ) : (
              <button disabled={busy === p.id} onClick={() => grant(p.id)} className="h-9 px-3 rounded-full bg-[var(--emerald)] text-white text-sm inline-flex items-center gap-1 disabled:opacity-50">
                <ShieldPlus className="h-4 w-4" /> {lang === "ar" ? "منح صلاحية" : "Make admin"}
              </button>
            )}
          </motion.div>
        );
      })}
      <p className={`text-xs text-muted-foreground mt-2 ${lang === "ar" ? "font-arabic" : ""}`}>
        <ExternalLink className="inline h-3 w-3 mr-1" />
        {lang === "ar"
          ? "تظهر هنا فقط الحسابات التي أكملت الملف الشخصي بعد التسجيل."
          : "Only users with a completed profile are listed."}
      </p>
    </div>
  );
}
