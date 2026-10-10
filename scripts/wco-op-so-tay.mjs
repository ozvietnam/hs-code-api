#!/usr/bin/env node
/**
 * Nối ý kiến WCO (kho riêng) vào sổ tay công khai data/so-tay/<nhom4>.json — mục `yKienWco` (#196, TT 85/2026 Điều 6.1.b).
 *
 *   node scripts/wco-op-so-tay.mjs --in=<thư mục có all.json + out-*.json> [--dry]
 *
 * all.json : mảng {line, nguon, hs, ord, namThongQua, …} — ứng viên đã qua cổng mã/thứ tự (wco-op-ordcheck).
 * out-N.json: mảng {line, moTa, trich} — moTa tiếng Việt TỰ VIẾT; trich = câu tiếng Anh chép nguyên văn từ ý kiến (RIÊNG TƯ).
 * Ghi: (1) data/wco-op/so-tay-trich.json (riêng tư, gitignore) = { nguon: trich };
 *      (2) data/so-tay/<nhom4>.json: yKienWco[] công khai = {hs, thuTuTrongMa, namThongQua, moTa, nguon, dauVet, doTinCay, daSoatAnh:false}.
 * Mục không qua lib/so-tay.js#checkYKienWco (đối chiếu kho riêng) bị bỏ và liệt kê. Không bao giờ ghi nguyên văn vào sổ tay.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { verifySoTay, checkYKienWco, fingerprint } = require('../lib/so-tay.js');
const wcoOp = require('../lib/wco-op.js');

const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };

export function buildItems(all, outs, opinionOf) {
  const byLine = new Map(outs.map((o) => [o.line, o]));
  const items = []; const skipped = [];
  for (const c of all) {
    const o = byLine.get(c.line);
    if (!o || !o.moTa || !o.trich) { skipped.push({ nguon: c.nguon, lyDo: 'khong-co-mo-ta-hoac-trich' }); continue; }
    const op = opinionOf(c);
    items.push({
      hs: c.hs, thuTuTrongMa: c.ord, namThongQua: c.namThongQua, moTa: String(o.moTa).trim(), nguon: c.nguon,
      dauVet: fingerprint(o.trich), doTinCay: op && (op.headingInferred || op.headingRecovered) ? 'SUY_LUAN' : 'CHAC', daSoatAnh: false,
      _trich: String(o.trich),
    });
  }
  return { items, skipped };
}

function main() {
  const dir = path.resolve(arg('in'));
  const dry = process.argv.includes('--dry');
  const all = JSON.parse(fs.readFileSync(path.join(dir, 'all.json'), 'utf8'));
  const outs = fs.readdirSync(dir).filter((f) => /^out-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const { items, skipped } = buildItems(all, outs, (c) => wcoOp.get(`${c.hs}/${c.ord}`));

  // kho riêng: ghi trước để checkYKienWco đối chiếu được
  const realStore = path.join(ROOT, 'data/wco-op/so-tay-trich.json');
  const storeFile = dry ? path.join(dir, 'so-tay-trich.dry.json') : realStore; // chạy khô: kho tạm, không đụng kho thật
  let store = {}; try { store = JSON.parse(fs.readFileSync(realStore, 'utf8')); } catch { /* chưa có */ }
  for (const it of items) store[it.nguon] = it._trich;
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 1));
  process.env.HS_WCO_TRICH_FILE = storeFile; require('../lib/so-tay.js').resetWcoCache();

  const rejected = [];
  const byH4 = {};
  for (const it of items) {
    const { _trich, ...pub } = it;
    const why = checkYKienWco(pub, pub.hs.slice(0, 4), { doiChieu: true });
    if (why) { rejected.push({ nguon: pub.nguon, lyDo: why }); continue; }
    (byH4[pub.hs.slice(0, 4)] ||= []).push(pub);
  }
  let n = 0;
  for (const [h4, list] of Object.entries(byH4)) {
    const f = path.join(ROOT, 'data/so-tay', `${h4}.json`);
    const cur = JSON.parse(fs.readFileSync(f, 'utf8'));
    const before = (cur.yKienWco || []).length;
    const merged = new Map((cur.yKienWco || []).map((x) => [x.nguon, x]));
    for (const x of list) merged.set(x.nguon, x);
    const yk = [...merged.values()].sort((a, b) => a.hs.localeCompare(b.hs) || a.thuTuTrongMa - b.thuTuTrongMa);
    const next = { ...cur, yKienWco: yk };
    const r = verifySoTay(next, h4, undefined, { doiChieuWco: true });
    if (r.loai.some((l) => l.kind === 'yKienWco')) throw new Error(`${h4}: mục yKienWco không qua kiểm: ${JSON.stringify(r.loai.filter((l) => l.kind === 'yKienWco'))}`);
    next.dungTuNguon = [...new Set([...(cur.dungTuNguon || []), ...yk.map((x) => x.nguon)])].sort();
    next.kiemTra = { ...(cur.kiemTra || {}), tong: ((cur.kiemTra?.tong) || 0) - before + yk.length, dat: ((cur.kiemTra?.dat) || 0) - before + yk.length };
    n += yk.length - before;
    if (!dry) fs.writeFileSync(f, JSON.stringify(next, null, 1));
  }
  console.log(`ứng viên ${all.length}; thêm/cập nhật ${n} mục ở ${Object.keys(byH4).length} nhóm; bỏ ${skipped.length + rejected.length}`);
  for (const x of [...skipped, ...rejected]) console.log('  BỎ', x.nguon, x.lyDo);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
