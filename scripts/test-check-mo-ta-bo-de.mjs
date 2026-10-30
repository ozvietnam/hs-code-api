#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * L1-2a (#566) — máy kiểm bộ đề lát 1 (scripts/check-mo-ta-bo-de.mjs --tep=…).
 * Bộ đề GIẢ nhỏ ghi vào thư mục tạm (không đụng data/ thật): 3 phân nhóm, 6 ca, căn cứ là chuỗi nguyên văn có thật
 * trong biểu thuế. Không gọi LLM, không gọi mạng.
 *
 * Luật lát 1 phải bắt:
 *   - nguồn là data/so-tay/* (bộ đề phải độc lập với sổ tay) ⇒ ĐỎ
 *   - một pn6 của danh sách lát 1 có < 2 ca ⇒ ĐỎ
 *   - pn6 có kết luận TB-TCHQ trong precedents.json mà bộ đề không có ca TB-TCHQ ⇒ ĐỎ
 *   - băm tệp lệch dòng khoá mới nhất ⇒ ĐỎ "đã khoá"; chưa có khoá ⇒ ĐỎ trừ khi --chua-khoa (đang soạn)
 *   - caCaiLoi.boDuKien rỗng ⇒ ĐỎ; < 50 % ca có doiAnhEm ⇒ ĐỎ; doiAnhEm sang dòng cùng mức MFN / khác phân nhóm ⇒ ĐỎ
 *   - bộ đề giả hợp lệ + khoá đúng ⇒ XANH; bộ đề #543 (mặc định) vẫn XANH
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECK = path.join(ROOT, 'scripts', 'check-mo-ta-bo-de.mjs');
const BIEU = 'data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz';
const TIEU_DE = 'data/bieu-thue/2026.04.05/tieu-de.jsonl.gz';

let pass = 0, fail = 0;
const check = (n, c, d) => { c ? (pass++, console.log(`PASS ${n}`)) : (fail++, console.log(`FAIL ${n}`, d === undefined ? '' : String(d).slice(0, 1500))); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bo-de-lat-1-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* bỏ qua */ } });

// ── Bộ đề giả hợp lệ ──────────────────────────────────────────────────────────────────────────────────────────────
const dk = (cap, duKien, tuKhoa, trich, nguon = BIEU) => ({ cap, duKien, tuKhoa, nguon, trich });
function ca(id, maHs, o) {
  return {
    id, lat: 1, pn6: maHs.slice(0, 6), maHs, chuong: maHs.slice(0, 2),
    nguonCa: { loai: 'TU_DUNG', ghiChu: 'ca giả cho test' },
    thongTinHang: { tenHang: o.tenHang, chatLieu: o.chatLieu || null, congDung: o.congDung || null, thongSo: [], tinhTrang: 'Mới 100%', nhanHieu: null, model: null },
    duKienQuyetDinh: o.dk,
    nhomCanhTranh: o.ct || [],
    moTaMau: o.mau,
    caCaiLoi: { boDuKien: o.bo ?? [0], doiAnhEm: o.doi ?? null },
    duyetBoi: 'CLAUDE_DUYET',
  };
}
const KHOA_KL = dk(4, 'khóa bằng kim loại cơ bản', ['khóa', 'thép|kim loại|inox|đồng'], 'Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản');
const HOP_SO = dk(6, 'hộp số / bộ bánh răng ăn khớp', ['hộp số|bánh răng'], 'hộp số và các cơ cấu điều tốc khác');
const CAP_DIEN = dk(4, 'cáp điện có cách điện', ['cáp', 'cách điện'], 'Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện');
const DAU_NOI = dk(6, 'đã lắp với đầu nối điện', ['đầu nối'], 'Đã lắp với đầu nối điện');

