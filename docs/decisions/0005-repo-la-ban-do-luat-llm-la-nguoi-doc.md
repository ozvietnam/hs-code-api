# ADR-0005: Repo là bản đồ luật và trình tự đọc; LLM là người đọc và phán đoán

- Trạng thái: **CEO nêu ngày 25/11/2026** (chat), QT ghi lại. Đứng trên ADR-0002, ADR-0003; bổ sung cho ADR-0004.
- Phạm vi: mọi dữ liệu, công cụ, quy trình của hs-code-api.

## 1. Quyết định

Repo số hoá luật thành dữ liệu để LLM đọc, đối chiếu và suy luận theo luật. Repo **không làm thay** LLM của khách hay bất kỳ LLM nào.

1. **Xương sống: luật và tài liệu gốc.** Biểu thuế, 6 quy tắc, chú giải Phần / Chương / nhóm / phân nhóm, SEN, ý kiến WCO, thông báo phân loại. Mỗi câu là một nút, nguyên văn, có nguồn và hiệu lực.
2. **Sơ đồ quan hệ là việc đầu tiên.** Mọi chỗ nhắc tới nhau thành cạnh có loại, có chiều: bao gồm, loại trừ sang, điều kiện, phân biệt với, dẫn chiếu, định nghĩa, cùng cấp, cha–con. Chạm một nút phải kéo ra được hết những gì liên quan, nhắc tới nó và bắt buộc phải đọc.
3. **Quy trình phân loại là đường đi có ghi vết, không phải gom một đống dữ liệu rồi bắt LLM chọn.** Mỗi bước ghi: nút nào đề cập tới hàng · đã đọc gì · trích dẫn · quyết định (nhận, loại, đọc tiếp, quay sang nhóm khác, hỏi khách) · mã khác đã so và vì sao giữ hay bỏ · quy tắc nào trong 6 quy tắc (xuống phân nhóm: Quy tắc 6, chỉ so cùng cấp).
4. **Phần mở rộng đứng bên cạnh, làm sau.** Khi thừa token, thừa thời gian: khu vực khó hiểu, tên khác, cách gọi khác, bách khoa về cấu tạo, cấu trúc, nguyên lý hoạt động. Phải có kiểm duyệt, gắn vào nút luật mà nó giải thích, ghi rõ là **bổ trợ, không phải luật**. Mục đích: LLM hiểu bối cảnh.
5. **Cấm ép từ khoá → nhóm.** Không so giống hay khác từng từ để chọn nhóm, phân nhóm, dòng; không dùng phần mở rộng làm luật ánh xạ. Tên khác là lời giải thích cho LLM đọc, không phải công tắc chọn mã.

## 2. Ranh giới

| Repo giữ | LLM giữ |
|---|---|
| Nguyên văn luật, cạnh, hiệu lực | Hiểu hàng, hiểu tên gọi |
| Trình tự phải đọc, sổ ghi vết | Đọc, so sánh, lập luận, quyết định từng bước |
| Kiểm trích có thật, nút bắt buộc đã đọc | Biết khi nào thiếu dữ kiện để hỏi |

## 3. Hệ quả

- Một việc chỉ được làm khi nó làm luật **đủ hơn, đúng hơn, nối chắc hơn hoặc dễ đọc hơn** cho LLM.
- Kiểm chỉ chạy khi đã nêu trước điểm lõi nghi ngờ, và kết quả phải chỉ ra luật nào thiếu, sai, chưa nối hoặc khó đọc. Không chạy bộ rồi vá từng ca.
- Mã đang ép từ khoá → nhóm (kể cả mã QT viết) phải kê ra và có hướng xử lý trước khi viết thêm đường mới. Không tắt thẳng trên đường khách khi chưa có thứ thay.
