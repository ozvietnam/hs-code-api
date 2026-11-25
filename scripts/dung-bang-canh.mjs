#!/usr/bin/env node
/**
 * scripts/dung-bang-canh.mjs — LỆNH DỰNG BẢNG CẠNH của đồ thị tri thức HS (ADR-0002, giai đoạn 1).
 *
 * Tất định, không LLM, không mạng. Bảng cạnh dựng trong RAM (lib/do-thi/dung-bang-canh.js); lệnh này KHÔNG ghi tệp cạnh
 * (≈ 19,6 MB cạnh + 4,8 MB chỉ mục C1, quá ngưỡng 5 MB để commit) — chỉ ghi hai tệp số đếm, không có dấu thời gian:
 *   data/do-thi/thong-ke.json            số cạnh theo loại, số bị loại theo lý do, số liệu C1 gộp (cổng test-bang-canh giữ khớp)
 *   data/do-thi/xep-hang-luong-hang.json xếp hạng nhóm 4 số theo số dòng tờ khai mẫu OZ + độ phủ cạnh của 120 nhóm đầu
 *
 * Cách chạy:
 *   node scripts/dung-bang-canh.mjs            # dựng, in số đếm
 *   node scripts/dung-bang-canh.mjs --bam      # chỉ in sha256 của bảng (dựng hai lần phải ra cùng một mã)
 *   node scripts/dung-bang-canh.mjs --ghi      # dựng và ghi lại hai tệp số đếm (commit cùng PR đổi tệp gốc)
 *   node scripts/dung-bang-canh.mjs --bao-cao  # in thêm kích thước, thời gian, RAM, 20 nhóm nhiều cạnh vào nhất, 10 cụm mâu thuẫn
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(GOC);

const co = (c) => process.argv.includes(c);
const ramTruoc = process.memoryUsage().heapUsed;
const t0 = process.hrtime.bigint();
const DoThi = require('../lib/do-thi/index.js');
const b = DoThi.bangCanh();
const msDung = Number(process.hrtime.bigint() - t0) / 1e6;
if (global.gc) global.gc();
const ramSau = process.memoryUsage().heapUsed;

export const NGUONG = { tyLe: 0.02, toiThieu: 20 };

/** Mốc "một vào – một ra" (ADR-0002): số cờ đang khai ở data/luat/bang-co.json lúc ghi tệp. Chỉ là mốc để so, cổng không kiểm. */
function mocSoCo() {
  const ds = JSON.parse(fs.readFileSync(path.join(GOC, 'data/luat/bang-co.json'), 'utf8')).co || [];
  return { soCo: ds.length, doiQuyetDinhLLM: ds.filter((c) => c.doiQuyetDinhLLM).length, coCheDoBong: ds.filter((c) => c.bong).length, nguon: 'data/luat/bang-co.json', ghiChu: 'Mốc lúc mở PR giai đoạn 1. Kế hoạch mục 6.1: bật cái mới thì bỏ cái cũ, số cờ không tăng ròng. PR này không thêm cờ nào.' };
}

/** Nội dung data/do-thi/thong-ke.json (không dấu thời gian, khoá theo thứ tự cố định). */
export function tepThongKe(bang = b) {
  return {
    phienBan: 1,
    moTa: 'Số đếm của bảng cạnh đồ thị tri thức HS (ADR-0002). Bảng cạnh KHÔNG nằm trên đĩa: dựng trong RAM từ tệp gốc bằng lib/do-thi/dung-bang-canh.js. Tệp này do scripts/dung-bang-canh.mjs --ghi sinh; đừng sửa tay.',
    cachDungLai: 'node scripts/dung-bang-canh.mjs --ghi',
    luuO: 'RAM',
    nguong: { ...NGUONG, ghiChu: 'Cổng scripts/test-bang-canh.mjs đỏ khi số cạnh một loại lệch tệp này quá max(toiThieu, tyLe × số đã ghi). Lệch trong ngưỡng (người khác vừa sửa sổ tay) thì không đỏ.' },
    ...bang.thongKe,
    mocSoCo: mocSoCo(),
  };
}

