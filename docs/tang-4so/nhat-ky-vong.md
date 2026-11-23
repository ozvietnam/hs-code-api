# Nhật ký vòng sửa tầng 4 số

| Vòng | Bộ | Ca còn sai | Theo nguyên nhân | Đã sửa | Ghi chú |
|---|---|---|---|---|---|
| 0 | v1 | 38/100 | TIM_SOT 9, KHONG_HOI 11, AP_SAI 18 (phân loại lại ở vòng 1 theo ca-sai-v1-vong0.json) | bản thử đêm 22/11 (hiểu hàng LLM mạnh + gom ứng viên + so nhóm bằng mô hình nhà) | 14/16 ca chốt sai có nhóm đúng trong ứng viên; 17/20 ca phải hỏi mà tự chốt |
| 0 | v2 | 40/100 | chưa phân loại | như trên | nhóm đúng trong ứng viên 74/100 |
| 1 | v1 | 22/38 (đạt 16) | TIM_SOT 16, KHONG_HOI 3, AP_SAI 3 | tầng điều khoản (scripts/tang-4so/dieu_khoan.py: điều loại trừ, quy tắc, định nghĩa của Chương + Phần, Chú giải 2 Phần XVI) đưa vào hồ sơ từng nhóm; phán xử bằng agy gemini-3.8-flash-medium thay gpt-oss; luật cứng phải hỏi trong hau_xu_ly (so_nhom.py); chấm bằng cham.py | ra khỏi danh sách: 4, 6, 8, 12, 20, 29, 39, 46, 53, 58, 68, 94, 95, 96, 98, 99. Lỗi mã làm TIM_SOT tăng giả: gom ứng viên cắt ở 16 làm rớt nhóm đúng đã có (10, 26, 28, 40, 49, 57, 76, 80, 93); nhóm đúng chưa bao giờ vào ứng viên: 19, 23, 27, 47, 62, 65, 82. Phán xử CHOT khi phải hỏi: 24, 38, 97 (KHONG_HOI); 37, 44, 69 nghi nhãn |
