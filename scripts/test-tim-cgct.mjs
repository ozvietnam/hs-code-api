#!/usr/bin/env node
/**
 * scripts/test-tim-cgct.mjs — Tự kiểm cho HS_TIM_CGCT + lib/tim-cgct.js (#1645 Việc 1).
 *
 * Chứng minh:
 *   1) Công tắc HS_TIM_CGCT mặc định TẮT; bật chỉ bằng "on" / "1" / "true".
 *   2) Khi TẮT: timTruoc chạy y như cũ (top 5, không nạp tim-cgct, không trường tomTat.cgct, đầu ra trùng từng byte).
 *   3) Khi BẬT: tìm thêm trong tên nhóm, CGCT, Explanatory Notes, biểu thuế Việt/Anh & đồ thị phân biệt;
 *      nâng trần ứng viên lên TOP_NHOM_CGCT = 10, giữ tổng khối <= TRAN_KY_TU = 1500, tách chuẩn ' / ' mà vẫn
 *      giữ nguyên dạng phân số như "5/2", hoạt động cả với luồng tiền xử lý + có ca ngược.
 *   4) Nếu bộ chuẩn data/bo-chuan/4so-v1.jsonl có mặt trên đĩa thì đo recall BẬT đạt 100%.
 */
import './test-isolate-data.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

for (const k of ['HS_TIM_TRUOC', 'HS_TIM_TRUOC_NAP', 'HS_TIM_CGCT', 'HS_TIEN_XU_LY', 'HS_SO_TAY', 'HS_TRADE_SYNONYMS']) {
  delete process.env[k];
}

// Cô lập kho Oz giống test-tim-truoc theo đúng hợp đồng { items } và lưu hàm gốc để khôi phục trước mục 5.
const ozSearch = require('../lib/oz-precedent-search.js');
const origOzSearch = ozSearch.searchOzByKeyword;
const OZ_MAU = [
  { hsCode: '84812090', tenHang: 'Van điều khiển khí nén 5/2 bằng nhôm', ozCount: 17, matchCoverage: 100 },
];
ozSearch.searchOzByKeyword = async () => ({ items: OZ_MAU });

const tt = require('../lib/tim-truoc.js');
const cg = require('../lib/tim-cgct.js');
const embedPool = require('../lib/embed-pool.js');
embedPool.timTheoNghia = async () => null;

