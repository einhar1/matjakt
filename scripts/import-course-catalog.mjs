// One-time catalog import. Dumps stay local under ignored output/; never runs in CI.
import { createReadStream, createWriteStream, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const ref = 'ixrkepmiwiyqdvckqflt';
const tables = ['public.stores', 'public.products', 'public.current_prices', 'coop.stores', 'coop.products', 'coop.current_prices', 'public.fuel_prices'];
const columns = {
  stores: ['store_id', 'source_store_catalog_id', 'store_name', 'city', 'zip_code', 'street', 'area', 'slug', 'store_format', 'lat', 'lon', 'delivery_methods', 'first_seen_at', 'last_seen_at'],
  products: ['product_key', 'product_id', 'name', 'brand', 'pack_size', 'country_of_origin', 'product_image_url', 'unit', 'product_type', 'is_alcohol', 'product_information', 'ingredients', 'avg_price', 'first_seen_at', 'last_seen_at'],
  current_prices: ['store_id', 'product_key', 'run_id', 'observed_at', 'price', 'promo_price', 'unit_price', 'promo_unit_price', 'currency', 'available'],
  fuel_prices: ['fuel_type', 'price_sek'],
};
function targetEnvironment() {
  const parsed = new URL(process.env.COURSE_SUPABASE_DB_URL || readFileSync('output/course-db-url.local', 'utf8').trim());
  if (parsed.username !== 'postgres.' + ref || parsed.port !== '5432' ||
      !parsed.password || parsed.searchParams.get('sslmode') !== 'require' || !/^[a-z0-9-]+[.]pooler[.]supabase[.]com$/.test(parsed.hostname)) {
    throw new Error('Refusing import: connection must target the approved course project over TLS.');
  }
  return { ...process.env, PGHOST: parsed.hostname, PGPORT: parsed.port, PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password), PGDATABASE: 'postgres', PGSSLMODE: 'require' };
}
const stage = table => 'snapshot_' + table.replace('.', '_');
const base = resolve('output/catalog-copy');
const file = name => resolve(base, name);
async function hash(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}
export async function* copyLines(path) {
  let remaining = '';
  for await (const chunk of createReadStream(path, { encoding: 'utf8' })) {
    remaining += chunk; let start = 0, end;
    while ((end = remaining.indexOf('\n', start)) >= 0) {
      const line = remaining.slice(start, end);
      yield line.endsWith('\r') ? line.slice(0, -1) : line;
      start = end + 1;
    }
    remaining = remaining.slice(start);
  }
  if (remaining) yield remaining;
}
const sqlCounts = list => list.map(t => "select '" + t + "' as name,count(*) as rows from " + t).join(' union all ');
async function prepare() {
  if (!statSync(file('course-before.sql')).size || !statSync(file('production-catalog.sql')).size) throw new Error('Both completed dumps are required.');
  const out = createWriteStream(file('staged-import.sql'), { flags: 'wx' });
  let buffer = '';
  async function emit(text) {
    buffer += text + '\n';
    if (buffer.length < 1024 * 1024) return;
    const pending = buffer; buffer = '';
    if (!out.write(pending)) await once(out, 'drain');
  }
  await emit("set client_encoding='UTF8'; set standard_conforming_strings=on; set statement_timeout=0; set lock_timeout='15s'; set search_path=catalog_snapshot_stage,public,extensions;");
  await emit('create schema catalog_snapshot_stage; revoke all on schema catalog_snapshot_stage from public,anon,authenticated;');
  await emit('create unlogged table snapshot_profile_before as select * from public.profiles;');
  for (const table of tables) await emit('create unlogged table ' + stage(table) + ' (like ' + table + ' including constraints);');
  await emit('alter table snapshot_public_fuel_prices add column scraped_at timestamptz;');
  const counts = {}; let active;
  for await (const line of copyLines(file('production-catalog.sql'))) {
    if (active) {
      await emit(line);
      if (line === '\\.') active = undefined;
      else counts[active]++;
      continue;
    }
    if (!line.startsWith('COPY ')) continue;
    const match = line.match(/^COPY (public|coop)\.(\w+) \(([^)]+)\) FROM stdin;$/);
    if (!match) throw new Error('Unexpected COPY header.');
    const table = match[1] + '.' + match[2];
    if (!tables.includes(table) || counts[table] !== undefined) throw new Error('Unexpected or duplicate table: ' + table);
    const fields = match[3].split(',').map(c => c.trim());
    const allowed = [...columns[match[2]], ...(match[2] === 'fuel_prices' ? ['scraped_at'] : [])];
    if (fields.some(c => !allowed.includes(c)) || columns[match[2]].some(c => !fields.includes(c))) throw new Error('Unexpected columns: ' + table);
    counts[table] = 0; active = table;
    await emit('COPY ' + stage(table) + ' (' + fields.join(',') + ') FROM stdin;');
  }
  if (active || tables.some(t => !counts[t])) throw new Error('Incomplete or empty catalog dump.');
  // Validate in place: cloning whole price tables would unnecessarily double peak disk use.
  for (const table of tables) {
    const name = table.split('.')[1];
    const keys = name === 'stores' ? 'store_id' : name === 'products' ? 'product_key' : name === 'current_prices' ? 'store_id,product_key' : 'fuel_type';
    await emit('alter table ' + stage(table) + ' add primary key (' + keys + ');');
    if (name === 'products') await emit('alter table ' + stage(table) + ' add unique (product_id);');
    await emit('analyze ' + stage(table) + ';');
  }
  for (const ns of ['public', 'coop']) {
    await emit("do $$ begin if exists(select 1 from snapshot_" + ns + "_current_prices p left join snapshot_" + ns + "_stores s using(store_id) left join snapshot_" + ns + "_products q using(product_key) where s.store_id is null or q.product_key is null) then raise exception 'Snapshot contains orphan prices'; end if; end $$;");
  }
  // Nothing in the destination catalog is deleted until all staged tables pass validation.
  for (const ns of ['public', 'coop']) {
    for (const name of ['current_prices', 'products', 'stores']) await emit('delete from ' + ns + '.' + name + ';');
    for (const name of ['stores', 'products', 'current_prices']) {
      const fields = columns[name].join(',');
      await emit('insert into ' + ns + '.' + name + ' (' + fields + ') select ' + fields + ' from snapshot_' + ns + '_' + name + ';');
    }
  }
  await emit('delete from public.fuel_prices; insert into public.fuel_prices(fuel_type,price_sek) select fuel_type,price_sek from snapshot_public_fuel_prices;');
  for (const table of tables) await emit("do $$ begin if (select count(*) from " + table + ') <> ' + counts[table] + " then raise exception 'Row count mismatch: " + table + "'; end if; end $$;");
  await emit("do $$ begin if exists((select * from public.profiles except select * from snapshot_profile_before) union all (select * from snapshot_profile_before except select * from public.profiles)) then raise exception 'Profiles changed unexpectedly'; end if; end $$;");
  await emit('refresh materialized view public.mv_active_deals;');
  for (const table of tables) await emit('analyze ' + table + ';');
  await emit('drop schema catalog_snapshot_stage cascade;');
  await emit("select json_agg(t) from (" + sqlCounts(tables) + ') t;');
  out.end(buffer); await once(out, 'finish');
  const manifest = { sourceProject: 'qzpyabesygoljpohguxw', targetProject: ref, preparedAt: new Date().toISOString(), counts,
    sourceSha256: await hash(file('production-catalog.sql')), backupSha256: await hash(file('course-before.sql')), importSha256: await hash(file('staged-import.sql')) };
  writeFileSync(file('manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
}
async function apply() {
  const manifest = JSON.parse(readFileSync(file('manifest.json'), 'utf8'));
  if (manifest.completedAt) throw new Error('Snapshot already committed; a new import requires a new backup and manifest.');
  if (manifest.targetProject !== ref || await hash(file('staged-import.sql')) !== manifest.importSha256 ||
      await hash(file('course-before.sql')) !== manifest.backupSha256 ||
      await hash(file('production-catalog.sql')) !== manifest.sourceSha256) throw new Error('Validated import/backup checksum mismatch.');
  const env = targetEnvironment();
  const child = spawn('psql', ['-X', '--single-transaction', '-v', 'ON_ERROR_STOP=1', '--file', file('staged-import.sql')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = createWriteStream(file('import-' + Date.now() + '.log'), { flags: 'wx' });
  child.stdout.pipe(log, { end: false });
  let err = ''; child.stderr.on('data', c => { err += c; });
  const [code] = await once(child, 'close');
  const finished = once(log, 'finish'); log.end(); await finished;
  if (code !== 0) { writeFileSync(file('last-import-error.log'), err.replaceAll(env.PGPASSWORD, '[redacted]')); throw new Error('Import rolled back: ' + (err.split('\n').find(line => /ERROR:|PANIC:|FATAL:|connection.*lost/i.test(line)) || 'psql exited with code ' + code)); }
  manifest.completedAt = new Date().toISOString();
  writeFileSync(file('manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Committed course catalog snapshot. Counts: ' + JSON.stringify(manifest.counts));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === 'prepare') await prepare();
  else if (command === 'apply') await apply();
  else throw new Error('Usage: node ' + basename(process.argv[1]) + ' prepare|apply. Requires ignored output/catalog-copy dumps.');
}
