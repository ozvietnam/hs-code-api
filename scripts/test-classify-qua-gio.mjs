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

// Cache (nhóm G): thay lib/classify-cache bằng bộ nhớ trong — không đụng Postgres. Phải patch TRƯỚC khi
// api/classify.js require (nó destructure lúc nạp).
process.env.HS_SERVICE_TOKENS = 'cong-oz-test:khoa-dich-vu-test'; // định dạng "tên:khoá" (lib/auth.js) ⇒ serviceCaller !== null
const kho = new Map();
const demGhi = { n: 0 };
const libCache = require('../lib/classify-cache.js');
libCache.cacheBat = () => true;
libCache.phienBanDuLieu = () => 'pb-test';
libCache.khoaCache = (attrs) => `k:${attrs.tenHang}`;
libCache.docCache = async (k) => kho.get(k) || null;
libCache.ghiCache = (k, pb, kq) => { demGhi.n += 1; kho.set(k, kq); };
libCache.donPhienBanCu = () => {};

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

// ═════════ E. Event loop BỊ CHẶN ĐỒNG BỘ vắt qua trần ═════════
// GIỚI HẠN ĐÃ BIẾT, ghi thành test để đừng ai hiểu nhầm cửa này là "cắt thật" (OZV-756):
// việc đồng bộ của chính tiến trình thì KHÔNG cắt được — lượt vẫn trả muộn đúng bằng lúc CPU nhả
// (E1t dưới đây khẳng định bằng số). Cái cửa bảo đảm là: khi đã quá hạn thì bên gọi nhận JSON thật
// (503 QUA_GIO) thay vì chuỗi `error code: 524` của Cloudflare — đúng mục đích gốc OZV-713.
process.env.HS_CLASSIFY_TRAN_MS = '200';
chayGia = async () => { const het = Date.now() + 900; while (Date.now() < het); return KQ_BT; }; // chặn CPU 900 ms > trần 200 ms
const tE = Date.now();
const rE = await goi({ tenHang: 'xi măng portland' });
const msE = Date.now() - tE;
check('E1 chặn CPU vắt qua trần ⇒ 503 QUA_GIO (bên gọi nhận JSON thật, không phải "error code: 524")', rE._s === 503, JSON.stringify({ s: rE._s, msE, keys: Object.keys(rE._j || {}) }));
check('E2 trangThai QUA_GIO', rE._j?.trangThai === 'QUA_GIO', JSON.stringify(rE._j).slice(0, 200));
check('E3 ms báo đúng là đã vượt trần', Number.isFinite(rE._j?.ms) && rE._j.ms >= 200, JSON.stringify({ ms: rE._j?.ms, tranMs: rE._j?.tranMs }));
check('E4 KHÔNG trả results của lượt quá hạn (bên gọi đã bỏ cuộc, mã này không được dùng)', rE._j?.results === undefined, JSON.stringify(rE._j?.results));
// E1t — KHẲNG ĐỊNH THỜI GIAN, ghi thẳng giới hạn vào test (OZV-756): cửa KHÔNG rút ngắn được lượt chặn CPU.
// Việc đồng bộ 900 ms vẫn chạy hết mới nhả; cửa chỉ đổi cái bên gọi nhận được thành JSON thật. Ai muốn
// "cắt thật" phải làm ở tầng ngoài (proxy / tiến trình khác) — đừng vá tiếp ở đây rồi tưởng đã cắt.
check('E1t thời gian trả lời VẪN ≈ lúc CPU nhả (≥ 900 ms), KHÔNG cắt ở trần 200 ms — giới hạn đã biết', msE >= 900, `${msE} ms`);

// E5: chặn CPU NGẮN hơn trần ⇒ vẫn 200 như cũ (không bắt oan lượt chậm hợp lệ).
process.env.HS_CLASSIFY_TRAN_MS = '3000';
chayGia = async () => { const het = Date.now() + 300; while (Date.now() < het); return KQ_BT; };
const rE5 = await goi({ tenHang: 'xi măng portland' });
check('E5 chặn CPU DƯỚI trần ⇒ vẫn 200, kết quả nguyên vẹn (không bắt oan)', rE5._s === 200 && rE5._j?.results?.[0]?.hs === '84818061', JSON.stringify({ s: rE5._s, r: rE5._j?.results }));

