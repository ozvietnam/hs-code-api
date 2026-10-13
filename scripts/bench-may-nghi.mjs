#!/usr/bin/env node
/**
 * Chấm máy nghi ANH_EM_CO_TEN_KHOP ngoại tuyến, KHÔNG gọi LLM (#236 bước 2, luật 7b "đo tỉ lệ báo oan").
 * Bộ đề: mặt hàng Oz (oz-gold) + TB-TCHQ (precedents.json) trong 20 nhóm thí điểm (hoặc --nhom=…).
 *   - Báo OAN: đáp án thật là dòng "Loại khác" trần → giả định máy đã chọn ĐÚNG mã đó; máy nghi bật = oan.
 *   - Bật ĐÚNG: đáp án thật là dòng có tên → giả định máy chọn NHẦM sang dòng "Loại khác" trần cùng cha;
 *     máy nghi bật và trỏ đúng đáp án = đúng; bật mà trỏ dòng khác = nghi lệch.
 * In tỉ lệ + vài ca oan để soi. Không ghi tên hàng ra tệp.
 *   node scripts/bench-may-nghi.mjs [--nhom=8539,…] [--all] [--kiem]   # --kiem: thoát 1 nếu oan > 10 % (chạy trong npm test)
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');
const rt = require('../lib/so-tay-runtime.js');
const { taxData } = require('../lib/data.js');

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const ALL = process.argv.includes('--all');
const NHOM = ALL ? null : arg('nhom', '8539,4011,8423,4811,8519,7315,6406,8511,8418,4012,4802,6204,8531,7019,7308,8311,9406,7321,9105,6006').split(',');
const d = (v) => String(v || '').replace(/\D/g, '');
const inScope = (hs) => hs.length === 8 && taxData[hs] && (!NHOM || NHOM.includes(hs.slice(0, 4)));

const items = [];
for (const l of fs.readFileSync('data/oz-gold-final.jsonl', 'utf8').trim().split('\n')) {
  const g = JSON.parse(l); const hs = d(g.hsCode); if (!inScope(hs)) continue;
  items.push({ ro: 'oz', truth: hs, sp: { tenHang: g.tenHang, chatLieu: g.chatLieu || undefined, congDung: g.congDung || undefined, specs: g.specs || undefined } });
}
for (const [k, v] of Object.entries(require('../data/precedents.json'))) {
  const hs = d(k); if (!inScope(hs)) continue;
  for (const t of Array.isArray(v) ? v : [v]) if (t.productName) items.push({ ro: 'tb', truth: hs, sp: { tenHang: String(t.productName).slice(0, 300), specs: t.technicalSpec ? String(t.technicalSpec).slice(0, 300) : undefined } });
}

/** Dòng "Loại khác" trần cùng cha với mã (để giả định máy chọn nhầm). */
function bareLkSibling(hs) {
  const n = T.nodeOf(hs); if (!n || !n.parent) return null;
  const sib = T.siblingsOf(hs).find((s) => s.cap === 8 && s.loaiKhacTran);
  return sib ? sib.id : null;
}

const out = { oan: { mau: 0, bat: 0, viDu: [] }, dung: { mau: 0, bat: 0, batDung: 0, batLech: 0, viDu: [] } };
for (const it of items) {
  const n = T.nodeOf(it.truth); if (!n) continue;
  if (n.loaiKhacTran) {
    out.oan.mau++;
    const k = rt.anhEmKhop(it.truth, it.sp);
    if (k.length) { out.oan.bat++; if (out.oan.viDu.length < 15) out.oan.viDu.push({ ro: it.ro, truth: it.truth, nghi: k.map((x) => `${x.hs} «${(x.tenVi || '').slice(0, 45)}» ${x.doKhop}`), ten: String(it.sp.tenHang).slice(0, 70) }); }
  } else {
    const lk = bareLkSibling(it.truth); if (!lk) continue;
    out.dung.mau++;
    const k = rt.anhEmKhop(lk, it.sp);
    if (k.length) { out.dung.bat++; if (k.some((x) => x.hs === it.truth)) out.dung.batDung++; else { out.dung.batLech++; if (out.dung.viDu.length < 8) out.dung.viDu.push({ ro: it.ro, truth: it.truth, gia: lk, nghi: k.map((x) => `${x.hs} ${x.doKhop}`), ten: String(it.sp.tenHang).slice(0, 70) }); } }
  }
}
const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '-');
console.log(`Bộ đề: ${items.length} mẫu (${NHOM ? NHOM.length + ' nhóm' : 'toàn biểu thuế'})`);
console.log(`BÁO OAN — đáp án là "Loại khác" trần, máy đã đúng: ${out.oan.mau} mẫu, máy nghi bật ${out.oan.bat} (${pct(out.oan.bat, out.oan.mau)} oan)`);
for (const v of out.oan.viDu) console.log(`   oan ${v.ro} ${v.truth} «${v.ten}» → ${v.nghi.join(' ; ')}`);
console.log(`BẬT ĐÚNG — đáp án là dòng có tên, giả định máy chọn nhầm "Loại khác" cùng cha: ${out.dung.mau} mẫu, bật ${out.dung.bat} (${pct(out.dung.bat, out.dung.mau)}), trong đó trỏ đúng đáp án ${out.dung.batDung} (${pct(out.dung.batDung, out.dung.mau)}), trỏ lệch ${out.dung.batLech}`);
for (const v of out.dung.viDu) console.log(`   lệch ${v.ro} truth=${v.truth} giả=${v.gia} «${v.ten}» → ${v.nghi.join(' ; ')}`);
if (process.argv.includes('--kiem')) {
  const oan = out.oan.mau ? out.oan.bat / out.oan.mau : 0;
  const ok = oan <= 0.10 && out.dung.batLech === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} máy nghi: oan ${pct(out.oan.bat, out.oan.mau)} (ngưỡng ≤ 10 %), trỏ lệch ${out.dung.batLech} (ngưỡng 0)`);
  process.exit(ok ? 0 : 1);
}
