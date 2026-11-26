// lib/ho-so-ma/ghep.js — M-71 (#1963, ADR-0006): ghép hồ sơ vấn đề của một mã 4/6/8 số dọc đường đi
// Phần → Chương → Phân chương (nếu có) → nhóm 4 số → tiêu đề 5 số → 6 số → tiêu đề 7 số → 8 số.
//
// Vấn đề nằm ở nút sinh ra nó (data/ho-so-ma/<thư mục>/<khoá>.jsonl, khuôn docs/mong/khuon-ho-so-ma.md).
// Máy ghép chỉ ĐỌC và XẾP theo cấp; không chép vấn đề sang kho khác, không sinh vấn đề, không đọc dữ liệu khách,
// tờ khai hay tiền lệ. Cấp nào chưa có bản ghi nào thì nói thiếu, không lấp.
// Các hàm đường đi / chủ câu / tệp của nút ở đây là nguồn duy nhất cho scripts/ho-so-ma/khuon.mjs và cong.mjs.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CHUONG_SANG_PHAN } = require('../do-thi/dan-chieu');

const GOC = path.resolve(__dirname, '..', '..');
const LUAT_MAC_DINH = path.join(GOC, 'data', 'luat-goc');
const HO_SO_MAC_DINH = path.join(GOC, 'data', 'ho-so-ma');
const KHUON = 'ho-so-ma@1';
/** Thư mục con của data/ho-so-ma: năm thư mục theo cấp + hai thư mục theo loại việc (M-74 ngưỡng, M-75 liệt kê). */
const THU_MUC = Object.freeze(['phan', 'chuong', 'nhom', 'phan-nhom', 'dong', 'nguong', 'liet-ke']);
const CHUNG = 'CHUNG'; // chủ của câu áp cho mọi mã (Quy tắc tổng quát, lời nói đầu SEN)

/** "7605.19.10" → "76051910"; chỉ nhận 4, 6, 8 chữ số. */
function chuanMa(ma) {
  const s = String(ma ?? '').replace(/^bieu:/, '').replace(/[.\s]/g, '');
  return /^(?:\d{4}|\d{6}|\d{8})$/.test(s) ? s : null;
}

/** Chữ số của nút biểu: bieu:7606123 → "7606123"; bieu:1511903:td1 → "1511903". */
const soBieu = (id) => /^bieu:(\d+)/.exec(id || '')?.[1] || null;
const laTieuDe = (id) => /:td\d+$/.test(id || '');

/** Cấp của một nút trên đường đi. */
function capCuaNut(id) {
  if (/^phan:[IVX]+$/.test(id)) return 'PHAN';
  if (/^chuong:\d{2}$/.test(id)) return 'CHUONG';
  if (/^chuong:\d{2}:pc:[IVX]+$/.test(id)) return 'PHAN_CHUONG';
  const so = soBieu(id);
  if (!so) return null;
  const d = so.length; const td = laTieuDe(id);
  if (d === 2) return 'CHUONG';
  if (d === 4) return td ? 'TIEU_DE_5' : 'NHOM';
  if (d === 5) return 'TIEU_DE_5';
  if (d === 6) return td ? 'TIEU_DE_7' : 'PHAN_NHOM';
  if (d === 7) return 'TIEU_DE_7';
  if (d === 8) return td ? 'TIEU_DE_7' : 'DONG';
  return null;
}

/** Hai chữ số Chương của nút (phan:… → null). */
function chuongCuaNut(id) {
  const m = /^chuong:(\d{2})/.exec(id || '');
  if (m) return m[1];
  const so = soBieu(id);
  return so ? so.slice(0, 2) : null;
}

