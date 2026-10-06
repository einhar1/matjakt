import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
export function supabase(args) {
  try {
    return execFileSync(process.execPath, [resolve('node_modules/supabase/dist/supabase.js'), ...args], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch (error) {
    // Child-process error objects include stdout/arguments, potentially credentials.
    // eslint-disable-next-line preserve-caught-error -- Deliberately omit the original error to avoid exposing credentials.
    throw new Error('Supabase CLI failed (exit ' + (error.status ?? 'unknown') + '). See stderr above.');
  }
}
