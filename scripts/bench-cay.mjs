#!/usr/bin/env node
/**
 * Bench nền 20 nhóm thí điểm (#236 bước 2): gọi /api/classify THẬT, chấm đúng 4/6/8 số, trạng thái, và máy nghi
 * ANH_EM_CO_TEN_KHOP (bật đúng / bật oan). Ba rổ, nói rõ rò đáp án:
 *   holdout : mặt hàng Oz thuộc tập giữ riêng, gọi kèm X-OZ-Eval-Holdout: 1 → kho tiền lệ Oz bỏ tập này (chống rò)
 *   oz      : mặt hàng Oz KHÔNG giữ riêng → chính nó có trong kho tiền lệ (rò, chỉ là cận trên)
 *   tb      : TB-TCHQ (precedents.json) → có trong kho tiền lệ TB (rò nhẹ: engine thấy tiền lệ cùng mô tả)
 *
 *   node scripts/bench-cay.mjs [--base=https://hs-kb.uythacnhapkhau.com] [--ro=holdout,tb,oz] [--limit=N] [--dong-thoi=3]
 *                              [--nhom=8539,4011,…] [--out=data/bench/cay-20-nhom-<ngày>.json]
 * Mỗi lượt tốn tiền LLM thật — mặc định chỉ holdout + tb. Kết quả KHÔNG ghi tên hàng (chỉ mã, đúng/sai, cờ, thời gian).
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { isHeldOut } = require('../lib/holdout.js');
const rt = require('../lib/so-tay-runtime.js');

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const BASE = arg('base', 'https://hs-kb.uythacnhapkhau.com');
const RO = arg('ro', 'holdout,tb').split(',');
const LIMIT = Number(arg('limit', '0')) || 0;
const CONC = Math.max(1, Number(arg('dong-thoi', '3')) || 3);
const NHOM = arg('nhom', '8539,4011,8423,4811,8519,7315,6406,8511,8418,4012,4802,6204,8531,7019,7308,8311,9406,7321,9105,6006').split(',');
const OUT = arg('out', `data/bench/cay-20-nhom-${new Date().toISOString().slice(0, 10)}.json`);
const d = (v) => String(v || '').replace(/\D/g, '');

// ── Bộ đề ──
const items = [];
const gold = fs.readFileSync('data/oz-gold-final.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
for (const g of gold) {
  const hs = d(g.hsCode); if (!NHOM.includes(hs.slice(0, 4))) continue;
  const ro = isHeldOut(g) ? 'holdout' : 'oz';
  if (!RO.includes(ro)) continue;
  items.push({ ro, truth: hs, body: { tenHang: g.tenHang, chatLieu: g.chatLieu || undefined, congDung: g.congDung || undefined, specs: g.specs || undefined } });
}
if (RO.includes('tb')) {
  const p = require('../data/precedents.json');
  for (const [k, v] of Object.entries(p)) {
    const hs = d(k); if (hs.length !== 8 || !NHOM.includes(hs.slice(0, 4))) continue;
    for (const t of Array.isArray(v) ? v : [v]) if (t.productName) items.push({ ro: 'tb', truth: hs, body: { tenHang: String(t.productName).slice(0, 300), specs: t.technicalSpec ? String(t.technicalSpec).slice(0, 300) : undefined } });
  }
}
const list = (LIMIT ? items.slice(0, LIMIT) : items).map((it, idx) => ({ ...it, idx }));
const { taxData } = require('../lib/data.js');
console.error(`Bộ đề: ${list.length} mẫu (${RO.join('/')}) trên ${NHOM.length} nhóm → ${BASE}`);

// ── Gọi ──
async function one(it) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}/api/classify`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OZ-Eval-Holdout': '1' }, body: JSON.stringify(it.body), signal: AbortSignal.timeout(305000) });
    const text = await res.text();
    let j; try { j = JSON.parse(text); } catch { return { idx: it.idx, ro: it.ro, truth: it.truth, truthHopLe: Boolean(taxData[it.truth]), top: '', http: res.status, ms: Date.now() - t0, loi: `HTTP ${res.status} không phải JSON (${text.slice(0, 40).replace(/\s+/g, ' ')})`, dung4: false, dung6: false, dung8: false, nghiKhop: [], nghiKhopLocal: [] }; }
    const top = d(j.results?.[0]?.hs || j.results?.[0]?.hsCode || '');
    const st = j.soTay || {};
    const khop = (st.canGiaiTrinh || []).filter((x) => x.loai === 'ANH_EM_CO_TEN_KHOP').map((x) => x.hs);
    // Máy nghi tính lại tại chỗ (server có thể chưa deploy bản có máy nghi): cùng mã top + cùng mô tả.
    const khopLocal = top ? rt.anhEmKhop(top, it.body).map((x) => x.hs) : [];
    return {
      idx: it.idx, ro: it.ro, truth: it.truth, truthHopLe: Boolean(taxData[it.truth]), top, status: j.status || null, http: res.status, ms: Date.now() - t0,
      dung4: top.slice(0, 4) === it.truth.slice(0, 4), dung6: top.slice(0, 6) === it.truth.slice(0, 6), dung8: top === it.truth,
      topLaLoaiKhac: /loại khác/i.test(j.results?.[0]?.nameVi || j.results?.[0]?.tenVi || '') || Boolean(st.loaiKhac),
      nghiKhop: khop, nghiKhopLocal: khopLocal,
      // Máy nghi "bật đúng" = top sai mà anh em nghi chính là đáp án; "bật oan" = top đúng mà vẫn nghi.
      nghiDung: khopLocal.includes(it.truth) && top !== it.truth, nghiOan: khopLocal.length > 0 && top === it.truth,
      llmError: j.llmError?.code || null, engine: j.engine?.name || null,
    };
  } catch (e) {
    return { idx: it.idx, ro: it.ro, truth: it.truth, truthHopLe: Boolean(taxData[it.truth]), top: '', http: 0, ms: Date.now() - t0, loi: String(e.message || e).slice(0, 120), dung4: false, dung6: false, dung8: false, nghiKhop: [], nghiKhopLocal: [] };
  }
}
const results = []; let i = 0;
await Promise.all(Array.from({ length: CONC }, async () => { while (i < list.length) { const it = list[i++]; const r = await one(it); results.push(r); console.error(`${results.length}/${list.length} ${r.ro} ${r.truth} → ${r.top || '-'} ${r.dung8 ? '✓8' : r.dung6 ? '✓6' : r.dung4 ? '✓4' : '✗'} ${r.ms}ms${r.nghiKhopLocal?.length ? ' nghi:' + r.nghiKhopLocal.join('/') : ''}${r.loi ? ' LỖI ' + r.loi : ''}`); } }));

// ── Tổng hợp ──
const pct = (n, t) => (t ? Math.round((n / t) * 1000) / 10 : null);
const sum = (rows) => { const t = rows.length; const ok = rows.filter((r) => r.http === 200); return { mau: t, http200: ok.length, truthKhongCoTrongBieuThue: rows.filter((r) => r.truthHopLe === false).length, dung4: pct(rows.filter((r) => r.dung4).length, t), dung6: pct(rows.filter((r) => r.dung6).length, t), dung8: pct(rows.filter((r) => r.dung8).length, t), topLoaiKhac: rows.filter((r) => r.topLaLoaiKhac).length, truthLoaiKhac: rows.filter((r) => r.truthLaLoaiKhac).length, nghiBat: rows.filter((r) => r.nghiKhopLocal?.length).length, nghiDung: rows.filter((r) => r.nghiDung).length, nghiOan: rows.filter((r) => r.nghiOan).length, p50ms: ok.length ? ok.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(ok.length / 2)] : null, p95ms: ok.length ? ok.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(ok.length * 0.95)] : null, loi: rows.filter((r) => r.loi || r.llmError).length }; };
const T = require('../lib/hs-tree.js');
for (const r of results) r.truthLaLoaiKhac = Boolean(T.nodeOf(r.truth)?.loaiKhac);
const byRo = {}; for (const ro of RO) byRo[ro] = sum(results.filter((r) => r.ro === ro));
const byNhom = {}; for (const h of NHOM) { const rows = results.filter((r) => r.truth.startsWith(h)); if (rows.length) byNhom[h] = sum(rows); }
const report = { ngay: new Date().toISOString(), base: BASE, nhom: NHOM, ro: RO, header: 'X-OZ-Eval-Holdout: 1', ghiChu: 'holdout = chống rò (kho Oz bỏ tập giữ riêng trong lượt); oz = chính nó có trong kho (cận trên); tb = TB-TCHQ có trong kho tiền lệ TB. Máy nghi tính tại chỗ (nghiKhopLocal) từ mã top + mô tả, không phụ thuộc server đã deploy máy nghi hay chưa. Không ghi tên hàng.', tong: sum(results), theoRo: byRo, theoNhom: byNhom, ketQua: results };
fs.mkdirSync('data/bench', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`\n== Bench nền 20 nhóm — ${results.length} mẫu — ${BASE}`);
console.log('| Rổ | Mẫu | Đúng 4 | Đúng 6 | Đúng 8 | Top là LK | Đáp án là LK | Máy nghi bật | bật đúng | bật oan | p50 ms | p95 ms | lỗi |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [ro, s] of [...Object.entries(byRo), ['TỔNG', report.tong]]) console.log(`| ${ro} | ${s.mau} | ${s.dung4}% | ${s.dung6}% | ${s.dung8}% | ${s.topLoaiKhac} | ${s.truthLoaiKhac} | ${s.nghiBat} | ${s.nghiDung} | ${s.nghiOan} | ${s.p50ms} | ${s.p95ms} | ${s.loi} |`);
console.log(`\nGhi: ${OUT}`);
