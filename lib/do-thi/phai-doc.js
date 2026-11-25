// lib/do-thi/phai-doc.js — M-34 (#1915): chạm một nút luật là kéo ra đủ trình tự phải đọc thẳng từ kho lớp 1 (ADR-0004, ADR-0005).
//
// Nguồn: đọc thẳng data/luat-goc/*.jsonl qua docKhoLuatGoc + dungDoThiDanChieu (M-32); loại bỏ tuyệt đối lớp TIEN_LE.
// Không dùng lib/hs-tree.js, không tờ khai, không cặp dễ nhầm, không nhận mô tả hàng hay xếp điểm.
// Cạnh cũ (C5, LOAI_TRU, C7, C16, C17) chỉ được giữ khi trích khớp nguyên văn một nút luat-goc; không khớp thì bỏ và đếm.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  CHUONG_SANG_PHAN,
  suyBoiCanhNut,
  taoKhoNut,
  dungDoThiDanChieu,
  docKhoLuatGoc,
} = require('./dan-chieu');

const THU_MUC_MAC_DINH = path.join(__dirname, '..', '..', 'data', 'luat-goc');
const LOAI_CU = ['C5', 'LOAI_TRU', 'C7', 'C16', 'C17'];
const TRAN_CANH_CU = 60;

// Dải nhóm theo Phân chương (đối chiếu từ data/luat-goc/bieu.jsonl trên 7 Chương có :pc:)
const BANG_PHAN_CHUONG_NHOM = {
  '28': [
    ['I', 2801, 2805],
    ['II', 2806, 2811],
    ['III', 2812, 2813],
    ['IV', 2814, 2825],
    ['V', 2826, 2842],
    ['VI', 2843, 2853],
  ],
  '29': [
    ['I', 2901, 2904],
    ['II', 2905, 2906],
    ['III', 2907, 2908],
    ['IV', 2909, 2911],
    ['V', 2912, 2913],
    ['VI', 2914, 2914],
    ['VII', 2915, 2918],
    ['VIII', 2919, 2920],
    ['IX', 2921, 2929],
    ['X', 2930, 2935],
    ['XI', 2936, 2937],
    ['XII', 2938, 2939],
    ['XIII', 2940, 2942],
  ],
  '39': [
    ['I', 3901, 3914],
    ['II', 3915, 3926],
  ],
  '63': [
    ['I', 6301, 6307],
    ['II', 6308, 6308],
    ['III', 6309, 6310],
  ],
  '69': [
    ['I', 6901, 6903],
    ['II', 6904, 6914],
  ],
  '71': [
    ['I', 7101, 7105],
    ['II', 7106, 7112],
    ['III', 7113, 7118],
  ],
  '72': [
    ['I', 7201, 7205],
    ['II', 7206, 7217],
    ['III', 7218, 7223],
    ['IV', 7224, 7229],
  ],
};

const chu = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const chuanSo = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().replace(/ ?([-–—/]) ?/g, '$1');
const dinhDangNguon = (ng) => {
  if (!ng) return null;
  if (typeof ng === 'string') return ng;
  const vb = chu(ng.vanBan);
  const ban = chu(ng.ban);
  return [vb, ban ? `(${ban})` : ''].filter(Boolean).join(' ') || null;
};

function phanChuongCuaNhom(chuong, nhom4) {
  const ds = BANG_PHAN_CHUONG_NHOM[chuong];
  const n = Number.parseInt(nhom4, 10);
  if (!ds || !Number.isFinite(n)) return null;
  for (const [pc, tu, den] of ds) {
    if (n >= tu && n <= den) return pc;
  }
  return null;
}

function tachTuKhoaTim(s) {
  const seen = new Set();
  const ra = [];
  for (const w of s.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length >= 4 && !seen.has(w)) {
      seen.add(w);
      ra.push(w);
    }
  }
  return ra;
}

