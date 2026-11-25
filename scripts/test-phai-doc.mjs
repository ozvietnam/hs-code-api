#!/usr/bin/env node
// scripts/test-phai-doc.mjs — M-34 (#1915): kiểm phai-doc đọc thẳng kho luat-goc theo ADR-0004 & ADR-0005.
// Tất định, không mạng, không AI.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-phai-doc');
const {
  phaiDoc,
  datLai,
  thongKeCanhCu,
  phanChuongCuaNhom,
  khopCanhCuTrongPhamVi,
  docBangPhanChuongNhom,
  TRAN_BYTES,
} = require('../lib/do-thi/phai-doc.js');
const { docKhoLuatGoc, dungDoThiDanChieu, taoKhoNut } = require('../lib/do-thi/dan-chieu.js');

const muc = (p, b) => p?.trinhTu?.find((x) => x.buoc === b);
const nutIds = (p, b) => new Set((muc(p, b)?.muc || []).map((m) => m.nut));

const THU_TU_ADR0004 = [
  'TEN',
  'CHU_GIAI_PHAN',
  'CHU_GIAI_CHUONG',
  'CHU_GIAI_PHAN_CHUONG',
  'LOAI_TRU_RA',
  'LOAI_TRU_VAO',
  'NHAC_TOI',
  'DUOC_NHAC',
  'CHU_GIAI_NHOM',
  'CHU_GIAI_PHAN_NHOM',
  'SEN',
  'WCO',
  'PHAN_BIET',
  'PHAN_BIET_NGHIA',
];

