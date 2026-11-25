#!/usr/bin/env node
// scripts/luat-goc/cau.mjs — tách mọi nút luật (data/luat-goc/*.jsonl) thành CÂU, tất định. Ghép lại phải ra đúng nguyên văn từng ký tự.
//   node scripts/luat-goc/cau.mjs [kho…]      ghi data/luat-goc/cau/<kho>.jsonl: {id: "<id nút>#<n>", tu, den}  (vị trí trong nguyenVan)
//   node scripts/luat-goc/cau.mjs --kiem      chỉ kiểm: tệp câu khớp kho, ghép lại = nguyên văn
// Chữ của câu KHÔNG chép lại: đọc bằng nguyenVan.slice(tu, den). Một nguồn duy nhất.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = fileURLToPath(new URL('../../data/luat-goc/', import.meta.url));
// Chữ viết tắt và số có dấu chấm không phải hết câu: "v.v.", "nhóm 73.17", "1.000 g", "(sp.)", "tr.", "C.I.".
const TAT = /(?:^|[\s(])(?:v\.v|vv|tr|sp|spp|var|subsp|cf|etc|No|St|Dr|[A-ZĐ])$/u;
const DAU_MUC = /^\s*(?:\((?:[a-zđ]|ij|[ivxlc]+|[A-Z]|\d{1,2})\)|\d{1,2}\s*[.)]\s*-?|[-–•*])\s+/u;

