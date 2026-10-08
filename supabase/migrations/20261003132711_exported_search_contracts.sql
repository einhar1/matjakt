-- App-facing definitions derived from original Matjakt schema export, 2026-10-03.
-- Application scope: no crawler/history objects and no production data or broad grants.
set search_path = public, extensions;
CREATE OR REPLACE FUNCTION "public"."product_search_vector"("product_name" "text", "product_brand" "text", "product_type" "text", "product_information" "text", "ingredients" "text") RETURNS "tsvector"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN
    setweight(to_tsvector('swedish',  coalesce(product_name, '')),        'A') ||
    setweight(to_tsvector('swedish',  coalesce(product_brand, '')),       'B') ||
    setweight(to_tsvector('swedish',  coalesce(product_type, '')),        'C') ||
    setweight(to_tsvector('swedish',  coalesce(product_information, '')), 'D') ||
    setweight(to_tsvector('swedish',  coalesce(ingredients, '')),         'D') ||
    setweight(to_tsvector('english',  coalesce(product_name, '')),        'B') ||
    setweight(to_tsvector('english',  coalesce(product_brand, '')),       'C') ||
    setweight(to_tsvector('english',  coalesce(product_type, '')),        'D');
END;
$$;
alter function public.product_search_vector(text,text,text,text,text) set search_path = pg_catalog;
alter table public.products drop column search_vector;
alter table public.products add column search_vector tsvector generated always as (public.product_search_vector(name,brand,product_type,product_information,ingredients)) stored;
create index on public.products using gin(search_vector);
CREATE OR REPLACE FUNCTION "coop"."product_search_vector"("product_name" "text", "product_brand" "text", "product_type" "text", "product_information" "text", "ingredients" "text") RETURNS "tsvector"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN
    setweight(to_tsvector('swedish',  coalesce(product_name, '')),        'A') ||
    setweight(to_tsvector('swedish',  coalesce(product_brand, '')),       'B') ||
    setweight(to_tsvector('swedish',  coalesce(product_type, '')),        'C') ||
    setweight(to_tsvector('swedish',  coalesce(product_information, '')), 'D') ||
    setweight(to_tsvector('swedish',  coalesce(ingredients, '')),         'D') ||
    setweight(to_tsvector('english',  coalesce(product_name, '')),        'B') ||
    setweight(to_tsvector('english',  coalesce(product_brand, '')),       'C') ||
    setweight(to_tsvector('english',  coalesce(product_type, '')),        'D');
END;
$$;
alter function coop.product_search_vector(text,text,text,text,text) set search_path = pg_catalog;
alter table coop.products drop column search_vector;
alter table coop.products add column search_vector tsvector generated always as (coop.product_search_vector(name,brand,product_type,product_information,ingredients)) stored;
create index on coop.products using gin(search_vector);
CREATE OR REPLACE FUNCTION "public"."search_products_dev1_4"("search_term" "text", "result_limit" integer DEFAULT 9, "result_offset" integer DEFAULT 0, "user_lat" double precision DEFAULT NULL::double precision, "user_lon" double precision DEFAULT NULL::double precision, "max_distance" integer DEFAULT 30000, "store_filter" "text" DEFAULT NULL::"text", "sort_by" "text" DEFAULT 'relevance'::"text") RETURNS TABLE("product" "jsonb", "store" "jsonb", "current_price" "jsonb", "relevance" real)
    LANGUAGE "plpgsql" STABLE
    SET "statement_timeout" TO '20s'
    AS $$DECLARE
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
          'avg_price', tp.avg_price,
          'source', tp.src
      ) AS product,
      jsonb_build_object(
          'store_name', NULL
      ) AS store,
      jsonb_build_object(
          'price', tp.avg_price
      ) AS current_price,
      tp.relevance
      FROM top_products tp
      ORDER BY
        CASE WHEN sort_by = 'price' THEN tp.avg_price END ASC NULLS LAST,
        CASE WHEN sort_by = 'price' THEN NULL ELSE tp.relevance END DESC NULLS LAST,
        tp.name ASC, tp.product_key ASC, tp.src ASC;
  END;$$;
CREATE OR REPLACE FUNCTION "public"."get_best_local_deals"("result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0, "user_lat" double precision DEFAULT NULL::double precision, "user_lon" double precision DEFAULT NULL::double precision, "max_distance" integer DEFAULT 30000) RETURNS TABLE("product" "jsonb", "store" "jsonb", "price" "jsonb", "relevance" real)
    LANGUAGE "plpgsql" STABLE
    AS $$
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
$$;
alter function public.search_products_dev1_4(text,integer,integer,double precision,double precision,integer,text,text) set search_path = public, extensions;
alter function public.get_best_local_deals(integer,integer,double precision,double precision,integer) set search_path = public, extensions;
alter function public.search_products_dev1_4(text,integer,integer,double precision,double precision,integer,text,text) set statement_timeout = '20s';
alter function public.get_best_local_deals(integer,integer,double precision,double precision,integer) set statement_timeout = '20s';
alter table public.profiles add column display_name text;
alter table public.profiles add column created_at timestamptz default now();
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,new.raw_user_meta_data->>'display_name');
  return new;
end $$;