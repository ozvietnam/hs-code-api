#!/usr/bin/env node
// scripts/ho-so-ma/goi-chuong.mjs — M-82 (#2483, ADR-0011 mục 2.1): dựng gói bậc 2 (Chương 2 số) mỏng trên nền goi-nhom.mjs + lib/do-thi/phai-doc.js + lib/tim-cgct.js.
// Gồm: quy tắc chung GIR, chú giải Phần, chú giải Chương, chú giải tổng quát (:kq:), tên nguyên văn mọi nhóm 4 số trong chương,
// cạnh loại trừ ra/vào của Chương, và nhóm/chương cạnh tranh do timCgct tìm (không dựng máy tìm mới, không đọc tb:/wco: hay dữ liệu khách).
//   node scripts/ho-so-ma/goi-chuong.mjs --chuong 94 [--luat data/luat-goc] [--top-k-canh-tranh 10] [--tat-canh-tranh-tim-thay] [--out <tep.json>] [--tom-tat]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, vanTay } from './cong.mjs';
import {
  TOP_K_CANH_TRANH_MAC_DINH,
  lietKeNhom4,
  layPhaiDoc,
  layChiMucCau,
  dinhDangMucLuatNen,
  layNenUngVien,
  timCgctCoDem,
} from './goi-nhom.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
if (!process.env.HS_DATA_DIR) {
  process.env.HS_DATA_DIR = path.join(REPO_ROOT, 'data');
}

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');
const { CHUONG_SANG_PHAN } = require('../../lib/do-thi/dan-chieu.js');
const { tachTu, xayChiMuc: xayChiMucTimCgct } = require('../../lib/tim-cgct.js');

const LOAI_CANH_GOI = new Set(['LOAI_SANG', 'PHAN_VE', 'DINH_NGHIA']);
const TRAN_CGCT_MOI_TRUY_VAN = 3;
const TRAN_CGCT_MOI_UNG_VIEN = 8;
const TRAN_NGUON_TIM_MUC = 3;

const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

/** Chuẩn hoá mã chương 2 chữ số ("94", "chuong:94", "bieu:94" -> "94"). */
export function chuanChuong2(input) {
  const s = String(input ?? '').trim().replace(/^(?:chuong|bieu):/i, '').replace(/\s+/g, '');
  if (!/^\d{1,2}$/.test(s)) {
    throw new Error(`Mã chương 2 số không hợp lệ: "${input}"`);
  }
  const ch = s.padStart(2, '0');
  const so = Number(ch);
  if (!Number.isInteger(so) || so < 1 || so > 97 || so === 77) {
    throw new Error(`Mã chương ngoài phạm vi HS 01..97 (trừ 77 dự phòng): "${input}"`);
  }
  return ch;
}

/**
 * Tìm tất định các nhóm/chương cạnh tranh ngoài chương từ tên các nhóm 4 số + câu lá chú giải chương qua `timCgct`.
 * Giữ đúng tinh thần ADR-0010 mục 2: X ngoài chương C là ứng viên khi `timCgct` xếp X trên nhóm đầu tiên thuộc C trong top K,
 * hoặc X đứng đầu (idx === 0) khi không có nhóm nào thuộc C trong top K.
 */
