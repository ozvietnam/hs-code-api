#!/usr/bin/env node
// scripts/ho-so-ma/soi-chong.mjs — [ĐÃ BÃI BỎ VAI TRÒ NGƯỜI CHẤM M-81 THEO ADR-0010 MỤC 6]
// Mô hình cục bộ yếu hơn (gemma4:31b) không chấm mô hình mạnh hơn; nghiệm thu M-81 chỉ đi qua cổng máy tất định 6–14.
// Giữ mô-đun này để bảo toàn tương thích kiểm thử hồi quy; không gọi trong quy trình cuốn chiếu M-81.
// Soi 3 mục hẹp trên bảng anh em + gói đọc trọn nhóm 4 số:
//   (1) chong        : cặp anh em có tên cùng thoả trên một mặt hàng thực tế (chưa có GIAI_CHONG, không dính "Loại khác" thuần).
//   (2) ho           : mặt hàng thực tế thuộc phạm vi nút cha nhưng không thoả dòng anh em nào.
//   (3) saiPhamViVe0 : điều kiện chung ve: 0 + phu: true trên nút cha loại nhầm hàng của vế khác hoặc dòng con/cháu bên dưới.
// Tuyệt đối không đọc dữ liệu khách, không đọc tb:/wco:, không tự chuyển sang Claude khi thiếu SOI_URL hoặc khi máy GPU tắt.
//
//   SOI_URL=http://127.0.0.1:11434 node scripts/ho-so-ma/soi-chong.mjs --nhom 8543 [--model gemma4:31b] [--ghi-vung-chong <tep.jsonl>] [--ra <tep.json>]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, chuanSo } from './cong.mjs';
import { kiemKhoHoSo } from './khuon.mjs';
import {
  napBieuMeta,
  laLoaiKhacThuan,
  taoBanDoTruAnhEm,
  haiNutRoiNhau,
  layTapDuHopLeTheoTruc,
  chiaVeDieuKien,
  moRongCayCon,
  taoBangChoCha,
} from './bang-anh-em.mjs';
import {
  chuanNhom4,
  dungGoiNhom,
  DEFAULT_CANH_TRANH_MD,
} from './goi-nhom.mjs';
import { timTrichNguyenVan } from './tach-dieu-kien.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

export const MO_HINH_SOI_MAC_DINH = 'gemma4:31b';
export const TIMEOUT_SOI_MAC_DINH_MS = 120_000;
export const SO_LAN_THU_LAI_MAC_DINH = 2;
export const NGHI_GIUA_LAN_MAC_DINH_MS = 1000;

export const HE_SOI_CHONG = `Bạn là NGƯỜI SOI độc lập trong dây chuyền số hoá luật phân loại HS Việt Nam (ADR-0008).
Người soạn đã tách điều kiện nguyên tử (DIEU_KIEN) cho nút cha và các dòng anh em cùng cấp của biểu thuế. Nhiệm vụ của bạn HẸP: chỉ soi trên câu luật gốc [idCau] và điều kiện đã soạn trong gói dưới đây, TUYỆT ĐỐI KHÔNG soạn lại điều kiện, không dùng kiến thức ngoài gói luật, không suy diễn tiền lệ.

Chỉ tìm đúng 3 mục sau (chỉ nêu khi có mặt hàng thực tế cụ thể và câu luật trong gói chứng minh):
(1) chong: Cặp anh em có tên [a, b] trực tiếp dưới nút cha mà một mặt hàng cụ thể có thật thuộc phạm vi nút cha thoả mãn ĐỒNG THỜI điều kiện đã soạn của cả a và b, kèm trích dẫn câu luật trong gói (nguon: id câu luật, trich: đoạn chữ nguyên văn trong câu nguon) và giải thích lyDo thiếu điều kiện tách gì. KHÔNG nêu dòng "Loại khác" thuần (phần bù theo Quy tắc 6). KHÔNG nêu cặp đã có GIAI_CHONG hoặc cặp đã phủ định trực tiếp / rời nhau rõ.
(2) ho: Chỗ hở phủ — mặt hàng cụ thể có thật thuộc phạm vi câu luật của nút cha nhưng KHÔNG thoả mãn dòng anh em nào đã soạn (nhất là bảng không có dòng "Loại khác" thuần, hoặc khi điều kiện dòng con thu hẹp quá mức câu luật gốc), kèm nguon và trich nguyên văn câu luật.
(3) saiPhamViVe0: Xét các điều kiện chung ve: 0 và phu: true trên nút cha đang soi — chỉ ra điều kiện ve: 0 + phu: true nào có thể loại nhầm mặt hàng mà một vế khác của nút đó hoặc một dòng biểu con/cháu bên dưới ghi đích danh, kèm idDieuKien, nutConBiLoai, matHang, lyDo, nguon và trich nguyên văn câu luật của dòng con hoặc vế bị loại nhầm.

Mục nào không phát hiện lỗi thì trả mảng rỗng [].
Trả về DUY NHẤT một đối tượng JSON hợp lệ theo mẫu:
{"chong":[{"a":"bieu:...","b":"bieu:...","matHang":"...","lyDo":"...","nguon":"...","trich":"..."}],"ho":[{"matHang":"...","lyDo":"...","nguon":"...","trich":"..."}],"saiPhamViVe0":[{"idDieuKien":"hs:bieu:...","nutConBiLoai":"bieu:...","matHang":"...","lyDo":"...","nguon":"...","trich":"..."}]}`;

function taoLoiSoi(code, message, phu = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, phu);
  return err;
}

/** Chuẩn hoá URL cổng soi thành `{ url, endpoint, kieu: 'ollama' | 'openai' }` và chặn anthropic.com. */
export function chuanUrlSoi(rawUrl) {
  const u = String(rawUrl ?? '').trim();
  if (!u) {
    throw taoLoiSoi(
      'SOI_THIEU_URL',
      'Thiếu biến môi trường SOI_URL (cổng Ollama máy GPU nhà cho gemma4:31b) — dừng, tuyệt đối không tự chuyển sang Claude',
    );
  }
  if (/anthropic\.com/i.test(u)) {
    throw taoLoiSoi(
      'SOI_CAM_CLAUDE',
      'Khâu soi ADR-0008 cấm dùng mô hình Claude — chỉ dùng mô hình hãng khác qua SOI_URL / SOI_MODEL',
    );
  }
  const base = u.replace(/\/+$/, '');
  let endpoint;
  let kieu;
  if (/\/chat\/completions$/i.test(base)) {
    endpoint = base;
    kieu = 'openai';
  } else if (/\/v1$/i.test(base)) {
    endpoint = `${base}/chat/completions`;
    kieu = 'openai';
  } else if (/\/api\/chat$/i.test(base)) {
    endpoint = base;
    kieu = 'ollama';
  } else if (/\/api$/i.test(base)) {
    endpoint = `${base}/chat`;
    kieu = 'ollama';
  } else {
    endpoint = `${base}/api/chat`;
    kieu = 'ollama';
  }

  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw taoLoiSoi('SOI_URL_LOI', `SOI_URL không hợp lệ ("${u}") — dừng, tuyệt đối không tự chuyển sang Claude`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw taoLoiSoi('SOI_URL_LOI', `SOI_URL phải dùng giao thức http/https ("${u}") — dừng, tuyệt đối không tự chuyển sang Claude`);
  }
  if (/anthropic\.com$/i.test(parsed.hostname)) {
    throw taoLoiSoi(
      'SOI_CAM_CLAUDE',
      'Khâu soi ADR-0008 cấm dùng mô hình Claude — chỉ dùng mô hình hãng khác qua SOI_URL / SOI_MODEL',
    );
  }
  return { url: base, endpoint, kieu };
}

/**
 * Đọc cấu hình mô hình soi độc lập.
 * Tuyệt đối KHÔNG đọc ANTHROPIC_API_KEY, CLAUDE_API_KEY, OPENAI_API_KEY, OPENAI_BASE_URL, LLM_BASE_URL để fallback.
 */
