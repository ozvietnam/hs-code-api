#!/usr/bin/env node
// scripts/ho-so-ma/goi-nhom.mjs — M-81 (#2410, ADR-0008 + ADR-0010): dựng gói đọc trọn nhóm 4 số từ kho luật công khai + hồ sơ sẵn có + ứng viên cạnh tranh tìm thấy qua máy tìm.
// Dùng lại lib/tim-cgct.js + lib/do-thi/phai-doc.js (bỏ WCO, PHAN_BIET, PHAN_BIET_NGHIA; tuyệt đối không đọc tiền lệ tb: hay dữ liệu khách).
//   node scripts/ho-so-ma/goi-nhom.mjs --nhom 8543 [--luat data/luat-goc] [--ho-so data/ho-so-ma] [--canh-tranh docs/mong/the/M-81-canh-tranh.md] [--top-k-canh-tranh 10] [--tat-canh-tranh-tim-thay] [--max-bytes 184320] [--out <tep.json>] [--tom-tat]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, vanTay } from './cong.mjs';
import { napBieuMeta, boGachTen } from './bang-anh-em.mjs';
import { kiemKhoHoSo, LOAI_DIEU_KIEN } from './khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');
const { phaiDoc } = require('../../lib/do-thi/phai-doc.js');
const { CHUONG_SANG_PHAN } = require('../../lib/do-thi/dan-chieu.js');
const {
  timCgct,
  tachTu,
  xayChiMuc: xayChiMucTimCgct,
  trichMaVaKhoang,
} = require('../../lib/tim-cgct.js');

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_CANH_TRANH_MD = path.join(REPO_ROOT, 'docs', 'mong', 'the', 'M-81-canh-tranh.md');
export const MAX_BYTES_MAC_DINH = 180 * 1024;
export const TOP_K_CANH_TRANH_MAC_DINH = 10;

const BUOC_GIU = new Set([
  'TEN',
  'CHU_GIAI_PHAN',
  'CHU_GIAI_CHUONG',
  'CHU_GIAI_PHAN_CHUONG',
  'LOAI_TRU_RA',
  'LOAI_TRU_VAO',
  'NHAC_TOI',
  'DUOC_NHAC',
  'CHU_GIAI_NHOM',
  'CHU_GIAI_PHAN_NHOM',
  'SEN',
]);
const BUOC_BO = new Set(['WCO', 'PHAN_BIET', 'PHAN_BIET_NGHIA']);
const LOAI_CANH_GOI = new Set(['LOAI_SANG', 'PHAN_VE', 'DINH_NGHIA']);

const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

const _chiMucCauCache = new WeakMap();
const _metaCache = new WeakMap();
const _phaiDocCache = new Map();
const _timCgctCache = new Map();
const _ungVienNenCache = new WeakMap();
const _canhTranhCache = new WeakMap();

const BUOC_CHU_GIAI_UNG_VIEN = ['CHU_GIAI_PHAN', 'CHU_GIAI_CHUONG', 'CHU_GIAI_PHAN_CHUONG', 'CHU_GIAI_PHAN_NHOM'];
const TRAN_CGCT_MOI_TRUY_VAN = 3;
const TRAN_CGCT_MOI_UNG_VIEN = 12;
const TRAN_NGUON_TIM_MUC = 3;

export function layPhaiDoc(nhom4, luat = G.LUAT_MAC_DINH) {
  const key = `${path.resolve(luat)}\0${nhom4}`;
  if (_phaiDocCache.has(key)) return _phaiDocCache.get(key);
  const pd = phaiDoc(nhom4, { thuMuc: luat, dayDu: true });
  _phaiDocCache.set(key, pd);
  return pd;
}

export function timCgctCoDem(cauGon, topK) {
  const key = `${topK}\0${cauGon}`;
  if (_timCgctCache.has(key)) return _timCgctCache.get(key);
  const kq = timCgct(cauGon, '', { limit: topK });
  const ds = Array.isArray(kq?.nhom) ? kq.nhom.slice(0, topK) : [];
  _timCgctCache.set(key, ds);
  return ds;
}

function nhacToiNhom(txt, ma4) {
  if (!txt) return false;
  const mk = trichMaVaKhoang(txt);
  return mk.don.includes(ma4) || mk.khoang.includes(ma4);
}

export function layChiMucCau(L) {
  if (_chiMucCauCache.has(L)) return _chiMucCauCache.get(L);
  const theoNut = new Map();
  const theoChu = new Map();
  const cauCoKhoanCon = new Set();
  for (const [cauId, c] of L.cau.entries()) {
    if (!c || /^tb:/.test(cauId) || /^wco:/.test(cauId)) continue;
    if (c.dan) cauCoKhoanCon.add(c.dan);
    if (!theoNut.has(c.nut)) theoNut.set(c.nut, []);
    theoNut.get(c.nut).push(cauId);
    const chu = G.chuCuaCau(cauId);
    if (chu) {
      if (!theoChu.has(chu)) theoChu.set(chu, []);
      theoChu.get(chu).push(cauId);
    }
  }
  for (const arr of theoNut.values()) arr.sort();
  for (const arr of theoChu.values()) arr.sort();
  const nutCoCon = new Set();
  for (const n of L.nut.values()) {
    if (n?.cha) nutCoCon.add(n.cha);
  }
  for (const [chaId, conList] of (L.cay?.con?.entries?.() || [])) {
    if (Array.isArray(conList) && conList.length > 0) nutCoCon.add(chaId);
  }
  for (const nid of nutCoCon) {
    const ds = theoNut.get(nid);
    if (ds && ds.length === 1) cauCoKhoanCon.add(ds[0]);
  }
  const idx = { theoNut, theoChu, cauCoKhoanCon };
  _chiMucCauCache.set(L, idx);
  return idx;
}

