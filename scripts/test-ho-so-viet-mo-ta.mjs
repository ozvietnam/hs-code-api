// scripts/test-ho-so-viet-mo-ta.mjs — `vietMoTa` sáu khối + căn cứ GIR sau đối chiếu (plan L1-5c; spec hồ sơ §8.4, §8.6, §8.10,
// §10; quyết định người điều phối sau L1-5b).
// Chạy trên dữ liệu THẬT (cây HS, sổ tay đã duyệt, tu-vung@1, legal-basis). Mô tả hàng là GIẢ (tự viết cho test).
// Ca âm CV 755 lấy từ data/bench/cv755-am.json. KHÔNG đọc bộ đề lát 1 (data/bench/ho-so-lat-1*), KHÔNG đọc data/oz-export/*.
// Mọi LLM / tham chiếu kho Oz đều là STUB: không lời gọi mạng nào, không LLM thật.
import './test-isolate-data.mjs';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const gir = require('../lib/gir.js');
const LB = require('../lib/legal-basis.js');
const S = require('../lib/so-tay.js');
const HC = require('../lib/ho-so/hieu-chinh.js');
const HS = require('../lib/ho-so/index.js');
const { isPrivate } = require('../lib/llm-privacy.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${typeof x === 'string' ? x : JSON.stringify(x).slice(0, 900)}`); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const chuan = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const nguonCua = (h4) => ({ ...S.sourcesFor(h4), ...S.nguonTieuDe(h4) });
const MAU_CAM = [/xuất xứ/i, /không gồm/i, /kể cả/i, /\bhoặc\b/i, /^(các|những) loại/i];
const chuoiRa = (r) => [r.moTaEcus, r.khaiTiepHys, r.moTaDayDu, r.ghiChu, r.moTaBanNhap].filter((x) => typeof x === 'string');

// ── Stub ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function llmStub(tra) {
  const goi = [];
  const fn = async (yc) => { goi.push({ yc: clone(yc), rieng: isPrivate() }); return typeof tra === 'function' ? tra(yc) : clone(tra); };
  fn.goi = goi;
  return fn;
}
const llmCam = async () => { throw new Error('LLM không được gọi ở chế độ MAY / bản nháp'); };
llmCam.goi = [];

/** dungDuongDi → docDuKien → khungHoSo → doiChieu (nguồn ngoài là stub). */
async function dung(ma, dauVao, o = {}) {
  const dd = HS.dungDuongDi(ma, o.loaiToKhai || 'NHAP');
  const duKien = await HS.docDuKien(dauVao, dd, { llm: async () => [] });
  const khung = HS.khungHoSo(dd, { duKien, hang: { tenVi: dauVao.tenHang || null } });
  const truoc = clone(khung);
  const hoSo = await HS.doiChieu(khung, { moTa: dauVao.moTa, tinHieuDanhMuc: async () => [], tienLeMaKhac: async () => [] });
  return { dd, duKien, hoSo, truoc };
}
const nutGir = (canCu) => (canCu.girRulesApplied || []).flatMap((g) => ((g.evidence && g.evidence.ranhGioi) || []).map((r) => r.nut));

