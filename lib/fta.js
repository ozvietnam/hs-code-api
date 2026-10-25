/**
 * Thuế suất ưu đãi đặc biệt theo từng FTA (#251) — từ data/bieu-thue/2026.04.05.
 *
 * VÌ SAO: cột `acfta` trong tax.json chỉ là 1/16 FTA; biểu gốc có đầy 27 mức
 * (ATIGA, RCEP A–F, CPTPP, EVFTA, AKFTA, VKFTA, AJCEP…). Câu khách hỏi thật:
 * "Hàng TQ nộp Form E hay C/O RCEP để thuế thấp nhất?" — trả sai là nộp thừa thuế.
 *
 * NGUỒN: `data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz` — 11.414 dòng 8 số
 * có đủ 16 FTA + RCEP 6 nhóm nước. Mỗi mức kèm `canCu {vanBan, hieuLuc}` —
 * nghị định biểu thuế ưu đãi của từng FTA (số hiệu + ngày hiệu lực), NGUYÊN VĂN.
 *
 * LUẬT (theo issue #251):
 *   - Không khẳng định hàng đạt quy tắc xuất xứ — ghi rõ điều kiện.
 *   - Giá trị '*' = không có ưu đãi. '(-CN)' = loại trừ nước. '/' nhiều mức = needsReview.
 *   - Chỉ trả mức tốt nhất khi chắc chắn (1 mức, không loại trừ nước xuất xứ).
 *   - Mọi mức kèm căn cứ nghị định (kiểm được qua sổ oz-wiki-plhq).
 */
const fs = require('fs');
const path = require('path');
const { dataReadPath } = require('./data-paths');
// parseSegment cùng khuôn lib/acfta.js (không export từ đó — copy vào đây)
function parseSegment(text) {
  const m = String(text).trim().match(/^(\d+(?:\.\d+)?)\s*(?:\(\s*-\s*([A-Z,\s]+)\))?$/);
  if (!m) return null;
  return { rate: Number(m[1]), excludedCountries: m[2] ? m[2].split(',').map((c) => c.trim()).filter(Boolean) : [] };
}

// ── Định nghĩa FTA: key trong thue{} → metadata ──
const FTA_DEFS = {
  acfta:  { tenVi: 'ACFTA (ASEAN–Trung Quốc)',         co: 'E',        thanhVien: ['BN','KH','ID','LA','MY','MM','PH','SG','TH','VN','CN'], nd: '118/2022/NĐ-CP' },
  atiga:  { tenVi: 'ATIGA (ASEAN)',                     co: 'D',        thanhVien: ['BN','KH','ID','LA','MY','MM','PH','SG','TH','VN'],     nd: '126/2022/NĐ-CP' },
  rcepA:  { tenVi: 'RCEP nhóm A (BN, KH, LA, MM)',      co: 'RCEP-BK',  thanhVien: ['BN','KH','LA','MM'],                                     nd: '111/2022/NĐ-CP' },
  rcepB:  { tenVi: 'RCEP nhóm B (JP)',                  co: 'RCEP-JP',  thanhVien: ['JP'],                                                     nd: '111/2022/NĐ-CP' },
  rcepC:  { tenVi: 'RCEP nhóm C (CN)',                  co: 'RCEP-CN',  thanhVien: ['CN'],                                                     nd: '111/2022/NĐ-CP' },
  rcepD:  { tenVi: 'RCEP nhóm D (AU, NZ, SG)',          co: 'RCEP-ANZ', thanhVien: ['AU','NZ','SG'],                                           nd: '111/2022/NĐ-CP' },
  rcepE:  { tenVi: 'RCEP nhóm E (KR)',                  co: 'RCEP-KR',  thanhVien: ['KR'],                                                     nd: '111/2022/NĐ-CP' },
  rcepF:  { tenVi: 'RCEP nhóm F (TH, PH, MY)',          co: 'RCEP-TPM', thanhVien: ['TH','PH','MY'],                                           nd: '111/2022/NĐ-CP' },
  akfta:  { tenVi: 'AKFTA (ASEAN–Hàn Quốc)',            co: 'AK',       thanhVien: ['BN','KH','ID','LA','MY','MM','PH','SG','TH','VN','KR'], nd: '119/2022/NĐ-CP' },
  vkfta:  { tenVi: 'VKFTA (Việt Nam–Chile)',            co: 'V-C',      thanhVien: ['VN','CL'],                                                nd: '122/2022/NĐ-CP' },
  ajcep:  { tenVi: 'AJCEP (ASEAN–Nhật Bản)',            co: 'AJ',       thanhVien: ['BN','KH','ID','LA','MY','MM','PH','SG','TH','VN','JP'], nd: '120/2022/NĐ-CP' },
  cptpp:  { tenVi: 'CPTPP',                              co: 'CPTPP',    thanhVien: ['AU','BN','CA','CL','JP','MY','MX','NZ','PE','SG','VN'], nd: '111/2022/NĐ-CP' },
  evfta:  { tenVi: 'EVFTA (Việt Nam–EU)',               co: 'EUR.1',    thanhVien: ['VN','DE','FR','IT','NL','BE','LU','IE','DK','PL','CZ','SK','HU','SI','HR','RO','BG','EE','LV','LT','MT','CY','AT','FI','SE','GR','PT','ES'], nd: '125/2022/NĐ-CP' },
  ukvfta: { tenVi: 'UKVFTA (Việt Nam–Anh)',             co: 'UKV',      thanhVien: ['VN','GB'],                                                nd: '128/2022/NĐ-CP' },
  aanzfta:{ tenVi: 'AANZFTA (ASEAN–Úc–NZ)',            co: 'AANZ',     thanhVien: ['AU','NZ','BN','KH','ID','LA','MY','MM','PH','SG','TH','VN'], nd: '121/2022/NĐ-CP' },
  aifta:  { tenVi: 'AIFTA (ASEAN–Ấn Độ)',              co: 'AI',       thanhVien: ['BN','KH','ID','LA','MY','MM','PH','SG','TH','VN','IN'], nd: '123/2022/NĐ-CP' },
  vcfta:  { tenVi: 'VCFTA (Việt Nam–Cuba)',            co: 'VC',       thanhVien: ['VN','CU'],                                                nd: '127/2022/NĐ-CP' },
  vjepa:  { tenVi: 'VJEPA (Việt Nam–Nhật Bản)',        co: 'VJ',       thanhVien: ['VN','JP'],                                                nd: '124/2022/NĐ-CP' },
  vn_eaeu:{ tenVi: 'VN–EAEU',                           co: 'CT-1',     thanhVien: ['VN','AM','BY','KZ','KG'],                                 nd: '122/2022/NĐ-CP' },
};

