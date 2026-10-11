/**
 * Cây quan hệ HS 4 → (nhóm một gạch) → 6 → (tiêu đề quốc gia) → 8, dựng lại từ chính biểu thuế (#236).
 *
 * VÌ SAO TỰ DỰNG ĐƯỢC (CEO chốt 11/10/2026: "phải tự định nghĩa"):
 * data/tax.json chỉ có 11.871 dòng LÁ 8 số; mọi dòng tiêu đề trung gian (kết thúc ":") đã bị lược lúc nhập.
 * Nhưng cấu trúc KHÔNG mất, vì mã số mang nó:
 *   - chữ số 5–6 là phân nhóm WCO. Quy ước HS: `xxxx.x0` là phân nhóm MỘT gạch (con trực tiếp của nhóm);
 *     `xxxx.xy` (y≠0) là phân nhóm HAI gạch, nằm dưới nhóm một gạch `xxxx.x` (không có mã riêng); `xxxx.00` = nhóm
 *     không chia. Kiểm trên biểu thuế 2026: 5.700/5.784 phân nhóm khớp; lệch là chương 98 (chương riêng VN) và
 *     vài dòng mất gạch trong dữ liệu — cả hai vẫn đặt đúng chỗ nhờ chữ số.
 *   - chữ số 7 là cấp quốc gia thứ nhất: `…z0` là dòng lá; `…z1..9` nằm dưới một tiêu đề quốc gia `xxxxxxz`
 *     (tên bị lược; z = 9 theo quy ước AHTN gần như luôn là "Loại khác:").
 *   - chữ số 8 là cấp quốc gia thứ hai (lá).
 *   - trên nhóm: chữ số 1–2 là chương; phần lấy từ data/hs-sections.json.
 * CEO chốt 11/10/2026: quan hệ ĂN THẲNG VÀO SỐ. Số gạch chỉ là TẦNG HIỂN THỊ (ghi lại ở `gach` để in), KHÔNG là căn cứ
 * cấu trúc: không lần ngược lên dòng ít gạch hơn (cạm bẫy ở lib/hs-breadcrumb.js: 85041000 bị gán làm cha của
 * 85044090), không gom nhóm theo gạch khi gạch sâu hơn chữ số (85043121/22 và 85043123/24/29 đều là anh em dưới
 * 8504312). Chỗ gạch lệch với chữ số chỉ ghi vào `anomalies` làm ghi chú chất lượng dữ liệu.
 *
 * Nút ảo (tiêu đề bị lược) có `tenVi: null, suyRa: true`; tên tiếng Anh của nhóm/phân nhóm lấy nguyên văn từ
 * data/wco-hs-international.csv. Không bịa tên: nơi nào không có nguồn thì để null, phạm vi được định nghĩa bằng
 * quan hệ (cha trừ anh em) — xem loaiKhacOf().
 */
const { readFileSync } = require('fs');
const { join } = require('path');
const { taxData } = require('./data');
const { indentationLevel } = require('./gir-specificity');

let cache = null;

const digits = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const stripDashes = (vn) => String(vn || '').replace(/^[-\s]+/, '').trim();
/** "Loại khác" TRẦN (có thể kèm "(SEN)") — dòng dư kết thúc nhóm anh em. "Loại khác, dùng cho…" là dòng dư CÓ ĐIỀU KIỆN, không tính. */
const isBareOther = (vn) => /^lo[aạ]i kh[aá]c\s*(\(SEN\))?\s*$/i.test(stripDashes(vn));
const isOther = (vn) => /^lo[aạ]i kh[aá]c\b/i.test(stripDashes(vn));

function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function wcoNames() {
  const m = new Map();
  try {
    const lines = readFileSync(join(__dirname, '..', 'data', 'wco-hs-international.csv'), 'utf8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const [, code, desc] = parseCsvLine(lines[i]);
      if (code) m.set(code.trim(), (desc || '').trim());
    }
  } catch { /* thiếu tệp → chỉ không có tên tiếng Anh */ }
  return m;
}

