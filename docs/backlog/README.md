# Backlog mở dự án — sổ giao việc cho agent

Thư mục này ghi lại **việc còn phải làm** phát sinh sau mỗi bước triển khai, viết
sao cho CEO đọc là phân bổ được ngay cho một agent khác mà không cần giải thích
thêm.

## Quy ước

Mỗi file `NN-<chủ-đề>.md` ứng với một bước đã triển khai, gồm 3 phần:

1. **ĐÃ LÀM** — chốt lại phạm vi đã xong, để agent sau không làm trùng.
2. **VIỆC MỞ RỘNG** — mỗi việc là một thẻ độc lập, có ID, mức ưu tiên, ước lượng,
   mô tả đủ để giao thẳng cho agent, và tiêu chí nghiệm thu.
3. **DUY TRÌ THEO THỜI GIAN** — việc lặp lại theo ngày/tuần/tháng. Đây là phần
   sống còn: dự án nói về **pháp luật XNK**, mà biểu thuế, chính sách mặt hàng và
   danh mục quản lý chuyên ngành thay đổi liên tục. Dữ liệu đứng yên 6 tháng là
   dữ liệu sai — và khi đã mở cho cộng đồng thì sai của mình thành sai của người
   khác.

## Mức ưu tiên

| Mức | Nghĩa |
|---|---|
| **P0** | Chặn việc khác, hoặc đang tạo rủi ro pháp lý / dữ liệu sai. Làm ngay. |
| **P1** | Cần cho mục tiêu "AI nào cũng dùng được + cộng đồng góp data". |
| **P2** | Làm cho tốt hơn, không chặn ai. |

## Trạng thái các bước

| Bước | Chủ đề | Trạng thái | File |
|---|---|---|---|
| 1 | Giấy phép — mở khoá pháp lý | ✅ Xong | [`01-license.md`](01-license.md) |
| 2 | GIR trung thực — sửa audit trail | ✅ Xong | [`02-gir.md`](02-gir.md) |
| 3 | Điểm vào cho AI (AGENTS.md, llms.txt, OpenAPI, mở đọc không token) | ✅ Xong | [`03-ai-entrypoint.md`](03-ai-entrypoint.md) |
| 4 | Đường đóng góp (CONTRIBUTING, schema, DCO, mẫu Issue) | ✅ Xong (C-2 gộp + C-4 privacy 2026-09-09) | [`04-contribution.md`](04-contribution.md) |
| 5 | Nạp bảng quyết định — kéo độ chính xác | ⚙️ Công cụ xong; D-2 verified + D-1 cụm 8481 đã xong | [`05-decision-tables.md`](05-decision-tables.md) |
| 6 | Tách mặt công khai ra CDN tĩnh | ⚙️ Công cụ xong, chờ deploy | [`06-static-cdn.md`](06-static-cdn.md) |

## Nhịp cập nhật tổng hợp

Bảng này gom mọi việc định kỳ từ các file con, để dựng lịch một lần:

