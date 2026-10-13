#!/usr/bin/env node
/**
 * Áp kết quả SUY LUẬN mã cho các khối ý kiến WCO bị mất tiêu đề (#196) — khi không có ảnh dải mã để đọc.
 *
 *   node scripts/wco-op-apply-inferred.mjs --tasks=<all.json> --pass-a=<A-*.json,…> --pass-b=<B-*.json,…> [--dir=data/wco-op]
 *
 * Đầu vào:
 *   all.json  danh sách run bị mất tiêu đề: {runId, ownCode, nextHeadingCode, candidates:[{code}], blocks:[{block, opinions:[{line}]}]}
 *   pass-a / pass-b  hai lượt suy luận ĐỘC LẬP: [{runId, blocks:[{block, code, confidence, why, alt}]}]
 * Quy tắc (máy kiểm, không tin lời agent):
 *   - mã phải thuộc danh sách ứng viên của run (mã nằm giữa ownCode và nextHeadingCode theo thứ tự HS), tăng nghiêm ngặt giữa các khối của run;
 *   - CHỈ nhận khi HAI lượt cùng chọn một mã và CẢ HAI không phải "low"; khác nhau / có lượt "low" → để nguyên (headingSuspect), ghi báo cáo;
 *   - khối phải SẠCH: mọi ý kiến có số in sẵn đúng 1..n (khối lẫn ý kiến không đánh số có thể chứa ý kiến của mã kế tiếp → không gán);
 *   - ý kiến được gán đánh dấu headingInferred + headingBasis (không bao giờ giả làm "đọc từ tiêu đề"); thứ tự trong mã tính lại theo vị trí.
 * Ghi opinions.json (bản gốc lưu opinions.pre-inferred.json) + inferred-report.json (không chứa chữ WCO). Từ chối ghi nếu không bị .gitignore.
 */
import fs from 'node:fs';
import path from 'node:path';
import { assertIgnored, validate, loadWcoCodes } from './wco-op-parse.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };

