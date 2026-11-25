/**
 * lib/cong-vat-lieu.js — Cổng vòng 2 SO_TAY_VAT_LIEU (#1650, sau cờ HS_CONG_VAT_LIEU mặc định TẮT).
 *
 * MỤC ĐÍCH:
 *   Đối chiếu vật liệu ĐỌC ĐƯỢC của hàng hóa (chỉ từ chữ khách viết: `productName` / `productText`)
 *   với các mục `dieuKienVao` về vật liệu của sổ tay nhóm 4 số (`vat_lieu`, `chat_lieu`, `san_pham_bang_*`…).
 *   Bật cờ (thêm challenge `SO_TAY_VAT_LIEU`) CHỈ KHI:
 *     1. Sổ tay nhóm có điều kiện vào về vật liệu;
 *     2. Đọc được ít nhất một vật liệu CHÍNH của hàng từ chữ khách viết (`tu-vung@2`: `chatLieu`/`vatLieuKhac`),
 *        sau khi loại bỏ vật liệu của bao bì/đóng gói, bộ phận phụ, công dụng/máy gia công, mạ/sơn và hợp chất oxit;
 *        KHÔNG bật chỉ vì trường `material` do LLM tự suy. Đọc không ra vật liệu → KHÔNG bật cờ;
 *     3. Không có vật liệu nào đọc được của hàng thuộc/khớp danh sách giá trị vật liệu của nhóm.
 *
 * KHÔNG tạo từ điển/bảng vật liệu mới: nhận diện vật liệu dùng 100% khoá `chatLieu` và `vatLieuKhac` của
 * `lib/tu-vung.js` (`tu-vung@2`). Tên chương gợi ý đọc từ `data/chu-giai-chuong.json`. Không gọi LLM, không tự chọn mã (L3).
 */
'use strict';

const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const dotted = (h4) => `${h4.slice(0, 2)}.${h4.slice(2)}`;
const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
const boDau = (s) => String(s || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, (c) => (c === 'Đ' ? 'D' : 'd'))
  .toLowerCase();

/** Công tắc: chỉ "on" / "1" / "true" mới bật. Mặc định TẮT để giữ nguyên hành vi đường khách khi chưa đo (L1). */
function bat() {
  return /^(on|1|true)$/i.test(String(process.env.HS_CONG_VAT_LIEU || '').trim());
}

// Các fact có chữ `bang_` hoặc `vat_lieu` nhưng KHÔNG nói vật liệu cấu thành của chính sản phẩm.
const NON_MAT_FACT = /^khong_phai_|bat_ky|moi_loai|duoc_duc|gia_cong|de_ngoai|mu_giay|bang_tay|bang_dien|bang_gas|bang_dong_co|bang_tia_lua|bang_dieu_khien|bang_mot_hay|bang_cach|bang_mat|xac_dinh_theo|dot_chay|chat_ke_tinh|dam_hoac_axit|thuy_tinh_hoa|kim_loai_quy|vo_ngoai_nap_day_coc_uong/;

const KIM_LOAI_CO_BAN = new Set(['kim loại', 'sắt thép', 'thép không gỉ', 'gang', 'đồng', 'nhôm', 'kẽm', 'niken', 'TITAN']);

// Ánh xạ mã vật liệu của tu-vung@2 → danh sách số chương HS (tên chương đọc động từ data/chu-giai-chuong.json).
const CHUONG_THEO_VAT_LIEU = {
  'nhôm': ['76'],
  'đồng': ['74'],
  'sắt thép': ['72', '73'],
  'thép không gỉ': ['72', '73'],
  'gang': ['73'],
  'kẽm': ['79'],
  'niken': ['75'],
  'plastic': ['39'],
  'PLASTIC_XOP': ['39'],
  'cao su': ['40'],
  'CAO_SU_XOP': ['40'],
  'CAO_SU_CUNG': ['40'],
  'gỗ': ['44'],
  'giấy': ['48'],
  'GIAY_XENLULO': ['48'],
  'gốm sứ': ['69'],
  'thủy tinh': ['70'],
  'PHA_LE_CHI': ['70'],
  'DA_THUOC': ['42'],
  'DA_THUOC_TONG_HOP': ['42'],
  'VANG_HOAC_BAC': ['71'],
  'VANG_HOAC_MA_VANG': ['71'],
  'KIM_LOAI_DAT_PHU_VANG_HOAC_BAC': ['71'],
};