// ════ A. Căn cứ GIR sau đối chiếu: không trích ranh giới MAU_THUAN / THIEU (quyết định người điều phối) ════════════════
{
  let goiGir = 0;
  const goc = gir.girTuDuongDi;
  gir.girTuDuongDi = (...a) => { goiGir += 1; return goc(...a); };
  // 85362091: dòng điện 20 A trái ranh giới "dưới 16 A" (MAU_THUAN), hai ranh giới phủ định anh em CO.
  const r = await dung('85362091', { tenHang: 'Aptomat tép 1 cực', moTa: 'Aptomat tép 1 cực dùng cho tủ điện công nghiệp, dòng điện định mức 20A, mới 100%', duKien: [{ fact: 'tenLoai', giaTri: 'aptomat tép', nguon: 'KHACH', bangChung: 'Aptomat tép' }] });
  gir.girTuDuongDi = goc;
  const mt = r.hoSo.duongDiPhapLy.filter((e) => e.ketQua === 'MAU_THUAN').map((e) => e.nut);
  check('A1 85362091 dòng điện 20 A ⇒ MAU_THUAN ở ranh giới 85362091', r.hoSo.ketLuan.trangThai === 'MAU_THUAN' && mt.includes('85362091'), r.hoSo.duongDiPhapLy.map((e) => [e.nut, e.ketQua]));
  check('A2 trước đối chiếu (chưa dữ kiện) canCu trích cả 85362091', nutGir(r.truoc.canCu).includes('85362091'), nutGir(r.truoc.canCu));
  check('A3 sau đối chiếu canCu.girRulesApplied KHÔNG trích ranh giới MAU_THUAN 85362091', !nutGir(r.hoSo.canCu).includes('85362091'), nutGir(r.hoSo.canCu));
  check('A4 sau đối chiếu vẫn trích ranh giới CO (8536201, 85362020)', ['8536201', '85362020'].every((n) => nutGir(r.hoSo.canCu).includes(n)), nutGir(r.hoSo.canCu));
  check('A5 doiChieu tính lại canCu qua lib/gir.js#girTuDuongDi (spy thấy lời gọi)', goiGir >= 2, goiGir);
  check('A6 mọi girRulesApplied có basis hợp lệ', r.hoSo.canCu.girRulesApplied.every((g) => ['RULE_TABLE', 'DETERMINISTIC', 'HEURISTIC', 'LLM_ASSERTED'].includes(g.basis)));
  check('A7 canCuPhapLy.girDeterminations khớp số GIR sau đối chiếu', r.hoSo.canCu.canCuPhapLy && JSON.stringify(r.hoSo.canCu.canCuPhapLy).length > 0 && r.hoSo.canCu.girRulesApplied.length === 1, r.hoSo.canCu.girRulesApplied.length);
  // 96170020: hàng hoàn chỉnh ⇒ ranh giới duy nhất MAU_THUAN ⇒ không còn GIR nào trích nó
  const p = await dung('96170020', { tenHang: 'Phích giữ nhiệt', moTa: 'Phích chân không hoàn chỉnh, hàng hoàn chỉnh, mới 100%' });
  check('A8 96170020 hàng hoàn chỉnh ⇒ MAU_THUAN, maTroToi 96170010', p.hoSo.ketLuan.trangThai === 'MAU_THUAN' && p.hoSo.ketLuan.maTroToi === '96170010', p.hoSo.ketLuan);
  check('A9 96170020 MAU_THUAN ⇒ girRulesApplied không trích 96170020', !nutGir(p.hoSo.canCu).includes('96170020'), p.hoSo.canCu.girRulesApplied);
  // 84135040 thiếu lưu lượng ⇒ ranh giới THIEU không được trích
  const q = await dung('84135040', { tenHang: 'Bơm nước kiểu piston', moTa: 'Bơm nước kiểu piston, mới 100%' });
  check('A10 84135040 thiếu lưu lượng ⇒ THIEU_DU_KIEN, không GIR trích ranh giới chưa CO', q.hoSo.ketLuan.trangThai === 'THIEU_DU_KIEN' && !nutGir(q.hoSo.canCu).includes('84135040'), nutGir(q.hoSo.canCu));
  // Đủ dữ kiện ⇒ GIR giữ nguyên như trước đối chiếu
  const d = await dung('84135040', { tenHang: 'Bơm nước kiểu piston', moTa: 'Bơm nước kiểu piston, lưu lượng 10.000 m³/h, mới 100%' });
  check('A11 84135040 đủ dữ kiện (mọi ranh giới CO) ⇒ GIR như trước đối chiếu', JSON.stringify(d.hoSo.canCu.girRulesApplied) === JSON.stringify(d.truoc.canCu.girRulesApplied) && nutGir(d.hoSo.canCu).includes('84135040'));
  // gir.girTuDuongDi trực tiếp: mục THIEU/MAU_THUAN loại khỏi bằng chứng; mục null (chưa đối chiếu) giữ
  const ds = clone(d.truoc.duongDiPhapLy);
  const g0 = goc(ds).determinations.length;
  ds.forEach((e) => { e.ketQua = 'MAU_THUAN'; });
  check('A12 girTuDuongDi: mọi mục MAU_THUAN ⇒ không GIR nào', g0 > 0 && goc(ds).determinations.length === 0, { g0 });
}

