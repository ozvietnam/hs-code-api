// lib/truong-dac-thu.js — nhận diện TRƯỜNG ĐẶC THÙ của mô tả khai báo (#725 nhóm A).
//
// Gốc lỗi: bộ chấm (declaration-validator) chỉ dò TỪ KHOÁ của data/chapter-declaration-fields.json trên một khối chữ:
//   - không đọc số kèm đơn vị: "100mA" không khớp `\d+\s*a\b`, "100-240VAC" không khớp `\b\d+\s*v\b`;
//   - không đọc trường có cấu trúc: `model: "A204"` không chứa chữ "model" nên vẫn báo MISSING_MODELNUMBER,
//     `congDung` không chứa "dùng cho" nên vẫn báo MISSING_APPLICATION;
//   - ngược lại báo "có" khi chỉ có từ chung chung: "cảm biến áp suất" bị coi là đã có áp suất làm việc + nguyên lý.
//
// Module này đọc CẢ trường có cấu trúc (model, congDung, thanhPhanCauTao, quyCach, chapterSpecific) LẪN chữ trong
// tenHang/moTa/thông số, và trả về giá trị tìm được (đoạn chữ làm bằng chứng). Trường không có bộ đọc riêng thì dùng
// patterns của data/chapter-declaration-fields.json như cũ. Chỉ báo "có" khi có bằng chứng (số + đơn vị, mã hàng, cụm
// "dùng cho…"), không báo "có" vì một từ chung chung.

const { removeDiacritics } = require('./search-utils');

const fold = (s) => removeDiacritics(String(s || '').toLowerCase());
const VI_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const SO = '\\d+(?:[.,]\\d+)?';
const DAI = `${SO}(?:\\s*(?:-|~|/|den|to)\\s*${SO})?`;
// Không dính chữ/số phía trước (tránh bắt giữa mã hàng "AB12V").
const TRUOC = '(?<![a-z0-9])';
const SAU = '(?![a-z0-9])';

/** Đơn vị đo phổ biến — dùng cho "có ít nhất một thông số" và để loại số đo khỏi mã hàng. */
const DON_VI = '(?:k?v|vac|vdc|m?a|ma|k?w|hp|kva|va|hz|khz|mhz|mm|cm|m|bar|mpa|kpa|psi|inch|in|p|kg|g|l|ml|rpm|nm|mah|ah|db|lm|ohm|k|mf|uf|nf|pf)';
const SO_DON_VI_RE = new RegExp(`${TRUOC}${DAI}\\s*${DON_VI}${SAU}|${SO}\\s*(?:x|\\*|×)\\s*${SO}|\\d+\\s*(?:chan|cuc|ky tu)\\b|${SO}\\s*(?:°c|%|")`, 'i');

const reF = (src) => new RegExp(src, 'i'); // khớp trên chuỗi đã bỏ dấu

/**
 * Bộ đọc theo khoá. `f`: biểu thức trên chuỗi bỏ dấu; `r`: biểu thức trên chuỗi còn dấu (chữ thường);
 * `cauTruc`: trường có cấu trúc của declaration mà có giá trị là coi như có.
 */
