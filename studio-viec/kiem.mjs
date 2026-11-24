// node studio-viec/kiem.mjs <viec 02..05> [thư mục kết quả]   — cổng máy chung (việc 01 có kiem.mjs riêng)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const GOC = path.dirname(fileURLToPath(import.meta.url)); const V = String(process.argv[2] || '').padStart(2, '0'); const TM = fs.readdirSync(GOC).find((x) => x.startsWith(V + '-')); const RA = process.argv[3] || `data/do-thi/soat-studio/${V}`;
const NHAN = { '02': ['LOAI_TRU', 'NGUYEN_LIEU', 'PHAN_BIET', 'DAN_CHIEU', 'KHONG_RO'], '03': ['DUYET', 'SUA', 'BO'], '04': ['DUNG', 'RONG', 'SAI', 'KHONG_RO'], '05': ['DUNG', 'SUA', 'SAI'] }[V];
if (!NHAN || !TM) { console.log('việc lạ: ' + V); process.exit(2); }
const g = (s) => String(s ?? '').replace(/\s+/g, ' ').trim(); const co = (vb, t) => { const v = g(vb); let i = 0; const P = g(t).split('…').map(g).filter(Boolean); for (const p of P) { const j = v.indexOf(p, i); if (j < 0) return false; i = j + p.length; } return P.join('').length >= 12; };
let loi = 0, xong = 0; const dem = {}; const bao = (x) => { loi += 1; if (loi <= 60) console.log('✗ ' + x); };
for (const f of (fs.existsSync(RA) ? fs.readdirSync(RA) : []).filter((x) => /^lo-\d\d\.json$/.test(x)).sort()) {
  const goi = JSON.parse(fs.readFileSync(path.join(GOC, TM, f), 'utf8')); let kq; try { kq = JSON.parse(fs.readFileSync(path.join(RA, f), 'utf8')); } catch { bao(`${f}: không phải JSON`); continue; }
  if (kq.khuon !== 'soat@1' || kq.viec !== V || kq.lo !== goi.lo || !Array.isArray(kq.kq)) { bao(`${f}: cần khuon "soat@1", viec "${V}", lo ${goi.lo}, mảng kq`); continue; }
  const can = new Map(goi.muc.map((x) => [x.ma, x])); const thay = new Set(); const vbCG = Object.values(goi.chuGiai || {}).join('\n');
  for (const x of kq.kq) {
    const c = x && can.get(x.ma); if (!c) { bao(`${f}: mã lạ ${x && x.ma}`); continue; }
    if (thay.has(x.ma)) bao(`${x.ma}: trùng`); thay.add(x.ma);
    if (!NHAN.includes(x.ketLuan)) { bao(`${x.ma}: ketLuan phải là một trong ${NHAN.join(', ')}`); continue; }
    dem[x.ketLuan] = (dem[x.ketLuan] || 0) + 1; xong += 1;
    if (g(x.vi).length < 15) bao(`${x.ma}: "vi" quá ngắn`);
    if (x.ketLuan === 'KHONG_RO') continue;
    const nguonVB = V === '04' ? c.trich : vbCG; if (!co(nguonVB, x.chungMinh)) bao(`${x.ma}: "chungMinh" phải chép nguyên văn từ ${V === '04' ? 'trich của mục' : 'chuGiai trong gói'} (lược bằng …)`);
    if (V === '04' && x.ketLuan === 'RONG' && g(x.dieuKienMoi).length < 3) bao(`${x.ma}: RONG cần dieuKienMoi`);
    if (V === '03' && x.ketLuan === 'SUA' && !(x.sua && g(x.sua.neu) && g(x.sua.conNeu))) bao(`${x.ma}: SUA cần sua.neu và sua.conNeu`);
    if (V === '05' && x.ketLuan === 'SUA' && g(x.hoiMoi).length < 8) bao(`${x.ma}: SUA cần hoiMoi`);
  }
  for (const m of can.keys()) if (!thay.has(m)) bao(`${f}: thiếu ${m}`);
}
console.log(`việc ${V}: đã soát ${xong}, ${JSON.stringify(dem)}, lỗi ${loi}`); process.exit(loi || !xong ? 1 : 0);