// ════ B. vietMoTa MAY — hồ sơ đủ dữ kiện, tổng chữ ~260 ký tự (84135040) ═════════════════════════════════════════════════
const TEN_BOM = 'Bơm nước kiểu piston chuyển động tịnh tiến, trục ngang, dẫn động bằng động cơ điện';
const MO_TA_BOM = `${TEN_BOM}, lưu lượng 10.000 m³/h, công suất 75 kW, điện áp 380V, kích thước 1200x800x900 mm, model: KQ-XYZ-900-2026, nhãn hiệu: Kaiquan, NSX: Shanghai Kaiquan Pump Group Company Limited, xuất xứ Trung Quốc, mới 100%`;
const bom = await dung('84135040', { tenHang: TEN_BOM, moTa: MO_TA_BOM });
check('B0 hồ sơ bơm 84135040 DU_CAN_CU', bom.hoSo.ketLuan.trangThai === 'DU_CAN_CU', bom.hoSo.ketLuan);
const hoSoBomGoc = clone(bom.hoSo);
const vb = await HS.vietMoTa(bom.hoSo, { cheDo: 'MAY', llm: llmCam });
{
  const tong = vb.bangGiaiTrinh.filter((b) => b.cum).map((b) => b.cumTat || b.cum).join(', ');
  check('B1 tổng chữ các cụm > 240 ký tự (ca 260)', tong.length > 240, tong.length);
  check('B2 không bản nháp, có moTaEcus', vb.banNhap === false && typeof vb.moTaEcus === 'string' && vb.moTaEcus.length > 0, vb);
  check('B3 moTaEcus ≤ 200 ký tự', vb.moTaEcus.length <= 200, vb.moTaEcus.length);
  check('B4 phần dư ở khaiTiepHys (không bỏ dữ kiện)', typeof vb.khaiTiepHys === 'string' && vb.khaiTiepHys.length > 0, vb.khaiTiepHys);
  check('B5 kiemTra.tuongDuong === true', vb.kiemTra.tuongDuong === true, vb.kiemTra);
  check('B6 kiemTra.viPham rỗng', Array.isArray(vb.kiemTra.viPham) && vb.kiemTra.viPham.length === 0, vb.kiemTra.viPham);
  check('B7 moTaEcus bắt đầu bằng tên hàng', vb.moTaEcus.startsWith(TEN_BOM), vb.moTaEcus);
  check('B8 dữ kiện quyết định (lưu lượng) nằm trong moTaEcus, ngay sau tên hàng', vb.moTaEcus.indexOf('lưu lượng 10000m3/h') === TEN_BOM.length + 2, vb.moTaEcus);
  const all = chuoiRa(vb);
  check('B9 không chuỗi nào chứa xuất xứ / không gồm / kể cả / hoặc / Các loại', all.every((s) => MAU_CAM.every((re) => !re.test(s))), all);
  const kt = `${vb.moTaEcus}, ${vb.khaiTiepHys}`.match(/KT: [\dx,]+mm/g) || [];
  check('B10 "KT: …mm" đúng một lần, đơn vị ghi một lần', kt.length === 1 && (kt[0].match(/mm/g) || []).length === 1, kt);
  check('B11 nhãn hiệu (tờ khai nhập) có trong moTaEcus ∪ khaiTiepHys', `${vb.moTaEcus} ${vb.khaiTiepHys}`.includes('nhãn hiệu Kaiquan'));
  check('B12 moTaDayDu không viết tắt (không KT:/CS:/ĐA:/NSX:)', !/\b(KT|CS|NSX):|ĐA:/.test(vb.moTaDayDu) && vb.moTaDayDu.includes('kích thước 1200x800x900mm') && vb.moTaDayDu.includes('nhà sản xuất Shanghai Kaiquan Pump Group Company Limited'), vb.moTaDayDu);
  const hys = LB.citeChiTieu('1.68.luuY.hys');
  check('B13 khaiTiepHys có căn cứ citeChiTieu(1.68.luuY.hys)', vb.canCu && vb.canCu.khaiTiep && vb.canCu.khaiTiep.trich === hys.trich, vb.canCu);
  check('B14 mục HYS trong bảng giải trình ghi viTri HYS + căn cứ vị trí 1.68', vb.bangGiaiTrinh.some((b) => b.viTri === 'HYS') && vb.bangGiaiTrinh.filter((b) => b.viTri === 'HYS').every((b) => b.canCuViTri && b.canCuViTri.trich === hys.trich));
  check('B15 căn cứ mô tả = citeChiTieu(1.78.1)', vb.canCu.chiTieuMoTa && vb.canCu.chiTieuMoTa.trich === LB.citeChiTieu('1.78.1').trich);
  // Bảng giải trình
  const src = nguonCua('8413');
  const trichLuat = new Set(Object.keys(LB.CHI_TIEU_TT121).map((id) => LB.citeChiTieu(id).trich));
  const loiTrich = vb.bangGiaiTrinh.filter((b) => b.canCu).filter((b) => !(trichLuat.has(b.canCu.trich) || HC.coNguyenVan(b.canCu.trich, src[b.canCu.nguon && b.canCu.nguon.ma] || '')));
  check('B16 mọi bangGiaiTrinh[].canCu.trich có nguyên văn trong nguồn (sổ tay hoặc legal-basis)', loiTrich.length === 0, loiTrich);
  const ll = vb.bangGiaiTrinh.find((b) => b.vaiTro === 'DU_KIEN_QUYET_DINH' && b.fact === 'luuLuong');
  check('B17 cụm lưu lượng: vai trò dữ kiện quyết định, căn cứ trích tax.84135040, vì sao bắt buộc nêu mã anh em', ll && ll.canCu && ll.canCu.nguon.ma === 'tax.84135040' && Array.isArray(ll.viSaoBatBuoc.maRe) && ll.viSaoBatBuoc.maRe.length > 0 && !ll.viSaoBatBuoc.maRe.includes('84135040'), ll);
  check('B18 nguồn giá trị: mọi cụm có giá trị khách khai kèm bằng chứng là đoạn con của đầu vào', vb.bangGiaiTrinh.filter((b) => b.nguonGiaTri && b.nguonGiaTri.bangChung).every((b) => `${TEN_BOM}. ${MO_TA_BOM}`.includes(b.nguonGiaTri.bangChung)), vb.bangGiaiTrinh.map((b) => b.nguonGiaTri));
  const note = vb.bangGiaiTrinh.find((b) => b.vaiTro === 'GHI_CHU_RANH_GIOI');
  check('B19 nhóm cạnh tranh 8481 chưa có ranh giới duyệt ⇒ ghi chú hiện trong bangGiaiTrinh', note && /chưa số hoá ranh giới với nhóm 8481/.test(note.ghiChu) && note.viTri === 'KHONG_VIET', note);
  check('B20 ghi chú ranh giới không chặn DU_CAN_CU (vẫn có moTaEcus)', vb.banNhap === false);
  check('B21 MAY không gọi LLM', llmCam.goi.length === 0);
  check('B22 vietMoTa không sửa hồ sơ đầu vào (hàm thuần)', JSON.stringify(bom.hoSo) === JSON.stringify(hoSoBomGoc));
  check('B23 cheDoDung MAY', vb.kiemTra.cheDoDung === 'MAY');
  check('B24 taiLieuKyThuatNenKem là mảng', Array.isArray(vb.taiLieuKyThuatNenKem));
  check('B25 không ghiChu khi luật không định', vb.ghiChu == null);
  check('B26 không chữ "chỉ tiêu"/"TT 39" gõ tay trong mô tả', chuoiRa(vb).every((s) => !/chỉ tiêu|TT 39|Thông tư/i.test(s)));
}

