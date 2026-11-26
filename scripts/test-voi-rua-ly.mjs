#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * OZV-2372 — [Thực địa · 8 số] Vòi phun rửa ly (áp lực nước / gắn chậu, inox):
 * 7 lượt/24h (4 lượt «vòi phun rửa ly bằng áp lực nước…» + 3 lượt «vòi phun rửa ly gắn chậu rửa, inox 304»)
 * phần lớn dừng ở 6 số.
 *
 * Kiểm chứng cơ chế (ADR-0004, L2, L3):
 *  1. Căn cứ sổ tay 8424 & 8481 qua cổng verifySoTay / quoteInSource và kiemCauHoiMucDich.
 *  2. Bước 0 (4 số): khi 8424 và 8481 cùng là ứng viên cho cả 2 câu khách thực địa,
 *     cauPhanBietNhom sinh câu phân biệt 84.24 ↔ 84.81 có canCu + nguon + trich nguyên văn.
 *  3. Cổng loại trừ sổ tay (soTayGates + tinHieuTraiNhom): khi vòng 1 nghiêng về 8481/848180
 *     vì chữ «vòi… gắn chậu rửa, inox 304», sổ tay 8481 bắt cụm «vòi phun» trỏ sang 8424.
 *  4. Bước 6→8 số trong 8424.89: chưa nêu điện → dừng hỏi đúng fact hoatDongBangDien
 *     (canCu ranh-gioi-pn6, nguon tax.84248950); trả lời không dùng điện → chốt 84248990;
 *     trả lời hoạt động bằng điện → chốt 84248950.
 *  5. Ca ngược (L3): vòi nước lavabo, van bi đường ống, súng phun nông nghiệp không kích nhầm.
 * Không gọi mạng, không gọi LLM.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const S = require(join(ROOT, 'lib', 'so-tay.js'));
const G = require(join(ROOT, 'lib', 'so-tay-gates.js'));
const H = require(join(ROOT, 'lib', 'hoi-theo-so-tay.js'));
const CS = require(join(ROOT, 'lib', 'chot-som-co-kiem.js'));
const { kiemCauHoiMucDich } = require(join(ROOT, 'lib', 'do-thi', 'tieu-chi-6.js'));

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${name}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 500));
  }
}

const CAU_THUC_DIA = [
  'vòi phun rửa ly bằng áp lực nước',
  'vòi phun rửa ly bằng áp lực nước, điều khiển bằng tay',
  'vòi phun rửa ly gắn chậu rửa, inox 304',
  'vòi phun rửa ly gắn chậu rửa , chất liệu inox 304',
];

console.log('1. Sổ tay 8424 & 8481 qua cổng quoteInSource / verifySoTay và kiemCauHoiMucDich');
for (const h4 of ['8424', '8481']) {
  const st = G.loadSoTay(h4);
  const v = S.verifySoTay(st, h4);
  check(`sổ tay ${h4} verifySoTay 0 mục bị loại (${v.dat}/${v.tong})`, v.loai.length === 0 && v.dat === v.tong, v.loai);
  check(`sổ tay ${h4} kiemTra.tong/dat khớp verifySoTay`, st.kiemTra?.tong === v.tong && st.kiemTra?.dat === v.dat, { kiemTra: st.kiemTra, tong: v.tong, dat: v.dat });
  const pb8424_8481 = (st.phanBiet || []).filter(
    (x) => (String(x.neuCo).includes('8424') && String(x.neuKhong).includes('8481'))
      || (String(x.neuCo).includes('8481') && String(x.neuKhong).includes('8424')),
  );
  check(`sổ tay ${h4} có mục phanBiet 8424↔8481`, pb8424_8481.length >= 1, pb8424_8481);
  for (const p of pb8424_8481) {
    const kqMd = kiemCauHoiMucDich(p.hoi);
    check(`phanBiet ${h4} không vi phạm CHI_HOI_MUC_DICH`, kqMd.ma === null, kqMd);
  }
}

console.log('2. Bước 0 (4 số): cauPhanBietNhom sinh câu phân biệt 84.24 ↔ 84.81 cho cả 2 câu khách thực địa');
for (const q of CAU_THUC_DIA) {
  const tu8424 = H.cauPhanBietNhom('8424', ['8424', '8481'], q);
  const tu8481 = H.cauPhanBietNhom('8481', ['8481', '8424'], q);
  check(`«${q}» từ 8424 sinh câu PHAN_BIET_NHOM 84.24↔84.81`, tu8424.length >= 1 && tu8424[0].loai === 'PHAN_BIET_NHOM', tu8424);
  check(`«${q}» từ 8481 sinh câu PHAN_BIET_NHOM 84.24↔84.81`, tu8481.length >= 1 && tu8481[0].loai === 'PHAN_BIET_NHOM', tu8481);
  for (const item of [...tu8424, ...tu8481]) {
    check(`«${q.slice(0, 32)}» câu hỏi có canCu=so-tay + nguon + trich`, item.canCu === 'so-tay' && Boolean(item.nguon) && Boolean(item.trich), item);
  }
}

