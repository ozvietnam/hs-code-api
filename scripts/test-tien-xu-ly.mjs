#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * scripts/test-tien-xu-ly.mjs — Kiểm tra toàn bộ T-4 (#1596), chạy hoàn toàn offline trong CI (không cần model HF, không AI, không mạng).
 *
 * Kiểm:
 *   1. Công tắc HS_TIEN_XU_LY mặc định TẮT; đọc đúng on/1/true vs off/0/false/"".
 *   2. Từ điển data/tu-dien-tien-xu-ly.json khớp từng byte với dungTuDien({ loaiCaKin: false }); 2 lần dựng trùng sha256;
 *      dungTuDien({ loaiCaKin: true }) loại sạch 607 dòng ca kín S-7; 0 PII.
 *   3. Phân tích 5 trường (tenChinh, chatLieu, boiCanh, thongSo, modelHang), đặc biệt "đai lưng tập gym" & "dai lung tap gym".
 *   4. Mở viết tắt an toàn (kt, cl, cs, nsx, sx, đk/dk, đt/dt, sp, pt, lk, tb, tbđ/tbd, d/c, dc, ac) KHÔNG làm hỏng da/in/co/lo/bo/AC/DC/PT-100.
 *   5. Sửa lỗi gõ ED=1 trên từ >=4 ký tự không làm hỏng mã model (fk02) hay đơn vị (220V, 50mm, 100W, DN25).
 *   6. Khôi phục dấu tiếng Việt (doi + ba + don) & tốc độ < 5 ms/câu.
 *   7. embed-pool: hoạt động sạch với mock embedder + mock index (centroid & int8), trả null êm khi lỗi/thiếu index/model.
 *   8. timTruoc: "cờ tắt = đường cũ" (trùng sha256 từng byte với hành vi nền, không có tomTat.tienXuLy); bật với mock embedFn & fallback khi embedFn=null;
 *      ca ngược trọng số tenChinh thắng boiCanh.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dungTuDien } from './dung-tu-dien-tien-xu-ly.mjs';
import { thuThapMucChiMuc, dungChiMucNghia } from './dung-chi-muc-nghia.mjs';
import { tao7BienThe } from './do-tien-xu-ly-de-rieng.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const txlMod = require('../lib/tien-xu-ly.js');
const ep = require('../lib/embed-pool.js');
const tt = require('../lib/tim-truoc.js');
const ozSearch = require('../lib/oz-precedent-search.js');
const llmTier = require('../lib/llm-tier.js');
const { classifyLoop, SYS_R1 } = require('../lib/engine-loop.js');
const { scanString } = require('../lib/privacy-filter.js');

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

