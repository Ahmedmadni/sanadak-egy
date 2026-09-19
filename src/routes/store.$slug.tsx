import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Store,
  MapPin,
  Phone,
  Star,
  BadgeCheck,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  CalendarCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { categoryConfig } from "@/components/business/types";
import { BookingDialog } from "@/components/sanadak/BookingDialog";
import { StoreCartCheckout, type StoreOrderItem } from "@/components/sanadak/StoreCartCheckout";

export const Route = createFileRoute("/store/$slug")({
  head: () => ({ meta: [{ title: "سندك" }] }),
  component: StorePage,
});

type Tenant = {
  id: string;
  slug: string;
  name: string;
  category: string;
  area: string | null;
  phone: string | null;
  description: string | null;
  image_url: string | null;
  cover_url: string | null;
  verified_at: string | null;
};
type Item = StoreOrderItem & {
  description: string | null;
  duration_minutes: number | null;
};
type Review = { id: string; rating: number; body: string | null; created_at: string };
type Branch = Pick<Tables<"branches">, "id" | "name" | "address">;
type Staff = Pick<Tables<"staff">, "id" | "name" | "role" | "specialty" | "branch_id">;

function StorePage() {
  const { slug } = Route.useParams();
  const { lang, dir, customer, setCustomer } = useSanadak();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Item | null>(null);
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from("tenants").select("*").eq("slug", slug).maybeSingle();
      if (t) {
        setTenant(t);
        const [{ data: i }, { data: r }, { data: b }, { data: s }] = await Promise.all([
          supabase
            .from("catalog_items")
            .select("*")
            .eq("tenant_id", t.id)
            .eq("is_active", true)
            .order("sort_order"),
          supabase
            .from("reviews")
            .select("*")
            .eq("tenant_id", t.id)
            .eq("is_approved", true)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("branches")
            .select("id,name,address")
            .eq("tenant_id", t.id)
            .eq("is_active", true)
            .order("created_at"),
          supabase
            .from("staff")
            .select("id,name,role,specialty,branch_id")
            .eq("tenant_id", t.id)
            .eq("is_active", true)
            .order("created_at"),
        ]);
        setItems(i ?? []);
        setReviews(r ?? []);
        setBranches(b ?? []);
        setStaff(s ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading)
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">...</div>
      </main>
    );

  if (!tenant) {
    return (
      <main className="min-h-screen grid place-items-center px-4 pt-24">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center">
          <Store className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className={`mt-3 text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "المتجر غير متاح" : "Store unavailable"}
          </h1>
          <Link
            to="/search"
            search={{ q: "" }}
            className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--emerald)]"
          >
            <Arrow className="h-4 w-4" /> {lang === "ar" ? "العودة للبحث" : "Back to search"}
          </Link>
        </div>
      </main>
    );
  }

  const cfg = categoryConfig(tenant.category);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <main className="relative min-h-screen pt-28 pb-20">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none opacity-60" />
      <div className="relative max-w-4xl mx-auto px-4">
        <Link
          to="/search"
          search={{ q: "" }}
          className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition ${lang === "ar" ? "font-arabic" : ""}`}
        >
          <Arrow className="h-4 w-4" /> {lang === "ar" ? "البحث" : "Search"}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 glass-card rounded-3xl p-6 flex flex-wrap items-start gap-5"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
            {tenant.image_url ? (
              <img src={tenant.image_url} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-7 w-7" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className={`text-2xl font-bold flex items-center gap-2 ${lang === "ar" ? "font-arabic" : ""}`}
            >
              {tenant.name}
              {tenant.verified_at && <BadgeCheck className="h-5 w-5 text-[var(--emerald)]" />}
            </div>
            <div className="mt-1 text-sm text-muted-foreground flex flex-wrap items-center gap-3">
              <span>{lang === "ar" ? cfg.labelAr : cfg.labelEn}</span>
              {tenant.area && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {tenant.area}
                </span>
              )}
              {tenant.phone && (
                <span dir="ltr" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {tenant.phone}
                </span>
              )}
              {avgRating && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-[var(--ember)] text-[var(--ember)]" />{" "}
                  {avgRating} ({reviews.length})
                </span>
              )}
            </div>
            {tenant.description && (
              <p
                className={`mt-3 text-sm text-foreground/80 ${lang === "ar" ? "font-arabic" : ""}`}
              >
                {tenant.description}
              </p>
            )}
          </div>
        </motion.div>

        <h2 className={`mt-8 text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>
          {lang === "ar" ? cfg.catalogLabelAr : cfg.catalogLabelEn}
        </h2>
        {items.length === 0 ? (
          <div
            className={`mt-4 glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}
          >
            {lang === "ar"
              ? "لم يضف هذا النشاط عناصر بعد."
              : "This business hasn't added items yet."}
          </div>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {items.map((it) => (
              <div key={it.id} className="glass-card rounded-2xl p-4 flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0 overflow-hidden">
                  {it.image_url ? (
                    <img src={it.image_url} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>
                    {it.name}
                  </div>
                  {it.description && (
                    <p
                      className={`text-xs text-muted-foreground mt-0.5 line-clamp-2 ${lang === "ar" ? "font-arabic" : ""}`}
                    >
                      {it.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold">
                      {it.price} {it.currency}
                    </span>
                    <button
                      disabled={it.stock === 0}
                      onClick={() => {
                        setActive(it);
                        sfx.open();
                      }}
                      className="h-8 px-3 rounded-full bg-gradient-brand text-primary-foreground text-xs font-medium shadow-glow flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {cfg.hasBookings && it.duration_minutes ? (
                        <CalendarCheck className="h-3.5 w-3.5" />
                      ) : (
                        <ShoppingBag className="h-3.5 w-3.5" />
                      )}
                      {it.stock === 0
                        ? lang === "ar"
                          ? "غير متوفر"
                          : "Sold out"
                        : cfg.hasBookings && it.duration_minutes
                          ? lang === "ar"
                            ? "احجز"
                            : "Book"
                          : lang === "ar"
                            ? "أضف"
                            : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {reviews.length > 0 && (
          <>
            <h2 className={`mt-10 text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>
              {lang === "ar" ? "آراء العملاء" : "Customer reviews"}
            </h2>
            <div className="mt-4 grid gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? "fill-[var(--ember)] text-[var(--ember)]" : "text-foreground/20"}`}
                      />
                    ))}
                  </div>
                  {r.body && (
                    <p className={`mt-2 text-sm ${lang === "ar" ? "font-arabic" : ""}`}>{r.body}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {active && cfg.hasBookings && active.duration_minutes ? (
        <BookingDialog
          tenantId={tenant.id}
          tenantName={tenant.name}
          item={active}
          branches={branches}
          staff={staff}
          customer={customer}
          lang={lang}
          onCustomerChange={setCustomer}
          onClose={() => setActive(null)}
        />
      ) : null}

      <StoreCartCheckout
        key={tenant.id}
        tenantId={tenant.id}
        tenantName={tenant.name}
        items={items}
        selectedItem={active && !(cfg.hasBookings && active.duration_minutes) ? active : null}
        customer={customer}
        lang={lang}
        dir={dir}
        onCustomerChange={setCustomer}
        onCloseItem={() => setActive(null)}
      />
    </main>
  );
}