function layBieuMeta(L, explicitMeta = null) {
  if (explicitMeta) return explicitMeta;
  if (_metaCache.has(L)) return _metaCache.get(L);
  const meta = napBieuMeta(L.thuMuc);
  _metaCache.set(L, meta);
  return meta;
}

/** Chuẩn hoá mã nhóm 4 số từ "85.43", "8543", hoặc "bieu:8543" -> "8543". */
export function chuanNhom4(input) {
  const s = String(input ?? '').trim().replace(/^bieu:/i, '').replace(/[.\s]/g, '');
  if (!/^\d{4}$/.test(s)) {
    throw new Error(`Mã nhóm 4 số không hợp lệ: "${input}"`);
  }
  return s;
}

/** Đọc docs/mong/the/M-81-canh-tranh.md (mục 3 CANH_TRANH từng nút + mục 4 CANH_TRANH_CHUNG). Nếu chưa có tệp -> trả về rỗng. */
export function docBangCanhTranhMd(mdPath = DEFAULT_CANH_TRANH_MD, { strict = false } = {}) {
  const byNut = new Map();
  const byNhom = new Map();
  const canhTranhChung = new Map();
  const canhBao = [];
  if (!mdPath || !fs.existsSync(mdPath)) {
    return { coTep: false, byNut, byNhom, canhTranhChung, canhBao };
  }

  const lines = fs.readFileSync(mdPath, 'utf8').split(/\r?\n/);
  let sec = 0;
  let inJsonl = false;
  let curHeader = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^##\s+3\./.test(line)) { sec = 3; inJsonl = false; continue; }
    if (/^##\s+4\./.test(line)) { sec = 4; inJsonl = false; curHeader = null; continue; }
    if (/^##\s+[5-9]\./.test(line)) { sec = 5; inJsonl = false; curHeader = null; continue; }

    if (sec === 3) {
      const mh = /^###\s+([0-9.]+)\s+[—-]+\s+n8\s*=\s*(\d+)/.exec(line);
      if (mh) {
        curHeader = { ma: mh[1], n8: Number(mh[2]) };
        continue;
      }
    }

    if (/^```jsonl\s*$/i.test(line.trim())) {
      inJsonl = true;
      continue;
    }
    if (inJsonl && /^```\s*$/.test(line.trim())) {
      inJsonl = false;
      continue;
    }
    if (!inJsonl || !line.trim()) continue;
    if (sec !== 3 && sec !== 4) continue;

    let obj;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      const msg = `${mdPath}:${i + 1}: dòng JSONL không hợp lệ (${err.message})`;
      if (strict) throw new Error(msg);
      canhBao.push(msg);
      continue;
    }

    if (sec === 3 && obj?.loai === 'CANH_TRANH' && obj.nut) {
      const rec = { ...obj, ...(curHeader ? { mucMa: curHeader.ma } : {}) };
      byNut.set(obj.nut, rec);
      const m4 = /^bieu:(\d{4})/.exec(obj.nut)?.[1];
      if (m4) {
        if (!byNhom.has(m4)) byNhom.set(m4, []);
        byNhom.get(m4).push(rec);
      }
    } else if (sec === 4 && obj?.loai === 'CANH_TRANH_CHUNG' && obj.pham) {
      canhTranhChung.set(obj.pham, obj);
    }
  }

  return { coTep: true, byNut, byNhom, canhTranhChung, canhBao };
}

