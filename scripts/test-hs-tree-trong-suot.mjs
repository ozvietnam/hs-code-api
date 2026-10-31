#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Nhóm chữ số không tên TRONG SUỐT trong lớp tầng của lib/hs-tree.js (#606/#577 — 848180).
 *
 * Tiêu đề quốc gia 7 số mà cây theo chữ số dựng ra nhưng biểu thuế KHÔNG có dòng nào (không dòng có mã, không tiêu đề không mã
 * nào có tập dòng 8 số đúng bằng tập lá của nút) chỉ là cách đánh số. Trong lớp tầng (tangCua/chaTang/conTang) nút đó bị bỏ, con
 * nối thẳng vào cha, nên "Loại khác" phủ định đủ tập anh em mà chữ biểu định nghĩa (848180 r14562: mười mục gạch 3).
 *
 * Kiểm:
 *  1. Ảnh chụp TRƯỚC (origin/main b10b278, scripts/fixtures/hs-tree-tang/anh-chup-truoc-trong-suot.json): tắt trong suốt
 *     (datTrongSuot(false)) ⇒ chaTang/conTang của MỌI nút mọi chương giống hệt bản trước (sha256 theo chương).
 *  2. Bật ⇒ chỉ nút thuộc định nghĩa chặt đổi: chính nhóm chữ số không tên, con của nó (cha mới), cha của nó (con mới), và tầng
 *     không mã trước KHONG_DAT vì cắt ngang nhóm chữ số nay đặt được (+ con của tầng đó). Phân nhóm không có nhóm chữ số không tên:
 *     không đổi một nút nào. Danh sách nhóm chữ số không tên khoá cứng (58 nút, 24 phân nhóm, 6 chương).
 *  3. Nhận diện CHỈ từ dữ liệu biểu thuế (laNhomChuSoKhongTen): thiếu biểu thuế / biểu lệch lá / có tiêu đề đúng tập / nút có tên ⇒ không.
 *  4. 848180: r14562 có mười con đúng thứ tự biểu; 84818097 và r14584 phủ định đủ anh em; cổng 1 không còn tieu-de-bi-luoc-ten.
 *  5. Cây theo chữ số (tree()) KHÔNG đổi.
 * Không gọi mạng/LLM, không ghi data/, không đọc data/bench, data/oz-export.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const T = require('../lib/hs-tree.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 900)); } };

const TEP_TRUOC = 'scripts/fixtures/hs-tree-tang/anh-chup-truoc-trong-suot.json';
// Định nghĩa chặt, khoá cứng: mọi tiêu đề quốc gia 7 số không có dòng trong biểu thuế 2026.04.05.
const NHOM_KHONG_TEN = [
  '2710198', '4001299', '8413811', '8481801', '8481806', '8481807', '8481808', '8481809', '8501511', '8702903',
  '8703211', '8703214', '8703221', '8703224', '8703231', '8703233', '8703235', '8703236', '8703241', '8703244',
  '8703311', '8703314', '8703321', '8703323', '8703325', '8703327', '8703331', '8703333', '8703335',
  '8703401', '8703402', '8703403', '8703405', '8703501', '8703502', '8703503', '8703505',
  '8703601', '8703602', '8703603', '8703605', '8703701', '8703702', '8703703', '8703705',
  '8704224', '8704424', '9821309', '9849201', '9849341', '9849342', '9849345', '9849347', '9849348', '9849352',
  '9849358', '9849359', '9849432',
];

/** Mọi nút (id) + chaTang/conTang của lớp tầng hiện hành — cùng cách thu với ảnh chụp trước. */
function chup() {
  const t = T.tree(); const ids = new Set(); const pn6s = new Set();
  for (const [k, n] of t.nodes) {
    if (k !== n.id) continue;
    ids.add(n.id);
    if (n.cap === 6) pn6s.add(n.id);
    if (n.cap === 8 && n.laPhanNhom && n.laPhanNhom.length === 6) pn6s.add(n.laPhanNhom);
    if (n.cap === 4) pn6s.add(`${n.id}00`);
  }
  for (const p of pn6s) for (const id of T.tangCua(p).nut.keys()) ids.add(id);
  const m = new Map();
  for (const id of [...ids].sort()) if (!id.startsWith('P:')) m.set(id, { cha: T.chaTang(id) || '', con: T.conTang(id) });
  return { m, pn6s };
}
function bamTheoChuong(m) {
  const by = {};
  for (const [id, v] of m) (by[id.slice(0, 2)] ||= []).push(`${id}\t${v.cha}\t${v.con.join(',')}`);
  const out = {};
  for (const ch of Object.keys(by).sort()) out[ch] = { soNut: by[ch].length, sha256: crypto.createHash('sha256').update(by[ch].join('\n')).digest('hex') };
  return out;
}

// ── 1. Tắt trong suốt = đúng bản trước (origin/main) cho MỌI nút mọi chương ────────────────────────────────────────────────
const truoc = JSON.parse(fs.readFileSync(TEP_TRUOC, 'utf8'));
check('0 có hàm datTrongSuot + laNhomChuSoKhongTen', typeof T.datTrongSuot === 'function' && typeof T.laNhomChuSoKhongTen === 'function');
if (typeof T.datTrongSuot !== 'function') { console.log(`\n${pass} pass, ${fail} fail`); process.exit(1); }
T.datTrongSuot(false);
const tat = chup();
const bamTat = bamTheoChuong(tat.m);
const lechTat = Object.keys({ ...truoc.chuong, ...bamTat }).filter((ch) => JSON.stringify(truoc.chuong[ch]) !== JSON.stringify(bamTat[ch]));
check(`1a tắt trong suốt: chaTang/conTang ${tat.m.size} nút / ${Object.keys(bamTat).length} chương GIỐNG HỆT ảnh chụp trước (b10b278)`, lechTat.length === 0 && tat.m.size === truoc.soNut, { lechTat, soNut: tat.m.size, truoc: truoc.soNut });
const khongDatTat = new Map(); // id tầng sẽ dựng → trạng thái khi tắt
for (const p of tat.pn6s) for (const x of T.tangCua(p).ds) khongDatTat.set(`${p}~r${x.r}`, x.trangThai);

// ── 2. Bật: chỉ nút thuộc định nghĩa chặt đổi ───────────────────────────────────────────────────────────────────────────
T.datTrongSuot(true);
const bat = chup();
const U = new Set(); const pn6CoU = new Set();
for (const p of bat.pn6s) for (const x of T.tangCua(p).trongSuot || []) { U.add(x.nut); pn6CoU.add(p); }
check(`2a nhóm chữ số không tên = đúng danh sách khoá cứng (${NHOM_KHONG_TEN.length} nút)`, JSON.stringify([...U].sort()) === JSON.stringify([...NHOM_KHONG_TEN].sort()), { thua: [...U].filter((x) => !NHOM_KHONG_TEN.includes(x)), thieu: NHOM_KHONG_TEN.filter((x) => !U.has(x)) });
const theoChuong = {}; for (const id of U) theoChuong[id.slice(0, 2)] = (theoChuong[id.slice(0, 2)] || 0) + 1;
check('2b theo chương: 27:1, 40:1, 84:6, 85:1, 87:38, 98:11; 24 phân nhóm', JSON.stringify(theoChuong) === JSON.stringify({ 27: 1, 40: 1, 84: 6, 85: 1, 87: 38, 98: 11 }) && pn6CoU.size === 24, { theoChuong, pn6: [...pn6CoU].sort() });
{
  const khongTen = [...new Set(T.tree().nodes.values())].filter((n) => n.cap === 'TIEU_DE_QG' && !n.tenVi).map((n) => n.id).sort();
  check('2c mọi tiêu đề quốc gia còn thiếu tên của cây đều là nhóm chữ số không tên (biểu thuế không có dòng) — không sót, không thừa', JSON.stringify(khongTen) === JSON.stringify([...U].sort()), khongTen.filter((x) => !U.has(x)));
}
const tangMoi = [...bat.m.keys()].filter((id) => !tat.m.has(id));
const mat = [...tat.m.keys()].filter((id) => !bat.m.has(id));
check('2d không mất nút nào; tầng mới chỉ là tầng KHONG_DAT (cắt ngang nhóm chữ số) nay đặt được, trong phân nhóm có nhóm chữ số không tên',
  mat.length === 0 && tangMoi.every((id) => khongDatTat.get(id) === 'KHONG_DAT' && pn6CoU.has(id.slice(0, 6))), { mat, tangMoi: tangMoi.map((id) => [id, khongDatTat.get(id)]) });
const N = new Set(tangMoi);
const loai = {}; const khac = []; const ngoaiPhanNhom = [];
for (const id of new Set([...tat.m.keys(), ...bat.m.keys()])) {
  const a = tat.m.get(id) || { cha: '', con: [] }; const b = bat.m.get(id) || { cha: '', con: [] };
  if (a.cha === b.cha && a.con.join() === b.con.join()) continue;
  const k = U.has(id) ? 'NHOM' : N.has(id) ? 'TANG_MOI' : U.has(a.cha) ? 'CON_CUA_NHOM' : a.con.some((x) => U.has(x)) ? 'CHA_CUA_NHOM'
    : N.has(b.cha) ? 'CON_CUA_TANG_MOI' : b.con.some((x) => N.has(x)) ? 'CHA_CUA_TANG_MOI' : 'KHAC';
  loai[k] = (loai[k] || 0) + 1;
  if (k === 'KHAC') khac.push(id);
  const p = id.length >= 6 ? id.slice(0, 6) : null;
  if (!p || ![...pn6CoU].some((q) => id.startsWith(q) || q.startsWith(id))) ngoaiPhanNhom.push(id);
}
console.log(`     nút đổi theo loại: ${JSON.stringify(loai)} — tầng mới: ${tangMoi.join(', ')}`);
check('2e mọi nút đổi đều thuộc định nghĩa chặt (nhóm / con / cha / tầng mới đặt được) — không có "KHAC"', khac.length === 0, khac.slice(0, 20));
check('2f mọi nút đổi nằm trong 24 phân nhóm có nhóm chữ số không tên (hoặc là tổ tiên trực tiếp của phân nhóm đó)', ngoaiPhanNhom.length === 0, ngoaiPhanNhom.slice(0, 20));
{
  const doi = new Set(); for (const id of new Set([...tat.m.keys(), ...bat.m.keys()])) { const a = tat.m.get(id); const b = bat.m.get(id); if (!a || !b || a.cha !== b.cha || a.con.join() !== b.con.join()) doi.add(id.slice(0, 6)); }
  const bamBat = bamTheoChuong(bat.m);
  const chuongDoi = Object.keys(bamBat).filter((ch) => JSON.stringify(bamBat[ch]) !== JSON.stringify(truoc.chuong[ch])).sort();
  check('2g chương đổi so với bản trước = đúng 6 chương có nhóm chữ số không tên (27, 40, 84, 85, 87, 98)', JSON.stringify(chuongDoi) === JSON.stringify(['27', '40', '84', '85', '87', '98']), chuongDoi);
}

// ── 3. Nhận diện chỉ từ dữ liệu biểu thuế ─────────────────────────────────────────────────────────────────────────────
{
  const n = T.tree().nodes.get('8481807');
  const la = ['84818071', '84818072', '84818073', '84818074', '84818077', '84818078', '84818079'];
  const laCay = T.tree().codes.filter((c) => c.startsWith('848180'));
  const bt = { laPhanNhom: [...laCay], laCay, ma: new Set(['848180', ...laCay]), tieuDe: [{ dongDuoi: ['84818071', '84818072'] }] };
  check('3a đủ điều kiện ⇒ true', T.laNhomChuSoKhongTen(n, la, bt) === true);
  check('3b thiếu biểu thuế (bt null) ⇒ false — không suy "không có dòng"', T.laNhomChuSoKhongTen(n, la, null) === false);
  check('3c biểu thuế lệch tập lá của phân nhóm (thiếu một dòng) ⇒ false', T.laNhomChuSoKhongTen(n, la, { ...bt, laPhanNhom: laCay.slice(1) }) === false);
  check('3d có tiêu đề không mã đúng tập lá của nút ⇒ false (nút có dòng)', T.laNhomChuSoKhongTen(n, la, { ...bt, tieuDe: [{ dongDuoi: [...la].reverse() }] }) === false);
  check('3e có dòng mang chính mã nút ⇒ false', T.laNhomChuSoKhongTen(n, la, { ...bt, ma: new Set([...bt.ma, '8481807']) }) === false);
  check('3f nút có tên (8517624) / không phải tiêu đề quốc gia (848180) ⇒ false', T.laNhomChuSoKhongTen(T.tree().nodes.get('8517624'), ['85176241'], bt) === false && T.laNhomChuSoKhongTen(T.tree().nodes.get('848180'), laCay, bt) === false);
}

// ── 4. 848180 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const muoi = ['848180~r14563', '848180~r14566', '848180~r14570', '848180~r14573', '84818083', '84818084', '84818093', '848180~r14579', '84818097', '848180~r14584'];
  check('4a r14562 "Loại khác:" có đúng mười con gạch 3, đúng thứ tự biểu', T.conTang('848180~r14562').join() === muoi.join(), T.conTang('848180~r14562'));
  check('4b con của 848180 = tầng r14535, r14538, 8481802, .30, 8481804, 8481805, r14551, r14556, r14559, r14562', T.conTang('848180').join() === '848180~r14535,848180~r14538,8481802,84818030,8481804,8481805,848180~r14551,848180~r14556,848180~r14559,848180~r14562', T.conTang('848180'));
  check('4c chaTang: 84818097 → r14562; r14563 → r14562; 84818011 → r14535 → 848180; 84818063 → r14551', T.chaTang('84818097') === '848180~r14562' && T.chaTang('848180~r14563') === '848180~r14562' && T.chaTang('84818011') === '848180~r14535' && T.chaTang('848180~r14535') === '848180' && T.chaTang('84818063') === '848180~r14551');
  check('4d mọi tầng không mã của 848180 đặt được (13 CO_NUT, 0 KHONG_DAT); trongSuot = 8481801, 06, 07, 08, 09', T.tangCua('848180').ds.every((x) => x.trangThai === 'CO_NUT') && T.tangCua('848180').ds.length === 13 && T.tangCua('848180').trongSuot.map((x) => x.nut).join() === '8481801,8481806,8481807,8481808,8481809');
  const DK = require('../lib/dieu-kien-so.js');
  const soTay = { nhom: '8481', dong8: [], dieuKienNut: [] };
  const phuDinh = (hs) => DK.duongDiDong8(hs, { soTay }).nhom.filter((g) => g.chieu === 'PHAI_KHONG').map((g) => g.nut);
  const p97 = phuDinh('84818097');
  const capPn = ['848180~r14535', '848180~r14538', '8481802', '84818030', '8481804', '8481805', '848180~r14551', '848180~r14556', '848180~r14559'];
  check('4e 84818097 "Loại khác, điều khiển bằng tay, …" phủ định đủ tám mục gạch 3 cùng tầng r14562 (không chỉ anh em trong 8481809) + anh em của tầng "Loại khác:" r14562',
    JSON.stringify(p97.sort()) === JSON.stringify([...muoi.filter((x) => !['84818097', '848180~r14584'].includes(x)), ...capPn].sort()), p97);
  const p98 = phuDinh('84818098');
  check('4f 84818098 (dưới r14584 "Loại khác:") phủ định đủ chín mục gạch 3 còn lại của r14562 (kể cả 84818097)', muoi.filter((x) => x !== '848180~r14584').every((x) => p98.includes(x)), p98);
  check('4g không còn nhóm tieu-de-bi-luoc-ten trên đường đi của mọi dòng 848180', T.tree().codes.filter((c) => c.startsWith('848180')).every((hs) => !DK.duongDiDong8(hs, { soTay }).nhom.some((g) => g.lyDo === 'tieu-de-bi-luoc-ten')));
  const C = require('../lib/ho-so/cong-ranh-gioi.js');
  const r = C.kiemRanhGioi('848180', C.taoKhung('848180', { phien: 'phien-soan-A', ngay: '2026-10-31' }));
  check('4h cổng 1 trên khung trống 848180: không còn cong1-tieu-de-bi-luoc-ten / cong1-tang-khong-ma-khong-dat', !r.loi.some((l) => l.startsWith('cong1-tieu-de-bi-luoc-ten') || l.startsWith('cong1-tang-khong-ma-khong-dat')), r.loi.filter((l) => /luoc|khong-dat/.test(l)).slice(0, 5));
  check('4i … mà đòi điều kiện cho tầng có tên dưới r14562 (vd r14563 "Van bi")', r.loi.includes('cong1-chua-so-hoa:84818071:848180~r14563'), r.loi.filter((l) => l.includes(':84818071:')));
}

// ── 5. Cây theo chữ số không đổi ──────────────────────────────────────────────────────────────────────────────────────
check('5a tree(): 8481807 vẫn là con chữ số của 848180, con 84818071…79', T.tree().nodes.get('8481807').parent === '848180' && T.tree().nodes.get('8481807').children.join() === '84818071,84818072,84818073,84818074,84818077,84818078,84818079');
check('5b tree(): nút nhóm chữ số không tên vẫn suyRa, không tên', NHOM_KHONG_TEN.every((id) => T.tree().nodes.get(id)?.suyRa && !T.tree().nodes.get(id).tenVi));

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