// ── 1. Tách khỏi hs-tree & wco-op.js; sạch đối chiếu M-23 ──────────────────────
const srcPhaiDoc = fs.readFileSync(new URL('../lib/do-thi/phai-doc.js', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
kiem('phai-doc.js đọc docKhoLuatGoc, không require hs-tree và không lùi về wco-op.js', !/hs-tree|wco-op/.test(srcPhaiDoc) && /docKhoLuatGoc/.test(srcPhaiDoc));
kiem('phai-doc.js không chứa C8 / C1 / tienLeUngHo / oz-gold / precedents hay bảng PC viết tay', !/['"`](?:C8|C1)['"`]|tienLeUngHo|oz-gold|precedents|BANG_PHAN_CHUONG_NHOM/.test(srcPhaiDoc));

// ── 2. Thứ tự ADR-0004, id & mã trần, cungCap/capDuoi từ bieu.jsonl ──────────
const p7616 = phaiDoc('7616', { dayDu: true });
const p7616Id = phaiDoc('bieu:7616', { dayDu: true });
kiem('nhận cả mã trần lẫn id (7616 === bieu:7616) và gọi 2 lần giống hệt', p7616 && JSON.stringify(p7616) === JSON.stringify(p7616Id) && JSON.stringify(phaiDoc('8536')) === JSON.stringify(phaiDoc('8536')));
kiem('thứ tự trình tự khớp chuẩn ADR-0004 (PHAN_BIET & PHAN_BIET_NGHIA ở cuối sau WCO)', p7616.trinhTu.map((b) => b.buoc).join() === THU_TU_ADR0004.join());
kiem('nhận các id không phải mã 4-8 số (bieu:76, chuong:76, chuong:76:cgpn:1, chuong:76:kq:1, bieu:1511903:td1, sen:1511:1)', Boolean(phaiDoc('bieu:76') && phaiDoc('chuong:76') && phaiDoc('chuong:76:cgpn:1') && phaiDoc('chuong:76:kq:1') && phaiDoc('bieu:1511903:td1') && phaiDoc('sen:1511:1')));
kiem('cấp dưới đúng cấp gạch từ bieu.jsonl: 7616 → 761610 và 76169', p7616.capDuoi.map((x) => x.ma).join() === '761610,76169' && p7616.capDuoi.every((x) => x.id && x.lop && 'trang' in x));
const p761610 = phaiDoc('761610');
kiem('Quy tắc 6 & cungCap: 761610 chỉ so với 76169 từ bieu.jsonl', p761610.cungCap.map((x) => x.ma).join() === '76169' && /Quy tắc 6/.test(p761610.quyTac));
kiem('CA NGƯỢC: mã không có trong biểu / quá ngắn → null', phaiDoc('0000') === null && phaiDoc('76') === null && phaiDoc('') === null && phaiDoc(null) === null && phaiDoc('bieu:99999999') === null);

// ── 3. Chú giải Phần & Chương (cg trước kq), Phân chương từ tệp JSON, SEN & không cắt ──
const mPhan76 = muc(p7616, 'CHU_GIAI_PHAN').muc;
const idxPhanKq = mPhan76.findIndex((m) => /:kq:/.test(m.id));
kiem('7616: CHU_GIAI_PHAN đọc từ phan.jsonl và cg đứng trước kq', mPhan76.length > 0 && idxPhanKq > 0 && mPhan76.slice(0, idxPhanKq).every((m) => !/:kq:/.test(m.id)) && mPhan76.slice(idxPhanKq).every((m) => /:kq:/.test(m.id)));
const mChuong76 = muc(p7616, 'CHU_GIAI_CHUONG').muc;
const idxFirstKq = mChuong76.findIndex((m) => /:kq:/.test(m.id));
kiem('7616: CHU_GIAI_CHUONG có cg/cgbs/cgpn đúng chỗ và cg đứng trước kq', idxFirstKq >= 0 && mChuong76.slice(0, idxFirstKq).every((m) => !/:kq:/.test(m.id)) && mChuong76.slice(idxFirstKq).every((m) => /:kq:/.test(m.id)));

// Kiểm chứng data/luat-goc/phan-chuong-nhom.json: mọi nhóm của 7 Chương thuộc đúng 1 phân chương, không hở không chồng, khớp chuong.jsonl
const khoRaw = docKhoLuatGoc('data/luat-goc', { coCau: true });
const nutKhongTienLe = khoRaw.nut.filter((n) => n.lop !== 'TIEN_LE' && !String(n.id).startsWith('tb:'));
const theoIdRaw = new Map(nutKhongTienLe.map((n) => [n.id, n]));
const bangPc = docBangPhanChuongNhom(path.resolve('data/luat-goc'));
let pcHo = 0; let pcChong = 0; let pcSaiTrang = 0;
const bayChuong = ['28', '29', '39', '63', '69', '71', '72'];
for (const r of bangPc.muc) {
  const n = theoIdRaw.get(r.id);
  if (!n || (n.nguon?.trang ?? null) !== r.trang) pcSaiTrang += 1;
}
for (const ch of bayChuong) {
  const ds = bangPc.theoChuong.get(ch) || [];
  const nhoms = nutKhongTienLe.filter((n) => n.id.startsWith(`bieu:${ch}`) && n.cap === 'NHOM');
  for (const n of nhoms) {
    const code = Number.parseInt(n.id.slice(5), 10);
    const matches = ds.filter((r) => code >= Number.parseInt(r.tu, 10) && code <= Number.parseInt(r.den, 10));
    if (matches.length === 0) pcHo += 1;
    if (matches.length > 1) pcChong += 1;
  }
}
const p2801 = phaiDoc('2801', { dayDu: true });
const p7219 = phaiDoc('7219', { dayDu: true });
kiem('phan-chuong-nhom.json: 33 phân chương khớp trang in chuong.jsonl; mọi nhóm 7 Chương thuộc đúng 1 phân chương (0 hở, 0 chồng)', bangPc.muc.length === 33 && pcSaiTrang === 0 && pcHo === 0 && pcChong === 0 && p2801.phanChuong === 'I' && p7219.phanChuong === 'III', `saiTrang=${pcSaiTrang} ho=${pcHo} chong=${pcChong}`);

const p010221 = phaiDoc('010221', { dayDu: true });
kiem('CHU_GIAI_PHAN_NHOM & SEN: 010221 có pn:010221:ct:1; 1511 có sen:1511:1 không bị cắt chữ', muc(p010221, 'CHU_GIAI_PHAN_NHOM').muc.some((m) => m.id === 'pn:010221:ct:1') && muc(phaiDoc('1511', { dayDu: true }), 'SEN').muc.some((m) => m.id === 'sen:1511:1' && !m.trich.endsWith('…')));

const pCh29 = phaiDoc('2934', { dayDu: true });
const mucDai = muc(pCh29, 'CHU_GIAI_CHUONG').muc.find((m) => m.trich.length > 600);
kiem('trần mục không cắt chú giải pháp lý khi dayDu (> 600 ký tự giữ nguyên vẹn)', Boolean(mucDai && !mucDai.trich.endsWith('…')));

// ── 4. Điểm 1 CA NGƯỢC + Điểm 2 BO_TRO + Điểm 5 TOM_GON > 60KB ──────────────
const qCh84 = theoIdRaw.get('chuong:84:cg:1:b')?.nguyenVan?.slice(0, 80) || '';
kiem('CA NGƯỢC điểm 1: trích của Chương 84 không khớp vào cạnh 4202→7318, chỉ khớp khi một đầu thuộc Chương 84', qCh84.length >= 20 && khopCanhCuTrongPhamVi(qCh84, '4202', '7318') === null && khopCanhCuTrongPhamVi(qCh84, '8401', '7318')?.id === 'chuong:84:cg:1:b');

// Kiểm Điểm 2 trên tập mẫu nhóm có cạnh PHAN_BIET / PHAN_BIET_NGHIA
let soBoTroSai = 0; let coMauBoTro = 0;
for (const h of ['7616', '8536', '8471', '3926', '7318']) {
  const pd = phaiDoc(h, { dayDu: true });
  for (const buocTen of ['PHAN_BIET', 'PHAN_BIET_NGHIA']) {
    for (const m of muc(pd, buocTen).muc) {
      coMauBoTro += 1;
      if (m.nhan !== 'BO_TRO' || m.boTro?.nhan !== 'BO_TRO') soBoTroSai += 1;
    }
  }
}
kiem('PHAN_BIET & PHAN_BIET_NGHIA gắn nhan: BO_TRO tách riêng ở boTro khỏi trich', soBoTroSai === 0 && coMauBoTro >= 0, `sai=${soBoTroSai}`);

// Kiểm Điểm 5: vượt 60KB chuyển TOM_GON (id + câu đầu), giữ nguyên số mục, và lấy đủ theo id
const pLonMacDinh = phaiDoc('8419');
const pLonDayDu = phaiDoc('8419', { dayDu: true });
const bytesGon = Buffer.byteLength(JSON.stringify(pLonMacDinh), 'utf8');
const bytesFull = Buffer.byteLength(JSON.stringify(pLonDayDu), 'utf8');
const giuDuMuc = pLonMacDinh.trinhTu.every((b, i) => b.tong === pLonDayDu.trinhTu[i].tong && b.muc.length === pLonDayDu.trinhTu[i].muc.length);
const duIdCauDau = pLonMacDinh.trinhTu.every((b) => b.buoc === 'TEN' || b.muc.every((m) => m.id && m.lop && 'trang' in m && typeof m.cauDau === 'string'));
const motIdCon = muc(pLonMacDinh, 'CHU_GIAI_PHAN').muc[0]?.id;
kiem(`vượt 60 KB → TOM_GON (${(bytesFull / 1024).toFixed(1)} KB → ${(bytesGon / 1024).toFixed(1)} KB), giữ nguyên mọi mục và lấy đủ theo id`, pLonMacDinh.cheDo === 'TOM_GON' && pLonDayDu.cheDo === 'DAY_DU' && bytesGon < bytesFull * 0.45 && giuDuMuc && duIdCauDau && Boolean(motIdCon && phaiDoc(motIdCon)?.ten?.length > 10));

// ── 5. Bất biến toàn kho bằng phép quét độc lập trên data/luat-goc/*.jsonl ────
const dtDocLap = dungDoThiDanChieu({ nut: nutKhongTienLe, khoNut: taoKhoNut(nutKhongTienLe), cau: khoRaw.cau });
const pdCache = new Map();
const getPd = (id) => { if (!pdCache.has(id)) pdCache.set(id, phaiDoc(id, { dayDu: true })); return pdCache.get(id); };

let sotRa = 0; let sotVao = 0; let thieuTruong = 0; let tienLeLot = 0; let thieuCauDan = 0;
const nutLienQuan = new Set();
for (const e of dtDocLap.canh) {
  nutLienQuan.add(e.tuNut);
  nutLienQuan.add(e.den);
  const a = getPd(e.tuNut);
  const b = getPd(e.den);
  const raHit = muc(a, 'NHAC_TOI')?.muc.find((m) => m.nut === e.den && m.cauDan === e.tu);
  const vaoHit = muc(b, 'DUOC_NHAC')?.muc.find((m) => m.nut === e.tuNut && m.cauDan === e.tu);
  if (!raHit) sotRa += 1;
  if (!vaoHit) sotVao += 1;
  if ((raHit && (!raHit.cau || !raHit.cauDan)) || (vaoHit && (!vaoHit.cau || !vaoHit.cauDan))) thieuCauDan += 1;
}

let lechDoiXungNhac = 0;
for (const id of nutLienQuan) {
  const p = getPd(id);
  for (const b of p.trinhTu) {
    for (const m of b.muc) {
      if (!m.id || !m.lop || !('trang' in m) || !m.trich || !m.nguon) thieuTruong += 1;
      if (m.lop === 'TIEN_LE' || String(m.id).startsWith('tb:')) tienLeLot += 1;
    }
  }
  for (const m of muc(p, 'NHAC_TOI').muc) {
    const q = getPd(m.den);
    if (!q || !muc(q, 'DUOC_NHAC').muc.some((v) => v.tuNut === m.tuNut && v.den === m.den && v.cauDan === m.cauDan)) {
      lechDoiXungNhac += 1;
    }
  }
}

let lechDoiXungCanhCu = 0;
const tkCanhCu = thongKeCanhCu();
for (const n of nutKhongTienLe) {
  if (!n.id.startsWith('bieu:') || n.cap !== 'NHOM') continue;
  const p = getPd(n.id);
  for (const m of muc(p, 'LOAI_TRU_RA').muc) {
    const q = getPd(m.nut);
    if (!q || !muc(q, 'LOAI_TRU_VAO').muc.some((v) => v.nut === n.id || (v.nut.startsWith('bieu:') && v.nut.slice(5, 9) === n.id.slice(5)))) {
      lechDoiXungCanhCu += 1;
    }
  }
}

kiem(`bất biến độc lập: mọi nút có cạnh NHAC tới X nằm trong phaiDoc(X) (${dtDocLap.canh.length} cạnh)`, sotRa === 0 && sotVao === 0 && thieuCauDan === 0, `sotRa=${sotRa} sotVao=${sotVao} thieuCau=${thieuCauDan}`);
kiem('bất biến đối xứng toàn kho: A thấy B ⇔ B thấy A (NHAC & LOAI_TRU)', lechDoiXungNhac === 0 && lechDoiXungCanhCu === 0, `nhac=${lechDoiXungNhac} canhCu=${lechDoiXungCanhCu}`);
kiem('khuôn chuẩn (id, lop, trang, trich, nguon) đầy đủ & 0 mục TIEN_LE', thieuTruong === 0 && tienLeLot === 0, `thieu=${thieuTruong} tienLe=${tienLeLot}`);
kiem('cạnh cũ lọc chặt trong phạm vi hai đầu cạnh và cỡ mặc định trung vị/p95 ≤ 60 KB', tkCanhCu.canhCuGiu >= 0 && tkCanhCu.canhCuBiBo > 0 && tkCanhCu.coTraVeKB.macDinh.trungViKB <= 60 && tkCanhCu.coTraVeKB.macDinh.p95KB <= 60);

// ── 6. Kho mô phỏng đầy đủ phan/nhom/wco + CA NGƯỢC TIEN_LE (Req #5) ───────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phai-doc-m34-'));
try {
  const bieuMock = [
    { id: 'bieu:73', loai: 'TEN', cha: null, so: '73', nguyenVan: 'Các sản phẩm bằng sắt hoặc thép', lop: 'LUAT', nguon: { vanBan: 'Biểu thuế test', ban: '2026', trang: null }, hieuLuc: { tu: '2026-01-01', den: null }, cap: 'CHUONG', gach: null },
    { id: 'bieu:7318', loai: 'TEN', cha: 'bieu:73', so: '73.18', nguyenVan: 'Vít, bu lông...', lop: 'LUAT', nguon: { vanBan: 'Biểu thuế test', ban: '2026', trang: null }, hieuLuc: { tu: '2026-01-01', den: null }, cap: 'NHOM', gach: 0 },
    { id: 'bieu:76', loai: 'TEN', cha: null, so: '76', nguyenVan: 'Nhôm và sản phẩm bằng nhôm', lop: 'LUAT', nguon: { vanBan: 'Biểu thuế test', ban: '2026', trang: null }, hieuLuc: { tu: '2026-01-01', den: null }, cap: 'CHUONG', gach: null },
    { id: 'bieu:7616', loai: 'TEN', cha: 'bieu:76', so: '76.16', nguyenVan: 'Các sản phẩm khác bằng nhôm', lop: 'LUAT', nguon: { vanBan: 'Biểu thuế test', ban: '2026', trang: null }, hieuLuc: { tu: '2026-01-01', den: null }, cap: 'NHOM', gach: 0 },
    { id: 'bieu:761699', loai: 'TEN', cha: 'bieu:7616', so: '7616.99', nguyenVan: '- Loại khác', lop: 'LUAT', nguon: { vanBan: 'Biểu thuế test', ban: '2026', trang: null }, hieuLuc: { tu: '2026-01-01', den: null }, cap: 'PHAN_NHOM', gach: 1 },
  ];
  const phanMock = [
    { id: 'phan:XV:kq:1', loai: 'KHAI_QUAT', cha: 'phan:XV', so: null, nguyenVan: 'Phần XV Khái quát: kim loại cơ bản.', lop: 'HUONG_DAN', nguon: { vanBan: 'HS2022', ban: 'HS2022', trang: 901 }, hieuLuc: { tu: null, den: null } },
    { id: 'phan:XV:cg:1', loai: 'CHU_GIAI', cha: 'phan:XV', so: '1', nguyenVan: '1. Phần này không bao gồm hàng loại trừ ở nhóm khác.', lop: 'LUAT', nguon: { vanBan: 'HS2022', ban: 'HS2022', trang: 900 }, hieuLuc: { tu: null, den: null } },
    { id: 'phan:XV:cgpn:1', loai: 'CHU_GIAI_PHAN_NHOM', cha: 'phan:XV', so: '1', nguyenVan: 'Chú giải phân nhóm Phần XV test.', lop: 'LUAT', nguon: { vanBan: 'HS2022', ban: 'HS2022', trang: 902 }, hieuLuc: { tu: null, den: null } },
  ];
  const nhomMock = [
    { id: 'nhom:7616:ct:1', loai: 'CHU_GIAI_CHI_TIET', cha: null, so: '76.16', nguyenVan: 'Chú giải 76.16: vật liệu tương tự được mô tả trong chú giải nhóm 73.18.', lop: 'HUONG_DAN', nguon: { vanBan: 'HS2022', ban: 'HS2022', trang: 1200 }, hieuLuc: { tu: null, den: null } },
  ];
  const wcoMock = [
    { id: 'wco:761699:1', loai: 'Y_KIEN_WCO', cha: null, so: '7616.99/1', nguyenVan: 'Aluminium product opinion 7616.99/1.', lop: 'HUONG_DAN', nguon: { vanBan: 'WCO', ban: 'HS2022', trang: 45 }, hieuLuc: { tu: null, den: null } },
  ];
  const tbMock = [
    { id: 'tb:1234:7616', loai: 'THONG_BAO', cha: null, so: '1234/TB-TCHQ', nguyenVan: 'Thông báo tiền lệ nhắc nhóm 76.16 và 73.18.', lop: 'TIEN_LE', nguon: { vanBan: 'TB-TCHQ', ban: '2024', trang: 1 }, hieuLuc: { tu: '2024-01-01', den: null } },
  ];
  const viet = (ten, arr) => fs.writeFileSync(path.join(tmpDir, ten), `${arr.map((x) => JSON.stringify(x)).join('\n')}\n`);
  viet('bieu.jsonl', bieuMock);
  viet('phan.jsonl', phanMock);
  viet('nhom.jsonl', nhomMock);
  viet('wco.jsonl', wcoMock);
  viet('thong-bao.jsonl', tbMock);

  const m7616 = phaiDoc('7616', { thuMuc: tmpDir });
  const m7318 = phaiDoc('7318', { thuMuc: tmpDir });
  const mPhan = muc(m7616, 'CHU_GIAI_PHAN').muc;
  kiem('CA NGƯỢC TIEN_LE: phaiDoc(tb:...) === null và không lọt vào phaiDoc(7616)/phaiDoc(7318)', phaiDoc('tb:1234:7616', { thuMuc: tmpDir }) === null && !nutIds(m7616, 'DUOC_NHAC').has('tb:1234:7616') && !nutIds(m7318, 'DUOC_NHAC').has('tb:1234:7616'));
  kiem('đọc đủ phan.jsonl (cg trước kq), nhom.jsonl, wco.jsonl và cạnh NHAC hai chiều', mPhan.map((m) => m.id).join() === 'phan:XV:cg:1,phan:XV:kq:1' && muc(m7616, 'CHU_GIAI_NHOM').muc[0]?.id === 'nhom:7616:ct:1' && muc(m7616, 'WCO').muc[0]?.id === 'wco:761699:1' && nutIds(m7616, 'NHAC_TOI').has('bieu:7318') && muc(m7318, 'DUOC_NHAC').muc.some((x) => x.tuNut === 'nhom:7616:ct:1'));
  datLai();
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ── 7. Kiểm tích hợp /api/dataset?resource=phai_doc ─────────────────────────────
const datasetHandler = require('../api/dataset.js');
const prevToken = process.env.HS_API_TOKEN;
process.env.HS_API_TOKEN = 'test-m34-token';
try {
  const goiApi = async (query) => {
    const res = { _s: 0, _j: null, _h: {}, setHeader(k, v) { this._h[k] = v; }, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; } };
    await datasetHandler({ method: 'GET', url: '/api/dataset', query, headers: { authorization: 'Bearer test-m34-token' } }, res);
    return res;
  };
  const rOk = await goiApi({ resource: 'phai_doc', hs: '7616' });
  const rDayDu = await goiApi({ resource: 'phai_doc', hs: '8419', dayDu: '1' });
  const r404 = await goiApi({ resource: 'phai_doc', id: 'bieu:99999999' });
  const r400 = await goiApi({ resource: 'phai_doc' });
  kiem('api/dataset resource=phai_doc: 200 hợp lệ, hỗ trợ dayDu=1, 404 không thấy, 400 thiếu tham số', rOk._s === 200 && rOk._j.found === true && rOk._j.id === 'bieu:7616' && rDayDu._s === 200 && rDayDu._j.cheDo === 'DAY_DU' && r404._s === 404 && r400._s === 400);
} finally {
  if (prevToken === undefined) delete process.env.HS_API_TOKEN;
  else process.env.HS_API_TOKEN = prevToken;
}

// ── 8. Giữ kiểm tách luật và bổ trợ trong /api/notes ──────────────────────────
const G = require('../lib/gir-notes.js');
const cg = JSON.parse(fs.readFileSync(new URL('../data/chu-giai-heading.json', import.meta.url), 'utf8'));
const nh = G.buildNoteChain('54080000').find((e) => e.level === 'HEADING');
kiem('noteVi của nhóm không còn đoạn AI soạn', !/Phân biệt:/.test(nh.noteVi) && nh.noteVi.startsWith(String(cg['5408'].nhom).trim().slice(0, 60)));
kiem('đoạn AI soạn nằm riêng ở boTro, nhãn AI_CHUA_KIEM', nh.boTro?.[0]?.nhan === 'AI_CHUA_KIEM' && /KHÔNG phải luật/.test(nh.boTro[0].ghiChu));

if (process.argv.includes('--thong-ke')) {
  console.log('\n=== THỐNG KÊ M-34 v2 (phai-doc) ===');
  console.log(JSON.stringify({ ...tkCanhCu, nutCoCanhNhac: nutLienQuan.size, sotRa, sotVao, lechDoiXungNhac, lechDoiXungCanhCu }, null, 2));
}

xong();
