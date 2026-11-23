# Thiếu dữ liệu luật: chú giải Phần (kiểm 23/11/2026)

Nguồn kiểm: `data/chu-giai-chuong.json` (trường `phan` của từng Chương, nguồn "Chú giải chi tiết HS 2022 bản tiếng Việt, toàn tập, HQKV8"), `data/hs-sections.json` (danh sách Chương của 21 Phần), `data/luat/dieu-khoan-tang2.json`. Các nguồn khác trong repo (`data/bieu-thue/*`, `data/notes.json` chỉ có chú giải Chương, `data/explanatory-notes.json`, `data/chu-giai-heading.json`) không chứa chú giải Phần: tìm theo cụm từ đặc trưng không ra.

Kết luận: **thiếu thật**. Văn bản chú giải Phần chỉ có đủ cho Phần I, II, IV (ngắn), VI, XI, XV, XVI, XVII.

| Phần | Chương | Trong chu-giai-chuong.json | Trong dieu-khoan | Việc |
|---|---|---|---|---|
| I | 01-05 | có (355 ký tự, chú giải 1-2) | có | - |
| II | 06-14 | có (181 ký tự, chú giải 1) | có | - |
| III | 15 | chỉ tiêu đề (114 ký tự) | không | cần văn bản; hoặc xác nhận Phần không có chú giải |
| IV | 16-24 | có (265 ký tự, chú giải 1) | có | - |
| V | 25-27 | không có trường `phan` | không | cần văn bản; hoặc xác nhận không có |
| VI | 28-38 | có (5.681 ký tự) | **đã tách bổ sung 23/11** (`dieu-khoan-bo-sung.json`, gan 28: chú giải 1, 2, 3) | - |
| VII | 39-40 | **sai Phần**: `phan` của Chương 39, 40 là bản sao Phần VI | không | cần chú giải Phần VII nguyên văn (chú giải về hàng đóng bộ, v.v.) |
| VIII | 41-43 | chỉ tiêu đề (147 ký tự) | không | cần văn bản |
| IX | 44-46 | không có trường `phan` | không | cần văn bản |
| X | 47-49 | chỉ tiêu đề (107 ký tự) | không | cần văn bản |
| XI | 50-63 | có (46.130 ký tự); Chương 54 không có trường `phan` | có (116 mục) | `apChoChuong` thiếu Chương 54: **đã sửa 23/11** |
| XII | 64-67 | chỉ tiêu đề (243 ký tự) | không | cần văn bản; hoặc xác nhận không có |
| XIII | 68-70 | chỉ tiêu đề (103 ký tự) | không | cần văn bản; hoặc xác nhận không có |
| XIV | 71 | chỉ tiêu đề (145 ký tự) | không | cần văn bản; hoặc xác nhận không có |
| XV | 72-83 | có (11.210 ký tự) | có | - |
| XVI | 84-85 | có (22.264 ký tự) | có | - |
| XVII | 86-89 | có (13.723 ký tự) | chú giải 1-5 của Phần bị sót: **đã tách bổ sung 23/11** (gan 86) | - |
| XVIII | 90-92 | Chương 90, 91 chỉ tiêu đề (148 ký tự), Chương 92 không có | không | cần văn bản; hoặc xác nhận không có |
| XIX | 93 | chỉ "CỦA CHÚNG" (9 ký tự) | không | cần văn bản; hoặc xác nhận không có |
| XX | 94-96 | không có trường `phan` | không | cần văn bản |
| XXI | 97 | chỉ "ĐỒ CỔ" (5 ký tự) | không | cần văn bản; hoặc xác nhận không có |

Danh sách cần bổ sung sổ (QT mở thẻ): Phần III, V, VII, VIII, IX, X, XII, XIII, XIV, XVIII, XIX, XX, XXI. Với mỗi Phần: dán nguyên văn "Chú giải" của Phần (HS 2022, bản tiếng Việt), hoặc ghi "Phần không có chú giải". Sau khi có văn bản, thêm khoá Phần vào `KHOA_VAN_BAN` / `CHUONG_CUA_PHAN` trong `scripts/tang-4so/tach_phan_bo_sung.py` và chạy lại (tất định).

## Lỗi dữ liệu đã sửa (scripts/tang-4so/sua_dieu_khoan_tang2.py, tất định)
- `apChoChuong` của Phần XI (gan 50) thiếu Chương 54: thêm vào 116 mục.
- id trùng: 128 id lặp trên 350 mục (Phần XVII 13 id, Phần XI 19, Phần XVI 12, và nhiều Chương); mục xuất hiện lần đầu giữ id, các lần sau thêm hậu tố `~2`, `~3` (222 mục đổi).
- `dieu_khoan.py`: bảng số La Mã ghi gan "06" là Phần VI; đúng là Phần II (gan 06 = Chương 06-14). Đã sửa, thêm gan "28" = Phần VI.
