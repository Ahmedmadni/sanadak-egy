import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
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
import { useAuth } from "@/lib/use-auth";
import { sfx } from "@/lib/sanadak-sounds";
import { publicViewsRequired, queryPublicStorefront } from "@/lib/public-storefront";
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
type Review = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  verified_at: string | null;
};
type Branch = Pick<Tables<"branches">, "id" | "name" | "address">;
type Staff = Pick<Tables<"staff">, "id" | "name" | "role" | "specialty" | "branch_id">;

function StorePage() {
  const { slug } = Route.useParams();
  const { lang, dir, customer, setCustomer } = useSanadak();
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [active, setActive] = useState<Item | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    let activeRequest = true;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      setTenant(null);
      setItems([]);
      setReviews([]);
      setBranches([]);
      setStaff([]);
      try {
        const result = await queryPublicStorefront<Tenant>(
          "tenants",
          async (table, legacy) => {
            let query = supabase.from(table as "tenants")
              .select("id,slug,name,category,area,phone,description,image_url,cover_url,verified_at")
              .eq("slug", slug);
            if (legacy) query = query.eq("status", "active");
            const { data, error } = await query.maybeSingle();
            return { data, error };
          },
          { requireView: publicViewsRequired },
        );
        if (!activeRequest) return;
        if (result.error) throw result.error;
        const t = result.data;
        if (!t) return;
        const [itemsResult, reviewsResult, branchesResult, staffResult] = await Promise.all([
          queryPublicStorefront<Item[]>("catalog", async (table, legacy) => {
            let query = supabase.from(table as "catalog_items")
              .select("id,name,price,currency,image_url,stock,variants,description,duration_minutes")
              .eq("tenant_id", t.id)
              .order("sort_order");
            if (legacy) query = query.eq("is_active", true);
            const { data, error } = await query;
            return { data, error };
          }, { requireView: publicViewsRequired }),
          queryPublicStorefront<Review[]>("reviews", async (table, legacy) => {
            let query = supabase.from(table as "reviews")
              .select("id,rating,body,created_at,verified_at")
              .eq("tenant_id", t.id)
              .order("created_at", { ascending: false })
              .limit(10);
            if (legacy) query = query.eq("is_approved", true);
            const { data, error } = await query;
            return { data, error };
          }, { requireView: publicViewsRequired }),
          queryPublicStorefront<Branch[]>("branches", async (table, legacy) => {
            let query = supabase.from(table as "branches")
              .select("id,name,address")
              .eq("tenant_id", t.id)
              .order("created_at");
            if (legacy) query = query.eq("is_active", true);
            const { data, error } = await query;
            return { data, error };
          }, { requireView: publicViewsRequired }),
          queryPublicStorefront<Staff[]>("staff", async (table, legacy) => {
            let query = supabase.from(table as "staff")
              .select("id,name,role,specialty,branch_id")
              .eq("tenant_id", t.id)
              .order("created_at");
            if (legacy) query = query.eq("is_active", true);
            const { data, error } = await query;
            return { data, error };
          }, { requireView: publicViewsRequired }),
        ]);
        if (!activeRequest) return;
        // Never partially show public business content after a permission,
        // view dependency or server error. Real empty results are valid.
        if (itemsResult.error || reviewsResult.error || branchesResult.error || staffResult.error) {
          throw itemsResult.error ?? reviewsResult.error ?? branchesResult.error ?? staffResult.error;
        }
        setTenant(t);
        setItems(itemsResult.data ?? []);
        setReviews(reviewsResult.data ?? []);
        setBranches(branchesResult.data ?? []);
        setStaff(staffResult.data ?? []);
      } catch {
        if (activeRequest) setLoadError(true);
      } finally {
        if (activeRequest) setLoading(false);
      }
    })();
    return () => { activeRequest = false; };
  }, [slug]);

  if (loading)
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">...</div>
      </main>
    );

  if (loadError) {
    return (
      <main className="min-h-screen grid place-items-center px-4 pt-24">
        <div role="alert" className="glass-card rounded-3xl p-8 max-w-md text-center">
          <Store className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {lang === "ar"
              ? "تعذر تحميل بيانات النشاط حاليًا. حاول مرة أخرى لاحقًا."
              : "This business could not be loaded right now. Please try again later."}
          </p>
          <Link to="/search" search={{ q: "" }} className="mt-5 inline-flex text-sm text-[var(--emerald)]">
            {lang === "ar" ? "العودة للبحث" : "Back to search"}
          </Link>
        </div>
      </main>
    );
  }

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

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingReview(true);
    const { error } = await supabase.rpc("submit_review", {
      _tenant: tenant.id,
      _rating: reviewRating,
      _body: reviewBody.trim() || null,
    });
    setSubmittingReview(false);
    if (error) {
      const message = error.message.includes("completed order or booking")
        ? lang === "ar"
          ? "يمكنك التقييم بعد اكتمال طلب أو حجز لدى هذا النشاط."
          : "You can review after completing an order or booking with this business."
        : error.message;
      toast.error(message);
      return;
    }
    setReviewBody("");
    setReviewRating(5);
    toast.success(
      lang === "ar" ? "تم إرسال تقييمك للمراجعة." : "Your review was submitted for moderation.",
    );
  };

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

        <section className="mt-10">
          <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar" ? "آراء العملاء" : "Customer reviews"}
          </h2>

          <div className="mt-4 rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5">
            {user ? (
              <form onSubmit={submitReview}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className={`font-semibold ${lang === "ar" ? "font-arabic" : ""}`}>
                      {lang === "ar" ? "شارك تجربتك" : "Share your experience"}
                    </h3>
                    <p
                      className={`mt-1 text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}
                    >
                      {lang === "ar"
                        ? "متاح بعد طلب مُسلّم أو حجز مكتمل، ويُنشر بعد المراجعة."
                        : "Available after a delivered order or completed booking, then published after moderation."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" aria-label={`${reviewRating} / 5`}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setReviewRating(index + 1)}
                        className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
                        aria-label={`${index + 1} / 5`}
                      >
                        <Star
                          aria-hidden="true"
                          className={`h-5 w-5 ${index < reviewRating ? "fill-[var(--ember)] text-[var(--ember)]" : "text-foreground/20"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <label className="mt-4 block">
                  <span className="sr-only">{lang === "ar" ? "نص التقييم" : "Review text"}</span>
                  <textarea
                    value={reviewBody}
                    onChange={(event) => setReviewBody(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder={
                      lang === "ar" ? "اكتب رأيك (اختياري)" : "Write your review (optional)"
                    }
                    className={`w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/40 ${lang === "ar" ? "font-arabic" : ""}`}
                  />
                </label>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {submittingReview
                      ? lang === "ar"
                        ? "جارٍ الإرسال..."
                        : "Submitting..."
                      : lang === "ar"
                        ? "إرسال التقييم"
                        : "Submit review"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  className={`text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}
                >
                  {lang === "ar"
                    ? "سجّل الدخول لتقييم تجربة مكتملة."
                    : "Sign in to review a completed experience."}
                </p>
                <Link
                  to="/auth"
                  search={{ redirect: `/store/${tenant.slug}` }}
                  className="h-10 rounded-full border border-input px-4 text-sm leading-10 hover:bg-foreground/5"
                >
                  {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
                </Link>
              </div>
            )}
          </div>

          {reviews.length > 0 && (
            <div className="mt-4 grid gap-3">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-2xl border border-border/70 bg-background/80 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1" aria-label={`${r.rating} / 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-[var(--ember)] text-[var(--ember)]" : "text-foreground/20"}`}
                        />
                      ))}
                    </div>
                    {r.verified_at && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--emerald)]">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        {lang === "ar" ? "تجربة موثقة" : "Verified visit"}
                      </span>
                    )}
                  </div>
                  {r.body && (
                    <p className={`mt-2 text-sm ${lang === "ar" ? "font-arabic" : ""}`}>{r.body}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
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
