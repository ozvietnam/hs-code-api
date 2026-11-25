// lib/do-thi/phai-doc.js — M-34 (#1915): chạm một nút luật là kéo ra đủ trình tự phải đọc thẳng từ kho lớp 1 (ADR-0004, ADR-0005).
//
// Nguồn: đọc thẳng data/luat-goc (các kho .jsonl) + phan-chuong-nhom.json (và dùng chỉ mục dựng sẵn ở tmp/phai-doc-chi-muc.json khi hợp lệ);
// loại bỏ tuyệt đối lớp TIEN_LE. Không hs-tree, không wco-op.js, không tờ khai, không cặp dễ nhầm, không nhận mô tả hàng hay xếp điểm.
// Cạnh cũ (C5, LOAI_TRU, C7, C16 bậc 1, C17) chỉ được giữ khi trích khớp nguyên văn nút luat-goc thuộc phạm vi hai đầu cạnh; không khớp thì bỏ và đếm.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  CHUONG_SANG_PHAN,
  suyBoiCanhNut,
  taoKhoNut,
  rutDanChieuCau,
  dungDoThiDanChieu,
  docKhoLuatGoc,
} = require('./dan-chieu');

const THU_MUC_MAC_DINH = path.dirname(path.resolve(__dirname, '..', '..', 'data', 'luat-goc', 'bieu.jsonl'));
const CHI_MUC_MAC_DINH = path.resolve(__dirname, '..', '..', 'tmp', 'phai-doc-chi-muc.json');
const KHO_HOP_LE_JSONL = Object.freeze(['bieu.jsonl', 'chuong.jsonl', 'gir.jsonl', 'nhom.jsonl', 'phan-nhom.jsonl', 'phan.jsonl', 'sen.jsonl', 'wco.jsonl']);
const LOAI_CU = ['C5', 'LOAI_TRU', 'C7', 'C16', 'C17'];
const TRAN_CANH_CU = 60;
const TRAN_BYTES = 60 * 1024;
const PHIEN_BAN_CHI_MUC = 1;

const chu = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const chuanSo = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().replace(/ ?([-–—/]) ?/g, '$1');
const dinhDangNguon = (ng) => {
  if (!ng) return null;
  if (typeof ng === 'string') return ng;
  const vb = chu(ng.vanBan);
  const ban = chu(ng.ban);
  return [vb, ban ? `(${ban})` : ''].filter(Boolean).join(' ') || null;
};

const trangCuaNut = (n) => (n ? (n.trang !== undefined ? n.trang : (n.nguon?.trang ?? null)) : null);
const nguonCuaNut = (n) => (n ? (n.nguonStr !== undefined ? n.nguonStr : dinhDangNguon(n.nguon)) : null);

/** Rút câu đầu tiên gọn gàng (dùng cho chế độ TOM_GON khi payload vượt 60 KB, không cắt mất mục). */
function cauDauCua(raw, maxLen = 140) {
  const s = chu(raw);
  if (!s) return '';
  const m = /^(.{12,}?[.!?:;])(?:\s|$)/.exec(s);
  const dau = m ? m[1] : s;
  return dau.length > maxLen ? `${dau.slice(0, maxLen - 1)}…` : dau;
}

function docBangPhanChuongNhom(dir) {
  const uuTien = path.join(dir, 'phan-chuong-nhom.json');
  const tep = fs.existsSync(uuTien) ? uuTien : path.join(THU_MUC_MAC_DINH, 'phan-chuong-nhom.json');
  if (!fs.existsSync(tep)) return { muc: [], theoChuong: new Map() };
  const raw = JSON.parse(fs.readFileSync(tep, 'utf8'));
  const muc = Array.isArray(raw.muc) ? raw.muc : [];
  const theoChuong = new Map();
  for (const r of muc) {
    let arr = theoChuong.get(r.chuong);
    if (!arr) { arr = []; theoChuong.set(r.chuong, arr); }
    arr.push(r);
  }
  return { ...raw, muc, theoChuong };
}

function phanChuongCuaNhom(chuong, nhom4, bangPc) {
  const ds = bangPc?.theoChuong?.get(chuong);
  const n = Number.parseInt(nhom4, 10);
  if (!ds || !Number.isFinite(n)) return null;
  for (const r of ds) {
    const tu = Number.parseInt(r.tu, 10);
    const den = Number.parseInt(r.den, 10);
    if (n >= tu && n <= den) return r.phanChuong;
  }
  return null;
}

