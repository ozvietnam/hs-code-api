// lib/nap-qd2079.js — bộ nạp Danh mục rủi ro phân loại QĐ 2079 vào Postgres (tuỳ chọn) của hs-code-api (L0g, #545).
//
// CEO 30/10/2026: QĐ 2079 là văn bản nhà nước, CÔNG KHAI — tệp được phép nằm trong git làm bảng tĩnh
// (data/rui-ro-phan-loai/qd-2079.json, lib/rui-ro-phan-loai.js đọc thẳng). Postgres là nguồn tuỳ chọn; bộ nạp này
// chép tệp vào bảng rui_ro_phan_loai khi cần (đường dẫn: --file=, env HS_QD2079_FILE, hoặc mặc định bảng tĩnh).
//   - chỉ in SỐ ĐẾM (doc, hopLe, loi, themMoi, trung) + sha256 tệp — nhật ký gọn, không in từng dòng.
// Định dạng: mảng JSON [{ maA, maB, tenHang?, ghiChu? }] hoặc { ...meta, danhSach: [...] };
// mã được bỏ dấu chấm/khoảng trắng, phải 4–8 chữ số.
// Chạy lại an toàn: INSERT … ON CONFLICT (nguon, ma_a, ma_b) DO NOTHING, trong một giao dịch.

const fs = require('fs');
const path = require('path');
const { layClient } = require('./db');
const crypto = require('crypto');

const NGUON = 'QD-2079-TCHQ';

function chuanMa(v) {
  const s = String(v ?? '').replace(/[\s.]/g, '');
  return /^[0-9]{4,8}$/.test(s) ? s : null;
}

function chuoiTuyChon(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/** buf → { doc, hopLe: [{ maA, maB, tenHang, ghiChu }], loi: [{ dong, lyDo }] } (lyDo không chép nội dung dòng). */
function docVaKiem(buf) {
  let arr;
  try { arr = JSON.parse(buf.toString('utf8')); } catch { throw new Error('Tệp không phải JSON hợp lệ.'); }
  if (arr && !Array.isArray(arr) && Array.isArray(arr.danhSach)) arr = arr.danhSach;
  if (!Array.isArray(arr)) throw new Error('Tệp phải là mảng JSON [{ maA, maB, tenHang?, ghiChu? }] hoặc { danhSach: [...] }.');
  const hopLe = [];
  const loi = [];
  arr.forEach((x, i) => {
    if (!x || typeof x !== 'object') { loi.push({ dong: i + 1, lyDo: 'không phải đối tượng' }); return; }
    const maA = chuanMa(x.maA);
    const maB = chuanMa(x.maB);
    if (!maA || !maB) { loi.push({ dong: i + 1, lyDo: 'mã không phải 4–8 chữ số' }); return; }
    if (maA === maB) { loi.push({ dong: i + 1, lyDo: 'hai mã trùng nhau' }); return; }
    hopLe.push({ maA, maB, tenHang: chuoiTuyChon(x.tenHang, 500), ghiChu: chuoiTuyChon(x.ghiChu, 1000) });
  });
  return { doc: arr.length, hopLe, loi };
}

/**
 * Nạp tệp vào bảng rui_ro_phan_loai. `db` = Pool (`pg`) hoặc client { query }. thuKhan (dry-run) = chỉ kiểm + đếm, không cần DB.
 * → { doc, hopLe, loi, themMoi, trung, sha256 }
 */
async function napQd2079({ file, db, thuKhan = false, log = console.log } = {}) {
  const buf = fs.readFileSync(path.resolve(file));
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const { doc, hopLe, loi } = docVaKiem(buf);
  const kq = { doc, hopLe: hopLe.length, loi: loi.length, themMoi: 0, trung: 0, sha256 };
  if (loi.length) log(`dòng lỗi (chỉ số thứ tự): ${loi.slice(0, 20).map((l) => `${l.dong}:${l.lyDo}`).join(', ')}${loi.length > 20 ? ' …' : ''}`);
  if (thuKhan) {
    log(`dry-run doc=${kq.doc} hopLe=${kq.hopLe} loi=${kq.loi} themMoi=0 trung=0 sha256=${sha256.slice(0, 16)}`);
    return kq;
  }
  if (!db) throw new Error('Chưa cấu hình HS_DATABASE_URL — không có DB để nạp (dùng --dry-run để chỉ kiểm tệp).');
  const { client, traLai } = await layClient(db);
  try {
    await client.query('BEGIN');
    try {
      for (const r of hopLe) {
        const { rows } = await client.query(
          `INSERT INTO rui_ro_phan_loai (nguon, ma_a, ma_b, ten_hang, ghi_chu, sha256_tep)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (nguon, ma_a, ma_b) DO NOTHING
           RETURNING id`,
          [NGUON, r.maA, r.maB, r.tenHang, r.ghiChu, sha256],
        );
        if (rows && rows.length) kq.themMoi += 1; else kq.trung += 1;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    }
  } finally {
    traLai();
  }
  log(`doc=${kq.doc} hopLe=${kq.hopLe} loi=${kq.loi} themMoi=${kq.themMoi} trung=${kq.trung} sha256=${sha256.slice(0, 16)}`);
  return kq;
}

module.exports = { docVaKiem, napQd2079, NGUON };