function boDeHopLe() {
  return {
    phienBan: 'test', ten: 'bộ đề giả lát 1', lat: 1, duyetBoi: 'CLAUDE_DUYET',
    ca: [
      ca('T-830140-1', '83014020', {
        tenHang: 'Khóa cửa tay gạt', dk: [KHOA_KL, dk(8, 'khóa cửa', ['khóa cửa'], 'Khóa cửa')],
        mau: 'Khóa cửa tay gạt bằng thép không gỉ, mở bằng chìa, mới 100%',
        doi: { tu: 'Khóa cửa tay gạt', sang: 'Còng tay', maTroToi: '83014010' },
      }),
      ca('T-830140-2', '83014010', {
        tenHang: 'Còng tay', dk: [KHOA_KL, dk(8, 'còng, xích tay', ['còng'], 'Còng, xích tay')],
        mau: 'Còng tay bằng thép, khóa mở bằng chìa, mới 100%',
        doi: { tu: 'Còng tay', sang: 'Khóa cửa', maTroToi: '83014020' },
      }),
      ca('T-848340-1', '84834030', {
        tenHang: 'Hộp số máy đào', dk: [HOP_SO, dk(8, 'dùng cho máy thuộc nhóm 84.29', ['máy (đào|xúc|ủi)|84\\.?29'], 'Dùng cho máy thuộc nhóm 84.29 hoặc 84.30')],
        mau: 'Hộp số di chuyển dùng cho máy đào bánh xích, bánh răng thép, mới 100%',
        doi: { tu: 'máy đào bánh xích', sang: 'máy trộn công nghiệp', maTroToi: '84834090' },
      }),
      ca('T-848340-2', '84834090', {
        tenHang: 'Hộp số giảm tốc', dk: [HOP_SO],
        mau: 'Hộp số giảm tốc trục vít dùng cho băng tải, bánh răng thép, mới 100%',
      }),
    ],
  };
}
/** Hai ca TU_DUNG của 854442 — phân nhóm CÓ kết luận TB-TCHQ trong precedents.json. */
function ca854442() {
  return [
      ca('T-854442-1', '85444294', {
        tenHang: 'Cáp nguồn', dk: [CAP_DIEN, DAU_NOI, dk(8, 'cách điện plastic, lõi ≤ 5 mm', ['plastic|nhựa', 'lõi'], 'Cáp điện cách điện bằng plastic, trong đó mỗi lõi có đường kính không quá 5 mm')],
        mau: 'Cáp nguồn cách điện bằng plastic, mỗi lõi đường kính 1,2mm, đã gắn đầu nối, mới 100%',
        doi: { tu: 'cách điện bằng plastic', sang: 'cách điện bằng cao su', maTroToi: '85444297' },
      }),
      ca('T-854442-2', '85444297', {
        tenHang: 'Cáp nguồn cao su', dk: [CAP_DIEN, DAU_NOI, dk(8, 'cách điện bằng cao su', ['cao su'], 'Cáp điện cách điện bằng cao su hoặc giấy')],
        mau: 'Cáp nguồn cách điện bằng cao su, đã gắn đầu nối, mới 100%',
      }),
  ];
}
const LAT1 = { phienBan: 'test', phanNhom: [{ pn6: '830140' }, { pn6: '848340' }] };
const LAT1_CO_TB = { phienBan: 'test', phanNhom: [{ pn6: '830140' }, { pn6: '848340' }, { pn6: '854442' }] };

