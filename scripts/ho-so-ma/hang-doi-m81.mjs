#!/usr/bin/env node
// scripts/ho-so-ma/hang-doi-m81.mjs — M-81 (#2410, ADR-0008): hàng đợi ưu tiên cuốn chiếu nhóm 4 số CHUA
// và cơ chế khoá nhóm nguyên tử qua nhánh nhẹ m81-nhom/<4 số> trên Git remote (--force-with-lease).
//   Xem hàng đợi (mặc định, không đẩy mạng):
//     node scripts/ho-so-ma/hang-doi-m81.mjs [--xem] [--chuong 85] [--gioi-han 20] [--khong-mang] [--json]
//   Nhận nhóm kế tiếp nguyên tử:
//     node scripts/ho-so-ma/hang-doi-m81.mjs --nhan [--tho ong-1] [--remote origin] [--repo .] [--json]
//   Nhả khoá một nhóm / dọn khoá đã gộp hoặc quá hạn 24h:
//     node scripts/ho-so-ma/hang-doi-m81.mjs --nha-khoa 8543 [--expected-sha <sha>] [--remote origin]
//     node scripts/ho-so-ma/hang-doi-m81.mjs --don-khoa [--ttl-gio 24] [--remote origin] [--json]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong } from './cong.mjs';
import { napBieuMeta } from './bang-anh-em.mjs';
import { TEN_TEP_THU_TU as TEN_TEP_THU_TU_KHUON } from './khuon.mjs';
import { chuanNhom4, thuThapCayNhom, lietKeNhom4, DEFAULT_CANH_TRANH_MD } from './goi-nhom.mjs';
import { chamSoDiem } from './so-diem.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const TTL_KHOA_MAC_DINH_MS = 24 * 60 * 60 * 1000;
export const TEN_TEP_THU_TU = TEN_TEP_THU_TU_KHUON;
export const TIEN_TO_NHANH_KHOA = 'm81-nhom/';

function chayGit(args, { cwd = REPO_ROOT, env = null, stdin = null } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const outChunks = [];
    const errChunks = [];
    child.stdout.on('data', (c) => outChunks.push(c));
    child.stderr.on('data', (c) => errChunks.push(c));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(outChunks).toString('utf8'),
        stderr: Buffer.concat(errChunks).toString('utf8'),
      });
    });
    if (stdin !== null && stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

function chuanDuongDanThuTu(thuTuPathHoacHoSo, hoSo = G.HO_SO_MAC_DINH) {
  if (!thuTuPathHoacHoSo) {
    return path.join(hoSo, TEN_TEP_THU_TU);
  }
  const p = path.resolve(String(thuTuPathHoacHoSo));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    return path.join(p, TEN_TEP_THU_TU);
  }
  return p;
}

/**
 * Đọc tệp thứ tự cuốn chiếu M-81 (mặc định data/ho-so-ma/thu-tu-cuon-chieu.json).
 * Hỗ trợ cả { thuTu: [{ nhom: "84.13", luotKhachHoi: 35 }, ...] }, { thuTu: ["84.13", ...] } và mảng trần.
 * Nếu thiếu tệp -> trả { coTep: false, ... } để xếp hoàn toàn theo số dòng 8 số giảm dần.
 */
export function docThuTuCuonChieu(thuTuPathHoacHoSo = null, opts = {}) {
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const tep = chuanDuongDanThuTu(thuTuPathHoacHoSo, hoSo);
  const thuTuMap = new Map();
  const luotKhachHoiMap = new Map();
  const danhSach = [];

  if (!fs.existsSync(tep)) {
    return {
      coTep: false,
      tep,
      moTa: null,
      nguon: null,
      capNhat: null,
      danhSach,
      thuTuMap,
      luotKhachHoiMap,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(tep, 'utf8'));
  } catch (err) {
    throw new Error(`${TEN_TEP_THU_TU}: không phải JSON hợp lệ (${err.message})`);
  }

  let rawArr = null;
  if (Array.isArray(parsed)) {
    rawArr = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.thuTu)) {
    rawArr = parsed.thuTu;
  } else {
    throw new Error(`${TEN_TEP_THU_TU}: phải là mảng hoặc đối tượng có mảng thuTu`);
  }

  rawArr.forEach((muc, i) => {
    let rawNhom = null;
    let luotKhachHoi = null;
    if (typeof muc === 'string') {
      rawNhom = muc;
    } else if (muc && typeof muc === 'object' && !Array.isArray(muc) && typeof muc.nhom === 'string') {
      rawNhom = muc.nhom;
      if (typeof muc.luotKhachHoi === 'number' && Number.isFinite(muc.luotKhachHoi)) {
        luotKhachHoi = muc.luotKhachHoi;
      }
    } else {
      throw new Error(`${TEN_TEP_THU_TU}: phần tử [${i}] phải là chuỗi mã nhóm 4 số hoặc đối tượng có trường nhom`);
    }

    const nhom = chuanNhom4(rawNhom);
    if (thuTuMap.has(nhom)) return;
    const hangUuTien = danhSach.length;
    thuTuMap.set(nhom, hangUuTien);
    luotKhachHoiMap.set(nhom, luotKhachHoi);
    danhSach.push({ nhom, hangUuTien, luotKhachHoi });
  });

  return {
    coTep: true,
    tep,
    moTa: !Array.isArray(parsed) && parsed?.moTa ? String(parsed.moTa) : null,
    nguon: !Array.isArray(parsed) && parsed?.nguon ? String(parsed.nguon) : null,
    capNhat: !Array.isArray(parsed) && parsed?.capNhat ? String(parsed.capNhat) : null,
    danhSach,
    thuTuMap,
    luotKhachHoiMap,
  };
}

