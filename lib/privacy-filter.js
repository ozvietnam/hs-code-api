/**
 * Bộ lọc riêng tư cho đóng góp cộng đồng.
 *
 * Chặn theo HÌNH DẠNG dữ liệu, không theo danh sách tên (danh sách luôn thiếu).
 * Dùng chung bởi scripts/validate-community.mjs và scripts/merge-community.mjs.
 *
 * Hard = từ chối tệp. Soft = cảnh báo (dễ trùng thông số kỹ thuật).
 */

const PRIVACY_PATTERNS = [
  // Đặt TRƯỚC mẫu MST: 10 số bắt đầu bằng đầu số di động thì gần như chắc là
  // số điện thoại. Báo đúng tên giúp người gửi sửa nhanh, không phải đoán.
  {
    re: /(\+84|\b0)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])\d{7}\b/,
    what: 'số điện thoại Việt Nam',
    hint: 'Bỏ mọi thông tin liên hệ.',
    hard: true,
  },
  {
    re: /\b\d{10}(-\d{3})?\b/,
    what: 'có thể là mã số thuế (10 hoặc 13 số)',
    hint: 'Bỏ MST đi — phân loại hàng hoá không cần biết ai nhập.',
    hard: true,
  },
  {
    re: /\b\d{11,12}\b/,
    what: 'có thể là số tờ khai hải quan',
    hint: 'Bỏ số tờ khai. Nếu cần ghi thời điểm, dùng source.clearedYear (chỉ năm).',
    hard: true,
  },
  {
    re: /(công ty|cty|tnhh|cổ phần|doanh nghiệp tư nhân|co\.,? ?ltd|jsc\b|\bj\.?s\.?c\b)/i,
    what: 'có thể là tên doanh nghiệp',
    hint: 'Mô tả hàng hoá không được chứa tên doanh nghiệp nào.',
    hard: true,
  },
  {
    // Tên DN Trung Quốc — nguồn hàng chính của thị trường này.
    re: /有限公司|贸易有限|集团公司|股份有限|进出口公司/,
    what: 'có thể là tên doanh nghiệp Trung Quốc',
    hint: 'Bỏ tên công ty Trung Quốc (有限公司, 贸易, 集团…).',
    hard: true,
  },
  {
    re: /[\w.+-]+@[\w-]+\.[\w.]+/,
    what: 'địa chỉ email',
    hint: 'Bỏ mọi thông tin liên hệ.',
    hard: true,
  },
  {
    re: /\b(invoice|inv\.?\s?no|packing list|b\/l|bill of lading|vận đơn|hoá đơn số|hóa đơn số)\b/i,
    what: 'tham chiếu chứng từ thương mại',
    hint: 'Chỉ nộp cặp mô tả ↔ mã HS, không nộp chứng từ.',
    hard: true,
  },
  {
    // US EIN 12-3456789. Không khớp model kiểu AR3000-03.
    re: /\b\d{2}-\d{7}\b/,
    what: 'có thể là mã số thuế nước ngoài (EIN)',
    hint: 'Bỏ mã số thuế / EIN — phân loại không cần biết ai nhập.',
    hard: true,
  },
  {
    // ISO 6346: 3 chữ chủ + U/J/Z + 7 số (6 serial + check digit).
    re: /\b[A-Z]{3}[UJZ]\d{7}\b/i,
    what: 'mã container',
    hint: 'Bỏ số container. Phân loại hàng không cần biết lô vận chuyển.',
    hard: true,
  },
  {
    re: /\b(seal|chì)\s*(no\.?|số|#)?\s*[A-Z0-9]{4,}\b/i,
    what: 'số seal container',
    hint: 'Bỏ số seal.',
    hard: true,
  },
  {
    re: /\b-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/,
    what: 'toạ độ địa lý',
    hint: 'Bỏ toạ độ kho / địa chỉ GPS.',
    hard: true,
  },
  {
    re: /(kho ngoại quan|bonded warehouse|địa chỉ kho|warehouse address|số nhà\s+\d+)/i,
    what: 'địa chỉ kho / nhà',
    hint: 'Bỏ địa chỉ. Mô tả hàng hoá không cần nơi lưu kho.',
    hard: true,
  },
  {
    re: /\b\d{1,3}([.,]\d{3}){2,}\s*(vnd|đ|usd)?\b/i,
    what: 'có thể là trị giá lô hàng',
    hint: 'Trị giá không liên quan tới phân loại — bỏ đi.',
    hard: false,
  },
];

function scanString(value) {
  if (typeof value !== 'string') return [];
  const hits = [];
  for (const p of PRIVACY_PATTERNS) {
    const m = value.match(p.re);
    if (m) hits.push({ what: p.what, hint: p.hint, hard: p.hard, match: m[0] });
  }
  return hits;
}

function walk(node, path, acc) {
  if (typeof node === 'string') {
    for (const hit of scanString(node)) acc.push({ path: path || '(gốc)', ...hit });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${i}]`, acc));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      walk(v, path ? `${path}.${k}` : k, acc);
    }
  }
}

function scanObject(doc) {
  const hits = [];
  walk(doc, '', hits);
  return hits;
}

module.exports = { PRIVACY_PATTERNS, scanString, scanObject };