const BO_DOC = {
  voltage: { f: [reF(`${TRUOC}${DAI}\\s*(?:k?v|vac|vdc|v ac|v dc|volt|von)${SAU}`), reF(`dien ap\\s*(?:dinh muc|vao|ra)?\\s*:?\\s*${SO}`)] },
  currentRating: { f: [reF(`${TRUOC}${DAI}\\s*(?:m?a|amp|ampe)${SAU}`), reF(`dong (?:dien|dinh muc|tai)\\s*(?:dinh muc)?\\s*:?\\s*${SO}`)] },
  power: { f: [reF(`${TRUOC}${DAI}\\s*(?:k?w|hp|kva|va|watt|ma luc)${SAU}`), reF(`cong suat\\s*(?:laser|dinh muc|dong co|nguon)?\\s*:?\\s*${SO}`)] },
  frequency: { f: [reF(`${TRUOC}${DAI}\\s*(?:k|m|g)?hz${SAU}`), reF(`tan so\\s*:?\\s*${SO}`)] },
  poleCount: { f: [reF(`${TRUOC}\\d+\\s*(?:p|cuc|chan|pin|pole|poles|way|tiep diem)${SAU}`), reF('\\bso (?:cuc|chan)\\s*:?\\s*\\d'), reF('\\b(?:mot|hai|ba|bon|nam|sau) (?:chan|cuc)\\b')] },
  dimensions: {
    cauTruc: ['quyCach'],
    f: [reF(`${SO}\\s*(?:x|\\*|×)\\s*${SO}`), reF(`${TRUOC}${DAI}\\s*(?:mm|cm|m|inch)(?![a-z0-9/²³])`), reF(`${TRUOC}${SO}\\s*"`), reF('\\b(?:phi|dn)\\s*=?\\s*\\d+'), reF(`(?:kich thuoc|duong kinh|chieu dai|chieu rong|chieu cao|be day|do day)\\s*:?\\s*${SO}`)],
  },
  pressureRating: { f: [reF(`${TRUOC}${DAI}\\s*(?:bar|mpa|kpa|psi|atm|kgf/cm2|kg/cm2)${SAU}`), reF('\\bpn\\s?\\d+'), reF(`ap suat\\s*(?:lam viec|toi da|dinh muc|danh nghia|do)?\\s*:?\\s*(?:tu\\s*)?${SO}`)] },
  resolution: {
    f: [
      reF(`\\d+\\s*(?:x|\\*|×)\\s*\\d+\\s*(?:ky tu|chars?|characters?|pixels?|px|diem anh|dong)\\b`),
      reF('\\b\\d{3,4}\\s*(?:x|\\*|×)\\s*\\d{2,4}\\b'),
      reF('\\b(?:1080p|720p|2160p|4k|8k|uhd|fhd|qhd|hd|qvga|wvga|vga|svga|xga)\\b'),
      reF('ky tu\\s*:?\\s*\\d+\\s*(?:x|\\*|×)\\s*\\d+'),
      reF('do phan giai'),
      reF('\\b(?:1602|2004|12864|0802|1604|4004)\\b'),
    ],
  },
  screenSize: { f: [reF(`${TRUOC}${SO}\\s*(?:inch|")`), reF(`man hinh\\s*${SO}`)] },
  outputVoltage: { f: [reF(`(?:dau ra|output|out|ra|->|→|sang)\\s*:?\\s*${DAI}\\s*(?:v|vdc|vac)${SAU}`), reF(`${TRUOC}${SO}\\s*vdc${SAU}`)] },
  voltagePrimary: { f: [reF(`(?:dau vao|input|vao|in)\\s*:?\\s*${DAI}\\s*(?:v|vac|vdc|kv)${SAU}`), reF(`${TRUOC}${DAI}\\s*vac${SAU}`), reF(`${TRUOC}${SO}\\s*kv${SAU}`)] },
  voltageSecondary: { f: [reF(`(?:dau ra|output|out|ra|->|→|sang)\\s*:?\\s*${DAI}\\s*(?:v|vdc|vac|kv)${SAU}`), reF(`${TRUOC}${SO}\\s*vdc${SAU}`)] },
  modelNumber: { cauTruc: ['model'], ma: true },
  partNumber: { cauTruc: ['model'], ma: true },
  application: {
    cauTruc: ['congDung'],
    r: [
      /dùng (?:cho|để|trong|kết nối|nối|làm|lắp|vẽ|bảo vệ|đo|điều khiển|đấu|gắn|hàn|bấm)/u,
      /sử dụng (?:cho|trong|để|với)/u,
      /công dụng/u,
      /lắp (?:cho|vào|trên|trong)/u,
      /để (?:nối|kết nối|lắp|bảo vệ|điều khiển|đo|đấu|gắn|cấp|truyền)/u,
      /(?:bảo vệ|đóng ngắt|đóng cắt) (?:mạch|màn hình|thiết bị)/u,
    ],
    f: [reF('\\bdung (?:cho|de|trong|ket noi)\\b'), reF('\\bsu dung (?:cho|trong|de)\\b'), reF('\\bcong dung\\b'), reF('\\b(?:for|used for|use for|application)\\b')],
  },
  material: {
    cauTruc: ['thanhPhanCauTao'],
    r: [
      /(?<![\p{L}\p{N}])(?:nhôm|thép|nhựa|inox|sắt|gang|kẽm|thiếc|gỗ|cao su|silicon|silicone|gốm|sứ|thủy tinh|thuỷ tinh|giấy|bìa|vải|da thuộc|titan|niken|chì|sợi thủy tinh|đồng thau|bông|len|lụa|kim loại|composite|tre|xơ|sợi)(?![\p{L}\p{N}])/u,
      /(?<!đường )(?<![\p{L}\p{N}])kính(?![\p{L}\p{N}])/u,
      /(?<![\p{L}\p{N}])đồng(?![\p{L}\p{N}])(?! hồ| bộ| nhất| thời| ý| nghĩa| loạt| dạng| phục)/u,
      /(?:chất liệu|vật liệu|làm bằng)\s*:?\s*\S/u,
    ],
    f: [reF('\\b(?:pvc|pp|pe|abs|pa|pa6|pa66|pc|pom|pbt|ptfe|pet|pu|tpu|eva|nylon|brass|copper|steel|aluminium|aluminum|stainless|plastic|rubber|cotton|polyester|carbon|polyme|polymer|polypropylen\\w*|polyetylen\\w*|silic\\w*|sus\\s?\\d{3}|ss\\s?\\d{3})\\b')],
  },
  connectorType: {
    r: [/giắc|đầu cốt|chân pin|chân cắm|pin cắm|cầu đấu|domino|ổ cắm|phích cắm|đầu bấm|bấm (?:vào )?dây|đầu nối (?!và |hoặc )\p{L}+|\d+\s*(?:chân|cực)(?!\p{L})/u],
    f: [reF('\\b(?:jack|terminal|socket|header|connector|cos|cosse|plug|rj\\d{2}|usb|hdmi|dc jack)\\b')],
  },
  principle: {
    r: [/nguyên lý|điện dung|điện cảm|cảm ứng từ|áp điện|điện trở|siêu âm|hồng ngoại|quang học|quang điện|từ tính|hiệu ứng hall|cơ học|kiểu màng|kiểu phao|nhiệt điện|bán dẫn/u],
    f: [reF('\\b(?:inductive|capacitive|piezo\\w*|resistive|strain gauge|ultrasonic|infrared|optical|hall|mems|thermocouple|rtd|pt100|laser)\\b')],
  },
  measurementType: {
    r: [/(?:đo|cảm biến|đồng hồ|bộ chuyển đổi|transmitter)\s+(?:áp suất|nhiệt độ|lưu lượng|mức|độ ẩm|tốc độ|vị trí|khoảng cách|dòng điện|điện áp|khối lượng|lực|độ rung|chênh áp)/u, /(?:áp suất|nhiệt độ|lưu lượng|chênh áp)/u],
    f: [reF('\\b(?:pressure|temperature|flow|level|humidity)\\b')],
  },
  function: {
    r: [/vi mạch|mạch tích hợp|bộ nhớ|vi xử lý|vi điều khiển|khuếch đại|điều khiển nguồn|ổn áp/u],
    f: [reF('\\b(?:ic|mcu|cpu|gpu|fpga|dsp|pmic|ldo|eeprom|flash|dram|sram|diode|transistor|mosfet|igbt|opamp|op-amp|amplifier|driver|logic|memory|processor|controller|regulator)\\b')],
  },
  packageType: { f: [reF('\\b(?:qfp|lqfp|tqfp|qfn|dfn|smd|smt|dip|sop|ssop|tssop|soic|bga|sot-?\\d+|to-?\\d+|lga|plcc)\\b')] },
  spindlePower: { r: [/trục chính|công suất trục/u], f: [reF('\\bspindle\\b')] },
  controlType: { r: [/thủ công|điều khiển số|bằng tay|tự động/u], f: [reF('\\b(?:cnc|plc|nc|manual)\\b')] },
};

