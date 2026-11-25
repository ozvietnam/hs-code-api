#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * scripts/test-do-do-thi-gd3.mjs — Tự kiểm ngoại tuyến cho `scripts/do-do-thi-gd3.mjs`.
 *
 * Kiểm:
 *   1. Import module không tự chạy CLI; `phanTichThamSo` đọc đúng và bắt lỗi tham số sai (ca ngược).
 *   2. `chuanHoaCa` hỗ trợ cả khuôn `tenHang/maDung` và khuôn `moTa/nhom/ketQua` (bộ v3).
 *   3. `tinhChiSoBo` tính chính xác `%` nhóm 4 số đúng, tỉ lệ "nhóm đúng bị loại ở lượt một" (rủi ro 1 mục 9),
 *      độ ổn định van 5/2, trung vị / p95, số lượt AI/ca, ký tự gói AI nhận.
 *   4. Chạy 2 tiến trình riêng `--llm gia --gioi-han=3 --phuong-an=ca-hai`: tất định 100% (kể cả khi shell cha đặt
 *      `HS_TIM_TRUOC=goi`), 0 gọi mạng (`lanGoiFetchBiChan === 0`), không sửa `bang-co.json`.
 *   5. Hỗ trợ bộ tuỳ chọn `--bo <tmp.jsonl>` và `--chi-bo=bo`.
 *   6. Zero-PII trên JSON + Markdown và ca âm tính phát hiện chuỗi Oz / MST tiêm vào.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GOC, boKiem } from './lib-luat.mjs';
import { kiemTraZeroPii } from './do-do-thi-gd2.mjs';
import {
  chuanHoaCa,
  danhGiaDieuKienGd3,
  dinhDangBaoCaoMarkdown,
  phanTichThamSo,
  tinhChiSoBo,
} from './do-do-thi-gd3.mjs';

const { kiem, xong } = boKiem('test-do-do-thi-gd3');
const SCRIPT = path.join(GOC, 'scripts', 'do-do-thi-gd3.mjs');