// ════ C. Đọc ngược qua tu-vung (kiemTuongDuong) ═══════════════════════════════════════════════════════════════════════════
{
  const cum = vb.cumDaKiem;
  check('C1 kết quả có danh sách cụm đã kiểm', Array.isArray(cum) && cum.length >= 5, cum);
  const ok = HS.kiemTuongDuong(cum, vb.moTaEcus, vb.khaiTiepHys);
  check('C2 kiemTuongDuong trên kết quả = true', ok.tuongDuong === true, ok);
  const mat = HS.kiemTuongDuong(cum, vb.moTaEcus.replace('lưu lượng 10000m3/h', ''), vb.khaiTiepHys);
  check('C3 bỏ cụm lưu lượng ⇒ tuongDuong false, ghi thiếu luuLuong', mat.tuongDuong === false && mat.thieu.includes('luuLuong'), mat);
  const lech = HS.kiemTuongDuong(cum, vb.moTaEcus.replace('lưu lượng 10000m3/h', 'lưu lượng 5000m3/h'), vb.khaiTiepHys);
  check('C4 đổi giá trị lưu lượng ⇒ tuongDuong false (đọc ngược ra giá trị khác)', lech.tuongDuong === false, lech);
}

// ════ D. Cụm ngắn vừa ô (96170020) ═════════════════════════════════════════════════════════════════════════════════════
{
  const r = await dung('96170020', { tenHang: 'Vỏ ngoài phích giữ nhiệt', moTa: 'Vỏ ngoài bằng thép không gỉ của phích chân không, là bộ phận của phích, chưa có ruột, kích thước 80x80x250 mm, không nhãn hiệu, mới 100%' });
  const v = await HS.vietMoTa(r.hoSo, { cheDo: 'MAY' });
  check('D1 96170020 DU_CAN_CU ⇒ moTaEcus, không HYS', v.banNhap === false && v.moTaEcus && v.khaiTiepHys == null, v);
  check('D2 có cụm "là bộ phận" và "không nhãn hiệu"', v.moTaEcus.includes('là bộ phận') && v.moTaEcus.includes('không nhãn hiệu'), v.moTaEcus);
  check('D3 không chép chữ biểu "trừ ruột thủy tinh"/"Các bộ phận"', !/ruột thủy tinh|Các bộ phận/i.test(v.moTaEcus), v.moTaEcus);
}

// ════ E. "Loại khác": mệnh đề loại trừ viết thành sự thật về hàng (85362099) ═════════════════════════════════════════════
{
  const r = await dung('85362099', { tenHang: 'Aptomat tép 1 cực', moTa: 'Aptomat tép 1 cực dùng cho tủ điện công nghiệp, dòng điện định mức 32A, nhãn hiệu: Schneider, model: A9F74132, mới 100%', duKien: [{ fact: 'tenLoai', giaTri: 'aptomat tép', nguon: 'KHACH', bangChung: 'Aptomat tép' }] });
  check('E0 85362099 DU_CAN_CU', r.hoSo.ketLuan.trangThai === 'DU_CAN_CU', r.hoSo.ketLuan);
  const v = await HS.vietMoTa(r.hoSo, { cheDo: 'MAY' });
  check('E1 viết giá trị thật của hàng (dòng điện 32A, dùng cho tủ điện công nghiệp)', v.moTaEcus && v.moTaEcus.includes('dòng điện 32A') && v.moTaEcus.includes('dùng cho tủ điện công nghiệp'), v.moTaEcus);
  check('E2 không chép chữ dòng anh em ("dưới 16 A", "hộp đúc", "nhiệt điện gia dụng", "Loại khác")', !/dưới 16|hộp đúc|nhiệt điện gia dụng|loại khác/i.test(`${v.moTaEcus} ${v.moTaDayDu}`), v.moTaEcus);
  const pk = v.bangGiaiTrinh.find((b) => b.fact === 'dongDien');
  check('E3 cụm dòng điện giải trình: loại trừ dòng anh em 85362091 (maRe)', pk && pk.viSaoBatBuoc.maRe.includes('85362091'), pk);
  check('E4 tuongDuong + viPham rỗng', v.kiemTra.tuongDuong === true && v.kiemTra.viPham.length === 0, v.kiemTra);
}

