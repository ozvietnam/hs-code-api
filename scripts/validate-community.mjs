#!/usr/bin/env node
/**
 * Kiểm dữ liệu cộng đồng gửi vào data/community/ trước khi merge.
 *
 * HAI VIỆC, VIỆC THỨ HAI QUAN TRỌNG HƠN:
 *   1. Đúng schema (schemas/community-contribution.schema.json)
 *   2. KHÔNG lọt thông tin khách hàng
 *
 * Vì sao việc 2 quan trọng hơn: người đóng góp thường copy thẳng từ tờ khai hoặc
 * file Excel nội bộ, rất dễ dính tên doanh nghiệp, mã số thuế, số tờ khai, trị
 * giá lô hàng. Merge nhầm một lần là dữ liệu khách hàng của HỌ nằm vĩnh viễn
 * trong lịch sử git công khai — không xoá được, và là lỗi của dự án chứ không
 * phải lỗi người gửi. Chặn ở cổng vào rẻ hơn xin lỗi rất nhiều.
 *
 * Không dùng thư viện ngoài: chạy được ở mọi môi trường CI, không thêm phụ thuộc.
 *
 * Dùng:  node scripts/validate-community.mjs [đường-dẫn...]
 *        (không tham số = quét toàn bộ data/community/)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMMUNITY_DIR = join(root, 'data', 'community');
const require = createRequire(join(root, 'package.json'));
const { PRIVACY_PATTERNS } = require('./lib/privacy-filter.js');

let errors = 0;
let warnings = 0;
const problem = (file, msg) => {
  console.error(`❌ ${file}: ${msg}`);
  errors += 1;
};
const warn = (file, msg) => {
  console.warn(`⚠️  ${file}: ${msg}`);
  warnings += 1;
};

function scanPrivacy(file, value, path) {
  if (typeof value !== 'string') return;
  for (const p of PRIVACY_PATTERNS) {
    const m = value.match(p.re);
    if (!m) continue;
    const msg = `${path}: ${p.what} — "${m[0]}". ${p.hint}`;
    if (p.hard) problem(file, msg);
    else warn(file, msg);
  }
}

function walkStrings(file, node, path = '') {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    // source.url: id bài viết trong đường dẫn (vd .../articles/16000067953) không
    // phải MST/số tờ khai — chỉ bỏ qua các mẫu THUẦN SỐ trong url, mẫu chữ vẫn quét.
    if (/(^|\.)source\.url$/.test(path) && /^https?:\/\//.test(node)) {
      return scanPrivacy(file, node.replace(/\d{6,}/g, (d) => 'x'.repeat(d.length)), path);
    }
    return scanPrivacy(file, node, path || '(gốc)');
  }
  if (Array.isArray(node)) return node.forEach((v, i) => walkStrings(file, v, `${path}[${i}]`));
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walkStrings(file, v, path ? `${path}.${k}` : k);
  }
}

// --- LỚP 2: kiểm schema (thủ công, không cần thư viện) -----------------------
const KINDS = new Set(['precedent', 'correction', 'conflict-table', 'product-example']);
const SOURCE_TYPES = new Set([
  'TB-TCHQ', 'van-ban-phap-luat', 'to-khai-da-thong-quan', 'chu-giai-WCO', 'kinh-nghiem-thuc-te',
]);
const HS_RE = /^[0-9]{4}([0-9]{2}([0-9]{2})?)?$/;
const GIR_RE = /^GIR ?[1-6]( ?\([abc]\))?$/;

function validateShape(file, doc) {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return problem(file, 'tệp phải là một object JSON');
  }
  if (!KINDS.has(doc.kind)) {
    problem(file, `kind phải là một trong: ${[...KINDS].join(', ')} (đang là ${JSON.stringify(doc.kind)})`);
  }
  if (doc.license !== 'CC-BY-SA-4.0') {
    problem(file, 'license phải là "CC-BY-SA-4.0" — đây là xác nhận bạn có quyền chia sẻ dữ liệu này');
  }
  if (!doc.contributor?.name || String(doc.contributor.name).trim().length < 2) {
    problem(file, 'thiếu contributor.name (tên hoặc nick để ghi công)');
  }
  if (doc.contributor?.github && !/^[A-Za-z0-9-]{1,39}$/.test(doc.contributor.github)) {
    problem(file, 'contributor.github không hợp lệ');
  }
  if (!Array.isArray(doc.records) || doc.records.length === 0) {
    return problem(file, 'records phải là mảng có ít nhất 1 phần tử');
  }
  if (doc.records.length > 500) {
    problem(file, `records tối đa 500 mỗi tệp (đang ${doc.records.length}) — chia nhỏ để review được`);
  }

  doc.records.forEach((r, i) => {
    const at = `records[${i}]`;
    if (!HS_RE.test(String(r?.hsCode || ''))) {
      problem(file, `${at}.hsCode phải là 4, 6 hoặc 8 chữ số (đang ${JSON.stringify(r?.hsCode)})`);
    }
    const desc = String(r?.description || '');
    if (desc.trim().length < 5) problem(file, `${at}.description quá ngắn (tối thiểu 5 ký tự)`);
    if (desc.length > 500) problem(file, `${at}.description quá dài (tối đa 500 ký tự)`);
    if (!r?.source?.type) {
      problem(file, `${at}.source.type bắt buộc — không có nguồn thì không nhận được`);
    } else if (!SOURCE_TYPES.has(r.source.type)) {
      problem(file, `${at}.source.type không hợp lệ: ${JSON.stringify(r.source.type)}`);
    }
    if (r?.source?.type === 'TB-TCHQ' && !r.source.reference) {
      problem(file, `${at}: nguồn TB-TCHQ phải có source.reference (số hiệu thông báo)`);
    }
    if (r?.girRule && !GIR_RE.test(r.girRule)) {
      problem(file, `${at}.girRule sai định dạng — dùng dạng "GIR 3(b)"`);
    }
    if (doc.kind === 'correction' && !r?.correctionOf?.file) {
      problem(file, `${at}: kind=correction phải có correctionOf.file chỉ ra dữ liệu nào đang sai`);
    }
    for (const hs of r?.confusedWith || []) {
      if (!HS_RE.test(String(hs))) problem(file, `${at}.confusedWith chứa mã không hợp lệ: ${JSON.stringify(hs)}`);
    }
    // Ngày cụ thể của tờ khai có thể truy ngược lô hàng — chỉ nhận năm.
    if (r?.source?.type === 'to-khai-da-thong-quan' && r.source.issuedDate) {
      warn(file, `${at}: tờ khai chỉ nên ghi source.clearedYear (năm), không ghi ngày cụ thể`);
    }
  });
}

// --- LỚP 3: chất lượng tiền lệ TB-TCHQ (tệp nộp từ STRICT_FROM) ---------------
// Rút từ đợt HMAC 05/10/2026: mã giả 00000000 cho thông báo lỗi nguồn, lý do bị script cắt
// cụt ở 316 ký tự, lý do kiểu "thuộc nhóm hàng hóa xác định trước mã số", hai tệp chứa cùng
// một bản ghi. Tệp cũ hơn giữ nguyên (đã gộp), tệp mới phải đạt chuẩn của
// docs/huong-dan-trich-tb-tchq.md mới vào kho.
const STRICT_FROM = '2026-10-05';
// Từ 06/10: phải chép dòng "Số: …" và câu kết luận của chính trang đã mở. Đợt sửa 05/10 tối,
// trang TVPL trả về văn bản khác, agent lấy lý do của văn bản đó rồi ĐỔI MÃ cho khớp
// (thép thanh → 3824.99.99, sô cô la → 3402.11.90) và bịa thêm mô tả cho đủ 20 ký tự.
const EVIDENCE_FROM = '2026-10-06';
const BIEU_THUE = new Set(['2012', '2017', '2022']);
const LOAI_TB = new Set(['KET_QUA_PHAN_LOAI', 'XAC_DINH_TRUOC', 'DINH_CHINH']);
const THIN_REASON = 150;

/**
 * Biểu thuế theo ngày ký thông báo: TT 65/2017 áp dụng từ 01/01/2018, TT 31/2022 từ 01/12/2022.
 * Khớp 100% với 1.873 bản ghi có ngày trong kho (10/2026). Thông báo cuối 2021 vẫn là biểu 2017.
 */
