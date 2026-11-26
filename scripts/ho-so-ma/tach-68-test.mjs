#!/usr/bin/env node
// scripts/ho-so-ma/tach-68-test.mjs — M-76 (#1968): bài kiểm tách cấp 6 và 8 số (Chương 76 + ca ngược).
// Tất định, không mạng, không AI, dùng kho luật gốc data/luat-goc thật.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  boGachTen,
  catDinhNghiaSen,
  dungHoSoChuong68,
  ghiHoSo,
  kiemBanGhiKhuonMoi,
  kiemPhuDinhChuong,
  kiemTrichVaVanTay,
  laCauViDuSen,
  laLoaiKhac,
  rutThuatNguPhanNhom,
  rutThuatNguSen,
  taoBanGhiAnhEm,
} from './tach-68.mjs';
import { napLuatCong } from './cong.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

let dat = 0;
let hong = 0;
function kiem(ten, ok, chiTiet = '') {
  if (ok) {
    dat += 1;
    console.log(`PASS ${ten}`);
  } else {
    hong += 1;
    const msg = typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet).slice(0, 400);
    console.log(`FAIL ${ten}${msg ? ` — ${msg}` : ''}`);
  }
}

// 1. Hàm xử lý chuỗi và thuật ngữ cơ bản
kiem('boGachTen bỏ gạch đầu dòng và dấu hai chấm cuối', boGachTen('- - - Dạng lá:') === 'Dạng lá');
kiem('laLoaiKhac nhận đúng "- - - Loại khác" và từ chối "Loại khác, đã gia công bề mặt"', laLoaiKhac('- - - Loại khác') && !laLoaiKhac('- - - - Loại khác, đã gia công bề mặt'));
kiem('laCauViDuSen chặn câu ví dụ UltraTouch và câu "Chúng có thể ở dạng"', laCauViDuSen('Tấm UltraTouch kích thước 48 in. x 24 ft.') && laCauViDuSen('Chúng có thể ở dạng lá có độ dày từ 0,175 mm'));
kiem('catDinhNghiaSen tách bỏ tiêu đề IN HOA đầu câu SEN', catDinhNghiaSen('7616.99.20 NHÔM BỊT ĐẦU ỐNG Một vòng kim loại nhôm giữ miếng tẩy trên bút chì. (Nguồn: Phi-líp-pin)') === 'Một vòng kim loại nhôm giữ miếng tẩy trên bút chì.');
kiem('rutThuatNguPhanNhom rút đúng "chưa gia công thêm" cho 7607.11', rutThuatNguPhanNhom('- - Đã được cán nhưng chưa gia công thêm', '') === 'chưa gia công thêm');
kiem('rutThuatNguSen rút đúng "lon nhôm" từ mẫu Thuật ngữ "..."', rutThuatNguSen('Thuật ngữ "lon nhôm" dùng để chỉ thân lon.', 'Thuật ngữ "lon nhôm" dùng để chỉ thân lon.', 'Thuật ngữ "lon nhôm" dùng để chỉ thân lon.') === 'lon nhôm');

// 2. Ca ngược: anh em trùng tên không có câu luật tách → ghi VENH, không tự bịa
const bgVenh = taoBanGhiAnhEm({
  nut: 'bieu:76999910',
  ten: '- - Sản phẩm mẫu',
  cauId: 'bieu:76999910#1',
  chuCau: '- - Sản phẩm mẫu',
  lop: 'LUAT',
  nguon: 'Biểu thuế thử',
  anhEm: ['bieu:76999920'],
  tenAnhEmTheoId: new Map([['bieu:76999920', '- - Sản phẩm mẫu']]),
});
kiem('ca ngược TRUNG_TEN_ANH_EM: tự động đánh dấu trangThai=VENH, không bịa điểm tách', bgVenh.trangThai === 'VENH' && kiemBanGhiKhuonMoi(bgVenh).length === 0, bgVenh);

