#!/usr/bin/env node
/**
 * Cổng máy "tiêu chí 6 số" (G6-0 / G6-1, kế hoạch đồ thị tri thức mục 6): `tieuChi6` khuôn g6@1 → cạnh C10 / C13.
 *
 * Vì sao: 108/115 nhóm đầu về lượng hàng chưa có tieuChi6; van điện từ khí nén 5/2 (đúng 8481.20.90) bị dừng ở 8481.80
 * "Thiết bị khác" vì không có gì nói phân nhóm có tên riêng phải xét trước phân nhóm dư. 196/377 sổ ranh giới bị trả về vì
 * "suy rộng" quá chữ luật — cổng này chặn đúng lỗi đó trước khi nhân bản cho ~100 nhóm bằng AI rẻ.
 *
 * ĐỎ khi: một sổ tay mang khuôn g6@1 không qua cổng · mẫu 8481 / 8412 lệch bản soạn gốc · tiêm một lỗi mà cổng không bắt
 * đúng mã · bảng cạnh không có cạnh C10 cho hai nhóm mẫu · lõi câu hỏi không chỉ sang 8481.20 kèm trích cho ca van 5/2 ·
 * gói soạn không tất định. Không LLM, không mạng.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { GOC, boKiem } from './lib-luat.mjs';

process.chdir(GOC);
const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-tieu-chi-6');
const G6 = require('../lib/do-thi/tieu-chi-6.js');
const D = require('../lib/do-thi/index.js');
const { nhomKhuonG6 } = await import('./kiem-tieu-chi-6.mjs');
const { chuanMuc, mucLuu, apVaoSoTay } = await import('./goi-soan-tieu-chi-6.mjs');

const doc = (p) => JSON.parse(fs.readFileSync(path.join(GOC, p), 'utf8'));
const sao = (o) => JSON.parse(JSON.stringify(o));
const ma = (kq) => [...new Set(kq.loi.map((l) => l.ma))].sort();

// ── 1. Mọi sổ tay khuôn g6@1 qua cổng; hai mẫu khớp bản soạn gốc ────────────────────────────────────────────────
const daCo = nhomKhuonG6();
kiem(`có sổ tay khuôn ${G6.KHUON}: ${daCo.map((x) => x.h4).join(', ')}`, daCo.some((x) => x.h4 === '8481') && daCo.some((x) => x.h4 === '8412'));
for (const { h4, tieuChi6 } of daCo) {
  const kq = G6.kiemTieuChi6(h4, tieuChi6, { toKhai: false });
  kiem(`sổ tay ${h4}: tieuChi6 qua cổng với 0 lỗi`, kq.loi.length === 0, JSON.stringify(kq.loi.slice(0, 3)));
}
const MAU = {}; const XEP = {}; // MAU = bản soạn (không thuTu); XEP = đã gắn thuTu máy xếp, như nằm trong sổ tay
for (const h4 of ['8481', '8412']) {
  MAU[h4] = doc(`docs/giao-viec/do-thi/mau/${h4}.json`);
  XEP[h4] = mucLuu(h4, MAU[h4].tieuChi6);
  const trongSo = doc(`data/so-tay/${h4}.json`).tieuChi6;
  kiem(`mẫu ${h4}: data/so-tay khớp bản soạn docs/giao-viec/do-thi/mau/${h4}.json (áp bằng --ap, không sửa tay)`, JSON.stringify(trongSo) === JSON.stringify(XEP[h4]));
  kiem(`mẫu ${h4}: bản soạn không ghi thuTu (máy xếp)`, MAU[h4].tieuChi6.every((x) => x.thuTu === undefined) && XEP[h4].every((x) => Number.isInteger(x.thuTu)));
}
const kq81 = G6.kiemTieuChi6('8481', MAU['8481'].tieuChi6); const kq12 = G6.kiemTieuChi6('8412', MAU['8412'].tieuChi6);
kiem('mẫu 8481: mọi phân nhóm 6 số của biểu thuế có mặt (6/6), 848180 là phân nhóm dư đứng cuối', kq81.thongKe.soPhanNhom === 6 && G6.theoThuTu(XEP['8481']).at(-1).hs6 === '848180' && G6.theoThuTu(XEP['8481'])[0].hs6 === '848120');
kiem('mẫu 8412: 7/7 phân nhóm; 841229, 841239, 841280 khai phanConLai', kq12.thongKe.soPhanNhom === 7 && ['841229', '841239', '841280'].every((h) => MAU['8412'].tieuChi6.some((x) => x.hs6 === h && x.phanConLai === true)));
kiem('mẫu có phép đo trên tờ khai mẫu (số dòng > 0, đúng + sai + không kết luận = tổng)', [kq81, kq12].every((k) => k.thongKe.toKhai.tong > 0 && k.thongKe.toKhai.dung + k.thongKe.toKhai.sai + k.thongKe.toKhai.khongKetLuan === k.thongKe.toKhai.tong));

// Tầng một gạch khuyết dòng trong biểu thuế (8523.5 — nút suy ra không tên): phần còn lại 852359 được nhắc điều kiện tầng
// lấy từ chú giải nhóm, CHỈ KHI mọi phân nhóm anh em có tên cùng tầng mang đúng điều kiện đó.
{
  const goc = doc('data/so-tay/8523.json').tieuChi6;
  const laTang = (x) => x.nguon === 'nhom8523.nhom' && /^\(C\)/.test(x.trich || '');
  const loiDu = (ds) => G6.kiemTieuChi6('8523', ds, { toKhai: false }).loi.filter((l) => l.ma === 'DU_MANG_DIEU_KIEN' && l.hs6 === '852359').length;
  kiem('8523: 852359 nhắc điều kiện tầng suy ra giống mọi anh em → qua cổng', goc.some((x) => x.hs6 === '852359' && laTang(x)) && loiDu(sao(goc)) === 0);
  kiem('CA NGƯỢC: một anh em (852352) không mang điều kiện tầng → 852359 bị chặn', loiDu(sao(goc).filter((x) => !(x.hs6 === '852352' && laTang(x)))) === 1);
  const lech = sao(goc); lech.find((x) => x.hs6 === '852359' && laTang(x)).value = 'THÔNG TIN BÁN DẪN';
  kiem('CA NGƯỢC: giá trị lệch với anh em → 852359 bị chặn', loiDu(lech) === 1);
  const le = sao(goc); const m = sao(le.find((x) => x.hs6 === '852359' && laTang(x))); m.hs6 = '852380'; le.push(m);
  kiem('CA NGƯỢC: phần còn lại của tầng khác (852380) mượn điều kiện này → bị chặn', G6.kiemTieuChi6('8523', le, { toKhai: false }).loi.some((l) => l.ma === 'DU_MANG_DIEU_KIEN' && l.hs6 === '852380'));
}

// ── 2. TIÊM LỖI: sửa mẫu thành từng kiểu sai → cổng đỏ ĐÚNG mã lỗi ──────────────────────────────────────────────
const DS_6704_CHUAN = [
  { hs6: '670411', nguon: 'tieuDe.67041', trich: '67041 Bằng vật liệu dệt tổng hợp', chuaSoHoa: 'thiếu khoá cho vật liệu dệt tổng hợp' },
  { hs6: '670411', nguon: 'tax.67041100', trich: '67041100 - - Bộ tóc giả hoàn chỉnh', dieuKien: 'Bộ tóc giả hoàn chỉnh', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bộ tóc giả hoàn chỉnh', tuKhoa: ['Bộ tóc giả hoàn chỉnh'] },
  { hs6: '670419', nguon: 'tieuDe.67041', trich: '67041 Bằng vật liệu dệt tổng hợp', chuaSoHoa: 'thiếu khoá cho vật liệu dệt tổng hợp' },
  { hs6: '670419', nguon: 'tax.67041900', trich: '67041900 - - Loại khác', phanConLai: true },
  { hs6: '670420', nguon: 'tax.67042000', trich: '67042000 - Bằng tóc người', chuaSoHoa: 'thiếu chất liệu tóc người' },
  { hs6: '670490', nguon: 'tax.67049000', trich: '67049000 - Bằng vật liệu khác', chuaSoHoa: 'thiếu chất liệu vật liệu khác' },
  { hs6: '670490', nguon: 'tax.67049000', trich: '67049000 - Bằng vật liệu khác', phanConLai: true },
];
const DS_6913_CHUAN = [
  { hs6: '691310', nguon: 'tieuDe.691310', trich: '691310 Bằng sứ', chuaSoHoa: 'thiếu chất liệu sứ (gốm sứ rộng hơn sứ)' },
  { hs6: '691390', nguon: 'tieuDe.691390', trich: '691390 Loại khác', phanConLai: true },
];
const DS_6004_CHUAN = [
  {
    hs6: '600410',
    dieuKien: 'Có hàm lượng sợi đàn hồi chiếm từ 5% trở lên tính theo khối lượng',
    fact: 'hamLuongSoiDanHoi',
    op: '>=',
    value: 5,
    donVi: '%',
    dieuKienTru: ['sợi cao su'],
    tuKhoa: ['sợi đàn hồi'],
    nguon: 'tieuDe.600410',
    trich: '600410 Có hàm lượng sợi đàn hồi chiếm từ 5% trở lên tính theo khối lượng nhưng không bao gồm sợi cao su',
  },
  { hs6: '600490', phanConLai: true, nguon: 'tax.60049000', trich: '60049000 - Loại khác' },
];
const GOC_TIEM = { ...XEP, 4202: doc('data/so-tay/4202.json').tieuChi6, 8501: doc('data/so-tay/8501.json').tieuChi6, 6704: DS_6704_CHUAN, 6913: DS_6913_CHUAN, 6004: DS_6004_CHUAN };
const tiem = (h4, sua, goc = GOC_TIEM) => { const ds = sao(goc[h4]); const ra = sua(ds) || ds; return G6.kiemTieuChi6(h4, ra, { toKhai: false }); };
const cua = (ds, hs6, loc = () => true) => ds.find((x) => x.hs6 === hs6 && loc(x));
const CA = [
  ['TRICH_KHONG_NGUYEN_VAN', 'sửa một chữ trong câu trích của 848120 ("khí nén" → "khí ép")', '8481', (ds) => { const x = cua(ds, '848120'); x.trich = x.trich.replace('truyền động khí nén"', 'truyền động khí ép"'); x.value = ['truyền động dầu thủy lực']; x.tuKhoa = ['thủy lực']; x.dieuKien = 'Van dùng trong truyền động dầu thủy lực'; }],
  ['TRICH_KHONG_NGUYEN_VAN', 'câu trích tự viết lại ý của luật cho 848110', '8481', (ds) => { cua(ds, '848110').trich = 'Van giảm áp suất của lưu chất trong đường ống'; }],
  ['NGUON_KHONG_TON_TAI', 'nguồn không có trong gói (ch85.chuong)', '8481', (ds) => { cua(ds, '848120').nguon = 'ch85.chuong'; }],
  ['NGUON_KHONG_TON_TAI', 'lấy tiêu đề cấp dưới 6 số làm nguồn (tieuDe.8481201)', '8481', (ds) => { cua(ds, '848120').nguon = 'tieuDe.8481201'; }],
  ['NGUON_LAC_PHAN_NHOM', 'trích tiêu đề của phân nhóm khác (848130 trích tieuDe.848140)', '8481', (ds) => { const x = cua(ds, '848130'); x.nguon = 'tieuDe.848140'; x.trich = 'Van an toàn hoặc van xả'; x.value = 'Van an toàn'; x.tuKhoa = ['van an toàn']; x.dieuKien = 'Van an toàn'; }],
  ['PHAN_NHOM_KHONG_TON_TAI', 'phân nhóm bịa 848150', '8481', (ds) => { cua(ds, '848130').hs6 = '848150'; }],
  ['THIEU_PHAN_NHOM', 'bỏ sót phân nhóm 848140', '8481', (ds) => ds.filter((x) => x.hs6 !== '848140')],
  ['THIEU_PHAN_NHOM', 'bỏ sót phân nhóm dư 848180', '8481', (ds) => ds.filter((x) => x.hs6 !== '848180')],
  ['SUY_RONG', 'thêm từ khoá "điện từ" cho 848120 (luật chỉ nói truyền động thủy lực / khí nén)', '8481', (ds) => { cua(ds, '848120').tuKhoa.push('điện từ'); }],
  ['SUY_RONG', 'dieuKien thêm chữ ngoài câu trích ("Van điện từ 5/2 …")', '8481', (ds) => { cua(ds, '848120').dieuKien = 'Van điện từ 5/2 dùng trong truyền động khí nén'; }],
  ['SUY_RONG', 'value không có nguyên văn trong câu trích ("Van điều áp")', '8481', (ds) => { cua(ds, '848110').value = 'Van điều áp'; }],
  ['DU_KHONG_CUOI', 'phân nhóm dư 848180 xếp thuTu 1, đẩy các phân nhóm khác xuống', '8481', (ds) => { for (const x of ds) x.thuTu = x.hs6 === '848180' ? 1 : x.thuTu + 1; }],
  ['DU_KHONG_CUOI', 'phân nhóm dư trong tầng (841229) xếp trước anh em có tên 841221', '8412', (ds) => { for (const x of ds) { if (x.hs6 === '841229') x.thuTu = 2; else if (x.hs6 === '841221') x.thuTu = 3; } }],
  ['DU_SAI_KHAI', 'phân nhóm dư 848180 không khai phanConLai mà mang tên loại "Thiết bị khác"', '8481', (ds) => { const x = cua(ds, '848180'); delete x.phanConLai; Object.assign(x, { dieuKien: 'Thiết bị khác', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Thiết bị khác', tuKhoa: ['thiết bị khác'] }); }],
  ['DU_MANG_DIEU_KIEN', 'phân nhóm dư 848180 mang thêm điều kiện khẳng định lấy từ tên WCO', '8481', (ds) => { ds.push({ hs6: '848180', thuTu: 6, dieuKien: 'valves and similar appliances', fact: 'tenLoai', op: 'TEN_LOAI', value: 'valves and similar appliances', tuKhoa: ['valves'], nguon: 'wco.848180', trich: 'Taps, cocks, valves and similar appliances' }); }],
  ['KHOA_DU_KIEN_LA', 'fact tự đặt ngoài tu-vung@2 (cong_dung_truyen_dong)', '8481', (ds) => { cua(ds, '848120').fact = 'cong_dung_truyen_dong'; }],
  ['TRUNG_DIEU_KIEN', '848140 chép y điều kiện của 848130', '8481', (ds) => { const a = cua(ds, '848130'); const b = cua(ds, '848140'); Object.assign(b, { fact: a.fact, op: a.op, value: a.value }); }],
  ['THU_TU_KHONG_CAN_CU', 'bỏ uuTien của 848120 nhưng vẫn xét trước 848110', '8481', (ds) => { delete cua(ds, '848120').uuTien; }],
  ['THU_TU_KHONG_CAN_CU', 'uuTien trích một câu không nói ưu tiên', '8481', (ds) => { cua(ds, '848120').uuTien.trich = 'Các van này có thể là loại bất kỳ (ví dụ, van giảm áp, van kiểm tra).'; }],
  ['THU_TU_SAI', 'hai phân nhóm trùng thuTu', '8481', (ds) => { cua(ds, '848130').thuTu = 4; }],
  ['THU_TU_SAI', 'thuTu ghi tay lệch thứ tự máy xếp (đánh số từ 2)', '8481', (ds) => { for (const x of ds) x.thuTu += 1; }],
  ['SAI_KHOA_THUOC_TINH', 'dùng tenLoai cho thuộc tính "dùng khí nén"', '8412', (ds) => { Object.assign(cua(ds, '841231', (x) => x.nguon === 'tieuDe.84123'), { dieuKien: 'dùng khí nén', value: 'dùng khí nén' }); }],
  ['LIET_KE_MOT_CHUOI', 'gói "Van an toàn, van xả, v.v.., có hoặc không…" vào một value', '8481', (ds) => { const t = 'Van an toàn, van xả, v.v.., có hoặc không đi kèm với một còi báo'; Object.assign(cua(ds, '848140'), { nguon: 'nhom8481.nhom', trich: t, dieuKien: 'Van an toàn, van xả', value: t }); }],
  ['TEN_CO_CHU_KHAC', 'chép cả chữ "khác" vào value ("Thiết bị khác") cho một mục điều kiện', '8481', (ds) => { Object.assign(cua(ds, '848110'), { nguon: 'tieuDe.848110', value: 'Van khác' }); }],
  ['TEN_LOAI_SAU_GIOI_TU', 'lấy "truyền động dầu thủy lực" (đứng sau "dùng trong") làm tenLoai của 848120', '8481', (ds) => { Object.assign(cua(ds, '848120'), { fact: 'tenLoai', op: 'TEN_LOAI' }); }],
  ['TU_KHOA_QUA_CHUNG', 'thêm chữ chung "thiết bị" vào từ khoá của 848110', '8481', (ds) => { Object.assign(cua(ds, '848110'), { tuKhoa: ['van giảm áp', 'thiết bị'] }); }],
  ['KHUON_SAI', 'mục rỗng (chỉ có hs6 + nguon + trich)', '8412', (ds) => { ds.push({ hs6: '841221', thuTu: cua(ds, '841221').thuTu, nguon: 'tieuDe.84122', trich: 'Động cơ và mô tơ thủy lực' }); }],
  ['THIEU_VE_GIOI_HAN', 'bỏ mục "xi lanh" của 841221: vế "Chuyển động tịnh tiến (xi lanh)" không ai mang', '8412', (ds) => ds.filter((x) => !(x.hs6 === '841221' && x.nguon === 'tax.84122100'))],
  ['THIEU_VE_GIOI_HAN', 'đổi điều kiện 848120 thành "van" trần (bỏ vế "dùng trong truyền động …")', '8481', (ds) => { Object.assign(cua(ds, '848120'), { fact: 'tenLoai', op: 'TEN_LOAI', value: 'van', tuKhoa: ['van'], dieuKien: 'van' }); }],
  ['THIEU_VE_GIOI_HAN', 'mục tầng của 841231 mang tenLoai "Động cơ" (bỏ vế "dùng khí nén")', '8412', (ds) => { Object.assign(cua(ds, '841231', (x) => x.nguon === 'tieuDe.84123'), { value: 'Động cơ', tuKhoa: ['mô tơ'], dieuKien: 'Động cơ' }); }],
  ['CHUA_SO_HOA_CO_KHOA', 'khai chuaSoHoa cho "Chuyển động tịnh tiến (xi lanh)" trong khi tenLoai dùng được', '8412', (ds) => { const i = ds.findIndex((x) => x.hs6 === '841221' && x.nguon === 'tax.84122100'); ds[i] = { hs6: '841221', thuTu: ds[i].thuTu, chuaSoHoa: 'thiếu khoá kiểu chuyển động', nguon: 'tax.84122100', trich: 'Chuyển động tịnh tiến (xi lanh)' }; }],
  ['GIA_TRI_RONG', 'thêm "các loại tương tự" vào value của 848140', '8481', (ds) => { cua(ds, '848140').value.push('các loại tương tự'); }],
  ['KE_CA_LA_DIEU_KIEN', 'thêm mục khẳng định chỉ lấy tên trong "(kể cả môtơ …)" của chú giải Phần XVI cho 841290', '8412', (ds) => { ds.push({ hs6: '841290', thuTu: cua(ds, '841290').thuTu, dieuKien: 'môtơ', fact: 'tenLoai', op: 'TEN_LOAI', value: 'môtơ', tuKhoa: ['môtơ'], nguon: 'phan84.phan', trich: 'các bộ phận và các phụ kiện của chúng (kể cả môtơ' }); }],
  ['TACH_LIET_KE', 'tách "Van an toàn hoặc van xả" của 848140 thành hai mục tên loại', '8481', (ds) => { const x = cua(ds, '848140'); x.value = 'Van an toàn'; ds.push({ ...sao(x), value: 'van xả', tuKhoa: ['van xả'] }); }],
  ['GIA_TRI_RONG', 'value "van xả và các loại tương tự" (đuôi mở dính vào tên)', '8481', (ds) => { cua(ds, '848140').value = ['Van an toàn', 'van xả và các loại tương tự']; }],
  ['THIEU_DIEU_KIEN_TANG', '841239 chỉ khai phanConLai, bỏ điều kiện "dùng khí nén" của tầng 84123', '8412', (ds) => ds.filter((x) => !(x.hs6 === '841239' && x.nguon === 'tieuDe.84123'))],
  ['THIEU_VE_TRU', 'tiêu đề 841210 có "trừ tua bin phản lực" mà bỏ mục phủ định', '8412', (ds) => ds.filter((x) => !(x.hs6 === '841210' && x.chieu === 'PHAI_KHONG'))],
  ['TU_KHOA_TRONG_VE_TRU', 'lấy "tua bin phản lực" (thứ bị trừ) làm từ khoá nhận ra 841210', '8412', (ds) => { cua(ds, '841210', (x) => !x.chieu).tuKhoa = ['tua bin phản lực']; }],
  ['TIEU_DE_CHI_LAC', 'từ khoá "động cơ" cho tầng thủy lực: tiêu đề 841231 (khí nén, xi lanh) bị chỉ sang 841221', '8412', (ds) => { cua(ds, '841221', (x) => x.nguon === 'tieuDe.84122').tuKhoa = ['động cơ']; }],
  ['TIEN_LE_SAI', 'tiền lệ bịa số thông báo', '8481', (ds) => { cua(ds, '848120').tienLe.push({ so: '9999/TB-TCHQ', ma: '84812090' }); }],
  ['TIEN_LE_SAI', 'gắn thông báo của 848120 làm ví dụ cho 848110', '8481', (ds) => { cua(ds, '848110').tienLe = [{ so: '851/TB-TCHQ', ma: '84812090' }]; }],
  ['KHUON_SAI', 'trường lạ (ghiChu) và thiếu dieuKien', '8481', (ds) => { const x = cua(ds, '848110'); x.ghiChu = 'van điều áp cũng vào đây'; delete x.dieuKien; }],
  // Luật 21/11/2026: hỏi đặc tính kiểm chứng được, không hỏi mục đích / tên gọi tự nhận.
  ['CHI_HOI_MUC_DICH', '848110 thêm mục dungCho "giảm áp" ("Van dùng để giảm áp") — tiêu đề "Van giảm áp" không định nghĩa bằng công dụng', '8481', (ds) => { ds.push({ hs6: '848110', thuTu: cua(ds, '848110').thuTu, dieuKien: 'Van dùng để giảm áp', fact: 'dungCho', op: 'CONG_DUNG', value: 'giảm áp', tuKhoa: ['giảm áp'], nguon: 'tieuDe.848110', trich: 'Van giảm áp' }); }],
  ['CHI_HOI_MUC_DICH', '848140 đổi điều kiện thành "Van an toàn chuyên dụng" (chỉ thêm lời tự nhận, không đặc tính)', '8481', (ds) => { cua(ds, '848140').dieuKien = 'Van an toàn chuyên dụng'; }],
  ['CHI_HOI_MUC_DICH', 'kiemChung của 848120 chỉ hỏi lại công dụng ("Van có dùng trong truyền động khí nén không?")', '8481', (ds) => { cua(ds, '848120').kiemChung = [{ hoi: 'Van có dùng trong truyền động khí nén không?', nguon: 'ch84.chuong', trich: 'trong hệ thủy lực hoặc khí nén mà từ đó nguồn năng lượng được cung cấp dưới dạng chất lưu nén (chất lỏng hoặc khí)' }]; }],
  ['SUY_RONG', 'kiemChung của 848120 hỏi đặc tính không có trong câu trích ("áp suất trên 10 bar")', '8481', (ds) => { cua(ds, '848120').kiemChung[0].hoi = 'Van chịu áp suất trên 10 bar không?'; }],
  ['TRICH_KHONG_NGUYEN_VAN', 'kiemChung của 848120 trích tự viết lại', '8481', (ds) => { cua(ds, '848120').kiemChung[0].trich = 'van làm việc với chất lưu nén'; }],
  ['DU_MANG_DIEU_KIEN', 'phân nhóm dư 848180 mang kiemChung', '8481', (ds) => { cua(ds, '848180').kiemChung = sao(cua(ds, '848120').kiemChung); }],
  // #1583: KHOA_RONG_HON_LUAT + dieuKienTru + #1586 phân nhóm không phải DU thiếu điều kiện riêng.
  ['KHOA_RONG_HON_LUAT', '6704.1 dùng chatLieu "vải dệt" cho "Bằng vật liệu dệt tổng hợp" (rơi chữ "tổng hợp")', '6704', (ds) => { const x = cua(ds, '670411', (y) => y.nguon === 'tieuDe.67041'); delete x.chuaSoHoa; Object.assign(x, { dieuKien: 'Bằng vật liệu dệt tổng hợp', fact: 'chatLieu', op: 'LA', value: 'vải dệt' }); }],
  ['KHOA_RONG_HON_LUAT', '6913.10 dùng chatLieu "gốm sứ" cho "Bằng sứ"', '6913', (ds) => { const x = cua(ds, '691310'); delete x.chuaSoHoa; Object.assign(x, { dieuKien: 'Bằng sứ', fact: 'chatLieu', op: 'LA', value: 'gốm sứ' }); }],
  ['KHOA_RONG_HON_LUAT', '6004.10 dùng tinhDanHoi cho "... sợi đàn hồi ... nhưng không bao gồm sợi cao su"', '6004', (ds) => { const x = cua(ds, '600410'); Object.assign(x, { fact: 'tinhDanHoi', op: 'CO', dieuKien: 'sợi đàn hồi' }); delete x.value; delete x.donVi; delete x.dieuKienTru; }],
  ['THIEU_VE_TRU', '6004.10 bỏ dieuKienTru dù tiêu đề có "nhưng không bao gồm sợi cao su"', '6004', (ds) => { delete cua(ds, '600410').dieuKienTru; }],
  ['SUY_RONG', '6004.10 ghi dieuKienTru ["người"] không có trong trích', '6004', (ds) => { cua(ds, '600410').dieuKienTru = ['người']; }],
  ['SUY_RONG', '6004.10 ghi dieuKienTru ["sợi đàn hồi"] (có trong trích nhưng nằm ngoài vế loại trừ)', '6004', (ds) => { cua(ds, '600410').dieuKienTru = ['sợi đàn hồi']; }],
  ['KHUON_SAI', 'phân nhóm không phải DU dưới tầng có tên (8412.21) chỉ giữ mục tầng, thiếu điều kiện riêng của phân nhóm', '8412', (ds) => ds.filter((x) => !(x.hs6 === '841221' && x.nguon === 'tax.84122100'))],
  ['KHOA_HEP_HON_LUAT', '4202.12 dùng chatLieu "vải dệt" cho "Mặt ngoài bằng plastic hoặc vật liệu dệt" (rơi vải không dệt / nỉ)', '4202', (ds) => { const x = cua(ds, '420212', (y) => y.fact === 'vatLieuKhac'); Object.assign(x, { dieuKien: 'Mặt ngoài bằng plastic hoặc vật liệu dệt', fact: 'chatLieu', op: 'LA', value: ['plastic', 'vải dệt'] }); }],
  ['KHOA_NGUOC_VE_TRU', '#1630 8501.31 dùng mục khẳng định nguonNangLuong TRONG ["QUANG_DIEN"] trích "trừ máy phát quang điện"', '8501', (ds) => { ds.push({ hs6: '850131', thuTu: 3, dieuKien: 'máy phát quang điện', fact: 'nguonNangLuong', op: 'TRONG', value: ['QUANG_DIEN'], nguon: 'tieuDe.85013', trich: '85013 Động cơ một chiều khác; máy phát điện một chiều, trừ máy phát quang điện' }); }],
];
for (const [maLoi, moTa, h4, sua] of CA) {
  const kq = tiem(h4, sua);
  kiem(`tiêm lỗi → ${maLoi}: ${moTa}`, kq.loi.some((l) => l.ma === maLoi), `cổng trả: ${ma(kq).join(', ') || '(0 lỗi)'}`);
}
kiem('mọi mã lỗi của cổng (trừ không) đều có ca tiêm', Object.keys(G6.MA_LOI).every((m) => CA.some((c) => c[0] === m)), Object.keys(G6.MA_LOI).filter((m) => !CA.some((c) => c[0] === m)).join(', '));
// Câu hỏi gửi khách (phanBiet[].hoi…): đỏ khi chỉ hỏi mục đích / tên gọi; ngoại lệ khi chính chữ luật trích định nghĩa bằng công dụng.
const MD = (hoi, t) => G6.kiemCauHoiMucDich(hoi, t).ma;
const L9506 = '95069100 - - Các mặt hàng và thiết bị cho tập luyện thể chất nói chung, thể dục hoặc điền kinh';
const L848120 = 'Van dùng trong truyền động dầu thủy lực hoặc khí nén';
kiem('câu hỏi đỏ CHI_HOI_MUC_DICH: "Là đai chuyên dụng cho tập gym?" (kể cả khi đưa chữ luật 9506.91: "gym" không có trong luật)', MD('Là đai chuyên dụng cho tập gym?') === 'CHI_HOI_MUC_DICH' && MD('Là đai chuyên dụng cho tập gym?', { chuLuat: L9506 }) === 'CHI_HOI_MUC_DICH');
kiem('câu hỏi đỏ CHI_HOI_MUC_DICH: câu sổ 9506 "Là các mặt hàng và thiết bị cho tập luyện thể chất…?" khi không có chữ luật làm căn cứ', MD('Là các mặt hàng và thiết bị cho tập luyện thể chất nói chung, thể dục hoặc điền kinh?') === 'CHI_HOI_MUC_DICH');
kiem('câu hỏi đỏ CHI_HOI_MUC_DICH: hỏi tên gọi tự nhận ("Hàng có tên gọi là đai tập gym?"), hỏi phục vụ ("Hàng phục vụ phòng tập?")', MD('Hàng có tên gọi là đai tập gym?') === 'CHI_HOI_MUC_DICH' && MD('Hàng phục vụ phòng tập?') === 'CHI_HOI_MUC_DICH');
kiem('câu hỏi không đỏ: hỏi đặc tính ("Đai có bản rộng đỡ lưng, khoá chịu lực và đệm lót không?"), có công dụng kèm thông số ("… cuộn coil 24VDC")', MD('Đai có bản rộng đỡ lưng, khoá chịu lực và đệm lót không?') === null && MD('Van điện từ dùng cho khí nén, cuộn coil 24VDC?') === null);
kiem('ngoại lệ không đỏ: chữ luật 8481.20 định nghĩa bằng công dụng ⇒ chỉ cảnh báo CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG khi thiếu câu đặc tính; có câu đặc tính đi kèm ⇒ sạch', MD('Van có dùng trong truyền động dầu thủy lực hoặc khí nén không?', { chuLuat: L848120 }) === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG' && MD('Van có dùng trong truyền động dầu thủy lực hoặc khí nén không?', { chuLuat: L848120, cauPhu: ['Van làm việc với chất lưu nén (chất lỏng hoặc khí)?'] }) === null);
kiem('ngoại lệ không đỏ: câu sổ 9506 với chính chữ luật 9506.91 làm căn cứ ⇒ cảnh báo (cần câu đặc tính đồ tập), không phải lỗi', MD('Là các mặt hàng và thiết bị cho tập luyện thể chất nói chung, thể dục hoặc điền kinh?', { chuLuat: L9506 }) === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG');
{
  const kq = tiem('8481', () => {});
  const boKc = tiem('8481', (ds) => { delete cua(ds, '848120').kiemChung; });
  kiem('ngoại lệ trong cổng: mẫu 8481.20 (mục dungCho, chữ luật định nghĩa bằng công dụng) không đỏ CHI_HOI_MUC_DICH; có kiemChung ⇒ 0 cảnh báo; bỏ kiemChung ⇒ 0 lỗi + cảnh báo CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG',
    !kq.loi.some((l) => l.ma === 'CHI_HOI_MUC_DICH') && !kq.canhBao.some((c) => c.ma === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG') && boKc.loi.length === 0 && boKc.canhBao.some((c) => c.ma === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG' && c.hs6 === '848120'), JSON.stringify([kq.loi, boKc.loi, boKc.canhBao.map((c) => c.ma)]));
  kiem('ngoại lệ trong cổng: tenLoai "Động cơ và mô tơ dùng khí nén" (8412, tên hàng của chữ luật) không đỏ CHI_HOI_MUC_DICH', !tiem('8412', () => {}).loi.some((l) => l.ma === 'CHI_HOI_MUC_DICH'));
}
kiem('ca ngược: mẫu không sửa gì ⇒ 0 lỗi (cổng không đỏ oan) — cả bản soạn không thuTu lẫn bản đã xếp', ['8481', '8412'].every((h) => tiem(h, () => {}).loi.length === 0 && tiem(h, () => {}, { [h]: MAU[h].tieuChi6 }).loi.length === 0));
// Khoá hợp có sẵn ⇒ chuaSoHoa là lỗi; chỉ khi không khoá nào đọc được vế mới là cảnh báo THIEU_KHOA_TU_VUNG.
kiem('khoaPhuHop: tên hàng → tenLoai; "dùng cho …" → dungCho; "Bằng gang đúc" → chatLieu; "đã tráng men" (7323) → daTrangMen; "với hai vị trí" → null; "Mặt ngoài bằng da thuộc…" / "… plastic hoặc vật liệu dệt" → vatLieuKhac; "Phụ kiện lắp vào …" → dungCho', G6.khoaPhuHop('8412', 'Chuyển động tịnh tiến (xi lanh)') === 'tenLoai' && G6.khoaPhuHop('8536', 'Dùng cho điện áp không quá 60 V') === 'dungCho' && G6.khoaPhuHop('7323', 'Bằng gang đúc') === 'chatLieu' && G6.khoaPhuHop('7323', '73239200 - - đã tráng men') === 'daTrangMen' && G6.khoaPhuHop('8481', 'với hai vị trí') === null && G6.khoaPhuHop('4202', '420211 Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp') === 'vatLieuKhac' && G6.khoaPhuHop('4202', '420212 Mặt ngoài bằng plastic hoặc vật liệu dệt') === 'vatLieuKhac' && G6.khoaPhuHop('3926', 'Phụ kiện lắp vào đồ nội thất') === 'dungCho', JSON.stringify(['8412', '8536', '7323'].map((h) => G6.khoaPhuHop(h, 'đã tráng men'))));
// Phủ vế: tách tiêu đề thật thành vế cộng dồn; danh sách nhiều tên hàng thì không tách.
const ve = (h4, hs6) => G6.veCanPhu(h4, G6.phanNhomCuaNhom(h4).find((p) => p.hs6 === hs6)).map((v) => v.chu);
kiem('tách vế: 7323.94 "Bằng sắt (trừ gang đúc) hoặc thép, đã tráng men" ⇒ "Bằng sắt hoặc thép" + "đã tráng men" (vế "trừ" tách riêng)', JSON.stringify(ve('7323', '732394')) === JSON.stringify(['Bằng sắt hoặc thép', 'đã tráng men']), JSON.stringify(ve('7323', '732394')));
kiem('tách vế: 4202.11 ⇒ vế "bằng da thuộc …" (không bị xoá vì tên nhóm cũng liệt kê da thuộc; "Mặt ngoài" chỉ là vị trí); 8504.32 ⇒ một vế "Công suất danh định trên 1 kVA …"', ve('4202', '420211').some((v) => /da thuộc/.test(v)) && !ve('4202', '420211').includes('Mặt ngoài') && ve('8504', '850432').length === 1, JSON.stringify([ve('4202', '420211'), ve('8504', '850432')]));
kiem('phủ vế: chất liệu đọc chatLieu + vatLieuKhac — chatLieu "plastic" + vatLieuKhac ["VAT_LIEU_DET"] mang được 4202.22; chatLieu ["plastic", "vải dệt"] bị KHOA_HEP_HON_LUAT loại', (() => {
  const v22 = G6.veCanPhu('4202', G6.phanNhomCuaNhom('4202').find((p) => p.hs6 === '420222')).find((v) => /plastic/.test(v.chu));
  const dung = G6.phuVe([
    { fact: 'chatLieu', op: 'LA', value: 'plastic', nguon: 'tieuDe.420222', trich: '420222 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt' },
    { fact: 'vatLieuKhac', op: 'TRONG', value: ['VAT_LIEU_DET'], nguon: 'tieuDe.420222', trich: '420222 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt' },
  ], v22);
  const cu = G6.phuVe([{ fact: 'chatLieu', op: 'LA', value: ['plastic', 'vải dệt'], nguon: 'tieuDe.420222', trich: '420222 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt' }], v22);
  return dung && !cu;
})());
kiem('phủ vế: vế giới hạn "Đã lắp với đầu nối điện" (8544.42) phủ bằng daGanDauNoi; vế đầu ngữ "Dây đơn dạng cuộn" KHÔNG phủ chỉ bằng dangCuon; "Các vật dẫn điện khác" (phần còn lại có phạm vi) không bị đòi', (() => { const v42 = G6.veCanPhu('8544', G6.phanNhomCuaNhom('8544').find((p) => p.hs6 === '854442')); const v11 = G6.veCanPhu('8544', G6.phanNhomCuaNhom('8544').find((p) => p.hs6 === '854411')); return G6.phuVe([{ fact: 'daGanDauNoi', op: 'CO', nguon: 'tieuDe.854442', trich: '854442 Đã lắp với đầu nối điện' }], v42.find((v) => /đầu nối/.test(v.chu))) && !G6.phuVe([{ fact: 'dangCuon', op: 'CO', nguon: 'tieuDe.85441', trich: '85441 Dây đơn dạng cuộn' }], v11.find((v) => /Dây đơn/.test(v.chu))) && !v42.some((v) => /vật dẫn điện/.test(v.chu)); })(), JSON.stringify(G6.veCanPhu('8544', G6.phanNhomCuaNhom('8544').find((p) => p.hs6 === '854442')).map((v) => v.chu)));
kiem('phủ vế: vế chất liệu nhiều phương án — chỉ khai "plastic" cho "bằng tấm plastic hoặc vật liệu dệt" (4202.22) ⇒ KHÔNG phủ', !G6.phuVe([{ fact: 'chatLieu', op: 'LA', value: 'plastic', nguon: 'tieuDe.420222', trich: '420222 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt' }], G6.veCanPhu('4202', G6.phanNhomCuaNhom('4202').find((p) => p.hs6 === '420222')).find((v) => /plastic/.test(v.chu))));
// Phủ vế tính theo ĐIỀU KIỆN, không theo từ khoá: tenLoai "Đầu nối" + tuKhoa "cáp quang" không mang vế "dùng cho … cáp quang".
{
  const ds = sao(MAU['8481'].tieuChi6); Object.assign(cua(ds, '848120'), { fact: 'tenLoai', op: 'TEN_LOAI', value: 'Van', dieuKien: 'Van', tuKhoa: ['thủy lực', 'khí nén'], nguon: 'tieuDe.848120', trich: '848120 Van dùng trong truyền động dầu thủy lực hoặc khí nén' });
  kiem('phủ vế: tuKhoa không thay được điều kiện (8481.20 tenLoai "Van" + tuKhoa "thủy lực, khí nén" ⇒ THIEU_VE_GIOI_HAN)', G6.kiemTieuChi6('8481', ds, { toKhai: false }).loi.some((l) => l.ma === 'THIEU_VE_GIOI_HAN' && l.hs6 === '848120'));
}
kiem('tách vế: 7323.91 ⇒ "Bằng gang đúc" + "chưa tráng men"; 8412.21 ⇒ vế tầng "thủy lực" + "Chuyển động tịnh tiến (xi lanh)"', JSON.stringify(ve('7323', '732391')) === JSON.stringify(['Bằng gang đúc', 'chưa tráng men']) && ve('8412', '841221').length === 2, JSON.stringify([ve('7323', '732391'), ve('8412', '841221')]));
kiem('tách vế: danh sách nhiều tên ("Bùi nhùi …; miếng cọ nồi …", "Đui đèn, phích cắm và ổ cắm") ⇒ không tách, không đòi', ve('7323', '732310').length === 0 && G6.tachVeTieuDe('Đui đèn, phích cắm và ổ cắm', new Set()).length === 0);
kiem('tách vế: "Bộ ngắt mạch tự động" giữ "tự động" (so giữ dấu chữ: "động" ≠ "đóng" của tên nhóm 85.36)', ve('8536', '853620').length === 1);
const op8536 = doc('docs/giao-viec/do-thi/thu-nhan-ban-1/lan-2/8536/luot-3.json').tieuChi6;
kiem('phần còn lại CÓ phạm vi (8536.30 "Thiết bị bảo vệ mạch điện khác"): có phanConLai ⇒ không DU_SAI_KHAI; bỏ phanConLai ⇒ DU_SAI_KHAI', !G6.kiemTieuChi6('8536', op8536, { toKhai: false }).loi.some((l) => l.ma === 'DU_SAI_KHAI' && l.hs6 === '853630') && G6.kiemTieuChi6('8536', op8536.filter((x) => !(x.hs6 === '853630' && x.phanConLai)), { toKhai: false }).loi.some((l) => l.ma === 'DU_SAI_KHAI' && l.hs6 === '853630'));
// Ba kiểu tiêu đề + thứ tự máy xếp, trên cây biểu thuế thật.
kiem('kiểu tiêu đề: "Thiết bị khác" / "Loại khác" = DU; "Thiết bị bảo vệ mạch điện khác" = DU_CO_PHAM_VI; "Van giảm áp", "Tượng nhỏ và các đồ trang trí khác" = CO_TEN', ['Thiết bị khác', '- - Loại khác'].every((t) => G6.kieuTieuDe(t) === 'DU') && ['Thiết bị bảo vệ mạch điện khác', 'Chất màu khác và các chế phẩm khác', 'Loại khác, dùng cho xe có động cơ'].every((t) => G6.kieuTieuDe(t) === 'DU_CO_PHAM_VI') && ['Van giảm áp', 'Tượng nhỏ và các đồ trang trí khác', 'Lecithins và các phosphoaminolipid khác'].every((t) => G6.kieuTieuDe(t) === 'CO_TEN'));
const { hangDu } = require('../lib/do-thi/dung-bang-canh.js');
kiem('C11 và cổng dùng CHUNG một hàm: hangDu("Tượng nhỏ và các đồ trang trí khác") = 0, "Thiết bị khác" = 1, "Loại khác, dùng cho …" = 2', hangDu('Tượng nhỏ và các đồ trang trí khác') === 0 && hangDu('Thiết bị khác') === 1 && hangDu('- - Loại khác, dùng cho xe') === 2 && require('../lib/do-thi/dung-bang-canh.js').hangDu === require('../lib/do-thi/phan-con-lai.js').hangDu);
const tt36 = G6.thuTuMay('8536');
kiem('thứ tự máy xếp 8536: theo mã; 853690 "Thiết bị khác" cuối cùng; 853649 / 853669 "Loại khác" sau anh em cùng tầng; 853630 "… bảo vệ mạch điện khác" giữ chỗ theo mã', tt36.get('853690') === 10 && tt36.get('853641') < tt36.get('853649') && tt36.get('853661') < tt36.get('853669') && tt36.get('853620') < tt36.get('853630') && tt36.get('853630') < tt36.get('853641'), JSON.stringify([...tt36]));
kiem('tầng tên "Loại khác" (73239 của nhóm 7323) không phải nguồn điều kiện: gói soạn không đưa tieuDe.73239, phân nhóm con không ghi thuocTang', !('tieuDe.73239' in G6.goiSoan('7323').nguon) && G6.goiSoan('7323').phanNhom.every((p) => !('thuocTang' in p)) && 'tieuDe.84122' in G6.goiSoan('8412').nguon);
kiem('thứ tự máy xếp 8481: 848120 có uuTien ⇒ lên đầu; không có uuTien ⇒ về chỗ theo mã', G6.thuTuMay('8481', ['848120']).get('848120') === 1 && G6.thuTuMay('8481').get('848120') === 2 && G6.thuTuMay('8481').get('848180') === 6);
// LECH_TO_KHAI_CAO chỉ là cảnh báo: gán từ khoá của 848120 cho 848110 ⇒ tờ khai van khí nén bị chỉ sang 848110.
const lech = (() => { const ds = sao(MAU['8481'].tieuChi6); const a = cua(ds, '848120'); const b = cua(ds, '848110'); Object.assign(b, { dieuKien: a.dieuKien, fact: a.fact, op: a.op, value: a.value, tuKhoa: a.tuKhoa, nguon: a.nguon, trich: a.trich, uuTien: a.uuTien }); delete a.uuTien; delete a.tienLe; Object.assign(a, { dieuKien: 'Van giảm áp', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Van giảm áp', tuKhoa: ['van giảm áp'] }); return G6.kiemTieuChi6('8481', ds); })();
kiem('LECH_TO_KHAI_CAO: tráo điều kiện 848120 ↔ 848110 ⇒ CẢNH BÁO kèm danh sách ca (không nằm trong danh sách lỗi)', lech.canhBao.some((c) => c.ma === 'LECH_TO_KHAI_CAO' && c.ca.length > 0) && !lech.loi.some((l) => l.ma === 'LECH_TO_KHAI_CAO'), JSON.stringify(lech.thongKe.toKhai && { sai: lech.thongKe.toKhai.sai, tong: lech.thongKe.toKhai.tong }));
kiem('mẫu 8481 / 8412: không có cảnh báo LECH_TO_KHAI_CAO', kq81.canhBao.length === 0 && kq12.canhBao.length === 0, JSON.stringify([kq81.canhBao, kq12.canhBao]).slice(0, 300));

// ── 3. Áp bản soạn: cổng đỏ thì KHÔNG ghi ───────────────────────────────────────────────────────────────────────
const banHong = { nhom: '8481', tieuChi6: sao(MAU['8481'].tieuChi6).filter((x) => x.hs6 !== '848140') };
const rHong = apVaoSoTay(banHong, { thu: true });
kiem('--ap: bản soạn có lỗi ⇒ không ghi sổ tay', rHong.ghi === false && rHong.kq.loi.some((l) => l.ma === 'THIEU_PHAN_NHOM'));
kiem('--ap --thu: bản đạt ⇒ qua cổng, không ghi', (() => { const r = apVaoSoTay(MAU['8412'], { thu: true }); return r.ghi === false && r.kq.loi.length === 0; })());

// ── 4. Luật khớp từ khoá (chỉ để đo) ────────────────────────────────────────────────────────────────────────────
const ap = (h4, moTa, che) => G6.apTieuChi(XEP[h4], moTa, { h4, che }).hs6;
kiem('áp: "van điện từ khí nén 5/2, cuộn coil 24VDC" ⇒ 848120 (xét trước phân nhóm dư)', ap('8481', 'Van điện từ khí nén 5/2 thân nhôm, cuộn coil 24VDC') === '848120');
kiem('áp: "vòi nước bằng đồng" ⇒ không kết luận (phân nhóm dư không bao giờ được chỉ bằng từ khoá)', ap('8481', 'Vòi nước bằng đồng lắp cho đường ống cấp nước') === null);
kiem('áp: lời phủ định "không phải loại truyền động dầu thủy lực hay khí nén" ⇒ không chỉ 848120', ap('8481', 'Van điện từ dùng cho tủ hấp (không phải loại truyền động dầu thủy lực hay khí nén)') === null);
kiem('áp: mô tả chỉ chép tên nhóm 84.81 ("… kể cả van giảm áp và van điều chỉnh bằng nhiệt") ⇒ không chỉ 848110', ap('8481', 'Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các loại tương tự, kể cả van giảm áp và van điều chỉnh bằng nhiệt: họng ga xe máy') === null);
kiem('áp: "bộ phận của bếp gas" ⇒ không chỉ 848190 (mục laBoPhan không có từ khoá gợi ý)', ap('8481', 'Cụm van đánh lửa, bộ phận của bếp gas') === null);
kiem('áp 8412: "xi lanh thủy lực" ⇒ 841221; "xi lanh khí nén" ⇒ 841231 (đổi một dữ kiện, đổi phân nhóm)', ap('8412', 'Xi lanh thuỷ lực tác động kép') === '841221' && ap('8412', 'Xi lanh khí nén MXQ8-50') === '841231');
kiem('áp 8412: "mô tơ thủy lực" (không có "xi lanh") ⇒ không kết luận — 841229 là phần còn lại của tầng', ap('8412', 'Mô tơ thủy lực di chuyển') === null);
kiem('áp 8412: "động cơ phản lực" ⇒ 841210; "tua bin phản lực" ⇒ không (luật ghi "trừ tua bin phản lực")', ap('8412', 'Động cơ phản lực xung') === '841210' && ap('8412', 'Động cơ phản lực loại tua bin phản lực') === null);
kiem('áp chế độ chặt (value): "van khí nén" KHÔNG đủ; "van dùng trong truyền động khí nén" mới đủ', ap('8481', 'van điện từ khí nén 5/2', 'value') === null && ap('8481', 'van định hướng dùng trong hệ thống truyền động khí nén', 'value') === '848120');

// ── 5. (a) Bảng cạnh có cạnh C10 (+ C13) cho hai nhóm mẫu ───────────────────────────────────────────────────────
const c81 = D.canhTu('8481', 'C10', { toiDa: 1000 }); const c12 = D.canhTu('8412', 'C10', { toiDa: 1000 });
kiem(`bảng cạnh: nhóm 8481 có ${c81.length} cạnh C10 phủ đủ 6 phân nhóm; nhóm 8412 có ${c12.length} cạnh phủ đủ 7`, new Set(c81.map((e) => e.toi)).size === 6 && new Set(c12.map((e) => e.toi)).size === 7);
const e20 = c81.find((e) => e.toi === '848120');
kiem('cạnh C10 8481→848120: bậc 1, thuTu 1, khoá dữ kiện (C13) "dungCho", có trích + uuTien nguyên văn, tiền lệ bậc 2', Boolean(e20) && e20.bac === 1 && e20.thuTu === 1 && e20.khoaDuKien === 'dungCho' && /truyền động khí nén/.test(e20.trich) && /ưu tiên xem xét trước/.test(e20.uuTien.trich) && e20.tienLe.length === 2 && e20.tienLe.every((t) => t.bac === 2), JSON.stringify(e20 || null).slice(0, 300));
const e80 = c81.find((e) => e.toi === '848180');
kiem('cạnh C10 8481→848180: phanConLai, không khoá dữ kiện, thuTu lớn nhất của nhóm', Boolean(e80) && e80.phanConLai === true && e80.khoaDuKien === null && e80.thuTu === Math.max(...c81.map((e) => e.thuTu)));
const c10 = D.bangCanh().canh.filter((e) => e.loai === 'C10');
kiem(`mọi cạnh C10 (${c10.length}): bậc 1, từ nhóm 4 số tới phân nhóm 6 số của chính nhóm đó, không sinhTuDong`, c10.length > 0 && c10.every((e) => e.bac === 1 && e.tu.length === 4 && e.toi.length === 6 && e.toi.startsWith(e.tu) && e.sinhTuDong === false));
kiem('cạnh C10 khuôn cũ (fact tự do) không mang khoá dữ kiện C13 — không giả vờ có kiểu', c10.filter((e) => !Number.isInteger(e.thuTu)).every((e) => e.khoaDuKien === null));

// ── 6. (b) Lõi câu hỏi: ca van 5/2 ──────────────────────────────────────────────────────────────────────────────
// Từ #1551 (L3): động cơ đã ra 6 số mà KẾT QUẢ không còn phân nhóm anh em thì không hỏi lại phân nhóm, kể cả khi đứng ở
// phân nhóm "… khác". Nên ca van 5/2 xét ở hai thế còn được hỏi: động cơ dừng ở 4 số, hoặc ra 848180 mà còn giữ 848120.
const H = require('../lib/hoi-theo-so-tay.js');
const VAN = 'Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch, cuộn coil 24VDC';
const dungCanCu = (q) => Boolean(q) && /^8481\.20/.test(q.options[0]) && q.canCu === 'so-tay' && q.nguon === 'ch84.chuong' && /khái niệm "van dùng trong truyền động dầu thủy lực hoặc truyền động khí nén"/.test(q.trich);
const q4 = H.cauPhanNhom6({ h4: '8481', top: '8481', ungVien6: [], text: VAN });
kiem('ca van 5/2 động cơ dừng ở 4 số: câu phân nhóm đưa 8481.20 lên đầu, căn cứ là Chú giải phân nhóm 3 Chương 84 (nguyên văn)', dungCanCu(q4), JSON.stringify(q4 || null).slice(0, 400));
const q = H.cauPhanNhom6({ h4: '8481', top: '848180', ungVien6: ['848120'], text: VAN });
kiem('ca van 5/2 động cơ ra 848180 còn giữ 848120: câu phân nhóm đưa 8481.20 lên đầu, cùng căn cứ', dungCanCu(q), JSON.stringify(q || null).slice(0, 400));
kiem('ca van 5/2 động cơ đã chốt 848180, không còn phân nhóm anh em: không hỏi lại phân nhóm (L3, #1551)', H.cauPhanNhom6({ h4: '8481', top: '848180', ungVien6: [], text: VAN }) === null);
const qNguoc = H.cauPhanNhom6({ h4: '8481', top: '8481', ungVien6: [], text: 'Vòi nước bằng đồng lắp cho chậu rửa' });
kiem('ca ngược: vòi nước bằng đồng dừng ở 4 số ⇒ câu hỏi không gợi ý 848120 theo mô tả', Boolean(qNguoc) && !qNguoc.phanNhomKhopMoTa.some((x) => x.hs6 === '848120'));

// ── 7. Gói soạn: tất định, đủ thứ một AI không có bối cảnh cần ──────────────────────────────────────────────────
const g1 = G6.goiSoan('8481'); const g2 = G6.goiSoan('8481');
kiem('gói soạn 8481: dựng hai lần giống hệt, không có trường thời gian', JSON.stringify(g1) === JSON.stringify(g2) && !/sinhLuc|generatedAt|"luc"/.test(JSON.stringify(g1)));
kiem('gói soạn 8481: đủ 6 phân nhóm, đánh dấu 848180 là dư, có Chú giải phân nhóm 3 nguyên văn, ≤ 20 tờ khai mẫu, có thông báo 851 / 852', g1.phanNhom.length === 6 && g1.phanNhom.find((p) => p.hs6 === '848180').kieu === 'DU' && g1.phanNhom.find((p) => p.hs6 === '848120').kieu === 'CO_TEN' && /Phân nhóm 8481\.20 được ưu tiên xem xét trước/.test(g1.nguon['ch84.chuong'].vanBan) && g1.toKhaiMau.length > 0 && g1.toKhaiMau.length <= 20 && ['851/TB-TCHQ', '852/TB-TCHQ'].every((s) => g1.thongBaoPhanLoai.some((t) => t.so === s)));
kiem('gói soạn: không đưa dòng 8 số thường / tiêu đề cấp dưới 6 số làm nguồn; tờ khai mẫu không kèm câu khai thô', !Object.keys(g1.nguon).some((k) => /^tax\./.test(k) || /^tieuDe\.\d{7}|~r/.test(k)) && g1.toKhaiMau.every((x) => !('moTa' in x) && !('sampleDesc' in x)));
const g12 = G6.goiSoan('8412');
kiem('gói soạn 8412: phân nhóm là dòng lá (841221) có nguồn tên tax.84122100; tầng một gạch 84122 có tieuDe', g12.phanNhom.find((p) => p.hs6 === '841221').nguonTen === 'tax.84122100' && 'tax.84122100' in g12.nguon && 'tieuDe.84122' in g12.nguon);
kiem('gói soạn: mọi khoá gợi ý đều có trong tu-vung và ghi op hợp lệ', g1.khoaGoiY.length >= 5 && g1.khoaGoiY.every((k) => k.khoa && k.op.length > 0) && ['tenLoai', 'dungCho', 'laBoPhan'].every((k) => g1.khoaGoiY.some((x) => x.khoa === k)));

// ── 8. Đường khách chỉ được chạm module cổng qua duong-do-thi.js (bước 6 của kế hoạch, sau HS_TIM_TRUOC=do-thi mặc định tắt) và chỉ lấy diXuong6 ──
const { tepMa, baoDongBo, tenLayTu } = await import('./lib-luat.mjs');
const CUA_VAO = 'lib/do-thi/duong-do-thi.js';
const nap = [...tepMa('api'), 'server.js'].filter((t) => [...baoDongBo(t, (tu) => tu === CUA_VAO)].some((x) => x === 'lib/do-thi/tieu-chi-6.js'));
kiem('không route nào trong api/ nạp lib/do-thi/tieu-chi-6.js ngoài lối vào duong-do-thi.js', nap.length === 0, nap.join(', '));
kiem('duong-do-thi.js chỉ lấy diXuong6 từ module cổng (không lấy gói soạn, không lấy cổng kiểm)', tenLayTu(CUA_VAO, 'lib/do-thi/tieu-chi-6.js')?.join() === 'diXuong6', String(tenLayTu(CUA_VAO, 'lib/do-thi/tieu-chi-6.js')));
// ── 9. #1583 (KHOA_RONG_HON_LUAT, dieuKienTru, tách vế loại trừ) + #1586 (phân nhóm không phải DU thiếu điều kiện riêng) ──
kiem('ca ngược #1583: 6704 / 6913 (chuaSoHoa) và 6004 (hamLuongSoiDanHoi >= 5% + dieuKienTru ["sợi cao su"]) đạt 0 lỗi',
  ['6704', '6913', '6004'].every((h) => tiem(h, () => {}).loi.length === 0),
  JSON.stringify(['6704', '6913', '6004'].map((h) => [h, ma(tiem(h, () => {}))])));
kiem('KHOA_RONG_HON_LUAT (chatLieu gộp): gốm sứ trên "Bằng sứ"/"Bằng gốm" đỏ nhưng "Bằng gốm sứ" đạt; sắt thép trên chỉ "sắt"/"thép" đỏ nhưng 7323.94 "Bằng sắt (trừ gang đúc) hoặc thép" đạt; kim loại trên kim loại cụ thể đỏ nhưng "kim loại cơ bản" đạt',
  Boolean(G6.khoaRongHonLuat('chatLieu', 'gốm sứ', 'Bằng sứ'))
  && Boolean(G6.khoaRongHonLuat('chatLieu', 'gốm sứ', 'Bằng gốm'))
  && G6.khoaRongHonLuat('chatLieu', 'gốm sứ', 'Bằng gốm sứ') === null
  && Boolean(G6.khoaRongHonLuat('chatLieu', 'sắt thép', 'Bằng sắt'))
  && Boolean(G6.khoaRongHonLuat('chatLieu', 'sắt thép', 'Bằng thép'))
  && G6.khoaRongHonLuat('chatLieu', 'sắt thép', '73239400 - - Bằng sắt (trừ gang đúc) hoặc thép, đã tráng men') === null
  && ['đồng', 'nhôm', 'kẽm', 'thép', 'sắt', 'kim loại quý', 'niken', 'chì', 'thiếc', 'titan'].every((kl) => Boolean(G6.khoaRongHonLuat('chatLieu', 'kim loại', `Bằng ${kl}`)))
  && G6.khoaRongHonLuat('chatLieu', 'kim loại', 'Bằng kim loại cơ bản') === null
  && G6.khoaRongHonLuat('chatLieu', 'kim loại', 'Bằng kim loại') === null);
kiem('KHOA_RONG_HON_LUAT (bổ ngữ thu hẹp & tương thích): 6704 "vải dệt" rơi "tổng hợp" đỏ + không phủ vế; có mục khẳng định khác phủ "tổng hợp" thì sạch; 6109.90 ("Từ các vật liệu dệt khác") và 4202.22 ("tấm plastic hoặc vật liệu dệt") giữ nguyên 0 lỗi',
  Boolean(G6.khoaRongHonLuat('chatLieu', 'vải dệt', '67041 Bằng vật liệu dệt tổng hợp'))
  && !G6.phuVe([{ fact: 'chatLieu', op: 'LA', value: 'vải dệt', nguon: 'tieuDe.67041', trich: '67041 Bằng vật liệu dệt tổng hợp' }], G6.veCanPhu('6704', G6.phanNhomCuaNhom('6704').find((p) => p.hs6 === '670411')).find((v) => /tổng hợp/.test(v.chu)))
  && G6.khoaRongHonLuat('chatLieu', 'vải dệt', '67041 Bằng vật liệu dệt tổng hợp', { mucCungPn: [{ fact: 'loaiSoiDet', op: 'TRONG', value: ['SOI_TONG_HOP'], dieuKien: 'vật liệu dệt tổng hợp' }] }) === null
  && G6.khoaRongHonLuat('chatLieu', 'vải dệt', '610990 Từ các vật liệu dệt khác') === null
  && G6.khoaRongHonLuat('chatLieu', ['plastic', 'vải dệt'], '420222 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt') === null
  && Boolean(G6.khoaRongHonLuat('chatLieu', 'cao su', 'Bằng cao su lưu hóa'))
  && Boolean(G6.khoaRongHonLuat('chatLieu', 'vải dệt', 'Bằng vải không dệt'))
  && Boolean(G6.khoaRongHonLuat('chatLieu', 'vải dệt', 'Từ vải dệt kim tổng hợp'))
  && Boolean(G6.khoaRongHonLuat('chatLieu', 'vải dệt', 'Bằng vải dệt thoi')));
kiem('KHOA_RONG_HON_LUAT (tinhDanHoi): đỏ cả khi dùng tinhDanHoi op KHONG / chieu PHAI_KHONG cho 6004.10; 5806.20 có cả hai loại sợi thì sạch',
  tiem('6004', (ds) => { const x = cua(ds, '600410'); ds.push({ hs6: '600410', dieuKien: 'không bao gồm sợi cao su', fact: 'tinhDanHoi', op: 'KHONG', nguon: 'tieuDe.600410', trich: x.trich }); delete x.dieuKienTru; }).loi.some((l) => l.ma === 'KHOA_RONG_HON_LUAT')
  && tiem('6004', (ds) => { const x = cua(ds, '600410'); ds.push({ hs6: '600410', dieuKien: 'không bao gồm sợi cao su', fact: 'tinhDanHoi', op: 'CO', chieu: 'PHAI_KHONG', nguon: 'tieuDe.600410', trich: x.trich }); delete x.dieuKienTru; }).loi.some((l) => l.ma === 'KHOA_RONG_HON_LUAT')
  && G6.khoaRongHonLuat('tinhDanHoi', undefined, '580620 Vải dệt thoi khác, có hàm lượng sợi đàn hồi (elastomeric) hoặc sợi cao su chiếm từ 5% trở lên tính theo khối lượng') === null);
kiem('khoaPhuHop #1583: 6704 ("Bằng vật liệu dệt tổng hợp") và 6913 ("Bằng sứ") không trả chatLieu; 6004.10 không trả tinhDanHoi (trả hamLuongSoiDanHoi)',
  G6.khoaPhuHop('6704', 'Bằng vật liệu dệt tổng hợp') === null
  && G6.khoaPhuHop('6913', 'Bằng sứ') === null
  && G6.khoaPhuHop('6004', 'Có hàm lượng sợi đàn hồi chiếm từ 5% trở lên tính theo khối lượng nhưng không bao gồm sợi cao su') === 'hamLuongSoiDanHoi');
kiem('tachVeTru: trích đúng nội dòng & trong ngoặc; giữ nguyên cận số "nhưng không quá …" của 8504.32',
  JSON.stringify(G6.tachVeTru('Có hàm lượng sợi đàn hồi chiếm từ 5% trở lên tính theo khối lượng nhưng không bao gồm sợi cao su')) === JSON.stringify(['sợi cao su'])
  && JSON.stringify(G6.tachVeTru('Công suất danh định trên 1 kVA nhưng không quá 16 kVA')) === JSON.stringify([])
  && JSON.stringify(G6.tachVeTru('Thuyền máy, trừ loại có thể bơm hơi, không bao gồm thuyền máy có gắn máy bên ngoài')) === JSON.stringify(['loại có thể bơm hơi', 'thuyền máy có gắn máy bên ngoài'])
  && JSON.stringify(G6.tachVeTru('Bằng sắt (trừ gang đúc) hoặc thép, đã tráng men')) === JSON.stringify(['gang đúc']));
kiem('dieuKienTru: cấm trên phanConLai / chuaSoHoa / mục phủ định / rỗng; tách biệt dấu vết TRUNG_DIEU_KIEN', (() => {
  const trenDu = tiem('6004', (ds) => { cua(ds, '600490').dieuKienTru = ['sợi cao su']; });
  const trenChua = tiem('6913', (ds) => { cua(ds, '691310').dieuKienTru = ['sứ']; });
  const trenPd = tiem('8412', (ds) => { cua(ds, '841210', (x) => x.chieu === 'PHAI_KHONG').dieuKienTru = ['tua bin']; });
  const rong = tiem('6004', (ds) => { cua(ds, '600410').dieuKienTru = []; });
  const khacDauVet = G6.kiemTieuChi6('6004', [
    ...sao(DS_6004_CHUAN).filter((x) => x.hs6 === '600410'),
    { ...sao(DS_6004_CHUAN)[0], hs6: '600490', dieuKienTru: ['khác'] },
  ], { toKhai: false });
  return trenDu.loi.some((l) => l.ma === 'DU_MANG_DIEU_KIEN')
    && trenChua.loi.some((l) => l.ma === 'KHUON_SAI')
    && trenPd.loi.some((l) => l.ma === 'KHUON_SAI')
    && rong.loi.some((l) => l.ma === 'KHUON_SAI')
    && !khacDauVet.loi.some((l) => l.ma === 'TRUNG_DIEU_KIEN');
})());
kiem('apTieuChi với dieuKienTru (6004) & ranh giới RE_PHU_DINH_TRUOC: khớp "vải dệt kim 8% sợi đàn hồi" và câu giữ nguyên phủ định "nhưng không bao gồm sợi cao su"; loại "kết hợp sợi cao su"; "dự trữ" không chặn nhầm "truyền động khí nén"',
  G6.apTieuChi(DS_6004_CHUAN, 'vải dệt kim 8% sợi đàn hồi').hs6 === '600410'
  && G6.apTieuChi(DS_6004_CHUAN, 'vải dệt kim 8% sợi đàn hồi nhưng không bao gồm sợi cao su').hs6 === '600410'
  && G6.apTieuChi(DS_6004_CHUAN, 'vải dệt kim 8% sợi đàn hồi kết hợp sợi cao su').hs6 === null
  && G6.apTieuChi(DS_6004_CHUAN, 'vải dệt kim 8% spandex').hs6 === null
  && ap('8481', 'Van điện từ dự trữ truyền động khí nén') === '848120'
  && ap('8481', 'Van điện từ trụ đỡ truyền động khí nén') === '848120');
kiem('#1586 (7009.91/92 & phân nhóm không phải DU): 7009 qua cổng với 0 lỗi (7009.91/92 cảnh báo THIEU_KHOA_TU_VUNG); thay 7009.91 bằng mục rỗng hoặc bỏ điều kiện riêng dưới tầng có tên đều đỏ KHUON_SAI', (() => {
  const st7009 = doc('data/so-tay/7009.json').tieuChi6;
  const kq7009 = G6.kiemTieuChi6('7009', st7009, { toKhai: false });
  const hong7009 = sao(st7009).map((x) => (x.hs6 === '700991' ? { hs6: '700991', nguon: 'tax.70099100', trich: '70099100 - - Chưa có khung' } : x));
  const kqHong7009 = G6.kiemTieuChi6('7009', hong7009, { toKhai: false });
  return kq7009.loi.length === 0
    && kq7009.canhBao.some((c) => c.ma === 'THIEU_KHOA_TU_VUNG' && c.hs6 === '700991')
    && kq7009.canhBao.some((c) => c.ma === 'THIEU_KHOA_TU_VUNG' && c.hs6 === '700992')
    && kqHong7009.loi.some((l) => l.ma === 'KHUON_SAI' && l.hs6 === '700991');
})());

// ── 10. #1595 (T-3): sửa cổng nhỏ — RE_LUAT_CONG_DUNG "lắp vào" (3926.30), THU_TU_TRUONG dieuKienTru, tachVeTieuDe "hàng hóa tương tự" (7326.11), soPha "đa pha" ──
{
  // (a) RE_LUAT_CONG_DUNG: "lắp vào" (3926.30)
  const T392630 = 'Phụ kiện lắp vào đồ nội thất, trên thân xe (coachwork) hoặc các loại tương tự';
  const kc3926 = [{ hoi: 'Sản phẩm bằng plastic phải không?', nguon: 'nhom3926.nhom', trich: 'Nhóm này bao gồm các sản phẩm, chưa được chi tiết hoặc ghi ở nơi khác, bằng plastic' }];
  const DS_3926 = [
    { hs6: '392610', dieuKien: 'Đồ dùng', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Đồ dùng', tuKhoa: ['đồ dùng trong văn phòng'], nguon: 'tax.39261000', trich: 'Đồ dùng trong văn phòng hoặc trường học' },
    { hs6: '392610', dieuKien: 'Dùng trong văn phòng hoặc trường học', fact: 'dungCho', op: 'CONG_DUNG', value: ['văn phòng', 'trường học'], tuKhoa: ['văn phòng', 'trường học'], nguon: 'tax.39261000', trich: 'Đồ dùng trong văn phòng hoặc trường học', kiemChung: kc3926 },
    { hs6: '392620', dieuKien: 'Hàng may mặc và đồ phụ trợ may mặc', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Hàng may mặc', 'đồ phụ trợ may mặc', 'găng tay', 'găng hở ngón', 'găng bao tay'], tuKhoa: ['hàng may mặc', 'găng tay'], nguon: 'tieuDe.392620', trich: 'Hàng may mặc và đồ phụ trợ may mặc (kể cả găng tay, găng hở ngón và găng bao tay)' },
    { hs6: '392630', dieuKien: 'Phụ kiện', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Phụ kiện', tuKhoa: ['phụ kiện lắp vào đồ nội thất'], nguon: 'tax.39263000', trich: T392630 },
    { hs6: '392630', dieuKien: 'Lắp vào đồ nội thất, trên thân xe', fact: 'dungCho', op: 'CONG_DUNG', value: ['đồ nội thất', 'thân xe'], tuKhoa: ['đồ nội thất', 'thân xe'], nguon: 'tax.39263000', trich: T392630, kiemChung: kc3926 },
    { hs6: '392640', dieuKien: 'Tượng nhỏ và đồ trang trí', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Tượng nhỏ', 'đồ trang trí'], tuKhoa: ['tượng nhỏ', 'đồ trang trí'], nguon: 'tax.39264000', trich: 'Tượng nhỏ và các đồ trang trí khác' },
    { hs6: '392690', phanConLai: true, nguon: 'tieuDe.392690', trich: '392690 Loại khác' },
  ];
  const kq3926 = G6.kiemTieuChi6('3926', DS_3926, { toKhai: false });
  const boKc3926 = G6.kiemTieuChi6('3926', DS_3926.map((x) => (x.hs6 === '392630' && x.fact === 'dungCho' ? (({ kiemChung, ...rest }) => rest)(x) : x)), { toKhai: false });
  const tuNhan3926 = G6.kiemTieuChi6('3926', DS_3926.map((x) => (x.hs6 === '392630' && x.fact === 'dungCho'
    ? { ...x, dieuKien: 'Dùng cho đồ nội thất', value: 'đồ nội thất', tuKhoa: ['đồ nội thất'], nguon: 'nhom3926.nhom', trich: 'chân đệm đặt dưới đồ nội thất' }
    : x)), { toKhai: false });
  kiem('T-3a RE_LUAT_CONG_DUNG "lắp vào" (3926.30 thuận): mục dungCho trích lời "lắp vào" + kiemChung ⇒ 0 lỗi, không CHI_HOI_MUC_DICH; bỏ kiemChung ⇒ cảnh báo CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG (không đỏ)',
    kq3926.loi.length === 0
    && !kq3926.canhBao.some((c) => c.ma === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG')
    && boKc3926.loi.length === 0
    && boKc3926.canhBao.some((c) => c.ma === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG' && c.hs6 === '392630')
    && MD('Phụ kiện dùng cho đồ nội thất, trên thân xe?', { chuLuat: T392630 }) === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG'
    && MD('Phụ kiện dùng cho đồ nội thất, trên thân xe?', { chuLuat: T392630, cauPhu: ['Sản phẩm bằng plastic phải không?'] }) === null,
    JSON.stringify([kq3926.loi, boKc3926.loi, boKc3926.canhBao]));
  kiem('T-3a RE_LUAT_CONG_DUNG (3926.30 nghịch): trích không có lời công dụng (không dùng/cho/để/sử dụng/lắp vào) ⇒ vẫn đỏ CHI_HOI_MUC_DICH',
    tuNhan3926.loi.some((l) => l.ma === 'CHI_HOI_MUC_DICH' && l.hs6 === '392630')
    && MD('Phụ kiện dùng cho đồ nội thất, trên thân xe?', { chuLuat: 'Phụ kiện đồ nội thất, trên thân xe' }) === 'CHI_HOI_MUC_DICH',
    JSON.stringify(tuNhan3926.loi));

  // (c) THU_TU_TRUONG giữ dieuKienTru trong chuanMuc & mucLuu
  const mauCoTru = { ...sao(DS_6004_CHUAN)[0], dieuKienTru: 'cầu chì nhiệt' };
  const cCoTru = chuanMuc(mauCoTru);
  const mCoTru = mucLuu('6004', [mauCoTru, sao(DS_6004_CHUAN)[1]]).find((x) => x.hs6 === '600410');
  const mChuan6004 = mucLuu('6004', sao(DS_6004_CHUAN)).find((x) => x.hs6 === '600410');
  kiem('T-3c THU_TU_TRUONG (thuận): chuanMuc & mucLuu giữ nguyên dieuKienTru',
    cCoTru.dieuKienTru === 'cầu chì nhiệt'
    && mCoTru?.dieuKienTru === 'cầu chì nhiệt'
    && JSON.stringify(mChuan6004?.dieuKienTru) === JSON.stringify(['sợi cao su']),
    JSON.stringify({ cCoTru, mCoTru, mChuan6004 }));
  const mauKhongTru = { ...sao(DS_6004_CHUAN)[0], truongLa: 1 };
  delete mauKhongTru.dieuKienTru;
  const cKhongTru = chuanMuc(mauKhongTru);
  const mKhongTru = mucLuu('6004', [mauKhongTru, sao(DS_6004_CHUAN)[1]]).find((x) => x.hs6 === '600410');
  kiem('T-3c THU_TU_TRUONG (nghịch): mục không mang dieuKienTru không bị chèn trường rỗng và truongLa bị loại',
    !('dieuKienTru' in cKhongTru) && cKhongTru.dieuKienTru === undefined && !('truongLa' in cKhongTru)
    && !('dieuKienTru' in mKhongTru) && mKhongTru.dieuKienTru === undefined && !('truongLa' in mKhongTru),
    JSON.stringify({ cKhongTru, mKhongTru }));

  // (d) tachVeTieuDe bỏ "hàng hóa tương tự" / "hàng hoá tương tự" (7326.11)
  const v7326A = G6.tachVeTieuDe('Bi nghiền và các hàng hóa tương tự dùng cho máy nghiền', new Set());
  const v7326B = G6.tachVeTieuDe('Bi nghiền và các hàng hoá tương tự dùng cho máy nghiền', new Set());
  const pn732611 = G6.phanNhomCuaNhom('7326').find((p) => p.hs6 === '732611');
  const ve732611Dau = G6.veCanPhu('7326', pn732611).find((v) => v.loai === 'DAU');
  kiem('T-3d tachVeTieuDe 7326.11 (thuận): bỏ "và các hàng hóa/hoá tương tự", chỉ giữ bi/nghiền + dùng/cho/máy/nghiền và phuVe TUONG_TU đạt',
    JSON.stringify(v7326A.map((v) => [v.loai, v.chinh])) === JSON.stringify([['DAU', ['bi', 'nghiên']], ['GIOI_HAN', ['may', 'nghiên']]])
    && JSON.stringify(v7326B.map((v) => [v.loai, v.chinh])) === JSON.stringify([['DAU', ['bi', 'nghiên']], ['GIOI_HAN', ['may', 'nghiên']]])
    && Boolean(ve732611Dau) && JSON.stringify(ve732611Dau.chinh) === JSON.stringify(['bi', 'nghiên'])
    && G6.phuVe([{ fact: 'tenLoai', op: 'TUONG_TU', value: 'Bi nghiền', nguon: 'tax.73261100', trich: 'Bi nghiền và các hàng hóa tương tự dùng cho máy nghiền' }], ve732611Dau),
    JSON.stringify({ v7326A, v7326B, ve732611Dau }));
  const vTrucThep = G6.tachVeTieuDe('Bi nghiền và trục thép dùng cho máy nghiền', new Set());
  const vHangHoa = G6.tachVeTieuDe('Hàng hóa bằng sắt hoặc thép', new Set());
  kiem('T-3d tachVeTieuDe (nghịch): không cắt "trục thép" hay "Hàng hóa" khi không đi với "tương tự"',
    JSON.stringify(vTrucThep.map((v) => v.chinh)) === JSON.stringify([['bi', 'nghiên', 'truc', 'thep'], ['may', 'nghiên']])
    && JSON.stringify(vHangHoa.map((v) => v.chinh)) === JSON.stringify([['hang', 'hoa'], ['săt', 'thep']]),
    JSON.stringify({ vTrucThep, vHangHoa }));

  // (b) kiểm chéo tieu-chi-6 đọc cachDocThem "đa pha" của soPha.NHIEU_PHA
  kiem('T-3b tieu-chi-6 đọc cachDocThem: phuVe nhận "đa pha" qua soPha.NHIEU_PHA và không phủ nhầm "một pha"; 8501 gợi ý soPha',
    G6.goiSoan('8501').khoaGoiY.some((k) => k.khoa === 'soPha')
    && G6.phuVe([{ fact: 'soPha', op: 'TRONG', value: ['NHIEU_PHA'], nguon: 'tieuDe.85015', trich: 'Động cơ xoay chiều khác, đa pha' }], { chu: 'có đa pha', loai: 'GIOI_HAN', chinh: ['đa', 'pha'], phu: [], coSo: false })
    && !G6.phuVe([{ fact: 'soPha', op: 'TRONG', value: ['NHIEU_PHA'], nguon: 'tieuDe.85015', trich: 'Động cơ xoay chiều khác, đa pha' }], { chu: 'có một pha', loai: 'GIOI_HAN', chinh: ['môt', 'pha'], phu: [], coSo: false }));
}

// ── 11. T-1: KHOA_HEP_HON_LUAT, nhóm OR vật liệu + từ vựng trên apTieuChi, và sổ tay 4202 / 6109 ──
{
  kiem('T-1 KHOA_HEP_HON_LUAT (thuận): chatLieu "vải dệt" trên "vật liệu dệt" / "textile materials" / vế trừ ⇒ đỏ cả khi là mảng',
    Boolean(G6.khoaHepHonLuat('chatLieu', 'vải dệt', '420212 Mặt ngoài bằng plastic hoặc vật liệu dệt'))
    && Boolean(G6.khoaHepHonLuat('chatLieu', ['plastic', 'vải dệt'], '420292 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt'))
    && Boolean(G6.khoaHepHonLuat('chatLieu', 'vải dệt', '610990 Từ các vật liệu dệt khác'))
    && Boolean(G6.khoaHepHonLuat('chatLieu', 'vải dệt', 'With outer surface of sheeting of plastics or of textile materials'))
    && Boolean(G6.khoaHepHonLuat('chatLieu', 'vải dệt', 'Hàng hóa, trừ loại bằng vật liệu dệt', { laPhuDinh: true })));

  kiem('T-1 KHOA_HEP_HON_LUAT (nghịch): "vải dệt" / "woven fabrics" hoặc vatLieuKhac ["VAT_LIEU_DET"] ⇒ null',
    G6.khoaHepHonLuat('chatLieu', 'vải dệt', '630221 Khăn bàn bằng vải dệt cotton') === null
    && G6.khoaHepHonLuat('chatLieu', 'vải dệt', 'Bằng vật liệu dệt (vải dệt)') === null
    && G6.khoaHepHonLuat('chatLieu', 'vải dệt', 'Of woven fabrics') === null
    && G6.khoaHepHonLuat('vatLieuKhac', ['VAT_LIEU_DET'], '420212 Mặt ngoài bằng plastic hoặc vật liệu dệt') === null);

  kiem('T-1 KHOA_HEP_HON_LUAT (kim loại cơ bản): đỏ khi chọn kim loại hẹp / kimLoaiCoBanKhac; sạch khi chọn "kim loại", luật nêu "bằng thép", hoặc liệt kê kèm sắt/thép',
    Boolean(G6.khoaHepHonLuat('chatLieu', 'sắt thép', '830210 Bản lề bằng kim loại cơ bản'))
    && Boolean(G6.khoaHepHonLuat('chatLieu', 'đồng', 'Of base metal'))
    && Boolean(G6.khoaHepHonLuat('kimLoaiCoBanKhac', 'CHI', '830250 Giá, móc treo bằng kim loại cơ bản'))
    && G6.khoaHepHonLuat('chatLieu', 'kim loại', '830210 Bản lề bằng kim loại cơ bản') === null
    && G6.khoaHepHonLuat('chatLieu', 'sắt thép', '732310 Bằng sắt hoặc thép') === null
    && G6.khoaHepHonLuat('chatLieu', 'sắt thép', 'Bằng sắt, thép hoặc kim loại cơ bản khác') === null
    && G6.khoaHepHonLuat('chatLieu', 'nhôm', 'Bằng kim loại cơ bản dùng cho đồng hồ') === 'chatLieu (nhôm) hẹp hơn chữ luật ("kim loại cơ bản"). Dùng chatLieu: "kim loại"');

  kiem('T-1 KHOA_HEP_HON_LUAT (plastic chung): đỏ khi chọn lamTuPVC / nhomPolyme / PLASTIC_XOP trên plastic chung; sạch khi chọn chatLieu "plastic" hoặc luật nêu PVC / xốp',
    Boolean(G6.khoaHepHonLuat('lamTuPVC', true, '420212 Mặt ngoài bằng plastic hoặc vật liệu dệt'))
    && Boolean(G6.khoaHepHonLuat('nhomPolyme', ['TRUNG_HOP'], '940592 Bằng plastic'))
    && Boolean(G6.khoaHepHonLuat('vatLieuKhac', ['PLASTIC_XOP'], 'Of plastics'))
    && G6.khoaHepHonLuat('chatLieu', 'plastic', '940592 Bằng plastic') === null
    && G6.khoaHepHonLuat('lamTuPVC', true, 'Bằng PVC (polyvinyl clorua)') === null
    && G6.khoaHepHonLuat('vatLieuKhac', ['PLASTIC_XOP'], 'Bằng plastic xốp') === null);

  kiem('T-1 KHOA_RONG_HON_LUAT trên vatLieuKhac: "VAT_LIEU_DET" rơi "tổng hợp" (6704.1) bị chặn; 6109.90 / 4202.11 / 4202.22 sạch',
    Boolean(G6.khoaRongHonLuat('vatLieuKhac', ['VAT_LIEU_DET'], '67041 Bằng vật liệu dệt tổng hợp'))
    && G6.khoaRongHonLuat('vatLieuKhac', ['VAT_LIEU_DET'], '610990 Từ các vật liệu dệt khác') === null
    && G6.khoaRongHonLuat('vatLieuKhac', ['DA_THUOC', 'DA_THUOC_TONG_HOP'], '420211 Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp') === null
    && G6.khoaRongHonLuat('vatLieuKhac', ['VAT_LIEU_DET'], '420222 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt') === null);

  const ap4202 = (moTa) => G6.apTieuChi(GOC_TIEM['4202'], moTa, { h4: '4202' }).hs6;
  kiem('T-1 apTieuChi 4202 (thuận + nghịch): vải không dệt PP & nhựa & da thật & phủ định',
    ap4202('túi vải không dệt PP') === '420292'
    && ap4202('túi xách tay vải không dệt PP') === '420222'
    && ap4202('vali kéo bằng nhựa') === '420212'
    && ap4202('vali mặt ngoài nhựa ABS') === '420212'
    && ap4202('vali mặt ngoài plastic') === '420212'
    && ap4202('túi xách tay bằng da thật') !== '420222'
    && ap4202('vali kéo không phải bằng nhựa') !== '420212',
    JSON.stringify({
      tui: ap4202('túi vải không dệt PP'),
      xachTay: ap4202('túi xách tay vải không dệt PP'),
      nhua: ap4202('vali kéo bằng nhựa'),
      abs: ap4202('vali mặt ngoài nhựa ABS'),
      plastic: ap4202('vali mặt ngoài plastic'),
      daThat: ap4202('túi xách tay bằng da thật'),
      phuDinh: ap4202('vali kéo không phải bằng nhựa'),
    }));

  const dsOrVaAnd = [
    { hs6: '999910', thuTu: 1, fact: 'tenLoai', op: 'TEN_LOAI', value: 'hộp', tuKhoa: ['hộp'], nguon: 'tieuDe.999910', trich: '999910 Hộp bằng plastic hoặc vật liệu dệt' },
    { hs6: '999910', thuTu: 1, fact: 'chatLieu', op: 'LA', value: 'plastic', tuKhoa: ['plastic'], nguon: 'tieuDe.999910', trich: '999910 Hộp bằng plastic hoặc vật liệu dệt' },
    { hs6: '999910', thuTu: 1, fact: 'vatLieuKhac', op: 'TRONG', value: ['VAT_LIEU_DET'], tuKhoa: ['vật liệu dệt'], nguon: 'tieuDe.999910', trich: '999910 Hộp bằng plastic hoặc vật liệu dệt' },
    { hs6: '999920', thuTu: 2, fact: 'chatLieu', op: 'LA', value: 'gỗ', tuKhoa: ['gỗ'], nguon: 'tieuDe.999920', trich: '999920 Loại khác bằng gỗ và vật liệu dệt' },
    { hs6: '999920', thuTu: 2, fact: 'vatLieuKhac', op: 'TRONG', value: ['VAT_LIEU_DET'], tuKhoa: ['vật liệu dệt'], nguon: 'tieuDe.999920', trich: '999920 Loại khác bằng gỗ và vật liệu dệt' },
  ];
  kiem('T-1 apTieuChi phân biệt OR (cùng nguồn có "hoặc" vẫn giữ điều kiện tenLoai AND) với AND (không có "hoặc")',
    G6.apTieuChi(dsOrVaAnd, 'hộp vải không dệt').hs6 === '999910'
    && G6.apTieuChi(dsOrVaAnd, 'vải không dệt').hs6 === null
    && G6.apTieuChi(dsOrVaAnd, 'khay bằng gỗ').hs6 === null
    && G6.apTieuChi(dsOrVaAnd, 'khay bằng gỗ bọc vải không dệt').hs6 === '999920');
}

// T-5 — kiểm chứng toàn bộ 8 nâng cấp từ vựng + cổng cho Top-93 & Lô 3 (3926, 8501, 7326, 8483, 4016).
{
  // 1. phan-con-lai.js: tiêu đề có dấu phẩy ("Dụng cụ, thiết bị và máy khác", "Giày, dép khác")
  kiem('T-5 kieuTieuDe dấu phẩy + hangDu: 9031.80 & 6401–6403 = DU; 6403.40 = DU_CO_PHAM_VI; 3926.40 giữ CO_TEN',
    G6.kieuTieuDe('Dụng cụ, thiết bị và máy khác') === 'DU'
    && G6.kieuTieuDe('Giày, dép khác') === 'DU'
    && G6.kieuTieuDe('Giày, dép khác, có mũi gắn kim loại bảo vệ') === 'DU_CO_PHAM_VI'
    && G6.kieuTieuDe('Tượng nhỏ và các đồ trang trí khác') === 'CO_TEN'
    && G6.kieuTieuDe('Thiết bị bảo vệ mạch điện khác') === 'DU_CO_PHAM_VI'
    && hangDu('Loại khác') === 2
    && hangDu('Dụng cụ, thiết bị và máy khác') === 1
    && hangDu('Giày, dép khác') === 1);

  // 2. Quét SO trên câu gốc trước cắt giới hạn (8501 đủ 13 PN6 công suất, 3925.10, 8504.32, giữ 8536.41 = dungCho)
  const pn8501 = G6.phanNhomCuaNhom('8501');
  const pn8501PowerW = pn8501.filter((p) => /^(?:850110|850120|85013\d|85015\d|85017\d)$/.test(p.hs6));
  const pn8501PowerKva = pn8501.filter((p) => /^85016\d$/.test(p.hs6));
  kiem('T-5 khoaPhuHop SO trước cắt: đủ 13 PN6 8501 (W/kW → congSuat, kVA → congSuatBieuKien) + 8501.40 daPha + 3925.10 dungTich + 8504.32 + 8536.41 dungCho',
    pn8501PowerW.length === 11
    && pn8501PowerKva.length === 4
    && pn8501PowerW.every((p) => G6.khoaPhuHop('8501', p.ten) === 'congSuat')
    && pn8501PowerKva.every((p) => G6.khoaPhuHop('8501', p.ten) === 'congSuatBieuKien')
    && G6.khoaPhuHop('8501', 'Động cơ xoay chiều khác, một pha') === 'daPha'
    && G6.khoaPhuHop('3925', 'Thùng chứa, bể và các loại đồ chứa đựng tương tự, dung tích trên 300 lít') === 'dungTich'
    && G6.khoaPhuHop('8504', 'Công suất danh định trên 1 kVA nhưng không quá 16 kVA') === 'congSuatBieuKien'
    && G6.khoaPhuHop('8536', 'Dùng cho điện áp không quá 60 V') === 'dungCho',
    JSON.stringify({ w: pn8501PowerW.map((p) => [p.hs6, G6.khoaPhuHop('8501', p.ten)]), kva: pn8501PowerKva.map((p) => [p.hs6, G6.khoaPhuHop('8501', p.ten)]) }));

  // 3. Chắn danh từ ghép trong RE_GIOI_HAN_GIUA
  kiem('T-5 RE_GIOI_HAN_GIUA không cắt nhầm cụm ghép (chân không, không khí, có hoặc không, đã hoặc chưa, không kết hợp, kiểu phun)',
    G6.khoaPhuHop('8414', 'Bơm hút chân không') === 'tenLoai'
    && G6.khoaPhuHop('8414', 'Bơm không khí') === 'tenLoai'
    && G6.khoaPhuHop('4016', 'Đệm chống va cho tàu thuyền hoặc ụ tàu, có hoặc không thể bơm hơi') === 'tenLoai'
    && G6.khoaPhuHop('8518', 'Loa, đã hoặc chưa lắp vào vỏ loa') === 'tenLoai'
    && G6.khoaPhuHop('9001', 'Lăng kính, không kết hợp') === 'tenLoai'
    && G6.khoaPhuHop('8443', 'Đầu in kiểu phun mực') === 'tenLoai');

  // 4. Chặn bẫy SAI_KHOA_THUOC_TINH (Từ/Loại/Của/Để không bao giờ trả về tenLoai) + mở rộng Bằng → @2 (giữ 6704 & 6913 = null)
  kiem('T-5 không trả tenLoai khi RE_THUOC_TINH: 3920.10/51/62/91 → loaiNhuaPolyme; 3920.99 / 6401.92 / 8525.81 / 8525.82 → null',
    G6.khoaPhuHop('3920', 'Từ các polyme từ etylen') === 'loaiNhuaPolyme'
    && G6.khoaPhuHop('3920', 'Từ poly(metyl metacrylat)') === 'loaiNhuaPolyme'
    && G6.khoaPhuHop('3920', 'Từ poly(etylen terephtalat)') === 'loaiNhuaPolyme'
    && G6.khoaPhuHop('3920', 'Từ poly(vinyl butyral)') === 'loaiNhuaPolyme'
    && G6.khoaPhuHop('3920', 'Từ plastic khác') === null
    && G6.khoaPhuHop('6401', 'Loại cổ cao quá mắt cá chân nhưng không qua đầu gối') === null
    && G6.khoaPhuHop('8525', 'Loại tốc độ cao nêu tại Chú giải Phân nhóm 1 của Chương này') === null
    && G6.khoaPhuHop('8525', 'Loại khác, được làm cứng bức xạ hoặc chịu bức xạ nêu tại Chú giải Phân nhóm 2 của Chương này') === null);

  kiem('T-5 "bằng …" rơi sang @2 (9401.52/53, 9403.82/83, 9615.11, 9404.21 → vatLieuKhac), nhưng 6704 & 6913 VẪN trả null',
    G6.khoaPhuHop('6704', 'Bằng vật liệu dệt tổng hợp') === null
    && G6.khoaPhuHop('6913', 'Bằng sứ') === null
    && G6.khoaPhuHop('9401', 'Bằng tre') === 'vatLieuKhac'
    && G6.khoaPhuHop('9401', 'Bằng song, mây') === 'vatLieuKhac'
    && G6.khoaPhuHop('9403', 'Bằng tre') === 'vatLieuKhac'
    && G6.khoaPhuHop('9403', 'Bằng song, mây') === 'vatLieuKhac'
    && G6.khoaPhuHop('9615', 'Bằng cao su cứng hoặc plastic') === 'vatLieuKhac'
    && G6.khoaPhuHop('9404', 'Bằng cao su xốp hoặc bằng plastic xốp, đã hoặc chưa bọc') === 'vatLieuKhac');

  // 5. Rào chuỗi con @1 chỉ trong khoaPhuHop (không đụng tu-vung@1)
  kiem('T-5 khoaPhuHop rào @1 sai ngữ cảnh: hieuChinhThiLuc (có độ mảnh/bền), loaiRoLe (bán dẫn/mạng che quang), loaiCongTac (bếp đun/lò nướng/vỉ nướng)',
    G6.khoaPhuHop('5402', 'Sợi có độ mảnh cao bằng polyeste') !== 'hieuChinhThiLuc'
    && G6.khoaPhuHop('7214', 'Có độ bền kéo cao') !== 'hieuChinhThiLuc'
    && G6.khoaPhuHop('9031', 'Kiểm tra linh kiện bán dẫn hoặc kiểm tra mạng che quang') !== 'loaiRoLe'
    && G6.khoaPhuHop('8516', 'Các loại lò khác; bếp đun dạng tấm đun, thiết bị kiểu vỉ nướng và lò nướng') !== 'loaiCongTac');

  // 6. RE_LUAT_CONG_DUNG & khoaPhuHop cho Của / Phù hợp với / Để + bảo toàn CHI_HOI_MUC_DICH
  kiem('T-5 Của/Phù hợp với/Để: 8413/8421/8431/8467/8714/8208/9026/9031/7007 → dungCho; 6110.12 giữ loaiSoiDet',
    G6.khoaPhuHop('8413', 'Của bơm') === 'dungCho'
    && G6.khoaPhuHop('8421', 'Của máy ly tâm, kể cả máy làm khô bằng ly tâm') === 'dungCho'
    && G6.khoaPhuHop('8431', 'Bộ phận của máy khoan hoặc máy đào sâu thuộc phân nhóm 8430.41 hoặc 8430.49') === 'dungCho'
    && G6.khoaPhuHop('8467', 'Của dụng cụ hoạt động bằng khí nén') === 'dungCho'
    && G6.khoaPhuHop('8714', 'Của mô tô (kể cả xe gắn máy có bàn đạp (moped))') === 'dungCho'
    && G6.khoaPhuHop('8208', 'Để gia công kim loại') === 'dungCho'
    && G6.khoaPhuHop('9026', 'Để đo hoặc kiểm tra lưu lượng hoặc mức của chất lỏng') === 'dungCho'
    && G6.khoaPhuHop('9031', 'Để kiểm tra các vi mạch hoặc linh kiện bán dẫn (kể cả mạch tích hợp) hoặc kiểm tra mạng che quang') === 'dungCho'
    && G6.khoaPhuHop('7007', 'Có kích cỡ và hình dạng phù hợp với từng loại xe, phương tiện bay, tàu vũ trụ hoặc tàu thuyền') === 'dungCho'
    && G6.khoaPhuHop('6110', 'Của dê Ca-sơ-mia (len casơmia)') === 'loaiSoiDet');

  const L8413 = '84139100 - - Của bơm';
  const L7007 = '700711 Có kích cỡ và hình dạng phù hợp với từng loại xe, phương tiện bay, tàu vũ trụ hoặc tàu thuyền';
  kiem('T-5 kiemCauHoiMucDich + mucDichCuaMuc ngoại lệ Của/Phù hợp với + KHÔNG hạ rào CHI_HOI_MUC_DICH với "của" giữa câu hay khách tự nhận',
    MD('Hàng dùng cho bơm?', { chuLuat: L8413 }) === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG'
    && G6.mucDichCuaMuc({ fact: 'dungCho', op: 'CONG_DUNG', value: 'bơm', dieuKien: 'Của bơm', trich: L8413 })?.ngoaiLe === true
    && MD('Kính dùng cho từng loại xe?', { chuLuat: L7007 }) === 'CONG_DUNG_THIEU_DAC_TINH_KIEM_CHUNG'
    && G6.mucDichCuaMuc({ fact: 'dungCho', op: 'CONG_DUNG', value: 'từng loại xe', dieuKien: 'phù hợp với từng loại xe', trich: L7007 })?.ngoaiLe === true
    && MD('Kính dùng cho từng loại xe?', { chuLuat: L7007, cauPhu: ['Kính có kích cỡ và hình dạng uốn cong cho kính chắn gió ô tô?'] }) === null
    && MD('Là hàng dùng cho tập gym?', { chuLuat: 'Chú giải Phân nhóm 1 của Chương này' }) === 'CHI_HOI_MUC_DICH'
    && MD('Là đai chuyên dụng cho tập gym?', { chuLuat: L9506 }) === 'CHI_HOI_MUC_DICH');

  // 7. BO_NGU_CHAT_LIEU xốp / tế bào + DU_CO_PHAM_VI rỗng tachVeTieuDe + Lô 3 0 bẫy
  kiem('T-5 BO_NGU_CHAT_LIEU: chatLieu cao su/plastic trên "cao su xốp" & "cao su tế bào" bị chặn KHOA_RONG_HON_LUAT',
    Boolean(G6.khoaRongHonLuat('chatLieu', 'cao su', '401610 Từ cao su xốp'))
    && Boolean(G6.khoaRongHonLuat('chatLieu', 'cao su', 'Bằng cao su tế bào'))
    && Boolean(G6.khoaRongHonLuat('chatLieu', 'plastic', 'Bằng plastic tế bào')));

  kiem('T-5 tachVeTieuDe(boKhac) xử lý "Giày, dép khác, có mũi gắn kim loại bảo vệ" (6403.40) vẫn giữ vế giới hạn',
    JSON.stringify(G6.tachVeTieuDe('Giày, dép khác, có mũi gắn kim loại bảo vệ', new Set(), { boKhac: true }).map((v) => v.chu)) === JSON.stringify(['có mũi gắn kim loại bảo vệ']));

  {
    const ds6110 = G6.phanNhomCuaNhom('6110').map((p) => {
      if (p.hs6 === '611090') return { hs6: '611090', phanConLai: true, nguon: 'tieuDe.611090', trich: '611090 Từ các vật liệu dệt khác' };
      return { hs6: p.hs6, chuaSoHoa: 'ca kiem T-5', nguon: p.nguonTen, trich: `${p.hs6} ${p.ten}` };
    });
    const kq6110 = G6.kiemTieuChi6('6110', ds6110, { toKhai: false });
    kiem('T-5 DU_CO_PHAM_VI rỗng ("Từ các vật liệu dệt khác" 6110.90) với phanConLai: true không bị KHUON_SAI',
      !kq6110.loi.some((l) => l.hs6 === '611090' && l.ma === 'KHUON_SAI'), kq6110.loi);

    // 4 ca âm tính: DU_CO_PHAM_VI có nội dung riêng (020680, 040690, 851660, 853630) PHẢI vẫn đỏ KHUON_SAI khi chỉ khai phanConLai: true
    for (const [h4, hs6] of [['0206', '020680'], ['0406', '040690'], ['8516', '851660'], ['8536', '853630']]) {
      const pTarget = G6.phanNhomCuaNhom(h4).find((p) => p.hs6 === hs6);
      const ds = G6.phanNhomCuaNhom(h4).map((p) => {
        if (p.hs6 === hs6) return { hs6, phanConLai: true, nguon: p.nguonTen, trich: `${hs6} ${p.ten}` };
        if (p.kieu === 'DU') return { hs6: p.hs6, phanConLai: true, nguon: p.nguonTen, trich: `${p.hs6} ${p.ten}` };
        return { hs6: p.hs6, chuaSoHoa: 'ca am tinh DU_CO_PHAM_VI', nguon: p.nguonTen, trich: `${p.hs6} ${p.ten}` };
      });
      const kq = G6.kiemTieuChi6(h4, ds, { toKhai: false });
      kiem(`T-5 DU_CO_PHAM_VI âm tính ${hs6} ("${pTarget.ten}") chỉ khai phanConLai: true ⇒ PHẢI đỏ KHUON_SAI`,
        kq.loi.some((l) => l.hs6 === hs6 && l.ma === 'KHUON_SAI'), kq.loi.filter((l) => l.hs6 === hs6));
    }
  }

  // 8. Chương 39 (3920) & chưa no: tachVeTieuDe giữ nguyên 1 vế; mọi dòng polyme 3920.61/63/69/92/93/94 → loaiNhuaPolyme; 0 dòng Ch.39 rơi nhầm loaiSoiDet; giữ nguyên Ch.50–63 loaiSoiDet
  {
    const bieuRows = require('node:zlib').gunzipSync(fs.readFileSync('data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz')).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const ds39 = [...new Set(bieuRows.filter((r) => r.maChuan && r.maChuan.startsWith('39') && r.maChuan.length >= 4).map((r) => r.maChuan.slice(0, 4)))];
    const ds5063 = [...new Set(bieuRows.filter((r) => r.maChuan && r.maChuan.length >= 4 && Number(r.maChuan.slice(0, 2)) >= 50 && Number(r.maChuan.slice(0, 2)) <= 63).map((r) => r.maChuan.slice(0, 4)))];
    const nhamCh39 = [];
    for (const h4 of ds39) {
      let pns; try { pns = G6.phanNhomCuaNhom(h4); } catch { continue; }
      for (const p of pns) if (G6.khoaPhuHop(h4, p.ten) === 'loaiSoiDet') nhamCh39.push([p.hs6, p.ten]);
    }
    const nhamDetMay = [];
    for (const h4 of ds5063) {
      let pns; try { pns = G6.phanNhomCuaNhom(h4); } catch { continue; }
      for (const p of pns) if (G6.khoaPhuHop(h4, p.ten) === 'loaiNhuaPolyme') nhamDetMay.push([p.hs6, p.ten]);
    }
    const p540710 = G6.phanNhomCuaNhom('5407').find((p) => p.hs6 === '540710');
    const p540233 = G6.phanNhomCuaNhom('5402').find((p) => p.hs6 === '540233');
    const p551311 = G6.phanNhomCuaNhom('5513').find((p) => p.hs6 === '551311');
    const p590210 = G6.phanNhomCuaNhom('5902').find((p) => p.hs6 === '590210');
    kiem('T-5 Chương 39 & Chương 50–63 ranh giới rạch ròi: 0 phân nhóm Ch.39 → loaiSoiDet; 0 phân nhóm Ch.50–63 → loaiNhuaPolyme; 540710/540233/551311/590210 giữ loaiSoiDet; 3920 giữ loaiNhuaPolyme',
      nhamCh39.length === 0
      && nhamDetMay.length === 0
      && G6.tachVeTieuDe('Từ các polyeste chưa no', new Set()).map((v) => v.chu).join('|') === 'Từ các polyeste chưa no'
      && ['Từ các polycarbonat', 'Từ các polyeste chưa no', 'Từ các polyeste khác', 'Từ các polyamide', 'Từ nhựa amino', 'Từ nhựa phenolic']
        .every((ten) => G6.khoaPhuHop('3920', ten) === 'loaiNhuaPolyme')
      && G6.khoaPhuHop('5407', 'Vải dệt thoi từ sợi có độ bền cao bằng ni lông hoặc các polyamit hoặc các polyeste khác') === 'loaiSoiDet'
      && [p540710, p540233, p551311, p590210].every((p) => p && G6.khoaPhuHop(p.hs6.slice(0, 4), p.ten) === 'loaiSoiDet')
      && G6.khoaPhuHop('6110', 'Từ bông') === 'loaiSoiDet'
      && G6.khoaPhuHop('6110', 'Của dê Ca-sơ-mia (len casơmia)') === 'loaiSoiDet',
      JSON.stringify({ nhamCh39, nhamDetMay }));
  }

  kiem('T-5 Lô 3 (3926, 8501, 7326, 8483, 4016) sạch 0 bẫy SAI_KHOA_THUOC_TINH & mở khoá chuẩn',
    ['3926', '8501', '7326', '8483', '4016'].every((h4) => G6.phanNhomCuaNhom(h4).every((p) => {
      if (p.kieu === 'DU') return true;
      const k = G6.khoaPhuHop(h4, p.ten);
      return !(k === 'tenLoai' && /^(?:bằng|có|không|chưa|đã|dùng|loại|của|với|trên|dưới|từ|được|để|cho|trong|ngoài)\s/iu.test((p.ten || '').trim()));
    }))
    && G6.khoaPhuHop('8483', 'Thân ổ, lắp ổ bi hoặc ổ đũa') === 'coGanOBi'
    && G6.khoaPhuHop('8483', 'Thân ổ, không lắp ổ bi hoặc ổ đũa; gối đỡ trục dùng ổ trượt') === 'coGanOBi'
    && G6.khoaPhuHop('4016', 'Từ cao su xốp') === 'vatLieuKhac'
    && G6.khoaPhuHop('4016', 'Các sản phẩm có thể bơm hơi khác') === 'coTheBomHoi');

  // T-6: sửa vế/cổng G6 (vật liệu tương tự, khung gỗ/kim loại, tier Các sản phẩm, Bộ phận và phụ kiện, 8413.81 DU_CO_PHAM_VI, TIEU_DE_CHI_LAC "Của ...")
  {
    const pn = (h4, hs6) => G6.phanNhomCuaNhom(h4).find((p) => p.hs6 === hs6);
    const v940152 = G6.veCanPhu('9401', pn('9401', '940152'));
    kiem('T-6 tachVeTieuDe/veCanPhu 9401.52 bỏ "hoặc các vật liệu tương tự" & phuVe đòi đủ 3 vật liệu',
      v940152.map((v) => v.chu).join('|') === 'bằng mây, liễu gai, tre|Bằng tre'
      && G6.phuVe([
        { fact: 'vatLieuKhac', op: 'TRONG', value: ['SONG_MAY', 'LIEU_GAI', 'TRE'], nguon: 'tieuDe.94015', trich: '94015 Ghế bằng mây, liễu gai, tre hoặc các vật liệu tương tự' },
      ], v940152[0])
      && !G6.phuVe([
        { fact: 'vatLieuKhac', op: 'TRONG', value: ['SONG_MAY', 'TRE'], nguon: 'tieuDe.94015', trich: '94015 Ghế bằng mây, liễu gai, tre hoặc các vật liệu tương tự' },
      ], v940152[0]));

    const v901920 = G6.tachVeTieuDe('Máy trị liệu bằng ôzôn, bằng oxy, bằng xông, máy hô hấp nhân tạo hoặc máy hô hấp trị liệu khác', new Set());
    const v731819 = G6.veCanPhu('7318', pn('7318', '731819'));
    const v731829 = G6.veCanPhu('7318', pn('7318', '731829'));
    const vHangHoaGiu = G6.tachVeTieuDe('Hàng hóa bằng sắt hoặc thép', new Set());
    kiem('T-6 tachVeTieuDe 9019.20 danh sách nhiều máy = [], tier 7318 bỏ "Các sản phẩm", giữ "Hàng hóa" ở leaf',
      v901920.length === 0
      && JSON.stringify(v731819.map((v) => v.chu)) === JSON.stringify(['đã được ren'])
      && JSON.stringify(v731829.map((v) => v.chu)) === JSON.stringify(['không có ren'])
      && JSON.stringify(vHangHoaGiu[0]?.chinh) === JSON.stringify(['hang', 'hoa']));

    kiem('T-6 khoaPhuHop mở khoá chuẩn + negative guard không bằng kim loại / 6704 / 6913 / 7009',
      G6.khoaPhuHop('9401', 'Ghế khác, có khung bằng gỗ') === 'chatLieu'
      && G6.khoaPhuHop('9401', 'Ghế khác, có khung bằng kim loại') === 'chatLieu'
      && G6.khoaPhuHop('8207', 'Có bộ phận làm việc bằng gốm kim loại') === 'vatLieuKhac'
      && G6.khoaPhuHop('8483', 'Bánh xe có răng, đĩa xích và các bộ phận truyền chuyển động riêng biệt; các bộ phận') === 'tenLoai'
      && G6.khoaPhuHop('9019', 'Máy trị liệu bằng ôzôn, bằng oxy, bằng xông, máy hô hấp nhân tạo hoặc máy hô hấp trị liệu khác') === 'tenLoai'
      && G6.khoaPhuHop('8516', 'Dụng cụ đun nước nóng tức thời hoặc có dự trữ (1)') === 'coDuTru'
      && G6.khoaPhuHop('8528', 'Có khả năng kết nối trực tiếp và được thiết kế để sử dụng với máy xử lý dữ liệu tự động thuộc nhóm 84.71') === 'coKetNoiMayTinh'
      && G6.khoaPhuHop('8443', 'Máy khác, có khả năng kết nối trực tiếp với máy xử lý dữ liệu tự động hoặc kết nối mạng') === 'coKetNoiMayTinh'
      && G6.khoaPhuHop('5407', 'Vải dệt thoi khác, có hàm lượng sợi filament tổng hợp chiếm từ 85% trở lên tính theo trọng lượng') === 'hamLuongSoiFilamentTongHop'
      && G6.khoaPhuHop('4009', 'Chưa được gia cố hoặc kết hợp cách khác với các vật liệu khác') === 'daGiaCo'
      && G6.khoaPhuHop('9401', 'Ghế quay có điều chỉnh độ cao') === 'coDieuChinhDoCao'
      && G6.khoaPhuHop('9401', 'Ghế có thể chuyển thành giường, trừ ghế trong vườn hoặc đồ cắm trại') === 'coTheChuyenThanhGiuong'
      && G6.khoaPhuHop('8413', 'Bơm hoạt động kiểu piston quay khác') === 'kieuBom'
      && G6.khoaPhuHop('9031', 'Bộ phận và phụ kiện') === 'laBoPhan'
      && G6.khoaPhuHop('9205', 'Kèn không bằng kim loại') === null
      && G6.khoaPhuHop('6704', 'Bằng vật liệu dệt tổng hợp') === null
      && G6.khoaPhuHop('6913', 'Bằng sứ') === null
      && G6.khoaPhuHop('7009', 'Chưa có khung') === null
      && G6.khoaPhuHop('7009', 'Có khung') === null);

    kiem('T-6 "Bộ phận và phụ kiện": 9031.90/9025.90/9026.90/8443.99 phủ bằng laBoPhan=CO; 8466.10 KHÔNG phủ chỉ bằng laBoPhan=CO',
      ['9031', '9025', '9026', '8443'].every((h4) => {
        const hs6 = h4 === '8443' ? '844399' : `${h4}90`;
        const vs = G6.veCanPhu(h4, pn(h4, hs6));
        return vs.some((v) => G6.phuVe([{ fact: 'laBoPhan', op: 'CO', nguon: `tieuDe.${hs6}`, trich: `${hs6} Bộ phận và phụ kiện` }], v));
      })
      && !G6.phuVe(
        [{ fact: 'laBoPhan', op: 'CO', nguon: 'tax.84661010', trich: '84661010 - - Bộ phận kẹp dụng cụ' }],
        G6.veCanPhu('8466', pn('8466', '846610'))[0]
      ));

    const n9401 = G6.nguonChoPhep('9401');
    const ds9401 = [
      { hs6: '940110', thuTu: 1, dieuKien: 'Ghế dùng cho phương tiện bay', fact: 'dungCho', op: 'CONG_DUNG', value: 'phương tiện bay', tuKhoa: ['phương tiện bay'], kiemChung: [{ hoi: 'Ghế có gắn bộ phận bổ trợ hoặc lắp lò xo dùng cho phương tiện bay hoặc xe cộ không?', nguon: 'nhom9401.nhom', trich: n9401['nhom9401.nhom'] }], nguon: 'tax.94011000', trich: '94011000 - Ghế dùng cho phương tiện bay' },
      { hs6: '940120', thuTu: 2, dieuKien: 'Ghế dùng cho xe có động cơ', fact: 'dungChoXeCoDongCo', op: 'CO', nguon: 'tieuDe.940120', trich: '940120 Ghế dùng cho xe có động cơ' },
      { hs6: '940131', thuTu: 3, dieuKien: 'Ghế quay', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Ghế quay', tuKhoa: ['ghế quay'], nguon: 'tieuDe.94013', trich: '94013 Ghế quay có điều chỉnh độ cao' },
      { hs6: '940131', thuTu: 3, dieuKien: 'Có điều chỉnh độ cao', fact: 'coDieuChinhDoCao', op: 'CO', nguon: 'tieuDe.94013', trich: '94013 Ghế quay có điều chỉnh độ cao' },
      { hs6: '940131', thuTu: 3, dieuKien: 'Bằng gỗ', fact: 'chatLieu', op: 'LA', value: 'gỗ', nguon: 'tax.94013100', trich: '94013100 - - Bằng gỗ' },
      { hs6: '940139', thuTu: 4, dieuKien: 'Ghế quay', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Ghế quay', tuKhoa: ['ghế quay'], nguon: 'tieuDe.94013', trich: '94013 Ghế quay có điều chỉnh độ cao' },
      { hs6: '940139', thuTu: 4, dieuKien: 'Có điều chỉnh độ cao', fact: 'coDieuChinhDoCao', op: 'CO', nguon: 'tieuDe.94013', trich: '94013 Ghế quay có điều chỉnh độ cao' },
      { hs6: '940139', thuTu: 4, phanConLai: true, nguon: 'tax.94013900', trich: '94013900 - - Loại khác' },
      { hs6: '940141', thuTu: 5, dieuKien: 'Ghế có thể chuyển thành giường', fact: 'coTheChuyenThanhGiuong', op: 'CO', dieuKienTru: ['ghế trong vườn', 'đồ cắm trại'], nguon: 'tieuDe.94014', trich: '94014 Ghế có thể chuyển thành giường, trừ ghế trong vườn hoặc đồ cắm trại' },
      { hs6: '940141', thuTu: 5, dieuKien: 'Bằng gỗ', fact: 'chatLieu', op: 'LA', value: 'gỗ', nguon: 'tax.94014100', trich: '94014100 - - Bằng gỗ' },
      { hs6: '940149', thuTu: 6, dieuKien: 'Ghế có thể chuyển thành giường', fact: 'coTheChuyenThanhGiuong', op: 'CO', dieuKienTru: ['ghế trong vườn', 'đồ cắm trại'], nguon: 'tieuDe.94014', trich: '94014 Ghế có thể chuyển thành giường, trừ ghế trong vườn hoặc đồ cắm trại' },
      { hs6: '940149', thuTu: 6, phanConLai: true, nguon: 'tax.94014900', trich: '94014900 - - Loại khác' },
      { hs6: '940152', thuTu: 7, dieuKien: 'Bằng mây, liễu gai, tre', fact: 'vatLieuKhac', op: 'TRONG', value: ['SONG_MAY', 'LIEU_GAI', 'TRE'], nguon: 'tieuDe.94015', trich: '94015 Ghế bằng mây, liễu gai, tre hoặc các vật liệu tương tự' },
      { hs6: '940152', thuTu: 7, dieuKien: 'Bằng tre', fact: 'vatLieuKhac', op: 'TRONG', value: ['TRE'], nguon: 'tax.94015200', trich: '94015200 - - Bằng tre' },
      { hs6: '940153', thuTu: 8, dieuKien: 'Bằng mây, liễu gai, tre', fact: 'vatLieuKhac', op: 'TRONG', value: ['SONG_MAY', 'LIEU_GAI', 'TRE'], nguon: 'tieuDe.94015', trich: '94015 Ghế bằng mây, liễu gai, tre hoặc các vật liệu tương tự' },
      { hs6: '940153', thuTu: 8, dieuKien: 'Bằng song, mây', fact: 'vatLieuKhac', op: 'TRONG', value: ['SONG_MAY'], nguon: 'tax.94015300', trich: '94015300 - - Bằng song, mây' },
      { hs6: '940159', thuTu: 9, dieuKien: 'Bằng mây, liễu gai, tre', fact: 'vatLieuKhac', op: 'TRONG', value: ['SONG_MAY', 'LIEU_GAI', 'TRE'], nguon: 'tieuDe.94015', trich: '94015 Ghế bằng mây, liễu gai, tre hoặc các vật liệu tương tự' },
      { hs6: '940159', thuTu: 9, phanConLai: true, nguon: 'tax.94015900', trich: '94015900 - - Loại khác' },
      { hs6: '940161', thuTu: 10, dieuKien: 'Có khung bằng gỗ', fact: 'chatLieu', op: 'LA', value: 'gỗ', nguon: 'tieuDe.94016', trich: '94016 Ghế khác, có khung bằng gỗ' },
      { hs6: '940161', thuTu: 10, dieuKien: 'Đã nhồi đệm', fact: 'daNhoiDem', op: 'CO', nguon: 'tax.94016100', trich: '94016100 - - Đã nhồi đệm' },
      { hs6: '940169', thuTu: 11, dieuKien: 'Có khung bằng gỗ', fact: 'chatLieu', op: 'LA', value: 'gỗ', nguon: 'tieuDe.94016', trich: '94016 Ghế khác, có khung bằng gỗ' },
      { hs6: '940169', thuTu: 11, phanConLai: true, nguon: 'tieuDe.940169', trich: '940169 Loại khác' },
      { hs6: '940171', thuTu: 12, dieuKien: 'Có khung bằng kim loại', fact: 'chatLieu', op: 'LA', value: 'kim loại', nguon: 'tieuDe.94017', trich: '94017 Ghế khác, có khung bằng kim loại' },
      { hs6: '940171', thuTu: 12, dieuKien: 'Đã nhồi đệm', fact: 'daNhoiDem', op: 'CO', nguon: 'tax.94017100', trich: '94017100 - - Đã nhồi đệm' },
      { hs6: '940179', thuTu: 13, dieuKien: 'Có khung bằng kim loại', fact: 'chatLieu', op: 'LA', value: 'kim loại', nguon: 'tieuDe.94017', trich: '94017 Ghế khác, có khung bằng kim loại' },
      { hs6: '940179', thuTu: 13, phanConLai: true, nguon: 'tieuDe.940179', trich: '940179 Loại khác' },
      { hs6: '940180', thuTu: 14, dieuKien: 'Ghế', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Ghế', tuKhoa: ['ghế'], nguon: 'tax.94018000', trich: '94018000 - Ghế khác' },
      { hs6: '940180', thuTu: 14, phanConLai: true, nguon: 'tax.94018000', trich: '94018000 - Ghế khác' },
      { hs6: '940191', thuTu: 15, dieuKien: 'Là bộ phận', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.94019', trich: '94019 Bộ phận' },
      { hs6: '940191', thuTu: 15, dieuKien: 'Bằng gỗ', fact: 'chatLieu', op: 'LA', value: 'gỗ', nguon: 'tax.94019100', trich: '94019100 - - Bằng gỗ' },
      { hs6: '940199', thuTu: 16, dieuKien: 'Là bộ phận', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.94019', trich: '94019 Bộ phận' },
      { hs6: '940199', thuTu: 16, phanConLai: true, nguon: 'tieuDe.940199', trich: '940199 Loại khác' },
    ];
    const kq9401 = G6.kiemTieuChi6('9401', ds9401, { toKhai: false });

    const n9031 = G6.nguonChoPhep('9031');
    const tr903141 = '90314100 - - Để kiểm tra các vi mạch hoặc linh kiện bán dẫn (kể cả mạch tích hợp) hoặc kiểm tra mạng che quang hoặc lưới carô sử dụng trong sản xuất các linh kiện bán dẫn (kể cả mạch tích hợp)';
    const kc903141 = [{ hoi: 'Dụng cụ quang học có bộ phận quang học kiểm tra hay sử dụng trong sản xuất các linh kiện bán dẫn không?', nguon: 'nhom9031.nhom', trich: n9031['nhom9031.nhom'] }];
    const ds9031 = [
      { hs6: '903110', thuTu: 1, dieuKien: 'Máy đo để cân chỉnh các bộ phận cơ khí', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy đo để cân chỉnh các bộ phận cơ khí', tuKhoa: ['máy đo để cân chỉnh các bộ phận cơ khí'], nguon: 'tax.90311000', trich: '90311000 - Máy đo để cân chỉnh các bộ phận cơ khí' },
      { hs6: '903120', thuTu: 2, dieuKien: 'Bàn kiểm tra', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bàn kiểm tra', tuKhoa: ['bàn kiểm tra'], nguon: 'tax.90312000', trich: '90312000 - Bàn kiểm tra' },
      { hs6: '903141', thuTu: 3, dieuKien: 'Thiết bị và dụng cụ quang học', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Thiết bị và dụng cụ quang học', tuKhoa: ['quang học'], nguon: 'tieuDe.90314', trich: '90314 Các thiết bị và dụng cụ quang học khác' },
      { hs6: '903141', thuTu: 3, dieuKien: 'Kiểm tra vi mạch, linh kiện bán dẫn hoặc mạng che quang, lưới carô sử dụng trong sản xuất linh kiện bán dẫn', fact: 'dungCho', op: 'CONG_DUNG', value: ['kiểm tra các vi mạch hoặc linh kiện bán dẫn', 'kiểm tra mạng che quang hoặc lưới carô', 'sử dụng trong sản xuất các linh kiện bán dẫn'], tuKhoa: ['vi mạch', 'linh kiện bán dẫn', 'mạng che quang', 'lưới carô'], kiemChung: kc903141, nguon: 'tax.90314100', trich: tr903141 },
      { hs6: '903149', thuTu: 4, dieuKien: 'Thiết bị và dụng cụ quang học', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Thiết bị và dụng cụ quang học', tuKhoa: ['quang học'], nguon: 'tieuDe.90314', trich: '90314 Các thiết bị và dụng cụ quang học khác' },
      { hs6: '903149', thuTu: 4, phanConLai: true, nguon: 'tieuDe.903149', trich: '903149 Loại khác' },
      { hs6: '903190', thuTu: 5, dieuKien: 'Bộ phận và phụ kiện', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.903190', trich: '903190 Bộ phận và phụ kiện' },
      { hs6: '903180', thuTu: 6, phanConLai: true, nguon: 'tieuDe.903180', trich: '903180 Dụng cụ, thiết bị và máy khác' },
    ];
    const kq9031 = G6.kiemTieuChi6('9031', ds9031, { toKhai: false });

    const n8413 = G6.nguonChoPhep('8413');
    const ds8413 = [
      { hs6: '841311', thuTu: 1, chuaSoHoa: 'thiếu khoá thiết bị đo lường gắn kèm', nguon: 'tieuDe.84131', trich: '84131 Bơm có lắp hoặc thiết kế để lắp thiết bị đo' },
      { hs6: '841311', thuTu: 1, dieuKien: 'Phân phối nhiên liệu hoặc dầu bôi trơn cho trạm đổ xăng hoặc gara', fact: 'dungCho', op: 'CONG_DUNG', value: 'trạm đổ xăng hoặc cho gara', tuKhoa: ['phân phối nhiên liệu', 'trạm đổ xăng', 'gara'], kiemChung: [{ hoi: 'Bơm có máy động lực hay thiết bị vận chuyển chất lỏng dùng cho trạm đổ xăng không?', nguon: 'nhom8413.nhom', trich: n8413['nhom8413.nhom'] }], nguon: 'tax.84131100', trich: '84131100 - - Bơm phân phối nhiên liệu hoặc dầu bôi trơn, loại dùng cho trạm đổ xăng hoặc cho gara' },
      { hs6: '841319', thuTu: 2, chuaSoHoa: 'thiếu khoá thiết bị đo lường gắn kèm', nguon: 'tieuDe.84131', trich: '84131 Bơm có lắp hoặc thiết kế để lắp thiết bị đo' },
      { hs6: '841319', thuTu: 2, phanConLai: true, nguon: 'tieuDe.841319', trich: '841319 Loại khác' },
      { hs6: '841320', thuTu: 3, dieuKien: 'Bơm tay', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bơm tay', tuKhoa: ['bơm tay'], dieuKienTru: ['8413.11', '8413.19'], nguon: 'tieuDe.841320', trich: '841320 Bơm tay, trừ loại thuộc phân nhóm 8413.11 hoặc 8413.19' },
      { hs6: '841330', thuTu: 4, dieuKien: 'Dùng cho động cơ đốt trong kiểu piston', fact: 'dungCho', op: 'CONG_DUNG', value: 'động cơ đốt trong kiểu piston', tuKhoa: ['động cơ đốt trong kiểu piston', 'bơm nhiên liệu', 'bơm chất làm mát'], kiemChung: [{ hoi: 'Bơm có trục trung tâm và cánh quạt quay nối vào động cơ không?', nguon: 'sen.84133040', trich: n8413['sen.84133040'] }], nguon: 'tieuDe.841330', trich: '841330 Bơm nhiên liệu, dầu bôi trơn hoặc bơm chất làm mát, dùng cho động cơ đốt trong kiểu piston' },
      { hs6: '841340', thuTu: 5, dieuKien: 'Bơm bê tông', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bơm bê tông', tuKhoa: ['bơm bê tông'], nguon: 'tax.84134000', trich: '84134000 - Bơm bê tông' },
      { hs6: '841350', thuTu: 6, dieuKien: 'Kiểu piston chuyển động tịnh tiến', fact: 'kieuBom', op: 'TRONG', value: ['PISTON'], nguon: 'tieuDe.841350', trich: '841350 Bơm hoạt động kiểu piston chuyển động tịnh tiến khác' },
      { hs6: '841350', thuTu: 6, phanConLai: true, nguon: 'tieuDe.841350', trich: '841350 Bơm hoạt động kiểu piston chuyển động tịnh tiến khác' },
      { hs6: '841360', thuTu: 7, dieuKien: 'Kiểu piston quay', fact: 'kieuBom', op: 'TRONG', value: ['QUAY'], nguon: 'tieuDe.841360', trich: '841360 Bơm hoạt động kiểu piston quay khác' },
      { hs6: '841360', thuTu: 7, phanConLai: true, nguon: 'tieuDe.841360', trich: '841360 Bơm hoạt động kiểu piston quay khác' },
      { hs6: '841370', thuTu: 8, dieuKien: 'Bơm ly tâm', fact: 'kieuBom', op: 'TRONG', value: ['LY_TAM'], nguon: 'tieuDe.841370', trich: '841370 Bơm ly tâm khác' },
      { hs6: '841370', thuTu: 8, phanConLai: true, nguon: 'tieuDe.841370', trich: '841370 Bơm ly tâm khác' },
      { hs6: '841381', thuTu: 9, dieuKien: 'Bơm khác', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bơm', tuKhoa: ['bơm'], nguon: 'tieuDe.84138', trich: '84138 Bơm khác; máy đẩy chất lỏng' },
      { hs6: '841381', thuTu: 9, dieuKien: 'Bơm', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bơm', tuKhoa: ['bơm'], nguon: 'tieuDe.841381', trich: '841381 Bơm' },
      { hs6: '841381', thuTu: 9, phanConLai: true, nguon: 'tieuDe.841381', trich: '841381 Bơm' },
      { hs6: '841382', thuTu: 10, dieuKien: 'Máy đẩy chất lỏng', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy đẩy chất lỏng', tuKhoa: ['máy đẩy chất lỏng'], nguon: 'tieuDe.84138', trich: '84138 Bơm khác; máy đẩy chất lỏng' },
      { hs6: '841382', thuTu: 10, dieuKien: 'Máy đẩy chất lỏng', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy đẩy chất lỏng', tuKhoa: ['máy đẩy chất lỏng'], nguon: 'tieuDe.841382', trich: '841382 Máy đẩy chất lỏng' },
      { hs6: '841391', thuTu: 11, dieuKien: 'Là bộ phận', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.84139', trich: '84139 Bộ phận' },
      { hs6: '841391', thuTu: 11, dieuKien: 'Của bơm', fact: 'dungCho', op: 'CONG_DUNG', value: 'bơm', tuKhoa: ['của bơm'], kiemChung: [{ hoi: 'Bộ phận có mặt lắp và cơ cấu truyền chất lỏng chuyên dùng cho máy bơm không?', nguon: 'nhom8413.nhom', trich: n8413['nhom8413.nhom'] }], nguon: 'tieuDe.841391', trich: '841391 Của bơm' },
      { hs6: '841392', thuTu: 12, dieuKien: 'Là bộ phận', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.84139', trich: '84139 Bộ phận' },
      { hs6: '841392', thuTu: 12, dieuKien: 'Của máy đẩy chất lỏng', fact: 'dungCho', op: 'CONG_DUNG', value: 'máy đẩy chất lỏng', tuKhoa: ['máy đẩy chất lỏng'], kiemChung: [{ hoi: 'Bộ phận có cơ cấu truyền hoặc vận chuyển chất lỏng dùng cho máy đẩy chất lỏng không?', nguon: 'nhom8413.nhom', trich: n8413['nhom8413.nhom'] }], nguon: 'tax.84139200', trich: '84139200 - - Của máy đẩy chất lỏng' },
    ];
    const t0 = Date.now();
    const kq8413 = G6.kiemTieuChi6('8413', ds8413, { toKhai: false });
    const dtKiem = Date.now() - t0;

    const kq8431Guard = G6.kiemTieuChi6('8431', [
      { hs6: '843110', thuTu: 1, dieuKien: 'Máy ủi đất', fact: 'tenLoai', op: 'TEN_LOAI', value: 'máy ủi đất', tuKhoa: ['máy ủi đất'], nguon: 'tieuDe.84311', trich: '84311 Của máy thuộc nhóm 84.25' },
      { hs6: '843142', thuTu: 2, dieuKien: 'Lưỡi của máy ủi đất', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Lưỡi của máy ủi đất', tuKhoa: ['lưỡi'], nguon: 'tax.84314200', trich: '84314200 - - Lưỡi của máy ủi đất lưỡi thẳng hoặc máy ủi đất lưỡi nghiêng' },
    ], { toKhai: false });

    const tTach0 = Date.now();
    G6.tachVeTieuDe('sản phẩm bộ phận phụ kiện máy đẩy chất lỏng và các vật liệu tương tự '.repeat(4000), new Set(), { laTang: true });
    const dtTach = Date.now() - tTach0;

    kiem('T-6 kiemTieuChi6 9401 + 9031 + 8413 (8413.81 DU_CO_PHAM_VI, 8413.60 QUAY, 8413.91/92 sạch TIEU_DE_CHI_LAC)',
      kq9401.loi.length === 0
      && kq9031.loi.length === 0
      && kq8413.loi.length === 0
      && pn('8413', '841381').kieu === 'DU_CO_PHAM_VI'
      && pn('8413', '841382').kieu === 'CO_TEN'
      && ['850131', '850132', '850133', '850134'].every((c) => pn('8501', c).kieu === 'CO_TEN')
      && G6.apTieuChi(ds8413, 'bơm màng công nghiệp', { h4: '8413' }).hs6 === null
      && G6.apTieuChi(ds8413, 'máy đẩy chất lỏng', { h4: '8413' }).hs6 === '841382'
      && kq8431Guard.loi.some((l) => l.ma === 'TIEU_DE_CHI_LAC'),
      `9401=${JSON.stringify(kq9401.loi)} 9031=${JSON.stringify(kq9031.loi)} 8413=${JSON.stringify(kq8413.loi)}`);

    kiem(`T-6 hiệu năng / ReDoS tachVeTieuDe(40k+ từ)=${dtTach}ms & kiemTieuChi6(8413)=${dtKiem}ms (< 500ms)`,
      dtTach < 500 && dtKiem < 500);

    const ds8482 = [
      { hs6: '848210', thuTu: 1, dieuKien: 'Ổ bi', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Ổ bi', tuKhoa: ['ổ bi'], nguon: 'tax.84821000', trich: '84821000 - Ổ bi' },
      { hs6: '848220', thuTu: 2, dieuKien: 'Ổ đũa côn', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Ổ đũa côn', 'cụm linh kiện vành côn và đũa côn'], tuKhoa: ['ổ đũa côn'], nguon: 'tax.84822000', trich: '84822000 - Ổ đũa côn, kể cả cụm linh kiện vành côn và đũa côn' },
      { hs6: '848230', thuTu: 3, dieuKien: 'Ổ đũa cầu', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Ổ đũa cầu', tuKhoa: ['ổ đũa cầu'], nguon: 'tax.84823000', trich: '84823000 - Ổ đũa cầu' },
      { hs6: '848240', thuTu: 4, dieuKien: 'Ổ đũa kim', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Ổ đũa kim', 'lồng (cage) và đũa kim đã lắp ráp'], tuKhoa: ['ổ đũa kim'], nguon: 'tax.84824000', trich: '84824000 - Ổ đũa kim, kể cả lồng (cage) và đũa kim đã lắp ráp' },
      { hs6: '848250', thuTu: 5, dieuKien: 'Ổ đũa hình trụ', fact: 'tenLoai', op: 'TEN_LOAI', value: ['ổ đũa hình trụ', 'lồng (cage) và đũa đã lắp rắp'], tuKhoa: ['ổ đũa hình trụ'], nguon: 'tax.84825000', trich: '84825000 - Các loại ổ đũa hình trụ khác, kể cả lồng (cage) và đũa đã lắp rắp' },
      { hs6: '848250', thuTu: 5, phanConLai: true, nguon: 'tax.84825000', trich: '84825000 - Các loại ổ đũa hình trụ khác, kể cả lồng (cage) và đũa đã lắp rắp' },
      { hs6: '848280', thuTu: 6, phanConLai: true, nguon: 'tax.84828000', trich: '84828000 - Loại khác, kể cả ổ kết hợp bi cầu/bi đũa' },
      { hs6: '848291', thuTu: 7, dieuKien: 'Là bộ phận', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.84829', trich: '84829 Bộ phận' },
      { hs6: '848291', thuTu: 7, dieuKien: 'Bi, kim và đũa', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Bi', 'kim', 'đũa'], tuKhoa: ['bi, kim và đũa'], nguon: 'tax.84829100', trich: '84829100 - - Bi, kim và đũa' },
      { hs6: '848299', thuTu: 8, dieuKien: 'Là bộ phận', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.84829', trich: '84829 Bộ phận' },
      { hs6: '848299', thuTu: 8, phanConLai: true, nguon: 'tax.84829900', trich: '84829900 - - Loại khác' },
    ];
    const kq8482 = G6.kiemTieuChi6('8482', ds8482, { toKhai: false });
    const kqNegRongVe1 = G6.kiemTieuChi6('0206', [{ hs6: '020680', thuTu: 1, phanConLai: true, nguon: 'tax.02068000', trich: '02068000 - Loại khác, tươi hoặc ướp lạnh' }], { toKhai: false });
    const kqNegRongVe2 = G6.kiemTieuChi6('8419', [{ hs6: '841934', thuTu: 1, phanConLai: true, nguon: 'tieuDe.841934', trich: '841934 Loại khác, dùng cho các sản phẩm nông nghiệp' }], { toKhai: false });
    const kqWcoInc = G6.kiemTieuChi6('8482', [
      ...ds8482.filter((x) => x.hs6 !== '848280'),
      { hs6: '848280', thuTu: 6, dieuKien: 'Combined ball/roller', fact: 'tenLoai', op: 'TEN_LOAI', value: 'combined ball/roller', tuKhoa: ['combined ball/roller'], nguon: 'wco.848280', trich: '848280 Bearings; n.e.c. in heading no. 8482, including combined ball/roller' },
      { hs6: '848280', thuTu: 6, phanConLai: true, nguon: 'tax.84828000', trich: '84828000 - Loại khác, kể cả ổ kết hợp bi cầu/bi đũa' },
    ], { toKhai: false });
    const kqCumRong = G6.kiemTieuChi6('8482', [
      ...ds8482.filter((x) => x.hs6 !== '848210'),
      { hs6: '848210', thuTu: 1, dieuKien: 'Ổ bi', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Ổ bi', tuKhoa: ['các thiết bị tương tự'], nguon: 'tax.84821000', trich: '84821000 - Ổ bi' },
    ], { toKhai: false });

    kiem('T-6 rongVe 8482.80 ("Loại khác, kể cả…") = 0 lỗi; ca ngược 0206.80 & 8419.34 vẫn KHUON_SAI; chặn wco including & "các thiết bị tương tự"',
      kq8482.loi.length === 0
      && kqNegRongVe1.loi.some((l) => l.ma === 'KHUON_SAI' && l.hs6 === '020680')
      && kqNegRongVe2.loi.some((l) => l.ma === 'KHUON_SAI' && l.hs6 === '841934')
      && kqWcoInc.loi.some((l) => l.ma === 'KE_CA_LA_DIEU_KIEN' && l.hs6 === '848280')
      && kqCumRong.loi.some((l) => l.ma === 'GIA_TRI_RONG' && l.hs6 === '848210'),
      `8482=${JSON.stringify(kq8482.loi)}`);

    // #1630: KHOA_NGUOC_VE_TRU hai chiều + 850131 ca thật + quét sạch toàn kho tieuChi6.
    const kqNguoc8501 = G6.laKhoaNguocVeTru({
      hs6: '850131',
      fact: 'nguonNangLuong',
      op: 'TRONG',
      value: ['QUANG_DIEN'],
      trich: '85013 Động cơ một chiều khác; máy phát điện một chiều, trừ máy phát quang điện',
    });
    const kqKhongNhungQua = G6.laKhoaNguocVeTru({
      hs6: '850432',
      fact: 'congSuatBieuKien',
      op: 'CO',
      trich: '850432 Công suất danh định trên 1 kVA nhưng không quá 16 kVA',
    });
    const kq8504Sach = G6.kiemTieuChi6('8504', doc('data/so-tay/8504.json').tieuChi6, { toKhai: false });
    kiem('#1630 KHOA_NGUOC_VE_TRU hai chiều: bắt 8501 khẳng định QUANG_DIEN từ vế "trừ …"; không bắt nhầm 8504.32 "… nhưng không quá"',
      kqNguoc8501 === 'máy phát quang điện'
      && kqKhongNhungQua === null
      && !kq8504Sach.loi.some((l) => l.ma === 'KHOA_NGUOC_VE_TRU'),
      JSON.stringify({ kqNguoc8501, kqKhongNhungQua, loi8504: kq8504Sach.loi }));

    const st8501 = doc('data/so-tay/8501.json');
    const dcMotor = G6.diXuong6('8501', st8501.tieuChi6, 'Động cơ điện một chiều 24V 500W');
    const solarPanel = G6.diXuong6('8501', st8501.tieuChi6, 'Tấm pin mặt trời 40W');
    const solarGen = G6.diXuong6('8501', st8501.tieuChi6, 'Máy phát quang điện một chiều 500W');
    kiem('#1630 8501.31 ca thật: "Động cơ điện một chiều 24V 500W" → 850131; "Tấm pin mặt trời 40W" ≠ 850131; "Máy phát quang điện một chiều 500W" → 850172 (≠ 850131)',
      dcMotor.trangThai === 'DUNG_CHOT' && dcMotor.hs6 === '850131'
      && solarPanel.hs6 !== '850131'
      && solarGen.trangThai === 'DUNG_CHOT' && solarGen.hs6 === '850172',
      JSON.stringify({ dcMotor, solarPanel, solarGen }));

    const viPhamToanKho = [];
    for (const f of fs.readdirSync(path.join(GOC, 'data', 'so-tay')).filter((x) => /^\d{4}\.json$/.test(x)).sort()) {
      const s = doc(`data/so-tay/${f}`);
      for (const m of s.tieuChi6 || []) {
        const vt = G6.laKhoaNguocVeTru(m);
        if (vt) viPhamToanKho.push({ nhom: s.nhom, hs6: m.hs6, fact: m.fact, vt });
      }
    }
    kiem('#1630 quét toàn bộ kho so-tay có tieuChi6 bằng KHOA_NGUOC_VE_TRU = 0 vi phạm', viPhamToanKho.length === 0, JSON.stringify(viPhamToanKho));
  }

  // ── T-8 Top-93 (04/11): 9 nhóm sửa cổng + từ vựng cho 17 nhóm bị hoãn ──
  const loiNgoaiThieuPn = (h4, items) => G6.kiemTieuChi6(h4, items, { toKhai: false }).loi.filter((l) => l.ma !== 'THIEU_PHAN_NHOM');

  // 1. 3917.10: loaiCung miễn trừ trên "protein đã làm cứng" + loaiNhuaPolyme không bắt một vế trong câu "hoặc" (3917)
  kiem('T-8 khoaPhuHop 3917.10 "bằng protein đã làm cứng hoặc bằng chất liệu xenlulo" = null (nhưng Từ polyme của etylen giữ loaiNhuaPolyme)',
    G6.khoaPhuHop('3917', 'bằng protein đã làm cứng hoặc bằng chất liệu xenlulo') === null
    && G6.khoaPhuHop('3917', 'Từ các polyme của etylen') === 'loaiNhuaPolyme',
    G6.khoaPhuHop('3917', 'bằng protein đã làm cứng hoặc bằng chất liệu xenlulo'));

  // 2. 8471 + 8528 + 8525: miễn trừ loaiPhaChe ngoài Ch.27, RE_THUOC_TINH thêm gồm, RE_LUAT_CONG_DUNG thêm "Các bộ (khác) của", coGanThietBiThu & mauHienThi
  kiem('T-8 khoaPhuHop 8471.30/8471.49/8525.83 miễn trừ loaiPhaChe & tenLoai (Ch.84/85 ≠ 27)',
    G6.khoaPhuHop('8471', 'Loại khác, ở dạng hệ thống') === null
    && G6.khoaPhuHop('8471', 'gồm ít nhất một đơn vị xử lý dữ liệu trung tâm, một bàn phím và một màn hình', { boQua: (k) => k.khoa === 'coManHinh' }) === null
    && G6.khoaPhuHop('8525', 'Loại khác, loại nhìn ban đêm nêu tại Chú giải Phân nhóm 3 của Chương này') === null);

  {
    const tc8471_80 = [
      { hs6: '847180', dieuKien: 'Các bộ', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Các bộ', tuKhoa: ['của máy xử lý dữ liệu tự động'], nguon: 'tieuDe.847180', trich: '847180 Các bộ khác của máy xử lý dữ liệu tự động' },
      {
        hs6: '847180',
        dieuKien: 'của máy xử lý dữ liệu tự động',
        fact: 'dungCho',
        op: 'CONG_DUNG',
        value: 'máy xử lý dữ liệu tự động',
        tuKhoa: ['máy xử lý dữ liệu tự động'],
        kiemChung: [{
          hoi: 'Khối chức năng có kết nối với bộ xử lý trung tâm không?',
          nguon: 'ch84.chuong',
          trich: '(C) Theo đoạn (D) và (E) dưới đây, khối chức năng được xem như là bộ phận của một hệ thống xử lý dữ liệu tự động nếu thỏa mãn tất cả các điều kiện sau:\n\n(i) Là loại chỉ sử dụng hoặc chủ yếu sử dụng trong hệ thống xử lý dữ liệu tự động;\n\n(ii) Có khả năng kết nối với bộ xử lý trung tâm hoặc trực tiếp hoặc thông qua một hoặc nhiều khối chức năng khác; và\n\n(iii) Có khả năng tiếp nhận hoặc cung cấp dữ liệu theo định dạng (mã hoặc tín hiệu) mà hệ thống có thể sử dụng được.',
        }],
        nguon: 'tieuDe.847180',
        trich: '847180 Các bộ khác của máy xử lý dữ liệu tự động',
      },
    ];
    const loiOk = loiNgoaiThieuPn('8471', tc8471_80);
    const tc8471_sai = [{ hs6: '847180', dieuKien: 'dùng cho công nghiệp', fact: 'dungCho', op: 'CONG_DUNG', value: 'công nghiệp', tuKhoa: ['máy xử lý dữ liệu tự động'], nguon: 'tieuDe.847180', trich: '847180 Các bộ khác của máy xử lý dữ liệu tự động' }];
    kiem('T-8 8471.80 "Các bộ khác của máy xử lý dữ liệu tự động" + kiemChung qua CHI_HOI_MUC_DICH; suy rộng "công nghiệp" vẫn đỏ',
      loiOk.length === 0 && loiNgoaiThieuPn('8471', tc8471_sai).some((l) => l.ma === 'CHI_HOI_MUC_DICH'),
      loiOk);
  }

  {
    const tc8528_72 = [
      { hs6: '852872', dieuKien: 'Thiết bị thu', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Thiết bị thu', tuKhoa: ['thiết bị thu'], nguon: 'tieuDe.85287', trich: '85287 Thiết bị thu dùng trong truyền hình, có hoặc không gắn với thiết bị thu thanh sóng vô tuyến hoặc thiết bị ghi hoặc tái tạo âm thanh hoặc hình ảnh' },
      {
        hs6: '852872',
        dieuKien: 'dùng trong truyền hình',
        fact: 'dungCho',
        op: 'CONG_DUNG',
        value: 'truyền hình',
        tuKhoa: ['truyền hình'],
        kiemChung: [{ hoi: 'Thiết bị có thu sóng truyền hình (LCD, plasma, CRT) dùng thu truyền hình không?', nguon: 'nhom8528.nhom', trich: '(D) MÁY THU DÙNG CHO TRUYỀN HÌNH\n\nNhóm này bao gồm thiết bị có hoặc không được thiết kế để gắn với màn hình hiển thị hình ảnh hoặc màn hình, như là:\n\n(1) Máy thu sóng truyền hình (mặt đất, truyền hình cáp hoặc vệ tinh) mà không bao gồm thiết bị hiển thị (CRT, LCD…). Các thiết bị này nhận các tín hiệu và chuyển đổi chúng thành các tín hiệu thích hợp cho hiển thị. … (3) Máy thu truyền hình các loại (LCD, plasma, CRT…) được sử dụng trong nhà (TV)' }],
        nguon: 'tieuDe.85287',
        trich: '85287 Thiết bị thu dùng trong truyền hình, có hoặc không gắn với thiết bị thu thanh sóng vô tuyến hoặc thiết bị ghi hoặc tái tạo âm thanh hoặc hình ảnh',
      },
      { hs6: '852872', dieuKien: 'màu', fact: 'mauHienThi', op: 'TRONG', value: ['MAU'], tuKhoa: ['màu'], nguon: 'tieuDe.852872', trich: '852872 Loại khác, màu' },
      { hs6: '852872', phanConLai: true, nguon: 'tieuDe.852872', trich: '852872 Loại khác, màu' },
    ];
    kiem('T-8 8528.72 mauHienThi MAU khớp "Loại khác, màu" không lỗi SUY_RONG',
      loiNgoaiThieuPn('8528', tc8528_72).length === 0,
      loiNgoaiThieuPn('8528', tc8528_72));
  }

  {
    const tc8525 = [
      { hs6: '852550', dieuKien: 'Thiết bị phát', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Thiết bị phát', tuKhoa: ['thiết bị phát'], nguon: 'tax.85255000', trich: '85255000 - Thiết bị phát' },
      { hs6: '852550', dieuKien: 'not incorporating reception apparatus', fact: 'coGanThietBiThu', op: 'KHONG', nguon: 'wco.852550', trich: '852550 Transmission apparatus for radio-broadcasting or television, whether or not incorporating sound recording or reproducing apparatus, not incorporating reception apparatus' },
      { hs6: '852560', dieuKien: 'Thiết bị phát', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Thiết bị phát', tuKhoa: ['thiết bị phát'], nguon: 'tax.85256000', trich: '85256000 - Thiết bị phát có gắn với thiết bị thu' },
      { hs6: '852560', dieuKien: 'có gắn với thiết bị thu', fact: 'coGanThietBiThu', op: 'CO', nguon: 'tax.85256000', trich: '85256000 - Thiết bị phát có gắn với thiết bị thu' },
      { hs6: '852581', dieuKien: 'Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Camera truyền hình', 'camera kỹ thuật số', 'camera ghi hình ảnh'], tuKhoa: ['camera'], nguon: 'tieuDe.85258', trich: '85258 Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh' },
      { hs6: '852581', chuaSoHoa: 'thiếu tốc độ cao', nguon: 'tieuDe.852581', trich: '852581 Loại tốc độ cao nêu tại Chú giải Phân nhóm 1 của Chương này' },
      { hs6: '852582', dieuKien: 'Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Camera truyền hình', 'camera kỹ thuật số', 'camera ghi hình ảnh'], tuKhoa: ['camera'], nguon: 'tieuDe.85258', trich: '85258 Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh' },
      { hs6: '852582', chuaSoHoa: 'thiếu chịu bức xạ', nguon: 'tieuDe.852582', trich: '852582 Loại khác, được làm cứng bức xạ hoặc chịu bức xạ nêu tại Chú giải Phân nhóm 2 của Chương này' },
      { hs6: '852582', phanConLai: true, nguon: 'tieuDe.852582', trich: '852582 Loại khác, được làm cứng bức xạ hoặc chịu bức xạ nêu tại Chú giải Phân nhóm 2 của Chương này' },
      { hs6: '852583', dieuKien: 'Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Camera truyền hình', 'camera kỹ thuật số', 'camera ghi hình ảnh'], tuKhoa: ['camera'], nguon: 'tieuDe.85258', trich: '85258 Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh' },
      { hs6: '852583', chuaSoHoa: 'thiếu nhìn ban đêm', nguon: 'tieuDe.852583', trich: '852583 Loại khác, loại nhìn ban đêm nêu tại Chú giải Phân nhóm 3 của Chương này' },
      { hs6: '852583', phanConLai: true, nguon: 'tieuDe.852583', trich: '852583 Loại khác, loại nhìn ban đêm nêu tại Chú giải Phân nhóm 3 của Chương này' },
      { hs6: '852589', dieuKien: 'Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Camera truyền hình', 'camera kỹ thuật số', 'camera ghi hình ảnh'], tuKhoa: ['camera'], nguon: 'tieuDe.85258', trich: '85258 Camera truyền hình, camera kỹ thuật số và camera ghi hình ảnh' },
      { hs6: '852589', phanConLai: true, nguon: 'tieuDe.852589', trich: '852589 Loại khác' },
    ];
    const r8525 = G6.kiemTieuChi6('8525', tc8525, { toKhai: false });
    const dx8525 = G6.diXuong6('8525', tc8525, 'Thiết bị phát sóng truyền hình có gắn với thiết bị thu');
    kiem('T-8 8525 đủ bộ với coGanThietBiThu (8525.50 KHONG, 8525.60 CO) = 0 lỗi, sạch TIEU_DE_CHI_LAC & diXuong6 chốt 852560',
      r8525.loi.length === 0 && dx8525.trangThai === 'DUNG_CHOT' && dx8525.hs6 === '852560',
      { loi: r8525.loi, dx8525 });
  }

  // 3. 8515.21/31: "Loại tự động hoàn toàn hoặc một phần" phủ trọn bởi loaiTuDong: CO
  {
    const p8515 = G6.phanNhomCuaNhom('8515').find((x) => x.hs6 === '851521');
    const ve21 = G6.veCanPhu('8515', p8515);
    const muc21 = [
      { hs6: '851521', dieuKien: 'Máy và thiết bị để hàn kim loại bằng nguyên lý điện trở', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy và thiết bị để hàn kim loại bằng nguyên lý điện trở', tuKhoa: ['hàn kim loại', 'điện trở'], nguon: 'tieuDe.85152', trich: '85152 Máy và thiết bị để hàn kim loại bằng nguyên lý điện trở' },
      { hs6: '851521', dieuKien: 'Loại tự động hoàn toàn hoặc một phần', fact: 'loaiTuDong', op: 'CO', nguon: 'tax.85152100', trich: '85152100 - - Loại tự động hoàn toàn hoặc một phần' },
    ];
    kiem('T-8 8515.21 phuVe phủ đủ "Loại tự động hoàn toàn hoặc một phần" bằng loaiTuDong CO',
      ve21.every((v) => G6.phuVe(muc21, v)),
      ve21);
  }

  // 4. 8424 + 8479: tachVeTieuDe bỏ đuôi "tương tự"; giữ 8543.40 & vẫn chặn "và các loại tương tự" trong value
  {
    const ve8424 = G6.tachVeTieuDe('Súng phun và các thiết bị tương tự', new Set());
    const ve84243 = G6.tachVeTieuDe('Máy phun bắn hơi nước hoặc cát và các loại máy phun bắn tia tương tự', new Set());
    const ve8479 = G6.tachVeTieuDe('Máy dùng cho các công trình công cộng, công trình xây dựng hoặc các mục đích tương tự', new Set());
    const tc8543_ok = [{ hs6: '854340', dieuKien: 'các thiết bị điện hóa hơi cá nhân tương tự', fact: 'tenLoai', op: 'TEN_LOAI', value: 'các thiết bị điện hóa hơi cá nhân tương tự', tuKhoa: ['hóa hơi cá nhân'], nguon: 'tieuDe.854340', trich: '854340 Thuốc lá điện tử và các thiết bị điện hóa hơi cá nhân tương tự' }];
    const tcRong = [{ hs6: '842420', dieuKien: 'và các dụng cụ tương tự', fact: 'tenLoai', op: 'TEN_LOAI', value: 'và các dụng cụ tương tự', tuKhoa: ['súng phun'], nguon: 'tax.84242000', trich: '84242000 - Súng phun và các thiết bị tương tự' }];
    kiem('T-8 tachVeTieuDe bỏ "tương tự" ở 8424/8479; giữ 8543.40 sạch GIA_TRI_RONG và vẫn chặn "và các dụng cụ tương tự"',
      ve8424[0]?.chu === 'Súng phun'
      && ve84243[0]?.chu === 'Máy phun bắn hơi nước hoặc cát'
      && /công trình xây dựng$/.test(ve8479[1]?.chu || '')
      && !loiNgoaiThieuPn('8543', tc8543_ok).some((l) => l.ma === 'GIA_TRI_RONG')
      && loiNgoaiThieuPn('8424', tcRong).some((l) => l.ma === 'GIA_TRI_RONG'),
      { ve8424, ve84243, ve8479 });
  }

  // 5. 8541 + 8516 + 9506: rutGonTenTang khử TIEU_DE_CHI_LAC trên tầng ghép ";" / "hoặc" / "và" (9506.11 dùng tiếng Việt thuần)
  {
    const tc8541 = [
      { hs6: '854141', dieuKien: 'Thiết bị bán dẫn cảm quang; tế bào quang điện; đi-ốt phát quang (LED)', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Thiết bị bán dẫn cảm quang', 'tế bào quang điện', 'đi-ốt phát quang', 'LED'], tuKhoa: ['cảm quang', 'quang điện', 'đi-ốt phát quang'], nguon: 'tieuDe.85414', trich: '85414 Thiết bị bán dẫn cảm quang, kể cả tế bào quang điện đã hoặc chưa lắp ráp thành các mảng mô-đun hoặc thành bảng; đi-ốt phát quang (LED)' },
      { hs6: '854141', dieuKien: 'Đi-ốt phát quang (LED)', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Đi-ốt phát quang', 'LED'], tuKhoa: ['đi-ốt phát quang'], nguon: 'tax.85414100', trich: '85414100 - - Đi-ốt phát quang (LED)' },
      { hs6: '854142', dieuKien: 'Thiết bị bán dẫn cảm quang; tế bào quang điện; đi-ốt phát quang (LED)', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Thiết bị bán dẫn cảm quang', 'tế bào quang điện', 'đi-ốt phát quang', 'LED'], tuKhoa: ['cảm quang', 'quang điện', 'đi-ốt phát quang'], nguon: 'tieuDe.85414', trich: '85414 Thiết bị bán dẫn cảm quang, kể cả tế bào quang điện đã hoặc chưa lắp ráp thành các mảng mô-đun hoặc thành bảng; đi-ốt phát quang (LED)' },
      { hs6: '854142', dieuKien: 'Tế bào quang điện', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Tế bào quang điện', tuKhoa: ['tế bào quang điện'], nguon: 'tax.85414200', trich: '85414200 - - Tế bào quang điện chưa lắp ráp thành các mảng mô-đun hoặc thành bảng' },
      { hs6: '854142', dieuKien: 'chưa lắp ráp thành các mảng mô-đun hoặc thành bảng', fact: 'daLapRap', op: 'KHONG', nguon: 'tax.85414200', trich: '85414200 - - Tế bào quang điện chưa lắp ráp thành các mảng mô-đun hoặc thành bảng' },
      { hs6: '854143', dieuKien: 'Thiết bị bán dẫn cảm quang; tế bào quang điện; đi-ốt phát quang (LED)', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Thiết bị bán dẫn cảm quang', 'tế bào quang điện', 'đi-ốt phát quang', 'LED'], tuKhoa: ['cảm quang', 'quang điện', 'đi-ốt phát quang'], nguon: 'tieuDe.85414', trich: '85414 Thiết bị bán dẫn cảm quang, kể cả tế bào quang điện đã hoặc chưa lắp ráp thành các mảng mô-đun hoặc thành bảng; đi-ốt phát quang (LED)' },
      { hs6: '854143', dieuKien: 'Tế bào quang điện', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Tế bào quang điện', tuKhoa: ['tế bào quang điện'], nguon: 'tax.85414300', trich: '85414300 - - Tế bào quang điện đã lắp ráp thành các mảng mô-đun hoặc thành bảng' },
      { hs6: '854143', dieuKien: 'đã lắp ráp thành các mảng mô-đun hoặc thành bảng', fact: 'daLapRap', op: 'CO', nguon: 'tax.85414300', trich: '85414300 - - Tế bào quang điện đã lắp ráp thành các mảng mô-đun hoặc thành bảng' },
    ];
    const tc8516 = [
      { hs6: '851631', dieuKien: 'Dụng cụ làm tóc hoặc máy sấy làm khô tay nhiệt điện', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Dụng cụ làm tóc', 'máy sấy làm khô tay nhiệt điện'], tuKhoa: ['làm tóc', 'làm khô tay'], nguon: 'tieuDe.85163', trich: '85163 Dụng cụ làm tóc hoặc máy sấy làm khô tay nhiệt điện' },
      { hs6: '851631', dieuKien: 'Máy sấy khô tóc', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy sấy khô tóc', tuKhoa: ['máy sấy khô tóc'], nguon: 'tax.85163100', trich: '85163100 - - Máy sấy khô tóc' },
      { hs6: '851632', dieuKien: 'Dụng cụ làm tóc hoặc máy sấy làm khô tay nhiệt điện', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Dụng cụ làm tóc', 'máy sấy làm khô tay nhiệt điện'], tuKhoa: ['làm tóc', 'làm khô tay'], nguon: 'tieuDe.85163', trich: '85163 Dụng cụ làm tóc hoặc máy sấy làm khô tay nhiệt điện' },
      { hs6: '851632', dieuKien: 'Dụng cụ làm tóc', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Dụng cụ làm tóc', tuKhoa: ['dụng cụ làm tóc'], nguon: 'tax.85163200', trich: '85163200 - - Dụng cụ làm tóc khác' },
      { hs6: '851632', phanConLai: true, nguon: 'tax.85163200', trich: '85163200 - - Dụng cụ làm tóc khác' },
      { hs6: '851633', dieuKien: 'Dụng cụ làm tóc hoặc máy sấy làm khô tay nhiệt điện', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Dụng cụ làm tóc', 'máy sấy làm khô tay nhiệt điện'], tuKhoa: ['làm tóc', 'làm khô tay'], nguon: 'tieuDe.85163', trich: '85163 Dụng cụ làm tóc hoặc máy sấy làm khô tay nhiệt điện' },
      { hs6: '851633', dieuKien: 'Máy sấy làm khô tay', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy sấy làm khô tay', tuKhoa: ['máy sấy làm khô tay'], nguon: 'tax.85163300', trich: '85163300 - - Máy sấy làm khô tay' },
    ];
    const tc9506 = [
      { hs6: '950611', dieuKien: 'Ván trượt tuyết và các thiết bị trượt tuyết', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Ván trượt tuyết', 'các thiết bị trượt tuyết'], tuKhoa: ['trượt tuyết'], nguon: 'tieuDe.95061', trich: '95061 Ván trượt tuyết và các thiết bị trượt tuyết khác' },
      { hs6: '950611', dieuKien: 'Ván trượt tuyết', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Ván trượt tuyết', tuKhoa: ['ván trượt tuyết'], nguon: 'tax.95061100', trich: '95061100 - - Ván trượt tuyết' },
      { hs6: '950612', dieuKien: 'Ván trượt tuyết và các thiết bị trượt tuyết', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Ván trượt tuyết', 'các thiết bị trượt tuyết'], tuKhoa: ['trượt tuyết'], nguon: 'tieuDe.95061', trich: '95061 Ván trượt tuyết và các thiết bị trượt tuyết khác' },
      { hs6: '950612', dieuKien: 'Dây buộc ván trượt', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Dây buộc ván trượt', tuKhoa: ['dây buộc ván trượt'], nguon: 'tax.95061200', trich: '95061200 - - Dây buộc ván trượt' },
    ];
    const dx9506 = G6.diXuong6('9506', tc9506, 'Ván trượt tuyết');
    kiem('T-8 rutGonTenTang: 8541.4x, 8516.3x, 9506.1x (9506.11 thuần Việt) đều = 0 TIEU_DE_CHI_LAC & diXuong6("Ván trượt tuyết") → 950611',
      loiNgoaiThieuPn('8541', tc8541).length === 0
      && loiNgoaiThieuPn('8516', tc8516).length === 0
      && loiNgoaiThieuPn('9506', tc9506).length === 0
      && dx9506.trangThai === 'DUNG_CHOT' && dx9506.hs6 === '950611',
      { l8541: loiNgoaiThieuPn('8541', tc8541), l8516: loiNgoaiThieuPn('8516', tc8516), l9506: loiNgoaiThieuPn('9506', tc9506), dx9506 });
  }

  // 6. 9615.11: câu "hoặc" ghép vatLieuKhac: CAO_SU_CUNG + chatLieu: plastic qua KHOA_RONG_HON_LUAT (nhưng thiếu CAO_SU_CUNG vẫn đỏ)
  {
    const tc9615 = [
      { hs6: '961511', dieuKien: 'Lược, trâm cài tóc', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Lược', 'trâm cài tóc'], tuKhoa: ['lược', 'trâm cài tóc'], nguon: 'tieuDe.96151', trich: '96151 Lược, trâm cài tóc và loại tương tự' },
      { hs6: '961511', dieuKien: 'Bằng cao su cứng', fact: 'vatLieuKhac', op: 'TRONG', value: ['CAO_SU_CUNG'], tuKhoa: ['cao su cứng'], nguon: 'tieuDe.961511', trich: '961511 Bằng cao su cứng hoặc plastic' },
      { hs6: '961511', dieuKien: 'Bằng plastic', fact: 'chatLieu', op: 'LA', value: 'plastic', tuKhoa: ['plastic'], nguon: 'tieuDe.961511', trich: '961511 Bằng cao su cứng hoặc plastic' },
      { hs6: '961519', dieuKien: 'Lược, trâm cài tóc', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Lược', 'trâm cài tóc'], tuKhoa: ['lược', 'trâm cài tóc'], nguon: 'tieuDe.96151', trich: '96151 Lược, trâm cài tóc và loại tương tự' },
      { hs6: '961519', phanConLai: true, nguon: 'tax.96151900', trich: '96151900 - - Loại khác' },
      { hs6: '961590', phanConLai: true, nguon: 'tieuDe.961590', trich: '961590 Loại khác' },
    ];
    const r9615 = G6.kiemTieuChi6('9615', tc9615, { toKhai: false });
    const dxCs = G6.diXuong6('9615', tc9615, 'Lược chải tóc bằng cao su cứng');
    const dxPl = G6.diXuong6('9615', tc9615, 'Trâm cài tóc bằng plastic');
    const loiThieuBoNgu = G6.khoaRongHonLuat('chatLieu', 'cao su', '961511 Bằng cao su cứng hoặc plastic', { mucCungPn: [tc9615[0], { hs6: '961511', fact: 'chatLieu', op: 'LA', value: 'cao su' }, tc9615[2]] });
    kiem('T-8 9615 đủ bộ (vatLieuKhac CAO_SU_CUNG + chatLieu plastic) = 0 lỗi, diXuong6 cả 2 nhánh vào 961511; thiếu CAO_SU_CUNG vẫn KHOA_RONG_HON_LUAT',
      r9615.loi.length === 0 && dxCs.hs6 === '961511' && dxPl.hs6 === '961511' && Boolean(loiThieuBoNgu),
      { loi: r9615.loi, dxCs, dxPl, loiThieuBoNgu });
  }

  // 7. 9025.11: "Chứa chất lỏng, để đọc trực tiếp" không bị tenLoai hay dangLong bắt nhầm
  kiem('T-8 khoaPhuHop 9025.11 "Chứa chất lỏng, để đọc trực tiếp" = null (không tenLoai, không dangLong)',
    G6.khoaPhuHop('9025', '90251100 - - Chứa chất lỏng, để đọc trực tiếp') === null,
    G6.khoaPhuHop('9025', '90251100 - - Chứa chất lỏng, để đọc trực tiếp'));

  // 8. 8467.22: AM_TIET_CHUNG_CO_DAU giữ "cưa" ≠ "của", vẫn chặn "của" / "máy" / "bộ phận" / "cua cho"
  {
    const mk8467 = (tk) => [
      { hs6: '846722', dieuKien: 'Có động cơ điện gắn liền', fact: 'hoatDongBangDien', op: 'CO', tuKhoa: ['động cơ điện'], nguon: 'tieuDe.84672', trich: '84672 Có động cơ điện gắn liền' },
      { hs6: '846722', dieuKien: 'Cưa', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Cưa', tuKhoa: tk, nguon: 'tax.84672200', trich: '84672200 - - Cưa' },
    ];
    const mkCua = (tk) => [{ hs6: '841391', dieuKien: 'Bộ phận', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Bộ phận', tuKhoa: tk, nguon: 'tax.84139100', trich: '84139100 - - Của bơm' }];
    const mkMay = [{ hs6: '846722', dieuKien: 'Máy cưa', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Cưa', tuKhoa: ['máy'], nguon: 'tieuDe.8467', trich: '8467 Dụng cụ cầm tay …' }];
    kiem('T-8 TU_KHOA_QUA_CHUNG: "cưa" (8467.22) hợp lệ; "của" / "bộ phận" / "máy" vẫn đỏ',
      loiNgoaiThieuPn('8467', mk8467(['cưa'])).length === 0
      && loiNgoaiThieuPn('8413', mkCua(['của'])).some((l) => l.ma === 'TU_KHOA_QUA_CHUNG')
      && loiNgoaiThieuPn('8413', mkCua(['bộ phận'])).some((l) => l.ma === 'TU_KHOA_QUA_CHUNG')
      && loiNgoaiThieuPn('8467', mkMay).some((l) => l.ma === 'TU_KHOA_QUA_CHUNG')
      && loiNgoaiThieuPn('8467', mk8467(['có'])).some((l) => l.ma === 'TU_KHOA_QUA_CHUNG'),
      loiNgoaiThieuPn('8467', mk8467(['cưa'])));
  }

  // 9. 6110 + 5407 + 4009 + 8443: vòng lặp CHUA_SO_HOA_CO_KHOA, Từ các sợi có màu, 4009 duy nhất, 8443 LIET_KE_MOT_CHUOI
  {
    const tc6110_ok = [
      { hs6: '611012', dieuKien: 'Từ lông cừu hoặc lông động vật loại mịn', fact: 'loaiSoiDet', op: 'TRONG', value: ['LEN_LONG_DONG_VAT_MIN'], nguon: 'tieuDe.61101', trich: '61101 Từ lông cừu hoặc lông động vật loại mịn' },
      { hs6: '611012', chuaSoHoa: 'thiếu giá trị tách riêng lông dê Ca-sơ-mia', nguon: 'tax.61101200', trich: '61101200 - - Của dê Ca-sơ-mia (len casơmia)' },
    ];
    const tc6110_thieu = [{ hs6: '611012', chuaSoHoa: 'thiếu khoá', nguon: 'tax.61101200', trich: '61101200 - - Của dê Ca-sơ-mia (len casơmia)' }];
    kiem('T-8 6110.12 có sẵn loaiSoiDet LEN_LONG_DONG_VAT_MIN không lặp CHUA_SO_HOA_CO_KHOA (kể cả dungCho); thiếu loaiSoiDet vẫn đỏ',
      loiNgoaiThieuPn('6110', tc6110_ok).length === 0
      && loiNgoaiThieuPn('6110', tc6110_thieu).some((l) => l.ma === 'CHUA_SO_HOA_CO_KHOA'),
      loiNgoaiThieuPn('6110', tc6110_ok));
  }

  {
    const tc5407 = [
      { hs6: '540751', dieuKien: 'sợi dún', fact: 'soiDun', op: 'CO', nguon: 'tieuDe.54075', trich: '54075 Vải dệt thoi khác, có hàm lượng sợi filament polyeste dún chiếm từ 85% trở lên tính theo khối lượng' },
      { hs6: '540751', dieuKien: 'hàm lượng sợi filament chiếm từ 85% trở lên tính theo khối lượng', fact: 'hamLuongSoiFilamentTongHop', op: '>=', value: 85, donVi: '%', nguon: 'tieuDe.54075', trich: '54075 Vải dệt thoi khác, có hàm lượng sợi filament polyeste dún chiếm từ 85% trở lên tính theo khối lượng' },
      { hs6: '540751', dieuKien: 'sợi filament polyeste', fact: 'loaiSoiDet', op: 'TRONG', value: ['SOI_TONG_HOP'], nguon: 'tieuDe.54075', trich: '54075 Vải dệt thoi khác, có hàm lượng sợi filament polyeste dún chiếm từ 85% trở lên tính theo khối lượng' },
      { hs6: '540751', chuaSoHoa: 'thiếu khoá hàm lượng sợi polyeste dún riêng', nguon: 'tieuDe.54075', trich: 'sợi filament polyeste dún' },
      { hs6: '540751', dieuKien: 'Chưa tẩy trắng hoặc đã tẩy trắng', fact: 'tinhTrangTayTrang', op: 'TRONG', value: ['CHUA_TAY_TRANG', 'DA_TAY_TRANG'], nguon: 'tax.54075100', trich: '54075100 - - Chưa tẩy trắng hoặc đã tẩy trắng' },
      { hs6: '540781', dieuKien: 'hàm lượng sợi filament tổng hợp chiếm dưới 85% tính theo khối lượng', fact: 'hamLuongSoiFilamentTongHop', op: '<', value: 85, donVi: '%', nguon: 'tieuDe.54078', trich: '54078 Vải dệt thoi khác, có hàm lượng sợi filament tổng hợp chiếm dưới 85% tính theo khối lượng, được pha chủ yếu hoặc pha duy nhất với bông' },
      { hs6: '540781', dieuKien: 'được pha với bông', fact: 'loaiSoiDet', op: 'TRONG', value: ['BONG'], nguon: 'tieuDe.54078', trich: '54078 Vải dệt thoi khác, có hàm lượng sợi filament tổng hợp chiếm dưới 85% tính theo khối lượng, được pha chủ yếu hoặc pha duy nhất với bông' },
      { hs6: '540781', dieuKien: 'Chưa tẩy trắng hoặc đã tẩy trắng', fact: 'tinhTrangTayTrang', op: 'TRONG', value: ['CHUA_TAY_TRANG', 'DA_TAY_TRANG'], nguon: 'tax.54078100', trich: '54078100 - - Chưa tẩy trắng hoặc đã tẩy trắng' },
      { hs6: '540793', dieuKien: 'Vải dệt thoi', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Vải dệt thoi', tuKhoa: ['vải dệt thoi'], nguon: 'tieuDe.54079', trich: '54079 Vải dệt thoi khác' },
      { hs6: '540793', dieuKien: 'Từ các sợi có các màu khác nhau', fact: 'tinhTrangTayTrang', op: 'TRONG', value: ['TU_SOI_MAU'], nguon: 'tax.54079300', trich: '54079300 - - Từ các sợi có các màu khác nhau' },
    ];
    kiem('T-8 5407.51/5407.81/5407.93 sạch SUY_RONG, CHUA_SO_HOA_CO_KHOA và THIEU_VE_GIOI_HAN ("Từ các sợi có các màu khác nhau")',
      loiNgoaiThieuPn('5407', tc5407).length === 0,
      loiNgoaiThieuPn('5407', tc5407));
  }

  {
    const tc4009 = [
      { hs6: '400911', dieuKien: 'Chưa gia cố', fact: 'daGiaCo', op: 'KHONG', nguon: 'tieuDe.40091', trich: '40091 Chưa gia cố hoặc kết hợp với các vật liệu khác' },
      { hs6: '400911', dieuKien: 'Không kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'KHONG', nguon: 'tax.40091100', trich: '40091100 - - Không kèm phụ kiện ghép nối' },
      { hs6: '400912', dieuKien: 'Chưa gia cố', fact: 'daGiaCo', op: 'KHONG', nguon: 'tieuDe.40091', trich: '40091 Chưa gia cố hoặc kết hợp với các vật liệu khác' },
      { hs6: '400912', dieuKien: 'Có kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'CO', nguon: 'tieuDe.400912', trich: '400912 Có kèm phụ kiện ghép nối' },
      { hs6: '400921', dieuKien: 'Đã gia cố', fact: 'daGiaCo', op: 'CO', nguon: 'tieuDe.40092', trich: '40092 Đã gia cố hoặc kết hợp duy nhất với kim loại' },
      { hs6: '400921', dieuKien: 'gia cố hoặc kết hợp duy nhất với kim loại', fact: 'chatLieu', op: 'LA', value: 'kim loại', viTri: 'GIA_CO', tuKhoa: ['kim loại'], nguon: 'tieuDe.40092', trich: '40092 Đã gia cố hoặc kết hợp duy nhất với kim loại' },
      { hs6: '400921', chuaSoHoa: 'thiếu điều kiện kết hợp duy nhất', nguon: 'tieuDe.40092', trich: 'kết hợp duy nhất với kim loại' },
      { hs6: '400921', dieuKien: 'Không kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'KHONG', nguon: 'tieuDe.400921', trich: '400921 Không kèm phụ kiện ghép nối' },
      { hs6: '400922', dieuKien: 'Đã gia cố', fact: 'daGiaCo', op: 'CO', nguon: 'tieuDe.40092', trich: '40092 Đã gia cố hoặc kết hợp duy nhất với kim loại' },
      { hs6: '400922', dieuKien: 'gia cố hoặc kết hợp duy nhất với kim loại', fact: 'chatLieu', op: 'LA', value: 'kim loại', viTri: 'GIA_CO', tuKhoa: ['kim loại'], nguon: 'tieuDe.40092', trich: '40092 Đã gia cố hoặc kết hợp duy nhất với kim loại' },
      { hs6: '400922', chuaSoHoa: 'thiếu điều kiện kết hợp duy nhất', nguon: 'tieuDe.40092', trich: 'kết hợp duy nhất với kim loại' },
      { hs6: '400922', dieuKien: 'Có kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'CO', nguon: 'tieuDe.400922', trich: '400922 Có kèm phụ kiện ghép nối' },
      { hs6: '400931', dieuKien: 'Đã gia cố', fact: 'daGiaCo', op: 'CO', nguon: 'tieuDe.40093', trich: '40093 Đã gia cố hoặc kết hợp duy nhất với vật liệu dệt' },
      { hs6: '400931', dieuKien: 'gia cố hoặc kết hợp duy nhất với vật liệu dệt', fact: 'vatLieuKhac', op: 'TRONG', value: ['VAT_LIEU_DET'], tuKhoa: ['vật liệu dệt'], nguon: 'tieuDe.40093', trich: '40093 Đã gia cố hoặc kết hợp duy nhất với vật liệu dệt' },
      { hs6: '400931', chuaSoHoa: 'thiếu điều kiện kết hợp duy nhất', nguon: 'tieuDe.40093', trich: 'kết hợp duy nhất với vật liệu dệt' },
      { hs6: '400931', dieuKien: 'Không kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'KHONG', nguon: 'tieuDe.400931', trich: '400931 Không kèm phụ kiện ghép nối' },
      { hs6: '400932', dieuKien: 'Đã gia cố', fact: 'daGiaCo', op: 'CO', nguon: 'tieuDe.40093', trich: '40093 Đã gia cố hoặc kết hợp duy nhất với vật liệu dệt' },
      { hs6: '400932', dieuKien: 'gia cố hoặc kết hợp duy nhất với vật liệu dệt', fact: 'vatLieuKhac', op: 'TRONG', value: ['VAT_LIEU_DET'], tuKhoa: ['vật liệu dệt'], nguon: 'tieuDe.40093', trich: '40093 Đã gia cố hoặc kết hợp duy nhất với vật liệu dệt' },
      { hs6: '400932', chuaSoHoa: 'thiếu điều kiện kết hợp duy nhất', nguon: 'tieuDe.40093', trich: 'kết hợp duy nhất với vật liệu dệt' },
      { hs6: '400932', dieuKien: 'Có kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'CO', nguon: 'tieuDe.400932', trich: '400932 Có kèm phụ kiện ghép nối' },
      { hs6: '400941', dieuKien: 'Đã gia cố', fact: 'daGiaCo', op: 'CO', nguon: 'tieuDe.40094', trich: '40094 Đã gia cố hoặc kết hợp với vật liệu khác' },
      { hs6: '400941', chuaSoHoa: 'thiếu vật liệu khác ngoài kim loại và vật liệu dệt', nguon: 'tieuDe.40094', trich: 'kết hợp với vật liệu khác' },
      { hs6: '400941', dieuKien: 'Không kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'KHONG', nguon: 'tieuDe.400941', trich: '400941 Không kèm phụ kiện ghép nối' },
      { hs6: '400942', dieuKien: 'Đã gia cố', fact: 'daGiaCo', op: 'CO', nguon: 'tieuDe.40094', trich: '40094 Đã gia cố hoặc kết hợp với vật liệu khác' },
      { hs6: '400942', chuaSoHoa: 'thiếu vật liệu khác ngoài kim loại và vật liệu dệt', nguon: 'tieuDe.40094', trich: 'kết hợp với vật liệu khác' },
      { hs6: '400942', dieuKien: 'Có kèm phụ kiện ghép nối', fact: 'coKemPhuKien', op: 'CO', nguon: 'tieuDe.400942', trich: '400942 Có kèm phụ kiện ghép nối' },
    ];
    const r4009 = G6.kiemTieuChi6('4009', tc4009, { toKhai: false });
    const dx4009 = G6.diXuong6('4009', tc4009, 'Ống cao su lưu hóa gia cố kết hợp dây thép và sợi vải dệt không kèm phụ kiện ghép nối');
    kiem('T-8 4009 đủ bộ với chuaSoHoa "kết hợp duy nhất" = 0 lỗi & diXuong6 ống hỗn hợp không khoá nhầm vào 4009.21 (DUNG_HOI)',
      r4009.loi.length === 0 && dx4009.trangThai === 'DUNG_HOI' && dx4009.hs6 === null,
      { loi: r4009.loi, dx4009 });
  }

  {
    const tc8443 = [
      { hs6: '844331', dieuKien: 'Máy in, máy copy và máy fax', fact: 'tenLoai', op: 'TEN_LOAI', value: ['Máy in', 'máy copy', 'máy fax'], tuKhoa: ['máy in', 'máy copy', 'máy fax'], nguon: 'tieuDe.84433', trich: '84433 Máy in khác, máy copy và máy fax, có hoặc không kết hợp với nhau' },
      { hs6: '844331', dieuKien: 'Máy kết hợp hai hoặc nhiều chức năng in, copy hoặc fax', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy kết hợp hai hoặc nhiều chức năng in, copy hoặc fax', tuKhoa: ['hai hoặc nhiều chức năng'], nguon: 'tieuDe.844331', trich: '844331 Máy kết hợp hai hoặc nhiều chức năng in, copy hoặc fax, có khả năng kết nối với máy xử lý dữ liệu tự động hoặc kết nối mạng' },
      { hs6: '844331', dieuKien: 'có khả năng kết nối với máy xử lý dữ liệu tự động hoặc kết nối mạng', fact: 'coKetNoiMayTinh', op: 'CO', nguon: 'tieuDe.844331', trich: '844331 Máy kết hợp hai hoặc nhiều chức năng in, copy hoặc fax, có khả năng kết nối với máy xử lý dữ liệu tự động hoặc kết nối mạng' },
      { hs6: '844391', dieuKien: 'Bộ phận và phụ kiện', fact: 'laBoPhan', op: 'CO', nguon: 'tieuDe.84439', trich: '84439 Bộ phận và phụ kiện' },
      {
        hs6: '844391',
        dieuKien: 'của máy in sử dụng các bộ phận in như khuôn in (bát chữ), ống in và các bộ phận in khác của nhóm 84.42',
        fact: 'dungCho',
        op: 'CONG_DUNG',
        value: 'máy in sử dụng các bộ phận in như khuôn in (bát chữ), ống in và các bộ phận in khác của nhóm 84.42',
        tuKhoa: ['84.42'],
        kiemChung: [{ hoi: 'Bộ phận phụ trợ có được thiết kế chuyên dùng để vận hành kết nối với máy in (như khay nâng giấy, cơ cấu phân phối, bộ phận phân loại) không?', nguon: 'nhom8443.nhom', trich: 'Ví dụ, nhóm sẽ bao gồm các máy (có hoặc không được hiện diện riêng rẽ) để dùng phụ trợ cho việc in ấn được thiết kế chuyên dùng để vận hành với máy in… (1) Khay nâng giấy hoặc nâng chồng giấy và khay hoặc ngăn kéo giấy… (2) Bộ phận cấp giấy tự động… (3) Cơ cấu phân phối tờ giấy… (4) Bộ phận phân loại, sắp xếp… (5) Bộ phận gấp giấy, dán giấy, đục lỗ giấy và ghim giấy… Tuy nhiên, nếu chúng không được thiết kế chuyên dùng để sử dụng kết nối với máy in, chúng sẽ bị loại trừ khỏi nhóm này' }],
        nguon: 'tax.84439100',
        trich: '84439100 - - Bộ phận và phụ kiện của máy in sử dụng các bộ phận in như khuôn in (bát chữ), ống in và các bộ phận in khác của nhóm 84.42',
      },
    ];
    const tc8443_sai = [{ hs6: '844331', dieuKien: 'Máy in, máy copy hoặc máy fax', fact: 'tenLoai', op: 'TEN_LOAI', value: 'Máy in, máy copy hoặc máy fax', tuKhoa: ['máy in'], nguon: 'tieuDe.84433', trich: '84433 Máy in khác, máy copy và máy fax, có hoặc không kết hợp với nhau' }];
    kiem('T-8 8443.31/8443.91 sạch LIET_KE_MOT_CHUOI với "hai hoặc nhiều chức năng…" / "như … nhóm 84.42"; liệt kê trần vẫn đỏ',
      loiNgoaiThieuPn('8443', tc8443).length === 0
      && loiNgoaiThieuPn('8443', tc8443_sai).some((l) => l.ma === 'LIET_KE_MOT_CHUOI'),
      loiNgoaiThieuPn('8443', tc8443));

    const doRedosBoViDu = (val) => {
      const t0 = process.hrtime.bigint();
      G6.kiemTieuChi6('8443', [{ hs6: '844331', dieuKien: 'x', fact: 'tenLoai', op: 'TEN_LOAI', value: val, tuKhoa: ['máy in'], nguon: 'tieuDe.84433', trich: '84433 Máy in khác, máy copy và máy fax, có hoặc không kết hợp với nhau' }], { toKhai: false });
      return Number(process.hrtime.bigint() - t0) / 1e6;
    };
    const msCn = doRedosBoViDu(`${'hai chức năng '.repeat(40000)}(`);
    const msNhu = doRedosBoViDu(`${'như '.repeat(40000)}b`);
    kiem(`T-8 ReDoS O(N) boViDuCum 40.000 từ lặp < 500 ms ("hai chức năng "=${msCn.toFixed(1)} ms, "như "=${msNhu.toFixed(1)} ms)`,
      msCn < 500 && msNhu < 500,
      { msCn, msNhu });
  }

  // ADR-0003 / G6-1 lọt #4: phủ vế so chiều CO/KHONG ("chưa tráng men" không được phủ bằng daTrangMen:CO và ngược lại)
  {
    const vChua = G6.veCanPhu('7323', G6.phanNhomCuaNhom('7323').find((p) => p.hs6 === '732391')).find((v) => /tráng men/i.test(v.chu));
    const vDa = G6.veCanPhu('7323', G6.phanNhomCuaNhom('7323').find((p) => p.hs6 === '732392')).find((v) => /tráng men/i.test(v.chu));
    kiem('ADR-0003 lọt #4: phuVe so chiều CO/KHONG — daTrangMen:CO KHÔNG phủ "chưa tráng men", KHONG phủ được; ngược lại trên "đã tráng men"',
      !G6.phuVe([{ fact: 'daTrangMen', op: 'CO', nguon: 'tax.73239100', trich: '73239100 - - Bằng gang đúc, chưa tráng men' }], vChua)
      && G6.phuVe([{ fact: 'daTrangMen', op: 'KHONG', nguon: 'tax.73239100', trich: '73239100 - - Bằng gang đúc, chưa tráng men' }], vChua)
      && !G6.phuVe([{ fact: 'daTrangMen', op: 'KHONG', nguon: 'tax.73239200', trich: '73239200 - - Bằng gang đúc, đã tráng men' }], vDa)
      && G6.phuVe([{ fact: 'daTrangMen', op: 'CO', nguon: 'tax.73239200', trich: '73239200 - - Bằng gang đúc, đã tráng men' }], vDa),
      { vChua, vDa });
  }
}
void os;
xong();
