#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * K2 ĐỘC LẬP của soát tờ khai (lib/declaration-check.js#kiemK2DocLap, #kiemK2CoDocLap) + mã cạnh tranh / dữ kiện lật lấy từ
 * hồ sơ ranh giới (lib/ho-so/soat.js#maCanhTranhCua, soat({chiLuat})).
 *
 * Lỗi được sửa: K2 kiểm mã bằng cách gọi lại ĐÚNG bộ phân loại (phanLoaiK2 → lib/classify.js) ⇒ máy tự chấm bài của mình.
 * Bất biến khoá ở đây:
 *  - Có nguồn tất định kết luận (ranh giới đã duyệt đọc chỉ-luật, bảng dòng 8 số / cổng sổ tay, tiền lệ TB-TCHQ) ⇒ K2 trả mục
 *    `docLap: true` và KHÔNG gọi bộ phân loại; không có ⇒ đường cũ, mục của bộ phân loại mang `docLap: false` + `ghiChuDocLap`.
 *  - Lượt không kiemMa vẫn 0 lượt LLM, CHUA_KIEM_MA giữ nguyên, chỉ thêm mục K2 tất định.
 *  - Hợp đồng lùi tương thích: chỉ THÊM trường tuỳ chọn (docLap, ghiChuDocLap, maCanhTranh, k2DocLap, duKienCanHoi); đủ 7 nhóm.
 *  - Mục độc lập tối đa CANH_BAO (kể cả HS_K2_LOI=on), không gắn nhãn GIR; mã cạnh tranh hiện cả hai chiều thuế.
 *  - MẶC ĐỊNH TẮT: không đặt HS_K2_DOC_LAP (hoặc off) ⇒ y như trước, không trường mới nào; mọi ca còn lại chạy với HS_K2_DOC_LAP=on.
 * Ca lấy từ dữ liệu CÔNG KHAI của repo (bộ đề lát 1, ví dụ của test sổ tay). Bộ phân loại là bản GIẢ đếm lượt — không mạng, không LLM.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['HS_HO_SO', 'HS_HO_SO_THU_CALLERS', 'HS_K2_LOI', 'HS_SO_TAY', 'HS_SO_TAY_LOAI_TRU', 'HS_DATABASE_URL', 'HS_K2_DOC_LAP']) delete process.env[k];
process.env.HS_ACCESS_LOG = '0';
console.error = () => {}; console.warn = () => {};
let fetchCalls = 0; let llmCalls = 0; let clsCalls = 0;
globalThis.fetch = async () => { fetchCalls += 1; throw new Error('test: không được gọi mạng'); };
const llmTier = require('../lib/llm-tier.js');
for (const k of Object.keys(llmTier)) if (/^callLLM/.test(k) && typeof llmTier[k] === 'function') llmTier[k] = async () => { llmCalls += 1; throw new Error('test: không được gọi LLM'); };
const cls = require('../lib/classify.js');
let maGia = null; // mã mà bộ phân loại GIẢ "chọn" — luôn trùng mã khai: mô phỏng đúng tình huống máy tự chấm bài mình
cls.classify = async () => { clsCalls += 1; return { status: 'RESOLVED_BY_LLM', results: [{ hs: maGia, confidence: 90, reason: 'giả' }], girRulesApplied: [], canCuPhapLy: null, missing: [] }; };