// ── Mã hàng / model trong chữ ──────────────────────────────────────────────────────────────────────────────────────────
const MA_SAU_NHAN = /(?:\bmodel|\bmã hàng|\bmã sp|\bmã sản phẩm|\bmã hiệu|\bpart\s?(?:number|no)|\bp\/n|\bký hiệu|\bsố hiệu|\bmã)\s*[:#.]?\s*([A-Za-z0-9][A-Za-z0-9\-./]{1,})/iu;
const DON_VI_RE_DUOI = /^\d+(?:[.,]\d+)?(?:k?v|vac|vdc|m?a|k?w|hp|kva|va|hz|mm|cm|m|bar|mpa|kpa|psi|inch|p|kg|g|l|ml|mah|°c|%)?$/i;

/** Một mã hàng có vẻ là mã sản phẩm (không phải số đo / khoảng số / ngày). */
function laMaHang(tok) {
  const t = String(tok || '').replace(/[.,;:)]+$/, '');
  if (t.length < 3 || !/\d/.test(t)) return false;
  if (/^(?:pn|dn|m)\d+$/i.test(t)) return false; // PN16, DN15, M8: thông số, không phải mã
  const seg = t.split(/[-/]/).filter(Boolean);
  if (seg.length >= 2) {
    if (seg.every((s) => DON_VI_RE_DUOI.test(s))) {
      // 100-240VAC, 5VDC-2A: dải số / thông số. Riêng "123456-1": số dài + hậu tố số → mã hàng.
      const tranSo = seg.every((s) => /^\d+$/.test(s));
      return tranSo && seg[0].length >= 5;
    }
    return /[a-z]/i.test(t);
  }
  // Một khúc: chữ + số, ≥ 4 ký tự, có chữ IN HOA (A204, STM32F103, KSA1E) và không phải số + đơn vị (220V, 1080P)
  return t.length >= 4 && /[A-Z]/.test(t) && /[0-9]/.test(t) && !DON_VI_RE_DUOI.test(t) && !/^\d+[xX×]\d+/.test(t);
}

