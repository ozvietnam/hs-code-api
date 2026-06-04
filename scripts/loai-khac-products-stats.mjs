#!/usr/bin/env node
/**
 * loai-khac-products-stats.mjs
 *
 * Đếm + đánh giá độ "có thể đào thêm" cho mỗi mã HS 8 số Loại khác.
 * Đọc corpus đã sinh + index tín hiệu → ghi data/loai-khac-products-stats.json
 *
 * Mỗi mã được gắn:
 *   - productCount: số sản phẩm hiện có
 *   - sources: {rule, ozGold, fallback}
 *   - signals: {h6En, ozGoldCount, siblingCount, riskLevel, dutyGap}
 *   - potential: 'saturated' | 'high' | 'medium' | 'low'
 *   - canMine: bool — có nên bật chế độ làm giàu thêm không
 *   - reason: giải thích ngắn (tiếng Việt)
 *
 * Usage:
 *   node scripts/loai-khac-products-stats.mjs           # ghi file
 *   node scripts/loai-khac-products-stats.mjs --top 30  # in queue ưu tiên đào
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.join(__dirname, '..');
const CORPUS   = path.join(ROOT, 'data', 'loai-khac-products.jsonl');
const IDX_PATH = path.join(ROOT, 'data', 'loai-khac-index.json');
const TAX_PATH = path.join(ROOT, 'data', 'tax.json');
const OUT_PATH = path.join(ROOT, 'data', 'loai-khac-products-stats.json');

function parseEnQualifier(en) {
  if (!en || !en.includes(';')) return '';
  const tail = en.slice(en.indexOf(';') + 1).trim();
  if (/n\.?e\.?c\.?|not elsewhere|not specified|parts thereof$/i.test(tail)) return '';
  return tail.slice(0, 70);
}

// Thang điểm ưu tiên đào: risk cao + duty gap lớn = đáng đào trước
const RISK_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function assess({ domainCount, ozCount, fallbackCount, h6En, siblingCount }) {
  // Đã có template domain sinh đủ biến thể → đủ rồi
  if (domainCount >= 4) {
    return { potential: 'saturated', canMine: false,
      reason: `đã có template domain (${domainCount} sản phẩm), không cần đào thêm` };
  }
  // Template matched nhưng mỏng (vd danh sách bộ phận ít) — còn dư địa nếu có h6En
  if (domainCount >= 1) {
    if (h6En) return { potential: 'medium', canMine: true,
      reason: `template mỏng (${domainCount} sp) + còn h6En "${h6En}" — mở rộng biến thể được` };
    return { potential: 'saturated', canMine: false,
      reason: `template domain mỏng (${domainCount} sp), ít dư địa` };
  }
  // domainCount === 0: chỉ có fallback (± oz-gold)
  if (h6En) {
    return { potential: 'high', canMine: true,
      reason: `có h6En "${h6En}" nhưng đang fallback — viết domain template sẽ sinh nhiều sản phẩm` };
  }
  if (ozCount >= 1) {
    return { potential: 'medium', canMine: true,
      reason: `có ${ozCount} ví dụ oz-gold thực tế — mở rộng biến thể từ anchor được` };
  }
  if (siblingCount >= 2) {
    return { potential: 'low', canMine: true,
      reason: `chỉ có ${siblingCount} sibling để loại trừ — suy luận khó, ROI thấp` };
  }
  return { potential: 'low', canMine: false,
    reason: 'không có h6En/oz-gold/sibling — catch-all thuần, không nên đào' };
}

function main() {
  const args = process.argv.slice(2);
  const topIdx = args.indexOf('--top');
  const topN = topIdx >= 0 ? parseInt(args[topIdx + 1], 10) || 30 : 0;

  const idx = JSON.parse(fs.readFileSync(IDX_PATH, 'utf8'));
  const tax = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));

  // Đếm sản phẩm theo nguồn từ corpus
  const counts = {}; // hs → {rule, ozGold, fallback}
  for (const line of fs.readFileSync(CORPUS, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let rec; try { rec = JSON.parse(line); } catch { continue; }
    const hs = rec.hs;
    if (!counts[hs]) counts[hs] = { rule: 0, ozGold: 0, fallback: 0 };
    if (rec.source === 'oz-gold') counts[hs].ozGold++;
    else if (rec.source === 'rule-fallback') counts[hs].fallback++;
    else counts[hs].rule++;
  }

  const codes = {};
  const byPotential = { saturated: 0, high: 0, medium: 0, low: 0 };
  let totalProducts = 0;

  for (const hs of Object.keys(idx)) {
    const c = counts[hs] || { rule: 0, ozGold: 0, fallback: 0 };
    const productCount = c.rule + c.ozGold + c.fallback;
    totalProducts += productCount;

    const entry = idx[hs];
    const h6En = parseEnQualifier(tax[hs]?.en || '');
    const siblingCount = (entry.s || []).length;
    const riskLevel = entry.r || 'LOW';
    const dutyGap = entry.g || 0;

    const a = assess({
      domainCount: c.rule, ozCount: c.ozGold, fallbackCount: c.fallback,
      h6En, siblingCount,
    });
    byPotential[a.potential]++;

    // priorityScore: chỉ có ý nghĩa cho mã canMine — risk × (1 + dutyGap signal)
    const potW = { high: 3, medium: 2, low: 1, saturated: 0 }[a.potential];
    const priorityScore = a.canMine
      ? potW * RISK_WEIGHT[riskLevel] + (dutyGap > 0 ? 1 : 0)
      : 0;

    codes[hs] = {
      productCount,
      sources: c,
      signals: { h6En: h6En || null, ozGoldCount: c.ozGold, siblingCount, riskLevel, dutyGap },
      potential: a.potential,
      canMine: a.canMine,
      priorityScore,
      reason: a.reason,
    };
  }

  // Queue ưu tiên đào: canMine=true, sort theo priorityScore desc
  const mineableQueue = Object.entries(codes)
    .filter(([, v]) => v.canMine)
    .sort((a, b) => b[1].priorityScore - a[1].priorityScore)
    .map(([hs, v]) => ({
      hs, chapter: hs.slice(0, 2), productCount: v.productCount,
      potential: v.potential, priorityScore: v.priorityScore,
      riskLevel: v.signals.riskLevel, h6En: v.signals.h6En, reason: v.reason,
    }));

  const totalCodes = Object.keys(idx).length;
  const canMineCount = mineableQueue.length;

  const out = {
    generatedAt: new Date().toISOString(),
    corpus: 'data/loai-khac-products.jsonl',
    totals: {
      codes: totalCodes,
      products: totalProducts,
      avgPerCode: +(totalProducts / totalCodes).toFixed(2),
      canMine: canMineCount,
      done: totalCodes - canMineCount,
    },
    byPotential,
    // Top 200 mã đáng đào nhất — bật chế độ làm giàu thì xử lý theo thứ tự này
    mineableQueue: mineableQueue.slice(0, 200),
    codes,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 0));
  const sz = (fs.statSync(OUT_PATH).size / 1e6).toFixed(2);

  console.log(`Stats ghi: ${OUT_PATH} (${sz}MB)`);
  console.log(`Tổng: ${totalCodes} mã | ${totalProducts} sản phẩm | avg ${out.totals.avgPerCode}/mã`);
  console.log(`Đánh giá độ đào sâu:`);
  console.log(`  saturated (đủ rồi):   ${byPotential.saturated}`);
  console.log(`  high (đào trước):     ${byPotential.high}`);
  console.log(`  medium (đào được):    ${byPotential.medium}`);
  console.log(`  low (ROI thấp):       ${byPotential.low}`);
  console.log(`  → canMine = ${canMineCount} mã (${(canMineCount/totalCodes*100).toFixed(0)}%)`);

  if (topN > 0) {
    console.log(`\nTop ${topN} mã ưu tiên đào (priorityScore):`);
    for (const q of mineableQueue.slice(0, topN)) {
      console.log(`  [${q.priorityScore}] ${q.hs} (${q.potential}/${q.riskLevel}) ${q.h6En || '—'}`);
    }
  }
}

main();
