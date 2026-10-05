#!/usr/bin/env node
/**
 * Gộp đóng góp data/community/ vào kho chính (precedents / conflicts).
 *
 * - kind=precedent        → data/precedents.json (giữ contributor + source)
 * - kind=conflict-table   → data/conflicts.json (confusedWith + reasonsVi).
 *                           KHÔNG tự tạo bảng quyết định verified.
 * - kind=correction       → xếp hàng data/community-corrections-queue.jsonl (không tự sửa)
 * - kind=product-example  → xếp hàng data/community-product-queue.jsonl
 *
 * Bỏ qua data/community/examples/ (mẫu, không phải đóng góp thật).
 * Trùng: cùng hsCode + số hiệu TB-TCHQ / source.reference → bỏ qua.
 * Nâng cấp: bản ghi "mỏng" (từ bảng cũ tb_tchq_index.json hoặc lý do < 150 ký tự) cùng mã +
 *   số hiệu + mặt hàng bị THAY bằng bản đọc lại đầy đủ hơn (docs/huong-dan-trich-tb-tchq.md).
 * Mang theo source.issuedDate → issuedDate, source.url → sourceUrl.
 * Tệp dính bộ lọc riêng tư → từ chối cả tệp, không ghi từng phần.
 *
 *   node scripts/merge-community.mjs [--dry-run] [--include-examples]
 *   node scripts/merge-community.mjs --community-dir DIR --data-dir DIR
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname, relative, sep } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const INCLUDE_EXAMPLES = args.includes('--include-examples');

function argValue(flag) {
  const i = args.indexOf(flag);
  if (i < 0 || i === args.length - 1) return null;
  return args[i + 1];
}

const dataDir = argValue('--data-dir') || join(root, 'data');
const communityDir = argValue('--community-dir') || join(root, 'data', 'community');

const require = createRequire(join(root, 'package.json'));
const { scanObject } = require('./lib/privacy-filter.js');

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

function isExample(file) {
  const rel = relative(communityDir, file);
  const parts = rel.split(sep);
  if (parts.includes('examples')) return true;
  const base = parts[parts.length - 1] || '';
  return base.startsWith('vi-du-');
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, obj) {
  if (DRY) return;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
}

function appendLog(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  if (DRY) {
    console.log('[dry-run log]', line.trim());
    return;
  }
  mkdirSync(dataDir, { recursive: true });
  appendFileSync(join(dataDir, 'community-merge-log.jsonl'), line);
}

function appendQueue(filename, entry) {
  const line = JSON.stringify(entry) + '\n';
  if (DRY) return;
  mkdirSync(dataDir, { recursive: true });
  appendFileSync(join(dataDir, filename), line);
}

function yearOf(rec) {
  if (rec?.source?.clearedYear) return Number(rec.source.clearedYear);
  const d = rec?.source?.issuedDate;
  if (d && /^\d{4}/.test(d)) return Number(String(d).slice(0, 4));
  return null;
}

function dedupKey(hs, rec) {
  const ref = String(rec?.source?.reference || rec?.tbTchqNumber || rec?.description || '')
    .toUpperCase()
    .replace(/\s+/g, '');
  // Một thông báo có thể kết luận nhiều mặt hàng về cùng một mã → thêm đoạn đầu
  // mô tả (chuẩn hoá) vào khoá, kẻo mặt hàng thứ hai bị coi là trùng.
  const desc = String(rec?.description || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 40);
  return `${hs}::${ref}::${desc}`;
}

function existingKeys(precedents) {
  const keys = new Set();
  for (const [hs, list] of Object.entries(precedents)) {
    for (const p of Array.isArray(list) ? list : []) {
      keys.add(dedupKey(hs, {
        source: { reference: p.tbTchqNumber },
        description: p.productName,
        tbTchqNumber: p.tbTchqNumber,
      }));
    }
  }
  return keys;
}

// Bản ghi "mỏng": nhập từ bảng cũ tb_tchq_index.json (chỉ có tên hàng + mã) hoặc lý do
// dưới ngưỡng này. Đọc lại toàn văn ra bản đầy đủ hơn thì THAY bản mỏng, không thêm dòng.
const THIN_REASON = 150;
const normRef = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

function isThin(p) {
  return p.sourceFile === 'tb_tchq_index.json' || String(p.technicalSpec || '').length < THIN_REASON;
}

const foldWords = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

/** ≥ 60 % từ trong tên hàng cũ có mặt trong mô tả mới — cùng một mặt hàng (một TB có thể có nhiều mặt hàng cùng mã). */
// Bảng cũ tb_tchq_index.json lấy tên hàng từ tiêu đề TVPL nên dính đuôi "… do Tổng cục trưởng
// Tổng cục Hải quan ban hành" — đuôi đó không phải tên hàng, bỏ trước khi so.
const stripTitleTail = (s) => String(s || '').replace(/\s+do\s+[^]{0,80}?ban hành\s*$/i, '');

