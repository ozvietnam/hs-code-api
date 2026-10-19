#!/usr/bin/env node
/**
 * Trích tên tiếng Trung cấp 6 số từ PDF 《中华人民共和国进出口税则 (2026)》
 * công bố trên gss.mof.gov.cn (Bộ Tài chính, tên miền chính thống mof.gov.cn).
 *
 * Ghi:
 *   data/bieu-thue/zh/hs6-zh.jsonl
 *   data/bieu-thue/zh/thieu.jsonl
 *   data/bieu-thue/zh/raw-index.json
 *   data/bieu-thue/zh/bao-cao.json
 *
 * Quy tắc tên 6-số (theo "Không tự ghép câu"):
 *   - ROW_NAME có 1 dấu "-" → tên 6-số = phần sau dấu (vd "-改良种用" → "改良种用")
 *   - SECTION_HEADER trước row 6-số đầu tiên → tên 6-số = tên section (bỏ dashes)
 *   - ROW_NAME có 2 dấu "--" → tên 6-số = phần sau dashes
 *   - Tên cụt/"其他" → tenZhCha = tên 4-số cha
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR_OUT = join(ROOT, 'data', 'bieu-thue', 'zh');
const DIR_RAW = join(ROOT, 'data', '_src', 'bieu-thue-zh');
fs.mkdirSync(DIR_OUT, { recursive: true });

const TAX = JSON.parse(fs.readFileSync(join(ROOT, 'data', 'tax.json'), 'utf8'));
const HS6_DICH = [...new Set(Object.keys(TAX).map((k) => k.replace(/\D/g, '').slice(0, 6)))].filter((x) => /^\d{6}$/.test(x));
console.log('hs6 cần phủ:', HS6_DICH.length);

const pdfFiles = fs.readdirSync(DIR_RAW).filter((f) => f.endsWith('.pdf'));
if (pdfFiles.length !== 1) { console.error(`Cần đúng 1 PDF trong ${DIR_RAW}`); process.exit(2); }
const PDF_FILE = join(DIR_RAW, pdfFiles[0]);
const PDF_SHA = pdfFiles[0].slice(0, -4);
const PDF_URL = 'http://gss.mof.gov.cn/gzdt/zhengcefabu/202512/P020251231607833453633.pdf';
const PDF_LAY_LUC = new Date(fs.statSync(PDF_FILE).mtime).toISOString();

const buf = fs.readFileSync(PDF_FILE);
const bufSha = createHash('sha256').update(buf).digest('hex');
if (PDF_SHA !== bufSha) { console.error('sha256 mismatch'); process.exit(2); }
console.log('PDF sha256 OK,', buf.length, 'bytes');

const parser = new PDFParse({ data: buf });
const info = await parser.getInfo();
const TOTAL = info.total;
console.log('Trang PDF:', TOTAL);

const ROW_PATTERN = /^(\d+)\s+(\d{4}\.\d{4})\s+(.+)$/;
// Heading 4-số: "XX.XX <tên>：" — tên có thể chứa dấu "，" và xuống dòng giữa chừng
const HEAD_4D = /^(\d{2}\.\d{2})\s+([^：\n]{1,200}?)\s*：\s*$/;
// Section header: 1-4 dấu "-" + tên + ":"; tên có thể xuống dòng giữa chừng (vd "-鲑科鱼，但子目0302.91至\n0302.99的可食用鱼杂碎除外：")
const SECTION_HDR = /^(-{1,4})\s*([^：\n]{1,200}?)\s*：\s*$/;
// Continuation: dòng tiếp tục của dòng trước (không phải row/heading/section mới)
const isRowStart = (s) => /^\d+\s+\d{4}\.\d{4}\s/.test(s);
const isHeading4d = (s) => /^\d{2}\.\d{2}\s+[^：\n]{1,80}：\s*$/.test(s);
const isSection = (s) => /^-{1,4}\s*[^：\n]{1,80}：\s*$/.test(s);
const isPageMark = (s) => /^-- \d+ of \d+ --$/.test(s.trim());
const isNumber = (s) => /^\d+(?:\.\d+)?\s*$/.test(s);

function stripDashesName(s) {
  const m = s.match(/^(-+) ?(.*)$/);
  if (!m) return null;
  return { nest: m[1].length, name: m[2].trim() };
}

function joinLines(content) {
  // Mục tiêu: gộp các dòng thuộc về CÙNG một row/heading/section vào 1 chuỗi (tên dài xuống dòng OK).
  // Khi gặp marker (row/heading/section/pagemark) MỚI thì flush buf hiện tại + bắt đầu buf mới.
  // Dòng trống flush buf. Dòng khác nối vào buf.
  const lines = content.split('\n');
  const out = [];
  let buf = '';
  const flush = () => { if (buf) { out.push(buf); buf = ''; } };
  for (const ln of lines) {
    const t = ln.trim();
    if (isPageMark(t)) { flush(); out.push(t); continue; }
    if (isRowStart(t) || isHeading4d(t) || isSection(t)) { flush(); buf = t; continue; }
    if (t === '') { flush(); continue; }
    // Nối dòng tiếp theo: PDF hay xuống dòng giữa chừng chữ Hán ("大麻\n哈鱼")
    // nhưng có khi xuống dòng giữa cột dữ liệu tách nhau bằng dấu phẩy/space rồi xuống dòng
    // → chọn NO separator; PDF text vốn đã chứa space nếu cần. Nhưng để an toàn, dùng
    // space nếu cả hai đầu đều không có dấu phẩy/cuối dấu ngoặc.
    if (buf) {
      const lastChar = buf.replace(/\s+$/, '').slice(-1);
      const firstChar = t.replace(/^\s+/, '').slice(0, 1);
      // Nếu hai đầu đều là chữ Hán hoặc dấu Hán → ghép không có khoảng trắng (PDF ngắt giữa từ)
      const isHan = (c) => c && /[一-鿿，。；：、？！""''（）《》·—]/.test(c);
      if (isHan(lastChar) && isHan(firstChar)) buf += t;
      else buf += ' ' + t;
    } else buf = t;
  }
  flush();
  return out;
}

const events = [];
const heading4d = new Map();

// Tách tên ra khỏi cột thuế. Cột thuế bắt đầu bằng số (rate) theo sau bởi số (agreement/zero) và country codes.
// Pattern: <name...> rồi space(s) rồi số rồi space rồi số rồi space rồi 一-鿿 (chữ Hán đầu tiên country code)
// Rate có thể là số, "∆8" (giảm), "*" (đặc biệt), "0" (miễn)
function extractName(rest) {
  // Tìm rate column: <space> <digit/∆digit/*> <space> <digit> <space> <Hán/A-Z>
  const m = rest.match(/^([\s\S]+?)\s+(\d+(?:\.\d+)?|\*|[∆]\d+)\s+(\d+)\s+([一-鿿A-Z])/);
  if (m) return m[1].trim();
  // Một số row trống rate (đang chờ đối chiếu) → trả hết
  return rest.trim();
}

function processPage(pageNum, content) {
  const logical = joinLines(content);
  let curHeading4d = null;
  let lastSection = null;
  // Pre-pass: một "logical line" có thể chứa nhiều heading/section bị nuốt do PDF xuống dòng nhiều
  // lần. Tách các line dài thành nhiều đoạn theo các pattern heading/section xuất hiện bên trong.
  const expanded = [];
  for (const line of logical) {
    const t = line.trim();
    if (!t) continue;
    if (isPageMark(t)) { expanded.push(t); continue; }
    // Tìm TẤT CẢ vị trí có heading / section trong line và split
    // Pattern anchor: heading 4-số "...：" hoặc section "<-...>："
    const SPLIT_RE = /(?=\b\d{2}\.\d{2}\s+[^：\n]{1,200}：)|(?=-{1,4}\s*[^：\n]{1,200}：)/g;
    const pieces = t.split(SPLIT_RE).filter((p) => p.trim());
    for (const p of pieces) expanded.push(p.trim());
  }
  for (const line of expanded) {
    const t = line.trim();
    if (!t) continue;
    if (isPageMark(t)) continue;

    const mH4 = t.match(HEAD_4D);
    if (mH4) {
      const code4 = mH4[1].replace('.', '');
      const name = mH4[2].replace(/[:：]\s*$/, '').trim();
      if (!heading4d.has(code4)) heading4d.set(code4, name);
      curHeading4d = code4;
      events.push({ type: 'h4', code4, name, page: pageNum });
      lastSection = null;
      continue;
    }

    const mSH = t.match(SECTION_HDR);
    if (mSH) {
      events.push({ type: 'sec', nest: mSH[1].length, name: mSH[2].trim(), page: pageNum });
      lastSection = { nest: mSH[1].length, name: mSH[2].trim() };
      continue;
    }

    const mRow = t.match(ROW_PATTERN);
    if (mRow) {
      // Tách tên ra khỏi rate + country
      const ten = extractName(mRow[3]);
      events.push({
        type: 'row',
        serial: parseInt(mRow[1], 10),
        code: mRow[2].replace(/\./g, ''),
        name: ten,
        page: pageNum,
        sectionBefore: lastSection,
        curH4: curHeading4d,
      });
      // Sau row → reset section
      lastSection = null;
      continue;
    }
  }
}

const PAGE_BATCH = 50;
for (let start = 1; start <= TOTAL; start += PAGE_BATCH) {
  const end = Math.min(start + PAGE_BATCH - 1, TOTAL);
  const r = await parser.getText({ first: start, last: end });
  const pieces = (r.text || '').split(/\n?-- (\d+) of \d+ --\n?/);
  for (let i = 1; i < pieces.length; i += 2) {
    processPage(parseInt(pieces[i], 10), pieces[i + 1] || '');
  }
  process.stderr.write(`\r  ${end}/${TOTAL} trang`);
}
process.stderr.write('\n');
console.log('Heading 4-số:', heading4d.size, '· row events:', events.filter((e) => e.type === 'row').length, '· sec events:', events.filter((e) => e.type === 'sec').length);

function tenCha4(code6) { return heading4d.get(code6.slice(0, 4)) || null; }

function isShortOrOther(tenZh) {
  if (!tenZh) return true;
  const s = tenZh.replace(/[:：\s]+/g, '');
  return s === '其他' || s === '其它' || s.length < 2;
}

function derive(code6) {
  const rows = events.filter((e) => e.type === 'row' && e.code.slice(0, 6) === code6);
  const cha = tenCha4(code6);
  const candidates = [];

  // Ưu tiên 1: section header 1-dash hoặc 2-dash trước row ĐẦU TIÊN
  for (const r of rows) {
    if (r.sectionBefore && (r.sectionBefore.nest === 1 || r.sectionBefore.nest === 2) && r.sectionBefore.name) {
      candidates.push({
        name: r.sectionBefore.name,
        source: r.sectionBefore.nest === 1 ? 'sec-dash1' : 'sec-dash2',
        page: r.page, code: r.code,
      });
      break;
    }
  }

  for (const r of rows) {
    const lead = stripDashesName(r.name);
    if (lead && lead.nest === 1 && lead.name) {
      candidates.push({ name: lead.name, source: 'row-dash1', page: r.page, code: r.code });
    } else if (lead && lead.nest === 2 && lead.name) {
      candidates.push({ name: lead.name, source: 'row-dash2', page: r.page, code: r.code });
    } else if (!lead && r.name.trim()) {
      candidates.push({ name: r.name, source: 'row-no-dash', page: r.page, code: r.code });
    }
  }

  if (candidates.length === 0) return null;

  // Ưu tiên: row-dash1 (tên 6-số trực tiếp trên dòng 8/10-số) > sec-dash2 > row-dash2 > sec-dash1 > row-no-dash.
  // sec-dash1 cẩn thận vì 1-dash có khi giới thiệu NHÓM 8-số (cover nhiều 6-số) chứ không phải tên 1 6-số.
  const order = { 'row-dash1': 0, 'sec-dash2': 1, 'row-dash2': 2, 'sec-dash1': 3, 'row-no-dash': 4 };
  candidates.sort((a, b) => order[a.source] - order[b.source]);
  const best = candidates[0];

  let tenZh = best.name;
  let tenZhCha = null;
  if (isShortOrOther(tenZh)) tenZhCha = cha;
  return { tenZh, tenZhCha, page: best.page, code: best.code, source: best.source };
}

const sixNames = new Map();
for (const code6 of HS6_DICH) {
  const r = derive(code6);
  if (r) sixNames.set(code6, r);
}

const out = [];
const thieu = [];
for (const code6 of HS6_DICH) {
  const info = sixNames.get(code6);
  if (!info) {
    const cha = tenCha4(code6);
    thieu.push({ hs6: code6, lyDo: `không tìm thấy dòng 6-số ${code6} trong PDF MOF 2026${cha ? ` (ấn bản TQ không có; chương 4-số: "${cha}")` : ' (chương 4-số cha không có trong tài liệu này)'}` });
    continue;
  }
  out.push({
    hs6: code6,
    tenZh: info.tenZh,
    tenZhCha: info.tenZhCha,
    capKhop: 6,
    nguon: {
      url: PDF_URL,
      sha256: PDF_SHA,
      layLuc: PDF_LAY_LUC,
      viTri: `trang ${info.page}, dòng mã ${info.code} (đại diện cho hs6 ${code6}; nguồn tên: ${info.source})`,
    },
  });
}

out.sort((a, b) => a.hs6.localeCompare(b.hs6));
thieu.sort((a, b) => a.hs6.localeCompare(b.hs6));
fs.writeFileSync(join(DIR_OUT, 'hs6-zh.jsonl'), out.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(join(DIR_OUT, 'thieu.jsonl'), thieu.map((r) => JSON.stringify(r)).join('\n') + '\n');

const rawIdx = { tho: [{ sha256: PDF_SHA, url: PDF_URL, layLuc: PDF_LAY_LUC, bytes: buf.length, tep: pdfFiles[0] }] };
fs.writeFileSync(join(DIR_OUT, 'raw-index.json'), JSON.stringify(rawIdx, null, 1));

const baoCao = {
  ngay: new Date().toISOString().slice(0, 10),
  may: 'macOS dev-zcode (hs-code-api/wt-350)',
  camKet: { khongDichMay: true, khongLachAntiBot: true },
  nguon: [{
    ma: 'gacc-shuize-2026',
    vanBan: '《中华人民共和国进出口税则（2026）》',
    url: PDF_URL,
    trangThai: 'OK',
    soDong: out.length,
    soThieu: thieu.length,
    tongHs6: HS6_DICH.length,
    ghiChu: `PDF ${TOTAL} trang từ gss.mof.gov.cn (mof.gov.cn — tên miền chính thống theo đơn đặt hàng §1). customs.gov.cn trả HTTP 412 từ máy này nên không dùng. Trích tự động: tên 6-số lấy theo thứ tự ưu tiên — section_header 1-2 dash trước row đầu (tên 6-số rõ ràng); row name 1-dash (-改良种用 → 改良种用); row name 2-dash (--鳟鱼（...） → 鳟鱼（...）). Tên cụt/"其他" → tenZhCha = tên 4-số cha (không ghép).`,
  }],
  phu: `${out.length}/${HS6_DICH.length}`,
};
fs.writeFileSync(join(DIR_OUT, 'bao-cao.json'), JSON.stringify(baoCao, null, 1));

console.log(`\nĐã ghi ${out.length}/${HS6_DICH.length} hs6 có tên; ${thieu.length} vào thieu.jsonl`);
console.log('  data/bieu-thue/zh/{hs6-zh.jsonl, thieu.jsonl, bao-cao.json, raw-index.json}');
console.log('  Chạy: npm run bieu-thue:kiem-zh');
