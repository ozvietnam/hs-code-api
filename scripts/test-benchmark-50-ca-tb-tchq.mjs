#!/usr/bin/env node
// scripts/test-benchmark-50-ca-tb-tchq.mjs — Kiểm bộ đề 50 ca TB-TCHQ, scorer, cổng --gate và bài kiểm mutate làm đỏ cổng (OZV-550 / OZV-517).
import './test-isolate-data.mjs';
import { createRequire } from 'node:module';

import {
  docBo50Ca,
  chamMotCa,
  tongHopKetQua,
  tongHopReplay1211,
  rutUngVienTuUserPack,
  chayClassifyLoopReplayMotCa,
  chayBoDo50Ca,
  kiemCong50Ca,
} from './benchmark-50-ca-tb-tchq.mjs';

const require = createRequire(import.meta.url);
const { taxData } = require('../lib/data.js');
const kiemTruocChotMod = require('../lib/kiem-truoc-chot.js');

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

// 1. Kiểm bộ đề 50 ca trong tests/bo-50-ca-tb-tchq.json và đánh số stt 1..50 cố định
const boDe = docBo50Ca();
check(
  'bộ đề có đúng 50 ca và đánh số stt 1..50 cố định, không trùng',
  boDe.cases.length === 50 && boDe.cases.every((c, idx) => c.stt === idx + 1),
  `length=${boDe.cases.length}`,
);
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

// 2. Kiểm scorer thật: outcome đổi ⇒ điểm đổi (top-1 → top-3 → sai cùng 6 số/mã dễ lẫn → không ra mã)
const caMau = boDe.cases[0]; // stt=1, ma='12081000', maLan=['21061000', '23040090']
const kqTop1 = chamMotCa(caMau, ['12081000', '12089000']);
check('chấm đúng top-1 (8 số)', kqTop1.top1 === true && kqTop1.top3 === true && kqTop1.khongRaMa === false);

const kqTop3 = chamMotCa(caMau, ['21061000', '12081000']);
check(
  'chấm đúng top-3 (ở vị trí 2) và nhận diện mã dễ lẫn',
  kqTop3.top1 === false && kqTop3.top3 === true && kqTop3.top3Nhom4 === true && kqTop3.roiVaoMaLan === '21061000',
);

const kqDung6 = chamMotCa({ stt: 39, ma: '85072094', maLan: ['85072099'] }, ['85072099']);
check(
  'chấm đúng cùng 6 số đầu nhưng lệch 2 số cuối',
  kqDung6.top1 === false && kqDung6.top3 === false && kqDung6.dung6So === true && kqDung6.roiVaoMaLan === '85072099',
);

const kqRong = chamMotCa(caMau, []);
check('chấm ca không ra mã', kqRong.top1 === false && kqRong.top3 === false && kqRong.khongRaMa === true);

const thTruoc = tongHopReplay1211([kqTop1, kqTop3, kqDung6, kqRong]);
const thSauKhiDoiOutcome = tongHopReplay1211([
  chamMotCa(caMau, ['21061000', '12081000']), // hạ ca 1 từ top-1 xuống top-3
  chamMotCa(caMau, []), // hạ ca 2 từ top-3 xuống không ra mã
  chamMotCa({ stt: 39, ma: '85072094', maLan: ['85072099'] }, ['85072094']), // nâng ca 39 từ sai lên top-1
  kqRong,
]);
check(
  'scorer thật: khi outcome từng ca đổi thì top1SoSongSot / top3SoSongSot / khongRaMa / dung6So / roiVaoMaLan đổi tương ứng',
  thTruoc.tong === 4
    && thTruoc.top1SoSongSot === 1
    && thTruoc.top3SoSongSot === 2
    && thTruoc.khongRaMa === 1
    && thTruoc.dung6So === 1
    && thTruoc.roiVaoMaLan === 2
    && !('top1' in thTruoc)
    && thSauKhiDoiOutcome.top1SoSongSot === 1
    && thSauKhiDoiOutcome.top3SoSongSot === 2
    && thSauKhiDoiOutcome.khongRaMa === 2
    && thSauKhiDoiOutcome.dung6So === 0
    && thSauKhiDoiOutcome.roiVaoMaLan === 1,
  JSON.stringify({ thTruoc, thSauKhiDoiOutcome }),
);

// 3. Kiểm rút ứng viên từ gói _user (gather) không đọc ca.ma
const ungVienPack = rutUngVienTuUserPack(
  'CHÚ GIẢI & DÒNG BIỂU THUẾ:\n    39191092 Dòng A\n    39199099 Dòng B\n\nTIỀN LỆ TB-TCHQ:\n39199092 — Màng nhựa (123/TB-TCHQ)\n\nTIỀN LỆ OZ:',
  '39191092',
);
check(
  'rutUngVienTuUserPack ưu tiên mã từ TIỀN LỆ TB-TCHQ rồi tới dòng biểu thuế trong _user',
  ungVienPack[0] === '39199092' && ungVienPack[1] === '39199099' && !ungVienPack.includes('39191092'),
  JSON.stringify(ungVienPack),
);