function thuThapNutPhamViMotDau(code, kho) {
  const raw = String(code || '').replace(/\D/g, '');
  if (raw.length < 2) return [];
  const c2 = raw.slice(0, 2);
  const h4 = raw.length >= 4 ? raw.slice(0, 4) : null;
  const p = CHUONG_SANG_PHAN[c2] || null;
  const ra = [];
  const bCh = kho.theoId.get(`bieu:${c2}`);
  if (bCh) ra.push(bCh);
  if (h4) {
    for (const n of kho.bieuTheoNhom.get(h4) || []) ra.push(n);
    for (const n of kho.nhomCt.get(h4) || []) ra.push(n);
    for (const n of kho.cgpnTheoNhom.get(h4) || []) ra.push(n);
    for (const n of kho.senTheoNhom.get(h4) || []) ra.push(n);
  }
  const cCk = kho.chuongCgKq.get(c2);
  if (cCk) { ra.push(...cCk.cg, ...cCk.kq); }
  for (const n of kho.cgpnChuong.get(c2) || []) ra.push(n);
  for (const r of kho.bangPc.theoChuong.get(c2) || []) {
    for (const n of kho.phanChuongNodes.get(`${c2}:${r.phanChuong}`) || []) ra.push(n);
  }
  for (const n of kho.senChuong.get(c2) || []) ra.push(n);
  if (p) {
    const pCk = kho.phanCgKq.get(p);
    if (pCk) { ra.push(...pCk.cg, ...pCk.kq); }
    for (const n of kho.cgpnPhan.get(p) || []) ra.push(n);
    for (const n of kho.senPhan.get(p) || []) ra.push(n);
  }
  return ra;
}

/**
 * Chỉ khớp trích dẫn cạnh cũ trong nút luat-goc thuộc một trong hai đầu cạnh
 * (`bieu:`/`nhom:`/`pn:`/`sen:` của `tu` hoặc `toi`, Chương và Phần chứa chúng).
 * Tính `chuanSo` lười theo nhu cầu thay vì giữ bản sao chuẩn hoá của cả 47.162 nút trong RAM.
 */
function khopCanhCuTrongPhamVi(rawQuote, tu, toi, khoOrDir = THU_MUC_MAC_DINH) {
  const q = chuanSo(rawQuote);
  if (q.length < 8) return null;
  const kho = typeof khoOrDir === 'string' ? napKho(khoOrDir) : khoOrDir;
  const a = String(tu || '').replace(/\D/g, '');
  const b = String(toi || '').replace(/\D/g, '');
  const keyPair = a <= b ? `${a}|${b}|${q}` : `${b}|${a}|${q}`;
  if (kho.khopPhamViCache.has(keyPair)) return kho.khopPhamViCache.get(keyPair);

  const seenId = new Set();
  const cands = [...thuThapNutPhamViMotDau(a, kho), ...thuThapNutPhamViMotDau(b, kho)];
  let matched = null;
  for (const n of cands) {
    if (!n || seenId.has(n.id)) continue;
    seenId.add(n.id);
    let t = kho.normTheoId.get(n.id);
    if (t === undefined) {
      t = chuanSo(n.nguyenVan);
      kho.normTheoId.set(n.id, t);
    }
    if (t && t.includes(q)) { matched = n; break; }
  }
  kho.khopPhamViCache.set(keyPair, matched);
  return matched;
}

function dinhDangMucNut(nut, tenOverride = null) {
  return {
    id: nut.id,
    nut: nut.id,
    lop: nut.lop,
    trang: trangCuaNut(nut),
    ten: tenOverride || nut.so || nut.id,
    trich: nut.nguyenVan,
    nguon: nguonCuaNut(nut),
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
    trang: trangCuaNut(nut),
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
    trang: trangCuaNut(n),
  };
}

/** Đọc từng dòng UTF-8 trên một tệp mà không giữ mảng chuỗi dòng trong RAM. */
function quetDongJsonl(tep, xuLyDong) {
  const txt = fs.readFileSync(tep, 'utf8');
  let start = 0;
  const len = txt.length;
  while (start < len) {
    let end = txt.indexOf('\n', start);
    if (end === -1) end = len;
    if (end > start) {
      const line = txt.slice(start, end);
      if (line.trim()) xuLyDong(JSON.parse(line));
    }
    start = end + 1;
  }
}

/** Đọc thẳng *.jsonl dưới dạng nút gọn + bảng intern để giảm mạnh dung lượng heap. */
function docNutGon(dir) {
  const strPool = new Map();
  const intern = (s) => {
    if (s == null) return null;
    let v = strPool.get(s);
    if (v === undefined) { v = s; strPool.set(s, v); }
    return v;
  };
  const theoId = new Map();
  let coWcoJsonl = false;
  const tep = KHO_HOP_LE_JSONL.filter((f) => fs.existsSync(path.join(dir, f)));
  for (const f of tep) {
    quetDongJsonl(path.join(dir, f), (n) => {
      if (!n || n.lop === 'TIEN_LE' || String(n.id || '').startsWith('tb:')) return;
      if (f === 'wco.jsonl') coWcoJsonl = true;
      theoId.set(n.id, {
        id: n.id,
        loai: intern(n.loai),
        lop: intern(n.lop),
        cha: n.cha || null,
        so: n.so || null,
        cap: intern(n.cap || null),
        gach: n.gach ?? null,
        nguyenVan: n.nguyenVan,
        trang: n.nguon?.trang ?? null,
        nguonStr: intern(dinhDangNguon(n.nguon)),
      });
    });
  }
  return { theoId, coWcoJsonl };
}

function vanTayThuMuc(dsTep) {
  return dsTep
    .map(([label, fp]) => {
      try {
        const st = fs.statSync(fp);
        return `${label}:${st.size}:${Math.trunc(st.mtimeMs)}`;
      } catch {
        return `${label}:0`;
      }
    })
    .join('|');
}

