#!/usr/bin/env node
/**
 * scripts/test-dieu-khoan-tang2.mjs — kiểm tầng 2 (điều khoản chú giải Phần/Chương HS).
 *   (a) mọi id duy nhất                          — ĐỎ nếu trùng
 *   (b) mọi kieu thuộc tập hợp lệ, không còn CHUA_XEP — ĐỎ nếu sai
 *   (c) mọi nguyenVan (bỏ khác biệt khoảng trắng) có nguyên văn trong chu-giai-chuong.json ở đúng chương gan — CẢNH BÁO
 *   (d) mọi mã 4 chữ số trong dich là nhóm có thật (khoá của chu-giai-heading.json) — CẢNH BÁO
 *   (e) LOAI_TRU của cap "chuong", vung "chu_giai" phải có "không bao gồm"/"không áp dụng"/"loại trừ" — CẢNH BÁO
 *   (f) dan/nguyenVan dính đoạn TỔNG QUÁT        — ĐỎ nếu còn dính
 * Chạy: node scripts/test-dieu-khoan-tang2.mjs  → in "N ca xanh, M ca đỏ"; exit 1 nếu có đỏ.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docJson = (p) => JSON.parse(fs.readFileSync(path.join(GOC, p), 'utf8'));

const dieuKhoan = docJson('data/luat/dieu-khoan-tang2.json');
const chuGiaiChuong = docJson('data/chu-giai-chuong.json');
const chuGiaiHeading = docJson('data/chu-giai-heading.json');
const hsSections = docJson('data/hs-sections.json');

const KIEU_HOP_LE = new Set(['LOAI_TRU', 'DINH_NGHIA_PHAM_VI', 'QUY_TAC_PHAN_LOAI', 'DIEU_KIEN', 'KHAC']);
const CU_PHAP_E = /không bao gồm|không áp dụng|loại trừ/i;
const chuan = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

let xanh = 0;
let do_ = 0;
function ca(ten, dat, chiTiet) {
  if (dat) {
    xanh += 1;
    console.log(`PASS ${ten}`);
  } else {
    do_ += 1;
    console.log(`FAIL ${ten} — ${String(chiTiet).slice(0, 400)}`);
  }
}
function canhBao(ten, danhSach) {
  console.log(`CANH BAO ${ten}: ${danhSach.length} muc`);
  for (const dong of danhSach.slice(0, 10)) console.log(`   - ${dong}`);
  if (danhSach.length > 10) console.log(`   ... (con ${danhSach.length - 10} muc)`);
}

// (a) id duy nhất
{
  const dem = new Map();
  for (const x of dieuKhoan) dem.set(x.id, (dem.get(x.id) || 0) + 1);
  const trung = [...dem].filter(([, n]) => n > 1);
  ca('(a) mọi id là duy nhất', trung.length === 0, `${trung.length} id trùng, ví dụ: ${trung.slice(0, 5).map(([k, n]) => `${k}×${n}`).join(', ')}`);
}

// (b) kieu hợp lệ
{
  const sai = dieuKhoan.filter((x) => !KIEU_HOP_LE.has(x.kieu)).map((x) => `${x.id}=${x.kieu}`);
  ca('(b) mọi kieu thuộc tập hợp lệ', sai.length === 0, sai.slice(0, 10).join('; '));
  const conChua = dieuKhoan.filter((x) => x.kieu === 'CHUA_XEP').length;
  ca('(b) không còn CHUA_XEP', conChua === 0, `còn ${conChua} mục`);
}

// (c) nguyenVan có trong chú giải chương đúng gan (cảnh báo)
{
  const loi = [];
  for (const x of dieuKhoan) {
    const entry = chuGiaiChuong[x.gan];
    const truong = x.cap === 'phan' ? 'phan' : 'chuong';
    const vanBan = entry ? chuan(entry[truong]) : null;
    if (vanBan === null || !vanBan.includes(chuan(x.nguyenVan))) {
      loi.push(`${x.id} (gan=${x.gan}, truong=${truong})`);
    }
  }
  canhBao('(c) nguyenVan không khớp nguyên văn trong chu-giai-chuong', loi);
}

// (d) mã 4 chữ số trong dich là nhóm có thật (cảnh báo)
{
  const nhom = new Set(Object.keys(chuGiaiHeading));
  const loi = [];
  for (const x of dieuKhoan) {
    for (const ma of x.dich || []) {
      if (/^\d{4}$/.test(ma) && !nhom.has(ma)) loi.push(`${x.id} -> ${ma}`);
    }
  }
  canhBao('(d) mã dich 4 chữ số không phải nhóm có thật', loi);
}

// (e) LOAI_TRU chương chú giải phải có cụm loại trừ (cảnh báo)
{
  const loi = dieuKhoan
    .filter((x) => x.kieu === 'LOAI_TRU' && x.cap === 'chuong' && x.vung === 'chu_giai')
    .filter((x) => !CU_PHAP_E.test(x.dan || ''))
    .map((x) => x.id);
  canhBao('(e) LOAI_TRU chương thiếu cụm "không bao gồm/không áp dụng/loại trừ" trong dan', loi);
}

// (f) Không có điều khoản dính đoạn TỔNG QUÁT của WCO
{
  const dinhTongQuat = dieuKhoan
    .filter((x) => (x.dan && x.dan.includes('TỔNG QUÁT')) || (x.nguyenVan && x.nguyenVan.includes('TỔNG QUÁT')))
    .map((x) => x.id);
  ca(
    '(f) Không có điều khoản dính đoạn TỔNG QUÁT của WCO',
    dinhTongQuat.length === 0,
    `${dinhTongQuat.length} mục: ${dinhTongQuat.slice(0, 10).join(', ')}`,
  );
}

// (g) khoản Phần: apChoChuong phải đủ mọi Chương của Phần trong hs-sections.json
// (không dựng dải từ chương có trường `phan` — Chương 54 từng bị rơi vì phan rỗng)
{
  const chuongTheoGan = new Map();
  for (const s of hsSections.sections || []) {
    const chs = (s.chapters || []).map(String);
    if (!chs.length) continue;
    chuongTheoGan.set(chs[0], chs); // gan Phần = Chương đầu (50 → XI, 72 → XV, …)
  }
  const loi = [];
  let phanXi = 0;
  let phanXiDu54 = 0;
  for (const x of dieuKhoan) {
    if (x.cap !== 'phan') continue;
    const can = chuongTheoGan.get(String(x.gan));
    if (!can) continue;
    const co = (x.apChoChuong || []).map(String);
    const thieu = can.filter((c) => !co.includes(c));
    const thua = co.filter((c) => !can.includes(c));
    if (thieu.length || thua.length) {
      loi.push(`${x.id}: thieu=[${thieu.join(',')}] thua=[${thua.join(',')}]`);
    }
    if (String(x.gan) === '50') {
      phanXi += 1;
      if (co.includes('54')) phanXiDu54 += 1;
    }
  }
  ca(
    '(g) apChoChuong Phần khớp hs-sections (không rơi chương giữa dải)',
    loi.length === 0,
    `${loi.length} mục lệch, ví dụ: ${loi.slice(0, 5).join('; ')}`,
  );
  ca(
    '(g) Phần XI (gan 50): mọi khoản có Chương 54',
    phanXi > 0 && phanXiDu54 === phanXi,
    `${phanXiDu54}/${phanXi} khoản có "54"`,
  );
}

console.log(`${xanh} ca xanh, ${do_} ca đỏ`);
process.exit(do_ > 0 ? 1 : 0);
