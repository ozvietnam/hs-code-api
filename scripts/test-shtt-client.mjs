#!/usr/bin/env node
/**
 * Test tầng nối oz-shtt: lib/shtt-client.js + checkTrademarkRiskEnriched.
 * Không chạm mạng — tiêm fetchFn giả. Kiểm cả nhánh fallback (bỏ đèn, không hỏng tra HS).
 */
import './test-isolate-data.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));
const shtt = require('./lib/shtt-client');
const { checkTrademarkRiskEnriched, mapShttResult } = require('./lib/trademark-watch');

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

// Trả lời giả theo hợp đồng oz-shtt (packages/shared check.ts).
function mockRes(json, { ok = true } = {}) {
  return { ok, status: ok ? 200 : 500, async json() { return json; } };
}
function fetchReturning(json, opts) {
  let lastUrl = null;
  const fn = async (url) => {
    lastUrl = url;
    return mockRes(json, opts);
  };
  fn.lastUrl = () => lastUrl;
  return fn;
}

const YELLOW = {
  level: 'YELLOW',
  reasons: ['Có nhãn "ABB" còn hiệu lực, cùng nhóm hàng — cần xác minh quyền trước khi nhập.'],
  evidence: [{ kind: 'mark', jurisdiction: 'VN', appNo: '4-2019-00001', text: 'ABB', owner: 'ABB Ltd', classes: ['9'], status: 'REGISTERED', similarity: 0.95, source: 'WIPO' }],
  scope: { sources: ['wipo-vn'], niceClasses: [9], similarGroups: [], dataAsOf: {}, coverage: { vnCrawled: 187000, vnExpected: 978070 } },
  suggestions: ['Kiểm tra uỷ quyền/hợp đồng phân phối từ chủ nhãn ABB.'],
  disclaimer: 'Kết quả tham khảo...',
};
const GREEN = { level: 'GREEN', reasons: ['Không thấy nhãn đáng ngờ trong nhóm hàng liên quan.'], evidence: [], scope: { sources: ['wipo-vn'], niceClasses: [27], similarGroups: [], dataAsOf: {}, coverage: { vnCrawled: 900000, vnExpected: 978070 } }, suggestions: [], disclaimer: 'x' };

// ── shtt-client thuần ──
check('normOrigin China → CN', shtt.normOrigin('China') === 'CN');
check('normOrigin "Trung Quốc" → CN', shtt.normOrigin('Trung Quốc') === 'CN');
check('normOrigin "Việt Nam" → VN', shtt.normOrigin('Việt Nam') === 'VN');
check('normOrigin "de" → DE', shtt.normOrigin('de') === 'DE');
check('normOrigin không rõ → null', shtt.normOrigin('Freedonia') === null);
check('hs8 lấy 8 số', shtt.hs8('8537.10.19') === '85371019');
check('hs8 chưa đủ 8 số → null', shtt.hs8('8537') === null);

// Chưa cấu hình URL → isEnabled false, checkRisk null.
delete process.env.OZ_SHTT_URL;
check('isEnabled false khi chưa cấu hình', shtt.isEnabled() === false);
check('checkRisk null khi chưa cấu hình', (await shtt.checkRisk({ brand: 'ABB', hsCode: '85371019' })) === null);

// Có cấu hình nhưng thiếu tên nhãn / mã HS → không gọi (null), KHÔNG ném.
process.env.OZ_SHTT_URL = 'http://oz-shtt.test:3010';
check('isEnabled true khi có URL', shtt.isEnabled() === true);
check('checkRisk null khi thiếu brand', (await shtt.checkRisk({ hsCode: '85371019' }, { fetchFn: fetchReturning(YELLOW) })) === null);
check('checkRisk null khi hs chưa đủ 8 số', (await shtt.checkRisk({ brand: 'ABB', hsCode: '8537' }, { fetchFn: fetchReturning(YELLOW) })) === null);

// Gọi thành công — URL đúng + parse đúng.
const fYellow = fetchReturning(YELLOW);
const got = await shtt.checkRisk({ brand: 'ABB', hsCode: '85371019', origin: 'China' }, { fetchFn: fYellow });
check('checkRisk trả CheckResult', got && got.level === 'YELLOW');
check('URL có hs=85371019', fYellow.lastUrl().includes('hs=85371019'));
check('URL có brand=ABB', /brand=ABB/.test(fYellow.lastUrl()));
check('URL có origin=CN (đã chuẩn hoá)', /origin=CN/.test(fYellow.lastUrl()));
check('URL có depth', /depth=(free|full)/.test(fYellow.lastUrl()));

