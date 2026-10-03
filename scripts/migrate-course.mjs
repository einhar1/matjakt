import { courseEnvironment, courseDatabaseUrl } from './course-guard.mjs';
import { supabase } from './supabase-cli.mjs';
const env = courseEnvironment();
const url = courseDatabaseUrl(env);
console.log(supabase(['db', 'push', '--db-url', url, '--yes']));
