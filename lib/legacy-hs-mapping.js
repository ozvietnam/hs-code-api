// lib/legacy-hs-mapping.js — Bảng dẫn nối mã HS cũ (biểu thuế 2017/trước EN2022) → mã hiện hành (OZV-400).
//
// NGUỒN BẢNG: data/legacy-hs-mapping/*.json — thu hoạch từ nhánh mac/feat/goi-102-tb-tchq
// (commit 3eca6d51, soạn 15/10/2026 bởi Hermes; bảng 114 khớp nguyên văn
// oz-wiki-plhq/registry/phien-ban-bieu-thue-mapping.yaml). Tệp ĐÃ LỌC chỉ còn cặp trỏ
// dòng CÓ TÊN (OZV-400); cặp trỏ dòng "Loại khác" chờ làn duyệt riêng (OZV-347).
//
// CỔNG: nạp lại MỖI cặp bằng lib/residual-guard.js#isResidual — không bày cổng thứ hai.
// Một cặp chỉ được đưa vào bảng tra khi hội đủ cả bốn điều kiện:
//   1. mã đích CÒN trong biểu thuế hiện hành (data/tax.json);
//   2. mã đích là dòng CÓ TÊN, KHÔNG phải "Loại khác"/"Khác" (residual-guard);
//   3. mã cũ đã CHẾT trong biểu hiện hành (còn sống ⇒ cặp lạc hậu, bỏ);
//   4. hai vế đủ 8 chữ số và không tự trỏ.
// Cặp trong tệp mà rớt cổng ở bước nạp → bị loại và được đếm trong boDi() (rào kép: tệp
// lọc sẵn + lib kiểm lại lúc chạy, đề phòng người sau nộp thêm cặp trỏ "Loại khác").
//
// Ý NGHĨA PHÁP LÝ: đây là dữ liệu ĐỐI CHIẾU để mở kho tiền lệ đang ký gửi
// (scripts/unpark-legacy-precedents.mjs), KHÔNG phải căn cứ pháp lý — không đưa vào
// canCuPhapLy, không làm căn cứ GIR. Nhãn tệp: AI_DA_KIEM (lib/nguon-loai.js TEP).
const fs = require('fs');
const path = require('path');
const { taxData } = require('./data');
const { isResidual, cleanName } = require('./residual-guard');
const { dataReadPath } = require('./data-paths');

const THU_MUC = 'legacy-hs-mapping';

let _bang = null; // { [maCu]: { hsMoi, tenMoi, tep, ...goc } }
let _bo = null; // { [maCu]: { hsMoi, lyDo } } — cặp có trong tệp nhưng rớt cổng

function hopLe(ma) {
  return /^\d{8}$/.test(String(ma || ''));
}

/** Kiểm MỘT cặp theo bốn điều kiện ở đầu tệp — dùng chung cho nạp bảng và test. */
function kiemTraCap(maCu, hsMoi) {
  if (!hopLe(maCu) || !hopLe(hsMoi)) return 'dinh_dang';
  if (maCu === hsMoi) return 'tu_tro';
  if (!taxData[hsMoi]) return 'ma_moi_chet';
  if (isResidual(hsMoi)) return 'ma_moi_la_loai_khac';
  if (taxData[maCu]) return 'ma_cu_con_song';
  return null; // hợp lệ
}

function taiBang() {
  if (_bang) return;
  _bang = {};
  _bo = {};
  // HS_LEGACY_MAPPING_DIR: chỉ đè thư mục bảng (test mutation gỡ bảng; không đụng data/ khác).
  const dir = process.env.HS_LEGACY_MAPPING_DIR || dataReadPath(THU_MUC);
  let tep = [];
  try {
    tep = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return; // không có thư mục ⇒ bảng rỗng (chương trình chạy được — test mutation dùng đây)
  }
  for (const f of tep) {
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch {
      continue; // tệp hỏng ⇒ bỏ tệp, không làm sập đường chạy
    }
    for (const [maCu, v] of Object.entries(doc.mapping || {})) {
      const hsMoi = String(v?.hs_moi || '');
      const loi = kiemTraCap(maCu, hsMoi);
      if (loi) {
        _bo[maCu] = { hsMoi, lyDo: loi, tep: f };
        continue;
      }
      if (_bang[maCu] && _bang[maCu].hsMoi !== hsMoi) {
        // Hai tệp nói khác nhau về cùng một mã cũ — giữ bản ĐÃ QUA CỔNG duy nhất,
        // xung đột thì loại hẳn (không đoán).
        _bo[maCu] = { hsMoi, lyDo: 'xung_dot_giua_cac_tep', tep: f };
        delete _bang[maCu];
        continue;
      }
      if (!_bang[maCu]) {
        _bang[maCu] = { hsMoi, tenMoi: cleanName(hsMoi), tep: f, ...(v || {}) };
      }
    }
  }
}

/**
 * Tra mã mới tương đương của một mã cũ.
 * @param {string} maCu mã 8 số theo biểu thuế cũ
 * @returns {null|{hsMoi: string, tenMoi: string, tep: string}} null khi mã không có trong bảng
 *   hoặc cặp rớt cổng (trỏ "Loại khác", mã đích chết, mã cũ còn sống…)
 */
function doMaMoi(maCu) {
  taiBang();
  return _bang[String(maCu || '')] || null;
}

/** Toàn bộ cặp hợp lệ — khoá = mã cũ. */
function tatCa() {
  taiBang();
  return _bang;
}

/** Cặp có trong tệp nhưng bị loại lúc nạp (kèm lý do) — để kiểm tra/số liệu. */
function boDi() {
  taiBang();
  return _bo;
}

/** Xoá cache (test dùng). */
function reset() {
  _bang = null;
  _bo = null;
}

module.exports = { doMaMoi, tatCa, boDi, kiemTraCap, reset, THU_MUC };
