#!/usr/bin/env node
/**
 * scripts/luat-goc/gir-test.mjs — Kiểm tra ngoại tuyến kho data/luat-goc/gir.jsonl và bộ trích gir-trich.mjs.
 * Chạy được 100% trong CI (không cần LUAT_GOC_TXT); nếu có LUAT_GOC_TXT thì đối chiếu luôn gir.txt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { boKiem, GOC } from '../lib-luat.mjs';
import { docBanChu, kiemKho, NGU_PHAP } from '../kiem-luat-goc.mjs';
import { trichTatCaGir } from './gir-trich.mjs';

const { kiem, xong } = boKiem('gir-test');

const pGir = path.join(GOC, 'data/luat-goc/gir.jsonl');
const pBatBuoc = path.join(GOC, 'data/luat-goc/bat-buoc.json');
kiem('tồn tại data/luat-goc/gir.jsonl', fs.existsSync(pGir));

const rawLines = fs.readFileSync(pGir, 'utf8').split('\n').filter((x) => x.trim());
const nuts = rawLines.map((l) => JSON.parse(l));
const byId = new Map(nuts.map((n) => [n.id, n]));
const batBuoc = JSON.parse(fs.readFileSync(pBatBuoc, 'utf8'));

kiem('tổng 54 nút (13 QUY_TAC + 41 CHU_GIAI_CHI_TIET)',
  nuts.length === 54 &&
  nuts.filter((x) => x.loai === 'QUY_TAC').length === 13 &&
  nuts.filter((x) => x.loai === 'CHU_GIAI_CHI_TIET').length === 41
);

const banChu = process.env.LUAT_GOC_TXT ? docBanChu(process.env.LUAT_GOC_TXT, 'gir') : [];
const kqKiem = kiemKho('gir', rawLines, {
  vanBan: banChu.length ? banChu : null,
  kyVong: batBuoc.gir || null,
});
kiem(`kiemKho(gir) 0 lỗi, 0 cảnh báo (${banChu.length ? 'đối chiếu bản chữ' : 'chế độ ngoại tuyến CI'})`,
  kqKiem.loi.length === 0 && kqKiem.canhBao.length === 0,
  [...kqKiem.loi, ...kqKiem.canhBao].join(' | ')
);

kiem('đủ 6 nút gốc gir:1..gir:6 và đúng lớp LUAT / HUONG_DAN',
  [1, 2, 3, 4, 5, 6].every((i) => byId.get(`gir:${i}`)?.loai === 'QUY_TAC' && byId.get(`gir:${i}`)?.cha === null) &&
  nuts.every((n) => {
    if (!NGU_PHAP.test(n.id)) return false;
    if (n.loai === 'QUY_TAC' && n.lop !== 'LUAT') return false;
    if (n.loai === 'CHU_GIAI_CHI_TIET' && n.lop !== 'HUONG_DAN') return false;
    if (n.cha !== null && (!byId.has(n.cha) || !n.id.startsWith(`${n.cha}:`))) return false;
    return n.nguon?.ban === 'HS2022' && n.nguon?.trang >= 50 && n.nguon?.trang <= 76 && n.hieuLuc?.tu === '2022-12-30' && n.hieuLuc?.den === null;
  })
);

kiem('kiểm tra chi tiết đủ :ct cho Quy tắc 1..6 (ct=41)',
  byId.has('gir:1:ct:5') &&
  byId.has('gir:2:a:ct:9') &&
  byId.has('gir:2:b:ct:4') &&
  byId.has('gir:3:ct:2') &&
  byId.has('gir:3:a:ct:3') &&
  byId.has('gir:3:b:ct:6') &&
  byId.has('gir:3:c:ct:1') &&
  byId.has('gir:4:ct:3') &&
  byId.has('gir:5:a:ct:3') &&
  byId.has('gir:5:b:ct:2') &&
  byId.has('gir:6:ct:3')
);

kiem('không dính cột tiếng Anh hay dòng CÔNG BÁO trong 54 nút',
  !nuts.some((n) => /\bRULE\b|EXPLANATORY NOTE|CÔNG BÁO/.test(n.nguyenVan))
);

// Unit test ngoại tuyến trích xuất 2 quy tắc mẫu
const mau = [
  'Phụ lục II\nQUY TẮC 1\nTên của Phần chỉ để tra cứu.\nCHÚ GIẢI QUY TẮC 1\n(I) Mở đầu.\nQUY TẮC 2\n(a) Hàng chưa hoàn chỉnh.\f(b) Hỗn hợp.\nCHÚ GIẢI QUY TẮC 2 (a)\n(I) Chi tiết 2a.',
].join('');
const mauKq = trichTatCaGir(mau).nuts;
kiem('unit test: trích xuất QUY TẮC 1..2 và :ct qua dấu ngắt trang',
  mauKq.length === 6 &&
  mauKq.some((x) => x.id === 'gir:1:ct:1' && x.nguyenVan.includes('(I) Mở đầu.')) &&
  mauKq.some((x) => x.id === 'gir:2:b' && x.nguon.trang === 51) &&
  mauKq.some((x) => x.id === 'gir:2:a:ct:1' && x.cha === 'gir:2:a')
);

xong();
