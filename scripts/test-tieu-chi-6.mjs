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
const GOC_TIEM = { ...XEP, 6704: DS_6704_CHUAN, 6913: DS_6913_CHUAN, 6004: DS_6004_CHUAN };
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
kiem('khoaPhuHop: tên hàng → tenLoai; "dùng cho …" → dungCho; "Bằng gang đúc" → chatLieu; "đã tráng men" (7323) → daTrangMen; "với hai vị trí" → null; "Mặt ngoài bằng da thuộc…" → null (tu-vung chưa có da thuộc); "Phụ kiện lắp vào …" → dungCho', G6.khoaPhuHop('8412', 'Chuyển động tịnh tiến (xi lanh)') === 'tenLoai' && G6.khoaPhuHop('8536', 'Dùng cho điện áp không quá 60 V') === 'dungCho' && G6.khoaPhuHop('7323', 'Bằng gang đúc') === 'chatLieu' && G6.khoaPhuHop('7323', '73239200 - - đã tráng men') === 'daTrangMen' && G6.khoaPhuHop('8481', 'với hai vị trí') === null && G6.khoaPhuHop('4202', '420211 Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp') === null && G6.khoaPhuHop('3926', 'Phụ kiện lắp vào đồ nội thất') === 'dungCho', JSON.stringify(['8412', '8536', '7323'].map((h) => G6.khoaPhuHop(h, 'đã tráng men'))));
// Phủ vế: tách tiêu đề thật thành vế cộng dồn; danh sách nhiều tên hàng thì không tách.
const ve = (h4, hs6) => G6.veCanPhu(h4, G6.phanNhomCuaNhom(h4).find((p) => p.hs6 === hs6)).map((v) => v.chu);
kiem('tách vế: 7323.94 "Bằng sắt (trừ gang đúc) hoặc thép, đã tráng men" ⇒ "Bằng sắt hoặc thép" + "đã tráng men" (vế "trừ" tách riêng)', JSON.stringify(ve('7323', '732394')) === JSON.stringify(['Bằng sắt hoặc thép', 'đã tráng men']), JSON.stringify(ve('7323', '732394')));
kiem('tách vế: 4202.11 ⇒ vế "bằng da thuộc …" (không bị xoá vì tên nhóm cũng liệt kê da thuộc; "Mặt ngoài" chỉ là vị trí); 8504.32 ⇒ một vế "Công suất danh định trên 1 kVA …"', ve('4202', '420211').some((v) => /da thuộc/.test(v)) && !ve('4202', '420211').includes('Mặt ngoài') && ve('8504', '850432').length === 1, JSON.stringify([ve('4202', '420211'), ve('8504', '850432')]));
kiem('phủ vế: chất liệu đọc bằng mẫu dùng chung — chatLieu ["plastic", "vải dệt"] mang được vế "bằng tấm plastic hoặc vật liệu dệt" (4202.22)', G6.phuVe([{ fact: 'chatLieu', op: 'LA', value: ['plastic', 'vải dệt'], nguon: 'tieuDe.420222', trich: '420222 Mặt ngoài bằng tấm plastic hoặc vật liệu dệt' }], G6.veCanPhu('4202', G6.phanNhomCuaNhom('4202').find((p) => p.hs6 === '420222')).find((v) => /plastic/.test(v.chu))));
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

// ── 8. Không đường khách nào nạp module cổng / gói soạn ─────────────────────────────────────────────────────────
const { tepMa, baoDong } = await import('./lib-luat.mjs');
const nap = [...tepMa('api'), 'server.js'].filter((t) => [...baoDong(t)].some((x) => x === 'lib/do-thi/tieu-chi-6.js'));
kiem('không route nào trong api/ nạp lib/do-thi/tieu-chi-6.js (cổng soạn dữ liệu, không phải đường khách)', nap.length === 0, nap.join(', '));
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
void os;
xong();
