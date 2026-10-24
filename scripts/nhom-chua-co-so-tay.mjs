/**
 * nhom-chua-co-so-tay.mjs — tìm một nhóm 4 số ĐANG CHƯA có sổ tay.
 *
 * Vì sao: các test của cổng sổ tay cần một nhóm "chưa có sổ tay" để kiểm đường code đó.
 * Trước đây test hardcode `0101` — lô soạn đầu tiên có sổ tay cho 0101 (lô 038, 24/10/2026)
 * làm 2 test đỏ. Chọn NHÓM ĐỘNG theo dữ liệu hiện tại để lô soạn sau không làm đỏ test.
 *
 * Tính cả sổ tay trong thư mụng GHI (HS_DATA_DIR, test cách ly) và sổ tay trong data/ gốc,
 * đúng theo luật đọc của lib/data-paths.js (ưu tiên bản đã ghi, không có thì rơi về data/ gốc).
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * @returns {{h4: string, hs8: string}} nhóm 4 số chưa có sổ tay + một mã 8 số thuộc nhóm đó
 */
export function nhomChuaCoSoTay() {
  const sourceDir = path.join(process.cwd(), 'data');
  const writeDir = process.env.HS_DATA_DIR ? path.resolve(process.env.HS_DATA_DIR) : sourceDir;

  const tax = JSON.parse(fs.readFileSync(path.join(sourceDir, 'tax.json'), 'utf8'));
  const rows = Array.isArray(tax) ? tax : Object.values(tax);

  const coSoTay = new Set();
  for (const dir of new Set([sourceDir, writeDir])) {
    const d = path.join(dir, 'so-tay');
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (/^\d{4}\.json$/.test(f)) coSoTay.add(f.slice(0, 4));
  }

  for (const r of rows) {
    const hs = String(r.hs || '').replace(/\D/g, '');
    if (hs.length !== 8) continue;
    const h4 = hs.slice(0, 4);
    if (!coSoTay.has(h4)) return { h4, hs8: hs };
  }
  throw new Error('khong con nhom 4 so nao chua co so tay — bo sung du lieu truoc');
}
