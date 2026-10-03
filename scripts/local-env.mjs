import { writeFileSync } from 'node:fs';
import { supabase } from './supabase-cli.mjs';
const status = JSON.parse(supabase(['status', '-o', 'json']));
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
if (!url || !key) throw new Error('Local Supabase API URL/key missing.');
writeFileSync('.env.local', 'VITE_SUPABASE_URL=' + url + '\nVITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=' + key + '\n');
console.log('Wrote .env.local with local browser credentials only.');
