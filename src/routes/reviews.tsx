import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MessageSquareText, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/use-auth";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { publicViewsRequired, queryPublicStorefront } from "@/lib/public-storefront";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "تقييماتي | سندك" }] }),
  component: CustomerReviewsPage,
});

type TenantSummary = Pick<Tables<"tenants">, "id" | "name" | "slug">;
type ReviewSummary = Pick<
  Tables<"reviews">,
  "id" | "tenant_id" | "rating" | "body" | "is_approved" | "updated_at"
>;

function CustomerReviewsPage() {
  const { user, loading } = useAuth();
  const { lang } = useSanadak();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [reviewsByTenant, setReviewsByTenant] = useState<Record<string, ReviewSummary>>({});
  const [loadingRows, setLoadingRows] = useState(true);

  const copy = useMemo(
    () =>
      lang === "ar"
        ? {
            label: "التقييمات",
            title: "تقييماتي",
            subtitle: "قيّم الأنشطة التي أكملت معها طلبًا أو حجزًا. أي تعديل يعود للمراجعة قبل النشر.",
            empty: "لا توجد تجارب مكتملة مؤهلة للتقييم حتى الآن.",
            explore: "استكشف الأنشطة",
            pending: "قيد المراجعة",
            published: "منشور",
          }
        : {
            label: "Reviews",
            title: "My reviews",
            subtitle: "Rate businesses after a completed order or booking. Any edit returns to moderation before publication.",
            empty: "No completed experiences are eligible for review yet.",
            explore: "Explore businesses",
            pending: "Pending moderation",
            published: "Published",
          },
    [lang],
  );

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/auth", search: { redirect: "/reviews" } });
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoadingRows(true);
      const [ordersResult, bookingsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("tenant_id")
          .eq("customer_id", user.id)
          .eq("status", "delivered"),
        supabase
          .from("bookings")
          .select("tenant_id")
          .eq("customer_id", user.id)
          .eq("status", "completed"),
      ]);

      if (ordersResult.error) {
        toast.error(ordersResult.error.message);
        setLoadingRows(false);
        return;
      }
      if (bookingsResult.error) {
        toast.error(bookingsResult.error.message);
        setLoadingRows(false);
        return;
      }

      const tenantIds = [
        ...new Set([
          ...(ordersResult.data ?? []).map((row) => row.tenant_id),
          ...(bookingsResult.data ?? []).map((row) => row.tenant_id),
        ]),
      ];

      if (tenantIds.length === 0) {
        setTenants([]);
        setReviewsByTenant({});
        setLoadingRows(false);
        return;
      }

      const [tenantsResult, reviewsResult] = await Promise.all([
        queryPublicStorefront<TenantSummary[]>("tenants", async (table, legacy) => {
          let query = supabase.from(table as "tenants")
            .select("id,name,slug").in("id", tenantIds).order("name");
          if (legacy) query = query.eq("status", "active");
          const { data, error } = await query;
          return { data, error };
        }, { requireView: publicViewsRequired }),
        supabase
          .from("reviews")
          .select("id,tenant_id,rating,body,is_approved,updated_at")
          .eq("customer_id", user.id)
          .in("tenant_id", tenantIds),
      ]);

      if (tenantsResult.error) toast.error(tenantsResult.error.message);
      if (reviewsResult.error) toast.error(reviewsResult.error.message);

      setTenants(tenantsResult.data ?? []);
      setReviewsByTenant(
        (reviewsResult.data ?? []).reduce<Record<string, ReviewSummary>>((map, review) => {
          map[review.tenant_id] = review;
          return map;
        }, {}),
      );
      setLoadingRows(false);
    };

    void load();
  }, [user]);

  if (loading || !user) return <main className="min-h-screen" />;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-20 pt-28 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="relative mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7"
        >
          <p className={`text-sm font-medium text-[var(--emerald)] ${lang === "ar" ? "font-arabic" : ""}`}>
            {copy.label}
          </p>
          <h1 className={`mt-1 text-3xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}>
            {copy.title}
          </h1>
          <p className={`mt-2 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {copy.subtitle}
          </p>
        </motion.header>

        {loadingRows ? (
          <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">…</div>
        ) : tenants.length === 0 ? (
          <section className="rounded-3xl border border-border/70 bg-background/80 px-6 py-12 text-center shadow-sm">
            <MessageSquareText className="mx-auto h-9 w-9 text-[var(--emerald)]" />
            <p className={`mt-4 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
              {copy.empty}
            </p>
            <Link
              to="/search"
              search={{ q: "" }}
              className={`mt-6 inline-flex h-10 items-center rounded-full bg-gradient-brand px-5 text-sm font-medium text-primary-foreground shadow-glow ${lang === "ar" ? "font-arabic" : ""}`}
            >
              {copy.explore}
            </Link>
          </section>
        ) : (
          <div className="grid gap-4">
            {tenants.map((tenant) => (
              <ReviewEditor
                key={tenant.id}
                tenant={tenant}
                initialReview={reviewsByTenant[tenant.id]}
                lang={lang}
                statusLabel={reviewsByTenant[tenant.id]?.is_approved ? copy.published : copy.pending}
                onReviewChange={(review) =>
                  setReviewsByTenant((current) => {
                    const next = { ...current };
                    if (review) next[tenant.id] = review;
                    else delete next[tenant.id];
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ReviewEditor({
  tenant,
  initialReview,
  lang,
  statusLabel,
  onReviewChange,
}: {
  tenant: TenantSummary;
  initialReview?: ReviewSummary;
  lang: "ar" | "en";
  statusLabel: string;
  onReviewChange: (review: ReviewSummary | null) => void;
}) {
  const [rating, setRating] = useState(initialReview?.rating ?? 0);
  const [body, setBody] = useState(initialReview?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setRating(initialReview?.rating ?? 0);
    setBody(initialReview?.body ?? "");
  }, [initialReview]);

  const copy =
    lang === "ar"
      ? {
          rating: "اختر تقييمًا من 1 إلى 5",
          placeholder: "اكتب تجربتك باختصار (اختياري)",
          save: initialReview ? "تحديث التقييم" : "إرسال التقييم",
          saved: initialReview ? "تم تحديث التقييم وإعادته للمراجعة." : "تم إرسال التقييم للمراجعة.",
          delete: "حذف التقييم",
          deleted: "تم حذف التقييم.",
          confirmDelete: "هل تريد حذف تقييمك نهائيًا؟",
        }
      : {
          rating: "Choose a rating from 1 to 5",
          placeholder: "Share your experience (optional)",
          save: initialReview ? "Update review" : "Submit review",
          saved: initialReview ? "Review updated and returned to moderation." : "Review submitted for moderation.",
          delete: "Delete review",
          deleted: "Review deleted.",
          confirmDelete: "Delete your review permanently?",
        };

  const saveReview = async () => {
    if (rating < 1 || rating > 5) {
      toast.error(copy.rating);
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("submit_review", {
      _tenant: tenant.id,
      _rating: rating,
      _body: body.trim() || undefined,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const result = data?.[0];
    if (!result) {
      toast.error(lang === "ar" ? "تعذر حفظ التقييم." : "Could not save review.");
      return;
    }

    const next: ReviewSummary = {
      id: result.review_id,
      tenant_id: tenant.id,
      rating,
      body: body.trim() || null,
      is_approved: result.is_approved,
      updated_at: new Date().toISOString(),
    };
    onReviewChange(next);
    sfx.tap();
    toast.success(copy.saved);
  };

  const deleteReview = async () => {
    if (!initialReview || !window.confirm(copy.confirmDelete)) return;
    setDeleting(true);
    const { error } = await supabase.rpc("delete_own_review", { _review: initialReview.id });
    setDeleting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRating(0);
    setBody("");
    onReviewChange(null);
    sfx.tap();
    toast.success(copy.deleted);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/70 bg-background/85 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/store/$slug"
            params={{ slug: tenant.slug }}
            className="text-base font-bold hover:text-[var(--emerald)]"
          >
            {tenant.name}
          </Link>
          {initialReview && (
            <p className={`mt-1 text-xs ${initialReview.is_approved ? "text-[var(--emerald)]" : "text-[var(--ember)]"} ${lang === "ar" ? "font-arabic" : ""}`}>
              {statusLabel}
            </p>
          )}
        </div>
        {initialReview && (
          <button
            type="button"
            onClick={() => void deleteReview()}
            disabled={deleting || saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-destructive/30 px-3 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {copy.delete}
          </button>
        )}
      </div>

      <div className="mt-5 flex items-center gap-1" aria-label={copy.rating}>
        {Array.from({ length: 5 }).map((_, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              disabled={saving || deleting}
              className="rounded-full p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
              aria-label={`${value} / 5`}
              aria-pressed={rating === value}
            >
              <Star
                className={`h-6 w-6 ${value <= rating ? "fill-[var(--ember)] text-[var(--ember)]" : "text-foreground/20"}`}
              />
            </button>
          );
        })}
      </div>

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={1000}
        rows={4}
        disabled={saving || deleting}
        placeholder={copy.placeholder}
        className={`mt-4 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-[var(--emerald)] disabled:opacity-60 ${lang === "ar" ? "font-arabic" : ""}`}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">{body.length}/1000</span>
        <button
          type="button"
          onClick={() => void saveReview()}
          disabled={saving || deleting || rating < 1}
          className={`inline-flex h-10 items-center rounded-full bg-gradient-brand px-5 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50 ${lang === "ar" ? "font-arabic" : ""}`}
        >
          {copy.save}
        </button>
      </div>
    </motion.article>
  );
}
