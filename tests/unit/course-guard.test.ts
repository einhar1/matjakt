import { expect, it } from 'vitest';
import { courseEnvironment, courseDatabaseUrl } from '../../scripts/course-guard.mjs';
const env = {
  COURSE_GCP_PROJECT_ID: 'course-test', COURSE_RUN_SERVICE: 'matjakt-course', COURSE_GCP_REGION: 'europe-north1',
  COURSE_IMAGE_REPOSITORY: 'europe-north1-docker.pkg.dev/course-test/matjakt-course/frontend',
  COURSE_SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
  VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'publishable',
};
it('rejects current hosting and database and mismatched API targets', () => {
  expect(() => courseEnvironment({ ...env, COURSE_GCP_PROJECT_ID: 'matjakt-27b7f' })).toThrow('existing');
  expect(() => courseEnvironment({ ...env, COURSE_SUPABASE_PROJECT_REF: 'qzpyabesygoljpohguxw' })).toThrow('existing');
  expect(() => courseEnvironment({ ...env, VITE_SUPABASE_URL: 'https://wrong.supabase.co' })).toThrow('same');
  expect(courseEnvironment(env)).toEqual(env);
});

it('binds the migration connection to the course ref and TLS session pooler', () => {
  const db = 'postgresql://postgres.abcdefghijklmnopqrst:fixture@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?sslmode=require';
  expect(courseDatabaseUrl({...env, COURSE_SUPABASE_DB_URL: db})).toBe(db);
  expect(() => courseDatabaseUrl({...env, COURSE_SUPABASE_DB_URL: db.replace('abcdefghijklmnopqrst', 'qzpyabesygoljpohguxw')})).toThrow('course');
  expect(() => courseDatabaseUrl({...env, COURSE_SUPABASE_DB_URL: db.replace('sslmode=require', 'sslmode=disable')})).toThrow('TLS');
  expect(() => courseDatabaseUrl({...env, COURSE_SUPABASE_DB_URL: db.replace('pooler.supabase.com', 'example.com')})).toThrow('course');
});
