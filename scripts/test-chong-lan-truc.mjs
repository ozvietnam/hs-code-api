// Chồng lấn TRỤC tên ↔ công dụng (#683, quyết định GĐ): khai `chongLanTruc` trong bản nháp ranh giới (cổng) + động cơ hồ sơ
// không tự chọn nhánh (CHONG_LAN_TRUC) + phân xử chỉ bằng nguồn kiểm được (phanXu).
// Cổng: chỉ đọc bản nháp ĐÔNG CỨNG (scripts/fixtures/ho-so/ranh-gioi-7559407/854442.json) — KHÔNG đọc bản nháp sống của data/ho-so.
// Động cơ: sổ tay TIÊM, sinh từ bản đông cứng qua duyet() + apDung() (hàm thuần) — không ghi data/ thật.
// Không đọc data/bench/, data/oz-export/. Không LLM, không mạng.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import { nhapDongCung, nhapPr } from './fixtures/ho-so/nhap-dong-cung.mjs';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const ML = require('../lib/ho-so/ma-loi.js');
const D = require('../lib/ho-so/duong-di.js');
const HS = require('../lib/ho-so/index.js');
const LD = require('../lib/ho-so/ly-do.js');
const { doiChieu } = require('../lib/ho-so/doi-chieu.js');
const { loadSoTay } = require('../lib/so-tay-gates.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 900)}`); } };
const co = (ds, tien) => (ds || []).some((l) => l.startsWith(tien));
const clone = (x) => JSON.parse(JSON.stringify(x));

const NHANH = ['8544421', '8544422', '8544423'];
const CAU_HOI = 'Cáp này là "Cáp ắc qui" (nhánh 8544423) hay là cáp "Dùng cho viễn thông" (8544421 nếu điện áp không quá 80 V, 8544422 nếu trên 80 V nhưng không quá 1.000 V)? Cáp vừa là cáp ắc qui vừa dùng cho viễn thông: biểu thuế không nêu thứ tự — cần chuyên gia phân xử.';
const CLT = (them = {}) => ({
  nhanh: [...NHANH],
  truc: { 8544421: 'CONG_DUNG', 8544422: 'CONG_DUNG', 8544423: 'TEN_LOAI' },
  cauHoiPhanBiet: CAU_HOI,
  trich: { 8544421: 'Dùng cho viễn thông, điện áp không quá 80 V', 8544422: 'Dùng cho viễn thông, điện áp trên 80 V nhưng không quá 1.000 V', 8544423: 'Cáp ắc qui' },
  phanXu: null,
  ...them,
});
/** Bản đông cứng 854442 bỏ ghi chú DUNG:8544423 (đúng việc người soạn làm sau #683), có/không có chongLanTruc. */
const nhap = (clt) => {
  const b = nhapDongCung('854442');
  b.ghiChuSoan = b.ghiChuSoan.filter((g) => !(g.loai === 'DUNG' && g.ma === '8544423'));
  if (clt !== undefined) b.chongLanTruc = clt;
  return b;
};
const C23 = { cong: [2, 3] };

// ── 1. Cổng: không khai ⇒ đỏ, chỉ hướng người soạn sang chongLanTruc (không còn DỪNG) ───────────────────────────────────
{
  const r = C.kiemRanhGioi('854442', nhap(), C23);
  check('1a 854442 chưa khai chongLanTruc ⇒ ĐỎ, vẫn 12 cặp cong2-chong-lan', r.hopLe === false && r.loi.filter((l) => l.startsWith('cong2-chong-lan:')).length === 12, r.loi.length);
  check('1b … cổng báo cong2-chong-lan-truc:8544423 ngay cả khi chưa khai chongLanVanBan', co(r.loi, 'cong2-chong-lan-truc:8544423:8544421,8544422'), r.loi.filter((l) => l.includes('truc')));
  check('1c … cong2-chong-lan-truc KHÔNG còn là DỪNG (người soạn khai chongLanTruc)', !co(r.dung, 'cong2-chong-lan-truc') && !ML.laDung('cong2-chong-lan-truc:8544423:8544421,8544422'), r.dung);
  const g = ML.giaiThich('cong2-chong-lan-truc:8544423:8544421,8544422') || {};
  check('1d gợi ý cong2-chong-lan-truc: khai chongLanTruc, KHÔNG điền phanXu, chongLanVanBan không gỡ được, nói cấp tiêu đề', /chongLanTruc/.test(g.cachSua || '') && /phanXu/.test(g.cachSua || '') && /không gỡ/.test(g.giaiThich || '') && /tiêu đề/.test(g.giaiThich || ''), g);
}

// ── 2. Cổng: khai đủ cụm ⇒ xanh, cảnh báo cong2-chong-lan-truc-da-khai ──────────────────────────────────────────────────
let banXanh = null;
{
  banXanh = nhap([CLT()]);
  const r = C.kiemRanhGioi('854442', banXanh);
  check('2a khai chongLanTruc đủ ba nhánh ⇒ XANH (đủ cổng 1/2/3/5)', r.hopLe === true, r.loi);
  check('2b … không còn cặp cong2-chong-lan, không cong2-chong-lan-truc', !co(r.loi, 'cong2-chong-lan:') && !co(r.loi, 'cong2-chong-lan-truc'), r.loi);
  check('2c … cảnh báo cong2-chong-lan-truc-da-khai:8544421,8544422,8544423:12', r.canhBao.includes('cong2-chong-lan-truc-da-khai:8544421,8544422,8544423:12'), r.canhBao.filter((c) => c.includes('truc')));
  check('2d … cảnh báo đó không phải DỪNG, có lời giải thích riêng (không rơi vào khoá cong2-chong-lan-truc)', !co(r.dung, 'cong2-chong-lan-truc') && ML.giaiThich('cong2-chong-lan-truc-da-khai:x:1')?.ma === 'cong2-chong-lan-truc-da-khai', r.dung);
  check('2e bản nháp có chongLanTruc qua cổng 0+3 (kiểm dữ liệu sống chạy đúng tập cổng này)', C.kiemRanhGioi('854442', banXanh, { cong: [0, 3] }).hopLe === true);
  const b0 = nhap();
  check('2f băm nội dung: thêm chongLanTruc ⇒ băm đổi; đổi câu hỏi ⇒ băm đổi', C.bamRanhGioi(b0) !== C.bamRanhGioi(banXanh) && C.bamRanhGioi(banXanh) !== C.bamRanhGioi(nhap([CLT({ cauHoiPhanBiet: `${CAU_HOI} (sửa)` })])));
}

// ── 3. Cổng: khai sai ⇒ không gỡ cặp nào ────────────────────────────────────────────────────────────────────────────────
{
  const cases = [
    ['3a trích diễn đạt lại (không nguyên văn) ⇒ cong3-chong-lan-truc-trich', [CLT({ trich: { ...CLT().trich, 8544423: 'Cáp dùng cho ắc quy' } })], 'cong3-chong-lan-truc-trich:0:8544423'],
    ['3b thiếu câu hỏi phân biệt ⇒ cong0-chong-lan-truc-cau-hoi', [CLT({ cauHoiPhanBiet: '' })], 'cong0-chong-lan-truc-cau-hoi:0'],
    ['3c khai trục ngược (8544423 CONG_DUNG) ⇒ cong0-chong-lan-truc-mot-truc', [CLT({ truc: { 8544421: 'CONG_DUNG', 8544422: 'CONG_DUNG', 8544423: 'CONG_DUNG' } })], 'cong0-chong-lan-truc-mot-truc:0'],
    ['3d trục khai lệch khoá thật (8544421 TEN_LOAI, 8544423 CONG_DUNG) ⇒ cong3-chong-lan-truc-truc-lech', [CLT({ truc: { 8544421: 'TEN_LOAI', 8544422: 'CONG_DUNG', 8544423: 'CONG_DUNG' } })], 'cong3-chong-lan-truc-truc-lech:0:8544421'],
    ['3e nhánh không phải anh em (85444213 dưới 8544421) ⇒ cong0-chong-lan-truc-khong-anh-em', [CLT({ nhanh: ['85444213', '8544423'], truc: { 85444213: 'CONG_DUNG', 8544423: 'TEN_LOAI' }, trich: { 85444213: 'Loại khác', 8544423: 'Cáp ắc qui' } })], 'cong0-chong-lan-truc-khong-anh-em:0'],
  ];
  for (const [ten, clt, ma] of cases) {
    const r = C.kiemRanhGioi('854442', nhap(clt), C23);
    check(`${ten}; 12 cặp vẫn lỗi`, r.hopLe === false && r.loi.includes(ma) && r.loi.filter((l) => l.startsWith('cong2-chong-lan:')).length === 12, r.loi.filter((l) => !l.startsWith('cong2-chong-lan:')));
  }
  // Khai thiếu nhánh: chỉ cặp giữa nhánh đã khai được gỡ; cặp với 8544422 vẫn lỗi + vẫn báo trục.
  const r = C.kiemRanhGioi('854442', nhap([CLT({ nhanh: ['8544421', '8544423'], truc: { 8544421: 'CONG_DUNG', 8544423: 'TEN_LOAI' }, trich: { 8544421: CLT().trich[8544421], 8544423: 'Cáp ắc qui' } })]), C23);
  const cap = r.loi.filter((l) => l.startsWith('cong2-chong-lan:')).map((l) => l.split(':')[1]);
  check('3f khai thiếu nhánh 8544422 ⇒ 6 cặp .23/.29 vẫn lỗi, 6 cặp .13/.19 đã gỡ', cap.length === 6 && cap.every((k) => /^8544422[39]\+/.test(k)), cap);
  check('3g … vẫn báo cong2-chong-lan-truc:8544423 (cụm chưa phủ hết)', co(r.loi, 'cong2-chong-lan-truc:8544423:'), r.loi.filter((l) => l.includes('truc')));
  // Nhánh khai mà không chồng gì (8544429 "Loại khác" trần không có điều kiện) ⇒ lỗi.
  const r2 = C.kiemRanhGioi('854442', nhap([CLT({ nhanh: [...NHANH, '8544429'], truc: { ...CLT().truc, 8544429: 'TEN_LOAI' }, trich: { ...CLT().trich, 8544429: 'Loại khác' } })]), C23);
  check('3h khai thêm nhánh không chồng lấn (8544429) ⇒ lỗi (thừa hoặc lệch trục), không xanh', r2.hopLe === false && (co(r2.loi, 'cong2-chong-lan-truc-nhanh-thua:0:8544429') || co(r2.loi, 'cong3-chong-lan-truc-truc-lech:0:8544429')), r2.loi.filter((l) => l.includes('truc')));
  // chongLanVanBan vẫn không gỡ được trục (giữ hành vi vòng 3), kể cả khi đã khai chongLanTruc.
  const b = nhap([CLT()]);
  b.chongLanVanBan = [{ cap: ['85444213', '85444232'], lyDo: 'Chữ biểu: tieuDe.8544421 "Dùng cho viễn thông, điện áp không quá 80 V" ↔ tieuDe.8544423 "Cáp ắc qui"; .13 "Loại khác, cách điện bằng cao su, plastic hoặc giấy" ↔ .32 "Cho xe thuộc nhóm 87.02, 87.03, 87.04 hoặc 87.11"' }];
  const r3 = C.kiemRanhGioi('854442', b, C23);
  check('3i chongLanVanBan trong cụm trục ⇒ vẫn lỗi cong2-chong-lan-van-ban-truc', r3.hopLe === false && co(r3.loi, 'cong2-chong-lan-van-ban-truc:85444213+85444232:'), r3.loi.filter((l) => l.includes('van-ban')));
  const r4 = C.kiemRanhGioi('854442', nhap({ nhanh: NHANH }), { cong: [0] });
  check('3j chongLanTruc không phải mảng ⇒ cong0-khong-phai-mang:chongLanTruc', r4.loi.includes('cong0-khong-phai-mang:chongLanTruc'), r4.loi);
}

// ── 4. Cổng: phanXu chỉ nhận nguồn kiểm được ────────────────────────────────────────────────────────────────────────────
const TRICH_CHU_GIAI = 'Với điều kiện chúng được cách điện, nhóm này bao gồm dây dẫn điện, cáp điện';
{
  const px = (p) => C.kiemRanhGioi('854442', nhap([CLT({ phanXu: p })]), { cong: [0, 3] });
  const ok = px({ chon: '8544423', nguon: { loai: 'CHU_GIAI', ma: 'nhom8544.nhom', trich: TRICH_CHU_GIAI } });
  check('4a phanXu CHU_GIAI trích nguyên văn chú giải nhóm 85.44 (nguồn NGUYEN_VAN) ⇒ cổng 0+3 nhận', ok.hopLe === true, ok.loi);
  const sai = px({ chon: '8544423', nguon: { loai: 'CHU_GIAI', ma: 'nhom8544.nhom', trich: 'Cáp ắc qui dùng cho viễn thông được xếp vào cáp ắc qui' } });
  check('4b phanXu CHU_GIAI trích bịa ⇒ cong3-chong-lan-truc-phan-xu-trich', sai.hopLe === false && sai.loi.includes('cong3-chong-lan-truc-phan-xu-trich:0'), sai.loi);
  const tax = px({ chon: '8544423', nguon: { loai: 'CHU_GIAI', ma: 'tax.85444232', trich: 'Cho xe thuộc nhóm 87.02' } });
  check('4c phanXu CHU_GIAI trỏ nguồn không phải chú giải (tax.*) ⇒ cong3-chong-lan-truc-phan-xu-nguon', tax.loi.includes('cong3-chong-lan-truc-phan-xu-nguon:0'), tax.loi);
  const ai = px({ chon: '8544423', nguon: { loai: 'CHU_GIAI', ma: 'explanatory-notes.8544', trich: 'Cáp ắc qui' } });
  check('4d phanXu trỏ nguồn AI_CHUA_KIEM / ngoài danh sách nguồn ⇒ cong3-chong-lan-truc-phan-xu-nguon', ai.loi.includes('cong3-chong-lan-truc-phan-xu-nguon:0'), ai.loi);
  const chon = px({ chon: '8544429', nguon: { loai: 'CHU_GIAI', ma: 'nhom8544.nhom', trich: TRICH_CHU_GIAI } });
  check('4e phanXu chọn nhánh ngoài cụm ⇒ cong0-chong-lan-truc-phan-xu-chon', chon.loi.includes('cong0-chong-lan-truc-phan-xu-chon:0'), chon.loi);
  const nd = px({ chon: '8544423', nguon: { loai: 'NGUOI_DUYET', nguoi: 'anh Thắng', ngay: '2026-10-31', quyetDinh: 'Cáp ắc qui của trạm viễn thông xếp 8544423' } });
  check('4f phanXu NGUOI_DUYET thiếu kenh ⇒ cong0-chong-lan-truc-phan-xu-nguoi-duyet', nd.loi.some((l) => l.startsWith('cong0-chong-lan-truc-phan-xu-nguoi-duyet:0')), nd.loi);
  const nd2 = px({ chon: '8544423', nguon: { loai: 'NGUOI_DUYET', nguoi: 'anh Thắng', ngay: '2026-10-31', quyetDinh: 'Cáp ắc qui của trạm viễn thông xếp 8544423', kenh: 'https://github.com/ozvietnam/hs-code-api/issues/683' } });
  check('4g phanXu NGUOI_DUYET đủ {nguoi, ngay, quyetDinh, kenh} ⇒ nhận', nd2.hopLe === true, nd2.loi);
  // TIEN_LE qua bảng hiệu chỉnh: 854442-03 kết luận 85444299 (dưới 8544429 — ngoài cụm) ⇒ không dùng được cho nhánh 8544423.
  const tl = px({ chon: '8544423', nguon: { loai: 'TIEN_LE', hieuChinhId: '854442-03', trich: '85444299' } });
  check('4h phanXu TIEN_LE trỏ mục bảng hiệu chỉnh kết luận dòng ngoài nhánh chọn ⇒ cong3-chong-lan-truc-phan-xu-tien-le', tl.loi.some((l) => l.startsWith('cong3-chong-lan-truc-phan-xu-tien-le:0')), tl.loi);
  const tl2 = px({ chon: '8544423', nguon: { loai: 'TIEN_LE', hieuChinhId: 'khong-co', trich: 'x' } });
  check('4i phanXu TIEN_LE trỏ mục không có ⇒ lỗi', tl2.loi.some((l) => l.startsWith('cong3-chong-lan-truc-phan-xu-tien-le:0')), tl2.loi);
  for (const ma of ['cong2-chong-lan-truc-da-khai:a:1', 'cong3-chong-lan-truc-trich:0:x', 'cong0-chong-lan-truc-cau-hoi:0', 'cong3-chong-lan-truc-phan-xu-trich:0', 'cong2-chong-lan-truc-nhanh-thua:0:x']) check(`4j giải thích ${ma.split(':')[0]}`, Boolean(ML.giaiThich(ma)?.cachSua) && ML.giaiThich(ma).ma === ma.split(':')[0], ML.giaiThich(ma));
}

// ── 5. Spec: người soạn khai chongLanTruc, KHÔNG được điền phanXu ───────────────────────────────────────────────────────
{
  const spec = { phienBan: 'ranh-gioi-spec@1', pn6: '854442', phien: 'cursor:test:20261031T0900#soan-854442', dong8: {}, chongLanTruc: [CLT()] };
  const r = C.apSpec(spec);
  check('5a spec có chongLanTruc (phanXu null) ⇒ bản nháp mang chongLanTruc', r.loi.length === 0 && Array.isArray(r.banNhap?.chongLanTruc) && r.banNhap.chongLanTruc[0].cauHoiPhanBiet === CAU_HOI, r.loi);
  const r2 = C.apSpec({ ...spec, chongLanTruc: [CLT({ phanXu: { chon: '8544423', nguon: { loai: 'CHU_GIAI', ma: 'nhom8544.nhom', trich: TRICH_CHU_GIAI } } })] });
  check('5b spec điền phanXu ⇒ spec-khoa-cam (chỉ Claude/người soát ghi)', r2.banNhap === null && r2.loi.some((l) => l.startsWith('spec-khoa-cam:chongLanTruc[0].phanXu')), r2.loi);
}

// ── 6. Động cơ: sổ tay sinh từ bản nháp DUYET qua apDung ────────────────────────────────────────────────────────────────
const PHIEN_SOAT = 'https://claude.ai/code/session_TEST683#soat-683';
const duyet = C.duyet(banXanh, { phien: PHIEN_SOAT, ngay: '2026-10-31' });
const soTay = C.apDung(duyet, loadSoTay('8544'));
const muc = (id) => (soTay.dieuKienNut || []).find((m) => m.id === id) || (soTay.dong8 || []).find((m) => m.hs === id);
check('6a apDung mang dấu chongLanTruc (CLAUDE_DUYET) sang mục sổ tay của MỌI nhánh', NHANH.every((id) => muc(id)?.chongLanTruc?.cauHoiPhanBiet === CAU_HOI && muc(id).nguonLoai === 'CLAUDE_DUYET'), NHANH.map((id) => muc(id)?.chongLanTruc));

const dk = (fact, giaTri, donVi) => ({ fact, giaTri, ...(donVi ? { donVi } : {}), nguon: 'KHACH', trangThai: 'DA_CO', bangChung: String(Array.isArray(giaTri) ? giaTri.map((x) => x.chatLieu).join(',') : giaTri) });
const PLASTIC = [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }];
async function hoSo(ma, duKien, st = soTay) {
  const dd = D.dungDuongDi(ma, 'NHAP', { soTay: st, bangHieuChinh: { muc: [] } });
  const khung = HS.khungHoSo(dd, { duKien });
  return doiChieu(khung, { soTay: st, bangHieuChinh: { muc: [] }, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [], demKhoOz: async () => ({ tong: 0, maKhac: [] }) });
}
const nutGir = (h) => (h.canCu?.girRulesApplied || []).flatMap((g) => (g.evidence?.ranhGioi || []).map((x) => x.nut));
const duoi = (id, nut) => { for (let x = nut; x; x = require('../lib/hs-tree.js').chaTang(x)) if (x === id) return true; return false; };

