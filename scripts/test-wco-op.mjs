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
import { segment, validate } from './wco-op-parse.mjs';

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
assert('chưa có kho → available() = false', wco.available() === false && wco.byHs('8517').length === 0);
const store = dataPath('wco-op');
fs.mkdirSync(store, { recursive: true });
fs.writeFileSync(path.join(store, 'opinions.json'), JSON.stringify([
  { id: '851762/4', hs: '851762', level: 6, ord: 4, pages: [1, 1], text: 'The invented prefabri-\ncated unit, which is not for sale,\nis classified in this subheading.' },
  { id: '2106/1', hs: '2106', level: 4, ord: 1, pages: [2, 2], text: 'Invented preparation of a kind used for food.' },
]));
wco.reset();
assert('có kho → available()', wco.available());
assert('get theo id', wco.get('851762/4')?.ord === 4 && wco.get('1/1') === null);
assert('byHs 4 số, 6 số, sai độ dài', wco.byHs('8517').length === 1 && wco.byHs('851762').length === 1 && wco.byHs('85').length === 0);
assert('byHs(2106) trả ý kiến nhóm 4 số', wco.byHs('2106')[0]?.id === '2106/1');
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
