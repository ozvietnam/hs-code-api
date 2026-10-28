// Xây breadcrumb nguyên văn từ bieu-chinh.jsonl.gz (nợ còn lại của #336 mục 3).
// Chạy: node scripts/xay-breadcrumb-tieu-de.mjs
// Sinh data/bieu-thue/2026.04.05/breadcrumb.json.gz — Map mã 8 số → chuỗi tiêu đề cha
// nguyên văn VI + EN. Ví dụ 68132010: "Vật liệu ma sát và các sản phẩm…" › "Chứa amiăng:"
// (dòng 8 số "Lót và đệm phanh" là moTa của chính mã — nằm sẵn trong /api/tax).
import { gunzipSync, gzipSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { dataReadPath } = require('../lib/data-paths.js');

const dong = gunzipSync(readFileSync(dataReadPath('bieu-thue', '2026.04.05', 'bieu-chinh.jsonl.gz'))).toString('utf8')
  .split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  .sort((a, b) => (a.sheet < b.sheet ? -1 : a.sheet > b.sheet ? 1 : a.r - b.r));

const ketQua = {};
const stack = []; // theo gach: dòng tiêu đề cấp g đứng trước dòng lá cấp > g
for (const d of dong) {
  if (d.soChuSo !== 8) { stack[d.gach] = d; stack.length = d.gach + 1; continue; }
  const cap = [];
  for (let g = 0; g < Math.min(d.gach, stack.length); g++) {
    const t = stack[g];
    if (t) cap.push({ vi: t.moTaVi, en: t.moTaEn || null });
  }
  if (cap.length) ketQua[d.ma] = { vi: cap.map((x) => x.vi), en: cap.some((x) => x.en) ? cap.map((x) => x.en || '') : undefined };
}

const duoi = join(process.env.HS_DATA_DIR || join(process.cwd(), 'data'), 'bieu-thue', '2026.04.05', 'breadcrumb.json.gz');
writeFileSync(duoi, gzipSync(JSON.stringify(ketQua)));
console.log(`xong: ${Object.keys(ketQua).length} mã có breadcrumb nguyên văn → ${duoi}`);
const vd = ketQua['68132010'];
console.log('ví dụ 68132010 VI:', vd ? vd.vi.join(' › ').slice(0, 130) + '…' : '(không có)');
console.log('ví dụ 68132010 EN:', vd ? (vd.en || []).join(' › ').slice(0, 100) + '…' : '');
