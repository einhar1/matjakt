-- Synthetic test fixtures only; never contains copied production users or prices.
insert into public.stores(store_id,store_name,city,zip_code,lat,lon) values
 ('1001','ICA Test Central','Stockholm','11122',59.3293,18.0686),
 ('1002','ICA Test North','Stockholm','11122',59.335,18.07),
 ('9001','ICA Test Far Away','Göteborg','41101',57.71,11.97);
insert into coop.stores(store_id,store_name,city,zip_code,lat,lon) values
 ('2001','Coop Test Central','Stockholm','11122',59.330,18.067);
insert into public.products(product_key,product_id,name,brand,pack_size,ingredients,avg_price,product_image_url) values
 ('ica_milk','ica_milk','Testmjölk 3%','Test dairy','1L','Mjölk',20,'/favicon.svg'),
 ('ica_coffee','ica_coffee','Testkaffe','Test roastery','500g','Kaffe',40,'/favicon.svg'),
 ('ica_bread','ica_bread','Testbröd','Test bakery','500g','Mjöl',30,'/favicon.svg');
insert into coop.products(product_key,product_id,name,brand,pack_size,ingredients,avg_price,product_image_url) values
 ('coop_milk','coop_milk','Testmjölk 3% Coop','Test dairy','1L','Mjölk',22,'/favicon.svg');
insert into public.current_prices(store_id,product_key,price,observed_at) values
 ('1001','ica_milk',15,'2026-01-01T00:00:00Z'),
 ('1002','ica_milk',25,'2026-01-01T00:00:00Z'),
 ('9001','ica_milk',10,'2026-01-01T00:00:00Z'),
 ('1001','ica_coffee',30,'2026-01-01T00:00:00Z'),
 ('1002','ica_coffee',50,'2026-01-01T00:00:00Z'),
 ('1001','ica_bread',30,'2026-01-01T00:00:00Z');
insert into coop.current_prices(store_id,product_key,price,observed_at) values
 ('2001','coop_milk',18,'2026-01-01T00:00:00Z');
insert into public.fuel_prices values ('petrol',20), ('diesel',19), ('none',0);
refresh materialized view public.mv_active_deals;
