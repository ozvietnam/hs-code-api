#!/usr/bin/env node
/**
 * Đo phần đóng góp THẬT của lớp alias, trên tập giữ riêng.
 *
 * VÌ SAO CẦN SCRIPT RIÊNG:
 * scripts/accuracy-benchmark.mjs lấy mẫu từ data/oz-declarations.jsonl — cùng
 * kho mà alias đào ra. Chấm bằng nó sau khi có alias là chấm bài mình đã học
 * thuộc đề: điểm cao nhưng vô nghĩa.
 *
 * Script này chỉ chấm trên các bản ghi ĐÃ BỊ LOẠI khỏi alias (xem
 * scripts/build-hs-aliases.mjs, tham số --holdout). Alias chưa từng nhìn thấy
 * chúng, nên con số ra là con số thật.
 *
 * Chạy hai lượt trên cùng tập đó — bật và tắt alias — rồi so. Chênh lệch chính
 * là phần alias đóng góp.
 *
 * Chạy: npm run bench:aliases
 *       node scripts/benchmark-alias-holdout.mjs --limit=300
 */
import './test-isolate-data.mjs';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { isHeldOut } from './build-hs-aliases.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GOLD = join(ROOT, 'data', 'oz-gold-final.jsonl');

const argv = process.argv.slice(2);
const numArg = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const limit = numArg('limit', 0); // 0 = chấm toàn bộ tập giữ riêng
const writeOut = argv.includes('--write');
// --gate: so với mốc đã commit (data/alias-benchmark-latest.json), đỏ khi tụt
// quá GATE_TOLERANCE điểm % ở top-1/top-3 mức 4 và 8 số. Dùng trong CI.
const gate = argv.includes('--gate');
const GATE_TOLERANCE = numArg('tolerance', 1.0);

if (!existsSync(GOLD)) {
  console.error('Không thấy data/oz-gold-final.jsonl — không chấm được.');
  process.exit(1);
}

const aliasMeta = require(join(ROOT, 'data', 'hs-aliases.json')).meta;
const holdout = aliasMeta?.holdout;
if (!holdout || !holdout.excludedRecords) {
  console.error(
    'data/hs-aliases.json không có tập giữ riêng. Dựng lại bằng:\n' +
      '  npm run data:build-aliases'
  );
  process.exit(1);
}

