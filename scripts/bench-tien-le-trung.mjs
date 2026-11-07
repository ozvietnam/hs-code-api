// Bench tra trùng TB-TCHQ trên bộ đề bẩy (#1136) + 3 cách diễn đạt ca 3609 (#443)
// Chạy: node scripts/bench-tien-le-trung.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { timTrung, doGiong } = require('../lib/tien-le-trung-tim.js');
const { precedentsData, taxData } = require('../lib/data.js');
import { readFileSync } from 'fs';

const boDe = JSON.parse(readFileSync(new URL('../docs/bo-de-bay/bo-de.json', import.meta.url), 'utf8'));
const ca = Array.isArray(boDe) ? boDe : boDe.cau || boDe.ca || [];
const bieuMaDung = new Set(Object.keys(taxData || {}));
const NGUONG = 0.68;

let top1 = 0, top3 = 0, nhieuMaBay = 0, tong = 0;
const phanDoGiong = [];
for (const c of ca) {
  const moTa = [c.tenHang, c.nameZh, c.specs, c.moTa].filter(Boolean).join(' ').slice(0, 500);
  const dapAn = String(c.dapAn || c.hs || '').replace(/\D/g, '').slice(0, 8);
  if (!moTa || !dapAn) continue;
  tong += 1;
  const kq = timTrung(moTa, { top: 3, precedentsData, bieuThueMaDung: bieuMaDung });
  kq.forEach((x, i) => { phanDoGiong.push(x.doGiong); if (x.doGiong >= NGUONG && x.ma !== dapAn) { if (i === 0) nhieuMaBay += 1; } });
  if (kq[0]?.ma === dapAn) top1 += 1;
  if (kq.some((x) => x.ma === dapAn)) top3 += 1;
}

// 3 cách diễn đạt ca 3609/TB-TCHQ (#443 — trùng câu chữ vs diễn đạt lại)
// #443 nhắc ca "sim 3609/TB-TCHQ" — KHO HIỆN TẠI không có TB hộp mực in nào (3609 trong kho = Electric
// Actuator 85013170, ca #230). Đối chiếu trung thực bằng chính TB có sẵn: tự-trùng nguyên văn phải đạt ngưỡng.
const MAU_TB = (() => { for (const [ma, ds] of Object.entries(precedentsData)) { if (!bieuMaDung.has(ma)) continue; const r = ds.find((x) => x.sourceType === 'TB-TCHQ' && (x.productName || '').length > 80); if (r) return { ...r, ma }; } return null; })();
const CA3609 = MAU_TB ? [
  ['tự-trùng nguyên văn TB ' + MAU_TB.tbTchqNumber + ' (' + MAU_TB.ma + ')', MAU_TB.productName],
  ['diễn đạt lại (cắt nửa sau)', MAU_TB.productName.split(',').slice(0, 2).join(',')],
  ['diễn đạt lại (rút gọn 6 từ)', MAU_TB.productName.split(/[ ,]/).filter(Boolean).slice(0, 6).join(' ')],
] : [];
const ben3609 = [];
for (const [nhan, text] of CA3609) {
  const kq = timTrung(text, { top: 1, precedentsData, bieuThueMaDung: bieuMaDung });
  ben3609.push({ nhan, top: kq[0]?.ma || '(không)', doGiong: kq[0] ? Number(kq[0].doGiong.toFixed(3)) : null, soHieu: kq[0]?.soHieu || '' });
}

console.log(`BENCH TIEN-LE-TRUNG — ${tong} câu bộ đề bẩy, ngưỡng ${NGUONG}`);
console.log(`top-1 đúng dapAn: ${top1}/${tong} (${Math.round((100 * top1) / Math.max(1, tong))}%)`);
console.log(`top-3 có dapAn:  ${top3}/${tong} (${Math.round((100 * top3) / Math.max(1, tong))}%)`);
console.log(`trùng nhầm maBay (top-1 ≥ ngưỡng, ≠ dapAn): ${nhieuMaBay}`);
const dq = phanDoGiong.sort((a, b) => a - b);
if (dq.length) console.log(`phân bố doGiong: min ${dq[0].toFixed(2)} · p50 ${dq[Math.floor(dq.length / 2)].toFixed(2)} · max ${dq[dq.length - 1].toFixed(2)}`);
console.log('ca 3609/TB-TCHQ (#443):');
for (const r of ben3609) console.log(`  ${r.nhan.padEnd(28)} → ${r.top} (độ giống ${r.doGiong ?? '-'}, ${r.soHieu})`);
