// lib/soat-luat-re.js — luật RẺ, không gọi LLM, cho bước soát tờ khai miễn phí (#725 nhóm D).
//
// Nối dữ liệu ĐÃ CÓ vào /api/declaration-check:
//   1. nghiLoaiKhacBiTru — mã khai là dòng "Loại khác" mà mô tả khớp MẠNH tên một dòng/tiêu đề BỊ TRỪ khỏi phạm vi của nó
//      (cùng nguồn lib/hs-tree.js#loaiKhacOf mà /api/tree trả ở truTheoTang). Tên dòng biểu thuế lấy nguyên văn từ cây.
//   2. dauDanhTu / chatLieuCua — để kiểm nhất quán trong tờ khai (cùng loại hàng, khác mã).
//   3. nghiBoMachKhai8542 — "bo mạch / mạch in đã lắp ráp" mà khai 8542 (vi mạch).
//   4. linhKienNho — đơn giá rất thấp là bình thường với linh kiện nhỏ (chân pin, đầu cốt…).
//
// Mọi kết luận ở đây là MÁY NGHI bằng từ khoá (basis HEURISTIC): không phải trích dẫn GIR, không phải căn cứ pháp lý,
// không trích điều luật (luật 6, 7a). Khớp phải thận trọng: cụm danh từ chính + từ khoá phân biệt, xem từng hàm.

const T = require('./hs-tree');
const { moRongDongNghia } = require('./truong-dac-thu');

// Từ dừng GIỮ DẤU (bỏ dấu làm "sàn" trùng "sản").
const TU_DUNG = new Set(['các', 'của', 'và', 'hoặc', 'là', 'để', 'trong', 'có', 'không', 'loại', 'khác', 'này', 'một', 'hai', 'dùng', 'cho',
  'với', 'sau', 'từ', 'đã', 'được', 'khi', 'như', 'bằng', 'trên', 'dưới', 'theo', 'kể', 'cả', 'thuộc', 'nhóm', 'chưa', 'hay', 'vào', 'ra',
  'gồm', 'kiểu', 'đó', 'những', 'tương', 'tự', 'trừ', 'thì', 'mà', 'nhưng', 'chỉ', 'cũng', 'tới', 'đến']);
// Cụm quá chung để làm danh từ chính hay từ phân biệt.
const CHUNG = new Set(['bộ phận', 'nối', 'thiết bị', 'phụ kiện', 'máy', 'dụng cụ', 'hàng', 'sản phẩm', 'hàng hoá', 'hàng hóa', 'vật liệu', 'chi tiết',
  'linh kiện', 'loại', 'bộ', 'cái', 'chiếc', 'điện', 'mạch', 'đầu']);

const chuan = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const laOther = (vn) => /^lo[aạ]i kh[aá]c\b/i.test(String(vn || '').replace(/^[-\s]+/, ''));

/**
 * Tách tên dòng thành các cụm (chuỗi âm tiết liền nhau giữa các từ dừng). Mỗi cụm ghi `sauCho`: nằm SAU chữ "cho" (mệnh
 * đề điều kiện công dụng "dùng cho X", "để nối cho Y").
 */
function tachCum(seg) {
  const out = []; let cur = []; let sauCho = false;
  for (const w of chuan(seg).replace(/sử dụng/g, 'dùng').split(' ')) {
    if (!w) continue;
    if (TU_DUNG.has(w)) {
      if (cur.length) out.push(Object.assign(cur, { sauCho }));
      cur = [];
      if (w === 'cho') sauCho = true;
    } else cur.push(w);
  }
  if (cur.length) out.push(Object.assign(cur, { sauCho }));
  return out;
}

/** Cụm `u` có trong mô tả ở một chỗ KHÔNG ngay sau từ phủ định ("không xốp" không làm bằng chứng cho "xốp"). */
function coKhongPhuDinh(moTaChuan, u) {
  let i = moTaChuan.indexOf(` ${u} `);
  while (i >= 0) {
    if (!/(?:^| )(?:không|ko|k|chưa|phi)$/u.test(moTaChuan.slice(0, i))) return true;
    i = moTaChuan.indexOf(` ${u} `, i + 1);
  }
  return false;
}

