#!/usr/bin/env node
// Dựng nội dung issue "Nhu cầu từ hàng thật (tự động)" từ GET /api/demand (CEO 05/10/2026).
// Phần của hs-code-api: nhãn hiệu chưa theo dõi, nhãn chỉ có chữ Hán, chữ gợi hàng nhái, ô bắt
// buộc hay thiếu, nhãn thông số tiếng Trung từ điển chưa hiểu, nhóm chưa có template.
// Phần KTCN 2026 (hợp quy) do oz-wiki-plhq nhận qua tools/nhu-cau.mjs → báo cáo điểm mù.
//   node scripts/demand-issue.mjs                 → tải bản prod, in markdown ra stdout
//   node scripts/demand-issue.mjs --from <tệp>    → đọc tệp JSON cục bộ
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const URL_DEMAND = process.env.HS_DEMAND_URL || 'https://hs-kb.uythacnhapkhau.com/api/demand';

let FIELD_LABEL = {};
try {
  const cat = require('../data/chapter-declaration-fields.json');
  FIELD_LABEL = Object.fromEntries(Object.entries(cat.fields || {}).map(([k, v]) => [k, v.labelVi || k]));
  const syn = require('../data/attribute-synonyms-zh.json');
  for (const [k, v] of Object.entries(syn.keys || {})) FIELD_LABEL[k] ||= v.labelVi || k;
} catch { /* nhãn tiếng Việt là phụ */ }

// Chữ từ dữ liệu (nhãn hiệu, nhãn Trung…) → thoát markdown + chặn @nhắc tên / link.
export function md(x) {
  return String(x ?? '').replace(/[\\`*_[\]()<>#|!~]/g, (c) => `\\${c}`).replace(/@/g, '@\u200b').replace(/https?:\/\//gi, (m) => m.replace(':', '\u200b:')).slice(0, 80);
}

const P = { Cao: '🔴 Cao', 'Vừa': '🟠 Vừa', 'Thấp': '⚪ Thấp' };

export function renderIssue(d, { limit = 40 } = {}) {
  const sec = (title, items, line, viec) => {
    const out = ['', `## ${title} (${items.length})`, '', viec, ''];
    if (!items.length) return [...out, '_Chưa có._'];
    for (const it of items.slice(0, limit)) out.push(`- [ ] ${P[it.priority] || it.priority} · ${line(it)} — gặp gần nhất ${it.lastSeen}`);
    if (items.length > limit) out.push(`- … và ${items.length - limit} mục khác (GET /api/demand)`);
    return out;
  };
  const lines = [
    `# Nhu cầu từ hàng thật — cập nhật ${String(d.generatedAt || '').slice(0, 10)}`,
    '',
    `Gom từ phiếu hồ sơ khai báo (\`/api/declaration-sheet\`) của các món hàng thật trong ${d.windowDays} ngày (từ ${d.since}). Mức ưu tiên theo số lần gặp — **không công bố số lượng, tên hàng, link, shop hay khách** (CEO 05/10/2026). Sinh tự động bởi \`scripts/demand-issue.mjs\`, không sửa tay.`,
    '',
    `Phần **hợp quy / KTCN 2026** (${(d.ktcn2026 || []).length} mã HS) chuyển sang oz-wiki-plhq — báo cáo điểm mù nhóm "Mã HS có hàng thật chưa đối chiếu KTCN 2026".`,
    ...sec('Nhãn hiệu chưa có trong danh sách theo dõi', d.brands || [], (b) => `**${md(b.brand)}** (nhóm ${b.headings.map(md).join(', ')})`,
      'Tra bảo hộ tại VN (IP Vietnam / WIPO) + đăng ký giám sát TCHQ. Có rủi ro → thêm vào `data/trademark-watch.json` (#60).'),
    ...sec('Nhãn hiệu chỉ có chữ Hán', d.brandsHanOnly || [], (b) => `**${md(b.brandZh)}** (nhóm ${b.headings.map(md).join(', ')})`,
      'Ghi tên Latin / pinyin chính thức để phiếu điền được ô nhãn hiệu và khớp danh sách theo dõi.'),
    ...sec('Chữ gợi hàng nhái trên tên hàng', d.counterfeitTerms || [], (c) => `**${md(c.term)}** (nhóm ${c.headings.map(md).join(', ')})`,
      'Rà kiểu dáng / nhãn hiệu được bảo hộ cho các nhóm hàng này.'),
    ...sec('Ô bắt buộc hay thiếu', d.missingFields || [], (f) => `Nhóm **${md(f.heading)}** · ${md(FIELD_LABEL[f.field] || f.field)}`,
      'Thêm nhãn tiếng Trung vào `data/attribute-synonyms-zh.json`, hoặc xem lại template nhóm (ô không hợp nhóm hàng).'),
    ...sec('Nhãn thông số tiếng Trung từ điển chưa hiểu', d.zhLabels || [], (z) => `${md(z.label)}`,
      'Gắn vào khóa chuẩn trong `data/attribute-synonyms-zh.json` (hoặc bỏ qua nếu là thông tin bán hàng).'),
    ...sec('Nhãn thông số không thuộc thư viện nhóm (misc)', d.unknownLabels || [], (z) => `${md(z.label)} (nhóm ${(z.headings || []).map(md).join(', ')})`,
      'Nếu là đặc tính hàng: gắn khoá trong `data/attribute-synonyms-zh.json` + thêm ô vào template nhóm; nếu là rác bán hàng: thêm vào `data/noise-labels-zh.json`.'),
    ...sec('Nhóm 4 số chưa có template ô khai báo', d.noHeadingTemplate || [], (h) => `Nhóm **${md(h.heading)}**`,
      'Thêm template trong `lib/declaration-field-templates.js` rồi `npm run build:declaration-fields`.'),
  ];
  return lines.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--from');
  let d;
  if (i >= 0) d = JSON.parse(readFileSync(process.argv[i + 1], 'utf8'));
  else {
    const res = await fetch(URL_DEMAND);
    if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${URL_DEMAND}`);
    d = await res.json();
  }
  process.stdout.write(renderIssue(d));
}
