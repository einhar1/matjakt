set search_path = public, extensions;
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
        'source', tp.src, 'avg_price', tp.avg_price
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

-- Additional RPC contracts used by CheckoutView, in both retailer schemas.

create or replace function public.get_stores_within_radius(
  user_lat double precision, user_lon double precision, radius_km double precision default 10
) returns table(store_id text,store_name text,lat double precision,lon double precision,distance_km double precision)
language sql stable set search_path = public, extensions as $$
  select s.store_id,s.store_name,s.lat,s.lon,
    ST_Distance(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography)/1000
  from public.stores s
  where ST_DWithin(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography,greatest(radius_km,0)*1000)
  order by 5,s.store_id
$$;
create or replace function public.find_cheapest_products(
  user_lat double precision,user_lon double precision,product_ids text[],
  selected_store_ids text[] default '{}',radius_km double precision default 99999
) returns table(product_id text,product_key text,name text,brand text,pack_size text,country_of_origin text,
  product_image_url text,product_information text,ingredients text,avg_price numeric,price numeric,
  store_id text,store_name text,lat double precision,lon double precision,available boolean,distance_km double precision)
language sql stable set search_path = public, extensions as $$
  select distinct on (p.product_key) p.product_id,p.product_key,p.name,p.brand,p.pack_size,p.country_of_origin,
    p.product_image_url,p.product_information,p.ingredients,p.avg_price,cp.price,
    s.store_id,s.store_name,s.lat,s.lon,cp.available,
    ST_Distance(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography)/1000
  from public.products p
  join public.current_prices cp using(product_key)
  join public.stores s using(store_id)
  where p.product_key = any(product_ids) and cp.available
    and (coalesce(cardinality(selected_store_ids),0)=0 or s.store_id=any(selected_store_ids))
    and ST_DWithin(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography,greatest(radius_km,0)*1000)
  order by p.product_key,cp.price,s.store_id
$$;
revoke all on function public.get_stores_within_radius(double precision,double precision,double precision) from public;
revoke all on function public.find_cheapest_products(double precision,double precision,text[],text[],double precision) from public;
grant execute on function public.get_stores_within_radius(double precision,double precision,double precision) to anon,authenticated;
grant execute on function public.find_cheapest_products(double precision,double precision,text[],text[],double precision) to anon,authenticated;

create or replace function coop.get_stores_within_radius(
  user_lat double precision, user_lon double precision, radius_km double precision default 10
) returns table(store_id text,store_name text,lat double precision,lon double precision,distance_km double precision)
language sql stable set search_path = public, extensions as $$
  select s.store_id,s.store_name,s.lat,s.lon,
    ST_Distance(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography)/1000
  from coop.stores s
  where ST_DWithin(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography,greatest(radius_km,0)*1000)
  order by 5,s.store_id
$$;
create or replace function coop.find_cheapest_products(
  user_lat double precision,user_lon double precision,product_ids text[],
  selected_store_ids text[] default '{}',radius_km double precision default 99999
) returns table(product_id text,product_key text,name text,brand text,pack_size text,country_of_origin text,
  product_image_url text,product_information text,ingredients text,avg_price numeric,price numeric,
  store_id text,store_name text,lat double precision,lon double precision,available boolean,distance_km double precision)
language sql stable set search_path = public, extensions as $$
  select distinct on (p.product_key) p.product_id,p.product_key,p.name,p.brand,p.pack_size,p.country_of_origin,
    p.product_image_url,p.product_information,p.ingredients,p.avg_price,cp.price,
    s.store_id,s.store_name,s.lat,s.lon,cp.available,
    ST_Distance(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography)/1000
  from coop.products p
  join coop.current_prices cp using(product_key)
  join coop.stores s using(store_id)
  where p.product_key = any(product_ids) and cp.available
    and (coalesce(cardinality(selected_store_ids),0)=0 or s.store_id=any(selected_store_ids))
    and ST_DWithin(ST_MakePoint(s.lon,s.lat)::geography,ST_MakePoint(user_lon,user_lat)::geography,greatest(radius_km,0)*1000)
  order by p.product_key,cp.price,s.store_id
$$;
revoke all on function coop.get_stores_within_radius(double precision,double precision,double precision) from public;
revoke all on function coop.find_cheapest_products(double precision,double precision,text[],text[],double precision) from public;
grant execute on function coop.get_stores_within_radius(double precision,double precision,double precision) to anon,authenticated;
grant execute on function coop.find_cheapest_products(double precision,double precision,text[],text[],double precision) to anon,authenticated;

revoke all on function public.search_products_dev1_4(text,integer,integer,double precision,double precision,integer,text,text) from public;
revoke all on function public.get_best_local_deals(integer,integer,double precision,double precision,integer) from public;
grant execute on function public.search_products_dev1_4(text,integer,integer,double precision,double precision,integer,text,text) to anon,authenticated;
grant execute on function public.get_best_local_deals(integer,integer,double precision,double precision,integer) to anon,authenticated;
alter function public.search_products_dev1_4(text,integer,integer,double precision,double precision,integer,text,text) set search_path = public, extensions;
alter function public.get_best_local_deals(integer,integer,double precision,double precision,integer) set search_path = public, extensions;
