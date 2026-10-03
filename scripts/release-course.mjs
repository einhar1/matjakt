import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { gcloud } from './gcloud.mjs';

export function releaseCourse(env) {
const version = JSON.parse(readFileSync('dist/version.json', 'utf8'));
const flags = ['--project=' + env.COURSE_GCP_PROJECT_ID, '--billing-project=' + env.COURSE_GCP_PROJECT_ID, '--region=' + env.COURSE_GCP_REGION];
const before = gcloud(['run', 'services', 'describe', env.COURSE_RUN_SERVICE, ...flags]);
const previousTraffic = (before.status?.traffic ?? []).filter(t => t.percent > 0).map(t => ({ revision: t.revisionName, percent: t.percent }));
if (previousTraffic.some(t => !t.revision || !/^[a-z0-9-]+$/.test(t.revision))) throw new Error('Previous revision identity missing.');
// A unique immutable registry tag also permits retrying a release of one commit.
const releaseId = version.commit.slice(0, 12) + '-' + (env.GITHUB_RUN_ID ?? 'local') + '-' + (env.GITHUB_RUN_ATTEMPT ?? '1');
if (!/^[a-z0-9-]+$/.test(releaseId)) throw new Error('Invalid release identifier.');
const image = env.COURSE_IMAGE_REPOSITORY + ':' + releaseId;
execFileSync('docker', ['build', '--platform', 'linux/amd64', '-f', 'Dockerfile.course', '-t', image, '.'], { stdio: 'inherit' });
execFileSync('docker', ['push', image], { stdio: 'inherit' });
const deployed = gcloud(['run', 'deploy', env.COURSE_RUN_SERVICE, '--image=' + image, '--no-traffic', '--tag=course-preview', '--revision-suffix=r-' + releaseId, ...flags]);
const preview = deployed.status?.traffic?.find(t => t.tag === 'course-preview');
if (!preview?.url || !preview.revisionName) throw new Error('Tagged preview revision missing.');
const liveUrl = deployed.status.url;
mkdirSync('output/deployment', { recursive: true });
const release = { commit: version.commit, image, revision: preview.revisionName, previewUrl: preview.url, liveUrl, previousTraffic, promoted: false };
const save = () => writeFileSync('output/deployment/release.json', JSON.stringify(release, null, 2));
save();
function smoke(url) {
  execFileSync(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', 'smoke.spec.ts'], {
    stdio: 'inherit', env: { ...env, PLAYWRIGHT_BASE_URL: url },
  });
}
smoke(preview.url);
gcloud(['run', 'services', 'update-traffic', env.COURSE_RUN_SERVICE, '--to-revisions=' + preview.revisionName + '=100', ...flags]);
release.promoted = true;
save();
smoke(liveUrl);
release.liveSmokePassed = true;
save();
console.log('Verified course release: ' + liveUrl);

}
