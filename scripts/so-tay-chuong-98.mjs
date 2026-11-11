#!/usr/bin/env node
/**
 * scripts/so-tay-chuong-98.mjs — sinh KHUNG sổ tay `data/so-tay/98xx.json` cho Chương 98. TẤT ĐỊNH, KHÔNG gọi LLM.
 *
 * Vì sao có script riêng (#1109, OZV-374): Chương 98 không đi được đường soạn thường.
 *   - `scripts/gen-so-tay-lo.mjs:90` LOẠI HẲN chương 98 khỏi danh sách lô (`!h.startsWith('98')`) ⇒ không bao giờ có lô giao ngoài.
 *   - `scripts/build-so-tay.mjs` cần một lượt AI (hoặc `--tu-tep`) cho mỗi nhóm; chương 98 KHÔNG có chú giải nhóm
 *     (`data/chu-giai-heading.json` có khoá 98xx nhưng trường `nhom` trống), KHÔNG có tên WCO, KHÔNG có SEN ⇒ nguồn duy nhất
 *     là chính biểu thuế Tổng cục (`tax.<mã>` + `tuongUng.<mã>` của `lib/so-tay.js#sourcesFor`). AI không thêm được gì.
 *   - `--ap-dung` của `scripts/so-hoa-ranh-gioi.mjs:263` đọc THẲNG `data/so-tay/<nhóm>.json` ⇒ chưa có tệp thì ENOENT,
 *     nên 35 bản DUYET của lô L33 (PR #1230) nằm mồ côi: đúng trạng thái, vô hại, nhưng chưa nối vào đường chạy.
 *
 * Khung này KHÔNG phải sổ tay đầy đủ — chỉ liệt kê đủ các dòng 8 số của nhóm kèm câu trích NGUYÊN VĂN tên dòng trong biểu
 * (`nguon: tax.<mã>`), để `--ap-dung` có chỗ ghi `dieuKienSo` của bản ranh giới DUYET vào. Điều kiện phân loại THẬT vẫn do
 * bản ranh giới 6→8 số (người soát độc lập duyệt) mang tới; khung không tự khẳng định điều gì ngoài tên dòng.
 * Đo được (xem OZV-374): có khung mà CHƯA có bản ranh giới DUYET thì `chotDong8` đổi lý do
 * `nhom-chua-co-so-tay` → `ranh-gioi-chua-so-hoa` / `ranh-gioi-so-chu-khong-tat-dinh` và chốt 0 mã — khung KHÔNG tự chốt.
 *
 * Trường `maHsTuongUng` (mã hàng ở 97 chương của từng dòng 98) KHÔNG cần trường mới trong lược đồ sổ tay: nó đã là một khoá
 * tu-vung, đi vào `dong8[].dieuKienSo` qua `--ap-dung` như mọi điều kiện khác, và nguyên văn nằm ở nguồn `tuongUng.<mã>`
 * (`lib/so-tay.js:143`). Nhánh `h4.startsWith('98')` ở đó ĐỦ — không phải mở rộng.
 *
 *   node scripts/so-tay-chuong-98.mjs --nhom=9811,9812      # vài nhóm
 *   node scripts/so-tay-chuong-98.mjs --co-ranh-gioi        # mọi nhóm 98xx đã có bản ranh giới trong data/ho-so/ranh-gioi/
 *   thêm: --dry (chỉ in, không ghi) · --force (ghi lại nhóm đã có sổ tay)
 *         --luc=<ISO> (đặt `taoBoi.luc` thay vì lấy giờ máy) — để người soát TÍNH LẠI rồi so BYTE với bản đã commit:
 *           `--luc` là trường duy nhất không tất định, nên không có cờ này thì phép soát "tính lại, so byte"
 *           (cách duy nhất chứng minh mục trong PR không mồ côi — quy tắc 5) luôn báo lệch GIẢ ở mọi nhóm.
 *           `node scripts/so-tay-chuong-98.mjs --nhom=9811 --force --luc="$(node -e "…json taoBoi.luc…")"` ⇒ khớp 0 byte lệch.
 *
 * Ghi qua `lib/data-paths.js` (HS_DATA_DIR cách ly khi test). Mã thoát: 0 xanh · 1 có nhóm bị loại mục / lệch cây · 2 dùng sai lệnh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../lib/so-tay.js');
const T = require('../lib/hs-tree.js');
const { dataPath, dataReadPath } = require('../lib/data-paths.js');

const argv = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));

const nz = (v) => String(v == null ? '' : v).replace(/\D/g, '');

/**
 * `taoBoi.luc` — trường DUY NHẤT không tất định của khung. `--luc=<ISO>` cho người soát tính lại rồi so BYTE với bản
 * đã commit (quy tắc 5: dữ liệu trong PR phải chứng minh được là không mồ côi). Không có cờ thì lấy giờ máy như cũ.
 */
function chotLuc() {
  if (argv.luc === undefined) return new Date().toISOString();
  const t = Date.parse(String(argv.luc));
  if (!Number.isFinite(t)) { console.error('--luc phải là mốc thời gian ISO, ví dụ --luc=2026-11-11T19:57:00.229Z'); process.exit(2); }
  return new Date(t).toISOString();
}
const LUC = chotLuc();

