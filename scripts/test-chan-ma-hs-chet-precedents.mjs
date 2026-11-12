#!/usr/bin/env node
// scripts/test-chan-ma-hs-chet-precedents.mjs — OZV-596:
// Kiểm chứng toàn bộ 151 mã HS 8 số đã chết trong data/precedents.json
// (105 mã outcome chết / 337 bản ghi + 52 mã confusedWith chết / 62 bản ghi = 151 mã)
// không lọt nguyên mã chết ra ngoài qua 8 tệp đọc precedents, đồng thời:
// - Gắn nhãn rõ: maDaBietGop: true + lyDoMaDaBietGop: "mã đã bị gộp trong biểu thuế hiện hành"
// - Ca âm tính trên từng đường: mã sống ở cùng vị trí trả y hệt trước (không chặn nhầm).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const taxData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tax.json'), 'utf8'));
const rawPrecedents = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/precedents.json'), 'utf8'));
const confusionDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/confusion-pairs.json'), 'utf8'));

const { precedentsData, precedentsBiThayThe, precedentsMaChetDaGop } = require(path.join(ROOT, 'lib/data.js'));
const { chuanMaSong, LY_DO_MA_DA_BIET_GOP } = require(path.join(ROOT, 'lib/tien-le-thay-the.js'));
const { searchPrecedents, findBySoHieu, applyPrecedentBoost } = require(path.join(ROOT, 'lib/precedent-search.js'));
const { buildEvidencePack } = require(path.join(ROOT, 'lib/evidence-pack.js'));
const cp = require(path.join(ROOT, 'lib/confusion-pairs.js'));
const { precedentsForHs } = require(path.join(ROOT, 'lib/suggest-evidence.js'));
const { timTrung } = require(path.join(ROOT, 'lib/tien-le-trung-tim.js'));
const { kiemTruocChot } = require(path.join(ROOT, 'lib/kiem-truoc-chot.js'));

const live8 = new Set(Object.keys(taxData).filter((k) => /^\d{8}$/.test(k)));
const norm = (c) => String(c || '').replace(/\D/g, '');
const isDead8 = (c) => {
  const d = norm(c);
  return d.length === 8 && !live8.has(d);
};
const isLivePrefixOr8 = (c) => {
  const d = norm(c);
  if (d.length === 8) return live8.has(d);
  if (d.length === 6 || d.length === 4) {
    for (const k of live8) if (k.startsWith(d)) return true;
  }
  return false;
};

let passed = 0;
let failed = 0;
function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── 0. Xác nhận tập 151 mã chết từ data/precedents.json gốc ──────────────────
const deadOutcomeCodes = new Set();
const deadConfusedCodes = new Set();
let deadOutcomeRecords = 0;
let deadConfusedRecords = 0;
const allSoHieuWithDead = new Set();

for (const [hs, list] of Object.entries(rawPrecedents)) {
  const d = norm(hs);
  const hsDead = isDead8(d);
  for (const r of list || []) {
    const outD = norm(r.outcome || hs);
    const outDead = isDead8(outD) || hsDead;
    let recHasDead = outDead;
    if (outDead) {
      if (isDead8(outD)) deadOutcomeCodes.add(outD);
      if (hsDead) deadOutcomeCodes.add(d);
      deadOutcomeRecords++;
    }
    const cw = (r.confusedWith || []).map(norm).filter(isDead8);
    if (cw.length) {
      deadConfusedRecords++;
      for (const c of cw) deadConfusedCodes.add(c);
      recHasDead = true;
    }
    if (recHasDead && r.tbTchqNumber) allSoHieuWithDead.add(r.tbTchqNumber);
  }
}
const all151Dead = new Set([...deadOutcomeCodes, ...deadConfusedCodes]);

check(
  'data/precedents.json gốc: 337 bản ghi / 105 mã outcome 8 số chết',
  deadOutcomeRecords === 337 && deadOutcomeCodes.size === 105,
  `records=${deadOutcomeRecords}, codes=${deadOutcomeCodes.size}`
);
check(
  'data/precedents.json gốc: 62 bản ghi / 52 mã confusedWith 8 số chết',
  deadConfusedRecords === 62 && deadConfusedCodes.size === 52,
  `records=${deadConfusedRecords}, codes=${deadConfusedCodes.size}`
);
check(
  'hợp lại đúng 151 mã HS 8 số đã chết',
  all151Dead.size === 151,
  `union=${all151Dead.size}`
);

