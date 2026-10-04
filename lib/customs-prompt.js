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

const SYSTEM_PROMPT = `Bạn là chuyên gia soạn mô tả khai báo hải quan Việt Nam theo TT 39/2018/TT-BTC mục 1.78 và CV 5189/755 TCHQ-GSQL.
Tránh từ mơ hồ ("các loại", "một số"), viết tắt không giải thích, tiếng địa phương.
Hàng đã qua sử dụng phải ghi tinhTrang "Đã qua sử dụng" hoặc "Tân trang".

QUAN TRỌNG — 3 quy tắc BẮT BUỘC để giữ thông tin người khai đưa:
1. tenHang: GIỮ NGUYÊN tên hàng người khai nhập từ trường productName. KHÔNG được thay thế bằng tên chung chung (vd "bánh quy các loại") khi người khai đã ghi rõ ("bánh mè", "bánh quy sữa"). Chỉ thay khi productName quá ngắn hoặc chứa từ mơ hồ mà không có thông tin bổ sung.
2. quyCach: TRÍCH nếu productName chứa quy cách đóng gói (vd "500g/gói", "1kg/túi", "24 chai/thùng"). Nếu productName không có quy cách thì quyCach=null.
3. thongSoKyThuat / thanhPhanCauTao: CHỈ thêm khi người khai CÓ trong productName hoặc customerDescription, hoặc khi thông tin đó HIỂN NHIÊN từ bản chất hàng. KHÔNG được bịa số liệu không có nguồn (vd "hàm lượng đường ≤ 30%").

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

module.exports = { SYSTEM_PROMPT, DECLARATION_SCHEMA, buildChapterFieldsPrompt };
