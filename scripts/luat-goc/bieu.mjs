#!/usr/bin/env node
// scripts/luat-goc/bieu.mjs — thẻ M-18: sinh data/luat-goc/bieu.jsonl (khuôn nut-luat@1), mỗi nút một TÊN trong biểu thuế. Tất định, không mạng, không AI.
//   node scripts/luat-goc/bieu.mjs --cgct <thư mục cgct-hs2022*.txt> [--txt <thư mục ghi bieu.txt để cổng đối chiếu>]
// Cây dựng thẳng từ các DÒNG của sheet chính theo SỐ GẠCH in trong biểu (không suy từ chữ số). Bản in chú giải HS 2022 chỉ dùng cho
// cờ `dauCong` và cho tiêu đề mà biểu không có (`tuBanIn`).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { docDong, GOC, PHIEN_BAN } from './bieu-doc.mjs';
import { docBanIn } from './bieu-ban-in.mjs';

const require = createRequire(import.meta.url);
const thamSo = (t) => { const i = process.argv.indexOf(t); return i > 0 ? process.argv[i + 1] : null; };
const boGach = (s) => String(s).replace(/^[-–\s]+/, '').trim();
const laLoaiKhac = (s) => /^loại khác(?![\p{L}])/iu.test(boGach(s));
const loaiKhacTran = (s) => /^loại khác\s*(\(SEN\))?\s*[:.]?\s*$/iu.test(boGach(s));

