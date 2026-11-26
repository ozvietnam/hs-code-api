#!/usr/bin/env node
// scripts/ho-so-ma/nguong.mjs — M-74 (#1966, ADR-0006): Rút ngưỡng số và kiểm phân dải anh em từ luật gốc.
//
// Thuần tất định từ data/luat-goc, KHÔNG chứa dữ liệu khách, KHÔNG gọi AI/mạng.
//   node scripts/ho-so-ma/nguong.mjs --tao        # dựng/cập nhật data/ho-so-ma/nguong/{XV,76}.jsonl
//   node scripts/ho-so-ma/nguong.mjs --kiem       # kiểm khuôn, cổng 3/4/5 phạm vi 76 và phân dải anh em
//   node scripts/ho-so-ma/nguong.mjs --bao-cao    # in bảng ngưỡng & các chỗ hở/chồng theo luật
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chayCong, napLuatCong } from './cong.mjs';
import { kiemKhoHoSo } from './khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const chuanKhoang = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const khoaNguong = (n) => `${chuanKhoang(n.daiLuong).toLowerCase()}|${chuanKhoang(n.donVi ?? '').toLowerCase()}`;
export const laCauViDuHoacBangMau = (txt) => /(?:tấm ví dụ|ví dụ về|sản phẩm mẫu|thuộc tính nhiệt:|pound trên 1000 ft2|thường có các thành phần sau|hợp kim 5182\s+hợp kim 5082)/i.test(chuanKhoang(txt));

/**
 * Danh mục đặc tả ngưỡng số rút trực tiếp từ câu luật trên đường đi Chương 76 (gồm Phần XV + Chương 76).
 * Mỗi mục giữ trich nguyên văn câu `cau` và `duKien` là chuỗi con có thật trong câu `cau`.
 */
