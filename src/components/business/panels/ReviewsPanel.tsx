import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Star, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSanadak } from "@/lib/sanadak-context";
import { sfx } from "@/lib/sanadak-sounds";
import { PanelHeader, EmptyState } from "../ui";
import type { ReviewRow, TenantWithRole } from "../types";

export function ReviewsPanel({ tenant }: { tenant: TenantWithRole }) {
  const { lang } = useSanadak();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const canModerate = tenant.role === "owner" || tenant.role === "manager";

  const load = async () => {
    const { data } = await supabase.from("reviews" as any).select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false });
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [tenant.id]);

  const toggleApproved = async (r: ReviewRow) => {
    const { error } = await supabase.from("reviews" as any).update({ is_approved: !r.is_approved }).eq("id", r.id);
    if (error) toast.error(error.message); else { sfx.tap(); load(); }
  };

  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "—";

  return (
    <div>
      <PanelHeader title={lang === "ar" ? "التقييمات" : "Reviews"} subtitle={lang === "ar" ? `متوسط التقييم: ${avg} · ${rows.length} تقييم` : `Average rating: ${avg} · ${rows.length} reviews`} />
      {rows.length === 0 && <EmptyState text={lang === "ar" ? "لا توجد تقييمات بعد." : "No reviews yet."} />}
      <div className="grid gap-3">
        {rows.map((r) => (
          <motion.div key={r.id} layout className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-[var(--ember)] text-[var(--ember)]" : "text-foreground/20"}`} />
                ))}
              </div>
              {canModerate && (
                <button onClick={() => toggleApproved(r)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-foreground/5" title={r.is_approved ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "إظهار" : "Show")}>
                  {r.is_approved ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
              )}
            </div>
            {r.body && <p className={`mt-2 text-sm ${lang === "ar" ? "font-arabic" : ""}`}>{r.body}</p>}
            <div className="mt-2 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}{!r.is_approved && ` · ${lang === "ar" ? "مخفي" : "hidden"}`}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
