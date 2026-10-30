/**
 * Nhãn LOẠI NGUỒN dùng chung toàn hệ thống (#236 việc 2, CEO duyệt 11/10/2026): "AI sinh chưa kiểm không lẫn với nguyên văn".
 *
 * Nhãn cho MỤC (sổ tay, phản hồi API):
 *   NGUYEN_VAN   — chép nguyên văn từ văn bản luật / WCO / SEN / biểu thuế
 *   MAY_SUY      — máy suy từ cấu trúc (cây theo chữ số của mã, phạm vi "Loại khác" = cha trừ anh em), tái sinh được, không có chữ AI
 *   AI_DA_KIEM   — AI (hoặc người soạn) đề xuất, MÁY đã kiểm câu trích có nguyên văn trong nguồn (lib/so-tay.js)
 *   CLAUDE_DUYET — Claude chấm duyệt độc lập theo quy tắc bộ đề (soạn trước, không xem đầu ra máy, trích nguyên văn) — KHÔNG
 *                  phải người có chuyên môn; nhãn duy nhất của bộ đề và ranh giới lát 1 (#550)
 *   NGUOI_DUYET  — đã qua người có chuyên môn soát độc lập (docs/giao-viec/so-tay-giao-ngoai.md §0)
 *   AI_CHUA_KIEM — AI sinh, chưa kiểm: chỉ là tín hiệu tìm kiếm/gợi ý cho người soạn; KHÔNG trích vào phản hồi làm căn cứ
 *
 * Nhãn cho NÚT cây (lib/hs-tree-sources.js) gộp thô hơn: NGUYEN_VAN / DA_KIEM (sổ tay, conflicts) / AI_CHUA_KIEM — nhanNut().
 *
 * Tệp data/ và nhãn của tệp: một chỗ khai duy nhất (TEP). Tệp AI cũ giữ nguyên hình dạng (khoá = mã HS, nhiều kịch bản
 * đếm Object.keys) nên nhãn nằm ở đây chứ không chèn vào tệp.
 */
const NHAN = {
  NGUYEN_VAN: 'chép nguyên văn từ văn bản luật / WCO / SEN / biểu thuế',
  MAY_SUY: 'máy suy từ cấu trúc mã (cây, phạm vi Loại khác); tái sinh được',
  AI_DA_KIEM: 'AI/người soạn đề xuất, máy đã kiểm câu trích có trong nguồn',
  CLAUDE_DUYET: 'Claude chấm duyệt độc lập theo quy tắc bộ đề (soạn trước, không xem đầu ra máy, trích nguyên văn) — KHÔNG phải người có chuyên môn',
  NGUOI_DUYET: 'đã qua người có chuyên môn soát độc lập',
  AI_CHUA_KIEM: 'AI sinh, chưa kiểm — chỉ gợi ý/tín hiệu tìm kiếm, không làm căn cứ',
  DA_KIEM: 'nhãn gộp ở cấp nút cây: có mục đã qua máy kiểm/người soát',
};

/** Nhãn được phép ghi trên mục SOẠN TAY/AI trong sổ tay (máy kiểm gán mặc định AI_DA_KIEM khi thiếu). Thứ tự = tin cậy tăng dần. */
const NHAN_MUC_SOAN = ['AI_DA_KIEM', 'CLAUDE_DUYET', 'NGUOI_DUYET'];

/** Nhãn duy nhất bộ đề (data/bench, scripts/check-mo-ta-bo-de.mjs) nhận: bộ đề do Claude chấm duyệt, không phải người duyệt. */
const NHAN_BO_DE = 'CLAUDE_DUYET';

