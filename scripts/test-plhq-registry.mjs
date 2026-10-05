// Kết nối sổ đăng ký cộng đồng oz-wiki-plhq: tra hiệu lực văn bản trong cột chính sách, gộp vào
// policyBasisReview, không đổi policyByHs. Dữ liệu giả lập — không phụ thuộc bản chụp thật.
import './test-isolate-data.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { dataPath } = require('../lib/data-paths.js');
const fixture = {
  registryVersion: '2026-10-04', syncedAt: '2026-10-04', total: 5, repo: 'https://github.com/ozvietnam/oz-wiki-plhq',
  documents: [
    { soHieu: '715/QĐ-BCT', soHieuKhac: [], ten: 'Gia hạn tự vệ phân bón', tinhTrang: 'HET_HIEU_LUC', hetHieuLucTu: null, quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '715-qd-bct-2020' },
    { soHieu: '2333/QĐ-BCT', soHieuKhac: [], ten: 'Khởi xướng điều tra CBPG gạch', tinhTrang: 'HET_HIEU_LUC', quanHeNguoc: { bi_thay_the_boi: [{ tu: '2174/QĐ-BCT' }] }, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '2333-qd-bct-2025' },
    { soHieu: '691/QĐ-BCT', soHieuKhac: [], ten: 'Tự vệ thép (chưa đối chiếu)', tinhTrang: 'HET_HIEU_LUC', quanHeNguoc: { bi_thay_the_boi: [{ tu: '9999/QĐ-BCT' }] }, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '691-qd-bct-2023' },
    { soHieu: '1182/QĐ-BCT', soHieuKhac: [], ten: 'Danh mục KTCN BCT 2021', tinhTrang: 'HET_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_B', hieuLucDaDoiChieu: false }, slug: '1182-qd-bct-2021' },
    { soHieu: '2174/QĐ-BCT', soHieuKhac: [], ten: 'Áp thuế CBPG chính thức gạch', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '2174-qd-bct-2025' },
    { soHieu: '12/2018/TT-BCT', soHieuKhac: ['12/2018/TT-BTC'], ten: 'Quy định chi tiết Luật QLNT', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '12-2018-tt-bct' },
    { soHieu: '12/2022/TT-BGTVT', soHieuKhac: [], ten: 'Danh mục GTVT cũ', tinhTrang: 'HET_HIEU_LUC', hetHieuLucTu: '2026-07-01', quanHeNguoc: { bi_thay_the_boi: [{ tu: '49/2026/TT-BXD' }] }, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '12-2022-tt-bgtvt' },
  ],
};
mkdirSync(dataPath(), { recursive: true });
writeFileSync(dataPath('plhq-registry.json'), JSON.stringify(fixture));
// Bảng mã HS ↔ văn bản (dạng data/plhq-hs-index.json sau sync-plhq)
writeFileSync(dataPath('plhq-hs-index.json'), JSON.stringify({ registryVersion: '2026-10-04', syncedAt: '2026-10-04', documents: [
  { soHieu: '28/2026/TT-BCT', ten: 'Danh mục ATTP BCT', tinhTrang: 'CON_HIEU_LUC', hieuLucTu: '2026-07-17', hetHieuLucTu: null, hieuLucDaDoiChieu: false,
    table: { file: 'danh-muc/28-2026-tt-bct.csv', source: 'https://congbao.chinhphu.vn/x', verified: false }, slug: '28-2026-tt-bct',
    rows: [
      { hs: '22030091', moTa: 'Bia đóng chai', phuLuc: 'Phụ lục', loaiTacDong: 'KIEM_TRA_ATTP', trang: 5 },
      { hs: '22030091', moTa: 'Bia lon', phuLuc: 'Phụ lục', loaiTacDong: 'KIEM_TRA_ATTP', trang: 5 },
      { hs: '22030091', moTa: 'Bia hơi', phuLuc: 'Phụ lục', loaiTacDong: 'KIEM_TRA_ATTP', trang: 5 },
      { hs: '22030091', moTa: 'Bia chai thủy tinh', phuLuc: 'Phụ lục', loaiTacDong: 'KIEM_TRA_ATTP', trang: 5 },
      { hs: '22030091', moTa: 'Bia không cồn', phuLuc: 'Phụ lục', loaiTacDong: 'KIEM_TRA_ATTP', dieuKien: 'chỉ loại dưới 0,5% cồn', trang: 5 },
      { hs: '1905', moTa: 'Bánh, bánh quy', phuLuc: 'Phụ lục', loaiTacDong: 'KIEM_TRA_ATTP', dieuKien: 'trừ loại dùng cho trẻ em', trang: 6 },
      { hs: null, moTa: 'Thực phẩm dinh dưỡng', loaiTacDong: 'KIEM_TRA_ATTP', danChieu: '15/2024/TT-BYT' },
    ] },
  { soHieu: '1182/QĐ-BCT', ten: 'Danh mục cũ', tinhTrang: 'HET_HIEU_LUC', hieuLucTu: '2021-01-01', hetHieuLucTu: '2026-07-17', hieuLucDaDoiChieu: true,
    table: { file: 'danh-muc/1182-qd-bct-2021.csv', source: null, verified: true }, slug: '1182-qd-bct-2021',
    rows: [{ hs: '190590', moTa: 'Bánh các loại', loaiTacDong: 'KIEM_TRA_ATTP' }] },
] }));

