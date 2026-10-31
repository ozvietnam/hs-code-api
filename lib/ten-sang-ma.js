/**
 * lib/ten-sang-ma.js — TÊN HÀNG → MÃ HS ứng viên, chỉ từ nguồn ĐÃ KIỂM (#577 soát đợt 3, BD-85-08; bộ so `soMa` của
 * lib/dieu-kien-so.js).
 *
 * Vì sao: điều kiện `dungCho` viết bằng MÃ ("dùng cho hàng hóa thuộc nhóm 84.15…", "xe thuộc nhóm 87.11") trong khi mô tả hàng chỉ
 * nêu TÊN hàng đích ("dùng cho máy điều hòa không khí"). Trước đây bộ so chữ coi hai bên "lệch âm tiết" ⇒ TRÁI giả.
 *
 * Nguồn: CHỈ tên nút cây HS (lib/hs-tree.js — tên tiếng Việt của biểu thuế Tổng cục / tax.json, nhãn NGUYEN_VAN; tên tiếng Anh
 * WCO/biểu thuế). KHÔNG đọc tệp AI_CHUA_KIEM (tax-enriched, explanatory-notes, loai-khac-index, hs-context, phan_biet/bao_gom của
 * chú giải…). Không LLM, không bảng đồng nghĩa tự chế: tên không có nguyên văn trong cây (vd "xe máy" — cây chỉ có "xe mô tô",
 * "xe gắn máy có bàn đạp") ⇒ KHÔNG giải được ⇒ người gọi trả CHUA_BIET (hỏi người khai).
 *
 * Luật (bảo thủ):
 *   - Tên của một nút được tách thành MỤC: bỏ ngoặc (riêng "(kể cả …)" được đọc thêm như mục của nút — hàng kể cả vẫn thuộc nút),
 *     tách theo dấu ; , : . và " và " / " hoặc " (Anh: and / or). Mục mở đầu bằng từ định ngữ / quan hệ ("loại khác", "dùng cho",
 *     "của", "cho", "bằng", "có", "trừ"…) không phải TÊN hàng ⇒ bỏ.
 *   - Tên hàng `ten` (≥ 2 âm tiết; tiếng Anh ≥ 1 từ ≥ 4 chữ) khớp nút khi bằng ĐÚNG một mục, hoặc là ĐẦU của một mục (mục cụ thể
 *     hơn tên: "xe kéo" ↔ "xe kéo loại dùng trong sân ga"). Mọi nút khớp đều là ứng viên — tên chung chung khớp nhiều nhóm ⇒ nhiều
 *     ứng viên ⇒ bộ so chỉ kết luận khi MỌI ứng viên cùng phía của dải mã (lib/dieu-kien-so.js#soMa).
 *   - Tên có chữ Hán ⇒ không giải (chưa có tên Trung đã kiểm ở mọi cấp).
 *
 * Tất định, chỉ đọc, nạp chỉ mục một lần (lazy).
 */
const T = require('./hs-tree');

const CJK = /[㐀-鿿]/u;
/** Biến thể chính tả (không phải đồng nghĩa): "môtô" ↔ "mô tô". */
const CHINH_TA = [[/(?<![\p{L}\p{M}])mô\s*-?\s*tô(?![\p{L}\p{M}])/gu, 'mô tô']];
/** Mục mở đầu bằng các từ này không phải tên hàng (định ngữ, quan hệ, phần còn lại). */
const DAU_KHONG_PHAI_TEN = /^(?:loại khác|loại|khác|dùng cho|dùng để|dùng trong|sử dụng|của|cho|để|bằng|có|không|chưa|đã|trừ|kể cả|gồm|với|từ|trên|dưới|các loại khác|other|of|for|with|without|not|n e c|excluding|including|whether|used|parts?)(?:\s|$)/u;
const BO_DAU_MUC = /^(?:các loại|các|những|những loại|một)\s+/u;

