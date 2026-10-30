/**
 * lib/ho-so/loc-quyen.js — `locTheoQuyen`: lọc hồ sơ phân loại theo QUYỀN người gọi TRƯỚC KHI TRẢ (plan L1-5b; spec hồ sơ §8.1
 * "Tín hiệu rủi ro nội bộ", §8.6; plan Review Focus 3). Hàm THUẦN (không sửa đầu vào), gọi ở MỌI endpoint trả hồ sơ (L1-5d).
 *
 * `noiBo !== true` (công khai, khoá cong-oz, HS_API_TOKEN, giá trị lạ) ⇒ gỡ ở MỌI độ sâu:
 *   - mọi đối tượng có `loai` = MO_TA_GIONG_MA_KHAC (tín hiệu "mô tả giống – mã khác" đếm từ kho tờ khai Oz);
 *   - mọi đối tượng có `nguon` = KHO_TO_KHAI_OZ / `nhan` = NOI_BO_OZ (vd tienLe[] loại Oz — chỉ đếm);
 *   - mọi trường đếm từ kho Oz (KHOA_DEM_KHO_OZ) và mọi chuỗi nhắc MO_TA_GIONG_MA_KHAC.
 * KHÔNG gỡ `DANH_MUC_RUI_RO` (QĐ 2079 — công khai cho mọi người gọi từ CEO 30/10/2026, nhãn QD_2079_BAC_C).
 * Với MỌI người gọi (kể cả nội bộ): gỡ bất kỳ dấu QĐ 2079 nào lọt vào `canCu` — tín hiệu bậc C không bao giờ là căn cứ pháp lý.
 */
const LOAI_NOI_BO = new Set(['MO_TA_GIONG_MA_KHAC']);
const NGUON_NOI_BO = new Set(['KHO_TO_KHAI_OZ']);
const NHAN_NOI_BO = new Set(['NOI_BO_OZ']);
/** Trường đếm từ kho tờ khai Oz (mọi độ sâu). */
const KHOA_DEM_KHO_OZ = new Set(['demKhoOz', 'soToKhaiOz', 'ozCount', 'demOz']);
const CHUOI_NOI_BO = /MO_TA_GIONG_MA_KHAC|KHO_TO_KHAI_OZ|NOI_BO_OZ/;

const laNoiBoObj = (o) => o && typeof o === 'object' && !Array.isArray(o)
  && (LOAI_NOI_BO.has(o.loai) || NGUON_NOI_BO.has(o.nguon) || NHAN_NOI_BO.has(o.nhan));
const BO = Symbol('bo');

function gotNoiBo(v) {
  if (typeof v === 'string') return CHUOI_NOI_BO.test(v) ? BO : v;
  if (Array.isArray(v)) return v.map(gotNoiBo).filter((x) => x !== BO);
  if (v && typeof v === 'object') {
    if (laNoiBoObj(v)) return BO;
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      if (KHOA_DEM_KHO_OZ.has(k)) continue;
      const y = gotNoiBo(x);
      if (y !== BO) out[k] = y;
    }
    return out;
  }
  return v;
}

const laQd2079 = (o) => o && typeof o === 'object' && (o.loai === 'DANH_MUC_RUI_RO' || /^QD_2079/.test(String(o.nhan || '')));
function gotQd2079(v) {
  if (Array.isArray(v)) return v.filter((x) => !laQd2079(x) && !/QD_2079|DANH_MUC_RUI_RO/.test(JSON.stringify(x ?? null))).map(gotQd2079);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      if (laQd2079(x) || (typeof x === 'string' && /QD_2079|DANH_MUC_RUI_RO/.test(x))) continue;
      out[k] = gotQd2079(x);
    }
    return out;
  }
  return v;
}

/**
 * @param {import('./index').HoSoPhanLoai} hoSo
 * @param {{noiBo?: boolean}} [quyen] chỉ `noiBo === true` (khoá nội bộ Oz — lib/auth.js#laNoiBoOz) giữ tín hiệu kho Oz
 * @returns {import('./index').HoSoPhanLoai}
 */
function locTheoQuyen(hoSo, quyen) {
  if (!hoSo || typeof hoSo !== 'object') return hoSo;
  const noiBo = Boolean(quyen && quyen.noiBo === true);
  const ra = noiBo ? structuredClone(hoSo) : gotNoiBo(hoSo);
  if (ra.canCu && typeof ra.canCu === 'object') ra.canCu = gotQd2079(ra.canCu);
  return ra;
}

module.exports = { locTheoQuyen, KHOA_DEM_KHO_OZ, LOAI_NOI_BO };
