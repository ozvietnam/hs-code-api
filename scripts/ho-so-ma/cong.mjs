#!/usr/bin/env node
// scripts/ho-so-ma/cong.mjs — M-71 (#1963, ADR-0006): năm cổng máy của hồ sơ vấn đề mã 8 số. Tất định, không mạng, không AI.
//   (1) ĐỦ       mọi câu có sức pháp lý trên đường đi đã thành vấn đề hoặc có BỎ QUA kèm lý do
//   (2) LOẠI     mọi cạnh LOAI_SANG / PHAN_VE / CHUA_RO (M-33) xuất phát từ câu trên đường đi có vấn đề tương ứng, đích khớp;
//                cạnh ĐI VÀO (câu ở nơi khác, đích trên đường đi, KHOP) có PHAI_LA ở nút đích mang tu = câu nguồn; CHUA_RO đi vào chỉ cảnh báo
//   (3) ANH EM   mỗi cặp nút cùng cha được tách (TACH_ANH_EM hoặc NGUONG không chồng); không hai anh em trùng bộ điều kiện; dải không hở
//   (4) TRÍCH    trích nguyên văn câu, id câu thật, lop / nguon khớp nút nguồn, dữ kiện có trong chữ luật, câu thuộc đường đi của nút
//   (5) VÂN TAY  van = sha256 chữ câu hiện hành; lệch thì đỏ kèm lệnh dựng lại
//
//   node scripts/ho-so-ma/cong.mjs --pham-vi <76 | chuong:76 | phan:XV | chuong:28:pc:II | 7605 | 760519 | 76051910 | bieu:…> [--pham-vi …]
//        [--chi-trong]  chỉ câu / anh em bên trong phạm vi, bỏ các cấp phía trên (cho thẻ tách từng cấp)
//        [--cong 1,2,3,4,5] [--luat <data/luat-goc>] [--ho-so <data/ho-so-ma>]
//   Không --pham-vi: chỉ chạy khuôn + cổng 4, 5 trên mọi bản ghi (cổng 1–3 cần phạm vi).
//   node scripts/ho-so-ma/cong.mjs --dinh-cau <id câu>   in chữ câu hiện hành, vân tay mới và mọi bản ghi dính câu đó (để dựng lại)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { kiemKhoHoSo, BO_QUA } from './khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');
const { CHUONG_SANG_PHAN } = require('../../lib/do-thi/dan-chieu.js');

// Cùng phép chuẩn hoá với scripts/kiem-luat-goc.mjs (gon + chuanSo): NFC, gộp khoảng trắng, bỏ khoảng trắng quanh dấu nối.
const gon = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
export const chuanSo = (s) => gon(s).replace(/ ?([-–—/]) ?/g, '$1');
export const vanTay = (chu) => crypto.createHash('sha256').update(chu, 'utf8').digest('hex');

const KHO_BO = new Set(['thong-bao.jsonl']); // tiền lệ không vào hồ sơ
const LOAI_CANH_BAT_BUOC = new Set(['LOAI_SANG', 'PHAN_VE', 'DINH_NGHIA']); // câu HUONG_DAN mang cạnh này ⇒ có sức tạo điều kiện

