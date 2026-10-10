// BẢNG PHƯƠNG ÁN KHAI (CEO 10/10/2026, ca tấm bảo vệ gầm/pin thép mangan dập định hình theo xe Leapmotor):
//  "Kết quả hơi bó hẹp vào 1 nhóm (8708.29 vs 8708.99), trong khi khai là tấm thép định hình sẵn (7326) cũng có
//   thể được. Làm sao để không bỏ lỡ những phương án kiểu như vậy."
// Động cơ chỉ đưa phương án thay thế TRONG cùng nhóm. Module này dựng bảng ≤ 4 phương án cho CHUYÊN VIÊN:
//   (a) mã máy chọn (CHON, khuyến nghị) · (b) mã cùng nhóm AI đã cân nhắc (CUNG_NHOM) ·
//   (c) đường phân loại THEO VẬT LIỆU (THEO_VAT_LIEU — data/material-fallback-headings.json) ·
//   (d) nguồn khác nhóm: NCC khai / made-in-china / tiền lệ Oz (KHAC).
// Luật đi kèm, không giấu: Chú giải 2 Phần XV/XVI/XVII — bộ phận nhận dạng được là dùng riêng/chủ yếu cho máy/xe
// phải xếp theo máy/xe; chỉ "bộ phận công dụng chung" (73.18, 73.20, 83.01…) mới xếp theo vật liệu → đường vật
// liệu cho hàng "đúng lỗ vít nguyên bản xe" ghi rủi ro CAO nhưng vẫn LIỆT KÊ để chuyên viên thấy và tự quyết.
// Thuế/cờ từng phương án: lib/tax-lookup (mapTaxRecord + acfta.forOrigin + policyLevel). Không AI, tất định.
const path = require('path');
const fs = require('fs');
const { taxData: TAX } = require('./data.js');
const { buildTaxLookup } = require('./tax-lookup.js');
const { breadcrumbOf } = require('./hs-breadcrumb.js');

const MAX_OPTIONS = 4;
const nz = (s) => String(s || '').replace(/\D/g, '');
const clip = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const lower = (s) => String(s || '').normalize('NFC').toLowerCase();

let _table = null;
function materialTable() {
  if (_table) return _table;
  try { _table = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'material-fallback-headings.json'), 'utf8')); } catch { _table = { materials: [], generalUseHeadings: { list: [] }, sectionRules: {} }; }
  return _table;
}

const HAN = /\p{Script=Han}/u;
const LETTER = /[\p{L}\p{N}]/u;
/** Vị trí xuất hiện sớm nhất của từ khoá trong chữ (có kiểm biên từ với chữ Latin/Việt; chữ Hán không cần). */
function indexOfWord(text, kw) {
  const k = lower(kw);
  if (!k) return -1;
  let from = 0;
  while (from <= text.length) {
    const i = text.indexOf(k, from);
    if (i < 0) return -1;
    if (HAN.test(k)) return i;
    const before = i > 0 ? text[i - 1] : '';
    const after = text[i + k.length] || '';
    if (!LETTER.test(before) && !LETTER.test(after)) return i;
    from = i + 1;
  }
  return -1;
}

/**
 * Vật liệu chính từ chữ (chất liệu AI chuẩn hoá / ô chất liệu / thông số). Thử từng nguồn theo thứ tự — nguồn
 * nào ra kết quả thì dừng (thông số liệt kê nhiều vật liệu phụ: bao bì, đệm…). Trong một nguồn: vật liệu có từ
 * khoá xuất hiện SỚM NHẤT thắng ("thép mangan, lót cao su" → thép).
 */
function detectMainMaterial(texts) {
  const { materials } = materialTable();
  for (const raw of Array.isArray(texts) ? texts : [texts]) {
    const text = lower(raw);
    if (!text.trim()) continue;
    let best = null;
    for (const m of materials) {
      for (const kw of m.keywords || []) {
        const i = indexOfWord(text, kw);
        if (i >= 0 && (!best || i < best.index)) best = { id: m.id, nameVi: m.nameVi, keyword: kw, index: i, headings: m.headings || [] };
      }
    }
    if (best) return best;
  }
  return null;
}