/**
 * Một vế tên dòng (tách theo ";") có khớp MẠNH mô tả không.
 *   - danh từ chính = 2 âm tiết đầu của cụm đầu (vd "đầu nối"), phải có NGUYÊN CỤM trong mô tả (kể cả đồng nghĩa biểu
 *     thuế: "chân pin", "đầu cốt" là một loại "đầu nối" — lib/truong-dac-thu.js#moRongDongNghia);
 *   - từ phân biệt = các cặp âm tiết liền nhau / âm tiết đơn ≥ 3 chữ của phần còn lại, bỏ cụm chung ("bộ phận", "nối");
 *     BẮT BUỘC có ≥ 1 và ≥ 50 % số từ phân biệt trong mô tả (tên chỉ có danh từ chính như "Ổ bi", "Cần câu" không đủ —
 *     "bộ phận của ổ bi", "dây bảo vệ cần câu" sẽ bị báo oan); vế có mệnh đề "… cho X" thì phải khớp ≥ 1 từ của X
 *     ("Đồng hồ tốc độ dùng cho xe có động cơ" không khớp đồng hồ tốc độ của băng tải);
 *   - vế có chữ số (điều kiện định lượng "dưới 16 A", "trên 100 kVA"), là phần còn lại ("… khác", "trừ …") hoặc mang
 *     điều kiện phủ định ("không xốp", "chưa lắp") KHÔNG khớp bằng từ khoá — bỏ qua;
 *   - mệnh đề PHỦ ĐỊNH của mô tả ("không phải kính thuốc", "không có lưới bảo vệ", "chưa ngâm tẩm", "pha lê không chì")
 *     không làm bằng chứng (boPhuDinh + coKhongPhuDinh) — khách ghi rõ hàng KHÔNG thuộc dòng đó.
 * @returns {null|{danhTu: string, khop: string[], tuPhanBiet: string[]}}
 */
function khopVe(seg, moTaChuan) {
  const ve = String(seg || '').replace(/\(SEN\)/gi, ' ');
  if (/\d/.test(ve) || /(?<![\p{L}])(?:khác|trừ|không|chưa)(?![\p{L}])/iu.test(ve)) return null;
  const cum = tachCum(ve);
  if (!cum.length || cum[0].length < 2) return null;
  const danhTu = cum[0].slice(0, 2).join(' ');
  if (CHUNG.has(danhTu) || !coKhongPhuDinh(moTaChuan, danhTu)) return null;
  const don = []; const dieuKien = [];
  const them = (u, c) => { don.push(u); if (c.sauCho) dieuKien.push(u); };
  // Phần còn lại của cụm đầu (SAU danh từ chính): một âm tiết thì lấy âm tiết đó, nhiều thì lấy từng cặp liền nhau.
  const sau = Object.assign(cum[0].slice(2), { sauCho: cum[0].sauCho });
  for (const c of [sau, ...cum.slice(1)]) {
    if (c.length === 1) { if (c[0].length >= 3) them(c[0], c); continue; }
    for (let i = 0; i + 1 < c.length; i += 1) them(`${c[i]} ${c[i + 1]}`, c);
  }
  const loc = (ds) => [...new Set(ds)].filter((u) => u !== danhTu && !CHUNG.has(u));
  const tuPhanBiet = loc(don);
  if (!tuPhanBiet.length) return null;
  // Mô tả PHỦ ĐỊNH đúng một từ phân biệt ("tấm rời … không ghép" với "Dạng tấm rời để ghép") → khách đã loại trừ, không nghi.
  if (tuPhanBiet.some((u) => moTaChuan.includes(` ${u} `) && !coKhongPhuDinh(moTaChuan, u))) return null;
  const khop = tuPhanBiet.filter((u) => coKhongPhuDinh(moTaChuan, u));
  if (!khop.length || khop.length < Math.ceil(tuPhanBiet.length * 0.5)) return null;
  const dk = loc(dieuKien);
  if (dk.length && !dk.some((u) => khop.includes(u))) return null;
  return { danhTu, khop, tuPhanBiet };
}

// Từ báo phủ định mở đầu một mệnh đề loại trừ trong mô tả khách viết.
const PHU_DINH = /(?<![\p{L}])(?:không phải là|không phải|không là|không có|không dùng|không thuộc|không gồm|không bao gồm|không được|ko phải|ko có|ko dùng|k phải|k có|chưa|trừ)(?![\p{L}])/giu;
/**
 * Gỡ các mệnh đề phủ định khỏi mô tả (chỉ để so khớp): từ từ báo phủ định tới hết ngoặc đang mở (nếu đang trong ngoặc), hoặc
 * tới dấu , . ; ) xuống dòng gần nhất.
 */
