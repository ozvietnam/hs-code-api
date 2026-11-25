#!/usr/bin/env node
import './test-isolate-data.mjs';
/**
 * Hồi quy OZV-2250 (tách từ ca thực địa OZV-2247):
 * Khách đã ghi điện áp trong tên hàng / mô tả («bộ điều khiển gr2030-la1, điện áp 220v, công suất»)
 * nhưng vòng 1 rút gọn `product.nameVi` thành «bộ điều khiển» và đẩy «220V» vào `product.keySpecs`,
 * khiến `out.missingStructured` vẫn chứa `voltage` và tầng `lib/hoi-theo-so-tay.js` đẩy nguyên xi câu
 * «Điện áp của hàng là gì? (V, kV)» ra `nextAction.questions`.
 *
 * Kiểm:
 *  1. Ca thực địa «bộ điều khiển gr2030-la1, điện áp 220v, công suất» (dừng ở 853710):
 *     - KHÔNG còn câu hỏi điện áp trong `nextAction.questions` / `missing`.
 *     - Các câu hỏi dữ kiện thực sự còn thiếu của 853710 (PLC/vi điều khiển, chuyên dùng hay dùng chung) vẫn giữ nguyên.
 *  2. Luật tổng quát (không hardcode theo model): mọi cách ghi số + đơn vị điện áp (V, kV, mV, VAC, VDC, volt, vôn,
 *     dải 100-240VAC, cặp 220/380V, tiền tố DC24V/AC220V, số thập phân 0.4kV / 3,7V, hoặc nằm ở `product.keySpecs`)
 *     đều được nhận là đã có điện áp (`daCo('voltage', ...)` / `daCo('dienAp', ...)` / `isPresent('voltage', ...)`).
 *  3. Ca đối chứng (L3):
 *     - Mô tả KHÔNG có điện áp («bộ điều khiển gr2030-la1, công suất 500w») → máy VẪN hỏi điện áp.
 *     - Mô tả chỉ có chữ «điện áp» suông không kèm số («bộ điều khiển điện áp gr2030-la1», «ổn định điện áp») →
 *       KHÔNG nhận nhầm là đã có điện áp, máy VẪN hỏi điện áp.
 *  4. Chống ReDoS (luật 6b): chuỗi ~40.000 từ/số lặp không có đơn vị điện áp chạy xong < 2.000 ms.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const hoiTheoSoTay = require('../lib/hoi-theo-so-tay.js');
const { isPresent } = require('../lib/attributes.js');
const { missingStructured } = require('../lib/declaration-fields.js');

let passed = 0;
let failed = 0;
function check(name, ok, extra = '') {
  if (ok) {
    passed += 1;
    console.log(`  PASS ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${extra ? ` — ${typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 300)}` : ''}`);
  }
}

/** Dựng kết quả động cơ tại 853710 giống hệt hồ sơ thực địa OZV-2247 (vòng 1 rút gọn nameVi = "bộ điều khiển"). */
function dungHoSo853710({ tenHang, keySpecs = [], missingKeys = ['voltage'] }) {
  const truong = {
    voltage: {
      key: 'voltage',
      labelVi: 'Điện áp',
      ecusHint: 'V, kV',
      required: true,
      heading: '8537',
      questionVi: 'Điện áp của hàng là gì? (V, kV)',
    },
  };
  return {
    out: {
      status: 'NEED_FACTS',
      results: [{ hs: '853710', confidence: 0.72, nameVi: 'Loại dùng cho điện áp không quá 1.000 V' }],
      decisions: [{ decision: 'HOI', topHs: '853710', confidence: 0.72 }],
      nextAction: {
        type: 'ASK_USER',
        questions: [
          { attribute: null, questionVi: 'Chức năng chính của bộ điều khiển GR2030-LA1 là gì?' },
          { attribute: null, questionVi: 'Công suất định mức của thiết bị là bao nhiêu?' },
        ],
      },
      missing: [
        'Chức năng chính của bộ điều khiển GR2030-LA1 là gì?',
        'Công suất định mức của thiết bị là bao nhiêu?',
      ],
      missingStructured: missingKeys.map((k) => truong[k]).filter(Boolean),
      dossier: {
        product: {
          nameVi: 'bộ điều khiển',
          keySpecs,
        },
        hypotheses: [
          { heading4: '9032', subheading6: '903289', weight: 0.65 },
          { heading4: '8537', subheading6: '853710', weight: 0.6 },
        ],
        alternatives: [
          { hs: '903289', confidence: 0.65 },
          { hs: '85371099', confidence: 0.75 },
        ],
        conditions: [],
      },
    },
    rawAttrs: { tenHang },
  };
}

