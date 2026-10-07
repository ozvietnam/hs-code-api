/**
 * Sổ tay chú giải (backlog bước 8, docs/backlog/08-so-tay-chu-giai.md) — phần MÁY dùng chung cho
 * dựng (scripts/build-so-tay.mjs), kiểm (scripts/check-so-tay.mjs) và các cổng lúc chạy sau này.
 *
 * Ba tầng: kệ sách (nguyên văn: chú giải HS 2022, SEN 2022, biểu thuế) → sổ tay (data/so-tay/<nhom4>.json,
 * có cấu trúc) → bộ não (AI lúc chạy). Quy tắc bất biến: MỌI mục trong sổ tay có `nguon` (mã nguồn
 * dưới đây) + `trich` (câu nguyên văn chép từ nguồn đó); máy kiểm được thì giữ, không kiểm được thì bỏ.
 * Trích sai điều luật tệ hơn không trích — đây là căn cứ người khai đưa cho Hải quan.
 *
 * Mã nguồn:
 *   nhom<4>.nhom | .bao_gom | .khong_bao_gom | .loai_tru | .phan_biet | .tinh_chat  (chu-giai-heading)
 *   ch<2>.chuong (chú giải chương + tổng quát)   phan<2>.phan (chú giải Phần chứa chương)
 *   sen.<mã>     (SEN 2022 — mã 8/6/4 số như trong data/sen-2022.json)
 *   tax.<8 số>   (dòng biểu thuế: "85098010 - - Máy đánh bóng sàn nhà")
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const cache = {};
function load(name) {
  if (!(name in cache)) {
    try { cache[name] = JSON.parse(fs.readFileSync(dataReadPath(name), 'utf8')); } catch { cache[name] = null; }
  }
  return cache[name];
}
function taxRows() {
  if (!cache._tax) {
    const t = load('tax.json') || [];
    cache._tax = (Array.isArray(t) ? t : Object.values(t)).map((r) => ({ hs: String(r.hs).replace(/\D/g, ''), vn: String(r.vn || '') }));
  }
  return cache._tax;
}

const HEADING_FIELDS = ['nhom', 'bao_gom', 'khong_bao_gom', 'loai_tru', 'phan_biet', 'tinh_chat'];

/** Mọi nguồn nguyên văn của một nhóm: { [maNguon]: text } (đã bỏ trống). */
function sourcesFor(h4) {
  const H = (load('chu-giai-heading.json') || {})[h4] || {};
  const ch = h4.slice(0, 2);
  const C = (load('chu-giai-chuong.json') || {})[ch] || {};
  const out = {};
  for (const f of HEADING_FIELDS) if (String(H[f] || '').trim()) out[`nhom${h4}.${f}`] = String(H[f]);
  if (String(C.chuong || '').trim()) out[`ch${ch}.chuong`] = String(C.chuong);
  if (String(C.phan || '').trim()) out[`phan${ch}.phan`] = String(C.phan);
  const sen = load('sen-2022.json');
  for (const m of sen?.muc || []) {
    for (const ma of m.ma) {
      if (ma.startsWith(h4) || (ma.length === 4 && ma === h4)) out[`sen.${ma}`] = `${m.tieuDe}\n${m.noiDung}`;
    }
  }
  for (const r of taxRows()) if (r.hs.startsWith(h4)) out[`tax.${r.hs}`] = `${r.hs} ${r.vn}`;
  return out;
}

const squash = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const squashCache = new WeakMap();
function squashed(sources) {
  let m = squashCache.get(sources);
  if (!m) { m = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, squash(v)])); squashCache.set(sources, m); }
  return m;
}

/** Câu trích có nguyên văn trong nguồn? Cho phép lược "…" giữa các đoạn; mỗi đoạn ≥ 6 ký tự đều phải có. */
function quoteInSource(trich, src) {
  const frags = String(trich || '').split(/…|\.{3,}/).map(squash).filter((f) => f.length >= 6);
  return frags.length > 0 && frags.every((f) => src.includes(f));
}

