# M-36 — Tóm tắt nút (BO_TRO), mỗi ý trỏ về câu luật

Người soạn: Gemini (agy, gói thuê bao) theo `tom-tat.mjs --goi`; người soát độc lập: Gemma 31B máy GPU nhà, chỉ thấy ý + câu luật nó trích. Cổng máy (`tom-tat.mjs --kiem`, trong CI): mỗi ý có id câu thật; số đo và đích loại trừ phải có trong chính câu; tách với nút phải cùng cha. Nút "Loại khác" do máy ghi phần còn lại.

| | Số |
|---|---|
| Nút có tóm tắt | 20.360 |
| Ý soạn | 55.729 |
| Ý giữ (Gemma: ĐÚNG) | 51.121 |
| Ý bỏ (Gemma: SAI hoặc THIẾU) | 4.182 |
| Ý bỏ vì câu luật đổi chữ theo TT31, chưa soạn lại | 426 |
| Ý "phần còn lại" do máy ghi | 4.451 |

QT đọc tay toàn Chương 76 trước khi chạy cả bộ; soát Gemma bắt đúng lỗi thật (bỏ sót ngoại lệ, gán nhầm nút chú giải chương cho một nhóm, tách với nút khác cha).

Còn thiếu: 56 nhóm (phần lớn Chương 28, 29, 69, 72) soạn lại theo chữ TT31 chờ hạn mức Gemini; 87.03 hai nhánh. Danh sách ở `/tmp/rap36.out` của lần ghép.

## Đợt 2 (06:20)
Soạn lại 81 nhóm theo chữ TT31 và chia 4 nhóm lớn (87.03, 87.04, 84.09, 84.24) theo nhánh; soát lại. Còn 0 ý chờ soát, 3 ý mất câu. Ý giữ: 51975.