// ── 1. lib/tien-le-thay-the.js & lib/data.js ─────────────────────────────────
const leakedDataKeys = Object.keys(precedentsData).filter(isDead8);
const leakedDataCw = [];
for (const list of Object.values(precedentsData)) {
  for (const r of list || []) {
    for (const c of r.confusedWith || []) {
      if (isDead8(c)) leakedDataCw.push(norm(c));
    }
  }
}
check(
  'lib/tien-le-thay-the.js: precedentsData còn 0 mã outcome chết và 0 mã confusedWith chết (151 → 0)',
  leakedDataKeys.length === 0 && leakedDataCw.length === 0,
  `keys=${leakedDataKeys.length}, cw=${leakedDataCw.length}`
);

let maChetCount = 0;
let maChetAllTagged = true;
const listChet = Array.isArray(precedentsMaChetDaGop)
  ? precedentsMaChetDaGop
  : Object.values(precedentsMaChetDaGop || {}).flat();
for (const r of listChet) {
  if (!r) continue;
  maChetCount++;
  if (
    !r.maDaBietGop ||
    r.lyDoMaDaBietGop !== LY_DO_MA_DA_BIET_GOP ||
    !isLivePrefixOr8(r.maSong) ||
    isDead8(r.maSong)
  ) {
    maChetAllTagged = false;
  }
}
check(
  'lib/tien-le-thay-the.js: precedentsMaChetDaGop giữ đủ 337 bản ghi mã cũ kèm maSong sống + nhãn maDaBietGop',
  maChetCount === 337 && maChetAllTagged,
  `count=${maChetCount}, allTagged=${maChetAllTagged}`
);

const mapped2601 = chuanMaSong('26011100');
check(
  'chuanMaSong("26011100"): ánh xạ qua bảng remap sang mã 8 số sống 26011110 + gắn nhãn maDaBietGop',
  mapped2601.maSong === '26011110' &&
    mapped2601.maDaBietGop === true &&
    mapped2601.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành',
  JSON.stringify(mapped2601)
);

const fallback1211 = chuanMaSong('12112000');
check(
  'chuanMaSong("12112000"): không tự chế mã 8 số thay thế — lùi về phân nhóm 6 số sống 121120 + gắn nhãn maDaBietGop',
  fallback1211.maSong === '121120' &&
    fallback1211.maDaBietGop === true &&
    fallback1211.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành',
  JSON.stringify(fallback1211)
);

// Ca âm tính cho chuanMaSong
const live8536 = chuanMaSong('85364990');
check(
  '[Ca âm tính] chuanMaSong("85364990"): mã sống giữ nguyên 85364990, maDaBietGop = false',
  live8536.maSong === '85364990' && live8536.maDaBietGop === false && live8536.lyDoMaDaBietGop === null,
  JSON.stringify(live8536)
);

// ── 2. lib/precedent-search.js ───────────────────────────────────────────────
const leakedFindBySoHieu = new Set();
for (const so of allSoHieuWithDead) {
  const res = findBySoHieu(so);
  for (const hit of Array.isArray(res) ? res : []) {
    if (all151Dead.has(norm(hit.finalHsCode))) leakedFindBySoHieu.add(norm(hit.finalHsCode));
    if (all151Dead.has(norm(hit?.precedent?.finalHsCode))) leakedFindBySoHieu.add(norm(hit.precedent.finalHsCode));
    if (all151Dead.has(norm(hit?.precedent?.outcomeHs))) leakedFindBySoHieu.add(norm(hit.precedent.outcomeHs));
    for (const c of hit?.precedent?.confusedWith || []) {
      if (isDead8(c) || all151Dead.has(norm(c))) leakedFindBySoHieu.add(norm(c));
    }
  }
}
check(
  'lib/precedent-search.js: findBySoHieu rò 0/151 mã chết trên toàn bộ số hiệu có mã chết (151 → 0)',
  leakedFindBySoHieu.size === 0,
  `leaked=${[...leakedFindBySoHieu].join(',')}`
);

