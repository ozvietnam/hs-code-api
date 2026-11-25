#!/usr/bin/env node
/**
 * scripts/luat-goc/tt31-test.mjs — M-10: kiểm data/luat-goc/doi-chieu-tt31/{phan,chuong}.jsonl.
 * Tất định, không mạng. Trong CI: kiểm phủ, khuôn, và kiểm lại kết luận GIONG/khác bằng phép so viết riêng (không dùng lại tt31.py).
 * Ngoài CI: LUAT_GOC_TXT_M10=~/luat-goc-txt-m10 thì so nguyên văn vi/en với bản chữ từng trang Công báo, và kiểm mọi chữ trong khối chú giải đều có chỗ đứng.
 */
import fs from 'node:fs';
import path from 'node:path';
import { boKiem, GOC } from '../lib-luat.mjs';

const { kiem, xong } = boKiem('tt31-test');
const docL = (p) => fs.readFileSync(path.join(GOC, p), 'utf8').split('\n').filter((x) => x.trim()).map((l) => JSON.parse(l));
const LA_CG = (id) => ['cg', 'cgpn', 'cgbs'].includes(id.split(':')[2]);
const KQ = ['GIONG', 'KHAC_CHU', 'KHAC_NGHIA_NGHI', 'THIEU_O_TT31', 'THIEU_O_KHO'];
const KL = ['KHAC_NGHIA', 'CUNG_NGHIA', 'LOI_IN', 'KHONG_RO'];
const BK = ['TT31', 'KHO', 'CA_HAI', 'KHONG_BAN_NAO'];

const kho = []; const hang = [];
for (const f of ['phan', 'chuong']) {
  const k = docL(`data/luat-goc/${f}.jsonl`).filter((n) => LA_CG(n.id)); const h = docL(`data/luat-goc/doi-chieu-tt31/${f}.jsonl`);
  kiem(`${f}: mỗi nút cg/cgpn/cgbs đúng một dòng, đúng thứ tự kho (${k.length})`,
    JSON.stringify(h.filter((x) => x.kq !== 'THIEU_O_KHO').map((x) => x.id)) === JSON.stringify(k.map((x) => x.id)));
  kho.push(...k); hang.push(...h);
}
const chuKho = new Map(kho.map((n) => [n.id, n.nguyenVan])); const theoId = new Map(hang.map((h) => [h.id, h]));
kiem('không trùng id', theoId.size === hang.length);
kiem('kq đúng danh mục', hang.every((h) => KQ.includes(h.kq) && Array.isArray(h.khac)));
kiem('mọi dòng có trang + số Công báo', hang.every((h) => Number.isInteger(h.trangCongBao) && /^\d{3} \+ \d{3}$/.test(h.soCongBao)),
  hang.filter((h) => !Number.isInteger(h.trangCongBao)).map((h) => h.id).join(','));
kiem('mọi dòng có vi và en (trừ bảng in dạng ảnh)', hang.every((h) => (h.vi && h.en) || (h.kq === 'THIEU_O_TT31' && h.bangAnh === true)));