/** Dựng bộ so khớp nguyên văn ngược nhanh qua chỉ mục từ khóa (>=4 ký tự). */
function taoBoKhopNguyenVan(nutHopLe) {
  const norm = nutHopLe.map((n) => ({ n, text: chuanSo(n.nguyenVan) }));
  const inverted = new Map();
  for (let i = 0; i < norm.length; i += 1) {
    for (const w of tachTuKhoaTim(norm[i].text)) {
      let arr = inverted.get(w);
      if (!arr) { arr = []; inverted.set(w, arr); }
      arr.push(i);
    }
  }
  const cache = new Map();
  return function khop(rawQuote) {
    const q = chuanSo(rawQuote);
    if (q.length < 8) return null;
    if (cache.has(q)) return cache.get(q);

    const kws = tachTuKhoaTim(q).sort((a, b) => (inverted.get(a)?.length || 0) - (inverted.get(b)?.length || 0));
    let matched = null;
    if (kws.length > 0) {
      const ds0 = inverted.get(kws[0]);
      if (ds0 && ds0.length) {
        let ung = ds0;
        if (kws.length > 1) {
          const ds1 = new Set(inverted.get(kws[1]) || []);
          ung = ds0.filter((idx) => ds1.has(idx));
        }
        for (const idx of ung) {
          if (norm[idx].text.includes(q)) { matched = norm[idx].n; break; }
        }
      }
    } else {
      for (const item of norm) {
        if (item.text.includes(q)) { matched = item.n; break; }
      }
    }
    cache.set(q, matched);
    return matched;
  };
}

function dinhDangMucNut(nut, tenOverride = null) {
  return {
    id: nut.id,
    nut: nut.id,
    lop: nut.lop,
    trang: nut.nguon?.trang ?? null,
    ten: tenOverride || nut.so || nut.id,
    trich: nut.nguyenVan,
    nguon: dinhDangNguon(nut.nguon),
  };
}

function dinhDangDongBieu(nut) {
  const ma = nut.id.startsWith('bieu:') ? nut.id.slice(5) : nut.id;
  return {
    id: nut.id,
    ma,
    ten: nut.nguyenVan,
    gach: nut.gach ?? null,
    lop: nut.lop,
    trang: nut.nguon?.trang ?? null,
  };
}

function dongBieuDayDu(id, theoId) {
  const n = theoId.get(id);
  if (!n) return { ma: id, ten: null, lop: null, trang: null };
  return {
    id: n.id,
    ma: n.id.startsWith('bieu:') ? n.id.slice(5) : n.id,
    ten: n.nguyenVan,
    lop: n.lop,
    trang: n.nguon?.trang ?? null,
  };
}

const _khoCache = new Map();

function datLai() {
  _khoCache.clear();
}

