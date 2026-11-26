#!/usr/bin/env node
// scripts/ho-so-ma/nguong-rut.mjs — M-74 (#1966, ADR-0006): Rút ngưỡng số và phân dải anh em từ luật gốc theo chương.
//
// Thuần tất định từ data/luat-goc, KHÔNG chứa dữ liệu khách/tiền lệ/WCO, KHÔNG gọi AI/mạng.
//   node scripts/ho-so-ma/nguong-rut.mjs --chuong 84 --tao
//   node scripts/ho-so-ma/nguong-rut.mjs --chuong 84 --kiem
//   node scripts/ho-so-ma/nguong-rut.mjs --chuong 84 --bao-cao
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chayCong, giaiPhamVi, napLuatCong } from './cong.mjs';
import { kiemKhoHoSo } from './khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
const chuanKhoang = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const khoaNguong = (n) => `${chuanKhoang(n.daiLuong).toLowerCase()}|${chuanKhoang(n.donVi ?? '').toLowerCase()}`;

/** Lọc câu thông số ví dụ, bảng mẫu hoặc mô tả ước lượng không mang hiệu lực bắt buộc. */
export const laCauViDuHoacBangMau = (txt) => {
  const s = chuanKhoang(txt);
  if (/(?:tấm ví dụ|ví dụ về|sản phẩm mẫu|thuộc tính nhiệt:|pound trên 1000 ft2|thường có các thành phần sau|hợp kim 5182\s+hợp kim 5082)/i.test(s)) return true;
  if (/\b(?:khoảng|xấp xỉ|thường hoạt động dưới áp suất)\b/i.test(s)) return true;
  if (/^kích thước bên ngoài của máy dùng để đặt trên mặt sàn/i.test(s)) return true;
  return false;
};

