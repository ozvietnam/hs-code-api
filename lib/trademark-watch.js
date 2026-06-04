/**
 * Trademark Watch — cảnh báo rủi ro nhãn hiệu được bảo hộ khi nhập khẩu.
 *
 * Bối cảnh pháp lý:
 *  - TT 13/2015/TT-BTC (sửa bởi TT 13/2020/TT-BTC): kiểm tra, giám sát, TẠM DỪNG
 *    làm thủ tục hải quan với hàng XNK có yêu cầu bảo vệ quyền SHTT.
 *  - Từ 1/3/2026: hải quan được CHỦ ĐỘNG dừng thông quan khi nghi vấn hàng giả,
 *    không cần chủ nhãn yêu cầu trước.
 *
 * Tập tín hiệu cao nhất là "danh sách nhãn hiệu đã đăng ký giám sát tại Tổng cục
 * Hải quan" (customsRecorded=true) — đây mới là tập gây tạm dừng thông quan thực tế.
 *
 * QUAN TRỌNG: kết quả là TƯ VẤN THAM KHẢO, không phải phán quyết hải quan.
 */
const fs = require('fs');
const path = require('path');
const { removeDiacritics } = require('./search-utils');

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadJson(file, fallback) {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return fallback;
  }
}

const niceHsRaw = loadJson('nice-hs-map.json', { map: {} });
const NICE_HS_MAP = niceHsRaw.map || {};

const watchRaw = loadJson('trademark-watch.json', { marks: {} });
const WATCH = watchRaw.marks || {};

const LEGAL_BASIS = [
  'TT 13/2015/TT-BTC (sửa bởi TT 13/2020/TT-BTC) — giám sát & tạm dừng thông quan hàng XNK có yêu cầu bảo vệ SHTT',
  'Hải quan được chủ động dừng thông quan khi nghi vấn hàng giả từ 1/3/2026',
];
const DISCLAIMER =
  'Tư vấn tham khảo, không phải phán quyết hải quan. Cần xác minh quyền sở hữu/uỷ quyền trước khi nhập khẩu.';

