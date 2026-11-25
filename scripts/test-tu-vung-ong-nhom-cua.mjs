#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2247 — từ vựng trượt «ống nhòm gắn cửa gỗ» (thực địa 25/11).
 *
 * Chú giải nhóm 90.05 mục (d) loại trừ «thiết bị ngắm qua cửa» sang nhóm 90.13.
 * Câu khách «ống nhòm gắn cửa gỗ» không khớp từ điển → search thô kéo 6403/7610/7306;
 * một số lượt NEED_FACTS dừng 6 số, một số chốt 90138090.
 *
 * Khoá:
 *  1. Câu mắt thần / ống nhòm gắn cửa khớp mục, ưu tiên 9013, chặn 9005/6403/7610.
 *  2. getCandidates đưa 9013 lên và bỏ 9005 dù AI đề xuất 9005 đứng đầu.
 *  3. Không lan: ống nhòm hai mắt / kính thiên văn / kính ngắm súng không khớp.
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
  callLLMJson: async () => ({ json: { headings: ['9005', '9013', '8302', '7610'] } }),
};

const { lookupTradeTerms } = require(join(ROOT, 'lib', 'trade-synonyms.js'));
const { tradeClassifyHints, biCamTrade } = require(join(ROOT, 'lib', 'trade-classify-hints.js'));
const { getCandidates } = require(join(ROOT, 'lib', 'retrieve-candidates.js'));

let pass = 0; let fail = 0;
const check = (n, c, d) => {
  if (c) { pass += 1; console.log(`  ✓ ${n}`); } else { fail += 1; console.log(`  ✗ ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 500)); }
};

const ENTRY = 'thiet-bi-ngam-qua-cua';
const CAU_KHACH = [
  'ống nhòm gắn cửa gỗ',
  'ống nhòm gắn cửa',
  'mắt thần cửa',
  'thiết bị ngắm qua cửa',
  'door viewer',
];

console.log('1. Câu mắt thần / ống nhòm gắn cửa khớp mục, chặn 9005');
for (const q of CAU_KHACH) {
  const t = lookupTradeTerms(q);
  const m = t.matches.find((x) => x.entryId === ENTRY);
  check(`«${q}» khớp ${ENTRY}`, !!m, t);
  const h = tradeClassifyHints(q);
  check(`«${q}» chặn 9005 / 90051000`, biCamTrade('9005', h.avoidPrefixes) && biCamTrade('90051000', h.avoidPrefixes), h.avoidPrefixes);
  check(`«${q}» chặn 6403 và 7610`, biCamTrade('6403', h.avoidPrefixes) && biCamTrade('7610', h.avoidPrefixes), h.avoidPrefixes);
  check(`«${q}» ưu tiên 9013`, h.preferHeadings.includes('9013'), h.preferHeadings);
  check(`«${q}» ứng viên 90138090`, h.preferCodes.some((c) => c.hs === '90138090'), h.preferCodes);
}

console.log('2. getCandidates bỏ 9005 dù AI đề xuất đứng đầu');
for (const q of ['ống nhòm gắn cửa gỗ', 'mắt thần cửa']) {
  const r = await getCandidates({ tenHang: q });
  const heads = r.headings.map((x) => x.code4);
  check(`«${q}» không còn 9005 trong ứng viên`, !heads.includes('9005'), heads);
  check(`«${q}» ứng viên đầu là 9013`, heads[0] === '9013', heads);
}

console.log('3. Không lan sang ống nhòm cầm tay / kính ngắm súng');
for (const q of [
  'ống nhòm hai mắt cầm tay',
  'kính thiên văn quan sát sao',
  'kính ngắm súng thể thao',
  'binoculars 10x50',
]) {
  const t = lookupTradeTerms(q);
  check(`«${q}» KHÔNG khớp ${ENTRY}`, !t.matches.some((x) => x.entryId === ENTRY), t.matches.map((x) => x.entryId));
}

console.log(`\n${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
