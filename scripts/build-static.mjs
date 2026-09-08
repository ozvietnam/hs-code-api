#!/usr/bin/env node
/**
 * SINH BỘ DỮ LIỆU TĨNH CHO CDN — mặt công khai của dự án không cần server.
 *
 * VÌ SAO CÓ FILE NÀY
 * Toàn bộ endpoint công khai (tax, search, notes, kg_chapter, customs-types và
 * nhóm resource của dataset) chỉ ĐỌC JSON: không gọi LLM, không ghi, không
 * session. Loại nội dung đó chạy trên CDN tĩnh tốt hơn mọi server — miễn phí,
 * không sập, không phụ thuộc đường truyền nhà. Phần THẬT SỰ cần máy tính
 * (suggest / describe / classify / admin) vẫn kín sau Bearer token và không nằm
 * trong bộ này.
 *
 * NGUYÊN TẮC AN TOÀN — đọc kỹ trước khi thêm output mới
 * 1. Mỗi lần emit phải KHAI nguồn theo lib/public-access.js. Khai sai hoặc khai
 *    thứ chưa nằm trong allowlist thì build DỪNG, không sinh file. Đây là cùng
 *    một allowlist mà API dùng, nên không thể có chuyện bản tĩnh hở dữ liệu mà
 *    bản API vẫn kín.
 * 2. Dùng lại đúng hàm lib mà handler API gọi (mapTaxLookup, buildChaptersIndex,
 *    listDocs...). Bản tĩnh và bản API vì thế không thể lệch shape.
 * 3. Có quyền BỎ BỚT so với allowlist (xem OMITTED) — bỏ thì mất tính năng,
 *    lộ thì không thu hồi được; luôn chọn hướng sai an toàn.
 *
 * Chạy:  npm run build:static            → dist/
 *        HS_STATIC_OUT=/duong/dan npm run build:static
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const {
  MAX_FILES,
  OMITTED,
  assertPublicSource,
  checkLimits,
} = require('../lib/static-export.js');
const { taxData, notesData, precedentsData, conflictsData } = require('../lib/data.js');
const { mapTaxLookup } = require('../lib/tax-mapper.js');
const { getEnrichedForHs } = require('../lib/enriched-data.js');
const { getProcedures, listProcedures } = require('../lib/policy-procedures.js');
const { buildChapterTree } = require('../lib/tree-metadata.js');
const { buildChaptersIndex } = require('../lib/chapters-index.js');
const { buildNoteChain } = require('../lib/gir-notes.js');
const { listTypes } = require('../lib/customs-types.js');
const { listMinistries, getMinistriesByChapter } = require('../lib/ministries.js');
const { listDocs, getDocByCode } = require('../lib/legal-docs.js');
const { listTaxonomySummary } = require('../lib/material-taxonomy.js');
const { getAccuracyStats } = require('../lib/learned-corrections.js');
const { kgStatsPayload } = require('../lib/kg-stats.js');

// resolve: nhận cả đường dẫn tuyệt đối lẫn tương đối.
const OUT = process.env.HS_STATIC_OUT
  ? resolve(process.cwd(), process.env.HS_STATIC_OUT)
  : join(root, 'dist');

const SCHEMA_VERSION = 'v1';

// HS_STATIC_SAMPLE=<chương> → chỉ xuất một chương. Dùng cho test: chạy đúng đường
// emit thật (kể cả chốt chặn allowlist) mà không phải ghi 14.000 file mỗi lần CI chạy.
const SAMPLE = process.env.HS_STATIC_SAMPLE ? String(process.env.HS_STATIC_SAMPLE).padStart(2, '0') : null;
const inSample = (hs) => !SAMPLE || String(hs).startsWith(SAMPLE);

// --- Ghi file có kiểm soát -----------------------------------------------------

let fileCount = 0;
let byteCount = 0;
let largestFile = { path: null, bytes: 0 };
const manifestEntries = [];


function write(relPath, payload) {
  const full = join(OUT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  const body = `${JSON.stringify(payload)}\n`;
  writeFileSync(full, body);
  const bytes = Buffer.byteLength(body);
  fileCount += 1;
  byteCount += bytes;
  if (bytes > largestFile.bytes) largestFile = { path: relPath, bytes };
  return bytes;
}

/** Xuất một nhóm file, có khai nguồn + mô tả để đưa vào manifest. */
function emit({ source, path: relPath, describe, payload, count, covers }) {
  assertPublicSource(source);
  if (payload !== undefined) write(relPath, payload);
  manifestEntries.push({
    path: relPath,
    source,
    describe,
    ...(count === undefined ? {} : { count }),
    ...(covers === undefined ? {} : { covers }),
  });
}

// --- Dọn thư mục ra ------------------------------------------------------------

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

const V = (p) => `${SCHEMA_VERSION}/${p}`;
const t0 = Date.now();

