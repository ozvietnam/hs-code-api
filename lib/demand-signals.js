// lib/demand-signals.js — NHU CẦU TỪ HÀNG THẬT (CEO 05/10/2026).
//
// VÌ SAO: kho tri thức (từ điển thông số, danh sách nhãn hiệu, danh mục KTCN của oz-wiki-plhq)
// chỉ biết cần bổ sung gì khi có người tình cờ phát hiện. Mỗi phiếu hồ sơ khai báo
// (/api/declaration-sheet) chạy trên một món hàng THẬT đã cho biết chỗ hổng: mã HS chưa đối
// chiếu danh mục KTCN 2026, nhãn hiệu chưa có trong danh sách theo dõi, chữ Trung từ điển chưa
// hiểu, ô bắt buộc hay thiếu. Module này ghi lại các tín hiệu đó và gom thành NHU CẦU công khai
// (GET /api/demand) để:
//   - oz-wiki-plhq kéo vào báo cáo điểm mù (tools/nhu-cau.mjs) — hợp quy / KTCN;
//   - hs-code-api tự cập nhật issue "Nhu cầu từ hàng thật (tự động)" — nhãn hiệu, từ điển.
//
// RIÊNG TƯ (CEO chốt 05/10/2026 — "công khai, không có số lượng"): chỉ ghi mã HS, nhãn hiệu,
// nhãn chữ Trung, khóa ô. KHÔNG ghi tên hàng, link, shop, khách, bên gọi. Bản công khai chỉ có
// MỨC ƯU TIÊN (Cao/Vừa/Thấp), không có số lần gặp.

const fs = require('fs');
const { dataPath, dataReadPath } = require('./data-paths');
const { keysForLabel } = require('./zh-specs');

const FILE = 'demand-signals.jsonl';
const CJK = /[㐀-鿿]/;
const SO_HIEU_RE = /\d{1,4}\/(?:\d{4}\/)?(?:TT|NĐ|ND|QĐ|QD|NQ|TTLT)-[A-ZĐa-z]+(?:-[A-Z0-9]+)?/g;

let _ktcn2026 = null;
/** Số hiệu các danh mục KTCN khung 2026 (data/ktcn-regime-2026.json). */
function ktcn2026Docs() {
  if (_ktcn2026) return _ktcn2026;
  try {
    const raw = JSON.parse(fs.readFileSync(dataReadPath('ktcn-regime-2026.json'), 'utf8'));
    _ktcn2026 = new Set((raw.lists || []).map((l) => l.code));
  } catch {
    _ktcn2026 = new Set();
  }
  return _ktcn2026;
}

// Nhãn thông số của sàn không liên quan khai báo — không coi là "từ điển thiếu".
const NOISE_LABEL_RE = /服务|物流|发货|售后|质保|保修|包邮|运费|退换|客服|是否|发票|跨境|平台|授权|证书编号|货源|上市时间|销售渠道|库存|同城/;

/**
 * Tín hiệu từ 1 phiếu (đã có mã HS). Thuần — không ghi đĩa.
 * @param {object} p { sheet, mapped (mapTaxRecord của mã), specsZh }
 */