export function docCauHinhSoi(opts = {}, env = process.env) {
  const envSafe = env && typeof env === 'object' ? env : {};
  const rawUrl = String(opts.url ?? envSafe.SOI_URL ?? envSafe.OLLAMA_URL ?? '').trim();
  const rawModel = gon(opts.model ?? envSafe.SOI_MODEL ?? MO_HINH_SOI_MAC_DINH) || MO_HINH_SOI_MAC_DINH;

  if (/claude/i.test(rawModel) || /anthropic\.com/i.test(rawUrl)) {
    throw taoLoiSoi(
      'SOI_CAM_CLAUDE',
      'Khâu soi ADR-0008 cấm dùng mô hình Claude — chỉ dùng mô hình hãng khác qua SOI_URL / SOI_MODEL',
    );
  }
  if (opts.apiKeyEnv && /anthropic|claude/i.test(String(opts.apiKeyEnv))) {
    throw taoLoiSoi(
      'SOI_CAM_CLAUDE',
      'Khâu soi ADR-0008 cấm dùng mô hình Claude — chỉ dùng mô hình hãng khác qua SOI_URL / SOI_MODEL',
    );
  }

  const { url, endpoint, kieu } = chuanUrlSoi(rawUrl);

  const apiKey = String(
    opts.apiKey
    ?? (opts.apiKeyEnv ? envSafe[opts.apiKeyEnv] : undefined)
    ?? envSafe.SOI_API_KEY
    ?? '',
  ).trim();

  const timeoutRaw = opts.timeoutMs ?? (envSafe.SOI_TIMEOUT_MS !== undefined ? Number(envSafe.SOI_TIMEOUT_MS) : TIMEOUT_SOI_MAC_DINH_MS);
  const timeoutMs = Number.isFinite(Number(timeoutRaw)) && Number(timeoutRaw) > 0
    ? Number(timeoutRaw)
    : TIMEOUT_SOI_MAC_DINH_MS;

  const thuLaiRaw = opts.soLanThuLai ?? (envSafe.SOI_THU_LAI !== undefined ? Number(envSafe.SOI_THU_LAI) : SO_LAN_THU_LAI_MAC_DINH);
  const soLanThuLai = Number.isInteger(Number(thuLaiRaw)) && Number(thuLaiRaw) >= 0
    ? Number(thuLaiRaw)
    : SO_LAN_THU_LAI_MAC_DINH;

  const nghiRaw = opts.nghiGiuaLanMs ?? NGHI_GIUA_LAN_MAC_DINH_MS;
  const nghiGiuaLanMs = Number.isFinite(Number(nghiRaw)) && Number(nghiRaw) >= 0
    ? Number(nghiRaw)
    : NGHI_GIUA_LAN_MAC_DINH_MS;

  return {
    url,
    endpoint,
    kieu,
    model: rawModel,
    apiKey,
    timeoutMs,
    soLanThuLai,
    nghiGiuaLanMs,
  };
}

function laLoiHetGio(err) {
  if (!err) return false;
  const name = String(err.name || '');
  const causeName = String(err.cause?.name || '');
  const code = String(err.code || err.cause?.code || '');
  const msg = String(err.message || '');
  return (
    name === 'TimeoutError'
    || name === 'AbortError'
    || causeName === 'TimeoutError'
    || causeName === 'AbortError'
    || code === 'ABORT_ERR'
    || code === 'ETIMEDOUT'
    || code === 'UND_ERR_CONNECT_TIMEOUT'
    || code === 'UND_ERR_HEADERS_TIMEOUT'
    || code === 'UND_ERR_BODY_TIMEOUT'
    || /timed?\s*out|timeout|aborted/i.test(msg)
  );
}

function bócChuoiJsonSoi(rawContent) {
  const trimmed = String(rawContent ?? '').trim();
  if (!trimmed) {
    throw taoLoiSoi('SOI_TRA_RONG', 'Mô hình soi trả về chuỗi rỗng');
  }
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  if (!candidate) {
    throw taoLoiSoi('SOI_TRA_RONG', 'Mô hình soi trả về khung rỗng');
  }
  let parsed;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    throw taoLoiSoi('SOI_JSON_LOI', `JSON phản hồi soi không parse được (${err.message})`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw taoLoiSoi('SOI_JSON_LOI', 'JSON phản hồi soi phải là object { chong, ho, saiPhamViVe0 }, không phải mảng hay kiểu nguyên thuỷ');
  }
  return parsed;
}

function thongDiepLoiCuoi(code, cfg, tongLan, chiTiet) {
  const moTa = {
    SOI_GPU_TAT: `Không kết nối được máy GPU / cổng soi tại ${cfg.endpoint} (model="${cfg.model}", đã thử ${tongLan} lần: ${chiTiet}) — dừng khâu soi, tuyệt đối không tự chuyển sang Claude`,
    SOI_HET_GIO: `Quá hạn giờ ${cfg.timeoutMs}ms khi gọi cổng soi ${cfg.endpoint} (model="${cfg.model}", đã thử ${tongLan} lần: ${chiTiet}) — dừng khâu soi, tuyệt đối không tự chuyển sang Claude`,
    SOI_HTTP_LOI: `Cổng soi ${cfg.endpoint} trả lỗi HTTP (model="${cfg.model}", đã thử ${tongLan} lần: ${chiTiet}) — dừng khâu soi, tuyệt đối không tự chuyển sang Claude`,
    SOI_TRA_RONG: `Mô hình soi "${cfg.model}" tại ${cfg.endpoint} trả về rỗng sau ${tongLan} lần thử (${chiTiet}) — dừng khâu soi, tuyệt đối không tự chuyển sang Claude`,
    SOI_JSON_LOI: `Mô hình soi "${cfg.model}" tại ${cfg.endpoint} trả JSON không hợp lệ sau ${tongLan} lần thử (${chiTiet}) — dừng khâu soi, tuyệt đối không tự chuyển sang Claude`,
  };
  return moTa[code] || `Khâu soi thất bại (${code}) tại ${cfg.endpoint} (model="${cfg.model}", đã thử ${tongLan} lần: ${chiTiet}) — dừng khâu soi, tuyệt đối không tự chuyển sang Claude`;
}

const doiMs = (ms) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

/**
 * Gọi mô hình soi độc lập (Ollama `/api/chat` hoặc OpenAI-compatible `/v1/chat/completions`)
 * kèm hạn giờ `AbortSignal.timeout(timeoutMs)` và thử lại `soLanThuLai` lần.
 * Tuyệt đối không fallback sang Claude.
 */
