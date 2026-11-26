#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2366 — từ vựng trượt «vòi phun rửa ly bằng áp lực nước» (thực địa 24h:
 * 4 lượt, 2 ra 8 số / 2 dừng 6 số — không ổn định; search thô kéo 8481 vì chữ «vòi»).
 *
 * Luật (chú giải 84.24 / 84.81):
 *  - Thiết bị phun chất lỏng dưới áp lực → nhóm 84.24.
 *  - 84.81 loại trừ đầu phun / thiết bị phun tương tự → 84.24.
 *  - 84.24 loại trừ béc gắn van/vòi điều chỉnh dòng → 84.81 (hỏi khi còn nghi).
 *  - Trong 8424.89, ranh 84248950/90 cần fact hoatDongBangDien → dừng 6 số hỏi điện
 *    là đúng luật (THIEU_SO_LIEU), không phải hỏi thừa.
 *
 * Khoá:
 *  1. Câu khách khớp mục, ưu tiên 8424, chặn 8481.
 *  2. getCandidates đưa 8424 lên dù AI đề xuất 8481 đứng đầu.
 *  3. cauDong8(842489) hỏi hoatDongBangDien (căn cứ biểu).
 *  4. Không lan: vòi nước lavabo / van bi / súng phun sơn nông nghiệp.
 * Không gọi mạng/LLM.
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
  callLLMJson: async () => ({ json: { headings: ['8481', '8456', '8413', '8424'] } }),
};

const { lookupTradeTerms } = require(join(ROOT, 'lib', 'trade-synonyms.js'));
const { tradeClassifyHints, biCamTrade } = require(join(ROOT, 'lib', 'trade-classify-hints.js'));
const { getCandidates } = require(join(ROOT, 'lib', 'retrieve-candidates.js'));
const { searchCandidates } = require(join(ROOT, 'lib', 'search-utils.js'));
const H = require(join(ROOT, 'lib', 'hoi-theo-so-tay.js'));

let pass = 0; let fail = 0;
const check = (n, c, d) => {
  if (c) { pass += 1; console.log(`  ✓ ${n}`); }
  else { fail += 1; console.log(`  ✗ ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 500)); }
};

const ENTRY = 'voi-phun-rua-ly-ap-luc';
const CAU_KHACH = [
  'vòi phun rửa ly bằng áp lực nước, điều khiển bằng',
  'vòi phun rửa ly áp lực nước',
  'vòi phun rửa chén bằng áp lực nước',
  'pre-rinse spray valve glass washer',
];

console.log('1. Câu khách khớp mục, kéo 8424, chặn 8481');
for (const q of CAU_KHACH) {
  const t = lookupTradeTerms(q);
  const m = t.matches.find((x) => x.entryId === ENTRY);
  check(`«${q.slice(0, 48)}» khớp ${ENTRY}`, !!m, t.matches.map((x) => x.entryId));
  const h = tradeClassifyHints(q);
  check(`«${q.slice(0, 48)}» chặn 8481`, biCamTrade('8481', h.avoidPrefixes), h.avoidPrefixes);
  check(`«${q.slice(0, 48)}» ưu tiên 8424`, h.preferHeadings.includes('8424'), h.preferHeadings);
  check(
    `«${q.slice(0, 48)}» ứng viên 84248950/90`,
    h.preferCodes.some((c) => c.hs === '84248950' || c.hs === '84248990'),
    h.preferCodes.map((c) => c.hs),
  );
  const tops = searchCandidates(q, { topCandidates: 15 }).map((c) => c.hsCode);
  const nhom = [...new Set(tops.map((hs) => String(hs).slice(0, 4)))];
  check(`«${q.slice(0, 48)}» search có 8424 (sau inject trade)`, nhom.includes('8424') || tops.some((hs) => String(hs).startsWith('8424')), { tops: tops.slice(0, 8), nhom });
}

console.log('2. getCandidates bỏ 8481 đứng đầu dù AI đề xuất 8481');
for (const q of [
  'vòi phun rửa ly bằng áp lực nước, điều khiển bằng',
  'vòi phun rửa ly áp lực nước',
]) {
  const r = await getCandidates({ tenHang: q });
  const heads = r.headings.map((x) => x.code4);
  check(`«${q.slice(0, 48)}» ứng viên đầu là 8424`, heads[0] === '8424', heads);
  check(`«${q.slice(0, 48)}» không còn 8481 trong cửa sổ ưu tiên đầu`, !heads.slice(0, 2).includes('8481'), heads);
}

console.log('3. Dừng 6 số hỏi điện là đúng luật (842489 → hoatDongBangDien)');
{
  const text = 'vòi phun rửa ly bằng áp lực nước, điều khiển bằng';
  const ghi = [];
  const q = H.cauDong8({ h4: '8424', maXet: '84248990', text, ghiPn6: ghi });
  check('cauDong8 trả ≥1 câu', Array.isArray(q) && q.length >= 1, q);
  check(
    'câu hỏi fact hoatDongBangDien',
    q.some((x) => x.fact === 'hoatDongBangDien' && x.loai === 'DONG_8'),
    q.map((x) => ({ fact: x.fact, canCu: x.canCu, nguon: x.nguon })),
  );
  check(
    'căn cứ biểu tax.84248950 hoặc ranh-gioi-pn6',
    q.some((x) => x.fact === 'hoatDongBangDien' && (x.nguon === 'tax.84248950' || x.canCu === 'ranh-gioi-pn6')),
    q,
  );
  check('ghiPn6 THIEU_SO_LIEU cho 842489', ghi.some((g) => g.pn6 === '842489' && g.ketQuaLoi === 'THIEU_SO_LIEU'), ghi);
}

console.log('4. Không lan sang vòi nước / van / súng phun nông nghiệp');
for (const q of [
  'vòi nước bồn rửa tay bằng đồng',
  'van bi đường ống hơi bằng thép',
  'súng phun thuốc trừ sâu dùng trong nông nghiệp',
  'vòi lavabo inox',
]) {
  const t = lookupTradeTerms(q);
  check(`«${q}» KHÔNG khớp ${ENTRY}`, !t.matches.some((x) => x.entryId === ENTRY), t.matches.map((x) => x.entryId));
}

console.log(`\n${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
