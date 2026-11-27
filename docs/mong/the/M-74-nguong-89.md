# M-74 — Ngưỡng số & phân dải anh em — Chương 89

## Tổng quan
- Tổng số bản ghi: **59** (**58** `NGUONG`, **1** `TACH_ANH_EM`, **3** `phuDinh`).
- Phạm vi áp dụng: Chương 89 (Tàu thủy, thuyền và các kết cấu nổi).

## Đối soát rà soát số + đơn vị & `ranh-gioi` (Luật 6)
- Toàn bộ **47/47** mã có điều kiện số trong `data/ho-so/ranh-gioi/89*.json` (GT nhóm 89.01, 89.02, 89.04; công suất `hp` 890400.32–35; lượng giãn nước `tấn` 8906.90.10–20) cùng **11** phân nhóm cân nặng/chiều dài nhóm 89.03 (`<= 100 kg`, `<= 7,5 m`, `7,5–24 m`, `> 24 m`) đều đã được tách `NGUONG` đầy đủ.
- Đã xử lý phần bù `"Loại khác"` theo Luật 1 + Luật 2: `8903.19` (`TACH_ANH_EM` phủ định cặp điều kiện ghép động cơ + `≤ 100 kg` của `8903.11` và `8903.12`), `8903.99` (`> 7,5 m` phủ định `8903.93`), `8906.90.90` (`> 300 tấn` phủ định `8906.90.10` và `8906.90.20`).
- Số câu bỏ qua hợp lệ: các dòng 8 số con thuộc `8903.11–8903.93` có cùng lời mô tả với nút 6 số cha.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi.
- `cong.mjs` Cổng 3, 4, 5: 0 lỗi.
- `kiemDaiAnhEm`, `kiemDonViDaiLuongTongQuat`, `doiChieuRanhGoi`: 0 lỗi.
