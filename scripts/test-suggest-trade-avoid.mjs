#!/usr/bin/env node
/**
 * OZV-1323 — lỗ hybrid /api/suggest: avoid[] chỉ lấy từ avoidedByTradeRules
 * (mã đã từng có trong keyword rồi bị loại). Khi 401012 không nằm trong keyword
 * nhưng LLM đề xuất heading 4010, expand lá bơm lại 401012 (băng tải dệt).
 *
 * Hợp đồng: searchCandidates phải gắn avoidPrefixes đủ từ mục từ điển đã khớp;
 * buildSuggestCandidates phải dùng các prefix đó khi expand heading.
 */
import './test-isolate-data.mjs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { searchCandidates } = require(join(ROOT, 'lib', 'search-utils.js'));
const retrievePath = require.resolve(join(ROOT, 'lib', 'retrieve-candidates.js'));
const suggestPath = require.resolve(join(ROOT, 'lib', 'suggest-candidates.js'));

let failed = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const Q = 'dây đai dẹt T10 cao su';

console.log('\n== OZV-1323: avoidPrefixes đủ dù keyword không xếp 401012 ==');
{
  const kw = searchCandidates(Q, { topCandidates: 12 });
  const tops = kw.slice(0, 3).map((c) => c.hsCode);
  check(
    'keyword top thuộc 401035/401036',
    tops[0] === '40103500' || tops[0] === '40103600',
    `top=${tops.join(',')}`,
  );
  check(
    'keyword không còn 401012*',
    kw.every((c) => !String(c.hsCode).startsWith('401012')),
  );
  const prefixes = kw.avoidPrefixes || [];
  check(
    'avoidPrefixes có 401012 (không phụ thuộc mã đã bị loại)',
    prefixes.includes('401012'),
    `avoidPrefixes=${prefixes.join(',') || '—'}; avoided=${(kw.avoidedByTradeRules || []).map((a) => a.prefix || a.hsCode).join(',')}`,
  );
  check(
    'avoidPrefixes có 39269053',
    prefixes.includes('39269053'),
    `avoidPrefixes=${prefixes.join(',') || '—'}`,
  );
}

console.log('\n== OZV-1323: hybrid expand heading 4010 không bơm lại 401012 ==');
{
  const retrieve = require(retrievePath);
  const orig = retrieve.getCandidates;
  retrieve.getCandidates = async () => ({
    headings: [{ code4: '4010', confidence: 0.9 }],
    precedentCodes: [],
  });
  delete require.cache[suggestPath];
  try {
    const { buildSuggestCandidates } = require(suggestPath);
    const { candidates, meta } = await buildSuggestCandidates(Q, {
      topCandidates: 20,
      perHeading: 12,
      maxHeadings: 4,
      includePrecedent: false,
      timeoutMs: 1000,
    });
    const codes = candidates.map((c) => c.hsCode);
    check(
      'hybrid không còn 401012*',
      codes.every((h) => !String(h).startsWith('401012')),
      `nhận ${codes.filter((h) => String(h).startsWith('401012')).join(',') || '—'}; all=${codes.slice(0, 8).join(',')}`,
    );
    check(
      'hybrid có 40103500 hoặc 40103600',
      codes.includes('40103500') || codes.includes('40103600'),
      `nhận ${codes.slice(0, 5).join(',')}`,
    );
    check(
      'meta.headings vẫn nhận 4010 (chỉ lọc lá, không nuốt cả nhóm)',
      (meta.headings || []).some((h) => String(h).startsWith('4010')),
      `headings=${(meta.headings || []).join(',')}`,
    );
  } finally {
    retrieve.getCandidates = orig;
    delete require.cache[suggestPath];
  }
}

if (failed) {
  console.log(`\n❌ test-suggest-trade-avoid: ${failed} lỗi`);
  process.exit(1);
}
console.log('\n✅ test-suggest-trade-avoid: tất cả kiểm tra đạt');
