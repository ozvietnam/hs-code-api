function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

const crypto = require('crypto');

/**
 * HS_SERVICE_TOKENS="cong-oz:<khoa>,erp:<khoa>" → [{ name, key }].
 * Tên = phần trước dấu ':' ĐẦU TIÊN; khoá = phần còn lại. Mục hỏng (thiếu tên/khoá/dấu ':') bị bỏ qua.
 */
function parseServiceTokens() {
  return String(process.env.HS_SERVICE_TOKENS || '')
    .split(',')
    .map((s) => s.trim())
    .map((s) => {
      const i = s.indexOf(':');
      return i > 0 ? { name: s.slice(0, i).trim(), key: s.slice(i + 1).trim() } : null;
    })
    .filter((e) => e && e.name && e.key);
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Tên khoá dịch vụ của người gọi (vd "cong-oz"), hoặc null. HS_API_TOKEN KHÔNG phải khoá dịch vụ. */
function serviceCaller(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  let found = null;
  for (const e of parseServiceTokens()) {
    if (safeEqual(token, e.key) && !found) found = e.name; // duyệt hết để thời gian không lộ vị trí khớp
  }
  return found;
}

/**
 * Caller NỘI BỘ Oz (L0g, #545): khoá dịch vụ có tên nằm trong HS_INTERNAL_CALLERS (CSV, mặc định "erp").
 * Chỉ caller nội bộ nhận tín hiệu đếm từ KHO TỜ KHAI OZ (vd MO_TA_GIONG_MA_KHAC). QĐ 2079 KHÔNG còn đi qua cổng này:
 * CEO 30/10/2026 công khai danh mục cho mọi người gọi (lib/rui-ro-phan-loai.js). `cong-oz` LUÔN false kể cả khi bị ghi vào env:
 * Cổng phục vụ khách ngoài (chặn cứng trong mã). HS_API_TOKEN / công khai / khoá sai → false.
 */
const KHONG_BAO_GIO_NOI_BO = new Set(['cong-oz']);
function laNoiBoOz(req) {
  const ten = serviceCaller(req);
  if (!ten || KHONG_BAO_GIO_NOI_BO.has(ten)) return false;
  const ds = String(process.env.HS_INTERNAL_CALLERS ?? 'erp').split(',').map((s) => s.trim()).filter(Boolean);
  return ds.includes(ten);
}

function requireAuth(req, res, { publicRoute } = {}) {
  if (publicRoute && process.env.HS_MATCH_PUBLIC === 'true') {
    return false;
  }

  const expected = process.env.HS_API_TOKEN;
  const services = parseServiceTokens();
  if (!expected && !services.length) {
    res.status(503).json({
      error: 'Service misconfigured',
      detail: 'HS_API_TOKEN is not set on the server',
    });
    return true;
  }

  const token = getBearerToken(req);
  const ok = token && ((expected && token === expected) || serviceCaller(req) !== null);
  if (!ok) {
    res.status(401).json({ error: 'Unauthorized' });
    return true;
  }

  return false;
}

function isApiTokenConfigured() {
  return Boolean(process.env.HS_API_TOKEN) || parseServiceTokens().length > 0;
}

function requireAdmin(req, res) {
  const expected = process.env.HS_ADMIN_TOKEN;
  if (!expected) {
    res.status(503).json({
      error: 'Service misconfigured',
      detail: 'HS_ADMIN_TOKEN is not set on the server',
    });
    return true;
  }

  const token = getBearerToken(req);
  if (!token || token !== expected) {
    res.status(403).json({ error: 'Forbidden', detail: 'HS_ADMIN_TOKEN required' });
    return true;
  }

  return false;
}

module.exports = { requireAuth, serviceCaller, laNoiBoOz, requireAdmin, getBearerToken, isApiTokenConfigured };
