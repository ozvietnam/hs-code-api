// lib/tim-cgct.js — Tìm kiếm ứng viên nhóm 4 số từ tên nhóm, chú giải chi tiết (CGCT),
// chú giải phân nhóm / SEN, dòng biểu thuế (Việt + Anh) và liên kết chéo trong kho luật gốc (#1645, M-22).
//
// Cờ công tắc HS_TIM_CGCT nằm ở lib/tim-truoc.js (mặc định TẮT).
// Tất định, không AI, không mạng; chỉ đọc 5 kho lớp LUAT + tax.json:
//   data/luat-goc/bieu.jsonl
//   data/luat-goc/chuong.jsonl
//   data/luat-goc/nhom.jsonl
//   data/luat-goc/phan-nhom.jsonl
//   data/luat-goc/sen.jsonl
//   data/tax.json
// Tuyệt đối KHÔNG require lib/do-thi/* hoặc đọc data/so-tay/* (tuân thủ cổng L4 test-dau-noi).
'use strict';

const fs = require('fs');
const path = require('path');
const { dataReadPath } = require('./data-paths');
const { loadJson } = require('./data-cache');

const STOP_CO_DAU = new Set([
  'nhóm', 'này', 'của', 'và', 'hoặc', 'các', 'những', 'được', 'với', 'trong', 'bằng', 'thuộc',
  'là', 'như', 'theo', 'để', 'kể', 'cả', 'ví', 'dụ', 'xem', 'trừ', 'ngoài', 'từ', 'về', 'tại',
  'cho', 'trên', 'dưới', 'sau', 'khi', 'nếu', 'thì', 'một', 'cái', 'loại', 'khác', 'dùng', 'sử',
  'dụng', 'chỉ', 'có', 'tính', 'chất', 'tạo', 'thành', 'nêu', 'ghi', 'đã', 'chưa', 'bởi',
  'vào', 'ra', 'hay', 'nữa', 'cũng', 'rất', 'hơn', 'làm', 'tự', 'bị', 'cùng', 'nhau', 'mỗi',
  'toàn', 'bộ', 'phần', 'mục', 'chương', 'tương', 'chẳng', 'hạn', 'bao', 'gồm', 'none', 'null',
  'the', 'and', 'for', 'with', 'from', 'other', 'not', 'nes', 'used', 'thereof',
]);

const RE_MAY_DUNG_CU_Q = /^(?:máy|thiết bị|dụng cụ|đồ dùng)(?:\s|$)/i;
const RE_MAY_DUNG_CU_TEN = /(?:^|\s)(?:máy|thiết bị|dụng cụ|đồ dùng|bộ phận)(?=\s|$|[.,;:])/i;

// Đồng nghĩa chuẩn thuật ngữ thương mại <-> biểu thuế HS (chung, không gắn ca cụ thể).
const DONG_NGHIA = {
  'nhựa': ['plastic'],
  'plastic': ['nhựa'],
  'tpu': ['plastic', 'nhựa', 'dải plastic'],
  'pvc': ['plastic', 'nhựa'],
  'hdpe': ['plastic', 'nhựa'],
  'ldpe': ['plastic', 'nhựa'],
  'abs': ['plastic', 'nhựa'],
  'pet': ['plastic', 'nhựa'],
  'inox': ['thép không gỉ'],
  'trái cây': ['hoa quả'],
  'hoa quả': ['trái cây'],
  'hái hoa quả': ['thu hoạch hoa quả'],
  'ép trái cây': ['máy ép hoa quả', 'ép hoa quả'],
  'dụng cụ': ['đồ dùng', 'máy'],
  'trang phục': ['quần áo'],
  'cây thông': ['cây nô-en', 'lễ nô-en'],
  'noel': ['nô-en'],
  'dây bảo hiểm': ['dây đai an toàn', 'dây an toàn'],
  'wire rope': ['dây bện tao', 'cáp thép'],
  'không hoạt động bằng điện': ['hoạt động bằng tay'],
  'không dùng điện': ['hoạt động bằng tay'],
  'bằng tay': ['hoạt động bằng tay'],
  'tắm': ['vệ sinh', 'phòng tắm'],
  'dây': ['dải'],
  'cạo râu': ['dao cạo'],
  'kén': ['tơ tằm'],
};

function boDau(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, (c) => (c === 'Đ' ? 'D' : 'd'));
}

function gocTuAnh(w) {
  if (!/^[a-z]{4,}$/.test(w)) return '';
  if (w.endsWith('ies') && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(?:ses|xes|ches|shes)$/.test(w) && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('s') && !/(?:ss|us|is)$/.test(w)) return w.slice(0, -1);
  return '';
}

