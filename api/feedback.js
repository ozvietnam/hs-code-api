const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../lib/auth');
const { setCors, handleOptions } = require('../lib/cors');

const FEEDBACK_PATH = path.join(process.cwd(), 'data', 'feedback.jsonl');

module.exports = function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (requireAuth(req, res)) return;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const feedbackType = String(body?.feedbackType || '').trim();
  if (!feedbackType) {
    return res.status(400).json({ error: 'feedbackType is required' });
  }

  const feedbackId = `fb_${crypto.randomBytes(8).toString('hex')}`;
  const record = {
    feedbackId,
    feedbackType,
    hsCodeAtTime: body?.hsCodeAtTime || null,
    correctedHsCode: body?.correctedHsCode || null,
    productName: body?.productName || null,
    directorNote: body?.directorNote || null,
    orderCode: body?.orderCode || null,
    createdAt: body?.createdAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };

  let persisted = false;
  try {
    fs.mkdirSync(path.dirname(FEEDBACK_PATH), { recursive: true });
    fs.appendFileSync(FEEDBACK_PATH, `${JSON.stringify(record)}\n`, 'utf8');
    persisted = true;
  } catch (error) {
    console.warn('feedback persist failed:', error.message);
  }

  return res.status(200).json({
    ok: true,
    feedbackId,
    persisted,
  });
};