function timMaHang(goc) {
  const s = String(goc || '');
  const m = s.match(MA_SAU_NHAN);
  if (m && laMaHang(m[1])) return m[1].replace(/[.,;:)]+$/, '');
  for (const tok of s.split(/[\s,;()]+/)) if (laMaHang(tok)) return tok.replace(/[.,;:)]+$/, '');
  return null;
}

// ── Nguồn chữ ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Gom chữ để đọc: trường có cấu trúc + tenHang + mô tả khách + thông số + giá trị chapterSpecific. */
function nguonChu(declaration = {}, context = {}) {
  const specs = Array.isArray(declaration.thongSoKyThuat) ? declaration.thongSoKyThuat : [];
  const cs = Object.values(declaration.chapterSpecific || {}).filter((v) => v != null && String(v).trim() !== '');
  const goc = [declaration.tenHang, declaration.model, declaration.thanhPhanCauTao, declaration.congDung, declaration.quyCach,
    context.customerDescription, ...specs, ...cs].filter(Boolean).join(' • ');
  const raw = goc.toLowerCase();
  return { goc, raw, f: fold(raw) };
}

/** Đoạn chữ GỐC (giữ hoa/thường, dấu) ứng với một kết quả khớp trên chuỗi chữ thường/bỏ dấu (cùng độ dài). */
function trich(c, m) {
  const s = c.goc.length === c.f.length && c.goc.length === c.raw.length ? c.goc.substr(m.index, m[0].length) : m[0];
  return s.trim();
}

const coGiaTri = (v) => v != null && String(v).trim() !== '';

/**
 * Trường `fieldDef.key` có mặt không, kèm bằng chứng.
 * @returns {{co: boolean, giaTri: string|null, nguon: 'chapterSpecific'|'cauTruc'|'chu'|null}}
 */
