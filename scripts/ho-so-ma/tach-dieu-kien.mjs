#!/usr/bin/env node
// scripts/ho-so-ma/tach-dieu-kien.mjs — M-81 (#2410, ADR-0007): tách điều kiện nguyên tử DIEU_KIEN qua cổng OpenAI-compatible.
// Chỉ gửi chữ luật công khai (không dữ liệu khách, không tiền lệ tb:, không khoá cứng hay IP nội bộ).
//   node scripts/ho-so-ma/tach-dieu-kien.mjs --nut bieu:85437040 --url <...> --model <...> [--out <tep.jsonl>]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, chuanSo, vanTay } from './cong.mjs';
import { kiemBanGhi, kiemKhoHoSo, KIEU_DIEU_KIEN, MO_DIEU_KIEN } from './khuon.mjs';
import { laLoaiKhacThuan, napBieuMeta } from './bang-anh-em.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

export const HUONG_DAN_TACH_DIEU_KIEN = `Bạn là chuyên gia số hoá luật phân loại HS thành điều kiện nguyên tử (khuôn ho-so-ma@1 / DIEU_KIEN, ADR-0007).
Chỉ đọc chữ luật công khai trong gói. Không bịa điều kiện, không dùng kiến thức ngoài hay dữ liệu khách.

Quy tắc tách:
- Mỗi điều kiện nguyên tử là MỘT đối tượng JSON trong mảng \`dieuKien\`.
- \`ve\` (số nguyên >= 0): dấu ";" hoặc "hoặc" giữa các nhánh thay thế => tạo \`ve\` tăng dần (1, 2, ...). Các điều kiện phải thoả đồng thời ("và") => dùng CÙNG \`ve\`. Đặt \`ve: 0\` cho điều kiện chung áp lên mọi vế (thường đi với \`phu: true\` cho "trừ..." ở cuối danh sách).
- \`phu\` (boolean): \`true\` khi điều kiện mang nghĩa phủ định ("trừ...", "không kể...", "không phải...").
- \`kieu\`:
  - \`CO_KHONG\`: thuộc tính có/không (không đặt \`nguong\`, \`tap\` hay \`truc\`).
  - \`SO\`: ngưỡng số, BẮT BUỘC trỏ \`nguong\` = id bản ghi NGUONG đã có trong danh sách M-74 nếu có (không lặp số, không đặt \`tap\` hay \`truc\` — trục lấy từ \`daiLuong\` của NGUONG).
  - \`GIA_TRI\`: chọn một tập giá trị nguyên văn (BẮT BUỘC kèm \`truc\`: tên trục nguyên văn 1 dòng, ví dụ "loại dòng điện", "chất liệu mặt ngoài", và \`tap\`: mảng chuỗi nguyên văn).
- \`mo\`: chọn một trong:
  - \`DINH_NGHIA_LUAT\`: có định nghĩa pháp lý trong chú giải (BẮT BUỘC kèm \`moNguon\`: id câu định nghĩa hoặc mảng id câu định nghĩa trong kho luật, không \`tb:\`).
  - \`NGUONG\`: có ngưỡng định lượng (không đặt \`moNguon\`).
  - \`MO_TA_HUONG_DAN\`: có mô tả chi tiết trong chú giải hướng dẫn (BẮT BUỘC kèm \`moNguon\`: id câu hướng dẫn, không \`tb:\`).
  - \`NGHIA_THUONG\`: chữ luật không có định nghĩa/ngưỡng ("vi sóng", "thiết kế đặc biệt", ..., không đặt \`moNguon\`).
- \`cauHoi\`: một câu hỏi Có/Không ngắn gọn (1 dòng, <= 300 ký tự) về món hàng.
- \`trich\`: chuỗi con NGUYÊN VĂN của câu \`nguon\`.
- \`nguon\`: đúng id câu nguồn có trong gói (ví dụ \`bieu:85437040#1\`).

Trả về DUY NHẤT JSON hợp lệ dạng:
{"dieuKien":[{"ve":1,"phu":false,"kieu":"CO_KHONG","mo":"NGHIA_THUONG","cauHoi":"...","trich":"...","nguon":"..."}]}`;

