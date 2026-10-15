import { useMemo, useState } from "react";
import {
  LayoutDashboard, Store, MapPin, UserRound, Package, ShoppingBag,
  CalendarCheck, ChefHat, Star, CreditCard, Sparkles, Bell, Menu, ChevronDown,
} from "lucide-react";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { categoryConfig, type TenantWithRole } from "./types";
import { OverviewPanel } from "./panels/OverviewPanel";
import { ProfilePanel } from "./panels/ProfilePanel";
import { BranchesPanel } from "./panels/BranchesPanel";
import { StaffPanel } from "./panels/StaffPanel";
import { CatalogPanel } from "./panels/CatalogPanel";
import { OrdersPanel } from "./panels/OrdersPanel";
import { KitchenBoard } from "./panels/KitchenBoard";
import { BookingsPanel } from "./panels/BookingsPanel";
import { ReviewsPanel } from "./panels/ReviewsPanel";
import { BillingPanel } from "./panels/BillingPanel";
import { AiStudioPanel } from "./panels/AiStudioPanel";
import { NotificationsPanel } from "./panels/NotificationsPanel";

type SectionId = "overview" | "profile" | "branches" | "staff" | "catalog" | "orders" | "kitchen" | "bookings" | "reviews" | "billing" | "ai" | "notifications";

export function BusinessLayout({
  userId, tenants, activeId, onSwitchTenant, onRefresh,
}: {
  userId: string;
  tenants: TenantWithRole[];
  activeId: string;
  onSwitchTenant: (id: string) => void;
  onRefresh: () => void;
}) {
  const { lang } = useSanadak();
  const [section, setSection] = useState<SectionId>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const tenant = tenants.find((t) => t.id === activeId) ?? tenants[0];
  const cfg = useMemo(() => categoryConfig(tenant.category), [tenant.category]);

  const items = useMemo(() => {
    const list: { id: SectionId; ar: string; en: string; icon: React.ReactNode }[] = [
      { id: "overview", ar: "نظرة عامة", en: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "profile", ar: "الملف الشخصي", en: "Profile", icon: <Store className="h-4 w-4" /> },
      { id: "branches", ar: "الفروع", en: "Branches", icon: <MapPin className="h-4 w-4" /> },
      { id: "staff", ar: cfg.staffLabelAr, en: cfg.staffLabelEn, icon: <UserRound className="h-4 w-4" /> },
      { id: "catalog", ar: cfg.catalogLabelAr, en: cfg.catalogLabelEn, icon: <Package className="h-4 w-4" /> },
    ];
    if (cfg.hasOrders) list.push({ id: "orders", ar: "الطلبات", en: "Orders", icon: <ShoppingBag className="h-4 w-4" /> });
    if (tenant.category === "restaurants" || tenant.category === "cafes") list.push({ id: "kitchen", ar: "لوحة التحضير", en: "Kitchen board", icon: <ChefHat className="h-4 w-4" /> });
    if (cfg.hasBookings) list.push({ id: "bookings", ar: "الحجوزات", en: "Bookings", icon: <CalendarCheck className="h-4 w-4" /> });
    list.push(
      { id: "reviews", ar: "التقييمات", en: "Reviews", icon: <Star className="h-4 w-4" /> },
      { id: "billing", ar: "الاشتراك والفوترة", en: "Billing", icon: <CreditCard className="h-4 w-4" /> },
      { id: "ai", ar: "استوديو الذكاء الاصطناعي", en: "AI Studio", icon: <Sparkles className="h-4 w-4" /> },
      { id: "notifications", ar: "الإشعارات", en: "Notifications", icon: <Bell className="h-4 w-4" /> },
    );
    return list;
  }, [cfg, tenant.category]);

  return (
    <main className="relative min-h-screen pt-24 pb-20">
      <div className="absolute inset-0 bg-gradient-hero opacity-40 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        <div className="flex lg:hidden items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs">
            <Store className="h-3.5 w-3.5 text-[var(--emerald)]" /> {tenant.name}
          </div>
          <button onClick={() => setNavOpen((v) => !v)} className="h-10 w-10 grid place-items-center glass-panel rounded-full"><Menu className="h-4 w-4" /></button>
        </div>

        <aside className={`${navOpen ? "block" : "hidden"} lg:block`}>
          <div className="glass-card rounded-2xl p-3 lg:sticky lg:top-24">
            <div className="relative px-2 py-2">
              <button
                onClick={() => tenants.length > 1 && setSwitcherOpen((v) => !v)}
                className="w-full flex items-center gap-2 text-start"
              >
                <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
                  {tenant.image_url ? <img src={tenant.image_url} className="h-full w-full object-cover" /> : <Store className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${lang === "ar" ? "font-arabic" : ""}`}>{tenant.name}</div>
                  <div className="text-[11px] text-muted-foreground">{lang === "ar" ? tenant.role : tenant.role}</div>
                </div>
                {tenants.length > 1 && <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
              {switcherOpen && tenants.length > 1 && (
                <div className="absolute z-20 top-full inset-x-2 mt-1 glass-card rounded-xl p-1">
                  {tenants.map((t) => (
                    <button key={t.id} onClick={() => { onSwitchTenant(t.id); setSection("overview"); setSwitcherOpen(false); sfx.tap(); }}
                      className={`w-full text-start px-3 py-2 rounded-lg text-sm hover:bg-foreground/5 ${t.id === tenant.id ? "text-[var(--emerald)] font-medium" : ""}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <nav className="mt-1 grid gap-1">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => { setSection(it.id); setNavOpen(false); sfx.tap(); }}
                  className={`w-full h-10 px-3 rounded-xl inline-flex items-center gap-2 text-sm font-medium transition text-start ${section === it.id ? "bg-gradient-brand text-primary-foreground shadow-glow" : "hover:bg-foreground/5"} ${lang === "ar" ? "font-arabic" : ""}`}
                >
                  {it.icon}
                  <span className="flex-1 text-start truncate">{lang === "ar" ? it.ar : it.en}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0">
          {section === "overview" && <OverviewPanel tenant={tenant} />}
          {section === "profile" && <ProfilePanel tenant={tenant} onUpdated={onRefresh} />}
          {section === "branches" && <BranchesPanel tenant={tenant} />}
          {section === "staff" && <StaffPanel tenant={tenant} />}
          {section === "catalog" && <CatalogPanel tenant={tenant} />}
          {section === "orders" && cfg.hasOrders && <OrdersPanel tenant={tenant} />}
          {section === "kitchen" && (tenant.category === "restaurants" || tenant.category === "cafes") && <KitchenBoard key={tenant.id} tenant={tenant} />}
          {section === "bookings" && cfg.hasBookings && <BookingsPanel key={tenant.id} tenant={tenant} />}
          {section === "reviews" && <ReviewsPanel tenant={tenant} />}
          {section === "billing" && <BillingPanel tenant={tenant} />}
          {section === "ai" && <AiStudioPanel tenant={tenant} />}
          {section === "notifications" && <NotificationsPanel userId={userId} />}
        </section>
      </div>
    </main>
  );
}
