#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2361 → OZV-2368 — từ vựng «vòng đeo tay nhận diện / RFID wristband».
 *
 * OZV-2361 dồn cụm này vào 8543 (85437090) và chặn 3926. Thực địa 26/11
 * (OZV-2368): 10/10 lượt «vòng đeo tay nhận diện 254x32 / 206x32» dừng PN6
 * 854370, hỏi 6 nhánh máy điện không dính vòng đeo tay. Chú giải chi tiết
 * nhóm 85.43 loại trừ (e): «Thẻ thông minh (kể cả thẻ không tiếp xúc hoặc tag)
 * … (nhóm 85.23)» → vòng có tag RFID thuộc 8523 (85235910), vòng không chip
 * bằng nhựa thuộc 3926 (39269099).
 *
 * Khoá:
 *  1. Câu có RFID/NFC → mục RFID: ưu tiên 8523 (85235910), chặn 8543/7116.
 *  2. Câu «nhận diện» chưa nói chip → mục chưa-rõ-chip: cửa sổ 3926 + 8523,
 *     chặn 8543, câu hỏi đầu là có chip không; không chốt sớm.
 *  3. getCandidates không còn 8543 dù AI đề xuất.
 *  4. Không lan: vòng trang sức đá / máy đọc RFID / thẻ RFID card.
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
  callLLMJson: async () => ({ json: { headings: ['8543', '3926', '7116', '8471', '8523'] } }),
};

const { lookupTradeTerms } = require(join(ROOT, 'lib', 'trade-synonyms.js'));
const { tradeClassifyHints, biCamTrade } = require(join(ROOT, 'lib', 'trade-classify-hints.js'));
const { getCandidates } = require(join(ROOT, 'lib', 'retrieve-candidates.js'));

let pass = 0; let fail = 0;
const check = (n, c, d) => {
  if (c) { pass += 1; console.log(`  ✓ ${n}`); } else { fail += 1; console.log(`  ✗ ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 500)); }
};

const RFID = 'vong-deo-tay-rfid-nhan-dien';
const CHUA_RO = 'vong-deo-tay-nhan-dien-chua-ro-chip';
const CAU_RFID = ['vòng tay RFID khách sạn', 'bracelet RFID 125kHz', 'vòng đeo tay nhận diện RFID'];
const CAU_CHUA_RO = ['vòng đeo tay nhận diện 254x32', 'vòng đeo tay nhận diện 206x32', 'vòng tay bệnh nhân'];

console.log('1. Câu có RFID → 8523, chặn 8543');
for (const q of CAU_RFID) {
  const t = lookupTradeTerms(q);
  check(`«${q}» khớp ${RFID}`, t.matches.some((x) => x.entryId === RFID), t.matches.map((x) => x.entryId));
  check(`«${q}» không khớp ${CHUA_RO}`, !t.matches.some((x) => x.entryId === CHUA_RO), t.matches.map((x) => x.entryId));
  const h = tradeClassifyHints(q);
  check(`«${q}» ưu tiên 8523`, h.preferHeadings.includes('8523'), h.preferHeadings);
  check(`«${q}» không ưu tiên 8543`, !h.preferHeadings.includes('8543'), h.preferHeadings);
  check(`«${q}» chặn 8543 / 7116`, biCamTrade('8543', h.avoidPrefixes) && biCamTrade('7116', h.avoidPrefixes), h.avoidPrefixes);
  check(`«${q}» ứng viên 85235910`, h.preferCodes.some((c) => c.hs === '85235910'), h.preferCodes);
}

console.log('2. Câu «nhận diện» chưa rõ chip → 3926 + 8523, hỏi chip trước');
for (const q of CAU_CHUA_RO) {
  const t = lookupTradeTerms(q);
  const m = t.matches.find((x) => x.entryId === CHUA_RO);
  check(`«${q}» khớp ${CHUA_RO}`, !!m, t.matches.map((x) => x.entryId));
  check(`«${q}» không chốt sớm`, m && m.chotSom === false, m && m.chotSom);
  check(`«${q}» câu hỏi đầu hỏi chip`, m && /chip/i.test(m.askVi[0] || ''), m && m.askVi);
  const h = tradeClassifyHints(q);
  check(`«${q}» ưu tiên 3926 và 8523`, h.preferHeadings.includes('3926') && h.preferHeadings.includes('8523'), h.preferHeadings);
  check(`«${q}» chặn 8543`, biCamTrade('8543', h.avoidPrefixes), h.avoidPrefixes);
  check(`«${q}» không chặn 3926`, !biCamTrade('3926', h.avoidPrefixes), h.avoidPrefixes);
}

console.log('3. getCandidates bỏ 8543 dù AI đề xuất đứng đầu');
for (const q of ['vòng đeo tay nhận diện 254x32', 'vòng tay RFID khách sạn']) {
  const r = await getCandidates({ tenHang: q });
  const heads = r.headings.map((x) => x.code4);
  check(`«${q}» không còn 8543 trong ứng viên`, !heads.includes('8543'), heads);
  check(`«${q}» cửa sổ có 8523`, heads.includes('8523'), heads);
}
{
  const r = await getCandidates({ tenHang: 'vòng đeo tay nhận diện 254x32' });
  const heads = r.headings.map((x) => x.code4);
  check('«vòng đeo tay nhận diện 254x32» cửa sổ có 3926', heads.includes('3926'), heads);
}

console.log('4. Không lan sang trang sức / máy đọc / thẻ card');
for (const q of [
  'vòng đeo tay bằng đá mã não tự nhiên',
  'máy đọc RFID cổng kiểm soát',
  'RFID reader UHF',
  'thẻ RFID card PVC',
  'smart card RFID',
]) {
  const t = lookupTradeTerms(q);
  check(`«${q}» KHÔNG khớp mục vòng đeo tay`, !t.matches.some((x) => x.entryId === RFID || x.entryId === CHUA_RO), t.matches.map((x) => x.entryId));
}

console.log(`\n${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
