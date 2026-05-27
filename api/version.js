const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const fs = require('fs');
const {
  resolveVersionMeta,
  snapshotFilePath,
  sha256OfFile,
  loadTaxJsonFile,
  loadIndex,
} = require('../lib/tariff-versions');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const id = String(req.query.id || req.query.file || '').trim();
  if (!id) {
    return res.status(400).json({
      error: 'id or file parameter required',
      example: '/api/version?id=tax-v2026 or /api/version?file=tax-v2026.json',
    });
  }

  try {
    const meta = resolveVersionMeta(id);
    if (!meta || !meta.file) {
      return res.status(404).json({ found: false, message: `Version not found: ${id}` });
    }

    const fullPath = snapshotFilePath(meta.file);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        found: false,
        message: `Snapshot file missing on disk: ${meta.file}`,
        meta,
      });
    }

    const checksum = meta.checksum || sha256OfFile(fullPath);
    let rowCount = meta.rowCount;
    if (rowCount == null) {
      rowCount = Object.keys(loadTaxJsonFile(fullPath)).length;
    }

    const index = loadIndex();
    const isCurrent = index.current === meta.id || index.current === meta.file;

    return res.status(200).json({
      found: true,
      isCurrent,
      meta: {
        ...meta,
        checksum,
        rowCount,
        bytes: fs.statSync(fullPath).size,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: 'Version lookup failed', detail: e.message });
  }
};
