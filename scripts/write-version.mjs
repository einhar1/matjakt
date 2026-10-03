import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const git = args => execFileSync('git', ['-c', 'safe.directory=' + process.cwd().replaceAll('\\','/'), ...args], {encoding:'utf8'}).trim();
let commit = process.env.GITHUB_SHA;
let dirty = false;
if (!commit) {
  try { commit = git(['rev-parse','HEAD']); dirty = !!git(['status','--porcelain']); }
  catch { commit = 'local'; dirty = true; }
}
writeFileSync('dist/version.json', JSON.stringify({commit,dirty}) + '\n');