/** Nạp đủ luật cho cổng: nút (chữ, lop, nguon), câu (tu/den), cạnh nghĩa, cây. */
export function napLuatCong(thuMuc = G.LUAT_MAC_DINH) {
  const nut = new Map(); const cau = new Map(); const canhTheoTu = new Map(); const canhTheoDen = new Map();
  for (const f of fs.readdirSync(thuMuc).filter((x) => x.endsWith('.jsonl') && !KHO_BO.has(x)).sort()) {
    for (const n of G.docJsonl(path.join(thuMuc, f))) if (n.lop !== 'TIEN_LE') nut.set(n.id, { lop: n.lop, nguon: n.nguon?.vanBan ?? null, v: n.nguyenVan });
  }
  const tmCau = path.join(thuMuc, 'cau');
  if (fs.existsSync(tmCau)) {
    for (const f of fs.readdirSync(tmCau).filter((x) => x.endsWith('.jsonl') && !KHO_BO.has(x)).sort()) {
      for (const c of G.docJsonl(path.join(tmCau, f))) { const nId = c.id.split('#')[0]; if (nut.has(nId)) cau.set(c.id, { nut: nId, tu: c.tu, den: c.den }); }
    }
  }
  const tmCanh = path.join(thuMuc, 'nghia-canh');
  if (fs.existsSync(tmCanh)) {
    for (const f of fs.readdirSync(tmCanh).filter((x) => x.endsWith('.jsonl')).sort()) {
      for (const e of G.docJsonl(path.join(tmCanh, f))) { if (!canhTheoTu.has(e.tu)) canhTheoTu.set(e.tu, []); canhTheoTu.get(e.tu).push(e); if (!canhTheoDen.has(e.den)) canhTheoDen.set(e.den, []); canhTheoDen.get(e.den).push(e); }
    }
  }
  const chuCau = (id) => { const c = cau.get(id); return c ? nut.get(c.nut).v.slice(c.tu, c.den) : null; };
  return { thuMuc, nut, cau, canhTheoTu, canhTheoDen, chuCau, cay: G.napLuat(thuMuc) };
}

/** Loại vấn đề một cạnh đòi; null = cạnh không thuộc cổng 2. */
export function loaiCanhDoi(e) {
  if (e.trangThai === 'CHUA_RO') return /LOAI_SANG|PHAN_VE/.test(e.vi || '') ? ['KHONG_DUOC_LA', 'PHAI_LA'] : null;
  if (e.loai === 'LOAI_SANG') return ['KHONG_DUOC_LA'];
  if (e.loai === 'PHAN_VE') return ['KHONG_DUOC_LA', 'PHAI_LA'];
  return null;
}
/** Cạnh đi vào nút đích: 'DO' = phải có PHAI_LA, 'CANH_BAO' = CHUA_RO chỉ cảnh báo, null = không xét. */
export function loaiCanhVao(e) {
  if (e.trangThai === 'CHUA_RO') return /LOAI_SANG|PHAN_VE/.test(e.vi || '') ? 'CANH_BAO' : null;
  return e.trangThai === 'KHOP' && (e.loai === 'LOAI_SANG' || e.loai === 'PHAN_VE') ? 'DO' : null;
}
/** Câu nguồn ở "nơi khác" so với nút đích: không phải chính nút, không phải nút trên/dưới nó trên cùng đường đi, không áp chung. */
function laNoiKhac(cauId, den, L) {
  const chu = G.chuCuaCau(cauId);
  if (!chu || chu === G.CHUNG) return false;
  if ((G.duongDiNut(chu, L.cay) || []).some((x) => x.nut === den)) return false;
  return !G.trenCua(den, L.cay).includes(chu) && chu !== den;
}
const canhTaoDieuKien = (e) => (e.trangThai === 'CHUA_RO' ? /LOAI_SANG|PHAN_VE|DINH_NGHIA/.test(e.vi || '') : LOAI_CANH_BAT_BUOC.has(e.loai));

/** Phạm vi: nút gốc, các nút bên trong (gồm gốc), các nút phía trên. */
export function giaiPhamVi(chuoi, L) {
  const s = String(chuoi).trim();
  let goc = null;
  if (/^phan:[IVX]+$/.test(s) || /^chuong:\d{2}(?::pc:[IVX]+)?$/.test(s) || /^bieu:\d{4,8}(?::td\d+)*$/.test(s)) goc = s;
  else if (/^\d{2}$/.test(s)) goc = `chuong:${s}`;
  else if (G.chuanMa(s)) goc = `bieu:${G.chuanMa(s)}`;
  if (!goc) throw new Error(`phạm vi lạ "${s}"`);
  if (!G.duongDiNut(goc, L.cay)) throw new Error(`phạm vi ${goc} không có trong kho luật`);
  const duoi = new Set();
  const di = (id) => { duoi.add(id); if (/^chuong:\d{2}$/.test(id)) for (const pc of L.cay.pcCuaChuong.get(id.slice(7)) || []) duoi.add(pc.id); for (const c of G.conCua(id, L.cay)) di(c); };
  di(goc);
  return { goc, duoi, tren: new Set(G.trenCua(goc, L.cay)) };
}

