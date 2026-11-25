#!/usr/bin/env node
// scripts/luat-goc/chi-muc.mjs — dựng CHỈ MỤC NGHĨA trên nút luật (M-37, #1924). Chỉ mục là cửa vào, không phải kết luận.
//   node scripts/luat-goc/chi-muc.mjs            dựng và ghi data/luat-goc/chi-muc/{vec.bin,id.json,meta.json}
//   node scripts/luat-goc/chi-muc.mjs --kiem     không ghi: dựng vào bộ nhớ, so với tệp đang có (id + vec sha256)
//
// Nguồn: câu (data/luat-goc/cau/*.jsonl, M-31) của phan, chuong, nhom, phan-nhom, sen + TÊN nút biểu cấp chương / nhóm / phân nhóm 6 số.
// Không có: gir, wco (bản scan OCR), thong-bao (tiền lệ), dòng 8 số, tiêu đề biểu không mã, câu dẫn trần ("Nhóm này không bao gồm:").
// Chữ nhúng = "passage: đường dẫn cha (Phần › Chương › Nhóm) | câu dẫn | câu". Mô hình: Xenova/multilingual-e5-small q8 (lib/embed-pool.js), CPU.
// Lưu int8 chuẩn hoá 384 chiều. Tất định: thứ tự mục = thứ tự kho; mẻ nhúng xếp theo (độ dài chữ, vị trí) cố định.
// Quá 25 MB thì GỘP: các câu NGẮN (< 80 ký tự) liền nhau, cùng một câu dẫn và cùng đường dẫn cha thành một mục (id = câu đầu; id.json.gom ghi các câu).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const L = require('../../lib/chi-muc-luat.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NGUONG_BYTE = 25 * 1024 * 1024;
const NGAN = 80;

/** Gộp câu ngắn liền nhau cùng một câu dẫn + cùng đường dẫn cha (chỉ khi có câu dẫn; mục liệt kê mỗi mục thường là một nút riêng). */
export function gopMuc(muc) {
  const ra = []; let cur = null;
  for (const m of muc) {
    const ngan = m.chu.length < NGAN && m.danId;
    if (cur && ngan && cur.ngan && m.kho === cur.kho && m.danId === cur.danId && m.duong.join('›') === cur.duong.join('›')) { cur.gom.push(m.id); cur.chu += ` ${m.chu}`; continue; }
    cur = { ...m, gom: [m.id], ngan: !!ngan }; ra.push(cur);
  }
  return ra.map(({ ngan, ...r }) => r);
}

/** Thu mọi mục từ thư mục kho gốc. */
export function thuMuc({ goc, sections }) {
  const doc = (k) => L.docJsonl(path.join(goc, `${k}.jsonl`));
  const cau = (k) => L.docJsonl(path.join(goc, 'cau', `${k}.jsonl`));
  const kho = Object.fromEntries(L.KHO.map((k) => [k, doc(k)]));
  const sec = fs.existsSync(sections) ? JSON.parse(fs.readFileSync(sections, 'utf8')) : null;
  const b = L.taoBangTen({ phan: kho.phan, chuong: kho.chuong, bieu: kho.bieu, sections: sec });
  const bieuTheoId = new Map(kho.bieu.map((x) => [x.id, x]));
  const muc = []; const demKho = {}; const bo = { cam: 0 };
  for (const k of L.KHO) {
    bo.cam += kho[k].filter((x) => L.laNutCam(x)).length;
    const m = L.mucCuaKho(k, kho[k], cau(k), b, bieuTheoId); demKho[k] = m.length; muc.push(...m);
  }
  return { muc, demKho, nutCam: bo.cam, demNutCau: Object.fromEntries(L.KHO.map((k) => [k, cau(k).length])) };
}

/** Bộ nhúng thật: dùng chung singleton pipeline của embed-pool (không nạp bản thứ hai). */
export async function boNhungThat() {
  const ep = require('../../lib/embed-pool.js');
  const ext = await ep.khoiTaoModel();
  return async (chuoi) => {
    const out = await ext(chuoi.map((t) => L.TIEN_TO_PASSAGE + t), { pooling: 'mean', normalize: true });
    const dim = out.dims[1]; const d = out.data;
    return chuoi.map((_, i) => d.slice(i * dim, (i + 1) * dim));
  };
}

/**
 * Dựng chỉ mục. `embedder(chuoi[]) → Promise<Float32Array[]>` (đã chuẩn hoá). Trả {meta, ids, gom, vec}; ghi đĩa nếu `ra`.
 */