function demDong8MotNhom(nhom4, L, bieuMeta) {
  const { cayBieu } = thuThapCayNhom(nhom4, L, bieuMeta);
  let dem = 0;
  for (const n of cayBieu) {
    if (/^bieu:\d{8}$/.test(n.id) && !n.khongMa) dem += 1;
  }
  return dem;
}

/**
 * Đếm số dòng 8 số thật (`/^bieu:\d{8}$/` và `!khongMa`) dưới từng nhóm 4 số.
 * - Truyền mã nhóm 4 số ở tham số đầu (`demDong8SoTheoNhom('8543', opts)`) -> trả số nguyên `soDong8`.
 * - Truyền `opts` (`demDong8SoTheoNhom({ luat, L, bieuMeta, chuong })`) -> trả `Map<nhom4, soDong8>`.
 */
export function demDong8SoTheoNhom(nhomHoacOpts = {}, maybeOpts = {}) {
  if (typeof nhomHoacOpts === 'string' && /^(?:bieu:)?\d{2}\.?\d{2}$/i.test(nhomHoacOpts.trim())) {
    const opts = maybeOpts || {};
    const luat = opts.luat || G.LUAT_MAC_DINH;
    const L = opts.L || napLuatCong(luat);
    const bieuMeta = opts.bieuMeta || napBieuMeta(luat);
    return demDong8MotNhom(chuanNhom4(nhomHoacOpts), L, bieuMeta);
  }

  const opts = typeof nhomHoacOpts === 'string'
    ? { ...maybeOpts, luat: nhomHoacOpts }
    : (nhomHoacOpts || {});
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);
  const dsNhom = Array.isArray(opts.nhom) && opts.nhom.length
    ? [...new Set(opts.nhom.map(chuanNhom4))]
    : lietKeNhom4({ chuong: opts.chuong ?? null, luat, L });

  const ketQua = new Map();
  for (const n4 of dsNhom) {
    ketQua.set(n4, demDong8MotNhom(n4, L, bieuMeta));
  }
  return ketQua;
}

/**
 * Xếp hàng đợi M-81 tất định từ `chamSoDiem`:
 * - Chỉ giữ nhóm có `trangThai === 'CHUA'` (bỏ qua tuyệt đối `DONG` và `DO`).
 * - Có `thu-tu-cuon-chieu.json`: các nhóm `CHUA` trong danh sách đứng trước đúng thứ tự xuất hiện,
 *   các nhóm `CHUA` ngoài danh sách đứng sau theo `soDong8` giảm dần, hoà theo mã `nhom` tăng dần.
 * - Thiếu `thu-tu-cuon-chieu.json`: toàn bộ nhóm `CHUA` xếp theo `soDong8` giảm dần, hoà theo mã `nhom` tăng dần.
 */
export function xepHangDoiM81(opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);

  const resSoDiem = opts.soDiem || chamSoDiem({
    ...opts,
    luat,
    hoSo,
    L,
    bieuMeta,
  });

  const thuTuInfo = opts.thuTuPath === false
    ? { coTep: false, tep: null, danhSach: [], thuTuMap: new Map(), luotKhachHoiMap: new Map() }
    : docThuTuCuonChieu(opts.thuTuPath ?? path.join(hoSo, TEN_TEP_THU_TU), { hoSo });

  const chuaRaw = resSoDiem.nhom.filter((x) => x.trangThai === 'CHUA');
  const dong8Map = demDong8SoTheoNhom({
    luat,
    L,
    bieuMeta,
    nhom: chuaRaw.map((x) => x.nhom),
  });

  const ungVienDayDu = chuaRaw.map((item) => {
    const soDong8 = dong8Map.get(item.nhom) ?? 0;
    const coTrongThuTu = thuTuInfo.thuTuMap.has(item.nhom);
    const hangThuTu = coTrongThuTu ? thuTuInfo.thuTuMap.get(item.nhom) : null;
    const luotKhachHoi = thuTuInfo.luotKhachHoiMap.get(item.nhom) ?? null;
    return {
      ...item,
      soDong8,
      coTrongThuTu,
      hangThuTu,
      luotKhachHoi,
      nguonUuTien: coTrongThuTu ? 'THU_TU_CUON_CHIEU' : 'SO_DONG_8_GIAM_DAN',
    };
  });

  ungVienDayDu.sort((a, b) => {
    if (a.coTrongThuTu !== b.coTrongThuTu) return a.coTrongThuTu ? -1 : 1;
    if (a.coTrongThuTu && b.coTrongThuTu) return a.hangThuTu - b.hangThuTu;
    if (b.soDong8 !== a.soDong8) return b.soDong8 - a.soDong8;
    return a.nhom.localeCompare(b.nhom);
  });

  const gioiHan = Number.isInteger(opts.gioiHan) && opts.gioiHan > 0
    ? opts.gioiHan
    : (opts.gioiHan ? Number.parseInt(String(opts.gioiHan), 10) : null);
  const hangDoi = gioiHan && gioiHan > 0 ? ungVienDayDu.slice(0, gioiHan) : ungVienDayDu;

  return {
    khuon: 'hang-doi-m81@1',
    chuong: resSoDiem.chuong,
    coThuTuCuonChieu: thuTuInfo.coTep,
    tepThuTu: thuTuInfo.tep,
    tongNhom: resSoDiem.tongNhom,
    dong: resSoDiem.dong,
    chua: resSoDiem.chua,
    do: resSoDiem.do,
    hangDoi,
  };
}

