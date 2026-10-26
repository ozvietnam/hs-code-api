/**
 * Kết nối Cổng OZ (MCP — repo ozplugin, mcp.uythacnhapkhau.com) cho tra rủi ro SHTT.
 *
 * Chỉ thị CEO 26/10/2026: oz-shtt là NGUỒN CẤP TIN phía sau Cổng OZ; mọi dịch vụ OZ
 * tiêu thụ nhau PHẢI đi qua cổng (cấm đấu nối tắt repo-repo), traffic nội bộ trừ điểm
 * bình thường như khách (nạp tiền định kỳ, không luật riêng). Đây là Pha 2 của chuyển
 * tuyến — Pha 1 đã xong ở erp-xnk (PR #539).
 *
 * Cùng interface lib/shtt-client.js (isEnabled/checkRisk, trả shape /v1/check nguyên
 * vẹn) để lib/trademark-watch đổi client mà KHÔNG đổi logic chấm/hợp đồng trả về.
 * Cổng trả NGUYÊN data backend (nguyên tắc kiến trúc 1 của cổng) — chỉ khác phong bì
 * MCP: POST /mcp JSON-RPC tools/call {kiem_tra_shtt}, Bearer API-key.
 *
 * NGUYÊN TẮC AN TOÀN (giống shtt-client): tầng LÀM GIÀU — cổng không trả lời / chưa
 * cấu hình / lỗi / hết điểm → trả null để tầng trên bỏ phần đèn, KHÔNG làm hỏng tra HS.
 *
 * Cấu hình (biến môi trường):
 *   OZ_CONG_MCP_URL        gốc cổng, vd https://mcp.uythacnhapkhau.com (trống = chưa chuyển)
 *   OZ_CONG_MCP_KEY        khoá ozk_… của tài khoản dịch vụ hs-code-api (nạp điểm như khách)
 *   OZ_CONG_MCP_TIMEOUT_MS thời gian chờ tối đa (mặc định 2500ms — cổng thêm 1 chặng)
 */
'use strict';

const DEFAULT_TIMEOUT_MS = 2500;

function baseUrl() {
  return String(process.env.OZ_CONG_MCP_URL || '').trim().replace(/\/+$/, '');
}
function apiKey() {
  return String(process.env.OZ_CONG_MCP_KEY || '').trim();
}
function timeoutMs() {
  const n = Number(process.env.OZ_CONG_MCP_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

/** Đủ cấu hình cổng? (đủ = ưu tiên cổng hơn đường thẳng oz-shtt) */
function isEnabled() {
  return baseUrl().length > 0 && apiKey().length > 0;
}

/** Giữ 8 số đầu của mã HS — cổng chuẩn hoá nhưng tự-validate để đỡ một lượt trả lỗi. */
function hs8(hsCode) {
  const d = String(hsCode || '').replace(/\D/g, '').slice(0, 8);
  return d.length === 8 ? d : null;
}

/** Chuẩn hoá xuất xứ về ISO 2 ký tự — mirror shtt-client.normOrigin. */
function normOrigin(origin) {
  const raw = String(origin || '').trim();
  if (!raw) return null;
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  if (raw.includes('中国') || raw.includes('中國')) return 'CN';
  const n = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
  if (/\bchina\b|\bprc\b|trung quoc/.test(n)) return 'CN';
  if (vietNam(n)) return 'VN';
  if (/\bgermany\b|\bdeu\b|duc\b/.test(n)) return 'DE';
  if (/(\bjapan\b)|(\bnhat\b)/.test(n)) return 'JP';
  if (/(\bkorea\b)|(\bhan quoc\b)/.test(n)) return 'KR';
  if (/(\busa\b)|(\bunited states\b)|(\bmy\b)/.test(n)) return 'US';
  return null;
}
function vietNam(n) {
  return /viet ?nam|\bvn\b/.test(n);
}

/**
 * Gọi tool MCP `kiem_tra_shtt` qua cổng. Trả data backend (/v1/check shape: level,
 * reasons, evidence, scope, disclaimer…) HOẶC null nếu: chưa cấu hình, thiếu tên nhãn,
 * mã HS chưa đủ 8 số, cổng lỗi (mềm/cứng/hết điểm), payload lạ. Không bao giờ ném.
 *
 * @param {object} opts {brand, hsCode, origin, depth}
 * @param {object} [deps] tiêm phụ thuộc cho test ({ fetchFn, timeoutMs })
 * @returns {Promise<object|null>}
 */
async function checkRisk(opts = {}, deps = {}) {
  const base = baseUrl();
  const key = apiKey();
  if (!base || !key) return null;

  const hs = hs8(opts.hsCode);
  if (!hs) return null;

  const brand = String(opts.brand || '').trim();
  if (!brand) return null;

  const args = { tenNhan: brand.slice(0, 200), maHs: hs, xuatXu: 'CN' };
  const origin = normOrigin(opts.origin);
  if (origin) args.xuatXu = origin;

  const fetchFn = deps.fetchFn || (typeof fetch === 'function' ? fetch : null);
  if (!fetchFn) return null;

  const ac = new AbortController();
  const limit = deps.timeoutMs || timeoutMs();
  const timer = setTimeout(() => ac.abort(), limit);
  try {
    const res = await fetchFn(`${base}/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        accept: 'application/json, application/json',
        'mcp-protocol-version': '2025-06-18',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'kiem_tra_shtt', arguments: args },
      }),
      signal: ac.signal,
    });
    if (!res || !res.ok) return null;
    const json = await res.json();
    const result = json && json.result;
    if (!result) return null; // JSON-RPC error / không có result
    let tr = result.structuredContent;
    if (tr == null) {
      const text = result.content && result.content[0] && result.content[0].text;
      if (typeof text !== 'string') return null;
      try {
        tr = JSON.parse(text);
      } catch {
        return null;
      }
    }
    if (!tr || tr.ok !== true || !tr.data) return null; // lỗi mềm (HET_DIEM/BACKEND_LOI/…) → bỏ đèn
    const data = tr.data;
    // Hợp đồng tối thiểu như shtt-client: level hợp lệ, không thì coi như hỏng.
    if (!data || typeof data.level !== 'string') return null;
    if (!['RED', 'YELLOW', 'GREEN', 'UNKNOWN'].includes(data.level)) return null;
    return data;
  } catch {
    // timeout (abort) / lỗi mạng / JSON hỏng — nuốt lỗi, tầng trên bỏ đèn.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  checkRisk,
  isEnabled,
  baseUrl,
  normOrigin,
  hs8,
  DEFAULT_TIMEOUT_MS,
};
