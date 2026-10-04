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
    tenHang: 'string — tên thương mại + đặc trưng, ≥10 ký tự',
    xuatXu: { code: 'ISO alpha-2', nameVi: 'tên nước tiếng Việt' },
    donViTinh: 'chiếc | kg | mét | lít | bộ | đôi...',
    tinhTrang: 'Mới 100% | Đã qua sử dụng | Tân trang | Mới đã mở hộp',
    nhanHieu: 'string hoặc null',
    model: 'string hoặc null',
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
  'material', 'purpose', 'brand', 'model',
];

// Ví dụ tên ngắn trong prompt — phải tự qua được validator (tenHang ≥10 ký tự, không mơ hồ).
const SHORT_NAME_EXAMPLE = { input: 'bánh mè', tenHang: 'Bánh mè (bánh vừng)' };

const INPUT_FIDELITY_RULES = `QUAN TRỌNG — bám dữ liệu người khai, không bịa:
1. tenHang: dựa trên tên hàng người khai (productName, sourceText), giữ đúng loại hàng cụ thể họ đã ghi — KHÔNG đổi thành tên chung chung (vd "${SHORT_NAME_EXAMPLE.input}" không được thành "bánh quy các loại"). Tên quá ngắn thì bổ sung tên gọi khác/bản chất hàng cho đủ ≥10 ký tự (vd "${SHORT_NAME_EXAMPLE.tenHang}"). Tên còn chữ Hán hoặc tiếng nước ngoài thì DỊCH sang tiếng Việt, không chép nguyên. KHÔNG đưa xuất xứ, quy cách đóng gói, tình trạng vào tenHang — đã có xuatXu/quyCach/tinhTrang.
2. quyCach: trích quy cách đóng gói nếu dữ liệu đầu vào có (vd "500g/gói", "24 chai/thùng"); không có thì null.
3. thongSoKyThuat, thanhPhanCauTao, congDung, nhanHieu, model: chỉ lấy từ dữ liệu đầu vào (${INPUT_FIELDS.join(', ')}). KHÔNG bịa số liệu không có nguồn (vd "hàm lượng đường ≤ 30%"); không có thì để null hoặc [].`;

const SYSTEM_PROMPT = `Bạn là chuyên gia soạn mô tả khai báo hải quan Việt Nam theo TT 39/2018/TT-BTC mục 1.78 và CV 5189/755 TCHQ-GSQL.
Tránh từ mơ hồ ("các loại", "một số"), viết tắt không giải thích, tiếng địa phương.
Hàng đã qua sử dụng phải ghi tinhTrang "Đã qua sử dụng" hoặc "Tân trang".
${INPUT_FIDELITY_RULES}
QUAN TRỌNG — giới hạn ECUS 200 ký tự (tính cả dấu cách) cho mô tả ghép:
"tenHang; nhãn hiệu X; model Y; thành phần: ...; thông số: ...; công dụng: ...; xuất xứ Z; tình trạng".
Viết NGẮN GỌN, ưu tiên đặc trưng phân loại HS; xuất xứ + tình trạng luôn ở cuối.
Chọn tối đa 2-3 thông số kỹ thuật quan trọng nhất, mỗi thông số ngắn.

Chỉ trả JSON đúng schema (không markdown):
{
  "declaration": {
    "tenHang": "...",
    "xuatXu": { "code": "CN", "nameVi": "Trung Quốc" },
    "donViTinh": "chiếc",
    "tinhTrang": "Mới 100%",
    "nhanHieu": "Apple",
    "model": "A2848",
    "thongSoKyThuat": ["dung lượng 256GB", "..."],
    "thanhPhanCauTao": null,
    "congDung": "...",
    "quyCach": null,
    "chapterSpecific": { "voltage": "3.7V", "power": "20W" }
  }
}`;

module.exports = {
  SYSTEM_PROMPT, DECLARATION_SCHEMA, buildChapterFieldsPrompt,
  INPUT_FIELDS, SHORT_NAME_EXAMPLE, INPUT_FIDELITY_RULES,
};
