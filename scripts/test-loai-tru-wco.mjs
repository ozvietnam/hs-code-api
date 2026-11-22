#!/usr/bin/env node
/**
 * Cổng máy #1636 Việc 3 (ADR-0004 §2 B1): câu loại trừ chú giải chi tiết (LOAI_TRU) + ý kiến WCO (WCO).
 * ĐỎ khi:
 *  - số cạnh LOAI_TRU hoặc WCO = 0;
 *  - có cạnh thiếu trích dẫn / nguồn hoặc trích dẫn LOAI_TRU không khớp nguyên văn chu-giai-heading / nguồn hợp lệ;
 *  - thiếu một trong 3 ví dụ bắt buộc (#1636): 8545 → 85.03 (giữ chổi than), 7603 → Ch.32 (bột nhão), 3924 ← 3924.90/4 (+ 6402 ← 6402.99/1);
 *  - làm yếu cổngheadingSuspect của API công khai lib/wco-op.js#view.
 */
import { createRequire } from 'node:module';
import { GOC, docJson, boKiem } from './lib-luat.mjs';

process.chdir(GOC);
const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-loai-tru-wco');
const D = require('../lib/do-thi/index.js');
const { sourcesFor, quoteInSource, squash, checkItem } = require('../lib/so-tay.js');
const wcoOp = require('../lib/wco-op.js');

const b = D.bangCanh();
const loaiTru = b.canh.filter((e) => e.loai === 'LOAI_TRU');
const wco = b.canh.filter((e) => e.loai === 'WCO');

kiem(`có cạnh LOAI_TRU (${loaiTru.length} cạnh từ ${b.thongKe.loaiTru?.nhomNguon || 0} nhóm)`, loaiTru.length > 0 && b.thongKe.soCanh.LOAI_TRU === loaiTru.length);
kiem(`có cạnh WCO (${wco.length} cạnh từ ${b.thongKe.wco?.nhomDich || 0} phân nhóm/nhóm)`, wco.length > 0 && b.thongKe.soCanh.WCO === wco.length);

// 1. Mọi cạnh LOAI_TRU đều có trích nguyên văn trong nguồn hợp lệ của nhóm nguồn
let loaiTruHong = [];
const srcCache = new Map();
for (const e of loaiTru) {
  if (!e.trich || !e.nguon) { loaiTruHong.push(`${e.id}:thieu-trich`); continue; }
  if (!srcCache.has(e.tu)) {
    const s = sourcesFor(e.tu);
    const sq = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, squash(v)]));
    srcCache.set(e.tu, { s, sq });
  }
  const { sq } = srcCache.get(e.tu);
  if (!sq[e.nguon] || !quoteInSource(e.trich, sq[e.nguon])) {
    loaiTruHong.push(`${e.id}:khong-khop-nguon`);
  }
}
kiem(`0 cạnh LOAI_TRU thiếu hoặc sai trích dẫn nguyên văn (${loaiTru.length} cạnh)`, loaiTruHong.length === 0, loaiTruHong.slice(0, 5).join(', '));
kiem(`0 cạnh WCO thiếu trích hoặc nguồn (${wco.length} cạnh)`, wco.every((e) => Boolean(e.trich && e.nguon && e.idWco && e.viTri)));

// 2. Ba ví dụ bắt buộc của #1636
const st8545 = docJson('data/so-tay/8545.json');
kiem('8545 → 85.03 (bộ phận giữ chổi than): có trong sổ tay 8545 VÀ cạnh LOAI_TRU',
  (st8545.loaiTru || []).some((x) => x.sangNhom === '8503' && /giữ chổi than/i.test(x.dieuKien) && /85\.03/.test(x.trich))
  && loaiTru.some((e) => e.tu === '8545' && e.toi === '8503' && /giữ chổi than/i.test(e.trich)));

const st7603 = docJson('data/so-tay/7603.json');
kiem('7603 → Ch.32 (bột nhão với chất gắn/dung môi): có trong sổ tay 7603 VÀ cạnh LOAI_TRU 7603>32',
  (st7603.loaiTru || []).some((x) => x.sangNhom === '32' && /bột nhão/i.test(x.trich) && /Chương 32/.test(x.trich))
  && loaiTru.some((e) => e.tu === '7603' && e.toi === '32' && /bột nhão/i.test(e.trich)));

const eWco3924 = wco.find((e) => e.tu === '3924' && e.toi === '392490' && e.idWco === '392490/4');
kiem('3924 ← 3924.90/4: có cạnh WCO 3924>392490 và giữ minh bạch cờ nghi ngờ OCR (headingSuspect=true)',
  Boolean(eWco3924)
  && /Shower set/i.test(eWco3924.trich)
  && eWco3924.headingSuspect === true
  && eWco3924.headingContinued === true
  && eWco3924.bac === 2,
  JSON.stringify(eWco3924 || null));

const eWco6402 = wco.find((e) => e.tu === '6402' && e.toi === '640299' && e.idWco === '640299/1');
kiem('6402 ← 6402.99/1: có cạnh WCO sạch (headingSuspect=false, bac=1)',
  Boolean(eWco6402) && eWco6402.headingSuspect === false && eWco6402.bac === 1 && /cellular plastics/i.test(eWco6402.trich));

// 3. Ca ngược: cổng API công khai WCO không bị nới lỏng + tự trùng chương phải bị từ chối
kiem('ca ngược: cổng công khai lib/wco-op.js#view vẫn chặn 392490/4 (headingSuspect); tự loại trừ chính chương bị checkItem từ chối',
  wcoOp.view(wcoOp.get('392490/4')) === null
  && checkItem('loaiTru', { dieuKien: 'test', sangNhom: '76', nguon: 'nhom7603.nhom', trich: 'Chương 76' }, { 'nhom7603.nhom': 'Chương 76' }, '7603') === 'nhom-dich-trung-nhom-nay');

xong();
