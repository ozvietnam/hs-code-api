/**
 * `lyDoThayThe` — mọi MÃ THAY THẾ phải tự nói mình là dòng biểu thuế nào (issue #359 Lỗi 3).
 *
 * VÌ SAO: ERP hỏi phân loại "nắp khóa tủ điện", hệ thống đưa mã thay thế 8302.50.00. Người khai
 * phải tự mở biểu thuế mới thấy dòng đó tên là "Giá để mũ, mắc mũ, chân giá đỡ và các loại giá
 * cố định tương tự" — không liên quan gì với nắp tủ điện. Gợi ý sai bản chất mà không kèm tên
 * dòng thì không tự loại được. Nay mỗi mã thay thế mang sẵn tên dòng 8 số.
 *
 * NGUỒN: CHỈ data/tax.json (biểu thuế Tổng cục). TUYỆT ĐỐI không dùng chú giải sinh bởi AI
 * (`explanatory-notes`, `loai-khac-index`… là nguồn AI_CHUA_KIEM — luật 7b: lộ ra phải kèm
 * nhãn, không làm căn cứ). Ở đây không gắn nhãn được nên không dùng.
 *
 * DÒNG "LOẠI KHÁC": tên dòng tự nó vô nghĩa, nên kèm các dòng anh em cùng phân nhóm để biết
 * "khác" gồm những gì — vẫn 100% dữ liệu biểu thuế.
 *
 * CHỈ GẮN TRƯỜNG: không đổi thứ tự, không lọc, không đổi thuật toán chọn.
 */

const { taxData, normalizeHs } = require('./data');

/** "Loại khác" / "khác" — tên dòng không mang thông tin bản chất hàng. */
const TEN_RESIDUAL = /^(loại khác|nói chung khác|khác)$/iu;
const ANH_EM_MAX = 3;

/** Bỏ tiền tố phân cấp mà biểu thuế dùng để thụt lề ("- - - Bộ phận…"). */
function tachDauTen(vn) {
  return String(vn || '').replace(/^[\s\-–—:|.]+/, '').trim();
}

function tenDong8(code) {
  const vn = tachDauTen(taxData[code]?.vn);
  return vn || null;
}

/**
 * Câu dẫn tên dòng 8 số cho một mã. Trả null khi mã không có trong biểu thuế — KHÔNG bịa.
 * @param {string} hs mã 4/6/8 số, có hoặc không dấu chấm
 */
function lyDoThayThe(hs) {
  const digits = String(hs || '').replace(/\D/g, '');
  if (digits.length < 4 || digits.length > 8) return null;
  const code = normalizeHs(digits);
  const row = taxData[code];
  if (!row) return null;

  const ten = tachDauTen(row.vn);
  if (ten && !TEN_RESIDUAL.test(ten)) return `Dòng biểu thuế ${code}: ${ten}`;

  // Dòng "Loại khác" (hoặc tên trống) → nêu dòng anh em có tên thật trong cùng phân nhóm.
  const nhom6 = code.slice(0, 6);
  const anhEm = [];
  for (const k of Object.keys(taxData)) {
    if (!k.startsWith(nhom6) || k === code) continue;
    const tenAnhEm = tachDauTen(taxData[k].vn);
    if (tenAnhEm && !TEN_RESIDUAL.test(tenAnhEm)) anhEm.push(`${k} ${tenAnhEm}`);
    if (anhEm.length >= ANH_EM_MAX) break;
  }
  const nhan = ten || 'Loại khác';
  if (!anhEm.length) return `Dòng biểu thuế ${code}: ${nhan} — xem chú giải nhóm ${code.slice(0, 4)} để biết dòng này nằm trong nhóm nào.`;
  return `Dòng biểu thuế ${code}: ${nhan} (dòng anh em cùng phân nhóm ${nhom6}: ${anhEm.join('; ')})`;
}

/**
 * Gắn `lyDoThayThe` cho các mã THAY THẾ trong danh sách gợi ý.
 * Bỏ qua phần tử đầu — đó là mã ĐÃ CHỌN, không phải mã thay thế.
 * Không mutate danh sách gốc.
 * @param {object[]} list các phần tử có `hsCode` (gợi ý) hoặc `hs` (engine-loop)
 * @param {{tu?: number}} [opts] `tu` = vị trí đầu tiên được gắn (mặc định 1)
 */
function ganLyDoThayThe(list, { tu = 1 } = {}) {
  if (!Array.isArray(list)) return list;
  return list.map((s, i) => {
    if (i < tu || !s || typeof s !== 'object') return s;
    const lyDo = lyDoThayThe(s.hsCode || s.hs);
    if (!lyDo) return s;
    return { ...s, lyDoThayThe: lyDo };
  });
}

module.exports = { lyDoThayThe, ganLyDoThayThe };