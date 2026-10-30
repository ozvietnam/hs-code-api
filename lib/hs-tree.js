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
 * Nút ảo (tiêu đề bị lược) có `suyRa: true`; tên tiếng Anh của nhóm/phân nhóm lấy nguyên văn từ
 * data/wco-hs-international.csv. Không bịa tên: nơi nào không có nguồn thì để null, phạm vi được định nghĩa bằng
 * quan hệ (cha trừ anh em) — xem loaiKhacOf().
 *
 * 12/10/2026 — TÊN NGUYÊN VĂN TỪ BIỂU THUẾ TỔNG CỤC (data/bieu-thue/<phiên bản>/ten-nut.json, skill bieu-thue-xnk):
 * dòng tiêu đề không mã của biểu ("- Máy biến điện sử dụng điện môi lỏng:") được nối vào nút mà tập lá dưới tiêu đề
 * khớp đúng tập lá của nút (`doTinCay: KHOP_TAP`) → `tenVi`/`tenEn` của nút ảo và của phân nhóm 6 số (vốn chỉ có tên
 * WCO tiếng Anh), kèm `tenNguon: "bieu-thue@2026.04.05"`. `suyRa` vẫn true (cấu trúc suy từ chữ số); chỉ tên là có nguồn.
 * Tiêu đề chỉ khớp tiền tố (TIEN_TO) ghi ở `tenViNghi`, không dùng làm tên.
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

/** Tên nút từ biểu thuế Tổng cục (phiên bản mới nhất trong data/bieu-thue). Thiếu → Map rỗng, cây vẫn dựng. */
function bieuThueNames() {
  const out = { ver: null, ten: new Map() };
  try {
    const { dataReadPath } = require('./data-paths');
    const { readdirSync, existsSync } = require('fs');
    const ver = readdirSync(dataReadPath('bieu-thue')).filter((d) => /^\d{4}\.\d{2}\.\d{2}$/.test(d) && existsSync(dataReadPath('bieu-thue', d, 'ten-nut.json'))).sort().pop();
    if (!ver) return out;
    const j = JSON.parse(readFileSync(dataReadPath('bieu-thue', ver, 'ten-nut.json'), 'utf8'));
    out.ver = ver;
    for (const [id, v] of Object.entries(j.ten || {})) out.ten.set(id, v);
  } catch { /* chưa có biểu thuế đã trích → không có tên */ }
  return out;
}
const boHaiCham = (t) => String(t || '').replace(/\s*[:：]\s*$/, '').trim();

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
  // Tên nguyên văn từ biểu thuế cho nút ảo + phân nhóm 6 số (chỉ khi tập lá khớp đúng).
  const bt = bieuThueNames();
  for (const [id, v] of bt.ten) {
    const n = nodes.get(id); if (!n || n.id !== id) continue;
    const dich = n.suyRa || (n.cap === 6 && !n.tenVi);
    if (!dich) continue;
    if (v.doTinCay === 'KHOP_TAP') { n.tenVi = boHaiCham(v.tenVi) || n.tenVi; if (!n.tenEn && v.tenEn) n.tenEn = boHaiCham(v.tenEn); n.tenNguon = `bieu-thue@${bt.ver}`; }
    else if (!n.tenVi) n.tenViNghi = boHaiCham(v.tenVi);
  }
  return { nodes, anomalies, codes, bieuThue: bt.ver };
}

function tree() { return (cache ||= build()); }
function reset() { cache = null; tangCache = new Map(); }

/**
 * Nút theo mã (2/4/5/6/7/8 số hoặc id nút ảo), hoặc null. Mã WCO viết đủ 6 số cho nhóm không chia (`xxxx00`, vd ý kiến
 * WCO 160100) trỏ về nhóm 4 số; mã 5 số `xxxxx` của phân nhóm một gạch viết tắt (`xxxxx0`) trỏ về phân nhóm đó.
 */
