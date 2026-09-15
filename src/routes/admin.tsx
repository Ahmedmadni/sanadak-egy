import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, Store, ShieldCheck, ArrowLeft, X, Save,
  Inbox, Users, Check, Clock, ShieldOff, ShieldPlus, ExternalLink,
  LayoutDashboard, Building2, Package, CreditCard, Sparkles, LifeBuoy,
  ScrollText, BadgeCheck, Ban, Menu, TrendingUp, Bot, FileText, Wallet,
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

/* ===================== Types ===================== */
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
type TenantRow = {
  id: string; slug: string; name: string; category: string; area: string | null;
  phone: string | null; email: string | null; image_url: string | null; status: string;
  description: string | null;
  verified_at: string | null; plan_id: string | null; owner_id: string | null; created_at: string;
};
type PlanRow = {
  id: string; code: string; name_ar: string; name_en: string; price_monthly: number;
  currency: string; ai_quota_monthly: number; commission_rate?: number; sort_order: number; is_active: boolean;
};
type SubRow = {
  id: string; tenant_id: string; plan_id: string; status: string;
  current_period_start: string | null; current_period_end: string | null;
};
type AiUsageRow = { tenant_id: string; feature: string; tokens: number; cost: number; period_month: string };
type TicketRow = {
  id: string; tenant_id: string | null; user_id: string | null; subject: string;
  body: string | null; status: string; priority: string; created_at: string;
};
type AuditRow = {
  id: string; actor_id: string | null; tenant_id: string | null; action: string;
  target_table: string | null; target_id: string | null; created_at: string;
};

const CATEGORIES: [string, string][] = [
  ["restaurants", "مطاعم"], ["cafes", "كافيهات"], ["shops", "محلات"],
  ["halls", "قاعات أفراح"], ["super", "سوبرماركت"],
  ["pharmacy", "صيدليات"], ["medical", "طبي"], ["salon", "صالونات"],
];

type SectionId =
  | "overview" | "tenants" | "requests" | "legacy_requests" | "stores" | "users"
  | "plans" | "activity_types" | "subscriptions" | "payments" | "ai" | "tickets" | "audit";

/* ===================== Root ===================== */
function AdminPage() {
  const { lang } = useSanadak();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [section, setSection] = useState<SectionId>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const claimFirstAdmin = async () => {
    if (!user) return;
    setClaiming(true);
    setClaimError(null);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" as any });
    if (error) {
      setClaimError(error.message);
      setClaiming(false);
      return;
    }
    sfx.success();
    window.location.reload();
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
              ? "هذه الصفحة مخصصة للمشرفين فقط."
              : "Admins only."}
          </p>
          <p className="mt-3 text-xs text-muted-foreground" dir="ltr">User ID: {user.id}</p>

          <button
            onClick={claimFirstAdmin}
            disabled={claiming}
            className="mt-5 w-full h-11 rounded-full bg-gradient-brand text-primary-foreground text-sm font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldPlus className="h-4 w-4" />
            {claiming
              ? (lang === "ar" ? "جارٍ المحاولة..." : "Trying...")
              : (lang === "ar" ? "المطالبة بصلاحية الأدمن الأول" : "Claim first admin")}
          </button>
          <p className={`mt-2 text-[11px] text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar"
              ? "يعمل فقط إذا لم يوجد أي أدمن على المنصة بعد."
              : "Only works if no admin exists on the platform yet."}
          </p>
          {claimError && (
            <p className={`mt-2 text-xs text-destructive ${lang === "ar" ? "font-arabic" : ""}`} dir="auto">{claimError}</p>
          )}

          <Link to="/" className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--emerald)]"><ArrowLeft className="h-4 w-4" /> Home</Link>
        </div>
      </main>
    );
  }

  const items: { id: SectionId; ar: string; en: string; icon: React.ReactNode }[] = [
    { id: "overview", ar: "نظرة عامة", en: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "tenants", ar: "المتاجر (Tenants)", en: "Tenants", icon: <Building2 className="h-4 w-4" /> },
    { id: "requests", ar: "طلبات الانضمام", en: "Onboarding", icon: <Inbox className="h-4 w-4" /> },
    { id: "legacy_requests", ar: "طلبات قديمة (أرشيف)", en: "Legacy requests", icon: <ExternalLink className="h-4 w-4" /> },
    { id: "stores", ar: "المتاجر القديمة", en: "Legacy stores", icon: <Store className="h-4 w-4" /> },
    { id: "users", ar: "المستخدمون", en: "Users", icon: <Users className="h-4 w-4" /> },
    { id: "plans", ar: "الباقات", en: "Plans", icon: <Package className="h-4 w-4" /> },
    { id: "activity_types", ar: "أنواع الأنشطة", en: "Activity types", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "subscriptions", ar: "الاشتراكات", en: "Subscriptions", icon: <CreditCard className="h-4 w-4" /> },
    { id: "payments", ar: "المدفوعات والعمولات", en: "Payments & commission", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "ai", ar: "استهلاك الذكاء", en: "AI usage", icon: <Sparkles className="h-4 w-4" /> },
    { id: "tickets", ar: "تذاكر الدعم", en: "Support", icon: <LifeBuoy className="h-4 w-4" /> },
    { id: "audit", ar: "سجل النشاط", en: "Audit log", icon: <ScrollText className="h-4 w-4" /> },
  ];

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="absolute inset-0 bg-gradient-hero opacity-40 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        {/* Mobile bar */}
        <div className="flex lg:hidden items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--emerald)]" /> Admin
          </div>
          <button onClick={() => setNavOpen((v) => !v)} className="h-10 w-10 grid place-items-center glass-panel rounded-full"><Menu className="h-4 w-4" /></button>
        </div>

        {/* Sidebar */}
        <aside className={`${navOpen ? "block" : "hidden"} lg:block`}>
          <div className="glass-card rounded-2xl p-3 lg:sticky lg:top-24">
            <div className="hidden lg:flex items-center gap-2 px-2 py-2">
              <ShieldCheck className="h-4 w-4 text-[var(--emerald)]" />
              <div className={`text-sm font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "مركز التحكم" : "Control center"}</div>
            </div>
            <nav className="mt-1 grid gap-1">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => { setSection(it.id); setNavOpen(false); sfx.tap(); }}
                  className={`w-full h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-medium transition text-start ${section === it.id ? "bg-gradient-brand text-primary-foreground shadow-glow" : "hover:bg-foreground/5"} ${lang === "ar" ? "font-arabic" : ""}`}
                >
                  {it.icon}
                  <span className="flex-1 text-start">{lang === "ar" ? it.ar : it.en}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0">
          {section === "overview" && <OverviewPanel onJump={setSection} />}
          {section === "tenants" && <TenantsPanel adminId={user.id} />}
          {section === "requests" && <OnboardingPanel adminId={user.id} />}
          {section === "legacy_requests" && <RequestsPanel />}
          {section === "stores" && <StoresPanel ownerId={user.id} />}
          {section === "users" && <UsersPanel currentUserId={user.id} />}
          {section === "plans" && <PlansPanel />}
          {section === "activity_types" && <ActivityTypesPanel />}
          {section === "subscriptions" && <SubscriptionsPanel />}
          {section === "payments" && <PaymentsPanel />}
          {section === "ai" && <AiUsagePanel />}
          {section === "tickets" && <TicketsPanel />}
          {section === "audit" && <AuditPanel />}
        </section>
      </div>
    </main>
  );
}

