#!/usr/bin/env node
/**
 * essence-test2.mjs — hoi Jev bang essenceTestVi (cau phan biet co san)
 * So sanh voi nameVi de tra loi: essenceTestVi chon dung nhieu hon hay it hon?
 */
import fs from 'fs';
import https from 'https';

const DATA = '/home/hsgd/wt-C/data';
const OUT = '/srv/hs-agent/reports/jev-bench';

// Load JEV credentials
let KEY = '', URL = 'https://openrouter.ai/api/v1/systemone', MODEL = 'typesafe/jev-1.13';
try {
  for (const line of fs.readFileSync('/home/hsgd/.hermes/.env', 'utf8').split('\n')) {
    if (line.startsWith('JEV_') && line.includes('=')) {
      const [k, v] = line.split('=', 2);
      if (k === 'JEV_API_KEY') KEY = v.trim();
      if (k === 'JEV_API_URL') URL = v.trim();
      if (k === 'JEV_MODEL') MODEL = v.trim();
    }
  }
} catch (e) {}

if (!KEY) { console.error('Thieu JEV_API_KEY'); process.exit(1); }
console.log(`JEV: KEY.len=${KEY.length}, URL=${URL.slice(0,40)}, MODEL=${MODEL}`);

// Load confusion pairs
const CP = JSON.parse(fs.readFileSync(`${DATA}/confusion-pairs.json`, 'utf8'));
const entries = Object.fromEntries(CP.entries.map(e => [e.id, e]));

// Load existing jev-bench
let benchRows = [];
try {
  const benchContent = fs.readFileSync('/srv/hs-agent/reports/jev-bench/2026-10-03-0822-jev-confusion.csv', 'utf8');
  const benchLines = benchContent.split('\n').filter(l => l.trim());
  const headers = benchLines[0].split(',');
  benchRows = benchLines.slice(1).map(line => {
    const vals = line.split(',');
    return Object.fromEntries(headers.map((h, j) => [h, vals[j] || '']));
  });
} catch (e) {}

// Load tax.json
const tax = JSON.parse(fs.readFileSync(`${DATA}/tax.json`, 'utf8'));
const ma8 = Object.keys(tax).sort();

function moTa(ma) {
  const d = ma.replace(/\./g, '');
  const con = ma8.filter(m => m.startsWith(d)).map(m => tax[m].en || '').filter(Boolean);
  if (!con.length) return null;
  if (con.length === 1) return con[0].slice(0, 220);
  const p = (con[0] || '').slice(0, 220);
  return con.every(c => c.startsWith(p)) ? p : (con[0] || '').slice(0, 220);
}

const caseIds = [...new Set(benchRows.map(r => r.id))];
console.log(`${caseIds.length} cases from jev-bench`);

function goiJev(moTa, pa, dung) {
  return new Promise((resolve) => {
    const crit = { ...pa };
    crit['khong_ma_nao'] = 'None';
    const body = {
      model: MODEL,
      state: { mo_ta_hang: moTa },
      questions: {
        ma_hs: { type: 'choice', instructions: 'Ma HS nao?', criteria: crit },
      },
    };
    const data = JSON.stringify(body);
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const req = https.request(URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'hs-211-essence',
        'HTTP-Referer': 'https://hs-kb.uythacnhapkhau.com',
        'X-Title': 'hs-code-api-211',
      },
    });
    req.on('error', e => finish({ chon: null, p_chon: 0, loi: e.message }));
    req.on('response', res => {
      let d = '';
      res.on('data', c => { d += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          const a = j.answers?.ma_hs || {};
          const pr = a.probabilities || {};
          finish({ chon: a.choice || null, p_chon: pr[a.choice || ''] || 0, loi: '' });
        } catch(e2) {
          finish({ chon: null, p_chon: 0, loi: 'parse' });
        }
      });
    });
    req.setTimeout(15000, () => { req.destroy(); finish({ chon: null, p_chon: 0, loi: 'timeout' }); });
    req.write(data);
    req.end();
  });
}

async function main() {
  const results = [];
  for (const id of caseIds) {
    const e = entries[id];
    if (!e?.essenceTestVi) continue;
    const allCodes = [...new Set([...(e.correctHs || []), ...(e.declaredHs || [])])];
    const pa = {};
    for (const m of allCodes) {
      const mt = moTa(m);
      if (mt) pa[m] = mt;
    }
    const dung = (e.correctHs || [])[0];
    if (!pa[dung]) continue;

    // Best nameVi result
    const br = benchRows.filter(r => r.id === id);
    let bestCu = { p: 0, ok: 0 };
    for (const r of br) {
      const p = parseFloat(r.p_chon || '0');
      if (p > bestCu.p) bestCu = { p, ok: parseInt(r.ok || '0') };
    }

    console.log(`=> ${id}: essenceTestVi="${e.essenceTestVi.slice(0,50)}..."`);
    const r2 = await goiJev(e.essenceTestVi, pa, dung);
    console.log(`   Result: chon=${r2.chon}, p=${r2.p_chon}, loi=${r2.loi}`);

    results.push({ id, p_cu: bestCu.p.toFixed(2), dung_cu: bestCu.ok,
                   p_moi: r2.p_chon.toFixed(4), dung_moi: r2.chon === dung ? 1 : 0 });
  }

  const ngay = new Date().toISOString().replace('T', '-').slice(0, 16).replace(':', '');
  const fOut = `${OUT}/2026-10-03-${ngay}-essence-test.csv`;
  const header = 'id,p_cu,dung_cu,p_moi,dung_moi';
  const rows = results.map(r => `${r.id},${r.p_cu},${r.dung_cu},${r.p_moi},${r.dung_moi}`);
  fs.writeFileSync(fOut, header + '\n' + rows.join('\n') + '\n');
  console.log(`Written: ${fOut}`);
  const cu_ok = results.filter(r => r.dung_cu).length;
  const moi_ok = results.filter(r => r.dung_moi).length;
  console.log(`nameVi correct: ${cu_ok}/${results.length}`);
  console.log(`essenceTestVi correct: ${moi_ok}/${results.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