export const DAC_TA_NGUONG_76 = Object.freeze([
  // ── Phần XV (phan:XV → data/ho-so-ma/nguong/XV.jsonl) ────────────────────────────────────────
  {
    id: 'hs:phan:XV:7401',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:5:b#1',
    dieuKien: 'Hợp kim chứa kim loại cơ bản Phần XV được xếp vào Phần XV khi tổng khối lượng các kim loại cơ bản >= 50% tổng hợp kim',
    trich: 'tổng khối lượng của các kim loại cơ bản đó bằng hoặc lớn hơn tổng khối lượng của các thành phần khác có mặt trong hợp kim',
    nguong: { daiLuong: 'tổng tỷ lệ khối lượng kim loại cơ bản Phần XV', donVi: '%', tu: 50, den: null, gomTu: true, gomDen: false },
    duKien: ['tổng khối lượng của các kim loại cơ bản', 'tổng khối lượng của các thành phần khác'],
  },
  {
    id: 'hs:phan:XV:7402',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:8:b#1',
    dieuKien: 'Bột kim loại cơ bản phải có >= 90% tính theo khối lượng lọt qua được rây đường kính mắt 1 mm',
    trich: 'có hàm lượng từ 90% trở lên tính theo khối lượng lọt qua được rây (sàng)',
    nguong: { daiLuong: 'tỷ lệ khối lượng lọt qua rây', donVi: '%', tu: 90, den: null, gomTu: true, gomDen: false },
    duKien: ['hàm lượng', 'tính theo khối lượng', 'rây'],
  },
  {
    id: 'hs:phan:XV:7403',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:8:b#1',
    dieuKien: 'Cỡ mắt rây tiêu chuẩn dùng để định nghĩa bột kim loại cơ bản Phần XV bằng 1 mm',
    trich: 'rây (sàng) có đường kính mắt rây bằng 1 mm',
    nguong: { daiLuong: 'đường kính mắt rây', donVi: 'mm', tu: 1, den: 1, gomTu: true, gomDen: true },
    duKien: ['đường kính mắt rây'],
  },
  {
    id: 'hs:phan:XV:7404',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:9:a#3',
    dieuKien: 'Thanh và que mặt cắt ngang hình chữ nhật (kể cả biến dạng) phải có chiều dày trên 1/10 chiều rộng',
    trich: 'Chiều dày của các sản phẩm có mặt cắt ngang hình chữ nhật (kể cả "hình chữ nhật biến dạng") phải trên 1/10 chiều rộng',
    nguong: { daiLuong: 'tỉ lệ chiều dày / chiều rộng (thanh và que chữ nhật)', donVi: 'lần', tu: 0.1, den: null, gomTu: false, gomDen: false },
    duKien: ['Chiều dày', 'chiều rộng', 'mặt cắt ngang hình chữ nhật'],
  },
  {
    id: 'hs:phan:XV:7405',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:9:c#3',
    dieuKien: 'Dây mặt cắt ngang hình chữ nhật (kể cả biến dạng) phải có chiều dày trên 1/10 chiều rộng',
    trich: 'Chiều dày của các sản phẩm này có mặt cắt ngang hình chữ nhật (kể cả "hình chữ nhật biến dạng") phải trên 1/10 chiều rộng',
    nguong: { daiLuong: 'tỉ lệ chiều dày / chiều rộng (dây chữ nhật)', donVi: 'lần', tu: 0.1, den: null, gomTu: false, gomDen: false },
    duKien: ['Chiều dày', 'chiều rộng', 'mặt cắt ngang hình chữ nhật'],
  },
  {
    id: 'hs:phan:XV:7406',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:9:d#1',
    dieuKien: 'Tấm, lá, dải và lá mỏng dạng hình chữ nhật (kể cả hình vuông) có chiều dày không quá 1/10 chiều rộng',
    trich: 'với dạng hình chữ nhật (kể cả hình vuông) chiều dày không quá 1/10 chiều rộng',
    nguong: { daiLuong: 'tỉ lệ chiều dày / chiều rộng (tấm, lá, dải, lá mỏng chữ nhật)', donVi: 'lần', tu: null, den: 0.1, gomTu: false, gomDen: true },
    duKien: ['chiều dày', 'chiều rộng', 'hình chữ nhật'],
  },

  // ── Chương 76: Chú giải phân nhóm (chuong:76 → data/ho-so-ma/nguong/76.jsonl) ────────────────
  {
    id: 'hs:chuong:76:7401',
    nut: 'chuong:76',
    cau: 'chuong:76:cgpn:1:a#1',
    dieuKien: 'Nhôm không hợp kim phải có hàm lượng nhôm (Al) chiếm ít nhất 99% tính theo khối lượng',
    trich: 'Là kim loại có hàm lượng nhôm chiếm ít nhất 99% tính theo khối lượng',
    nguong: { daiLuong: 'hàm lượng nhôm (Al) trong nhôm không hợp kim', donVi: '%', tu: 99, den: null, gomTu: true, gomDen: false },
    duKien: ['hàm lượng nhôm', 'tính theo khối lượng'],
  },
  {
    id: 'hs:chuong:76:7402',
    nut: 'chuong:76',
    cau: 'chuong:76:cgpn:1:a#1',
    dieuKien: 'Nhôm không hợp kim có giới hạn tổng hàm lượng Fe + Si tối đa 1% tính theo khối lượng',
    trich: 'Fe+ Si (Sẳt + Silic) Các nguyên tố khác (1) , tính cho mỗi nguyên tố 1 0.1(2)',
    nguong: { daiLuong: 'tổng hàm lượng sắt và silic (Fe + Si) trong nhôm không hợp kim', donVi: '%', tu: null, den: 1, gomTu: false, gomDen: true },
    duKien: ['Fe+ Si', 'tính theo khối lượng'],
  },
  {
    id: 'hs:chuong:76:7403',
    nut: 'chuong:76',
    cau: 'chuong:76:cgpn:1:a#1',
    dieuKien: 'Nhôm không hợp kim giới hạn mỗi nguyên tố khác thông thường không quá 0,1% theo khối lượng',
    trich: 'Các nguyên tố khác (1) , tính cho mỗi nguyên tố 1 0.1(2)',
    nguong: { daiLuong: 'hàm lượng mỗi nguyên tố khác thông thường trong nhôm không hợp kim', donVi: '%', tu: null, den: 0.1, gomTu: false, gomDen: true },
    duKien: ['Các nguyên tố khác', 'tính cho mỗi nguyên tố'],
  },
  {
    id: 'hs:chuong:76:7404',
    nut: 'chuong:76',
    cau: 'chuong:76:cgpn:1:a#3',
    dieuKien: 'Ngoại lệ nhôm không hợp kim: tỷ lệ đồng (Cu) được phép trên 0,1% đến 0,2% nếu Cr và Mn đều <= 0,05%',
    trich: 'Tỷ lệ đồng cho phép lớn hơn 0,1%, nhưng không quá 0,2%, với điều kiện hàm lượng crôm cũng như hàm lượng mangan đều không quá 0,05%',
    nguong: { daiLuong: 'tỷ lệ đồng (Cu) ngoại lệ trong nhôm không hợp kim', donVi: '%', tu: 0.1, den: 0.2, gomTu: false, gomDen: true },
    duKien: ['Tỷ lệ đồng', 'hàm lượng crôm', 'hàm lượng mangan'],
  },
  {
    id: 'hs:chuong:76:7405',
    nut: 'chuong:76',
    cau: 'chuong:76:cgpn:1:a#3',
    dieuKien: 'Điều kiện ngoại lệ Cu (0,1; 0,2]% của nhôm không hợp kim: hàm lượng crôm (Cr) không quá 0,05%',
    trich: 'hàm lượng crôm cũng như hàm lượng mangan đều không quá 0,05%',
    nguong: { daiLuong: 'hàm lượng crôm (Cr) khi đồng trong (0,1; 0,2]% ở nhôm không hợp kim', donVi: '%', tu: null, den: 0.05, gomTu: false, gomDen: true },
    duKien: ['hàm lượng crôm', 'Tỷ lệ đồng'],
  },
  {
    id: 'hs:chuong:76:7406',
    nut: 'chuong:76',
    cau: 'chuong:76:cgpn:1:a#3',
    dieuKien: 'Điều kiện ngoại lệ Cu (0,1; 0,2]% của nhôm không hợp kim: hàm lượng mangan (Mn) không quá 0,05%',
    trich: 'hàm lượng crôm cũng như hàm lượng mangan đều không quá 0,05%',
    nguong: { daiLuong: 'hàm lượng mangan (Mn) khi đồng trong (0,1; 0,2]% ở nhôm không hợp kim', donVi: '%', tu: null, den: 0.05, gomTu: false, gomDen: true },
    duKien: ['hàm lượng mangan', 'Tỷ lệ đồng'],
  },
  {
    id: 'hs:chuong:76:7407',
    nut: 'chuong:76',
    cau: 'chuong:76:cgpn:1:b:ii#1',
    dieuKien: 'Hợp kim nhôm khi tổng hàm lượng các nguyên tố khác trong thành phần vượt quá 1% tính theo khối lượng',
    trich: 'tổng hàm lượng của các nguyên tố khác trong thành phần vượt quá 1% tính theo khối lượng',
    nguong: { daiLuong: 'tổng hàm lượng các nguyên tố khác trong hợp kim nhôm', donVi: '%', tu: 1, den: null, gomTu: false, gomDen: false },
    duKien: ['tổng hàm lượng của các nguyên tố khác', 'tính theo khối lượng'],
  },

  // ── 76.06 vs 76.07: Chiều dày 0,2 mm ──────────────────────────────────────────────────────────
  {
    id: 'hs:bieu:7606:7401',
    nut: 'bieu:7606',
    cau: 'bieu:7606#1',
    voi: ['bieu:7607'],
    dieuKien: 'Nhôm dạng tấm, lá và dải thuộc nhóm 76.06 phải có chiều dày trên 0,2 mm',
    trich: 'Nhôm ở dạng tấm, lá và dải, chiều dày trên 0,2 mm',
    nguong: { daiLuong: 'chiều dày', donVi: 'mm', tu: 0.2, den: null, gomTu: false, gomDen: false },
    duKien: ['chiều dày'],
  },
  {
    id: 'hs:bieu:7607:7401',
    nut: 'bieu:7607',
    cau: 'bieu:7607#1',
    voi: ['bieu:7606'],
    dieuKien: 'Nhôm lá mỏng thuộc nhóm 76.07 có chiều dày (trừ phần bồi) không quá 0,2 mm',
    trich: 'có chiều dày (trừ phần bồi) không quá 0,2 mm',
    nguong: { daiLuong: 'chiều dày', donVi: 'mm', tu: null, den: 0.2, gomTu: false, gomDen: true },
    duKien: ['chiều dày'],
  },

  // ── 76.11 vs 76.12: Dung tích 300 lít ─────────────────────────────────────────────────────────
  {
    id: 'hs:bieu:7611:7401',
    nut: 'bieu:7611',
    cau: 'bieu:7611#1',
    voi: ['bieu:7612'],
    dieuKien: 'Bể chứa, két, bình chứa nhôm thuộc nhóm 76.11 có dung tích trên 300 lít',
    trich: 'có dung tích trên 300 lít',
    nguong: { daiLuong: 'dung tích', donVi: 'lít', tu: 300, den: null, gomTu: false, gomDen: false },
    duKien: ['dung tích'],
  },
  {
    id: 'hs:bieu:7612:7401',
    nut: 'bieu:7612',
    cau: 'bieu:7612#1',
    voi: ['bieu:7611'],
    dieuKien: 'Thùng phuy, lon, hộp và đồ chứa tương tự bằng nhôm thuộc nhóm 76.12 có dung tích không quá 300 lít',
    trich: 'dung tích không quá 300 lít',
    nguong: { daiLuong: 'dung tích', donVi: 'lít', tu: null, den: 300, gomTu: false, gomDen: true },
    duKien: ['dung tích'],
  },
  {
    id: 'hs:bieu:761100:7401',
    nut: 'bieu:761100',
    cau: 'bieu:761100#1',
    dieuKien: 'Phân nhóm 7611.00 yêu cầu bể chứa, két, bình chứa bằng nhôm có dung tích trên 300 lít',
    trich: 'có dung tích trên 300 lít',
    nguong: { daiLuong: 'dung tích', donVi: 'lít', tu: 300, den: null, gomTu: false, gomDen: false },
    duKien: ['dung tích'],
  },
  {
    id: 'hs:bieu:76110000:7401',
    nut: 'bieu:76110000',
    cau: 'bieu:76110000#1',
    dieuKien: 'Dòng 7611.00.00 yêu cầu bể chứa, két, bình chứa bằng nhôm có dung tích trên 300 lít',
    trich: 'có dung tích trên 300 lít',
    nguong: { daiLuong: 'dung tích', donVi: 'lít', tu: 300, den: null, gomTu: false, gomDen: false },
    duKien: ['dung tích'],
  },

  // ── 7605.1: Dây nhôm không hợp kim (760511 vs 760519; 76051910 vs 76051990) ──────────────────
  {
    id: 'hs:bieu:760511:7401',
    nut: 'bieu:760511',
    cau: 'bieu:760511#1',
    voi: ['bieu:760519'],
    dieuKien: 'Dây nhôm không hợp kim 7605.11 có kích thước mặt cắt ngang lớn nhất trên 7 mm',
    trich: 'Kích thước mặt cắt ngang lớn nhất trên 7 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang lớn nhất', donVi: 'mm', tu: 7, den: null, gomTu: false, gomDen: false },
    duKien: ['Kích thước mặt cắt ngang lớn nhất'],
  },
  {
    id: 'hs:bieu:760519:7401',
    nut: 'bieu:760519',
    cau: 'bieu:760511#1',
    voi: ['bieu:760511'],
    dieuKien: 'Dây nhôm không hợp kim 7605.19 (Loại khác) có kích thước mặt cắt ngang lớn nhất không quá 7 mm',
    trich: 'Kích thước mặt cắt ngang lớn nhất trên 7 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang lớn nhất', donVi: 'mm', tu: null, den: 7, gomTu: false, gomDen: true },
    duKien: ['Kích thước mặt cắt ngang lớn nhất'],
    ghiChu: 'phuDinh: bieu:760511 — Phần bù của 7605.11 theo quy tắc phân nhóm "Loại khác".',
  },
  {
    id: 'hs:bieu:76051100:7401',
    nut: 'bieu:76051100',
    cau: 'bieu:76051100#1',
    dieuKien: 'Dòng 7605.11.00 là dây nhôm không hợp kim có kích thước mặt cắt ngang lớn nhất trên 7 mm',
    trich: 'Kích thước mặt cắt ngang lớn nhất trên 7 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang lớn nhất', donVi: 'mm', tu: 7, den: null, gomTu: false, gomDen: false },
    duKien: ['Kích thước mặt cắt ngang lớn nhất'],
  },
  {
    id: 'hs:bieu:76051910:7401',
    nut: 'bieu:76051910',
    cau: 'bieu:76051910#1',
    voi: ['bieu:76051990'],
    dieuKien: 'Dòng 7605.19.10 là dây nhôm không hợp kim (mặt cắt <= 7 mm) có đường kính không quá 0,0508 mm',
    trich: 'Đường kính không quá 0,0508 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: null, den: 0.0508, gomTu: false, gomDen: true },
    duKien: ['Đường kính'],
  },
  {
    id: 'hs:bieu:76051990:7401',
    nut: 'bieu:76051990',
    cau: 'bieu:76051910#1',
    voi: ['bieu:76051910'],
    dieuKien: 'Dòng 7605.19.90 (Loại khác của 7605.19) áp dụng cho dây có đường kính trên 0,0508 mm',
    trich: 'Đường kính không quá 0,0508 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 0.0508, den: null, gomTu: false, gomDen: false },
    duKien: ['Đường kính'],
    ghiChu: 'phuDinh: bieu:76051910 — Phần bù của 7605.19.10; kế thừa ngưỡng cha 7605.19 (mặt cắt <= 7 mm).',
  },

  // ── 7605.2: Dây hợp kim nhôm (760521 vs 760529; 76052910 vs 76052990) ────────────────────────
  {
    id: 'hs:bieu:760521:7401',
    nut: 'bieu:760521',
    cau: 'bieu:760521#1',
    voi: ['bieu:760529'],
    dieuKien: 'Dây hợp kim nhôm 7605.21 có kích thước mặt cắt ngang lớn nhất trên 7 mm',
    trich: 'Kích thước mặt cắt ngang lớn nhất trên 7 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang lớn nhất', donVi: 'mm', tu: 7, den: null, gomTu: false, gomDen: false },
    duKien: ['Kích thước mặt cắt ngang lớn nhất'],
  },
  {
    id: 'hs:bieu:760529:7401',
    nut: 'bieu:760529',
    cau: 'bieu:760521#1',
    voi: ['bieu:760521'],
    dieuKien: 'Dây hợp kim nhôm 7605.29 (Loại khác) có kích thước mặt cắt ngang lớn nhất không quá 7 mm',
    trich: 'Kích thước mặt cắt ngang lớn nhất trên 7 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang lớn nhất', donVi: 'mm', tu: null, den: 7, gomTu: false, gomDen: true },
    duKien: ['Kích thước mặt cắt ngang lớn nhất'],
    ghiChu: 'phuDinh: bieu:760521 — Phần bù của 7605.21 theo quy tắc phân nhóm "Loại khác".',
  },
  {
    id: 'hs:bieu:76052100:7401',
    nut: 'bieu:76052100',
    cau: 'bieu:76052100#1',
    dieuKien: 'Dòng 7605.21.00 là dây hợp kim nhôm có kích thước mặt cắt ngang lớn nhất trên 7 mm',
    trich: 'Kích thước mặt cắt ngang lớn nhất trên 7 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang lớn nhất', donVi: 'mm', tu: 7, den: null, gomTu: false, gomDen: false },
    duKien: ['Kích thước mặt cắt ngang lớn nhất'],
  },
  {
    id: 'hs:bieu:76052910:7401',
    nut: 'bieu:76052910',
    cau: 'bieu:76052910#1',
    voi: ['bieu:76052990'],
    dieuKien: 'Dòng 7605.29.10 là dây hợp kim nhôm (mặt cắt <= 7 mm) có đường kính không quá 0,254 mm',
    trich: 'Có đường kính không quá 0,254 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: null, den: 0.254, gomTu: false, gomDen: true },
    duKien: ['đường kính'],
  },
  {
    id: 'hs:bieu:76052990:7401',
    nut: 'bieu:76052990',
    cau: 'bieu:76052910#1',
    voi: ['bieu:76052910'],
    dieuKien: 'Dòng 7605.29.90 (Loại khác của 7605.29) áp dụng cho dây hợp kim nhôm có đường kính trên 0,254 mm',
    trich: 'Có đường kính không quá 0,254 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 0.254, den: null, gomTu: false, gomDen: false },
    duKien: ['đường kính'],
    ghiChu: 'phuDinh: bieu:76052910 — Phần bù của 7605.29.10; kế thừa ngưỡng cha 7605.29 (mặt cắt <= 7 mm).',
  },

  // ── 7606.12.3: Chiều rộng > 1m, định nghĩa hợp kim 5082/5182 (DINH_NGHIA), lá làm lon SEN ───
  {
    id: 'hs:bieu:76061233:7401',
    nut: 'bieu:76061233',
    cau: 'bieu:76061233#1',
    voi: ['bieu:76061239'],
    dieuKien: 'Dòng 7606.12.33 dạng lá bằng hợp kim nhôm 5082 hoặc 5182 dạng cuộn phải có chiều rộng trên 1 m',
    trich: 'bằng hợp kim nhôm 5082 hoặc 5182, có chiều rộng trên 1m, dạng cuộn',
    nguong: { daiLuong: 'chiều rộng', donVi: 'm', tu: 1, den: null, gomTu: false, gomDen: false },
    duKien: ['chiều rộng', 'hợp kim nhôm 5082 hoặc 5182'],
    ghiChu: 'Với hợp kim 5082/5182 dạng cuộn chưa rơi vào .32/.34/.35, nếu chiều rộng <= 1 m thì sang 7606.12.39.',
  },
  {
    id: 'hs:bieu:76061233:7402',
    nut: 'bieu:76061233',
    loai: 'DINH_NGHIA',
    cau: 'sen:76061233:1#2',
    dieuKien: 'Định nghĩa mác hợp kim nhôm 5182 (SEN 7606.12.33): Al 93,5–96,0%; Mg 4,0–5,0%; Mn <= 0,15%; Cr <= 0,15%; Cu <= 0,15%; Fe <= 0,35%; Si <= 0,20%; Ti <= 0,10%; Zn <= 0,25%',
    trich: 'Hợp kim 5182\tHợp kim 5082\nNhôm, Al\t93,5 - 96,0\t93,5-96,0\nCrôm, Cr\t<= 0,15\t<= 0,10\nĐồng, Cu\t<= 0,15\t<= 0,15\nSắt, Fe\t<= 0,35\t<= 0,35\nMagie, Mg\t4,0 - 5,0\t4,0 - 5,0\nMangan, Mn\t<= 0,15\t0,20 -0,50',
    duKien: ['Hợp kim 5182', 'Nhôm, Al', 'Crôm, Cr', 'Magie, Mg', 'Mangan, Mn'],
    ghiChu: 'Chuyển từ NGUONG sang DINH_NGHIA theo góp ý QT: nhận dạng riêng mác 5182.',
  },
  {
    id: 'hs:bieu:76061233:7403',
    nut: 'bieu:76061233',
    loai: 'DINH_NGHIA',
    cau: 'sen:76061233:1#2',
    dieuKien: 'Định nghĩa mác hợp kim nhôm 5082 (SEN 7606.12.33): Al 93,5–96,0%; Mg 4,0–5,0%; Mn 0,20–0,50%; Cr <= 0,10%; Cu <= 0,15%; Fe <= 0,35%; Si <= 0,20%; Ti <= 0,10%; Zn <= 0,25%',
    trich: 'Hợp kim 5182\tHợp kim 5082\nNhôm, Al\t93,5 - 96,0\t93,5-96,0\nCrôm, Cr\t<= 0,15\t<= 0,10\nĐồng, Cu\t<= 0,15\t<= 0,15\nSắt, Fe\t<= 0,35\t<= 0,35\nMagie, Mg\t4,0 - 5,0\t4,0 - 5,0\nMangan, Mn\t<= 0,15\t0,20 -0,50',
    duKien: ['Hợp kim 5082', 'Nhôm, Al', 'Crôm, Cr', 'Magie, Mg', 'Mangan, Mn'],
    ghiChu: 'Chuyển từ NGUONG sang DINH_NGHIA theo góp ý QT: nhận dạng riêng mác 5082.',
  },
  {
    id: 'hs:bieu:76061232:7401',
    nut: 'bieu:76061232',
    cau: 'sen:76061232:1#3',
    dieuKien: 'SEN 7606.12.32 mô tả lá làm lon dạng cuộn có độ dày từ 0,175 mm đến không quá 0,432 mm (vùng <= 0,2 mm thuộc 76.07 theo Luật)',
    trich: 'độ dày từ 0,175 mm nhưng không quá 0,432 mm',
    nguong: { daiLuong: 'độ dày lá làm lon (SEN 7606.12.32)', donVi: 'mm', tu: 0.175, den: 0.432, gomTu: true, gomDen: true },
    duKien: ['độ dày'],
    ghiChu: 'CẢNH BÁO CHỒNG LẤN PHÁP LÝ: SEN ghi 0,175..0,432 mm chồng lên nhóm 76.07 (<= 0,2 mm) ở đoạn [0,175; 0,2] mm; theo biểu thuế 76.06 bắt buộc > 0,2 mm.',
  },
  {
    id: 'hs:bieu:76061232:7402',
    nut: 'bieu:76061232',
    cau: 'sen:76061232:1#3',
    dieuKien: 'SEN 7606.12.32 mô tả lá làm lon dạng cuộn có chiều rộng từ 254 mm đến không quá 1000 mm',
    trich: 'chiều rộng từ 254 mm nhưng không quá 1000 mm',
    nguong: { daiLuong: 'chiều rộng lá làm lon (SEN 7606.12.32)', donVi: 'mm', tu: 254, den: 1000, gomTu: true, gomDen: true },
    duKien: ['chiều rộng'],
  },

  // ── 7614.10.1 (có lõi thép) & 7614.90.1 (loại khác): Cáp 25,3 mm và 28,28 mm ───────────────────
  {
    id: 'hs:bieu:76141011:7401',
    nut: 'bieu:76141011',
    cau: 'bieu:76141011#1',
    voi: ['bieu:76141012', 'bieu:76141019'],
    dieuKien: 'Cáp nhôm có lõi thép 7614.10.11 có đường kính không quá 25,3 mm',
    trich: 'Có đường kính không quá 25,3 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: null, den: 25.3, gomTu: false, gomDen: true },
    duKien: ['đường kính'],
  },
  {
    id: 'hs:bieu:76141012:7401',
    nut: 'bieu:76141012',
    cau: 'bieu:76141012#1',
    voi: ['bieu:76141011', 'bieu:76141019'],
    dieuKien: 'Cáp nhôm có lõi thép 7614.10.12 có đường kính trên 25,3 mm nhưng không quá 28,28 mm',
    trich: 'Có đường kính trên 25,3 mm nhưng không quá 28,28 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 25.3, den: 28.28, gomTu: false, gomDen: true },
    duKien: ['đường kính'],
  },
  {
    id: 'hs:bieu:76141019:7401',
    nut: 'bieu:76141019',
    cau: 'bieu:76141012#1',
    voi: ['bieu:76141011', 'bieu:76141012'],
    dieuKien: 'Cáp nhôm có lõi thép 7614.10.19 (Loại khác) có đường kính trên 28,28 mm',
    trich: 'Có đường kính trên 25,3 mm nhưng không quá 28,28 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 28.28, den: null, gomTu: false, gomDen: false },
    duKien: ['đường kính'],
    ghiChu: 'phuDinh: bieu:76141011, bieu:76141012 — Phần bù của 7614.10.11 và 7614.10.12 theo quy tắc "Loại khác".',
  },
  {
    id: 'hs:bieu:76149011:7401',
    nut: 'bieu:76149011',
    cau: 'bieu:76149011#1',
    voi: ['bieu:76149012', 'bieu:76149019'],
    dieuKien: 'Cáp nhôm loại khác 7614.90.11 có đường kính không quá 25,3 mm',
    trich: 'Có đường kính không quá 25,3 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: null, den: 25.3, gomTu: false, gomDen: true },
    duKien: ['đường kính'],
  },
  {
    id: 'hs:bieu:76149012:7401',
    nut: 'bieu:76149012',
    cau: 'bieu:76149012#1',
    voi: ['bieu:76149011', 'bieu:76149019'],
    dieuKien: 'Cáp nhôm loại khác 7614.90.12 có đường kính trên 25,3 mm nhưng không quá 28,28 mm',
    trich: 'Có đường kính trên 25,3 mm nhưng không quá 28,28 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 25.3, den: 28.28, gomTu: false, gomDen: true },
    duKien: ['đường kính'],
  },
  {
    id: 'hs:bieu:76149019:7401',
    nut: 'bieu:76149019',
    cau: 'bieu:76149012#1',
    voi: ['bieu:76149011', 'bieu:76149012'],
    dieuKien: 'Cáp nhôm loại khác 7614.90.19 (Loại khác) có đường kính trên 28,28 mm',
    trich: 'Có đường kính trên 25,3 mm nhưng không quá 28,28 mm',
    nguong: { daiLuong: 'đường kính', donVi: 'mm', tu: 28.28, den: null, gomTu: false, gomDen: false },
    duKien: ['đường kính'],
    ghiChu: 'phuDinh: bieu:76149011, bieu:76149012 — Phần bù của 7614.90.11 và 7614.90.12 theo quy tắc "Loại khác".',
  },

  // ── 7616.91 (Chú giải phân nhóm 2: dây <= 6 mm) & 7616.99.30 (đồng xèng > 1/10 đường kính) ──
  {
    id: 'hs:bieu:761691:7401',
    nut: 'bieu:761691',
    cau: 'chuong:76:cgpn:2#1',
    voi: ['bieu:761699'],
    dieuKien: 'Với phân nhóm 7616.91, dây làm tấm đan/phên/lưới/rào chỉ gồm sản phẩm có kích thước mặt cắt ngang không quá 6 mm',
    trich: 'theo mục đích của phân nhóm 7616.91, khái niệm “dây" chỉ áp dụng cho các sản phẩm ở dạng cuộn hoặc không ở dạng cuộn, mặt cắt ngang ở hình dạng bất kỳ, kích thước mặt cắt ngang không quá 6 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang', donVi: 'mm', tu: null, den: 6, gomTu: false, gomDen: true },
    duKien: ['kích thước mặt cắt ngang'],
    ghiChu: 'Sản phẩm từ thanh/dải/dây có mặt cắt ngang trên 6 mm không thoả khái niệm dây của 7616.91 nên chuyển sang anh em 7616.99.',
  },
  {
    id: 'hs:bieu:761699:7401',
    nut: 'bieu:761699',
    cau: 'chuong:76:cgpn:2#1',
    voi: ['bieu:761691'],
    dieuKien: 'Tấm đan, phên, lưới, rào làm từ sợi có kích thước mặt cắt ngang trên 6 mm không thuộc 7616.91 nên sang 7616.99',
    trich: 'kích thước mặt cắt ngang không quá 6 mm',
    nguong: { daiLuong: 'kích thước mặt cắt ngang', donVi: 'mm', tu: 6, den: null, gomTu: false, gomDen: false },
    duKien: ['kích thước mặt cắt ngang'],
    ghiChu: 'phuDinh: bieu:761691 — Phần bù theo Chú giải phân nhóm 2 Chương 76 khi vật liệu làm lưới có mặt cắt trên 6 mm.',
  },
  {
    id: 'hs:bieu:76169930:7401',
    nut: 'bieu:76169930',
    cau: 'bieu:76169930#1',
    voi: ['bieu:76169990'],
    dieuKien: 'Đồng xèng hình tròn thuộc 7616.99.30 phải có kích thước chiều dày trên 1/10 đường kính',
    trich: 'Đồng xèng, hình tròn, kích thước chiều dày trên 1/10 đường kính',
    nguong: { daiLuong: 'tỉ lệ chiều dày / đường kính', donVi: 'lần', tu: 0.1, den: null, gomTu: false, gomDen: false },
    duKien: ['chiều dày', 'đường kính'],
    ghiChu: 'Nếu đồng xèng hình tròn có chiều dày <= 1/10 đường kính thì không đạt điều kiện định danh 7616.99.30.',
  },
]);