const { registryReview, lookup, khoa, trichSoHieu, docRegistry, libraryConflicts, hsListings } = require('../lib/plhq-registry.js');
const { policyBasisReview, regimeStatusForCode } = require('../lib/policy-regime.js');

let pass = 0;
let fail = 0;
const t = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); } };

t('khoá: QĐ có năm của bộ bỏ năm, sửa lỗi gõ ký hiệu', khoa('1182/2021/QĐ-BCT') === '1182/QD-BCT' && khoa('367/QĐ-BHKCN') === '367/QD-BKHCN' && khoa('10.2022/TT-BTTT') === '10/2022/TT-BTTTT');
t('khoá: QĐ-TTg giữ năm', khoa('23/2019/QĐ-TTg') === '23/2019/QD-TTG');
t('trích số hiệu từ chữ chính sách, bỏ hậu tố phụ lục', JSON.stringify(trichSoHieu('X (1182/QĐ-BCT-PL2-2021); Y (12/2022/TT-BGTVT PL1); Z (01/2024/TT-BNNPTNT M9)').map((c) => c.khoa)) === JSON.stringify(['1182/QD-BCT', '12/2022/TT-BGTVT', '01/2024/TT-BNNPTNT']));
t('tra bằng số hiệu viết khác (lỗi gõ biểu thuế)', lookup('12/2018/TT-BTC')?.soHieu === '12/2018/TT-BCT');

const r1 = registryReview('Áp thuế tự vệ đối với Phân bón (715/QĐ-BCT-2020); X (99/2099/TT-BYT)');
t('registryReview: đếm có/không có trong sổ', r1.counts.total === 2 && r1.counts.found === 1 && r1.counts.notFound === 1 && r1.counts.expired === 1, JSON.stringify(r1.counts));

const p1 = policyBasisReview('Áp thuế tự vệ đối với Phân bón (715/QĐ-BCT-2020)', { asOf: '2026-10-04' });
const i1 = p1?.items?.find((i) => i.source === 'oz-wiki-plhq');
t('văn bản hết hiệu lực trong sổ → OUTDATED_BASIS, nguồn oz-wiki-plhq', p1?.status === 'OUTDATED_BASIS' && i1?.relation === 'EXPIRED', JSON.stringify(p1));
t('chưa đối chiếu nguồn A → tin cậy MEDIUM, ghi rõ trong noteVi', i1?.confidence === 'MEDIUM' && /CHƯA đối chiếu/.test(i1.noteVi));

const p2 = policyBasisReview('Áp thuế CBPG Gạch ốp lát (2333/QĐ-BCT-2025)', { asOf: '2026-10-04' });
const i2 = p2?.items?.[0];
t('bị thay + đã đối chiếu → REPLACED, HIGH, có văn bản thay', i2?.relation === 'REPLACED' && i2.confidence === 'HIGH' && i2.replacedBy[0].code === '2174/QĐ-BCT', JSON.stringify(i2));