/** Khoảng [tu, den] có chồng nhau không (null = vô cùng). */
function chong(a, b) {
  const truoc = (x, y) => x.den !== null && y.tu !== null && (x.den < y.tu || (x.den === y.tu && !(x.gomDen && y.gomTu)));
  return !truoc(a, b) && !truoc(b, a);
}
const khoaNguong = (n) => `${chuanSo(n.daiLuong).toLowerCase()}|${chuanSo(n.donVi ?? '').toLowerCase()}`;

/**
 * Chạy các cổng. Trả {khuon: string[], cong: {1..5: {ten, loi: string[], soKiem}}}.
 * @param {{luat?: string, hoSo?: string, phamVi?: string[], chiTrong?: boolean, cong?: number[], L?: object}} o
 */
export function chayCong({ luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH, phamVi = [], chiTrong = false, cong = [1, 2, 3, 4, 5], L = null } = {}) {
  L = L || napLuatCong(luat);
  const kho = kiemKhoHoSo(hoSo);
  const tot = kho.banGhi.filter((x) => !x._hong);
  const theoCau = new Map(); const vanDeTheoNut = new Map();
  for (const x of tot) {
    if (!theoCau.has(x.cau)) theoCau.set(x.cau, []); theoCau.get(x.cau).push(x);
    if (x.loai !== BO_QUA) { if (!vanDeTheoNut.has(x.nut)) vanDeTheoNut.set(x.nut, []); vanDeTheoNut.get(x.nut).push(x); }
  }
  const pv = phamVi.map((p) => giaiPhamVi(p, L));
  const N = new Set(); const NTrong = new Set();
  for (const p of pv) { for (const id of p.duoi) { N.add(id); NTrong.add(id); } if (!chiTrong) for (const id of p.tren) N.add(id); }
  const ra = {
    1: { ten: 'ĐỦ', loi: [], soKiem: 0 }, 2: { ten: 'LOẠI', loi: [], canhBao: [], soKiem: 0 }, 3: { ten: 'ANH EM', loi: [], soKiem: 0 },
    4: { ten: 'TRÍCH', loi: [], soKiem: 0 }, 5: { ten: 'VÂN TAY', loi: [], soKiem: 0 },
  };
  const ngan = (t) => (t.length > 90 ? `${t.slice(0, 90)}…` : t).replace(/\n/g, ' ');

  // Câu trên đường đi của phạm vi.
  const S = [];
  if (pv.length) for (const id of L.cau.keys()) { const c = G.chuCuaCau(id); if (c && N.has(c)) S.push(id); }

  if (pv.length && cong.includes(1)) {
    for (const c of S) {
      const n = L.nut.get(L.cau.get(c).nut);
      const batBuoc = n.lop === 'LUAT' || (n.lop === 'HUONG_DAN' && (L.canhTheoTu.get(c) || []).some(canhTaoDieuKien));
      if (!batBuoc) continue;
      ra[1].soKiem += 1;
      if (!theoCau.has(c)) ra[1].loi.push(`${c} (${n.lop}) chưa thành vấn đề, chưa có BỎ QUA — "${ngan(L.chuCau(c))}"`);
    }
  }

  if (pv.length && cong.includes(2)) {
    for (const c of S) {
      for (const e of L.canhTheoTu.get(c) || []) {
        const doi = loaiCanhDoi(e);
        if (!doi) continue;
        ra[2].soKiem += 1;
        const co = (theoCau.get(c) || []).some((x) => doi.includes(x.loai) && (x.den || []).includes(e.den));
        if (!co) ra[2].loi.push(`${c} → ${e.den} (${e.trangThai === 'CHUA_RO' ? `CHUA_RO ${e.vi}` : e.loai}) chưa có vấn đề ${doi.join(' / ')} với den chứa ${e.den}`);
      }
    }
    // Cạnh đi vào: đích là nút trên đường đi, câu nguồn ở nơi khác.
    for (const den of N) {
      for (const e of L.canhTheoDen.get(den) || []) {
        const k = loaiCanhVao(e);
        if (!k || !L.cau.has(e.tu) || !laNoiKhac(e.tu, den, L)) continue;
        const co = (vanDeTheoNut.get(den) || []).some((x) => x.loai === 'PHAI_LA' && x.tu === e.tu);
        if (co) { ra[2].soKiem += 1; continue; }
        if (k === 'DO') { ra[2].soKiem += 1; ra[2].loi.push(`${e.tu} → ${den} (đi vào, ${e.loai}) chưa có PHAI_LA ở ${den} mang tu ${e.tu}`); } else ra[2].canhBao.push(`${e.tu} → ${den} (đi vào, CHUA_RO ${e.vi}) chưa có PHAI_LA — cảnh báo, chờ hai phiếu khớp`);
      }
    }
  }

  if (pv.length && cong.includes(3)) {
    const nhom = []; // {cha, con[], chiVoi?: nút}
    const daCo = new Set();
    for (const id of NTrong) {
      const con = G.conCua(id, L.cay);
      if (con.length >= 2 && !daCo.has(id)) { daCo.add(id); nhom.push({ cha: id, con }); }
    }
    if (!chiTrong) {
      for (const p of pv) {
        for (const a of [...p.tren, p.goc]) {
          if (/^phan:/.test(a)) continue;
          const ae = G.anhEmCua(a, L.cay);
          if (ae.length) nhom.push({ cha: `cha của ${a}`, con: [a, ...ae], chiVoi: a });
        }
      }
    }
    const vd = (id) => vanDeTheoNut.get(id) || [];
    const daCap = new Set(); const daSoatVoi = new Set();
    for (const g of nhom) {
      const anhEm = new Set(g.con);
      for (let i = 0; i < g.con.length; i += 1) {
        for (let j = i + 1; j < g.con.length; j += 1) {
          const A = g.con[i]; const B = g.con[j];
          if (g.chiVoi && A !== g.chiVoi && B !== g.chiVoi) continue;
          const k = [A, B].sort().join('|');
          if (daCap.has(k)) continue;
          daCap.add(k); ra[3].soKiem += 1;
          const tach = vd(A).some((x) => x.loai === 'TACH_ANH_EM' && x.voi.includes(B)) || vd(B).some((x) => x.loai === 'TACH_ANH_EM' && x.voi.includes(A));
          let tachNguong = false;
          for (const qa of vd(A).filter((x) => x.loai === 'NGUONG')) {
            for (const qb of vd(B).filter((x) => x.loai === 'NGUONG')) {
              if (khoaNguong(qa.nguong) !== khoaNguong(qb.nguong)) continue;
              if (chong(qa.nguong, qb.nguong)) ra[3].loi.push(`${A} và ${B}: NGUONG chồng dải "${qa.nguong.daiLuong}" (${qa.id} / ${qb.id})`);
              else tachNguong = true;
            }
          }
          if (!tach && !tachNguong) ra[3].loi.push(`${A} và ${B} (${g.cha}): chưa có TACH_ANH_EM giữa hai nút, chưa có NGUONG phân dải`);
          const boDk = (id) => new Set(vd(id).map((x) => `${x.loai}|${chuanSo(x.dieuKien).toLowerCase()}`));
          const da = boDk(A); const db = boDk(B);
          if (da.size && da.size === db.size && [...da].every((x) => db.has(x))) ra[3].loi.push(`${A} và ${B}: trùng bộ điều kiện (${da.size} điều kiện y hệt)`);
        }
      }
      // TACH_ANH_EM / NGUONG trỏ tới nút không phải anh em.
      for (const id of g.con) {
        if ((g.chiVoi && id !== g.chiVoi) || daSoatVoi.has(id)) continue;
        daSoatVoi.add(id);
        for (const x of vd(id)) for (const v of x.voi || []) if (!anhEm.has(v) || v === id) ra[3].loi.push(`${x.id}: voi ${v} không phải anh em cùng cha của ${id}`);
      }
      // Dải hở: mọi anh em cùng có NGUONG trên một đại lượng thì các dải phải nối liền.
      if (!g.chiVoi) {
        const theoKhoa = new Map();
        for (const id of g.con) for (const x of vd(id).filter((y) => y.loai === 'NGUONG')) { const kk = khoaNguong(x.nguong); if (!theoKhoa.has(kk)) theoKhoa.set(kk, new Map()); theoKhoa.get(kk).set(id, x.nguong); }
        for (const [kk, m] of theoKhoa) {
          if (m.size !== g.con.length) continue;
          const ds = [...m.values()].sort((a, b) => (a.tu ?? -Infinity) - (b.tu ?? -Infinity));
          for (let i = 1; i < ds.length; i += 1) {
            const a = ds[i - 1]; const b = ds[i];
            if (a.den === null || b.tu === null) continue;
            if (a.den < b.tu || (a.den === b.tu && !a.gomDen && !b.gomTu)) ra[3].loi.push(`${g.cha}: dải "${kk.split('|')[0]}" hở giữa ${a.den} và ${b.tu}`);
          }
        }
      }
    }
  }

  // Cổng 4, 5: bản ghi của nút trong phạm vi (không phạm vi: mọi bản ghi).
  const R = pv.length ? tot.filter((x) => N.has(x.nut)) : tot;
  const coThat = (id) => L.nut.has(id) || L.cay.theoId.has(id) || (/^chuong:(\d{2})$/.test(id) && !!CHUONG_SANG_PHAN[id.slice(7)]) || (/^phan:[IVX]+$/.test(id) && Object.values(CHUONG_SANG_PHAN).includes(id.slice(5)));
  if (cong.includes(4)) {
    for (const x of R) {
      ra[4].soKiem += 1;
      if (/^tb:/.test(x.cau)) { ra[4].loi.push(`${x.id}: trích câu tiền lệ ${x.cau} — hồ sơ không chứa tiền lệ`); continue; }
      const chu = L.chuCau(x.cau);
      if (chu === null) { ra[4].loi.push(`${x.id}: câu ${x.cau} không có trong kho luật gốc`); continue; }
      const nNguon = L.nut.get(L.cau.get(x.cau).nut);
      const chu0 = G.chuCuaCau(x.cau);
      const tren = new Set(G.trenCua(x.nut, L.cay));
      const anhEm = new Set(G.anhEmCua(x.nut, L.cay));
      const vao = x.tu !== undefined && (L.canhTheoTu.get(x.cau) || []).some((e) => e.den === x.nut && loaiCanhVao(e));
      if (x.tu !== undefined && !vao) ra[4].loi.push(`${x.id}: tu ${x.tu} không có cạnh LOAI_SANG / PHAN_VE nào đi vào ${x.nut}`);
      const dungCho = x.loai === BO_QUA ? chu0 === x.nut
        : vao || chu0 === G.CHUNG || chu0 === x.nut || tren.has(chu0) || ((x.loai === 'TACH_ANH_EM' || x.loai === 'NGUONG') && anhEm.has(chu0));
      if (!dungCho) ra[4].loi.push(`${x.id}: câu ${x.cau} thuộc ${chu0 || '(ngoài hồ sơ)'}, không nằm trên đường đi của ${x.nut}${x.loai === BO_QUA ? ' (BỎ QUA phải ghi ở đúng nút của câu)' : ''}`);
      if (x.loai === BO_QUA) continue;
      const cs = chuanSo(chu); const csThuong = cs.toLowerCase();
      if (!cs.includes(chuanSo(x.trich))) ra[4].loi.push(`${x.id}: trích không nguyên văn câu ${x.cau} — "${ngan(x.trich)}"`);
      if (x.lop !== nNguon.lop) ra[4].loi.push(`${x.id}: lop ${x.lop} khác nút nguồn (${nNguon.lop})`);
      if (x.nguon !== nNguon.nguon) ra[4].loi.push(`${x.id}: nguon "${ngan(String(x.nguon))}" khác nút nguồn "${ngan(String(nNguon.nguon))}"`);
      for (const d of x.duKien) if (!csThuong.includes(chuanSo(d).toLowerCase())) ra[4].loi.push(`${x.id}: dữ kiện "${d}" không có trong chữ câu ${x.cau} (chỉ rút từ chữ luật)`);
      for (const d of [...(x.den || []), ...(x.voi || [])]) if (!coThat(d)) ra[4].loi.push(`${x.id}: nút ${d} không có trong kho luật`);
    }
  }
  if (cong.includes(5)) {
    for (const x of R) {
      const chu = /^tb:/.test(x.cau) ? null : L.chuCau(x.cau);
      if (chu === null) continue; // id câu hỏng đã đỏ ở cổng 4
      ra[5].soKiem += 1;
      if (vanTay(chu) !== x.van) ra[5].loi.push(`${x.id}: vân tay lệch câu ${x.cau} (luật đổi chữ) — dựng lại: node scripts/ho-so-ma/cong.mjs --dinh-cau '${x.cau}' rồi tách lại vấn đề của ${x.nut}`);
    }
  }
  return { khuon: kho.loi, soBanGhi: kho.banGhi.length, phamVi: pv.map((p) => p.goc), cong: Object.fromEntries(cong.map((k) => [k, ra[k]])) };
}