// ════ F. Bản nháp khi chưa DU_CAN_CU (Review Focus 4) ═══════════════════════════════════════════════════════════════════
{
  const r = await dung('84135040', { tenHang: 'Bơm nước kiểu piston', moTa: 'Bơm nước kiểu piston, nhãn hiệu: Kaiquan, mới 100%' });
  const v = await HS.vietMoTa(r.hoSo, { cheDo: 'LLM', llm: llmCam });
  check('F1 THIEU_DU_KIEN ⇒ banNhap true, moTaEcus null', v.banNhap === true && v.moTaEcus == null && v.khaiTiepHys == null, v);
  check('F2 bản nháp có chỗ trống "[cần: lưu lượng]"', typeof v.moTaBanNhap === 'string' && v.moTaBanNhap.includes('[cần: lưu lượng]'), v.moTaBanNhap);
  check('F3 cauHoi ở cấp trên cùng, có Vi + Zh', Array.isArray(v.cauHoi) && v.cauHoi.some((q) => q.fact === 'luuLuong' && q.vi && q.zh), v.cauHoi);
  check('F4 nhãn bản nháp rõ ràng, lý do = trạng thái', /nháp/i.test(v.nhanBanNhap || '') && v.lyDoBanNhap.includes('THIEU_DU_KIEN'), v);
  check('F5 bản nháp không có khoá tiếng Anh trong chỗ trống', !/\[cần: [a-z]+[A-Z]/.test(v.moTaBanNhap));
  check('F6 bản nháp không gọi LLM kể cả cheDo LLM', llmCam.goi.length === 0);
  const m = await dung('96170020', { tenHang: 'Phích giữ nhiệt', moTa: 'Phích chân không hoàn chỉnh, hàng hoàn chỉnh, mới 100%' });
  const vm = await HS.vietMoTa(m.hoSo, { cheDo: 'MAY' });
  check('F7 MAU_THUAN ⇒ banNhap, không moTaEcus, nêu maTroToi + câu hỏi', vm.banNhap === true && vm.moTaEcus == null && vm.maTroToi === '96170010' && vm.cauHoi.length > 0 && vm.lyDoBanNhap.includes('MAU_THUAN'), vm);
  const x = await dung('84135040', { tenHang: TEN_BOM, moTa: MO_TA_BOM }, { loaiToKhai: 'XUAT' });
  const vx = await HS.vietMoTa(x.hoSo, { cheDo: 'MAY' });
  check('F8 tờ khai XUAT ⇒ bản nháp, lý do khuôn 2.69 chưa hỗ trợ', vx.banNhap === true && vx.moTaEcus == null && vx.lyDoBanNhap.includes('khuon-2.69-chua-ho-tro'), vx);
  check('F9 tờ khai XUAT ⇒ không có nhãn hiệu ở bất kỳ chuỗi nào', chuoiRa(vx).every((s) => !s.includes('nhãn hiệu')), chuoiRa(vx));
  // CAN_CHUYEN_GIA: ranh giới chưa số hoá ⇒ bản nháp
  const ca = clone(bom.hoSo); ca.ketLuan = { ...ca.ketLuan, trangThai: 'CAN_CHUYEN_GIA', chuaChot: ['chua-so-hoa:841350'] };
  const vc = await HS.vietMoTa(ca, { cheDo: 'MAY' });
  check('F10 CAN_CHUYEN_GIA ⇒ bản nháp, không moTaEcus', vc.banNhap === true && vc.moTaEcus == null && vc.lyDoBanNhap.includes('CAN_CHUYEN_GIA'), vc);
}

// ════ G. Ca âm CV 755 (mô tả sơ sài) ⇒ không bao giờ ra moTaEcus "đạt" ══════════════════════════════════════════════════
{
  const cv = JSON.parse(fs.readFileSync('data/bench/cv755-am.json', 'utf8')).ca;
  const loi = []; let chay = 0;
  for (const c of cv) {
    if (c.loaiToKhai !== 'NHAP' || !c.maHsChay || !c.maHsChay.ma) continue;
    let r;
    try { r = await dung(c.maHsChay.ma, { moTa: c.moTaSoSai }); } catch { continue; }
    chay += 1;
    const v = await HS.vietMoTa(r.hoSo, { cheDo: 'MAY' });
    if (v.moTaEcus || v.banNhap !== true) loi.push(c.id);
  }
  check('G1 chạy được ≥ 3 ca âm CV 755', chay >= 3, chay);
  check('G2 mọi ca âm CV 755 ⇒ bản nháp, không moTaEcus', loi.length === 0, loi);
}

// ════ H. Chế độ LLM: chỉ viết lại trong cùng dữ kiện; trượt ⇒ bản MAY ════════════════════════════════════════════════════
const phich = await dung('96170020', { tenHang: 'Vỏ ngoài phích giữ nhiệt', moTa: 'Vỏ ngoài bằng thép không gỉ của phích chân không, là bộ phận của phích, chưa có ruột, kích thước 80x80x250 mm, không nhãn hiệu, mới 100%' });
const vMay = await HS.vietMoTa(phich.hoSo, { cheDo: 'MAY' });
const OZ = [{ hs: '96170020', moTa: 'Vỏ phích inox giữ nhiệt hiệu ABC model Q1 công ty TNHH Khách Hàng Thật, mới 100%' }];
const thamChieuStub = (o = {}) => { const f = async (q) => { f.goi.push(q); return { oz: q.oz ? clone(OZ) : [], tbTchq: [{ hs: '96170020', soHieu: '9999/TB-TCHQ', moTa: 'Vỏ phích bằng thép không gỉ' }], ...o }; }; f.goi = []; return f; };
{
  const tot = 'Vỏ ngoài phích giữ nhiệt, là bộ phận, KT: 80x80x250mm, không nhãn hiệu, mới 100%';
  const s = llmStub({ moTaEcus: tot });
  const tc = thamChieuStub();
  const v = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s, thamChieu: tc });
  check('H1 LLM viết lại giữ đủ dữ kiện ⇒ dùng bản LLM', v.kiemTra.cheDoDung === 'LLM' && v.moTaEcus === tot && v.kiemTra.tuongDuong === true, v);
  check('H2 LLM nhận danh sách cụm đã kiểm (không nhận chữ khách nguyên văn)', s.goi.length === 1 && Array.isArray(s.goi[0].yc.cum) && !JSON.stringify(s.goi[0].yc).includes('chưa có ruột'), s.goi[0] && s.goi[0].yc);
  check('H3 lượt công khai (rieng không bật) ⇒ không xin câu Oz, payload không có câu Oz', tc.goi[0] && tc.goi[0].oz === false && !JSON.stringify(s.goi[0].yc).includes('Khách Hàng Thật') && s.goi[0].rieng === false, { tc: tc.goi, rieng: s.goi[0].rieng });
  check('H4 tham chiếu TB-TCHQ trả kèm số hiệu', v.thamChieu && v.thamChieu.tbTchq.some((t) => t.soHieu === '9999/TB-TCHQ'), v.thamChieu);

  const s2 = llmStub({ moTaEcus: tot });
  const tc2 = thamChieuStub();
  const v2 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s2, thamChieu: tc2, rieng: true });
  check('H5 khoá dịch vụ (rieng) ⇒ LLM chạy trong withPrivateData', s2.goi.length === 1 && s2.goi[0].rieng === true, s2.goi);
  check('H6 rieng ⇒ câu Oz đi vào payload LLM làm mẫu văn phong', tc2.goi[0].oz === true && JSON.stringify(s2.goi[0].yc).includes('Khách Hàng Thật'));
  check('H7 phản hồi không bao giờ chứa câu Oz (duyệt sâu)', !JSON.stringify(v2).includes('Khách Hàng Thật') && !JSON.stringify(v2).includes('model Q1'), JSON.stringify(v2).slice(0, 300));

  const s3 = llmStub({ moTaEcus: 'Vỏ ngoài phích giữ nhiệt, là bộ phận, công suất 5 kW, KT: 80x80x250mm, không nhãn hiệu, mới 100%' });
  const v3 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s3, thamChieu: thamChieuStub() });
  check('H8 LLM chèn "công suất 5 kW" không có trong hồ sơ ⇒ trả bản MAY', v3.kiemTra.cheDoDung === 'MAY' && v3.moTaEcus === vMay.moTaEcus, v3.moTaEcus);
  check('H9 viPham ghi lý do bản LLM bị loại (giá trị lạ)', v3.kiemTra.viPham.some((x) => /^llm-bi-loai:gia-tri-la/.test(x)), v3.kiemTra.viPham);
  check('H10 bản MAY trả về vẫn là bản đạt (không bản nháp)', v3.banNhap === false);

  const s4 = llmStub({ moTaEcus: 'Vỏ ngoài phích giữ nhiệt, KT: 80x80x250mm, không nhãn hiệu, mới 100%' });
  const v4 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s4, thamChieu: thamChieuStub() });
  check('H11 LLM bỏ dữ kiện quyết định (là bộ phận) ⇒ bản MAY + lý do thiếu dữ kiện', v4.kiemTra.cheDoDung === 'MAY' && v4.moTaEcus === vMay.moTaEcus && v4.kiemTra.viPham.some((x) => x === 'llm-bi-loai:thieu-du-kien:laBoPhan'), v4.kiemTra);

  const s5 = llmStub({ moTaEcus: OZ[0].moTa });
  const v5 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s5, thamChieu: thamChieuStub(), rieng: true });
  check('H12 LLM chép nguyên văn câu Oz ⇒ bị chặn, trả bản MAY', v5.kiemTra.cheDoDung === 'MAY' && v5.kiemTra.viPham.some((x) => x === 'llm-bi-loai:chep-cau-oz') && !JSON.stringify(v5).includes('Khách Hàng Thật'), v5.kiemTra);
  const gan = 'Vỏ ngoài phích inox giữ nhiệt hiệu ABC model Q1 công ty TNHH Khách Hàng Thật mới 100% là bộ phận';
  check('H13 jaccardToken ≥ 0,8 với câu Oz gần giống', HS.jaccardToken(gan, OZ[0].moTa) >= 0.8, HS.jaccardToken(gan, OZ[0].moTa));

  const s6 = async () => { throw new Error('nhà cung cấp lỗi'); };
  const v6 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s6, thamChieu: thamChieuStub() });
  check('H14 LLM lỗi ⇒ không ném, trả bản MAY', v6.kiemTra.cheDoDung === 'MAY' && v6.moTaEcus === vMay.moTaEcus && v6.kiemTra.viPham.some((x) => /^llm-bi-loai:loi-goi/.test(x)), v6.kiemTra);

  const s7 = llmStub({ moTaEcus: `${tot}, ${'x'.repeat(200)}` });
  const v7 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s7, thamChieu: thamChieuStub() });
  check('H15 LLM vượt 200 ký tự ⇒ bản MAY', v7.kiemTra.cheDoDung === 'MAY' && v7.kiemTra.viPham.some((x) => x === 'llm-bi-loai:qua-dai'), v7.kiemTra);

  const s8 = llmStub({ moTaEcus: 'Các loại vỏ phích giữ nhiệt, là bộ phận, KT: 80x80x250mm, không nhãn hiệu, mới 100%' });
  const v8 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s8, thamChieu: thamChieuStub() });
  check('H16 LLM dùng mẫu chữ biểu thuế ⇒ bản MAY', v8.kiemTra.cheDoDung === 'MAY' && v8.kiemTra.viPham.some((x) => /^llm-bi-loai:mau-chu-bieu-thue/.test(x)), v8.kiemTra);

  const s9 = llmStub({ moTaEcus: 'Vỏ ngoài phích giữ nhiệt, là bộ phận, KT: 80x80x300mm, không nhãn hiệu, mới 100%' });
  const v9 = await HS.vietMoTa(phich.hoSo, { cheDo: 'LLM', llm: s9, thamChieu: thamChieuStub() });
  check('H17 LLM đổi số kích thước ⇒ bản MAY', v9.kiemTra.cheDoDung === 'MAY', v9.kiemTra);

  // Bơm: LLM chỉ viết lại phần ô ECUS, khaiTiepHys giữ bản máy
  const s10 = llmStub((yc) => ({ moTaEcus: yc.banMay.moTaEcus }));
  const v10 = await HS.vietMoTa(bom.hoSo, { cheDo: 'LLM', llm: s10, thamChieu: thamChieuStub({ tbTchq: [] }) });
  check('H18 LLM nhận bản máy (ECUS + HYS); trả lại y nguyên ⇒ dùng được, HYS giữ bản máy', v10.kiemTra.cheDoDung === 'LLM' && v10.khaiTiepHys === vb.khaiTiepHys && v10.moTaEcus === vb.moTaEcus, v10.kiemTra);
}