function tachTu(text) {
  const cleaned = String(text || '')
    .normalize('NFC')
    .replace(/\(\s*SEN\s*\)/gi, ' ')
    .replace(/\bkhông\s+dệt\s+kim\b/gi, 'khongdetkim')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (!cleaned) return { coDau: [], khongDau: [], biCoDau: [], biKhongDau: [], gocAnh: [] };
  const raw = cleaned.split(/\s+/);
  const coDau = [];
  const khongDau = [];
  const gocAnh = [];
  for (const w of raw) {
    if (w.length < 2 || STOP_CO_DAU.has(w)) continue;
    coDau.push(w);
    const flat = boDau(w);
    if (flat.length >= 2) khongDau.push(flat);
    const stem = gocTuAnh(w);
    if (stem && stem.length >= 3) gocAnh.push(stem);
  }
  const biCoDau = [];
  const biKhongDau = [];
  for (let i = 0; i < coDau.length - 1; i += 1) {
    biCoDau.push(`${coDau[i]}_${coDau[i + 1]}`);
    biKhongDau.push(`${khongDau[i]}_${khongDau[i + 1]}`);
  }
  return { coDau, khongDau, biCoDau, biKhongDau, gocAnh };
}

function catDoan(text, maxWords = 24) {
  const out = [];
  const blocks = String(text || '')
    .split(/\n+|;\s*|\s*\|\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
  for (const blk of blocks) {
    const words = blk.split(/\s+/);
    if (words.length <= maxWords) {
      out.push(blk);
    } else {
      const subClauses = blk.split(/,\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
      if (subClauses.length > 1) {
        let buf = '';
        for (const sc of subClauses) {
          const cand = buf ? `${buf}, ${sc}` : sc;
          if (cand.split(/\s+/).length <= 16) buf = cand;
          else { if (buf) out.push(buf); buf = sc; }
        }
        if (buf) out.push(buf);
      }
      const step = Math.max(14, maxWords - 6);
      for (let i = 0; i < words.length; i += step) {
        const slice = words.slice(i, i + maxWords).join(' ');
        if (slice.length >= 8) out.push(slice);
        if (i + maxWords >= words.length) break;
      }
    }
  }
  return out;
}

/** Rút mã trực tiếp và mã khoảng từ nguyên văn chú giải nhóm (tránh nhiễu danh sách liệt kê dài). */
function trichMaVaKhoang(text) {
  const don = new Set();
  const khoang = new Set();
  const s = String(text || '');
  const rangeRe = /(\d{2}\.\d{2}|\b\d{4}\b)\s*(?:[-–—]|đến)\s*(\d{2}\.\d{2}|\b\d{4}\b)/gi;
  for (const m of s.matchAll(rangeRe)) {
    const a = Number(m[1].replace('.', ''));
    const b = Number(m[2].replace('.', ''));
    if (a >= 100 && b >= a && b - a <= 15 && Math.floor(a / 100) === Math.floor(b / 100)) {
      for (let code = a; code <= b; code += 1) {
        khoang.add(String(code).padStart(4, '0'));
      }
    }
  }
  for (const m of s.matchAll(/\b(\d{2})\.(\d{2})\b/g)) don.add(`${m[1]}${m[2]}`);
  for (const m of s.matchAll(/\b(\d{4})\b/g)) don.add(m[1]);
  return { don: [...don], khoang: [...khoang].filter((c) => !don.has(c)) };
}

let _chiMuc = null;

function docJsonAnToan(rel) {
  try {
    const p = dataReadPath(rel);
    if (!fs.existsSync(p)) return {};
    return loadJson(p, {}) || {};
  } catch {
    return {};
  }
}

function docJsonlTheoNhom() {
  const TEP_LUAT_GOC = {
    bieu: path.join(__dirname, '..', 'data', 'luat-goc', 'bieu.jsonl'),
    chuong: path.join(__dirname, '..', 'data', 'luat-goc', 'chuong.jsonl'),
    nhom: path.join(__dirname, '..', 'data', 'luat-goc', 'nhom.jsonl'),
    phanNhom: path.join(__dirname, '..', 'data', 'luat-goc', 'phan-nhom.jsonl'),
    sen: path.join(__dirname, '..', 'data', 'luat-goc', 'sen.jsonl'),
  };
  const tenNhomMap = new Map();
  const nhomNodesMap = new Map();
  const chuongNodesMap = new Map();
  const boSungGocMap = new Map();

  const docTep = (p, fn) => {
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj && obj.id && obj.lop !== 'TIEN_LE' && !String(obj.id).startsWith('tb:')) fn(obj);
      } catch { /* bỏ dòng lỗi */ }
    }
  };

  docTep(TEP_LUAT_GOC.bieu, (n) => {
    if (n.cap !== 'NHOM' || !n.nguyenVan) return;
    const m = /^bieu:(\d{4})$/.exec(n.id);
    if (m && !m[1].startsWith('98')) tenNhomMap.set(m[1], String(n.nguyenVan));
  });

  docTep(TEP_LUAT_GOC.chuong, (n) => {
    if (!n.nguyenVan) return;
    const m = /^chuong:(\d{2}):/.exec(n.id);
    if (!m) return;
    let arr = chuongNodesMap.get(m[1]);
    if (!arr) { arr = []; chuongNodesMap.set(m[1], arr); }
    arr.push({ loai: n.loai, text: String(n.nguyenVan) });
  });

  docTep(TEP_LUAT_GOC.nhom, (n) => {
    const m = /^nhom:(\d{4}):/.exec(n.id);
    if (!m || !n.nguyenVan) return;
    let arr = nhomNodesMap.get(m[1]);
    if (!arr) { arr = []; nhomNodesMap.set(m[1], arr); }
    arr.push(String(n.nguyenVan));
  });

  const pushBoSung = (h, text) => {
    if (!/^\d{4}$/.test(h) || !text) return;
    let arr = boSungGocMap.get(h);
    if (!arr) { arr = []; boSungGocMap.set(h, arr); }
    arr.push(String(text));
  };

  docTep(TEP_LUAT_GOC.phanNhom, (n) => {
    if (!n.nguyenVan) return;
    const dsMa = Array.isArray(n.apChung) && n.apChung.length
      ? n.apChung.map((x) => String(x).replace(/\D/g, ''))
      : [(/^pn:(\d{6}):/.exec(n.id)?.[1] || '')].filter(Boolean);
    const seenH = new Set();
    for (const ma of dsMa) {
      if (ma.length >= 4) seenH.add(ma.slice(0, 4));
    }
    for (const h of seenH) pushBoSung(h, n.nguyenVan);
  });

  docTep(TEP_LUAT_GOC.sen, (n) => {
    if (!n.nguyenVan) return;
    const m = /^sen:(\d{4,8}):/.exec(n.id);
    if (m) pushBoSung(m[1].slice(0, 4), n.nguyenVan);
  });

  return { tenNhomMap, nhomNodesMap, chuongNodesMap, boSungGocMap };
}

