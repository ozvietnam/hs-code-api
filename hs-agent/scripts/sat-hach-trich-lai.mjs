#!/usr/bin/env node
// Sát hạch trích lại: 30 bản ghi đầu toan-van.json (đã có trong kho).
// Mỗi bản ghi: fetchPage → articleText → callJson → verifyRecords (cùng logic J2).
// Ghi kết quả: /srv/hs-agent/reports/sat-hach/YYYY-MM-DD.md
// KHÔNG ghi queue. KHÔNG push.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// ── Cấu hình ──────────────────────────────────────────────────────────────
const REPO_DIR    = '/srv/hs-code-api';
const REPORT_DIR  = '/srv/hs-agent/reports/sat-hach';
const RAW_DIR     = '/tmp/hs-sat-hach-raw';
const COUNT       = 30;

// ── LLM config — từ ~/.hermes/config.yaml (không đọc /etc/hs-agent/env) ──
const LLM_CFG = {
  baseUrl: 'http://192.168.1.80:20130/v1',
  apiKey:  process.env.HERMES_API_KEY || '',
  model:   'minimax/MiniMax-M2.7',
};
console.error(`[sat-hach] LLM: ${LLM_CFG.baseUrl} / ${LLM_CFG.model}`);

// ── Fetch tự có (writable dir, không phụ thuộc fetcher.mjs) ──────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function fetchPage(url) {
  mkdirSync(RAW_DIR, { recursive: true });
  const h = createHash('sha1').update(url).digest('hex');
  const u = new URL(url);
  const p = join(RAW_DIR, `${u.hostname.replace(/\./g, '_')}-${h}.html`);
  if (existsSync(p)) {
    return { html: readFileSync(p, 'utf8'), fromCache: true };
  }
  await new Promise(r => setTimeout(r, 1500)); // domain rate limit
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'vi,en;q=0.8' },
    redirect: 'follow'
  });
  const html = await res.text();
  writeFileSync(p, html);
  return { html, fromCache: false };
}

function htmlToText(html) {
  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+/gm, '')
    .trim();
}

