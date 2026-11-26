// Kết nối sổ đăng ký cộng đồng oz-wiki-plhq: tra hiệu lực văn bản trong cột chính sách, gộp vào
// policyBasisReview, không đổi policyByHs. Dữ liệu giả lập — không phụ thuộc bản chụp thật.
import './test-isolate-data.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { rutGon, rutGonHsIndex, rutGonDieuKhoan, kiemTraManifest, GHI_NGUON_CC_BY } from './sync-plhq.mjs';

const require = createRequire(import.meta.url);
const { dataPath } = require('../lib/data-paths.js');
const fixture = {
  registryVersion: '2026-10-04', syncedAt: '2026-10-04', total: 5, repo: 'https://github.com/ozvietnam/oz-wiki-plhq',
  documents: [
    { soHieu: '715/QĐ-BCT', soHieuKhac: [], ten: 'Gia hạn tự vệ phân bón', tinhTrang: 'HET_HIEU_LUC', hetHieuLucTu: null, quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '715-qd-bct-2020' },
    { soHieu: '2333/QĐ-BCT', soHieuKhac: [], ten: 'Khởi xướng điều tra CBPG gạch', tinhTrang: 'HET_HIEU_LUC', quanHeNguoc: { bi_thay_the_boi: [{ tu: '2174/QĐ-BCT' }] }, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '2333-qd-bct-2025' },
    { soHieu: '691/QĐ-BCT', soHieuKhac: [], ten: 'Tự vệ thép (chưa đối chiếu)', tinhTrang: 'HET_HIEU_LUC', quanHeNguoc: { bi_thay_the_boi: [{ tu: '9999/QĐ-BCT' }] }, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '691-qd-bct-2023' },
    { soHieu: '1182/QĐ-BCT', loai: 'QUYET_DINH', soHieuKhac: [], ten: 'Danh mục KTCN BCT 2021', tinhTrang: 'HET_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_B', hieuLucDaDoiChieu: false }, slug: '1182-qd-bct-2021' },
    { soHieu: '2174/QĐ-BCT', loai: 'QUYET_DINH', soHieuKhac: [], ten: 'Áp thuế CBPG chính thức gạch', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '2174-qd-bct-2025' },
    { soHieu: '12/2018/TT-BCT', soHieuKhac: ['12/2018/TT-BTC'], ten: 'Quy định chi tiết Luật QLNT', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '12-2018-tt-bct' },
    { soHieu: '12/2022/TT-BGTVT', soHieuKhac: [], ten: 'Danh mục GTVT cũ', tinhTrang: 'HET_HIEU_LUC', hetHieuLucTu: '2026-07-01', quanHeNguoc: { bi_thay_the_boi: [{ tu: '49/2026/TT-BXD' }] }, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '12-2022-tt-bgtvt' },
    { soHieu: '55/2010/QH12', loai: 'LUAT', soHieuKhac: [], ten: 'Luật An toàn thực phẩm', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '55-2010-qh12' },
    { soHieu: '101/TB-TCHQ/2025', loai: 'THONG_BAO', soHieuKhac: [], ten: 'V/v kiểm tra ATTP lô hàng thực phẩm', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '101-tb-tchq-2025' },
    { soHieu: '217/2025/NĐ-CP', loai: 'NGHI_DINH', soHieuKhac: [], ten: 'Quy định về hoạt động kiểm tra chuyên ngành', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '217-2025-nd-cp' },
    { soHieu: '102/TB-TCHQ/2025', loai: 'THONG_BAO', soHieuKhac: [], ten: 'V/v hàng hoá KTCN nhập khẩu', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '102-tb-tchq-2025' },
    { soHieu: '10/2018/NĐ-CP', loai: 'NGHI_DINH', soHieuKhac: [], ten: 'Quy định chi tiết một số điều về chống bán phá giá', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '10-2018-nd-cp' },
    { soHieu: '103/TB-TCHQ/2025', loai: 'THONG_BAO', soHieuKhac: [], ten: 'V/v thuế CBPG thép nhập khẩu', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '103-tb-tchq-2025' },
    { soHieu: '15/2012/QH13', loai: 'LUAT', soHieuKhac: [], ten: 'Luật Xử lý vi phạm hành chính', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '15-2012-qh13' },
    { soHieu: '104/TB-TCHQ/2025', loai: 'THONG_BAO', soHieuKhac: [], ten: 'V/v xử lý VPHC trong lĩnh vực hải quan', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '104-tb-tchq-2025' },
    { soHieu: '2123/QĐ-CHQ', loai: 'QUYET_DINH', soHieuKhac: [], ten: 'Ban hành Quy trình Kiểm tra sau thông quan và quản lý chế độ ưu tiên', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '2123-qd-chq' },
    { soHieu: '105/TB-TCHQ/2025', loai: 'THONG_BAO', soHieuKhac: [], ten: 'V/v kế hoạch KSTQ năm 2025', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '105-tb-tchq-2025' },
    { soHieu: '11/2017/TT-BCT', loai: 'THONG_TU', soHieuKhac: [], ten: 'Quy định về hoạt động tạm nhập, tái xuất; tạm xuất, tái nhập và chuyển khẩu', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '11-2017-tt-bct' },
    { soHieu: '106/TB-TCHQ/2025', loai: 'THONG_BAO', soHieuKhac: [], ten: 'V/v hàng TNTX quá hạn', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '106-tb-tchq-2025' },
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

const { registryReview, lookup, khoa, trichSoHieu, docRegistry, libraryConflicts, hsListings, searchByTen, VIET_TAT_TEN } = require('../lib/plhq-registry.js');
const { policyBasisReview, regimeStatusForCode } = require('../lib/policy-regime.js');

let pass = 0;
let fail = 0;
const t = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); } };

