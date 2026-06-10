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
  if (/chất lượng|ktcl|ktcn|nhóm 2|hợp quy|atkt/.test(s)) return 'chat-luong';
  return null;
}

/**
 * getProcedures(warnings) → [{...procedure, matched: rawType}]
 * Given a warnings object from tax-enriched.json, return applicable procedures.
 */
function getProcedures(warnings) {
  if (!warnings) return [];
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
