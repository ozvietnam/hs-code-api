const fs = require('fs');
const path = require('path');
const { taxData, normalizeHs, getTaxRecord } = require('./data');
const { getEnrichedForHs, clearEnrichedCache, normalizeHsKey } = require('./enriched-data');

const TAX_PATH = path.join(process.cwd(), 'data', 'tax.json');
const ENRICHED_PATH = path.join(process.cwd(), 'data', 'tax-enriched.json');
const AUDIT_PATH = path.join(process.cwd(), 'data', 'audit-log.jsonl');

const ALLOWED_PATCH_KEYS = new Set([
  'nameVi',
  'nameEn',
  'discriminatingFeatures',
  'warnings',
]);

function ensureWritable() {
  fs.mkdirSync(path.dirname(TAX_PATH), { recursive: true });
  const probe = path.join(process.cwd(), 'data', '.admin-write-probe');
  fs.writeFileSync(probe, 'ok', 'utf8');
  fs.unlinkSync(probe);
}

function loadEnrichedMap() {
  if (!fs.existsSync(ENRICHED_PATH)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(ENRICHED_PATH, 'utf8'));
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function saveEnrichedMap(map) {
  fs.writeFileSync(ENRICHED_PATH, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  clearEnrichedCache();
}

function validatePatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    const err = new Error('patch must be an object');
    err.code = 'VALIDATION';
    throw err;
  }
  const keys = Object.keys(patch);
  if (!keys.length) {
    const err = new Error('patch is empty');
    err.code = 'VALIDATION';
    throw err;
  }
  for (const key of keys) {
    if (!ALLOWED_PATCH_KEYS.has(key)) {
      const err = new Error(`Field not allowed: ${key}`);
      err.code = 'VALIDATION';
      throw err;
    }
  }
  if (patch.discriminatingFeatures != null && !Array.isArray(patch.discriminatingFeatures)) {
    const err = new Error('discriminatingFeatures must be an array');
    err.code = 'VALIDATION';
    throw err;
  }
  if (patch.warnings != null && (typeof patch.warnings !== 'object' || Array.isArray(patch.warnings))) {
    const err = new Error('warnings must be an object');
    err.code = 'VALIDATION';
    throw err;
  }
}

function appendAudit(entry) {
  fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
  fs.appendFileSync(AUDIT_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
}

function snapshotPrevious(hs) {
  const record = getTaxRecord(hs);
  const enriched = getEnrichedForHs(hs);
  return {
    nameVi: record?.vn ?? null,
    nameEn: enriched?.nameEn ?? null,
    discriminatingFeatures: enriched?.discriminatingFeatures ?? null,
    warnings: enriched?.warnings ?? null,
  };
}

function applyAdminPatch(hsCode, patch, { comment = '', admin = 'admin' } = {}) {
  validatePatch(patch);
  ensureWritable();

  const hs = normalizeHs(hsCode);
  const record = getTaxRecord(hs);
  if (!record) {
    const err = new Error(`HS code not found: ${hs}`);
    err.code = 'NOT_FOUND';
    throw err;
  }

  const previousValue = snapshotPrevious(hs);
  const applied = {};

  if (patch.nameVi !== undefined) {
    record.vn = String(patch.nameVi);
    applied.nameVi = record.vn;
  }

  const enrichedKeys = ['nameEn', 'discriminatingFeatures', 'warnings'].filter((k) => patch[k] !== undefined);
  if (enrichedKeys.length) {
    const map = loadEnrichedMap();
    const key = normalizeHsKey(hs);
    const row = { ...(map[key] || {}), hsCode: hs };
    if (patch.nameEn !== undefined) {
      row.nameEn = patch.nameEn;
      applied.nameEn = row.nameEn;
    }
    if (patch.discriminatingFeatures !== undefined) {
      row.discriminatingFeatures = patch.discriminatingFeatures;
      applied.discriminatingFeatures = row.discriminatingFeatures;
    }
    if (patch.warnings !== undefined) {
      row.warnings = { ...(row.warnings || {}), ...patch.warnings };
      applied.warnings = row.warnings;
    }
    row.updatedAt = new Date().toISOString();
    row.updatedBy = admin;
    map[key] = row;
    saveEnrichedMap(map);
  }

  if (patch.nameVi !== undefined) {
    const taxMap = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));
    if (!taxMap[hs]) {
      const err = new Error(`HS code not found in tax.json: ${hs}`);
      err.code = 'NOT_FOUND';
      throw err;
    }
    taxMap[hs].vn = record.vn;
    fs.writeFileSync(TAX_PATH, JSON.stringify(taxMap), 'utf8');
    taxData[hs] = taxMap[hs];
  }

  const auditEntry = {
    timestamp: new Date().toISOString(),
    admin,
    hsCode: hs,
    patch: applied,
    comment: comment || null,
    previousValue,
  };
  appendAudit(auditEntry);

  return { ok: true, hsCode: hs, applied, auditEntry };
}

function readAuditLog({ hsCode, limit = 50 } = {}) {
  if (!fs.existsSync(AUDIT_PATH)) return [];
  const lines = fs.readFileSync(AUDIT_PATH, 'utf8').split('\n').filter(Boolean);
  let rows = lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  if (hsCode) {
    const hs = normalizeHs(hsCode);
    rows = rows.filter((r) => r.hsCode === hs);
  }
  return rows.slice(-limit).reverse();
}

function revertToTimestamp(hsCode, toTimestamp, { admin = 'admin' } = {}) {
  const hs = normalizeHs(hsCode);
  const entries = readAuditLog({ hsCode: hs, limit: 500 });
  const target = entries.find((e) => e.timestamp === toTimestamp);
  if (!target) {
    const err = new Error('Audit entry not found for timestamp');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const restore = target.previousValue || {};
  const patch = {};
  if (restore.nameVi != null) patch.nameVi = restore.nameVi;
  if (restore.nameEn != null) patch.nameEn = restore.nameEn;
  if (restore.discriminatingFeatures != null) patch.discriminatingFeatures = restore.discriminatingFeatures;
  if (restore.warnings != null) patch.warnings = restore.warnings;
  return applyAdminPatch(hs, patch, {
    comment: `Revert to state before ${toTimestamp}`,
    admin,
  });
}

module.exports = {
  applyAdminPatch,
  revertToTimestamp,
  readAuditLog,
  validatePatch,
  ALLOWED_PATCH_KEYS,
};
