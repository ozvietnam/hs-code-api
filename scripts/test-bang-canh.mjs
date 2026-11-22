#!/usr/bin/env node
/**
 * Cổng máy "bảng cạnh" (ADR-0002, docs/ke-hoach-do-thi-tri-thuc-hs.md mục 7): bảng cạnh của đồ thị tri thức HS phải
 * dựng lại được từ tệp gốc, không có cạnh thiếu trích / nguồn, không có cạnh mồ côi.
 *
 * Vì sao: 21/11/2026 — 99,8% tri thức nằm sau bước đoán mã, 76% cạnh loại trừ một chiều; van khí nén 5/2 ra 848180 /
 * 841221 dù kho đủ đáp án. Bảng cạnh là thứ nối các tệp rời; cổng này giữ cho nó không nói dối.
 *
 * ĐỎ khi: dựng lại không ra kết quả giống hệt · có cạnh thiếu trích / nguồn · có cạnh trỏ tới nút không còn trong biểu
 * thuế · số cạnh theo loại lệch data/do-thi/thong-ke.json quá ngưỡng mà không cập nhật · C6 không khớp 1-1 với C5 ·
 * ca khoá van khí nén (dữ liệu thật) không đi được · có đường khách nạp bảng cạnh mà bảng đấu nối chưa khai.
 * Không LLM, không mạng. Dựng bảng 3 lần (1 trong tiến trình + 2 tiến trình con) ≈ 25 giây.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import { GOC, docJson, co, tepMa, baoDong, baoDongBo, boKiem } from './lib-luat.mjs';

process.chdir(GOC);
const require = createRequire(import.meta.url);
const { kiem, xong } = boKiem('test-bang-canh');
const D = require('../lib/do-thi/index.js');
const { tienLeUngHo } = require('../lib/do-thi/tien-le-ung-ho.js');
const b = D.bangCanh();
const canh = b.canh;

// ── 1. Dựng lại ra kết quả giống hệt (hai tiến trình riêng + lần dựng trong tiến trình này) ───────────────────────
const chayBam = () => execFileSync(process.execPath, [path.join(GOC, 'scripts/dung-bang-canh.mjs'), '--bam'], { cwd: GOC, encoding: 'utf8', maxBuffer: 1 << 20 }).trim();
const bam1 = chayBam(); const bam2 = chayBam();
kiem(`dựng lại hai lần ở hai tiến trình ra cùng sha256 (${bam1.slice(0, 12)}…)`, /^[0-9a-f]{64}$/.test(bam1) && bam1 === bam2, `${bam1} ≠ ${bam2}`);
kiem('lần dựng trong tiến trình này cũng ra cùng sha256', b.bam === bam1, `${b.bam} ≠ ${bam1}`);
kiem('cạnh đã sắp theo thứ tự ổn định (loại, từ, tới, id)', canh.every((e, i) => i === 0 || D.LOAI_CANH.indexOf(canh[i - 1].loai) < D.LOAI_CANH.indexOf(e.loai) || (canh[i - 1].loai === e.loai && [canh[i - 1].tu, canh[i - 1].toi, canh[i - 1].id].join('\u0000') < [e.tu, e.toi, e.id].join('\u0000'))));
kiem('không có trường thời gian trong cạnh', !canh.some((e) => Object.keys(e).some((k) => /ngay|luc|thoiGian|generatedAt|updatedAt/i.test(k))));

// ── 2. Khuôn của từng cạnh ─────────────────────────────────────────────────────────────────────────────────────
const chu = (v) => typeof v === 'string' && v.trim().length > 0;
const thieu = canh.filter((e) => !chu(e.trich) || !chu(e.nguon));
kiem(`0 cạnh thiếu trích / nguồn (${canh.length} cạnh)`, thieu.length === 0, thieu.slice(0, 5).map((e) => e.id).join(', '));
const khuonSai = canh.filter((e) => !chu(e.id) || !D.LOAI_CANH.includes(e.loai) || typeof e.sinhTuDong !== 'boolean' || ![1, 2, 3, 4].includes(e.bac));
kiem('mọi cạnh có id, loai hợp lệ, sinhTuDong, bac (thứ bậc 1–4)', khuonSai.length === 0, khuonSai.slice(0, 5).map((e) => e.id).join(', '));
kiem('id cạnh không trùng', new Set(canh.map((e) => e.id)).size === canh.length);
const moCoi = canh.filter((e) => !D.coNut(e.tu) || !D.coNut(e.toi));
kiem('0 cạnh mồ côi (hai đầu đều là nhóm / phân nhóm / dòng còn trong biểu thuế)', moCoi.length === 0, moCoi.slice(0, 5).map((e) => `${e.id}`).join(', '));
kiem('không cạnh nào tự trỏ vào chính nó', !canh.some((e) => e.tu === e.toi));
const bacSai = canh.filter((e) => (['C5', 'C6', 'C7', 'C9', 'C11', 'LOAI_TRU'].includes(e.loai) && e.bac !== 1) || (e.loai === 'C8' && e.bac === 1) || (e.loai === 'WCO' && e.bac !== (e.headingSuspect ? 2 : 1)));
kiem('thứ bậc: C5/C6/C7/C9/C11/LOAI_TRU bậc 1; WCO sạch bậc 1 & nghi ngờ OCR bậc 2; C8 không bao giờ bậc 1', bacSai.length === 0, bacSai.slice(0, 3).map((e) => e.id).join(', '));
const c8ChuaDuyet = canh.filter((e) => e.loai === 'C8' && e.nguonKho === 'confusion-pairs' && e.daDuyet !== true && e.bac !== 4);
kiem('C8 từ từ điển chưa duyệt mang bậc 4 (chỉ gợi ý), không lẫn vào bậc thông báo phân loại', c8ChuaDuyet.length === 0);

// ── 3. C6 khớp 1-1 với C5 ──────────────────────────────────────────────────────────────────────────────────────
const c5 = canh.filter((e) => e.loai === 'C5'); const c6 = canh.filter((e) => e.loai === 'C6');
const c5TheoId = new Map(c5.map((e) => [e.id, e]));
const gocDaDung = new Set();
const c6Sai = c6.filter((e) => {
  const g = c5TheoId.get(e.goc);
  const dung = g && !gocDaDung.has(e.goc) && e.sinhTuDong === true && e.tu === g.toi && e.toi === g.tu && e.trich === g.trich && e.nguon === g.nguon && e.dieuKien === g.dieuKien;
  if (g) gocDaDung.add(e.goc);
  return !dung;
});
kiem(`C6 khớp 1-1 với C5 (${c5.length} ↔ ${c6.length}): đảo chiều, giữ nguyên trích + nguồn + điều kiện của cạnh gốc`, c5.length > 0 && c5.length === c6.length && c6Sai.length === 0 && gocDaDung.size === c5.length, c6Sai.slice(0, 3).map((e) => e.id).join(', '));
kiem('C5 không sinhTuDong; C6, C9, C11, LOAI_TRU và WCO sinhTuDong', c5.every((e) => e.sinhTuDong === false) && ['C6', 'C9', 'C11', 'LOAI_TRU', 'WCO'].every((l) => canh.filter((e) => e.loai === l).every((e) => e.sinhTuDong === true)));
const c6ThieuTuKhoa = c6.filter((e) => !Array.isArray(e.tuKhoaDieuKien));
kiem('mọi cạnh C6 mang tuKhoaDieuKien (rút bằng luật từ dòng loại trừ gốc)', c6ThieuTuKhoa.length === 0 && c6.filter((e) => e.tuKhoaDieuKien.length > 0).length / c6.length > 0.95, `${c6.filter((e) => e.tuKhoaDieuKien.length === 0).length} cạnh rỗng từ khoá`);

// ── 3b. C9 Chú-giải-chi-phối (Phần / Chương → nhóm 4 số) ────────────────────────────────────────────────────────
const cgChuong = docJson('data/chu-giai-chuong.json');
const c9 = canh.filter((e) => e.loai === 'C9');
const c9Sai = c9.filter((e) => {
  const m = String(e.nguon || '').match(/^(phan|ch)(\d{2})\.(phan|chuong)$/);
  if (!m) return true;
  const goc = cgChuong[m[2]] && cgChuong[m[2]][m[3]];
  const maCham = `${e.toi.slice(0, 2)}.${e.toi.slice(2)}`;
  return e.bac !== 1 || e.sinhTuDong !== true || e.toi.length !== 4 || !goc || e.trich.length > 600 || !e.trich.includes(maCham) || !goc.includes(e.trich);
});
kiem(`C9 (${c9.length} cạnh): bậc 1, sinhTuDong, trích ≤ 600 ký tự chứa nguyên mã đích và khớp 100% data/chu-giai-chuong.json`, c9.length > 0 && c9Sai.length === 0, c9Sai.slice(0, 3).map((e) => e.id).join(', '));
kiem('C9 khử trùng theo (tu, toi) — không có cặp (tu, toi) trùng lặp', new Set(c9.map((e) => `${e.tu}>${e.toi}`)).size === c9.length);
const c9PXVI = D.canhTu('P:XVI', 'C9');
const c9Ch84 = D.canhTu('84', 'C9');
const c9Ch39 = D.canhTu('39', 'C9');
const c9Toi8485 = D.canhToi('8485', 'C9');
kiem('C9 tra được: Phần P:XVI (→ 8484/8522), Chương 84 (→ 8485), Chương 39 (→ 3925) và canhToi(8485)',
  c9PXVI.some((e) => e.toi === '8484' && e.nguon === 'phan84.phan')
  && c9PXVI.some((e) => e.toi === '8522' && e.nguon === 'phan84.phan')
  && c9Ch84.some((e) => e.toi === '8485' && e.nguon === 'ch84.chuong')
  && c9Ch39.some((e) => e.toi === '3925' && e.nguon === 'ch39.chuong')
  && c9Toi8485.some((e) => e.tu === '84'),
  JSON.stringify({ pxvi: c9PXVI.length, ch84: c9Ch84.length, ch39: c9Ch39.length, toi8485: c9Toi8485.map((e) => e.tu) }));
kiem('C9 kết hợp duongDi và không vỡ canhTu(848180)',
  Boolean(D.duongDi('84', '8485', 1, { loai: 'C9', quaCay: false })) && D.canhTu('848180').length > 0);
kiem('ca ngược C9: Ch.84 không tự trỏ chính nó; nút giả P:NONEXISTENT / Chương 77 / nhóm hết hiệu lực 8469 không có coNut; Phần VII không nhận nhầm chú giải Phần VI; bỏ số thập phân công thức (48 → 28.22)',
  c9Ch84.every((e) => e.toi !== '84' && e.tu !== e.toi)
  && D.coNut('P:XVI') === true && D.coNut('84') === true && D.coNut('98') === true
  && D.coNut('p:xvi') === false
  && D.coNut('P:NONEXISTENT') === false && D.chuanNut('P:NONEXISTENT') === null && D.canhTu('P:NONEXISTENT', 'C9').length === 0
  && D.coNut('77') === false && D.coNut('99') === false && D.coNut('8469') === false && D.chuanNut('8469') === null
  && D.canhTu('P:VII', 'C9').length === 0
  && !D.canhTu('48', 'C9').some((e) => e.toi === '2822'));

// ── 4. Số cạnh theo loại khớp tệp thống kê đã commit ────────────────────────────────────────────────────────────
const tk = co('data/do-thi/thong-ke.json') ? docJson('data/do-thi/thong-ke.json') : null;
if (kiem('có data/do-thi/thong-ke.json', Boolean(tk && tk.soCanh && tk.nguong), 'chạy: node scripts/dung-bang-canh.mjs --ghi')) {
  for (const l of D.LOAI_CANH) {
    const ghi = tk.soCanh[l]; const that = b.thongKe.soCanh[l];
    const nguong = Math.max(tk.nguong.toiThieu, Math.ceil(tk.nguong.tyLe * ghi));
    kiem(`số cạnh ${l}: thật ${that}, đã ghi ${ghi} (ngưỡng lệch ±${nguong})`, Number.isFinite(ghi) && that > 0 && Math.abs(that - ghi) <= nguong, 'tệp gốc đã đổi nhiều: chạy node scripts/dung-bang-canh.mjs --ghi rồi commit data/do-thi/ cùng PR');
  }
  kiem('thống kê ghi rõ bảng lưu ở RAM và lệnh dựng lại', tk.luuO === 'RAM' && /dung-bang-canh/.test(tk.cachDungLai || ''));
  kiem('thống kê có đếm riêng mã không còn trong biểu thuế', Number.isFinite(tk.maKhongConTrongBieu));
}
kiem('có data/do-thi/xep-hang-luong-hang.json (120 nhóm đầu)', co('data/do-thi/xep-hang-luong-hang.json') && docJson('data/do-thi/xep-hang-luong-hang.json').nhom.length === 120);
const bl = b.thongKe.biLoai;
kiem('cạnh bị loại được đếm theo lý do (không im lặng)', Object.values(bl).every((o) => Object.values(o).every((n) => Number.isInteger(n) && n > 0)));

// ── 5. Ca khoá trên dữ liệu thật: van khí nén 5/2 (84812090), sự việc 21/11/2026 ────────────────────────────────
const d1 = D.duongDi('8412', '8481', 2, { loai: ['C6', 'C7', 'C8'], quaCay: false });
kiem('ca khoá: từ nhóm 8412 đi cạnh C6/C7/C8 tới được 8481 trong ≤ 2 bước', Boolean(d1) && d1.soBuoc <= 2, JSON.stringify(d1));
kiem('ca ngược: chỉ bằng C5 (sổ tay 8412 không nhắc 8481) thì từ 8412 KHÔNG tới được 8481 trong 1 bước — C6 là cạnh mở đường', D.duongDi('8412', '8481', 1, { loai: ['C5'], quaCay: false }) === null);
const c11 = D.canhTu('848180', 'C11').find((e) => e.toi === '848120');
kiem('ca khoá: từ phân nhóm 848180 đi C11 tới được 848120, tiêu đề có "khí nén"', Boolean(c11) && /khí nén/.test(c11.tieuDeToi) && c11.tuKhoaTuTieuDe.includes('nen') && c11.kieuDu === 'PHAN_CON_LAI_CO_TEN', JSON.stringify(c11 || null));
kiem('ca ngược: C11 có chiều — từ 848120 (tên riêng) không có cạnh C11 nào đi ra', D.canhTu('848120', 'C11').length === 0);
const d3 = D.duongDi('841221', '848120', 3);
kiem('ca khoá: từ 841221 có đường về 848120 trong ≤ 3 bước, có ít nhất một cạnh lưu (không chỉ bước cây)', Boolean(d3) && d3.soBuoc <= 3 && d3.buoc.some((s) => s.loai !== 'CAY'), JSON.stringify(d3));
kiem('đường đi chỉ gồm bước nối tiếp nhau', Boolean(d3) && d3.buoc.every((s, i) => i === 0 || d3.buoc[i - 1].toi === s.tu) && d3.buoc[0].tu === '841221');

// ── 6. Hai chế độ đi cạnh ngang + trần ─────────────────────────────────────────────────────────────────────────
const mo1 = D.moRongUngVien(['8412'], 'van điện từ khí nén 5/2, cuộn coil 24VDC');
kiem('moRongUngVien: mô tả "van điện từ khí nén 5/2…" với ứng viên chỉ có 8412 ⇒ kéo được 8481', mo1.some((x) => x.nhom === '8481' && x.loai === 'C6' && chu(x.trich)), JSON.stringify(mo1.map((x) => x.nhom)));
const mo2 = D.moRongUngVien(['8412'], 'xi lanh thuỷ lực tác động kép, hành trình 200 mm');
kiem('ca ngược: mô tả xi lanh thuỷ lực thuần ⇒ KHÔNG kéo 8481', !mo2.some((x) => x.nhom === '8481'), JSON.stringify(mo2.map((x) => x.nhom)));
kiem('moRongUngVien: có trần (toiDa) và không trả nhóm đã là ứng viên', D.moRongUngVien(['8412', '8481'], 'van điện từ khí nén', { toiDa: 2 }).length <= 2 && !D.moRongUngVien(['8412', '8481'], 'van điện từ khí nén').some((x) => ['8412', '8481'].includes(x.nhom)));
kiem('moRongUngVien: mô tả rỗng ⇒ không kéo gì', D.moRongUngVien(['8412'], '').length === 0);
const song = D.canhGiuaNhomConSong(['8412', '8481']);
kiem('canhGiuaNhomConSong: chỉ trả cạnh có CẢ HAI đầu trong danh sách, hai nhóm khác nhau', song.length > 0 && song.every((e) => ['8412', '8481'].includes(e.tu.slice(0, 4)) && ['8412', '8481'].includes(e.toi.slice(0, 4)) && e.tu.slice(0, 4) !== e.toi.slice(0, 4)));
kiem('canhGiuaNhomConSong: một nhóm đơn lẻ ⇒ không có cạnh', D.canhGiuaNhomConSong(['8481']).length === 0);
const dong = [...b.toi.entries()].sort((x, y) => y[1].length - x[1].length)[0];
kiem(`trần: nút bị trỏ nhiều nhất (${dong[0]}, ${dong[1].length} cạnh vào) — canhToi với toiDa 5 trả ≤ 5`, dong[1].length > 5 && D.canhToi(dong[0], null, { toiDa: 5 }).length === 5);
const loc = D.canhToi('8481', null, { chiKhiCaHaiLaUngVien: ['8481', '8412'], toiDa: 1000 });
kiem('chiKhiCaHaiLaUngVien: cạnh vào 8481 chỉ còn cạnh từ nhóm ứng viên (8412)', loc.length > 0 && loc.length < D.canhToi('8481', null, { toiDa: 1000 }).length && loc.every((e) => [e.tu, e.toi].every((n) => n.startsWith('8481') || n.startsWith('8412'))));
const dn = D.nhomDeNham('8412', { toiDa: 5 });
kiem('nhomDeNham(8412): có 8481, có trần', dn.length <= 5 && dn.some((x) => x.nhom === '8481'));
kiem('nhomDeNham với chiKhiCaHaiLaUngVien không trả nhóm ngoài ứng viên', D.nhomDeNham('8412', { chiKhiCaHaiLaUngVien: ['8412', '8481'] }).every((x) => x.nhom === '8481'));

// ── 7. C1 gộp ──────────────────────────────────────────────────────────────────────────────────────────────────
const c1 = b.c1;
const dichSai = c1.cum.flatMap(([, v]) => v.dich).filter((d) => !D.coNut(d.ma) || !chu(d.nguonKho));
kiem(`C1 gộp: ${c1.cum.length} cụm, mọi đích là mã còn trong biểu và ghi nguonKho`, c1.cum.length > 1000 && dichSai.length === 0, JSON.stringify(dichSai.slice(0, 3)));
const xl = D.timCum('Xi lanh KHÍ NÉN');
kiem('C1 gộp: tra "Xi lanh KHÍ NÉN" (khác dấu / hoa thường) ra nhóm 8412', Boolean(xl) && xl.dich.some((d) => d.ma.startsWith('8412')));
kiem('C1 gộp: cụm không có trong kho ⇒ null', D.timCum('cụm chắc chắn không có trong kho zzqq') === null);
kiem('C1 gộp: trùng / mâu thuẫn giữa các kho được đếm, không tự xử', Number.isInteger(c1.thongKe.cumNhieuKho) && Number.isInteger(c1.thongKe.cumMauThuanNhom) && c1.mauThuan.length === c1.thongKe.cumMauThuanNhom);
// Hồi quy #1611 (theo #1602): loại TRAI_NGHIA khỏi C1 + sửa 8 đích sai có căn cứ + thu hẹp "từ điển" 85437030, giữ nguyên danh sách chờ
const dichNhom = (q) => (D.timCum(q)?.dich || []).map((d) => d.ma);
kiem('C1 hồi quy #1611: bỏ toàn bộ 10 mục TRAI_NGHIA khỏi C1 (chốt cài không trỏ 8539; 26K-Plate terminal / đui lưỡi lê = null)',
  c1.thongKe.boQua['ten-khac']?.traiNghia === 10
  && !dichNhom('chốt cài').some((m) => m.startsWith('8539'))
  && dichNhom('chốt cài').some((m) => m.startsWith('8308'))
  && D.timCum('26K-Plate terminal') === null
  && D.timCum('đui lưỡi lê') === null,
  JSON.stringify({ boQua: c1.thongKe.boQua['ten-khac'], chotCai: dichNhom('chốt cài') }));
kiem('C1 hồi quy #1611: 8 cụm có căn cứ pháp lý không còn trỏ đích sai',
  dichNhom('bình thủy').every((m) => m.startsWith('9617')) && dichNhom('bình thủy').length > 0
  && dichNhom('bình thủy tinh').some((m) => m.startsWith('7013'))
  && dichNhom('ray trượt').every((m) => m.startsWith('8302')) && dichNhom('ray trượt').length > 0
  && dichNhom('máy in 3d').every((m) => m.startsWith('8485')) && dichNhom('máy in 3d').length > 0
  && dichNhom('gối đỡ vòng bi').every((m) => m.startsWith('8483')) && dichNhom('gối đỡ vòng bi').length > 0
  && dichNhom('hạt nhựa pvc').every((m) => m.startsWith('3904')) && dichNhom('hạt nhựa pvc').length > 0
  && dichNhom('Copper wire').every((m) => m.startsWith('7408')) && dichNhom('Copper wire').length > 0
  && dichNhom('insulated copper wire').some((m) => m.startsWith('8544'))
  && dichNhom('printed circuit board').every((m) => m.startsWith('8534')) && dichNhom('printed circuit board').length > 0,
  JSON.stringify({ bt: dichNhom('bình thủy'), rt: dichNhom('ray trượt'), in3d: dichNhom('máy in 3d'), gd: dichNhom('gối đỡ vòng bi'), pvc: dichNhom('hạt nhựa pvc'), cw: dichNhom('Copper wire'), pcb: dichNhom('printed circuit board') }));
kiem('C1 hồi quy #1611: ten-khac-8543 thu hẹp "từ điển" sang "chức năng từ điển" / "máy từ điển" (85437030), tách khỏi 85439030 và "tụ điện"/"tủ điện"',
  dichNhom('chức năng từ điển').includes('85437030')
  && dichNhom('máy từ điển').includes('85437030')
  && !dichNhom('từ điển').some((m) => m.startsWith('8543'))
  && dichNhom('từ điển').some((m) => m.startsWith('8532'))
  && dichNhom('từ điển').some((m) => m.startsWith('8537')));
kiem('C1 hồi quy #1611: c1.mauThuan chỉ còn đúng 8 cụm danh sách chờ (mơ hồ thật + #4 thanh truot chưa đủ căn cứ)',
  JSON.stringify(c1.mauThuan.map((m) => m.khoa).sort()) === JSON.stringify(['dep quai ngang', 'giay', 'guong soi', 'man hinh hmi', 'quan jean nu', 'robot cong nghiep', 'tham trai san', 'thanh truot']),
  JSON.stringify(c1.mauThuan.map((m) => m.khoa)));

// ── 8. C14: hàm tất định, không cạnh tĩnh ──────────────────────────────────────────────────────────────────────
const t1 = await tienLeUngHo('van điện từ khí nén 5/2', '84812090');
kiem('tienLeUngHo: trả đủ khuôn {soTienLe, cungMa, nhomKhac[], biPhanDoi[]} và số khớp nhau', t1.trangThai === 'DA_KIEM' && Number.isInteger(t1.soTienLe) && Number.isInteger(t1.cungMa) && Array.isArray(t1.nhomKhac) && Array.isArray(t1.biPhanDoi) && t1.cungNhom + t1.nhomKhac.reduce((s, x) => s + x.soTienLe, 0) === t1.soTienLe, JSON.stringify(t1));
const t2 = await tienLeUngHo('van điện từ khí nén 5/2', '84122100');
kiem('tienLeUngHo: van khí nén chốt về 8412 ⇒ không ủng hộ; thông báo phân loại ra 8481 là phản đối bậc 2', t2.ungHo !== true && t2.cungNhom === 0 && t2.biPhanDoi.some((x) => x.bac === 2 && x.nhom === '8481'), JSON.stringify(t2));
const t3 = await tienLeUngHo('', '8481');
const t4 = await tienLeUngHo('van điện từ khí nén', '99999999');
kiem('tienLeUngHo: thiếu mô tả / mã không còn trong biểu ⇒ CHUA_KIEM (khác "đã kiểm, không có" — L6)', t3.trangThai === 'CHUA_KIEM' && t4.trangThai === 'CHUA_KIEM' && t4.lyDo === 'ma-khong-con-trong-bieu');

// ── 9. Giai đoạn 1: CHƯA đường nào đọc bảng cạnh; bảng đấu nối nói đúng như vậy ─────────────────────────────────
const dauNoi = docJson('data/luat/dau-noi.json');
const kho = dauNoi.kho.bangCanh;
if (kiem('bảng đấu nối có mục kho "bangCanh"', Boolean(kho && Array.isArray(kho.moDun)))) {
  const moDunDoThi = tepMa('lib/do-thi');
  kiem('kho.bangCanh.moDun khai đủ mọi tệp trong lib/do-thi/', moDunDoThi.every((m) => kho.moDun.includes(m)) && kho.moDun.every((m) => co(m)), moDunDoThi.filter((m) => !kho.moDun.includes(m)).join(', '));
  // "Nạp mượn hàm" (cùng cơ chế test-dau-noi: napMuonHam + kho.bangCanh.hamKhongDocKho): tệp chỉ lấy hàm thuần (rút / khớp từ
  // khoá) thì không tính là nạp bảng cạnh; test-dau-noi kiểm tệp đó chỉ lấy đúng các hàm đã khai.
  const muonHam = new Set(dauNoi.duong.map((d) => d.doc && d.doc.bangCanh && d.doc.bangCanh.napMuonHam && d.doc.bangCanh.napMuonHam.tep).filter(Boolean));
  const napNgoai = [...tepMa('lib'), ...tepMa('api'), 'server.js'].filter((t) => !t.startsWith('lib/do-thi/') && [...baoDongBo(t, (tu, den) => muonHam.has(tu) && den.startsWith('lib/do-thi/'))].some((x) => x.startsWith('lib/do-thi/')));
  const khaiCo = dauNoi.duong.filter((d) => d.doc && d.doc.bangCanh && d.doc.bangCanh.trangThai === 'co').map((d) => d.tep);
  kiem('tệp ngoài lib/do-thi/ nạp bảng cạnh ⇔ đường của nó khai "co" trong bảng đấu nối (giai đoạn 1: không tệp nào)', napNgoai.filter((t) => t.startsWith('api/')).every((t) => khaiCo.includes(t)) && khaiCo.every((t) => napNgoai.includes(t)), `nạp: ${napNgoai.join(', ') || '(không)'} · khai "co": ${khaiCo.join(', ') || '(không)'}`);
}

xong();
