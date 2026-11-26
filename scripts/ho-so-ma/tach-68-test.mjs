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
  kiemPhuDinhChuong,
  laCauViDuSen,
  laLoaiKhac,
  taoBanGhiAnhEm,
} from './tach-68.mjs';
import { chayCong, napLuatCong } from './cong.mjs';
import { kiemBanGhi } from './khuon.mjs';

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

// 1. Hàm xử lý chuỗi cơ bản
kiem('boGachTen bỏ gạch đầu dòng và dấu hai chấm cuối', boGachTen('- - - Dạng lá:') === 'Dạng lá');
kiem('laLoaiKhac nhận đúng "- - - Loại khác" và từ chối "Loại khác, đã gia công bề mặt"', laLoaiKhac('- - - Loại khác') && !laLoaiKhac('- - - - Loại khác, đã gia công bề mặt'));
kiem('laCauViDuSen chặn câu ví dụ UltraTouch và câu "Chúng có thể ở dạng"', laCauViDuSen('Tấm UltraTouch kích thước 48 in. x 24 ft.') && laCauViDuSen('Chúng có thể ở dạng lá có độ dày từ 0,175 mm'));
kiem('catDinhNghiaSen tách bỏ tiêu đề IN HOA đầu câu SEN', catDinhNghiaSen('7616.99.20 NHÔM BỊT ĐẦU ỐNG Một vòng kim loại nhôm giữ miếng tẩy trên bút chì. (Nguồn: Phi-líp-pin)') === 'Một vòng kim loại nhôm giữ miếng tẩy trên bút chì.');

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
kiem('ca ngược TRUNG_TEN_ANH_EM: tự động đánh dấu trangThai=VENH, không bịa điểm tách', bgVenh.trangThai === 'VENH' && kiemBanGhi(bgVenh).length === 0, bgVenh);

// 3. Chạy trên kho thật Chương 76
const L = napLuatCong(G.LUAT_MAC_DINH);
const kq76 = dungHoSoChuong68('76', { L });
kiem('Chương 76 sinh > 100 bản ghi phân nhóm/dòng và 0 bản VENH', kq76.thongKe.tongBanGhi > 100 && kq76.thongKe.venh === 0, kq76.thongKe);
kiem('Chương 76 phủ đủ 10/10 dòng SEN (sen:76*)', kq76.thongKe.senVanDe === 10, kq76.thongKe);
kiem('Chương 76 có vấn đề từ chú giải phân nhóm pn:760711:ct:1', kq76.thongKe.phanNhomCtVanDe >= 4, kq76.thongKe);

// Không lọt tiền lệ, WCO, hay thông số sản phẩm ví dụ trong SEN
const tatCa = [...kq76.theoTep.values()].flat();
kiem('không chứa bất kỳ câu tb: hay wco: nào', tatCa.every((r) => !/^(?:tb|wco):/.test(r.cau)));
kiem('không chép lại loại NGUONG (M-74) hay CHI_LIET_KE (M-75)', tatCa.every((r) => r.loai !== 'NGUONG' && r.loai !== 'CHI_LIET_KE'));
kiem('không lọt thông số ví dụ UltraTouch/0,175 mm vào hồ sơ M-76', tatCa.every((r) => !/16,35|UltraTouch|0,175/.test(JSON.stringify(r))));
kiem('mọi bản ghi đạt khuôn ho-so-ma@1 (0 lỗi)', tatCa.every((r) => kiemBanGhi(r).length === 0));
kiem('mọi dòng Loại khác có phuDinh đầy đủ và không tự phủ định mình', kiemPhuDinhChuong(kq76.theoTep, L).length === 0, kiemPhuDinhChuong(kq76.theoTep, L));

// 4. Ca ngược: bỏ sót anh em trong phuDinh bị kiemPhuDinhChuong bắt ngay
const tamMap = new Map([['dong/76041090.jsonl', [{
  nut: 'bieu:76041090',
  id: 'hs:bieu:76041090:7601',
  loai: 'TACH_ANH_EM',
  ghiChu: 'phuDinh: bieu:76041090',
}]]]);
const loiGia = kiemPhuDinhChuong(tamMap, L);
kiem('ca ngược PHU_DINH_THIEU: bắt ngay khi tự phủ định mình hoặc thiếu anh em có tên', loiGia.length >= 2, loiGia);

