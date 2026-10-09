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

// Bảng danh mục mã HS của oz-wiki-plhq (hsListings) — nguồn MẠNH hơn cột `cs` của biểu thuế: cột cs
// chưa dẫn văn bản 2026 nào (05/10/2026: 8536.69.99 có trong 36/2026/TT-BKHCN công bố hợp quy mà
// vẫn báo "không có chính sách"). Loại tác động → mức + cờ.
const LISTING_RULES = {
  CONG_BO_HOP_QUY: { level: 'BLOCKING', label: 'Phải công bố hợp quy', flag: 'requiresInspection' },
  KIEM_TRA_CHAT_LUONG: { level: 'BLOCKING', label: 'Phải kiểm tra chất lượng nhà nước', flag: 'requiresInspection' },
  KIEM_TRA_ATTP: { level: 'BLOCKING', label: 'Phải kiểm tra an toàn thực phẩm', flag: 'requiresInspection' },
  KIEM_DICH_DONG_VAT: { level: 'BLOCKING', label: 'Phải kiểm dịch động vật', flag: 'requiresQuarantine' },
  KIEM_DICH_THUC_VAT: { level: 'BLOCKING', label: 'Phải kiểm dịch thực vật', flag: 'requiresQuarantine' },
  GIAY_PHEP: { level: 'BLOCKING', label: 'Phải có giấy phép nhập khẩu', flag: 'requiresLicense' },
  DANG_KY_LUU_HANH: { level: 'BLOCKING', label: 'Phải có đăng ký lưu hành', flag: 'requiresLicense' },
  CAM_NHAP_KHAU: { level: 'BLOCKING', label: 'Cấm nhập khẩu', flag: null },
  PHONG_VE_THUONG_MAI: { level: 'NOTICE', label: 'Biện pháp phòng vệ thương mại', flag: null },
  CAT_GIAM_KIEM_TRA: { level: 'INFO', label: 'Đã cắt giảm kiểm tra chuyên ngành', flag: null },
  CAM_XUAT_KHAU: { level: 'INFO', label: 'Chỉ áp cho xuất khẩu', flag: null },
  KHAC: { level: 'INFO', label: 'Danh mục liên quan', flag: null },
};
const RISK_VI = { CAO: 'rủi ro cao', TRUNG_BINH: 'rủi ro trung bình', THAP: 'rủi ro thấp' };

/**
 * Dòng chính sách rút từ bảng danh mục (chỉ văn bản đang áp dụng). Cấm nhập chỉ cho hàng ĐÃ QUA SỬ
 * DỤNG → NOTICE. Bảng chưa xác minh vẫn bật (sai an toàn) nhưng ghi rõ để NV kiểm.
 */
