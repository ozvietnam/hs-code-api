#!/usr/bin/env node
// scripts/test-dan-chieu.mjs — M-32: kiểm thử ngữ pháp dẫn chiếu, ca ngược, hai chiều, đích không tồn tại & quét kho thật.
// Chạy ngoại tuyến trên CI (không cần LUAT_GOC_TXT hay 6 kho JSONL trên đĩa):
//   node scripts/test-dan-chieu.mjs
// Chạy kiểm vét cạn & báo cáo trên 6 kho lớp 1 + .nhom tạm:
//   node scripts/test-dan-chieu.mjs --thu-muc /tmp/luat-goc-m32 --nhom-tam data/chu-giai-heading.json --bao-cao
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  taoKhoNut,
  rutDanChieuCau,
  dungDoThiDanChieu,
  docKhoLuatGoc,
} = require('../lib/do-thi/dan-chieu.js');

let passed = 0;
let failed = 0;
function check(ten, dk, chiTiet = '') {
  if (dk) {
    console.log(`PASS ${ten}`);
    passed += 1;
  } else {
    console.log(`FAIL ${ten}${chiTiet ? `: ${chiTiet}` : ''}`);
    failed += 1;
  }
}

const danhSachMau = [
  { id: 'phan:I', loai: 'TEN', nguyenVan: 'PHẦN I: ĐỘNG VẬT SỐNG' },
  { id: 'phan:II', loai: 'TEN', nguyenVan: 'PHẦN II: THỰC VẬT' },
  { id: 'phan:VI', loai: 'TEN', nguyenVan: 'PHẦN VI: HÓA CHẤT' },
  { id: 'phan:VI:cg:1', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 1' },
  { id: 'phan:VI:cg:2', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 2' },
  { id: 'phan:XI', loai: 'TEN', nguyenVan: 'PHẦN XI: DỆT MAY' },
  { id: 'phan:XV', loai: 'TEN', nguyenVan: 'PHẦN XV: KIM LOẠI CƠ BẢN' },
  { id: 'phan:XV:cg:1:g', loai: 'CHU_GIAI', nguyenVan: '(g) Phụ tùng Phần XVII' },
  { id: 'phan:XVI', loai: 'TEN', nguyenVan: 'PHẦN XVI: MÁY MÓC' },
  { id: 'phan:XVI:cg:2', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 2 Phần XVI' },
  { id: 'phan:XVI:cg:2:b', loai: 'CHU_GIAI', nguyenVan: '(b) Bộ phận khác' },
  { id: 'phan:XVI:cg:3', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 3 Phần XVI' },
  { id: 'phan:XVII:cg:3', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 3 Phần XVII' },
  { id: 'gir:1', loai: 'QUY_TAC', nguyenVan: 'Quy tắc 1' },
  { id: 'gir:2', loai: 'QUY_TAC', nguyenVan: 'Quy tắc 2' },
  { id: 'gir:3', loai: 'QUY_TAC', nguyenVan: 'Quy tắc 3' },
  { id: 'gir:3:a', loai: 'QUY_TAC', nguyenVan: '3(a)' },
  { id: 'gir:3:b', loai: 'QUY_TAC', nguyenVan: '3(b)' },
  { id: 'gir:4', loai: 'QUY_TAC', nguyenVan: 'Quy tắc 4' },
  { id: 'gir:5', loai: 'QUY_TAC', nguyenVan: 'Quy tắc 5' },
  { id: 'gir:6', loai: 'QUY_TAC', nguyenVan: 'Quy tắc 6' },
  { id: 'chuong:28', loai: 'TEN', nguyenVan: 'Chương 28' },
  { id: 'chuong:28:pc:II', loai: 'TEN', nguyenVan: 'PHÂN CHƯƠNG II: AXIT VÔ CƠ' },
  { id: 'chuong:39', loai: 'TEN', nguyenVan: 'Chương 39' },
  { id: 'chuong:39:cg:1', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 1 Chương 39' },
  { id: 'chuong:39:cg:1:a', loai: 'CHU_GIAI', nguyenVan: '(a)' },
  { id: 'chuong:39:cg:1:b', loai: 'CHU_GIAI', nguyenVan: '(b)' },
  { id: 'chuong:71', loai: 'TEN', nguyenVan: 'Chương 71' },
  { id: 'chuong:71:cgpn:2', loai: 'CHU_GIAI_PHAN_NHOM', nguyenVan: 'CGPN 2 Ch.71' },
  { id: 'chuong:84', loai: 'TEN', nguyenVan: 'Chương 84' },
  { id: 'chuong:84:cg:1', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 1 Ch.84' },
  { id: 'chuong:84:cg:1:f', loai: 'CHU_GIAI', nguyenVan: '(f)' },
  { id: 'chuong:84:cgpn:1', loai: 'CHU_GIAI_PHAN_NHOM', nguyenVan: 'CGPN 1 Ch.84' },
  { id: 'chuong:85', loai: 'TEN', nguyenVan: 'Chương 85' },
  { id: 'chuong:97', loai: 'TEN', nguyenVan: 'Chương 97' },
  { id: 'chuong:97:cg:5:B', loai: 'CHU_GIAI', nguyenVan: 'Chú giải 5(B) Ch.97' },
  // Bieu mẫu (01.07 cố ý khuyết để kiểm mở rộng khoảng không bịa mã đã xoá; 84.69 cố ý khuyết)
  { id: 'bieu:0106', loai: 'TEN', nguyenVan: 'Động vật sống khác' },
  { id: 'bieu:0108', loai: 'TEN', nguyenVan: 'Nút mẫu 0108' },
  { id: 'bieu:0109', loai: 'TEN', nguyenVan: 'Nút mẫu 0109' },
  { id: 'bieu:7214', loai: 'TEN', nguyenVan: 'Sắt thép thanh' },
  { id: 'bieu:7317', loai: 'TEN', nguyenVan: 'Đinh vít' },
  { id: 'bieu:7318', loai: 'TEN', nguyenVan: 'Bu lông' },
  { id: 'bieu:8468', loai: 'TEN', nguyenVan: 'Máy hàn' },
  { id: 'bieu:8470', loai: 'TEN', nguyenVan: 'Máy tính' },
  { id: 'bieu:8471', loai: 'TEN', nguyenVan: 'Máy xử lý dữ liệu tự động' },
  { id: 'bieu:847130', loai: 'TEN', nguyenVan: 'Xách tay dưới 10 kg' },
  { id: 'bieu:847141', loai: 'TEN', nguyenVan: 'Loại khác gồm CPU' },
  { id: 'bieu:85235111', loai: 'TEN', nguyenVan: 'Thẻ nhớ' },
  { id: 'bieu:85235115', loai: 'TEN', nguyenVan: 'Thẻ nhớ mẫu 15' },
  { id: 'bieu:85235120', loai: 'TEN', nguyenVan: 'Thẻ nhớ mẫu 20' },
  { id: 'nhom:7317:ct:1', loai: 'CHU_GIAI_CHI_TIET', nguyenVan: 'Không bao gồm bu lông nhóm 73.18 hoặc máy Chương 84 theo Chú giải 2(b) Phần XVI.' },
];
const khoMau = taoKhoNut(danhSachMau);

// 1. Ca thuận cho mọi dạng ngữ pháp
{
  const r1 = rutDanChieuCau('Trừ các sản phẩm thuộc nhóm 73.17 và các nhóm từ 01.06 đến 01.09.', { id: 'chuong:84:cg:1#1', nutId: 'chuong:84:cg:1', khoNut: khoMau });
  const dens1 = r1.canh.map((e) => e.den).sort();
  check('ca đúng: nhóm đơn + khoảng nhóm không bịa mã khuyết 01.07', JSON.stringify(dens1) === JSON.stringify(['bieu:0106', 'bieu:0108', 'bieu:0109', 'bieu:7317']), JSON.stringify(dens1));

  const rLien = rutDanChieuCau('montelukast (INN) (nhóm73.17)).', { id: 'nhom:2937:ct:122#1', nutId: 'nhom:2937:ct:122', khoNut: khoMau });
  check('bản in viết liền "nhóm73.17" vẫn thành cạnh', rLien.canh.some((e) => e.den === 'bieu:7317'), JSON.stringify(rLien.canh));
  const rTa = rutDanChieuCau('On a vehicle of headings 73.17 to 73.18 see also.', { id: 'wco:870899:1#1', nutId: 'wco:870899:1', khoNut: khoMau });
  check('tiếng Anh "headings 73.17 to 73.18" thành cạnh hai đầu', rTa.canh.some((e) => e.den === 'bieu:7317') && (rTa.canh.some((e) => e.den === 'bieu:7318') || rTa.khongTonTai.some((e) => e.den === 'bieu:7318')), JSON.stringify(rTa));
  const r2 = rutDanChieuCau('Phân loại vào Chương 84 hoặc Phần XVI theo Quy tắc 3(b) và phân nhóm 8471.30.', { id: 'chuong:85:cg:1#1', nutId: 'chuong:85:cg:1', khoNut: khoMau });
  const dens2 = r2.canh.map((e) => e.den).sort();
  check('ca đúng: Chương + Phần + Quy tắc 3(b) + Phân nhóm 6 số', JSON.stringify(dens2) === JSON.stringify(['bieu:847130', 'chuong:84', 'gir:3:b', 'phan:XVI']), JSON.stringify(dens2));

  const r3 = rutDanChieuCau('Áp dụng Chú giải 2(b) Phần XVI, Chú giải 1(f) của Chương này và Chú giải phân nhóm 1 của Chương này.', { id: 'chuong:84:cg:2#1', nutId: 'chuong:84:cg:2', khoNut: khoMau });
  const dens3 = r3.canh.map((e) => e.den).sort();
  check('ca đúng: Chú giải Phần + Chương này + CGPN Chương này (không lặp cạnh Phần XVI)', JSON.stringify(dens3) === JSON.stringify(['chuong:84:cg:1:f', 'chuong:84:cgpn:1', 'phan:XVI:cg:2:b']), JSON.stringify(dens3));

  const r4 = rutDanChieuCau('Xem Chú giải 5 (B) Chương 97, Chú giải 1(a) và (b) của Chương 39, Chú giải 72.14, Phân Chương II Chương 28 và mã 8523.51.11.', { id: 'nhom:7317:ct:1#2', nutId: 'nhom:7317:ct:1', khoNut: khoMau });
  const dens4 = r4.canh.map((e) => e.den).sort();
  check('ca đúng: điểm hoa 5(B), danh sách (a) và (b), Chú giải 72.14, Phân Chương II, dòng 8 số', JSON.stringify(dens4) === JSON.stringify(['bieu:7214', 'bieu:85235111', 'chuong:28:pc:II', 'chuong:39:cg:1:a', 'chuong:39:cg:1:b', 'chuong:97:cg:5:B']), JSON.stringify(dens4));

  const r5 = rutDanChieuCau('Chú giải Phần 2 và các Quy tắc từ 1 đến 5 và Chú giải 1 Phần 6.', { id: 'phan:VI:kq:1#1', nutId: 'phan:VI:kq:1', khoNut: khoMau });
  const dens5 = r5.canh.map((e) => e.den).sort();
  check('ca đúng: Chú giải Phần 2 (nội bộ), Quy tắc 1..5, Chú giải 1 Phần 6 (số Ả Rập)', JSON.stringify(dens5) === JSON.stringify(['gir:1', 'gir:2', 'gir:3', 'gir:4', 'gir:5', 'phan:VI:cg:1', 'phan:VI:cg:2']), JSON.stringify(dens5));

  const r6 = rutDanChieuCau('Các phân nhóm từ 8471.30 đến 8471.41 gồm cả dòng mẫu.', { id: 'chuong:84:kq:1#1', nutId: 'chuong:84:kq:1', khoNut: khoMau });
  check('ca đúng: khoảng phân nhóm 6 số mở rộng trên bieu', JSON.stringify(r6.canh.map((e) => e.den).sort()) === JSON.stringify(['bieu:847130', 'bieu:847141']));

  const r7 = rutDanChieuCau('Phân nhóm 8523.51.11 đến .51.20.', { id: 'chuong:85:kq:1#1', nutId: 'chuong:85:kq:1', khoNut: khoMau });
  check('ca đúng: khoảng rút gọn 8 số .51.20 mở rộng đúng', JSON.stringify(r7.canh.map((e) => e.den).sort()) === JSON.stringify(['bieu:85235111', 'bieu:85235115', 'bieu:85235120']), JSON.stringify(r7.canh.map((e) => e.den)));
}

// 2. Ca ngược (số lượng, kích thước, năm, tiêu chuẩn, văn bản, từ tiếng Việt thông thường)
{
  const caNguoc = [
    ['kích thước / cân nặng / phần trăm', 'Chiều dài 12.50 mm, khối lượng 1.000 g, đường kính 73.17 cm, tỷ lệ 15.50% và 20.00 V.'],
    ['năm ban hành & số văn bản', 'Thông tư 31/2022/TT-BTC ngày 08/06/2022 có hiệu lực từ năm 1996 đến năm 2026.'],
    ['tiêu chuẩn kỹ thuật', 'Thử nghiệm theo ISO 1234.56 - Phần 2: Tỷ lệ, ASTM D1234.56, C.I. 7749.10 và TCVN 5678.90.'],
    ['chữ "phần" thường & "chương" thường', 'Phần mềm xử lý 2 phần lúa mì, chiếm phần lớn ở phần 1 của chương trình quy tắc chung trong nhóm 4 số.'],
    ['số thập phân hoá học / thông số', 'Hàm lượng 85.42% tính theo trọng lượng khô, áp suất 1200.50 kPa.'],
    ['công thức toán / phần xi lanh', 'Định lượng cơ bản (g/m2) x 28.22 – 186.2 (từ 13.23 – 94.64) trong dung tích phần xi lanh ±39.04%.'],
  ];
  for (const [ten, cau] of caNguoc) {
    const r = rutDanChieuCau(cau, { id: 'chuong:84:kq:9#1', nutId: 'chuong:84:kq:9', khoNut: khoMau });
    check(`CA NGƯỢC ${ten}`, r.canh.length === 0 && r.khongTonTai.length === 0, JSON.stringify({ canh: r.canh, thieu: r.khongTonTai }));
  }
  const r6Moi = rutDanChieuCau('Phân nhóm 27.14.10, nhóm 4811.70, Chú giải 1(g) cho Phần XV và Chú giải 3 cho Phần XVII, Chú giải 1(c) Chương 41 (xem Chương 41 và Chú giải 2(b) Chương đó), Chú giải 5(B)(ii) và (iii) của Chương 40 và Chương 29 (Phân chương I đến II).', { id: 'chuong:84:kq:9#2', nutId: 'chuong:84:kq:9', khoNut: khoMau });
  check('ca đúng mở rộng: 27.14.10, nhóm 4811.70, cho Phần XV, Chương đó, điểm 5(B)(iii), Phân chương trong ngoặc', JSON.stringify(r6Moi.canh.map((e) => e.den).sort()) === JSON.stringify(['phan:XV:cg:1:g', 'phan:XVII:cg:3']) && JSON.stringify(r6Moi.khongTonTai.map((x) => x.den).sort()) === JSON.stringify(['bieu:271410', 'bieu:481170', 'chuong:29:pc:I', 'chuong:29:pc:II', 'chuong:40:cg:5:B:ii', 'chuong:40:cg:5:B:iii', 'chuong:41', 'chuong:41:cg:1:c', 'chuong:41:cg:2:b']), JSON.stringify({ canh: r6Moi.canh.map((e) => e.den), thieu: r6Moi.khongTonTai.map((x) => x.den) }));

  const rQt = rutDanChieuCau('Các nhóm 12.01 đến 12.07 hay 85.01, 85.04, hoặc 85.26, từ 15.04 và từ 84.68 đến 84.71, nhóm 22.03 (bia), 22.04 (vang) và 22.05, nhóm thích hợp như 73.17, 73.18, NHÓM 71.06 đối với bạc và 71.08 đối với vàng, heading 38.23, (thuộc 85.18), 29.11, 29.14. 29.18 và 29.22, Chú giải Phân nhóm 1 của Chương 84 và chú giải 8b Phần XV.', { id: 'chuong:85:kq:2#1', nutId: 'chuong:85:kq:2', khoNut: khoMau });
  const rQtGot = new Set([...rQt.canh.map((e) => e.den), ...rQt.khongTonTai.map((x) => x.den)]);
  const rQtWant = ['bieu:1201', 'bieu:1207', 'bieu:8501', 'bieu:8504', 'bieu:8526', 'bieu:1504', 'bieu:8468', 'bieu:8470', 'bieu:8471', 'bieu:2203', 'bieu:2204', 'bieu:2205', 'bieu:7317', 'bieu:7318', 'bieu:7106', 'bieu:7108', 'bieu:3823', 'bieu:8518', 'bieu:2911', 'bieu:2914', 'bieu:2918', 'bieu:2922', 'chuong:84:cgpn:1', 'phan:XV:cg:8:b'];
  check('ca đúng mẫu QT: hay, phẩy+hoặc, xen chú thích (), từ..đến giữa dãy, heading, thuộc, đối với, dấu chấm hỏng, 8b Phần XV', rQtWant.every((k) => rQtGot.has(k)), JSON.stringify(rQtWant.filter((k) => !rQtGot.has(k))));

  const rNguoc = rutDanChieuCau('Chi tiết hoá ở nhóm 74.11 đến 71.18 và plastic (Chương\n\n39).', { id: 'nhom:7411:ct:1#1', nutId: 'nhom:7411:ct:1', khoNut: khoMau });
  check('ca đúng khoảng ngược 74.11 đến 71.18 + xuống dòng sau Chương: đủ cạnh tới 71.18, có nghiLoiIn và chuong:39', rNguoc.nghiLoiIn.length === 1 && rNguoc.khongTonTai.some((x) => x.den === 'bieu:7118' && x.nghiLoiIn) && rNguoc.canh.some((e) => e.den === 'chuong:39'), JSON.stringify({ loi: rNguoc.nghiLoiIn, thieu: rNguoc.khongTonTai, canh: rNguoc.canh }));
}

// 3. Đích không tồn tại & quy tắc đồ thị (hai chiều, không tự trỏ, không gán nghĩa, đọc M-31)
{
  const rThieu = rutDanChieuCau('Xem Chú giải 4(B) Chương 97 và nhóm 84.69 thuộc Chương 98.', { id: 'gir:3:ct:2#1', nutId: 'gir:3:ct:2', khoNut: khoMau });
  const idsThieu = rThieu.khongTonTai.map((x) => x.den).sort();
  check('đích không tồn tại được liệt kê riêng (4(B) Ch.97, nhóm 84.69 đã xoá, Ch.98)', JSON.stringify(idsThieu) === JSON.stringify(['bieu:8469', 'chuong:97:cg:4:B', 'chuong:98']), JSON.stringify(idsThieu));

  const nutMini = [
    ...danhSachMau,
    { id: 'bieu:8472', loai: 'TEN', nguyenVan: 'Máy văn phòng khác' },
  ];
  const cauMini = [
    { id: 'phan:I#1', tu: 0, den: nutMini[0].nguyenVan.length },
    { id: 'nhom:7317:ct:1#1', tu: 0, den: nutMini.find((n) => n.id === 'nhom:7317:ct:1').nguyenVan.length },
  ];
  const g = dungDoThiDanChieu({ nut: nutMini, cau: cauMini });
  check('hai chiều: tongRa === tongVao === soCanh', g.thongKe.khopHaiChieu && g.thongKe.soCanh === 3, JSON.stringify(g.thongKe));
  check('hai chiều: canhRa và canhVao trả đúng cạnh đối xứng', g.canhRa('nhom:7317:ct:1').length === 3 && g.canhVao('bieu:7318')[0].tu === 'nhom:7317:ct:1#1');
  check('không tự trỏ ở nút TEN (PHẦN I không trỏ phan:I)', g.canhVao('phan:I').length === 0);
  check('chỉ dùng nhãn cạnh NHAC, không gán nhãn nghĩa', g.canh.every((e) => e.loai === 'NHAC' && !e.quanHe && !e.nghia));
  check('không dùng hs-tree trong dan-chieu.js', !/require\([^)]*hs-tree/.test(fs.readFileSync(new URL('../lib/do-thi/dan-chieu.js', import.meta.url), 'utf8')));
}

// 4. Phép quét thô độc lập (KHÔNG dùng hàm của dan-chieu.js, đối chiếu trực tiếp cạnh + ghi lý do loại bỏ máy đọc được)
export function lyDoLoaiBoTho(nut, loai, raw, idx, len) {
  const v = nut.nguyenVan || '';
  const truoc = v.slice(Math.max(0, idx - 30), idx);
  const sau = v.slice(idx + len, idx + len + 25);
  if (loai === 'nhom') {
    if (/(?:±|[×x*÷=]\s*$|%\s*-?\s*$|:\s*±)/i.test(truoc) || /^\s*(?:[-–]\s*\d{2,3}\.\d|%|\s*(?:mmHg|mm|cm|dm|km|µm|nm|mg|kg|ml|g|l|m|kV|mA|Ah|Wh|kW|MW|W|V|kHz|MHz|GHz|Hz|kPa|MPa|GPa|Pa|bar|mbar|atm|psi|rpm|dB|mol|mmol|cal|kcal|kJ|ohm|dpi|cc|ppm|ppb)(?![\p{L}\p{N}_]))/iu.test(sau)) {
      return 'so_do_cong_thuc';
    }
    if (/^(?:ISO|CAS|C\.I\.?|TCVN|ASTM|IEC|DIN|JIS|AISI|SAE|EN)\s*[-–:/]?\s*$/iu.test(truoc)) {
      return 'tieu_de_chuan_ky_thuat';
    }
    if (nut.id.startsWith('sen:') && /(?:^|\n)\s*\d{2}\.\d{2}(?:\s*(?:[-–]\s*\d{2}\.\d{2}|\d{2}\.\d{2})+)?\s+[A-ZĐ“"]/u.test(v.slice(Math.max(0, idx - 35), idx + len + 35))) {
      return 'tieu_de_sen_nhieu_nhom';
    }
    if (nut.id.startsWith('nhom:')) {
      const cuaSo = v.slice(Math.max(0, idx - 35), idx + len + 35);
      const coDauViet = /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(cuaSo);
      if (!coDauViet && /[A-Za-z]{4,}/.test(cuaSo)) {
        return 'nhom_tam_phu_luc_anh_va_dinh_tieu_de';
      }
      if (/(?:^|\s)(?:\d{4}|\d{2}\.\d{2})\s+[-–]\s+[A-ZĐ]/u.test(v.slice(Math.max(0, idx - 10), idx + len + 45))) {
        return 'nhom_tam_dinh_dong_nhom_ke';
      }
    }
    if (/\bNhôm\s*$/u.test(truoc)) {
      return 'loi_ocr_tu_neo';
    }
  }
  if (loai === 'phan') {
    if (!/^(XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)$/.test(raw.split(/\s+/).pop())) {
      return 'tu_thong_thuong_khong_in_hoa';
    }
  }
  return null;
}

export function quetThoDocLap(doThi, { nut, khoNut }) {
  const coTheoNut = new Map();
  for (const e of doThi.canh) {
    if (!coTheoNut.has(e.tuNut)) coTheoNut.set(e.tuNut, new Set());
    coTheoNut.get(e.tuNut).add(e.den);
  }
  for (const t of doThi.khongTonTai) {
    if (!coTheoNut.has(t.tuNut)) coTheoNut.set(t.tuNut, new Set());
    coTheoNut.get(t.tuNut).add(t.den);
  }

  const thongKe = {
    nhom: { tong: 0, coCanh: 0, loaiBo: {} },
    chuong: { tong: 0, coCanh: 0, loaiBo: {} },
    phan: { tong: 0, coCanh: 0, loaiBo: {} },
    chu_giai: { tong: 0, coCanh: 0, loaiBo: {} },
  };
  const sot = [];
  const loaiBoMau = [];

  for (const n of nut) {
    const v = n.nguyenVan || '';
    const tapCo = coTheoNut.get(n.id) || new Set();
    const laChinhMinh = (d) => n.loai === 'TEN' && (n.id === d || n.id.startsWith(d + ':'));

    // 1. Mọi NN.NN có trong kho bieu
    for (const m of v.matchAll(/(?<![\d.])(\d{2}\.\d{2})(?![\d.])/g)) {
      const code = m[1].replace('.', '');
      if (!khoNut.nhomSet.has(code)) continue;
      thongKe.nhom.tong += 1;
      const d = `bieu:${code}`;
      if (tapCo.has(d) || laChinhMinh(d)) {
        thongKe.nhom.coCanh += 1;
        continue;
      }
      const lyDo = lyDoLoaiBoTho(n, 'nhom', m[1], m.index, m[1].length);
      if (lyDo) {
        thongKe.nhom.loaiBo[lyDo] = (thongKe.nhom.loaiBo[lyDo] || 0) + 1;
        if (loaiBoMau.length < 40) loaiBoMau.push({ loai: 'nhom', id: n.id, raw: m[1], lyDo, ctx: v.slice(Math.max(0, m.index - 25), m.index + 30).replace(/\s+/g, ' ') });
      } else {
        sot.push({ id: n.id, loai: 'nhom', raw: m[1], ctx: v.slice(Math.max(0, m.index - 25), m.index + 35).replace(/\s+/g, ' ') });
      }
    }

    // 2. Mọi Chương N có trong kho chuong
    for (const m of v.matchAll(/(?<![\p{L}\p{N}_])chương\s+(\d{1,2})(?!\.\d)(?![\p{L}\p{N}_])/giu)) {
      const ch = m[1].padStart(2, '0');
      if (!khoNut.chuongCo.has(ch)) continue;
      thongKe.chuong.tong += 1;
      const d = `chuong:${ch}`;
      const khop = [...tapCo].some((x) => x === d || x.startsWith(`${d}:`));
      if (khop || laChinhMinh(d) || n.id === d) {
        thongKe.chuong.coCanh += 1;
        continue;
      }
      sot.push({ id: n.id, loai: 'chuong', raw: m[0], ctx: v.slice(Math.max(0, m.index - 20), m.index + 30).replace(/\s+/g, ' ') });
    }

    // 3. Mọi Phần X (quét thô không phân biệt hoa/thường để tự kiểm cả chữ thường)
    for (const m of v.matchAll(/(?<![\p{L}\p{N}_])phần\s+(XXI|XX|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)(?![\p{L}\p{N}_])/giu)) {
      const p = m[1].toUpperCase();
      if (!khoNut.phanCo.has(p)) continue;
      thongKe.phan.tong += 1;
      const d = `phan:${p}`;
      const khop = [...tapCo].some((x) => x === d || x.startsWith(`${d}:`));
      if (khop || laChinhMinh(d) || n.id === d) {
        thongKe.phan.coCanh += 1;
        continue;
      }
      const lyDo = lyDoLoaiBoTho(n, 'phan', m[0], m.index, m[0].length);
      if (lyDo) {
        thongKe.phan.loaiBo[lyDo] = (thongKe.phan.loaiBo[lyDo] || 0) + 1;
        if (loaiBoMau.length < 40) loaiBoMau.push({ loai: 'phan', id: n.id, raw: m[0], lyDo, ctx: v.slice(Math.max(0, m.index - 20), m.index + 30).replace(/\s+/g, ' ') });
      } else {
        sot.push({ id: n.id, loai: 'phan', raw: m[0], ctx: v.slice(Math.max(0, m.index - 20), m.index + 30).replace(/\s+/g, ' ') });
      }
    }

    // 4. Mọi Chú giải đánh số
    for (const m of v.matchAll(/(?<![\p{L}\p{N}_])chú\s+giải\s+(?:phân\s+nhóm\s+|bổ\s+sung\s+|phần\s+)?(?:\((\d{1,2})\)|(\d{1,2}))(?![\d.])/giu)) {
      const num = m[1] || m[2];
      thongKe.chu_giai.tong += 1;
      const khop = [...tapCo].some((x) => x.includes(`:cg:${num}`) || x.includes(`:cgpn:${num}`) || x.includes(`:cgbs:${num}`));
      if (khop) {
        thongKe.chu_giai.coCanh += 1;
        continue;
      }
      sot.push({ id: n.id, loai: 'chu_giai', raw: m[0], ctx: v.slice(Math.max(0, m.index - 15), m.index + 45).replace(/\s+/g, ' ') });
    }
  }

  return { thongKe, sot, loaiBoMau };
}

// 5. Khi truyền --thu-muc hoặc kho thật đã nằm trên đĩa (data/luat-goc/bieu.jsonl), chạy kiểm toàn kho
const args = process.argv.slice(2);
const idxThuMuc = args.indexOf('--thu-muc');
const idxNhomTam = args.indexOf('--nhom-tam');
const baoCao = args.includes('--bao-cao');
const gocLuat = fileURLToPath(new URL('../data/luat-goc', import.meta.url));
const thuMucKho = idxThuMuc >= 0 ? path.resolve(args[idxThuMuc + 1]) : (fs.existsSync(path.join(gocLuat, 'bieu.jsonl')) ? gocLuat : null);

if (thuMucKho) {
  const nhomTamPath = idxNhomTam >= 0 ? path.resolve(args[idxNhomTam + 1]) : fileURLToPath(new URL('../data/chu-giai-heading.json', import.meta.url));
  const { nut, cau, khoNut, coNhomJsonl } = docKhoLuatGoc(thuMucKho, { nhomTam: nhomTamPath, coCau: true });
  const dt = dungDoThiDanChieu({ nut, cau: cau.length ? cau : null, khoNut });
  const ketQuaTho = quetThoDocLap(dt, { nut, khoNut });
  check(`kho thật (${dt.thongKe.soNut} nút, ${coNhomJsonl ? 'có nhom.jsonl' : 'kèm .nhom tạm'}): khớp hai chiều 100%`, dt.thongKe.khopHaiChieu, JSON.stringify(dt.thongKe));
  check(`kho thật: có >= 1000 cạnh dẫn chiếu thực tế`, dt.thongKe.soCanh >= 1000, `soCanh=${dt.thongKe.soCanh}`);
  check(`kho thật: phép quét thô độc lập 4 loại (nhóm/Chương/Phần/Chú giải) sót = 0`, ketQuaTho.sot.length === 0, `sot=${ketQuaTho.sot.length}: ${JSON.stringify(ketQuaTho.sot.slice(0, 8))}`);

  if (baoCao) {
    console.log('\n=== BÁO CÁO M-32 TRÊN KHO THẬT ===');
    console.log(JSON.stringify(dt.thongKe, null, 2));
    console.log('\n=== PHÉP QUÉT THÔ ĐỘC LẬP ===');
    console.log(JSON.stringify(ketQuaTho.thongKe, null, 2));
    console.log(`\n=== NGHI LỖI IN KHOẢNG NGƯỢC (${dt.nghiLoiIn.length}) ===`);
    for (const g of dt.nghiLoiIn) console.log(`- ${g.tu}: "${g.trich}" (${g.tuMa} -> ${g.denMa})`);
    if (ketQuaTho.loaiBoMau.length) {
      console.log(`\n=== MẪU LOẠI BỎ ĐỌC ĐƯỢC (${ketQuaTho.loaiBoMau.length} mẫu đầu) ===`);
      for (const b of ketQuaTho.loaiBoMau.slice(0, 25)) console.log(`- [${b.loai}] ${b.id} | ${b.raw} | ${b.lyDo} | ${b.ctx}`);
    }
    const theoDich = new Map();
    for (const t of dt.khongTonTai) {
      if (!theoDich.has(t.den)) theoDich.set(t.den, []);
      theoDich.get(t.den).push(t);
    }
    console.log(`\n=== ĐÍCH KHÔNG TỒN TẠI (${theoDich.size} đích duy nhất / ${dt.khongTonTai.length} lần xuất hiện) ===`);
    for (const [den, ds] of [...theoDich.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      console.log(`- ${den} (${ds.length}x): vd ${ds[0].tu} | "${ds[0].trich}" | ${ds[0].cau.slice(0, 140)}`);
    }
    if (ketQuaTho.sot.length) {
      console.log(`\n=== MẪU SÓT ĐỘC LẬP (${ketQuaTho.sot.length}) ===`);
      for (const s of ketQuaTho.sot.slice(0, 40)) console.log(`- ${s.id} [${s.loai}]: ${s.raw} || ${s.ctx}`);
    }
  }
}

console.log(`test-dan-chieu: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