/** Tìm đoạn trích nguyên văn trong chữ câu (tương thích logic timTrich của tach-chung.mjs). */
export function timTrichNguyenVan(trich, chu) {
  const cs = chuanSo(chu);
  let t = chuanSo(String(trich || '').replace(/^["“'…\s.]+|["”'…\s]+$/g, ''));
  if (!t) return null;
  let i = cs.indexOf(t);
  if (i < 0) i = cs.toLowerCase().indexOf(t.toLowerCase());
  if (i < 0 && t.replace(/[.;:,]+$/, '') !== t) {
    t = t.replace(/[.;:,]+$/, '');
    i = cs.indexOf(t);
  }
  if (i < 0 && t.includes(cs)) return cs;
  if (i < 0) return null;
  return cs.slice(i, i + t.length);
}

/** Dựng gói chữ luật công khai cho một nút (tuyệt đối không nạp dữ liệu khách hay tiền lệ tb:). */
export function dungGoiTachDieuKien(nut, L, { nguongSanCo = [] } = {}) {
  const cauNut = [...L.cau.keys()]
    .filter((id) => G.chuCuaCau(id) === nut && !/^tb:/.test(id))
    .sort()
    .map((id) => ({ id, chu: gon(L.chuCau(id)), lop: L.nut.get(L.cau.get(id).nut)?.lop || 'LUAT' }));

  const duong = (G.duongDiNut(nut, L.cay) || []).slice(0, -1);
  const cauTren = [];
  for (const buoc of duong) {
    for (const id of L.cau.keys()) {
      if (G.chuCuaCau(id) === buoc.nut && !/^tb:/.test(id)) {
        cauTren.push({ id, nut: buoc.nut, chu: gon(L.chuCau(id)) });
      }
    }
  }
  const nguongLienQuan = nguongSanCo.filter(
    (g) => g.nut === nut || duong.some((b) => b.nut === g.nut),
  );
  return {
    nut,
    ten: gon(L.cay.theoId.get(nut)?.ten || L.nut.get(nut)?.v || ''),
    cauNut,
    cauTren: cauTren.slice(0, 24),
    nguongSanCo: nguongLienQuan.map((g) => ({ id: g.id, nut: g.nut, dieuKien: g.dieuKien, nguong: g.nguong })),
  };
}

/** Dựng cặp messages OpenAI-compatible để tách DIEU_KIEN cho một nút. */
export function dungLoiHoiTachDieuKien(goi) {
  const dong = [
    `NÚT: ${goi.nut}`,
    `TÊN NÚT: ${goi.ten}`,
    '',
    'CÂU LUẬT CỦA NÚT:',
    ...goi.cauNut.map((c) => `- [${c.id}] (${c.lop}): ${c.chu}`),
  ];
  if (goi.cauTren.length) {
    dong.push('', 'CÂU PHÍA TRÊN TRÊN ĐƯỜNG ĐI (tham chiếu nếu cần):');
    for (const c of goi.cauTren) dong.push(`- [${c.id}] (${c.nut}): ${c.chu}`);
  }
  if (goi.nguongSanCo.length) {
    dong.push('', 'NGUONG M-74 ĐÃ CÓ (nếu dùng kieu="SO", bắt buộc trỏ đúng id dưới đây, không lặp số):');
    for (const g of goi.nguongSanCo) dong.push(`- ${g.id}: ${g.dieuKien}`);
  }
  return [
    { role: 'system', content: HUONG_DAN_TACH_DIEU_KIEN },
    { role: 'user', content: dong.join('\n') },
  ];
}

function timKhoiJsonCanBang(s, startIdx) {
  const open = s[startIdx];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return s.slice(startIdx, i + 1);
    }
  }
  return null;
}

/** Tách mảng JSON dieuKien từ chuỗi trả về của LLM. */
export function rutJsonDieuKien(text) {
  const raw = String(text || '').trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const s = (fenced ? fenced[1] : raw).trim();
  let lastErr = null;
  let sawCandidate = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch !== '{' && ch !== '[') continue;
    sawCandidate = true;
    const block = timKhoiJsonCanBang(s, i);
    if (!block) continue;
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (err) {
      lastErr = err;
      continue;
    }
    if (Array.isArray(parsed)) {
      if (parsed.length === 0 || (parsed[0] && typeof parsed[0] === 'object' && !Array.isArray(parsed[0]))) {
        return parsed;
      }
      continue;
    }
    if (parsed && typeof parsed === 'object') {
      const list = parsed.dieuKien || parsed.kq;
      if (Array.isArray(list)) return list;
    }
  }
  if (!sawCandidate) throw new Error('Không tìm thấy JSON trong phản hồi mô hình');
  if (lastErr) throw lastErr;
  throw new Error('JSON thiếu mảng dieuKien');
}

