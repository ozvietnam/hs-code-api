#!/usr/bin/env node
/**
 * Sinh yêu cầu OCR lại cho các ý kiến WCO đang bị loại khỏi API (headingSuspect) — docs/giao-viec/wco-op-ocr-lai.md.
 * Chỉ ghi MÃ, số dòng trong tệp md OCR, số thứ tự in và lý do — KHÔNG có chữ nội dung của WCO (bản quyền), nên đưa vào repo được.
 *
 *   node scripts/wco-op-ocr-request.mjs [--out=docs/giao-viec/wco-op-ocr-lai.md]
 *
 * Mỗi "cụm" = các ý kiến bị loại liền nhau trong tệp md, kẹp giữa hai mã đã chắc chắn (trước/sau). Biển tiêu đề mã của cụm bị OCR làm rơi,
 * nên mã thật của cụm nằm trong khoảng [mã trước, mã sau] — liệt kê số ứng viên để người OCR biết cần tìm trong phạm vi nào.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWcoCodes } from './wco-op-parse.mjs';
import { printedOrd } from './wco-op-ordcheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const dot = (h) => (/^\d{6}$/.test(h) ? `${h.slice(0, 4)}.${h.slice(4)}` : /^\d{4}$/.test(h) ? `${h.slice(0, 2)}.${h.slice(2)}` : h);

const LY_DO = {
  'so-in-nho-hon-thu-tu': 'đánh số bắt đầu lại giữa chừng → có biển mã bị mất ngay trước ý kiến này',
  'so-in-lon-hon-thu-tu': 'số in lớn hơn thứ tự gán → thiếu ý kiến đứng trước (hoặc mã sai)',
  'mo-dau-la-chu-thich-anh': 'mở đầu bằng nhãn ảnh, không có số in → chưa xác định được',
  'khong-doc-duoc-so-thu-tu': 'không đọc được số in',
  'sau-diem-danh-so-lai': 'đứng sau chỗ đánh số lại',
  'dau-hieu-danh-so-lai': 'đánh số bắt đầu lại giữa chừng → có biển mã bị mất',
  'tieu-de-mat-hoac-nghi-sai': 'tiêu đề mã bị mất / nghi sai (từ các vòng khôi phục trước)',
};

export function buildRuns(ops, wco, oz) {
  const runs = []; let cur = null;
  ops.forEach((o, i) => { if (o.headingSuspect) { if (!cur) { cur = { from: i, items: [] }; runs.push(cur); } cur.items.push(o); } else cur = null; });
  const six = [...wco.six].sort();
  for (const r of runs) {
    let p = r.from - 1; while (p >= 0 && ops[p].headingSuspect) p -= 1;
    let n = r.from + r.items.length; while (n < ops.length && ops[n].headingSuspect) n += 1;
    r.prev = ops[p] || null; r.next = ops[n] || null;
    const lo = r.prev && r.prev.hs.length === 6 ? r.prev.hs : '000000';
    const hi = r.next && r.next.hs.length === 6 ? r.next.hs : '999999';
    r.cand = six.filter((c) => c >= lo && c <= hi).length;
    const heads = new Set([...r.items.map((o) => o.hs.slice(0, 4)), r.prev?.hs.slice(0, 4), r.next?.hs.slice(0, 4)].filter(Boolean));
    r.oz = Math.max(0, ...[...heads].map((h) => oz[h] || 0));
    r.reasons = [...new Set(r.items.map((o) => o.headingConflict || (o.headingRestart ? 'dau-hieu-danh-so-lai' : 'tieu-de-mat-hoac-nghi-sai')))];
  }
  return runs.sort((a, b) => b.oz - a.oz || a.items[0].line - b.items[0].line);
}

export function render(runs, total, ozTotal) {
  const n = runs.reduce((a, r) => a + r.items.length, 0);
  const L = [];
  L.push('# Yêu cầu OCR lại — ý kiến WCO đang bị loại khỏi API (#196)');
  L.push('');
  L.push(`> Sinh tự động bởi \`scripts/wco-op-ocr-request.mjs\` — không có chữ nội dung của WCO. Tình trạng: **${n}/${total}** ý kiến bị loại, gom thành **${runs.length} cụm**.`);
  L.push('');
  L.push('## Vì sao');
  L.push('');
  L.push('Biển tiêu đề mã (chữ trắng nền xanh, ví dụ `4409.10 to 4409.29` hoặc `8471.30`) thường bị OCR làm rơi, nên ý kiến đứng ngay sau biển bị xếp nhầm vào mã trước đó. Cách kiểm: số thứ tự IN ở đầu mỗi ý kiến là số chính thức; khi nó nhỏ hơn thứ tự ta gán (đánh số bắt đầu lại) hoặc lớn hơn (thiếu ý kiến phía trước) thì mã/thứ tự không đáng tin và ý kiến đó **không được trả ra API**. Tránh sai: trích nhầm mã tệ hơn không trích.');
  L.push('');
  L.push('## Cần anh làm gì');
  L.push('');
  L.push('Với mỗi cụm trong bảng dưới, tìm trong PDF gốc **từ cuối ý kiến của mã "trước" đến đầu mã "sau"** (thường 1–3 trang), rồi gửi **một trong hai**:');
  L.push('');
  L.push('1. Bản OCR lại của các trang đó **có cả dòng biển mã** (chữ trắng trên nền xanh) và dòng `(continued)` nếu có; hoặc');
  L.push('2. Ảnh chụp các trang đó (như 3 ảnh lần trước).');
  L.push('');
  L.push('Em sẽ đọc mã thật của từng biển, gán lại mã/thứ tự bằng máy (không đoán), chạy lại cổng số thứ tự và trả ý kiến nào qua cổng vào API. Làm theo thứ tự bảng (xếp theo mức hay gặp trong tờ khai thật của Oz): vài cụm đầu đã đáng giá.');
  L.push('');
  L.push('## Danh sách cụm');
  L.push('');
  L.push(`Cột "Oz" = số tờ khai thật (trên ${ozTotal}) thuộc nhóm 4 số lớn nhất trong cụm. "Dòng" = số dòng trong tệp \`WCO_Compendium_2022_Opinions_EN.md\` (riêng tư). "Số in" = số thứ tự in ở đầu từng ý kiến (? = không đọc được). "Ứng viên" = số mã 6 số của WCO nằm giữa mã trước và mã sau.`);
  L.push('');
  L.push('| # | Oz | Mã TRƯỚC (đã chắc) | Mã SAU (đã chắc) | Số ý kiến | Dòng | Số in | Mã đang gán | Ứng viên | Lý do |');
  L.push('|---|---:|---|---|---:|---|---|---|---:|---|');
  runs.forEach((r, i) => {
    const pv = r.prev ? `${dot(r.prev.hs)}/${r.prev.ord} (d.${r.prev.line})` : '—';
    const nx = r.next ? `${dot(r.next.hs)}/${r.next.ord} (d.${r.next.line})` : '—';
    const lines = r.items.map((o) => o.line).join(', ');
    const printed = r.items.map((o) => printedOrd(o) ?? '?').join(', ');
    const cur = r.items.map((o) => `${dot(o.hs)}/${o.ord}`).join(', ');
    const why = r.reasons.map((x) => LY_DO[x] || x).join('; ');
    L.push(`| ${i + 1} | ${r.oz} | ${pv} | ${nx} | ${r.items.length} | ${lines} | ${printed} | ${cur} | ${r.cand} | ${why} |`);
  });
  L.push('');
  L.push('## Sau khi có bản OCR / ảnh');
  L.push('');
  L.push('- Đặt tệp vào `data/wco-op/` (riêng tư, đã bị `.gitignore` + `.dockerignore` chặn) rồi báo em; không dán vào repo công khai.');
  L.push('- Em chạy: parse lại → `scripts/wco-op-ordcheck.mjs` → dịch bổ sung các ý kiến mới qua cổng → cập nhật sổ tay nếu thuộc nhóm đã nối.');
  L.push('');
  return L.join('\n');
}

function main() {
  const ops = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/wco-op/opinions.json'), 'utf8'));
  const oz = {}; let ozTotal = 0;
  const gold = path.join(ROOT, 'data/oz-gold-final.jsonl');
  if (fs.existsSync(gold)) for (const l of fs.readFileSync(gold, 'utf8').split('\n')) { if (!l.trim()) continue; let r; try { r = JSON.parse(l); } catch { continue; } const h = String(r.hsCode || '').replace(/\D/g, '').slice(0, 4); if (h.length !== 4) continue; const w = Number(r.ozCount) || 1; oz[h] = (oz[h] || 0) + w; ozTotal += w; }
  const runs = buildRuns(ops, loadWcoCodes(), oz);
  const md = render(runs, ops.length, ozTotal);
  fs.writeFileSync(path.resolve(ROOT, arg('out', 'docs/giao-viec/wco-op-ocr-lai.md')), md);
  console.log(`cụm ${runs.length}, ý kiến ${runs.reduce((a, r) => a + r.items.length, 0)} → ${arg('out', 'docs/giao-viec/wco-op-ocr-lai.md')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