function napKho(thuMuc = THU_MUC_MAC_DINH) {
  const dir = path.resolve(thuMuc || THU_MUC_MAC_DINH);
  if (_khoCache.has(dir)) return _khoCache.get(dir);

  const khoRaw = fs.existsSync(dir) ? docKhoLuatGoc(dir) : { nut: [] };
  let soNutTienLeBiBo = 0;
  const nutHopLe = [];
  for (const n of khoRaw.nut) {
    if (!n || n.lop === 'TIEN_LE' || String(n.id || '').startsWith('tb:')) {
      soNutTienLeBiBo += 1;
      continue;
    }
    nutHopLe.push(n);
  }

  const khoNut = taoKhoNut(nutHopLe);
  const doThi = dungDoThiDanChieu({ nut: nutHopLe, khoNut });

  const theoId = new Map();
  const conBieu = new Map();
  const phanCgKq = new Map();
  const chuongCgKq = new Map();
  const phanChuongNodes = new Map();
  const nhomCt = new Map();
  const cgpnPhan = new Map();
  const cgpnChuong = new Map();
  const cgpnPn = new Map();
  const cgpnTheoNhom = new Map();
  const senPhan = new Map();
  const senChuong = new Map();
  const senTheoNhom = new Map();
  const wcoTheoNhom = new Map();
  let coWcoJsonl = false;

  const pushMap = (m, k, v) => {
    let arr = m.get(k);
    if (!arr) { arr = []; m.set(k, arr); }
    arr.push(v);
  };

  for (const n of nutHopLe) {
    theoId.set(n.id, n);

    if (n.id.startsWith('bieu:')) {
      if (n.cha) pushMap(conBieu, n.cha, n);
      continue;
    }

    let m = /^phan:([IVX]+):(cg|kq|cgpn)(?::|$)/.exec(n.id);
    if (m) {
      if (m[2] === 'cgpn') pushMap(cgpnPhan, m[1], n);
      else {
        let b = phanCgKq.get(m[1]);
        if (!b) { b = { cg: [], kq: [] }; phanCgKq.set(m[1], b); }
        b[m[2]].push(n);
      }
      continue;
    }

    m = /^chuong:(\d{2}):pc:([IVX]+)(?::|$)/.exec(n.id);
    if (m) {
      pushMap(phanChuongNodes, `${m[1]}:${m[2]}`, n);
      continue;
    }

    m = /^chuong:(\d{2}):(cg|cgbs|kq|cgpn)(?::|$)/.exec(n.id);
    if (m) {
      if (m[2] === 'cgpn') pushMap(cgpnChuong, m[1], n);
      else {
        let b = chuongCgKq.get(m[1]);
        if (!b) { b = { cg: [], kq: [] }; chuongCgKq.set(m[1], b); }
        b[m[2] === 'kq' ? 'kq' : 'cg'].push(n);
      }
      continue;
    }

    m = /^nhom:(\d{4}):ct:/.exec(n.id);
    if (m) {
      pushMap(nhomCt, m[1], n);
      continue;
    }

    m = /^pn:(\d{6}):ct:/.exec(n.id);
    if (m) {
      pushMap(cgpnPn, m[1], n);
      pushMap(cgpnTheoNhom, m[1].slice(0, 4), n);
      continue;
    }

    if (n.id.startsWith('sen:')) {
      const mP = /^sen:phan:([IVX]+):/.exec(n.id);
      if (mP) { pushMap(senPhan, mP[1], n); continue; }
      const mC = /^sen:chuong:(\d{2}):/.exec(n.id);
      if (mC) { pushMap(senChuong, mC[1], n); continue; }
      const mN = /^sen:(\d{4})(\d{2,4})?:/.exec(n.id);
      if (mN) pushMap(senTheoNhom, mN[1], n);
      continue;
    }

    m = /^wco:(\d{4})\d{0,2}:/.exec(n.id);
    if (m) {
      coWcoJsonl = true;
      pushMap(wcoTheoNhom, m[1], n);
    }
  }

  const khopNguyenVan = taoBoKhopNguyenVan(nutHopLe);
  const canhCuTheoNhom = new Map();
  let doThiCu = null;
  let napDoThiCuXong = false;

  const layDoThiCu = () => {
    if (napDoThiCuXong) return doThiCu;
    napDoThiCuXong = true;
    try { doThiCu = require('./index'); } catch { doThiCu = null; }
    return doThiCu;
  };

  const layCanhCu = (h4) => {
    if (canhCuTheoNhom.has(h4)) return canhCuTheoNhom.get(h4);
    const D = layDoThiCu();
    const res = {
      giuCanh: [],
      thongKe: { giu: 0, biBo: 0, theoLoai: {} },
    };
    if (!D) { canhCuTheoNhom.set(h4, res); return res; }
    let ds = [];
    try { ds = D.canhNgangCuaNhom(h4, LOAI_CU, { caVao: true }); } catch { ds = []; }
    for (const e of ds) {
      const st = res.thongKe.theoLoai[e.loai] || { giu: 0, biBo: 0 };
      res.thongKe.theoLoai[e.loai] = st;
      if (e.loai === 'C16' && e.bac !== D.BAC.LUAT) {
        st.biBo += 1;
        res.thongKe.biBo += 1;
        continue;
      }
      const q = e.loai === 'C16' ? chu(e.canCu?.[0]?.trich) : chu(e.trich);
      const matched = khopNguyenVan(q);
      if (!matched) {
        st.biBo += 1;
        res.thongKe.biBo += 1;
        continue;
      }
      st.giu += 1;
      res.thongKe.giu += 1;
      res.giuCanh.push({ e, matched });
    }
    canhCuTheoNhom.set(h4, res);
    return res;
  };

  const state = {
    dir,
    laKhoMacDinh: dir === path.resolve(THU_MUC_MAC_DINH),
    nutHopLe,
    soNutTienLeBiBo,
    doThi,
    theoId,
    conBieu,
    phanCgKq,
    chuongCgKq,
    phanChuongNodes,
    nhomCt,
    cgpnPhan,
    cgpnChuong,
    cgpnPn,
    cgpnTheoNhom,
    senPhan,
    senChuong,
    senTheoNhom,
    wcoTheoNhom,
    coWcoJsonl,
    layCanhCu,
  };
  _khoCache.set(dir, state);
  return state;
}

