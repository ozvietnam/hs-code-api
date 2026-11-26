#!/usr/bin/env node
// scripts/ho-so-ma/tach-68-test.mjs — M-76 (#1968): bài kiểm chung tự quét mọi chương có tệp trong
// data/ho-so-ma/phan-nhom/ và data/ho-so-ma/dong/ (giống nguong-test.mjs), cộng ca đơn vị và ca ngược.
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
  rutThuatNguTuNut,
  taoBanGhiAnhEm,
} from './tach-68.mjs';
import { chayCong, napLuatCong } from './cong.mjs';
import { kiemBanGhi, kiemKhoHoSo } from './khuon.mjs';

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

/** Tự quét mọi chương đã có tệp trong data/ho-so-ma/phan-nhom/ hoặc data/ho-so-ma/dong/. */
function quetChuongTrongKho(thuMucKho) {
  const chuongs = new Set();
  const theoChuong = new Map(); // cc -> Map<relPath, records[]>
  const saiTenTep = [];

  for (const thuMuc of ['phan-nhom', 'dong']) {
    const dir = path.join(thuMucKho, thuMuc);
    if (!fs.existsSync(dir)) continue;
    for (const tenTep of fs.readdirSync(dir).sort()) {
      if (!tenTep.endsWith('.jsonl')) continue;
      const m = /^(\d{2})(\d*)\.jsonl$/.exec(tenTep);
      if (!m) {
        saiTenTep.push(`${thuMuc}/${tenTep}`);
        continue;
      }
      const cc = m[1];
      chuongs.add(cc);
      if (!theoChuong.has(cc)) theoChuong.set(cc, new Map());
      const raw = fs.readFileSync(path.join(dir, tenTep), 'utf8').trim();
      const rows = raw ? raw.split('\n').map((l) => JSON.parse(l)) : [];
      theoChuong.get(cc).set(`${thuMuc}/${tenTep}`, rows);
    }
  }
  return { chuongs: [...chuongs].sort(), theoChuong, saiTenTep };
}

// 1. Hàm xử lý chuỗi & thuật ngữ cơ bản
kiem('boGachTen bỏ gạch đầu dòng và dấu hai chấm cuối', boGachTen('- - - Dạng lá:') === 'Dạng lá');
kiem('laLoaiKhac nhận đúng "- - - Loại khác" và từ chối "Loại khác, đã gia công bề mặt"', laLoaiKhac('- - - Loại khác') && !laLoaiKhac('- - - - Loại khác, đã gia công bề mặt'));
kiem('laCauViDuSen chặn câu ví dụ UltraTouch và câu "Chúng có thể ở dạng"', laCauViDuSen('Tấm UltraTouch kích thước 48 in. x 24 ft.') && laCauViDuSen('Chúng có thể ở dạng lá có độ dày từ 0,175 mm'));
kiem('catDinhNghiaSen tách bỏ tiêu đề IN HOA đầu câu SEN', catDinhNghiaSen('7616.99.20 NHÔM BỊT ĐẦU ỐNG Một vòng kim loại nhôm giữ miếng tẩy trên bút chì. (Nguồn: Phi-líp-pin)') === 'Một vòng kim loại nhôm giữ miếng tẩy trên bút chì.');
kiem('rutThuatNguTuNut rút đúng "lon nhôm" từ mẫu Thuật ngữ "..."', rutThuatNguTuNut('Thuật ngữ "lon nhôm" dùng để chỉ thân lon.', 'Thuật ngữ "lon nhôm" dùng để chỉ thân lon.', 'Thuật ngữ "lon nhôm" dùng để chỉ thân lon.') === 'lon nhôm');

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

// 3. Quét kho thật trên đĩa (tự động phủ Chương 76 và mọi chương M-76 mới thêm ở bước 1)
const L = napLuatCong(G.LUAT_MAC_DINH);
const { chuongs, theoChuong, saiTenTep } = quetChuongTrongKho(G.HO_SO_MAC_DINH);
kiem('không có tên tệp sai quy ước trong phan-nhom/ và dong/', saiTenTep.length === 0, saiTenTep);
kiem('kho thật đã có Chương 76 trong phan-nhom/ và dong/', chuongs.includes('76'), chuongs);

// Kiểm khuôn chung toàn kho 1 lần (khuon.mjs)
const kKho = kiemKhoHoSo(G.HO_SO_MAC_DINH);
kiem(`khuon.mjs toàn kho đạt 0 lỗi (${kKho.banGhi.length} bản ghi, ${kKho.soTep} tệp)`, kKho.loi.length === 0, kKho.loi.slice(0, 5));

