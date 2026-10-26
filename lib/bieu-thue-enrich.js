/**
 * Làm giàu /api/tax từ biểu thuế gốc 2026.04.05 (#336).
 * Thêm: canCu nguyên văn từng mức (vanBan + hieuLuc), moTaEn đúng từng dòng, dvtEn.
 * Nguồn: data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz — nạp lazy, cache Map.
 */
const fs = require('fs');
const zlib = require('zlib');
const { dataReadPath } = require('./data-paths');

let _cache = null;
function bieuChinh() {
  if (_cache) return _cache;
  const raw = zlib.gunzipSync(fs.readFileSync(dataReadPath('bieu-thue/2026.04.05/bieu-chinh.jsonl.gz')));
  const map = new Map();
  for (const line of raw.toString().trim().split('\n')) {
    try { const j = JSON.parse(line); if (j.ma && String(j.ma).length === 8) map.set(String(j.ma), j); } catch {}
  }
  _cache = map;
  return _cache;
}

/** Mức thuế đang hiển thị + căn cứ nguyên văn. Chỉ các mức /api/tax ĐANG trả (#336: không thêm mức mới). */
const MUC_HIEN_THI = { tt: true, mfn: true, vat: true, acfta: true };

/**
 * @param {string} hsCode 8 số
 * @returns {{moTaEn: string|null, dvtEn: string|null, canCuChiTiet: object}|null}
 */
function enrichTax(hsCode) {
  const hs = String(hsCode || '').replace(/\D/g, '').slice(0, 8);
  const row = bieuChinh().get(hs);
  if (!row) return null;

  const canCuChiTiet = {};
  for (const [key, co] of Object.entries(MUC_HIEN_THI)) {
    if (!co) continue;
    const cc = row.canCu?.[key];
    if (cc?.vanBan) {
      canCuChiTiet[key] = { vanBan: cc.vanBan, ...(cc.hieuLuc ? { hieuLuc: cc.hieuLuc } : {}) };
    }
  }

  return {
    moTaEn: row.moTaEn || null,
    dvtEn: row.dvtEn || null,
    ...(Object.keys(canCuChiTiet).length ? { canCuChiTiet } : {}),
  };
}

module.exports = { enrichTax };
