# Production catalog snapshot

## Status on 2026-10-05

The team approved a one-time catalog-only copy from original Matjakt (qzpyabesygoljpohguxw) to the course project (ixrkepmiwiyqdvckqflt). **Committed at 2026-10-05 18:55 UTC**, after the team expanded the course disk. Earlier disk/WAL failures rolled back without catalog changes. Final counts match the export: 89,618 products, 538 stores and 5,940,377 prices, plus three fuel prices. Course profiles remain unchanged (zero rows), all seven catalog tables retain RLS, there are no orphan prices, and the private staging schema is absent. The refreshed deals view contains 2,134,596 rows; the database occupies approximately 2.04 GB, excluding WAL and other disk usage.

The existing live app passed smoke testing with mjölk. A real ICA product journey passed search, details, cart, calculation and quantity doubling: Mjölk 3% 1l ICA costs 3.00 SEK at ICA Kvantum Kungsholmen within 10 km of 59.3293/18.0686. The database RPC returned the same product, store and price; two items cost 6.00 SEK in the UI. Both ICA and Coop searches return results with the browser anon role. This is a functional check, not a performance benchmark.

## Imported snapshot

| Table | Rows |
|---|---:|
| public.products | 57,016 |
| coop.products | 32,602 |
| public.stores | 347 |
| coop.stores | 191 |
| public.current_prices | 4,313,888 |
| coop.current_prices | 1,626,489 |
| public.fuel_prices | 3 |

Export SHA-256: `4c12daefa61c2e02669b5a77c43d35515a76c738bea83d0a9e55cb8f522a48f7`.
Backup SHA-256: `fef249da4e550461955c039858123623f017840dd1a90dbcf66dd801bb005bc4`.
These are counts from COPY rows in one consistent pg_dump snapshot. Auth, profiles, crawler state/history and Storage objects are excluded. Images remain external URLs. Prices represent the export snapshot; no ongoing synchronization is configured.

## Import procedure

The data files and connection details stay in ignored output/catalog-copy/. Never commit or upload them as CI artifacts. Preserve course-before.sql before replacement. Export both backups with PostgreSQL 17 pg_dump, --data-only --no-owner --no-privileges, and explicit --table options for only the seven tables above. Use TLS session-pooler connections and credentials in PG environment variables. Production access must be read-only, including SET ROLE postgres when using the CLI's temporary login role. Do not copy the entire public schema because it includes profiles.

Apply ordered migrations to the course project first. The compatibility migration permits original NULL product descriptions, ingredients, alcohol flags and store coordinates; it preserves RLS, grants and RPC contracts. Two Coop stores have no coordinates, and geographic selection excludes them. Original fuel scraped_at is excluded because the app uses fuel_type and price_sek only.

Ensure disk space covers staging, indexes, final tables, sort files and WAL, rather than just the SQL file size. The initial small course disk could not complete this snapshot. Coordinate with releases; do not run imports concurrently with schema migrations or catalog edits.

Then run:

```sh
node scripts/import-course-catalog.mjs prepare
node scripts/import-course-catalog.mjs apply
```

prepare consumes the two completed local dumps and writes staged-import.sql plus a checksum/count manifest. It refuses to overwrite an existing prepared import. Archive the previous staged-import.sql before preparing again. apply accepts COURSE_SUPABASE_DB_URL or the ignored output/course-db-url.local, verifies the exact course ref/TLS/session port, and checks all three checksums. It runs psql with --single-transaction and ON_ERROR_STOP.

Private unlogged staging tables enforce destination NOT NULL/CHECK constraints; primary/unique keys and references are validated before catalog deletion. Destination table objects, RLS and grants remain intact. The transaction replaces only the catalog, checks final counts and unchanged course profiles, refreshes public.mv_active_deals, analyzes tables and removes staging. Any failure aborts the transaction; completedAt is recorded only after a successful commit. PANIC/connection loss requires verifying database recovery before retrying.

After commit, compare manifest counts with SQL counts, verify orphan-free prices/RLS, and run the hosted smoke test with SMOKE_SEARCH_TERM=mjölk. Local/CI seed remains synthetic. Hosted releases select mjölk through release-course.mjs; local smoke defaults to Kursmjölk.

To recover the old catalog, use course-before.sql in a guarded single transaction with foreign-key-safe deletion of only these catalog tables, restore COPY data, and refresh the materialized view. Verify the destination project and profile count first. Do not reset the hosted project or restore an entire production database.

Sources: [Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [disk usage](https://supabase.com/docs/guides/platform/database-size).
