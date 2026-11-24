#!/usr/bin/env node
/**
 * scripts/test-kiem-ban-do-4so.mjs — CA TIÊM LỖI cho cổng bản đồ 4 số (lib/do-thi/ban-do-4so.js, khuôn bd4@1).
 * Dữ liệu thử do MÁY dựng từ chính gói thật (chọn id, chuỗi con, láng giềng có sẵn) — không có nội dung soạn tay, không LLM.
 * Mỗi mã lỗi đỏ có ≥ 1 ca tiêm; bản "tốt" dựng từ gói phải 0 lỗi đỏ.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(GOC);
const B = require('../lib/do-thi/ban-do-4so.js');
let loi = 0;
const kiem = (ten, dieuKien, chiTiet = '') => { if (dieuKien) console.log(`✓ ${ten}`); else { loi += 1; console.log(`✗ ${ten} ${chiTiet}`); } };

const goi = B.taoGoi(['8536', '8543', '8481', '8424', '8471', '8517']);
kiem('gói dựng được, ≥ 5 nhóm, mọi nhóm có láng giềng', goi.nhomThuTu.length >= 5 && goi.nhomThuTu.every((h) => goi.nhom[h].langGieng.length > 0));
const text = B.renderGoi(goi);
kiem('văn bản gói nêu danh sách láng giềng và điều khoản', text.includes('DANH SÁCH LÁNG GIỀNG') && text.includes('ĐIỀU KHOẢN CHƯƠNG / PHẦN'));
kiem('gói tất định (dựng hai lần ra cùng mã)', B.taoGoi(['8536', '8543', '8481', '8424', '8471', '8517']).bam === goi.bam);

// Cặp láng giềng hai chiều trong gói (cho ca mâu thuẫn hai chiều)
let A = null; let Bn = null;
for (const a of goi.nhomThuTu) for (const b of goi.nhomThuTu) if (!A && a < b && goi.nhom[a].langGieng.some((x) => x.ma === b) && goi.nhom[b].langGieng.some((x) => x.ma === a)) { A = a; Bn = b; }
kiem('có một cặp nhóm là láng giềng của nhau trong gói', Boolean(A && Bn), 'đổi danh sách nhóm của test');
if (!A) process.exit(1);

// Một đoạn nguồn dài (id → chuỗi con dùng làm trích)
const idCt = goi.nhom[A].ct.find((id) => goi.nguon[id].length > 120);
const trichTot = goi.nguon[idCt].slice(10, 90);
const sao = (x) => JSON.parse(JSON.stringify(x));
const mucTot = { y: 'hàng làm một việc quan sát được', trich: trichTot, nguon: idCt };
const canhTot = (tu, den, thi, thiKia, dacDiem, neu, conNeu) => ({ den, loai: 'PHAN_BIET', dacDiem, neu, thi, conNeu, thiKia, canCu: [{ nguon: idCt, trich: trichTot }], quyTac: 'QT1' });
const banTot = (h, canh) => ({
  nhom: h, kieuNhom: 'THEO_CHUC_NANG',
  hoSo: { chucNang: [mucTot], coChe: [mucTot], dangVatLy: [mucTot], chatLieu: [], oDauAiDung: [mucTot], hangDuocNeu: [{ ten: 'một món hàng', trich: trichTot, nguon: idCt }], dieuKienBatBuoc: [] },
  canh, khongChac: ['chưa rõ ngưỡng kích thước'],
});
const tot = banTot(A, [canhTot(A, Bn, A, Bn, 'có bộ phận quay nhìn thấy được', 'hàng có bộ phận quay nhìn thấy được', 'hàng không có bộ phận quay')]);
const chay = (ban, them = []) => B.kiemBanDo(Array.isArray(ban) ? ban : [ban], goi, { daNap: them });
const maLoi = (kq) => new Set(kq.loi.map((l) => l.ma));
const ca = (ten, ma, ban, them) => { const kq = chay(ban, them); kiem(`${ten} → ${ma}`, maLoi(kq).has(ma), `(có: ${[...maLoi(kq)].join(',') || 'không lỗi'})`); };

const kqTot = chay(tot);
kiem('bản tốt: 0 lỗi đỏ, nhóm xanh', kqTot.loi.length === 0 && kqTot.nhomXanh.includes(A), JSON.stringify(kqTot.loi));

// TRICH_KHONG_NGUYEN_VAN
{ const b = sao(tot); b.canh[0].canCu[0].trich = `${trichTot} và một câu do máy tự bịa`; ca('trích thêm chữ ngoài nguồn', 'TRICH_KHONG_NGUYEN_VAN', b); }
{ const b = sao(tot); b.hoSo.chucNang[0].trich = 'câu hoàn toàn không có trong luật nhưng đủ dài'; ca('trích ở hồ sơ không có trong nguồn', 'TRICH_KHONG_NGUYEN_VAN', b); }
{ const b = sao(tot); b.canh[0].canCu[0].trich = goi.nguon[goi.nhom[Bn].ct[1] || goi.nhom[Bn].ct[0]].slice(0, 60); b.canh[0].canCu[0].nguon = idCt; ca('trích lấy từ đoạn của id khác', 'TRICH_KHONG_NGUYEN_VAN', b); }
{ const b = sao(tot); b.canh[0].canCu[0].trich = trichTot.replace(/\s+/g, ' ').toUpperCase(); ca('trích đổi hoa / thường', 'TRICH_KHONG_NGUYEN_VAN', b); }
// NGUON_KHONG_CO
{ const b = sao(tot); b.canh[0].canCu[0].nguon = 'ct.0000.99'; ca('nguon không có trong gói', 'NGUON_KHONG_CO', b); }
{ const b = sao(tot); b.hoSo.coChe[0].nguon = 'tự_đặt_id'; ca('nguon tự đặt ở hồ sơ', 'NGUON_KHONG_CO', b); }
// DEN_NGOAI_LANG_GIENG
{ const b = sao(tot); const lg = new Set(goi.nhom[A].langGieng.map((x) => x.ma)); const ngoai = ['9999', '0101', '2501'].find((x) => !lg.has(x)); b.canh[0].den = ngoai; b.canh[0].thiKia = ngoai; ca('den ngoài danh sách láng giềng', 'DEN_NGOAI_LANG_GIENG', b); }
// NHOM_NGOAI_DANH_SACH
{ const b = sao(tot); b.nhom = '1234'; ca('nhóm ngoài danh sách giao', 'NHOM_NGOAI_DANH_SACH', b); }
const caVang = (ten, ma, b) => { const kq = chay(b); kiem(`${ten} → vàng ${ma}, không đỏ`, kq.vang.some((v) => v.ma === ma) && kq.loi.length === 0, JSON.stringify(kq.loi.map((x) => x.ma))); };
// LIET_KE_MOT_CHUOI (vàng: "đo lường hoặc kiểm tra" là MỘT khái niệm luật, máy không tách được ý hay danh sách)
{ const b = sao(tot); b.hoSo.hangDuocNeu[0].ten = 'công tắc, ổ cắm, phích cắm và cầu chì'; caVang('liệt kê trong tên hàng', 'LIET_KE_MOT_CHUOI', b); }
{ const b = sao(tot); b.canh[0].dacDiem = 'chất liệu nhựa, kim loại, gốm hoặc cao su'; caVang('liệt kê trong dacDiem', 'LIET_KE_MOT_CHUOI', b); }
// CANH_THIEU_CAN_CU
{ const b = sao(tot); b.canh[0].canCu = []; ca('cạnh không canCu', 'CANH_THIEU_CAN_CU', b); }
{ const b = sao(tot); delete b.canh[0].canCu[0].trich; ca('canCu thiếu trích', 'CANH_THIEU_CAN_CU', b); }
// DAC_DIEM_LA_TEN_NHOM
{ const b = sao(tot); b.canh[0].dacDiem = `là hàng thuộc nhóm ${Bn.slice(0, 2)}.${Bn.slice(2)}`; ca('dacDiem viện dẫn mã nhóm đích', 'DAC_DIEM_LA_TEN_NHOM', b); }
{ const b = sao(tot); b.canh[0].dacDiem = goi.ten[A].vi.split(/\s+/).slice(0, 3).join(' '); caVang('dacDiem là ba từ đầu của tên nhóm', 'DAC_DIEM_LA_TEN_NHOM', b); }
{ const b = sao(tot); b.canh[0].dacDiem = 'điện áp danh định trên hay không quá 1000 V'; const kq = chay(b); kiem('số đo 1000 V không bị coi là mã nhóm', !kq.loi.some((x) => x.ma === 'DAC_DIEM_LA_TEN_NHOM')); }
// Lỗi ở một mục chỉ bỏ mục đó, nhóm vẫn xanh
{ const b = sao(tot); b.canh.push({ ...b.canh[0], canCu: [{ nguon: idCt, trich: 'câu không có trong gói' }] }); const kq = chay(b); kiem('cạnh có trích sai bị bỏ, nhóm vẫn xanh', kq.nhomXanh.includes(A) && kq.banSach[A].canh.length === b.canh.length - 1); }

// CANH_HAI_CHIEU_MAU_THUAN (A nói X→A, B nói X→B)
{
  const x = canhTot(A, Bn, A, Bn, 'có bộ phận quay nhìn thấy được', 'hàng có bộ phận quay nhìn thấy được', 'hàng không có bộ phận quay');
  const y = canhTot(Bn, A, Bn, A, 'có bộ phận quay nhìn thấy được', 'hàng có bộ phận quay nhìn thấy được', 'hàng không có bộ phận quay');
  ca('A nói X→A, B nói X→B (cùng tệp)', 'CANH_HAI_CHIEU_MAU_THUAN', [banTot(A, [x]), banTot(Bn, [y])]);
  const kq = chay(banTot(Bn, [y]), [{ ...banTot(A, [x]), __tep: `${A}.json` }]);
  kiem('mâu thuẫn bắt được cả khi bản kia đã nạp từ trước', maLoi(kq).has('CANH_HAI_CHIEU_MAU_THUAN'));
  const y2 = canhTot(Bn, A, A, Bn, 'có bộ phận quay nhìn thấy được', 'hàng có bộ phận quay nhìn thấy được', 'hàng không có bộ phận quay');
  { // ca thật 3920↔3921 (vòng 1): vế có hai chữ phủ định vẫn là MỘT vế phủ định
    const dd = 'có cấu trúc xốp hay đã gia cố gắn lớp mặt vật liệu khác không'; const am = 'không xốp và chưa gia cố gắn lớp mặt bổ trợ vật liệu khác'; const duong = 'loại xốp hoặc đã gia cố gắn lớp mặt bổ trợ kết hợp vật liệu khác';
    kiem('vế "không … và chưa …" là phủ định, hai chiều nhất quán không bị báo', !maLoi(chay([banTot(A, [canhTot(A, Bn, Bn, A, dd, am, duong)]), banTot(Bn, [canhTot(Bn, A, A, Bn, dd, duong, am)])])).has('CANH_HAI_CHIEU_MAU_THUAN'));
  }
  kiem('hai chiều nhất quán (cùng điều kiện, cùng nhóm đích) không bị báo', !maLoi(chay([banTot(A, [x]), banTot(Bn, [y2])])).has('CANH_HAI_CHIEU_MAU_THUAN'));
}
// Phụ: thi sai, khuôn sai, vàng
{ const b = sao(tot); b.canh[0].thi = '1234'; ca('thi ngoài hai nhóm của cạnh', 'THI_SAI', b); }
{ const b = sao(tot); b.kieuNhom = 'LOAI_LA'; ca('kieuNhom ngoài danh sách', 'KHUON_SAI', b); }
{ const b = sao(tot); b.canh[0].quyTac = 'QT9'; ca('quyTac ngoài danh sách', 'KHUON_SAI', b); }
{ const b = sao(tot); b.hoSo.chucNang = []; const kq = chay(b); kiem('trục chucNang trống → vàng HO_SO_TRUC_TRONG, không đỏ', kq.vang.some((v) => v.ma === 'HO_SO_TRUC_TRONG') && kq.loi.length === 0); }
{ const b = sao(tot); b.hoSo.chatLieu = []; const kq = chay(b); kiem('chatLieu trống (= không giới hạn) không bị báo vàng', !kq.vang.some((v) => v.muc === 'hoSo.chatLieu')); }
// Đọc tệp có khối ```json và mảng
kiem('docBanDo đọc khối ```json trong văn bản', B.docBanDo(`Đây:\n\`\`\`json\n${JSON.stringify(tot)}\n\`\`\`\nhết`).length === 1);
kiem('trichNguyenVan: dấu … tách đoạn theo thứ tự', B.trichNguyenVan('Nhóm này bao gồm … nhóm 84.20', 'Nhóm này bao gồm một loạt máy khác nhau (nhóm 84.20)') && !B.trichNguyenVan('nhóm 84.20 … Nhóm này bao gồm', 'Nhóm này bao gồm một loạt máy khác nhau (nhóm 84.20)'));

// Mỗi mã lỗi đỏ có ca tiêm
const maDo = Object.keys(B.MA_LOI);
const src = (await import('node:fs')).readFileSync(fileURLToPath(import.meta.url), 'utf8');
kiem('mỗi mã lỗi đỏ có ≥ 1 ca tiêm trong tệp này', maDo.every((m) => src.includes(`'${m}'`)), maDo.filter((m) => !src.includes(`'${m}'`)).join(','));

if (loi) { console.log(`\n✗ ${loi} ca sai`); process.exit(1); }
console.log('\n✓ cổng bản đồ 4 số: mọi ca đạt');
