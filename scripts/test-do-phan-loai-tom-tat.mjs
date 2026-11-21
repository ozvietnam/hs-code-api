#!/usr/bin/env node
/**
 * Bộ kiểm cho S-5 (scripts/do-phan-loai-tom-tat.mjs) dùng máy chủ HTTP giả cục bộ:
 *   - Thử lại tối đa 3 lần khi gặp lỗi kết nối (fetch failed / socket.destroy, HTTP 502, HTTP 503) rồi hồi phục;
 *     không thử lại HTTP 401/400; vượt quá 3 lần thì ghi lỗi kèm soLanThuLai === 3.
 *   - --tiep: bỏ qua ca đã có kết quả không lỗi trong --ra, chỉ chạy ca chưa có hoặc ca lỗi; phần tổng hợp tính đủ.
 *   - Bảng tổng hợp theo mô hình (provider) đếm đúng số lượt, đúng nhóm/PN6/dòng, trung vị ms; giữ nguyên dòng `# đúng`.
 *   - Không lọt khoá bí mật từ HS_SERVICE_TOKENS hay câu hỏi đầy đủ vào tệp --ra.
 *   - Kiểm mặc định trong mã nguồn (3 lần thử lại, 20000 ms) và --tiep không có --ra thoát mã 2.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GOC, boKiem } from './lib-luat.mjs';

const execFileAsync = promisify(execFile);
const { kiem, xong } = boKiem('test-do-phan-loai-tom-tat');

const SCRIPT = path.join(GOC, 'scripts/do-phan-loai-tom-tat.mjs');
const src = fs.readFileSync(SCRIPT, 'utf8');

kiem('mặc định thử lại 3 lần, cách nhau 20000 ms', src.includes('THU_LAI_MAC_DINH = 3') && src.includes('CHO_THU_LAI_MAC_DINH_MS = 20000'));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 's5-do-pl-'));
const SECRET_TOKEN = 'BI_MAT_DICH_VU_GIA_XYZ_987654';
const FULL_QUESTION_TEXT = 'CAU_HOI_DAY_DU_BI_MAT_CO_VAN_DIEN_TU_KHONG_DUOC_GHI_VAO_JSONL';

const chayTool = async (cliArgs, extraEnv = {}) => {
  try {
    const res = await execFileAsync(process.execPath, [SCRIPT, ...cliArgs], {
      cwd: GOC,
      env: { ...process.env, HS_SERVICE_TOKENS: `cong-oz:${SECRET_TOKEN}`, ...extraEnv },
      encoding: 'utf8',
    });
    return { code: 0, stdout: res.stdout, stderr: res.stderr };
  } catch (e) {
    return { code: e.code ?? 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
};

try {
  // Ca 0: --tiep không có --ra phải thoát mã 2
  const caTep = path.join(tmpDir, 'ca.jsonl');
  fs.writeFileSync(caTep, [
    JSON.stringify({ tenHang: 'Mat hang 1', maDung: '84812090' }),
    JSON.stringify({ tenHang: 'Mat hang 2', maDung: '84818090' }),
    JSON.stringify({ tenHang: 'Mat hang 3', maDung: '85011010' }),
    JSON.stringify({ tenHang: 'Mat hang 4', maDung: '39269099' }),
  ].join('\n') + '\n', 'utf8');

  const rThieuRa = await chayTool([caTep, '--tiep']);
  kiem('--tiep không có --ra -> thoát mã 2', rThieuRa.code === 2);

  // Mở server HTTP giả
  let handler = () => {};
  const server = http.createServer((req, res) => handler(req, res));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();

  try {
    // ── Nhóm test 1: Thử lại khi mất kết nối (socket destroy -> fetch failed, 502, 503) + vượt ngưỡng ──
    const counts1 = new Map();
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const bodies1 = {};
    handler = async (req, res) => {
      let raw = '';
      for await (const ch of req) raw += ch;
      const body = JSON.parse(raw);
      const n = (counts1.get(body.tenHang) || 0) + 1;
      counts1.set(body.tenHang, n);
      bodies1[body.tenHang] = req.headers.authorization || '';

      if (body.tenHang === 'Mat hang 1') {
        if (n === 1) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"bad gateway"}'); return; }
        if (n === 2) { req.socket.destroy(); return; } // gây fetch failed / ECONNRESET
        await delay(30);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'CHOT_NHOM',
          results: [{ hsCode: '84812090' }],
          engine: { provider: 'minimax', gates: [{ round: 1, decision: 'CHOT', hs: '84812090' }] },
          nextAction: { canCuCauHoi: 'so-tay-pn6', questions: [{ questionVi: FULL_QUESTION_TEXT }] },
        }));
        return;
      }
      if (body.tenHang === 'Mat hang 2') {
        if (n === 1) { res.writeHead(503); res.end('service unavailable'); return; }
        await delay(90);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'HOI_THEM',
          results: [{ hsCode: '84819090' }], // đúng nhóm 8481, sai PN6/dòng
          engine: { provider: 'minimax', gates: [{ round: 1, earlyExitHoi: true }] },
          nextAction: { canCuCauHoi: 'so-tay-nhom', questions: [{ questionVi: FULL_QUESTION_TEXT }] },
        }));
        return;
      }
      if (body.tenHang === 'Mat hang 3') {
        // luôn trả 502 (vượt 3 lần thử lại -> tổng 4 lượt -> lỗi, lộ cả secret giả để kiểm anBiMat)
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `upstream lỗi với ${SECRET_TOKEN}` }));
        return;
      }
      // Mat hang 4 -> chạy OK trên gemini-free
      await delay(50);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'CHOT_MA',
        results: [{ hsCode: '39269099' }],
        engine: { provider: 'gemini-free', gates: [{ round: 2, fastFirst: true }] },
        nextAction: { canCuCauHoi: 'bieu-thue', questions: [] },
      }));
    };

    const out1 = path.join(tmpDir, 'out1.jsonl');
    const r1 = await chayTool([caTep, `--cong=${port}`, `--ra=${out1}`, '--gian=0', '--cho-thu-lai=15']);
    kiem('lượt 1 chạy xong thoát 0 ngay cả khi 1 ca vượt ngưỡng thử lại', r1.code === 0, r1.stderr);
    kiem('gửi đúng khoá Authorization Bearer lên HTTP', bodies1['Mat hang 1'] === `Bearer ${SECRET_TOKEN}`);

    const lines1 = fs.readFileSync(out1, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    kiem('ghi đúng 4 dòng JSONL vào --ra', lines1.length === 4);
    const l1Ca1 = lines1.find((x) => x.stt === 1);
    const l1Ca2 = lines1.find((x) => x.stt === 2);
    const l1Ca3 = lines1.find((x) => x.stt === 3);
    const l1Ca4 = lines1.find((x) => x.stt === 4);
    kiem('ca 1 (502 + socket.destroy -> thành công): soLanThuLai === 2, đúng dòng', l1Ca1?.soLanThuLai === 2 && l1Ca1?.dong === true && l1Ca1?.provider === 'minimax', JSON.stringify(l1Ca1));
    kiem('ca 2 (503 -> thành công): soLanThuLai === 1, đúng nhóm, sai PN6', l1Ca2?.soLanThuLai === 1 && l1Ca2?.nhom === true && l1Ca2?.pn6 === false, JSON.stringify(l1Ca2));
    kiem('ca 3 (502 liên tục): gọi đủ 1+3=4 lần và ghi loi với soLanThuLai === 3', counts1.get('Mat hang 3') === 4 && l1Ca3?.soLanThuLai === 3 && Boolean(l1Ca3?.loi), JSON.stringify({ n: counts1.get('Mat hang 3'), l1Ca3 }));
    kiem('ca 4 (gemini-free): thành công không thử lại', l1Ca4?.soLanThuLai === 0 && l1Ca4?.provider === 'gemini-free' && l1Ca4?.dong === true);

    const rawOut1 = fs.readFileSync(out1, 'utf8');
    kiem('tệp --ra không chứa chuỗi khoá bí mật trong HS_SERVICE_TOKENS', !rawOut1.includes(SECRET_TOKEN));
    kiem('tệp --ra không chứa câu hỏi đầy đủ từ phản hồi', !rawOut1.includes(FULL_QUESTION_TEXT));

    // ── Nhóm test 2: --tiep giữ ca đúng, chỉ chạy ca lỗi/chưa chạy, tổng hợp toàn tệp + bảng provider ──
    // Tạo tệp bị ngắt: chỉ giữ dòng 1, 2 (đã đúng), dòng 3 (bị lỗi); dòng 4 chưa có
    fs.writeFileSync(out1, [l1Ca1, l1Ca2, l1Ca3].map((x) => JSON.stringify(x)).join('\n') + '\n', 'utf8');

    const counts2 = new Map();
    handler = async (req, res) => {
      let raw = '';
      for await (const ch of req) raw += ch;
      const body = JSON.parse(raw);
      counts2.set(body.tenHang, (counts2.get(body.tenHang) || 0) + 1);
      if (body.tenHang === 'Mat hang 3') {
        await delay(120);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'CHOT_MA',
          results: [{ hsCode: '73269099' }], // sai nhóm (maDung 85011010)
          engine: { provider: 'gemini-free', gates: [{ round: 1, decision: 'CHOT' }] },
          nextAction: { canCuCauHoi: 'so-tay-nhom', questions: [] },
        }));
        return;
      }
      if (body.tenHang === 'Mat hang 4') {
        await delay(20);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'CHOT_MA',
          results: [{ hsCode: '39269099' }],
          engine: { provider: 'gemini-free', gates: [{ round: 1, decision: 'CHOT' }] },
          nextAction: { canCuCauHoi: 'bieu-thue', questions: [] },
        }));
        return;
      }
      res.writeHead(500);
      res.end('KHONG DUOC GOI LAI CA DA XONG');
    };

    const r2 = await chayTool([caTep, `--cong=${port}`, `--ra=${out1}`, '--tiep', '--gian=0', '--cho-thu-lai=15']);
    kiem('--tiep hoàn thành thoát 0', r2.code === 0, r2.stderr);
    kiem('--tiep KHÔNG gọi lại ca 1 và ca 2 đã thành công', !counts2.has('Mat hang 1') && !counts2.has('Mat hang 2'), JSON.stringify([...counts2]));
    kiem('--tiep chạy lại ca 3 (bị lỗi) và ca 4 (chưa có)', counts2.get('Mat hang 3') === 1 && counts2.get('Mat hang 4') === 1);

    const lines2 = fs.readFileSync(out1, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    kiem('--tiep: tệp --ra sau chạy có đúng 4 dòng theo thứ tự stt 1..4', lines2.length === 4 && lines2.map((x) => x.stt).join(',') === '1,2,3,4');
    kiem('giữ nguyên dòng tổng hợp cũ bắt đầu bằng "# đúng NHÓM"', /^# đúng NHÓM 3\/4 = 75\.0% \| đúng PHÂN NHÓM 2\/4 = 50\.0% \| đúng DÒNG 2\/4 = 50\.0%/m.test(r2.stdout), r2.stdout);
    kiem('tổng hợp thêm bảng THEO MÔ HÌNH (minimax: 2 lượt, 2/2 nhóm, 1/2 PN6/dòng)',
      /^# minimax \| 2 \| 2\/2 = 100\.0% \| 1\/2 = 50\.0% \| 1\/2 = 50\.0% \| \d+$/m.test(r2.stdout), r2.stdout);
    kiem('tổng hợp thêm bảng THEO MÔ HÌNH (gemini-free: 2 lượt, 1/2 nhóm/PN6/dòng)',
      /^# gemini-free \| 2 \| 1\/2 = 50\.0% \| 1\/2 = 50\.0% \| 1\/2 = 50\.0% \| \d+$/m.test(r2.stdout), r2.stdout);

    // ── Nhóm test 3: Không thử lại HTTP 401 ──
    let call401 = 0;
    handler = (req, res) => {
      call401 += 1;
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end('{"error":"unauthorized"}');
    };
    const out401 = path.join(tmpDir, 'out401.jsonl');
    const r401 = await chayTool([caTep, `--cong=${port}`, `--ra=${out401}`, '--gioi-han=1', '--gian=0', '--cho-thu-lai=15']);
    kiem('HTTP 401 không thử lại (gọi đúng 1 lần, soLanThuLai === 0)', r401.code === 0 && call401 === 1 && JSON.parse(fs.readFileSync(out401, 'utf8').trim()).soLanThuLai === 0);
  } finally {
    server.close();
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

xong();