export async function goiMoHinhSoi(messages, opts = {}) {
  const cfg = opts.endpoint && opts.kieu && opts.model && opts.timeoutMs !== undefined && opts.soLanThuLai !== undefined
    ? opts
    : docCauHinhSoi(opts, opts.env || process.env);
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw taoLoiSoi('SOI_GPU_TAT', 'Môi trường Node thiếu hàm fetch — dừng khâu soi, tuyệt đối không tự chuyển sang Claude');
  }

  const headers = { 'content-type': 'application/json' };
  if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`;

  const temperature = opts.temperature ?? 0.1;
  const numCtx = opts.numCtx ?? 32768;
  const bodyObj = cfg.kieu === 'ollama'
    ? {
      model: cfg.model,
      stream: false,
      format: 'json',
      options: { num_ctx: numCtx, temperature },
      messages,
    }
    : {
      model: cfg.model,
      temperature,
      response_format: { type: 'json_object' },
      messages,
    };
  const bodyJson = JSON.stringify(bodyObj);

  const tongLan = cfg.soLanThuLai + 1;
  let maLoiCuoi = 'SOI_GPU_TAT';
  let chiTietCuoi = '';

  for (let lan = 1; lan <= tongLan; lan += 1) {
    try {
      let resp;
      try {
        resp = await fetchImpl(cfg.endpoint, {
          method: 'POST',
          headers,
          body: bodyJson,
          signal: AbortSignal.timeout(cfg.timeoutMs),
        });
      } catch (errMang) {
        if (laLoiHetGio(errMang)) {
          throw taoLoiSoi('SOI_HET_GIO', errMang.message || 'TimeoutError');
        }
        const causeCode = errMang?.cause?.code || errMang?.code || '';
        throw taoLoiSoi('SOI_GPU_TAT', `${causeCode ? `${causeCode}: ` : ''}${errMang.message || String(errMang)}`);
      }

      let rawBodyText = '';
      try {
        rawBodyText = await resp.text();
      } catch (errDoc) {
        if (laLoiHetGio(errDoc)) {
          throw taoLoiSoi('SOI_HET_GIO', errDoc.message || 'TimeoutError khi đọc body');
        }
        throw taoLoiSoi('SOI_GPU_TAT', errDoc.message || String(errDoc));
      }

      if (!resp.ok) {
        throw taoLoiSoi('SOI_HTTP_LOI', `HTTP ${resp.status} ${rawBodyText.replace(/\s+/g, ' ').trim().slice(0, 180)}`.trim());
      }

      if (!rawBodyText.trim()) {
        throw taoLoiSoi('SOI_TRA_RONG', 'HTTP 200 nhưng thân phản hồi rỗng');
      }

      let data;
      try {
        data = JSON.parse(rawBodyText);
      } catch (errJson) {
        throw taoLoiSoi('SOI_JSON_LOI', `Thân phản hồi HTTP không phải JSON (${errJson.message})`);
      }

      const content = cfg.kieu === 'ollama'
        ? data?.message?.content
        : data?.choices?.[0]?.message?.content;

      if (content === undefined || content === null) {
        throw taoLoiSoi('SOI_TRA_RONG', cfg.kieu === 'ollama' ? 'Thiếu message.content' : 'Thiếu choices[0].message.content');
      }
      if (typeof content === 'string') {
        const parsed = bócChuoiJsonSoi(content);
        return {
          parsed,
          rawText: content,
          soLanGoi: lan,
          model: cfg.model,
          endpoint: cfg.endpoint,
          kieu: cfg.kieu,
        };
      }
      if (typeof content === 'object' && !Array.isArray(content)) {
        return {
          parsed: content,
          rawText: JSON.stringify(content),
          soLanGoi: lan,
          model: cfg.model,
          endpoint: cfg.endpoint,
          kieu: cfg.kieu,
        };
      }
      throw taoLoiSoi('SOI_JSON_LOI', 'Nội dung message.content không phải chuỗi JSON hay object');
    } catch (err) {
      maLoiCuoi = err?.code && /^SOI_/.test(err.code) ? err.code : (laLoiHetGio(err) ? 'SOI_HET_GIO' : 'SOI_GPU_TAT');
      chiTietCuoi = String(err?.message || err);
      if (lan < tongLan) {
        await doiMs(cfg.nghiGiuaLanMs);
      }
    }
  }

  throw taoLoiSoi(
    maLoiCuoi,
    thongDiepLoiCuoi(maLoiCuoi, cfg, tongLan, chiTietCuoi),
    {
      endpoint: cfg.endpoint,
      model: cfg.model,
      soLanDaThu: tongLan,
      chiTiet: chiTietCuoi,
    },
  );
}

function dinhDangNguongNgan(ngRec) {
  const n = ngRec?.nguong;
  if (!n) return '';
  const dv = n.donVi ? ` ${n.donVi}` : '';
  const tu = n.tu !== null && n.tu !== undefined ? `${n.gomTu ? '>=' : '>'} ${n.tu}${dv}` : '';
  const den = n.den !== null && n.den !== undefined ? `${n.gomDen ? '<=' : '<'} ${n.den}${dv}` : '';
  return `${n.daiLuong}: ${[tu, den].filter(Boolean).join(' và ')}`.trim();
}

function moTaCongThucCot(cot, dkById, nguongById) {
  const ct = cot?.congThuc;
  if (!ct) return '  (không có công thức)';
  if (ct.loai === 'KHONG_HOP_VA_CHA') {
    return `  (Phần bù Quy tắc 6 — phủ định các anh em có tên: ${(ct.phuCua || []).join(', ') || 'không'})`;
  }
  const cacVe = ct.cacVe || [];
  if (!cacVe.length) return '  (chưa có điều kiện)';
  const dong = cacVe.map((v) => {
    const chuoiDk = (v.cacDieuKien || []).map((c) => {
      const full = dkById.get(c.id) || c;
      const q = gon(full.cauHoi || c.id);
      const chiTietKieu = [];
      chiTietKieu.push(`ve=${full.ve ?? v.ve}`);
      chiTietKieu.push(`kieu=${c.kieu || full.kieu || '?'}`);
      if (c.truc || full.truc) chiTietKieu.push(`truc="${c.truc || full.truc}"`);
      if (c.daTri || full.daTri) chiTietKieu.push('daTri=true');
      if (Array.isArray(c.tap || full.tap)) chiTietKieu.push(`tap=${JSON.stringify(c.tap || full.tap)}`);
      if ((c.kieu || full.kieu) === 'SO' && (c.nguong || full.nguong)) {
        const ngTxt = dinhDangNguongNgan(nguongById.get(c.nguong || full.nguong));
        if (ngTxt) chiTietKieu.push(ngTxt);
      }
      if (full.nguon) chiTietKieu.push(`nguon=${full.nguon}`);
      return `${c.phu ? 'KHÔNG' : 'CÓ'}[${c.id} (${chiTietKieu.join('; ')}): ${q}]`;
    }).join(' VÀ ');
    return `  - vế ${v.ve}: ${chuoiDk}`;
  });
  if (Array.isArray(ct.truAnhEm) && ct.truAnhEm.length) {
    dong.push(`  - [Đã trừ anh em đứng trước: ${ct.truAnhEm.join(', ')}]`);
  }
  return dong.join('\n');
}

function taoBanDoDkTuBangVaKho(bang, nguCanh = {}) {
  const dkById = new Map();
  const dkTheoNut = new Map();
  const themDk = (d) => {
    if (!d || !d.id) return;
    if (!dkById.has(d.id)) dkById.set(d.id, d);
    if (d.nut) {
      if (!dkTheoNut.has(d.nut)) dkTheoNut.set(d.nut, []);
      if (!dkTheoNut.get(d.nut).some((x) => x.id === d.id)) {
        dkTheoNut.get(d.nut).push(d);
      }
    }
  };

  if (nguCanh.dkById instanceof Map) {
    for (const d of nguCanh.dkById.values()) themDk(d);
  }
  if (nguCanh.dkTheoNut instanceof Map) {
    for (const ds of nguCanh.dkTheoNut.values()) for (const d of ds) themDk(d);
  }
  if (Array.isArray(nguCanh.dieuKien)) {
    for (const d of nguCanh.dieuKien) themDk(d);
  }
  if (Array.isArray(nguCanh.goi?.hoSoSanCo?.daCo?.dieuKien)) {
    for (const d of nguCanh.goi.hoSoSanCo.daCo.dieuKien) themDk(d);
  }

  // Dự phòng khi chỉ truyền đối tượng bang đơn lẻ mà không truyền dkTheoNut
  const cauHoiMap = new Map();
  for (const ae of bang?.anhEm || []) {
    for (const ch of ae?.cauHoiToiThieu || []) {
      if (ch?.id && !cauHoiMap.has(ch.id)) cauHoiMap.set(ch.id, ch);
    }
  }
  const boSungTuCot = (nutId, congThuc) => {
    if (congThuc?.loai !== 'HOAC_CUA_VA') return;
    for (const v of congThuc.cacVe || []) {
      for (const c of v.cacDieuKien || []) {
        if (dkById.has(c.id)) continue;
        const ch = cauHoiMap.get(c.id);
        themDk({
          id: c.id,
          nut: ch?.nut || nutId,
          loai: 'DIEU_KIEN',
          ve: v.ve ?? 1,
          phu: Boolean(c.phu),
          kieu: c.kieu || ch?.kieu || 'CO_KHONG',
          ...(c.truc !== undefined ? { truc: c.truc } : {}),
          ...(c.daTri !== undefined ? { daTri: c.daTri } : {}),
          ...(c.nguong !== undefined ? { nguong: c.nguong } : {}),
          ...(c.tap !== undefined ? { tap: c.tap } : {}),
          ...(c.tapDu !== undefined ? { tapDu: c.tapDu } : {}),
          ...(c.tapDuNguon !== undefined ? { tapDuNguon: c.tapDuNguon } : {}),
          ...(c.tapDuTrich !== undefined ? { tapDuTrich: c.tapDuTrich } : {}),
          cauHoi: ch?.cauHoi || c.id,
          nguon: ch?.nguon || '',
          trich: '',
        });
      }
    }
  };
  for (const cha of bang?.chuoiCha || []) boSungTuCot(cha.nut, cha.congThuc);
  for (const ae of bang?.anhEm || []) boSungTuCot(ae.nut, ae.congThuc);

  return { dkById, dkTheoNut };
}

/**
 * Dựng cặp `messages` `[system, user]` hẹp cho một bảng anh em `bang` (kèm gói câu luật `goi-nhom` và khối kiểm `ve: 0 + phu: true`).
 * Tuyệt đối không đưa `tb:` hay `wco:` vào lời hỏi.
 */
export function dungLoiHoiSoiBang(bang, nguCanh = {}) {
  const { L = null, goi = null, nguongById = new Map() } = nguCanh;
  const { dkById, dkTheoNut } = taoBanDoDkTuBangVaKho(bang, nguCanh);

  const tenCha = gon(L?.cay?.theoId?.get(bang.cha)?.ten || bang.tenCha || '');
  const coLoaiKhac = (bang.anhEm || []).some((a) => a.laLoaiKhac);
  const chuoiChaTen = (bang.chuoiCha || []).map((c) => c.nut).join(' > ');

  const dong = [];
  if (goi) {
    dong.push(`NHÓM 4 SỐ: ${goi.nhom} (${goi.nut}) — ${gon(goi.ten)}`);
  }
  dong.push(`NÚT CHA ĐANG SOI: ${bang.cha}${tenCha ? ` "${tenCha}"` : ''}`);
  if (chuoiChaTen) dong.push(`CHUỖI CHA: ${chuoiChaTen}`);
  if (bang.chiSoiVe0) {
    dong.push('CHẾ ĐỘ ĐƠN VỊ: Nút này có dưới 2 dòng con trực tiếp — trả "chong": [] và "ho": [], chỉ kiểm mục (3) "saiPhamViVe0".');
  } else {
    dong.push(`DÒNG "LOẠI KHÁC" THUẦN: ${coLoaiKhac ? 'CÓ (phần bù Quy tắc 6 — KHÔNG báo chồng với dòng Loại khác thuần)' : 'KHÔNG CÓ (cần kiểm kỹ chỗ HỞ phủ phạm vi cha)'}`);
  }

  dong.push('', 'ĐIỀU KIỆN ĐÃ SOẠN TRÊN CHUỖI CHA & NÚT CHA:');
  for (const buoc of bang.chuoiCha || []) {
    const tenB = gon(L?.cay?.theoId?.get(buoc.nut)?.ten || '');
    dong.push(`* ${buoc.nut}${tenB ? ` "${tenB}"` : ''}:`);
    dong.push(moTaCongThucCot(buoc, dkById, nguongById));
  }

  if (!bang.chiSoiVe0 && (bang.anhEm || []).length > 0) {
    dong.push('', 'CÁC DÒNG ANH EM TRỰC TIẾP DƯỚI NÚT CHA:');
    for (const ae of bang.anhEm) {
      dong.push(`* ${ae.nut} "${gon(ae.ten)}"${ae.laLoaiKhac ? ' [LOẠI KHÁC THUẦN — phần bù Quy tắc 6]' : ''}`);
      dong.push(moTaCongThucCot(ae, dkById, nguongById));
    }
  }

  if (Array.isArray(bang.giaiChong) && bang.giaiChong.length > 0) {
    dong.push('', 'CÁC CẶP ĐÃ CÓ GIAI_CHONG (KHÔNG BÁO LẠI TRONG chong):');
    for (const gc of bang.giaiChong) {
      dong.push(`- [${(gc.cap || []).join(', ')}] cach=${gc.cach} (${gc.nguon}: "${gon(gc.trich)}")`);
    }
  }

  // Khối kiểm riêng cho câu soi thứ hai của QT: điều kiện ve: 0 + phu: true trên nút cha đang xét
  const dsDkCha = dkTheoNut.get(bang.cha) || [];
  const dsVe0Phu = dsDkCha.filter((d) => d.ve === 0 && d.phu === true);
  const cayDuoiCha = L?.cay ? moRongCayCon([bang.cha], L) : new Set([bang.cha, ...(bang.anhEm || []).map((a) => a.nut)]);

  dong.push('', `KIỂM TRA SAI PHẠM VI ĐIỀU KIỆN CHUNG (ve: 0 + phu: true) TRÊN ${bang.cha}:`);
  if (!dsVe0Phu.length) {
    dong.push(`- Nút ${bang.cha} không có điều kiện ve: 0 + phu: true nào -> trả "saiPhamViVe0": [].`);
  } else {
    dong.push('- Các điều kiện ve: 0 + phu: true đang áp lên toàn bộ nút và mọi dòng con bên dưới:');
    for (const d of dsVe0Phu) {
      dong.push(`  + idDieuKien="${d.id}": KHÔNG[${gon(d.cauHoi)}] | nguon=${d.nguon || '?'} | trich="${gon(d.trich || '')}"`);
    }
    const dsVeKhac = dsDkCha.filter((d) => !(d.ve === 0 && d.phu === true));
    if (dsVeKhac.length) {
      dong.push(`- Các điều kiện / vế khác trên chính ${bang.cha}:`);
      for (const d of dsVeKhac) {
        dong.push(`  + [${d.id}] (ve=${d.ve}, phu=${d.phu}): ${gon(d.cauHoi)} | nguon=${d.nguon || '?'} | trich="${gon(d.trich || '')}"`);
      }
    }
    const nutConDeQuy = [...cayDuoiCha].filter((id) => id !== bang.cha).sort();
    if (nutConDeQuy.length) {
      dong.push(`- Toàn bộ dòng con/cháu đệ quy bên dưới ${bang.cha} (đối chiếu xem idDieuKien có loại nhầm hàng được ghi đích danh không):`);
      for (const cid of nutConDeQuy) {
        const tenCon = gon(L?.cay?.theoId?.get(cid)?.ten || '');
        dong.push(`  + [${cid}] ${tenCon}`);
      }
    }
  }

  // Tập câu luật gốc [idCau] không chứa tb: / wco:, phân 4 tầng ưu tiên để chuong:XX:kq:* không bao giờ chèn rớt nhom:*, pn:*, sen:* hay d.nguon:
  //   Tầng 1 (bắt buộc giữ 100%): mọi câu d.nguon / d.moNguon / d.tapDuNguon / gc.nguon đang hiển thị + mọi câu bieu:*, pn:*, sen:* của nutLienQuan.
  //   Tầng 2 (bắt buộc giữ 100%): toàn bộ câu chú giải nhóm/phân nhóm/SEN của chính nhóm 4 số (nhom:<nhom4>:*, pn:<nhom4>*, sen:<nhom4>*).
  //   Tầng 3: chú giải pháp lý Phần/Chương/Quy tắc (phan:*:cg:*, chuong:*:cg:*, chuong:*:cgpn:*, gir:*).
  //   Tầng 4: các câu khái quát / câu tham chiếu còn lại trong gói (chuong:*:kq:*...) trong dung lượng còn trống.
  const tang1Map = new Map();
  const tang2Map = new Map();
  const tang3Map = new Map();
  const tang4Map = new Map();
  const daCoId = new Set();

  const themVaoTang = (map, id, chu) => {
    if (!id || /^(?:tb|wco):/i.test(id) || daCoId.has(id)) return;
    const text = gon(chu);
    if (!text) return;
    daCoId.add(id);
    map.set(id, text);
  };

  const nutLienQuan = new Set([
    ...(bang.chuoiCha || []).map((c) => c.nut),
    bang.cha,
    ...(bang.anhEm || []).map((a) => a.nut),
    ...(dsVe0Phu.length ? [...cayDuoiCha] : []),
  ]);
  const nhom4Goc = goi?.nhom || (G.soBieu(bang.cha) || '').slice(0, 4);

  // Tầng 1a: câu dẫn chiếu trực tiếp bởi DIEU_KIEN / GIAI_CHONG đang hiển thị
  const traChu = (cid) => {
    if (!cid || /^(?:tb|wco):/i.test(cid)) return null;
    if (typeof L?.chuCau === 'function') {
      const c = L.chuCau(cid);
      if (c) return c;
    }
    const tuGoi = goi?.cauTrongGoi?.find((x) => x.id === cid);
    return tuGoi?.chu || null;
  };
  for (const d of dkById.values()) {
    if (!d || !nutLienQuan.has(d.nut)) continue;
    const dsRef = [
      d.nguon,
      ...(Array.isArray(d.moNguon) ? d.moNguon : (d.moNguon ? [d.moNguon] : [])),
      ...(Array.isArray(d.tapDuNguon) ? d.tapDuNguon : (d.tapDuNguon ? [d.tapDuNguon] : [])),
    ];
    for (const refId of dsRef) {
      const chu = traChu(refId);
      if (chu) themVaoTang(tang1Map, refId, chu);
    }
  }
  for (const gc of bang.giaiChong || []) {
    if (gc?.nguon) {
      const chu = traChu(gc.nguon);
      if (chu) themVaoTang(tang1Map, gc.nguon, chu);
    }
  }

  // Quét gói goi.cauTrongGoi (hoặc L.cau) phân vào Tầng 1b, 2, 3, 4
  const reNhomCuaGoi = nhom4Goc ? new RegExp(`^(?:nhom:${nhom4Goc}:|pn:${nhom4Goc}|sen:${nhom4Goc})`) : null;
  if (goi?.cauTrongGoi) {
    for (const c of goi.cauTrongGoi) {
      if (!c?.id || /^(?:tb|wco):/i.test(c.id)) continue;
      if (nutLienQuan.has(c.nut) && /^(?:bieu|pn|sen):/.test(c.id)) {
        themVaoTang(tang1Map, c.id, c.chu);
      } else if (reNhomCuaGoi && reNhomCuaGoi.test(c.id)) {
        themVaoTang(tang2Map, c.id, c.chu);
      } else if (/^(?:nhom|pn|sen):/.test(c.id)) {
        themVaoTang(tang3Map, c.id, c.chu);
      } else if (/^(?:gir:|(?:phan|chuong):[^#]*:(?:cg|cgpn):|(?:phan|chuong):[^:#]+#)/.test(c.id)) {
        themVaoTang(tang3Map, c.id, c.chu);
      } else if (nutLienQuan.has(c.nut) || /^(?:phan|chuong):/.test(c.id)) {
        themVaoTang(tang4Map, c.id, c.chu);
      }
    }
  } else if (L?.cau) {
    for (const [cid, meta] of L.cau.entries()) {
      if (/^(?:tb|wco):/i.test(cid)) continue;
      const chu = L.chuCau(cid);
      if (!chu) continue;
      if (nutLienQuan.has(meta.nut) || nutLienQuan.has(G.chuCuaCau(cid))) {
        themVaoTang(tang1Map, cid, chu);
      } else if (reNhomCuaGoi && reNhomCuaGoi.test(cid)) {
        themVaoTang(tang2Map, cid, chu);
      }
    }
  }

  const batBuocEntries = [...tang1Map.entries(), ...tang2Map.entries()];
  const phuEntries = [...tang3Map.entries(), ...tang4Map.entries()];
  const tranPhu = Math.max(0, 220 - batBuocEntries.length);
  const cauEntries = [...batBuocEntries, ...phuEntries.slice(0, Math.max(tranPhu, Math.min(tang3Map.size, 80)))];

  if (cauEntries.length > 0) {
    dong.push('', 'CÂU LUẬT GỐC TRONG GÓI (dùng đúng [idCau] và trích nguyên văn chữ câu dưới đây):');
    for (const [cid, chu] of cauEntries) {
      dong.push(`- [${cid}]: ${chu}`);
    }
  }

  return [
    { role: 'system', content: HE_SOI_CHONG },
    { role: 'user', content: dong.join('\n') },
  ];
}

function chuanMaNutBieu(raw, L = null) {
  const s = String(raw ?? '').replace(/[`"'[\]\s]/g, '').trim();
  if (!s) return '';
  if (/^(?:phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|gir:[1-6](?::[a-c])?)$/.test(s)) {
    return s;
  }
  const body = s.replace(/^bieu:/i, '');
  const [phanSo, ...hauTo] = body.split(':');
  const digits = phanSo.replace(/\./g, '');
  if (!/^\d{2,8}$/.test(digits)) return '';
  const nut = `bieu:${digits}${hauTo.length ? `:${hauTo.join(':')}` : ''}`;
  if (L?.cay?.theoId && !L.cay.theoId.has(nut)) {
    return nut;
  }
  return nut;
}