// mốc: chữ vi/en mở đầu bằng đúng số khoản của id (hai bản cùng một khoản)
const mocDau = (s) => (/^\(?\s*([A-Za-z]{1,4}|\d{1,2})\s*[.)]|^(\d{1,2})(?: \(|$)/.exec(s || '') || []).slice(1).find(Boolean);
const sai = hang.filter((h) => {
  const p = h.id.split(':'); if (!h.vi || p.at(-1) === 'ket' || p.at(-2) === 'ket') return false;
  return mocDau(h.vi) !== p.at(-1) || mocDau(h.en) !== p.at(-1);
}).map((h) => `${h.id} vi=${mocDau(h.vi)} en=${mocDau(h.en)}`);
kiem('vi và en mở đầu bằng đúng số khoản của id', sai.length === 0, sai.slice(0, 5).join(' | '));

// GIONG / khác: so lại độc lập (chỉ chữ cái, chữ số, %)
const tron = (s) => s.normalize('NFKC').toLowerCase().replace(/(\d),(?=\d)/g, '$1.').replace(/(\d)\s*(?:°|o)\s*c(?![\p{L}])/gu, '$1c').replace(/[^\p{L}\p{N}%]/gu, '');
const lech = []; 
for (const h of hang) {
  if (!h.vi || h.kq === 'THIEU_O_KHO') continue;
  const g = tron(chuKho.get(h.id)) === tron(h.vi);
  if (h.kq === 'GIONG' && !g) lech.push(`${h.id}: GIONG mà chữ khác`);
  if (h.kq !== 'GIONG' && g && !h.kqMay) lech.push(`${h.id}: ${h.kq} mà chữ giống`);
}
kiem('kết luận GIONG / khác khớp phép so độc lập', lech.length === 0, lech.slice(0, 6).join(' | '));

kiem('mọi KHAC_NGHIA_NGHI, THIEU_* đã đọc tay: có ketLuan, banKhopAnh, nhanXet',
  hang.filter((h) => !['GIONG', 'KHAC_CHU'].includes(h.kq)).every((h) => KL.includes(h.ketLuan) && BK.includes(h.banKhopAnh) && h.nhanXet?.length > 5));
// số trong chữ khác nhau thì không được nằm ở KHAC_CHU
const so = (s) => [...s.normalize('NFKC').replace(/(\d),(?=\d)/g, '$1.').matchAll(/\d+(?:\.\d+)*/g)].map((m) => m[0]).sort().join(' ');
const lotSo = hang.filter((h) => h.vi && h.id !== 'chuong:85:cgpn:2' /* 10³, 10⁶: chỉ số trên bị tách chữ */ && ['GIONG', 'KHAC_CHU'].includes(h.kq) && so(chuKho.get(h.id)) !== so(h.vi)).map((h) => h.id);
kiem('không chỗ nào khác con số mà xếp GIONG / KHAC_CHU', lotSo.length === 0, lotSo.slice(0, 8).join(','));
const nx = JSON.parse(fs.readFileSync(path.join(GOC, 'scripts/luat-goc/tt31-nhan-xet.json'), 'utf8'));
kiem('mọi nhận xét tay gắn đúng một dòng', Object.entries(nx).every(([i, m]) => theoId.get(i)?.nhanXet === m.nhanXet));

// mẫu đã đọc tay
const co = (id, t, s) => theoId.get(id)?.[t]?.includes(s);
kiem('84 cg 11(A): Anh dẫn Notes 12, Việt in Chú giải 9', co('chuong:84:cg:11:A', 'en', 'Notes 12 (a) and 12 (b) to Chapter 85') && co('chuong:84:cg:11:A', 'vi', 'Chú giải 9 (a) và 9 (b) Chương 85'));
kiem('Phần XVII cg 2(e): TT31 có "trừ các bộ tản nhiệt"', co('phan:XVII:cg:2:e', 'vi', 'trừ các bộ tản nhiệt') && theoId.get('phan:XVII:cg:2:e').kq === 'KHAC_NGHIA_NGHI');
kiem('13 cg 1(g): TT31 dẫn 38.22', co('chuong:13:cg:1:g', 'vi', '38.22') && co('chuong:13:cg:1:g', 'en', '38.22'));
kiem('48 cg 5: mốc (A), (B) là THIEU_O_KHO', ['A', 'B'].every((x) => theoId.get(`chuong:48:cg:5:${x}`)?.kq === 'THIEU_O_KHO'));

const D = process.env.LUAT_GOC_TXT_M10;
if (D) {
  const khit = (s) => s.normalize('NFC').replace(/\s/g, '');
  const tep = {}; const trangChu = (s, c) => (tep[s + c] ??= fs.readFileSync(path.join(D, `cb-${s}.${c}.txt`), 'utf8').split('\f').map(khit));
  const lechTrang = (s) => (s === '523-524' ? 3 : 1);
  const mat = [];
  for (const h of hang) for (const c of ['vi', 'en']) {
    if (!h[c]) continue;
    const s = h.soCongBao.replace(' + ', '-'); const t = trangChu(s, c); const l = lechTrang(s);
    const doan = t.slice(h.trangCongBao - l - 1, (h.trangCongBaoDen ?? h.trangCongBao) - l).join('');
    if (!doan.includes(khit(h[c]))) mat.push(`${h.id}.${c}`);
  }
  kiem(`vi, en nguyên văn đúng trang Công báo (${hang.length} dòng)`, mat.length === 0, `${mat.length}: ${mat.slice(0, 6).join(',')}`);
  // phủ: gộp mọi dòng theo khối phải bằng đúng chữ của khối trong bản chữ
  for (const c of ['vi', 'en']) {
    const RX = c === 'vi' ? [/^PHẦN ([IVX]+)$/, /^Chương (\d+)$/, /^Chú giải(?: phân nhóm| bổ sung)?\.?$/] : [/^SECTION ([IVX]+)$/, /^Chapter (\d+)$/, /^(?:Subheading )?Notes?\.?$/];
    const khoi = new Map(); let goc = null; let kh = null;
    for (const f of fs.readdirSync(D).filter((x) => x.endsWith(`.${c}.txt`)).sort()) {
      for (const dong of fs.readFileSync(path.join(D, f), 'utf8').normalize('NFC').split(/[\n\f]/)) {
        const t = dong.trim(); if (!t) continue; let m;
        if ((m = RX[0].exec(t))) { goc = `phan:${m[1]}`; kh = null; } else if ((m = RX[1].exec(t))) { goc = `chuong:${m[1].padStart(2, '0')}`; kh = null; }
        else if (RX[2].test(t)) { kh = `${goc}:${/phân nhóm|Subheading/.test(t) ? 'cgpn' : 'cg'}`; khoi.set(kh, ''); } else if (kh) khoi.set(kh, khoi.get(kh) + khit(t));
      }
    }
    const gop = new Map();
    for (const h of hang) { if (!h[c] || h.kq === 'THIEU_O_KHO') continue; const k = h.id.split(':').slice(0, 3).join(':'); gop.set(k, (gop.get(k) || '') + khit(h[c])); }
    const hong = [...khoi].filter(([k, v]) => gop.get(k) !== v).map(([k]) => k);
    kiem(`${c}: ${khoi.size} khối chú giải, không mất không thừa chữ nào`, hong.length === 0 && gop.size === khoi.size, hong.slice(0, 5).join(','));
  }
} else console.log('  (không có LUAT_GOC_TXT_M10: bỏ phần so nguyên văn với bản chữ Công báo)');

xong();