const coHoiDienAp = (res) =>
  (res?.nextAction?.questions || []).some(
    (q) => q.khoa === 'voltage' || q.khoa === 'dienAp' || q.khoa === 'dien_ap' || /điện\s*áp\s*của\s*hàng\s*là\s*gì/iu.test(q.questionVi || ''),
  ) || (res?.missing || []).some((m) => /điện\s*áp\s*của\s*hàng\s*là\s*gì/iu.test(String(m || '')));

const prevFlag = process.env.HS_HOI_THEO_SO_TAY;
process.env.HS_HOI_THEO_SO_TAY = 'on';

try {
  // ── 1. Ca thực địa OZV-2250: khách đã ghi "điện áp 220v" trong tên hàng ───────────────────────────────────────────
  console.log('\n── 1. Ca thực địa: «bộ điều khiển gr2030-la1, điện áp 220v, công suất» ──');
  {
    const { out, rawAttrs } = dungHoSo853710({
      tenHang: 'bộ điều khiển gr2030-la1, điện áp 220v, công suất',
      keySpecs: [{ k: 'Điện áp', v: '220V', evidence: 'điện áp 220v' }],
    });
    const res = hoiTheoSoTay.apDung(out, { rawAttrs });
    const qs = res.nextAction.questions || [];
    const dsKhoa = qs.map((q) => q.khoa);
    check(
      'ca thực địa: KHÔNG hỏi lại "Điện áp của hàng là gì? (V, kV)" khi mô tả đã có "điện áp 220v"',
      !coHoiDienAp(res),
      qs.map((q) => ({ khoa: q.khoa, questionVi: q.questionVi })),
    );
    check(
      'ca thực địa: giữ nguyên câu hỏi PLC/vi điều khiển (coBoXuLyLapTrinh) của 853710',
      dsKhoa.includes('coBoXuLyLapTrinh') && qs.some((q) => /bộ xử lý lập trình|PLC/iu.test(q.questionVi)),
      dsKhoa,
    );
    check(
      'ca thực địa: giữ nguyên câu hỏi chuyên dùng hay dùng chung (chiHoacChuYeu) của 853710',
      dsKhoa.includes('chiHoacChuYeu') && qs.some((q) => /chuyên dùng|chỉ dùng hoặc chủ yếu dùng/iu.test(q.questionVi)),
      dsKhoa,
    );
  }

  // ── 2. Luật tổng quát: các cách ghi số + đơn vị điện áp (không phụ thuộc tên model) ───────────────────────────────
  console.log('\n── 2. Luật tổng quát: số + đơn vị điện áp (V, kV, mV, VAC, VDC, volt, vôn, dải, thập phân) ──');
  const CA_CO_DIEN_AP = [
    'Tủ điều khiển động cơ 220V',
    'Bộ nguồn chuyển mạch 24VDC, 5A',
    'Biến tần công nghiệp 3 pha 380 VAC',
    'Thiết bị đóng cắt trung thế 22kV',
    'Tủ phân phối hạ thế 0.4 kV',
    'Cảm biến dòng rò ngưỡng 500mV',
    'Pin sạc dự phòng 3,7V dung lượng 10000mAh',
    'Adapter nguồn đầu vào 100-240VAC, đầu ra 12V',
    'Động cơ điện xoay chiều 220/380V',
    'Rơ le trung gian DC24V',
    'Contactor khởi động từ AC 220V',
    'Máy bơm chìm 220 volt',
    'Quạt thông gió công nghiệp 220 vôn',
    'Bảng điều khiển tự động, điện áp định mức: 110V',
  ];
  for (const moTa of CA_CO_DIEN_AP) {
    check(`daCo("voltage", "${moTa}") === true`, hoiTheoSoTay.daCo('voltage', moTa) === true, moTa);
    check(`daCo("dienAp", "${moTa}") === true`, hoiTheoSoTay.daCo('dienAp', moTa) === true, moTa);
    check(`isPresent("voltage", "${moTa}") === true`, isPresent('voltage', { tenHang: moTa }) === true, moTa);
    const ms = missingStructured('853710', { tenHang: moTa }).map((f) => f.key);
    check(`missingStructured("853710", "${moTa}") không còn đòi voltage`, !ms.includes('voltage'), ms);
  }

  // Trường hợp tên hàng không lặp lại nhưng vòng 1 đã bóc vào `product.keySpecs`
  {
    const { out, rawAttrs } = dungHoSo853710({
      tenHang: 'bộ điều khiển công nghiệp',
      keySpecs: [{ k: 'Điện áp', v: '24VDC' }],
    });
    const res = hoiTheoSoTay.apDung(out, { rawAttrs });
    check(
      'keySpecs vòng 1 đã có {k:"Điện áp", v:"24VDC"} → không hỏi lại điện áp',
      !coHoiDienAp(res),
      res.nextAction.questions,
    );
  }

  // ── 3. Ca đối chứng (L3): không có điện áp hoặc chỉ có chữ "điện áp" suông → VẪN hỏi điện áp ─────────────────────
  console.log('\n── 3. Ca đối chứng: chưa có số + đơn vị điện áp thì máy vẫn phải hỏi điện áp ──');
  const CA_CHUA_CO_DIEN_AP = [
    'bộ điều khiển gr2030-la1, công suất 500w',
    'bộ điều khiển điện áp gr2030-la1, công suất 500w',
    'thiết bị ổn định điện áp dùng trong công nghiệp',
    'tủ điều khiển động cơ model V2-2026, công suất 15kW',
  ];
  for (const moTa of CA_CHUA_CO_DIEN_AP) {
    check(`đối chứng daCo("voltage", "${moTa}") === false`, hoiTheoSoTay.daCo('voltage', moTa) === false, moTa);
    check(`đối chứng isPresent("voltage", "${moTa}") === false`, isPresent('voltage', { tenHang: moTa }) === false, moTa);
    const ms = missingStructured('853710', { tenHang: moTa }).map((f) => f.key);
    check(`đối chứng missingStructured("853710", "${moTa}") vẫn đòi voltage`, ms.includes('voltage'), ms);
    const { out, rawAttrs } = dungHoSo853710({ tenHang: moTa, keySpecs: [] });
    const res = hoiTheoSoTay.apDung(out, { rawAttrs });
    check(
      `đối chứng hoiTheoSoTay.apDung("${moTa}") vẫn hỏi "Điện áp của hàng là gì? (V, kV)"`,
      coHoiDienAp(res),
      res.nextAction.questions.map((q) => q.questionVi),
    );
  }

  // ── 4. Chống ReDoS (luật 6b): chuỗi ~40.000 từ/số lặp không có đơn vị điện áp chạy < 2.000 ms ────────────────────
  console.log('\n── 4. Chống ReDoS trên chuỗi ~40.000 token ──');
  {
    const chuoiDai = Array.from({ length: 10000 }, (_, i) => `dien ap ${i}00.55 - ${i}99.99`).join(' ');
    const t0 = Date.now();
    const kqDaCo = hoiTheoSoTay.daCo('voltage', chuoiDai);
    const kqAttr = isPresent('voltage', { tenHang: chuoiDai });
    const dt = Date.now() - t0;
    check(
      `ReDoS (~40.000 token không đơn vị): chạy xong trong ${dt} ms (< 2000 ms) và không khớp nhầm`,
      dt < 2000 && kqDaCo === false && kqAttr === false,
      { dt, kqDaCo, kqAttr },
    );
  }
} finally {
  if (prevFlag === undefined) delete process.env.HS_HOI_THEO_SO_TAY;
  else process.env.HS_HOI_THEO_SO_TAY = prevFlag;
}

console.log(`\nKết quả: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
