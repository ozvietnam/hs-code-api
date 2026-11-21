#!/usr/bin/env node
/**
 * Cổng máy L2 (docs/luat-duong-khach.md): câu hỏi gửi khách phải có căn cứ.
 *
 * Vì sao: van khí nén 5/2 qua Cổng (21/11/2026) bị hỏi 6 câu do LLM tự nghĩ; một bản khác thêm bảng câu hỏi theo
 * chương ở module riêng. Mỗi lần thêm một nơi dựng câu hỏi là thêm một chỗ lệch khỏi sổ tay.
 *
 * Tĩnh, không LLM: mọi tệp trong lib/, api/ có dựng câu hỏi (mẫu `questionVi:` trên dòng mã) phải được khai ở
 * data/luat/dau-noi.json mục noiDungCauHoi — là lõi (nguồn có căn cứ), nơi chuyển tiếp, hoặc ngoại lệ có số thẻ.
 * ĐỎ khi: có tệp mới dựng câu hỏi chưa khai · tệp đã khai không còn dựng câu hỏi (dọn bảng) · ngoại lệ thiếu thẻ ·
 * số ngoại lệ vượt trần.
 *
 * TRẦN NGOẠI LỆ chỉ được HẠ. Gỡ được một ngoại lệ thì hạ số dưới đây trong cùng PR. Muốn TĂNG phải có ADR mới trong
 * docs/decisions/ và QT duyệt — đừng tự nâng để qua cổng.
 */
import { doc, docJson, co, tepMa, boKiem } from './lib-luat.mjs';

const TRAN_NGOAI_LE = 3; // 21/11/2026: lib/engine-loop.js, lib/identify.js, lib/classify-guards.js

const { kiem, xong } = boKiem('test-cau-hoi-co-can-cu');
const n = docJson('data/luat/dau-noi.json').noiDungCauHoi;
const RE_DUNG = /\bquestionVi\s*:/;
const dungCauHoi = (t) => doc(t).split('\n').some((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && RE_DUNG.test(l));

const thatSu = [...tepMa('lib'), ...tepMa('api')].filter(dungCauHoi);
const khai = [...n.loi, ...n.chuyenTiep, ...n.ngoaiLe];
const tenKhai = khai.map((k) => k.tep);

kiem('không tệp nào nằm ở hai danh sách', new Set(tenKhai).size === tenKhai.length);

const moi = thatSu.filter((t) => !tenKhai.includes(t));
kiem(`mọi tệp dựng câu hỏi đều đã khai (${thatSu.length} tệp)`, moi.length === 0,
  `tệp MỚI dựng câu hỏi: ${moi.join(', ')} — câu hỏi gửi khách phải lấy từ lõi (L2). Gọi lõi thay vì tự viết; nếu tệp này chính là nguồn có căn cứ thì khai vào noiDungCauHoi.loi kèm canCu`);

const thua = khai.filter((k) => !k.choGop && !(co(k.tep) && dungCauHoi(k.tep))).map((k) => k.tep);
kiem('tệp đã khai còn dựng câu hỏi thật', thua.length === 0, `không còn dựng câu hỏi (hoặc đã xoá): ${thua.join(', ')} — xoá khỏi noiDungCauHoi; nếu là ngoại lệ thì hạ TRAN_NGOAI_LE`);

const choGopSai = khai.filter((k) => k.choGop && !/^#\d+$/.test(k.choGop)).map((k) => k.tep);
kiem('mục "choGop" ghi đúng số PR', choGopSai.length === 0, choGopSai.join(', '));

const loiThieu = n.loi.filter((k) => !k.canCu).map((k) => k.tep);
kiem('mọi tệp lõi ghi canCu (nguồn của câu hỏi)', loiThieu.length === 0, loiThieu.join(', '));

const nlThieu = n.ngoaiLe.filter((k) => !/^OZV-\d+$/.test(k.the || '') || (k.lyDo || '').length < 10).map((k) => k.tep);
kiem('mọi ngoại lệ có số thẻ + lý do', nlThieu.length === 0, nlThieu.join(', '));
kiem(`số ngoại lệ (${n.ngoaiLe.length}) không vượt trần ${TRAN_NGOAI_LE}`, n.ngoaiLe.length <= TRAN_NGOAI_LE, 'danh sách ngoại lệ chỉ được ngắn đi');
kiem(`trần ngoại lệ đã hạ theo danh sách (${n.ngoaiLe.length}/${TRAN_NGOAI_LE})`, n.ngoaiLe.length === TRAN_NGOAI_LE, 'gỡ được ngoại lệ rồi thì hạ TRAN_NGOAI_LE trong scripts/test-cau-hoi-co-can-cu.mjs cho khớp');

xong();