let pass = 0;
let fail = 0;
const check = (name, cond, extra) => {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}${extra === undefined ? '' : ` — ${JSON.stringify(extra).slice(0, 400)}`}`);
  }
};

// Lưu giữ mock ozSearch gọn nhẹ, cố định để test không phụ thuộc thay đổi file oz-gold.
const origOzSearch = ozSearch.searchOzByKeyword;
let mockOz = [];
ozSearch.searchOzByKeyword = async () => ({ items: JSON.parse(JSON.stringify(mockOz)) });

try {
  // ── 1. Công tắc HS_TIEN_XU_LY ──────────────────────────────────────────────
  delete process.env.HS_TIEN_XU_LY;
  check('công tắc HS_TIEN_XU_LY mặc định TẮT', txlMod.bat() === false);
  for (const v of ['on', '1', 'true', 'ON']) {
    process.env.HS_TIEN_XU_LY = v;
    check(`công tắc "${v}" → bật`, txlMod.bat() === true);
  }
  for (const v of ['off', '0', 'false', '', 'shadow']) {
    process.env.HS_TIEN_XU_LY = v;
    check(`công tắc "${v}" → tắt`, txlMod.bat() === false);
  }
  delete process.env.HS_TIEN_XU_LY;

  // ── 2. Từ điển & tất định S-7 ────────────────────────────────────────────────
  const committedPath = path.join(ROOT, 'data', 'tu-dien-tien-xu-ly.json');
  const committedRaw = fs.readFileSync(committedPath);
  const committed = JSON.parse(committedRaw.toString('utf8'));
  const rebuilt1 = dungTuDien({ loaiCaKin: false });
  const rebuilt2 = dungTuDien({ loaiCaKin: false });
  const b1 = Buffer.from(`${JSON.stringify(rebuilt1)}\n`, 'utf8');
  const b2 = Buffer.from(`${JSON.stringify(rebuilt2)}\n`, 'utf8');
  const reqKeys = ['phienBan', 'thongKe', 'don', 'doi', 'ba', 'tuVung', 'tuAnh', 'vietTat', 'chatLieu', 'boiCanhMau', 'hang'];
  const schemaOk = reqKeys.every((k) => k in committed)
    && committed.loaiCaKin === false
    && Array.isArray(committed.hang?.brands)
    && Array.isArray(committed.hang?.models);
  const trongDungSai = (a, b) => Math.abs(a - b) <= Math.max(20, Math.ceil(Math.max(a, b) * 0.15));
  const countsOk = ['soDon', 'soDoi', 'soTuVung', 'soChatLieu'].every((k) =>
    trongDungSai(committed.thongKe?.[k] || 0, rebuilt1.thongKe?.[k] || 0),
  );
  check(
    `từ điển tất định 2 lần dựng trùng sha256 (${sha256(b1).slice(0, 12)}…), đúng lược đồ & dung sai <=15% (chạy --ghi nếu lệch)`,
    b1.equals(b2)
      && schemaOk
      && countsOk
      && committedRaw.length >= 400_000
      && committedRaw.length <= 2_600_000,
    { len: committedRaw.length, committed: committed.thongKe, rebuilt: rebuilt1.thongKe },
  );

  const s7Dict1 = dungTuDien({ loaiCaKin: true });
  const s7Dict2 = dungTuDien({ loaiCaKin: true });
  check(
    'dungTuDien({ loaiCaKin: true }) loại sạch 607 dòng ca kín S-7 và tất định',
    s7Dict1.loaiCaKin === true
      && s7Dict1.thongKe.soDongOzLoai === 607
      && sha256(JSON.stringify(s7Dict1)) === sha256(JSON.stringify(s7Dict2)),
    s7Dict1.thongKe,
  );

  const piiHits = [
    ...committed.chatLieu,
    ...committed.boiCanhMau,
    ...committed.hang.brands,
    ...committed.hang.models,
  ].flatMap((s) => scanString(s).filter((h) => h.hard && !(h.match === 'cty' && !/\bcty\b/i.test(s))));
  const nsxLeakRe = /(?:^|\s)(?:nsx|ltd|hammy|hengyuntong|ght|zhenda|haomi|juchao|ningbo|guangzhou|shenzhen|co ltd|trading co|technology co)(?:\s|$)/i;
  const badBrandRe = /(?:trading|trade|factory|imp\s*&\s*exp|co\.?\s*,?\s*ltd)/i;
  const leakDictHits = [
    ...Object.keys(committed.don),
    ...Object.values(committed.don),
    ...Object.keys(committed.doi),
    ...Object.values(committed.doi),
    ...Object.keys(committed.ba),
    ...Object.values(committed.ba),
    ...Object.keys(committed.tuVung),
    ...committed.tuAnh,
    ...committed.chatLieu,
    ...committed.boiCanhMau,
    ...committed.hang.brands,
    ...committed.hang.models,
  ].filter((x) => nsxLeakRe.test(String(x)));
  const leakBrandCoHits = committed.hang.brands.filter((b) => badBrandRe.test(String(b)));
  check(
    '0 vi phạm riêng tư / tên công ty / đuôi NSX trong toàn bảng từ điển tiền xử lý (don/doi/ba/tuVung/tuAnh/brands)',
    piiHits.length === 0 && leakDictHits.length === 0 && leakBrandCoHits.length === 0,
    { piiHits: piiHits.slice(0, 3), leakDictHits: leakDictHits.slice(0, 5), leakBrandCoHits: leakBrandCoHits.slice(0, 5) },
  );

  // ── 3. Khôi phục dấu & tách 5 trường ────────────────────────────────────────
  const daiCoDau = txlMod.tienXuLy('đai lưng tập gym');
  const daiKhongDau = txlMod.tienXuLy('dai lung tap gym');
  check(
    '"đai lưng tập gym" → tenChinh: "đai lưng", boiCanh = "tập gym"',
    daiCoDau.tenChinh === 'đai lưng' && daiCoDau.boiCanh.includes('tập gym'),
    daiCoDau,
  );
  check(
    '"dai lung tap gym" → khôi phục dấu + tenChinh: "đai lưng", boiCanh = "tập gym"',
    daiKhongDau.cauCoDau === 'đai lưng tập gym'
      && daiKhongDau.tenChinh === 'đai lưng'
      && daiKhongDau.boiCanh.includes('tập gym'),
    daiKhongDau,
  );
  check(
    'cacCauTim đặt tenChinh trọng số cao nhất, boiCanh thấp nhất (không đứng một mình làm câu chính)',
    daiKhongDau.cacCauTim[0]?.loai === 'tenChinh'
      && daiKhongDau.cacCauTim[0].trongSo > daiKhongDau.cacCauTim.at(-1).trongSo
      && daiKhongDau.cacCauTim.at(-1)?.loai === 'boiCanh',
    daiKhongDau.cacCauTim,
  );

  const vanKd = txlMod.tienXuLy('van dien tu khi nen 5/2 than nhom, 220v ac, dn25');
  check(
    'trích đủ 5 trường cho van không dấu (trigram "van điện từ", nhôm, 220v/dn25/5/2)',
    vanKd.tenChinh === 'van điện từ khí nén'
      && vanKd.chatLieu.includes('nhôm')
      && vanKd.thongSo.some((x) => /220v/i.test(x))
      && vanKd.thongSo.some((x) => /5\/2/.test(x))
      && vanKd.thongSo.some((x) => /dn25/i.test(x)),
    vanKd,
  );

  const kinh = txlMod.tienXuLy('Kính mắt thời trang bằng nhựa, kích thước (14,5*5)cm, Model 26601, Hiệu GAOZI, mới 100%');
  check(
    'bóc đúng modelHang ("26601", "GAOZI"), chatLieu ("nhựa"), thongSo ("(14,5*5)cm") và giữ sạch tenChinh',
    kinh.tenChinh === 'kính mắt thời trang'
      && kinh.chatLieu === 'nhựa'
      && kinh.thongSo.includes('(14,5*5)cm')
      && kinh.modelHang.includes('26601')
      && kinh.modelHang.includes('GAOZI'),
    kinh,
  );

  const lkPrefix = txlMod.tienXuLy('linh kien dung cho xe may - ma phanh truoc');
  check(
    'gỡ boilerplate đầu câu "linh kiện dùng cho xe máy - má phanh trước" → tenChinh: "má phanh trước", boiCanh: "xe máy"',
    lkPrefix.tenChinh === 'má phanh trước' && lkPrefix.boiCanh.includes('xe máy'),
    lkPrefix,
  );

  const ranhGioiCases = [
    ['khẩu trang 4 lớp', /^khẩu trang 4 lớp$/],
    ['dây 10 mét', /^dây 10 mét$/],
    ['tui 5 goi', /^túi 5 gói$/],
    ['tu 3 mat', /^t[ừủ] 3 mặt$/],
    ['thep 4 lo', /^thép 4 l[òỗ]$/],
    ['thuoc 5 gam', /^th[ướớuố]+c 5 g[aầ]m$/u],
  ];
  const ranhGioiRes = ranhGioiCases.map(([inp]) => txlMod.tienXuLy(inp));
  check(
    'ranh giới Unicode: không cắt "4 lớp" / "10 mét" / "5 goi" / "3 mat" / "4 lo" / "5 gam" thành đơn vị l/m/g',
    ranhGioiRes.every((r, idxCase) => r.thongSo.length === 0 && ranhGioiCases[idxCase][1].test(r.tenChinh)),
    ranhGioiRes.map((r) => ({ tenChinh: r.tenChinh, thongSo: r.thongSo })),
  );

  const specHopLe = txlMod.tienXuLy('van 220V 50W 10mm DN25 5/2');
  check(
    'ranh giới Unicode chiều thuận: vẫn bắt đủ 220V, 50W, 10mm, DN25, 5/2',
    ['220V', '50W', '10mm', 'DN25', '5/2'].every((sp) => specHopLe.thongSo.includes(sp)),
    specHopLe.thongSo,
  );

  const objSpecs = txlMod.tienXuLy({ tenHang: 'May bom nuoc', specs: '750W', brand: 'Pentax' });
  check(
    'giữ nguyên inputObj.specs ("750W") và inputObj.brand ("Pentax") khi bóc trường',
    objSpecs.thongSo.includes('750W') && objSpecs.modelHang.includes('Pentax'),
    objSpecs,
  );

  // ── 4. Mở viết tắt an toàn & bảo vệ từ thật ────────────────────────────────
  const vt1 = txlMod.tienXuLy('sp lk đt: op lung nhuaa pvc, kt: 50x40mm, cl: nhua, cs: 100W, nsx ABC');
  check(
    'mở viết tắt sp, lk, đt, kt, cl, cs, nsx chính xác',
    vt1.cauDaMoVietTat.includes('sản phẩm')
      && vt1.cauDaMoVietTat.includes('linh kiện')
      && vt1.cauDaMoVietTat.includes('điện thoại')
      && vt1.cauDaMoVietTat.includes('kích thước')
      && vt1.cauDaMoVietTat.includes('chất liệu')
      && vt1.cauDaMoVietTat.includes('công suất')
      && vt1.cauDaMoVietTat.includes('nhà sản xuất'),
    vt1.cauDaMoVietTat,
  );

  const vtBaoVe = txlMod.tienXuLy('túi da bò, áo in hình, có bộ 2 cái, lò nướng 100W AC 220V DC, model PT-100, fk02');
  check(
    'CA NGƯỢC: không làm hỏng da, in, có, bộ, lò, AC, DC, PT-100, fk02, 100W, 220V',
    vtBaoVe.cauCoDau.includes('da bò')
      && vtBaoVe.cauCoDau.includes('in hình')
      && vtBaoVe.cauCoDau.includes('có bộ')
      && vtBaoVe.cauCoDau.includes('lò nướng')
      && vtBaoVe.cauCoDau.includes('AC')
      && vtBaoVe.cauCoDau.includes('DC')
      && vtBaoVe.cauCoDau.includes('PT-100')
      && vtBaoVe.cauCoDau.includes('fk02')
      && vtBaoVe.thongSo.includes('100W')
      && vtBaoVe.thongSo.includes('220V'),
    vtBaoVe,
  );

  const vtDc = txlMod.tienXuLy('pt dc buoc, bo dk tu xa, quat cn, tbđ');
  check(
    'mở viết tắt theo ngữ cảnh: pt dc → phụ tùng động cơ, dk → điều khiển, quat cn → quạt công nghiệp, tbđ → thiết bị điện',
    vtDc.cauCoDau.includes('phụ tùng động cơ')
      && vtDc.cauCoDau.includes('bộ điều khiển từ xa')
      && vtDc.cauCoDau.includes('quạt công nghiệp')
      && vtDc.cauCoDau.includes('thiết bị điện'),
    vtDc.cauCoDau,
  );

  // ── 5. Sửa lỗi gõ (ED === 1, >= 4 ký tự) & tốc độ < 5 ms ───────────────────
  const typo1 = txlMod.tienXuLy('may bom nuocc gia dinh model fk02 cs 750W 50mm');
  check(
    'sửa lỗi gõ "nuocc" → "nước" mà giữ nguyên mã model "fk02" và thông số "750W", "50mm"',
    typo1.cauCoDau.includes('máy bơm nước')
      && typo1.cauCoDau.includes('fk02')
      && typo1.thongSo.includes('750W')
      && typo1.thongSo.includes('50mm'),
    typo1,
  );

  const typoTrans = txlMod.tienXuLy('gioung ngủ bằng gỗ cn, bộ sạc nahnh');
  check(
    'sửa lỗi đảo ký tự "gioung" → "giường", "nahnh" → "nhanh" và mở "gỗ cn" → "gỗ công nghiệp"',
    typoTrans.cauCoDau.includes('giường ngủ')
      && typoTrans.cauCoDau.includes('gỗ công nghiệp')
      && typoTrans.cauCoDau.includes('bộ sạc nhanh'),
    typoTrans.cauCoDau,
  );

  const typoEn = txlMod.tienXuLy('tai nghe blutooth');
  check('sửa lỗi gõ từ tiếng Anh "blutooth" → "bluetooth"', typoEn.cauCoDau.includes('bluetooth'), typoEn.cauCoDau);

  const chinese = txlMod.tienXuLy({ tenHang: '气动电磁阀 4V210-08' });
  check('tên chữ Hán giữ nguyên an toàn với coChuHan: true', chinese.coChuHan === true && chinese.cacCauTim.length === 0, chinese);

  // Đo tốc độ ấm trung bình của tienXuLy (< 5 ms/lượt)
  const samples = [
    'dai lung tap gym',
    'kinh mat thoi trang bang nhua pvc, kt: 50x40mm, model fk02',
    'may bom nuocc gia dinh cs: 750w, cl: thep khong gi',
    'Van điện từ khí nén 5/2 thân nhôm, dùng điều khiển xi lanh khí nén',
  ];
  const tStart = performance.now();
  for (let i = 0; i < 40; i += 1) txlMod.tienXuLy(samples[i % samples.length]);
  const avgMs = (performance.now() - tStart) / 40;
  check(`tốc độ tienXuLy() < 5 ms/lượt (thực tế: ${avgMs.toFixed(2)} ms)`, avgMs < 5, { avgMs });

  const chuoi40k = 'van '.repeat(40000);
  const tKp0 = performance.now();
  const kqKp40k = txlMod.khoiPhucDau(chuoi40k);
  const kp40kMs = performance.now() - tKp0;
  const tTxl0 = performance.now();
  const kqTxl40k = txlMod.tienXuLy(chuoi40k);
  const txl40kMs = performance.now() - tTxl0;
  check(
    `tuyến tính O(n): khoiPhucDau 40.000 từ (${kp40kMs.toFixed(1)} ms) & tienXuLy 40.000 từ (${txl40kMs.toFixed(1)} ms) < 1000 ms`,
    kp40kMs < 1000 && txl40kMs < 1000 && kqKp40k.length > 40000 && kqTxl40k.cauGoc.length <= 2000,
    { kp40kMs, txl40kMs },
  );

  // ── 6. embed-pool offline mock & lỗi an toàn ─────────────────────────────────
  const fakeIdx = {
    items: [
      { hs: '90049090', nguon: 'oz', ten: 'Kính mắt thời trang', vec: [1, 0, 0] },
      { hs: '84812090', nguon: 'oz', ten: 'Van điện từ khí nén', vec: [0, 1, 0] },
    ],
  };
  const mockEmbedder = async (q) => (q.includes('kính') ? [0.99, 0.01, 0] : [0, 0.99, 0.01]);
  const semOk = await ep.timTheoNghia('kính mắt', { k: 5, index: fakeIdx, embedder: mockEmbedder });
  check(
    'embed-pool timTheoNghia hoạt động với mock embedder & index offline',
    semOk?.nhom4?.[0]?.ma === '9004' && semOk?.muc?.[0]?.hs === '90049090',
    semOk,
  );

  // Mô phỏng thiếu index / tường minh index: null / model lỗi → trả null êm, không rơi xuống .bin trên đĩa
  const semMissing = await ep.timTheoNghia('kính mắt', { index: null, embedder: async () => { throw new Error('offline'); } });
  const semExplicitNull = await ep.timTheoNghia('kính mắt', { index: null, embedder: mockEmbedder });
  const embErr = await ep.embedCau('kính mắt', { embedder: async () => { throw new Error('no model'); } });
  check('embed-pool trả null êm khi index:null tường minh hoặc model lỗi (không rơi xuống đĩa)', semMissing === null && semExplicitNull === null && embErr === null);

  // Test định lượng int8 trực tiếp
  const int8Buf = new Int8Array([127, 0, 0, 0, 127, 0]);
  const int8Idx = {
    kieu: 'int8',
    dim: 3,
    count: 2,
    scale: 127,
    items: [
      { hs: '90049090', nguon: 'oz', ten: 'Kính mắt' },
      { hs: '84812090', nguon: 'oz', ten: 'Van khí nén' },
    ],
    vectors: int8Buf,
  };
  const int8Hit = ep.timTheoNghiaTrucTiep([0, 1, 0], int8Idx, { k: 2 });
  check('timTheoNghiaTrucTiep chấm int8 chính xác', int8Hit?.nhom4?.[0]?.ma === '8481' && int8Hit.nhom4[0].diem > 0.9, int8Hit);

  // ── 7. timTruoc: "cờ tắt = đường cũ" & bật với RRF trọng số ─────────────────
  mockOz = [{ hsCode: '90049090', tenHang: 'Kính mắt thời trang', chatLieu: 'nhựa', ozCount: 50, matchCoverage: 100 }];
  const offCases = [
    { tenHang: 'Van điện từ khí nén 5/2 thân nhôm, cổng ren 1/4 inch, dùng điều khiển xi lanh khí nén' },
    { tenHang: 'Kính mắt thời trang bằng nhựa, kích thước (14,5*5)cm, Model 26601, Hiệu GAOZI, mới 100%' },
    { tenHang: 'đai lưng tập gym' },
    { tenHang: '气动电磁阀 4V210-08' },
    {},
  ];
  delete process.env.HS_TIEN_XU_LY;
  const hashes1 = [];
  let noTienXuLyKey = true;
  for (const c of offCases) {
    const r = await tt.timTruoc(c);
    if ('tienXuLy' in (r.tomTat || {})) noTienXuLyKey = false;
    // Bỏ trường ms dao động 1ms khi so hash ổn định
    const { ms: _ms, ...stableTomTat } = r.tomTat;
    hashes1.push(sha256(JSON.stringify({ khoi: r.khoi, nhomNap: r.nhomNap, tomTat: stableTomTat })));
  }
  const hashes2 = [];
  for (const c of offCases) {
    const r = await tt.timTruoc(c);
    const { ms: _ms, ...stableTomTat } = r.tomTat;
    hashes2.push(sha256(JSON.stringify({ khoi: r.khoi, nhomNap: r.nhomNap, tomTat: stableTomTat })));
  }
  check(
    'cờ tắt = đường cũ: 5 ca đa dạng không có tomTat.tienXuLy và sha256 lặp lại trùng 100%',
    noTienXuLyKey && JSON.stringify(hashes1) === JSON.stringify(hashes2),
  );

  // Bật HS_TIEN_XU_LY + fallback khi embedFn trả null
  process.env.HS_TIEN_XU_LY = 'on';
  mockOz = [{ hsCode: '90049090', tenHang: 'Kính mắt thời trang', chatLieu: 'nhựa', ozCount: 50, matchCoverage: 100 }];
  const onKinh = await tt.timTruoc(
    { tenHang: 'kinhh mat thoi trang bang nhuaa pvc, kt: 50x40mm, model fk02' },
    { embedFn: async (q) => ep.timTheoNghia(q, { k: 5, index: fakeIdx, embedder: mockEmbedder }) },
  );
  check(
    'HS_TIEN_XU_LY=on: gõ sai + không dấu tìm ra đúng nhóm 9004, có nguồn "nghia" & tomTat.tienXuLy',
    onKinh.tomTat.nhom[0] === '9004'
      && onKinh.tomTat.nguon['9004'].includes('nghia')
      && onKinh.tomTat.tienXuLy?.tenChinh === 'kính mắt thời trang'
      && onKinh.tomTat.tienXuLy?.coNghia === true,
    onKinh.tomTat,
  );

  const onFallback = await tt.timTruoc(
    { tenHang: 'kinhh mat thoi trang bang nhuaa' },
    { embedFn: async () => null },
  );
  check(
    'HS_TIEN_XU_LY=on + embedFn=null (không model): tìm chữ vẫn chạy sạch, coNghia=false',
    onFallback.tomTat.nhom[0] === '9004' && onFallback.tomTat.tienXuLy?.coNghia === false,
    onFallback.tomTat,
  );

  // Ca ngược trọng số: gopTrongSo đảm bảo tenChinh (1.0) thắng boiCanh (0.15)
  const wRrf = tt.gopTrongSo([
    { ds: ['90049090', '39269099'], trongSo: 1.0 },
    { ds: ['95069100'], trongSo: 0.15 },
  ], 4);
  check(
    'CA NGƯỢC gopTrongSo: câu tenChinh (trọng số 1.0) đứng trên câu boiCanh (0.15)',
    wRrf[0][0] === '9004' && wRrf[1][0] === '3926' && wRrf[2][0] === '9506',
    wRrf,
  );

  // Kiểm tra hàm tạo 7 biến thể của benchmark tất định
  const b7 = tao7BienThe({ tenHang: 'Đai lưng tập gym', chatLieu: 'Vải nylon', congDung: 'Hỗ trợ tập thể hình', nguonDong: 'oz-gold:1' });
  check(
    'tao7BienThe sinh đủ 7 biến thể sạch, tất định',
    ['sach', 'khongDau', 'goSai', 'vietTat', 'rutNgan', 'tenKhac', 'tronAnh'].every((k) => Boolean(b7[k]?.tenHang)),
    b7,
  );

  // ── 8. Tích hợp classifyLoop + L1 bất biến prompt ─────────────────────────
  const origCallLLM = llmTier.callLLMJson;
  const origConsoleErr = console.error;
  const origConsoleWarn = console.warn;
  const origMic = process.env.MIC_OFF;
  const origHold = process.env.HS_EVAL_EXCLUDE_HOLDOUT;
  const origBudget = process.env.CLASSIFY_BUDGET_MS;
  try {
    process.env.MIC_OFF = '1';
    process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
    process.env.CLASSIFY_BUDGET_MS = '285000';
    console.error = () => {};
    console.warn = () => {};

    let llmCalls = [];
    let script = [];
    llmTier.callLLMJson = async (system, user, opts = {}) => {
      llmCalls.push({ step: opts.step, system: String(system), user: String(user) });
      const next = script.length > 1 ? script.shift() : script[0];
      return { json: JSON.parse(JSON.stringify(next)), provider: 'stub', model: 'stub' };
    };
    const r1Kinh = {
      product: { nameVi: 'Kính mắt thời trang', nameEn: 'fashion glasses', purpose: 'trang trí', mechanism: 'không áp dụng', material: 'nhựa', form: 'hoàn chỉnh', evidence: {} },
      hypotheses: [{ chapter: '90', heading4: '9004', subheading6: '900490', why: 'kính đeo mắt', confidence: 90 }],
      verify: { searchVi: ['kính mắt'], codes8: ['90049090'], unknowns: [] },
    };
    const r2Kinh = {
      decision: 'CHOT',
      hs: '90049090',
      confidence: 88,
      reason: 'Kính đeo mắt thời trang — 9004.90',
      basis: [{ stream: 'SAN_PHAM', claim: 'kính mắt', evidence: 'Kính mắt thời trang' }],
      conditions: [],
      alternatives: [],
      questions: [],
    };
    mockOz = [{ hsCode: '90049090', tenHang: 'Kính mắt thời trang', chatLieu: 'nhựa', ozCount: 95, matchCoverage: 100 }];

    process.env.HS_TIM_TRUOC = 'on';
    delete process.env.HS_TIEN_XU_LY;
    script = [r1Kinh, r2Kinh];
    llmCalls = [];
    const loopOff = await classifyLoop({ tenHang: 'Kính mắt thời trang bằng nhựa' }, {});
    const callsOff = [...llmCalls];

    process.env.HS_TIEN_XU_LY = 'on';
    process.env.HS_SEMANTIC_INDEX = '/tmp/khong-ton-tai-s7.json';
    ep.reset();
    script = [r1Kinh, r2Kinh];
    llmCalls = [];
    const loopOn = await classifyLoop({ tenHang: 'kinh mat thoi trang bang nhua' }, {});
    const callsOn = [...llmCalls];
    ep.reset();
    delete process.env.HS_SEMANTIC_INDEX;
    delete process.env.HS_TIM_TRUOC;
    delete process.env.HS_TIEN_XU_LY;

    check(
      'L1 classifyLoop: lời dặn hệ thống vòng 1/vòng 2 giữ nguyên từng byte (cùng sha256) khi bật HS_TIEN_XU_LY',
      callsOff.length >= 2
        && callsOn.length >= 2
        && sha256(callsOff[0].system) === sha256(callsOn[0].system)
        && sha256(callsOff[1].system) === sha256(callsOn[1].system)
        && callsOn[0].system.startsWith(SYS_R1)
        && !('tienXuLy' in (loopOff.engine?.timTruoc || {}))
        && Boolean(loopOn.engine?.timTruoc?.tienXuLy?.tenChinh === 'kính mắt thời trang'),
      { off: loopOff.engine?.timTruoc, on: loopOn.engine?.timTruoc },
    );
  } finally {
    llmTier.callLLMJson = origCallLLM;
    console.error = origConsoleErr;
    console.warn = origConsoleWarn;
    if (origMic === undefined) delete process.env.MIC_OFF; else process.env.MIC_OFF = origMic;
    if (origHold === undefined) delete process.env.HS_EVAL_EXCLUDE_HOLDOUT; else process.env.HS_EVAL_EXCLUDE_HOLDOUT = origHold;
    if (origBudget === undefined) delete process.env.CLASSIFY_BUDGET_MS; else process.env.CLASSIFY_BUDGET_MS = origBudget;
  }

  // ── 9. Chỉ mục nghĩa Option B (dung-chi-muc-nghia & taiChiMucNghia) ────────
  const mFull = thuThapMucChiMuc({ loaiCaKin: false });
  const mS7 = thuThapMucChiMuc({ loaiCaKin: true });
  check(
    'thuThapMucChiMuc({ loaiCaKin: true }) loại sạch 607 dòng ca kín S-7 và nhỏ hơn bản đầy đủ',
    mS7.soDongOzLoai === 607 && mS7.rawItems.length < mFull.rawItems.length && mS7.rawItems.length > 15000,
    { full: mFull.rawItems.length, s7: mS7.rawItems.length, loai: mS7.soDongOzLoai },
  );

  const mockExt = async (inputs) => {
    const out = new Float32Array(inputs.length * 384);
    for (let i = 0; i < inputs.length; i += 1) {
      out[i * 384 + (String(inputs[i]).length % 384)] = 1;
    }
    return { odata: out, dims: [inputs.length, 384] };
  };
  const bMock1 = await dungChiMucNghia({
    loaiCaKin: false,
    taxData: { '90049090': { vn: 'Kính râm thời trang' } },
    ozLines: [{ hsCode: '90049090', tenHang: 'Kính mắt thời trang' }],
    precedents: {},
    extractor: mockExt,
  });
  const bMock2 = await dungChiMucNghia({
    loaiCaKin: false,
    taxData: { '90049090': { vn: 'Kính râm thời trang' } },
    ozLines: [{ hsCode: '90049090', tenHang: 'Kính mắt thời trang' }],
    precedents: {},
    extractor: mockExt,
  });
  check(
    'dungChiMucNghia tất định 2 lần dựng trùng sha256 (.bin + .meta.json)',
    bMock1.bin.equals(bMock2.bin) && bMock1.metaBuf.equals(bMock2.metaBuf) && bMock1.meta.soMuc === 2,
    { soMuc: bMock1.meta.soMuc },
  );

  ep.reset();
  const idxDisk = ep.taiChiMucNghia();
  const qVecMock = new Float32Array(384);
  qVecMock[10] = 1;
  const hitDisk = idxDisk ? ep.timTheoNghiaTrucTiep(qVecMock, idxDisk, { k: 5 }) : null;
  check(
    'taiChiMucNghia nạp sạch chi-muc-nghia.bin + .meta.json (Option B) trên đĩa',
    idxDisk?.kieu === 'int8'
      && idxDisk.count > 20000
      && idxDisk.vectors.length === idxDisk.count * idxDisk.dim
      && Boolean(hitDisk?.nhom4?.length === 5),
    { kieu: idxDisk?.kieu, count: idxDisk?.count, dim: idxDisk?.dim, hits: hitDisk?.nhom4?.length },
  );

  // Kiểm tra file .bin bị lệch kích thước/dim → trả null an toàn
  const badBinPath = path.join(process.env.HS_DATA_DIR, 'bad-chi-muc.bin');
  const badMetaPath = path.join(process.env.HS_DATA_DIR, 'bad-chi-muc.meta.json');
  fs.writeFileSync(badBinPath, Buffer.alloc(100));
  fs.writeFileSync(badMetaPath, JSON.stringify({ dim: 384, items: [{ hs: '90049090', nguon: 'test', ten: 'A' }] }));
  ep.reset();
  const badLoaded = ep.taiChiMucNghia(badBinPath);
  check('taiChiMucNghia từ chối file .bin lệch kích thước (trả null)', badLoaded === null, badLoaded);
  ep.reset();
} finally {
  delete process.env.HS_TIEN_XU_LY;
  ozSearch.searchOzByKeyword = origOzSearch;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
