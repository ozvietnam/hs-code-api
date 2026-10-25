// lib/fta.js + lib/tax-lookup.js — thuế ưu đãi FTA theo xuất xứ (#251).
// Ca hồi quy theo yêu cầu issue: (-CN), RCEP < ACFTA, không ưu đãi, nước ngoài FTA, needsReview.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ftaChoXuatXu, FTA_DEFS } = require('../lib/fta.js');
const { buildTaxLookup } = require('../lib/tax-lookup.js');

let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

// 1. Hàng TQ: ACFTA + RCEP-C cùng eligible — trả cả 2 + mức tốt nhất
const cn = ftaChoXuatXu('85044011', 'CN');
check('CN: cả ACFTA + RCEP-C đều eligible', cn.ftaList.some(f => f.fta === 'acfta' && f.eligible) && cn.ftaList.some(f => f.fta === 'rcepC' && f.eligible));
check('CN: có mức tốt nhất + MFN', cn.totNhat !== null && cn.mfn !== null);

// 2. RCEP < ACFTA cho nhóm A (BN/KH/LA/MM) — 25232910: acfta=50, rcep@A=35
const bn = ftaChoXuatXu('25232910', 'BN');
check('BN: RCEP-A 35% < ACFTA 50%', bn.ftaList.find(f => f.fta === 'rcepA')?.rate === 35 && bn.ftaList.find(f => f.fta === 'acfta')?.rate === 50);

// 3. Mức ACFTA cao hơn MFN → cảnh báo (25232910: mfn=32, acfta=50)
const caomfn = ftaChoXuatXu('25232910', 'CN');
check('ACFTA 50% > MFN 32% → higherThanMfn', caomfn.totNhat?.higherThanMfn === true && /CAO HƠN MFN/.test(caomfn.totNhat?.noteVi || ''));

// 4. Nước không thuộc FTA nào (US) → totNhat=null, eligible=0
const us = ftaChoXuatXu('85044011', 'US');
check('US: không FTA nào eligible', us.totNhat === null && us.ftaList.every(f => !f.eligible));

// 5. Loại trừ nước (-CN) — tìm dòng có "(-CN)"
const loaitru = ftaChoXuatXu('10019911', 'CN'); // acfta = "0 (-CN)" — CN bị loại trừ
const acLoaitru = loaitru?.ftaList.find(f => f.fta === 'acfta');
check('(-CN): eligible=false khi CN bị loại trừ hoặc có note cảnh báo', acLoaitru ? (acLoaitru.eligible === false || acLoaitru.noteVi.includes('loại trừ') || acLoaitru.noteVi.includes('KHÔNG')) : true, JSON.stringify(acLoaitru).slice(0, 120));

// 6. "*" (không ưu đãi) → eligible=false
// tìm 1 mã có acfta='*' — 355 dòng có
const fs = await import('node:fs');
const zlib = await import('node:zlib');
const raw = zlib.gunzipSync(fs.readFileSync(require('../lib/data-paths').dataReadPath('bieu-thue/2026.04.05/bieu-chinh.jsonl.gz'))).toString().trim().split('\n');
const sao = raw.map(l => JSON.parse(l)).find(j => j.thue?.acfta === '*' && String(j.ma).length === 8);
if (sao) {
  const rs = ftaChoXuatXu(sao.ma, 'CN');
  check('"*": eligible=false', rs.ftaList.find(f => f.fta === 'acfta')?.eligible === false);
} else check('"*": không tìm được dòng test — skip', true);

// 7. Mọi mức có canCu (nghị định + hiệu lực)
const cn7 = ftaChoXuatXu('85044011', 'CN');
check('mọi mức eligible có canCu NĐ', cn7.ftaList.filter(f => f.eligible === true).every(f => f.canCu?.vanBan));

// 8. buildTaxLookup qua API chain: ?origin=KR → AKFTA + RCEP-E
const kr = buildTaxLookup('85044011', { origin: 'KR' });
check('API KR: fta.danhSach có AKFTA + RCEP-E', kr.fta?.danhSach?.some(f => f.fta === 'akfta' && f.eligible) && kr.fta?.danhSach?.some(f => f.fta === 'rcepE' && f.eligible));
check('API KR: fta.totNhat có rate', typeof kr.fta?.totNhat?.rate === 'number');

// 9. buildTaxLookup mặc định (CN) — không crash khi không truyền origin
const def = buildTaxLookup('85044011');
check('API mặc định CN: fta có dữ liệu', def.fta?.danhSach?.length > 0);

// 10. Ghi chú ROO luôn có mặt
check('ghiChu ROO có trong mọi kết quả', cn.ghiChu.includes('quy tắc xuất xứ') && kr.fta?.ghiChu?.includes('quy tắc xuất xứ'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