t('khoá: QĐ có năm của bộ bỏ năm, sửa lỗi gõ ký hiệu', khoa('1182/2021/QĐ-BCT') === '1182/QD-BCT' && khoa('367/QĐ-BHKCN') === '367/QD-BKHCN' && khoa('10.2022/TT-BTTT') === '10/2022/TT-BTTTT');
t('khoá: QĐ-TTg giữ năm', khoa('23/2019/QĐ-TTg') === '23/2019/QD-TTG');
t('trích số hiệu từ chữ chính sách, bỏ hậu tố phụ lục', JSON.stringify(trichSoHieu('X (1182/QĐ-BCT-PL2-2021); Y (12/2022/TT-BGTVT PL1); Z (01/2024/TT-BNNPTNT M9)').map((c) => c.khoa)) === JSON.stringify(['1182/QD-BCT', '12/2022/TT-BGTVT', '01/2024/TT-BNNPTNT']));
t('tra bằng số hiệu viết khác (lỗi gõ biểu thuế)', lookup('12/2018/TT-BTC')?.soHieu === '12/2018/TT-BCT');
t('khoá: tên bộ mới sau sáp nhập BNNMT → BNNPTNT (#237)', khoa('01/2024/TT-BNNMT') === '01/2024/TT-BNNPTNT' && khoa('15/2020/TT-BNNMT') === '15/2020/TT-BNNPTNT');

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

// Từ điển viết tắt XNK/hải quan (25 mục đồng bộ oz-wiki-plhq) + ưu tiên văn bản nguồn chính
const KY_VONG_25 = [
  'gtgt', 'ktcn', 'attp', 'cbpg', 'pvtm', 'co', 'xnk', 'hq', 'ttdb', 'bvmt',
  'tntx', 'dncx', 'qlrr', 'kstq', 'gcn', 'qcvn', 'tcvn', 'vbhn', 'vphc', 'mfn',
  'acfta', 'evfta', 'rcep', 'kd', 'ktcl',
];
t('VIET_TAT_TEN có đủ 25 viết tắt XNK/hải quan hợp lệ',
  Object.keys(VIET_TAT_TEN).length === 25
  && KY_VONG_25.every((k) => typeof VIET_TAT_TEN[k] === 'string' && VIET_TAT_TEN[k].trim().length > 0),
  JSON.stringify(Object.keys(VIET_TAT_TEN)));

const CHUAN_6 = [
  ['attp', '55/2010/QH12', '101/TB-TCHQ/2025'],
  ['ktcn', '217/2025/NĐ-CP', '102/TB-TCHQ/2025'],
  ['cbpg', '10/2018/NĐ-CP', '103/TB-TCHQ/2025'],
  ['vphc', '15/2012/QH13', '104/TB-TCHQ/2025'],
  ['kstq', '2123/QĐ-CHQ', '105/TB-TCHQ/2025'],
  ['tntx', '11/2017/TT-BCT', '106/TB-TCHQ/2025'],
];
for (const [q, soChinh, soTb] of CHUAN_6) {
  const kq = searchByTen(q, 5);
  const idxChinh = kq.findIndex((x) => x.soHieu === soChinh);
  const idxTb = kq.findIndex((x) => x.soHieu === soTb);
  t(`searchByTen('${q}') khớp nguồn chính ${soChinh} trước THONG_BAO ${soTb}`,
    idxChinh === 0 && (idxTb === -1 || idxChinh < idxTb),
    JSON.stringify(kq.map((x) => x.soHieu)));
}
t('searchByTen từ khoá quá ngắn (<3 ký tự) hoặc không khớp trả []',
  searchByTen('ab').length === 0 && searchByTen('khongtonai999').length === 0);

