#!/usr/bin/env node
/**
 * #196: kho riêng WCO Compendium — chặn lọt lên repo công khai + tách ý kiến + máy kiểm câu trích.
 * Dữ liệu thử là văn bản TỰ VIẾT (không phải nội dung WCO).
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { segment, validate, fixOcrId, DEFAULT_CODE_ONLY_REGEX } from './wco-op-parse.mjs';
import { skeleton, shapeOf, findLabels } from './wco-op-skeleton.mjs';
import { parseMarkdown, parseHeadingCode, markSuspect } from './wco-op-parse-md.mjs';
import { alignHeadings } from './wco-op-fix-headings.mjs';
import { applyInferred } from './wco-op-apply-inferred.mjs';
import { numericParity, numberTokens } from './wco-op-check-vi.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { dataPath } = require('../lib/data-paths.js');
const wco = require('../lib/wco-op.js');

let passed = 0; let failed = 0;
const assert = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`);
  if (ok) passed += 1; else failed += 1;
};
const L = (pdfPage, ...ts) => ts.map((t) => ({ t, pdfPage, b: false }));

// 1. Riêng tư: .gitignore chặn mọi thứ trong data/wco-op trừ README
const ign = (f) => spawnSync('git', ['check-ignore', '-q', f], { cwd: ROOT }).status === 0;
for (const f of ['WCO Compendium 2022.pdf', 'pages-en.jsonl', 'opinions.json', 'extract-report.json', 'parse-report.json', 'ban-dich.json']) {
  assert(`gitignore chặn data/wco-op/${f}`, ign(`data/wco-op/${f}`));
}
assert('README.md của kho riêng KHÔNG bị ignore', !ign('data/wco-op/README.md'));
const tracked = spawnSync('git', ['ls-files', 'data/wco-op'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
assert('git chỉ theo dõi README trong data/wco-op', tracked.every((f) => f === 'data/wco-op/README.md'), tracked.join(','));
const pdfs = spawnSync('git', ['ls-files', '*.pdf', '*Compendium*'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
assert('repo không có PDF/Compendium nào được theo dõi', pdfs.length === 0, pdfs.join(','));

assert('.dockerignore loại data/wco-op (Dockerfile COPY . . sẽ nhồi PDF 130 MB vào image)', /^data\/wco-op\/?$/m.test(fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8')));

// 2. segment
const doc = [
  ...L(10, 'Some preface line', 'Another line'),
  ...L(10, '21.06/1   Invented preparation', 'Classified in heading 21.06 under General Interpretative Rule GIR 1.'),
  ...L(10, '8517.62/1   Device with a display', 'Description of goods: an invented device that is used for testing.', 'Classified in 8517.62 by GIR 1 and 6.'),
  ...L(11, 'Adopted at the 51st Session (March 2013).'),
  ...L(11, '8517.62/2   Second invented device', 'The device is not covered by heading 85.18, see 8517.62/1 above.'),
  ...L(11, '8517.62/1  Xem lại (dẫn chéo đầu dòng)'),
  ...L(12, '8523.51/1   Invented medium', 'Text of the invented medium opinion.'),
];
const seg = segment(doc);
assert('tách đúng 4 ý kiến', seg.opinions.length === 4, JSON.stringify(seg.opinions.map((o) => o.id)));
assert('id dạng hs/thứ tự', seg.opinions.map((o) => o.id).join() === '2106/1,851762/1,851762/2,852351/1');
assert('mã 4 số có level 4, mã 6 số level 6', seg.opinions[0].level === 4 && seg.opinions[1].level === 6);
assert('dẫn chéo đầu dòng (mã lùi) bị loại và đếm', seg.rejectedBackward.length === 1 && seg.rejectedBackward[0].startsWith('851762/1'));
assert('dẫn chéo bị loại thì dòng đó nằm lại trong ý kiến trước', seg.opinions[2].text.includes('dẫn chéo'));
assert('nhận phiên họp', seg.opinions[1].session === 51);
assert('nhận GIR nhắc tới', seg.opinions[1].girMentioned?.[0] === '1 and 6' && seg.opinions[0].girMentioned?.[0] === '1');
assert('trang đầu/cuối của ý kiến', seg.opinions[1].pages[0] === 10 && seg.opinions[1].pages[1] === 11);
assert('đếm dòng lời nói đầu', seg.preface === 2);
assert('--id-regex tuỳ biến', segment(L(1, 'Opinion 8517.62-1 text'), { idRegex: 'Opinion\\s+(\\d{4}\\.\\d{2})-(\\d+)' }).opinions.length === 1);
assert('requireBold bỏ dòng không đậm', segment(doc, { requireBold: true }).opinions.length === 0);

// 2b. OCR đọc nhầm ký tự trong mã đầu ý kiến
const known = { six: new Set(['851762', '852351']), four: new Set(['2106']) };
const fx = (s) => fixOcrId(s, known);
assert('OCR: O→0, l→1', fx('85l7.62/4 Invented').t === '8517.62/4 Invented' && fx('8517.62/4 x').fixed === false);
assert('OCR: dấu phẩy, "/" đọc thành l, I→1', fx('8517,62 l 4 Invented').t === '8517.62/4 Invented' && fx('852351/1').fixed === false);
assert('OCR: chỉ sửa khi mã tồn tại trong bảng WCO', fx('8999.99/1 Invented').fixed === false && fixOcrId('8517.62/4 x', null).fixed === false);
assert('OCR: câu chữ thường không bị biến thành mã', fx('Soil.04/1 is a word').fixed === false);
const segFix = segment(L(1, '85l7.62/1  Invented', 'Text body of the invented opinion one.', '8S23.5l/1  Invented two', 'Text body two.'), { known });
assert('segment nhận mã đã sửa OCR và ghi báo cáo', segFix.opinions.map((o) => o.id).join() === '851762/1,852351/1' && segFix.ocrFixed.length === 2, JSON.stringify(segFix.opinions.map((o) => o.id)));

// 2c. Bản gốc chỉ ghi mã (không "/n") + dòng nhãn "Adoption : năm"
const noSlash = [
  ...L(5, 'Preface line one', 'Preface line two'),
  ...L(5, '3802.90', 'Invented activated product description line.', 'Adoption : 2014', 'Application of GIRs 1 and 6 (invented).'),
  ...L(6, 'Cross reference line follows, see below:', '3802.90 appears here as a quoted code at line start', 'More body text of the first opinion.'),
  ...L(6, '3802.90', 'Second invented opinion for the same code.', 'Adoption : 2016', 'Application of GIR 1.'),
  ...L(7, '3808.59', 'Third invented opinion.', 'Adoption : 2018'),
];
const nsOpts = { idRegex: DEFAULT_CODE_ONLY_REGEX, inferOrd: true, confirm: '^Adoption', confirmWithin: 4 };
const ns = segment(noSlash.map((x) => ({ ...x })), nsOpts);
assert('không có "/n": nhận mã đầu dòng + xác nhận bằng nhãn, 3 ý kiến', ns.opinions.map((o) => o.id).join() === '380290/1,380290/2,380859/1', JSON.stringify(ns.opinions.map((o) => o.id)));
assert('thứ tự suy ra được đánh dấu ordInferred', ns.opinions.every((o) => o.ordInferred === true));
assert('mã dẫn chiếu giữa thân (không có Adoption ngay sau) bị loại vì chưa xác nhận', ns.rejectedUnconfirmed.length >= 1 && ns.opinions[0].text.includes('quoted code'), ns.rejectedUnconfirmed);
assert('đọc năm Adoption và "GIRs 1 and 6"', ns.opinions[0].adoption === 2014 && ns.opinions[0].girMentioned?.[0] === '1 and 6' && ns.opinions[1].adoption === 2016);
assert('không bật --infer-ord thì mã trần không thành ý kiến', segment(noSlash.map((x) => ({ ...x }))).opinions.length === 0);
assert('regex mặc định vẫn nhận "8517.62/4" khi bật infer', segment(L(1, '8517.62/4 x', 'Adoption : 2020'), { idRegex: '^\\s*(\\d{4}\\.\\d{2})\\s*\\/\\s*(\\d{1,3})', inferOrd: true }).opinions[0]?.ord === 4);

// 2d. Khung xương: chỉ lộ hình dạng + nhãn mẫu lặp lại, không lộ chữ nội dung
const sk = [];
for (let i = 0; i < 10; i++) sk.push(...L(1 + i, '3802.90', `Secretword${i} invented body that must never leak`, `Adoption : 20${10 + i}`, 'Application of GIR 1.'));
const rep = skeleton(sk.map((x) => ({ ...x, x: 40, s: 9 })), { around: 'Adoption', show: 2, ctx: 3 });
assert('khung xương: nhận nhãn "Adoption" lặp ≥ 8 lần', rep.labels.Adoption === 10 && findLabels(sk).Application === undefined, rep.labels);
assert('khung xương: hình dạng dòng mã là 9999.99', rep.codeLineShapes['9999.99'] === 10, rep.codeLineShapes);
assert('khung xương: không rò chữ nội dung', !JSON.stringify(rep).includes('Secretword') && !JSON.stringify(rep).includes('invented'), JSON.stringify(rep).slice(0, 200));
assert('khung xương: cửa sổ quanh nhãn có hình dạng, giữ nguyên nhãn mẫu', rep.windows.length === 2 && rep.windows[0].lines.some((l) => l.shape.startsWith('Adoption')), rep.windows[0]);
assert('shapeOf: chữ→a, số→9', shapeOf('Ab12 x') === 'aa99 a');

// 2e. Neo sau nhãn: "Adoption : năm" là dòng CUỐI ý kiến, mã kế ngay sau là đầu ý kiến mới (cấu trúc thật của bản scan)
const tail = [
  ...L(5, 'Preface line', '3802.90 appears in the preface as a stray code line'),
  ...L(7, 'Body of an opening opinion that has no code before it.', 'Adoption : 2012', '3802.90', 'First invented body line.', 'Cross reference follows:', '3808.59 mentioned inside the body, not after a label', 'Application of GIRs 1 and 6.', 'Adoption : 2014'),
  ...L(8, '3802.90', 'Second invented opinion, same code.', 'Adoption : 2016', '', '3808.59', 'Third invented opinion.', 'Adoption : 2018', '3401.11', 'Last invented opinion.', 'Adoption : 2019'),
  ...L(9, '3402.13', 'Out of order code, probably OCR.', 'Adoption : 2020', '3401.19', 'x'),
];
const an = segment(tail.map((x) => ({ ...x })), { idRegex: DEFAULT_CODE_ONLY_REGEX, inferOrd: true, anchorAfter: '^Adoption' });
assert('neo sau nhãn: mã giữa thân bài (không đứng sau nhãn) không thành đầu ý kiến', an.opinions.map((o) => o.id).join() === '380290/1,380290/2,380859/1,340111/1,340213/1,340119/1', JSON.stringify(an.opinions.map((o) => o.id)));
assert('neo sau nhãn: mã dẫn chiếu nằm lại trong thân ý kiến trước', an.opinions[0].text.includes('mentioned inside the body') && an.opinions[0].adoption === 2014 && an.opinions[1].adoption === 2016);
assert('neo sau nhãn: mã lùi được giữ và báo outOfOrder (không loại)', an.outOfOrder.length >= 1 && an.opinions.some((o) => o.id === '340119/1'), an.outOfOrder);
assert('neo sau nhãn: ý kiến đầu tài liệu (không có nhãn đứng trước) bị bỏ, lời nói đầu đếm đúng', an.preface === tail.findIndex((x) => x.t === '3802.90' && x.pdfPage === 7), an.preface);

// 2f. Bản OCR markdown (## Section / ### mã / **n.** mô tả / *Application…* / *Adoption: năm*) — văn bản TỰ VIẾT
const md = [
  '# Compendium', '## Introduction', 'Some invented intro. *Adoption: 1999* (không thuộc ý kiến nào vì chưa có mã)', '',
  '## Section VI — Invented section (Chapters 28–38)', '',
  '### 3802.90', '',
  '**1.** First invented opinion text that is long enough to count as a body.', '', '*Application of GIRs 1 and 6.*', '', '*Adoption: 2014*', '',
  'a —_ ee Section VI', '',
  '**2.** Second invented opinion of the same code, with a table:', '| a | b |', '| 1 | 2 |', '', '*Application of GIR 1.*', '', '*Adoption: 2016*', '',
  ': 3. Third invented opinion whose number was mangled by OCR and printed wrongly.', '', '*Adoption: 20l8*', '',
  '### 3808.5O', '',
  '**1.** Invented opinion under a heading with a mangled digit.', '', '*Adoption*', '',
  '### 3809.91', '',
  '**1.** Invented opinion that lost its Adoption line to the OCR, but has plenty of text to keep.', '',
  '### 3401.11', '',
  '**1.** Another invented opinion.', '', '*Application of Note 3 to Chapter 34.*', '', '*Adoption: 2001*', '',
  '## Annex — Trade marks', '### 9999.99', '**1.** annex rows must never become opinions', '*Adoption: 2000*',
].join('\n');
const pm = parseMarkdown(md);
assert('md: nhận đúng 6 ý kiến (3 + 1 + 1 mất Adoption + 1), Annex bị bỏ', pm.opinions.length === 6 && !pm.opinions.some((o) => o.hs === '999999'), pm.opinions.map((o) => o.id));
assert('md: id theo vị trí trong mã, section gắn đúng', pm.opinions.slice(0, 3).map((o) => o.id).join() === '380290/1,380290/2,380290/3' && pm.opinions[0].section === 'Section VI — Invented section');
assert('md: dòng đầu trang lọt giữa các ý kiến không dính vào ý kiến sau', !pm.opinions[1].text.includes('ee Section'));
assert('md: số in sẵn khớp thì ordInferred=false; số méo ": 3." vẫn đọc ra 3', pm.opinions[0].ordInferred === undefined && pm.opinions[2].ordPrinted === 3 && pm.opinions[2].ordInferred === undefined);
assert('md: năm Adoption sửa "20l8" → 2018; thiếu năm → null', pm.opinions[2].adoption === 2018 && pm.opinions.find((o) => o.hs === '380850').adoption === null);
assert('md: mã tiêu đề méo "3808.5O" sửa thành 380850', pm.opinions.some((o) => o.hs === '380850') && parseHeadingCode('3808.5O') === '380850' && parseHeadingCode('abc') === null);
assert('md: nhận GIR và Application; bảng giữ lại trong text', pm.opinions[0].girMentioned?.[0] === '1 and 6' && pm.opinions[1].text.includes('| 1 | 2 |') && pm.opinions[1].application === 'Application of GIR 1.');
const orphan = pm.opinions.find((o) => o.hs === '380991');
assert('md: ý kiến mất dòng Adoption vẫn được giữ, đánh dấu noAdoptionLine', orphan?.noAdoptionLine === true && orphan.adoption === null, orphan);
assert('md: đủ trường nguồn', pm.opinions.every((o) => o.source === 'ocr-md' && o.level === 6 && o.text.length > 0));

// 2g. Tiêu đề mã bị OCR làm rơi → số in sẵn quay về 1 giữa một mã: từ đó trở đi mã gán KHÔNG đáng tin
const mdLost = [
  '## Section XVI — Invented', '### 8444.30',
  '**1.** Invented opinion one under the real heading, long enough to be a body.', '*Adoption: 2001*',
  '**2.** Invented opinion two under the real heading, long enough to be a body.', '*Adoption: 2002*',
  '**1.** Invented opinion whose banner was lost by OCR (printed number restarts at one).', '*Adoption: 2003*',
  '**2.** Invented opinion that also belongs to the unnamed code.', '*Adoption: 2004*',
  '### 8445.10', '**1.** Invented opinion with a proper heading.', '*Adoption: 2005*',
].join('\n');
const pl = parseMarkdown(mdLost);
assert('md: số in sẵn quay về 1 → từ đó mã không đáng tin (headingSuspect), phần trước vẫn đáng tin', pl.opinions.map((o) => !!o.headingSuspect).join() === 'false,false,true,true,false', JSON.stringify(pl.opinions.map((o) => [o.id, o.headingSuspect])));
assert('md: đếm chỗ mất tiêu đề', pl.stats.headingRestarts === 1 && pl.opinions[2].headingRestart === true);

// 2h. Khôi phục mã bị mất tiêu đề bằng dãy mã đọc từ ẢNH dải xanh (banners)
const op = (hs, ord, printed, line) => ({ id: `${hs}/${ord}`, hs, ord, ordPrinted: printed, text: 't', line });
const seq = [op('844230', 1, 1, 10), op('844230', 2, 2, 11), op('844230', 3, 1, 12), op('844230', 4, 2, 13), op('844230', 5, 1, 14), op('844510', 1, 1, 15), op('844510', 2, 2, 16)];
markSuspect(seq);
const fixedA = alignHeadings(seq, ['844230', '846610', '846719', '844510']);
assert('banners: 2 mã bị mất → 3 đoạn gán đúng mã và vị trí', fixedA.opinions.map((o) => `${o.hs}/${o.ord}`).join() === '844230/1,844230/2,846610/1,846610/2,846719/1,844510/1,844510/2', fixedA.opinions.map((o) => o.id));
assert('banners: khôi phục xong thì bỏ cờ headingSuspect, đánh dấu headingRecovered', fixedA.opinions.every((o) => !o.headingSuspect) && fixedA.opinions[2].headingRecovered === true && fixedA.report.resolved === 1 && fixedA.report.recoveredOpinions === 3, fixedA.report);
assert('banners: dải lặp liên tiếp (trang tiếp) được gộp', alignHeadings(seq.map((o) => ({ ...o })), ['844230', '844230', '846610', '846719', '846719', '844510']).report.resolved === 1);
const fixedB = alignHeadings(seq.map((o) => ({ ...o })), ['844230', '846610', '844510']);
assert('banners: ranh giới thừa so với mã mất → chọn tổ hợp khớp số in sẵn nhất', fixedB.report.resolved === 1 || fixedB.report.unresolved.some((u) => u.why === 'nhieu-to-hop-hoa'), fixedB.report);
const fixedC = alignHeadings(seq.map((o) => ({ ...o })), ['844230', '846610', '846719', '846720', '846730', '844510']);
assert('banners: thiếu ranh giới → KHÔNG đoán, ghi chưa khôi phục', fixedC.report.unresolved[0]?.why === 'thieu-ranh-gioi' && fixedC.opinions.some((o) => o.headingSuspect), fixedC.report);
const fixedD = alignHeadings(seq.map((o) => ({ ...o })), ['844230', null, '846719', '844510']);
assert('banners: dải không đọc được → không đoán', fixedD.report.unresolved[0]?.why === 'dai-khong-doc-duoc');
const clean = [op('851762', 1, 1, 1), op('851762', 2, 2, 2), op('852351', 1, 1, 3)];
assert('banners: đoạn sạch không đổi', alignHeadings(clean, ['851762', '852351']).opinions.every((o, i) => o.hs === clean[i].hs) && alignHeadings(clean, ['851762', '852351']).report.alreadyClean === 2);

// 2i. "(continued)": ý kiến n>1 dưới tiêu đề tiếp nối → n−1 ý kiến ngay trước (dải mã trang đầu bị rơi) thuộc cùng mã
const mdCont = [
  '## Section XVI — Invented', '### 8470.50',
  '**1.** Invented opinion that really belongs to 8470.50, with enough text to count.', '*Adoption: 2001*',
  '**1.** Invented opinion whose banner was lost; it really belongs to 8471.30 (printed 1).', '*Adoption: 2002*',
  '### 8471.30 (continued)',
  '**2.** Invented second opinion of 8471.30 under the continued heading.', '*Adoption: 2003*',
  '**3.** Invented third opinion of 8471.30.', '*Adoption: 2004*',
  '### 8471.40', '**1.** Invented opinion of the next code.', '*Adoption: 2005*',
].join('\n');
const pc = parseMarkdown(mdCont);
assert('(continued): ý kiến trước tiêu đề tiếp nối được chuyển về mã đúng, vị trí tính lại', pc.opinions.map((o) => o.id).join() === '847050/1,847130/1,847130/2,847130/3,847140/1', pc.opinions.map((o) => o.id));
assert('(continued): đánh dấu headingRecovered, số in sẵn khớp vị trí, hết nghi ngờ', pc.opinions[1].headingRecovered === 'continued' && pc.opinions.every((o) => !o.headingSuspect && !o.ordInferred) && pc.stats.recoveredFromContinued.opinions === 1, pc.stats);
assert('(continued): tiêu đề "(continued)" vẫn đọc ra mã', parseHeadingCode('8471.30 (continued)') === '847130' && parseHeadingCode('8471.30 (Continued)') === '847130');
const mdNoMatch = mdCont.replace('**1.** Invented opinion whose banner was lost; it really belongs to 8471.30 (printed 1).', '**7.** Invented opinion with an unrelated printed number.');
assert('(continued): số in sẵn của ý kiến trước không khớp 1..n−1 → KHÔNG chuyển', parseMarkdown(mdNoMatch).opinions[1].hs === '847050');

// 2j. Suy luận mã cho khối mất tiêu đề: chỉ nhận khi HAI lượt độc lập cùng chọn, trong ràng buộc thứ tự HS
const mk = (line, hs, printed, extra = {}) => ({ line, hs, ord: 0, ordPrinted: printed, text: 'x', ...extra });
const opsI = [mk(1, '844230', 1), mk(2, '844230', 2), mk(3, '844230', 1, { headingSuspect: true }), mk(4, '844230', 1, { headingSuspect: true }), mk(5, '844510', 1)];
const tasksI = [{ runId: 'R01', ownCode: '844230', nextHeadingCode: '844510', candidates: [{ code: '846610' }, { code: '846719' }, { code: '847130' }], blocks: [{ block: 1, opinions: [{ line: 3 }] }, { block: 2, opinions: [{ line: 4 }] }] }];
const pass = (c1, c2, f1 = 'high', f2 = 'high') => [{ runId: 'R01', blocks: [{ block: 1, code: c1, confidence: f1 }, { block: 2, code: c2, confidence: f2 }] }];
const ai = applyInferred(opsI.map((o) => ({ ...o })), tasksI, pass('846610', '846719'), pass('846610', '846719'));
assert('suy luận: hai lượt cùng chọn → áp dụng, đánh dấu headingInferred/LLM_AGREED, hết nghi ngờ', ai.opinions.map((o) => `${o.hs}`).join() === '844230,844230,846610,846719,844510' && ai.opinions[2].headingInferred === true && ai.opinions[2].headingBasis === 'LLM_AGREED' && !ai.opinions[2].headingSuspect && ai.report.applied === 2, ai.report);
const ad = applyInferred(opsI.map((o) => ({ ...o })), tasksI, pass('846610', '846719'), pass('846610', '847130'));
assert('suy luận: hai lượt khác nhau ở một khối → khối đó giữ nghi ngờ, khối kia vẫn áp dụng', ad.opinions[2].hs === '846610' && ad.opinions[3].hs === '844230' && ad.opinions[3].headingSuspect === true && ad.report.unresolved[0].why === 'hai-luot-khac-nhau', ad.report);
const ao = applyInferred(opsI.map((o) => ({ ...o })), tasksI, pass('999999', '846719'), pass('999999', '846719'));
assert('suy luận: mã ngoài danh sách ứng viên bị loại', ao.report.rejected.some((r) => r.why === 'ma-ngoai-ung-vien') && ao.opinions[2].hs === '844230');
const aw = applyInferred(opsI.map((o) => ({ ...o })), tasksI, pass('847130', '846719'), pass('847130', '846719'));
assert('suy luận: mã không tăng nghiêm ngặt trong run bị loại cả run', aw.report.rejected.some((r) => r.why === 'khong-tang-nghiem-ngat') && aw.opinions[2].hs === '844230');
const al = applyInferred(opsI.map((o) => ({ ...o })), tasksI, pass('846610', '846719', 'low', 'high'), pass('846610', '846719', 'low', 'medium'));
assert('suy luận: chỉ cần MỘT lượt "low" là không nhận (mã đúng có thể nằm ngoài khoảng ứng viên)', al.opinions[2].hs === '844230' && al.report.unresolved[0].why === 'co-luot-low' && al.opinions[3].hs === '846719');
assert('suy luận: tính lại thứ tự theo vị trí trong mã', ai.opinions[2].ord === 1 && ai.opinions[3].ord === 1 && ai.opinions[2].id === '846610/1');

// 2k. Máy kiểm số của bản dịch: mọi con số của bản gốc phải còn trong bản dịch (dấu thập phân/nghìn đổi được)
assert('dịch: số giữ nguyên dù đổi dấu thập phân', numericParity('Dimensions 11.5 cm x 7.7 cm. Weight: 115 g', 'Kích thước 11,5 cm x 7,7 cm. Khối lượng: 115 g').ok);
assert('dịch: thiếu số bị báo', numericParity('A salt content of 1.2 % to 3 %', 'Hàm lượng muối 1,2 %').missing.join() === '3');
assert('dịch: thêm số lạ bị báo', numericParity('Weight 115 g', 'Khối lượng 115 g, 20 cái').extra.join() === '20');
assert('dịch: số thứ tự đầu dòng và năm Adoption không tính', numericParity('1. Chicken cuts\n\nAdoption: 2008', 'Thịt gà cắt miếng\n\nThông qua: 2008').ok && numberTokens('2. Foo 5 mm').join() === '5');
assert('dịch: số nghìn 1,000 = 1.000', numericParity('1,000 kg', '1.000 kg').ok);

// 3. validate
const wcoCodes = { six: new Set(['851762', '852351']), four: new Set(['2106']) };
const v = validate([
  { id: '851762/1', hs: '851762', level: 6, ord: 1, pages: [1, 1], text: 'x'.repeat(100) },
  { id: '851762/3', hs: '851762', level: 6, ord: 3, pages: [2, 2], text: 'x'.repeat(100) },
  { id: '999999/1', hs: '999999', level: 6, ord: 1, pages: [1, 1], text: 'ngắn' },
], wcoCodes);
assert('validate: mã HS lạ', v.unknownHs.join() === '999999/1');
assert('validate: nhảy thứ tự', v.ordinalGaps.join() === '851762: 1→3');
assert('validate: quá ngắn + trang lùi', v.tooShort.join() === '999999/1' && v.pageBackwards.join() === '999999/1');

// 4. lib/wco-op trên kho thử (thư mục tạm của test-isolate-data)
process.env.HS_WCO_OP_FILE = path.join(dataPath('wco-op'), 'khong-ton-tai.json'); // không phụ thuộc kho thật trên máy chạy test
wco.reset();
assert('chưa có kho → available() = false', wco.available() === false && wco.byHs('8517').length === 0);
const store = dataPath('wco-op');
fs.mkdirSync(store, { recursive: true });
process.env.HS_WCO_OP_FILE = path.join(store, 'opinions.json');
fs.writeFileSync(path.join(store, 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, pages: [1, 1], text: 'The invented prefabri-\ncated unit, which is not for sale,\nis classified in this subheading.' },
  { id: '2106/1', hs: '2106', level: 4, ord: 1, pages: [2, 2], text: 'Invented preparation of a kind used for food.' },
]));
wco.reset();
assert('có kho → available()', wco.available());
assert('get theo id', wco.get('851762/4')?.ord === 4 && wco.get('1/1') === null);
assert('byHs 4 số, 6 số, sai độ dài', wco.byHs('8517').length === 1 && wco.byHs('851762').length === 1 && wco.byHs('85').length === 0);
assert('byHs(2106) trả ý kiến nhóm 4 số', wco.byHs('2106')[0]?.id === '2106/1');
fs.writeFileSync(path.join(store, 'opinions.json'), JSON.stringify([
  { id: '844230/1', hs: '844230', level: 6, ord: 1, text: 'Invented reliable opinion.' },
  { id: '844230/2', hs: '844230', level: 6, ord: 2, headingSuspect: true, text: 'Invented opinion filed under a wrong code.' },
]));
wco.reset();
assert('ý kiến headingSuspect KHÔNG được trả bởi byHs', wco.byHs('844230').length === 1 && wco.byHs('844230')[0].id === '844230/1');
assert('incomplete(): còn ý kiến gán không đáng tin', wco.incomplete() === true);
fs.writeFileSync(path.join(store, 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, pages: [1, 1], text: 'The invented prefabri-\ncated unit, which is not for sale,\nis classified in this subheading.' },
  { id: '2106/1', hs: '2106', level: 4, ord: 1, pages: [2, 2], text: 'Invented preparation of a kind used for food.' },
]));
wco.reset();
assert('incomplete(): kho sạch → false', wco.incomplete() === false);
assert('trích đúng (kể cả gạch nối cuối dòng)', wco.quoteInOpinion('851762/4', 'invented prefabricated unit'));
assert('trích có "…" giữa các đoạn', wco.quoteInOpinion('851762/4', 'invented prefabricated unit … is classified in this subheading'));
assert('trích sai bị loại', !wco.quoteInOpinion('851762/4', 'is classified in heading 85.18'));
assert('trích vào ý kiến không có bị loại', !wco.quoteInOpinion('999999/9', 'invented'));
assert('parseSourceId', wco.parseSourceId('wco-op.851762.4')?.id === '851762/4' && wco.parseSourceId('wco-op.2106.1')?.id === '2106/1' && wco.parseSourceId('wco.851762') === null && wco.parseSourceId('wco-op.85.1') === null);

// 5. Đầu-cuối: PDF song ngữ hai cột giả → extract → parse (cần PyMuPDF; thiếu thì bỏ qua)
const hasFitz = spawnSync('python3', ['-c', 'import fitz'], { encoding: 'utf8' }).status === 0;
if (!hasFitz) {
  console.log('SKIP đầu-cuối PDF (python3 thiếu pymupdf)');
} else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wco-op-e2e-'));
  const pdf = path.join(tmp, 'fake.pdf');
  const make = `
import fitz, sys
EN = [
 ("8517.62/1  Invented device one", 1),
 ("Description of goods: the invented device is used for the testing of", 0),
 ("signals and is presented with its own cable in a retail box.", 0),
 ("The device is classified in this subheading under GIR 1 and 6.", 0),
 ("Adopted at the 51st Session (March 2013).", 0),
 ("8517.62/2  Invented device two", 1),
 ("Description of goods: the second invented device is not designed for", 0),
 ("the transmission of voice and it is therefore excluded from the", 0),
 ("heading, as the essential character is given by the other part.", 0),
 ("The goods are classified in the subheading under GIR 3 (b).", 0),
]
FR = [
 ("8517.62/1  Appareil inventé numéro un", 1),
 ("Description des marchandises : l'appareil inventé est utilisé pour", 0),
 ("les essais de signaux et il est présenté avec son câble dans une", 0),
 ("boîte de vente au détail.", 0),
 ("L'appareil est classé dans cette sous-position par la RGI 1 et 6.", 0),
 ("Adopté à la 51e session (mars 2013).", 0),
 ("8517.62/2  Appareil inventé numéro deux", 1),
 ("Description des marchandises : le deuxième appareil n'est pas conçu pour", 0),
 ("la transmission de la voix et il est donc exclu de la position, car", 0),
 ("le caractère essentiel est donné par l'autre partie des marchandises.", 0),
]
d = fitz.open()
for pg in range(8):
    p = d.new_page(width=842, height=595)
    p.insert_text((40, 30), "Compendium of Classification Opinions " + str(pg), fontsize=8)
    p.insert_text((40, 580), "Page " + str(pg + 1), fontsize=8)
    if pg == 0:
        rows = [(EN, 40), (FR, 450)]
        for col, x in rows:
            y = 80
            for t, b in col:
                p.insert_text((x, y), t, fontsize=9, fontname="hebo" if b else "helv")
                y += 22
    else:
        for k, (col, x) in enumerate([(EN, 40), (FR, 450)]):
            y = 80
            for t, b in col:
                p.insert_text((x, y), t.replace("8517.62", "8523.%02d" % (pg + 9)), fontsize=9, fontname="hebo" if b else "helv")
                y += 22
d.save(sys.argv[1])
`;
  const mk = spawnSync('python3', ['-c', make, pdf], { encoding: 'utf8' });
  assert('tạo PDF giả song ngữ', mk.status === 0 && fs.existsSync(pdf), mk.stderr);
  const ex = spawnSync('python3', [path.join(ROOT, 'scripts', 'wco-op-extract.py'), '--pdf', pdf, '--out', tmp], { encoding: 'utf8' });
  assert('extract chạy được', ex.status === 0, ex.stderr + ex.stdout);
  const rep = JSON.parse(fs.readFileSync(path.join(tmp, 'extract-report.json'), 'utf8'));
  assert('nhận ra bố cục hai cột ở cả 8 trang', rep.layouts['two-col'] === 8, JSON.stringify(rep.layouts));
  assert('đầu/chân trang lặp bị loại', rep.furnitureLines.length > 0, JSON.stringify(rep.furnitureLines));
  const pages = fs.readFileSync(path.join(tmp, 'pages-en.jsonl'), 'utf8');
  assert('chỉ còn tiếng Anh: không có chữ Pháp', !/Appareil|marchandises|classé/.test(pages) && /Invented device one/.test(pages));
  assert('báo cáo extract không chứa chữ nội dung', !/Invented device|invented/i.test(JSON.stringify(rep)));
  const pr = spawnSync('node', [path.join(ROOT, 'scripts', 'wco-op-parse.mjs'), `--in=${tmp}`, `--out=${tmp}`], { encoding: 'utf8' });
  assert('parse chạy được', pr.status === 0, pr.stderr + pr.stdout);
  const ops = JSON.parse(fs.readFileSync(path.join(tmp, 'opinions.json'), 'utf8'));
  assert('tách 16 ý kiến (2 ý kiến x 8 trang, mã tăng dần)', ops.length === 16 && ops[0].id === '851762/1' && ops[2].id === '852310/1', JSON.stringify(ops.map((o) => o.id)));
  assert('ý kiến chứa nguyên văn tiếng Anh, không chữ Pháp', /classified in this subheading/.test(ops[0].text) && !/classé/.test(ops[0].text));
  const prep = JSON.parse(fs.readFileSync(path.join(tmp, 'parse-report.json'), 'utf8'));
  assert('báo cáo parse không chứa chữ nội dung', !/invented|Invented/.test(JSON.stringify(prep)));
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
