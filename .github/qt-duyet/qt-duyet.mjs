#!/usr/bin/env node
/**
 * Khoá gộp "qt-duyet": PR đụng mã chạy trên đường khách chỉ gộp được khi có chữ ký duyệt của QT cho ĐÚNG commit đầu nhánh.
 *
 * Vì sao (CEO 25/11/2026): mọi agent và QT dùng chung một tài khoản GitHub, nên lời "QT DUYỆT" ai cũng gõ được và PR đụng
 * động cơ đã bị gộp trước khi soát (#1856, #1881). Chữ ký ed25519: khoá riêng chỉ ở máy QT, repo chỉ giữ khoá công khai.
 *
 * Cách chạy: workflow .github/workflows/qt-duyet.yml luôn checkout `main` (không bao giờ chạy mã của PR), đọc PR qua API rồi
 * ghi trạng thái `qt-duyet` lên commit đầu nhánh. Trạng thái này là check bắt buộc của `main`.
 * Duyệt: bình luận trên PR một dòng `QT-DUYET <sha 40> <chữ ký base64>`; đẩy commit mới là phải duyệt lại.
 *
 * Giới hạn (khai thật): chặn gộp vội / gộp nhầm, không chặn được người có quyền quản trị repo cố tình tắt bảo vệ nhánh.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
export const NGU_CANH = 'qt-duyet';

/** Mã chạy trên máy phục vụ khách, luật cờ và chính cơ chế khoá. */
export const VUNG_KHOA = [
  /^lib\//, /^api\//, /^server\.js$/, /^data\/luat\//, /^data\/prompts\//, /^\.github\//,
  /^Dockerfile/, /^package(-lock)?\.json$/,
];
export const thuocVungKhoa = (tep) => VUNG_KHOA.some((re) => re.test(String(tep || '')));

export const thongDiep = (repo, so, sha) => `${repo}#${so}@${sha}`;

/** Có bình luận nào mang chữ ký hợp lệ cho đúng repo + số PR + sha không. */
export function coChuKy({ repo, so, sha, binhLuan, khoaCongKhai }) {
  const pub = crypto.createPublicKey(khoaCongKhai);
  for (const b of binhLuan || []) {
    for (const m of String(b || '').matchAll(/^QT-DUYET ([0-9a-f]{40}) ([A-Za-z0-9+/]{80,100}={0,2})\s*$/gm)) {
      if (m[1] !== sha) continue;
      try {
        if (crypto.verify(null, Buffer.from(thongDiep(repo, so, sha)), pub, Buffer.from(m[2], 'base64'))) return true;
      } catch { /* chữ ký hỏng → coi như không có */ }
    }
  }
  return false;
}

/** Quyết định trạng thái cho một PR. `tep` = null nghĩa là không đọc đủ danh sách tệp → coi như thuộc vùng khoá. */
export function quyet({ repo, so, sha, tep, binhLuan, khoaCongKhai }) {
  const dung = tep === null ? ['(không đọc đủ danh sách tệp)'] : tep.filter(thuocVungKhoa);
  if (!dung.length) return { state: 'success', description: 'Không đụng mã chạy đường khách' };
  if (coChuKy({ repo, so, sha, binhLuan, khoaCongKhai })) return { state: 'success', description: 'QT đã ký duyệt commit này' };
  return { state: 'pending', description: `Chờ QT ký duyệt: ${dung[0]}${dung.length > 1 ? ` +${dung.length - 1} tệp` : ''}`.slice(0, 138) };
}

const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const dsJson = (duongDan, jq) => gh(['api', '--paginate', duongDan, '--jq', `.[] | ${jq} | @json`]).split('\n').filter(Boolean).map((x) => JSON.parse(x));

function xuLyPr(repo, so, khoaCongKhai) {
  const pr = JSON.parse(gh(['api', `repos/${repo}/pulls/${so}`, '--jq', '{state, base: .base.ref, sha: .head.sha, soTep: .changed_files}']));
  if (pr.state !== 'open' || pr.base !== 'main') return null;
  const ds = dsJson(`repos/${repo}/pulls/${so}/files?per_page=100`, '[.filename, .previous_filename]');
  const tep = ds.length < pr.soTep ? null : ds.flat().filter(Boolean);
  const binhLuan = dsJson(`repos/${repo}/issues/${so}/comments?per_page=100`, '.body');
  const kq = quyet({ repo, so, sha: pr.sha, tep, binhLuan, khoaCongKhai });
  gh(['api', '-X', 'POST', `repos/${repo}/statuses/${pr.sha}`, '-f', `state=${kq.state}`, '-f', `context=${NGU_CANH}`, '-f', `description=${kq.description}`]);
  console.log(`#${so} ${pr.sha.slice(0, 8)} ${kq.state}: ${kq.description}`);
  return kq;
}

function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const khoaCongKhai = fs.readFileSync(path.join(THU_MUC, 'qt-duyet.pub.pem'), 'utf8');
  const so = ev.pull_request?.number || (ev.issue?.pull_request ? ev.issue.number : null);
  const ds = so ? [so] : dsJson(`repos/${repo}/pulls?state=open&base=main&per_page=100`, '.number');
  let loi = 0;
  for (const n of ds) {
    try { xuLyPr(repo, n, khoaCongKhai); } catch (e) { loi += 1; console.error(`#${n} lỗi: ${String(e.message).slice(0, 300)}`); }
  }
  if (loi) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