function tinhSigKho(dir, { gomDoThiCu = false } = {}) {
  const parts = [];
  if (fs.existsSync(dir)) {
    const ds = [];
    for (const f of KHO_HOP_LE_JSONL) {
      const fp = path.join(dir, f);
      if (fs.existsSync(fp)) ds.push([f, fp]);
    }
    const pcn = path.join(dir, 'phan-chuong-nhom.json');
    if (fs.existsSync(pcn)) ds.push(['phan-chuong-nhom.json', pcn]);
    const cauDir = path.join(dir, 'cau');
    if (fs.existsSync(cauDir)) {
      for (const f of fs.readdirSync(cauDir).filter((x) => x.endsWith('.jsonl') && x !== 'thong-bao.jsonl').sort()) {
        ds.push([`cau/${f}`, path.join(cauDir, f)]);
      }
    }
    if (gomDoThiCu) {
      const gocCha = path.resolve(dir, '..');
      const soTayDir = path.join(gocCha, 'so-tay');
      if (fs.existsSync(soTayDir)) {
        const stCount = fs.readdirSync(soTayDir).filter((x) => x.endsWith('.json')).length;
        ds.push([`so-tay-n=${stCount}`, soTayDir]);
      }
      ds.push(['lib/do-thi/index.js', path.join(__dirname, 'index.js')]);
      ds.push(['lib/do-thi/dung-bang-canh.js', path.join(__dirname, 'dung-bang-canh.js')]);
    }
    parts.push(vanTayThuMuc(ds));
  }
  return parts.join('#');
}

function chiMucDuongDan(dir, tuyChon = {}) {
  if (tuyChon.tepChiMuc) return path.resolve(tuyChon.tepChiMuc);
  if (process.env.HS_PHAI_DOC_CACHE) return path.resolve(process.env.HS_PHAI_DOC_CACHE);
  if (path.resolve(dir) === path.resolve(THU_MUC_MAC_DINH)) return CHI_MUC_MAC_DINH;
  return null;
}

/** Dựng cạnh NHAC bằng cách đọc cuốn chiếu thư mục cau (không giữ mảng 68.945 object câu). */
function dungNhacCuonChieu(dir, theoId, khoNut) {
  const cauDir = path.join(dir, 'cau');
  const nhac = [];
  if (fs.existsSync(cauDir)) {
    const files = fs.readdirSync(cauDir).filter((f) => f.endsWith('.jsonl') && f !== 'thong-bao.jsonl').sort();
    for (const f of files) {
      quetDongJsonl(path.join(cauDir, f), (c) => {
        if (!c || !c.id || String(c.id).startsWith('tb:')) return;
        const pos = c.id.lastIndexOf('#');
        const nutId = pos > 0 ? c.id.slice(0, pos) : c.id;
        const n = theoId.get(nutId);
        if (!n) return;
        const text = n.nguyenVan.slice(c.tu, c.den);
        const r = rutDanChieuCau(text, { id: c.id, nutId, loaiNut: n.loai, khoNut });
        for (const e of r.canh) {
          nhac.push([e.tu, e.tuNut, e.den, e.dang, e.trich, c.tu, c.den]);
        }
      });
    }
    return nhac;
  }
  const dt = dungDoThiDanChieu({ nut: [...theoId.values()], khoNut });
  for (const e of dt.canh) {
    nhac.push([e.tu, e.tuNut, e.den, e.dang, e.trich, -1, -1]);
  }
  return nhac;
}

function taoChiMucVanHanh(nhac) {
  const ra = new Map();
  const vao = new Map();
  for (const t of nhac) {
    let a = ra.get(t[1]);
    if (!a) { a = []; ra.set(t[1], a); }
    a.push(t);
    let b = vao.get(t[2]);
    if (!b) { b = []; vao.set(t[2], b); }
    b.push(t);
  }
  return { ra, vao, soCanh: nhac.length };
}

function taoStateCoBan({ dir, laKhoMacDinh, bangPc, theoId, coWcoJsonl, soNutTienLeBiBo = 0, nhac, nhacTuIndex }) {
  const { ra, vao, soCanh } = nhacTuIndex || taoChiMucVanHanh(nhac);
  let coWco = coWcoJsonl;
  const conBieu = new Map();
  const bieuTheoNhom = new Map();
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

  const pushMap = (m, k, v) => {
    let arr = m.get(k);
    if (!arr) { arr = []; m.set(k, arr); }
    arr.push(v);
  };

  for (const n of theoId.values()) {
    if (n.id.startsWith('bieu:')) {
      if (n.cha) pushMap(conBieu, n.cha, n);
      const mB = /^bieu:(\d{4})/.exec(n.id);
      if (mB) pushMap(bieuTheoNhom, mB[1], n);
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
      coWco = true;
      pushMap(wcoTheoNhom, m[1], n);
    }
  }

  return {
    dir,
    laKhoMacDinh,
    bangPc,
    soNutTienLeBiBo,
    doThi: {
      thongKe: { soCanh },
      canhRa(id) { return ra.get(id) || []; },
      canhVao(id) { return vao.get(id) || []; },
    },
    theoId,
    normTheoId: new Map(),
    conBieu,
    bieuTheoNhom,
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
    coWcoJsonl: coWco,
    khopPhamViCache: new Map(),
    layCanhCu: null,
  };
}

