#!/usr/bin/env node
/**
 * enrich-loai-khac-examples.mjs
 *
 * Thêm trường "examples" cho mỗi mã Loại khác:
 *   - source "oz-gold": từ tờ khai thực tế trong oz-gold-final.jsonl (458 mã)
 *   - source "derived": dẫn xuất từ heading description + sibling complement (2,925 mã)
 *
 * Mỗi example có:
 *   sanPham, lyDoLoaiKhac, chatLieu?, khaiBaoMau?, ozCount?, source
 *
 * Usage:
 *   node scripts/enrich-loai-khac-examples.mjs
 *   node scripts/enrich-loai-khac-examples.mjs --dry-run --chapter 90
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT    = path.join(__dirname, '..');
const LK_DIR  = path.join(ROOT, 'data', 'loai-khac');
const OUT_IDX  = path.join(ROOT, 'data', 'loai-khac-index.json');
const OUT_FULL = path.join(ROOT, 'data', 'loai-khac-enriched.json');
const GOLD_PATH = path.join(ROOT, 'data', 'oz-gold-final.jsonl');

function load(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function save(p, data) {
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(data), 'utf8');
  fs.renameSync(`${p}.tmp`, p);
}
function cleanVn(s) {
  return (s || '').replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').replace(/\n+/g,' ').replace(/\s+/g,' ').trim();
}
function truncate(s, n) {
  if (!s || s.length <= n) return s || '';
  const cut = s.slice(0, n);
  const last = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '));
  return last > n * 0.5 ? cut.slice(0, last + 1) : cut + '…';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const o = { chapter: null, dryRun: false, force: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') o.dryRun = true;
    if (args[i] === '--force')   o.force = true;
    if (args[i] === '--chapter') o.chapter = (args[i+1]||'').padStart(2,'0');
    if (args[i].startsWith('--chapter=')) o.chapter = args[i].slice(10).padStart(2,'0');
  }
  return o;
}

// --------------------------------------------------------------------------
// Load oz-gold.jsonl → group by hsCode, sort by ozCount desc
// --------------------------------------------------------------------------

async function loadGold() {
  const by_hs = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(GOLD_PATH), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!r.hsCode) continue;
      if (!by_hs.has(r.hsCode)) by_hs.set(r.hsCode, []);
      by_hs.get(r.hsCode).push(r);
    } catch {}
  }
  // Sort each list by ozCount desc
  for (const [hs, list] of by_hs) {
    by_hs.set(hs, list.sort((a, b) => (b.ozCount || 0) - (a.ozCount || 0)));
  }
  return by_hs;
}

// --------------------------------------------------------------------------
// Extract "lyDoLoaiKhac" from congDung field
// Often contains "không phải X, Y, Z" — that IS the reason
// --------------------------------------------------------------------------

function extractLyDo(rec, lkRecord) {
  const congDung = (rec.congDung || '').trim();

  // If congDung has explicit "không phải" → it's the gold reason
  if (/không phải|không là|ngoại trừ|trừ loại/i.test(congDung)) {
    return congDung.slice(0, 200);
  }

  // Otherwise derive from siblings
  const siblings = (lkRecord.s || []).slice(0, 3);
  if (siblings.length === 0) return `${rec.tenHang} không thuộc phân nhóm cụ thể nào trong nhóm ${lkRecord.heading || ''}`;

  const sibNames = siblings.map(s => cleanVn(s.v).slice(0, 40)).join('; ');
  return `Không thuộc các loại cụ thể: ${sibNames} — đây là loại thông thường/đa năng không có tiêu chí chuyên biệt`;
}

// --------------------------------------------------------------------------
// Build examples from oz-gold records for a given HS code
// --------------------------------------------------------------------------

function goldExamples(hs, goldList, lkRecord) {
  const top = goldList.slice(0, 5);
  return top.map(rec => {
    const ex = {
      sanPham: rec.tenHang || '',
      lyDoLoaiKhac: extractLyDo(rec, lkRecord),
      source: 'oz-gold',
      ozCount: rec.ozCount || 1,
    };
    if (rec.chatLieu) ex.chatLieu = rec.chatLieu;
    if (rec.congDung && rec.congDung !== rec.tenHang) ex.congDung = rec.congDung;
    // Keep short sampleDesc as customs declaration reference
    if (rec.sampleDesc) ex.khaiBaoMau = truncate(rec.sampleDesc, 180);
    return ex;
  });
}

// --------------------------------------------------------------------------
// Derive examples for codes WITHOUT oz-gold data
// Uses heading description + sibling complement logic
// --------------------------------------------------------------------------

function deriveExamples(hs, lkRecord, chapterRec) {
  const siblings = (lkRecord.s || []).filter(s => parseFloat(s.t) >= 0);
  const heading = hs.slice(0, 4);

  const hn = chapterRec?.headingNote || {};
  const nhom = cleanVn(hn.nhom || '');
  const baoGom = cleanVn(hn.bao_gom || '');
  const sen = cleanVn(hn.sen || '');
  const phanBiet = cleanVn(hn.phan_biet || '');

  const examples = [];

  // Strategy 1: derive from heading description (nhom/bao_gom)
  // The nhom often lists ALL subtypes — some are captured by specific codes,
  // the rest fall into "Loại khác"
  if (nhom || baoGom) {
    const desc = nhom || baoGom;
    // Split into sentences/items, filter those NOT matching sibling names
    const sibVns = siblings.map(s => cleanVn(s.v).toLowerCase().slice(0, 30));

    // Extract list items (separated by (1), (2), (a), (b), semicolons)
    const items = desc
      .split(/[;]|\(\d+\)|\([a-z]\)|(?<=[.:])\s+(?=[A-ZĐÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆ])/u)
      .map(s => s.replace(/^\s*[-–•]\s*/, '').trim())
      .filter(s => s.length > 10 && s.length < 150);

    // Pick items that don't closely match any sibling name, and clean artifacts
    const candidates = items
      .map(s => s.replace(/\b[oO]\s+[oO]\s+[oO]\b/g, '').replace(/\s+/g,' ').trim())
      .filter(item => item.length > 10)
      .filter(item => {
        const lower = item.toLowerCase();
        return !sibVns.some(sv => lower.includes(sv) || sv.includes(lower.slice(0, 20)));
      });

    for (const c of candidates.slice(0, 3)) {
      // Dedup sibling names for display
    const sibNames = [...new Set(siblings.map(s => cleanVn(s.v).slice(0, 40)))].slice(0, 3);
    const sibList = sibNames.join(', ');
      examples.push({
        sanPham: truncate(c, 80),
        lyDoLoaiKhac: siblings.length > 0
          ? `Không đáp ứng tiêu chí của các mã cụ thể (${sibList || 'xem siblings'}) — thuộc loại thông thường trong nhóm ${heading}`
          : `Hàng hóa thuộc nhóm ${heading} chưa được liệt kê tại phân nhóm cụ thể nào`,
        source: 'derived',
      });
    }
  }

  // Strategy 2: if SEN note describes specific criteria, the complement is "Loại khác"
  if (sen && sen.length > 40 && examples.length < 3) {
    const sibling0 = siblings[0];
    if (sibling0) {
      examples.push({
        sanPham: `Hàng hóa thuộc nhóm ${heading} không đáp ứng tiêu chí SEN`,
        lyDoLoaiKhac: `Mã ${sibling0.h} (${cleanVn(sibling0.v).slice(0,50)}) yêu cầu: ${truncate(sen, 120)}. Hàng không đáp ứng điều kiện này → áp mã Loại khác ${hs}`,
        source: 'derived',
      });
    }
  }

  // Strategy 3: phan_biet gives explicit differentiation clues
  if (phanBiet && examples.length < 3) {
    examples.push({
      sanPham: `Hàng hóa thuộc nhóm ${heading} (dạng thông thường)`,
      lyDoLoaiKhac: `Phân biệt: ${truncate(phanBiet, 150)}`,
      source: 'derived',
    });
  }

  // Fallback: at least 1 generic example
  if (examples.length === 0) {
    const sibDesc = siblings.length > 0
      ? `không là: ${[...new Set(siblings.map(s=>cleanVn(s.v).slice(0,35)))].slice(0,3).join('; ')}`
      : `chưa được chi tiết thêm trong nhóm ${heading}`;
    examples.push({
      sanPham: `Hàng hóa thuộc nhóm ${heading} — loại thông thường`,
      lyDoLoaiKhac: `${sibDesc}`,
      source: 'derived',
    });
  }

  return examples.slice(0, 5);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();
  console.log('Loading data...');

  const goldByHs = await loadGold();
  const idx      = load(OUT_IDX);
  const enriched = load(OUT_FULL);

  console.log(`oz-gold: ${goldByHs.size} HS codes | loai-khac index: ${Object.keys(idx).length} codes`);
  const goldCoverage = Object.keys(idx).filter(hs => goldByHs.has(hs)).length;
  console.log(`Gold coverage: ${goldCoverage} mã có real examples (${(goldCoverage/Object.keys(idx).length*100).toFixed(0)}%)`);

  // Determine codes to process
  const allHs = Object.keys(idx);
  const todo = allHs.filter(hs => {
    if (opts.chapter && !hs.startsWith(opts.chapter)) return false;
    if (!opts.force && idx[hs].examples) return false;
    return true;
  });

  console.log(`\nProcessing: ${todo.length} codes${opts.chapter ? ` (chapter ${opts.chapter})` : ''}`);

  if (opts.dryRun) {
    const sample = todo[0];
    if (sample) {
      const lkRec = idx[sample];
      const chRec = enriched.codes?.[sample];
      const goldList = goldByHs.get(sample) || [];
      const exs = goldList.length > 0
        ? goldExamples(sample, goldList, lkRec)
        : deriveExamples(sample, lkRec, chRec);
      console.log(`\nSample ${sample}:`);
      console.log(JSON.stringify(exs, null, 2));
    }
    return;
  }

  // Process all chapters one by one, write per-chapter files
  const chapters = [...new Set(todo.map(hs => hs.slice(0, 2)))].sort();
  let totalDone = 0, goldCount = 0, derivedCount = 0;

  for (const ch of chapters) {
    const chPath = path.join(LK_DIR, `ch${ch}.json`);
    if (!fs.existsSync(chPath)) continue;

    const chData = load(chPath);
    const chHs = todo.filter(hs => hs.startsWith(ch));
    let modified = false;

    for (const hs of chHs) {
      const lkRec = idx[hs];
      const chRec = chData[hs];
      if (!lkRec || !chRec) continue;

      const goldList = goldByHs.get(hs) || [];
      const examples = goldList.length > 0
        ? goldExamples(hs, goldList, lkRec)
        : deriveExamples(hs, lkRec, chRec);

      chData[hs].examples = examples;
      idx[hs].ex = examples.map(e => ({
        p: e.sanPham,                   // product
        l: e.lyDoLoaiKhac,              // lyDo
        s: e.source,                    // source
        ...(e.chatLieu ? { m: e.chatLieu } : {}),    // material
        ...(e.khaiBaoMau ? { k: e.khaiBaoMau } : {}), // khai bao mau
        ...(e.ozCount ? { n: e.ozCount } : {}),       // count
      }));

      if (goldList.length > 0) goldCount++; else derivedCount++;
      modified = true;
      totalDone++;
    }

    if (modified) {
      // Atomic write
      fs.writeFileSync(`${chPath}.tmp`, JSON.stringify(chData, null, 2), 'utf8');
      fs.renameSync(`${chPath}.tmp`, chPath);
    }
    process.stdout.write(`\r  Chapters done: ${chapters.indexOf(ch)+1}/${chapters.length} (${totalDone} mã)`);
  }

  console.log(`\n\nHoàn thành: ${totalDone} mã`);
  console.log(`  oz-gold examples: ${goldCount} mã`);
  console.log(`  derived examples: ${derivedCount} mã`);

  // Rebuild merged outputs
  console.log('\nRebuilding merged files...');

  // Rebuild enriched
  const files = fs.readdirSync(LK_DIR).filter(f => /^ch\d+\.json$/.test(f)).sort();
  const allRecords = {};
  for (const f of files) Object.assign(allRecords, load(path.join(LK_DIR, f)));

  const chapterNotes = {}, headingNotes = {}, codesFull = {};
  for (const [hs, rec] of Object.entries(allRecords)) {
    if (rec.chapterNote && !chapterNotes[rec.chapter]) chapterNotes[rec.chapter] = rec.chapterNote;
    if (rec.headingNote && !headingNotes[rec.heading]) headingNotes[rec.heading] = rec.headingNote;
    const { chapterNote, headingNote, ...core } = rec;
    codesFull[hs] = core;
  }
  const enrichedOut = {
    meta: {
      generated: new Date().toISOString().slice(0, 10),
      total: Object.keys(codesFull).length,
      withExamples: Object.values(codesFull).filter(v => v.examples?.length > 0).length,
      goldExamples: Object.values(codesFull).filter(v => v.examples?.some(e => e.source === 'oz-gold')).length,
    },
    chapters: chapterNotes,
    headings: headingNotes,
    codes: codesFull,
  };
  save(OUT_FULL, enrichedOut);
  save(OUT_IDX, idx);

  const idxSz  = (fs.statSync(OUT_IDX).size  / 1e6).toFixed(1);
  const fullSz = (fs.statSync(OUT_FULL).size / 1e6).toFixed(1);
  console.log(`index=${idxSz}MB | enriched=${fullSz}MB`);
  console.log(`Gold-backed examples: ${enrichedOut.meta.goldExamples} mã | Derived: ${Object.keys(codesFull).length - enrichedOut.meta.goldExamples} mã`);
}

main().catch(e => { console.error(e); process.exit(1); });
