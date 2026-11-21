#!/usr/bin/env node
/**
 * Test cho cổng CI nhắc luật L1 (scripts/kiem-pr-l1.mjs) + mẫu PR + workflow.
 * Ca ngược có đủ: PR không đụng LLM thì qua; đụng LLM mà để nguyên mẫu PR thì đỏ; trả lời một trong hai cách thì qua.
 */
import fs from 'node:fs';
import { tepDungLLM, thanTraLoiL1, kiemPR } from './kiem-pr-l1.mjs';
import { doc, co, boKiem } from './lib-luat.mjs';

const { kiem, xong } = boKiem('test-kiem-pr-l1');
const gia = { 'lib/co-llm.js': 'const r = await callLLMJson(prompt);', 'lib/co-prompt.js': 'const SYSTEM_BANG_CHUNG = `Bạn là…`;', 'lib/thuong.js': 'module.exports = { cong: (a, b) => a + b };', 'api/x.js': 'const { callLlm } = require("../lib/llm-tier"); callLlm(x);' };
const docGia = (t) => (t in gia ? gia[t] : null);

// ── Tệp nào thuộc diện L1 ─────────────────────────────────────────────────────────────────────────────────────────
kiem('lib/llm-tier.js luôn thuộc diện L1', tepDungLLM('lib/llm-tier.js', docGia));
kiem('data/prompts/** luôn thuộc diện L1', tepDungLLM('data/prompts/classify-v3.txt', docGia));
kiem('tệp lib có gọi callLLM… thuộc diện L1', tepDungLLM('lib/co-llm.js', docGia));
kiem('tệp lib có hằng SYSTEM_… thuộc diện L1', tepDungLLM('lib/co-prompt.js', docGia));
kiem('tệp api có gọi callLlm thuộc diện L1', tepDungLLM('api/x.js', docGia));
kiem('ca ngược: tệp lib không gọi LLM thì KHÔNG thuộc', !tepDungLLM('lib/thuong.js', docGia));
kiem('ca ngược: tệp data thường, docs, scripts KHÔNG thuộc', !tepDungLLM('data/so-tay/8481.json', docGia) && !tepDungLLM('docs/a.md', docGia) && !tepDungLLM('scripts/test-x.mjs', docGia));
kiem('ca ngược: tệp lib đã xoá (không đọc được) KHÔNG thuộc', !tepDungLLM('lib/da-xoa.js', docGia));
kiem('tệp thật: lib/identify.js và lib/engine-loop.js thuộc diện L1', ['lib/identify.js', 'lib/engine-loop.js'].every((t) => tepDungLLM(t, (x) => (co(x) ? doc(x) : null))));
kiem('tệp thật: lib/so-tay-gates.js (tất định) KHÔNG thuộc', !tepDungLLM('lib/so-tay-gates.js', (x) => (co(x) ? doc(x) : null)));

// ── Thân PR ───────────────────────────────────────────────────────────────────────────────────────────────────────
const mau = doc('.github/pull_request_template.md');
kiem('mẫu PR để nguyên (chưa điền) KHÔNG được tính là đã trả lời', thanTraLoiL1(mau).dat === false);
kiem('mẫu PR có đủ ba neo của cổng', /Không đổi hành vi LLM:/.test(mau) && /Công tắc:/.test(mau) && /Đo bằng chuỗi mô hình máy thật/.test(mau));
kiem('mẫu PR có ô cho L2, L4, L10', /L2/.test(mau) && /L4/.test(mau) && /Thứ tự gộp/.test(mau));

kiem('"Không đổi hành vi LLM: <lý do thật>" ⇒ đạt', thanTraLoiL1('## Tóm tắt\nabc\n\nKhông đổi hành vi LLM: chỉ đổi tên biến trong lib/identify.js, prompt giữ nguyên\n').dat);
kiem('ca ngược: "Không đổi hành vi LLM:" để trống ⇒ không đạt', !thanTraLoiL1('Không đổi hành vi LLM:\n').dat);
kiem('ca ngược: lý do nằm trong chú thích HTML ⇒ không đạt', !thanTraLoiL1('Không đổi hành vi LLM: <!-- lý do cụ thể ở đây nhé -->\n').dat);
kiem('ca ngược: lý do là chữ giữ chỗ "<lý do>" ⇒ không đạt', !thanTraLoiL1('Không đổi hành vi LLM: <lý do cụ thể>\n').dat);
const coDo = 'Công tắc: `HS_HOI_THEO_SO_TAY` (mặc định tắt)\n\n### Đo bằng chuỗi mô hình máy thật\nChuỗi mặc định lib/llm-tier.js qua Cổng thật, 10 mẫu: trước 5/10, sau 9/10.\n\n## Test\nxanh\n';
kiem('có công tắc + mục đo có nội dung ⇒ đạt', thanTraLoiL1(coDo).cach === 'cong-tac-va-do');
kiem('ca ngược: có mục đo nhưng thiếu dòng công tắc ⇒ không đạt', !thanTraLoiL1(coDo.replace(/^Công tắc.*$/m, '')).dat);
kiem('ca ngược: có công tắc nhưng mục đo rỗng (tiêu đề kế tiếp ngay sau) ⇒ không đạt', !thanTraLoiL1('Công tắc: `HS_X_Y`\n\n### Đo bằng chuỗi mô hình máy thật\n\n## Test\nrất nhiều chữ ở mục khác không được tính vào mục đo\n').dat);

// ── Cả PR ─────────────────────────────────────────────────────────────────────────────────────────────────────────
kiem('PR chỉ sửa dữ liệu + tài liệu ⇒ qua dù thân PR trống', kiemPR({ tep: ['data/so-tay/8481.json', 'docs/a.md'], than: '', docTep: docGia }).dat);
const do1 = kiemPR({ tep: ['lib/thuong.js', 'lib/co-llm.js'], than: mau, docTep: docGia });
kiem('PR sửa tệp gọi LLM + thân PR là mẫu chưa điền ⇒ ĐỎ, nêu đúng tệp', do1.dat === false && do1.dung.join() === 'lib/co-llm.js' && do1.thieu.length === 2);
kiem('PR sửa tệp gọi LLM + thân PR đã trả lời ⇒ qua', kiemPR({ tep: ['lib/co-llm.js'], than: coDo, docTep: docGia }).dat);

// ── Workflow ──────────────────────────────────────────────────────────────────────────────────────────────────────
const wf = fs.existsSync('.github/workflows/luat-l1.yml') ? doc('.github/workflows/luat-l1.yml') : '';
kiem('workflow luat-l1.yml chạy khi SỬA thân PR (types có edited)', /types:\s*\[[^\]]*\bedited\b/.test(wf));
kiem('workflow luat-l1.yml gọi scripts/kiem-pr-l1.mjs', wf.includes('node scripts/kiem-pr-l1.mjs'));

xong();
