import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Script } from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const publicDir = resolve(root, 'public');
const output = resolve(root, 'dist');
for (const path of await readdir(publicDir, { recursive: true })) {
  if (path.endsWith('.html')) {
    const html = await readFile(resolve(publicDir, path), 'utf8');
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate HTML ids: ${path}`);
    for (const match of html.matchAll(/\bhref="#([^"]+)"/g)) {
      if (!ids.includes(match[1])) throw new Error(`Missing anchor in ${path}: ${match[1]}`);
    }
    for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) {
      const asset = resolve(publicDir, match[1].slice(1));
      if ((await stat(asset)).isDirectory()) await stat(resolve(asset, 'index.html'));
    }
  }
  if (path.endsWith('.js')) {
    new Script(await readFile(resolve(publicDir, path), 'utf8'), { filename: path });
  }
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(publicDir, output, { recursive: true });
console.log('Build complete: dist/ — HTML anchors, local assets, and JavaScript syntax verified.');
