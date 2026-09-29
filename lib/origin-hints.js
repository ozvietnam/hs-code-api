// Nhận diện NƯỚC SẢN XUẤT từ tiêu đề hàng — tách khỏi NƠI MUA.
//
// VÌ SAO: ERP mặc định mọi hàng mua từ người bán Trung Quốc là xuất xứ Trung
// Quốc rồi báo "có C/O mẫu E → thuế 0%". Coca-Cola Mexico (墨西哥) mua trên
// Taobao vẫn là hàng Mexico: không được dùng C/O mẫu E (ACFTA chỉ cho hàng xuất
// xứ Trung Quốc) — khai theo thì bị truy thu 35% + phạt.
// Module chỉ đọc chữ trong tiêu đề; không khẳng định xuất xứ pháp lý (việc đó
// cần chứng từ), chỉ cảnh báo khi tiêu đề nói hàng sản xuất ở nước khác.

// Tên nước tiếng Trung. "X版/X式/X风/X系/X款" là phong cách (韩版 = kiểu Hàn), không phải xuất xứ.
const ZH_COUNTRIES = [
  ['墨西哥', 'MX'], ['日本', 'JP'], ['韩国', 'KR'], ['泰国', 'TH'], ['美国', 'US'], ['德国', 'DE'],
  ['法国', 'FR'], ['意大利', 'IT'], ['英国', 'GB'], ['西班牙', 'ES'], ['澳大利亚', 'AU'], ['澳洲', 'AU'],
  ['新西兰', 'NZ'], ['马来西亚', 'MY'], ['印度尼西亚', 'ID'], ['印尼', 'ID'], ['越南', 'VN'], ['台湾', 'TW'],
  ['荷兰', 'NL'], ['瑞士', 'CH'], ['加拿大', 'CA'], ['俄罗斯', 'RU'], ['印度', 'IN'], ['巴西', 'BR'],
  ['比利时', 'BE'], ['丹麦', 'DK'], ['瑞典', 'SE'], ['奥地利', 'AT'], ['新加坡', 'SG'], ['菲律宾', 'PH'],
  ['土耳其', 'TR'], ['波兰', 'PL'], ['捷克', 'CZ'], ['爱尔兰', 'IE'], ['挪威', 'NO'], ['芬兰', 'FI'],
];
const STYLE_SUFFIX = /^[版式风系款味]/;
// Dấu hiệu nói về nơi sản xuất đi kèm tên nước (mạnh hơn tên nước đứng một mình).
const ZH_ORIGIN_MARKERS = /(原装|进口|产地|原产|制造|生产|made\s*in)/i;
const VI_EN_COUNTRIES = [
  [/m[eê][\s-]?(hi|xi)[\s-]?c[oô]|mexico/i, 'MX'], [/nh[aậ]t b[aả]n|japan/i, 'JP'], [/h[aà]n qu[oố]c|korea/i, 'KR'],
  [/th[aá]i lan|thailand/i, 'TH'], [/hoa k[yỳ]|\busa\b|united states/i, 'US'], [/\bđức\b|germany/i, 'DE'],
  [/\bpháp\b|france/i, 'FR'], [/italia|italy/i, 'IT'], [/malaysia/i, 'MY'], [/indonesia/i, 'ID'],
  [/đài loan|taiwan/i, 'TW'], [/australia|\búc\b/i, 'AU'],
];
const VI_EN_MARKERS = /(xu[aấ]t x[uứ]|s[aả]n xu[aấ]t t[aạ]i|made in|origin|nh[aậ]p kh[aẩ]u t[uừ])/i;

/**
 * detectOrigin(text, { llmOrigin }) → {
 *   detectedOrigin: 'MX' | null,
 *   evidence: ['墨西哥'],
 *   confidence: 'HIGH' | 'MEDIUM' | null,
 *   importedIntoChina: bool,   // tiêu đề có "进口" — hàng TQ nhập về rồi bán lại
 * }
 */