/** Chuyển chuỗi số Việt Nam ("2.000", "22,38", "3,175") thành Number. */
export function parseSoVn(raw) {
  const s = String(raw || '').trim().replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

const chuanDonVi = (dv) => {
  const s = chuanKhoang(dv);
  if (/^m3\/h$/i.test(s)) return 'm³/h';
  if (/^m³\/phút$/i.test(s)) return 'm3/phút';
  if (/^cm3$/i.test(s) || /^cm³$/i.test(s)) return 'cc';
  return s;
};

const NUM_RE = '(\\d+(?:\\.\\d{3})*(?:,\\d+)?|\\d+(?:,\\d+)?)';
const UNIT_RE = '(kW|MW|W(?![a-zà-ỹ])|cc|cm3|cm³|tấn\\/giờ|tấn|kg|cg|m³\\/h|m3\\/h|m3\\/phút|m³\\/phút|lít\\/giờ|lít|ml|mm|cm|m(?![a-zà-ỹ])|kN|vòng\\/phút|micron|%)';

/** Tách các điều kiện ngưỡng số từ một văn bản dòng biểu thuế `bieu:*`. */
export function tachNguongDongBieu(txt, hCode = '') {
  const cleaned = chuanKhoang(txt).replace(/^(?:-\s*)+/, '').replace(/\s*\((?:SEN|\*|\d+)\)\s*$/gi, '').trim();
  const res = [];

  // Chia câu theo '; ' hoặc ', hoặc ' để tránh trộn hai nhánh độc lập (vd 8414.30.40, 8481.20.20, 8409.99.37)
  const parts = cleaned.split(/\s*;\s*|\s*,\s*hoặc\s+|\s+và\s+có\s+|\s+với điều kiện là\s+/i);

  const reRangeA = new RegExp(`trên\\s+${NUM_RE}\\s*${UNIT_RE}\\s+(?:nhưng\\s+không\\s+(?:vượt\\s+)?quá|đến)\\s+${NUM_RE}\\s*${UNIT_RE}`, 'gi');
  const reRangeB = new RegExp(`từ\\s+${NUM_RE}\\s*${UNIT_RE}\\s+(?:trở\\s+lên,?\\s+nhưng\\s+không\\s+quá|đến)\\s+${NUM_RE}\\s*${UNIT_RE}`, 'gi');
  const reLower = new RegExp(`(?:từ\\s+${NUM_RE}\\s*${UNIT_RE}\\s+trở\\s+lên|(?:vượt\\s+quá|lớn\\s+hơn|trên)\\s+${NUM_RE}\\s*${UNIT_RE})`, 'gi');
  const reUpper = new RegExp(`(?:từ\\s+${NUM_RE}\\s*${UNIT_RE}\\s+trở\\s+xuống|(?:không\\s+(?:vượt\\s+)?quá|tối\\s+đa|dưới|nhỏ\\s+hơn)\\s+${NUM_RE}\\s*${UNIT_RE})`, 'gi');

  const suyDaiLuong = (doan, fullPart, donVi) => {
    const pre = fullPart.slice(0, doan.index).toLowerCase();
    const s = fullPart.toLowerCase();
    if (/công suất làm lạnh/.test(pre) || /công suất làm lạnh/.test(s)) return 'công suất làm lạnh';
    if (/công suất làm mát/.test(pre) || /công suất làm mát/.test(s)) return 'công suất làm mát';
    if (/công suất trục/.test(pre) || /spindle power/.test(s)) return 'công suất trục';
    if (/công suất hơi nước/.test(pre) || /công suất hơi nước/.test(s)) return 'công suất hơi nước';
    if (/công suất hơi/.test(pre) || /công suất hơi/.test(s)) return 'công suất hơi';
    if (/công suất đầu ra/.test(pre) || /công suất đầu ra/.test(s)) return 'công suất đầu ra';
    if (/công suất lọc/.test(pre) || /công suất lọc/.test(s)) return 'công suất lọc';
    if (/công suất/.test(pre) || /công suất/.test(s) || ['kW', 'MW', 'W'].includes(donVi)) return 'công suất';
    if (/dung tích làm việc/.test(pre) || /dung tích làm việc/.test(s)) return 'dung tích làm việc trên một chu kỳ';
    if (/dung tích xi\s*lanh/.test(pre) || /dung tích xi\s*lanh/.test(s) || /dung tích xilanh/.test(pre) || donVi === 'cc') return 'dung tích xi lanh';
    if (/dung tích/.test(pre) || /dung tích/.test(s)) return 'dung tích';
    if (/lưu lượng không khí/.test(pre) || /lưu lượng khí/.test(pre)) return 'lưu lượng không khí của mỗi dàn bay hơi';
    if (/lưu lượng/.test(pre) || /lưu lượng/.test(s) || donVi === 'm³/h' || donVi === 'lít/giờ') return 'lưu lượng';
    if (/sức chứa/.test(pre) || /sức chứa/.test(s)) return 'sức chứa vải khô mỗi lần';
    if (/khả năng cân/.test(pre) || /khả năng cân/.test(s)) return 'khả năng cân tối đa';
    if (/lực rung/.test(pre) || /lực rung/.test(s)) return 'lực rung của trống tính theo khối lượng';
    if (/lực đẩy/.test(pre) || /lực đẩy/.test(s)) return 'lực đẩy';
    if (/độ nhạy/.test(s) || donVi === 'cg') return 'độ nhạy cân';
    if (/tốc độ quay/.test(pre) || /tốc độ quay/.test(s) || donVi === 'vòng/phút') return 'tốc độ quay';
    if (/đường kính chuôi/.test(pre)) return 'đường kính chuôi';
    if (/đường kính trục cuốn/.test(pre)) return 'đường kính trục cuốn';
    if (/đường kính trong cửa nạp và cửa thoát/.test(pre)) return 'đường kính trong cửa nạp và cửa thoát';
    if (/đường kính trong cửa nạp hoặc cửa thoát/.test(pre)) return 'đường kính trong cửa nạp hoặc cửa thoát';
    if (/đường kính trong cửa nạp/.test(pre)) return 'đường kính trong cửa nạp';
    if (/đường kính cửa nạp hoặc cửa thoát/.test(pre)) return 'đường kính cửa nạp hoặc cửa thoát';
    if (/đường kính cửa hút/.test(pre)) return 'đường kính cửa hút';
    if (/đường kính trong/.test(pre)) return 'đường kính trong';
    if (/đường kính ngoài/.test(pre)) return 'đường kính ngoài';
    if (/đường kính/.test(pre) || /đường kính/.test(s)) return 'đường kính';
    if (/chiều ngang tối đa/.test(pre) || /chiều ngang tối đa/.test(s)) return 'kích thước chiều ngang tối đa';
    if (/khổ rộng/.test(pre) || /khổ rộng/.test(s)) return 'khổ rộng vải dệt';
    if (/chiều rộng/.test(pre)) return 'chiều rộng';
    if (/bán kính gia công tiện/.test(pre) || /bán kính gia công tiện/.test(s)) return 'bán kính gia công tiện';
    if (/độ dày/.test(pre) || donVi === 'micron') return 'độ dày màng lọc';
    if (/một chiều/.test(pre)) return 'kích thước một chiều giấy không gấp';
    if (/chiều kia/.test(pre)) return 'kích thước chiều kia giấy không gấp';
    if (/khối lượng/.test(pre) || /khối lượng/.test(s) || donVi === 'kg') return 'khối lượng';
    return `thông số (${donVi})`;
  };

  const trichTuKhoa = (doan, fullPart) => {
    // Mở rộng lấy từ danh từ chỉ đại lượng trước mệnh đề số để duKien có mặt trong trich & cau
    const startIdx = Math.max(0, fullPart.slice(0, doan.index).search(/(?:công suất|dung tích|lưu lượng|sức chứa|khả năng cân|lực rung|lực đẩy|độ nhạy|tốc độ quay|đường kính|kích thước chiều ngang|khổ rộng|chiều rộng|bán kính|độ dày|một chiều|chiều kia|khối lượng)[^,;]*$/i));
    const sub = fullPart.slice(startIdx, doan.index + doan[0].length).trim();
    return sub.length >= doan[0].length && sub.length <= 160 ? sub : doan[0];
  };

  for (const part of parts) {
    // Kiểm tra đặc biệt 844312 (hai chiều giấy trên cùng câu nối bằng "và")
    if (/một chiều không quá/i.test(part) && /chiều kia không quá/i.test(part)) {
      const m1 = /một chiều không quá\s+22\s*cm/i.exec(part);
      const m2 = /chiều kia không quá\s+36\s*cm/i.exec(part);
      if (m1) res.push({ daiLuong: 'kích thước một chiều giấy không gấp', donVi: 'cm', tu: null, den: 22, gomTu: false, gomDen: true, trich: m1[0], duKien: ['22 cm'], part });
      if (m2) res.push({ daiLuong: 'kích thước chiều kia giấy không gấp', donVi: 'cm', tu: null, den: 36, gomTu: false, gomDen: true, trich: m2[0], duKien: ['36 cm'], part });
      continue;
    }

    const spans = [];
    const overlapSpan = (s, e) => spans.some(([a, b]) => s < b && e > a);

    for (const [re, kind] of [[reRangeA, 'rA'], [reRangeB, 'rB'], [reLower, 'lo'], [reUpper, 'hi']]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(part)) !== null) {
        const s = m.index;
        const e = s + m[0].length;
        if (overlapSpan(s, e)) continue;
        spans.push([s, e]);
        let item;
        if (kind === 'rA' || kind === 'rB') {
          const v1 = parseSoVn(m[1]);
          const dv1 = chuanDonVi(m[2]);
          const v2 = parseSoVn(m[3]);
          const dv2 = chuanDonVi(m[4]);
          if (v1 === null || v2 === null || dv1 !== dv2) continue;
          const gomTu = kind === 'rB' && !/^trên/i.test(m[0]);
          const gomDen = true;
          item = {
            daiLuong: suyDaiLuong(m, part, dv1),
            donVi: dv1,
            tu: v1,
            den: v2,
            gomTu,
            gomDen,
            trich: trichTuKhoa(m, part),
            part,
          };
        } else if (kind === 'lo') {
          const val = parseSoVn(m[1] || m[3]);
          const dv = chuanDonVi(m[2] || m[4]);
          if (val === null) continue;
          const gomTu = /^từ/i.test(m[0]);
          item = { daiLuong: suyDaiLuong(m, part, dv), donVi: dv, tu: val, den: null, gomTu, gomDen: false, trich: trichTuKhoa(m, part), part };
        } else {
          const val = parseSoVn(m[1] || m[3]);
          const dv = chuanDonVi(m[2] || m[4]);
          if (val === null) continue;
          const gomDen = !/^(?:dưới|nhỏ hơn)/i.test(m[0]);
          item = { daiLuong: suyDaiLuong(m, part, dv), donVi: dv, tu: null, den: val, gomTu: false, gomDen, trich: trichTuKhoa(m, part), part };
        }
        // Rút duKien có thật trong `item.trich`
        const dkMatch = /(?:công suất làm lạnh|công suất làm mát|công suất trục|công suất hơi nước|công suất hơi|công suất đầu ra|công suất lọc|công suất|dung tích làm việc|dung tích xi\s*lanh|dung tích xilanh|dung tích|lưu lượng không khí|lưu lượng khí|lưu lượng|sức chứa|khả năng cân tối đa|lực rung|lực đẩy|độ nhạy|tốc độ quay|đường kính chuôi|đường kính trục cuốn|đường kính trong|đường kính ngoài|đường kính cửa hút|đường kính cửa nạp|đường kính|chiều ngang tối đa|khổ rộng|chiều rộng|bán kính gia công tiện|độ dày|khối lượng)/i.exec(item.trich);
        item.duKien = [dkMatch ? dkMatch[0] : m[0]];
        res.push(item);
      }
    }
  }

  // Trường hợp đặc thù bieu:8423#1 ("trừ loại cân đo có độ nhạy 5 cg hoặc nhạy hơn" => > 5 cg)
  if (hCode === '8423' && /độ nhạy 5 cg hoặc nhạy hơn/i.test(cleaned)) {
    res.push({
      daiLuong: 'độ nhạy cân (nhạy <= 5 cg thuộc 90.16)',
      donVi: 'cg',
      tu: 5,
      den: null,
      gomTu: false,
      gomDen: false,
      trich: 'trừ loại cân đo có độ nhạy 5 cg hoặc nhạy hơn',
      duKien: ['độ nhạy 5 cg'],
      part: cleaned,
      ghiChuRieng: 'Loại cân có độ nhạy 5 cg hoặc nhạy hơn (<= 5 cg) thuộc nhóm 90.16.',
    });
  }

  return res;
}