/**
 * Tạo commit khoá nhẹ bằng Git plumbing (`hash-object`, `mktree`, `commit-tree`)
 * mà KHÔNG làm bẩn working tree, KHÔNG đổi `HEAD` hay `.git/index` hiện tại.
 */
export async function taoCommitKhoa(nhomHoacOpts, maybeOpts = {}) {
  const opts = typeof nhomHoacOpts === 'object' && nhomHoacOpts !== null
    ? nhomHoacOpts
    : { ...maybeOpts, nhom: nhomHoacOpts };

  const nhom = chuanNhom4(opts.nhom);
  const gitCwd = opts.gitCwd || opts.repo || REPO_ROOT;
  const nowMs = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
  const commitTimeSec = Math.floor(nowMs / 1000);
  const tho = String(opts.tho || process.env.M81_THO || `${os.hostname()}-${process.pid}`).trim();
  const email = String(opts.email || 'm81-khoa@oz.local').trim();
  const nonce = opts.nonce !== undefined ? String(opts.nonce) : crypto.randomUUID();

  const gitDate = `${commitTimeSec} +0000`;
  const env = {
    GIT_AUTHOR_NAME: tho,
    GIT_AUTHOR_EMAIL: email,
    GIT_COMMITTER_NAME: tho,
    GIT_COMMITTER_EMAIL: email,
    GIT_AUTHOR_DATE: gitDate,
    GIT_COMMITTER_DATE: gitDate,
  };

  const noiDungBlob = `${JSON.stringify({
    khuon: 'khoa-m81@1',
    nhom,
    tho,
    taoLucMs: nowMs,
    taoLucIso: new Date(nowMs).toISOString(),
    ...(nonce ? { nonce } : {}),
    ...(opts.ghiChu ? { ghiChu: String(opts.ghiChu) } : {}),
  }, null, 2)}\n`;

  const rBlob = await chayGit(['hash-object', '-w', '--stdin'], { cwd: gitCwd, env, stdin: noiDungBlob });
  if (rBlob.code !== 0) {
    throw new Error(`git hash-object thất bại: ${rBlob.stderr.trim()}`);
  }
  const blobSha = rBlob.stdout.trim();

  const rTree = await chayGit(['mktree'], {
    cwd: gitCwd,
    env,
    stdin: `100644 blob ${blobSha}\tkhoa-m81.json\n`,
  });
  if (rTree.code !== 0) {
    throw new Error(`git mktree thất bại: ${rTree.stderr.trim()}`);
  }
  const treeSha = rTree.stdout.trim();

  const thongDiep = `chore(m81-khoa): khoa nhom ${nhom} boi ${tho}`;
  const rCommit = await chayGit(['commit-tree', treeSha, '-m', thongDiep], { cwd: gitCwd, env });
  if (rCommit.code !== 0) {
    throw new Error(`git commit-tree thất bại: ${rCommit.stderr.trim()}`);
  }
  const lockSha = rCommit.stdout.trim();

  return {
    lockSha,
    sha: lockSha,
    treeSha,
    blobSha,
    nhom,
    tho,
    nowMs,
    commitTimeSec,
  };
}

function phanTichLsRemote(stdout) {
  const ketQua = [];
  for (const dong of String(stdout || '').split(/\r?\n/)) {
    if (!dong.trim()) continue;
    const m = /^([0-9a-f]{40})\s+refs\/heads\/m81-nhom\/(\d{4})$/.exec(dong.trim());
    if (!m) continue;
    ketQua.push({ nhom: m[2], sha: m[1] });
  }
  ketQua.sort((a, b) => a.nhom.localeCompare(b.nhom));
  return ketQua;
}

/**
 * Đọc toàn bộ nhánh khoá `refs/heads/m81-nhom/<nhom4>` trên `remote` kèm `<oldSha>` và `%ct` commit timestamp.
 * Không ghi ref cục bộ hay FETCH_HEAD nên an toàn tuyệt đối kể cả khi nhiều thợ chạy song song.
 */
