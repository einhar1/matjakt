import { supabase } from './supabase-cli.mjs';
// start/status stdout contains local administrative credentials; never log it.
supabase(['start', '-x', 'studio,postgres-meta,realtime,storage-api,imgproxy,inbucket,edge-runtime,logflare,vector']);
console.log('Local matjakt-course stack is ready. Run npm run env:local.');