const p3 = policyBasisReview('Chứng nhận chất lượng ATKT (12/2022/TT-BGTVT và 62/2024/TT-BGTVT)', { asOf: '2026-10-04' });
t('không trùng cảnh báo khi quy tắc KTCN 2026 đã bắt cùng văn bản', p3.items.filter((i) => i.source === 'oz-wiki-plhq').length === 0 && p3.items.some((i) => i.source === 'hs-code-api'), JSON.stringify(p3.items.map((i) => i.id)));
t('trước ngày hết hiệu lực → không báo', !policyBasisReview('X (12/2022/TT-BGTVT)', { asOf: '2026-06-30' })?.items?.some((i) => i.source === 'oz-wiki-plhq'));
t('văn bản còn hiệu lực → không cảnh báo', policyBasisReview('Áp thuế CBPG (2174/QĐ-BCT)', { asOf: '2026-10-04' }) === null);

const p4 = policyBasisReview('Áp thuế tự vệ thép (691/QĐ-BCT-2023)', { asOf: '2026-10-04' });
t('bị thay nhưng kho cộng đồng CHƯA đối chiếu → LIKELY_REPLACED, không REPLACED', p4?.items?.[0]?.relation === 'LIKELY_REPLACED' && p4.items[0].confidence === 'MEDIUM', JSON.stringify(p4?.items));
const p5 = policyBasisReview('HH KTCN về an toàn thực phẩm (1182/QĐ-BCT-PL2-2021)', { asOf: '2026-10-04' });
t('quy tắc theo phụ lục (PL2) đã báo → sổ cộng đồng không báo trùng cùng văn bản', p5.items.length === 1 && p5.items[0].source === 'hs-code-api', JSON.stringify(p5.items.map((i) => i.id)));
t('nhận precomputed registry (không tính lại)', policyBasisReview('Áp thuế tự vệ thép (691/QĐ-BCT-2023)', { asOf: '2026-10-04', registry: null }) === null);
t('regimeStatusForCode: số hiệu trần + chữ đầy đủ PL2 → quy tắc ATTP', regimeStatusForCode('1182/2021/QĐ-BCT', { csText: 'X (1182/QĐ-BCT-PL2-2021)', asOf: '2026-10-04' })?.ruleId === 'bct-attp-1182');
t('regimeStatusForCode: PL1 → quy tắc chất lượng nhóm 2', regimeStatusForCode('1182/QĐ-BCT', { csText: 'Y (1182/QĐ-BCT-PL1-2021)', asOf: '2026-10-04' })?.ruleId === 'bct-nhom2-1182-pl1');
t('regimeStatusForCode: trước ngày hiệu lực → UPCOMING (nhất quán với policyBasisReview)', regimeStatusForCode('1182/QĐ-BCT', { csText: 'X (1182/QĐ-BCT-PL2-2021)', asOf: '2026-07-10' })?.relation === 'UPCOMING');
t('regimeStatusForCode: M1 kiểm dịch khớp, M12 không', regimeStatusForCode('01/2024/TT-BNNPTNT', { csText: 'Z (01/2024/TT-BNNPTNT M1)' })?.ruleId === 'bnnptnt-m1-kiem-dich' && regimeStatusForCode('01/2024/TT-BNNPTNT', { csText: 'Z (01/2024/TT-BNNPTNT M12)' }) === null);


