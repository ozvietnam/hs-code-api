// Test bot sinh issue từ legal-status-miss.jsonl (#224/#209 bước 2)
import { gomMiss, locNhieu, docDongJsonl, thanhIssue } from './sinh-issue-miss.mjs';
let passed = 0, failed = 0;
const check = (n, c, d = '') => { if (c) { passed++; console.log('PASS', n); } else { failed++; console.error('FAIL', n, d); } };

// gomMiss: đếm đúng số lần + lần gần nhất
const gom = gomMiss([
  { ts: '2026-10-25T09:12:45.231Z', soHieu: ['1/2099/TT-BXX'] },
  { ts: '2026-10-25T10:42:24.741Z', soHieu: ['1/2099/TT-BXX'] },
  { ts: '2026-10-25T11:42:24.741Z', soHieu: ['1/2099/TT-BXX'] },
  { ts: '2026-10-26T08:27:38.174Z', soHieu: ['06/2011/TT-BYT', '99/2026/ND-CP'] },
  { ts: '2026-10-26T09:40:43.270Z', soHieu: ['06/2011/TT-BYT'] },
]);
check('gom: 3 số hiệu', gom.length === 3, JSON.stringify(gom));
check('gom: 06/2011/TT-BYT 2 lần, lanCuoi mới nhất',
  gom.find((x) => x.so === '06/2011/TT-BYT')?.soLan === 2 &&
  gom.find((x) => x.so === '06/2011/TT-BYT')?.lanCuoi === '2026-10-26T09:40:43.270Z');
check('gom: xếp nhu cầu giảm dần', gom[0].so === '1/2099/TT-BXX' && gom[0].soLan === 3 && gom[1].soLan === 2 && gom[2].soLan === 1);

// locNhieu: bỏ năm tương lai (query thử) + chuỗi ngắn vô nghĩa
const loc = locNhieu(gom, 2027);
check('lọc: bỏ 1/2099/TT-BXX (năm 2099)', !loc.some((x) => x.so === '1/2099/TT-BXX'));
check('lọc: giữ 06/2011/TT-BYT + 99/2026/ND-CP', loc.length === 2);
check('lọc: bỏ chuỗi ngắn vô nghĩa', locNhieu([{ so: 'A1', soLan: 1 }], 2027).length === 0);

// docDongJsonl: chịu dòng hỏng + dòng trống
const dong = docDongJsonl('{"ts":"t1","soHieu":["a/2020/QD-TTg"]}\n\n{hỏng}\n{"ts":"t2","soHieu":["b"]}\n');
check('jsonl: đọc 2 dòng tốt bỏ dòng hỏng', dong.length === 2);

// thanhIssue: có số hiệu, số lần, và cảnh báo đừng đóng
const md = thanhIssue({ so: '06/2011/TT-BYT', soLan: 2, lanCuoi: 't' });
check('issue: nhắc số hiệu + số lần + nguồn A + đừng đóng',
  md.includes('06/2011/TT-BYT') && md.includes('2 lần') && md.includes('nguồn A') && md.includes('đừng đóng'));

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