// rutGonDieuKhoan (dist/dieu-khoan.json 1.5.0) & chuỗi ghi nguồn CC BY 4.0
t('GHI_NGUON_CC_BY đúng chuẩn W4',
  GHI_NGUON_CC_BY === 'Nguồn: oz-wiki-plhq — https://github.com/ozvietnam/oz-wiki-plhq (CC BY 4.0)');

const dkSample = {
  phien_ban: '2026-11-22',
  luoc_do_phien_ban: '1.5.0',
  giay_phep: 'CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/',
  nguyen_van_nguon_a: [
    {
      so_hieu: '85/2026/TT-BTC',
      slug: '85-2026-tt-btc',
      ten: 'Thông tư hướng dẫn phân loại hàng hoá',
      tinh_trang: 'CON_HIEU_LUC',
      hieu_luc_tu: '2026-09-15',
      het_hieu_luc_tu: null,
      hieu_luc_da_doi_chieu: true,
      nguon_a: 'https://congbao.chinhphu.vn/85-2026-tt-btc.pdf',
      tang_tin_cay: 'NGUYEN_VAN_NGUON_A',
      dieu_khoan: [
        { dieu: 4, khoan: 1, diem: 'a', noi_dung: 'Một mặt hàng có một mã số duy nhất.', trang_pdf: 3, sha256_pdf: 'abc123' },
      ],
    },
    {
      so_hieu: '99/2026/TT-FAKE',
      slug: '99-2026-tt-fake',
      ten: 'Mục lẫn tầng tóm tắt nháp',
      tinh_trang: 'CON_HIEU_LUC',
      tang_tin_cay: 'TOM_TAT_NHAP',
      dieu_khoan: [{ dieu: 1, noi_dung: 'Tóm tắt nháp không được phép lọt' }],
    },
  ],
  tom_tat_nhap: [
    {
      so_hieu: '01/2026/TT-NHAP',
      slug: '01-2026-tt-nhap',
      tinh_trang: 'CON_HIEU_LUC',
      tang_tin_cay: 'TOM_TAT_NHAP',
      da_soat: false,
      dieu_khoan: [{ dieu: 'Điều 1', tom_tat: 'Không phải nguồn A' }],
    },
  ],
};
const dkOut = rutGonDieuKhoan(dkSample);
t('rutGonDieuKhoan: chỉ giữ NGUYEN_VAN_NGUON_A và gạt bỏ hoàn toàn TOM_TAT_NHAP',
  dkOut.length === 1
  && dkOut[0].soHieu === '85/2026/TT-BTC'
  && dkOut[0].slug === '85-2026-tt-btc'
  && dkOut[0].ten === 'Thông tư hướng dẫn phân loại hàng hoá'
  && dkOut[0].tinhTrang === 'CON_HIEU_LUC'
  && dkOut[0].hieuLucTu === '2026-09-15'
  && dkOut[0].hetHieuLucTu === null
  && dkOut[0].hieuLucDaDoiChieu === true
  && dkOut[0].nguonA === 'https://congbao.chinhphu.vn/85-2026-tt-btc.pdf'
  && dkOut[0].tangTinCay === 'NGUYEN_VAN_NGUON_A'
  && dkOut[0].dieuKhoan.length === 1
  && dkOut[0].dieuKhoan[0].dieu === 4
  && dkOut[0].dieuKhoan[0].khoan === 1
  && dkOut[0].dieuKhoan[0].diem === 'a'
  && dkOut[0].dieuKhoan[0].noiDung === 'Một mặt hàng có một mã số duy nhất.'
  && dkOut[0].dieuKhoan[0].trangPdf === 3
  && dkOut[0].dieuKhoan[0].sha256Pdf === 'abc123',
  JSON.stringify(dkOut));

