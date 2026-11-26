// api/ho-so-ma.js — TRA HỒ SƠ VẤN ĐỀ của một mã 8 số (M-77, #1969).
//
// CHỈ ĐỌC: trả hồ sơ vấn đề dựng chỉ từ luật (nguyên văn + vân tay câu).
// KHÔNG nối vào đường chọn mã — lib/engine-loop và lib/classify* không gọi tệp này.
// Phải xác thực (endpoint chưa nằm trong danh sách công khai của lib/public-access.js).

const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const { phieuVanDe } = require('../lib/ho-so-ma/tra');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (requireAuthUnlessPublic(req, res, { endpoint: 'ho-so-ma' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = new URL(req.url || '', 'http://localhost');
  const ma = (url.searchParams.get('ma') || '').trim();
  if (!ma) return res.status(400).json({ error: 'thiếu tham số ma (4, 6 hoặc 8 chữ số)', viDu: '/api/ho-so-ma?ma=76051910' });

  const t0 = Date.now();
  const phieu = phieuVanDe(ma);
  const ms = Date.now() - t0;
  return res.status(200).json({ ...phieu, msTra: ms });
};