function buoc(ma, vi, ds, { tran = Infinity } = {}) {
  const g = [];
  const seen = new Set();
  for (const x of ds) {
    const k = `${x.id || ''}\0${x.nut || ''}\0${x.cauDan || ''}\0${x.trich || ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    g.push(x);
  }
  const cat = Number.isFinite(tran) ? g.slice(0, tran) : g;
  return {
    buoc: ma,
    vi,
    tong: g.length,
    muc: cat,
    ...(Number.isFinite(tran) && g.length > tran ? { conLai: g.length - tran } : {}),
  };
}

function tenNutLuat(theoId, nutId) {
  const n = theoId.get(nutId);
  if (!n) return null;
  return n.loai === 'TEN' ? n.nguyenVan : (n.so || n.id);
}

function dinhDangMucNhac(e, huong, kho) {
  const { doThi, theoId } = kho;
  const nutDich = huong === 'RA' ? e.den : e.tuNut;
  const src = theoId.get(e.tuNut);
  const dst = theoId.get(e.den);
  const cau = doThi.vungTheoCau.get(e.tu)?.text || src?.nguyenVan || e.trich;
  return {
    id: nutDich,
    nut: nutDich,
    tuNut: e.tuNut,
    den: e.den,
    cauDan: e.tu,
    cau,
    dang: e.dang,
    lop: (huong === 'RA' ? (dst?.lop || src?.lop) : src?.lop) || 'LUAT',
    trang: src?.nguon?.trang ?? dst?.nguon?.trang ?? null,
    ten: tenNutLuat(theoId, nutDich),
    trich: e.trich,
    nguon: dinhDangNguon(src?.nguon) || e.tuNut,
  };
}

function giaiQuyetDauVao(idHoacMa, kho) {
  if (idHoacMa == null) return null;
  const raw = String(idHoacMa).trim();
  if (!raw) return null;
  if (raw.includes(':')) {
    return kho.theoId.get(raw) || null;
  }
  const m = raw.replace(/\D/g, '');
  if (m.length < 4 || m.length > 8) return null;
  return kho.theoId.get(`bieu:${m}`) || null;
}

function boiCanhCuaNut(nut, kho) {
  const bieuAncestors = [];
  let phan = null;
  let chuong = null;
  let nhom = null;
  let pn6 = null;
  let dong8 = null;

  if (nut.id.startsWith('bieu:')) {
    let cur = nut;
    while (cur) {
      bieuAncestors.unshift(cur);
      cur = cur.cha ? kho.theoId.get(cur.cha) : null;
    }
    const m = /^bieu:(\d{2,8})(?::|$)/.exec(nut.id)?.[1] || '';
    if (m.length >= 2) chuong = m.slice(0, 2);
    if (m.length >= 4) nhom = m.slice(0, 4);
    if (m.length >= 6) pn6 = m.slice(0, 6);
    if (m.length === 8) dong8 = m;
    phan = chuong ? (CHUONG_SANG_PHAN[chuong] || null) : null;
  } else {
    const ctx = suyBoiCanhNut(nut.id);
    phan = ctx.phan;
    chuong = ctx.chuong;
    nhom = ctx.nhomSo;
    const mPn = /^(?:pn|wco):(\d{6})(?::|$)/.exec(nut.id);
    if (mPn) pn6 = mPn[1];
    const mSen = /^sen:(\d{4,8}):/.exec(nut.id);
    if (mSen) {
      if (mSen[1].length >= 6) pn6 = mSen[1].slice(0, 6);
      if (mSen[1].length === 8) dong8 = mSen[1];
    }
    if (nhom && !chuong) chuong = nhom.slice(0, 2);
    if (chuong && !phan) phan = CHUONG_SANG_PHAN[chuong] || null;
  }

  let phanChuong = /^chuong:\d{2}:pc:([IVX]+)(?::|$)/.exec(nut.id)?.[1] || null;
  if (!phanChuong && chuong && nhom) phanChuong = phanChuongCuaNhom(chuong, nhom);

  return { bieuAncestors, phan, chuong, phanChuong, nhom, pn6, dong8 };
}

/**
 * Chạm một nút luật (mã 4–8 số hoặc id đầy đủ như `bieu:7616`, `chuong:76:cg:1`, `sen:1511:1`),
 * kéo ra đủ mọi quy định/chú giải/dẫn chiếu phải đọc theo ADR-0004 & ADR-0005.
 * @param {string} idHoacMa
 * @param {{ thuMuc?: string }} [tuyChon]
 */
function phaiDoc(idHoacMa, { thuMuc } = {}) {
  const kho = napKho(thuMuc);
  const nut = giaiQuyetDauVao(idHoacMa, kho);
  if (!nut) return null;

  const { theoId, conBieu, doThi } = kho;
  const ctx = boiCanhCuaNut(nut, kho);
  const ma = nut.id.startsWith('bieu:') ? nut.id.slice(5) : nut.id;

  // 1. Tên nút biểu thuế (đường dẫn từ Chương -> nút hiện tại)
  const mucTen = ctx.bieuAncestors.length
    ? ctx.bieuAncestors.map((n) => dinhDangMucNut(n, n.nguyenVan))
    : [dinhDangMucNut(nut, nut.loai === 'TEN' ? nut.nguyenVan : (nut.so || nut.id))];

  // 2. Chú giải Phần (cg trước, kq sau)
  const pCk = ctx.phan ? kho.phanCgKq.get(ctx.phan) : null;
  const mucPhan = pCk ? [...pCk.cg, ...pCk.kq].map((n) => dinhDangMucNut(n)) : [];

  // 3. Chú giải Chương (cg/cgbs trước, kq sau)
  const cCk = ctx.chuong ? kho.chuongCgKq.get(ctx.chuong) : null;
  const mucChuong = cCk ? [...cCk.cg, ...cCk.kq].map((n) => dinhDangMucNut(n)) : [];

  // 4. Phân chương (nếu Chương có :pc: và nút thuộc Phân chương đó)
  const pcNodes = ctx.chuong && ctx.phanChuong ? (kho.phanChuongNodes.get(`${ctx.chuong}:${ctx.phanChuong}`) || []) : [];
  const mucPhanChuong = pcNodes.map((n) => dinhDangMucNut(n, n.loai === 'TEN' ? n.nguyenVan : ctx.phanChuong));

  // 5–8 & 9–10. Cạnh NHAC hai chiều (M-32) + Cạnh cũ lọc nguyên văn luat-goc
  const nhacRaMuc = [];
  const nhacVaoMuc = [];
  const idsMuc = [nut.id];
  if (nut.id === `bieu:${ctx.nhom}` && ctx.nhom) {
    for (const ct of kho.nhomCt.get(ctx.nhom) || []) idsMuc.push(ct.id);
  }
  for (const nid of idsMuc) {
    for (const e of doThi.canhRa(nid)) nhacRaMuc.push(dinhDangMucNhac(e, 'RA', kho));
    for (const e of doThi.canhVao(nid)) nhacVaoMuc.push(dinhDangMucNhac(e, 'VAO', kho));
  }

  const ra = [];
  const vao = [];
  const hoi = [];
  const nghia = [];
  let canhCuThongKe = { giu: 0, biBo: 0, theoLoai: {} };

  const khoaCanhCu = nut.id.startsWith('bieu:') ? (ctx.nhom || ctx.chuong) : null;
  if (khoaCanhCu) {
    const cu = kho.layCanhCu(khoaCanhCu);
    canhCuThongKe = cu.thongKe;
    const dangBieu = ma.replace(/:td\d+$/, '');
    const cungNhanh = (a, b) => a.startsWith(b) || b.startsWith(a);
    const tenHoacBieu = (n) => theoId.get(`bieu:${n}`)?.nguyenVan || tenNutLuat(theoId, `bieu:${n}`) || null;

    for (const { e, matched } of cu.giuCanh) {
      const tuMinh = e.tu.slice(0, 4) === khoaCanhCu;
      const minh = tuMinh ? e.tu : e.toi;
      const kia = tuMinh ? e.toi : e.tu;
      if (!cungNhanh(minh, dangBieu)) continue;
      const dichId = `bieu:${kia}`;
      const base = {
        id: matched.id,
        nut: theoId.has(dichId) ? dichId : kia,
        ten: tenHoacBieu(kia),
        lop: matched.lop,
        trang: matched.nguon?.trang ?? null,
        trich: matched.nguyenVan,
        nguon: dinhDangNguon(matched.nguon) || e.nguon || matched.id,
      };
      if (e.loai === 'C5' || e.loai === 'LOAI_TRU') {
        (tuMinh ? ra : vao).push({ ...base, ...(chu(e.dieuKien) ? { dieuKien: chu(e.dieuKien) } : {}) });
      } else if (e.loai === 'C7') {
        if (chu(e.hoi)) hoi.push({ ...base, hoi: chu(e.hoi), neuCo: e.neuCo || null, neuKhong: e.neuKhong || null });
      } else if (e.loai === 'C16') {
        nghia.push({ ...base, xet: chu(e.dacDiem), neu: chu(e.neu), thi: e.thi, conNeu: chu(e.conNeu), thiKia: e.thiKia });
      } else if (e.loai === 'C17') {
        const srcId = theoId.has(`bieu:${e.tu}`) ? `bieu:${e.tu}` : matched.id;
        const destId = theoId.has(`bieu:${e.toi}`) ? `bieu:${e.toi}` : e.toi;
        (tuMinh ? nhacRaMuc : nhacVaoMuc).push({
          id: matched.id,
          nut: tuMinh ? destId : srcId,
          tuNut: srcId,
          den: destId,
          cauDan: matched.id,
          cau: matched.nguyenVan,
          lop: matched.lop,
          trang: matched.nguon?.trang ?? null,
          ten: tenHoacBieu(kia),
          trich: chu(e.trich),
          nguon: dinhDangNguon(matched.nguon) || matched.id,
        });
      }
    }
  }

  // 11. Chú giải chi tiết nhóm
  const mucNhomCt = (ctx.nhom ? (kho.nhomCt.get(ctx.nhom) || []) : []).map((n) => dinhDangMucNut(n));

  // 12. Chú giải phân nhóm (phan:cgpn + chuong:cgpn + pn:<pn6>:ct)
  const dsCgpn = [
    ...(ctx.phan ? (kho.cgpnPhan.get(ctx.phan) || []) : []),
    ...(ctx.chuong ? (kho.cgpnChuong.get(ctx.chuong) || []) : []),
    ...(ctx.pn6 ? (kho.cgpnPn.get(ctx.pn6) || []) : (ctx.nhom ? (kho.cgpnTheoNhom.get(ctx.nhom) || []) : [])),
  ];
  const mucCgpn = dsCgpn.map((n) => dinhDangMucNut(n));

  // 13. SEN (Phần + Chương + Nhóm/Phân nhóm/Dòng khớp phạm vi)
  const dsSen = [
    ...(ctx.phan ? (kho.senPhan.get(ctx.phan) || []) : []),
    ...(ctx.chuong ? (kho.senChuong.get(ctx.chuong) || []) : []),
  ];
  if (ctx.nhom) {
    for (const s of kho.senTheoNhom.get(ctx.nhom) || []) {
      const mCode = /^sen:(\d{4,8}):/.exec(s.id)?.[1] || '';
      if (ctx.dong8) {
        if (mCode === ctx.nhom || mCode === ctx.pn6 || mCode === ctx.dong8) dsSen.push(s);
      } else if (ctx.pn6) {
        if (mCode === ctx.nhom || mCode.startsWith(ctx.pn6)) dsSen.push(s);
      } else {
        dsSen.push(s);
      }
    }
  }
  const mucSen = dsSen.map((n) => dinhDangMucNut(n));

  // 14. WCO (ưu tiên wco.jsonl trong thuMuc; nếu chưa có trên kho mặc định thì lấy qua lib/wco-op.js)
  let mucWco = [];
  if (ctx.nhom) {
    if (kho.coWcoJsonl) {
      const dsWcoNhom = kho.wcoTheoNhom.get(ctx.nhom) || [];
      const locWco = ctx.pn6
        ? dsWcoNhom.filter((w) => w.id.startsWith(`wco:${ctx.pn6}:`) || w.id.startsWith(`wco:${ctx.nhom}:`))
        : dsWcoNhom;
      mucWco = locWco.map((n) => dinhDangMucNut(n));
    } else if (kho.laKhoMacDinh) {
      try {
        const wco = require('../wco-op');
        const key = ctx.pn6 || ctx.nhom;
        mucWco = wco.byHs(key).map((o) => ({
          id: `wco:${o.hs}:${o.ord}`,
          nut: o.hs,
          lop: 'HUONG_DAN',
          trang: o.page ?? null,
          ten: `${o.hs}/${o.ord}`,
          trich: o.text || `Ý kiến WCO ${o.hs}/${o.ord}`,
          nguon: `wco-op/${o.hs}/${o.ord}`,
        }));
      } catch {
        mucWco = [];
      }
    }
  }

  // Cùng cấp gạch và cấp dưới lấy hoàn toàn từ kho bieu.jsonl (không hs-tree)
  const capDuoi = nut.id.startsWith('bieu:')
    ? (conBieu.get(nut.id) || []).map(dinhDangDongBieu)
    : [];
  const cungCap = nut.id.startsWith('bieu:') && nut.cha
    ? (conBieu.get(nut.cha) || [])
      .filter((x) => x.id !== nut.id && (nut.gach == null || x.gach === nut.gach))
      .map(dinhDangDongBieu)
    : [];

  return {
    id: nut.id,
    ma,
    nhom: ctx.nhom,
    chuong: ctx.chuong,
    phan: ctx.phan,
    phanChuong: ctx.phanChuong,
    ten: nut.nguyenVan,
    lop: nut.lop,
    trang: nut.nguon?.trang ?? null,
    duongDanBieu: ctx.bieuAncestors.map((n) => dongBieuDayDu(n.id, theoId)),
    trinhTu: [
      buoc('TEN', 'Tên nút trong Biểu thuế hiện hành (nút mở đầu theo đường dẫn Chương → Nhóm → Phân nhóm → Dòng).', mucTen),
      buoc('CHU_GIAI_PHAN', 'Chú giải Phần áp cho nút (nếu có: Chú giải cg trước, Khái quát kq sau).', mucPhan),
      buoc('CHU_GIAI_CHUONG', 'Chú giải Chương áp cho nút (Chú giải cg/cgbs trước, Khái quát kq sau).', mucChuong),
      buoc('CHU_GIAI_PHAN_CHUONG', 'Phân chương áp cho nút (nếu Chương có phân chương).', mucPhanChuong),
      buoc('LOAI_TRU_RA', 'Cạnh loại trừ ra đã kiểm khớp nguyên văn nút luat-goc.', ra, { tran: TRAN_CANH_CU }),
      buoc('LOAI_TRU_VAO', 'Cạnh loại trừ vào đã kiểm khớp nguyên văn nút luat-goc.', vao, { tran: TRAN_CANH_CU }),
      buoc('NHAC_TOI', 'Mọi dẫn chiếu NHAC đi ra từ nút (đặc biệt kèm câu & câu dẫn theo M-32).', nhacRaMuc),
      buoc('DUOC_NHAC', 'Mọi dẫn chiếu NHAC từ nút khác trỏ tới nút này (hai chiều tất định).', nhacVaoMuc),
      buoc('PHAN_BIET', 'Câu hỏi tách hai nhóm (chỉ giữ cạnh khớp nguyên văn luat-goc).', hoi, { tran: TRAN_CANH_CU }),
      buoc('PHAN_BIET_NGHIA', 'Đặc điểm tách hai nhóm đã chấm chéo (chỉ giữ cạnh khớp nguyên văn luat-goc).', nghia, { tran: TRAN_CANH_CU }),
      buoc('CHU_GIAI_NHOM', 'Chú giải chi tiết nhóm (từ kho nhom.jsonl khi có).', mucNhomCt),
      buoc('CHU_GIAI_PHAN_NHOM', 'Chú giải phân nhóm (cgpn Phần/Chương và chú giải chi tiết phân nhóm pn).', mucCgpn),
      buoc('SEN', 'Chú giải bổ sung SEN AHTN 2022 áp cho Phần/Chương/Nhóm/Dòng.', mucSen),
      buoc('WCO', 'Ý kiến phân loại của WCO dưới mã này.', mucWco),
    ],
    cungCap,
    capDuoi,
    quyTac: nut.cap === 'CHUONG' || nut.cap === 'NHOM' || !nut.id.startsWith('bieu:')
      ? 'Quy tắc 1: tên nhóm và chú giải Phần, Chương quyết định; soát loại trừ và dẫn chiếu trước. Nhận nhóm xong mới xuống cấp dưới.'
      : 'Quy tắc 6: chỉ so các dòng CÙNG CẤP gạch trong cùng nhánh, theo lời văn phân nhóm và chú giải phân nhóm.',
    canhCu: canhCuThongKe,
    ghiChu: 'Đọc thẳng data/luat-goc/*.jsonl (không hs-tree, không tờ khai, không TIEN_LE). Cạnh cũ chỉ giữ khi trích khớp nguyên văn nút luat-goc. Danh sách rỗng nghĩa là kho/chủ điểm đó chưa có cạnh hoặc đang chờ tệp kho tương ứng, không có nghĩa là luật không nói.',
  };
}

/** Thống kê tổng hợp toàn kho trên tất cả các nhóm 4 số (phục vụ báo cáo & test). */
function thongKeCanhCu({ thuMuc } = {}) {
  const kho = napKho(thuMuc);
  let giu = 0;
  let biBo = 0;
  const theoLoai = {};
  for (const n of kho.nutHopLe) {
    if (!n.id.startsWith('bieu:') || n.cap !== 'NHOM') continue;
    const { thongKe } = kho.layCanhCu(n.id.slice(5));
    giu += thongKe.giu;
    biBo += thongKe.biBo;
    for (const [k, v] of Object.entries(thongKe.theoLoai)) {
      const m = theoLoai[k] || { giu: 0, biBo: 0 };
      m.giu += v.giu;
      m.biBo += v.biBo;
      theoLoai[k] = m;
    }
  }
  return {
    soNutHopLe: kho.nutHopLe.length,
    soNutTienLeBiBo: kho.soNutTienLeBiBo,
    soCanhNhac: kho.doThi.thongKe.soCanh,
    canhCuGiu: giu,
    canhCuBiBo: biBo,
    theoLoai,
  };
}

module.exports = { phaiDoc, datLai, thongKeCanhCu, BANG_PHAN_CHUONG_NHOM, phanChuongCuaNhom };