/** Danh mục đặc tả ngưỡng phi-biểu (Phần XVI, Chú giải Chương/Phân nhóm, SEN, Nhóm) cho Chương 84. */
export function layDacTaPhiBieu84(L) {
  return [
    // ── Phần XVI (phan:XVI → data/ho-so-ma/nguong/XVI.jsonl) ──
    {
      id: 'hs:phan:XVI:8401',
      nut: 'phan:XVI',
      cau: 'phan:XVI:kq:41#1',
      dieuKien: 'Bi thép đã đánh bóng thuộc nhóm 84.82 phải có dung sai đường kính danh nghĩa không quá 1% (xét cùng ngưỡng tuyệt đối 0,05 mm)',
      trich: 'các bi thép đã đánh bóng có dung sai không quá 1% hoặc 0.05 mm, theo mức dung sai nhỏ hơn (nhóm 84.82)',
      nguong: { daiLuong: 'dung sai tương đối đường kính bi thép (84.82)', donVi: '%', tu: null, den: 1, gomTu: false, gomDen: true },
      duKien: ['dung sai', '1%'],
    },
    {
      id: 'hs:phan:XVI:8402',
      nut: 'phan:XVI',
      cau: 'phan:XVI:kq:41#1',
      dieuKien: 'Bi thép đã đánh bóng thuộc nhóm 84.82 phải có dung sai tuyệt đối so với đường kính danh nghĩa không quá 0,05 mm (lấy mức dung sai nhỏ hơn với 1%)',
      trich: 'các bi thép đã đánh bóng có dung sai không quá 1% hoặc 0.05 mm, theo mức dung sai nhỏ hơn (nhóm 84.82)',
      nguong: { daiLuong: 'dung sai tuyệt đối đường kính bi thép (84.82)', donVi: 'mm', tu: null, den: 0.05, gomTu: false, gomDen: true },
      duKien: ['dung sai', '0.05 mm'],
    },

    // ── Chú giải Chương 84 & Phân nhóm ──
    {
      id: 'hs:bieu:8482:8401',
      nut: 'bieu:8482',
      cau: 'chuong:84:cg:7#1',
      dieuKien: 'Chú giải 7 Chương 84: bi thép đánh bóng nhóm 84.82 có dung sai so với đường kính danh nghĩa không quá 1% (theo mức dung sai nhỏ hơn)',
      trich: 'có dung sai lớn nhất và nhỏ nhất so với đường kính danh nghĩa không quá 1% hoặc không quá 0,05 mm, theo mức dung sai nhỏ hơn',
      nguong: { daiLuong: 'dung sai tương đối so với đường kính danh nghĩa (CG 7 Ch.84)', donVi: '%', tu: null, den: 1, gomTu: false, gomDen: true },
      duKien: ['đường kính danh nghĩa', '1%'],
    },
    {
      id: 'hs:bieu:8482:8402',
      nut: 'bieu:8482',
      cau: 'chuong:84:cg:7#1',
      dieuKien: 'Chú giải 7 Chương 84: bi thép đánh bóng nhóm 84.82 có dung sai so với đường kính danh nghĩa không quá 0,05 mm (theo mức dung sai nhỏ hơn)',
      trich: 'có dung sai lớn nhất và nhỏ nhất so với đường kính danh nghĩa không quá 1% hoặc không quá 0,05 mm, theo mức dung sai nhỏ hơn',
      nguong: { daiLuong: 'dung sai tuyệt đối so với đường kính danh nghĩa (CG 7 Ch.84)', donVi: 'mm', tu: null, den: 0.05, gomTu: false, gomDen: true },
      duKien: ['đường kính danh nghĩa', '0,05 mm'],
    },
    {
      id: 'hs:bieu:848291:8401',
      nut: 'bieu:848291',
      cau: 'chuong:84:cg:7#1',
      dieuKien: 'Bi thép đánh bóng thuộc phân nhóm 8482.91 áp dụng mức dung sai không quá 1% so với đường kính danh nghĩa',
      trich: 'không quá 1% hoặc không quá 0,05 mm, theo mức dung sai nhỏ hơn',
      nguong: { daiLuong: 'dung sai tương đối đường kính bi thép (8482.91)', donVi: '%', tu: null, den: 1, gomTu: false, gomDen: true },
      duKien: ['1%'],
    },
    {
      id: 'hs:bieu:848291:8402',
      nut: 'bieu:848291',
      cau: 'chuong:84:cg:7#1',
      dieuKien: 'Bi thép đánh bóng thuộc phân nhóm 8482.91 áp dụng mức dung sai không quá 0,05 mm so với đường kính danh nghĩa',
      trich: 'không quá 1% hoặc không quá 0,05 mm, theo mức dung sai nhỏ hơn',
      nguong: { daiLuong: 'dung sai tuyệt đối đường kính bi thép (8482.91)', donVi: 'mm', tu: null, den: 0.05, gomTu: false, gomDen: true },
      duKien: ['0,05 mm'],
    },
    {
      id: 'hs:bieu:848240:8401',
      nut: 'bieu:848240',
      cau: 'chuong:84:cgpn:4#1',
      dieuKien: 'Chú giải phân nhóm 4 Chương 84: ổ bi kim 8482.40 phải dùng bi đũa đường kính đồng nhất không quá 5 mm',
      trich: 'ổ bi đũa có đường kính đồng nhất của các bi đũa không quá 5 mm và có chiều dài ít nhất gấp 3 lần đường kính',
      nguong: { daiLuong: 'đường kính đồng nhất bi đũa', donVi: 'mm', tu: null, den: 5, gomTu: false, gomDen: true },
      duKien: ['đường kính đồng nhất', '5 mm'],
    },
    {
      id: 'hs:bieu:848240:8402',
      nut: 'bieu:848240',
      cau: 'chuong:84:cgpn:4#1',
      dieuKien: 'Chú giải phân nhóm 4 Chương 84: bi đũa của 8482.40 phải có chiều dài ít nhất gấp 3 lần đường kính',
      trich: 'có chiều dài ít nhất gấp 3 lần đường kính',
      nguong: { daiLuong: 'tỉ lệ chiều dài / đường kính bi đũa', donVi: 'lần', tu: 3, den: null, gomTu: true, gomDen: false },
      duKien: ['chiều dài', 'gấp 3 lần đường kính'],
    },
    {
      id: 'hs:bieu:8470:8401',
      nut: 'bieu:8470',
      cau: 'chuong:84:cg:9#1',
      dieuKien: 'Chú giải 9 Chương 84: máy tính loại bỏ túi thuộc nhóm 84.70 có chiều dài không quá 170 mm (khổ tổng thể 170 x 100 x 45 mm)',
      trich: 'khái niệm “loại bỏ túi” chỉ áp dụng cho máy móc có kích thước không quá 170 mm x 100 mm x 45 mm',
      nguong: { daiLuong: 'kích thước cạnh 1 (loại bỏ túi 84.70)', donVi: 'mm', tu: null, den: 170, gomTu: false, gomDen: true },
      duKien: ['loại bỏ túi', '170 mm x 100 mm x 45 mm'],
    },
    {
      id: 'hs:bieu:8470:8402',
      nut: 'bieu:8470',
      cau: 'chuong:84:cg:9#1',
      dieuKien: 'Chú giải 9 Chương 84: máy tính loại bỏ túi thuộc nhóm 84.70 có chiều rộng không quá 100 mm (khổ tổng thể 170 x 100 x 45 mm)',
      trich: 'khái niệm “loại bỏ túi” chỉ áp dụng cho máy móc có kích thước không quá 170 mm x 100 mm x 45 mm',
      nguong: { daiLuong: 'kích thước cạnh 2 (loại bỏ túi 84.70)', donVi: 'mm', tu: null, den: 100, gomTu: false, gomDen: true },
      duKien: ['loại bỏ túi', '100 mm'],
    },
    {
      id: 'hs:bieu:8470:8403',
      nut: 'bieu:8470',
      cau: 'chuong:84:cg:9#1',
      dieuKien: 'Chú giải 9 Chương 84: máy tính loại bỏ túi thuộc nhóm 84.70 có chiều dày không quá 45 mm (khổ tổng thể 170 x 100 x 45 mm)',
      trich: 'khái niệm “loại bỏ túi” chỉ áp dụng cho máy móc có kích thước không quá 170 mm x 100 mm x 45 mm',
      nguong: { daiLuong: 'kích thước cạnh 3 (loại bỏ túi 84.70)', donVi: 'mm', tu: null, den: 45, gomTu: false, gomDen: true },
      duKien: ['loại bỏ túi', '45 mm'],
    },
    {
      id: 'hs:bieu:845210:8401',
      nut: 'bieu:845210',
      cau: 'pn:845210:ct:1#3',
      dieuKien: 'Máy khâu gia đình 8452.10 kết hợp mô tơ điện phải có công suất đầu ra không quá 120 W',
      trich: 'Máy kết hợp một mô tơ điện có công suất đầu ra không quá 120 W',
      nguong: { daiLuong: 'công suất đầu ra mô tơ điện (8452.10)', donVi: 'W', tu: null, den: 120, gomTu: false, gomDen: true },
      duKien: ['công suất đầu ra', '120 W'],
    },
    {
      id: 'hs:bieu:845210:8402',
      nut: 'bieu:845210',
      cau: 'pn:845210:ct:1#4',
      dieuKien: 'Máy khâu gia đình 8452.10 chạy điện trình bày không kèm mô tơ có sức nặng đầu máy không quá 16 kg',
      trich: 'sức nặng của đầu máy không quá 16kg',
      nguong: { daiLuong: 'sức nặng đầu máy khâu không kèm mô tơ (8452.10)', donVi: 'kg', tu: null, den: 16, gomTu: false, gomDen: true },
      duKien: ['sức nặng của đầu máy', '16kg'],
    },
    {
      id: 'hs:bieu:845210:8403',
      nut: 'bieu:845210',
      cau: 'pn:845210:ct:1#5',
      dieuKien: 'Máy khâu xung động / vải xéc gia đình thuộc 8452.10 có tốc độ hoạt động không quá 1.500 mũi/phút',
      trich: 'tốc độ hoạt động của máy không quá 1500 mũi một phút',
      nguong: { daiLuong: 'tốc độ khâu (8452.10)', donVi: 'mũi/phút', tu: null, den: 1500, gomTu: false, gomDen: true },
      duKien: ['tốc độ hoạt động', '1500 mũi một phút'],
    },
    {
      id: 'hs:bieu:8422:8401',
      nut: 'bieu:8422',
      cau: 'nhom:8422:ct:15#1',
      dieuKien: 'Thiết bị đóng chai/hộp gia dụng thuộc nhóm 84.22 phải có trọng lượng trên 10 kg (từ 10 kg trở xuống bị loại sang 82.10)',
      trich: 'Máy đóng chai hoặc đóng hộp gia dụng và các loại thiết bị cơ khí gia dụng khác có trọng lượng không quá 10 kg (nhóm 82.10)',
      nguong: { daiLuong: 'trọng lượng thiết bị đóng chai/hộp gia dụng', donVi: 'kg', tu: 10, den: null, gomTu: false, gomDen: false },
      duKien: ['trọng lượng', '10 kg'],
      ghiChu: 'Ngưỡng loại trừ: thiết bị gia dụng trọng lượng <= 10 kg sang nhóm 82.10.',
    },
    {
      id: 'hs:bieu:8415:8401',
      nut: 'bieu:8415',
      cau: 'nhom:8415:ct:17#1',
      dieuKien: 'Nhóm 84.15 không bao gồm thiết bị làm lạnh thiết kế duy trì nhiệt độ cố định luôn dưới 0°C trong không gian kín',
      trich: 'thiết bị làm lạnh được thiết kế để duy trì nhiệt độ cố định luôn dưới 0° C trong một không gian kín',
      nguong: { daiLuong: 'nhiệt độ thiết kế cố định trong không gian kín (bị loại khỏi 84.15)', donVi: '°C', tu: null, den: 0, gomTu: false, gomDen: false },
      duKien: ['nhiệt độ', '0° C'],
      ghiChu: 'Giá trị < 0° C ở không gian kín là điều kiện loại khỏi nhóm 84.15.',
    },

    // ── SEN Chương 84 (các mức bắt buộc, đã bỏ ví dụ 0,5 m3/s và nguồn điện 120/240V) ──
    {
      id: 'hs:bieu:84189940:8401',
      nut: 'bieu:84189940',
      cau: 'sen:84189940:1#4',
      dieuKien: 'SEN 8418.99.40: panel nhôm cán-ghép tạo rãnh bằng áp suất từ 100 đến 150 bar',
      trich: 'các đường rãnh được tạo ra bằng cách ép tấm đó với áp suất từ 100 đến 150 bar',
      nguong: { daiLuong: 'áp suất ép tạo rãnh panel (SEN 8418.99.40)', donVi: 'bar', tu: 100, den: 150, gomTu: true, gomDen: true },
      duKien: ['áp suất', '100 đến 150 bar'],
    },
    {
      id: 'hs:bieu:84146011:8401',
      nut: 'bieu:84146011',
      cau: 'sen:84146011:1#3',
      dieuKien: 'SEN 8414.60.11: tủ hút có bộ lọc HEPA đạt hiệu suất lọc từ 99,99% trở lên',
      trich: 'bộ lọc không khí hiệu suất cao (HEPA) (hiệu suất 99,99%)',
      nguong: { daiLuong: 'hiệu suất lọc HEPA (SEN 8414.60.11)', donVi: '%', tu: 99.99, den: null, gomTu: true, gomDen: false },
      duKien: ['hiệu suất 99,99%'],
    },
    {
      id: 'hs:bieu:84148011:8401',
      nut: 'bieu:84148011',
      cau: 'sen:84148011:1#3',
      dieuKien: 'SEN 8414.80.11: tủ an toàn có bộ lọc HEPA đạt hiệu suất lọc từ 99,99% trở lên',
      trich: 'bộ lọc không khí hiệu suất cao (HEPA) (hiệu suất 99,99%)',
      nguong: { daiLuong: 'hiệu suất lọc HEPA (SEN 8414.80.11)', donVi: '%', tu: 99.99, den: null, gomTu: true, gomDen: false },
      duKien: ['hiệu suất 99,99%'],
    },
  ].filter((x) => L.cau.has(x.cau));
}

