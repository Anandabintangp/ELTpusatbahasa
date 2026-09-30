import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..', process.argv[2] || 'public');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
http.createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + path);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end('Forbidden'); return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(content);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => console.log('ELT backup preview: http://localhost:' + (process.env.PORT || 3000)));
