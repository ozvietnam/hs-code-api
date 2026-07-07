#!/usr/bin/env node
/**
 * Mine top mã HS 8 số từ oz-gold-final + merge seed chuyên gia → hs-declaration-overrides.json
 * Chạy: npm run mine:declaration-overrides
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const EXPERT_SEEDS = require('./lib/hs-override-seeds.js');

const TOP_N = Number(process.env.MINE_TOP_N || 100);
const tax = JSON.parse(readFileSync(join(root, 'data', 'tax.json'), 'utf8'));
const goldLines = readFileSync(join(root, 'data', 'oz-gold-final.jsonl'), 'utf8').trim().split('\n');

const counts = {};
const samples = {};
for (const line of goldLines) {
  const r = JSON.parse(line);
  const hs = String(r.hsCode || r.hs || '').replace(/\D/g, '').padStart(8, '0').slice(0, 8);
  if (!hs || hs === '00000000') continue;
  counts[hs] = (counts[hs] || 0) + 1;
  if (!samples[hs]) samples[hs] = r;
}

const topHs = Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, TOP_N)
  .map(([hs, ozCount]) => ({ hs, ozCount, sample: samples[hs] }));

function isLoaiKhac(vn = '') {
  return /loại khác/i.test(vn);
}

function inferAddRequired(hs, sample, taxRow) {
  const add = [];
  const vn = taxRow?.vn || '';
  if (sample?.models?.length) add.push('modelNumber');
  if (sample?.sizes?.length) add.push('dimensions');
  if (sample?.congDung || sample?.tenHang) add.push('application');
  if (sample?.chatLieu) {
    const ch = hs.slice(0, 2);
    if (ch === '39') add.push('polymerType');
    else if (ch === '40') add.push('rubberType');
    else if (['61', '62', '63'].includes(ch)) add.push('fiberContent');
    else if (ch === '73') add.push('steelGrade');
    else add.push('material');
  }
  if (isLoaiKhac(vn) && !add.includes('application')) add.push('application');
  return [...new Set(add)];
}

function buildAutoEntry({ hs, ozCount, sample }) {
  const taxRow = tax[hs];
  const titleVi = (sample?.tenHang || taxRow?.vn || hs).replace(/\s+/g, ' ').trim().slice(0, 120);
  const loaiKhac = isLoaiKhac(taxRow?.vn || '');
  return {
    titleVi,
    heading: hs.slice(0, 4),
    addRequired: inferAddRequired(hs, sample, taxRow),
    noteVi: loaiKhac
      ? `Mã Loại khác — ${ozCount} tờ khai Oz. Mô tả cụ thể theo CV 5189/755 (tránh "các loại")`
      : `${ozCount} tờ khai Oz — bổ sung thông số từ catalog/hóa đơn`,
    ozCount,
    mined: true,
  };
}

const hsCodes = {};
let expert = 0;
let auto = 0;

for (const { hs, ozCount, sample } of topHs) {
  if (EXPERT_SEEDS[hs]) {
    hsCodes[hs] = {
      heading: hs.slice(0, 4),
      ...EXPERT_SEEDS[hs],
      ozCount,
      source: 'expert',
    };
    expert += 1;
  } else {
    hsCodes[hs] = { ...buildAutoEntry({ hs, ozCount, sample }), source: 'mined' };
    auto += 1;
  }
}

// Giữ expert seeds ngoài top N nếu có
for (const [hs, seed] of Object.entries(EXPERT_SEEDS)) {
  if (!hsCodes[hs]) {
    hsCodes[hs] = { heading: hs.slice(0, 4), ...seed, source: 'expert' };
    expert += 1;
  }
}

const out = {
  version: new Date().toISOString().slice(0, 10),
  generatedBy: 'scripts/mine-hs-declaration-overrides.mjs',
  stats: {
    total: Object.keys(hsCodes).length,
    expert,
    auto,
    topNOz: TOP_N,
    ozGoldRecords: goldLines.length,
  },
  hsCodes,
};

writeFileSync(join(root, 'data', 'hs-declaration-overrides.json'), `${JSON.stringify(out, null, 2)}\n`);

const queuePath = join(root, 'data', 'hs-declaration-mine-queue.json');
const queue = topHs
  .filter(({ hs }) => hsCodes[hs]?.mined)
  .map(({ hs, ozCount }) => ({
    hs,
    ozCount,
    heading: hs.slice(0, 4),
    addRequired: hsCodes[hs].addRequired,
    titleVi: hsCodes[hs].titleVi,
  }));
writeFileSync(queuePath, `${JSON.stringify({ version: out.version, queue }, null, 2)}\n`);

console.log(
  `Wrote hs-declaration-overrides.json — ${out.stats.total} codes (${expert} expert, ${auto} auto-mined from top ${TOP_N})`
);
console.log(`Queue for manual review: ${queue.length} entries → data/hs-declaration-mine-queue.json`);
