#!/usr/bin/env node
/** Lớp chất lượng của validate-community: tệp tiền lệ TB-TCHQ nộp từ 2026-10-05. */
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'validate-community-'));
let passed = 0;
let failed = 0;
const assert = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${extra}`}`);
  if (ok) passed += 1; else failed += 1;
};

const good = {
  hsCode: '74071040',
  description: 'Đồng tinh luyện dạng thanh, mặt cắt chữ nhật 15 x 2 mm, dùng làm thanh cái dẫn điện',
  source: { type: 'TB-TCHQ', reference: '1573/TB-TCHQ', issuedDate: '2020-03-13', url: 'https://example.vn/tb-1573' },
  attributes: { bieuThue: '2017', loaiTB: 'KET_QUA_PHAN_LOAI' },
  reasonVi: 'Thuộc nhóm 74.07 "Đồng ở dạng thanh, que và dạng hình", phân nhóm 7407.10 "- Bằng đồng tinh luyện", mã số 7407.10.40 "- - Dạng thanh và que khác". Căn cứ kết quả phân tích: đồng tinh luyện, dạng thanh đặc.',
};
const doc = (records, submittedAt = '2026-10-05') => ({
  kind: 'precedent', contributor: { name: 'HMAC' }, license: 'CC-BY-SA-4.0', submittedAt, records,
});
const run = (name, body) => {
  const f = join(dir, `${name}.json`);
  writeFileSync(f, JSON.stringify(body));
  const r = spawnSync(process.execPath, [join(root, 'scripts', 'validate-community.mjs'), f], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
};

assert('bản ghi đủ chuẩn qua', run('good', doc([good])).status === 0, run('good', doc([good])).out);
let r = run('zero', doc([{ ...good, hsCode: '00000000', description: 'Hàng hóa theo Thông báo 1672/TB-TCHQ' }]));
assert('chặn mã giả 00000000', r.status === 1 && /không phải mã thật/.test(r.out), r.out);
assert('chặn mô tả giữ chỗ', /chữ giữ chỗ/.test(r.out), r.out);
r = run('cut', doc([{ ...good, reasonVi: 'Thuộc nhóm 74.07 "Đồng ở dạng thanh, que và dạng hình", phân nhóm 7407.10 "- Bằng đồng tinh luyện", mã số 7407.10.40 (kể cả loại' }]));
assert('chặn lý do bị cắt cụt', r.status === 1 && /ngoặc mở/.test(r.out), r.out);
r = run('nohs', doc([{ ...good, reasonVi: 'Thuộc nhóm 74.07 "Đồng ở dạng thanh, que và dạng hình", phân nhóm 7407.10 "- Bằng đồng tinh luyện" theo kết quả phân tích mẫu.' }]));
assert('chặn lý do không có mã kết luận', r.status === 1 && /không chứa mã kết luận/.test(r.out), r.out);
r = run('short', doc([{ ...good, reasonVi: 'thuộc nhóm hàng hóa xác định trước mã số' }]));
assert('chặn lý do giữ chỗ', r.status === 1 && /dưới 80 ký tự/.test(r.out), r.out);
r = run('dup', doc([good, { ...good }]));
assert('không chặn trùng trong cùng tệp (merge tự bỏ)', r.status === 0, r.out);
const f1 = join(dir, 'a.json');
const f2 = join(dir, 'b.json');
writeFileSync(f1, JSON.stringify(doc([good])));
writeFileSync(f2, JSON.stringify(doc([good])));
const both = spawnSync(process.execPath, [join(root, 'scripts', 'validate-community.mjs'), f1, f2], { encoding: 'utf8' });
assert('chặn cùng bản ghi ở hai tệp', both.status === 1 && /trùng bản ghi/.test(both.stdout + both.stderr), both.stdout + both.stderr);
r = run('old', doc([{ ...good, reasonVi: 'ngắn' }], '2026-09-24'));
assert('tệp cũ (trước 05/10) không bị lớp mới chặn', r.status === 0, r.out);

// Từ 06/10: evidence.soHieu + evidence.ketLuan của chính trang đã mở.
const ev = { soHieu: 'Số: 1573/TB-TCHQ', ketLuan: 'mã số 7407.10.40 "- - Dạng thanh và que khác"' };
r = run('ev-ok', doc([{ ...good, evidence: ev }], '2026-10-06'));
assert('có evidence khớp thì qua', r.status === 0, r.out);
r = run('ev-missing', doc([good], '2026-10-06'));
assert('thiếu evidence bị chặn', r.status === 1 && /evidence\.soHieu/.test(r.out), r.out);
r = run('ev-other', doc([{ ...good, evidence: { ...ev, soHieu: 'Số: 1599/TB-TCHQ' } }], '2026-10-06'));
assert('trang là văn bản khác bị chặn', r.status === 1 && /không phải 1573/.test(r.out), r.out);
r = run('ev-code', doc([{ ...good, hsCode: '38249999', evidence: ev }], '2026-10-06'));
assert('mã không có trong câu kết luận bị chặn', r.status === 1 && /không có trong câu kết luận/.test(r.out), r.out);
r = run('ev-desc', doc([{ ...good, description: good.description + ' (- Thành phần: đồng 99' , evidence: ev }], '2026-10-06'));
assert('mô tả bị cắt bị chặn', r.status === 1 && /description có ngoặc mở/.test(r.out), r.out);

r = run('bt', doc([{ ...good, attributes: { bieuThue: '2022', loaiTB: 'KET_QUA_PHAN_LOAI' }, evidence: ev }], '2026-10-06'));
assert('biểu thuế không khớp ngày ký bị chặn', r.status === 1 && /phân loại theo biểu 2017/.test(r.out), r.out);
r = run('bt-old', doc([{ ...good, attributes: { bieuThue: '2022' } }], '2026-09-24'));
assert('biểu thuế sai bị chặn cả ở tệp cũ', r.status === 1 && /bieuThue 2022 sai/.test(r.out), r.out);
r = run('short40', doc([{ ...good, description: 'Thép cán nguội 1-3mm dạng cuộn', evidence: ev }], '2026-10-06'));
assert('mô tả dưới 40 ký tự bị chặn (từ 06/10)', r.status === 1 && /dưới 40 ký tự/.test(r.out), r.out);

r = run('pad', doc([{ ...good, description: 'Đồng tinh chế dạng dải - Đồng ở dạng thanh, que và dạng hình', evidence: ev }], '2026-10-06'));
assert('mô tả nối tên nhóm biểu thuế bị chặn', r.status === 1 && /nối thêm tên nhóm/.test(r.out), r.out);
r = run('ph2', doc([{ ...good, description: 'Hàng hóa TB 1573 theo thông báo - đồng tinh luyện dạng thanh', evidence: ev }], '2026-10-06'));
assert('chữ giữ chỗ "Hàng hóa TB … theo thông báo" bị chặn', r.status === 1 && /chữ giữ chỗ/.test(r.out), r.out);
r = run('dash-ok', doc([{ ...good, description: 'Thanh cái dẫn điện - đồng tinh luyện dạng thanh, mặt cắt chữ nhật 15 x 2 mm', evidence: ev }], '2026-10-06'));
assert('gạch nối bình thường trong mô tả vẫn qua', r.status === 0, r.out);

r = run('corp', doc([{ ...good, description: good.description + ', hãng Henningsen Nederland BV', evidence: ev }], '2026-10-06'));
assert('tên doanh nghiệp (BV/Inc/Group…) trong mô tả bị chặn', r.status === 1 && /tên doanh nghiệp/.test(r.out), r.out);
r = run('model', doc([{ ...good, description: 'Chất trợ nhuộm AG-2 dạng lỏng, thành phần chính là muối amoni bậc bốn trong nước', evidence: ev }], '2026-10-06'));
assert('mã model "AG-2" không bị coi là tên doanh nghiệp', r.status === 0, r.out);

// Trích bằng regex (PR #155): nhãn mục biểu mẫu, mã hàng nội bộ, tham chiếu dòng tờ khai, mã trong mô tả.
const bad = (name, description, re) => {
  const o = run(name, doc([{ ...good, description, evidence: ev }], '2026-10-06'));
  assert(`chặn ${name}`, o.status === 1 && re.test(o.out), o.out);
};
bad('nhãn mục', 'Thanh đồng tinh luyện mặt cắt chữ nhật dẫn điện. — g thức hóa học: Cu 99,9%', /nhãn mục/);
bad('nhãn kết quả', 'Đồng tinh luyện dạng thanh, mặt cắt chữ nhật 15 x 2 mm 5. Kết quả phân loại:', /nhãn mục/);
bad('mã nội bộ', 'IC 57#&Thanh đồng tinh luyện mặt cắt chữ nhật 15 x 2 mm dùng dẫn điện', /mã hàng nội bộ/);
bad('dòng tờ khai', 'Thanh đồng tinh luyện mặt cắt chữ nhật 15 x 2 mm dùng dẫn điện (mục 5 PLTK)', /dòng tờ khai/);
bad('mã trong mô tả', 'Thanh đồng tinh luyện mặt cắt chữ nhật 15 x 2 mm dùng dẫn điện — 74071040', /chứa mã/);
r = run('nsx', doc([{ ...good, reasonVi: 'Nhà sản xuất: Bureo-Patagonia. ' + good.reasonVi, evidence: ev }], '2026-10-06'));
assert('tên nhà sản xuất trong lý do bị chặn', r.status === 1 && /nhà sản xuất/i.test(r.out), r.out);
const g1 = join(dir, 'g1.json');
const g2 = join(dir, 'g2.json');
writeFileSync(g1, JSON.stringify(doc([{ ...good, evidence: ev }], '2026-10-06')));
writeFileSync(g2, JSON.stringify(doc([{ ...good, description: 'Thanh đồng tinh luyện mặt cắt chữ nhật dùng dẫn điện trong tủ phân phối', evidence: ev }], '2026-10-07')));
const re = spawnSync(process.execPath, [join(root, 'scripts', 'validate-community.mjs'), g1, g2], { encoding: 'utf8' });
assert('cùng người đọc lại thông báo đã nộp ở tệp khác bị chặn', re.status === 1 && /đã nộp thông báo này/.test(re.stdout + re.stderr), re.stdout + re.stderr);
const g3 = join(dir, 'g3.json');
writeFileSync(g3, JSON.stringify({ ...doc([{ ...good, description: 'Thanh đồng tinh luyện mặt cắt chữ nhật dùng dẫn điện trong tủ phân phối', evidence: ev }], '2026-10-07'), contributor: { name: 'Thợ 2' } }));
const re2 = spawnSync(process.execPath, [join(root, 'scripts', 'validate-community.mjs'), g1, g3], { encoding: 'utf8' });
assert('người khác đọc lại để làm giàu thì vẫn qua', re2.status === 0, re2.stdout + re2.stderr);

// ── Bước 12 (B-3): intl-precedent — các case "đụng lỗ hổng" hiện có ──────────────
const intlBase = (overrides = {}) => ({
  kind: 'intl-precedent',
  contributor: { name: 'zcode-cbp-crawler', github: 'ozvietnam' },
  license: 'CC-BY-SA-4.0',
  submittedAt: '2026-10-15T00:00:00Z',
  records: [{
    hsCode: '847989',
    description: 'CBP CROSS M82907: anaerobic and hypoxia workstations',
    source: { type: 'CBP-CROSS-RULING', reference: 'M82907', url: 'https://rulings.cbp.gov/ruling/M82907', issuedDate: '2006-04-24', license: 'public-domain-us-gov' },
    attributes: { instrumentType: 'RULING', country: 'US' },
    reasonVi: 'The applicable subheading will be 8479.89.98.',
    evidence: { soHieu: 'M82907', ketLuan: 'the applicable subheading will be 8479.89.98' },
    snapshotHash: 'a'.repeat(64),
    retrievedAt: '2026-10-15',
    ...overrides,
  }],
});
assert('intl OK: bản đầy đủ qua', run('intl-ok', intlBase()).status === 0, '');
assert('intl: snapshotHash sai độ dài (63 hex) bị chặn', /snapshotHash phải là sha256 hex/.test(run('intl-badhash', intlBase({ snapshotHash: 'a'.repeat(63) })).out));
assert('intl: snapshotHash chứa ký tự không phải hex bị chặn', /snapshotHash phải là sha256 hex/.test(run('intl-nonhex', intlBase({ snapshotHash: 'Z'.repeat(64) })).out));
assert('intl: source.license rỗng bị chặn', /source\.license bắt buộc/.test(run('intl-nolicense', intlBase({ source: { type: 'CBP-CROSS-RULING', reference: 'M82907', url: 'https://rulings.cbp.gov/ruling/M82907', issuedDate: '2006-04-24', license: '' } })).out));
assert('intl: source.license thiếu bị chặn', /source\.license bắt buộc/.test(run('intl-misslicense', intlBase({ source: { type: 'CBP-CROSS-RULING', reference: 'M82907', url: 'https://rulings.cbp.gov/ruling/M82907', issuedDate: '2006-04-24' } })).out));
assert('intl: source.url thiếu bị chặn', /source\.url bắt buộc/.test(run('intl-nourl', intlBase({ source: { type: 'CBP-CROSS-RULING', reference: 'M82907', license: 'public-domain-us-gov', issuedDate: '2006-04-24' } })).out));
assert('intl: verbatimText >8000 ký tự bị chặn', /verbatimText tối đa 8000/.test(run('intl-toolong', intlBase({ verbatimText: 'x'.repeat(8001) })).out));

// ── Bước 12 (B-3): intl-precedent — instrumentType TCO (ABF) ───────────────────
const tcoBase = (overrides = {}) => ({
  kind: 'intl-precedent',
  contributor: { name: 'zcode-abf-crawler', github: 'ozvietnam' },
  license: 'CC-BY-SA-4.0',
  submittedAt: '2026-10-15T00:00:00Z',
  records: [{
    hsCode: '842139',
    description: 'ABF TCO 1679759: GLOVE BOXES, laboratory — hermetically sealed enclosures with glove openings and gas purification',
    source: {
      type: 'ABF-TCO',
      reference: '1679759',
      url: 'https://www.abf.gov.au/tariff-classification-subsite/Pages/TariffConcessionOrders.aspx?ch=84',
      issuedDate: '2016-12-20',
      license: 'attribution-commonwealth-au',
    },
    attributes: { instrumentType: 'TCO', country: 'AU' },
    reasonVi: 'TCO Úc 1679759 — hộp găng tay phòng thí nghiệm kín khí có hệ lọc khí giảm ẩm/O₂; phân loại 8421.39.90; hiệu lực 01/01/2017 (quyết định 20/12/2016).',
    evidence: {
      soHieu: '1679759',
      ketLuan: 'GLOVE BOXES, laboratory, being hermetically sealed enclosures with glove openings, incorporating a gas purification system for the reduction of moisture and oxygen content (Tariff Classification 8421.39.90; operative 01/01/2017; decision 20/12/2016)',
    },
    snapshotHash: '85e2f9468534b6a244f711b2975f759a01d67529e799a45d65c9131416a8abb6',
    retrievedAt: '2026-10-15',
    ...overrides,
  }],
});
r = run('tco-ok', tcoBase());
assert('intl TCO: bản đầy đủ (ABF) qua validate', r.status === 0, r.out);
r = run('tco-no-snapshotHash', tcoBase({ snapshotHash: undefined }));
assert('intl TCO: thiếu snapshotHash bị chặn', /snapshotHash phải là sha256 hex/.test(r.out), r.out);
r = run('tco-no-license', tcoBase({ source: { type: 'ABF-TCO', reference: '1679759', url: 'https://www.abf.gov.au/tariff-classification-subsite/Pages/TariffConcessionOrders.aspx?ch=84', issuedDate: '2016-12-20' } }));
assert('intl TCO: thiếu source.license bị chặn', /source\.license bắt buộc/.test(r.out), r.out);
r = run('tco-no-ketLuan', tcoBase({ evidence: { soHieu: '1679759' } }));
assert('intl TCO: thiếu evidence.ketLuan bị chặn', /evidence\.ketLuan bắt buộc/.test(r.out), r.out);

// ── Bước 12 (B-3): mic-product — ProductPayload v2 schema nghiêm ngặt ──────────
const mpDoc = (records, submittedAt = '2026-10-15', extras = {}) => ({
  kind: 'mic-product',
  contributor: { name: 'mic-agent-2026-10', github: 'ozvietnam' },
  license: 'CC-BY-SA-4.0',
  submittedAt,
  records,
  ...extras,
});
const mpGood = {
  title: 'Classic Presbyopic Reading Glasses with Custom Color Options and Blue Light Protection',
  skuId: 'gpDYSaTAVEkZ',
  urlNguon: 'https://gpDYSaTAVEkZ.en.made-in-china.com/product/Classic-Presbyopic-Reading-Glasses-gpDYSaTAVEkZ.html',
  retrievedAt: '2026-10-15',
  hsCodeHint: '9004900009', // 10 số theo biểu TQ (MiC HS Code; brief nêu rõ TQ 10 số)
  specs: [
    { key: 'Material', value: 'PC Frame + AC Lens' },
    { key: 'Usage', value: 'Reading glasses for presbyopia' },
    { key: 'Power', value: '+1.00 ~ +3.50' },
  ],
  shop: { name: 'Wenzhou Grand', url: 'https://grand-sg.en.made-in-china.com' },
  price: { value: '0.90', currency: 'USD' },
  minOrderQty: 100,
};
r = run('mp-good', mpDoc([mpGood]));
assert('mic-product: bản đầy đủ qua (ProductPayload v2)', r.status === 0, r.out);

// Field ngoài schema → lỗi cứng (cấm gallery / description dài / imageTexts / detailImages…)
r = run('mp-gallery', mpDoc([{ ...mpGood, gallery: ['https://example.com/p1.jpg', 'https://example.com/p2.jpg'] }]));
assert('mic-product: cấm trường gallery ngoài schema', r.status === 1 && /trường ngoài schema/.test(r.out), r.out);
r = run('mp-desc-text', mpDoc([{ ...mpGood, description: 'Full marketing description dài 500 ký tự…' }]));
assert('mic-product: cấm trường description (mô tả dài)', /trường ngoài schema/.test(r.out), r.out);
r = run('mp-detail-images', mpDoc([{ ...mpGood, detailImages: [{ url: 'x', w: 1, h: 1, alt: null, index: 0 }] }]));
assert('mic-product: cấm trường detailImages (kèo theo ảnh dài)', /trường ngoài schema/.test(r.out), r.out);

// Required fields
r = run('mp-no-title', mpDoc([{ ...mpGood, title: undefined }]));
assert('mic-product: thiếu title bị chặn', /thiếu title/.test(r.out), r.out);
r = run('mp-no-sku', mpDoc([{ ...mpGood, skuId: undefined }]));
assert('mic-product: thiếu skuId bị chặn', /thiếu skuId/.test(r.out), r.out);
r = run('mp-no-url', mpDoc([{ ...mpGood, urlNguon: undefined }]));
assert('mic-product: thiếu urlNguon bị chặn', /thiếu urlNguon/.test(r.out), r.out);
r = run('mp-no-retrieved', mpDoc([{ ...mpGood, retrievedAt: undefined }]));
assert('mic-product: thiếu retrievedAt bị chặn', /thiếu retrievedAt/.test(r.out), r.out);

// Field-level validation
r = run('mp-url-bad', mpDoc([{ ...mpGood, urlNguon: 'not-a-url' }]));
assert('mic-product: urlNguon không phải http(s) bị chặn', /urlNguon phải là URL http/.test(r.out), r.out);
r = run('mp-date-bad', mpDoc([{ ...mpGood, retrievedAt: '15-10-2026' }]));
assert('mic-product: retrievedAt không ISO YYYY-MM-DD bị chặn', /retrievedAt phải ngày ISO/.test(r.out), r.out);
r = run('mp-hshint-bad', mpDoc([{ ...mpGood, hsCodeHint: '847989' }]));   // 6 số — VN style, không phải TQ 10 số
assert('mic-product: hsCodeHint 6 số (không phải TQ 10) bị chặn', /hsCodeHint phải là đúng 10 chữ số/.test(r.out), r.out);
r = run('mp-hshint-1011', mpDoc([{ ...mpGood, hsCodeHint: '90049090123' }])); // 11 số
assert('mic-product: hsCodeHint 11 số bị chặn', /hsCodeHint phải là đúng 10 chữ số/.test(r.out), r.out);
r = run('mp-specs-not-array', mpDoc([{ ...mpGood, specs: 'PC Frame' }]));
assert('mic-product: specs không phải mảng bị chặn', /specs phải là mảng/.test(r.out), r.out);
r = run('mp-moq-not-number', mpDoc([{ ...mpGood, minOrderQty: '100 cái' }]));
assert('mic-product: minOrderQty không phải số bị chặn', /minOrderQty phải là số/.test(r.out), r.out);
r = run('mp-title-short', mpDoc([{ ...mpGood, title: 'Kính' }]));
assert('mic-product: title quá ngắn bị chặn', /title quá ngắn/.test(r.out), r.out);
r = run('mp-title-long', mpDoc([{ ...mpGood, title: 'x'.repeat(250) }]));
assert('mic-product: title quá dài bị chặn', /title quá dài/.test(r.out), r.out);
r = run('mp-shop-bad', mpDoc([{ ...mpGood, shop: 'not-an-object' }]));
assert('mic-product: shop không phải object bị chặn', /shop phải là object/.test(r.out), r.out);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
