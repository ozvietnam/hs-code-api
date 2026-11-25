#!/usr/bin/env node
/**
 * scripts/do-bac-thang.mjs — ĐO BẬC THANG T2 / T3 (ADR-0004 mục 4). Không gọi AI, không mạng, không ghi tệp.
 *
 *   T2: đưa sẵn nhóm 4 số đúng → đi xuống 6 số bằng luật.   T3: đưa sẵn phân nhóm 6 số đúng → đi xuống 8 số bằng luật.
 *   Mỗi ca vào một trong ba ô: dung / sai / hoi (dừng hỏi).
 *
 * Cách chạy:  node scripts/do-bac-thang.mjs --ca=<tệp jsonl> [--phan-quyet=<tệp jsonl>] [--chi-tiet]
 *   Tệp ca: mỗi dòng {tenHang, chatLieu, congDung, maDung, nguonDong}.
 *   Tệp phán quyết (người soát soạn): mỗi dòng {nguonDong | tenHang, ma | trangThai:"DUNG_HOI", nguon, cauLuat}. Chỉ nhận dòng có câu luật
 *   NGUYÊN VĂN tra được ở `nguon`; dòng không đạt bị bỏ và in ở `phanQuyetLoi`. Có phán quyết thì chấm theo phán quyết, không thì theo nhãn
 *   tờ khai. Script KHÔNG tự sinh phán quyết: ca lệch được liệt kê kèm câu luật hai phía ở `caSai` cho người soát.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.fetch = async () => { throw new Error('do-bac-thang không được ra mạng'); };
const BT = require('../lib/do-thi/bac-thang.js');
const DT = require('../lib/do-thi/duong-do-thi.js');
const { kiemCongAdr0004 } = require('../lib/cong-adr-0004.js');

const so = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const docDong = (tep) => fs.readFileSync(tep, 'utf8').split('\n').filter((x) => x.trim()).map((x) => JSON.parse(x));
const khoa = (c) => c.nguonDong || c.tenHang;

/** Phán quyết hợp lệ: có mã (hoặc DUNG_HOI) và câu luật nguyên văn. */
export function nhanPhanQuyet(ds) {
  const hopLe = new Map(); const loi = [];
  for (const p of ds) {
    const ma = so(p.ma); const hoi = p.trangThai === 'DUNG_HOI';
    const dsNhom = ma.length >= 4 ? [ma.slice(0, 4)] : [];
    const vb = p.nguon ? BT.vanBanNguon(p.nguon, dsNhom) : null;
    const lyDo = !khoa(p) ? 'thiếu nguonDong / tenHang' : !(hoi || ma.length >= 4) ? 'thiếu ma hoặc trangThai DUNG_HOI'
      : !(p.cauLuat && String(p.cauLuat).trim().length >= 6) ? 'thiếu câu luật' : vb == null ? `không tra được nguồn "${p.nguon}"` : !BT.coTrich(p.cauLuat, vb) ? 'câu luật không nguyên văn trong nguồn' : null;
    if (lyDo) loi.push({ ca: khoa(p) || null, lyDo }); else hopLe.set(khoa(p), { ma, hoi, cauLuat: p.cauLuat, nguon: p.nguon });
  }
  return { hopLe, loi };
}

const dongCua = (ma) => { const h4 = ma.slice(0, 4); return BT.dongLuat(h4, ma) || BT.dongLuat(h4, `${ma}00`.slice(0, 8)) || null; };

/** Đo một tập ca. */
export async function doBacThang(ca, phanQuyet = new Map()) {
  const o = () => ({ dung: 0, sai: 0, hoi: 0 });
  const kq = { T2: o(), T3: o(), viPhamAdr: 0, catBoiCong: 0, phanQuyetDung: 0, caSai: [], lyDoHoi: { T2: {}, T3: {} } };
  for (const c of ca) {
    const nhan = so(c.maDung); const pq = phanQuyet.get(khoa(c)) || null;
    const dung = pq && pq.ma ? pq.ma : nhan; // mã đúng theo phán quyết (nếu có), không thì nhãn tờ khai
    if (pq) kq.phanQuyetDung += 1;
    const moTa = DT.moTaKhach(c); const h4 = dung.slice(0, 4);
    const ten = BT.nguonNhom(h4)[`tenNhom.${h4}`];
    const canCuNhom = ten ? [{ nguon: `tenNhom.${h4}`, trich: ten }] : [];
    for (const [tang, do_, them] of [['T2', 6, { denBac: 6 }], ['T3', 8, { hs6: dung.slice(0, 6) }]]) {
      if (dung.length < do_ - 2) continue;
      const bt = await BT.chayBacThang({ nhom: h4, canCuNhom, moTa, tenHang: c.tenHang, goiLLM: null, ...them });
      const cong = kiemCongAdr0004(bt.banGhi, { nguonVanBan: bt.nguonVanBan });
      if (!cong.dat) kq.viPhamAdr += 1;
      if (bt.viPham.length) kq.catBoiCong += 1;
      if (bt.ma.length < do_) {
        kq[tang].hoi += 1;
        kq.lyDoHoi[tang][bt.lyDoDung] = (kq.lyDoHoi[tang][bt.lyDoDung] || 0) + 1;
        continue;
      }
      // Phán quyết "dừng hỏi", hoặc phán quyết chỉ chốt tới bậc cao hơn ⇒ ra mã ở bậc này là sai.
      const khop = !(pq && pq.hoi) && dung.length >= do_ && bt.ma === dung.slice(0, do_);
      kq[tang][khop ? 'dung' : 'sai'] += 1;
      if (!khop) {
        kq.caSai.push({
          tang, nguonDong: c.nguonDong || null, hang: moTa, nhanToKhai: nhan.slice(0, do_), mayRa: bt.ma, phanQuyet: pq ? (pq.hoi ? 'DUNG_HOI' : pq.ma) : null,
          cach: bt.vet.map((v) => `${v.cha}→${v.chon}:${v.cach}`), luatNhan: dongCua(nhan.slice(0, do_)), luatMay: bt.banGhi.tang[do_ === 6 ? 'tang6' : 'tang8'].canCu.slice(0, 3),
        });
      }
    }
  }
  return kq;
}

async function main() {
  const argv = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
  if (typeof argv.ca !== 'string') { console.error('Cách chạy: node scripts/do-bac-thang.mjs --ca=<tệp jsonl> [--phan-quyet=<tệp jsonl>] [--chi-tiet]'); process.exit(2); }
  const { hopLe, loi } = typeof argv['phan-quyet'] === 'string' ? nhanPhanQuyet(docDong(argv['phan-quyet'])) : { hopLe: new Map(), loi: [] };
  const ca = docDong(argv.ca);
  const kq = await doBacThang(ca, hopLe);
  let sha = null; try { sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' }).trim(); } catch { sha = null; }
  const { lyDoHoi, ...gon } = kq;
  console.log(JSON.stringify({ sha, tongCa: ca.length, ...gon, phanQuyetLoi: loi, ...(argv['chi-tiet'] ? { lyDoHoi } : {}) }, null, 1));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