const LEVEL_RANK = { NONE: 0, WATCH: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

function normalizeMark(text) {
  return removeDiacritics(String(text || '').toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chương HS (2 số) suy ra từ danh sách nhóm Nice của 1 nhãn hiệu. */
function hsChaptersForNice(niceClasses = []) {
  const out = new Set();
  for (const cls of niceClasses) {
    for (const ch of NICE_HS_MAP[String(cls)] || []) out.add(ch);
  }
  return [...out];
}

/** Nhóm Nice có là dịch vụ (35-45) hết không → khi đó không cross-check HS được. */
function isAllServiceClasses(niceClasses = []) {
  if (!niceClasses.length) return false;
  return niceClasses.every((c) => Number(c) >= 35);
}

/**
 * Tìm các nhãn hiệu trong watchlist khớp với 1 đoạn text (brand/tên hàng).
 * @returns {Array} danh sách entry watchlist kèm matchType.
 */
function findMarks(text) {
  const norm = normalizeMark(text);
  if (!norm) return [];
  const tokens = new Set(norm.split(' ').filter((w) => w.length >= 2));
  const hits = [];

  for (const [key, entry] of Object.entries(WATCH)) {
    const markNorm = entry.normalized || normalizeMark(key);
    if (!markNorm) continue;

    let matchType = null;
    if (norm === markNorm) {
      matchType = 'exact';
    } else if (markNorm.includes(' ')) {
      // nhãn nhiều từ: yêu cầu xuất hiện nguyên cụm
      if (norm.includes(markNorm)) matchType = 'phrase';
    } else if (tokens.has(markNorm)) {
      // nhãn 1 từ: khớp nguyên token (tránh substring nhiễu)
      matchType = 'token';
    }

    if (matchType) hits.push({ key, matchType, ...entry });
  }
  return hits;
}

/** Tính mức rủi ro cho 1 entry đã khớp, có cross-check chương HS (nếu có hsCode). */
function scoreMark(entry, hsCode) {
  const chapter = hsCode
    ? String(parseInt(String(hsCode).replace(/\D/g, '').slice(0, 2), 10)).padStart(2, '0')
    : null;

  const registeredChapters = entry.hsChapters && entry.hsChapters.length
    ? entry.hsChapters
    : hsChaptersForNice(entry.niceClasses);

  // classMatch: true = cùng nhóm hàng đăng ký; false = khác nhóm; null = không xác định được
  let classMatch = null;
  if (chapter && registeredChapters.length && !isAllServiceClasses(entry.niceClasses)) {
    classMatch = registeredChapters.includes(chapter);
  }

  const verified = entry.verified === true;
  const status = String(entry.status || 'UNKNOWN').toUpperCase();
  const customsRecorded = entry.customsRecorded === true;

  let level;
  if (customsRecorded && verified) {
    level = 'CRITICAL';
  } else if (customsRecorded) {
    level = 'HIGH';
  } else if (verified && status === 'REGISTERED') {
    level = 'HIGH';
  } else if (status === 'REGISTERED') {
    level = 'MEDIUM';
  } else if (status === 'PENDING') {
    level = 'WATCH';
  } else if (status === 'EXPIRED') {
    level = 'WATCH';
  } else {
    // UNKNOWN / dữ liệu seed chưa xác minh
    level = 'WATCH';
  }

  // Khác nhóm hàng đăng ký → hạ 1 bậc (nhưng không xoá hẳn, vì nhãn có thể đăng ký
  // thêm nhóm khác mà watchlist chưa có).
  if (classMatch === false) {
    const ranks = Object.keys(LEVEL_RANK);
    const cur = LEVEL_RANK[level];
    const downgraded = ranks.find((k) => LEVEL_RANK[k] === Math.max(1, cur - 1)) || 'WATCH';
    level = downgraded;
  }

  return { level, classMatch, chapter, registeredChapters, verified, status, customsRecorded };
}

function recommendationsFor(scored, entry) {
  const recs = [];
  if (scored.customsRecorded) {
    recs.push(
      'Nhãn hiệu nằm trong danh sách giám sát hải quan → lô hàng có thể bị TẠM DỪNG thông quan để xác minh. Chuẩn bị sẵn chứng từ.'
    );
  }
  recs.push('Kiểm tra: doanh nghiệp nhập khẩu có phải chủ sở hữu nhãn hiệu hoặc có hợp đồng phân phối/uỷ quyền hợp lệ không?');
  recs.push('Chuẩn bị chứng từ chứng minh hàng chính hãng (invoice, CO, hợp đồng từ nhà sản xuất/uỷ quyền).');
  recs.push('KHAI BÁO nhãn hiệu đầy đủ trên tờ khai hải quan — không bỏ trống ô nhãn hiệu.');
  if (scored.status === 'PENDING') {
    recs.push('Nhãn đang trong quá trình xử lý đơn (chưa cấp) — theo dõi trạng thái trước thời điểm nhập.');
  }
  if (!scored.verified) {
    recs.push('Dữ liệu nhãn hiệu này CHƯA xác minh (seed) — tra cứu lại tại iplib.noip.gov.vn / WIPO Global Brand Database trước khi quyết định.');
  }
  return recs;
}

/**
 * Cảnh báo rủi ro nhãn hiệu cho 1 lô hàng.
 * @param {object} opts
 * @param {string} [opts.brand] nhãn hiệu khai báo (đáng tin nhất)
 * @param {string} [opts.text] tên hàng / mô tả để quét thêm nhãn ẩn
 * @param {string} [opts.hsCode] mã HS để cross-check nhóm hàng
 * @returns {object|null} object cảnh báo, hoặc {matched:false} nếu không có rủi ro
 */
function checkTrademarkRisk({ brand, text, hsCode } = {}) {
  const scanText = [brand, text].filter(Boolean).join(' ');
  const hits = findMarks(scanText);

  if (!hits.length) {
    return { matched: false };
  }

  const matches = hits
    .map((entry) => {
      const scored = scoreMark(entry, hsCode);
      return {
        mark: entry.key,
        matchType: entry.matchType,
        owner: entry.owner || null,
        appNo: entry.appNo || null,
        regNo: entry.regNo || null,
        niceClasses: entry.niceClasses || [],
        status: scored.status,
        customsRecorded: scored.customsRecorded,
        verified: scored.verified,
        source: entry.source || 'unknown',
        riskLevel: scored.level,
        classMatch: scored.classMatch,
        registeredChapters: scored.registeredChapters,
        recommendations: recommendationsFor(scored, entry),
      };
    })
    .sort((a, b) => LEVEL_RANK[b.riskLevel] - LEVEL_RANK[a.riskLevel]);

  const top = matches[0];
  const messageBits = [`Phát hiện nhãn hiệu "${top.mark}" có thể được bảo hộ tại Việt Nam`];
  if (top.customsRecorded) messageBits.push('(đã đăng ký giám sát tại hải quan — rủi ro tạm dừng thông quan)');
  else if (top.classMatch === false) messageBits.push('(nhưng khác nhóm hàng đăng ký — rủi ro thấp hơn)');

  return {
    matched: true,
    riskLevel: top.riskLevel,
    summary: messageBits.join(' '),
    matches,
    legalBasis: LEGAL_BASIS,
    disclaimer: DISCLAIMER,
  };
}

/** Tra cứu watchlist theo từ khoá (cho endpoint /api/trademark). */
function searchWatchlist(query, { hsCode } = {}) {
  const hits = findMarks(query);
  // Cũng cho phép tra theo prefix/substring rộng hơn khi gõ tay
  const norm = normalizeMark(query);
  if (norm && norm.length >= 2) {
    for (const [key, entry] of Object.entries(WATCH)) {
      if (hits.some((h) => h.key === key)) continue;
      const markNorm = entry.normalized || normalizeMark(key);
      if (markNorm.includes(norm) || norm.includes(markNorm)) {
        hits.push({ key, matchType: 'partial', ...entry });
      }
    }
  }

  return hits
    .map((entry) => {
      const scored = scoreMark(entry, hsCode);
      return {
        mark: entry.key,
        matchType: entry.matchType,
        owner: entry.owner || null,
        appNo: entry.appNo || null,
        regNo: entry.regNo || null,
        niceClasses: entry.niceClasses || [],
        registeredChapters: scored.registeredChapters,
        status: scored.status,
        customsRecorded: scored.customsRecorded,
        verified: scored.verified,
        source: entry.source || 'unknown',
        riskLevel: scored.level,
        classMatch: scored.classMatch,
      };
    })
    .sort((a, b) => LEVEL_RANK[b.riskLevel] - LEVEL_RANK[a.riskLevel]);
}

function watchlistStats() {
  const marks = Object.values(WATCH);
  return {
    total: marks.length,
    customsRecorded: marks.filter((m) => m.customsRecorded === true).length,
    verified: marks.filter((m) => m.verified === true).length,
    bySource: marks.reduce((acc, m) => {
      const s = m.source || 'unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {}),
  };
}

module.exports = {
  checkTrademarkRisk,
  searchWatchlist,
  watchlistStats,
  findMarks,
  normalizeMark,
  hsChaptersForNice,
  LEGAL_BASIS,
  DISCLAIMER,
};
