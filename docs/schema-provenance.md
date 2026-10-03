# Database provenance and course adaptations

The original project's `public` and `coop` schemas were exported with the authenticated Supabase CLI on 2026-10-03, without exporting data. The audit dump is private/ignored at `output/source-schema-audit.sql`. No migration was applied to original Matjakt.

The app-facing tables and functions were inspected against that export:
`stores`, `products`, `current_prices`, `fuel_prices`, `profiles`,
`search_products_dev1_4`, `get_best_local_deals`,
`get_stores_within_radius`, `find_cheapest_products`, weighted `product_search_vector`, and the new-user trigger.

The course baseline intentionally contains the app-facing subset, rather than crawler ingestion/history tables or obsolete search RPCs. Synthetic prices replace scraped data. Course differences:

- Catalog tables expose read-only access through RLS and explicit grants. Exported broad catalog grants are not copied.
- Profile authorization is based on Auth user ID. The new-user security-definer trigger is kept in an unexposed private schema with a fixed search path.
- App-required columns are preserved; course fixtures use stricter non-null/default/check constraints, and no crawler-run foreign keys.
- Weighted search-vector definitions and active search/deals function bodies are derived from the original export.
- Checkout radius/cheapest selection use PostGIS to avoid the floating-point `acos` boundary issue, preserving RPC arguments and response fields.
- The course materialized deals view includes available catalog prices and is refreshed after seed; its public contents contain no profile/user data.

Migration comments identify the adaptations. Tests prove the retained app-facing behavior on course fixtures; they do not claim crawler or full production-schema parity.
