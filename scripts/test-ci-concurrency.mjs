#!/usr/bin/env node
/**
 * Cổng giữ cấu hình CI khỏi tự đốt công suất runner (OZV-355).
 *
 * Hai lỗi đã đo thật lúc 00:30 VN 12/11/2026, trên 154 lượt CI đang sống thì
 * 115 lượt (75%) là rác:
 *
 *   1. `test-all.yml` bắt TRÙNG `push: branches: [..., 'claude/**']` và
 *      `pull_request:` ⇒ nhánh thợ (tên `claude/**`) push một lần sinh HAI lượt
 *      "Full test suite" y hệt nhau, cùng SHA, cùng kết quả. 44 lượt `push`
 *      trong hàng là rác thuần.
 *   2. KHÔNG workflow nào theo `push`/`pull_request` có khối `concurrency`
 *      ⇒ push mới không huỷ lượt của SHA cũ. Nhánh `claude/duyet-L31` có 3 SHA
 *      còn trong hàng nhưng HEAD chỉ là 1 ⇒ 2/3 là rác.
 *
 * Luật test này giữ ba điều, để lần sau thêm workflow mới không tái phát:
 *   a. Mọi workflow chạy theo `pull_request` hoặc `push` phải có `concurrency`
 *      ở cấp cao nhất, group gộp theo workflow + (số PR || ref).
 *   b. `cancel-in-progress` của workflow chạy trên `push` phải CHỪA main
 *      (`${{ github.ref != 'refs/heads/main' }}`): tự huỷ lượt của commit đã gộp
 *      là mất dấu xanh trên main ⇒ hỏng số đo "main xanh".
 *   c. `push.branches` không được bắt nhánh thợ (`claude/**`, `ozv-*`…): nhánh
 *      thợ theo luật OZ phải mở PR mới coi là xong, nên `pull_request` phủ đủ.
 *
 * Không dùng thư viện YAML (repo chỉ có 3 devDependencies) — mấy tệp workflow
 * này thụt lề 2 dấu cách đều, đọc theo dòng là đủ và không thêm phụ thuộc.
 */
import fs from 'fs';
import path from 'path';

