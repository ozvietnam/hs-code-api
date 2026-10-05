// lib/policy-levels.js — gắn MỨC cho từng dòng chính sách trong cột `cs` của biểu thuế.
//
// VÌ SAO (CEO 05/10/2026): ERP bật cờ "có chính sách" hễ cột `cs` có chữ. Dòng "Hàng hóa
// được nhập khẩu dưới hình thức mua bán, trao đổi của cư dân biên giới (42/2019/TT-BCT &
// 34/2025/TT-BCT)" được trích ở ~3.300 mã — nó chỉ là danh mục hàng cư dân biên giới được
// trao đổi, không ràng buộc nhập khẩu thương mại → cảnh báo giả, người dùng mất tin.
//
// 3 mức:
//   BLOCKING — phải làm thủ tục trước/khi thông quan (giấy phép, KTCN/hợp quy, kiểm dịch,
//              cấm nhập, mật mã…). Bật cờ đỏ.
//   NOTICE   — chỉ áp trong tình huống riêng (hàng ĐÃ QUA SỬ DỤNG, tạm nhập tái xuất…) hoặc
//              dòng chưa phân loại được. Hiện, không bật cờ đỏ.
//   INFO     — văn bản liên quan nhưng không ràng buộc nhập khẩu thương mại. Không bật cờ.
// Dòng không khớp luật nào → NOTICE (sai an toàn: vẫn hiện cho người xem).
// Module KHÔNG đổi dữ liệu nguồn — chỉ phân loại để bên dùng hiển thị đúng mức.

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// Thứ tự quan trọng: luật đầu tiên khớp thắng.
const RULES = [
  {
    id: 'BORDER_RESIDENT_LIST',
    level: 'INFO',
    re: /cu dan bien gioi|02\/2018\/tt-bct|34\/2025\/tt-bct/,
    reasonVi: 'Danh mục hàng cư dân biên giới được mua bán, trao đổi — không áp cho nhập khẩu thương mại của doanh nghiệp.',
  },
  {
    id: 'CONTROL_REDUCED',
    level: 'INFO',
    // "phải/không phải KTNN" là dòng lưỡng nghĩa → không coi là miễn.
    test: (t) => /cat giam kiem tra|khong phai ktnn|khong phai kiem tra/.test(t) && !/phai\/khong phai/.test(t),
    reasonVi: 'Danh mục đã được cắt giảm / miễn kiểm tra chuyên ngành.',
  },
  {
    id: 'EXPORT_ONLY',
    level: 'INFO',
    // Dòng nói về XK mà không nhắc NK/nhập.
    test: (t) => /\bxk\b|xuat khau/.test(t) && !/\bnk\b|nhap khau|nhap\b/.test(t),
    reasonVi: 'Chỉ áp cho hàng xuất khẩu.',
  },
  {
    id: 'USED_GOODS_ONLY',
    level: 'NOTICE',
    re: /\bqsd\b|dqsd|da qua su dung|qua su dung/,
    reasonVi: 'Chỉ áp cho hàng ĐÃ QUA SỬ DỤNG (cấm nhập). Hàng mới 100% không thuộc diện này.',
  },
  {
    id: 'TEMP_IMPORT_REEXPORT',
    level: 'NOTICE',
    re: /tntx|tam nhap tai xuat|chuyen khau/,
    reasonVi: 'Chỉ áp khi kinh doanh tạm nhập tái xuất / chuyển khẩu.',
  },
  {
    id: 'SECONDARY_BORDER_GATE',
    level: 'NOTICE',
    re: /cua khau phu|loi mo bien gioi/,
    reasonVi: 'Chỉ áp khi mua bán qua cửa khẩu phụ, lối mở biên giới.',
  },
  {
    id: 'CUSTOMS_AT_BORDER_GATE',
    level: 'NOTICE',
    re: /thu tuc hq tai ck nhap|23\/2019\/qd-ttg/,
    reasonVi: 'Phải làm thủ tục hải quan tại cửa khẩu nhập (không chuyển cửa khẩu về nội địa).',
  },
  {
    id: 'TRADE_REMEDY_OR_QUOTA',
    level: 'NOTICE',
    re: /cbpg|chong ban pha gia|tu ve|chong lan tranh|han ngach/,
    reasonVi: 'Có thể phải nộp thuế phòng vệ thương mại / áp hạn ngạch — kiểm tra xuất xứ và nhà sản xuất.',
  },
  {
    id: 'REPORTING_REGIME',
    level: 'INFO',
    re: /che do bao cao|^\s*\(?42\/2019\/tt-bct\)?\s*$/,
    reasonVi: 'Quy định về chế độ báo cáo — không phải điều kiện nhập khẩu.',
  },
  {
    id: 'CONTROL',
    level: 'BLOCKING',
    re: /giay phep|kiem tra|ktnn|kiem dich|hop quy|cong bo|chung nhan|nhom 2|cam nhap|cam nk|cam xk, nk|cam xk nk|mat ma|ktcn|an toan|thuc pham|phu gia|attp|thuoc|duoc|my pham|cites|nguy cap|quy hiem|tien chat|hoa chat|vat lieu no|phong xa|luong dung|xang dau|phe lieu|giong|xuat ban pham|linh vuc in|dang ky|quan ly chat luong|chi dinh|che pham|vac xin|kim cuong|^vang\b/,
    reasonVi: 'Thủ tục quản lý chuyên ngành — cần làm trước hoặc khi thông quan.',
  },
];

function splitPolicyText(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/;\s*/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** levelOfLine(text) → { level, rule, reasonVi } */
function levelOfLine(text) {
  const t = fold(text);
  for (const r of RULES) {
    if (r.test ? r.test(t) : r.re.test(t)) return { level: r.level, rule: r.id, reasonVi: r.reasonVi };
  }
  return { level: 'NOTICE', rule: 'UNCLASSIFIED', reasonVi: 'Chưa phân loại được mức — nhân viên cần đọc nguyên văn.' };
}

const RANK = { NONE: 0, INFO: 1, NOTICE: 2, BLOCKING: 3 };

/**
 * classifyPolicy(rawCs, warnings) → { policyLines:[{text, level, rule, reasonVi}], policyLevel, hasActionablePolicy }
 * Cờ trong warnings (giấy phép/KTCN/kiểm dịch/lưỡng dụng) luôn nâng lên BLOCKING — chúng là
 * kết luận đã soát (policy-rules.js), mạnh hơn khớp chữ.
 */
function classifyPolicy(rawCs, warnings) {
  const policyLines = splitPolicyText(rawCs).map((text) => ({ text, ...levelOfLine(text) }));
  let level = policyLines.reduce((acc, l) => (RANK[l.level] > RANK[acc] ? l.level : acc), 'NONE');
  const w = warnings || {};
  if (w.requiresLicense || w.requiresInspection || w.requiresQuarantine || w.dualUseControl) level = 'BLOCKING';
  return { policyLines, policyLevel: level, hasActionablePolicy: level === 'BLOCKING' };
}

module.exports = { classifyPolicy, levelOfLine, splitPolicyText, RULES };
