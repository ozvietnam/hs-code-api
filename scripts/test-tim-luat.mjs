#!/usr/bin/env node
// scripts/test-tim-luat.mjs — M-41 (#1917): cổng kiểm chế độ /api/search?che_do=luat.
// Yêu cầu QT:
// 1. Có chế độ mới che_do=luat ở api/search.js; không truyền thì chạy y như cũ TỪNG BYTE (bài kiểm so hai chế độ).
// 2. Tìm CHỮ trên câu luật (phan, chuong, nhom, phan-nhom, sen, bieu; không tb, không tờ khai, không từ điển tên thương mại). Chỗ cắm M-37.
// 3. Kết quả: nút + câu nhắc + câu dẫn (dan) + lớp + chiều ('LOAI' dưới "không bao gồm:") + đường đi tiếp (id gọi phaiDoc). Không trả mã 8 số như kết luận.
// 4. Không có câu nào nhắc thì trả rỗng và nói rỗng, không đoán.
import './test-isolate-data.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

const { timLuat, datLai, KHO_DUOC_TIM, xacDinhChieu, napChiMuc } = require('../lib/tim-luat');
const { phaiDoc, datLai: datLaiPhaiDoc } = require('../lib/do-thi/phai-doc');
const searchHandler = require('../api/search');

const { kiem, xong } = boKiem('test-tim-luat');

function goiHandler(handlerFn, query = {}) {
  let statusCode = 200;
  let body = null;
  const headers = {};
  const req = {
    method: 'GET',
    headers: { host: 'localhost:3000' },
    query,
    url: '/api/search',
  };
  const res = {
    setHeader(k, v) { headers[String(k).toLowerCase()] = v; },
    getHeader(k) { return headers[String(k).toLowerCase()]; },
    status(c) { statusCode = c; return res; },
    json(payload) { body = payload; return res; },
    end() { return res; },
  };
  handlerFn(req, res);
  return { statusCode, headers, body, rawJson: JSON.stringify(body) };
}

