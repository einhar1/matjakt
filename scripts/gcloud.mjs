import { execFileSync } from 'node:child_process';

export function gcloud(args) {
  // On Windows gcloud is a cmd shim. Arguments are generated from validated
  // deployment identifiers; never pass secrets or arbitrary user strings here.
  for (const arg of args) {
    if (!/^[a-zA-Z0-9_./:@=,%+-]+$/.test(arg)) {
      throw new Error('Unsafe gcloud argument.');
    }
  }

  const output = execFileSync(
    process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud',
    [...args, '--quiet', '--format=json'],
    { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'] },
  );

  return JSON.parse(output);
}