function kiemChungTrichLuat(nguonRaw, trichRaw, L) {
  const nguon = gon(nguonRaw || '');
  const trichGoc = gon(trichRaw || '');
  if (!nguon) return { nguon: '', trich: trichGoc, trichHopLe: false };
  if (/^(?:tb|wco):/i.test(nguon)) return { nguon, trich: trichGoc, trichHopLe: false, camNguon: true };
  if (typeof L?.chuCau !== 'function') {
    return { nguon, trich: trichGoc, trichHopLe: false };
  }
  const chu = L.chuCau(nguon);
  if (chu === null || chu === undefined || !trichGoc) {
    return { nguon, trich: trichGoc, trichHopLe: false };
  }
  const khop = timTrichNguyenVan(trichGoc, chu);
  if (khop) {
    return { nguon, trich: khop, trichHopLe: true };
  }
  if (chuanSo(chu).includes(chuanSo(trichGoc))) {
    return { nguon, trich: trichGoc, trichHopLe: true };
  }
  return { nguon, trich: trichGoc, trichHopLe: false };
}

/**
 * Hậu kiểm tất định kết quả soi của mô hình trên một bảng anh em `bang`.
 * - Lọc sạch lỗi THỪA kinh điển: dính "Loại khác" thuần, đã có GIAI_CHONG, đã trừ phần bù `truAnhEm`, không phải con trực tiếp, đã rời nhau tất định bằng máy, cấm tb:/wco:.
 * - Kiểm chứng `saiPhamViVe0`: `idDieuKien` phải có thật và mang `ve === 0 && phu === true` trên nút đang xét, `nutConBiLoai` thuộc cây con.
 * - Xuất `vungChongDeXuat` tương thích 100% với `cong.mjs --vung-chong`, `so-diem.mjs --vung-chong`, `goi-duyet.mjs --m81 --vung-chong`.
 */
