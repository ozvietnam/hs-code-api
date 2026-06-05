#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(rootDir, 'package.json'));
const {
  checkTrademarkRisk,
  searchWatchlist,
  findMarks,
  normalizeMark,
  isChinaOrigin,
  scoreCnExport,
  hsChaptersForNice,
  watchlistStats,
} = require('./lib/trademark-watch');

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

// normalize
check('normalizeMark bỏ dấu + ký tự đặc biệt', normalizeMark('V-Power®') === 'v power');

// nice -> hs
check('hsChaptersForNice(9) gồm 85', hsChaptersForNice([9]).includes('85'));

// findMarks: token 1 từ
check('findMarks tìm VPOWER trong câu', findMarks('lô hàng nhớt VPOWER 5L').some((m) => m.key === 'VPOWER'));
// không match substring nhiễu (vpowerful không phải vpower token)
check('findMarks không match substring nhiễu', !findMarks('superpowerful battery').some((m) => m.key === 'VPOWER'));

// checkTrademarkRisk: brand khớp
const r1 = checkTrademarkRisk({ brand: 'VPOWER', hsCode: '27101990' });
check('VPOWER matched', r1.matched === true);
check('VPOWER có riskLevel', !!r1.riskLevel);
check('VPOWER classMatch true ở chương 27 (nhóm Nice 4)', r1.matches[0].classMatch === true);
check('VPOWER có legalBasis', Array.isArray(r1.legalBasis) && r1.legalBasis.length > 0);
check('VPOWER có disclaimer', typeof r1.disclaimer === 'string');
check('VPOWER có recommendations', r1.matches[0].recommendations.length > 0);

// cross-check: HS chương lệch nhóm đăng ký -> classMatch false + hạ bậc
const r2 = checkTrademarkRisk({ brand: 'VPOWER', hsCode: '61091000' }); // quần áo, chương 61
check('VPOWER chương 61 classMatch=false', r2.matches[0].classMatch === false);

// không khớp -> matched false
const r3 = checkTrademarkRisk({ brand: 'ThươngHiệuKhôngTồnTại123', hsCode: '85171300' });
check('nhãn lạ -> matched false', r3.matched === false);

// search watchlist
const s = searchWatchlist('honda');
check('searchWatchlist honda có kết quả', s.length > 0 && s[0].mark === 'Honda');

// --- Trục XUẤT KHẨU Trung Quốc (GACC) ---
check('isChinaOrigin nhận "China"', isChinaOrigin('China') === true);
check('isChinaOrigin nhận "Trung Quốc"', isChinaOrigin('Trung Quốc') === true);
check('isChinaOrigin nhận "CN"', isChinaOrigin('CN') === true);
check('isChinaOrigin nhận "中国"', isChinaOrigin('中国') === true);
check('isChinaOrigin từ chối "Vietnam"', isChinaOrigin('Vietnam') === false);

// scoreCnExport: chỉ áp dụng khi origin TQ
check('scoreCnExport null khi origin không phải TQ', scoreCnExport({ cn: { gaccRecorded: true, verified: true } }, 'Japan') === null);
check('scoreCnExport CRITICAL khi GACC recorded + verified + origin TQ',
  scoreCnExport({ cn: { gaccRecorded: true, verified: true } }, 'CN').level === 'CRITICAL');
check('scoreCnExport HIGH khi GACC recorded chưa verified',
  scoreCnExport({ cn: { gaccRecorded: true, verified: false } }, 'CN').level === 'HIGH');
check('scoreCnExport WATCH khi nhãn TQ chưa rõ GACC',
  scoreCnExport({ cn: {} }, 'China').level === 'WATCH');

// checkTrademarkRisk với origin TQ (seed VPOWER chưa GACC -> WATCH + fromChina)
const cn1 = checkTrademarkRisk({ brand: 'VPOWER', hsCode: '27101990', origin: 'China' });
check('origin TQ -> fromChina true', cn1.fromChina === true);
check('origin TQ -> match có cnExportRisk', cn1.matches[0].cnExportRisk !== null && cn1.matches[0].cnExportRisk !== undefined);
check('origin TQ -> legalBasis gồm điều khoản TQ', cn1.legalBasis.some((s) => /GACC|Trung Quốc/.test(s)));
check('origin TQ -> recommendations nhắc cửa khẩu xuất', cn1.matches[0].recommendations.some((r) => /XUẤT|xuất/.test(r)));

// origin không phải TQ -> không có cnExportRisk
const cn2 = checkTrademarkRisk({ brand: 'VPOWER', hsCode: '27101990', origin: 'Germany' });
check('origin Đức -> fromChina false', cn2.fromChina === false);
check('origin Đức -> cnExportRisk null', cn2.matches[0].cnExportRisk === null);

// vnImportRisk luôn tách riêng
check('match có vnImportRisk', !!cn1.matches[0].vnImportRisk && typeof cn1.matches[0].vnImportRisk.level === 'string');

// stats
const st = watchlistStats();
check('watchlistStats total > 0', st.total > 0);
check('watchlistStats có bySource.seed', st.bySource.seed > 0);
check('watchlistStats có gaccRecorded field', typeof st.gaccRecorded === 'number');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
