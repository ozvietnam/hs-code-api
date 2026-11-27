// scripts/test-ho-so-ma-goi-duyet.mjs — test máy dựng gói duyệt M-78 (#1970) & M-81 (#2410).
// 1) Bảo toàn 100% 8 ca M-78 cũ trên dữ liệu giả trong tmp (không sinh rác vào docs/ho-so/duyet/ khi require).
// 2) Kiểm đầy đủ goiM81() + laNghiaThuongVungBien() + docBang() trên phiếu M-81 giả trong tmp
//    (VUNG_CHONG chồng số + vungChong đầu vào + bảng docs, GIAI_CHONG mang ghiChu CAN_NGUOI_DUYET gom theo cặp,
//     NGHIA_THUONG vùng biên vs không vùng biên, tra câu sen:* & gir:*, đọc lại Đúng / Sai / Cần thêm + Kết luận).
// 3) Kiểm gói M-81 trên kho 12 nhóm vàng hiện hành (xuất ra tmp, không sửa data/): đúng 9 VUNG_CHONG + 11 GIAI_CHONG, 0 lỗi câu luật.

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { napLuatCong } from './ho-so-ma/cong.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DUYET_M78_THAT = path.join(GOC, 'docs', 'ho-so', 'duyet');
const tepM78TruocRequire = fs.existsSync(DUYET_M78_THAT) ? fs.readdirSync(DUYET_M78_THAT).sort() : [];

const require = createRequire(import.meta.url);
const { goi, goiM81, docBang, laNghiaThuongVungBien } = require('../scripts/ho-so-ma/goi-duyet.mjs');

const tepM78SauRequire = fs.existsSync(DUYET_M78_THAT) ? fs.readdirSync(DUYET_M78_THAT).sort() : [];

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.error(`FAIL ${n} ${d}`); } };

// ── A. Dữ liệu giả M-78 trong tmp (8 ca gốc giữ nguyên 100%) ──
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
check('gói: có 3 ô đánh dấu Đúng/Sai/Không rõ (mỗi vấn đề)', (md.match(/\[ \] \*\*Rút đúng\*\*/g) || []).length === 3);
check('gói: câu hỏi lời thường không dán mã HS thô', !/\bieu:854420\b/.test(md.split('---').find((b) => b.includes('Câu hỏi')) || ''));
check('gói: LECH_PHIEU được chọn bất kể ngẫu nhiên', md.includes('LECH_PHIEU') === false && kq.so === 3);

// ── 3. doc-bang: điền xong đọc lại đúng ô ──
fs.writeFileSync(kq.tepMd, md.replace(/- \[ \] \*\*Rút đúng\*\*/, '- [x] **Rút đúng**'));
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

// ── 6. require/import không tự chạy CLI sinh rác vào docs/ho-so/duyet/ + M-78 đọc được sen.jsonl ──
check(
  'require goi-duyet.mjs: không tự chạy CLI sinh rác vào docs/ho-so/duyet/',
  JSON.stringify(tepM78TruocRequire) === JSON.stringify(tepM78SauRequire),
  JSON.stringify({ truoc: tepM78TruocRequire, sau: tepM78SauRequire }),
);

const senText = 'Động cơ hướng trục là động cơ có từ thông song song với trục quay.';
fs.writeFileSync(path.join(luat, 'sen.jsonl'), JSON.stringify({ id: 'sen:854420:1', lop: 'HUONG_DAN', nguyenVan: senText }) + '\n');
fs.writeFileSync(path.join(luat, 'cau', 'sen.jsonl'), JSON.stringify({ id: 'sen:854420:1#1', tu: 0, den: senText.length }) + '\n');
const shaSen = crypto.createHash('sha256').update(senText, 'utf8').digest('hex');
fs.writeFileSync(path.join(hoSo, 'dong', '854420.jsonl'), JSON.stringify({
  id: 'hs:bieu:854420:9',
  nut: 'bieu:854420',
  loai: 'PHAI_LA',
  dieuKien: 'Động cơ hướng trục theo SEN',
  trich: 'từ thông song song với trục quay',
  cau: 'sen:854420:1#1',
  duKien: [],
  lop: 'HUONG_DAN',
  nguon: 'SEN 2022',
  van: shaSen,
  trangThai: 'KHOP',
}) + '\n');
const kqSenM78 = goi('85', ngay, 30, { hoSo, luat, out: path.join(tmp, 'out-sen') });
const mdSenM78 = fs.readFileSync(kqSenM78.tepMd, 'utf8');
check('M-78 nutChuCua: nạp được câu sen:* nguyên văn từ sen.jsonl', mdSenM78.includes(senText) && !mdSenM78.includes('ghi nhận lỗi'));

