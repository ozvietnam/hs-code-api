// OZV-2253 — ngắt mạch timeout NGHỈ LŨY TIẾN theo số lần mở (lib/llm-tier.js).
// Không gọi mạng: tác động thẳng bộ đếm qua API đã xuất, đồng hồ giả lập để không chờ thật.
// Bối cảnh: MiniMax bước understand chậm luân phiên từng mở mạch 4 lần/30 phút — hết nghỉ phẳng 300 s
// là được thử lại với timeout đầy đủ (~85 s ngân sách lượt) nên cứ 7,5 phút đốt trọn một lượt khách.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
for (const k of ['LLM_NGAT_MACH_LOI_LIEN_TIEP', 'LLM_NGAT_MACH_NGHI_MS', 'LLM_NGAT_MACH_NGHI_TRAN_MS']) delete process.env[k];

const tier = require('../lib/llm-tier.js');
const { ngatMach, clock } = tier._internal;

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const warnings = [];
console.warn = (...a) => { warnings.push(a.join(' ')); };

// Đồng hồ giả: bắt đầu T0, đẩy tới khi muốn.
let now = Date.parse('2026-11-25T07:00:00Z');
clock.now = () => now;
const nghiToiCua = () => {
  const s = tier.ngatMachTrangThai();
  return s.length === 1 ? Date.parse(s[0].nghiToi) : null;
};
const moMach = (soTimeout) => { for (let i = 0; i < soTimeout; i += 1) tier.ngatMachGhiTimeout('minimax', 'understand'); };

// ── 1. Lần mở ĐẦU nghỉ phẳng base 300 s (không đổi hành vi cũ) ──
ngatMach.clear(); warnings.length = 0;
moMach(2);
check('1. hai timeout liên tiếp → mở mạch, nghỉ đúng 300 s (phẳng như cũ)', nghiToiCua() === now + 300000, String(nghiToiCua() - now));
check('1b. log một dòng, ghi rõ lần mở 1', /ngắt mạch MỞ: minimax bước understand.*lần mở 1.*nghỉ 300 s/.test(warnings[0] || ''), warnings[0] || '(không có log)');
check('1c. đang mở → bỏ qua provider cho bước này', tier.ngatMachDangMo('minimax', 'understand') === true);

// ── 2. Hết nghỉ, thử lại vẫn timeout → mở lại lần 2 → nghỉ 600 s ──
now += 300001;
moMach(1);
check('2. mở lại (không cần đủ ngưỡng) → nghỉ 600 s (300 × 2¹)', nghiToiCua() === now + 600000, String(nghiToiCua() - now));

// ── 3. Tiếp tục nâu: mở lần 3 → 1200 s, lần 4 → 1800 s (chạm trần 30 phút) ──
now += 600001;
moMach(1);
check('3. lần mở 3 → nghỉ 1200 s', nghiToiCua() === now + 1200000, String(nghiToiCua() - now));
now += 1200001;
moMach(1);
check('3b. lần mở 4 → kẹp trần 1800 s (không 2400 s)', nghiToiCua() === now + 1800000, String(nghiToiCua() - now));
now += 1800001;
moMach(1);
check('3c. lần mở 5 → vẫn trần 1800 s', nghiToiCua() === now + 1800000, String(nghiToiCua() - now));

// ── 4. Trong thời gian nghỉ, bước KHÁC của cùng provider không bị chặn (ngắt mạch theo bước) ──
check('4. mạch understand mở nhưng bước gir không bị chặn', tier.ngatMachDangMo('minimax', 'gir') === false);

// ── 5. Thành công → xoá bộ đếm → lần mở kế tiếp tính lại từ 300 s ──
tier.ngatMachGhiThanhCong('minimax', 'understand');
check('5a. thành công → mạch đóng, health rỗng', tier.ngatMachTrangThai().length === 0 && tier.ngatMachDangMo('minimax', 'understand') === false);
moMach(2);
check('5b. mở lại sau thành công → nghỉ 300 s (tính lại từ đầu)', nghiToiCua() === now + 300000, String(nghiToiCua() - now));

// ── 6. Env LLM_NGAT_MACH_NGHI_MS vẫn thắng base; trần SÁT base làm tắt lũy tiến, không rút ngắn ──
ngatMach.clear();
process.env.LLM_NGAT_MACH_NGHI_MS = '60000';
moMach(2);
check('6a. env base 60 s → lần mở đầu nghỉ 60 s', nghiToiCua() === now + 60000, String(nghiToiCua() - now));
delete process.env.LLM_NGAT_MACH_NGHI_MS;
process.env.LLM_NGAT_MACH_NGHI_TRAN_MS = '90000';
now += 60001;
moMach(1);
check('6b. trần env 90 s < base 300 s → bị bỏ qua: mọi lần mở nghỉ base 300 s (không rút ngắn hơn hành vi cũ)', nghiToiCua() === now + 300000, String(nghiToiCua() - now));
delete process.env.LLM_NGAT_MACH_NGHI_TRAN_MS;

// ── 7. Tương thích test cũ #425: mở → hết nghỉ → thử lại THÀNH CÔNG → đóng ──
ngatMach.clear();
moMach(2);
now += 300001;
tier.ngatMachGhiThanhCong('minimax', 'understand');
check('7. hết nghỉ 300 s + thành công → đóng mạch (kịch bản test #425 cũ vẫn chạy)', tier.ngatMachTrangThai().length === 0);

ngatMach.clear();
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