// 4. Chạy tập 6 ca ĐA DẠNG kết cục qua đủ cả 3 đường (replay1211 + searchCandidates + searchPrecedents):
//    - #1 (12081000): top-1 sống sót + searchCandidates trúng top-1
//    - #9 (39073030, maBot=32082090): trượt top-1, được kiemTruocChot cứu vào top-3
//    - #10 (39199092, maBot=39191092): trượt top-1, được gather (_user) đưa vào top-3
//    - #14 (42029190, maBot=42023200): trượt top-1, được kiemTruocChot cứu vào top-3
//    - #24 (72082600, maBot=null): NEED_FACTS -> không ra mã
//    - #39 (85072094, maBot=85072099): sai mã 8 số (cùng 6 số đầu, rơi vào mã dễ lẫn)
const diverseRun = await chayBoDo50Ca({ sttList: [1, 9, 10, 14, 24, 39], skipSearch: false });
const byStt = Object.fromEntries(diverseRun.replay1211.chiTiet.map((r) => [r.stt, r]));
check(
  'chạy 6 ca đa dạng kết cục qua replay1211 + searchCandidates + searchPrecedents (không phải echo)',
  diverseRun.soCa === 6
    && byStt[1]?.top1 === true
    && byStt[9]?.top1 === false && byStt[9]?.top3 === true && byStt[9]?.dsMa[1] === '39073030'
    && byStt[10]?.top1 === false && byStt[10]?.top3 === true && byStt[10]?.dsMa[1] === '39199092'
    && byStt[14]?.top1 === false && byStt[14]?.top3 === true && byStt[14]?.dsMa[1] === '42029190'
    && byStt[24]?.khongRaMa === true
    && byStt[39]?.top1 === false && byStt[39]?.top3 === false && byStt[39]?.dung6So === true && byStt[39]?.roiVaoMaLan === '85072099'
    && diverseRun.replay1211.tomTat.top1SoSongSot === 1
    && diverseRun.replay1211.tomTat.top3SoSongSot === 4
    && diverseRun.replay1211.tomTat.khongRaMa === 1
    && diverseRun.searchCandidates.tomTat.tong === 6
    && diverseRun.searchCandidates.tomTat.top1Nhom4 === 1
    && diverseRun.searchPrecedents.tomTat.top1 === 6,
  JSON.stringify({ replay: diverseRun.replay1211.tomTat, search: diverseRun.searchCandidates?.tomTat }),
);

// 5. Kiểm cổng --gate chặt: ép tong === 50 và không bỏ qua searchCandidates
function taoKetQua50Chuan() {
  return {
    boDe,
    soCa: 50,
    replay1211: {
      tomTat: { tong: 50, top1SoSongSot: 33, top3SoSongSot: 42, khongRaMa: 7 },
    },
    searchPrecedents: {
      tomTat: { tong: 50, top1: 50, top3: 50, khongRaMa: 0 },
    },
    searchCandidates: {
      tomTat: { tong: 50, top1: 2, top3: 3, khongRaMa: 0, top1Nhom4: 10, top3Nhom4: 12 },
    },
  };
}

const gateChuan = kiemCong50Ca(taoKetQua50Chuan());
check(
  'kiemCong50Ca ĐẠT khi đủ 50 ca và đạt mọi ngưỡng chuẩn',
  gateChuan.length === 8 && gateChuan.every((c) => c.ok),
  JSON.stringify(gateChuan),
);

const gateThieuCa = kiemCong50Ca(diverseRun); // soCa = 6 !== 50
check(
  'kiemCong50Ca ĐỎ ngay khi tong !== 50 (vd chạy --limit hoặc thiếu ca)',
  gateThieuCa.some((c) => !c.ok && c.name.includes('tong === 50')),
  JSON.stringify(gateThieuCa),
);

const gateThuaCa = kiemCong50Ca({
  ...taoKetQua50Chuan(),
  soCa: 51,
  replay1211: { tomTat: { tong: 51, top1SoSongSot: 34, top3SoSongSot: 43, khongRaMa: 7 } },
});
check(
  'kiemCong50Ca ĐỎ ngay khi thừa ca (tong = 51 !== 50)',
  gateThuaCa.filter((c) => !c.ok).length >= 4,
  JSON.stringify(gateThuaCa),
);

const gateThieuSearch = kiemCong50Ca({ ...taoKetQua50Chuan(), searchCandidates: null });
check(
  'kiemCong50Ca ĐỎ ngay khi thiếu searchCandidates (không có nhánh if(s) im lặng)',
  gateThieuSearch.filter((c) => !c.ok).length === 4,
  JSON.stringify(gateThieuSearch),
);