function boPhuDinh(text) {
  const s = String(text || '');
  let out = ''; let i = 0;
  PHU_DINH.lastIndex = 0;
  let m;
  while ((m = PHU_DINH.exec(s))) {
    if (m.index < i) continue;
    out += s.slice(i, m.index);
    const truoc = s.slice(0, m.index);
    const trongNgoac = (truoc.match(/\(/g) || []).length > (truoc.match(/\)/g) || []).length;
    const sau = s.slice(m.index + m[0].length);
    let het = trongNgoac ? sau.search(/\)/) : sau.search(/[,.;)\n]/);
    // "không phải (A, B)" / "không phải: X (A, B)": ngoặc mở trước dấu dừng → phủ định kéo tới hết ngoặc đó.
    const mo = sau.indexOf('(');
    if (!trongNgoac && mo >= 0 && (het < 0 || mo < het)) { const dong = sau.indexOf(')', mo); het = dong < 0 ? -1 : dong; }
    i = het < 0 ? s.length : m.index + m[0].length + het;
    PHU_DINH.lastIndex = i;
  }
  return out + s.slice(i);
}

/** Lá 8 số bên trong một nút (tiêu đề → mọi dòng lá; lá → chính nó). */
function laTrong(id) {
  const t = T.tree();
  const out = [];
  const walk = (x) => { const n = t.nodes.get(x); if (!n) return; if (n.cap === 8) { out.push(n.id); return; } (n.children || []).forEach(walk); };
  walk(id);
  return out;
}

/**
 * Mã khai là dòng "Loại khác" mà mô tả khớp mạnh tên một dòng/tiêu đề bị trừ ở MỘT tầng nào đó của phạm vi "Loại khác".
 * @returns {Array<{nut, cap, laTieuDe, tenVi, ve, danhTu, khop, tang, laCon: Array<{hs, tenVi}>}>}
 */
function nghiLoaiKhacBiTru(maHs, moTa, thongSo) {
  try {
    const lk = T.loaiKhacOf(maHs);
    if (!lk) return [];
    const moTaChuan = ` ${chuan(moRongDongNghia(chuan(boPhuDinh([moTa, thongSo].filter(Boolean).join('. ')))))} `;
    const out = [];
    for (const tang of lk.chuoi) {
      for (const id of tang.tru) {
        const n = T.nodeOf(id);
        const ten = n && n.tenVi;
        if (!ten || laOther(ten)) continue;
        for (const ve of String(ten).split(/\s*;\s*/)) {
          const k = khopVe(ve, moTaChuan);
          if (!k) continue;
          const laCon = laTrong(id).map((hs) => ({ hs, tenVi: T.nodeOf(hs)?.tenVi || null }));
          out.push({ nut: id, cap: n.cap, laTieuDe: n.cap !== 8, tenVi: ten, ve, danhTu: k.danhTu, khop: k.khop, tang: tang.nut, laCon });
          break;
        }
      }
    }
    return out.slice(0, 3);
  } catch { return []; }
}

