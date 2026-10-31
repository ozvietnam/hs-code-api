#!/usr/bin/env node
/**
 * Cổng ranh giới 6→8 số với NÚT TẦNG KHÔNG MÃ (lib/hs-tree.js lớp tầng, #577):
 *   - bản nháp gắn được `dieuKienNut` vào id tầng `<pn6>~r<dòng>` (cổng 0, cổng 3 nguồn tieuDe.<id tầng>, --ap-spec, apDung,
 *     máy kiểm sổ tay kiemCay / checkItem);
 *   - `cong1-tang-khong-ma:<hs>:r<dòng>` CHỈ khi bản nháp BỎ QUA một tầng có tên mà cây đã có nút (không khai điều kiện);
 *     tầng "Loại khác:" trần không cần điều kiện (luật đi phủ định anh em) ⇒ không báo;
 *   - tầng không biểu diễn được (KHONG_DAT) ⇒ `cong1-tang-khong-ma-khong-dat:<hs>:r<dòng>` — DỪNG như cũ;
 *   - tầng TRUNG (cùng tập lá với tiêu đề đã có tên) ⇒ không báo.
 * Bản nháp dựng trên khung thật (taoKhung). Không đọc data/bench, data/oz-export; không ghi data/ thật.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const S = require('../lib/so-tay.js');
const ML = require('../lib/ho-so/ma-loi.js');

let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`); } };
const PHIEN = 'https://claude.ai/code/session_TEST#soan-tang';
const SO = (fact, op, value, donVi) => ({ fact, op, value, donVi });
const tang = (r) => r.loi.filter((l) => l.startsWith('cong1-tang-khong-ma'));

// ── 1. Khung + gói soạn có nút tầng ─────────────────────────────────────────────────────────────────────────
{
  const g = C.goiSoan('841459');
  const x = g.canSoHoa.find((m) => m.ma === '841459~r13180');
  check('1a --goi 841459: nút tầng r13180 là TIEU_DE cần số hoá, nguồn tieuDe.841459~r13180 = tên nguyên văn',
    x && x.loai === 'TIEU_DE' && x.ten === 'Công suất không quá 125 kW' && x.nguon[0]?.nguon === 'tieuDe.841459~r13180' && /Công suất không quá 125 kW/.test(x.nguon[0].text), x);
  const y = g.canSoHoa.find((m) => m.ma === '841459~r13187');
  check('1b tầng "Loại khác" r13187: phần còn lại — không cần điều kiện', y && y.khongCanDieuKien === true, y);
  check('1c cha của 8414594 trong gói = nút tầng', g.canSoHoa.find((m) => m.ma === '8414594')?.cha === '841459~r13180');
  check('1d cây in trong gói có id tầng', /\[841459~r13180\] Công suất không quá 125 kW/.test(g.cay), g.cay.slice(0, 300));
  const t = g.tangKhongMa.find((m) => m.r === 13180);
  check('1e tangKhongMa của gói mang trạng thái CO_NUT + id', t && t.trangThai === 'CO_NUT' && t.id === '841459~r13180', g.tangKhongMa);
  const k = C.taoKhung('841459', { phien: PHIEN });
  check('1f khung nháp có dieuKienNut cho tầng có tên r13180, không cho tầng "Loại khác" r13187', k.dieuKienNut.some((m) => m.id === '841459~r13180') && !k.dieuKienNut.some((m) => m.id === '841459~r13187'), k.dieuKienNut.map((m) => m.id));
  check('1g nguonTieuDe(8414) có tieuDe.<id tầng>', S.nguonTieuDe('8414')['tieuDe.841459~r13180'] === '841459~r13180 Công suất không quá 125 kW');
}

// ── 2. cong1-tang-khong-ma chỉ khi bỏ qua tầng ─────────────────────────────────────────────────────────────────
{
  const k = C.taoKhung('841459', { phien: PHIEN });
  const r = C.kiemRanhGioi('841459', k);
  check('2a khung trống: bỏ qua tầng có tên r13180 ⇒ cong1-tang-khong-ma ở mọi dòng dưới tầng', ['84145910', '84145920', '84145930', '84145941', '84145949'].every((h) => r.loi.includes(`cong1-tang-khong-ma:${h}:r13180`)), tang(r));
  check('2b … tầng "Loại khác:" r13187 không cần điều kiện ⇒ không báo', !r.loi.some((l) => l.endsWith(':r13187')), tang(r));
  const k2 = C.taoKhung('841459', { phien: PHIEN });
  const m = k2.dieuKienNut.find((x) => x.id === '841459~r13180') || (k2.dieuKienNut[k2.dieuKienNut.push({ id: '841459~r13180', nguon: 'tieuDe.841459~r13180', trich: 'Công suất không quá 125 kW', nguonLoai: 'AI_DA_KIEM' }) - 1]);
  m.dieuKienSo = [SO('congSuat', '<=', 125, 'kW')];
  const r2 = C.kiemRanhGioi('841459', k2);
  check('2c khai dieuKienNut cho tầng ⇒ hết cong1-tang-khong-ma, không lỗi cổng 0/3 cho mục tầng', tang(r2).length === 0 && !r2.loi.some((l) => l.includes('841459~r13180') && /^cong[03]-/.test(l)), r2.loi.filter((l) => l.includes('~r') || l.startsWith('cong1-tang')));
  check('2d … đường đi của .41 lấy điều kiện tầng (không còn cong1-chua-so-hoa:<dòng>:841459~r13180)', !r2.loi.includes('cong1-chua-so-hoa:84145941:841459~r13180'), r2.loi.filter((l) => l.includes('~r')));
  const r3 = C.kiemRanhGioi('950300', C.taoKhung('950300', { phien: PHIEN }));
  check('2e 950300: r18723 "Bộ phận và phụ kiện" bị bỏ qua ⇒ báo .22/.29; r18732 TRUNG với 9503009 ⇒ không báo',
    r3.loi.includes('cong1-tang-khong-ma:95030022:r18723') && r3.loi.includes('cong1-tang-khong-ma:95030029:r18723') && !r3.loi.some((l) => l.endsWith(':r18732')), tang(r3));
  const r4 = C.kiemRanhGioi('848310', C.taoKhung('848310', { phien: PHIEN }));
  check('2f 848310: tầng duy nhất là "Loại khác:" ⇒ không có cong1-tang-khong-ma', tang(r4).length === 0, tang(r4));
}

// ── 3. Tầng không đặt được vẫn chặn (DỪNG) ───────────────────────────────────────────────────────────────────
{
  // #606: 870340 r16670 nay đặt được (8703401/8703402 là nhóm chữ số không tên, trong suốt) ⇒ ví dụ KHONG_DAT còn lại 981820 r19155.
  const r = C.kiemRanhGioi('981820', C.taoKhung('981820', { phien: PHIEN }));
  check('3a 981820: r19155 trùng tập lá tiêu đề số khác tên ⇒ cong1-tang-khong-ma-khong-dat ở từng dòng dưới tầng', ['98182031', '98182039'].every((h) => r.loi.includes(`cong1-tang-khong-ma-khong-dat:${h}:r19155`)), tang(r).slice(0, 10));
  const r340 = C.kiemRanhGioi('870340', C.taoKhung('870340', { phien: PHIEN }));
  check('3a2 870340: r16670 không còn KHONG_DAT (nhóm chữ số không tên trong suốt) — chỉ còn đòi điều kiện tầng', !r340.loi.some((l) => l.startsWith('cong1-tang-khong-ma-khong-dat')) && r340.loi.includes('cong1-chua-so-hoa:87034018:870340~r16670'), tang(r340).slice(0, 10));
  check('3b … nằm trong dung[] (DỪNG)', (r.dung || []).some((d) => d.startsWith('cong1-tang-khong-ma-khong-dat:')), (r.dung || []).slice(0, 5));
  check('3c ma-loi: -khong-dat là DỪNG; cong1-tang-khong-ma (bỏ qua tầng) sửa được — không DỪNG, chỉ cách khai id tầng',
    ML.giaiThich('cong1-tang-khong-ma-khong-dat:87034018:r16670')?.dung === true && !ML.giaiThich('cong1-tang-khong-ma:84145910:r13180')?.dung && /~r/.test(ML.giaiThich('cong1-tang-khong-ma:84145910:r13180')?.cachSua || ''));
}

// ── 4. Spec, cổng 0, sổ tay ─────────────────────────────────────────────────────────────────────────────────
{
  const spec = { phienBan: 'ranh-gioi-spec@1', pn6: '841459', phien: PHIEN, dieuKienNut: { '841459~r13180': { dieuKienSo: [SO('congSuat', '<=', 125, 'kW')] } } };
  const a = C.apSpec(spec);
  const m = a.banNhap?.dieuKienNut.find((x) => x.id === '841459~r13180');
  check('4a --ap-spec nhận id tầng trong dieuKienNut (trích = tên nguyên văn của tầng)', a.loi.length === 0 && m && m.dieuKienSo.length === 1 && m.nguon === 'tieuDe.841459~r13180', a.loi);
  const a2 = C.apSpec({ ...spec, dieuKienNut: { '841459~r13187': { dieuKienSo: [] } } });
  check('4b spec gắn vào tầng "Loại khác" trần → từ chối (như tiêu đề LK trần)', a2.loi.some((l) => l.includes('841459~r13187')), a2.loi);
  const a3 = C.apSpec({ ...spec, dieuKienNut: { '841459~r99999': { dieuKienSo: [] } } });
  check('4c id tầng không có → từ chối', a3.loi.some((l) => l.includes('841459~r99999')), a3.loi);
  const b = a.banNhap;
  check('4d cổng 0 không báo ngoài phân nhóm cho id tầng', !C.kiemHinhDang('841459', b, C.cayPhanNhom('841459')).some((l) => l.includes('~r')));
  check('4e băm ranh giới phân biệt id tầng (không ép về chữ số)', C.bamRanhGioi(b) !== C.bamRanhGioi({ ...b, dieuKienNut: b.dieuKienNut.map((x) => (x.id === '841459~r13180' ? { ...x, id: '84145913180' } : x)) }));
  const item = { id: '841459~r13180', nguon: 'tieuDe.841459~r13180', trich: 'Công suất không quá 125 kW', nguonLoai: 'CLAUDE_DUYET', dieuKienSo: [SO('congSuat', '<=', 125, 'kW')] };
  check('4f checkItem(dieuKienNut) nhận id tầng', S.checkItem('dieuKienNut', item, { ...S.sourcesFor('8414'), ...S.nguonTieuDe('8414') }, '8414') === null, S.checkItem('dieuKienNut', item, { ...S.sourcesFor('8414'), ...S.nguonTieuDe('8414') }, '8414'));
  const kc = S.kiemCay({ nhom: '8414', dieuKienNut: [item] }, '8414');
  check('4g kiemCay: dieuKienNut id tầng không phải "không có trong cây"', !kc.loi.some((l) => l.startsWith('dieu-kien-nut-khong-co-trong-cay')), kc.loi.slice(0, 5));
  const kc2 = S.kiemCay({ nhom: '8414', dieuKienNut: [{ ...item, id: '841459~r1' }] }, '8414');
  check('4h kiemCay: id tầng không có → đỏ', kc2.loi.includes('dieu-kien-nut-khong-co-trong-cay:841459~r1'), kc2.loi.slice(0, 5));
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
