import { expect, it } from 'vitest';
import { releaseEnvironment } from '../../scripts/release.mjs';

const commit = 'a'.repeat(40);
const env = {
  GCP_PROJECT_ID: 'deployment-test',
  RUN_SERVICE: 'matjakt-course',
  GCP_REGION: 'europe-north1',
  IMAGE_REPOSITORY: 'europe-north1-docker.pkg.dev/deployment-test/matjakt-course/frontend',
  SUPABASE_PROJECT_REF: 'abcdefghijklmnopqrst',
  VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'publishable',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: commit,
};

it('allows the verified main-push artifact', () => {
  expect(releaseEnvironment(env, { commit })).toBe(env);
});

it.each([
  { GITHUB_REF: 'refs/heads/feature' },
  { GITHUB_EVENT_NAME: 'pull_request' },
  { GITHUB_REF: undefined, GITHUB_EVENT_NAME: undefined },
])('rejects a non-release context without falling back to bootstrap: %j', (context) => {
  expect(() => releaseEnvironment({ ...env, ...context }, { commit })).toThrow('main push');
});

it('rejects an artifact built from another commit', () => {
  expect(() => releaseEnvironment(env, { commit: 'b'.repeat(40) })).toThrow(
    'verified merge commit',
  );
});

it('rejects missing commit metadata', () => {
  expect(() => releaseEnvironment({ ...env, GITHUB_SHA: undefined }, { commit })).toThrow(
    'verified merge commit',
  );
});

it('permits an explicit manual bootstrap and leaves the caller environment intact', () => {
  const manual = {
    ...env,
    GITHUB_REF: undefined,
    GITHUB_EVENT_NAME: undefined,
    GITHUB_SHA: undefined,
  };
  const result = releaseEnvironment(manual, { commit }, { bootstrap: true });

  expect(result.GITHUB_SHA).toBe(commit);
  expect(result.GITHUB_RUN_ID).toMatch(/^bootstrap-\d+$/);
  expect(manual.GITHUB_SHA).toBeUndefined();
});

it('requires a real source commit even for manual bootstrap', () => {
  expect(() => releaseEnvironment(env, { commit: 'local' }, { bootstrap: true })).toThrow(
    'source metadata',
  );
});
