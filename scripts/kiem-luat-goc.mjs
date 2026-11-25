#!/usr/bin/env node
// scripts/kiem-luat-goc.mjs — cổng máy cho data/luat-goc/*.jsonl (khuôn nut-luat@1, docs/mong/khuon-nut-luat.md). Tất định, không mạng, không AI.
//   node scripts/kiem-luat-goc.mjs [kho…]            không nêu kho: mọi kho đang có
//   LUAT_GOC_TXT=<thư mục>    đối chiếu nguyên văn từng câu với <kho>.txt, hoặc (kho lấy từ PDF chú giải chi tiết) mọi cgct-hs2022*.txt.
//                             Đặt biến mà không có bản chữ nào cho kho ⇒ ĐỎ, không âm thầm bỏ qua. Không đặt ⇒ dòng kết quả ghi CHƯA ĐỐI CHIẾU.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = fileURLToPath(new URL('..', import.meta.url));
const THU_MUC = path.join(GOC, 'data/luat-goc');
const LOAI = new Set(['QUY_TAC', 'TEN', 'CHU_GIAI', 'CHU_GIAI_PHAN_NHOM', 'KHAI_QUAT', 'CHU_GIAI_CHI_TIET', 'SEN', 'Y_KIEN_WCO', 'THONG_BAO']);
const LOP = new Set(['LUAT', 'HUONG_DAN', 'TIEN_LE']);
const D = '(?::[0-9]{1,3}|:[a-zđ]{1,3}|:ij|:[ivx]{1,5}|:[A-Z])+';
export const NGU_PHAP = new RegExp([
  `^gir:[1-6](?::[a-c])?(?::ct:\\d+)?$`,
  `^phan:[IVX]+(?::(?:cg|cgpn)${D}|:kq:\\d+)?$`,
  `^chuong:\\d{2}(?::(?:cg|cgpn|cgbs)${D}|:kq:\\d+|:pc:[IVX]+(?::kq:\\d+)?)?$`,
  `^nhom:\\d{4}:ct:\\d+$`, `^pn:\\d{6}:ct:\\d+$`, `^sen:(?:\\d{4,8}|chuong:\\d{2}|phan:[IVX]+|md):\\d+$`, `^wco:\\d{6}:\\d+$`, `^bieu:\\d{2,8}(?::td\\d+)*$`, `^tb:[\\w.-]+:\\d{4,8}$`,
].join('|'));
const KHO_CGCT = new Set(['phan', 'chuong', 'nhom', 'phan-nhom']);
/** Làm phẳng bản chữ: bỏ dòng chỉ có số trang ở đầu / cuối trang, nối dòng. Không bỏ chữ nào khác. */
export function phang(tho) {
  return String(tho).split('\f').map((t) => { const d = t.split('\n'); const rong = (x) => !x.trim() || /^\s*[—–-]?\s*\d{1,4}\s*[—–-]?\s*$/.test(x); while (d.length && rong(d[0])) d.shift(); while (d.length && rong(d[d.length - 1])) d.pop(); return d.join('\n'); }).join('\n');
}
/** Các bản chữ để đối chiếu một kho; [] khi không có. */
export function docBanChu(thuMuc, kho) {
  const rieng = path.join(thuMuc, `${kho}.txt`);
  const ds = fs.existsSync(rieng) ? [rieng] : KHO_CGCT.has(kho) && fs.existsSync(thuMuc) ? fs.readdirSync(thuMuc).filter((f) => /^cgct-hs2022.*\.txt$/.test(f)).map((f) => path.join(thuMuc, f)) : [];
  return ds.map((f) => chuanSo(phang(fs.readFileSync(f, 'utf8'))));
}
const gon = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
// So nguyên văn: khoảng trắng quanh dấu nối không tính (bản in ngắt dòng "cao-\nlanh"); mọi chữ khác phải khớp.
const chuanSo = (s) => gon(s).replace(/ ?([-–—/]) ?/g, '$1');

