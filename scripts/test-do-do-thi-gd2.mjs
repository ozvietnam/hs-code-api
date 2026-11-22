#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * scripts/test-do-do-thi-gd2.mjs — Tự kiểm bộ đo Stage-2 `scripts/do-do-thi-gd2.mjs`.
 *
 * Kiểm:
 *   1. Nạp module không kích hoạt CLI; phân tích tham số `--nhanh`, `--du`, `--json`, `--ghi-bao-cao`, `--che-pII`, `--gioi-han`.
 *   2. Hai lượt chạy `--nhanh --gioi-han=3` qua tiến trình riêng cho kết quả tất định 100% (số liệu cạnh, Top-93, C4, accuracy timTruoc).
 *   3. Mặc định `HS_TIEN_XU_LY` OFF (khớp `data/luat/bang-co.json`); không sửa `bang-co.json` hay `thong-ke.json`; không gọi mạng (`fetch` = 0).
 *   4. Zero-PII: đầu ra Markdown (`--ghi-bao-cao`) và JSON không chứa bất kỳ tên hàng Oz riêng tư hay PII nào; ca âm tính bắt được chuỗi Oz/PII tiêm vào.
 *   5. Graceful skip cho C4 khi tệp `c4-model-hang.json` không tồn tại.
 *   6. Chạy nhanh `< 15s`, hoàn toàn ngoại tuyến trong CI, dùng `boKiem` để `dem-ca-test.mjs` đếm được.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GOC, docJson, boKiem } from './lib-luat.mjs';
import {
  BIEN_THE_S7,
  dinhDangBaoCaoMarkdown,
  doDoPhuC4,
  kiemTraZeroPii,
  layMauDeu,
  phanTichThamSo,
} from './do-do-thi-gd2.mjs';

const { kiem, xong } = boKiem('test-do-do-thi-gd2');
const SCRIPT = path.join(GOC, 'scripts', 'do-do-thi-gd2.mjs');

