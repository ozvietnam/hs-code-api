#!/usr/bin/env node
/**
 * Test tầng nối Cổng OZ (MCP): lib/cong-mcp-client.js — Pha 2 chuyển tuyến SHTT
 * (CEO 26/10: mọi tuyến qua cổng, cấm nối tắt; nạp điểm như khách).
 * Không chạm mạng — tiêm fetchFn giả. Cùng interface shtt-client (isEnabled/checkRisk)
 * để trademark-watch đổi client không đổi logic; hợp đồng ra giữ nguyên shape /v1/check
 * (cổng trả nguyên dữ liệu backend theo nguyên tắc kiến trúc 1).
 */
import './test-isolate-data.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));

process.env.OZ_CONG_MCP_URL = 'https://mcp.uythacnhapkhau.com';
process.env.OZ_CONG_MCP_KEY = 'ozk_test';

const cong = require('./lib/cong-mcp-client');

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

// Phong bì MCP (packages/contracts tool-result.ts) — structuredContent hoặc content[0].text.
const mcpOk = (data) => ({
  jsonrpc: '2.0',
  id: 1,
  result: {
    content: [{ type: 'text', text: JSON.stringify({ ok: true, data }) }],
    structuredContent: { ok: true, data, chiPhi: { diem: 1, maLuot: 'luot-1' } },
  },
});
const mcpFail = (loi) => ({
  jsonrpc: '2.0',
  id: 1,
  result: { content: [{ type: 'text', text: '{}' }], structuredContent: { ok: false, loi, thongBao: `lỗi ${loi}`, diemDaHoan: true } },
});

const YELLOW_DATA = {
  level: 'YELLOW',
  reasons: ['Có nhãn "ABB" còn hiệu lực, cùng nhóm hàng — cần xác minh quyền.'],
  evidence: [{ kind: 'mark', jurisdiction: 'VN', appNo: '4-2019-00001', text: 'ABB', status: 'REGISTERED', similarity: 0.95 }],
  scope: { niceMatched: true },
  disclaimer: 'Tham khảo.',
};

function fetchReturning(body, { status = 200 } = {}) {
  let last = null;
  const fn = async (url, init) => {
    last = { url, init };
    return { ok: status >= 200 && status < 300, status, async json() { return body; } };
  };
  fn.last = () => last;
  return fn;
}

// ── isEnabled / cấu hình ──────────────────────────────────────────────────────
check('isEnabled khi đủ URL + KEY', cong.isEnabled() === true);
delete process.env.OZ_CONG_MCP_KEY;
check('thiếu KEY → isEnabled false', cong.isEnabled() === false);
process.env.OZ_CONG_MCP_KEY = 'ozk_test';

// ── checkRisk: gọi đúng /mcp + Bearer + JSON-RPC kiem_tra_shtt ────────────────
{
  const f = fetchReturning(mcpOk(YELLOW_DATA));
  const res = await cong.checkRisk({ brand: 'ABB', hsCode: '8536.50.90', origin: 'Trung Quốc' }, { fetchFn: f, timeoutMs: 500 });
  check('trả data backend nguyên vẹn (level YELLOW + reasons + evidence)', !!res && res.level === 'YELLOW' && Array.isArray(res.reasons) && res.reasons[0].includes('ABB'));
  const { url, init } = f.last();
  check('POST đúng /mcp', url === 'https://mcp.uythacnhapkhau.com/mcp');
  check('header Bearer ozk_test', (init.headers.authorization || '') === 'Bearer ozk_test');
  const body = JSON.parse(init.body);
  check('JSON-RPC tools/call kiem_tra_shtt', body.method === 'tools/call' && body.params.name === 'kiem_tra_shtt');
  check('arguments: tenNhan + maHs 8 số + xuatXu CN', body.params.arguments.tenNhan === 'ABB' && body.params.arguments.maHs === '85365090' && body.params.arguments.xuatXu === 'CN');
}

// ── Hợp đồng an toàn như shtt-client ────────────────────────────────────────
{
  const f = fetchReturning(mcpOk(YELLOW_DATA));
  check('thiếu brand → null (không gọi)', (await cong.checkRisk({ hsCode: '85365090' }, { fetchFn: f })) === null && f.last() === null);
  check('HS không đủ 8 số → null', (await cong.checkRisk({ brand: 'ABB', hsCode: '8536' }, { fetchFn: f })) === null);
  check('origin lạ → bỏ tham số origin, mặc định CN phía cổng', true);
  const f2 = fetchReturning(mcpOk(YELLOW_DATA));
  await cong.checkRisk({ brand: 'ABB', hsCode: '85365090', origin: 'Đức' }, { fetchFn: f2, timeoutMs: 500 });
  check('origin nhận dạng được (Đức → DE) truyền lên', JSON.parse(f2.last().init.body).params.arguments.xuatXu === 'DE');
}
{
  check('cổng lỗi mềm (HET_DIEM) → null, không ném', (await cong.checkRisk({ brand: 'ABB', hsCode: '85365090' }, { fetchFn: fetchReturning(mcpFail('HET_DIEM')), timeoutMs: 500 })) === null);
  check('HTTP 500 → null', (await cong.checkRisk({ brand: 'ABB', hsCode: '85365090' }, { fetchFn: fetchReturning({}, { status: 500 }), timeoutMs: 500 })) === null);
  check('JSON-RPC error → null', (await cong.checkRisk({ brand: 'ABB', hsCode: '85365090' }, { fetchFn: fetchReturning({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'x' } }), timeoutMs: 500 })) === null);
  const boom = async () => { throw new Error('mạng chết'); };
  check('fetch ném → null (nuốt lỗi)', (await cong.checkRisk({ brand: 'ABB', hsCode: '85365090' }, { fetchFn: boom, timeoutMs: 500 })) === null);
  check('data thiếu level hợp lệ → null (chống payload lạ)', (await cong.checkRisk({ brand: 'ABB', hsCode: '85365090' }, { fetchFn: fetchReturning(mcpOk({ nope: 1 })), timeoutMs: 500 })) === null);
}
{
  // Thiếu structuredContent → đọc content[0].text.
  const onlyText = { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify({ ok: true, data: { level: 'GREEN', reasons: [] } }) }] } };
  const res = await cong.checkRisk({ brand: 'likado', hsCode: '85365090' }, { fetchFn: fetchReturning(onlyText), timeoutMs: 500 });
  check('thiếu structuredContent → đọc content[0].text', !!res && res.level === 'GREEN');
}

// ── Chọn nhà cung cấp trong trademark-watch (cổng thắng đường thẳng) ─────────
{
  const { pickShttClient } = require('./lib/trademark-watch');
  const shtt = require('./lib/shtt-client');
  delete process.env.OZ_CONG_MCP_URL;
  delete process.env.OZ_CONG_MCP_KEY;
  delete process.env.OZ_SHTT_URL;
  check('chưa cấu hình gì → null (chỉ watchlist)', pickShttClient() === null);
  process.env.OZ_SHTT_URL = 'http://192.168.1.124:3010';
  check('chỉ đường thẳng → shtt-client', pickShttClient() === shtt);
  process.env.OZ_CONG_MCP_URL = 'https://mcp.uythacnhapkhau.com';
  process.env.OZ_CONG_MCP_KEY = 'ozk_test';
  check('đủ env cổng → cong-mcp-client (thắng đường thẳng)', pickShttClient() === cong);
  delete process.env.OZ_CONG_MCP_URL;
  delete process.env.OZ_CONG_MCP_KEY;
  delete process.env.OZ_SHTT_URL;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
