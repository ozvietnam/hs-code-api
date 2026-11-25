// lib/chu-giai-goc.js — M-21 (#1908): Đọc thẳng kho luật gốc đã kiểm (data/luat-goc/*.jsonl + cau/*.jsonl).
//
// Ràng buộc phân lớp (M-23 lop-kho@1, ngoaiLeChuyenTiep: null):
// - Chỉ đọc kho LUAT (phan, chuong, nhom, phan-nhom, sen, bieu, gir, data/hs-sections.json) và chỉ mục câu (cau/*.jsonl).
// - TUYỆT ĐỐI KHÔNG đọc kho BO_TRO / THUC_TE / TIEN_LE (không chu-giai-heading, không chu-giai-chuong, không notes.json,
//   không explanatory-notes, không hs-tree, không thong-bao.jsonl, không oz-gold).
// - Phần không mượn chương khác; cấp gạch lấy từ kho bieu.jsonl; không tự ghép khong_bao_gom/bao_gom/loai_tru.
// - Luôn trả kèm cha và câu dẫn (dan) từ kho câu để nhận biết mục nằm dưới câu "không bao gồm:".
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const THU_MUC_MAC_DINH = path.join(__dirname, '..', 'data', 'luat-goc');
const TEP_SECTIONS_MAC_DINH = path.join(__dirname, '..', 'data', 'hs-sections.json');
const KHO_DOC = Object.freeze(['phan', 'chuong', 'nhom', 'phan-nhom', 'sen', 'bieu', 'gir']);
const CHUA_CO_CHU_GIAI_CHUONG = new Set(['50', '53', '98']);

const CACHE_KHO = new Map();

function dinhDangNguon(ng) {
  if (!ng) return null;
  if (typeof ng === 'string') return ng;
  const vb = String(ng.vanBan || '').replace(/\s+/g, ' ').trim();
  const ban = String(ng.ban || '').replace(/\s+/g, ' ').trim();
  return [vb, ban ? `(${ban})` : ''].filter(Boolean).join(' ') || null;
}

function docSectionsMeta(tepSections = TEP_SECTIONS_MAC_DINH) {
  let ds = [];
  try {
    ds = JSON.parse(fs.readFileSync(tepSections, 'utf8')).sections || [];
  } catch {
    ds = [];
  }
  const theoChuong = new Map();
  const theoMa = new Map();
  for (const s of ds) {
    theoMa.set(s.code, s);
    for (const c of s.chapters || []) {
      const k = String(parseInt(c, 10)).padStart(2, '0');
      theoChuong.set(k, s);
    }
  }
  return { ds, theoChuong, theoMa };
}

function docDongJsonl(tep) {
  if (!fs.existsSync(tep)) return [];
  return fs.readFileSync(tep, 'utf8').split('\n').filter((l) => l.trim());
}

function dinhDangDanCuaNut(nutId, cauCuaNut, cauTextById) {
  if (!Array.isArray(cauCuaNut) || cauCuaNut.length === 0) return null;
  for (const c of cauCuaNut) {
    if (c.dan) {
      return {
        id: c.dan,
        cau: cauTextById.get(c.dan) || null,
      };
    }
  }
  return null;
}

function dinhDangNutLuat(nut, cauTheoNut, cauTextById, tang, extra = {}) {
  const dsCau = cauTheoNut.get(nut.id) || [];
  const dan = dinhDangDanCuaNut(nut.id, dsCau, cauTextById);
  return {
    id: nut.id,
    kho: nut._kho,
    tang,
    loai: nut.loai,
    lop: nut.lop,
    nguon: dinhDangNguon(nut.nguon),
    trang: nut.nguon?.trang ?? null,
    cha: nut.cha ?? null,
    so: nut.so ?? null,
    nguyenVan: nut.nguyenVan,
    ...(nut.gach != null ? { gach: nut.gach } : {}),
    ...(nut.cap ? { cap: nut.cap } : {}),
    ...(dan ? { dan } : { dan: null }),
    ...(dsCau.length > 0 ? { cau: dsCau } : {}),
    ...extra,
  };
}

