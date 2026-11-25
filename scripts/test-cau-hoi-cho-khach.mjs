#!/usr/bin/env node
import './test-isolate-data.mjs';
// Câu hỏi cổng sổ tay gửi KHÁCH phải trả lời được bằng Có / Không; câu cho mô hình giải trình (challenge.questionVi) giữ nguyên.
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { cauHoiChoKhach, cauHoiSoTay } = require('../lib/so-tay-cau-hoi.js');
const { soTayGates } = require('../lib/so-tay-gates.js');

let pass = 0; let fail = 0;
const ca = (ten, dung, them = '') => { if (dung) { pass += 1; console.log(`PASS ${ten}`); } else { fail += 1; console.log(`FAIL ${ten} ${JSON.stringify(them).slice(0, 500)}`); } };
const NOI_BO = /trích nguyên văn|nêu đặc điểm|nêu bằng chứng|hồ sơ ghi|chọn nhóm khác/iu;

const ch = (gate, questionVi, them = {}) => ({ gate, h4: '9031', questionVi, reasonVi: '', ...them });
ca('loại trừ: câu có–không, nói rõ hai hướng',
  cauHoiChoKhach(ch('SO_TAY_LOAI_TRU', 'Hàng có thuộc diện "Cảm biến để điều khiển tự động" không? Nếu có → nhóm 90.32; nếu không → nêu đặc điểm (trích nguyên văn hồ sơ) cho thấy hàng KHÔNG thuộc diện loại trừ này.'))
    === 'Hàng có phải là "Cảm biến để điều khiển tự động" không? (Có → nhóm 90.32; Không → vẫn xét nhóm 90.31.)');
ca('loại trừ: nhiều nhóm đích giữ đủ',
  /Có → nhóm 85\.36 \/ 85\.41;/.test(cauHoiChoKhach(ch('SO_TAY_LOAI_TRU', 'Hàng có thuộc diện "x" không? Nếu có → nhóm 85.36 / 85.41; nếu không → nêu'))));
ca('ngưỡng: nói ngoại lệ bằng chữ',
  cauHoiChoKhach(ch('SO_TAY_NGUONG', 'Hồ sơ ghi 5, 7 kg — trái ngưỡng <= 3 của nhóm 90.31. Hàng có thuộc ngoại lệ không? Nếu không → chọn nhóm khác.', { reasonVi: 'Điều kiện vào nhóm 90.31: khoi_luong <= 3 kg, hồ sơ ghi 5 kg (ngoại lệ không giới hạn: loại A; loại B).' }))
    === 'Thông số hàng là 5, 7 kg, trong khi nhóm 90.31 yêu cầu không quá 3. Hàng có thuộc trường hợp ngoại lệ "loại A; loại B" không? (Có → vẫn xét nhóm 90.31; Không → xét nhóm khác.)');
ca('bộ phận: hai chiều đều thành câu có–không',
  /^Hàng có phải là bộ phận rời .*Có → xét dòng 84819021, 84819022;/.test(cauHoiChoKhach(ch('SO_TAY_BO_PHAN', 'Hàng là bộ phận rời hay máy/hàng hoàn chỉnh? Nếu là bộ phận → xét dòng 84819021, 84819022 (hoặc nhóm riêng của bộ phận đó theo quy tắc bộ phận).')))
  && /^Hàng có phải là thiết bị hoàn chỉnh .*Có → xét 84811011; Không → giữ 84819029\.\)$/.test(cauHoiChoKhach(ch('SO_TAY_BO_PHAN', 'Hàng là thiết bị hoàn chỉnh hay bộ phận rời? Nếu hoàn chỉnh → xét 84811011; nếu đúng là phụ tùng/vỏ/thân van rời thì giữ 84819029 và nêu bằng chứng.'))));
ca('CA NGƯỢC: cổng lạ hoặc khuôn câu lạ → giữ nguyên câu cũ',
  cauHoiChoKhach(ch('CONG_LA', 'Câu lạ?')) === 'Câu lạ?' && cauHoiChoKhach(ch('SO_TAY_LOAI_TRU', 'Khuôn khác?')) === 'Khuôn khác?');

// Quét thật: mọi dòng loại trừ có nhóm đích trong data/so-tay, dựng đúng câu mà cổng dựng, không câu nào lọt chữ nội bộ.
let soCau = 0; const lot = []; const giuCu = [];
for (const f of fs.readdirSync('data/so-tay').filter((x) => /^\d{4}\.json$/.test(x))) {
  const h4 = f.slice(0, 4);
  const s = JSON.parse(fs.readFileSync(`data/so-tay/${f}`, 'utf8'));
  const nhomDich = [...new Set((s.loaiTru || []).flatMap((it) => String(it.sangNhom).split(/[|,;\s]+/).map((c) => c.replace(/\D/g, '').slice(0, 4))).filter((c) => c.length === 4 && c !== h4))];
  if (!nhomDich.length) continue;
  const r = soTayGates({ hs: `${h4}00`, productText: 'hàng', pool: nhomDich.map((c) => ({ h4: c, from: 'test' })) }, { loaiTruRequire: 'pool', dong8: false });
  for (const c of r.challenges || []) {
    if (c.gate !== 'SO_TAY_LOAI_TRU') continue;
    soCau += 1;
    const q = cauHoiChoKhach(c);
    if (/trích nguyên văn hồ sơ|nêu bằng chứng|KHÔNG thuộc diện loại trừ/u.test(q)) lot.push(`${h4}: ${q.slice(0, 160)}`);
    if (q === c.questionVi) giuCu.push(`${h4}: ${q.slice(0, 160)}`);
  }
}
ca(`mọi câu loại trừ của sổ tay thật (${soCau} câu) đổi được sang câu khách trả lời được`, soCau > 1000 && !lot.length && !giuCu.length, { soCau, lot: lot.slice(0, 3), giuCu: giuCu.slice(0, 3) });

// Đầu-cuối: câu ra khách của ca cảm biến quang không còn chữ nội bộ; câu cho mô hình vẫn y như cũ.
const text = 'cảm biến quang e3sct11, điện áp 26v, nhận biết vật';
const noiBo = soTayGates({ hs: '90314990', productText: text }).challenges.filter((c) => c.gate === 'SO_TAY_LOAI_TRU');
const khach = cauHoiSoTay({ code: '90314990', productText: text, facts: {} }).questions.filter((q) => q.loai === 'CONG');
ca('ca cảm biến quang: có câu loại trừ ra khách và không câu nào mang chữ nội bộ', noiBo.length > 0 && khach.length > 0 && !khach.some((q) => NOI_BO.test(q.questionVi)), khach.map((q) => q.questionVi));
ca('câu cho mô hình giải trình giữ nguyên (không đổi prompt vòng 2)', noiBo.every((c) => /trích nguyên văn hồ sơ/u.test(c.questionVi)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