// ════ I. AI_CHUA_KIEM không vào mô tả ═════════════════════════════════════════════════════════════════════════════════════
{
  const r = await dung('96170020', { tenHang: 'Vỏ ngoài phích giữ nhiệt', moTa: 'Vỏ ngoài bằng thép không gỉ của phích chân không, là bộ phận của phích, không nhãn hiệu, mới 100%', duKien: [{ fact: 'kichThuoc', giaTri: [77, 77, 333], nguon: 'AI_CHUA_KIEM' }] });
  const v = await HS.vietMoTa(r.hoSo, { cheDo: 'MAY' });
  check('I1 giá trị AI_CHUA_KIEM (KT 77x77x333) không có ở chuỗi nào', !JSON.stringify(chuoiRa(v)).includes('333'), chuoiRa(v));
  check('I2 thông số kiểm hoá thiếu ⇒ ghi trong kiemTra.thieuThongSoKiemHoa (không chặn)', v.banNhap === false && v.kiemTra.thieuThongSoKiemHoa.includes('kichThuoc'), v.kiemTra);
  const q = await dung('84135040', { tenHang: 'Bơm nước kiểu piston', moTa: 'Bơm nước kiểu piston, mới 100%', duKien: [{ fact: 'luuLuong', giaTri: 9000, donVi: 'm3/h', nguon: 'AI_CHUA_KIEM' }] });
  const vq = await HS.vietMoTa(q.hoSo, { cheDo: 'MAY' });
  check('I3 dữ kiện quyết định chỉ có AI_CHUA_KIEM ⇒ bản nháp, giá trị AI chỉ ở câu hỏi (goiY)', vq.banNhap === true && !JSON.stringify(chuoiRa(vq)).includes('9000') && vq.cauHoi.some((x) => x.fact === 'luuLuong' && x.goiY && x.goiY.nguonLoai === 'AI_CHUA_KIEM'), vq);
}