function sameGoods(oldName, newDesc) {
  const want = [...new Set(foldWords(stripTitleTail(oldName)))];
  if (!want.length) return false;
  const have = new Set(foldWords(newDesc));
  return want.filter((w) => have.has(w)).length / want.length >= 0.6;
}

/** Tìm bản ghi mỏng cùng mã + cùng số hiệu + cùng mặt hàng (+ cùng năm nếu cả hai có năm — số TB lặp lại mỗi năm). */
function findThinTwin(list, entry) {
  const ref = normRef(entry.tbTchqNumber);
  if (!ref) return -1;
  const sameRef = list.filter((p) => p !== entry
    && normRef(p.tbTchqNumber) === ref
    && !(p.year && entry.year && Number(p.year) !== Number(entry.year)));
  const cands = sameRef.filter((p) => isThin(p)
    && String(entry.technicalSpec || '').length > String(p.technicalSpec || '').length);
  const hit = cands.find((p) => sameGoods(p.productName, entry.productName))
    // Tên trong bảng cũ thường là tên thương mại/tiếng Anh, mô tả mới viết theo đặc tính nên ít
    // trùng từ. Cùng số hiệu + năm + mã mà kho chỉ có ĐÚNG MỘT dòng, lại là dòng bảng cũ, thì đó là
    // cùng mặt hàng. Có dòng thứ hai (mặt hàng khác, hay bản đầy đủ đã gộp) thì không đoán.
    || (sameRef.length === 1 && cands[0] === sameRef[0] && sameRef[0].sourceFile === 'tb_tchq_index.json' ? sameRef[0] : null);
  return hit ? list.indexOf(hit) : -1;
}

/** Bản ghi đầy đủ hơn của cùng số hiệu + năm + mặt hàng mà `entry` (đang mỏng) sẽ bị nó thay. */
function findBetter(list, entry) {
  const ref = normRef(entry.tbTchqNumber);
  const len = String(entry.technicalSpec || '').length;
  if (!ref || len >= THIN_REASON) return null;
  return list.find((p) => normRef(p.tbTchqNumber) === ref
    && !(p.year && entry.year && Number(p.year) !== Number(entry.year))
    && String(p.technicalSpec || '').length > len
    && sameGoods(entry.productName, p.productName)) || null;
}

function mergePrecedent(precedents, seen, doc, rec, fileRel, stats) {
  const hs = String(rec.hsCode);
  const key = dedupKey(hs, rec);
  const entry = {
    tbTchqNumber: rec.source?.reference || null,
    productName: rec.description,
    technicalSpec: rec.reasonVi || null,
    year: yearOf(rec),
    outcome: hs,
    sourceFile: `community:${fileRel}`,
    contributor: {
      name: doc.contributor?.name || null,
      github: doc.contributor?.github || null,
    },
    sourceType: rec.source?.type || null,
    girRule: rec.girRule || null,
    confusedWith: rec.confusedWith || [],
    ...(rec.source?.issuedDate ? { issuedDate: rec.source.issuedDate } : {}),
    ...(rec.source?.url ? { sourceUrl: rec.source.url } : {}),
  };
  if (!Array.isArray(precedents[hs])) precedents[hs] = [];
  // Chính bản ghi này là bản mỏng và kho đã có bản đầy đủ hơn của cùng mặt hàng (thường là tệp đọc
  // lại toàn văn) → không thêm lại. Thiếu bước này thì bản mỏng bị xoá ở lần gộp này rồi lại được
  // thêm từ tệp gốc của nó ở lần sau — kho dao động mỗi lần chạy.
  if (findBetter(precedents[hs], entry)) {
    const own = precedents[hs].findIndex((p) => p.sourceFile === entry.sourceFile
      && dedupKey(hs, { source: { reference: p.tbTchqNumber }, description: p.productName }) === key);
    if (own >= 0) {
      precedents[hs].splice(own, 1);
      stats.removedThin += 1;
    } else {
      stats.superseded += 1;
    }
    seen.add(key);
    return;
  }
  const twin = findThinTwin(precedents[hs], entry);
  const keyOf = (p) => dedupKey(hs, { source: { reference: p.tbTchqNumber }, description: p.productName });
  // Khoá chỉ lấy 40 ký tự đầu mô tả nên bản mỏng và bản đủ có thể trùng khoá: phải thấy bản đủ
  // thật trong kho mới được xoá bản mỏng, không thì là lần gộp đầu → thay.
  const fullInStore = twin >= 0 && precedents[hs].some((p, i) => i !== twin && keyOf(p) === key
    && String(p.technicalSpec || '').length >= String(entry.technicalSpec || '').length);
  if (twin >= 0 && seen.has(key) && fullInStore) {
    // Bản đầy đủ đã có trong kho từ lần gộp trước → bản mỏng là dòng thừa.
    precedents[hs].splice(twin, 1);
    stats.removedThin += 1;
    return;
  }
  if (twin >= 0) {
    // Giữ link cũ nếu bản mới không có.
    const old = precedents[hs][twin];
    precedents[hs][twin] = { ...entry, ...(!entry.sourceUrl && old.sourceUrl ? { sourceUrl: old.sourceUrl } : {}) };
    seen.add(key);
    stats.upgraded += 1;
    return;
  }
  if (seen.has(key)) {
    stats.skippedDup += 1;
    return;
  }
  seen.add(key);
  precedents[hs].push(entry);
  stats.precedents += 1;
}