/** Hàng là bộ phận/phụ kiện/tấm/vỏ/giá đỡ… (CEO: chỉ những hàng này mới cần xét đường vật liệu). */
const PART_RE = /bộ phận|phụ kiện|phụ tùng|linh kiện|\btấm\b|\bvỏ\b|giá đỡ|giá treo|\bkhung\b|\bnắp\b|\bốp\b|\bchụp\b|\bđế\b|\bkẹp\b|\bbệ\b|tấm chắn|bảo vệ|\bgá\b|\bgiá kẹp|miếng|parts?\b|accessor|bracket|cover|plate|guard|shield|housing|配件|零件|支架|护板|盖|壳|板/i;
// Chỉ nhìn chữ về HÀNG (tên/công dụng/dạng hàng/tên gốc) — không nhìn tên nhóm biểu thuế: tên nhóm hay có
// "và các bộ phận của chúng" (73.23 đồ nhà bếp…) sẽ bắt nhầm hàng hoàn chỉnh thành bộ phận.
function isPartLike({ product, texts }) {
  if (String(product?.form || '').toLowerCase().includes('bộ phận')) return true;
  const pool = [product?.nameVi, product?.nameEn, product?.purpose, ...(texts || [])].filter(Boolean).join(' | ');
  return PART_RE.test(pool);
}

/** Thuế + cờ theo mã (origin mặc định CN; ACFTA tôn trọng loại trừ "(-CN)"). Mã 6 số → thue rỗng, ghi chú. */
function taxOf(hs, origin) {
  if (hs.length !== 8 || !TAX[hs]) return { thue: { mfn: null, acftaCn: null, acftaNoteVi: 'Chưa tới dòng 8 số — chọn dòng rồi tra thuế.', vat: null }, coChinhSach: { level: 'NONE', lineVi: null } };
  let t = null;
  try { t = buildTaxLookup(hs, { origin }); } catch { t = null; }
  if (!t?.found) return { thue: { mfn: TAX[hs].mfn || null, acftaCn: null, acftaNoteVi: null, vat: TAX[hs].vat || null }, coChinhSach: { level: 'NONE', lineVi: null } };
  const fo = t.acfta?.forOrigin || null;
  const first = (t.policyLines || []).find((l) => l.level === 'BLOCKING') || (t.policyLines || []).find((l) => l.level === 'NOTICE') || (t.policyLines || [])[0] || null;
  return {
    thue: { mfn: t.taxNkPreferential ?? null, acftaCn: fo && fo.eligible ? fo.rate : null, acftaNoteVi: fo?.noteVi ? clip(fo.noteVi, 160) : null, vat: t.taxVat ?? null },
    coChinhSach: { level: t.policyLevel || 'NONE', lineVi: first ? clip(first.text, 160) : null },
  };
}

let _headingNames = null;
/** Tên nhóm tiếng Việt (chu-giai-heading.json `ten_nhom`: "87.08 - Bộ phận và phụ kiện…") → bỏ tiền tố số. */
function headingNameVi(h4) {
  if (!_headingNames) { try { _headingNames = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'chu-giai-heading.json'), 'utf8')); } catch { _headingNames = {}; } }
  const t = String(_headingNames[h4]?.ten_nhom || '').replace(/^\s*\d{2}\.\d{2}\s*[-–—]?\s*/, '').trim();
  return t || null;
}

function nameOf(hs) {
  const r = TAX[hs];
  if (!r) return null;
  const self = String(r.vn || '').replace(/^[-\s]+/, '').trim();
  // Dòng "Loại khác" tự nó vô nghĩa → ghép tên nhóm tiếng Việt (chú giải nhóm), không có thì tên WCO tiếng Anh.
  if (/^loại khác$/i.test(self)) {
    const c = breadcrumbOf(hs);
    return clip(`${headingNameVi(hs.slice(0, 4)) || c?.subheadingEn || c?.headingEn || `Nhóm ${hs.slice(0, 4)}`} — Loại khác`, 120);
  }
  return clip(self, 120);
}

/** Chọn dòng 8 số VN cho một phân nhóm 6 số / nhóm 4 số (nguồn ngoài chỉ cho tới 6 số): duy nhất → lấy; nhiều → dòng cuối ("Loại khác"), ghi chú NV chọn dòng. */
function vnLineFor(prefix) {
  const codes = Object.keys(TAX).filter((k) => k.startsWith(prefix)).sort();
  if (!codes.length) return null;
  return { hs: codes[codes.length - 1], exact: codes.length === 1, count: codes.length };
}