export async function lietKeKhoaRemote(opts = {}) {
  const gitCwd = opts.gitCwd || opts.repo || REPO_ROOT;
  const remote = opts.remote || 'origin';
  const nowMs = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
  const ttlMs = Number.isFinite(opts.ttlMs) && opts.ttlMs > 0 ? Number(opts.ttlMs) : TTL_KHOA_MAC_DINH_MS;

  const rLs = await chayGit(['ls-remote', '--heads', remote, 'refs/heads/m81-nhom/*'], { cwd: gitCwd });
  if (rLs.code !== 0) {
    throw new Error(`Không đọc được nhánh khoá từ remote "${remote}": ${rLs.stderr.trim()}`);
  }

  let dsDau = phanTichLsRemote(rLs.stdout);
  const theoNhom = new Map();
  if (!dsDau.length) {
    return { remote, nowMs, ttlMs, danhSach: [], theoNhom };
  }

  // Tải các commit khoá chưa có trong kho cục bộ mà không chạm nhánh/ref hay FETCH_HEAD
  const refsCanTai = [];
  for (const { nhom, sha } of dsDau) {
    const rCat = await chayGit(['cat-file', '-e', `${sha}^{commit}`], { cwd: gitCwd });
    if (rCat.code !== 0) {
      refsCanTai.push(`refs/heads/${TIEN_TO_NHANH_KHOA}${nhom}`);
    }
  }

  if (refsCanTai.length > 0) {
    const rFetch = await chayGit(
      ['fetch', '--no-tags', '--no-write-fetch-head', remote, ...refsCanTai],
      { cwd: gitCwd },
    );
    if (rFetch.code !== 0) {
      // Trường hợp hiếm: một nhánh vừa bị xoá đúng giữa lúc ls-remote và fetch -> đọc lại ls-remote và tải từng nhánh còn sống
      const rLsRetry = await chayGit(['ls-remote', '--heads', remote, 'refs/heads/m81-nhom/*'], { cwd: gitCwd });
      if (rLsRetry.code !== 0) {
        throw new Error(`git fetch nhánh khoá từ "${remote}" thất bại: ${rFetch.stderr.trim()}`);
      }
      dsDau = phanTichLsRemote(rLsRetry.stdout);
      for (const { nhom, sha } of dsDau) {
        const rCat = await chayGit(['cat-file', '-e', `${sha}^{commit}`], { cwd: gitCwd });
        if (rCat.code !== 0) {
          await chayGit(
            ['fetch', '--no-tags', '--no-write-fetch-head', remote, `refs/heads/${TIEN_TO_NHANH_KHOA}${nhom}`],
            { cwd: gitCwd },
          );
        }
      }
    }
  }

  // Đọc lại ls-remote nếu có nhánh vừa bị xoá đúng giữa lúc ls-remote và fetch
  const danhSach = [];
  let canDocLaiLs = false;
  const tamMap = new Map();

  for (const { nhom, sha } of dsDau) {
    const rShow = await chayGit(['show', '-s', '--format=%ct', sha], { cwd: gitCwd });
    if (rShow.code !== 0) {
      canDocLaiLs = true;
      continue;
    }
    const ctSec = Number.parseInt(rShow.stdout.trim(), 10);
    const commitTimeSec = Number.isFinite(ctSec) ? ctSec : 0;
    tamMap.set(nhom, { sha, commitTimeSec });
  }

  if (canDocLaiLs) {
    const rLs2 = await chayGit(['ls-remote', '--heads', remote, 'refs/heads/m81-nhom/*'], { cwd: gitCwd });
    if (rLs2.code === 0) {
      dsDau = phanTichLsRemote(rLs2.stdout);
      for (const { nhom, sha } of dsDau) {
        if (tamMap.get(nhom)?.sha === sha) continue;
        const rShow = await chayGit(['show', '-s', '--format=%ct', sha], { cwd: gitCwd });
        if (rShow.code === 0) {
          const ctSec = Number.parseInt(rShow.stdout.trim(), 10);
          tamMap.set(nhom, { sha, commitTimeSec: Number.isFinite(ctSec) ? ctSec : 0 });
        }
      }
    }
  }

  for (const { nhom, sha } of dsDau) {
    const rec = tamMap.get(nhom);
    if (!rec || rec.sha !== sha) continue;
    const commitTimeMs = rec.commitTimeSec * 1000;
    const tuoiMs = nowMs - commitTimeMs;
    const conHieuLuc = tuoiMs <= ttlMs;
    const quaHan = tuoiMs > ttlMs;
    const info = {
      nhom,
      nhanhKhoa: `${TIEN_TO_NHANH_KHOA}${nhom}`,
      refRemote: `refs/heads/${TIEN_TO_NHANH_KHOA}${nhom}`,
      sha,
      oldSha: sha,
      commitTimeSec: rec.commitTimeSec,
      commitTimeMs,
      tuoiMs,
      conHieuLuc,
      quaHan,
    };
    danhSach.push(info);
    theoNhom.set(nhom, info);
  }

  return { remote, nowMs, ttlMs, danhSach, theoNhom };
}

function docCoPorcelain(stdout, refRemote) {
  for (const dong of String(stdout || '').split(/\r?\n/)) {
    const parts = dong.split('\t');
    if (parts.length < 2) continue;
    const flag = parts[0];
    const capRef = parts[1] || '';
    if (capRef.endsWith(`:${refRemote}`)) {
      return { flag, summary: parts[2] || '' };
    }
  }
  return null;
}

function laTranhChapKhoaPorcelain(kqRef, stderr = '') {
  if (!kqRef || kqRef.flag !== '!') return false;
  const gop = `${kqRef.summary || ''}\n${stderr || ''}`;
  if (/permission|denied|protected|forbidden|unauthorized|authentication|hook declined|unpack failed|read-only|not found|unable to access/i.test(gop)) {
    return false;
  }
  return /stale info|fetch first|non-fast-forward|already exists|atomic|cannot lock ref|failed to lock/i.test(gop);
}

