#!/usr/bin/env node
/**
 * Báo cáo số đo chạy bóng hồ sơ phân loại (plan L1-5f; spec hồ sơ §10).
 *
 *   node scripts/bao-cao-shadow.mjs [--json] [--tu=YYYY-MM-DD] [--den=YYYY-MM-DD] [--tep=<đường dẫn>]
 *
 * Mặc định đọc dataPath('ho-so-shadow.jsonl') (trên máy chủ: thư mục ghi HS_DATA_DIR của container, thường /data). Tệp chỉ có
 * số đo (KHOA_SHADOW của lib/ho-so/api.js) — báo cáo in ra cũng chỉ có số. Cùng tổng hợp với GET /api/admin/ho-so-shadow.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { baoCaoShadow, NGAY } = require('../lib/ho-so/bao-cao-shadow.js');

const arg = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
const tu = arg('tu'); const den = arg('den'); const tep = arg('tep');
for (const [k, v] of [['tu', tu], ['den', den]]) {
  if (v && !NGAY.test(v)) { console.error(`--${k} phải dạng YYYY-MM-DD`); process.exit(2); }
}
const t = baoCaoShadow({ tu, den, ...(tep ? { tep } : {}) });

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(t, null, 2));
  process.exit(0);
}

const pct = (x) => (x == null ? '—' : `${(x * 100).toFixed(1)} %`);
const ms = (x) => (x == null ? '—' : `${x} ms`);
const dong = (k, v) => console.log(`  ${k.padEnd(44)} ${v}`);

console.log(`BÁO CÁO CHẠY BÓNG HỒ SƠ PHÂN LOẠI${tu || den ? ` (${tu || '…'} → ${den || '…'}, UTC)` : ''}`);
console.log(`  khoảng thời gian: ${t.tuLuc || '—'} → ${t.denLuc || '—'}`);
dong('Số lượt (mọi dòng)', `${t.soLuot}  (dòng hỏng bỏ qua: ${t.dongHong})`);
dong('Số lượt dựng được hồ sơ (áp dụng, không lỗi)', t.soLuotDung);
dong('Theo endpoint', JSON.stringify(t.theoEndpoint));
dong('Theo chế độ (shadow / thu = chạy thử nội bộ)', JSON.stringify(t.theoCheDo));
dong('Mã lát 1 được áp dụng', `${pct(t.lat1.tiLeApDung)} (${t.lat1.apDung} áp dụng / ${t.lat1.khongApDung} chưa có ranh giới duyệt)`);
console.log('\nKết luận hồ sơ (ketLuan.trangThai)');
for (const [k, v] of Object.entries(t.trangThai).sort((a, b) => b[1] - a[1])) dong(k, `${v} (${pct(t.tiLeTrangThai[k])})`);
dong('Bản nháp (banNhap)', `${t.banNhap.so}/${t.banNhap.n} (${pct(t.banNhap.tiLe)})`);
dong('Lý do bản nháp', JSON.stringify(t.lyDoBanNhap));
console.log('\nBộ viết');
dong('Yêu cầu LLM / máy', `${t.llm.yeuCauLlm} / ${t.llm.yeuCauMay}`);
dong('LLM rơi về bản máy', `${t.llm.rotVeMay} (${pct(t.llm.tiLeRotVeMay)})`);
dong('  trong đó máy loại bản LLM (llm-bi-loai)', `${t.llm.llmBiLoai} (${pct(t.llm.tiLeLlmBiLoai)})`);
dong('Tương đương (bản đạt)', `${t.tuongDuong.dat}/${t.tuongDuong.n} (${pct(t.tuongDuong.tiLe)})`);
console.log('\nKhớp dữ kiện quyết định: chuỗi mới vs mô tả cũ (chỉ số đếm)');
dong('Số lượt có so sánh', t.duKienQD.soLuot);
dong('Dữ kiện quyết định (tổng)', t.duKienQD.tong);
dong('Có trong chuỗi mới', `${t.duKienQD.moi} (${pct(t.duKienQD.tiLeMoi)})`);
dong('Có trong mô tả cũ', `${t.duKienQD.cu} (${pct(t.duKienQD.tiLeCu)})`);
dong('Có ở cả hai / chỉ mới / chỉ cũ', `${t.duKienQD.caHai} / ${t.duKienQD.chiMoiCo} / ${t.duKienQD.chiCuCo}`);
dong('Chuỗi mới trùng nguyên văn mô tả cũ (describe)', `${t.trungMoTaCu.co}/${t.trungMoTaCu.n}`);
console.log('\nThời gian (p50 / p95 / max)');
for (const [k, v] of Object.entries(t.thoiGian)) dong(`${k} (n=${v.n})`, `${ms(v.p50)} / ${ms(v.p95)} / ${ms(v.max)}`);
console.log('\nQuá hạn từng bước');
dong('Số lượt', JSON.stringify(t.quaHan));
dong('Tỉ lệ', JSON.stringify(Object.fromEntries(Object.entries(t.tiLeQuaHan).map(([k, v]) => [k, pct(v)]))));
dong('Lỗi tầng hồ sơ (đã rơi về đường cũ)', JSON.stringify(t.loi));