const nemLoi = (fn) => { try { fn(); return false; } catch { return true; } };
t('rutGonDieuKhoan: báo lỗi khi thiếu nguyen_van_nguon_a hoặc lệch major lược đồ',
  nemLoi(() => rutGonDieuKhoan(null))
  && nemLoi(() => rutGonDieuKhoan({}))
  && nemLoi(() => rutGonDieuKhoan({ tom_tat_nhap: [] }))
  && nemLoi(() => rutGonDieuKhoan({ luoc_do_phien_ban: '2.0.0', nguyen_van_nguon_a: [] })));

// Lược đồ 1.7.0: kiemTraManifest (SHA-256 + bytes + lop-kho@1) & id / van / phienBanAhtn / trangThaiDieu / xacMinh.chan
import { createHash } from 'crypto';
const regText = JSON.stringify({
  luoc_do_phien_ban: '1.7.0',
  lop_du_lieu: 'LUAT',
  phien_ban: '2026-11-26',
  van_ban: [
    {
      id: 'vb:45-2024-tt-bct',
      van: 'a'.repeat(64),
      so_hieu: '45/2024/TT-BCT',
      ten: 'Test lệch số hiệu',
      loai: 'THONG_TU',
      co_quan: 'BCT',
      tinh_trang: 'CON_HIEU_LUC',
      slug: '45-2024-tt-bct',
      xac_minh: {
        muc: 'NGUON_A',
        hieu_luc_da_doi_chieu: false,
        ngay: '2026-10-04',
        chan: { ma: 'SO_HIEU_LECH', viec_tiep: 'issue #1987', ngay: '2026-10-04' },
      },
    },
    {
      so_hieu: '11/2018/TT-BTTTT',
      ten: 'Tương thích ngược 1.6.0',
      loai: 'THONG_TU',
      co_quan: 'BTTTT',
      tinh_trang: 'CON_HIEU_LUC',
      slug: '11-2018-tt-btttt',
    },
  ],
});
const shaOf = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const manifestOk = {
  luoc_do_phien_ban: '1.7.0',
  chuan_lop_du_lieu: 'lop-kho@1',
  tep: {
    'registry.json': { sha256: shaOf(regText), bytes: Buffer.byteLength(regText, 'utf8'), lop_du_lieu: 'LUAT' },
    'hs-index.json': { sha256: '0'.repeat(64), bytes: 2, lop_du_lieu: 'LUAT' },
    'dieu-khoan.json': {
      sha256: '0'.repeat(64), bytes: 2, lop_du_lieu: 'LUAT',
      truong_lan: { nguyen_van_nguon_a: 'LUAT', tom_tat_nhap: 'BO_TRO' },
    },
    'hs-index-theo-ma.json': {
      sha256: '0'.repeat(64), bytes: 2, lop_du_lieu: 'LUAT',
      truong_lan: { ma: 'LUAT', canh_bao_ma: 'KY_THUAT', anh_xa_ahtn_cu: 'BO_TRO', tien_le_tb_tchq: 'TIEN_LE' },
    },
  },
};
const mfRes = kiemTraManifest(manifestOk, { 'registry.json': regText });
t('kiemTraManifest: khớp SHA-256, bytes, lược đồ 1.7.0 và chuẩn lop-kho@1',
  mfRes.schemaVersion === '1.7.0' && mfRes.chuanLopDuLieu === 'lop-kho@1' && mfRes.daKiem.includes('registry.json'),
  JSON.stringify(mfRes));

t('kiemTraManifest: chặn lệch SHA-256, lệch bytes, sai chuẩn lớp hoặc lệch major 2.0.0',
  nemLoi(() => kiemTraManifest(manifestOk, { 'registry.json': `${regText} ` }))
  && nemLoi(() => kiemTraManifest({ ...manifestOk, chuan_lop_du_lieu: 'lop-kho@2' }, {}))
  && nemLoi(() => kiemTraManifest({ ...manifestOk, luoc_do_phien_ban: '2.0.0' }, {}))
  && nemLoi(() => kiemTraManifest({
    ...manifestOk,
    tep: { ...manifestOk.tep, 'registry.json': { ...manifestOk.tep['registry.json'], lop_du_lieu: 'TIEN_LE' } },
  }, {})));

const rg170 = rutGon(JSON.parse(regText));
t('rutGon 1.7.0: giữ id, van, xacMinh.chan và tương thích ngược 1.6.0',
  rg170[0].id === 'vb:45-2024-tt-bct'
  && rg170[0].van === 'a'.repeat(64)
  && rg170[0].xacMinh.chan?.ma === 'SO_HIEU_LECH'
  && rg170[1].id === 'vb:11-2018-tt-btttt'
  && rg170[1].van === null
  && rg170[1].xacMinh.chan === null
  && nemLoi(() => rutGon({ luoc_do_phien_ban: '2.0.0', van_ban: [] })),
  JSON.stringify(rg170));