async function dayKhoaNguyenTu({ gitCwd, remote, nhom, lockSha, expectedOldSha = '' }) {
  const refRemote = `refs/heads/${TIEN_TO_NHANH_KHOA}${nhom}`;
  const leaseArg = `--force-with-lease=${refRemote}:${expectedOldSha}`;
  const rPush = await chayGit(
    ['push', '--porcelain', remote, leaseArg, `${lockSha}:${refRemote}`],
    { cwd: gitCwd },
  );
  const kqRef = docCoPorcelain(rPush.stdout, refRemote);
  if (rPush.code !== 0) {
    if (laTranhChapKhoaPorcelain(kqRef, rPush.stderr)) {
      return {
        thanhCong: false,
        code: rPush.code,
        lyDo: 'PUSH_BI_TU_CHOI',
        chiTiet: (kqRef.summary || rPush.stderr || rPush.stdout).trim(),
      };
    }
    throw new Error(
      `Không đẩy được nhánh khoá lên remote "${remote}" (${refRemote}, exit=${rPush.code}): ${(rPush.stderr || kqRef?.summary || rPush.stdout).trim()}`,
    );
  }
  if (!kqRef) {
    throw new Error(`git push --porcelain tới "${remote}" không trả trạng thái cho ${refRemote}`);
  }
  // Nếu tạo mới (expectedOldSha === ''), bắt buộc phải là '*' ([new branch]).
  // Nếu trả '=' ([up to date]) nghĩa là thợ khác vừa đẩy trước cùng một SHA -> coi là thua cuộc đua!
  if (expectedOldSha === '') {
    if (kqRef.flag !== '*') {
      return { thanhCong: false, code: 1, lyDo: 'DA_TON_TAI_TREN_REMOTE', chiTiet: kqRef.summary };
    }
    return { thanhCong: true, flag: kqRef.flag };
  }
  // CAS đè khoá quá hạn: bắt buộc phải thực sự đổi ref ('+' hoặc ' '), không phải '=' hay '!'
  if (kqRef.flag !== '+' && kqRef.flag !== ' ') {
    return { thanhCong: false, code: 1, lyDo: 'KHONG_CAP_NHAT_CAS', chiTiet: kqRef.summary };
  }
  return { thanhCong: true, flag: kqRef.flag };
}

/**
 * Nhận nguyên tử nhóm `CHUA` tiếp theo trên hàng đợi M-81:
 * - Nhóm đang có khoá còn hiệu lực (`<= ttlMs`) -> bỏ qua.
 * - Nhóm chưa có nhánh khoá -> đẩy nguyên tử `--force-with-lease=refs/heads/m81-nhom/<nhom4>:`.
 * - Nhóm có khoá quá hạn (`> ttlMs`) -> thu hồi nguyên tử bằng CAS `--force-with-lease=refs/heads/m81-nhom/<nhom4>:<oldSha>`.
 * - Nếu bị từ chối do thợ khác nhanh hơn -> ghi vào `boQuaDoKhoa`, tăng `thuLai` và thử ngay nhóm kế!
 */
export async function nhanNhomTiep(opts = {}) {
  if (opts.khongMang) {
    throw new Error('Không thể nhận khoá nguyên tử khi bật chế độ --khong-mang');
  }
  const gitCwd = opts.gitCwd || opts.repo || REPO_ROOT;
  const remote = opts.remote || 'origin';
  const nowMs = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
  const ttlMs = Number.isFinite(opts.ttlMs) && opts.ttlMs > 0 ? Number(opts.ttlMs) : TTL_KHOA_MAC_DINH_MS;

  const q = opts.hangDoiM81 || xepHangDoiM81({ ...opts, gioiHan: null });
  const ungVien = q.hangDoi;
  const boQuaDoKhoa = [];
  let thuLai = 0;

  if (!ungVien.length) {
    return {
      nhanDuoc: false,
      nhom: null,
      nhanhKhoa: null,
      lockSha: null,
      soDong8: null,
      luotKhachHoi: null,
      thuLai: 0,
      thuHoiQuaHan: false,
      boQuaDoKhoa,
      lyDoHet: 'HET_NHOM_CHUA',
    };
  }

  const khoaRemote = await lietKeKhoaRemote({ gitCwd, remote, nowMs, ttlMs });

  for (const uv of ungVien) {
    const khoaHienTai = khoaRemote.theoNhom.get(uv.nhom) || null;
    if (khoaHienTai && khoaHienTai.conHieuLuc) {
      boQuaDoKhoa.push({
        nhom: uv.nhom,
        lyDo: 'DANG_KHOA_CON_HAN',
        oldSha: khoaHienTai.sha,
        tuoiMs: khoaHienTai.tuoiMs,
      });
      continue;
    }

    const expectedOldSha = khoaHienTai && khoaHienTai.quaHan ? khoaHienTai.sha : '';
    let lockSha = opts.lockSha ? String(opts.lockSha).trim() : null;
    if (!lockSha || (expectedOldSha && lockSha === expectedOldSha)) {
      const kqCommit = await taoCommitKhoa(uv.nhom, {
        gitCwd,
        tho: opts.tho,
        email: opts.email,
        nowMs,
        nonce: opts.nonce,
        ghiChu: expectedOldSha ? `thu-hoi-tu:${expectedOldSha}` : undefined,
      });
      lockSha = kqCommit.lockSha;
    }

    const kqDay = await dayKhoaNguyenTu({
      gitCwd,
      remote,
      nhom: uv.nhom,
      lockSha,
      expectedOldSha,
    });

    if (kqDay.thanhCong) {
      return {
        nhanDuoc: true,
        nhom: uv.nhom,
        nhanhKhoa: `${TIEN_TO_NHANH_KHOA}${uv.nhom}`,
        lockSha,
        soDong8: uv.soDong8,
        luotKhachHoi: uv.luotKhachHoi,
        thuLai,
        thuHoiQuaHan: Boolean(expectedOldSha),
        oldSha: expectedOldSha || null,
        boQuaDoKhoa,
      };
    }

    thuLai += 1;
    boQuaDoKhoa.push({
      nhom: uv.nhom,
      lyDo: 'TRANH_KHOA_BI_TU_CHOI',
      oldSha: expectedOldSha || null,
      chiTiet: kqDay.lyDo,
    });
  }

  return {
    nhanDuoc: false,
    nhom: null,
    nhanhKhoa: null,
    lockSha: null,
    soDong8: null,
    luotKhachHoi: null,
    thuLai,
    thuHoiQuaHan: false,
    boQuaDoKhoa,
    lyDoHet: 'TAT_CA_UNG_VIEN_DANG_KHOA',
  };
}