function signalsFromSheet({ sheet, mapped, specsZh } = {}) {
  const out = [];
  const hs = String(sheet?.hsCode || '').replace(/\D/g, '');
  if (hs.length !== 8) return out;
  const heading = hs.slice(0, 4);

  // 1. KTCN 2026: mã chưa có dòng nào trong bảng danh mục KTCN 2026 của oz-wiki (hsListings).
  const docs2026 = ktcn2026Docs();
  const covered = (mapped?.hsListings || []).some((l) => docs2026.has(l.soHieu));
  if (!covered) {
    const docs = [...new Set((mapped?.policyLines || []).flatMap((l) => String(l.text || '').match(SO_HIEU_RE) || []))];
    out.push({ t: 'KTCN_2026', k: hs, m: { policyLevel: mapped?.policyLevel || null, docs: docs.slice(0, 8) } });
  }

  // 2. Nhãn hiệu: có nhãn mà danh sách theo dõi chưa có → hàng chờ tra bảo hộ.
  const tm = sheet.trademark || {};
  // CHỈ nhãn máy đọc từ trang/ảnh. Nhãn do khách/NV tự gõ (supplement) có thể là chính nhãn OEM của
  // khách nhập khẩu = danh tính khách → không công bố (review 05/10/2026).
  const bf = (sheet.fields || []).find((f) => f.key === 'brand');
  const machineBrand = bf && (bf.source === 'SITE' || bf.source === 'IMAGE_OCR') && bf.method !== 'SUPPLEMENT' && bf.method !== 'KNOWN';
  if (tm.brandStatus === 'BRANDED' && tm.brand && !tm.risk && machineBrand) {
    out.push({ t: 'BRAND_UNLISTED', k: String(tm.brand).trim().slice(0, 60), m: { heading } });
  }
  for (const s of tm.counterfeitSignals || []) out.push({ t: 'COUNTERFEIT_TERM', k: s.term, m: { heading } });
  const brandField = (sheet.fields || []).find((f) => f.key === 'brand');
  // Nhãn chữ Hán thuần: phiếu giữ nguyên (HAVE, tên riêng) nhưng vẫn ghi để sau có người tra chữ Latin.
  const hanBrand = brandField?.status === 'UNTRANSLATED' || (brandField?.status === 'HAVE' && CJK.test(String(brandField.valueVi || '')));
  if (hanBrand && brandField.valueZh && !/^(无品牌|无牌|无|其他|other)/i.test(String(brandField.valueZh).trim())) {
    out.push({ t: 'BRAND_HAN_ONLY', k: String(brandField.valueZh).trim().slice(0, 40), m: { heading } });
  }

  // 3. Ô bắt buộc hay thiếu theo nhóm hàng (từ điển / template cần bổ sung, hoặc cần hỏi shop).
  for (const f of sheet.missing || []) out.push({ t: 'FIELD_MISSING', k: `${heading}:${f.key}`, m: { status: f.status } });

  // 4. Nhãn thông số tiếng Trung từ điển chưa hiểu.
  for (const s of Array.isArray(specsZh) ? specsZh : []) {
    const label = String(s?.key || s?.label || '').trim();
    if (!label || !CJK.test(label) || label.length > 12 || label.startsWith('已选规格') || NOISE_LABEL_RE.test(label)) continue;
    if (keysForLabel(label).length === 0) out.push({ t: 'ZH_LABEL_UNMAPPED', k: label, m: {} });
  }

  // 5. Nhóm 4 số chưa có template ô khai báo.
  if (!sheet.heading) out.push({ t: 'NO_HEADING_TEMPLATE', k: heading, m: {} });
  return out;
}

