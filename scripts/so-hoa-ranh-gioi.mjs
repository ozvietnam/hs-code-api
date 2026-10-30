#!/usr/bin/env node
/**
 * scripts/so-hoa-ranh-gioi.mjs — công cụ soạn + cổng máy ranh giới 6→8 số (plan L1-4a, #577). Tất định, KHÔNG gọi LLM:
 * agent soạn (AI) đọc gói soạn, viết SPEC khai báo, máy áp spec thành bản nháp và chặn; phiên Claude khác duyệt (L1-4c).
 * Quy trình từng bước cho thợ: docs/giao-viec/so-tay/QUY-TRINH-SO-HOA.md. Chạy --help để xem lệnh.
 *
 * Mã thoát: 0 xanh · 1 đỏ (sửa được) · 2 dùng sai lệnh / spec sai · 3 DỪNG (báo Claude, không tự xử lý).
 * Ghi qua lib/data-paths.js (HS_DATA_DIR cách ly khi test).
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const ML = require('../lib/ho-so/ma-loi.js');
const TV = require('../lib/tu-vung.js');
const DK = require('../lib/dieu-kien-so.js');
const { dataPath, dataReadPath } = require('../lib/data-paths.js');

const TRO_GIUP = `Số hoá ranh giới 6→8 số — scripts/so-hoa-ranh-gioi.mjs (quy trình: docs/giao-viec/so-tay/QUY-TRINH-SO-HOA.md)

Lệnh cho NGƯỜI SOẠN (thợ):
  --goi --pn6=<6 số> [--json]          gói soạn: cây, mục cần số hoá + chữ NGUYÊN VĂN, tầng không mã (nút <pn6>~r<dòng>; không đặt được ⇒ DỪNG), từ vựng, luật
  --tu-vung [--khoa=<khoá>] [--json]   khoá tu-vung@1: kiểu, op, đơn vị, GIÁ TRỊ HỢP LỆ + cách đọc
  --ap-spec=<tệp spec .json>           áp spec khai báo → data/ho-so/ranh-gioi/<pn6>.json rồi chạy cổng (KHÔNG sửa tay JSON nháp)
  --kiem --pn6=<6 số> [--json]         chạy 4 cổng; in lời giải thích + cách sửa dưới mỗi lỗi
  --giai-thich=<mã lỗi>                giải thích một mã lỗi/cảnh báo (dán nguyên dòng ✗ cũng được); không mã = liệt kê hết
  --tao-nhap --pn6=<6 số> --phien=<định danh>#soan-<nhãn>   khung nháp trống (không đè bản đã có; thường dùng --ap-spec)

Lệnh của CLAUDE (thợ KHÔNG chạy):
  --duyet --pn6=X --phien=<định danh>#soat-<nhãn> [--ghi-chu=…]   nâng DUYET/CLAUDE_DUYET (phiên ≠ người soạn, cổng xanh)
  --tra-ve --pn6=X --phien=… --ly-do=…                            trả về người soạn
  --ap-dung --pn6=X                                               đưa bản DUYET vào data/so-tay/<nhóm>.json
  --tom-tat                                                       trạng thái 50 phân nhóm lát 1

Spec (ranh-gioi-spec@1, JSON):
  { "phienBan": "ranh-gioi-spec@1", "pn6": "830220", "phien": "cursor:<mô hình>:<yyyymmddThhmm>#soan-830220",
    "dong8": { "83022010": { "dieuKienSo": [ {"fact":"duongKinh","op":">","value":100,"donVi":"mm"} ] } },
    "dieuKienNut": { "<id tiêu đề>": { "dieuKienSo": [...], "trich": "<lược bằng … nếu > 300 ký tự>" } },
    "chongLanVanBan": [ {"cap": ["<hsA>","<hsB>"], "lyDo": "… trích \\"chữ nhánh A\\" và \\"chữ nhánh B\\" …"} ],
    "ghiChuSoan": [ {"ma": "83022010", "loai": "QUYET_DINH", "ghiChu": "…"} ] }
  Mục không ghi "trich"/"nguon" ⇒ máy chép nguyên văn chữ của chính mục. "phanConLai": true cho phần còn lại có tên ("… khác")
  — được đứng một mình ({"dieuKienSo": [], "phanConLai": true}); "phanConLai": false = chữ "khác" không phải phần còn lại.
  loai ghi chú: ${C.LOAI_GHI_CHU.join(' | ')}. Thiếu khoá tu-vung ⇒ để trống dieuKienSo + loai THIEU_KHOA_TU_VUNG (+ khoaDeXuat).

Mã thoát: 0 xanh · 1 đỏ (sửa được) · 2 dùng sai lệnh/spec sai · 3 DỪNG (báo Claude).`;

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 1) {
  const m = argv[i].match(/^--([^=]+)(?:=(.*))?$/);
  if (!m) continue;
  // "--giai-thich x" / "--ap-spec x": giá trị là tham số kế tiếp (không bắt đầu bằng --).
  if (m[2] === undefined && ['giai-thich', 'ap-spec', 'pn6', 'phien', 'khoa'].includes(m[1]) && argv[i + 1] && !argv[i + 1].startsWith('--')) { args[m[1]] = argv[i + 1]; i += 1; } else args[m[1]] = m[2] ?? true;
}
const homNay = () => new Date().toISOString().slice(0, 10);
const tepNhap = (pn6) => path.join('ho-so', 'ranh-gioi', `${pn6}.json`);
const docNhap = (pn6) => { try { return JSON.parse(fs.readFileSync(dataReadPath(tepNhap(pn6)), 'utf8')); } catch { return null; } };
const ghi = (rel, obj) => { const p = dataPath(rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`); return p; };
function danhSach() {
  if (args.pn6) return String(args.pn6).split(',').map((x) => x.replace(/\D/g, '')).filter(Boolean);
  if (args.dot) return C.phanNhomCuaDot(Number(args.dot));
  return null;
}
function moiBanNhap() {
  const out = new Set();
  for (const d of [dataReadPath('ho-so', 'ranh-gioi'), dataPath('ho-so', 'ranh-gioi')]) {
    try { for (const f of fs.readdirSync(d)) if (/^\d{6}\.json$/.test(f)) out.add(f.slice(0, 6)); } catch { /* chưa có */ }
  }
  return [...out].sort();
}
const can = (cond, msg) => { if (!cond) { console.error(msg); process.exit(2); } };
const huongDan = (ma) => { const g = ML.giaiThich(ma); return g ? `      → ${g.giaiThich} Sửa: ${g.cachSua}` : null; };

