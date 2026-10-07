/**
 * Chú giải bổ sung SEN 2022 (AHTN 2022, CV 3866/TCHQ-TXNK) theo mã 8 số.
 * Dữ liệu: data/sen-2022.json — nhập bằng scripts/import-sen-pdf.py từ PDF của CEO (07/10/2026).
 * SEN là căn cứ phân biệt các dòng 8 số ASEAN (vd "loại khác" vs dòng chi tiết). Mục SEN ghi theo
 * mã 8 số, phân nhóm 6 số (4001.21) hoặc cả nhóm (27.10, 87.03): mã 8 số nhận mục của đúng nó + mục
 * cấp 6/4 số chứa nó — không suy rộng sang mã 8 số anh em.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

let _byCode = null;
let _meta = null;
function load() {
  if (_byCode) return;
  _byCode = new Map();
  try {
    const d = JSON.parse(fs.readFileSync(dataReadPath('sen-2022.json'), 'utf8'));
    _meta = { phienBan: d.phienBan, nguon: d.nguon };
    for (const m of d.muc || []) {
      for (const ma of m.ma || []) {
        if (!_byCode.has(ma)) _byCode.set(ma, []);
        _byCode.get(ma).push(m);
      }
    }
  } catch {
    _meta = null;
  }
}

/**
 * @param {string} hs mã 8 số (dấu chấm được bỏ)
 * @returns {null | { phienBan: string, nguon: string, muc: { ma: string[], tieuDe: string, noiDung: string, xuatXu: string|null, trang: number, capDo: 'dong8'|'phanNhom6'|'nhom4' }[] }}
 */
function senFor(hs) {
  const code = String(hs || '').replace(/\D/g, '');
  if (code.length !== 8) return null;
  load();
  const muc = [
    ...(_byCode.get(code) || []).map((m) => ({ ...m, capDo: 'dong8' })),
    ...(_byCode.get(code.slice(0, 6)) || []).map((m) => ({ ...m, capDo: 'phanNhom6' })),
    ...(_byCode.get(code.slice(0, 4)) || []).map((m) => ({ ...m, capDo: 'nhom4' })),
  ];
  return muc.length && _meta ? { ..._meta, muc } : null;
}

module.exports = { senFor };
