#!/usr/bin/env node
/**
 * scripts/test-mo-rong-ung-vien.mjs — Kiểm tra luật khớp có dấu & tách mệnh đề của `moRongUngVien` (PR D2):
 *   1. Không khớp oan chỉ 1 từ hoặc khác dấu ("giấy"/"giày", "đồng"/"động", "máy"/"may").
 *   2. Không cắt đôi cụm "hoặc" sau vị ngữ ("có hoặc không ngâm tẩm, tráng, phủ"), không mở ngoặc ngoại lệ ("không phải…").
 *   3. Tách đúng danh từ bao gói ("khối lọc") hoặc chủ ngữ câu định nghĩa dài ("Đầu chiếu tia laser là…").
 *   4. Bỏ qua C6 khi điều kiện chỉ nêu nhóm nguồn ("thuộc nhóm <e.tu>").
 *   5. Nối vào `timTruoc` chỉ sau cờ mặc định tắt `HS_TIM_TRUOC=goi` (tắt hoặc `on` giữ nguyên đầu ra, không nạp bangCanh).
 */
import './test-isolate-data.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../lib/do-thi/index.js');
const tt = require('../lib/tim-truoc.js');
const ozSearch = require('../lib/oz-precedent-search.js');

D.bangCanh();

let passed = 0;
function ok(name, cond, detail = '') {
  assert.ok(cond, detail ? `${name}: ${detail}` : name);
  passed += 1;
  console.log(`PASS ${name}`);
}

// 1. Chặn khớp 1 từ / lạc đề
ok(
  'không kéo oan 8481 từ 8412 khi chỉ trùng từ "van" trong "van điện từ khí nén"',
  !D.moRongUngVien(['8412'], 'van điện từ khí nén 5/2, cuộn coil 24VDC').some((x) => x.nhom === '8481'),
);
ok(
  'kéo đúng 8481 từ 8412 khi mô tả khớp điều kiện "Van trượt cho động cơ hơi nước"',
  D.moRongUngVien(['8412'], 'van trượt cho động cơ hơi nước').some((x) => x.nhom === '8481' && x.loai === 'C6'),
);

// 2. Giữ dấu tiếng Việt ("giấy" ≠ "giày", "đồng" ≠ "động")
ok(
  'giữ dấu: "giày thể thao" không kéo cạnh điều kiện chứa "giấy"',
  !D.moRongUngVien(['6404'], 'Giày thể thao đế cao su').some((x) => /giấy/.test(x.dieuKien || '') && !/giày/.test(x.dieuKien || '')),
);

// 3. Không biến ngoặc "(không phải …)" hay "(trừ …)" thành mệnh đề dương tính
ok(
  'ngoặc "(không phải …)" không kéo oan 5907 -> 5909 hoặc 8714 -> 9405',
  !D.moRongUngVien(['5907'], 'Vải dệt được ngâm tẩm, tráng hoặc phủ với dầu dùng đóng gói hàng hóa').some((x) => x.nhom === '5909')
    && !D.moRongUngVien(['8714'], 'Yên xe máy bọc da tổng hợp dùng cho xe môtô').some((x) => x.nhom === '9405'),
);

// 4. Bỏ từ bao gói ("Các khối lọc làm bằng bột giấy" -> 4812) và câu định nghĩa dài ("Đầu chiếu tia laser là…")
ok(
  'bỏ từ bao gói "khối": "lõi lọc làm bằng bột giấy" từ 8421 kéo được 4812',
  D.moRongUngVien(['8421'], 'Lõi lọc làm bằng bột giấy').some((x) => x.nhom === '4812'),
);
ok(
  'câu định nghĩa dài "Đầu chiếu tia laser là…": từ 8543 kéo được 9013',
  D.moRongUngVien(['8543'], 'Đầu chiếu tia laser chiếu tia sáng đỏ').some((x) => x.nhom === '9013'),
);

// 5. Nối vào timTruoc sau cờ mặc định tắt HS_TIM_TRUOC=goi
ozSearch.searchOzByKeyword = async () => ({ items: [] });
const origGoi = process.env.HS_TIM_TRUOC;
const origNap = process.env.HS_TIM_TRUOC_NAP;
try {
  process.env.HS_TIM_TRUOC = 'on';
  delete process.env.HS_TIM_TRUOC_NAP;
  const kOn = await tt.timTruoc({ tenHang: 'Van trượt cho động cơ hơi nước' });
  ok(
    'HS_TIM_TRUOC=on không tự gọi moRongUngVien (không đổi đầu ra so với trước)',
    !('moRong' in kOn.tomTat) && !kOn.tomTat.nhom.includes('8481'),
    JSON.stringify(kOn.tomTat),
  );

  process.env.HS_TIM_TRUOC = 'goi';
  delete process.env.HS_TIM_TRUOC_NAP;
  const kGoiNap0 = await tt.timTruoc({ tenHang: 'Van trượt cho động cơ hơi nước' });
  ok(
    'HS_TIM_TRUOC=goi với NAP=0 giữ khối vòng 1 trùng hệt on',
    kGoiNap0.khoi === kOn.khoi && !('moRong' in kGoiNap0.tomTat),
  );

  process.env.HS_TIM_TRUOC = 'goi';
  process.env.HS_TIM_TRUOC_NAP = '2';
  const kGoi = await tt.timTruoc({ tenHang: 'Van trượt cho động cơ hơi nước' });
  ok(
    'HS_TIM_TRUOC=goi + NAP=2 mở rộng thêm nhóm C5/C6 khi điều kiện khớp (≤ 3 nhóm, không rơi nhóm top-5)',
    kOn.tomTat.nhom.slice(0, 5).every((h, i) => kGoi.tomTat.nhom[i] === h)
      && (kGoi.tomTat.moRong?.length || 0) >= 1
      && (kGoi.tomTat.moRong?.length || 0) <= 3
      && kGoi.tomTat.nhom.includes('8481')
      && kGoi.nhomNap.includes('8481'),
    JSON.stringify({ onNhom: kOn.tomTat.nhom, goiNhom: kGoi.tomTat.nhom, moRong: kGoi.tomTat.moRong, nap: kGoi.nhomNap }),
  );
} finally {
  if (origGoi === undefined) delete process.env.HS_TIM_TRUOC; else process.env.HS_TIM_TRUOC = origGoi;
  if (origNap === undefined) delete process.env.HS_TIM_TRUOC_NAP; else process.env.HS_TIM_TRUOC_NAP = origNap;
}

console.log(`\n${passed}/${passed} passed, 0 failed`);