// --- 1. Tra thuế theo mã: một file mỗi mã --------------------------------------
// Mirror api/tax.js — cùng mapTaxLookup + cùng phần policyProcedures.
{
  const codes = Object.keys(taxData).filter(inSample).sort();
  for (const hs of codes) {
    const result = mapTaxLookup(hs);
    const enriched = getEnrichedForHs(hs);
    const procedures = enriched?.warnings ? getProcedures(enriched.warnings) : [];
    if (procedures.length > 0) result.policyProcedures = procedures;
    write(V(`code/${hs}.json`), result);
  }
  emit({
    source: 'endpoint:tax',
    path: V('code/{hsCode}.json'),
    describe: 'Tra thuế + chính sách theo mã HS 8 số. Tương đương GET /api/tax?hs=',
    count: codes.length,
  });
}

// --- 2. Chương: chỉ mục + danh sách mã + cây -----------------------------------
{
  const chapters = buildChaptersIndex();
  emit({
    source: 'dataset:chapters',
    path: V('chapters.json'),
    describe: 'Chỉ mục toàn bộ chương. Tương đương GET /api/dataset?resource=chapters',
    payload: { total: chapters.length, chapters },
  });

  const byChapter = new Map();
  for (const row of Object.values(taxData)) {
    if (!inSample(row.hs)) continue;
    const ch = row.hs.slice(0, 2);
    if (!byChapter.has(ch)) byChapter.set(ch, []);
    byChapter.get(ch).push({
      hsCode: row.hs,
      nameVi: row.vn,
      unitVi: row.dvt || null,
      taxMFN: row.mfn ?? null,
      taxVAT: row.vat ?? null,
      hasPolicyWarning: Boolean(row.cs && String(row.cs).trim()),
    });
  }
  for (const [ch, items] of byChapter) {
    items.sort((a, b) => a.hsCode.localeCompare(b.hsCode));
    write(V(`chapter/${ch}.json`), { found: true, chapter: ch, total: items.length, items });
    write(V(`chapter/${ch}-tree.json`), { found: true, ...buildChapterTree(ch) });
  }
  emit({
    source: 'endpoint:kg_chapter',
    path: V('chapter/{NN}.json'),
    describe: 'Toàn bộ mã trong một chương. Tương đương GET /api/kg_chapter?chapter=',
    count: byChapter.size,
  });
  emit({
    source: 'endpoint:kg_chapter',
    path: V('chapter/{NN}-tree.json'),
    describe: 'Cây phân cấp của chương (nhóm → phân nhóm → mã). Tương đương ?tree=1',
    count: byChapter.size,
  });
}

// --- 3. Chú giải chương --------------------------------------------------------
{
  const chapters = Object.keys(notesData).filter((c) => !SAMPLE || String(c).padStart(2, '0') === SAMPLE);
  for (const ch of chapters) {
    write(V(`notes/chapter/${ch}.json`), {
      found: true,
      chapter: parseInt(ch, 10),
      content: notesData[ch],
      source: 'Danh mục HHDM XNK Việt Nam - TT31/2022/TT-BTC',
    });
  }
  emit({
    source: 'endpoint:notes',
    path: V('notes/chapter/{N}.json'),
    describe: 'Chú giải chương. Tương đương GET /api/notes?chapter=',
    count: chapters.length,
  });

  // Chuỗi chú giải 5 cấp theo GIR.
  //
  // GOM THEO NHÓM 4 SỐ, không tách từng mã. Một file mỗi mã là 11.871 file —
  // vượt trần 20.000 file/lần deploy của Cloudflare Pages bản free khi cộng với
  // 11.871 file tra thuế. Gom lại còn ~1.270 file, mỗi file ~24 KB (lớn nhất
  // ~1,1 MB, còn xa trần 25 MiB/file). Mã trong cùng nhóm 4 số dùng chung phần
  // lớn chuỗi nên gom lại còn nhẹ hơn tách rời.
  const chainsByHeading = new Map();
  let chainCount = 0;
  for (const hs of Object.keys(taxData)) {
    if (!inSample(hs)) continue;
    const chain = buildNoteChain(hs, { levelFilter: 'all' });
    if (!chain.length) continue;
    const heading = hs.slice(0, 4);
    if (!chainsByHeading.has(heading)) chainsByHeading.set(heading, {});
    chainsByHeading.get(heading)[hs] = chain;
    chainCount += 1;
  }
  for (const [heading, byCode] of chainsByHeading) {
    write(V(`notes/chain/${heading}.json`), {
      found: true,
      heading,
      level: 'all',
      total: Object.keys(byCode).length,
      byCode,
      source: 'GIR 5-level chain (section → chapter → heading → subheading → national)',
    });
  }
  emit({
    source: 'endpoint:notes',
    path: V('notes/chain/{nhóm4số}.json'),
    describe:
      'Chuỗi chú giải 5 cấp theo GIR, gom theo nhóm 4 số — lấy chuỗi của một mã ' +
      'tại byCode[hsCode]. Tương đương GET /api/notes?hs=&level=all',
    count: chainsByHeading.size,
    covers: chainCount,
  });
}

