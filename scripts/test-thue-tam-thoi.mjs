#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Thuế NK ưu đãi tạm thời (xăng dầu 2026) — lib/thue-tam-thoi.js + tax-mapper.
 * Thời gian tiêm qua `now`, không phụ thuộc hôm nay; không ghi gì vào data/.
 */
import fs from 'fs';
import zlib from 'zlib';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { mfnTemporaryOf, ngayVN, allValidUntil, loadData } = require('../lib/thue-tam-thoi');

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };
// 12:00 giờ VN = 05:00Z
const at = (d) => new Date(`${d}T05:00:00Z`);

const XANG = '27101224'; // NĐ 72 phụ lục
const NQ25 = '27101920'; // NQ 25 Điều 2 — chỉ từ 01/5/2026

// 1) Danh sách dòng NĐ 72 = đúng các dòng biểu thuế Tổng cục ghi "NĐ72" ở cột MFN.
const nhom = loadData().nhom.xangDau2026;
const bieu = zlib.gunzipSync(fs.readFileSync('data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz')).toString('utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
const tuBieu = bieu.filter((r) => /NĐ72/.test(String(r.thue?.mfn || ''))).map((r) => r.maChuan || r.ma).sort();
const trongTep = [...nhom.dongHang.ND72_PHU_LUC.ma].sort();
check('dòng NĐ 72 khớp biểu thuế Tổng cục (15 dòng)', tuBieu.length === 15 && JSON.stringify(tuBieu) === JSON.stringify(trongTep), { tuBieu, trongTep });

// 2) Trong khoảng → 0% + căn cứ đúng khoảng.
const r1 = mfnTemporaryOf(XANG, { baseRate: '10', now: at('2026-03-09') })?.mfnTemporary;
check('09/3/2026 (ngày ký NĐ 72) → 0%, khoảng ND72', r1?.rate === '0' && r1.periodId === 'ND72' && r1.legalBasis.includes('72/2026/NĐ-CP') && r1.baseRate === '10', r1);
check('chuỗi khoảng liền nhau → validUntil 31/12/2026', r1?.validUntil === '2026-12-31' && r1.to === '2026-04-30', r1);
const r2 = mfnTemporaryOf(XANG, { baseRate: '10', now: at('2026-11-11') })?.mfnTemporary;
check('11/11/2026 → 0% theo NQ 43/2026', r2?.rate === '0' && r2.periodId === 'NQ43' && r2.legalBasis.includes('43/2026/NQ-CP') && r2.verified === true && r2.xacMinh === 'NGUON_GOC', r2);
check('noteVi nêu mức nền + căn cứ', /mức nền 10%/.test(r2?.noteVi || '') && /43\/2026\/NQ-CP/.test(r2?.noteVi || ''), r2?.noteVi);
const r3 = mfnTemporaryOf(XANG, { now: at('2026-12-31') })?.mfnTemporary;
check('31/12/2026 (ngày cuối) vẫn 0%', r3?.rate === '0' && r3.daysLeft === 0, r3);

// 3) Trước / sau → không có mức tạm thời.
const b = mfnTemporaryOf(XANG, { now: at('2026-03-08') });
check('08/3/2026 → không mfnTemporary, CHUA_HIEU_LUC', !b.mfnTemporary && b.mfnTemporaryNote?.status === 'CHUA_HIEU_LUC' && b.mfnTemporaryNote.rate === null, b);
const a = mfnTemporaryOf(XANG, { now: at('2027-01-01') });
check('01/01/2027 → không mfnTemporary, HET_HAN', !a.mfnTemporary && a.mfnTemporaryNote?.status === 'HET_HAN' && /hết hạn/.test(a.mfnTemporaryNote.noteVi), a);
// Ranh giới ngày theo giờ VN: 31/12/2026 23:30 giờ VN = 16:30Z vẫn trong hạn; 01/01/2027 00:30 VN = 31/12 17:30Z đã hết.
check('ngày tính theo giờ VN', ngayVN(new Date('2026-12-31T17:30:00Z')) === '2027-01-01'
  && !mfnTemporaryOf(XANG, { now: new Date('2026-12-31T17:30:00Z') }).mfnTemporary
  && mfnTemporaryOf(XANG, { now: new Date('2026-12-31T16:30:00Z') }).mfnTemporary?.rate === '0');

// 4) NQ 25 Điều 2: chưa áp trong khoảng NĐ 72 → khoảng trống đúng nghĩa với dòng này.
const n0 = mfnTemporaryOf(NQ25, { baseRate: '5', now: at('2026-04-15') });
check('27101920 ngày 15/4/2026 → chưa hiệu lực (NQ 25 Điều 2 chỉ từ 01/5)', !n0.mfnTemporary && n0.mfnTemporaryNote?.status === 'CHUA_HIEU_LUC', n0);
const n1 = mfnTemporaryOf(NQ25, { baseRate: '5', now: at('2026-08-01') })?.mfnTemporary;
check('27101920 ngày 01/8/2026 → 0% theo NQ 25 Điều 2 + NQ 34', n1?.rate === '0' && n1.periodId === 'NQ34' && n1.legalBasis.includes('25/2026/NQ-CP') && n1.legalBasis.includes('34/2026/NQ-CP'), n1);

// 5) Khoảng trống: tiêm dữ liệu giả có lỗ hổng → không báo mức tạm thời.
const goc = JSON.parse(JSON.stringify(nhom));
nhom.khoang = nhom.khoang.filter((k) => k.id !== 'NQ34');
const g = mfnTemporaryOf(XANG, { now: at('2026-08-01') });
check('khoảng trống (bỏ NQ 34 giả lập) → KHOANG_TRONG, không mức tạm thời', !g.mfnTemporary && g.mfnTemporaryNote?.status === 'KHOANG_TRONG', g);
const g2 = mfnTemporaryOf(XANG, { now: at('2026-05-10') })?.mfnTemporary;
check('khoảng trống phía sau → validUntil dừng ở 30/6, không nối qua lỗ', g2?.validUntil === '2026-06-30', g2);
// Khoảng thứ cấp → verified=false + noteVi nói rõ.
nhom.khoang = goc.khoang.map((k) => (k.id === 'NQ43' ? { ...k, xacMinh: 'THU_CAP' } : k));
const t = mfnTemporaryOf(XANG, { now: at('2026-11-11') })?.mfnTemporary;
check('khoảng THU_CAP → verified=false + ghi chú nguồn thứ cấp', t?.verified === false && /thứ cấp/.test(t.noteVi), t);
nhom.khoang = goc.khoang;

// 6) Dòng không thuộc diện → null; tax-mapper không gắn trường nào.
check('dòng không thuộc diện (27101211) → null', mfnTemporaryOf('27101211', { now: at('2026-11-11') }) === null);
const { mapTaxRecord, mapSearchResult } = require('../lib/tax-mapper');
const { taxData } = require('../lib/data');
const ngoai = mapTaxRecord(taxData['27101211']);
check('mapTaxRecord dòng ngoài diện: không mfnTemporary/Note, taxNkPreferential giữ nguyên', !('mfnTemporary' in ngoai) && !('mfnTemporaryNote' in ngoai) && ngoai.taxNkPreferential === taxData['27101211'].mfn);
const trong = mapTaxRecord(taxData[XANG]);
check('mapTaxRecord dòng xăng: taxNkPreferential vẫn là mức nền (không ghi đè)', trong.taxNkPreferential === taxData[XANG].mfn);
check('mapTaxRecord dòng xăng: có đúng một trong mfnTemporary / mfnTemporaryNote', ('mfnTemporary' in trong) !== ('mfnTemporaryNote' in trong), Object.keys(trong));
const s = mapSearchResult({ hs: XANG, vn: 'x' }, taxData[XANG]);
check('mapSearchResult cũng gắn trường tạm thời', ('mfnTemporary' in s) || ('mfnTemporaryNote' in s));

// 7) Hạn trong data-freshness.json khớp khoảng cuối.
const fresh = JSON.parse(fs.readFileSync('data/data-freshness.json', 'utf8')).sources.mfnTemporaryFuel;
check('data-freshness mfnTemporaryFuel.validUntil = khoảng cuối', fresh?.validUntil === allValidUntil().xangDau2026, { fresh: fresh?.validUntil, data: allValidUntil() });
// Mọi khoảng có căn cứ + xacMinh hợp lệ; khoảng không chồng nhau.
const ks = [...goc.khoang].sort((x, y) => x.from.localeCompare(y.from));
check('mọi khoảng có canCu + xacMinh hợp lệ', ks.every((k) => k.canCu?.length && ['NGUON_GOC', 'THU_CAP'].includes(k.xacMinh)));
check('các khoảng không chồng nhau', ks.every((k, i) => i === 0 || ks[i - 1].to < k.from));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