/** Bỏ các trường thời gian/RAM dao động giữa hai tiến trình để kiểm tính tất định tuyệt đối. */
function chuanHoaTatDinh(kq) {
  const boThoiGian = (bo) => ({
    n: bo.n,
    tongTrongTep: bo.tongTrongTep,
    coUngVien: bo.coUngVien,
    top1_4: bo.top1_4,
    top3_4: bo.top3_4,
    top5_4: bo.top5_4,
    pn6_1: bo.pn6_1,
    pn6_3: bo.pn6_3,
    ...(bo.van52 ? { van52: bo.van52 } : {}),
  });
  const bienThe = {};
  for (const [k, v] of Object.entries(kq.timTruoc.macDinhOff.s7_holdout.bienThe || {})) {
    bienThe[k] = boThoiGian(v);
  }
  return {
    phienBan: kq.phienBan,
    thamSo: kq.thamSo,
    doPhuDoThi: {
      bamBangCanh: kq.doPhuDoThi.bamBangCanh,
      soCanh: kq.doPhuDoThi.soCanh,
      chiTietCanh: kq.doPhuDoThi.chiTietCanh,
      top93: kq.doPhuDoThi.top93,
      toanSoTay: kq.doPhuDoThi.toanSoTay,
    },
    c4: kq.c4,
    timTruoc: {
      hsTienXuLyMacDinh: kq.timTruoc.hsTienXuLyMacDinh,
      s7KiemTra: kq.timTruoc.s7KiemTra,
      macDinhOff: {
        van_5_2: boThoiGian(kq.timTruoc.macDinhOff.van_5_2),
        van_khi_nen_30: boThoiGian(kq.timTruoc.macDinhOff.van_khi_nen_30),
        chua_tung_khai_100: boThoiGian(kq.timTruoc.macDinhOff.chua_tung_khai_100),
        s7_holdout: {
          sach: boThoiGian(kq.timTruoc.macDinhOff.s7_holdout.sach),
          bienThe,
        },
      },
    },
  };
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd2-test-'));
try {
  // ── 1. Import không chạy CLI & phân tích tham số ─────────────────────────────────────────
  const probe = path.join(tmpDir, 'probe-import.mjs');
  const probeJson = path.join(tmpDir, 'never-written.json');
  fs.writeFileSync(
    probe,
    `import { BIEN_THE_S7 } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};\nconsole.log(BIEN_THE_S7.length);\n`,
    'utf8',
  );
  const probeOut = execFileSync(process.execPath, [probe, '--nhanh', `--json=${probeJson}`], { cwd: GOC, encoding: 'utf8' }).trim();
  kiem('import do-do-thi-gd2.mjs không tự chạy CLI hay ghi tệp', probeOut === '7' && !fs.existsSync(probeJson), { probeOut });

  const p1 = phanTichThamSo(['--nhanh', '--json', '/tmp/a.json', '--ghi-bao-cao', '/tmp/b.md', '--che-pII', '--so-sanh-tien-xu-ly']);
  const p2 = phanTichThamSo(['--du', '--json=/tmp/c.json', '--ghi-bao-cao=/tmp/d.md', '--gioi-han=10']);
  kiem(
    'phanTichThamSo đọc đúng --nhanh / --du / --json / --ghi-bao-cao / --che-pII / --so-sanh-tien-xu-ly / --gioi-han',
    p1.cheDo === 'nhanh' && p1.chePII === true && p1.soSanhTienXuLy === true
      && p1.jsonPath === path.resolve('/tmp/a.json') && p1.baoCaoPath === path.resolve('/tmp/b.md')
      && p2.cheDo === 'du' && p2.gioiHan === 10
      && p2.jsonPath === path.resolve('/tmp/c.json') && p2.baoCaoPath === path.resolve('/tmp/d.md'),
    { p1, p2 },
  );

  let badArgThrew = false;
  try { phanTichThamSo(['--gioi-han=abc']); } catch { badArgThrew = true; }
  kiem('ca ngược: --gioi-han không hợp lệ báo lỗi rõ', badArgThrew);

  const mau = layMauDeu([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
  kiem('layMauDeu chọn đủ số phần tử, tất định và tăng dần', mau.length === 4 && mau.every((v, i) => i === 0 || v > mau[i - 1]), mau);

  // ── 2. Graceful skip khi chưa có tệp C4 ──────────────────────────────────────────────────
  const c4Thieu = await doDoPhuC4({ c4Path: path.join(tmpDir, 'khong-ton-tai-c4.json') });
  kiem(
    'C4 graceful skip khi tệp c4-model-hang.json không tồn tại',
    c4Thieu.coTep === false && c4Thieu.trangThai === 'BO_QUA_CHUA_CO_TEP',
    c4Thieu,
  );
  const bangCoTruoc = fs.readFileSync(path.join(GOC, 'data/luat/bang-co.json'), 'utf8');
  const thongKeTruoc = fs.readFileSync(path.join(GOC, 'data/do-thi/thong-ke.json'), 'utf8');

  // ── 3. Chạy 2 lần --nhanh --gioi-han=3 trong tiến trình con: tất định + cấu trúc + Zero-PII ──
  const json1 = path.join(tmpDir, 'run1.json');
  const json2 = path.join(tmpDir, 'run2.json');
  const md1 = path.join(tmpDir, 'smoke1.md');
  const md2 = path.join(tmpDir, 'smoke2.md');

  const envTest = { ...process.env };
  delete envTest.HS_TIEN_XU_LY;
  const envChaBatTxl = { ...envTest, HS_TIEN_XU_LY: 'on' };

  const t0 = performance.now();
  execFileSync(
    process.execPath,
    [SCRIPT, '--nhanh', '--gioi-han=3', '--json', json1, '--ghi-bao-cao', md1, '--che-pII'],
    { cwd: GOC, env: envTest, encoding: 'utf8' },
  );
  execFileSync(
    process.execPath,
    [SCRIPT, '--nhanh', '--gioi-han=3', '--json', json2, '--ghi-bao-cao', md2, '--che-pII'],
    { cwd: GOC, env: envChaBatTxl, encoding: 'utf8' },
  );
  const subMs = Math.round(performance.now() - t0);

  const r1Raw = fs.readFileSync(json1, 'utf8');
  const r2Raw = fs.readFileSync(json2, 'utf8');
  const r1 = JSON.parse(r1Raw);
  const r2 = JSON.parse(r2Raw);
  const m1Text = fs.readFileSync(md1, 'utf8');
  const m2Text = fs.readFileSync(md2, 'utf8');

  const norm1 = JSON.stringify(chuanHoaTatDinh(r1));
  const norm2 = JSON.stringify(chuanHoaTatDinh(r2));
  kiem(
    `2 lần chạy tiến trình riêng (kể cả shell cha export HS_TIEN_XU_LY=on) cho cùng số liệu tất định 100% (tổng 2 lượt ${subMs} ms)`,
    norm1 === norm2 && subMs < 30000,
    { subMs, diff: norm1 === norm2 },
  );

  // Kiểm tra cấu trúc JSON chuẩn
  const g = r1.doPhuDoThi;
  const tt = r1.timTruoc;
  kiem(
    'phần (a) đủ cạnh C5, C6, C7, C8, C9 (nếu có), C10, C11 + RAM RSS delta + Top-93',
    g.soCanh.C5 > 0 && g.soCanh.C6 === g.soCanh.C5 && g.soCanh.C7 > 0 && g.soCanh.C8 > 0
      && 'C9' in g.soCanh && typeof g.soCanh.C9.co === 'boolean'
      && g.soCanh.C10 > 0 && g.soCanh.C11 > 0
      && Number.isFinite(g.ram.rssDeltaMB) && g.ram.rssDeltaMB > 0
      && g.top93.soNhom === 93 && g.top93.coTieuChi6.soNhom > 0 && g.top93.coPhanBiet.soNhom > 0
      && g.top93.coTieuChi6.phanTramOzToanBo > 0 && g.top93.coPhanBiet.phanTramOzToanBo > 0,
    { soCanh: g.soCanh, ram: g.ram, top93: g.top93 },
  );

  const off = tt.macDinhOff;
  kiem(
    'phần (b) đủ 4 bộ (van-5-2, van-khi-nen-30, chua-tung-khai-100, S-7) + median/p95 ms + chặn mạng 0 fetch',
    off.van_5_2.n === 3 && off.van_khi_nen_30.n === 3 && off.chua_tung_khai_100.n === 3 && off.s7_holdout.sach.n === 3
      && [off.van_5_2, off.van_khi_nen_30, off.chua_tung_khai_100, off.s7_holdout.sach].every(
        (b) => Number.isFinite(b.doTreMs.medianMs) && Number.isFinite(b.doTreMs.p95Ms) && b.doTreMs.medianMs >= 0 && b.doTreMs.p95Ms >= b.doTreMs.medianMs,
      )
      && tt.mang.daChanFetch === true && tt.mang.lanGoiFetchBiChan === 0
      && tt.s7KiemTra.soDongOzBiLoaiS7 === 607,
    { mang: tt.mang, s7KiemTra: tt.s7KiemTra },
  );

  // Xác nhận mặc định HS_TIEN_XU_LY OFF giống bang-co.json
  const bangCo = docJson('data/luat/bang-co.json');
  const coTxl = (bangCo.co || []).find((c) => c.ten === 'HS_TIEN_XU_LY');
  kiem(
    'HS_TIEN_XU_LY mặc định OFF trong bang-co.json và trong báo cáo đo mặc định',
    Boolean(coTxl) && coTxl.macDinhBat === false
      && tt.hsTienXuLyMacDinh.trongBangCo === false
      && tt.hsTienXuLyMacDinh.dangDoMacDinh === 'OFF'
      && tt.soSanhTienXuLy.daChay === false,
    { coTxl: coTxl?.macDinhBat, hsTienXuLyMacDinh: tt.hsTienXuLyMacDinh },
  );

  // Zero-PII trên markdown & JSON + phần (c) C4 không mang chi tiết model/hãng thô
  const zMd1 = kiemTraZeroPii(m1Text);
  const zMd2 = kiemTraZeroPii(m2Text);
  const zJson = kiemTraZeroPii(r1Raw);
  const mdSkipC4 = dinhDangBaoCaoMarkdown({ ...r1, c4: c4Thieu });
  kiem(
    'Zero-PII: 0 tên hàng tờ khai Oz và 0 PII cứng lọt vào Markdown báo cáo và JSON; C4 chỉ giữ tổng hợp',
    zMd1.sach && zMd2.sach && zJson.sach
      && m1Text.includes('## (a)') && m1Text.includes('## (b)') && m1Text.includes('## (c)')
      && !('chiTietKhongChuaTenHang' in (r1.c4?.danhGiaDeRieng300 || {}))
      && !('chiTietKhongChuaTenHang' in (r1.c4?.danhGiaDeRieng300?.thamKhao || {}))
      && mdSkipC4.includes('BO_QUA_CHUA_CO_TEP'),
    { zMd1, zMd2, zJson, c4: r1.c4?.trangThai },
  );

  // Phần (c) C4 v2: đủ hang_model + model + hang === tong, hangThamKhao, soDongDuocPhuHangModel & in Markdown
  if (r1.c4?.coTep) {
    const cap = r1.c4.capChapNhan;
    const tongC4 = (cap.hang_model || 0) + cap.model + cap.hang;
    const dongC4Md = `hãng+model: ${cap.hang_model ?? 0}, model: ${cap.model}, hãng: ${cap.hang}`;
    const v2Ok = !r1.c4.laV2 || (
      cap.hang_model > 0
      && (r1.c4.hangThamKhao?.soCap || 0) > 0
      && typeof r1.c4.doPhuTrenOz?.soDongDuocPhuHangModel === 'number'
      && m1Text.includes('Hãng tham khảo:')
      && (
        r1.c4.danhGiaDeRieng300?.trangThai !== 'DA_DO'
        || (
          typeof r1.c4.danhGiaDeRieng300?.thamKhao?.soCaCoGoiY === 'number'
          && m1Text.includes('Hãng tham khảo C4 trên')
        )
      )
    );
    kiem(
      'phần (c) C4 (v1/v2): cộng (hang_model + model + hang) === tong và Markdown in đủ thành phần C4 v2',
      tongC4 === cap.tong && m1Text.includes(dongC4Md) && v2Ok,
      { cap, tongC4, laV2: r1.c4.laV2, hangThamKhao: r1.c4.hangThamKhao },
    );
  }

  // Fallback đếm hang_model / model / hang / hangThamKhao khi tệp C4 không có thongKe tóm tắt sẵn
  const c4FallbackPath = path.join(tmpDir, 'c4-fallback.json');
  fs.writeFileSync(c4FallbackPath, JSON.stringify({
    phienBan: 2,
    loaiCaKin: true,
    bang: [
      { loai: 'hang_model', khoa: 'A|1', nhom4: '8481' },
      { loai: 'hang_model', khoa: 'B|2', nhom4: '8481' },
      { loai: 'model', khoa: 'M1', nhom4: '8481' },
      { loai: 'hang', khoa: 'H1', nhom4: '8481' },
    ],
    hangThamKhao: [{ khoa: 'HTK1', nhom4: '8481' }],
    mauThuan: [{ khoa: 'MT1' }],
  }));
  const c4Fb = await doDoPhuC4({ c4Path: c4FallbackPath });
  kiem(
    'doDoPhuC4 fallback đếm đúng hang_model + model + hang và hangThamKhao khi thiếu thongKe',
    c4Fb.coTep === true
      && c4Fb.capChapNhan.hang_model === 2
      && c4Fb.capChapNhan.model === 1
      && c4Fb.capChapNhan.hang === 1
      && c4Fb.capChapNhan.tong === 4
      && c4Fb.hangThamKhao?.soCap === 1
      && c4Fb.capMauThuan.tong === 1,
    c4Fb,
  );

  // Không sửa bang-co.json hay thong-ke.json
  const bangCoSau = fs.readFileSync(path.join(GOC, 'data/luat/bang-co.json'), 'utf8');
  const thongKeSau = fs.readFileSync(path.join(GOC, 'data/do-thi/thong-ke.json'), 'utf8');
  kiem(
    'không sửa đổi data/luat/bang-co.json hay data/do-thi/thong-ke.json',
    bangCoTruoc === bangCoSau && thongKeTruoc === thongKeSau,
  );

  // Ca âm tính Zero-PII
  const s7Mau = fs.readFileSync(path.join(GOC, 'scripts', 'ca-do', 'de-rieng-300.jsonl'), 'utf8')
    .trim().split('\n').map(JSON.parse).find((r) => String(r.tenHang || '').length >= 16);
  const leakTest = kiemTraZeroPii(`${m1Text}\n${s7Mau.tenHang}`);
  const piiTest = kiemTraZeroPii('Công ty TNHH ABC MST 0123456789');
  kiem(
    'ca âm tính Zero-PII: phát hiện ngay khi tiêm tên hàng Oz hoặc tên công ty / MST',
    leakTest.sach === false && leakTest.leakedNamesCount >= 1 && piiTest.sach === false && piiTest.hardPiiCount >= 1,
    { leakTest, piiTest },
  );
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

xong();
