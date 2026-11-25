#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2225 — từ vựng trượt «núm hút silicon» (thực địa 24/11: 3/4 câu khách).
 *
 * Câu khách «núm hút <model>, silicon» không có chữ «chân không» nên không khớp mục
 * giac-hut-chan-khong-vacuum-pad; AI đề xuất 3924 (chữ «núm» ↔ «núm vú bình trẻ em»,
 * Chú giải nhóm 39.24 mục (D)) và máy hỏi khách bô / núm vú / bộ câu sữa.
 *
 * Khoá:
 *  1. Ba câu núm hút khớp mục từ điển, chặn tiền tố 3924, đưa 4016/3926 lên.
 *  2. Đường gom ứng viên (getCandidates) bỏ 3924 dù AI đề xuất 3924 đứng đầu.
 *  3. Không lan: núm vú / núm ti / hút sữa / bình sữa trẻ em KHÔNG khớp mục này.
 *  4. Câu cũ «giác hút chân không smc zp-905-08eu» vẫn khớp như trước.
 * Không gọi mạng/LLM (AI được thay bằng hàm giả trả danh sách cố định).
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Thay AI đề xuất nhóm bằng hàm giả — đúng hành vi đo được trên bản thật 25/11 07:00 (3924 đứng đầu).
const llmPath = require.resolve(join(ROOT, 'lib', 'llm-tier.js'));
const llmReal = require(llmPath);
require.cache[llmPath].exports = {
  ...llmReal,
  callLLMJson: async () => ({ json: { headings: ['3924', '4016', '3926', '8414'] } }),
};

const { lookupTradeTerms } = require(join(ROOT, 'lib', 'trade-synonyms.js'));
const { tradeClassifyHints, biCamTrade } = require(join(ROOT, 'lib', 'trade-classify-hints.js'));
const { getCandidates } = require(join(ROOT, 'lib', 'retrieve-candidates.js'));

let pass = 0; let fail = 0;
const check = (n, c, d) => {
  if (c) { pass += 1; console.log(`  ✓ ${n}`); } else { fail += 1; console.log(`  ✗ ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 500)); }
};

const ENTRY = 'giac-hut-chan-khong-vacuum-pad';
const CAU_KHACH = [
  'núm hút mbs-15, silicon, đường kính lỗ 2,5mm',
  'núm hút vp16ps, silicon',
  'núm hút ys3-10, silicon',
];

console.log('1. Ba câu núm hút khớp mục từ điển, chặn 3924');
for (const q of CAU_KHACH) {
  const t = lookupTradeTerms(q);
  const m = t.matches.find((x) => x.entryId === ENTRY);
  check(`«${q}» khớp ${ENTRY}`, !!m, t);
  const h = tradeClassifyHints(q);
  check(`«${q}» chặn 3924 / 392490`, biCamTrade('3924', h.avoidPrefixes) && biCamTrade('39249020', h.avoidPrefixes), h.avoidPrefixes);
  check(`«${q}» ưu tiên 4016 và 3926`, h.preferHeadings.includes('4016') && h.preferHeadings.includes('3926'), h.preferHeadings);
  const askText = (m?.askVi || []).join(' ');
  check(`«${q}» câu hỏi gửi khách không nói bô/núm vú`, askText.length > 0 && !/\bbô\b|núm vú|câu sữa/i.test(askText), askText);
}

console.log('2. getCandidates bỏ 3924 dù AI đề xuất đứng đầu');
for (const q of CAU_KHACH) {
  const r = await getCandidates({ tenHang: q });
  const heads = r.headings.map((x) => x.code4);
  check(`«${q}» không còn 3924 trong ứng viên`, !heads.includes('3924'), heads);
  check(`«${q}» ứng viên đầu là 4016 hoặc 3926`, ['4016', '3926'].includes(heads[0]), heads);
  check(`«${q}» không mã 8 số 3924 nào`, !(r.precedentCodes || []).some((c) => String(c.hs).startsWith('3924')), r.precedentCodes);
}

console.log('3. Không lan sang đồ trẻ em');
for (const q of [
  'núm vú silicon cho bình sữa trẻ em',
  'núm hút sữa silicon',
  'núm ti giả silicon cho em bé',
  'núm hút bình sữa',
]) {
  const t = lookupTradeTerms(q);
  check(`«${q}» KHÔNG khớp ${ENTRY}`, !t.matches.some((x) => x.entryId === ENTRY), t.matches.map((x) => x.entryId));
}

console.log('4. Câu cũ vẫn khớp');
{
  const q = 'giác hút chân không smc zp-905-08eu';
  const t = lookupTradeTerms(q);
  check(`«${q}» vẫn khớp ${ENTRY}`, t.matches.some((x) => x.entryId === ENTRY), t);
}

console.log(`\n${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
