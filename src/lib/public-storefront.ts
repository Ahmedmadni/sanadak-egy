/**
 * Gate 19 storefront compatibility during a staged backend rollout.
 *
 * Prefer the narrow, public storefront views wherever they exist. The old
 * public tables are queried ONLY if PostgREST explicitly reports that the
 * relevant view has not been created yet (legacy pre-Gate-19 deployments).
 *
 * NEVER fall back after a permission error, network failure, empty view
 * result, or a missing dependency *inside* a view.
 *
 * Operators must set VITE_SANADAK_STOREFRONT_VIEWS_REQUIRED=true when
 * Gate 19D is deployed; this disables legacy fallback entirely.
 */
export const STOREFRONT_SOURCES = {
  tenants: { view: "storefront_tenants", legacy: "tenants" },
  catalog: { view: "storefront_catalog_items", legacy: "catalog_items" },
  branches: { view: "storefront_branches", legacy: "branches" },
  staff: { view: "storefront_staff", legacy: "staff" },
  reviews: { view: "storefront_reviews", legacy: "reviews" },
} as const;

export type StorefrontSource = keyof typeof STOREFRONT_SOURCES;

type QueryFailure = { code?: string; message?: string } | null;
export type StorefrontQueryResult<T> = { data: T | null; error: QueryFailure };

export function missingStorefrontView(
  error: QueryFailure,
  view: string,
): boolean {
  if (!error || (error.code !== "42P01" && error.code !== "PGRST205")) return false;
  if (!/^storefront_(tenants|catalog_items|branches|staff|reviews)$/.test(view)) return false;
  // A missing dependency can also produce 42P01. Do not silently expose
  // a broader base-table row set on that error.
  return (error.message ?? "").includes(view);
}

export async function queryPublicStorefront<T>(
  source: StorefrontSource,
  query: (table: string, legacy: boolean) => PromiseLike<StorefrontQueryResult<T>>,
  options: { requireView?: boolean } = {},
): Promise<StorefrontQueryResult<T>> {
  const mapping = STOREFRONT_SOURCES[source];
  const primary = await query(mapping.view, false);
  if (!primary.error) return primary;
  if (!options.requireView && missingStorefrontView(primary.error, mapping.view)) {
    return await query(mapping.legacy, true);
  }
  return primary;
}

export const publicViewsRequired =
  import.meta.env.VITE_SANADAK_STOREFRONT_VIEWS_REQUIRED === "true";