for (const cc of chuongs) {
  const theoTep = theoChuong.get(cc);
  const tatCa = [...theoTep.values()].flat();

  // Quy ước mỗi mã 1 tệp theo lib/ho-so-ma/ghep.js
  const loiTep = [];
  for (const [relPath, ds] of theoTep.entries()) {
    for (const r of ds) {
      const thuMucDung = G.thuMucCuaNut(r.nut);
      const khoaDung = G.tepCuaNut(r.nut, thuMucDung);
      const duongDung = `${thuMucDung}/${khoaDung}.jsonl`;
      if (relPath !== duongDung) loiTep.push(`${r.id} ở ${relPath} nhưng phải ở ${duongDung}`);
    }
  }
  kiem(`Chương ${cc}: đúng quy ước mỗi mã 1 tệp (${theoTep.size} tệp, ${tatCa.length} bản ghi)`, loiTep.length === 0, loiTep.slice(0, 5));

  // Cổng 4 TRÍCH + Cổng 5 VÂN TAY (chính cong.mjs trên kho thật)
  const c45 = chayCong({ luat: G.LUAT_MAC_DINH, hoSo: G.HO_SO_MAC_DINH, phamVi: [cc], chiTrong: true, cong: [4, 5], L });
  kiem(`Chương ${cc}: cong.mjs Cổng 4 TRÍCH đạt 0 lỗi`, c45.cong[4].loi.length === 0, c45.cong[4].loi.slice(0, 5));
  kiem(`Chương ${cc}: cong.mjs Cổng 5 VÂN TAY đạt 0 lỗi`, c45.cong[5].loi.length === 0, c45.cong[5].loi.slice(0, 5));

  // Phủ định Loại khác + thuatNgu DINH_NGHIA + sạch nguồn
  const loiPd = kiemPhuDinhChuong(theoTep, L);
  kiem(`Chương ${cc}: mọi dòng Loại khác có phuDinh đầy đủ và sạch ghiChu`, loiPd.length === 0 && tatCa.every((r) => !/^phuDinh:/.test(r.ghiChu || '')), loiPd.slice(0, 5));

  const dns = tatCa.filter((r) => r.loai === 'DINH_NGHIA');
  kiem(`Chương ${cc}: mọi DINH_NGHIA (${dns.length}) đều có trường thuatNgu không rỗng`, dns.every((r) => typeof r.thuatNgu === 'string' && r.thuatNgu.trim().length > 0));
  kiem(`Chương ${cc}: không chứa tb:, wco:, NGUONG, CHI_LIET_KE hay thông số mẫu UltraTouch/0,175`, tatCa.every((r) => !/^(?:tb|wco):/.test(r.cau || '') && r.loai !== 'NGUONG' && r.loai !== 'CHI_LIET_KE' && !/16,35|UltraTouch|0,175/.test(JSON.stringify(r))));

  // Kiểm chia hết anh em cấp 6 → 7 → 8 (Cổng 3 trong phạm vi M-76)
  const theoNut = new Map();
  for (const r of tatCa) {
    if (!theoNut.has(r.nut)) theoNut.set(r.nut, []);
    theoNut.get(r.nut).push(r);
  }
  let thieuTach = 0;
  let soCha67 = 0;
  for (const n of L.cay.theoId.values()) {
    if (!n.id.startsWith(`bieu:${cc}`)) continue;
    const cap = G.capCuaNut(n.id);
    if (cap !== 'PHAN_NHOM' && cap !== 'TIEU_DE_7') continue;
    soCha67 += 1;
    const con = G.conCua(n.id, L.cay);
    for (let i = 0; i < con.length; i += 1) {
      for (let j = i + 1; j < con.length; j += 1) {
        const A = con[i];
        const B = con[j];
        const okA = (theoNut.get(A) || []).some((x) => (x.voi || []).includes(B) || (x.phuDinh || []).includes(B));
        const okB = (theoNut.get(B) || []).some((x) => (x.voi || []).includes(A) || (x.phuDinh || []).includes(A));
        if (!okA && !okB) thieuTach += 1;
      }
    }
  }
  kiem(`Chương ${cc}: mọi cặp anh em dưới ${soCha67} nút 6–7 số đều được tách (voi/phuDinh)`, thieuTach === 0, { thieuTach });
}

