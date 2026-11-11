/**
 * Thuế suất thuế NK ưu đãi (MFN) TẠM THỜI có thời hạn — xăng dầu 2026.
 *
 * VÌ SAO: NĐ 72/2026/NĐ-CP hạ MFN một số mặt hàng xăng, dầu, nguyên liệu về 0% từ
 * 09/3/2026, rồi được kéo dài từng khoảng bằng NQ 25/2026, NQ 34/2026, NQ 43/2026/NQ-CP
 * (đến hết 31/12/2026). tax.json chỉ giữ mức nền NĐ 26/2023 (vd 10%) — API trả mức nền
 * như thể đang áp là sai tiền thật. Nhưng cũng KHÔNG được ghi đè `mfn`: hết hạn mà
 * không gia hạn thì mức nền quay lại, và dữ liệu ghi đè sẽ âm thầm báo 0% sai.
 *
 * Quy tắc (như vat-reduction.js sau khi hết hạn):
 *   · Chỉ trả `mfnTemporary` khi HÔM NAY (giờ Việt Nam) nằm trong một khoảng hiệu lực có
 *     căn cứ và dòng hàng có tên trong khoảng đó.
 *   · Trước khoảng đầu, sau khoảng cuối, hoặc rơi vào khoảng trống giữa hai khoảng →
 *     KHÔNG có mức tạm thời; trả `mfnTemporaryNote` (trạng thái + lời nhắc) để người
 *     khai biết vì sao — không bao giờ báo mức tạm thời là mức hiện hành ngoài khoảng.
 *   · Khoảng chỉ kiểm được từ nguồn thứ cấp → verified=false + ghi rõ trong noteVi.
 *
 * Dữ liệu: data/thue-tam-thoi.json (tĩnh). Ngày tính: `now` tiêm được để test.
 */
const fs = require('fs');
const { dataReadPath } = require('./data-paths');

const VN_OFFSET_MS = 7 * 3600 * 1000;
const NHAN_XAC_MINH = { NGUON_GOC: 'đã đối chiếu văn bản gốc', THU_CAP: 'CHỈ có nguồn thứ cấp, chưa đối chiếu văn bản gốc' };

let _cache = null;
function loadData() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(dataReadPath('thue-tam-thoi.json'), 'utf8'));
  } catch {
    _cache = { nhom: {} };
  }
  return _cache;
}

