const { precedentsData, normalizeHs } = require('./data');
const wcoOp = require('./wco-op');
const fs = require('fs');
const path = require('path');

let flatIndex = null;

// ─────────────────────────────────────────────────────────────────────────────
// Tier-1 synonyms index (issue #309, #311): chỉ dùng data/synonyms.json với
// nhãn phapLy:true + nhan:"NGUYEN_VAN". Tuyệt đối KHÔNG sinh từ mới, KHÔNG
// index tự do. Hai mục đích:
//   (a) seed tăng điểm: query EN chứa cụm nguyên văn → suy ra HS → boost
//   (b) mở rộng token cho precedent: cụm tier-1 cho cùng HS được thêm vào token
//       set để query có thể khớp dù văn bản gốc tiền lệ không có cụm đó
//       (vd tiền lệ CBP-M82907 HS 847989 có token "machines and mechanical
//       appliances" từ tier-1).
// ─────────────────────────────────────────────────────────────────────────────
let tier1ByHs = null; // hs (4,6,8) → Set<token> (token từ các cụm tier-1 cho HS đó)
let tier1PhraseIndex = null; // phraseTokens → Set<hs> (dùng để boost ngược)

function loadTier1() {
  if (tier1ByHs && tier1PhraseIndex) return;
  tier1ByHs = new Map();
  tier1PhraseIndex = new Map();
  let syn;
  try {
    syn = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'synonyms.json'), 'utf8'));
  } catch {
    return; // test cô lập / bản sao chưa có → không seed
  }
  const muc = syn.muc || {};
  for (const [hs, entries] of Object.entries(muc)) {
    const tokens = new Set();
    for (const e of entries) {
      // LUẬT SẮT tier-1: chỉ phapLy:true + nhan:"NGUYEN_VAN". Mọi mục khác BỎ QUA.
      if (!(e.phapLy === true && e.nhan === 'NGUYEN_VAN')) continue;
      const phraseTokens = tokenize(e.en);
      if (!phraseTokens.length) continue;
      for (const t of phraseTokens) tokens.add(t);
      // Index cụm (nguyên văn, đã chuẩn hoá) → HS, dùng để boost khi query khớp.
      const phraseKey = phraseTokens.join(' ');
      if (!tier1PhraseIndex.has(phraseKey)) tier1PhraseIndex.set(phraseKey, new Set());
      tier1PhraseIndex.get(phraseKey).add(hs);
    }
    if (tokens.size) tier1ByHs.set(hs, tokens);
  }
}

// Cụm tier-1 nào có ≥50% token trùng với query? Trả Set<hs>.
// LUẬT chặt (không lift lung tung): cụm tier-1 chỉ tính là khớp khi
//   (a) cụm có ≥3 token mang nghĩa (đã bỏ stop-word) VÀ overlap ≥2 + ratio ≥0.5,
//   HOẶC (b) cụm có 2 token mang nghĩa VÀ khớp 2/2 (100%).
// → tránh "retainer box" (HS 732393, 1/2 = 50%) bị nhận là khớp khi user hỏi glove box.
const STOP_TOKENS = new Set([
  'and', 'or', 'the', 'of', 'for', 'in', 'this', 'other', 'included', 'not',
  'n.e.c', 'n.e.c.', 'having', 'are', 'be', 'by', 'with', 'their', 'to', 'from',
  'as', 'an', 'a', 'i', 'ii', 'iii', 'its', 'on', 'at', 'no', 'so',
]);
function tier1HsForQuery(queryTokens) {
  loadTier1();
  const hits = new Map(); // hs → {exact: count, stem: count}
  const q = new Set(queryTokens);
  const qStem = new Set([...q].map(stemLight));
  for (const [phraseKey, hsSet] of tier1PhraseIndex.entries()) {
    const phraseTokens = phraseKey.split(' ').filter((t) => t.length >= 2);
    const meaningful = phraseTokens.filter((t) => !STOP_TOKENS.has(t) && t.length >= 3);
    if (!meaningful.length) continue;
    const overlapExact = meaningful.filter((t) => q.has(t)).length;
    const overlapStem = meaningful.filter((t) => qStem.has(stemLight(t))).length;
    const overlap = Math.max(overlapExact, overlapStem);
    const ratio = overlap / meaningful.length;
    let matched = false;
    if (meaningful.length >= 4 && overlap >= 2 && ratio >= 0.4) matched = true;
    if (meaningful.length === 3 && overlap >= 2 && ratio >= 0.5) matched = true;
    if (meaningful.length === 3 && overlap === 1 && stemOnlyPhrasesMatch(meaningful, qStem)) matched = true;
    if (meaningful.length === 2 && overlap === 2 && ratio === 1) matched = true;
    if (meaningful.length <= 2 && ratio === 1 && meaningful[0] && meaningful[0].length >= 5) matched = true;
    if (matched) {
      for (const hs of hsSet) {
        const prev = hits.get(hs) || { exact: 0, stem: 0 };
        prev.exact = Math.max(prev.exact, overlapExact);
        prev.stem = Math.max(prev.stem, overlapStem);
        hits.set(hs, prev);
      }
    }
  }
  return hits;
}

