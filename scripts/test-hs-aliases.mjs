#!/usr/bin/env node
/**
 * Khoá chặt bảng alias "tiếng dân buôn → mã HS".
 *
 * Hai rủi ro test này canh:
 *
 *  1. RIÊNG TƯ — alias đào từ tờ khai của khách. Lọt một trường brands/models/
 *     sizes/sampleDesc là lộ chi tiết đơn hàng, và dữ liệu đã ra ngoài thì không
 *     rút lại được.
 *
 *  2. LỆCH HÌNH THÁI — alias khiến máy trả lời TỰ TIN hơn. Tự tin mà sai thì tệ
 *     hơn không trả lời: người khai mang mã sai đi khai hải quan. Chốt chặn
 *     nguyên liệu/thành phẩm phải luôn còn sống.
 */
import './test-isolate-data.mjs';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { lookupAliases, aliasStats } = require(join(ROOT, 'lib', 'hs-aliases.js'));
const { searchCandidates } = require(join(ROOT, 'lib', 'search-utils.js'));

let failed = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n== Riêng tư: alias không được mang chi tiết đơn hàng ==');
{
  const raw = readFileSync(join(ROOT, 'data', 'hs-aliases.json'), 'utf8');
  for (const field of ['brands', 'models', 'sizes', 'specs', 'sampleDesc', 'origin', 'condition']) {
    check(`không có trường "${field}"`, !raw.includes(`"${field}"`));
  }
  const data = JSON.parse(raw);
  const allowed = new Set(['phrase', 'hsCode', 'count', 'share', 'exact', 'form', 'alternatives', 'formsSeen']);
  const stray = new Set();
  for (const a of data.aliases) for (const k of Object.keys(a)) if (!allowed.has(k)) stray.add(k);
  check('mỗi alias chỉ có trường đã duyệt', stray.size === 0, [...stray].join(', '));
}

console.log('\n== Chốt chặn hình thái nguyên liệu / thành phẩm ==');
{
  // Ca thật đã làm hệ thống trả lời sai: Oz có "khuôn nhựa" → 3926 (thành phẩm),
  // nhưng câu hỏi nói về THÉP TẤM (nguyên liệu, chương 72).
  const r = lookupAliases('tấm thép làm khuôn nhựa');
  check('chặn alias thành phẩm khi hỏi nguyên liệu', r.matches.length === 0);
  check('có cảnh báo lệch hình thái', r.formWarning?.code === 'FORM_MISMATCH');
  check('nêu đúng từ chỉ dạng', r.formWarning?.rawFormToken === 'tấm');
  check('nêu đúng từ chỉ vật liệu', r.formWarning?.materialWord === 'thép');

  // Không được chặn oan: bỏ dấu thì "thời" trùng "thỏi" (nguyên liệu dạng thỏi).
  const eyewear = lookupAliases('kính mắt thời trang');
  check('KHÔNG chặn oan "thời trang" (≠ "thỏi")', eyewear.matches.length > 0);
  check('"kính mắt thời trang" ra 9004', eyewear.matches[0]?.hsCode?.startsWith('9004'));

  // Chỉ có từ chỉ dạng mà thiếu từ chỉ vật liệu → không chặn.
  const mat = lookupAliases('tấm lót sàn');
  check('KHÔNG chặn "tấm lót sàn" (thiếu từ vật liệu)', mat.suppressed.length === 0);
}

console.log('\n== Alias kéo được mã "Loại khác" lên đầu ==');
{
  // Giá trị cốt lõi: tên chính thức của các mã này là "Loại khác" — không từ
  // khoá nào chạm tới. Trước khi có alias, cả bốn câu đều trả về rác.
  // Chỉ chọn cụm TẬP TRUNG (share ≥ 0.9): cụm mơ hồ thì dữ liệu vốn không
  // khẳng định được một mã, khẳng định trong test là tự dối mình.
  const cases = [
    ['kính mắt thời trang', '9004'],
    ['củ sạc điện thoại', '8504'], // Oz viết "củ sạc"; biến thể "cục sạc" chưa có — xem giới hạn ở cuối file
    ['nhang thắp hương', '3307'],
    ['xi lanh khí nén', '8412'],
    ['piston động cơ xe máy', '8409'],
  ];
  for (const [q, wantPrefix] of cases) {
    const top = searchCandidates(q, { topCandidates: 3 })[0];
    check(`"${q}" → ${wantPrefix}`, top?.hsCode?.startsWith(wantPrefix), `nhận ${top?.hsCode}`);
  }
}

console.log('\n== Cụm mơ hồ phải phơi ra lựa chọn khác, không giả vờ chắc chắn ==');
{
  // "bánh xe đẩy" thật sự mơ hồ: 8302 (bánh xe gắn đồ gỗ) và 8716 (bánh xe xe
  // đẩy tay) chia nhau gần 50/50 trong kho. Bỏ 15% dữ liệu là thứ tự lật.
  // Hệ thống phải nói ra sự mơ hồ đó thay vì chốt bừa một mã.
  const r = lookupAliases('bánh xe đẩy');
  const m = r.matches.find((x) => x.phrase === 'banh xe day');
  check('có alias "bánh xe đẩy"', Boolean(m));
  check('không gắn nhãn tin cậy cao', m?.confidence !== 'high', `nhận ${m?.confidence}`);
  check('phơi ra ứng viên thay thế', (m?.alternatives?.length || 0) > 0);
}

console.log('\n== Alias không phá luồng tra theo mã số ==');
{
  const byCode = searchCandidates('8412', { topCandidates: 3 });
  check('gõ mã số vẫn ra đúng nhóm', byCode.every((c) => c.hsCode.startsWith('8412')));
  check('gõ mã số không dính alias', byCode.every((c) => !c.aliasMatch));
}

console.log('\n== Alias phải gắn được vào biểu thuế hiện hành ==');
{
  const withAlias = searchCandidates('xi lanh khí nén', { topCandidates: 5 }).filter((c) => c.aliasMatch);
  check('có ít nhất 1 ứng viên từ alias', withAlias.length > 0);
  check('ứng viên alias có tên tiếng Việt', withAlias.every((c) => typeof c.nameVi === 'string'));
  check('ứng viên alias khai rõ tần suất', withAlias.every((c) => c.aliasMatch.declarationCount > 0));
}

console.log('\n== Thống kê ==');
{
  const s = aliasStats();
  check('bảng alias nạp được', s.ok === true);
  check('có trên 1.000 alias', s.aliases > 1000, `hiện ${s.aliases}`);
  console.log(`    ${s.aliases} alias, đào từ ${s.sourceRecords} tờ khai, dựng ${s.generatedAt}`);
}

if (failed) {
  console.error(`\n❌ ${failed} kiểm tra thất bại\n`);
  process.exit(1);
}
console.log('\n✅ hs-aliases: tất cả kiểm tra đạt\n');