/** Xếp hạng nhóm 4 số theo lượng hàng (tờ khai mẫu OZ) + độ phủ cạnh — căn cứ định khối lượng soạn cạnh giai đoạn 6. */
export function tepXepHang(bang = b) {
  const { dataReadPath } = require('../lib/data-paths.js');
  const docJson = (...p) => JSON.parse(fs.readFileSync(dataReadPath(...p), 'utf8'));
  const nut = require('../lib/do-thi/dung-bang-canh.js').tapNut();
  const theoNhom = new Map();
  let tongDong = 0; let tongOz = 0; let maKhongCon = 0;
  for (const dong of fs.readFileSync(dataReadPath('oz-gold-final.jsonl'), 'utf8').split('\n')) {
    if (!dong.trim()) continue;
    let g; try { g = JSON.parse(dong); } catch { continue; }
    const hs = String(g.hsCode || '').replace(/\D/g, '');
    if (!nut.ma8.has(hs)) { maKhongCon += 1; continue; }
    const h = hs.slice(0, 4); const x = theoNhom.get(h) || { nhom: h, soDong: 0, ozCount: 0 };
    x.soDong += 1; x.ozCount += Number(g.ozCount) || 1; theoNhom.set(h, x);
    tongDong += 1; tongOz += Number(g.ozCount) || 1;
  }
  const xep = [...theoNhom.values()].sort((a, c) => c.soDong - a.soDong || c.ozCount - a.ozCount || (a.nhom < c.nhom ? -1 : 1));
  const soNhomDat = (ds, truong, tong) => Object.fromEntries([50, 80, 95].map((p) => { let s = 0; let n = 0; for (const x of ds) { n += 1; s += x[truong]; if (s >= (tong * p) / 100) break; } return [`${p}%`, n]; }));
  const theoOz = [...xep].sort((a, c) => c.ozCount - a.ozCount || (a.nhom < c.nhom ? -1 : 1));

  const pn6CuaNhom = new Map();
  for (const p of nut.pn6) { const h = p.slice(0, 4); pn6CuaNhom.set(h, (pn6CuaNhom.get(h) || 0) + 1); }
  const ranhGioi = new Map();
  let tepRg = []; try { tepRg = fs.readdirSync(dataReadPath('ho-so', 'ranh-gioi')).filter((f) => /^\d{6}\.json$/.test(f)).sort(); } catch { tepRg = []; }
  for (const f of tepRg) {
    let tt = 'KHONG_DOC_DUOC'; try { tt = docJson('ho-so', 'ranh-gioi', f).trangThai || 'KHONG_RO'; } catch { /* giữ nhãn */ }
    const h = f.slice(0, 4); const x = ranhGioi.get(h) || {}; x[tt] = (x[tt] || 0) + 1; ranhGioi.set(h, x);
  }
  const dem = new Map();
  const cong = (h, k) => { const x = dem.get(h) || { C5ra: 0, C5vao: 0, C6ra: 0, C6vao: 0, C7: 0 }; x[k] += 1; dem.set(h, x); };
  for (const e of bang.canh) {
    const a = e.tu.slice(0, 4); const z = e.toi.slice(0, 4);
    if (e.loai === 'C5') { cong(a, 'C5ra'); cong(z, 'C5vao'); } else if (e.loai === 'C6') { cong(a, 'C6ra'); cong(z, 'C6vao'); } else if (e.loai === 'C7') { cong(a, 'C7'); if (z !== a) cong(z, 'C7'); }
  }
  let luyKe = 0;
  const top = xep.slice(0, 120).map((x, i) => {
    luyKe += x.soDong;
    let st = null; try { st = docJson('so-tay', `${x.nhom}.json`); } catch { st = null; }
    const tc6 = (st && Array.isArray(st.tieuChi6)) ? st.tieuChi6 : [];
    const soPn6 = pn6CuaNhom.get(x.nhom) || 0;
    const pn6CoTieuChi = new Set(tc6.map((t) => String(t.hs6 || '').replace(/\D/g, '')).filter((p) => p.length === 6)).size;
    const rg = ranhGioi.get(x.nhom) || {};
    return {
      hang: i + 1, nhom: x.nhom, soDong: x.soDong, ozCount: x.ozCount, luyKeSoDong: Number(((luyKe / tongDong) * 100).toFixed(1)),
      coSoTay: Boolean(st), coTieuChi6: tc6.length > 0, soTieuChi6: tc6.length, soPhanNhom6: soPn6,
      soPhanNhomCanPhanBiet: soPn6 > 1 ? soPn6 : 0, soPhanNhomCoTieuChi6: pn6CoTieuChi,
      ranhGioi: { DUYET: rg.DUYET || 0, TRA_VE: rg.TRA_VE || 0, NHAP: rg.NHAP || 0 },
      canh: dem.get(x.nhom) || { C5ra: 0, C5vao: 0, C6ra: 0, C6vao: 0, C7: 0 },
    };
  });
  const canPB = top.filter((x) => x.soPhanNhomCanPhanBiet > 0);
  return {
    phienBan: 1,
    moTa: 'Xếp hạng nhóm 4 số theo số dòng tờ khai mẫu OZ (data/oz-gold-final.jsonl) và độ phủ cạnh của 120 nhóm đầu. Căn cứ định khối lượng soạn cạnh ở giai đoạn 6 của docs/ke-hoach-do-thi-tri-thuc-hs.md. Do scripts/dung-bang-canh.mjs --ghi sinh; chỉ có số đếm theo nhóm, không có tên hàng hay câu khai.',
    cachDungLai: 'node scripts/dung-bang-canh.mjs --ghi',
    nguon: 'data/oz-gold-final.jsonl, data/so-tay/, data/ho-so/ranh-gioi/, bảng cạnh (lib/do-thi)',
    tong: { soDong: tongDong, ozCount: tongOz, soNhomCoHang: xep.length, soNhomTrongBieu: nut.nhom.size, maKhongConTrongBieu: maKhongCon },
    soNhomChiem: { theoSoDong: soNhomDat(xep, 'soDong', tongDong), theoOzCount: soNhomDat(theoOz, 'ozCount', tongOz) },
    top120: {
      tongSoDong: top.reduce((s, x) => s + x.soDong, 0), chiemPhanTramSoDong: Number(((top.reduce((s, x) => s + x.soDong, 0) / tongDong) * 100).toFixed(1)),
      chuaCoSoTay: top.filter((x) => !x.coSoTay).length, canPhanBiet6So: canPB.length, canPhanBietMaChuaCoTieuChi6: canPB.filter((x) => !x.coTieuChi6).length,
      soPhanNhomCanPhanBiet: canPB.reduce((s, x) => s + x.soPhanNhomCanPhanBiet, 0), soPhanNhomCoTieuChi6: canPB.reduce((s, x) => s + x.soPhanNhomCoTieuChi6, 0),
      ranhGioi: { DUYET: top.reduce((s, x) => s + x.ranhGioi.DUYET, 0), TRA_VE: top.reduce((s, x) => s + x.ranhGioi.TRA_VE, 0), NHAP: top.reduce((s, x) => s + x.ranhGioi.NHAP, 0) },
      khongCoCanhNgang: top.filter((x) => x.canh.C5ra + x.canh.C5vao + x.canh.C7 === 0).length,
    },
    nhom: top,
  };
}

