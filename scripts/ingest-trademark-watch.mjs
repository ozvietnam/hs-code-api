#!/usr/bin/env node
/**
 * Nạp dữ liệu nhãn hiệu THẬT vào data/trademark-watch.json (hybrid: hải quan + WIPO).
 *
 * Cách dùng:
 *   node scripts/ingest-trademark-watch.mjs --customs <file.csv|xlsx>   # danh sách giám sát TCHQ (VN nhập)
 *   node scripts/ingest-trademark-watch.mjs --wipo <file.json>          # export WIPO Global Brand DB (VN)
 *   node scripts/ingest-trademark-watch.mjs --gacc <file.json>          # danh sách ghi nhận Hải quan TQ (CN xuất)
 *
 * Merge rule: ghi đè entry cùng tên nhãn (so khớp theo normalized). Nguồn "customs"
 * ưu tiên cao nhất (đặt customsRecorded=true, verified=true). Nguồn "wipo" set
 * status/owner/regNo + verified=true nhưng KHÔNG tự đặt customsRecorded.
 * Nguồn "gacc" set khối cn.{gaccRecorded,recordNo,ipTypes,verified} (rủi ro XUẤT KHẨU TQ).
 *
 * --- ĐỊNH DẠNG FILE ĐẦU VÀO ---
 * Customs (CSV, từ "Danh sách nhãn hiệu đăng ký giám sát" của Tổng cục Hải quan):
 *   mark,owner,recordNo,niceClasses,expiry
 *   VPOWER,"Công ty ABC",GS-2026-001,"4;7;9",2030-12-31
 *
 * WIPO (JSON, từ export Global Brand Database):
 *   [{ "mark": "...", "owner": "...", "appNo": "...", "regNo": "...",
 *      "niceClasses": [9], "status": "REGISTERED" }]
 *
 * Khi chưa có file thật, script chỉ in hướng dẫn — KHÔNG bịa dữ liệu.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(rootDir, 'data');
const watchPath = join(dataDir, 'trademark-watch.json');

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

function parseCsv(text) {
  // CSV tối giản hỗ trợ field bọc dấu nháy kép.
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
      else cur += ch;
    }
    fields.push(cur);
    rows.push(fields.map((f) => f.trim()));
  }
  return rows;
}

const args = process.argv.slice(2);
const mode = args[0];
const file = args[1];

if (!['--customs', '--wipo', '--gacc'].includes(mode) || !file) {
  console.log('Cách dùng:');
  console.log('  node scripts/ingest-trademark-watch.mjs --customs <file.csv>   # giám sát TCHQ (VN nhập)');
  console.log('  node scripts/ingest-trademark-watch.mjs --wipo <file.json>     # WIPO Global Brand DB (VN)');
  console.log('  node scripts/ingest-trademark-watch.mjs --gacc <file.json>     # ghi nhận Hải quan TQ (CN xuất)');
  console.log('\nXem header file cho định dạng cột mong đợi. Script này KHÔNG bịa dữ liệu.');
  process.exit(args.length ? 1 : 0);
}
if (!existsSync(file)) {
  console.error(`Không tìm thấy file: ${file}`);
  process.exit(1);
}

const db = existsSync(watchPath)
  ? JSON.parse(readFileSync(watchPath, 'utf8'))
  : { _meta: {}, marks: {} };
db.marks = db.marks || {};

let upserts = 0;
function upsert(mark, patch) {
  if (!mark) return;
  const existing = db.marks[mark] || {};
  const niceClasses = patch.niceClasses && patch.niceClasses.length ? patch.niceClasses : existing.niceClasses || [];
  db.marks[mark] = {
    ...existing,
    ...patch,
    normalized: normalizeMark(mark),
    niceClasses,
    hsChapters: hsChaptersForNice(niceClasses),
    verified: true,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  upserts += 1;
}

if (mode === '--customs') {
  if (extname(file).toLowerCase() !== '.csv') {
    console.error('Customs ingest hiện hỗ trợ .csv (xuất từ xlsx). Xuất sang CSV rồi chạy lại.');
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(file, 'utf8'));
  const [header, ...body] = rows;
  const col = Object.fromEntries(header.map((h, i) => [h.toLowerCase().trim(), i]));
  for (const r of body) {
    const mark = r[col.mark];
    upsert(mark, {
      owner: r[col.owner] || null,
      customsRecordNo: r[col.recordno] || null,
      niceClasses: (r[col.niceclasses] || '').split(/[;|]/).map((s) => parseInt(s, 10)).filter(Boolean),
      expiry: r[col.expiry] || null,
      status: 'REGISTERED',
      customsRecorded: true,
      source: 'customs',
    });
  }
} else if (mode === '--wipo') {
  const items = JSON.parse(readFileSync(file, 'utf8'));
  for (const it of items) {
    upsert(it.mark, {
      owner: it.owner || null,
      appNo: it.appNo || null,
      regNo: it.regNo || null,
      niceClasses: Array.isArray(it.niceClasses) ? it.niceClasses : [],
      status: String(it.status || 'REGISTERED').toUpperCase(),
      customsRecorded: db.marks[it.mark]?.customsRecorded === true, // giữ nguyên, không tự bật
      source: 'wipo',
    });
  }
} else {
  // --gacc: cập nhật khối cn (rủi ro XUẤT KHẨU phía Trung Quốc), không clobber field VN.
  const items = JSON.parse(readFileSync(file, 'utf8'));
  for (const it of items) {
    if (!it.mark) continue;
    const existing = db.marks[it.mark] || { normalized: normalizeMark(it.mark), niceClasses: [], hsChapters: [], source: 'gacc' };
    db.marks[it.mark] = {
      ...existing,
      cn: {
        gaccRecorded: true,
        recordNo: it.recordNo || null,
        ipTypes: Array.isArray(it.ipTypes) ? it.ipTypes : ['trademark'],
        owner: it.owner || existing.cn?.owner || null,
        verified: true,
        source: 'gacc',
      },
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    upserts += 1;
  }
}

db._meta = { ...(db._meta || {}), lastIngest: { mode, file, at: new Date().toISOString() } };
writeFileSync(watchPath, JSON.stringify(db, null, 2));
console.log(`Ingest ${mode} xong: ${upserts} nhãn cập nhật. Tổng ${Object.keys(db.marks).length} nhãn.`);