export function timCanhTranhChuong(chuong2, opts = {}) {
  if (opts.tatCanhTranhTimThay === true) return { nhomCanhTranh: [], chuongCanhTranh: [] };
  const ch = chuanChuong2(chuong2);
  const topK = Number.isInteger(opts.topKCanhTranh) && opts.topKCanhTranh > 0
    ? opts.topKCanhTranh
    : TOP_K_CANH_TRANH_MAC_DINH;
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const { cauCoKhoanCon } = layChiMucCau(L);

  const cacNhom = opts.cacNhom || [];
  const mucChuong = opts.mucChuong || [];

  const dsCauHoi = [];
  const seenQ = new Set();
  for (const nh of cacNhom) {
    for (const cid of nh.cauIds || []) {
      if (/^(?:tb|wco):/.test(cid) || seenQ.has(cid)) continue;
      const chu = gon(L.chuCau(cid));
      if (!chu) continue;
      const tok = tachTu(chu);
      if (!tok.coDau.length) continue;
      seenQ.add(cid);
      dsCauHoi.push({ idCau: cid, loaiCau: 'TEN_NHOM', cauHoi: chu, tok });
    }
  }
  for (const m of mucChuong) {
    for (const cid of m.cauIds || []) {
      if (/^(?:tb|wco):/.test(cid) || seenQ.has(cid)) continue;
      if (cauCoKhoanCon.has(cid)) continue;
      const chu = gon(L.chuCau(cid));
      if (!chu) continue;
      const tok = tachTu(chu);
      if (tok.coDau.length < 2) continue;
      seenQ.add(cid);
      dsCauHoi.push({ idCau: cid, loaiCau: 'CHU_GIAI_CHUONG', cauHoi: chu, tok });
    }
  }

  if (!dsCauHoi.length) return { nhomCanhTranh: [], chuongCanhTranh: [] };

  const ungVienTheoMa = new Map();
  for (const q of dsCauHoi) {
    const topNhom = timCgctCoDem(q.cauHoi, topK);
    const idxTrongChuong = topNhom.findIndex((m4) => typeof m4 === 'string' && m4.startsWith(ch));
    const gioiHanIdx = idxTrongChuong >= 0 ? idxTrongChuong : 1;
    for (let idx = 0; idx < Math.min(topNhom.length, gioiHanIdx); idx += 1) {
      const cand4 = topNhom[idx];
      if (!cand4 || cand4.startsWith(ch) || !/^\d{4}$/.test(cand4)) continue;
      const chSo = Number(cand4.slice(0, 2));
      if (!Number.isInteger(chSo) || chSo < 1 || chSo > 97) continue;
      if (!L.cay.theoId.has(`bieu:${cand4}`)) continue;
      const hang = idx + 1;
      const hangChuongXet = idxTrongChuong >= 0 ? idxTrongChuong + 1 : null;
      let hitMap = ungVienTheoMa.get(cand4);
      if (!hitMap) {
        hitMap = new Map();
        ungVienTheoMa.set(cand4, hitMap);
      }
      const prev = hitMap.get(q.idCau);
      if (!prev || hang < prev.hang) {
        hitMap.set(q.idCau, { idCau: q.idCau, cauHoi: q.cauHoi, hang, hangChuongXet, tok: q.tok });
      }
    }
  }

  if (!ungVienTheoMa.size) return { nhomCanhTranh: [], chuongCanhTranh: [] };

  const idxTim = xayChiMucTimCgct();
  const idfMap = idxTim?.idf || new Map();

  const nhomCanhTranh = [];
  for (const [cand4, hitMap] of ungVienTheoMa.entries()) {
    const hits = [...hitMap.values()].sort((a, b) => (a.hang - b.hang) || a.idCau.localeCompare(b.idCau));
    const nguonTim = hits.map(({ idCau, cauHoi, hang, hangChuongXet }) => ({
      idCau,
      cauHoi,
      hang,
      hangChuongXet: hangChuongXet ?? null,
    }));
    const nguonTimGoc = nguonTim.slice(0, TRAN_NGUON_TIM_MUC);
    const nen = layNenUngVien(cand4, luat, L);

    const chuGiaiChuongPhan = nen.chuGiaiChuongPhanGoc.map((cg) => ({
      ...cg,
      cauIds: [...cg.cauIds],
      nguonTim: nguonTimGoc,
    }));

    const cgctPool = nen.dsCgct.some((d) => d.len >= 3)
      ? nen.dsCgct.filter((d) => d.len >= 3)
      : nen.dsCgct.filter((d) => d.len >= 1);
    const mergedCgct = new Map();

    if (cgctPool.length > 0) {
      for (const h of hits) {
        const uCo = [...new Set(h.tok.coDau)];
        const uFl = [...new Set(h.tok.khongDau)];
        const uBi = [...new Set(h.tok.biCoDau)];
        const scored = [];
        for (const d of cgctPool) {
          let s = 0;
          for (const w of uCo) if (d.coSet.has(w)) s += idfMap.get(`A:${w}`) || 1;
          for (const w of uFl) if (d.flSet.has(w)) s += 0.35 * (idfMap.get(`F:${w}`) || 1);
          for (const b of uBi) if (d.biSet.has(b)) s += 1.5 * (idfMap.get(`BA:${b}`) || 1);
          if (s <= 0) continue;
          const norm = 1 / (0.45 + 0.55 * (Math.max(d.len, 5) / nen.avgLenCgct));
          scored.push({ d, diem: s * norm });
        }
        scored.sort((a, b) => (b.diem - a.diem) || a.d.cauId.localeCompare(b.d.cauId));
        for (const { d, diem } of scored.slice(0, TRAN_CGCT_MOI_TRUY_VAN)) {
          let cur = mergedCgct.get(d.cauId);
          if (!cur) {
            cur = { cauId: d.cauId, nut: d.nut, chu: d.chu, diemTotNhat: 0, nguonMap: new Map() };
            mergedCgct.set(d.cauId, cur);
          }
          const diemCoHang = diem * (1 + 0.25 / h.hang);
          if (diemCoHang > cur.diemTotNhat) cur.diemTotNhat = diemCoHang;
          const prevNg = cur.nguonMap.get(h.idCau);
          if (!prevNg || h.hang < prevNg.hang) {
            cur.nguonMap.set(h.idCau, { idCau: h.idCau, cauHoi: h.cauHoi, hang: h.hang });
          }
        }
      }
    }

    const cgctTrung = [...mergedCgct.values()]
      .sort((a, b) => (b.diemTotNhat - a.diemTotNhat) || a.cauId.localeCompare(b.cauId))
      .slice(0, TRAN_CGCT_MOI_UNG_VIEN)
      .map((x) => ({
        cauId: x.cauId,
        nut: x.nut,
        chu: x.chu,
        nguonTim: [...x.nguonMap.values()]
          .sort((a, b) => (a.hang - b.hang) || a.idCau.localeCompare(b.idCau))
          .slice(0, TRAN_NGUON_TIM_MUC),
      }));

    nhomCanhTranh.push({
      nhom: cand4,
      chuong: cand4.slice(0, 2),
      nut: `bieu:${cand4}`,
      ten: nen.tenX,
      hangTotNhat: nguonTim[0].hang,
      soCauHoiTrung: nguonTim.length,
      nguonTim,
      taiLieuPhaiDoc: {
        cauTenNhom: [...nen.cauTenNhom],
        chuGiaiChuongPhan,
        cgctTrung,
      },
    });
  }

  nhomCanhTranh.sort(
    (a, b) => (a.hangTotNhat - b.hangTotNhat)
      || (b.soCauHoiTrung - a.soCauHoiTrung)
      || a.nhom.localeCompare(b.nhom),
  );

  const theoChuong = new Map();
  for (const uv of nhomCanhTranh) {
    let g = theoChuong.get(uv.chuong);
    if (!g) {
      const nutCh = `bieu:${uv.chuong}`;
      g = {
        chuong: uv.chuong,
        nut: `chuong:${uv.chuong}`,
        nutBieu: nutCh,
        ten: gon(L.cay.theoId.get(nutCh)?.ten || L.nut.get(nutCh)?.v || L.nut.get(`chuong:${uv.chuong}`)?.v || ''),
        hangTotNhat: uv.hangTotNhat,
        soCauHoiTrung: 0,
        cacNhomUngVien: [],
      };
      theoChuong.set(uv.chuong, g);
    }
    if (uv.hangTotNhat < g.hangTotNhat) g.hangTotNhat = uv.hangTotNhat;
    g.soCauHoiTrung += uv.soCauHoiTrung;
    g.cacNhomUngVien.push(uv.nhom);
  }
  const chuongCanhTranh = [...theoChuong.values()].sort(
    (a, b) => (a.hangTotNhat - b.hangTotNhat)
      || (b.soCauHoiTrung - a.soCauHoiTrung)
      || a.chuong.localeCompare(b.chuong),
  );

  return { nhomCanhTranh, chuongCanhTranh };
}