// --- 4. Tìm kiếm: chỉ mục để client tự tra --------------------------------------
{
  const indexPath = join(root, 'data', 'search.json');
  const rows = JSON.parse(readFileSync(indexPath, 'utf8'));
  emit({
    source: 'endpoint:search',
    path: V('search-index.json'),
    describe:
      'Chỉ mục tìm kiếm (mã, tên tiếng Việt, cờ cảnh báo chính sách). Tải một lần ' +
      'rồi tra tại chỗ — bản tĩnh không chạy được truy vấn phía máy chủ.',
    payload: { total: rows.length, generatedFrom: 'data/search.json', rows },
  });
}

// --- 5. Mã loại hình XNK -------------------------------------------------------
{
  const types = listTypes();
  emit({
    source: 'endpoint:customs-types',
    path: V('customs-types.json'),
    describe: 'Toàn bộ mã loại hình XNK (QĐ 1357/QĐ-TCHQ)',
    payload: { total: types.length, items: types },
  });
  for (const row of types) write(V(`customs-type/${row.code}.json`), { found: true, ...row });
  emit({
    source: 'endpoint:customs-types',
    path: V('customs-type/{CODE}.json'),
    describe: 'Chi tiết một mã loại hình',
    count: types.length,
  });
}

// --- 6. Bộ ngành quản lý chuyên ngành ------------------------------------------
{
  const items = listMinistries();
  emit({
    source: 'dataset:ministries',
    path: V('ministries.json'),
    describe: 'Bộ ngành quản lý chuyên ngành',
    payload: { total: items.length, items },
  });
  const chapters = [...new Set(Object.keys(taxData).map((hs) => hs.slice(0, 2)))].sort();
  let n = 0;
  for (const ch of chapters) {
    const byCh = getMinistriesByChapter(ch);
    if (!byCh.length) continue;
    write(V(`ministries/chapter/${ch}.json`), { chapter: ch, total: byCh.length, items: byCh });
    n += 1;
  }
  emit({
    source: 'dataset:ministries',
    path: V('ministries/chapter/{NN}.json'),
    describe: 'Bộ ngành quản lý theo chương',
    count: n,
  });
}

// --- 7. Văn bản pháp luật ------------------------------------------------------
{
  const docs = listDocs({});
  emit({
    source: 'dataset:legal_docs',
    path: V('legal-docs.json'),
    describe: 'Thư viện văn bản pháp luật liên quan',
    payload: { total: docs.length, chapter: 'all', items: docs },
  });
  for (const d of docs) {
    const full = getDocByCode(d.code);
    if (full) write(V(`legal-doc/${encodeURIComponent(d.code)}.json`), { found: true, ...full });
  }
  emit({
    source: 'dataset:legal_doc',
    path: V('legal-doc/{CODE}.json'),
    describe: 'Chi tiết một văn bản',
    count: docs.length,
  });
}

// --- 8. Tiền lệ phân loại (TB-TCHQ) --------------------------------------------
{
  const codes = Object.keys(precedentsData).sort();
  for (const hs of codes) {
    write(V(`precedent/${hs}.json`), { found: true, hsCode: hs, precedents: precedentsData[hs] });
  }
  emit({
    source: 'dataset:precedents',
    path: V('precedent/{hsCode}.json'),
    describe: 'Tiền lệ phân loại theo mã. Tương đương GET /api/dataset?resource=precedents&hs=',
    count: codes.length,
  });
  emit({
    source: 'dataset:precedents',
    path: V('precedents-index.json'),
    describe: 'Danh sách mã có tiền lệ — dùng để biết nên tải file nào',
    payload: { total: codes.length, hsCodes: codes },
  });
}

// --- 9. Cụm mã dễ nhầm ---------------------------------------------------------
{
  const codes = Object.keys(conflictsData).sort();
  for (const hs of codes) write(V(`conflict/${hs}.json`), { found: true, hsCode: hs, ...conflictsData[hs] });
  emit({
    source: 'dataset:conflicts',
    path: V('conflict/{hsCode}.json'),
    describe: 'Cảnh báo mã dễ nhầm. Tương đương GET /api/dataset?resource=conflicts&hs=',
    count: codes.length,
  });
  emit({
    source: 'dataset:conflicts',
    path: V('conflicts-index.json'),
    describe: 'Danh sách mã có cảnh báo dễ nhầm',
    payload: { total: codes.length, hsCodes: codes },
  });
}

