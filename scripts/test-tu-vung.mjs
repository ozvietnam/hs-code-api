#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * L1-3a (#570) — từ vựng dữ kiện có kiểu `tu-vung@1` (spec hồ sơ phân loại §8.2).
 * Kiểm: máy đọc giá trị (docGiaTri), viết cụm (vietCum), câu hỏi (cauHoiCho), máy kiểm lược đồ (kiemTuVung),
 * bảng ánh xạ bộ từ vựng cũ (kiemAnhXaCu) và độ phủ dữ kiện quyết định của bộ đề lát 1 (doPhuBoDe).
 * Không gọi mạng, không gọi LLM, không ghi data/.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../lib/tu-vung.js');
const N = require('../lib/nguon-loai.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 600)); } };
const coTrong = (r, text) => typeof r?.bangChung === 'string' && r.bangChung.length > 0 && text.includes(r.bangChung);

// ── 1. CO_KHONG + phủ định Vi/En/Zh ─────────────────────────────────────────────────────────────────────────
{
  const t = 'cáp đã gắn đầu nối Type-C';
  const r = T.docGiaTri('daGanDauNoi', t);
  check('CO_KHONG: "đã gắn đầu nối" ⇒ true, bangChung là đoạn con nguyên văn chứa "gắn đầu nối"', r.trangThai === 'DA_CO' && r.giaTri === true && coTrong(r, t) && r.bangChung.includes('gắn đầu nối'), r);
  for (const [txt, lang] of [['cáp không có đầu nối', 'vi'], ['无接头 数据线', 'zh'], ['non-connectorized cable', 'en'], ['cable without connector', 'en'], ['dây chưa lắp đầu nối', 'vi']]) {
    const x = T.docGiaTri('daGanDauNoi', txt, lang);
    check(`CO_KHONG phủ định: "${txt}" ⇒ false + bangChung nguyên văn`, x.trangThai === 'DA_CO' && x.giaTri === false && coTrong(x, txt), x);
  }
  const en = T.docGiaTri('daGanDauNoi', 'USB cable fitted with connectors');
  check('CO_KHONG tiếng Anh khẳng định: "fitted with connectors" ⇒ true', en.trangThai === 'DA_CO' && en.giaTri === true, en);
  const k = T.docGiaTri('daGanDauNoi', 'cáp điện bọc nhựa PVC');
  check('CO_KHONG không có chữ nào ⇒ CHUA_BIET', k.trangThai === 'CHUA_BIET' && k.giaTri === undefined, k);
  const tn = T.docGiaTri('coKhungChupQuaDau', 'Tai nghe không có khung chụp qua đầu, kết nối bluetooth');
  check('coKhungChupQuaDau: "không có khung chụp qua đầu" ⇒ false', tn.trangThai === 'DA_CO' && tn.giaTri === false, tn);
  const dg = T.docGiaTri('daGhi', 'Thẻ nhớ SD 64GB loại chưa ghi');
  check('daGhi: "chưa ghi" ⇒ false', dg.trangThai === 'DA_CO' && dg.giaTri === false, dg);
}

// ── 2. SO: quy đổi về donViChuan, giữ gốc ─────────────────────────────────────────────────────────────────
{
  const t = 'size 12.9 x 8.2 x 4.2 cm';
  const r = T.docGiaTri('kichThuoc', t);
  check('kichThuoc "12.9 x 8.2 x 4.2 cm" ⇒ [129, 82, 42] mm, goc giữ cm', r.trangThai === 'DA_CO' && JSON.stringify(r.giaTri) === '[129,82,42]' && r.donVi === 'mm' && r.goc?.donVi === 'cm' && JSON.stringify(r.goc?.giaTri) === '[12.9,8.2,4.2]' && coTrong(r, t), r);
  const r2 = T.docGiaTri('kichThuoc', 'KT: 129x82x42mm');
  check('kichThuoc "129x82x42mm" ⇒ [129, 82, 42] mm', JSON.stringify(r2.giaTri) === '[129,82,42]' && r2.donVi === 'mm', r2);
  const so = (khoa, txt) => T.docGiaTri(khoa, txt);
  const ca = [
    ['dienAp', 'Rơ le tiếp điểm định mức 24VDC', 24, 'V'],
    ['dienAp', 'dùng cho điện áp không quá 1.000 V', 1000, 'V'],
    ['dienAp', '额定电压：220V', 220, 'V'],
    ['congSuat', 'Động cơ điện xoay chiều 2,2 kW', 2200, 'W'],
    ['congSuat', 'quạt 60W', 60, 'W'],
    ['dongDien', 'aptomat 10A 2 cực', 10, 'A'],
    ['tanSo', 'dải tần 300 Hz', 300, 'Hz'],
    ['luuLuong', 'bơm nước lưu lượng 5 m3/h', 5, 'm3/h'],
    ['dungTichXiLanh', 'trục khuỷu xe dung tích 5.200 cc', 5200, 'cc'],
    ['duongKinh', 'bánh xe đẩy đường kính 125 mm', 125, 'mm'],
    ['duongKinhTrong', 'van bi DN25 bằng đồng', 25, 'mm'],
    ['duongKinhTrong', 'vòi có đường kính trong 2,5 cm', 25, 'mm'],
    ['duongKinhLoi', 'cáp lõi mỗi sợi 0,3 mm', 0.3, 'mm'],
    ['chieuCao', 'micro cao 3 mm', 3, 'mm'],
    ['chieuDaiCuon', 'cáp điện cuộn dài 500 cm', 5, 'm'],
    ['khoiLuong', 'van khối lượng 2,5 kg', 2.5, 'kg'],
  ];
  for (const [khoa, txt, v, u] of ca) {
    const x = so(khoa, txt);
    check(`SO ${khoa}: "${txt}" ⇒ ${v} ${u}`, x.trangThai === 'DA_CO' && Math.abs(x.giaTri - v) < 1e-9 && x.donVi === u && coTrong(x, txt), x);
  }
  const ctx = so('duongKinh', 'bánh xe đẩy 125mm');
  check('SO cần ngữ cảnh (duongKinh): số chiều dài không có chữ "đường kính" ⇒ CHUA_BIET', ctx.trangThai === 'CHUA_BIET', ctx);
  const kl = so('khoiLuong', 'điện thoại 5G');
  check('khoiLuong: "5G" (mạng) không đọc thành 5 g', kl.trangThai === 'CHUA_BIET', kl);
}

// ── 3. LIET_KE ────────────────────────────────────────────────────────────────────────────────────────────
{
  const a = T.docGiaTri('loaiDongDien', 'Động cơ một chiều 24V');
  check('LIET_KE loaiDongDien "một chiều" ⇒ MOT_CHIEU', a.trangThai === 'DA_CO' && a.giaTri === 'MOT_CHIEU' && coTrong(a, 'Động cơ một chiều 24V'), a);
  const b = T.docGiaTri('loaiDongDien', 'DC motor 12V', 'en');
  check('LIET_KE loaiDongDien "DC motor" ⇒ MOT_CHIEU', b.giaTri === 'MOT_CHIEU', b);
  const c = T.docGiaTri('kieuDongCoDien', 'động cơ xoay chiều, không phải động cơ bước');
  check('LIET_KE bị phủ định ("không phải động cơ bước") không gán giá trị', c.trangThai === 'CHUA_BIET', c);
  const d = T.docGiaTri('mauHienThi', 'màn hình cảm ứng 7 inch');
  check('LIET_KE không có giá trị nào trong giaTriHopLe ⇒ CHUA_BIET', d.trangThai === 'CHUA_BIET', d);
  check('kiemGiaTri: LIET_KE giá trị ngoài giaTriHopLe ⇒ CHUA_BIET; trong danh sách ⇒ DA_CO',
    T.kiemGiaTri('loaiDongDien', 'BA_CHIEU').trangThai === 'CHUA_BIET' && T.kiemGiaTri('loaiDongDien', 'XOAY_CHIEU').trangThai === 'DA_CO');
  const e = T.docGiaTri('tinhTrang', 'Tai nghe, mới 100%');
  check('tinhTrang "mới 100%" ⇒ MOI', e.giaTri === 'MOI', e);
}

// ── 4. CHAT_LIEU_THEO_VI_TRI (tái dùng mẫu vật liệu của lib/so-tay-gates.js) ─────────────────────────────────
{
  const t = 'Cáp điện cách điện bằng plastic, lõi đồng';
  const r = T.docGiaTri('chatLieu', t);
  const has = (v, cl) => (r.giaTri || []).some((x) => x.viTri === v && x.chatLieu === cl);
  check('chatLieu: "cách điện bằng plastic" ⇒ CACH_DIEN/plastic; "lõi đồng" ⇒ LOI/đồng', r.trangThai === 'DA_CO' && has('CACH_DIEN', 'plastic') && has('LOI', 'đồng') && coTrong(r, t), r);
  const s = T.docGiaTri('chatLieu', 'Khóa cửa bằng thép không gỉ');
  check('chatLieu: "thép không gỉ" thắng "thép" (cụm dài hơn), vị trí CHINH', s.giaTri?.length === 1 && s.giaTri[0].chatLieu === 'thép không gỉ' && s.giaTri[0].viTri === 'CHINH', s);
  const g = T.docGiaTri('chatLieu', 'Khay nhựa vân gỗ');
  check('chatLieu: "vân gỗ" không phải chất liệu gỗ (luật bề ngoài của so-tay-gates)', g.giaTri?.some((x) => x.chatLieu === 'plastic') && !g.giaTri?.some((x) => x.chatLieu === 'gỗ'), g);
  check('kiemGiaTri chatLieu: vật liệu lạ / vị trí lạ ⇒ CHUA_BIET',
    T.kiemGiaTri('chatLieu', [{ viTri: 'CHINH', chatLieu: 'kryptonite' }]).trangThai === 'CHUA_BIET'
    && T.kiemGiaTri('chatLieu', [{ viTri: 'MAI', chatLieu: 'plastic' }]).trangThai === 'CHUA_BIET'
    && T.kiemGiaTri('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }]).trangThai === 'DA_CO');
}

// ── 5. CONG_DUNG / TEN_LOAI ───────────────────────────────────────────────────────────────────────────────
{
  const t = 'Động cơ dùng cho máy giặt, 220V';
  const r = T.docGiaTri('dungCho', t);
  check('CONG_DUNG dungCho: "dùng cho máy giặt" ⇒ "máy giặt"', r.trangThai === 'DA_CO' && r.giaTri === 'máy giặt' && coTrong(r, t) && r.bangChung.includes('dùng cho máy giặt'), r);
  const zh = T.docGiaTri('dungCho', '电机 用于洗衣机', 'zh');
  check('CONG_DUNG dungCho tiếng Trung "用于洗衣机" ⇒ "洗衣机"', zh.giaTri === '洗衣机', zh);
  const n = T.docGiaTri('tenLoai', 'Khóa cửa bằng thép, mới 100%');
  check('TEN_LOAI tenLoai: danh từ đầu "Khóa cửa" (productHead của so-tay-gates), bangChung nguyên văn', n.trangThai === 'DA_CO' && n.giaTri === 'khóa cửa' && n.bangChung === 'Khóa cửa', n);
  const m = T.docGiaTri('model', 'Tai nghe, model: AB-12, mới 100%');
  check('TEN_LOAI model: "model: AB-12" ⇒ "AB-12"', m.giaTri === 'AB-12' && coTrong(m, 'Tai nghe, model: AB-12, mới 100%'), m);
  const h = T.docGiaTri('nhanHieu', 'Tai nghe, nhãn hiệu: Sony');
  check('TEN_LOAI nhanHieu ⇒ "Sony"', h.giaTri === 'Sony', h);
}

// ── 6. vietCum + cauHoiCho ───────────────────────────────────────────────────────────────────────────────
check('vietCum kichThuoc tắt ⇒ "KT: 129x82x42mm" (đơn vị một lần ở cuối)', T.vietCum('kichThuoc', [129, 82, 42], { tat: true }) === 'KT: 129x82x42mm', T.vietCum('kichThuoc', [129, 82, 42], { tat: true }));
check('vietCum kichThuoc đủ ⇒ "kích thước 129x82x42mm"', T.vietCum('kichThuoc', [129, 82, 42], { tat: false }) === 'kích thước 129x82x42mm', T.vietCum('kichThuoc', [129, 82, 42]));
check('vietCum dienAp tắt ⇒ "ĐA: 220V"', T.vietCum('dienAp', 220, { tat: true }) === 'ĐA: 220V', T.vietCum('dienAp', 220, { tat: true }));
check('vietCum số lẻ kiểu Việt: 0.3 ⇒ "0,3mm"', T.vietCum('duongKinhLoi', 0.3, { tat: false }) === 'đường kính lõi 0,3mm', T.vietCum('duongKinhLoi', 0.3));
check('vietCum hàng dài theo m: chieuDaiCuon 100 ⇒ "dài 100m"', T.vietCum('chieuDaiCuon', 100) === 'dài 100m', T.vietCum('chieuDaiCuon', 100));
check('vietCum CO_KHONG: true/false ⇒ "đã gắn đầu nối" / "chưa gắn đầu nối"', T.vietCum('daGanDauNoi', true) === 'đã gắn đầu nối' && T.vietCum('daGanDauNoi', false) === 'chưa gắn đầu nối', [T.vietCum('daGanDauNoi', true), T.vietCum('daGanDauNoi', false)]);
check('vietCum LIET_KE: MOT_CHIEU ⇒ "một chiều"; giá trị ngoài danh sách ⇒ null', T.vietCum('loaiDongDien', 'MOT_CHIEU') === 'một chiều' && T.vietCum('loaiDongDien', 'BA_CHIEU') === null);
check('vietCum chatLieu: CACH_DIEN ⇒ "cách điện bằng plastic"; CHINH tắt ⇒ "CL: thép không gỉ"',
  T.vietCum('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }]) === 'cách điện bằng plastic'
  && T.vietCum('chatLieu', [{ viTri: 'CHINH', chatLieu: 'thép không gỉ' }], { tat: true }) === 'CL: thép không gỉ',
  [T.vietCum('chatLieu', [{ viTri: 'CACH_DIEN', chatLieu: 'plastic' }]), T.vietCum('chatLieu', [{ viTri: 'CHINH', chatLieu: 'thép không gỉ' }], { tat: true })]);
check('vietCum nhaSanXuat tắt dùng viết tắt NSX', T.vietCum('nhaSanXuat', 'ABC Co., Ltd', { tat: true }) === 'NSX: ABC Co., Ltd', T.vietCum('nhaSanXuat', 'ABC Co., Ltd', { tat: true }));
check('cauHoiCho trả câu Vi và Zh khác rỗng; ngôn ngữ lạ rơi về Vi', T.cauHoiCho('daGanDauNoi', 'vi').length > 5 && /[㐀-鿿]/.test(T.cauHoiCho('daGanDauNoi', 'zh')) && T.cauHoiCho('daGanDauNoi', 'fr') === T.cauHoiCho('daGanDauNoi', 'vi'));
{
  let nem = false; try { T.docGiaTri('khoaKhongCo', 'x'); } catch { nem = true; }
  check('khoá không có trong từ vựng ⇒ ném lỗi (không đoán)', nem);
}

// ── 7. Máy kiểm lược đồ (kiemTuVung) trên từ vựng giả ─────────────────────────────────────────────────────
const tvGia = () => ({
  phienBan: 'tu-vung@1',
  heDonVi: { dai: { mm: 1, cm: 10, m: 1000 }, dienAp: { V: 1, kV: 1000 } },
  khoa: [
    { khoa: 'dienAp', kieu: 'SO', nhanVi: 'điện áp', nhanEn: 'voltage', nhanZh: '电压', vietTat: 'ĐA', heDonVi: 'dienAp', donViChuan: 'V', cachDoc: { vi: ['điện áp'], en: ['voltage'], zh: ['电压'] }, cachViet: { vi: 'điện áp {giaTri}', viTat: 'ĐA: {giaTri}' }, cauHoi: { vi: 'Điện áp?', zh: '电压？' }, nguonLoai: 'CLAUDE_DUYET' },
    { khoa: 'coX', kieu: 'CO_KHONG', nhanVi: 'có X', nhanEn: 'has X', nhanZh: '有X', cachDoc: { vi: ['x'], en: ['x'], zh: ['x'], phuDinh: ['không'] }, cachViet: { vi: 'có X', viPhuDinh: 'không có X' }, cauHoi: { vi: 'Có X?', zh: '有X吗？' }, nguonLoai: 'CLAUDE_DUYET' },
    { khoa: 'loaiY', kieu: 'LIET_KE', nhanVi: 'loại Y', nhanEn: 'Y type', nhanZh: 'Y类', giaTriHopLe: ['A'], moTaGiaTri: { A: { nhanVi: 'a', nhanEn: 'a', nhanZh: 'a', cachDoc: { vi: ['a'], en: ['a'], zh: ['a'] } } }, cachDoc: { vi: [], en: [], zh: [] }, cachViet: { vi: '{giaTri}' }, cauHoi: { vi: 'Loại Y?', zh: 'Y类？' }, nguonLoai: 'CLAUDE_DUYET' },
  ],
});
check('kiemTuVung: từ vựng giả hợp lệ ⇒ không lỗi', T.kiemTuVung(tvGia()).length === 0, T.kiemTuVung(tvGia()));
const loiCo = (mut, ma) => { const tv = tvGia(); mut(tv); const l = T.kiemTuVung(tv); return l.some((x) => x.startsWith(ma)) ? true : l; };
for (const [ten, mut, ma] of [
  ['khoá trùng', (tv) => tv.khoa.push({ ...tv.khoa[0] }), 'khoa-trung'],
  ['kieu lạ', (tv) => { tv.khoa[0].kieu = 'CHUOI'; }, 'kieu-la'],
  ['CO_KHONG thiếu cachDoc.phuDinh', (tv) => { delete tv.khoa[1].cachDoc.phuDinh; }, 'co-khong-thieu-phu-dinh'],
  ['CO_KHONG thiếu cachViet.viPhuDinh', (tv) => { delete tv.khoa[1].cachViet.viPhuDinh; }, 'co-khong-thieu-viet-phu-dinh'],
  ['vietTat ngoài DANH_MUC_VIET_TAT', (tv) => { tv.khoa[0].vietTat = 'ĐAX'; }, 'viet-tat-ngoai-danh-muc'],
  ['thiếu cauHoi.zh', (tv) => { delete tv.khoa[0].cauHoi.zh; }, 'thieu-cau-hoi-zh'],
  ['thiếu nhãn tiếng Trung (3 ngôn ngữ — CEO)', (tv) => { delete tv.khoa[0].nhanZh; }, 'thieu-nhan-zh'],
  ['thiếu nhãn tiếng Anh', (tv) => { delete tv.khoa[1].nhanEn; }, 'thieu-nhan-en'],
  ['SO: donViChuan không thuộc hệ đơn vị', (tv) => { tv.khoa[0].donViChuan = 'W'; }, 'so-don-vi-chuan-ngoai-he'],
  ['SO chiều dài: donViChuan khác mm/m (CEO: mm, hàng dài m)', (tv) => { tv.khoa.push({ ...tv.khoa[0], khoa: 'dai', vietTat: undefined, heDonVi: 'dai', donViChuan: 'cm' }); }, 'so-dai-don-vi-chuan'],
  ['LIET_KE: giá trị không có mô tả', (tv) => { tv.khoa[2].giaTriHopLe.push('B'); }, 'liet-ke-thieu-mo-ta-gia-tri'],
  ['LIET_KE: giaTriHopLe rỗng', (tv) => { tv.khoa[2].giaTriHopLe = []; tv.khoa[2].moTaGiaTri = {}; }, 'liet-ke-rong'],
  ['mẫu cachDoc không phải regex hợp lệ', (tv) => { tv.khoa[0].cachDoc.vi.push('(điện'); }, 'mau-khong-hop-le'],
  ['nguonLoai không thuộc nhãn soạn (AI_CHUA_KIEM cấm)', (tv) => { tv.khoa[0].nguonLoai = 'AI_CHUA_KIEM'; }, 'nguon-loai-khong-hop-le'],
  ['khoá không phải camelCase', (tv) => { tv.khoa[0].khoa = 'dien_ap'; }, 'khoa-khong-camel'],
]) check(`kiemTuVung ĐỎ khi ${ten}`, loiCo(mut, ma) === true, loiCo(mut, ma));
check('DANH_MUC_VIET_TAT đúng 5 mục CEO đã duyệt (spec §6)', JSON.stringify(Object.keys(T.DANH_MUC_VIET_TAT).sort()) === JSON.stringify(['CL', 'CS', 'KT', 'NSX', 'ĐA'].sort()), T.DANH_MUC_VIET_TAT);

// ── 8. Từ vựng thật ───────────────────────────────────────────────────────────────────────────────────────
const tv = T.taiTuVung();
check('tu-vung@1.json thật qua máy kiểm lược đồ (0 lỗi)', T.kiemTuVung(tv).length === 0, T.kiemTuVung(tv));
check('phienBan "tu-vung@1"; băm sha256 cho HoSoPhanLoai.phienBan.tuVung', tv.phienBan === 'tu-vung@1' && /^[0-9a-f]{64}$/.test(T.phienBan().sha256), T.phienBan());
check('đủ 6 kiểu dữ kiện của spec §8.2', ['SO', 'CO_KHONG', 'LIET_KE', 'CHAT_LIEU_THEO_VI_TRI', 'CONG_DUNG', 'TEN_LOAI'].every((k) => tv.khoa.some((x) => x.kieu === k)));
check('nhãn tệp: tu-vung/*.json ⇒ CLAUDE_DUYET (lib/nguon-loai.js)', N.nhanCuaTep('tu-vung/tu-vung@1.json') === 'CLAUDE_DUYET' && N.nhanCuaTep('data/tu-vung/anh-xa-cu.json') === 'CLAUDE_DUYET');

// ── 9. Bảng ánh xạ bộ từ vựng cũ ─────────────────────────────────────────────────────────────────────────
{
  const ax = JSON.parse(fs.readFileSync('data/tu-vung/anh-xa-cu.json', 'utf8'));
  check('anh-xa-cu: ghi đủ 9 bộ từ vựng hiện có, mỗi bộ có tệp + số tên', Array.isArray(ax.boTuVung) && ax.boTuVung.length === 9 && ax.boTuVung.every((b) => b.ten && Array.isArray(b.tep) && b.tep.length && Number.isInteger(b.soTen)), ax.boTuVung);
  check('anh-xa-cu thật: mọi khoá cũ có thật ở nguồn, mọi khoá mới có trong tu-vung@1 (0 lỗi)', T.kiemAnhXaCu(ax, tv).length === 0, T.kiemAnhXaCu(ax, tv));
  const hong = { ...ax, anhXa: { ...ax.anhXa, 'data/attributes.json#voltage': 'khoaKhongCo', 'data/attributes.json#khongCoThat': 'dienAp' } };
  const l = T.kiemAnhXaCu(hong, tv);
  check('kiemAnhXaCu ĐỎ khi khoá mới không có trong từ vựng / khoá cũ không có ở nguồn', l.some((x) => x.startsWith('anh-xa-khoa-moi-khong-co')) && l.some((x) => x.startsWith('anh-xa-khoa-cu-khong-co')), l);
}

// ── 10. Độ phủ dữ kiện quyết định của bộ đề ─────────────────────────────────────────────────────────────────
{
  const boDeGia = { ca: [
    { id: 'G-1', duKienQuyetDinh: [{ cap: 6, duKien: 'đã lắp với đầu nối điện' }, { cap: 8, duKien: 'điện áp không quá 80 V' }] },
    { id: 'G-2', duKienQuyetDinh: [{ cap: 8, duKien: 'động cơ một chiều' }] },
  ] };
  const ok = { anhXa: {
    'G-1#0': [{ khoa: 'daGanDauNoi', giaTri: true }],
    'G-1#1': [{ khoa: 'dienAp', op: '<=', giaTri: 80, donVi: 'V' }],
    'G-2#0': [{ khoa: 'loaiDongDien', giaTri: 'MOT_CHIEU' }],
  } };
  const r = T.doPhuBoDe(boDeGia, ok, tv);
  check('doPhuBoDe giả: đủ ánh xạ đúng kiểu ⇒ 3/3, không thiếu, không lỗi', r.tong === 3 && r.daAnhXa === 3 && r.thieu.length === 0 && r.loi.length === 0, r);
  const thieu = T.doPhuBoDe(boDeGia, { anhXa: { 'G-1#0': ok.anhXa['G-1#0'] } }, tv);
  check('doPhuBoDe: dữ kiện chưa ánh xạ ⇒ in vào thieu', thieu.thieu.includes('G-1#1') && thieu.thieu.includes('G-2#0'), thieu);
  const sai = T.doPhuBoDe(boDeGia, { anhXa: {
    'G-1#0': [{ khoa: 'khoaKhongCo', giaTri: true }],
    'G-1#1': [{ khoa: 'dienAp', op: '<=', giaTri: 80, donVi: 'mm' }],
    'G-2#0': [{ khoa: 'loaiDongDien', giaTri: 'BA_CHIEU' }],
    'G-9#0': [{ khoa: 'dienAp', giaTri: 1, donVi: 'V' }],
  } }, tv);
  const co = (ma) => sai.loi.some((x) => x.includes(ma));
  check('doPhuBoDe ĐỎ: khoá không có / đơn vị lệch hệ / LIET_KE ngoài danh sách / ánh xạ thừa không có trong bộ đề',
    co('khoa-khong-co') && co('don-vi-lech-he') && co('gia-tri-khong-hop-le') && co('khong-co-trong-bo-de'), sai.loi);
  const sai2 = T.doPhuBoDe(boDeGia, { anhXa: { ...ok.anhXa, 'G-1#0': [{ khoa: 'daGanDauNoi', giaTri: 'co' }] } }, tv);
  check('doPhuBoDe ĐỎ: CO_KHONG giá trị không phải boolean', sai2.loi.some((x) => x.includes('gia-tri-khong-hop-le')), sai2.loi);

  // Bộ đề lát 1 THẬT (chỉ đọc tên dữ kiện — không sửa bộ đề) + bảng ánh xạ của nó
  const boDe = JSON.parse(fs.readFileSync('data/bench/ho-so-lat-1.json', 'utf8'));
  const axBoDe = JSON.parse(fs.readFileSync('data/bench/ho-so-lat-1.tu-vung.json', 'utf8'));
  const that = T.doPhuBoDe(boDe, axBoDe, tv);
  check(`bộ đề lát 1 thật: mọi dữ kiện quyết định ánh xạ được về khoá tu-vung@1 đúng kiểu (${that.daAnhXa}/${that.tong})`, that.tong >= 200 && that.thieu.length === 0 && that.loi.length === 0, { thieu: that.thieu.slice(0, 20), loi: that.loi.slice(0, 20) });
  check('bảng ánh xạ bộ đề khai băm bộ đề đang khoá (đổi bộ đề ⇒ phải soát lại ánh xạ)', axBoDe.boDeSha256 === T.sha256Tep('data/bench/ho-so-lat-1.json'), { khai: axBoDe.boDeSha256 });
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
