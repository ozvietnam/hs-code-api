// OZV-570 — FAST-FIRST (HS_CLASSIFY_FAST_FIRST, phương án A của OZV-559): vòng 1 thinking-off + cổng tất định quyết
// định bỏ lời GIR vòng 2. AI giả (stub callLLMJson như test-engine-loop.mjs), kiểm 3 nhóm ca tự phá theo thẻ:
//   (a) cờ TẮT ⇒ hành vi y hệt bản trước OZV-570: vòng 1 KHÔNG thinking-off, đủ 2 lời AI, không có engine.fastFirst;
//   (b) cờ BẬT + hồ sơ rõ (nguồn độc lập xác nhận — cổng nguonDocLap có sẵn) ⇒ đường fast-path: chỉ 1 lời AI (vòng 1
//       thinking-off), bỏ vòng 2, có dấu vết đo được (engine.fastFirst.boQuaVong2 + engine.gates log fastFirst:true);
//   (c) cờ BẬT + hồ sơ mơ hồ / cổng chặn ⇒ VẪN leo sâu: vòng 2 gọi thinking-on như cũ;
//   (e) 2 lỗi soát GĐ (trả PR): nguồn độc lập MÂU THUẪN (2 mã khác nhau cùng hs6) ⇒ leo sâu; ứng viên khác hs6 của vòng 1
//       (dù cùng nhóm 4 số) ⇒ bị loại; nhiều tiền lệ CÙNG 1 mã ⇒ vẫn chốt (không chặn nhầm).
import './test-isolate-data.mjs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.HS_CLASSIFY_ENGINE = 'loop';
process.env.MIC_OFF = '1';
process.env.HS_EVAL_EXCLUDE_HOLDOUT = '1';
const llmTier = require('../lib/llm-tier');
let script = []; let calls = [];
llmTier.callLLMJson = async (system, user, opts = {}) => {
  calls.push({ round: system.startsWith('VÒNG 1') ? 1 : 2, user, thinkingOff: opts.minimax?.extraBody?.thinking?.type === 'disabled' });
  const next = script.shift();
  if (next instanceof Error) throw next;
  return { json: typeof next === 'function' ? next(user) : next, provider: 'stub', model: 'stub' };
};
console.error = () => {}; console.warn = () => {};
const ozMod = require('../lib/oz-precedent-search');
const ozGoc = ozMod.searchOzByKeyword;
const { classify } = require('../lib/classify');
const { fastFirstBat, fastFirstUngVien } = require('../lib/engine-loop.js');
let pass = 0; let fail = 0;
const check = (n, c, x = '') => { if (c) { pass += 1; console.log(`PASS ${n}`); } else { fail += 1; console.log(`FAIL ${n} ${x}`); } };
const run = async (attrs, steps) => { script = steps; calls = []; return classify(attrs, {}); };