// ── Nhất quán trong tờ khai ───────────────────────────────────────────────────────────────────────────────────────────
const DAU_CHUNG = new Set(['linh', 'phụ', 'hàng', 'cái', 'chiếc', 'các']);
/** Danh từ chính đầu câu mô tả (2 âm tiết; mở đầu bằng "linh kiện/phụ kiện…" thì lấy 3), hoặc null. */
function dauDanhTu(moTa) {
  const dau = String(moTa || '').split(/[,;:(\n]/)[0];
  const tu = chuan(dau).split(' ').filter((w) => w && !/\d/.test(w));
  if (tu.length < 2) return null;
  const n = DAU_CHUNG.has(tu[0]) ? 3 : 2;
  if (tu.length < n) return null;
  return tu.slice(0, n).join(' ');
}

const CHAT_LIEU = /(?<![\p{L}\p{N}])(đồng thau|đồng|thép không gỉ|thép|inox|nhựa|nhôm|sắt|gang|kẽm|thiếc|niken|bạc|gỗ|cao su|silicon|gốm|sứ|thủy tinh|pvc|pp|pe|abs|nylon|pa66|pbt|pom)(?![\p{L}\p{N}])/giu;
/** Tập chất liệu nêu trong mô tả. */
function chatLieuCua(moTa) {
  return new Set((String(moTa || '').toLowerCase().match(CHAT_LIEU) || []).map((x) => x.replace('thép không gỉ', 'inox')));
}

/** Độ giống nội dung hai câu mô tả (Jaccard trên âm tiết có nghĩa, bỏ số/mã hàng) — 0..1. */
function doGiongMoTa(a, b) {
  const tu = (x) => new Set(chuan(x).split(' ').filter((w) => w.length >= 2 && !/\d/.test(w) && !TU_DUNG.has(w)));
  const A = tu(a); const B = tu(b);
  if (!A.size || !B.size) return 0;
  let chung = 0;
  for (const w of A) if (B.has(w)) chung += 1;
  return chung / (A.size + B.size - chung);
}

// ── Bo mạch khai 8542 ─────────────────────────────────────────────────────────────────────────────────────────────────
const BO_MACH_DAU = /^\s*(?:linh kiện\s+|bộ phận\s+)?(?:bo mạch|bảng mạch|board mạch|mạch in(?:\s+đã)?\s+lắp|mạch điện tử đã lắp|bo mach|bang mach|pcba|mainboard|motherboard|bo điều khiển)(?![\p{L}])/iu;
/** Mô tả MỞ ĐẦU bằng "bo mạch / mạch in đã lắp…" (danh từ chính là cụm lắp ráp) mà khai 8542 (mạch tích hợp). */
function nghiBoMachKhai8542(maHs, moTa) {
  if (!String(maHs || '').startsWith('8542')) return null;
  const m = String(moTa || '').match(BO_MACH_DAU);
  return m ? m[0].trim() : null;
}

/** Câu "12. Theo mục đích của nhóm 85.41 và 85.42:" lấy NGUYÊN VĂN từ data/chu-giai-chuong.json (NGUYEN_VAN), hoặc null. */
let _cg85 = undefined;
function chuGiai85Muc12() {
  if (_cg85 !== undefined) return _cg85;
  _cg85 = null;
  try {
    const { dataReadPath } = require('./data-paths');
    const cg = JSON.parse(require('fs').readFileSync(dataReadPath('chu-giai-chuong.json'), 'utf8'));
    const m = String(cg?.['85']?.chuong || '').match(/12\.\s*Theo mục đích của nhóm 85\.41 và 85\.42:?/u);
    if (m) _cg85 = m[0];
  } catch { /* không có tệp chú giải → không trỏ */ }
  return _cg85;
}

// ── Linh kiện nhỏ (đơn giá thấp là bình thường) ───────────────────────────────────────────────────────────────────────
const LINH_KIEN_NHO = /(?<![\p{L}\p{N}])(chân pin|chân cắm|đầu cốt|cos|giắc|đầu nối|terminal|điện trở|tụ điện|tụ|diode|điốt|led|ốc vít|ốc|vít|bu lông|đinh tán|đinh|long đen|vòng đệm|lò xo|nhãn|tem|hạt|khuy|cúc|khoen|móc|kẹp|cầu chì|chip|ic|transistor|gioăng|phớt)(?![\p{L}\p{N}])/iu;
function linhKienNho(moTa) { return LINH_KIEN_NHO.test(String(moTa || '')); }

// ── Cảnh báo luật rẻ dùng chung (#725 lỗi 40) ───────────────────────────────────────────────────────────────────────────
// MỘT nguồn nội dung cho cả soat_to_khai (K2, lib/declaration-check.js) và /api/describe (compliance.warnings): cùng luật,
// cùng câu chữ, cùng evidence. Mục ở đây là MÁY NGHI bằng từ khoá trên dữ liệu đã có (cây HS, tên dòng biểu thuế nguyên văn):
// basis HEURISTIC, không gắn nhãn GIR, không phải canCuPhapLy, không trích điều luật (luật 6, 7a), không đổi điểm mô tả.
const fmt8 = (m) => { const x = String(m == null ? '' : m).replace(/\D/g, ''); return x.length === 8 ? `${x.slice(0, 4)}.${x.slice(4, 6)}.${x.slice(6)}` : x; };
const soThue = (v) => { const s = String(v == null ? '' : v).replace(/%/g, '').replace(',', '.').trim(); return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
const chu = (v) => String(v == null ? '' : v).trim();
const laLoaiKhacTen = (t) => /^lo[aạ]i kh[aá]c\b/i.test(t || '');

/**
 * Cảnh báo luật rẻ cho một dòng (mã khai + câu mô tả + thông số).
 * @returns {Array<{ma, noiDung, goiYSua, evidence: string[], nguon: Array<{duongDan, phienBan?}>, maDeNghiXem?: string[],
 *   chenhMfn?: Array<{hs, mfn}>, mfnKhai?: number|null, nut?: string}>}
 */
function canhBaoLuatRe(maHs, moTa, thongSo) {
  const out = [];
  let taxData = {};
  try { ({ taxData } = require('./data')); } catch { /* không có biểu → vẫn chạy luật, không có MFN */ }
  // 1. "Loại khác" mà mô tả khớp mạnh tên dòng/tiêu đề bị trừ.
  for (const k of nghiLoaiKhacBiTru(maHs, moTa, thongSo)) {
    const mfnKhai = soThue(taxData[maHs]?.mfn);
    const con = k.laCon.filter((c) => c.tenVi && !laLoaiKhacTen(c.tenVi));
    const deNghi = (k.laCon.length ? k.laCon : [{ hs: k.nut }]).map((c) => c.hs);
    const chenhMfn = deNghi.map((hs) => ({ hs, mfn: soThue(taxData[hs]?.mfn) })).filter((x) => x.mfn !== null && mfnKhai !== null && Math.abs(x.mfn - mfnKhai) >= 5);
    const loai = k.laTieuDe ? 'tiêu đề' : 'dòng';
    out.push({
      ma: 'NGHI_LOAI_KHAC_THUOC_DONG_BI_TRU',
      noiDung: `Luật từ khoá (không dùng AI): mã khai ${fmt8(maHs)} là dòng "Loại khác", phạm vi của nó TRỪ ${loai} ${k.nut} "${k.tenVi}" — mà mô tả có "${k.danhTu}"${k.khop.length ? ` + "${k.khop.join('", "')}"` : ''}. Nghi hàng thuộc ${loai} bị trừ; cần kiểm.`,
      evidence: [
        `tên ${loai} ${k.nut} trong biểu thuế (nguyên văn): "${k.tenVi}"`,
        `${fmt8(maHs)} thuộc tầng ${k.tang} — phạm vi "Loại khác" trừ ${k.nut} (cùng dữ liệu truTheoTang của /api/tree)`,
        `từ khớp trong mô tả: danh từ chính "${k.danhTu}"${k.khop.length ? `; từ phân biệt: ${k.khop.join(', ')}` : ''}`,
        ...con.map((c) => `dòng đề nghị xem ${fmt8(c.hs)} "${c.tenVi}" (MFN ${chu(taxData[c.hs]?.mfn) || '?'}%)`),
        `MFN mã khai ${fmt8(maHs)}: ${chu(taxData[maHs]?.mfn) || '?'}%`,
      ],
      nguon: [{ duongDan: 'lib/hs-tree.js#loaiKhacOf', phienBan: 'tên dòng/tiêu đề biểu thuế (NGUYEN_VAN)' }, { duongDan: `/api/tree?hs=${maHs}` }],
      goiYSua: `Đối chiếu mô tả với tên ${loai} ${k.nut}; nếu hàng thuộc đó thì xem ${deNghi.map(fmt8).join(', ')} — nếu không, ghi rõ trong mô tả đặc điểm cho thấy hàng KHÔNG thuộc ${k.nut}.`,
      maDeNghiXem: deNghi,
      chenhMfn,
      mfnKhai,
      nut: k.nut,
    });
  }
  // 2. "Bo mạch / mạch in đã lắp" mà khai 8542.
  const bm = nghiBoMachKhai8542(maHs, moTa);
  if (bm) {
    const cg = chuGiai85Muc12();
    out.push({
      ma: 'NGHI_CUM_LAP_RAP_KHAI_VI_MACH',
      noiDung: `Luật từ khoá (không dùng AI): mô tả mở đầu bằng "${bm}" (cụm lắp ráp) mà khai ${fmt8(maHs)} thuộc nhóm 85.42 (mạch điện tử tích hợp). Nghi cụm lắp ráp/bo mạch không phải vi mạch; cần kiểm.`,
      evidence: [`danh từ chính của mô tả: "${bm}"`, `mã khai ${fmt8(maHs)} — nhóm 85.42`, ...(cg ? [`chú giải liên quan (nguyên văn, data/chu-giai-chuong.json): "${cg}"`] : [])],
      nguon: [{ duongDan: 'lib/soat-luat-re.js#nghiBoMachKhai8542' }, ...(cg ? [{ duongDan: 'data/chu-giai-chuong.json#85', phienBan: 'NGUYEN_VAN' }] : [])],
      goiYSua: `Đối chiếu định nghĩa "mạch điện tử tích hợp" của nhóm 85.42${cg ? ' (Chú giải 12 Chương 85)' : ''}: bo mạch đã gắn linh kiện thường phân loại theo máy/thiết bị nó là bộ phận.`,
    });
  }
  return out;
}

module.exports = { canhBaoLuatRe, fmt8, nghiLoaiKhacBiTru, khopVe, boPhuDinh, dauDanhTu, chatLieuCua, doGiongMoTa, nghiBoMachKhai8542, chuGiai85Muc12, linhKienNho, laTrong };
