import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deploymentEnvironment, deploymentDatabaseUrl } from './deployment-guard.mjs';

function supabase(args) {
  try {
    return execFileSync(
      process.execPath,
      [resolve('node_modules/supabase/dist/supabase.js'), ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
    );
  } catch (error) {
    // Child-process errors may include connection arguments and credentials.
    // eslint-disable-next-line preserve-caught-error -- Omit potentially secret-bearing error details.
    throw new Error(
      'Supabase CLI failed (exit ' + (error.status ?? 'unknown') + '). See stderr above.',
    );
  }
}

function writeLocalEnvironment() {
  const status = JSON.parse(supabase(['status', '-o', 'json']));
  const url = status.API_URL;
  const key = status.PUBLISHABLE_KEY || status.ANON_KEY;

  if (!url || !key) {
    throw new Error('Local Supabase API URL/key missing.');
  }

  writeFileSync(
    '.env.local',
    'VITE_SUPABASE_URL=' + url + '\n' + 'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=' + key + '\n',
  );
  console.log('Wrote .env.local with local browser credentials only.');
}

const command = process.argv[2];

switch (command) {
  case 'start':
    // Capture start/status output: it includes local administrative credentials.
    supabase([
      'start',
      '-x',
      'studio,postgres-meta,realtime,storage-api,imgproxy,inbucket,edge-runtime,logflare,vector',
    ]);
    writeLocalEnvironment();
    console.log('Local Matjakt database is ready.');
    break;

  case 'env':
    writeLocalEnvironment();
    break;

  case 'migrate': {
    const env = deploymentEnvironment();
    const url = deploymentDatabaseUrl(env);

    console.log(supabase(['db', 'push', '--db-url', url, '--yes']));
    break;
  }

  default:
    throw new Error('Usage: node scripts/database.mjs start|env|migrate');
}
