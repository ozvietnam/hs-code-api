// scripts/test-ho-so-ma-goi-duyet.mjs — test máy dựng gói duyệt (M-78, #1970).
// Dữ liệu GIẢ trong tmp: 1 chương, 3 bản ghi vấn đề (2 KHOP + 1 LECH_PHIEU) → goi() chọn
// đúng số lượng, sinh câu hỏi lời thường + câu luật nguyên văn + ô 3 lựa chọn;
// doc-bang đọc lại ô đã đánh đúng. Chạy lại ổn định (cùng seed cùng kết quả).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { goi, docBang } = require('../scripts/ho-so-ma/goi-duyet.mjs');

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.error(`FAIL ${n} ${d}`); } };

// ── dữ liệu giả trong tmp ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'goi-duyet-'));
const luat = path.join(tmp, 'luat-goc');
const hoSo = path.join(tmp, 'ho-so-ma');
const outDir = path.join(tmp, 'out');
fs.mkdirSync(path.join(luat, 'cau'), { recursive: true });
fs.mkdirSync(path.join(hoSo, 'dong'), { recursive: true });

const chuNhom = 'Dây và cáp điện đã cách điện';
const vanDong = 'Dây điện và cáp điện cách điện bằng polymer biến đổi tính dẻo';
fs.writeFileSync(path.join(luat, 'phan.jsonl'), JSON.stringify({ id: 'phan:XVI', loai: 'TEN', nguyenVan: 'Nhôm' }) + '\n');
fs.writeFileSync(path.join(luat, 'chuong.jsonl'), JSON.stringify({ id: 'chuong:85', loai: 'TEN', nguyenVan: 'Điện' }) + '\n');
fs.writeFileSync(path.join(luat, 'bieu.jsonl'), [
  JSON.stringify({ id: 'bieu:85', nguyenVan: 'Điện' }),
  JSON.stringify({ id: 'bieu:8544', cha: 'bieu:85', nguyenVan: chuNhom }),
  JSON.stringify({ id: 'bieu:854420', cha: 'bieu:8544', nguyenVan: vanDong }),
].join('\n') + '\n');
fs.writeFileSync(path.join(luat, 'cau', 'bieu.jsonl'), [
  JSON.stringify({ id: 'bieu:854420#1', tu: 0, den: vanDong.length }),
].join('\n') + '\n');
const sha = crypto.createHash('sha256').update(vanDong).digest('hex');
const rec = (id, loai, trangThai) => JSON.stringify({
  id: `hs:bieu:854420:${id}`, nut: 'bieu:854420', loai,
  dieuKien: 'Không phải dây điện cách điện polymer', trich: vanDong, cau: 'bieu:854420#1',
  den: ['bieu:8543'], lop: 'LUAT', nguon: 'Chú giải chi tiết HS 2022', van: sha, trangThai,
});
// 3 bản ghi: 2 KHOP + 1 LECH_PHIEU
fs.writeFileSync(path.join(hoSo, 'dong', '854420.jsonl'), [rec(1, 'KHONG_DUOC_LA', 'KHOP'), rec(2, 'KHONG_DUOC_LA', 'KHOP'), rec(3, 'KHONG_DUOC_LA', 'LECH_PHIEU')].join('\n') + '\n');

// ── 1. goi() chọn đủ 3 (30 ngẫu + toàn bộ lệch phiếu — dữ liệu nhỏ nên tất cả) ──
const ngay = '2026-11-26';
const kq = goi('85', ngay, 30, { hoSo, luat, out: outDir });
check('goi: chọn đủ 3 vấn đề (2 KHOP + 1 LECH_PHIEU)', kq.so === 3 && kq.lech === 1 && kq.tong === 3, JSON.stringify(kq));
check('goi: tệp md + tra-loi sinh đúng thư mục out', fs.existsSync(kq.tepMd) && fs.existsSync(kq.tepTraLoi));

// ── 2. nội dung gói: câu luật nguyên văn + câu hỏi lời thường + ô 3 lựa chọn ──
const md = fs.readFileSync(kq.tepMd, 'utf8');
check('gói: câu luật nguyên văn đầy đủ', md.includes(vanDong));
check('gói: có 3 ô đánh dấu Đúng/Sai/Không rõ (mỗi vấn đề)', (md.match(/\[ \] \*\*Đúng\*\*/g) || []).length === 3);
check('gói: câu hỏi lời thường không dán mã HS thô', !/\bieu:854420\b/.test(md.split('---').find((b) => b.includes('Câu hỏi')) || ''));
check('gói: LECH_PHIEU được chọn bất kể ngẫu nhiên', md.includes('LECH_PHIEU') === false && kq.so === 3);

// ── 3. doc-bang: điền xong đọc lại đúng ô ──
fs.writeFileSync(kq.tepMd, md.replace(/- \[ \] \*\*Đúng\*\*/, '- [x] **Đúng**'));
const ket = docBang(kq.tepMd);
check('doc-bang: đọc lại ô Đúng đã đánh (1 ô)', ket.length === 1 && ket[0].dau === 'DUNG', JSON.stringify(ket));
const kqTraLoi = JSON.parse(fs.readFileSync(kq.tepTraLoi, 'utf8'));
check('tra-loi.json: có id từng vấn đề để sửa tại nguồn', kqTraLoi.muc.every((m) => m.id.startsWith('hs:bieu:854420')));

// ── 4. chạy lại cùng ngày cùng seed: ổn định ──
const out2 = path.join(tmp, 'out2');
const kq2 = goi('85', ngay, 30, { hoSo, luat, out: out2 });
check('chạy lại: cùng kết quả (tất định)', JSON.stringify(fs.readFileSync(kq2.tepMd, 'utf8')) === JSON.stringify(md) || fs.readFileSync(kq2.tepMd, 'utf8') === md);

// ── 5. chương không có dữ liệu: gói rỗng không vỡ ──
const kqRong = goi('01', ngay, 30, { hoSo, luat, out: outDir });
check('chương không có dữ liệu: gói rỗng không vỡ', kqRong.so === 0 && kqRong.tong === 0);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