// ── B. Kiểm chế độ M-81 trên kho giả cô lập trong tmp ──
{
  const luat81 = path.join(tmp, 'luat-81');
  const hoSo81 = path.join(tmp, 'ho-so-81');
  const docs81 = path.join(tmp, 'docs-81');
  const out81 = path.join(tmp, 'out-81');
  fs.mkdirSync(path.join(luat81, 'cau'), { recursive: true });
  fs.mkdirSync(path.join(hoSo81, 'dieu-kien'), { recursive: true });
  fs.mkdirSync(path.join(hoSo81, 'nguong'), { recursive: true });
  fs.mkdirSync(docs81, { recursive: true });

  const shaCau = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  const gir3a = '(a) Nhóm có mô tả cụ thể nhất sẽ được ưu tiên hơn các nhóm có mô tả khái quát.';
  const gir6 = 'Theo Quy tắc này thì các chú giải phần và chương có liên quan cũng được áp dụng.';
  const sen8543 = 'Bộ khuếch đại vi sóng là thiết bị khuếch đại tín hiệu ở dải tần vi sóng.';

  const bieuNodes = [
    // Chương 02: cặp rời nhau trên trục GIA_TRI đơn trị, không có Loại khác -> kiểm NGHIA_THUONG KHÔNG thuộc vùng biên
    { id: 'bieu:02', nguyenVan: 'Thịt và phụ phẩm dạng thịt ăn được' },
    { id: 'bieu:0201', cha: 'bieu:02', nguyenVan: 'Thịt của động vật họ trâu bò, tươi hoặc ướp lạnh' },
    { id: 'bieu:020120', cha: 'bieu:0201', nguyenVan: '- Thịt pha có xương' },
    { id: 'bieu:020130', cha: 'bieu:0201', nguyenVan: '- Thịt lọc không xương' },
    // Chương 85: kiểm VUNG_CHONG (chồng số + bảng docs), GIAI_CHONG CAN_NGUOI_DUYET gom cặp, NGHIA_THUONG vùng biên
    { id: 'bieu:85', nguyenVan: 'Máy điện và thiết bị điện' },
    { id: 'bieu:8501', cha: 'bieu:85', nguyenVan: 'Động cơ điện và máy phát điện' },
    { id: 'bieu:850110', cha: 'bieu:8501', nguyenVan: '- Động cơ có công suất không quá 37,5 W:' },
    { id: 'bieu:85011010', cha: 'bieu:850110', nguyenVan: '- - Công suất không quá 10 W' },
    { id: 'bieu:85011020', cha: 'bieu:850110', nguyenVan: '- - Công suất trên 5 W' },
    { id: 'bieu:8543', cha: 'bieu:85', nguyenVan: 'Máy và thiết bị điện, có chức năng riêng, chưa được chi tiết hoặc ghi ở nơi khác' },
    { id: 'bieu:854370', cha: 'bieu:8543', nguyenVan: '- Máy và thiết bị khác:' },
    { id: 'bieu:85437010', cha: 'bieu:854370', nguyenVan: '- - Máy cung cấp năng lượng cho hàng rào điện' },
    { id: 'bieu:85437030', cha: 'bieu:854370', nguyenVan: '- - Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển' },
    { id: 'bieu:85437050', cha: 'bieu:854370', nguyenVan: '- - Bộ khuếch đại vi sóng; đầu đọc điện tử di động' },
    { id: 'bieu:85437090', cha: 'bieu:854370', loaiKhac: true, nguyenVan: '- - Loại khác' },
  ];

  fs.writeFileSync(path.join(luat81, 'phan.jsonl'), [
    JSON.stringify({ id: 'phan:I', loai: 'TEN', lop: 'LUAT', nguyenVan: 'Động vật sống' }),
    JSON.stringify({ id: 'phan:XVI', loai: 'TEN', lop: 'LUAT', nguyenVan: 'Máy và trang thiết bị cơ khí; thiết bị điện' }),
  ].join('\n') + '\n');
  const cgpn02 = 'Trong Chương này thịt pha gồm hai dạng có xương và không xương.';
  fs.writeFileSync(path.join(luat81, 'chuong.jsonl'), [
    JSON.stringify({ id: 'chuong:02', loai: 'TEN', lop: 'LUAT', nguyenVan: 'Thịt và phụ phẩm dạng thịt ăn được' }),
    JSON.stringify({ id: 'chuong:02:cgpn:1', lop: 'LUAT', nguyenVan: cgpn02 }),
    JSON.stringify({ id: 'chuong:85', loai: 'TEN', lop: 'LUAT', nguyenVan: 'Máy điện và thiết bị điện' }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(luat81, 'gir.jsonl'), [
    JSON.stringify({ id: 'gir:3:a', lop: 'LUAT', nguyenVan: gir3a }),
    JSON.stringify({ id: 'gir:6', lop: 'LUAT', nguyenVan: gir6 }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(luat81, 'sen.jsonl'), [
    JSON.stringify({ id: 'sen:85437050:1', lop: 'HUONG_DAN', nguyenVan: sen8543 }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(luat81, 'bieu.jsonl'), bieuNodes.map((n) => JSON.stringify({ ...n, lop: 'LUAT' })).join('\n') + '\n');

  fs.writeFileSync(path.join(luat81, 'cau', 'bieu.jsonl'), bieuNodes.map((n) => JSON.stringify({ id: `${n.id}#1`, tu: 0, den: n.nguyenVan.length })).join('\n') + '\n');
  fs.writeFileSync(path.join(luat81, 'cau', 'chuong.jsonl'), [
    JSON.stringify({ id: 'chuong:02:cgpn:1#1', tu: 0, den: cgpn02.length }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(luat81, 'cau', 'gir.jsonl'), [
    JSON.stringify({ id: 'gir:3:a#1', tu: 0, den: gir3a.length }),
    JSON.stringify({ id: 'gir:6#1', tu: 0, den: gir6.length }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(luat81, 'cau', 'sen.jsonl'), [
    JSON.stringify({ id: 'sen:85437050:1#1', tu: 0, den: sen8543.length }),
  ].join('\n') + '\n');

  const chuBieu = Object.fromEntries(bieuNodes.map((n) => [n.id, n.nguyenVan]));

  // Ngưỡng chồng dải ở 8501.10: <= 10 W vs > 5 W -> Cổng 8 / laChongSoTrungTruc tự phát hiện VUNG_CHONG
  const ng10W = {
    id: 'hs:bieu:85011010:7401',
    nut: 'bieu:85011010',
    loai: 'NGUONG',
    dieuKien: 'Công suất <= 10 W',
    trich: 'Công suất không quá 10 W',
    cau: 'bieu:85011010#1',
    nguong: { daiLuong: 'công suất', donVi: 'W', tu: null, den: 10, gomTu: false, gomDen: true },
    duKien: ['công suất'],
    lop: 'LUAT',
    nguon: 'Biểu thuế',
    van: shaCau(chuBieu['bieu:85011010']),
    trangThai: 'KHOP',
  };
  const ngTren5W = {
    id: 'hs:bieu:85011020:7401',
    nut: 'bieu:85011020',
    loai: 'NGUONG',
    dieuKien: 'Công suất > 5 W',
    trich: 'Công suất trên 5 W',
    cau: 'bieu:85011020#1',
    nguong: { daiLuong: 'công suất', donVi: 'W', tu: 5, den: null, gomTu: false, gomDen: false },
    duKien: ['công suất'],
    lop: 'LUAT',
    nguon: 'Biểu thuế',
    van: shaCau(chuBieu['bieu:85011020']),
    trangThai: 'KHOP',
  };
  fs.writeFileSync(path.join(hoSo81, 'nguong', '85.jsonl'), [ng10W, ngTren5W].map((x) => JSON.stringify(x)).join('\n') + '\n');

  // Chương 02: NGHIA_THUONG nội tâm sạch (không phu, ve=1, !daTri, cặp 020120/020130 rời nhau theo GIA_TRI có tapDu, không từ khoá mở)
  const dk02 = [
    {
      id: 'hs:bieu:020120:8101',
      nut: 'bieu:020120',
      loai: 'DIEU_KIEN',
      ve: 1,
      phu: false,
      kieu: 'GIA_TRI',
      truc: 'tình trạng xương',
      tap: ['có xương'],
      tapDu: ['có xương', 'không xương'],
      tapDuNguon: 'chuong:02:cgpn:1#1',
      tapDuTrich: 'có xương và không xương',
      mo: 'NGHIA_THUONG',
      cauHoi: 'Thịt trâu bò thuộc dạng có xương hay không xương?',
      trich: 'Thịt pha có xương',
      nguon: 'bieu:020120#1',
      vanTay: shaCau(chuBieu['bieu:020120']),
    },
    {
      id: 'hs:bieu:020130:8101',
      nut: 'bieu:020130',
      loai: 'DIEU_KIEN',
      ve: 1,
      phu: false,
      kieu: 'GIA_TRI',
      truc: 'tình trạng xương',
      tap: ['không xương'],
      tapDu: ['có xương', 'không xương'],
      tapDuNguon: 'chuong:02:cgpn:1#1',
      tapDuTrich: 'có xương và không xương',
      mo: 'DINH_NGHIA_LUAT',
      moNguon: 'bieu:020130#1',
      cauHoi: 'Thịt trâu bò thuộc dạng có xương hay không xương?',
      trich: 'Thịt lọc không xương',
      nguon: 'bieu:020130#1',
      vanTay: shaCau(chuBieu['bieu:020130']),
    },
  ];
  fs.writeFileSync(path.join(hoSo81, 'dieu-kien', '02.jsonl'), dk02.map((x) => JSON.stringify(x)).join('\n') + '\n');

  // Chương 85:
  // - 85011010 × 85011020: chồng số -> VUNG_CHONG #1
  // - 85437010 × 85437030: khai trong bảng M-81-chuyen-gia.md -> VUNG_CHONG #2
  // - 85437030 × 85437050: có 2 bản ghi GIAI_CHONG mang ghiChu CAN_NGUOI_DUYET -> gom thành ĐÚNG 1 phiếu GIAI_CHONG
  // - 85011010 × 85011020 có GIAI_CHONG sạch không mang ghiChu? Không, để thử VUNG_CHONG; thêm 1 GIAI_CHONG sạch (85437010 × 85437050) để chứng minh GIAI_CHONG không mang CAN_NGUOI_DUYET thì KHÔNG vào gói!
  const dk85 = [
    {
      id: 'hs:bieu:85011010:8101',
      nut: 'bieu:85011010',
      loai: 'DIEU_KIEN',
      ve: 1,
      phu: false,
      kieu: 'SO',
      nguong: ng10W.id,
      mo: 'NGUONG',
      cauHoi: 'Công suất không quá 10 W?',
      trich: 'Công suất không quá 10 W',
      nguon: 'bieu:85011010#1',
      vanTay: shaCau(chuBieu['bieu:85011010']),
    },
    {
      id: 'hs:bieu:85011020:8101',
      nut: 'bieu:85011020',
      loai: 'DIEU_KIEN',
      ve: 1,
      phu: false,
      kieu: 'SO',
      nguong: ngTren5W.id,
      mo: 'NGUONG',
      cauHoi: 'Công suất trên 5 W?',
      trich: 'Công suất trên 5 W',
      nguon: 'bieu:85011020#1',
      vanTay: shaCau(chuBieu['bieu:85011020']),
    },
    {
      id: 'hs:bieu:85437010:8101',
      nut: 'bieu:85437010',
      loai: 'DIEU_KIEN',
      ve: 0,
      phu: true,
      kieu: 'CO_KHONG',
      mo: 'NGHIA_THUONG',
      cauHoi: 'Có phải máy rào điện chuyên biệt (loại trừ) không?',
      trich: 'Máy cung cấp năng lượng cho hàng rào điện',
      nguon: 'bieu:85437010#1',
      vanTay: shaCau(chuBieu['bieu:85437010']),
    },
    {
      id: 'hs:bieu:85437030:8101',
      nut: 'bieu:85437030',
      loai: 'DIEU_KIEN',
      ve: 1,
      phu: false,
      kieu: 'CO_KHONG',
      mo: 'NGHIA_THUONG',
      cauHoi: 'Thiết bị có chức năng phiên dịch hoặc từ điển không?',
      trich: 'có chức năng phiên dịch hoặc từ điển',
      nguon: 'bieu:85437030#1',
      vanTay: shaCau(chuBieu['bieu:85437030']),
    },
    {
      id: 'hs:bieu:85437050:8101',
      nut: 'bieu:85437050',
      loai: 'DIEU_KIEN',
      ve: 1,
      phu: false,
      kieu: 'CO_KHONG',
      mo: 'MO_TA_HUONG_DAN',
      moNguon: 'sen:85437050:1#1',
      cauHoi: 'Có phải bộ khuếch đại vi sóng không?',
      trich: 'Bộ khuếch đại vi sóng',
      nguon: 'bieu:85437050#1',
      vanTay: shaCau(chuBieu['bieu:85437050']),
    },
    // Cặp 85437030 × 85437050 có 2 bản ghi GIAI_CHONG mang CAN_NGUOI_DUYET -> gom 1 phiếu
    {
      id: 'hs:bieu:854370:8151',
      nut: 'bieu:854370',
      loai: 'GIAI_CHONG',
      cap: ['bieu:85437030', 'bieu:85437050'],
      cach: 'QUY_TAC_3',
      ghiChu: 'trangThaiGoc=CAN_NGUOI_DUYET — áp Quy tắc 3(a) qua Quy tắc 6',
      trich: 'Nhóm có mô tả cụ thể nhất sẽ được ưu tiên',
      nguon: 'gir:3:a#1',
      vanTay: shaCau(gir3a),
    },
    {
      id: 'hs:bieu:854370:8152',
      nut: 'bieu:854370',
      loai: 'GIAI_CHONG',
      cap: ['bieu:85437050', 'bieu:85437030'],
      cach: 'CHU_GIAI',
      ghiChu: 'trangThaiGoc=VUNG_CHONG — dẫn kèm Quy tắc 6',
      trich: 'các chú giải phần và chương có liên quan cũng được áp dụng',
      nguon: 'gir:6#1',
      vanTay: shaCau(gir6),
    },
    // Bản ghi GIAI_CHONG đã chốt (ghiChu kỹ thuật tiep=..., không cần duyệt) -> KHÔNG được vào gói
    {
      id: 'hs:bieu:854370:8199',
      nut: 'bieu:854370',
      loai: 'GIAI_CHONG',
      cap: ['bieu:85437010', 'bieu:85437050'],
      cach: 'QUY_TAC_3',
      ghiChu: 'tiep=gir:3:b#1,gir:3:c#1',
      trich: 'Nhóm có mô tả cụ thể nhất sẽ được ưu tiên',
      nguon: 'gir:3:a#1',
      vanTay: shaCau(gir3a),
    },
  ];
  fs.writeFileSync(path.join(hoSo81, 'dieu-kien', '85.jsonl'), dk85.map((x) => JSON.stringify(x)).join('\n') + '\n');

  // Bảng docs giả có 1 cặp thuộc hoSo81 (8543.70.10 × 8543.70.30) và 1 cặp ngoài hoSo81 (3926.20.10 × 3926.20.60)
  fs.writeFileSync(path.join(docs81, 'M-81-chuyen-gia.md'), [
    '### 4.1. Cặp VUNG_CHONG chưa ghi GIAI_CHONG',
    '',
    '| # | Nhóm | Cặp anh em | Mặt hàng cụ thể | Lý do |',
    '|---:|---|---|---|---|',
    '| 1 | `85.43` | `8543.70.10` × `8543.70.30` | Thiết bị rào điện tích hợp bộ từ điển mã lỗi | Vừa cấp điện rào điện vừa tra từ điển |',
    '| 2 | `39.26` | `3926.20.10` × `3926.20.60` | Tạp dề chống hoá chất | Ngoài kho giả nên phải tự lọc bỏ |',
    '',
  ].join('\n'), 'utf8');

  // Kiểm hàm laNghiaThuongVungBien trực tiếp
  const checkNtSach = laNghiaThuongVungBien(dk02[0], {});
  const checkNtPhuVe0 = laNghiaThuongVungBien(dk85[2], {});
  const checkNtTuKhoa = laNghiaThuongVungBien(dk85[3], {});
  check(
    'laNghiaThuongVungBien: phân biệt đúng NGHIA_THUONG nội tâm sạch vs vùng biên (ve=0/phu & từ khoá mở)',
    checkNtSach.vungBien === false && checkNtPhuVe0.vungBien === true && checkNtTuKhoa.vungBien === true,
    JSON.stringify({ checkNtSach, checkNtPhuVe0, checkNtTuKhoa }),
  );

  // Chạy goiM81 mặc định trên kho giả
  const kqM81Gia = goiM81('2026-11-27', { hoSo: hoSo81, luat: luat81, docsDir: docs81, out: out81 });
  const mdM81Gia = fs.readFileSync(kqM81Gia.tepMd, 'utf8');
  check(
    'goiM81 (kho giả): bắt đúng 2 VUNG_CHONG (1 chồng số + 1 từ docs, lọc bỏ cặp ngoài kho), 1 cặp GIAI_CHONG (gom từ 2 bản ghi, bỏ qua tiep=...), 2/3 NGHIA_THUONG vùng biên, 0 lỗi câu luật',
    kqM81Gia.soVungChong === 2
    && kqM81Gia.soGiaiChong === 1
    && kqM81Gia.soBanGhiGiaiChong === 2
    && kqM81Gia.soNghiaThuong === 2
    && kqM81Gia.tongNghiaThuong === 3
    && kqM81Gia.loiCau.length === 0
    && !mdM81Gia.includes('## Chương 02'),
    JSON.stringify({ ...kqM81Gia, muc: undefined }),
  );
  check(
    'goiM81 (kho giả): tra nguyên văn cả câu sen:* (moNguon) và câu gir:* (GIAI_CHONG)',
    mdM81Gia.includes(sen8543) && mdM81Gia.includes(gir3a) && mdM81Gia.includes(gir6),
  );

  // Chạy goiM81 với --tat-ca-nghia-thuong: lấy đủ cả 3/3 NGHIA_THUONG (xuất hiện thêm Chương 02)
  const kqTatCaNt = goiM81('2026-11-27', { hoSo: hoSo81, luat: luat81, docsDir: docs81, out: path.join(tmp, 'out-81-all'), tatCaNghiaThuong: true });
  check(
    'goiM81 (tatCaNghiaThuong=true): lấy trọn 3/3 NGHIA_THUONG gồm cả Chương 02',
    kqTatCaNt.soNghiaThuong === 3 && Boolean(kqTatCaNt.theoChuong['02']),
    JSON.stringify(kqTatCaNt.theoChuong),
  );

  // Kiểm docBang trên phiếu M-81: Đúng / Sai / Cần thêm + Kết luận người duyệt
  const mdDaDien = mdM81Gia
    .replace(
      /(### \[M81-VC-85011010-85011020\][\s\S]*?)- \[ \] \*\*Đúng\*\*  - \[ \] \*\*Sai\*\*  - \[ \] \*\*Cần thêm\*\*\n- \*\*Kết luận người duyệt:\*\* /,
      '$1- [ ] **Đúng**  - [x] **Sai**  - [ ] **Cần thêm**\n- **Kết luận người duyệt:** Sửa lại dải ngưỡng 8501.10.20 thành trên 10 W theo biểu thuế.',
    )
    .replace(
      /(### \[M81-GC-85437030-85437050\][\s\S]*?)- \[ \] \*\*Đúng\*\*  - \[ \] \*\*Sai\*\*  - \[ \] \*\*Cần thêm\*\*\n- \*\*Kết luận người duyệt:\*\* /,
      '$1- [x] **Đúng**  - [ ] **Sai**  - [ ] **Cần thêm**\n- **Kết luận người duyệt:** Đồng ý áp Quy tắc 3(a) qua Quy tắc 6.',
    )
    .replace(
      /(### \[M81-NT-hs:bieu:85437030:8101\][\s\S]*?)- \[ \] \*\*Đúng\*\*  - \[ \] \*\*Sai\*\*  - \[ \] \*\*Cần thêm\*\*\n- \*\*Kết luận người duyệt:\*\* /,
      '$1- [ ] **Đúng**  - [ ] **Sai**  - [x] **Cần thêm**\n- **Kết luận người duyệt:** Cần nêu rõ thiết bị dịch tự động cầm tay vs phần mềm cài trên máy đa năng.',
    );
  const tepDienM81 = path.join(out81, 'm81-da-dien.md');
  fs.writeFileSync(tepDienM81, mdDaDien, 'utf8');
  const ketM81 = docBang(tepDienM81);
  check(
    'docBang (phiếu M-81): đọc chuẩn DUNG / SAI / CAN_THEM và trích nguyên vẹn Kết luận người duyệt',
    ketM81.length === 3
    && ketM81[0].id === 'M81-VC-85011010-85011020' && ketM81[0].dau === 'SAI' && /trên 10 W/.test(ketM81[0].ketLuan)
    && ketM81[1].id === 'M81-GC-85437030-85437050' && ketM81[1].dau === 'DUNG' && /Quy tắc 3\(a\)/.test(ketM81[1].ketLuan)
    && ketM81[2].id === 'M81-NT-hs:bieu:85437030:8101' && ketM81[2].dau === 'CAN_THEM' && /cầm tay/.test(ketM81[2].ketLuan),
    JSON.stringify(ketM81),
  );

  // Ca âm docBang: đánh dấu >= 2 ô trên cùng một phiếu -> trả dau = 'NHIEU_DAU'
  const tepNhieuDau = path.join(out81, 'm81-nhieu-dau.md');
  fs.writeFileSync(
    tepNhieuDau,
    mdM81Gia.replace(
      '- [ ] **Đúng**  - [ ] **Sai**  - [ ] **Cần thêm**',
      '- [x] **Đúng**  - [x] **Sai**  - [ ] **Cần thêm**',
    ),
    'utf8',
  );
  const ketNhieuDau = docBang(tepNhieuDau);
  check(
    'CA NGƯỢC docBang: đánh dấu >= 2 ô trên cùng 1 phiếu ⇒ trả NHIEU_DAU (không nuốt lấy ô đầu)',
    ketNhieuDau.length === 1 && ketNhieuDau[0].dau === 'NHIEU_DAU',
    JSON.stringify(ketNhieuDau),
  );

  // Ca âm goiM81: truyền matHang chứa id câu ma -> bắt buộc ghi nhận vào loiCau và CLI thoát 1
  const vcMaPath = path.join(tmp, 'vc-ma.jsonl');
  const vcMa = [{
    nut: 'bieu:854370',
    cap: ['bieu:85437010', 'bieu:85437030'],
    matHang: 'Thiết bị thử dẫn id câu ma (sen:99999999:1#1)',
  }];
  fs.writeFileSync(vcMaPath, `${JSON.stringify(vcMa[0])}\n`, 'utf8');
  const kqIdMa = goiM81('2026-11-27', { hoSo: hoSo81, luat: luat81, docsDir: null, vungChong: vcMa, out: path.join(tmp, 'out-id-ma') });
  const cliIdMa = spawnSync(
    process.execPath,
    [path.join(GOC, 'scripts/ho-so-ma/goi-duyet.mjs'), '--m81', '--ngay=2026-11-27', `--ho-so=${hoSo81}`, `--luat=${luat81}`, `--vung-chong=${vcMaPath}`, `--out=${path.join(tmp, 'out-id-ma-cli')}`],
    { encoding: 'utf8' },
  );
  check(
    'CA NGƯỢC goiM81: matHang chứa id câu ma (sen:99999999:1#1) ⇒ loiCau bắt đỏ và CLI thoát 1',
    kqIdMa.loiCau.includes('sen:99999999:1#1') && cliIdMa.status === 1,
    JSON.stringify({ loiCau: kqIdMa.loiCau, status: cliIdMa.status }),
  );

  // Kiểm CLI --m81 --chuong=85 và --doc-bang qua spawnSync trong tmp
  const cliOut = path.join(tmp, 'out-cli');
  const runGen = spawnSync(
    process.execPath,
    [path.join(GOC, 'scripts/ho-so-ma/goi-duyet.mjs'), '--m81', '--chuong=85', '--ngay=2026-11-27', `--ho-so=${hoSo81}`, `--luat=${luat81}`, `--out=${cliOut}`],
    { encoding: 'utf8' },
  );
  const runDoc = spawnSync(
    process.execPath,
    [path.join(GOC, 'scripts/ho-so-ma/goi-duyet.mjs'), `--doc-bang=${tepDienM81}`],
    { encoding: 'utf8' },
  );
  check(
    'CLI --m81 --chuong=85 và --doc-bang thoát 0, sinh đúng m81-ch85-2026-11-27.md',
    runGen.status === 0
    && fs.existsSync(path.join(cliOut, 'm81-ch85-2026-11-27.md'))
    && runDoc.status === 0
    && runDoc.stdout.includes('CAN_THEM: 1')
    && runDoc.stdout.includes('Kết luận:'),
    JSON.stringify({ gen: runGen.stdout + runGen.stderr, doc: runDoc.stdout + runDoc.stderr }),
  );

  // Kiểm Nhóm IV (HO_PHU -> [M81-HP-...]) và docBang đọc lại phiếu M81-HP-...
  const hoSo81Hp = path.join(tmp, 'ho-so-81-hp');
  fs.mkdirSync(path.join(hoSo81Hp, 'dieu-kien'), { recursive: true });
  const dk02KhongTapDu = dk02.map(({ tapDu: _td, tapDuNguon: _tdn, tapDuTrich: _tdt, ...rest }) => rest);
  fs.writeFileSync(path.join(hoSo81Hp, 'dieu-kien', '02.jsonl'), dk02KhongTapDu.map((x) => JSON.stringify(x)).join('\n') + '\n');
  const out81Hp = path.join(tmp, 'out-81-hp');
  const kqHp = goiM81('2026-11-27', { hoSo: hoSo81Hp, luat: luat81, docsDir: null, out: out81Hp });
  const mdHp = fs.readFileSync(kqHp.tepMd, 'utf8');
  const tepHpDien = path.join(out81Hp, 'm81-hp-dien.md');
  fs.writeFileSync(
    tepHpDien,
    mdHp.replace(
      /(### \[M81-HP-0201\][\s\S]*?)- \[ \] \*\*Đúng\*\*  - \[ \] \*\*Sai\*\*  - \[ \] \*\*Cần thêm\*\*\n- \*\*Kết luận người duyệt:\*\* /,
      '$1- [x] **Đúng**  - [ ] **Sai**  - [ ] **Cần thêm**\n- **Kết luận người duyệt:** Đã rà soát nghiệp vụ phân nhóm 02.01.',
    ),
    'utf8',
  );
  const ketHp = docBang(tepHpDien);
  check(
    'goiM81 & docBang (Nhóm IV HO_PHU): sinh phiếu [M81-HP-0201] khi thiếu nguồn tapDu và đọc lại chuẩn kết luận người duyệt',
    kqHp.soHoPhu === 1
    && kqHp.dsHoPhu[0]?.idPhieu === 'M81-HP-0201'
    && mdHp.includes('### [M81-HP-0201] bieu:0201 — Bảng anh em chưa chứng minh phủ kín')
    && ketHp.length === 1
    && ketHp[0].id === 'M81-HP-0201'
    && ketHp[0].dau === 'DUNG'
    && /02\.01/.test(ketHp[0].ketLuan),
    JSON.stringify({ soHoPhu: kqHp.soHoPhu, ketHp }),
  );
}

// ── C. Kiểm gói M-81 trên kho thật hiện hành (xuất ra tmp, không ghi vào repo) ──
{
  const LThat = napLuatCong(path.join(GOC, 'data', 'luat-goc'));
  const outKhoThat = path.join(tmp, 'out-kho-that');
  const kqThat = goiM81('2026-11-27', { L: LThat, out: outKhoThat });
  const mdThat = fs.readFileSync(kqThat.tepMd, 'utf8');
  const tokenCauTrongMd = [...new Set(
    [...mdThat.matchAll(/\b((?:gir|phan|chuong|nhom|pn|bieu|sen|wco|tb):[A-Za-z0-9:._-]+#\d+)\b/g)].map((m) => m[1]),
  )];
  const tokenCauMa = tokenCauTrongMd.filter((cid) => /^tb:/.test(cid) || LThat.chuCau(cid) === null);

  const phieu8182 = mdThat.split('### [M81-VC-847981-847982]')[1]?.split(/^### /m)[0] || '';
  const phieu8183 = mdThat.split('### [M81-VC-847981-847983]')[1]?.split(/^### /m)[0] || '';
  const cacMaVc8501 = [
    'M81-VC-85013130-85013160',
    'M81-VC-85013221-85013224',
    'M81-VC-85015211-85015212',
    'M81-VC-85015221-85015222',
    'M81-VC-85015231-85015232',
  ];
  const du5Phieu8501TuThan = cacMaVc8501.every((ma) => {
    const p = mdThat.split(`### [${ma}]`)[1]?.split(/^### /m)[0] || '';
    return p.includes('bieu:841520#1') && p.includes('Loại sử dụng cho người, trong xe có động cơ') && !p.includes('Như cặp #5');
  });

  check(
    'goiM81 trên kho thật 12 nhóm vàng: đúng 9 cặp VUNG_CHONG (39:1, 84:3, 85:5) + 11 cặp GIAI_CHONG chờ duyệt (85.17:4 + 85.43:7 = 17 bản ghi) + 3 bảng HO_PHU (8501, 870840, 870850) + 0 lỗi câu luật',
    kqThat.soVungChong === 9
    && kqThat.theoChuong['39']?.vungChong === 1
    && kqThat.theoChuong['84']?.vungChong === 3
    && kqThat.theoChuong['85']?.vungChong === 5
    && kqThat.soGiaiChong === 11
    && kqThat.soBanGhiGiaiChong === 17
    && kqThat.theoChuong['85']?.giaiChong === 11
    && kqThat.soHoPhu === 3
    && JSON.stringify(kqThat.dsHoPhu.map((x) => x.idPhieu)) === JSON.stringify(['M81-HP-8501', 'M81-HP-870840', 'M81-HP-870850'])
    && kqThat.theoChuong['85']?.hoPhu === 1
    && kqThat.theoChuong['87']?.hoPhu === 2
    && kqThat.soNghiaThuong > 0
    && kqThat.loiCau.length === 0
    && !mdThat.includes('không tìm thấy câu')
    && !mdThat.includes('CHUA_CHUNG_MINH_TACH với `bieu:0202`'),
    JSON.stringify({
      soVungChong: kqThat.soVungChong,
      soGiaiChong: kqThat.soGiaiChong,
      soBanGhiGiaiChong: kqThat.soBanGhiGiaiChong,
      soHoPhu: kqThat.soHoPhu,
      dsHoPhu: kqThat.dsHoPhu?.map((x) => x.idPhieu),
      soNghiaThuong: kqThat.soNghiaThuong,
      tongNghiaThuong: kqThat.tongNghiaThuong,
      loiCau: kqThat.loiCau,
      theoChuong: kqThat.theoChuong,
    }),
  );

  check(
    'goiM81 trên kho thật: 100% token id câu trong Markdown tồn tại trong data/luat-goc/ (0 id câu ma, 0 tb:)',
    tokenCauTrongMd.length > 0 && tokenCauMa.length === 0,
    JSON.stringify({ tongToken: tokenCauTrongMd.length, tokenCauMa }),
  );

  check(
    'goiM81 trên kho thật: [M81-VC-847981-847982] trích đúng nhom:8479:ct:66#1 (Máy phá gang), [M81-VC-847981-847983] dẫn đúng bieu:84798300#1 (0 sen ma), 5 phiếu 85.01 tự thân (0 "Như cặp #5")',
    phieu8182.includes('nhom:8479:ct:66#1')
    && phieu8182.includes('Máy phá gang và máy dập đặc biệt để đập vụn phế thải gang')
    && !phieu8182.includes('nhom:8479:ct:25#1')
    && phieu8183.includes('bieu:84798300#1')
    && !phieu8183.includes('sen:84798300:1#1')
    && !mdThat.includes('Như cặp #5')
    && du5Phieu8501TuThan,
    JSON.stringify({ ok8182: phieu8182.slice(0, 200), ok8183: phieu8183.slice(0, 200), du5Phieu8501TuThan }),
  );

  // Nếu docs/mong/duyet/m81-2026-11-27.md tồn tại trên đĩa, kiểm mọi token id câu trong tệp đó cũng tồn tại 100%
  const tepGoiCamKet = path.join(GOC, 'docs', 'mong', 'duyet', 'm81-2026-11-27.md');
  if (fs.existsSync(tepGoiCamKet)) {
    const mdCamKet = fs.readFileSync(tepGoiCamKet, 'utf8');
    const tokCamKet = [...new Set(
      [...mdCamKet.matchAll(/\b((?:gir|phan|chuong|nhom|pn|bieu|sen|wco|tb):[A-Za-z0-9:._-]+#\d+)\b/g)].map((m) => m[1]),
    )];
    const maCamKet = tokCamKet.filter((cid) => /^tb:/.test(cid) || LThat.chuCau(cid) === null);
    check(
      'docs/mong/duyet/m81-2026-11-27.md: 100% token id câu có thật trong kho luật gốc & đồng bộ bản sinh mới',
      maCamKet.length === 0 && mdCamKet === mdThat,
      JSON.stringify({ maCamKet, sameAsGenerated: mdCamKet === mdThat }),
    );
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