/** Chữ câu, vân tay hiện hành và mọi bản ghi dính câu. */
export function dinhCau(cauId, { luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH } = {}) {
  const L = napLuatCong(luat);
  const chu = L.chuCau(cauId);
  return { cau: cauId, chu, van: chu === null ? null : vanTay(chu), banGhi: kiemKhoHoSo(hoSo).banGhi.filter((x) => x.cau === cauId).map((x) => ({ id: x.id, tep: x._tep, dong: x._dong, van: x.van, khop: chu !== null && x.van === vanTay(chu) })) };
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const ds = []; a.forEach((x, i) => { if (x === k && a[i + 1]) ds.push(a[i + 1]); }); return ds; };
  const luat = path.resolve(lay('--luat')[0] || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so')[0] || G.HO_SO_MAC_DINH);
  if (lay('--dinh-cau').length) { console.log(JSON.stringify(dinhCau(lay('--dinh-cau')[0], { luat, hoSo }), null, 2)); return; }
  const cong = lay('--cong')[0] ? lay('--cong')[0].split(',').map(Number) : [1, 2, 3, 4, 5];
  const r = chayCong({ luat, hoSo, phamVi: lay('--pham-vi'), chiTrong: a.includes('--chi-trong'), cong });
  let do_ = r.khuon.length ? 1 : 0;
  console.log(`${r.khuon.length ? 'FAIL' : 'PASS'} khuôn: ${r.soBanGhi} bản ghi, ${r.khuon.length} lỗi`);
  for (const l of r.khuon.slice(0, 30)) console.log(`  ✗ ${l}`);
  const nhan = r.phamVi.length ? `phạm vi ${r.phamVi.join(', ')}${a.includes('--chi-trong') ? ' (chỉ trong)' : ''}` : 'mọi bản ghi';
  for (const [k, c] of Object.entries(r.cong)) {
    if (!r.phamVi.length && Number(k) <= 3) { console.log(`---- cổng ${k} ${c.ten}: cần --pham-vi`); continue; }
    console.log(`${c.loi.length ? 'FAIL' : 'PASS'} cổng ${k} ${c.ten} — ${nhan}: ${c.soKiem} mục kiểm, ${c.loi.length} lỗi${c.canhBao?.length ? `, ${c.canhBao.length} cảnh báo` : ''}`);
    for (const l of c.loi.slice(0, 40)) console.log(`  ✗ ${l}`);
    for (const l of (c.canhBao || []).slice(0, 20)) console.log(`  ! ${l}`);
    if (c.loi.length > 40) console.log(`  … còn ${c.loi.length - 40} lỗi`);
    if (c.loi.length) do_ = 1;
  }
  process.exit(do_);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
