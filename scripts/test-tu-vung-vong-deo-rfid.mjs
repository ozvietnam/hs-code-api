#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2361 — từ vựng trượt «vòng đeo tay nhận diện / RFID wearable» (đo OZV-2360 26/11).
 *
 * Search thô kéo 3926/8471; cửa sổ không có 8543/9031 → classify hỏi nhánh nhựa
 * 3926.90 (polymerType) sai hướng. Mã đúng nhóm 8543 (dòng 85437090).
 *
 * Khoá:
 *  1. Ba biến thể tên khách khớp mục, ưu tiên 8543 (+ 9031 trong cửa sổ), chặn 3926/7116.
 *  2. getCandidates đưa 8543 lên và bỏ 3926 dù AI đề xuất 3926 đứng đầu.
 *  3. Không lan: vòng trang sức đá / máy đọc RFID / thẻ RFID card.
 * Không gọi mạng/LLM (AI được thay bằng hàm giả trả danh sách cố định).
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const llmPath = require.resolve(join(ROOT, 'lib', 'llm-tier.js'));
const llmReal = require(llmPath);
require.cache[llmPath].exports = {
  ...llmReal,
  callLLMJson: async () => ({ json: { headings: ['3926', '7116', '8471', '8543'] } }),
};

const { lookupTradeTerms } = require(join(ROOT, 'lib', 'trade-synonyms.js'));
const { tradeClassifyHints, biCamTrade } = require(join(ROOT, 'lib', 'trade-classify-hints.js'));
const { getCandidates } = require(join(ROOT, 'lib', 'retrieve-candidates.js'));
const { searchCandidates } = require(join(ROOT, 'lib', 'search-utils.js'));

let pass = 0; let fail = 0;
const check = (n, c, d) => {
  if (c) { pass += 1; console.log(`  ✓ ${n}`); } else { fail += 1; console.log(`  ✗ ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 500)); }
};

const ENTRY = 'vong-deo-tay-rfid-nhan-dien';
const CAU_KHACH = [
  'vòng đeo tay nhận diện 254x32',
  'vòng tay RFID khách sạn',
  'bracelet RFID 125kHz',
];

console.log('1. Ba biến thể tên khớp mục, kéo 8543/9031, chặn 3926');
for (const q of CAU_KHACH) {
  const t = lookupTradeTerms(q);
  const m = t.matches.find((x) => x.entryId === ENTRY);
  check(`«${q}» khớp ${ENTRY}`, !!m, t);
  const h = tradeClassifyHints(q);
  check(`«${q}» chặn 3926 / 7116`, biCamTrade('3926', h.avoidPrefixes) && biCamTrade('7116', h.avoidPrefixes), h.avoidPrefixes);
  check(`«${q}» ưu tiên 8543`, h.preferHeadings.includes('8543'), h.preferHeadings);
  check(`«${q}» ưu tiên 9031`, h.preferHeadings.includes('9031'), h.preferHeadings);
  check(`«${q}» ứng viên 85437090`, h.preferCodes.some((c) => c.hs === '85437090'), h.preferCodes);
  const tops = searchCandidates(q, { topCandidates: 10 }).map((c) => c.hsCode);
  const nhom = [...new Set(tops.map((hs) => String(hs).slice(0, 4)))];
  check(`«${q}» search có 8543`, nhom.includes('8543') || tops.some((hs) => String(hs).startsWith('8543')), { tops, nhom });
  check(`«${q}» search có 9031`, nhom.includes('9031') || tops.some((hs) => String(hs).startsWith('9031')), { tops, nhom });
}

console.log('2. getCandidates bỏ 3926 dù AI đề xuất đứng đầu');
for (const q of ['vòng đeo tay nhận diện 254x32', 'vòng tay RFID khách sạn']) {
  const r = await getCandidates({ tenHang: q });
  const heads = r.headings.map((x) => x.code4);
  check(`«${q}» không còn 3926 trong ứng viên`, !heads.includes('3926'), heads);
  check(`«${q}» ứng viên đầu là 8543`, heads[0] === '8543', heads);
  check(`«${q}» cửa sổ có 9031 hoặc 8543`, heads.includes('8543') && (heads.includes('9031') || heads[0] === '8543'), heads);
}

console.log('3. Không lan sang trang sức / máy đọc / thẻ card');
for (const q of [
  'vòng đeo tay bằng đá mã não tự nhiên',
  'máy đọc RFID cổng kiểm soát',
  'RFID reader UHF',
  'thẻ RFID card PVC',
  'smart card RFID',
]) {
  const t = lookupTradeTerms(q);
  check(`«${q}» KHÔNG khớp ${ENTRY}`, !t.matches.some((x) => x.entryId === ENTRY), t.matches.map((x) => x.entryId));
}

console.log(`\n${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
