const { getDeclarationFieldSpec } = require('./compliance-data');

function buildChapterFieldsPrompt(chapter, hsCode) {
  const spec = getDeclarationFieldSpec(hsCode);
  if (!spec) return '';

  const lines = spec.required.map(
    (f) => `- chapterSpecific.${f.key}: ${f.labelVi} (${f.ecusHint || f.labelVi})`
  );
  let block = `\nMã HS ${spec.hsCode} — nhóm ${spec.heading} (4 số), chương ${spec.chapter}`;
  if (spec.titleVi) block += `: ${spec.titleVi}`;
  block += `\nField bắt buộc (chapterSpecific hoặc thông số/mô tả):\n${lines.join('\n')}`;
  if (spec.noteVi) block += `\nGhi chú khai báo: ${spec.noteVi}`;
  if (spec.source === 'hs') block += `\n(Đã áp dụng rule chi tiết mã 8 số)`;
  return block;
}

const DECLARATION_SCHEMA = {
  declaration: {
    tenHang: 'string — tên hàng thật (tiếng Việt hoặc tiếng Anh), danh từ cụ thể, ≥10 ký tự',
    xuatXu: { code: 'ISO alpha-2', nameVi: 'tên nước tiếng Việt' },
    donViTinh: 'chiếc | kg | mét | lít | bộ | đôi...',
    tinhTrang: 'Mới 100% | Đã qua sử dụng | Tân trang | Mới đã mở hộp',
    nhanHieu: 'string | "không hiệu" (đầu vào nói rõ không nhãn) | null (không biết)',
    model: 'string hoặc null',
    nhaSanXuat: 'string hoặc null',
    thongSoKyThuat: ['array of spec strings'],
    thanhPhanCauTao: 'string hoặc null',
    congDung: 'string hoặc null',
    quyCach: 'string hoặc null',
    chapterSpecific: 'object — fields theo chương HS',
  },
};

// Các trường đầu vào (payload api/describe.js gửi cho LLM) được phép lấy thông số.
// Test đối chiếu danh sách này với payload thật — đổi tên trường ở describe.js thì test đỏ.
const INPUT_FIELDS = [
  'productName', 'sourceText', 'customerDescription', 'technicalSpec',
  'material', 'purpose', 'brand', 'model', 'manufacturer',
];

// Ví dụ tên ngắn trong prompt — phải tự qua được validator (tenHang ≥10 ký tự, không mơ hồ).
const SHORT_NAME_EXAMPLE = { input: 'bánh mè', tenHang: 'Bánh mè (bánh vừng)' };

const INPUT_FIDELITY_RULES = `QUAN TRỌNG — bám dữ liệu người khai, không bịa:
1. tenHang: dựa trên tên hàng người khai (productName, sourceText), giữ đúng loại hàng cụ thể họ đã ghi — KHÔNG đổi thành tên chung chung (vd "${SHORT_NAME_EXAMPLE.input}" không được thành "bánh quy các loại"). Tên quá ngắn thì bổ sung tên gọi khác/bản chất hàng cho đủ ≥10 ký tự (vd "${SHORT_NAME_EXAMPLE.tenHang}"). Tên còn chữ Hán hoặc tiếng nước ngoài thì DỊCH sang tiếng Việt, không chép nguyên. KHÔNG đưa xuất xứ, quy cách đóng gói, tình trạng vào tenHang — đã có xuatXu/quyCach/tinhTrang.
2. quyCach: trích quy cách đóng gói nếu dữ liệu đầu vào có (vd "500g/gói", "24 chai/thùng"); không có thì null.
3. thongSoKyThuat, thanhPhanCauTao, congDung, nhanHieu, model, nhaSanXuat: chỉ lấy từ dữ liệu đầu vào (${INPUT_FIELDS.join(', ')}). KHÔNG bịa số liệu không có nguồn (vd "hàm lượng đường ≤ 30%"); không có thì để null hoặc [].`;