const hs170 = rutGonHsIndex({
  luoc_do_phien_ban: '1.7.0',
  van_ban: [{
    so_hieu: '45/2023/TT-BCT',
    slug: '45-2023-tt-bct',
    ten: 'Khoáng sản XK',
    tinh_trang: 'CON_HIEU_LUC',
    bang: { tep: 'danh-muc/45-2023-tt-bct.csv', phien_ban_ahtn: 'AHTN_2022', da_doi_chieu: true },
    dong: [{ ma_hs: '26140010', nut_bieu: 'bieu:26140010', van: 'b'.repeat(64), mo_ta: 'Inmenit', loai_tac_dong: 'KHAC' }],
  }],
});
t('rutGonHsIndex 1.7.0: giữ table.phienBanAhtn, rows[].nutBieu và rows[].van',
  hs170[0].table.phienBanAhtn === 'AHTN_2022'
  && hs170[0].rows[0].nutBieu === 'bieu:26140010'
  && hs170[0].rows[0].van === 'b'.repeat(64),
  JSON.stringify(hs170));

const dk170 = rutGonDieuKhoan({
  ...dkSample,
  luoc_do_phien_ban: '1.7.0',
  nguyen_van_nguon_a: [{
    ...dkSample.nguyen_van_nguon_a[0],
    dieu_khoan: [{
      id: 'vb:85-2026-tt-btc:d:4:k:1:dm:a',
      van: 'c'.repeat(64),
      dieu: 4,
      khoan: 1,
      diem: 'a',
      noi_dung: 'Một mặt hàng có một mã số duy nhất.',
      trang_thai_dieu: 'DA_SUA_DOI',
      lich_su_tac_dong: [{ qh: 'sua_doi', tu: '99/2027/TT-BTC' }],
    }],
  }],
});
t('rutGonDieuKhoan 1.7.0: giữ id, van, trangThaiDieu và lichSuTacDong',
  dk170[0].dieuKhoan[0].id === 'vb:85-2026-tt-btc:d:4:k:1:dm:a'
  && dk170[0].dieuKhoan[0].van === 'c'.repeat(64)
  && dk170[0].dieuKhoan[0].trangThaiDieu === 'DA_SUA_DOI'
  && dk170[0].dieuKhoan[0].lichSuTacDong.length === 1,
  JSON.stringify(dk170[0].dieuKhoan[0]));

t('rutGonDieuKhoan mặc định trangThaiDieu = NGUYEN_BAN khi thiếu trường',
  dkOut[0].dieuKhoan[0].trangThaiDieu === 'NGUYEN_BAN',
  JSON.stringify(dkOut[0].dieuKhoan[0].trangThaiDieu));

// Chứng minh main() dừng ghi khi manifest SHA-256 lệch (không ghi data/ khi verify fail)
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname as _dirname } from 'path';
import { fileURLToPath as _fileURLToPath } from 'url';
const _repoRoot = join(_dirname(_fileURLToPath(import.meta.url)), '..');
const tmpMfDir = mkdtempSync(join(tmpdir(), 'plhq-mf-fail-'));
try {
  writeFileSync(join(tmpMfDir, 'registry.json'), regText);
  writeFileSync(join(tmpMfDir, 'manifest.json'), JSON.stringify({
    ...manifestOk,
    tep: { ...manifestOk.tep, 'registry.json': { sha256: 'f'.repeat(64), bytes: Buffer.byteLength(regText, 'utf8'), lop_du_lieu: 'LUAT' } },
  }));
  let mfExit = 0;
  let mfOut = '';
  try {
    mfOut = execFileSync(process.execPath, [
      'scripts/sync-plhq.mjs', '--check',
      '--from', join(tmpMfDir, 'registry.json'),
      '--manifest-from', join(tmpMfDir, 'manifest.json'),
    ], { cwd: _repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    mfExit = e.status ?? 1;
    mfOut = `${e.stdout || ''}\n${e.stderr || ''}`;
  }
  t('sync-plhq.mjs dừng ghi và thoát mã != 0 khi manifest SHA-256 lệch',
    mfExit !== 0 && mfOut.includes('CHANGED=false') && mfOut.includes('Dừng ghi bản chụp'),
    JSON.stringify({ mfExit, mfOut }));
} finally {
  rmSync(tmpMfDir, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