function napKho(thuMuc = THU_MUC_MAC_DINH) {
  const dir = path.resolve(thuMuc || THU_MUC_MAC_DINH);
  if (CACHE_KHO.has(dir)) return CACHE_KHO.get(dir);

  const theoId = new Map();
  const phanNodes = new Map();
  const chuongNodes = new Map();
  const nhomNodes = new Map();
  const pnTheoNhom = new Map();
  const pnTheoMa = new Map();
  const senTheoMa = new Map();
  const senTheoChuong = new Map();
  const senTheoPhan = new Map();
  const bieuTheoId = new Map();
  const bieuCon = new Map();
  const cauTextById = new Map();
  const cauRawTheoNut = new Map();

  const pushMap = (map, k, v) => {
    let arr = map.get(k);
    if (!arr) { arr = []; map.set(k, arr); }
    arr.push(v);
  };

  for (const khoTen of KHO_DOC) {
    const lines = docDongJsonl(path.join(dir, `${khoTen}.jsonl`));
    for (const l of lines) {
      let n;
      try { n = JSON.parse(l); } catch { continue; }
      if (!n || !n.id) continue;
      if (n.lop === 'TIEN_LE' || String(n.id).startsWith('tb:')) continue;
      n._kho = khoTen;
      theoId.set(n.id, n);

      if (khoTen === 'phan') {
        const m = /^phan:([IVXL]+):/.exec(n.id);
        if (m) pushMap(phanNodes, m[1], n);
      } else if (khoTen === 'chuong') {
        const m = /^chuong:(\d{2}):/.exec(n.id);
        if (m) pushMap(chuongNodes, m[1], n);
      } else if (khoTen === 'nhom') {
        const m = /^nhom:(\d{4}):/.exec(n.id);
        if (m) pushMap(nhomNodes, m[1], n);
      } else if (khoTen === 'phan-nhom') {
        const dsMa = Array.isArray(n.apChung) && n.apChung.length
          ? n.apChung.map((x) => String(x).replace(/\D/g, ''))
          : [(/^pn:(\d{6}):/.exec(n.id)?.[1] || '')].filter(Boolean);
        for (const pn6 of dsMa) {
          pushMap(pnTheoMa, pn6, n);
          if (pn6.length >= 4) pushMap(pnTheoNhom, pn6.slice(0, 4), n);
        }
      } else if (khoTen === 'sen') {
        let m = /^sen:(\d{4,8}):/.exec(n.id);
        if (m) {
          pushMap(senTheoMa, m[1], n);
        } else if ((m = /^sen:chuong:(\d{2}):/.exec(n.id))) {
          pushMap(senTheoChuong, m[1], n);
        } else if ((m = /^sen:phan:([IVXL]+):/.exec(n.id))) {
          pushMap(senTheoPhan, m[1], n);
        }
      } else if (khoTen === 'bieu') {
        bieuTheoId.set(n.id, n);
        if (n.cha) pushMap(bieuCon, n.cha, n);
      }
    }

    // Nạp kho câu (từ data/luat-goc/cau/<kho>.jsonl)
    const cauLines = docDongJsonl(path.join(dir, 'cau', `${khoTen}.jsonl`));
    for (const l of cauLines) {
      let c;
      try { c = JSON.parse(l); } catch { continue; }
      if (!c || !c.id) continue;
      const hash = c.id.lastIndexOf('#');
      if (hash <= 0) continue;
      const nutId = c.id.slice(0, hash);
      const nut = theoId.get(nutId);
      if (!nut || typeof nut.nguyenVan !== 'string') continue;
      const text = nut.nguyenVan.slice(c.tu, c.den).replace(/\s+/g, ' ').trim();
      cauTextById.set(c.id, text);
      pushMap(cauRawTheoNut, nutId, {
        id: c.id,
        tu: c.tu,
        den: c.den,
        text,
        dan: c.dan || null,
      });
    }
  }

  // Gắn danCau sau khi đã đọc đủ cauTextById của kho
  const cauTheoNut = new Map();
  for (const [nutId, ds] of cauRawTheoNut) {
    cauTheoNut.set(nutId, ds.map((c) => ({
      ...c,
      danCau: c.dan ? (cauTextById.get(c.dan) || null) : null,
    })));
  }

  const sections = docSectionsMeta();
  const data = {
    dir,
    sections,
    theoId,
    phanNodes,
    chuongNodes,
    nhomNodes,
    pnTheoNhom,
    pnTheoMa,
    senTheoMa,
    senTheoChuong,
    senTheoPhan,
    bieuTheoId,
    bieuCon,
    cauTextById,
    cauTheoNut,
  };
  CACHE_KHO.set(dir, data);
  return data;
}