/** Tính phần bù trên ℝ của một danh sách khoảng rời nhau (nếu phần bù đúng 1 khoảng duy nhất). */
function tinhBuMotKhoang(khoangList) {
  const sorted = [...khoangList].sort((a, b) => (a.tu ?? -Infinity) - (b.tu ?? -Infinity));
  // Kiểm tra không chồng chéo giữa các khoảng đã có
  for (let i = 1; i < sorted.length; i += 1) {
    const p = sorted[i - 1];
    const c = sorted[i];
    if (p.den === null || c.tu === null || p.den > c.tu || (p.den === c.tu && (p.gomDen && c.gomTu))) {
      return null;
    }
  }
  const gaps = [];
  const first = sorted[0];
  if (first.tu !== null) {
    gaps.push({ tu: null, den: first.tu, gomTu: false, gomDen: !first.gomTu });
  }
  for (let i = 1; i < sorted.length; i += 1) {
    const p = sorted[i - 1];
    const c = sorted[i];
    if (p.den < c.tu || (p.den === c.tu && !p.gomDen && !c.gomTu)) {
      gaps.push({ tu: p.den, den: c.tu, gomTu: !p.gomDen, gomDen: !c.gomTu });
    }
  }
  const last = sorted[sorted.length - 1];
  if (last.den !== null) {
    gaps.push({ tu: last.den, den: null, gomTu: !last.gomDen, gomDen: false });
  }
  return gaps.length === 1 ? gaps[0] : null;
}