function nodeOf(code) {
  const t = tree();
  if (laIdTang(code)) return tangCua(chuanMa(code).split('~')[0]).nut.get(chuanMa(code)) || null;
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
 *
 * `anhEmCoTen` CHỈ là tầng gần nhất (anh em cùng cha) — giữ cho hợp đồng cũ. Phạm vi ĐỦ = `toTienCoTen` TRỪ `truDayDu`
 * (mọi nút bị trừ ở MỌI tầng của `chuoi`, tầng gần trước). Vd 39269099: tầng tiêu đề 3926909 trừ 39269091–93, tầng 6 số
 * 392690 trừ thêm 39269010, 39269020, 3926903, 3926904, 3926905, 39269060, 3926908. Nơi mô tả phạm vi "Loại khác" phải
 * dùng `truDayDu` / `chuoi` (hoặc namedExclusionLeaves), không chỉ `anhEmCoTen` (Đợt 0A, ghi-nhan-mo-ta-ecus mục 32.3).
 * @returns {null|{ma, cha, anhEmCoTen: string[], truDayDu: string[], chuoi: Array<{nut, cap, tru: string[]}>, toTienCoTen, dinhNghiaDuoc: boolean}}
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
  const truDayDu = [...new Set(chuoi.flatMap((c) => c.tru))];
  // Định nghĩa được khi mọi nút bị trừ ở MỌI tầng có tên (không phải "Loại khác" có điều kiện chưa phân tích) và có
  // tổ tiên có tên. (Trước Đợt 0A chỉ xét tầng gần nhất — 36/3.357 dòng bị coi là định nghĩa được dù tầng trên còn
  // "Loại khác, …" có điều kiện.)
  const dinhNghiaDuoc = Boolean(coTen) && truDayDu.every((id) => { const s = t.nodes.get(id); return s.cap !== 8 || !s.loaiKhac; });
  return { ma: n.id, cha: n.parent, anhEmCoTen, truDayDu, chuoi, toTienCoTen: coTen ? coTen.id : null, dinhNghiaDuoc };
}