/** Dựng toàn bộ bản ghi ho-so-ma@1 từ đặc tả + chữ câu gốc trong data/luat-goc. */
export function dungBanGhiNguong({ luat = G.LUAT_MAC_DINH, dacTa = DAC_TA_NGUONG_76 } = {}) {
  const L = napLuatCong(luat);
  const theoTep = new Map();
  const loi = [];

  for (const d of dacTa) {
    const loai = d.loai || 'NGUONG';
    const chu = L.chuCau(d.cau);
    if (chu === null) {
      loi.push(`${d.id}: không tìm thấy câu ${d.cau}`);
      continue;
    }
    if (loai === 'NGUONG' && laCauViDuHoacBangMau(chu)) {
      loi.push(`${d.id}: câu ${d.cau} là thông số ví dụ/bảng mẫu tham khảo — không được dựng thành NGUONG`);
      continue;
    }
    const nNguon = L.nut.get(L.cau.get(d.cau).nut);
    const key = G.tepCuaNut(d.nut, 'nguong');
    if (!key) {
      loi.push(`${d.id}: nút ${d.nut} không thuộc thư mục nguong/`);
      continue;
    }
    const rec = {
      id: d.id,
      nut: d.nut,
      loai,
      dieuKien: d.dieuKien,
      trich: d.trich,
      cau: d.cau,
      ...(d.voi ? { voi: [...d.voi] } : {}),
      ...(d.nguong ? { nguong: { ...d.nguong } } : {}),
      duKien: [...d.duKien],
      lop: nNguon.lop,
      nguon: nNguon.nguon,
      van: sha256(chu),
      trangThai: 'KHOP',
      ...(d.ghiChu ? { ghiChu: d.ghiChu } : {}),
    };
    const rel = `nguong/${key}.jsonl`;
    if (!theoTep.has(rel)) theoTep.set(rel, []);
    theoTep.get(rel).push(rec);
  }
  return { L, theoTep, loi };
}

