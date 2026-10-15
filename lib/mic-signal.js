/**
 * Tín hiệu HS 10 số do người bán Made-in-China tự khai (bước 12 — thẻ C-2, PR #299, #307 static map).
 *
 * LUẬT SẮT (docs/backlog/12-tien-le-quoc-te-dinh-danh-hang-mic.md, nguyên tắc 2 — CEO chốt 14/10):
 * hint là TÍN HIỆU XẾP HẠNG ứng viên, KHÔNG BAO GIỜ là bằng chứng chốt mã. Module này cố tình
 * chỉ xuất phép ÁNH XẠ + ghi chú — không có hàm nào trả "mã nên chốt", không đường nào từ hint
 * tới finalHs/override; mọi thay đổi mã phải qua GIR + chú giải + biểu thuế của động cơ.
 *
 * Ánh xạ: 8 số đầu mã TQ trùng HS quốc tế → PN6; dòng VN ứng viên = các dòng lá cùng PN6 trong tax.json.
 * #307: dong8UngVien precomputed trong `data/mic-hs-map.json` (khoá hs6) — không quét taxData runtime.
 */
const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, '..', 'data', 'mic-hs-map.json');

const nz = (s) => String(s || '').replace(/\D/g, '');

let _mapCache = null;
function loadMap() {
  if (_mapCache) return _mapCache;
  try {
    _mapCache = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  } catch {
    // Map lỗi / thiếu → trả {} — bên dưới fallback dong8UngVien=[] là fail-safe, không crash.
    _mapCache = {};
  }
  return _mapCache;
}

// Test ép / thiếu map → cho phép inject map tĩnh để không phụ thuộc filesystem.
function _resetMapForTest() { _mapCache = null; }

/** HS 10 số (hoặc 8/6) người bán khai → { hint, hs6, hs4, dong8UngVien[], loai:'SIGNAL' }; không hợp lệ → null. */
function micSignal(hs10, { maxDong = 12 } = {}) {
  const h = nz(hs10);
  if (h.length < 6 || /^0{6}/.test(h)) return null;
  const hs6 = h.slice(0, 6);
  const map = loadMap();
  const entry = map[hs6];
  if (entry) {
    return {
      hint: h,
      hs6,
      hs4: entry.hs4 || h.slice(0, 4),
      dong8UngVien: (entry.dong8UngVien || []).slice(0, maxDong),
      loai: 'SIGNAL',
    };
  }
  // Không có trong map (prefix hs6 không có dòng lá trong tax.json — vd hàng chưa phân nhóm ở VN):
  // vẫn trả signal nhưng dong8UngVien rỗng (không bịa), giữ nguyên hs6+hs4 để downstream biết nhóm.
  return { hint: h, hs6, hs4: h.slice(0, 4), dong8UngVien: [], loai: 'SIGNAL' };
}

/** Ghi chú đi kèm mọi nơi tín hiệu được hiển thị — khách và chuyên viên đều phải thấy ranh giới này. */
const GHI_CHU = 'HS do người bán Made-in-China tự khai — TÍN HIỆU xếp hạng ứng viên, không phải bằng chứng chốt mã.';

module.exports = { micSignal, GHI_CHU, _resetMapForTest, MAP_PATH };