export function hauKiemKetQuaSoiBang(rawKetQua, bang, nguCanh = {}) {
  const {
    L = null,
    bieuMeta = null,
    nguongById = new Map(),
    cayNhomSet = null,
    model = MO_HINH_SOI_MAC_DINH,
  } = nguCanh;
  const { dkById, dkTheoNut } = taoBanDoDkTuBangVaKho(bang, nguCanh);

  const boQua = [];
  const vungChongMap = new Map();
  const hoPhuMap = new Map();
  const saiVe0Map = new Map();

  const anhEmList = Array.isArray(bang?.anhEm) ? bang.anhEm : [];
  const anhEmByNut = new Map(anhEmList.map((ae, idx) => [ae.nut, { ae, idx }]));
  const conIds = anhEmList.map((ae) => ae.nut);
  const coLoaiKhac = anhEmList.some((ae) => Boolean(ae.laLoaiKhac) || laLoaiKhacThuan(ae.nut, L, bieuMeta));
  const giaiChongSet = new Set(
    (bang?.giaiChong || [])
      .filter((g) => Array.isArray(g?.cap) && g.cap.length === 2)
      .map((g) => [...g.cap].sort().join('|')),
  );

  const dksDuongCha = (bang?.chuoiCha || []).flatMap((buoc) => dkTheoNut.get(buoc.nut) || []);
  const tapDuTheoTruc = conIds.length >= 2
    ? layTapDuHopLeTheoTruc(conIds, dkTheoNut, dkTheoNut.get(bang.cha) || [], dksDuongCha, { L })
    : new Map();
  const truTheoNut = L?.cay && conIds.length >= 2
    ? taoBanDoTruAnhEm(bang.cha, conIds, L, bieuMeta, dkTheoNut, bang?.giaiChong || [], nguongById, { tapDuTheoTruc })
    : new Map();

  const nguonPhatHien = `soi-chong (${model})`;

  // ── 1. Hậu kiểm mảng `chong` ──
  const rawChong = Array.isArray(rawKetQua?.chong) ? rawKetQua.chong : [];
  for (const item of rawChong) {
    if (!item || typeof item !== 'object') {
      boQua.push({ loai: 'chong', nut: bang.cha, muc: item, lyDoBoQua: 'phần tử chong không phải object' });
      continue;
    }
    if (bang?.chiSoiVe0 || anhEmList.length < 2) {
      boQua.push({ loai: 'chong', nut: bang.cha, muc: item, lyDoBoQua: 'nút cha có dưới 2 anh em trực tiếp' });
      continue;
    }
    const nutA = chuanMaNutBieu(item.a, L);
    const nutB = chuanMaNutBieu(item.b, L);
    if (!nutA || !nutB || nutA === nutB) {
      boQua.push({ loai: 'chong', nut: bang.cha, muc: item, lyDoBoQua: 'thiếu mã a/b hoặc a trùng b' });
      continue;
    }
    const infoA = anhEmByNut.get(nutA);
    const infoB = anhEmByNut.get(nutB);
    if (!infoA || !infoB) {
      boQua.push({
        loai: 'chong',
        nut: bang.cha,
        cap: [nutA, nutB],
        lyDoBoQua: `cặp [${nutA}, ${nutB}] không phải anh em con trực tiếp của ${bang.cha}`,
      });
      continue;
    }
    if (infoA.ae.laLoaiKhac || infoB.ae.laLoaiKhac || laLoaiKhacThuan(nutA, L, bieuMeta) || laLoaiKhacThuan(nutB, L, bieuMeta)) {
      boQua.push({
        loai: 'chong',
        nut: bang.cha,
        cap: [nutA, nutB],
        lyDoBoQua: 'một trong hai dòng là "Loại khác" thuần (phần bù Quy tắc 6)',
      });
      continue;
    }
    const sortedPair = [nutA, nutB].sort().join('|');
    if (giaiChongSet.has(sortedPair)) {
      boQua.push({
        loai: 'chong',
        nut: bang.cha,
        cap: [nutA, nutB],
        lyDoBoQua: 'cặp anh em đã có GIAI_CHONG',
      });
      continue;
    }
    const daTruAnhEm = (infoA.ae?.congThuc?.truAnhEm || []).includes(nutB)
      || (infoB.ae?.congThuc?.truAnhEm || []).includes(nutA)
      || (truTheoNut.get(nutA) || []).includes(nutB)
      || (truTheoNut.get(nutB) || []).includes(nutA);
    if (daTruAnhEm) {
      boQua.push({
        loai: 'chong',
        nut: bang.cha,
        cap: [nutA, nutB],
        lyDoBoQua: 'cặp anh em đã loại trừ phần bù theo cấu trúc (truAnhEm)',
      });
      continue;
    }
    const dksA = dkTheoNut.get(nutA) || [];
    const dksB = dkTheoNut.get(nutB) || [];
    if (haiNutRoiNhau(dksA, dksB, nguongById, { tapDuTheoTruc, L })) {
      boQua.push({
        loai: 'chong',
        nut: bang.cha,
        cap: [nutA, nutB],
        lyDoBoQua: 'cặp anh em đã chứng minh rời nhau tất định bằng máy (haiNutRoiNhau)',
      });
      continue;
    }
    const matHang = gon(item.matHang || '');
    if (!matHang) {
      boQua.push({
        loai: 'chong',
        nut: bang.cha,
        cap: [nutA, nutB],
        lyDoBoQua: 'thiếu mặt hàng cụ thể (matHang)',
      });
      continue;
    }
    const kt = kiemChungTrichLuat(item.nguon, item.trich, L);
    if (kt.camNguon) {
      boQua.push({
        loai: 'chong',
        nut: bang.cha,
        cap: [nutA, nutB],
        lyDoBoQua: `cấm trích nguồn tiền lệ hoặc WCO (${kt.nguon})`,
      });
      continue;
    }
    const capXep = infoA.idx <= infoB.idx ? [nutA, nutB] : [nutB, nutA];
    const fullKey = `${bang.cha}|${sortedPair}`;
    const banGhi = {
      nut: bang.cha,
      cap: capXep,
      matHang,
      lyDo: gon(item.lyDo || ''),
      nguon: kt.nguon,
      trich: kt.trich,
      trichHopLe: Boolean(kt.trichHopLe),
      nguonPhatHien,
    };
    const cu = vungChongMap.get(fullKey);
    if (!cu || (!cu.trichHopLe && banGhi.trichHopLe)) {
      vungChongMap.set(fullKey, banGhi);
    }
  }

  // ── 2. Hậu kiểm mảng `ho` ──
  const rawHo = Array.isArray(rawKetQua?.ho) ? rawKetQua.ho : [];
  for (const item of rawHo) {
    if (!item || typeof item !== 'object') {
      boQua.push({ loai: 'ho', nut: bang.cha, muc: item, lyDoBoQua: 'phần tử ho không phải object' });
      continue;
    }
    if (bang?.chiSoiVe0 || anhEmList.length < 2) {
      boQua.push({ loai: 'ho', nut: bang.cha, muc: item, lyDoBoQua: 'nút cha có dưới 2 anh em trực tiếp' });
      continue;
    }
    const matHang = gon(item.matHang || '');
    if (!matHang) {
      boQua.push({ loai: 'ho', nut: bang.cha, muc: item, lyDoBoQua: 'thiếu mặt hàng cụ thể (matHang)' });
      continue;
    }
    const kt = kiemChungTrichLuat(item.nguon, item.trich, L);
    if (kt.camNguon) {
      boQua.push({ loai: 'ho', nut: bang.cha, muc: item, lyDoBoQua: `cấm trích nguồn tiền lệ hoặc WCO (${kt.nguon})` });
      continue;
    }
    const keyHo = `${bang.cha}|${matHang.toLowerCase()}`;
    const banGhiHo = {
      nut: bang.cha,
      coLoaiKhac,
      matHang,
      lyDo: gon(item.lyDo || ''),
      nguon: kt.nguon,
      trich: kt.trich,
      trichHopLe: Boolean(kt.trichHopLe),
      nguonPhatHien,
    };
    const cu = hoPhuMap.get(keyHo);
    if (!cu || (!cu.trichHopLe && banGhiHo.trichHopLe)) {
      hoPhuMap.set(keyHo, banGhiHo);
    }
  }

  // ── 3. Hậu kiểm mảng `saiPhamViVe0` (điều kiện ve: 0 + phu: true loại nhầm dòng con / vế khác) ──
  const cayDuoiChaSet = L?.cay
    ? moRongCayCon([bang.cha], L)
    : new Set([bang.cha, ...conIds, ...(cayNhomSet ? [...cayNhomSet] : [])]);
  const rawSaiVe0 = Array.isArray(rawKetQua?.saiPhamViVe0) ? rawKetQua.saiPhamViVe0 : [];
  for (const item of rawSaiVe0) {
    if (!item || typeof item !== 'object') {
      boQua.push({ loai: 'saiPhamViVe0', nut: bang.cha, muc: item, lyDoBoQua: 'phần tử saiPhamViVe0 không phải object' });
      continue;
    }
    const idDieuKien = gon(item.idDieuKien || '');
    const dk = dkById.get(idDieuKien);
    if (!dk || dk.nut !== bang.cha) {
      boQua.push({
        loai: 'saiPhamViVe0',
        nut: bang.cha,
        idDieuKien,
        lyDoBoQua: `idDieuKien "${idDieuKien}" không tồn tại trên nút đang xét ${bang.cha}`,
      });
      continue;
    }
    if (!(dk.ve === 0 && dk.phu === true)) {
      boQua.push({
        loai: 'saiPhamViVe0',
        nut: bang.cha,
        idDieuKien,
        lyDoBoQua: `idDieuKien "${idDieuKien}" không phải điều kiện ve: 0 + phu: true (nhận ve=${dk.ve}, phu=${dk.phu})`,
      });
      continue;
    }
    const nutConBiLoai = chuanMaNutBieu(item.nutConBiLoai, L);
    const thuocCayHopLe = Boolean(
      nutConBiLoai
      && cayDuoiChaSet.has(nutConBiLoai)
      && (!cayNhomSet || cayNhomSet.has(nutConBiLoai)),
    );
    if (!thuocCayHopLe) {
      boQua.push({
        loai: 'saiPhamViVe0',
        nut: bang.cha,
        idDieuKien,
        nutConBiLoai: nutConBiLoai || gon(item.nutConBiLoai || ''),
        lyDoBoQua: `nutConBiLoai "${nutConBiLoai || gon(item.nutConBiLoai || '')}" không thuộc cây của ${bang.cha}`,
      });
      continue;
    }
    const matHang = gon(item.matHang || '');
    if (!matHang) {
      boQua.push({
        loai: 'saiPhamViVe0',
        nut: bang.cha,
        idDieuKien,
        nutConBiLoai,
        lyDoBoQua: 'thiếu mặt hàng cụ thể (matHang)',
      });
      continue;
    }
    const kt = kiemChungTrichLuat(item.nguon, item.trich, L);
    if (kt.camNguon) {
      boQua.push({
        loai: 'saiPhamViVe0',
        nut: bang.cha,
        idDieuKien,
        nutConBiLoai,
        lyDoBoQua: `cấm trích nguồn tiền lệ hoặc WCO (${kt.nguon})`,
      });
      continue;
    }
    const keyVe0 = `${bang.cha}|${idDieuKien}|${nutConBiLoai}|${matHang.toLowerCase()}`;
    const banGhiVe0 = {
      nut: bang.cha,
      idDieuKien,
      nutConBiLoai,
      matHang,
      lyDo: gon(item.lyDo || ''),
      nguon: kt.nguon,
      trich: kt.trich,
      trichHopLe: Boolean(kt.trichHopLe),
      nguonPhatHien,
    };
    const cu = saiVe0Map.get(keyVe0);
    if (!cu || (!cu.trichHopLe && banGhiVe0.trichHopLe)) {
      saiVe0Map.set(keyVe0, banGhiVe0);
    }
  }

  return {
    vungChongDeXuat: [...vungChongMap.values()],
    hoPhuDeXuat: [...hoPhuMap.values()],
    saiPhamViVe0: [...saiVe0Map.values()],
    boQua,
  };
}