/** Tên tiếng Việt của chương từ dòng đầu chú giải chương ("Chương 85: Máy điện…"). */
function chapterNamesVi() {
  const m = new Map();
  try {
    const cg = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'chu-giai-chuong.json'), 'utf8'));
    for (const [ch, v] of Object.entries(cg)) {
      const first = String(v?.chuong || '').split('\n')[0];
      const t = first.match(/^Chương\s*\d+\s*[:.\-–]\s*(.+)$/i);
      if (t) m.set(String(ch).padStart(2, '0'), t[1].trim());
    }
  } catch { /* thiếu tệp → không có tên tiếng Việt chương */ }
  return m;
}

function sections() {
  try { return JSON.parse(readFileSync(join(__dirname, '..', 'data', 'hs-sections.json'), 'utf8')).sections || []; } catch { return []; }
}

/** Tên tiếng Việt của nhóm 4 số từ chú giải nhóm (`ten_nhom`: "85.04 - Máy biến điện…"), bỏ tiền tố mã. */
function headingNamesVi() {
  const m = new Map();
  try {
    const cg = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'chu-giai-heading.json'), 'utf8'));
    for (const [h, e] of Object.entries(cg)) {
      const t = String(e?.ten_nhom || '').replace(/^\s*\d{2}\.\d{2}\s*[-–:]\s*/, '').trim();
      if (t) m.set(String(h).replace(/\D/g, '').slice(0, 4), t);
    }
  } catch { /* thiếu tệp → không có tên tiếng Việt nhóm */ }
  return m;
}