/** Thu thập toàn bộ cây con đệ quy dưới `bieu:<nhom4>` (gồm cả nút trung gian khongMa và suyRa/cungDong). */
export function thuThapCayNhom(nhom4, L, bieuMeta = null) {
  const ma4 = chuanNhom4(nhom4);
  const nutGoc = `bieu:${ma4}`;
  if (!L.cay.theoId.has(nutGoc)) {
    throw new Error(`Không tìm thấy nhóm ${nutGoc} trong kho biểu thuế`);
  }
  const metaMap = layBieuMeta(L, bieuMeta);
  const { theoNut } = layChiMucCau(L);
  const cayBieu = [];
  const nhomAnhEm = [];
  const daTham = new Set();

  const di = (id) => {
    if (daTham.has(id)) return;
    daTham.add(id);
    const cayNode = L.cay.theoId.get(id);
    const meta = metaMap.get(id);
    const ten = cayNode?.ten || meta?.nguyenVan || '';
    const ma = id.startsWith('bieu:') ? id.slice(5) : id;
    const so = ma.replace(/:td\d+$/, '');
    const children = G.conCua(id, L.cay);

    cayBieu.push({
      id,
      ma,
      so,
      cap: cayNode?.cap || meta?.cap || null,
      gach: cayNode?.gach ?? null,
      cha: cayNode?.cha ?? meta?.cha ?? null,
      ten,
      tenSach: boGachTen(ten),
      khongMa: Boolean(meta?.khongMa),
      loaiKhac: Boolean(meta?.loaiKhac && !meta?.loaiKhacCoVe),
      loaiKhacCoVe: Boolean(meta?.loaiKhacCoVe),
      suyRa: Boolean(meta?.suyRa),
      cungDong: meta?.cungDong ?? null,
      phamViTru: meta?.phamViTru ? [...meta.phamViTru] : [],
      laLa: children.length === 0,
      cauIds: [...(theoNut.get(id) || [])],
    });

    if (children.length > 0) {
      nhomAnhEm.push({
        cha: id,
        tenCha: ten,
        gachCha: cayNode?.gach ?? null,
        con: children.map((cid) => {
          const cNode = L.cay.theoId.get(cid);
          const cMeta = metaMap.get(cid);
          const cTen = cNode?.ten || cMeta?.nguyenVan || '';
          return {
            id: cid,
            ten: cTen,
            tenSach: boGachTen(cTen),
            loaiKhac: Boolean(cMeta?.loaiKhac && !cMeta?.loaiKhacCoVe),
            loaiKhacCoVe: Boolean(cMeta?.loaiKhacCoVe),
            khongMa: Boolean(cMeta?.khongMa),
            suyRa: Boolean(cMeta?.suyRa),
            cungDong: cMeta?.cungDong ?? null,
          };
        }),
      });
    }

    for (const cid of children) di(cid);
  };

  di(nutGoc);
  return { cayBieu, nhomAnhEm };
}

export function dinhDangMucLuatNen(m, theoNut) {
  const nutId = m.nut || m.id;
  return {
    id: m.id,
    nut: nutId,
    lop: m.lop,
    trang: m.trang ?? null,
    ten: m.ten ?? nutId,
    trich: m.trich ?? '',
    nguon: m.nguon ?? null,
    cauIds: [...(theoNut.get(m.id) || theoNut.get(nutId) || [])],
  };
}

