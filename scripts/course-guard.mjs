export function courseEnvironment(env = process.env) {
  const names = ['COURSE_GCP_PROJECT_ID', 'COURSE_RUN_SERVICE', 'COURSE_GCP_REGION', 'COURSE_IMAGE_REPOSITORY', 'COURSE_SUPABASE_PROJECT_REF', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY'];
  for (const name of names) if (!env[name]) throw new Error('Missing course configuration: ' + name);
  if (env.COURSE_GCP_PROJECT_ID === 'matjakt-27b7f' || env.COURSE_SUPABASE_PROJECT_REF === 'qzpyabesygoljpohguxw') {
    throw new Error('Refusing to deploy the course baseline to the existing Matjakt environment.');
  }
  if (!/^[a-z]{20}$/.test(env.COURSE_SUPABASE_PROJECT_REF)) throw new Error('Invalid course Supabase ref.');
  if (env.VITE_SUPABASE_URL !== 'https://' + env.COURSE_SUPABASE_PROJECT_REF + '.supabase.co') {
    throw new Error('Frontend and migration database must target the same course Supabase project.');
  }
  if (env.COURSE_RUN_SERVICE !== 'matjakt-course') throw new Error('Unexpected course Cloud Run service.');
  if (!/^[a-z]+-[a-z]+[0-9]$/.test(env.COURSE_GCP_REGION)) throw new Error('Invalid course region.');
  const expectedRepository = env.COURSE_GCP_REGION + '-docker.pkg.dev/' + env.COURSE_GCP_PROJECT_ID + '/matjakt-course/frontend';
  if (env.COURSE_IMAGE_REPOSITORY !== expectedRepository) throw new Error('Image repository must belong to the isolated course project.');
  return env;
}

export function courseDatabaseUrl(env = process.env) {
  const url = env.COURSE_SUPABASE_DB_URL;
  if (!url) throw new Error('Missing course database connection.');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Invalid course database connection.'); }
  if (parsed.protocol !== 'postgresql:' || parsed.username !== 'postgres.' + env.COURSE_SUPABASE_PROJECT_REF ||
      !/^[a-z0-9-]+[.]pooler[.]supabase[.]com$/.test(parsed.hostname) ||
      parsed.port !== '5432' || parsed.searchParams.get('sslmode') !== 'require' || !parsed.password) {
    throw new Error('Migration connection must target the course database via TLS session pooler.');
  }
  return url;
}
