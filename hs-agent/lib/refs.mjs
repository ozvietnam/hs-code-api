// Chỉ mục số hiệu văn bản ĐÃ có trong kho (precedents + community + parked + legal-docs),
// để không thu lại. Số hiệu TB-TCHQ đánh lại mỗi năm → khớp khi cùng số hiệu và
// (cùng năm hoặc một bên không rõ năm).
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { refKey } from './vbpl.mjs';

function readJson(p, fb) {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fb; }
}

export function buildRefIndex(repoDir) {
  const idx = new Map(); // key → Set(năm|'?')
  const add = (ref, year) => {
    const k = refKey(ref);
    if (!k) return;
    if (!idx.has(k)) idx.set(k, new Set());
    idx.get(k).add(year ? String(year) : '?');
  };
  const prec = readJson(join(repoDir, 'data/precedents.json'), {});
  for (const list of Object.values(prec)) for (const p of list) add(p.tbTchqNumber, p.year);
  for (const sub of ['data/community/tb-tchq', 'data/community-parked']) {
    const dir = join(repoDir, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const doc = readJson(join(dir, f), {});
      for (const r of doc.records || []) add(r?.source?.reference, String(r?.source?.issuedDate || '').slice(0, 4) || null);
    }
  }
  const legal = readJson(join(repoDir, 'data/legal-docs.json'), { documents: {} });
  for (const d of Object.values(legal.documents || {})) add(d.code, d.year);
  const titles = readJson(join(repoDir, 'data/legal-doc-titles.json'), { titles: {} });
  for (const k of Object.keys(titles.titles || {})) add(k, String(titles.titles[k].issuedDate || '').slice(0, 4) || null);
  return {
    size: idx.size,
    has(ref, year) {
      const s = idx.get(refKey(ref));
      if (!s) return false;
      return !year || s.has('?') || s.has(String(year));
    },
  };
}
