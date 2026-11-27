#!/usr/bin/env node
/**
 * OZV-2375 — «lưới leo dùng cho khu vui chơi»:
 * phân biệt 5608 (lưới hoàn thiện từ dây bện/thừng) ↔ 9506 (dụng cụ thể thao /
 * sân chơi) ↔ 9508 (trò chơi khu giải trí), và không tự chốt 95069920 chỉ vì chữ «lưới».
 *
 * Đo lõi tại chỗ (không LLM): quoteInSource · verifySoTay · cauPhanBietNhom · chotDong8.
 * ≥3 ca ngược: lưới đánh cá 5608 · lưới tennis/cầu lông 9506 · dây thừng bện 5607.
 */
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = require('../lib/so-tay.js');
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const { loadSoTay, chotDong8 } = require('../lib/so-tay-gates.js');
const { cauPhanBietNhom } = require('../lib/hoi-theo-so-tay.js');
const { expandSearchQuery } = require('../lib/search-query-expand.js');
const { searchCandidates } = require('../lib/search-utils.js');
const { lookupTradeTerms } = require('../lib/trade-synonyms.js');

const CA_KHACH = 'lưới leo dùng cho khu vui chơi';

function loadFile(h4) {
  return JSON.parse(readFileSync(join(ROOT, 'data', 'so-tay', `${h4}.json`), 'utf8'));
}

function topHs(q, n = 10) {
  const r = searchCandidates(q, { limit: n });
  const arr = r.candidates || r.results || r || [];
  const list = Array.isArray(arr) ? arr : arr.items || [];
  return list.map((x) => String(x.hs || x.hsCode || ''));
}

function trichDat(h4, item) {
  const src = S.sourcesFor(h4);
  const sq = Object.fromEntries(Object.entries(src).map(([k, v]) => [k, S.squash(v)]));
  assert.ok(item?.nguon && item?.trich, `thiếu nguon/trich: ${JSON.stringify(item)?.slice(0, 200)}`);
  assert.ok(sq[item.nguon], `nguon không có trong sourcesFor(${h4}): ${item.nguon}`);
  assert.ok(S.quoteInSource(item.trich, sq[item.nguon]), `trich không khớp nguồn ${item.nguon}: ${item.trich.slice(0, 120)}`);
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}

const bang = [];
function do4_6_8(nhan, q, kyVong) {
  const hints = expandSearchQuery(q).headingHints || [];
  const tops = topHs(q, 8);
  const top4 = (tops[0] || '').slice(0, 4);
  const pb = [
    ...cauPhanBietNhom('5608', ['5608', '9506', '9508'], q),
    ...cauPhanBietNhom('9506', ['5608', '9506', '9508'], q),
    ...cauPhanBietNhom('9508', ['5608', '9506', '9508'], q),
  ];
  const chot699 = chotDong8({ hs: '950699', productText: q });
  const chot691 = chotDong8({ hs: '95069100', productText: q });
  const row = {
    nhan,
    q,
    hintCo: kyVong.hints.some((h) => hints.includes(h)),
    top4,
    soCauPb: pb.length,
    chot699: chot699?.ketQua,
    chot699Hs: chot699?.hs || null,
    chot691: chot691?.ketQua,
    chot691Hs: chot691?.hs || null,
  };
  bang.push(row);
  return { hints, tops, pb, chot699, chot691, row };
}

// ─── 1. Căn cứ nguyên văn trong sổ tay ───
check('verifySoTay 5608/9506/9508 không loai', () => {
  for (const h of ['5608', '9506', '9508']) {
    const v = S.verifySoTay(loadFile(h), h);
    assert.equal(v.loai.length, 0, `${h} loai=${JSON.stringify(v.loai).slice(0, 400)}`);
  }
});

check('5608 có loaiTru lưới thể thao → 9506 (canCuLoaiTru) kèm trich nguyên văn', () => {
  const st = loadSoTay('5608');
  const lt = (st.loaiTru || []).find((x) => String(x.sangNhom || '') === '9506');
  assert.ok(lt, 'thiếu loaiTru 5608→9506');
  assert.ok(lt.canCuLoaiTru?.nguon && lt.canCuLoaiTru?.trich, 'thiếu canCuLoaiTru');
  trichDat('5608', lt);
  const src = S.sourcesFor('9506');
  assert.ok(S.quoteInSource(lt.canCuLoaiTru.trich, S.squash(src[lt.canCuLoaiTru.nguon])));
});