/** Mọi nhóm 4 số của chương 98 có bản ranh giới 6→8 số đã soạn (bất kể trạng thái) — đó là các nhóm đáng nối trước. */
function nhomCoRanhGioi() {
  let ds = [];
  try { ds = fs.readdirSync(dataReadPath('ho-so', 'ranh-gioi')); } catch { ds = []; }
  return [...new Set(ds.filter((f) => /^98\d{4}\.json$/.test(f)).map((f) => f.slice(0, 4)))].sort();
}

/**
 * Khung sổ tay của một nhóm 98xx: đủ dòng 8 số trong cây, câu trích = tên dòng NGUYÊN VĂN của biểu (`tax.<mã>`).
 * Không có `phamVi`/`dieuKienVao`/`loaiTru`/`phanBiet`/`tieuChi6`: chương 98 không có chú giải/SEN để trích, mà
 * `lib/so-tay.js#checkItem` (đúng luật) loại mọi mục không trích được nguyên văn ⇒ khai trống thật thà hơn bịa.
 */
function khungNhom(h4) {
  const la = T.tree().codes.filter((c) => c.startsWith(h4)).sort();
  if (!la.length) return { h4, loi: ['nhom-khong-co-dong-8-so'] };
  const src = S.sourcesFor(h4);
  const dong8 = [];
  const thieuNguon = [];
  for (const hs of la) {
    const trich = src[`tax.${hs}`];
    if (!trich) { thieuNguon.push(hs); continue; }
    dong8.push({
      hs,
      // Khung chưa biết điều kiện: `--ap-dung` của bản ranh giới DUYET sẽ thay cả `dieuKien` + `dieuKienSo`.
      dieuKien: 'khung Chương 98 — điều kiện do bản ranh giới 6→8 số đã duyệt điền',
      tieuChi: null,
      nguon: `tax.${hs}`,
      trich,
      loaiKhac: S.isLoaiKhac(hs),
    });
  }
  const raw = { nhom: h4, dieuKienVao: [], loaiTru: [], phanBiet: [], tieuChi6: [], dong8, cay: { tenDien: [] } };
  const { soTay, loai, tong, dat } = S.verifySoTay(raw, h4);
  const kc = S.kiemCay(soTay, h4);
  const out = {
    ...soTay,
    taoBoi: { provider: 'scripts/so-tay-chuong-98.mjs', model: null, luc: LUC, ms: 0 },
    kiemTra: { tong, dat, loai: loai.length, nguonBiCat: [] },
  };
  return { h4, soTay: out, loai, tong, dat, cayLoi: kc.loi, thieuNguon, soLa: la.length };
}

const only = argv.nhom ? String(argv.nhom).split(',').map(nz).filter((h) => h.length === 4) : null;
const list = only || (argv['co-ranh-gioi'] ? nhomCoRanhGioi() : null);
if (!list || !list.length) {
  console.error('cần --nhom=9811,9812 hoặc --co-ranh-gioi (xem đầu tệp để biết vì sao Chương 98 có script riêng)');
  process.exit(2);
}
if (list.some((h) => !h.startsWith('98'))) { console.error('script này CHỈ cho Chương 98'); process.exit(2); }

let xau = 0;
let daGhi = 0;
for (const h4 of list) {
  const rel = path.join('so-tay', `${h4}.json`);
  let coRoi = false;
  try { coRoi = fs.existsSync(dataReadPath(rel)); } catch { coRoi = false; }
  if (coRoi && !argv.force) { console.log(`${h4}: GIỮ — đã có sổ tay (dùng --force để ghi lại)`); continue; }
  const r = khungNhom(h4);
  if (r.loi) { xau += 1; console.log(`${h4}: LOI — ${r.loi.join('; ')}`); continue; }
  const canhBao = [
    ...(r.loai.length ? [`${r.loai.length} mục bị loại: ${r.loai.map((x) => `${x.kind}:${x.lyDo}`).slice(0, 3).join('; ')}`] : []),
    ...(r.cayLoi.length ? [`lệch cây: ${r.cayLoi.slice(0, 3).join('; ')}`] : []),
    ...(r.thieuNguon.length ? [`${r.thieuNguon.length} dòng không có tên trong biểu: ${r.thieuNguon.slice(0, 3).join(', ')}`] : []),
  ];
  if (r.loai.length || r.cayLoi.length) {
    xau += 1;
    console.log(`${h4}: BỎ (không ghi) — ${canhBao.join(' | ')}`);
    continue;
  }
  const dong = `${h4}: ${r.soTay.dong8.length}/${r.soLa} dòng 8 số, ${r.dat}/${r.tong} mục kiểm được nguồn${canhBao.length ? ` | ${canhBao.join(' | ')}` : ''}`;
  if (argv.dry) { console.log(`${dong} (--dry, không ghi)`); continue; }
  const p = dataPath(rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(r.soTay, null, 1)}\n`);
  daGhi += 1;
  console.log(`${dong} → ${p}`);
}
console.log(`khung Chương 98: ${daGhi} nhóm đã ghi, ${xau} nhóm bị bỏ`);
process.exit(xau ? 1 : 0);
