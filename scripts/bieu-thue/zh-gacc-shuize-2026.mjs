#!/usr/bin/env node
/**
 * Trích tên tiếng Trung cấp 6 số từ《中华人民共和国进出口税则（2026）》(gacc-shuize-2026, #350).
 *
 * Lịch sử 2 lượt:
 *  - Lượt 1 (dev zcode, mm): tải PDF chính thống 70 MB từ gss.mof.gov.cn (raw-index.json),
 *    bóc vòng đầu theo dòng …00 → 4.8xx mã.
 *  - Lượt 2 (quản lý ZCode): sửa 2 lỗi cấu trúc — (a) quy tắc span: dòng 6 số = dòng gạch
 *    phân cấp NÔNG NHẤT có toàn bộ phạm vi nằm trong đúng một nhóm 6 số (đóng phạm vi bởi
 *    dòng gạch kế tiếp có dash<= HOẶC dòng thuế có dash<=); (b) vùng xám: nhóm không có dòng
 *    6 số riêng — dòng cuối 「其他」→ tenZh=其他 + tenZhCha=heading 4 số, ngược lại ghi thieu.
 *    Kết quả 5.595/5.784, máy kiểm nguyên văn cấp trang 5.581/5.595 + 14 soát tay
 *    (tên xuống dòng bị cột tỷ lệ chen giữa hai đoạn).
 *
 * Chạy: cần `pdftotext` (poppler) trong PATH — bóc layout bảng chính xác hơn thư viện JS.
 * Đọc PDF tại data/_src/bieu-thue-zh/<sha256>.pdf (gitignored, xem raw-index.json), ghi
 * data/bieu-thue/zh/{hs6-zh,thieu}.jsonl. KHÔNG sửa lib/, bộ kiểm, tax.json (đơn §3).
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW_DIR = path.join(ROOT, 'data', '_src', 'bieu-thue-zh');
const OUT_DIR = path.join(ROOT, 'data', 'bieu-thue', 'zh');

const rawIdx = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'raw-index.json'), 'utf8'));
const raw = rawIdx.tho.at(-1);
const PDF = path.join(RAW_DIR, raw.tep);
if (!fs.existsSync(PDF)) { console.error(`thiếu PDF nguồn ${PDF}`); process.exit(1); }

// ---- 1. bóc văn bản giữ layout (poppler); tách trang bằng \f ----
const txt = execFileSync('pdftotext', ['-layout', PDF, '-'], { maxBuffer: 1 << 28, encoding: 'utf8' });
const lines = txt.split('\n');
const pageOf = [];
{ let p = 1; for (let i = 0; i < lines.length; i++) { pageOf[i] = p; if (lines[i].includes('\f')) p++; } }
// Biên bảng nhập: header đầu → dòng cuối 9706.9000 (bảng xuất sau đó in mã không dấu chấm).
const L_START = 737, L_END = 88821;

// ---- 2. bóc dòng: heading 4 số / dòng thuế (có mã) / dòng gạch phân cấp (không mã) ----
const D = (s) => s.replace(/—/g, '-').length;
const rows = [], hier = [], headings = [];
for (let i = L_START; i <= L_END; i++) {
  const line = lines[i - 1] || ''; const page = pageOf[i - 1];
  let m = line.match(/^\s*(\d{2})\.(\d{2})\s+(\S.*?)\s*$/); // heading "05.08 珊瑚…"
  if (m && !/^\d/.test(m[3]) && m[3].length > 1) { headings.push({ code: m[1] + m[2], text: m[3].replace(/：$/, '').trim(), page, lineDau: i, nNoi: 0 }); continue; }
  m = line.match(/^\s*(\d{1,4})\s+(\d{4})\.(\d{4})\s+(—+|-+)\s*(\S.*?)\s{2,}/)   // có mã + gạch + cột tỷ lệ
   || line.match(/^\s*(\d{1,4})\s+(\d{4})\.(\d{4})\s+(—+|-+)\s*(\S[^\d]*?)\s*$/); // có mã + gạch, tên hết dòng
  if (m) { rows.push({ code8: m[2] + m[3], dash: D(m[4]), text: m[5].trim(), page, lineDau: i, nNoi: 0 }); continue; }
  m = line.match(/^\s*(\d{1,4})\s+(\d{4})\.(\d{4})\s+(\S.*?)\s{2,}/)            // có mã, không gạch (cấp 4 trọn)
   || line.match(/^\s*(\d{1,4})\s+(\d{4})\.(\d{4})\s+(\S.*?)\s*$/);              // tên chiếm cả dòng (2703.0000 泥煤…)
  if (m) { rows.push({ code8: m[2] + m[3], dash: 0, text: m[4].trim(), page, lineDau: i, nNoi: 0 }); continue; }
  m = line.match(/^\s{8,}(—+|-+)\s*([^—\s].*?)\s*$/);                            // dòng gạch phân cấp "-马："
  if (m) { const t = m[2].trim(); if (!t || /^\d/.test(t)) continue; hier.push({ dash: D(m[1]), text: t.replace(/：$/, '').trim(), page, lineDau: i, nNoi: 0 }); continue; }
  { // nối dòng tên xuống dòng (thuần CJK, ngay dòng kế, tối đa 3 dòng): "…旅行小客车及" + "赛车）"
    const s = line.trim();
    if (s && !/[A-Za-z0-9]/.test(s)) {
      for (const arr of [hier, rows, headings]) {
        if (!arr.length) continue;
        const hh = arr[arr.length - 1];
        if (i - (hh.lineDau + hh.nNoi) === 1 && hh.nNoi < 3) { hh.text = hh.text.replace(/：$/, '') + s; hh.nNoi++; break; }
      }
    }
  }
}
if (rows.length < 8000) { console.error(`chỉ bóc ${rows.length} dòng thuế (kỳ vọng 8972) — PDF khác ấn bản?`); process.exit(1); }

// ---- 3. quy tắc span ----
const firstRowAfter = new Array(hier.length + 1);
{ let r = 0; for (let i = 0; i <= hier.length; i++) { while (r < rows.length && rows[r].h === undefined) r++; } }
// (rows không lưu h nữa — tính lại bằng lineDau so hier.lineDau)
{ let r = 0; for (let i = 0; i <= hier.length; i++) { while (r < rows.length && rows[r].lineDau < (hier[i]?.lineDau ?? Infinity)) r++; firstRowAfter[i] = r; } }
const close = new Array(hier.length).fill(hier.length);
{ const st = []; for (let i = 0; i < hier.length; i++) { while (st.length && hier[st[st.length - 1]].dash >= hier[i].dash) close[st.pop()] = i; st.push(i); } }
const span = hier.map((h, i) => {
  const s = new Set();
  for (let r = firstRowAfter[i]; r < firstRowAfter[close[i]]; r++) {
    if (rows[r].dash <= h.dash && r > firstRowAfter[i]) break; // dòng thuế dash<= đóng phạm vi
    s.add(rows[r].code8.slice(0, 6));
  }
  return s;
});

// ---- 4. gán tên cho từng hs6 ----
const byP = new Map();
rows.forEach((r) => { const p6 = r.code8.slice(0, 6); if (!byP.has(p6)) byP.set(p6, []); byP.get(p6).push(r); });
const headOf = (p6) => headings.filter((x) => x.code === p6.slice(0, 4)).pop();
const NGUON = { url: raw.url, sha256: raw.sha256, layLuc: raw.layLuc };
const out = [], thieu = [];
const tax = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'tax.json'), 'utf8'));
const can = [...new Set(Object.keys(tax).map((k) => k.slice(0, 6)))].sort();
for (const p6 of can) {
  const rs = byP.get(p6);
  if (!rs) { thieu.push({ hs6: p6, lyDo: p6.startsWith('98') ? 'mã chương 98 (ưu đãi đặc biệt VN) — 进出口税则 2026 của TQ không có chương 98 (bảng nhập kết thúc ở chương 97)' : 'nhóm không có dòng nào trong bảng nhập TQ 2026' }); continue; }
  const vi = (r, chu) => `trang ${r.page}, dòng mã ${r.code8}${chu || ''}`;
  const u = rs.find((r) => r.code8.endsWith('00'));
  if (u) {
    let cha = null;
    for (let i = hier.length - 1; i >= 0; i--) { if (hier[i].lineDau < u.lineDau && hier[i].dash < u.dash) { cha = hier[i]; break; } }
    if (!cha) { const hh = headOf(p6); if (hh && (u.text === '其他' || u.text.length <= 4)) cha = { text: hh.text }; }
    out.push({ hs6: p6, tenZh: u.text, tenZhCha: cha && cha.text !== u.text ? cha.text : null, capKhop: 6, nguon: { ...NGUON, viTri: vi(u, u.dash === 0 ? ' (cấp 4 số trọn)' : '') } });
  } else {
    const firstRowIdx = rows.indexOf(rs[0]);
    const own = [];
    for (let i = 0; i < hier.length; i++) if (span[i].size === 1 && span[i].has(p6) && rows[firstRowAfter[i]]?.code8.slice(0, 6) === p6) own.push(hier[i]);
    if (own.length) {
      const t = own.sort((a, b) => a.dash - b.dash)[0];
      out.push({ hs6: p6, tenZh: t.text, tenZhCha: t.text === '其他' || t.text.length <= 4 ? (headOf(p6)?.text ?? null) : null, capKhop: 6, nguon: { ...NGUON, viTri: `trang ${t.page}, dòng mã ${rs[0].code8} (sec-dash${t.dash})` } });
    } else {
      const last = rs[rs.length - 1];
      if (last.text === '其他') out.push({ hs6: p6, tenZh: '其他', tenZhCha: headOf(p6)?.text ?? null, capKhop: 6, nguon: { ...NGUON, viTri: vi(last, ' (dòng cuối vùng gộp cấp 6 vào nhóm 4 số)') } });
      else thieu.push({ hs6: p6, lyDo: `ấn bản TQ 2026 in gộp cấp 6 vào nhóm 4 số (${p6.slice(0, 4)}) — không có dòng 6 số riêng, không lấy tên dòng 8 số để tránh sai` });
    }
  }
}
// Soát tay 1 dòng mà nối-dòng-tự-động bỏ vì đoạn giữa bắt đầu bằng SỐ:
// 2137 2907.2300 --4， / 4′-异亚丙基联苯酚 / 二苯基酚丙烷）及其盐 (3 đoạn chen cột tỷ lệ, tr.357)
const SOAT_TAY = { '290723': '4，4′-异亚丙基联苯酚（双酚A，二苯基酚丙烷）及其盐' };
// Văn bản in tên thuần Latin (không chữ Hán) — cổng kiểm đòi chữ Hán → ghi thieu, không bịa dịch:
const KHONG_HAN = { '380852': 'văn bản TQ in tên thuần Latin「DDT（ISO）」tại dòng 3808.5200 (tr.488) — không có chữ Hán để chép nguyên văn' };
for (const [ma, lyDo] of Object.entries(KHONG_HAN)) {
  const i = out.findIndex((o) => o.hs6 === ma); if (i >= 0) { out.splice(i, 1); thieu.push({ hs6: ma, lyDo }); }
}
for (const o of out) { o.tenZh = SOAT_TAY[o.hs6] ?? o.tenZh.replace(/：$/, ''); if (o.tenZhCha) o.tenZhCha = o.tenZhCha.replace(/：$/, ''); }
fs.writeFileSync(path.join(OUT_DIR, 'hs6-zh.jsonl'), out.map((o) => JSON.stringify(o)).join('\n') + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'thieu.jsonl'), thieu.map((o) => JSON.stringify(o)).join('\n') + '\n');
console.log(`gacc-shuize-2026: ${rows.length} dòng thuế | có tên ${out.length}/${can.length} | thieu ${thieu.length} (98xx ${thieu.filter((t) => t.hs6.startsWith('98')).length} + gộp-4số ${thieu.filter((t) => !t.hs6.startsWith('98')).length})`);
