#!/usr/bin/env node
/**
 * Hàng đợi cả cuốn biểu thuế cho vòng lặp BẢNG QUYẾT ĐỊNH theo nhóm 4 số —
 * 1.269 nhóm, xếp theo chỗ nào đang thiếu nhất, không phải theo thứ tự chương.
 * Đơn vị việc (CEO chốt 2026-09-17): một bảng quyết định theo thuộc tính cho
 * một nhóm (data/decision-tables/<nhóm>.json) + mục từ điển tên ở cấp nhóm.
 *
 *   npm run dict:queue                      # 30 nhóm đầu còn trống
 *   npm run dict:queue -- --top=100
 *   npm run dict:queue -- --chapter=84      # chỉ một chương
 *   npm run dict:queue -- --write           # ghi data/dictionary-queue.json cho agent đọc
 *   npm run dict:queue -- --claim=8536 --by=hermes-1
 *   npm run dict:queue -- --done=8536 --by=hermes-1 --commit=abc1234
 *   npm run dict:queue -- --release=8536    # trả lại hàng đợi (agent bỏ dở)
 *
 * TÍN HIỆU XẾP HẠNG (in ra từng cột để ai cũng kiểm được):
 *   err   — số tờ khai thật bị đoán sai trong nhóm (data/conflict-worklist.json).
 *           Lỗi đã xảy ra là lý do mạnh nhất.
 *   oz    — số tờ khai Oz rơi vào nhóm (từ hs-aliases) và tỉ lệ lá đã có alias.
 *           Oz làm nhiều mà alias mới phủ ít lá → người dùng gõ tên hàng thật
 *           nhưng tra ra mã sai/mã cụt.
 *   dư    — tỉ lệ dòng "Loại khác" trong nhóm. Nhóm toàn dòng dư thì lời văn
 *           biểu thuế câm, chỉ từ điển tay mới nối được tên hàng → mã.
 *   lá    — nhóm to hơn thì đáng làm hơn một chút, nhưng chỉ một chút.
 *
 * TẦNG (tier) — quyết định có làm và làm lúc nào:
 *   A  ưu tiên: có lỗi thật, hoặc Oz làm nhiều mà phủ mỏng, hoặc nhóm toàn dòng dư.
 *   B  công nghiệp (ch.25–96) chưa có tín hiệu đặc biệt.
 *   C  ch.01–24 nông sản/thực phẩm: tên biểu thuế đã là tên thị trường, Oz không
 *      có tờ khai — làm sau cùng.
 *   X  bỏ qua: ch.98 (phụ lục ưu đãi đặc biệt, không tra bằng tên hàng).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import {
  ROOT, PROGRESS_PATH, QUEUE_PATH, allHeadings, headingTitle, isHeading, leavesOf,
  loadProgress, loadTax, today,
} from './dict-lib.mjs';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const opt = (name, fallback = null) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : argv.includes(`--${name}`) ? true : fallback;
};

const tax = loadTax();
const dt = require(join(ROOT, 'lib', 'decision-tables.js'));
const progress = loadProgress();
progress.headings = progress.headings || {};

function saveProgress() {
  writeFileSync(PROGRESS_PATH, `${JSON.stringify(progress, null, 2)}\n`);
}

/* ---------- lệnh đổi sổ tiến độ ---------- */
const claim = opt('claim');
const done = opt('done');
const release = opt('release');
if (claim || done || release) {
  const h = claim || done || release;
  if (!isHeading(h) || !leavesOf(tax, h).length) {
    console.error(`Nhóm ${h} không có trong biểu thuế.`);
    process.exit(2);
  }
  const cur = progress.headings[h] || {};
  if (claim) {
    if (cur.status === 'done') {
      console.error(`${h} đã done (${cur.doneAt}, ${cur.by}). Không nhận lại trừ khi biểu thuế đổi.`);
      process.exit(1);
    }
    if (cur.status === 'claimed' && cur.by !== opt('by')) {
      console.error(`${h} đang do ${cur.by} nhận từ ${cur.claimedAt}. Dùng --release=${h} nếu họ đã bỏ.`);
      process.exit(1);
    }
    progress.headings[h] = { status: 'claimed', claimedAt: today(), by: opt('by', 'unknown'), leafCount: leavesOf(tax, h).length };
    saveProgress();
    console.log(`✓ ${h} nhận bởi ${progress.headings[h].by} — ${progress.headings[h].leafCount} lá.`);
  } else if (done) {
    const cov = dt.tableCoverage(h, tax);
    const errors = cov.hasTable ? dt.validateTable(dt.loadTable(h), tax) : ['chưa có bảng'];
    if (!cov.hasTable || cov.missingHs.length || errors.length) {
      console.error(`${h} chưa đủ điều kiện done: bảng ${cov.hasTable ? 'có' : 'CHƯA có'}, ${cov.missingHs.length} lá chưa có đường tới, ${errors.length} lỗi cấu trúc. Chạy dict:check trước.`);
      process.exit(1);
    }
    progress.headings[h] = {
      status: 'done', doneAt: today(), by: opt('by', cur.by || 'unknown'), commit: opt('commit', cur.commit || null),
      leafCount: cov.leaves.length, table: true, rules: dt.loadTable(h).rules.length,
    };
    saveProgress();
    console.log(`✓ ${h} done — ${cov.leaves.length} lá, ${dt.loadTable(h).rules.length} luật.`);
  } else {
    delete progress.headings[h];
    saveProgress();
    console.log(`✓ ${h} trả lại hàng đợi.`);
  }
  process.exit(0);
}

