import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, BadgeCheck, MapPin, Search, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useSanadak } from "@/lib/sanadak-context";
import { CATEGORY_CONFIG, categoryConfig } from "@/components/business/types";

const PAGE_SIZE = 12;
const searchSchema = z.object({
  q: z.string().max(100).optional().catch(""),
  category: z.string().max(80).optional().catch(""),
  area: z.string().max(80).optional().catch(""),
  verified: z.string().optional().catch(""),
  sort: z.enum(["relevance", "name", "newest"]).optional().catch("relevance"),
  page: z.coerce.number().int().min(1).max(834).optional().catch(1),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "البحث · سندك" },
      { name: "description", content: "ابحث عن الأعمال التجارية المسجلة على منصة سندك." },
    ],
  }),
  component: SearchPage,
});

type SearchRow = Database["public"]["Functions"]["search_tenants"]["Returns"][number];
type CategoryOption = { code: string; label_ar: string; label_en: string };

const fallbackCategories: CategoryOption[] = Object.entries(CATEGORY_CONFIG).map(
  ([code, config]) => ({ code, label_ar: config.labelAr, label_en: config.labelEn }),
);

function SearchPage() {
  const {
    q = "",
    category = "",
    area = "",
    verified = "",
    sort = "relevance",
    page = 1,
  } = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang, dir } = useSanadak();
  const [queryInput, setQueryInput] = useState(q);
  const [categoryInput, setCategoryInput] = useState(category);
  const [areaInput, setAreaInput] = useState(area);
  const [verifiedInput, setVerifiedInput] = useState(verified === "1");
  const [sortInput, setSortInput] = useState(sort);
  const [categories, setCategories] = useState<CategoryOption[]>(fallbackCategories);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const Arrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const activeFilters = Boolean(q || category || area || verified || sort !== "relevance");
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    setQueryInput(q);
    setCategoryInput(category);
    setAreaInput(area);
    setVerifiedInput(verified === "1");
    setSortInput(sort);
  }, [q, category, area, verified, sort]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("activity_types")
        .select("code, label_ar, label_en")
        .eq("is_active", true)
        .order("sort_order");
      if (!cancelled && data?.length) setCategories(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);
    setTotal(0);
    void (async () => {
      const { data, error: searchError } = await supabase.rpc("search_tenants", {
        _query: q.trim() || null,
        _category: category || null,
        _area: area.trim() || null,
        _verified_only: verified === "1",
        _sort: sort,
        _limit: PAGE_SIZE,
        _offset: (page - 1) * PAGE_SIZE,
      });
      if (cancelled) return;
      setRows(data ?? []);
      setTotal(data?.[0]?.total_count ?? 0);
      setError(searchError?.message ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [q, category, area, verified, sort, page]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void navigate({
      to: "/search",
      search: {
        q: queryInput.trim(),
        category: categoryInput,
        area: areaInput.trim(),
        verified: verifiedInput ? "1" : "",
        sort: sortInput,
        page: 1,
      },
    });
  };

  const goToPage = (nextPage: number) => {
    void navigate({ to: "/search", search: { q, category, area, verified, sort, page: nextPage } });
  };

  const clearFilters = () => {
    void navigate({ to: "/search", search: { q: "", page: 1 } });
  };

  return (
    <main className="relative min-h-screen pt-28 pb-20">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none opacity-60" />
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-40" />
      <div className="relative max-w-6xl mx-auto px-4">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition ${lang === "ar" ? "font-arabic" : ""}`}
        >
          <Arrow className="h-4 w-4" /> {t("back_home")}
        </Link>

        <div className="mt-6 max-w-2xl">
          <h1
            className={`text-3xl md:text-5xl font-bold tracking-tight ${lang === "ar" ? "font-arabic" : ""}`}
          >
            <span className="text-gradient-brand">
              {lang === "ar" ? "اكتشف الأنشطة" : "Discover businesses"}
            </span>
          </h1>
          <p className={`mt-3 text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {lang === "ar"
              ? "ابحث حسب الاسم أو النوع أو المنطقة، ثم صفِّ النتائج بما يناسبك."
              : "Search by name, category, or area, then refine the results."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-8 rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5"
        >
          <label
            htmlFor="search-query"
            className={`text-sm font-medium ${lang === "ar" ? "font-arabic" : ""}`}
          >
            {lang === "ar" ? "عمّ تبحث؟" : "Search"}
          </label>
          <div className="relative mt-2">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 ${dir === "rtl" ? "right-4" : "left-4"} h-4 w-4 text-muted-foreground`}
            />
            <input
              id="search-query"
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              maxLength={100}
              placeholder={t("search_placeholder")}
              className={`h-12 w-full rounded-xl border border-input bg-background ${dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"} text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/40`}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={`text-sm ${lang === "ar" ? "font-arabic" : ""}`}>
              <span className="mb-1.5 block font-medium">
                {lang === "ar" ? "التصنيف" : "Category"}
              </span>
              <select
                value={categoryInput}
                onChange={(event) => setCategoryInput(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">{lang === "ar" ? "كل التصنيفات" : "All categories"}</option>
                {categories.map((option) => (
                  <option key={option.code} value={option.code}>
                    {lang === "ar" ? option.label_ar : option.label_en}
                  </option>
                ))}
              </select>
            </label>
            <label className={`text-sm ${lang === "ar" ? "font-arabic" : ""}`}>
              <span className="mb-1.5 block font-medium">{lang === "ar" ? "المنطقة" : "Area"}</span>
              <input
                value={areaInput}
                onChange={(event) => setAreaInput(event.target.value)}
                maxLength={80}
                placeholder={lang === "ar" ? "اكتب المنطقة" : "Enter an area"}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className={`text-sm ${lang === "ar" ? "font-arabic" : ""}`}>
              <span className="mb-1.5 block font-medium">
                {lang === "ar" ? "الترتيب" : "Sort by"}
              </span>
              <select
                value={sortInput}
                onChange={(event) => setSortInput(event.target.value as typeof sortInput)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="relevance">{lang === "ar" ? "الأكثر صلة" : "Most relevant"}</option>
                <option value="name">{lang === "ar" ? "الاسم" : "Name"}</option>
                <option value="newest">{lang === "ar" ? "الأحدث" : "Newest"}</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label
              className={`inline-flex items-center gap-2 text-sm ${lang === "ar" ? "font-arabic" : ""}`}
            >
              <input
                type="checkbox"
                checked={verifiedInput}
                onChange={(event) => setVerifiedInput(event.target.checked)}
                className="h-4 w-4 accent-[var(--emerald)]"
              />
              {lang === "ar" ? "الأنشطة الموثقة فقط" : "Verified businesses only"}
            </label>
            <div className="flex gap-2">
              {activeFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-10 rounded-full px-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  {lang === "ar" ? "مسح الفلاتر" : "Clear filters"}
                </button>
              )}
              <button
                type="submit"
                className="h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {lang === "ar" ? "عرض النتائج" : "Show results"}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8" aria-live="polite">
          <p className={`text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
            {loading
              ? lang === "ar"
                ? "جارٍ البحث..."
                : "Searching..."
              : error
                ? lang === "ar"
                  ? "تعذر تحميل النتائج"
                  : "Could not load results"
                : lang === "ar"
                  ? `${total} نتيجة`
                  : `${total} results`}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className={`mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive ${lang === "ar" ? "font-arabic" : ""}`}
          >
            {lang === "ar"
              ? "حدث خطأ أثناء البحث. حاول مرة أخرى لاحقًا."
              : "Something went wrong while searching. Please try again later."}
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
          {!loading && !error && rows.length === 0 && (
            <div
              className={`col-span-full rounded-2xl border border-border/70 p-10 text-center text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}
            >
              {t("no_results")}
            </div>
          )}
          {rows.map((business) => {
            const option = categories.find((item) => item.code === business.category);
            const label = option
              ? lang === "ar"
                ? option.label_ar
                : option.label_en
              : lang === "ar"
                ? categoryConfig(business.category).labelAr
                : categoryConfig(business.category).labelEn;
            return (
              <Link
                key={business.id}
                to="/store/$slug"
                params={{ slug: business.slug }}
                className="rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors hover:border-[var(--emerald)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-brand text-primary-foreground">
                    {business.image_url ? (
                      <img
                        src={business.image_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Store className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`flex items-center gap-1 font-semibold ${lang === "ar" ? "font-arabic" : ""}`}
                    >
                      <span className="truncate">{business.name}</span>
                      {business.verified_at && (
                        <BadgeCheck
                          aria-label={lang === "ar" ? "موثق" : "Verified"}
                          className="h-3.5 w-3.5 shrink-0 text-[var(--emerald)]"
                        />
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{label}</span>
                      {business.area && (
                        <>
                          <span>·</span>
                          <MapPin className="h-3 w-3" />
                          <span>{business.area}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {business.description && (
                  <p
                    className={`mt-3 line-clamp-2 text-sm text-foreground/80 ${lang === "ar" ? "font-arabic" : ""}`}
                  >
                    {business.description}
                  </p>
                )}
              </Link>
            );
          })}
        </div>

        {!loading && !error && (totalPages > 1 || page > 1) && (
          <nav
            aria-label={lang === "ar" ? "صفحات النتائج" : "Result pages"}
            className="mt-8 flex items-center justify-center gap-4"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="h-10 rounded-full border border-input px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {lang === "ar" ? "السابق" : "Previous"}
            </button>
            <span className="text-sm text-muted-foreground">
              {lang === "ar"
                ? `صفحة ${page} من ${Math.max(totalPages, page)}`
                : `Page ${page} of ${Math.max(totalPages, page)}`}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="h-10 rounded-full border border-input px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {lang === "ar" ? "التالي" : "Next"}
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