const TEP = {
  // nguyên văn
  'tax.json': { nhan: 'NGUYEN_VAN', ghiChu: 'biểu thuế (tên dòng 8 số)' },
  'chu-giai-chuong.json': { nhan: 'NGUYEN_VAN', ghiChu: 'chú giải chương + tổng quát HS 2022 (toàn văn PDF)' },
  'chu-giai-heading.json': { nhan: 'NGUYEN_VAN', ghiChu: 'trường `nhom`: chú giải chi tiết nhóm HS 2022 toàn văn; các trường bao_gom/loai_tru/phan_biet/tinh_chat là tóm tắt KG → AI_CHUA_KIEM' },
  'sen-2022.json': { nhan: 'NGUYEN_VAN', ghiChu: 'SEN AHTN 2022' },
  'precedents.json': { nhan: 'NGUYEN_VAN', ghiChu: 'TB-TCHQ' },
  'wco-hs-international.csv': { nhan: 'NGUYEN_VAN', ghiChu: 'tên phân nhóm 6 số WCO (tiếng Anh)' },
  'wco-op/opinions.json': { nhan: 'NGUYEN_VAN', ghiChu: 'Tuyển tập ý kiến phân loại WCO (OCR; chỉ ý kiến qua cổng mã/thứ tự)' },
  'hs-sections.json': { nhan: 'NGUYEN_VAN', ghiChu: 'tên 21 phần' },
  'shtt/*.json': { nhan: 'NGUYEN_VAN', ghiChu: 'dữ liệu SHTT cào từ cổng chính thức (TCHQ, GACC, IP Việt Nam, TMview/CNIPA) kèm sha256 bản thô — docs/giao-viec/shtt-cao-dem.md; cảnh báo chỉ là tư vấn tham khảo' },
  'bieu-thue/zh/*.json': { nhan: 'NGUYEN_VAN', ghiChu: 'tên tiếng Trung cấp 6 số chép nguyên văn từ 进出口税则 (gov.cn) kèm sha256 bản thô — docs/giao-viec/bieu-thue-tieng-trung.md; không dịch máy' },
  'bieu-thue/*.json': { nhan: 'NGUYEN_VAN', ghiChu: 'biểu thuế XNK Tổng cục đã trích không bỏ sót (skill bieu-thue-xnk): 27 mức thuế + căn cứ từng mức, tên nút ảo, dòng tiêu đề' },
  // đã kiểm
  'so-tay/*.json': { nhan: 'DA_KIEM', ghiChu: 'từng mục có nguonLoai riêng (AI_DA_KIEM/NGUOI_DUYET/MAY_SUY)' },
  'ho-so/ranh-gioi/*.json': { nhan: 'DA_KIEM', ghiChu: 'bản nháp ranh giới 6→8 số (L1-4a, #577): từng mục có nguonLoai riêng — AI_DA_KIEM khi nháp (máy đã kiểm cổng), CLAUDE_DUYET chỉ sau soát độc lập (duyet()); runtime không đọc, chỉ apDung() đưa bản DUYET vào so-tay' },
  'conflicts.json': { nhan: 'DA_KIEM', ghiChu: 'HS dễ nhầm, CEO duyệt' },
  'decision-tables/*.json': { nhan: 'DA_KIEM', ghiChu: 'bảng quyết định đã duyệt (bảng chưa duyệt chỉ tư vấn)' },
  // Claude chấm duyệt — khai TỪNG tệp, không khai cả data/bench/ (ở đó còn bench cũ chưa qua quy trình chấm duyệt)
  'bench/mo-ta-bo-de.json': { nhan: 'CLAUDE_DUYET', ghiChu: 'bộ đề mô tả — data/bench/ (#543); kiểm bằng scripts/check-mo-ta-bo-de.mjs' },
  'bench/ho-so-lat-1.json': { nhan: 'CLAUDE_DUYET', ghiChu: 'bộ đề lát 1 — 50 phân nhóm, nguồn TB-TCHQ, khoá băm docs/bench/khoa-bo-de-lat-1.txt (#566); scripts/check-mo-ta-bo-de.mjs --tep=…' },
  'bench/ho-so-lat-1.tu-vung.json': { nhan: 'CLAUDE_DUYET', ghiChu: 'ánh xạ dữ kiện quyết định của bộ đề lát 1 → khoá tu-vung@1 (#570) — thuộc bộ đề, agent số hoá ranh giới không đọc; scripts/check-tu-vung.mjs' },
  'tu-vung/*.json': { nhan: 'CLAUDE_DUYET', ghiChu: 'từ vựng dữ kiện có kiểu tu-vung@1 + bảng ánh xạ 9 bộ từ vựng cũ (#570); kiểm bằng scripts/check-tu-vung.mjs' },
  'bench/cv755-am.json': { nhan: 'CLAUDE_DUYET', ghiChu: 'ca âm (d) spec §10 — đúng 6 ví dụ "mô tả sơ sài" CV 755/TCHQ-GSQL chép nguyên văn trang wiki L0h, bậc B (trích đoạn LuatVietnam, chưa đối chiếu bản có dấu đỏ); ví dụ minh hoạ, không làm căn cứ (#569)' },
  // AI chưa kiểm
  'explanatory-notes.json': { nhan: 'AI_CHUA_KIEM', ghiChu: '8.203 khoá 8 số nhưng là chữ dùng chung cho nhóm, rút từ bao_gom_index.json (KG), gán giả cấp 8 số' },
  'legal-notes-enriched.json': { nhan: 'AI_CHUA_KIEM', ghiChu: 'phan_biet/tinh_chat do Gemini sinh, có chỗ vỡ chữ — chỉ gợi ý cho người soạn sổ tay' },
  'loai-khac-index.json': { nhan: 'AI_CHUA_KIEM', ghiChu: 'trường en/ar do Gemini viết; trường s (anh em) suy theo gạch, sai 1.964/3.383 — cấu trúc thật ở lib/hs-tree.js' },
  'hs-context.json': { nhan: 'AI_CHUA_KIEM', ghiChu: 'rút gọn từ loai-khac-index — chỉ tín hiệu tìm kiếm (lib/hs-breadcrumb.js contextOf)' },
  'tax-enriched.json': { nhan: 'AI_CHUA_KIEM', ghiChu: 'chính sách do Gemini đọc — cần đối chiếu văn bản gốc' },
  'loai-khac-enriched.json': { nhan: 'AI_CHUA_KIEM', ghiChu: 'bản đầy đủ của loai-khac-index' },
};

