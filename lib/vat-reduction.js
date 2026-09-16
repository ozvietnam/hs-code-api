/**
 * Đọc quyền giảm thuế GTGT của một dòng hàng thành dữ liệu có cấu trúc.
 *
 * VÌ SAO QUAN TRỌNG:
 * Nghị định 174/2025/NĐ-CP giảm VAT 10% → 8%, NHƯNG có phụ lục loại trừ. Sắt
 * thép cán nóng, một số hóa chất nằm trong phụ lục đó: vẫn phải khai 10%. Người
 * khai nhìn thấy "được giảm VAT" trên báo rồi khai 8% cho thép tấm là bị truy
 * thu — tiền thật, cộng phạt chậm nộp.
 *
 * Dữ liệu đã có sẵn trong data/tax.json từ trước: trường `vat` ghi "10/8" hoặc
 * "8/10", trường `giam_vat` ghi nguyên văn lý do không được giảm. Việc còn
 * thiếu là ĐỌC ĐƯỢC BẰNG MÁY:
 *   · /api/tax vốn đã trả `taxVatReduction` — nhưng là một đoạn văn xuôi. Máy
 *     gọi API không branch được trên đoạn văn, ERP không tô đỏ được ô thuế.
 *   · /api/search thì chưa trả gì cả, trong khi đây mới là nơi người ta nhìn
 *     trước khi chọn mã.
 *   · Quy ước "10/8" so với "8/10" chưa ở đâu ghi ra, nên đọc ngược rất dễ.
 * Hàm này biến hai trường đó thành { eligible, rate, noteVi, legalBasis }.
 *
 * QUY ƯỚC TRƯỜNG `vat` trong biểu thuế: "A/B" = thuế suất A đang áp dụng, B là
 * mức còn lại. Nên "10/8" nghĩa là ĐANG 10% (không được giảm), "8/10" nghĩa là
 * ĐANG 8% (đã giảm). Đọc ngược là sai cả nghìn dòng — có `giam_vat` đi kèm để
 * đối chiếu: dòng nào có chữ "Không được giảm" thì chắc chắn đang ở mức cao.
 */

const NGHI_DINH = '174/2025/NĐ-CP';

/** Tách "10/8" → { current: '10', other: '8' }. */
function parseVatField(vat) {
  const parts = String(vat || '')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p !== '');
  if (!parts.length) return { current: null, other: null };
  return { current: parts[0], other: parts[1] ?? null };
}

/**
 * @param {object} row một dòng của data/tax.json
 * @returns {null|{rate:string|null, alternateRate:string|null, reduced:boolean|null,
 *                 eligible:boolean|null, noteVi:string|null, legalBasis:string|null,
 *                 severity:'warning'|'info'}}
 */
function vatReductionOf(row) {
  if (!row) return null;
  const { current, other } = parseVatField(row.vat);
  if (current === null) return null;

  const excluded = String(row.giam_vat || '').trim();
  const currentNum = Number(current);
  const otherNum = other === null ? null : Number(other);

  // Có ghi chú loại trừ → chắc chắn KHÔNG được giảm, bất kể đọc trường vat thế nào.
  if (excluded) {
    return {
      rate: current,
      alternateRate: other,
      reduced: false,
      eligible: false,
      noteVi: excluded,
      legalBasis: NGHI_DINH,
      severity: 'warning',
    };
  }

  // Không có ghi chú: suy từ trường vat. Mức đang áp thấp hơn mức còn lại nghĩa
  // là dòng này đã được giảm.
  const reduced =
    Number.isFinite(currentNum) && Number.isFinite(otherNum) ? currentNum < otherNum : null;

  return {
    rate: current,
    alternateRate: other,
    reduced,
    eligible: reduced === true ? true : null,
    noteVi: null,
    legalBasis: reduced === true ? NGHI_DINH : null,
    severity: 'info',
  };
}

/** Câu cảnh báo ngắn để hiện thẳng trên kết quả tra cứu. Trả null nếu không có gì phải cảnh báo. */
function vatWarningTextOf(row) {
  const v = vatReductionOf(row);
  if (!v || v.eligible !== false) return null;
  return `VAT ${v.rate}% — KHÔNG được giảm theo ${v.legalBasis}. ${v.noteVi}`;
}

module.exports = { vatReductionOf, vatWarningTextOf, parseVatField };
