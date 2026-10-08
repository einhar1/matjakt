-- Application baseline reconstructed from checked-in application contracts.
-- NOT an export of the existing Matjakt database. Never apply to that project.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists coop;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema public, coop, extensions to anon, authenticated;
set search_path = public, extensions;

do $baseline$
declare ns text;
begin
  foreach ns in array array['public','coop'] loop
    execute format('create table %I.stores (
      store_id text primary key, source_store_catalog_id text,
      store_name text not null, city text, zip_code text, street text, area text, slug text,
      store_format text, lat double precision not null, lon double precision not null,
      delivery_methods jsonb not null default ''[]'', first_seen_at timestamptz not null default now(),
      last_seen_at timestamptz not null default now())', ns);
    execute format('create table %I.products (
      product_key text primary key, product_id text unique, name text not null, brand text,
      pack_size text, country_of_origin text, product_image_url text not null default '''',
      unit text, product_type text, is_alcohol boolean not null default false,
      product_information text not null default '''', ingredients text not null default '''',
      avg_price numeric not null check (avg_price >= 0),
      search_vector tsvector generated always as (to_tsvector(''swedish''::regconfig, name)) stored,
      first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now())', ns);
    execute format('create table %I.current_prices (
      store_id text not null references %I.stores, product_key text not null references %I.products,
      run_id text not null default ''course-fixture'', observed_at timestamptz not null default now(),
      price numeric not null check(price >= 0), promo_price numeric, unit_price numeric,
      promo_unit_price numeric, currency text not null default ''SEK'', available boolean not null default true,
      primary key(store_id, product_key))', ns, ns, ns);
    execute format('create index on %I.stores using gist ((ST_MakePoint(lon, lat)::geography))', ns);
    execute format('create index on %I.products using gin (lower(name) gin_trgm_ops)', ns);
    execute format('create index on %I.products using gin (search_vector)', ns);
    execute format('create index on %I.current_prices(product_key)', ns);
    execute format('alter table %I.stores enable row level security', ns);
    execute format('alter table %I.products enable row level security', ns);
    execute format('alter table %I.current_prices enable row level security', ns);
    execute format('create policy catalog_read on %I.stores for select to anon, authenticated using (true)', ns);
    execute format('create policy catalog_read on %I.products for select to anon, authenticated using (true)', ns);
    execute format('create policy catalog_read on %I.current_prices for select to anon, authenticated using (true)', ns);
    execute format('revoke all on %I.stores, %I.products, %I.current_prices from anon, authenticated', ns, ns, ns);
    execute format('grant select on %I.stores, %I.products, %I.current_prices to anon, authenticated', ns, ns, ns);
  end loop;
end $baseline$;

create table public.fuel_prices (fuel_type text primary key, price_sek numeric not null check(price_sek >= 0));
alter table public.fuel_prices enable row level security;
create policy fuel_read on public.fuel_prices for select to anon, authenticated using (true);
revoke all on public.fuel_prices from anon, authenticated;
grant select on public.fuel_prices to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  postal_code text not null default '', city text not null default '', county text not null default '',
  latitude double precision not null default 0, longitude double precision not null default 0,
  max_distance numeric not null default 10 check (max_distance > 0),
  uses_location boolean not null default false, has_senior_discount boolean not null default false,
  senior_discount_percent numeric not null default 0 check (senior_discount_percent between 0 and 100),
  cart jsonb not null default '[]' check (jsonb_typeof(cart) = 'array')
);
alter table public.profiles enable row level security;
create policy own_profile_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy own_profile_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values(new.id);
  return new;
end $$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create materialized view public.mv_active_deals as
select cp.store_id, cp.product_key, cp.price, p.avg_price,
  ((p.avg_price-cp.price)/nullif(p.avg_price,0))::real as relevance, 'ica'::text as src
from public.current_prices cp join public.products p using(product_key)
where cp.available and p.avg_price > 0 and cp.price < p.avg_price and p.ingredients is not null
union all
select cp.store_id, cp.product_key, cp.price, p.avg_price,
  ((p.avg_price-cp.price)/nullif(p.avg_price,0))::real, 'coop'::text
from coop.current_prices cp join coop.products p using(product_key)
where cp.available and p.avg_price > 0 and cp.price < p.avg_price and p.ingredients is not null;
create unique index idx_mv_deals_unique on public.mv_active_deals(src,store_id,product_key);
create index idx_mv_deals_store_rel on public.mv_active_deals(store_id,relevance desc);
-- Catalog data only. Materialized views do not support RLS.
revoke all on public.mv_active_deals from anon, authenticated;
grant select on public.mv_active_deals to anon, authenticated;
