// J1 — Theo dõi văn bản mới (không cần LLM).
// Quét các thư mục vbpl.ts24 (mới nhất trước) tới khi gặp văn bản đã thấy, rồi:
//   - classification (công văn/thông báo phân loại) chưa có trong kho → xếp hàng cho J2
//   - trade-remedy (chống bán phá giá/tự vệ) → tải toàn văn, rút danh sách mã HS bị áp
//   - regulation (thông tư/nghị định về danh mục, thuế, hải quan) → đưa vào báo cáo
// Lần chạy đầu (bootstrap) đi sâu bootstrapPagesPerFolder trang để lấp hàng đợi.
import { fetchPage, htmlToText } from '../lib/fetcher.mjs';
import { folderUrl, parseListing, parseTitle, classifyDoc, hsCodesIn } from '../lib/vbpl.mjs';
import { buildRefIndex } from '../lib/refs.mjs';
import { load, save } from '../lib/store.mjs';
import { writeReport } from '../lib/notify.mjs';
import { today } from '../lib/log.mjs';
import { REPO } from '../lib/paths.mjs';
import { BudgetExceeded } from '../lib/budget.mjs';
import { scrub } from '../lib/extract.mjs';

export default async function legalWatch({ cfg, log, budget }) {
  const seen = load('vbpl-seen', { bootstrapped: false, ids: {} });
  const queue = load('queue', { items: [] });
  const refs = buildRefIndex(REPO);
  log.info(`chỉ mục số hiệu đã có: ${refs.size}`);
  const bootstrap = !seen.bootstrapped;
  const maxPages = bootstrap ? cfg.bootstrapPagesPerFolder : cfg.maxPagesPerFolder;
  if (bootstrap && cfg.bootstrapFetch) budget.limits.fetch = cfg.bootstrapFetch;
  let stoppedEarly = null;
  const cutoff = new Date(Date.now() - (cfg.lookbackDays || 1100) * 86400000).toISOString().slice(0, 10);
  const fresh = { classification: [], 'trade-remedy': [], regulation: [], other: 0 };
  const queuedIds = new Set(queue.items.map((i) => i.id));

  // Chạm trần ngân sách/thời gian giữa chừng: dừng quét nhưng VẪN lưu những gì đã thấy.
  try {
  for (const folder of cfg.folders) {
    for (let page = 1; page <= maxPages; page += 1) {
      budget.checkTime();
      // Trang thư mục thay đổi hằng ngày → không dùng cache.
      const { html, status } = await fetchPage(folderUrl(folder.id, page), { budget, cache: false });
      if (status !== 200) { log.warn(`${folder.nameVi} trang ${page}: HTTP ${status}`); break; }
      const items = parseListing(html);
      if (!items.length) break;
      let newOnPage = 0;
      for (const it of items) {
        if (seen.ids[it.id]) continue;
        newOnPage += 1;
        const meta = parseTitle(it.title);
        const kind = classifyDoc(meta);
        seen.ids[it.id] = { d: meta.date, k: kind };
        if (kind === 'other') { fresh.other += 1; continue; }
        // Không có ngày trong tiêu đề = văn bản cũ đăng theo mẫu cũ → chỉ đánh dấu đã thấy.
        if (!meta.date || meta.date < cutoff) continue;
        const entry = { id: it.id, url: it.url, title: it.title, ref: meta.ref, date: meta.date, kind, folder: folder.nameVi };
        if (kind === 'classification') {
          if (refs.has(meta.ref, meta.year)) { entry.known = true; }
          else if (!queuedIds.has(it.id)) {
            queue.items.push({ ...entry, state: 'new', attempts: 0, addedAt: today() });
            queuedIds.add(it.id);
          }
        }
        fresh[kind].push(entry);
      }
      if (!newOnPage && !bootstrap) break; // đã bắt kịp phần đã thấy
    }
  }
  } catch (e) {
    if (!(e instanceof BudgetExceeded)) throw e;
    stoppedEarly = e.message;
    log.warn(`dừng quét sớm: ${e.message} — lưu phần đã thấy, lần sau quét tiếp`);
  }

  // Quyết định phòng vệ thương mại: rút mã HS từ toàn văn (trang tĩnh → dùng cache).
  for (const e of fresh['trade-remedy'].slice(0, cfg.fetchRemedyText || 10)) {
    try {
      budget.checkTime();
      const { html } = await fetchPage(e.url, { budget });
      e.hsCodes = hsCodesIn(htmlToText(html)).slice(0, 40);
    } catch (err) {
      log.warn(`không đọc được ${e.ref}: ${err.message}`);
    }
  }

  // Chỉ coi là đã quét đầu xong khi không bị cắt ngang; bị cắt thì lần sau đi sâu tiếp.
  if (!stoppedEarly) seen.bootstrapped = true;
  save('vbpl-seen', seen);
  save('queue', queue);
  const pending = queue.items.filter((i) => i.state === 'new' || i.state === 'retry').length;

  const fmt = (e) => `- [${e.ref || e.title.slice(0, 40)}](${e.url}) ${e.date || ''} — ${parseTitle(e.title).subject || e.title}${e.hsCodes?.length ? `\n  - Mã HS: ${e.hsCodes.map((c) => c.replace(/^(\d{4})(\d{2})?(\d{2})?$/, (m, a, b, c2) => [a, b, c2].filter(Boolean).join('.'))).join(', ')}` : ''}${e.known ? ' _(đã có trong kho)_' : ''}`;
  const md = [
    `# Văn bản mới — ${today()}${bootstrap ? ' (lần quét đầu)' : ''}`,
    '',
    `Nguồn: vbpl.ts24.com.vn, ${cfg.folders.length} thư mục hải quan/thuế XNK/công thương.`,
    '',
    `## Phân loại hàng hóa (${fresh.classification.length})`,
    ...fresh.classification.map(fmt),
    '',
    `## Phòng vệ thương mại (${fresh['trade-remedy'].length})`,
    ...fresh['trade-remedy'].map(fmt),
    '',
    `## Quy định liên quan (${fresh.regulation.length})`,
    ...fresh.regulation.map(fmt),
    '',
    `Hàng đợi trích xuất (J2): ${pending} văn bản chờ.`,
  ].join('\n');
  const reportPath = writeReport('legal-watch', `${today()}.md`, md);

  const newClass = fresh.classification.filter((e) => !e.known).length;
  return {
    status: 'ok',
    lines: [
      `Phân loại mới ${fresh.classification.length} (chưa có trong kho ${newClass}) · phòng vệ TM ${fresh['trade-remedy'].length} · quy định ${fresh.regulation.length} · khác ${fresh.other}`,
      `Hàng đợi J2: ${pending} · báo cáo ${reportPath}`,
      ...(stoppedEarly ? [`Dừng quét sớm (${stoppedEarly}); phần còn lại quét ở lần sau.`] : []),
    ],
    counts: { classification: fresh.classification.length, newClassification: newClass, remedy: fresh['trade-remedy'].length, regulation: fresh.regulation.length, queue: pending },
    highlights: [...fresh['trade-remedy'], ...fresh.regulation, ...fresh.classification.filter((e) => !e.known)].slice(0, 12).map((e) => scrub(`${e.ref || ''} ${parseTitle(e.title).subject}`)),
  };
}
