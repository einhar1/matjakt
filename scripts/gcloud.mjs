import { execFileSync } from 'node:child_process';
export function gcloud(args, { json = true } = {}) {
  // On Windows gcloud is a cmd shim. Arguments are generated from validated
  // course identifiers; never pass secrets or arbitrary user strings here.
  for (const arg of args) if (!/^[a-zA-Z0-9_./:@=,%+-]+$/.test(arg)) throw new Error('Unsafe gcloud argument.');
  const output = execFileSync(process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud',
    [...args, '--quiet', ...(json ? ['--format=json'] : [])],
    { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'] });
  return json ? JSON.parse(output) : output;
}
