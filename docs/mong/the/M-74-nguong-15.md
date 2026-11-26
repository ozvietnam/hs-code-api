# M-74 Ngưỡng số và phân dải anh em — Chương 15

## Tổng hợp
- Tổng số bản ghi: **44** (**35** `NGUONG`, **1** `DINH_NGHIA`, **8** `TACH_ANH_EM`).
- Phân dải định nghĩa & phạm vi phân nhóm: `chuong:15:cgpn:1#1` gắn `bieu:150930`; `chuong:15:cgpn:2#1` giữ `DINH_NGHIA` ở `bieu:15141` và tách `NGUONG` axit eruxic < 2% gắn trực tiếp `bieu:151411`, `bieu:151419` (Luật 5 + Luật 7).
- Bảng chỉ số iốt SEN (`1516.20.34`, `35`, `46`, `47`) và chỉ số axit tự do dầu ô liu (`1509.20`, `1509.90`) được tách từng nhánh `HOẶC` theo Luật 3.

## Đối soát số+đơn vị (Luật 6)
- Đã kiểm tra toàn bộ chú giải chương/phân nhóm, biểu 15.01–15.22, chú giải chi tiết, SEN và 36 tệp `data/ho-so/ranh-gioi/15*.json`: phủ 100% nút có điều kiện số.
- Bỏ qua hợp lệ: các số liệu minh họa `sen:1511:1#2` ("Điển hình, nó chứa 40%... 45%... 5%"), thông số quá trình phản ứng `nhom:1518:ct:9#1` (250-300°C), tỷ lệ ước lượng `nhom:1521:ct:31#1` ("khoảng 1/3... 2/3").

## Kết quả tự kiểm
- `khuon`: 0 lỗi · Cổng 4/5: 0 lỗi · `kiemDaiAnhEm`: 0 lỗi · `doiChieuRanhGoi`: 0 thiếu · `test-ho-so-ma`, `test-ho-so-ma-tra`, `test-lop-kho`: đạt.

## Sửa bổ sung theo QT (@1ef7120e)
- Chuyển bản ghi `chuong:15:cg:1:c#1` (`≤ 15%` sản phẩm nhóm 04.05) từ `chuong:15` sang `bieu:1517` (Luật 7).
- Bổ sung `NGUONG` bù cho `bieu:15149` (`≥ 2%` axit eruxic, `ghiChu: "phuDinh: bieu:15141"` — Luật 1). Tổng bản ghi sau sửa: **45**.