/** Soi một bảng anh em `bang` (gọi mô hình soi + hậu kiểm tất định). */
export async function soiBangAnhEm(bang, opts = {}) {
  const cfg = docCauHinhSoi(opts, opts.env || process.env);
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);

  const nguCanh = {
    L,
    bieuMeta,
    goi: opts.goi || null,
    dkTheoNut: opts.dkTheoNut || null,
    dkById: opts.dkById || null,
    dieuKien: opts.dieuKien || null,
    nguongById: opts.nguongById || new Map(),
    cayNhomSet: opts.cayNhomSet || null,
    model: cfg.model,
  };

  const messages = dungLoiHoiSoiBang(bang, nguCanh);
  const t0 = Date.now();
  const phanHoi = await goiMoHinhSoi(messages, {
    ...cfg,
    temperature: opts.temperature ?? 0.1,
    numCtx: opts.numCtx ?? 32768,
    fetchImpl: opts.fetchImpl,
  });
  const thoiGianMs = Date.now() - t0;
  const hauKiem = hauKiemKetQuaSoiBang(phanHoi.parsed, bang, nguCanh);

  return {
    cha: bang.cha,
    soAnhEm: (bang.anhEm || []).length,
    chiSoiVe0: Boolean(bang.chiSoiVe0),
    model: phanHoi.model,
    endpoint: phanHoi.endpoint,
    kieu: phanHoi.kieu,
    soLanGoi: phanHoi.soLanGoi,
    thoiGianMs,
    messages,
    raw: phanHoi.parsed,
    ...hauKiem,
  };
}