check('6b LY_DO_CHUA_CHOT.CHONG_LAN_TRUC = "chong-lan-truc" (enum đông cứng)', LD.LY_DO_CHUA_CHOT.CHONG_LAN_TRUC === 'chong-lan-truc' && LD.chuanLyDo('chong-lan-truc') === 'chong-lan-truc');
{
  const dd = D.dungDuongDi('85444213', 'NHAP', { soTay, bangHieuChinh: { muc: [] } });
  check('6c dungDuongDi 85444213: mang cụm chongLanTruc (nhánh của mã = 8544421), chưa có dữ kiện thì không chặn chốt', Array.isArray(dd.chongLanTruc) && dd.chongLanTruc[0]?.nhanhCuaMa === '8544421' && dd.chotDuoc === true, { c: dd.chongLanTruc, chot: dd.chotDuoc, chuaChot: dd.chuaChot });
}

// (a) Cáp ắc qui dùng cho viễn thông 12 V, cách điện plastic — thoả cả 8544421 và 8544423.
const CHONG = [dk('tenLoai', 'Cáp ắc qui'), dk('congDung', 'viễn thông'), dk('dienAp', 12, 'V'), dk('chatLieu', PLASTIC), dk('dungCho', 'trạm thu phát sóng')];
let vdChong = null;
{
  const h = await hoSo('85444213', CHONG);
  vdChong = h;
  const q = h.ketLuan.cauHoi.find((x) => x.loai === 'PHAN_BIET_CHONG_LAN_TRUC');
  check('6d (a) chồng trục: KHÔNG chốt — CAN_CHUYEN_GIA, chuaChot chong-lan-truc:8544423', h.ketLuan.trangThai === 'CAN_CHUYEN_GIA' && h.ketLuan.chuaChot.includes('chong-lan-truc:8544423'), h.ketLuan);
  check('6e … câu hỏi PHAN_BIET_CHONG_LAN_TRUC mang đúng cauHoiPhanBiet + cả hai nhánh + mã ứng viên hai phía', q && q.vi === CAU_HOI && q.zh && q.ungVien.some((u) => u.nhanh === '8544421') && q.ungVien.some((u) => u.nhanh === '8544423')
    && q.maUngVien.includes('85444213') && q.maUngVien.includes('85444233'), q);
  check('6f … không trích GIR nào cho nhánh trong cụm (girRulesApplied không có nút dưới 8544421/8544423)', !nutGir(h).some((n) => duoi('8544421', n) || duoi('8544423', n)), nutGir(h));
  check('6g … không ở đâu tự gắn nhãn GIR 3(a)', !/GIR[-\s]?3\s?\(?a/i.test(JSON.stringify(h)), JSON.stringify(h).match(/GIR[-\s]?3.{0,20}/));
  check('6h … ranh giới nhánh của mã ghi CHUA_SO_HOA lý do chong-lan-truc (giữ kết quả theo dữ kiện ở ketQuaDuKien)', h.duongDiPhapLy.some((e) => e.nut === '8544421' && e.ketQua === 'CHUA_SO_HOA' && e.lyDo === 'chong-lan-truc' && e.ketQuaDuKien === 'CO'), h.duongDiPhapLy.filter((e) => e.nut === '8544421'));
  check('6i … canCuPhapLy không đọc như gần chốt', h.canCu?.canCuPhapLy?.trangThai !== 'CHUA_CHOT_CAN_XAC_NHAN', h.canCu?.canCuPhapLy?.trangThai);
  const h2 = await hoSo('85444233', CHONG);
  check('6j (a) từ phía kia (85444233 dưới 8544423) cũng không chốt — chuaChot chong-lan-truc:8544421', h2.ketLuan.trangThai === 'CAN_CHUYEN_GIA' && h2.ketLuan.chuaChot.includes('chong-lan-truc:8544421') && !nutGir(h2).some((n) => duoi('8544423', n)), h2.ketLuan);
}
// (b) Dữ kiện chỉ thoả một phía ⇒ đường thường.
{
  const h = await hoSo('85444213', [dk('tenLoai', 'Cáp đồng trục'), dk('congDung', 'viễn thông'), dk('dienAp', 12, 'V'), dk('chatLieu', PLASTIC)]);
  check('6k (b) cáp viễn thông không phải cáp ắc qui ⇒ không chong-lan-truc, DU_CAN_CU như đường thường', !h.ketLuan.chuaChot.some((x) => x.startsWith('chong-lan-truc')) && h.ketLuan.trangThai === 'DU_CAN_CU', h.ketLuan);
  const h2 = await hoSo('85444233', [dk('tenLoai', 'Cáp ắc qui'), dk('congDung', 'khởi động máy phát điện'), dk('dienAp', 24, 'V'), dk('chatLieu', PLASTIC), dk('dungCho', 'máy phát điện')]);
  check('6l (b) cáp ắc qui không dùng cho viễn thông ⇒ không chong-lan-truc, DU_CAN_CU', !h2.ketLuan.chuaChot.some((x) => x.startsWith('chong-lan-truc')) && h2.ketLuan.trangThai === 'DU_CAN_CU', h2.ketLuan);
  const h3 = await hoSo('85444233', [dk('tenLoai', 'Cáp ắc qui'), dk('chatLieu', PLASTIC), dk('dungCho', 'máy phát điện')]);
  check('6m chưa biết công dụng (phía kia có thể thoả) ⇒ không DU_CAN_CU: THIEU_DU_KIEN + hỏi congDung vào ranh giới 8544421', h3.ketLuan.trangThai === 'THIEU_DU_KIEN' && h3.ketLuan.cauHoi.some((x) => x.fact === 'congDung' && (x.vaoRanhGioi || []).includes('8544421')), h3.ketLuan);
}
// (c) phanXu hợp lệ (CHU_GIAI) ⇒ máy chọn `chon`, ghi nguồn vào đường đi, không GIR.
{
  const st = clone(soTay);
  const PX = { chon: '8544423', nguon: { loai: 'CHU_GIAI', ma: 'nhom8544.nhom', trich: TRICH_CHU_GIAI } };
  for (const m of [...st.dieuKienNut, ...st.dong8]) if (m.chongLanTruc) m.chongLanTruc.phanXu = clone(PX);
  const h = await hoSo('85444233', CHONG, st);
  const c = (h.chongLanTruc || [])[0] || {};
  check('6n (c) phanXu chọn 8544423 ⇒ 85444233 chốt theo phân xử (không chong-lan-truc), nguồn ghi ở chongLanTruc.daPhanXu', !h.ketLuan.chuaChot.some((x) => x.startsWith('chong-lan-truc')) && h.ketLuan.trangThai === 'DU_CAN_CU' && c.daPhanXu?.chon === '8544423' && c.daPhanXu?.nguon?.trich === TRICH_CHU_GIAI, { kl: h.ketLuan, c });
  check('6o … ranh giới nhánh ghi phanXu (đường đi), không thành GIR, không thành canCuPhapLy', h.duongDiPhapLy.some((e) => e.nut === '8544423' && e.phanXu?.chon === '8544423') && !nutGir(h).some((n) => duoi('8544423', n)) && !JSON.stringify(h.canCu?.canCuPhapLy || {}).includes(TRICH_CHU_GIAI), h.duongDiPhapLy.filter((e) => e.nut === '8544423'));
  const h2 = await hoSo('85444213', CHONG, st);
  check('6p … phía không được chọn (85444213) ⇒ MAU_THUAN, maTroToi 85444233', h2.ketLuan.trangThai === 'MAU_THUAN' && h2.ketLuan.maTroToi === '85444233', h2.ketLuan);
}
// Bền: dấu chưa duyệt bị bỏ; dấu hỏng không làm động cơ ném lỗi (đường shadow).
{
  const st = clone(soTay);
  for (const m of [...st.dieuKienNut, ...st.dong8]) if (m.chongLanTruc) m.nguonLoai = 'AI_DA_KIEM';
  const dd = D.dungDuongDi('85444213', 'NHAP', { soTay: st, bangHieuChinh: { muc: [] } });
  check('6q dấu chongLanTruc trên mục chưa duyệt ⇒ động cơ bỏ qua', !dd.chongLanTruc, dd.chongLanTruc);
  const st2 = clone(soTay);
  for (const m of [...st2.dieuKienNut, ...st2.dong8]) if (m.chongLanTruc) m.chongLanTruc = { nhanh: 'hong', truc: null };
  let nem = null; let h = null;
  try { h = await hoSo('85444213', CHONG, st2); } catch (e) { nem = e.message; }
  check('6r dấu chongLanTruc hỏng ⇒ không ném lỗi, hồ sơ vẫn dựng', nem === null && h && h.ketLuan.trangThai, nem);
}

// ── 7. Cấp DÒNG (vòng 4 bắt trục dòng ↔ dòng, #686): 940541 .10 "Đèn pha"/.20 "Đèn rọi khác" (tên) ↔ .30 (công dụng, HOAC) ─────
{
  const b = nhapPr('940541', '662e097');
  delete b.chongLanVanBan;
  b.chongLanTruc = [{
    nhanh: ['94054110', '94054120', '94054130'],
    truc: { 94054110: 'TEN_LOAI', 94054120: 'TEN_LOAI', 94054130: 'CONG_DUNG' },
    cauHoiPhanBiet: 'Đèn này là "Đèn pha" / "Đèn rọi khác" hay là "đèn dùng cho phương tiện giao thông đường sắt, đầu máy, tàu thủy, phương tiện bay, hoặc hải đăng, bằng kim loại cơ bản"?',
    trich: { 94054110: 'Đèn pha', 94054120: 'Đèn rọi khác', 94054130: 'đèn dùng cho phương tiện giao thông đường sắt, đầu máy, tàu thủy, phương tiện bay, hoặc hải đăng, bằng kim loại cơ bản' },
    phanXu: null,
  }];
  const r = C.kiemRanhGioi('940541', b, C23);
  check('7a 940541 cấp dòng: khai chongLanTruc ⇒ hết cong2-chong-lan-truc và cặp .10/.20↔.30, cảnh báo -da-khai', !co(r.loi, 'cong2-chong-lan-truc') && !co(r.loi, 'cong2-chong-lan:9405411') && !co(r.loi, 'cong2-chong-lan:9405412') && co(r.canhBao, 'cong2-chong-lan-truc-da-khai:94054110,94054120,94054130:'), r.loi);
  const b2 = clone(b); b2.chongLanTruc[0].truc = { 94054110: 'TEN_LOAI', 94054120: 'TEN_LOAI', 94054130: 'TEN_LOAI' };
  const r2 = C.kiemRanhGioi('940541', b2, C23);
  check('7b … khai mọi dòng cùng trục ⇒ không phủ (cong0-chong-lan-truc-mot-truc là DỪNG)', co(r2.loi, 'cong0-chong-lan-truc-mot-truc:0') && co(r2.dung, 'cong0-chong-lan-truc-mot-truc') && co(r2.loi, 'cong2-chong-lan-truc:'), r2.loi.filter((l) => l.includes('truc')));
}

console.log('\nVí dụ (a) — cáp ắc qui dùng cho viễn thông, mã 85444213:');
console.log(JSON.stringify({ ketLuan: vdChong?.ketLuan, chongLanTruc: vdChong?.chongLanTruc }, null, 1).slice(0, 4000));
console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