/**
 * Nhả khoá một nhóm `m81-nhom/<nhom4>` trên remote.
 * Hỗ trợ `expectedSha` (CAS `--force-with-lease`) hoặc xoá trực tiếp `:refs/heads/m81-nhom/<nhom4>`.
 */
export async function nhaKhoaNhom(nhom4, opts = {}) {
  if (opts.khongMang) {
    throw new Error('Không thể nhả khoá trên remote khi bật chế độ --khong-mang');
  }
  const nhom = chuanNhom4(nhom4);
  const gitCwd = opts.gitCwd || opts.repo || REPO_ROOT;
  const remote = opts.remote || 'origin';
  const refRemote = `refs/heads/${TIEN_TO_NHANH_KHOA}${nhom}`;
  const nhanhKhoa = `${TIEN_TO_NHANH_KHOA}${nhom}`;
  const expectedSha = opts.expectedSha ? String(opts.expectedSha).trim() : null;

  const args = ['push', '--porcelain', remote];
  if (expectedSha) {
    args.push(`--force-with-lease=${refRemote}:${expectedSha}`);
  }
  args.push(`:${refRemote}`);

  const rPush = await chayGit(args, { cwd: gitCwd });
  const kqRef = docCoPorcelain(rPush.stdout, refRemote);
  if (rPush.code === 0) {
    const daXoa = !kqRef || kqRef.flag === '-';
    return {
      daNha: daXoa,
      nhom,
      nhanhKhoa,
      expectedSha,
    };
  }

  const gopErr = `${rPush.stderr}\n${rPush.stdout}`;
  if (!expectedSha && /remote ref does not exist|unable to delete.*does not exist/i.test(gopErr)) {
    return {
      daNha: false,
      khongTonTai: true,
      nhom,
      nhanhKhoa,
      expectedSha: null,
    };
  }

  if (expectedSha && laTranhChapKhoaPorcelain(kqRef, rPush.stderr)) {
    return {
      daNha: false,
      khongTonTai: false,
      nhom,
      nhanhKhoa,
      expectedSha,
      lyDo: 'LECH_SHA_KHOA',
      chiTiet: (kqRef.summary || gopErr).trim(),
    };
  }

  throw new Error(
    `Không xoá được nhánh khoá trên remote "${remote}" (${refRemote}, exit=${rPush.code}): ${gopErr.trim()}`,
  );
}

/**
 * Quét toàn bộ nhánh `m81-nhom/<nhom4>` trên remote và tự động nhả khoá bằng CAS `--force-with-lease` khi:
 * (a) Nhóm trên sổ điểm không còn là `CHUA` (`DONG` hoặc `DO`) -> lý do `'DA_GOP_HOAC_ROI_CHUA'`, HOẶC
 * (b) Commit mới nhất trên nhánh khoá đã quá `ttlMs` (mặc định 24 giờ) -> lý do `'QUA_HAN_24H'`.
 */
export async function donKhoaM81(opts = {}) {
  if (opts.khongMang) {
    throw new Error('Không thể dọn khoá trên remote khi bật chế độ --khong-mang');
  }
  const gitCwd = opts.gitCwd || opts.repo || REPO_ROOT;
  const remote = opts.remote || 'origin';
  const nowMs = Number.isFinite(opts.nowMs) ? Number(opts.nowMs) : Date.now();
  const ttlMs = Number.isFinite(opts.ttlMs) && opts.ttlMs > 0 ? Number(opts.ttlMs) : TTL_KHOA_MAC_DINH_MS;

  const khoaRemote = await lietKeKhoaRemote({ gitCwd, remote, nowMs, ttlMs });
  const daNha = [];
  const giuNguyen = [];

  if (!khoaRemote.danhSach.length) {
    return { daNha, giuNguyen };
  }

  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = opts.bieuMeta || napBieuMeta(luat);

  const chuongLoc = opts.chuong !== undefined && opts.chuong !== null
    ? String(opts.chuong).padStart(2, '0')
    : null;

  const dsKhoaXet = chuongLoc
    ? khoaRemote.danhSach.filter((k) => k.nhom.startsWith(chuongLoc))
    : khoaRemote.danhSach;

  const dsCoTrongLuat = dsKhoaXet
    .map((k) => k.nhom)
    .filter((n4) => L.cay.theoId.has(`bieu:${n4}`));

  const trangThaiTheoNhom = new Map();
  if (opts.soDiem) {
    for (const item of opts.soDiem.nhom || []) {
      trangThaiTheoNhom.set(item.nhom, item.trangThai);
    }
  } else if (dsCoTrongLuat.length > 0) {
    const resSoDiem = chamSoDiem({
      ...opts,
      luat,
      hoSo,
      L,
      bieuMeta,
      chuong: null,
      nhom: dsCoTrongLuat,
    });
    for (const item of resSoDiem.nhom) {
      trangThaiTheoNhom.set(item.nhom, item.trangThai);
    }
  }

  for (const khoa of dsKhoaXet) {
    const trangThai = trangThaiTheoNhom.get(khoa.nhom) ?? 'CHUA';
    let lyDo = null;
    if (trangThai !== 'CHUA') {
      lyDo = 'DA_GOP_HOAC_ROI_CHUA';
    } else if (khoa.quaHan) {
      lyDo = 'QUA_HAN_24H';
    }

    if (!lyDo) {
      giuNguyen.push({
        nhom: khoa.nhom,
        nhanhKhoa: khoa.nhanhKhoa,
        oldSha: khoa.sha,
        trangThaiSoDiem: trangThai,
        tuoiMs: khoa.tuoiMs,
      });
      continue;
    }

    const kqXoa = await nhaKhoaNhom(khoa.nhom, {
      gitCwd,
      remote,
      expectedSha: khoa.sha,
    });

    if (kqXoa.daNha) {
      daNha.push({
        nhom: khoa.nhom,
        nhanhKhoa: khoa.nhanhKhoa,
        lyDo,
        oldSha: khoa.sha,
        trangThaiSoDiem: trangThai,
      });
    } else {
      giuNguyen.push({
        nhom: khoa.nhom,
        nhanhKhoa: khoa.nhanhKhoa,
        oldSha: khoa.sha,
        trangThaiSoDiem: trangThai,
        tuoiMs: khoa.tuoiMs,
        lyDoGiu: kqXoa.lyDo || 'KHONG_XOA_DUOC',
      });
    }
  }

  return { daNha, giuNguyen };
}