/** Khoá tệp của nút trong một thư mục hồ sơ; null = nút không được ghi ở thư mục đó. */
function tepCuaNut(id, thuMuc) {
  const cap = capCuaNut(id);
  if (!cap || cap === 'CHUONG' && /^bieu:/.test(id)) return null; // nút Chương ghi bằng chuong:NN, không bằng bieu:NN
  if (thuMuc === 'nguong' || thuMuc === 'liet-ke') return cap === 'PHAN' ? id.slice(5) : chuongCuaNut(id);
  const so = soBieu(id);
  switch (thuMuc) {
    case 'phan': return cap === 'PHAN' ? id.slice(5) : null;
    case 'chuong': return cap === 'CHUONG' || cap === 'PHAN_CHUONG' ? chuongCuaNut(id) : null;
    case 'nhom': return cap === 'NHOM' || cap === 'TIEU_DE_5' ? so.slice(0, 4) : null;
    case 'phan-nhom': return cap === 'PHAN_NHOM' || cap === 'TIEU_DE_7' ? so.slice(0, 6) : null;
    case 'dong': return cap === 'DONG' ? so : null;
    default: return null;
  }
}

/** Thư mục theo cấp (nơi thẻ tách vấn đề của cấp đó ghi). */
function thuMucCuaNut(id) {
  return ({ PHAN: 'phan', CHUONG: 'chuong', PHAN_CHUONG: 'chuong', NHOM: 'nhom', TIEU_DE_5: 'nhom', PHAN_NHOM: 'phan-nhom', TIEU_DE_7: 'phan-nhom', DONG: 'dong' })[capCuaNut(id)] || null;
}

/** Nút trên đường đi sinh ra câu: chủ của câu. CHUNG = áp cho mọi mã; null = không thuộc hồ sơ (tiền lệ, lạ). */
function chuCuaCau(cauId) {
  const nut = String(cauId || '').split('#')[0];
  let m;
  if (/^gir:/.test(nut) || /^sen:md:/.test(nut)) return CHUNG;
  if ((m = /^phan:([IVX]+)(?::|$)/.exec(nut))) return `phan:${m[1]}`;
  if ((m = /^chuong:(\d{2}):pc:([IVX]+)(?::|$)/.exec(nut))) return `chuong:${m[1]}:pc:${m[2]}`;
  if ((m = /^chuong:(\d{2})(?::|$)/.exec(nut))) return `chuong:${m[1]}`;
  if ((m = /^bieu:(\d{2})$/.exec(nut))) return `chuong:${m[1]}`;
  if (/^bieu:\d{4,8}(?::td\d+)*$/.test(nut)) return nut;
  if ((m = /^nhom:(\d{4}):/.exec(nut))) return `bieu:${m[1]}`;
  if ((m = /^pn:(\d{6}):/.exec(nut))) return `bieu:${m[1]}`;
  if ((m = /^sen:chuong:(\d{2}):/.exec(nut))) return `chuong:${m[1]}`;
  if ((m = /^sen:phan:([IVX]+):/.exec(nut))) return `phan:${m[1]}`;
  if ((m = /^sen:(\d{4,8}):/.exec(nut))) return `bieu:${m[1]}`;
  if ((m = /^wco:(\d{6}):/.exec(nut))) return `bieu:${m[1]}`;
  return null;
}