// Cố định bộ ca (giống test-engine-loop.mjs): dao hái cau → 8201.90.00.
const R1_RO = { product: { nameVi: 'dao hái cau cán dài', nameEn: 'telescopic pole fruit picker knife', nameZh: '摘割槟榔刀伸缩杆', purpose: 'hái quả cau, cắt cành trên cao', mechanism: 'cơ-tay', material: 'hợp kim nhôm', evidence: { purpose: '用于摘取槟榔', mechanism: '', material: '铝合金' } }, hypotheses: [{ chapter: '82', heading4: '8201', subheading6: '820190', why: 'dụng cụ cầm tay nông nghiệp', confidence: 85 }], verify: { searchVi: ['dao hái cau', 'dụng cụ hái quả cán dài'], notesChapters: ['82'], codes8: ['82019000'], micQuery: null, unknowns: [] } };
const CHOT2 = { decision: 'CHOT', hs: '82019000', confidence: 88, reason: 'dụng cụ cầm tay nông nghiệp, cơ-tay', gir: 'GIR 1', basis: [{ stream: 'SAN_PHAM', claim: 'dùng hái cau', evidence: '用于摘取槟榔' }, { stream: 'CHU_GIAI', claim: 'nhóm 8201 gồm dụng cụ cầm tay nông nghiệp', ref: '8201' }], conditions: [], alternatives: [], questions: [] };
const DAO = { tenHang: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', nameZh: '加粗防电摘割槟榔刀伸缩杆加长12米铝合金', specs: '用途: 用于摘取槟榔; 材质: 铝合金' };
// Tiền lệ Oz giả: đúng mã 82019000, khớp 90% (≥ ngưỡng 75 của nguonDocLap).
const ozKhopCao = async () => ({ items: [{ hsCode: '82019000', tenHang: 'Dao hái cau伸缩杆', ozCount: 5, matchCoverage: 90 }] });

// (a) CỜ TẮT (mặc định) ⇒ y hệt bản trước OZV-570.
{
  delete process.env.HS_CLASSIFY_FAST_FIRST;
  check('cờ mặc định: fastFirstBat() = false', fastFirstBat() === false);
  ozMod.searchOzByKeyword = ozKhopCao;
  const r = await run(DAO, [R1_RO, CHOT2]);
  check('(a) TẮT: 2 lời AI, vòng 1 KHÔNG thinking-off', calls.length === 2 && calls[0].round === 1 && calls[0].thinkingOff === false && calls[1].round === 2 && calls[1].thinkingOff === false, JSON.stringify(calls.map((c) => [c.round, c.thinkingOff])));
  check('(a) TẮT: chốt như cũ, không đường nhanh', r.status === 'REVIEW' && r.results[0]?.hs === '82019000' && r.review.needed === false, JSON.stringify([r.status, r.results?.[0]?.hs]));
  check('(a) TẮT: không có engine.fastFirst, log không có fastFirst', r.engine.fastFirst === undefined && !(r.engine.gates || []).some((x) => 'fastFirst' in x), JSON.stringify(r.engine.fastFirst));
  check('(a) TẮT: phases.llmTungVong có 1 phần tử (vòng 2 thật)', Array.isArray(r.engine.phases.llmTungVong) && r.engine.phases.llmTungVong.length === 1, JSON.stringify(r.engine.phases.llmTungVong));
}

// (b) CỜ BẬT + HỒ SƠ RÕ ⇒ fast-path: bỏ lời GIR vòng 2.
{
  process.env.HS_CLASSIFY_FAST_FIRST = 'on';
  check('cờ on: fastFirstBat() = true', fastFirstBat() === true);
  ozMod.searchOzByKeyword = ozKhopCao;
  const r = await run(DAO, [R1_RO]); // script CHỈ có vòng 1 — nếu engine vẫn gọi vòng 2 sẽ chết (script rỗng)
  check('(b) RÕ: đúng 1 lời AI — vòng 1 thinking-off, không có lời vòng 2', calls.length === 1 && calls[0].round === 1 && calls[0].thinkingOff === true, JSON.stringify(calls.map((c) => [c.round, c.thinkingOff])));
  check('(b) RÕ: chốt bằng kết quả vòng 1 + nguồn độc lập, REVIEW không cờ', r.status === 'REVIEW' && r.results[0]?.hs === '82019000' && r.review.needed === false, JSON.stringify([r.status, r.results?.[0]?.hs, r.review]));
  check('(b) RÕ: dấu vết engine.fastFirst.boQuaVong2 = true + nguon', r.engine.fastFirst?.vong1ThinkingOff === true && r.engine.fastFirst?.boQuaVong2 === true && /tờ khai Oz 82019000/.test((r.engine.fastFirst?.nguon || []).join('; ')), JSON.stringify(r.engine.fastFirst));
  check('(b) RÕ: engine.gates log fastFirst:true, boQuaVong2:true', (r.engine.gates || []).some((x) => x.fastFirst === true && x.boQuaVong2 === true && x.hs === '82019000'), JSON.stringify(r.engine.gates));
  check('(b) RÕ: engine.rounds = 1 (không đếm vòng AI nào thêm)', r.engine.rounds === 1, JSON.stringify(r.engine.rounds));
  check('(b) RÕ: basis có nguồn TIEN_LE xác nhận, không bịa điều kiện/basis SAN_PHAM', (r.results[0].basis || []).some((b) => b.stream === 'TIEN_LE' && /Oz 82019000/.test(b.claim)) && !(r.results[0].basis || []).some((b) => b.stream === 'SAN_PHAM'), JSON.stringify(r.results[0].basis));
  check('(b) RÕ: girRulesApplied vẫn có (máy suy tất định từ mã)', Array.isArray(r.girRulesApplied), JSON.stringify(r.girRulesApplied));
  check('(b) RÕ: llmTungVong rỗng (không lời vòng ≥2), llmMs = 0', Array.isArray(r.engine.phases.llmTungVong) && r.engine.phases.llmTungVong.length === 0 && r.engine.phases.llmMs === 0, JSON.stringify(r.engine.phases));
  check('(b) RÕ: ECUS vẫn sinh cho mã 8 số', !!r.ecus, JSON.stringify(r.ecus ? 'co' : null));
}

// (c1) CỜ BẬT + MƠ HỒ (tự tin dưới ngưỡng) ⇒ leo sâu: vòng 2 thinking-on như cũ.
{
  ozMod.searchOzByKeyword = ozKhopCao;
  const R1MoHo = { ...R1_RO, hypotheses: [{ chapter: '82', heading4: '8201', subheading6: '820190', why: 'dụng cụ cầm tay nông nghiệp', confidence: 55 }] };
  const r = await run(DAO, [R1MoHo, CHOT2]);
  check('(c1) MƠ HỒ: vẫn 2 lời AI, vòng 2 thinking-on như cũ', calls.length === 2 && calls[1].round === 2 && calls[1].thinkingOff === false, JSON.stringify(calls.map((c) => [c.round, c.thinkingOff])));
  check('(c1) MƠ HỒ: chốt bình thường qua vòng 2', r.results[0]?.hs === '82019000', JSON.stringify(r.results?.[0]?.hs));
  check('(c1) MƠ HỒ: engine.fastFirst ghi lyDo leo sâu', r.engine.fastFirst?.boQuaVong2 === false && /tu-tin-duoi-nguong/.test(r.engine.fastFirst?.lyDo || ''), JSON.stringify(r.engine.fastFirst));
}

// (c2) CỜ BẬT + còn dữ kiện chưa rõ (r1.verify.unknowns) ⇒ leo sâu.
{
  ozMod.searchOzByKeyword = ozKhopCao;
  const R1ChuaRo = { ...R1_RO, verify: { ...R1_RO.verify, unknowns: ['cơ-tay hay điện'] } };
  const r = await run(DAO, [R1ChuaRo, CHOT2]);
  check('(c2) CÒN UNKNOWN: 2 lời AI + lyDo con-du-kien-chua-ro', calls.length === 2 && /con-du-kien-chua-ro/.test(r.engine.fastFirst?.lyDo || ''), JSON.stringify([calls.length, r.engine.fastFirst]));
}

// (c3) CỜ BẬT + KHÔNG nguồn độc lập (tiền lệ Oz không khớp đủ) ⇒ leo sâu.
{
  ozMod.searchOzByKeyword = async () => ({ items: [{ hsCode: '82019000', tenHang: 'Dao hái cau伸缩杆', ozCount: 5, matchCoverage: 40 }] });
  const r = await run(DAO, [R1_RO, CHOT2]);
  check('(c3) KHÔNG NGUỒN ĐỘC LẬP: 2 lời AI + lyDo khong-nguon-doc-lap', calls.length === 2 && /khong-nguon-doc-lap/.test(r.engine.fastFirst?.lyDo || ''), JSON.stringify([calls.length, r.engine.fastFirst]));
}

// (c4) CỜ BẬT + hồ sơ rõ NHƯNG cổng chặn đáp án fast-path (NCC khai khác nhóm — G7) ⇒ bỏ fast-path, leo sâu.
{
  ozMod.searchOzByKeyword = ozKhopCao;
  const CHOT2GiaiTrinhNCC = { ...CHOT2, reason: 'dụng cụ cầm tay nông nghiệp; nhà cung cấp khai nhóm 9403 nhưng hàng là dao hái cau — nhóm 8201 theo chú giải chương 82' };
  const r = await run({ ...DAO, supplierHs: { code: '9403209010', source: 'trang TQ' } }, [R1_RO, CHOT2GiaiTrinhNCC]);
  check('(c4) NCC KHÁC NHÓM: fast-path bị cổng G7 chặn → gọi vòng 2 thật', calls.length === 2 && calls[1].round === 2 && calls[1].thinkingOff === false, JSON.stringify(calls.map((c) => [c.round, c.thinkingOff])));
  check('(c4) engine.fastFirst.boQuaVong2 = false, lyDo NCC_KHAI_KHAC_NHOM, log fastFirst:false', r.engine.fastFirst?.boQuaVong2 === false && /NCC_KHAI_KHAC_NHOM/.test(r.engine.fastFirst?.lyDo || '') && (r.engine.gates || []).some((x) => x.fastFirst === false && /NCC_KHAI_KHAC_NHOM/.test(x.lyDo || '')), JSON.stringify([r.engine.fastFirst, r.engine.gates?.filter((x) => 'fastFirst' in x)]));
  check('(c4) vòng 2 giải trình NCC xong → chốt bình thường', r.results[0]?.hs === '82019000', JSON.stringify(r.results?.[0]?.hs));
}

// (d) Cổng ứng viên chạy thuần máy: không lời AI nào thêm khi trả lyDo (không gọi LLM).
{
  ozMod.searchOzByKeyword = async () => ({ items: [] });
  const kq = fastFirstUngVien({ r1: R1_RO, gathered: { headings: ['8201'], ozPrecedents: [] }, productText: 'dao hái cau' });
  check('(d) fastFirstUngVien thuần máy: không nguồn → lyDo, không throw', kq && !kq.hs8 && Array.isArray(kq.lyDo) && kq.lyDo.includes('khong-nguon-doc-lap'), JSON.stringify(kq));
  const kq2 = fastFirstUngVien({ r1: { hypotheses: [] }, gathered: { headings: [] }, productText: '' });
  check('(d) không giả thuyết → lyDo khong-gia-thuyet', kq2?.lyDo?.includes('khong-gia-thuyet'), JSON.stringify(kq2));
}

// (e) 2 LỖI SOÁT GĐ (trả PR #1262): nguồn độc lập MÂU THUẪN phải leo sâu; ứng viên khác phân nhóm 6 số của vòng 1 bị loại.
{
  // (e1) Hai mã 8 số KHÁC NHAU cùng phân nhóm 6 số 820190 của vòng 1 ⇒ mâu thuẫn ⇒ KHÔNG chốt, vẫn gọi vòng 2.
  const kqM = fastFirstUngVien({ r1: R1_RO, gathered: { headings: ['8201'], ozPrecedents: [
    { hs: '82019000', name: 'Dao hái cau伸缩杆', cov: 90, oz: 5 },
    { hs: '82019099', name: 'Dao hái quả kiểu khác', cov: 80, oz: 3 },
  ] }, productText: 'dao hái cau' });
  check('(e1) 2 mã khác nhau: không hs8, lyDo nguon-doc-lap-mau-thuan', kqM && !kqM.hs8 && Array.isArray(kqM.lyDo) && kqM.lyDo.includes('nguon-doc-lap-mau-thuan'), JSON.stringify(kqM));
  ozMod.searchOzByKeyword = async () => ({ items: [
    { hsCode: '82019000', tenHang: 'Dao hái cau伸缩杆', ozCount: 5, matchCoverage: 90 },
    { hsCode: '82019099', tenHang: 'Dao hái quả kiểu khác', ozCount: 3, matchCoverage: 80 },
  ] });
  const r = await run(DAO, [R1_RO, CHOT2]);
  check('(e1) hội nhập: KHÔNG fast-path — vẫn 2 lời AI, vòng 2 thinking-on như cũ', calls.length === 2 && calls[1].round === 2 && calls[1].thinkingOff === false, JSON.stringify(calls.map((c) => [c.round, c.thinkingOff])));
  check('(e1) engine.fastFirst.boQuaVong2 = false + lyDo mâu thuẫn', r.engine.fastFirst?.boQuaVong2 === false && /nguon-doc-lap-mau-thuan/.test(r.engine.fastFirst?.lyDo || ''), JSON.stringify(r.engine.fastFirst));
  check('(e1) vẫn chốt bình thường qua vòng 2', r.results[0]?.hs === '82019000', JSON.stringify(r.results?.[0]?.hs));

  // (e2) Ứng viên cùng nhóm 4 SỐ 8201 nhưng khác phân nhóm 6 SỐ (820140 ≠ 820190 của vòng 1) ⇒ bị loại, không chốt nhầm.
  const kqSaiNhom = fastFirstUngVien({ r1: R1_RO, gathered: { headings: ['8201'], ozPrecedents: [
    { hs: '82014000', name: 'Dao cắt mía', cov: 90, oz: 4 },
  ] }, productText: 'dao hái cau' });
  check('(e2) khác hs6 vòng 1: bị loại — không hs8, lyDo khong-nguon-doc-lap', kqSaiNhom && !kqSaiNhom.hs8 && kqSaiNhom.lyDo?.includes('khong-nguon-doc-lap'), JSON.stringify(kqSaiNhom));
  ozMod.searchOzByKeyword = async () => ({ items: [{ hsCode: '82014000', tenHang: 'Dao cắt mía', ozCount: 4, matchCoverage: 90 }] });
  const r2 = await run(DAO, [R1_RO, CHOT2]);
  check('(e2) hội nhập: vẫn 2 lời AI (leo sâu), không chốt 82014000', r2.engine.fastFirst?.boQuaVong2 === false && calls.length === 2 && r2.results[0]?.hs === '82019000', JSON.stringify([calls.length, r2.engine.fastFirst, r2.results?.[0]?.hs]));

  // (e3) Nhiều tiền lệ cùng nói MỘT mã ⇒ vẫn chốt fast-path (kiểm mới không chặn nhầm nguồn đồng thuận).
  const kqDongThuan = fastFirstUngVien({ r1: R1_RO, gathered: { headings: ['8201'], ozPrecedents: [
    { hs: '82019000', name: 'Dao hái cau伸缩杆', cov: 90, oz: 5 },
    { hs: '82019000', name: 'Dụng cụ hái cau cán dài', cov: 80, oz: 3 },
  ] }, productText: 'dao hái cau' });
  check('(e3) nhiều tiền lệ CÙNG 1 mã: vẫn chốt 82019000 (không chặn nhầm)', kqDongThuan?.hs8 === '82019000' && kqDongThuan?.kieu === 'tien-le-oz', JSON.stringify(kqDongThuan));
}

ozMod.searchOzByKeyword = ozGoc;
delete process.env.HS_CLASSIFY_FAST_FIRST;
console.log(fail === 0 ? `=== FAST-FIRST OK: ${pass} pass ===` : `=== FAST-FIRST FAIL: ${fail} fail / ${pass} pass ===`);
process.exit(fail === 0 ? 0 : 1);
