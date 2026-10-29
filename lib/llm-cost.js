// lib/llm-cost.js — bảng giá LLM + quy đổi usage → USD (L0j, #547).
//
// Chỉ để ĐẾM và BÁO chi phí lượt công khai (CEO 29/10/2026: giữ mở, không trần tiền). Không chặn gì.
// Khoá bảng: "<provider>/<model>" đúng như lib/usage-context.js#recordUsage ghi (tiền tố "models/" của Gemini bị bỏ).
// Mỗi mục: { vaoUsdMoiTrieu, raUsdMoiTrieu, nguonGia, traNgay, ghiChu }.
//   nguonGia: TRANG_CHINH_THUC (đọc trên trang giá của nhà cung cấp ngày traNgay)
//           | UOC_LUONG       (trang chính thức không niêm yết đúng mẫu — số tạm, phải ghi đè khi có giá thật)
//           | MIEN_PHI        (tầng miễn phí / máy cục bộ)
//           | ENV             (ghi đè bằng LLM_PRICE_TABLE)
// Ghi đè: env LLM_PRICE_TABLE='{"minimax/MiniMax-M2.7-highspeed":{"vaoUsdMoiTrieu":0.3,"raUsdMoiTrieu":1.2}}' — từng mục,
// mục mới (vd Hermes) được thêm. JSON hỏng / giá âm / không phải số ⇒ bỏ qua mục đó, dùng bảng mặc định.
// Không có giá (mẫu lạ, Hermes chưa khai) hoặc token -1 ⇒ tinhUsd = null → đếm vào `khongRoGia`, không đoán.
// Chưa tính: phí công cụ tìm web của z.ai ($0.01/lượt theo docs.z.ai) và giảm giá cache — số báo là ước lượng theo token.

const TRA_NGAY = '2026-10-29';

const BANG_GIA_MAC_DINH = Object.freeze({
  // MiniMax (nhà cung cấp chính, gói trả phí của OZ). platform.minimax.io/docs/pricing/overview tra 29/10/2026 chỉ còn
  // niêm yết MiniMax-M3 / M3.1-Flash, KHÔNG còn M2.x → tạm lấy giá MiniMax-M3 Standard (≤512k token vào): $0.30 / $1.20.
  'minimax/MiniMax-M2.7-highspeed': { vaoUsdMoiTrieu: 0.30, raUsdMoiTrieu: 1.20, nguonGia: 'UOC_LUONG', traNgay: TRA_NGAY, ghiChu: 'Trang giá MiniMax không còn niêm yết M2.x; tạm theo M3 Standard. OZ dùng gói trả phí — ghi đè LLM_PRICE_TABLE khi có số thật.' },
  'minimax/MiniMax-M2.7': { vaoUsdMoiTrieu: 0.30, raUsdMoiTrieu: 1.20, nguonGia: 'UOC_LUONG', traNgay: TRA_NGAY, ghiChu: 'Như MiniMax-M2.7-highspeed.' },
  // DeepSeek — api-docs.deepseek.com/quick_start/pricing tra 29/10/2026. Lấy giá GIỜ CAO ĐIỂM, token vào cache-miss
  // (trần trên); giờ thấp điểm bằng một nửa.
  'deepseek/deepseek-flash': { vaoUsdMoiTrieu: 0.30, raUsdMoiTrieu: 1.20, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY, ghiChu: 'Giờ cao điểm, cache-miss; thấp điểm = 1/2.' },
  'deepseek/deepseek-v4-pro': { vaoUsdMoiTrieu: 1.32, raUsdMoiTrieu: 3.96, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY, ghiChu: 'Giờ cao điểm, cache-miss; thấp điểm = 1/2.' },
  'deepseek/deepseek-chat': { vaoUsdMoiTrieu: 0.30, raUsdMoiTrieu: 1.20, nguonGia: 'UOC_LUONG', traNgay: TRA_NGAY, ghiChu: 'Tên mẫu cũ (mặc định DEEPSEEK_MODEL); trang giá không còn ghi tên này — tạm theo giá deepseek-flash.' },
  // Gemini khoá TRẢ PHÍ — ai.google.dev/gemini-api/docs/pricing tra 29/10/2026 (bậc trả phí chuẩn, token chữ).
  'gemini/gemini-2.5-flash': { vaoUsdMoiTrieu: 0.30, raUsdMoiTrieu: 2.50, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY },
  'gemini/gemini-2.5-flash-lite': { vaoUsdMoiTrieu: 0.10, raUsdMoiTrieu: 0.40, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY },
  'gemini/gemini-2.5-pro': { vaoUsdMoiTrieu: 1.25, raUsdMoiTrieu: 10.00, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY, ghiChu: 'Lời nhắc ≤ 200k token.' },
  'gemini/gemini-3.8-flash': { vaoUsdMoiTrieu: 0.75, raUsdMoiTrieu: 3.75, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY, ghiChu: 'Giá tới 31/12/2026; từ 01/01/2027 là $1.50 / $7.50.' },
  'gemini/gemini-3.6-flash': { vaoUsdMoiTrieu: 0.75, raUsdMoiTrieu: 3.75, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY, ghiChu: 'Giá tới 31/12/2026; từ 01/01/2027 là $1.50 / $7.50.' },
  // z.ai (tra web cho web-facts) — docs.z.ai/guides/overview/pricing tra 29/10/2026. OZ dùng GLM Coding Plan trả trước.
  'zai/glm-4.7': { vaoUsdMoiTrieu: 0.60, raUsdMoiTrieu: 2.20, nguonGia: 'TRANG_CHINH_THUC', traNgay: TRA_NGAY, ghiChu: 'Chưa gồm $0.01/lượt công cụ tìm web.' },
  // Tầng miễn phí / cục bộ.
  'gemini-free/*': { vaoUsdMoiTrieu: 0, raUsdMoiTrieu: 0, nguonGia: 'MIEN_PHI', traNgay: TRA_NGAY },
  'ollama/*': { vaoUsdMoiTrieu: 0, raUsdMoiTrieu: 0, nguonGia: 'MIEN_PHI', traNgay: TRA_NGAY },
});

