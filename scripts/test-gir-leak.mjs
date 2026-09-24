#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Rule bất biến #6: mọi trích dẫn GIR phải đi qua lib/gir.js (có basis +
 * evidence + source). Test này chặn các đường rò đã từng tồn tại:
 *   · prompt v1 bắt LLM tự ghi "girRulesApplied": ["GIR 1", ...]
 *   · /api/classify trả nguyên results[].gir LLM tự khai
 *   · residual-guard gắn cứng 'GIR 3(a)', precedent-search gắn cứng 'GIR-4'
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d))); };

// 1) Prompt active không đòi LLM tự gắn nhãn GIR, fallback trùng file active.
const idx = JSON.parse(fs.readFileSync('data/prompts/index.json', 'utf8'));
const active = fs.readFileSync(path.join('data/prompts', `${idx.active}.md`), 'utf8').trim();
check('prompt active không có girRulesApplied', !/girRulesApplied/.test(active));
check('prompt active không có ví dụ mã HS cụ thể', !/"\d{8}"/.test(active));
check('FALLBACK_PROMPT trong api/suggest.js trùng prompt active', fs.readFileSync('api/suggest.js', 'utf8').includes(active));

// 2) Quét code: chuỗi nhãn GIR có số chỉ được nằm ở nơi được phép.
const ALLOW = new Set([
  'lib/gir.js',            // nguồn chân lý
  'lib/gir-notes.js',      // nguyên văn 6 quy tắc
  'lib/decision-tables.js', // bảng do người soạn, đi vào gir.js qua resolver
  'api/notes.js',          // mô tả chuỗi chú giải 5 tầng, không phải trích dẫn
]);
const leaks = [];
for (const dir of ['lib', 'api']) {
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(m?js)$/.test(f)) continue;
    const rel = `${dir}/${f}`;
    if (ALLOW.has(rel)) continue;
    const lines = fs.readFileSync(rel, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/^\s*\*/.test(line)) return; // dòng JSDoc
      if (/['"`][^'"`]*GIR[- ]?\d/.test(code)) leaks.push(`${rel}:${i + 1}`);
    });
  }
}
check('không file nào ngoài allowlist tự gắn chuỗi "GIR <số>"', leaks.length === 0, leaks);

// 3) /lib/classify: nhãn gir của LLM không trả thẳng, đi qua gir.js thành LLM_ASSERTED.
const llmTier = require('../lib/llm-tier');
llmTier.callLLMJson = async (system) => {
  if (/headings/.test(system) && !/results/.test(system)) return { json: { headings: ['8413'] }, model: 'mock' };
  return { json: { results: [{ hs: '84137011', confidence: 90, reason: 'bơm ly tâm', gir: 'GIR 1' }], missing: [] }, model: 'mock', provider: 'mock' };
};
const { classify } = require('../lib/classify');
const out = await classify({ tenHang: 'máy bơm nước ly tâm một tầng cánh' }, { resolver: false });
check('classify: results[] không còn trường gir', (out.results || []).length > 0 && out.results.every((r) => !('gir' in r)), out.results);
const llmDet = (out.girRulesApplied || []).find((d) => d.basis === 'LLM_ASSERTED');
check('classify: nhãn LLM đi qua gir.js với basis LLM_ASSERTED', Boolean(llmDet), out.girRulesApplied);
check('classify: mọi determination có basis + evidence + source', (out.girRulesApplied || []).every((d) => d.basis && d.evidence && d.source));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