check('9506 có phanBiet lưới hàng rào/túi lưới → 5608 (chú giải (d), không dùng loaiTru «thường») + trich nguyên văn', () => {
  const st = loadSoTay('9506');
  const pb = (st.phanBiet || []).find((x) => String(x.neuCo || '') === '5608');
  assert.ok(pb, 'thiếu phanBiet 9506→5608');
  assert.match(String(pb.hoi || ''), /hàng rào|túi lưới|5608/i);
  trichDat('9506', pb);
});

check('9506 có phanBiet dây leo/thang → 950691 và lưới trò chơi → 95069920', () => {
  const st = loadSoTay('9506');
  const pbLeo = (st.phanBiet || []).find((x) => /dây leo|thang/i.test(String(x.hoi || '')) && /950691/.test(String(x.neuCo || '')));
  const pbLuoi = (st.phanBiet || []).find((x) => /tennis|cầu lông|bóng chuyền/i.test(String(x.hoi || '')) && /95069920/.test(String(x.neuCo || '')));
  assert.ok(pbLeo, 'thiếu phanBiet dây leo → 950691');
  assert.ok(pbLuoi, 'thiếu phanBiet lưới trò chơi → 95069920');
  trichDat('9506', pbLeo);
  trichDat('9506', pbLuoi);
});

check('9506 có phanBiet sân chơi trẻ em (nội bộ) + 9508 loại trừ thiết bị 95.06', () => {
  const st6 = loadSoTay('9506');
  const st8 = loadSoTay('9508');
  const pb6 = (st6.phanBiet || []).find((x) => /sân chơi trẻ em/i.test(String(x.hoi || '')) && /95069990/.test(String(x.neuCo || '')));
  const pb8 = (st8.phanBiet || []).find((x) => String(x.neuCo || '') === '9506' && /95\.06/.test(String(x.trich || '')));
  assert.ok(pb6, 'thiếu phanBiet sân chơi → 95069990');
  assert.ok(pb8, 'thiếu phanBiet 9508→9506');
  trichDat('9506', pb6);
  trichDat('9508', pb8);
});

check('OZV-2400 ranh-gioi 950699.json đạt cổng 0..5 (0 cảnh báo cong0/cong5) và 95069920 không đặt TEN_LOAI «Lưới» trần đứng một mình', () => {
  const rg = JSON.parse(readFileSync(join(ROOT, 'data', 'ho-so', 'ranh-gioi', '950699.json'), 'utf8'));
  assert.equal(String(rg.trangThai || '').toUpperCase(), 'DUYET');
  const kq = C.kiemRanhGioi('950699', rg);
  assert.equal(kq.hopLe, true, `950699 lỗi cổng: ${JSON.stringify(kq.loi)}`);
  assert.equal(kq.loi.length, 0, JSON.stringify(kq.loi));
  const cb05 = (kq.canhBao || []).filter((x) => /^cong[05]-/.test(x));
  assert.equal(cb05.length, 0, `còn cảnh báo cong0/cong5: ${JSON.stringify(cb05)}`);
  const d = (rg.dong8 || []).find((x) => x.hs === '95069920');
  const hoac = (d?.dieuKienSo || []).find((c) => c.op === 'HOAC');
  assert.ok(hoac, `95069920 phải dùng HOAC gắn đích trò chơi cho «Lưới»: ${JSON.stringify(d?.dieuKienSo)}`);
});

check('trade-synonyms dẫn câu khách vào cụm 5608/9506/9508, tránh top 8486', () => {
  const tops = topHs(CA_KHACH, 8);
  const top4s = tops.map((h) => h.slice(0, 4));
  assert.ok(
    top4s.some((h) => ['5608', '9506', '9508'].includes(h)),
    `top cần có 5608/9506/9508, được: ${tops.join(',')}`,
  );
  assert.notEqual(top4s[0], '8486', `top1 không được 8486 (lưới quang bán dẫn): ${tops[0]}`);
});