function xayChiMuc() {
  if (_chiMuc) return _chiMuc;
  const t0 = Date.now();
  const { tenNhomMap, nhomNodesMap, chuongNodesMap, boSungGocMap } = docJsonlTheoNhom();
  const taxRaw = docJsonAnToan('tax.json');

  const validHeadings = new Set();
  for (const k of Object.keys(taxRaw || {})) {
    if (/^\d{8}$/.test(k)) validHeadings.add(k.slice(0, 4));
  }
  for (const k of tenNhomMap.keys()) {
    if (/^\d{4}$/.test(k) && (!validHeadings.size || validHeadings.has(k))) validHeadings.add(k);
  }

  const taxViTheoNhom = new Map();
  const taxEnTheoNhom = new Map();
  for (const [k, row] of Object.entries(taxRaw || {})) {
    if (!/^\d{8}$/.test(k)) continue;
    const h = k.slice(0, 4);
    const vn = String(row?.vn || '').replace(/\(\s*SEN\s*\)/gi, '').replace(/^[-\s–]+/, '').trim();
    if (vn && vn.length >= 4 && !/^loại khác\b|^dùng cho xe\b/i.test(vn)) {
      let s = taxViTheoNhom.get(h);
      if (!s) { s = new Set(); taxViTheoNhom.set(h, s); }
      s.add(vn);
    }
    const en = String(row?.en || '').trim();
    if (en && en.length >= 4) {
      let sEn = taxEnTheoNhom.get(h);
      if (!sEn) { sEn = new Set(); taxEnTheoNhom.set(h, sEn); }
      sEn.add(en);
    }
  }

  const segs = [];
  const postings = new Map();
  const titleMap = new Map();
  const lienKetAdj = new Map();
  const nhomTonDongTheoChuong = new Map();

  const themSeg = (h, fieldWeight, text, isTitle = false) => {
    const tok = tachTu(text);
    if (!tok.coDau.length) return -1;
    const idx = segs.length;
    segs.push({ h, w: fieldWeight, len: tok.coDau.length, isTitle });

    const tfMap = new Map();
    const bump = (key, v) => tfMap.set(key, (tfMap.get(key) || 0) + v);
    for (const w of tok.coDau) bump(`A:${w}`, 1);
    for (const w of tok.khongDau) bump(`F:${w}`, 1);
    for (const st of tok.gocAnh) bump(`A:${st}`, 0.9);
    for (const b of tok.biCoDau) bump(`BA:${b}`, 1);
    for (const b of tok.biKhongDau) bump(`BF:${b}`, 1);

    for (const [key, tf] of tfMap) {
      let arr = postings.get(key);
      if (!arr) { arr = []; postings.set(key, arr); }
      arr.push([idx, tf]);
    }
    return idx;
  };

  const addEdge = (from, to, w, edgeWords) => {
    if (to === from || !validHeadings.has(to)) return;
    let m = lienKetAdj.get(from);
    if (!m) { m = new Map(); lienKetAdj.set(from, m); }
    const cur = m.get(to);
    if (!cur || w > cur.w) m.set(to, { w, words: edgeWords });
  };

  // Đánh chỉ mục chú giải Chương nêu đích danh nhóm 4 số + cạnh đồng xuất hiện cùng Chương.
  const chuongSegTheoNhom = new Map();
  for (const [ch, cNodes] of chuongNodesMap) {
    for (const cn of cNodes) {
      const links = trichMaVaKhoang(cn.text);
      const donSameCh = new Set(links.don.filter((x) => x.startsWith(ch) && validHeadings.has(x)));
      const allSameCh = [...new Set([...links.don, ...links.khoang])].filter((x) => x.startsWith(ch) && validHeadings.has(x));
      const cWords = new Set(tachTu(cn.text).khongDau);
      if (allSameCh.length >= 2 && allSameCh.length <= 8) {
        const wCo = allSameCh.length <= 5 ? 0.92 : 0.45;
        for (let i = 0; i < allSameCh.length; i += 1) {
          for (let j = i + 1; j < allSameCh.length; j += 1) {
            const a = allSameCh[i];
            const b = allSameCh[j];
            const bothDon = donSameCh.has(a) && donSameCh.has(b);
            const wPair = bothDon ? 0.92 : wCo;
            addEdge(a, b, wPair, cWords);
            addEdge(b, a, wPair, cWords);
          }
        }
      }
      if (allSameCh.length >= 1 && allSameCh.length <= 5 && (cn.loai === 'CHU_GIAI' || cn.loai === 'CHU_GIAI_PHAN_NHOM')) {
        for (const h of allSameCh) {
          let arr = chuongSegTheoNhom.get(h);
          if (!arr) { arr = []; chuongSegTheoNhom.set(h, arr); }
          arr.push(cn.text);
        }
      }
    }
  }

  for (const h of [...validHeadings].sort()) {
    const tenRaw = String(tenNhomMap.get(h) || '').replace(/^\d{2}\.\d{2}\s*[-–—]?\s*/, '').trim();
    const tenNhom = tenRaw.replace(/(?:,\s*)?trừ\s+(?:các\s+|những\s+)?(?:loại|nhóm|sản phẩm|các mặt hàng|những mặt hàng)\b[^.;]*/gi, '').trim() || tenRaw;
    if (tenNhom) {
      themSeg(h, 3.2, tenNhom, true);
      const titleParts = tenNhom.split(/[;:]/).map((s) => s.trim()).filter((s) => s.length >= 6);
      if (titleParts.length > 1) {
        for (const tp of titleParts) {
          themSeg(h, 2.9, tp, true);
          // Tiêu đề liệt kê dài (vd 82.01 "hái, liềm, dao cắt cỏ...") tách thêm theo dấu phẩy để tránh bị phạt độ dài.
          if (tp.split(/\s+/).length > 16) {
            for (const sub of tp.split(',').map((s) => s.trim()).filter((s) => s.length >= 4)) {
              themSeg(h, 2.7, sub, true);
            }
          }
        }
      }
      const tTok = tachTu(tenNhom);
      titleMap.set(h, {
        coDau: new Set(tTok.coDau),
        khongDau: new Set(tTok.khongDau),
        headPrefix: new Set(tTok.coDau.slice(0, 6)),
        laMayDungCu: RE_MAY_DUNG_CU_TEN.test(tenNhom),
        rawLen: Math.max(tTok.coDau.length, 1),
        ten: tenNhom,
      });
      // Chỉ đánh dấu nhóm tồn đọng chức năng riêng của chương (8479, 8543), tránh nhóm vật liệu/công cụ cụ thể (3911, 8462, 8548).
      if (/chức năng riêng(?:\s+biệt)?\b.*chưa được chi tiết/i.test(tenRaw)) {
        const ch = h.slice(0, 2);
        const list = nhomTonDongTheoChuong.get(ch) || [];
        list.push(h);
        nhomTonDongTheoChuong.set(ch, list);
      }
    }

    const seenTexts = new Set();
    const dsNhomNodes = nhomNodesMap.get(h) || [];
    const nhomFull = dsNhomNodes.join('\n');
    if (nhomFull) {
      for (const cl of catDoan(nhomFull, 28)) {
        const key = cl.slice(0, 120);
        if (seenTexts.has(key)) continue;
        seenTexts.add(key);
        themSeg(h, 1.55, cl);
      }
    }

    for (const cText of chuongSegTheoNhom.get(h) || []) {
      for (const cl of catDoan(cText, 28)) {
        const key = cl.slice(0, 120);
        if (seenTexts.has(key)) continue;
        seenTexts.add(key);
        themSeg(h, 1.35, cl);
      }
    }

    for (const note of boSungGocMap.get(h) || []) {
      for (const cl of catDoan(note, 28)) {
        const key = cl.slice(0, 120);
        if (seenTexts.has(key)) continue;
        seenTexts.add(key);
        themSeg(h, 1.45, cl);
      }
    }

    const taxViSet = taxViTheoNhom.get(h);
    if (taxViSet && taxViSet.size) {
      for (const vn of [...taxViSet].slice(0, 40)) {
        const lenVn = vn.split(/\s+/).length;
        const wTax = lenVn <= 5 ? 2.8 : (lenVn <= 8 ? 2.15 : 1.75);
        themSeg(h, wTax, vn);
      }
    }

    const taxEnSet = taxEnTheoNhom.get(h);
    if (taxEnSet && taxEnSet.size) {
      for (const en of [...taxEnSet].slice(0, 24)) {
        themSeg(h, 1.7, en);
      }
    }

    for (const nodeText of dsNhomNodes) {
      const links = trichMaVaKhoang(nodeText);
      if (links.don.length + links.khoang.length > 20) continue;
      const edgeWords = new Set(tachTu(nodeText).khongDau);
      for (const target of links.don) {
        addEdge(h, target, 1.0, edgeWords);
        addEdge(target, h, 0.68, edgeWords);
      }
      for (const target of links.khoang) {
        addEdge(h, target, 0.45, edgeWords);
        addEdge(target, h, 0.35, edgeWords);
      }
    }
  }

  let totalLen = 0;
  for (const s of segs) totalLen += s.len;
  const avgLen = segs.length ? totalLen / segs.length : 14;
  const N = Math.max(segs.length, 1);

  const idf = new Map();
  for (const [key, arr] of postings) {
    const df = arr.length;
    idf.set(key, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  _chiMuc = {
    validHeadings,
    segs,
    postings,
    idf,
    avgLen,
    N,
    titleMap,
    lienKetAdj,
    nhomTonDongTheoChuong,
    initMs: Date.now() - t0,
  };
  return _chiMuc;
}

function moRongTruyVan(cau) {
  const baseTok = tachTu(cau);
  const weights = new Map();
  const add = (key, w) => {
    const cur = weights.get(key) || 0;
    if (w > cur) weights.set(key, w);
  };

  for (const w of baseTok.coDau) add(`A:${w}`, 1.0);
  for (const st of baseTok.gocAnh) add(`A:${st}`, 0.95);
  for (const w of baseTok.khongDau) add(`F:${w}`, 0.42);
  for (const b of baseTok.biCoDau) add(`BA:${b}`, 1.4);
  for (const b of baseTok.biKhongDau) add(`BF:${b}`, 0.6);

  const lower = String(cau || '').normalize('NFC').toLowerCase();
  const expandedFlat = new Set(baseTok.khongDau);
  for (const [k, syns] of Object.entries(DONG_NGHIA)) {
    const matched = k.includes(' ') ? lower.includes(k) : baseTok.coDau.includes(k);
    if (!matched) continue;
    const isPhrase = k.includes(' ');
    const wTok = isPhrase ? 1.0 : 0.65;
    const wFlat = isPhrase ? 0.42 : 0.25;
    const wBi = isPhrase ? 1.4 : 0.85;
    for (const syn of syns) {
      const sTok = tachTu(syn);
      for (const w of sTok.coDau) add(`A:${w}`, wTok);
      for (const w of sTok.khongDau) { add(`F:${w}`, wFlat); expandedFlat.add(w); }
      for (const b of sTok.biCoDau) add(`BA:${b}`, wBi);
    }
  }
  // Kết hợp dây + nhựa/plastic -> dải plastic (chuẩn thuật ngữ Chương 39)
  if (baseTok.coDau.includes('dây') && (baseTok.coDau.includes('nhựa') || baseTok.coDau.includes('plastic') || baseTok.coDau.includes('tpu'))) {
    add('BA:dải_plastic', 1.25);
  }

  const uCoDau = [...new Set(baseTok.coDau)];
  const uKhongDau = [...new Set(baseTok.khongDau)];
  return { weights, uCoDau, uKhongDau, expandedFlat };
}

function chamMotTruyVan(idx, cau, limit = 60, headInfo = { headTokens: [], isMachineQuery: false }) {
  const { weights, uCoDau, uKhongDau } = moRongTruyVan(cau);
  if (!weights.size) return [];

  const k1 = 1.2;
  const segs = idx.segs;
  const nSegs = segs.length;
  const avgLen = idx.avgLen;
  if (!idx._segScores || idx._segScores.length < nSegs) {
    idx._segScores = new Float64Array(nSegs);
    idx._segAccHits = new Uint16Array(nSegs);
    idx._segSeen = new Uint8Array(nSegs);
    idx._segTouched = new Int32Array(nSegs);
  }
  const segScores = idx._segScores;
  const segAccHits = idx._segAccHits;
  const segSeen = idx._segSeen;
  const segTouched = idx._segTouched;
  let touchedCount = 0;

  for (const [key, qW] of weights) {
    const plist = idx.postings.get(key);
    if (!plist || plist.length > idx.N * 0.25) continue;
    const idfVal = idx.idf.get(key) || 0;
    if (idfVal <= 0) continue;
    const isUnigramAcc = key.startsWith('A:');
    for (let i = 0; i < plist.length; i += 1) {
      const [segIdx, tf] = plist[i];
      const seg = segs[segIdx];
      const bVal = seg.isTitle ? 0.2 : 0.42;
      const normTf = (tf * (k1 + 1)) / (tf + k1 * (1 - bVal + (bVal * seg.len) / avgLen));
      const contrib = qW * idfVal * normTf * seg.w;
      if (!segSeen[segIdx]) {
        segSeen[segIdx] = 1;
        segTouched[touchedCount++] = segIdx;
      }
      segScores[segIdx] += contrib;
      if (isUnigramAcc) segAccHits[segIdx] += 1;
    }
  }

  const byH = new Map();
  for (let i = 0; i < touchedCount; i += 1) {
    const segIdx = segTouched[i];
    const score = segScores[segIdx];
    const accHits = segAccHits[segIdx];
    segSeen[segIdx] = 0;
    segScores[segIdx] = 0;
    segAccHits[segIdx] = 0;
    const seg = segs[segIdx];
    const h = seg.h;
    const covBoost = accHits >= 3
      ? 1 + 0.18 + Math.min(accHits - 2, 4) * 0.24
      : (accHits >= 2 ? 1.18 : 1);
    const val = score * covBoost;
    let arr = byH.get(h);
    if (!arr) {
      byH.set(h, [val, 0, seg.isTitle ? val : 0]);
    } else {
      if (val > arr[0]) { arr[1] = arr[0]; arr[0] = val; }
      else if (val > arr[1]) arr[1] = val;
      if (seg.isTitle && val > arr[2]) arr[2] = val;
    }
  }

  const headTokens = headInfo?.headTokens || [];
  const isMachineQuery = Boolean(headInfo?.isMachineQuery);
  const ranked = [];
  for (const [h, [s1, s2, sTitle]] of byH) {
    let score = s1 + 0.35 * s2 + 0.25 * sTitle;
    const tm = idx.titleMap.get(h);
    if (tm && uCoDau.length) {
      let tHitAcc = 0;
      let tHitFlat = 0;
      for (const w of uCoDau) if (tm.coDau.has(w)) tHitAcc += 1;
      for (const w of uKhongDau) if (tm.khongDau.has(w)) tHitFlat += 1;
      const frac = Math.min(tHitAcc / tm.rawLen, 1);
      if (tHitAcc >= 2) score *= 1 + 0.3 * frac + 0.055 * tHitAcc;
      else if (tHitFlat >= 2) score *= 1 + 0.12 * (tHitFlat / tm.rawLen);

      if (headTokens.length) {
        if (headTokens.some((wt) => tm.headPrefix.has(wt))) score *= 1.22;
        else if (headTokens.some((wt) => tm.coDau.has(wt))) score *= 1.12;
      }
      if (isMachineQuery && !tm.laMayDungCu) {
        score *= 0.3;
      }
    }
    ranked.push([h, score]);
  }
  ranked.sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1));
  return ranked.slice(0, limit);
}