const headingCodes = (s) => String(s || '').split(/[|,;\s]+/).map((x) => x.replace(/\D/g, '')).filter(Boolean);
function mentions(trich, code) {
  const t = String(trich || '');
  const dotted = code.length === 4 ? `${code.slice(0, 2)}.${code.slice(2)}` : code.length === 8 ? `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}` : code;
  return t.includes(dotted) || t.replace(/\D/g, ' ').split(/\s+/).includes(code) || t.includes(`${code.slice(0, 4)}.${code.slice(4)}`);
}
const validHeading = (h) => h.length === 4 && !!(load('chu-giai-heading.json') || {})[h];
const validTax = (h) => taxRows().some((r) => r.hs === h);

/**
 * Kiểm một mục. Trả null nếu đạt, hoặc chuỗi lý do loại.
 * @param {'phamVi'|'dieuKienVao'|'loaiTru'|'phanBiet'|'boPhan'|'dong8'} kind
 */
function checkItem(kind, item, sources, h4) {
  if (!item || typeof item !== 'object') return 'khong-phai-object';
  if (!item.nguon || !(item.nguon in sources)) return `nguon-khong-co:${item.nguon || ''}`;
  if (!String(item.trich || '').trim()) return 'thieu-trich';
  if (String(item.trich).length > 600) return 'trich-qua-dai';
  if (!quoteInSource(item.trich, squashed(sources)[item.nguon])) return 'trich-khong-co-trong-nguon';
  if (kind === 'loaiTru') {
    const codes = headingCodes(item.sangNhom);
    if (!codes.length) return 'thieu-nhom-dich';
    for (const c of codes) {
      if (!(validHeading(c) || validTax(c))) return `nhom-dich-khong-co-that:${c}`;
      if (c === h4) return 'nhom-dich-trung-nhom-nay';
      if (!mentions(item.trich, c)) return `nhom-dich-khong-co-trong-trich:${c}`;
    }
  }
  if (kind === 'dieuKienVao' && typeof item.value === 'number' && !String(item.trich).replace(/\s/g, '').includes(String(item.value).replace('.', ','))
      && !String(item.trich).replace(/\s/g, '').includes(String(item.value))) {
    return `nguong-khong-co-trong-trich:${item.value}`;
  }
  if (kind === 'phanBiet') {
    for (const c of [...headingCodes(item.neuCo), ...headingCodes(item.neuKhong)]) {
      if (!(validHeading(c) || validTax(c))) return `ma-khong-co-that:${c}`;
    }
  }
  if (kind === 'dong8') {
    const hs = String(item.hs || '').replace(/\D/g, '');
    if (hs.length !== 8 || !hs.startsWith(h4) || !validTax(hs)) return `dong8-khong-co-trong-bieu:${item.hs}`;
  }
  return null;
}

const LIST_KINDS = ['dieuKienVao', 'loaiTru', 'phanBiet', 'dong8'];

/**
 * Lọc sổ tay thô (AI trả) → chỉ giữ mục kiểm được. Trả { soTay, loai: [{kind, item, lyDo}], tong, dat }.
 */
function verifySoTay(raw, h4, sources = sourcesFor(h4)) {
  const soTay = { nhom: h4 };
  const loai = [];
  let tong = 0;
  let dat = 0;
  const keep = (kind, item) => {
    tong += 1;
    const lyDo = checkItem(kind, item, sources, h4);
    if (lyDo) { loai.push({ kind, item, lyDo }); return false; }
    dat += 1;
    return true;
  };
  if (raw?.phamVi && keep('phamVi', raw.phamVi)) soTay.phamVi = raw.phamVi;
  for (const k of LIST_KINDS) soTay[k] = (Array.isArray(raw?.[k]) ? raw[k] : []).filter((it) => keep(k, it));
  if (raw?.boPhan && keep('boPhan', raw.boPhan)) soTay.boPhan = raw.boPhan;
  const used = new Set([soTay.phamVi, soTay.boPhan, ...LIST_KINDS.flatMap((k) => soTay[k])].filter(Boolean).map((x) => x.nguon));
  soTay.dungTuNguon = [...used].sort();
  soTay.phienBan = [...used].some((u) => u.startsWith('sen.')) ? 'HS2022+SEN2022' : 'HS2022';
  return { soTay, loai, tong, dat };
}

module.exports = { sourcesFor, verifySoTay, checkItem, quoteInSource, squash, LIST_KINDS };
