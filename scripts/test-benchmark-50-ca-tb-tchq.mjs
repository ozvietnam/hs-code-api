#!/usr/bin/env node
// scripts/test-benchmark-50-ca-tb-tchq.mjs — Kiểm bộ đề 50 ca TB-TCHQ và bộ đo hồi quy no-LLM (OZV-550 / OZV-517).
import './test-isolate-data.mjs';

import {
  docBo50Ca,
  chamMotCa,
  tongHopKetQua,
  chayBoDo50Ca,
} from './benchmark-50-ca-tb-tchq.mjs';

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// 1. Kiểm bộ đề 50 ca trong tests/bo-50-ca-tb-tchq.json
const boDe = docBo50Ca();
check('bộ đề có đúng 50 ca', boDe.cases.length === 50, `length=${boDe.cases.length}`);
check(
  'mọi ca có mã 8 số hợp lệ, cauKhach và nguồn TB-TCHQ',
  boDe.cases.every((c) => /^\d{8}$/.test(c.ma) && c.cauKhach.length >= 10 && c.nguon?.loai === 'TB-TCHQ' && c.nguon?.soHieu),
);
check(
  'ảnh chụp Cổng OZ 12/11 khớp đúng 33/50 top-1, 40/50 top-3, 7/50 không ra mã',
  boDe.cases.filter((c) => c.cong1211.top1).length === 33
    && boDe.cases.filter((c) => c.cong1211.top3).length === 40
    && boDe.cases.filter((c) => !c.cong1211.maBot).length === 7,
);

// 2. Kiểm hàm chấm từng ca và tổng hợp 3 con số (top-1 đúng / top-3 đúng / không ra mã)
const caMau = boDe.cases[0]; // 12081000, maLan: ['21061000', '23040090']
const kqTop1 = chamMotCa(caMau, ['12081000', '12089000']);
check('chấm đúng top-1 (8 số)', kqTop1.top1 === true && kqTop1.top3 === true && kqTop1.khongRaMa === false);

const kqTop3 = chamMotCa(caMau, ['21061000', '12081000']);
check('chấm đúng top-3 (ở vị trí 2) và nhận diện mã dễ lẫn', kqTop3.top1 === false && kqTop3.top3 === true && kqTop3.top3Nhom4 === true && kqTop3.roiVaoMaLan === '21061000');

const kqDung6 = chamMotCa({ stt: 99, ma: '85072094', maLan: ['85072099'] }, ['85072099']);
check('chấm đúng cùng 6 số đầu nhưng lệch 2 số cuối', kqDung6.top1 === false && kqDung6.dung6So === true && kqDung6.roiVaoMaLan === '85072099');

const kqRong = chamMotCa(caMau, []);
check('chấm ca không ra mã', kqRong.top1 === false && kqRong.top3 === false && kqRong.khongRaMa === true);

const th = tongHopKetQua([kqTop1, kqTop3, kqRong]);
check('tổng hợp đúng top-1 / top-3 / không ra mã', th.tong === 3 && th.top1 === 1 && th.top3 === 2 && th.khongRaMa === 1);

// 3. Chạy thử 3 ca đầu qua bộ đo no-LLM (không gọi mạng, không tốn token)
const sampleRun = await chayBoDo50Ca({ limit: 3, skipSearch: true });
check(
  'chạy 3 ca đầu qua classifyLoop (no-LLM replay 12/11) và searchPrecedents (no-LLM)',
  sampleRun.soCa === 3
    && sampleRun.classifyLoopReplay1211.tomTat.top1 === 3
    && sampleRun.classifyLoopReplay1211.tomTat.khongRaMa === 0
    && sampleRun.searchPrecedents.tomTat.top1 === 3,
  JSON.stringify({
    loop: sampleRun.classifyLoopReplay1211.tomTat,
    prec: sampleRun.searchPrecedents.tomTat,
  }),
);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