// HTTP lỗi → null. Level lạ → null. fetch ném → null.
check('checkRisk null khi HTTP 500', (await shtt.checkRisk({ brand: 'ABB', hsCode: '85371019' }, { fetchFn: fetchReturning(YELLOW, { ok: false }) })) === null);
check('checkRisk null khi level lạ', (await shtt.checkRisk({ brand: 'ABB', hsCode: '85371019' }, { fetchFn: fetchReturning({ level: 'PURPLE' }) })) === null);
check('checkRisk null khi fetch ném', (await shtt.checkRisk({ brand: 'ABB', hsCode: '85371019' }, { fetchFn: async () => { throw new Error('ECONNREFUSED'); } })) === null);

// ── mapShttResult ──
const mY = mapShttResult(YELLOW, { origin: 'China' });
check('map YELLOW → matched true', mY.matched === true);
check('map YELLOW → riskLevel MEDIUM', mY.riskLevel === 'MEDIUM');
check('map giữ level thô YELLOW', mY.level === 'YELLOW');
check('map source oz-shtt', mY.source === 'oz-shtt');
check('map summary có emoji vàng', mY.summary.includes('🟡'));
check('map matches[0].recommendations = suggestions', mY.matches[0].recommendations[0].includes('uỷ quyền'));
check('map coverageNote có % phủ', /%/.test(mY.coverageNote || ''));
check('map fromChina true khi origin TQ', mY.fromChina === true);
const mG = mapShttResult(GREEN, { origin: 'CN' });
check('map GREEN → matched false', mG.matched === false && mG.riskLevel === 'NONE');

// ── checkTrademarkRiskEnriched ──
// 1) oz-shtt tắt → trả nguyên watchlist nội bộ (VPOWER có trong seed → matched true).
delete process.env.OZ_SHTT_URL;
const offHit = await checkTrademarkRiskEnriched({ brand: 'VPOWER', hsCode: '27101990' });
check('enriched(off): dùng watchlist, VPOWER matched', offHit.matched === true);
const offClean = await checkTrademarkRiskEnriched({ brand: 'ThươngHiệuKhôngCó999', hsCode: '85171300' });
check('enriched(off): nhãn lạ → matched false', offClean.matched === false);

// 2) oz-shtt bật + YELLOW → kết quả oz-shtt dẫn.
process.env.OZ_SHTT_URL = 'http://oz-shtt.test:3010';
const onY = await checkTrademarkRiskEnriched({ brand: 'ABB', hsCode: '85371019', origin: 'China' }, { fetchFn: fetchReturning(YELLOW) });
check('enriched(on,YELLOW): source oz-shtt', onY.source === 'oz-shtt' && onY.level === 'YELLOW');
check('enriched(on,YELLOW): matched true', onY.matched === true);

// 3) oz-shtt GREEN NHƯNG watchlist nội bộ đánh mạnh (VPOWER customs/seed) → giữ cảnh báo nội bộ (max-risk).
const onGreenButLocal = await checkTrademarkRiskEnriched({ brand: 'VPOWER', hsCode: '27101990', origin: 'China' }, { fetchFn: fetchReturning(GREEN) });
check('enriched(on,GREEN+local hit): giữ cảnh báo nội bộ', onGreenButLocal.matched === true);
check('enriched(on,GREEN+local hit): có đính kèm .shtt', !!onGreenButLocal.shtt && onGreenButLocal.shtt.level === 'GREEN');

// 4) oz-shtt lỗi (fetch ném) → fallback watchlist, KHÔNG hỏng.
const onErr = await checkTrademarkRiskEnriched({ brand: 'VPOWER', hsCode: '27101990' }, { fetchFn: async () => { throw new Error('timeout'); } });
check('enriched(on,lỗi mạng): fallback watchlist matched', onErr.matched === true && onErr.source !== 'oz-shtt');

delete process.env.OZ_SHTT_URL;

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