const tb617 = findBySoHieu('617/TB-TCHQ');
const tb617Gop = (tb617 || []).find((h) => h.maDaBietGop);
check(
  'findBySoHieu("617/TB-TCHQ"): đổi mã chết 26011100 → mã sống 26011110 + maDaBietGop: true + lý do rõ',
  Boolean(tb617Gop) &&
    tb617Gop.finalHsCode === '26011110' &&
    tb617Gop.maDaBietGop === true &&
    tb617Gop.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành' &&
    (tb617 || []).every((h) => !isDead8(h.finalHsCode)),
  JSON.stringify(tb617)
);

const sp1211 = searchPrecedents('Rễ cây nhân sâm đã sấy khô được xay ra, đóng gói dạng túi lọc (2 gram/túi, 20 túi/ hộp', { topK: 5 });
const hit529 = sp1211.find((h) => h.precedent?.tbTchqNumber === '529/TB-TCHQ');
check(
  'searchPrecedents("Rễ cây nhân sâm... túi lọc"): 529/TB-TCHQ trả finalHsCode sống "121120" + maDaBietGop: true (không trả 12112000)',
  Boolean(hit529) &&
    hit529.finalHsCode === '121120' &&
    hit529.maDaBietGop === true &&
    hit529.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành' &&
    sp1211.every((h) => !isDead8(h.finalHsCode)),
  JSON.stringify(hit529)
);

const tb5498 = findBySoHieu('5498/TCHQ-TXNK');
const hit5498 = (tb5498 || [])[0];
check(
  'findBySoHieu("5498/TCHQ-TXNK"): đổi confusedWith chết 70052100 → mã sống 700521 + maDaBietGop: true',
  Boolean(hit5498) &&
    hit5498.precedent?.confusedWith?.includes('700521') &&
    !hit5498.precedent?.confusedWith?.includes('70052100') &&
    hit5498.maDaBietGop === true,
  JSON.stringify(tb5498)
);

const boost1211 = applyPrecedentBoost(
  [{ hsCode: '12112000', score: 10 }, { hsCode: '12112010', score: 10 }],
  'Rễ cây nhân sâm đã sấy khô được xay ra, đóng gói dạng túi lọc (2 gram/túi, 20 túi/ hộp'
);
check(
  'applyPrecedentBoost: precedentMatches không chứa mã chết 12112000, chứa 121120 + maDaBietGop: true',
  boost1211.precedentMatches.every((m) => !isDead8(m.finalHsCode)) &&
    boost1211.precedentMatches.some((m) => m.finalHsCode === '121120' && m.maDaBietGop === true),
  JSON.stringify(boost1211.precedentMatches)
);

// Ca âm tính cho precedent-search.js
const tb3609 = findBySoHieu('3609/TB-TCHQ');
check(
  '[Ca âm tính] findBySoHieu("3609/TB-TCHQ"): mã sống 85013170 giữ nguyên, không có maDaBietGop',
  Array.isArray(tb3609) && tb3609.length > 0 && tb3609.every((h) => h.finalHsCode === '85013170' && !h.maDaBietGop),
  JSON.stringify(tb3609)
);
const spLive = searchPrecedents('rơ le điện từ 5V', { topK: 5 });
const hitLive = spLive.find((h) => h.finalHsCode === '85364990');
check(
  '[Ca âm tính] searchPrecedents("rơ le điện từ 5V"): mã sống 85364990 giữ nguyên, không có maDaBietGop',
  Boolean(hitLive) && !hitLive.maDaBietGop,
  JSON.stringify(hitLive)
);

// ── 3. lib/evidence-pack.js ──────────────────────────────────────────────────
const epSample = buildEvidencePack({
  maHs: ['12112010'],
  moTa: 'Rễ cây nhân sâm đã sấy khô được xay ra, đóng gói dạng túi lọc (2 gram/túi, 20 túi/ hộp',
});
const epSampleTl = epSample?.goiCanCu?.[0]?.tienLe;
const ep529 = [
  ...(epSampleTl?.items || []),
  ...(epSampleTl?.tienLeMaKhac || []),
].find((it) => it.soHieu === '529/TB-TCHQ');
check(
  'lib/evidence-pack.js: buildEvidencePack(12112010) tiền lệ 529/TB-TCHQ trả maKetLuan sống "121120" + maDaBietGop: true',
  Boolean(ep529) &&
    ep529.maKetLuan === '121120' &&
    ep529.maDaBietGop === true &&
    ep529.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành' &&
    [...(epSampleTl?.items || []), ...(epSampleTl?.tienLeMaKhac || [])].every((it) => !isDead8(it.maKetLuan)),
  JSON.stringify(ep529)
);