function inHuongDan() {
  console.log([
    'Dùng: node scripts/ho-so-ma/hang-doi-m81.mjs [chế độ] [tuỳ chọn]',
    '',
    'Chế độ (mặc định --xem, không đẩy mạng):',
    '  --xem                   Xem thứ tự hàng đợi ưu tiên các nhóm CHUA',
    '  --nhan                  Nhận và khoá nguyên tử nhóm CHUA tiếp theo trên remote',
    '  --nha-khoa <nhom4>      Xoá nhánh khoá m81-nhom/<nhom4> trên remote',
    '  --don-khoa              Nhả các khoá đã rời CHUA (DONG/DO) hoặc quá hạn TTL',
    '',
    'Tuỳ chọn:',
    '  --luat <dir>            Thư mục kho luật gốc (mặc định: data/luat-goc)',
    '  --ho-so <dir>           Thư mục kho hồ sơ mã (mặc định: data/ho-so-ma)',
    '  --thu-tu <file>         Tệp thu-tu-cuon-chieu.json tuỳ chọn',
    '  --chuong <2so>          Chỉ xét các nhóm thuộc một chương (vd: 85, 42, 76)',
    '  --gioi-han <so>         Giới hạn số nhóm hiển thị ở chế độ --xem',
    '  --remote <ten|url>      Tên hoặc đường dẫn Git remote (mặc định: origin)',
    '  --repo <dir>            Thư mục Git làm việc (mặc định: gốc repo)',
    '  --tho <dinh-danh>       Định danh thợ ghi vào commit khoá (vd: ong-1)',
    '  --ttl-gio <so>          Thời hạn khoá tính bằng giờ (mặc định: 24)',
    '  --expected-sha <sha>    SHA khoá kỳ vọng khi --nha-khoa có kiểm CAS',
    '  --khong-mang            Hoàn toàn không gọi lệnh mạng / Git remote',
    '  --json                  In kết quả JSON máy đọc',
  ].join('\n'));
}

