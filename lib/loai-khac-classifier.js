/**
 * loai-khac-classifier.js
 *
 * Reasoning engine: cho một sản phẩm + heading code, suy luận qua từng sibling
 * để kết luận có phải "Loại khác" không và TẠI SAO.
 *
 * Không dùng AI API — pure elimination logic từ:
 *   1. Product characteristics (tenHang, chatLieu, congDung, specs)
 *   2. Sibling criteria (vn, baoGom) từ loai-khac-index
 *
 * Export: reasonLoaiKhac(product, hsHint?) → ReasoningResult
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Load index once at module init
const INDEX_PATH = path.join(__dirname, '..', 'data', 'loai-khac-index.json');
let _index = null;
function getIndex() {
  if (!_index) _index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  return _index;
}

// --------------------------------------------------------------------------
// Text normalisation — Vietnamese-aware via Unicode NFD decomposition
// --------------------------------------------------------------------------

function norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip all combining diacritical marks
    .replace(/đ/g, 'd')               // đ (U+0111) has no NFD decomposition
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract meaningful keywords (skip stopwords)
const STOP = new Set(['cac', 'cua', 'va', 'hoac', 'la', 'de', 'trong', 'co', 'khong',
  'phai', 'loai', 'khac', 'hang', 'san', 'pham', 'nay', 'do', 'mot', 'hai',
  'the', 'bang', 'tren', 'duoi', 'theo', 'tu', 'ra', 'vao', 'len', 'xuat',
  'nhap', 'dung', 'cho', 'voi', 'sau', 'thi', 'da', 'duoc', 'khi', 'nhu']);

function keywords(s) {
  return norm(s).split(' ').filter(w => w.length >= 3 && !STOP.has(w));
}

function overlap(kws1, kws2) {
  const set = new Set(kws1);
  return kws2.filter(w => set.has(w)).length;
}

// --------------------------------------------------------------------------
// Extract "không phải X" denials from congDung
// → explicit evidence product is NOT X
// --------------------------------------------------------------------------

function extractDenials(congDung) {
  // Work on raw text to preserve commas as delimiters (norm() strips them)
  const raw = (congDung || '');
  const denials = [];
  const m1 = raw.match(/(?:không phải|không là|ngoại trừ|trừ loại)([^).\n]{0,200})/i);
  if (m1) {
    denials.push(...m1[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1));
  }
  return denials;
}

// --------------------------------------------------------------------------
// Discriminating words — nếu sibling có những từ này mà product KHÔNG có → non-match
// --------------------------------------------------------------------------

const DISCRIMINATING_WORDS = [
  'ngam',        // submarine (cáp ngầm)
  'san bay',     // airport
  'tau',         // ship/vessel
  'quan su',     // military
  'y te',        // medical
  'gat tan',     // ashtray
  'hop dung',    // box/container
];

// Contradiction pairs: if product has word A and sibling has word B (or vice versa) → non-match
const CONTRADICTIONS = [
  ['den',  'mau'],     // black pencil vs colored pencil
  ['den',  'trang'],   // black vs white
  ['tuoi', 'kho'],     // fresh vs dry
  ['dien', 'thu cong'],// electric vs manual
  ['man',  'ngot'],    // salty vs sweet
  ['xang', 'dien'],    // petrol vs electric (xe xăng vs xe điện)
];

// --------------------------------------------------------------------------
// Core: check if a product MATCHES a sibling's criteria
// Key fix: prodKws uses tenHang + chatLieu only (NOT congDung) for positive matching
//          congDung is used exclusively for denial extraction
// --------------------------------------------------------------------------

function checkSiblingMatch(product, sibling) {
  // Positive match: use tenHang + chatLieu only (congDung may contain "không phải X" pollution)
  const prodKwsPos = keywords([product.tenHang, product.chatLieu, product.specs].join(' '));
  const sibKws     = [...new Set(keywords([sibling.v, sibling.baoGom || ''].join(' ')))];
  const sibName    = norm(sibling.v);
  const prodNorm   = norm([product.tenHang, product.chatLieu, product.congDung].join(' '));

  // 1. Explicit denial in congDung → definitive non-match
  const denials = extractDenials(product.congDung);
  for (const denial of denials) {
    const denKws = keywords(denial);
    if (overlap(denKws, sibKws) >= 2 || (overlap(denKws, sibKws) >= 1 && denKws.length <= 3)) {
      return {
        match: false,
        confidence: 0.95,
        reason: `congDung khai rõ "không phải..." — loại trừ trực tiếp "${sibling.v.replace(/^[-\s]+/, '')}"`,
      };
    }
  }

  // 2. Contradiction pairs — product has word directly contradicting sibling's word
  const prodKwsAll = keywords([product.tenHang, product.chatLieu, product.congDung].join(' '));
  for (const [wA, wB] of CONTRADICTIONS) {
    const prodHasA = prodKwsAll.includes(wA), prodHasB = prodKwsAll.includes(wB);
    const sibHasA  = sibKws.includes(wA),     sibHasB  = sibKws.includes(wB);
    if ((prodHasA && sibHasB) || (prodHasB && sibHasA)) {
      return {
        match: false,
        confidence: 0.88,
        reason: `Mâu thuẫn trực tiếp: sản phẩm có "${prodHasA ? wA : wB}", sibling yêu cầu "${sibHasA ? wA : wB}"`,
      };
    }
  }

  // 3. Discriminating words in sibling absent from product → non-match
  for (const disc of DISCRIMINATING_WORDS) {
    const sibHasDisc  = sibName.includes(disc) || sibKws.includes(disc);
    const prodHasDisc = prodNorm.includes(disc);
    if (sibHasDisc && !prodHasDisc) {
      return {
        match: false,
        confidence: 0.82,
        reason: `Sibling yêu cầu đặc điểm chuyên biệt "${disc}" — sản phẩm không có đặc điểm này`,
      };
    }
  }

  // 4. Positive keyword match — use tenHang + chatLieu only (NOT congDung)
  //    Score = hit / sibKws.length: what % of sibling's criteria are met by product
  //    (not min(prod,sib) — avoids inflating score when product has many unrelated words)
  const hit = overlap(prodKwsPos, sibKws);
  const sibLen = sibKws.length;
  if (sibLen === 0) {
    return { match: false, confidence: 0.5, reason: 'Không đủ thông tin để đối chiếu' };
  }
  const score = hit / sibLen;

  if (score >= 0.80) {  // require ≥80% of sibling criteria present in product
    return {
      match: true,
      confidence: Math.min(0.9, score),
      reason: `Từ khóa trùng ${hit}/${sibLen}: "${prodKwsPos.slice(0, 3).join(', ')}" khớp tiêu chí "${sibling.v.replace(/^[-\s]+/, '').slice(0, 50)}"`,
    };
  }

  // 5. Material mismatch — sibling requires specific material, product has different
  const MAT_PAIRS = [
    [['da thuoc', 'da that'], ['nhua', 'vai', 'kim loai', 'cao su']],
    [['thuy tinh'],           ['nhua', 'kim loai', 'go']],
    [['go'],                  ['nhua', 'thuy tinh', 'kim loai']],
    [['dong'],                ['nhom', 'thep', 'nhua']],
  ];
  for (const [sibMats, otherMats] of MAT_PAIRS) {
    const sibHasMat    = sibMats.some(m => sibKws.some(k => k.includes(m)));
    const prodHasOther = otherMats.some(m => keywords(product.chatLieu || '').some(k => k.includes(m)));
    if (sibHasMat && prodHasOther) {
      return {
        match: false,
        confidence: 0.8,
        reason: `Chất liệu không khớp: sibling yêu cầu [${sibMats[0]}], sản phẩm là "${product.chatLieu}"`,
      };
    }
  }

  return {
    match: false,
    confidence: 0.6,
    reason: `Không tìm thấy đặc điểm đặc trưng của "${sibling.v.replace(/^[-\s]+/, '').slice(0, 50)}" trong mô tả sản phẩm`,
  };
}

// --------------------------------------------------------------------------
// Main export: reason through all siblings for a heading
// --------------------------------------------------------------------------

/**
 * @param {object} product  { tenHang, chatLieu, congDung, specs?, hsHint? }
 * @param {string} [hsHint] 8-digit HS code hint (to identify heading6)
 * @returns {object} ReasoningResult
 */