const today = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** Ghi tín hiệu (append JSONL ở thư mục ghi). Không bao giờ throw — nhu cầu là phụ. */
const MAX_BYTES = 20 * 1024 * 1024;
/** Tệp quá 20MB → viết lại, chỉ giữ 365 ngày gần nhất. */
function compactIfLarge() {
  try {
    if (fs.statSync(dataPath(FILE)).size < MAX_BYTES) return;
    const from = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const keep = readSignals().filter((r) => r.d >= from).map((r) => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(dataPath(FILE), keep);
  } catch { /* tệp chưa có / lỗi đọc — bỏ qua */ }
}

function recordSignals(signals, date = today()) {
  if (!Array.isArray(signals) || !signals.length || process.env.HS_DEMAND_OFF === '1') return 0;
  try {
    const lines = signals.map((s) => JSON.stringify({ d: date, t: s.t, k: s.k, m: s.m || {} })).join('\n') + '\n';
    fs.appendFileSync(dataPath(FILE), lines);
    _aggCache.clear();
    if (Math.random() < 0.01) compactIfLarge();
    return signals.length;
  } catch {
    return 0;
  }
}

function readSignals() {
  try {
    return fs.readFileSync(dataReadPath(FILE), 'utf8').split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// Ngày gặp gần nhất làm tròn về thứ Hai của tuần — không lộ "hôm nay khách OZ vừa đặt gì".
function weekOf(d) {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

const priorityOf = (n) => (n >= 5 ? 'Cao' : n >= 2 ? 'Vừa' : 'Thấp');
const RANK = { Cao: 0, 'Vừa': 1, 'Thấp': 2 };

/**
 * Gom tín hiệu trong `days` ngày gần nhất → nhu cầu CÔNG KHAI (không số lượng).
 * Mỗi mục: khóa + mức ưu tiên + ngày gặp gần nhất (+ thông tin phụ không định danh).
 */
const _aggCache = new Map(); // days → { at, value } — GET công khai không đọc lại cả tệp mỗi lần
const AGG_TTL_MS = 10 * 60 * 1000;
function aggregateDemand(opts = {}) {
  const cacheable = !opts.rows && !opts.now;
  const key = String(opts.days || 90);
  const hit = cacheable ? _aggCache.get(key) : null;
  if (hit && Date.now() - hit.at < AGG_TTL_MS) return hit.value;
  const value = aggregateDemandRaw(opts);
  if (cacheable) _aggCache.set(key, { at: Date.now(), value });
  return value;
}

function aggregateDemandRaw({ days = 90, now = today(), rows = readSignals(), limit = 200 } = {}) {
  const from = new Date(`${now}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - days);
  const since = from.toISOString().slice(0, 10);
  const groups = new Map();
  for (const r of rows) {
    if (!r || r.d < since) continue;
    const id = `${r.t}\u0000${r.k}`;
    const g = groups.get(id) || { t: r.t, k: r.k, n: 0, last: r.d, meta: {} };
    g.n += 1;
    if (r.d > g.last) g.last = r.d;
    if (r.t === 'KTCN_2026') {
      g.meta.policyLevel = r.m?.policyLevel ?? g.meta.policyLevel ?? null;
      g.meta.docs = [...new Set([...(g.meta.docs || []), ...(r.m?.docs || [])])].slice(0, 8);
    }
    if (r.m?.heading) g.meta.headings = [...new Set([...(g.meta.headings || []), r.m.heading])].slice(0, 10);
    groups.set(id, g);
  }
  const pick = (t, map) => [...groups.values()]
    .filter((g) => g.t === t)
    .sort((a, b) => b.n - a.n || b.last.localeCompare(a.last) || String(a.k).localeCompare(String(b.k)))
    .slice(0, limit)
    .map((g) => ({ ...map(g), priority: priorityOf(g.n), lastSeen: weekOf(g.last), _k: String(g.k) }))
    // Trong cùng mức xếp theo chữ cái — thứ tự không được lộ số lần gặp.
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || a._k.localeCompare(b._k))
    .map(({ _k, ...x }) => x);
  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    since,
    note: 'Nhu cầu bổ sung tri thức rút từ hàng thật đi qua phiếu hồ sơ khai báo. Chỉ có mã HS / nhãn hiệu / nhãn chữ Trung / khóa ô và MỨC ưu tiên — không có số lượng, tên hàng, link, shop hay khách (CEO chốt 05/10/2026).',
    ktcn2026: pick('KTCN_2026', (g) => ({ hs: g.k, chapter: g.k.slice(0, 2), policyLevel: g.meta.policyLevel ?? null, docs: g.meta.docs || [] })),
    brands: pick('BRAND_UNLISTED', (g) => ({ brand: g.k, headings: g.meta.headings || [] })),
    brandsHanOnly: pick('BRAND_HAN_ONLY', (g) => ({ brandZh: g.k, headings: g.meta.headings || [] })),
    counterfeitTerms: pick('COUNTERFEIT_TERM', (g) => ({ term: g.k, headings: g.meta.headings || [] })),
    missingFields: pick('FIELD_MISSING', (g) => ({ heading: g.k.split(':')[0], field: g.k.split(':')[1] })),
    zhLabels: pick('ZH_LABEL_UNMAPPED', (g) => ({ label: g.k })),
    noHeadingTemplate: pick('NO_HEADING_TEMPLATE', (g) => ({ heading: g.k })),
  };
}

module.exports = { signalsFromSheet, recordSignals, aggregateDemand, readSignals, priorityOf, weekOf };