export function layNenUngVien(ma4, luat, L) {
  let theoL = _ungVienNenCache.get(L);
  if (!theoL) {
    theoL = new Map();
    _ungVienNenCache.set(L, theoL);
  }
  const cacheKey = `${path.resolve(luat)}\0${ma4}`;
  if (theoL.has(cacheKey)) return theoL.get(cacheKey);

  const { theoNut } = layChiMucCau(L);
  const pdX = layPhaiDoc(ma4, luat);
  const chuongX = pdX?.chuong || ma4.slice(0, 2);
  const phanX = pdX?.phan || CHUONG_SANG_PHAN[chuongX] || null;
  const nutBieu = `bieu:${ma4}`;
  const tenX = gon(pdX?.ten || L.cay.theoId.get(nutBieu)?.ten || L.nut.get(nutBieu)?.v || '');
  const cauTenNhom = (theoNut.get(nutBieu) || []).filter((cid) => !/^(?:tb|wco):/.test(cid) && L.cau.has(cid));

  const trinhTuMap = new Map();
  for (const b of pdX?.trinhTu || []) {
    trinhTuMap.set(b.buoc, b.muc || []);
  }

  // Chỉ nhận chú giải pháp lý (:cg:, :cgbs:, :cgpn:) thuộc chính Phần/Chương/Phân nhóm của ứng viên X; bỏ :kq: và chú giải ngoại chương
  const laChuGiaiPhapLyCuaUngVien = (nutId) => {
    if (!nutId || /^(?:tb|wco):/.test(nutId)) return false;
    if (/:kq(?::|$)/.test(nutId)) return false;
    if (nutId.startsWith(`pn:${ma4}`)) return true;
    if (!/:(?:cg|cgbs|cgpn)(?::|$)/.test(nutId)) return false;
    return (
      nutId.startsWith(`chuong:${chuongX}:`)
      || (phanX ? nutId.startsWith(`phan:${phanX}:`) : false)
    );
  };

  // Các nút chú giải Phần/Chương/Phân nhóm của chính X có cạnh DUOC_NHAC trỏ về nhóm ứng viên X
  const duocNhacNutSet = new Set();
  for (const m of trinhTuMap.get('DUOC_NHAC') || []) {
    const srcNut = m.tuNut || m.id || '';
    if (!laChuGiaiPhapLyCuaUngVien(srcNut)) continue;
    const den = String(m.den || m.nut || '');
    if (den === nutBieu || den.startsWith(`${nutBieu}`) || nhacToiNhom(m.trich || m.cau || '', ma4)) {
      duocNhacNutSet.add(srcNut);
    }
  }

  const chuGiaiChuongPhanGoc = [];
  const seenCgNut = new Set();
  const themMucChuGiai = (id, nutId, lop, trich) => {
    if (!laChuGiaiPhapLyCuaUngVien(nutId) || seenCgNut.has(nutId)) return;
    const cauIds = (theoNut.get(id) || theoNut.get(nutId) || [])
      .filter((cid) => !/^(?:tb|wco):/.test(cid) && L.cau.has(cid));
    if (!cauIds.length) return;
    seenCgNut.add(nutId);
    chuGiaiChuongPhanGoc.push({
      id: id || nutId,
      nut: nutId,
      lop: lop || L.nut.get(nutId)?.lop || 'LUAT',
      trich: gon(trich || L.nut.get(nutId)?.v || ''),
      cauIds,
    });
  };

  for (const buocTen of BUOC_CHU_GIAI_UNG_VIEN) {
    const mucList = trinhTuMap.get(buocTen) || [];
    if (!mucList.length) continue;
    const directSet = new Set();
    for (const m of mucList) {
      const nutId = m.nut || m.id || '';
      if (!laChuGiaiPhapLyCuaUngVien(nutId)) continue;
      if (
        nutId.startsWith(`pn:${ma4}`)
        || duocNhacNutSet.has(nutId)
        || nhacToiNhom(m.trich || '', ma4)
      ) {
        directSet.add(nutId);
      }
    }
    if (!directSet.size) continue;

    for (const m of mucList) {
      const nutId = m.nut || m.id || '';
      if (!laChuGiaiPhapLyCuaUngVien(nutId)) continue;
      let chon = directSet.has(nutId);
      if (!chon) {
        for (const hitId of directSet) {
          // Kéo toàn bộ khoản con khi điều khoản cha trúng (vd chuong:85:cg:6 -> chuong:85:cg:6:a, 6:b)
          if (nutId.startsWith(`${hitId}:`)) { chon = true; break; }
          // Kéo câu dẫn điều khoản cha trực tiếp khi khoản con trúng (vd chuong:85:cg:6:a -> chuong:85:cg:6)
          if (hitId.startsWith(`${nutId}:`) && /:(?:cg|cgbs|cgpn)(?::[^:]+)?$/.test(nutId)) { chon = true; break; }
        }
      }
      if (chon) themMucChuGiai(m.id, nutId, m.lop, m.trich);
    }
  }

  for (const srcNut of [...duocNhacNutSet].sort()) {
    if (seenCgNut.has(srcNut) || !L.nut.has(srcNut)) continue;
    const parts = srcNut.split(':');
    if (parts.length >= 4 && (parts[2] === 'cg' || parts[2] === 'cgbs' || parts[2] === 'cgpn')) {
      const chaCg = parts.slice(0, 4).join(':');
      if (chaCg !== srcNut && L.nut.has(chaCg)) {
        themMucChuGiai(chaCg, chaCg, L.nut.get(chaCg)?.lop, L.nut.get(chaCg)?.v);
      }
    }
    themMucChuGiai(srcNut, srcNut, L.nut.get(srcNut)?.lop, L.nut.get(srcNut)?.v);
  }

  // Các câu CGCT của nhóm ứng viên X (nhom:X:ct:*#*)
  const dsCgct = [];
  const seenCgctCau = new Set();
  const nhomCtMuc = trinhTuMap.get('CHU_GIAI_NHOM') || [];
  const pushCgctCau = (cid) => {
    if (!cid || seenCgctCau.has(cid) || /^(?:tb|wco):/.test(cid) || !L.cau.has(cid)) return;
    if (!cid.startsWith(`nhom:${ma4}:ct:`)) return;
    seenCgctCau.add(cid);
    const chu = gon(L.chuCau(cid));
    const tok = tachTu(chu);
    dsCgct.push({
      cauId: cid,
      nut: L.cau.get(cid).nut,
      chu,
      len: tok.coDau.length,
      coSet: new Set(tok.coDau),
      flSet: new Set(tok.khongDau),
      biSet: new Set(tok.biCoDau),
    });
  };
  for (const m of nhomCtMuc) {
    const nutId = m.nut || m.id;
    for (const cid of theoNut.get(m.id) || theoNut.get(nutId) || []) pushCgctCau(cid);
  }
  if (!dsCgct.length) {
    const prefix = `nhom:${ma4}:ct:`;
    for (const [nutId, cids] of theoNut.entries()) {
      if (nutId.startsWith(prefix)) for (const cid of cids) pushCgctCau(cid);
    }
  }
  const avgLenCgct = dsCgct.length
    ? dsCgct.reduce((sum, d) => sum + Math.max(d.len, 1), 0) / dsCgct.length
    : 12;

  const nen = { tenX, cauTenNhom, chuGiaiChuongPhanGoc, dsCgct, avgLenCgct };
  theoL.set(cacheKey, nen);
  return nen;
}

/**
 * Tìm tất định các nhóm 4 số cạnh tranh qua máy tìm `lib/tim-cgct.js` và kéo tài liệu phải đọc qua `phaiDoc` (ADR-0010 mục 2).
 * Chỉ trả về tài liệu bắt buộc đọc kèm nguồn tìm; tuyệt đối không biến thành cạnh hay kết luận phân loại.
 */