let n = 0;
function chay(boDe, { lat1 = LAT1, khoa = 'dung', them = [] } = {}) {
  n += 1;
  const tep = path.join(tmp, `bo-de-${n}.json`);
  const raw = JSON.stringify(boDe, null, 1);
  fs.writeFileSync(tep, raw);
  const lat1Tep = path.join(tmp, `lat-1-${n}.json`);
  fs.writeFileSync(lat1Tep, JSON.stringify(lat1));
  const khoaTep = path.join(tmp, `khoa-${n}.txt`);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  if (khoa === 'dung') fs.writeFileSync(khoaTep, `# khoá bộ đề lát 1\nsha256=${'0'.repeat(64)} tep=x ngay=2026-10-01 nguoiKhoa=cu\nsha256=${sha} tep=x ngay=2026-10-30 nguoiKhoa=test\n`);
  else if (khoa === 'lech') fs.writeFileSync(khoaTep, `sha256=${sha} tep=x ngay=2026-10-01 nguoiKhoa=cu\nsha256=${'f'.repeat(64)} tep=x ngay=2026-10-30 nguoiKhoa=test\n`);
  // khoa === 'khong' → không ghi tệp khoá
  const r = spawnSync(process.execPath, [CHECK, `--tep=${tep}`, `--lat1=${lat1Tep}`, `--khoa=${khoaTep}`, ...them], { encoding: 'utf8', cwd: ROOT });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` };
}

// 1. Bộ đề giả hợp lệ + khoá đúng ⇒ XANH
let r = chay(boDeHopLe());
check('bộ đề giả hợp lệ + khoá đúng ⇒ XANH', r.code === 0 && /XANH/.test(r.out), r.out);

// 2. Nguồn data/so-tay/* ⇒ ĐỎ (độc lập với sổ tay)
let b = boDeHopLe();
b.ca[0].duKienQuyetDinh.push(dk(8, 'theo sổ tay', ['khóa'], 'Khóa cửa', 'data/so-tay/8301.json'));
r = chay(b);
check('nguồn data/so-tay/* ⇒ ĐỎ, thông điệp nói độc lập sổ tay', r.code === 1 && /so-tay/.test(r.out) && /độc lập/i.test(r.out), r.out);

// 2b. Nguồn không phải NGUYEN_VAN (vd conflicts.json DA_KIEM) ⇒ ĐỎ
b = boDeHopLe();
b.ca[1].nhomCanhTranh.push({ ma: '83014090', lyDo: 'x', nguon: 'data/conflicts.json', trich: 'x' });
r = chay(b);
check('nguồn không phải NGUYEN_VAN ⇒ ĐỎ', r.code === 1 && /NGUYEN_VAN/.test(r.out), r.out);

// 3. Thiếu ca cho một pn6 ⇒ ĐỎ
b = boDeHopLe();
b.ca = b.ca.filter((c) => c.id !== 'T-848340-2');
r = chay(b);
check('pn6 848340 chỉ 1 ca ⇒ ĐỎ', r.code === 1 && /848340/.test(r.out) && /2 ca/.test(r.out), r.out);

// 3b. ca có pn6 ngoài danh sách lát 1 ⇒ ĐỎ
b = boDeHopLe();
b.ca.push(...ca854442());
r = chay(b);
check('ca có pn6 854442 ngoài danh sách lát 1 ⇒ ĐỎ', r.code === 1 && /854442/.test(r.out) && /ngoài danh sách/.test(r.out), r.out);

// 4. pn6 có kết luận TB-TCHQ (854442) mà bộ đề chỉ có ca TU_DUNG ⇒ ĐỎ
r = chay(b, { lat1: LAT1_CO_TB });
check('pn6 854442 có TB-TCHQ trong precedents.json nhưng không có ca TB-TCHQ ⇒ ĐỎ', r.code === 1 && /854442/.test(r.out) && /TB-TCHQ/.test(r.out), r.out);

// 5. Băm lệch khoá ⇒ ĐỎ với thông điệp "đã khoá"
r = chay(boDeHopLe(), { khoa: 'lech' });
check('băm lệch dòng khoá mới nhất ⇒ ĐỎ "bộ đề lát 1 đã khoá"', r.code === 1 && /bộ đề lát 1 đã khoá/.test(r.out), r.out);

// 6. Chưa khoá ⇒ ĐỎ; --chua-khoa (đang soạn) ⇒ XANH
r = chay(boDeHopLe(), { khoa: 'khong' });
check('chưa có dòng khoá ⇒ ĐỎ', r.code === 1 && /khoá/.test(r.out), r.out);
r = chay(boDeHopLe(), { khoa: 'khong', them: ['--chua-khoa'] });
check('chưa khoá + --chua-khoa ⇒ XANH (đang soạn)', r.code === 0, r.out);

// 7. boDuKien rỗng ⇒ ĐỎ
b = boDeHopLe();
b.ca[3].caCaiLoi.boDuKien = [];
r = chay(b);
check('caCaiLoi.boDuKien rỗng ⇒ ĐỎ', r.code === 1 && /boDuKien/.test(r.out), r.out);

// 8. < 50 % ca có doiAnhEm ⇒ ĐỎ
b = boDeHopLe();
b.ca[0].caCaiLoi.doiAnhEm = null;
b.ca[1].caCaiLoi.doiAnhEm = null;
r = chay(b);
check('< 50 % ca có doiAnhEm ⇒ ĐỎ', r.code === 1 && /doiAnhEm/.test(r.out) && /50/.test(r.out), r.out);

// 9. doiAnhEm sang dòng cùng mức MFN ⇒ ĐỎ (83014090 cùng 25 % với 83014020)
b = boDeHopLe();
b.ca[0].caCaiLoi.doiAnhEm = { tu: 'Khóa cửa tay gạt', sang: 'Khóa tủ', maTroToi: '83014090' };
r = chay(b);
check('doiAnhEm sang dòng cùng mức MFN ⇒ ĐỎ', r.code === 1 && /MFN/.test(r.out), r.out);

// 10. doiAnhEm sang dòng khác phân nhóm ⇒ ĐỎ
b = boDeHopLe();
b.ca[2].caCaiLoi.doiAnhEm = { tu: 'máy đào bánh xích', sang: 'tàu', maTroToi: '84834020' };
r = chay(b);
check('(đối chứng) doiAnhEm cùng phân nhóm, khác MFN ⇒ không lỗi doiAnhEm', !/doiAnhEm/.test(r.out) || r.code === 0, r.out);
b.ca[2].caCaiLoi.doiAnhEm = { tu: 'máy đào bánh xích', sang: 'xe', maTroToi: '83014010' };
r = chay(b);
check('doiAnhEm sang dòng khác phân nhóm ⇒ ĐỎ', r.code === 1 && /phân nhóm/.test(r.out), r.out);

// 11. ca thiếu lat / pn6 sai ⇒ ĐỎ
b = boDeHopLe();
b.ca[0].pn6 = '830141';
r = chay(b);
check('pn6 không khớp 6 số đầu maHs ⇒ ĐỎ', r.code === 1 && /pn6/.test(r.out), r.out);

// 12. Nhãn nguồn của tệp bộ đề lát 1
const { nhanCuaTep } = require('../lib/nguon-loai.js');
check('lib/nguon-loai.js khai bench/ho-so-lat-1.json = CLAUDE_DUYET', nhanCuaTep('data/bench/ho-so-lat-1.json') === 'CLAUDE_DUYET', nhanCuaTep('data/bench/ho-so-lat-1.json'));

// 13. Bộ đề #543 (mặc định) vẫn XANH — luật lát 1 không áp
const r0 = spawnSync(process.execPath, [CHECK], { encoding: 'utf8', cwd: ROOT });
check('bộ đề #543 mặc định vẫn XANH', r0.status === 0, `${r0.stdout}\n${r0.stderr}`);

// tránh cảnh báo biến không dùng
void TIEU_DE;
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