function build() {
  const wco = wcoNames();
  const chVi = chapterNamesVi();
  const h4Vi = headingNamesVi();
  const nodes = new Map();
  const anomalies = [];
  const mk = (id, extra) => { const n = { id, children: [], ...extra }; nodes.set(id, n); return n; };
  const ensure = (id, make) => nodes.get(id) || make();
  const attach = (child, parentId) => { child.parent = parentId; nodes.get(parentId).children.push(child.id); };

  // Phần (I…XXI) → chương (2 số): khung trên của cây, từ data/hs-sections.json + chú giải chương.
  const sectionOfChapter = new Map();
  for (const sec of sections()) {
    const id = `P:${sec.code}`;
    mk(id, { cap: 'PHAN', depth: -2, parent: null, tenVi: sec.titleVi || null, tenEn: null, suyRa: false, ma: sec.code });
    for (const ch of sec.chapters || []) sectionOfChapter.set(String(ch).padStart(2, '0'), id);
  }

  const codes = Object.keys(taxData).filter((c) => /^\d{8}$/.test(c)).sort();
  // Nhóm một gạch `xxxxx` chỉ tồn tại khi có phân nhóm hai gạch `xxxxxy` (y≠0).
  for (const c of codes) {
    const ch2 = c.slice(0, 2); const h4 = c.slice(0, 4); const s6 = c.slice(0, 6); const g5 = c.slice(0, 5);
    const z6 = c[5]; const z7 = c[6]; const z8 = c[7];
    ensure(ch2, () => { const n = mk(ch2, { cap: 2, depth: -1, parent: null, tenEn: wco.get(ch2) || null, tenVi: chVi.get(ch2) || null, suyRa: false }); const p = sectionOfChapter.get(ch2); if (p) attach(n, p); return n; });
    ensure(h4, () => { const n = mk(h4, { cap: 4, depth: 0, tenEn: wco.get(h4) || null, tenVi: h4Vi.get(h4) || null, suyRa: false }); attach(n, ch2); return n; });
    // ── cấp 6 (WCO): độ sâu và cha của phân nhóm theo quy ước chữ số ──
    const khongChia = s6 === `${h4}00`;
    const d6 = khongChia ? 0 : z6 === '0' ? 1 : 2;
    let cha6 = h4;
    if (d6 === 2) cha6 = ensure(g5, () => { const n = mk(g5, { cap: 'NHOM_MOT_GACH', depth: 1, tenEn: null, tenVi: null, suyRa: true }); attach(n, h4); return n; }).id;
    const vn = taxData[c].vn;
    const d = indentationLevel(vn);
    const leaf = mk(c, { cap: 8, tenVi: stripDashes(vn), gach: d, loaiKhac: isOther(vn), loaiKhacTran: isBareOther(vn), suyRa: false });
    // ── cấp quốc gia ──
    if (z7 === '0' && z8 === '0') {
      // Một dòng duy nhất: lá CHÍNH LÀ phân nhóm 6 số (hoặc nhóm không chia). Không tạo nút 6 số riêng; mã 6 số
      // trỏ thẳng vào lá (nodeOf('853932') → 85393200).
      leaf.depth = d6; leaf.laPhanNhom = khongChia ? h4 : s6; leaf.tenEn = wco.get(s6) || null;
      attach(leaf, cha6);
      if (!khongChia) nodes.set(s6, leaf);
      if (d !== d6) anomalies.push({ ma: c, loai: 'gach-lech', gach: d, mongDoi: d6 });
      continue;
    }
    let p6;
    if (khongChia) p6 = nodes.get(h4);
    else {
      p6 = ensure(s6, () => { const n = mk(s6, { cap: 6, depth: d6, tenEn: wco.get(s6) || null, tenVi: null, suyRa: false }); attach(n, cha6); return n; });
      if (p6.cap === 8) anomalies.push({ ma: c, loai: 'phan-nhom-vua-la-vua-cha', phanNhom: s6 }); // xxxxxx00 lẫn xxxxxxz…
    }
    const expect = z8 === '0' ? d6 + 1 : d6 + 2;
    if (z8 === '0') {
      // dòng lá cấp quốc gia thứ nhất (chữ số 7 là của chính nó)
      leaf.depth = d6 + 1; attach(leaf, p6.id);
    } else {
      const h7 = c.slice(0, 7);
      const hdr = ensure(h7, () => { const n = mk(h7, { cap: 'TIEU_DE_QG', depth: d6 + 1, tenEn: null, tenVi: null, suyRa: true, nghiLoaiKhac: z7 === '9' }); attach(n, p6.id); return n; });
      leaf.depth = d6 + 2; attach(leaf, hdr.id);
    }
    // Gạch chỉ là tầng hiển thị; lệch với chữ số → ghi chú chất lượng dữ liệu, không đổi cấu trúc.
    if (d !== expect) anomalies.push({ ma: c, loai: 'gach-lech', gach: d, mongDoi: expect });
  }
  return { nodes, anomalies, codes };
}

function tree() { return (cache ||= build()); }
function reset() { cache = null; }

/**
 * Nút theo mã (2/4/5/6/7/8 số hoặc id nút ảo), hoặc null. Mã WCO viết đủ 6 số cho nhóm không chia (`xxxx00`, vd ý kiến
 * WCO 160100) trỏ về nhóm 4 số; mã 5 số `xxxxx` của phân nhóm một gạch viết tắt (`xxxxx0`) trỏ về phân nhóm đó.
 */
function nodeOf(code) {
  const t = tree();
  if (t.nodes.has(code)) return t.nodes.get(code);
  const d = digits(code);
  if (t.nodes.has(d)) return t.nodes.get(d);
  if (d.length === 6 && d.endsWith('00')) return t.nodes.get(d.slice(0, 4)) || null;
  if (d.length === 5 && t.nodes.has(`${d}0`)) return t.nodes.get(`${d}0`);
  return null;
}

/** Chuỗi tổ tiên từ phần → chương → nhóm 4 số … xuống tới cha trực tiếp. */
function ancestorsOf(code) {
  const t = tree(); const out = []; let n = nodeOf(code);
  while (n && n.parent) { n = t.nodes.get(n.parent); if (n) out.unshift(n); }
  return out;
}

/** Anh em (cùng cha), không gồm chính nó. */
function siblingsOf(code) {
  const t = tree(); const n = nodeOf(code);
  if (!n || !n.parent) return [];
  return t.nodes.get(n.parent).children.filter((id) => id !== n.id).map((id) => t.nodes.get(id));
}

