#!/usr/bin/env node
/**
 * Dựng bộ thử để riêng G0-3 hoàn toàn tất định (không AI, không mạng, hạt giống 20261121):
 *   1) de-rieng-300.jsonl            300 ca lấy từ data/oz-gold-final.jsonl (150 nhóm top 80% + 150 phần còn lại; ≤ 3/PN6)
 *   2) de-rieng-danh-sach-loai.json  khoá định danh của 300 ca trên và mọi dòng oz-gold trùng tên chuẩn hoá
 *   3) chua-tung-khai-100.jsonl      100 ca từ data/precedents.json có nhóm 4 số chưa từng có trong oz-gold (≤ 2/nhóm 4 số)
 *
 * Dùng:
 *   node scripts/dung-bo-thu-de-rieng.mjs
 *   node scripts/dung-bo-thu-de-rieng.mjs --ra=/tmp/thu-g03
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { holdoutKey } = require('../lib/holdout.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 20261121;
const SO_CHON_TANG_80 = 150;
const SO_CHON_TANG_20 = 150;
const GIOI_HAN_PN6 = 3;
const SO_CHON_CHUA_KHAI = 100;
const GIOI_HAN_H4 = 2;

const arg = (n, d) => {
  const a = process.argv.find((x) => x === `--${n}` || x.startsWith(`--${n}=`));
  return a ? (a.includes('=') ? a.slice(n.length + 3) : true) : d;
};
const OUT_DIR = path.resolve(String(arg('ra', path.join(ROOT, 'scripts', 'ca-do'))));

const text = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const nz = (v) => String(v || '').replace(/\D/g, '');
const chuanTen = (s) => String(s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .replace(/[^a-z\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function bam(s) {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngCua(khoa) {
  let a = bam(`${SEED}|${khoa}`);
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function xaoTron(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const taxData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
const ozRaw = fs.readFileSync(path.join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8');
const ozLines = ozRaw.split('\n').filter((l) => l.trim().length > 0);
const precedentsData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'precedents.json'), 'utf8'));

// ── 1) de-rieng-300.jsonl & de-rieng-danh-sach-loai.json (data/oz-gold-final.jsonl) ──
const h4Oz = new Set();
const ozParsed = [];
const loaiOz = { thieuTenHang: 0, maKhongConTrongBieu: 0 };
const ozValid = [];

for (let i = 0; i < ozLines.length; i += 1) {
  const dong = i + 1;
  const r = JSON.parse(ozLines[i]);
  const hs = nz(r.hsCode || r.hs || r.maHs);
  if (hs.length >= 4) h4Oz.add(hs.slice(0, 4));
  const tenHang = text(r.tenHang || r.productName || r.name);
  const tenChuan = chuanTen(tenHang);
  ozParsed.push({ dong, r, hs, tenHang, tenChuan });

  if (tenHang.length < 2 || !tenChuan) {
    loaiOz.thieuTenHang += 1;
    continue;
  }
  if (!/^\d{8}$/.test(hs) || !taxData[hs]) {
    loaiOz.maKhongConTrongBieu += 1;
    continue;
  }
  ozValid.push({
    dong,
    hs,
    pn6: hs.slice(0, 6),
    tenHang,
    tenChuan,
    chatLieu: text(r.chatLieu) || null,
    congDung: text(r.congDung) || null,
  });
}

const pn6Counts = new Map();
for (const x of ozValid) pn6Counts.set(x.pn6, (pn6Counts.get(x.pn6) || 0) + 1);
const pn6Sorted = [...pn6Counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
const pn6Tang80 = new Set();
const pn6Tang20 = new Set();
let cumRows = 0;
for (const [pn6, c] of pn6Sorted) {
  if (cumRows < 0.8 * ozValid.length) {
    pn6Tang80.add(pn6);
    cumRows += c;
  } else {
    pn6Tang20.add(pn6);
  }
}

const demPn6 = new Map();
const tenChuanDaChon = new Set();
const chonTuTang = (ds, limit, khoa) => {
  const picked = [];
  for (const x of xaoTron(ds, rngCua(khoa))) {
    if (picked.length >= limit) break;
    if ((demPn6.get(x.pn6) || 0) >= GIOI_HAN_PN6) continue;
    if (tenChuanDaChon.has(x.tenChuan)) continue;
    demPn6.set(x.pn6, (demPn6.get(x.pn6) || 0) + 1);
    tenChuanDaChon.add(x.tenChuan);
    picked.push(x);
  }
  return picked;
};

const tang80All = ozValid.filter((x) => pn6Tang80.has(x.pn6)).sort((a, b) => a.dong - b.dong);
const tang20All = ozValid.filter((x) => pn6Tang20.has(x.pn6)).sort((a, b) => a.dong - b.dong);
const chonTang80 = chonTuTang(tang80All, SO_CHON_TANG_80, 'tang80');
const chonTang20 = chonTuTang(tang20All, SO_CHON_TANG_20, 'tang20');
const chon300 = [...chonTang80, ...chonTang20];

if (chonTang80.length !== SO_CHON_TANG_80 || chonTang20.length !== SO_CHON_TANG_20) {
  throw new Error(`Không đủ mẫu phân tầng: tang80=${chonTang80.length}/${SO_CHON_TANG_80}, tang20=${chonTang20.length}/${SO_CHON_TANG_20}`);
}

const dongDaChon = new Set(chon300.map((x) => x.dong));
const dongOzGoldLoai = [];
const khoaHoldoutLoai = new Set();
for (const x of ozParsed) {
  if (dongDaChon.has(x.dong) || (x.tenChuan && tenChuanDaChon.has(x.tenChuan))) {
    dongOzGoldLoai.push(x.dong);
    khoaHoldoutLoai.add(holdoutKey(x.r));
  }
}
dongOzGoldLoai.sort((a, b) => a - b);
const dsKhoaHoldout = [...khoaHoldoutLoai].sort();
const dsTenChuan = [...tenChuanDaChon].sort();

const danhSachLoaiObj = {
  phienBan: 'G0-3@2026-11-21',
  hatGiong: SEED,
  nguon: 'data/oz-gold-final.jsonl',
  quyTacChuanTen: 'NFD bỏ dấu, đ→d, chữ thường, bỏ số và ký hiệu ([^a-z\\s]), gộp khoảng trắng',
  soMauChon: chon300.length,
  soDongLoai: dongOzGoldLoai.length,
  soKhoaHoldoutLoai: dsKhoaHoldout.length,
  soTenChuanLoai: dsTenChuan.length,
  dongOzGold: dongOzGoldLoai,
  khoaHoldout: dsKhoaHoldout,
  tenChuan: dsTenChuan,
};

// ── 2) chua-tung-khai-100.jsonl (data/precedents.json) ─────────────────────────────────
const loaiPrec = {
  khongPhaiVn: 0,
  maKhongDu8SoHoacKhongTrongBieu: 0,
  nhom4DaCoTrongOzGold: 0,
  thieuTenHang: 0,
  trungTenChuan: 0,
};
let tongBanGhiPrecedents = 0;
const precEligible = [];
const seenPrecNorm = new Set();

for (const key of Object.keys(precedentsData).sort()) {
  const list = Array.isArray(precedentsData[key]) ? precedentsData[key] : [];
  for (const p of list) {
    tongBanGhiPrecedents += 1;
    if (p.country && p.country !== 'VN') {
      loaiPrec.khongPhaiVn += 1;
      continue;
    }
    const hs = nz(p.finalHsCode || p.outcomeHs || p.outcome || key);
    if (!/^\d{8}$/.test(hs) || !taxData[hs]) {
      loaiPrec.maKhongDu8SoHoacKhongTrongBieu += 1;
      continue;
    }
    const h4 = hs.slice(0, 4);
    if (h4Oz.has(h4)) {
      loaiPrec.nhom4DaCoTrongOzGold += 1;
      continue;
    }
    const tenHang = text(p.productName || p.description);
    const nt = chuanTen(tenHang);
    if (tenHang.length < 2 || !nt) {
      loaiPrec.thieuTenHang += 1;
      continue;
    }
    if (seenPrecNorm.has(nt)) {
      loaiPrec.trungTenChuan += 1;
      continue;
    }
    seenPrecNorm.add(nt);
    const nguonDong = text(p.tbTchqNumber || p.source?.reference || key);
    precEligible.push({ tenHang, maDung: hs, h4, nguonDong });
  }
}

const demH4 = new Map();
const chon100 = [];
for (const x of xaoTron(precEligible, rngCua('chua-tung-khai-100'))) {
  if (chon100.length >= SO_CHON_CHUA_KHAI) break;
  if ((demH4.get(x.h4) || 0) >= GIOI_HAN_H4) continue;
  demH4.set(x.h4, (demH4.get(x.h4) || 0) + 1);
  chon100.push({ tenHang: x.tenHang, maDung: x.maDung, nguonDong: x.nguonDong });
}

// ── Ghi tệp ────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const deRieng300Str = `${chon300.map((x) => JSON.stringify({
  tenHang: x.tenHang,
  chatLieu: x.chatLieu,
  congDung: x.congDung,
  maDung: x.hs,
  nguonDong: `oz-gold:${x.dong}`,
})).join('\n')}\n`;
const chuaKhai100Str = `${chon100.map((x) => JSON.stringify(x)).join('\n')}\n`;
const danhSachLoaiStr = `${JSON.stringify(danhSachLoaiObj, null, 1)}\n`;

const p300 = path.join(OUT_DIR, 'de-rieng-300.jsonl');
const p100 = path.join(OUT_DIR, 'chua-tung-khai-100.jsonl');
const pLoai = path.join(OUT_DIR, 'de-rieng-danh-sach-loai.json');
fs.writeFileSync(p300, deRieng300Str);
fs.writeFileSync(p100, chuaKhai100Str);
fs.writeFileSync(pLoai, danhSachLoaiStr);

const stats = {
  hatGiong: SEED,
  thuMucRa: path.relative(ROOT, OUT_DIR) || '.',
  deRieng300: {
    tongOzGold: ozLines.length,
    hopLeOzGold: ozValid.length,
    loaiTheoLyDo: loaiOz,
    pn6Tang80: pn6Tang80.size,
    dongHopLeTang80: tang80All.length,
    pn6Tang20: pn6Tang20.size,
    dongHopLeTang20: tang20All.length,
    chonTang80: chonTang80.length,
    chonTang20: chonTang20.length,
    tongChon: chon300.length,
    pn6PhuTang80: new Set(chonTang80.map((x) => x.pn6)).size,
    pn6PhuTang20: new Set(chonTang20.map((x) => x.pn6)).size,
    pn6PhuTong: new Set(chon300.map((x) => x.pn6)).size,
    nhom4Phu: new Set(chon300.map((x) => x.hs.slice(0, 4))).size,
    chuongPhu: new Set(chon300.map((x) => x.hs.slice(0, 2))).size,
    sha256: sha256(Buffer.from(deRieng300Str)),
  },
  danhSachLoai: {
    soDongLoai: dongOzGoldLoai.length,
    soKhoaHoldoutLoai: dsKhoaHoldout.length,
    soTenChuanLoai: dsTenChuan.length,
    sha256: sha256(Buffer.from(danhSachLoaiStr)),
  },
  chuaTungKhai100: {
    tongBanGhiPrecedents,
    loaiTheoLyDo: loaiPrec,
    ungVienHopLe: precEligible.length,
    tongChon: chon100.length,
    pn6Phu: new Set(chon100.map((x) => x.maDung.slice(0, 6))).size,
    nhom4Phu: new Set(chon100.map((x) => x.maDung.slice(0, 4))).size,
    chuongPhu: new Set(chon100.map((x) => x.maDung.slice(0, 2))).size,
    sha256: sha256(Buffer.from(chuaKhai100Str)),
  },
};

console.log(JSON.stringify(stats, null, 2));
