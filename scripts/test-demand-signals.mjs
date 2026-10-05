// Test nhu cầu từ hàng thật (lib/demand-signals.js, GET /api/demand) — CEO 05/10/2026.
// Riêng tư: bản công khai KHÔNG có số lượng / tên hàng / link / khách.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
process.env.HS_ACCESS_LOG = '0';
console.error = () => {};
const { signalsFromSheet, recordSignals, aggregateDemand, readSignals } = require('../lib/demand-signals');
const { dataPath } = require('../lib/data-paths');
const { renderIssue } = await import('./demand-issue.mjs');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

const SHEET = {
  hsCode: '85366932',
  heading: { code: '8536', titleVi: 'Thiết bị đóng cắt', template: 'switchgear' },
  fields: [{ key: 'brand', status: 'HAVE', valueVi: 'Marc Lichte', source: 'SITE', method: 'LLM' }],
  missing: [{ key: 'dimensions', status: 'MISSING' }],
  trademark: { brand: 'Marc Lichte', brandStatus: 'BRANDED', risk: null, counterfeitSignals: [{ term: '同款', labelVi: 'x' }] },
};
const MAPPED = {
  policyLevel: 'INFO',
  policyLines: [{ text: 'Hàng hóa … cư dân biên giới (42/2019/TT-BCT & 34/2025/TT-BCT )', level: 'INFO' }],
  hsListings: [{ soHieu: '34/2025/TT-BCT' }],
};
const SPECS = [
  { key: '材质', value: '锡磷青铜' }, // từ điển hiểu
  { key: '插孔间距', value: '大间距' }, // chưa hiểu
  { key: '同城服务', value: '送货上门' }, // nhiễu bán hàng
  { key: '已选规格(Phân loại)', value: 'x' },
];

const sig = signalsFromSheet({ sheet: SHEET, mapped: MAPPED, specsZh: SPECS });
const types = sig.map((s) => s.t);
check('KTCN_2026: mã chưa có trong danh mục 2026 → tín hiệu kèm văn bản đang dẫn', sig.some((s) => s.t === 'KTCN_2026' && s.k === '85366932' && s.m.docs.includes('42/2019/TT-BCT')), JSON.stringify(sig));
check('nhãn hiệu chưa theo dõi', sig.some((s) => s.t === 'BRAND_UNLISTED' && s.k === 'Marc Lichte' && s.m.heading === '8536'));
check('chữ gợi hàng nhái', types.includes('COUNTERFEIT_TERM'));
check('ô thiếu theo nhóm', sig.some((s) => s.t === 'FIELD_MISSING' && s.k === '8536:dimensions'));
check('nhãn Trung chưa hiểu: chỉ 插孔间距 (bỏ nhãn đã hiểu, nhiễu bán hàng, biến thể)', sig.filter((s) => s.t === 'ZH_LABEL_UNMAPPED').map((s) => s.k).join() === '插孔间距', JSON.stringify(sig.filter((s) => s.t === 'ZH_LABEL_UNMAPPED')));
check('có template nhóm → không báo thiếu template', !types.includes('NO_HEADING_TEMPLATE'));
check('đã có bảng KTCN 2026 cho mã → không báo', !signalsFromSheet({ sheet: SHEET, mapped: { ...MAPPED, hsListings: [{ soHieu: '36/2026/TT-BKHCN' }] } }).some((s) => s.t === 'KTCN_2026'));
check('không mã HS → không tín hiệu', signalsFromSheet({ sheet: { ...SHEET, hsCode: null } }).length === 0);
check('nhãn đã có rủi ro trong watchlist → không báo "chưa theo dõi"', !signalsFromSheet({ sheet: { ...SHEET, trademark: { ...SHEET.trademark, risk: { matched: true } } }, mapped: MAPPED }).some((s) => s.t === 'BRAND_UNLISTED'));

check('无品牌 không phải "nhãn chỉ có chữ Hán"', !signalsFromSheet({ sheet: { ...SHEET, fields: [{ key: 'brand', status: 'UNTRANSLATED', valueZh: '无品牌' }] }, mapped: MAPPED }).some((s) => s.t === 'BRAND_HAN_ONLY'));
const { extractSpecs } = require('../lib/extract-specs');
const ex = await extractSpecs({ specsZh: [{ key: '品牌', value: '无品牌' }] }, { llm: async () => ({ json: { attributes: [] } }) });
check('无品牌 → "không nhãn hiệu" (tất định)', ex.attributes.find((a) => a.key === 'brand')?.valueVi === 'không nhãn hiệu', JSON.stringify(ex.attributes));

