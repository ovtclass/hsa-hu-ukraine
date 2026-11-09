import http from 'node:http';
import { readFile } from 'node:fs/promises';
const portIndex = process.argv.indexOf('--port');
const port = Number(process.env.PORT || (portIndex >= 0 ? process.argv[portIndex + 1] : 4173));
const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', png: 'image/png', jpg: 'image/jpeg' };
http.createServer(async (req, res) => {
 try {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/apply') {
   res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
   res.end(JSON.stringify({ error: 'Az e-mail-küldés teszteléséhez használd a Netlify Dev szervert.' }));
   return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!/^(?:[\w-]+\.(?:html|css|js)|assets\/[\w.-]+\.(?:jpg|png))$/.test(file)) { res.writeHead(404); res.end(); return; }
  const data = await readFile(new URL(`../dist/${file}`, import.meta.url));
  res.writeHead(200, { 'Content-Type': types[file.split('.').pop()], 'X-Content-Type-Options': 'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : data);
 } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://localhost:${port}`));
