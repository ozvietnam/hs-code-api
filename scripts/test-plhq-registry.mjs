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
    { soHieu: '2174/QĐ-BCT', soHieuKhac: [], ten: 'Áp thuế CBPG chính thức gạch', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: true }, slug: '2174-qd-bct-2025' },
    { soHieu: '12/2018/TT-BCT', soHieuKhac: ['12/2018/TT-BTC'], ten: 'Quy định chi tiết Luật QLNT', tinhTrang: 'CON_HIEU_LUC', quanHeNguoc: {}, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '12-2018-tt-bct' },
    { soHieu: '12/2022/TT-BGTVT', soHieuKhac: [], ten: 'Danh mục GTVT cũ', tinhTrang: 'HET_HIEU_LUC', hetHieuLucTu: '2026-07-01', quanHeNguoc: { bi_thay_the_boi: [{ tu: '49/2026/TT-BXD' }] }, xacMinh: { muc: 'NGUON_A', hieuLucDaDoiChieu: false }, slug: '12-2022-tt-bgtvt' },
  ],
};
mkdirSync(dataPath(), { recursive: true });
writeFileSync(dataPath('plhq-registry.json'), JSON.stringify(fixture));

const { registryReview, lookup, khoa, trichSoHieu } = require('../lib/plhq-registry.js');
const { policyBasisReview } = require('../lib/policy-regime.js');

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
