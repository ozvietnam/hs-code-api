#!/usr/bin/env node
// A1 (#43) — DETERMINISTIC: dựng danh sách nhóm ưu tiên cần `phan_biet`.
// Không cần LLM. Xếp hạng nhóm 4-số thiếu phan_biet theo: tần suất khai Oz (ozCount)
// + có mặt trong conflicts.json + số mã 8-số anh em (≥2 mới cần phân biệt).
// Mỗi item kèm sẵn "gói ngữ cảnh" (nhom/khong_bao_gom/loai_tru/tinh_chat + mã anh em)
// để bước enrich LLM (enrich-heading-discriminators.mjs) nạp thẳng khi có key.
//
// Ghi: data/discriminator-worklist.json
// Chạy: npm run data:build-discriminator-worklist

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');

const tax = require('../data/tax.json');
const headingNotes = require('../data/chu-giai-heading.json');
const conflicts = require('../data/conflicts.json');

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Oz weight theo nhóm 4-số.
function ozWeightByHeading() {
  const f = path.join(DATA, 'oz-gold-final.jsonl');
  const w = new Map();
  if (!fs.existsSync(f)) return w;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    const h4 = String(r.hsCode || '').replace(/\D/g, '').slice(0, 4);
    if (h4.length !== 4) continue;
    w.set(h4, (w.get(h4) || 0) + (Number(r.ozCount) || 1));
  }
  return w;
}

// Nhóm 4-số có mặt trong conflicts.json.
const conflictHeadings = new Set(
  Object.keys(conflicts).map((k) => String(k).replace(/\D/g, '').slice(0, 4)).filter((h) => h.length === 4)
);

// Mã 8-số anh em dưới 1 nhóm.
function siblings(h4, cap = 14) {
  return Object.keys(tax).filter((k) => k.length === 8 && k.startsWith(h4))
    .slice(0, cap).map((k) => ({ hs: k, vn: clip(tax[k].vn, 70) }));
}

const ozW = ozWeightByHeading();
const worklist = [];

for (const [h4, H] of Object.entries(headingNotes)) {
  if (String(h4).length !== 4) continue;
  const hasPhanBiet = !!(H.phan_biet && String(H.phan_biet).trim());
  const sib = siblings(h4);
  // Chỉ nhóm CẦN phân biệt: thiếu phan_biet + có ≥2 mã anh em.
  if (hasPhanBiet || sib.length < 2) continue;

  const oz = ozW.get(h4) || 0;
  const inConflict = conflictHeadings.has(h4);
  // Điểm ưu tiên: Oz freq là chính + thưởng lớn nếu nằm trong conflicts (đã biết dễ nhầm).
  const priority = oz + (inConflict ? 1000 : 0) + sib.length;
  if (oz === 0 && !inConflict) continue; // bỏ nhóm không khai Oz & không trong conflicts (đào sau)

  worklist.push({
    heading: h4,
    priority,
    ozWeight: oz,
    inConflicts: inConflict,
    siblingCount: sib.length,
    // Gói ngữ cảnh sẵn cho LLM enrich (A1 bước 2).
    context: {
      nhom: clip(H.nhom, 600),
      khong_bao_gom: clip(H.khong_bao_gom, 300),
      loai_tru: clip(H.loai_tru, 300),
      tinh_chat: clip(H.tinh_chat, 200),
      siblings: sib,
    },
    needs: {
      phan_biet: true,
      tinh_chat: !(H.tinh_chat && String(H.tinh_chat).trim()),
    },
  });
}

worklist.sort((a, b) => b.priority - a.priority);

const out = path.join(DATA, 'discriminator-worklist.json');
fs.writeFileSync(out, JSON.stringify({
  generatedAt: new Date().toISOString().slice(0, 10),
  note: 'A1 #43 — nhóm ưu tiên cần phan_biet. Input cho enrich-heading-discriminators.mjs (cần LLM key).',
  totalHeadings: Object.keys(headingNotes).filter((k) => String(k).length === 4).length,
  needingPhanBiet: worklist.length,
  items: worklist,
}, null, 2));

console.log('=== Discriminator worklist (A1 #43) ===');
console.log(`Nhóm cần phan_biet (ưu tiên Oz/conflicts): ${worklist.length}`);
console.log(`  trong conflicts: ${worklist.filter((w) => w.inConflicts).length}`);
console.log(`  top 8 nhóm:`, worklist.slice(0, 8).map((w) => `${w.heading}(oz${w.ozWeight}${w.inConflicts ? '+CF' : ''})`).join(', '));
console.log(`→ ghi ${path.relative(path.join(__dirname, '..'), out)} — chạy enrich khi có LLM key`);