/** @returns {Array<[number, number]>} các đoạn phủ kín [0, v.length) */
export function tachCau(v) {
  const cat = new Set();
  for (let i = 0; i < v.length; i += 1) {
    const c = v[i];
    if (c === '\n') {
      // xuống dòng trước một mục đánh số / gạch đầu dòng, hoặc dòng trống: hết câu
      const sau = v.slice(i + 1);
      if (/^\s*\n/.test(sau) || DAU_MUC.test(sau)) cat.add(i + 1);
      continue;
    }
    if (c === ';') { if (/^\s/.test(v.slice(i + 1))) cat.add(i + 1); continue; }
    if (c !== '.' && c !== '?' && c !== '!') continue;
    const truoc = v.slice(Math.max(0, i - 12), i); const sau = v.slice(i + 1);
    if (c === '.' && (/\d$/.test(truoc) && /^\d/.test(sau))) continue; //           73.17 · 1.000
    if (c === '.' && TAT.test(truoc)) continue;
    if (c === '.' && /(?:^|\n)\s*\d{1,2}$/.test(v.slice(0, i))) continue; //          "1." đầu khoản
    if (/^\s+\(/.test(sau) && !DAU_MUC.test(sau)) continue; //                     ". (nhóm 96.04)." là đuôi của câu trước
    if (/^["”’»)\]]*\s+["“(‘«]?[\p{Lu}\d(–-]/u.test(sau)) { const m = /^["”’»)\]]*/.exec(sau)[0].length; cat.add(i + 1 + m); }
  }
  // gộp khoảng trắng vào câu trước; bỏ câu chỉ có khoảng trắng
  const moc = [...cat].sort((a, b) => a - b); const ra = []; let tu = 0;
  for (const m of [...moc, v.length]) {
    let den = m; while (den < v.length && /\s/.test(v[den])) den += 1;
    if (den <= tu) continue;
    if (!v.slice(tu, den).trim() && ra.length) ra[ra.length - 1][1] = den; else ra.push([tu, den]);
    tu = den;
  }
  return ra;
}

const HET_HAI_CHAM = /:\s*$/u;
/**
 * Câu kèm `dan`: id câu DẪN ("Nhóm này không bao gồm:") của mục liệt kê. Mục "(a) Vải dệt…" đứng một mình thì không biết là gồm hay loại.
 * Nút có cha: câu dẫn là câu cuối của cha nếu kết bằng dấu hai chấm (chỉ cho mục; đoạn văn thường không thừa kế: "Mặt khác, nhóm này bao gồm…").
 * Nút đoạn (…:ct:n, …:kq:n) không ghi cha: câu dẫn có thể nằm ở đoạn trước cùng nhóm.
 */
export function tachKho(dong) {
  const ra = []; const cuoi = new Map(); const danNhom = new Map();
  for (const l of dong) {
    const x = JSON.parse(l); const v = x.nguyenVan;
    const doan = x.loai === 'TEN' ? [[0, v.length]] : tachCau(v);
    const nhom = /^(.*:(?:ct|kq)):\d+$/.exec(x.id)?.[1] || null;
    const cuaCha = x.cha && cuoi.get(x.cha)?.haiCham ? cuoi.get(x.cha).id : null;
    let dan = x.cha || !nhom ? cuaCha : danNhom.get(nhom) || null; //   kho đã ghi cha thì theo cha, không đoán theo thứ tự đoạn
    doan.forEach(([tu, den], i) => {
      const c = v.slice(tu, den); const id = `${x.id}#${i + 1}`; const laMuc = DAU_MUC.test(c) || (i === 0 && !!x.so && !!x.cha); const dauDoan = i === 0 || /\n\s*$/.test(v.slice(0, tu));
      if (!laMuc && dauDoan && (nhom || i > 0)) dan = null; //   đoạn văn mới, không phải mục: hết phạm vi câu dẫn
      const haiCham = HET_HAI_CHAM.test(c);
      ra.push({ id, tu, den, ...(dan ? { dan } : {}) });
      if (haiCham) dan = id;
      cuoi.set(x.id, { id, haiCham });
    });
    if (nhom) danNhom.set(nhom, x.cha ? null : dan);
  }
  return ra;
}

/** Lỗi: thiếu nút, hở / chồng đoạn. Rỗng = đạt. */
export function kiemCau(dongKho, dongCau) {
  const loi = []; const nut = new Map(dongKho.map((l) => { const x = JSON.parse(l); return [x.id, x.nguyenVan]; })); const theo = new Map();
  for (const l of dongCau) { const c = JSON.parse(l); const k = c.id.slice(0, c.id.lastIndexOf('#')); if (!theo.has(k)) theo.set(k, []); theo.get(k).push(c); }
  for (const [id, v] of nut) {
    const ds = theo.get(id); if (!ds) { loi.push(`${id}: chưa tách`); continue; }
    let p = 0; for (const c of ds) { if (c.tu !== p) loi.push(`${c.id}: hở/chồng ở ${p}`); p = c.den; }
    if (p !== v.length) loi.push(`${id}: thiếu đuôi`);
  }
  for (const k of theo.keys()) if (!nut.has(k)) loi.push(`${k}: câu không có nút`);
  return loi;
}

function main() {
  const doi = process.argv.slice(2); const chiKiem = doi.includes('--kiem');
  const tatCa = fs.readdirSync(GOC).filter((f) => f.endsWith('.jsonl')).map((f) => f.slice(0, -6)); const kho = doi.filter((x) => !x.startsWith('--')); let hong = 0;
  fs.mkdirSync(path.join(GOC, 'cau'), { recursive: true });
  for (const k of kho.length ? kho : tatCa) {
    const d = fs.readFileSync(path.join(GOC, `${k}.jsonl`), 'utf8').split('\n').filter((x) => x.trim()); const f = path.join(GOC, 'cau', `${k}.jsonl`);
    if (!chiKiem) fs.writeFileSync(f, `${tachKho(d).map((c) => JSON.stringify(c)).join('\n')}\n`);
    const loi = fs.existsSync(f) ? kiemCau(d, fs.readFileSync(f, 'utf8').split('\n').filter((x) => x.trim())) : ['chưa có tệp câu'];
    console.log(`${loi.length ? 'FAIL' : 'PASS'} ${k}: ${d.length} nút, ${loi.length} lỗi`); for (const l of loi.slice(0, 10)) console.log(`  ✗ ${l}`); hong += loi.length ? 1 : 0;
  }
  process.exit(hong ? 1 : 0);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
