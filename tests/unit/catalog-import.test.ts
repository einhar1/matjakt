import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { test, expect } from 'vitest';
import { copyLines } from '../../scripts/import-catalog.mjs';

test('COPY rows preserve Unicode line separators and multibyte text across stream chunks', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'matjakt-copy-'));
  const root = resolve(tmpdir()) + sep;
  if (!resolve(dir).startsWith(root)) throw new Error('Unexpected temporary test path');
  try {
    const file = join(dir, 'snapshot.sql');
    const row = 'å'.repeat(40000) + '\tbeskrivning\u2028fortsättning\u2029slut';
    writeFileSync(file, 'COPY products FROM stdin;\r\n' + row + '\n\\.\nlast');
    const lines = [];
    for await (const line of copyLines(file)) lines.push(line);
    expect(lines).toEqual(['COPY products FROM stdin;', row, '\\.', 'last']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
