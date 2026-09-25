// Tải trang có cache (§2.2 "kho thô"): /srv/hs-raw/<domain>/<sha1>.html.
// Đọc kho trước, chỉ tải khi chưa có hoặc quá maxAgeDays. Giãn cách theo domain.
import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { RAW } from './paths.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const lastHit = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function cachePath(url) {
  const u = new URL(url);
  const h = createHash('sha1').update(url).digest('hex');
  return join(RAW, u.hostname, `${h}.html`);
}

/**
 * @returns {Promise<{html:string, fromCache:boolean, status:number}>}
 */
export async function fetchPage(url, { budget, maxAgeDays = 30, minGapMs = 1500, timeoutMs = 30000, cache = true } = {}) {
  const p = cachePath(url);
  if (cache && existsSync(p)) {
    const age = (Date.now() - statSync(p).mtimeMs) / 86400000;
    if (age <= maxAgeDays) return { html: readFileSync(p, 'utf8'), fromCache: true, status: 200 };
  }
  budget?.spend('fetch');
  const host = new URL(url).hostname;
  const wait = (lastHit.get(host) || 0) + minGapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'vi,en;q=0.8' }, redirect: 'follow', signal: ctl.signal });
    const html = await res.text();
    if (res.ok && cache) {
      mkdirSync(join(RAW, host), { recursive: true });
      writeFileSync(p, html);
    }
    return { html, fromCache: false, status: res.status };
  } finally {
    clearTimeout(t);
  }
}

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

/** HTML → văn bản thuần, giữ xuống dòng theo khối. */
export function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d|td)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|amp|quot|#39|lt|gt);/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
