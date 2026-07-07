#!/usr/bin/env node
// Sinh public/community-data.json — dữ liệu CÔNG KHAI an toàn cho trang cộng đồng.
// CHỈ dữ liệu pháp quy (biểu thuế/văn bản/chú giải). TUYỆT ĐỐI không nhúng tờ khai
// khách hàng (oz-declarations) hay bất kỳ thông tin riêng tư nào.
//
//   node scripts/build-community-data.mjs

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');

const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
const count = (x) => (Array.isArray(x) ? x.length : Object.keys(x || {}).length);

const tax = read('tax.json');
const taxRows = Array.isArray(tax) ? tax : Object.values(tax);
const enriched = read('tax-enriched.json');
const enrichedRows = Array.isArray(enriched) ? enriched : Object.values(enriched);
const legal = read('legal-docs.json');
const legalDocs = Object.values(legal.documents || {});
const notes = read('notes.json');
const precedents = read('precedents.json');
const conflicts = read('conflicts.json');
const ministries = read('ministries-vn.json');

// Benchmark độ chính xác (public-safe: chỉ số liệu tổng hợp, không có mô tả tờ khai).
let benchmark = null;
try { benchmark = read('accuracy-latest.json'); } catch { /* chưa có thì bỏ qua */ }

// Corpus sản phẩm mã "Loại khác" — chỉ số tổng hợp + vài ví dụ công khai (tên sinh từ template, không phải tờ khai khách).
let loaiKhac = null;
try {
  const lkStats = read('loai-khac-products-stats.json');
  const showcaseHs = ['84021219', '39269099', '87032290'];
  const productsByHs = {};
  const jsonlPath = join(dataDir, 'loai-khac-products.jsonl');
  try {
    for (const line of readFileSync(jsonlPath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const { hs, tenHang } = JSON.parse(line);
        if (!showcaseHs.includes(hs)) continue;
        if (!productsByHs[hs]) productsByHs[hs] = [];
        if (productsByHs[hs].length < 4) productsByHs[hs].push(tenHang);
      } catch { /* skip bad line */ }
    }
  } catch { /* jsonl missing */ }
  loaiKhac = {
    updatedAt: lkStats.generatedAt || null,
    totals: lkStats.totals,
    byPotential: lkStats.byPotential,
    indexCodes: count(read('loai-khac-index.json')),
    explain: 'Mã HS 8 số "Loại khác" (residual): hàng thuộc nhóm cha nhưng không khớp mã con cụ thể. Corpus gồm tên sản phẩm ví dụ giúp ERP tra cứu và AI gợi ý đúng phạm vi.',
    pipeline: 'tax.json (h6En qualifier) + loai-khac-index (sibling/oz-gold) → domain template (H6EN_DOMAINS) → gen-loai-khac-products-rule.mjs → loai-khac-products.jsonl',
    showcase: showcaseHs.map((hs) => ({
      hsCode: hs,
      h6En: lkStats.codes?.[hs]?.signals?.h6En || null,
      productCount: lkStats.codes?.[hs]?.productCount || 0,
      potential: lkStats.codes?.[hs]?.potential || null,
      products: productsByHs[hs] || [],
    })),
  };
} catch { /* chưa có corpus thì bỏ qua */ }

// Mô tả khai báo ECUS (public-safe: ví dụ tĩnh từ test fixture, không cần gọi AI).
const describe = {
  maxLength: 200,
  legalRefs: [
    'TT 39/2018/TT-BTC mục 1.78 Phụ lục I',
    'CV 5189/TCHQ-GSQL (2019)',
    'CV 755/TCHQ-GSQL (2020)',
  ],
  explain: 'Từ mã HS 8 số đã chốt + thông tin hàng (tên, nhãn hiệu, model, xuất xứ…), hệ thống sinh mô tả một dòng cho ô ECUS/VNACCS — tối đa 200 ký tự, xuất xứ và tình trạng luôn giữ ở cuối.',
  pipeline: 'hsCode + attrs → Gemini (structured declaration) → composeWithMeta (≤200 ký tự) → validateDeclaration (TT39 + anti-pattern)',
  levels: ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'WEAK', 'REJECT'],
  showcase: {
    input: {
      hsCode: '85171300',
      productName: 'Điện thoại di động thông minh Apple iPhone 15 Pro Max',
      brand: 'Apple',
      model: 'A2848',
      origin: 'CN',
      condition: 'Mới 100%',
    },
    customsDescription:
      'Điện thoại di động thông minh Apple iPhone 15 Pro Max; nhãn hiệu Apple; model A2848; thông số: dung lượng 256GB; chip A17 Pro; màn 6.7 inch; xuất xứ Trung Quốc; Mới 100%',
    length: 169,
    truncated: false,
    compliance: { level: 'EXCELLENT', score: 100 },
  },
  truncateExample: {
    fullLength: 341,
    length: 180,
    dropped: ['quyCach', 'congDung', 'thongSoKyThuat', 'thanhPhanCauTao'],
    text:
      'Máy bơm nước ly tâm đầu gang inox dùng cho hệ thống tưới tiêu nông nghiệp và cấp nước sinh hoạt công nghiệp quy mô vừa và nhỏ; nhãn hiệu Pentax; model CM50-220; xuất xứ Ý; Mới 100%',
  },
};

// ── Số liệu tổng quan ────────────────────────────────────────────────────────
const stats = {
  hsCodes: taxRows.length,
  policiesEnriched: enrichedRows.length,
  legalDocs: legalDocs.length,
  legalDocsVerified: legalDocs.filter((d) => d.verified).length,
  chapterNotes: count(notes),
  precedents: count(precedents),
  conflicts: count(conflicts),
  ministries: count(ministries),
  loaiKhacCodes: loaiKhac?.totals?.codes || 0,
  loaiKhacProducts: loaiKhac?.totals?.products || 0,
};

// ── Danh sách văn bản pháp luật (chỉ field an toàn, public) ──────────────────
const docs = legalDocs
  .map((d) => ({
    code: d.code,
    type: d.type,
    issuer: d.issuer,
    issuerFullVi: d.issuerFullVi,
    titleVi: d.titleVi,
    status: d.status,
    verified: !!d.verified,
    url: d.url,
    year: d.year || null,
    citedInHsCount: d.citedInHsCount || 0,
    scopeHsChapters: d.scopeHsChapters || [],
  }))
  .sort((a, b) => b.citedInHsCount - a.citedInHsCount);

const out = {
  generatedAt: new Date().toISOString(),
  stats,
  benchmark,
  loaiKhac,
  describe,
  legalDocs: docs,
  meta: {
    note: 'Dữ liệu công khai phục vụ cộng đồng XNK. Không chứa thông tin khách hàng.',
    repo: 'https://github.com/ozvietnam/hs-code-api',
  },
};

const outPath = join(root, 'public', 'community-data.json');
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('Đã ghi', outPath);
console.log('Stats:', JSON.stringify(stats));
console.log('Văn bản:', docs.length, '(verified', stats.legalDocsVerified + ')');