/** Dựng gói đọc một lần bậc 2 cho một chương (`goi-chuong@1`). */
export function dungGoiChuong(chuongArg, opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const chuong = chuanChuong2(chuongArg);
  const nutChuong = `chuong:${chuong}`;
  const nutBieu = `bieu:${chuong}`;
  if (!L.nut.has(nutChuong) && !L.cay.theoId.has(nutBieu)) {
    throw new Error(`Không tìm thấy Chương ${chuong} trong kho luật gốc`);
  }

  const { theoNut } = layChiMucCau(L);
  const phan = CHUONG_SANG_PHAN[chuong] || null;
  const ten = gon(L.cay.theoId.get(nutBieu)?.ten || L.nut.get(nutBieu)?.v || L.nut.get(nutChuong)?.v || '');
  const tenPhan = phan ? gon(L.nut.get(`phan:${phan}`)?.v || '') : null;

  const pdBieu = layPhaiDoc(nutBieu, luat);
  const pdChuong = layPhaiDoc(nutChuong, luat);

  const buocCua = (pd, tenBuoc) => pd?.trinhTu?.find((b) => b.buoc === tenBuoc)?.muc || [];
  const phanTatCa = buocCua(pdBieu, 'CHU_GIAI_PHAN').map((m) => dinhDangMucLuatNen(m, theoNut));
  const chuongTatCa = buocCua(pdBieu, 'CHU_GIAI_CHUONG').map((m) => dinhDangMucLuatNen(m, theoNut));
  const phanChuong = buocCua(pdBieu, 'CHU_GIAI_PHAN_CHUONG').map((m) => dinhDangMucLuatNen(m, theoNut));
  const cgpnChuong = buocCua(pdBieu, 'CHU_GIAI_PHAN_NHOM').map((m) => dinhDangMucLuatNen(m, theoNut));
  const senChuong = buocCua(pdBieu, 'SEN').map((m) => dinhDangMucLuatNen(m, theoNut));

  // Tách tường minh chú giải pháp lý (:cg:, :cgbs:) và chú giải tổng quát (:kq:) theo ADR-0011 mục 2.1
  const laKhaiQuat = (m) => /:kq(?::|$)/.test(m.nut || m.id || '');
  const luatNen = {
    phanCg: phanTatCa.filter((m) => !laKhaiQuat(m)),
    phanKq: phanTatCa.filter((m) => laKhaiQuat(m)),
    chuongCg: chuongTatCa.filter((m) => !laKhaiQuat(m)),
    chuongKq: chuongTatCa.filter((m) => laKhaiQuat(m)),
    phanChuong,
    cgpnChuong,
    senChuong,
  };

  // Quy tắc chung GIR 1–6 từ data/luat-goc/gir.jsonl để người đọc và người phản biện dẫn nguyên văn
  const gir = [...L.nut.entries()]
    .filter(([nid]) => nid.startsWith('gir:'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nid, info]) => ({
      id: nid,
      nut: nid,
      lop: info.lop,
      trich: info.v,
      nguon: info.nguon,
      cauIds: [...(theoNut.get(nid) || [])],
    }));

  // Tên nguyên văn mọi nhóm 4 số trong chương
  const dsMaNhom = lietKeNhom4({ chuong, luat, L });
  const cacNhom = dsMaNhom.map((ma4) => {
    const id = `bieu:${ma4}`;
    const node = L.cay.theoId.get(id);
    return {
      nhom: ma4,
      nut: id,
      ten: node?.ten || L.nut.get(id)?.v || '',
      cauIds: [...(theoNut.get(id) || [])],
    };
  });

  // Cạnh loại trừ ra/vào cấp Phần & Chương (quét đầy đủ mọi nút con chuong:<ch>:* và phan:<phan>:*)
  const loaiTruRa = [];
  const loaiTruVao = [];
  const seenRa = new Set();
  const seenVao = new Set();
  const pushEdge = (arr, seen, item) => {
    const key = `${item.cauId || item.id || ''}|${item.tuNut || ''}|${item.den || item.nut || ''}|${item.loai || item.dang || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    arr.push(item);
  };

  for (const pd of [pdBieu, pdChuong]) {
    for (const m of buocCua(pd, 'LOAI_TRU_RA')) {
      if (/^(?:tb|wco):/.test(m.id || '') || /^(?:tb|wco):/.test(m.nut || '')) continue;
      pushEdge(loaiTruRa, seenRa, {
        id: m.id,
        den: m.nut,
        ten: m.ten || null,
        lop: m.lop || null,
        trich: m.trich || '',
        dieuKien: m.dieuKien || null,
        nguon: m.nguon || null,
        cauIds: [...(theoNut.get(m.id) || [])],
      });
    }
    for (const m of buocCua(pd, 'NHAC_TOI')) {
      if (/^(?:tb|wco):/.test(m.cauDan || m.tuNut || '') || /^(?:tb|wco):/.test(m.den || '')) continue;
      pushEdge(loaiTruRa, seenRa, {
        cauId: m.cauDan || null,
        tuNut: m.tuNut || null,
        den: m.den || m.nut,
        dang: m.dang || null,
        ten: m.ten || null,
        lop: m.lop || null,
        trich: m.trich || '',
        cau: m.cau || '',
      });
    }
    for (const m of buocCua(pd, 'LOAI_TRU_VAO')) {
      if (/^(?:tb|wco):/.test(m.id || '') || /^(?:tb|wco):/.test(m.nut || '')) continue;
      pushEdge(loaiTruVao, seenVao, {
        id: m.id,
        tuNut: m.id,
        den: m.nut,
        ten: m.ten || null,
        lop: m.lop || null,
        trich: m.trich || '',
        dieuKien: m.dieuKien || null,
        cauIds: [...(theoNut.get(m.id) || [])],
      });
    }
    for (const m of buocCua(pd, 'DUOC_NHAC')) {
      if (/^(?:tb|wco):/.test(m.cauDan || m.tuNut || '') || /^(?:tb|wco):/.test(m.den || '')) continue;
      pushEdge(loaiTruVao, seenVao, {
        cauId: m.cauDan || null,
        tuNut: m.tuNut || null,
        den: m.den || m.nut,
        dang: m.dang || null,
        ten: m.ten || null,
        lop: m.lop || null,
        trich: m.trich || '',
        cau: m.cau || '',
      });
    }
  }

  const nutPhamViChuong = new Set([nutChuong, nutBieu]);
  if (phan) nutPhamViChuong.add(`phan:${phan}`);
  for (const nid of L.nut.keys()) {
    if (nid.startsWith(`chuong:${chuong}:`) || (phan && nid.startsWith(`phan:${phan}:`))) {
      nutPhamViChuong.add(nid);
    }
  }
  for (const nh of cacNhom) nutPhamViChuong.add(nh.nut);

  for (const nid of nutPhamViChuong) {
    for (const cid of theoNut.get(nid) || []) {
      for (const e of L.canhTheoTu.get(cid) || []) {
        if (/^(?:tb|wco):/.test(e.tu || '') || /^(?:tb|wco):/.test(e.den || '')) continue;
        if (e.trangThai !== 'CHUA_RO' && !LOAI_CANH_GOI.has(e.loai)) continue;
        if (e.trangThai === 'CHUA_RO' && !/LOAI_SANG|PHAN_VE|DINH_NGHIA/.test(e.vi || '')) continue;
        pushEdge(loaiTruRa, seenRa, {
          cauId: e.tu,
          tuNut: nid,
          den: e.den,
          loai: e.loai,
          trangThai: e.trangThai,
          trich: e.trich || '',
          cau: gon(L.chuCau(e.tu)),
        });
      }
    }
    for (const e of L.canhTheoDen.get(nid) || []) {
      if (/^(?:tb|wco):/.test(e.tu || '') || /^(?:tb|wco):/.test(e.den || '')) continue;
      if (e.trangThai !== 'CHUA_RO' && !LOAI_CANH_GOI.has(e.loai)) continue;
      if (e.trangThai === 'CHUA_RO' && !/LOAI_SANG|PHAN_VE|DINH_NGHIA/.test(e.vi || '')) continue;
      const tuNut = G.chuCuaCau(e.tu) || L.cau.get(e.tu)?.nut || null;
      if (tuNut && nutPhamViChuong.has(tuNut)) continue;
      pushEdge(loaiTruVao, seenVao, {
        cauId: e.tu,
        tuNut,
        den: e.den,
        loai: e.loai,
        trangThai: e.trangThai,
        trich: e.trich || '',
        cau: gon(L.chuCau(e.tu)),
      });
    }
  }

  // Nhóm & Chương cạnh tranh tìm thấy qua timCgct
  const { nhomCanhTranh: canhTranhTimThay, chuongCanhTranh } = timCanhTranhChuong(chuong, {
    luat,
    L,
    cacNhom,
    mucChuong: [...luatNen.chuongCg, ...luatNen.chuongKq],
    topKCanhTranh: opts.topKCanhTranh,
    tatCanhTranhTimThay: opts.tatCanhTranhTimThay,
  });

  // Toàn bộ câu luật có thật trong gói kèm sha256
  const cauIdSet = new Set();
  for (const cid of theoNut.get(nutBieu) || []) cauIdSet.add(cid);
  for (const cid of theoNut.get(nutChuong) || []) cauIdSet.add(cid);
  if (phan) {
    for (const cid of theoNut.get(`phan:${phan}`) || []) cauIdSet.add(cid);
  }
  for (const g of gir) for (const cid of g.cauIds) cauIdSet.add(cid);
  for (const nh of cacNhom) for (const cid of nh.cauIds) cauIdSet.add(cid);
  for (const group of Object.values(luatNen)) {
    for (const m of group) for (const cid of m.cauIds || []) cauIdSet.add(cid);
  }
  for (const edge of [...loaiTruRa, ...loaiTruVao]) {
    if (edge.cauId && L.cau.has(edge.cauId)) cauIdSet.add(edge.cauId);
    for (const cid of edge.cauIds || []) if (L.cau.has(cid)) cauIdSet.add(cid);
  }
  for (const uv of canhTranhTimThay) {
    const tl = uv.taiLieuPhaiDoc;
    if (!tl) continue;
    for (const cid of tl.cauTenNhom || []) if (L.cau.has(cid)) cauIdSet.add(cid);
    for (const cg of tl.chuGiaiChuongPhan || []) {
      for (const cid of cg.cauIds || []) if (L.cau.has(cid)) cauIdSet.add(cid);
    }
    for (const ct of tl.cgctTrung || []) {
      if (ct.cauId && L.cau.has(ct.cauId)) cauIdSet.add(ct.cauId);
    }
  }
  for (const chCt of chuongCanhTranh) {
    for (const cid of theoNut.get(chCt.nutBieu) || []) if (L.cau.has(cid)) cauIdSet.add(cid);
  }

  const cauTrongGoi = [...cauIdSet]
    .filter((cid) => !/^(?:tb|wco):/.test(cid) && L.cau.has(cid))
    .sort()
    .map((cid) => {
      const metaCau = L.cau.get(cid);
      const chu = L.chuCau(cid);
      return {
        id: cid,
        nut: metaCau.nut,
        chu,
        vanTay: vanTay(chu),
        ...(metaCau.dan ? { dan: metaCau.dan } : {}),
      };
    });

  const vanTayGoi = sha256(cauTrongGoi.map((c) => `${c.id}:${c.vanTay}`).join('\n'));

  return {
    khuon: 'goi-chuong@1',
    chuong,
    nut: nutChuong,
    nutBieu,
    phan,
    tenPhan,
    ten,
    vanTayGoi,
    gir,
    cacNhom,
    luatNen,
    loaiTru: { ra: loaiTruRa, vao: loaiTruVao },
    chuongCanhTranh,
    canhTranhTimThay,
    cauTrongGoi,
  };
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const chuongArg = lay('--chuong');
  if (!chuongArg) {
    console.error('Thiếu --chuong <2so> (vd: --chuong 94)');
    process.exit(2);
  }
  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const topKCanhTranh = lay('--top-k-canh-tranh') ? Number(lay('--top-k-canh-tranh')) : TOP_K_CANH_TRANH_MAC_DINH;
  const tatCanhTranhTimThay = a.includes('--tat-canh-tranh-tim-thay');

  const t0 = performance.now();
  const goi = dungGoiChuong(chuongArg, { luat, topKCanhTranh, tatCanhTranhTimThay });
  const thoiGianMs = Math.round(performance.now() - t0);
  const out = lay('--out');
  if (out) {
    const outPath = path.resolve(out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(goi, null, 2)}\n`, 'utf8');
  }

  if (a.includes('--tom-tat') || out) {
    const bytes = Buffer.byteLength(JSON.stringify(goi), 'utf8');
    console.log(JSON.stringify({
      khuon: goi.khuon,
      chuong: goi.chuong,
      phan: goi.phan,
      ten: goi.ten,
      soNhom: goi.cacNhom.length,
      cacNhom: goi.cacNhom.map((n) => n.nhom),
      soChuGiaiPhan: goi.luatNen.phanCg.length + goi.luatNen.phanKq.length,
      soChuGiaiChuongCg: goi.luatNen.chuongCg.length,
      soChuGiaiChuongKq: goi.luatNen.chuongKq.length,
      loaiTruRa: goi.loaiTru.ra.length,
      loaiTruVao: goi.loaiTru.vao.length,
      soChuongCanhTranh: goi.chuongCanhTranh.length,
      chuongCanhTranh: goi.chuongCanhTranh.map((c) => c.chuong),
      soNhomCanhTranhTimThay: goi.canhTranhTimThay.length,
      soCauTrongGoi: goi.cauTrongGoi.length,
      bytes,
      thoiGianMs,
      vanTayGoi: goi.vanTayGoi,
      ...(out ? { out: path.resolve(out) } : {}),
    }, null, 2));
  } else {
    console.log(JSON.stringify(goi, null, 2));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
