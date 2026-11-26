# M-74 — Ngưỡng số & phân dải anh em — Chương 93

## Tổng quan
- Tổng số bản ghi: **4** (2 `NGUONG`, 2 `TACH_ANH_EM`, 2 `phuDinh`).
- Phạm vi áp dụng: Chương 93 (Vũ khí, đạn và bộ phận).

## Đối soát rà soát số + đơn vị & `ranh-gioi` (Luật 1, 2, 6)
- Toàn bộ **2/2** mã có điều kiện số trong `ranh-gioi/93*.json` (`9303.90.10` cỡ nòng `≥ 20 mm`, `9304.00.10` áp suất `< 7 kgf/cm2`) đã được rút thành `NGUONG`.
- Theo Luật 1 + Luật 2 (điều kiện ghép mục đích/chủng loại + thông số số), đã bổ sung `TACH_ANH_EM` (không khoảng số) kèm `phuDinh` cho hai anh em `"Loại khác"` là `9303.90.90` và `9304.00.90`.
- Bỏ qua hợp lệ: `nhom:9306:ct:6#1` (mốc `≤ 7.000 m/giây` chỉ dùng đối chiếu tên lửa đạn đạo với phương tiện phóng quỹ đạo `88.02`, không phải ngưỡng chung cho cả nhóm 93.06), và 5 câu ví dụ mô tả đạn súng săn trong `sen:93032010:1#*`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `doiChieuRanhGoi`: 0 thiếu.