/**
 * Định nghĩa dòng "Loại khác" bằng quan hệ: phạm vi = phạm vi CHA trừ các anh em CÓ TÊN. Nếu cha là tiêu đề bị lược
 * (không tên) thì leo tiếp: trừ cả anh em có tên của cha, cho tới tổ tiên có tên (phân nhóm WCO hoặc nhóm).
 * @returns {null|{ma, cha, anhEmCoTen: string[], chuoi: Array<{nut, tru: string[]}>, toTienCoTen, dinhNghiaDuoc: boolean}}
 */
function loaiKhacOf(code) {
  const t = tree(); const n = nodeOf(code);
  if (!n || n.cap !== 8 || !n.loaiKhac) return null;
  const chuoi = []; let cur = n; let coTen = null;
  while (cur && cur.parent) {
    const p = t.nodes.get(cur.parent);
    const tru = p.children.filter((id) => id !== cur.id && !(t.nodes.get(id).cap === 8 && t.nodes.get(id).loaiKhacTran));
    chuoi.push({ nut: p.id, cap: p.cap, tru });
    if (!p.suyRa) { coTen = p; break; }
    cur = p;
  }
  const anhEmCoTen = chuoi.length ? chuoi[0].tru : [];
  // Định nghĩa được khi mọi anh em có tên (không phải "Loại khác" có điều kiện chưa phân tích) và có tổ tiên có tên.
  const dinhNghiaDuoc = Boolean(coTen) && anhEmCoTen.every((id) => { const s = t.nodes.get(id); return s.cap !== 8 || !s.loaiKhac; });
  return { ma: n.id, cha: n.parent, anhEmCoTen, chuoi, toTienCoTen: coTen ? coTen.id : null, dinhNghiaDuoc };
}

/** Nhãn một nút để in cho người đọc (breadcrumb, /api/tree, mẫu duyệt). Tên bị lược thì nói rõ, không bịa. */
function labelOf(n) {
  if (!n) return '';
  if (n.cap === 'PHAN') return `Phần ${n.ma}: ${n.tenVi || ''}`.trim();
  if (n.cap === 2) return n.tenVi || n.tenEn ? `Chương ${n.id}: ${n.tenVi || n.tenEn}` : `Chương ${n.id}`;
  if (n.cap === 4) return n.tenVi || n.tenEn ? `Nhóm ${n.id}: ${n.tenVi || n.tenEn}` : `Nhóm ${n.id}`;
  if (n.cap === 6) return n.tenEn ? `Phân nhóm ${n.id}: ${n.tenEn}` : `Phân nhóm ${n.id}`;
  if (n.cap === 8) return `${n.id}: ${n.tenVi || ''}`.trim();
  if (n.cap === 'NHOM_MOT_GACH') return `Nhóm con ${n.id} (một gạch, tên bị lược)`;
  return `Tiêu đề ${n.id} (tên bị lược${n.nghiLoaiKhac ? ', nghi "Loại khác:"' : ''})`;
}

/**
 * Dòng lá CÓ TÊN anh em của một mã, dùng để loại trừ: lá cùng cha, bỏ "Loại khác" trần; anh em là tiêu đề (nhóm con)
 * thì mở ra lấy mọi dòng lá bên trong. Dùng cho bộ loại trừ "Loại khác" và khối giải trình trong sổ tay lúc chạy.
 */
function namedSiblingLeaves(code) {
  const t = tree(); const n = nodeOf(code);
  if (!n) return [];
  const out = [];
  const walk = (id) => { const x = t.nodes.get(id); if (!x) return; if (x.cap === 8) { if (!x.loaiKhacTran && x.id !== n.id) out.push(x.id); return; } x.children.forEach(walk); };
  for (const sib of siblingsOf(code)) walk(sib.id);
  return out;
}

