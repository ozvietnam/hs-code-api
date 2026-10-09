#!/usr/bin/env node
// server.js — chạy hs-code-api như một tiến trình Node thường (Coolify / Docker / máy nhà),
// (server riêng của Oz; không còn chạy serverless). Không phụ thuộc thư viện ngoài.
//
// Đọc cấu hình định tuyến từ routes.json:
//   - rewrites  : /api/precedents → /api/dataset?resource=precedents, /admin → /admin/index.html…
//   - headers   : Content-Type/Cache-Control/CORS cho /llms.txt, /openapi.json…
//   - public/   : file tĩnh
//   - api/<ten>.js : handler kiểu serverless (req.query, req.body, res.status().json())
// Ghi dữ liệu (feedback, audit, snapshot biểu thuế) đi qua lib/data-paths.js → đặt
// HS_DATA_DIR trỏ vào ổ lưu bền (volume) để không mất khi triển khai lại.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const API_DIR = path.join(ROOT, 'api');
const MAX_BODY = 10 * 1024 * 1024;
const TIMEOUT_MS = Number(process.env.HS_REQUEST_TIMEOUT_MS) || 300000; // = maxDuration cũ

const routeConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'routes.json'), 'utf8'));

function compileSource(source) {
  const keys = [];
  const pattern = source
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z0-9_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
  return { re: new RegExp(`^${pattern}/?$`), keys };
}

const REWRITES = (routeConfig.rewrites || []).map((r) => ({ ...compileSource(r.source), destination: r.destination }));
const HEADERS = (routeConfig.headers || []).map((h) => ({ ...compileSource(h.source), headers: h.headers || [] }));

/** Áp rewrite đầu tiên khớp. Trả URL mới (giữ query gốc nếu đích chưa có) hoặc null. */
function applyRewrite(url) {
  for (const r of REWRITES) {
    const m = url.pathname.match(r.re);
    if (!m) continue;
    let dest = r.destination;
    r.keys.forEach((k, i) => { dest = dest.split(`:${k}`).join(encodeURIComponent(decodeURIComponent(m[i + 1]))); });
    const next = new URL(dest, 'http://local');
    for (const [k, v] of url.searchParams) if (!next.searchParams.has(k)) next.searchParams.set(k, v);
    return next;
  }
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf',
};

function withHelpers(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    const body = Buffer.from(JSON.stringify(obj), 'utf8');
    if (!res.headersSent) {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Length', body.length);
    }
    res.end(body);
    return res;
  };
  res.send = (x) => {
    if (x && typeof x === 'object' && !Buffer.isBuffer(x)) return res.json(x);
    res.end(x == null ? '' : x);
    return res;
  };
  res.redirect = (a, b) => {
    const [code, loc] = typeof a === 'number' ? [a, b] : [307, a];
    res.statusCode = code;
    res.setHeader('Location', loc);
    res.end();
    return res;
  };
  return res;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      const ct = String(req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        try { return resolve(JSON.parse(raw)); } catch { return resolve(raw); } // handler tự báo "Invalid JSON"
      }
      if (ct.includes('application/x-www-form-urlencoded')) return resolve(Object.fromEntries(new URLSearchParams(raw)));
      return resolve(raw);
    });
    req.on('error', reject);
  });
}

const handlerCache = new Map();
function loadHandler(name) {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) return null;
  if (handlerCache.has(name)) return handlerCache.get(name);
  const file = path.join(API_DIR, `${name}.js`);
  const mod = fs.existsSync(file) ? require(file) : null;
  const fn = typeof mod === 'function' ? mod : (mod && typeof mod.default === 'function' ? mod.default : null);
  handlerCache.set(name, fn);
  return fn;
}

function applyStaticHeaders(res, pathname) {
  for (const h of HEADERS) if (h.re.test(pathname)) for (const { key, value } of h.headers) res.setHeader(key, value);
}

function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return false; }
  let file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return false; // chặn ../
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  applyStaticHeaders(res, pathname);
  if (req.method === 'HEAD') { res.end(); return true; }
  fs.createReadStream(file).pipe(res);
  return true;
}

async function handle(req, res) {
  withHelpers(res);
  let url = new URL(req.url, 'http://local');
  const rewritten = applyRewrite(url);
  if (rewritten) url = rewritten;

  const api = url.pathname.match(/^\/api\/([A-Za-z0-9_-]+)\/?$/);
  if (api) {
    const handler = loadHandler(api[1]);
    if (!handler) return res.status(404).json({ error: 'Not found', path: url.pathname });
    req.query = Object.fromEntries(url.searchParams.entries());
    try {
      req.body = await readBody(req);
    } catch (e) {
      return res.status(e.status || 400).json({ error: e.message });
    }
    return handler(req, res);
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(req, res, url.pathname)) return undefined;
  return res.status(404).json({ error: 'Not found', path: url.pathname });
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    const t0 = Date.now();
    if (process.env.HS_ACCESS_LOG !== '0') {
      res.on('finish', () => console.log(`${new Date().toISOString()} ${req.method} ${req.url.slice(0, 160)} ${res.statusCode} ${Date.now() - t0}ms`));
    }
    res.setTimeout(TIMEOUT_MS, () => {
      if (!res.headersSent) withHelpers(res).status(504).json({ error: 'Request timeout' });
      else res.destroy();
    });
    try {
      await handle(req, res);
    } catch (e) {
      console.error(new Date().toISOString(), 'handler error', req.method, req.url, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
      if (!res.headersSent) withHelpers(res).status(500).json({ error: 'Internal server error' });
      else res.end();
    }
  });
  server.requestTimeout = TIMEOUT_MS + 5000;
  server.headersTimeout = 65000;
  server.keepAliveTimeout = 61000;
  return server;
}

module.exports = { createServer, applyRewrite };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const server = createServer();
  server.listen(port, host, () => {
    console.log(`hs-code-api listening on http://${host}:${port} (data write dir: ${process.env.HS_DATA_DIR || 'data/'})`);
  });
  const stop = (sig) => {
    console.log(`${sig} — dừng nhận request mới`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10000).unref();
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}
