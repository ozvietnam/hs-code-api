#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Vòng 8 (#577, sau soát L1-4c đợt 5 #716 — trả về #713 950300, #714 848180):
 *   A. Luật cổng (quyết định GĐ): MỖI cặp nhánh khác trục mà một cụm `chongLanTruc` phủ (cặp cổng 2 thật sự thấy chồng lấn
 *      trong cụm) phải có `viDuHang: [{cap: [idA, idB], hang: "<một hàng THẬT thoả cả hai nhánh theo chữ biểu>"}]`.
 *      Thiếu ⇒ `cong2-chong-lan-truc-thieu-vi-du:<cụm>:<cặp>`; hàng ví dụ đọc thành dữ kiện bằng CÙNG bộ đọc lúc chạy
 *      (lib/ho-so/doc-du-kien.js#docKhoa) rồi đối chiếu bằng CÙNG bộ so (lib/dieu-kien-so.js#doiChieuDong8) mà không thoả cả hai
 *      nhánh ⇒ `cong2-chong-lan-truc-vi-du-sai:<cụm>:<cặp>`. Bản DUYET (đã soát độc lập) ⇒ cảnh báo; NHAP/TRA_VE ⇒ lỗi.
 *      Lý do: `chongLanTruc` từng nuốt chồng lấn do cách chọn khoá (761699 cụm 7 nhánh, 848180 cụm 9 nhánh).
 *   B. Bộ tách vế: "… và các <≥ 1 chữ> tương tự" (chữ Anh cùng dòng có "similar") là vế MỞ — 950300 .40 "Các mô hình thu nhỏ
 *      theo tỷ lệ ("scale") và các mô hình giải trí tương tự" trước bị đọc cả cụm là danh từ đầu nên cổng 5 không đòi phủ.
 *   C. 950300 soạn lại (#713): .40 `tenLoai TUONG_TU ["mô hình thu nhỏ theo tỷ lệ"]`.
 *   D. 848180 soạn lại (#714): anh em nêu ĐÍCH của van cùng khoá dungCho; cụm trục chỉ gồm cặp có hàng thật.
 * Bản nháp/spec ĐÔNG CỨNG (scripts/fixtures/ho-so/ranh-gioi-7559407, ranh-gioi-49dae40, spec-vong-8). Không ghi data/, không
 * đọc data/bench, data/oz-export; không LLM/mạng.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { nhapDongCung } from './fixtures/ho-so/nhap-dong-cung.mjs';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const ML = require('../lib/ho-so/ma-loi.js');
const V = require('../lib/ho-so/tach-ve.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 900)); } };
const co = (ds, tien) => (ds || []).some((l) => l.startsWith(tien));
const DC_49 = path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'ranh-gioi-49dae40');

// ── A. viDuHang cho mọi cặp chongLanTruc phủ ────────────────────────────────────────────────────────────────────────────
const NHANH = ['8544421', '8544422', '8544423'];
const CAU_HOI = 'Cáp này là "Cáp ắc qui" (nhánh 8544423) hay là cáp "Dùng cho viễn thông" (8544421 nếu điện áp không quá 80 V, 8544422 nếu trên 80 V nhưng không quá 1.000 V)? Cáp vừa là cáp ắc qui vừa dùng cho viễn thông: biểu thuế không nêu thứ tự — cần chuyên gia phân xử.';
const VI_DU_21 = { cap: ['8544421', '8544423'], hang: 'Cáp ắc qui dùng để cấp nguồn cho thiết bị viễn thông, điện áp 48 V, đã lắp đầu nối' };
const VI_DU_22 = { cap: ['8544422', '8544423'], hang: 'Cáp ắc qui dùng để cấp nguồn cho thiết bị viễn thông, điện áp 220 V, đã lắp đầu nối' };
const CLT = (them = {}) => ({
  nhanh: [...NHANH],
  truc: { 8544421: 'CONG_DUNG', 8544422: 'CONG_DUNG', 8544423: 'TEN_LOAI' },
  cauHoiPhanBiet: CAU_HOI,
  trich: { 8544421: 'Dùng cho viễn thông, điện áp không quá 80 V', 8544422: 'Dùng cho viễn thông, điện áp trên 80 V nhưng không quá 1.000 V', 8544423: 'Cáp ắc qui' },
  phanXu: null,
  ...them,
});
const nhap = (clt) => {
  const b = nhapDongCung('854442');
  b.ghiChuSoan = b.ghiChuSoan.filter((g) => !(g.loai === 'DUNG' && g.ma === '8544423'));
  if (clt !== undefined) b.chongLanTruc = clt;
  return b;
};
const C23 = { cong: [2, 3] };
{
  const r = C.kiemRanhGioi('854442', nhap([CLT()]), C23);
  check('A1 NHAP khai chongLanTruc mà không viDuHang ⇒ ĐỎ, thiếu ví dụ cho ĐÚNG hai cặp khác trục mà cổng 2 phủ (.21↔.23, .22↔.23; .21↔.22 cùng trục không đòi)',
    r.hopLe === false && r.loi.includes('cong2-chong-lan-truc-thieu-vi-du:0:8544421+8544423') && r.loi.includes('cong2-chong-lan-truc-thieu-vi-du:0:8544422+8544423')
    && !co(r.loi, 'cong2-chong-lan-truc-thieu-vi-du:0:8544421+8544422'), r.loi.filter((l) => l.includes('vi-du')));
  check('A2 … cặp chồng lấn vẫn được phủ (không quay lại 12 lỗi cong2-chong-lan) — thiếu ví dụ là lỗi riêng, không phải DỪNG',
    !co(r.loi, 'cong2-chong-lan:') && !co(r.dung, 'cong2-chong-lan-truc-thieu-vi-du') && !ML.laDung('cong2-chong-lan-truc-thieu-vi-du:0:a+b'), r.dung);

  const r2 = C.kiemRanhGioi('854442', nhap([CLT({ viDuHang: [VI_DU_21, VI_DU_22] })]), C23);
  check('A3 viDuHang đủ hai cặp, hàng thật thoả cả hai nhánh (đọc bằng docKhoa, so bằng doiChieuDong8) ⇒ XANH', r2.hopLe === true, r2.loi);
  check('A4 … vẫn cảnh báo cong2-chong-lan-truc-da-khai', co(r2.canhBao, 'cong2-chong-lan-truc-da-khai:8544421,8544422,8544423:'), r2.canhBao.filter((c) => c.includes('truc')));
  check('A4b … đủ cổng 1/2/3/5 cũng XANH', C.kiemRanhGioi('854442', nhap([CLT({ viDuHang: [VI_DU_21, VI_DU_22] })])).hopLe === true);

  const r3 = C.kiemRanhGioi('854442', nhap([CLT({ viDuHang: [VI_DU_21] })]), C23);
  check('A5 thiếu ví dụ một cặp ⇒ đúng một lỗi thiếu ví dụ (.22↔.23)', r3.loi.filter((l) => l.startsWith('cong2-chong-lan-truc-thieu-vi-du')).join() === 'cong2-chong-lan-truc-thieu-vi-du:0:8544422+8544423', r3.loi);

  const sai = { cap: ['8544422', '8544423'], hang: 'Cáp ắc qui ô tô, đã lắp đầu nối' };
  const r4 = C.kiemRanhGioi('854442', nhap([CLT({ viDuHang: [VI_DU_21, sai] })]), C23);
  check('A6 hàng ví dụ không thoả nhánh "Dùng cho viễn thông, điện áp trên 80 V…" ⇒ cong2-chong-lan-truc-vi-du-sai:0:8544422+8544423', r4.hopLe === false && r4.loi.includes('cong2-chong-lan-truc-vi-du-sai:0:8544422+8544423'), r4.loi);
  const dienApSai = { cap: ['8544422', '8544423'], hang: 'Cáp ắc qui dùng để cấp nguồn cho thiết bị viễn thông, điện áp 48 V, đã lắp đầu nối' };
  check('A7 … 48 V cho cặp .22 (trên 80 V) ⇒ sai (biên số đọc thật, không chỉ so tên)', C.kiemRanhGioi('854442', nhap([CLT({ viDuHang: [VI_DU_21, dienApSai] })]), C23).loi.includes('cong2-chong-lan-truc-vi-du-sai:0:8544422+8544423'));
  check('A8 hàng ví dụ sai được kiểm cả khi không chạy cổng 2 (cổng 0+3: dữ liệu sống)', C.kiemRanhGioi('854442', nhap([CLT({ viDuHang: [VI_DU_21, sai] })]), { cong: [0, 3] }).loi.includes('cong2-chong-lan-truc-vi-du-sai:0:8544422+8544423'));

  const hinh = (v) => C.kiemRanhGioi('854442', nhap([CLT({ viDuHang: v })]), { cong: [0, 3] }).loi;
  check('A9 viDuHang không phải mảng ⇒ cong0-chong-lan-truc-vi-du-hinh-dang:0', hinh({ cap: VI_DU_21.cap, hang: VI_DU_21.hang }).includes('cong0-chong-lan-truc-vi-du-hinh-dang:0'));
  check('A10 hàng rỗng / khoá lạ ⇒ cong0-chong-lan-truc-vi-du-hinh-dang:0:<j>', hinh([{ cap: VI_DU_21.cap, hang: '' }]).includes('cong0-chong-lan-truc-vi-du-hinh-dang:0:0') && hinh([{ ...VI_DU_21, lyDo: 'x' }]).includes('cong0-chong-lan-truc-vi-du-hinh-dang:0:0'));
  check('A11 cặp cùng trục (.21↔.22) hoặc nhánh ngoài cụm ⇒ cong0-chong-lan-truc-vi-du-cap',
    hinh([{ cap: ['8544421', '8544422'], hang: VI_DU_21.hang }]).includes('cong0-chong-lan-truc-vi-du-cap:0:0') && hinh([{ cap: ['8544429', '8544423'], hang: VI_DU_21.hang }]).includes('cong0-chong-lan-truc-vi-du-cap:0:0'));
  check('A12 hai ví dụ cùng một cặp ⇒ cong0-chong-lan-truc-vi-du-trung', co(hinh([VI_DU_21, { ...VI_DU_21, cap: ['8544423', '8544421'] }]), 'cong0-chong-lan-truc-vi-du-trung:0:8544421+8544423'));

  const thu = C.thuViDuHang('854442', nhap([CLT()]), '8544423', '8544421', VI_DU_21.hang);
  check('A13 thuViDuHang (cho người soạn): hàng thoả nhánh 8544423 "Cáp ắc qui"', thu.thoa === true, thu);
  const thu2 = C.thuViDuHang('854442', nhap([CLT()]), '8544421', '8544423', 'Cáp ắc qui ô tô, đã lắp đầu nối');
  check('A14 … "Cáp ắc qui ô tô" không thoả 8544421 (thiếu công dụng viễn thông, điện áp) — có lý do', thu2.thoa === false && /8544421/.test(thu2.lyDo), thu2);

  const b0 = nhap([CLT()]); const b1 = nhap([CLT({ viDuHang: [VI_DU_21, VI_DU_22] })]);
  check('A15 viDuHang thuộc nội dung băm (thêm/sửa sau duyệt ⇒ lệch băm); bản không có viDuHang băm như cũ',
    C.bamRanhGioi(b0) !== C.bamRanhGioi(b1) && C.bamRanhGioi(b1) !== C.bamRanhGioi(nhap([CLT({ viDuHang: [VI_DU_21, { ...VI_DU_22, hang: `${VI_DU_22.hang}, dài 2 m` }] })])));

  // Bản DUYET (đông cứng main 49dae40): đã soát độc lập ⇒ chỉ CẢNH BÁO, vẫn xanh; băm duyệt không đổi.
  const d = JSON.parse(fs.readFileSync(path.join(DC_49, '854442.json'), 'utf8'));
  const rd = C.kiemRanhGioi('854442', d);
  check('A16 854442 DUYET (chưa có viDuHang) ⇒ vẫn XANH đủ cổng, không cong0-sua-sau-duyet', rd.hopLe === true && !co(rd.loi, 'cong0-sua-sau-duyet'), rd.loi);
  check('A17 … CẢNH BÁO cong2-chong-lan-truc-thieu-vi-du cho .21↔.23 và .22↔.23', rd.canhBao.includes('cong2-chong-lan-truc-thieu-vi-du:0:8544421+8544423') && rd.canhBao.includes('cong2-chong-lan-truc-thieu-vi-du:0:8544422+8544423'), rd.canhBao.filter((c) => c.includes('vi-du')));
  const nhapLai = { ...d, trangThai: 'NHAP' }; delete nhapLai.duyet;
  for (const m of [...nhapLai.dong8, ...(nhapLai.dieuKienNut || [])]) m.nguonLoai = 'AI_DA_KIEM';
  check('A18 … cùng nội dung ở trạng thái NHAP ⇒ LỖI (người soạn mới phải ghi ví dụ)', C.kiemRanhGioi('854442', nhapLai).loi.includes('cong2-chong-lan-truc-thieu-vi-du:0:8544421+8544423'));

  for (const ma of ['cong2-chong-lan-truc-thieu-vi-du:0:a+b', 'cong2-chong-lan-truc-vi-du-sai:0:a+b', 'cong0-chong-lan-truc-vi-du-hinh-dang:0', 'cong0-chong-lan-truc-vi-du-cap:0:0', 'cong0-chong-lan-truc-vi-du-trung:0:a+b']) {
    const g = ML.giaiThich(ma);
    check(`A19 giải thích ${ma.split(':')[0]} (không DỪNG)`, g?.ma === ma.split(':')[0] && Boolean(g.cachSua) && !g.dung, g);
  }
  check('A20 giải thích cong2-chong-lan-truc nhắc viDuHang', /viDuHang/.test(ML.giaiThich('cong2-chong-lan-truc:x:y')?.cachSua || ''));
}

// ── B. Bộ tách vế: "… và các <chữ> tương tự" là vế MỞ ──────────────────────────────────────────────────────────────────
{
  const VI40 = 'Các mô hình thu nhỏ theo tỷ lệ ("scale") và các mô hình giải trí tương tự, có hoặc không vận hành';
  const EN40 = 'Reduced size ("scale") models and similar recreational models, working or not';
  const md = (vi, en) => V.tachVe(vi, en).ve.flatMap((v) => v.menhDe);
  const m40 = md(VI40, EN40);
  check('B1 950300 .40: vế MỞ "và các mô hình giải trí tương tự"', m40.some((x) => x.loai === 'MO' && x.chu === 'và các mô hình giải trí tương tự'), m40);
  check('B2 … danh từ đầu chỉ còn "Các mô hình thu nhỏ theo tỷ lệ ("scale")"', m40.some((x) => x.loai === 'DAU' && x.chu === 'Các mô hình thu nhỏ theo tỷ lệ ("scale")'), m40);
  check('B3 bảo thủ: chữ Anh không có "similar"/"the like" ⇒ vẫn đọc như cũ (không vế mở mới)', !md(VI40, 'Reduced size ("scale") models and recreational models, working or not').some((x) => x.loai === 'MO'));
  const ngan = md('Ống chỉ, lõi suốt, guồng quay tơ và sản phẩm tương tự dùng cho sợi dệt', 'Bobbins, spools, reels and similar supports for textile yarn');
  check('B4 mẫu cũ (≤ 4 chữ giữa "và" và "tương tự") không đổi: 761699 .40 vế MỞ "và sản phẩm tương tự"', ngan.some((x) => x.loai === 'MO' && x.chu === 'và sản phẩm tương tự'), ngan);
  const khac = md('Bơm và các loại máy nén khí khác', 'Pumps and other air compressors');
  check('B5 "và các loại … khác" không bị ảnh hưởng', khac.filter((x) => x.loai === 'MO').length === 1, khac);
  const xa = md('Van và các thiết bị điều khiển bằng tay có cấu tạo tương tự nhau dùng cho nồi hơi', 'Valves and similar appliances for boilers');
  check('B6 không nuốt dấu hiệu bổ nghĩa: "và các … tương tự" chỉ khi KHÔNG có dấu hiệu giới hạn chen giữa (bằng/có/dùng cho …)', !xa.some((x) => x.loai === 'MO' && /bằng tay/.test(x.chu)), xa);
  // Bản nháp 950300 bị trả về (đông cứng 49dae40): liệt kê ĐÓNG .40 ⇒ nay cổng 5 bắt (trước máy không thấy).
  const b = JSON.parse(fs.readFileSync(path.join(DC_49, '950300.json'), 'utf8'));
  const r = C.kiemRanhGioi('950300', b, { cong: [0, 3, 5] });
  check('B7 950300 TRA_VE (liệt kê đóng ["mô hình thu nhỏ theo tỷ lệ","mô hình giải trí"]) ⇒ cong5-ve-mo-bi-bo:95030040', co(r.loi, 'cong5-ve-mo-bi-bo:95030040:và các mô hình giải trí tương tự'), r.loi);
}

// ── C. 950300 soạn lại (#713): .40 TUONG_TU ["mô hình thu nhỏ theo tỷ lệ"] ─────────────────────────────────────────────────
const DK = require('../lib/dieu-kien-so.js');
const { docKhoa } = require('../lib/ho-so/doc-du-kien.js');
const SPEC8 = (pn6) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts', 'fixtures', 'ho-so', 'spec-vong-8', `${pn6}.json`), 'utf8'));
const tuSpec8 = (pn6) => { const r = C.apSpec(SPEC8(pn6), null, { ngay: '2026-11-01' }); if (!r.banNhap) throw new Error(`spec ${pn6}: ${r.loi.join(' | ')}`); return r; };
/** Dữ kiện đọc từ một mô tả hàng (cùng bộ đọc lúc chạy) cho mọi khoá của sổ tay. */
const docHang = (soTay, t) => {
  const facts = [...new Set(DK.traiPhang([...soTay.dong8, ...soTay.dieuKienNut].flatMap((m) => m.dieuKienSo)).flatMap((c) => DK.factCuaDieuKien(c)))];
  return facts.map((f) => [f, docKhoa(f, t)]).filter(([, r]) => r && r.trangThai === 'DA_CO')
    .map(([f, r]) => ({ fact: f, giaTri: r.giaTri, ...(r.donVi ? { donVi: r.donVi } : {}), nguon: 'KHACH', trangThai: 'DA_CO', bangChung: r.bangChung }));
};
{
  const { banNhap: b, loi } = tuSpec8('950300');
  const d40 = b.dong8.find((m) => m.hs === '95030040').dieuKienSo;
  check('C1 apSpec 950300 không lỗi; .40 = [tenLoai TUONG_TU ["mô hình thu nhỏ theo tỷ lệ"]]', loi.length === 0 && JSON.stringify(d40) === JSON.stringify([{ fact: 'tenLoai', op: 'TUONG_TU', value: ['mô hình thu nhỏ theo tỷ lệ'] }]), d40);
  const cu = JSON.parse(fs.readFileSync(path.join(DC_49, '950300.json'), 'utf8'));
  const dk = (x, hs) => JSON.stringify(x.dong8.find((m) => m.hs === hs).dieuKienSo);
  check('C2 .10 (soát đợt 5 đạt) và các dòng khác giữ nguyên — chỉ .40 đổi', b.dong8.every((m) => m.hs === '95030040' || dk(b, m.hs) === dk(cu, m.hs)) && JSON.stringify(b.dieuKienNut) === JSON.stringify(cu.dieuKienNut));
  const r = C.kiemRanhGioi('950300', b);
  check('C3 950300 XANH đủ cổng (cổng 5 phủ vế mở .40 bằng TUONG_TU; .91–.93 tới được nhờ vector "tên anh em + không tương tự")', r.hopLe === true, r.loi);
  check('C4 … cảnh báo cong2-tuong-tu-chua-chot cho .40 ↔ anh em nêu tên (đúng thiết kế, không khai chongLanTruc)', co(r.canhBao, 'cong2-tuong-tu-chua-chot:95030021+95030040') && !b.chongLanTruc && !b.chongLanVanBan, r.canhBao.filter((c) => c.includes('tuong-tu')));
  const v = C.phanTichVe('950300', b).chiTiet.find((x) => x.ma === '95030040').ve.flatMap((x) => x.menhDe);
  check('C5 … vế MỞ "và các mô hình giải trí tương tự" trạng thái PHU', v.some((x) => x.loai === 'MO' && x.trangThai === 'PHU'), v);
  // Lúc chạy (sổ tay sinh từ bản nháp, dữ kiện đọc bằng docKhoa — như người soát đợt 5).
  const soTay = C.soTayTuNhap('950300', b);
  const pn = (dk, st = soTay) => DK.doiChieuPhanNhom('950300', dk, { soTay: st });
  const ket = (r1, hs) => r1.dong.find((d) => d.hs === hs).ketQua;
  const mb = pn(docHang(soTay, 'Mô hình máy bay bằng nhựa'));
  check('C6 "Mô hình máy bay bằng nhựa" ⇒ .40 HỎI (THIEU), không còn MAU_THUAN như bản trả về; không tự chốt .99', ket(mb, '95030040') === 'THIEU' && !mb.dongCo.includes('95030099'), mb.dong);
  const stCu = C.soTayTuNhap('950300', cu);
  const cu40 = pn(docHang(stCu, 'Mô hình máy bay bằng nhựa'), stCu);
  check('C7 … (đối chứng) bản trả về 49dae40: .40 MAU_THUAN', ket(cu40, '95030040') === 'MAU_THUAN', cu40.dong);
  const KHOA40 = DK.khoaTuongTu(d40[0]);
  const oto = docHang(soTay, 'Mô hình ô tô thu nhỏ tỷ lệ 1:18');
  check('C8 "Mô hình ô tô thu nhỏ tỷ lệ 1:18": bộ đọc tên không có "theo tỷ lệ" ⇒ .40 HỎI câu tương tự (không TRÁI)', ket(pn(oto), '95030040') === 'THIEU', oto);
  const otoCo = oto.map((d) => (d.fact === 'tenLoai' ? { ...d, tuongTu: { [KHOA40]: true } } : d));
  check('C9 … trả lời "tương tự mô hình thu nhỏ theo tỷ lệ = có" ⇒ chỉ .40', JSON.stringify(pn(otoCo).dongCo) === '["95030040"]', pn(otoCo).dong);
  const ten = [{ fact: 'tenLoai', giaTri: 'mô hình thu nhỏ theo tỷ lệ của ô tô', nguon: 'KHACH', trangThai: 'DA_CO' }];
  check('C10 tên nêu đủ "mô hình thu nhỏ theo tỷ lệ" ⇒ .40 tất định', JSON.stringify(pn(ten).dongCo) === '["95030040"]', pn(ten).dong);
}

// ── D. 848180 soạn lại (#714): anh em nêu đích cùng khoá dungCho; trục chỉ cặp có hàng thật ─────────────────────────────────
{
  const { banNhap: b, loi } = tuSpec8('848180');
  const nut = (id) => b.dieuKienNut.find((m) => m.id === id).dieuKienSo;
  check('D1 apSpec 848180 không lỗi', loi.length === 0, loi);
  check('D2 anh em nêu ĐÍCH cùng khoá dungCho: r14535 "săm", r14538 "lốp không săm", 8481802 "xi lanh khí dầu mỏ hóa lỏng", r14551 "đường ống nước"',
    nut('848180~r14535')[0].fact === 'dungCho' && nut('848180~r14538')[0].fact === 'dungCho' && nut('8481802').some((c) => c.fact === 'dungCho' && c.value === 'xi lanh khí dầu mỏ hóa lỏng')
    && JSON.stringify(nut('848180~r14551')) === JSON.stringify([{ fact: 'dungCho', op: 'CONG_DUNG', value: 'đường ống nước' }]));
  check('D3 r14559 "Van nối có núm" giữ tenLoai (tên loại van, không đổi khoá để né)', JSON.stringify(nut('848180~r14559')) === JSON.stringify([{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Van nối có núm' }]));
  const cu = JSON.parse(fs.readFileSync(path.join(DC_49, '848180.json'), 'utf8'));
  const giu = ['84818093', '84818097', '84818030', '84818012', '84818014'];
  check('D4 phần soát đợt 5 đạt giữ nguyên (.93 vật liệu khác, .97 daXuLyBeMat, .30 nhienLieu GA, .12/.14)', giu.every((hs) => JSON.stringify(b.dong8.find((m) => m.hs === hs)) === JSON.stringify(cu.dong8.find((m) => m.hs === hs))));
  check('D5 BO_VE .12/.14 giữ', ['84818012', '84818014'].every((ma) => b.ghiChuSoan.some((g) => g.loai === 'BO_VE' && g.ma === ma)));
  const [c0, c1] = b.chongLanTruc || [];
  check('D6 cụm trục tầng 848180 chỉ còn 8481805 (DAC_DIEM) ↔ r14551 (CONG_DUNG), có viDuHang', b.chongLanTruc.length === 2 && JSON.stringify(c0.nhanh) === '["8481805","848180~r14551"]' && c0.truc['8481805'] === 'DAC_DIEM' && c0.truc['848180~r14551'] === 'CONG_DUNG' && c0.viDuHang.length === 1 && c0.phanXu === null);
  check('D7 cụm r14562 giữ 6 nhánh, viDuHang đủ 5 cặp r14573 ↔ tên', c1.nhanh.length === 6 && c1.viDuHang.length === 5 && c1.viDuHang.every((v) => v.cap.includes('848180~r14573')) && c1.phanXu === null);
  for (const c of [c0, c1]) for (const v of c.viDuHang) {
    const [p, q] = v.cap;
    check(`D8 hàng ví dụ ${p}↔${q} thoả cả hai nhánh: "${v.hang}"`, C.thuViDuHang('848180', b, p, q, v.hang).thoa && C.thuViDuHang('848180', b, q, p, v.hang).thoa);
  }
  const r = C.kiemRanhGioi('848180', b, { cong: [0, 1, 3, 5] });
  check('D9 cổng 0/1/3/5 XANH; DỪNG đúng hai ghi chú DUNG (8481805, r14559 — cặp không có hàng thật, chờ GĐ chốt luật chứng minh)', r.hopLe === true && JSON.stringify(r.dung.sort()) === '["DUNG:8481805","DUNG:848180~r14559"]', { loi: r.loi, dung: r.dung });
  // Ba vector của người soát đợt 5, thử lại trên bản soạn lại.
  const soTay = C.soTayTuNhap('848180', b);
  const dkv = (o) => Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO' }));
  const ca = (hs, o) => DK.doiChieuDong8(hs, dkv(o), { soTay }).ketQua === 'CO';
  const DONG = [{ viTri: 'CHINH', chatLieu: 'đồng' }];
  check('D10 "Van đường ống nước" + dùng cho "săm" ⇒ không còn .11 và .63 cùng CO (cùng khoá dungCho)', !(ca('84818011', { tenLoai: 'Van đường ống nước', dungCho: 'săm', chatLieu: DONG }) && ca('84818063', { tenLoai: 'Van đường ống nước', dungCho: 'săm', chatLieu: DONG })));
  check('D11 "Van xi lanh khí dầu mỏ hóa lỏng" + dùng cho "lốp không săm" ⇒ không còn .13 và .21 cùng CO', !(ca('84818013', { tenLoai: 'Van xi lanh khí dầu mỏ hóa lỏng', dungCho: 'lốp không săm', chatLieu: DONG, duongKinhTrong: 10 }) && ca('84818021', { tenLoai: 'Van xi lanh khí dầu mỏ hóa lỏng', dungCho: 'lốp không săm', chatLieu: DONG, duongKinhTrong: 10 })));
  check('D12 (DỪNG có chủ đích) "Van nối có núm" + có khoang pha trộn ⇒ .59 và .67 vẫn cùng CO trên vector — khoá đặc điểm ↔ tên, không có hàng thật nên không khai trục',
    ca('84818059', { tenLoai: 'Van nối có núm', coKhoangPhaTron: true, chatLieu: DONG, duongKinhTrong: 30 }) && ca('84818067', { tenLoai: 'Van nối có núm', coKhoangPhaTron: true, chatLieu: DONG, duongKinhTrong: 30 }));
  const tron = { ...Object.fromEntries(docHang(soTay, c0.viDuHang[0].hang).map((d) => [d.fact, d.giaTri])), chatLieu: DONG, duongKinhTrong: 20 };
  check('D13 van trộn nước nóng lạnh bằng đồng dùng cho đường ống nước ⇒ thoả 8481805 lẫn r14551 lúc chạy (.59 và .63 cùng CO — trục đã khai, hỏi chuyên gia)', ca('84818059', tron) && ca('84818063', tron), tron);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
