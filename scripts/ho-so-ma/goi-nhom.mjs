#!/usr/bin/env node
// scripts/ho-so-ma/goi-nhom.mjs — M-81 (#2410, ADR-0008): dựng gói đọc trọn nhóm 4 số từ kho luật công khai + hồ sơ sẵn có.
// Dùng lại lib/do-thi/phai-doc.js (bỏ WCO, PHAN_BIET, PHAN_BIET_NGHIA; tuyệt đối không đọc tiền lệ tb: hay dữ liệu khách).
//   node scripts/ho-so-ma/goi-nhom.mjs --nhom 8543 [--luat data/luat-goc] [--ho-so data/ho-so-ma] [--canh-tranh docs/mong/the/M-81-canh-tranh.md] [--max-bytes 184320] [--out <tep.json>] [--tom-tat]
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

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_CANH_TRANH_MD = path.join(REPO_ROOT, 'docs', 'mong', 'the', 'M-81-canh-tranh.md');
export const MAX_BYTES_MAC_DINH = 180 * 1024;

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

function layChiMucCau(L) {
  if (_chiMucCauCache.has(L)) return _chiMucCauCache.get(L);
  const theoNut = new Map();
  const theoChu = new Map();
  for (const [cauId, c] of L.cau.entries()) {
    if (!c || /^tb:/.test(cauId) || /^wco:/.test(cauId)) continue;
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
  const idx = { theoNut, theoChu };
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

function dinhDangMucLuatNen(m, theoNut) {
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

function taoBanGoiCon(goi, { maxBytes = MAX_BYTES_MAC_DINH, chiaTheo6So = false } = {}) {
  const rootId = goi.nut;
  const directChildren = goi.cayBieu.filter((n) => n.cha === rootId);
  if (directChildren.length <= 1) return [];

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

    chunks.push({
      nutPhanNhom: dc.id,
      tenPhanNhom: dc.ten,
      chuoiCha: rootNode ? [rootNode] : [],
      anhEmCungCap,
      cayCon,
      nhomAnhEmCon,
      cauCon,
      hoSoCon,
    });
  }
  return chunks;
}

/** Dựng gói đọc trọn một nhóm 4 số (`goi-nhom@1`). */
export function dungGoiNhom(nhom4HoacNut, opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = layBieuMeta(L, opts.bieuMeta || null);
  const kho = opts.kho || kiemKhoHoSo(hoSo);
  const canhTranhData = opts.canhTranhMap || docBangCanhTranhMd(opts.canhTranhMd ?? DEFAULT_CANH_TRANH_MD);
  const maxBytes = opts.maxBytes ?? MAX_BYTES_MAC_DINH;
  const chiaTheo6So = Boolean(opts.chiaTheo6So);

  const nhom4 = chuanNhom4(nhom4HoacNut);
  const nut = `bieu:${nhom4}`;
  const { cayBieu, nhomAnhEm } = thuThapCayNhom(nhom4, L, bieuMeta);
  const cayIds = new Set(cayBieu.map((n) => n.id));
  const { theoNut } = layChiMucCau(L);

  const pd = phaiDoc(nhom4, { thuMuc: luat, dayDu: true });
  const chuong = pd?.chuong || nhom4.slice(0, 2);
  const phan = pd?.phan || CHUONG_SANG_PHAN[chuong] || null;
  const phanChuong = pd?.phanChuong || null;
  const ten = pd?.ten || cayBieu[0]?.ten || '';

  const buocMap = new Map();
  for (const b of pd?.trinhTu || []) {
    if (BUOC_BO.has(b.buoc) || !BUOC_GIU.has(b.buoc)) continue;
    buocMap.set(b.buoc, b.muc || []);
  }

  const luatNen = {
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

  // Thu thập toàn bộ câu luật có thật trong gói kèm sha256 vanTay
  const cauIdSet = new Set();
  for (const n of cayBieu) for (const cid of n.cauIds) cauIdSet.add(cid);
  for (const group of Object.values(luatNen)) {
    for (const m of group) for (const cid of m.cauIds || []) cauIdSet.add(cid);
  }
  for (const edge of [...loaiTruRa, ...loaiTruVao]) {
    if (edge.cauId && L.cau.has(edge.cauId)) cauIdSet.add(edge.cauId);
    for (const cid of edge.cauIds || []) if (L.cau.has(cid)) cauIdSet.add(cid);
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
    cayBieu,
    nhomAnhEm,
    luatNen,
    cauTrongGoi,
    loaiTru: { ra: loaiTruRa, vao: loaiTruVao },
    hoSoSanCo,
    canhTranh,
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
  const kho = opts.kho || kiemKhoHoSo(hoSo);
  const canhTranhMap = opts.canhTranhMap || docBangCanhTranhMd(opts.canhTranhMd ?? DEFAULT_CANH_TRANH_MD);
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

  const goi = dungGoiNhom(nhomArg, { luat, hoSo, canhTranhMd, maxBytes, chiaTheo6So });
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
      soGoiCon: goi.goiCon.length,
      bytes,
      vanTayGoi: goi.vanTayGoi,
      ...(out ? { out: path.resolve(out) } : {}),
    }, null, 2));
  } else {
    console.log(JSON.stringify(goi, null, 2));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
