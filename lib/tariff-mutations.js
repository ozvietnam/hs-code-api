const fs = require('fs');
const path = require('path');
const {
  INDEX_PATH,
  VERSIONS_DIR,
  loadIndex,
  loadTaxJsonFile,
  sha256OfFile,
  snapshotFilePath,
  resolveVersionMeta,
} = require('./tariff-versions');

const TAX_PATH = path.join(process.cwd(), 'data', 'tax.json');

function sanitizeToken(value, fallback = '') {
  const raw = String(value || fallback).trim();
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function ensureWritable() {
  fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  const probe = path.join(VERSIONS_DIR, '.write-probe');
  fs.writeFileSync(probe, 'ok', 'utf8');
  fs.unlinkSync(probe);
}

function saveIndex(index) {
  fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

function upsertVersionEntry(index, entry, { setCurrent = false } = {}) {
  const existingIdx = index.versions.findIndex(
    (v) => v.id === entry.id || v.file === entry.file,
  );
  if (existingIdx >= 0) {
    index.versions[existingIdx] = { ...index.versions[existingIdx], ...entry };
  } else {
    index.versions.push(entry);
  }
  if (setCurrent || !index.current) index.current = entry.id;
  saveIndex(index);
  return index;
}

function buildEntryFromFile({ fileName, versionId, source, type }) {
  const full = snapshotFilePath(fileName);
  const taxMap = loadTaxJsonFile(full);
  return {
    id: versionId,
    file: path.basename(fileName),
    effectiveDate: new Date().toISOString().slice(0, 10),
    type: type || 'snapshot',
    source: source || 'HTTP tariff mutation',
    rowCount: Object.keys(taxMap).length,
    checksum: sha256OfFile(full),
    bytes: fs.statSync(full).size,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Snapshot live data/tax.json into data/versions/.
 */
function snapshotCurrentTax({ label = '', id = '', setCurrent = false, source } = {}) {
  ensureWritable();
  if (!fs.existsSync(TAX_PATH)) {
    throw new Error('data/tax.json not found');
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = sanitizeToken(label);
  const fileName = safeLabel ? `tax-${safeLabel}.json` : `tax-${ts}.json`;
  const versionId = sanitizeToken(id) || (safeLabel ? `v-${safeLabel}` : `v-${ts}`);
  const dest = snapshotFilePath(fileName);

  fs.copyFileSync(TAX_PATH, dest);
  const index = loadIndex();
  const entry = buildEntryFromFile({
    fileName,
    versionId,
    source: source || 'Snapshot via API',
    type: index.versions.length === 0 ? 'base' : 'snapshot',
  });
  upsertVersionEntry(index, entry, { setCurrent });

  return { ok: true, entry, taxPath: TAX_PATH, snapshotPath: dest };
}

/**
 * Write uploaded tariff map to versions/ and optionally replace live tax.json.
 */
function uploadTariffMap(taxMap, { label = '', id = '', setCurrent = false, replaceLive = true, source } = {}) {
  ensureWritable();
  if (!taxMap || typeof taxMap !== 'object' || Array.isArray(taxMap)) {
    throw new Error('Invalid tariff payload (expected object keyed by HS code)');
  }
  const rowCount = Object.keys(taxMap).length;
  if (rowCount === 0) throw new Error('Tariff payload is empty');

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = sanitizeToken(label) || `upload-${ts}`;
  const fileName = `tax-${safeLabel}.json`;
  const versionId = sanitizeToken(id) || `v-${safeLabel}`;
  const dest = snapshotFilePath(fileName);

  fs.writeFileSync(dest, `${JSON.stringify(taxMap)}\n`, 'utf8');

  if (replaceLive) {
    fs.mkdirSync(path.dirname(TAX_PATH), { recursive: true });
    fs.copyFileSync(dest, TAX_PATH);
  }

  const index = loadIndex();
  const entry = buildEntryFromFile({
    fileName,
    versionId,
    source: source || 'Upload via API',
    type: 'upload',
  });
  upsertVersionEntry(index, entry, { setCurrent: setCurrent || replaceLive });

  return { ok: true, entry, rowCount, snapshotPath: dest, liveUpdated: replaceLive };
}

/**
 * Restore data/tax.json from a version snapshot file.
 */
function rollbackToSnapshot(toFile, { backup = true } = {}) {
  ensureWritable();
  const meta = resolveVersionMeta(toFile);
  if (!meta?.file) throw new Error(`Snapshot not found: ${toFile}`);

  const snap = snapshotFilePath(meta.file);
  if (!fs.existsSync(snap)) throw new Error(`Snapshot file missing: ${meta.file}`);
  if (!fs.existsSync(TAX_PATH)) throw new Error('data/tax.json not found');

  let backupPath = null;
  if (backup) {
    backupPath = `${TAX_PATH}.bak-${Date.now()}`;
    fs.copyFileSync(TAX_PATH, backupPath);
  }

  fs.copyFileSync(snap, TAX_PATH);
  const index = loadIndex();
  const versionEntry = index.versions.find(
    (v) => v.file === meta.file || v.id === meta.id,
  );
  if (versionEntry?.id) {
    index.current = versionEntry.id;
    saveIndex(index);
  }

  return {
    ok: true,
    from: meta.file,
    backupPath,
    current: index.current,
    rowCount: Object.keys(loadTaxJsonFile(TAX_PATH)).length,
  };
}

/**
 * Set index.current without replacing tax.json (operator must rollback separately).
 */
function activateVersion(idOrFile) {
  ensureWritable();
  const meta = resolveVersionMeta(idOrFile);
  if (!meta?.id) throw new Error(`Version not found: ${idOrFile}`);

  const index = loadIndex();
  index.current = meta.id;
  saveIndex(index);

  return { ok: true, current: meta.id, file: meta.file };
}

module.exports = {
  TAX_PATH,
  snapshotCurrentTax,
  uploadTariffMap,
  rollbackToSnapshot,
  activateVersion,
};