/** Ghi các tệp JSONL vào data/ho-so-ma/nguong/. */
export function ghiKhoNguong({ luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, dacTa = DAC_TA_NGUONG_76 } = {}) {
  const { L, theoTep, loi } = dungBanGhiNguong({ luat, dacTa });
  if (loi.length) throw new Error(`Lỗi dựng kho ngưỡng:\n${loi.join('\n')}`);
  const outDir = path.join(hoSo, 'nguong');
  fs.mkdirSync(outDir, { recursive: true });
  const daGhi = [];
  for (const [rel, list] of [...theoTep.entries()].sort()) {
    const abs = path.join(hoSo, rel);
    fs.writeFileSync(abs, `${list.map((x) => JSON.stringify(x)).join('\n')}\n`, 'utf8');
    daGhi.push({ rel, soBanGhi: list.length });
  }
  return { L, daGhi };
}

const chongKhoang = (a, b) => {
  const truoc = (x, y) => x.den !== null && y.tu !== null && (x.den < y.tu || (x.den === y.tu && !(x.gomDen && y.gomTu)));
  return !truoc(a, b) && !truoc(b, a);
};

/**
 * Kiểm phân dải anh em cho từng cụm nút cùng cha chia theo một (daiLuong, donVi),
 * phát hiện chồng dải, hở giữa chừng, thiếu cận và xung đột SEN vs LUAT.
 */
