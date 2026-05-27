const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');
const fs = require('fs');
const {
  resolveVersionMeta,
  snapshotFilePath,
  sha256OfFile,
  loadTaxJsonFile,
  loadIndex,
  buildVersionsListResponse,
  diffSnapshotFiles,
} = require('../lib/tariff-versions');

/** Tariff versioning routes consolidated for Vercel Hobby function limit (~12 max).
 * Public URLs (/api/versions, /api/version, /api/version/diff) rewritten here with ?op=
 */
module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  const op = String(req.query.op || '').trim();

  try {
    if (op === 'versions') {
      const payload = buildVersionsListResponse();
      return res.status(200).json(payload);
    }

    if (op === 'detail') {
      const id = String(req.query.id || req.query.file || '').trim();
      if (!id) {
        return res.status(400).json({
          error: 'id or file parameter required',
          example: '/api/version?id=tax-v2026',
        });
      }

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
    }

    if (op === 'diff') {
      const fromQ = String(req.query.from || '').trim();
      const toQ = String(req.query.to || '').trim();
      if (!fromQ || !toQ) {
        return res.status(400).json({
          error: 'from and to parameters required',
          example: '/api/version/diff?from=tax-a.json&to=tax-b.json',
        });
      }

      const limitRaw = parseInt(String(req.query.limit || '50'), 10);
      const detailLimit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 50, 1), 500);

      const fromMeta = resolveVersionMeta(fromQ);
      const toMeta = resolveVersionMeta(toQ);
      if (!fromMeta?.file) {
        return res.status(404).json({ error: 'from not found', from: fromQ });
      }
      if (!toMeta?.file) {
        return res.status(404).json({ error: 'to not found', to: toQ });
      }

      const diff = diffSnapshotFiles(fromMeta.file, toMeta.file, { detailLimit });
      return res.status(200).json({
        from: { id: fromMeta.id, file: fromMeta.file },
        to: { id: toMeta.id, file: toMeta.file },
        summary: diff.summary,
        details: diff.details,
      });
    }

    return res.status(400).json({
      error: 'Missing or unknown op',
      hint: 'Use /api/versions or /api/tariff?op=versions|detail|diff',
    });
  } catch (e) {
    if (req.query.op === 'diff') {
      return res.status(400).json({ error: 'Diff failed', detail: e.message });
    }
    return res.status(500).json({ error: 'Tariff handler failed', detail: e.message });
  }
};
