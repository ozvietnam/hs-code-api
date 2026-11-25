#!/usr/bin/env node
/**
 * scripts/luat-goc/phan-trich.mjs — Trích xuất tất định 21 Phần (phan:I..phan:XXI) từ Chú giải HS 2022.
 * Đọc LUAT_GOC_TXT/cgct-hs2022.txt (ngoài repo), xuất data/luat-goc/phan.jsonl chuẩn khuôn nut-luat@1.
 * KHÔNG dùng AI, KHÔNG đọc dữ liệu cũ trong repo; mọi sửa lỗi PDF nằm trong bảng SUA_TAY.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MAC_DINH_RA = path.join(GOC, 'data/luat-goc/phan.jsonl');
export const VAN_BAN_NGUON = 'Chú giải chi tiết HS 2022 (bản dịch kèm CV 1810/TCHQ-TXNK 2024)';
export const ROMANS = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
  'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI',
];
const ROMAN_SET = new Set(ROMANS);

/** Mọi xử lý đặc biệt cho dị bản định dạng của bản PDF HQKV8. */
export const SUA_TAY = {
  anhTrangTrinh: [
    { phan: 'I', trang: 8, chu: 'Phong cảnh Vịnh Hạ Long', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần I' },
    { phan: 'II', trang: 61, chu: 'Hoàng hôn trên Vịnh Hạ Long', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần II' },
    { phan: 'III', trang: 148, chu: 'Đỉnh thiêng Yên Tử', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần III' },
    { phan: 'IV', trang: 178, chu: 'Góc nhìn toàn cảnh TP từ trên cao', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần IV' },
    { phan: 'V', trang: 268, chu: 'Phong cảnh Hạ Long từ đỉnh núi Bài Thơ', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần V' },
    { phan: 'VI', trang: 330, chu: 'Cảng hàng không quốc tế Vân Đồn', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần VI' },
    { phan: 'VII', trang: 871, chu: 'Cung Quy hoạch & triển lãm Quảng Ninh', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần VII' },
    { phan: 'VIII', trang: 951, chu: 'Phong cảnh Cô Tô từ ngọn Hải Đăng', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần VIII' },
    { phan: 'IX', trang: 980, chu: 'View Vịnh Hạ Long từ đào Ti Tốp', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần IX' },
    { phan: 'X', trang: 1061, chu: 'Tượng Bác Hồ trên đảo Cô Tô', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần X' },
    { phan: 'XI', trang: 1150, chu: 'Công viên Hạ Long', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XI' },
    { phan: 'XII', trang: 1338, chu: 'Nghỉ đêm trên Vịnh Hạ Long', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XII' },
    { phan: 'XIII', trang: 1366, chu: 'Tượng Đức ông Trần Quốc Tảng tại Đền Cửa Ông', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XIII' },
    { phan: 'XIV', trang: 1451, chu: 'Hạ Long khi TP lên đèn', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XIV' },
    { phan: 'XV', trang: 1494, chu: 'Eo gió Quan Lạn', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XV' },
    { phan: 'XVI', trang: 1692, chu: 'Phong cảnh chùa Ngọa Vân – Đông Triều', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XVI' },
    { phan: 'XVII', trang: 2101, chu: 'Sân Golf FLC Hạ Long', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XVII' },
    { phan: 'XVIII', trang: 2164, chu: 'Vịnh Bái Tử Long', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XVIII' },
    { phan: 'XIX', trang: 2325, chu: 'Cửa khẩu Quốc tế Móng Cái ( Bắc Luân 2)', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XIX' },
    { phan: 'XX', trang: 2335, chu: 'Cảng tàu khách Quốc tế Hạ Long', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XX' },
    { phan: 'XXI', trang: 2397, chu: 'Quảng Ninh trước ngày lên Thành phố (trực thuộc Trung ương', lyDo: 'Chú thích ảnh trang trí HQKV8 cuối Phần XXI (thiếu dấu đóng ngoặc trong PDF)' },
  ],
  chuGiaiKhongCham: [
    { phan: 'XVI', trang: 1684, mau: /^6\s+\(A\)\s+/, lyDo: 'Chú giải 6 Phần XVI thiếu dấu chấm sau số 6 (viết "6 (A)")' },
  ],
  doanVeNutCha: [
    { phan: 'XI', trang: 1127, nutCha: 'phan:XI:cg:2:A', batDau: 'Khi không có một vật liệu dệt nào chiếm khối lượng trội hơn', lyDo: 'Đoạn kết của mục 2(A) Phần XI không có thụt đầu dòng riêng' },
    { phan: 'XV', trang: 1489, nutCha: 'phan:XV:cg:2', batDau: 'Từ Chương 73 đến Chương 76', lyDo: 'Hai đoạn tiếp theo sau mục (c) thuộc thẳng Chú giải 2 Phần XV' },
    { phan: 'XV', trang: 1489, nutCha: 'phan:XV:cg:2', batDau: 'Theo nội dung trên và theo Chú giải 1 của Chương 83', lyDo: 'Đoạn cuối Chú giải 2 Phần XV tiếp sau đoạn "Từ Chương 73..."' },
    { phan: 'XVII', trang: 2096, nutCha: 'phan:XVII:cg:5', batDau: 'Bộ phận và phụ kiện của các phương tiện chạy trên đệm không khí', lyDo: 'Hai đoạn tiếp theo sau mục (c) thuộc thẳng Chú giải 5 Phần XVII' },
    { phan: 'XVII', trang: 2096, nutCha: 'phan:XVII:cg:5', batDau: 'Các bộ phận cố định và khớp nối của đường ray tàu chạy trên đệm không khí', lyDo: 'Đoạn cuối Chú giải 5 Phần XVII' },
  ],
  bangPhanXI: {
    trangBangI: [1139, 1140],
    trangBangII: [1141, 1142],
    lyDo: 'Bảng I (tr.1139-1140) và BẢNG II (tr.1141-1142) Phần XI có 3 cột bị dòng stream xáo chữ; lấy nguyên văn căn cột từ cgct-hs2022-layout.txt để đọc đúng hàng và khớp tuyệt đối bản chữ.',
  },
};

const anhTheoTrang = new Map(SUA_TAY.anhTrangTrinh.map((a) => [a.trang, a.chu]));
const RE_SO_TRANG = /^\s*[—–-]?\s*\d{1,4}\s*[—–-]?\s*$/;
const RE_DAU_SAO = /^\s*\*+\s*$/;
const RE_CHUONG = /^Chương\s+\d+\s*:/i;

/** Tách toàn bộ văn bản thành danh sách trang (1-based index + 1). */
export function tachTrang(vanBan) {
  return String(vanBan).normalize('NFC').replace(/\r\n/g, '\n').split('\f');
}

/** Xác định dải trang [startPage, endPage] (1-based) của từng Phần I..XXI trước Chương đầu tiên. */
export function timDaiTrangPhan(trangList) {
  const startByRoman = new Map();
  // Bỏ 7 trang mục lục đầu (p.1..p.7)
  for (let i = 7; i < trangList.length; i++) {
    const lines = trangList[i].split('\n').map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      const m = l.match(/^PHẦN\s+([IVX]+)\s*[:\-–]?/);
      if (m && ROMAN_SET.has(m[1]) && !startByRoman.has(m[1])) {
        startByRoman.set(m[1], i + 1);
      }
    }
  }
  const ketQua = [];
  for (const roman of ROMANS) {
    const startPage = startByRoman.get(roman);
    if (!startPage) throw new Error(`Không tìm thấy trang bắt đầu của PHẦN ${roman}`);
    let firstChapterPage = null;
    for (let p = startPage; p <= trangList.length; p++) {
      const lines = trangList[p - 1].split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.some((l) => RE_CHUONG.test(l))) {
        firstChapterPage = p;
        break;
      }
    }
    if (!firstChapterPage) throw new Error(`Không tìm thấy Chương đầu của PHẦN ${roman}`);
    ketQua.push({ roman, startPage, endPage: firstChapterPage - 1 });
  }
  return ketQua;
}

/** Làm sạch các dòng của một Phần, giữ kèm số trang 1-based; kiểm tra chú thích ảnh HQKV8 đã bỏ. */
export function lamSachDongPhan(trangList, { roman, startPage, endPage }) {
  const dong = [];
  let daBoAnh = false;
  const anhKyVong = anhTheoTrang.get(endPage);
  for (let p = startPage; p <= endPage; p++) {
    const rawLines = trangList[p - 1].split('\n');
    for (let idx = 0; idx < rawLines.length; idx++) {
      const text = rawLines[idx].trim().normalize('NFC');
      if (!text) continue;
      if (RE_SO_TRANG.test(text)) continue;
      if (RE_DAU_SAO.test(text)) continue;
      if (p === endPage && anhKyVong && text === anhKyVong) {
        daBoAnh = true;
        continue;
      }
      dong.push({ trang: p, text });
    }
  }
  if (anhKyVong && !daBoAnh) {
    throw new Error(`Không thấy chú thích ảnh kỳ vọng ở PHẦN ${roman} tr.${endPage}: "${anhKyVong}"`);
  }
  return dong;
}

function taoNut({ id, loai, lop, cha, so, nguyenVan, trang }) {
  return {
    id,
    loai,
    lop,
    cha,
    so,
    nguyenVan: nguyenVan.normalize('NFC').replace(/\s+/g, ' ').trim(),
    nguon: { vanBan: VAN_BAN_NGUON, ban: 'HS2022', trang },
    hieuLuc: { tu: null, den: null },
  };
}

function noiDong(arr) {
  return arr.map((x) => (typeof x === 'string' ? x : x.text)).join(' ').replace(/\s+/g, ' ').trim();
}

function docBangTuLayout(trangLayoutList, startMarkerRegex, trangSet) {
  const dong = [];
  let batDau = false;
  for (const p of trangSet) {
    const raw = (trangLayoutList[p - 1] || '').split('\n');
    for (const line of raw) {
      const t = line.trim().normalize('NFC');
      if (!t || RE_SO_TRANG.test(t) || RE_DAU_SAO.test(t)) continue;
      if (!batDau) {
        if (startMarkerRegex.test(t)) batDau = true;
        else continue;
      }
      if (/^Chú thích cuối trang/.test(t)) return dong;
      dong.push(line.replace(/\s+$/, '').normalize('NFC'));
    }
  }
  return dong;
}

function gopBangXI(dong, trangLayoutList) {
  // Thay vùng BẢNG I (tr.1139-1140) và BẢNG II (tr.1141-1142) bằng đúng dòng đã giữ cột của cgct-hs2022-layout.txt
  const bangILines = docBangTuLayout(trangLayoutList, /^BẢNG I:/, SUA_TAY.bangPhanXI.trangBangI);
  const bangIILines = docBangTuLayout(trangLayoutList, /^BẢNG II$/, SUA_TAY.bangPhanXI.trangBangII);
  const ra = [];
  let i = 0;
  while (i < dong.length) {
    const cur = dong[i];
    if (cur.trang === 1139 && cur.text === 'BẢNG I:') {
      const trangBang = cur.trang;
      i++;
      while (i < dong.length && !/^Chú thích cuối trang/.test(dong[i].text)) i++;
      for (const row of bangILines) ra.push({ trang: trangBang, text: row, giuXuongDong: true });
      continue;
    }
    if (cur.trang === 1141 && cur.text === 'BẢNG II') {
      const trangBang = cur.trang;
      i++;
      while (i < dong.length && !/^Chú thích cuối trang/.test(dong[i].text)) i++;
      for (const row of bangIILines) ra.push({ trang: trangBang, text: row, giuXuongDong: true });
      continue;
    }
    ra.push(cur);
    i++;
  }
  return ra;
}

/** Phân tích vùng Chú giải (`cg`) hoặc Chú giải Phân nhóm (`cgpn`) thành các nút cây. */
function phanTichChuGiai(dong, { phanId, prefix, loai }) {
  if (!dong.length) return [];
  const nuts = [];
  // Stack phần tử: { level: 'num'|'upper'|'lower'|'roman', token, node }
  const stack = [];
  let lastTopNum = 0;

  const pushNode = (level, token, cha, text, trang) => {
    const id = `${cha}:${token}`;
    // Trường hợp cha là điểm số có dạng `1. (A)` nhưng chưa tách nút cha
    const node = {
      id,
      loai,
      lop: 'LUAT',
      cha,
      so: token,
      parts: text ? [text] : [],
      trang,
    };
    nuts.push(node);
    return node;
  };

  const ensureParentChain = (targetLevel, trang, firstLineNumToken = null) => {
    const rank = { num: 1, upper: 2, lower: 3, roman: 4 };
    while (stack.length && rank[stack[stack.length - 1].level] >= rank[targetLevel]) {
      stack.pop();
    }
    return stack;
  };

  for (const item of dong) {
    const { trang, text } = item;
    // Kiểm tra đoạn cuối quay về nút cha theo SUA_TAY
    const tailRule = SUA_TAY.doanVeNutCha.find((r) => r.trang === trang && text.startsWith(r.batDau));
    if (tailRule) {
      const target = nuts.find((n) => n.id === tailRule.nutCha);
      if (!target) throw new Error(`Không tìm thấy nút cha "${tailRule.nutCha}" trên tr.${trang}`);
      // Đưa stack về đúng cấp của target
      while (stack.length && stack[stack.length - 1].node.id !== tailRule.nutCha) stack.pop();
      target.parts.push('\n' + text);
      continue;
    }

    // 1. Kiểm tra đánh số cấp 1: "N." hoặc "N.(A)..." hoặc trường hợp đặc biệt XVI "6 (A)..."
    let mNum = text.match(/^(\d{1,2})\.(?:\s*(.*))?$/);
    if (!mNum) {
      const sp = SUA_TAY.chuGiaiKhongCham.find((r) => r.trang === trang && r.mau.test(text));
      if (sp) {
        const mSpecial = text.match(/^(\d{1,2})\s+(.*)$/);
        if (mSpecial) mNum = [text, mSpecial[1], mSpecial[2]];
      }
    }
    if (mNum && Number(mNum[1]) === lastTopNum + 1) {
      lastTopNum = Number(mNum[1]);
      stack.length = 0;
      const rest = (mNum[2] || '').trim();
      const numId = `${phanId}:${prefix}:${lastTopNum}`;
      // Nếu ngay dòng đầu đã mở bằng (A) hoặc (a) thì phần số đứng làm cha ngắn
      const mSubImmediate = rest.match(/^\(([A-Z])\)(?:\s+(.*))?$/);
      if (mSubImmediate) {
        const parentNode = {
          id: numId,
          loai,
          lop: 'LUAT',
          cha: phanId,
          so: String(lastTopNum),
          parts: [`${lastTopNum}.`],
          trang,
        };
        nuts.push(parentNode);
        stack.push({ level: 'num', token: String(lastTopNum), node: parentNode });

        const upperToken = mSubImmediate[1];
        const upperNode = pushNode('upper', upperToken, numId, `(${upperToken})${mSubImmediate[2] ? ' ' + mSubImmediate[2].trim() : ''}`, trang);
        stack.push({ level: 'upper', token: upperToken, node: upperNode });
      } else {
        const numNode = {
          id: numId,
          loai,
          lop: 'LUAT',
          cha: phanId,
          so: String(lastTopNum),
          parts: [text],
          trang,
        };
        nuts.push(numNode);
        stack.push({ level: 'num', token: String(lastTopNum), node: numNode });
      }
      continue;
    }

    // 2. Mục chữ hoa (A), (B), (C)
    const mUpper = text.match(/^\(([A-Z])\)(?:\s+(.*))?$/);
    if (mUpper && stack.length >= 1) {
      ensureParentChain('upper', trang);
      const cha = stack[stack.length - 1].node.id;
      const node = pushNode('upper', mUpper[1], cha, text, trang);
      stack.push({ level: 'upper', token: mUpper[1], node });
      continue;
    }

    // 3. Mục số La Mã nhỏ (i), (ii), (iii)...: chỉ mở danh sách La Mã từ (i), hoặc nối tiếp khi đang ở cấp roman
    const mRoman = text.match(/^\((i|ii|iii|iv|v|vi|vii|viii|ix|x)\)(?:\s+(.*))?$/);
    const dangORoman = stack.some((s) => s.level === 'roman');
    if (mRoman && stack.length >= 1 && (mRoman[1] === 'i' || dangORoman)) {
      ensureParentChain('roman', trang);
      const cha = stack[stack.length - 1].node.id;
      const node = pushNode('roman', mRoman[1], cha, text, trang);
      stack.push({ level: 'roman', token: mRoman[1], node });
      continue;
    }

    // 4. Mục chữ thường (a)..(z), (ij), (đ)
    const mLower = text.match(/^\((ij|[a-zđ])\)(?:\s+(.*))?$/);
    if (mLower && mLower[1] !== 'i' && stack.length >= 1) {
      // Ngoại lệ có chữ thường kiểu `(b) (b) Tóc người...` trong Phần XI: giữ nguyên văn dòng PDF
      ensureParentChain('lower', trang);
      const cha = stack[stack.length - 1].node.id;
      const node = pushNode('lower', mLower[1], cha, text, trang);
      stack.push({ level: 'lower', token: mLower[1], node });
      continue;
    }

    // 5. Dòng nối tiếp của nút hiện hành trên đỉnh stack
    if (!stack.length) {
      throw new Error(`Dòng lạc ngoài Chú giải (${phanId} tr.${trang}): "${text}"`);
    }
    stack[stack.length - 1].node.parts.push(text);
  }

  return nuts.map((n) => {
    const joined = n.parts
      .map((p, idx) => (idx === 0 || p.startsWith('\n') ? p : ' ' + p))
      .join('')
      .normalize('NFC')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
    return {
      id: n.id,
      loai: n.loai,
      lop: n.lop,
      cha: n.cha,
      so: n.so,
      nguyenVan: joined,
      nguon: { vanBan: VAN_BAN_NGUON, ban: 'HS2022', trang: n.trang },
      hieuLuc: { tu: null, den: null },
    };
  });
}

/** Chia phần TỔNG QUÁT / KHÁI QUÁT CHUNG thành các nút `:kq:1..N`. */
function phanTichKhaiQuat(dong, { roman, phanId, trangLayoutList }) {
  if (!dong.length) return [];
  const dongGop = roman === 'XI' ? gopBangXI(dong, trangLayoutList) : dong;
  const segments = [];
  let current = null;

  const startNew = (trang, text, giuXuongDong) => {
    current = { trang, lines: [{ text, giuXuongDong }] };
    segments.push(current);
  };

  for (const item of dongGop) {
    const t = item.text;
    let isSplit = false;
    if (roman === 'VI' && /^Chú giải \d+\.$/.test(t)) isSplit = true;
    else if (roman === 'VII' && /^Chú giải Phần \d+\.$/.test(t)) isSplit = true;
    else if (roman === 'XI') {
      const trimmed = t.trim();
      if (
        /^\(I\)\s+CÁC CHƯƠNG/.test(trimmed) ||
        /^BẢNG I:/.test(trimmed) ||
        /^\(3\)\s+Sợi đã đóng gói/.test(trimmed) ||
        /^BẢNG II$/.test(trimmed) ||
        /^\(C\)\s+Vải dệt thoi$/.test(trimmed) ||
        /^Chú giải chi tiết phân nhóm\.$/.test(trimmed) ||
        /^\(II\)\s+CÁC CHƯƠNG/.test(trimmed) ||
        /^\(III\)\s+CÁC SẢN PHẨM/.test(trimmed) ||
        /^\(IV\)\s+MẶT HÀNG/.test(trimmed) ||
        /^\(V\)\s+MÔI TRƯỜNG/.test(trimmed)
      ) isSplit = true;
    } else if (roman === 'XV' && /^\([A-C]\)\s+[A-ZĐÂĂÊÔƠƯ]/.test(t)) isSplit = true;
    else if ((roman === 'XVI' || roman === 'XVII') && /^\([IVX]+\)\s+[A-ZĐÂĂÊÔƠƯ]/.test(t)) isSplit = true;

    if (isSplit || !current) {
      startNew(item.trang, t, Boolean(item.giuXuongDong));
    } else {
      current.lines.push({ text: t, giuXuongDong: Boolean(item.giuXuongDong) });
    }
  }

  return segments.map((seg, idx) => {
    const out = [];
    for (let i = 0; i < seg.lines.length; i++) {
      const l = seg.lines[i];
      if (i === 0) {
        out.push(l.text);
      } else if (l.giuXuongDong || seg.lines[i - 1].giuXuongDong) {
        out.push('\n' + l.text);
      } else {
        out.push(' ' + l.text);
      }
    }
    const text = out.join('').normalize('NFC').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
    const k = idx + 1;
    return {
      id: `${phanId}:kq:${k}`,
      loai: 'KHAI_QUAT',
      lop: 'HUONG_DAN',
      cha: phanId,
      so: String(k),
      nguyenVan: text,
      nguon: { vanBan: VAN_BAN_NGUON, ban: 'HS2022', trang: seg.trang },
      hieuLuc: { tu: null, den: null },
    };
  });
}

/** Phân tích đầy đủ một Phần từ danh sách dòng đã làm sạch. */
export function phanTichMotPhan(dong, roman, startPage, trangLayoutList = []) {
  const phanId = `phan:${roman}`;
  const isTitleEnd = (t) =>
    t === `CHÚ GIẢI PHẦN ${roman}` ||
    t === 'Chú giải.' ||
    t === 'Chú giải' ||
    t === 'TỔNG QUÁT' ||
    t === 'KHÁI QUÁT CHUNG';

  let idx = 0;
  const tenLines = [];
  while (idx < dong.length && !isTitleEnd(dong[idx].text)) {
    tenLines.push(dong[idx]);
    idx++;
  }
  if (!tenLines.length) throw new Error(`Thiếu tiêu đề PHẦN ${roman}`);

  const nuts = [
    taoNut({
      id: phanId,
      loai: 'TEN',
      lop: 'LUAT',
      cha: null,
      so: null,
      nguyenVan: noiDong(tenLines),
      trang: startPage,
    }),
  ];

  const cgDong = [];
  const cgpnDong = [];
  const kqDong = [];
  let zone = 'none';

  for (; idx < dong.length; idx++) {
    const item = dong[idx];
    const t = item.text;
    if (t === `CHÚ GIẢI PHẦN ${roman}` || t === 'Chú giải.' || t === 'Chú giải') {
      if (zone === 'none') zone = 'cg';
      if (zone === 'cg' && cgDong.length === 0) continue;
    }
    if (t === 'Chú giải Phân nhóm.' && zone === 'cg') {
      zone = 'cgpn';
      continue;
    }
    if ((t === 'TỔNG QUÁT' || t === 'KHÁI QUÁT CHUNG') && zone !== 'kq') {
      zone = 'kq';
      continue;
    }
    if (zone === 'cg') cgDong.push(item);
    else if (zone === 'cgpn') cgpnDong.push(item);
    else if (zone === 'kq') kqDong.push(item);
  }

  nuts.push(...phanTichChuGiai(cgDong, { phanId, prefix: 'cg', loai: 'CHU_GIAI' }));
  nuts.push(...phanTichChuGiai(cgpnDong, { phanId, prefix: 'cgpn', loai: 'CHU_GIAI_PHAN_NHOM' }));
  nuts.push(...phanTichKhaiQuat(kqDong, { roman, phanId, trangLayoutList }));

  return nuts;
}

/** Trích toàn bộ 21 Phần từ nội dung `cgct-hs2022.txt` (kèm bản `-layout` cho bảng Phần XI). Trả về `{ nuts, thongKe }`. */
export function trichTatCaPhan(vanBan, vanBanLayout = '') {
  const trangList = tachTrang(vanBan);
  const trangLayoutList = vanBanLayout ? tachTrang(vanBanLayout) : [];
  const dai = timDaiTrangPhan(trangList);
  const nuts = [];
  const thongKe = [];
  for (const span of dai) {
    const dong = lamSachDongPhan(trangList, span);
    const phanNuts = phanTichMotPhan(dong, span.roman, span.startPage, trangLayoutList);
    nuts.push(...phanNuts);
    thongKe.push({
      phan: span.roman,
      trangDau: span.startPage,
      trangCuoi: span.endPage,
      tong: phanNuts.length,
      cg: phanNuts.filter((x) => x.loai === 'CHU_GIAI').length,
      cgpn: phanNuts.filter((x) => x.loai === 'CHU_GIAI_PHAN_NHOM').length,
      kq: phanNuts.filter((x) => x.loai === 'KHAI_QUAT').length,
    });
  }
  return { nuts, thongKe };
}

function chayCli() {
  const thuMucTxt = process.env.LUAT_GOC_TXT || path.join(os.homedir(), 'luat-goc-txt');
  const tepVao = path.join(thuMucTxt, 'cgct-hs2022.txt');
  const tepLayout = path.join(thuMucTxt, 'cgct-hs2022-layout.txt');
  if (!fs.existsSync(tepVao)) {
    console.error(`Không thấy tệp nguồn: ${tepVao} (đặt LUAT_GOC_TXT đúng thư mục chứa cgct-hs2022.txt)`);
    process.exit(2);
  }
  const ghi = process.argv.includes('--ghi');
  const layoutTxt = fs.existsSync(tepLayout) ? fs.readFileSync(tepLayout, 'utf8') : '';
  const { nuts, thongKe } = trichTatCaPhan(fs.readFileSync(tepVao, 'utf8'), layoutTxt);
  const jsonl = nuts.map((n) => JSON.stringify(n)).join('\n') + '\n';
  if (ghi) {
    fs.mkdirSync(path.dirname(MAC_DINH_RA), { recursive: true });
    fs.writeFileSync(MAC_DINH_RA, jsonl, 'utf8');
    console.log(`Đã ghi ${nuts.length} nút vào ${path.relative(GOC, MAC_DINH_RA)}`);
  } else {
    console.log(`Chế độ xem thử (${nuts.length} nút); thêm --ghi để xuất ${path.relative(GOC, MAC_DINH_RA)}`);
  }
  for (const r of thongKe) {
    console.log(`  Phần ${r.phan.padEnd(4)} tr.${String(r.trangDau).padStart(4)}..${String(r.trangCuoi).padEnd(4)} | tổng=${String(r.tong).padStart(3)} (cg=${r.cg}, cgpn=${r.cgpn}, kq=${r.kq})`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  chayCli();
}
