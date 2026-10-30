#!/usr/bin/env node
/**
 * scripts/so-hoa-ranh-gioi.mjs — công cụ soạn + cổng máy ranh giới 6→8 số (plan L1-4a, #577). Tất định, KHÔNG gọi LLM:
 * agent soạn (AI) đọc gói soạn, điền dieuKienSo vào bản nháp; máy chặn; phiên Claude khác duyệt (L1-4c).
 *
 *   --goi      [--pn6=a,b | --dot=N] [--json]      gói soạn: cây, mục cần số hoá + chữ nguyên văn, từ vựng, luật
 *   --tao-nhap [--pn6=a,b | --dot=N] --phien=<id>  tạo khung nháp data/ho-so/ranh-gioi/<pn6>.json (không đè bản đã có)
 *   --kiem     [--pn6=a,b | --dot=N] [--json] [--khong-chan]
 *                                                  chạy 4 cổng (mặc định: mọi bản nháp đã có); đỏ ⇒ mã thoát 1
 *   --duyet    --pn6=X --phien=<id> [--ghi-chu=…]  nâng lên DUYET/CLAUDE_DUYET (phiên ≠ người soạn, cổng xanh, có hiệu chỉnh tiền lệ khi cần)
 *   --tra-ve   --pn6=X --phien=<id> --ly-do=…      trả về người soạn
 *   --ap-dung  --pn6=X                             đưa bản DUYET vào data/so-tay/<nhóm>.json
 *   --tom-tat                                      trạng thái 50 phân nhóm lát 1 (đợt, có nháp, trạng thái, số lỗi)
 *
 * Ghi qua lib/data-paths.js (HS_DATA_DIR cách ly khi test).
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const { dataPath, dataReadPath } = require('../lib/data-paths.js');

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
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

if (args.goi) {
  const ds = danhSach(); can(ds && ds.length, 'cần --pn6=… hoặc --dot=N');
  const goi = ds.map((p) => C.goiSoan(p));
  if (args.json) process.stdout.write(`${JSON.stringify(goi, null, 2)}\n`);
  else {
    for (const g of goi) {
      console.log(`# ${g.pn6} — ${g.ten.vi || g.ten.wco || ''}${g.canHieuChinhTienLe ? '  [CẦN BẢNG HIỆU CHỈNH TIỀN LỆ — L1-4b]' : ''}\n\n${g.cay}\n`);
      if (g.tangKhongMa.length) {
        console.log('!!! DỪNG — phân nhóm có TẦNG KHÔNG MÃ (tiêu đề không mã của biểu thuế mà cây theo chữ số làm mất). Cổng 1 sẽ chặn; không soạn tiếp, báo Claude:');
        for (const t of g.tangKhongMa) console.log(`    r${t.r} (gạch ${t.gach}) "${t.chu}" — dòng dưới: ${t.dongDuoi.join(', ')}`);
        console.log('');
      }
      for (const x of g.canSoHoa) console.log(`- ${x.ma} ${x.loai}${x.khongCanDieuKien ? ' (phần còn lại — không ghi điều kiện)' : ''}${x.chan ? ` [CHẶN: ${x.chan}]` : ''}\n${x.nguon.map((n) => `    ${n.nguon}: ${n.text.replace(/\s+/g, ' ').slice(0, 300)}`).join('\n')}`);
      console.log(`\nNguồn cấp phân nhóm: ${g.nguonPhanNhom.map((n) => n.nguon).join(', ') || '—'}; chú giải: ${g.chuGiai.map((n) => n.nguon).join(', ')}`);
      console.log(`Luật:\n${g.luat.map((l) => `  * ${l}`).join('\n')}\n`);
    }
    console.log(`Từ vựng (${goi[0].tuVung.length} khoá): ${goi[0].tuVung.map((k) => `${k.khoa}:${k.kieu}`).join(', ')}`);
  }
} else if (args['tao-nhap']) {
  const ds = danhSach(); can(ds && ds.length, 'cần --pn6=… hoặc --dot=N'); can(args.phien && args.phien !== true, 'cần --phien=<định danh>#soan-<nhãn>');
  { const lp = C.kiemPhien(args.phien, 'soan'); can(!lp, lp); }
  for (const p of ds) {
    if (docNhap(p)) { console.log(`${p}: đã có bản nháp — giữ nguyên`); continue; }
    console.log(`${p}: ${ghi(tepNhap(p), C.taoKhung(p, { phien: args.phien, ngay: homNay() }))}`);
  }
} else if (args.kiem) {
  const ds = danhSach() || moiBanNhap();
  let do_ = 0; const kq = [];
  for (const p of ds) {
    const b = docNhap(p);
    const r = b ? C.kiemRanhGioi(p, b) : { pn6: p, hopLe: false, loi: ['chua-co-ban-nhap'], canhBao: [], thongKe: {} };
    if (!r.hopLe) do_ += 1;
    kq.push({ ...r, trangThai: b?.trangThai || null });
  }
  if (args.json) process.stdout.write(`${JSON.stringify(kq, null, 2)}\n`);
  else {
    for (const r of kq) {
      console.log(`${r.hopLe ? 'XANH' : 'ĐỎ  '} ${r.pn6} ${r.trangThai || ''} dòng=${r.thongKe.soDong ?? '-'} có-đk=${r.thongKe.soDongCoDieuKien ?? '-'} tiêu-đề=${r.thongKe.soTieuDeCoDieuKien ?? '-'}/${r.thongKe.soTieuDe ?? '-'} vector=${r.thongKe.soVector ?? '-'}`);
      for (const l of r.loi) console.log(`    ✗ ${l}`);
      for (const c of r.canhBao) console.log(`    ! ${c}`);
    }
    console.log(`\n${kq.length - do_}/${kq.length} phân nhóm qua cổng.`);
  }
  if (do_ && !args['khong-chan']) process.exit(1);
} else if (args.duyet || args['tra-ve'] || args['ap-dung']) {
  const p = String(args.pn6 || '').replace(/\D/g, ''); can(p.length === 6, 'cần --pn6=<6 số>');
  const b = docNhap(p); can(b, `${p}: chưa có bản nháp`);
  try {
    if (args.duyet) { can(args.phien && args.phien !== true, 'cần --phien=<phiên soát>'); console.log(ghi(tepNhap(p), C.duyet(b, { phien: args.phien, ngay: homNay(), ghiChu: args['ghi-chu'] === true ? undefined : args['ghi-chu'] }))); }
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
      console.log(`đợt ${d} ${p}${C.canHieuChinh(p) ? ' [hiệu chỉnh]' : ''}: ${b ? `${b.trangThai} ${r.hopLe ? 'XANH' : `ĐỎ (${r.loi.length} lỗi)`}` : 'chưa có nháp'}`);
    }
  }
} else {
  console.error('Dùng: --goi | --tao-nhap | --kiem | --duyet | --tra-ve | --ap-dung | --tom-tat (xem đầu tệp)');
  process.exit(2);
}
