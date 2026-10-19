/**
 * Bộ chấm rủi ro sở hữu trí tuệ (SHTT) cho công cụ `kiem_tra_shtt` của Cổng OZ.
 *
 * Nguyên tắc BẢO THỦ (CEO chốt): trích sai còn tệ hơn không trích.
 *   - KHÔNG BAO GIỜ trả GREEN khi độ phủ kho VN chưa đủ (ngưỡng ≥ 90 %); hiện kho mới
 *     có ~1.4k dòng/600k ước lượng nên thực tế không bao giờ đạt → mặc định UNKNOWN khi
 *     không khớp, KHÔNG phải GREEN.
 *   - Chỉ đối chiếu được VN (ipvietnam). TQ (CNIPA/GACC) + TMview hiện CAPTCHA/chặn →
 *     0 bản ghi; nêu rõ trong reasons/scope rằng phạm vi mới có VN.
 *   - Dữ liệu nhomNice phần lớn rỗng → KHÔNG dùng lớp Nice để LOẠI bớt rủi ro.
 *   - importer KHÔNG dùng để tự suy ra quyền sở hữu ở bản này.
 *
 * Module THUẦN: `chamRuiRo` nhận dữ liệu truyền vào (không tự đọc đĩa) để test cô lập.
 * Hàm `docDuLieu(dir)` đọc data/shtt (CHỈ ĐỌC) cho server dùng lúc khởi động.
 *
 * Hợp đồng đầu ra khớp CheckResult mà lib/shtt-client.js + lib/trademark-watch.js tiêu thụ.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DIR_SHTT_MAC_DINH = join(ROOT, 'data', 'shtt');

// Ước lượng BẢO THỦ tổng số nhãn hiệu còn hiệu lực tại VN (Cục SHTT). Dùng làm mẫu số
// cho độ phủ; cố ý để cao để tỉ lệ phủ luôn thấp → không bao giờ "đủ" để trả GREEN.
export const VN_EXPECTED = 600000;
export const NGUONG_GREEN = 0.9;

export const DISCLAIMER =
  'Kết quả tham khảo dựa trên dữ liệu công khai của Cục SHTT Việt Nam tại thời điểm tra ' +
  'cứu; không phải ý kiến pháp lý. Cần xác minh với đại diện sở hữu công nghiệp trước khi ' +
  'quyết định nhập hàng.';

/** Lỗi đầu vào (brand/hs sai) — server map thành HTTP 400 / DAU_VAO_SAI. */
export class LoiDauVao extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoiDauVao';
    this.dauVaoSai = true;
  }
}

/**
 * Chuẩn hoá tên nhãn để so khớp: viết hoa, bỏ dấu tiếng Việt, bỏ mọi ký tự không phải
 * chữ-số (khoảng trắng, dấu gạch, ký hiệu…). Ví dụ "Việt-Nam 123" → "VIETNAM123".
 */
