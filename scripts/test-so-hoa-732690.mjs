#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * 732690 .70 (vòng 5, #701): "Móng ngựa; mấu, gai, đinh móc lắp trên giày để thúc ngựa" — cổng 3 báo
 * cong3-liet-ke-trong-mot-chuoi trên bản cũ (tenLoai gói "mấu, gai, đinh móc …" trong MỘT chuỗi ⇒ đọc thành VÀ).
 * Quyết định GĐ 31/10: ba tên của CÙNG một vật (EN "riding boot spurs") ⇒ mảng tên nguyên văn thay thế nhau + định ngữ chung
 * "lắp trên giày để thúc ngựa" thành điều kiện riêng (dungCho "giày", congDung "thúc ngựa").
 * Spec ĐÔNG CỨNG (scripts/fixtures/ho-so/spec-vong-6/), không đọc bản nháp sống; không ghi data/, không đọc data/bench, data/oz-export.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../lib/ho-so/cong-ranh-gioi.js');
const DK = require('../lib/dieu-kien-so.js');

let pass = 0; let fail = 0;
const check = (n, c, d) => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n}`, d === undefined ? '' : JSON.stringify(d).slice(0, 900)); } };
const spec = (ten) => JSON.parse(fs.readFileSync(`scripts/fixtures/ho-so/spec-vong-6/${ten}.json`, 'utf8'));
const duKien = (o) => Object.entries(o).map(([fact, giaTri]) => ({ fact, giaTri, nguon: 'KHACH', trangThai: 'DA_CO' }));

{
  const a = C.apSpec(spec('732690-truoc'), null, { ngay: '2026-10-31' });
  const r = C.kiemRanhGioi('732690', a.banNhap);
  check('1a bản trước (origin/main e88fdef): cổng 3 báo liệt kê một chuỗi ở .70', !r.hopLe && r.loi.includes('cong3-liet-ke-trong-mot-chuoi:73269070:tenLoai'), r.loi);
}
{
  const s = spec('732690');
  const a = C.apSpec(s, null, { ngay: '2026-10-31' });
  check('2a apSpec không lỗi, không DỪNG', a.loi.length === 0 && a.dung.length === 0 && Boolean(a.banNhap), { loi: a.loi, dung: a.dung });
  const r = C.kiemRanhGioi('732690', a.banNhap);
  check('2b đủ cổng XANH, không DỪNG', r.hopLe === true && r.dung.length === 0, r.loi);
  check('2c không còn cong3-liet-ke-trong-mot-chuoi', !r.loi.some((l) => l.startsWith('cong3-liet-ke')), r.loi);
  const m = a.banNhap.dong8.find((x) => x.hs === '73269070');
  const h = m.dieuKienSo.find((c) => c.op === 'HOAC');
  const ve2 = h?.phuongAn?.[1] || [];
  check('2d .70 = HOAC [[tenLoai "Móng ngựa"], [tenLoai ["mấu","gai","đinh móc"], dungCho "giày", congDung "thúc ngựa"]]',
    m.dieuKienSo.length === 1 && h.phuongAn.length === 2 && JSON.stringify(h.phuongAn[0]) === JSON.stringify([{ fact: 'tenLoai', op: 'TEN_LOAI', value: 'Móng ngựa' }])
    && ve2.some((c) => c.fact === 'tenLoai' && JSON.stringify(c.value) === '["mấu","gai","đinh móc"]')
    && ve2.some((c) => c.fact === 'dungCho' && c.value === 'giày') && ve2.some((c) => c.fact === 'congDung' && c.value === 'thúc ngựa'), m.dieuKienSo);
  check('2e spec theo luật thợ: không phanXu/nguonLoai/trangThai/duyet, không chongLanVanBan, không ghi chú DUNG/DE_TRONG',
    !['nguonLoai', 'trangThai', 'duyet', 'chongLanVanBan', 'chongLanTruc'].some((k) => k in s) && !s.ghiChuSoan.some((g) => ['DUNG', 'DE_TRONG'].includes(g.loai)));
  // Lúc chạy: mỗi tên một mình đủ (mảng = hoặc), định ngữ chung không bị bỏ.
  const soTay = C.soTayTuNhap('732690', a.banNhap);
  const co = (o) => ['73269010', '73269020', '73269030', '73269060', '73269070', '73269091'].filter((hs) => DK.doiChieuDong8(hs, duKien(o), { soTay }).ketQua === 'CO');
  check('3a "gai lắp trên giày để thúc ngựa" ⇒ chỉ .70 (bản cũ: đòi đủ âm tiết "mấu, gai, đinh móc lắp trên giày…" ⇒ THIEU, không CO)', JSON.stringify(co({ tenLoai: 'gai', dungCho: 'giày cưỡi ngựa', congDung: 'thúc ngựa' })) === '["73269070"]', co({ tenLoai: 'gai', dungCho: 'giày cưỡi ngựa', congDung: 'thúc ngựa' }));
  check('3b "đinh móc" lắp trên giày để thúc ngựa ⇒ chỉ .70', JSON.stringify(co({ tenLoai: 'đinh móc thép', dungCho: 'giày', congDung: 'thúc ngựa' })) === '["73269070"]');
  check('3c "Móng ngựa" ⇒ chỉ .70 (vế 1 không cần định ngữ của vế 2)', JSON.stringify(co({ tenLoai: 'Móng ngựa sắt' })) === '["73269070"]');
  check('3d "gai" không dùng thúc ngựa ⇒ không .70 (định ngữ chung không bị bỏ)', !co({ tenLoai: 'gai', dungCho: 'giày', congDung: 'chống trượt' }).includes('73269070'));
}

console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