function listingLines(listings) {
  const out = [];
  const seen = new Set();
  const all = Array.isArray(listings) ? listings : [];
  // Cùng văn bản + cùng loại thủ tục đã khớp đúng 8 số → bỏ dòng khớp theo nhóm (trùng ý).
  const exact = new Set(all.filter((l) => l && l.active !== false && l.match?.level === 'HS8').map((l) => `${l.soHieu}|${l.loaiTacDong}`));
  for (const l of all) {
    if (!l || l.active === false) continue;
    if (l.match?.level && l.match.level !== 'HS8' && exact.has(`${l.soHieu}|${l.loaiTacDong}`)) continue;
    const rule = LISTING_RULES[l.loaiTacDong];
    if (!rule) continue;
    let level = rule.level;
    const cond = String(l.dieuKien || '');
    if (l.loaiTacDong === 'CAM_NHAP_KHAU' && /qua s[uử] d[uụ]ng|QSD/i.test(cond)) level = 'NOTICE';
    // Khớp theo NHÓM 4/6 số (bảng ghi tiền tố) → chưa chắc mã 8 số này thuộc diện (vd cả nhóm gỗ 4408
    // bị gắn giấy phép, thực tế chỉ vài loài) → Lưu ý, không bật cờ đỏ. Chỉ khớp đúng 8 số mới Bắt buộc.
    const prefixOnly = l.match?.level && l.match.level !== 'HS8';
    if (level === 'BLOCKING' && prefixOnly) level = 'NOTICE';
    const key = `${l.soHieu}|${l.loaiTacDong}|${l.mucRuiRo || ''}|${l.match?.level === 'HS8' ? 8 : 'p'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const parts = [prefixOnly && rule.level === 'BLOCKING' ? `Có thể: ${rule.label.toLowerCase()}` : rule.label, l.mucRuiRo ? `(${RISK_VI[l.mucRuiRo] || l.mucRuiRo})` : null, `— ${l.soHieu}`].filter(Boolean);
    out.push({
      text: parts.join(' '),
      level,
      rule: `LISTING_${l.loaiTacDong}`,
      reasonVi: [
        prefixOnly
          ? `Bảng danh mục ${l.soHieu} ghi theo nhóm ${l.match.code} (${l.match.level}) — mã này CÓ THỂ thuộc diện, NV đối chiếu mô tả "${String(l.moTa || '').slice(0, 80)}".`
          : `Mã nằm trong bảng danh mục ${l.soHieu} (khớp đúng 8 số)${l.phuLuc ? `, ${l.phuLuc}` : ''}.`,
        cond ? `Điều kiện: ${cond}.` : null,
        l.table && l.table.verified === false ? 'Bảng trích chưa xác minh với bản gốc — NV kiểm lại.' : null,
      ].filter(Boolean).join(' '),
      source: 'oz-wiki-plhq',
      flag: level === 'BLOCKING' ? rule.flag : null,
    });
  }
  return out;
}

const CO_QUAN_VI = {
  BYT: 'Bộ Y tế', BCT: 'Bộ Công Thương', BKHCN: 'Bộ KH&CN', BXD: 'Bộ Xây dựng', BNV: 'Bộ Nội vụ',
  BNNMT: 'Bộ NN&MT', BNNPTNT: 'Bộ NN&PTNT', BCA: 'Bộ Công an', BQP: 'Bộ Quốc phòng', BTTTT: 'Bộ TT&TT', BGTVT: 'Bộ GTVT',
};

/**
 * Dòng chính sách khớp THEO TÊN (lib/policy-name-match.js) — văn bản không có bảng mã HS nên không
 * khẳng định được mã này thuộc diện; mức NOTICE (thang có sẵn, không thêm bậc) + reviewByName để ERP
 * hiện "chuyên viên kiểm" thay vì cờ đỏ hay "Chưa thấy chính sách riêng".
 */
function nameLines(nameMatches) {
  const out = [];
  for (const m of Array.isArray(nameMatches) ? nameMatches : []) {
    if (!m || !m.soHieu) continue;
    const rule = LISTING_RULES[m.loaiTacDong];
    const thuTuc = rule && rule.level === 'BLOCKING' ? ` (${rule.label.toLowerCase()})` : '';
    out.push({
      text: `Có thể thuộc quản lý ${CO_QUAN_VI[m.coQuan] || m.coQuan || 'chuyên ngành'} theo ${m.soHieu}${thuTuc} — ${m.canCu} — chuyên viên kiểm`,
      level: 'NOTICE',
      rule: `NAME_${m.loaiTacDong || 'KHAC'}`,
      reasonVi: [
        `Khớp theo tên gọi (không có bảng mã HS để đối chiếu): ${m.nguon || m.soHieu}${m.ten ? ` — "${String(m.ten).slice(0, 120)}"` : ''}.`,
        m.ghiChu || null,
      ].filter(Boolean).join(' '),
      source: 'name',
      reviewByName: true,
    });
  }
  return out;
}

/**
 * classifyPolicy(rawCs, warnings, listings, nameMatches) → { policyLines:[{text, level, rule, reasonVi}], policyLevel, hasActionablePolicy, reviewByName }
 * listings = hsListings (bảng danh mục oz-wiki-plhq) — đứng TRƯỚC các dòng cột cs.
 * nameMatches = matchPolicyByName (cờ theo tên) — đứng SAU bảng danh mục, trước cột cs.
 * Cờ trong warnings (giấy phép/KTCN/kiểm dịch/lưỡng dụng) luôn nâng lên BLOCKING — chúng là
 * kết luận đã soát (policy-rules.js), mạnh hơn khớp chữ.
 * hasActionablePolicy = BLOCKING HOẶC có cờ theo tên (CEO 08/10: hàng dò theo tên cũng phải được gắn cờ
 * để NV kiểm) — bên dùng phân biệt hai trường hợp bằng reviewByName / policyLevel.
 */
function classifyPolicy(rawCs, warnings, listings = [], nameMatches = []) {
  const byName = nameLines(nameMatches);
  const policyLines = [
    ...listingLines(listings).map(({ flag, ...line }) => line),
    ...byName,
    // Cột cs có dòng lặp nguyên văn (vd 33049920 "Mỹ phẩm XK, NK…" 2 lần) → giữ một.
    ...[...new Set(splitPolicyText(rawCs).map((t) => t.replace(/\*+$/, '').trim()))].map((text) => ({ text, ...levelOfLine(text) })),
  ];
  let level = policyLines.reduce((acc, l) => (RANK[l.level] > RANK[acc] ? l.level : acc), 'NONE');
  // Cờ trong warnings CHỈ nâng mức khi đến từ bảng danh mục (listingDerived). Cờ do AI bóc chưa soát
  // không tự tạo BLOCKING (tax-mapper gỡ cờ không căn cứ).
  const w = warnings || {};
  if (w.listingDerived && (w.requiresLicense || w.requiresInspection || w.requiresQuarantine || w.dualUseControl)) level = 'BLOCKING';
  const reviewByName = byName.length > 0;
  return { policyLines, policyLevel: level, hasActionablePolicy: level === 'BLOCKING' || reviewByName, reviewByName };
}

module.exports = { classifyPolicy, levelOfLine, splitPolicyText, listingLines, nameLines, RULES, LISTING_RULES };