// --- 10. Phân loại vật liệu ----------------------------------------------------
{
  const families = listTaxonomySummary();
  emit({
    source: 'dataset:materials',
    path: V('materials.json'),
    describe: 'Phân loại vật liệu (polymer, gỗ, sợi, hoá chất, kim loại)',
    payload: { families, totalEntries: families.reduce((n, f) => n + f.count, 0) },
  });
}

// --- 11. Thủ tục kiểm tra chuyên ngành -----------------------------------------
{
  const items = listProcedures();
  emit({
    source: 'dataset:policy_procedures',
    path: V('policy-procedures.json'),
    describe: 'Thủ tục kiểm tra chuyên ngành',
    payload: { total: items.length, items },
  });
}

// --- 12. Minh bạch: độ chính xác + chất lượng dữ liệu --------------------------
// Công bố cả điểm yếu. AI ngoài phải biết dữ liệu này đúng tới đâu mới dùng đúng cách.
{
  emit({
    source: 'dataset:accuracy',
    path: V('accuracy.json'),
    describe: 'Benchmark độ chính xác — công bố nguyên trạng, không tô hồng',
    payload: getAccuracyStats(),
  });

  const qPath = join(root, 'data', 'data-quality-report.json');
  if (existsSync(qPath)) {
    emit({
      source: 'dataset:data_quality',
      path: V('data-quality.json'),
      describe: 'Báo cáo chất lượng dữ liệu — nêu rõ chỗ còn thiếu',
      payload: JSON.parse(readFileSync(qPath, 'utf8')),
    });
  }

  emit({
    source: 'dataset:kg_stats',
    path: V('kg-stats.json'),
    describe: 'Thống kê tổng quan kho tri thức',
    payload: kgStatsPayload(),
  });
}

// --- 13. Điểm vào cho AI: llms.txt, openapi.json, AGENTS.md --------------------
for (const [src, dest] of [
  ['public/llms.txt', 'llms.txt'],
  ['public/openapi.json', 'openapi.json'],
  ['public/community-data.json', 'community-data.json'],
  ['public/robots.txt', 'robots.txt'],
  ['public/sitemap.xml', 'sitemap.xml'],
  ['AGENTS.md', 'AGENTS.md'],
  ['LICENSE-DATA', 'LICENSE-DATA'],
  ['NOTICE.md', 'NOTICE.md'],
]) {
  const from = join(root, src);
  if (!existsSync(from)) continue;
  const to = join(OUT, dest);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  fileCount += 1;
}

// --- 14. Manifest — thứ AI đọc đầu tiên ----------------------------------------
const limitErrors = checkLimits({
  fileCount: fileCount + 1,
  largestFileBytes: largestFile.bytes,
  largestFilePath: largestFile.path,
});
if (limitErrors.length && !SAMPLE) throw new Error(limitErrors.join('\n'));

const manifest = {
  name: 'hs-code-api — bộ dữ liệu tĩnh',
  schemaVersion: SCHEMA_VERSION,
  generatedAt: new Date().toISOString(),
  generatedBy: 'scripts/build-static.mjs',
  ...(SAMPLE ? { sampleChapterOnly: SAMPLE } : {}),
  licenseData: 'CC BY-SA 4.0 — xem LICENSE-DATA',
  readFirst: ['AGENTS.md', 'llms.txt', `${SCHEMA_VERSION}/kg-stats.json`],
  disclaimer:
    'Dữ liệu tham khảo, KHÔNG thay thế quyết định của cơ quan Hải quan. Biểu thuế ' +
    'và chính sách mặt hàng thay đổi liên tục — kiểm generatedAt trước khi dùng. ' +
    'Mã HS do máy gợi ý phải có người có nghiệp vụ xác nhận trước khi khai.',
  liveApi: {
    note:
      'Bộ tĩnh chỉ có phần ĐỌC. Các endpoint sinh nội dung bằng LLM ' +
      '(suggest, describe, classify, match) cần token và không nằm ở đây.',
  },
  totals: { files: fileCount + 1, bytes: byteCount },
  omitted: OMITTED,
  entries: manifestEntries,
};
write('index.json', manifest);

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`Đã ghi ${OUT}`);
console.log(`  ${manifest.totals.files} file · ${(byteCount / 1048576).toFixed(1)} MB · ${secs}s`);
console.log(`  ${manifestEntries.length} nhóm tài nguyên, tất cả đã đối chiếu allowlist`);
console.log(
  `  trần Cloudflare Pages free: ${manifest.totals.files}/${MAX_FILES} file · ` +
  `file lớn nhất ${(largestFile.bytes / 1048576).toFixed(1)}/25 MB (${largestFile.path})`,
);
for (const k of Object.keys(OMITTED)) {
  console.log(`  BỎ QUA "${k}" — lý do ghi ở index.json mục "omitted"`);
}
