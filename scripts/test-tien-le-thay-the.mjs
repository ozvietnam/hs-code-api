// Test lib/tien-le-thay-the.js — TB-TCHQ đã bị Hải quan sửa đổi, thay thế không được trích lúc chạy (07/11/2026).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const T = require('../lib/tien-le-thay-the.js');
let pass = 0; let fail = 0;
const check = (ten, ok, them) => { if (ok) pass++; else { fail++; console.log('✗', ten, them === undefined ? '' : JSON.stringify(them).slice(0, 300)); } };

const prec = JSON.parse(fs.readFileSync(new URL('../data/precedents.json', import.meta.url), 'utf8'));
const bang = JSON.parse(fs.readFileSync(new URL('../data/tien-le-thay-the.json', import.meta.url), 'utf8'));
const S = require('../lib/so-tay');

// 1. Danh sách: mỗi mục có cũ/mới đủ số hiệu + ngày, căn cứ trích; trích từ precedents.json phải nguyên văn
check('1a phiên bản', bang.phienBan === 'tien-le-thay-the@1');
for (const m of bang.muc) {
  const id = m.cu?.soHieu;
  check(`1b ${id} có cũ/mới + ngày YYYY-MM-DD`, /^\d{4}-\d{2}-\d{2}$/.test(m.cu?.ngay || '') && /^\d{4}-\d{2}-\d{2}$/.test(m.moi?.ngay || '') && m.moi?.soHieu && /^\d{8}$/.test(m.moi?.ma || ''), m);
  check(`1c ${id} TB mới ban hành sau TB cũ`, m.moi.ngay > m.cu.ngay, m);
  check(`1d ${id} câu trích nhắc số hiệu TB cũ`, S.squash(m.canCu?.trich || '').includes(S.squash(id.split('/')[0])), m.canCu);
  const v = /^precedents\.json#(\d+)\[(\d+)\]$/.exec(m.canCu?.viTri || '');
  if (v) {
    const r = prec[v[1]]?.[+v[2]];
    check(`1e ${id} vị trí trỏ đúng TB mới`, r && String(r.tbTchqNumber).trim() === m.moi.soHieu && v[1] === m.moi.ma, r?.tbTchqNumber);
    check(`1f ${id} trích nguyên văn TB mới`, r && S.squash(`${r.productName}\n${r.technicalSpec}`).includes(S.squash(m.canCu.trich)));
  } else check(`1g ${id} không trỏ precedents thì phải có url + ghiChu nói rõ chưa đối chiếu PDF`, /^https:\/\//.test(m.canCu?.url || '') && /chưa đối chiếu|công cụ đọc web/.test(m.ghiChu || ''), m);
}
// Một số TB cũ chưa có trong kho (99/2021, 125/2017, 3884/2018) — giữ trong danh sách để lần gộp sau tự lọc.
const coTrongKho = bang.muc.filter((m) => Object.values(prec).some((l) => Array.isArray(l) && l.some((r) => T.thayTheCua(r, [m]))));
check('1h phần lớn TB cũ trong danh sách có trong kho', coTrongKho.length >= 11, coTrongKho.length);

// 2. Khớp theo số hiệu VÀ ngày (số hiệu lặp lại mỗi năm)
const ds = bang.muc;
check('2a 293/TB-TCHQ 18/01/2018 bị thay', !!T.thayTheCua({ tbTchqNumber: '293/TB-TCHQ', issuedDate: '2018-01-18' }, ds));
check('2b 6449/TB-TCHQ ngày 23/12/2024 (thông báo khác) KHÔNG bị bỏ', !T.thayTheCua({ tbTchqNumber: '6449/TB-TCHQ', issuedDate: '2024-12-23' }, ds));
check('2c thiếu ngày ⇒ không khớp (giữ lại)', !T.thayTheCua({ tbTchqNumber: '293/TB-TCHQ' }, ds));
check('2d số hiệu có khoảng trắng vẫn khớp', !!T.thayTheCua({ tbTchqNumber: '3675/TB-TC H Q', issuedDate: '2019-06-05' }, ds));

// 3. Lọc kho
const { data, boRa } = T.locHieuLuc(prec, ds);
check('3a có bản ghi bị bỏ', boRa.length >= ds.length, boRa.length);
check('3b 3004.20.91 không còn 293/TB-TCHQ', !(data['30042091'] || []).some((r) => r.tbTchqNumber === '293/TB-TCHQ'));
check('3c 3004.20.71 vẫn còn 2719/TB-TCHQ (TB thay thế)', (data['30042071'] || []).some((r) => r.tbTchqNumber === '2719/TB-TCHQ'));
check('3d 1901.10.20 giữ 6448, 6449/TB-TCHQ năm 2024', (data['19011020'] || []).filter((r) => /^644[89]\//.test(r.tbTchqNumber)).length === (prec['19011020'] || []).filter((r) => /^644[89]\//.test(r.tbTchqNumber)).length);
check('3e không đổi đối tượng gốc', (prec['30042091'] || []).some((r) => r.tbTchqNumber === '293/TB-TCHQ'));
const tong = (o) => Object.values(o).reduce((s, l) => s + (Array.isArray(l) ? l.length : 0), 0);
check('3f tổng = gốc − bỏ ra', tong(data) === tong(prec) - boRa.length, [tong(data), tong(prec), boRa.length]);
process.env.HS_LOC_TB_THAY_THE = 'false';
check('3g tắt khẩn cấp ⇒ không lọc', T.locHieuLuc(prec, ds).boRa.length === 0);
delete process.env.HS_LOC_TB_THAY_THE;

// 4. Bộ nạp lúc chạy dùng kho đã lọc
const D = require('../lib/data.js');
check('4a lib/data precedentsData đã lọc', !(D.precedentsData['30042091'] || []).some((r) => r.tbTchqNumber === '293/TB-TCHQ'));
check('4b lib/data báo danh sách bị bỏ', Array.isArray(D.precedentsBiThayThe) && D.precedentsBiThayThe.length === boRa.length);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
