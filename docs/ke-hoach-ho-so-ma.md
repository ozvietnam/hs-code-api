# Kế hoạch khâu 3: hồ sơ vấn đề của từng mã 8 số

Chốt cùng CEO sáng 26/11. Luật nền: ADR-0004, ADR-0005, ADR-0006.

## Dây chuyền

1. **Móng**: luật gốc số hoá nguyên văn (lớp 1, đã xong).
2. **Sơ đồ quan hệ**: chạm một nút là kéo ra mọi thứ liên quan (M-32, M-33, M-34, M-36, đã có).
3. **Kiểm chắc và nhanh**: kiểm **trên sơ đồ**, chưa đụng khách. Mỗi mã 8 số có **hồ sơ vấn đề**: phải là gì, không được là gì (chuyển đi đâu), khác anh em ở đâu, ngưỡng số, dữ kiện cần biết, các vấn đề chỉ liệt kê được (GIR 2a, 3b, bộ phận, đa chức năng, "chủ yếu dùng cho"). **← kế hoạch này.**
4. **Kết quả cho bước tiếp theo**: phiếu vấn đề gọn, trỏ câu luật. Tầng so với mô tả của khách (thừa, thiếu, đúng, sai) là tầng khác, làm sau.

## Nguyên tắc

- **Tách khỏi dữ liệu khách.** Không có mô tả hàng, tờ khai, tiền lệ trong hồ sơ.
- **Xây một lần, cập nhật đúng chỗ đổi.** Mỗi vấn đề gắn vân tay câu luật gốc; luật đổi câu nào chỉ dựng lại phần dính câu đó (HS 2028, biểu thuế hằng năm).
- **Lưu theo nút, ghép theo đường đi.** Vấn đề nằm ở nút sinh ra nó (Phần, Chương, 4, 6, 8 số); hồ sơ một mã 8 số do máy ghép dọc đường đi.
- **Mỗi vấn đề một điều kiện đơn, có trích nguyên văn.** Hai mô hình khác nhà tách độc lập; khớp mới nhận, lệch để người đọc.
- **Không làm thay LLM, không từ khoá → nhóm.** "Dữ kiện cần biết" chỉ rút từ chữ luật.
- **"Loại khác" = phủ định các anh em có tên**, máy sinh.
- **Nguồn chạy miễn phí** (agy gói thuê bao, Gemma máy nhà): dựng chậm không sao.

## Cổng máy (bắt buộc trước khi nhận)

1. **Đủ**: mọi câu có sức pháp lý trên đường đi thành vấn đề hoặc ghi "không tạo điều kiện" kèm lý do.
2. **Mọi cạnh "loại sang" (M-33)** đi vào hoặc ra khỏi đường đi có vấn đề tương ứng.
3. **Anh em chia hết, không hở không chồng**: mỗi cặp anh em có ít nhất một vấn đề tách; không hai anh em trùng bộ điều kiện; ngưỡng số phủ kín dải.
4. **Trích nguyên văn**, id câu thật; nguồn và lớp (LUAT / HUONG_DAN) đúng; chỗ hai nguồn vênh ghi "vênh".
5. **Vân tay**: câu gốc đổi thì bài kiểm đỏ ở đúng các vấn đề dính câu đó.

## Thẻ

| Thẻ | Việc | Người |
|---|---|---|
| M-71 | Khuôn `ho-so-ma@1` + cổng 1–5 + máy ghép theo đường đi | QT |
| M-72 | Tách vấn đề cấp Phần, Chương (chú giải pháp lý), hai phiếu độc lập | QT + GPU + agy |
| M-73 | Tách vấn đề cấp nhóm 4 số (tên + chú giải nhóm), thử Chương 76 rồi cuốn chiếu | QT + GPU + agy |
| M-74 | Ngưỡng số và phân dải anh em (máy kiểm phủ kín) | agy |
| M-75 | Vấn đề chỉ liệt kê được (GIR 2a, 3b, bộ phận, đa chức năng, "chủ yếu dùng cho") | agy |
| M-76 | Cấp 6 và 8 số: tách anh em, "Loại khác" phủ định, SEN | QT |
| M-77 | Tra hồ sơ: API đọc (không nối đường chọn mã), cập nhật theo vân tay | agy |
| M-78 | Người duyệt mẫu theo Chương trọng điểm (84, 85, 39, 73, 94…) | QT chuẩn bị gói, người khai báo duyệt |
| M-79 | Thước đo nút thắt kế tiếp: "mã đúng có trong danh sách ứng viên" | QT |

Thứ tự: M-71 → (M-72, M-73 thử Chương 76) → QT đọc tay → cuốn chiếu Chương trọng điểm → M-74, M-75, M-76 → M-77 → M-78. M-79 làm song song.

**Nút thắt kế tiếp báo CEO:** bộ hồ sơ phủ hết các Chương trọng điểm và qua cổng; số đo M-79 cho thấy bước tìm cửa vào thiếu ở đâu.