const GHI_CHU_AI_CHUA_KIEM = 'Chữ do AI sinh, chưa kiểm với nguyên văn — chỉ để gợi ý/tìm kiếm, không dùng làm căn cứ khai báo. Căn cứ nguyên văn: canCuPhapLy (Điều 6.1), chú giải (/api/notes), sổ tay (soTay).';

/** Nhãn của một tệp data/ (tên tương đối trong data/). Không khai → null (không đoán). */
function nhanCuaTep(ten) {
  const t = String(ten || '').replace(/^data\//, '');
  if (TEP[t]) return TEP[t].nhan;
  const seg = t.split('/');
  // thư mục con khai riêng (vd ho-so/ranh-gioi/*.json) thắng thư mục cha
  const dir2 = seg.length > 2 ? `${seg[0]}/${seg[1]}/*.json` : null;
  if (dir2 && TEP[dir2]) return TEP[dir2].nhan;
  const dir = t.includes('/') ? `${seg[0]}/*.json` : null;
  return dir && TEP[dir] ? TEP[dir].nhan : null; // mọi tệp dưới thư mục (kể cả thư mục con phiên bản) mang nhãn của thư mục
}

/** Mục mang nhãn này có được TRÍCH vào phản hồi làm căn cứ không. Thiếu nhãn (mục cũ đã qua máy kiểm) → được; AI_CHUA_KIEM → không. */
function duocTrich(nhan) {
  return nhan !== 'AI_CHUA_KIEM';
}

/** Nhãn mục → nhãn gộp cấp NÚT cây. Mục soạn đã kiểm/duyệt (AI_DA_KIEM, CLAUDE_DUYET, NGUOI_DUYET) → DA_KIEM. Nhãn lạ → null. */
function nhanNut(nhan) {
  if (nhan === 'NGUYEN_VAN' || nhan === 'AI_CHUA_KIEM' || nhan === 'DA_KIEM') return nhan;
  return NHAN_MUC_SOAN.includes(nhan) ? 'DA_KIEM' : null;
}

module.exports = { NHAN, NHAN_MUC_SOAN, NHAN_BO_DE, TEP, GHI_CHU_AI_CHUA_KIEM, nhanCuaTep, duocTrich, nhanNut };