// ─── 2. Bảng dò câu khách 4→6→8 ───
check('ca khách: hỏi phân biệt nhóm 5608/9506/9508 và chặn chốt sớm 95069920 ở 950699', () => {
  const { pb, chot699, row } = do4_6_8('khách', CA_KHACH, { hints: ['5608', '9506', '9508'] });
  assert.ok(pb.length >= 1, `cần ≥1 câu phanBiet, được ${pb.length}`);
  const blob = JSON.stringify(pb);
  assert.ok(/5608|9506|9508/.test(blob), `câu hỏi phải nhắc nhóm: ${blob.slice(0, 400)}`);
  assert.notEqual(chot699?.ketQua, 'CHOT', `không được CHOT sớm cho «${CA_KHACH}»: ${JSON.stringify(chot699)}`);
  assert.notEqual(chot699?.hs, '95069920', `không được chốt 95069920 cho «${CA_KHACH}»: ${JSON.stringify(chot699)}`);
  assert.ok(row.soCauPb >= 1);
});

// ─── 3. Ca ngược ───
check('ngược lưới đánh cá → giữ quỹ đạo 5608 (search/hint), không kéo trade-synonyms lưới leo và không chốt 95069920', () => {
  const q = 'lưới đánh cá thành phẩm từ sợi nhân tạo';
  const { tops, chot699 } = do4_6_8('ngược-đánh-cá', q, { hints: ['5608'] });
  assert.ok(tops.some((h) => h.startsWith('5608')) || (expandSearchQuery(q).headingHints || []).includes('5608'), `thiếu 5608 trong top/hint: ${tops.join(',')}`);
  assert.ok(!tops[0]?.startsWith('9506'), `top1 không được 9506 cho lưới đánh cá: ${tops[0]}`);
  assert.notEqual(chot699?.hs, '95069920', `lưới đánh cá không được chốt 95069920: ${JSON.stringify(chot699)}`);
  const { matches } = lookupTradeTerms(q);
  assert.ok(!matches.some((m) => m.entryId === 'luoi-leo-khu-vui-choi'), 'trade lưới leo không được khớp lưới đánh cá');
});

check('ngược lưới tennis/cầu lông và đệm/tấm ốp bảo vệ ống chân → được chốt/nhận 95069920', () => {
  const q = 'lưới tennis và lưới cầu lông cho sân thể thao';
  const { chot699 } = do4_6_8('ngược-tennis', q, { hints: ['9506'] });
  assert.equal(chot699?.ketQua, 'CHOT');
  assert.equal(chot699?.hs, '95069920');
  for (const moTa of ['đệm bảo vệ ống chân dùng trong thể thao', 'tấm ốp bảo vệ ống chân bóng đá']) {
    const cd = chotDong8({ hs: '950699', productText: moTa });
    assert.equal(cd?.ketQua, 'CHOT', `${moTa} phải CHOT: ${JSON.stringify(cd)}`);
    assert.equal(cd?.hs, '95069920', `${moTa} phải ra 95069920: ${JSON.stringify(cd)}`);
  }
});

check('ngược dây thừng bện → 5607 (không kéo sang 9506 như lưới leo)', () => {
  const q = 'dây thừng bện bằng sợi đay';
  const hints = expandSearchQuery(q).headingHints || [];
  const tops = topHs(q, 8);
  do4_6_8('ngược-thừng', q, { hints: ['5607'] });
  assert.ok(
    hints.includes('5607') || tops.some((h) => h.startsWith('5607')),
    `cần 5607 trong hint/top: hints=${JSON.stringify(hints)} top=${tops.join(',')}`,
  );
  assert.ok(!tops[0]?.startsWith('9506'), `top không được 9506: ${tops[0]}`);
});

console.log('\n--- bảng dò 4→6→8 ---');
for (const r of bang) {
  console.log(JSON.stringify(r));
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nOK luoi-leo-khu-vui-choi');
process.exit(0);