const DC = require('../lib/declaration-check.js');
const S = require('../lib/ho-so/soat.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 700)}` : ''}`); } };
async function soat(maHs, moTa, { kiemMa = true, them = {} } = {}) {
  maGia = maHs; const truoc = clsCalls;
  const kq = await DC.runDeclarationCheck({ dongHang: [{ stt: 1, maHs, moTa, xuatXu: 'CN', ...them }], ...(kiemMa ? { kiemMa: true } : {}) }, {});
  const d = kq.dong[0];
  return { kq, d, k2: d.kiem.filter((m) => m.nhom === 'K2'), goi: clsCalls - truoc };
}
const tom = (r) => r.k2.map((m) => `${m.trangThai}:${m.ma}:${m.docLap}`);
const muc = (r, ma) => r.k2.find((m) => m.ma === ma);

const NUT_VAN = 'Nút vặn điều chỉnh dây giày bằng nhựa, xoay để siết/nới dây, model Li2 L Eyestay Dial A, mới 100%'; // lát 1, L1-392690-01 (6317/TB-TCHQ → 3926.90.93)
const INVERTER = 'Bộ nghịch lưu (inverter) hòa lưới điện mặt trời 5kW, 1 pha, mới 100%';
const MAY_XAY = 'Máy xay sinh tố cầm tay dùng trong gia đình, 300W, 220V, hiệu ABC, mới 100%';

// ── 1. Lỗi tự chấm: mã sai mà bộ phân loại "đồng ý" ─────────────────────────────────────────────────────────────────────
delete process.env.HS_K2_DOC_LAP; // mặc định (không đặt cờ) = TẮT
let r = await soat('39269099', NUT_VAN);
check('TRƯỚC (mặc định, không đặt HS_K2_DOC_LAP): mã sai 3926.90.99, bộ phân loại chọn lại đúng mã đó ⇒ K2 "MA_KHOP" DAT, gọi bộ phân loại 1 lượt', r.goi === 1 && muc(r, 'MA_KHOP')?.trangThai === 'DAT', tom(r));
check('TRƯỚC: không mục nào mang trường mới (docLap, ghiChuDocLap, maCanhTranh), dòng không có k2DocLap', r.d.kiem.every((m) => !('docLap' in m) && !('ghiChuDocLap' in m) && !('maCanhTranh' in m)) && !('k2DocLap' in r.d) && !('duKienCanHoi' in r.d));
process.env.HS_K2_DOC_LAP = 'on';
r = await soat('39269099', NUT_VAN);
const tl = muc(r, 'DOC_LAP_TIEN_LE_CUNG_LOAI_HANG_MA_KHAC');
check('SAU: cùng dòng đó ⇒ K2 cảnh báo bằng tiền lệ TB-TCHQ, KHÔNG gọi bộ phân loại, không còn "MA_KHOP"', r.goi === 0 && tl?.trangThai === 'CANH_BAO' && tl.docLap === true && !muc(r, 'MA_KHOP') && r.d.k2DocLap === true, tom(r));
check('SAU: mục tiền lệ nêu số thông báo, mã cạnh tranh 3926.90.93 + dữ kiện lật', /6317\/TB-TCHQ/.test(tl.evidence.join(' ')) && tl.maCanhTranh[0].maHs === '39269093' && tl.maCanhTranh[0].duKienLat.fact === 'tenLoai' && tl.maCanhTranh[0].duKienLat.trangThai === 'DANG_TRAI' && tl.maDeNghiXem.includes('39269093'), tl.maCanhTranh);
r = await soat('39269093', NUT_VAN);
check('SAU: mã ĐÚNG theo chính các thông báo đó ⇒ không có cảnh báo tiền lệ', !muc(r, 'DOC_LAP_TIEN_LE_CUNG_LOAI_HANG_MA_KHAC'), tom(r));

// ── 2. Không nguồn tất định nào kết luận ⇒ đường cũ, gắn nhãn "không độc lập" ────────────────────────────────────────────
r = await soat('85094000', MAY_XAY);
const khop = muc(r, 'MA_KHOP');
check('không nguồn tất định kết luận ⇒ gọi bộ phân loại đúng 1 lượt, dòng k2DocLap = false', r.goi === 1 && r.d.k2DocLap === false, [r.goi, tom(r)]);
check('mục của bộ phân loại mang docLap: false + ghiChuDocLap "Không độc lập…" (nội dung, trạng thái, basis giữ nguyên)', khop && khop.trangThai === 'DAT' && khop.basis === 'LLM_ASSERTED' && khop.docLap === false && /^Không độc lập/.test(khop.ghiChuDocLap) && /MFN|trùng mã hệ thống/.test(khop.noiDung), khop);
check('girRulesApplied / canCuPhapLy / ketQuaPhanLoai của đường cũ vẫn đi nguyên văn', Array.isArray(r.d.girRulesApplied) && r.d.canCuPhapLy === null && r.d.ketQuaPhanLoai.results[0].hs === '85094000');

// ── 3. Bảng điều kiện dòng 8 số của sổ tay ───────────────────────────────────────────────────────────────────────────────
r = await soat('85044090', INVERTER);
const chot = muc(r, 'DOC_LAP_SO_TAY_CHOT_DONG_KHAC');
check('bảng sổ tay chốt dòng KHÁC mã khai ("Loại khác" 8504.40.90 ↔ bộ nghịch lưu 8504.40.40) ⇒ CANH_BAO RULE_TABLE, có câu trích, không gọi bộ phân loại', r.goi === 0 && chot?.trangThai === 'CANH_BAO' && chot.basis === 'RULE_TABLE' && chot.docLap === true && chot.evidence.length > 0 && chot.maCanhTranh[0].maHs === '85044040' && typeof chot.maCanhTranh[0].chenhMfn === 'number', chot);
r = await soat('85044040', INVERTER);
check('bảng sổ tay chốt ĐÚNG mã khai ⇒ K2 DAT độc lập (DOC_LAP_SO_TAY_CHOT_DUNG_DONG), không cảnh báo K2, không gọi bộ phân loại', r.goi === 0 && muc(r, 'DOC_LAP_SO_TAY_CHOT_DUNG_DONG')?.trangThai === 'DAT' && r.k2.every((m) => m.trangThai === 'DAT') && r.d.k2DocLap === true, tom(r));

// ── 4. Cổng sổ tay: loại trừ, ngưỡng số, bộ phận ────────────────────────────────────────────────────────────────────────
r = await soat('85098090', 'Quạt thông gió gia dụng 30W, lắp âm trần, mới 100%');
const lt = muc(r, 'DOC_LAP_SO_TAY_LOAI_TRU');
check('chú giải 85.09 loại trừ quạt thông gió sang 84.14 ⇒ CANH_BAO kèm câu trích + nhóm đích là mã cạnh tranh', lt?.trangThai === 'CANH_BAO' && lt.basis === 'HEURISTIC' && /84\.14/.test(lt.evidence.join(' ')) && lt.maCanhTranh[0].maHs === '8414' && r.goi === 0, tom(r));
r = await soat('85098090', 'Máy khuếch tán tinh dầu dùng điện, trọng lượng 25 kg');
check('25 kg trái ngưỡng ≤ 20 kg của nhóm 85.09 ⇒ DOC_LAP_SO_TAY_NGUONG (RULE_TABLE)', muc(r, 'DOC_LAP_SO_TAY_NGUONG')?.basis === 'RULE_TABLE' && r.goi === 0, tom(r));
r = await soat('85098090', 'Máy khuếch tán tinh dầu dùng điện, trọng lượng 1,2 kg');
check('1,2 kg trong ngưỡng ⇒ không có mục ngưỡng', !muc(r, 'DOC_LAP_SO_TAY_NGUONG'), tom(r));
r = await soat('85094000', 'Bộ phận của máy xay sinh tố: lưỡi dao bằng thép không gỉ');
check('mô tả nói bộ phận mà mã khai là máy hoàn chỉnh ⇒ DOC_LAP_SO_TAY_BO_PHAN, chỉ dòng bộ phận', muc(r, 'DOC_LAP_SO_TAY_BO_PHAN')?.maCanhTranh?.[0]?.maHs.startsWith('8509') && r.goi === 0, tom(r));
r = await soat('85099090', 'Bộ phận của máy xay sinh tố: lưỡi dao bằng thép không gỉ');
check('bộ phận khai đúng dòng bộ phận ⇒ không có mục bộ phận', !muc(r, 'DOC_LAP_SO_TAY_BO_PHAN'), tom(r));

// ── 5. Hồ sơ ranh giới đọc CHỈ BẰNG LUẬT (cờ HS_HO_SO không bật) + mã cạnh tranh, dữ kiện lật ──────────────────────────
// Lát 1, L1-732690-01 "đổi anh em": mô tả là hộp đựng thuốc lá điếu mà khai "Loại khác" 7326.90.99.
r = await soat('73269099', 'Hộp đựng thuốc lá điếu bằng thép không gỉ 201, KT 107x107x55mm, 0,08kg/cái, mới 100%');
let mt = muc(r, 'HO_SO_MAU_THUAN');
check('ranh giới đã duyệt, đọc chỉ-luật ⇒ HO_SO_MAU_THUAN docLap, không lượt LLM, không gọi bộ phân loại, dù HS_HO_SO tắt', mt?.trangThai === 'CANH_BAO' && mt.docLap === true && mt.hoSoMeta.chiLuat === true && r.goi === 0 && llmCalls === 0, tom(r));
check('mã cạnh tranh lấy từ maTroToi: 7326.90.91 thuế CAO hơn (+5 điểm), dữ kiện lật DANG_TRAI có câu trích từ mô tả', mt.maCanhTranh.length === 1 && mt.maCanhTranh[0].maHs === '73269091' && mt.maCanhTranh[0].chenhMfn === 5 && mt.maCanhTranh[0].duKienLat.trangThai === 'DANG_TRAI' && /thuốc lá/i.test(mt.maCanhTranh[0].duKienLat.hienLa) && mt.khungNghiNgo.maNghiNgo === '73269091', mt.maCanhTranh);
// Lát 1, L1-940542-02 "đổi anh em": đèn rọi mà khai 9405.42.10 — mã cạnh tranh thuế THẤP hơn vẫn phải hiện (cả hai chiều).
r = await soat('94054210', 'Đèn rọi LED 200W 220V, chùm sáng hẹp chiếu xa 1.500m, giá ba chân xoay được, vỏ nhôm đúc, kính cường lực, mới 100%');
mt = muc(r, 'HO_SO_MAU_THUAN');
check('hiện cả chiều thuế thấp hơn: mã cạnh tranh 9405.42.20 có chenhMfn âm', mt?.maCanhTranh?.[0]?.maHs === '94054220' && mt.maCanhTranh[0].chenhMfn < 0, mt && mt.maCanhTranh);
// Mâu thuẫn TẤT ĐỊNH (lát 1, L1-854442-01 khai sang dòng anh em): coCanCuTatDinh nhưng vẫn chỉ CANH_BAO, kể cả HS_K2_LOI=on.
process.env.HS_K2_LOI = 'on';
r = await soat('85444219', 'Cáp tín hiệu VGA 3+6, 9 sợi dẫn bọc cách điện plastic chống nhiễu, lõi mỗi sợi 0,3mm, dài 1,5m, hai đầu gắn đầu nối, điện áp không quá 1000V, mới 100%');
delete process.env.HS_K2_LOI;
mt = muc(r, 'HO_SO_MAU_THUAN');
check('mâu thuẫn tất định (coCanCuTatDinh, RULE_TABLE) ⇒ vẫn tối đa CANH_BAO ở K2 độc lập, kể cả HS_K2_LOI=on', mt?.coCanCuTatDinh === true && mt.basis === 'RULE_TABLE' && mt.trangThai === 'CANH_BAO' && r.d.kiem.every((m) => m.nhom !== 'K2' || m.trangThai !== 'LOI'), tom(r));
// Đủ căn cứ (lát 1, L1-950300-01, mã đúng)
r = await soat('95030010', 'Xe đẩy đồ chơi trẻ em (push walker) bằng nhựa và sắt, có bánh xe và tay đẩy, mô phỏng hình ô tô, có pin phát nhạc, mới 100%');
check('mô tả đủ dữ kiện quyết định ⇒ HO_SO_DU_CAN_CU DAT độc lập, basis không ghi LLM_ASSERTED (lượt này không có LLM), không gọi bộ phân loại', muc(r, 'HO_SO_DU_CAN_CU')?.trangThai === 'DAT' && muc(r, 'HO_SO_DU_CAN_CU').docLap === true && muc(r, 'HO_SO_DU_CAN_CU').basis !== 'LLM_ASSERTED' && r.goi === 0, tom(r));

// ── 6. Lượt KHÔNG kiemMa (soat_to_khai miễn phí) ─────────────────────────────────────────────────────────────────────────
r = await soat('85044090', INVERTER, { kiemMa: false });
check('không kiemMa: vẫn 0 lượt LLM / bộ phân loại, khongDungLlm = true, CHUA_KIEM_MA giữ nguyên, thêm mục K2 tất định', r.goi === 0 && r.kq.khongDungLlm === true && muc(r, 'CHUA_KIEM_MA')?.trangThai === 'CHUA_KIEM' && muc(r, 'DOC_LAP_SO_TAY_CHOT_DONG_KHAC')?.trangThai === 'CANH_BAO', tom(r));
r = await soat('83014090', 'Ổ khóa số 3 chữ số bằng hợp kim kẽm, lắp cố định trên vỏ vali kéo du lịch, mới 100%', { kiemMa: false });
check('thiếu dữ kiện quyết định (chưa kết luận được) ⇒ KHÔNG thành cảnh báo K2; đưa mã cạnh tranh + câu hỏi ra trường tuỳ chọn duKienCanHoi của dòng', r.k2.every((m) => m.trangThai !== 'CANH_BAO' || !m.docLap) && r.d.duKienCanHoi.maCanhTranh.every((c) => c.maHs.startsWith('830140') && c.duKienLat.trangThai === 'CHUA_BIET' && c.duKienLat.hienLa === null) && r.d.duKienCanHoi.cauHoi.length >= 1 && r.d.k2DocLap === false, [tom(r), r.d.duKienCanHoi]);

// ── 7. Hợp đồng lùi tương thích + luật chính xác ─────────────────────────────────────────────────────────────────────────
const tatCa = [];
for (const [ma, moTa] of [['39269099', NUT_VAN], ['85044090', INVERTER], ['85098090', 'Quạt thông gió gia dụng 30W'], ['73269099', 'Hộp đựng thuốc lá điếu bằng thép không gỉ 201'], ['85094000', MAY_XAY]]) tatCa.push((await soat(ma, moTa)).d);
check('mỗi dòng vẫn đủ 7 nhóm K1–K7; mọi mục vẫn có nhom/trangThai/ma/noiDung/basis/evidence[]/nguon[]', tatCa.every((d) => DC.NHOM.every((n) => d.kiem.some((m) => m.nhom === n)) && d.kiem.every((m) => m.nhom && m.trangThai && m.ma && m.noiDung && m.basis && Array.isArray(m.evidence) && Array.isArray(m.nguon) && m.nguon.length > 0 && ['DAT', 'CANH_BAO', 'LOI', 'CHUA_KIEM'].includes(m.trangThai))));
const docLap = tatCa.flatMap((d) => d.kiem.filter((m) => m.docLap === true));
check('mục K2 độc lập: không LOI, không basis LLM_ASSERTED, không tự gắn nhãn GIR, không nguồn /api/classify', docLap.length >= 4 && docLap.every((m) => m.nhom === 'K2' && m.trangThai !== 'LOI' && m.basis !== 'LLM_ASSERTED' && !/GIR[- ]?\d/i.test(m.noiDung) && !m.nguon.some((n) => n.duongDan === '/api/classify')), docLap.map((m) => [m.ma, m.basis]));
check('mã cạnh tranh: đủ maHs/tenDong/thueMfn/chenhMfn/duKienLat, không trùng mã khai', tatCa.every((d) => d.kiem.every((m) => (m.maCanhTranh || []).every((c) => /^\d{4,8}$/.test(c.maHs) && c.maHs !== d.maHs && 'tenDong' in c && 'thueMfn' in c && 'chenhMfn' in c && c.duKienLat && c.duKienLat.fact && c.duKienLat.neuLa && ['DANG_TRAI', 'CHUA_BIET'].includes(c.duKienLat.trangThai)))));
const hai = await DC.runDeclarationCheck({ dongHang: [{ stt: 1, maHs: '39269099', moTa: NUT_VAN, xuatXu: 'CN' }], kiemMa: true }, {});
const ba = await DC.runDeclarationCheck({ dongHang: [{ stt: 1, maHs: '39269099', moTa: NUT_VAN, xuatXu: 'CN' }], kiemMa: true }, {});
const boId = (x) => JSON.stringify(x, (k, v) => (k === 'hoSoId' || k === 'ms' || k === 'msBuoc' ? undefined : v));
check('tất định: hai lượt cùng đầu vào ⇒ cùng kết quả (bỏ hoSoId và số đo thời gian)', boId(hai.dong) === boId(ba.dong));

// ── 8. lib/ho-so/soat.js: chiLuat + maCanhTranhCua ───────────────────────────────────────────────────────────────────────
const truocLlm = llmCalls;
const s1 = await S.soat({ maHs: '73269099', moTa: 'Hộp đựng thuốc lá điếu bằng thép không gỉ 201, KT 107x107x55mm, 0,08kg/cái, mới 100%' }, {}, { chiLuat: true });
check('soat({chiLuat}): không lượt LLM, meta.chiLuat, cheDoViet MAY, kết quả có maCanhTranh', llmCalls === truocLlm && s1.meta.chiLuat === true && s1.meta.cheDoViet === 'MAY' && s1.maCanhTranh[0].maHs === '73269091' && s1.hoSo.ketLuan.maTroToi === '73269091', [s1.meta, s1.maCanhTranh]);
check('maCanhTranhCua: hồ sơ không mâu thuẫn, không thiếu ⇒ mảng rỗng; thiếu ⇒ CHUA_BIET', S.maCanhTranhCua({ maHs: '73269099', ketLuan: { trangThai: 'DU_CAN_CU' } }, []).length === 0
  && S.maCanhTranhCua({ maHs: '83014090', ketLuan: { trangThai: 'THIEU_DU_KIEN' } }, [{ fact: 'tenLoai', nhanVi: 'tên loại hàng', ketQua: 'THIEU', nut: '83014010', canCu: { trich: 'Khóa vali' } }, { fact: 'x', nhanVi: 'x', ketQua: 'THIEU', nut: '8301401' }])[0].duKienLat.trangThai === 'CHUA_BIET');
check(`không lượt mạng, không lượt LLM nào trong toàn bài (fetch ${fetchCalls}, LLM ${llmCalls})`, fetchCalls === 0 && llmCalls === 0);

console.log(`\n${pass}/${pass + fail} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
