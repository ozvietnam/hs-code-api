// lib/bieu-thue-2026.js — Chỉ mục biểu thuế 2026.04.05 cho /api/tax (#336).
// nameEn đúng TỪNG DÒNG, canCu (căn cứ pháp lý), dvtEn, phienBan. Nạp SYNC (15K dòng, ~200ms).
const { readFileSync } = require('fs');
const { gunzipSync } = require('zlib');
const { join } = require('path');
const { dataReadPath } = require('./data-paths');

const PHIEN_BAN = '2026.04.05';
let _chinh = null;

function napChinh() {
  if (_chinh) return _chinh;
  _chinh = new Map();
  try {
    const f = dataReadPath(join('bieu-thue', PHIEN_BAN, 'bieu-chinh.jsonl.gz'));
    const raw = gunzipSync(readFileSync(f)).toString('utf8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line);
        if (!d.maChuan) continue;
        _chinh.set(String(d.maChuan), {
          moTaVi: d.moTaVi || null,
          moTaEn: d.moTaEn || null,
          dvtEn: d.khac?.dvtEn || d.khac?.B || null,
          thue: d.thue || {},
          gach: d.gach || 0,
          soChuSo: d.soChuSo || null,
        });
      } catch { }
    }
  } catch { /* biểu gốc khuyết → trả Map rỗng, không chặn */ }
  return _chinh;
}

function traChinh(hsCode) {
  const m = napChinh();
  return m.get(String(hsCode).replace(/\D/g, '')) || null;
}

module.exports = { napChinh, traChinh, PHIEN_BAN };
