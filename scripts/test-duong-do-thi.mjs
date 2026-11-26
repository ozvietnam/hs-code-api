#!/usr/bin/env node
/**
 * Đường đồ thị (HS_TIM_TRUOC=do-thi, kế hoạch đồ thị mục 5 bước 3–8): ráp đúng, không đủ căn cứ thì về vòng 1, tắt thì như cũ.
 * LLM giả, không mạng. Đây là kiểm CƠ CHẾ; số đúng/sai phải đo bằng chuỗi mô hình máy thật (L1).
 */
import './test-isolate-data.mjs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
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
const SS = require('../lib/do-thi/song-sinh-vat-lieu.js');

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
const idTrongGoi = (u, nhom) => [...u.matchAll(/\[([^\]]+)\] \((\d{4})-(\d{4})\)/g)].filter((m) => (m[2] === nhom || m[3] === nhom) && m[2] !== m[3]).map((m) => m[1])[0];
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
  kiem('CA NGƯỢC dapAn8: chỉ trích tên nhóm → null', DT.dapAn8({ kq: { ...kq, luotHai: { ...kq.luotHai, canCu: ['TEN:8481'] } }, ...cd({ checked: true, ketQua: 'CHOT', hs: '84812090' }) }) === null);
  kiem('CA NGƯỢC dapAn8: cạnh 6 số chưa chốt → null', DT.dapAn8({ kq: { ...kq, xuong6: { trangThai: 'CAN_HOI', chot: null } }, ...cd({ checked: true, ketQua: 'CHOT', hs: '84812090' }) }) === null);
  kiem('CA NGƯỢC dapAn8: còn thiếu dữ kiện → null', DT.dapAn8({ kq: { ...kq, luotHai: { ...kq.luotHai, thieu: ['a'] } }, ...cd({ checked: true, ketQua: 'CHOT', hs: '84812090' }) }) === null);
}
// 7. Dữ kiện xuống 6 số chỉ đọc chữ khách, không đọc suy đoán của AI
kiem('moTaKhach chỉ lấy trường khách khai', DT.moTaKhach({ tenHang: 'A', chatLieu: 'B', product: { nameVi: 'BỊA' }, imageTexts: [{ text: 'tem' }] }) === 'A. B. tem');
kiem('nhóm chưa có cạnh g6@1 → CHUA_CO_CANH, không đoán', DT.xuong6('8481', 'van', () => ({ tieuChi6: [{ hs6: '848120' }] })).trangThai === 'CHUA_CO_CANH');
{
  const g = require('../lib/so-tay-gates.js');
  const x = DT.xuong6('8536', 'Rơ le bán dẫn. Đóng cắt tải trong hệ thống điều khiển tự động', g.loadSoTay);
  kiem('rơ le bán dẫn không ghi điện áp: cạnh còn nhiều phân nhóm → có câu hỏi điện áp', x.trangThai === 'CAN_HOI' && DT.cauHoiCuaCanh(x).some((c) => /điện áp/i.test(c)), JSON.stringify([x, DT.cauHoiCuaCanh(x)]));
  kiem('CA NGƯỢC: chỉ thiếu tên loại / công dụng → không sinh câu hỏi', DT.cauHoiCuaCanh({ trangThai: 'CAN_HOI', ungVien: ['a', 'b'], thieu: ['tenLoai', 'congDung'] }).length === 0);
  kiem('CA NGƯỢC: đã chốt → không hỏi', DT.cauHoiCuaCanh({ trangThai: 'CHOT', ungVien: [], thieu: ['dienAp'] }).length === 0);
}
// 8. Ứng viên: tới 10 nhóm ở do-thi, mức khác giữ đúng danh sách cũ
{
  process.env.HS_TIM_TRUOC = 'on'; const a = await tt.timTruoc(HANG);
  process.env.HS_TIM_TRUOC = 'do-thi'; const b = await tt.timTruoc(HANG);
  kiem('do-thi: khối vòng 1 và tomTat.nhom giống hệt on', a.khoi === b.khoi && JSON.stringify(a.tomTat.nhom) === JSON.stringify(b.tomTat.nhom));
  kiem('do-thi: danh sách rộng giữ nguyên thứ tự 5 nhóm đầu, dài hơn, ≤ 10', b.mucRong.length > a.mucRong.length && b.mucRong.length <= 10 && a.mucRong.every((m, i) => b.mucRong[i].nhom === m.nhom), `${a.mucRong.length} ${b.mucRong.length}`);
}
// 9. Cùng vật, khác vật liệu
kiem('bu lông nhôm: thêm 7616 (biểu viết liền "bulông")', SS.nhomSongSinh(['7318', '9603'], { tenHang: 'Bu lông nhôm M6 x 20' }).some((x) => x.nhom === '7616'));
kiem('bu lông đồng: thêm 7415', SS.nhomSongSinh(['7318'], { tenHang: 'Bu lông đồng M8' }).some((x) => x.nhom === '7415'));
kiem('CA NGƯỢC bu lông inox: đã có 7318 đúng vật liệu → không thêm', SS.nhomSongSinh(['7318'], { tenHang: 'Bu lông inox 304 M8' }).length === 0);
kiem('CA NGƯỢC không nêu vật liệu → không thêm', SS.nhomSongSinh(['7318'], { tenHang: 'Bu lông M6' }).length === 0);
kiem('CA NGƯỢC chương đọc từ tên chương: "kim loại" chung không trỏ chương nào', !SS.chuongTheoVatLieu().has('kim loại') && SS.chuongTheoVatLieu().get('nhôm')?.join() === '76');
// 10. Gói lượt hai: id ngắn, map về id gốc, cặp không có cạnh vẫn có tên nhóm
{
  const x = DT.goiChoLuotHai(['7318', '9603'], { tran: 7000 });
  kiem('gói: id ngắn K1.., có câu tên nhóm nguyên văn, map về id gốc', x.gon.muc.length >= 2 && x.gon.muc.every((m) => /^K\d+$/.test(m.id)) && x.gon.muc.every((m) => x.goc.muc.some((g) => g.id === x.maGoc.get(m.id))) && !/C\d+:\d{4}>/.test(x.gon.vanBan));
}
// 11. Bước 6: "không khớp chữ" khác "trái"; "loại khác" chỉ chốt khi mọi anh em trái cứng
{
  const S = require('../lib/so-tay-gates.js').loadSoTay;
  const usb = DT.xuong6('8523', 'Thẻ nhớ USB. lưu trữ dữ liệu điện tử', S);
  kiem('thẻ nhớ USB: không chốt "loại khác" 852380, phân nhóm 852351 còn trong danh sách xét', usb.chot === null && usb.ungVien.includes('852351'), JSON.stringify(usb).slice(0, 200));
  const noi = DT.xuong6('7323', 'Bộ nồi bằng thép không gỉ. thép không gỉ, tay cầm nhựa. đồ dùng nhà bếp', S);
  kiem('nồi inox tay cầm nhựa: không chốt "loại khác" 732399, còn 732393', noi.chot === null && noi.ungVien.includes('732393'), JSON.stringify(noi).slice(0, 200));
  const vay = DT.xuong6('6104', 'Váy liền thân trẻ em gái. Vải dệt kim sợi tổng hợp. Trang phục trẻ em', S);
  kiem('CA NGƯỢC váy liền thân sợi tổng hợp: vẫn chốt 610443 (khớp tiêu chí có tên riêng)', vay.trangThai === 'CHOT' && vay.chot === '610443', JSON.stringify(vay).slice(0, 200));
  // Bộ tiêu chí giả: hai phân nhóm theo số đo, một phần còn lại
  const G6 = require('../lib/do-thi/tieu-chi-6.js');
  const r = G6.diXuong6('8501', S('8501').tieuChi6, 'Động cơ điện một chiều 24V 500W');
  kiem('diXuong6: mọi dòng chiTiet có traiCung kiểu boolean, trái cứng ⇒ trái', r.chiTiet.every((q) => typeof q.traiCung === 'boolean' && (!q.traiCung || q.trangThai === 'TRAI')));
  const kb = DT.khoiVong2({ luotHai: { nhom: '6104' }, xuong6: vay }, S);
  kiem('khối vòng 2: nêu phân nhóm khớp kèm câu luật nguyên văn', /KHỚP 610443: "/.test(kb), kb.slice(0, 200));
  kiem('CA NGƯỢC khối vòng 2: không chốt, không loại → chuỗi rỗng', DT.khoiVong2({ luotHai: { nhom: '8523' }, xuong6: { chot: null, loai: [] } }, S) === '' && DT.khoiVong2(null) === '');
}
// 12. Nghỉ gọi lại không vượt hạn chót lượt (LOOP_PROVIDER=gemini): trước đây 85 s kéo thành 135 s
{
  const { execFileSync } = await import('node:child_process');
  const ma = `
    const T = require('./lib/llm-tier.js'); let n = 0;
    T.callLLMJson = async () => { n += 1; throw new Error('gemini timeout'); };
    const { callWithFallback } = require('./lib/engine-loop.js');
    const t = Date.now();
    callWithFallback('s', 'u', { step: 'understand', timeoutMs: 1000, hanChotMs: Date.now() + 6000 }, []).catch(() => console.log(JSON.stringify({ ms: Date.now() - t, n }))).finally(() => process.exit(0));`;
  const env = { ...process.env, LOOP_PROVIDER: 'gemini' }; delete env.MINIMAX_API_KEY;
  const ra = JSON.parse(execFileSync(process.execPath, ['-e', ma], { env, cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' }).trim().split('\n').pop());
  kiem('còn 6 s tới hạn chót: không nghỉ 5 s để gọi lại', ra.ms < 1500 && ra.n === 1, JSON.stringify(ra));
}
xong();
