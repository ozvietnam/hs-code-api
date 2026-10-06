// Test chặn "AI tự gán động cơ" (06/10/2026 — dao hái cau cán cách điện bị xếp 8467.29).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { powerClaimGuard, hasPowerEvidence } = require('../lib/classify-guards');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

check('cán cách điện (防电/绝缘/kháng điện) KHÔNG là bằng chứng có điện', !hasPowerEvidence('加粗防电摘割槟榔刀伸缩杆 绝缘 kháng điện cách điện'));
for (const t of ['电动修枝剪 21V锂电', '角磨机 100型', '充电式电钻', 'máy khoan cầm tay Bosch', 'máy mài góc', 'Máy cưa 1800W', '吸尘器 家用', 'cordless drill', '汽油链锯']) {
  check(`có bằng chứng: ${t}`, hasPowerEvidence(t));
}
const r1 = powerClaimGuard([{ hs: '84672900', confidence: 92 }, { hs: '82019000', confidence: 60 }], '加粗防电摘割槟榔刀伸缩杆加长12米铝合金 颜色分类: 13米8节加粗加厚杆+大刀 +锯刀');
check('dao hái cau: 8467.29 không bằng chứng → 8201.90 lên đầu', r1.results[0].hs === '82019000' && r1.results[1].hs === '84672900' && r1.powerClaim?.promotedHs === '82019000', JSON.stringify(r1));
const r2 = powerClaimGuard([{ hs: '84672900', confidence: 92 }], '加粗防电摘割槟榔刀');
check('không có mã thay thế → hạ độ tin ≤55, ghi lý do', r2.results[0].hs === '84672900' && r2.results[0].confidence <= 55 && r2.powerClaim && !r2.powerClaim.promotedHs);
const r3 = powerClaimGuard([{ hs: '84672100', confidence: 90 }, { hs: '82055900', confidence: 40 }], '充电式电钻 21V');
check('máy khoan có bằng chứng → giữ 8467', r3.results[0].hs === '84672100' && !r3.powerClaim);
const r4 = powerClaimGuard([{ hs: '82019000', confidence: 80 }], 'x');
check('mã không thuộc nhóm có động cơ → không đụng', r4.results[0].hs === '82019000' && !r4.powerClaim);
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