check('nhãn khách/NV tự gõ (supplement) KHÔNG thành tín hiệu công khai', !signalsFromSheet({ sheet: { ...SHEET, fields: [{ key: 'brand', status: 'HAVE', valueVi: 'Nguyễn Văn A 0912345678', source: 'CUSTOMER', method: 'SUPPLEMENT' }], trademark: { ...SHEET.trademark, brand: 'Nguyễn Văn A 0912345678' } }, mapped: MAPPED }).some((s) => s.t === 'BRAND_UNLISTED'));

// Ghi + gom: 5 lần mã 85366932 → Cao; 1 lần mã khác → Thấp; tín hiệu quá 90 ngày bị bỏ
fs.rmSync(dataPath('demand-signals.jsonl'), { force: true });
for (let i = 0; i < 5; i += 1) recordSignals(sig, '2026-10-05');
recordSignals([{ t: 'KTCN_2026', k: '85182990', m: { policyLevel: 'BLOCKING', docs: [] } }], '2026-10-04');
recordSignals([{ t: 'KTCN_2026', k: '61091000', m: {} }], '2026-01-01');
check('ghi đúng số dòng', readSignals().length === sig.length * 5 + 2);
const agg = aggregateDemand({ now: '2026-10-05' });
check('mã gặp 5 lần → Cao, đứng trước', agg.ktcn2026[0]?.hs === '85366932' && agg.ktcn2026[0].priority === 'Cao', JSON.stringify(agg.ktcn2026));
check('mã gặp 1 lần → Thấp', agg.ktcn2026.find((x) => x.hs === '85182990')?.priority === 'Thấp');
check('tín hiệu ngoài 90 ngày bị bỏ', !agg.ktcn2026.some((x) => x.hs === '61091000'));
check('nhãn hiệu kèm nhóm', agg.brands[0]?.brand === 'Marc Lichte' && agg.brands[0].headings.includes('8536'));
const pub = JSON.stringify(agg);
const ord = aggregateDemand({ now: '2026-10-05', rows: [
  ...Array(3).fill({ d: '2026-10-05', t: 'ZH_LABEL_UNMAPPED', k: 'Z', m: {} }),
  ...Array(4).fill({ d: '2026-10-05', t: 'ZH_LABEL_UNMAPPED', k: 'A', m: {} }),
] }).zhLabels.map((x) => x.label).join();
check('trong cùng mức xếp theo chữ cái (không lộ số lần qua thứ tự)', ord === 'A,Z', ord);
const escMd = (await import('./demand-issue.mjs')).md;
check('issue: thoát markdown + chặn @nhắc tên / link', !/@octocat|\]\(http/.test(escMd('@octocat [x](http://evil)')), escMd('@octocat [x](http://evil)'));
check('ngày gặp làm tròn về thứ Hai của tuần', agg.ktcn2026[0]?.lastSeen === '2026-10-05' && require('../lib/demand-signals').weekOf('2026-10-08') === '2026-10-05');
check('bản công khai KHÔNG có số lượng', !/"(n|count|so_lan|soLan)"\s*:/.test(pub), pub.slice(0, 300));

// HTTP công khai qua /api/dataset?resource=demand (không token)
const handler = require('../api/dataset.js');
const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
await handler({ method: 'GET', url: '/api/demand', query: { resource: 'demand' }, headers: {} }, res);
check('GET /api/demand công khai (không token) → 200', res._s === 200 && Array.isArray(res._j?.ktcn2026), String(res._s));

// Nội dung issue
const md = renderIssue(agg);
check('issue có nhãn hiệu + ô thiếu + nhãn Trung + trỏ KTCN sang oz-wiki', md.includes('Marc Lichte') && md.includes('8536') && md.includes('插孔间距') && md.includes('oz-wiki-plhq'));
check('issue không lộ số lượng', !/\b5 lần\b|count/i.test(md));

fs.rmSync(dataPath('demand-signals.jsonl'), { force: true });
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
