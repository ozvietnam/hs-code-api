#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2385 — đối chiếu 3 cụm câu khách dừng 100% ở 6 số.
 *
 * Cụm 1–2 «vòng đeo tay nhận diện 254x32 / 206x32»: động cơ earlyExitHoi ở
 * 392690 trong khi giả thuyết còn 8523; sổ tay cũ hỏi van/điều khiển hoặc nhánh
 * vệ sinh–an toàn–công nghiệp, bỏ câu hỏi chip của trade-synonyms. Vá sổ tay
 * 3926: (1) phanBiet vòng đeo tay nhận diện ↔ 85235910; (2) bỏ fact
 * cachDieuKhien ở 39269020 trong so-tay + data/ho-so/ranh-gioi/392690.json (nguồn câu «Van/thiết bị được điều khiển…»).
 *
 * Cụm 3 «quạt giải nhiệt máy biến áp»: dừng 841459 là đúng luật (chia lưới bảo
 * vệ / chuyên dùng) — chỉ kiểm anh em 8 số trong biểu, không sửa sổ 8414 ở
 * lượt này.
 *
 * Không gọi mạng/LLM.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

process.env.HS_HOI_THEO_SO_TAY = 'on';
const hoi = require(join(ROOT, 'lib/hoi-theo-so-tay.js'));
const { lookupTradeTerms } = require(join(ROOT, 'lib/trade-synonyms.js'));
const tax = JSON.parse(readFileSync(join(ROOT, 'data/tax.json'), 'utf8'));

let pass = 0; let fail = 0;
const check = (n, c, d) => {
  if (c) { pass += 1; console.log(`  ✓ ${n}`); }
  else { fail += 1; console.log(`  ✗ ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 400)); }
};

const anhEm = (prefix6) => Object.keys(tax).filter((h) => h.startsWith(prefix6)).sort();

function cauHoiTuSoTay(tenHang, hs6, hypotheses) {
  const out = {
    status: 'NEED_FACTS',
    results: [{ hs: hs6 }],
    dossier: {
      hypotheses,
      alternatives: [],
      product: {},
      conditions: [],
    },
    nextAction: { type: 'ASK_USER', questions: [{ questionVi: 'LLM cũ — phải bị thay' }] },
    missing: ['x'],
  };
  return hoi.apDung(out, { rawAttrs: { tenHang } });
}

console.log('1. Anh em 8 số trong biểu (ranh giới dừng 6 số)');
const ae392690 = anhEm('392690');
const ae841459 = anhEm('841459');
check('392690 có ≥ 10 dòng 8 số', ae392690.length >= 10, ae392690);
check('39269099 nằm trong anh em', ae392690.includes('39269099'), ae392690);
check('841459 có ≥ 6 dòng 8 số', ae841459.length >= 6, ae841459);
check('841459 có nhánh lưới bảo vệ + loại khác', ae841459.includes('84145941') && ae841459.includes('84145949'), ae841459);

console.log('2. Từ điển «vòng đeo tay nhận diện» — hỏi chip, không chốt sớm');
for (const q of ['vòng đeo tay nhận diện 254x32', 'vòng đeo tay nhận diện 206x32']) {
  const t = lookupTradeTerms(q);
  const m = t.matches.find((x) => x.entryId === 'vong-deo-tay-nhan-dien-chua-ro-chip');
  check(`«${q}» khớp mục chưa-rõ-chip`, !!m, t.matches.map((x) => x.entryId));
  check(`«${q}» askVi hỏi chip`, m && /chip|RFID|NFC/i.test((m.askVi || [])[0] || ''), m && m.askVi);
  check(`«${q}» không chốt sớm`, m && m.chotSom === false, m && m.chotSom);
}

console.log('3. Sổ tay — sau vá: có PHAN_BIET (loaiTru 8523→3926), không hỏi van/điều khiển');
const hypoVong = [
  { heading4: '3926', subheading6: '392690', why: 'nhựa' },
  { heading4: '8523', subheading6: '852359', why: 'tag' },
];
for (const q of ['vòng đeo tay nhận diện 254x32', 'vòng đeo tay nhận diện 206x32']) {
  const r = cauHoiTuSoTay(q, '392690', hypoVong);
  const qs = (r.nextAction?.questions || []).map((x) => x.questionVi || '');
  const blob = qs.join('\n');
  check(`«${q}» canCu so-tay`, r.nextAction?.canCuCauHoi === 'so-tay', r.nextAction?.canCuCauHoi);
  check(`«${q}» có PHAN_BIET vòng đeo / 8523`, qs.some((t) => /vòng đeo tay nhận diện/i.test(t) && /85\.23|8523|thẻ|tag/i.test(t)), qs.slice(0, 3));
  check(`«${q}» neuCo/neuKhong là nhóm 4 số (không tách nhầm 90.99/59.10)`, qs.some((t) => /vòng đeo tay nhận diện/i.test(t) && /39\.26/.test(t) && /85\.23/.test(t) && !/90\.99|59\.10/.test(t)), qs.slice(0, 1));
  check(`«${q}» KHÔNG hỏi van/điều khiển lạc đề`, !/van\s*\/\s*thiết bị được điều khiển|điều khiển thế nào/i.test(blob), qs);
}

console.log('4. Quạt giải nhiệt — anh em 841459 chia lưới/chuyên dùng (đúng luật dừng 6 số)');
check(
  '84145910 là quạt làm mát bộ xử lý/viễn thông (không phải máy biến áp)',
  /vi xử lý|viễn thông|xử lý dữ liệu/i.test(tax['84145910']?.vn || ''),
  tax['84145910']?.vn,
);
check(
  '84145941/49 hoặc 84145991/99 chia có/không lưới bảo vệ',
  /lưới bảo vệ/i.test(tax['84145941']?.vn || '') && /Loại khác/i.test(tax['84145949']?.vn || ''),
  { a: tax['84145941']?.vn, b: tax['84145949']?.vn },
);

console.log(`\n${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