export function timCanhTranhTimThay(nhom4HoacNut, opts = {}) {
  if (opts.tatCanhTranhTimThay === true) return [];
  const topK = Number.isInteger(opts.topKCanhTranh) && opts.topKCanhTranh > 0
    ? opts.topKCanhTranh
    : TOP_K_CANH_TRANH_MAC_DINH;
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const nhom4 = chuanNhom4(nhom4HoacNut);

  let cacheTheoL = _canhTranhCache.get(L);
  if (!cacheTheoL) {
    cacheTheoL = new Map();
    _canhTranhCache.set(L, cacheTheoL);
  }
  const cacheKey = `${path.resolve(luat)}\0${nhom4}\0${topK}`;
  if (cacheTheoL.has(cacheKey)) return cacheTheoL.get(cacheKey);

  const bieuMeta = layBieuMeta(L, opts.bieuMeta || null);
  const cayBieu = opts.cayBieu || thuThapCayNhom(nhom4, L, bieuMeta).cayBieu;
  const { theoNut, cauCoKhoanCon } = layChiMucCau(L);
  const nhomCt = opts.luatNen?.nhomCt || (() => {
    const pdSelf = layPhaiDoc(nhom4, luat);
    const muc = pdSelf?.trinhTu?.find((b) => b.buoc === 'CHU_GIAI_NHOM')?.muc || [];
    return muc.map((m) => dinhDangMucLuatNen(m, theoNut));
  })();

  // 1. Tập câu hỏi cho máy tìm: nguyên văn từng dòng biểu có tên (!loaiKhac) và từng câu CGCT lá (bỏ câu dẫn có khoản con trỏ cha/dan theo cấu trúc, 0 regex đoán chữ)
  const dsCauHoi = [];
  const seenQ = new Set();
  for (const n of cayBieu) {
    if (n.loaiKhac) continue;
    for (const cid of n.cauIds || []) {
      if (/^(?:tb|wco):/.test(cid) || seenQ.has(cid)) continue;
      const chu = L.chuCau(cid);
      const chuGon = gon(chu);
      if (!chuGon) continue;
      const tok = tachTu(chuGon);
      if (tok.coDau.length < 1) continue;
      seenQ.add(cid);
      dsCauHoi.push({ idCau: cid, loaiCau: 'BIEU', cauHoi: chuGon, tok });
    }
  }
  for (const m of nhomCt) {
    for (const cid of m.cauIds || []) {
      if (/^(?:tb|wco):/.test(cid) || seenQ.has(cid)) continue;
      if (cauCoKhoanCon.has(cid)) continue;
      const chu = L.chuCau(cid);
      const chuGon = gon(chu);
      if (!chuGon) continue;
      const tok = tachTu(chuGon);
      if (tok.coDau.length < 1) continue;
      seenQ.add(cid);
      dsCauHoi.push({ idCau: cid, loaiCau: 'CGCT', cauHoi: chuGon, tok });
    }
  }

  if (!dsCauHoi.length) {
    cacheTheoL.set(cacheKey, []);
    return [];
  }

  // 2. Tiêu chí ADR-0010 mục 2: X là ứng viên của H khi timCgct xếp X TRÊN H; nếu H không có trong top 10 thì chỉ lấy X đứng ĐẦU (idx === 0)
  const ungVienTheoMa = new Map();
  for (const q of dsCauHoi) {
    const topNhom = timCgctCoDem(q.cauHoi, topK);
    const idxH = topNhom.indexOf(nhom4);
    const gioiHanIdx = idxH >= 0 ? idxH : 1;
    for (let idx = 0; idx < Math.min(topNhom.length, gioiHanIdx); idx += 1) {
      const cand4 = topNhom[idx];
      if (!cand4 || cand4 === nhom4 || !/^\d{4}$/.test(cand4)) continue;
      const chSo = Number(cand4.slice(0, 2));
      if (!Number.isInteger(chSo) || chSo < 1 || chSo > 97) continue;
      if (!L.cay.theoId.has(`bieu:${cand4}`)) continue;
      const hang = idx + 1;
      const hangNhomXet = idxH >= 0 ? idxH + 1 : null;
      let hitMap = ungVienTheoMa.get(cand4);
      if (!hitMap) {
        hitMap = new Map();
        ungVienTheoMa.set(cand4, hitMap);
      }
      const prev = hitMap.get(q.idCau);
      if (!prev || hang < prev.hang) {
        hitMap.set(q.idCau, { idCau: q.idCau, cauHoi: q.cauHoi, hang, hangNhomXet, tok: q.tok });
      }
    }
  }

  if (!ungVienTheoMa.size) {
    cacheTheoL.set(cacheKey, []);
    return [];
  }

  const idxTim = xayChiMucTimCgct();
  const idfMap = idxTim?.idf || new Map();

  // 3. Kéo tài liệu phải đọc của từng ứng viên X qua phaiDoc + khớp câu CGCT
  const ketQua = [];
  for (const [cand4, hitMap] of ungVienTheoMa.entries()) {
    const hits = [...hitMap.values()].sort((a, b) => (a.hang - b.hang) || a.idCau.localeCompare(b.idCau));
    const nguonTim = hits.map(({ idCau, cauHoi, hang, hangNhomXet }) => ({ idCau, cauHoi, hang, hangNhomXet: hangNhomXet ?? null }));
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

    ketQua.push({
      nhom: cand4,
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

  ketQua.sort(
    (a, b) => (a.hangTotNhat - b.hangTotNhat)
      || (b.soCauHoiTrung - a.soCauHoiTrung)
      || a.nhom.localeCompare(b.nhom),
  );
  cacheTheoL.set(cacheKey, ketQua);
  return ketQua;
}

function taoBanGoiCon(goi, { maxBytes = MAX_BYTES_MAC_DINH, chiaTheo6So = false } = {}) {
  const rootId = goi.nut;
  const directChildren = goi.cayBieu.filter((n) => n.cha === rootId);
  if (directChildren.length <= 1) return [];

  if (!chiaTheo6So && !Number.isFinite(maxBytes)) return [];
  const needSplit = chiaTheo6So || Buffer.byteLength(JSON.stringify(goi), 'utf8') > maxBytes;
  if (!needSplit) return [];

  const byId = new Map(goi.cayBieu.map((n) => [n.id, n]));
  const childrenByCha = new Map();
  for (const n of goi.cayBieu) {
    if (!n.cha) continue;
    if (!childrenByCha.has(n.cha)) childrenByCha.set(n.cha, []);
    childrenByCha.get(n.cha).push(n.id);
  }
  const cauMap = new Map(goi.cauTrongGoi.map((c) => [c.id, c]));
  const nhomAeByCha = new Map(goi.nhomAnhEm.map((g) => [g.cha, g]));
  const rootNode = byId.get(rootId);
  const anhEmCungCap = nhomAeByCha.get(rootId)?.con || [];

  const chunks = [];
  for (const dc of directChildren) {
    const subIds = new Set();
    const walk = (id) => {
      subIds.add(id);
      for (const cid of childrenByCha.get(id) || []) walk(cid);
    };
    walk(dc.id);

    const cayCon = goi.cayBieu.filter((n) => subIds.has(n.id));
    const nhomAnhEmCon = goi.nhomAnhEm.filter((g) => subIds.has(g.cha));
    const cauIdsSub = new Set();
    for (const n of cayCon) for (const cid of n.cauIds) cauIdsSub.add(cid);
    const cauCon = [...cauIdsSub].sort().map((cid) => cauMap.get(cid)).filter(Boolean);

    const hoSoCon = {
      nguong: goi.hoSoSanCo.nguong.filter((r) => subIds.has(r.nut) || r.nut === rootId || !/^bieu:/.test(r.nut)),
      dinhNghia: goi.hoSoSanCo.dinhNghia.filter((r) => subIds.has(r.nut) || r.nut === rootId || !/^bieu:/.test(r.nut)),
      lietKe: goi.hoSoSanCo.lietKe.filter((r) => subIds.has(r.nut) || r.nut === rootId || !/^bieu:/.test(r.nut)),
    };

    const chunkObj = {
      nutPhanNhom: dc.id,
      tenPhanNhom: dc.ten,
      chuoiCha: rootNode ? [rootNode] : [],
      anhEmCungCap,
      cayCon,
      nhomAnhEmCon,
      cauCon,
      hoSoCon,
    };
    Object.defineProperty(chunkObj, 'canhTranhTimThay', {
      value: chunks.length === 0 ? (goi.canhTranhTimThay || []) : [],
      enumerable: false,
    });
    chunks.push(chunkObj);
  }
  return chunks;
}

/** Dựng gói đọc trọn một nhóm 4 số (`goi-nhom@1`). */
export function dungGoiNhom(nhom4HoacNut, opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = layBieuMeta(L, opts.bieuMeta || null);
  const soanMu = Boolean(opts.soanMu);
  const kho = opts.kho || (soanMu ? { loi: [], banGhi: [], bangAnhEm: [], soTep: 0 } : kiemKhoHoSo(hoSo));
  const canhTranhData = opts.canhTranhMap || (soanMu
    ? { coTep: false, byNut: new Map(), byNhom: new Map(), canhTranhChung: new Map(), canhBao: [] }
    : docBangCanhTranhMd(opts.canhTranhMd ?? DEFAULT_CANH_TRANH_MD));
  const maxBytes = opts.maxBytes ?? MAX_BYTES_MAC_DINH;
  const chiaTheo6So = Boolean(opts.chiaTheo6So);

  const nhom4 = chuanNhom4(nhom4HoacNut);
  const nut = `bieu:${nhom4}`;
  const { cayBieu, nhomAnhEm } = thuThapCayNhom(nhom4, L, bieuMeta);
  const cayIds = new Set(cayBieu.map((n) => n.id));
  const { theoNut } = layChiMucCau(L);

  const pd = layPhaiDoc(nhom4, luat);
  const chuong = pd?.chuong || nhom4.slice(0, 2);
  const phan = pd?.phan || CHUONG_SANG_PHAN[chuong] || null;
  const phanChuong = pd?.phanChuong || null;
  const ten = pd?.ten || cayBieu[0]?.ten || '';

  const buocMap = new Map();
  for (const b of pd?.trinhTu || []) {
    if (BUOC_BO.has(b.buoc) || !BUOC_GIU.has(b.buoc)) continue;
    buocMap.set(b.buoc, b.muc || []);
  }

  // Quy tắc chung giải thích GIR 1–6 nguyên văn từ data/luat-goc/gir.jsonl (#2483 / ADR-0011)
  const gir = [...L.nut.entries()]
    .filter(([nid]) => nid.startsWith('gir:'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nid, info]) => {
      const cids = [...(theoNut.get(nid) || [])];
      return {
        id: nid,
        nut: nid,
        loai: info.loai || null,
        lop: info.lop,
        nguyenVan: info.v,
        trich: info.v,
        nguon: info.nguon,
        cauIds: cids,
        cau: cids
          .filter((cid) => L.cau.has(cid))
          .map((cid) => {
            const chu = L.chuCau(cid);
            return { id: cid, nut: nid, chu, vanTay: vanTay(chu) };
          }),
      };
    });

  const luatNen = {
    gir,
    phan: (buocMap.get('CHU_GIAI_PHAN') || []).map((m) => dinhDangMucLuatNen(m, theoNut)),
    chuong: (buocMap.get('CHU_GIAI_CHUONG') || []).map((m) => dinhDangMucLuatNen(m, theoNut)),
    phanChuong: (buocMap.get('CHU_GIAI_PHAN_CHUONG') || []).map((m) => dinhDangMucLuatNen(m, theoNut)),
    nhomCt: (buocMap.get('CHU_GIAI_NHOM') || []).map((m) => dinhDangMucLuatNen(m, theoNut)),
    cgpn: (buocMap.get('CHU_GIAI_PHAN_NHOM') || []).map((m) => dinhDangMucLuatNen(m, theoNut)),
    sen: (buocMap.get('SEN') || []).map((m) => dinhDangMucLuatNen(m, theoNut)),
  };

  // Tổng hợp loại trừ ra/vào từ phaiDoc + nghia-canh trên toàn bộ cây con của nhóm 4 số
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

  for (const m of buocMap.get('LOAI_TRU_RA') || []) {
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
  for (const m of buocMap.get('NHAC_TOI') || []) {
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
  for (const m of buocMap.get('LOAI_TRU_VAO') || []) {
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
  for (const m of buocMap.get('DUOC_NHAC') || []) {
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

  // Bổ sung cạnh nghia-canh trực tiếp trên các nút con (phân nhóm / dòng 8 số / chú giải nhóm)
  const nhomCtIds = new Set(luatNen.nhomCt.map((x) => x.nut));
  const pnIds = new Set(luatNen.cgpn.map((x) => x.nut));
  const senIds = new Set(luatNen.sen.map((x) => x.nut));
  const nutCanQuetCanh = new Set([...cayIds, ...nhomCtIds, ...pnIds, ...senIds]);
  for (const nid of nutCanQuetCanh) {
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
      pushEdge(loaiTruVao, seenVao, {
        cauId: e.tu,
        tuNut: G.chuCuaCau(e.tu) || L.cau.get(e.tu)?.nut || null,
        den: e.den,
        loai: e.loai,
        trangThai: e.trangThai,
        trich: e.trich || '',
        cau: gon(L.chuCau(e.tu)),
      });
    }
  }

  // Ứng viên cạnh tranh tìm thấy qua máy tìm (ADR-0010 mục 2: chỉ nạp tài liệu phải đọc, KHÔNG đẩy vào loaiTru)
  const canhTranhTimThay = timCanhTranhTimThay(nhom4, {
    luat,
    L,
    bieuMeta,
    cayBieu,
    luatNen,
    topKCanhTranh: opts.topKCanhTranh,
    tatCanhTranhTimThay: opts.tatCanhTranhTimThay,
  });

  // Thu thập toàn bộ câu luật có thật trong gói kèm sha256 vanTay
  const gopCauGir = Boolean(soanMu || opts.gopCauGir);
  const cauIdSet = new Set();
  for (const n of cayBieu) for (const cid of n.cauIds) cauIdSet.add(cid);
  for (const [tenNhomLuat, group] of Object.entries(luatNen)) {
    if (tenNhomLuat === 'gir' && !gopCauGir) continue;
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

  // Hồ sơ sẵn có (M-72..M-75 + M-81 nếu đã có)
  const ancestorNutSet = new Set();
  if (phan) ancestorNutSet.add(`phan:${phan}`);
  if (chuong) ancestorNutSet.add(`chuong:${chuong}`);
  if (chuong && phanChuong) ancestorNutSet.add(`chuong:${chuong}:pc:${phanChuong}`);

  const thuocGoi = (recNut) => cayIds.has(recNut) || ancestorNutSet.has(recNut) || (phan && recNut.startsWith(`phan:${phan}:`)) || (chuong && recNut.startsWith(`chuong:${chuong}:`));
  const totHoSo = (kho.banGhi || []).filter((x) => !x._hong);
  const hoSoSanCo = {
    nguong: totHoSo.filter((x) => x.loai === 'NGUONG' && thuocGoi(x.nut)),
    dinhNghia: totHoSo.filter((x) => x.loai === 'DINH_NGHIA' && thuocGoi(x.nut)),
    lietKe: totHoSo.filter((x) => x.loai === 'CHI_LIET_KE' && thuocGoi(x.nut)),
    daCo: {
      dieuKien: totHoSo.filter((x) => x.loai === 'DIEU_KIEN' && cayIds.has(x.nut)),
      giaiChong: totHoSo.filter((x) => x.loai === 'GIAI_CHONG' && cayIds.has(x.nut)),
      canhTranh: totHoSo.filter((x) => x.loai === 'CANH_TRANH' && cayIds.has(x.nut)),
    },
  };

  // CANH_TRANH từ docs/mong/the/M-81-canh-tranh.md (tuyệt đối không lỗi nếu thiếu tệp)
  let canhTranh = null;
  if (canhTranhData?.coTep) {
    const muc = canhTranhData.byNhom.get(nhom4) || [];
    const chung = [];
    if (phan && canhTranhData.canhTranhChung.has(`phan:${phan}`)) {
      chung.push(canhTranhData.canhTranhChung.get(`phan:${phan}`));
    }
    if (chuong && canhTranhData.canhTranhChung.has(`chuong:${chuong}`)) {
      chung.push(canhTranhData.canhTranhChung.get(`chuong:${chuong}`));
    }
    if (muc.length || chung.length) {
      canhTranh = {
        coTep: true,
        muc,
        canhTranhChung: chung,
      };
    }
  }

  const goi = {
    khuon: 'goi-nhom@1',
    nhom: nhom4,
    nut,
    phan,
    chuong,
    phanChuong,
    ten,
    vanTayGoi,
    gir,
    cayBieu,
    nhomAnhEm,
    luatNen,
    cauTrongGoi,
    loaiTru: { ra: loaiTruRa, vao: loaiTruVao },
    hoSoSanCo,
    canhTranh,
    canhTranhTimThay,
    goiCon: [],
  };

  goi.goiCon = taoBanGoiCon(goi, { maxBytes, chiaTheo6So });
  return goi;
}

/** Liệt kê danh sách mã nhóm 4 số trong kho biểu (tuỳ chọn lọc theo chương). */
export function lietKeNhom4({ chuong = null, luat = G.LUAT_MAC_DINH, L = null } = {}) {
  const L_ = L || napLuatCong(luat);
  const ch = chuong !== null && chuong !== undefined ? String(chuong).padStart(2, '0') : null;
  const ds = [];
  for (const id of L_.cay.theoId.keys()) {
    const m = /^bieu:(\d{4})$/.exec(id);
    if (!m) continue;
    if (ch && !m[1].startsWith(ch)) continue;
    ds.push(m[1]);
  }
  return ds.sort();
}

/** Dựng gói cho tất cả nhóm 4 số trong một chương (hoặc toàn biểu). */
export function dungTatCaGoiNhom(opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = layBieuMeta(L, opts.bieuMeta || null);
  const soanMu = Boolean(opts.soanMu);
  const kho = opts.kho || (soanMu ? { loi: [], banGhi: [], bangAnhEm: [], soTep: 0 } : kiemKhoHoSo(hoSo));
  const canhTranhMap = opts.canhTranhMap || (soanMu
    ? { coTep: false, byNut: new Map(), byNhom: new Map(), canhTranhChung: new Map(), canhBao: [] }
    : docBangCanhTranhMd(opts.canhTranhMd ?? DEFAULT_CANH_TRANH_MD));
  const dsNhom = lietKeNhom4({ chuong: opts.chuong ?? null, luat, L });
  return dsNhom.map((nhom4) => dungGoiNhom(nhom4, {
    ...opts,
    luat,
    hoSo,
    L,
    bieuMeta,
    kho,
    canhTranhMap,
  }));
}

function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const nhomArg = lay('--nhom');
  if (!nhomArg) {
    console.error('Thiếu --nhom <4so> (vd: --nhom 8543)');
    process.exit(2);
  }
  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so') || G.HO_SO_MAC_DINH);
  const canhTranhMd = lay('--canh-tranh') ? path.resolve(lay('--canh-tranh')) : DEFAULT_CANH_TRANH_MD;
  const maxBytes = lay('--max-bytes') ? Number(lay('--max-bytes')) : MAX_BYTES_MAC_DINH;
  const chiaTheo6So = a.includes('--chia-6so');
  const topKCanhTranh = lay('--top-k-canh-tranh') ? Number(lay('--top-k-canh-tranh')) : TOP_K_CANH_TRANH_MAC_DINH;
  const tatCanhTranhTimThay = a.includes('--tat-canh-tranh-tim-thay');
  const soanMu = a.includes('--soan-mu');
  const gopCauGir = !a.includes('--khong-gop-cau-gir');

  const t0 = performance.now();
  const goi = dungGoiNhom(nhomArg, {
    luat,
    hoSo,
    canhTranhMd,
    maxBytes,
    chiaTheo6So,
    topKCanhTranh,
    tatCanhTranhTimThay,
    soanMu,
    gopCauGir,
  });
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
      nhom: goi.nhom,
      nut: goi.nut,
      phan: goi.phan,
      chuong: goi.chuong,
      phanChuong: goi.phanChuong,
      soNutCayBieu: goi.cayBieu.length,
      soNhomAnhEm: goi.nhomAnhEm.length,
      soCauTrongGoi: goi.cauTrongGoi.length,
      loaiTruRa: goi.loaiTru.ra.length,
      loaiTruVao: goi.loaiTru.vao.length,
      hoSoNguong: goi.hoSoSanCo.nguong.length,
      hoSoDinhNghia: goi.hoSoSanCo.dinhNghia.length,
      hoSoLietKe: goi.hoSoSanCo.lietKe.length,
      coCanhTranh: Boolean(goi.canhTranh),
      soCanhTranhTimThay: goi.canhTranhTimThay.length,
      canhTranhTimThay: goi.canhTranhTimThay.map((x) => x.nhom),
      soGoiCon: goi.goiCon.length,
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