/** @returns {{loi: string[], canhBao: string[], soNut: number}} */
export function kiemKho(ten, dong, { vanBan = null, kyVong = null } = {}) {
  const loi = []; const canhBao = []; const ids = new Map(); const nut = [];
  dong.forEach((l, i) => {
    let x; try { x = JSON.parse(l); } catch { loi.push(`dòng ${i + 1}: không phải JSON`); return; }
    nut.push(x); const o = x.id || `dòng ${i + 1}`;
    if (!NGU_PHAP.test(x.id || '')) loi.push(`${o}: id sai ngữ pháp`);
    if (ids.has(x.id)) loi.push(`${o}: trùng id`); ids.set(x.id, x);
    if (!LOAI.has(x.loai)) loi.push(`${o}: loai lạ "${x.loai}"`);
    if (!LOP.has(x.lop)) loi.push(`${o}: lop lạ "${x.lop}"`);
    const v = x.nguyenVan;
    if (typeof v !== 'string' || !gon(v)) { loi.push(`${o}: thiếu nguyên văn`); return; }
    if (x.doanSau !== undefined) loi.push(`${o}: bỏ doanSau, tách thành nút …:ket`);
    if (v !== v.normalize('NFC')) loi.push(`${o}: chưa NFC`);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f�]/.test(v)) loi.push(`${o}: ký tự hỏng`);
    if (/(?:^|\n)\s*\d{1,4}\s*(?:\n|$)/.test(v) && x.loai !== 'TEN') canhBao.push(`${o}: nghi dính số trang`);
    const ch = /^(?:chuong:|nhom:|pn:)(\d{2})/.exec(x.id)?.[1];
    if (ch) for (const m of v.matchAll(/(?:^|\n)\s*Chương\s+(\d{1,2})\s*\n/g)) if (Number(m[1]) !== Number(ch)) loi.push(`${o}: dính tiêu đề Chương ${m[1]}`);
    if (!x.nguon?.vanBan || !x.nguon?.ban) loi.push(`${o}: thiếu nguon.vanBan / nguon.ban`);
    if (!('trang' in (x.nguon || {}))) loi.push(`${o}: thiếu nguon.trang (không biết thì null)`);
    if (!x.hieuLuc || !('tu' in x.hieuLuc) || !('den' in x.hieuLuc)) loi.push(`${o}: thiếu hieuLuc.tu / den`);
    if (vanBan && vanBan.length && !vanBan.some((b) => b.includes(chuanSo(v)))) {
      const cau = chuanSo(v).split(/(?<=[.;:])\s+/).filter((c) => c.length >= 12); const truot = cau.filter((c) => !vanBan.some((b) => b.includes(c)));
      if (truot.length) loi.push(`${o}: không nguyên văn — "${truot[0].slice(0, 80)}"`);
    }
  });
  for (const x of nut) if (x.cha != null && !ids.has(x.cha)) loi.push(`${x.id}: cha "${x.cha}" không có`);
  if (kyVong) for (const [id, vi] of Object.entries(kyVong)) if (!ids.has(id)) loi.push(`thiếu nút bắt buộc ${id} (${vi})`);
  return { loi, canhBao, soNut: nut.length };
}

function main() {
  const co = fs.existsSync(THU_MUC) ? fs.readdirSync(THU_MUC).filter((f) => f.endsWith('.jsonl')).map((f) => f.slice(0, -6)) : [];
  const kho = process.argv.slice(2).length ? process.argv.slice(2) : co; let do_ = 0;
  const kv = path.join(THU_MUC, 'bat-buoc.json'); const tatKv = fs.existsSync(kv) ? JSON.parse(fs.readFileSync(kv, 'utf8')) : {};
  for (const k of kho) {
    const f = path.join(THU_MUC, `${k}.jsonl`);
    if (!fs.existsSync(f)) { console.log(`FAIL ${k}: chưa có tệp`); do_ += 1; continue; }
    const banChu = process.env.LUAT_GOC_TXT ? docBanChu(process.env.LUAT_GOC_TXT, k) : null;
    if (banChu && !banChu.length) { console.log(`FAIL ${k}: đã đặt LUAT_GOC_TXT nhưng không có bản chữ cho kho này (cần ${k}.txt)`); do_ += 1; continue; }
    const r = kiemKho(k, fs.readFileSync(f, 'utf8').split('\n').filter((x) => x.trim()), { vanBan: banChu, kyVong: tatKv[k] || null });
    console.log(`${r.loi.length ? 'FAIL' : 'PASS'} ${k}: ${r.soNut} nút, ${r.loi.length} lỗi, ${r.canhBao.length} cảnh báo — ${banChu ? `đối chiếu ${banChu.length} bản chữ` : 'CHƯA ĐỐI CHIẾU nguyên văn'}`);
    for (const l of r.loi.slice(0, 40)) console.log(`  ✗ ${l}`); for (const l of r.canhBao.slice(0, 10)) console.log(`  ! ${l}`);
    do_ += r.loi.length ? 1 : 0;
  }
  process.exit(do_ ? 1 : 0);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
