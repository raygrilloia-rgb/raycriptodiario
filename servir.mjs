// Servidor local para revisar la web antes de publicarla: node servir.mjs  →  http://localhost:8080/raycriptodiario/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'docs');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const PREFIJO = '/raycriptodiario';

http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split('?')[0]);
  if (ruta.startsWith(PREFIJO)) ruta = ruta.slice(PREFIJO.length) || '/';
  let f = path.join(DOCS, ruta);
  if (!f.startsWith(DOCS)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, { 'Content-Type': TIPOS['.html'] }); return res.end(fs.readFileSync(path.join(DOCS, '404.html'))); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(8080, () => console.log('http://localhost:8080/raycriptodiario/'));