// map key jsonl → key FTA_DEFS ('rcep@A' → 'rcepA')
const KEY_MAP = {};
for (const k of Object.keys(FTA_DEFS)) KEY_MAP[k.toLowerCase()] = k;
for (const x of 'ABCDEF') KEY_MAP['rcep@' + x] = 'rcep' + x;

let _bieu = null;
function bieuChinh() {
  if (_bieu) return _bieu;
  const zlib = require('zlib');
  const raw = zlib.gunzipSync(fs.readFileSync(dataReadPath('bieu-thue/2026.04.05/bieu-chinh.jsonl.gz')));
  const map = new Map();
  for (const line of raw.toString().trim().split('\n')) {
    try { const j = JSON.parse(line); if (j.ma && String(j.ma).length === 8) map.set(String(j.ma), j); } catch { /* bỏ */ }
  }
  _bieu = map;
  return _bieu;
}

/**
 * Mức thuế ưu đãi của MỘT FTA cho một nước xuất xứ.
 * @returns {null|{fta, tenVi, co, eligible:boolean|null, rate:number|null, noteVi, canCu}}
 */
function mucFta(key, def, giaTri, canCu, origin) {
  const text = String(giaTri ?? '').trim();
  if (!text) return null;
  const code = String(origin || '').toUpperCase();

  if (text === '*') {
    return { fta: key, tenVi: def.tenVi, co: def.co, eligible: false, rate: null, noteVi: 'Không có ưu đãi ("*") — áp MFN.', canCu: canCu || null };
  }
  if (!def.thanhVien.includes(code)) {
    return { fta: key, tenVi: def.tenVi, co: def.co, eligible: false, rate: null, noteVi: `${code} không phải thành viên ${def.tenVi}.`, canCu: canCu || null };
  }

  // parseSegment xử lý "5", "0 (-CN)", "0 (-CN)/0" — tái dùng acfta.js
  const parts = text.split('/');
  const segments = parts.map(parseSegment);
  if (segments.some((s) => s === null)) {
    return { fta: key, tenVi: def.tenVi, co: def.co, eligible: null, rate: null, noteVi: `Định dạng lạ ("${text}") — tra NĐ ${def.nd} trước khi khai.`, canCu: canCu || null, needsReview: true };
  }

  const excludedCountries = [...new Set(segments.flatMap((s) => s.excludedCountries))];
  const sameRate = segments.every((s) => s.rate === segments[0].rate);
  const sameExcl = segments.every((s) => s.excludedCountries.join(',') === segments[0].excludedCountries.join(','));
  const single = segments.length === 1 || (sameRate && sameExcl);

  if (!single) {
    const allEx = segments.every((s) => s.excludedCountries.includes(code));
    const noneEx = segments.every((s) => !s.excludedCountries.includes(code));
    if (noneEx && sameRate) {
      return { fta: key, tenVi: def.tenVi, co: def.co, eligible: true, rate: segments[0].rate, noteVi: `${def.tenVi} ${segments[0].rate}% khi có C/O ${def.co} hợp lệ.`, canCu: canCu || null };
    }
    if (allEx) {
      return { fta: key, tenVi: def.tenVi, co: def.co, eligible: false, rate: null, noteVi: `${code} bị loại trừ khỏi ${def.tenVi} ở mọi dòng con — áp MFN.`, canCu: canCu || null };
    }
    return { fta: key, tenVi: def.tenVi, co: def.co, eligible: null, rate: null, noteVi: `Nhiều mức ("${text}") — tra dòng 10 số trong NĐ ${def.nd}.`, canCu: canCu || null, needsReview: true };
  }

  if (excludedCountries.includes(code)) {
    return { fta: key, tenVi: def.tenVi, co: def.co, eligible: false, rate: null, noteVi: `${code} bị loại trừ ("${text}") — áp MFN.`, canCu: canCu || null };
  }
  return { fta: key, tenVi: def.tenVi, co: def.co, eligible: true, rate: segments[0].rate, noteVi: `${def.tenVi} ${segments[0].rate}% khi có C/O ${def.co} hợp lệ.`, canCu: canCu || null };
}