// ── LLM call (giống precedent-extract) ───────────────────────────────────
async function callJson(system, user, { baseUrl, apiKey, model, maxTokens = 2000, timeoutMs = 90000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
      signal: ctl.signal,
    });
    clearTimeout(t);
    const data = await res.json();
    if (!res.ok) throw new Error(`LLM ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
    const text = data.choices?.[0]?.message?.content || '';
    const s = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    try { return JSON.parse(s); } catch { /* try extract */ }
    const m = s.match(/```(?:json)?\s*([\s\S]*?)```/) || s.match(/(\{[\s\S]*\})/);
    if (m) return JSON.parse(m[1]);
    throw new Error('LLM không trả JSON hợp lệ');
  } finally {
    clearTimeout(t);
  }
}

// ── verifyRecords inline (logic giống extract.mjs) ─────────────────────────
const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const COMPANY_RE = /\b(c[ôo]ng ty|cty|tnhh|c[ổo] ph[ầa]n|co\.?,? ?ltd|corporation|jsc)\b[^,.;:()]*/giu;
function scrub(s) {
  return String(s || '').replace(COMPANY_RE, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}
function codeAppears(code, text) {
  const d = String(code || '').replace(/\D/g, '');
  if (![4, 6, 8, 10].includes(d.length)) return false;
  const parts = d.length === 4 ? [d] : d.length === 6 ? [d.slice(0, 4), d.slice(4)] : [d.slice(0, 4), d.slice(4, 6), d.slice(6)];
  const re = new RegExp(`(?<!\\d)${parts.join('[.\\s]?')}(?!\\d)`);
  return re.test(String(text || ''));
}
function coverage(description, text) {
  const hay = fold(text);
  const toks = [...new Set(fold(description).split(/[^a-z0-9]+/).filter(t => t.length >= 3))];
  if (!toks.length) return 0;
  return toks.filter(t => hay.includes(t)).length / toks.length;
}
async function verifyRecords(llmJson, { text, ref, date, url }) {
  const records = [];
  const rejected = [];
  if (!llmJson || llmJson.coKetLuan === false) return { records, rejected, noConclusion: llmJson?.lyDoKhongKetLuan || 'không có kết luận' };
  for (const r of Array.isArray(llmJson.records) ? llmJson.records : []) {
    const hsCode = String(r.hsCode || '').replace(/\D/g, '');
    const why = (w) => rejected.push({ hsCode, why: w });
    if (![4, 6, 8, 10].includes(hsCode.length)) { why('mã không phải 4/6/8 số'); continue; }
    if (!codeAppears(hsCode, text)) { why('mã không xuất hiện nguyên văn trong toàn văn'); continue; }
    let description = scrub(r.description);
    if (description.length < 20) { why('mô tả quá ngắn sau khi lọc'); continue; }
    if (description.length > 480) description = description.slice(0, 477) + '…';
    const cov = coverage(description, text);
    if (cov < 0.6) { why(`mô tả chỉ khớp ${Math.round(cov * 100)}% toàn văn`); continue; }
    let reasonVi = scrub(r.reasonVi);
    if (r.conditionVi) reasonVi = `${reasonVi} Điều kiện: ${scrub(r.conditionVi)}`.trim();
    const rec = {
      hsCode,
      description,
      source: { type: 'TB-TCHQ', reference: ref, ...(date ? { issuedDate: date } : {}), url },
      ...(reasonVi ? { reasonVi: reasonVi.slice(0, 1000) } : {}),
      ...(r.girRule && /^GIR\s?[1-6]/i.test(r.girRule) ? { girRule: String(r.girRule).slice(0, 20) } : {}),
    };
    // Privacy word check
    const recText = JSON.stringify(rec).toLowerCase();
    const privacyWords = ['mã số thuế', 'số tờ khai', 'số hồ sơ', 'người nhận khẩu'];
    const privacyHit = privacyWords.find(w => recText.includes(w));
    if (privacyHit) { why(`lọc riêng tư: ${privacyHit}`); continue; }
    records.push(rec);
  }
  return { records, rejected };
}

const SYSTEM_PROMPT = `Bạn trích KẾT QUẢ PHÂN LOẠI mã HS từ MỘT văn bản của Hải quan Việt Nam (thông báo kết quả phân loại, thông báo xác định trước mã số, hoặc công văn hướng dẫn phân loại).
LUẬT:
1. CHỈ dùng nội dung văn bản. Không suy ra mã từ kiến thức riêng. Mã HS chép ĐÚNG như văn bản kết luận (bỏ dấu chấm): 8 chữ số; nếu văn bản chỉ kết luận tới nhóm/phân nhóm thì ghi 4 hoặc 6 chữ số.
2. Chỉ lấy mã mà văn bản KẾT LUẬN hàng THUỘC VỀ. Mã văn bản nói "không thuộc", "loại trừ", hay chỉ trích dẫn làm căn cứ thì bỏ.
3. Văn bản nói "không đủ cơ sở", trả hồ sơ, chuyển đơn vị khác, chỉ nhắc nguyên tắc chung mà không kết luận mã cho mặt hàng cụ thể → coKetLuan=false, records=[].
4. description = tên hàng + đặc tính kỹ thuật quyết định việc phân loại (chất liệu, cấu tạo, chức năng, thông số), 20–400 ký tự, tiếng Việt. TUYỆT ĐỐI KHÔNG ghi tên doanh nghiệp, địa chỉ, số công văn của doanh nghiệp, số tờ khai, trị giá. Tên nhãn hiệu/model của HÀNG thì được.
5. Một văn bản có nhiều mặt hàng → mỗi mặt hàng một record.
Trả DUY NHẤT JSON:
{"coKetLuan": true|false, "lyDoKhongKetLuan": "…"|null,
 "records": [{"hsCode": "85044090", "description": "…", "reasonVi": "căn cứ như văn bản nêu (chú giải, quy tắc GIR, đặc tính), ≤ 600 ký tự", "girRule": "GIR 1"|null, "confusedWith": ["8 chữ số"], "conditionVi": "…"|null}]}`;

function buildUserPrompt({ title, text }) {
  return `TIÊU ĐỀ: ${title}\n\nTOÀN VĂN:\n${String(text).slice(0, 14000)}`;
}

// ── Load dữ liệu ──────────────────────────────────────────────────────────
const tvData = JSON.parse(readFileSync(join(REPO_DIR, 'data/community/tb-tchq/toan-van.json'), 'utf8'));
const sample  = tvData.records.slice(0, COUNT);
console.error(`[sat-hach] toan-van: ${tvData.records.length} records, sát hạch ${sample.length} bản ghi`);

// ── Chạy ──────────────────────────────────────────────────────────────────
const results = [];

for (let i = 0; i < sample.length; i++) {
  const rec        = sample[i];
  const url        = rec.source?.url;
  const expectedHs = rec.hsCode;
  const ref        = rec.source?.reference || '';
  const date       = rec.source?.issuedDate || '';

  process.stderr.write(`[${i+1}/${sample.length}] ${expectedHs} — ${ref} … `);

  if (!url) {
    results.push({ n: i+1, expectedHs, ref, url: 'NONE', status: 'skip', note: 'không có url' });
    process.stderr.write(`SKIP (no url)\n`);
    continue;
  }

  try {
    const { html } = await fetchPage(url);
    if (!html) throw new Error('fetch returned empty');
    const text = htmlToText(html);
    if (text.length < 300) {
      results.push({ n: i+1, expectedHs, ref, url, status: 'skip', note: `toàn văn ${text.length} ký tự` });
      process.stderr.write(`skip (text ${text.length})\n`);
      continue;
    }

    const json = await callJson(SYSTEM_PROMPT, buildUserPrompt({ title: `${ref} — ${expectedHs}`, text }), LLM_CFG);
    const v = await verifyRecords(json, { text, ref, date, url });

    // Kiểm tra khớp 8 số đầy đủ
    let matched = false;
    // Kiểm tra khớp 4 số đầu (partial)
    let matched4 = false;
    let extractedHs = null;
    if (v && v.records && v.records.length > 0) {
      for (const r of v.records) {
        const e8 = String(expectedHs).replace(/\D/g, '');
        const x8 = String(r.hsCode || '').replace(/\D/g, '').slice(0, 8); // chấp nhận 10 số (VN), so với 8 số đáp án
        if (e8 === x8) { matched = true; extractedHs = r.hsCode; break; }
        if (e8.length >= 4 && x8.length >= 4 && e8.slice(0,4) === x8.slice(0,4)) matched4 = true;
      }
      if (!matched && !matched4) extractedHs = v.records[0]?.hsCode;
      else if (!extractedHs) extractedHs = v.records[0]?.hsCode;
    }

    const status = matched ? 'pass' : (v.noConclusion ? 'no-conclusion' : 'fail');
    results.push({
      n: i+1, expectedHs, extractedHs, ref, url, status,
      matched4: matched4 && !matched,  // khớp 4 số nhưng không khớp 8
      rejectedReasons: v.rejected.map(r => r.why),
      noConclusion: v.noConclusion,
    });
    process.stderr.write(`${status}${matched4 && !matched ? ' (khớp 4)' : ''}\n`);
  } catch (e) {
    console.error(`ERROR: ${e.message} | stack: ${e.stack?.split('\n').slice(0,5).join(' | ')}`);
    results.push({ n: i+1, expectedHs, ref, url, status: 'error', note: e.message.slice(0, 120) });
  }
}

// ── Tổng kết ─────────────────────────────────────────────────────────────
const pass    = results.filter(r => r.status === 'pass').length;
const fail    = results.filter(r => r.status === 'fail').length;
const skip    = results.filter(r => r.status === 'skip').length;
const noConc  = results.filter(r => r.status === 'no-conclusion').length;
const errCnt  = results.filter(r => r.status === 'error').length;
const exact8  = results.filter(r => r.status === 'pass').length;
const exact4  = results.filter(r => r.matched4).length;
const cant    = fail + noConc + errCnt;
const rate8   = sample.length > 0 ? Math.round(exact8 / sample.length * 100) : 0;

console.error(`\n[sat-hach] pass=${pass} fail=${fail} skip=${skip} no-conc=${noConc} errors=${errCnt}`);
console.error(`[sat-hach] khớp 8 số: ${exact8}/${sample.length} = ${rate8}%`);
console.error(`[sat-hach] khớp 4 số (chưa đủ 8): ${exact4}/${sample.length}`);

// ── Ghi báo cáo ───────────────────────────────────────────────────────────
mkdirSync(REPORT_DIR, { recursive: true });
const today = new Date(new Date().getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const lines = [];
lines.push(`# Sát hạch trích lại — ${today}`);
lines.push(`Nguồn: 30 bản ghi đầu \`data/community/tb-tchq/toan-van.json\` (đã có trong kho, biết đáp án).`);
lines.push(`Mục tiêu: khớp mã HS ≥ 95 %, 0 lỗi lọc riêng tư.`);
lines.push(`LLM: ${LLM_CFG.baseUrl} / ${LLM_CFG.model}`);
lines.push('');
lines.push(`## Tổng kết`);
lines.push(`| Chỉ tiêu | Giá trị |`);
lines.push(`|---|---|`);
lines.push(`| Tổng sát hạch | ${sample.length} |`);
lines.push(`| Pass (trích đúng mã) | ${pass} |`);
lines.push(`| Fail (trích sai mã) | ${fail} |`);
lines.push(`| Skip (không đủ điều kiện) | ${skip} |`);
lines.push(`| No-conclusion (văn bản không kết luận) | ${noConc} |`);
lines.push(`| Error (lỗi mạng/LLM) | ${errCnt} |`);
lines.push(`| **Khớp mã HS 8 số** | **${exact8}/${sample.length} (${rate8}%)** |`);
lines.push(`| Khớp 4 số đầu (chưa đủ 8 số) | ${exact4} |`);
lines.push(`| Không trích được (fail+no-conc+err) | ${cant} |`);
lines.push('');
lines.push(`## Chi tiết`);
lines.push(`| # | Mã đúng | Mã trích được | Trạng thái | Ghi chú |`);
lines.push(`|---|---|---|---|---|`);
for (const r of results) {
  const note = r.rejectedReasons?.length ? r.rejectedReasons.slice(0,2).join('; ') : (r.note || r.noConclusion || '');
  const tag = r.matched4 ? ' (khớp 4)' : '';
  lines.push(`| ${r.n} | ${r.expectedHs} | ${r.extractedHs || '-'} | ${r.status}${tag} | ${note} |`);
}
lines.push('');
lines.push(`## Bằng chứng (url đã fetch)`);
for (const r of results) {
  if (r.url && r.url !== 'NONE') lines.push(`- [${r.n}] ${r.expectedHs} → ${r.status}: ${r.url}`);
}
lines.push('');
lines.push(`_Script: \`hs-agent/scripts/sat-hach-trich-lai.mjs\` — chạy lúc ${new Date().toISOString()}_`);

const reportPath = join(REPORT_DIR, `${today}.md`);
writeFileSync(reportPath, lines.join('\n') + '\n');
console.error(`[sat-hach] Báo cáo: ${reportPath}`);

process.stdout.write(JSON.stringify({ total: sample.length, pass, fail, skip, noConclusion: noConc, errors: errCnt, exact8, exact4, cant, rate8, report: reportPath }, null, 2));
