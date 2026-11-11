/**
 * lib/dieu-kien-so.js — lược đồ `dieuKienSo` MỚI theo từ vựng `tu-vung@1` + bộ chấm ranh giới 6→8 số
 * (plan L1-3b, #573; spec hồ sơ phân loại §8.1 `duongDiPhapLy`, §8.2, §8.3 bước 3 `doiChieu`).
 *
 * ── Lược đồ một điều kiện (`dong8[].dieuKienSo[i]`, `dieuKienNut[].dieuKienSo[i]` của data/so-tay/<nhóm>.json) ──
 * Điều kiện có KIỂU khi `fact` là khoá của tu-vung@1 (camelCase). Fact cũ (snake_case: duong_kinh, chat_lieu…) giữ
 * NGUYÊN định dạng và máy chấm cũ của lib/so-tay-gates.js — hai bộ khoá không trùng nhau (kiểm 30/10: 285 dòng cũ).
 *   kiểu SO                    { fact, op: '<='|'<'|'>='|'>', value: số, donVi }   donVi thuộc hệ đơn vị của khoá
 *   kiểu CO_KHONG              { fact, op: 'CO'|'KHONG' }
 *   kiểu LIET_KE               { fact, op: 'TRONG', value: string[] }               mọi phần tử ∈ giaTriHopLe
 *   kiểu TEN_LOAI              { fact, op: 'TEN_LOAI', value: string|string[] }     nhiều phần tử = "hoặc"
 *   kiểu CONG_DUNG             { fact, op: 'CONG_DUNG', value: string|string[] }
 *   vế mở "X, Y và các loại tương tự" (#577 vòng 7, quyết định GĐ)  { fact: 'tenLoai', op: 'TUONG_TU', value: string|string[] }
 *                              value = các hàng NÊU TÊN; tên khớp một hàng nêu ⇒ THOA, tên khác ⇒ CHUA_BIET (hỏi — không bao
 *                              giờ TRAI vì khác tên); câu trả lời của bên gọi `duKien tenLoai .tuongTu {<khoaTuongTu>: bool}`
 *                              ⇒ THOA/TRAI `theoTraLoi` (không tất định, lib/gir.js không trích). Không mang `chieu`.
 *   kiểu CHAT_LIEU_THEO_VI_TRI { fact, op: 'LA', value: string|string[], viTri? }   viTri mặc định CHINH
 *   tuỳ chọn `chieu: 'PHAI_CO'|'PHAI_KHONG'` (mặc định PHAI_CO) — chỉ cho TRONG/TEN_LOAI/CONG_DUNG/LA; với CO_KHONG
 *   và SO thì dùng KHONG / đảo op (một cách viết duy nhất, để cổng "loại trừ lẫn nhau" của L1-4a so được).
 * Câu trích (`trich` của mục) phải là bằng chứng: số + đơn vị (SO), một mẫu `cachDoc` của khoá (CO_KHONG), của từng
 * giá trị (TRONG, LA), hoặc chính chữ của giá trị (TEN_LOAI, CONG_DUNG — giá trị chữ tự do không có mẫu).
 *
 * ── Ngữ nghĩa ranh giới 6→8 số (duongDiDong8) ──
 * Đi từ dòng 8 số lên tới phân nhóm 6 số. Ở mỗi tầng, nút n:
 *   - n có tên (dòng 8 số có tên, hoặc tiêu đề có tên ≠ "Loại khác")      → PHAI_CO điều kiện của chính n
 *   - n là "Loại khác" (dòng hoặc tiêu đề)                                  → PHAI_KHONG từng anh em của n, cộng PHAI_CO điều
 *     kiện vế riêng nếu n là "Loại khác, <vế>". Bỏ qua anh em là "phần còn lại" trần — dòng Loại khác trần VÀ tiêu đề
 *     "Loại khác" trần (#583: không có nội dung khẳng định để phủ định; phủ định nó là vòng tròn ⇒ CHUA_SO_HOA vĩnh viễn).
 *     Ngoại lệ: tầng có ≥ 2 phần còn lại trần mà một trong đó là tiêu đề (vd 8414594 + 8414599) = cây theo chữ số đã lược
 *     một tầng có tên (biểu thuế: "Công suất không quá 125 kW" / "Loại khác") → anh em đó CHUA_SO_HOA, lyDo `tang-bi-luoc`.
 *   - n là tiêu đề BỊ LƯỢC TÊN (biểu thuế không có tên khớp đúng tập lá — tên khớp đúng đã được lib/hs-tree.js lấy từ
 *     data/bieu-thue/<bản>/ten-nut.json) → KHÔNG coi là "Loại khác" (#583): nhóm PHAI_CO dieuKien null, lyDo
 *     `tieu-de-bi-luoc-ten` (kèm tenViNghi nếu chỉ khớp tiền tố); anh em bị lược tên cũng mang lyDo này.
 * Với dòng "Loại khác" mà mọi tầng trên đều là "Loại khác", tập phủ định = loaiKhacOf().truDayDu (Đợt 0A) trừ tiêu đề
 * "Loại khác" trần đứng riêng một mình làm phần còn lại của tầng.
 * Khác truDayDu ở MỘT chỗ có chủ ý: tiêu đề có tên lấy từ biểu thuế Tổng cục (suyRa nhưng có tenVi) là nút có tên →
 * PHAI_CO tiêu đề, không phủ định anh em của tiêu đề (85444219: trong "Dùng cho viễn thông, ≤ 80 V" trừ .11/.13).
 * Điều kiện của tiêu đề nằm ở `dieuKienNut[]` của sổ tay (nguồn `tieuDe.<id>` — tên nguyên văn của biểu thuế).
 * TẦNG KHÔNG MÃ (#577): luật đi dùng LỚP TẦNG của lib/hs-tree.js (chaTang/conTang) — tiêu đề không mã của biểu thuế mà cây
 * theo chữ số làm mất là nút `<pn6>~r<dòng>` (cap TANG_KHONG_MA, có tên nguyên văn) nằm giữa dòng và tiêu đề số. Nó theo đúng
 * luật trên: tầng có tên ⇒ PHAI_CO `dieuKienNut` id `<pn6>~r<dòng>`; dòng "Loại khác" dưới tầng chỉ phủ định anh em TRONG tầng;
 * tầng "Loại khác:" phủ định anh em của tầng (848310: .25 "≤ 2.000 cc" phải KHÔNG thuộc .24 "xe nhóm 87.11"). Nhóm của tầng
 * ghi `cap: 'TANG'`. Phân nhóm không có tầng không mã: lớp tầng = cây theo chữ số, luật đi như cũ.
 *
 * ── Kết quả (spec §8.1) ── mỗi mục đường đi `ketQua`: CO (thoả theo chiều) | THIEU (chưa đủ dữ kiện) | MAU_THUAN (trái) |
 * CHUA_SO_HOA (ranh giới chưa có điều kiện). Gộp một dòng: MAU_THUAN > CHUA_SO_HOA > THIEU > CO. `tatDinh` = kết quả
 * dựa trên so số / có-không / liệt kê / chất liệu; so chữ tự do (TEN_LOAI, CONG_DUNG) là KHÔNG tất định — chỉ làm
 * cảnh báo, không bao giờ làm căn cứ LOI (Global Constraints K2). Dữ kiện `nguon: AI_CHUA_KIEM` hoặc `trangThai:
 * CHUA_BIET` không vào quyết định (spec §8.1: chỉ làm câu hỏi).
 *
 * Chỉ đọc. Không gọi LLM. Không đổi mã đã chọn ở đâu cả — người dùng (L1-5) quyết định cách dùng kết quả.
 */
const fs = require('fs');
const path = require('path');
const TV = require('./tu-vung');
const T = require('./hs-tree');
const { dataReadPath } = require('./data-paths');

const OP_SO = ['<=', '<', '>=', '>'];
const OP_MOI = ['CO', 'KHONG', 'TRONG', 'TEN_LOAI', 'CONG_DUNG', 'TUONG_TU'];
const CHIEU = ['PHAI_CO', 'PHAI_KHONG'];
const OP_THEO_KIEU = { SO: OP_SO, CO_KHONG: ['CO', 'KHONG'], LIET_KE: ['TRONG'], TEN_LOAI: ['TEN_LOAI', 'TUONG_TU'], CONG_DUNG: ['CONG_DUNG'], CHAT_LIEU_THEO_VI_TRI: ['LA'] };
const KET_QUA = ['CO', 'THIEU', 'MAU_THUAN', 'CHUA_SO_HOA'];
/**
 * Giá trị TỔNG HỢP "không thuộc giá trị nào đã liệt kê" của một khoá LIET_KE (#653) — chỉ cổng ranh giới (vector biên) dùng,
 * để dòng dưới "Loại khác" phủ định mọi giá trị liệt kê tới được (8501.10 kieuDongCoDien: không phải động cơ bước, không phải
 * hướng trục). Chấm TRÁI mọi điều kiện TRONG (tất định). Dữ kiện thật không mang giá trị này: docGiaTri chỉ trả giaTriHopLe,
 * kiemDieuKien từ chối nó trong điều kiện.
 */
const NGOAI_LIET_KE = '∉LIET_KE';
const UU_TIEN = { MAU_THUAN: 3, CHUA_SO_HOA: 2, THIEU: 1, CO: 0 };

// ── từ vựng ─────────────────────────────────────────────────────────────────────────────────────────────────
function khoaTV(fact) {
  try { return fact ? TV.layKhoa(fact) : null; } catch { return null; }
}
const laFactTuVung = (fact) => Boolean(khoaTV(fact));
/**
 * HOẶC có kiểu (#577, DNF): `{op: 'HOAC', phuongAn: [[đk, …], [đk, …], …]}` — ≥ 2 phương án, mỗi phương án là nhóm VÀ không
 * rỗng các điều kiện có kiểu (khoá tu-vung@1, không lồng HOAC); không mang `chieu`. Cùng hình dạng HOAC cũ của sổ tay (vế số
 * snake_case) nhưng mọi vế là khoá tu-vung — máy phân biệt hai loại bằng chính khoá.
 */
const laHoacCoKieu = (c) => Boolean(c) && c.op === 'HOAC' && c.chieu === undefined && Array.isArray(c.phuongAn) && c.phuongAn.length >= 2
  && c.phuongAn.every((alt) => Array.isArray(alt) && alt.length && alt.every((cc) => cc && typeof cc === 'object' && cc.op !== 'HOAC' && laFactTuVung(cc.fact)));
/** Điều kiện có kiểu: khoá tu-vung@1 (không HOAC) hoặc HOAC có kiểu. */
const laDieuKienCoKieu = (c) => Boolean(c) && (c.op === 'HOAC' ? laHoacCoKieu(c) : laFactTuVung(c.fact));
/** Mọi khoá mà một điều kiện (kể cả HOAC) nhắc tới. */
const factCuaDieuKien = (c) => (c && c.op === 'HOAC' ? (c.phuongAn || []).flat().map((cc) => cc && cc.fact).filter(Boolean) : (c && c.fact ? [c.fact] : []));
/** Trải phẳng: mọi điều kiện đơn (vế của HOAC thay cho HOAC). */
const traiPhang = (ds) => (ds || []).flatMap((c) => (c && c.op === 'HOAC' ? (c.phuongAn || []).flat() : [c]));
const dsGiaTri = (v) => (Array.isArray(v) ? v : [v]);
// ── Vế mở "X, Y và các loại tương tự" (op TUONG_TU, #577 vòng 7) ──────────────────────────────────────────────────
/** Cụm mở trong chữ biểu: "tương tự" / "similar" / "the like". */
const RE_CUM_TUONG_TU = /(?<![\p{L}\p{M}])(?:tương\s+tự|similar|the\s+like)(?![\p{L}\p{M}])/iu;
const laTuongTu = (c) => Boolean(c) && c.op === 'TUONG_TU';
/** Op so chữ tự do (không tất định): TEN_LOAI, CONG_DUNG, TUONG_TU. */
const laOpChuTuDo = (op) => op === 'TEN_LOAI' || op === 'CONG_DUNG' || op === 'TUONG_TU';
/**
 * Khoá câu trả lời của một điều kiện TUONG_TU: các tên nêu (NFC, chữ thường, gộp khoảng trắng) nối " | ". Bên gọi trả lời câu hỏi
 * "có thuộc loại tương tự … không?" bằng `duKien {fact: 'tenLoai', giaTri, tuongTu: {<khoá>: true|false}}`.
 */
const khoaTuongTu = (c) => dsGiaTri(c && c.value).map((v) => String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()).join(' | ');
const CJK = /[㐀-鿿]/u;
const CHU = '[\\p{L}\\p{M}]';
const boc = (src) => (CJK.test(src) ? `(?:${src})` : `(?<!${CHU})(?:${src})(?!${CHU})`);
const mauCua = (cd) => (cd ? [...(cd.vi || []), ...(cd.en || []), ...(cd.zh || [])] : []);
function coMau(list, text) {
  const ds = (list || []).filter(Boolean);
  if (!ds.length) return false;
  return new RegExp(ds.map(boc).join('|'), 'iu').test(String(text || '').normalize('NFC'));
}
/**
 * Mẫu dùng chung (dungMau, vd "so-tay-gates#vải dệt") của MỘT giá trị chất liệu — regex thô của lib/so-tay-gates.js hoặc null.
 * MỘT chỗ đọc dungMau cho cả cổng 3 (coChatLieu) và cổng 5 (lib/ho-so/tach-ve.js#neoMot): hai cổng phải đọc chữ biểu như nhau,
 * không thì vế cổng 3 đã nhận vẫn bị cổng 5 báo bỏ (940599: "bằng vật liệu dệt" ↔ chatLieu "vải dệt").
 */
