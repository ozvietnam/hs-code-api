const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(process.cwd(), 'data', 'policy-procedures.json');

let _db = null;
function loadDb() {
  if (_db) return _db;
  try { _db = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
  catch { _db = {}; }
  return _db;
}

/**
 * Normalize raw inspectionType strings from tax-enriched.json
 * to canonical procedure codes.
 */
function normalizeType(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return null;

  if (/attp|an toàn thực phẩm|food safety|ktattp/.test(s)) return 'attp';
  if (/kiểm dịch thực vật|kdtv|phytosanitary|plant quarantine/.test(s)) return 'kiem-dich-thuc-vat';
  if (/kiểm dịch động vật|kiểm dịch thủy sản|kdđv|animal quarantine|veterinary|thú y/.test(s)) return 'kiem-dich-dong-vat';
  if (/dược|thuốc|nguyên liệu làm thuốc|pharmaceutical|dược liệu/.test(s)) return 'duoc';
  if (/bức xạ|phóng xạ|hạt nhân|radiation|nuclear/.test(s)) return 'buc-xa';
  if (/hóa chất|tiền chất|chemical/.test(s)) return 'hoa-chat';
  if (/cites|động vật hoang dã|wildlife/.test(s)) return 'cites';
  if (/hiệu suất năng lượng|dán nhãn năng lượng|energy efficiency|energy label/.test(s)) return 'nang-luong';
  if (/vật liệu xây dựng|vlxd|xi măng|kính xây dựng/.test(s)) return 'vat-lieu-xd';
  if (/phế liệu|scrap|phế thải/.test(s)) return 'phe-lieu';
  if (/đăng kiểm|giao thông|bgtvt|an toàn phương tiện/.test(s)) return 'giao-thong';
  if (/văn hóa phẩm|xuất bản phẩm|phim|trò chơi|game/.test(s)) return 'giai-tri';
  if (/giấy phép nhập khẩu|hạn ngạch|quota|import license/.test(s)) return 'gp-nk';
  // Generic quality inspection (catch-all)
  if (/chất lượng|ktcl|ktcn|nhóm 2|hợp quy|atkt|bvmt\b|^\s*cl\s*$/.test(s)) return 'chat-luong';
  // Abbreviations for import/export license and business license
  if (/^\s*nk\s*$/.test(s)) return 'gp-nk';
  if (/^\s*xk\s*$/.test(s)) return 'xk';          // export license — no procedure code yet, return raw
  if (/sxkd|sản xuất\s*kinh\s*doanh|kinh\s*doanh\s*có\s*điều\s*kiện/.test(s)) return 'kd-dk';
  if (/giấy\s*phép\s*nk|giấy\s*phép\s*nhập\s*khẩu/.test(s)) return 'gp-nk';
  if (/hạn\s*ngạch|quota|import\s*license/.test(s)) return 'gp-nk';
  if (/cấm\s*nk|cấm\s*nhập\s*khẩu/.test(s)) return 'cam-nk';
  if (/đăng\s*ký\s*lưu\s*hành/.test(s)) return 'dk-luu-hanh';
  if (/công\s*bố\s*sản\s*phẩm/.test(s)) return 'cong-bo';
  if (/lâm\s*sản|kiểm\s*tra\s*nguồn\s*gốc|hs\s*lâm\s*sản/.test(s)) return 'lam-san';
  // gp-nk before xk to avoid "giấy phép kinh doanh xuất khẩu" matching xk first
  if (/giấy\s*phép\s*kinh\s*doanh\s*x?nk|giấy\s*phép\s*kinh\s*doanh\s*xuất\s*khẩu,\s*nhập\s*khẩu/.test(s)) return 'gp-nk';
  if (/xuất\s*khẩu|giấy\s*phép\s*xuất\s*khẩu|gp\s*xk|gp-xk/.test(s)) return 'xk';
  if (/hạn ngạch thuế quan/.test(s)) return 'gp-nk';
  if (/^\s*kd\s*(có\s*điều\s*kiện)?\s*$/.test(s)) return 'kd-dk';
  if (/hạn chế\s*(sản xuất\s*,?\s*)?kinh doanh/.test(s)) return 'kd-dk';
  if (/^cấm(\s|$)/.test(s)) return 'cam-nk';
  // Abbreviations and short forms
  if (/^sx\s*kd|^sxkd|sản\s*xuất\s*kinh\s*doanh/.test(s)) return 'kd-dk';
  // Restricted import / production / business — nhập khẩu hạn chế → cam-nk
  if (/nhập\s*khẩu\s*hạn\s*chế|nk\s*hạn\s*chế|hạn\s*chế\s*sản\s*x?uất|hạn\s*chế\s*kd|nk\s*có\s*điều\s*kiện/.test(s)) return 'kd-dk';
  if (/hạn\s*chế\s*sx|hạn\s*chế\s*kinh\s*doanh|giấy\s*phép\s*kinh\s*doanh\s*hạn\s*chế|sản\s*xuất,?\s*kinh\s*doanh\s*hạn\s*chế|kinh\s*doanh\s*hạn\s*chế/.test(s)) return 'kd-dk';
  // Import of prohibited substance → cam-nk
  if (/nhập\s*khẩu\s*chất\s*cấm/.test(s)) return 'cam-nk';
  // TNTX (Tự nghiệm thu xuất khẩu?) — treat as export license
  if (/giấy\s*phép\s*tntx|tntx/.test(s)) return 'xk';
  // Chỉ định (designation/quota) → kd-dk
  if (/^chỉ\s*định$/.test(s)) return 'kd-dk';
  // CR abbreviation
  if (/^cr$/.test(s)) return 'chat-luong';
  // Pre-clearance certification — chứng nhận trước thông quan → chat-luong (quality/pre-clearance)
  if (/chứng\s*nhận\s*trước\s*thông\s*quan/.test(s)) return 'chat-luong';
  // chuyên ngành (standalone, without specific sector) → chat-luong
  if (/^chuyên\s*ngành$/.test(s)) return 'chat-luong';
  // KTNN về CL khi NK — kiểm tra nghiệm thu năng lượng / chất lượng khi NK → chat-luong
  if (/ktnn\s*về\s*cl\s*khi\s*nk|kiểm\s*tra\s*tiêu\s*chuẩn\s*khoáng\s*sản/.test(s)) return 'chat-luong';
  // An toàn as a standalone type → chat-luong (safety inspection)
  if (/^an\s*toàn$/.test(s)) return 'chat-luong';
  // đã cắt giảm → chat-luong (reduced inspection)
  if (/^đã\s*cắt\s*giảm$/.test(s)) return 'chat-luong';
  // chứng nhận trước khi thông quan → chat-luong
  if (/chứng\s*nhận\s*trước\s*khi\s*thông\s*quan/.test(s)) return 'chat-luong';
  // kiểm tra hàng hóa có khả năng gây mất an toàn → chat-luong
  if (/kiểm\s*tra\s*hàng\s*hóa\s*có\s*khả\s*năng\s*gây\s*mất\s*an\s*toàn/.test(s)) return 'chat-luong';
  if (/^giấy\s*phép\s*xk|^gp\s*xk|^gp-xk/.test(s)) return 'xk';
  if (/giấy\s*phép\s*môi\s*trường/.test(s)) return 'chat-luong';
  if (/tự\s*công\s*bố/.test(s)) return 'cong-bo';
  if (/năng\s*lượng|dán\s*nhãn\s*năng\s*lượng/.test(s)) return 'nang-luong';
  if (/kiểm\s*tra\s*chuyên\s*ngành\s*đã\s*cắt\s*giảm/.test(s)) return 'chat-luong';
  if (/kiểm\s*tra\s*chuyên\s*ngành/.test(s)) return 'chat-luong';
  if (/chứng\s*nhận\s*bảo\s*vệ\s*môi\s*trường/.test(s)) return 'chat-luong';
  if (/đo\s*lường/.test(s)) return 'chat-luong';
  if (/^cnhq$/.test(s)) return 'chat-luong';
  if (/hậu\s*kiểm/.test(s)) return 'chat-luong';
  if (/cắt\s*giảm\s*kiểm\s*tra/.test(s)) return 'chat-luong';
  return null;
}

/**
 * Build chapter → [procedureCodes] map from chapter-group entries.
 * Lazy-initialized so it's only built when needed (only for fallback path).
 */
let _chapterToProcs = null;
function buildChapterToProcs() {
  if (_chapterToProcs) return _chapterToProcs;
  const db = loadDb();
  const procTypes = new Set(Object.keys(db).filter(k => !!db[k].chapters));
  _chapterToProcs = {};
  for (const cgCode of procTypes) {
    const cg = db[cgCode];
    for (const ch of (cg.chapters || [])) {
      if (!_chapterToProcs[ch]) _chapterToProcs[ch] = [];
      for (const p of (cg.procedures || [])) {
        if (!_chapterToProcs[ch].includes(p)) _chapterToProcs[ch].push(p);
      }
    }
  }
  return _chapterToProcs;
}

/**
 * getProcedures(warnings, hsCode?) → [{...procedure, matchedRaw}]
 * Given a warnings object from tax-enriched.json, return applicable procedures.
 *
 * When warnings yields no procedures but hsCode is provided, falls back to
 * chapter-group procedures — the policy attached to the chapter rather than
 * the individual HS entry. This fills the ~22% of HS codes that have no
 * inspection/license flags set in tax-enriched but whose chapter still
 * carries procedures (e.g. chapter 13 → chat-luong).
 *
 * Fallback results are marked with matchedRaw = 'chapter-group:{chapter}' so
 * callers can distinguish them from explicit warning matches.
 */
function getProcedures(warnings, hsCode) {
  if (!warnings) warnings = {};
  const db = loadDb();
  const seen = new Set();
  const results = [];

  const rawTypes = [
    ...(warnings.inspectionTypes || []),
    ...(warnings.licenseTypes || []),
    ...(warnings.requiresQuarantine ? ['kiểm dịch thực vật'] : []),
  ];

  for (const raw of rawTypes) {
    const code = normalizeType(raw);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const proc = db[code];
    if (proc) results.push({ ...proc, matchedRaw: raw });
  }

  // Special: CITES from licenseTypes
  if ((warnings.licenseTypes || []).some(t => /cites/i.test(t)) && !seen.has('cites')) {
    const proc = db['cites'];
    if (proc) results.push({ ...proc, matchedRaw: 'CITES' });
  }

  // Special: used goods import ban → cam-nk
  if (warnings.usedGoodsImportBan && !seen.has('cam-nk')) {
    const proc = db['cam-nk'];
    if (proc) results.push({ ...proc, matchedRaw: 'usedGoodsImportBan' });
  }

  // Fallback: if no procedures found but hsCode provided, use chapter-group procedures
  if (results.length === 0 && hsCode) {
    const chapter = String(hsCode).slice(0, 2);
    const chapterProcs = buildChapterToProcs()[chapter];
    if (chapterProcs && chapterProcs.length > 0) {
      for (const code of chapterProcs) {
        if (!seen.has(code)) {
          seen.add(code);
          const proc = db[code];
          if (proc) results.push({ ...proc, matchedRaw: `chapter-group:${chapter}` });
        }
      }
    }
  }

  return results.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });
}

/** Get procedure by canonical code. */
function getProcedureByCode(code) {
  return loadDb()[code] || null;
}

/** List all procedures (for documentation/admin). */
function listProcedures() {
  return Object.values(loadDb());
}

module.exports = { getProcedures, getProcedureByCode, listProcedures, normalizeType };
