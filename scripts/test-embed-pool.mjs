// lib/embed-pool.js — tầng ứng viên embedding (GĐ1, #377). Không cần model thật.
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ep = require('../lib/embed-pool.js');

let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };

// ── Cờ TẮT (mặc định): trả null NGAY, không load model, không đọc index ──
delete process.env.HS_EMBED_POOL;
const t0 = Date.now();
const off = await ep.poolNhom('quạt thông gió');
check('HS_EMBED_POOL chưa bật → null tức thì (< 50 ms, không load model)', off === null && Date.now() - t0 < 50, JSON.stringify(off));

// ── topK thuần (cosine trên vector đã chuẩn hoá) ──
const vec = [1, 0];
const entries = [['8414', [1, 0]], ['8509', [0, 1]], ['8415', [0.9, 0.1]]];
const kq = ep.topK(vec, entries, 2);
check('topK: xếp đúng theo cosine', kq[0].ma === '8414' && Math.abs(kq[0].diem - 1) < 1e-9 && kq[1].ma === '8415', JSON.stringify(kq));

// ── dongGoi: ghi rõ là tín hiệu, không bằng chứng ──
const goi = ep.dongGoi({ nhom4: [{ ma: '8414', diem: 0.9 }, { ma: '8509', diem: 0.8 }], nhom6: [{ ma: '841451', diem: 0.87 }] });
check('dongGoi: đủ 2 dòng + nhãn TÍN HIỆU', /ỨNG VIÊN NHÓM/.test(goi) && /8414\(0.9\)/.test(goi) && /841451\(0.87\)/.test(goi) && /KHÔNG phải bằng chứng/.test(goi), goi);
check('dongGoi: pool rỗng → chuỗi rỗng (không khối thừa)', ep.dongGoi(null) === '' && ep.dongGoi({ nhom4: [] }) === '');

// ── Lỗi an toàn: cờ bật nhưng index trỏ tới tệp không tồn tại → null, không ném ──
process.env.HS_EMBED_POOL = 'on';
process.env.HS_EMBED_INDEX = '/tmp/hs-gd1/data/gd0/khong-ton-tai.json';
ep.reset();
let batLoi = null;
try { const r = await ep.poolNhom('quạt'); check('index thiếu → trả null (không ném)', r === null, JSON.stringify(r)); } catch (e) { batLoi = e; }
check('không ném ngoại lệ khi khởi tạo lỗi', batLoi === null, String(batLoi));
ep.reset();
delete process.env.HS_EMBED_POOL; delete process.env.HS_EMBED_INDEX;

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
