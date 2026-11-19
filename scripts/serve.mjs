import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep) || pathname.split('/').some(part => part.startsWith('.'))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'text/plain'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}`));
