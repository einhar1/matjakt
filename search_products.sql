-- DROP INDEX IF EXISTS store_points;
CREATE INDEX store_points ON stores USING GIST ((ST_MakePoint(lon, lat)::geography));
-- DROP INDEX IF EXISTS idx_products_name_trgm_gin;
CREATE INDEX idx_products_name_trgm_gin ON products USING GIN (lower(name) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_products_dev(
  search_term text, 
  result_limit integer DEFAULT 9, 
  result_offset integer DEFAULT 0,
  user_lat double precision DEFAULT NULL, 
  user_lon double precision DEFAULT NULL,
  max_distance integer DEFAULT 30000)
 RETURNS TABLE(product jsonb, store jsonb, current_price jsonb, relevance real)
 LANGUAGE plpgsql
 STABLE
AS $function$DECLARE
  sanitized     TEXT;
  query_sv      tsquery;
  query_en      tsquery;
--   sim_threshold REAL := 0.15;
BEGIN
  sanitized := trim(search_term);

  IF sanitized = '' THEN
    RETURN;
  END IF;

  query_sv := websearch_to_tsquery('swedish',  sanitized);
  query_en := websearch_to_tsquery('english',  sanitized);

  RETURN QUERY

  WITH top_products AS (
  SELECT
    p.product_key,
    p.product_id,
    p.name,
    p.brand,
    p.pack_size,
    p.product_type,
    p.unit,
    p.product_image_url,
    p.country_of_origin,
    (
      coalesce(ts_rank_cd(p.search_vector, query_sv, 32), 0) * 3.0 +
      coalesce(ts_rank_cd(p.search_vector, query_en, 32), 0) * 2.0 +
      CASE
        WHEN p.name ILIKE sanitized || '%' THEN 8.0
        WHEN p.name ILIKE '%' || sanitized || '%' THEN 3.0
        ELSE 0
      END +
      similarity(lower(p.name), lower(sanitized)) * 2.0
    )::REAL AS relevance
  FROM products p 
  WHERE
    (p.search_vector @@ query_sv
    OR p.search_vector @@ query_en
    OR p.name  ILIKE '%' || sanitized || '%'
    OR p.brand ILIKE '%' || sanitized || '%'
    OR lower(p.name) % lower(sanitized)) /* Works with the index, uses 0.3 */
    -- OR similarity(lower(p.name), lower(sanitized)) > sim_threshold)
    AND ( 
        user_lon IS NULL OR user_lat IS NULL OR 
        EXISTS (
            SELECT 1 FROM current_prices cp
            INNER JOIN stores s ON s.store_id = cp.store_id
            WHERE cp.product_key = p.product_key
            AND ST_DWithin(ST_MakePoint(s.lon, s.lat)::geography, ST_MakePoint(user_lon, user_lat)::geography, max_distance) 
            )
        )

    ORDER BY relevance DESC, p.name DESC, p.product_key DESC
    LIMIT result_limit
    OFFSET result_offset
  )

  SELECT 
    -- add only what OfferCard uses
    jsonb_build_object(
        'product_key', tp.product_key,
        'name', tp.name,
        'brand', tp.brand,
        'product_image_url', tp.product_image_url
    ) AS product,
    jsonb_build_object(
        'store_name', cheapest_store.store_name
    ) AS store,
    jsonb_build_object(
        'price', cheapest_store.price,
        'promo_price', cheapest_store.promo_price
    ) AS current_price,
    -- tp.product_key,
    -- tp.product_id,
    -- tp.name,
    -- tp.brand,
    -- tp.pack_size,
    -- tp.product_type,
    -- tp.unit,
    -- tp.product_image_url,
    -- tp.country_of_origin,
    tp.relevance
    -- cheapest_store.price AS cheapest_price,
    -- cheapest_store.store_id,
    -- cheapest_store.store_name
    FROM top_products tp
    LEFT JOIN LATERAL (
        SELECT cp.price, cp.promo_price, s.store_name
        FROM current_prices cp
        INNER JOIN stores s ON s.store_id = cp.store_id
        WHERE cp.product_key = tp.product_key
        AND ( user_lon IS NULL OR user_lat IS NULL OR ST_DWithin(ST_MakePoint(s.lon, s.lat)::geography, ST_MakePoint(user_lon, user_lat)::geography, max_distance) )
        ORDER BY cp.price ASC
        LIMIT 1
    ) AS cheapest_store ON true
    ORDER BY tp.relevance DESC, tp.name DESC, tp.product_key DESC;
END;$function$