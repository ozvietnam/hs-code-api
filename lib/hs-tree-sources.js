/**
 * Nguồn tri thức gắn vào từng nút của cây HS (lib/hs-tree.js) — lớp thứ hai của lõi (#236, CEO 11/10/2026).
 *
 * Mỗi nút (phần, chương, nhóm, phân nhóm, tiêu đề quốc gia, lá) biết những tệp nào trong data/ đang nói về nó.
 * Chỉ ĐỌC và ĐẾM, không chép nội dung ra ngoài; nội dung lấy qua module gốc của từng nguồn (lib/wco-op.js, lib/so-tay*,
 * lib/classify…). Nhãn nguồn:
 *   NGUYEN_VAN  — văn bản luật / WCO / SEN nhập nguyên văn (chú giải chương, chú giải nhóm, chú giải phân nhóm, SEN,
 *                 TB-TCHQ, ý kiến WCO, biểu thuế)
 *   DA_KIEM     — người/máy đã kiểm từng mục theo nguồn (sổ tay: máy kiểm trích dẫn + soát độc lập)
 *   AI_CHUA_KIEM — AI sinh, chưa kiểm (explanatory-notes.json, legal-notes-enriched.json, loai-khac-index.en)
 *
 * Phát hiện khi rà 11/10: data/loai-khac-index.json liệt kê anh em SAI ở 1.964/3.383 mã (58 %) vì suy theo gạch; cây mới
 * suy theo chữ số. `anhEmLechCay` ở từng mã để biết chỗ chỉ mục cũ sai.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');
const T = require('./hs-tree');

const cache = {};
function load(name, file, fallback) {
  if (!(name in cache)) {
    try { cache[name] = JSON.parse(fs.readFileSync(dataReadPath(...file), 'utf8')); } catch { cache[name] = fallback; }
  }
  return cache[name];
}
function reset() { for (const k of Object.keys(cache)) delete cache[k]; _idx = null; }

const digits = (v) => String(v == null ? '' : v).replace(/\D/g, '');

let _idx = null;
/** Chỉ mục theo mã của các nguồn không khoá trực tiếp bằng mã (SEN, WCO, TB-TCHQ, sổ tay, chú giải phân nhóm). */
function idx() {
  if (_idx) return _idx;
  const sen = new Map();
  for (const m of Object.values(load('sen', ['sen-2022.json'], { muc: {} }).muc || {})) {
    for (const ma of m.ma || []) { const c = digits(ma); if (!sen.has(c)) sen.set(c, []); sen.get(c).push(m.tieuDe || ''); }
  }
  const wco = new Map();
  for (const o of load('wco', ['wco-op', 'opinions.json'], [])) {
    if (o.headingSuspect) continue; // cổng mã/thứ tự: chỉ ý kiến đã qua cổng (lib/wco-op.js)
    const n = T.nodeOf(String(o.hs)); if (!n) continue;
    wco.set(n.id, (wco.get(n.id) || 0) + 1);
  }
  const tb = new Map();
  for (const [k, v] of Object.entries(load('tb', ['precedents.json'], {}))) {
    const c = digits(k); if (!c) continue;
    tb.set(c, (tb.get(c) || 0) + (Array.isArray(v) ? v.length : 1));
  }
  const soTay = new Map();
  try {
    for (const f of fs.readdirSync(dataReadPath('so-tay'))) {
      if (!/^\d{4}\.json$/.test(f)) continue;
      try { const s = JSON.parse(fs.readFileSync(dataReadPath('so-tay', f), 'utf8')); soTay.set(f.slice(0, 4), { dong8: new Set((s.dong8 || []).map((d) => digits(d.hs))), yKienWco: (s.yKienWco || []).length, phienBan: s.phienBan || null }); } catch { /* bỏ tệp hỏng */ }
    }
  } catch { /* chưa có thư mục */ }
  // Chú giải phân nhóm: khối "Chú giải phân nhóm" trong chú giải nhóm nhắc mã "xxxx.xx" → gắn vào phân nhóm 6 số.
  const sub = new Map();
  for (const [h, e] of Object.entries(load('cg4', ['chu-giai-heading.json'], {}))) {
    const t = String(e?.nhom || ''); const i = t.search(/Chú giải phân nhóm/i); if (i < 0) continue;
    for (const m of t.slice(i).matchAll(/(\d{4})\.(\d{2})/g)) { const c = m[1] + m[2]; if (c.startsWith(digits(h))) sub.set(c, true); }
  }
  _idx = { sen, wco, tb, soTay, sub };
  return _idx;
}

/** Tổng số TB-TCHQ nói về mã này hoặc mã con (khoá 4/6/8 số trong precedents.json). */
function tbCount(node) {
  const { tb } = idx(); let n = 0;
  for (const [k, v] of tb) if (k === node.id || (node.cap !== 8 && k.startsWith(node.id) && /^\d+$/.test(node.id))) n += v;
  return n;
}

