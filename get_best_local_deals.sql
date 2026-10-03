-- Historical source reference. Establish the course database with supabase/migrations.

/* 

COOP & ICA:
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_best_local_deals';

Ta alltid en sökning baserat på cheapest_price - avg

*/

-- public
-- DROP INDEX idx_public_cp_store_product;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_public_cp_store_product
  ON public.current_prices (store_id, product_key)
  INCLUDE (price);

-- coop
-- DROP INDEX idx_coop_cp_store_product
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coop_cp_store_product
  ON coop.current_prices (store_id, product_key)
  INCLUDE (price);

-- View indexes are defined once below; course bootstrap uses supabase/migrations.

REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_active_deals;

-- FOR:

/* DROP MATERIALIZED VIEW public.mv_active_deals */

/* CREATE MATERIALIZED VIEW public.mv_active_deals AS
SELECT 
    cp.store_id, 
    cp.product_key,
    cp.price,
    p.avg_price,
    ((p.avg_price - cp.price) / p.avg_price)::real AS relevance,
    'ica'::text AS src
FROM public.current_prices cp
JOIN public.products p ON p.product_key = cp.product_key
WHERE p.avg_price > 0 AND cp.price < p.avg_price AND p.ingredients IS NOT NULL

UNION ALL

SELECT 
    cp.store_id, 
    cp.product_key,
    cp.price,
    p.avg_price,
    ((p.avg_price - cp.price) / p.avg_price)::real AS relevance,
    'coop'::text AS src
FROM coop.current_prices cp
JOIN coop.products p ON p.product_key = cp.product_key
WHERE p.avg_price > 0 AND cp.price < p.avg_price AND p.ingredients IS NOT NULL; */

CREATE UNIQUE INDEX idx_mv_deals_unique ON public.mv_active_deals (src, store_id, product_key);
CREATE INDEX idx_mv_deals_store_rel ON public.mv_active_deals (store_id, relevance DESC);

CREATE OR REPLACE FUNCTION public.get_best_local_deals(
  result_limit integer DEFAULT 30, 
  result_offset integer DEFAULT 0,
  user_lat double precision DEFAULT NULL, 
  user_lon double precision DEFAULT NULL,
  max_distance integer DEFAULT 30000)
 RETURNS TABLE(product jsonb, store jsonb, price jsonb, relevance real)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  has_loc boolean;
BEGIN
  has_loc := user_lat IS NOT NULL AND user_lon IS NOT NULL;
  IF NOT has_loc THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH nearby_stores AS (
    SELECT store_id, store_name, 'ica' AS src,
        ST_Distance(ST_MakePoint(lon,lat)::geography, ST_MakePoint(user_lon,user_lat)::geography) AS distance_m
    FROM public.stores
    WHERE ST_DWithin(ST_MakePoint(lon,lat)::geography, ST_MakePoint(user_lon,user_lat)::geography, max_distance)
    UNION ALL
    SELECT store_id, store_name, 'coop' AS src,
        ST_Distance(ST_MakePoint(lon,lat)::geography, ST_MakePoint(user_lon,user_lat)::geography) AS distance_m
    FROM coop.stores
    WHERE ST_DWithin(ST_MakePoint(lon,lat)::geography, ST_MakePoint(user_lon,user_lat)::geography, max_distance)
  ),
  local_deals AS (
    -- Fetch pre-calculated deals just for the stores nearby
    SELECT d.product_key, d.store_id, ns.store_name, ns.distance_m, 
           d.price, /* d.promo_price,  *//* d.effective_price, */ d.avg_price, d.relevance, d.src
    FROM nearby_stores ns
    JOIN public.mv_active_deals d ON d.store_id = ns.store_id AND d.src = ns.src
  ),
  cheapest_overall AS (
    -- Group the best deal per unique product key if it exists in multiple nearby stores
    SELECT DISTINCT ON (product_key) *
    FROM local_deals
    ORDER BY product_key, relevance DESC, distance_m ASC
  ),
  top_deals AS (
    -- Limit out the results
    SELECT *
    FROM cheapest_overall
    ORDER BY relevance DESC, price ASC, product_key ASC
    LIMIT result_limit OFFSET result_offset
  )
  -- Join to text-heavy `products` table strictly for the final ~30 items
  SELECT
    jsonb_build_object(
      'product_key', c.product_key, 
      'name', COALESCE(p_ica.name, p_coop.name), 
      'brand', COALESCE(p_ica.brand, p_coop.brand),
      'product_image_url', COALESCE(p_ica.product_image_url, p_coop.product_image_url), 
      'source', c.src, 
      'avg_price', c.avg_price
    ) AS product,
    jsonb_build_object(
      'store_id', c.store_id, 'store_name', c.store_name
    ) AS store,
    jsonb_build_object(
      'price', c.price/*,  'promo_price', c.promo_price, */ /* 'effective_price', c.effective_price */
    ) AS price,
    c.relevance
  FROM top_deals c
  LEFT JOIN public.products p_ica ON p_ica.product_key = c.product_key AND c.src = 'ica'
  LEFT JOIN coop.products p_coop ON p_coop.product_key = c.product_key AND c.src = 'coop'
  ORDER BY c.relevance DESC, c.price ASC, c.product_key ASC;
END;
$function$;

ALTER FUNCTION public.get_best_local_deals(integer, integer, double precision, double precision, integer)
  SET statement_timeout = '20s';