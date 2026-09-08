const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SOURCE_DIR, dataPath, dataReadPath, isolated } = require('./data-paths');

// VERSIONS_DIR/INDEX_PATH là đích GHI; đọc thì qua dataReadPath để vẫn thấy
// snapshot gốc trong repo khi test trỏ HS_DATA_DIR sang thư mục tạm.
const VERSIONS_DIR = dataPath('versions');
const SOURCE_VERSIONS_DIR = path.join(SOURCE_DIR, 'versions');
const INDEX_PATH = dataPath('versions', 'index.json');
const MANIFEST_PATH = dataPath('versions', 'manifest.json');

const SNAPSHOT_GLOB_PREFIX = 'tax-';

function safeReadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function sha256OfFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return `sha256:${crypto.createHash('sha256').update(buf).digest('hex')}`;
}

function listTaxSnapshotsOnDisk() {
  const dirs = isolated ? [SOURCE_VERSIONS_DIR, VERSIONS_DIR] : [VERSIONS_DIR];
  const names = new Set();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.startsWith(SNAPSHOT_GLOB_PREFIX) && name.endsWith('.json')) names.add(name);
    }
  }
  return [...names].sort();
}

function loadIndex() {
  const data = safeReadJson(dataReadPath('versions', 'index.json'), null);
  if (data && Array.isArray(data.versions)) return data;
  return { versions: [], current: null };
}

function loadManifestLegacy() {
  return safeReadJson(dataReadPath('versions', 'manifest.json'), { snapshots: [] });
}

/** Đích GHI snapshot. */
function snapshotFilePath(fileName) {
  return path.join(VERSIONS_DIR, path.basename(fileName));
}

/** Đường ĐỌC snapshot — rơi về data/versions gốc nếu chưa ghi ở WRITE_DIR. */
function snapshotReadPath(fileName) {
  return dataReadPath('versions', path.basename(fileName));
}

function loadTaxJsonFile(filePath) {
  const raw = safeReadJson(filePath, null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid tariff JSON (expected object keyed by HS)');
  }
  return raw;
}

/**
 * Diff two tariff maps keyed by HS (8-digit string).
 */
function diffTaxData(fromMap, toMap, { detailLimit = 50 } = {}) {
  const fromKeys = new Set(Object.keys(fromMap));
  const toKeys = new Set(Object.keys(toMap));
  const added = [];
  const removed = [];
  const changed = [];

  for (const k of toKeys) {
    if (!fromKeys.has(k)) added.push(k);
  }
  for (const k of fromKeys) {
    if (!toKeys.has(k)) removed.push(k);
  }

  const FIELDS = ['vn', 'dvt', 'mfn', 'acfta', 'vat', 'tt', 'cs', 'bvmt', 'giam_vat'];
  for (const k of fromKeys) {
    if (!toKeys.has(k)) continue;
    const a = fromMap[k];
    const b = toMap[k];
    const diffs = [];
    for (const f of FIELDS) {
      const va = a[f];
      const vb = b[f];
      if (JSON.stringify(va) !== JSON.stringify(vb)) {
        diffs.push({ field: f, from: va ?? null, to: vb ?? null });
      }
    }
    if (diffs.length > 0) {
      changed.push({ hsCode: k, fields: diffs });
    }
  }

  const summary = {
    added: added.length,
    removed: removed.length,
    rateOrRowChanged: changed.length,
  };

  const details = {
    added: added.slice(0, detailLimit),
    removed: removed.slice(0, detailLimit),
    changed: changed.slice(0, detailLimit),
    truncated:
      added.length > detailLimit ||
      removed.length > detailLimit ||
      changed.length > detailLimit,
  };

  return { summary, details };
}

function diffSnapshotFiles(fromFile, toFile, options) {
  const fromPath = snapshotReadPath(fromFile);
  const toPath = snapshotReadPath(toFile);
  const fromMap = loadTaxJsonFile(fromPath);
  const toMap = loadTaxJsonFile(toPath);
  return diffTaxData(fromMap, toMap, options);
}

function resolveVersionMeta(idOrFile) {
  const index = loadIndex();
  const needle = String(idOrFile || '').trim();
  if (!needle) return null;

  const byId = index.versions.find((v) => v.id === needle);
  if (byId) return { ...byId, resolvedBy: 'id' };

  const file = needle.endsWith('.json') ? needle : `${needle}.json`;
  const basename = path.basename(file);
  if (listTaxSnapshotsOnDisk().includes(basename)) {
    const full = snapshotReadPath(basename);
    return {
      id: basename.replace(/\.json$/i, ''),
      file: basename,
      checksum: fs.existsSync(full) ? sha256OfFile(full) : null,
      rowCount: fs.existsSync(full) ? Object.keys(loadTaxJsonFile(full)).length : null,
      bytes: fs.existsSync(full) ? fs.statSync(full).size : null,
      resolvedBy: 'file',
    };
  }

  const byFile = index.versions.find((v) => v.file === basename || v.file === needle);
  if (byFile) return { ...byFile, resolvedBy: 'file' };

  return null;
}

function buildVersionsListResponse() {
  const index = loadIndex();
  const onDisk = new Set(listTaxSnapshotsOnDisk());
  const seenFiles = new Set();

  const versions = [];
  for (const v of index.versions) {
    if (!v.file) continue;
    seenFiles.add(v.file);
    const full = snapshotReadPath(v.file);
    const exists = fs.existsSync(full);
    versions.push({
      ...v,
      existsOnDisk: exists,
      rowCount: v.rowCount ?? (exists ? Object.keys(loadTaxJsonFile(full)).length : null),
    });
  }

  for (const file of onDisk) {
    if (seenFiles.has(file)) continue;
    const full = snapshotReadPath(file);
    versions.push({
      id: file.replace(/\.json$/i, ''),
      file,
      type: 'snapshot',
      source: null,
      effectiveDate: null,
      createdAt: fs.existsSync(full) ? fs.statSync(full).mtime.toISOString() : null,
      checksum: fs.existsSync(full) ? sha256OfFile(full) : null,
      rowCount: fs.existsSync(full) ? Object.keys(loadTaxJsonFile(full)).length : null,
      bytes: fs.existsSync(full) ? fs.statSync(full).size : null,
      existsOnDisk: true,
      indexed: false,
    });
  }

  versions.sort((a, b) => String(a.file).localeCompare(String(b.file)));

  return {
    current: index.current || null,
    versions,
    indexPath: path.relative(process.cwd(), INDEX_PATH),
    manifestLegacy: loadManifestLegacy().snapshots?.length || 0,
  };
}

module.exports = {
  VERSIONS_DIR,
  INDEX_PATH,
  MANIFEST_PATH,
  loadIndex,
  loadManifestLegacy,
  listTaxSnapshotsOnDisk,
  snapshotFilePath,
  snapshotReadPath,
  loadTaxJsonFile,
  sha256OfFile,
  diffTaxData,
  diffSnapshotFiles,
  resolveVersionMeta,
  buildVersionsListResponse,
};