// 3. Chạy trên kho thật Chương 76 — gom đúng 2 tệp (phan-nhom/76.jsonl và dong/76.jsonl)
const L = napLuatCong(G.LUAT_MAC_DINH);
const kq76 = dungHoSoChuong68('76', { L });
const cacTep76 = [...kq76.theoTep.keys()].sort();
kiem('gom đúng 2 tệp theo chương: dong/76.jsonl và phan-nhom/76.jsonl', cacTep76.length === 2 && cacTep76[0] === 'dong/76.jsonl' && cacTep76[1] === 'phan-nhom/76.jsonl', cacTep76);
kiem('Chương 76 sinh > 100 bản ghi phân nhóm/dòng và 0 bản VENH', kq76.thongKe.tongBanGhi > 100 && kq76.thongKe.venh === 0, kq76.thongKe);
kiem('Chương 76 phủ đủ 10/10 dòng SEN (sen:76*) đều là DINH_NGHIA có thuatNgu', kq76.thongKe.senVanDe === 10, kq76.thongKe);

// Chú giải phân nhóm 7607.11: đúng 1 DINH_NGHIA thuatNgu="chưa gia công thêm", không tách 5 PHAI_LA
const tatCa = [...kq76.theoTep.values()].flat();
const banPn760711 = tatCa.filter((r) => r.cau && r.cau.startsWith('pn:760711:ct:1'));
kiem(
  'chú giải phân nhóm 7607.11 gộp thành ĐÚNG 1 DINH_NGHIA thuatNgu="chưa gia công thêm", trích đủ câu dẫn và (1)–(4)',
  banPn760711.length === 1
    && banPn760711[0].loai === 'DINH_NGHIA'
    && banPn760711[0].thuatNgu === 'chưa gia công thêm'
    && /\(1\).*\(2\).*\(3\).*\(4\)/.test(banPn760711[0].trich),
  banPn760711
);
kiem('không còn PHAI_LA tách lẻ từ chú giải phân nhóm 7607.11', tatCa.every((r) => !(r.loai === 'PHAI_LA' && /^pn:760711/.test(r.cau || ''))));

// Kiểm sạch dữ liệu nguồn & khuôn #1981
kiem('không chứa bất kỳ câu tb: hay wco: nào', tatCa.every((r) => !/^(?:tb|wco):/.test(r.cau)));
kiem('không chép lại loại NGUONG (M-74) hay CHI_LIET_KE (M-75)', tatCa.every((r) => r.loai !== 'NGUONG' && r.loai !== 'CHI_LIET_KE'));
kiem('không lọt thông số ví dụ UltraTouch/0,175 mm vào hồ sơ M-76', tatCa.every((r) => !/16,35|UltraTouch|0,175/.test(JSON.stringify(r))));
kiem('mọi bản ghi đạt khuôn ho-so-ma@1 (#1981: phuDinh + thuatNgu) với 0 lỗi', tatCa.every((r) => kiemBanGhiKhuonMoi(r).length === 0));
kiem('mọi DINH_NGHIA (11/11) đều có trường thuatNgu không rỗng', tatCa.filter((r) => r.loai === 'DINH_NGHIA').every((r) => typeof r.thuatNgu === 'string' && r.thuatNgu.trim().length > 0));
kiem('mọi dòng Loại khác (31/31) có mảng phuDinh đầy đủ, giữ voi, và không ghi phuDinh tạm vào ghiChu', kiemPhuDinhChuong(kq76.theoTep, L).length === 0 && tatCa.every((r) => !/^phuDinh:/.test(r.ghiChu || '')), kiemPhuDinhChuong(kq76.theoTep, L));

// 4. Ca ngược: bỏ sót anh em trong phuDinh bị kiemPhuDinhChuong bắt ngay
const tamMap = new Map([['dong/76.jsonl', [{
  nut: 'bieu:76041090',
  id: 'hs:bieu:76041090:7601',
  loai: 'TACH_ANH_EM',
  phuDinh: ['bieu:76041090'],
}]]]);
const loiGia = kiemPhuDinhChuong(tamMap, L);
kiem('ca ngược PHU_DINH_THIEU: bắt ngay khi tự phủ định mình hoặc thiếu anh em có tên', loiGia.length >= 2, loiGia);

