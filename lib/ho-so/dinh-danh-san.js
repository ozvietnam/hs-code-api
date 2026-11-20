/**
 * lib/ho-so/dinh-danh-san.js — nhận ĐỊNH DANH BÊN GỌI ĐÃ CÓ SẴN (`body.dinhDanh` của /api/classify).
 *
 * Cổng OZ gọi /api/identify trước rồi gửi kèm kết quả `{ frame, xacMinh }` sang /api/classify. Trước đây classify bỏ qua
 * trường này và (khi HS_HO_SO ≠ off) lib/ho-so/nghien-cuu.js gọi identify() LẠI TỪ ĐẦU — thêm một lượt LLM cho cùng món hàng.
 *
 * `chuanDinhDanh` kiểm hình dạng PHÒNG THỦ (dữ liệu do bên gọi gửi, không tin): sai hình ⇒ null ⇒ đường cũ chạy nguyên.
 * Đúng hình ⇒ trả BẢN SAO đã cắt gọn (không giữ tham chiếu tới đầu vào, không giữ khoá lạ).
 * `tuDinhDanhSan` biến bản đó thành đúng hình kết quả identify() mà nghienCuu cần — nhưng KHÔNG tin nhãn bên gọi:
 * MÁY mở lại từng nguồn (lib/xac-minh-nguon.js, không LLM) rồi TỰ tính lại mức kiểm chứng. Nhãn `muc` bên gọi gửi chỉ dùng
 * để kiểm hình dạng, không bao giờ được dùng làm căn cứ.
 */
const { urlAnToan } = require('../xac-minh-nguon');
const { tamGiacKiemChung } = require('../attribute-frames');

const MUC = new Set(['VERIFIED', 'CORROBORATED', 'HYPOTHESIS', 'KHONG_NGUON']);
const KHOA_TRUONG = /^[A-Za-z][A-Za-z0-9_]{0,59}$/;
const SO_TRUONG_TOI_DA = 40;
const SO_NGUON_TOI_DA = 10;
const SO_NGUON_MO_LAI = 5; // cùng trần lib/xac-minh-nguon.js#xacMinhNhieu

const laObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const chu = (v, n) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, n) : '');

/**
 * @param {unknown} v `body.dinhDanh`
 * @returns {null | {frame: {chuong: string, truong: Record<string,string>, model?: string, thuongHieu?: string},
 *   xacMinh: {muc: string, nguon: Array<{url: string, trich?: string, loai: 'nsx'|'phu', retrievedAt?: string, xacMinh?: 'CHUA_XAC_MINH'}>}}}
 */
function chuanDinhDanh(v) {
  try {
    if (!laObj(v) || !laObj(v.frame) || !laObj(v.xacMinh)) return null;
    const chuongTho = chu(v.frame.chuong, 4);
    if (!/^\d{1,2}$/.test(chuongTho)) return null;
    const chuong = chuongTho.padStart(2, '0');
    if (chuong === '00' || Number(chuong) > 98) return null;
    if (!laObj(v.frame.truong)) return null;
    const muc = typeof v.xacMinh.muc === 'string' ? v.xacMinh.muc : '';
    if (!MUC.has(muc) || !Array.isArray(v.xacMinh.nguon)) return null;

    const truong = {};
    for (const [k, gt] of Object.entries(v.frame.truong).slice(0, SO_TRUONG_TOI_DA)) {
      if (!KHOA_TRUONG.test(k)) continue;
      const s = chu(gt, 400);
      if (s) truong[k] = s;
    }
    const nguon = [];
    for (const n of v.xacMinh.nguon.slice(0, SO_NGUON_TOI_DA * 3)) {
      if (!laObj(n)) continue;
      const url = urlAnToan(n.url); // chỉ http(s), không trỏ mạng nội bộ
      if (!url || nguon.some((x) => x.url === url)) continue;
      const trich = chu(n.trich, 600);
      const ngay = chu(n.retrievedAt, 40);
      nguon.push({
        url, ...(trich ? { trich } : {}), loai: String(n.loai || '').toLowerCase() === 'nsx' ? 'nsx' : 'phu',
        ...(ngay ? { retrievedAt: ngay } : {}), ...(n.xacMinh === 'CHUA_XAC_MINH' ? { xacMinh: 'CHUA_XAC_MINH' } : {}),
      });
      if (nguon.length >= SO_NGUON_TOI_DA) break;
    }
    const model = chu(v.frame.model, 120);
    const thuongHieu = chu(v.frame.thuongHieu, 80);
    return {
      frame: { chuong, truong, ...(model ? { model } : {}), ...(thuongHieu ? { thuongHieu } : {}) },
      xacMinh: { muc, nguon },
    };
  } catch {
    return null;
  }
}

/**
 * Dựng kết quả cùng hình identify() từ định danh có sẵn — KHÔNG gọi LLM. Nguồn bên gọi đã tự đánh dấu CHUA_XAC_MINH thì bỏ;
 * phần còn lại (≤5) được MÁY mở lại, chỉ nguồn qua xác minh mới vào tam giác kiểm chứng.
 * @param {ReturnType<typeof chuanDinhDanh>} san kết quả chuanDinhDanh (khác null)
 * @param {string} model model của hồ sơ (dùng khi frame không có)
 * @param {(ds: object[], model: string) => Promise<object[]>} xacMinhNhieu
 */
async function tuDinhDanhSan(san, model, xacMinhNhieu) {
  const ung = san.xacMinh.nguon.filter((n) => n.xacMinh !== 'CHUA_XAC_MINH').slice(0, SO_NGUON_MO_LAI);
  if (!ung.length) return { frame: san.frame, xacMinh: { muc: 'KHONG_NGUON', mien: [], nguon: [] }, xacMinhKetQua: [], tuDinhDanhSan: true };
  const ketQua = (await xacMinhNhieu(ung, san.frame.model || model || '')) || [];
  const ok = new Set(ketQua.filter((x) => x && x.xacMinhOk).map((x) => String(x.url).trim()));
  const tg = tamGiacKiemChung(ung.filter((n) => ok.has(n.url)));
  return { frame: san.frame, xacMinh: { muc: tg.muc, mien: tg.mien, nguon: tg.chiTiet }, xacMinhKetQua: ketQua, tuDinhDanhSan: true };
}

module.exports = { chuanDinhDanh, tuDinhDanhSan };
