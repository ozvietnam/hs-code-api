// lib/public-llm-meter.js — đếm chi phí LLM của lượt CÔNG KHAI (L0j, #547).
//
// CEO 29/10/2026: suggest / describe / classify / match giữ mở, KHÔNG trần tiền — chỉ ĐẾM và BÁO.
// HS_PUBLIC_LLM=false vẫn là công tắc đóng khẩn (lib/public-llm.js), bộ đếm không chặn gì.
//
// Chỉ bọc nhánh KHÔNG có khoá dịch vụ (lượt khoá dịch vụ đã trả `usage` cho Cổng/ERP tính phí). Người gọi dùng
// HS_API_TOKEN cũng đi nhánh này → ghi `nguoiGoi: 'HS_API_TOKEN'` để tách khỏi khách công khai thật.
//
// Mỗi lượt ghi MỘT dòng vào dataPath('llm-cost-public.jsonl') (volume /data trên prod) với KHOÁ CỐ ĐỊNH (KHOA_DONG):
// không có trường nào chứa đầu vào, đầu ra hay thông điệp lỗi — chỉ số, tên nhà cung cấp/mẫu, endpoint.
// Lỗi ghi đĩa không bao giờ làm hỏng lượt. Đọc tổng hợp: GET /api/admin/llm-cost (resource kín `llm_cost`).

const fs = require('fs');
const crypto = require('crypto');
const { withUsage } = require('./usage-context');
const { tinhUsd, giaCua } = require('./llm-cost');
const { dataPath, dataReadPath } = require('./data-paths');
const { getBearerToken } = require('./auth');

const TEN_TEP = 'llm-cost-public.jsonl';
const KHOA_DONG = Object.freeze(['ts', 'endpoint', 'nguoiGoi', 'soLoiGoi', 'nhaCungCap', 'usdTong', 'usdUocLuong', 'khongRoGia', 'loi', 'ms']);
const ENDPOINT_HOP_LE = new Set(['suggest', 'describe', 'classify', 'match']);