// ════ J. Máy chặn: chữ biểu thuế, khoá tiếng Anh, xuất xứ ════════════════════════════════════════════════════════════════
{
  const h = clone(phich.hoSo); h.hang.tenVi = 'Các loại vỏ phích hoặc nắp phích';
  const v = await HS.vietMoTa(h, { cheDo: 'MAY' });
  check('J1 tên hàng mang mẫu chữ biểu thuế ⇒ máy chặn: bản nháp + viPham', v.banNhap === true && v.moTaEcus == null && v.kiemTra.viPham.some((x) => /^mau-chu-bieu-thue/.test(x)), v);
  const h2 = clone(phich.hoSo); h2.hang.tenVi = 'Vỏ phích luuLuong';
  const v2 = await HS.vietMoTa(h2, { cheDo: 'MAY' });
  check('J2 khoá tiếng Anh camelCase trong chuỗi ⇒ máy chặn', v2.banNhap === true && v2.kiemTra.viPham.some((x) => /^khoa-tieng-anh/.test(x)), v2.kiemTra);
  const h3 = clone(phich.hoSo); h3.nhanDien = { ...h3.nhanDien, model: 'iPhoneCase_X2' };
  h3.duKien.push({ fact: 'model', giaTri: 'iPhoneCase_X2', nguon: 'KHACH', bangChung: 'model: iPhoneCase_X2', trangThai: 'DA_CO' });
  const v3 = await HS.vietMoTa(h3, { cheDo: 'MAY' });
  check('J3 model khách khai dạng camelCase/snake_case không bị coi là khoá tiếng Anh', v3.banNhap === false && v3.moTaEcus.includes('model iPhoneCase_X2'), v3.kiemTra);
  const h4 = clone(phich.hoSo); h4.hang.tenVi = 'Vỏ ngoài phích giữ nhiệt, xuất xứ Trung Quốc';
  const v4 = await HS.vietMoTa(h4, { cheDo: 'MAY' });
  check('J4 "xuất xứ" trong tên khách ⇒ bỏ khỏi chuỗi (không chặn), ghi kiemTra.daBo', v4.banNhap === false && chuoiRa(v4).every((s) => !/xuất xứ|Trung Quốc/.test(s)) && v4.kiemTra.daBo.includes('xuat-xu'), v4);
  const h5 = clone(phich.hoSo); h5.hang.tenVi = null; h5.duKien = h5.duKien.filter((d) => d.fact !== 'tenLoai');
  const v5 = await HS.vietMoTa(h5, { cheDo: 'MAY' });
  check('J5 không có tên hàng ⇒ bản nháp "[cần: tên loại hàng]"', v5.banNhap === true && /\[cần: tên loại hàng\]/.test(v5.moTaBanNhap || ''), v5);
}