/** Chuẩn hoá đề xuất thô từ LLM thành các bản ghi DIEU_KIEN hợp lệ theo khuôn.mjs. */
export function chuanHoaDieuKien(rawList, nut, L, { batDauSo = 8101, nguongSanCo = [], moHinh = null } = {}) {
  const banGhi = [];
  const loi = [];
  const nguongSet = new Set((nguongSanCo || []).map((g) => g.id));
  let stt = batDauSo;

  for (const item of rawList || []) {
    if (!item || typeof item !== 'object') { loi.push(`${nut}: phần tử không phải object`); continue; }
    const nguon = gon(item.nguon || item.cau || `${nut}#1`);
    if (/^tb:/.test(nguon)) { loi.push(`${nut}: từ chối nguồn tiền lệ ${nguon}`); continue; }
    const chu = L.chuCau(nguon);
    if (chu === null) { loi.push(`${nut}: nguon "${nguon}" không tồn tại trong kho luật`); continue; }
    const trich = timTrichNguyenVan(item.trich, chu);
    if (!trich) { loi.push(`${nut}: trich không nguyên văn câu ${nguon} ("${gon(item.trich).slice(0, 60)}")`); continue; }

    let ve = 1;
    if (item.ve === 0 || item.ve === '0') ve = 0;
    else if (Number.isInteger(item.ve) && item.ve >= 1) ve = item.ve;
    else {
      const parsedVe = Number.parseInt(item.ve, 10);
      if (Number.isInteger(parsedVe) && parsedVe >= 0) ve = parsedVe;
    }
    const phu = Boolean(item.phu);
    const kieu = KIEU_DIEU_KIEN.includes(item.kieu) ? item.kieu : 'CO_KHONG';
    const mo = MO_DIEU_KIEN.includes(item.mo) ? item.mo : (kieu === 'SO' ? 'NGUONG' : 'NGHIA_THUONG');
    const truc = kieu === 'GIA_TRI' && item.truc !== undefined ? gon(item.truc) : undefined;
    let moNguon;
    if ((mo === 'DINH_NGHIA_LUAT' || mo === 'MO_TA_HUONG_DAN') && item.moNguon !== undefined) {
      moNguon = Array.isArray(item.moNguon)
        ? item.moNguon.map(gon).filter(Boolean)
        : gon(item.moNguon);
    }
    const cauHoi = gon(item.cauHoi || item.dieuKien || '').slice(0, 300);
    if (!cauHoi) { loi.push(`${nut}: thiếu cauHoi cho trích "${trich.slice(0, 40)}"`); continue; }

    const rec = {
      id: `hs:${nut}:${stt}`,
      nut,
      loai: 'DIEU_KIEN',
      ve,
      phu,
      kieu,
      ...(truc !== undefined ? { truc } : {}),
      ...(kieu === 'SO' && item.nguong ? { nguong: gon(item.nguong) } : {}),
      ...(kieu === 'GIA_TRI' && Array.isArray(item.tap) ? { tap: item.tap.map(gon).filter(Boolean) } : {}),
      mo,
      ...(moNguon !== undefined ? { moNguon } : {}),
      cauHoi,
      trich,
      nguon,
      vanTay: vanTay(chu),
      ...(moHinh ? {
        phieu: [{
          mo: moHinh,
          trich,
          nguon,
          ve,
          phu,
          kieu,
          moDieuKien: mo,
          ...(truc !== undefined ? { truc } : {}),
          ...(moNguon !== undefined ? { moNguon } : {}),
        }],
      } : {}),
    };

    if (rec.kieu === 'SO' && nguongSet.size && !nguongSet.has(rec.nguong)) {
      loi.push(`${rec.id}: nguong "${rec.nguong}" không có trong danh mục M-74`);
      continue;
    }
    const err = kiemBanGhi(rec);
    if (err.length) {
      loi.push(...err);
      continue;
    }
    if (moNguon !== undefined) {
      const mnIds = Array.isArray(moNguon) ? moNguon : [moNguon];
      const thieuMn = mnIds.find((mnId) => L.chuCau(mnId) === null);
      if (thieuMn) {
        loi.push(`${rec.id}: moNguon "${thieuMn}" không tồn tại trong kho luật`);
        continue;
      }
    }
    stt += 1;
    banGhi.push(rec);
  }
  return { banGhi, loi };
}

/** Đọc cấu hình cổng OpenAI-compatible từ đối số hoặc biến môi trường chuẩn (không hardcoded secret/IP). */
export function docCauHinhEndpoint(opts = {}) {
  const urlRaw = opts.url || process.env.DIEU_KIEN_LLM_URL || process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || '';
  const model = opts.model || process.env.DIEU_KIEN_MODEL || process.env.OPENAI_MODEL || process.env.LLM_MODEL || '';
  const apiKey = opts.apiKey
    || (opts.apiKeyEnv ? process.env[opts.apiKeyEnv] : '')
    || process.env.DIEU_KIEN_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.LLM_API_KEY
    || '';
  return { url: String(urlRaw).trim(), model: String(model).trim(), apiKey: String(apiKey).trim() };
}

export function chuanEndpointChat(url) {
  const u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  return /\/chat\/completions$/i.test(u) ? u : `${u}/chat/completions`;
}

