
/* TODO

Bara så jag kan använda till homeview
*/

export type CrawlRun = {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  total_stores: number;
  succeeded_stores: number;
  failed_stores: number;
  metadata: unknown; // Endast definierad som JSONB i SQL (DEFAULT '{}')
}

export type CrawlStoreStatus = {
  run_id: string;
  store_id: string;
  store_name: string | null;
  attempts: number;
  status: string;
  last_error: string | null;
  output_path: string | null;
  updated_at: string;
}

export type Store = {
  store_id: string;
  source_store_catalog_id: string | null;
  store_name: string | null;
  city: string | null;
  zip_code: string | null;
  street: string | null;
  area: string | null;
  slug: string | null;
  store_format: string | null;
  lat: number | null;
  lon: number | null;
  delivery_methods: unknown; // Endast definierad som JSONB i SQL (DEFAULT '[]')
  first_seen_at: string; 
  last_seen_at: string;
}
/* 
export type DeliveryMethod = {
}; */

export type Product = {
  product_key: string;
  product_id: string | null;
  name: string | null;
  brand: string | null;
  pack_size: string | null;
  country_of_origin: string | null;
  product_image_url: string | null;
  unit: string | null;
  product_type: string | null;
  is_alcohol: boolean | null;
  first_seen_at: string;
  last_seen_at: string;
}

export type StoreProduct = {
  store_id: string;
  product_key: string;
  retailer_product_id: string;
  category_id: string | null;
  category_name: string | null;
  category_path: string | null;
  available: boolean | null;
  is_new: boolean | null;
  first_seen_at: string;
  last_seen_at: string;
}

export type CurrentPrice = {
  store_id: string;
  product_key: string;
  run_id: string;
  observed_at: string;  // eller date-objekt
  price: number | null;
  promo_price: number | null;
  unit_price: number | null;
  promo_unit_price: number | null;
  currency: string | null;
  available: boolean | null;
}

export type PriceChange = {
  id: number;
  run_id: string;
  store_id: string;
  product_key: string;
  observed_at: string;  // eller date-objekt
  price: number | null;
  promo_price: number | null;
  unit_price: number | null;
  promo_unit_price: number | null;
  currency: string | null;
  available: boolean | null;
  change_fields: string[];
  previous_snapshot: unknown;  // Endast definierad som JSONB i SQL
  current_snapshot: unknown;  // Endast definierad som JSONB i SQL
  created_at: string;
}