// 6. BÀI KIỂM MUTATE CÓ KIỂM SOÁT (Quy tắc 5 OZV-290 / OZV-310):
//    (6a) Tắt `kiemTruocChot` -> ca #9 (39073030) và #14 (42029190) mất mã cứu hộ ở results[1]
//         -> replay1211.top3SoSongSot tụt từ 42/50 xuống 40/50 -> kiemCong50Ca ĐỎ!
const ca9 = boDe.cases.find((c) => c.stt === 9);
const ca14 = boDe.cases.find((c) => c.stt === 14);
const origKiemTruocChot = kiemTruocChotMod.kiemTruocChot;
let kqCa9Mutated;
let kqCa14Mutated;
try {
  kiemTruocChotMod.kiemTruocChot = () => ({ coCo: false, canhBao: [], deXuat: [] });
  kqCa9Mutated = chamMotCa(ca9, await chayClassifyLoopReplayMotCa(ca9));
  kqCa14Mutated = chamMotCa(ca14, await chayClassifyLoopReplayMotCa(ca14));
} finally {
  kiemTruocChotMod.kiemTruocChot = origKiemTruocChot;
}
const deltaTop3 = (byStt[9].top3 ? 1 : 0) + (byStt[14].top3 ? 1 : 0) - ((kqCa9Mutated.top3 ? 1 : 0) + (kqCa14Mutated.top3 ? 1 : 0));
const resSauKhiTatKiemTruocChot = taoKetQua50Chuan();
resSauKhiTatKiemTruocChot.replay1211.tomTat.top3SoSongSot -= deltaTop3; // 42 -> 40
const gateMutateKiemTruocChot = kiemCong50Ca(resSauKhiTatKiemTruocChot);
check(
  'MUTATE 1 (tắt kiemTruocChot): ca #9 và #14 rớt khỏi top-3 -> top3SoSongSot tụt 42/50 xuống 40/50 -> cổng --gate ĐỎ',
  byStt[9].top3 === true && kqCa9Mutated.top3 === false
    && byStt[14].top3 === true && kqCa14Mutated.top3 === false
    && resSauKhiTatKiemTruocChot.replay1211.tomTat.top3SoSongSot === 40
    && gateMutateKiemTruocChot.some((c) => !c.ok && c.name.includes('replay1211.top3SoSongSot') && c.actual === '40/50'),
  JSON.stringify({
    truoc: { ca9: byStt[9].dsMa, ca14: byStt[14].dsMa, top3SoSongSot: 42 },
    sau: { ca9: kqCa9Mutated.dsMa, ca14: kqCa14Mutated.dsMa, top3SoSongSot: resSauKhiTatKiemTruocChot.replay1211.tomTat.top3SoSongSot },
  }),
);

//    (6b) Chặn Gate G1 `MA_KHONG_TON_TAI` trên ca #1 (12081000)
//         -> ca #1 bị gate chặn không ra mã -> top1SoSongSot tụt 33/50 xuống 32/50, khongRaMa tăng 7/50 lên 8/50 -> cổng --gate ĐỎ!
const ca1 = boDe.cases.find((c) => c.stt === 1);
const origTax12081000 = taxData['12081000'];
let kqCa1Mutated;
try {
  delete taxData['12081000'];
  kqCa1Mutated = chamMotCa(ca1, await chayClassifyLoopReplayMotCa(ca1));
} finally {
  taxData['12081000'] = origTax12081000;
}
const resSauKhiChanGateG1 = taoKetQua50Chuan();
resSauKhiChanGateG1.replay1211.tomTat.top1SoSongSot -= (byStt[1].top1 ? 1 : 0) - (kqCa1Mutated.top1 ? 1 : 0); // 33 -> 32
resSauKhiChanGateG1.replay1211.tomTat.khongRaMa += (kqCa1Mutated.khongRaMa ? 1 : 0) - (byStt[1].khongRaMa ? 1 : 0); // 7 -> 8
const gateMutateG1 = kiemCong50Ca(resSauKhiChanGateG1);
check(
  'MUTATE 2 (chặn gate G1 trên ca #1 12081000): top1SoSongSot tụt 33/50 xuống 32/50, khongRaMa tăng 7/50 lên 8/50 -> cổng --gate ĐỎ',
  byStt[1].top1 === true && kqCa1Mutated.top1 === false && kqCa1Mutated.khongRaMa === true
    && resSauKhiChanGateG1.replay1211.tomTat.top1SoSongSot === 32
    && resSauKhiChanGateG1.replay1211.tomTat.khongRaMa === 8
    && gateMutateG1.filter((c) => !c.ok).length === 2,
  JSON.stringify({
    truoc: { ca1: byStt[1].dsMa, top1SoSongSot: 33, khongRaMa: 7 },
    sau: { ca1: kqCa1Mutated.dsMa, top1SoSongSot: resSauKhiChanGateG1.replay1211.tomTat.top1SoSongSot, khongRaMa: resSauKhiChanGateG1.replay1211.tomTat.khongRaMa },
  }),
);

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
