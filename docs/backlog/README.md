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
| 3 | Điểm vào cho AI (AGENTS.md, llms.txt, OpenAPI, mở đọc không token) | ⏳ Chưa | — |
| 4 | Đường đóng góp (CONTRIBUTING, schema, Discussions) | ⏳ Chưa | — |
| 5 | Nạp bảng quyết định — kéo độ chính xác | ⏳ Chưa | — |

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

Xem chi tiết trong từng file.