// ════ K. Trích không nguyên văn ⇒ loại, ghi trichBiLoai, không bao giờ trả ═══════════════════════════════════════════════
{
  const h = clone(phich.hoSo);
  h.duongDiPhapLy[0].nguon.trich = '96170020 - Bộ phận bằng thép của phích theo câu bịa XYZ';
  const v = await HS.vietMoTa(h, { cheDo: 'MAY' });
  check('K1 trích bịa không xuất hiện ở đâu trong kết quả, trừ trichBiLoai', !JSON.stringify({ ...v, trichBiLoai: undefined }).includes('câu bịa XYZ'), v.bangGiaiTrinh);
  check('K2 trichBiLoai ghi mục bị loại', Array.isArray(v.trichBiLoai) && v.trichBiLoai.some((t) => t.nut === '96170020'), v.trichBiLoai);
  check('K3 dữ kiện quyết định mất căn cứ ⇒ bản nháp (không tô hồng)', v.banNhap === true && v.moTaEcus == null, v);
}

// ════ L. ghiChu theo luật định (1.68.8) + gợi ý số thông báo PTPL (1.78.3) ═══════════════════════════════════════════════
{
  const v = await HS.vietMoTa(phich.hoSo, { cheDo: 'MAY', choKqptpl: { stt: 2, sttGiong: 1, soToKhai: '105123456789' } });
  check('L1 hàng chờ KQPTPL ⇒ ghiChu theo mẫu 1.68 (8), ≤ 100 ký tự', v.ghiChu === 'đề nghị giải phóng hàng, stt 2 giống stt 1 tại tk 105123456789 đang chờ KQPTPL' && v.ghiChu.length <= 100, v.ghiChu);
  check('L2 ghiChu kèm căn cứ citeChiTieu(1.68.8)', v.canCu.ghiChu && v.canCu.ghiChu.trich === LB.citeChiTieu('1.68.8').trich, v.canCu);
  const h = clone(phich.hoSo);
  h.nhanDien.nhaSanXuat = 'Công ty Phích Nước ABC';
  h.tienLe = [{ loai: 'TB_TCHQ', soHieu: '1234/TB-KĐ4', ngay: '2026-03-02', maHs: '96170020', nhaSanXuat: 'Công ty Phích Nước ABC' }, { loai: 'TB_TCHQ', soHieu: '7777/TB-KĐ4', maHs: '96170020', nhaSanXuat: 'NSX khác' }];
  const v2 = await HS.vietMoTa(h, { cheDo: 'MAY' });
  check('L3 tiền lệ đúng mã cùng NSX ⇒ gợi ý số/ngày thông báo theo 1.78 (3), không tự chèn vào mô tả', v2.goiYThongBaoPtpl && v2.goiYThongBaoPtpl.soHieu === '1234/TB-KĐ4' && v2.goiYThongBaoPtpl.canCu.trich === LB.citeChiTieu('1.78.3').trich && !v2.moTaEcus.includes('1234'), v2.goiYThongBaoPtpl);
  check('L4 tiền lệ khác NSX không được gợi ý', !JSON.stringify(v2.goiYThongBaoPtpl).includes('7777'));
  const v3 = await HS.vietMoTa(phich.hoSo, { cheDo: 'MAY', choKqptpl: { stt: 2, sttGiong: 1, soToKhai: '1'.repeat(120) } });
  check('L5 ghiChu vượt 100 ký tự ⇒ không trả ghiChu, ghi viPham', v3.ghiChu == null && v3.kiemTra.viPham.includes('ghi-chu-qua-100-ky-tu'), v3);
}

// ════ M. Nén: viết tắt chuẩn trước khi chuyển sang HYS ═══════════════════════════════════════════════════════════════════
{
  check('M1 moTaEcus dùng viết tắt chuẩn (KT:/CS:/NSX:) khi ô chật', /KT: |CS: |NSX: /.test(`${vb.moTaEcus} ${vb.khaiTiepHys}`), vb.moTaEcus);
  check('M2 viết tắt chỉ từ DANH_MUC_VIET_TAT', ((`${vb.moTaEcus}, ${vb.khaiTiepHys}`).match(/(?:^|, )([A-ZĐ]{2,4}):/g) || []).map((x) => x.replace(/^, /, '').replace(':', '')).every((t) => Object.prototype.hasOwnProperty.call(require('../lib/tu-vung.js').DANH_MUC_VIET_TAT, t)));
  check('M3 nhận diện không bị chuyển sang HYS trước thông số kiểm hoá', !(vb.khaiTiepHys.includes('nhãn hiệu') && !vb.khaiTiepHys.includes('KT:') && vb.moTaEcus.includes('KT:')), { e: vb.moTaEcus, h: vb.khaiTiepHys });
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