function docJsonl(tep) {
  if (!fs.existsSync(tep)) return [];
  return fs.readFileSync(tep, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

const BO_NHO_LUAT = new Map();
/**
 * Cây biểu + tên Phần/Chương/Phân chương + bảng dải Phân chương. Đủ để tính đường đi và anh em; không nạp câu.
 * @returns {{thuMuc, theoId: Map<string,{id,cha,ten,lop}>, con: Map<string,string[]>, chuongCuaPhan: Map<string,string[]>, pcCuaChuong: Map<string,{id,tu,den}[]>}}
 */
function napLuat(thuMuc = LUAT_MAC_DINH) {
  const khoa = path.resolve(thuMuc);
  if (BO_NHO_LUAT.has(khoa)) return BO_NHO_LUAT.get(khoa);
  const theoId = new Map(); const con = new Map();
  const them = (n) => {
    theoId.set(n.id, { id: n.id, cha: n.cha ?? null, ten: n.nguyenVan, lop: n.lop });
  };
  for (const n of docJsonl(path.join(khoa, 'bieu.jsonl'))) {
    them(n);
    if (n.cha) { if (!con.has(n.cha)) con.set(n.cha, []); con.get(n.cha).push(n.id); }
  }
  for (const f of ['phan.jsonl', 'chuong.jsonl']) {
    for (const n of docJsonl(path.join(khoa, f))) if (n.loai === 'TEN') them(n);
  }
  const chuongCuaPhan = new Map();
  for (const id of theoId.keys()) {
    const m = /^chuong:(\d{2})$/.exec(id);
    if (!m) continue;
    const p = CHUONG_SANG_PHAN[m[1]];
    if (!p) continue;
    if (!chuongCuaPhan.has(p)) chuongCuaPhan.set(p, []);
    chuongCuaPhan.get(p).push(id);
  }
  for (const ds of chuongCuaPhan.values()) ds.sort();
  const pcCuaChuong = new Map();
  const tepPc = path.join(khoa, 'phan-chuong-nhom.json');
  if (fs.existsSync(tepPc)) {
    for (const r of JSON.parse(fs.readFileSync(tepPc, 'utf8')).muc || []) {
      if (!pcCuaChuong.has(r.chuong)) pcCuaChuong.set(r.chuong, []);
      pcCuaChuong.get(r.chuong).push({ id: `chuong:${r.chuong}:pc:${r.phanChuong}`, tu: r.tu, den: r.den });
    }
  }
  const L = { thuMuc: khoa, theoId, con, chuongCuaPhan, pcCuaChuong };
  BO_NHO_LUAT.set(khoa, L);
  return L;
}

/** Phân chương chứa nhóm 4 số, hoặc null. */
function pcCuaNhom(nhom4, L) {
  const n = Number(nhom4);
  for (const r of L.pcCuaChuong.get(nhom4.slice(0, 2)) || []) if (n >= Number(r.tu) && n <= Number(r.den)) return r.id;
  return null;
}

/**
 * Đường đi từ Phần xuống tới nút (gồm cả nút). Nút là phan:…, chuong:…, chuong:…:pc:… hoặc bieu:… có thật.
 * @returns {{cap: string, nut: string}[] | null}
 */
function duongDiNut(nutId, L) {
  if (/^phan:[IVX]+$/.test(nutId)) return [{ cap: 'PHAN', nut: nutId }];
  const ch = chuongCuaNut(nutId);
  const p = ch ? CHUONG_SANG_PHAN[ch] : null;
  if (!p) return null;
  const dau = [{ cap: 'PHAN', nut: `phan:${p}` }, { cap: 'CHUONG', nut: `chuong:${ch}` }];
  if (/^chuong:\d{2}$/.test(nutId)) return dau;
  if (/^chuong:\d{2}:pc:[IVX]+$/.test(nutId)) return [...dau, { cap: 'PHAN_CHUONG', nut: nutId }];
  if (!L.theoId.has(nutId)) return null;
  const chuoi = [];
  for (let id = nutId; id && id !== `bieu:${ch}`; id = L.theoId.get(id)?.cha) {
    if (!L.theoId.has(id) || chuoi.length > 12) return null;
    chuoi.unshift({ cap: capCuaNut(id), nut: id });
  }
  const so = soBieu(nutId);
  const pc = so && so.length >= 4 ? pcCuaNhom(so.slice(0, 4), L) : null;
  return [...dau, ...(pc ? [{ cap: 'PHAN_CHUONG', nut: pc }] : []), ...chuoi];
}

/** Đường đi của một mã 4/6/8 số. */
function duongDi(ma, L = napLuat()) {
  const m = chuanMa(ma);
  return m ? duongDiNut(`bieu:${m}`, L) : null;
}

/** Các nút phía trên nút trên đường đi (không gồm chính nó). */
function trenCua(nutId, L) {
  const d = duongDiNut(nutId, L);
  return d ? d.slice(0, -1).map((x) => x.nut) : [];
}

/** Anh em cùng cha của một nút (không gồm nó). Phần không có anh em trong hồ sơ. */
function anhEmCua(nutId, L) {
  if (/^chuong:\d{2}$/.test(nutId)) {
    const p = CHUONG_SANG_PHAN[nutId.slice(7)];
    return (L.chuongCuaPhan.get(p) || []).filter((x) => x !== nutId);
  }
  if (/^chuong:\d{2}:pc:[IVX]+$/.test(nutId)) return (L.pcCuaChuong.get(nutId.slice(7, 9)) || []).map((r) => r.id).filter((x) => x !== nutId);
  const cha = L.theoId.get(nutId)?.cha;
  return cha ? (L.con.get(cha) || []).filter((x) => x !== nutId) : [];
}

/** Con của một nút trên cây (Phần → Chương, Chương → nhóm, nút biểu → nút biểu). */
function conCua(nutId, L) {
  if (/^phan:[IVX]+$/.test(nutId)) return L.chuongCuaPhan.get(nutId.slice(5)) || [];
  if (/^chuong:\d{2}$/.test(nutId)) return L.con.get(`bieu:${nutId.slice(7)}`) || [];
  if (/^chuong:\d{2}:pc:[IVX]+$/.test(nutId)) {
    const r = (L.pcCuaChuong.get(nutId.slice(7, 9)) || []).find((x) => x.id === nutId);
    return r ? (L.con.get(`bieu:${nutId.slice(7, 9)}`) || []).filter((id) => { const n = Number(soBieu(id)?.slice(0, 4)); return n >= Number(r.tu) && n <= Number(r.den); }) : [];
  }
  return L.con.get(nutId) || [];
}

const tenCua = (nutId, L) => L.theoId.get(nutId)?.ten ?? null;

/** Đọc mọi bản ghi của một nút từ các tệp có thể chứa nó. */
function banGhiCuaNut(nutId, hoSo, boNho) {
  const ra = [];
  for (const tm of THU_MUC) {
    const k = tepCuaNut(nutId, tm);
    if (!k) continue;
    const tep = path.join(hoSo, tm, `${k}.jsonl`);
    if (!boNho.has(tep)) boNho.set(tep, docJsonl(tep));
    for (const r of boNho.get(tep)) if (r.nut === nutId) ra.push(r);
  }
  return ra;
}

/**
 * Hồ sơ vấn đề của một mã 4/6/8 số: mọi vấn đề dọc đường đi, xếp theo cấp, kèm anh em ở mỗi cấp.
 * @param {string} ma
 * @param {{luat?: string, hoSo?: string}} [tuyChon]
 */
function hoSo(ma, { luat = LUAT_MAC_DINH, hoSo: thuMucHoSo = HO_SO_MAC_DINH } = {}) {
  const m = chuanMa(ma);
  if (!m) return { khuon: KHUON, ma: String(ma), khongCo: true, loi: 'mã phải có 4, 6 hoặc 8 chữ số' };
  const L = napLuat(luat);
  const d = duongDi(m, L);
  if (!d) return { khuon: KHUON, ma: m, khongCo: true, loi: `bieu:${m} không có trong biểu (kho ${L.thuMuc})` };
  const boNho = new Map();
  const capDuong = d.map(({ cap, nut }) => {
    const bg = banGhiCuaNut(nut, thuMucHoSo, boNho);
    const vanDe = bg.filter((r) => r.loai !== 'BO_QUA');
    return {
      cap,
      nut,
      ten: tenCua(nut, L),
      anhEm: anhEmCua(nut, L).map((x) => ({ nut: x, ten: tenCua(x, L) })),
      vanDe,
      soBoQua: bg.length - vanDe.length,
      chuaKhop: vanDe.filter((r) => r.trangThai !== 'KHOP').map((r) => r.id),
      thieu: bg.length === 0,
    };
  });
  return {
    khuon: KHUON,
    ma: m,
    duong: capDuong,
    thieu: capDuong.filter((c) => c.thieu).map((c) => `${c.cap} ${c.nut}: chưa có vấn đề nào, chưa có BỎ QUA nào`),
    soVanDe: capDuong.reduce((s, c) => s + c.vanDe.length, 0),
  };
}

module.exports = {
  KHUON,
  THU_MUC,
  CHUNG,
  LUAT_MAC_DINH,
  HO_SO_MAC_DINH,
  chuanMa,
  soBieu,
  capCuaNut,
  chuongCuaNut,
  tepCuaNut,
  thuMucCuaNut,
  chuCuaCau,
  napLuat,
  duongDi,
  duongDiNut,
  trenCua,
  anhEmCua,
  conCua,
  docJsonl,
  hoSo,
};
