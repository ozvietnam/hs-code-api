#!/usr/bin/env node
/**
 * Tiện ích chung cho đợt cào SHTT (docs/giao-viec/shtt-cao-dem.md).
 *  - polite: fetch có User-Agent + delay ≥ 500 ms / lệnh / tiến trình (luật 1).
 *  - writeRaw + ghi raw-index.json: mỗi raw response có sha256 (luật 3).
 *  - appendRecord: ghi JSONL theo schema đơn đặt hàng.
 *  - writeReport + writeRawIndex: ghi data/shtt/bao-cao.json + raw-index.json.
 *
 * KHÔNG sửa từ script cào; script cào chỉ import.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpsReq } from 'node:https';
import { request as httpReq } from 'node:http';

export const UA = 'hs-code-api/shtt (ozvietnam, ceo@ozfreight.vn)';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DIR_SHTT = join(ROOT, 'data', 'shtt');
export const DIR_RAW = join(ROOT, 'data', '_src', 'shtt', 'raw');

// Một số host (vd wipopublish.ipvietnam.gov.vn) có cert chuỗi dài khiến Node 22 fetch
// với CA mặc định fail. CHỈ áp dụng "lax TLS" cho host đã liệt kê (không tắt global).
const LAX_HOSTS = new Set(['wipopublish.ipvietnam.gov.vn', 'www.ipvietnam.gov.vn']);

// Hàng đợi "lịch sự": đảm bảo ≥ POLITE_MS giữa 2 lần gọi trong cùng process.
const POLITE_MS = 600;
let _lastFetchAt = 0;
async function _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function _pickReq(u) { return u.protocol === 'https:' ? httpsReq : httpReq; }

/**
 * Fetch có User-Agent + delay lịch sự + TLS tuỳ host (Node 22 global fetch không
 * hỗ trợ tuỳ biến TLS theo host, nên dùng node:https cho HTTPS).
 * Trả { ok, status, body, bytes, contentType, err? }.
 */
export async function politeFetch(url, opts = {}) {
  const u = new URL(url);
  const now = Date.now();
  if (_lastFetchAt && now - _lastFetchAt < POLITE_MS) await _sleep(POLITE_MS - (now - _lastFetchAt));
  const headers = { 'User-Agent': UA, Accept: 'application/json,text/html;q=0.9,*/*;q=0.5', ...(opts.headers || {}) };
  const method = (opts.method || 'GET').toUpperCase();
  const reqOpts = {
    method,
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search,
    headers,
    ...(u.protocol === 'https:' ? { rejectUnauthorized: !LAX_HOSTS.has(u.hostname) } : {}),
  };
  const reqFn = _pickReq(u);
  const out = await new Promise((resolve) => {
    const timer = setTimeout(() => { try { req.destroy(new Error('timeout')); } catch {} }, opts.timeoutMs || 25000);
    const req = reqFn(reqOpts, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        clearTimeout(timer);
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, statusText: res.statusMessage, body: buf, bytes: Buffer.byteLength(buf, 'utf8'), contentType: res.headers['content-type'] || '' });
      });
    });
    req.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, status: 0, body: '', bytes: 0, err: e }); });
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    req.end();
  });
  _lastFetchAt = Date.now();
  return out;
}

/** Ghi 1 bản thô + thêm vào raw-index.json. Trả { sha256, layLuc, bytes, file, url }. */
export function writeRaw(maNguon, url, body, layLuc = new Date()) {
  const d = join(DIR_RAW, maNguon);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  const ext = typeof body === 'string' ? (/^\s*[<{]/.test(body) ? 'html' : 'txt') : 'bin';
  const sha256 = createHash('sha256').update(typeof body === 'string' ? body : Buffer.from(body)).digest('hex');
  const file = join(d, `${sha256}.${ext}`);
  if (!existsSync(file)) {
    if (typeof body === 'string') writeFileSync(file, body);
    else writeFileSync(file, Buffer.from(body));
  }
  const layLucIso = (layLuc instanceof Date ? layLuc : new Date(layLuc)).toISOString();
  appendRawIndex({ sha256, url, layLuc: layLucIso, bytes: Buffer.byteLength(typeof body === 'string' ? body : Buffer.from(body)) });
  return { sha256, url, layLuc: layLucIso, bytes: Buffer.byteLength(typeof body === 'string' ? body : Buffer.from(body)), file };
}

function _loadRawIndex() {
  const p = join(DIR_SHTT, 'raw-index.json');
  if (!existsSync(p)) return { tho: [] };
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return { tho: [] }; }
}

function appendRawIndex(entry) {
  const idx = _loadRawIndex();
  if (!idx.tho.some((r) => r.sha256 === entry.sha256)) {
    idx.tho.push(entry);
    writeFileSync(join(DIR_SHTT, 'raw-index.json'), JSON.stringify(idx));
  }
}

export function loadRawIndex() { return _loadRawIndex(); }

/** Append 1 bản ghi JSONL vào data/shtt/<tep>.jsonl. Tự tạo file nếu chưa có. */
export function appendRecord(tep, rec) {
  const p = join(DIR_SHTT, tep);
  appendFileSync(p, JSON.stringify(rec) + '\n');
}

/** Đọc toàn bộ JSONL thành mảng. Bỏ qua dòng lỗi (ghi vào console). */
export function readJsonl(tep) {
  const p = join(DIR_SHTT, tep);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => {
    try { return JSON.parse(l); } catch (e) { return { __loi: e.message }; }
  });
}

export function writeReport(bc) {
  writeFileSync(join(DIR_SHTT, 'bao-cao.json'), JSON.stringify(bc, null, 1) + '\n');
}

/** Sleep đơn giản cho vòng lặp ngoài politeFetch. */
export function sleep(ms) { return _sleep(ms); }

/** Tên file JSONL cho từng nguồn (khớp NGUON trong kiem.mjs). */
export const TEP = {
  'vn-tchq-giam-sat': 'vn-tchq-giam-sat.jsonl',
  'cn-gacc-beian': 'cn-gacc-beian.jsonl',
  'vn-ipvietnam-dang-ky': 'vn-ipvietnam-dang-ky.jsonl',
  'tmview-cn-vn': 'tmview-cn-vn.jsonl',
  'cn-cnipa-dang-ky': 'cn-cnipa-dang-ky.jsonl',
  'khong-tim-thay': 'khong-tim-thay.jsonl',
};

/** In ra dòng log tiến độ ngắn (cho chạy đêm, không spam). */
export function log(...args) { console.log(new Date().toISOString().slice(11, 19), ...args); }

/** Lấy tên OS + network đơn giản để ghi bao-cao.may. */
export async function mayMach() {
  const os = process.platform === 'darwin' ? `macOS darwin/${process.arch}` : `${process.platform}/${process.arch}`;
  // tránh IP; chỉ ghi "reachable" / "blocked" qua thăm dò đơn giản
  let net = 'unknown';
  try {
    const r = await politeFetch('https://www.tmdn.org/tmview/', { method: 'HEAD', timeoutMs: 8000 }).catch(() => null);
    net = r && r.ok ? 'tmdn-reachable' : 'tmdn-blocked';
  } catch { net = 'probe-error'; }
  return `macOS dev-zcode (${os}); tmdn=${net}`;
}