export async function dungChiMuc({ goc = L.GOC_MAC_DINH, sections = L.SECTIONS_MAC_DINH, ra = null, embedder, mau = 64, nguongByte = NGUONG_BYTE, log = () => {} } = {}) {
  let { muc, demKho, nutCam, demNutCau } = thuMuc({ goc, sections });
  const truocGop = muc.length; let gopLai = false;
  if (muc.length * L.DIM > nguongByte) { muc = gopMuc(muc); gopLai = true; }
  const chu = muc.map((m) => L.chuNhung(m));
  const thuTu = chu.map((_, i) => i).sort((a, b) => (chu[a].length - chu[b].length) || (a - b));
  const vec = new Int8Array(muc.length * L.DIM);
  const t0 = Date.now();
  for (let s = 0; s < thuTu.length; s += mau) {
    const nhom = thuTu.slice(s, s + mau); const v = await embedder(nhom.map((i) => chu[i]));
    nhom.forEach((i, j) => { for (let d = 0; d < L.DIM; d += 1) vec[i * L.DIM + d] = Math.max(-L.SCALE, Math.min(L.SCALE, Math.round(v[j][d] * L.SCALE))); });
    if ((s / mau) % 50 === 0) log(`${Math.min(s + mau, thuTu.length)}/${thuTu.length} mục, ${((Date.now() - t0) / 1000).toFixed(0)} giây`);
  }
  const ids = muc.map((m) => m.id); const gom = {}; for (const m of muc) if (m.gom && m.gom.length > 1) gom[m.id] = m.gom;
  const vecBuf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  const idJson = `${JSON.stringify(gopLai ? { ids, gom } : ids)}\n`;
  const meta = {
    khuon: L.KHUON, moHinh: 'Xenova/multilingual-e5-small', dtype: 'q8', tienTo: { kho: L.TIEN_TO_PASSAGE.trim(), hoi: 'query:' }, dim: L.DIM, scale: L.SCALE, luu: 'int8, chuẩn hoá L2 trước khi lượng tử',
    soMuc: muc.length, soMucTheoKho: demKho, soCauKhoNguon: demNutCau, nutBiCam: nutCam,
    gop: gopLai ? { bat: true, truoc: truocGop, sau: muc.length, cach: `câu ngắn (< ${NGAN} ký tự) liền nhau, cùng một câu dẫn và cùng đường dẫn cha gộp một mục; id = câu đầu, id.json.gom ghi các câu` } : { bat: false, nguong: nguongByte },
    chuNhung: 'đường dẫn cha (Phần › Chương › Nhóm[ › Phân nhóm]) | câu dẫn | câu',
    vecSha256: L.sha256(vecBuf), idSha256: L.sha256(Buffer.from(idJson)), nguon: L.shaNguon(goc, sections),
  };
  if (ra) {
    fs.mkdirSync(ra, { recursive: true });
    fs.writeFileSync(path.join(ra, 'vec.bin'), vecBuf); fs.writeFileSync(path.join(ra, 'id.json'), idJson); fs.writeFileSync(path.join(ra, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  }
  return { meta, ids, gom, vec, giay: (Date.now() - t0) / 1000 };
}

async function main() {
  const kiem = process.argv.includes('--kiem');
  const ra = path.join(L.GOC_MAC_DINH, 'chi-muc');
  const r = await dungChiMuc({ ra: kiem ? null : ra, embedder: await boNhungThat(), log: (s) => console.error(s) });
  console.log(`${kiem ? 'dựng thử' : 'đã ghi'}: ${r.meta.soMuc} mục (${(r.meta.soMuc * L.DIM / 1048576).toFixed(1)} MB), ${r.giay.toFixed(0)} giây; vecSha256 ${r.meta.vecSha256.slice(0, 16)}…`);
  if (kiem) {
    const cu = JSON.parse(fs.readFileSync(path.join(ra, 'meta.json'), 'utf8'));
    const khop = cu.vecSha256 === r.meta.vecSha256 && cu.idSha256 === r.meta.idSha256;
    console.log(`${khop ? 'PASS' : 'FAIL'} dựng lại ra cùng danh sách${cu.idSha256 === r.meta.idSha256 ? '' : ' (id khác)'}${cu.vecSha256 === r.meta.vecSha256 ? '' : ' (vectơ khác)'}`);
    process.exit(khop ? 0 : 1);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
export { ROOT };
