#!/usr/bin/env node
// scripts/luat-goc/thong-bao-bang-chung.mjs — so từng bản ghi kho cũ với TOÀN VĂN thông báo nằm ngoài repo. Tất định, không mạng, không AI.
//   node scripts/luat-goc/thong-bao-bang-chung.mjs <thư mục processed/> [--ban-chu <thong-bao.txt>]
// <thư mục processed/>: tracuuhs-detail*.json (toàn văn thông báo, trường noi_dung), tb-noi-dung/*.json (đọc PDF quét), all-1990-2026.csv (mục lục cổng hải quan).
// Ghi ra thong-bao-du-lieu-bang-chung.mjs (chỉ số đo và câu thay thế; không chép toàn văn, không tên doanh nghiệp).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GOC, docDong, chat, tach, gon } from './thong-bao-doc.mjs';

const tm = process.argv[2]; if (!tm || !fs.existsSync(tm)) { console.error('thiếu thư mục bản gốc'); process.exit(2); }
const goc = new Map(); const bam = crypto.createHash('sha256'); let soBan = 0;
const tepGoc = fs.readdirSync(tm).filter((f) => /^tracuuhs-detail.*\.json$/.test(f)).sort();
for (const f of tepGoc) for (const r of JSON.parse(fs.readFileSync(path.join(tm, f), 'utf8')).records) {
  const m = /^\s*(\d+)\/([^/\s]+)/.exec(r.so_hieu); if (!m) continue;
  const k = `${m[1]}/${m[2]}|${r.nam}`; const t = String(r.noi_dung || '').normalize('NFC'); soBan += 1; bam.update(k).update(t);
  if (!goc.has(k)) goc.set(k, []); if (!goc.get(k).includes(t)) goc.get(k).push(t);
}
const pdf = new Map(); const tmPdf = path.join(tm, 'tb-noi-dung');
for (const f of fs.existsSync(tmPdf) ? fs.readdirSync(tmPdf).sort() : []) {
  if (!f.endsWith('.json')) continue; let r; try { r = JSON.parse(fs.readFileSync(path.join(tmPdf, f), 'utf8')); } catch { continue; }
  const m = /^(\d+)\/([^/]+)\/(\d{4})$/.exec(r.so_hieu || '');
  if (m && r.trang_thai === 'ok') pdf.set(`${m[1]}/${m[2]}|${m[3]}`, String(r.ma_ket_luan_8_so || '').replace(/\D/g, ''));
}
const cong = new Map(); const csv = path.join(tm, 'all-1990-2026.csv');
for (const l of fs.existsSync(csv) ? fs.readFileSync(csv, 'utf8').split('\n') : []) {
  const m = /^\d+,"?\s*0*(\d+)\s*\/\s*(TB-T?CHQ)\s*"?,(\d\d)\/(\d\d)\/(\d{4}),/i.exec(l); if (!m) continue;
  const k = `${m[1]}/${m[2].toUpperCase()}|${m[5]}`; if (!cong.has(k)) cong.set(k, new Set()); cong.get(k).add(`${m[5]}-${m[4]}-${m[3]}`);
}
const phu = (s, t) => { const c = chat(s); if (c.length < 6) return t.includes(c) ? 1 : 0; let n = 0; let d = 0; for (let i = 0; i + 6 <= c.length; i += 3) { n += 1; if (t.includes(c.slice(i, i + 6))) d += 1; } return d / n; };
const so8 = (t) => t.replace(/(\d)[.\s]+(?=\d)/g, '$1');
const bo = {};
for (const x of docDong()) {
  if (x.nuocNgoai || !x.so || !x.nam) continue;
  const k = `${x.soDay}|${x.nam}`; const ts = goc.get(k); const b = {};
  if (ts) {
    const t = chat(ts.join(' ')); const lien = so8(ts.join(' '));
    b.n = Math.round(phu(x.moTa, t) * 100); b.N = tach(x.moTa).length && tach(x.moTa).every((p) => t.includes(chat(p))) ? 1 : 0;
    b.k = Math.round(phu(x.ketLuan, t) * 100); b.K = tach(x.ketLuan).length && tach(x.ketLuan).every((p) => t.includes(chat(p))) ? 1 : 0;
    if (!lien.includes(x.ma)) { const m = [...new Set([...lien.matchAll(/mã\s*(?:số|hàng)?[^0-9]{0,6}(\d{8})(?:\d\d)?(?!\d)/g)].map((y) => y[1]))]; b.m = m.length ? m : 0; }
    const h = /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/.exec(gon(ts[0]).slice(0, 700));
    if (h && x.ngay) { const g = `${h[3]}-${h[2].padStart(2, '0')}-${h[1].padStart(2, '0')}`; if (g !== x.ngay) b.g = g; }
  } else if (pdf.has(k) && pdf.get(k)) b.p = pdf.get(k).slice(0, x.ma.length) === x.ma ? 1 : pdf.get(k);
  const c = cong.get(k); if (c) b.c = c.has(x.ngay) ? 1 : [...c].sort();
  if (Object.keys(b).length) bo[x.viTri] = b;
}
const thay = []; const da = new Set();
for (const [k, ts] of [...goc].sort((a, b) => (a[0] < b[0] ? -1 : 1))) for (const t of ts) for (const m of gon(t).matchAll(/thay thế (?:cho |các )?Thông báo(?: (?:về )?(?:kết quả )?[^.]{0,90}?)? (?:số )?(\d+)\s*\/\s*(TB-T ?C ?H ?Q) ngày (\d{1,2})\/(\d{1,2})\/(\d{4})/gi)) {
  const [so, nam] = k.split('|'); const cu = `${m[1]}/${m[2].replace(/ /g, '').toUpperCase()}`; const key = `${so}${nam}${cu}`; if (da.has(key)) continue; da.add(key);
  const h = /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/.exec(gon(t).slice(0, 700));
  thay.push({ moi: so, namMoi: Number(nam), ngayMoi: h && h[3] === nam ? `${h[3]}-${h[2].padStart(2, '0')}-${h[1].padStart(2, '0')}` : null, cu, ngayCu: `${m[5]}-${m[4].padStart(2, '0')}-${m[3].padStart(2, '0')}`, trich: m[0] });
}
const dong = Object.entries(bo).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`);
fs.writeFileSync(path.join(GOC, 'scripts/luat-goc/thong-bao-du-lieu-bang-chung.mjs'), `// Máy sinh bởi thong-bao-bang-chung.mjs, đừng sửa tay. Số đo so bản ghi precedents.json với toàn văn ngoài repo.
// n/k: % cụm 6 ký tự của mô tả / kết luận có trong toàn văn. N/K = 1: mọi mảnh có nguyên vẹn. m: mã không có trong toàn văn → các mã toàn văn kết luận (0 = toàn văn không in mã 8 số).
// g: ngày đầu văn bản khác kho. p: 1 = mã khớp bản đọc PDF quét, khác = mã PDF. c: 1 = số + ngày khớp mục lục cổng hải quan, mảng = ngày trên cổng.
export const BAN_GOC = ${JSON.stringify({ tep: tepGoc.length, ban: soBan, thongBao: goc.size, sha256: bam.digest('hex'), pdf: pdf.size, cong: cong.size })};
export const THAY_THE = ${JSON.stringify(thay, null, 1)};
export const BANG_CHUNG = {\n${dong.join(',\n')}\n};\n`);
const i = process.argv.indexOf('--ban-chu');
if (i > 0) fs.writeFileSync(process.argv[i + 1], [...goc.values()].flat().join('\n\f\n'));
console.log(`bản gốc: ${soBan} bản, ${goc.size} thông báo; bằng chứng: ${dong.length} bản ghi; câu thay thế: ${thay.length}`);