// E6: thời gian còn lại <= 0 (lượt đã tiêu hết trần ở bước trước) ⇒ QUA_GIO ngay, KHÔNG đặt hẹn giờ âm.
// Hẹn giờ âm làm Node cảnh báo TimeoutNegativeWarning và tự hạ xuống 1 ms — dựa vào đó là may rủi.
{
  const canhBao = [];
  const onWarn = (w) => { if (w && /TimeoutNegativeWarning/.test(String(w.name))) canhBao.push(String(w.message)); };
  process.on('warning', onWarn);
  process.env.HS_CLASSIFY_TRAN_MS = '50';
  chayGia = async () => { const het = Date.now() + 400; while (Date.now() < het); return KQ_BT; };
  const rE6 = await goi({ tenHang: 'xi măng portland' });
  await new Promise((r) => { const h = setTimeout(r, 30); if (h.unref) h.unref(); });
  process.off('warning', onWarn);
  check('E6 trần đã tiêu hết ⇒ 503 QUA_GIO, không có TimeoutNegativeWarning', rE6._s === 503 && rE6._j?.trangThai === 'QUA_GIO' && canhBao.length === 0, JSON.stringify({ s: rE6._s, canhBao }));
}
// ═════════ F. HAI LƯỢT SONG SONG — không bắt oan lượt hợp lệ ═════════
// Server thật phục vụ nhiều lượt trên CÙNG một event loop. Lượt B chặn CPU thì lượt A (việc riêng chỉ 100 ms)
// cũng bị giữ lại theo — nhưng A KHÔNG hề quá hạn về phần việc của nó. Nếu cửa chốt bằng ĐỒNG HỒ TƯỜNG thì A
// bị gắn nhãn QUA_GIO và kết quả ĐÃ CÓ bị vứt (đo được khi vá sai: main 200 có results → vá 503). Ca này khoá
// lại hành vi đúng: A vẫn 200, vẫn nguyên results.
process.env.HS_CLASSIFY_TRAN_MS = '1000';
chayGia = async (attrs) => {
  if (attrs?.tenHang === 'luot B chan cpu') { const het = Date.now() + 1500; while (Date.now() < het); return KQ_BT; }
  await new Promise((r) => { const h = setTimeout(r, 100); if (h.unref) h.unref(); }); // lượt A: việc riêng 100 ms
  return KQ_BT;
};
const [rFa, rFb] = await Promise.all([goi({ tenHang: 'luot A viec rieng 100ms' }), goi({ tenHang: 'luot B chan cpu' })]);
check('F1 lượt A (việc riêng 100 ms, trần 1000 ms) ⇒ 200 dù lượt B chặn CPU cùng lúc', rFa._s === 200, JSON.stringify({ s: rFa._s, j: rFa._j }).slice(0, 220));
check('F2 lượt A giữ nguyên results — KHÔNG vứt kết quả đã có', rFa._j?.results?.[0]?.hs === '84818061', JSON.stringify(rFa._j?.results));
check('F3 lượt A không bị gắn nhãn QUA_GIO', rFa._j?.trangThai === undefined, JSON.stringify(rFa._j).slice(0, 160));
check('F4 lượt B (chặn CPU 1500 ms > trần 1000 ms) ⇒ 503 QUA_GIO', rFb._s === 503 && rFb._j?.trangThai === 'QUA_GIO', JSON.stringify({ s: rFb._s, t: rFb._j?.trangThai }));

// ═════════ G. Lượt QUÁ GIỜ vẫn phải GHI CACHE — tiền LLM đã tiêu thì đừng mất trắng ═════════
// Lượt quá hạn không huỷ được: nó chạy nền tới khi xong và TỐN đủ tiền LLM. Nếu bỏ luôn kết quả thì lượt
// sau cùng hồ sơ lại gọi LLM lần nữa ⇒ trả tiền hai lần cho đúng một câu hỏi (OZV-507 việc 1).
{
  kho.clear(); demGhi.n = 0;
  process.env.HS_CLASSIFY_TRAN_MS = '150';
  let soLuotLLM = 0;
  chayGia = async () => { soLuotLLM += 1; await new Promise((r) => { const h = setTimeout(r, 400); if (h.unref) h.unref(); }); return KQ_BT; };
  const rG1 = await goi({ tenHang: 'bom nuoc ly tam' }, { token: 'khoa-dich-vu-test' });
  check('G1 khoá dịch vụ, lượt 400 ms > trần 150 ms ⇒ 503 QUA_GIO', rG1._s === 503 && rG1._j?.trangThai === 'QUA_GIO', JSON.stringify({ s: rG1._s, t: rG1._j?.trangThai }));
  await new Promise((r) => { const h = setTimeout(r, 450); if (h.unref) h.unref(); }); // chờ lượt nền chạy xong
  check('G2 lượt quá giờ VẪN ghi cache (tiền LLM đã tiêu không mất trắng)', demGhi.n === 1, JSON.stringify({ soLanGhiCache: demGhi.n, soLuotLLM }));

  process.env.HS_CLASSIFY_TRAN_MS = '85000';
  const rG3 = await goi({ tenHang: 'bom nuoc ly tam' }, { token: 'khoa-dich-vu-test' });
  check('G3 lượt sau cùng hồ sơ ⇒ trúng cache, 200 + cached:true', rG3._s === 200 && rG3._j?.cached === true, JSON.stringify({ s: rG3._s, cached: rG3._j?.cached }));
  check('G4 lượt trúng cache KHÔNG gọi LLM lần nữa (vẫn đúng 1 lượt)', soLuotLLM === 1, JSON.stringify({ soLuotLLM }));
}

process.env.HS_CLASSIFY_TRAN_MS = '85000';

clearInterval(giuSong);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