function detectOrigin(text, opts = {}) {
  const s = String(text || '');
  const evidence = [];
  const found = new Map();
  for (const [name, iso] of ZH_COUNTRIES) {
    let from = 0;
    for (;;) {
      const i = s.indexOf(name, from);
      if (i < 0) break;
      from = i + name.length;
      if (STYLE_SUFFIX.test(s.slice(from, from + 1))) continue; // 韩版, 日式…
      // 印度 nằm trong 印度尼西亚 — bỏ nếu là một phần tên dài hơn đã có trong danh sách
      if (name === '印度' && s.slice(i, i + 5) === '印度尼西亚') continue;
      found.set(iso, (found.get(iso) || 0) + 1);
      evidence.push(name);
    }
  }
  for (const [re, iso] of VI_EN_COUNTRIES) {
    const m = s.match(re);
    if (m && VI_EN_MARKERS.test(s)) { found.set(iso, (found.get(iso) || 0) + 1); evidence.push(m[0]); }
  }
  const importedIntoChina = /进口/.test(s);
  const llmOrigin = opts.llmOrigin && /^[A-Z]{2}$/.test(opts.llmOrigin) ? opts.llmOrigin : null;
  if (llmOrigin && llmOrigin !== 'CN') found.set(llmOrigin, (found.get(llmOrigin) || 0) + 1);
  found.delete('CN');
  if (!found.size) {
    return { detectedOrigin: null, evidence: [], confidence: importedIntoChina ? 'MEDIUM' : null, importedIntoChina };
  }
  const [iso] = [...found.entries()].sort((a, b) => b[1] - a[1])[0];
  const strong = ZH_ORIGIN_MARKERS.test(s) || VI_EN_MARKERS.test(s) || (llmOrigin === iso && evidence.length > 0);
  return { detectedOrigin: iso, evidence: [...new Set(evidence)].slice(0, 5), confidence: strong ? 'HIGH' : 'MEDIUM', importedIntoChina };
}

/**
 * Đánh giá xuất xứ cho response /api/suggest: cảnh báo khi tiêu đề chỉ ra nước
 * sản xuất khác Trung Quốc — C/O mẫu E (ACFTA) không áp dụng.
 */
function originAssessment(text, opts = {}) {
  const d = detectOrigin(text, opts);
  if (!d.detectedOrigin) {
    return {
      detectedOrigin: null,
      importedIntoChina: d.importedIntoChina,
      acftaApplicable: null,
      ...(d.importedIntoChina ? {
        warningVi: 'Tiêu đề có "进口" (hàng nhập khẩu vào Trung Quốc): nước sản xuất có thể KHÔNG phải Trung Quốc. Xác minh xuất xứ trước khi áp C/O mẫu E.',
      } : {}),
    };
  }
  const high = d.confidence === 'HIGH';
  const ev = d.evidence.join(', ') || 'theo dữ kiện hàng';
  return {
    detectedOrigin: d.detectedOrigin,
    evidence: d.evidence,
    confidence: d.confidence,
    importedIntoChina: d.importedIntoChina,
    // HIGH (tên nước + "原装/进口/产地/xuất xứ…"): chắc không phải hàng TQ → false.
    // MEDIUM (chỉ có tên nước, vd "日本丝" = sợi Nhật): chưa kết luận → null + cảnh báo.
    acftaApplicable: high ? false : null,
    warningVi: high
      ? `Tiêu đề cho thấy hàng sản xuất tại ${d.detectedOrigin} (${ev}). Mua từ người bán Trung Quốc KHÔNG làm hàng có xuất xứ Trung Quốc: không dùng C/O mẫu E (ACFTA); khai xuất xứ ${d.detectedOrigin} và tính thuế theo xuất xứ thật.`
      : `Tiêu đề nhắc tới ${d.detectedOrigin} (${ev}): hàng hoặc nguyên liệu có thể sản xuất ngoài Trung Quốc. Xác minh xuất xứ trước khi áp C/O mẫu E.`,
  };
}

module.exports = { detectOrigin, originAssessment };