async function main() {
  const a = process.argv.slice(2);
  if (a.includes('--help') || a.includes('-h')) {
    inHuongDan();
    return;
  }

  const lay = (k) => {
    const i = a.indexOf(k);
    return i >= 0 && i + 1 < a.length ? a[i + 1] : null;
  };

  const luat = path.resolve(lay('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so') || G.HO_SO_MAC_DINH);
  const canhTranhMd = lay('--canh-tranh') ? path.resolve(lay('--canh-tranh')) : DEFAULT_CANH_TRANH_MD;
  const thuTuArg = lay('--thu-tu');
  const thuTuPath = thuTuArg ? path.resolve(thuTuArg) : path.join(hoSo, TEN_TEP_THU_TU);
  const chuong = lay('--chuong');
  const nhomArg = lay('--nhom');
  const gioiHan = lay('--gioi-han');
  const remoteArg = lay('--remote');
  const remote = remoteArg || 'origin';
  const gitCwd = lay('--repo') ? path.resolve(lay('--repo')) : REPO_ROOT;
  const tho = lay('--tho');
  const ttlGioRaw = lay('--ttl-gio');
  const ttlMs = ttlGioRaw !== null ? Number(ttlGioRaw) * 3600_000 : TTL_KHOA_MAC_DINH_MS;
  const nowMsRaw = lay('--now-ms');
  const nowMs = nowMsRaw !== null ? Number(nowMsRaw) : Date.now();
  const lockSha = lay('--lock-sha');
  const expectedSha = lay('--expected-sha');
  const khongMang = a.includes('--khong-mang');
  const jsonMode = a.includes('--json');

  if (chuong !== null && !/^\d{1,2}$/.test(String(chuong))) {
    console.error(`Mã chương không hợp lệ: "${chuong}"`);
    process.exit(2);
  }
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    console.error(`Giá trị --ttl-gio không hợp lệ: "${ttlGioRaw}"`);
    process.exit(2);
  }

  const nhanMode = a.includes('--nhan');
  const donKhoaMode = a.includes('--don-khoa');
  const coNhaKhoa = a.includes('--nha-khoa');
  const nhomNhaKhoa = lay('--nha-khoa') || (coNhaKhoa ? nhomArg : null);

  if (coNhaKhoa) {
    if (!nhomNhaKhoa || nhomNhaKhoa.startsWith('--')) {
      console.error('Thiếu mã nhóm 4 số cho --nha-khoa (vd: --nha-khoa 8543)');
      process.exit(2);
    }
    const kq = await nhaKhoaNhom(nhomNhaKhoa, { gitCwd, remote, expectedSha, khongMang });
    if (jsonMode) {
      console.log(JSON.stringify(kq, null, 2));
    } else if (kq.daNha) {
      console.log(`ĐÃ NHẢ KHOÁ ${kq.nhanhKhoa} trên ${remote}`);
    } else {
      console.log(`KHÔNG NHẢ ${kq.nhanhKhoa}: ${kq.khongTonTai ? 'nhánh không tồn tại' : (kq.lyDo || 'thất bại')}`);
    }
    process.exit(kq.daNha || kq.khongTonTai ? 0 : 1);
  }

  if (donKhoaMode) {
    const kq = await donKhoaM81({
      luat,
      hoSo,
      canhTranhMd,
      chuong,
      gitCwd,
      remote,
      ttlMs,
      nowMs,
      khongMang,
    });
    if (jsonMode) {
      console.log(JSON.stringify(kq, null, 2));
    } else {
      console.log(`Dọn khoá M-81 trên ${remote}: đã nhả ${kq.daNha.length}, giữ nguyên ${kq.giuNguyen.length}`);
      for (const item of kq.daNha) {
        console.log(`  - NHẢ ${item.nhom} (${item.lyDo}) sha=${item.oldSha.slice(0, 12)}`);
      }
      for (const item of kq.giuNguyen) {
        console.log(`  = GIỮ ${item.nhom} (${item.trangThaiSoDiem}, tuổi=${Math.round(item.tuoiMs / 60_000)} phút)`);
      }
    }
    return;
  }

  if (nhanMode) {
    const kq = await nhanNhomTiep({
      luat,
      hoSo,
      canhTranhMd,
      thuTuPath,
      chuong,
      nhom: nhomArg,
      gitCwd,
      remote,
      tho,
      ttlMs,
      nowMs,
      lockSha,
      khongMang,
    });
    if (jsonMode) {
      console.log(JSON.stringify(kq, null, 2));
    } else if (kq.nhanDuoc) {
      console.log(`NHẬN ĐƯỢC ${kq.nhom} -> ${kq.nhanhKhoa} (sha=${kq.lockSha.slice(0, 12)}, dòng8=${kq.soDong8}, thửLại=${kq.thuLai})`);
    } else {
      console.log(`KHÔNG NHẬN ĐƯỢC NHÓM (${kq.lyDoHet || 'HẾT_ỨNG_VIÊN'}, bỏQuaDoKhoá=${kq.boQuaDoKhoa.length})`);
    }
    process.exit(kq.nhanDuoc ? 0 : 1);
  }

  // Mặc định: --xem (không bao giờ đẩy mạng; chỉ đọc khoá remote khi truyền --remote và không bật --khong-mang)
  const q = xepHangDoiM81({
    luat,
    hoSo,
    canhTranhMd,
    thuTuPath,
    chuong,
    nhom: nhomArg,
    gioiHan,
  });

  let khoaTheoNhom = null;
  if (!khongMang && remoteArg !== null) {
    const kr = await lietKeKhoaRemote({ gitCwd, remote, nowMs, ttlMs });
    khoaTheoNhom = kr.theoNhom;
  }

  const hangDoiHienThi = q.hangDoi.map((item) => {
    const k = khoaTheoNhom ? (khoaTheoNhom.get(item.nhom) || null) : null;
    return {
      nhom: item.nhom,
      nut: item.nut,
      chuong: item.chuong,
      ten: item.ten,
      soDong8: item.soDong8,
      luotKhachHoi: item.luotKhachHoi,
      coTrongThuTu: item.coTrongThuTu,
      hangThuTu: item.hangThuTu,
      nguonUuTien: item.nguonUuTien,
      ...(khoaTheoNhom ? {
        dangKhoa: Boolean(k?.conHieuLuc),
        khoaQuaHan: Boolean(k?.quaHan),
        lockSha: k?.sha ?? null,
      } : {}),
    };
  });

  if (jsonMode) {
    console.log(JSON.stringify({
      khuon: q.khuon,
      chuong: q.chuong,
      coThuTuCuonChieu: q.coThuTuCuonChieu,
      tepThuTu: q.tepThuTu,
      tongNhom: q.tongNhom,
      dong: q.dong,
      chua: q.chua,
      do: q.do,
      hangDoi: hangDoiHienThi,
    }, null, 2));
  } else {
    console.log(`Hàng đợi M-81 CHUA: ${hangDoiHienThi.length}/${q.chua} nhóm (DONG=${q.dong}, DO=${q.do}, tổng=${q.tongNhom}, thứTự=${q.coThuTuCuonChieu ? 'có tệp' : 'theo dòng 8 số'})`);
    for (const item of hangDoiHienThi) {
      const nhanKhoa = item.dangKhoa ? ' [ĐANG KHOÁ]' : (item.khoaQuaHan ? ' [KHOÁ QUÁ HẠN]' : '');
      const nhanKhach = item.luotKhachHoi !== null ? `, kháchHỏi=${item.luotKhachHoi}` : '';
      console.log(`  - ${item.nhom} (dòng8=${item.soDong8}${nhanKhach})${nhanKhoa} — ${item.ten.slice(0, 72)}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  });
}
