// scripts/test-ho-so-ma-tra.mjs — test lib/ho-so-ma/tra.js (M-77, #1969).
// Dữ liệu GIẢ khớp cấu trúc cây thật: bieu:76 (cha null) ← bieu:7605 ← bieu:760510; ch76 → Phần XV.
// Câu luật = nguyenVan của nút; bản ghi cau {id, tu, den} cắt câu; van = sha256(câu).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { phieuVanDe, xayChiMuc, kiemVan } = require('../lib/ho-so-ma/tra.js');
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

let pass = 0, fail = 0;
const check = (n, c, d = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.error(`FAIL ${n} ${d}`); } };

// ── dựng dữ liệu giả khớp cây thật ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ho-so-ma-tra-'));
const luat = path.join(tmp, 'luat-goc');
const hoSo = path.join(tmp, 'ho-so-ma');
fs.mkdirSync(path.join(luat, 'cau'), { recursive: true });
for (const thu of ['phan', 'chuong', 'nhom', 'phan-nhom', 'dong']) fs.mkdirSync(path.join(hoSo, thu), { recursive: true });

const chuNhom = 'Tấm, tấm phổ dụng, thanh và que nhôm, hợp kim nhôm';
const vanDong = 'Dây điện và cáp điện cách điện (kể cả loại đã tráng men cách điện hoặc mạ lớp cách điện)';
fs.writeFileSync(path.join(luat, 'phan.jsonl'), JSON.stringify({ id: 'phan:XV', loai: 'TEN', nguyenVan: 'Nhôm và các sản phẩm từ nhôm' }) + '\n');
fs.writeFileSync(path.join(luat, 'chuong.jsonl'), JSON.stringify({ id: 'chuong:76', loai: 'TEN', nguyenVan: 'Nhôm và các sản phẩm bằng nhôm' }) + '\n');
fs.writeFileSync(path.join(luat, 'bieu.jsonl'), [
  JSON.stringify({ id: 'bieu:76', nguyenVan: 'Nhôm và các sản phẩm bằng nhôm' }),
  JSON.stringify({ id: 'bieu:7605', cha: 'bieu:76', nguyenVan: chuNhom }),
  JSON.stringify({ id: 'bieu:760510', cha: 'bieu:7605', nguyenVan: vanDong }),
  JSON.stringify({ id: 'bieu:76051010', cha: 'bieu:760510', nguyenVan: vanDong }),
].join('\n') + '\n');
// Câu: bieu:7605#1 cắt cả mô tả nhóm; bieu:760510#1 cắt đúng câu dây/cáp
fs.writeFileSync(path.join(luat, 'cau', 'bieu.jsonl'), [
  JSON.stringify({ id: 'bieu:7605#1', tu: 0, den: chuNhom.length }),
  JSON.stringify({ id: 'bieu:760510#1', tu: 0, den: vanDong.length }),
  JSON.stringify({ id: 'bieu:76051010#1', tu: 0, den: vanDong.length }),
].join('\n') + '\n');

// Bản ghi vấn đề: dòng 760510 KHONG_DUOC_LA (câu của chính nút) + BỎ QUA ở nút nhóm
fs.writeFileSync(path.join(hoSo, 'dong', '76051010.jsonl'), JSON.stringify({
  id: 'hs:bieu:76051010:1', nut: 'bieu:76051010', loai: 'KHONG_DUOC_LA',
  dieuKien: 'Không phải dây điện, cáp điện đã cách điện',
  trich: vanDong, cau: 'bieu:76051010#1', den: ['bieu:8544'],
  duKien: ['cách điện'], lop: 'HUONG_DAN', nguon: 'Chú giải chi tiết HS 2022', van: sha256(vanDong), trangThai: 'KHOP',
}) + '\n');
fs.writeFileSync(path.join(hoSo, 'nhom', '7605.jsonl'), JSON.stringify({
  id: 'hs:bieu:7605:1', nut: 'bieu:7605', loai: 'BO_QUA',
  cau: 'bieu:7605#1', lyDo: 'Tên nhóm chỉ để dễ tra cứu, không tạo điều kiện', van: sha256(chuNhom),
}) + '\n');

const opts = { luat, hoSo };