const MIEN_PHI = Object.freeze({ vaoUsdMoiTrieu: 0, raUsdMoiTrieu: 0, nguonGia: 'MIEN_PHI', traNgay: TRA_NGAY });

function chuanModel(model) {
  return String(model ?? '').trim().replace(/^models\//, '');
}

const giaHopLe = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

let envCache = { raw: undefined, bang: {} };
/** LLM_PRICE_TABLE đã kiểm (đọc lại khi env đổi). */
function bangEnv() {
  const raw = process.env.LLM_PRICE_TABLE;
  if (raw === envCache.raw) return envCache.bang;
  const bang = {};
  if (raw && raw.trim()) {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [k, g] of Object.entries(obj)) {
          if (!g || !giaHopLe(g.vaoUsdMoiTrieu) || !giaHopLe(g.raUsdMoiTrieu)) continue;
          const i = k.indexOf('/');
          if (i <= 0) continue;
          const khoa = `${k.slice(0, i)}/${chuanModel(k.slice(i + 1))}`;
          bang[khoa] = { vaoUsdMoiTrieu: g.vaoUsdMoiTrieu, raUsdMoiTrieu: g.raUsdMoiTrieu, nguonGia: 'ENV' };
        }
      }
    } catch {
      console.warn('[llm-cost] LLM_PRICE_TABLE không phải JSON hợp lệ — dùng bảng giá mặc định');
    }
  }
  envCache = { raw, bang };
  return bang;
}

/** Giá của một (provider, model), hoặc null khi không biết. */
function giaCua(provider, model) {
  const p = String(provider ?? '').trim();
  const m = chuanModel(model);
  if (!p) return null;
  const khoa = `${p}/${m}`;
  const env = bangEnv();
  if (env[khoa]) return env[khoa];
  if (BANG_GIA_MAC_DINH[khoa]) return BANG_GIA_MAC_DINH[khoa];
  if (env[`${p}/*`]) return env[`${p}/*`];
  if (BANG_GIA_MAC_DINH[`${p}/*`]) return BANG_GIA_MAC_DINH[`${p}/*`];
  if (/:free$/i.test(m)) return MIEN_PHI; // mẫu ":free" của OpenRouter
  return null;
}

const tokenHopLe = (n) => Number.isInteger(n) && n >= 0;

/** entry usage → USD, hoặc null (thiếu token / không có giá). */
function tinhUsd(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!tokenHopLe(entry.inputTokens) || !tokenHopLe(entry.outputTokens)) return null;
  const g = giaCua(entry.provider, entry.model);
  if (!g) return null;
  return (entry.inputTokens * g.vaoUsdMoiTrieu + entry.outputTokens * g.raUsdMoiTrieu) / 1_000_000;
}

module.exports = { BANG_GIA_MAC_DINH, giaCua, tinhUsd, chuanModel };
