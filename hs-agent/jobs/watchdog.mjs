// Quản đốc (bảo hiểm im lặng) — docs/vps-agent-tu-hanh.md §2.10 điểm 1–2.
// Mỗi giờ đọc sổ của chính harness (runs.json, queue.json, env) rồi trả lời một câu:
// "máy có đang làm việc thật không, và nếu không thì AI phải làm gì?"
//
// Bài học từ bãi tập 201 (25/09): luồng chết im 21 giờ mà báo cáo sáng vẫn ra; kết quả
// "chờ khóa" nằm trong tệp không ai đọc; và một cảnh báo không có sổ đã-báo đã tự lặp
// 2.534 lần. Nên quản đốc:
//   - chỉ đọc, không sửa gì ngoài state/watchdog.json và reports/can-nguoi.md;
//   - mỗi vấn đề có KHÓA ổn định, báo lần đầu rồi im tới renotifyHours (sổ đã-báo);
//   - mỗi vấn đề có CHỦ (ai phải làm) + BẰNG CHỨNG máy (giờ chạy cuối, trạng thái, dòng log);
//   - giờ yên 23:00–07:00 VN không nhắn, trừ mức "critical" (máy không chạy).
import { existsSync, statSync } from 'fs';
import { load, save } from '../lib/store.mjs';
import { writeReport, sendTelegram } from '../lib/notify.mjs';
import { configuredProviders } from '../lib/llm.mjs';
import { STOP_FILE } from '../lib/paths.mjs';

const H = 3600 * 1000;

/** Ai phải làm, suy từ trạng thái + dòng tóm tắt của job. Thuần, test được. */
export function ownerOf(job, status, text = '') {
  if (/khóa|GITHUB_TOKEN|TELEGRAM|deploy key|chưa cấu hình/i.test(text)) return 'CEO — cấp khóa/kênh';
  if (job === 'freshness' || status === 'stale') return 'dev dữ liệu — đối chiếu nguồn';
  if (status === 'regression') return 'dev hs-code-api — điểm bench giảm';
  if (status === 'gate-red' || status === 'ship-blocked') return 'dev hs-agent — cửa kiểm/ship';
  if (status === 'budget') return 'dev hs-agent — chỉnh ngân sách';
  return 'quản trị server + dev hs-agent';
}

/**
 * Suy danh sách vấn đề từ sổ. Thuần (không I/O) để test offline.
 * @returns {Array<{key,level,owner,text,evidence,action}>}
 */
export function findIssues({ runs, queue, env, cfg, now = Date.now(), stopSince = null }) {
  const out = [];
  const expect = cfg.expectHours || {};
  const stuckHours = cfg.stuckHours ?? 36;
  const bad = new Set(cfg.stuckStatuses || ['waiting', 'ship-blocked', 'gate-red', 'budget', 'stale', 'regression', 'error']);

  if (stopSince != null && now - stopSince > (cfg.stopWarnHours ?? 24) * H) {
    out.push({ key: 'stop-file', level: 'warn', owner: 'quản trị server', text: `Công tắc tắt (STOP) bật ${Math.round((now - stopSince) / H)} giờ — mọi job đang bỏ qua.`, evidence: STOP_FILE, action: 'Gỡ STOP nếu đã xử lý xong sự cố.' });
  }

  for (const [job, maxH] of Object.entries(expect)) {
    const mine = runs.filter((r) => r.job === job && !r.dryRun);
    const last = mine[mine.length - 1];
    const age = last ? (now - Date.parse(last.startedAt)) / H : Infinity;
    if (age > maxH) {
      out.push({
        key: `silent:${job}`, level: 'critical', owner: 'quản trị server',
        text: `${job} không chạy ${Number.isFinite(age) ? `${Math.round(age)} giờ` : 'lần nào'} (hạn ${maxH} giờ).`,
        evidence: last ? `lần cuối ${last.startedAt} · ${last.status}` : 'runs.json không có lần chạy thật nào',
        action: `systemctl status hs-agent-${job}.timer · journalctl -u hs-agent@${job} -n 50`,
      });
      continue;
    }
    // Kẹt: chuỗi lần chạy liên tiếp cùng một trạng thái xấu, kéo dài ≥ stuckHours.
    if (job === 'watchdog') continue; // quản đốc không tự xét kẹt chính mình; digest xét quản đốc im
    let i = mine.length - 1;
    const st = last?.status;
    if (!st || !bad.has(st)) continue;
    while (i > 0 && mine[i - 1].status === st) i -= 1;
    const span = (now - Date.parse(mine[i].startedAt)) / H;
    const first = (last.lines || [])[0] || st;
    if (span >= stuckHours || st === 'regression' || st === 'error' || st === 'stale') {
      out.push({
        key: `stuck:${job}:${st}`, level: st === 'error' || st === 'regression' ? 'warn' : 'info',
        owner: ownerOf(job, st, (last.lines || []).join(' ')),
        text: `${job} ở trạng thái "${st}" ${Math.round(span)} giờ (${mine.length - i} lần liên tiếp): ${first}`,
        evidence: `từ ${mine[i].startedAt} → ${last.startedAt}`,
        action: first,
      });
    }
  }

  const items = queue?.items || [];
  const waitingNew = items.filter((x) => x.state === 'new' || x.state === 'retry');
  if (waitingNew.length) {
    const oldest = waitingNew.map((x) => Date.parse(x.addedAt || 0)).filter(Number.isFinite).sort()[0];
    const ageH = oldest ? (now - oldest) / H : 0;
    if (ageH >= (cfg.queueStaleHours ?? 72)) {
      out.push({ key: 'queue-stale', level: 'info', owner: 'dev hs-agent / CEO', text: `${waitingNew.length} văn bản chờ trích, cũ nhất ${Math.round(ageH / 24)} ngày — J2 không tiêu kịp hoặc không chạy.`, evidence: `queue.json new/retry = ${waitingNew.length}`, action: 'Xem trạng thái precedent-extract; tăng maxDocsPerRun nếu provider còn trần.' });
    }
  }

  const need = [
    ['no-channel', !(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID), 'Chưa có kênh báo (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) — mọi báo cáo chỉ nằm trong tệp, không ai đọc.'],
    ['no-llm', !(cfg._llmCount > 0), 'Chưa có khóa LLM nào — J2 không trích được tiền lệ.'],
    ['no-github', !env.GITHUB_TOKEN, 'Chưa có GITHUB_TOKEN — J2 không mở được PR, digest không đếm được PR.'],
  ];
  for (const [key, missing, text] of need) {
    if (missing) out.push({ key: `cfg:${key}`, level: key === 'no-channel' ? 'warn' : 'info', owner: 'CEO — cấp khóa/kênh', text, evidence: '/etc/hs-agent/env (selfcheck.sh liệt kê khóa trống)', action: 'Cấp khóa qua quản trị server (không dán vào chat).' });
  }
  return out;
}

