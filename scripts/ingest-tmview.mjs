#!/usr/bin/env node
/**
 * Ingest nhãn hiệu CN + VN từ TMview (EUIPO) vào data/trademark-watch.json.
 *
 * TMview (tmdn.org) gộp ~90tr nhãn từ 75 cơ quan SHTT — gồm CNIPA (Trung Quốc,
 * 32tr+) và IP Vietnam. Đây là nguồn DUY NHẤT phủ cả 2 pháp tài của tool trong
 * một API miễn phí.
 *
 * ⚠️ MÔI TRƯỜNG MẠNG: script gọi outbound tới www.tmdn.org. Sandbox Claude Code
 *    web chặn host này ("Host not in allowlist") → CHẠY Ở NƠI MẠNG MỞ:
 *      - Máy local của CEO:  node scripts/ingest-tmview.mjs --brands "Kamoer,VPOWER"
 *      - Hoặc đổi network policy của environment để allowlist www.tmdn.org.
 *
 * Phân biệt quan trọng (giữ trung thực):
 *   - TMview = ĐĂNG KÝ tại registry (CNIPA/IP Vietnam). KHÔNG phải recordal hải quan.
 *   - gaccRecorded (giám sát Hải quan TQ) chỉ set qua scripts/ingest-trademark-watch.mjs --gacc
 *     từ haiguanbeian.com. customsRecorded (TCHQ) chỉ set qua --customs.
 *   - Script này set: owner, status, niceClasses, registrations[] theo office + verified=true.
 *
 * Cách dùng:
 *   node scripts/ingest-tmview.mjs --brands "Kamoer,VPOWER"   # tra danh sách nhãn
 *   node scripts/ingest-tmview.mjs --all                       # tra mọi nhãn đang có trong watchlist
 *   node scripts/ingest-tmview.mjs --brands "Kamoer" --dry-run # chỉ in request, không ghi
 *
 * Endpoint dùng contract công khai mà front-end tmdn.org gọi. Nếu TMview đổi contract,
 * chỉ cần sửa khối CONFIG + mapRecord() bên dưới.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(rootDir, 'data');
const watchPath = join(dataDir, 'trademark-watch.json');

// ---- CONFIG (sửa ở đây nếu TMview đổi contract) ----
const CONFIG = {
  url: 'https://www.tmdn.org/tmview/api/search/results',
  offices: ['CN', 'VN'], // CNIPA + IP Vietnam
  pageSize: 30,
  // map status text TMview -> enum của tool
  statusMap: (s) => {
    const t = String(s || '').toLowerCase();
    if (/regist|cấp|valid|active/.test(t)) return 'REGISTERED';
    if (/pend|filed|đang|applied|exam/.test(t)) return 'PENDING';
    if (/expir|ended|dead|withdraw|hết|terminat/.test(t)) return 'EXPIRED';
    return 'UNKNOWN';
  },
};

function buildRequest(brand) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      page: '1',
      pageSize: String(CONFIG.pageSize),
      criteria: 'C', // contains
      basicSearch: brand,
      fOffices: CONFIG.offices,
      fTMStatus: [],
      fNiceClass: [],
      fTMType: [],
    }),
  };
}

// Chuẩn hoá 1 record TMview về field tool cần (tolerant nhiều biến thể tên field).
function mapRecord(r) {
  const office = r.tmOffice || r.officeCode || r.office || null;
  const name = r.markVerbalElementText || r.markName || r.tradeMarkName || '';
  const applicant = r.applicantName || r.applicant || (Array.isArray(r.applicants) ? r.applicants.join('; ') : null);
  const regNo = r.applicationNumber || r.ST13 || r.registrationNumber || null;
  const niceRaw = r.niceClass || r.niceClasses || r.classCodes || '';
  const niceClasses = String(niceRaw)
    .split(/[;,\s]+/)
    .map((x) => parseInt(x, 10))
    .filter(Boolean);
  return {
    office,
    name,
    applicant: applicant || null,
    regNo,
    niceClasses,
    status: CONFIG.statusMap(r.status || r.tradeMarkStatus),
  };
}

function normalizeMark(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const niceHs = JSON.parse(readFileSync(join(dataDir, 'nice-hs-map.json'), 'utf8')).map || {};
function hsChaptersForNice(niceClasses) {
  const out = new Set();
  for (const c of niceClasses) for (const ch of niceHs[String(c)] || []) out.add(ch);
  return [...out].sort();
}

async function searchTmview(brand) {
  const res = await fetch(CONFIG.url, buildRequest(brand));
  if (!res.ok) throw new Error(`TMview HTTP ${res.status} cho "${brand}"`);
  const json = await res.json();
  const list = json.tradeMarks || json.results || json.data || [];
  return list.map(mapRecord).filter((r) => r.name);
}

// ---- main ----
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useAll = args.includes('--all');
const brandsArg = (() => {
  const i = args.indexOf('--brands');
  return i >= 0 && args[i + 1] ? args[i + 1].split(',').map((s) => s.trim()).filter(Boolean) : [];
})();

const db = JSON.parse(readFileSync(watchPath, 'utf8'));
db.marks = db.marks || {};

let brands = brandsArg;
if (useAll) brands = Object.keys(db.marks);
if (!brands.length) {
  console.log('Cách dùng: node scripts/ingest-tmview.mjs --brands "Kamoer,VPOWER" [--dry-run]');
  console.log('           node scripts/ingest-tmview.mjs --all');
  process.exit(args.length ? 1 : 0);
}

if (dryRun) {
  console.log('DRY-RUN — request gửi tới TMview cho nhãn đầu tiên:');
  console.log(CONFIG.url);
  console.log(buildRequest(brands[0]).body);
  console.log(`\n(Sẽ tra ${brands.length} nhãn, office ${CONFIG.offices.join('+')}. Bỏ --dry-run để ghi.)`);
  process.exit(0);
}

let updated = 0;
for (const brand of brands) {
  let recs;
  try {
    recs = await searchTmview(brand);
  } catch (e) {
    console.error(`SKIP "${brand}": ${e.message}`);
    continue;
  }
  if (!recs.length) {
    console.log(`"${brand}": không có kết quả CN/VN trên TMview.`);
    continue;
  }
  // chọn record "mạnh nhất" làm canonical (ưu tiên VN registered, rồi CN registered)
  const rank = (r) => (r.office === 'VN' ? 2 : 1) + (r.status === 'REGISTERED' ? 0.5 : 0);
  const best = [...recs].sort((a, b) => rank(b) - rank(a))[0];
  const niceClasses = [...new Set(recs.flatMap((r) => r.niceClasses))].sort((a, b) => a - b);

  const existing = db.marks[brand] || {};
  db.marks[brand] = {
    ...existing,
    normalized: normalizeMark(brand),
    owner: best.applicant || existing.owner || null,
    regNo: best.regNo || existing.regNo || null,
    niceClasses: niceClasses.length ? niceClasses : existing.niceClasses || [],
    hsChapters: hsChaptersForNice(niceClasses.length ? niceClasses : existing.niceClasses || []),
    status: best.status,
    customsRecorded: existing.customsRecorded === true, // KHÔNG đổi — chỉ --customs mới bật
    cn: existing.cn || { gaccRecorded: false, recordNo: null, ipTypes: [], verified: false, source: 'seed' },
    registrations: recs.map((r) => ({ office: r.office, regNo: r.regNo, status: r.status, applicant: r.applicant, niceClasses: r.niceClasses })),
    verified: true,
    source: 'tmview',
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  updated += 1;
  console.log(`OK "${brand}": ${recs.length} record (${recs.map((r) => r.office + ':' + r.status).join(', ')})`);
}

db._meta = { ...(db._meta || {}), lastTmviewIngest: { at: new Date().toISOString(), brands: brands.length, updated } };
writeFileSync(watchPath, JSON.stringify(db, null, 2));
console.log(`\nGhi ${updated}/${brands.length} nhãn vào data/trademark-watch.json (source=tmview).`);