console.log('3. Cổng loại trừ sổ tay (soTayGates + tinHieuTraiNhom) khi vòng 1 nghiêng về 848180');
const prevSoTay = process.env.HS_SO_TAY;
process.env.HS_SO_TAY = 'full';
for (const q of CAU_THUC_DIA) {
  const g8481 = G.soTayGates({ hs: '848180', productText: q, productName: q });
  const ch8424 = (g8481.challenges || []).find((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.target === '8424');
  check(`«${q}» soTayGates(848180) bật SO_TAY_LOAI_TRU → 8424`, Boolean(ch8424 && ch8424.matched === 'vòi phun'), g8481.challenges);
  const th = CS.tinHieuTraiNhom({ hs: '848180', gathered: {}, productText: q, productName: q });
  check(`«${q}» tinHieuTraiNhom(848180) báo so-tay-loai-tru → 8424`, th.some((x) => x.ma === 'so-tay-loai-tru' && x.nhom === '8424'), th);
}
if (prevSoTay === undefined) delete process.env.HS_SO_TAY;
else process.env.HS_SO_TAY = prevSoTay;

console.log('4. Bước 6→8 số (8424.89): hỏi đúng hoatDongBangDien khi thiếu, chốt 84248990 / 84248950 khi đủ dữ kiện');
const prevHoi = process.env.HS_HOI_THEO_SO_TAY;
process.env.HS_HOI_THEO_SO_TAY = 'on';
for (const q of CAU_THUC_DIA) {
  const cdThieu = G.chotDong8({ hs: '842489', productText: q });
  check(
    `«${q}» chưa nêu điện → chotDong8(842489) trả THIEU_SO_LIEU hỏi hoatDongBangDien`,
    cdThieu.ketQua === 'THIEU_SO_LIEU' && (cdThieu.missingFacts || []).some((m) => m.fact === 'hoatDongBangDien'),
    cdThieu,
  );

  const fakeNeedFacts = {
    status: 'NEED_FACTS',
    results: [{ hs: '842489' }],
    dossier: {
      product: { nameVi: q },
      hypotheses: [
        { heading4: '8424', subheading6: '842489' },
        { heading4: '8481', subheading6: '848180' },
      ],
      alternatives: [{ hs: '848180' }],
    },
    nextAction: { type: 'ASK_USER', questions: [{ questionVi: 'Model là gì?' }] },
  };
  const outHoi = H.apDung(fakeNeedFacts, { rawAttrs: { tenHang: q } });
  const qs = outHoi.nextAction?.questions || [];
  check(
    `«${q}» apDung(842489) hỏi cả PHAN_BIET_NHOM (84.24↔84.81) và DONG_8 (hoatDongBangDien)`,
    outHoi.nextAction?.canCuCauHoi === 'so-tay'
      && qs.some((x) => x.loai === 'PHAN_BIET_NHOM' && x.canCu === 'so-tay')
      && qs.some((x) => x.loai === 'DONG_8' && x.khoa === 'hoatDongBangDien' && x.canCu === 'ranh-gioi-pn6'),
    qs,
  );

  const cdKhongDien = G.chotDong8({ hs: '842489', productText: `${q}, không hoạt động bằng điện` });
  check(
    `«${q}» + "không hoạt động bằng điện" → chốt 84248990`,
    cdKhongDien.ketQua === 'CHOT' && cdKhongDien.hs === '84248990',
    cdKhongDien,
  );

  const cdCoDien = G.chotDong8({ hs: '842489', productText: `${q}, hoạt động bằng điện` });
  check(
    `«${q}» + "hoạt động bằng điện" → chốt 84248950`,
    cdCoDien.ketQua === 'CHOT' && cdCoDien.hs === '84248950',
    cdCoDien,
  );
}
if (prevHoi === undefined) delete process.env.HS_HOI_THEO_SO_TAY;
else process.env.HS_HOI_THEO_SO_TAY = prevHoi;

console.log('5. Ca ngược (L3): vòi nước / van bi / súng phun nông nghiệp không kích nhầm');
for (const q of [
  'vòi nước bồn rửa tay bằng đồng',
  'vòi lavabo inox 304 nóng lạnh',
  'van bi đường ống hơi bằng thép không gỉ',
  'súng phun thuốc trừ sâu dùng trong nông nghiệp',
]) {
  const pb1 = H.cauPhanBietNhom('8424', ['8424', '8481'], q);
  const pb2 = H.cauPhanBietNhom('8481', ['8481', '8424'], q);
  check(`ca ngược «${q}» không kích câu phân biệt vòi phun rửa ly`, pb1.length === 0 && pb2.length === 0, [...pb1, ...pb2]);
  const g8481 = G.soTayGates({ hs: '848180', productText: q, productName: q });
  const ch8424 = (g8481.challenges || []).find((c) => c.gate === 'SO_TAY_LOAI_TRU' && c.target === '8424');
  check(`ca ngược «${q}» không bật SO_TAY_LOAI_TRU 8481→8424`, !ch8424, ch8424);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