let _tenChuongCache = null;
function tenChuongMap() {
  if (_tenChuongCache) return _tenChuongCache;
  const m = new Map();
  try {
    const cg = JSON.parse(fs.readFileSync(dataReadPath('chu-giai-chuong.json'), 'utf8'));
    for (const [ch, v] of Object.entries(cg)) {
      const first = String(v?.chuong || '').split('\n')[0];
      const match = first.match(/^Chương\s*\d+\s*[:.\-–]\s*(.+)$/i);
      if (match) m.set(String(ch).padStart(2, '0'), match[1].trim());
    }
  } catch { /* thiếu tệp dữ liệu chương */ }
  _tenChuongCache = m;
  return m;
}

function goiYChuong(matKey) {
  const chs = CHUONG_THEO_VAT_LIEU[matKey];
  if (!chs || !chs.length) return '';
  const map = tenChuongMap();
  return chs.map((ch) => {
    const ten = map.get(ch);
    const num = Number(ch);
    return ten ? `Chương ${num} (${clip(ten, 80)})` : `Chương ${num}`;
  }).join(' hoặc ');
}

function getTV() {
  // Nạp lười để tránh vòng require: tu-vung → so-tay-gates → cong-vat-lieu → tu-vung.
  return require('./tu-vung');
}

function nhanVatLieu(TV, key) {
  try {
    const vlk = TV.layKhoa('vatLieuKhac');
    const mt = vlk?.moTaGiaTri?.[key];
    if (mt?.nhanVi) return mt.nhanVi;
  } catch { /* bỏ qua */ }
  return key;
}

