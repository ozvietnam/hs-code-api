#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * QĐ 1309/QĐ-BCT bãi bỏ QĐ 2105/QĐ-BCT từ 16/06/2026 (kết quả rà soát cuối kỳ vụ ER01.AD13-AS01,
 * biện pháp CBPG+CTC đường mía Thái Lan tiếp tục đến 15/06/2031) — đối chiếu biểu thuế
 * OZV-504 luồng 3b. tax.json phải dẫn văn bản ĐANG SỐNG trong cột cs; legal-docs phải nói
 * đúng hiệu lực của cả hai số; phiên bản biểu thuế v3-2026-11-12-duong-1309 phải khớp tax.json.
 * Nguồn xác nhận: data/plhq-registry.json (bản chụp 2026-11-12, NGUON_A, đối chiếu hiệu lực true).
 */
import fs from 'fs';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { taxData } = require('../lib/data');
const { getDocByCode } = require('../lib/legal-docs');
const { buildTaxLookup } = require('../lib/tax-lookup');
const { classifyPolicy } = require('../lib/policy-levels');
const { trichSoHieu, lookup: lookupVanBan } = require('../lib/plhq-registry');
const { loadIndex } = require('../lib/tariff-versions');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

const MA_DUONG = ['17011300', '17011400', '17019100', '17019910', '17019990', '17029091'];

// 1. Cột cs dẫn QĐ 1309 (đang sống) — không mã nào còn dẫn QĐ 2105 (đã bãi bỏ)
for (const ma of MA_DUONG) {
  check(`${ma}: cs dẫn 1309/QĐ-BCT`, String(taxData[ma]?.cs || '').includes('(1309/QĐ-BCT)'), taxData[ma]?.cs);
}
const con2105 = Object.values(taxData).filter((r) => String(r.cs || '').includes('2105/QĐ-BCT'));
check('không mã nào còn dẫn 2105/QĐ-BCT', con2105.length === 0, con2105.map((r) => r.hs));

// 2. Sổ oz-wiki: 1309 đang sống, 2105 hết hiệu lực từ 16/06/2026 — căn cứ của việc đổi số
const d1309 = lookupVanBan('1309/QD-BCT');
const d2105 = lookupVanBan('2105/QD-BCT');
check('sổ: 1309/QĐ-BCT CON_HIEU_LUC + đã đối chiếu hiệu lực', d1309?.tinhTrang === 'CON_HIEU_LUC' && d1309?.hieuLucDaDoiChieu === true);
check('sổ: 2105/QĐ-BCT HET_HIEU_LUC từ 16/06/2026, bãi bỏ bởi 1309', d2105?.tinhTrang === 'HET_HIEU_LUC' && d2105?.hetHieuLucTu === '2026-06-16' && (d2105?.biBaiBoBoi || []).includes('1309/QĐ-BCT'));

// 3. legal-docs.json đồng bộ: 1309 có mặt (ACTIVE), 2105 chuyển REPLACED + replacedBy
const l1309 = getDocByCode('1309/QĐ-BCT');
check('legal-docs: có 1309/QĐ-BCT, ACTIVE, chương 17', l1309?.status === 'ACTIVE' && (l1309?.scopeHsChapters || []).includes('17'));
const l2105 = getDocByCode('2105/QĐ-BCT');
check('legal-docs: 2105/QĐ-BCT REPLACED → 1309/QĐ-BCT', l2105?.status === 'REPLACED' && l2105?.replacedBy === '1309/QĐ-BCT');

// 4. /api/tax (buildTaxLookup): chuỗi chính sách hiển thị cho người khai dẫn số MỚI; dòng CBPG vẫn NOTICE.
// (vanBanQuanLy chỉ bóc số dạng số/năm/loại — 1309/QĐ-BCT không có năm nên không vào được danh sách đó,
//  giữ nguyên hành vi cũ với 2105/QĐ-BCT-2025; căn cứ mới lộ ở policyByHs + policyLines.)
const lk = buildTaxLookup('17019910');
check('/api/tax: policyByHs dẫn 1309/QĐ-BCT, không còn 2105', String(lk.policyByHs || '').includes('(1309/QĐ-BCT)') && !String(lk.policyByHs || '').includes('2105/QĐ-BCT'), lk.policyByHs);
check('/api/tax: vanBanQuanLy không đổi (12/2018/TT-BTC, không rơi sót văn bản dạng số/năm)', (lk.vanBanQuanLy || []).includes('12/2018/TT-BTC'), lk.vanBanQuanLy);
const cp = classifyPolicy(taxData['17019910'].cs);
const lineCBPG = (cp.policyLines || []).find((l) => /chống bán phá giá/i.test(l.text));
check('policyLines: dòng CBPG vẫn NOTICE (TRADE_REMEDY_OR_QUOTA)', lineCBPG?.level === 'NOTICE' && lineCBPG?.rule === 'TRADE_REMEDY_OR_QUOTA', lineCBPG);

// 5. Phiên bản biểu thuế: v3-2026-11-12-duong-1309 là current, snapshot trùng byte tax.json
const idx = loadIndex();
const cur = idx.versions.find((v) => v.id === idx.current);
check('versions: current = v3-2026-11-12-duong-1309, 11.871 dòng', cur?.id === 'v3-2026-11-12-duong-1309' && cur?.rowCount === 11871, cur);
const duongV3 = idx.versions.find((v) => v.id === 'v3-2026-11-12-duong-1309');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if (duongV3 && fs.existsSync(`data/versions/${duongV3.file}`)) {
  check('snapshot v3 khớp checksum + trùng nội dung tax.json', duongV3.checksum === `sha256:${sha(`data/versions/${duongV3.file}`)}` && sha(`data/versions/${duongV3.file}`) === sha('data/tax.json'));
} else {
  check('snapshot v3 tồn tại trong data/versions/', false);
}

// 6. data-freshness: mục tariff hết DUE sau lần đối chiếu 12/11/2026
const fresh = JSON.parse(fs.readFileSync(new URL('../data/data-freshness.json', import.meta.url), 'utf8'));
check('data-freshness: tariff.lastCheckedAt = 2026-11-12 + có ghiChuSoat nêu QĐ 1309', fresh.sources.tariff?.lastCheckedAt === '2026-11-12' && /1309\/QĐ-BCT/.test(fresh.sources.tariff?.ghiChuSoat || ''));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
