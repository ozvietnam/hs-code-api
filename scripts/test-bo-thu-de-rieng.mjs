#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Kiểm tra bộ thử để riêng G0-3 (scripts/dung-bo-thu-de-rieng.mjs):
 *   - Chạy lại với hạt giống 20261121 ra 3 tệp khớp TỪNG BYTE với bản đã commit.
 *   - Đúng 300 dòng de-rieng-300.jsonl (150 nhóm top 80% + 150 phần còn lại; ≤ 3 dòng / phân nhóm 6 số).
 *   - Không dòng nào trong de-rieng-300 trùng tên chuẩn hoá với dòng oz-gold ngoài danh sách loại.
 *   - Đúng 100 dòng chua-tung-khai-100.jsonl; không dòng nào có nhóm 4 số xuất hiện trong oz-gold; ≤ 2 dòng / nhóm 4 số.
 *   - Đọc khớp khuôn của công cụ đo scripts/do-phan-loai-tom-tat.mjs (không gọi AI, không mạng).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chuanTen, chuanChu, khoaNoiDung, taiDanhSachLoai, laCaKin, locCaKin } from './dung-bo-thu-de-rieng.mjs';

const require = createRequire(import.meta.url);
const { holdoutKey } = require('../lib/holdout.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CA_DO = path.join(ROOT, 'scripts', 'ca-do');
const SCRIPT = path.join(ROOT, 'scripts', 'dung-bo-thu-de-rieng.mjs');

const text = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const nz = (v) => String(v || '').replace(/\D/g, '');

let passed = 0;
let failed = 0;
const check = (name, ok, extra) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || extra === undefined ? '' : ` — ${JSON.stringify(extra).slice(0, 400)}`}`);
  if (ok) passed += 1;
  else failed += 1;
};

const taxData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
const ozLines = fs.readFileSync(path.join(ROOT, 'data', 'oz-gold-final.jsonl'), 'utf8').split('\n').filter((l) => l.trim().length > 0);
const parseJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).map((l) => JSON.parse(l));

// ── 1. Tất định từng byte ────────────────────────────────────────────────────────────────
const tmp1 = fs.mkdtempSync(path.join(os.tmpdir(), 'g03-a-'));
const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'g03-b-'));
const files = ['de-rieng-300.jsonl', 'chua-tung-khai-100.jsonl', 'de-rieng-danh-sach-loai.json'];
try {
  execFileSync('node', [SCRIPT, `--ra=${tmp1}`], { stdio: 'pipe' });
  execFileSync('node', [SCRIPT, `--ra=${tmp2}`], { stdio: 'pipe' });
  for (const f of files) {
    const committed = fs.readFileSync(path.join(CA_DO, f));
    const gen1 = fs.readFileSync(path.join(tmp1, f));
    const gen2 = fs.readFileSync(path.join(tmp2, f));
    check(`tất định từng byte: ${f} khớp giữa 2 lượt chạy và với bản đã commit`, committed.equals(gen1) && gen1.equals(gen2), { committedLen: committed.length, gen1Len: gen1.length, gen2Len: gen2.length });
  }
} finally {
  fs.rmSync(tmp1, { recursive: true, force: true });
  fs.rmSync(tmp2, { recursive: true, force: true });
}

// ── 2. Kiếm chứng cấu trúc + phân tầng de-rieng-300.jsonl ─────────────────────────────────
const rows300 = parseJsonl(path.join(CA_DO, 'de-rieng-300.jsonl'));
const rows100 = parseJsonl(path.join(CA_DO, 'chua-tung-khai-100.jsonl'));
const danhSachLoai = JSON.parse(fs.readFileSync(path.join(CA_DO, 'de-rieng-danh-sach-loai.json'), 'utf8'));

check('de-rieng-300.jsonl có đúng 300 dòng', rows300.length === 300, rows300.length);
check('de-rieng-300: mọi dòng đủ 5 khoá khuôn + maDung 8 số còn trong biểu thuế + tenHang ≥ 2 ký tự', rows300.every((r) => (
  ['tenHang', 'chatLieu', 'congDung', 'maDung', 'nguonDong'].every((k) => k in r)
  && typeof r.tenHang === 'string' && r.tenHang.trim().length >= 2
  && /^\d{8}$/.test(r.maDung) && Boolean(taxData[r.maDung])
  && /^oz-gold:\d+$/.test(String(r.nguonDong || ''))
)));

// Tái tính tập PN6 tầng 80% trên oz-gold-final.jsonl để kiểm đối xứng độc lập
const h4Oz = new Set();
const ozRecords = [];
const pn6Counts = new Map();
let ozValidCount = 0;
for (let i = 0; i < ozLines.length; i += 1) {
  const dong = i + 1;
  const r = JSON.parse(ozLines[i]);
  const hs = nz(r.hsCode || r.hs || r.maHs);
  if (hs.length >= 4) h4Oz.add(hs.slice(0, 4));
  const ten = text(r.tenHang || r.productName || r.name);
  const nt = chuanTen(ten);
  ozRecords.push({ dong, r, hs, ten, nt });
  if (ten.length >= 2 && nt && /^\d{8}$/.test(hs) && taxData[hs]) {
    ozValidCount += 1;
    const pn6 = hs.slice(0, 6);
    pn6Counts.set(pn6, (pn6Counts.get(pn6) || 0) + 1);
  }
}
const pn6Tang80 = new Set();
let cum = 0;
for (const [pn6, c] of [...pn6Counts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))) {
  if (cum < 0.8 * ozValidCount) { pn6Tang80.add(pn6); cum += c; }
}
const nTang80 = rows300.filter((r) => pn6Tang80.has(r.maDung.slice(0, 6))).length;
const nTang20 = rows300.filter((r) => !pn6Tang80.has(r.maDung.slice(0, 6))).length;
check('de-rieng-300: đúng 150 dòng tầng 80% + 150 dòng phần còn lại', nTang80 === 150 && nTang20 === 150, { nTang80, nTang20 });

const demPn6 = new Map();
for (const r of rows300) demPn6.set(r.maDung.slice(0, 6), (demPn6.get(r.maDung.slice(0, 6)) || 0) + 1);
const maxPn6 = Math.max(...demPn6.values());
check('de-rieng-300: mỗi phân nhóm 6 số ≤ 3 dòng', maxPn6 <= 3, maxPn6);

const norm300 = new Set(rows300.map((r) => chuanTen(r.tenHang)));
check('de-rieng-300: 300 tên chuẩn hoá phân biệt hoàn toàn', norm300.size === 300, norm300.size);

// ── 3. Chống rò rỉ sang phần còn lại của oz-gold ────────────────────────────────────────
const dongLoaiSet = new Set(danhSachLoai.dongOzGold);
const khoaHoldoutSet = new Set(danhSachLoai.khoaHoldout);
const tenChuanSet = new Set(danhSachLoai.tenChuan);

const chonCoTrongLoai = rows300.every((r) => {
  const dong = Number(String(r.nguonDong).split(':')[1]);
  const k = holdoutKey({ hsCode: r.maDung, tenHang: r.tenHang });
  return dongLoaiSet.has(dong) && khoaHoldoutSet.has(k) && tenChuanSet.has(chuanTen(r.tenHang));
});
check('danh sách loại chứa đủ 300 dòng được chọn (dongOzGold + khoaHoldout + tenChuan)', chonCoTrongLoai);

const roRiConLai = ozRecords.filter((x) => !dongLoaiSet.has(x.dong) && x.nt && (norm300.has(x.nt) || tenChuanSet.has(x.nt)));
check('0 dòng oz-gold ngoài danh sách loại trùng tên chuẩn hoá với de-rieng-300', roRiConLai.length === 0, roRiConLai.slice(0, 5));

const chuaDuocBaoGom = ozRecords.filter((x) => !khoaHoldoutSet.has(holdoutKey(x.r)) && x.nt && norm300.has(x.nt));
check('0 dòng oz-gold ngoài khoaHoldout trùng tên chuẩn hoá với de-rieng-300', chuaDuocBaoGom.length === 0, chuaDuocBaoGom.slice(0, 5));

// Ca âm tính: bộ kiểm phát hiện ngay khi có 1 dòng trùng tên bị sót khỏi danh sách loại
const dongGia = ozRecords.find((x) => dongLoaiSet.has(x.dong) && x.nt);
const loaiThieu1 = new Set(danhSachLoai.dongOzGold.filter((d) => d !== dongGia.dong));
const batThieu = ozRecords.some((x) => !loaiThieu1.has(x.dong) && norm300.has(x.nt));
check('ca âm tính: bỏ 1 dòng khỏi danh sách loại → phát hiện trùng tên chuẩn hoá ngay', batThieu === true);

// ── 4. Kiểm chứng chua-tung-khai-100.jsonl ───────────────────────────────────────────────
check('chua-tung-khai-100.jsonl có đúng 100 dòng', rows100.length === 100, rows100.length);
check('chua-tung-khai-100: đủ {tenHang, maDung, nguonDong}, maDung 8 số còn trong biểu', rows100.every((r) => (
  ['tenHang', 'maDung', 'nguonDong'].every((k) => k in r)
  && typeof r.tenHang === 'string' && r.tenHang.trim().length >= 2
  && /^\d{8}$/.test(r.maDung) && Boolean(taxData[r.maDung])
  && typeof r.nguonDong === 'string' && r.nguonDong.trim().length > 0
)));

const coTrongOz = rows100.filter((r) => h4Oz.has(r.maDung.slice(0, 4)));
check('chua-tung-khai-100: 0 dòng có nhóm 4 số xuất hiện trong oz-gold', coTrongOz.length === 0, coTrongOz.slice(0, 5));

const demH4 = new Map();
for (const r of rows100) demH4.set(r.maDung.slice(0, 4), (demH4.get(r.maDung.slice(0, 4)) || 0) + 1);
const maxH4 = Math.max(...demH4.values());
check('chua-tung-khai-100: mỗi nhóm 4 số ≤ 2 dòng', maxH4 <= 2, maxH4);

const norm100 = new Set(rows100.map((r) => chuanTen(r.tenHang)));
check('chua-tung-khai-100: 100 tên chuẩn hoá phân biệt, không trùng de-rieng-300', norm100.size === 100 && [...norm100].every((n) => !norm300.has(n)));

// ── 5. Khuôn chạy scripts/do-phan-loai-tom-tat.mjs ───────────────────────────────────────
const payloadsOk = [...rows300, ...rows100].every((c) => {
  const body = { tenHang: c.tenHang, ...(c.chatLieu ? { chatLieu: c.chatLieu } : {}), ...(c.congDung ? { congDung: c.congDung } : {}), debug: true };
  return typeof body.tenHang === 'string' && body.tenHang.trim().length >= 2 && /^\d{8}$/.test(nz(c.maDung));
});
check('cả 400 dòng hợp lệ khuôn payload của scripts/do-phan-loai-tom-tat.mjs', payloadsOk);

// ── 6. S-7: Khoá nội dung + hàm dùng chung laCaKin/locCaKin bất biến khi xáo dòng ────────
const khoaNoiDungSet = new Set(Array.isArray(danhSachLoai.khoaNoiDung) ? danhSachLoai.khoaNoiDung : []);
check(
  'S-7 danh sách loại có đủ khoaLoaiChinh, khoaNoiDung, soKhoaNoiDungLoai, ghiChuDongOzGold',
  Array.isArray(danhSachLoai.khoaLoaiChinh)
    && danhSachLoai.khoaLoaiChinh.includes('tenChuan')
    && danhSachLoai.khoaLoaiChinh.includes('khoaNoiDung')
    && Array.isArray(danhSachLoai.khoaNoiDung)
    && danhSachLoai.khoaNoiDung.length === danhSachLoai.soKhoaNoiDungLoai
    && khoaNoiDungSet.size === danhSachLoai.soKhoaNoiDungLoai
    && danhSachLoai.soKhoaNoiDungLoai > 0
    && typeof danhSachLoai.ghiChuDongOzGold === 'string'
    && danhSachLoai.ghiChuDongOzGold.length > 0,
  {
    khoaLoaiChinh: danhSachLoai.khoaLoaiChinh,
    soKhoaNoiDungLoai: danhSachLoai.soKhoaNoiDungLoai,
    len: danhSachLoai.khoaNoiDung?.length,
  },
);

const dsTai = taiDanhSachLoai();
check(
  'S-7 taiDanhSachLoai() cache đường dẫn mặc định và laCaKin/locCaKin xử lý đầu vào rỗng an toàn',
  dsTai === taiDanhSachLoai()
    && dsTai.tenChuanSet.size === danhSachLoai.tenChuan.length
    && dsTai.khoaNoiDungSet.size === danhSachLoai.khoaNoiDung.length
    && chuanChu('  Nước   Ép  ') === 'nước ép'
    && laCaKin(null) === false
    && locCaKin(null).length === 0,
);

const mauThu = rows300[0];
check(
  'S-7 laCaKin khớp cả khi chỉ có tenChuanSet hoặc chỉ có khoaNoiDungSet',
  laCaKin(mauThu, { tenChuanSet: dsTai.tenChuanSet, khoaNoiDungSet: new Set() })
    && laCaKin(mauThu, { tenChuanSet: new Set(), khoaNoiDungSet: dsTai.khoaNoiDungSet })
    && !laCaKin({ tenHang: 'hang chua tung ton tai xyz 9999', maDung: '99999999' }, dsTai),
);

const ozRawRows = ozRecords.map((x) => x.r);
const khoa300 = new Set(rows300.map((r) => khoaNoiDung(r)));
const ozConLaiMoi = locCaKin(ozRawRows);
const soLoaiMoi = ozRawRows.length - ozConLaiMoi.length;
const soLoaiCu = ozRecords.filter((x) => dongLoaiSet.has(x.dong)).length;
const roRiTenMoi = ozConLaiMoi.filter((r) => norm300.has(chuanTen(text(r.tenHang || r.productName || r.name)))).length;
const roRiKhoaMoi = ozConLaiMoi.filter((r) => khoa300.has(khoaNoiDung(r))).length;
const caKinNhanDu300 = rows300.every((r) => laCaKin(r));

check(
  `S-7 (a) locCaKin trên oz-gold gốc: loại ${soLoaiMoi} dòng (khoá cũ dongOzGold: ${soLoaiCu}), 0/300 tên chuẩn sót, 0 khoaNoiDung sót, 300/300 khớp laCaKin`,
  roRiTenMoi === 0 && roRiKhoaMoi === 0 && caKinNhanDu300 && soLoaiMoi === danhSachLoai.soDongLoai,
  { soLoaiMoi, soLoaiCu, roRiTenMoi, roRiKhoaMoi, caKinNhanDu300 },
);

const xaoTatDinh = (arr, seed = 20261121) => {
  const out = [...arr];
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const khoaBiLoaiGoc = new Set(ozRawRows.filter((r) => laCaKin(r)).map((r) => khoaNoiDung(r)));
const tmpShuffle = fs.mkdtempSync(path.join(os.tmpdir(), 's7-shuffle-'));
try {
  const tmpImport = path.join(tmpShuffle, 'import-only');
  fs.mkdirSync(tmpImport, { recursive: true });
  const probeScript = path.join(tmpShuffle, 'probe-import.mjs');
  fs.writeFileSync(
    probeScript,
    `import { locCaKin } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};\nconsole.log(typeof locCaKin);\n`,
  );
  const outImport = execFileSync(
    'node',
    [probeScript, `--ra=${tmpImport}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
  check(
    'S-7 import dung-bo-thu-de-rieng.mjs không kích hoạt CLI dựng/ghi tệp',
    outImport === 'function' && fs.readdirSync(tmpImport).length === 0,
    { outImport, files: fs.readdirSync(tmpImport) },
  );

  const shuffledLines = xaoTatDinh(ozLines);
  const daDoiThuTu = shuffledLines.some((l, idx) => l !== ozLines[idx]);
  check('S-7 (b) bản sao tạm oz-gold-final.jsonl đã đổi thứ tự dòng', daDoiThuTu && shuffledLines.length === ozLines.length);

  const shuffledPath = path.join(tmpShuffle, 'oz-gold-final-shuffled.jsonl');
  fs.writeFileSync(shuffledPath, `${shuffledLines.join('\n')}\n`);

  const shuffledRecords = fs.readFileSync(shuffledPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l, idx) => {
      const r = JSON.parse(l);
      const nt = chuanTen(text(r.tenHang || r.productName || r.name));
      return { dong: idx + 1, r, nt };
    });

  const shuffledRawRows = shuffledRecords.map((x) => x.r);
  const shuffledConLaiMoi = locCaKin(shuffledRawRows);
  const soLoaiXaoMoi = shuffledRawRows.length - shuffledConLaiMoi.length;
  const khoaBiLoaiXao = new Set(shuffledRawRows.filter((r) => laCaKin(r)).map((r) => khoaNoiDung(r)));
  const cungTapKhoa = khoaBiLoaiXao.size === khoaBiLoaiGoc.size && [...khoaBiLoaiGoc].every((k) => khoaBiLoaiXao.has(k));
  const roRiTenXaoMoi = shuffledConLaiMoi.filter((r) => norm300.has(chuanTen(text(r.tenHang || r.productName || r.name)))).length;
  const roRiKhoaXaoMoi = shuffledConLaiMoi.filter((r) => khoa300.has(khoaNoiDung(r))).length;

  check(
    `S-7 (b) xáo dòng oz-gold: locCaKin loại đúng ${soLoaiXaoMoi} dòng (khớp ${soLoaiMoi}), cùng tập khoaNoiDung, 0/300 tên chuẩn sót`,
    soLoaiXaoMoi === soLoaiMoi && cungTapKhoa && roRiTenXaoMoi === 0 && roRiKhoaXaoMoi === 0,
    { soLoaiXaoMoi, soLoaiMoi, cungTapKhoa, roRiTenXaoMoi, roRiKhoaXaoMoi },
  );

  // Ca âm tính: lọc theo số dòng cũ dongOzGold trên bản sao đã xáo → lộ > 200 ca giữ riêng
  const shuffledConLaiCu = shuffledRecords.filter((x) => !dongLoaiSet.has(x.dong));
  const roRiCuKhiXao = shuffledConLaiCu.filter((x) => x.nt && norm300.has(x.nt)).length;
  const tenBiLoCuKhiXao = new Set(shuffledConLaiCu.filter((x) => x.nt && norm300.has(x.nt)).map((x) => x.nt)).size;
  check(
    `S-7 (b âm tính) lọc theo số dòng cũ dongOzGold khi xáo dòng bị rò ${roRiCuKhiXao} dòng (${tenBiLoCuKhiXao}/300 tên chuẩn) > 200`,
    roRiCuKhiXao > 200,
    { roRiCuKhiXao, tenBiLoCuKhiXao },
  );
} finally {
  fs.rmSync(tmpShuffle, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