/** @returns {{opinions: object[], report: object}} */
export function applyInferred(opinions, tasks, passA, passB) {
  const byRun = (arr) => new Map(arr.map((r) => [r.runId, new Map((r.blocks || []).map((b) => [b.block, b]))]));
  const A = byRun(passA); const B = byRun(passB);
  const lineIdx = new Map(opinions.map((o, i) => [o.line, i]));
  const out = opinions.map((o) => ({ ...o }));
  const report = { runs: tasks.length, blocks: 0, applied: 0, appliedOpinions: 0, unresolved: [], rejected: [] };
  for (const t of tasks) {
    const cand = new Set(t.candidates.map((c) => c.code));
    let prevCode = '';
    const plan = [];
    let runOk = true;
    for (const blk of t.blocks) {
      report.blocks += 1;
      const a = A.get(t.runId)?.get(blk.block); const b = B.get(t.runId)?.get(blk.block);
      if (!a || !b) { report.unresolved.push({ run: t.runId, block: blk.block, why: 'thieu-ket-qua' }); runOk = false; plan.push(null); continue; }
      // Khối lẫn ý kiến không đánh số / số in sẵn không khớp 1..n: có thể chứa ý kiến của mã kế tiếp (agent đã báo) → không gán cả khối.
      const clean = blk.opinions.every((op, idx) => { const i = lineIdx.get(op.line); return i !== undefined && opinions[i].ordPrinted === idx + 1; });
      if (!clean) { report.unresolved.push({ run: t.runId, block: blk.block, why: 'khoi-lan-y-kien-khong-khop-so-in-san', size: blk.opinions.length }); plan.push(null); continue; }
      const bad = [a, b].find((x) => !cand.has(String(x.code)));
      if (bad) { report.rejected.push({ run: t.runId, block: blk.block, why: 'ma-ngoai-ung-vien', a: a.code, b: b.code }); runOk = false; plan.push(null); continue; }
      if (String(a.code) !== String(b.code)) { report.unresolved.push({ run: t.runId, block: blk.block, why: 'hai-luot-khac-nhau', a: a.code, b: b.code, confA: a.confidence, confB: b.confidence }); runOk = false; plan.push(null); continue; }
      // Ứng viên bị ép nằm giữa hai tiêu đề đọc được; nếu mã đúng nằm NGOÀI khoảng đó (tiêu đề kế bị OCR sai) thì agent buộc phải chọn bừa — chỉ nhận khi CẢ HAI lượt đều không "low".
      if (a.confidence === 'low' || b.confidence === 'low') { report.unresolved.push({ run: t.runId, block: blk.block, why: 'co-luot-low', code: a.code, confA: a.confidence, confB: b.confidence }); runOk = false; plan.push(null); continue; }
      plan.push(String(a.code));
    }
    // tăng nghiêm ngặt trong run: kiểm trên các khối đã có mã (khối thiếu bị bỏ qua nhưng khối có mã vẫn phải đúng thứ tự)
    const have = plan.filter(Boolean);
    const ordered = have.every((c, i) => i === 0 || c > have[i - 1]) && (!have.length || have[0] > t.ownCode);
    if (!ordered) { report.rejected.push({ run: t.runId, why: 'khong-tang-nghiem-ngat', codes: have }); continue; }
    t.blocks.forEach((blk, j) => {
      const code = plan[j];
      if (!code) return;
      for (const op of blk.opinions) {
        const i = lineIdx.get(op.line);
        if (i === undefined) continue;
        out[i].hs = code; out[i].level = 6;
        out[i].headingInferred = true; out[i].headingBasis = 'LLM_AGREED'; // hai lượt độc lập cùng chọn, trong ràng buộc thứ tự HS
        delete out[i].headingSuspect; delete out[i].headingRestart;
        report.appliedOpinions += 1;
      }
      report.applied += 1;
    });
    prevCode = '';
  }
  // tính lại thứ tự trong mã theo vị trí (thứ tự tài liệu) và cờ ordInferred
  const per = new Map();
  for (const o of out) {
    const ord = (per.get(o.hs) || 0) + 1; per.set(o.hs, ord);
    o.ord = ord; o.id = `${o.hs}/${ord}`;
    if (o.ordPrinted === undefined || o.ordPrinted !== ord) o.ordInferred = true; else delete o.ordInferred;
  }
  report.suspectAfter = out.filter((o) => o.headingSuspect).length;
  return { opinions: out, report };
}

function main() {
  const dir = path.resolve(ROOT, arg('dir', 'data/wco-op'));
  const tasks = JSON.parse(fs.readFileSync(arg('tasks'), 'utf8'));
  const load = (list) => list.split(',').flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const of = path.join(dir, 'opinions.json'); const bak = path.join(dir, 'opinions.pre-inferred.json'); const rf = path.join(dir, 'inferred-report.json');
  const opinions = JSON.parse(fs.readFileSync(of, 'utf8'));
  const { opinions: res, report } = applyInferred(opinions, tasks, load(arg('pass-a')), load(arg('pass-b')));
  const issues = validate(res, loadWcoCodes());
  report.issues = Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, { count: v.length, first: v.slice(0, 10) }]));
  assertIgnored(of); assertIgnored(bak); assertIgnored(rf);
  if (!fs.existsSync(bak)) fs.copyFileSync(of, bak);
  fs.writeFileSync(of, JSON.stringify(res, null, 1));
  fs.writeFileSync(rf, JSON.stringify(report, null, 1));
  console.log(`khối ${report.blocks}: áp dụng ${report.applied} (${report.appliedOpinions} ý kiến); chưa quyết ${report.unresolved.length}; bị loại ${report.rejected.length}; ý kiến còn nghi sai mã: ${report.suspectAfter}`);
  console.log(`  ${rf}  ← không chứa chữ WCO`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