/** In kết quả cổng của các phân nhóm; trả mã thoát (0 xanh, 1 đỏ, 3 DỪNG). */
function inKetQua(kq) {
  let ma = 0;
  for (const r of kq) {
    console.log(`${r.hopLe ? 'XANH' : 'ĐỎ  '} ${r.pn6} ${r.trangThai || ''} dòng=${r.thongKe.soDong ?? '-'} có-đk=${r.thongKe.soDongCoDieuKien ?? '-'} tiêu-đề=${r.thongKe.soTieuDeCoDieuKien ?? '-'}/${r.thongKe.soTieuDe ?? '-'} vector=${r.thongKe.soVector ?? '-'}`);
    const daGiai = new Set();
    const mot = (dau, l) => {
      console.log(`    ${dau} ${l}`);
      const g = ML.giaiThich(l); if (!g || daGiai.has(g.ma)) return;
      daGiai.add(g.ma); console.log(huongDan(l));
    };
    for (const l of r.loi) mot('✗', l);
    for (const c of r.canhBao) mot('!', c);
    if (r.dung?.length) {
      console.log(`    DỪNG — báo Claude trên issue, không tự xử lý: ${r.dung.join('; ')}`);
      ma = 3;
    } else if (!r.hopLe && ma === 0) ma = 1;
  }
  return ma;
}
function kiemVaIn(ds) {
  const kq = ds.map((p) => {
    const b = docNhap(p);
    const r = b ? C.kiemRanhGioi(p, b) : { pn6: p, hopLe: false, loi: ['chua-co-ban-nhap'], canhBao: [], dung: [], thongKe: {} };
    return { ...r, trangThai: b?.trangThai || null };
  });
  if (args.json) { process.stdout.write(`${JSON.stringify(kq, null, 2)}\n`); return kq.some((r) => r.dung?.length) ? 3 : kq.every((r) => r.hopLe) ? 0 : 1; }
  const ma = inKetQua(kq);
  console.log(`\n${kq.filter((r) => r.hopLe).length}/${kq.length} phân nhóm qua cổng.`);
  return ma;
}
const tomGiaTri = (k) => (k.giaTriHopLe ? `[${k.giaTriHopLe.join('|')}]` : '');
function inTuVung(dsKhoa) {
  const tv = TV.taiTuVung();
  const bd = tv.bietDanhDonVi || {};
  for (const k of dsKhoa) {
    const ops = DK.OP_THEO_KIEU[k.kieu] || [];
    let dong = `${k.khoa} (${k.kieu}) — ${k.nhanVi}; op: ${ops.join(' ')}`;
    if (k.kieu === 'SO') {
      const he = tv.heDonVi?.[k.heDonVi] || {};
      const bi = Object.entries(bd).filter(([, v]) => Object.prototype.hasOwnProperty.call(he, v)).map(([a]) => a);
      dong += `; donVi: ${Object.keys(he).join(', ')} (chuẩn ${k.donViChuan}; viết như chữ trích: ${[...new Set(bi)].join(', ')})`;
    }
    console.log(dong);
    const doc = (cd) => (cd ? [...(cd.vi || [])].join(' | ') : '');
    if (k.kieu === 'CO_KHONG') console.log(`    đọc CÓ: ${doc(k.cachDoc)}${k.cachDocKhong ? ` · đọc KHÔNG: ${doc(k.cachDocKhong)}` : ''}`);
    if (k.giaTriHopLe) for (const v of k.giaTriHopLe) console.log(`    ${v}: ${k.moTaGiaTri?.[v]?.nhanVi || v}${k.moTaGiaTri?.[v]?.cachDoc ? ` — đọc: ${doc(k.moTaGiaTri[v].cachDoc)}` : ''}`);
    if (k.viTri) console.log(`    viTri: ${k.viTri.map((v) => `${v}${k.moTaViTri?.[v]?.cachDoc ? ` (${doc(k.moTaViTri[v].cachDoc)})` : ''}`).join(', ')}`);
    if (k.kieu === 'TEN_LOAI' || k.kieu === 'CONG_DUNG') console.log('    value: chuỗi con NGUYÊN VĂN của câu trích (mảng = "hoặc"); so chữ tự do, không tất định');
  }
}
async function docSpec(p) {
  const tep = path.resolve(String(p));
  if (!fs.existsSync(tep)) { console.error(`không thấy tệp spec: ${p}`); process.exit(2); }
  if (/\.json$/i.test(tep)) { try { return JSON.parse(fs.readFileSync(tep, 'utf8')); } catch (e) { console.error(`spec không phải JSON hợp lệ: ${e.message}`); process.exit(2); } }
  const m = await import(pathToFileURL(tep).href);
  return m.default ?? m;
}

