// Chuyển 896 cặp mã QĐ 2079/QĐ-TCHQ (tệp CEO đặt trong wiki raw/sources — CEO mở công khai 30/10)
// vào data/conflicts.json của hs-code-api → trả qua /api/conflicts?hs= (resource 'conflicts' công khai).
// Idempotent: chạy lại không nhân bản; KHÔNG đụng entry cũ khác nguồn.
//   node scripts/chuyen-qd2079-vao-conflicts.mjs --tep=<tệp json mảng {maA,maB,tenHang?,ghiChu?}>
import { createRequire } from 'module';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
const require = createRequire(import.meta.url);
const { dataPath } = require('../lib/data-paths.js');

const RISK = 'BAC_C_QD2079';
const LY_DO = 'Cặp mã hay khai nhầm theo Danh mục rủi ro phân loại hàng hóa QĐ 2079/QĐ-TCHQ (bản bên thứ ba, bậc C, AHTN 2017).';
const chuanMa = (v) => { const s = String(v ?? '').replace(/[\s.]/g, ''); return /^[0-9]{4,8}$/.test(s) ? s : null; };

export function gopVaoConflicts(conflicts, capMa) {
  const dem = { cap: 0, them: 0, boQua: 0 };
  for (const c of capMa) {
    const a = chuanMa(c.maA); const b = chuanMa(c.maB);
    if (!a || !b || a === b) { dem.boQua += 1; continue; }
    dem.cap += 1;
    for (const [x, y] of [[a, b], [b, a]]) {
      const e = conflicts[x] || (conflicts[x] = { hsCode: x, riskLevel: RISK, confusedWith: [], reasonsVi: [] });
      if (!e.confusedWith.includes(y)) { e.confusedWith.push(y); dem.them += 1; }
      if (!e.reasonsVi.some((r) => r.includes('QĐ 2079'))) e.reasonsVi.push(LY_DO);
      // tenHang (nếu có) làm gợi ý tên hàng của mã kia — ghi kèm một lần trong reasonsVi
      if (c.tenHang && !e.reasonsVi.some((r) => r.startsWith(`Tên hàng ${y}:`))) {
        e.reasonsVi.push(`Tên hàng ${y}: ${String(c.tenHang).slice(0, 120)}`);
      }
    }
  }
  return dem;
}

function main() {
  const argTep = process.argv.find((x) => x.startsWith('--tep='))?.slice(6);
  if (!argTep) { console.error('Thiếu --tep=<tệp json>'); process.exit(2); }
  const cap = JSON.parse(readFileSync(argTep, 'utf8'));
  if (!Array.isArray(cap)) { console.error('Tệp phải là mảng JSON [{maA, maB}]'); process.exit(2); }
  const tepRa = dataPath('conflicts.json');
  const conflicts = existsSync(tepRa) ? JSON.parse(readFileSync(tepRa, 'utf8')) : {};
  const dem = gopVaoConflicts(conflicts, cap);
  writeFileSync(tepRa, JSON.stringify(conflicts, null, 1) + '\n');
  console.log(`xong: ${dem.cap} cặp hợp lệ · ${dem.them} cạnh mới · ${dem.boQua} cặp bỏ (mã sai/trùng) → ${tepRa}`);
}
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
