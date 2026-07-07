const { requireAuth, requireAdmin } = require('../lib/auth');
const { applyAdminPatch, revertToTimestamp } = require('../lib/admin-update');
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
const {
  snapshotCurrentTax,
  uploadTariffMap,
  rollbackToSnapshot,
  activateVersion,
} = require('../lib/tariff-mutations');

function parseJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { error: 'Invalid JSON body' };
    }
  }
  return { body: body || {} };
}

/** Tariff versioning routes consolidated into one handler (fewer cold starts, tidy repo).
 * Public URLs (/api/versions, /api/version, /api/version/diff) rewritten here with ?op=
 * POST: op=snapshot|upload|rollback|activate (Bearer auth, local FS — may not persist on Vercel)
 */
module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method === 'POST') {
    if (requireAuth(req, res)) return;
    const op = String(req.query.op || req.body?.op || '').trim();
    const { body, error: parseErr } = parseJsonBody(req);
    if (parseErr) return res.status(400).json({ error: parseErr });

    try {
      if (op === 'snapshot') {
        const result = snapshotCurrentTax({
          label: body.label,
          id: body.id,
          setCurrent: Boolean(body.setCurrent),
          source: body.source || 'POST /api/tariff?op=snapshot',
        });
        return res.status(200).json(result);
      }

      if (op === 'upload') {
        const taxMap = body.rows || body.tax || body.data;
        const result = uploadTariffMap(taxMap, {
          label: body.label,
          id: body.id,
          setCurrent: Boolean(body.setCurrent),
          replaceLive: body.replaceLive !== false,
          source: body.source || 'POST /api/tariff?op=upload',
        });
        return res.status(200).json(result);
      }

      if (op === 'rollback') {
        const to = String(body.to || body.file || body.id || '').trim();
        if (!to) {
          return res.status(400).json({
            error: 'to required',
            example: { to: 'tax-v2026-01-01-base.json', backup: true },
          });
        }
        const result = rollbackToSnapshot(to, { backup: body.backup !== false });
        return res.status(200).json(result);
      }

      if (op === 'activate') {
        const id = String(body.id || body.file || '').trim();
        if (!id) {
          return res.status(400).json({ error: 'id required', example: { id: 'v-2026-04-01' } });
        }
        const result = activateVersion(id);
        return res.status(200).json(result);
      }

      if (op === 'admin_update') {
        if (requireAdmin(req, res)) return;
        const hsCode = body.hsCode || body.hs;
        if (!hsCode) {
          return res.status(400).json({ error: 'hsCode required' });
        }
        const result = applyAdminPatch(hsCode, body.patch, {
          comment: body.comment,
          admin: body.admin || 'api',
        });
        return res.status(200).json(result);
      }

      if (op === 'admin_revert') {
        if (requireAdmin(req, res)) return;
        const hsCode = body.hsCode || body.hs;
        const toTimestamp = body.toTimestamp || body.timestamp;
        if (!hsCode || !toTimestamp) {
          return res.status(400).json({
            error: 'hsCode and toTimestamp required',
          });
        }
        const result = revertToTimestamp(hsCode, toTimestamp, { admin: body.admin || 'api' });
        return res.status(200).json(result);
      }

      return res.status(400).json({
        error: 'Missing or unknown POST op',
        allowed: ['snapshot', 'upload', 'rollback', 'activate', 'admin_update', 'admin_revert'],
      });
    } catch (e) {
      const readOnly = /EROFS|read-only|EPERM/i.test(e.message);
      return res.status(readOnly ? 503 : 400).json({
        error: 'Tariff mutation failed',
        detail: e.message,
        hint: readOnly
          ? 'Serverless filesystem is read-only; run npm run data:snapshot-tax locally and redeploy.'
          : undefined,
      });
    }
  }

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