/** Sổ đã-báo: trả { toSend, book } — mỗi khóa báo lần đầu, rồi im tới renotifyHours. Thuần. */
export function reconcile(book, issues, { now = Date.now(), renotifyHours = 24, quiet = false } = {}) {
  const next = { issues: {}, resolved: [] };
  const toSend = [];
  for (const is of issues) {
    const old = book.issues?.[is.key];
    const rec = { ...is, firstSeen: old?.firstSeen || new Date(now).toISOString(), lastSeen: new Date(now).toISOString(), lastNotified: old?.lastNotified || null };
    const due = !rec.lastNotified || now - Date.parse(rec.lastNotified) >= renotifyHours * H;
    if (due && (!quiet || is.level === 'critical')) {
      toSend.push(rec);
      rec.lastNotified = new Date(now).toISOString();
    }
    next.issues[is.key] = rec;
  }
  for (const k of Object.keys(book.issues || {})) if (!next.issues[k]) next.resolved.push(k);
  return { toSend, book: next };
}

const vnHour = (now) => new Date(now + 7 * H).getUTCHours();

export default async function watchdog({ cfg, log, dryRun }) {
  const now = Date.now();
  const runs = load('runs', []);
  const queue = load('queue', { items: [] });
  const stopSince = existsSync(STOP_FILE) ? statSync(STOP_FILE).mtimeMs : null;
  const issues = findIssues({ runs, queue, env: process.env, cfg: { ...cfg, _llmCount: configuredProviders('standard').length }, now, stopSince });

  const [qs, qe] = cfg.quietHoursVN || [23, 7];
  const h = vnHour(now);
  const quiet = qs > qe ? h >= qs || h < qe : h >= qs && h < qe;
  const { toSend, book } = reconcile(load('watchdog', { issues: {} }), issues, { now, renotifyHours: cfg.renotifyHours ?? 24, quiet });
  for (const k of book.resolved) log.info(`đã hết: ${k}`);

  const rows = Object.values(book.issues).sort((a, b) => (a.level === 'critical' ? -1 : 0) - (b.level === 'critical' ? -1 : 0));
  const md = [
    `# Việc chờ người — ${new Date(now + 7 * H).toISOString().slice(0, 16).replace('T', ' ')} (giờ VN)`,
    '',
    rows.length ? '| Mức | Việc | Ai phải làm | Bằng chứng | Từ |\n|---|---|---|---|---|' : 'Không có việc nào chờ người. Máy đang tự chạy.',
    ...rows.map((r) => `| ${r.level} | ${r.text} | ${r.owner} | ${r.evidence} | ${r.firstSeen.slice(0, 16)} |`),
    '',
  ].join('\n');
  writeReport('.', 'can-nguoi.md', md);
  if (!dryRun) save('watchdog', book);

  let sent = { ok: false, reason: dryRun ? 'dry-run' : 'không có gì mới' };
  if (toSend.length && !dryRun) {
    const text = ['🧭 hs-agent quản đốc — việc cần người:', ...toSend.map((r) => `• [${r.owner}] ${r.text}\n  ↳ ${r.action}`)].join('\n');
    sent = await sendTelegram(text);
  }
  const status = rows.some((r) => r.level === 'critical') ? 'error' : rows.length ? 'waiting' : 'ok';
  return {
    status: status === 'error' ? 'ok' : status, // quản đốc báo lỗi của người khác, chính nó không "lỗi" → tránh tự báo 3 lần
    lines: [
      rows.length ? `${rows.length} việc chờ người (${rows.filter((r) => r.level === 'critical').length} nghiêm trọng) → reports/can-nguoi.md` : 'Không có việc chờ người.',
      toSend.length ? (sent.ok ? `đã báo ${toSend.length} việc mới/đến hạn nhắc` : `chưa gửi được (${sent.reason})`) : 'không có việc mới cần báo',
      ...(book.resolved.length ? [`đã hết: ${book.resolved.join(', ')}`] : []),
    ],
  };
}
