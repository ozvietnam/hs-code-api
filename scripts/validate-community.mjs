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

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMMUNITY_DIR = join(root, 'data', 'community');

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

// --- LỚP 1: dò thông tin khách hàng ------------------------------------------
// Chặn theo hình dạng dữ liệu, không theo danh sách tên — danh sách luôn thiếu.
const PRIVACY_PATTERNS = [
  // Đặt TRƯỚC mẫu MST: 10 số bắt đầu bằng đầu số di động thì gần như chắc là
  // số điện thoại. Báo đúng tên giúp người gửi sửa nhanh, không phải đoán.
  {
    re: /(\+84|\b0)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])\d{7}\b/,
    what: 'số điện thoại Việt Nam',
    hint: 'Bỏ mọi thông tin liên hệ.',
    hard: true,
  },
  {
    re: /\b\d{10}(-\d{3})?\b/,
    what: 'có thể là mã số thuế (10 hoặc 13 số)',
    hint: 'Bỏ MST đi — phân loại hàng hoá không cần biết ai nhập.',
    hard: true,
  },
  {
    re: /\b\d{11,12}\b/,
    what: 'có thể là số tờ khai hải quan',
    hint: 'Bỏ số tờ khai. Nếu cần ghi thời điểm, dùng source.clearedYear (chỉ năm).',
    hard: true,
  },
  {
    re: /(công ty|cty|tnhh|cổ phần|doanh nghiệp tư nhân|co\.,? ?ltd|jsc\b|\bj\.?s\.?c\b)/i,
    what: 'có thể là tên doanh nghiệp',
    hint: 'Mô tả hàng hoá không được chứa tên doanh nghiệp nào.',
    hard: true,
  },
  {
    re: /[\w.+-]+@[\w-]+\.[\w.]+/,
    what: 'địa chỉ email',
    hint: 'Bỏ mọi thông tin liên hệ.',
    hard: true,
  },
  {
    re: /\b(invoice|inv\.?\s?no|packing list|b\/l|bill of lading|vận đơn|hoá đơn số|hóa đơn số)\b/i,
    what: 'tham chiếu chứng từ thương mại',
    hint: 'Chỉ nộp cặp mô tả ↔ mã HS, không nộp chứng từ.',
    hard: true,
  },
  {
    re: /\b\d{1,3}([.,]\d{3}){2,}\s*(vnd|đ|usd)?\b/i,
    what: 'có thể là trị giá lô hàng',
    hint: 'Trị giá không liên quan tới phân loại — bỏ đi.',
    hard: false,
  },
];

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
  if (typeof node === 'string') return scanPrivacy(file, node, path || '(gốc)');
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
