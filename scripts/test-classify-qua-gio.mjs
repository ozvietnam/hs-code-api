// OZV-713 — cửa trả lời QUA_GIO của /api/classify.
// Thực địa: "van xả máy giặt" chạy 125 s ⇒ Cloudflare cắt ở ~100 s và trả 16 byte `error code: 524` (KHÔNG phải JSON)
// ⇒ bên gọi parse JSON là ném lỗi ⇒ đếm thành "lỗi AI". Handler phải TỰ trả JSON thật trước khi Cloudflare cắt.
//  A. Lượt chạy quá trần ⇒ thân là JSON hợp lệ, trangThai QUA_GIO, 503, có ms + tranMs. Không phải chuỗi lạ.
//  B. Lượt bình thường ⇒ phản hồi Y NGUYÊN như cũ: không thêm/bớt trường nào.
//  C. Lỗi thật vẫn ra 502 "Classify failed" như cũ (cửa quá giờ không nuốt lỗi).
//  D. Trần đọc từ env HS_CLASSIFY_TRAN_MS; giá trị rác ⇒ mặc định 85000.
// Không gọi mạng, không chờ thật: lib/classify bị thay bằng hàm giả.
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
process.env.HS_API_TOKEN = 'qua-gio-test-token';
process.env.HS_ACCESS_LOG = '0';
process.env.HS_PUBLIC_LLM = 'false'; // lượt dưới đây đều mang Bearer HS_API_TOKEN

// Thay lib/classify TRƯỚC khi handler require nó.
let chayGia = async () => ({ results: [{ hs: '84818061', confidence: 70, reason: 'van' }], status: 'OK', girRulesApplied: [] });
const libClassify = require('../lib/classify.js');
libClassify.classify = (...a) => chayGia(...a);

console.error = () => {};
console.warn = () => {};

const handler = require('../api/classify.js');