function chuanHoaTatDinh(kq) {
  const boThoiGian = (r) => {
    if (!r) return null;
    const { doTreMs: _dt, ...rest } = r;
    return rest;
  };
  const ketQua = {};
  for (const [k, v] of Object.entries(kq.ketQua || {})) {
    ketQua[k] = {
      ten: v.ten,
      n: v.n,
      tongTrongTep: v.tongTrongTep,
      tat: boThoiGian(v.tat),
      bat_goi: boThoiGian(v.bat_goi),
      bat_ba_buoc: boThoiGian(v.bat_ba_buoc),
    };
  }
  return {
    phienBan: kq.phienBan,
    thamSo: kq.thamSo,
    s7KiemTra: kq.s7KiemTra,
    ketQua,
  };
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd3-test-'));
try {
  // ── 1. Import không tự chạy CLI & phân tích tham số ──────────────────────────────────────
  const probe = path.join(tmpDir, 'probe-import.mjs');
  const neverJson = path.join(tmpDir, 'never.json');
  fs.writeFileSync(
    probe,
    `import { DICH_GD3 } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};\nconsole.log(Boolean(DICH_GD3.van52_on_dinh));\n`,
    'utf8',
  );
  const probeOut = execFileSync(process.execPath, [probe, '--llm', 'gia', `--json=${neverJson}`], { cwd: GOC, encoding: 'utf8' }).trim();
  kiem('import do-do-thi-gd3.mjs không tự chạy CLI hay ghi tệp', probeOut === 'true' && !fs.existsSync(neverJson), { probeOut });

  const boMauPath = path.join(tmpDir, 'bo-v3-mau.jsonl');
  fs.writeFileSync(
    boMauPath,
    [
      JSON.stringify({ tenHang: 'Van điện từ khí nén', chatLieu: 'nhôm', congDung: 'điều khiển khí nén', maDung: '84812090' }),
      JSON.stringify({ moTa: 'Đầu nối nhanh / nhựa / ghép nối đường khí', maToKhai: '39174000', ketQua: 'CHOT', nhom: ['3917'] }),
      JSON.stringify({ moTa: 'Rơ le điều khiển', ketQua: 'PHAN_VAN', nhom: ['8536', '8535'] }),
    ].join('\n') + '\n',
    'utf8',
  );

  const p1 = phanTichThamSo(['--llm', 'gia', '--chi-bo', 'van52,bo', '--bo', boMauPath, '--gioi-han=4', '--phuong-an=ca-hai', '--che-pII']);
  kiem(
    'phanTichThamSo đọc đúng --llm / --chi-bo / --bo / --gioi-han / --phuong-an / --che-pII',
    p1.llm === 'gia' && p1.phuongAn === 'ca-hai' && p1.gioiHan === 4 && p1.chePII === true
      && p1.chiBo.join(',') === 'van52,bo' && p1.boPath === path.resolve(boMauPath),
    p1,
  );

  const badCases = [
    ['--llm=khac'],
    ['--chi-bo=khongton'],
    ['--gioi-han=0'],
    ['--bo=/tmp/khong-co-tep-gd3-12345.jsonl'],
    ['--chi-bo=bo'],
  ];
  let badCaught = 0;
  for (const args of badCases) {
    try { phanTichThamSo(args); } catch { badCaught += 1; }
  }
  kiem('ca ngược: các tham số sai bị từ chối rõ ràng', badCaught === badCases.length, { badCaught });

  // ── 2. chuanHoaCa & tinhChiSoBo (gồm tỉ lệ bị loại ở lượt 1) ─────────────────────────────
  const ca1 = chuanHoaCa({ tenHang: 'Van', maDung: '84812090' }, 0);
  const ca2 = chuanHoaCa({ moTa: 'Ống / nhựa / dẫn khí', ketQua: 'PHAN_VAN', nhom: ['3917', '8481'] }, 1);
  kiem(
    'chuanHoaCa hỗ trợ cả khuôn tenHang/maDung và moTa/nhom',
    ca1.nhomDung[0] === '8481' && ca1.pn6Dung === '848120' && ca2.nhomDung.length === 2 && ca2.payload.chatLieu === 'nhựa',
    { ca1, ca2 },
  );

  const cs = tinhChiSoBo([
    { nhomDung: ['8481'], maRa4: '8481', maRa6: '848120', dungNhom4: true, dungPn6: true, coTrongUngVienTruocL1: true, coTrongR1: true, biLoaiOLuot1: false, biLoaiKhoiGoiPhanBiet: false, soLuotAi: 2, kyTuVong1: 1200, kyTuKhoiTimTruoc: 1100, kyTuVong2: 6500, kyTuGoiPhanBiet: 6200, ms: 1000, loi: false },
    { nhomDung: ['8536'], maRa4: '8537', maRa6: '853710', dungNhom4: false, dungPn6: false, coTrongUngVienTruocL1: true, coTrongR1: false, biLoaiOLuot1: true, biLoaiKhoiGoiPhanBiet: true, soLuotAi: 2, kyTuVong1: 1300, kyTuKhoiTimTruoc: 1250, kyTuVong2: 7000, kyTuGoiPhanBiet: 6800, ms: 2000, loi: false },
    { nhomDung: ['3917'], maRa4: '3926', maRa6: '392690', dungNhom4: false, dungPn6: false, coTrongUngVienTruocL1: false, coTrongR1: false, biLoaiOLuot1: false, biLoaiKhoiGoiPhanBiet: false, soLuotAi: 2, kyTuVong1: 1100, kyTuKhoiTimTruoc: 900, kyTuVong2: 6000, kyTuGoiPhanBiet: 5800, ms: 3000, loi: false },
  ], { coUngVienTruocL1: true });
  kiem(
    'tinhChiSoBo tính đúng % nhóm 4, tỉ lệ bị loại ở L1 (mẫu số = ca có trong ứng viên trước L1), trung vị/p95, ký tự gói',
    cs.dungNhom4.so === 1 && cs.dungNhom4.mauSo === 3 && cs.dungNhom4.tyLe === 33.3
      && cs.biLoaiOLuot1.so === 1 && cs.biLoaiOLuot1.mauSo === 2 && cs.biLoaiOLuot1.tyLe === 50
      && cs.doTreMs.medianMs === 2000 && cs.doTreMs.p95Ms === 3000
      && cs.luotAi.trungBinh === 2 && cs.kyTuGoiAi.goiPhanBiet.median === 6200,
    cs,
  );

  // ── 3. Hai tiến trình riêng --llm gia --gioi-han=3 --phuong-an=ca-hai ────────────────────
  const bangCoTruoc = fs.readFileSync(path.join(GOC, 'data/luat/bang-co.json'), 'utf8');
  const json1 = path.join(tmpDir, 'gd3-1.json');
  const json2 = path.join(tmpDir, 'gd3-2.json');
  const md1 = path.join(tmpDir, 'gd3-1.md');
  const md2 = path.join(tmpDir, 'gd3-2.md');

  const envClean = { ...process.env };
  delete envClean.HS_TIM_TRUOC;
  const envDirty = { ...envClean, HS_TIM_TRUOC: 'goi' };

  const t0 = performance.now();
  execFileSync(
    process.execPath,
    [SCRIPT, '--llm', 'gia', '--gioi-han=3', '--phuong-an=ca-hai', '--json', json1, '--ghi-bao-cao', md1, '--che-pII'],
    { cwd: GOC, env: envClean, encoding: 'utf8' },
  );
  execFileSync(
    process.execPath,
    [SCRIPT, '--llm', 'gia', '--gioi-han=3', '--phuong-an=ca-hai', '--json', json2, '--ghi-bao-cao', md2, '--che-pII'],
    { cwd: GOC, env: envDirty, encoding: 'utf8' },
  );
  const subMs = Math.round(performance.now() - t0);

  const r1Raw = fs.readFileSync(json1, 'utf8');
  const r1 = JSON.parse(r1Raw);
  const r2 = JSON.parse(fs.readFileSync(json2, 'utf8'));
  const m1Text = fs.readFileSync(md1, 'utf8');

  kiem(
    `2 tiến trình riêng --llm gia (kể cả khi shell cha đặt HS_TIM_TRUOC=goi) ra cùng kết quả tất định (${subMs} ms)`,
    JSON.stringify(chuanHoaTatDinh(r1)) === JSON.stringify(chuanHoaTatDinh(r2))
      && r1.mang.daChanFetch === true && r1.mang.lanGoiFetchBiChan === 0
      && r1.s7KiemTra.soDongOzBiLoaiS7 === 607,
    { subMs, mang: r1.mang, s7: r1.s7KiemTra },
  );

  const s7 = r1.ketQua.s7;
  const van52 = r1.ketQua.van52;
  const van30 = r1.ketQua.van30;
  kiem(
    'đủ 3 bộ (van52, van30, s7) với cả 3 chế độ (tat, bat_goi, bat_ba_buoc) + ký tự ba bước ≤ 1.300 & gói ≤ 7.000',
    van52?.tat?.n === 3 && van52?.bat_goi?.n === 3 && van52?.bat_ba_buoc?.n === 3
      && van30?.tat?.n === 3 && s7?.tat?.n === 3
      && van52.bat_goi.van52.dungNhom8481 === 3
      && s7.bat_ba_buoc.kyTuGoiAi.vong1.max <= 1300
      && s7.bat_ba_buoc.kyTuGoiAi.goiPhanBiet.max <= 7000
      && s7.bat_goi.kyTuGoiAi.goiPhanBiet.max <= 7000,
    { van52: van52?.bat_goi?.van52, v1Max: s7?.bat_ba_buoc?.kyTuGoiAi?.vong1?.max, goiMax: s7?.bat_goi?.kyTuGoiAi?.goiPhanBiet?.max },
  );

  kiem(
    'có gitSha, chuoiMoHinh, bảng cờ (không lộ bí mật), và cảnh báo L1 khi dùng --llm gia',
    Boolean(r1.gitSha?.ngan) && r1.chuoiMoHinh?.cheDo === 'gia'
      && !('HS_API_TOKEN' in r1.co) && !('HS_ADMIN_TOKEN' in r1.co) && !('HS_SERVICE_TOKENS' in r1.co)
      && r1.danhGiaTieuChiGd3?.goi?.chiThamKhaoViLlmGia === true
      && r1.danhGiaTieuChiGd3?.goi?.datTatCa === false
      && m1Text.includes('Đo Giai đoạn 3') && m1Text.includes('Chênh lệch BẬT − TẮT'),
    { gitSha: r1.gitSha, danhGia: r1.danhGiaTieuChiGd3 },
  );

  // Kiểm tra hàm đánh giá điều kiện nhận GĐ3 với số giả lập --llm that
  const dgThat = danhGiaDieuKienGd3({
    llm: 'that',
    s7Tat: { dungNhom4: { tyLe: 65 } },
    s7Bat: { dungNhom4: { tyLe: 72 }, doTreMs: { medianMs: 28000, p95Ms: 65000 } },
    van52Bat: { van52: { dungNhom8481: 5, soLuot: 5 }, doTreMs: { medianMs: 25000, p95Ms: 40000 } },
  });
  kiem('danhGiaDieuKienGd3 trả datTatCa=true khi --llm that đạt đủ 4 ngưỡng', dgThat.datTatCa === true, dgThat);

  // ── 4. Bộ tuỳ chọn --bo <tệp jsonl> ──────────────────────────────────────────────────────
  const boJson = path.join(tmpDir, 'bo-out.json');
  execFileSync(
    process.execPath,
    [SCRIPT, '--llm', 'gia', '--chi-bo=bo', `--bo=${boMauPath}`, '--json', boJson, '--che-pII'],
    { cwd: GOC, env: envClean, encoding: 'utf8' },
  );
  const boRes = JSON.parse(fs.readFileSync(boJson, 'utf8'));
  kiem(
    'chạy được --bo <tệp jsonl> với cả 2 khuôn (de-rieng và bo-chuan)',
    boRes.ketQua.bo?.tat?.n === 3 && boRes.ketQua.bo?.bat_goi?.n === 3 && !boRes.ketQua.s7,
    { boKeys: Object.keys(boRes.ketQua || {}) },
  );

  // ── 5. Zero-PII & không sửa bang-co.json ─────────────────────────────────────────────────
  const bangCoSau = fs.readFileSync(path.join(GOC, 'data/luat/bang-co.json'), 'utf8');
  const zMd = kiemTraZeroPii(m1Text);
  const zJson = kiemTraZeroPii(r1Raw);
  const s7Mau = fs.readFileSync(path.join(GOC, 'scripts', 'ca-do', 'de-rieng-300.jsonl'), 'utf8')
    .trim().split('\n').map(JSON.parse).find((r) => String(r.tenHang || '').length >= 16);
  const leakTest = kiemTraZeroPii(`${m1Text}\n${s7Mau.tenHang}`);
  const piiTest = kiemTraZeroPii(dinhDangBaoCaoMarkdown(r1) + '\nMST 0123456789 Công ty TNHH Test');
  kiem(
    'Zero-PII xanh trên JSON/Markdown, bắt được chuỗi Oz/MST tiêm vào, không sửa bang-co.json',
    zMd.sach && zJson.sach && !leakTest.sach && !piiTest.sach && bangCoTruoc === bangCoSau,
    { zMd, zJson, leakTest, piiTest },
  );
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

xong();
