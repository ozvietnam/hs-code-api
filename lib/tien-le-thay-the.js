/**
 * lib/tien-le-thay-the.js — TB-TCHQ đã bị Hải quan sửa đổi, thay thế (data/tien-le-thay-the.json).
 *
 * Kho tiền lệ (data/precedents.json) gộp từ nhiều nguồn cộng đồng nên giữ cả TB cũ lẫn TB thay thế nó như hai tiền lệ ngang
 * nhau (vd 293/TB-TCHQ xếp 3004.20.91, bị 2719/TB-TCHQ thay bằng 3004.20.71). Lúc chạy, TB cũ không được trích làm căn cứ.
 *
 * Khớp theo CẢ số hiệu VÀ ngày ban hành: số hiệu TB lặp lại mỗi năm (6449/TB-TCHQ ngày 13/12/2023 bị thay; 6449/TB-TCHQ
 * ngày 23/12/2024 là thông báo khác). Thiếu ngày ở bản ghi ⇒ không khớp (sai an toàn: giữ lại hơn là bỏ nhầm).
 *
 * Không sửa precedents.json: bảng hiệu chỉnh (lib/ho-so/hieu-chinh.js) và tín hiệu lát 1 trỏ vị trí bản ghi trong tệp.
 * Tắt khẩn cấp: HS_LOC_TB_THAY_THE=false.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const chuanSo = (s) => String(s || '').replace(/\s+/g, '').toUpperCase();

let _ds = null;
function danhSach() {
  if (_ds) return _ds;
  try { _ds = JSON.parse(fs.readFileSync(dataReadPath('tien-le-thay-the.json'), 'utf8')).muc || []; } catch { _ds = []; }
  return _ds;
}

/** Mục thay thế của một bản ghi tiền lệ, hoặc null. */
function thayTheCua(rec, ds = danhSach()) {
  const so = chuanSo(rec?.tbTchqNumber); const ngay = String(rec?.issuedDate || '').slice(0, 10);
  if (!so || !ngay) return null;
  return ds.find((m) => chuanSo(m?.cu?.soHieu) === so && String(m?.cu?.ngay || '') === ngay) || null;
}

/**
 * Bản sao kho tiền lệ đã bỏ các TB bị thay thế. Không đổi đối tượng gốc.
 * @returns {{ data: object, boRa: Array<{ma:string, soHieu:string, ngay:string, thayBoi:string}> }}
 */
function locHieuLuc(precedents, ds = danhSach()) {
  const boRa = [];
  if (!precedents || typeof precedents !== 'object' || process.env.HS_LOC_TB_THAY_THE === 'false' || !ds.length) return { data: precedents || {}, boRa };
  const data = {};
  for (const [ma, list] of Object.entries(precedents)) {
    if (!Array.isArray(list)) { data[ma] = list; continue; }
    const giu = [];
    for (const r of list) {
      const m = thayTheCua(r, ds);
      if (m) boRa.push({ ma, soHieu: r.tbTchqNumber, ngay: r.issuedDate, thayBoi: m.moi?.soHieu || '' });
      else giu.push(r);
    }
    if (giu.length) data[ma] = giu;
  }
  return { data, boRa };
}

function reset() { _ds = null; }

module.exports = { danhSach, thayTheCua, locHieuLuc, reset };