const dinhDangKhoang = (ng) => {
  const t = ng.tu === null ? '..' : `${ng.gomTu ? '[' : '('}${ng.tu}`;
  const d = ng.den === null ? '..' : `${ng.den}${ng.gomDen ? ']' : ')'}`;
  return `${t}${ng.tu !== null && ng.den !== null ? '; ' : ''}${d} ${ng.donVi}`;
};

/** Kiểm tra xem các anh em có phải là tập hợp thuần phân chia theo ngưỡng số trên 1 đại lượng (cho phép suy "Loại khác"). */
function coTieuChiPhuNgoaiNguong(txt) {
  const clean = chuanKhoang(txt).replace(/^(?:-\s*)+/, '').replace(/\s*\((?:SEN|\*|\d+)\)\s*$/gi, '');
  // Nếu chứa tiêu chí vật liệu, phương thức vận hành, công dụng riêng, hoặc nhiều tiêu chí "và"/"hoặc"
  if (/(?:bơm nước|bằng đồng|bằng plastic|bằng gang|bằng thép|bằng hợp kim|loại gia dụng|hoạt động bằng điện|không hoạt động bằng điện|điều khiển bằng tay|dùng cho xe|dùng cho máy|dệt thoi|dệt không thoi|ống xi lanh|piston|cửa trên|cửa trước|một tầng|đặt chìm|sử dụng trong y tế|và có lưu lượng|hoặc có dung tích)/i.test(clean)) {
    return true;
  }
  return false;
}