function makeOption(hs, kind, fields, origin) {
  const tax = taxOf(hs, origin);
  return {
    hs, nameVi: nameOf(hs) || fields.nameVi || null, kind,
    canCuVi: clip(fields.canCuVi, 300), dieuKienVi: clip(fields.dieuKienVi, 300),
    ruiRo: fields.ruiRo, ruiRoVi: clip(fields.ruiRoVi, 300),
    thue: tax.thue, coChinhSach: tax.coChinhSach, khuyenNghi: Boolean(fields.khuyenNghi),
  };
}

/** (a) mã máy chọn. */
function chosenOption(top, { decision, review, origin }) {
  const hs = nz(top.hs);
  const conds = Array.isArray(top.conditions) ? top.conditions : [];
  const met = conds.filter((c) => String(c.status).toUpperCase() === 'MET').map((c) => c.fact);
  const unknown = conds.filter((c) => String(c.status).toUpperCase() === 'UNKNOWN').map((c) => c.fact);
  const dieuKien = [met.length ? `Đã kiểm: ${met.join('; ')}` : '', unknown.length ? `Cần xác nhận: ${unknown.join('; ')}` : ''].filter(Boolean).join('. ') || 'Theo lập luận máy đã nêu.';
  const conf = Number(top.confidence) || 0;
  const reviewNeeded = Boolean(review?.needed);
  let ruiRo = 'THAP'; let ruiRoVi = 'Máy chốt đủ căn cứ, không có cờ xem lại.';
  if (hs.length < 8) { ruiRo = 'CAO'; ruiRoVi = 'Mới tới phân nhóm 6 số — còn thiếu dữ kiện để chọn dòng 8 số.'; }
  else if (decision === 'DE_XUAT' || reviewNeeded) { ruiRo = 'VUA'; ruiRoVi = reviewNeeded ? clip(`Có cờ xem lại: ${(review.reasons || [])[0] || 'chuyên viên đối chiếu'}`, 200) : 'Máy đề xuất nhưng còn tranh luận thật (quy tắc 3 của GIR / "chủ yếu dùng cho") — chuyên viên duyệt.'; }
  else if (decision === 'HOI') { ruiRo = 'CAO'; ruiRoVi = 'Máy còn phải hỏi thêm dữ kiện về hàng.'; }
  else if (conf < 75) { ruiRo = 'VUA'; ruiRoVi = `Độ tin ${conf}% — dưới ngưỡng chốt.`; }
  // Bảng quyết định ĐÃ DUYỆT ghi đè mã AI → nói rõ nguồn căn cứ (chuyên viên biết đây là luật nội bộ đã duyệt).
  const prefix = top.resolverOverride ? `Bảng quyết định đã duyệt${top.resolverOverride.from ? ` (ghi đè ${top.resolverOverride.from})` : ''}: ` : (top.gir ? `${top.gir}: ` : '');
  return makeOption(hs, 'CHON', {
    canCuVi: `${prefix}${top.reason || 'mã máy chọn'}`,
    dieuKienVi: dieuKien, ruiRo, ruiRoVi, khuyenNghi: true,
  }, origin);
}

/** (b) mã cùng nhóm / (AI loại) khác nhóm từ results[1..] + dossier.alternatives. */
function alternativeOptions(top, results, dossier, origin) {
  const topHs = nz(top.hs); const h4 = topHs.slice(0, 4);
  const seen = new Set([topHs]);
  const out = [];
  const pool = [
    ...(Array.isArray(results) ? results.slice(1) : []).map((r) => ({ hs: nz(r.hs), why: r.reason, src: r.source })),
    ...(Array.isArray(dossier?.alternatives) ? dossier.alternatives : []).map((a) => ({ hs: nz(a.hs), why: a.reason || a.whyNot, src: 'engine-loop:alt' })),
  ];
  for (const a of pool) {
    if (a.hs.length < 6 || seen.has(a.hs)) continue;
    if (a.hs.length === 8 && !TAX[a.hs]) continue;
    if (a.hs.length === 6 && !Object.keys(TAX).some((k) => k.startsWith(a.hs))) continue;
    seen.add(a.hs);
    const same = a.hs.slice(0, 4) === h4;
    const srcVi = a.src === 'suggest' ? 'cửa đối chiếu' : a.src === 'decision-table-advisory' ? 'bảng quyết định (chưa duyệt)' : 'AI vòng 2';
    out.push(makeOption(a.hs, same ? 'CUNG_NHOM' : 'KHAC', {
      canCuVi: `${srcVi} đã cân nhắc${a.why ? `: ${a.why}` : ''}`,
      dieuKienVi: same ? `Cùng nhóm ${h4}, khác dòng — chọn khi dữ kiện phân định dòng 8 số nghiêng về mã này.` : `Khác nhóm với mã chọn — chỉ khi chú giải nhóm ${a.hs.slice(0, 4)} mô tả hàng cụ thể hơn (quy tắc 3(a) của GIR).`,
      ruiRo: 'VUA', ruiRoVi: same ? 'Khác dòng 8 số trong cùng nhóm — sai dòng ít bị truy thu thuế nhưng vẫn là khai sai mã.' : 'Khác nhóm — máy đã loại; chỉ dùng khi chuyên viên có căn cứ chú giải ngược lại.',
    }, origin));
  }
  return out;
}

