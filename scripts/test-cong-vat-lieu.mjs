#!/usr/bin/env node
/**
 * scripts/test-cong-vat-lieu.mjs — Tự kiểm 2 chiều cổng vòng 2 SO_TAY_VAT_LIEU (#1650).
 *
 * Kiểm:
 *   1. Cờ HS_CONG_VAT_LIEU mặc định TẮT: tắt thì soTayGates không bật SO_TAY_VAT_LIEU (OFF == main).
 *   2. Bật cờ (HS_CONG_VAT_LIEU=on):
 *      - PHẢI bật cờ:
 *        + "Bu lông nhôm M6" ở 7318 (gợi Chương 76 lấy từ data/chu-giai-chuong.json);
 *        + "Bu lông inox 304" ở 7616 (gợi Chương 72/73 lấy từ data/chu-giai-chuong.json);
 *        + "Ống cao su cứng" ở 4014 / 4016 (kiểm sửa \b tiếng Việt ở "trừ cao su cứng");
 *        + "Dao thép cán nhựa", "Vít thép đóng trong túi nhựa" ở 3926 (lấy vật liệu chính thép, không lấy nhựa cán/túi).
 *      - KHÔNG bật cờ:
 *        + Mô tả không nêu vật liệu + truyền `material: 'nhôm'` (LLM tự suy) ở 7318 ⇒ KHÔNG được bật ([]);
 *        + Vật liệu bộ phận / bao bì / công dụng / oxit: "Dao thép cán nhựa", "Dao cán nhựa",
 *          "Vít thép đóng trong túi nhựa", "Vít đóng trong túi nhựa" ở 7318;
 *          "Nồi inox tay cầm nhựa", "Nồi tay cầm nhựa" ở 7323;
 *          "Băng tải cao su dùng cho máy cắt thép" ở 4010; "Lọc dầu dùng cho máy ép nhựa" ở 7318;
 *          "Gạch lót bằng cao nhôm", "Gạch lót 92% oxit nhôm" ở 6907;
 *          "Vòng đệm bằng cao su silicone" ở 3926; "Phụ kiện cách điện bằng nhựa" ở 8547;
 *        + Đúng vật liệu ("Vỏ điện thoại bằng nhựa" ở 3926; "Bu lông nhôm M6" ở 7616; "Bu lông inox 304" ở 7318);
 *        + Ca phản chứng chữ bẫy ("đồng hồ", "đồng bộ", "mạ kẽm").
 *   3. Kiểm định trên data/precedents.json (toàn bộ 4.908 TB-TCHQ) & data/bo-chuan/4so-v1/v2.jsonl:
 *      - 0 bật oan trên mã đúng ở toàn bộ precedents.json (cả mô tả+technicalSpec lẫn mô tả chuẩn sau " — ");
 *      - Ca 135 bộ v2 ("Bu lông / nhôm / None") bật ở 73181510, sạch ở 7616; 0 ca kim loại bị cờ sai.
 *   4. Tích hợp với lib/engine-loop.js (LLM giả).
 */
import './test-isolate-data.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { soTayGates, loadSoTay } = require('../lib/so-tay-gates.js');
const CVL = require('../lib/cong-vat-lieu.js');

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  }
}

const origFlag = process.env.HS_CONG_VAT_LIEU;
const hasGate = (res) => (res?.challenges || []).filter((c) => c.gate === 'SO_TAY_VAT_LIEU');