// 4. Kiểm chi tiết neo Chương 76 (SEN 10/10, chú giải phân nhóm 7607.11 gộp 1 DINH_NGHIA, ghep.hoSo)
const tatCa76 = [...(theoChuong.get('76')?.values() || [])].flat();
const banPn760711 = tatCa76.filter((r) => r.cau && r.cau.startsWith('pn:760711:ct:1'));
kiem(
  'Chương 76: chú giải phân nhóm 7607.11 gộp thành ĐÚNG 1 DINH_NGHIA có thuatNgu, không chẻ 5 PHAI_LA',
  banPn760711.length === 1
    && banPn760711[0].loai === 'DINH_NGHIA'
    && typeof banPn760711[0].thuatNgu === 'string'
    && banPn760711[0].thuatNgu.length > 0
    && tatCa76.every((r) => !(r.loai === 'PHAI_LA' && /^pn:760711/.test(r.cau || ''))),
  banPn760711
);
const sen76 = tatCa76.filter((r) => /^sen:76/.test(r.cau || ''));
kiem('Chương 76: phủ đủ 10/10 dòng SEN (sen:76*) đều là DINH_NGHIA', sen76.length === 10 && sen76.every((r) => r.loai === 'DINH_NGHIA'), sen76.length);

const hs76061232 = G.hoSo('7606.12.32');
const vanDe76061232 = (hs76061232.duong || []).flatMap((t) => t.vanDe || []);
kiem(
  'ghep.hoSo("7606.12.32") nạp đủ bản ghi phân nhóm/dòng (TACH_ANH_EM + SEN DINH_NGHIA) theo khuôn M-71',
  vanDe76061232.some((v) => v.nut === 'bieu:760612' && v.loai === 'TACH_ANH_EM')
    && vanDe76061232.some((v) => v.nut === 'bieu:7606123' && v.loai === 'TACH_ANH_EM')
    && vanDe76061232.some((v) => v.nut === 'bieu:76061232' && v.loai === 'DINH_NGHIA' && v.thuatNgu === 'lon nhôm'),
  vanDe76061232.map((v) => `${v.nut}:${v.loai}`)
);

// 5. Các ca ngược bắt buộc: PHU_DINH_THIEU, DINH_NGHIA_THIEU_THUAT_NGU, VAN_TAY_LECH
const tamMap = new Map([['dong/76041090.jsonl', [{
  nut: 'bieu:76041090',
  id: 'hs:bieu:76041090:7601',
  loai: 'TACH_ANH_EM',
  phuDinh: ['bieu:76041090'],
}]]]);
const loiGia = kiemPhuDinhChuong(tamMap, L);
kiem('ca ngược PHU_DINH_THIEU: bắt ngay khi tự phủ định mình hoặc thiếu anh em có tên', loiGia.length >= 2, loiGia);

const dinhNghiaThieu = { ...banPn760711[0] };
delete dinhNghiaThieu.thuatNgu;
kiem('ca ngược DINH_NGHIA_THIEU_THUAT_NGU: khuon.mjs bắt đỏ khi thiếu thuatNgu', kiemBanGhi(dinhNghiaThieu).some((e) => e.includes('thuatNgu')));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm76-test-'));
try {
  const kq76 = dungHoSoChuong68('76', { L });
  const daGhi = ghiHoSo(kq76.theoTep, tmpDir);
  kiem('dungHoSoChuong68 + ghiHoSo ghi ra đúng 109 tệp cho Chương 76', daGhi.length === 109, daGhi.length);
  // Làm lệch 1 vân tay để xác nhận Cổng 5 bắt ngay
  const tepMau = path.join(tmpDir, 'dong', '76011000.jsonl');
  const dongMau = JSON.parse(fs.readFileSync(tepMau, 'utf8').trim().split('\n')[0]);
  dongMau.van = '0'.repeat(64);
  fs.writeFileSync(tepMau, `${JSON.stringify(dongMau)}\n`, 'utf8');
  const c5Lech = chayCong({ luat: G.LUAT_MAC_DINH, hoSo: tmpDir, phamVi: ['76011000'], chiTrong: true, cong: [5], L });
  kiem('ca ngược VAN_TAY_LECH: cong.mjs Cổng 5 bắt ngay khi sha256 câu luật bị lệch', c5Lech.cong[5].loi.length > 0, c5Lech.cong[5].loi);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log(`\nTổng kết M-76 (${chuongs.length} chương: ${chuongs.join(', ')}): ${dat} xanh, ${hong} đỏ.`);
process.exit(hong === 0 ? 0 : 1);
