export function deploymentEnvironment(env = process.env) {
  const names = [
    'GCP_PROJECT_ID',
    'RUN_SERVICE',
    'GCP_REGION',
    'IMAGE_REPOSITORY',
    'SUPABASE_PROJECT_REF',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  ];
  for (const name of names) {
    if (!env[name]) {
      throw new Error('Missing deployment configuration: ' + name);
    }
  }

  if (
    env.GCP_PROJECT_ID === 'matjakt-27b7f' ||
    env.SUPABASE_PROJECT_REF === 'qzpyabesygoljpohguxw'
  ) {
    throw new Error(
      'Refusing to deploy the application baseline to the existing Matjakt environment.',
    );
  }

  if (!/^[a-z]{20}$/.test(env.SUPABASE_PROJECT_REF)) {
    throw new Error('Invalid deployment Supabase ref.');
  }

  if (env.VITE_SUPABASE_URL !== 'https://' + env.SUPABASE_PROJECT_REF + '.supabase.co') {
    throw new Error(
      'Frontend and migration database must target the same deployment Supabase project.',
    );
  }

  if (env.RUN_SERVICE !== 'matjakt-course') {
    throw new Error('Unexpected deployment Cloud Run service.');
  }

  if (!/^[a-z]+-[a-z]+[0-9]$/.test(env.GCP_REGION)) {
    throw new Error('Invalid deployment region.');
  }

  const expectedRepository =
    env.GCP_REGION + '-docker.pkg.dev/' + env.GCP_PROJECT_ID + '/matjakt-course/frontend';

  if (env.IMAGE_REPOSITORY !== expectedRepository) {
    throw new Error('Image repository must belong to the isolated deployment project.');
  }

  return env;
}

export function deploymentDatabaseUrl(env = process.env) {
  const url = env.SUPABASE_DB_URL;

  if (!url) {
    throw new Error('Missing deployment database connection.');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid deployment database connection.');
  }

  if (
    parsed.protocol !== 'postgresql:' ||
    parsed.username !== 'postgres.' + env.SUPABASE_PROJECT_REF ||
    !/^[a-z0-9-]+[.]pooler[.]supabase[.]com$/.test(parsed.hostname) ||
    parsed.port !== '5432' ||
    parsed.searchParams.get('sslmode') !== 'require' ||
    !parsed.password
  ) {
    throw new Error(
      'Migration connection must target the deployment database via TLS session pooler.',
    );
  }

  return url;
}