/** Nhãn một nút để in cho người đọc (breadcrumb, /api/tree, mẫu duyệt). Tên bị lược thì nói rõ, không bịa. */
function labelOf(n) {
  if (!n) return '';
  if (n.cap === 'PHAN') return `Phần ${n.ma}: ${n.tenVi || ''}`.trim();
  if (n.cap === 2) return n.tenVi || n.tenEn ? `Chương ${n.id}: ${n.tenVi || n.tenEn}` : `Chương ${n.id}`;
  if (n.cap === 4) return n.tenVi || n.tenEn ? `Nhóm ${n.id}: ${n.tenVi || n.tenEn}` : `Nhóm ${n.id}`;
  if (n.cap === 6) return n.tenVi || n.tenEn ? `Phân nhóm ${n.id}: ${n.tenVi || n.tenEn}` : `Phân nhóm ${n.id}`;
  if (n.cap === 8) return `${n.id}: ${n.tenVi || ''}`.trim();
  if (n.cap === 'NHOM_MOT_GACH') return n.tenVi ? `Nhóm con ${n.id}: ${n.tenVi}` : `Nhóm con ${n.id} (một gạch, tên bị lược)`;
  return n.tenVi ? `Tiêu đề ${n.id}: ${n.tenVi}` : `Tiêu đề ${n.id} (tên bị lược${n.nghiLoaiKhac ? ', nghi "Loại khác:"' : ''})`;
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

/**
 * Dòng lá CÓ TÊN nằm trong phần bị TRỪ khỏi phạm vi một dòng "Loại khác", theo TỪNG TẦNG của loaiKhacOf().chuoi (tầng
 * gần nhất trước): [{nut, cap, la: string[]}]. Nút bị trừ là tiêu đề thì mở ra lấy mọi lá có tên bên trong (bỏ "Loại
 * khác" trần — không có tên để đối chiếu). Không phải dòng "Loại khác" → [].
 */
function exclusionLeavesByTier(code) {
  const lk = loaiKhacOf(code);
  if (!lk) return [];
  const t = tree(); const seen = new Set();
  return lk.chuoi.map((c) => {
    const la = [];
    const walk = (id) => { const x = t.nodes.get(id); if (!x) return; if (x.cap === 8) { if (!x.loaiKhacTran && x.id !== lk.ma && !seen.has(x.id)) { seen.add(x.id); la.push(x.id); } return; } x.children.forEach(walk); };
    c.tru.forEach(walk);
    return { nut: c.nut, cap: c.cap, la };
  });
}

/**
 * Như namedSiblingLeaves nhưng với dòng "Loại khác" thì lấy ĐỦ MỌI TẦNG phủ định (tầng gần trước) — tập dòng có tên mà
 * hàng phải KHÔNG thuộc thì mới giữ được mã "Loại khác". Mã không phải "Loại khác" → namedSiblingLeaves (y như cũ).
 */
function namedExclusionLeaves(code) {
  const n = nodeOf(code);
  if (!n || n.cap !== 8 || !n.loaiKhac) return namedSiblingLeaves(code);
  return exclusionLeavesByTier(code).flatMap((g) => g.la);
}

/** Thống kê để báo cáo/kiểm: mọi lá có đường về nhóm; nút ảo nào cũng có con. */
function stats() {
  const t = tree(); const s = { la: 0, phan: 0, chuong: 0, nhom4: 0, nhomMotGach: 0, phanNhom6: 0, tieuDeQg: 0, nghiLoaiKhac: 0, loaiKhac: 0, loaiKhacTran: 0, loaiKhacDinhNghiaDuoc: 0, nutAoKhongCon: 0, laKhongVeNhom: 0, batThuong: t.anomalies.length, bieuThue: t.bieuThue || null, nutAoCoTen: 0, phanNhom6CoTenVi: 0 };
  for (const n of new Set(t.nodes.values())) { // Set: mã 6 số trỏ vào lá là bí danh, không đếm hai lần
    if (n.suyRa && n.tenVi) s.nutAoCoTen++;
    if (n.cap === 6 && n.tenVi) s.phanNhom6CoTenVi++;
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

/** Nhãn một nút trong bản in cây (render / renderTang). */
function nhanIn(n) {
  if (n.cap === 'PHAN') return `PHẦN ${n.ma}${n.tenVi ? ` — ${n.tenVi}` : ''}`;
  if (n.cap === 2) return `CHƯƠNG ${n.id}${n.tenVi ? ` — ${n.tenVi}` : n.tenEn ? ` — ${n.tenEn}` : ''}`;
  if (n.cap === 4) return `NHÓM ${n.id}${n.tenVi ? ` — ${n.tenVi}` : n.tenEn ? ` — ${n.tenEn}` : ''}`;
  if (n.cap === 6) return `${n.id}${n.tenEn ? ` — ${n.tenEn}` : ''}`;
  if (n.cap === 8) return `${n.id} ${n.tenVi}${n.laPhanNhom && n.laPhanNhom !== n.id.slice(0, 4) ? `  (= phân nhóm ${n.laPhanNhom}${n.tenEn ? `: ${n.tenEn}` : ''})` : ''}${n.loaiKhacTran ? '  [LK]' : n.loaiKhac ? '  [LK có điều kiện]' : ''}`;
  if (n.cap === 'NHOM_MOT_GACH') return n.tenVi ? `[${n.id}] ${n.tenVi}` : `[${n.id} — nhóm một gạch, tên bị lược]`;
  if (n.cap === 'TIEU_DE_QG') return n.tenVi ? `[${n.id}] ${n.tenVi}` : `[${n.id} — tiêu đề quốc gia, tên bị lược${n.nghiLoaiKhac ? ', nghi "Loại khác:"' : ''}]`;
  if (n.cap === 'TANG_KHONG_MA') return `[${n.id}] ${n.tenVi}  (tầng không mã, biểu thuế r${n.r}, gạch ${n.gach})`;
  return `[${n.id}]`;
}
function inCay(gocId, layNut, layCon) {
  const lines = [];
  const walk = (id, ind) => {
    const n = layNut(id); if (!n) return;
    lines.push(`${'  '.repeat(ind)}${nhanIn(n)}${n.cap === 8 && n.gach > n.depth ? `  (gạch ${n.gach})` : ''}`);
    for (const c of layCon(id)) walk(c, ind + 1);
  };
  walk(gocId, 0);
  return lines.join('\n');
}

/** In cây dạng chữ từ một nút bất kỳ: chương (2 số), nhóm (4 số), phân nhóm (6 số)… (cho báo cáo và mẫu duyệt). */
function render(code) {
  const t = tree();
  return inCay(nodes_has(t, code), (id) => t.nodes.get(id), (id) => t.nodes.get(id)?.children || []);
}

function nodes_has(t, code) { const d = digits(code); return t.nodes.has(code) ? code : t.nodes.has(d) ? d : d.slice(0, 4); }

// ── TẦNG KHÔNG MÃ (#577) ──────────────────────────────────────────────────────────────────────────────────────
/**
 * Biểu thuế Tổng cục có những dòng TIÊU ĐỀ KHÔNG MÃ ("- - - Loại khác:", "- - Bộ phận và phụ kiện:") gom một số dòng 8 số
 * thành một tầng mà chữ số của mã không mang (lib/ho-so/tang-khong-ma.js tìm chúng: tiêu đề không mã của sheet chính KHÔNG
 * nối khớp-tập vào nút nào, kèm các dòng 8 số dưới nó theo số gạch). Cây theo chữ số làm mất tầng này: dòng dưới tầng bị treo
 * làm anh em của dòng bên ngoài.
 *
 * LỚP TẦNG dựng lại tầng thành NÚT ẢO `<pn6>~r<dòng biểu>` — `{cap: 'TANG_KHONG_MA', pn6, r, gach, tenVi (nguyên văn, bỏ gạch
 * và ":"), tenViNguyenVan, tenNguon: 'bieu-thue@<bản>', suyRa: true, khongMa: true, parent, children}` — CHỈ trong lớp tầng:
 * tangCua(pn6) / chaTang(id) / conTang(id) / nodeOf(<id tầng>) / renderTang(pn6). Cây theo chữ số (tree().nodes, parent /
 * children của nút số, loaiKhacOf, stats, render) KHÔNG đổi — mọi endpoint runtime giữ nguyên. Người dùng lớp tầng: luật đi
 * ranh giới 6→8 số (lib/dieu-kien-so.js#duongDiDong8) và cổng ranh giới (lib/ho-so/cong-ranh-gioi.js).
 *
 * Đặt một tầng (tầng ngoài trước: nhiều lá hơn, rồi ít gạch hơn): đi xuống từ gốc phân nhóm tới nút sâu nhất (số hoặc tầng)
 * chứa trọn tập lá L của tầng; tại đó các con phải chia sạch theo L (con nằm trọn trong L hoặc trọn ngoài L) và hội các con
 * trong L đúng bằng L —
 *   - một phần con, liền nhau  → CO_NUT: chèn nút tầng vào vị trí con đầu, các con đó thành con của nút tầng;
 *   - mọi con của một nút tầng → CO_NUT: tầng lồng cùng tập lá (nút tầng mới làm con duy nhất của nút tầng ngoài);
 *   - mọi con của gốc phân nhóm, hoặc của tiêu đề số ĐÃ có cùng tên → TRUNG: cùng một tiêu đề (vd 950300 r18732 = 9503009
 *     "Loại khác" tên lấy từ sheet khác) — không dựng nút;
 *   - mọi con của tiêu đề số BỊ LƯỢC TÊN → CO_NUT, nút tầng THAY tiêu đề số đó trong lớp tầng (`thay[]`);
 *   - còn lại (cắt ngang con, không liền nhau, trùng tập mà khác tên, lá ngoài cây) → KHONG_DAT: không biểu diễn được, giữ chặn.
 * Gạch chỉ dùng để biết dòng nào dưới tiêu đề không mã (như tang-khong-ma.js); quan hệ giữa các nút số vẫn ăn theo chữ số.
 */
const RE_TANG = /^(\d{6})~r(\d+)$/;
const laIdTang = (v) => RE_TANG.test(String(v == null ? '' : v).trim());
/** Chuẩn hoá mã/id nút: id tầng `<pn6>~r<dòng>` giữ nguyên, còn lại chỉ giữ chữ số. */
const chuanMa = (v) => { const s = String(v == null ? '' : v).trim(); return RE_TANG.test(s) ? s : digits(s); };
let tangCache = new Map();

function dungTang(code) {
  const t = tree();
  const out = { pn6: code, goc: null, bieuThue: null, tang: [], ds: [], trung: [], thay: [], khongDat: [], nut: new Map(), cha: new Map(), con: new Map() };
  const goc = code.length === 6 ? nodeOf(code) : null;
  if (!goc || goc.cap === 8 || !(goc.cap === 6 || (goc.cap === 4 && code.endsWith('00')))) return out;
  out.goc = goc.id;
  const init = (id) => { const n = t.nodes.get(id); if (!n || n.cap === 8) return; out.con.set(id, [...n.children]); for (const c of n.children) { out.cha.set(c, id); init(c); } };
  init(goc.id);
  let raw = []; let ver = null;
  try { const TKM = require('./ho-so/tang-khong-ma'); raw = TKM.tangKhongMa(code); ver = TKM.nguonBieuThue().ver; } catch { raw = []; }
  out.bieuThue = ver;
  const nutV = (id) => out.nut.get(id) || t.nodes.get(id);
  const la = (id) => { const n = nutV(id); if (!n) return []; if (n.cap === 8) return [id]; return (out.con.get(id) || []).flatMap(la); };
  const trangThai = new Map();
  const thuTu = raw.map((x, i) => ({ x, i })).sort((a, b) => b.x.dongDuoi.length - a.x.dongDuoi.length || a.x.gach - b.x.gach || a.x.r - b.x.r);
  for (const { x, i } of thuTu) {
    const L = new Set(x.dongDuoi);
    const id = `${code}~r${x.r}`;
    const tenVi = boHaiCham(stripDashes(x.chu));
    const khongDat = (lyDo) => trangThai.set(i, { trangThai: 'KHONG_DAT', lyDo });
    const chua = (ids) => [...L].every((h) => ids.includes(h));
    if (!chua(la(goc.id))) { khongDat('la-ngoai-cay'); continue; }
    let X = goc.id;
    for (;;) { const nx = (out.con.get(X) || []).find((c) => nutV(c).cap !== 8 && chua(la(c))); if (!nx) break; X = nx; }
    const kids = out.con.get(X) || [];
    const trong = []; let cat = false;
    kids.forEach((c, k) => { const lc = la(c); const n = lc.filter((h) => L.has(h)).length; if (n && n === lc.length) trong.push(k); else if (n) cat = true; });
    const hoi = trong.reduce((a, k) => a + la(kids[k]).length, 0);
    if (cat || hoi !== L.size) { khongDat('cat-ngang-nut-so'); continue; }
    const nX = nutV(X);
    const tao = (parent, children) => {
      const n = { id, cap: 'TANG_KHONG_MA', pn6: code, r: x.r, gach: x.gach, tenVi, tenViNguyenVan: x.chu, tenNguon: ver ? `bieu-thue@${ver}` : null, suyRa: true, khongMa: true, parent, children: [] };
      out.nut.set(id, n); out.con.set(id, children); out.cha.set(id, parent);
      for (const c of children) out.cha.set(c, id);
      trangThai.set(i, { trangThai: 'CO_NUT', id });
      return n;
    };
    if (trong.length === kids.length) {
      if (nX.cap === 'TANG_KHONG_MA') { tao(X, [...kids]); out.con.set(X, [id]); continue; }
      if (X === goc.id) { trangThai.set(i, { trangThai: 'TRUNG', nut: X }); out.trung.push({ r: x.r, chu: x.chu, nut: X }); continue; }
      if (nX.tenVi) {
        if (squashTen(nX.tenVi) === squashTen(tenVi)) { trangThai.set(i, { trangThai: 'TRUNG', nut: X }); out.trung.push({ r: x.r, chu: x.chu, nut: X }); } else khongDat('trung-tap-khac-ten');
        continue;
      }
      // Tiêu đề số bị lược tên mà tập lá đúng bằng tầng: nút tầng thay nó trong lớp tầng.
      const P = out.cha.get(X);
      tao(P, [...kids]);
      out.con.set(P, out.con.get(P).map((c) => (c === X ? id : c)));
      out.con.delete(X); out.cha.delete(X);
      out.thay.push({ r: x.r, nut: X, id });
      continue;
    }
    if (trong.some((k, j) => j && k !== trong[j - 1] + 1)) { khongDat('khong-lien-nhau'); continue; }
    const thanhVien = trong.map((k) => kids[k]);
    tao(X, thanhVien);
    out.con.set(X, [...kids.slice(0, trong[0]), id, ...kids.slice(trong[trong.length - 1] + 1)]);
  }
  for (const n of out.nut.values()) { n.parent = out.cha.get(n.id); n.children = out.con.get(n.id) || []; }
  out.tang = [...out.nut.values()].sort((a, b) => a.r - b.r);
  out.ds = raw.map((x, i) => ({ ...x, ...trangThai.get(i) }));
  out.khongDat = out.ds.filter((x) => x.trangThai === 'KHONG_DAT');
  return out;
}
const squashTen = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Lớp tầng của một phân nhóm 6 số: { pn6, goc, bieuThue, tang: nút tầng[], ds: mọi tầng không mã gốc kèm trangThai
 * (CO_NUT + id | TRUNG + nut | KHONG_DAT + lyDo), trung[], thay[], khongDat[], nut/cha/con: Map của lớp tầng }.
 */
function tangCua(pn6) {
  const code = digits(pn6).slice(0, 6);
  if (!tangCache.has(code)) tangCache.set(code, dungTang(code));
  return tangCache.get(code);
}
/** Lớp tầng chứa nút `id` (id tầng, hoặc nút số nằm trong cây con của phân nhóm), hoặc null. */
function lopCua(id) {
  const m = id.match(RE_TANG);
  if (m) return tangCua(m[1]);
  if (id.length >= 6) { const v = tangCua(id.slice(0, 6)); return v.goc === id || v.cha.has(id) ? v : null; }
  if (id.length === 4) { const v = tangCua(`${id}00`); return v.goc === id ? v : null; }
  return null;
}
/** Cha của một nút trong lớp tầng (nút số ngoài phân nhóm có tầng: cha theo chữ số). Id tầng không có → null. */
function chaTang(id) {
  const i = chuanMa(id); const v = lopCua(i);
  if (v && v.cha.has(i)) return v.cha.get(i);
  if (laIdTang(i)) return null;
  return tree().nodes.get(i)?.parent || null;
}
/** Con của một nút trong lớp tầng (tầng chen vào giữa); ngoài lớp tầng = con theo chữ số. */
function conTang(id) {
  const i = chuanMa(id); const v = lopCua(i);
  if (v && v.con.has(i)) return [...v.con.get(i)];
  if (laIdTang(i)) return [];
  return [...(tree().nodes.get(i)?.children || [])];
}
/** In cây của một phân nhóm có nút tầng (cho gói soạn ranh giới). */
function renderTang(pn6) {
  const v = tangCua(pn6);
  if (!v.goc) return render(pn6);
  return inCay(v.goc, (id) => nodeOf(id), (id) => conTang(id));
}

module.exports = { tree, reset, nodeOf, ancestorsOf, siblingsOf, namedSiblingLeaves, namedExclusionLeaves, exclusionLeavesByTier, labelOf, loaiKhacOf, stats, render, isBareOther, isOther, tangCua, chaTang, conTang, renderTang, chuanMa, laIdTang };