/** (c) đường phân loại theo vật liệu. */
function materialOptions(top, { product, materialTexts, partTexts, origin }) {
  const topHs = nz(top.hs); const h4 = topHs.slice(0, 4);
  const t = materialTable();
  if ((t.generalUseHeadings?.list || []).includes(h4)) return []; // mã chọn đã là bộ phận công dụng chung → đường vật liệu chính là đường đã chọn
  const mat = detectMainMaterial([product?.material, product?.evidence?.material, ...(materialTexts || [])]);
  if (!mat) return [];
  if (!isPartLike({ product, topHs, texts: partTexts })) return [];
  const crumb = breadcrumbOf(topHs);
  const section = crumb?.sectionCode || null;
  const ruleKey = h4.slice(0, 2) === '90' ? '90' : section;
  const rule = (ruleKey && t.sectionRules?.[ruleKey]) || t.sectionRules?.default || { ruiRo: 'VUA', ruiRoVi: '' };
  const out = [];
  const pool = [product?.nameVi, product?.purpose, product?.nameEn, ...(partTexts || [])].filter(Boolean).join(' | ');
  for (const h of mat.headings) {
    if (h.heading4 === h4) continue; // mã chọn đã nằm trong nhóm vật liệu này
    if (h.onlyWhenVi && !new RegExp(h.onlyWhenVi, 'i').test(pool)) continue;
    const hs = TAX[h.hs] ? h.hs : (vnLineFor(h.heading4)?.hs || null);
    if (!hs) continue;
    out.push(makeOption(hs, 'THEO_VAT_LIEU', {
      nameVi: h.nameVi,
      canCuVi: `Vật liệu chính: ${mat.nameVi} ("${clip(mat.keyword, 30)}"). ${h.canCuVi}`,
      dieuKienVi: h.dieuKienVi,
      ruiRo: rule.ruiRo, ruiRoVi: rule.ruiRoVi,
    }, origin));
  }
  return out;
}

