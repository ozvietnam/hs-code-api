#!/usr/bin/env node
/**
 * scripts/test-so-do-mermaid.mjs — Cổng máy kiểm định chống lệch sơ đồ (Diagram Drift Gate).
 * Đảm bảo:
 * 1. docs/luat-duong-khach.md luôn có sơ đồ Mermaid chuẩn hoá giữa 2 thẻ neo.
 * 2. Sơ đồ không bị trôi dạt (Zero Drift) so với data/luat/dau-noi.json.
 * 3. Đầy đủ các trạm kiểm soát (Trạm 1 - Trạm 5) và các cổng máy L1, L2, L4, L8.
 * 4. Ca ngược: Phát hiện ngay khi sơ đồ bị can thiệp sai lệch.
 */
import { doc, docJson, boKiem } from './lib-luat.mjs';
import { NEO_BAT_DAU, NEO_KET_THUC, sinhSoDoMermaid } from './gen-so-do-mermaid.mjs';

const { kiem, xong } = boKiem('test-so-do-mermaid');
const noiDungDoc = doc('docs/luat-duong-khach.md');
const dauNoi = docJson('data/luat/dau-noi.json');

// ── 1. Thẻ neo và cấu trúc khối Mermaid ──────────────────────────────────────────────────────────
kiem('tài liệu có thẻ neo bắt đầu sơ đồ', noiDungDoc.includes(NEO_BAT_DAU));
kiem('tài liệu có thẻ neo kết thúc sơ đồ', noiDungDoc.includes(NEO_KET_THUC));

const doanSoDo = noiDungDoc.split(NEO_BAT_DAU)[1]?.split(NEO_KET_THUC)[0] || '';
kiem('có khối mã ```mermaid bên trong cặp thẻ neo', /```mermaid[\s\S]+```/.test(doanSoDo));

// ── 2. Đầy đủ các trạm và kho tri thức ─────────────────────────────────────────────────────────────
kiem('sơ đồ có Trạm 1: Tiếp nhận & Kiểm tra cờ', doanSoDo.includes('Trạm 1: Tiếp nhận & Kiểm tra cờ'));
kiem('sơ đồ có Trạm 2: Đấu nối tri thức', doanSoDo.includes('Trạm 2: Đấu nối tri thức'));
kiem('sơ đồ có Trạm 3: Phân loại & Chốt mã', doanSoDo.includes('Trạm 3: Phân loại & Chốt mã'));
kiem('sơ đồ có Trạm 4: Rẽ nhánh kết quả & Câu hỏi', doanSoDo.includes('Trạm 4: Rẽ nhánh kết quả & Câu hỏi'));
kiem('sơ đồ có Trạm 5: Trả lời & Chạy bóng', doanSoDo.includes('Trạm 5: Trả lời & Chạy bóng'));
kiem('sơ đồ có cụm Cổng máy kiểm định tự động', doanSoDo.includes('Cổng máy kiểm định tự động'));

// Mọi kho tri thức chính có mặt
kiem('sơ đồ có kho Sổ tay nhóm 4 số', doanSoDo.includes('data/so-tay/'));
kiem('sơ đồ có kho Sổ ranh giới PN6', doanSoDo.includes(['data', 'ho-so', 'ranh-gioi', ''].join('/')));
kiem('sơ đồ có kho Tiền lệ', doanSoDo.includes('data/precedents.json'));
kiem('sơ đồ có kho Chú giải', doanSoDo.includes('data/explanatory-notes.json'));

// ── 3. Kiểm định không lệch (Zero Drift) với hàm sinh từ máy ──────────────────────────────────────
const mermaidChuan = sinhSoDoMermaid(dauNoi);
kiem('sơ đồ trong tài liệu khớp 100% với hàm sinh từ dau-noi.json (Không lệch)', doanSoDo.trim() === mermaidChuan.trim());

// ── 4. Ca ngược (Negative Tests) ───────────────────────────────────────────────────────────────────
const soDoSaiLech = doanSoDo.replace('data/so-tay/', 'data/so-tay-bi-xoa/');
kiem('ca ngược: phát hiện khi sơ đồ bị sửa lệch', soDoSaiLech.trim() !== mermaidChuan.trim());

const dauNoiGia = JSON.parse(JSON.stringify(dauNoi));
dauNoiGia.kho.soTayNhom.ten = 'Tên sổ tay bị sửa';
kiem('ca ngược: phát hiện khi dữ liệu máy dau-noi.json đổi mà sơ đồ chưa cập nhật', sinhSoDoMermaid(dauNoiGia).trim() !== doanSoDo.trim());

xong();