function bangNhau(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** 'HS_API_TOKEN' khi Bearer khớp HS_API_TOKEN; còn lại (không token, token sai/placeholder) = 'CONG_KHAI'. */
function loaiNguoiGoi(req) {
  const token = req ? getBearerToken(req) : null;
  const ky = process.env.HS_API_TOKEN;
  return token && ky && bangNhau(token, ky) ? 'HS_API_TOKEN' : 'CONG_KHAI';
}

const lam = (x) => Math.round(x * 1e8) / 1e8;

function dungDong(endpoint, usage, { nguoiGoi, loi, ms }) {
  let usdTong = 0;
  let usdUocLuong = 0;
  let khongRoGia = 0;
  const nhaCungCap = (usage || []).map((u) => {
    const usd = tinhUsd(u);
    if (usd === null) khongRoGia += 1;
    else {
      usdTong += usd;
      if (giaCua(u.provider, u.model)?.nguonGia === 'UOC_LUONG') usdUocLuong += usd;
    }
    return { provider: u.provider, model: u.model, inputTokens: u.inputTokens, outputTokens: u.outputTokens, usd: usd === null ? null : lam(usd) };
  });
  return {
    ts: new Date().toISOString(),
    endpoint: ENDPOINT_HOP_LE.has(endpoint) ? endpoint : 'khac',
    nguoiGoi,
    soLoiGoi: nhaCungCap.length,
    nhaCungCap,
    usdTong: lam(usdTong),
    usdUocLuong: lam(usdUocLuong),
    khongRoGia,
    loi: Boolean(loi),
    ms,
  };
}

function ghiDong(dong) {
  try {
    fs.appendFileSync(dataPath(TEN_TEP), `${JSON.stringify(dong)}\n`);
  } catch (e) {
    console.warn(`[public-llm-meter] không ghi được nhật ký chi phí: ${e && e.code ? e.code : 'LOI'}`);
  }
}

/**
 * Chạy fn trong ngữ cảnh usage, ghi một dòng chi phí rồi trả kết quả của fn (fn ném lỗi → vẫn ghi, rồi ném lại).
 * @param {'suggest'|'describe'|'classify'|'match'} endpoint
 * @param {() => any} fn
 * @param {{ req?: object }} [opts]
 */
async function demLuotCongKhai(endpoint, fn, { req } = {}) {
  const t0 = Date.now();
  const nguoiGoi = loaiNguoiGoi(req);
  let usage = [];
  try {
    const { result, usage: u } = await withUsage(fn);
    usage = u;
    ghiDong(dungDong(endpoint, usage, { nguoiGoi, loi: false, ms: Date.now() - t0 }));
    return result;
  } catch (e) {
    usage = Array.isArray(e?.usage) ? e.usage : [];
    ghiDong(dungDong(endpoint, usage, { nguoiGoi, loi: true, ms: Date.now() - t0 }));
    throw e;
  }
}

// ── Tổng hợp theo ngày (giờ Việt Nam, UTC+7, không có giờ mùa hè) cho GET /api/admin/llm-cost ──
const LECH_VN_MS = 7 * 3600 * 1000;
const ngayVn = (ms) => new Date(ms + LECH_VN_MS).toISOString().slice(0, 10);
const homNayVn = () => ngayVn(Date.now());

function cong(bang, khoa, them) {
  const o = bang[khoa] || (bang[khoa] = {});
  for (const [k, v] of Object.entries(them)) o[k] = (o[k] || 0) + v;
}

/** → { ngay, muiGio, soLuot, soLuotLoi, soLoiGoi, usdTong, usdUocLuong, khongRoGia, theoEndpoint, theoNhaCungCap, theoNguoiGoi, dongHong, ghiChu } */
function tongHopNgay(ngay = homNayVn()) {
  const kq = {
    ngay,
    muiGio: 'Asia/Ho_Chi_Minh',
    soLuot: 0,
    soLuotLoi: 0,
    soLoiGoi: 0,
    usdTong: 0,
    usdUocLuong: 0,
    khongRoGia: 0,
    theoEndpoint: {},
    theoNhaCungCap: {},
    theoNguoiGoi: {},
    dongHong: 0,
    ghiChu: 'Chỉ lượt KHÔNG dùng khoá dịch vụ (công khai + HS_API_TOKEN). USD theo bảng giá lib/llm-cost.js (ghi đè: LLM_PRICE_TABLE); usdUocLuong = phần tính bằng giá ước lượng; khongRoGia = số lượt gọi nhà cung cấp chưa có giá hoặc không trả token. Chưa gồm phí công cụ tìm web z.ai và giảm giá cache.',
  };
  let raw = '';
  try { raw = fs.readFileSync(dataReadPath(TEN_TEP), 'utf8'); } catch { return kq; }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let d;
    try { d = JSON.parse(line); } catch { kq.dongHong += 1; continue; }
    const ms = Date.parse(d && d.ts);
    if (!Number.isFinite(ms)) { kq.dongHong += 1; continue; }
    if (ngayVn(ms) !== ngay) continue;
    const usd = Number(d.usdTong) || 0;
    kq.soLuot += 1;
    if (d.loi) kq.soLuotLoi += 1;
    kq.soLoiGoi += Number(d.soLoiGoi) || 0;
    kq.usdTong += usd;
    kq.usdUocLuong += Number(d.usdUocLuong) || 0;
    kq.khongRoGia += Number(d.khongRoGia) || 0;
    cong(kq.theoEndpoint, String(d.endpoint || 'khac'), { soLuot: 1, soLoiGoi: Number(d.soLoiGoi) || 0, usd });
    cong(kq.theoNguoiGoi, String(d.nguoiGoi || 'CONG_KHAI'), { soLuot: 1, usd });
    for (const n of Array.isArray(d.nhaCungCap) ? d.nhaCungCap : []) {
      cong(kq.theoNhaCungCap, `${n.provider}/${n.model}`, {
        soLoiGoi: 1,
        inputTokens: Number.isInteger(n.inputTokens) && n.inputTokens > 0 ? n.inputTokens : 0,
        outputTokens: Number.isInteger(n.outputTokens) && n.outputTokens > 0 ? n.outputTokens : 0,
        usd: typeof n.usd === 'number' ? n.usd : 0,
        khongRoGia: typeof n.usd === 'number' ? 0 : 1,
      });
    }
  }
  kq.usdTong = lam(kq.usdTong);
  kq.usdUocLuong = lam(kq.usdUocLuong);
  for (const bang of [kq.theoEndpoint, kq.theoNguoiGoi, kq.theoNhaCungCap]) {
    for (const o of Object.values(bang)) if (typeof o.usd === 'number') o.usd = lam(o.usd);
  }
  return kq;
}

module.exports = { demLuotCongKhai, loaiNguoiGoi, tongHopNgay, homNayVn, KHOA_DONG, TEN_TEP };