function docChiMucHopLe(tepChiMuc, expectedSig) {
  if (!tepChiMuc || !fs.existsSync(tepChiMuc)) return null;
  try {
    const cm = JSON.parse(fs.readFileSync(tepChiMuc, 'utf8'));
    if (!cm || cm.v !== PHIEN_BAN_CHI_MUC) return null;
    if (cm.sig !== expectedSig) return null;
    if (!Array.isArray(cm.nhac) || !Array.isArray(cm.edges) || !cm.byNhom) return null;
    return cm;
  } catch {
    return null;
  }
}

function giaiNenCanhCu(rec) {
  const loai = rec[0];
  const e = { loai, tu: rec[1], toi: rec[2], nguon: rec[4] || undefined };
  const ex = rec[5];
  if ((loai === 'C5' || loai === 'LOAI_TRU') && ex) e.dieuKien = ex;
  else if (loai === 'C7' && Array.isArray(ex)) { e.hoi = ex[0]; e.neuCo = ex[1]; e.neuKhong = ex[2]; }
  else if (loai === 'C16' && Array.isArray(ex)) { e.dacDiem = ex[0]; e.neu = ex[1]; e.thi = ex[2]; e.conNeu = ex[3]; e.thiKia = ex[4]; }
  else if (loai === 'C17' && typeof ex === 'string') { e.trich = ex; }
  return { e, matchedId: rec[3] };
}

/**
 * Dựng sẵn chỉ mục NHAC + cạnh cũ đã kiểm khớp nguyên văn ra tệp JSON (mặc định `tmp/phai-doc-chi-muc.json`).
 * Lần chạy thật chỉ nạp nút gọn + tệp chỉ mục này, không gọi `require('./index')` và không nạp 68.945 câu.
 */
function xayChiMuc({ thuMuc = THU_MUC_MAC_DINH, tepChiMuc } = {}) {
  const dir = path.resolve(thuMuc || THU_MUC_MAC_DINH);
  const outPath = path.resolve(tepChiMuc || process.env.HS_PHAI_DOC_CACHE || CHI_MUC_MAC_DINH);
  const bangPc = docBangPhanChuongNhom(dir);
  const { theoId, coWcoJsonl } = docNutGon(dir);
  const khoNut = taoKhoNut([...theoId.values()]);
  const nhac = dungNhacCuonChieu(dir, theoId, khoNut);

  const state = taoStateCoBan({
    dir,
    laKhoMacDinh: dir === path.resolve(THU_MUC_MAC_DINH),
    bangPc,
    theoId,
    coWcoJsonl,
    soNutTienLeBiBo: 0,
    nhac,
  });

  const D = require('./index');
  const pool = [];
  const poolIdx = new Map();
  const byNhom = {};
  const khoaSet = new Set();
  for (const n of state.theoId.values()) {
    if (n.id.startsWith('bieu:') && (n.cap === 'CHUONG' || n.cap === 'NHOM')) {
      khoaSet.add(n.id.slice(5));
    }
  }

  for (const h4 of [...khoaSet].sort()) {
    let ds = [];
    try { ds = D.canhNgangCuaNhom(h4, LOAI_CU, { caVao: true }); } catch { ds = []; }
    if (!ds.length) continue;

    const tk = { giu: 0, biBo: 0, theoLoai: {} };
    const idxs = [];
    for (const e of ds) {
      const st = tk.theoLoai[e.loai] || { giu: 0, biBo: 0 };
      tk.theoLoai[e.loai] = st;
      if (e.loai === 'C16' && e.bac !== D.BAC.LUAT) {
        st.biBo += 1;
        tk.biBo += 1;
        continue;
      }
      const q = e.loai === 'C16' ? chu(e.canCu?.[0]?.trich) : chu(e.trich);
      const matched = khopCanhCuTrongPhamVi(q, e.tu, e.toi, state);
      if (!matched) {
        st.biBo += 1;
        tk.biBo += 1;
        continue;
      }
      st.giu += 1;
      tk.giu += 1;

      const nguonFb = nguonCuaNut(matched) ? null : (e.nguon || null);
      let extra = null;
      if (e.loai === 'C5' || e.loai === 'LOAI_TRU') extra = chu(e.dieuKien) || null;
      else if (e.loai === 'C7') extra = chu(e.hoi) ? [chu(e.hoi), e.neuCo || null, e.neuKhong || null] : null;
      else if (e.loai === 'C16') extra = [chu(e.dacDiem), chu(e.neu), e.thi, chu(e.conNeu), e.thiKia];
      else if (e.loai === 'C17') extra = chu(e.trich);

      const rec = [e.loai, e.tu, e.toi, matched.id, nguonFb, extra];
      const key = JSON.stringify(rec);
      let idx = poolIdx.get(key);
      if (idx === undefined) {
        idx = pool.length;
        poolIdx.set(key, idx);
        pool.push(rec);
      }
      idxs.push(idx);
    }
    if (idxs.length || tk.biBo) {
      byNhom[h4] = { i: idxs, t: tk };
    }
  }

  const gomDoThiCu = dir === path.resolve(THU_MUC_MAC_DINH);
  const sig = tinhSigKho(dir, { gomDoThiCu });
  const payload = {
    v: PHIEN_BAN_CHI_MUC,
    sig,
    soCanhNhac: nhac.length,
    nhac,
    edges: pool,
    byNhom,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload));
  return {
    tep: outPath,
    bytes: fs.statSync(outPath).size,
    soNut: theoId.size,
    soCanhNhac: nhac.length,
    soCanhCuDuyNhat: pool.length,
    soNhomCoCanh: Object.keys(byNhom).length,
    sig,
  };
}

