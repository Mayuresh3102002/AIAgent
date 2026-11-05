// Local preview of the static export. GitHub Pages serves these files in production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('out');
const prefix = process.env.NEXT_PUBLIC_BASE_PATH || '';
const port = Number(process.env.PORT || 3000);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.woff2':'font/woff2', '.woff':'font/woff', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8' };
await stat(resolve(root, 'index.html'));
createServer(async (req, res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (prefix && path === prefix) { res.writeHead(308, {Location: `${prefix}/`}); res.end(); return; }
    if (prefix && !path.startsWith(`${prefix}/`)) { res.writeHead(404); res.end('Not found'); return; }
    let file = resolve(root, '.' + path.slice(prefix.length));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const content = await readFile(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream'});
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Static preview listening on port ${port}, path ${prefix || '/'}`));