/** (d) nguồn khác nhóm: NCC tự khai, made-in-china, tiền lệ Oz. */
function externalOptions(top, { dossier, gathered, origin }) {
  const topHs = nz(top.hs); const h4 = topHs.slice(0, 4);
  const out = [];
  const sup = dossier?.supplier;
  if (sup?.hs6 && sup.heading4 && sup.heading4 !== h4) {
    const line = vnLineFor(sup.hs6) || vnLineFor(sup.heading4);
    if (line) out.push(makeOption(line.hs, 'KHAC', {
      canCuVi: `Nhà cung cấp tự khai HS ${sup.hs6}${sup.source ? ` (${sup.source})` : ''} — mã gốc ${sup.code}, 6 số đầu theo HS quốc tế, đuôi là mã TQ.`,
      dieuKienVi: line.exact ? 'Dòng VN duy nhất của phân nhóm NCC khai.' : `Phân nhóm NCC khai có ${line.count} dòng VN — chuyên viên chọn dòng; mã ghi là dòng "Loại khác".`,
      ruiRo: 'VUA', ruiRoVi: 'NCC tự khai, có thể sai — chỉ là nguồn kiểm chứng; chọn khác nhóm với máy phải đối chiếu chú giải hai nhóm.',
    }, origin));
  }
  const mic = dossier?.mic;
  if (mic?.consensus?.heading4 && mic.consensus.heading4 !== h4 && !out.some((o) => o.hs.startsWith(mic.consensus.heading4))) {
    const hs6s = (mic.pages || []).map((p) => nz(p.hsCode).slice(0, 6)).filter((c) => c.length === 6 && c.startsWith(mic.consensus.heading4));
    const common = [...hs6s.reduce((m, c) => m.set(c, (m.get(c) || 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const line = (common && vnLineFor(common)) || vnLineFor(mic.consensus.heading4);
    if (line) out.push(makeOption(line.hs, 'KHAC', {
      canCuVi: `${mic.consensus.shops || 'Nhiều'} shop trên made-in-china cùng ghi nhóm ${mic.consensus.heading4} (truy vấn "${clip(mic.query, 40)}").`,
      dieuKienVi: line.exact ? 'Dòng VN duy nhất của phân nhóm.' : `Nhóm có ${line.count} dòng VN — chuyên viên chọn dòng.`,
      ruiRo: 'VUA', ruiRoVi: 'Mã do shop TQ tự ghi — tham khảo, không phải phán quyết.',
    }, origin));
  }
  const byHead = new Map();
  for (const o of gathered?.ozPrecedents || []) {
    const hs = nz(o.hs);
    if ((o.cov ?? 0) < 75 || hs.length !== 8 || !TAX[hs] || hs.slice(0, 4) === h4) continue;
    const cur = byHead.get(hs) || { hs, oz: 0, name: o.name };
    cur.oz += o.oz || 1; byHead.set(hs, cur);
  }
  const lead = [...byHead.values()].sort((a, b) => b.oz - a.oz)[0];
  if (lead && lead.oz >= 3 && !out.some((o) => o.hs === lead.hs)) {
    out.push(makeOption(lead.hs, 'KHAC', {
      canCuVi: `Tiền lệ Oz: ${lead.oz} tờ khai đã thông quan mã ${lead.hs} — "${clip(lead.name, 80)}".`,
      dieuKienVi: 'Hàng thật giống tờ khai cũ (cùng bản chất, vật liệu, công dụng).',
      ruiRo: 'VUA', ruiRoVi: 'Tờ khai đã thông quan không phải phán quyết phân loại — chú giải vẫn thắng tiền lệ.',
    }, origin));
  }
  return out;
}

/**
 * buildDeclarationOptions({ top, results, dossier, gathered, origin, review, materialTexts, partTexts })
 *   top: results[0] (hs, reason, confidence, gir?, conditions?) — không có → [].
 *   dossier: { product, decision, alternatives[{hs, whyNot|reason}], supplier, mic } (engine-loop) — tuỳ chọn.
 *   gathered: { ozPrecedents[{hs, name, oz, cov}] } — tuỳ chọn. materialTexts: chữ bổ sung để dò vật liệu
 *   (ô chất liệu, thông số) sau product.material; partTexts: chữ để nhận ra hàng là bộ phận/tấm/vỏ (tên gốc).
 * Trả ≤ 4 phương án, đúng 1 khuyenNghi (mã chọn). Thứ tự ưu tiên khi cắt: chọn → cùng nhóm → vật liệu → khác.
 */
function buildDeclarationOptions({ top, results = [], dossier = null, gathered = null, origin = 'CN', review = null, materialTexts = [], partTexts = [] } = {}) {
  if (!top || nz(top.hs).length < 6) return [];
  const product = dossier?.product || null;
  const decision = String(dossier?.decision || '').toUpperCase();
  let chosen; try { chosen = chosenOption(top, { decision, review, origin }); } catch { return []; }
  const safe = (fn) => { try { return fn(); } catch { return []; } };
  const alts = safe(() => alternativeOptions(top, results, dossier, origin));
  const mats = safe(() => materialOptions(top, { product, materialTexts, partTexts, origin }));
  const ext = safe(() => externalOptions(top, { dossier, gathered, origin }));
  const sameGroup = alts.filter((a) => a.kind === 'CUNG_NHOM');
  const other = [...alts.filter((a) => a.kind === 'KHAC'), ...ext];
  // AI vòng 2 đã cân nhắc đúng mã của đường vật liệu/nguồn ngoài rồi loại → giữ phương án đó, ghi thêm lý do AI loại.
  for (const m of [...mats, ...ext]) {
    const dup = alts.find((a) => a.hs === m.hs);
    if (dup) m.ghiChuVi = clip(dup.canCuVi, 200);
  }
  const ordered = [chosen, sameGroup[0], mats[0], other[0], mats[1], sameGroup[1], ...other.slice(1), ...sameGroup.slice(2)].filter(Boolean);
  const seen = new Set();
  return ordered.filter((o) => (seen.has(o.hs) ? false : (seen.add(o.hs), true))).slice(0, MAX_OPTIONS);
}

module.exports = { buildDeclarationOptions, detectMainMaterial, isPartLike, materialTable };