const all = readFileSync(GOLD, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
let testSet = all.filter((g) => isHeldOut(g, holdout.ratio, holdout.seed));
if (limit > 0) testSet = testSet.slice(0, limit);

/** Đề thi là mô tả tờ khai thật; đáp án là mã đã thông quan. */
const items = testSet
  .map((g) => ({ desc: String(g.sampleDesc || '').trim(), truth: String(g.hsCode).replace(/\D/g, '') }))
  .filter((it) => it.desc.length >= 20 && it.truth.length === 8);

const DEPTHS = [2, 4, 6, 8];

/**
 * Chấm một lượt. Phải nạp lại module trong tiến trình con vì lib/hs-aliases.js
 * đọc biến môi trường một lần lúc gọi — nhưng searchCandidates gọi lookupAliases
 * mỗi lần, nên đổi env giữa chừng là đủ.
 */
function runPass(label) {
  delete require.cache[require.resolve(join(ROOT, 'lib', 'search-utils.js'))];
  const { searchCandidates } = require(join(ROOT, 'lib', 'search-utils.js'));

  const hit = { top1: {}, top3: {} };
  for (const d of DEPTHS) {
    hit.top1[d] = 0;
    hit.top3[d] = 0;
  }
  let noCandidate = 0;

  for (const it of items) {
    const cands = searchCandidates(it.desc, { topCandidates: 3 });
    if (!cands.length) noCandidate++;
    for (const d of DEPTHS) {
      const want = it.truth.slice(0, d);
      if (cands[0]?.hsCode?.slice(0, d) === want) hit.top1[d]++;
      if (cands.slice(0, 3).some((c) => c.hsCode.slice(0, d) === want)) hit.top3[d]++;
    }
  }

  const pct = (n) => Math.round((n / items.length) * 1000) / 10;
  return {
    label,
    samples: items.length,
    noCandidate,
    top1: Object.fromEntries(DEPTHS.map((d) => [d, pct(hit.top1[d])])),
    top3: Object.fromEntries(DEPTHS.map((d) => [d, pct(hit.top3[d])])),
  };
}

console.log('\n=== Benchmark alias trên TẬP GIỮ RIÊNG ===');
console.log(`Tập chấm : ${items.length} tờ khai (alias CHƯA từng thấy)`);
console.log(`Tách tập : ${(holdout.ratio * 100).toFixed(0)}%, seed ${holdout.seed}`);
console.log(`Alias    : đào từ ${aliasMeta.sourceRecords} bản ghi còn lại\n`);

process.env.HS_ALIAS_SEARCH = 'off';
const before = runPass('KHÔNG alias (nền)');
process.env.HS_ALIAS_SEARCH = 'on';
const after = runPass('CÓ alias');

const LABEL = { 2: 'Đúng chương (2 số)', 4: 'Đúng nhóm  (4 số)', 6: 'Đúng phân nhóm (6 số)', 8: 'Đúng đủ mã (8 số)' };

function table(key, title) {
  console.log(`--- ${title} ---`);
  console.log('  Mức độ                 nền      có alias   chênh');
  for (const d of DEPTHS) {
    const b = before[key][d];
    const a = after[key][d];
    const diff = Math.round((a - b) * 10) / 10;
    const sign = diff > 0 ? '+' : '';
    const flag = diff < 0 ? '  ⚠ GIẢM' : '';
    console.log(
      `  ${LABEL[d].padEnd(22)} ${String(b).padStart(5)}%  ${String(a).padStart(7)}%  ${(sign + diff).padStart(7)}${flag}`
    );
  }
  console.log('');
}

table('top1', 'Top-1 (ứng viên đầu tiên)');
table('top3', 'Top-3 (có trong 3 ứng viên đầu)');

console.log(`Không ra ứng viên nào: nền ${before.noCandidate} → có alias ${after.noCandidate}`);

const regressed = DEPTHS.filter((d) => after.top1[d] < before.top1[d]);
if (regressed.length) {
  console.log(`\n⚠ Alias làm GIẢM top-1 ở mức: ${regressed.map((d) => `${d} số`).join(', ')}`);
} else {
  console.log('\n✓ Alias không làm giảm top-1 ở bất kỳ mức nào.');
}

if (gate) {
  const basePath = join(ROOT, 'data', 'alias-benchmark-latest.json');
  const base = existsSync(basePath) ? JSON.parse(readFileSync(basePath, 'utf8')).withAliases : null;
  if (!base) {
    console.log('\n[gate] Không có mốc alias-benchmark-latest.json — bỏ qua.');
  } else {
    const drops = [];
    for (const key of ['top1', 'top3']) {
      for (const d of [4, 8]) {
        const was = base[key]?.[d];
        const now = after[key][d];
        if (was != null && now < was - GATE_TOLERANCE) drops.push(`${key} ${d} số: ${was}% → ${now}%`);
      }
    }
    if (drops.length) {
      console.log(`\n✗ [gate] Độ chính xác tụt quá ${GATE_TOLERANCE} điểm % so với mốc:`);
      for (const x of drops) console.log(`   ${x}`);
      console.log('   Sửa lỗi, hoặc nếu thay đổi là có chủ đích: chạy --write và commit mốc mới kèm giải thích.');
      process.exitCode = 1;
    } else {
      console.log(`\n✓ [gate] Không tụt quá ${GATE_TOLERANCE} điểm % so với mốc.`);
    }
  }
}

if (writeOut) {
  const out = join(ROOT, 'data', 'alias-benchmark-latest.json');
  writeFileSync(
    out,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        method:
          'Chấm trên tập giữ riêng: các bản ghi bị loại khỏi quá trình đào alias. ' +
          'Alias chưa từng thấy chúng nên không có chuyện học thuộc đề.',
        holdout,
        samples: items.length,
        baseline: { top1: before.top1, top3: before.top3 },
        withAliases: { top1: after.top1, top3: after.top3 },
      },
      null,
      2
    ) + '\n'
  );
  console.log(`\nĐã ghi ${out}`);
}
console.log('');