// Cầu nối thư viện riêng (data/legal-docs.json) ↔ sổ cộng đồng
t('lookup bỏ hậu tố phụ lục/năm', lookup('1182/QD-BCT-PL2-2021')?.soHieu === '1182/QĐ-BCT');
t('docRegistry: thư viện ACTIVE, sổ HET_HIEU_LUC → lệch', docRegistry('1182/QD-BCT-PL1', 'ACTIVE')?.statusConflict === true);
t('docRegistry: thư viện EXPIRED, sổ HET_HIEU_LUC → khớp', docRegistry('715/QĐ-BCT', 'EXPIRED')?.statusConflict === false);
t('docRegistry: không có trong sổ → null', docRegistry('1/2099/TT-BXX', 'ACTIVE') === null);
const lech = libraryConflicts([{ code: '2174/QĐ-BCT', status: 'ACTIVE' }, { code: '12/2022/TT-BGTVT', status: 'AMENDED' }, { code: '9/2099/TT-BXX', status: 'ACTIVE' }]);
t('libraryConflicts: chỉ trả văn bản lệch', lech.length === 1 && lech[0].code === '12/2022/TT-BGTVT' && lech[0].registry.tinhTrang === 'HET_HIEU_LUC', JSON.stringify(lech));

// /api/legal-status công khai
const handler = require('../api/dataset.js');
const call = async (query) => {
  const res = { _s: 0, _j: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; }, end() { return this; } };
  await handler({ method: 'GET', url: '/api/dataset', query: { resource: 'legal_status', ...query }, headers: {} }, res);
  return res;
};
const s1 = await call({ so: '2333/QĐ-BCT, 1/2099/TT-BXX' });
t('/api/legal-status?so= công khai, tra nhiều số hiệu', s1._s === 200 && s1._j.items[0].found && s1._j.items[0].biThayTheBoi[0] === '2174/QĐ-BCT' && s1._j.items[1].found === false, JSON.stringify(s1._j).slice(0, 200));
const s2 = await call({});
t('/api/legal-status không tham số → libraryConflicts', s2._s === 200 && Array.isArray(s2._j.libraryConflicts) && s2._j.registry.registryVersion === '2026-10-04');
const s3 = await call({ resource: 'legal_docs' });
t('/api/legal-docs: mỗi văn bản có trường registry, đếm lệch', s3._s === 200 && s3._j.items.every((d) => 'registry' in d) && typeof s3._j.registryConflicts === 'number');


// Lớp mã HS ↔ văn bản
const l1 = hsListings('19059090', { asOf: '2026-10-04' });
t('hsListings: khớp theo tiền tố 6 và 4 số, giữ dieuKien', l1.length === 2 && l1.some((x) => x.match.level === 'HS4' && x.dieuKien === 'trừ loại dùng cho trẻ em' && x.active) && l1.some((x) => x.match.level === 'HS6' && x.soHieu === '1182/QĐ-BCT'));
t('hsListings: danh mục đã hết hiệu lực → active=false', l1.find((x) => x.soHieu === '1182/QĐ-BCT').active === false);
t('hsListings: trước ngày hiệu lực → active=false', hsListings('22030091', { asOf: '2026-07-01' })[0].active === false && hsListings('22030091', { asOf: '2026-07-17' })[0].active === true);
const g = hsListings('22030091');
t('hsListings: gộp dòng cùng văn bản + phụ lục + loại + điều kiện; tách khi điều kiện khác', g.length === 2
  && g[0].soDong === 4 && g[0].moTa === 'Bia đóng chai' && g[0].moTaMau.length === 3 && g[1].soDong === 1 && g[1].dieuKien === 'chỉ loại dưới 0,5% cồn', JSON.stringify(g.map((x) => [x.soDong, x.dieuKien])));
t('hsListings: khớp đúng 8 số, không khớp mã khác', hsListings('22030091')[0].match.level === 'HS8' && hsListings('22030099').length === 0);
t('hsListings: dòng dẫn chiếu (không mã) không khớp mã nào; đầu vào sai → []', hsListings('1905').length === 0 && !hsListings('19059090').some((x) => x.danChieu));
const { mapTaxRecord } = require('../lib/tax-mapper.js');
const mapped = mapTaxRecord({ hs: '22030091', vn: '- - Bia', cs: '' });
t('/api/tax: mã trong danh mục có hsListings; mã không có thì không có trường', mapped.hsListings?.[0]?.soHieu === '28/2026/TT-BCT' && !('hsListings' in mapTaxRecord({ hs: '01012100', vn: 'x', cs: '' })));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
