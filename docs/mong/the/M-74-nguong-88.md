# M-74 — Ngưỡng số & phân dải anh em — Chương 88

## Tổng quan
- Tổng số bản ghi: **17** (2 `DINH_NGHIA`, 15 `NGUONG`, 2 `phuDinh`).
- Phạm vi áp dụng: Chương 88 (Phương tiện bay, tàu vũ trụ và phương tiện bay không người lái).

## Đối soát rà soát số + đơn vị (Luật 6)
- Tổng số câu trúng số + đơn vị trong chú giải pháp lý, dòng biểu và chú giải chi tiết: **34** câu (13 dòng 6 số trong biểu + 13 dòng 8 số con trùng nội dung + 2 chú giải phân nhóm định nghĩa `cgpn:1`, `cgpn:2` + 6 câu chú giải chi tiết nhóm 88.01/88.02; `ranh-gioi`: 0 điều kiện số).
- Số câu rút thành bản ghi: **15** câu ngưỡng từ 13 dòng 6 số và 2 anh em `"Loại khác"` (`8806.29`, `8806.99` > 150 kg theo Luật 1) + **2** `DINH_NGHIA` (`cgpn:1` trọng lượng không tải, `cgpn:2` trọng lượng cất cánh tối đa); quy đổi thống nhất đơn vị `kg` (250 g = 0,25 kg) để kiểm kín dải anh em `8806.21–8806.29` và `8806.91–8806.99`.
- Số câu bỏ qua hợp lệ:
  - 13 dòng 8 số lặp lại nguyên văn dòng 6 số cha (`8802.11.00`, `8802.12.00`, `8806.21.00–8806.24.00`, `8806.91.00–8806.94.00`).
  - 3 câu chú giải chi tiết `nhom:8801:ct:4#3`, `5#3`, `6#2` nêu trọng lượng thông thường minh hoạ của bóng thám không.
  - 3 câu chú giải chi tiết `nhom:8802:ct:6#2`, `7#2`, `8#1` về mốc vận tốc `7.000 m/giây`: cả phương tiện đẩy quỹ đạo `> 7.000 m/giây` (mục (3)) lẫn phương tiện phóng dưới quỹ đạo mục đích khoa học `<= 7.000 m/giây` (mục (4)) đều thuộc `8802.60`; mốc `7.000 m/giây` chỉ dùng ở `ct:8#1` để loại tên lửa chiến đấu sang nhóm `93.06` (thuộc M-72).

## Kết quả cổng
- `khuon.mjs`: 0 lỗi.
- `cong.mjs` Cổng 3, 4, 5: 0 lỗi.
- `kiemDaiAnhEm`: phủ kín dải anh em `8802.11–8802.12`, `8802.20–8802.40`, `8806.21–8806.29`, `8806.91–8806.99`.