/** Gọi cổng OpenAI-compatible /chat/completions với fetchImpl có thể tiêm giả lập khi kiểm thử. */
export async function goiOpenAICompatible({
  url,
  model,
  apiKey = '',
  messages,
  temperature = 0,
  timeoutMs = 120000,
  fetchImpl = globalThis.fetch,
}) {
  const endpoint = chuanEndpointChat(url);
  if (!endpoint) throw new Error('Thiếu URL cổng OpenAI-compatible (truyền --url hoặc OPENAI_BASE_URL / LLM_BASE_URL)');
  if (!model) throw new Error('Thiếu tên model (truyền --model hoặc OPENAI_MODEL / LLM_MODEL)');
  if (typeof fetchImpl !== 'function') throw new Error('Thiếu fetch implementation');

  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const body = {
    model,
    temperature,
    messages,
    response_format: { type: 'json_object' },
  };
  const resp = await fetchImpl(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Phản hồi OpenAI-compatible thiếu choices[0].message.content');
  }
  return content;
}

/** Tách điều kiện nguyên tử cho một nút. */
export async function tachDieuKienNut(nut, L, opts = {}) {
  const nguongSanCo = opts.nguongSanCo || [];
  const goi = dungGoiTachDieuKien(nut, L, { nguongSanCo });
  const messages = dungLoiHoiTachDieuKien(goi);
  const cfg = docCauHinhEndpoint(opts);

  const rawText = opts.callModel
    ? await opts.callModel(messages, { nut, goi, model: cfg.model })
    : await goiOpenAICompatible({
      url: cfg.url,
      model: cfg.model,
      apiKey: cfg.apiKey,
      messages,
      temperature: opts.temperature ?? 0,
      timeoutMs: opts.timeoutMs ?? 120000,
      fetchImpl: opts.fetchImpl || globalThis.fetch,
    });

  const parsed = rutJsonDieuKien(rawText);
  return chuanHoaDieuKien(parsed, nut, L, {
    batDauSo: opts.batDauSo ?? 8101,
    nguongSanCo,
    moHinh: cfg.model || opts.moHinh || null,
  });
}

/** Tách điều kiện nguyên tử cho danh sách nút, giữ tuần tự tất định và tuỳ chọn ghi JSONL. */
export async function tachDanhSachNut(nuts, opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = napBieuMeta(luat);
  const kho = opts.nguongSanCo ? null : kiemKhoHoSo(hoSo);
  const nguongSanCo = opts.nguongSanCo || kho.banGhi.filter((x) => !x._hong && x.loai === 'NGUONG');

  const banGhi = [];
  const loi = [];
  for (const nut of nuts) {
    if (laLoaiKhacThuan(nut, L, bieuMeta)) continue;
    const r = await tachDieuKienNut(nut, L, { ...opts, nguongSanCo });
    banGhi.push(...r.banGhi);
    loi.push(...r.loi);
  }
  if (opts.out) {
    fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.out), `${banGhi.map((x) => JSON.stringify(x)).join('\n')}${banGhi.length ? '\n' : ''}`, 'utf8');
  }
  return { banGhi, loi };
}

async function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const ds = []; a.forEach((x, i) => { if (x === k && a[i + 1]) ds.push(a[i + 1]); }); return ds; };
  const luat = path.resolve(lay('--luat')[0] || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so')[0] || G.HO_SO_MAC_DINH);
  const L = napLuatCong(luat);
  const bieuMeta = napBieuMeta(luat);
  let nuts = [...lay('--nut')];
  if (lay('--ds-nut')[0]) nuts.push(...lay('--ds-nut')[0].split(',').map((s) => s.trim()).filter(Boolean));
  if (lay('--chuong')[0]) {
    const ch = String(lay('--chuong')[0]).padStart(2, '0');
    nuts.push(
      ...[...L.cay.theoId.keys()]
        .filter((id) => id.startsWith(`bieu:${ch}`) && !/^bieu:\d{2}$/.test(id) && !laLoaiKhacThuan(id, L, bieuMeta))
        .sort(),
    );
  }
  nuts = [...new Set(nuts)];
  if (!nuts.length) {
    console.error('Thiếu --nut <id>, --ds-nut <id1,id2> hoặc --chuong <NN>');
    process.exit(2);
  }
  const r = await tachDanhSachNut(nuts, {
    luat,
    hoSo,
    L,
    url: lay('--url')[0],
    model: lay('--model')[0],
    apiKeyEnv: lay('--api-key-env')[0],
    out: lay('--out')[0],
  });
  console.log(`Tách ${nuts.length} nút: ${r.banGhi.length} bản ghi DIEU_KIEN, ${r.loi.length} lỗi`);
  for (const l of r.loi.slice(0, 40)) console.log(`  ✗ ${l}`);
  if (!lay('--out')[0] && r.banGhi.length) {
    for (const x of r.banGhi) console.log(JSON.stringify(x));
  }
  process.exit(r.loi.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