const _khoCache = new Map();

function datLai() {
  _khoCache.clear();
}

function napKho(thuMuc = THU_MUC_MAC_DINH, tuyChon = {}) {
  const dir = path.resolve(thuMuc || THU_MUC_MAC_DINH);
  const cachePath = chiMucDuongDan(dir, tuyChon);
  const useCache = tuyChon.dungChiMuc !== false && cachePath;
  const cacheKey = useCache ? `${dir}\0${cachePath}` : dir;
  if (_khoCache.has(cacheKey)) return _khoCache.get(cacheKey);

  const laKhoMacDinh = dir === path.resolve(THU_MUC_MAC_DINH);
  if (useCache) {
    const expectedSig = tinhSigKho(dir, { gomDoThiCu: laKhoMacDinh });
    const cm = docChiMucHopLe(cachePath, expectedSig);
    if (cm) {
      const bangPc = docBangPhanChuongNhom(dir);
      const { theoId, coWcoJsonl } = docNutGon(dir);
      const state = taoStateCoBan({
        dir,
        laKhoMacDinh,
        bangPc,
        theoId,
        coWcoJsonl,
        soNutTienLeBiBo: 0,
        nhac: cm.nhac,
      });
      const canhCuTheoNhom = new Map();
      const emptyRes = { giuCanh: [], thongKe: { giu: 0, biBo: 0, theoLoai: {} } };
      state.layCanhCu = (h4) => {
        if (canhCuTheoNhom.has(h4)) return canhCuTheoNhom.get(h4);
        const slot = cm.byNhom[h4];
        if (!slot) { canhCuTheoNhom.set(h4, emptyRes); return emptyRes; }
        const giuCanh = [];
        for (const idx of slot.i) {
          const rec = cm.edges[idx];
          if (!rec) continue;
          const { e, matchedId } = giaiNenCanhCu(rec);
          const matched = state.theoId.get(matchedId);
          if (matched) giuCanh.push({ e, matched });
        }
        const res = { giuCanh, thongKe: slot.t };
        canhCuTheoNhom.set(h4, res);
        return res;
      };
      _khoCache.set(cacheKey, state);
      return state;
    }
  }

  // Nhánh dự phòng không có chỉ mục: vẫn lọc TIEN_LE, đọc cuốn chiếu thư mục cau, nạp lười đồ thị cũ chỉ khi cần
  const bangPc = docBangPhanChuongNhom(dir);
  const khoRaw = fs.existsSync(dir) ? docKhoLuatGoc(dir, { coCau: false }) : { nut: [], cau: [] };
  let soNutTienLeBiBo = 0;
  const theoId = new Map();
  let coWcoJsonl = false;
  for (const n of khoRaw.nut) {
    if (!n || n.lop === 'TIEN_LE' || String(n.id || '').startsWith('tb:')) {
      soNutTienLeBiBo += 1;
      continue;
    }
    if (String(n.id).startsWith('wco:')) coWcoJsonl = true;
    theoId.set(n.id, {
      id: n.id,
      loai: n.loai,
      lop: n.lop,
      cha: n.cha || null,
      so: n.so || null,
      cap: n.cap || null,
      gach: n.gach ?? null,
      nguyenVan: n.nguyenVan,
      trang: n.nguon?.trang ?? null,
      nguonStr: dinhDangNguon(n.nguon),
    });
  }
  khoRaw.nut.length = 0;
  const khoNut = khoRaw.khoNut || taoKhoNut([...theoId.values()]);
  const nhac = fs.existsSync(dir) ? dungNhacCuonChieu(dir, theoId, khoNut) : [];

  const state = taoStateCoBan({
    dir,
    laKhoMacDinh,
    bangPc,
    theoId,
    coWcoJsonl,
    soNutTienLeBiBo,
    nhac,
  });

  const canhCuTheoNhom = new Map();
  let doThiCu = null;
  let napDoThiCuXong = false;
  const layDoThiCu = () => {
    if (napDoThiCuXong) return doThiCu;
    napDoThiCuXong = true;
    if (!laKhoMacDinh) return null;
    try { doThiCu = require('./index'); } catch { doThiCu = null; }
    return doThiCu;
  };

  state.layCanhCu = (h4) => {
    if (canhCuTheoNhom.has(h4)) return canhCuTheoNhom.get(h4);
    const D = layDoThiCu();
    const res = { giuCanh: [], thongKe: { giu: 0, biBo: 0, theoLoai: {} } };
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
      const matched = khopCanhCuTrongPhamVi(q, e.tu, e.toi, state);
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

  _khoCache.set(cacheKey, state);
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

function dinhDangMucNhac(edge, huong, kho) {
  const { theoId } = kho;
  const isTuple = Array.isArray(edge);
  const cauDan = isTuple ? edge[0] : edge.tu;
  const tuNut = isTuple ? edge[1] : edge.tuNut;
  const den = isTuple ? edge[2] : edge.den;
  const dang = isTuple ? edge[3] : edge.dang;
  const trich = isTuple ? edge[4] : edge.trich;
  const cTu = isTuple ? edge[5] : -1;
  const cDen = isTuple ? edge[6] : -1;

  const nutDich = huong === 'RA' ? den : tuNut;
  const src = theoId.get(tuNut);
  const dst = theoId.get(den);
  const cau = (cTu >= 0 && src && typeof src.nguyenVan === 'string')
    ? src.nguyenVan.slice(cTu, cDen)
    : (src?.nguyenVan || trich);

  return {
    id: nutDich,
    nut: nutDich,
    tuNut,
    den,
    cauDan,
    cau,
    dang,
    lop: (huong === 'RA' ? (dst?.lop || src?.lop) : src?.lop) || 'LUAT',
    trang: src ? trangCuaNut(src) : trangCuaNut(dst),
    ten: tenNutLuat(theoId, nutDich),
    trich,
    nguon: nguonCuaNut(src) || tuNut,
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
  if (!phanChuong && chuong && nhom) phanChuong = phanChuongCuaNhom(chuong, nhom, kho.bangPc);

  return { bieuAncestors, phan, chuong, phanChuong, nhom, pn6, dong8 };
}

/** Thu gọn chữ khi payload > 60 KB: giữ 100% số mục, giữ id + lop + trang + câu đầu (lấy đủ theo id). */
function apDungCheDoTomGon(ketQua, maxCauDau = 120) {
  return {
    ...ketQua,
    cheDo: 'TOM_GON',
    layDuTheoId: 'phaiDoc(id, { dayDu: true }) hoặc GET /api/dataset?resource=phai_doc&id=<id>&dayDu=1',
    cungCap: ketQua.cungCap.map((x) => ({ ...x, ten: cauDauCua(x.ten, 60) })),
    trinhTu: ketQua.trinhTu.map((b) => ({
      ...b,
      muc: b.buoc === 'TEN'
        ? b.muc
        : b.muc.map((m) => ({
          id: m.id,
          ...(m.nut && m.nut !== m.id ? { nut: m.nut } : {}),
          lop: m.lop,
          trang: m.trang,
          cauDau: cauDauCua(m.cau || m.trich, maxCauDau),
          ...(m.tuNut ? { tuNut: m.tuNut, den: m.den, cauDan: m.cauDan, dang: m.dang } : {}),
          ...(m.nhan ? { nhan: m.nhan } : {}),
        })),
    })),
  };
}

/**
 * Chạm một nút luật (mã 4–8 số hoặc id đầy đủ như `bieu:7616`, `chuong:76:kq:1`, `sen:1511:1`),
 * kéo ra đủ mọi quy định/chú giải/dẫn chiếu phải đọc theo ADR-0004 & ADR-0005.
 * @param {string} idHoacMa
 * @param {{ thuMuc?: string, dayDu?: boolean, tepChiMuc?: string, dungChiMuc?: boolean }} [tuyChon]
 */
function phaiDoc(idHoacMa, { thuMuc, dayDu = false, tepChiMuc, dungChiMuc } = {}) {
  const kho = napKho(thuMuc, { tepChiMuc, dungChiMuc });
  const nut = giaiQuyetDauVao(idHoacMa, kho);
  if (!nut) return null;

  const { theoId, conBieu, doThi } = kho;
  const ctx = boiCanhCuaNut(nut, kho);
  const ma = nut.id.startsWith('bieu:') ? nut.id.slice(5) : nut.id;

  // 1. Tên nút biểu thuế
  const mucTen = ctx.bieuAncestors.length
    ? ctx.bieuAncestors.map((n) => dinhDangMucNut(n, n.nguyenVan))
    : [dinhDangMucNut(nut, nut.loai === 'TEN' ? nut.nguyenVan : (nut.so || nut.id))];

  // 2. Chú giải Phần (cg trước, kq sau)
  const pCk = ctx.phan ? kho.phanCgKq.get(ctx.phan) : null;
  const mucPhan = pCk ? [...pCk.cg, ...pCk.kq].map((n) => dinhDangMucNut(n)) : [];

  // 3. Chú giải Chương (cg/cgbs trước, kq sau)
  const cCk = ctx.chuong ? kho.chuongCgKq.get(ctx.chuong) : null;
  const mucChuong = cCk ? [...cCk.cg, ...cCk.kq].map((n) => dinhDangMucNut(n)) : [];

  // 4. Phân chương
  const pcNodes = ctx.chuong && ctx.phanChuong ? (kho.phanChuongNodes.get(`${ctx.chuong}:${ctx.phanChuong}`) || []) : [];
  const mucPhanChuong = pcNodes.map((n) => dinhDangMucNut(n, n.loai === 'TEN' ? n.nguyenVan : ctx.phanChuong));

  // 5–8 & 13–14. Cạnh NHAC hai chiều (M-32) + Cạnh cũ lọc nguyên văn theo phạm vi 2 đầu cạnh
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
        trang: trangCuaNut(matched),
        trich: matched.nguyenVan,
        nguon: nguonCuaNut(matched) || e.nguon || matched.id,
      };
      if (e.loai === 'C5' || e.loai === 'LOAI_TRU') {
        (tuMinh ? ra : vao).push({ ...base, ...(chu(e.dieuKien) ? { dieuKien: chu(e.dieuKien) } : {}) });
      } else if (e.loai === 'C7') {
        if (chu(e.hoi)) {
          hoi.push({
            ...base,
            nhan: 'BO_TRO',
            boTro: {
              nhan: 'BO_TRO',
              hoi: chu(e.hoi),
              neuCo: e.neuCo || null,
              neuKhong: e.neuKhong || null,
            },
          });
        }
      } else if (e.loai === 'C16') {
        nghia.push({
          ...base,
          nhan: 'BO_TRO',
          boTro: {
            nhan: 'BO_TRO',
            xet: chu(e.dacDiem),
            neu: chu(e.neu),
            thi: e.thi,
            conNeu: chu(e.conNeu),
            thiKia: e.thiKia,
          },
        });
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
          trang: trangCuaNut(matched),
          ten: tenHoacBieu(kia),
          trich: chu(e.trich),
          nguon: nguonCuaNut(matched) || matched.id,
        });
      }
    }
  }

  // 9. Chú giải chi tiết nhóm
  const mucNhomCt = (ctx.nhom ? (kho.nhomCt.get(ctx.nhom) || []) : []).map((n) => dinhDangMucNut(n));

  // 10. Chú giải phân nhóm (phan:cgpn + chuong:cgpn + pn:<pn6>:ct)
  const dsCgpn = [
    ...(ctx.phan ? (kho.cgpnPhan.get(ctx.phan) || []) : []),
    ...(ctx.chuong ? (kho.cgpnChuong.get(ctx.chuong) || []) : []),
    ...(ctx.pn6 ? (kho.cgpnPn.get(ctx.pn6) || []) : (ctx.nhom ? (kho.cgpnTheoNhom.get(ctx.nhom) || []) : [])),
  ];
  const mucCgpn = dsCgpn.map((n) => dinhDangMucNut(n));

  // 11. SEN
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

  // 12. WCO — chỉ đọc wco.jsonl (không lùi về lib/wco-op.js); rỗng thì nói rỗng
  let mucWco = [];
  if (ctx.nhom && kho.coWcoJsonl) {
    const dsWcoNhom = kho.wcoTheoNhom.get(ctx.nhom) || [];
    const locWco = ctx.pn6
      ? dsWcoNhom.filter((w) => w.id.startsWith(`wco:${ctx.pn6}:`) || w.id.startsWith(`wco:${ctx.nhom}:`))
      : dsWcoNhom;
    mucWco = locWco.map((n) => dinhDangMucNut(n));
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

  const ketQua = {
    id: nut.id,
    ma,
    nhom: ctx.nhom,
    chuong: ctx.chuong,
    phan: ctx.phan,
    phanChuong: ctx.phanChuong,
    ten: nut.nguyenVan,
    lop: nut.lop,
    trang: trangCuaNut(nut),
    cheDo: 'DAY_DU',
    duongDanBieu: ctx.bieuAncestors.map((n) => dongBieuDayDu(n.id, theoId)),
    trinhTu: [
      buoc('TEN', 'Tên nút trong Biểu thuế hiện hành (nút mở đầu theo đường dẫn Chương → Nhóm → Phân nhóm → Dòng).', mucTen),
      buoc('CHU_GIAI_PHAN', 'Chú giải Phần áp cho nút (nếu có: Chú giải cg trước, Khái quát kq sau).', mucPhan),
      buoc('CHU_GIAI_CHUONG', 'Chú giải Chương áp cho nút (Chú giải cg/cgbs trước, Khái quát kq sau).', mucChuong),
      buoc('CHU_GIAI_PHAN_CHUONG', 'Phân chương áp cho nút (nếu Chương có phân chương).', mucPhanChuong),
      buoc('LOAI_TRU_RA', 'Cạnh loại trừ ra đã kiểm khớp nguyên văn nút luat-goc trong phạm vi hai đầu cạnh.', ra, { tran: TRAN_CANH_CU }),
      buoc('LOAI_TRU_VAO', 'Cạnh loại trừ vào đã kiểm khớp nguyên văn nút luat-goc trong phạm vi hai đầu cạnh.', vao, { tran: TRAN_CANH_CU }),
      buoc('NHAC_TOI', 'Mọi dẫn chiếu NHAC đi ra từ nút (đặc biệt kèm câu & câu dẫn theo M-32).', nhacRaMuc),
      buoc('DUOC_NHAC', 'Mọi dẫn chiếu NHAC từ nút khác trỏ tới nút này (hai chiều tất định).', nhacVaoMuc),
      buoc('CHU_GIAI_NHOM', 'Chú giải chi tiết nhóm (từ kho nhom.jsonl khi có).', mucNhomCt),
      buoc('CHU_GIAI_PHAN_NHOM', 'Chú giải phân nhóm (cgpn Phần/Chương và chú giải chi tiết phân nhóm pn).', mucCgpn),
      buoc('SEN', 'Chú giải bổ sung SEN AHTN 2022 áp cho Phần/Chương/Nhóm/Dòng.', mucSen),
      buoc('WCO', kho.coWcoJsonl ? 'Ý kiến phân loại của WCO dưới mã này.' : 'Ý kiến phân loại WCO từ data/luat-goc/wco.jsonl (rỗng vì kho wco.jsonl chưa nạp).', mucWco),
      buoc('PHAN_BIET', 'Câu hỏi tách hai nhóm (lời câu hỏi gắn nhan: BO_TRO đặt riêng ở boTro; xếp cuối sau WCO).', hoi, { tran: TRAN_CANH_CU }),
      buoc('PHAN_BIET_NGHIA', 'Đặc điểm tách hai nhóm đã chấm chéo (phần diễn giải gắn nhan: BO_TRO đặt riêng ở boTro; xếp cuối sau WCO).', nghia, { tran: TRAN_CANH_CU }),
    ],
    cungCap,
    capDuoi,
    quyTac: nut.cap === 'CHUONG' || nut.cap === 'NHOM' || !nut.id.startsWith('bieu:')
      ? 'Quy tắc 1: tên nhóm và chú giải Phần, Chương quyết định; soát loại trừ và dẫn chiếu trước. Nhận nhóm xong mới xuống cấp dưới.'
      : 'Quy tắc 6: chỉ so các dòng CÙNG CẤP gạch trong cùng nhánh, theo lời văn phân nhóm và chú giải phân nhóm.',
    canhCu: canhCuThongKe,
    ghiChu: 'Đọc thẳng các kho luật gốc (.jsonl) (không dùng kho cũ, không tờ khai, không TIEN_LE). Cạnh cũ chỉ giữ khi trích khớp nguyên văn nút luat-goc thuộc phạm vi hai đầu cạnh. Danh sách rỗng nghĩa là kho chưa nạp hoặc luật không nói.',
  };

  if (!dayDu) {
    const bytes = Buffer.byteLength(JSON.stringify(ketQua), 'utf8');
    if (bytes > TRAN_BYTES) {
      return apDungCheDoTomGon(ketQua, 120);
    }
  }
  return ketQua;
}