// Khi cụm có 3 token có nghĩa và chỉ khớp 1 qua stem, đòi hỏi token đó là CHUYÊN NGÀNH
// (>=6 ký tự và không phải generic) để tránh "lamps" stem-match "lamp" trong cụm "Lamps; sealed beam units".
function stemOnlyPhrasesMatch(meaningful, qStem) {
  if (meaningful.length !== 3) return false;
  const matchedOnes = meaningful.filter((t) => qStem.has(stemLight(t)));
  if (matchedOnes.length !== 1) return false;
  const token = matchedOnes[0];
  // Token phải đủ dài (chuyên ngành) và qStem phải có dạng khác (stem khớp nhau không phải "exact").
  return token.length >= 6;
}

// HS nào thuộc kho tiền lệ? (để boost) — thử 8 → 6 → 4 số.
function tier1HsTokens(hs) {
  loadTier1();
  const h = String(hs || '').replace(/\D/g, '');
  return tier1ByHs.get(h)
    || (h.length >= 8 ? tier1ByHs.get(h.slice(0, 6)) : null)
    || (h.length >= 6 ? tier1ByHs.get(h.slice(0, 4)) : null)
    || (h.length >= 4 ? tier1ByHs.get(h.slice(0, 2)) : null)
    || null;
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

// Light prefix stem (5-char) — để "purification" khớp "purifying" (cùng 5-char prefix "purif").
// Không sinh từ mới, không thay đổi kho: chỉ là ánh xạ token → không gian so sánh.
function stemLight(token) {
  return String(token || '').toLowerCase().slice(0, 5);
}

const INT_TYPE_BY_SOURCE = {
  'CBP-CROSS-RULING': { source: 'RULING_CBP', loaiNguon: 'RULING_CBP', instrumentType: 'RULING' },
  'ABF-TCO': { source: 'TCO_ABF', loaiNguon: 'TCO_ABF', instrumentType: 'TCO' },
  'TB-TCHQ': { source: 'TB-TCHQ', loaiNguon: 'TB-TCHQ', instrumentType: null },
};
const TCO_BAN_CHAT = 'TCO = mã do người đề xuất khai, ABF phê duyệt — không phải phán quyết trọng tài.';

// B-7 xacMinh — TẤT ĐỊNH từ field sẵn có (brief #311). KHÔNG fetch URL lúc request.
// NGUON_A: có đủ sourceUrl + snapshotHash + retrievedAt. WCO OP thuộc Compendium chính thức
// có id+line truy nguyên được + doTinCay === 'CHAC' (mã đọc thẳng từ tiêu đề OCR) → cũng NGUON_A.
// NGUON_B: ≥2 nguồn độc lập cùng outcome cho cùng mã (đếm sau khi cả bảng đã dựng).
// CHUA: còn lại — bao gồm TB-TCHQ không có snapshotHash/retrievedAt.
function computeXacMinhStrict(p) {
  if (p.snapshotHash && p.retrievedAt && p.sourceUrl) return 'NGUON_A';
  if (p.source === 'WCO_OP' && p.doTinCay === 'CHAC') return 'NGUON_A';
  return 'CHUA';
}

function banChatFor(p) {
  return p.instrumentType === 'TCO' ? TCO_BAN_CHAT : null;
}

function loadFlatPrecedents() {
  if (flatIndex) return flatIndex;
  loadTier1();
  flatIndex = [];

  // (1) TB-TCHQ + intl (CBP/ABF) — intl nằm cùng precedentsData, tách bằng sourceType.
  for (const [finalHsCode, list] of Object.entries(precedentsData)) {
    const items = Array.isArray(list) ? list : [];
    for (const p of items) {
      const st = String(p.sourceType || 'TB-TCHQ');
      const meta = INT_TYPE_BY_SOURCE[st] || { source: 'TB-TCHQ', loaiNguon: 'TB-TCHQ', instrumentType: null };
      const normHs = normalizeHs(finalHsCode);
      const seedTokens = tier1HsTokens(normHs) || new Set();
      // Augment: thêm token từ tier-1 phrases cho cùng HS để query có thể khớp dù văn bản gốc không có cụm.
      const head = tokenize(headOf(p.productName));
      const name = tokenize(p.productName);
      const spec = tokenize([p.technicalSpec, p.tbTchqNumber].filter(Boolean).join(' '));
      flatIndex.push({
        precedentId: `tb-${String(p.tbTchqNumber || 'unknown').replace(/\//g, '-')}`,
        source: meta.source,
        loaiNguon: meta.loaiNguon,
        instrumentType: meta.instrumentType,
        country: p.country || (meta.source === 'TB-TCHQ' ? 'VN' : null),
        tbTchqNumber: p.tbTchqNumber,
        productNameRaw: p.productName,
        technicalSpec: p.technicalSpec,
        finalHsCode: normHs,
        outcome: p.outcome && /^\d{8}$/.test(String(p.outcome)) ? 'APPROVED' : String(p.outcome || 'APPROVED'),
        outcomeHs: String(p.outcome || normHs).replace(/\D/g, '').padStart(8, '0').slice(0, 8),
        year: p.year,
        issuedDate: p.issuedDate || null,
        sourceUrl: p.sourceUrl || null,
        sourceFile: p.sourceFile,
        snapshotHash: p.snapshotHash || null,
        retrievedAt: p.retrievedAt || null,
        // token sets — KHÔNG gộp tier-1 phrase tokens vào head/name (làm loãng covH);
        // chỉ gộp vào _specTokens để query có thể khớp qua cụm tier-1 (cửa phụ).
        _headTokens: new Set(head),
        _nameTokens: new Set(name),
        _specTokens: new Set([...spec, ...seedTokens]),
        // B-7: nhãn xác minh — tính trước cho mỗi record (NGUON_A/CHUA); NGUON_B cần biết
        // cả bảng → set sau ở giai đoạn finalize.
        _xacMinhBase: computeXacMinhStrict({ snapshotHash: p.snapshotHash, retrievedAt: p.retrievedAt, sourceUrl: p.sourceUrl, source: meta.source, doTinCay: null }),
      });
    }
  }

  // (2) WCO OP — qua lib/wco-op.js. Không có productName/technicalSpec; dùng section +
  // đoạn đầu text làm "tên", toàn văn làm "mô tả". Augment tier-1 cùng HS (đã làm ở các
  // record TB-TCHQ cùng HS — WCO HS trùng với HS trong precedentsData).
  for (const o of wcoOp.byHs('').length ? wcoOp.byHs('') : []) { /* no-op — sẽ load thẳng danh sách */ }
  // wco-op không export list trực tiếp; load qua nội bộ cache.
  const wcoList = (() => {
    // eslint-disable-next-line no-undef
    const fs2 = require('fs');
    try {
      return JSON.parse(fs2.readFileSync(path.join(process.cwd(), 'data', 'wco-op', 'opinions.json'), 'utf8'));
    } catch {
      return [];
    }
  })();
  for (const o of wcoList) {
    if (o.headingSuspect) continue; // cổng mã — bỏ ý kiến chưa qua cổng
    const hs6 = String(o.hs || '').padStart(6, '0').slice(0, 6);
    const hs8 = (hs6 + '0000').slice(0, 8);
    const normHs = normalizeHs(hs8);
    const doTinCay = wcoOp.doTinCay(o);
    const section = String(o.section || '').split('—')[0].trim();
    const productName = `${section} — WCO opinion ${o.hs}/${o.ord}`;
    const spec = String(o.text || '');
    const seedTokens = tier1HsTokens(normHs) || new Set();
    const head = tokenize(productName);
    const name = tokenize(productName);
    const sp = tokenize(spec);
    flatIndex.push({
      precedentId: `wco-op-${o.hs}-${o.ord}`,
      source: 'WCO_OP',
      loaiNguon: 'WCO_OP',
      instrumentType: 'WCO_OPINION',
      country: 'WCO',
      tbTchqNumber: null,
      productNameRaw: productName,
      technicalSpec: spec,
      finalHsCode: normHs,
      outcome: 'APPROVED',
      outcomeHs: hs8,
      year: o.adoption || null,
      issuedDate: o.adoption ? `${o.adoption}-01-01` : null,
      sourceUrl: `/api/wco-opinions?hs=${o.hs}&n=${o.ord}`,
      sourceFile: `wco-op/${o.hs}.${o.ord}`,
      snapshotHash: null,
      retrievedAt: null,
      doTinCay,
      _headTokens: new Set(head),
      _nameTokens: new Set(name),
      _specTokens: new Set([...sp, ...seedTokens]),
      _xacMinhBase: computeXacMinhStrict({ snapshotHash: null, retrievedAt: null, sourceUrl: null, source: 'WCO_OP', doTinCay }),
      wcoLine: o.line || null,
    });
  }

  buildIdf(flatIndex);
  finalizeXacMinhNGUON_B(flatIndex);
  return flatIndex;
}

// NGUON_B: ≥2 nguồn ĐỘC LẬP (loaiNguon khác + domain khác — domain khác nhau cho URL ngoài)
// cùng outcomeHs. Đếm SAU khi đã dựng index để có đủ thông tin so sánh.
function finalizeXacMinhNGUON_B(index) {
  // Gom record theo outcomeHs (chuẩn 8 số)
  const byHs = new Map();
  for (const p of index) {
    const k = p.outcomeHs || p.finalHsCode;
    if (!byHs.has(k)) byHs.set(k, []);
    byHs.get(k).push(p);
  }
  for (const p of index) {
    if (p._xacMinhBase === 'NGUON_A') { p.xacMinh = 'NGUON_A'; continue; }
    const peers = byHs.get(p.outcomeHs || p.finalHsCode) || [];
    const indep = peers.filter((q) => q !== p && q.loaiNguon !== p.loaiNguon && (q.sourceUrl || '') !== (p.sourceUrl || ''));
    p.xacMinh = indep.length >= 1 ? 'NGUON_B' : 'CHUA';
  }
}

// IDF trên toàn kho tiền lệ: từ xuất hiện ở khắp nơi ("thuoc", "nhom", "ma",
// "danh", "muc"…) gần như không có trọng số; từ hiếm ("pentax", "lm8uu") nặng.
let idfMap = null;
let idfDefault = 1;
function buildIdf(index) {
  const df = new Map();
  for (const p of index) {
    const seen = new Set([...p._nameTokens, ...p._specTokens]);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const n = index.length || 1;
  idfMap = new Map();
  for (const [t, d] of df) idfMap.set(t, Math.log((n + 1) / (d + 1)) + 1);
  idfDefault = Math.log(n + 1) + 1;
}
function idf(token) {
  return idfMap && idfMap.has(token) ? idfMap.get(token) : idfDefault;
}
// Trọng số của từ TRONG CÂU HỎI: từ chưa từng xuất hiện trong kho tiền lệ
// (nhãn hiệu "airtac", mã model "sc50x100") không thể khớp bất kỳ tiền lệ nào.
// Trước đây nó nhận IDF tối đa và kéo "xi lanh khí nén Airtac" từ 0,68 xuống 0,45
// — tờ khai thật luôn kèm nhãn hiệu + model. Cho về 0 hẳn thì "máy bơm Pentax"
// lại khớp 0,72 với "dầu bôi trơn máy bơm keo", nên dùng trung bình có trần.
function queryWeight(token) {
  return idfMap && idfMap.has(token) ? idfMap.get(token) : 0;
}
function oovQueryWeight(tokens) {
  const known = tokens.map(queryWeight).filter(Boolean);
  if (!known.length) return 0;
  const sum = known.reduce((x, y) => x + y, 0);
  const nOov = tokens.length - known.length;
  // Mỗi từ lạ nặng bằng trung bình các từ đã biết, và tổng từ lạ không quá
  // một nửa khối lượng từ đã biết — nhãn hiệu/model không thể nhấn chìm tên hàng.
  return nOov ? Math.min(sum / known.length, (0.5 * sum) / nOov) : 0;
}

// Phần "tên lõi" của mô tả: đoạn trước dấu ':' / ' — ' / '(' / ',' đầu tiên,
// tối đa 10 từ. "Đầu phun áp lực chất lỏng (đầu bơm piston…) : cụm gồm…" → "Đầu phun áp lực chất lỏng".
function headOf(name) {
  const raw = String(name || '');
  const cut = raw.split(/\s[—–-]\s|[:(,;]/)[0] || raw;
  return cut.split(/\s+/).slice(0, 10).join(' ');
}

/**
 * Điểm (0..0,99) = độ phủ câu hỏi × độ khớp tên lõi.
 *  - covQ: phần trọng số IDF của các từ trong CÂU HỎI được tiền lệ phủ
 *    (khớp tên lõi 1,0 · khớp phần còn lại của tên 0,8 · khớp mô tả/lý do 0,5);
 *    từ ngoài kho (nhãn hiệu, mã model) chỉ nặng bằng trung bình có trần
 *  - covH: phần trọng số IDF của TÊN LÕI tiền lệ được câu hỏi phủ — phạt tiền lệ
 *    có tên dài chứa câu hỏi ở phần phụ ("… có 03 xi lanh hành trình…")
 *  - similarity = covQ × (0,4 + 0,6·√covH); không trúng từ nào trong tên → ≤ 0,45.
 * Trước đây đếm số từ của tiền lệ trùng câu hỏi chia cho độ dài câu hỏi — lý do
 * dài lặp "thủy lực" 5 lần là chạm trần 0,99 dù tên hàng chẳng liên quan.
 */
function scorePrecedent(description, precedent) {
  const descTokens = Array.isArray(description) ? description : [...new Set(tokenize(description))];
  if (!descTokens.length) return 0;
  const headTokens = precedent._headTokens || new Set(tokenize(headOf(precedent.productNameRaw)));
  const nameTokens = precedent._nameTokens || new Set(tokenize(precedent.productNameRaw));
  const specTokens = precedent._specTokens || new Set(tokenize(precedent.technicalSpec));
  let num = 0;
  let den = 0;
  let nameHits = 0;
  const q = new Set(descTokens);
  const oovWeight = oovQueryWeight(descTokens);
  for (const t of descTokens) {
    const w = queryWeight(t) || oovWeight;
    if (!w) continue;
    den += w;
    if (headTokens.has(t)) {
      num += w;
      nameHits += 1;
    } else if (nameTokens.has(t)) {
      num += 0.8 * w;
      nameHits += 1;
    } else if (specTokens.has(t)) {
      num += 0.5 * w;
    }
  }
  if (!den) return 0;
  const covQ = num / den;
  let hNum = 0;
  let hDen = 0;
  for (const t of headTokens) {
    const w = idf(t);
    hDen += w;
    if (q.has(t)) hNum += w;
  }
  const covH = hDen ? hNum / hDen : 0;
  let similarity = covQ * (0.4 + 0.6 * Math.sqrt(covH));
  if (!nameHits) similarity = Math.min(similarity, 0.45);
  return Math.min(0.99, similarity);
}

function detectSet(description) {
  return /\b(bo|set|combo|kit|dong bo|goi)\b/i.test(normalizeText(description));
}

// Câu chữ khuôn mẫu của tờ khai ("hàng mới 100%", "hiệu X", "model Y", "xuất xứ Z")
// không nói gì về bản chất hàng — bỏ trước khi chấm, kẻo kéo độ phủ câu hỏi xuống.
// "hiệu"/"hãng" chỉ bỏ khi đứng trước tên viết hoa/mã (giữ "tín hiệu", "hiệu suất").
const BOILERPLATE_RES = [
  /\b(?:hàng\s+mới\s+100\s*%|mới\s+100\s*%|hàng\s+mới|hàng\s+cũ|đã\s+qua\s+sử\s+dụng)(?![\p{L}\d])/giu,
  /\b(?:nhãn\s+hiệu|thương\s+hiệu|hiệu|hãng\s+sx|hãng|brand)\s*[:：]?\s+(?=[A-Z0-9])/gu,
  /\b(?:model|mã\s+hàng|mã\s+sp|p\/n|part\s+no\.?|xuất\s+xứ|nhà\s+sản\s+xuất|nsx|sx)\s*[:：]?\s*/giu,
];
function stripDeclarationBoilerplate(text) {
  let out = String(text || '');
  for (const re of BOILERPLATE_RES) out = out.replace(re, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

// Tier-1 boost: query EN chứa cụm nguyên văn (phapLy:true + nhan:NGUYEN_VAN)
// → suy ra hs4/hs6 → cộng điểm cho precedent cùng HS. Phép truy xuất, không dịch sáng tạo.
//   Trọng số: hs6 / hs8 đúng (level=6) nặng hơn hs4 (level=4) — cụm tier-1 ở level 6 cụ thể
//   cho mục, cụm ở level 4 chỉ chung cho cả nhóm. Nhiều cụm khớp → cộng dồn có trần.
//   Sàn 0,16 đảm bảo record khớp qua tier-1 vượt ngưỡng 0,15 của searchPrecedents.
const TIER1_BOOST_FLOOR = 0.16;
const TIER1_BOOST_MAX = 0.30;
const TIER1_BOOST_PER_HIT = 0.04; // hs6 đúng
const TIER1_BOOST_PER_HEAD = 0.02; // hs4 (cụm heading)

function applyTier1Boost(similarity, precedent, queryTokens) {
  const hs = precedent.finalHsCode;
  const hs6 = hs.slice(0, 6);
  const hs4 = hs.slice(0, 4);
  let added = 0;
  let matched = false;
  for (const qHs of queryTokens._tier1Hs || []) {
    if (qHs === hs || qHs === hs6 || qHs === hs8(hs)) {
      matched = true; added += TIER1_BOOST_PER_HIT;
    } else if (qHs === hs4) {
      matched = true; added += TIER1_BOOST_PER_HEAD;
    } else if (hs.startsWith(qHs)) {
      matched = true; added += TIER1_BOOST_PER_HEAD;
    }
  }
  if (!matched) return similarity;
  const boost = Math.max(TIER1_BOOST_FLOOR - similarity, Math.min(added, TIER1_BOOST_MAX));
  return Math.min(0.99, similarity + boost);
}
const hs8 = (s) => String(s || '').replace(/\D/g, '').padEnd(8, '0').slice(0, 8);

function searchPrecedents(description, { topK = 5 } = {}) {
  const desc = stripDeclarationBoilerplate(description);
  if (desc.length < 3) return [];

  const index = loadFlatPrecedents();
  const descTokens = [...new Set(tokenize(desc))];
  const tier1Hits = tier1HsForQuery(descTokens);
  const queryTokensObj = [...new Set(descTokens)];
  queryTokensObj._tier1Hs = tier1Hits;
  const scored = index
    .map((precedent) => ({
      precedent,
      similarity: applyTier1Boost(scorePrecedent(queryTokensObj, precedent), precedent, queryTokensObj),
      finalHsCode: precedent.finalHsCode,
      outcome: precedent.outcome,
    }))
    // Ổn định thứ tự khi điểm bằng nhau: ưu tiên WCO_OP / RULING_CBP / TCO_ABF (cross-source)
    // → TB-TCHQ → còn lại. Giúp bộ ba (TCO + WCO + CBP) ổn định trong top 5 khi nhiều
    // record cùng điểm tier-1 boost.
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      const order = (s) => ({ WCO_OP: 0, RULING_CBP: 1, TCO_ABF: 2 })[s] ?? 99;
      return order(a.precedent.source) - order(b.precedent.source);
    });

  // Cascade boost (B-4): gom HS của TOP-N tiền lệ đã match (sim >= 0.15). MỌI tiền lệ khác
//   cùng HS (đặc biệt cross-source: WCO OP, CBP, TCO) được cộng sàn 0,16 để bộ ba xuất hiện
//   trong bảng xếp hạng — đáp ứng nghiệm thu brief. Giới hạn TOP-5 để tránh lift hàng loạt HS.
  const SIBLING_FLOOR = 0.16;
  const CASCADE_TOP_N = 5;
  const topHits = scored.filter((x) => x.similarity >= 0.15).slice(0, CASCADE_TOP_N);
  const topHsSet = new Set();
  for (const t of topHits) {
    const h = t.finalHsCode;
    topHsSet.add(h); topHsSet.add(h.slice(0, 6)); topHsSet.add(h.slice(0, 4));
  }
  for (const r of scored) {
    if (r.similarity >= SIBLING_FLOOR) continue;
    const h = r.finalHsCode;
    let depth = 0;
    if (topHsSet.has(h)) depth = 3;
    else if (topHsSet.has(h.slice(0, 6))) depth = 2;
    else if (topHsSet.has(h.slice(0, 4))) depth = 1;
    if (depth > 0) {
      r.similarity = Math.max(r.similarity, SIBLING_FLOOR);
      r._cascadeBoosted = true;
      r._cascadeDepth = depth;
    }
  }

  return scored
    .filter((x) => x.similarity >= 0.15)
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      // Khi điểm bằng nhau:
      //   (1) record cùng HS8 với top-1 > cùng HS6 > cùng HS4 > khác nhóm (cascade sâu → cùng mã)
      //   (2) nếu cùng mức cascade, ưu tiên cross-source (WCO_OP > RULING_CBP > TCO_ABF > TB-TCHQ)
      const hsDepth = (r) => (r._cascadeDepth || 0);
      if (hsDepth(b) !== hsDepth(a)) return hsDepth(b) - hsDepth(a);
      const order = (s) => ({ WCO_OP: 0, RULING_CBP: 1, TCO_ABF: 2 })[s] ?? 99;
      return order(a.precedent.source) - order(b.precedent.source);
    })
    .slice(0, topK)
    .map((r) => {
      r.loaiNguon = r.precedent.loaiNguon;
      r.instrumentType = r.precedent.instrumentType || null;
      r.country = r.precedent.country || null;
      r.sourceUrl = r.precedent.sourceUrl || null;
      r.xacMinh = r.precedent.xacMinh || 'CHUA';
      const bc = banChatFor(r.precedent);
      if (bc) r.banChat = bc;
      return r;
    });
}

// Ngưỡng: ≥ 0,5 mới đủ cộng điểm cho ứng viên đã có mã đó. KHÔNG tự đưa mã
// tiền lệ vào danh sách: đo trên 218 tên mục từ điển mâu thuẫn, ở ngưỡng 0,7 lẫn
// 0,9 cứ 2 lần đưa vào thì ~1 lần sai nhóm ("máy in nhiệt" → máy in lưới,
// "cáp nguồn" → bộ cấp nguồn LED) — khớp từ vựng không đủ tin để thêm mã.
// precedentMatches vẫn trả về để ERP/LLM tự cân nhắc.
const BOOST_MIN = 0.5;

function applyPrecedentBoost(suggestions, description) {
  const matches = searchPrecedents(description, { topK: 3 });
  const approved = matches.find((m) => m.outcome === 'APPROVED' && m.similarity >= BOOST_MIN);
  if (!approved) {
    return { suggestions, precedentMatches: matches, precedentDrove: false };
  }

  const reasoning = `Tương tự ${approved.precedent.tbTchqNumber || approved.precedent.precedentId} (${Math.round(approved.similarity * 100)}%)`;
  let touched = false;
  const boosted = suggestions.map((s) => {
    if (normalizeHs(s.hsCode) !== approved.finalHsCode) return s;
    touched = true;
    return {
      ...s,
      confidence: (Number(s.confidence) || 0) + Math.round(approved.similarity * 12),
      precedentReasoning: reasoning,
    };
  });
  if (!touched) {
    // Có tiền lệ nhưng không ứng viên nào mang mã đó: KHÔNG được gắn GIR-4 —
    // tiền lệ không quyết định gì cả (trước đây vẫn gắn, audit trail sai).
    return { suggestions, precedentMatches: matches, precedentDrove: false };
  }
  boosted.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  return {
    suggestions: boosted,
    precedentMatches: matches,
    // Chỉ là cờ "tiền lệ đã đẩy thứ hạng" — việc có trích GIR 4 hay không do lib/gir.js quyết.
    precedentDrove: true,
  };
}

// Đếm số nguồn ĐỘC LẬP (loaiNguon khác nhau + URL khác nhau) đồng thuận cùng outcomeHs.
// Dùng cho rankingSignals.soNguonDongThuan — không đưa vào basis/GIR (luật bất biến).
function countIndependentSources(finalHsCode) {
  const index = loadFlatPrecedents();
  const target = String(finalHsCode || '').replace(/\D/g, '');
  if (!target) return { total: 0, independent: 0, byLoai: {}, sample: [] };
  // Match ở mức prefix (8/6/4 số) để mã AI chốt "84213990" và tiền lệ WCO/TCO "84213900" cùng nhóm.
  // Logic: cùng nhóm khi 4 chữ số đầu giống nhau; nếu cùng 6 số → cùng phân nhóm; nếu cùng 8 số → cùng mã.
  const peers = index.filter((p) => {
    const oh = String(p.outcomeHs || p.finalHsCode || '').replace(/\D/g, '');
    if (oh === target) return true;
    const minLen = Math.min(oh.length, target.length, 4);
    if (minLen >= 4 && oh.slice(0, 4) === target.slice(0, 4)) return true;
    if (oh.length >= 6 && target.length >= 6 && oh.slice(0, 6) === target.slice(0, 6)) return true;
    return false;
  });
  if (!peers.length) return { total: 0, independent: 0, byLoai: {}, sample: [] };
  const byLoai = {};
  for (const p of peers) byLoai[p.loaiNguon] = (byLoai[p.loaiNguon] || 0) + 1;
  const seen = new Set();
  const indep = [];
  for (const p of peers) {
    const key = `${p.loaiNguon}|${p.sourceUrl || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    indep.push(p);
  }
  return {
    total: peers.length,
    independent: indep.length,
    byLoai,
    sample: indep.slice(0, 3).map((p) => ({ id: p.precedentId, loaiNguon: p.loaiNguon, sourceUrl: p.sourceUrl, xacMinh: p.xacMinh })),
  };
}

module.exports = {
  searchPrecedents,
  stripDeclarationBoilerplate,
  detectSet,
  applyPrecedentBoost,
  loadFlatPrecedents,
  countIndependentSources,
  tier1HsTokens,
  tier1HsForQuery,
  // exposed for tests
  reset: () => { flatIndex = null; tier1ByHs = null; tier1PhraseIndex = null; wcoOp.reset(); },
};