export function kiemDaiAnhEm(banGhi, L) {
  const nguongList = banGhi.filter((x) => x && x.loai === 'NGUONG' && x.nguong);
  const theoNut = new Map();
  for (const r of nguongList) {
    if (!theoNut.has(r.nut)) theoNut.set(r.nut, []);
    theoNut.get(r.nut).push(r);
  }

  // Gom từng nhóm anh em cùng cha có cùng (daiLuong, donVi) (từ >= 2 nút anh em)
  const nhomTheoCha = new Map();
  for (const r of nguongList) {
    const nutInfo = L.cay.theoId.get(r.nut);
    const cha = nutInfo?.cha;
    if (!cha) continue;
    const kk = `${cha}||${khoaNguong(r.nguong)}`;
    if (!nhomTheoCha.has(kk)) nhomTheoCha.set(kk, new Map());
    if (!nhomTheoCha.get(kk).has(r.nut)) nhomTheoCha.get(kk).set(r.nut, r);
  }

  const cumDaKiem = [];
  const loi = [];
  const ghiNhanLuat = [];

  for (const [kk, mapNut] of [...nhomTheoCha.entries()].sort()) {
    if (mapNut.size < 2) continue;
    const [cha, daiDonVi] = kk.split('||');
    const [daiLuong, donVi] = daiDonVi.split('|');
    const items = [...mapNut.values()].sort((a, b) => (a.nguong.tu ?? -Infinity) - (b.nguong.tu ?? -Infinity));
    const conThat = G.conCua(cha, L.cay);
    const thieuAnhEm = items.some((x) => (x.voi || []).some((v) => !mapNut.has(v)));
    const lapLoi = [];

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (chongKhoang(items[i].nguong, items[j].nguong)) {
          lapLoi.push(`Chồng dải giữa ${items[i].nut} và ${items[j].nut} (${items[i].id} / ${items[j].id})`);
        }
      }
    }
    for (let i = 1; i < items.length; i += 1) {
      const a = items[i - 1].nguong;
      const b = items[i].nguong;
      if (a.den === null || b.tu === null) continue;
      if (a.den < b.tu || (a.den === b.tu && !a.gomDen && !b.gomTu)) {
        lapLoi.push(`Hở dải giữa ${items[i - 1].nut} (đến ${a.den}) và ${items[i].nut} (từ ${b.tu})`);
      }
    }
    if (thieuAnhEm) {
      lapLoi.push(`Nhóm ${cha} (${daiLuong}): có voi trỏ tới anh em chưa mang NGUONG cùng đại lượng`);
    }

    loi.push(...lapLoi.map((msg) => `${cha} [${daiLuong} (${donVi || '-'})]: ${msg}`));
    cumDaKiem.push({
      cha,
      daiLuong,
      donVi: donVi || null,
      soAnhEmTrongCha: conThat.length,
      soAnhEmCoNguong: items.length,
      phuKin: lapLoi.length === 0 && items[0].nguong.tu === null && items[items.length - 1].nguong.den === null,
      cacNut: items.map((x) => ({ nut: x.nut, nguong: x.nguong, cau: x.cau })),
    });
  }

  // Ghi nhận các chỗ chồng/hở xuất phát từ chính văn bản luật/SEN (tài liệu đối chiếu)
  const r7606 = theoNut.get('bieu:7606')?.find((x) => x.nguong.daiLuong === 'chiều dày');
  const r7607 = theoNut.get('bieu:7607')?.find((x) => x.nguong.daiLuong === 'chiều dày');
  const r76061232 = theoNut.get('bieu:76061232')?.find((x) => x.nguong.donVi === 'mm' && x.nguong.daiLuong.includes('độ dày'));
  if (r7607 && r76061232 && chongKhoang(r7607.nguong, r76061232.nguong)) {
    ghiNhanLuat.push({
      loai: 'CHONG_SEN_VOI_LUAT',
      moTa: 'SEN 7606.12.32 mô tả lá làm lon dày từ 0,175..0,432 mm chồng lấn vùng [0,175; 0,2] mm của nhóm 76.07 (<= 0,2 mm); theo Luật (76.06 > 0,2 mm), mức <= 0,2 mm thuộc 76.07.',
      cauLienQuan: [r7606?.cau, r7607.cau, r76061232.cau].filter(Boolean),
    });
  }
  return { cumDaKiem, loi, ghiNhanLuat };
}