// Ca âm tính cho evidence-pack.js
const epLive = buildEvidencePack({
  maHs: ['84272000'],
  moTa: 'Xe nâng hàng tự hành dùng động cơ đốt trong hiệu TOYOTA',
});
const epLiveItems = epLive?.goiCanCu?.[0]?.tienLe?.items || [];
check(
  '[Ca âm tính] buildEvidencePack(84272000): tiền lệ sống 2039/TCHQ-TXNK giữ nguyên maKetLuan 84272000, không có maDaBietGop',
  epLiveItems.some((it) => it.soHieu === '2039/TCHQ-TXNK' && it.maKetLuan === '84272000' && !it.maDaBietGop),
  JSON.stringify(epLiveItems)
);

// ── 4. lib/confusion-pairs.js ────────────────────────────────────────────────
const leakedCp = new Set();
let liveCpExample = null;
for (const e of confusionDoc.entries || []) {
  const pub = cp.getEntry(e.id);
  for (const p of pub?.precedents || []) {
    if (isDead8(p.hsCode)) leakedCp.add(norm(p.hsCode));
    if (!p.maDaBietGop && live8.has(norm(p.hsCode)) && !liveCpExample) {
      liveCpExample = { id: e.id, p };
    }
  }
}
check(
  'lib/confusion-pairs.js: entry.precedents rò 0/151 mã chết trên toàn bộ mục (8 → 0)',
  leakedCp.size === 0,
  `leaked=${[...leakedCp].join(',')}`
);

const dm05 = cp.getEntry('DM-05');
const p3241 = (dm05?.precedents || []).find((p) => p.tbTchqNumber === '3241/TB-TCHQ');
check(
  'getEntry("DM-05"): tiền lệ 3241/TB-TCHQ đổi mã chết 54071090 → mã sống 540710 + maDaBietGop: true',
  Boolean(p3241) &&
    p3241.hsCode === '540710' &&
    p3241.maDaBietGop === true &&
    p3241.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành',
  JSON.stringify(dm05?.precedents)
);

// Ca âm tính cho confusion-pairs.js
check(
  '[Ca âm tính] confusion-pairs.js: tiền lệ mã sống giữ nguyên hsCode 8 số sống, không gắn maDaBietGop',
  Boolean(liveCpExample) && live8.has(norm(liveCpExample.p.hsCode)) && !liveCpExample.p.maDaBietGop,
  JSON.stringify(liveCpExample)
);

// ── 5 & 6. lib/suggest-evidence.js & lib/classify.js & lib/tien-le-trung-tim.js ──
const leakedSuggest = new Set();
for (const hs of [...all151Dead, ...Object.keys(precedentsData)]) {
  const list = precedentsForHs(hs);
  if (list.length && isDead8(hs)) leakedSuggest.add(hs);
  for (const r of list) {
    for (const c of r.confusedWith || []) {
      if (isDead8(c)) leakedSuggest.add(norm(c));
    }
  }
}
check(
  'lib/suggest-evidence.js: precedentsForHs chặn toàn bộ 151 mã chết (outcome + confusedWith: 142 → 0)',
  leakedSuggest.size === 0,
  `leaked=${[...leakedSuggest].join(',')}`
);

const pf2517 = precedentsForHs('25174100');
const pf5722 = pf2517.find((r) => r.tbTchqNumber === '5722/TB-TCHQ');
check(
  'precedentsForHs("25174100"): 5722/TB-TCHQ đổi confusedWith chết 28365000 → mã sống 283650 + maDaBietGop: true',
  Boolean(pf5722) &&
    pf5722.confusedWith.includes('283650') &&
    !pf5722.confusedWith.includes('28365000') &&
    pf5722.maDaBietGop === true &&
    pf5722.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành',
  JSON.stringify(pf5722)
);

// Ca âm tính cho suggest-evidence.js
const pf8501 = precedentsForHs('85013170');
check(
  '[Ca âm tính] precedentsForHs("85013170"): trả đủ 3 bản ghi sống, không bản ghi nào bị gắn maDaBietGop',
  pf8501.length === 3 && pf8501.every((r) => !r.maDaBietGop),
  JSON.stringify(pf8501)
);