// 5. Ghi vào kho tạm (gộp cùng nguong/76.jsonl trên main) và chạy cổng 1, 3, 4, 5 thật của cong.mjs
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm76-test-'));
try {
  // Sao chép nguong/76.jsonl đang có trên main để kiểm chứng tương thích M-74 + M-76 (không chồng dải, không đụng ID)
  const nguongSrc = path.join(G.HO_SO_MAC_DINH, 'nguong', '76.jsonl');
  if (fs.existsSync(nguongSrc)) {
    fs.mkdirSync(path.join(tmpDir, 'nguong'), { recursive: true });
    fs.copyFileSync(nguongSrc, path.join(tmpDir, 'nguong', '76.jsonl'));
  }
  ghiHoSo(kq76.theoTep, tmpDir);

  // Kiểm toàn Chương 76: khuôn + cổng 4 TRÍCH + cổng 5 VÂN TAY phải 0 lỗi
  const r45 = chayCong({ luat: G.LUAT_MAC_DINH, hoSo: tmpDir, phamVi: ['76'], chiTrong: true, cong: [4, 5], L });
  kiem('cổng khuôn + cổng 4 TRÍCH + cổng 5 VÂN TAY toàn Chương 76 đạt 0 lỗi', r45.khuon.length === 0 && r45.cong[4].loi.length === 0 && r45.cong[5].loi.length === 0, {
    khuon: r45.khuon.slice(0, 5),
    c4: r45.cong[4].loi.slice(0, 5),
    c5: r45.cong[5].loi.slice(0, 5),
  });

  // Kiểm cổng 1 ĐỦ + cổng 3 ANH EM cho MỌI phân nhóm 6 số trong Chương 76 (cấp 6→7→8)
  const phanNhom76 = [...L.cay.theoId.keys()].filter((id) => /^bieu:76\d{4}$/.test(id)).sort();
  let loiPn1 = [];
  let loiPn3 = [];
  for (const pn of phanNhom76) {
    const r = chayCong({ luat: G.LUAT_MAC_DINH, hoSo: tmpDir, phamVi: [pn], chiTrong: true, cong: [1, 3, 4, 5], L });
    loiPn1.push(...r.cong[1].loi);
    loiPn3.push(...r.cong[3].loi);
  }
  kiem(`cổng 1 ĐỦ xanh trên cả ${phanNhom76.length}/${phanNhom76.length} phân nhóm 6 số (và toàn bộ dòng 8 số bên dưới)`, loiPn1.length === 0, loiPn1.slice(0, 5));
  kiem(`cổng 3 ANH EM xanh (chia hết, không chồng) trên cả ${phanNhom76.length}/${phanNhom76.length} phân nhóm 6 số`, loiPn3.length === 0, loiPn3.slice(0, 5));

  // Kiểm cổng 3 ANH EM ở cấp 4→6 cho 14/16 nhóm 4 số (trừ 2 cặp thuần tiêu đề 5 số 76051/76052 và 76061/76069 chờ [M-01])
  const nhom4CoTep = ['7601', '7602', '7603', '7604', '7607', '7608', '7609', '7610', '7611', '7612', '7613', '7614', '7615', '7616'];
  const loiNhom3 = [];
  for (const n4 of nhom4CoTep) {
    const r = chayCong({ luat: G.LUAT_MAC_DINH, hoSo: tmpDir, phamVi: [n4], chiTrong: true, cong: [3], L });
    loiNhom3.push(...r.cong[3].loi);
  }
  kiem('cổng 3 ANH EM xanh ở cấp 4→6→8 cho 14/16 nhóm 4 số (2 cặp thuần tiêu đề 5 số 7605/7606 chờ M-01)', loiNhom3.length === 0, loiNhom3.slice(0, 5));

  // Ca ngược cổng 5: sửa lệch 1 ký tự vân tay trong một tệp → cong.mjs phải bắt đỏ cổng 5
  const tepMau = path.join(tmpDir, 'dong', '76042110.jsonl');
  const dongGoc = fs.readFileSync(tepMau, 'utf8').trim().split('\n');
  const banHong = JSON.parse(dongGoc[0]);
  banHong.van = '0'.repeat(64);
  fs.writeFileSync(tepMau, `${[JSON.stringify(banHong), ...dongGoc.slice(1)].join('\n')}\n`, 'utf8');
  const rHong = chayCong({ luat: G.LUAT_MAC_DINH, hoSo: tmpDir, phamVi: ['76042110'], chiTrong: true, cong: [5], L });
  kiem('ca ngược VAN_TAY_LECH: cổng 5 bắt ngay khi sha256 câu luật bị lệch', rHong.cong[5].loi.length === 1, rHong.cong[5].loi);

  // Kiểm máy ghép G.hoSo('7606.12.32') đọc được dữ liệu vừa ghi
  const hs = G.hoSo('7606.12.32', { luat: G.LUAT_MAC_DINH, hoSo: tmpDir });
  const capDong = hs.duong.find((c) => c.nut === 'bieu:76061232');
  kiem('máy ghép ghep.hoSo("7606.12.32") đọc được cả TACH_ANH_EM và DINH_NGHIA SEN', Boolean(capDong && capDong.vanDe.some((v) => v.loai === 'TACH_ANH_EM') && capDong.vanDe.some((v) => v.cau.startsWith('sen:'))), capDong);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\nTổng kết M-76: ${dat} xanh, ${hong} đỏ.`);
process.exit(hong === 0 ? 0 : 1);
