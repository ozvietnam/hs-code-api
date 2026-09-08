#!/usr/bin/env node
/**
 * Sinh public/openapi.json từ CHÍNH allowlist trong lib/public-access.js.
 *
 * Vì sao sinh tự động: tài liệu viết tay luôn trôi khỏi code. Dự án này vừa dính
 * đúng bệnh đó — docs/integration-guide.md mô tả girRulesApplied là mảng chuỗi
 * trong khi code trả mảng object suốt nhiều tháng. Sinh từ nguồn sự thật thì
 * không lệch được.
 */
import { createRequire } from 'module';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { PUBLIC_ENDPOINTS, PUBLIC_DATASET_RESOURCES } = require('../lib/public-access.js');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const BASE = 'https://hs-kb.uythacnhapkhau.com';

const bearer = [{ bearerAuth: [] }];
const pub = []; // mảng rỗng = không cần xác thực

function op({ id, summary, description, params = [], auth, tags }) {
  return {
    operationId: id,
    summary,
    description,
    tags,
    security: auth,
    parameters: params,
    responses: {
      200: { description: 'Thành công', content: { 'application/json': { schema: { type: 'object' } } } },
      ...(auth === pub ? {} : { 401: { description: 'Thiếu hoặc sai Bearer token' } }),
      500: { description: 'Lỗi máy chủ' },
    },
  };
}

const q = (name, description, required = false) => ({
  name, in: 'query', required, description, schema: { type: 'string' },
});

const paths = {
  '/api/health': {
    get: op({
      id: 'health', tags: ['Hệ thống'], auth: pub,
      summary: 'Kiểm tra dịch vụ + trạng thái LLM',
      description:
        'Trả 200 khi đủ cả 3 điều kiện: có dữ liệu biểu thuế, có token cấu hình, và còn ít nhất một nhà cung cấp LLM. ' +
        'Thiếu LLM thì trả 503 kèm `checks.llm.note` — /api/suggest và /api/describe sẽ lỗi.',
    }),
  },
  '/api/tax': {
    get: op({
      id: 'getTax', tags: ['Tra cứu'], auth: pub,
      summary: 'Tra thuế NK/ACFTA/VAT + cảnh báo chính sách theo mã HS',
      description:
        'Trả thuế suất, đơn vị tính và cảnh báo quản lý chuyên ngành kèm liên kết văn bản pháp luật. ' +
        '⚠️ Thuế suất và chính sách thay đổi theo thông tư — luôn đối chiếu văn bản gốc còn hiệu lực khi khai báo.',
      params: [q('hs', 'Mã HS 8 số, vd 84137090', true)],
    }),
  },
  '/api/search': {
    get: op({
      id: 'search', tags: ['Tra cứu'], auth: pub,
      summary: 'Tìm mã HS theo từ khoá hoặc mã một phần',
      params: [q('q', 'Từ khoá tiếng Việt hoặc mã HS một phần', true), q('limit', 'Số kết quả tối đa (mặc định 10)')],
    }),
  },
  '/api/notes': {
    get: op({
      id: 'getNotes', tags: ['Tra cứu'], auth: pub,
      summary: 'Chú giải chương — căn cứ áp dụng GIR 1',
      params: [q('chapter', 'Số chương, vd 39', true)],
    }),
  },
  '/api/kg_chapter': {
    get: op({
      id: 'listChapterCodes', tags: ['Tra cứu'], auth: pub,
      summary: 'Liệt kê mã HS trong một chương',
      params: [q('chapter', 'Số chương', true)],
    }),
  },
  '/api/customs-types': {
    get: op({
      id: 'customsTypes', tags: ['Tra cứu'], auth: pub,
      summary: 'Mã loại hình xuất nhập khẩu (QĐ 1357/QĐ-TCHQ)',
      params: [q('code', 'Mã loại hình, vd A11')],
    }),
  },
  '/api/suggest': {
    post: op({
      id: 'suggest', tags: ['AI'], auth: bearer,
      summary: 'Gợi ý mã HS bằng AI, kèm audit trail GIR có căn cứ',
      description:
        'Body: `{"description": "tên hàng"}`. Trả `suggestions[]`, `girRulesApplied[]` (mỗi mục có `basis`: ' +
        'RULE_TABLE/DETERMINISTIC là căn cứ chắc, HEURISTIC/LLM_ASSERTED phải kiểm chứng lại), ' +
        '`girDisclaimer`, `rankingSignals[]` (kỹ thuật, không có giá trị pháp lý) và `chapterGuidance[]`. ' +
        'Cần token vì mỗi lượt gọi tốn chi phí LLM.',
    }),
  },
  '/api/describe': {
    post: op({
      id: 'describe', tags: ['AI'], auth: bearer,
      summary: 'Sinh mô tả khai báo Hải quan chuẩn TT 39/2018 (tối đa 200 ký tự ECUS)',
      description:
        'Khi LLM lỗi, trả `degraded: true` + `llmError{code,message,retryable}` + cảnh báo ' +
        '`DESCRIPTION_DEGRADED` — mô tả khi đó là bản dự phòng thô, không được coi là đạt chuẩn.',
    }),
  },
  '/api/classify': {
    post: op({
      id: 'classify', tags: ['AI'], auth: bearer,
      summary: 'Phân loại có cây quyết định + bảng phân giải cụm mã dễ nhầm',
    }),
  },
};