/** Thống kê để báo cáo/kiểm: mọi lá có đường về nhóm; nút ảo nào cũng có con. */
function stats() {
  const t = tree(); const s = { la: 0, phan: 0, chuong: 0, nhom4: 0, nhomMotGach: 0, phanNhom6: 0, tieuDeQg: 0, nghiLoaiKhac: 0, loaiKhac: 0, loaiKhacTran: 0, loaiKhacDinhNghiaDuoc: 0, nutAoKhongCon: 0, laKhongVeNhom: 0, batThuong: t.anomalies.length };
  for (const n of new Set(t.nodes.values())) { // Set: mã 6 số trỏ vào lá là bí danh, không đếm hai lần
    if (n.cap === 8) { s.la++; if (n.loaiKhac) { s.loaiKhac++; if (n.loaiKhacTran) s.loaiKhacTran++; if (loaiKhacOf(n.id)?.dinhNghiaDuoc) s.loaiKhacDinhNghiaDuoc++; } const a = ancestorsOf(n.id); if (!a.some((x) => x.cap === 4)) s.laKhongVeNhom++; }
    else if (n.cap === 4) s.nhom4++;
    else if (n.cap === 2) s.chuong++;
    else if (n.cap === 'PHAN') s.phan++;
    else if (n.cap === 6) s.phanNhom6++;
    else if (n.cap === 'NHOM_MOT_GACH') s.nhomMotGach++;
    else if (n.cap === 'TIEU_DE_QG') { s.tieuDeQg++; if (n.nghiLoaiKhac) s.nghiLoaiKhac++; }
    if (n.suyRa && !n.children.length) s.nutAoKhongCon++;
  }
  return s;
}

/** In cây dạng chữ từ một nút bất kỳ: chương (2 số), nhóm (4 số), phân nhóm (6 số)… (cho báo cáo và mẫu duyệt). */
function render(code) {
  const t = tree(); const lines = [];
  const walk = (id, ind) => {
    const n = t.nodes.get(id); if (!n) return;
    let label;
    if (n.cap === 'PHAN') label = `PHẦN ${n.ma}${n.tenVi ? ` — ${n.tenVi}` : ''}`;
    else if (n.cap === 2) label = `CHƯƠNG ${n.id}${n.tenVi ? ` — ${n.tenVi}` : n.tenEn ? ` — ${n.tenEn}` : ''}`;
    else if (n.cap === 4) label = `NHÓM ${n.id}${n.tenVi ? ` — ${n.tenVi}` : n.tenEn ? ` — ${n.tenEn}` : ''}`;
    else if (n.cap === 6) label = `${n.id}${n.tenEn ? ` — ${n.tenEn}` : ''}`;
    else if (n.cap === 8) label = `${n.id} ${n.tenVi}${n.laPhanNhom && n.laPhanNhom !== n.id.slice(0, 4) ? `  (= phân nhóm ${n.laPhanNhom}${n.tenEn ? `: ${n.tenEn}` : ''})` : ''}${n.loaiKhacTran ? '  [LK]' : n.loaiKhac ? '  [LK có điều kiện]' : ''}`;
    else if (n.cap === 'NHOM_MOT_GACH') label = `[${n.id} — nhóm một gạch, tên bị lược]`;
    else if (n.cap === 'TIEU_DE_QG') label = `[${n.id} — tiêu đề quốc gia, tên bị lược${n.nghiLoaiKhac ? ', nghi "Loại khác:"' : ''}]`;
    else label = `[${n.id}]`;
    lines.push(`${'  '.repeat(ind)}${label}${n.cap === 8 && n.gach > n.depth ? `  (gạch ${n.gach})` : ''}`);
    for (const c of n.children) walk(c, ind + 1);
  };
  walk(nodes_has(t, code), 0);
  return lines.join('\n');
}

function nodes_has(t, code) { const d = digits(code); return t.nodes.has(code) ? code : t.nodes.has(d) ? d : d.slice(0, 4); }

module.exports = { tree, reset, nodeOf, ancestorsOf, siblingsOf, namedSiblingLeaves, labelOf, loaiKhacOf, stats, render, isBareOther, isOther };
