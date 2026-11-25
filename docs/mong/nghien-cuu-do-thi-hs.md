# Nghiên cứu 25/11/2026: RAG lấy top-k mã hay đi trên đồ thị luật?

Câu hỏi: áp dụng phương án "nhúng mô tả mã HS vào kho vector, lấy 5–10 mã gần nghĩa, đưa mô hình nhỏ (granite-4.0-h-micro trên Cloudflare) chọn" đến đâu.

## Bằng chứng

**HSGraphAgent (ACL 2026, 2026.acl-long.2072)** đo đúng hai cách trên cùng mô hình, cùng dữ liệu. Nhãn do người soát; biểu Trung Quốc, tiếng Trung; tác giả tự đo.

| Đúng 6 số (450 ca) | DeepSeek-V3.2 | Kimi-K2 | GPT-OSS-120B | Qwen2.5-32B |
|---|---|---|---|---|
| Hỏi thẳng LLM | 0,489 | 0,553 | 0,076 | 0,038 |
| RAG top-10 theo tên mã | 0,702 | 0,758 | 0,669 | 0,658 |
| RAG top-10 kèm đoạn mô tả | 0,722 | 0,789 | 0,696 | 0,676 |
| **Đi trên đồ thị luật từng cấp** | **0,902** | **0,909** | **0,789** | **0,778** |

- Bỏ phần "trái luật thì chuyển hướng": 0,902 → 0,669. Bỏ tóm tắt nút: 0,902 → 0,698. **Hai phần này là lõi.**
- Ở 4 số, mô hình yếu dùng RAG kèm mô tả lại nhỉnh hơn đồ thị (GPT-OSS 0,885 so với 0,818; Qwen 0,882 so với 0,859). Tìm theo nghĩa hợp để **vào cửa**, không hợp để **kết luận**.
- Giá: khoảng 25 giây và 7.700 token mỗi ca, so với 9 giây và 1.000 token.
- Giới hạn: luật loại trừ chép không đều giữa các nhóm thì độ chắc không đều.

**Quy trình 6 chặng (arXiv 2605.14857):** 158 ca sai ở 4 số thì 102 ca (65%) là chọn sai **trong danh sách đã có nhóm đúng**; chỉ 35 ca do tìm hụt. Thêm ứng viên không chữa được.

**HSense (Backend.AI, 04/2026):** kho vector cắt đoạn phẳng là bài học lớn nhất: mất quan hệ chương–nhóm–phân nhóm–chú giải; họ chuyển sang đi cây có cấu trúc và cho quay lui. Số của họ (92,4% top-1 trên 500 ca) tự báo.

**DRiLL (arXiv 2611.09200), luật tiếng Việt:** thêm dấu hiệu cùng văn bản, dẫn chiếu, sửa đổi giúp nhẹ (F2 +1,14 điểm), nhiều nhất ở câu cần hai điều trở lên (+4,45).

**granite-4.0-h-micro:** Cloudflare có gọi hàm, cửa sổ 131.000 token; IBM công bố 12 ngôn ngữ, **không có tiếng Việt**. Mô hình nhỏ là chỗ yếu nhất trong bảng trên.

## Áp dụng

| Ý trong phương án | Quyết định |
|---|---|
| Không để LLM nhớ mã, bắt tra dữ liệu | Áp dụng, đã là ADR-0005 |
| Kho vector | Áp dụng **cho nút luật** (câu chú giải, tên nhóm, SEN, WCO) kèm đường dẫn cha, để tìm **cửa vào**. Không nhúng mã 8 số để chọn. Không có tờ khai |
| Gọi hàm (function calling) | Áp dụng: công cụ MCP là các bước đi trên đồ thị |
| Đầu ra có khuôn | Áp dụng: sổ ghi vết mỗi bước |
| Thiếu thì hỏi, không khớp thì nói không có | Áp dụng, ở từng bậc |
| Nhiệt độ 0–0,2 | Áp dụng |
| "Cột ghi chú đặc trưng phân biệt" | Áp dụng thành **tóm tắt nút** và **cạnh chuyển hướng có điều kiện**, rút từ luật, có trích |
| Top 5–10 mã rồi để LLM chọn | **Không** – đây là cách 0,70–0,72 |
| granite-4.0-h-micro | **Không** – không hỗ trợ tiếng Việt, nhỏ |
| Chuyển sang Cloudflare Worker/Vectorize | **Không** – hạ tầng đang có đủ, đổi nền không làm luật đúng hơn |

## Cơ chế chọn cho quy trình: Vào cửa → Chọn → Kiểm → Chuyển hướng / Quay lui

1. **Vào cửa:** tìm theo nghĩa và theo chữ trên nút luật, ra vài nhóm **có câu nhắc**.
2. **Chọn:** LLM thấy các nút cùng cấp của đúng nhánh, mỗi nút có tên, tóm tắt, câu loại trừ; chọn một, hoặc QUAY LUI, hoặc HỎI.
3. **Kiểm:** repo lấy các cạnh chuyển hướng của nút vừa chọn; LLM trả lời từng điều kiện (thoả / không / chưa biết) kèm chữ khách.
4. **Chuyển hướng:** có điều kiện thoả thì đi theo cạnh sang nút đích, ghi sổ; chưa biết thì hỏi khách đúng điều kiện đó; không có thì xuống một cấp.

Người phán đoán luôn là LLM. Repo chỉ giữ đường, câu luật, và không cho bỏ bước.