// Các resource của /api/dataset — sinh path riêng cho từng cái, đúng theo allowlist.
const DATASET_META = {
  kg_stats: ['Thống kê kho dữ liệu', '/api/kg_stats'],
  chapters: ['Chỉ mục chương HS', '/api/chapters'],
  conflicts: ['Cảnh báo mã dễ nhầm', '/api/conflicts'],
  precedents: ['Tiền lệ phân loại TB-TCHQ', '/api/precedents'],
  materials: ['Phân loại vật liệu', '/api/materials'],
  ministries: ['14 bộ ngành quản lý chuyên ngành', '/api/ministries'],
  legal_docs: ['Thư viện văn bản pháp luật', '/api/legal-docs'],
  policy_procedures: ['Thủ tục kiểm tra chuyên ngành', '/api/policy-procedures'],
  products: ['Corpus sản phẩm cho mã "Loại khác"', '/api/products'],
  accuracy: ['Benchmark độ chính xác (công khai, không tô hồng)', '/api/accuracy'],
  data_quality: ['Báo cáo chất lượng dữ liệu — gồm cả điểm yếu', '/api/data-quality'],
};

for (const [resource, [summary, prettyPath]] of Object.entries(DATASET_META)) {
  if (!PUBLIC_DATASET_RESOURCES.has(resource)) continue; // bám sát allowlist
  paths[prettyPath] = {
    get: op({
      id: `dataset_${resource}`, tags: ['Tra cứu'], auth: pub, summary,
      description: `Rewrite tới /api/dataset?resource=${resource}`,
      params: [q('hs', 'Lọc theo mã HS (nếu resource hỗ trợ)')],
    }),
  };
}

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'HS Knowledge Base API',
    version: pkg.version || '2.0.0',
    summary: 'Kho tri thức mở về mã HS, thuế và pháp lý xuất nhập khẩu Việt Nam',
    description: [
      'API tra mã HS, thuế suất, chính sách mặt hàng và sinh mô tả khai báo Hải quan theo TT 39/2018.',
      '',
      '## Quyền truy cập',
      '',
      `**Không cần token** — nhóm tra cứu (${[...PUBLIC_ENDPOINTS].map((e) => `/api/${e}`).join(', ')} và các resource dữ liệu).`,
      'Đây là kho tri thức mở: bất kỳ AI hay người nào cũng gọi được ngay.',
      '',
      '**Cần Bearer token** — nhóm AI (`/api/suggest`, `/api/describe`, `/api/classify`, `/api/match`) vì mỗi lượt gọi tốn chi phí mô hình, và nhóm quản trị.',
      '',
      '## Đọc kết quả cho đúng',
      '',
      'Mọi trích dẫn quy tắc GIR đều kèm trường `basis`:',
      '',
      '| basis | Nghĩa | Dùng cho hồ sơ giải trình Hải quan? |',
      '|---|---|---|',
      '| `RULE_TABLE` | Bảng quyết định do người soạn, có dẫn văn bản gốc | Được |',
      '| `DETERMINISTIC` | Hệ thống suy ra từ tín hiệu chắc chắn | Được |',
      '| `HEURISTIC` | Dò từ khoá / điểm ước lượng | Cần người kiểm chứng |',
      '| `LLM_ASSERTED` | Mô hình tự khai, chưa kiểm chứng | Không |',
      '',
      '## Miễn trừ trách nhiệm',
      '',
      'Đây là **tài liệu tham khảo nghiệp vụ**, không phải phán quyết phân loại của cơ quan Hải quan và không phải tư vấn pháp lý.',
      'Pháp luật XNK thay đổi liên tục — luôn đối chiếu văn bản gốc còn hiệu lực tại thời điểm khai báo.',
    ].join('\n'),
    license: { name: 'MIT (code) / CC BY-SA 4.0 (dữ liệu)', url: 'https://github.com/ozvietnam/hs-code-api/blob/main/NOTICE.md' },
    contact: { name: 'HS Knowledge Base', url: 'https://github.com/ozvietnam/hs-code-api' },
  },
  servers: [{ url: BASE, description: 'Production' }],
  tags: [
    { name: 'Tra cứu', description: 'Đọc kho tri thức — không cần token' },
    { name: 'AI', description: 'Sinh nội dung bằng mô hình — cần token' },
    { name: 'Hệ thống', description: 'Giám sát' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'HS_API_TOKEN' },
    },
  },
  paths,
  'x-generated': {
    by: 'scripts/build-openapi.mjs',
    at: new Date().toISOString().slice(0, 10),
    note: 'Sinh tự động từ lib/public-access.js — đừng sửa tay, sửa nguồn rồi chạy npm run build.',
  },
};

const out = join(root, 'public', 'openapi.json');
writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
console.log('Đã ghi', out);
console.log(`  ${Object.keys(paths).length} path · công khai: ${PUBLIC_ENDPOINTS.size} endpoint + ${PUBLIC_DATASET_RESOURCES.size} resource`);