try {
  // 1. Cờ mặc định TẮT → không bật SO_TAY_VAT_LIEU
  delete process.env.HS_CONG_VAT_LIEU;
  check('HS_CONG_VAT_LIEU mặc định tắt (bat() === false)', CVL.bat() === false);
  const off7318 = soTayGates({ hs: '73181510', productText: 'Bu lông nhôm M6' });
  check('cờ TẮT: "Bu lông nhôm M6" ở 7318 không bật SO_TAY_VAT_LIEU (giữ nguyên hành vi main)',
    hasGate(off7318).length === 0, off7318.challenges);

  // 2. Bật cờ (HS_CONG_VAT_LIEU=on)
  process.env.HS_CONG_VAT_LIEU = 'on';
  check('HS_CONG_VAT_LIEU=on → bat() === true', CVL.bat() === true);

  // 2a. Gợi ý chương lấy từ data/chu-giai-chuong.json (không viết tay)
  const cg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/chu-giai-chuong.json'), 'utf8'));
  const ch76Title = String(cg['76']?.chuong || '').split('\n')[0].replace(/^Chương\s*76\s*[:.\-–]\s*/i, '').trim();
  const cAl7318 = hasGate(soTayGates({ hs: '73181510', productText: 'Bu lông nhôm M6' }));
  check('bật cờ: "Bu lông nhôm M6" ở 7318 → SO_TAY_VAT_LIEU, legal ch73.chuong, gợi Chương 76 từ chu-giai-chuong.json',
    cAl7318.length === 1
      && cAl7318[0].legal?.[0]?.nguon === 'ch73.chuong'
      && /Nhóm 73\.18 chỉ gồm hàng bằng/.test(cAl7318[0].reasonVi)
      && /nhôm/i.test(cAl7318[0].reasonVi)
      && cAl7318[0].questionVi.includes(`Chương 76 (${ch76Title.slice(0, 40)}`),
    cAl7318);

  const cInox7616 = hasGate(soTayGates({ hs: '76161020', productText: 'Bu lông inox 304' }));
  check('bật cờ: "Bu lông inox 304" ở 7616 → SO_TAY_VAT_LIEU, legal nhom7616.nhom, gợi Chương 72/73',
    cInox7616.length === 1
      && cInox7616[0].legal?.[0]?.nguon === 'nhom7616.nhom'
      && /Nhóm 76\.16 chỉ gồm hàng bằng/.test(cInox7616[0].reasonVi)
      && /thép không gỉ|inox/i.test(cInox7616[0].reasonVi)
      && /Chương 72|Chương 73/.test(cInox7616[0].questionVi),
    cInox7616);

  // Sửa \b tiếng Việt ở layDieuKienVatLieu ("trừ cao su cứng") cho 4014/4016
  const r4016 = (loadSoTay('4016')?.dieuKienVao || []).map(CVL.layDieuKienVatLieu).filter(Boolean);
  const cHardRubber4016 = hasGate(soTayGates({ hs: '40169999', productText: 'Gioăng cao su cứng' }));
  const cHardRubber4014 = hasGate(soTayGates({ hs: '40149090', productText: 'Ống cao su cứng' }));
  check('Unicode boundary: sổ 4016 không nhận CAO_SU_CUNG và bật cờ cho "cao su cứng" ở 4014/4016',
    r4016.length > 0 && !r4016[0].mats.has('CAO_SU_CUNG') && cHardRubber4016.length === 1 && cHardRubber4014.length === 1,
    { r4016: r4016.map((x) => [...x.mats]), cHardRubber4016, cHardRubber4014 });

  // 2b. Test âm cho trường `material` từ LLM (QT điểm 3): cổng KHÔNG được bật chỉ vì `material`
  const cOnlyMaterial = hasGate(soTayGates({ hs: '73181510', productText: 'Bu lông M6', material: 'nhôm' }));
  const matsOnlyMaterial = CVL.docVatLieuHang({ productText: 'Bu lông M6', material: 'nhôm' });
  check('không bật chỉ vì material (LLM tự suy): "Bu lông M6" + material="nhôm" ở 7318 → []',
    cOnlyMaterial.length === 0 && matsOnlyMaterial.length === 0,
    { cOnlyMaterial, matsOnlyMaterial });

  // 2c. Bộ phận, bao bì, công dụng, mạ/oxit KHÔNG bật oan + giữ tên chính
  const cDao7318 = hasGate(soTayGates({ hs: '73181510', productText: 'Dao thép cán nhựa' }));
  const cDao3926 = hasGate(soTayGates({ hs: '39269099', productText: 'Dao thép cán nhựa' }));
  const cDaoNoSteel = hasGate(soTayGates({ hs: '73181510', productText: 'Dao cán nhựa' }));
  const cVitTui7318 = hasGate(soTayGates({ hs: '73181510', productText: 'Vít thép đóng trong túi nhựa' }));
  const cVitTui3926 = hasGate(soTayGates({ hs: '39269099', productText: 'Vít thép đóng trong túi nhựa' }));
  const cVitTuiNoMat = hasGate(soTayGates({ hs: '73181510', productText: 'Vít đóng trong túi nhựa' }));
  check('bộ phận & bao bì: "Dao thép cán nhựa", "Vít thép đóng trong túi nhựa" sạch ở 7318, bắt đúng ở 3926; không vật liệu chính → []',
    cDao7318.length === 0 && cDao3926.length === 1 && cDaoNoSteel.length === 0
      && cVitTui7318.length === 0 && cVitTui3926.length === 1 && cVitTuiNoMat.length === 0,
    { cDao7318, cDao3926, cDaoNoSteel, cVitTui7318, cVitTui3926, cVitTuiNoMat });

  const cNoi7323 = hasGate(soTayGates({ hs: '73239310', productText: 'Nồi inox tay cầm nhựa' }));
  const cNoiNoMat = hasGate(soTayGates({ hs: '73239310', productText: 'Nồi tay cầm nhựa' }));
  const cBangTai4010 = hasGate(soTayGates({ hs: '40101900', productText: 'Băng tải cao su dùng cho máy cắt thép' }));
  const cLoc7318 = hasGate(soTayGates({ hs: '73181510', productText: 'Lọc dầu dùng cho máy ép nhựa' }));
  const cGachCaoNhom = hasGate(soTayGates({ hs: '69072110', productText: 'Gạch lót bằng cao nhôm' }));
  const cGachOxit = hasGate(soTayGates({ hs: '69074010', productText: 'Gạch lót 92% oxit nhôm' }));
  const cSilicone3926 = hasGate(soTayGates({ hs: '39269099', productText: 'Vòng đệm bằng cao su silicone' }));
  const cCachDien8547 = hasGate(soTayGates({ hs: '85472000', productText: 'Phụ kiện cách điện bằng nhựa' }));
  const cVo3926 = hasGate(soTayGates({ hs: '39269099', productText: 'Vỏ điện thoại bằng nhựa' }));
  const cVo7326 = hasGate(soTayGates({ hs: '73181510', productText: 'Vỏ ốc bằng nhựa' }));
  check('không bật oan: tay cầm, máy gia công, oxit/cao nhôm, silicone (3926), cách điện (8547); giữ tên đầu "Vỏ ... bằng nhựa"',
    cNoi7323.length === 0 && cNoiNoMat.length === 0 && cBangTai4010.length === 0 && cLoc7318.length === 0
      && cGachCaoNhom.length === 0 && cGachOxit.length === 0 && cSilicone3926.length === 0
      && cCachDien8547.length === 0 && cVo3926.length === 0 && cVo7326.length === 1,
    { cNoi7323, cNoiNoMat, cBangTai4010, cLoc7318, cGachCaoNhom, cGachOxit, cSilicone3926, cCachDien8547, cVo3926, cVo7326 });

  // 2d. Các ca không bật khác & ca phản chứng
  const cSteelGalv7318 = hasGate(soTayGates({ hs: '73181510', productText: 'Bu lông thép mạ kẽm' }));
  const cClock9105 = hasGate(soTayGates({ hs: '91052100', productText: 'Đồng hồ treo tường bằng nhựa' }));
  const cClock3926 = hasGate(soTayGates({ hs: '39269099', productText: 'Đồng hồ treo tường bằng nhựa' }));
  const cNoMat7318 = hasGate(soTayGates({ hs: '73181510', productText: 'Bu lông M6' }));
  const cNoMat7616 = hasGate(soTayGates({ hs: '76161020', productText: 'Ốc vít lục giác M8' }));
  const cAl7616 = hasGate(soTayGates({ hs: '76161020', productText: 'Bu lông nhôm M6' }));
  const cInox7318 = hasGate(soTayGates({ hs: '73181510', productText: 'Bu lông inox 304' }));
  check('không bật: đúng vật liệu hoặc không nêu vật liệu',
    cSteelGalv7318.length === 0 && cClock9105.length === 0 && cClock3926.length === 0
      && cNoMat7318.length === 0 && cNoMat7616.length === 0 && cAl7616.length === 0 && cInox7318.length === 0,
    { cSteelGalv7318, cClock9105, cClock3926, cNoMat7318, cNoMat7616, cAl7616, cInox7318 });

  const cTrapDongHo = hasGate(soTayGates({ hs: '74122090', productText: 'Đồng hồ treo tường' }));
  const cTrapDongBo = hasGate(soTayGates({ hs: '73181510', productText: 'Bộ bu lông đồng bộ' }));
  const cTrapDongBo74 = hasGate(soTayGates({ hs: '74122090', productText: 'Bộ phụ kiện đồng bộ' }));
  const cTrapMaKem = hasGate(soTayGates({ hs: '73181510', productText: 'Bu lông mạ kẽm' }));
  const cTrapMaKem79 = hasGate(soTayGates({ hs: '79070099', productText: 'Bu lông mạ kẽm' }));
  const matsTrap = [
    ...CVL.docVatLieuHang({ productText: 'Đồng hồ treo tường' }),
    ...CVL.docVatLieuHang({ productText: 'Bộ điều khiển đồng bộ' }),
    ...CVL.docVatLieuHang({ productText: 'Bu lông mạ kẽm nhúng nóng' }),
  ];
  check('ca phản chứng ("đồng hồ", "đồng bộ", "mạ kẽm") không đọc ra đồng/kẽm và không bật cờ sai',
    matsTrap.length === 0
      && cTrapDongHo.length === 0 && cTrapDongBo.length === 0
      && cTrapDongBo74.length === 0 && cTrapMaKem.length === 0 && cTrapMaKem79.length === 0,
    { matsTrap, cTrapDongHo, cTrapDongBo, cTrapDongBo74, cTrapMaKem, cTrapMaKem79 });

  // 3. Đo báo oan trên toàn bộ data/precedents.json (4.908 TB-TCHQ) & bộ chuẩn 4so-v1/v2
  const precRaw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/precedents.json'), 'utf8'));
  let precTotal = 0;
  const fpFull = [];
  const fpPostDash = [];
  for (const [hs, list] of Object.entries(precRaw)) {
    if (!Array.isArray(list)) continue;
    const h4 = String(hs).replace(/\D/g, '').slice(0, 4);
    const st = loadSoTay(h4);
    for (const it of list) {
      precTotal += 1;
      if (!st) continue;
      const pn = it.productName || '';
      const fullText = [pn, it.technicalSpec].filter(Boolean).join('\n');
      const gFull = CVL.kiemCongVatLieu({ h4, soTay: st, productText: fullText, productName: pn });
      if (gFull.length) fpFull.push({ h4, hs, tb: it.tbTchqNumber, reason: gFull[0].reasonVi });
      const postDash = pn.includes(' — ') ? pn.split(' — ').slice(1).join(' — ') : pn;
      const gPost = CVL.kiemCongVatLieu({ h4, soTay: st, productText: postDash, productName: postDash });
      if (gPost.length) fpPostDash.push({ h4, hs, tb: it.tbTchqNumber, reason: gPost[0].reasonVi });
    }
  }
  check(`precedents.json (${precTotal} TB-TCHQ): 0 bật oan trên mã đúng (cả full text và mô tả chuẩn sau " — ")`,
    precTotal >= 4900 && fpFull.length === 0 && fpPostDash.length === 0,
    { precTotal, fpFull, fpPostDash });

  const loadJsonl = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').trim().split('\n').map(JSON.parse);
  const v1 = loadJsonl('data/bo-chuan/4so-v1.jsonl');
  const v2 = loadJsonl('data/bo-chuan/4so-v2.jsonl');
  const ca135 = v2.find((x) => x.ca === 135);
  const ca135ToKhai = hasGate(soTayGates({ hs: ca135.maToKhai, productText: ca135.moTa }));
  const ca135Truth = hasGate(soTayGates({ hs: `${ca135.nhom[0]}1020`, productText: ca135.moTa }));
  check('bộ chuẩn 4so-v2 ca 135 ("Bu lông / nhôm / None"): bật cờ trên maToKhai 73181510, sạch trên nhóm đúng 7616',
    ca135ToKhai.length === 1 && ca135Truth.length === 0, { ca135ToKhai, ca135Truth });

  const metalFalseTruth = [];
  for (const row of [...v1, ...v2]) {
    for (const h4 of row.nhom || []) {
      if (!/^(7[2-9]|8[0-3])/.test(h4)) continue;
      const g = hasGate(soTayGates({ hs: `${h4}0000`, productText: row.moTa }));
      if (g.length) metalFalseTruth.push({ ca: row.ca, h4, moTa: row.moTa, reason: g[0].reasonVi });
    }
  }
  check('bộ chuẩn 4so-v1 + 4so-v2: 0 ca kim loại (Ch.72–83) bị cờ sai trên nhóm đúng',
    metalFalseTruth.length === 0, metalFalseTruth);

  // 4. Tích hợp với engine-loop.js (LLM giả)
  const prevEngine = process.env.HS_CLASSIFY_ENGINE;
  const prevMic = process.env.MIC_OFF;
  const prevHoldout = process.env.HS_EVAL_EXCLUDE_HOLDOUT;
  const prevSoTay = process.env.HS_SO_TAY;
  process.env.HS_CLASSIFY_ENGINE = 'loop';
  process.env.MIC_OFF = '1';
  process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';

  const llmTier = require('../lib/llm-tier');
  const origCall = llmTier.callLLMJson;
  let calls = [];
  let script = [];
  llmTier.callLLMJson = async (system, user) => {
    calls.push({ round: system.startsWith('VÒNG 1') ? 1 : 2, user });
    const next = script.shift();
    return { json: typeof next === 'function' ? next(user) : next, provider: 'stub', model: 'stub' };
  };
  const { classify } = require('../lib/classify');

  const BULONG_NHOM = { tenHang: 'Bu lông nhôm M6', specs: 'kích thước M6x20, vật liệu nhôm' };
  const R1_BL = {
    product: { nameVi: 'Bu lông M6', nameEn: 'Aluminium bolt M6', purpose: 'lắp ghép', mechanism: 'cơ-tay', material: 'nhôm', form: 'hoàn chỉnh', evidence: {} },
    hypotheses: [
      { chapter: '73', heading4: '7318', subheading6: '731815', why: 'bu lông ren', confidence: 70 },
      { chapter: '76', heading4: '7616', subheading6: '761610', why: 'sản phẩm bằng nhôm', confidence: 60 },
    ],
    verify: { searchVi: ['bu lông nhôm'], codes8: ['73181510', '76161020'], micQuery: null, unknowns: [] },
  };
  const CHOT_7318 = {
    decision: 'CHOT', hs: '73181510', confidence: 75, reason: 'bu lông ren M6',
    basis: [{ stream: 'SAN_PHAM', claim: 'bu lông M6', evidence: 'kích thước M6x20' }],
    conditions: [], alternatives: [], questions: [],
  };

  process.env.HS_SO_TAY = 'gates';
  delete process.env.HS_CONG_VAT_LIEU;
  calls = [];
  script = [R1_BL, CHOT_7318];
  const rOff = await classify(BULONG_NHOM, {});
  check('engine-loop khi HS_CONG_VAT_LIEU tắt: giữ nguyên 73181510 với 2 lượt AI, không có SO_TAY_VAT_LIEU',
    calls.length === 2 && rOff.results?.[0]?.hs === '73181510' && !(rOff.soTay?.challenges || []).some((c) => c.gate === 'SO_TAY_VAT_LIEU'),
    { calls: calls.length, hs: rOff.results?.[0]?.hs, challenges: rOff.soTay?.challenges });

  process.env.HS_CONG_VAT_LIEU = 'on';
  calls = [];
  script = [
    R1_BL,
    CHOT_7318,
    (user) => (/SO_TAY_VAT_LIEU/.test(user)
      ? { decision: 'CHOT', hs: '76161020', confidence: 88, reason: 'bu lông bằng nhôm → 7616.10.20', basis: [{ stream: 'SAN_PHAM', claim: 'vật liệu nhôm', evidence: 'vật liệu nhôm' }], conditions: [], alternatives: [], questions: [] }
      : CHOT_7318),
  ];
  const rOn = await classify(BULONG_NHOM, {});
  check('engine-loop khi HS_CONG_VAT_LIEU=on: bật SO_TAY_VAT_LIEU, gửi lượt giải trình, AI đổi sang 76161020 (CHANGED)',
    calls.length === 3 && rOn.results?.[0]?.hs === '76161020' && rOn.soTay?.outcome === 'CHANGED' && (rOn.soTay?.challenges || []).some((c) => c.gate === 'SO_TAY_VAT_LIEU'),
    { calls: calls.length, hs: rOn.results?.[0]?.hs, soTay: rOn.soTay });

  llmTier.callLLMJson = origCall;
  if (prevEngine === undefined) delete process.env.HS_CLASSIFY_ENGINE; else process.env.HS_CLASSIFY_ENGINE = prevEngine;
  if (prevMic === undefined) delete process.env.MIC_OFF; else process.env.MIC_OFF = prevMic;
  if (prevHoldout === undefined) delete process.env.HS_EVAL_EXCLUDE_HOLDOUT; else process.env.HS_EVAL_EXCLUDE_HOLDOUT = prevHoldout;
  if (prevSoTay === undefined) delete process.env.HS_SO_TAY; else process.env.HS_SO_TAY = prevSoTay;
} finally {
  if (origFlag === undefined) delete process.env.HS_CONG_VAT_LIEU;
  else process.env.HS_CONG_VAT_LIEU = origFlag;
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