if (args.help || args.h || !argv.length) {
  console.log(TRO_GIUP);
  process.exit(args.help || args.h ? 0 : 2);
} else if (args['giai-thich']) {
  if (args['giai-thich'] === true) {
    for (const [k, v] of Object.entries(ML.MA_LOI)) console.log(`${k}${v.dung ? '  [DỪNG]' : ''}\n    ${v.giaiThich}\n    Sửa: ${v.cachSua}`);
  } else {
    const ma = String(args['giai-thich']).replace(/^\s*[✗!]\s*/, '').trim();
    const g = ML.giaiThich(ma);
    if (!g) { console.error(`không có giải thích cho "${ma}" — chạy --giai-thich để xem danh sách`); process.exit(2); }
    console.log(`${ma}\n  Máy thấy: ${g.giaiThich}\n  Sửa: ${g.cachSua}${g.dung ? '\n  DỪNG — điều kiện này người soạn không tự xử lý: báo Claude trên issue.' : ''}`);
  }
} else if (args['tu-vung']) {
  const tv = TV.taiTuVung();
  const ds = args.khoa && args.khoa !== true ? tv.khoa.filter((k) => k.khoa === args.khoa) : tv.khoa;
  can(ds.length, `không có khoá "${args.khoa}" trong tu-vung@1 — THIEU_KHOA_TU_VUNG: DỪNG, không tự đặt khoá`);
  if (args.json) process.stdout.write(`${JSON.stringify(ds, null, 2)}\n`); else inTuVung(ds);
} else if (args.goi) {
  const ds = danhSach(); can(ds && ds.length, 'cần --pn6=…');
  const goi = ds.map((p) => C.goiSoan(p));
  if (args.json) process.stdout.write(`${JSON.stringify(goi, null, 2)}\n`);
  else {
    for (const g of goi) {
      console.log(`# ${g.pn6} — ${g.ten.vi || g.ten.wco || ''}${g.canHieuChinhTienLe ? (g.coHieuChinhTienLe ? '  [CÓ CỜ HIỆU CHỈNH TIỀN LỆ — bảng L1-4b đã có mục: soạn theo chữ biểu, ghi LECH_TIEN_LE trỏ mục bảng]' : '  [CẦN BẢNG HIỆU CHỈNH TIỀN LỆ — bảng L1-4b chưa có mục cho PN6: DỪNG, Claude giữ]') : ''}\n\n${g.cay}\n`);
      const coNut = g.tangKhongMa.filter((t) => t.trangThai !== 'KHONG_DAT');
      const khongDat = g.tangKhongMa.filter((t) => t.trangThai === 'KHONG_DAT');
      if (coNut.length) {
        console.log('Tầng không mã của biểu thuế (tiêu đề không mã mà cây theo chữ số làm mất) — đã có nút trong cây ở trên; tầng có tên: khai dieuKienNut cho id:');
        for (const t of coNut) console.log(`    ${t.trangThai === 'CO_NUT' ? t.id : `r${t.r} trùng ${t.nut}`} (gạch ${t.gach}) "${t.chu}" — dòng dưới: ${t.dongDuoi.join(', ')}`);
        console.log('');
      }
      if (khongDat.length) {
        console.log('!!! DỪNG — phân nhóm có TẦNG KHÔNG MÃ không biểu diễn được trong cây. Cổng 1 sẽ chặn; không soạn tiếp, báo Claude:');
        for (const t of khongDat) console.log(`    r${t.r} (gạch ${t.gach}, ${t.lyDo}) "${t.chu}" — dòng dưới: ${t.dongDuoi.join(', ')}`);
        console.log('');
      }
      for (const x of g.canSoHoa) {
        const co = [x.khongCanDieuKien ? 'phần còn lại — KHÔNG ghi điều kiện' : null, x.chan ? `CHẶN: ${x.chan} — DỪNG` : null,
          x.nghiPhanConLai ? 'nghi phần còn lại có tên — cân nhắc "phanConLai": true' : null,
          x.nghiThieuKhoa ? `nghi THIẾU KHOÁ: ${x.nghiThieuKhoa.join('; ')} — kiểm --tu-vung, không có thì DỪNG` : null].filter(Boolean);
        console.log(`- ${x.ma} ${x.loai}${co.length ? ` (${co.join('; ')})` : ''}\n${x.nguon.map((n) => `    ${n.nguon} [${n.text.length} ký tự]: ${n.text.replace(/\s+/g, ' ')}`).join('\n')}`);
      }
      console.log(`\nNguồn cấp phân nhóm: ${g.nguonPhanNhom.map((n) => n.nguon).join(', ') || '—'}; chú giải: ${g.chuGiai.map((n) => n.nguon).join(', ')}`);
      console.log(`Luật:\n${g.luat.map((l) => `  * ${l}`).join('\n')}\n`);
    }
    console.log('Từ vựng tu-vung@1 (chi tiết + cách đọc: --tu-vung --khoa=<khoá>):');
    for (const k of goi[0].tuVung) console.log(`  ${k.khoa}: ${k.kieu} op ${(k.op || []).join(' ')}${k.donViChuan ? ` đơn vị ${k.donViChuan}` : ''} ${tomGiaTri(k)}`.trimEnd());
  }
} else if (args['ap-spec']) {
  can(args['ap-spec'] !== true, 'cần --ap-spec=<tệp spec .json>');
  const spec = await docSpec(args['ap-spec']);
  const pn6 = String(spec?.pn6 || '').replace(/\D/g, '');
  const cu = pn6.length === 6 ? docNhap(pn6) : null;
  const { banNhap, loi, dung } = C.apSpec(spec, cu, { ngay: homNay() });
  if (loi.length) {
    console.error(`${pn6 || '?'}: SPEC SAI — không ghi gì:`);
    for (const l of loi) { console.error(`    ✗ ${l}`); const h = huongDan(l); if (h) console.error(h); }
    process.exit(2);
  }
  if (dung.length) {
    const tb = `${pn6}: DỪNG — THIEU_KHOA_TU_VUNG, không ghi gì:\n${dung.map((d) => `    ✗ ${d}`).join('\n')}\n${huongDan('THIEU_KHOA_TU_VUNG')}`;
    console.error(tb); console.log(tb);
    process.exit(3);
  }
  console.log(`${pn6}: đã áp spec → ${ghi(tepNhap(pn6), banNhap)}`);
  process.exit(kiemVaIn([pn6]));
} else if (args['tao-nhap']) {
  const ds = danhSach(); can(ds && ds.length, 'cần --pn6=… hoặc --dot=N'); can(args.phien && args.phien !== true, 'cần --phien=<định danh>#soan-<nhãn>');
  { const lp = C.kiemPhien(args.phien, 'soan'); can(!lp, lp); }
  for (const p of ds) {
    if (docNhap(p)) { console.log(`${p}: đã có bản nháp — giữ nguyên`); continue; }
    console.log(`${p}: ${ghi(tepNhap(p), C.taoKhung(p, { phien: args.phien, ngay: homNay() }))}`);
  }
} else if (args.kiem) {
  const ma = kiemVaIn(danhSach() || moiBanNhap());
  if (ma && !args['khong-chan']) process.exit(ma);
} else if (args.duyet || args['tra-ve'] || args['ap-dung']) {
  const p = String(args.pn6 || '').replace(/\D/g, ''); can(p.length === 6, 'cần --pn6=<6 số>');
  const b = docNhap(p); can(b, `${p}: chưa có bản nháp`);
  try {
    if (args.duyet) { can(args.phien && args.phien !== true, 'cần --phien=<định danh>#soat-<nhãn>'); console.log(ghi(tepNhap(p), C.duyet(b, { phien: args.phien, ngay: homNay(), ghiChu: args['ghi-chu'] === true ? undefined : args['ghi-chu'] }))); }
    else if (args['tra-ve']) console.log(ghi(tepNhap(p), C.traVe(b, { phien: args.phien === true ? null : args.phien, ngay: homNay(), lyDo: args['ly-do'] === true ? '' : args['ly-do'] })));
    else {
      const h4 = p.slice(0, 4);
      const soTay = JSON.parse(fs.readFileSync(dataReadPath('so-tay', `${h4}.json`), 'utf8'));
      console.log(ghi(path.join('so-tay', `${h4}.json`), C.apDung(b, soTay)));
    }
  } catch (e) { console.error(`${p}: TỪ CHỐI — ${e.message}`); process.exit(1); }
} else if (args['tom-tat']) {
  for (let d = 1; d <= 5; d += 1) {
    for (const p of C.phanNhomCuaDot(d)) {
      const b = docNhap(p);
      const r = b ? C.kiemRanhGioi(p, b) : null;
      console.log(`đợt ${d} ${p}${C.canHieuChinh(p) ? ' [hiệu chỉnh]' : ''}: ${b ? `${b.trangThai} ${r.hopLe ? 'XANH' : `ĐỎ (${r.loi.length} lỗi)`}${r.dung?.length ? ' DỪNG' : ''}` : 'chưa có nháp'}`);
    }
  }
} else {
  console.error('Lệnh không rõ — chạy --help.');
  process.exit(2);
}
