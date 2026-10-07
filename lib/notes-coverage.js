/**
 * Độ đầy đủ của chú giải đứng sau một mã HS — để câu trả lời không im lặng khi căn cứ còn thiếu.
 *
 * CEO 06/10/2026: "Trả lời thiếu còn nguy hại hơn không trả lời." Đo trên dữ liệu ngày 06/10:
 *  - chu-giai-heading.json: phần thuyết minh `nhom` bị cắt ở 2.000 ký tự cho 545/1.269 nhóm
 *    (vd 8471 dừng giữa câu), 62 nhóm trống (7106–7118, 8481, 8482, 8485…);
 *  - chu-giai-chuong.json: chương 52 và 81 trống dù HS có chú giải phân nhóm;
 *  - nguồn ghi "Chú giải HS 2017" trong khi biểu thuế đang dùng HS 2022.
 * 07/10/2026: nhập lại toàn văn từ 5 tập PDF (scripts/import-chu-giai-pdf.py) → 1.193 nhóm có
 * `nhom_day_du: true` (toàn văn, gồm cả phần loại trừ) + chương 52/81. Còn thiếu: 71.06–71.18
 * (tập PDF không có), nhóm mới của HS 2022 (8485, 8524, 8549…), 10 nhóm giữ bản cũ vì là câu chữ
 * sửa đổi 2022 nhưng bị cắt (1509, 1510, 3822, 7019, 8462, 9508, 9705…).
 * Module này không sửa dữ liệu — chỉ nói rõ phần nào thiếu để ERP/LLM/người khai biết.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const NARRATIVE_CAP = 1990; // `nhom` bị cắt ở 2.000 ký tự khi nhập; ≥ 1.990 coi như bị cắt
// HS không có chú giải chương cho 50 và 53; 98 là chương quốc gia của Việt Nam.
const CHAPTERS_WITHOUT_NOTES = new Set(['50', '53', '98']);

let _heading = null;
let _chapter = null;
function headingData() {
  if (!_heading) {
    try { _heading = JSON.parse(fs.readFileSync(dataReadPath('chu-giai-heading.json'), 'utf8')); } catch { _heading = {}; }
  }
  return _heading;
}
function chapterData() {
  if (!_chapter) {
    try { _chapter = JSON.parse(fs.readFileSync(dataReadPath('chu-giai-chuong.json'), 'utf8')); } catch { _chapter = {}; }
  }
  return _chapter;
}

const text = (v) => String(v || '').trim();

/**
 * @param {string} hs 4–8 chữ số (dấu chấm được bỏ)
 * @returns {{ complete: boolean, chapter: string, heading: string|null, gaps: {id: string, description: string}[], caveats: string[] }}
 */
function notesCoverage(hs) {
  const code = String(hs || '').replace(/\D/g, '');
  const ch = code.slice(0, 2);
  const h4 = code.length >= 4 ? code.slice(0, 4) : null;
  const gaps = [];

  const C = chapterData()[ch] || chapterData()[String(parseInt(ch, 10))] || {};
  if (!text(C.chuong) && !CHAPTERS_WITHOUT_NOTES.has(ch)) {
    gaps.push({ id: 'chapter-note-missing', description: `Chưa có chú giải Chương ${ch} trong dữ liệu.` });
  }

  if (h4 && ch !== '98') {
    const H = headingData()[h4];
    const narrative = text(H?.nhom);
    if (!H || !narrative) {
      gaps.push({ id: 'heading-note-missing', description: `Chưa có chú giải chi tiết nhóm ${h4}.` });
    } else if (!H.nhom_day_du && narrative.length >= NARRATIVE_CAP) {
      gaps.push({
        id: 'heading-note-truncated',
        description: `Chú giải chi tiết nhóm ${h4} chỉ có ~2.000 ký tự đầu (bản nhập bị cắt) — phần sau, thường gồm các trường hợp loại trừ, chưa có.`,
      });
    }
    // Toàn văn (nhom_day_du) đã gồm mọi đoạn "không bao gồm" của nhóm, nếu nhóm có.
    if (H && !H.nhom_day_du && !text(H.khong_bao_gom) && !text(H.loai_tru)) {
      gaps.push({
        id: 'heading-exclusions-missing',
        description: `Chưa có danh sách "không bao gồm / loại trừ" của nhóm ${h4} — chưa đối chiếu được hàng có bị loại khỏi nhóm hay không.`,
      });
    }
  }

  const caveats = [];
  const nguon = text(headingData()[h4]?.nguon);
  if (/HS\s*2017/i.test(nguon)) {
    caveats.push('Chú giải chi tiết theo bản HS 2017; biểu thuế hiện hành theo HS 2022 — nhóm có sửa đổi năm 2022 cần đối chiếu bản mới.');
  }

  return { complete: gaps.length === 0, chapter: ch, heading: h4, gaps, caveats };
}

/** Cảnh báo dạng antiPatternWarnings khi chú giải của mã chưa đầy đủ; null nếu đủ. */
function notesCoverageWarning(hs) {
  if (!hs) return null;
  const cov = notesCoverage(hs);
  if (cov.complete) return null;
  return {
    id: 'notes-incomplete',
    description: `Căn cứ chú giải cho ${hs} chưa đầy đủ: ${cov.gaps.map((g) => g.description).join(' ')}`,
    fix: 'Đối chiếu Chú giải chi tiết HS bản đầy đủ trước khi chốt mã hoặc dùng làm căn cứ giải trình.',
  };
}

module.exports = { notesCoverage, notesCoverageWarning, NARRATIVE_CAP };