/* ===================== Helpers ===================== */
function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { lang } = useSanadak();
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <h1 className={`text-2xl md:text-3xl font-bold text-gradient-brand ${lang === "ar" ? "font-arabic" : ""}`}>{title}</h1>
        {subtitle && <p className={`mt-1 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  const { lang } = useSanadak();
  return <div className={`glass-card rounded-2xl p-10 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{text}</div>;
}
function StatusPill({ status, map }: { status: string; map?: Record<string, string> }) {
  const cls = (map?.[status]) ?? "bg-foreground/10 text-foreground/70";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{status}</span>;
}
const tenantStatusMap: Record<string, string> = {
  active: "bg-[var(--emerald)]/15 text-[var(--emerald)]",
  pending: "bg-[var(--ember)]/15 text-[var(--ember)]",
  hidden: "bg-foreground/10 text-foreground/60",
  suspended: "bg-destructive/15 text-destructive",
  rejected: "bg-destructive/15 text-destructive",
};
function slugify(s: string) {
  return s.toString().trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "")
    .slice(0, 60) || `t-${Math.random().toString(36).slice(2, 8)}`;
}

/* ===================== Overview ===================== */
function OverviewPanel({ onJump }: { onJump: (s: SectionId) => void }) {
  const { lang } = useSanadak();
  const [stats, setStats] = useState({ tenants: 0, pending: 0, active: 0, subs: 0, requests: 0, tickets: 0, aiOps: 0, revenue: 0 });
  useEffect(() => {
    (async () => {
      const [t, p, a, s, r, k, ai] = await Promise.all([
        supabase.from("tenants" as any).select("id", { count: "exact", head: true }),
        supabase.from("tenants" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("tenants" as any).select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("subscriptions" as any).select("plan_id, status, plans(price_monthly)"),
        supabase.from("store_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("support_tickets" as any).select("id", { count: "exact", head: true }).neq("status", "closed"),
        supabase.from("ai_usage" as any).select("tokens"),
      ]);
      const subsArr = (s.data as any[]) ?? [];
      const revenue = subsArr.filter((x) => x.status === "active")
        .reduce((sum, x) => sum + Number(x.plans?.price_monthly ?? 0), 0);
      const aiOps = ((ai.data as any[]) ?? []).reduce((acc, x) => acc + (x.tokens ?? 0), 0);
      setStats({
        tenants: t.count ?? 0, pending: p.count ?? 0, active: a.count ?? 0,
        subs: subsArr.filter((x) => x.status === "active").length,
        requests: r.count ?? 0, tickets: k.count ?? 0, aiOps, revenue,
      });
    })();
  }, []);

  const cards = [
    { label: lang === "ar" ? "إجمالي المتاجر" : "Total tenants", value: stats.tenants, icon: <Building2 className="h-4 w-4" />, jump: "tenants" as SectionId },
    { label: lang === "ar" ? "متاجر نشطة" : "Active", value: stats.active, icon: <BadgeCheck className="h-4 w-4" />, jump: "tenants" as SectionId },
    { label: lang === "ar" ? "بانتظار الاعتماد" : "Pending", value: stats.pending, icon: <Clock className="h-4 w-4" />, jump: "tenants" as SectionId },
    { label: lang === "ar" ? "طلبات جديدة" : "New requests", value: stats.requests, icon: <Inbox className="h-4 w-4" />, jump: "requests" as SectionId },
    { label: lang === "ar" ? "اشتراكات فعّالة" : "Active subs", value: stats.subs, icon: <CreditCard className="h-4 w-4" />, jump: "subscriptions" as SectionId },
    { label: lang === "ar" ? "إيراد شهري متوقّع" : "Estimated MRR", value: `${stats.revenue.toFixed(0)} EGP`, icon: <TrendingUp className="h-4 w-4" />, jump: "subscriptions" as SectionId },
    { label: lang === "ar" ? "استهلاك الذكاء" : "AI tokens", value: stats.aiOps, icon: <Bot className="h-4 w-4" />, jump: "ai" as SectionId },
    { label: lang === "ar" ? "تذاكر مفتوحة" : "Open tickets", value: stats.tickets, icon: <LifeBuoy className="h-4 w-4" />, jump: "tickets" as SectionId },
  ];

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "نظرة عامة" : "Overview"} subtitle={lang === "ar" ? "ملخّص حيّ لأداء منصة سندك." : "Live snapshot of platform performance."} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <motion.button
            key={c.label}
            onClick={() => onJump(c.jump)}
            whileHover={{ y: -2 }}
            className="glass-card rounded-2xl p-4 text-start hover:shadow-glow transition"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs">{c.label}</span>
              {c.icon}
            </div>
            <div className="mt-2 text-2xl font-bold text-gradient-brand">{c.value}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ===================== Tenants ===================== */
function TenantsPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const { data, error } = await supabase.from("tenants" as any).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows((data as unknown as TenantRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    const patch: any = { status };
    if (status === "active") patch.verified_at = new Date().toISOString();
    const { error } = await supabase.from("tenants" as any).update(patch).eq("id", id);
    if (error) toast.error(error.message); else { sfx.success(); load(); }
    setBusy(null);
  };
  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا المتجر نهائياً؟" : "Delete tenant permanently?")) return;
    const { error } = await supabase.from("tenants" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const filtered = rows.filter((r) => filter === "all" ? true : r.status === filter);

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "المتاجر (Tenants)" : "Tenants"}
        subtitle={lang === "ar" ? "اعتماد، إخفاء، وتعليق المتاجر على المنصة." : "Verify, hide, and suspend platform tenants."}
      />
      <p className={`text-xs text-muted-foreground mb-3 ${lang === "ar" ? "font-arabic" : ""}`}>
        {lang === "ar" ? "الطلبات الجديدة (pending) تُعتمد من تبويب \"طلبات الانضمام\" بعد التحقق من السداد — هذه الصفحة لإدارة عمر المتجر بعد الاعتماد." : "New (pending) requests are approved from the Onboarding tab after payment verification — this page manages a tenant's lifecycle after approval."}
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["all", "active", "pending", "hidden", "suspended", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`h-9 px-3 rounded-full text-xs ${filter === s ? "bg-gradient-brand text-primary-foreground" : "glass-panel"}`}>
            {s}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <EmptyState text={lang === "ar" ? "لا توجد متاجر." : "No tenants."} />
        : (
          <div className="grid gap-3">
            {filtered.map((t) => (
              <motion.div key={t.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
                  {t.image_url ? <img src={t.image_url} alt={t.name} className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>{t.name}</div>
                    <StatusPill status={t.status} map={tenantStatusMap} />
                    {t.verified_at && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--emerald)]/10 text-[var(--emerald)] text-[11px] px-2 py-0.5"><BadgeCheck className="h-3 w-3" /> verified</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" dir="ltr">
                    /{t.slug} · {t.category}{t.area ? ` · ${t.area}` : ""}{t.phone ? ` · ${t.phone}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {t.status !== "active" && t.status !== "pending" && (
                    <button disabled={busy === t.id} onClick={() => setStatus(t.id, "active")}
                      className="h-9 px-3 rounded-full bg-[var(--emerald)] text-white text-xs inline-flex items-center gap-1 disabled:opacity-50">
                      <Check className="h-3 w-3" /> {lang === "ar" ? "إعادة تفعيل" : "Reactivate"}
                    </button>
                  )}
                  {t.status !== "hidden" && (
                    <button disabled={busy === t.id} onClick={() => setStatus(t.id, "hidden")}
                      className="h-9 px-3 rounded-full glass-panel text-xs inline-flex items-center gap-1 disabled:opacity-50">
                      <ShieldOff className="h-3 w-3" /> {lang === "ar" ? "إخفاء" : "Hide"}
                    </button>
                  )}
                  {t.status !== "suspended" && (
                    <button disabled={busy === t.id} onClick={() => setStatus(t.id, "suspended")}
                      className="h-9 px-3 rounded-full bg-destructive/15 text-destructive text-xs inline-flex items-center gap-1 disabled:opacity-50">
                      <Ban className="h-3 w-3" /> {lang === "ar" ? "تعليق" : "Suspend"}
                    </button>
                  )}
                  <button onClick={() => del(t.id)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ===================== Onboarding (unified pending tenants) ===================== */
const DOC_LABELS: Record<string, [string, string]> = {
  commercial_register: ["السجل التجاري", "Commercial register"],
  owner_id: ["بطاقة الرقم القومي", "Owner ID"],
  activity_license: ["ترخيص النشاط", "Activity license"],
  payment_receipt: ["إيصال السداد", "Payment receipt"],
};

function OnboardingPanel({ adminId }: { adminId: string }) {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [plansById, setPlansById] = useState<Record<string, PlanRow>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data: tenants, error } = await supabase.from("tenants" as any).select("*").eq("status", "pending").order("created_at", { ascending: true });
    if (error) { toast.error(error.message); return; }
    const list = (tenants as unknown as TenantRow[]) ?? [];
    setRows(list);
    if (list.length === 0) return;
    const ids = list.map((t) => t.id);
    const [{ data: d }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("tenant_documents" as any).select("*").in("tenant_id", ids).order("created_at", { ascending: false }),
      supabase.from("subscriptions" as any).select("*").in("tenant_id", ids).order("current_period_end", { ascending: false }),
      supabase.from("plans" as any).select("*"),
    ]);
    const docsByTenant: Record<string, any[]> = {};
    ((d as any[]) ?? []).forEach((doc) => { (docsByTenant[doc.tenant_id] ??= []).push(doc); });
    setDocs(docsByTenant);
    const subByTenant: Record<string, any> = {};
    ((s as any[]) ?? []).forEach((sub) => { if (!subByTenant[sub.tenant_id]) subByTenant[sub.tenant_id] = sub; });
    setSubs(subByTenant);
    const planMap: Record<string, PlanRow> = {};
    ((p as any[]) ?? []).forEach((pl) => { planMap[pl.id] = pl; });
    setPlansById(planMap);
  };
  useEffect(() => { load(); }, []);

  const viewDocument = async (path: string) => {
    const { data, error } = await supabase.storage.from("tenant-documents").createSignedUrl(path, 600);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const verifyPayment = async (tenantId: string) => {
    const sub = subs[tenantId];
    if (!sub) return;
    setBusy(tenantId);
    const { error } = await supabase.from("subscriptions" as any)
      .update({ payment_verified_at: new Date().toISOString(), payment_verified_by: adminId })
      .eq("id", sub.id);
    if (error) toast.error(error.message); else { sfx.success(); load(); }
    setBusy(null);
  };

  const approve = async (t: TenantRow) => {
    setBusy(t.id);
    const { error } = await supabase.from("tenants" as any).update({ status: "active", verified_at: new Date().toISOString() }).eq("id", t.id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    if (t.owner_id) {
      await supabase.from("notifications" as any).insert({
        user_id: t.owner_id, tenant_id: t.id, kind: "tenant_approved",
        title: lang === "ar" ? "تم اعتماد نشاطك" : "Your business was approved",
        body: lang === "ar" ? `تم اعتماد "${t.name}" وأصبح ظاهراً للعملاء الآن.` : `"${t.name}" is now live and visible to customers.`,
      });
    }
    sfx.success();
    toast.success(lang === "ar" ? "تم الاعتماد" : "Approved");
    load();
    setBusy(null);
  };

  const reject = async (t: TenantRow) => {
    setBusy(t.id);
    const { error } = await supabase.from("tenants" as any).update({ status: "rejected" }).eq("id", t.id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    if (t.owner_id) {
      await supabase.from("notifications" as any).insert({
        user_id: t.owner_id, tenant_id: t.id, kind: "tenant_rejected",
        title: lang === "ar" ? "تم رفض طلب الانضمام" : "Your request was rejected",
        body: reason || (lang === "ar" ? "يرجى مراجعة بياناتك ومستنداتك وإعادة المحاولة." : "Please review your information and documents and try again."),
      });
    }
    sfx.tap();
    toast.success(lang === "ar" ? "تم الرفض" : "Rejected");
    setRejecting(null); setReason("");
    load();
    setBusy(null);
  };

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "طلبات الانضمام" : "Onboarding"}
        subtitle={lang === "ar" ? "راجع البيانات والمستندات، تحقق من السداد، ثم اعتمد." : "Review info, documents and payment, then approve."}
      />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد طلبات بانتظار المراجعة." : "No requests awaiting review."} />}
      <div className="grid gap-4">
        {rows.map((t) => {
          const sub = subs[t.id];
          const plan = sub ? plansById[sub.plan_id] : undefined;
          const tenantDocs = docs[t.id] ?? [];
          const paymentVerified = !!sub?.payment_verified_at;
          return (
            <motion.div key={t.id} layout className="glass-card rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className={`font-semibold text-lg ${lang === "ar" ? "font-arabic" : ""}`}>{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.category}{t.area ? ` · ${t.area}` : ""}{t.phone ? ` · ${t.phone}` : ""}</div>
                  {t.description && <p className={`text-sm text-foreground/80 mt-2 max-w-lg ${lang === "ar" ? "font-arabic" : ""}`}>{t.description}</p>}
                </div>
                <StatusPill status="pending" map={tenantStatusMap} />
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <div className={`text-xs font-semibold text-muted-foreground mb-2 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "الباقة والسداد" : "Plan & payment"}</div>
                  <div className="glass-panel rounded-xl p-3 text-sm space-y-1.5">
                    <div>{lang === "ar" ? "الباقة المطلوبة" : "Requested plan"}: <strong>{plan ? (lang === "ar" ? plan.name_ar : plan.name_en) : "—"}</strong> {plan && `(${plan.price_monthly} ${plan.currency}/mo)`}</div>
                    <div>{lang === "ar" ? "وسيلة الدفع" : "Payment method"}: <strong>{sub?.payment_method ?? "—"}</strong></div>
                    <div>{lang === "ar" ? "المرجع" : "Reference"}: <span dir="ltr">{sub?.payment_reference ?? "—"}</span></div>
                    <button
                      disabled={busy === t.id || paymentVerified || !sub}
                      onClick={() => verifyPayment(t.id)}
                      className={`mt-1 h-9 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-60 ${paymentVerified ? "bg-[var(--emerald)]/15 text-[var(--emerald)]" : "bg-[var(--ember)] text-white"}`}
                    >
                      <Wallet className="h-3.5 w-3.5" /> {paymentVerified ? (lang === "ar" ? "تم التحقق من السداد" : "Payment verified") : (lang === "ar" ? "تأكيد التحقق من السداد" : "Verify payment")}
                    </button>
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-semibold text-muted-foreground mb-2 ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? "المستندات" : "Documents"}</div>
                  <div className="grid gap-1.5">
                    {tenantDocs.length === 0 && <div className="text-xs text-muted-foreground">{lang === "ar" ? "لم تُرفع مستندات بعد." : "No documents uploaded yet."}</div>}
                    {tenantDocs.map((doc) => (
                      <button key={doc.id} onClick={() => viewDocument(doc.file_path)} className="glass-panel rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-foreground/5">
                        <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> {lang === "ar" ? (DOC_LABELS[doc.kind]?.[0] ?? doc.kind) : (DOC_LABELS[doc.kind]?.[1] ?? doc.kind)}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  disabled={busy === t.id || !paymentVerified}
                  onClick={() => approve(t)}
                  title={!paymentVerified ? (lang === "ar" ? "يجب تأكيد السداد أولاً" : "Verify payment first") : undefined}
                  className="h-9 px-4 rounded-full bg-[var(--emerald)] text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {lang === "ar" ? "اعتماد" : "Approve"}
                </button>
                {rejecting === t.id ? (
                  <div className="flex items-center gap-2">
                    <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={lang === "ar" ? "سبب الرفض" : "Rejection reason"} className="h-9 rounded-full border border-input bg-background px-3 text-xs w-56" />
                    <button disabled={busy === t.id} onClick={() => reject(t)} className="h-9 px-3 rounded-full bg-destructive/15 text-destructive text-xs">{lang === "ar" ? "تأكيد الرفض" : "Confirm"}</button>
                    <button onClick={() => { setRejecting(null); setReason(""); }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => setRejecting(t.id)} className="h-9 px-4 rounded-full bg-destructive/15 text-destructive text-sm inline-flex items-center gap-1.5">
                    <X className="h-4 w-4" /> {lang === "ar" ? "رفض" : "Reject"}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== Legacy WhatsApp requests ===================== */
function RequestsPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("store_requests" as any).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows((data as unknown as RequestRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (r: RequestRow) => {
    setBusy(r.id);
    try {
      // Create tenant (new model)
      const slug = slugify(r.store_name);
      const { error: tenErr } = await supabase.from("tenants" as any).insert({
        slug, name: r.store_name, category: r.category, area: r.area,
        phone: r.phone, description: r.description, image_url: r.image_url,
        owner_id: r.submitted_by, status: "active", verified_at: new Date().toISOString(),
      } as any);
      if (tenErr) throw tenErr;
      // Keep legacy stores in sync (Phase 6 will retire it)
      await supabase.from("stores").insert({
        name: r.store_name, category: r.category, area: r.area,
        phone: r.phone, description: r.description, image_url: r.image_url,
      });
      const { error: updErr } = await supabase.from("store_requests" as any).update({ status: "approved" }).eq("id", r.id);
      if (updErr) throw updErr;
      sfx.success();
      toast.success(lang === "ar" ? "تمت الموافقة وإنشاء المتجر" : "Approved and tenant created");
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
    if (!confirm(lang === "ar" ? "حذف هذا الطلب؟" : "Delete request?")) return;
    const { error } = await supabase.from("store_requests" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "طلبات الانضمام" : "Join requests"} subtitle={lang === "ar" ? "اعتماد طلبات التجار وفتح حساب متجرهم." : "Approve merchant requests."} />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد طلبات." : "No requests."} />}
      <div className="grid gap-3">
        {[...pending, ...others].map((r) => (
          <motion.div key={r.id} layout className="glass-card rounded-2xl p-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0"><Store className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{r.store_name}</div>
                  <StatusPill status={r.status} map={{ pending: "bg-[var(--ember)]/15 text-[var(--ember)]", approved: "bg-[var(--emerald)]/15 text-[var(--emerald)]", rejected: "bg-destructive/15 text-destructive" }} />
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
    </div>
  );
}

/* ===================== Legacy stores ===================== */
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
      } else {
        const { error } = await supabase.from("stores").insert({ ...payload, owner_id: ownerId });
        if (error) throw error;
      }
      sfx.success(); setEditing(null); load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف هذا المتجر؟" : "Delete?")) return;
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "المتاجر القديمة" : "Legacy stores"}
        subtitle={lang === "ar" ? "للتوافق مع البيانات السابقة قبل نموذج Tenants." : "Legacy table preserved for backward compatibility."}
        action={
          <button onClick={() => { setEditing({ category: "restaurants" }); sfx.open(); }} className="bg-gradient-brand text-primary-foreground h-10 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium shadow-glow">
            <Plus className="h-4 w-4" /> {lang === "ar" ? "متجر" : "New"}
          </button>
        }
      />
      <div className="grid gap-3">
        {stores.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد متاجر." : "No stores."} />}
        {stores.map((s) => (
          <motion.div key={s.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
              {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" /> : <Store className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>{s.name}</div>
              <div className="text-xs text-muted-foreground truncate">{s.category}{s.area ? ` · ${s.area}` : ""}{s.phone ? ` · ${s.phone}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditing(s); sfx.tap(); }} className="h-9 w-9 grid place-items-center rounded-full hover:bg-foreground/5"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(s.id)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-6 w-full max-w-lg shadow-float">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{editing.id ? (lang === "ar" ? "تعديل" : "Edit") : (lang === "ar" ? "متجر جديد" : "New")}</h2>
              <button type="button" onClick={() => setEditing(null)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={lang === "ar" ? "اسم المتجر" : "Name"} className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <select required value={editing.category ?? "restaurants"} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={editing.area ?? ""} onChange={(e) => setEditing({ ...editing, area: e.target.value })} placeholder={lang === "ar" ? "المنطقة" : "Area"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone" dir="ltr" className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="Image URL" dir="ltr" className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder={lang === "ar" ? "الوصف" : "Description"} rows={3} className="col-span-2 rounded-xl border border-input bg-background px-4 py-2 text-sm" />
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

/* ===================== Users ===================== */
const ASSIGNABLE_ROLES = ["admin", "platform_admin", "moderator", "business_owner", "store_manager", "employee"] as const;

function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const { lang } = useSanadak();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pe) toast.error(pe.message); else setProfiles((p as ProfileRow[]) ?? []);
    if (re) toast.error(re.message); else setRoles((r as RoleRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const rolesOf = (uid: string) => roles.filter((x) => x.user_id === uid).map((x) => x.role);
  const isAdminUser = (uid: string) => rolesOf(uid).includes("admin");

  const grant = async (uid: string, role: string) => {
    setBusy(uid);
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: role as any });
    if (error) toast.error(error.message); else { sfx.success(); load(); }
    setBusy(null);
    setPickerFor(null);
  };
  const revoke = async (uid: string, role: string) => {
    if (uid === currentUserId && role === "admin" && !confirm(lang === "ar" ? "سحب صلاحياتك أنت؟" : "Revoke your own admin?")) return;
    setBusy(uid);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role as any);
    if (error) toast.error(error.message); else { sfx.tap(); load(); }
    setBusy(null);
  };

  const roleLabel = (r: string) => ({
    admin: "Admin", platform_admin: "Platform admin", moderator: "Moderator",
    business_owner: "Business owner", store_manager: "Store manager", employee: "Employee",
  }[r] ?? r);

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "المستخدمون والصلاحيات" : "Users & roles"} subtitle={lang === "ar" ? "إدارة أدوار المنصة (RBAC)." : "Manage platform roles (RBAC)."} />
      <div className="grid gap-3">
        {profiles.length === 0 && <EmptyState text={lang === "ar" ? "لا يوجد مستخدمون." : "No users."} />}
        {profiles.map((p) => {
          const userRoles = rolesOf(p.id);
          const isMe = p.id === currentUserId;
          return (
            <motion.div key={p.id} layout className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-brand grid place-items-center text-primary-foreground text-sm font-bold shrink-0">
                {(p.full_name ?? "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>
                  {p.full_name || (lang === "ar" ? "بدون اسم" : "Unnamed")}
                  {isMe && <span className="ms-2 text-[11px] text-muted-foreground">({lang === "ar" ? "أنت" : "you"})</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate" dir="ltr">{p.id}{p.phone ? ` · ${p.phone}` : ""}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {userRoles.length === 0 && <span className="text-[11px] text-muted-foreground">{lang === "ar" ? "بدون دور" : "No role"}</span>}
                  {userRoles.map((r) => (
                    <span key={r} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${r === "admin" ? "bg-[var(--emerald)]/15 text-[var(--emerald)]" : "bg-foreground/10 text-foreground/70"}`}>
                      <ShieldCheck className="h-3 w-3" /> {roleLabel(r)}
                      <button disabled={busy === p.id} onClick={() => revoke(p.id, r)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative">
                <button disabled={busy === p.id} onClick={() => setPickerFor(pickerFor === p.id ? null : p.id)} className="h-9 px-3 rounded-full bg-[var(--emerald)] text-white text-sm inline-flex items-center gap-1 disabled:opacity-50">
                  <ShieldPlus className="h-4 w-4" /> {lang === "ar" ? "منح دور" : "Grant role"}
                </button>
                {pickerFor === p.id && (
                  <div className="absolute z-20 top-full mt-1 end-0 glass-card rounded-xl p-1 min-w-[180px]">
                    {ASSIGNABLE_ROLES.filter((r) => !userRoles.includes(r)).map((r) => (
                      <button key={r} onClick={() => grant(p.id, r)} className="w-full text-start px-3 py-2 rounded-lg text-sm hover:bg-foreground/5">
                        {roleLabel(r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <p className={`text-xs text-muted-foreground mt-2 ${lang === "ar" ? "font-arabic" : ""}`}>
          <ExternalLink className="inline h-3 w-3 mr-1" />
          {lang === "ar" ? "تظهر فقط الحسابات التي أكملت الملف الشخصي. أدوار المتاجر (owner/manager/employee) تُدار من صفحة كل تاجر." : "Only completed profiles are shown. Per-store roles (owner/manager/employee) are managed on each tenant."}
        </p>
      </div>
    </div>
  );
}

/* ===================== Plans ===================== */
function PlansPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [editing, setEditing] = useState<Partial<PlanRow> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("plans" as any).select("*").order("sort_order");
    if (error) toast.error(error.message); else setRows((data as unknown as PlanRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const payload: any = {
      code: editing.code, name_ar: editing.name_ar, name_en: editing.name_en,
      price_monthly: Number(editing.price_monthly ?? 0),
      currency: editing.currency ?? "EGP",
      ai_quota_monthly: Number(editing.ai_quota_monthly ?? 0),
      commission_rate: Number((editing as any).commission_rate ?? 0),
      sort_order: Number(editing.sort_order ?? 0),
      is_active: editing.is_active ?? true,
    };
    const q = editing.id
      ? supabase.from("plans" as any).update(payload).eq("id", editing.id)
      : supabase.from("plans" as any).insert(payload);
    const { error } = await q;
    if (error) toast.error(error.message); else { sfx.success(); setEditing(null); load(); }
    setBusy(false);
  };
  const del = async (id: string) => {
    if (!confirm(lang === "ar" ? "حذف الباقة؟" : "Delete plan?")) return;
    const { error } = await supabase.from("plans" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "الباقات" : "Plans"}
        subtitle={lang === "ar" ? "تحكّم في الأسعار وحدود الذكاء." : "Pricing and AI quotas."}
        action={
          <button onClick={() => setEditing({ currency: "EGP", is_active: true, sort_order: rows.length + 1 })} className="bg-gradient-brand text-primary-foreground h-10 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium shadow-glow">
            <Plus className="h-4 w-4" /> {lang === "ar" ? "باقة" : "New plan"}
          </button>
        }
      />
      <div className="grid md:grid-cols-3 gap-3">
        {rows.map((p) => (
          <div key={p.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className={`text-xs uppercase tracking-wide text-muted-foreground`}>{p.code}</div>
                <div className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? p.name_ar : p.name_en}</div>
              </div>
              {!p.is_active && <StatusPill status="off" />}
            </div>
            <div className="mt-3 text-3xl font-bold text-gradient-brand">{p.price_monthly} <span className="text-sm font-normal text-muted-foreground">{p.currency}/mo</span></div>
            <div className="mt-2 text-xs text-muted-foreground"><Sparkles className="inline h-3 w-3 mr-1" />{p.ai_quota_monthly} AI ops</div>
            <div className="mt-1 text-xs text-muted-foreground">{lang === "ar" ? "عمولة المنصة" : "Platform commission"}: {(p as any).commission_rate ?? 0}%</div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setEditing(p)} className="h-9 px-3 rounded-full glass-panel text-xs inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> {lang === "ar" ? "تعديل" : "Edit"}</button>
              <button onClick={() => del(p.id)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد باقات." : "No plans."} />}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-6 w-full max-w-lg shadow-float">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{editing.id ? (lang === "ar" ? "تعديل الباقة" : "Edit plan") : (lang === "ar" ? "باقة جديدة" : "New plan")}</h2>
              <button type="button" onClick={() => setEditing(null)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <input required value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="code (free/pro/premium)" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input required type="number" step="0.01" value={editing.price_monthly ?? 0} onChange={(e) => setEditing({ ...editing, price_monthly: Number(e.target.value) })} placeholder="price/mo" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input required value={editing.name_ar ?? ""} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} placeholder="الاسم بالعربية" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input required value={editing.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} placeholder="Name (EN)" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.currency ?? "EGP"} onChange={(e) => setEditing({ ...editing, currency: e.target.value })} placeholder="currency" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input type="number" value={editing.ai_quota_monthly ?? 0} onChange={(e) => setEditing({ ...editing, ai_quota_monthly: Number(e.target.value) })} placeholder="AI quota/mo" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input type="number" step="0.1" value={(editing as any).commission_rate ?? 0} onChange={(e) => setEditing({ ...editing, commission_rate: Number(e.target.value) } as any)} placeholder={lang === "ar" ? "عمولة المنصة %" : "Commission %"} dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} placeholder="sort" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <label className="h-11 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                {lang === "ar" ? "مفعّلة" : "Active"}
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

/* ===================== Activity types ===================== */
type ActivityTypeRow = {
  code: string; label_ar: string; label_en: string; catalog_kind: string;
  catalog_label_ar: string; catalog_label_en: string; staff_label_ar: string; staff_label_en: string;
  has_orders: boolean; has_bookings: boolean; uses_variants: boolean; uses_stock: boolean;
  uses_duration: boolean; uses_barcode: boolean; is_active: boolean; sort_order: number;
};

function ActivityTypesPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<ActivityTypeRow[]>([]);
  const [editing, setEditing] = useState<Partial<ActivityTypeRow> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("activity_types" as any).select("*").order("sort_order");
    if (error) toast.error(error.message); else setRows((data as unknown as ActivityTypeRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const flags: { key: keyof ActivityTypeRow; ar: string; en: string }[] = [
    { key: "has_orders", ar: "طلبات", en: "Orders" },
    { key: "has_bookings", ar: "حجوزات", en: "Bookings" },
    { key: "uses_variants", ar: "أحجام/أنواع", en: "Variants" },
    { key: "uses_stock", ar: "مخزون", en: "Stock" },
    { key: "uses_duration", ar: "مدة", en: "Duration" },
    { key: "uses_barcode", ar: "باركود ووحدة", en: "Barcode/unit" },
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const payload: any = {
      code: editing.code, label_ar: editing.label_ar, label_en: editing.label_en,
      catalog_kind: editing.catalog_kind ?? "product",
      catalog_label_ar: editing.catalog_label_ar, catalog_label_en: editing.catalog_label_en,
      staff_label_ar: editing.staff_label_ar || "الفريق", staff_label_en: editing.staff_label_en || "Staff",
      has_orders: editing.has_orders ?? true, has_bookings: editing.has_bookings ?? false,
      uses_variants: editing.uses_variants ?? false, uses_stock: editing.uses_stock ?? false,
      uses_duration: editing.uses_duration ?? false, uses_barcode: editing.uses_barcode ?? false,
      is_active: editing.is_active ?? true, sort_order: Number(editing.sort_order ?? rows.length + 1),
    };
    const { error } = await supabase.from("activity_types" as any).upsert(payload, { onConflict: "code" });
    if (error) toast.error(error.message); else { sfx.success(); setEditing(null); load(); }
    setBusy(false);
  };

  const toggleActive = async (r: ActivityTypeRow) => {
    const { error } = await supabase.from("activity_types" as any).update({ is_active: !r.is_active }).eq("code", r.code);
    if (error) toast.error(error.message); else { sfx.tap(); load(); }
  };

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "أنواع الأنشطة" : "Activity types"}
        subtitle={lang === "ar" ? "أضف نوع نشاط جديد (مثل: مغسلة سيارات، مركز تدريب) بدون الحاجة لتعديل الكود." : "Add a new activity type (e.g. car wash, training center) without a code change."}
        action={
          <button onClick={() => setEditing({ has_orders: true, is_active: true, sort_order: rows.length + 1 })} className="bg-gradient-brand text-primary-foreground h-10 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium shadow-glow">
            <Plus className="h-4 w-4" /> {lang === "ar" ? "نوع جديد" : "New type"}
          </button>
        }
      />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد أنواع بعد." : "No activity types yet."} />}
      <div className="grid gap-3">
        {rows.map((r) => (
          <motion.div key={r.code} layout className="glass-card rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{lang === "ar" ? r.label_ar : r.label_en}</span>
                  <span className="text-xs text-muted-foreground font-mono">{r.code}</span>
                  {!r.is_active && <StatusPill status="inactive" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1.5">
                  {flags.filter((f) => r[f.key]).map((f) => (
                    <span key={f.key as string} className="bg-foreground/5 rounded-full px-2 py-0.5">{lang === "ar" ? f.ar : f.en}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => toggleActive(r)} className="h-9 px-3 rounded-full glass-panel text-xs inline-flex items-center gap-1">
                {r.is_active ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3" />} {r.is_active ? (lang === "ar" ? "تعطيل" : "Disable") : (lang === "ar" ? "تفعيل" : "Enable")}
              </button>
              <button onClick={() => setEditing(r)} className="h-9 px-3 rounded-full glass-panel text-xs inline-flex items-center gap-1"><Pencil className="h-3 w-3" /> {lang === "ar" ? "تعديل" : "Edit"}</button>
            </div>
          </motion.div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setEditing(null)}>
          <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onSubmit={save} onClick={(e) => e.stopPropagation()} className="glass-card rounded-3xl p-6 w-full max-w-lg shadow-float max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{editing.code ? (lang === "ar" ? "تعديل النوع" : "Edit type") : (lang === "ar" ? "نوع جديد" : "New type")}</h2>
              <button type="button" onClick={() => setEditing(null)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required disabled={!!rows.find((r) => r.code === editing.code)} value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} placeholder="code (e.g. car_wash)" dir="ltr" className="col-span-2 h-11 rounded-xl border border-input bg-background px-4 text-sm disabled:opacity-60" />
              <input required value={editing.label_ar ?? ""} onChange={(e) => setEditing({ ...editing, label_ar: e.target.value })} placeholder={lang === "ar" ? "الاسم بالعربية" : "Label (AR)"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input required value={editing.label_en ?? ""} onChange={(e) => setEditing({ ...editing, label_en: e.target.value })} placeholder="Label (EN)" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <select value={editing.catalog_kind ?? "product"} onChange={(e) => setEditing({ ...editing, catalog_kind: e.target.value })} className="col-span-2 h-11 rounded-xl border border-input bg-background px-3 text-sm">
                <option value="product">product</option>
                <option value="service">service</option>
                <option value="package">package</option>
                <option value="menu_item">menu_item</option>
              </select>
              <input required value={editing.catalog_label_ar ?? ""} onChange={(e) => setEditing({ ...editing, catalog_label_ar: e.target.value })} placeholder={lang === "ar" ? "اسم قائمة العناصر (عربي)" : "Catalog label (AR)"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input required value={editing.catalog_label_en ?? ""} onChange={(e) => setEditing({ ...editing, catalog_label_en: e.target.value })} placeholder="Catalog label (EN)" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.staff_label_ar ?? ""} onChange={(e) => setEditing({ ...editing, staff_label_ar: e.target.value })} placeholder={lang === "ar" ? "اسم فريق العمل (عربي)" : "Staff label (AR)"} className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <input value={editing.staff_label_en ?? ""} onChange={(e) => setEditing({ ...editing, staff_label_en: e.target.value })} placeholder="Staff label (EN)" dir="ltr" className="h-11 rounded-xl border border-input bg-background px-4 text-sm" />
              <div className="col-span-2 grid grid-cols-2 gap-2">
                {flags.map((f) => (
                  <label key={f.key as string} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!editing[f.key]} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.checked })} />
                    {lang === "ar" ? f.ar : f.en}
                  </label>
                ))}
              </div>
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

/* ===================== Subscriptions ===================== */
function SubscriptionsPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<(SubRow & { tenants?: { name: string; slug: string }; plans?: { code: string; price_monthly: number; currency: string } })[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("subscriptions" as any)
        .select("*, tenants(name, slug), plans(code, price_monthly, currency)")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message); else setRows((data as any[]) ?? []);
    })();
  }, []);

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "الاشتراكات" : "Subscriptions"} subtitle={lang === "ar" ? "حالة الاشتراك لكل متجر." : "Subscription status per tenant."} />
      {rows.length === 0 ? <EmptyState text={lang === "ar" ? "لا توجد اشتراكات." : "No subscriptions."} /> : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-xs text-muted-foreground">
              <tr>
                <th className="text-start p-3">{lang === "ar" ? "المتجر" : "Tenant"}</th>
                <th className="text-start p-3">{lang === "ar" ? "الباقة" : "Plan"}</th>
                <th className="text-start p-3">{lang === "ar" ? "الحالة" : "Status"}</th>
                <th className="text-start p-3">{lang === "ar" ? "ينتهي في" : "Renews"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-foreground/5">
                  <td className="p-3">{s.tenants?.name ?? "—"}</td>
                  <td className="p-3 uppercase text-xs">{s.plans?.code} · {s.plans?.price_monthly} {s.plans?.currency}</td>
                  <td className="p-3"><StatusPill status={s.status} map={tenantStatusMap} /></td>
                  <td className="p-3 text-xs text-muted-foreground" dir="ltr">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== Payments & commission ===================== */
function PaymentsPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<{ tenant_id: string; tenant_name: string; total: number; commission: number; count: number; payment_status: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: orders }, { data: tenants }, { data: subs }, { data: plans }] = await Promise.all([
        supabase.from("orders" as any).select("tenant_id, total, payment_status"),
        supabase.from("tenants" as any).select("id, name"),
        supabase.from("subscriptions" as any).select("tenant_id, plan_id"),
        supabase.from("plans" as any).select("id, commission_rate"),
      ]);
      const tenantName = new Map(((tenants as any[]) ?? []).map((t) => [t.id, t.name]));
      const planByTenant = new Map(((subs as any[]) ?? []).map((s) => [s.tenant_id, s.plan_id]));
      const commissionByPlan = new Map(((plans as any[]) ?? []).map((p) => [p.id, Number(p.commission_rate ?? 0)]));

      const grouped = new Map<string, { total: number; commission: number; count: number; paid: number }>();
      ((orders as any[]) ?? []).forEach((o) => {
        const g = grouped.get(o.tenant_id) ?? { total: 0, commission: 0, count: 0, paid: 0 };
        const rate = commissionByPlan.get(planByTenant.get(o.tenant_id)) ?? 0;
        g.total += Number(o.total ?? 0);
        g.commission += Number(o.total ?? 0) * (rate / 100);
        g.count += 1;
        if (o.payment_status === "paid") g.paid += 1;
        grouped.set(o.tenant_id, g);
      });

      setRows(Array.from(grouped.entries()).map(([tenant_id, g]) => ({
        tenant_id, tenant_name: tenantName.get(tenant_id) ?? "—",
        total: g.total, commission: g.commission, count: g.count,
        payment_status: g.count ? `${g.paid}/${g.count} ${lang === "ar" ? "مدفوع" : "paid"}` : "—",
      })).sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [lang]);

  const totals = rows.reduce((acc, r) => ({ total: acc.total + r.total, commission: acc.commission + r.commission }), { total: 0, commission: 0 });

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "المدفوعات والعمولات" : "Payments & commission"} subtitle={lang === "ar" ? "إجمالي المبيعات وعمولة المنصة لكل متجر (محسوبة من نسبة الباقة)." : "Sales and platform commission per tenant (from plan rate)."} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">{lang === "ar" ? "إجمالي المبيعات" : "Total sales"}</div><div className="text-2xl font-bold text-gradient-brand">{totals.total.toFixed(2)}</div></div>
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">{lang === "ar" ? "عمولة المنصة" : "Platform commission"}</div><div className="text-2xl font-bold text-gradient-brand">{totals.commission.toFixed(2)}</div></div>
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">{lang === "ar" ? "متاجر ببيانات دفع" : "Tenants with orders"}</div><div className="text-2xl font-bold text-gradient-brand">{rows.length}</div></div>
      </div>
      {!loading && rows.length === 0 ? <EmptyState text={lang === "ar" ? "لا توجد طلبات مدفوعة بعد." : "No paid orders yet."} /> : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-xs text-muted-foreground">
              <tr>
                <th className="text-start p-3">{lang === "ar" ? "المتجر" : "Tenant"}</th>
                <th className="text-start p-3">{lang === "ar" ? "الطلبات" : "Orders"}</th>
                <th className="text-start p-3">{lang === "ar" ? "المبيعات" : "Sales"}</th>
                <th className="text-start p-3">{lang === "ar" ? "العمولة" : "Commission"}</th>
                <th className="text-start p-3">{lang === "ar" ? "حالة الدفع" : "Payment"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tenant_id} className="border-t border-foreground/5">
                  <td className="p-3">{r.tenant_name}</td>
                  <td className="p-3">{r.count}</td>
                  <td className="p-3">{r.total.toFixed(2)}</td>
                  <td className="p-3">{r.commission.toFixed(2)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== AI usage ===================== */
function AiUsagePanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("ai_usage" as any).select("*").order("period_month", { ascending: false }).limit(200);
      if (error) toast.error(error.message); else setRows((data as unknown as AiUsageRow[]) ?? []);
    })();
  }, []);
  const totals = useMemo(() => {
    const t = { tokens: 0, cost: 0 };
    rows.forEach((r) => { t.tokens += r.tokens ?? 0; t.cost += Number(r.cost ?? 0); });
    return t;
  }, [rows]);

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "استهلاك الذكاء" : "AI usage"} subtitle={lang === "ar" ? "استهلاك Lovable AI لكل متجر وميزة." : "Lovable AI consumption per tenant/feature."} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">Tokens</div><div className="text-2xl font-bold text-gradient-brand">{totals.tokens}</div></div>
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">Cost</div><div className="text-2xl font-bold text-gradient-brand">${totals.cost.toFixed(2)}</div></div>
        <div className="glass-card rounded-2xl p-4"><div className="text-xs text-muted-foreground">Records</div><div className="text-2xl font-bold text-gradient-brand">{rows.length}</div></div>
      </div>
      {rows.length === 0 ? <EmptyState text={lang === "ar" ? "لا توجد بيانات استهلاك." : "No AI usage yet."} /> : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-xs text-muted-foreground">
              <tr>
                <th className="text-start p-3">Tenant</th>
                <th className="text-start p-3">Feature</th>
                <th className="text-start p-3">Tokens</th>
                <th className="text-start p-3">Cost</th>
                <th className="text-start p-3">Month</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-foreground/5">
                  <td className="p-3 text-xs" dir="ltr">{r.tenant_id?.slice(0, 8) ?? "—"}</td>
                  <td className="p-3">{r.feature}</td>
                  <td className="p-3" dir="ltr">{r.tokens}</td>
                  <td className="p-3" dir="ltr">${Number(r.cost ?? 0).toFixed(3)}</td>
                  <td className="p-3 text-xs" dir="ltr">{r.period_month}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ===================== Tickets ===================== */
function TicketsPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<TicketRow[]>([]);
  const load = async () => {
    const { data, error } = await supabase.from("support_tickets" as any).select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows((data as unknown as TicketRow[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_tickets" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "تذاكر الدعم" : "Support tickets"} />
      {rows.length === 0 ? <EmptyState text={lang === "ar" ? "لا توجد تذاكر." : "No tickets."} /> : (
        <div className="grid gap-3">
          {rows.map((t) => (
            <div key={t.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>{t.subject}</div>
                  {t.body && <p className="text-sm text-foreground/80 mt-1 line-clamp-2">{t.body}</p>}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <StatusPill status={t.status} map={{ open: "bg-[var(--ember)]/15 text-[var(--ember)]", in_progress: "bg-blue-500/15 text-blue-500", closed: "bg-[var(--emerald)]/15 text-[var(--emerald)]" }} />
                    <span>priority: {t.priority}</span>
                    <span dir="ltr">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.status !== "in_progress" && <button onClick={() => setStatus(t.id, "in_progress")} className="h-8 px-3 rounded-full glass-panel text-xs">In progress</button>}
                  {t.status !== "closed" && <button onClick={() => setStatus(t.id, "closed")} className="h-8 px-3 rounded-full bg-[var(--emerald)] text-white text-xs">Close</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Audit log ===================== */
function AuditPanel() {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<AuditRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("audit_log" as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (error) toast.error(error.message); else setRows((data as unknown as AuditRow[]) ?? []);
    })();
  }, []);

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "سجل النشاط" : "Audit log"} subtitle={lang === "ar" ? "آخر 200 حدث على المنصة." : "Latest 200 platform events."} />
      {rows.length === 0 ? <EmptyState text={lang === "ar" ? "السجل فارغ." : "Empty log."} /> : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-xs text-muted-foreground">
              <tr>
                <th className="text-start p-3">When</th>
                <th className="text-start p-3">Actor</th>
                <th className="text-start p-3">Action</th>
                <th className="text-start p-3">Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-foreground/5">
                  <td className="p-3 text-xs" dir="ltr">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 text-xs" dir="ltr">{r.actor_id?.slice(0, 8) ?? "system"}</td>
                  <td className="p-3">{r.action}</td>
                  <td className="p-3 text-xs" dir="ltr">{r.target_table ?? "—"}{r.target_id ? `/${r.target_id.slice(0, 8)}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
