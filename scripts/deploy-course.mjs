import { readFileSync } from 'node:fs';
import { courseEnvironment } from './course-guard.mjs';
import { releaseCourse } from './release-course.mjs';
const env = courseEnvironment();
if (env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME !== 'push') throw new Error('Course deployment is restricted to a verified main push.');
const version = JSON.parse(readFileSync('dist/version.json', 'utf8'));
if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') || version.commit !== env.GITHUB_SHA) throw new Error('Artifact is not the verified merge commit.');
releaseCourse(env);
