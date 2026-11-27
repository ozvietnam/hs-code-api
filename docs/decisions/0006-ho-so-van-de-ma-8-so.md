# ADR-0006: Hồ sơ vấn đề của từng mã 8 số, tách khỏi dữ liệu khách

- Ngày: 26/11/2026 · Trạng thái: chấp nhận (CEO chốt cách nghĩ sáng 26/11)

## Bối cảnh
Đã có móng (luật gốc nguyên văn) và sơ đồ quan hệ. Bước kế tiếp là kiểm. Nếu mỗi lượt khách hỏi lại bắt mô hình đọc luật từ đầu thì chậm, đắt, không ổn định, và không nhân rộng được.

## Quyết định
1. Với mỗi mã 8 số, dựng sẵn **hồ sơ vấn đề** chỉ từ luật: phải là gì, không được là gì, khác anh em ở đâu, ngưỡng, dữ kiện cần biết, vấn đề chỉ liệt kê được. Không có dữ liệu khách.
2. Xây một lần, cập nhật theo vân tay câu luật. Lưu theo nút, ghép theo đường đi.
3. So hồ sơ với mô tả khách là **tầng khác**, làm sau, dùng LLM; những chỗ cần cân nhắc ("đặc tính cơ bản", "chủ yếu dùng cho"…) vẫn cần mô hình mạnh.
4. Thứ tự lớn: hồ sơ → tìm theo nghĩa cho hàng gọi tên rõ → mã "Loại khác".

## Hệ quả
- Lúc phục vụ chủ yếu là tra; phần nghĩ nặng chạy một lần bằng nguồn miễn phí.
- Bước tìm cửa vào thành nút thắt kế tiếp; đo từ giờ (M-79).