/* ---------- tín hiệu ---------- */
const aliases = require(join(ROOT, 'data', 'hs-aliases.json')).aliases || [];
const context = require(join(ROOT, 'data', 'hs-context.json')).context || {};
const worklistPath = join(ROOT, 'data', 'conflict-worklist.json');
const clusters = existsSync(worklistPath) ? JSON.parse(readFileSync(worklistPath, 'utf8')).clusters || [] : [];

const oz = {};
for (const a of aliases) {
  const h = a.hsCode.slice(0, 4);
  oz[h] = oz[h] || { count: 0, leaves: new Set() };
  oz[h].count += a.count || 0;
  oz[h].leaves.add(a.hsCode);
}
const err = {};
for (const c of clusters) for (const h of c.headings || []) err[h] = (err[h] || 0) + (c.errorCount || 0);

function tierOf(h, sig) {
  const ch = Number(h.slice(0, 2));
  if (ch === 98) return ['X', 'ch.98 phụ lục ưu đãi đặc biệt — không tra bằng tên hàng'];
  if (sig.err > 0) return ['A', `${sig.err} tờ khai thật đã đoán sai`];
  if (sig.ozCount >= 20 && sig.ozLeafRatio < 0.6) return ['A', `Oz ${sig.ozCount} tờ khai nhưng alias mới phủ ${Math.round(sig.ozLeafRatio * 100)}% lá`];
  if (ch >= 25 && sig.leaf >= 6 && sig.residualRatio >= 0.5) return ['A', `${Math.round(sig.residualRatio * 100)}% dòng là "Loại khác" — lời văn biểu thuế câm`];
  if (ch <= 24) return ['C', 'nông sản/thực phẩm — tên biểu thuế đã là tên thị trường'];
  return ['B', ''];
}