/**
 * Danh sách FTA áp dụng cho mã HS + nước xuất xứ.
 * @param {string} hsCode 8 số
 * @param {string} origin ISO-2 (CN, TH, KR, JP…)
 * @returns {{origin, ftaList: object[], totNhat: object|null, mfn, ghiChu}}
 */
function ftaChoXuatXu(hsCode, origin = 'CN') {
  const hs = String(hsCode || '').replace(/\D/g, '').slice(0, 8);
  const code = String(origin || 'CN').toUpperCase();
  const row = bieuChinh().get(hs);
  if (!row) return null;

  const mfnRaw = String(row.thue?.mfn ?? '').trim();
  const mfn = /^\d+(\.\d+)?$/.test(mfnRaw) ? Number(mfnRaw) : null;
  const ftaList = [];
  for (const [jsonKey, defKey] of Object.entries(KEY_MAP)) {
    const def = FTA_DEFS[defKey];
    if (!def) continue;
    const giaTri = row.thue?.[jsonKey];
    if (giaTri == null || giaTri === '') continue;
    // canCu: RCEP 6 nhóm dùng chung key 'rcep' (không có rcep@A..F riêng) — map về đúng key gốc
    const canCuKey = jsonKey.startsWith('rcep@') ? 'rcep' : jsonKey;
    const canCu = row.canCu?.[canCuKey] || row.canCu?.[jsonKey] || null;
    const muc = mucFta(defKey, def, giaTri, canCu, code);
    if (muc) ftaList.push(muc);
  }

  // Mức tốt nhất: chỉ khi eligible=true và rate != null; cảnh báo khi cao hơn MFN
  const eligible = ftaList.filter((f) => f.eligible && f.rate != null);
  eligible.sort((a, b) => a.rate - b.rate);
  const totNhat = eligible[0] || null;
  if (totNhat && mfn != null && totNhat.rate > mfn) {
    totNhat.higherThanMfn = true;
    totNhat.noteVi += ` ⚠️ Mức ${totNhat.rate}% CAO HƠN MFN ${mfn}% — nên khai MFN, không dùng C/O.`;
  }

  return {
    origin: code,
    hsCode: hs,
    mfn,
    ftaList,
    totNhat,
    ghiChu: 'Mức ưu đãi chỉ áp dụng khi hàng đáp ứng quy tắc xuất xứ và có C/O hợp lệ. Không khẳng định hàng đạt ROO — đó là điều kiện riêng của từng lô.',
  };
}

module.exports = { ftaChoXuatXu, FTA_DEFS, mucFta };
