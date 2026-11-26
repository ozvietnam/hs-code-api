# M-74 — Ngưỡng số & phân dải anh em — Chương 91

## Tổng quan
- Tổng số bản ghi: **9** (1 `DINH_NGHIA`, 6 `NGUONG`, 2 `TACH_ANH_EM`, 2 `phuDinh`).
- Phạm vi áp dụng: Chương 91 (Đồng hồ thời gian, đồng hồ cá nhân và bộ phận).

## Đối soát rà soát số + đơn vị & chỉnh sửa theo soát xét (Luật 1, 2, 5, 7)
- Tổng số câu trúng số + đơn vị: **8** câu (`chuong:91:cg:3#2`, `nhom:9103:ct:1#3`, `9103:ct:4#1`, `9105:ct:2#3`, `9106:ct:19#2`, `9108:ct:9#2`, `9109:ct:6#1`, `9114:ct:31#3`; `ranh-gioi`: 0 điều kiện số).
- **Luật 5 & Luật 7**: Giữ `DINH_NGHIA` ở `chuong:91`, và gắn đủ cặp `NGUONG` của định nghĩa "máy đồng hồ cá nhân" (chiều dày `≤ 12 mm`, chiều rộng/dài/đường kính `≤ 50 mm`) từ `chuong:91:cg:3#2` trực tiếp lên tất cả các nút biểu dùng thuật ngữ này làm điều kiện bắt buộc: `bieu:9103` (đồng hồ thời gian lắp máy đồng hồ cá nhân), `bieu:9108` (máy đồng hồ cá nhân hoàn chỉnh), và `bieu:91101` (máy đồng hồ của đồng hồ cá nhân trong 91.10).
- **Xét `bieu:9107` (không gắn NGUONG)**: Nhóm `91.07` gồm thiết bị đóng ngắt định giờ "có máy đồng hồ cá nhân **hoặc** đồng hồ thời gian **hoặc** có động cơ đồng bộ". Vì đây là điều kiện `HOẶC` (các thiết bị có máy đồng hồ thời gian > 12 mm / > 50 mm hoặc động cơ đồng bộ vẫn ở lại `91.07`), nếu gắn `NGUONG` `≤ 12 mm` / `≤ 50 mm` lên `bieu:9107` máy sẽ lọc nhầm và loại bỏ các thiết bị dùng máy đồng hồ thời gian khỏi `91.07` (trái Luật 4).
- **Luật 1 & Luật 2**: Do định nghĩa máy đồng hồ cá nhân ghép nhiều chiều (`≤ 12 mm` VÀ `≤ 50 mm` VÀ cơ cấu chỉ/mặt hiển thị), phần bù `bieu:9109` (đối lập `91.08`) và `bieu:911090` (`Loại khác` đối lập `9110.1`) phải ghi là `TACH_ANH_EM` kèm `voi` + `phuDinh`, **không** gắn khoảng số `>`.
- Bỏ qua hợp lệ: `nhom:9103:ct:1#3`, `4#1`, `9108:ct:9#2`, `9109:ct:6#1` (cụ thể hoá cùng cặp ngưỡng 12 mm / 50 mm đã gắn trên `91.03`, `91.08–91.09`), `9105:ct:2#3`, `9106:ct:19#2`, `9114:ct:31#3` (số liệu minh hoạ có từ "thường" / "hiếm khi").

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi.
