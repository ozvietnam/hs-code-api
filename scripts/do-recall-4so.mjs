#!/usr/bin/env node
/**
 * scripts/do-recall-4so.mjs — Thước đo recall nhóm 4 số (không AI) trên bộ chuẩn (#1645 Việc 1).
 *
 * Quy tắc chấm theo #1645:
 *   - Ca CHOT: row.nhom[0] phải nằm trong tomTat.nhom
 *   - Ca PHAN_VAN: TẤT CẢ các nhóm trong row.nhom đều phải nằm trong tomTat.nhom
 *
 * Cách dùng:
 *   node scripts/do-recall-4so.mjs --bo-chuan=/tmp/4so-v1.jsonl --cgct=so-sanh --mode=ca-hai --gate
 *   --bo-chuan=<path>         Đường dẫn JSONL (mặc định data/bo-chuan/4so-v1.jsonl)
 *   --cgct=off|on|so-sanh     Chế độ đo HS_TIM_CGCT (mặc định so-sanh)
 *   --mode=split|raw|ca-hai   Dạng đầu vào (mặc định ca-hai)
 *   --gate                    Trả mã lỗi != 0 nếu recall ON < 100% hoặc độ trễ tăng > 200 ms/lượt
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function parseArgs(argv) {
  const opts = {
    boChuan: 'data/bo-chuan/4so-v1.jsonl',
    cgct: 'so-sanh',
    mode: 'ca-hai',
    gate: false,
  };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--bo-chuan=')) opts.boChuan = a.slice('--bo-chuan='.length);
    else if (a.startsWith('--cgct=')) opts.cgct = a.slice('--cgct='.length);
    else if (a.startsWith('--mode=')) opts.mode = a.slice('--mode='.length);
    else if (a === '--gate') opts.gate = true;
  }
  return opts;
}

function tachMoTa(moTa) {
  const parts = String(moTa || '').split(/\s+\/\s+/).map((s) => s.trim());
  const clean = (s) => (s && !/^(none|null|không rõ)$/i.test(s) ? s : '');
  return {
    tenHang: clean(parts[0]) || parts[0] || '',
    chatLieu: clean(parts[1]),
    congDung: parts.slice(2).map(clean).filter(Boolean).join(' ').trim(),
  };
}

function taiBoChuan(duongDan) {
  const abs = path.isAbsolute(duongDan) ? duongDan : path.join(ROOT, duongDan);
  const lines = fs.readFileSync(abs, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function chamCa(row, nhom) {
  const expected = Array.isArray(row.nhom) ? row.nhom.map((h) => String(h).slice(0, 4)) : [];
  if (!expected.length) return { ok: false, missing: [] };
  const set = new Set((nhom || []).map((h) => String(h).slice(0, 4)));
  const targets = row.ketQua === 'PHAN_VAN' ? expected : [expected[0]];
  const missing = targets.filter((h) => !set.has(h));
  return { ok: missing.length === 0, missing };
}

function p95(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
}

async function chayLuot({ rows, mode, cgctOn, timTruoc, timCgctMod }) {
  const prevCgct = process.env.HS_TIM_CGCT;
  const prevTt = process.env.HS_TIM_TRUOC;
  process.env.HS_TIM_TRUOC = 'on';
  process.env.HS_TIM_CGCT = cgctOn ? 'on' : 'off';

  let initMs = 0;
  if (cgctOn && timCgctMod) {
    const idx = timCgctMod.xayChiMuc();
    initMs = idx.initMs || 0;
  }

  // Làm nóng chỉ mục một lượt trước khi bấm giờ theo từng ca
  if (rows.length) {
    const r0 = rows[0];
    await timTruoc(mode === 'split' ? tachMoTa(r0.moTa) : { tenHang: r0.moTa });
  }

  let pass = 0;
  let chotPass = 0;
  let chotTotal = 0;
  let pvPass = 0;
  let pvTotal = 0;
  const misses = [];
  const times = [];
  const hash = crypto.createHash('sha256');

  for (const row of rows) {
    const input = mode === 'split' ? tachMoTa(row.moTa) : { tenHang: row.moTa };
    const t0 = performance.now();
    const res = await timTruoc(input);
    const dt = performance.now() - t0;
    times.push(dt);

    const nhom = res?.tomTat?.nhom || [];
    const { ok, missing } = chamCa(row, nhom);
    if (row.ketQua === 'PHAN_VAN') {
      pvTotal += 1;
      if (ok) pvPass += 1;
    } else {
      chotTotal += 1;
      if (ok) chotPass += 1;
    }
    if (ok) pass += 1;
    else misses.push({ ca: row.ca, ketQua: row.ketQua, o: row.o, expected: row.nhom, missing, got: nhom, moTa: row.moTa });

    hash.update(JSON.stringify({
      ca: row.ca,
      trangThai: res?.tomTat?.trangThai,
      nhom,
      deNham: res?.tomTat?.deNham,
      nguon: res?.tomTat?.nguon,
      khoi: res?.khoi,
    }));
  }

  if (prevCgct === undefined) delete process.env.HS_TIM_CGCT; else process.env.HS_TIM_CGCT = prevCgct;
  if (prevTt === undefined) delete process.env.HS_TIM_TRUOC; else process.env.HS_TIM_TRUOC = prevTt;

  const avgMs = times.reduce((a, b) => a + b, 0) / Math.max(times.length, 1);
  return {
    mode,
    cgctOn,
    total: rows.length,
    pass,
    chotPass,
    chotTotal,
    pvPass,
    pvTotal,
    avgMs,
    p95Ms: p95(times),
    initMs,
    sha256: hash.digest('hex'),
    misses,
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  const rows = taiBoChuan(opts.boChuan);

  // Chặn đọc môi trường rò rỉ trước khi nạp tim-truoc
  for (const k of ['HS_TIEN_XU_LY', 'HS_TIM_TRUOC_NAP', 'HS_SO_TAY', 'HS_TRADE_SYNONYMS']) delete process.env[k];
  const { timTruoc } = require('../lib/tim-truoc.js');
  const timCgctMod = require('../lib/tim-cgct.js');

  const modes = opts.mode === 'ca-hai' ? ['split', 'raw'] : [opts.mode];
  const flags = opts.cgct === 'so-sanh' ? [false, true] : [opts.cgct === 'on'];

  let failedGate = false;
  for (const mode of modes) {
    let offRes = null;
    for (const cgctOn of flags) {
      const r = await chayLuot({ rows, mode, cgctOn, timTruoc, timCgctMod });
      if (!cgctOn) offRes = r;
      const tag = cgctOn ? 'ON ' : 'OFF';
      console.log(`[${mode.padEnd(5)} | ${tag}] recall ${r.pass}/${r.total} (CHOT ${r.chotPass}/${r.chotTotal}, PHAN_VAN ${r.pvPass}/${r.pvTotal}) | avg ${r.avgMs.toFixed(1)} ms | p95 ${r.p95Ms.toFixed(1)} ms${r.initMs ? ` | init ${r.initMs} ms` : ''} | sha256=${r.sha256}`);
      if (r.misses.length) {
        for (const m of r.misses) {
          console.log(`  MISS ca=${m.ca} (${m.ketQua}/${m.o}): expected=${m.expected.join(',')} missing=${m.missing.join(',')} | ${m.moTa}`);
        }
      }
      if (cgctOn && offRes) {
        const delta = r.avgMs - offRes.avgMs;
        console.log(`[${mode.padEnd(5)} | DELTA] +${r.pass - offRes.pass} ca | +${delta.toFixed(1)} ms/luot (tran <= 200.0 ms)`);
        if (opts.gate && delta > 200) {
          console.error(`GATE FAIL (${mode}): do tre tang ${delta.toFixed(1)} ms > 200 ms`);
          failedGate = true;
        }
      }
      if (opts.gate && cgctOn && r.pass < r.total) {
        console.error(`GATE FAIL (${mode}): recall ON ${r.pass}/${r.total} < 100%`);
        failedGate = true;
      }
    }
  }
  if (failedGate) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
