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
const { mucLuu, apVaoSoTay } = await import('./goi-soan-tieu-chi-6.mjs');

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
const tiem = (h4, sua, goc = XEP) => { const ds = sao(goc[h4]); const ra = sua(ds) || ds; return G6.kiemTieuChi6(h4, ra, { toKhai: false }); };
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
  ['THIEU_DIEU_KIEN_TANG', '841239 chỉ khai phanConLai, bỏ điều kiện "dùng khí nén" của tầng 84123', '8412', (ds) => ds.filter((x) => !(x.hs6 === '841239' && x.nguon === 'tieuDe.84123'))],
  ['THIEU_VE_TRU', 'tiêu đề 841210 có "trừ tua bin phản lực" mà bỏ mục phủ định', '8412', (ds) => ds.filter((x) => !(x.hs6 === '841210' && x.chieu === 'PHAI_KHONG'))],
  ['TU_KHOA_TRONG_VE_TRU', 'lấy "tua bin phản lực" (thứ bị trừ) làm từ khoá nhận ra 841210', '8412', (ds) => { cua(ds, '841210', (x) => !x.chieu).tuKhoa = ['tua bin phản lực']; }],
  ['TIEU_DE_CHI_LAC', 'từ khoá "động cơ" cho tầng thủy lực: tiêu đề 841231 (khí nén, xi lanh) bị chỉ sang 841221', '8412', (ds) => { cua(ds, '841221', (x) => x.nguon === 'tieuDe.84122').tuKhoa = ['động cơ']; }],
  ['TIEN_LE_SAI', 'tiền lệ bịa số thông báo', '8481', (ds) => { cua(ds, '848120').tienLe.push({ so: '9999/TB-TCHQ', ma: '84812090' }); }],
  ['TIEN_LE_SAI', 'gắn thông báo của 848120 làm ví dụ cho 848110', '8481', (ds) => { cua(ds, '848110').tienLe = [{ so: '851/TB-TCHQ', ma: '84812090' }]; }],
  ['KHUON_SAI', 'trường lạ (ghiChu) và thiếu dieuKien', '8481', (ds) => { const x = cua(ds, '848110'); x.ghiChu = 'van điều áp cũng vào đây'; delete x.dieuKien; }],
];
for (const [maLoi, moTa, h4, sua] of CA) {
  const kq = tiem(h4, sua);
  kiem(`tiêm lỗi → ${maLoi}: ${moTa}`, kq.loi.some((l) => l.ma === maLoi), `cổng trả: ${ma(kq).join(', ') || '(0 lỗi)'}`);
}
kiem('mọi mã lỗi của cổng (trừ không) đều có ca tiêm', Object.keys(G6.MA_LOI).every((m) => CA.some((c) => c[0] === m)), Object.keys(G6.MA_LOI).filter((m) => !CA.some((c) => c[0] === m)).join(', '));
kiem('ca ngược: mẫu không sửa gì ⇒ 0 lỗi (cổng không đỏ oan) — cả bản soạn không thuTu lẫn bản đã xếp', ['8481', '8412'].every((h) => tiem(h, () => {}).loi.length === 0 && tiem(h, () => {}, { [h]: MAU[h].tieuChi6 }).loi.length === 0));
// Thiếu khoá từ vựng: khai chuaSoHoa ⇒ KHÔNG lỗi, có cảnh báo; phân nhóm đó không còn được chỉ bằng từ khoá.
const chuaSo = (() => { const ds = sao(MAU['8412'].tieuChi6); const i = ds.findIndex((x) => x.hs6 === '841221' && x.nguon === 'tax.84122100'); ds[i] = { hs6: '841221', chuaSoHoa: 'thiếu khoá kiểu chuyển động (tịnh tiến / quay)', nguon: 'tax.84122100', trich: 'Chuyển động tịnh tiến (xi lanh)' }; return { ds, kq: G6.kiemTieuChi6('8412', ds, { toKhai: false }) }; })();
kiem('chuaSoHoa: thiếu khoá thì khai rõ ⇒ 0 lỗi + cảnh báo THIEU_KHOA_TU_VUNG; phân nhóm đó không được chỉ bằng từ khoá', chuaSo.kq.loi.length === 0 && chuaSo.kq.canhBao.some((c) => c.ma === 'THIEU_KHOA_TU_VUNG' && c.hs6 === '841221') && G6.apTieuChi(G6.ganThuTu('8412', chuaSo.ds), 'xi lanh thủy lực').hs6 === null, JSON.stringify(chuaSo.kq.loi));
kiem('chuaSoHoa không được kèm fact (không vừa khai thiếu khoá vừa đặt điều kiện)', tiem('8412', (ds) => { const x = cua(ds, '841221', (y) => y.nguon === 'tax.84122100'); x.chuaSoHoa = 'thiếu khoá'; }).loi.some((l) => l.ma === 'KHUON_SAI'));
// Ba kiểu tiêu đề + thứ tự máy xếp, trên cây biểu thuế thật.
kiem('kiểu tiêu đề: "Thiết bị khác" / "Loại khác" = DU; "Thiết bị bảo vệ mạch điện khác", "Tượng nhỏ và các đồ trang trí khác" = DU_CO_PHAM_VI; "Van giảm áp" = CO_TEN', ['Thiết bị khác', '- - Loại khác'].every((t) => G6.kieuTieuDe(t) === 'DU') && ['Thiết bị bảo vệ mạch điện khác', 'Tượng nhỏ và các đồ trang trí khác', 'Loại khác, dùng cho xe có động cơ'].every((t) => G6.kieuTieuDe(t) === 'DU_CO_PHAM_VI') && G6.kieuTieuDe('Van giảm áp') === 'CO_TEN');
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

// ── 6. (b) Lõi câu hỏi: ca van 5/2, động cơ giả dừng ở 848180 ───────────────────────────────────────────────────
const H = require('../lib/hoi-theo-so-tay.js');
const VAN = 'Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch, cuộn coil 24VDC';
const q = H.cauPhanNhom6({ h4: '8481', top: '848180', ungVien6: [], text: VAN });
kiem('ca van 5/2 dừng ở 848180: câu phân nhóm đưa 8481.20 lên đầu, căn cứ là Chú giải phân nhóm 3 Chương 84 (nguyên văn)', Boolean(q) && /^8481\.20/.test(q.options[0]) && q.canCu === 'so-tay' && q.nguon === 'ch84.chuong' && /khái niệm "van dùng trong truyền động dầu thủy lực hoặc truyền động khí nén"/.test(q.trich), JSON.stringify(q || null).slice(0, 400));
const qNguoc = H.cauPhanNhom6({ h4: '8481', top: '848180', ungVien6: [], text: 'Vòi nước bằng đồng lắp cho chậu rửa' });
kiem('ca ngược: vòi nước bằng đồng dừng ở 848180 ⇒ câu hỏi không gợi ý 848120 theo mô tả', Boolean(qNguoc) && !qNguoc.phanNhomKhopMoTa.some((x) => x.hs6 === '848120'));

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
void os;
xong();
