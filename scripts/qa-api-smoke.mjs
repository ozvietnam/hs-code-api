#!/usr/bin/env node
/**
 * API QA smoke test - Hermes
 * Chạy: node scripts/qa-api-smoke.mjs [baseUrl]
 * Mặc định: https://hs-kb.uythacnhapkhau.com
 *
 * Trả về exit 0 nếu pass hết, 1 nếu fail.
 * Output JSON cho CI.
 */
import process from 'node:process';

const BASE = process.argv[2] || 'https://hs-kb.uythacnhapkhau.com';
const TIMEOUT = 60_000; // LLM bound, cần ≥60s

const tests = [
  // 1. Health & basic GET
  { name: 'GET /api/health', method: 'GET', path: '/api/health', expect: d => d.status === 'healthy' },
  { name: 'GET /api/ministries', method: 'GET', path: '/api/ministries', expect: d => d.total > 0 },
  { name: 'GET /api/chapters', method: 'GET', path: '/api/chapters', expect: d => d.total >= 96 },
  { name: 'GET /api/kg_stats', method: 'GET', path: '/api/kg_stats', expect: d => d.totalHsCodes === 11871 },
  { name: 'GET /api/legal-docs?limit=3', method: 'GET', path: '/api/legal-docs?limit=3', expect: d => d.total > 0 },
  { name: 'GET /api/kg_chapter?chapter=87', method: 'GET', path: '/api/kg_chapter?chapter=87&limit=3', expect: d => d.total > 0 },
  { name: 'GET /api/materials?limit=3', method: 'GET', path: '/api/materials?limit=3', expect: d => d.totalEntries > 0 },
  { name: 'GET /api/customs-types', method: 'GET', path: '/api/customs-types', expect: d => d.total > 0 },

  // 2. Lookup với query đúng schema
  { name: 'GET /api/tax?hs=87089962', method: 'GET', path: '/api/tax?hs=87089962', expect: d => d.hsCode === '87089962' },
  { name: 'GET /api/tax?hs=87082995', method: 'GET', path: '/api/tax?hs=87082995', expect: d => d.hsCode === '87082995' },
  { name: 'GET /api/precedents?hs=87089962', method: 'GET', path: '/api/precedents?hs=87089962', expect: d => Array.isArray(d) || d.hsCode === '87089962' },
  { name: 'GET /api/notes?hs=87089962', method: 'GET', path: '/api/notes?hs=87089962', expect: d => d.hsCode === '87089962' },
  { name: 'GET /api/conflicts?hs=87082995', method: 'GET', path: '/api/conflicts?hs=87082995', expect: d => d.hsCode === '87082995' },

  // 3. POST mới (schema MỚI)
  {
    name: 'POST /api/suggest (description only)',
    method: 'POST', path: '/api/suggest',
    body: { description: 'Adapter sạc pin 5V 2A' },
    expect: d => d.status && Array.isArray(d.results || d.suggestions || []),
  },
  {
    name: 'POST /api/classify (móc áo)',
    method: 'POST', path: '/api/classify',
    body: { tenHang: 'Móc áo nhựa gia dụng' },
    expect: d => d.status && Array.isArray(d.results),
  },
  {
    name: 'POST /api/describe (8708.99.62)',
    method: 'POST', path: '/api/describe',
    body: { hsCode: '87089962', productName: 'Tấm ốp bảo vệ gầm' },
    expect: d => d.declaration && d.declaration.tenHang,
  },

  // 4. Schema cũ phải FAIL rõ ràng (regression) — trả 4xx có error message
  {
    name: 'GET /api/suggest cũ q=... → phải 405',
    method: 'GET', path: '/api/suggest?q=abc',
    expectFail: true,
    expect: d => d.error && d.error.toLowerCase().includes('method'),
  },
  {
    name: 'POST /api/classify cũ description → phải 400 có tenHang',
    method: 'POST', path: '/api/classify',
    body: { description: 'Móc áo' },
    expectFail: true,
    expect: d => d.error && d.error.includes('tenHang'),
  },
  {
    name: 'POST /api/describe thiếu hsCode → phải 400',
    method: 'POST', path: '/api/describe',
    body: { productName: 'X' },
    expectFail: true,
    expect: d => d.error && d.error.includes('hsCode'),
  },
];

async function runTest(t) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const opts = {
      method: t.method,
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
    };
    if (t.body) opts.body = JSON.stringify(t.body);
    const t0 = Date.now();
    const r = await fetch(BASE + t.path, opts);
    const ms = Date.now() - t0;
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch {}
    // 4xx/5xx = FAIL (trừ khi test expect 4xx — schema cũ)
    const expectFail = t.expectFail;
    const isClientError = r.status >= 400 && r.status < 500;
    let ok;
    if (expectFail) {
      ok = isClientError && (!t.expect || t.expect(body));
    } else {
      ok = r.ok && (!t.expect || t.expect(body));
    }
    return { name: t.name, status: r.status, ms, ok, body: body || text.slice(0, 200) };
  } catch (e) {
    return { name: t.name, status: 0, ms: TIMEOUT, ok: false, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const t of tests) {
  const r = await runTest(t);
  results.push(r);
  const mark = r.ok ? '✅' : '❌';
  console.log(`${mark} ${String(r.ms).padStart(5)}ms  ${r.status}  ${r.name}`);
  if (!r.ok && r.body) {
    console.log(`     body: ${JSON.stringify(r.body).slice(0, 200)}`);
  }
}

const pass = results.filter(r => r.ok).length;
const total = results.length;
const summary = { pass, total, base: BASE, timestamp: new Date().toISOString() };
console.log(`\n=== Tóm tắt: ${pass}/${total} pass ===`);
console.log(JSON.stringify(summary, null, 2));
process.exit(pass === total ? 0 : 1);
