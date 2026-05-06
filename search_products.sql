-- DROP INDEX IF EXISTS coop_store_points;
CREATE INDEX IF NOT EXISTS coop_store_points ON coop.stores USING GIST ((ST_MakePoint(lon, lat)::geography));
-- DROP INDEX IF EXISTS idx_coop_products_name_trgm_gin;
CREATE INDEX IF NOT EXISTS idx_coop_products_name_trgm_gin ON coop.products USING GIN (lower(name) gin_trgm_ops);
-- DROP INDEX IF EXISTS idx_coop_products_search_vector;
CREATE INDEX IF NOT EXISTS idx_coop_products_search_vector ON coop.products USING GIN (search_vector);

-- DROP INDEX IF EXISTS store_points;
CREATE INDEX IF NOT EXISTS store_points ON public.stores USING GIST ((ST_MakePoint(lon, lat)::geography));
-- DROP INDEX IF EXISTS idx_products_name_trgm_gin;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm_gin ON public.products USING GIN (lower(name) gin_trgm_ops);
-- DROP INDEX IF EXISTS idx_products_search_vector;
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING GIN (search_vector);

-- Indexes to speed up the nearby_keys CTE
CREATE INDEX IF NOT EXISTS idx_public_prices_store_id ON public.current_prices(store_id);
CREATE INDEX IF NOT EXISTS idx_coop_prices_store_id ON coop.current_prices(store_id);

/* 

COOP & ICA:
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'product_search_vector';

*/

DROP FUNCTION IF EXISTS public.search_products_dev1_3(text, integer, integer, double precision, double precision, integer);

CREATE OR REPLACE FUNCTION public.search_products_dev1_4(
  search_term text,
  result_limit integer DEFAULT 9,
  result_offset integer DEFAULT 0,
  user_lat double precision DEFAULT NULL,
  user_lon double precision DEFAULT NULL,
  max_distance integer DEFAULT 30000,
  store_filter text DEFAULT NULL,
  sort_by text DEFAULT 'relevance')
 RETURNS TABLE(product jsonb, store jsonb, current_price jsonb, relevance real)
 LANGUAGE plpgsql
 STABLE
AS $function$DECLARE
  sanitized     TEXT;
  query_sv      tsquery;
  query_en      tsquery;
  has_loc       boolean;
  include_ica   boolean;
  include_coop  boolean;
BEGIN
  sanitized := trim(search_term);

  IF sanitized = '' THEN
    RETURN;
  END IF;

  query_sv := websearch_to_tsquery('swedish',  sanitized);
  query_en := websearch_to_tsquery('english',  sanitized);
  has_loc := user_lat IS NOT NULL AND user_lon IS NOT NULL;
  include_ica  := store_filter IS NULL OR store_filter = 'ica';
  include_coop := store_filter IS NULL OR store_filter = 'coop';

  RETURN QUERY
  WITH
  nearby_stores AS (
    SELECT store_id FROM public.stores
    WHERE include_ica AND has_loc AND ST_DWithin(ST_MakePoint(lon,lat)::geography,
                                 ST_MakePoint(user_lon,user_lat)::geography, max_distance)
    UNION ALL
    SELECT store_id FROM coop.stores
    WHERE include_coop AND has_loc AND ST_DWithin(ST_MakePoint(lon,lat)::geography,
                                 ST_MakePoint(user_lon,user_lat)::geography, max_distance)
  ),
  nearby_keys AS (
    SELECT DISTINCT product_key FROM public.current_prices
    WHERE include_ica AND has_loc AND store_id IN (SELECT store_id FROM nearby_stores)
    UNION
    SELECT DISTINCT product_key FROM coop.current_prices
    WHERE include_coop AND has_loc AND store_id IN (SELECT store_id FROM nearby_stores)
  ),

  all_products AS (
    SELECT product_key, name, brand, product_image_url, search_vector, avg_price, 'ica' AS src
    FROM public.products
    WHERE include_ica
    UNION ALL
    SELECT product_key, name, brand, product_image_url, search_vector, avg_price, 'coop'
    FROM coop.products
    WHERE include_coop
  ),

  candidates AS (
  SELECT p.*
  FROM all_products p
  WHERE (
      p.search_vector @@ query_sv
      OR p.search_vector @@ query_en
      OR lower(p.name) % lower(sanitized) 
    )
    AND (NOT has_loc OR p.product_key IN (SELECT product_key FROM nearby_keys))
  ),

  top_products AS (
  SELECT
    c.product_key, c.name, c.brand, c.product_image_url, c.avg_price, c.src,
    (
      coalesce(ts_rank_cd(c.search_vector, query_sv, 32), 0) * 3.0 +
      coalesce(ts_rank_cd(c.search_vector, query_en, 32), 0) * 2.0 +
      CASE
        WHEN c.name ILIKE sanitized || '%' THEN 8.0
        WHEN c.name ILIKE '%' || sanitized || '%' THEN 3.0
        ELSE 0
      END +
      similarity(lower(c.name), lower(sanitized)) * 2.0
    )::real AS relevance
  FROM candidates c
  ORDER BY
    CASE WHEN sort_by = 'price' THEN c.avg_price END ASC NULLS LAST,
    CASE WHEN sort_by = 'price' THEN NULL ELSE
      coalesce(ts_rank_cd(c.search_vector, query_sv, 32), 0) * 3.0 +
      coalesce(ts_rank_cd(c.search_vector, query_en, 32), 0) * 2.0 +
      CASE
        WHEN c.name ILIKE sanitized || '%' THEN 8.0
        WHEN c.name ILIKE '%' || sanitized || '%' THEN 3.0
        ELSE 0
      END +
      similarity(lower(c.name), lower(sanitized)) * 2.0
    END DESC NULLS LAST,
    c.name ASC, c.product_key ASC, c.src ASC
  LIMIT result_limit
  OFFSET result_offset
  )

  SELECT
    jsonb_build_object(
        'product_key', tp.product_key,
        'name', tp.name,
        'brand', tp.brand,
        'product_image_url', tp.product_image_url,
        'source', tp.src
    ) AS product,
    jsonb_build_object(
        'store_name', NULL
    ) AS store,
    jsonb_build_object(
        'price', tp.avg_price/* , */
        -- 'promo_price', NULL
    ) AS current_price,
    tp.relevance
    FROM top_products tp
    ORDER BY
      CASE WHEN sort_by = 'price' THEN tp.avg_price END ASC NULLS LAST,
      CASE WHEN sort_by = 'price' THEN NULL ELSE tp.relevance END DESC NULLS LAST,
      tp.name ASC, tp.product_key ASC, tp.src ASC;
END;$function$;

ALTER FUNCTION public.search_products_dev1_4(text, integer, integer, double precision, double precision, integer, text, text)
  SET statement_timeout = '20s';