// Thu hẹp văn bản về phần vật liệu chính của hàng: loại cụm bao bì/đóng gói, bộ phận phụ trợ
// (không đứng đầu dòng), công dụng/máy móc/vật gia công, lớp mạ/sơn và hợp chất oxit/muối kim loại.
const RE_BAO_BI = /(?<![\p{L}\p{M}])(?:được\s+)?(?:đóng\s*(?:gói\s*)?(?:trong|bằng|vào)|đựng\s*(?:trong|bằng|vào)|chứa\s*(?:trong|bằng)|bao\s*bì(?:\s*bằng)?)(?![\p{L}\p{M}])[^,;\n()—–.]*/giu;
const RE_BAO_BI_SAU_DAU = /(?<=[\s,;(—–])(?:trong|kèm|có|với)\s+(?:vỏ\s+)?(?:hộp|túi|bao|thùng|khay|lọ|chai|can|pallet|gói)(?![\p{L}\p{M}])[^,;\n()—–.]*/giu;
const RE_BO_PHAN = /(?<=[\s,;(—–])(?:có\s+|gắn\s+|lắp\s+|kèm\s+|với\s+)?(?:tay\s*cầm|tay\s*nắm|quai\s*cầm|quai|cán|nắp(?:\s*đậy)?|vỏ\s*(?:ngoài|bọc)|đế|chân(?:\s*đế)?|viền|lõi|ruột(?:\s*dẫn)?|lớp(?:\s*(?:ngoài|trong|bọc|phủ|lót|đệm|gia\s*cố|cách\s*điện|mặt))?|phụ\s*kiện|linh\s*kiện|nút\s*bấm)(?![\p{L}\p{M}])[^,;\n()—–.]*/giu;
const RE_CONG_DUNG = /(?<![\p{L}\p{M}])(?:dùng\s*(?:cho|trên|trong)|sử\s*dụng\s*(?:cho|trên|trong)|cho\s+(?:máy|dây\s*chuyền|hệ\s*thống|thiết\s*bị|ô\s*tô|xe\s*máy)|trên\s+(?:dây\s*chuyền|máy)|(?:dùng\s+)?để\s+(?:sản\s*xuất|gia\s*công|cắt|hàn|mài|ép|gói|đựng|bọc|chứa|làm\s+(?:hộp|túi|bao)))(?![\p{L}\p{M}])[^,;\n()—–.]*/giu;
const RE_MA_PHU = /(?<![\p{L}\p{M}])(?:được\s+)?(?:mạ|sơn|xi|nhúng)(?![\p{L}\p{M}])(?:\s+(?:một\s+|hai\s+|các\s+)?lớp)?(?:\s+bằng)?\s+[\p{L}\p{M}0-9-]+(?:\s+[\p{L}\p{M}0-9-]+){0,2}/giu;
const RE_HOP_CHAT_KL = /(?<![\p{L}\p{M}])(?:cao\s+nhôm|(?:oxit|hydroxit|clorua|sunfat|nitrat|cacbonat|silicat|phosphat)\s+(?:nhôm|sắt|đồng|kẽm|niken|chì|thiếc)|(?:nhôm|sắt|đồng|kẽm|niken|chì|thiếc)\s+oxit)(?![\p{L}\p{M}])/giu;

function locVanBanVatLieuChinh(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line
      .replace(RE_BAO_BI, ' ')
      .replace(RE_BAO_BI_SAU_DAU, ' ')
      .replace(RE_BO_PHAN, ' ')
      .replace(RE_CONG_DUNG, ' ')
      .replace(RE_MA_PHU, ' ')
      .replace(RE_HOP_CHAT_KL, ' ')
      .replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const VI_TRI_CHINH = new Set(['CHINH', 'THAN', 'VO']);

/** Đọc các vật liệu từ một chuỗi văn bản bằng đúng khoá `chatLieu` và `vatLieuKhac` của `tu-vung@2`. */
function docVatLieuTuChu(text, { chiViTriChinh = false } = {}) {
  const t = String(text || '').trim();
  if (!t) return [];
  const TV = getTV();
  const out = [];
  const cl = TV.docGiaTri('chatLieu', t);
  if (cl.trangThai === 'DA_CO') {
    for (const item of cl.chiTiet || []) {
      if (chiViTriChinh && !VI_TRI_CHINH.has(item.viTri)) continue;
      const laSilicone = item.chatLieu === 'cao su' && /silicon/i.test(t);
      out.push({ key: item.chatLieu, label: item.chatLieu, bangChung: item.bangChung || item.chatLieu, viTri: item.viTri, laSilicone });
    }
  }
  const vk = TV.docGiaTri('vatLieuKhac', t);
  if (vk.trangThai === 'DA_CO') {
    const bc = vk.bangChung || nhanVatLieu(TV, vk.giaTri);
    out.push({ key: vk.giaTri, label: nhanVatLieu(TV, vk.giaTri), bangChung: bc, viTri: 'CHINH', laSilicone: false });
    if (vk.giaTri === 'CAO_SU_CUNG') {
      // "cao su cứng" là ebonit (40.17): chỉ bỏ "cao su" chung khi mọi lần khớp "cao su" đều nằm trong "cao su cứng".
      const tBoCung = t.replace(/(?<![\p{L}\p{M}])cao\s+su\s+cứng(?![\p{L}\p{M}])/giu, ' ');
      const clCon = TV.docGiaTri('chatLieu', tBoCung);
      const conCaoSu = clCon.trangThai === 'DA_CO' && (clCon.chiTiet || []).some((x) => x.chatLieu === 'cao su');
      if (!conCaoSu) return out.filter((m) => m.key !== 'cao su');
    }
  } else if (Array.isArray(vk.ungVien)) {
    for (const u of vk.ungVien) {
      const lb = nhanVatLieu(TV, u);
      out.push({ key: u, label: lb, bangChung: lb, viTri: 'CHINH', laSilicone: false });
    }
  }
  return out;
}

/**
 * Đọc vật liệu chính của hàng hoá CHỈ từ chữ khách viết (`productName` / `productText`) qua `tu-vung@2`.
 * Không đọc trường `material` do LLM tự suy ở bước hiểu hàng.
 * @returns {Array<{key:string, label:string, bangChung:string, viTri:string, laSilicone:boolean}>}
 */
function docVatLieuHang({ productText = '', productName = '' } = {}) {
  const seen = new Set();
  const out = [];
  const combined = [productName, productText].filter((x) => String(x || '').trim()).join('\n');
  const cleaned = locVanBanVatLieuChinh(combined);
  if (!cleaned) return out;
  for (const m of docVatLieuTuChu(cleaned, { chiViTriChinh: true })) {
    if (!m?.key || seen.has(m.key)) continue;
    seen.add(m.key);
    out.push(m);
  }
  return out;
}

/**
 * Rút danh sách vật liệu cho phép từ một mục `dieuKienVao` của sổ tay (nếu đó là điều kiện vật liệu).
 * Trả null nếu mục đó không phải điều kiện vật liệu hoặc không đọc ra giá trị rõ ràng.
 */
function layDieuKienVatLieu(d) {
  if (!d || (d.op !== 'in' && d.op !== '=') || d.value === false) return null;
  const fact = String(d.fact || '');
  if (!fact || NON_MAT_FACT.test(fact)) return null;

  const isMatIn = d.op === 'in' && /^(?:vat_lieu|chat_lieu)(?:$|_)/.test(fact);
  const isMatEqStr = d.op === '=' && typeof d.value === 'string' && /^(?:vat_lieu|chat_lieu)(?:$|_)/.test(fact);
  const isMatEqBool = d.op === '=' && d.value === true && (
    /^(?:vat_lieu_la_|chat_lieu_|san_pham_bang_|bang_|lam_tu_|lam_toan_bo_tu_|hang_may_san_bang_)/.test(fact)
    || /_bang_(?:plastic|cao_su|nhom|dong|sat|thep|gang|niken|kem|chi|thiec|go|giay|bot_giay|gom|su|thuy_tinh|da_thuoc|vai_det|vat_lieu_det|kim_loai)/.test(fact)
  );
  if (!isMatIn && !isMatEqStr && !isMatEqBool) return null;

  const mats = new Map();
  if (typeof d.value === 'string') {
    for (const part of d.value.split(/[|,]|hoặc/i)) {
      const p = part.trim();
      if (!p) continue;
      for (const m of docVatLieuTuChu(p)) mats.set(m.key, m.label || m.key);
    }
    if (!mats.size) return null;
    const label = d.value.split('|').map((s) => s.trim()).filter(Boolean).join(', ');
    return { mats: new Set(mats.keys()), label, nguon: d.nguon, trich: d.trich };
  }

  // d.value === true: đọc vật liệu từ câu trích nguyên văn, đối chiếu chéo với âm tiết của `fact`
  // để không lấy nhầm vật liệu nằm trong mệnh đề công dụng/loại trừ ("dùng để cuốn sợi kim loại", "trừ...").
  // Dùng ranh giới Unicode thay cho \b để khớp đúng chữ Việt có dấu ("trừ", "dùng để", "ngoại trừ").
  const factWords = new Set(fact.split('_').filter(Boolean));
  const trichMain = String(d.trich || '').split(/(?<![\p{L}\p{M}])(?:trừ|dùng để|ngoại trừ)(?![\p{L}\p{M}])/iu)[0];
  for (const m of docVatLieuTuChu(trichMain)) {
    const bcWords = boDau(m.bangChung).split(/[^a-z0-9]+/).filter(Boolean);
    if (bcWords.length && bcWords.some((w) => factWords.has(w))) {
      mats.set(m.key, m.label || m.key);
    }
  }
  if (!mats.size) return null;
  return { mats: new Set(mats.keys()), label: [...mats.values()].join(', '), nguon: d.nguon, trich: d.trich };
}

/** Kiểm một vật liệu đọc được của hàng có thuộc/khớp tập vật liệu cho phép của nhóm không. */
function khopVatLieu(prod, allowedSet) {
  const prodKey = typeof prod === 'string' ? prod : prod?.key;
  if (!prodKey) return false;
  if (allowedSet.has(prodKey)) return true;
  if (allowedSet.has('plastic') && prodKey === 'cao su' && typeof prod === 'object' && prod?.laSilicone) return true;
  if (prodKey === 'kim loại' && [...allowedSet].some((a) => KIM_LOAI_CO_BAN.has(a))) return true;
  if (allowedSet.has('kim loại') && KIM_LOAI_CO_BAN.has(prodKey)) return true;
  if (allowedSet.has('sắt thép') && prodKey === 'thép không gỉ') return true;
  if (allowedSet.has('cao su') && prodKey === 'CAO_SU_XOP') return true;
  if (allowedSet.has('plastic') && prodKey === 'PLASTIC_XOP') return true;
  if ((allowedSet.has('vải dệt') || allowedSet.has('VAT_LIEU_DET')) && (prodKey === 'vải dệt' || prodKey === 'VAT_LIEU_DET')) return true;
  if (allowedSet.has('giấy') && prodKey === 'GIAY_XENLULO') return true;
  if (allowedSet.has('gỗ') && (prodKey === 'TRE' || prodKey === 'SONG_MAY')) return true;
  if ((allowedSet.has('DA_THUOC') || allowedSet.has('DA_THUOC_TONG_HOP')) && (prodKey === 'DA_THUOC' || prodKey === 'DA_THUOC_TONG_HOP')) return true;
  return false;
}

/**
 * Kiểm tra cổng SO_TAY_VAT_LIEU cho nhóm `h4` với sổ tay `soTay`.
 * Trả về mảng `challenges` (0 hoặc 1 phần tử).
 */
function kiemCongVatLieu({ h4, soTay, productText = '', productName = '' } = {}) {
  if (!soTay || !Array.isArray(soTay.dieuKienVao) || !soTay.dieuKienVao.length) return [];
  // Nhóm có cả nhánh phụ kiện vật liệu cách điện (như 85.47 nhánh A) không chỉ dành riêng cho kim loại (nhánh B).
  const hasInsulatingBranch = soTay.dieuKienVao.some((d) => /phu_kien_cach_dien/i.test(String(d?.fact || '')));
  const rules = soTay.dieuKienVao
    .filter((d) => !(hasInsulatingBranch && /_bang_kim_loai/i.test(String(d?.fact || ''))))
    .map(layDieuKienVatLieu)
    .filter(Boolean);
  if (!rules.length) return [];

  const prodMats = docVatLieuHang({ productText, productName });
  if (!prodMats.length) return [];

  const unionAllowed = new Set();
  for (const r of rules) for (const k of r.mats) unionAllowed.add(k);
  if (prodMats.some((m) => khopVatLieu(m, unionAllowed))) return [];

  const allowedLabel = [...new Set(rules.map((r) => r.label))].join(' / ');
  const prodLabel = prodMats.map((m) => (m.bangChung && m.bangChung.toLowerCase() !== m.label.toLowerCase()
    ? `${m.label} (${m.bangChung})`
    : m.label)).join(', ');
  const goiY = prodMats.map((m) => goiYChuong(m.key)).filter(Boolean);
  const goiYText = goiY.length ? ` Nếu hàng thực sự bằng ${prodMats[0].label}, xét chuyển sang ${[...new Set(goiY)].join(' hoặc ')}.` : '';
  const primary = rules[0];

  return [{
    gate: 'SO_TAY_VAT_LIEU',
    h4,
    target: null,
    matched: prodLabel,
    reasonVi: `Nhóm ${dotted(h4)} chỉ gồm hàng bằng ${clip(allowedLabel, 120)}; hồ sơ ghi ${clip(prodLabel, 80)}.`,
    questionVi: `Hồ sơ ghi vật liệu "${clip(prodLabel, 80)}", trong khi nhóm ${dotted(h4)} chỉ gồm hàng bằng ${clip(allowedLabel, 120)}. Vật liệu cấu thành chính xác của hàng là gì?${goiYText}`,
    legal: [{ nguon: primary.nguon, trich: primary.trich }],
  }];
}

module.exports = {
  bat,
  locVanBanVatLieuChinh,
  docVatLieuTuChu,
  docVatLieuHang,
  layDieuKienVatLieu,
  khopVatLieu,
  goiYChuong,
  kiemCongVatLieu,
};
