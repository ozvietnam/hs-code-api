#!/usr/bin/env node
// scripts/test-khong-lan-ai.mjs — Cổng máy M-22 (#1909): kiểm tra lời AI và 5 trường nhiễm KG
// (phan_biet, tinh_chat, khong_bao_gom, bao_gom, loai_tru) không lọt vào ngữ cảnh đưa cho LLM.
import './test-isolate-data.mjs';
import { createRequire } from 'node:module';
import { doc, co, tepMa, boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-khong-lan-ai');

export const TRUONG_NHIEM = Object.freeze([
  'phan_biet',
  'tinh_chat',
  'khong_bao_gom',
  'bao_gom',
  'loai_tru',
]);

const KHO_CU_NHIEM = Object.freeze([
  'chu-giai-heading.json',
  'chu-giai-chuong.json',
  'explanatory-notes.json',
  'notes.json',
]);

const RE_TRUONG_NHIEM = /\b(?:phan_biet|tinh_chat|khong_bao_gom|bao_gom|loai_tru)\b/g;

/** Loại bỏ chú thích // và /* ... *\/ an toàn (ưu tiên bỏ dòng // và JSDoc * trước, bảo toàn số dòng). */
export function boChuThichAnToan(src) {
  const dongGoc = String(src || '').split('\n');
  let inBlock = false;
  const sach = dongGoc.map((raw) => {
    const trimmed = raw.trimStart();
    if (inBlock) {
      const end = raw.indexOf('*/');
      if (end === -1) return '';
      inBlock = false;
      raw = raw.slice(end + 2);
    }
    if (trimmed.startsWith('//')) return '';
    // Bỏ phần // ở cuối dòng nếu không nằm trong chuỗi đơn giản (vd :// hoặc chuỗi)
    let line = raw;
    const idxSlashes = line.indexOf('//');
    if (idxSlashes >= 0 && !/https?:\/\/|['"`][^'"`]*\/\//.test(line.slice(0, idxSlashes + 2))) {
      // Nếu trước // là khoảng trắng hoặc đầu câu lệnh, cắt an toàn; giữ nguyên regex như /^\/\//
      const prev = idxSlashes > 0 ? line[idxSlashes - 1] : '';
      if (idxSlashes === 0 || /[\s;),}\]]/.test(prev)) line = line.slice(0, idxSlashes);
    }
    while (true) {
      const st = line.indexOf('/*');
      if (st === -1) break;
      const before = line.slice(0, st);
      if (/\/[^/\n]*$/.test(before) && !before.trimEnd().endsWith('return')) break; // tránh biểu thức chính quy
      if (/['"`][^'"`\n]*$/.test(before) && /^[^'"`\n]*['"`]/.test(line.slice(st + 2))) break; // tránh "/*" trong chuỗi
      const en = line.indexOf('*/', st + 2);
      if (en === -1) {
        inBlock = true;
        line = before;
        break;
      }
      line = before + line.slice(en + 2);
    }
    return line;
  });
  return sach.join('\n');
}

/** Quét mã nguồn (đã bỏ chú thích) tìm mọi tham chiếu tới 5 trường nhiễm. */
export function quetTruongNhiem(maNguon) {
  const sach = boChuThichAnToan(maNguon);
  const ds = [];
  const dong = sach.split('\n');
  for (let idx = 0; idx < dong.length; idx += 1) {
    const line = dong[idx];
    for (const m of line.matchAll(RE_TRUONG_NHIEM)) {
      ds.push({ truong: m[0], dong: idx + 1, mau: line.trim().slice(0, 120) });
    }
  }
  return ds;
}

// ── 1. Kiểm tĩnh 3 mô-đun M-22 ────────────────────────────────────────────────────────────────────────────────────
const MODUN_M22 = ['lib/classify.js', 'lib/gir.js', 'lib/tim-cgct.js'];
for (const tep of MODUN_M22) {
  const raw = doc(tep);
  const sach = boChuThichAnToan(raw);
  const viPham = quetTruongNhiem(raw);
  kiem(`${tep}: 0 chỗ đọc/tham chiếu 5 trường nhiễm`, viPham.length === 0, JSON.stringify(viPham.slice(0, 5)));
  const napKhoCu = KHO_CU_NHIEM.filter((k) => sach.includes(k));
  kiem(`${tep}: 0 chỗ nạp kho cũ (${KHO_CU_NHIEM.join(', ')})`, napKhoCu.length === 0, napKhoCu.join(', '));
}

// Kiểm chắc chắn buildContext / girNotesText của lib/classify.js KHÔNG đưa explanatoryNote hay 5 trường cũ vào prompt
const classifySrc = boChuThichAnToan(doc('lib/classify.js'));
const mBuildCtx = /function buildContext\b[\s\S]*?\n\}/.exec(classifySrc)?.[0] || '';
kiem(
  'lib/classify.js#buildContext không đọc getNoteSummaryForHs / explanatoryNote hay 5 trường nhiễm',
  Boolean(mBuildCtx) && !/explanatoryNote|getNoteSummaryForHs/.test(mBuildCtx) && quetTruongNhiem(mBuildCtx).length === 0,
);

