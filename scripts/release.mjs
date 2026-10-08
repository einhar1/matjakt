import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deploymentEnvironment } from './deployment-guard.mjs';
import { gcloud } from './gcloud.mjs';

function releaseFrontend(env, version) {
  const flags = [
    '--project=' + env.GCP_PROJECT_ID,
    '--billing-project=' + env.GCP_PROJECT_ID,
    '--region=' + env.GCP_REGION,
  ];

  const before = gcloud(['run', 'services', 'describe', env.RUN_SERVICE, ...flags]);

  const previousTraffic = (before.status?.traffic ?? [])
    .filter((t) => t.percent > 0)
    .map((t) => ({ revision: t.revisionName, percent: t.percent }));

  if (previousTraffic.some((t) => !t.revision || !/^[a-z0-9-]+$/.test(t.revision))) {
    throw new Error('Previous revision identity missing.');
  }
  // A unique immutable registry tag also permits retrying a release of one commit.
  const releaseId =
    version.commit.slice(0, 12) +
    '-' +
    (env.GITHUB_RUN_ID ?? 'local') +
    '-' +
    (env.GITHUB_RUN_ATTEMPT ?? '1');

  if (!/^[a-z0-9-]+$/.test(releaseId)) {
    throw new Error('Invalid release identifier.');
  }

  const image = env.IMAGE_REPOSITORY + ':' + releaseId;
  execFileSync(
    'docker',
    ['build', '--platform', 'linux/amd64', '-f', 'Dockerfile', '-t', image, '.'],
    { stdio: 'inherit' },
  );
  execFileSync('docker', ['push', image], { stdio: 'inherit' });

  const deployed = gcloud([
    'run',
    'deploy',
    env.RUN_SERVICE,
    '--image=' + image,
    '--no-traffic',
    '--tag=course-preview',
    '--revision-suffix=r-' + releaseId,
    ...flags,
  ]);

  const preview = deployed.status?.traffic?.find((t) => t.tag === 'course-preview');

  if (!preview?.url || !preview.revisionName) {
    throw new Error('Tagged preview revision missing.');
  }

  const liveUrl = deployed.status.url;

  mkdirSync('output/deployment', { recursive: true });

  const release = {
    commit: version.commit,
    image,
    revision: preview.revisionName,
    previewUrl: preview.url,
    liveUrl,
    previousTraffic,
    promoted: false,
  };
  const save = () =>
    writeFileSync('output/deployment/release.json', JSON.stringify(release, null, 2));

  save();

  function smoke(url) {
    execFileSync(
      process.execPath,
      [resolve('node_modules/@playwright/test/cli.js'), 'test', 'smoke.spec.ts'],
      {
        stdio: 'inherit',
        env: {
          ...env,
          PLAYWRIGHT_BASE_URL: url,
          SMOKE_SEARCH_TERM: env.SMOKE_SEARCH_TERM || 'mjölk',
        },
      },
    );
  }

  smoke(preview.url);

  gcloud([
    'run',
    'services',
    'update-traffic',
    env.RUN_SERVICE,
    '--to-revisions=' + preview.revisionName + '=100',
    ...flags,
  ]);
  release.promoted = true;

  save();

  smoke(liveUrl);
  release.liveSmokePassed = true;

  save();
  console.log('Verified release: ' + liveUrl);
}

// Keep CI verification separate from the explicitly requested manual entry point.
export function releaseEnvironment(env, version, { bootstrap = false } = {}) {
  deploymentEnvironment(env);

  if (bootstrap) {
    if (!/^[a-f0-9]{40}$/.test(version.commit)) {
      throw new Error('Build a deployment artifact with source metadata first.');
    }

    return {
      ...env,
      GITHUB_SHA: version.commit,
      GITHUB_RUN_ID: 'bootstrap-' + Date.now(),
    };
  }

  if (env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME !== 'push') {
    throw new Error('Deployment is restricted to a verified main push.');
  }

  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || version.commit !== env.GITHUB_SHA) {
    throw new Error('Artifact is not the verified merge commit.');
  }

  return env;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);

  if (args.length > 1 || (args.length === 1 && args[0] !== '--bootstrap')) {
    throw new Error('Usage: node scripts/release.mjs [--bootstrap]');
  }

  const bootstrap = args[0] === '--bootstrap';
  const version = JSON.parse(readFileSync('dist/version.json', 'utf8'));
  const env = releaseEnvironment(process.env, version, { bootstrap });

  if (bootstrap) {
    console.log('Manual bootstrap; this is not evidence of a GitHub Actions release.');
  }

  releaseFrontend(env, version);
}