function bienDichHandlerCuKhongNhanhLuat() {
  let srcCu = null;
  try {
    srcCu = execFileSync('git', ['show', 'origin/main:api/search.js'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    srcCu = null;
  }
  if (!srcCu) {
    const hienTai = fs.readFileSync(path.join(ROOT, 'api', 'search.js'), 'utf8');
    srcCu = hienTai
      .replace(/^const \{ timLuat \} = require\('\.\.\/lib\/tim-luat'\);\n/m, '')
      .replace(/\s*const cheDo = String\(req\.query\.che_do \|\| ''\)\.trim\(\);\n\s*if \(cheDo === 'luat'\) \{[\s\S]*?\n\s*\}\n/m, '\n');
  }
  const searchPath = path.join(ROOT, 'api', 'search.js');
  const mod = new Module('search-cu-origin', null);
  mod.filename = searchPath;
  mod.paths = Module._nodeModulePaths(path.dirname(searchPath));
  mod._compile(srcCu, searchPath);
  return mod.exports;
}

// ── 1. So hai chế độ & chứng minh không truyền che_do chạy y như cũ TỪNG BYTE ─────────────────────────────
const handlerCu = bienDichHandlerCuKhongNhanhLuat();
for (const tc of [
  { label: 'mã nhóm 8509', query: { q: '8509' } },
  { label: 'từ khóa bàn chải', query: { q: 'bàn chải', limit: '10' } },
  { label: 'từ khóa cs_only=1', query: { q: 'nhựa', cs_only: '1' } },
  { label: 'từ khóa lowConfidence (trạm sạc)', query: { q: 'trạm sạc' } },
]) {
  const cu = goiHandler(handlerCu, tc.query);
  const moi = goiHandler(searchHandler, tc.query);
  kiem(
    `chế độ mặc định giống origin/main từng byte (${tc.label})`,
    cu.statusCode === moi.statusCode && cu.rawJson === moi.rawJson,
    `cuLen=${cu.rawJson.length} moiLen=${moi.rawJson.length}`,
  );
}

const rCu = goiHandler(searchHandler, { q: 'bàn chải' });
const rLuat = goiHandler(searchHandler, { q: 'bàn chải', che_do: 'luat' });
kiem(
  'so hai chế độ: mặc định trả results/hsCode, che_do=luat trả cuaVao không results/hsCode',
  Array.isArray(rCu.body?.results)
    && rLuat.statusCode === 200
    && rLuat.body?.cheDo === 'luat'
    && Array.isArray(rLuat.body?.cuaVao)
    && rLuat.body.results === undefined
    && rLuat.body.cuaVao.length > 0
    && rLuat.body.cuaVao.every((m) => m.hsCode === undefined && typeof m.nut === 'string' && typeof m.cau === 'string'),
  { cuKeys: Object.keys(rCu.body || {}), luatKeys: Object.keys(rLuat.body || {}) },
);

// ── 2. Chỉ tìm trên 6 kho gốc & nối thông sang phaiDoc (M-34) ──────────────────────────────────────────────
const tapKhoChoPhep = new Set(['phan', 'chuong', 'nhom', 'phan-nhom', 'sen', 'bieu']);
kiem(
  'KHO_DUOC_TIM đúng 6 kho gốc (không tb, không wco)',
  KHO_DUOC_TIM.length === 6 && KHO_DUOC_TIM.every((k) => tapKhoChoPhep.has(k)),
);

datLai();
const t0 = Date.now();
const idx = napChiMuc();
const msNap = Date.now() - t0;
const tTim = Date.now();
const kqBanChai = timLuat('bàn chải', { limit: 30 });
const msTim = Date.now() - tTim;

kiem(
  'tìm thật "bàn chải" có đủ trường chuẩn và đa kho',
  kqBanChai.tong > 0
    && kqBanChai.rong === false
    && kqBanChai.cuaVao.every((m) => (
      typeof m.nut === 'string'
      && typeof m.cauId === 'string'
      && typeof m.cau === 'string' && m.cau.length > 0
      && (m.dan === null || (typeof m.dan.id === 'string' && typeof m.dan.cau === 'string'))
      && (m.chieu === 'LOAI' || m.chieu === 'NHAC')
      && typeof m.lop === 'string' && m.lop !== 'TIEN_LE'
      && tapKhoChoPhep.has(m.kho)
      && 'trang' in m
      && m.duongDiTiep?.goiPhaiDoc === m.nut
      && m.duongDiTiep?.api === `/api/dataset?resource=phai_doc&id=${encodeURIComponent(m.nut)}`
    )),
  { tong: kqBanChai.tong, sample: kqBanChai.cuaVao[0] },
);

const kqKhongDau = timLuat('ban chai', { limit: 10 });
kiem('tìm không dấu "ban chai" vẫn tìm ra câu luật thật', kqKhongDau.tong > 0 && kqKhongDau.cuaVao.length > 0);

// Kiểm nối thông sang phaiDoc() với mọi loại nút trả về từ các từ khóa thật
datLaiPhaiDoc();
const daThuNut = new Set();
const daThuKho = new Set();
for (const kw of ['bàn chải', 'đinh tán', 'bộ trao đổi nhiệt', 'tơ tằm', 'điện thoại']) {
  const kq = timLuat(kw, { limit: 50 });
  for (const m of kq.cuaVao) {
    if (daThuNut.has(m.nut)) continue;
    if (daThuKho.has(m.kho) && daThuNut.size >= 12) continue;
    daThuNut.add(m.nut);
    daThuKho.add(m.kho);
    const pd = phaiDoc(m.duongDiTiep.goiPhaiDoc);
    if (!pd || pd.id !== m.nut) {
      kiem(`nối thông phaiDoc(${m.nut})`, false, { nut: m.nut, pdId: pd?.id });
    }
    if (daThuNut.size >= 18) break;
  }
}
kiem(`nối thông gọi phaiDoc thành công trên ${daThuNut.size} nút ở ${daThuKho.size} kho (${[...daThuKho].join(', ')})`, daThuNut.size >= 10 && daThuKho.size >= 4);

// ── 3. Kiểm `dan` (câu dẫn M-31) và `chieu: "LOAI"` trên dữ liệu thật + kho giả lập ──────────────────────
const cacCauCoDanLoaidoc = [];
const cacCauNgoaiLoai = [];
for (const kw of ['nhựa', 'thép', 'gỗ', 'cao su', 'giấy', 'xe có động cơ', 'đồ chơi']) {
  const kq = timLuat(kw, { limit: 50 });
  for (const m of kq.cuaVao) {
    if (m.dan && /không bao gồm/i.test(m.dan.cau)) cacCauCoDanLoaidoc.push(m);
    if (m.chieu === 'NHAC') cacCauNgoaiLoai.push(m);
  }
}
kiem(
  `dữ liệu thật: mọi câu dưới "không bao gồm:" đều có dan & chieu === "LOAI" (${cacCauCoDanLoaidoc.length} câu gặp)`,
  cacCauCoDanLoaidoc.length > 0 && cacCauCoDanLoaidoc.every((m) => m.chieu === 'LOAI' && m.dan?.cau),
  cacCauCoDanLoaidoc.slice(0, 2),
);
kiem(`dữ liệu thật: câu nhắc thông thường ghi chieu === "NHAC" (${cacCauNgoaiLoai.length} câu gặp)`, cacCauNgoaiLoai.length > 0);

// ── 4 & 5. Kho tạm: kiểm dan + LOAI, CA NGƯỢC bỏ thong-bao/TIEN_LE/wco, CA NGƯỢC rỗng không đoán ─────────
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm41-tim-luat-'));
try {
  fs.writeFileSync(
    path.join(tmpDir, 'chuong.jsonl'),
    `${JSON.stringify({
      id: 'chuong:99:cg:1',
      loai: 'CHU_GIAI',
      lop: 'LUAT',
      cha: null,
      so: '1',
      nguyenVan: 'Chương này không bao gồm:\n(a) Đồ chơi đặc biệt bằng nhựa tổng hợp;\n(b) Bàn chải đánh răng gắn động cơ.',
      nguon: { vanBan: 'Chú giải test', ban: 'HS2022', trang: 99 },
      hieuLuc: { tu: null, den: null },
    })}\n${JSON.stringify({
      id: 'chuong:99:cg:2',
      loai: 'CHU_GIAI',
      lop: 'LUAT',
      cha: null,
      so: '2',
      nguyenVan: 'Chương này chỉ bao gồm đinh tán hợp kim titan.',
      nguon: { vanBan: 'Chú giải test', ban: 'HS2022', trang: 100 },
      hieuLuc: { tu: null, den: null },
    })}\n${JSON.stringify({
      id: 'chuong:99:kq:1',
      loai: 'KHAI_QUAT',
      lop: 'HUONG_DAN',
      cha: null,
      so: null,
      nguyenVan: 'Đoạn khái quát thử ưu tiên lớp cho sản phẩm mẫu thử thứ tự.',
      nguon: { vanBan: 'Chú giải test', ban: 'HS2022', trang: 101 },
      hieuLuc: { tu: null, den: null },
    })}\n${JSON.stringify({
      id: 'chuong:99:cg:3',
      loai: 'CHU_GIAI',
      lop: 'LUAT',
      cha: null,
      so: '3',
      nguyenVan: 'Chú giải pháp lý cho sản phẩm mẫu thử thứ tự.',
      nguon: { vanBan: 'Chú giải test', ban: 'HS2022', trang: 102 },
      hieuLuc: { tu: null, den: null },
    })}\n`,
  );
  fs.writeFileSync(
    path.join(tmpDir, 'thong-bao.jsonl'),
    `${JSON.stringify({
      id: 'tb:999-2026:99999999',
      loai: 'THONG_BAO',
      lop: 'TIEN_LE',
      cha: null,
      so: null,
      nguyenVan: 'Mặt hàng khoa_doc_nhat_tien_le_m41 thuộc mã 99999999.',
      nguon: { vanBan: 'TB giả', ban: 'VN', trang: 1 },
      hieuLuc: { tu: null, den: null },
    })}\n`,
  );
  fs.writeFileSync(
    path.join(tmpDir, 'wco.jsonl'),
    `${JSON.stringify({
      id: 'wco:9999:1',
      loai: 'Y_KIEN_WCO',
      lop: 'CHU_GIAI_BO_SUNG',
      cha: null,
      so: null,
      nguyenVan: 'Ý kiến WCO chứa khoa_doc_nhat_wco_m41.',
      nguon: { vanBan: 'WCO giả', ban: 'WCO', trang: 1 },
      hieuLuc: { tu: null, den: null },
    })}\n`,
  );

  datLai();
  const kqLoai = timLuat('đồ chơi đặc biệt', { thuMuc: tmpDir });
  kiem(
    'mock: câu dưới "Chương này không bao gồm:" có dan rõ ràng và chieu === "LOAI"',
    kqLoai.tong === 1
      && kqLoai.cuaVao[0].nut === 'chuong:99:cg:1'
      && kqLoai.cuaVao[0].chieu === 'LOAI'
      && /không bao gồm/i.test(kqLoai.cuaVao[0].dan?.cau || ''),
    kqLoai,
  );

  const kqNhac = timLuat('đinh tán hợp kim', { thuMuc: tmpDir });
  kiem(
    'mock: câu bao gồm không loại trừ có chieu === "NHAC"',
    kqNhac.tong === 1 && kqNhac.cuaVao[0].chieu === 'NHAC',
    kqNhac,
  );

  const kqUuTien = timLuat('mẫu thử thứ tự', { thuMuc: tmpDir });
  kiem(
    'mock: khi cùng điểm khớp, lớp LUAT xếp trước lớp HUONG_DAN',
    kqUuTien.tong === 2 && kqUuTien.cuaVao[0].lop === 'LUAT' && kqUuTien.cuaVao[1].lop === 'HUONG_DAN',
    kqUuTien.cuaVao.map((x) => ({ nut: x.nut, lop: x.lop })),
  );

  const kqTb = timLuat('khoa_doc_nhat_tien_le_m41', { thuMuc: tmpDir });
  kiem(
    'CA NGƯỢC không đọc tb / lop TIEN_LE -> trả rỗng và nói rỗng',
    kqTb.tong === 0 && kqTb.cuaVao.length === 0 && kqTb.rong === true && /rỗng|không có câu luật/i.test(kqTb.thongBao || ''),
    kqTb,
  );

  const kqWco = timLuat('khoa_doc_nhat_wco_m41', { thuMuc: tmpDir });
  kiem(
    'CA NGƯỢC không đọc wco (ngoài 6 kho gốc) -> trả rỗng',
    kqWco.tong === 0 && kqWco.cuaVao.length === 0 && kqWco.rong === true,
    kqWco,
  );
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  datLai();
}

const kqRongHttp = goiHandler(searchHandler, { q: 'zzzz_khong_ton_tai_trong_6_kho_99999', che_do: 'luat' });
kiem(
  'CA NGƯỢC không có câu nào nhắc -> /api/search?che_do=luat trả rỗng & nói rỗng, không đoán',
  kqRongHttp.statusCode === 200
    && kqRongHttp.body?.tong === 0
    && Array.isArray(kqRongHttp.body?.cuaVao) && kqRongHttp.body.cuaVao.length === 0
    && kqRongHttp.body?.rong === true
    && /rỗng/i.test(kqRongHttp.body?.thongBao || '')
    && /không đoán/i.test(kqRongHttp.body?.thongBao || ''),
  kqRongHttp.body,
);

// Kiểm tra tĩnh lib/tim-luat.js không chạm kho cấm / từ điển tên thương mại / tờ khai
const maNguon = fs.readFileSync(path.join(ROOT, 'lib', 'tim-luat.js'), 'utf8');
const maKhongChuThich = maNguon
  .split('\n')
  .filter((l) => !/^\s*(?:\/\/|\*|\/\*)/.test(l))
  .join('\n');
for (const cam of ['thong-bao', 'oz-gold', 'precedents', 'trade-synonyms', 'synonyms', 'hs-aliases', 'confusion-pairs', 'hs-tree', 'callLLM', 'callLlm']) {
  kiem(`tĩnh: lib/tim-luat.js không tham chiếu "${cam}"`, !maKhongChuThich.includes(cam));
}

// ── 6. Chỗ cắm M-37 (timNghia) & tất định ──────────────────────────────────────────────────────────────────
kiem(
  'mặc định M-37 timNghia ở trạng thái CHUA_CAM',
  rLuat.body?.timNghia?.trangThai === 'CHUA_CAM' && rLuat.body?.timNghia?.choCam === 'M-37',
);
const kqCamNghia = timLuat('bàn chải', {
  timNghia: (q) => [{ nut: 'bieu:9603', diem: 0.91, tuKhoa: q }],
});
kiem(
  'gắn hàm mock timNghia cho M-37 hoạt động đúng giao diện DA_CAM',
  kqCamNghia.timNghia?.trangThai === 'DA_CAM' && kqCamNghia.timNghia?.ketQua?.[0]?.nut === 'bieu:9603',
);

const lan1 = JSON.stringify(timLuat('đinh tán', { limit: 15 }));
const lan2 = JSON.stringify(timLuat('đinh tán', { limit: 15 }));
kiem('tất định 100%: hai lần gọi liên tiếp giống nhau từng byte', lan1 === lan2);

kiem(
  'xacDinhChieu nhận diện đúng câu loại trừ không cần dan',
  xacDinhChieu('Nhóm này không bao gồm mặt hàng bằng thủy tinh.', [], 25) === 'LOAI'
    && xacDinhChieu('Vải dệt (trừ vải tráng phủ nhựa).', [], 18) === 'LOAI'
    && xacDinhChieu('Nhóm này bao gồm đinh, đinh ghim bằng sắt.', [], 20) === 'NHAC',
);

if (process.argv.includes('--thong-ke')) {
  console.log('\n=== THỐNG KÊ M-41 ===');
  console.log(JSON.stringify({
    khoTim: KHO_DUOC_TIM,
    tongCauLapChiMuc: idx.tongCau,
    thoiGianNapMs: msNap,
    thoiGianTimBanChaiMs: msTim,
    soCauDanKhongBaoGomKiemTra: cacCauCoDanLoaidoc.length,
    soNutNoiThongPhaiDoc: daThuNut.size,
  }, null, 2));
}

xong();
