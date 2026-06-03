#!/usr/bin/env node
/**
 * build-loai-khac-chapter.mjs
 *
 * Xây dựng chú giải sâu cho tất cả mã "Loại khác" trong một chương HS.
 * Kết hợp 3 lớp:
 *   1. Cấu trúc  — siblings cùng nhóm 6 số + chênh lệch thuế
 *   2. Chú giải  — chu-giai-chuong, chu-giai-heading, explanatory-notes
 *   3. AI tổng hợp — Gemini sinh exclusionNote + auditRisk
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/build-loai-khac-chapter.mjs --chapter 10
 *   GEMINI_API_KEY=... node scripts/build-loai-khac-chapter.mjs --chapter 10 --no-ai
 *   GEMINI_API_KEY=... node scripts/build-loai-khac-chapter.mjs --chapter 10 --dry-run
 *   node scripts/build-loai-khac-chapter.mjs --list   # liệt kê tất cả chapters + số LK code
 *
 * Output: data/loai-khac/ch{XX}.json (resume-safe)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT_DIR = path.join(DATA, 'loai-khac');

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

const GEMINI_MODEL = process.env.GEMINI_ENRICH_MODEL || 'gemini-2.5-flash';
const CONCURRENCY = 3;
const SAVE_EVERY = 5;

const SYSTEM_PROMPT = `Bạn là chuyên gia phân loại hàng hóa hải quan Việt Nam theo Biểu thuế xuất nhập khẩu 2022 (HS 2022).

Nhiệm vụ: phân tích mã "Loại khác" (residual subheading) và viết chú giải kỹ thuật chính xác.

Quy tắc:
- Mã "Loại khác" chỉ áp dụng khi hàng hóa KHÔNG thuộc bất kỳ mã cụ thể nào cùng nhóm (GIR Rule 1: mô tả cụ thể hơn luôn được ưu tiên).
- exclusionNote phải nêu rõ: (a) hàng hóa thực tế thuộc mã này là gì, (b) từng mã cụ thể kia bao gồm gì để phân biệt.
- auditRisk: chỉ đặt nếu thuế suất MFN của mã Loại khác THẤP HƠN ít nhất 1 mã cụ thể → đây là điểm Hải quan hay check.
- Viết bằng tiếng Việt, súc tích, tránh lặp thông tin đã có trong tên mã.

Trả về JSON duy nhất (không markdown): {"exclusionNote": "...", "auditRisk": "..." | null}`;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function load(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function save(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(`${p}.tmp`, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(`${p}.tmp`, p);
}

function parseDuty(raw) {
  if (!raw) return 0;
  const m = String(raw).match(/^[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function riskLevel(gap) {
  if (gap >= 20) return 'HIGH';
  if (gap >= 5)  return 'MEDIUM';
  return 'LOW';
}

function parseArgs() {
  const args = process.argv.slice(2);
  const o = { chapter: null, noAi: false, dryRun: false, list: false };
  for (const a of args) {
    if (a === '--no-ai')   o.noAi = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--list')    o.list  = true;
    else if (a.startsWith('--chapter=')) o.chapter = a.slice(10).padStart(2, '0');
    else if (a.startsWith('--chapter'))  o.chapter = args[args.indexOf(a) + 1]?.padStart(2, '0');
  }
  return o;
}

// --------------------------------------------------------------------------
// Gemini
// --------------------------------------------------------------------------

async function geminiCall(hs, prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.15, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status} for ${hs}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Empty Gemini response for ${hs}`);
  return JSON.parse(text);
}

function buildPrompt(code, siblings, headingNote, chapterNote) {
  const siblingsText = siblings.length
    ? siblings.map(s => {
        const note = s.baoGom ? `\n     Chú giải bao gồm: ${s.baoGom.slice(0, 200)}` : '';
        return `  - ${s.hs}: ${s.vn} (Thuế MFN: ${s.tt}%)${note}`;
      }).join('\n')
    : '  (không có mã cụ thể nào — mã này là duy nhất trong nhóm)';

  const h = headingNote || {};
  const headingText = [
    h.nhom    ? `Mô tả nhóm: ${h.nhom.slice(0, 400)}`         : null,
    h.tinh_chat ? `Tính chất: ${h.tinh_chat.slice(0, 200)}`   : null,
    h.phan_biet ? `Phân biệt: ${h.phan_biet.slice(0, 300)}`   : null,
  ].filter(Boolean).join('\n');

  return `Mã cần phân tích: ${code.hs}
Tên hàng: ${code.vn}
Nhóm: ${code.heading} | Chương: ${code.chapter}
Thuế suất MFN của mã này: ${code.mfn || code.tt || '0'}%

=== Chú giải chương ${code.chapter} ===
${(chapterNote || '').slice(0, 600)}

=== Chú giải nhóm ${code.heading} ===
${headingText || '(không có)'}

=== Các mã cụ thể cùng nhóm ${code.heading6} ===
${siblingsText}

Hãy viết exclusionNote và auditRisk cho mã Loại khác ${code.hs}.`;
}

// --------------------------------------------------------------------------
// Pool runner
// --------------------------------------------------------------------------

async function runPool(tasks, concurrency, fn) {
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      await fn(tasks[i], i);
    }
  }
  await Promise.all(Array(Math.min(concurrency, tasks.length || 1)).fill(0).map(() => worker()));
}

// --------------------------------------------------------------------------
// Build structural data for one "Loại khác" code
// --------------------------------------------------------------------------

function buildStructural(hs, tax, expNotes, chuongNotes, headingNotes) {
  const rec = tax[hs];
  const chapter = hs.slice(0, 2);
  const heading4 = hs.slice(0, 4);
  const heading6 = hs.slice(0, 6);

  // Siblings: same 6-digit parent, NOT "loại khác"
  const siblings = Object.values(tax)
    .filter(r =>
      r.hs.slice(0, 6) === heading6 &&
      r.hs !== hs &&
      !r.vn.toLowerCase().includes('loại khác')
    )
    .map(s => ({
      hs: s.hs,
      vn: s.vn,
      tt: s.tt || '0',
      mfn: s.mfn || s.tt || '0',
      baoGom: expNotes[s.hs]?.noteVi || null,
    }));

  // Duty gap: max sibling duty - this code's duty
  const myDuty = parseDuty(rec.tt);
  const maxSibDuty = siblings.reduce((m, s) => Math.max(m, parseDuty(s.tt)), 0);
  const gap = Math.max(0, maxSibDuty - myDuty);

  return {
    hs,
    chapter,
    heading: heading4,
    heading6,
    vn: rec.vn,
    en: rec.en || null,
    dvt: rec.dvt || null,
    tt: rec.tt || '0',
    mfn: rec.mfn || rec.tt || '0',
    specificSiblings: siblings,
    headingNote: headingNotes[heading4] || null,
    chapterNote: chuongNotes[chapter]?.chuong || null,
    dutyGap: gap,
    riskLevel: riskLevel(gap),
    // AI fields filled later
    exclusionNote: null,
    auditRisk: null,
  };
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();
  const apiKey = process.env.GEMINI_API_KEY;

  // Load data
  const tax       = load(path.join(DATA, 'tax.json'));
  const expNotes  = load(path.join(DATA, 'explanatory-notes.json'));
  const chuong    = load(path.join(DATA, 'chu-giai-chuong.json'));
  const heading   = load(path.join(DATA, 'chu-giai-heading.json'));

  // All "Loại khác" codes grouped by chapter
  const byChapter = {};
  for (const [hs, rec] of Object.entries(tax)) {
    if (!rec.vn.toLowerCase().includes('loại khác')) continue;
    const ch = hs.slice(0, 2);
    (byChapter[ch] = byChapter[ch] || []).push(hs);
  }

  // --list mode
  if (opts.list) {
    console.log('\nChương | Mã LK | Tổng mã | Đã xử lý');
    for (const ch of Object.keys(byChapter).sort()) {
      const outPath = path.join(OUT_DIR, `ch${ch}.json`);
      const done = fs.existsSync(outPath)
        ? Object.keys(load(outPath)).length : 0;
      const total = Object.keys(tax).filter(k => k.slice(0,2) === ch).length;
      const lk = byChapter[ch].length;
      const mark = done === lk ? '✓' : done > 0 ? `${done}/${lk}` : '-';
      console.log(`  ${ch}     |  ${String(lk).padStart(3)}  |   ${String(total).padStart(4)}  | ${mark}`);
    }
    return;
  }

  if (!opts.chapter) {
    console.error('Thiếu --chapter XX hoặc dùng --list\nVí dụ: node scripts/build-loai-khac-chapter.mjs --chapter 10');
    process.exit(1);
  }

  const chapter = opts.chapter;
  const codes = byChapter[chapter] || [];

  if (codes.length === 0) {
    console.log(`Chương ${chapter}: không có mã "Loại khác".`);
    return;
  }

  const outPath = path.join(OUT_DIR, `ch${chapter}.json`);
  const existing = fs.existsSync(outPath) ? load(outPath) : {};

  // Determine which codes need processing
  const todo = codes.filter(hs => {
    const ex = existing[hs];
    if (!ex) return true;
    if (opts.noAi) return false;             // structural already done
    return ex.exclusionNote === null;        // AI not yet filled
  });

  console.log(`\n=== Chương ${chapter} ===`);
  console.log(`Mô hình AI: ${GEMINI_MODEL} | Concurrency: ${CONCURRENCY}`);
  console.log(`Tổng mã Loại khác: ${codes.length} | Đã có: ${codes.length - todo.length} | Cần xử lý: ${todo.length}`);
  if (opts.noAi) console.log('Chế độ: Structural only (--no-ai)');
  if (opts.dryRun) {
    console.log('DRY RUN — 5 mã đầu:', todo.slice(0, 5));
    return;
  }
  if (!opts.noAi && !apiKey) {
    console.error('GEMINI_API_KEY chưa set. Dùng --no-ai để chạy không cần AI.');
    process.exit(1);
  }

  const pending = new Map();
  let done = 0, errors = 0;

  await runPool(todo, CONCURRENCY, async (hs, taskIdx) => {
    // Build structural record
    const struct = buildStructural(hs, tax, expNotes, chuong, heading);

    if (!opts.noAi) {
      try {
        const prompt = buildPrompt(struct, struct.specificSiblings, struct.headingNote, struct.chapterNote);
        const ai = await geminiCall(hs, prompt, apiKey);
        struct.exclusionNote = ai.exclusionNote || null;
        struct.auditRisk     = ai.auditRisk || null;
      } catch (e) {
        errors++;
        console.error(`\n  [ERR] ${hs}: ${e.message.slice(0, 120)}`);
      }
    }

    pending.set(hs, struct);
    done++;
    process.stdout.write(`\r  ${done}/${todo.length} xong (lỗi: ${errors})   `);

    if ((taskIdx + 1) % SAVE_EVERY === 0 && pending.size > 0) {
      const fresh = fs.existsSync(outPath) ? load(outPath) : {};
      for (const [k, v] of pending) fresh[k] = v;
      save(outPath, fresh);
      pending.clear();
    }
  });

  // Final flush
  if (pending.size > 0) {
    const fresh = fs.existsSync(outPath) ? load(outPath) : {};
    for (const [k, v] of pending) fresh[k] = v;
    save(outPath, fresh);
  }

  console.log(`\n\nHoàn thành chương ${chapter}: ${done} mã xử lý, ${errors} lỗi`);
  console.log(`Output: ${outPath}`);

  // Print summary of HIGH risk codes
  const result = load(outPath);
  const highRisk = Object.values(result).filter(v => v.riskLevel === 'HIGH');
  if (highRisk.length > 0) {
    console.log(`\n⚠  HIGH risk (chênh lệch thuế > 20%):`);
    for (const r of highRisk.slice(0, 10)) {
      const topSib = r.specificSiblings.reduce((m, s) =>
        parseDuty(s.tt) > parseDuty(m.tt) ? s : m, { tt: '0', hs: '-', vn: '' });
      console.log(`   ${r.hs} (${r.tt}%) vs ${topSib.hs} (${topSib.tt}%) — ${r.vn}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