function amTiet(s) {
  let t = String(s || '').normalize('NFC').toLowerCase();
  for (const [re, thay] of CHINH_TA) t = t.replace(re, thay);
  return t.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
/** Chuẩn so khớp: âm tiết nối bằng một dấu cách; từ Anh cuối bỏ "s" số nhiều (excavators ↔ excavator). */
function chuan(s) {
  const a = amTiet(s);
  const cuoi = a[a.length - 1];
  if (cuoi && /^[a-z]{4,}$/.test(cuoi) && !/ss$/.test(cuoi)) a[a.length - 1] = /(?:sh|ch|x)es$/.test(cuoi) ? cuoi.slice(0, -2) : cuoi.replace(/s$/, '');
  return a.join(' ');
}

/** Bỏ mọi ngoặc (kể cả lồng), trả { chinh, keCa: [nội dung "(kể cả …)"/"(including …)"] }. */
function tachNgoac(s) {
  const keCa = []; let chinh = ''; let sau = 0; let buf = '';
  for (const ch of String(s || '')) {
    if (ch === '(' || ch === '（') { if (sau === 0) buf = ''; else buf += ch; sau += 1; continue; }
    if ((ch === ')' || ch === '）') && sau > 0) {
      sau -= 1;
      if (sau === 0) { const m = buf.trim().match(/^(?:kể cả|including)\s+(.+)$/iu); if (m) keCa.push(m[1]); chinh += ' '; } else buf += ch;
      continue;
    }
    if (sau > 0) buf += ch; else chinh += ch;
  }
  return { chinh, keCa };
}

/** Các MỤC tên hàng của một tên nút (Việt hoặc Anh). */
function mucCuaTen(ten) {
  if (!ten) return [];
  const { chinh, keCa } = tachNgoac(String(ten).replace(/^[-\s–]+/, ''));
  const out = [];
  for (const doan of [chinh, ...keCa]) {
    for (const p of doan.split(/[;,:.。；，]|\s+(?:và|hoặc|and|or)\s+/iu)) {
      const c = chuan(p).replace(BO_DAU_MUC, '');
      if (!c || DAU_KHONG_PHAI_TEN.test(c)) continue;
      out.push(c);
    }
  }
  return out;
}

let _chiMuc = null;
/** Chỉ mục: mục tên → Set(mã nút chữ số). Chỉ nút có mã chữ số (bỏ chương 2 số, bỏ tầng không mã `<pn6>~r<dòng>`). */
function chiMuc() {
  if (_chiMuc) return _chiMuc;
  const m = new Map();
  for (const [id, n] of T.tree().nodes) {
    if (!/^\d{4,8}$/.test(id) || id.startsWith('98')) continue; // Chương 98 (VN) lặp dòng của chương khác cho ưu đãi riêng
    for (const ten of [n.tenVi, n.tenEn]) {
      for (const muc of mucCuaTen(ten)) {
        if (!m.has(muc)) m.set(muc, new Set());
        m.get(muc).add(id);
      }
    }
  }
  _chiMuc = m;
  return m;
}

/** Tên đủ cụ thể để tra: ≥ 2 âm tiết (Việt), hoặc một từ Anh ≥ 4 chữ cái. */
function duCuThe(c) {
  const a = c.split(' ');
  if (a.length >= 2) return true;
  return /^[a-z]{4,}$/.test(a[0] || '');
}

/**
 * Mã nút ứng viên của một TÊN hàng (không có mã HS trong chữ). [] ⇒ không giải được (tên không có nguyên văn trong cây, quá
 * chung chung, chữ Hán…).
 * @param {string} ten
 * @returns {string[]} mã 4–8 số (đã sắp, không trùng; bỏ nút con khi nút cha của nó cũng khớp; không lấy Chương 98)
 */
function tenSangMa(ten) {
  const s = String(ten || '');
  if (!s.trim() || CJK.test(s)) return [];
  const c = chuan(s).replace(BO_DAU_MUC, '');
  if (!c || !duCuThe(c) || DAU_KHONG_PHAI_TEN.test(c)) return [];
  const out = new Set();
  for (const [muc, ma] of chiMuc()) {
    if (muc === c || muc.startsWith(`${c} `)) for (const x of ma) out.add(x);
  }
  // Nút cha khớp ⇒ nút con của nó thừa (cha bảo thủ hơn: "trục khuỷu" ↔ 8483 ⇒ không đủ để nói thuộc 8483.10).
  const ds = [...out].sort();
  return ds.filter((x) => !ds.some((y) => y !== x && x.startsWith(y)));
}

module.exports = { tenSangMa, mucCuaTen, _chuan: chuan };