function docNutTheoId(id, { thuMuc = THU_MUC_MAC_DINH } = {}) {
  const kho = napKho(thuMuc);
  const nut = kho.theoId.get(String(id || '').trim());
  if (!nut) return null;
  return dinhDangNutLuat(nut, kho.cauTheoNut, kho.cauTextById, nut._kho.toUpperCase());
}

function chuanChuong2(ch) {
  const s = String(ch || '').replace(/\D/g, '');
  if (!s) return null;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 1 || n > 99) return null;
  return String(n).padStart(2, '0');
}

function phanChoChuong(chapterNum, { thuMuc = THU_MUC_MAC_DINH } = {}) {
  const kho = napKho(thuMuc);
  const c2 = chuanChuong2(chapterNum);
  return c2 ? (kho.sections.theoChuong.get(c2) || null) : null;
}

/**
 * Lấy chú giải Phần từ phan.jsonl (KHÔNG mượn chương khác).
 */
function layPhan(chapterNum, { thuMuc = THU_MUC_MAC_DINH, full = false } = {}) {
  const kho = napKho(thuMuc);
  const sec = phanChoChuong(chapterNum, { thuMuc: kho.dir });
  if (!sec) return null;
  const ds = kho.phanNodes.get(sec.code) || [];
  const phapLy = ds.filter((n) => n.lop === 'LUAT' && n.loai !== 'KHAI_QUAT');
  const khongPhapLy = ds.filter((n) => n.loai === 'KHAI_QUAT' || n.lop !== 'LUAT');

  const legalText = phapLy.map((n) => n.nguyenVan).join('\n').trim();
  const overviewText = khongPhapLy.map((n) => n.nguyenVan).join('\n').trim();
  const nutChon = full ? ds : phapLy;

  return {
    section: sec,
    coChuGiai: ds.length > 0,
    coPhapLy: phapLy.length > 0,
    legal: legalText,
    overview: overviewText,
    hasOverview: overviewText.length > 0,
    nutLuat: nutChon.map((n) => dinhDangNutLuat(n, kho.cauTheoNut, kho.cauTextById, 'SECTION')),
  };
}

/**
 * Lấy chú giải Chương từ chuong.jsonl (phần pháp lý cg/cgbs/cgpn trước, KHAI_QUAT tách riêng).
 */
