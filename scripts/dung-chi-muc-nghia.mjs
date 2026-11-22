#!/usr/bin/env node
/**
 * scripts/dung-chi-muc-nghia.mjs — Dựng chỉ mục tìm theo nghĩa từng dòng (Option B, #1596).
 *
 * Nguồn:
 *   - data/tax.json (tất cả dòng biểu thuế còn hiệu lực, kèm tên cha khi là "Loại khác")
 *   - data/oz-gold-final.jsonl (tenHang + chatLieu + congDung; KHÔNG đọc sampleDesc; bỏ dòng laCaKin khi --loai-ca-kin)
 *   - data/precedents.json (tiền lệ VN productName)
 *
 * Đầu ra gọn (~6.5 MB .bin int8 + ~1 MB .meta.json), tất định 100% (không dấu thời gian, 2 lần dựng trùng sha256).
 * Dùng chung duy nhất 1 singleton pipeline e5-small từ lib/embed-pool.js.
 *
 * Dùng:
 *   node scripts/dung-chi-muc-nghia.mjs --ghi
 *   node scripts/dung-chi-muc-nghia.mjs --loai-ca-kin --ra=/tmp/chi-muc-s7.bin
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { laCaKin, taiDanhSachLoai } from './dung-bo-thu-de-rieng.mjs';

const require = createRequire(import.meta.url);
const { dataReadPath } = require('../lib/data-paths.js');
const embedPool = require('../lib/embed-pool.js');
const hsTree = require('../lib/hs-tree.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEP_BIN_MAC_DINH = path.join(ROOT, 'data', 'do-thi', 'chi-muc-nghia.bin');
const SCALE = 127;
const DIM = 384;

const nz = (s) => String(s || '').replace(/\D/g, '');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).trim() : t;
};

/** Chuẩn bị danh sách câu đại diện đã khử trùng lặp, sắp xếp ổn định, không PII. */
export function thuThapMucChiMuc({ loaiCaKin = false, danhSachLoai = null, taxData = null, ozLines = null, precedents = null } = {}) {
  const dsLoai = loaiCaKin ? (danhSachLoai || taiDanhSachLoai()) : null;
  const tax = taxData || JSON.parse(fs.readFileSync(dataReadPath('tax.json'), 'utf8'));
  const oz = Array.isArray(ozLines)
    ? ozLines.map((x) => (typeof x === 'string' ? JSON.parse(x) : x))
    : fs.readFileSync(dataReadPath('oz-gold-final.jsonl'), 'utf8').split('\n').filter((l) => l.trim()).map(JSON.parse);
  const prec = precedents || JSON.parse(fs.readFileSync(dataReadPath('precedents.json'), 'utf8'));

  const seen = new Set();
  const rawItems = [];

  const pushItem = (hs, nguon, embedText, tenHien) => {
    const code = nz(hs);
    if (!/^\d{8}$/.test(code) || !tax[code]) return;
    const txt = String(embedText || '').normalize('NFC').replace(/\s+/g, ' ').trim();
    if (txt.length < 3) return;
    const key = `${code}|${txt.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    rawItems.push({
      hs: code,
      nguon,
      text: clip(txt, 220),
      ten: clip(tenHien || txt, 72),
    });
  };

  // 1. Biểu thuế (giữ tên nhóm/phân nhóm cho các dòng "Loại khác" để không bị vô nghĩa).
  const taxOtherDedup = new Set();
  for (const code of Object.keys(tax).sort()) {
    if (!/^\d{8}$/.test(code)) continue;
    const vn = String(tax[code]?.vn || '').replace(/^[-\s–]+/, '').trim();
    if (!vn) continue;
    const isOther = /^lo[aạ]i\s+kh[aá]c\b/iu.test(vn);
    const n6 = hsTree.nodeOf(code.slice(0, 6));
    const n4 = hsTree.nodeOf(code.slice(0, 4));
    const cha = [n4?.tenVi, n6?.tenVi].filter((x) => x && !/^lo[aạ]i\s+kh[aá]c\b/iu.test(x)).join(' — ');
    const fullText = (isOther || vn.length < 18) && cha ? `${cha}; ${vn}` : vn;
    if (isOther) {
      const k6 = `${code.slice(0, 6)}|${fullText.toLowerCase()}`;
      if (taxOtherDedup.has(k6)) continue;
      taxOtherDedup.add(k6);
    }
    pushItem(code, 'bieu', fullText, vn);
  }

  // 2. Tờ khai Oz sạch (tuyệt đối không đọc sampleDesc; loại ca kín S-7 khi --loai-ca-kin).
  let soDongOzLoai = 0;
  for (const r of oz) {
    if (loaiCaKin && laCaKin(r, dsLoai)) {
      soDongOzLoai += 1;
      continue;
    }
    const code = nz(r.hsCode || r.hs || r.maHs);
    if (!/^\d{8}$/.test(code) || !tax[code]) continue;
    const ten = String(r.tenHang || '').trim();
    if (ten.length < 2) continue;
    const desc = [ten, r.chatLieu, r.congDung].filter(Boolean).join(', ');
    pushItem(code, 'oz', desc, ten);
  }

  // 3. Tiền lệ TB-TCHQ Việt Nam.
  for (const key of Object.keys(prec).sort()) {
    const list = Array.isArray(prec[key]) ? prec[key] : [];
    for (const p of list) {
      if (p?.country && p.country !== 'VN') continue;
      const code = nz(p.finalHsCode || p.outcomeHs || p.outcome || key);
      const ten = String(p.productName || p.description || '').trim();
      if (!ten || ten.length < 4) continue;
      pushItem(code, 'tb', ten, ten);
    }
  }

  rawItems.sort((a, b) => cmpStr(a.hs, b.hs) || cmpStr(a.nguon, b.nguon) || cmpStr(a.text, b.text));
  return { rawItems, soDongOzLoai };
}

/** Dựng chỉ mục nhị phân int8 + metadata tất định. */
export async function dungChiMucNghia(opts = {}) {
  const loaiCaKin = Boolean(opts.loaiCaKin);
  const { rawItems, soDongOzLoai } = thuThapMucChiMuc(opts);
  const ext = opts.extractor || (await embedPool.khoiTaoModel());
  if (!ext) throw new Error('Không khởi tạo được model e5-small');

  const bin = Buffer.allocUnsafe(rawItems.length * DIM);
  const BATCH = 64;
  for (let i = 0; i < rawItems.length; i += BATCH) {
    if (opts.progress && (i / BATCH) % 30 === 0) {
      process.stderr.write(`[chi-muc-nghia] ${i}/${rawItems.length}\n`);
    }
    const slice = rawItems.slice(i, i + BATCH);
    const inputs = slice.map((x) => x.text);
    const out = await ext(inputs, { pooling: 'mean', normalize: true });
    const data = out.odata || out.data;
    const dim = out.dims?.[1] || DIM;
    for (let j = 0; j < slice.length; j += 1) {
      const rowOffset = (i + j) * DIM;
      const srcOffset = j * dim;
      for (let d = 0; d < DIM; d += 1) {
        const q = Math.round(Math.max(-SCALE, Math.min(SCALE, data[srcOffset + d] * SCALE)));
        bin.writeInt8(q, rowOffset + d);
      }
    }
  }

  const meta = {
    phienBan: 1,
    model: process.env.GD0_MODEL || 'Xenova/multilingual-e5-small',
    dtype: 'q8',
    dim: DIM,
    scale: SCALE,
    loaiCaKin,
    soDongOzLoai,
    soMuc: rawItems.length,
    items: rawItems.map((x) => ({ hs: x.hs, nguon: x.nguon, ten: x.ten })),
  };
  const metaBuf = Buffer.from(`${JSON.stringify(meta)}\n`, 'utf8');
  return { bin, meta, metaBuf };
}

async function chayCli() {
  const args = process.argv.slice(2);
  const argVal = (n, d = null) => {
    const a = args.find((x) => x === `--${n}` || x.startsWith(`--${n}=`));
    return a ? (a.includes('=') ? a.slice(n.length + 3) : true) : d;
  };
  const ghi = Boolean(argVal('ghi', false));
  const ra = argVal('ra', null);
  const loaiCaKin = Boolean(argVal('loai-ca-kin', false));

  const { bin, meta, metaBuf } = await dungChiMucNghia({ loaiCaKin });
  const stats = {
    loaiCaKin: meta.loaiCaKin,
    soMuc: meta.soMuc,
    soDongOzLoai: meta.soDongOzLoai,
    binBytes: bin.length,
    metaBytes: metaBuf.length,
    binSha256: sha256(bin),
    metaSha256: sha256(metaBuf),
  };

  if (ghi || ra) {
    const binPath = path.resolve(typeof ra === 'string' ? ra : TEP_BIN_MAC_DINH);
    const metaPath = binPath.replace(/\.bin$/, '.meta.json');
    fs.mkdirSync(path.dirname(binPath), { recursive: true });
    fs.writeFileSync(binPath, bin);
    fs.writeFileSync(metaPath, metaBuf);
    stats.tepBin = path.relative(ROOT, binPath) || binPath;
    stats.tepMeta = path.relative(ROOT, metaPath) || metaPath;
  }
  console.log(JSON.stringify(stats, null, 2));
}

const duongDanThuc = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};
const laChinh = Boolean(
  process.argv[1]
  && duongDanThuc(path.resolve(process.argv[1])) === duongDanThuc(fileURLToPath(import.meta.url)),
);
if (laChinh) {
  chayCli();
}