const DIR = '.github/workflows';
const CANCEL_CHUA_MAIN = "${{ github.ref != 'refs/heads/main' }}";
// Nhánh thợ do agent mở: đã có PR nên `pull_request` phủ đủ, bắt thêm `push` là
// nhân đôi lượt test.
const NHANH_THO = [/claude\//, /ozv-/i, /\*\*/];

let fail = 0;
const check = (ten, ok, chiTiet) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${ten}`);
  if (!ok) {
    if (chiTiet) console.log(`     → ${chiTiet}`);
    fail += 1;
  }
};

/**
 * Trả về các dòng của khối con nằm dưới `khoa:` ở cấp cao nhất (cột 0).
 * Ví dụ docCon(lines, 'on') → mọi dòng thụt lề của khối `on:`.
 */
function docCon(lines, khoa) {
  const dau = lines.findIndex((l) => l === `${khoa}:` || l.startsWith(`${khoa}:`) && !l.startsWith(' '));
  if (dau === -1) return null;
  const ra = [];
  for (let i = dau + 1; i < lines.length; i += 1) {
    const l = lines[i];
    if (l.trim() === '' || l.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(l)) break; // sang khoá cấp cao nhất kế tiếp
    ra.push(l);
  }
  return ra;
}

/** Các khoá sự kiện ở ngay trong khối `on:` (thụt lề 2 dấu cách). */
function suKien(onLines) {
  return (onLines || [])
    .filter((l) => /^ {2}\S/.test(l))
    .map((l) => l.trim().replace(/:.*$/, ''));
}

const tep = fs.readdirSync(DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
check(`${DIR} có workflow để kiểm`, tep.length > 0, 'không đọc được tệp workflow nào');

for (const f of tep) {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8');
  const lines = raw.split('\n');
  const onLines = docCon(lines, 'on');
  const sk = suKien(onLines);
  const theoPr = sk.includes('pull_request') || sk.includes('pull_request_target');
  const theoPush = sk.includes('push');

  if (!theoPr && !theoPush) continue; // schedule / workflow_dispatch: không xếp hàng theo push

  // (a) phải có concurrency ở cấp cao nhất
  const conc = docCon(lines, 'concurrency');
  check(`${f}: có khối concurrency`, conc !== null,
    'workflow chạy theo push/pull_request mà thiếu concurrency ⇒ push mới không huỷ lượt SHA cũ');
  if (conc === null) continue;

  const group = conc.find((l) => l.trim().startsWith('group:')) || '';
  const cancel = conc.find((l) => l.trim().startsWith('cancel-in-progress:')) || '';

  // group phải tách theo từng workflow và từng PR/ref, không gộp cả repo vào
  // một nhóm (gộp hết = PR này huỷ lượt của PR khác).
  check(`${f}: group tách theo workflow + PR/ref`,
    group.includes('github.workflow') && group.includes('github.ref'),
    `group hiện tại: ${group.trim() || '(thiếu)'}`);

  // (b) cancel-in-progress phải chừa main khi workflow chạy trên push
  if (theoPush) {
    check(`${f}: cancel-in-progress chừa main`,
      cancel.includes(CANCEL_CHUA_MAIN),
      `phải là \`cancel-in-progress: ${CANCEL_CHUA_MAIN}\` (tự huỷ lượt trên main = mất dấu xanh commit đã gộp); hiện tại: ${cancel.trim() || '(thiếu)'}`);
  } else {
    check(`${f}: có cancel-in-progress`, /:\s*\S/.test(cancel),
      `hiện tại: ${cancel.trim() || '(thiếu)'}`);
  }

  // (c) push.branches không bắt nhánh thợ
  if (theoPush) {
    const iPush = onLines.findIndex((l) => /^ {2}push:/.test(l));
    const pushBlock = [];
    for (let i = iPush + 1; i < onLines.length; i += 1) {
      if (/^ {2}\S/.test(onLines[i])) break;
      pushBlock.push(onLines[i]);
    }
    const branches = pushBlock.filter((l) => l.includes('branches')).join(' ')
      + pushBlock.filter((l) => /^\s{6,}-/.test(l) && !l.includes('/')).join(' ');
    const bad = NHANH_THO.filter((re) => re.test(branches));
    check(`${f}: push.branches không bắt nhánh thợ`, bad.length === 0,
      `nhánh thợ đã có PR nên pull_request phủ đủ; bắt thêm push là nhân đôi lượt test. Dòng branches: ${branches.trim()}`);

    // `push:` mà KHÔNG khai `branches:` = bắt MỌI nhánh ⇒ vẫn nhân đôi lượt với
    // `pull_request`, và hai lượt nằm ở hai `group` khác tên nên concurrency
    // không dọn hộ. Phải khai tường minh `branches: [main]`.
    if (theoPr) {
      check(`${f}: push có khai branches tường minh`,
        pushBlock.some((l) => l.includes('branches')),
        '`push:` không khai `branches:` là bắt mọi nhánh ⇒ mỗi push lên nhánh có PR vẫn sinh 2 lượt (group khác tên nhau nên concurrency không gộp được)');
    }
  }
}

// Cổng riêng cho tệp nặng nhất (~19–26 phút/lượt): nêu tên thẳng để đổi tên
// nhánh thợ sau này cũng không lọt.
const testAll = fs.readFileSync(path.join(DIR, 'test-all.yml'), 'utf8');
check('test-all.yml: không còn claude/** trong push.branches',
  !/branches:.*claude/.test(testAll),
  'một push lên nhánh có PR sẽ sinh 2 lượt "Full test suite" y hệt nhau');
check('test-all.yml: vẫn chạy push trên main (giữ dấu xanh cho số đo main xanh)',
  /push:\s*\n\s*branches:\s*\[main\]/.test(testAll),
  'bỏ push:main là mất dấu xanh trên main');

console.log(fail ? `\n${fail} cổng CI chưa đạt` : '\nCI concurrency OK');
process.exit(fail ? 1 : 0);
