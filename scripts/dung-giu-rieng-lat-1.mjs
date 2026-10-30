#!/usr/bin/env node
/**
 * L1-2b (#569) — dựng TẬP GIỮ RIÊNG Oz của lát 1 (spec §10 nhóm (b)): mẫu oz-gold có mã 8 số còn trong biểu, 6 số đầu thuộc
 * 50 phân nhóm lát 1 (data/ho-so/lat-1.json), thuộc tập giữ riêng 15 % của lib/holdout.js, tờ khai nhập
 * (lib/ho-so/lat-1.js#laToKhaiNhap), có câu chuẩn. Lọc bằng scripts/mo-ta-bench-lib.mjs#locGiuRiengLat1 — đúng hàm mà
 * `bench-mo-ta.mjs --nguon=oz --lat=1` dùng, nên tệp đóng băng ở đây và bench chấm cùng một tập.
 *
 *   node scripts/dung-giu-rieng-lat-1.mjs [--out=data/oz-export/bench/giu-rieng-lat-1.jsonl]   (OZ_GOLD_PATH để đổi nguồn)
 *
 * RIÊNG TƯ: tệp chi tiết có câu Oz ⇒ CHỈ ghi khi đường dẫn bị gitignore (git check-ignore), không thì từ chối, exit 3.
 * stdout chỉ có số đếm tổng hợp (dòng `TONG_HOP {json}`): số mẫu, số phân nhóm có/không có mẫu, phân bố mẫu/phân nhóm,
 * sha256 tệp đóng băng. Không câu Oz, không số lượt khai (ozCount). Không gọi LLM, không gọi mạng.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { ROOT, docLat1Pn6, locGiuRiengLat1, ghiRiengTu } from './mo-ta-bench-lib.mjs';

const require = createRequire(import.meta.url);
const arg = (n, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const out = path.resolve(ROOT, arg('out', 'data/oz-export/bench/giu-rieng-lat-1.jsonl'));

const goldP = [process.env.OZ_GOLD_PATH, path.join(ROOT, 'data', 'oz-gold-final.jsonl')].filter(Boolean).find((p) => fs.existsSync(p));
if (!goldP) { console.error('Không thấy oz-gold-final.jsonl (đặt OZ_GOLD_PATH).'); process.exit(2); }
const gold = fs.readFileSync(goldP, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const { taxData } = require('../lib/data.js');
const { isHeldOut } = require('../lib/holdout.js');
const { laToKhaiNhap } = require('../lib/ho-so/lat-1.js');
const pn6 = docLat1Pn6();
const giu = locGiuRiengLat1(gold, { pn6, taxData, isHeldOut, laToKhaiNhap })
  .sort((a, b) => String(a.hsCode).localeCompare(String(b.hsCode)) || String(a.tenHang).localeCompare(String(b.tenHang)));

const theo = new Map([...pn6].map((p) => [p, 0]));
for (const g of giu) theo.set(String(g.hsCode).slice(0, 6), theo.get(String(g.hsCode).slice(0, 6)) + 1);
const dem = [...theo.values()].filter((x) => x > 0).sort((a, b) => a - b);
const noiDung = giu.map((r) => JSON.stringify(r)).join('\n') + '\n';
const tongHop = {
  tongMauGold: gold.length,
  tongGiuRieng: gold.filter((g) => isHeldOut(g)).length,
  lat1: {
    mau: giu.length,
    maTam: new Set(giu.map((g) => String(g.hsCode))).size,
    phanNhomCoMau: dem.length,
    phanNhomKhongMau: [...theo].filter(([, n]) => n === 0).map(([p]) => p).sort(),
    mauMoiPhanNhom: dem.length ? { min: dem[0], trungVi: dem[Math.floor((dem.length - 1) / 2)], max: dem[dem.length - 1] } : null,
  },
  sha256: crypto.createHash('sha256').update(noiDung).digest('hex'),
};
console.log(`TONG_HOP ${JSON.stringify(tongHop)}`);
const rel = ghiRiengTu(ROOT, out, giu);
if (!rel) process.exit(3);
console.log(`Đã ghi tập giữ riêng lát 1 (riêng tư, gitignore): ${rel}`);