/**
 * Nguồn gắn vào một mã/nút. Trả null nếu mã không có trong cây.
 * Mỗi trường: số lượng hoặc true/false; `nhan` ghi loại nguồn để runtime biết được trích hay không.
 */
function sourcesOf(code) {
  const n = T.nodeOf(code); if (!n) return null;
  const I = idx();
  const out = { ma: n.id, cap: n.cap, tenVi: n.tenVi || null, tenEn: n.tenEn || null, suyRa: Boolean(n.suyRa), nguon: {} };
  const put = (k, v, nhan) => { if (v) out.nguon[k] = { ...(typeof v === 'object' ? v : { co: v }), nhan }; };
  const id = n.id;
  if (n.cap === 'PHAN') return out;
  const ch = id.slice(0, 2); const h4 = /^\d{4,}/.test(id) ? id.slice(0, 4) : null;
  const cgc = load('cg2', ['chu-giai-chuong.json'], {})[String(Number(ch))] || load('cg2', ['chu-giai-chuong.json'], {})[ch];
  put('chuGiaiChuong', Boolean(cgc?.chuong), 'NGUYEN_VAN');
  if (n.cap === 2) return out;
  const cg4 = load('cg4', ['chu-giai-heading.json'], {})[h4];
  if (cg4) put('chuGiaiNhom', { co: true, truong: ['nhom', 'bao_gom', 'loai_tru', 'tinh_chat', 'phan_biet', 'sen'].filter((k) => cg4[k]), dayDu: cg4.nhom_day_du === true }, 'NGUYEN_VAN');
  const st = I.soTay.get(h4);
  if (st) put('soTay', { co: true, phienBan: st.phienBan, yKienWco: st.yKienWco, ...(n.cap === 8 ? { dong8: st.dong8.has(id) } : {}) }, 'DA_KIEM');
  if (n.cap === 6 || (n.cap === 8 && n.laPhanNhom && n.laPhanNhom.length === 6)) put('chuGiaiPhanNhom', I.sub.has(n.cap === 6 ? id : n.laPhanNhom), 'NGUYEN_VAN');
  const wcoKey = n.cap === 8 && n.laPhanNhom ? n.laPhanNhom : id;
  put('yKienWco', I.wco.get(wcoKey) || (n.cap === 4 ? I.wco.get(h4) : 0), 'NGUYEN_VAN');
  put('tbTchq', tbCount(n), 'NGUYEN_VAN');
  if (n.cap === 8) {
    put('sen', (I.sen.get(id) || []).length, 'NGUYEN_VAN');
    put('xungDot', Boolean(load('conf', ['conflicts.json'], {})[id]), 'DA_KIEM');
    put('chinhSach', Boolean(load('enr', ['tax-enriched.json'], {})[id]), 'AI_CHUA_KIEM');
    put('explanatoryNotes', Boolean(load('expl', ['explanatory-notes.json'], {})[id]), 'AI_CHUA_KIEM');
    put('legalNotesEnriched', Boolean(load('lne', ['legal-notes-enriched.json'], {})[id]), 'AI_CHUA_KIEM');
    const lk = load('lki', ['loai-khac-index.json'], {})[id];
    if (lk) {
      const cu = new Set((lk.s || []).map((x) => digits(x.h)));
      const cay = new Set(T.siblingsOf(id).filter((x) => x.cap === 8).map((x) => x.id));
      const lech = !(cu.size === cay.size && [...cu].every((x) => cay.has(x)));
      put('loaiKhacIndex', { co: true, anhEmLechCay: lech }, 'AI_CHUA_KIEM');
    }
  }
  return out;
}

/** Độ phủ nguồn theo cấp nút — để báo cáo "lõi còn trống ở đâu". */
function coverage() {
  const t = T.tree();
  const levels = { 2: 'chuong', 4: 'nhom', 6: 'phanNhom', 8: 'la' };
  const out = {};
  for (const n of new Set(t.nodes.values())) {
    const lv = levels[n.cap]; if (!lv) continue;
    const s = sourcesOf(n.id); if (!s) continue;
    const o = (out[lv] ||= { nut: 0, coTenVi: 0 });
    o.nut++; if (n.tenVi) o.coTenVi++;
    for (const [k, v] of Object.entries(s.nguon)) {
      if (v.co === false || v.co === 0) continue;
      o[k] = (o[k] || 0) + 1;
      if (k === 'loaiKhacIndex' && v.anhEmLechCay) o.loaiKhacIndexLech = (o.loaiKhacIndexLech || 0) + 1;
    }
  }
  return out;
}

module.exports = { sourcesOf, coverage, reset };
