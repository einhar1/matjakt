import type { OfferItem } from "./components/OfferCard";

export const mockOffers: OfferItem[] = [
  {
    product: {
      product_key: 'prod_001',
      product_id: 'ica_101',
      name: 'Standardmjölk 3%',
      brand: 'Arla',
      pack_size: '1L',
      country_of_origin: 'Sverige',
      unit: 'l',
      product_type: 'dairy',
      is_alcohol: false,
      first_seen_at: '2024-01-15T10:00:00Z',
      last_seen_at: new Date().toISOString(),
      product_image_url: '../src/assets/standardmjolk.avif'
    },
    store: {
      store_id: 'store_001',
      source_store_catalog_id: 'ica_maxi_001',
      store_name: 'ICA Maxi',
      city: 'Stockholm',
      zip_code: '11122',
      street: 'Storgatan 1',
      area: 'Södermalm',
      slug: 'ica-maxi-stockholm',
      store_format: 'maxi',
      lat: 59.3293,
      lon: 18.0686,
      delivery_methods: ['pickup', 'delivery'],
      first_seen_at: '2024-01-01T00:00:00Z',
      last_seen_at: new Date().toISOString()
    },
    currentPrice: {
      store_id: 'store_001',
      product_key: 'prod_001',
      run_id: 'run_2024_001',
      observed_at: new Date().toISOString(),
      price: 16.95,
      promo_price: 12.90,
      unit_price: 16.95,
      promo_unit_price: 12.90,
      currency: 'SEK',
      available: true
    }
  }
];