function main() {
  const argv = process.argv.slice(2);
  const idx = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const luat = path.resolve(idx('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(idx('--ho-so') || G.HO_SO_MAC_DINH);

  if (argv.includes('--tao')) {
    const { L, daGhi } = ghiKhoNguong({ luat, hoSo });
    const kho = kiemKhoHoSo(hoSo);
    const dai = kiemDaiAnhEm(kho.banGhi, L);
    console.log('Đã tạo kho M-74:', JSON.stringify({ daGhi, khuonLoi: kho.loi.length, cumKiem: dai.cumDaKiem.length, daiLoi: dai.loi.length }));
    if (kho.loi.length || dai.loi.length) process.exit(1);
    return;
  }

  if (argv.includes('--bao-cao')) {
    const L = napLuatCong(luat);
    const kho = kiemKhoHoSo(hoSo);
    const dai = kiemDaiAnhEm(kho.banGhi, L);
    console.log(JSON.stringify({
      soBanGhi: kho.banGhi.filter((x) => x.loai === 'NGUONG').length,
      khuonLoi: kho.loi,
      cumDaKiem: dai.cumDaKiem,
      daiLoi: dai.loi,
      ghiNhanLuat: dai.ghiNhanLuat,
    }, null, 2));
    return;
  }

  // Mặc định (--kiem): kiểm khuôn + cổng 4, 5 + phân dải anh em + trích xuất
  const L = napLuatCong(luat);
  const kho = kiemKhoHoSo(hoSo);
  const rCong45 = chayCong({ luat, hoSo, phamVi: ['76'], cong: [4, 5], L });
  const rCong3 = chayCong({ luat, hoSo, phamVi: ['76'], cong: [3], L });
  const loiNguongC3 = rCong3.cong[3].loi.filter((x) => /NGUONG chồng dải|: dải |: voi /.test(x));
  const dai = kiemDaiAnhEm(kho.banGhi, L);

  let coLoi = 0;
  console.log(`${kho.loi.length ? 'FAIL' : 'PASS'} khuôn M-74: ${kho.banGhi.length} bản ghi, ${kho.loi.length} lỗi`);
  for (const l of kho.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  for (const k of [4, 5]) {
    const c = rCong45.cong[k];
    console.log(`${c.loi.length ? 'FAIL' : 'PASS'} cổng ${k} ${c.ten} (phạm vi 76): ${c.soKiem} mục kiểm, ${c.loi.length} lỗi`);
    for (const l of c.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  }
  console.log(`${loiNguongC3.length ? 'FAIL' : 'PASS'} cổng 3 ANH EM (riêng NGUONG/voi, phạm vi 76): ${loiNguongC3.length} lỗi`);
  for (const l of loiNguongC3) { console.log(`  ✗ ${l}`); coLoi = 1; }
  console.log(`${dai.loi.length ? 'FAIL' : 'PASS'} kiểm dải NGUONG (${dai.cumDaKiem.length} cụm anh em): ${dai.loi.length} lỗi, ${dai.ghiNhanLuat.length} ghi nhận luật/SEN`);
  for (const l of dai.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  for (const g of dai.ghiNhanLuat) console.log(`  ! [${g.loai}] ${g.moTa}`);
  process.exit(coLoi);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
