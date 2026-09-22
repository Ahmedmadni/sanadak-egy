-- Gate 9A: parameterized public discovery with server-side filters and paging.
-- Only active tenants with an active, unexpired subscription may be returned.

BEGIN;

CREATE OR REPLACE FUNCTION public.search_tenants(
  _query text DEFAULT NULL,
  _category text DEFAULT NULL,
  _area text DEFAULT NULL,
  _verified_only boolean DEFAULT false,
  _sort text DEFAULT 'relevance',
  _limit integer DEFAULT 12,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  category text,
  area text,
  description text,
  image_url text,
  verified_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_query text := NULLIF(btrim(_query), '');
  v_category text := NULLIF(btrim(_category), '');
  v_area text := NULLIF(btrim(_area), '');
  v_sort text := COALESCE(_sort, 'relevance');
BEGIN
  IF char_length(v_query) > 100
     OR char_length(v_category) > 80
     OR char_length(v_area) > 80 THEN
    RAISE EXCEPTION 'search filter is too long';
  END IF;

  IF v_sort NOT IN ('relevance', 'name', 'newest') THEN
    RAISE EXCEPTION 'invalid search sort';
  END IF;

  IF _limit IS NULL OR _limit NOT BETWEEN 1 AND 30
     OR _offset IS NULL OR _offset NOT BETWEEN 0 AND 10000 THEN
    RAISE EXCEPTION 'invalid search page';
  END IF;

  RETURN QUERY
  WITH matches AS (
    SELECT
      t.id,
      t.slug,
      t.name,
      t.category,
      t.area,
      t.description,
      t.image_url,
      t.verified_at,
      t.created_at,
      CASE
        WHEN v_query IS NULL THEN 0
        WHEN lower(t.name) = lower(v_query) THEN 0
        WHEN position(lower(v_query) in lower(t.name)) = 1 THEN 1
        WHEN position(lower(v_query) in lower(t.name)) > 0 THEN 2
        ELSE 3
      END AS relevance_rank
    FROM public.tenants t
    LEFT JOIN public.activity_types a
      ON a.code = t.category
     AND a.is_active = true
    WHERE t.status = 'active'
      AND EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.tenant_id = t.id
          AND s.status = 'active'
          AND s.current_period_end > now()
      )
      AND (v_category IS NULL OR t.category = v_category)
      AND (v_area IS NULL OR position(lower(v_area) in lower(COALESCE(t.area, ''))) > 0)
      AND (NOT COALESCE(_verified_only, false) OR t.verified_at IS NOT NULL)
      AND (
        v_query IS NULL
        OR position(
          lower(v_query) in lower(concat_ws(
            ' ', t.name, t.description, t.area, t.category,
            a.label_ar, a.label_en
          ))
        ) > 0
      )
  )
  SELECT
    m.id,
    m.slug,
    m.name,
    m.category,
    m.area,
    m.description,
    m.image_url,
    m.verified_at,
    count(*) OVER () AS total_count
  FROM matches m
  ORDER BY
    CASE WHEN v_sort = 'relevance' THEN m.relevance_rank END ASC NULLS LAST,
    CASE WHEN v_sort = 'name' THEN lower(m.name) END ASC NULLS LAST,
    CASE WHEN v_sort = 'newest' THEN m.created_at END DESC NULLS LAST,
    m.verified_at DESC NULLS LAST,
    m.name ASC,
    m.id ASC
  LIMIT _limit
  OFFSET _offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_tenants(text, text, text, boolean, text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_tenants(text, text, text, boolean, text, integer, integer)
  TO anon, authenticated;

COMMENT ON FUNCTION public.search_tenants(text, text, text, boolean, text, integer, integer)
IS 'Returns paged public tenants with literal text search, category/area/verification filters, and subscription-gated visibility.';

COMMIT;