let pass = 0;
let fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`PASS  ${name}`); }
  else { fail += 1; console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

// 1. Công tắc HS_TIM_CGCT
check('công tắc CGCT mặc định TẮT', tt.batCgct() === false && tt.TOP_NHOM_CGCT === 10);
for (const v of ['on', '1', 'true', 'ON']) {
  process.env.HS_TIM_CGCT = v;
  check(`công tắc CGCT: "${v}" → bật`, tt.batCgct() === true);
}
for (const v of ['off', '0', 'false', '', 'shadow']) {
  process.env.HS_TIM_CGCT = v;
  check(`công tắc CGCT: "${v}" → tắt`, tt.batCgct() === false);
}
delete process.env.HS_TIM_CGCT;

// 2. Đường TẮT giữ nguyên từng byte
const offUnset = await tt.timTruoc({ tenHang: 'Van điện từ khí nén 5/2, model 4V210-08' });
process.env.HS_TIM_CGCT = 'off';
const offExplicit = await tt.timTruoc({ tenHang: 'Van điện từ khí nén 5/2, model 4V210-08' });
delete process.env.HS_TIM_CGCT;

check(
  'TẮT: HS_TIM_CGCT=off trùng hệt với không đặt biến môi trường',
  offUnset.khoi === offExplicit.khoi
    && JSON.stringify({ ...offUnset.tomTat, ms: 0 }) === JSON.stringify({ ...offExplicit.tomTat, ms: 0 })
    && offUnset.tomTat.nhom.length <= 5
    && !('cgct' in offUnset.tomTat)
    && !Object.values(offUnset.tomTat.nguon).some((arr) => arr.includes('cgct')),
  JSON.stringify(offUnset.tomTat),
);

// 3. Cơ chế lib/tim-cgct.js + hợp nhất ứng viên
{
  const idx = cg.xayChiMuc();
  check('chỉ mục CGCT: nạp đủ > 900 nhóm hợp lệ', idx.validHeadings.size > 900, String(idx.validHeadings.size));

  // Đồng nghĩa thương mại + Explanatory Notes ("máy ép hoa quả" / "wire rope")
  const rEp = cg.timCgct('Dụng cụ ép trái cây không dùng điện', 'Dụng cụ ép trái cây');
  check('CGCT đồng nghĩa: "ép trái cây" tìm ra 8210 trong top 10', rEp.nhom.slice(0, 10).includes('8210'), rEp.nhom.slice(0, 10).join(','));

  const rWire = cg.timCgct('Dây cáp thép mạ kẽm (wire rope)', 'Dây cáp thép');
  check('CGCT Anh-Việt: "wire rope" tìm ra 7312 trong top 5', rWire.nhom.slice(0, 5).includes('7312'), rWire.nhom.slice(0, 5).join(','));

  // Phủ định kép / sau "không": "găng tay cao su không dệt kim"
  const rGang = cg.timCgct('Găng tay bảo hộ không dệt kim, bằng cao su', 'Găng tay bảo hộ');
  check('CGCT gấp phủ định: "không dệt kim" vẫn giữ 4015 cao su lên đầu', rGang.nhom.slice(0, 5).includes('4015'), rGang.nhom.slice(0, 5).join(','));

  // Đồ thị phân biệt + nhóm tồn đọng chức năng riêng
  const rChucNangRieng = cg.timCgct('Máy làm sạch bề mặt bằng sóng siêu âm, có chức năng riêng chuyên dùng công nghiệp');
  const hopAll = () => true;
  const fused = cg.hopNhatUngVienCgct({
    baseRanked: [['8419', 0.2], ['8424', 0.19], ['8456', 0.18], ['8460', 0.17], ['8465', 0.16]],
    cgRes: rChucNangRieng,
    cauGoc: 'Máy làm sạch bề mặt bằng sóng siêu âm, có chức năng riêng',
    hop: hopAll,
    topK: 10,
  });
  check('CGCT đồ thị & nhóm chức năng riêng: bổ sung tối đa 10 ứng viên gồm 8479', fused.length <= 10 && fused.includes('8479'), fused.join(','));
}

// 4. Khi BẬT trên timTruoc (cơ chế end-to-end không AI)
process.env.HS_TIM_CGCT = 'on';
{
  const kOn = await tt.timTruoc({ tenHang: 'Van điện từ khí nén 5/2, model 4V210-08' });
  check(
    'BẬT: giữ tối đa 10 ứng viên, không vượt TRAN_KY_TU, giữ "5/2" không tách nhầm slash',
    kOn.tomTat.nhom.length > 5
      && kOn.tomTat.nhom.length <= 10
      && kOn.tomTat.cgct === true
      && kOn.tomTat.tenNgan === 'Van điện từ khí nén'
      && kOn.khoi.length <= tt.TRAN_KY_TU
      && kOn.tomTat.nguon['8481']?.includes('cgct'),
    JSON.stringify({ len: kOn.tomTat.nhom.length, tenNgan: kOn.tomTat.tenNgan, nguon8481: kOn.tomTat.nguon['8481'] }),
  );

  // So sánh dạng chuỗi 'A / B / C' với dạng đã tách {tenHang, chatLieu, congDung}
  const sRaw = await tt.timTruoc({ tenHang: 'Găng tay vệ sinh / vải dệt kim / lau rửa' });
  const sSplit = await tt.timTruoc({ tenHang: 'Găng tay vệ sinh', chatLieu: 'vải dệt kim', congDung: 'lau rửa' });
  check(
    'BẬT tách dấu " / ": chuỗi gộp và hồ sơ đã tách cho tập nhóm + tenNgan giống nhau',
    sRaw.tomTat.tenNgan === sSplit.tomTat.tenNgan
      && JSON.stringify(sRaw.tomTat.nhom) === JSON.stringify(sSplit.tomTat.nhom)
      && (sRaw.tomTat.nhom.includes('6116') || sRaw.tomTat.nhom.includes('6302')),
    JSON.stringify({ raw: sRaw.tomTat.nhom, split: sSplit.tomTat.nhom }),
  );

  // CA NGƯỢC 1: đổi mặt hàng -> ứng viên đổi hẳn theo mặt hàng mới
  const kKhac = await tt.timTruoc({ tenHang: 'Ống kính máy ảnh chuyên dụng, vỏ kim loại' });
  check('CA NGƯỢC: đổi mặt hàng sang ống kính → 9002 xuất hiện, không bám 8481/6116', kKhac.tomTat.nhom.includes('9002') && !kKhac.tomTat.nhom.includes('6116'), kKhac.tomTat.nhom.join(','));

  // CA NGƯỢC 2: tên chữ Hán vẫn BỎ QUA có lý do (L6)
  const kHan = await tt.timTruoc({ tenHang: '气动电磁阀 4V210-08' });
  check('CA NGƯỢC: tên chữ Hán khi BẬT vẫn BO_QUA_TEN_CHU_HAN', kHan.tomTat.trangThai === 'BO_QUA_TEN_CHU_HAN' && kHan.khoi === '');

  // Luồng kết hợp HS_TIEN_XU_LY + HS_TIM_CGCT
  process.env.HS_TIEN_XU_LY = 'on';
  const kTxl = await tt.timTruoc({ tenHang: 'Van điện từ khí nén / Nhôm / Điều khiển xi lanh' });
  delete process.env.HS_TIEN_XU_LY;
  check('BẬT cùng HS_TIEN_XU_LY: xuất tomTat.cgct === true và 8481 trong ứng viên', kTxl.tomTat.cgct === true && kTxl.tomTat.nhom.includes('8481'), JSON.stringify(kTxl.tomTat.nhom));
}

// 5. Kiểm tra có điều kiện nếu data/bo-chuan/4so-v1.jsonl đã gộp về nhánh chính (khôi phục kho Oz thật)
ozSearch.searchOzByKeyword = origOzSearch;
const boChuanPath = new URL('../data/bo-chuan/4so-v1.jsonl', import.meta.url);
if (fs.existsSync(boChuanPath)) {
  const rows = fs.readFileSync(boChuanPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
  let hit = 0;
  for (const row of rows) {
    const res = await tt.timTruoc({ tenHang: row.moTa });
    const set = new Set(res.tomTat.nhom);
    const targets = row.ketQua === 'PHAN_VAN' ? row.nhom : [row.nhom[0]];
    if (targets.every((h) => set.has(h))) hit += 1;
  }
  check(`Bộ chuẩn 4so-v1.jsonl trên đĩa: recall CGCT BẬT đạt 100% (${hit}/${rows.length})`, hit === rows.length, `${hit}/${rows.length}`);
} else {
  console.log('INFO  data/bo-chuan/4so-v1.jsonl chưa gộp từ #1644 — bỏ qua bước chấm 100 ca trong CI.');
}

delete process.env.HS_TIM_CGCT;
assert.equal(tt.batCgct(), false);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