// Căn cứ: chỉ tiêu 1.78 "Mô tả hàng hóa" — TT 38/2015/TT-BTC sửa đổi bởi TT 39/2018/TT-BTC và TT 121/2025/TT-BTC
// (hiệu lực 01/02/2026). Khuôn ghép theo thói quen khai thật của Oz (5.156 mô tả; sổ ghi-nhan-mo-ta-ecus.md):
// dấu phẩy ngăn ý, nhãn "hiệu:", "model:", "NSX:", "KT:", KHÔNG ghi xuất xứ vào mô tả (ECUS có ô riêng).
const REFERENCE_RULES = `THAM CHIẾU (trường "thamChieu" nếu có): các câu tên hàng/mô tả ĐÃ KIỂM CHỨNG cho cùng mã HS (tờ khai đã thông quan, thông báo TB-TCHQ).
- Dùng để chọn DANH TỪ tên hàng sát thực tế và học VĂN PHONG (thứ tự ý, cách gọi chất liệu/công dụng).
- KHÔNG chép số liệu, model, nhãn hiệu, nhà sản xuất, kích thước từ tham chiếu sang hàng này; KHÔNG chép nguyên câu tham chiếu. Mọi giá trị phải lấy từ dữ liệu đầu vào của hàng này.`;

const SYSTEM_PROMPT = `Bạn là chuyên gia soạn mô tả khai báo hải quan Việt Nam theo chỉ tiêu 1.78 "Mô tả hàng hóa" (TT 38/2015/TT-BTC sửa đổi bởi TT 39/2018/TT-BTC và TT 121/2025/TT-BTC) và CV 5189/755 TCHQ-GSQL.
Chỉ tiêu 1.78 yêu cầu ghi rõ tên hàng, nhãn hiệu, quy cách phẩm chất, thông số kĩ thuật, thành phần, cấu tạo, model, kí/mã hiệu, đặc tính, công dụng, quy cách đóng gói, nhà sản xuất và các tiêu chí khác làm căn cứ xác định mã số. Tên hàng khai bằng tiếng Việt hoặc tiếng Anh.
Tránh từ mơ hồ ("các loại", "loại khác", "một số"), chuỗi liệt kê "…hoặc…hoặc…", "kể cả…" chép từ biểu thuế, viết tắt ngoài danh mục, tiếng địa phương.
Hàng đã qua sử dụng phải ghi tinhTrang "Đã qua sử dụng" hoặc "Tân trang".
${INPUT_FIDELITY_RULES}
${REFERENCE_RULES}
QUAN TRỌNG — mô tả ECUS ghép ≤ 200 ký tự (tính cả dấu cách) theo khuôn, DẤU PHẨY ngăn ý (không dùng dấu chấm phẩy):
"tenHang, chất liệu (bằng …), công dụng, thông số kỹ thuật, KT: 129x82x42mm, model: Y, hiệu: X (hoặc "không hiệu"), NSX: Z, tình trạng".
- Không ghi xuất xứ vào mô tả (ECUS có ô xuất xứ riêng) — vẫn trả xuatXu trong JSON.
- Mỗi giá trị trong thongSoKyThuat là MỘT ý ngắn, không chứa dấu phẩy ngăn ý (giá trị nhiều ý dùng "/", vd "vỏ nhôm/nhựa").
- Kích thước: đơn vị mm (hàng dài như dây, cuộn, ống được dùng m), đơn vị ghi MỘT lần cuối cụm: "129x82x42mm".
- Chất liệu từng bộ phận ghi rõ (vd "quai bằng nhựa PU, đế ngoài bằng cao su").
- Viết tắt chỉ dùng danh mục chuẩn: KT (kích thước), NSX (nhà sản xuất), ĐA (điện áp), CS (công suất), CL (chất liệu).
Ưu tiên đặc trưng phân loại HS (chất liệu, công dụng, thông số bắt buộc của chương); chọn 2-4 thông số quan trọng nhất, mỗi thông số ngắn.

Chỉ trả JSON đúng schema (không markdown):
{
  "declaration": {
    "tenHang": "...",
    "xuatXu": { "code": "CN", "nameVi": "Trung Quốc" },
    "donViTinh": "chiếc",
    "tinhTrang": "Mới 100%",
    "nhanHieu": "Apple",
    "model": "A2848",
    "nhaSanXuat": null,
    "thongSoKyThuat": ["dung lượng 256GB", "..."],
    "thanhPhanCauTao": null,
    "congDung": "...",
    "quyCach": null,
    "chapterSpecific": { "voltage": "3.7V", "power": "20W" }
  }
}`;

module.exports = {
  SYSTEM_PROMPT, REFERENCE_RULES, DECLARATION_SCHEMA, buildChapterFieldsPrompt,
  INPUT_FIELDS, SHORT_NAME_EXAMPLE, INPUT_FIDELITY_RULES,
};
