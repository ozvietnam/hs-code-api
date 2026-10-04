// Khung KTCN 2026 (data/ktcn-regime-2026.json, lib/policy-regime.js): /api/tax báo dòng nào còn dẫn
// danh mục đã bị thay, KHÔNG đổi nội dung chính sách; /api/ktcn-regime công khai.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'regime-test-token';
process.env.HS_ACCESS_LOG = '0';

const { policyBasisReview, regimeStatusForCode, regimeSummary } = require('../lib/policy-regime.js');
const { mapTaxLookup } = require('../lib/tax-mapper.js');
const { taxData } = require('../lib/data.js');
const regime = require('../data/ktcn-regime-2026.json');
const procedures = require('../data/policy-procedures.json');

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); }
};

// 1. Bánh mè 19059090 — ví dụ trong bài: KT ATTP theo QĐ 1182 → nay TT 28/2026/TT-BCT
const cake = mapTaxLookup('19059090');
const r1 = cake.policyBasisReview;
check('19059090: căn cứ cũ, đã bị thay', r1?.status === 'OUTDATED_BASIS' && r1.items[0].id === 'bct-attp-1182', JSON.stringify(r1));
check('19059090: văn bản thay là TT 28/2026/TT-BCT, hiệu lực 17/7/2026',
  r1?.items[0].replacedBy[0].code === '28/2026/TT-BCT' && r1.items[0].effectiveFrom === '2026-07-17' && r1.items[0].confidence === 'HIGH');
check('19059090: KHÔNG đổi policyByHs', /1182\/QĐ-BCT-PL2-2021/.test(cake.policyByHs || ''));

// 2. 1182 Phụ lục 1 (chất lượng nhóm 2) ≠ Phụ lục 2 (ATTP)
const phone = policyBasisReview('Hàng hóa KTCN về chất lượng SP HH nhóm 2 (1182/QĐ-BCT-PL1-2021)');
check('1182 PL1 → TT 33/2026/TT-BCT, không phải 28/2026', phone?.items.length === 1 && phone.items[0].replacedBy[0].code === '33/2026/TT-BCT', JSON.stringify(phone?.items));

// 3. Văn bản mới chưa tới ngày hiệu lực → UPCOMING, không coi là căn cứ cũ
const early = policyBasisReview('HH KTCN về an toàn thực phẩm (1182/QĐ-BCT-PL2-2021)', { asOf: '2026-07-10' });
check('trước 17/7/2026 → UPCOMING + NEEDS_REVIEW', early?.items[0].relation === 'UPCOMING' && early.status === 'NEEDS_REVIEW', JSON.stringify(early));

// 4. Không bắt nhầm
check('M12 (nguồn gen cây trồng) không khớp M1 kiểm dịch', policyBasisReview('Nguồn gen cây trồng cấm XK (01/2024/TT-BNNPTNT M12)') === null);
check('văn bản không thuộc diện thay → null', policyBasisReview('Hàng tiêu dùng QSD cấp NK (08/2023/TT-BCT - PL1.I)') === null);
check('cs trống → null', policyBasisReview('') === null && !('policyBasisReview' in mapTaxLookup('87032359')));
check('BLĐTBXH viết có Đ vẫn khớp', policyBasisReview('SPHH phải KTNN về CL khi NK (01/2021/TT-BLĐTBXH)')?.items[0].confidence === 'LOW');

// 5. Trích dẫn pháp luật trong warnings gắn trạng thái khung 2026
const car = mapTaxLookup('84281031');
const cites = [...(car.warnings?.legalCitations || []), ...(car.warnings?.legalDocs || [])];
check('legalCitations/legalDocs có regime2026 cho TT 12/2022/TT-BGTVT',
  cites.some((c) => /12\/2022\/TT-BGTVT/.test(c.code || '') && c.regime2026?.replacedBy?.includes('49/2026/TT-BXD')), JSON.stringify(cites.map((c) => c.code)));
check('regimeStatusForCode: số hiệu lạ → null', regimeStatusForCode('42/2019/TT-BCT') === null);

// 6. Toàn vẹn dữ liệu
const listCodes = new Set(regime.lists.map((l) => l.code));
check('mọi replacedBy đều có trong lists', regime.superseded.every((s) => s.replacedBy.every((c) => listCodes.has(c))),
  JSON.stringify(regime.superseded.flatMap((s) => s.replacedBy).filter((c) => !listCodes.has(c))));
check('mọi quy tắc có relation/confidence hợp lệ', regime.superseded.every((s) => ['REPLACED', 'LIKELY_REPLACED', 'REVIEW'].includes(s.relation) && ['HIGH', 'MEDIUM', 'LOW'].includes(s.confidence)));
check('REPLACED chỉ đi với HIGH (không khẳng định thay thế khi chưa chắc)', regime.superseded.every((s) => s.relation !== 'REPLACED' || s.confidence === 'HIGH'));
const rows = Object.values(taxData);
const dead = regime.superseded.filter((s) => !rows.some((r) => s.patterns.some((p) => new RegExp(p, 'i').test(String(r.cs || '').toUpperCase().replace(/Đ/g, 'D')))));
check('mọi quy tắc khớp ít nhất một dòng biểu thuế (không có quy tắc chết)', dead.length === 0, dead.map((d) => d.id).join());
const allItems = rows.flatMap((r) => (r.cs ? policyBasisReview(r.cs)?.items || [] : []));
check('toàn biểu thuế: mọi mục REPLACED (kể cả từ sổ cộng đồng) đều HIGH', allItems.every((i) => i.relation !== 'REPLACED' || i.confidence === 'HIGH'), JSON.stringify(allItems.filter((i) => i.relation === 'REPLACED' && i.confidence !== 'HIGH').slice(0, 3)));
const cakeDocs = [...(cake.warnings?.legalCitations || []), ...(cake.warnings?.legalDocs || [])].filter((c) => /1182/.test(c.code || ''));
check('19059090: trích dẫn 1182 trong warnings có regime2026 khớp quy tắc ATTP', cakeDocs.length > 0 && cakeDocs.every((c) => c.regime2026?.ruleId === 'bct-attp-1182'), JSON.stringify(cakeDocs.map((c) => [c.code, c.regime2026])));
check('regimeSummary không lộ regex', !JSON.stringify(regimeSummary()).includes('patterns'));

// 7. Bảng thủ tục đã theo khung mới
const proc = Object.values(procedures);
check('chất lượng: căn cứ NĐ 37/2026, nêu NĐ 132/2008 hết hiệu lực', /37\/2026\/NĐ-CP/.test(procedures['chat-luong'].legalBasis) && /hết hiệu lực/.test(procedures['chat-luong'].legalBasis));
check('không còn bộ đã sáp nhập trong cột ministry', proc.every((p) => !/BNNPTNT|BTNMT|BGTVT|BLĐTBXH|BTTTT/.test(p.ministry)), proc.map((p) => p.ministry).join(' | '));

// 8. /api/ktcn-regime công khai (không token)
const handler = require('../api/dataset.js');
const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
await handler({ method: 'GET', url: '/api/dataset?resource=ktcn_regime', query: { resource: 'ktcn_regime' }, headers: {} }, res);
check('/api/ktcn-regime công khai, có NĐ 37/2026 + danh mục', res._s === 200 && res._j?.framework?.qualityDecree?.code === '37/2026/NĐ-CP' && res._j.lists.length >= 10, `${res._s} ${JSON.stringify(res._j).slice(0, 160)}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
