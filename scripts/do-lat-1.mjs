#!/usr/bin/env node
/**
 * L1-1 (#563) — CHỐT 50 phân nhóm lát 1 + đo trần Pareto + tỉ lệ máy chốt thật. Tất định, KHÔNG gọi LLM / mạng.
 *
 *   node scripts/do-lat-1.mjs [--n=50] [--ngay=YYYY-MM-DD] [--khong-ghi]
 *
 * Đọc: data/tax.json (lib/data.js), data/oz-gold-final.jsonl (chỉ tờ khai nhập), data/precedents.json,
 *      data/bieu-thue/<phiên bản>/breadcrumb.json.gz, data/so-tay/<nhóm>.json.
 * Ghi: data/ho-so/lat-1.json (COMMIT — chỉ tỉ lệ + mã, không số lượt tuyệt đối, không câu Oz);
 *      data/oz-export/bench/lat-1-<ngày>.json (RIÊNG TƯ — số lượt + kết quả máy từng mẫu; máy `git check-ignore` trước
 *      khi ghi, không bị ignore thì từ chối ghi).
 * In ra: bảng tóm tắt chỉ có tỉ lệ.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const N = Number(arg('n', 50));
const NGAY = arg('ngay', new Date().toISOString().slice(0, 10));
const KHONG_GHI = process.argv.includes('--khong-ghi');

const { taxData, precedentsData } = require('../lib/data.js');
const { chotDong8, loadSoTay } = require('../lib/so-tay-gates.js');
const { isHeldOut } = require('../lib/holdout.js');
const L = require('../lib/ho-so/lat-1.js');

// ── Nguồn ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const goldFile = path.join(ROOT, 'data', 'oz-gold-final.jsonl');
if (!fs.existsSync(goldFile)) { console.error('Thiếu data/oz-gold-final.jsonl'); process.exit(2); }
const tatCa = fs.readFileSync(goldFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const nhap = tatCa.filter(L.laToKhaiNhap);
const soMauXuat = tatCa.length - nhap.length;

const versions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'versions', 'index.json'), 'utf8'));
const taxRaw = fs.readFileSync(path.join(ROOT, 'data', 'tax.json'));
const bieuThue = { phienBan: versions.current, tep: 'data/tax.json', sha256: crypto.createHash('sha256').update(taxRaw).digest('hex').slice(0, 16) };

const thuMucBieu = fs.readdirSync(path.join(ROOT, 'data', 'bieu-thue')).filter((d) => /^\d{4}\.\d{2}\.\d{2}$/.test(d)).sort().pop();
let breadcrumb = {};
try { breadcrumb = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'data', 'bieu-thue', thuMucBieu, 'breadcrumb.json.gz')))); } catch { breadcrumb = {}; }

// ── Chọn ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const chenh = L.phanNhomChenhThue(taxData);
const soDong8 = L.soDong8TheoPn6(taxData);
const luot = L.luotTheoPn6(nhap);
const chon = L.chonLat1(luot, chenh, N);
const tapLat1 = new Set(chon.map((x) => x.pn6));
const pn6Chenh = [...luot.keys()].filter((p) => chenh.has(p));

// ── Máy chốt thật: trên 50 phân nhóm (số báo cáo) và trên mọi phân nhóm nhiều dòng (nền của Pareto) ─────────────────
const mayLat1 = L.doMayChot(nhap, tapLat1, chotDong8);
const mayLat1GiuRieng = L.doMayChot(nhap.filter((r) => isHeldOut(r)), tapLat1, chotDong8);
const nhieuDong = new Set([...luot.keys()].filter((p) => (soDong8.get(p) || 0) > 1));
const mayToanBo = L.doMayChot(nhap, nhieuDong, chotDong8);
const chotDung = new Map(Object.entries(mayToanBo.theoPn6).map(([p, s]) => [p, s.CHOT_DUNG]));

const pareto = L.tranPareto({ luot, soDong8, chotDung, moc: [50, 80, 95], tap: [...tapLat1] });
pareto.dinhNghia = 'số phân nhóm 6 số (xếp theo lượt chưa chốt giảm dần) cần số hoá để máy chốt được 8 số cho t % lượt Oz; nen = phân nhóm một dòng + lượt máy hiện tại chốt đúng; tranTap = trần nếu số hoá đủ 50 phân nhóm lát 1; dong8 = số dòng 8 số của các phân nhóm đó';
const paretoChenh = { ...L.paretoTrongTap(luot, pn6Chenh, [50, 80, 95]), dinhNghia: 'số phân nhóm chênh thuế (xếp theo lượt) phủ t % lượt của nhóm chênh thuế' };

const chiTietPn6 = {};
for (const { pn6 } of chon) {
  chiTietPn6[pn6] = {
    canHieuChinhTienLe: L.canHieuChinhTienLe(pn6, { taxData, precedents: precedentsData, breadcrumb }),
    trangThaiSoHoa: L.trangThaiSoHoa(pn6, loadSoTay),
  };
}

const lat1 = L.dungLat1Json({
  bieuThue, chenh, luot, chon, pareto, paretoChenh, mayChot: mayLat1, mayChotGiuRieng: mayLat1GiuRieng,
  chiTietPn6, ngayDo: NGAY, soMauNhapBiLoai: soMauXuat, tongMauNhap: nhap.length,
});
lat1.tongPhanNhomChenhBieu = chenh.size;
lat1.soDongMfnKhongSo = chenh.khongSoDuoc.length;

// ── Ghi ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ghiRiengTu(rel, obj) {
  const file = path.join(ROOT, rel);
  let ignored = false;
  try { execFileSync('git', ['-C', ROOT, 'check-ignore', '-q', rel]); ignored = true; } catch { ignored = false; }
  if (!ignored) { console.error(`TỪ CHỐI GHI: ${rel} không bị gitignore — chi tiết riêng tư không được nằm ở chỗ commit được.`); return null; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(obj, null, 1)}\n`);
  return rel;
}

if (!KHONG_GHI) {
  fs.mkdirSync(path.join(ROOT, 'data', 'ho-so'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'ho-so', 'lat-1.json'), `${JSON.stringify(lat1, null, 1)}\n`);
  const rel = ghiRiengTu(`data/oz-export/bench/lat-1-${NGAY}.json`, {
    ngayDo: NGAY,
    tongLuotNhap: [...luot.values()].reduce((a, b) => a + b, 0),
    soMauNhap: nhap.length,
    soMauXuatBiLoai: soMauXuat,
    phanNhom: chon.map((x) => ({ ...x, soLuot: luot.get(x.pn6), may: mayLat1.theoPn6[x.pn6], ...chiTietPn6[x.pn6] })),
    mayLat1: { ...mayLat1, chiTiet: undefined },
    mayLat1GiuRieng: { ...mayLat1GiuRieng, chiTiet: undefined },
    mayToanBo: { ...mayToanBo, chiTiet: undefined, theoPn6: undefined },
    chiTietMau: mayLat1.chiTiet,
  });
  console.error(`Đã ghi data/ho-so/lat-1.json${rel ? ` + ${rel}` : ''}`);
}

// ── In (chỉ tỉ lệ) ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`Biểu ${bieuThue.phienBan} · ${lat1.tongPhanNhomChenhBieu} phân nhóm chênh MFN trong biểu`);
console.log(`Phân nhóm chênh Oz đã khai: ${lat1.tongPhanNhomChenh} · ${lat1.tiLeLuotTong} % lượt · ${N} đầu = ${lat1.tiLeLuotLat1} % lượt`);
console.log(`Pareto toàn Oz: nền ${pareto.nen} % · mốc ${JSON.stringify(pareto.moc)} · dòng 8 số ${JSON.stringify(pareto.dong8)} · trần lát 1 ${pareto.tranTap} % · trần tối đa ${pareto.tranToiDa} %`);
console.log(`Pareto trong nhóm chênh: ${JSON.stringify(paretoChenh.moc)}`);
console.log(`Máy chốt trên lượt lát 1: ${JSON.stringify(lat1.mayChot.chotDung)} % đúng · ${lat1.mayChot.chotLech} % lệch · ${lat1.mayChot.khongChot} % không chốt; giữ riêng ${JSON.stringify(lat1.mayChot.giuRieng)}`);
console.log(`Theo ketQua: ${JSON.stringify(lat1.mayChot.theoKetQua)}`);
console.log(`Cờ hiệu chỉnh tiền lệ: ${lat1.phanNhom.filter((p) => p.canHieuChinhTienLe).map((p) => p.pn6).join(', ')}`);
const tt = {}; for (const p of lat1.phanNhom) tt[p.trangThaiSoHoa] = (tt[p.trangThaiSoHoa] || 0) + 1;
console.log(`Trạng thái số hoá (số phân nhóm): ${JSON.stringify(tt)}`);
for (const p of lat1.phanNhom) console.log(`${String(p.hang).padStart(2)} ${p.pn6} ${String(p.tiLeLuot).padStart(4)} % ${p.canHieuChinhTienLe ? 'HC' : '  '} ${p.trangThaiSoHoa}${p.mayChotDung ? ` máy ${p.mayChotDung} %` : ''}`);