function reasonLoaiKhac(product, hsHint) {
  const index = getIndex();

  // Determine heading6 to search
  const heading6 = hsHint ? hsHint.slice(0, 6) : null;

  // Find all Loại khác codes in this heading6
  const candidates = Object.entries(index)
    .filter(([hs]) => !heading6 || hs.startsWith(heading6));

  if (candidates.length === 0) {
    return { ok: false, error: `Không tìm thấy mã Loại khác nào trong nhóm ${heading6}` };
  }

  // For each candidate LK code, run sibling elimination
  const results = candidates.map(([hs, lkRec]) => {
    const siblings = (lkRec.s || []);

    // No siblings → standalone residual, always applies
    if (siblings.length === 0) {
      return {
        hs,
        isLoaiKhac: true,
        confidence: 0.7,
        riskLevel: lkRec.r,
        dutyGap: lkRec.g,
        steps: [],
        conclusion: `Mã ${hs} là mã duy nhất trong nhóm ${hs.slice(0, 6)} — áp dụng mặc định cho hàng thuộc nhóm này`,
        exclusionNote: lkRec.en || null,
      };
    }

    // Run elimination for each sibling
    const steps = siblings.map(sib => {
      const { match, confidence, reason } = checkSiblingMatch(product, sib);
      return {
        siblingHs: sib.h,
        siblingName: (sib.v || '').replace(/^[-\s]+/, '').slice(0, 60),
        siblingDuty: sib.t,
        match,
        confidence,
        reason,
      };
    });

    const matched = steps.filter(s => s.match);
    const rejected = steps.filter(s => !s.match);
    const isLoaiKhac = matched.length === 0;

    // Confidence: average of rejection confidences
    const avgConf = rejected.reduce((s, x) => s + x.confidence, 0) / (rejected.length || 1);
    const finalConf = isLoaiKhac ? Math.min(0.95, avgConf) : 0.1;

    let conclusion;
    if (isLoaiKhac) {
      conclusion = `Tất cả ${siblings.length} mã cụ thể bị loại trừ → Mã ${hs} (Loại khác) là đúng`;
      if (lkRec.g >= 20) {
        conclusion += `. ⚠ AUDIT RISK: chênh thuế ${lkRec.g}% với mã cụ thể`;
      }
    } else {
      const m = matched[0];
      conclusion = `Sản phẩm có thể thuộc mã cụ thể ${m.siblingHs} "${m.siblingName}" → KHÔNG nên dùng Loại khác`;
    }

    return {
      hs,
      isLoaiKhac,
      confidence: finalConf,
      riskLevel: lkRec.r,
      dutyGap: lkRec.g,
      steps,
      conclusion,
      exclusionNote: lkRec.en || null,
      auditRisk: lkRec.ar || null,
    };
  });

  // Return best matching result (the one where isLoaiKhac === true with highest confidence)
  const best = results.filter(r => r.isLoaiKhac).sort((a, b) => b.confidence - a.confidence)[0]
            || results[0];

  return {
    ok: true,
    product: { tenHang: product.tenHang, chatLieu: product.chatLieu, congDung: product.congDung },
    result: best,
    allCandidates: results.length,
  };
}

module.exports = { reasonLoaiKhac };