export function dungCay({ cgct = null } = {}) {
  const { dong, chuong, hieuChinh } = docDong();
  const ver = JSON.parse(fs.readFileSync(path.join(GOC, 'data/versions/index.json'), 'utf8')).versions[0];
  const tk = JSON.parse(fs.readFileSync(path.join(GOC, 'data/bieu-thue', PHIEN_BAN, 'tong-ket.json'), 'utf8'));
  const tenNut = JSON.parse(fs.readFileSync(path.join(GOC, 'data/bieu-thue', PHIEN_BAN, 'ten-nut.json'), 'utf8')).ten;
  const khop = new Map(Object.entries(tenNut).filter(([, v]) => v.sheet === tk.sheetChinh && v.doTinCay === 'KHOP_TAP').map(([id, v]) => [v.r, id]));
  const { tangCua, stats } = require('../../lib/hs-tree.js'); stats();
  const bao = { hieuChinh, gopDong: [], khongNguon: [], dongThieuMa: [] };

  // ── 1. cây dòng: gộp dòng lặp cùng mã (Chương 98, khác "mã tương ứng"), dòng lặp mã nhóm/phân nhóm ở gạch sâu hơn là tiêu đề ──
  const theoMa = new Map(); const nut = []; const st = [];
  for (const d of dong) {
    let ma = d.ma;
    if (ma && theoMa.has(ma)) {
      const c = theoMa.get(ma);
      if (ma.length === 8) {
        if (c.chu !== d.chu || c.gach !== d.gach) throw new Error(`mã ${ma} lặp mà khác tên/gạch: r${c.r}, r${d.r}`);
        c.dongLap.push(d.r); if (d.maTuongUng) c.maTuongUng.push(d.maTuongUng);
        continue;
      }
      ma = null; bao.gopDong.push(d.r);
    }
    const n = { ...d, ma, maInLai: d.ma && !ma ? d.ma : null, con: [], cha: null, dongLap: [], maTuongUng: d.maTuongUng ? [d.maTuongUng] : [] };
    if (n.ma) theoMa.set(n.ma, n);
    if (n.gach === 0) { st.length = 0; } else while (st.length && st[st.length - 1].gach >= n.gach) st.pop();
    n.cha = st.length ? st[st.length - 1] : null;
    if (n.cha) n.cha.con.push(n); else if (n.gach > 0) throw new Error(`r${n.r}: không có cha`);
    st.push(n); nut.push(n);
  }
  const la = (n) => (n.ma && n.ma.length === 8 ? [n.ma] : n.con.flatMap(la));
  const maLa = [...theoMa.keys()].filter((m) => m.length === 8);
  const nhom = new Map(); for (const m of maLa) for (const k of [m.slice(0, 4), m.slice(0, 5), m.slice(0, 6), m.slice(0, 7)]) nhom.set(k, (nhom.get(k) || 0) + 1);

  // ── 2. id ── tiêu đề không mã: mã 6 số (biểu không in dòng mã) / 5 số / 7 số khi tập dòng dưới nó đúng bằng tập mã cùng tiền tố; còn lại `bieu:00<dòng 5 số>`
  const idDung = new Set(maLa.concat([...theoMa.keys()])); const dung = new Map();
  for (const n of nut.filter((x) => !x.ma)) {
    const L = la(n); if (!L.length) { if (n.r > 19054) { bao.dongThieuMa.push({ r: n.r, chu: n.chu, maIn: n.maIn }); n.la = []; } continue; }
    let p = L[0]; for (const m of L) while (!m.startsWith(p)) p = p.slice(0, -1);
    n.la = L; const nhan = (k) => [5, 6, 7].includes(k.length) && !/^\d{4}00$/.test(k) && nhom.get(k) === L.length && !idDung.has(k);
    n.tienTo = L.length > 1 && nhan(p.slice(0, 6)) ? p.slice(0, 6) : nhan(p) ? p : null; // phân nhóm 6 số mà biểu không in dòng mã: tiêu đề phủ đúng phân nhóm là tên phân nhóm
    if (n.tienTo) dung.set(p, [...(dung.get(p) || []), n]);
  }
  for (const [p, ds] of dung) { // nhiều tiêu đề cùng tập dòng: cái cây hs-tree đã nối tên, không có thì cái ngoài cùng
    const chon = ds.find((n) => khop.get(n.r) === p) || ds[0];
    for (const n of ds) if (n !== chon) n.tienTo = null;
  }
  const ID = (n) => `bieu:${n.ma || n.tienTo || `00${String(n.r).padStart(5, '0')}`}`;

  // ── 3. xuất nút ──
  const nguon = (r) => ({ vanBan: `Biểu thuế XNK (${tk.tep}, sheet ${tk.sheetChinh})`, ban: PHIEN_BAN, trang: null, dong: r });
  const hieuLuc = { tu: ver.effectiveDate, den: null };
  const ra = []; const coId = new Map();
  const day = (o) => { if (coId.has(o.id)) throw new Error(`trùng ${o.id}`); coId.set(o.id, o); ra.push(o); return o; };
  const taoNut = (id, cha, so, n, cap, them = {}) => day({
    id, loai: 'TEN', cha, so, nguyenVan: n.chu.normalize('NFC'), lop: 'LUAT', nguon: nguon(n.r), hieuLuc,
    cap, gach: n.gach, tenNguonLoai: 'NGUYEN_VAN',
    ...(/\(SEN\)/.test(n.chu) ? { sen: true } : {}),
    ...(laLoaiKhac(n.chu) ? { loaiKhac: true, ...(loaiKhacTran(n.chu) ? {} : { loaiKhacCoVe: true }) } : {}),
    ...(n.gachBieu != null ? { gachBieu: n.gachBieu, ghiChu: 'biểu in lệch số gạch; gạch hiệu chỉnh có căn cứ ở lib/ho-so/tang-khong-ma.js' } : {}),
    ...(n.dongLap.length ? { dongLap: n.dongLap } : {}), ...(n.maTuongUng.length ? { maTuongUng: [...new Set(n.maTuongUng)] } : {}),
    ...(n.maInLai ? { maInLai: n.maInLai } : {}), ...them,
  });
  for (const c of chuong) day({ id: `bieu:${c.ma}`, loai: 'TEN', cha: null, so: c.so, nguyenVan: c.chu.normalize('NFC'), lop: 'LUAT', nguon: nguon(c.r), hieuLuc, cap: 'CHUONG', gach: null, tenNguonLoai: 'NGUYEN_VAN' });
  const cham = (m) => [m.slice(0, 4), m.slice(4, 6), m.slice(6)].filter(Boolean).join('.').replace(/^(\d{2})(\d{2})(?=$)/, '$1.$2');
  const di = (n, chaId) => {
    if (n.ma === null && !n.la) return; // gạch đầu dòng trong chú giải, không có dòng nào dưới: không phải tên
    const m = n.ma || n.tienTo; let cha = chaId; let dau;
    if (n.gach === 0) { // nhóm (dòng 4 số, hoặc dòng 8 số gạch 0 vừa là nhóm vừa là phân nhóm vừa là dòng)
      const h4 = m.slice(0, 4);
      dau = taoNut(`bieu:${h4}`, `bieu:${h4.slice(0, 2)}`, cham(h4), n, 'NHOM', m.length === 8 ? { suyRa: true, cungDong: `bieu:${m}` } : {});
      cha = dau.id;
      if (m.length === 8 || nhom.get(`${h4}00`) === nhom.get(h4) && nhom.get(h4)) cha = taoNut(`bieu:${h4}00`, cha, cham(`${h4}00`), n, 'PHAN_NHOM', { suyRa: true, cungDong: m.length === 8 ? `bieu:${m}` : dau.id }).id;
      if (m.length === 8) taoNut(`bieu:${m}`, cha, cham(m), n, 'DONG', { cungDong: cha });
    } else if (m && m.length === 8) {
      if (m.endsWith('00') && !coId.has(`bieu:${m.slice(0, 6)}`) && nhom.get(m.slice(0, 6)) === 1) cha = taoNut(`bieu:${m.slice(0, 6)}`, cha, cham(m.slice(0, 6)), n, 'PHAN_NHOM', { suyRa: true, cungDong: `bieu:${m}` }).id;
      taoNut(`bieu:${m}`, cha, cham(m), n, 'DONG', cha !== chaId ? { cungDong: cha } : {});
      let y = coId.get(`bieu:${m}`); while (y && y.id !== `bieu:${m.slice(0, 6)}`) y = y.cha ? coId.get(y.cha) : null;
      if (!y) Object.assign(coId.get(`bieu:${m}`), { ngoaiPhanNhom: true, ghiChu: `biểu in dòng này ngoài tiêu đề phân nhóm ${cham(m.slice(0, 6))} (theo số gạch); giữ theo số gạch in` });
    } else if (m && m.length === 6) cha = taoNut(`bieu:${m}`, cha, cham(m), n, 'PHAN_NHOM', n.ma ? {} : { khongMa: true }).id;
    else if (n.la && !n.la.length) cha = taoNut(ID(n), cha, null, n, n.maIn ? 'DONG_THIEU_MA' : 'TIEU_DE_QUOC_GIA', { khongMa: true, idTheoDong: true, ...(n.maIn ? { maIn: n.maIn, ghiChu: 'biểu in mã 7 chữ số, không có mã 8 số trong data/tax.json; không đoán mã' } : {}) }).id;
    else {
      const pn6 = n.la.every((x) => x.startsWith(n.la[0].slice(0, 6))) ? n.la[0].slice(0, 6) : null;
      const tang = pn6 && tangCua(pn6).nut.has(`${pn6}~r${n.r}`) ? `${pn6}~r${n.r}` : null;
      cha = taoNut(ID(n), cha, null, n, pn6 ? 'TIEU_DE_QUOC_GIA' : 'TIEU_DE_PHAN_NHOM', { khongMa: true, ...(n.tienTo ? {} : { idTheoDong: true }), ...(tang ? { tang } : {}) }).id;
    }
    for (const c of n.con) di(c, cha);
  };
  for (const n of nut) if (!n.cha) di(n, null);

  // ── 4. phân nhóm 6 số không có dòng riêng và không tiêu đề nào phủ đúng ──
  for (const k of new Set(maLa.map((m) => m.slice(0, 6)))) if (!coId.has(`bieu:${k}`)) bao.khongNguon.push(k);

  // ── 5. phạm vi trừ của "Loại khác": các nút cùng cha, trừ chính nó và "Loại khác" trần khác ──
  const con = new Map(); for (const x of ra) if (x.cha) con.set(x.cha, [...(con.get(x.cha) || []), x]);
  for (const x of ra) {
    if (!x.loaiKhac) continue;
    let dai = x; while (dai.cungDong && dai.cha && coId.has(dai.cha) && coId.get(dai.cha).nguon.dong === dai.nguon.dong) dai = coId.get(dai.cha); // dòng vừa là phân nhóm: so ở nút trên cùng của cùng một dòng biểu
    x.phamViTru = (con.get(dai.cha) || []).filter((y) => y.id !== dai.id && !(y.loaiKhac && !y.loaiKhacCoVe)).map((y) => y.id);
  }

  // ── 6. bản in: dấu (+) ──
  if (cgct) {
    const bi = docBanIn(cgct);
    for (const [ma, tr] of bi.dauCong) { const x = coId.get(`bieu:${ma}`); if (x) { x.dauCong = true; x.dauCongTrang = tr; } }
  }
  return { ra, coId, con, bao, nut, theoMa, dong };
}

function main() {
  const cgct = thamSo('--cgct'); if (!cgct) { console.error('thiếu --cgct <thư mục cgct-hs2022*.txt>'); process.exit(2); }
  const { ra, bao, dong } = dungCay({ cgct });
  fs.writeFileSync(path.join(GOC, 'data/luat-goc/bieu.jsonl'), `${ra.map((x) => JSON.stringify(x)).join('\n')}\n`);
  const txt = thamSo('--txt');
  if (txt) { fs.mkdirSync(txt, { recursive: true }); const { tatCa } = docDong(); fs.writeFileSync(path.join(txt, 'bieu.txt'), `${tatCa.map((x) => x.chu).join('\n')}\n`); }
  const dem = {}; for (const x of ra) dem[x.cap] = (dem[x.cap] || 0) + 1;
  for (const k of ['sen', 'loaiKhac', 'loaiKhacCoVe', 'dauCong', 'cungDong', 'khongMa', 'idTheoDong', 'tuBanIn', 'suyRa', 'gachBieu', 'dongLap', 'tang']) dem[k] = ra.filter((x) => x[k]).length;
  console.log(JSON.stringify({ tong: ra.length, ...dem, dongBieu: dong.length }, null, 1));
  console.log(JSON.stringify(bao));
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) main();
