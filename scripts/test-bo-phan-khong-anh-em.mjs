#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-682 — máy kiểm sổ tay nhận vế `laBoPhan KHONG` lấy căn cứ từ ANH EM "Bộ phận" trong cây biểu.
 *
 * Cổng duyệt ranh giới đã nhận hình này từ 07/11/2026 (#1109, 984932 "Đèn pha gắn kín" cạnh tầng anh em "Bộ phận"):
 * `lib/ho-so/cong-ranh-gioi.js#anhEmBoPhan` bỏ vế đó ra khỏi phần kiểm chữ và chỉ ghi cảnh báo
 * `cong3-khong-bo-phan-tu-anh-em`. Nhưng máy kiểm sổ tay (`lib/so-tay.js#checkItem` → `lib/dieu-kien-so.js`) thì chưa,
 * nên `scripts/so-hoa-ranh-gioi.mjs --ap-dung` TỪ CHỐI đúng những bản ranh giới đã DUYỆT (984932 của chính #1109, và
 * 984926 / 984929 của thẻ này) với `dieu-kien-so-khong-khong-co-trong-trich:laBoPhan`.
 *
 * Luật vẫn chỉ HẸP LẠI: nút không có anh em tên "Bộ phận" thì lỗi như cũ; `chieu` khác undefined thì lỗi như cũ;
 * fact/op khác thì không đụng tới.
 * Không ghi data/, không gọi LLM/mạng.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../lib/so-tay.js');
const DK = require('../lib/dieu-kien-so.js');
const T = require('../lib/hs-tree.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 600)); } };

// ── 1. Tiền đề: cây biểu thật có anh em "Bộ phận" cạnh các nút đang xét ───────────────────────────────────────
const CO_ANH_EM = ['984932~r19684', '984932~r19686', '984926~r19594', '984926~r19602', '984929~r19632', '984929~r19659'];
for (const id of CO_ANH_EM) {
  const cha = T.chaTang(id);
  const anhEm = cha ? T.conTang(cha).filter((x) => x !== id) : [];
  const bp = anhEm.filter((x) => /^(?:các\s+)?bộ\s+phận(?:\s+khác)?(?:\s+của\s+\S.*)?\s*(?:\(SEN\))?\s*:?\s*$/iu.test(String(T.nodeOf(x)?.tenVi || '').normalize('NFC').trim()));
  check(`1 ${id} có anh em "Bộ phận"`, bp.length > 0, { cha, anhEm, bp });
}

// ── 2. Hàm nhận diện ──────────────────────────────────────────────────────────────────────────────────────────
const KHONG_BO_PHAN = { fact: 'laBoPhan', op: 'KHONG' };
check('2a nút có anh em "Bộ phận" ⇒ nhận', S.boPhanKhongTheoAnhEm(KHONG_BO_PHAN, '984932~r19684'));
check('2b chính nút "Bộ phận" (984926~r19605) không có anh em "Bộ phận" ⇒ không nhận',
  S.boPhanKhongTheoAnhEm(KHONG_BO_PHAN, '984926~r19605') === false);
check('2c fact khác ⇒ không nhận', S.boPhanKhongTheoAnhEm({ fact: 'daLapRap', op: 'KHONG' }, '984932~r19684') === false);
check('2d op khác ⇒ không nhận', S.boPhanKhongTheoAnhEm({ fact: 'laBoPhan', op: 'CO' }, '984932~r19684') === false);
check('2e có chieu ⇒ không nhận (chỉ vế trần mới suy từ cấu trúc)',
  S.boPhanKhongTheoAnhEm({ ...KHONG_BO_PHAN, chieu: 'PHAI_KHONG' }, '984932~r19684') === false);
check('2f id rỗng ⇒ không nhận', S.boPhanKhongTheoAnhEm(KHONG_BO_PHAN, '') === false);
check('2g id không có trong cây ⇒ không nhận', S.boPhanKhongTheoAnhEm(KHONG_BO_PHAN, '9999~r0') === false);

// ── 3. Lỗi gốc vẫn là lỗi đó — ta chỉ bỏ qua đúng một mã lỗi ─────────────────────────────────────────────────
const TRICH = '984932~r19684 Đèn pha gắn kín (sealed beam lamp units)';
check('3a kiemDieuKien (tầng dưới) VẪN báo lỗi — không sửa lib/dieu-kien-so.js',
  DK.kiemDieuKien(KHONG_BO_PHAN, TRICH) === 'dieu-kien-so-khong-khong-co-trong-trich:laBoPhan',
  DK.kiemDieuKien(KHONG_BO_PHAN, TRICH));

// ── 4. checkItem: nút thật trong cây ⇒ đạt; nút không có anh em "Bộ phận" ⇒ vẫn lỗi ──────────────────────────
const src = { ...S.sourcesFor('9849'), ...S.nguonTieuDe('9849') };
const muc = (id, trich, dieuKienSo) => ({ id, nguon: `tieuDe.${id}`, trich, dieuKienSo, nguonLoai: 'CLAUDE_DUYET' });
check('4a 984932~r19684 (có anh em "Bộ phận") ⇒ checkItem đạt',
  S.checkItem('dieuKienNut', muc('984932~r19684', TRICH, [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Đèn pha gắn kín' }, KHONG_BO_PHAN]), src, '9849') === null,
  S.checkItem('dieuKienNut', muc('984932~r19684', TRICH, [{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Đèn pha gắn kín' }, KHONG_BO_PHAN]), src, '9849'));

// Nút thật KHÔNG có anh em "Bộ phận": 984920~r19523 ("Dung tích xi lanh trên 1.000 cc") — anh em là các tầng dung tích.
const idKhong = '984920~r19523';
check('4b tiền đề: 984920~r19523 không có anh em "Bộ phận"', S.boPhanKhongTheoAnhEm(KHONG_BO_PHAN, idKhong) === false);
const trichKhong = String((src[`tieuDe.${idKhong}`] ?? '')).trim();
check('4c nút không có anh em "Bộ phận" ⇒ checkItem VẪN báo đúng lỗi cũ',
  S.checkItem('dieuKienNut', muc(idKhong, trichKhong, [KHONG_BO_PHAN]), src, '9849') === 'dieu-kien-so-khong-khong-co-trong-trich:laBoPhan',
  S.checkItem('dieuKienNut', muc(idKhong, trichKhong, [KHONG_BO_PHAN]), src, '9849'));

// ── 5. Ngoại lệ "vật liệu khác" (#577) không bị hỏng ─────────────────────────────────────────────────────────
check('5a vatLieuKhacTheoAnhEm vẫn xuất khẩu và từ chối fact lạ',
  typeof S.vatLieuKhacTheoAnhEm === 'function' && S.vatLieuKhacTheoAnhEm(KHONG_BO_PHAN, '984932~r19684', TRICH, src) === false);

console.log(`\n${fail === 0 ? '=== ALL TESTS PASSED ===' : '=== CÓ LỖI ==='} ${pass} passed | ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