function layChuong(chapterNum, { thuMuc = THU_MUC_MAC_DINH, full = false } = {}) {
  const kho = napKho(thuMuc);
  const c2 = chuanChuong2(chapterNum);
  if (!c2) return null;
  const bieuChuong = kho.bieuTheoId.get(`bieu:${c2}`) || null;
  const ds = kho.chuongNodes.get(c2) || [];
  if (!bieuChuong && ds.length === 0) return null;

  const cg = ds.filter((n) => n.loai !== 'KHAI_QUAT' && n.loai !== 'CHU_GIAI_PHAN_NHOM');
  const cgpn = ds.filter((n) => n.loai === 'CHU_GIAI_PHAN_NHOM');
  const kq = ds.filter((n) => n.loai === 'KHAI_QUAT');

  const phapLyNodes = [...cg, ...cgpn];
  const doanPhapLy = [];
  if (cg.length > 0) doanPhapLy.push(cg.map((n) => n.nguyenVan).join('\n'));
  if (cgpn.length > 0) {
    doanPhapLy.push(`Chú giải phân nhóm\n${cgpn.map((n) => n.nguyenVan).join('\n')}`);
  }
  const legalText = doanPhapLy.join('\n\n').trim();
  const overviewText = kq.map((n) => n.nguyenVan).join('\n').trim();
  const nutChon = full ? [...phapLyNodes, ...kq] : phapLyNodes;

  return {
    chapter: c2,
    chapterInt: String(parseInt(c2, 10)),
    tenChuong: bieuChuong ? bieuChuong.nguyenVan : `Chương ${parseInt(c2, 10)}`,
    coChuGiai: phapLyNodes.length > 0 || kq.length > 0,
    coPhapLy: phapLyNodes.length > 0,
    coCgpn: cgpn.length > 0,
    legal: legalText,
    overview: overviewText,
    hasOverview: overviewText.length > 0,
    nutLuat: [
      ...(bieuChuong ? [dinhDangNutLuat(bieuChuong, kho.cauTheoNut, kho.cauTextById, 'CHAPTER')] : []),
      ...nutChon.map((n) => dinhDangNutLuat(n, kho.cauTheoNut, kho.cauTextById, 'CHAPTER')),
    ],
  };
}

/**
 * Lấy chú giải chi tiết Nhóm 4 số từ nhom.jsonl + tên từ bieu.jsonl (không ghép trường phụ trợ cũ).
 */
function layNhom(headingCode, { thuMuc = THU_MUC_MAC_DINH } = {}) {
  const kho = napKho(thuMuc);
  const h4 = String(headingCode || '').replace(/\D/g, '').slice(0, 4).padStart(4, '0');
  if (h4.length !== 4) return null;
  const bieuNhom = kho.bieuTheoId.get(`bieu:${h4}`) || null;
  const ds = kho.nhomNodes.get(h4) || [];
  if (!bieuNhom && ds.length === 0) return null;

  const tenNhom = bieuNhom ? bieuNhom.nguyenVan : `Nhóm ${h4.slice(0, 2)}.${h4.slice(2)}`;
  const vanBan = ds.map((n) => n.nguyenVan).join('\n\n').trim();
  return {
    heading: h4,
    tenNhom,
    bieuNhom,
    coChuGiai: ds.length > 0,
    vanBan: vanBan || (bieuNhom ? bieuNhom.nguyenVan : null),
    coChinhBanGoc: ds.length > 0,
    nutLuat: [
      ...(bieuNhom ? [dinhDangNutLuat(bieuNhom, kho.cauTheoNut, kho.cauTextById, 'HEADING')] : []),
      ...ds.map((n) => dinhDangNutLuat(n, kho.cauTheoNut, kho.cauTextById, 'HEADING')),
    ],
  };
}

/**
 * Lấy Phân nhóm 6 số từ bieu.jsonl (lấy cấp gạch từ kho bieu) + phan-nhom.jsonl + chuong cgpn.
 */