function taoDonViChiSoiVe0(nutId, L, duLieu) {
  const { bieuMeta = new Map(), dkTheoNut = new Map() } = duLieu;
  const duong = G.duongDiNut(nutId, L.cay) || [{ cap: G.capCuaNut(nutId), nut: nutId }];
  const chuoiCha = duong.map((buoc) => {
    const dks = dkTheoNut.get(buoc.nut) || [];
    const laLK = laLoaiKhacThuan(buoc.nut, L, bieuMeta);
    return {
      nut: buoc.nut,
      laLoaiKhac: laLK,
      congThuc: laLK
        ? { loai: 'KHONG_HOP_VA_CHA', phuCua: [], chuoiCha: [] }
        : chiaVeDieuKien(dks),
      dieuKienIds: dks.map((x) => x.id),
    };
  });
  const con = G.conCua(nutId, L.cay);
  const anhEm = con.map((cid) => {
    const dks = dkTheoNut.get(cid) || [];
    const laLK = laLoaiKhacThuan(cid, L, bieuMeta);
    return {
      nut: cid,
      ten: L.cay.theoId.get(cid)?.ten || bieuMeta.get(cid)?.nguyenVan || '',
      laLoaiKhac: laLK,
      congThuc: chiaVeDieuKien(dks),
      dieuKienIds: dks.map((x) => x.id),
      cauHoiToiThieu: [],
    };
  });
  return {
    khuon: 'soi-ve0@1',
    cha: nutId,
    chuong: G.chuongCuaNut(nutId) || '',
    chuoiCha,
    anhEm,
    giaiChong: [],
    co: [],
    chiSoiVe0: true,
  };
}

/** Ghi danh sách đề xuất `VUNG_CHONG` (hoặc bản ghi JSONL bất kỳ) ra tệp `.jsonl`. */
export function ghiVungChongJsonl(tep, dsVungChong = []) {
  const abs = path.resolve(tep);
  const ds = Array.isArray(dsVungChong) ? dsVungChong : [];
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const text = ds.length ? `${ds.map((x) => JSON.stringify(x)).join('\n')}\n` : '';
  fs.writeFileSync(abs, text, 'utf8');
  return { tep: abs, soDong: ds.length };
}

/**
 * Soi trọn một nhóm 4 số (`nhom4`) theo ADR-0008:
 * - Đọc bảng anh em từ `data/ho-so-ma/bang-anh-em/<ch>.jsonl` (hoặc dựng tươi bằng `taoBangChoCha` khi truyền `tuoi: true` / chưa có tệp).
 * - Kết hợp với gói `dungGoiNhom(nhom4)` và quét thêm mọi nút có `ve: 0 + phu: true` (kể cả nút có < 2 dòng con trực tiếp).
 */