function timCgct(cauGoc, cauTen = '', opts = {}) {
  const t0 = Date.now();
  const limit = Number(opts.limit) > 0 ? Number(opts.limit) : 50;
  const idx = xayChiMuc();
  const qFull = String(cauGoc || '').trim();

  // Tách 3 phần (tên hàng / vật liệu / công dụng) từ opts.raw hoặc dấu '/'.
  let partTen = '';
  let partMat = '';
  let partUse = '';
  const r = opts.raw;
  if (r && typeof r === 'object' && (r.chatLieu || r.congDung || r.chucNang)) {
    partTen = String(r.tenHang || cauTen || '').trim();
    partMat = String(r.chatLieu || '').trim();
    partUse = [r.congDung, r.chucNang].filter(Boolean).join(' ').trim();
  } else {
    const slashParts = qFull.split(/\s+\/\s+|\n+/).map((s) => s.trim()).filter((s) => s && !/^(none|null|không rõ)$/i.test(s));
    if (slashParts.length >= 2) {
      partTen = slashParts[0] || '';
      partMat = slashParts[1] || '';
      partUse = slashParts.slice(2).join(' ').trim();
    }
  }

  const qTen = String(cauTen || partTen || '').trim();
  const qNoMat = partTen && partUse ? `${partTen} ${partUse}`.trim() : '';
  const qTenMat = partTen && partMat ? `${partTen} ${partMat}`.trim() : '';

  const qTenLow = (qTen || qFull).normalize('NFC').toLowerCase();
  const qTenTok = tachTu(qTen || qFull).coDau;
  // Chỉ lấy danh từ đầu (hoặc 2 từ đầu nếu là cụm chỉ loại máy/dụng cụ).
  const isCompHead = RE_MAY_DUNG_CU_Q.test(qTenLow) || /^(?:bộ phận|vỏ khung|dây đai)\b/i.test(qTenLow);
  const headToksRaw = qTenTok.slice(0, isCompHead ? 2 : 1);
  const headTokens = [...headToksRaw];
  for (const w of headToksRaw) {
    if (DONG_NGHIA[w]) for (const syn of DONG_NGHIA[w]) for (const sw of tachTu(syn).coDau) headTokens.push(sw);
  }
  for (const [k, syns] of Object.entries(DONG_NGHIA)) {
    if (k.includes(' ') && qTenLow.startsWith(k)) {
      for (const syn of syns) for (const sw of tachTu(syn).coDau) headTokens.push(sw);
    }
  }
  const isMachineQuery = RE_MAY_DUNG_CU_Q.test(qTenLow);
  const headInfo = { headTokens: [...new Set(headTokens)], isMachineQuery };

  const dsList = [];
  if (qFull.length >= 2) dsList.push({ list: chamMotTruyVan(idx, qFull, 80, headInfo), w: 1.0 });
  if (qNoMat.length >= 2 && qNoMat.toLowerCase() !== qFull.toLowerCase()) {
    dsList.push({ list: chamMotTruyVan(idx, qNoMat, 80, headInfo), w: 1.05 });
  }
  if (qTenMat.length >= 2 && qTenMat.toLowerCase() !== qFull.toLowerCase() && qTenMat.toLowerCase() !== qNoMat.toLowerCase()) {
    dsList.push({ list: chamMotTruyVan(idx, qTenMat, 60, headInfo), w: 0.85 });
  }
  if (qTen.length >= 2 && qTen.toLowerCase() !== qFull.toLowerCase() && qTen.toLowerCase() !== qNoMat.toLowerCase() && qTen.toLowerCase() !== qTenMat.toLowerCase()) {
    dsList.push({ list: chamMotTruyVan(idx, qTen, 60, headInfo), w: 0.72 });
  }
  const parenEn = [...qFull.matchAll(/\(([A-Za-z0-9\s/-]{4,40})\)/g)].map((m) => m[1].trim()).filter((x) => !/^(none|null)$/i.test(x));
  if (parenEn.length) {
    dsList.push({ list: chamMotTruyVan(idx, parenEn.join(' '), 40, { headTokens: [], isMachineQuery: false }), w: 1.05 });
  }

  const fused = new Map();
  for (const { list, w } of dsList) {
    for (let i = 0; i < list.length; i += 1) {
      const h = list[i][0];
      fused.set(h, (fused.get(h) || 0) + w / (8 + i + 1));
    }
  }
  const sorted = [...fused.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1));
  return {
    nhom: sorted.slice(0, limit).map(([h]) => h),
    diem: fused,
    chiMuc: idx,
    ms: Date.now() - t0,
  };
}