function layPhanNhom(pn6OrHs, { thuMuc = THU_MUC_MAC_DINH } = {}) {
  const kho = napKho(thuMuc);
  const d = String(pn6OrHs || '').replace(/\D/g, '');
  if (d.length < 6) return null;
  const pn6 = d.slice(0, 6);
  const c2 = pn6.slice(0, 2);

  // Tìm nút biểu phân nhóm 6 số hoặc dòng cha cấp gạch từ bieu.jsonl
  let bieuPn = kho.bieuTheoId.get(`bieu:${pn6}`) || null;
  if (!bieuPn) {
    // Một số phân nhóm trong biểu có 5 chữ số (vd 7616.9 -> bieu:76169) hoặc chỉ có ở dòng 8 số
    for (let len = d.length; len >= 5 && !bieuPn; len -= 1) {
      bieuPn = kho.bieuTheoId.get(`bieu:${d.slice(0, len)}`) || null;
    }
  }
  const dsCgpnPn = kho.pnTheoMa.get(pn6) || [];
  const dsCgpnChuong = (kho.chuongNodes.get(c2) || []).filter((n) => n.loai === 'CHU_GIAI_PHAN_NHOM');
  const nutList = [];
  if (bieuPn) nutList.push(bieuPn);
  for (const n of dsCgpnPn) nutList.push(n);
  if (dsCgpnPn.length === 0 && !bieuPn && dsCgpnChuong.length === 0) return null;

  const phanVan = [
    ...(bieuPn ? [bieuPn.nguyenVan] : []),
    ...dsCgpnPn.map((n) => n.nguyenVan),
  ].filter(Boolean).join('\n\n').trim();

  return {
    pn6,
    bieuPn,
    ten: bieuPn ? bieuPn.nguyenVan : `Phân nhóm ${pn6.slice(0, 4)}.${pn6.slice(4)}`,
    gach: bieuPn?.gach ?? null,
    vanBan: phanVan || null,
    nutLuat: nutList.map((n) => dinhDangNutLuat(n, kho.cauTheoNut, kho.cauTextById, 'SUBHEADING')),
  };
}

/**
 * Lấy dòng biểu 8 số từ bieu.jsonl (lấy cấp gạch từ kho bieu) và các nút SEN tương ứng từ sen.jsonl.
 */
function layDongBieuVaSen(hsCode, { thuMuc = THU_MUC_MAC_DINH } = {}) {
  const kho = napKho(thuMuc);
  const code = String(hsCode || '').replace(/\D/g, '');
  if (code.length < 4) return { bieu: null, sen: [] };

  const bieu = code.length === 8 ? (kho.bieuTheoId.get(`bieu:${code}`) || null) : null;
  const c2 = code.slice(0, 2);
  const h4 = code.slice(0, 4);
  const pn6 = code.length >= 6 ? code.slice(0, 6) : null;
  const sec = kho.sections.theoChuong.get(c2) || null;

  const senSet = new Set();
  const dsSen = [];
  const themSen = (arr) => {
    for (const s of arr || []) {
      if (senSet.has(s.id)) continue;
      senSet.add(s.id);
      dsSen.push(s);
    }
  };
  if (code.length === 8) themSen(kho.senTheoMa.get(code));
  if (pn6) themSen(kho.senTheoMa.get(pn6));
  themSen(kho.senTheoMa.get(h4));
  themSen(kho.senTheoChuong.get(c2));
  if (sec) themSen(kho.senTheoPhan.get(sec.code));

  return {
    bieu: bieu ? dinhDangNutLuat(bieu, kho.cauTheoNut, kho.cauTextById, 'NATIONAL') : null,
    sen: dsSen.map((s) => dinhDangNutLuat(s, kho.cauTheoNut, kho.cauTextById, 'SEN')),
  };
}

/**
 * Trả toàn bộ mảng `nutLuat[]` thuần kho luật gốc cho /api/notes (mọi nút có id, lop, nguon, trang, cha, dan).
 */
