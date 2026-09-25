// Trích bản ghi tiền lệ từ MỘT văn bản phân loại (§2.1 nguyên tắc 4: thà 0 bản ghi
// còn hơn 1 bản ghi sai). LLM chỉ đề xuất; mọi thứ quyết định đều kiểm tất định:
//   - số hiệu + ngày lấy từ TIÊU ĐỀ nguồn, không lấy từ LLM
//   - mã HS phải xuất hiện NGUYÊN VĂN trong toàn văn (8504.40.90 / 85044090)
//   - ≥ 60 % từ của mô tả phải có trong toàn văn (chống bịa)
//   - lọc riêng tư của repo (tên DN, MST, số tờ khai) — dính là bỏ bản ghi
import { createRequire } from 'module';
import { join } from 'path';

export const SYSTEM_PROMPT = `Bạn trích KẾT QUẢ PHÂN LOẠI mã HS từ MỘT văn bản của Hải quan Việt Nam (thông báo kết quả phân loại, thông báo xác định trước mã số, hoặc công văn hướng dẫn phân loại).
LUẬT:
1. CHỈ dùng nội dung văn bản. Không suy ra mã từ kiến thức riêng. Mã HS chép ĐÚNG như văn bản kết luận (bỏ dấu chấm): 8 chữ số; nếu văn bản chỉ kết luận tới nhóm/phân nhóm thì ghi 4 hoặc 6 chữ số.
2. Chỉ lấy mã mà văn bản KẾT LUẬN hàng THUỘC VỀ. Mã văn bản nói "không thuộc", "loại trừ", hay chỉ trích dẫn làm căn cứ thì đưa vào confusedWith (nếu là mã hàng bị nhầm) hoặc bỏ.
3. Văn bản nói "không đủ cơ sở", trả hồ sơ, chuyển đơn vị khác, chỉ nhắc nguyên tắc chung mà không kết luận mã cho mặt hàng cụ thể → coKetLuan=false, records=[].
4. description = tên hàng + đặc tính kỹ thuật quyết định việc phân loại (chất liệu, cấu tạo, chức năng, thông số), 20–400 ký tự, tiếng Việt. TUYỆT ĐỐI KHÔNG ghi tên doanh nghiệp, địa chỉ, số công văn của doanh nghiệp, số tờ khai, trị giá. Tên nhãn hiệu/model của HÀNG thì được.
5. Một văn bản có nhiều mặt hàng → mỗi mặt hàng một record. Kết luận có điều kiện ("nếu dùng cho… thì…") → mỗi nhánh một record, ghi điều kiện vào conditionVi.
Trả DUY NHẤT JSON:
{"coKetLuan": true|false, "lyDoKhongKetLuan": "…"|null,
 "records": [{"hsCode": "85044090", "description": "…", "reasonVi": "căn cứ như văn bản nêu (chú giải, quy tắc GIR, đặc tính), ≤ 600 ký tự", "girRule": "GIR 1"|null, "confusedWith": ["8 chữ số"], "conditionVi": "…"|null}]}`;

export function buildUserPrompt({ title, text }) {
  return `TIÊU ĐỀ: ${title}\n\nTOÀN VĂN:\n${String(text).slice(0, 14000)}`;
}

const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export function codeAppears(code, text) {
  const d = String(code || '').replace(/\D/g, '');
  if (![4, 6, 8].includes(d.length)) return false;
  const parts = d.length === 4 ? [d] : d.length === 6 ? [d.slice(0, 4), d.slice(4)] : [d.slice(0, 4), d.slice(4, 6), d.slice(6)];
  const re = new RegExp(`(?<![\\d])${parts.join('[.\\s]?')}(?![\\d])`);
  return re.test(String(text || ''));
}

export function coverage(description, text) {
  const hay = fold(text);
  const toks = [...new Set(fold(description).split(/[^a-z0-9]+/).filter((t) => t.length >= 3))];
  if (!toks.length) return 0;
  return toks.filter((t) => hay.includes(t)).length / toks.length;
}

const COMPANY_RE = /\b(c[ôo]ng ty|cty|tnhh|c[ổo] ph[ầa]n|co\.?,? ?ltd|corporation|jsc)\b[^,.;:()]*/giu;

export function scrub(s) {
  return String(s || '').replace(COMPANY_RE, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}

/**
 * Kiểm + chuẩn hóa đầu ra LLM thành bản ghi schema community.
 * @returns {{records:Array, rejected:Array<{hsCode:string, why:string}>}}
 */
export function verifyRecords(llmJson, { text, ref, date, url, repoDir }) {
  const require = createRequire(join(repoDir, 'package.json'));
  const { scanObject } = require(join(repoDir, 'lib/privacy-filter.js'));
  const records = [];
  const rejected = [];
  if (!llmJson || llmJson.coKetLuan === false) return { records, rejected, noConclusion: llmJson?.lyDoKhongKetLuan || 'không có kết luận' };
  for (const r of Array.isArray(llmJson.records) ? llmJson.records : []) {
    const hsCode = String(r.hsCode || '').replace(/\D/g, '');
    const why = (w) => rejected.push({ hsCode, why: w });
    if (![4, 6, 8].includes(hsCode.length)) { why('mã không phải 4/6/8 số'); continue; }
    if (!codeAppears(hsCode, text)) { why('mã không xuất hiện nguyên văn trong toàn văn'); continue; }
    let description = scrub(r.description);
    if (description.length < 20) { why('mô tả quá ngắn sau khi lọc'); continue; }
    if (description.length > 480) description = description.slice(0, 477) + '…';
    const cov = coverage(description, text);
    if (cov < 0.6) { why(`mô tả chỉ khớp ${Math.round(cov * 100)}% toàn văn`); continue; }
    let reasonVi = scrub(r.reasonVi);
    if (r.conditionVi) reasonVi = `${reasonVi} Điều kiện: ${scrub(r.conditionVi)}`.trim();
    const rec = {
      hsCode,
      description,
      source: { type: 'TB-TCHQ', reference: ref, ...(date ? { issuedDate: date } : {}), url },
      ...(reasonVi ? { reasonVi: reasonVi.slice(0, 1000) } : {}),
      ...(r.girRule && /^GIR\s?[1-6]/i.test(r.girRule) ? { girRule: String(r.girRule).slice(0, 20) } : {}),
      confusedWith: [...new Set((r.confusedWith || []).map((c) => String(c).replace(/\D/g, '')).filter((c) => c.length === 8 && c !== hsCode && codeAppears(c, text)))],
    };
    const hits = scanObject(rec).filter((h) => h.hard !== false);
    if (hits.length) { why(`lọc riêng tư: ${hits.map((h) => `${h.path} ${h.what}`).slice(0, 2).join('; ')}`); continue; }
    records.push(rec);
  }
  return { records, rejected };
}
