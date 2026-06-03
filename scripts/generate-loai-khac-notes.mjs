#!/usr/bin/env node
/**
 * generate-loai-khac-notes.mjs
 *
 * Tự sinh exclusionNote + auditRisk cho mã "Loại khác" không dùng AI API.
 * Tổng hợp từ cấu trúc biểu thuế + chú giải (loai_tru, khong_bao_gom,
 * phan_biet, sen, nhom, bao_gom).
 *
 * Usage:
 *   node scripts/generate-loai-khac-notes.mjs --chapter 87
 *   node scripts/generate-loai-khac-notes.mjs --all          # toàn bộ
 *   node scripts/generate-loai-khac-notes.mjs --chapter 87 --dry-run
 *
 * Output: ghi thẳng vào data/loai-khac/ch{XX}.json + rebuild merged files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.join(__dirname, '..');
const LK_DIR  = path.join(ROOT, 'data', 'loai-khac');
const OUT_IDX  = path.join(ROOT, 'data', 'loai-khac-index.json');
const OUT_FULL = path.join(ROOT, 'data', 'loai-khac-enriched.json');

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function save(p, data) {
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(`${p}.tmp`, p);
}

function cleanVn(vn) {
  return (vn || '').replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').trim();
}

function truncateAtSentence(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  const sub = text.slice(0, maxLen);
  const lastPunct = Math.max(sub.lastIndexOf('. '), sub.lastIndexOf('.\n'), sub.lastIndexOf('; '));
  return lastPunct > maxLen * 0.4 ? sub.slice(0, lastPunct + 1) : sub;
}

function cleanNote(text) {
  return (text || '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\b[oO]\s+[oO]\s+[oO]\b/g, '')  // artifact "o o   o" từ OCR
    .replace(/\s+([.,;])/g, '$1')
    .trim();
}

function parseDuty(raw) {
  const m = String(raw || '0').match(/^[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const o = { chapter: null, all: false, dryRun: false, force: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--all')       o.all = true;
    else if (args[i] === '--dry-run')   o.dryRun = true;
    else if (args[i] === '--force')     o.force = true;
    else if (args[i].startsWith('--chapter=')) o.chapter = args[i].slice(10).padStart(2, '0');
    else if (args[i] === '--chapter')  o.chapter = (args[i + 1] || '').padStart(2, '0');
  }
  return o;
}

// --------------------------------------------------------------------------
// Dedup siblings: group by cleaned name, keep highest duty representative
// --------------------------------------------------------------------------

function deduplicateSiblings(siblings) {
  const seen = new Map();
  for (const s of siblings) {
    const key = cleanVn(s.vn).toLowerCase().slice(0, 40);
    const existing = seen.get(key);
    if (!existing || parseDuty(s.tt) > parseDuty(existing.tt)) {
      seen.set(key, s);
    }
  }
  return [...seen.values()].sort((a, b) => parseDuty(b.tt) - parseDuty(a.tt));
}

// --------------------------------------------------------------------------
// Core note generator — pure logic from structural + chú giải data
// --------------------------------------------------------------------------

function generateNotes(rec) {
  const { hs, vn, heading, heading6, tt, specificSiblings, headingNote, chapterNote } = rec;
  const hn = headingNote || {};
  const myDuty = parseDuty(tt);

  // --- Build exclusionNote ---
  const parts = [];

  // 1. Opening: what heading this belongs to + what it IS
  // Truncate nhom at sentence boundary to avoid fragments
  const nhomRaw = cleanNote(cleanVn(hn.nhom || ''));
  const nhomTruncated = truncateAtSentence(nhomRaw, 200);
  if (nhomTruncated) {
    parts.push(`Mã ${hs} là phân nhóm "dư" (residual) trong nhóm ${heading}, bao gồm hàng hóa thuộc: ${nhomTruncated}.`);
  } else {
    parts.push(`Mã ${hs} là phân nhóm "dư" (residual) trong nhóm ${heading}.`);
  }

  // 2. Explicit exclusions — only if not already present in nhom text
  const loaiTru = cleanNote(hn.loai_tru || hn.khong_bao_gom || '');
  const nhomHasExclusion = nhomRaw.toLowerCase().includes('không bao gồm') || nhomRaw.toLowerCase().includes('loại trừ');
  if (loaiTru && !nhomHasExclusion) {
    parts.push(`Nhóm ${heading} không bao gồm: ${loaiTru.slice(0, 300)}`);
  }

  // 3. Sibling exclusion list
  if (specificSiblings.length > 0) {
    const deduped = deduplicateSiblings(specificSiblings);

    // Show all if ≤8 unique types; otherwise show high-duty + summary
    const toShow = deduped.length <= 8
      ? deduped
      : deduped.filter(s => parseDuty(s.tt) > myDuty).slice(0, 8);

    const sibLines = toShow.map(s => {
      const name = cleanVn(s.vn);
      const note = s.baoGom ? ` (${s.baoGom.slice(0, 80)})` : '';
      return `${s.hs} – ${name}${note} [MFN ${s.tt}%]`;
    });

    const hiddenCount = deduped.length - toShow.length;
    const suffix = hiddenCount > 0 ? ` và ${hiddenCount} loại cụ thể khác cùng nhóm ${heading6}` : '';

    parts.push(
      `Chỉ áp dụng mã ${hs} khi hàng không thuộc các mã cụ thể sau: ` +
      sibLines.join('; ') + suffix + '.'
    );
  } else {
    // Standalone residual — no sibling
    parts.push(`Là mã duy nhất trong phân nhóm ${heading6}; áp dụng cho tất cả hàng thuộc nhóm ${heading} chưa được chi tiết tại nhóm con khác.`);
  }

  // 4. Distinguish note (phan_biet) — key differentiator
  const phanBiet = cleanNote(hn.phan_biet || '').slice(0, 250);
  if (phanBiet) {
    parts.push(`Lưu ý phân biệt: ${phanBiet}`);
  }

  // 5. SEN technical note (first 200 chars, if very informative and no phan_biet)
  const sen = cleanNote(hn.sen || '');
  if (sen && sen.length > 30 && !phanBiet) {
    parts.push(sen.slice(0, 200) + (sen.length > 200 ? '…' : ''));
  }

  const exclusionNote = parts.join(' ');

  // --- Build auditRisk ---
  let auditRisk = null;
  if (specificSiblings.length > 0) {
    const gap = rec.dutyGap;
    const deduped = deduplicateSiblings(specificSiblings);
    const topSib = deduped.find(s => parseDuty(s.tt) > myDuty);

    if (gap >= 20 && topSib) {
      const topName = cleanVn(topSib.vn).slice(0, 60);
      auditRisk =
        `CẢNH BÁO AUDIT: Mã ${hs} (MFN ${tt}%) thấp hơn đáng kể so với ` +
        `${topSib.hs} – ${topName} (MFN ${topSib.tt}%, chênh ${gap}%). ` +
        `Hải quan sẽ kiểm tra đặc điểm kỹ thuật để xác nhận hàng không thuộc mã cụ thể. ` +
        `Cần hồ sơ kỹ thuật chứng minh hàng không đáp ứng tiêu chí phân loại cụ thể.`;
    } else if (gap >= 5 && topSib) {
      const topName = cleanVn(topSib.vn).slice(0, 60);
      auditRisk =
        `Chú ý: chênh lệch thuế ${gap}% so với ${topSib.hs} (${topName}). ` +
        `Kiểm tra tiêu chí phân loại để đảm bảo hàng không thuộc mã cụ thể hơn.`;
    }
  }

  return { exclusionNote, auditRisk };
}

// --------------------------------------------------------------------------
// Process one chapter
// --------------------------------------------------------------------------

function processChapter(chapter, opts) {
  const chPath = path.join(LK_DIR, `ch${chapter}.json`);
  if (!fs.existsSync(chPath)) {
    console.log(`  Chương ${chapter}: không có file ch${chapter}.json`);
    return 0;
  }

  const data = load(chPath);
  const codes = Object.keys(data);
  const todo = opts.force
    ? codes
    : codes.filter(hs => !data[hs].exclusionNote);

  if (todo.length === 0) {
    console.log(`  Chương ${chapter}: đã xử lý hết (${codes.length} mã)`);
    return 0;
  }

  if (opts.dryRun) {
    console.log(`  Chương ${chapter}: ${todo.length} mã cần xử lý (dry-run)`);
    if (todo.length > 0) {
      const sample = todo[0];
      const { exclusionNote, auditRisk } = generateNotes(data[sample]);
      console.log(`  Sample ${sample}:`);
      console.log(`    exclusionNote: ${exclusionNote.slice(0, 200)}...`);
      console.log(`    auditRisk: ${auditRisk?.slice(0, 100) || 'null'}`);
    }
    return 0;
  }

  let count = 0;
  for (const hs of todo) {
    const { exclusionNote, auditRisk } = generateNotes(data[hs]);
    data[hs].exclusionNote = exclusionNote;
    data[hs].auditRisk     = auditRisk;
    count++;
  }

  save(chPath, data);
  return count;
}

// --------------------------------------------------------------------------
// Rebuild merged output files
// --------------------------------------------------------------------------

function rebuildMerged() {
  const files = fs.readdirSync(LK_DIR).filter(f => /^ch\d+\.json$/.test(f)).sort();
  const allRecords = {};
  for (const f of files) {
    Object.assign(allRecords, load(path.join(LK_DIR, f)));
  }

  // Rebuild enriched (dedup notes)
  const chapterNotes = {}, headingNotes = {}, codesFull = {};
  for (const [hs, rec] of Object.entries(allRecords)) {
    if (rec.chapterNote && !chapterNotes[rec.chapter]) chapterNotes[rec.chapter] = rec.chapterNote;
    if (rec.headingNote && !headingNotes[rec.heading]) headingNotes[rec.heading] = rec.headingNote;
    const { chapterNote, headingNote, ...core } = rec;
    codesFull[hs] = core;
  }
  const enriched = {
    meta: {
      generated: new Date().toISOString().slice(0, 10),
      total: Object.keys(codesFull).length,
      withExclusionNote: Object.values(codesFull).filter(v => v.exclusionNote).length,
      highRisk: Object.values(codesFull).filter(v => v.riskLevel === 'HIGH').length,
    },
    chapters: chapterNotes,
    headings: headingNotes,
    codes: codesFull,
  };
  save(OUT_FULL, enriched);

  // Rebuild compact index
  const index = {};
  for (const [hs, rec] of Object.entries(codesFull)) {
    index[hs] = {
      r: rec.riskLevel,
      g: rec.dutyGap,
      s: rec.specificSiblings.map(s => ({ h: s.hs, v: s.vn, t: s.tt })),
      ...(rec.exclusionNote ? { en: rec.exclusionNote } : {}),
      ...(rec.auditRisk     ? { ar: rec.auditRisk }     : {}),
    };
  }
  save(OUT_IDX, index);

  const withNote = Object.values(index).filter(v => v.en).length;
  const idxSize  = (fs.statSync(OUT_IDX).size / 1e6).toFixed(1);
  const fullSize = (fs.statSync(OUT_FULL).size / 1e6).toFixed(1);
  console.log(`\nMerge xong: enriched=${fullSize}MB | index=${idxSize}MB | có exclusionNote: ${withNote}/${Object.keys(index).length}`);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (!opts.chapter && !opts.all) {
    console.error('Dùng --chapter XX hoặc --all\nVí dụ: node scripts/generate-loai-khac-notes.mjs --chapter 87');
    process.exit(1);
  }

  const chapters = opts.all
    ? fs.readdirSync(LK_DIR).filter(f => /^ch\d+\.json$/.test(f)).map(f => f.slice(2, 4)).sort()
    : [opts.chapter];

  let totalDone = 0;
  for (const ch of chapters) {
    const done = processChapter(ch, opts);
    if (done > 0) console.log(`  Chương ${ch}: ${done} mã đã sinh notes`);
    totalDone += done;
  }

  if (!opts.dryRun && totalDone > 0) {
    console.log(`\nTổng: ${totalDone} mã được sinh notes. Rebuilding merged files...`);
    rebuildMerged();
  } else if (!opts.dryRun) {
    console.log('Không có mã nào cần xử lý thêm. Dùng --force để ghi đè.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