export function chuanHoaNhan(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bỏ dấu tổ hợp
    .replace(/đ/gi, (m) => (m === 'đ' ? 'd' : 'D'))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** Giữ đúng 8 chữ số đầu của mã HS (bỏ dấu chấm). Không đủ 8 → null. */
export function hs8(hsCode) {
  const d = String(hsCode == null ? '' : hsCode).replace(/\D/g, '').slice(0, 8);
  return d.length === 8 ? d : null;
}

/** Khoảng cách sửa Levenshtein (dùng cho "tương tự"). */
export function khoangCachSua(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/**
 * Một bản ghi được coi là "còn hiệu lực/đã cấp" (granted) khi tinhTrang = DANG_KY, hoặc
 * tinhTrangGoc cho thấy đã cấp bằng/đăng ký. Đây là điều kiện cho mức ĐỎ.
 */
export function laDaCap(r) {
  if (!r) return false;
  if (r.tinhTrang === 'DANG_KY') return true;
  const goc = String(r.tinhTrangGoc || '').toLowerCase();
  return /cấp bằng|cap bang|đăng ký|dang ky|registered|granted/.test(goc);
}

/** Đơn đang xử lý (pending) — chưa cấp nhưng vẫn là rủi ro → ít nhất VÀNG. */
export function laDangXuLy(r) {
  if (!r) return false;
  if (r.tinhTrang === 'DANG_XU_LY') return true;
  const goc = String(r.tinhTrangGoc || '').toLowerCase();
  return /đang giải quyết|dang giai quyet|pending|đang xử lý/.test(goc);
}

/** Bản ghi "còn sống" = đã cấp HOẶC đang xử lý (không phải hết hạn/từ chối/rút đơn). */
export function laConSong(r) {
  return laDaCap(r) || laDangXuLy(r);
}

function nhanHienThi(r) {
  return String(r && r.nhan != null ? r.nhan : '').trim() || '(không rõ nhãn)';
}

function tinhTrangHienThi(r) {
  if (r && r.tinhTrangGoc) return String(r.tinhTrangGoc);
  const map = {
    DANG_KY: 'Đã cấp',
    DANG_XU_LY: 'Đang giải quyết',
    HET_HAN: 'Hết hạn',
    TU_CHOI: 'Từ chối',
    KHAC: 'Khác',
  };
  return map[r && r.tinhTrang] || String((r && r.tinhTrang) || 'Không rõ');
}

function toEvidence(r) {
  const classes = Array.isArray(r.nhomNice)
    ? r.nhomNice.map((c) => Number(c)).filter((n) => Number.isInteger(n))
    : [];
  return {
    kind: 'mark',
    jurisdiction: 'VN',
    regNo: r.soBang || r.soDon || null,
    text: nhanHienThi(r),
    owner: r.chuSoHuu || r.ungVien || null,
    classes,
    status: tinhTrangHienThi(r),
    source: 'Cục SHTT Việt Nam',
    fetchedAt: (r.nguon && r.nguon.layLuc) || null,
  };
}

/**
 * Chấm rủi ro SHTT. THUẦN — không đọc đĩa, không mạng.
 *
 * @param {object} p
 * @param {string} p.brand      tên nhãn (bắt buộc)
 * @param {string} p.hs         mã HS (bắt buộc, phải đủ 8 số sau khi bỏ chấm)
 * @param {string} [p.origin]   xuất xứ (mặc định CN) — hiện chỉ dùng để ghi chú phạm vi
 * @param {string} [p.importer] nhà nhập khẩu (không dùng suy quyền sở hữu ở bản này)
 * @param {object} p.data       { records[], dataAsOf, vnCrawled, sources[] }
 * @returns {object} CheckResult
 */
export function chamRuiRo({ brand, hs, origin, importer, data } = {}) {
  const brandRaw = String(brand == null ? '' : brand).trim();
  if (!brandRaw) throw new LoiDauVao('Thiếu tham số brand (tên nhãn hiệu).');
  const hsNorm = hs8(hs);
  if (!hsNorm) throw new LoiDauVao('Tham số hs phải đủ 8 chữ số (sau khi bỏ dấu chấm).');

  const d = data || {};
  const records = Array.isArray(d.records) ? d.records : [];
  const vnCrawled = Number.isFinite(d.vnCrawled) ? d.vnCrawled : records.length;
  const vnExpected = Number.isFinite(d.vnExpected) ? d.vnExpected : VN_EXPECTED;
  const dataAsOf = d.dataAsOf || null;
  const originNorm = String(origin == null ? '' : origin).trim().toUpperCase() || 'CN';

  const key = chuanHoaNhan(brandRaw);
  const trungKhop = [];
  const tuongTu = [];

  if (key) {
    for (const r of records) {
      const rk = chuanHoaNhan(r && r.nhan);
      if (!rk) continue;
      if (rk === key) {
        trungKhop.push(r);
        continue;
      }
      // Tương tự: một chuỗi chứa chuỗi kia (với phần ngắn ≥ 4 ký tự), HOẶC khoảng cách
      // sửa ≤ 2 khi cả hai tên ≥ 4 ký tự. Bảo thủ: nghi ngờ thì coi là tương tự.
      const ngan = Math.min(key.length, rk.length);
      const chuaNhau = ngan >= 4 && (rk.includes(key) || key.includes(rk));
      const gan = key.length >= 4 && rk.length >= 4 && khoangCachSua(key, rk) <= 2;
      if (chuaNhau || gan) tuongTu.push(r);
    }
  }

  const trungSong = trungKhop.filter(laConSong);
  const trungCap = trungKhop.filter(laDaCap);
  const trungXuLy = trungKhop.filter((r) => laDangXuLy(r) && !laDaCap(r));
  const tuongTuSong = tuongTu.filter(laConSong);

  const reasons = [];
  const suggestions = [];
  let level;

  // Phạm vi: chỉ VN. Luôn nêu rõ TQ chưa cào được.
  const phamViVN =
    'Phạm vi đối chiếu hiện chỉ gồm nhãn hiệu công bố tại VN (Cục SHTT); chưa tra được ' +
    'Trung Quốc (CNIPA/GACC) và TMview do nguồn đang chặn/CAPTCHA.';

  if (trungCap.length > 0) {
    level = 'RED';
    reasons.push(`Có nhãn trùng đang hiệu lực tại VN (${trungCap.length} bản ghi đã cấp/đăng ký).`);
    suggestions.push('Dừng nhập cho tới khi xác minh quyền với chủ nhãn hoặc đại diện SHTT.');
  } else if (trungXuLy.length > 0) {
    level = 'YELLOW';
    reasons.push(`Có đơn nhãn trùng đang xử lý tại VN (${trungXuLy.length} bản ghi) — chưa cấp nhưng là rủi ro.`);
    suggestions.push('Theo dõi tình trạng đơn; xác minh với đại diện SHTT trước khi nhập.');
  } else if (tuongTuSong.length > 0) {
    level = 'YELLOW';
    reasons.push(`Có nhãn tương tự đang hiệu lực tại VN (${tuongTuSong.length} bản ghi).`);
    suggestions.push('Rà soát mức độ tương tự gây nhầm lẫn với đại diện SHTT trước khi nhập.');
  } else {
    // Không khớp bản ghi còn sống. Chỉ XANH khi độ phủ ≥ ngưỡng (thực tế không đạt).
    const tyLe = vnExpected > 0 ? vnCrawled / vnExpected : 0;
    const chetTrung = trungKhop.length > 0; // chỉ khớp bản ghi hết hạn/từ chối
    if (!chetTrung && tyLe >= NGUONG_GREEN) {
      level = 'GREEN';
      reasons.push('Không thấy nhãn trùng/tương tự còn hiệu lực trong phạm vi đã tra, độ phủ kho VN đạt ngưỡng.');
    } else {
      level = 'UNKNOWN';
      if (chetTrung) {
        reasons.push(
          `Có ${trungKhop.length} nhãn trùng nhưng đã hết hiệu lực/từ chối tại VN — không loại trừ ` +
          'khả năng tái đăng ký; không thể kết luận an toàn.',
        );
      } else {
        reasons.push(
          'Chưa thấy nhãn trùng trong phạm vi đã tra, nhưng độ phủ kho VN chưa đầy đủ và chưa tra ' +
          'được TQ — không thể kết luận an toàn.',
        );
      }
      suggestions.push('Tra cứu bổ sung với đại diện SHTT (gồm cả Trung Quốc) trước khi quyết định nhập.');
    }
  }

  reasons.push(phamViVN);
  reasons.push('Chưa đối chiếu được nhóm Nice (dữ liệu nhóm Nice phần lớn trống) — không dùng nhóm hàng để giảm mức rủi ro.');
  if (importer) {
    reasons.push('importer chỉ để tham khảo; nếu importer trùng chủ sở hữu nhãn thì cần xác minh tay, hệ thống không tự suy quyền sở hữu.');
  }
  if (originNorm && originNorm !== 'VN') {
    reasons.push(`Xuất xứ khai báo: ${originNorm}; dữ liệu quyền SHTT tại nước xuất xứ chưa cào được.`);
  }

  const evidence = [...trungKhop, ...tuongTu].slice(0, 25).map(toEvidence);

  const scope = {
    sources: ['vn-ipvietnam'],
    niceClasses: [],
    similarGroups: [],
    dataAsOf: { vn: dataAsOf },
    coverage: { vnCrawled, vnExpected },
  };

  return { level, reasons, evidence, scope, suggestions, disclaimer: DISCLAIMER };
}

/**
 * Đọc dữ liệu shtt (CHỈ ĐỌC) cho server. Trả { records, dataAsOf, vnCrawled, sources }.
 * @param {string} [dir] thư mục data/shtt (mặc định kho thật) — truyền thư mục tạm để test.
 */
export function docDuLieu(dir = DIR_SHTT_MAC_DINH) {
  const pIp = join(dir, 'vn-ipvietnam-dang-ky.jsonl');
  const records = [];
  if (existsSync(pIp)) {
    for (const line of readFileSync(pIp, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t) continue;
      try {
        records.push(JSON.parse(t));
      } catch {
        /* bỏ dòng hỏng — bảo thủ, không làm sập server */
      }
    }
  }
  let dataAsOf = null;
  let sources = [];
  const pBc = join(dir, 'bao-cao.json');
  if (existsSync(pBc)) {
    try {
      const bc = JSON.parse(readFileSync(pBc, 'utf8'));
      dataAsOf = bc.ngay || null;
      sources = Array.isArray(bc.nguon)
        ? bc.nguon.map((n) => ({ ma: n.ma, trangThai: n.trangThai, soBanGhi: n.soBanGhi }))
        : [];
    } catch {
      /* bỏ qua */
    }
  }
  return { records, dataAsOf, vnCrawled: records.length, vnExpected: VN_EXPECTED, sources };
}
