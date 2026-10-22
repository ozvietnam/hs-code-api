#!/usr/bin/env node
/**
 * Bộ kiểm thứ HAI cho câu trích của sổ tay chú giải.
 *
 * VÌ SAO CẦN: `check-so-tay.mjs` so câu trích qua squash() = normalize('NFC').toLowerCase() rồi
 * xoá mọi ký tự không phải chữ/số. Nên nó KHÔNG bắt: hoa/thường ở chữ ASCII hoặc chữ có dấu đơn
 * ("Trong" vs "trong"), ngoặc kép thẳng ↔ cong, dấu câu ("58.09" vs "58,09"), số gạch đầu dòng,
 * dòng trống — lô 010–014 đều dính (memory `check-so-tay-squash-mat-ky-tu`). Ngược lại nó VÔ TÌNH
 * bắt lỗi hoa/thường ở chữ Việt có dấu chồng mà JS không hạ chữ thường được (Ẻ, ễ, ữ, ậ, ọ, Đ…);
 * hành vi không ổn định, đừng dựa vào. Máy này so thẳng NGUYÊN VĂN byte-exact với khối nguồn.
 *
 * CÁCH DÙNG: chạy trên `tmp/so-tay/raw/` (bản nháp lúc soạn/soát) hoặc `data/so-tay/` (sau khi
 * nạp). Chạy nhóm khác: NHOM=<danh sách nhóm> hoặc truyền thẳng đường dẫn tệp .json.
 *
 *   node scripts/check-trich-nguyen-van.mjs                 # mọi nhóm đã xuất nguồn
 *   NHOM=5808,6214 node scripts/check-trich-nguyen-van.mjs   # nhóm khác
 *   node scripts/check-trich-nguyen-van.mjs data/so-tay/7314.json
 *
 * Mỗi `trich` tách theo "…" / "..." thành các mảnh; mỗi mảnh (≥6 ký tự) phải có NGUYÊN VĂN
 * (đúng hoa/thường, đúng dấu câu, đúng ngoặc kép) trong đúng khối nguồn `nguon` khai. Khoảng
 * trắng sát đầu/cuối mảnh là quy ước quanh dấu lược nên được trim.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NHOM = process.env.NHOM ? process.env.NHOM.split(',') : null;
const RAW = path.join(ROOT, 'tmp/so-tay/raw');
const SRC = path.join(ROOT, 'tmp/so-tay/nguon');
// Mặc định: mọi nhóm có BOTH bản nháp trong tmp/so-tay/raw và tệp nguồn trong tmp/so-tay/nguon.
// Cần tệp nguồn: xuất bằng  node scripts/build-so-tay.mjs --nhom=<...> --xuat-nguon=tmp/so-tay/nguon
const nhomMacDinh = () => (fs.existsSync(RAW) ? fs.readdirSync(RAW) : [])
  .filter((f) => f.endsWith('.json') && fs.existsSync(path.join(SRC, f.replace(/\.json$/, '.txt'))))
  .map((f) => path.join(RAW, f));
const files = process.argv.slice(2).length ? process.argv.slice(2) : NHOM
  ? NHOM.map((h) => path.join(RAW, `${h}.json`)) : nhomMacDinh();
if (!files.length) { console.error('Không tìm thấy bản nháp nào — xuất nguồn trước?'); process.exit(1); }

/** Nội dung các khối nguồn [id] của tệp nguồn của nhóm. */
function readSources(nhom) {
  const p = path.join(ROOT, 'tmp/so-tay/nguon', `${nhom}.txt`);
  const raw = fs.readFileSync(p, 'utf8');
  const out = {};
  const re = /^\[([^\]]+)\]\s*$/gm;
  const marks = [...raw.matchAll(re)];
  for (let i = 0; i < marks.length; i += 1) {
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : raw.length;
    out[marks[i][1]] = raw.slice(start, end);
  }
  return out;
}

const frags = (t) => String(t).split(/…|\.{3,}/).map((s) => s.trim()).filter((s) => s.length >= 6);

let sai = 0; let tong = 0;
for (const f of files) {
  const nhom = path.basename(f, '.json');
  const src = readSources(nhom);
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  const items = [];
  if (obj.phamVi) items.push(['phamVi', obj.phamVi]);
  for (const k of ['dieuKienVao', 'loaiTru', 'phanBiet', 'tieuChi6', 'dong8']) {
    (obj[k] || []).forEach((it, i) => items.push([`${k}[${i}]`, it]));
  }
  for (const [idx, it] of items) {
    if (!it || !it.trich) continue;
    tong += 1;
    const block = src[it.nguon];
    if (block == null) { console.log(`✗ [${nhom} ${idx}] nguồn không có: ${it.nguon}`); sai += 1; continue; }
    for (const fr of frags(it.trich)) {
      if (!block.includes(fr)) {
        sai += 1;
        console.log(`✗ [${nhom} ${idx}] (${it.nguon}) không nguyên văn:\n    ${fr}`);
      }
    }
    if (String(it.trich).length > 600) { sai += 1; console.log(`✗ [${nhom} ${idx}] trích ${String(it.trich).length} ký tự (>600)`); }
  }
}
console.log(sai ? `\nSAI ${sai} mảnh / ${tong} mục.` : `\nOK — ${tong} mục, mọi câu trích nguyên văn tuyệt đối trong đúng khối nguồn.`);
process.exit(sai ? 1 : 0);