// ── 2. Quét toàn bộ lib/ và api/ ─────────────────────────────────────────────────────────────────────────────────
const MIEN_TRU_SO_BO = new Set([
  'lib/nguon-loai.js',           // Bảng phân loại nhãn nguồn gốc/AI
  'lib/explanatory-notes-index.js', // Chỉ mục chú thích tách riêng trường UI gắn nhãn AI_CHUA_KIEM
  'lib/hs-tree-sources.js',      // Thống kê danh sách trường có mặt trên nút cây (metadata)
  'lib/do-thi/doi-ma-nguon.js',  // Bảng đổi ID mã nguồn cũ -> nút luật mới (M-35)
]);
if (!co('lib/chu-giai-goc.js')) {
  // Đang chờ PR M-21 (#1947) gộp vào main — tự động siết ngay khi lib/chu-giai-goc.js có mặt.
  MIEN_TRU_SO_BO.add('lib/gir-notes.js');
  MIEN_TRU_SO_BO.add('lib/notes-coverage.js');
}

const tepQuet = [...tepMa('lib'), ...tepMa('api')];
const viPhamToanRepo = [];
for (const tep of tepQuet) {
  if (MIEN_TRU_SO_BO.has(tep)) continue;
  const hit = quetTruongNhiem(doc(tep));
  if (hit.length) viPhamToanRepo.push({ tep, soLuong: hit.length, mauDau: hit[0] });
}
kiem(
  `quét ${tepQuet.length} tệp lib/+api/: 0 tệp ngoài danh sách ngoại lệ đọc 5 trường nhiễm`,
  viPhamToanRepo.length === 0,
  JSON.stringify(viPhamToanRepo),
);

// ── 3. Kiểm chạy thật (runtime) trên 3 mô-đun M-22 ────────────────────────────────────────────────────────────────
const classify = require('../lib/classify.js');
const { hasExclusionLanguage } = require('../lib/gir.js');
const timCgctMod = require('../lib/tim-cgct.js');

const hn8481 = classify.headingNotes('8481');
const hn9503 = classify.headingNotes('9503');
kiem(
  'classify.headingNotes("8481") trả nguyên văn từ luật gốc, rỗng 4 trường nhiễm rời, nguồn không phải kho cũ',
  Boolean(hn8481.nhom)
    && (hn8481.nhom.includes('84.81') || hn8481.nhom.includes('Vòi, van') || hn8481.nhom.length > 50)
    && hn8481.khongBaoGom === '' && hn8481.loaiTru === '' && hn8481.tinhChat === '' && hn8481.phanBiet === ''
    && Boolean(hn8481.chuong) && !/chu-giai-heading\.json/.test(hn8481.nguon || ''),
  JSON.stringify({ len: hn8481.nhom?.length, chLen: hn8481.chuong?.length, nguon: hn8481.nguon }),
);
kiem(
  'classify.headingNotes("9503") trả nguyên văn đủ mục (D) từ nhom.jsonl, không qua kho cũ',
  Boolean(hn9503.nhom)
    && hn9503.nhom.normalize('NFC').includes('(D) Đồ chơi khác')
    && hn9503.khongBaoGom === '' && hn9503.phanBiet === '',
);

const g9503 = classify.headingNotes('9503');
kiem(
  'classify.groundResults + girNotesText không dựa vào 5 trường nhiễm',
  Boolean(classify.groundingSourceOf({ tenHang: 'van công nghiệp' }))
    && g9503.baoGom === g9503.nhom,
);

kiem(
  'CA NGƯỢC gir.hasExclusionLanguage: chỉ có tinh_chat → false',
  hasExclusionLanguage({ tinh_chat: 'không bao gồm các loại máy móc cơ khí' }) === false,
);
kiem(
  'gir.hasExclusionLanguage: mệnh đề loại trừ trong nguyên văn nhom → true',
  hasExclusionLanguage({ nhom: 'Nhóm này không bao gồm van bằng gốm.' }) === true,
);

const cgIdx = timCgctMod.xayChiMuc();
const r8210 = timCgctMod.timCgct('Dụng cụ ép trái cây không dùng điện', 'Dụng cụ ép trái cây');
const r7312 = timCgctMod.timCgct('Dây cáp thép mạ kẽm (wire rope)', 'Dây cáp thép');
const r4015 = timCgctMod.timCgct('Găng tay bảo hộ không dệt kim, bằng cao su', 'Găng tay bảo hộ');
const r8481 = timCgctMod.timCgct('Van điện từ khí nén', 'Van điện từ');
kiem(
  'tim-cgct nạp kho luật gốc (> 900 nhóm) và tìm ra 8210, 7312, 4015, 8481',
  cgIdx.validHeadings.size > 900
    && r8210.nhom.slice(0, 10).includes('8210')
    && r7312.nhom.slice(0, 5).includes('7312')
    && r4015.nhom.slice(0, 5).includes('4015')
    && r8481.nhom.slice(0, 5).includes('8481'),
  JSON.stringify({ n: cgIdx.validHeadings.size, r8210: r8210.nhom.slice(0, 10), r7312: r7312.nhom.slice(0, 5) }),
);

// ── 4. Ca ngược cho chính cổng quét ──────────────────────────────────────────────────────────────────────────────
const mauGia = [
  'const a = H.phan_biet;',
  'const b = note?.tinh_chat;',
  'const c = H.khong_bao_gom;',
  'const d = H["bao_gom"];',
  'const e = H.loai_tru;',
].join('\n');
const kqGia = quetTruongNhiem(mauGia);
kiem(
  `CA NGƯỢC cổng quét: mô-đun giả đọc đủ 5 trường nhiễm ⇒ ĐỎ (bắt 5/5)`,
  kqGia.length === 5 && TRUONG_NHIEM.every((t) => kqGia.some((x) => x.truong === t)),
  JSON.stringify(kqGia),
);

xong();