function nutLuatCho({ chapter, heading, hs, level = null, full = false, thuMuc = THU_MUC_MAC_DINH } = {}) {
  const kho = napKho(thuMuc);
  const hsDigits = hs ? String(hs).replace(/\D/g, '') : '';
  const headingDigits = heading ? String(heading).replace(/\D/g, '') : '';
  const ma = hsDigits || headingDigits || '';
  const c2 = chapter ? chuanChuong2(chapter) : (ma.length >= 2 ? chuanChuong2(ma.slice(0, 2)) : null);
  const h4 = ma.length >= 4 ? ma.slice(0, 4) : null;
  const wantLevel = level && level !== 'all' ? String(level).toUpperCase() : null;

  const ra = [];
  const daCo = new Set();
  const pushNut = (item) => {
    if (!item || daCo.has(item.id)) return;
    daCo.add(item.id);
    ra.push(item);
  };

  if (c2 && (!wantLevel || wantLevel === 'SECTION')) {
    const p = layPhan(c2, { thuMuc: kho.dir, full });
    if (p) p.nutLuat.forEach(pushNut);
  }
  if (c2 && (!wantLevel || wantLevel === 'CHAPTER')) {
    const ch = layChuong(c2, { thuMuc: kho.dir, full });
    if (ch) ch.nutLuat.forEach(pushNut);
  }
  if (h4 && (!wantLevel || wantLevel === 'HEADING')) {
    const nh = layNhom(h4, { thuMuc: kho.dir });
    if (nh) nh.nutLuat.forEach(pushNut);
  }
  if (ma.length >= 6 && (!wantLevel || wantLevel === 'SUBHEADING')) {
    const pn = layPhanNhom(ma, { thuMuc: kho.dir });
    if (pn) pn.nutLuat.forEach(pushNut);
  }
  if (ma.length >= 4 && (!wantLevel || wantLevel === 'NATIONAL' || wantLevel === 'SEN')) {
    const { bieu, sen } = layDongBieuVaSen(ma, { thuMuc: kho.dir });
    if (bieu && (!wantLevel || wantLevel === 'NATIONAL')) pushNut(bieu);
    if (!wantLevel || wantLevel === 'SEN') sen.forEach(pushNut);
  }
  return ra;
}

/**
 * Kiểm tra độ phủ hoàn toàn trên kho luật gốc cho một mã HS 4-8 số.
 */
function kiemDoPhuKhoGoc(hs, { thuMuc = THU_MUC_MAC_DINH } = {}) {
  const kho = napKho(thuMuc);
  const code = String(hs || '').replace(/\D/g, '');
  const c2 = code.length >= 2 ? code.slice(0, 2) : null;
  const h4 = code.length >= 4 ? code.slice(0, 4) : null;
  const gaps = [];

  const sec = c2 ? phanChoChuong(c2, { thuMuc: kho.dir }) : null;
  let phan = null;
  if (sec) {
    const p = layPhan(c2, { thuMuc: kho.dir, full: true });
    phan = p && p.coChuGiai
      ? { code: sec.code, coChuGiai: true }
      : {
        code: sec.code,
        coChuGiai: false,
        ghiChu: `Biểu gốc HS 2022 không có chú giải cho Phần ${sec.code} — căn cứ Chú giải Chương ${parseInt(c2, 10)} và Chú giải nhóm.`,
      };
  }

  if (c2) {
    const ch = layChuong(c2, { thuMuc: kho.dir, full: true });
    if ((!ch || !ch.coChuGiai) && !CHUA_CO_CHU_GIAI_CHUONG.has(c2)) {
      gaps.push({
        id: 'chapter-note-missing',
        tang: 'CHUONG',
        description: `Chưa có chú giải Chương ${c2} trong kho luật gốc (chuong.jsonl).`,
      });
    }
  }

  if (h4 && c2 !== '98') {
    const nh = layNhom(h4, { thuMuc: kho.dir });
    if (!nh || !nh.coChinhBanGoc) {
      gaps.push({
        id: 'heading-note-missing',
        tang: 'NHOM',
        description: `Chưa có chú giải chi tiết nhóm ${h4} trong kho luật gốc (nhom.jsonl).`,
      });
    }
  }

  const chapterInt = c2 ? String(parseInt(c2, 10)) : '';
  return {
    complete: gaps.length === 0,
    chapter: chapterInt,
    heading: h4,
    phan,
    gaps,
    caveats: [],
  };
}

function normalizeHs(hs) {
  return String(hs || '').replace(/\./g, '').trim().padEnd(8, '0').slice(0, 8);
}

function datLai() {
  CACHE_KHO.clear();
}

module.exports = {
  THU_MUC_MAC_DINH,
  normalizeHs,
  napKho,
  docNutTheoId,
  phanChoChuong,
  layPhan,
  layChuong,
  layNhom,
  layPhanNhom,
  layDongBieuVaSen,
  nutLuatCho,
  kiemDoPhuKhoGoc,
  datLai,
};