/** Ngày lịch Việt Nam (YYYY-MM-DD) của thời điểm `now`. */
function ngayVN(now = new Date()) {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

function soNgay(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function fmt(d) {
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

/** Các khoảng có áp cho mã `hs` trong một nhóm, kèm nhóm dòng hàng chứa mã. */
function khoangChoMa(nhom, hs) {
  const out = [];
  for (const k of nhom.khoang || []) {
    const set = (k.dongHang || []).find((key) => (nhom.dongHang?.[key]?.ma || []).includes(hs));
    if (set) out.push({ khoang: k, dongHangKey: set, dongHang: nhom.dongHang[set] });
  }
  return out.sort((a, b) => a.khoang.from.localeCompare(b.khoang.from));
}

/** Ngày cuối của chuỗi khoảng LIỀN NHAU bắt đầu từ khoảng đang áp (để nói "áp đến hết ..."). */
function hetChuoi(ds, i) {
  let to = ds[i].khoang.to;
  for (let j = i + 1; j < ds.length; j++) {
    if (soNgay(to, ds[j].khoang.from) !== 1) break;
    to = ds[j].khoang.to;
  }
  return to;
}

/**
 * @param {string} hsInput mã 8 số
 * @param {{baseRate?:string|null, now?:Date}} opts baseRate = mfn nền trong tax.json
 * @returns {null | {mfnTemporary?:object, mfnTemporaryNote?:object}}
 *   null = mã không thuộc diện thuế suất tạm thời nào.
 */
function mfnTemporaryOf(hsInput, { baseRate = null, now = new Date() } = {}) {
  const hs = String(hsInput || '').replace(/\D/g, '');
  if (!hs) return null;
  const today = ngayVN(now);
  for (const nhom of Object.values(loadData().nhom || {})) {
    const ds = khoangChoMa(nhom, hs);
    if (!ds.length) continue;

    const i = ds.findIndex((d) => d.khoang.from <= today && today <= d.khoang.to);
    if (i >= 0) {
      const { khoang, dongHang } = ds[i];
      const verified = khoang.xacMinh === 'NGUON_GOC';
      const validUntil = hetChuoi(ds, i);
      const legalBasis = [...new Set([dongHang.canCu?.soHieu, ...khoang.canCu.map((c) => c.soHieu)].filter(Boolean))];
      const nen = baseRate !== null && baseRate !== undefined && String(baseRate).trim() !== '' ? String(baseRate) : null;
      return {
        mfnTemporary: {
          rate: nhom.rate,
          baseRate: nen,
          from: khoang.from,
          to: khoang.to,
          validUntil,
          daysLeft: soNgay(today, validUntil),
          periodId: khoang.id,
          legalBasis,
          legalBasisDetail: [dongHang.canCu, ...khoang.canCu].filter(Boolean),
          verified,
          xacMinh: khoang.xacMinh,
          noteVi:
            `Đang áp thuế NK ưu đãi ${nhom.rate}% (thay mức nền ${nen ?? '?'}% theo NĐ 26/2023/NĐ-CP) từ ${fmt(khoang.from)} ` +
            `đến hết ${fmt(khoang.to)} theo ${legalBasis.join(', ')}` +
            (validUntil !== khoang.to ? `; các văn bản kéo dài liền mạch đến hết ${fmt(validUntil)}` : '') +
            `. Hết hạn mà không có văn bản gia hạn → quay về mức nền. Căn cứ: ${NHAN_XAC_MINH[khoang.xacMinh] || khoang.xacMinh}.`,
        },
      };
    }

    // Không có khoảng nào đang áp: trước, sau, hay khoảng trống.
    const first = ds[0].khoang;
    const last = ds[ds.length - 1].khoang;
    let status;
    let noteVi;
    if (today < first.from) {
      status = 'CHUA_HIEU_LUC';
      noteVi = `Mức ${nhom.rate}% tạm thời chỉ áp từ ${fmt(first.from)} — hôm nay áp mức nền NĐ 26/2023/NĐ-CP.`;
    } else if (today > last.to) {
      status = 'HET_HAN';
      noteVi = `Mức ${nhom.rate}% tạm thời đã hết hạn ngày ${fmt(last.to)} (${last.canCu.map((c) => c.soHieu).join(', ')}). Chưa có văn bản gia hạn trong dữ liệu → áp mức nền NĐ 26/2023/NĐ-CP; kiểm tra văn bản gia hạn mới trước khi khai.`;
    } else {
      const truoc = ds.filter((d) => d.khoang.to < today).pop().khoang;
      const sau = ds.find((d) => d.khoang.from > today).khoang;
      status = 'KHOANG_TRONG';
      noteVi = `Hôm nay nằm giữa hai khoảng áp mức ${nhom.rate}% (hết ${fmt(truoc.to)}, lại áp từ ${fmt(sau.from)}) — không có căn cứ cho mức tạm thời trong khoảng này; áp mức nền NĐ 26/2023/NĐ-CP.`;
    }
    return { mfnTemporaryNote: { status, rate: null, lastPeriodTo: last.to, noteVi } };
  }
  return null;
}

/** Hạn cuối của mọi nhóm (để đối chiếu với data-freshness.json). */
function allValidUntil() {
  return Object.fromEntries(
    Object.entries(loadData().nhom || {}).map(([k, n]) => [k, (n.khoang || []).map((x) => x.to).sort().pop() || null]),
  );
}

module.exports = { mfnTemporaryOf, ngayVN, allValidUntil, loadData };
