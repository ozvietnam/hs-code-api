const { requireAuthUnlessPublic } = require('../lib/public-access');
const { setCors, handleOptions } = require('../lib/cors');
const fs = require('fs');
const path = require('path');

let cache = null;
function load() {
  if (!cache) cache = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'destination-facts.json'), 'utf8'));
  return cache;
}

const CANH_BAO = 'Dữ liệu tham chiếu điểm khởi đầu tư vấn — KHÔNG phải căn cứ pháp lý chốt; kiểm chứng lại với agent/forwarder bản địa trước khi chốt giá.';

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (requireAuthUnlessPublic(req, res, { endpoint: 'destination-facts' })) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = new URL(req.url || '', 'http://localhost');
  const quocGia = (url.searchParams.get('quocGia') || url.searchParams.get('quoc_gia') || '').trim().toLowerCase();
  const data = load();
  const ds = Object.entries(data.quoc_gia || {});
  if (!quocGia) return res.status(200).json({ danh_sach: ds.map(([k, v]) => ({ khoa: k, ten: v.ten })), canh_bao: CANH_BAO });
  const hit = data.quoc_gia[quocGia] || ds.find(([k, v]) => v.ten.toLowerCase().includes(quocGia) || k.includes(quocGia));
  if (!hit) return res.status(200).json({ quoc_gia: quocGia, found: false, thong_tin: 'Chưa có dữ liệu — mở issue để nạp.', canh_bao: CANH_BAO });
  return res.status(200).json({ quoc_gia: typeof hit === 'string' ? quocGia : ds.find(([k]) => data.quoc_gia[k] === hit)?.[0] || quocGia, found: true, ...(typeof hit === 'object' ? hit : {}), canh_bao: CANH_BAO });
};
