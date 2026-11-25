#!/usr/bin/env node
/**
 * scripts/goi-soan-tieu-chi-6.mjs — GÓI SOẠN và lệnh ÁP `tieuChi6` khuôn g6@1 (cạnh C10 / C13 của đồ thị tri thức HS).
 * Tất định, KHÔNG gọi LLM. Hướng dẫn cho người / AI soạn: docs/giao-viec/do-thi/SOAN-TIEU-CHI-6-SO.md.
 *
 *   node scripts/goi-soan-tieu-chi-6.mjs --nhom=8481                 in gói soạn (JSON) ra màn hình
 *   node scripts/goi-soan-tieu-chi-6.mjs --nhom=8481,8412 --out=<thư mục>   ghi <thư mục>/<nhóm>.json
 *   node scripts/goi-soan-tieu-chi-6.mjs --ap=<tệp JSON> [--thu]     chạy cổng scripts/kiem-tieu-chi-6.mjs; 0 lỗi thì ghi vào
 *                                                                    data/so-tay/<nhóm>.json (--thu: chỉ kiểm, không ghi)
 * Tệp --ap: { "nhom": "8481", "tieuChi6": [ … ] }. Mã thoát: 0 xong · 1 cổng đỏ (không ghi gì) · 2 dùng sai lệnh.
 * Ghi xong phải dựng lại số đếm bảng cạnh: node scripts/dung-bang-canh.mjs --ghi (commit cùng PR).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Tính TRƯỚC khi chdir: `argv[1]` tương đối được giải theo thư mục lúc khởi động, không theo GOC.
const laChinh = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
process.chdir(GOC);
const G6 = require('../lib/do-thi/tieu-chi-6.js');
const S = require('../lib/so-tay.js');
const { dataPath, dataReadPath } = require('../lib/data-paths.js');
const { inKetQua } = await import('./kiem-tieu-chi-6.mjs');

const thamSo = (ten) => { const a = process.argv.find((x) => x.startsWith(`--${ten}=`)); return a ? a.slice(ten.length + 3) : null; };
const co = (c) => process.argv.includes(c);
const THU_TU_TRUONG = ['hs6', 'thuTu', 'dieuKien', 'fact', 'op', 'value', 'donVi', 'chieu', 'viTri', 'tuKhoa', 'dieuKienTru', 'kiemChung', 'phanConLai', 'chuaSoHoa', 'uuTien', 'tienLe', 'nguon', 'trich', 'nguonLoai'];

/** Mục đã qua cổng → hình dạng lưu trong sổ tay: khoá theo thứ tự cố định, nhãn AI_DA_KIEM (máy đã kiểm trích; CHƯA ai duyệt). */
export function chuanMuc(x) {
  const y = { ...x, hs6: String(x.hs6).replace(/\D/g, ''), nguonLoai: 'AI_DA_KIEM' };
  if (y.phanConLai !== true && y.chuaSoHoa === undefined && y.donVi === undefined) y.donVi = null;
  return Object.fromEntries(THU_TU_TRUONG.filter((k) => y[k] !== undefined).map((k) => [k, y[k]]));
}

/** Bản soạn → danh sách mục lưu trong sổ tay: thuTu do MÁY xếp (lib/do-thi/tieu-chi-6.js#thuTuMay), sắp theo thuTu rồi theo thứ tự soạn. */
export function mucLuu(h4, tieuChi6) {
  return G6.ganThuTu(h4, tieuChi6).map((x, i) => ({ x: chuanMuc(x), i })).sort((a, b) => a.x.thuTu - b.x.thuTu || a.i - b.i).map((m) => m.x);
}