function reDungMau(k, cl) {
  const dm = k?.moTaGiaTri?.[cl]?.dungMau;
  if (!dm) return null;
  const [tep, ten] = String(dm).split('#');
  return tep === 'so-tay-gates' ? require('./so-tay-gates').chatLieuRegex(ten) : null;
}
/** Mẫu nhận diện một chất liệu của khoá chatLieu: cachDoc riêng + mẫu dùng chung của so-tay-gates (dungMau). */
function coChatLieu(k, cl, text) {
  const mt = k.moTaGiaTri?.[cl] || {};
  if (coMau(mauCua(mt.cachDoc), text)) return true;
  const re = reDungMau(k, cl);
  return Boolean(re && re.test(String(text || '').normalize('NFC')));
}
const squash = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
/** Số trong câu trích, kể cả cách viết nghìn kiểu Việt ("1.000") và thập phân dấu phẩy ("19,5"). */
function soCoTrongTrich(value, trich) {
  const t = String(trich || '').replace(/\s/g, '');
  const s = String(value);
  const cands = new Set([s, s.replace('.', ',')]);
  if (Number.isInteger(value) && Math.abs(value) >= 1000) cands.add(String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  if (Number.isInteger(value) && Math.abs(value) >= 1000) cands.add(String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')); // 100000 ⇒ "100,000" kiểu Anh (#1139)
  // Thập phân: chữ biểu hay viết thêm số 0 cuối ("21,10 kW" = 21.1; "26,38" ≠ 26.3) — chấp nhận đuôi 0 sau phần thập phân, không chấp nhận chữ số khác.
  // Đuôi 0 chỉ cho thập phân dấu PHẨY ("21,10" = 21.1) và số nguyên ("2,0 gam" = 2); dấu CHẤM là phân cách nghìn kiểu Việt ("1.500" = 1500 ≠ 1.5).
  return [...cands].some((c) => {
    const duoi0 = /,\d/.test(c) ? '0*' : (/^\d+$/.test(c) ? '(?:,0+)?' : '');
    return new RegExp(`(?<![\\d.,])${c.replace(/[.]/g, '\\.')}${duoi0}(?![\\d]|[.,]\\d)`).test(t);
  });
}

/**
 * Ngưỡng viết bằng số chữ / phân số (tu-vung@2: khoá `demSo` — "hai sợi hoặc hơn"; `docPhanSo` — "trên 1/10 đường kính"): đạt khi
 * máy đọc tu-vung đọc CHÍNH câu trích ra đúng giá trị (cùng đơn vị) và đúng op (nếu câu có chữ so sánh). Khoá @1 không áp: ngưỡng
 * vẫn phải có nguyên văn (soCoTrongTrich).
 */
function nguongDocDuoc(k, c, tr) {
  // demSo/docPhanSo: "hai sợi hoặc hơn", "1/10 đường kính"; thang không đơn vị viết ra (GT, RON, IV — "gross tonnage không quá 26"):
  // chính khoá đọc đúng ngưỡng + op từ câu trích là bằng chứng, không đòi chữ đơn vị (04/11, gói ch.89).
  if (!k.demSo && !k.docPhanSo && !k.donViKhongVietRa) return false;
  try {
    const muon = TV.quyDoi(c.fact, c.value, c.donVi);
    const khop = (r) => r.trangThai === 'DA_CO' && typeof r.giaTri === 'number' && muon != null && Math.abs(r.giaTri - muon) < 1e-9 && (!r.op || r.op === c.op);
    if (khop(TV.docGiaTri(c.fact, tr))) return true;
    if (!k.donViKhongVietRa) return false;
    // Câu hai biên ("trên 26 nhưng không quá 500"): bộ đọc trả biên đầu; thử lại với biên sau bằng cách cắt câu tại "nhưng"
    const i = tr.search(/\s(nhưng|but|但|且)\s/i);
    if (i < 0) return false;
    const dau = tr.slice(0, i).replace(/\s*(trên|dưới|không quá|từ|over|under|exceeding|not exceeding)\s+[\d.,]+(\s+(trở lên|trở xuống|or more|and above))?[\s,;]*$/i, '').trim(); // ", nhưng" — dấu phẩy trước "nhưng" (151190)
    return khop(TV.docGiaTri(c.fact, `${dau} ${tr.slice(i).replace(/^\s(nhưng|but|但|且)\s/i, '')}`));
  } catch { return false; }
}

// ── Máy kiểm một điều kiện có kiểu ──────────────────────────────────────────────────────────────────────────
/**
 * Kiểm một điều kiện của dieuKienSo trên câu trích của mục. null = đạt; chuỗi lỗi dạng `dieu-kien-so-<op>-…`.
 * Chỉ dành cho điều kiện CÓ KIỂU (fact ∈ tu-vung@1) hoặc op mới; điều kiện cũ do lib/so-tay.js kiểm như trước.
 */
function kiemDieuKien(c, trich) {
  if (!c || typeof c !== 'object') return 'dieu-kien-so-khong-hop-le';
  if (c.op === 'HOAC') {
    if (!laHoacCoKieu(c)) return 'dieu-kien-so-hoac-hinh-dang';
    for (const cc of c.phuongAn.flat()) { const l = kiemDieuKien(cc, trich); if (l) return l; }
    return null;
  }
  const k = khoaTV(c.fact);
  if (!k) return `dieu-kien-so-fact-khong-co-trong-tu-vung:${c.fact || ''}`;
  const ops = OP_THEO_KIEU[k.kieu] || [];
  if (!ops.includes(c.op)) return `dieu-kien-so-op-sai-kieu:${c.op}:${c.fact}`;
  const opTen = String(c.op === 'LA' ? 'la' : c.op).toLowerCase().replace(/_/g, '-');
  if (c.chieu !== undefined) {
    if (!CHIEU.includes(c.chieu)) return `dieu-kien-so-chieu-khong-hop-le:${c.chieu}`;
    if (c.chieu === 'PHAI_KHONG' && (k.kieu === 'SO' || k.kieu === 'CO_KHONG')) return `dieu-kien-so-chieu-thua:${c.op}:${c.fact}`;
  }
  const tr = String(trich || '');
  switch (k.kieu) {
    case 'SO': {
      if (typeof c.value !== 'number' || !Number.isFinite(c.value)) return 'dieu-kien-so-value-khong-phai-so';
      if (!String(c.donVi || '').trim()) return 'dieu-kien-so-thieu-don-vi';
      if (TV.quyDoi(c.fact, 1, c.donVi) == null) return `dieu-kien-so-don-vi-lech-he:${c.donVi}`;
      const docDuoc = nguongDocDuoc(k, c, tr); // tu-vung@2: "hai sợi hoặc hơn", "1/10 đường kính" (đơn vị "lần" không viết ra)
      if (!soCoTrongTrich(c.value, tr) && !docDuoc) return `dieu-kien-so-nguong-khong-co-trong-trich:${c.value}`;
      if (!docDuoc && !tr.toLowerCase().includes(String(c.donVi).toLowerCase())) return `dieu-kien-so-don-vi-khong-co-trong-trich:${c.donVi}`;
      return null;
    }
    case 'CO_KHONG':
      return coMau([...mauCua(k.cachDoc), ...mauCua(k.cachDocKhong)], tr) ? null : `dieu-kien-so-${opTen}-khong-co-trong-trich:${c.fact}`;
    case 'LIET_KE': {
      if (!Array.isArray(c.value) || !c.value.length || new Set(c.value).size !== c.value.length) return 'dieu-kien-so-trong-value-rong-hoac-trung';
      for (const v of c.value) if (!(k.giaTriHopLe || []).includes(v)) return `dieu-kien-so-trong-gia-tri-ngoai-danh-sach:${v}`;
      for (const v of c.value) if (!coMau(mauCua(k.moTaGiaTri?.[v]?.cachDoc), tr)) return `dieu-kien-so-trong-khong-co-trong-trich:${v}`;
      return null;
    }
    case 'TEN_LOAI':
    case 'CONG_DUNG': {
      const ds = dsGiaTri(c.value);
      if (c.op === 'TUONG_TU') {
        // Vế mở (#577 vòng 7): chỉ trên tenLoai, không chieu (luật đi tự phủ định); trích phải có cụm mở + mọi tên nêu nguyên văn;
        // tên nêu không được chứa "tương tự" (giá trị chết — mô tả hàng thật không viết chữ đó).
        if (c.fact !== 'tenLoai') return `dieu-kien-so-tuong-tu-fact:${c.fact}`;
        if (c.chieu !== undefined) return `dieu-kien-so-chieu-thua:${c.op}:${c.fact}`;
        if (!ds.length || ds.some((v) => typeof v !== 'string' || !v.trim())) return 'dieu-kien-so-tuong-tu-value-rong';
        for (const v of ds) if (RE_CUM_TUONG_TU.test(v)) return `dieu-kien-so-tuong-tu-gia-tri-mo:${v}`;
        if (!RE_CUM_TUONG_TU.test(tr.normalize('NFC'))) return 'dieu-kien-so-tuong-tu-khong-co-cum-mo';
        for (const v of ds) if (squash(v).length < 2 || !squash(tr).includes(squash(v))) return `dieu-kien-so-tuong-tu-khong-co-trong-trich:${v}`;
        return null;
      }
      if (!ds.length || ds.some((v) => typeof v !== 'string' || !v.trim())) return `dieu-kien-so-${opTen}-value-rong`;
      for (const v of ds) if (squash(v).length < 2 || !squash(tr).includes(squash(v))) return `dieu-kien-so-${opTen}-khong-co-trong-trich:${v}`;
      return null;
    }
    case 'CHAT_LIEU_THEO_VI_TRI': {
      const ds = dsGiaTri(c.value);
      if (!ds.length || ds.some((v) => !(k.giaTriHopLe || []).includes(v))) return `dieu-kien-so-la-gia-tri-ngoai-danh-sach:${ds.join('|')}`;
      if (c.viTri !== undefined && !(k.viTri || []).includes(c.viTri)) return `dieu-kien-so-la-vi-tri-khong-hop-le:${c.viTri}`;
      for (const v of ds) if (!coChatLieu(k, v, tr)) return `dieu-kien-so-la-khong-co-trong-trich:${v}`;
      if (c.viTri && c.viTri !== 'CHINH' && !coMau(mauCua(k.moTaViTri?.[c.viTri]?.cachDoc), tr)) return `dieu-kien-so-la-vi-tri-khong-co-trong-trich:${c.viTri}`;
      return null;
    }
    default: return `dieu-kien-so-op-sai-kieu:${c.op}:${c.fact}`;
  }
}

// ── Dữ kiện có kiểu ─────────────────────────────────────────────────────────────────────────────────────────
const NGUON_KHONG_DUNG = new Set(['AI_CHUA_KIEM']);
const TRANG_THAI_DUNG = new Set(['DA_CO', 'SUY_RA']);
const bangNhau = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/**
 * duKien[] (spec §8.1: { fact, giaTri, donVi?, op?, cacGiaTri?, nguon, bangChung, trangThai }) → Map fact → mục dùng được.
 * Bỏ AI_CHUA_KIEM / CHUA_BIET. Hai mục cùng khoá trái nhau → { xungDot: true } (chấm CHUA_BIET). chatLieu nhiều mục → gộp.
 */
function chuanDuKien(duKien) {
  const m = new Map();
  for (const d of Array.isArray(duKien) ? duKien : []) {
    if (!d || !d.fact || d.giaTri === undefined || d.giaTri === null) continue;
    if (NGUON_KHONG_DUNG.has(d.nguon)) continue;
    if (d.trangThai !== undefined && !TRANG_THAI_DUNG.has(d.trangThai)) continue;
    const cu = m.get(d.fact);
    const k = khoaTV(d.fact);
    if (!cu) { m.set(d.fact, { ...d }); continue; }
    if (cu.xungDot) continue;
    if (k?.kieu === 'CHAT_LIEU_THEO_VI_TRI') {
      const gop = [...dsGiaTri(cu.giaTri), ...dsGiaTri(d.giaTri)].filter((x, i, a) => a.findIndex((y) => bangNhau(x, y)) === i);
      m.set(d.fact, { ...cu, giaTri: gop });
    } else if (!bangNhau([cu.giaTri, cu.donVi, cu.op, cu.cacGiaTri], [d.giaTri, d.donVi, d.op, d.cacGiaTri])) {
      m.set(d.fact, { fact: d.fact, xungDot: true, cacMuc: [cu, d] });
    }
  }
  return m;
}

// ── Chấm một điều kiện ──────────────────────────────────────────────────────────────────────────────────────
// Khoảng số: { lo, loIn, hi, hiIn } (±Infinity cho đầu mở).
function khoangOp(op, v) {
  if (op === '<=') return { lo: -Infinity, loIn: false, hi: v, hiIn: true };
  if (op === '<') return { lo: -Infinity, loIn: false, hi: v, hiIn: false };
  if (op === '>=') return { lo: v, loIn: true, hi: Infinity, hiIn: false };
  if (op === '>') return { lo: v, loIn: false, hi: Infinity, hiIn: false };
  return { lo: v, loIn: true, hi: v, hiIn: true };
}
const tron = (x) => Number(Number(x).toPrecision(12));
function conCua(f, c) { // f ⊆ c
  const loOk = f.lo > c.lo || (f.lo === c.lo && (!f.loIn || c.loIn));
  const hiOk = f.hi < c.hi || (f.hi === c.hi && (!f.hiIn || c.hiIn));
  return loOk && hiOk;
}
function roiNhau(f, c) {
  const truoc = (x, y) => x.hi < y.lo || (x.hi === y.lo && !(x.hiIn && y.loIn));
  return truoc(f, c) || truoc(c, f);
}
function khoangDuKien(k, f) {
  const u = f.donVi || k.donViChuan;
  if (Array.isArray(f.cacGiaTri) && f.cacGiaTri.length > 1) {
    const vs = f.cacGiaTri.map((x) => TV.quyDoi(k.khoa, x, u));
    if (vs.some((x) => x == null || !Number.isFinite(x))) return null;
    return { lo: tron(Math.min(...vs)), loIn: true, hi: tron(Math.max(...vs)), hiIn: true };
  }
  if (Array.isArray(f.giaTri) || typeof f.giaTri !== 'number') return null;
  const v = TV.quyDoi(k.khoa, f.giaTri, u);
  if (v == null || !Number.isFinite(v)) return null;
  return khoangOp(f.op && f.op !== '=' ? f.op : '=', tron(v));
}

// Chất liệu cha–con (tu-vung@1 chưa ghi quan hệ; đề xuất chuyển vào tu-vung@2 trường `thuoc`).
const CHAT_LIEU_CHA = { 'sắt thép': 'kim loại', 'thép không gỉ': 'sắt thép', gang: 'sắt thép', 'đồng': 'kim loại', 'nhôm': 'kim loại', 'kẽm': 'kim loại', niken: 'kim loại' };
function thuoc(con, cha) {
  for (let x = con, i = 0; x && i < 5; x = CHAT_LIEU_CHA[x], i += 1) if (x === cha) return true;
  return false;
}

// So chữ tự do (TEN_LOAI, CONG_DUNG): bỏ hư từ, so tập âm tiết. KHÔNG tất định.
const HU_TU = new Set(['cho', 'của', 'loại', 'dùng', 'để', 'và', 'hoặc', 'các', 'những', 'bằng', 'có', 'với', 'trong', 'được', 'sử', 'dụng', 'thuộc', 'là', 'một', 'the', 'for', 'of', 'and', 'or', 'with', 'a', 'an']);
// #653: "dùng cho"/"sử dụng cho" mang nghĩa (công dụng ĐÍCH) — gộp thành một âm tiết có nghĩa thay vì bỏ như hư từ, để "dùng
// cho điện ảnh" không bị coi là nằm trong "chứa phim điện ảnh" (8523.51). "cho" đứng một mình vẫn là hư từ.
const DUNG_CHO = /(?<![\p{L}\p{M}])(?:sử\s+dụng|dùng)\s+cho(?![\p{L}\p{M}])/gu;
const amTiet = (s) => String(s || '').normalize('NFC').toLowerCase().replace(DUNG_CHO, ' dùngcho ').split(/[^\p{L}\p{N}]+/u).filter((x) => x && !HU_TU.has(x));
const KHONG_ASCII = /[^\x00-\x7F]/;
/**
 * Mã HS nêu trong chữ (#577): "Chương 87" → '87'; "nhóm 87.11", "87.02, 87.03 hoặc 87.11" → '8711'…; "8452.10.00" → '84521000'.
 * Dùng cho dungCho/congDung theo CẤP mã: "xe thuộc nhóm 87.11" thoả "xe thuộc Chương 87" (tiền tố), ngược lại chưa biết.
 */
function maThamChieu(s) {
  const t = String(s || '');
  const out = new Set();
  for (const m of t.matchAll(/ch[uư][oơ]ng\s+(\d{1,2})(?![\d.,]\d)/giu)) out.add(m[1].padStart(2, '0'));
  for (const m of t.matchAll(/(?<![\d.])(\d{4})\.(\d{2})(?:\.(\d{2}))?(?![\d]|[.,]\d)/g)) out.add(`${m[1]}${m[2]}${m[3] || ''}`);
  for (const m of t.matchAll(/(?<![\d.])(\d{2})\.(\d{2})(?![\d]|[.,]\d)/g)) out.add(`${m[1]}${m[2]}`);
  for (const r of daiMa(t)) out.add(r);
  return [...out];
}
/**
 * DẢI mã (#577 vòng 4, 848390 "8701.10 hoặc 8701.91 đến 8701.95"): "A đến B", "từ A đến B", "A–B" với A, B cùng cấp (nhóm
 * 87.01, phân nhóm 8701.91, dòng 8 số) và A < B ⇒ mọi mã CÓ TRONG CÂY nằm giữa (cùng độ dài, cùng chương). Khác cấp / ngược
 * chiều / quá 200 mã ⇒ không nở (chỉ hai đầu như trước).
 */
const RE_MA_DAI = '(\\d{4}\\.\\d{2}(?:\\.\\d{2})?|\\d{2}\\.\\d{2})';
const RE_DAI = new RegExp(`(?<![\\d.])${RE_MA_DAI}\\s*(?:đến|tới|[–—-])\\s*(?:(?:nhóm|phân\\s+nhóm|mã)\\s+)?${RE_MA_DAI}(?![\\d]|[.,]\\d)`, 'giu');
function daiMa(t) {
  const out = [];
  for (const m of String(t || '').matchAll(RE_DAI)) {
    const a = m[1].replace(/\./g, ''); const b = m[2].replace(/\./g, '');
    if (a.length !== b.length || a.slice(0, 2) !== b.slice(0, 2) || Number(b) <= Number(a) || Number(b) - Number(a) > 200) continue;
    for (let x = Number(a); x <= Number(b); x += 1) {
      const ma = String(x).padStart(a.length, '0');
      if (T.nodeOf(ma)) out.push(ma);
    }
  }
  return out;
}
/**
 * ĐÍCH LỒNG trong dữ kiện dungCho (#693, 848390): "8483.10 dùng cho xe kéo thuộc phân nhóm 8701.91" = bộ phận của hàng 8483.10,
 * hàng ấy lắp cho xe 8701.91 — mỗi đoạn giữa hai mốc ("dùng cho", "lắp cho", "lắp vào", "của", "for (use with)", "of") là một
 * ĐÍCH. Mã của đích: mã HS nêu trong chữ (maThamChieu — "hoặc"/dải trong một đích vẫn là HOẶC), không có thì tên hàng giải qua
 * cây HS (lib/ten-sang-ma.js — nguồn đã kiểm). Đích không ra mã bị bỏ. Chỉ phía DỮ KIỆN được tách; điều kiện giữ nguyên.
 */
const MOC_DICH = /(?<![\p{L}\p{M}])(?:sử\s+dụng\s+cho|dùng\s+cho|lắp\s+cho|lắp\s+vào|của|for\s+use\s+(?:with|in|on)|for|of)(?![\p{L}\p{M}])/giu;
function chuoiDich(fv) {
  const out = [];
  for (const doan of String(fv || '').split(MOC_DICH)) {
    const text = doan.trim();
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    const ma = maThamChieu(text);
    const ds = ma.length ? ma : require('./ten-sang-ma').tenSangMa(text);
    if (ds.length) out.push({ text, ma: ds, tuTen: !ma.length });
  }
  return out;
}
/** Dữ kiện chỉ gồm mã HS và chữ khung mã ("8424.20.11", "phân nhóm 8424.20.11") — không có tên hàng. */
const laMaThuan = (fv) => maThamChieu(fv).length > 0 && amTiet(fv).every((x) => /^[\d.]+$/.test(x) || KHUNG_MA_DK.has(x));
const KHUNG_MA_DK = new Set(['nhóm', 'phân', 'chương', 'mã', 'số', 'hàng', 'hóa', 'hoá', 'thuộc', 'của', 'dùng', 'cho', 'hoặc', 'và', 'heading', 'subheading', 'chapter']);
const lienQuanMa = (f, rc) => rc.some((c) => f.startsWith(c) || c.startsWith(f));
/**
 * So theo CẤP mã khi ĐIỀU KIỆN nêu mã HS (#577; tên↔mã + đích lồng sau soát đợt 3 #697). null = điều kiện không nêu mã (so chữ).
 *   THOA      — có một đích mà MỌI mã của nó nằm trong dải điều kiện (tiền tố);
 *   TRAI      — mọi đích (đã ra mã) đều rời dải điều kiện;
 *   CHUA_BIET — còn lại;
 *   KHONG_MA  — dữ kiện không ra mã nào (tên không có nguyên văn trong cây): soChu quyết — điều kiện CHỈ có mã ("87.11",
 *               ["84.15", …]) ⇒ CHUA_BIET (hỏi; trước: so âm tiết "87","11" với tên ⇒ TRÁI giả); điều kiện có chữ mô tả kèm mã
 *               ("thiết bị nhiệt điện gia dụng thuộc nhóm 85.16") ⇒ so âm tiết như mọi giá trị chữ tự do (chỉ TRAI/CHUA_BIET được).
 */
function soMa(condV, fv) {
  const rc = maThamChieu(condV);
  if (!rc.length || !String(fv || '').trim()) return null;
  const ds = chuoiDich(fv);
  if (!ds.length) return 'KHONG_MA';
  if (ds.some((d) => d.ma.every((f) => rc.some((c) => f.startsWith(c))))) return 'THOA';
  if (ds.every((d) => d.ma.every((f) => !lienQuanMa(f, rc)))) return 'TRAI';
  return 'CHUA_BIET';
}
/** Âm tiết MÔ TẢ của một giá trị điều kiện (bỏ số mã và chữ khung mã "thuộc nhóm/phân nhóm/Chương/mã/hàng hóa"). */
const KHUNG_MA = new Set(['nhóm', 'phân', 'chương', 'mã', 'số', 'hàng', 'hóa', 'hoá', 'khác', 'heading', 'subheading', 'chapter', 'no', 'goods']);
const chuMoTa = (v) => amTiet(v).some((x) => !/^\d+$/.test(x) && !KHUNG_MA.has(x));
function soChu(condVals, factVal) {
  const fv = String(factVal || '');
  if (!fv.trim() || CJK.test(fv)) return 'CHUA_BIET';
  const F = new Set(amTiet(fv));
  if (!F.size) return 'CHUA_BIET';
  let moiPhuongAnLech = true; let soDuoc = false;
  for (const v of condVals) {
    // Điều kiện nêu mã HS ⇒ so theo cấp mã (tiền tố; dữ kiện chỉ nêu tên ⇒ tên↔mã qua cây HS), không so âm tiết.
    const sm = soMa(v, fv);
    if (sm === 'THOA') return 'THOA';
    // Điều kiện CHỮ ↔ dữ kiện MÃ thuần (#1109, 842490 tầng «Của súng phun …» ↔ «8424.20.11»): giải tên điều kiện ra nút SÂU NHẤT
    // khớp nguyên văn trong cây (lib/ten-sang-ma.js#tenSangMaSau); mọi mã của dữ kiện nằm trong nút đó ⇒ THOẢ. Chỉ THÊM THOẢ —
    // ngoài ra giữ cách so cũ.
    if (sm === null && laMaThuan(fv)) {
      const TSM = require('./ten-sang-ma');
      const fm = maThamChieu(fv); const rvTho = TSM.tenSangMaSau(v);
      // Chỉ tên ĐỦ CỤ THỂ: ≤ 4 nút khớp, mọi nút ở mức phân nhóm (≥ 6 số) — tên chung («thiết bị») hoặc chỉ khớp một MỤC trong tên
      // nhóm 4 số liệt kê nhiều hàng thì không kết luận.
      const rv = rvTho.length <= 4 && rvTho.every((c) => c.length >= 6) ? rvTho : [];
      if (fm.length && rv.length && fm.every((f) => rv.some((c) => f.startsWith(c)))) return 'THOA';
      if (fm.length && fm.every((f) => TSM.laTenCuaMa(v, f))) return 'THOA';
      // TRÁI chặt: mã rời mọi nút sâu, và mọi nút nông (tenSangMa) chứa mã đều đã được tên tách riêng thành nút sâu hơn
      // (nhóm 8424 có mục «súng phun» nhưng phân nhóm 842420 mới là «Súng phun…» ⇒ 8424.82.10 không phải súng phun).
      const nong = TSM.tenSangMa(v);
      if (fm.length && rv.length && fm.every((f) => !rv.some((c) => f.startsWith(c)) && nong.filter((c) => f.startsWith(c)).every((c) => rv.some((d) => d !== c && d.startsWith(c))))) { soDuoc = true; continue; }
    }
    if (sm === 'KHONG_MA' && !chuMoTa(v)) { soDuoc = true; moiPhuongAnLech = false; continue; }
    if (sm && sm !== 'KHONG_MA') { soDuoc = true; if (sm === 'CHUA_BIET') moiPhuongAnLech = false; continue; }
    // Dữ kiện toàn ASCII (tiếng Anh) so với tên tiếng Việt có dấu: không so được.
    if (!KHONG_ASCII.test(fv) && KHONG_ASCII.test(v)) { moiPhuongAnLech = false; continue; }
    soDuoc = true;
    const A = amTiet(v);
    if (A.length && A.every((x) => F.has(x))) return 'THOA';
    const fTrongA = [...F].every((x) => A.includes(x)); // dữ kiện chung hơn tên dòng ("quạt" ⊂ "quạt bàn")
    if (fTrongA) moiPhuongAnLech = false;
  }
  return soDuoc && moiPhuongAnLech ? 'TRAI' : 'CHUA_BIET';
}

/**
 * "Tên cụ thể hơn thắng" (#577) giữa HAI dòng cùng CO trên một bộ dữ kiện F: với mỗi khoá chữ tự do (TEN_LOAI/CONG_DUNG)
 * cả hai cùng ghi điều kiện khẳng định, lấy giá trị khớp dài nhất (tập âm tiết ⊆ dữ kiện) của mỗi bên; tập của A chứa trọn và
 * lớn hơn tập của B ⇒ A cụ thể hơn ("bàn đạp" ⊃ "bàn", "xe của búp bê" ⊃ "búp bê"). Không tất định — chỉ dùng để KHÔNG
 * kết luận chồng lấn ở cổng 2 và để doiChieuPhanNhom bỏ dòng bị lấn; lúc chạy so chữ tự do không bao giờ tự chốt.
 * @param {object[]} dsA điều kiện khẳng định (PHAI_CO) trên đường đi của dòng A
 * @param {object[]} dsB … của dòng B
 * @param {Map} F dữ kiện đã chuẩn (chuanDuKien)
 * @returns {1|-1|0} 1 = A cụ thể hơn, -1 = B cụ thể hơn, 0 = không phân được
 */
function tenCuTheHon(dsA, dsB, F) {
  // Mỗi điều kiện (phương án "hoặc") góp giá trị khớp dài nhất; các điều kiện cùng khoá trên đường đi là VÀ ⇒ HỢP âm tiết
  // (#653: .22 dưới tiêu đề "Búp bê" + "Quần áo" khớp {quần, áo, búp, bê} ⊃ {búp, bê} của .21 "Búp bê").
  const tapKhop = (ds, fact, fv) => {
    const Fs = new Set(amTiet(fv)); let hop = null;
    for (const c of ds || []) {
      if (!c || c.fact !== fact || c.chieu === 'PHAI_KHONG' || !laOpChuTuDo(c.op)) continue;
      let best = null;
      for (const v of dsGiaTri(c.value)) { const A = amTiet(v); if (A.length && A.every((x) => Fs.has(x)) && (!best || A.length > best.length)) best = A; }
      if (best) { hop = hop || new Set(); best.forEach((x) => hop.add(x)); }
    }
    return hop;
  };
  const chua = (X, Y) => X.size > Y.size && [...Y].every((x) => X.has(x));
  let phieu = 0; let lech = false;
  const facts = new Set([...(dsA || []), ...(dsB || [])].filter((c) => c && laOpChuTuDo(c.op)).map((c) => c.fact));
  for (const fact of facts) {
    const f = F.get(fact); if (!f || f.xungDot || typeof f.giaTri !== 'string') continue;
    const a = tapKhop(dsA, fact, f.giaTri); const b = tapKhop(dsB, fact, f.giaTri);
    if (!a || !b) continue;
    const v = chua(a, b) ? 1 : chua(b, a) ? -1 : 0;
    if (!v) continue;
    if (phieu && phieu !== v) lech = true;
    phieu = v;
  }
  // Bên nào còn ràng buộc khẳng định trên khoá mà bên kia không nhắc tới thì cụ thể hơn theo TRỤC khác (853669: .10 "Phích
  // cắm điện thoại" ↔ tiêu đề "… phích cắm cho cáp đồng trục và mạch in") ⇒ phiếu ngược chiều, không phân được.
  // #653: NGOẠI LỆ — bên CHUNG (bên thua phiếu tên) chỉ thêm giới hạn TẤT ĐỊNH (số, có-không, liệt kê, chất liệu) trên khoá
  // bên kia không nhắc tới: đó là tinh chỉnh BÊN TRONG tên chung (8409.91 .16 "Piston, đường kính ngoài 50–155 mm" ↔ .18 "Bạc
  // piston": bạc piston không phải piston), không phải trục phân loại khác ⇒ tên chứa trọn vẫn thắng. Hai dòng cùng CO trên F
  // nên giới hạn thêm ấy không làm chúng rời nhau. Giới hạn chữ tự do (dungCho/congDung: nơi lắp, công dụng) vẫn là trục khác
  // (853669) ⇒ không phân như trước.
  const tatDinhKhoa = (f) => { const k = khoaTV(f); return Boolean(k) && !['TEN_LOAI', 'CONG_DUNG'].includes(k.kieu); };
  const fk = (ds) => new Set((ds || []).filter((c) => c && c.chieu !== 'PHAI_KHONG').map((c) => c.fact));
  const fa = fk(dsA); const fb = fk(dsB);
  for (const [X, Y, v] of [[fa, fb, 1], [fb, fa, -1]]) {
    const them = [...X].filter((f) => !Y.has(f));
    if (!them.length) continue;
    if (!phieu) return 0; // không có phiếu tên nào: khác trục thuần tuý — không phân
    if (phieu !== v && them.every(tatDinhKhoa)) continue;
    if (phieu !== v) lech = true;
  }
  return lech ? 0 : phieu;
}

/** Các phương án DNF (điều kiện ngoài HOAC × một phương án mỗi HOAC) của một danh sách điều kiện, chỉ giữ phương án THOẢ trên F. */
function phuongAnThoa(ds, F) {
  const ngoai = (ds || []).filter((c) => !(c && c.op === 'HOAC'));
  let pa = [ngoai];
  for (const h of (ds || []).filter((c) => c && c.op === 'HOAC' && Array.isArray(c.phuongAn))) pa = pa.flatMap((p) => h.phuongAn.map((q) => [...p, ...(Array.isArray(q) ? q : [])]));
  return pa.filter((p) => p.every((c) => danhGiaTrenMap(c, F).trangThai === 'THOA'));
}
const laKhangDinh = (c) => Boolean(c) && c.chieu !== 'PHAI_KHONG';
/**
 * Cặp CHÉO KHOÁ (#600, quyết định GĐ (a)): phương án `ten` có tenLoai X, phương án `bp` là "bộ phận của Y" (laBoPhan CO +
 * dungCho Y, không tenLoai riêng) — mẫu "X và (các) bộ phận của chúng". Đưa về đúng đầu vào của tenCuTheHon: điều kiện
 * tenLoai / dungCho PHÂN BIỆT (không có y hệt ở phương án bên kia — điều kiện tổ tiên chung không tính) thay bằng MỘT điều
 * kiện tenLoai mang các giá trị khớp dữ kiện của chính bên đó (X khớp dữ kiện tenLoai, Y khớp dữ kiện dungCho); dữ kiện tenLoai
 * = ghép chữ các giá trị ấy. Không phải cặp chéo khoá ⇒ null.
 */
function capCheoKhoa(ten, bp, F) {
  const jt = new Set(ten.map((c) => JSON.stringify(c))); const jb = new Set(bp.map((c) => JSON.stringify(c)));
  const tenX = ten.filter((c) => !jb.has(JSON.stringify(c)) && laKhangDinh(c) && c.fact === 'tenLoai' && c.op === 'TEN_LOAI');
  const riengB = bp.filter((c) => !jt.has(JSON.stringify(c)));
  const dungY = riengB.filter((c) => laKhangDinh(c) && c.fact === 'dungCho' && c.op === 'CONG_DUNG');
  if (!tenX.length || !dungY.length || riengB.some((c) => laKhangDinh(c) && c.fact === 'tenLoai')) return null;
  if (!bp.some((c) => laKhangDinh(c) && c.fact === 'laBoPhan' && c.op === 'CO')) return null;
  const khop = (ds) => [...new Set(ds.flatMap((c) => dsGiaTri(c.value).filter((v) => danhGiaTrenMap({ ...c, value: v }, F).trangThai === 'THOA')))];
  const xs = khop(tenX); const ys = khop(dungY);
  if (!xs.length || !ys.length) return null;
  const thay = (ds, bo, vals) => [...ds.filter((c) => !bo.includes(c)), { fact: 'tenLoai', op: 'TEN_LOAI', value: vals }];
  const F2 = new Map(F); F2.set('tenLoai', { fact: 'tenLoai', giaTri: [...xs, ...ys].join(' ') });
  return { xs, ys, ten: thay(ten, tenX, xs), bp: thay(bp, dungY, ys), F: F2 };
}
/**
 * "Tên cụ thể hơn thắng" giữa hai DÒNG (#600, quyết định GĐ (a)) — CÙNG ngữ nghĩa tenCuTheHon, mở rộng tới:
 *  (1) điều kiện trong HOAC: mỗi bên trải thành các phương án THOẢ trên F (phuongAnThoa); bên không có HOAC giữ nguyên;
 *  (2) cặp chéo khoá tenLoai X ↔ laBoPhan CO + dungCho Y (capCheoKhoa): 845290 .11 "bàn đạp" ⊃ .12 "bộ phận của Bàn".
 * MỌI cặp phương án (A, B) phải phân được (tenCuTheHon ≠ 0, hoặc chéo khoá ≠ 0) và CÙNG chiều; một cặp không phân được ⇒ 0.
 * Không có HOAC, không chéo khoá ⇒ y hệt tenCuTheHon(dsA, dsB, F). Không tất định — doiChieuPhanNhom bỏ dòng bị lấn, cổng 2
 * không kết luận chồng lấn; cả hai gọi CÙNG hàm này (cổng xanh ⇒ lúc chạy cũng phân).
 * @param {{cheo?: Function, roi?: Function}} opts (xs, ys, tenLaA) ⇒ boolean. `cheo`: nhận chiều của một cặp chéo khoá (mặc
 *   định nhận; cổng chỉ nhận tên đầu nguyên văn của nút rẽ nhánh). `roi`: coi cặp chéo khoá là RỜI (loại trừ, không chiều) —
 *   chỉ cổng dùng (luật tên nguyên văn của anh em); mặc định không.
 * @returns {1|-1|0}
 */
function tenCuTheHonDong(dsA, dsB, F, opts = {}) {
  const coHoac = (ds) => (ds || []).some((c) => c && c.op === 'HOAC');
  const pa = coHoac(dsA) ? phuongAnThoa(dsA, F) : [dsA || []];
  const pb = coHoac(dsB) ? phuongAnThoa(dsB, F) : [dsB || []];
  if (!pa.length || !pb.length) return 0;
  const cheo = typeof opts.cheo === 'function' ? opts.cheo : () => true;
  const roi = typeof opts.roi === 'function' ? opts.roi : () => false;
  let phieu = 0;
  for (const p of pa) {
    for (const q of pb) {
      let v = tenCuTheHon(p, q, F); let laRoi = false;
      if (!v) {
        for (const [ten, bp, tenLaA] of [[p, q, true], [q, p, false]]) {
          const ck = capCheoKhoa(ten, bp, F);
          if (!ck) continue;
          const w = tenLaA ? tenCuTheHon(ck.ten, ck.bp, ck.F) : tenCuTheHon(ck.bp, ck.ten, ck.F);
          if (w && cheo(ck.xs, ck.ys, tenLaA)) { v = w; break; }
          if (roi(ck.xs, ck.ys, tenLaA)) { laRoi = true; break; }
        }
      }
      if (laRoi) continue;
      if (!v || (phieu && phieu !== v)) return 0;
      phieu = v;
    }
  }
  return phieu;
}

const lat =(tt) => (tt === 'THOA' ? 'TRAI' : tt === 'TRAI' ? 'THOA' : tt);

/** Ánh xạ fact cũ (snake_case của sổ tay) → khoá tu-vung@1, từ data/tu-vung/anh-xa-cu.json (L1-3a). */
let _anhXa = null;
function anhXaCu() {
  if (!_anhXa) {
    _anhXa = {};
    try {
      const ax = JSON.parse(fs.readFileSync(dataReadPath(path.join('tu-vung', 'anh-xa-cu.json')), 'utf8'));
      for (const [cu, moi] of Object.entries(ax.anhXa || {})) { const m = cu.match(/^data\/so-tay\/\*\.json#(.+)$/); if (m) _anhXa[m[1]] = moi; }
    } catch { /* thiếu tệp → không ánh xạ */ }
  }
  return _anhXa;
}

/**
 * Chấm MỘT điều kiện trên MỘT mục dữ kiện đã chuẩn (chuanDuKien) — hoặc null khi chưa có.
 * Điều kiện cũ (fact snake_case) chấm qua anh-xa-cu; không ánh xạ được → CHUA_BIET, lyDo 'fact-cu-chua-anh-xa'.
 * @returns {{trangThai:'THOA'|'TRAI'|'CHUA_BIET', tatDinh:boolean, giaTriDocDuoc?:any, lyDo?:string}}
 */
function danhGiaDieuKien(c, f) {
  if (!c || typeof c !== 'object') return { trangThai: 'CHUA_BIET', tatDinh: true, lyDo: 'dieu-kien-hong' };
  if (c.op === 'HOAC') {
    // Một phương án mọi vế THOẢ ⇒ THOA (tất định khi mọi vế của phương án đó tất định); mọi phương án có vế TRÁI ⇒ TRAI
    // (tất định khi mỗi phương án có một vế TRÁI tất định); còn lại CHUA_BIET.
    let allFail = true; let traiTatDinh = true; let thoa = null;
    for (const alt of c.phuongAn || []) {
      const r = (alt || []).map((cc) => danhGiaDieuKien(cc, f && f._map ? (f._map.get(factCuaDk(cc)) || null) : null));
      if (r.length && r.every((x) => x.trangThai === 'THOA')) { const td = r.every((x) => x.tatDinh); if (!thoa || td) thoa = { trangThai: 'THOA', tatDinh: td }; if (td) break; continue; }
      const trai = r.filter((x) => x.trangThai === 'TRAI');
      if (!trai.length) allFail = false; else if (!trai.some((x) => x.tatDinh)) traiTatDinh = false;
    }
    if (thoa) return thoa;
    return allFail ? { trangThai: 'TRAI', tatDinh: traiTatDinh } : { trangThai: 'CHUA_BIET', tatDinh: true };
  }
  let k = khoaTV(c.fact);
  let cc = c;
  if (!k) {
    const moi = anhXaCu()[c.fact];
    k = khoaTV(moi);
    if (!k) return { trangThai: 'CHUA_BIET', tatDinh: true, lyDo: 'fact-cu-chua-anh-xa' };
    cc = { ...c, fact: moi };
  }
  const tatDinh = !['TEN_LOAI', 'CONG_DUNG'].includes(k.kieu);
  const ket = (tt, extra = {}) => ({ trangThai: cc.chieu === 'PHAI_KHONG' ? lat(tt) : tt, tatDinh, ...extra });
  if (!f) return ket('CHUA_BIET', { lyDo: 'thieu-du-kien' });
  if (f.xungDot) return ket('CHUA_BIET', { lyDo: 'du-kien-trai-nhau' });
  const g = f.giaTri;
  switch (k.kieu) {
    case 'SO': {
      const fi = khoangDuKien(k, f);
      const cv = TV.quyDoi(k.khoa, cc.value, cc.donVi);
      if (!fi || cv == null) return ket('CHUA_BIET', { lyDo: 'khong-quy-doi-duoc' });
      const ci = khoangOp(cc.op, tron(cv));
      return ket(conCua(fi, ci) ? 'THOA' : roiNhau(fi, ci) ? 'TRAI' : 'CHUA_BIET', { giaTriDocDuoc: f.cacGiaTri || (f.op ? `${f.op} ${g}` : g) });
    }
    case 'CO_KHONG':
      if (typeof g !== 'boolean') return ket('CHUA_BIET', { lyDo: 'sai-kieu' });
      return ket((cc.op === 'CO') === g ? 'THOA' : 'TRAI', { giaTriDocDuoc: g });
    case 'LIET_KE': {
      const vs = dsGiaTri(g);
      if (vs.length === 1 && vs[0] === NGOAI_LIET_KE) return ket('TRAI', { giaTriDocDuoc: g });
      if (!vs.length || vs.some((v) => !(k.giaTriHopLe || []).includes(v))) return ket('CHUA_BIET', { lyDo: 'ngoai-gia-tri-hop-le' });
      // Giá trị CHA ⊃ giá trị con (từ vựng `giaTriCha`, #1109 610520 NHAN_TAO ⊃ SOI_TONG_HOP, SOI_TAI_TAO): điều kiện ghi cha nhận
      // dữ kiện con (THOẢ); dữ kiện ghi cha so với điều kiện chỉ ghi một phần con ⇒ CHƯA BIẾT (hỏi), không TRÁI.
      const conCuaGT = (v) => (k.giaTriCha && k.giaTriCha[v]) || [];
      const thuocDk = (v) => cc.value.includes(v) || cc.value.some((c) => conCuaGT(c).includes(v));
      const chungHon = (v) => conCuaGT(v).some((c) => cc.value.includes(c));
      const trong = vs.filter(thuocDk).length;
      if (trong < vs.length && vs.some((v) => !thuocDk(v) && chungHon(v))) return ket('CHUA_BIET', { giaTriDocDuoc: g, lyDo: 'gia-tri-chung-hon' });
      return ket(trong === vs.length ? 'THOA' : trong === 0 ? 'TRAI' : 'CHUA_BIET', { giaTriDocDuoc: g });
    }
    case 'CHAT_LIEU_THEO_VI_TRI': {
      const vt = cc.viTri || 'CHINH';
      const can = dsGiaTri(cc.value);
      const tai = dsGiaTri(g).filter((x) => x && (x.viTri || 'CHINH') === vt).map((x) => x.chatLieu);
      if (!tai.length) return ket('CHUA_BIET', { lyDo: 'chua-biet-chat-lieu-o-vi-tri' });
      if (tai.some((m) => can.some((v) => thuoc(m, v)))) return ket('THOA', { giaTriDocDuoc: tai });
      if (tai.some((m) => can.some((v) => thuoc(v, m)))) return ket('CHUA_BIET', { giaTriDocDuoc: tai, lyDo: 'chat-lieu-chung-hon' });
      return ket('TRAI', { giaTriDocDuoc: tai });
    }
    case 'TEN_LOAI':
    case 'CONG_DUNG': {
      const tt = soChu(dsGiaTri(cc.value), g);
      if (cc.op !== 'TUONG_TU' || tt === 'THOA') return ket(tt, { giaTriDocDuoc: g });
      // Vế mở (#577 vòng 7): tên không khớp hàng nêu ⇒ chưa biết có "tương tự" không — hỏi; không bao giờ TRÁI vì khác tên.
      const khoaTT = khoaTuongTu(cc);
      const traLoi = f.tuongTu && typeof f.tuongTu === 'object' ? f.tuongTu[khoaTT] : undefined;
      if (typeof traLoi === 'boolean') return ket(traLoi ? 'THOA' : 'TRAI', { giaTriDocDuoc: g, lyDo: 'tuong-tu-tra-loi', theoTraLoi: true });
      return ket('CHUA_BIET', { giaTriDocDuoc: g, lyDo: 'tuong-tu-chua-chot', tuongTu: { khoa: khoaTT, giaTriNeu: dsGiaTri(cc.value) } });
    }
    default: return ket('CHUA_BIET', { lyDo: 'kieu-la' });
  }
}
function factCuaDk(c) {
  return khoaTV(c?.fact) ? c.fact : (anhXaCu()[c?.fact] || c?.fact);
}
/** Chấm một điều kiện (kể cả HOAC) trên Map dữ kiện đã chuẩn (chuanDuKien). */
function danhGiaTrenMap(c, F) {
  return c && c.op === 'HOAC' ? danhGiaDieuKien(c, { _map: F }) : danhGiaDieuKien(c, F.get(factCuaDk(c)) || null);
}

/**
 * Chấm một điều kiện CÓ KIỂU trên chữ mô tả hàng (đường chotDong8): đọc dữ kiện bằng docGiaTri của tu-vung@1 rồi chấm
 * như trên. Trả { trangThai: THOA|TRAI|CHUA_BIET, tatDinh, giaTriDocDuoc?, bangChung? }.
 */
function giaoKhoang(a, b) {
  if (!a || !b || roiNhau(a, b)) return null;
  const lo = a.lo > b.lo ? a.lo : b.lo;
  const loIn = a.lo > b.lo ? a.loIn : b.lo > a.lo ? b.loIn : (a.loIn && b.loIn);
  const hi = a.hi < b.hi ? a.hi : b.hi;
  const hiIn = a.hi < b.hi ? a.hiIn : b.hi < a.hi ? b.hiIn : (a.hiIn && b.hiIn);
  return { lo, loIn, hi, hiIn };
}
const escRe = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normTen = (s) => String(s || '').normalize('NFC').replace(/^[-\s–]+/, '').replace(/\s+/g, ' ').trim().toLowerCase();
const RE_PHU_DINH_VE = /(?:(?<![\p{L}\p{M}])(?:(?:không|ko|k)\s+(?:phải|thuộc|có|dùng(?:\s+cho)?|thích\s+hợp|lắp)|chưa\s+có|trừ|ngoại\s+trừ|excluding|other\s+than|without|not)(?![\p{L}\p{M}])(?:\s+[\p{L}\p{M}]+){0,3}\s*$|(?<![\p{L}\p{M}])chưa(?![\p{L}\p{M}])(?:\s+(?:có|lắp|gắn|qua|được|phải|thuộc|dùng(?:\s+cho)?|là|loại|dạng|kiểu))?\s*$|(?<![\p{L}\p{M}])non-(?:[\p{L}\p{M}]+\s+){0,2}\s*$)/iu;
const RE_TIEN_TO_CONG_DUNG = /(?<![\p{L}\p{M}])(?:dùng\s+cho|sử\s+dụng\s+cho|lắp\s+cho|của)\s+(?:đèn\s+của\s+|bóng\s+đèn\s+|đèn\s+)?$/iu;
const { syllables: tachAmTiet, STOPWORDS: TU_DUNG } = require('./vi-tokens');
const { boCumTuyChon } = require('./cum-tuy-chon');

const TU_CHUNG_TEN_LOAI = new Set([
  ...TU_DUNG,
  'loại', 'khác', 'dạng', 'kiểu', 'thứ', 'nhóm', 'phân', 'chương', 'mã', 'số',
  'hàng', 'hóa', 'hoá', 'chế', 'phẩm', 'sản', 'chi', 'tiết', 'bộ', 'phận', 'phụ', 'kiện', 'tùng', 'linh',
  'đồ', 'vật', 'cái', 'chiếc', 'mới', 'cũ', 'thông', 'thường', 'chủ', 'yếu', 'riêng', 'chung',
  'dùng', 'sử', 'dụng', 'thích', 'hợp', 'làm', 'bằng', 'từ', 'có', 'không', 'đã', 'chưa',
  'hoặc', 'và', 'với', 'trong', 'ngoài', 'trên', 'dưới', 'cho', 'của', 'thuộc', 'kể', 'cả', 'trừ',
  'bột', 'lỏng',
  'other', 'others', 'for', 'of', 'the', 'and', 'or', 'with', 'in', 'to', 'from', 'by', 'on', 'at', 'as',
  'parts', 'part', 'type', 'types', 'kind', 'kinds', 'form', 'forms', 'articles', 'article', 'goods', 'preparations', 'products',
]);

const _tuChaCache = new Map();
function tuChaCua(maHs) {
  const code = nz(maHs);
  if (code.length < 6) return new Set();
  const pn6 = code.slice(0, 6);
  if (_tuChaCache.has(pn6)) return _tuChaCache.get(pn6);
  const nhom4 = code.slice(0, 4);
  const nPn6 = T.nodeOf(pn6);
  const nhieuDong = (nPn6?.children || []).length > 1;
  if (!nhieuDong) {
    const empty = new Set();
    _tuChaCache.set(pn6, empty);
    return empty;
  }
  const n4 = T.nodeOf(nhom4);
  const texts = [n4?.tenVi || '', n4?.tenEn || '', nPn6?.tenVi || '', nPn6?.tenViNghi || '', nPn6?.tenEn || ''];
  const p5 = T.chaTang(pn6);
  if (p5 && p5 !== nhom4) {
    const np5 = T.nodeOf(p5);
    texts.push(np5?.tenVi || '', np5?.tenViNghi || '', np5?.tenEn || '');
  }
  const set = new Set(tachAmTiet(texts.join(' ')));
  _tuChaCache.set(pn6, set);
  return set;
}

function cumPhanBiet(p, maHs) {
  const toks = tachAmTiet(String(p || ''));
  if (!toks.length) return [];
  const cha = tuChaCua(maHs);
  const out = toks.filter((t) => !cha.has(t) && !TU_CHUNG_TEN_LOAI.has(t));
  if (!out.length && maHs && (T.nodeOf(nz(maHs).slice(0, 6))?.children || []).length <= 1) {
    return toks.filter((t) => !TU_DUNG.has(t));
  }
  return out;
}

function coCumPhanBiet(p, maHs) {
  return cumPhanBiet(p, maHs).length > 0;
}

function khopCumTrongChu(tNorm, p, { laTenLoai = false } = {}) {
  const pt = String(p || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!pt) return null;
  const re = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escRe(pt)}(?![\\p{L}\\p{M}\\p{N}])`, 'giu');
  let coPhuDinh = false;
  let hitKhangDinh = null;
  for (const m of tNorm.matchAll(re)) {
    const before = tNorm.slice(0, m.index);
    const after = tNorm.slice(m.index + m[0].length);
    if (!/com-?pắc/iu.test(pt) && /^\s+com-?pắc\b/iu.test(after)) continue;
    // "có hoặc không có đầu" / "whether or not refined" = cụm TUỲ CHỌN, KHÔNG ràng buộc gì (OZV-276).
    // Xoá liên từ tuỳ chọn khỏi vế TRƯỚC KHI dò phủ định, nếu không nhánh `không\s+có` (cho cách cụm
    // tối đa 3 từ) đọc "…có hoặc không có đầu" thành "không có đầu" — sai ngược nghĩa. boCumTuyChon
    // thay bằng khoảng trắng cùng độ dài nên vị trí/ranh giới từ còn nguyên.
    const clauseBefore = boCumTuyChon(before.split(/[.;:!\n()—–]|\s-\s|,(?!\d)\s*/u).pop() || '');
    if (RE_PHU_DINH_VE.test(clauseBefore)) {
      coPhuDinh = true;
      continue;
    }
    if (laTenLoai && RE_TIEN_TO_CONG_DUNG.test(before)) continue;
    if (!hitKhangDinh) hitKhangDinh = m[0];
  }
  if (coPhuDinh) return { trangThai: 'PHU_DINH', bangChung: pt };
  return hitKhangDinh ? { trangThai: 'KHANG_DINH', bangChung: hitKhangDinh } : null;
}

const _tenKhacNhomCache = new Map();
function docTenKhacTep(nhom4) {
  const k = nz(nhom4).slice(0, 4);
  if (k.length !== 4) return [];
  const p = dataReadPath(`tu-vung/ten-khac-${k}.json`);
  if (!_tenKhacNhomCache.has(p)) {
    let muc = [];
    try {
      const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
      muc = Array.isArray(obj?.muc) ? obj.muc : Array.isArray(obj) ? obj : [];
    } catch { muc = []; }
    _tenKhacNhomCache.set(p, muc);
  }
  return _tenKhacNhomCache.get(p);
}

function layMucTenKhac(maHs = null) {
  const tk = TV.taiTuVung()?.tenKhac;
  const raw = !tk ? [] : Array.isArray(tk) ? [...tk] : Array.isArray(tk.muc) ? [...tk.muc] : Object.values(tk).flatMap((v) => (Array.isArray(v) ? v : []));
  const nhom4 = nz(maHs).slice(0, 4);
  if (nhom4.length === 4) {
    for (const m of docTenKhacTep(nhom4)) raw.push(m);
  }
  return raw.filter((m) => m && typeof m === 'object' && m.nhan !== 'THAM_KHAO' && m.nguon?.nhan !== 'THAM_KHAO' && m.capNguon !== 'L3');
}

/**
 * Chấm một điều kiện CÓ KIỂU trên chữ mô tả hàng (đường chotDong8): đọc dữ kiện bằng docGiaTri của tu-vung@1 rồi chấm
 * như trên. Trả { trangThai: THOA|TRAI|CHUA_BIET, tatDinh, giaTriDocDuoc?, bangChung? }.
 */
function danhGiaTuChu(c, text, hs = null, opts = {}) {
  const maHs = nz(hs || c?._hs);
  if (c && c.op === 'HOAC') {
    if (maHs) {
      const tNorm = String(text || '').normalize('NFC');
      for (const m of layMucTenKhac(maHs)) {
        if (nz(m.ma || m.hs) !== maHs || m.loai === 'TRAI_NGHIA') continue;
        for (const p of [...(m.cachDoc?.vi || []), ...(m.cachDoc?.en || [])]) {
          if (!coCumPhanBiet(p, maHs)) continue;
          const hit = khopCumTrongChu(tNorm, p);
          if (hit?.trangThai === 'KHANG_DINH') return { trangThai: 'THOA', tatDinh: true, giaTriDocDuoc: hit.bangChung, bangChung: hit.bangChung };
        }
      }
    }
    let allFail = true; let traiTatDinh = true; let thoa = null;
    for (const alt of c.phuongAn || []) {
      const r = (alt || []).map((cc) => danhGiaTuChu(cc, text, maHs, opts));
      if (r.length && r.every((x) => x.trangThai === 'THOA')) {
        const td = r.every((x) => x.tatDinh);
        if (!thoa || td) thoa = { trangThai: 'THOA', tatDinh: td };
        if (td) break;
        continue;
      }
      const trai = r.filter((x) => x.trangThai === 'TRAI');
      if (!trai.length) allFail = false;
      else if (!trai.some((x) => x.tatDinh)) traiTatDinh = false;
    }
    if (thoa) return thoa;
    return allFail ? { trangThai: 'TRAI', tatDinh: traiTatDinh } : { trangThai: 'CHUA_BIET', tatDinh: true };
  }
  let k = khoaTV(c?.fact);
  let cc = c;
  if (!k && c?.fact) {
    const moi = anhXaCu()[c.fact];
    k = khoaTV(moi);
    if (k) cc = { ...c, fact: moi };
  }
  if (!k) return { trangThai: 'CHUA_BIET', tatDinh: true, lyDo: 'fact-khong-co-trong-tu-vung' };
  let r;
  try { r = TV.docGiaTri(cc.fact, text); } catch { r = null; }
  if (k.kieu === 'CO_KHONG' && r?.trangThai === 'DA_CO' && r.giaTri === false && r.bangChung && !RE_PHU_DINH_VE.test(r.bangChung)) {
    const tStr = String(text || '');
    const idx = tStr.indexOf(r.bangChung);
    const before = idx >= 0 ? tStr.slice(0, idx) : '';
    const lastComma = before.lastIndexOf(',');
    if (lastComma >= 0 && !/(?<![\p{L}\p{M}])(?:không|chưa|trừ|ngoại\s+trừ|chẳng|without|excluding|other\s+than|non|not)\b/iu.test(before.slice(lastComma + 1))) {
      try {
        const rSeg = TV.docGiaTri(cc.fact, tStr.slice(lastComma + 1));
        if (rSeg?.trangThai === 'DA_CO' && rSeg.giaTri === true) r = rSeg;
      } catch { /* giữ nguyên r */ }
    }
  }
  const f = r && r.trangThai === 'DA_CO' ? { fact: cc.fact, ...r } : null;
  let out = danhGiaDieuKien(cc, f);
  if (k.kieu === 'SO' && out.trangThai === 'CHUA_BIET' && /(?:\s(?:nhưng|mà|but)\s|[;:—–]|,\s+)/iu.test(String(text || ''))) {
    const parts = String(text || '').split(/(?:\s(?:nhưng|mà|but)\s|[;:—–]|,\s+)/iu);
    const tenCtx = k.cachDoc?.vi?.[0]?.replace(/\\s\+/g, ' ') || k.nhanVi || '';
    let fi = null;
    let seenCtx = false;
    for (let i = 0; i < parts.length; i += 1) {
      const p = parts[i];
      let ri = null;
      try { ri = TV.docGiaTri(cc.fact, p); } catch { ri = null; }
      if (ri && ri.trangThai === 'DA_CO') {
        seenCtx = true;
      } else if (seenCtx && tenCtx && /^\s*(?:không\s+quá|trên|dưới|từ|đến|<=|>=|<|>)/iu.test(p)) {
        try { ri = TV.docGiaTri(cc.fact, `${tenCtx} ${p}`); } catch { ri = null; }
      }
      if (ri && ri.trangThai === 'DA_CO') {
        const fik = khoangDuKien(k, { fact: cc.fact, ...ri });
        if (fik) fi = fi ? giaoKhoang(fi, fik) : fik;
      }
    }
    const cv = TV.quyDoi(k.khoa, cc.value, cc.donVi);
    if (fi && cv != null) {
      const ci = khoangOp(cc.op, tron(cv));
      const tt = conCua(fi, ci) ? 'THOA' : roiNhau(fi, ci) ? 'TRAI' : 'CHUA_BIET';
      out = { ...out, trangThai: cc.chieu === 'PHAI_KHONG' ? lat(tt) : tt, tatDinh: true };
    }
  }
  if ((k.kieu === 'TEN_LOAI' || k.kieu === 'CONG_DUNG') && cc.op !== 'TUONG_TU') {
    const tNorm = String(text || '').normalize('NFC');
    const vals = dsGiaTri(cc.value).map((v) => String(v || '').trim()).filter(Boolean);
    const mucTK = layMucTenKhac(maHs);
    let soBiPhuDinh = 0;
    let bangChungPhuDinh = null;
    let hitKhongTatDinh = null;
    for (const v of vals) {
      const nv = normTen(v);
      const nvNoLoai = nv.replace(/^lo[aạ]i\s+/iu, '').trim();
      const pos = [v];
      if (k.kieu === 'TEN_LOAI' && nvNoLoai && nvNoLoai !== nv) pos.push(v.replace(/^[-\s–]*lo[aạ]i\s+/iu, '').trim());
      const neg = [];
      for (const m of mucTK) {
        const mg = normTen(m.giaTri || m.tenBieu || '');
        const mgNoLoai = mg.replace(/^lo[aạ]i\s+/iu, '').trim();
        const khopMuc = (mg && (mg === nv || mgNoLoai === nvNoLoai)) || (maHs && nz(m.ma || m.hs) === maHs);
        if (!khopMuc) continue;
        const cums = [...(m.cachDoc?.vi || []), ...(m.cachDoc?.en || [])];
        if (m.loai === 'TRAI_NGHIA') neg.push(...cums);
        else pos.push(...cums);
      }
      for (let i = 0; i < pos.length; i += 1) {
        const p = pos[i];
        const hit = khopCumTrongChu(tNorm, p, { laTenLoai: k.kieu === 'TEN_LOAI' && i < (nvNoLoai !== nv ? 2 : 1) });
        if (hit?.trangThai === 'KHANG_DINH') {
          const duPhanBiet = k.kieu === 'TEN_LOAI'
            ? coCumPhanBiet(p, maHs)
            : (coCumPhanBiet(p, maHs) || maThamChieu(p).length > 0 || Boolean(opts?.coTenLoaiPhanBiet));
          if (duPhanBiet) {
            return {
              trangThai: cc.chieu === 'PHAI_KHONG' ? 'TRAI' : 'THOA',
              tatDinh: true,
              giaTriDocDuoc: out.giaTriDocDuoc || hit.bangChung,
              bangChung: hit.bangChung,
            };
          }
          if (!hitKhongTatDinh) hitKhongTatDinh = hit;
        }
      }
      let vPhuDinh = false;
      for (const p of pos) {
        const hit = khopCumTrongChu(tNorm, p);
        if (hit?.trangThai === 'PHU_DINH') { vPhuDinh = true; bangChungPhuDinh ||= hit.bangChung; break; }
      }
      if (!vPhuDinh) {
        for (const np of neg) {
          const hit = khopCumTrongChu(tNorm, np);
          if (hit?.trangThai === 'KHANG_DINH') { vPhuDinh = true; bangChungPhuDinh ||= hit.bangChung; break; }
        }
      }
      if (vPhuDinh) soBiPhuDinh += 1;
    }
    if (vals.length > 0 && soBiPhuDinh === vals.length) {
      return {
        trangThai: cc.chieu === 'PHAI_KHONG' ? 'THOA' : 'TRAI',
        tatDinh: true,
        giaTriDocDuoc: out.giaTriDocDuoc || bangChungPhuDinh,
        bangChung: bangChungPhuDinh,
      };
    }
    if (hitKhongTatDinh) {
      return {
        trangThai: cc.chieu === 'PHAI_KHONG' ? 'TRAI' : 'THOA',
        tatDinh: false,
        giaTriDocDuoc: out.giaTriDocDuoc || hitKhongTatDinh.bangChung,
        bangChung: hitKhongTatDinh.bangChung,
      };
    }
  }
  return { ...out, ...(r?.bangChung ? { bangChung: r.bangChung } : {}) };
}

// ── Đường đi 6→8 số ─────────────────────────────────────────────────────────────────────────────────────────
const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const laTieuDeLoaiKhac = (n) => /^lo[aạ]i kh[aá]c\b/i.test(String(n?.tenVi || '').replace(/^[-\s–]+/, '').trim());
// "Loại khác, kể cả X" (#1109, 2203009 "Loại khác, kể cả bia ale") = phần còn lại trần: vế "kể cả" chỉ nêu ví dụ (PHU, QUY-TRINH
// 3.8), không thu hẹp. Có "trừ" (20089 "… kể cả dạng hỗn hợp trừ loại thuộc phân nhóm 2008.19") thì KHÔNG trần.
const laLoaiKhacTranTen = (n) => { const t = String(n?.tenVi || '').replace(/^[-\s–]+/, '').trim(); return /^lo[aạ]i kh[aá]c\s*(\(SEN\))?\s*[:：]?\s*$/i.test(t) || (/^lo[aạ]i kh[aá]c\s*,\s*kể\s+cả\s/iu.test(t) && !/(^|[^\p{L}])trừ([^\p{L}]|$)/iu.test(t)); };
/** Tiêu đề (7/5 số) bị lược tên: cây theo chữ số dựng nút mà biểu thuế không có tên khớp đúng tập lá (tenViNghi = chỉ khớp tiền tố). */
const laTieuDeLuocTen = (n) => Boolean(n) && n.cap !== 8 && typeof n.cap !== 'number' && !n.tenVi;
/** "Phần còn lại" trần của một tầng: dòng Loại khác trần hoặc tiêu đề có tên "Loại khác" trần. */
const laConLaiTran = (n) => Boolean(n) && (n.cap === 8 ? Boolean(n.loaiKhacTran) : (Boolean(n.tenVi) && laLoaiKhacTranTen(n)));
const LY_DO_LUOC_TEN = 'tieu-de-bi-luoc-ten';
/** Trần số phương án conTang của một anh em tầng (#661) — vượt ⇒ giữ luật cũ (phủ định cả tầng). */
const GIOI_HAN_CON_TANG = 64;
/**
 * Các nhóm điều kiện (mỗi nhóm VÀ) chia KÍN trục số của MỘT khoá SO: mọi điều kiện là so sánh số (không chieu) trên cùng một khoá
 * và hợp các khoảng (quy về đơn vị chuẩn) phủ (-∞, +∞). Điều kiện đủ (không cần) — sai hướng an toàn: không nhận ra ⇒ conTang.
 */
function phuKinTheoSo(ds) {
  if (!Array.isArray(ds) || ds.length < 2) return false;
  let fact = null; const kh = [];
  for (const nhom of ds) {
    if (!Array.isArray(nhom) || !nhom.length) return false;
    let lo = -Infinity; let loIn = false; let hi = Infinity; let hiIn = false;
    for (const c of nhom) {
      if (!c || !OP_SO.includes(c.op) || c.chieu || khoaTV(c.fact)?.kieu !== 'SO') return false;
      if (fact && c.fact !== fact) return false;
      fact = c.fact;
      const v = TV.quyDoi(c.fact, c.value, c.donVi);
      if (!Number.isFinite(v)) return false;
      if (c.op === '>' || c.op === '>=') { if (v > lo || (v === lo && c.op === '>')) { lo = v; loIn = c.op === '>='; } } else if (v < hi || (v === hi && c.op === '<')) { hi = v; hiIn = c.op === '<='; }
    }
    kh.push({ lo, loIn, hi, hiIn });
  }
  kh.sort((a, b) => a.lo - b.lo || (a.loIn === b.loIn ? 0 : a.loIn ? -1 : 1));
  let r = -Infinity; let rIn = true;
  for (const x of kh) {
    if (x.lo > r || (x.lo === r && !x.loIn && !rIn)) return false;
    if (x.hi > r) { r = x.hi; rIn = x.hiIn; } else if (x.hi === r) rIn = rIn || x.hiIn;
  }
  return r === Infinity;
}
const LY_DO_TANG_LUOC = 'tang-bi-luoc';
function napSoTay(h4, opts) {
  if (opts && Object.prototype.hasOwnProperty.call(opts, 'soTay')) return opts.soTay && opts.soTay.nhom === h4 ? opts.soTay : null;
  return require('./so-tay-gates').loadSoTay(h4);
}
function mucCua(soTay, n) {
  if (!soTay) return null;
  if (n.cap === 8) return (soTay.dong8 || []).find((d) => nz(d.hs) === n.id) || null;
  return (soTay.dieuKienNut || []).find((d) => T.chuanMa(d.id) === n.id) || null;
}
const coDieuKien = (m) => Boolean(m && Array.isArray(m.dieuKienSo) && m.dieuKienSo.length);
/** Mục ghi phần còn lại có tên (phanConLai true hoặc mảng mã không rỗng; false = khai rõ KHÔNG phải phần còn lại). */
const coPhanConLai = (m) => Boolean(m) && (m.phanConLai === true || (Array.isArray(m.phanConLai) && m.phanConLai.length > 0));
const nguonCua = (m) => (m ? { nguonLoai: m.nguonLoai || 'AI_DA_KIEM', ma: m.nguon || null, trich: m.trich || null } : null);
const capCua = (n) => (typeof n.cap === 'number' ? n.cap : n.cap === 'TANG_KHONG_MA' ? 'TANG' : n.id.length);

/**
 * Cấu trúc ranh giới 6→8 số của dòng `hs` (không cần dữ kiện): danh sách nhóm yêu cầu
 * { cap, nut, chieu: PHAI_CO|PHAI_KHONG, dieuKien: object[]|null (null = chưa số hoá), nguon, tang, anhEmBiLoai? }.
 * `tang`: 0 = dòng và anh em của dòng, 1 = cha và anh em của cha, … (dùng cho đích lồng — tachDichLong).
 * `anhEmBiLoai` (chỉ PHAI_KHONG một phần còn lại có tên): [{nut, dieuKien}] các anh em mà nó loại ra (anhEmBiLoaiCua).
 * `conTang` (chỉ PHAI_KHONG một anh em TẦNG do phần còn lại có tên `phanConLai` phủ định, #661): [{nut, dieuKien}] các phương án
 * "thuộc tầng" theo con — không thuộc tầng ⇔ điều kiện tầng TRÁI, hoặc mọi phương án có điều kiện TRÁI (chamConTang).
 * @returns {{hs:string, pn6:string|null, nhom:object[], lyDo?:string}}
 */
function duongDiDong8(hs, opts = {}) {
  const code = nz(hs);
  const t = T.tree();
  const n0 = code.length === 8 ? t.nodes.get(code) : null;
  if (!n0 || n0.cap !== 8) return { hs: code, pn6: null, nhom: [], lyDo: 'ma-khong-co-trong-cay' };
  const pn6 = code.slice(0, 6);
  const soTay = napSoTay(code.slice(0, 4), opts);
  if (!soTay) return { hs: code, pn6, nhom: [], lyDo: 'nhom-chua-co-so-tay' };
  const nhom = [];
  const phaiCo = (n) => { const m = mucCua(soTay, n); nhom.push({ cap: capCua(n), nut: n.id, chieu: 'PHAI_CO', dieuKien: coDieuKien(m) ? m.dieuKienSo : null, nguon: nguonCua(m) }); };
  /**
   * PHAI_KHONG anh em của n (bỏ "phần còn lại" trần); chon(id, i) lọc anh em — mọi anh em ("Loại khác") hoặc theo phanConLai.
   * theoCon (#661, quyết định GĐ 01/11/2026 — chỉ phần còn lại CÓ TÊN `phanConLai`): anh em là TẦNG mà các con không phủ kín
   * tầng ⇒ nhóm mang `conTang` (phuongAnCon): "thuộc anh em" = điều kiện tầng VÀ điều kiện của một con — hàng thoả tầng mà
   * không vào con nào rơi về phần còn lại (840991 r12982 "Dùng cho tàu thuyền thuộc Chương 89" chỉ có hai con "Cho động cơ máy
   * thủy …"; bộ phận động cơ phụ của tàu ⇒ 8409917 "Dùng cho động cơ khác"). "Loại khác" trần không đổi.
   */
  const nutCua = (id) => T.nodeOf(id);
  const phuDinhAnhEm = (n, anhEm, chon, theoCon = false) => {
    const conLai = anhEm.filter((id) => laConLaiTran(nutCua(id))).length;
    anhEm.forEach((id, i) => {
      if (id === n.id || !chon(id, i)) return;
      const s = nutCua(id);
      if (s.cap === 8 && s.loaiKhacTran) return;
      const ms = mucCua(soTay, s);
      if (laTieuDeLuocTen(s)) { nhom.push({ cap: capCua(s), nut: s.id, chieu: 'PHAI_KHONG', dieuKien: null, nguon: nguonCua(ms), lyDo: LY_DO_LUOC_TEN, ...(s.tenViNghi ? { tenViNghi: s.tenViNghi } : {}) }); return; }
      if (s.cap !== 8 && laLoaiKhacTranTen(s)) {
        // Tiêu đề "Loại khác" trần không có nội dung khẳng định để phủ định (vòng tròn) → bỏ qua như dòng LK trần,
        // trừ khi tầng có hơn một phần còn lại (tầng bị lược — không biết ranh giới thật).
        if (conLai <= 1) return;
        nhom.push({ cap: capCua(s), nut: s.id, chieu: 'PHAI_KHONG', dieuKien: null, nguon: nguonCua(ms), lyDo: LY_DO_TANG_LUOC });
        return;
      }
      const biLoai = coDieuKien(ms) ? anhEmBiLoaiCua(s, ms, anhEm) : null;
      const con = theoCon && s.cap !== 8 && coDieuKien(ms) ? phuongAnCon(s, 0) : null;
      nhom.push({ cap: capCua(s), nut: s.id, chieu: 'PHAI_KHONG', dieuKien: coDieuKien(ms) ? ms.dieuKienSo : null, nguon: nguonCua(ms), ...(biLoai ? { anhEmBiLoai: biLoai } : {}), ...(con ? { conTang: con } : {}) });
    });
  };
  /**
   * Các phương án "thuộc tầng s" theo con (#661): mỗi con c có điều kiện ⇒ một phương án {nut, dieuKien: điều kiện riêng của c}
   * (c là tầng có con không phủ kín ⇒ nở tiếp: điều kiện c + phương án của cháu). null = các con PHỦ KÍN tầng (có con "phần còn
   * lại" trần, hoặc phần còn lại có tên không điều kiện) ⇒ thuộc s ≡ điều kiện của s như cũ; hoặc KHÔNG BIẾT (con chưa số hoá /
   * chưa duyệt, tiêu đề bị lược tên, quá GIOI_HAN_CON_TANG phương án) ⇒ giữ luật cũ (phủ định cả tầng — hướng an toàn).
   * Con phần còn lại có tên CÓ điều kiện: hợp các con = các anh em nó nêu ∨ điều kiện của nó ⇒ phương án = điều kiện riêng.
   * Các con chia KÍN một khoá số (phuKinTheoSo — 848180 r14566 "Van cổng …": ≤ 5 cm | 5–40 cm | > 40 cm) ⇒ null: tầng phủ kín,
   * chưa biết số đo vẫn là thuộc tầng (MAU_THUAN như cũ, không hạ thành THIEU).
   */
  function phuongAnCon(s, sau) {
    if (!s || s.cap === 8 || sau > 6) return null;
    const kids = T.conTang(s.id);
    if (!kids.length) return null;
    const out = []; let noTiep = false;
    for (const id of kids) {
      const c = nutCua(id);
      if (!c || laConLaiTran(c) || laTieuDeLuocTen(c)) return null;
      const mc = mucCua(soTay, c);
      if (!coDieuKien(mc)) return null;
      const chau = c.cap === 8 ? null : phuongAnCon(c, sau + 1);
      if (!chau) out.push({ nut: c.id, dieuKien: mc.dieuKienSo });
      else { noTiep = true; for (const p of chau) out.push({ nut: p.nut, dieuKien: [...mc.dieuKienSo, ...p.dieuKien] }); }
      if (out.length > GIOI_HAN_CON_TANG) return null;
    }
    if (!noTiep && phuKinTheoSo(out.map((p) => p.dieuKien))) return null;
    return out.length ? out : null;
  }
  /**
   * Anh em mà PHẦN CÒN LẠI CÓ TÊN s loại ra (#697 BD-85-01: .96 "Cáp điện cách điện bằng plastic khác" loại .94/.95). s ≡ điều
   * kiện của s VÀ không thuộc các anh em ấy ⇒ "không thuộc s" cũng đúng khi hàng thoả TRỌN điều kiện của một anh em bị loại.
   * Chỉ lấy anh em có điều kiện khẳng định đầy đủ của riêng nó (không phải "Loại khác", không tự là phần còn lại).
   */
  function anhEmBiLoaiCua(s, ms, anhEm) {
    if (!coPhanConLai(ms)) return null;
    const ids = ms.phanConLai === true ? anhEm.slice(0, anhEm.indexOf(s.id)) : ms.phanConLai.map(T.chuanMa);
    const out = [];
    for (const id of ids) {
      const y = nutCua(id);
      if (!y || id === s.id || (y.cap === 8 ? Boolean(y.loaiKhac) : laTieuDeLoaiKhac(y)) || laTieuDeLuocTen(y)) continue;
      const my = mucCua(soTay, y);
      if (!coDieuKien(my) || coPhanConLai(my)) continue;
      out.push({ nut: y.id, dieuKien: my.dieuKienSo });
    }
    return out.length ? out : null;
  }
  let n = n0; let buoc = 0;
  while (n && n.id !== pn6) {
    const dau = nhom.length;
    const danTang = () => { for (let i = dau; i < nhom.length; i += 1) nhom[i].tang = buoc; buoc += 1; };
    const idCha = T.chaTang(n.id);
    const p = idCha ? nutCua(idCha) : null;
    if (!p) break;
    const anhEm = T.conTang(p.id);
    const m = mucCua(soTay, n);
    if (laTieuDeLuocTen(n)) {
      // Tên bị lược (không có trong biểu thuế dưới dạng khớp tập lá): KHÔNG biết là "Loại khác" hay tiêu đề có nội dung
      // → không đoán, không phủ định anh em; đường đi CHUA_SO_HOA với lý do tường minh.
      nhom.push({ cap: capCua(n), nut: n.id, chieu: 'PHAI_CO', dieuKien: null, nguon: nguonCua(m), lyDo: LY_DO_LUOC_TEN, ...(n.tenViNghi ? { tenViNghi: n.tenViNghi } : {}) });
    } else if (!(n.cap === 8 ? Boolean(n.loaiKhac) : laTieuDeLoaiKhac(n))) {
      // Phần còn lại CÓ TÊN (#577: "Động cơ khác", "Cáp … plastic khác", "…, loại khác"): mục sổ tay ghi `phanConLai`
      // true ⇒ phủ định mọi anh em ĐỨNG TRƯỚC; mảng mã ⇒ phủ định đúng các anh em đó. Không ghi / false ⇒ như cũ (chỉ PHAI_CO).
      // #653: phanConLai mà mục không có điều kiện khẳng định (nội dung chỉ là "các loại khác") ⇒ không nhóm PHAI_CO, chỉ phủ định.
      const pcl = m && m.phanConLai;
      if (!(coPhanConLai(m) && !coDieuKien(m))) phaiCo(n);
      if (pcl === true) { const iN = anhEm.indexOf(n.id); phuDinhAnhEm(n, anhEm, (id, i) => i < iN, true); } else if (Array.isArray(pcl) && pcl.length) { const ds = new Set(pcl.map(T.chuanMa)); phuDinhAnhEm(n, anhEm, (id) => ds.has(id), true); }
    } else {
      // "Loại khác, <vế>" (dòng hoặc tiêu đề): vế riêng là điều kiện khẳng định
      const tran = n.cap === 8 ? Boolean(n.loaiKhacTran) : laLoaiKhacTranTen(n);
      if (!tran || coDieuKien(m)) phaiCo(n);
      // Tầng có ≥ 2 "phần còn lại" trần (dòng LK trần / tiêu đề "Loại khác" trần) = cây theo chữ số đã lược một tầng có tên.
      // #1109 (850432): "Loại khác, <vế>" khai phanConLai true ⇒ chỉ phủ định anh em ĐỨNG TRƯỚC (thứ tự dòng của biểu: .20
      // "Loại khác, dùng cho đồ chơi" đứng trước tầng .4 "Loại khác, ≤ 10 kVA" — biến áp đồ chơi 8 kVA thuộc .20); mảng ⇒ đúng các
      // anh em đó. Không khai ⇒ như cũ (phủ định mọi anh em). Chỉ áp cho LK CÓ vế — LK trần cổng 0 chặn phanConLai.
      const pcl = !tran && m ? m.phanConLai : undefined;
      if (pcl === true) { const iN = anhEm.indexOf(n.id); phuDinhAnhEm(n, anhEm, (id, i) => i < iN); } else if (Array.isArray(pcl) && pcl.length) { const ds = new Set(pcl.map(T.chuanMa)); phuDinhAnhEm(n, anhEm, (id) => ds.has(id)); } else phuDinhAnhEm(n, anhEm, () => true);
    }
    danTang();
    if (p.id === pn6 || p.cap === 6 || p.cap === 4) break;
    n = p;
  }
  return { hs: code, pn6, nhom };
}

/**
 * Tầng của nút `nut` trên đường đi của dòng `hs` (như `tang` của duongDiDong8): 0 = dòng/anh em của dòng, 1 = cha/anh em của
 * cha… null = nút không nằm trên đường 6→8 số của dòng (vd mục loại trừ cấp 4/6).
 */
function tangTrenDuong(hs, nut) {
  const code = nz(hs); const pn6 = code.slice(0, 6);
  const id = T.chuanMa(nut); const chaNut = T.chaTang(id);
  let x = code;
  for (let k = 0; x && x !== pn6 && k < 12; k += 1) {
    const cha = T.chaTang(x);
    if (x === id || (cha && cha === chaNut)) return k;
    if (!cha || cha === pn6) break;
    x = cha;
  }
  return null;
}

/**
 * ĐÍCH LỒNG trên một đường đi (#693, 848390): cùng khoá chữ tự do có điều kiện viết bằng MÃ ở tầng trên (tiêu đề 8483901 "Bộ phận
 * của hàng hóa thuộc phân nhóm 8483.10") và ở tầng dưới (dòng "Dùng cho xe kéo thuộc 8701…"), hai dải mã RỜI nhau (không tiền tố)
 * ⇒ hai đích lồng nhau: tầng trên hỏi đích thứ nhất (bộ phận CỦA gì), tầng dưới hỏi đích kế tiếp (thứ đó lắp cho gì). Dữ kiện
 * được chia theo chuoiDich: ≥ 2 đích ⇒ đích đầu cho tầng trên, phần sau cho tầng dưới; một đích ⇒ chỉ giao cho tầng mà dải mã của
 * nó liên quan (một phía), tầng kia CHƯA BIẾT (hỏi) — "bộ phận của trục 8483.10" chưa nói xe nào, "dùng cho máy kéo" chưa nói có
 * là bộ phận của trục 8483.10 không. Dải tầng dưới nằm trong dải tầng trên (848310: "Chương 87" ⊃ "87.11") là tinh chỉnh, không lồng.
 * @param {{tang?:number, dieuKien:object[]|object|null}[]} cacNhom
 * @param {Map} F dữ kiện đã chuẩn
 * @returns {(tang:number|null|undefined) => Map} F riêng cho từng tầng (không lồng ⇒ luôn F)
 */
function tachDichLong(cacNhom, F) {
  const theoKhoa = new Map();
  for (const g of cacNhom || []) {
    if (typeof g?.tang !== 'number' || !g.dieuKien) continue;
    const ds = traiPhang(Array.isArray(g.dieuKien) ? g.dieuKien : g.dieuKien.op === 'VA' ? g.dieuKien.cacDieuKien || [] : [g.dieuKien]);
    for (const c of ds) {
      if (!c || !['CONG_DUNG', 'TEN_LOAI'].includes(c.op)) continue;
      // maHsTuongUng (Chương 98, #1109): mã tương ứng là ĐỊNH DANH trực tiếp của hàng, không phải đích lồng "<trên> dùng cho
      // <dưới>" — tách theo tầng làm anh em "Loại khác" không phủ định được (981820 .31/.39 không tới được).
      if (c.fact === 'maHsTuongUng') continue;
      const ma = dsGiaTri(c.value).flatMap(maThamChieu);
      if (!ma.length) continue;
      const k = factCuaDk(c);
      if (!theoKhoa.has(k)) theoKhoa.set(k, new Map());
      const m = theoKhoa.get(k);
      if (!m.has(g.tang)) m.set(g.tang, new Set());
      ma.forEach((x) => m.get(g.tang).add(x));
    }
  }
  const thay = [];
  for (const [fact, m] of theoKhoa) {
    const tangs = [...m.keys()].sort((a, b) => b - a);
    if (tangs.length < 2) continue;
    const H = tangs[0]; const tren = [...m.get(H)]; const duoi = tangs.slice(1).flatMap((t) => [...m.get(t)]);
    if (duoi.some((x) => lienQuanMa(x, tren))) continue;
    // Đích lồng thật nối hai NHÓM khác nhau (848390: bộ phận 8483.10 «dùng cho» xe 8701.91). Mã hai tầng cùng nhóm 4 số là mã ANH
    // EM cùng loại (842199: 8421.31 ↔ 8421.29.20 — phủ định anh em ghi mã) — không tách (#1109).
    if (duoi.some((x) => tren.some((y) => x.slice(0, 4) === y.slice(0, 4)))) continue;
    const f = F.get(fact);
    if (!f || f.xungDot || typeof f.giaTri !== 'string') continue;
    const ds = chuoiDich(f.giaTri);
    if (!ds.length) continue;
    let gTren = null; let gDuoi = null;
    if (ds.length >= 2) { gTren = ds[0].text; gDuoi = ds.slice(1).map((d) => d.text).join(' dùng cho '); } else {
      const rT = ds[0].ma.some((x) => lienQuanMa(x, tren)); const rD = ds[0].ma.some((x) => lienQuanMa(x, duoi));
      if (rT && !rD) gTren = ds[0].text; else if (rD && !rT) gDuoi = ds[0].text;
    }
    thay.push({ fact, H, gTren, gDuoi, f });
  }
  if (!thay.length) return () => F;
  const cache = new Map();
  return (tang) => {
    if (typeof tang !== 'number') return F;
    const key = thay.map((t) => (tang >= t.H ? 'T' : 'D')).join('');
    if (!cache.has(key)) {
      const M = new Map(F);
      for (const t of thay) {
        const v = tang >= t.H ? t.gTren : t.gDuoi;
        if (v == null) M.delete(t.fact); else M.set(t.fact, { ...t.f, giaTri: v, cacGiaTri: undefined });
      }
      cache.set(key, M);
    }
    return cache.get(key);
  };
}

/** PHAI_KHONG một anh em có `anhEmBiLoai`: hàng thoả TRỌN điều kiện của một anh em bị loại ⇒ không thuộc anh em ấy. */
/** Các phương án THOẢ (DNF) của một danh sách điều kiện khẳng định: mỗi phương án là danh sách điều kiện lá. */
function phuongAnThoaDs(ds, layF) {
  let pa = [[]];
  for (const c of ds || []) {
    if (!c || c.chieu === 'PHAI_KHONG') continue;
    if (c.op === 'HOAC') {
      const opt = (c.phuongAn || []).map((q) => (Array.isArray(q) ? q : [])).filter((q) => q.length && q.every((x) => danhGiaDieuKien(x, layF(x)).trangThai === 'THOA'));
      pa = pa.flatMap((p) => opt.map((q) => [...p, ...q]));
    } else pa = pa.map((p) => [...p, c]);
  }
  return pa;
}
const laTenLoai = (c) => c && c.fact === 'tenLoai' && c.op === 'TEN_LOAI';
const giaTriThoa = (c, layF) => dsGiaTri(c.value).filter((v) => danhGiaDieuKien({ ...c, value: v }, layF(c)).trangThai === 'THOA').map(String);
/**
 * Đường của dòng (nhóm PHAI_CO ở tầng DƯỚI anh em bị phủ định g) khẳng định tên CỤ THỂ HƠN mọi tên chung làm hàng thoả g, và
 * mọi điều kiện KHÁC tên của phương án thoả g cũng được chính đường dòng khẳng định (853690: dungCho «cáp điện thoại» ⊂ «cáp»).
 * Anh em thoả nhờ điều kiện mà đường dòng không nói tới (930630 .20 «dùng cho súng bắn đinh», 851762 .10 «phiên dịch») ⇒ không áp.
 */
function tenCuTheDuoi(nhom, g, layF) {
  if (typeof g.tang !== 'number') return false;
  const duoi = (nhom || []).filter((x) => x.chieu === 'PHAI_CO' && x.dieuKien && typeof x.tang === 'number' && x.tang < g.tang).flatMap((x) => phuongAnThoaDs(x.dieuKien, layF)[0] || []);
  const cuThe = duoi.filter(laTenLoai).flatMap((c) => giaTriThoa(c, layF));
  if (!cuThe.length) return false;
  const chua = (a, b) => danhGiaDieuKien({ fact: 'tenLoai', op: 'TEN_LOAI', value: a }, { fact: 'tenLoai', giaTri: b }).trangThai === 'THOA';
  const khangDinh = (c) => duoi.some((d) => d.fact === c.fact && dsGiaTri(d.value).some((v) => danhGiaDieuKien(c, { fact: c.fact, giaTri: v }).trangThai === 'THOA'));
  const pa = phuongAnThoaDs(g.dieuKien, layF);
  return pa.length > 0 && pa.every((p) => {
    const chung = p.filter(laTenLoai).flatMap((c) => giaTriThoa(c, layF));
    return chung.length > 0 && chung.every((vs) => cuThe.some((vl) => chua(vs, vl) && !chua(vl, vs))) && p.filter((c) => !laTenLoai(c)).every(khangDinh);
  });
}

function thuocAnhEmBiLoai(g, cham) {
  for (const y of g.anhEmBiLoai || []) {
    const r = (y.dieuKien || []).map(cham);
    if (r.length && r.every((x) => x.trangThai === 'THOA')) return { nut: y.nut, tatDinh: r.every((x) => x.tatDinh) };
  }
  return null;
}

/**
 * PHAI_KHONG một anh em TẦNG có `conTang` (#661): chấm các phương án "thuộc tầng" theo con.
 * @returns {null | {trangThai:'NGOAI', tatDinh:boolean} | {trangThai:'TRONG', nut:string, tatDinh:boolean} | {trangThai:'CHUA_BIET', chuaBiet:object[]}}
 *   NGOAI = mọi phương án có điều kiện TRÁI (hàng không vào con nào ⇒ không thuộc tầng dù thoả điều kiện tầng); TRONG = một phương
 *   án THOẢ trọn; CHUA_BIET = còn phương án chưa quyết (chuaBiet: các điều kiện CHUA_BIET của chúng). Không conTang ⇒ null.
 */
function chamConTang(g, cham) {
  if (!g || !Array.isArray(g.conTang) || !g.conTang.length) return null;
  let tatDinhNgoai = true; let trong = null; const chuaBiet = [];
  for (const p of g.conTang) {
    const r = (p.dieuKien || []).map((c) => ({ c, ...cham(c) }));
    const trai = r.filter((x) => x.trangThai === 'TRAI');
    if (trai.length) { if (!trai.some((x) => x.tatDinh)) tatDinhNgoai = false; continue; }
    if (r.length && r.every((x) => x.trangThai === 'THOA')) { if (!trong) trong = { trangThai: 'TRONG', nut: p.nut, tatDinh: r.every((x) => x.tatDinh) }; continue; }
    chuaBiet.push(...r.filter((x) => x.trangThai === 'CHUA_BIET'));
  }
  if (trong) return trong;
  if (!chuaBiet.length) return { trangThai: 'NGOAI', tatDinh: tatDinhNgoai };
  return { trangThai: 'CHUA_BIET', chuaBiet };
}

const tomDk = (ds) => (ds.length === 1 ? ds[0] : { op: 'VA', cacDieuKien: ds });
function gopKetQua(ds) {
  return ds.reduce((a, b) => (UU_TIEN[b] > UU_TIEN[a] ? b : a), 'CO');
}
const tuTT = { THOA: 'CO', TRAI: 'MAU_THUAN', CHUA_BIET: 'THIEU' };

/**
 * Đối chiếu dữ kiện có kiểu với ranh giới 6→8 số của MỘT dòng (spec §8.3 bước 3, phần ranh giới).
 * @param {string} hs mã 8 số
 * @param {object[]} duKien spec §8.1 duKien[]
 * @param {{soTay?: object|null}} opts soTay tiêm (fixture); bỏ trống → data/so-tay/<nhóm>.json
 * @returns {{hs, ketQua:'CO'|'THIEU'|'MAU_THUAN'|'CHUA_SO_HOA', coCanCuTatDinh:boolean, duongDi:object[], thieu:{fact,cauHoi}[]}}
 */
function doiChieuDong8(hs, duKien, opts = {}) {
  const dd = duongDiDong8(hs, opts);
  const F0 = duKien instanceof Map ? duKien : chuanDuKien(duKien);
  const Ftang = tachDichLong(dd.nhom, F0);
  const duongDi = [];
  const thieuF = new Set();
  if (!dd.nhom.length) {
    return { hs: dd.hs, ketQua: 'CHUA_SO_HOA', coCanCuTatDinh: false, duongDi: [{ cap: 8, nut: dd.hs, dieuKien: null, chieu: 'PHAI_CO', nguon: null, ketQua: 'CHUA_SO_HOA', tatDinh: true, lyDo: dd.lyDo }], thieu: [] };
  }
  for (const g of dd.nhom) {
    const F = Ftang(g.tang);
    const layF = (c) => { const f = F.get(factCuaDk(c)); return c.op === 'HOAC' ? { _map: F } : f || null; };
    const base = { cap: g.cap, nut: g.nut, chieu: g.chieu, nguon: g.nguon };
    if (!g.dieuKien) { duongDi.push({ ...base, dieuKien: null, ketQua: 'CHUA_SO_HOA', tatDinh: true, ...(g.lyDo ? { lyDo: g.lyDo } : {}) }); continue; }
    const r = g.dieuKien.map((c) => ({ c, ...danhGiaDieuKien(c, layF(c)) }));
    const ghiThieu = (x) => { if (x.trangThai !== 'CHUA_BIET') return; if (x.c && x.c.op === 'HOAC') factCuaDieuKien(x.c).forEach((f) => thieuF.add(factCuaDk({ fact: f }))); else thieuF.add(factCuaDk(x.c)); };
    if (g.chieu === 'PHAI_CO') {
      for (const x of r) {
        ghiThieu(x);
        duongDi.push({ ...base, dieuKien: x.c, ketQua: tuTT[x.trangThai], tatDinh: x.tatDinh, ...(x.giaTriDocDuoc !== undefined ? { giaTriDocDuoc: x.giaTriDocDuoc } : {}), ...(x.lyDo ? { lyDo: x.lyDo } : {}) });
      }
    } else {
      // Phủ định một anh em: hàng KHÔNG thuộc s ⇔ ít nhất một điều kiện của s TRÁI.
      const trai = r.filter((x) => x.trangThai === 'TRAI');
      const biLoai = trai.length ? null : thuocAnhEmBiLoai(g, (c) => danhGiaDieuKien(c, layF(c)));
      // #661: anh em tầng có conTang — hàng thoả tầng mà mọi phương án con TRÁI ⇒ không thuộc tầng.
      const ct = trai.length || biLoai ? null : chamConTang(g, (c) => danhGiaDieuKien(c, layF(c)));
      let ketQua; let tatDinh;
      // Tên cụ thể ở dòng dưới «Loại khác» thắng tầng chung (#1109, 853690 .93 «Phiến đầu nối … cáp điện thoại» dưới 8536909
      // ↔ anh em 8536901 «Đầu nối … cho dây dẫn và cáp»): hàng thoả anh em bị loại CHỈ nhờ một tên chung mà chính đường của dòng
      // (tầng dưới anh em đó) khẳng định một tên CỤ THỂ HƠN chứa tên chung ⇒ không coi hàng thuộc anh em (không tất định).
      const thangCuThe = !trai.length && r.length && r.every((x) => x.trangThai === 'THOA') && tenCuTheDuoi(dd.nhom, g, layF);
      if (thangCuThe) { ketQua = 'CO'; tatDinh = false; } else if (trai.length) { ketQua = 'CO'; tatDinh = trai.some((x) => x.tatDinh); } else if (biLoai) { ketQua = 'CO'; tatDinh = biLoai.tatDinh; } else if (ct && ct.trangThai === 'NGOAI') { ketQua = 'CO'; tatDinh = ct.tatDinh; } else if (r.every((x) => x.trangThai === 'THOA') && (!ct || ct.trangThai === 'TRONG')) { ketQua = 'MAU_THUAN'; tatDinh = r.every((x) => x.tatDinh) && (!ct || ct.tatDinh); } else { ketQua = 'THIEU'; tatDinh = true; r.forEach(ghiThieu); if (ct && ct.trangThai === 'CHUA_BIET') ct.chuaBiet.forEach(ghiThieu); }
      duongDi.push({ ...base, dieuKien: tomDk(g.dieuKien), ketQua, tatDinh });
    }
  }
  const ketQua = gopKetQua(duongDi.map((e) => e.ketQua));
  const quyetDinh = duongDi.filter((e) => e.ketQua === ketQua);
  const coCanCuTatDinh = ketQua === 'CO' ? duongDi.every((e) => e.tatDinh) : ketQua === 'MAU_THUAN' ? quyetDinh.some((e) => e.tatDinh) : false;
  const thieu = [...thieuF].map((fact) => { const k = khoaTV(fact); return { fact, cauHoi: k ? TV.cauHoiCho(fact, 'vi') : null }; });
  return { hs: dd.hs, ketQua, coCanCuTatDinh, duongDi, thieu };
}

/** Điều kiện khẳng định (PHAI_CO) trên đường đi của một dòng — đầu vào của tenCuTheHon. */
function dieuKienKhangDinh(hs, opts = {}) {
  return duongDiDong8(hs, opts).nhom.filter((g) => g.chieu === 'PHAI_CO' && g.dieuKien).flatMap((g) => g.dieuKien);
}
/** Tên dòng/tiêu đề có tên mà chữ gợi "phần còn lại có tên" ("Động cơ khác", "…, loại khác") — chưa phải "Loại khác" đầu dòng. */
function nghiPhanConLai(n) {
  if (!n || !n.tenVi || (n.cap === 8 ? n.loaiKhac : laTieuDeLoaiKhac(n))) return false;
  return /(^|[^\p{L}])kh[aá]c([^\p{L}]|$)/iu.test(String(n.tenVi).normalize('NFC'));
}

/** Đối chiếu mọi dòng 8 số của phân nhóm 6 số. dongCo = các dòng CO (đúng một dòng = ranh giới đã chốt). */
function doiChieuPhanNhom(pn6, duKien, opts = {}) {
  const code = nz(pn6).slice(0, 6);
  const t = T.tree();
  const la = [];
  const walk = (id) => { const x = t.nodes.get(id); if (!x) return; if (x.cap === 8) { la.push(x.id); return; } x.children.forEach(walk); };
  const goc = T.nodeOf(code);
  if (goc) walk(goc.id);
  const F = chuanDuKien(duKien);
  const dong = la.filter((h) => h.startsWith(code)).map((h) => { const r = doiChieuDong8(h, F, opts); return { hs: h, ketQua: r.ketQua, coCanCuTatDinh: r.coCanCuTatDinh }; });
  let dongCo = dong.filter((d) => d.ketQua === 'CO').map((d) => d.hs);
  // Tên cụ thể hơn thắng (#577): giữa các dòng CO, bỏ dòng bị một dòng CO khác lấn tên (không tất định — không tự chốt).
  // #600 (GĐ (a)): kể cả điều kiện trong HOAC và cặp chéo khoá "X" ↔ "bộ phận của Y" — cùng hàm với cổng 2.
  if (dongCo.length > 1) {
    const dk = new Map(dongCo.map((h) => [h, dieuKienKhangDinh(h, opts)]));
    const biLan = new Set(dongCo.filter((a) => dongCo.some((b) => b !== a && tenCuTheHonDong(dk.get(b), dk.get(a), F) === 1)));
    if (biLan.size && biLan.size < dongCo.length) { for (const d of dong) if (biLan.has(d.hs)) d.biLanTen = true; dongCo = dongCo.filter((h) => !biLan.has(h)); }
  }
  return { pn6: code, dong, dongCo };
}

/** Lời ngắn của một điều kiện (cho câu lý do / cảnh báo): "đường kính lõi <= 5 mm", "có lưới bảo vệ", "loại dòng điện: xoay chiều". */
function moTaNgan(c) {
  if (!c) return '';
  if (c.op === 'HOAC') return (c.phuongAn || []).map((alt) => `(${(alt || []).map(moTaNgan).join(' và ')})`).join(' hoặc ');
  const k = khoaTV(c.fact);
  const nhan = k?.nhanVi || String(c.fact || '').replace(/_/g, ' ');
  const pk = c.chieu === 'PHAI_KHONG' ? 'không ' : '';
  if (c.op === 'CO') return nhan;
  if (c.op === 'KHONG') return `không: ${nhan}`;
  if (c.op === 'TRONG') return `${pk}${nhan}: ${dsGiaTri(c.value).map((v) => k?.moTaGiaTri?.[v]?.nhanVi || v).join(' hoặc ')}`;
  if (c.op === 'TEN_LOAI' || c.op === 'CONG_DUNG') return `${pk}${nhan}: ${dsGiaTri(c.value).join(' hoặc ')}`;
  if (c.op === 'TUONG_TU') return `${nhan}: ${dsGiaTri(c.value).join(', ')} hoặc loại tương tự`;
  if (c.op === 'LA') return `${pk}${nhan}${c.viTri && c.viTri !== 'CHINH' ? ` (${k?.moTaViTri?.[c.viTri]?.nhanVi || c.viTri})` : ''}: ${dsGiaTri(c.value).join(' hoặc ')}`;
  return `${nhan} ${c.op} ${c.value}${c.donVi ? ` ${c.donVi}` : ''}`;
}

module.exports = {
  OP_MOI, OP_SO, CHIEU, KET_QUA, OP_THEO_KIEU, NGOAI_LIET_KE,
  laFactTuVung, kiemDieuKien, chuanDuKien, danhGiaDieuKien, danhGiaTuChu,
  duongDiDong8, doiChieuDong8, doiChieuPhanNhom, gopKetQua, moTaNgan, coMau, mauCua, reDungMau,
  tenCuTheHon, tenCuTheHonDong, phuongAnThoa, maThamChieu, daiMa, laLoaiKhacTranTen, dieuKienKhangDinh, nghiPhanConLai, coPhanConLai,
  laHoacCoKieu, laDieuKienCoKieu, factCuaDieuKien, traiPhang, danhGiaTrenMap,
  laTuongTu, laOpChuTuDo, khoaTuongTu, RE_CUM_TUONG_TU,
  chuoiDich, tachDichLong, tangTrenDuong, thuocAnhEmBiLoai, chamConTang, chuMoTa, soCoTrongTrich,
  khopCumTrongChu, coCumPhanBiet, layMucTenKhac, RE_PHU_DINH_VE,
};
