#!/usr/bin/env node
/**
 * essence-test.mjs — hỏi Jev bằng essenceTestVi (câu phân biệt đã có sẵn)
 * So sánh với nameVi để trả lời: essenceTestVi chọn đúng nhiều hơn hay ít hơn?
 * 
 * Điều phối 03/10 20:50 — Câu 1 (nợ 4 lượt)
 * Tệp: reports/jev-bench/<ngày>-essence-test.csv
 * Cột: id, p_cu, dung_cu, p_moi, dung_moi
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '../data');
const OUT = '/srv/hs-agent/reports/jev-bench';

// JEV credentials from env
let KEY = process.env.JEV_API_KEY || '';
let URL = process.env.JEV_API_URL || 'https://openrouter.ai/api/v1/systemone';
let MODEL = process.env.JEV_MODEL || 'typesafe/jev-1.13';

// Load from ~/.hermes/.env if KEY not in env
if (!KEY) {
  const envFile = path.join(process.env.HOME || '/home/hsgd', '.hermes/.env');
  try {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      if (line.startsWith('JEV_') && line.includes('=')) {
        const [k, v] = line.split('=', 2);
        if (k === 'JEV_API_KEY') KEY = v.trim();
        if (k === 'JEV_API_URL') URL = v.trim();
        if (k === 'JEV_MODEL') MODEL = v.trim();
      }
    }
  } catch {}
}

if (!KEY) {
  console.error('Thiếu JEV_API_KEY'); process.exit(1);
}
console.log(`JEV: KEY.len=${KEY.length}, URL=${URL.slice(0,40)}, MODEL=${MODEL}`);

// Load confusion pairs
const CP = JSON.parse(fs.readFileSync(path.join(DATA, 'confusion-pairs.json'), 'utf8'));
const entries = Object.fromEntries(CP.entries.map(e => [e.id, e]));

// Load existing jev-bench results (nameVi/en/alias style)
const benchFile = '/srv/hs-agent/reports/jev-bench/2026-10-03-0822-jev-confusion.csv';
const benchRows = [];
if (fs.existsSync(benchFile)) {
  const content = fs.readFileSync(benchFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',');
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const r = {};
    headers.forEach((h, j) => r[h] = vals[j] || '');
    benchRows.push(r);
  }
}

// Get the 20 cases from jev-bench (these are the low-p ones from that run)
const caseIds = [...new Set(benchRows.map(r => r.id))];
console.log(`${caseIds.length} cases from jev-bench`);

// For each case, get existing nameVi results and essenceTestVi
async function goiJev(moTa, pa, dung) {
  const crit = { ...pa };
  crit['khong_ma_nao'] = 'None of the codes above fits / Không mã nào phù hợp';
  const body = {
    model: MODEL,
    state: { mo_ta_hang: moTa },
    questions: {
      ma_hs: {
        type: 'choice',
        instructions: 'Mã HS nào đúng nhất cho hàng trong `mo_ta_hang`?',
        criteria: crit,
      },
    },
  };

  for (let lan = 0; lan < 4; lan++) {
    try {
      const data = JSON.stringify(body);
      const req = https.request(URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'hs-211-essence-test',
          'HTTP-Referer': 'https://hs-kb.uythacnhapkhau.com',
          'X-Title': 'hs-code-api 211 essence-test',
        },
      });
      const result = await new Promise((resolve, reject) => {
        let chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
          try {
            const d = JSON.parse(Buffer.concat(chunks).toString());
            const a = d.answers || {};
            const ch = a.ma_hs || {};
            const pr = ch.probabilities || {};
            resolve({
              chon: ch.choice || null,
              p_chon: pr[ch.choice || ''] || 0,
              loi: '',
            });
          } catch(e) {
            reject(e);
          }
        });
        req.on('error', reject);
        req.write(data);
        req.end();
      });
      return result;
    } catch (e) {
      if (e.code === 'ENOTFOUND' || e.code === 'ECONNREFUSED') {
        return { chon: null, p_chon: 0, loi: `NET ${e.code}` };
      }
      await new Promise(r => setTimeout(r, 2000 + lan * 3000));
    }
  }
  return { chon: null, p_chon: 0, loi: 'timeout' };
}

async function main() {
  const results = [];

  for (const id of caseIds) {
    const e = entries[id];
    if (!e || !e.essenceTestVi) {
      console.log(`Skipping ${id}: no essenceTestVi`);
      continue;
    }

    // Build pa from correctHs + declaredHs using tax.json descriptions
    const tax = JSON.parse(fs.readFileSync(path.join(DATA, 'tax.json'), 'utf8'));
    const ma8 = Object.keys(tax).sort();

    function moTa(ma) {
      const d = ma.replace(/\./g, '');
      const con = ma8.filter(m => m.startsWith(d)).map(m => tax[m].en || '');
      if (!con.length) return null;
      if (con.length === 1) return con[0].slice(0, 220);
      const p = (con[0] || '').slice(0, 220);
      return con.every(c => c.startsWith(p)) ? p : (con[0] || '').slice(0, 220);
    }

    const allCodes = [...(e.correctHs || []), ...(e.declaredHs || [])];
    const uniqueCodes = [...new Set(allCodes)];
    const pa = {};
    for (const m of uniqueCodes) {
      const mt = moTa(m);
      if (mt) pa[m] = mt;
    }
    const dung = (e.correctHs || [])[0];
    if (!pa[dung]) {
      console.log(`Skipping ${id}: dung not in pa`);
      continue;
    }

    // Existing nameVi result (aggregate across vi/en/alias — use best p)
    const benchRowsForCase = benchRows.filter(r => r.id === id);
    let bestCu = { p: 0, ok: 0 };
    for (const r of benchRowsForCase) {
      const p = parseFloat(r.p_chon || '0');
      const ok = parseInt(r.ok || '0');
      if (p > bestCu.p) bestCu = { p, ok };
    }

    // Call Jev with essenceTestVi
    console.log(`Calling Jev for ${id}: essenceTestVi=${e.essenceTestVi.slice(0, 60)}...`);
    const r = await goiJev(e.essenceTestVi, pa, dung);
    console.log(`  => chon=${r.chon}, p_chon=${r.p_chon}, loi=${r.loi}`);

    results.push({
      id,
      p_cu: bestCu.p.toFixed(2),
      dung_cu: bestCu.ok,
      p_moi: r.p_chon.toFixed(4),
      dung_moi: r.chon === dung ? 1 : 0,
    });
  }

  // Write CSV
  const ngay = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const fOut = `${OUT}/2026-10-03-${ngay}-essence-test.csv`;
  const header = 'id,p_cu,dung_cu,p_moi,dung_moi';
  const rows = results.map(r => `${r.id},${r.p_cu},${r.dung_cu},${r.p_moi},${r.dung_moi}`);
  fs.writeFileSync(fOut, header + '\n' + rows.join('\n') + '\n');
  console.log(`Written: ${fOut}`);
  console.log(`${results.length} cases`);
  const cu_ok = results.filter(r => r.dung_cu).length;
  const moi_ok = results.filter(r => r.dung_moi).length;
  console.log(`nameVi correct: ${cu_ok}/${results.length} = ${(100*cu_ok/results.length).toFixed(0)}%`);
  console.log(`essenceTestVi correct: ${moi_ok}/${results.length} = ${(100*moi_ok/results.length).toFixed(0)}%`);
}

main().catch(e => { console.error(e); process.exit(1); });