/** Thống kê tổng hợp toàn kho trên tất cả các nhóm 4 số + phân bố kích thước trả về KB trên mọi bieu: 4/6/8 số. */
function thongKeCanhCu({ thuMuc, tepChiMuc, dungChiMuc } = {}) {
  const kho = napKho(thuMuc, { tepChiMuc, dungChiMuc });
  let giu = 0;
  let biBo = 0;
  const theoLoai = {};
  for (const n of kho.theoId.values()) {
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

  const coMacDinh = [];
  const coDayDu = [];
  let soNutTomGon = 0;
  let maxId = null;
  let maxBytes = 0;
  for (const n of kho.theoId.values()) {
    if (!/^bieu:\d{4,8}$/.test(n.id)) continue;
    const r = phaiDoc(n.id, { thuMuc: kho.dir, tepChiMuc, dungChiMuc });
    const bMacDinh = Buffer.byteLength(JSON.stringify(r), 'utf8');
    coMacDinh.push(bMacDinh);
    if (r.cheDo === 'TOM_GON') soNutTomGon += 1;
    if (bMacDinh > maxBytes) { maxBytes = bMacDinh; maxId = n.id; }
    if (r.cheDo === 'TOM_GON') {
      const rFull = phaiDoc(n.id, { thuMuc: kho.dir, tepChiMuc, dungChiMuc, dayDu: true });
      coDayDu.push(Buffer.byteLength(JSON.stringify(rFull), 'utf8'));
    } else {
      coDayDu.push(bMacDinh);
    }
  }
  coMacDinh.sort((a, b) => a - b);
  coDayDu.sort((a, b) => a - b);
  const toKB = (x) => Number((x / 1024).toFixed(2));

  return {
    soNutHopLe: kho.theoId.size,
    soNutTienLeBiBo: kho.soNutTienLeBiBo,
    soCanhNhac: kho.doThi.thongKe.soCanh,
    canhCuGiu: giu,
    canhCuBiBo: biBo,
    theoLoai,
    coTraVeKB: {
      soNutBieu468: coMacDinh.length,
      nguongKB: toKB(TRAN_BYTES),
      soNutTomGon,
      macDinh: {
        trungViKB: toKB(coMacDinh[Math.floor(coMacDinh.length / 2)] || 0),
        p95KB: toKB(coMacDinh[Math.floor(coMacDinh.length * 0.95)] || 0),
        lonNhatKB: toKB(maxBytes),
        lonNhatId: maxId,
      },
      dayDu: {
        trungViKB: toKB(coDayDu[Math.floor(coDayDu.length / 2)] || 0),
        lonNhatKB: toKB(coDayDu[coDayDu.length - 1] || 0),
      },
    },
  };
}

if (require.main === module && process.argv.includes('--build')) {
  const kq = xayChiMuc();
  console.log('phai-doc chi muc:', JSON.stringify(kq));
}

module.exports = {
  phaiDoc,
  datLai,
  xayChiMuc,
  thongKeCanhCu,
  phanChuongCuaNhom,
  khopCanhCuTrongPhamVi,
  docBangPhanChuongNhom,
  CHI_MUC_MAC_DINH,
  TRAN_BYTES,
};
