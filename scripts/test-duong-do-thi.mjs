#!/usr/bin/env node
/**
 * Đường đồ thị (HS_TIM_TRUOC=do-thi, kế hoạch đồ thị mục 5 bước 3–8): ráp đúng, không đủ căn cứ thì về vòng 1, tắt thì như cũ.
 * LLM giả, không mạng. Đây là kiểm CƠ CHẾ; số đúng/sai phải đo bằng chuỗi mô hình máy thật (L1).
 */
import './test-isolate-data.mjs';
import { createRequire } from 'node:module';
import { boKiem } from './lib-luat.mjs';

const require = createRequire(import.meta.url);
globalThis.fetch = async () => { throw new Error('bài kiểm không được ra mạng'); };
for (const k of Object.keys(process.env)) if (/^HS_(TIM|TIEN_XU_LY|CHOT_SOM|HOI_THEO|SO_TAY|MAX_VONG|GON|CLASSIFY_FAST)/.test(k)) delete process.env[k];
process.env.MIC_OFF = '1'; process.env.HS_SO_TAY = 'full';
const { kiem, xong } = boKiem('test-duong-do-thi');
const llm = require('../lib/llm-tier.js');
const { classifyLoop } = require('../lib/engine-loop.js');
const DT = require('../lib/do-thi/duong-do-thi.js');
const tt = require('../lib/tim-truoc.js');
const { goiPhanBiet } = require('../lib/do-thi/goi-phan-biet.js');

const HANG = { tenHang: 'Van điện từ khí nén 5/2, cuộn coil 24VDC, thân nhôm' };
const R1_CU = { product: { nameVi: 'Van điện từ khí nén 5/2', purpose: 'điều khiển khí nén', material: 'nhôm', form: 'hoàn chỉnh', evidence: {} }, hypotheses: [{ chapter: '84', heading4: '8481', subheading6: '848120', why: 'van', confidence: 80 }], verify: { searchVi: ['van điện từ'], codes8: ['84812090'], unknowns: [] } };
const R2 = { decision: 'CHOT', hs: '84812090', confidence: 80, reason: 'van dùng trong truyền động khí nén', basis: [], conditions: [], alternatives: [], questions: [] };

/** LLM giả: hopDong quyết câu trả lời từng bước; ghi lại thứ tự bước. */
function gia(traLoi) {
  const buoc = [];
  llm.callLLMJson = async (_s, u, o = {}) => {
    buoc.push(o.step);
    const r = traLoi[o.step];
    const json = typeof r === 'function' ? r(u) : r;
    if (json instanceof Error) throw json;
    return { json: JSON.parse(JSON.stringify(json)), provider: 'gia', model: 'gia' };
  };
  return buoc;
}
const idTrongGoi = (u, nhom) => [...u.matchAll(/\[([^\]]+)\] \((\d{4})-(\d{4})\)/g)].filter((m) => m[2] === nhom || m[3] === nhom).map((m) => m[1])[0];
const luotMotDung = (u) => ({ duKien: [{ khoa: 'ten', giaTri: 'van', trichKhach: 'van điện từ khí nén' }], nhom: [...u.split('ỨNG VIÊN:')[1].matchAll(/^- (\d{4})/gm)].map((m) => m[1]).slice(0, 3), lyDoNgoai: '' });
const luotHaiDung = (u) => ({ nhom: '8481', canCu: [idTrongGoi(u, '8481')].filter(Boolean), thieu: [], lyDo: 'van điều khiển dòng khí' });
const DAY_DU = { luot_mot: luotMotDung, luot_hai: luotHaiDung, understand: R1_CU, gir: R2 };
const chay = async (che, traLoi, hang = HANG) => { if (che) process.env.HS_TIM_TRUOC = che; else delete process.env.HS_TIM_TRUOC; const buoc = gia(traLoi); const out = await classifyLoop(hang, { mic: false }); return { out, buoc }; };