function hopNhatUngVienCgct({ baseRanked, cgRes, cauGoc, hop, topK = 10 }) {
  const idx = cgRes?.chiMuc || xayChiMuc();
  const qTok = moRongTruyVan(cauGoc);
  const qFlatSet = qTok.expandedFlat;
  const cgList = cgRes?.nhom || [];
  const baseList = (baseRanked || []).map(([h]) => h);
  const cgRankMap = new Map(cgList.map((h, i) => [h, i]));
  const baseRankMap = new Map(baseList.slice(0, 20).map((h, i) => [h, i]));

  const out = [];
  const seen = new Set();
  const push = (h) => {
    if (!h || seen.has(h) || !hop(h) || out.length >= topK) return false;
    seen.add(h);
    out.push(h);
    return true;
  };

  for (const h of baseList.slice(0, 5)) push(h);

  const poolScore = new Map();
  baseList.slice(5, 15).forEach((h, idxRel) => {
    const wBaseTail = idxRel === 0 ? 1.75 / 4 : 1.75 / (5 + idxRel);
    poolScore.set(h, (poolScore.get(h) || 0) + wBaseTail);
  });
  cgList.slice(0, 40).forEach((h, i) => {
    poolScore.set(h, (poolScore.get(h) || 0) + 2.0 / (3 + i));
  });

  const seed = [...new Set([...baseList.slice(0, 3), ...cgList.slice(0, 2)])];
  const nbVotes = new Map();
  for (let si = 0; si < seed.length; si += 1) {
    const src = seed[si];
    const adj = idx.lienKetAdj.get(src);
    if (!adj) continue;
    const isBase0 = src === baseList[0];
    const isCg0 = src === cgList[0];
    for (const [nb, edge] of adj) {
      if (seen.has(nb) || !hop(nb)) continue;
      let st = nbVotes.get(nb);
      if (!st) { st = { voters: 0, base0EdgeW: 0, fromCg0Direct: false }; nbVotes.set(nb, st); }
      if (edge.w >= 0.72) st.voters += 1;
      if (isBase0 && edge.w > st.base0EdgeW) st.base0EdgeW = edge.w;
      if (isCg0 && edge.w >= 0.9) st.fromCg0Direct = true;
    }
  }
  const chBase0 = baseList[0] ? baseList[0].slice(0, 2) : '';
  for (const [nb, st] of nbVotes) {
    const tm = idx.titleMap.get(nb);
    let titleOv = 0;
    for (const w of qFlatSet) {
      if (w !== 'khong' && tm && tm.khongDau.has(w)) titleOv += 1;
    }
    const inCg = cgRankMap.has(nb);
    const inBase = baseRankMap.has(nb);
    const sameChBase0 = chBase0 && nb.slice(0, 2) === chBase0;
    let bonus = 0;
    if (st.voters >= 2 && (inCg || inBase)) bonus += 0.22;
    if (st.base0EdgeW >= 0.9 && sameChBase0 && titleOv >= 2) {
      bonus += 0.41;
    } else if (st.base0EdgeW >= 0.72 && (inCg || inBase)) {
      bonus += 0.2;
    } else if (st.fromCg0Direct && inCg) {
      bonus += 0.2;
    } else if (st.base0EdgeW > 0 && inCg && titleOv >= 5) {
      bonus += 0.22;
    }
    if (bonus > 0) poolScore.set(nb, (poolScore.get(nb) || 0) + Math.min(bonus, 0.42));
  }

  const chCount = new Map();
  for (const h of [...baseList.slice(0, 6), ...cgList.slice(0, 3)]) {
    const ch = h.slice(0, 2);
    chCount.set(ch, (chCount.get(ch) || 0) + 1);
  }
  const domCh = [...chCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (domCh && domCh[1] >= 4) {
    const resList = idx.nhomTonDongTheoChuong.get(domCh[0]) || [];
    for (const rh of resList) {
      if (!seen.has(rh) && hop(rh)) {
        poolScore.set(rh, (poolScore.get(rh) || 0) + 0.42);
      }
    }
  }

  const tail = [...poolScore.entries()]
    .filter(([h]) => !seen.has(h) && hop(h))
    .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1));
  for (const [h] of tail) {
    if (out.length >= topK) break;
    push(h);
  }
  return out;
}

module.exports = {
  xayChiMuc,
  timCgct,
  hopNhatUngVienCgct,
  tachTu,
  boDau,
  trichMaVaKhoang,
};