/** Áp một bản soạn đã qua cổng vào sổ tay của nhóm. Trả { ghi: boolean, kq, tep }. Không ghi khi cổng đỏ hoặc sổ tay hỏng sau khi ghép. */
export function apVaoSoTay(banSoan, { thu = false } = {}) {
  const h4 = String(banSoan?.nhom || '').replace(/\D/g, '');
  if (h4.length !== 4) throw new Error('tệp --ap thiếu "nhom" (4 số)');
  const kq = G6.kiemTieuChi6(h4, banSoan.tieuChi6);
  if (kq.loi.length) return { ghi: false, kq, h4 };
  const tepDoc = dataReadPath('so-tay', `${h4}.json`);
  if (!fs.existsSync(tepDoc)) throw new Error(`nhóm ${h4} chưa có sổ tay (data/so-tay/${h4}.json) — soạn sổ tay nhóm trước`);
  const st = JSON.parse(fs.readFileSync(tepDoc, 'utf8'));
  const muc = mucLuu(h4, banSoan.tieuChi6);
  const moi = { ...st, tieuChi6: muc };
  // Sổ tay sau khi ghép phải qua đúng máy kiểm của `npm test` (scripts/check-so-tay.mjs).
  const v = S.verifySoTay(moi, h4);
  if (v.loai.length) { for (const l of v.loai) kq.loi.push({ ma: 'KHUON_SAI', hs6: l.item?.hs6 || null, muc: null, chiTiet: `máy kiểm sổ tay (lib/so-tay.js) loại mục ${l.kind}: ${l.lyDo}` }); return { ghi: false, kq, h4 }; }
  moi.dungTuNguon = [...new Set([...(st.dungTuNguon || []), ...muc.map((x) => x.nguon), ...muc.map((x) => x.uuTien?.nguon).filter(Boolean)])].sort();
  moi.kiemTra = { ...(st.kiemTra || {}), tong: v.tong, dat: v.dat, loai: 0, tieuChi6: { khuon: G6.KHUON, soMuc: muc.length, soPhanNhom: new Set(muc.map((x) => x.hs6)).size, cong: 'scripts/kiem-tieu-chi-6.mjs' } };
  const tep = dataPath('so-tay', `${h4}.json`);
  if (!thu) fs.writeFileSync(tep, `${JSON.stringify(moi, null, 2)}\n`, 'utf8');
  return { ghi: !thu, kq, h4, tep: path.relative(GOC, tep) };
}

// `laChinh` đã tính ở đầu tệp (trước `process.chdir`).
if (laChinh) {
  const tepAp = thamSo('ap'); const nhom = thamSo('nhom');
  if (tepAp) {
    let ban;
    try { ban = JSON.parse(fs.readFileSync(path.resolve(tepAp), 'utf8')); } catch (e) { console.error(`không đọc được tệp --ap: ${e.message}`); process.exit(2); }
    let r;
    try { r = apVaoSoTay(ban, { thu: co('--thu') }); } catch (e) { console.error(e.message); process.exit(2); }
    inKetQua(r.h4, r.kq);
    if (r.kq.loi.length) { console.log(`✗ KHÔNG ghi: ${r.kq.loi.length} lỗi. Sửa tệp soạn rồi chạy lại.`); process.exit(1); }
    console.log(r.ghi ? `✓ đã ghi ${r.tep}. Chạy tiếp: node scripts/dung-bang-canh.mjs --ghi` : '✓ qua cổng (--thu: không ghi).');
  } else if (nhom) {
    const ds = nhom.split(',').map((s) => s.replace(/\D/g, '')).filter((s) => s.length === 4);
    if (!ds.length) { console.error('Cần --nhom=<4 số>'); process.exit(2); }
    const out = thamSo('out');
    for (const h4 of ds) {
      const goi = G6.goiSoan(h4);
      if (goi.phanNhom.length < 2) { console.error(`${h4}: ${goi.phanNhom.length} phân nhóm 6 số — không cần tieuChi6`); process.exitCode = 2; continue; }
      const chuoi = `${JSON.stringify(goi, null, 1)}\n`;
      if (!out) { process.stdout.write(chuoi); continue; }
      fs.mkdirSync(path.resolve(out), { recursive: true });
      const f = path.join(path.resolve(out), `${h4}.json`);
      fs.writeFileSync(f, chuoi, 'utf8');
      console.error(`${h4}: ${goi.phanNhom.length} phân nhóm, ${Object.keys(goi.nguon).length} nguồn, ${goi.thongBaoPhanLoai.length} thông báo, ${goi.toKhaiMau.length} tờ khai mẫu, ${chuoi.length} ký tự → ${path.relative(GOC, f)}`);
    }
  } else { console.error('Dùng: --nhom=<4 số>[,…] [--out=<thư mục>]  |  --ap=<tệp JSON> [--thu]'); process.exit(2); }
}
