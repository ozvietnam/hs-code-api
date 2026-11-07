#!/usr/bin/env node
/**
 * Chấm bộ đề bẫy phân loại (docs/bo-de-bay/bo-de.json).
 *
 *   node scripts/cham-bo-de-bay.mjs --tra-loi=<tệp.csv>          chấm câu trả lời của một mô hình (mỗi dòng "id,ma")
 *   node scripts/cham-bo-de-bay.mjs --he-thong[=<url gốc>]      gọi /api/classify của hệ thống (mặc định bản chạy thật) rồi chấm
 *        [--chi=B01,K03] [--luu=<tệp.csv>]                        chỉ chạy vài câu / lưu câu trả lời của hệ thống ra CSV
 *
 * Điểm: ĐÚNG = trùng mã đáp án (hoặc chapNhanThem); ĐÚNG_6 = đúng phân nhóm 6 số nhưng sai dòng 8 số;
 * BAY = rơi đúng mã bẫy; SAI = khác. Kèm số câu sai mà thuế MFN khác thuế của mã đúng (rủi ro tiền).
 * Gọi hệ thống thật tốn tiền LLM mỗi câu (endpoint công khai) — chạy có chủ ý.
 */
import fs from 'fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const de = JSON.parse(fs.readFileSync(new URL('../docs/bo-de-bay/bo-de.json', import.meta.url), 'utf8'));
const nz = (s) => String(s || '').replace(/\D/g, '');
const chi = args.chi ? new Set(String(args.chi).split(',')) : null;
const cau = de.cau.filter((c) => !chi || chi.has(c.id));

async function hoiHeThong(goc) {
  const out = {};
  for (const c of cau) {
    try {
      const r = await fetch(`${goc.replace(/\/$/, '')}/api/classify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenHang: c.moTa }) });
      const j = await r.json();
      out[c.id] = nz(j?.results?.[0]?.hs || j?.results?.[0]?.hsCode || j?.hsCode || '');
    } catch (e) { out[c.id] = ''; console.error(`${c.id}: lỗi gọi hệ thống — ${e.message}`); }
    process.stderr.write(`${c.id} → ${out[c.id] || '—'}\n`);
  }
  return out;
}

function docCsv(tep) {
  const out = {};
  for (const dong of fs.readFileSync(tep, 'utf8').split(/\r?\n/)) {
    const m = dong.match(/^\s*([A-Z]\d{2})\s*[,;\t]\s*([\d.\s]+)/);
    if (m) out[m[1]] = nz(m[2]);
  }
  return out;
}

let traLoi;
if (args['tra-loi']) traLoi = docCsv(args['tra-loi']);
else if (args['he-thong']) traLoi = await hoiHeThong(args['he-thong'] === true ? 'https://hs-kb.uythacnhapkhau.com' : String(args['he-thong']));
else { console.log('Dùng: --tra-loi=<tệp.csv> hoặc --he-thong[=<url>] (xem đầu tệp)'); process.exit(2); }
if (args.luu) fs.writeFileSync(String(args.luu), cau.map((c) => `${c.id},${traLoi[c.id] || ''}`).join('\n') + '\n');

const dem = { DUNG: 0, DUNG_6: 0, BAY: 0, SAI: 0, TRONG: 0 }; const theoLoai = {}; let ruiRoTien = 0; const dong = [];
for (const c of cau) {
  const tl = traLoi[c.id] || '';
  const dung = [c.dapAn, ...(c.chapNhanThem || [])].map(nz);
  let kq;
  if (!tl) kq = 'TRONG';
  else if (dung.includes(tl)) kq = 'DUNG';
  else if (tl === nz(c.maBay)) kq = 'BAY';
  else if (dung.some((d) => d.slice(0, 6) === tl.slice(0, 6))) kq = 'DUNG_6';
  else kq = 'SAI';
  dem[kq] += 1;
  (theoLoai[c.loaiBay] ||= { tong: 0, dung: 0 }).tong += 1;
  if (kq === 'DUNG') theoLoai[c.loaiBay].dung += 1;
  if (kq === 'BAY' && c.mfn.maBay !== c.mfn.dapAn) ruiRoTien += 1;
  dong.push(`${c.id}  ${kq.padEnd(6)} trả lời ${tl || '—'}  | đúng ${c.dapAn}${c.chapNhanThem?.length ? ` (/${c.chapNhanThem.join('/')})` : ''}  | bẫy ${c.maBay}`);
}
console.log(dong.join('\n'));
const n = cau.length;
console.log(`\nĐIỂM: ${dem.DUNG}/${n} đúng 8 số (${(100 * dem.DUNG / n).toFixed(0)}%) · ${dem.DUNG_6} đúng 6 số sai dòng · ${dem.BAY} rơi mã bẫy · ${dem.SAI} sai khác · ${dem.TRONG} bỏ trống`);
console.log(`Rơi bẫy mà thuế MFN khác thuế mã đúng: ${ruiRoTien} câu`);
console.log('Theo loại bẫy:');
for (const [k, v] of Object.entries(theoLoai)) console.log(`  ${k.padEnd(20)} ${v.dung}/${v.tong}  — ${de.loaiBay[k]}`);
