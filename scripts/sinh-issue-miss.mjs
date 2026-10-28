// Bot sinh issue oz-wiki-plhq từ data/legal-status-miss.jsonl (#224/#209 bước 2).
// Mỗi lượt tra_hieu_luc_van_ban found:false đã được ghi JSONL (api/dataset.js).
// Bot này gom theo số hiệu, lọc nhiễu, và mở issue "nhu cầu thêm văn bản" —
// chạy tay hoặc gắn ca đêm: node scripts/sinh-issue-miss.mjs [--thuc]
//   mặc định = dry-run (chỉ in kế hoạch); --thuc = tạo issue thật qua gh CLI.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_DICH = 'ozvietnam/oz-wiki-plhq';
const NAM_TOI_DA = new Date().getFullYear() + 1;

// Gom dòng JSONL thành nhu cầu theo số hiệu: số lần + lần gần nhất.
export function gomMiss(dong) {
  const theoSo = new Map();
  for (const d of dong) {
    for (const so of d.soHieu || []) {
      const s = String(so).trim();
      if (!s) continue;
      const cur = theoSo.get(s) || { so: s, soLan: 0, lanCuoi: '' };
      cur.soLan++;
      if (!cur.lanCuoi || String(d.ts || '') > cur.lanCuoi) cur.lanCuoi = d.ts || '';
      theoSo.set(s, cur);
    }
  }
  return [...theoSo.values()].sort((a, b) => b.soLan - a.soLan || (a.so < b.so ? -1 : 1));
}

// Bỏ query thử/nhiễu: năm tương lai xa (1/2099/TT-BXX) hoặc chuỗi ngắn vô nghĩa.
export function locNhieu(gom, namToiDa = NAM_TOI_DA) {
  return gom.filter(({ so }) => {
    const nam = Number((so.match(/\/(\d{4})\//) || [])[1]);
    if (nam && nam > namToiDa) return false;
    if (so.replace(/[^0-9A-Za-z]/g, '').length < 4) return false;
    return true;
  });
}

export function docDongJsonl(noiDung) {
  const out = [];
  for (const line of String(noiDung || '').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { /* dòng hỏng bỏ qua */ }
  }
  return out;
}

export function thanhIssue({ so, soLan, lanCuoi }) {
  return [
    `## Nhu cầu`,
    `Khách tra hiệu lực **${so}** qua \`/api/dataset?resource=legal_status\` **${soLan} lần** nhưng sổ cộng đồng (oz-wiki-plhq registry) chưa có văn bản này → API trả \`found: false\`.`,
    ``,
    `- Lần gần nhất: ${lanCuoi || '(không rõ)'}`,
    `- Nguồn log: \`hs-code-api/data/legal-status-miss.jsonl\` (RUNTIME_LOG)`,
    ``,
    `## Việc cần làm`,
    `1. Tìm văn bản gốc (ưu tiên nguồn A:(congdung, vanban.chinhphu.vn, công báo);`,
    `2. Thêm YAML vào \`sodang/qua-trinh/...\` của oz-wiki-plhq kèm \`xac_minh\`;`,
    `3. Sau khi registry cập nhật, lượt tra tiếp theo sẽ \`found: true\`.`,
    ``,
    `> Issue sinh tự động bởi bot \`scripts/sinh-issue-miss.mjs\` — đừng đóng khi chưa thêm văn bản.`,
  ].join('\n');
}

function main() {
  const thuc = process.argv.includes('--thuc');
  const duongDan = (f) => join(process.cwd(), 'data', f);
  const jsonl = existsSync(duongDan('legal-status-miss.jsonl'))
    ? readFileSync(duongDan('legal-status-miss.jsonl'), 'utf8') : '';
  const daSinh = existsSync(duongDan('legal-status-issues.json'))
    ? JSON.parse(readFileSync(duongDan('legal-status-issues.json'), 'utf8')) : {};

  const keHoach = locNhieu(gomMiss(docDongJsonl(jsonl))).filter((x) => !daSinh[x.so]);
  const boQua = locNhieu(gomMiss(docDongJsonl(jsonl))).length - keHoach.length;
  console.log(`gom được ${gomMiss(docDongJsonl(jsonl)).length} số hiệu · lọc nhiễu bỏ ${gomMiss(docDongJsonl(jsonl)).length - locNhieu(gomMiss(docDongJsonl(jsonl))).length} · đã sinh issue ${boQua} · kế hoạch ${keHoach.length}`);

  for (const k of keHoach) {
    const tieuDe = `[miss] ${k.so} — khách tra ${k.soLan} lần, sổ chưa có`;
    if (!thuc) { console.log(`[dry] ${tieuDe}`); continue; }
    // Nhãn nhu-cau: tạo idempotent (lần đầu chưa có thì tạo, lần sau no-op)
    try { execFileSync('gh', ['label', 'create', 'nhu-cau', '-R', REPO_DICH,
      '--description', 'Văn bản khách tra nhưng sổ chưa có — bot sinh từ legal-status-miss.jsonl'], { stdio: 'ignore' }); } catch { /* đã có */ }
    const url = execFileSync('gh', ['issue', 'create', '-R', REPO_DICH,
      '--title', tieuDe, '--body', thanhIssue(k), '--label', 'nhu-cau'], { encoding: 'utf8' }).trim();
    daSinh[k.so] = { issue: url, ts: new Date().toISOString() };
    console.log(`[ok] ${k.so} → ${url}`);
  }
  if (thuc && keHoach.length) writeFileSync(duongDan('legal-status-issues.json'), JSON.stringify(daSinh, null, 1) + '\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
