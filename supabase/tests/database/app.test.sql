begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(15);
set local role anon;
select is((select count(*) from public.search_products_dev1_4('Testmjölk')),2::bigint,'search covers both chains');
select is((select count(*) from public.search_products_dev1_4('Testmjölk',9,0,null,null,30000,'coop')),1::bigint,'retailer filter');
select is((select count(*) from public.search_products_dev1_4('')),0::bigint,'empty search');
select is((select count(*) from public.search_products_dev1_4('zzznomatch')),0::bigint,'no matches');
select is((select count(*) from public.get_stores_within_radius(59.3293,18.0686,2)),2::bigint,'radius excludes distant store');
select is((select count(*) from coop.get_stores_within_radius(59.3293,18.0686,2)),1::bigint,'coop schema is usable');
select is((select price from public.find_cheapest_products(59.3293,18.0686,array['ica_milk'],'{}',2)),15::numeric,'cheapest local milk');
select is((select price from public.find_cheapest_products(59.3293,18.0686,array['ica_milk'],array['1002'],2)),25::numeric,'selected store');
select is((select count(*) from public.get_best_local_deals(30,0,59.3293,18.0686,2000)),3::bigint,'local deals use seeded materialized view');
select is((select count(*) from public.search_products_dev1_4('Test',1,0)),1::bigint,'page size');
select isnt((select product->>'product_key' from public.search_products_dev1_4('Test',1,0)),
  (select product->>'product_key' from public.search_products_dev1_4('Test',1,1)),'pagination does not repeat first row');
reset role;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','rls-a@example.test'),
 ('22222222-2222-4222-8222-222222222222','rls-b@example.test');
select is((select count(*) from public.profiles where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')),2::bigint,'signup trigger creates profiles');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select is((select count(*) from public.profiles),1::bigint,'A sees only own profile');
with changed as (update public.profiles set city='Forbidden' where id='22222222-2222-4222-8222-222222222222' returning id)
select is((select count(*) from changed),0::bigint,'A cannot update B');
with changed as (update public.profiles set city='Stockholm' where id='11111111-1111-4111-8111-111111111111' returning id)
select is((select count(*) from changed),1::bigint,'A can update own profile');
select * from finish();
rollback;
