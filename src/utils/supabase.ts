import { createClient } from '@supabase/supabase-js';
import { validateSupabaseEnvironment } from './environment';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const browserEnv = validateSupabaseEnvironment(supabaseUrl, supabaseKey);
export const supabase = createClient(browserEnv.url, browserEnv.key);
export const coopSupabase= createClient(browserEnv.url, browserEnv.key, {
    db: {
        schema: 'coop',
    }
})