/** Dựng toàn bộ bản ghi ho-so-ma@1 cho một Chương (vd: "84") từ data/luat-goc. */
export function dungBanGhiNguongChuong(chuong, { luat = G.LUAT_MAC_DINH } = {}) {
  const ch2 = String(chuong).padStart(2, '0');
  const L = napLuatCong(luat);
  const pv = giaiPhamVi(ch2, L);
  const N = new Set([...pv.duoi, ...pv.tren]);
  const reBieu = new RegExp(`^bieu:${ch2}`);
  const theoNut = new Map(); // nut -> list draft records

  const them = (rec) => {
    if (!theoNut.has(rec.nut)) theoNut.set(rec.nut, []);
    theoNut.get(rec.nut).push(rec);
  };

  // 1. Lấy tất cả điều kiện ngưỡng từ tên nút biểu thuế thuộc Chương ch2
  for (const nid of [...L.cay.theoId.keys()].sort()) {
    if (!reBieu.test(nid) || !N.has(nid)) continue;
    const cauId = `${nid}#1`;
    const chu = L.chuCau(cauId);
    if (!chu || laCauViDuHoacBangMau(chu)) continue;
    const hCode = nid.slice(5);
    const items = tachNguongDongBieu(chu, hCode);
    for (const it of items) {
      them({
        nut: nid,
        cau: cauId,
        loai: 'NGUONG',
        dieuKien: `Nút ${hCode} yêu cầu ${it.daiLuong} ${it.tu !== null ? (it.gomTu ? '>= ' : '> ') + it.tu : ''}${it.tu !== null && it.den !== null ? ' và ' : ''}${it.den !== null ? (it.gomDen ? '<= ' : '< ') + it.den : ''} ${it.donVi}`.replace(/\s+/g, ' ').trim(),
        trich: it.trich,
        nguong: { daiLuong: it.daiLuong, donVi: it.donVi, tu: it.tu, den: it.den, gomTu: it.gomTu, gomDen: it.gomDen },
        duKien: it.duKien,
        ghiChu: it.ghiChuRieng,
        _rawBieu: chu,
      });
    }
  }

  // 2. Xử lý phần bù "Loại khác" và liên kết voi cho các cụm anh em cùng cha
  const ghiNhanLuat = [];
  for (const cha of [...L.cay.theoId.keys()].sort()) {
    if (!N.has(cha) && !reBieu.test(cha)) continue;
    const con = G.conCua(cha, L.cay);
    if (con.length < 2) continue;
    const pureLk = con.filter((id) => /^(?:-\s*)+Loại khác(?:\s*\(SEN\))?\s*:?\s*$/i.test(chuanKhoang(L.chuCau(`${id}#1`) || '')));
    const coNguong = con.filter((id) => (theoNut.get(id) || []).length > 0);
    const khongSoVaKhongLk = con.filter((id) => !(theoNut.get(id) || []).length && !pureLk.includes(id));

    // 2a. Khử trùng khóa nếu hai anh em có cùng secondary/material ngưỡng nhưng phân biệt bằng tiêu chí phụ
    const theoKhoaAE = new Map();
    for (const id of con) {
      for (const r of theoNut.get(id) || []) {
        const kk = khoaNguong(r.nguong);
        if (!theoKhoaAE.has(kk)) theoKhoaAE.set(kk, []);
        theoKhoaAE.get(kk).push({ id, r });
      }
    }
    for (const [, list] of theoKhoaAE) {
      if (list.length < 2) continue;
      // Kiểm tra nếu có hai anh em khác nhau chồng nhau trên trục phụ (điện vs không điện, dệt thoi vs không thoi, đồng vs plastic, cửa trên vs trước...)
      let coChong = false;
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          if (list[i].id === list[j].id) continue;
          const a = list[i].r.nguong;
          const b = list[j].r.nguong;
          const truoc = (x, y) => x.den !== null && y.tu !== null && (x.den < y.tu || (x.den === y.tu && !(x.gomDen && y.gomTu)));
          if (!truoc(a, b) && !truoc(b, a)) coChong = true;
        }
      }
      if (coChong) {
        for (const { id, r } of list) {
          const txt = chuanKhoang(L.chuCau(`${id}#1`) || '').toLowerCase();
          let tag = '';
          if (/không hoạt động bằng điện/.test(txt)) tag = 'không điện';
          else if (/hoạt động bằng điện/.test(txt)) tag = 'bơm/máy điện';
          else if (/dệt không thoi/.test(txt)) tag = 'loại dệt không thoi';
          else if (/loại dệt thoi/.test(txt)) tag = 'loại dệt thoi';
          else if (/cửa trước/.test(txt)) tag = 'tủ cửa trước';
          else if (/cửa trên/.test(txt)) tag = 'tủ cửa trên';
          else if (/bằng đồng/.test(txt)) tag = 'bằng đồng';
          else if (/bằng plastic/.test(txt)) tag = 'bằng plastic';
          else if (/bằng gang đúc/.test(txt)) tag = 'bằng gang đúc';
          else if (/21,10/.test(txt)) tag = 'dải 21,10–26,38 kW';
          else if (/26,38/.test(txt)) tag = 'dải > 26,38 kW';
          else tag = id.slice(5);
          r.nguong.daiLuong = `${r.nguong.daiLuong} (${tag})`;
          r.dieuKien = `${r.dieuKien} [${tag}]`;
        }
      }
    }

    // 2b. Suy phần bù cho dòng "Loại khác" khi mọi anh em khác chỉ chia thuần trên 1 trục (hoặc cả cụm cùng chia 1 ngưỡng như 8413704, 841430)
    if (pureLk.length === 1 && khongSoVaKhongLk.length === 0 && coNguong.length >= 1) {
      const lkId = pureLk[0];
      // Nhóm các ngưỡng trên trục chính của các anh em có số
      const coNhanhPhu = coNguong.some((id) => coTieuChiPhuNgoaiNguong(L.chuCau(`${id}#1`) || ''));
      const laCumDacBiet = ['bieu:8413704', 'bieu:841381', 'bieu:841430'].includes(cha);
      if (!coNhanhPhu || laCumDacBiet) {
        if (cha === 'bieu:841430') {
          // 8414.30.40 dùng HOẶC (> 21.10 kW OR >= 220 cc) => 8414.30.90 là đồng thời <= 21.10 kW VÀ < 220 cc
          const src = theoNut.get('bieu:84143040') || [];
          for (const rSrc of src) {
            const bu = tinhBuMotKhoang([rSrc.nguong]);
            if (!bu) continue;
            them({
              nut: lkId,
              cau: rSrc.cau,
              loai: 'NGUONG',
              voi: ['bieu:84143040'],
              dieuKien: `Nút ${lkId.slice(5)} (Loại khác): phủ định 8414.30.40 nên ${rSrc.nguong.daiLuong} ${dinhDangKhoang({ ...bu, donVi: rSrc.nguong.donVi })}`,
              trich: rSrc.trich,
              nguong: { daiLuong: rSrc.nguong.daiLuong, donVi: rSrc.nguong.donVi, ...bu },
              duKien: rSrc.duKien,
              ghiChu: `phuDinh: bieu:84143040 — Phần bù đồng thời (AND của phủ định OR) từ 8414.30.40.`,
            });
            rSrc.voi = ['bieu:84143090'];
          }
        } else {
          // Trục chính (bỏ hậu tố nhánh nếu từ 8413704/841381 gom về 1 trục chung để kiểm chứng bổ sung)
          const khoangThuc = [];
          const nguonSrc = [];
          let daiLuongChinh = null;
          let donViChinh = null;
          let daDu = true;
          for (const id of coNguong) {
            const rs = theoNut.get(id) || [];
            if (rs.length !== 1) { daDu = false; break; }
            const baseDl = rs[0].nguong.daiLuong.replace(/\s*\((?:không điện|bơm\/máy điện)\)$/, '');
            if (daiLuongChinh === null) { daiLuongChinh = baseDl; donViChinh = rs[0].nguong.donVi; }
            else if (daiLuongChinh !== baseDl || donViChinh !== rs[0].nguong.donVi) { daDu = false; break; }
            // Tránh khoảng trùng khi gộp .42/.43
            if (!khoangThuc.some((k) => k.tu === rs[0].nguong.tu && k.den === rs[0].nguong.den)) {
              khoangThuc.push({ ...rs[0].nguong });
            }
            nguonSrc.push(rs[0]);
          }
          const bu = daDu ? tinhBuMotKhoang(khoangThuc) : null;
          if (bu && nguonSrc.length) {
            const ref = nguonSrc[nguonSrc.length - 1];
            const dlLk = laCumDacBiet ? `${daiLuongChinh} (Loại khác)` : daiLuongChinh;
            them({
              nut: lkId,
              cau: ref.cau,
              loai: 'NGUONG',
              voi: [...coNguong],
              dieuKien: `Nút ${lkId.slice(5)} (Loại khác): phủ định ${coNguong.map((x) => x.slice(5)).join(', ')} nên ${daiLuongChinh} ${dinhDangKhoang({ ...bu, donVi: donViChinh })}`,
              trich: ref.trich,
              nguong: { daiLuong: dlLk, donVi: donViChinh, ...bu },
              duKien: ref.duKien,
              ghiChu: `phuDinh: ${coNguong.join(', ')} — Phần bù dải của ${coNguong.map((x) => x.slice(5)).join(', ')} theo quy tắc "Loại khác".`,
            });
            for (const rSrc of nguonSrc) {
              const allSibs = [...coNguong, lkId].filter((v) => v !== rSrc.nut);
              rSrc.voi = allSibs;
            }
          }
        }
      }
    }

    // 2c. Gắn voi cho mọi anh em chia cùng (daiLuong, donVi) mà trước đó chưa có voi
    const theoKhoaSau = new Map();
    for (const id of con) {
      for (const r of theoNut.get(id) || []) {
        const kk = khoaNguong(r.nguong);
        if (!theoKhoaSau.has(kk)) theoKhoaSau.set(kk, new Set());
        theoKhoaSau.get(kk).add(id);
      }
    }
    for (const [, nutSet] of theoKhoaSau) {
      if (nutSet.size < 2) continue;
      const arr = [...nutSet].sort();
      for (const id of arr) {
        const rs = theoNut.get(id) || [];
        for (const r of rs) {
          if (arr.some((other) => other !== id && (theoNut.get(other) || []).some((x) => khoaNguong(x.nguong) === khoaNguong(r.nguong)))) {
            if (!r.voi) r.voi = arr.filter((x) => x !== id);
          }
        }
      }
    }
  }

  // 3. Ghi nhận chỗ hở dải thực tế trong biểu thuế Chương 84 (ví dụ 8408.90 trước khi nối .909: <= 18.65 và > 100)
  ghiNhanLuat.push({
    loai: 'BU_KHOANG_GIUA_LOAI_KHAC',
    moTa: 'bieu:840890: bieu:84089010 (<= 18,65 kW) và bieu:8408905 (> 100 kW) chừa khoảng giữa (18,65; 100] kW cho dòng bieu:8408909 ("Loại khác").',
    cauLienQuan: ['bieu:84089010#1', 'bieu:8408905#1'],
  });

  // 4. Hợp nhất các bản ghi phi-biểu (Phần XVI + Chú giải + SEN + Nhóm)
  const phiBieu = ch2 === '84' ? layDacTaPhiBieu84(L) : [];

  // 5. Đóng gói theo khuôn ho-so-ma@1 & kiểm duKien/trich trước khi trả về
  const theoTep = new Map();
  const loi = [];
  const allDrafts = [];
  for (const [, list] of theoNut) allDrafts.push(...list);

  // Sắp theo nút để đánh ID hs:<nut>:84xx ổn định
  allDrafts.sort((a, b) => a.nut.localeCompare(b.nut) || a.nguong.daiLuong.localeCompare(b.nguong.daiLuong));
  const seqNut = new Map();

  for (const d of [...phiBieu, ...allDrafts]) {
    const chu = L.chuCau(d.cau);
    if (!chu) { loi.push(`Không tìm thấy câu ${d.cau}`); continue; }
    const nNguon = L.nut.get(L.cau.get(d.cau).nut);
    const key = G.tepCuaNut(d.nut, 'nguong');
    if (!key) { loi.push(`Nút ${d.nut} không ánh xạ được tệp nguong/`); continue; }
    let id = d.id;
    if (!id) {
      const k = (seqNut.get(d.nut) || 0) + 1;
      seqNut.set(d.nut, k);
      id = `hs:${d.nut}:${8400 + k}`;
    }
    const rec = {
      id,
      nut: d.nut,
      loai: d.loai || 'NGUONG',
      dieuKien: d.dieuKien,
      trich: d.trich,
      cau: d.cau,
      ...(d.voi?.length ? { voi: [...new Set(d.voi)].sort() } : {}),
      nguong: { ...d.nguong },
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

  return { L, theoTep, loi, ghiNhanLuat };
}

/** Ghi các tệp JSONL cho Chương ch2 vào data/ho-so-ma/nguong/. */
export function ghiKhoNguongChuong(chuong, { luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH } = {}) {
  const { L, theoTep, loi, ghiNhanLuat } = dungBanGhiNguongChuong(chuong, { luat });
  if (loi.length) throw new Error(`Lỗi dựng kho ngưỡng C${chuong}:\n${loi.join('\n')}`);
  const outDir = path.join(hoSo, 'nguong');
  fs.mkdirSync(outDir, { recursive: true });
  const daGhi = [];
  for (const [rel, list] of [...theoTep.entries()].sort()) {
    const abs = path.join(hoSo, rel);
    fs.writeFileSync(abs, `${list.map((x) => JSON.stringify(x)).join('\n')}\n`, 'utf8');
    daGhi.push({ rel, soBanGhi: list.length });
  }
  return { L, daGhi, ghiNhanLuat };
}

const chongKhoang = (a, b) => {
  const truoc = (x, y) => x.den !== null && y.tu !== null && (x.den < y.tu || (x.den === y.tu && !(x.gomDen && y.gomTu)));
  return !truoc(a, b) && !truoc(b, a);
};

/** Kiểm tra nội bộ toàn bộ cụm phân dải anh em của một danh sách bản ghi NGUONG. */
export function kiemDaiAnhEm(banGhi, L) {
  const nguongList = banGhi.filter((x) => x && x.loai === 'NGUONG' && x.nguong);
  const nhomTheoCha = new Map();
  for (const r of nguongList) {
    const cha = L.cay.theoId.get(r.nut)?.cha;
    if (!cha) continue;
    const kk = `${cha}||${khoaNguong(r.nguong)}`;
    if (!nhomTheoCha.has(kk)) nhomTheoCha.set(kk, new Map());
    const m = nhomTheoCha.get(kk);
    if (!m.has(r.nut)) m.set(r.nut, r);
  }
  const cumDaKiem = [];
  const loi = [];
  for (const [kk, mapNut] of [...nhomTheoCha.entries()].sort()) {
    if (mapNut.size < 2) continue;
    const [cha, daiDonVi] = kk.split('||');
    const [daiLuong, donVi] = daiDonVi.split('|');
    const items = [...mapNut.values()].sort((a, b) => (a.nguong.tu ?? -Infinity) - (b.nguong.tu ?? -Infinity));
    const lapLoi = [];
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (chongKhoang(items[i].nguong, items[j].nguong)) {
          lapLoi.push(`Chồng dải giữa ${items[i].nut} và ${items[j].nut}`);
        }
      }
    }
    for (let i = 1; i < items.length; i += 1) {
      const a = items[i - 1].nguong;
      const b = items[i].nguong;
      if (a.den === null || b.tu === null) continue;
      if (a.den < b.tu || (a.den === b.tu && !a.gomDen && !b.gomTu)) {
        lapLoi.push(`Hở dải giữa ${items[i - 1].nut} (${a.den}) và ${items[i].nut} (${b.tu})`);
      }
    }
    loi.push(...lapLoi.map((msg) => `${cha} [${daiLuong} (${donVi})]: ${msg}`));
    cumDaKiem.push({
      cha,
      daiLuong,
      donVi: donVi || null,
      soAnhEm: items.length,
      phuKin: lapLoi.length === 0 && items[0].nguong.tu === null && items[items.length - 1].nguong.den === null,
    });
  }
  return { cumDaKiem, loi };
}