// 0. Công tắc
for (const [v, b, g, d] of [['', false, false, false], ['on', true, false, false], ['goi', true, true, false], ['do-thi', true, true, true]]) {
  process.env.HS_TIM_TRUOC = v;
  kiem(`HS_TIM_TRUOC="${v}" → bat=${b} batGoi=${g} batDoThi=${d}`, tt.bat() === b && tt.batGoi() === g && tt.batDoThi() === d);
}
// 1. Tắt / on / goi: không gọi bước đồ thị, không thêm trường
for (const v of ['', 'on', 'goi']) {
  const { out, buoc } = await chay(v, DAY_DU);
  kiem(`"${v || 'tắt'}": không có lượt đồ thị, vòng 1 như cũ`, !buoc.some((b) => /^luot_/.test(b)) && buoc[0] === 'understand' && !out.engine.doThi && !out.engine.tuSoat && !out.dossier.canCuDoThi, buoc.join(','));
}
// 2. Thuận: hai lượt đồ thị thay vòng 1
const thuan = await chay('do-thi', DAY_DU);
kiem('do-thi thuận: lượt một → lượt hai, KHÔNG gọi vòng 1 (understand)', thuan.buoc[0] === 'luot_mot' && thuan.buoc[1] === 'luot_hai' && !thuan.buoc.includes('understand'), thuan.buoc.join(','));
kiem('do-thi thuận: nhóm 8481, mã có mặt, engine ghi bước + giờ', thuan.out.engine.doThi?.nhom === '8481' && thuan.out.results[0]?.hs.startsWith('8481') && thuan.out.engine.doThi.luot.length === 2 && Number.isFinite(thuan.out.engine.phases.doThiMs), JSON.stringify(thuan.out.engine.doThi));
kiem('do-thi thuận: có tự soát + hồ sơ căn cứ (bước 8), căn cứ là trích nguyên văn', ['CAO', 'VUA', 'THAP'].includes(thuan.out.engine.tuSoat?.doTin) && thuan.out.dossier.canCuDoThi?.[0]?.canCu?.[0]?.trich?.length > 5, JSON.stringify(thuan.out.engine.tuSoat));
// 3. Không đủ căn cứ → về vòng 1, vẫn ra mã
const hong = [
  ['lượt một hỏng khuôn', { ...DAY_DU, luot_mot: { nhom: [] } }],
  ['lượt hai bịa id căn cứ', { ...DAY_DU, luot_hai: { nhom: '8481', canCu: ['C5:bia'], thieu: [], lyDo: '' } }],
  ['lượt hai không căn cứ', { ...DAY_DU, luot_hai: { nhom: '8481', canCu: [], thieu: [], lyDo: '' } }],
  ['lượt hai chọn nhóm ngoài gói', { ...DAY_DU, luot_hai: { nhom: '0101', canCu: ['x'], thieu: [], lyDo: '' } }],
  ['mạng lỗi ở lượt hai', { ...DAY_DU, luot_hai: new Error('mang loi') }],
];
for (const [ten, tl] of hong) {
  const { out, buoc } = await chay('do-thi', tl);
  const biaThiRoi = ten === 'lượt một hỏng khuôn' ? true : (/VE_DUONG_CU/.test(out.engine.doThi?.trangThai || '') && buoc.includes('understand'));
  kiem(`CA NGƯỢC ${ten}: không chốt bừa, vẫn ra kết quả`, biaThiRoi && out.results?.length > 0 && (buoc.includes('understand') || out.engine.doThi?.canCu?.length > 0), `${out.engine.doThi?.trangThai} ${buoc.join(',')}`);
}
// 4. Tên toàn chữ Hán → tìm trước bỏ qua → vòng 1 như cũ
{
  const { buoc, out } = await chay('do-thi', DAY_DU, { tenHang: '电磁阀' });
  kiem('tên chữ Hán: bỏ qua đồ thị, vòng 1 như cũ', buoc[0] === 'understand' && /^BO_QUA/.test(out.engine.doThi?.trangThai || ''), `${out.engine.doThi?.trangThai} ${buoc.join(',')}`);
}
// 5. Thiếu dữ kiện → không chốt 8 số tất định
{
  const { out } = await chay('do-thi', { ...DAY_DU, luot_hai: (u) => ({ ...luotHaiDung(u), thieu: ['kiểu truyền động'] }) });
  kiem('còn thiếu dữ kiện: không bỏ vòng 2 bằng đường tất định', !(out.engine.gates || []).some((x) => x.doThiChot === true), JSON.stringify(out.engine.gates?.map((x) => x.doThiChot)));
}
// 6. dapAn8: mọi điều kiện phải đủ
{
  const goi = goiPhanBiet(['8481', '8412']);
  const kq = { goi, luotHai: { ok: true, nhom: '8481', canCu: [goi.muc[0].id], thieu: [], lyDo: 'x' }, xuong6: { trangThai: 'CHOT', chot: '848120' } };
  const cd = (r) => ({ chotDong8: () => r, dong8DuyNhat: () => null, productText: 'van' });
  kiem('dapAn8: chotDong8 CHOT → có đáp án kèm căn cứ', DT.dapAn8({ kq, ...cd({ checked: true, ketQua: 'CHOT', hs: '84812090' }) })?.hs === '84812090');
  for (const r of [{ checked: true, ketQua: 'THIEU_SO_LIEU' }, { checked: true, ketQua: 'TRANH_CAP' }, { checked: true, ketQua: 'LOAI_KHAC', hs: '84812090' }, { checked: false }, null]) kiem(`CA NGƯỢC dapAn8: chotDong8=${r?.ketQua || r} → null`, DT.dapAn8({ kq, ...cd(r) }) === null);
  kiem('CA NGƯỢC dapAn8: cạnh 6 số chưa chốt → null', DT.dapAn8({ kq: { ...kq, xuong6: { trangThai: 'CAN_HOI', chot: null } }, ...cd({ checked: true, ketQua: 'CHOT', hs: '84812090' }) }) === null);
  kiem('CA NGƯỢC dapAn8: còn thiếu dữ kiện → null', DT.dapAn8({ kq: { ...kq, luotHai: { ...kq.luotHai, thieu: ['a'] } }, ...cd({ checked: true, ketQua: 'CHOT', hs: '84812090' }) }) === null);
}
// 7. Dữ kiện xuống 6 số chỉ đọc chữ khách, không đọc suy đoán của AI
kiem('moTaKhach chỉ lấy trường khách khai', DT.moTaKhach({ tenHang: 'A', chatLieu: 'B', product: { nameVi: 'BỊA' }, imageTexts: [{ text: 'tem' }] }) === 'A. B. tem');
kiem('nhóm chưa có cạnh g6@1 → CHUA_CO_CANH, không đoán', DT.xuong6('8481', 'van', () => ({ tieuChi6: [{ hs6: '848120' }] })).trangThai === 'CHUA_CO_CANH');
xong();