// Prod luôn có socket giữ vòng lặp sống; trong test mọi hẹn giờ đều unref ⇒ node thoát giữa chừng ("unsettled
// top-level await"). Giữ một nhịp sống cho tới cuối bài.
const giuSong = setInterval(() => {}, 1000);

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${String(x).slice(0, 600)}`); } };

async function goi(body, { token = 'qua-gio-test-token' } = {}) {
  const res = {
    _s: 0, _j: null, _raw: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; }, getHeader(k) { return this.headers[k]; },
    status(c) { this._s = c; return this; },
    json(p) { this._j = p; this._raw = JSON.stringify(p); return this; },
    end(s) { if (s != null) this._raw = String(s); return this; },
  };
  await handler({ method: 'POST', url: '/api/classify', query: {}, headers: { authorization: `Bearer ${token}` }, body }, res);
  return res;
}

// ═════════ A. Lượt quá trần ⇒ JSON thật, không phải chuỗi Cloudflare ═════════
process.env.HS_CLASSIFY_TRAN_MS = '120';
let huy = null;
chayGia = () => new Promise((r) => { huy = setTimeout(() => r({ results: [], status: 'OK' }), 5000); if (huy.unref) huy.unref(); });
const t0 = Date.now();
const rA = await goi({ tenHang: 'van xả máy giặt' });
const msA = Date.now() - t0;
clearTimeout(huy);

check('A1 có trả lời (không treo tới khi bên ngoài cắt)', rA._j != null, JSON.stringify(rA._s));
check('A2 mã 503 (dịch vụ chưa kịp trả lời), KHÔNG phải 200 giả vờ xong', rA._s === 503, String(rA._s));
check('A3 thân là JSON hợp lệ — parse được, không phải "error code: 524"', (() => {
  try { return typeof JSON.parse(rA._raw) === 'object'; } catch { return false; }
})(), String(rA._raw).slice(0, 80));
check('A4 trangThai QUA_GIO', rA._j?.trangThai === 'QUA_GIO', JSON.stringify(rA._j).slice(0, 200));
check('A5 thongDiep tiếng Việt, mời thử lại', typeof rA._j?.thongDiep === 'string' && /thử lại/i.test(rA._j.thongDiep), rA._j?.thongDiep);
check('A6 có ms (số) + tranMs = trần đang áp', Number.isFinite(rA._j?.ms) && rA._j?.tranMs === 120, JSON.stringify({ ms: rA._j?.ms, tranMs: rA._j?.tranMs }));
check('A7 trả lời SỚM hơn nhiều so với lượt chạy thật (cắt ở trần, không chờ 5 s)', msA < 2000, `${msA} ms`);
check('A8 KHÔNG bịa results khi chưa chốt được mã', rA._j?.results === undefined, JSON.stringify(rA._j?.results));
check('A9 camelCase + giữ attrs của lượt (bên gọi đối chiếu được)', rA._j?.attrs?.tenHang === 'van xả máy giặt', JSON.stringify(rA._j?.attrs).slice(0, 120));

// ═════════ B. Lượt bình thường ⇒ y nguyên như cũ ═════════
const KQ_BT = { results: [{ hs: '84818061', confidence: 70, reason: 'van dùng cho máy giặt' }], status: 'OK', girRulesApplied: [], missing: [] };
chayGia = async () => KQ_BT;
process.env.HS_CLASSIFY_TRAN_MS = '85000';
const rB = await goi({ tenHang: 'van xả máy giặt' });
check('B1 mã 200 như cũ', rB._s === 200, String(rB._s));
check('B2 không có trangThai QUA_GIO', rB._j?.trangThai === undefined, JSON.stringify(rB._j).slice(0, 160));
check('B3 KHÔNG thêm trường nào ngoài shape cũ (results/status/girRulesApplied/missing + attrs + ms)', (() => {
  const them = Object.keys(rB._j).filter((k) => !Object.keys(KQ_BT).includes(k));
  return them.length === 2 && them.includes('attrs') && them.includes('ms');
})(), JSON.stringify(Object.keys(rB._j)));
check('B4 KHÔNG bớt trường nào của động cơ', Object.keys(KQ_BT).every((k) => k in rB._j), JSON.stringify(Object.keys(rB._j)));
check('B5 kết quả truyền nguyên vẹn', rB._j?.results?.[0]?.hs === '84818061' && rB._j?.status === 'OK', JSON.stringify(rB._j?.results));

// ═════════ C. Lỗi thật vẫn 502 như cũ ═════════
chayGia = async () => { throw new Error('động cơ hỏng'); };
const rC = await goi({ tenHang: 'van xả máy giặt' });
check('C1 lỗi thật ⇒ 502 Classify failed (cửa quá giờ không nuốt lỗi)', rC._s === 502 && rC._j?.error === 'Classify failed', JSON.stringify({ s: rC._s, j: rC._j }));
check('C2 lỗi thật KHÔNG bị gắn nhãn QUA_GIO', rC._j?.trangThai === undefined, JSON.stringify(rC._j));

// ═════════ D. Trần đọc từ env, giá trị rác ⇒ mặc định ═════════
chayGia = async () => KQ_BT;
for (const [v, mong] of [['', 85000], ['abc', 85000], ['0', 85000], ['-5', 85000], ['30000', 30000]]) {
  if (v === '') delete process.env.HS_CLASSIFY_TRAN_MS; else process.env.HS_CLASSIFY_TRAN_MS = v;
  chayGia = () => new Promise((r) => { const h = setTimeout(() => r(KQ_BT), 50); if (h.unref) h.unref(); });
  const r = await goi({ tenHang: 'van xả máy giặt' });
  // lượt 50 ms luôn dưới mọi trần ⇒ 200; chỉ cần xác nhận trần hợp lệ được áp (không ném, không QUA_GIO)
  check(`D HS_CLASSIFY_TRAN_MS=${JSON.stringify(v)} ⇒ trần ${mong}, lượt nhanh vẫn 200`, r._s === 200, JSON.stringify({ s: r._s, j: Object.keys(r._j || {}) }));
}
// Trần rác mà lượt chạy LÂU hơn mặc định thì mới quá giờ — kiểm bằng trần nhỏ tường minh (A đã phủ), ở đây
// chỉ chốt thêm: trần rác KHÔNG biến thành 0 (0 ⇒ mọi lượt đều quá giờ, hỏng dịch vụ).
delete process.env.HS_CLASSIFY_TRAN_MS;
chayGia = async () => KQ_BT;
const rD = await goi({ tenHang: 'van xả máy giặt' });
check('D6 không có env ⇒ lượt thường vẫn 200 (trần mặc định không phải 0)', rD._s === 200 && rD._j?.trangThai === undefined, String(rD._s));

clearInterval(giuSong);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