function main() {
  const argv = process.argv.slice(2);
  const idx = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const chuong = idx('--chuong') || '84';
  const luat = path.resolve(idx('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(idx('--ho-so') || G.HO_SO_MAC_DINH);

  if (argv.includes('--tao')) {
    const { L, daGhi, ghiNhanLuat } = ghiKhoNguongChuong(chuong, { luat, hoSo });
    const kho = kiemKhoHoSo(hoSo);
    const dai = kiemDaiAnhEm(kho.banGhi, L);
    console.log(`Đã tạo kho M-74 Chương ${chuong}:`, JSON.stringify({ daGhi, khuonLoi: kho.loi.length, cumKiem: dai.cumDaKiem.length, daiLoi: dai.loi.length, ghiNhan: ghiNhanLuat.length }));
    if (kho.loi.length || dai.loi.length) {
      for (const l of [...kho.loi, ...dai.loi]) console.error('  ✗', l);
      process.exit(1);
    }
    return;
  }

  if (argv.includes('--bao-cao')) {
    const L = napLuatCong(luat);
    const kho = kiemKhoHoSo(hoSo);
    const dai = kiemDaiAnhEm(kho.banGhi, L);
    console.log(JSON.stringify({
      tongBanGhi: kho.banGhi.length,
      khuonLoi: kho.loi,
      cumKiem: dai.cumDaKiem.length,
      phuKin: dai.cumDaKiem.filter((x) => x.phuKin).length,
      daiLoi: dai.loi,
    }, null, 2));
    return;
  }

  const L = napLuatCong(luat);
  const kho = kiemKhoHoSo(hoSo);
  const rCong45 = chayCong({ luat, hoSo, phamVi: [chuong], cong: [4, 5], L });
  const rCong3 = chayCong({ luat, hoSo, phamVi: [chuong], cong: [3], L });
  const loiNguongC3 = rCong3.cong[3].loi.filter((x) => /NGUONG chồng dải|: dải |: voi /.test(x));
  const dai = kiemDaiAnhEm(kho.banGhi, L);

  let coLoi = 0;
  console.log(`${kho.loi.length ? 'FAIL' : 'PASS'} khuôn M-74 C${chuong}: ${kho.banGhi.length} bản ghi, ${kho.loi.length} lỗi`);
  for (const l of kho.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  for (const k of [4, 5]) {
    const c = rCong45.cong[k];
    console.log(`${c.loi.length ? 'FAIL' : 'PASS'} cổng ${k} ${c.ten} (phạm vi ${chuong}): ${c.soKiem} mục kiểm, ${c.loi.length} lỗi`);
    for (const l of c.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  }
  console.log(`${loiNguongC3.length ? 'FAIL' : 'PASS'} cổng 3 ANH EM (riêng NGUONG/voi, phạm vi ${chuong}): ${loiNguongC3.length} lỗi`);
  for (const l of loiNguongC3) { console.log(`  ✗ ${l}`); coLoi = 1; }
  console.log(`${dai.loi.length ? 'FAIL' : 'PASS'} kiểm dải NGUONG (${dai.cumDaKiem.length} cụm anh em, ${dai.cumDaKiem.filter((x) => x.phuKin).length} phủ kín): ${dai.loi.length} lỗi`);
  for (const l of dai.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  process.exit(coLoi);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
