import { gcloud } from './gcloud.mjs';

const project = process.env.GCP_PROJECT_ID;
const service = process.env.RUN_SERVICE;
const region = process.env.GCP_REGION;
const revision = process.env.ROLLBACK_REVISION;
if (!project || project === 'matjakt-27b7f' || service !== 'matjakt-course' || !region) {
  throw new Error('Specify the isolated deployment project, region and service.');
}
if (!revision?.startsWith(service + '-') || !/^[a-z0-9-]+$/.test(revision)) {
  throw new Error('Choose a previous revision from release.json.');
}
gcloud([
  'run',
  'services',
  'update-traffic',
  service,
  '--to-revisions=' + revision + '=100',
  '--project=' + project,
  '--billing-project=' + project,
  '--region=' + region,
]);
console.log('Frontend traffic restored. Run the hosted smoke test against the restored commit.');
