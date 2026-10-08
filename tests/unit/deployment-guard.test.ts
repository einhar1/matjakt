import { expect, it } from 'vitest';
import { deploymentEnvironment, deploymentDatabaseUrl } from '../../scripts/deployment-guard.mjs';
const env = {
  GCP_PROJECT_ID: 'deployment-test', RUN_SERVICE: 'matjakt-course', GCP_REGION: 'europe-north1',
  IMAGE_REPOSITORY: 'europe-north1-docker.pkg.dev/deployment-test/matjakt-course/frontend',
  SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
  VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'publishable',
};
it('rejects current hosting and database and mismatched API targets', () => {
  expect(() => deploymentEnvironment({ ...env, GCP_PROJECT_ID: 'matjakt-27b7f' })).toThrow('existing');
  expect(() => deploymentEnvironment({ ...env, SUPABASE_PROJECT_REF: 'qzpyabesygoljpohguxw' })).toThrow('existing');
  expect(() => deploymentEnvironment({ ...env, VITE_SUPABASE_URL: 'https://wrong.supabase.co' })).toThrow('same');
  expect(deploymentEnvironment(env)).toEqual(env);
});

it('binds the migration connection to the deployment ref and TLS session pooler', () => {
  const db = 'postgresql://postgres.abcdefghijklmnopqrst:fixture@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?sslmode=require';
  expect(deploymentDatabaseUrl({...env, SUPABASE_DB_URL: db})).toBe(db);
  expect(() => deploymentDatabaseUrl({...env, SUPABASE_DB_URL: db.replace('abcdefghijklmnopqrst', 'qzpyabesygoljpohguxw')})).toThrow('deployment');
  expect(() => deploymentDatabaseUrl({...env, SUPABASE_DB_URL: db.replace('sslmode=require', 'sslmode=disable')})).toThrow('TLS');
  expect(() => deploymentDatabaseUrl({...env, SUPABASE_DB_URL: db.replace('pooler.supabase.com', 'example.com')})).toThrow('deployment');
});