export async function soiNhom4(nhom4HoacNut, opts = {}) {
  const cfg = docCauHinhSoi(opts, opts.env || process.env);
  const nhom4 = chuanNhom4(nhom4HoacNut);
  const chuong = nhom4.slice(0, 2);
  const nutGoc = `bieu:${nhom4}`;

  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);
  const kho = opts.kho || kiemKhoHoSo(hoSo);

  const goi = opts.goi || dungGoiNhom(nhom4, {
    luat,
    hoSo,
    L,
    bieuMeta,
    kho,
    canhTranhMd: opts.canhTranhMd ?? DEFAULT_CANH_TRANH_MD,
    maxBytes: Infinity,
  });

  const cayNhomSet = new Set(goi.cayBieu.map((n) => n.id));
  const dkTheoNut = new Map();
  const dkById = new Map();
  const giaiChongTheoCha = new Map();
  const canhTranhTheoNut = new Map();
  const nguongById = new Map();

  const nguonBanGhi = Array.isArray(opts.banGhiHoSo) ? opts.banGhiHoSo : (kho.banGhi || []);
  for (const x of nguonBanGhi) {
    if (!x || x._hong) continue;
    if (x.loai === 'NGUONG' && x.id) {
      nguongById.set(x.id, x);
    } else if (x.loai === 'DIEU_KIEN') {
      if (x.id) dkById.set(x.id, x);
      if (!dkTheoNut.has(x.nut)) dkTheoNut.set(x.nut, []);
      dkTheoNut.get(x.nut).push(x);
    } else if (x.loai === 'GIAI_CHONG') {
      if (!giaiChongTheoCha.has(x.nut)) giaiChongTheoCha.set(x.nut, []);
      giaiChongTheoCha.get(x.nut).push(x);
    } else if (x.loai === 'CANH_TRANH') {
      if (!canhTranhTheoNut.has(x.nut)) canhTranhTheoNut.set(x.nut, []);
      canhTranhTheoNut.get(x.nut).push(x);
    }
  }

  const duLieuBang = {
    bieuMeta,
    dkTheoNut,
    giaiChongTheoCha,
    canhTranhTheoNut,
    nguongById,
    viDu: [],
    vungChong: [],
  };

  let dsBang = [];
  if (!opts.tuoi && Array.isArray(kho.bangAnhEm) && kho.bangAnhEm.length > 0) {
    dsBang = kho.bangAnhEm.filter((b) => !b._hong && cayNhomSet.has(b.cha) && (b.anhEm || []).length >= 2);
  }
  if (!dsBang.length) {
    for (const n of goi.cayBieu) {
      if (G.conCua(n.id, L.cay).length >= 2) {
        dsBang.push(taoBangChoCha(n.id, L, duLieuBang));
      }
    }
  }

  // Bổ sung đơn vị soi riêng cho nút thuộc cây nhóm có điều kiện ve: 0 + phu: true nhưng có < 2 dòng con trực tiếp
  const daCoCha = new Set(dsBang.map((b) => b.cha));
  for (const n of goi.cayBieu) {
    if (daCoCha.has(n.id)) continue;
    const coVe0Phu = (dkTheoNut.get(n.id) || []).some((d) => d.ve === 0 && d.phu === true);
    if (coVe0Phu) {
      dsBang.push(taoDonViChiSoiVe0(n.id, L, duLieuBang));
      daCoCha.add(n.id);
    }
  }

  const ketQuaTheoBang = [];
  const vungChongTong = new Map();
  const hoPhuDeXuat = [];
  const saiPhamViVe0 = [];
  const boQua = [];

  for (const b of dsBang) {
    const kqBang = await soiBangAnhEm(b, {
      ...opts,
      ...cfg,
      luat,
      hoSo,
      L,
      bieuMeta,
      goi,
      dkTheoNut,
      dkById,
      nguongById,
      cayNhomSet,
    });
    ketQuaTheoBang.push(kqBang);

    for (const vc of kqBang.vungChongDeXuat) {
      const k = `${vc.nut}|${[...vc.cap].sort().join('|')}`;
      const cu = vungChongTong.get(k);
      if (!cu || (!cu.trichHopLe && vc.trichHopLe)) vungChongTong.set(k, vc);
    }
    hoPhuDeXuat.push(...kqBang.hoPhuDeXuat);
    saiPhamViVe0.push(...kqBang.saiPhamViVe0);
    boQua.push(...kqBang.boQua);
  }

  const vungChongDeXuat = [...vungChongTong.values()];

  if (opts.ghiVungChong) {
    ghiVungChongJsonl(opts.ghiVungChong, vungChongDeXuat);
  }
  if (opts.ghiSaiVe0) {
    ghiVungChongJsonl(opts.ghiSaiVe0, saiPhamViVe0);
  }

  const baoCao = {
    khuon: 'soi-chong@1',
    nhom: nhom4,
    nut: nutGoc,
    chuong,
    model: cfg.model,
    endpoint: cfg.endpoint,
    kieu: cfg.kieu,
    soBangDaSoi: ketQuaTheoBang.length,
    vungChongDeXuat,
    hoPhuDeXuat,
    saiPhamViVe0,
    boQua,
    ketQuaTheoBang: ketQuaTheoBang.map(({ messages: _m, ...rest }) => rest),
  };

  if (opts.ra) {
    const absRa = path.resolve(opts.ra);
    fs.mkdirSync(path.dirname(absRa), { recursive: true });
    fs.writeFileSync(absRa, `${JSON.stringify(baoCao, null, 2)}\n`, 'utf8');
  }

  return baoCao;
}

async function main() {
  const a = process.argv.slice(2);
  const lay = (k) => {
    const eq = a.find((x) => x.startsWith(`${k}=`));
    if (eq) return eq.slice(k.length + 1);
    const i = a.indexOf(k);
    return i >= 0 && a[i + 1] !== undefined ? a[i + 1] : null;
  };
  const coCo = new Set(['--tuoi', '--json']);
  const coGiaTri = new Set([
    '--nhom', '--url', '--model', '--api-key-env', '--timeout-ms',
    '--thu-lai', '--luat', '--ho-so', '--canh-tranh',
    '--ghi-vung-chong', '--ghi-sai-ve0', '--ra',
  ]);
  let nhomPos = null;
  for (let i = 0; i < a.length; i += 1) {
    const tok = a[i];
    if (coCo.has(tok) || tok.includes('=')) continue;
    if (coGiaTri.has(tok)) { i += 1; continue; }
    if (!tok.startsWith('-') && !nhomPos) nhomPos = tok;
  }

  const nhomArg = lay('--nhom') || nhomPos;
  if (!nhomArg) {
    console.error('Thiếu --nhom <4 số> (vd: SOI_URL=http://127.0.0.1:11434 node scripts/ho-so-ma/soi-chong.mjs --nhom 8543)');
    process.exit(2);
  }
  console.error('[ADR-0010 mục 6] Lưu ý: khâu soi bằng mô hình cục bộ đã bãi bỏ khỏi quy trình nghiệm thu M-81; chỉ dùng cổng máy tất định 6–14.');

  try {
    const baoCao = await soiNhom4(nhomArg, {
      url: lay('--url') ?? undefined,
      model: lay('--model') ?? undefined,
      apiKeyEnv: lay('--api-key-env') ?? undefined,
      timeoutMs: lay('--timeout-ms') !== null ? Number(lay('--timeout-ms')) : undefined,
      soLanThuLai: lay('--thu-lai') !== null ? Number(lay('--thu-lai')) : undefined,
      luat: lay('--luat') ? path.resolve(lay('--luat')) : undefined,
      hoSo: lay('--ho-so') ? path.resolve(lay('--ho-so')) : undefined,
      canhTranhMd: lay('--canh-tranh') ? path.resolve(lay('--canh-tranh')) : undefined,
      tuoi: a.includes('--tuoi'),
      ghiVungChong: lay('--ghi-vung-chong') ?? undefined,
      ghiSaiVe0: lay('--ghi-sai-ve0') ?? undefined,
      ra: lay('--ra') ?? undefined,
    });

    if (a.includes('--json')) {
      console.log(JSON.stringify(baoCao, null, 2));
    } else {
      console.log(
        `Soi nhóm ${baoCao.nhom} (${baoCao.model} @ ${baoCao.endpoint}): `
        + `${baoCao.soBangDaSoi} đơn vị, `
        + `vungChong=${baoCao.vungChongDeXuat.length}, `
        + `hoPhu=${baoCao.hoPhuDeXuat.length}, `
        + `saiPhamViVe0=${baoCao.saiPhamViVe0.length}, `
        + `boQua=${baoCao.boQua.length}`,
      );
      for (const vc of baoCao.vungChongDeXuat) {
        console.log(`  [CHỒNG] ${vc.nut}: ${vc.cap.join(' × ')} — ${vc.matHang} (${vc.nguon}, trichHopLe=${vc.trichHopLe})`);
      }
      for (const ho of baoCao.hoPhuDeXuat) {
        console.log(`  [HỞ] ${ho.nut}: ${ho.matHang} (${ho.nguon}, trichHopLe=${ho.trichHopLe})`);
      }
      for (const sv of baoCao.saiPhamViVe0) {
        console.log(`  [SAI_VE0] ${sv.nut} (${sv.idDieuKien} -> ${sv.nutConBiLoai}): ${sv.matHang} (${sv.nguon}, trichHopLe=${sv.trichHopLe})`);
      }
    }
  } catch (err) {
    console.error(`${err?.code ? `[${err.code}] ` : ''}${err?.message || String(err)}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
