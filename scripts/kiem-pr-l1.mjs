#!/usr/bin/env node
/**
 * Cổng CI nhắc luật L1 (docs/luat-duong-khach.md): PR đụng tệp gọi LLM thì thân PR phải trả lời mục L1.
 *
 * Vì sao: PR #1517 đổi prompt + thêm lượt LLM cho /api/identify, đo ở dev bằng Gemini flash đúng 10/10; lên máy thật
 * (chuỗi mô hình khác) sai nhóm 5/10, phải hoàn nguyên (#1519). Không ai hỏi "đo bằng mô hình nào" trước khi gộp.
 *
 * PR "đụng LLM" khi tệp bị sửa là:
 *   - tệp chuỗi mô hình / prompt: lib/llm-tier.js, lib/llm.mjs, lib/gemini.js, lib/customs-prompt.js,
 *     lib/prompt-version.js, data/prompts/**; hoặc
 *   - tệp trong lib/, api/ mà nội dung có gọi LLM hoặc chứa prompt hệ thống (callLLM…, SYSTEM_…, SYS_…).
 *
 * Khi đó thân PR phải có MỘT trong hai (mẫu PR có sẵn):
 *   (a) dòng `Không đổi hành vi LLM: <lý do>`  — sửa tệp có LLM nhưng không đổi prompt / số lượt / chuỗi mô hình;
 *   (b) dòng `Công tắc: \`HS_…\`` (mặc định tắt) VÀ mục `Đo bằng chuỗi mô hình máy thật` có nội dung.
 * Cổng này chỉ kiểm CÓ câu trả lời; đúng hay sai là việc của người soát.
 *
 * Dùng trong CI (.github/workflows/luat-l1.yml):  GH_TOKEN=… node scripts/kiem-pr-l1.mjs
 *   đọc số PR + thân PR từ $GITHUB_EVENT_PATH, danh sách tệp từ `gh api repos/<repo>/pulls/<số>/files`.
 * Dùng tay:  node scripts/kiem-pr-l1.mjs --than=<tệp chứa thân PR> --tep=lib/a.js,lib/b.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEP_CHUOI = new Set(['lib/llm-tier.js', 'lib/llm.mjs', 'lib/gemini.js', 'lib/customs-prompt.js', 'lib/prompt-version.js']);
const RE_GOI_LLM = /\bcallLLM\w*\s*\(|\bcallLlm\w*\s*\(|\bgenerateContent\s*\(|\b(?:const|let)\s+(?:SYSTEM|SYS)_?[A-Z0-9_]*\s*=/;

/** Tệp này có thuộc diện L1 không. `docTep(tep)` trả nội dung hoặc null (tệp đã xoá). */
export function tepDungLLM(tep, docTep) {
  if (TEP_CHUOI.has(tep) || tep.startsWith('data/prompts/')) return true;
  if (!/^(lib|api)\/.+\.(js|mjs)$/.test(tep)) return false;
  const s = docTep(tep);
  return typeof s === 'string' && RE_GOI_LLM.test(s);
}

const boChuThichHtml = (s) => String(s || '').replace(/<!--[\s\S]*?-->/g, '');

/** Thân PR đã trả lời mục L1 chưa. */
export function thanTraLoiL1(than) {
  const s = boChuThichHtml(than);
  const khongDoi = /^[ \t>*-]*Không đổi hành vi LLM[ \t]*:[ \t]*(\S.{9,})$/mi.exec(s);
  if (khongDoi && !/^[<\[(]?\s*(lý do|\.\.\.|…)/i.test(khongDoi[1])) return { dat: true, cach: 'khong-doi' };
  const congTac = /^[ \t>*-]*Công tắc[ \t]*:[ \t]*`?HS_[A-Z0-9_]+/mi.test(s);
  // Nội dung của mục đo = phần sau dòng tiêu đề, tới tiêu đề markdown kế tiếp (hoặc hết thân PR).
  const dau = s.search(/Đo bằng chuỗi mô hình máy thật/i);
  let noiDungDo = '';
  if (dau >= 0) {
    const sau = s.slice(dau).split('\n').slice(1).join('\n');
    const ket = sau.search(/^#{1,6}\s/m);
    noiDungDo = (ket >= 0 ? sau.slice(0, ket) : sau).replace(/[\s>*_-]/g, '');
  }
  if (congTac && noiDungDo.length >= 20) return { dat: true, cach: 'cong-tac-va-do' };
  const thieu = [];
  if (!congTac) thieu.push('dòng "Công tắc: `HS_…`"');
  if (noiDungDo.length < 20) thieu.push('mục "Đo bằng chuỗi mô hình máy thật" có nội dung');
  return { dat: false, thieu };
}

/** Kết luận cho một PR. */
export function kiemPR({ tep, than, docTep }) {
  const dung = tep.filter((t) => tepDungLLM(t, docTep));
  if (!dung.length) return { dat: true, dung, lyDo: 'PR không đụng tệp gọi LLM' };
  const tl = thanTraLoiL1(than);
  return { dat: tl.dat, dung, ...(tl.dat ? { lyDo: `thân PR đã trả lời L1 (${tl.cach})` } : { thieu: tl.thieu }) };
}

function chay() {
  const doi = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([a-z-]+)=(.*)$/.exec(a); return m ? [m[1], m[2]] : [a, true]; }));
  const docTep = (t) => { try { return fs.readFileSync(path.join(GOC, t), 'utf8'); } catch { return null; } };
  let than; let tep;
  if (doi.than) {
    than = fs.readFileSync(doi.than, 'utf8');
    tep = String(doi.tep || '').split(',').map((x) => x.trim()).filter(Boolean);
  } else {
    const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const pr = ev.pull_request;
    if (!pr) { console.log('Không phải sự kiện pull_request — bỏ qua.'); return 0; }
    than = pr.body || '';
    const repo = process.env.GITHUB_REPOSITORY;
    const ra = execFileSync('gh', ['api', '--paginate', `repos/${repo}/pulls/${pr.number}/files`, '--jq', '.[].filename'], { encoding: 'utf8' });
    tep = ra.split('\n').map((x) => x.trim()).filter(Boolean);
  }
  const kq = kiemPR({ tep, than, docTep });
  if (kq.dat) { console.log(`PASS luật L1: ${kq.lyDo}${kq.dung.length ? ` — tệp gọi LLM: ${kq.dung.join(', ')}` : ''}`); return 0; }
  console.log(`FAIL luật L1: PR sửa tệp gọi LLM (${kq.dung.join(', ')}) nhưng thân PR chưa trả lời mục L1.`);
  console.log(`  Thiếu: ${kq.thieu.join(' + ')}.`);
  console.log('  Sửa thân PR (không cần đẩy commit mới — sửa xong cổng tự chạy lại), ghi MỘT trong hai:');
  console.log('    Không đổi hành vi LLM: <lý do cụ thể>');
  console.log('  hoặc');
  console.log('    Công tắc: `HS_TEN_CO` (mặc định tắt)');
  console.log('    ### Đo bằng chuỗi mô hình máy thật');
  console.log('    <mô hình nào, qua Cổng thật hay chưa, bộ mẫu, số trước / sau>');
  console.log('  Luật: docs/luat-duong-khach.md mục L1.');
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(chay());