function mergeConflictHints(conflicts, rec, doc, fileRel, stats) {
  const hs = String(rec.hsCode);
  if (hs.length !== 8) {
    stats.skippedShortHs += 1;
    return;
  }
  if (!conflicts[hs]) {
    conflicts[hs] = {
      hsCode: hs,
      riskLevel: 'ORANGE',
      confusedWith: [],
      reasonsVi: [],
      precedents: [],
      sourceFile: `community:${fileRel}`,
    };
  }
  const entry = conflicts[hs];
  const confused = new Set(entry.confusedWith || []);
  for (const c of rec.confusedWith || []) {
    if (c && c !== hs) confused.add(String(c));
  }
  entry.confusedWith = [...confused];
  if (rec.reasonVi && !(entry.reasonsVi || []).includes(rec.reasonVi)) {
    entry.reasonsVi = [...(entry.reasonsVi || []), rec.reasonVi];
  }
  entry.communityContributors = [
    ...new Set([...(entry.communityContributors || []), doc.contributor?.name].filter(Boolean)),
  ];
  stats.conflicts += 1;
}

const precedentsPath = join(dataDir, 'precedents.json');
const conflictsPath = join(dataDir, 'conflicts.json');
const precedents = readJson(precedentsPath, {});
const conflicts = readJson(conflictsPath, {});
const seen = existingKeys(precedents);

const stats = {
  files: 0,
  skippedExample: 0,
  skippedPrivacy: 0,
  skippedDup: 0,
  skippedShortHs: 0,
  precedents: 0,
  upgraded: 0,
  removedThin: 0,
  superseded: 0,
  conflicts: 0,
  queued: 0,
};

const files = listFiles(communityDir);
for (const full of files) {
  const fileRel = relative(communityDir, full);
  if (isExample(full) && !INCLUDE_EXAMPLES) {
    stats.skippedExample += 1;
    appendLog({ action: 'skip-example', file: fileRel });
    continue;
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    appendLog({ action: 'skip-bad-json', file: fileRel, error: e.message });
    continue;
  }
  const privacyHits = scanObject(doc).filter((h) => h.hard);
  if (privacyHits.length) {
    stats.skippedPrivacy += 1;
    appendLog({
      action: 'skip-privacy',
      file: fileRel,
      hits: privacyHits.map((h) => ({ path: h.path, what: h.what, match: h.match })),
    });
    console.error(`❌ ${fileRel}: dính bộ lọc riêng tư — bỏ cả tệp`);
    continue;
  }
  if (!Array.isArray(doc.records) || !doc.records.length) continue;
  stats.files += 1;

  if (doc.kind === 'precedent') {
    for (const rec of doc.records) mergePrecedent(precedents, seen, doc, rec, fileRel, stats);
  } else if (doc.kind === 'conflict-table') {
    for (const rec of doc.records) mergeConflictHints(conflicts, rec, doc, fileRel, stats);
  } else if (doc.kind === 'correction') {
    appendQueue('community-corrections-queue.jsonl', {
      file: fileRel,
      contributor: doc.contributor,
      records: doc.records,
    });
    stats.queued += doc.records.length;
    appendLog({ action: 'queue-correction', file: fileRel, n: doc.records.length });
  } else if (doc.kind === 'product-example') {
    appendQueue('community-product-queue.jsonl', {
      file: fileRel,
      contributor: doc.contributor,
      records: doc.records,
    });
    stats.queued += doc.records.length;
    appendLog({ action: 'queue-product', file: fileRel, n: doc.records.length });
  } else {
    appendLog({ action: 'skip-unknown-kind', file: fileRel, kind: doc.kind });
  }
}

if (stats.precedents || stats.upgraded || stats.removedThin) writeJson(precedentsPath, precedents);
if (stats.conflicts) writeJson(conflictsPath, conflicts);

appendLog({ action: 'summary', stats, dryRun: DRY });

console.log(DRY ? '[dry-run] không ghi kho chính.' : 'Đã ghi kho chính (nếu có bản ghi mới).');
console.log(JSON.stringify(stats, null, 2));
process.exit(stats.skippedPrivacy ? 1 : 0);