function bieuThueTheoNgay(issuedDate) {
  const d = String(issuedDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  if (d < '2018-01-01') return '2012';
  if (d < '2022-12-01') return '2017';
  return '2022';
}

/** Mã kết luận phải có mặt trong lý do, dạng có chấm (3926.90.99) hoặc liền (39269099). */
function hsInText(hs, text) {
  const h = String(hs);
  const dotted = h.length === 8 ? `${h.slice(0, 4)}.${h.slice(4, 6)}.${h.slice(6)}`
    : h.length === 6 ? `${h.slice(0, 4)}.${h.slice(4)}` : `${h.slice(0, 2)}.${h.slice(2)}`;
  const t = String(text || '').replace(/\s+/g, '');
  return t.includes(dotted) || t.includes(h);
}

/** Ngoặc/ngoặc kép mở mà không đóng → thường là lý do bị cắt giữa chừng. */
function unbalanced(text) {
  const t = String(text || '');
  const n = (re) => (t.match(re) || []).length;
  return n(/\(/g) !== n(/\)/g) || n(/“/g) !== n(/”/g) || n(/"/g) % 2 === 1;
}

const normKey = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const recordKey = (r) => [
  String(r?.source?.reference || '').toUpperCase().replace(/\s+/g, ''),
  String(r?.source?.issuedDate || '').slice(0, 4),
  r?.hsCode,
  normKey(r?.description),
].join('|');
const seenRecords = new Map(); // khoá → tệp đầu tiên chứa bản ghi
const seenRefHs = new Map(); // số hiệu|năm|mã → tệp đầu tiên (chặn đọc lại thông báo đã nộp ở tệp khác)

function validateQuality(file, doc) {
  const strict = doc.kind === 'precedent' && String(doc.submittedAt || '') >= STRICT_FROM;
  (doc.records || []).forEach((r, i) => {
    const at = `records[${i}]`;
    if (/^0+$/.test(String(r?.hsCode || '')) || /^(00|9[89])/.test(String(r?.hsCode || ''))) {
      problem(file, `${at}.hsCode ${r.hsCode} không phải mã thật. Thông báo lỗi nguồn / không kết luận / không phải TB phân loại thì ghi lên sheet, KHÔNG tạo bản ghi`);
    }
    const key = recordKey(r);
    if (seenRecords.has(key) && seenRecords.get(key) !== file && strict) {
      problem(file, `${at} (${r?.source?.reference} → ${r?.hsCode}) trùng bản ghi trong ${seenRecords.get(key)} — mỗi bản ghi chỉ nằm ở một tệp`);
    }
    if (!seenRecords.has(key)) seenRecords.set(key, file);
    const refHs = key.split('|').slice(0, 3).join('|');
    // Cùng người nộp đọc lại thông báo đã nộp ở tệp khác → hai bản mâu thuẫn (đợt 06/10: 22/25 ngày ký
    // khác nhau giữa hai lần đọc). Người khác đọc lại bản mỏng của người khác thì vẫn được (merge tự thay).
    const who = String(doc.contributor?.name || '').trim().toLowerCase();
    const first = seenRefHs.get(refHs);
    if (first && first.file !== file && first.who === who && String(doc.submittedAt || '') >= EVIDENCE_FROM && r?.source?.type === 'TB-TCHQ') {
      problem(file, `${at} (${r?.source?.reference} → ${r?.hsCode}): bạn đã nộp thông báo này ở ${first.file}. Muốn sửa thì sửa trong tệp đó, không nộp bản đọc lại thứ hai`);
    }
    if (!first) seenRefHs.set(refHs, { file, who });
    const bt = r?.attributes?.bieuThue;
    const btWant = bieuThueTheoNgay(r?.source?.issuedDate);
    if (bt && btWant && String(bt) !== btWant) {
      problem(file, `${at} (${r?.source?.reference}): bieuThue ${bt} sai — thông báo ký ${r.source.issuedDate} phân loại theo biểu ${btWant} (căn cứ thông tư danh mục ghi trong phần "Căn cứ")`);
    }
    if (!strict || r?.source?.type !== 'TB-TCHQ') return;

    const ref = r.source.reference || '?';
    const desc = String(r.description || '');
    const reason = String(r.reasonVi || '');
    if (desc.trim().length < 20) problem(file, `${at} (${ref}): description dưới 20 ký tự — thêm đặc tính quyết định việc phân loại`);
    if (/^hàng hóa theo thông báo/i.test(desc.trim())) problem(file, `${at} (${ref}): description là chữ giữ chỗ, không phải tên hàng`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.source.issuedDate || ''))) problem(file, `${at} (${ref}): thiếu source.issuedDate dạng YYYY-MM-DD`);
    if (!/^https?:\/\//.test(String(r.source.url || ''))) problem(file, `${at} (${ref}): thiếu source.url trang chi tiết`);
    if (!BIEU_THUE.has(String(r.attributes?.bieuThue || ''))) problem(file, `${at} (${ref}): attributes.bieuThue phải là 2012 / 2017 / 2022`);
    if (r.attributes?.loaiTB && !LOAI_TB.has(r.attributes.loaiTB)) problem(file, `${at} (${ref}): attributes.loaiTB không hợp lệ`);
    if (String(doc.submittedAt || '') >= EVIDENCE_FROM) {
      const ev = r.evidence || {};
      const nref = (x) => String(x || '').toUpperCase().replace(/^SỐ\s*:?\s*/i, '').replace(/\s+/g, '');
      if (!ev.soHieu) {
        problem(file, `${at} (${ref}): thiếu evidence.soHieu — chép dòng "Số: …" ở đầu trang đã mở`);
      } else if (nref(ev.soHieu) !== nref(ref)) {
        problem(file, `${at} (${ref}): trang đã mở là ${ev.soHieu}, không phải ${ref} → ghi Lỗi nguồn lên sheet, KHÔNG lấy nội dung trang này`);
      }
      const kl = String(ev.ketLuan || '');
      if (kl.trim().length < 30) {
        problem(file, `${at} (${ref}): thiếu evidence.ketLuan — chép nguyên văn câu kết luận có mã số`);
      } else {
        if (!hsInText(r.hsCode, kl)) problem(file, `${at} (${ref}): mã ${r.hsCode} không có trong câu kết luận đã chép. Mã phải lấy từ câu kết luận, không sửa mã cho khớp`);
        if (!reason.replace(/\s+/g, ' ').includes(kl.replace(/\s+/g, ' ').trim())) problem(file, `${at} (${ref}): reasonVi phải chứa nguyên văn evidence.ketLuan`);
      }
      if (unbalanced(desc)) problem(file, `${at} (${ref}): description có ngoặc mở không đóng — có vẻ bị cắt giữa chừng`);
      if (desc.trim().length < 40) problem(file, `${at} (${ref}): description dưới 40 ký tự — ghi tên hàng THỰC TẾ theo kết luận + đặc tính quyết định (chất liệu, cấu tạo, công dụng, thông số)`);
      // Đợt 06/10 chiều: mô tả "đủ 40 ký tự" bằng cách nối tên nhóm biểu thuế lấy từ lý do
      // ("Màu thực phẩm … - Chất gắn đã điều chế dùng cho các loại khuôn đúc hoặc lõi đú") hoặc
      // chữ giữ chỗ "Hàng hóa TB 238 theo thông báo". Tên nhóm là kết luận, không phải đặc tính hàng.
      // (?![-\d]) để không bắt mã model kiểu "AG-2", "SA-100".
      const corp = desc.match(/\b(Inc|Ltd|LLC|GmbH|B\.?V|S\.?A|AG|Co\.,?|Corp(oration)?|Group|JSC|Pte|Sdn\s+Bhd|Limited)\b\.?(?![-\d])/);
      if (corp) problem(file, `${at} (${ref}): description có tên doanh nghiệp ("${corp[0]}") — chỉ ghi đặc tính hàng, không ghi nhà sản xuất/nhập khẩu`);
      // Đợt 06/10 tối (trích bằng regex): mô tả dính nhãn mục của biểu mẫu ("— g thức hóa học:",
      // "5. Kết quả phân loại:", "Tên gọi theo cấu tạo, công dụng:"), mã hàng nội bộ "IC 57#&",
      // "(mục 5 PLTK)" và cả mã kết luận. Đó là dấu hiệu lấy nhầm đoạn, thường là tên hàng KHAI chứ không
      // phải hàng THỰC TẾ theo kết luận.
      const label = desc.match(/kết quả phân loại|tên gọi theo cấu tạo|(^|[\s—–-])g thức hóa học|ký, mã hiệu|nhà sản xuất\s*:/i);
      if (label) problem(file, `${at} (${ref}): description còn nhãn mục của văn bản ("${label[0].trim()}") — chỉ chép phần nội dung: tên hàng thực tế + đặc tính`);
      if (/#&/.test(desc)) problem(file, `${at} (${ref}): description có mã hàng nội bộ doanh nghiệp ("…#&") lấy từ tờ khai — bỏ đi, ghi tên hàng thực tế theo kết luận`);
      const muc = desc.match(/\(?\s*mục\s+\d+[^)]{0,30}?(tờ khai|PLTK|TK\b|phụ lục)[^)]*\)?/i);
      if (muc) problem(file, `${at} (${ref}): description có tham chiếu dòng tờ khai ("${muc[0].trim()}") — bỏ đi, chỉ ghi đặc tính hàng`);
      if (r.hsCode && desc.replace(/\D/g, ' ').split(/\s+/).includes(String(r.hsCode))) {
        problem(file, `${at} (${ref}): description chứa mã ${r.hsCode} — mã đã ở hsCode, mô tả chỉ ghi hàng`);
      }
      const nsx = reason.match(/nhà sản xuất\s*:\s*[^\s,.;]+/i);
      if (nsx) problem(file, `${at} (${ref}): reasonVi có tên nhà sản xuất ("${nsx[0]}") — bỏ phần "Ký, mã hiệu / Nhà sản xuất", bắt đầu chép từ đặc tính hàng hoặc "thuộc nhóm"`);
      const parts = desc.split(/\s[-–—]\s/);
      const head = parts[0].trim();
      const tail = parts.slice(1).join(' - ').trim().toLowerCase();
      if (/^hàng hóa\s+(tb|theo)\b/i.test(head) || /theo thông báo\s*$/i.test(head)) {
        problem(file, `${at} (${ref}): description là chữ giữ chỗ ("${head}") — chép tên hàng thực tế từ văn bản`);
      }
      const headings = [...reason.matchAll(/[“"]([^”"]{4,})[”"]/g)].map((m) => m[1].replace(/^[-\s]+/, '').trim().toLowerCase());
      if (tail && headings.some((h) => h.startsWith(tail.slice(0, 25)))) {
        problem(file, `${at} (${ref}): description nối thêm tên nhóm/phân nhóm biểu thuế ("${parts.slice(1).join(' - ').trim().slice(0, 40)}…") — đó là kết luận, không phải đặc tính hàng. Ghi chất liệu, cấu tạo, công dụng, thông số từ văn bản`);
      }
    }
    if (reason.trim().length < 80) {
      problem(file, `${at} (${ref}): reasonVi dưới 80 ký tự — chép nguyên văn chuỗi nhóm → phân nhóm → mã và căn cứ`);
      return;
    }
    if (!hsInText(r.hsCode, reason)) problem(file, `${at} (${ref}): reasonVi không chứa mã kết luận ${r.hsCode} — lý do phải kết thúc ở mã số`);
    if (unbalanced(reason)) problem(file, `${at} (${ref}): reasonVi có ngoặc mở không đóng — có vẻ bị cắt giữa chừng`);
    if (reason.length > 1000) problem(file, `${at} (${ref}): reasonVi quá 1000 ký tự — bỏ phần mô tả hàng lặp lại, giữ chuỗi kết luận + căn cứ`);
    else if (reason.length < THIN_REASON) warn(file, `${at} (${ref}): reasonVi dưới ${THIN_REASON} ký tự sẽ bị coi là bản mỏng`);
  });
}

// --- Chạy ---------------------------------------------------------------------
function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else if (name.endsWith('.json')) out.push(full);
  }
  return out;
}

const args = process.argv.slice(2);
const files = args.length ? args.map((a) => (a.startsWith('/') ? a : join(root, a))) : listFiles(COMMUNITY_DIR);

if (files.length === 0) {
  console.log('Không có tệp đóng góp nào trong data/community/ — bỏ qua.');
  process.exit(0);
}

console.log(`Kiểm ${files.length} tệp đóng góp...\n`);
for (const full of files) {
  const file = relative(root, full);
  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    problem(file, `JSON không hợp lệ: ${e.message}`);
    continue;
  }
  validateShape(file, doc);
  validateQuality(file, doc);
  walkStrings(file, doc);
  if (errors === 0) console.log(`✅ ${file}: ${doc.records?.length ?? 0} bản ghi`);
}

console.log(`\n${errors} lỗi, ${warnings} cảnh báo`);
if (errors > 0) {
  console.error(
    '\nĐóng góp chưa merge được. Sửa các lỗi trên rồi push lại.\n' +
    'Nếu bị chặn nhầm (vd mã model trùng dạng mã số thuế), ghi rõ trong PR để người review xác nhận.',
  );
}
process.exit(errors > 0 ? 1 : 0);