const rows = [];
for (const h of allHeadings(tax)) {
  const leaves = leavesOf(tax, h);
  const residual = leaves.filter((k) => context[k]).length;
  const o = oz[h] || { count: 0, leaves: new Set() };
  const sig = {
    leaf: leaves.length,
    residual,
    residualRatio: leaves.length ? residual / leaves.length : 0,
    ozCount: o.count,
    ozLeaf: o.leaves.size,
    ozLeafRatio: leaves.length ? o.leaves.size / leaves.length : 0,
    err: err[h] || 0,
  };
  const [tier, whyVi] = tierOf(h, sig);
  const score =
    tier === 'X'
      ? 0
      : Math.round(
          10 *
            (5 * Math.min(sig.err, 10) +
              3 * Math.log10(sig.ozCount + 1) * (1 - sig.ozLeafRatio) +
              4 * sig.residualRatio +
              Math.min(sig.leaf, 50) / 50 +
              (tier === 'A' ? 5 : tier === 'C' ? -5 : 0))
        ) / 10;
  const st = progress.headings[h] || {};
  rows.push({ heading: h, tier, score, ...sig, whyVi, status: st.status || 'open', by: st.by || null });
}
rows.sort((a, b) => b.score - a.score || a.heading.localeCompare(b.heading));

const chapter = opt('chapter');
const top = Number(opt('top', 30));
const OPEN = new Set(['open', 'dictionary']);
const shown = rows.filter((r) => OPEN.has(r.status) && r.tier !== 'X' && (!chapter || r.heading.startsWith(String(chapter).padStart(2, '0'))));

const doneN = rows.filter((r) => r.status === 'done').length;
const claimedN = rows.filter((r) => r.status === 'claimed').length;
const byTier = {};
for (const r of rows) byTier[r.tier] = (byTier[r.tier] || 0) + 1;
console.log(`\n=== Hàng đợi từ điển — ${rows.length} nhóm 4 số · done ${doneN} · đang nhận ${claimedN} · tầng A ${byTier.A || 0} / B ${byTier.B || 0} / C ${byTier.C || 0} / bỏ ${byTier.X || 0} ===`);
console.log(`Lá có bảng quyết định: ${rows.filter((r) => r.status === 'done').reduce((s, r) => s + r.leaf, 0)} / ${rows.filter((r) => r.tier !== 'X').reduce((s, r) => s + r.leaf, 0)} (không tính ch.98) · nhóm mới có từ điển, chưa có bảng: ${rows.filter((r) => r.status === 'dictionary').length}\n`);
console.log('nhóm  tầng điểm   lá  dư%  oz   ozlá%  lỗi  từđiển  lý do');
for (const r of shown.slice(0, top)) {
  console.log(
    `${r.heading}  ${r.tier}   ${String(r.score).padStart(5)}  ${String(r.leaf).padStart(3)}  ${String(Math.round(r.residualRatio * 100)).padStart(3)}  ${String(r.ozCount).padStart(4)}  ${String(Math.round(r.ozLeafRatio * 100)).padStart(4)}  ${String(r.err).padStart(3)}  ${r.status === 'dictionary' ? '  ✓   ' : '      '}  ${r.whyVi}`
  );
}
if (shown.length > top) console.log(`… còn ${shown.length - top} nhóm nữa (--top=${shown.length}).`);

if (opt('write')) {
  const out = {
    generatedAt: new Date().toISOString(),
    noteVi:
      'Sinh bởi scripts/dict-queue.mjs. Agent nhận nhóm ĐẦU TIÊN còn open trong queue[] phù hợp tầng được giao, ' +
      'rồi --claim. Điểm = 5·lỗi + 3·log10(oz+1)·(1−ozlá) + 4·dư + lá/50 + tầng.',
    summary: { headings: rows.length, done: doneN, claimed: claimedN, byTier },
    queue: rows
      .filter((r) => r.tier !== 'X')
      .map((r) => ({
        heading: r.heading,
        titleEn: headingTitle(r.heading, tax),
        tier: r.tier,
        score: r.score,
        leafCount: r.leaf,
        residualRatio: Math.round(r.residualRatio * 100) / 100,
        ozDeclarations: r.ozCount,
        ozLeafRatio: Math.round(r.ozLeafRatio * 100) / 100,
        knownErrors: r.err,
        whyVi: r.whyVi,
        status: r.status,
        by: r.by,
      })),
  };
  writeFileSync(QUEUE_PATH, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`\nĐã ghi ${QUEUE_PATH.replace(ROOT + '/', '')} (${out.queue.length} nhóm).`);
}