// ── 1. phieuVanDe trả hồ sơ nhóm theo cấp ──
const phieu = phieuVanDe('76051010', opts);
check('phieuVanDe: không khongCo', !phieu.khongCo, JSON.stringify(phieu).slice(0, 200));
check('phieuVanDe: ma chuẩn 8 số', phieu.ma === '76051010');
check('phieuVanDe: đường đi PHAN>CHUONG>PHAN_CHUONG>NHOM>DONG', phieu.duong.map((c) => c.cap).join('>') === 'PHAN>CHUONG>NHOM>PHAN_NHOM>DONG', JSON.stringify(phieu.duong.map((c) => c.cap)));
check('phieuVanDe: mọi cấp có nut', phieu.duong.every((c) => !!c.nut));
check('phieuVanDe: cấp có nút trên main đều có tên (PC chưa nạp ten là null cho phép)', phieu.duong.filter((c) => c.cap !== 'PHAN_CHUONG').every((c) => !!c.ten));
const capDong = phieu.duong.find((c) => c.cap === 'DONG');
check('phieuVanDe: vấn đề dòng trỏ câu luật (cau+van+trich)', capDong.vanDe[0].cau === 'bieu:76051010#1' && capDong.vanDe[0].trich === vanDong && !!capDong.vanDe[0].van);
check('phieuVanDe: KHONG_DUOC_LA có den đích', JSON.stringify(capDong.vanDe[0].den) === '["bieu:8544"]');
const capNhom = phieu.duong.find((c) => c.cap === 'NHOM');
check('phieuVanDe: BỎ QUA không lẫn vào vanDe (chỉ đếm soBoQua)', capNhom.vanDe.length === 0 && capNhom.soBoQua === 1);
check('phieuVanDe: canhBao chỉ-từ-luật', /CHỈ TỪ LUẬT/.test(phieu.canhBao || ''));

// ── 2. cấp thiếu nói thiếu ──
const phieu4 = phieuVanDe('760510', opts);
const capPhan = phieu4.duong.find((c) => c.cap === 'PHAN');
check('cấp thiếu: thieu=true kèm ghiChuThieu (PHAN không có bản ghi)', capPhan.thieu === true && /chưa có dữ liệu/.test(capPhan.ghiChuThieu || ''), JSON.stringify(capPhan));

// ── 3. ca ngược ──
check('ngược: mã 5 số → khongCo', phieuVanDe('76051', opts).khongCo === true);
check('ngược: mã không trong biểu → khongCo', phieuVanDe('99999999', opts).khongCo === true);
check('ngược: thiếu tham số → khongCo', phieuVanDe('', opts).khongCo === true);

// ── 4. tra lần 2 < 50 ms (nhớ đệm) ──
const t0 = process.hrtime.bigint();
phieuVanDe('76051010', opts);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
check(`tra lần 2 < 50 ms (thực ${ms.toFixed(2)} ms)`, ms < 50);

// ── 5. vân tay hợp lệ khi câu nguyên vẹn ──
const trc = kiemVan('76051010', opts);
check('vân tay: hopLe=1, capNhat=true', trc.hopLe === 1 && trc.le.length === 0 && trc.capNhat === true, JSON.stringify(trc));

// ── 6. vân tay: câu luật đổi ⇒ vấn đề đánh dấu CŨ (trên bản sao khác để né nhớ đệm) ──
const tmpMut = fs.mkdtempSync(path.join(os.tmpdir(), 'ho-so-ma-mut-'));
const luatMut = path.join(tmpMut, 'luat-goc');
const hoSoMut = path.join(tmpMut, 'ho-so-ma');
fs.cpSync(luat, luatMut, { recursive: true });
fs.cpSync(hoSo, hoSoMut, { recursive: true });
// kéo dài câu (thêm chữ vào nguyenVan của nút) mà bản ghi cau giữ den cũ ⇒ câu cắt ra KHÁC cũ
const bieuMut = path.join(luatMut, 'bieu.jsonl');
const dongMut = fs.readFileSync(bieuMut, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((x) => (x.id === 'bieu:76051010' ? { ...x, nguyenVan: x.nguyenVan.replace('cách điện hoặc mạ', 'cách ly hoặc tráng') } : x));
fs.writeFileSync(bieuMut, dongMut.map((x) => JSON.stringify(x)).join('\n') + '\n');
const sau = kiemVan('76051010', { luat: luatMut, hoSo: hoSoMut });
check('vân tay: câu luật đổi ⇒ le có mục "câu luật đã đổi" (capNhat=false)', sau.capNhat === false && sau.le.length === 1, JSON.stringify(sau));

// ── 7. xayChiMuc ──
const chi = xayChiMuc(opts);
check('xayChiMuc: bắt được mã 76051010', chi.ma.includes('76051010'));

// ── 8. dữ liệu thật chương 76 (thẻ M-73): chưa nạp thì bỏ qua ──
const thuc = path.join(ROOT, 'data', 'ho-so-ma');
if (fs.existsSync(path.join(thuc, 'dong', '76051010.jsonl')) || fs.existsSync(path.join(thuc, 'nhom', '7605.jsonl'))) {
  const phieuThat = phieuVanDe('760510', { luat: path.join(ROOT, 'data', 'luat-goc'), hoSo: thuc });
  check('dữ liệu thật ch76: hồ sơ có đường đi', Array.isArray(phieuThat.duong) && phieuThat.duong.length >= 3);
} else {
  console.log('(bỏ qua ca dữ liệu thật chương 76 — thẻ M-73 chưa nạp)');
}

fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(tmpMut, { recursive: true, force: true });
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