// Kiểm timTrung (lib/tien-le-trung-tim.js)
const ttDead = timTrung(
  'Rễ cây nhân sâm đã sấy khô được xay ra, đóng gói dạng túi lọc',
  {
    precedentsData: {
      12112000: [{ sourceType: 'TB-TCHQ', productName: 'Rễ cây nhân sâm đã sấy khô được xay ra, đóng gói dạng túi lọc', tbTchqNumber: '529/TB-TCHQ', year: 2023 }],
    },
  }
);
check(
  'lib/tien-le-trung-tim.js: timTrung đổi mã chết 12112000 → mã sống 121120 + maDaBietGop: true',
  Array.isArray(ttDead) &&
    ttDead.length === 1 &&
    ttDead[0].ma === '121120' &&
    ttDead[0].maDaBietGop === true &&
    ttDead[0].lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành',
  JSON.stringify(ttDead)
);

const ttLive = timTrung(
  'Ốc vít bằng nhựa dùng cố định bảng mạch',
  {
    precedentsData: {
      39269099: [{ sourceType: 'TB-TCHQ', productName: 'Ốc vít bằng nhựa dùng cố định bảng mạch', tbTchqNumber: '1234/TB-TCHQ', year: 2023 }],
    },
  }
);
check(
  '[Ca âm tính] lib/tien-le-trung-tim.js: timTrung giữ nguyên mã sống 39269099, không gắn maDaBietGop',
  Array.isArray(ttLive) && ttLive.length === 1 && ttLive[0].ma === '39269099' && !ttLive[0].maDaBietGop,
  JSON.stringify(ttLive)
);

// ── 7. lib/kiem-truoc-chot.js ────────────────────────────────────────────────
const leakedKtc = new Set();
for (const [hs, list] of Object.entries(rawPrecedents)) {
  const d = norm(hs);
  if (!isDead8(d)) continue;
  const siblingLive = [...live8].find((k) => k.slice(0, 4) === d.slice(0, 4)) || '85369099';
  for (const r of list || []) {
    const kq = kiemTruocChot({
      topHs: siblingLive,
      hang: { tenHang: r.productName || '', moTa: r.productName || '' },
      ungVien: [siblingLive, d],
    });
    for (const dx of kq.deXuat || []) if (isDead8(dx.hs)) leakedKtc.add(norm(dx.hs));
    for (const cb of kq.canhBao || []) if (isDead8(cb.maDeNghiXem)) leakedKtc.add(norm(cb.maDeNghiXem));
  }
}
check(
  'lib/kiem-truoc-chot.js: kiemTruocChot rò 0/151 mã chết vào deXuat và maDeNghiXem (23 → 0)',
  leakedKtc.size === 0,
  `leaked=${[...leakedKtc].join(',')}`
);

const ktcRemap = kiemTruocChot({
  topHs: '26011210',
  hang: {
    tenHang: 'Xỉ thu được từ công nghiệp luyện sắt thép. - Tinh quặng sắt nâu, chưa nung kết, hàm lượng Fe = 57.05%.',
    moTa: 'Xỉ thu được từ công nghiệp luyện sắt thép. - Tinh quặng sắt nâu, chưa nung kết, hàm lượng Fe = 57.05%.',
  },
  ungVien: ['26011210', '26011100'],
});
check(
  'kiemTruocChot với ứng viên mã cũ 26011100: chuyển sang mã sống 26011110 + gắn maDaBietGop: true',
  ktcRemap.deXuat.some(
    (d) =>
      d.hs === '26011110' &&
      d.maDaBietGop === true &&
      d.lyDoMaDaBietGop === 'mã đã bị gộp trong biểu thuế hiện hành'
  ),
  JSON.stringify(ktcRemap)
);

// Ca âm tính cho kiem-truoc-chot.js
const ktcLive = kiemTruocChot({
  topHs: '85369099',
  hang: {
    tenHang: 'Đầu cốt đồng mạ thiếc dùng để nối dây dẫn điện (terminal bấm đầu dây)',
    moTa: 'Đầu cốt đồng mạ thiếc dùng để nối dây dẫn điện (terminal bấm đầu dây)',
  },
  ungVien: ['85369099', '85369012'],
});
check(
  '[Ca âm tính] kiemTruocChot với ứng viên sống 85369012: đề xuất 85369012 giữ nguyên, không có maDaBietGop',
  ktcLive.deXuat.some((d) => d.hs === '85369012' && !d.maDaBietGop),
  JSON.stringify(ktcLive)
);

console.log(`\n${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
