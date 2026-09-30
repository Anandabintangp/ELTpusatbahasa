import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Script } from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const publicDir = resolve(root, 'public');
const output = resolve(root, 'dist');
const html = await readFile(resolve(publicDir, 'index.html'), 'utf8');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML ids');
for (const match of html.matchAll(/\bhref="#([^"]+)"/g)) {
  if (!ids.includes(match[1])) throw new Error(`Missing anchor: ${match[1]}`);
}
for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
  await stat(resolve(publicDir, match[1].slice(1)));
}
new Script(await readFile(resolve(publicDir, 'app.js'), 'utf8'), { filename: 'app.js' });
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(publicDir, output, { recursive: true });
console.log('Build complete: dist/ — HTML anchors, local assets, and JavaScript syntax verified.');