const laChinh = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (laChinh) {
  if (co('--bam')) { console.log(b.bam); process.exit(0); }
  const ghi = (tep, noiDung) => { fs.mkdirSync(path.dirname(path.join(GOC, tep)), { recursive: true }); fs.writeFileSync(path.join(GOC, tep), `${JSON.stringify(noiDung, null, 2)}\n`, 'utf8'); console.log(`đã ghi ${tep}`); };
  if (co('--ghi')) { ghi('data/do-thi/thong-ke.json', tepThongKe()); ghi('data/do-thi/xep-hang-luong-hang.json', tepXepHang()); }
  console.log(JSON.stringify({ bam: b.bam, ...b.thongKe }, null, 2));
  if (co('--bao-cao')) {
    const byte = (o) => Buffer.byteLength(JSON.stringify(o));
    const kichThuoc = { canhByte: byte(b.canh), c1Byte: byte({ cum: b.c1.cum, biDanh: b.c1.biDanh }) };
    for (const l of DoThi.LOAI_CANH) kichThuoc[`${l}Byte`] = byte(b.canh.filter((e) => e.loai === l));
    const vao = new Map();
    for (const e of b.canh) {
      if (!DoThi.LOAI_NGANG.includes(e.loai)) continue;
      const dich = e.haiChieu ? [e.tu.slice(0, 4), e.toi.slice(0, 4)] : [e.toi.slice(0, 4)];
      for (const h of new Set(dich)) { const x = vao.get(h) || { nhom: h, soCanhVao: 0, tuNhom: new Set(), theoLoai: {} }; x.soCanhVao += 1; x.tuNhom.add(h === e.tu.slice(0, 4) ? e.toi.slice(0, 4) : e.tu.slice(0, 4)); x.theoLoai[e.loai] = (x.theoLoai[e.loai] || 0) + 1; vao.set(h, x); }
    }
    const top20 = [...vao.values()].sort((a, c) => c.soCanhVao - a.soCanhVao || (a.nhom < c.nhom ? -1 : 1)).slice(0, 20).map((x) => ({ nhom: x.nhom, soCanhVao: x.soCanhVao, soNhomTroToi: x.tuNhom.size, theoLoai: x.theoLoai }));
    const mauThuan = [...b.c1.mauThuan].sort((a, c) => Object.keys(c.theoKho).length - Object.keys(a.theoKho).length || (a.khoa < c.khoa ? -1 : 1)).slice(0, 10);
    console.log(JSON.stringify({ baoCao: { msDung: Math.round(msDung), ramTangMB: Number(((ramSau - ramTruoc) / 1048576).toFixed(1)), coGc: Boolean(global.gc), kichThuoc, top20NhomNhieuCanhVao: top20, muoiCumMauThuan: mauThuan, xepHang: (({ tong, soNhomChiem, top120 }) => ({ tong, soNhomChiem, top120 }))(tepXepHang()) } }, null, 2));
  }
}