// 5. Ca ngược: DINH_NGHIA thiếu thuatNgu bị khuôn mới bắt ngay
const dinhNghiaThieu = { ...banPn760711[0] };
delete dinhNghiaThieu.thuatNgu;
kiem('ca ngược DINH_NGHIA_THIEU_THUAT_NGU: khuôn mới bắt đỏ khi thiếu thuatNgu', kiemBanGhiKhuonMoi(dinhNghiaThieu).some((e) => e.includes('thuatNgu')));

// 6. Kiểm trích dẫn, nguồn, lớp, thuật ngữ và vân tay sha256 toàn Chương 76 + ca ngược vân tay lệch
const loiTV = kiemTrichVaVanTay(kq76.theoTep, L);
kiem('kiểm trích dẫn + nguồn + lớp + dữ kiện + thuatNgu + vân tay sha256 toàn Chương 76 đạt 0 lỗi', loiTV.length === 0, loiTV.slice(0, 5));

const banVanLech = new Map([['dong/76.jsonl', [{ ...kq76.theoTep.get('dong/76.jsonl')[0], van: '0'.repeat(64) }]]]);
kiem('ca ngược VAN_TAY_LECH: bắt ngay khi sha256 câu luật bị lệch', kiemTrichVaVanTay(banVanLech, L).some((e) => e.includes('vân tay')));

// 7. Ghi thử ra thư mục tạm: xác nhận đúng 2 tệp trên đĩa, mỗi dòng đều là JSON hợp lệ, phủ 35 phân nhóm 6 số + 6 tiêu đề 7 số + 74 dòng 8 số
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm76-test-'));
try {
  const daGhi = ghiHoSo(kq76.theoTep, tmpDir);
  const pnLines = fs.readFileSync(path.join(tmpDir, 'phan-nhom', '76.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const dongLines = fs.readFileSync(path.join(tmpDir, 'dong', '76.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const pnNuts = new Set(pnLines.map((r) => r.nut));
  const dongNuts = new Set(dongLines.map((r) => r.nut));
  kiem(
    'ghi ra đĩa đúng 2 tệp (phan-nhom/76.jsonl phủ 41 nút 6–7 số; dong/76.jsonl phủ đủ 74 nút 8 số)',
    daGhi.length === 2 && pnNuts.size === 41 && dongNuts.size === 74,
    { daGhi, pnNuts: pnNuts.size, dongNuts: dongNuts.size }
  );

  // Kiểm phủ chia hết anh em (mọi cặp anh em cùng cấp trong 6→7→8 đều được tách qua voi/phuDinh)
  const theoNut = new Map();
  for (const r of [...pnLines, ...dongLines]) {
    if (!theoNut.has(r.nut)) theoNut.set(r.nut, []);
    theoNut.get(r.nut).push(r);
  }
  const phanNhom76 = [...L.cay.theoId.keys()].filter((id) => /^bieu:76\d{4}$/.test(id)).sort();
  let thieuTach = 0;
  for (const pn of phanNhom76) {
    const con = G.conCua(pn, L.cay);
    if (con.length < 2) continue;
    for (let i = 0; i < con.length; i += 1) {
      for (let j = i + 1; j < con.length; j += 1) {
        const A = con[i]; const B = con[j];
        const okA = (theoNut.get(A) || []).some((x) => (x.voi || []).includes(B) || (x.phuDinh || []).includes(B));
        const okB = (theoNut.get(B) || []).some((x) => (x.voi || []).includes(A) || (x.phuDinh || []).includes(A));
        if (!okA && !okB) thieuTach += 1;
      }
    }
  }
  kiem(`mọi cặp anh em dưới ${phanNhom76.length}/${phanNhom76.length} phân nhóm 6 số đều có tách (voi/phuDinh)`, thieuTach === 0, { thieuTach });
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\nTổng kết M-76: ${dat} xanh, ${hong} đỏ.`);
process.exit(hong === 0 ? 0 : 1);
