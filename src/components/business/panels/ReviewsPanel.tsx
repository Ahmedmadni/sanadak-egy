import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Eye, EyeOff, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { EmptyState, PanelHeader } from "../ui";
import type { ReviewRow, TenantWithRole } from "../types";

export function ReviewsPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const canModerate = tenant.role === "owner" || tenant.role === "manager";

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, [tenant.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const approved = useMemo(() => rows.filter((review) => review.is_approved), [rows]);
  const average = approved.length
    ? (approved.reduce((sum, review) => sum + review.rating, 0) / approved.length).toFixed(1)
    : "—";
  const pendingCount = rows.length - approved.length;

  const toggleApproved = async (review: ReviewRow) => {
    setBusyId(review.id);
    const { error } = await supabase.rpc("moderate_review", {
      _review: review.id,
      _approved: !review.is_approved,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    sfx.tap();
    toast.success(
      review.is_approved
        ? lang === "ar"
          ? "تم إخفاء التقييم"
          : "Review hidden"
        : lang === "ar"
          ? "تم نشر التقييم"
          : "Review published",
    );
    await load();
  };

  return (
    <div>
      <PanelHeader
        title={lang === "ar" ? "التقييمات" : "Reviews"}
        subtitle={
          lang === "ar"
            ? `متوسط المنشور: ${average} · ${approved.length} منشور · ${pendingCount} قيد المراجعة`
            : `Published average: ${average} · ${approved.length} live · ${pendingCount} pending`
        }
      />

      {!loading && rows.length === 0 && (
        <EmptyState text={lang === "ar" ? "لا توجد تقييمات بعد." : "No reviews yet."} />
      )}

      <div className="grid gap-3">
        {rows.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl border border-border/70 bg-background/80 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1" aria-label={`${review.rating} / 5`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      aria-hidden="true"
                      className={`h-4 w-4 ${index < review.rating ? "fill-[var(--ember)] text-[var(--ember)]" : "text-foreground/20"}`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    {new Date(review.created_at).toLocaleDateString(
                      lang === "ar" ? "ar-EG" : "en-US",
                    )}
                  </span>
                  <span>·</span>
                  <span
                    className={review.is_approved ? "text-[var(--emerald)]" : "text-[var(--ember)]"}
                  >
                    {review.is_approved
                      ? lang === "ar"
                        ? "منشور"
                        : "Published"
                      : lang === "ar"
                        ? "قيد المراجعة"
                        : "Pending"}
                  </span>
                  {review.verified_at && (
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck className="h-3.5 w-3.5 text-[var(--emerald)]" />
                      {lang === "ar" ? "تجربة موثقة" : "Verified visit"}
                    </span>
                  )}
                </div>
              </div>

              {canModerate && (
                <button
                  type="button"
                  disabled={busyId === review.id}
                  onClick={() => void toggleApproved(review)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border hover:bg-foreground/5 disabled:opacity-50"
                  aria-label={
                    review.is_approved
                      ? lang === "ar"
                        ? "إخفاء التقييم"
                        : "Hide review"
                      : lang === "ar"
                        ? "نشر التقييم"
                        : "Publish review"
                  }
                >
                  {review.is_approved ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>

            {review.body && (
              <p className={`mt-3 text-sm leading-6 ${lang === "ar" ? "font-arabic" : ""}`}>
                {review.body}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