| Nhịp | Việc | Nguồn |
|---|---|---|
| Hằng năm (tháng 1) | Cập nhật năm bản quyền trong `LICENSE` + `LICENSE-DATA` | [01](01-license.md) |
| Hằng quý | Rà bảng phạm vi giấy phép trong `NOTICE.md` còn khớp cấu trúc thư mục | [01](01-license.md) |
| Theo sự kiện | Thêm nguồn dữ liệu mới → bổ sung bảng "Nguồn dữ liệu gốc" trong `NOTICE.md` | [01](01-license.md) |
| Theo sự kiện | Có contributor đầu tiên → `CONTRIBUTORS.md` + sửa dòng bản quyền | [01](01-license.md) |
| Hằng tháng | Đọc `ml-log.jsonl` — phân bố `basis`; `LLM_ASSERTED` áp đảo = suy luận có căn cứ đang teo | [02](02-gir.md) |
| Hằng quý | Rà `conflict-tables.json`: mọi `gir` normalize được, mọi rule có `source` | [02](02-gir.md) |
| Khi TCHQ ra TB phân loại mới | Bổ sung `precedents.json`, cân nhắc dựng bảng quyết định | [02](02-gir.md) |
| Mỗi lần đổi prompt LLM | Chạy lại đối chiếu tỷ lệ LLM khai đúng quy tắc (G-4) | [02](02-gir.md) |
| Khi WCO cập nhật HS (kế tiếp HS 2028) | Rà `GIR_RULES` + chú giải phần/chương | [02](02-gir.md) |
| **Khi biểu thuế đổi (TT mới)** | Cập nhật `tax.json` + `generatedAt` NGAY, báo ở `llms.txt` — AI ngoài đang tra thẳng, dữ liệu sai lan không thu hồi được | [03](03-ai-entrypoint.md) |
| Mỗi lần thêm/sửa endpoint | `npm run build` sinh lại `openapi.json`; cập nhật `AGENTS.md` + `llms.txt` | [03](03-ai-entrypoint.md) |
| Hằng tuần | Xem băng thông + lượt gọi công khai trên Vercel (phát hiện lạm dụng) | [03](03-ai-entrypoint.md) |
| Hằng tháng | Cập nhật số liệu trong `AGENTS.md` mục 5 + `llms.txt` (benchmark, số verified) | [03](03-ai-entrypoint.md) |
| Hằng quý | Rà allowlist công khai theo độ chín của dữ liệu | [03](03-ai-entrypoint.md) |
| **Hằng tuần** | Rà PR + Issue đóng góp mới, trả lời trong 7 ngày — im lặng giết dự án cộng đồng nhanh nhất | [04](04-contribution.md) |
| Hằng tuần | Gộp `data/community/` vào kho chính (`npm run data:merge-community`) | [04](04-contribution.md) |
| Hằng tháng | Cập nhật `CONTRIBUTORS.md` + số liệu đóng góp trên trang chủ | [04](04-contribution.md) |
| Hằng quý | Rà bộ lọc riêng tư có kiểu rò rỉ mới nào lọt không | [04](04-contribution.md) |
| **Sau mỗi lần đổi pipeline/prompt** | Chạy lại benchmark, ghi commit SHA — không đo thì không biết tiến hay lùi | [05](05-decision-tables.md) |
| Hằng tháng | `npm run data:conflict-worklist` — xem cụm nhầm lẫn nào mới nổi | [05](05-decision-tables.md) |
| Hằng quý | Rà bảng quyết định: chú giải viện dẫn còn hiệu lực, tiền lệ còn áp dụng | [05](05-decision-tables.md) |
| **Khi biểu thuế mới ban hành** | Kiểm `members` của bảng quyết định còn tồn tại — bảng trỏ mã đã bãi bỏ là sai âm thầm | [05](05-decision-tables.md) |
| Hằng năm | Rà chính sách chương 98 — chế độ ưu đãi đổi thì giả định của `lib/chapter98.js` phải xem lại | [05](05-decision-tables.md) |
| **Mỗi lần `data/` đổi** | Dựng lại bộ tĩnh + deploy CDN — dữ liệu cũ nằm lại trên CDN là sai âm thầm | [06](06-static-cdn.md) |
| Hằng tuần | Kiểm `generatedAt` của `index.json` trên CDN — build hỏng âm thầm thì tuần sau mới lộ | [06](06-static-cdn.md) |
| Hằng tuần | Đối chiếu bản tĩnh ↔ API (~50 mã) — hai nguồn nói khác nhau thì mất uy tín | [06](06-static-cdn.md) |
| Hằng tháng | Xem số file so với trần 20.000 của Cloudflare Pages | [06](06-static-cdn.md) |
| Hằng quý | Rà `OMITTED` trong `lib/static-export.js` còn đúng lý do không | [06](06-static-cdn.md) |

Xem chi tiết trong từng file.
