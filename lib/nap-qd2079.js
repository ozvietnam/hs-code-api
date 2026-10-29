// lib/nap-qd2079.js — bộ nạp Danh mục rủi ro phân loại QĐ 2079 vào Postgres kín (L0g, #545).
//
// Tệp nguồn là dữ liệu RIÊNG (bản bên thứ ba), KHÔNG BAO GIỜ vào git:
//   - đường dẫn lấy từ --file= hoặc env HS_QD2079_FILE (vd /srv/hs-private/qd-2079.json, chmod 600);
//   - từ chối tệp nằm trong một cây git mà không bị .gitignore chặn (kể cả tệp đã track);
//   - chỉ in SỐ ĐẾM (doc, hopLe, loi, themMoi, trung) + sha256 tệp — không in tên hàng / ghi chú / mã từng dòng.
// Định dạng: mảng JSON [{ maA, maB, tenHang?, ghiChu? }]; mã được bỏ dấu chấm/khoảng trắng, phải 4–8 chữ số.
// Chạy lại an toàn: INSERT … ON CONFLICT (nguon, ma_a, ma_b) DO NOTHING, trong một giao dịch.

const fs = require('fs');
const path = require('path');
const { layClient } = require('./db');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const NGUON = 'QD-2079-TCHQ';

/** → { ok: true } | { ok: false, lyDo } */
function kiemTepNgoaiGit(file) {
  const abs = path.resolve(String(file || ''));
  if (!file || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) return { ok: false, lyDo: 'không tìm thấy tệp' };
  const dir = path.dirname(abs);
  const top = spawnSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (top.status !== 0) return { ok: true }; // ngoài mọi cây git (hoặc máy không có git)
  // check-ignore: exit 0 = bị ignore (và chưa track) → được phép; exit 1 = KHÔNG ignore hoặc đã track → chặn.
  const ign = spawnSync('git', ['-C', dir, 'check-ignore', '-q', abs], { encoding: 'utf8' });
  if (ign.status === 0) return { ok: true };
  return { ok: false, lyDo: 'tệp nằm trong git và không bị .gitignore chặn — dữ liệu QĐ 2079 phải để ngoài repo (vd /srv/hs-private/) hoặc trong data/private/' };
}

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
  if (!Array.isArray(arr)) throw new Error('Tệp phải là mảng JSON [{ maA, maB, tenHang?, ghiChu? }].');
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

module.exports = { kiemTepNgoaiGit, docVaKiem, napQd2079, NGUON };