function phatHienTruong(fieldDef, declaration = {}, context = {}, chu = null) {
  const key = fieldDef.key;
  const dat = declaration.chapterSpecific?.[key];
  if (coGiaTri(dat)) return { co: true, giaTri: String(dat).trim(), nguon: 'chapterSpecific' };
  const bo = BO_DOC[key];
  for (const k of bo?.cauTruc || []) {
    if (coGiaTri(declaration[k])) return { co: true, giaTri: String(declaration[k]).trim().slice(0, 120), nguon: 'cauTruc' };
  }
  const c = chu || nguonChu(declaration, context);
  if (bo) {
    if (bo.ma) {
      const ma = timMaHang(c.goc);
      if (ma) return { co: true, giaTri: ma, nguon: 'chu' };
    }
    for (const re of bo.r || []) { const m = c.raw.match(re); if (m) return { co: true, giaTri: trich(c, m), nguon: 'chu' }; }
    for (const re of bo.f || []) { const m = c.f.match(re); if (m) return { co: true, giaTri: trich(c, m), nguon: 'chu' }; }
    return { co: false, giaTri: null, nguon: null };
  }
  // Không có bộ đọc riêng: patterns của data/chapter-declaration-fields.json (có dấu → chuỗi còn dấu; ascii → chuỗi bỏ dấu).
  for (const pat of fieldDef.patterns || []) {
    try {
      const m = VI_RE.test(pat) ? c.raw.match(new RegExp(pat, 'iu')) : c.f.match(new RegExp(fold(pat), 'i'));
      if (m) return { co: true, giaTri: trich(c, m), nguon: 'chu' };
    } catch { /* regex hỏng → bỏ qua */ }
  }
  return { co: false, giaTri: null, nguon: null };
}

// ── Đồng nghĩa thương mại → chữ biểu thuế ──────────────────────────────────────────────────────────────────────────────
// Bảng nhỏ, có kiểm: khách gọi tên thương mại, biểu thuế gọi tên khác ("cọ vẽ" ↔ "bút lông vẽ", "LCD" ↔ "tinh thể lỏng",
// "chân pin/đầu cốt" là một loại "đầu nối"). Chỉ dùng để SO KHỚP (MISMATCH_HS, luật "Loại khác" bị trừ) — không bao giờ
// đưa vào câu khai.
const DONG_NGHIA = [
  [/(?<![\p{L}\p{N}])cọ(?![\p{L}\p{N}])/u, ['bút lông']],
  [/\blcd\b|màn hình tinh thể lỏng/u, ['tinh thể lỏng', 'màn hình']],
  [/\bled\b/u, ['điốt phát quang']],
  [/\b(?:ic|chip)\b|vi mạch/u, ['mạch tích hợp', 'mạch điện tử tích hợp']],
  [/\b(?:pcb|pcba)\b|bo mạch|bảng mạch|board mạch/u, ['mạch in']],
  [/chân pin|chân cắm|đầu cốt|\bcos\b|giắc|\bjack\b|\bterminal\b|\bconnector\b|cầu đấu/u, ['đầu nối']],
  [/\badapt(?:er|or)\b|củ sạc|bộ nguồn|nguồn (?:tổ ong|xung|adapter)/u, ['biến đổi tĩnh điện', 'bộ nguồn']],
  [/cảm biến|\bsensor\b|transmitter/u, ['dụng cụ đo', 'thiết bị đo']],
  [/(?<![\p{L}\p{N}])vòi(?![\p{L}\p{N}])/u, ['vòi', 'van']],
];
/** Chuỗi chữ thường còn dấu + các từ biểu thuế đồng nghĩa (chỉ để so khớp). */
function moRongDongNghia(textLower) {
  const t = String(textLower || '').toLowerCase();
  const them = [];
  for (const [re, tu] of DONG_NGHIA) if (re.test(t)) them.push(...tu);
  return them.length ? `${t} ${them.join(' ')}` : t;
}

/** Câu khai có ít nhất một thông số (số kèm đơn vị, kích thước AxB, số chân/cực) hay không. */
function coThongSoTrongChu(text) {
  return SO_DON_VI_RE.test(fold(text));
}

module.exports = { phatHienTruong, nguonChu, timMaHang, laMaHang, coThongSoTrongChu, moRongDongNghia, BO_DOC, fold };
