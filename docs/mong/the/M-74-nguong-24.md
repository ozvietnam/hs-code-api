# M-74 — Ngưỡng số & phân dải anh em — Chương 24

## Tổng quan
- Chương **24** (Thuốc lá và nguyên liệu thay thế lá thuốc lá đã chế biến; các sản phẩm có hoặc không chứa nicotin, dùng để hút mà không cần đốt cháy; các sản phẩm có chứa nicotin khác dùng để nạp nicotin vào cơ thể con người).
- Tổng số bản ghi: **0** (`NGUONG`: 0, `DINH_NGHIA`: 0, `TACH_ANH_EM`: 0, `phuDinh`: 0). Chương 24 không có ngưỡng định lượng phân loại hoặc định nghĩa chứa thông số trong biểu thuế (`bieu:24*`), chú giải pháp lý (`chuong:24:cg*`, `chuong:24:cgpn*`), chú giải chi tiết (`nhom:24*`, `pn:24*`, `sen:24*`) hay `data/ho-so/ranh-gioi/24*.json`.

## Đối soát rà soát số + đơn vị (Luật 6)
- Tổng số câu trúng số + đơn vị đo lường:
  - Chú giải pháp lý Chương 24 (`chuong:24:cg*`, `chuong:24:cgpn*`) + dòng biểu (`bieu:24*`): **0** câu (Chú giải 3 định nghĩa `"hút mà không cần đốt cháy"` và Chú giải phân nhóm 1 định nghĩa `"thuốc lá để sử dụng với tẩu nước"` đều là định nghĩa định tính thuần tuý, không chứa thông số định lượng).
  - Chú giải Phần IV (`phan:IV:cg:1#1`, định nghĩa `"viên"` kết dính `≤ 3%`): **1** câu cấp Phần, nhưng Chương 24 không có dòng biểu hay phân nhóm nào phân loại dạng `"viên"` (pellets).
  - Chú giải giải thích & SEN (`chuong:24:kq*`, `nhom:24*`, `pn:24*`, `sen:24*`): **2** câu trúng số + đơn vị (`sen:24041210:1#9`, `sen:24049110:1#5`).
  - Tài liệu tham khảo `data/ho-so/ranh-gioi/24*.json`: 13 tệp / **0** điều kiện số (`dieuKienSo`).
- Số câu rút thành bản ghi ngưỡng: **0**.
- Số câu bỏ qua hợp lệ: **2** câu trong SEN Chương 24 (kèm **1** câu cấp Phần IV không áp dụng):
  - `sen:24041210:1#9`: *"Chất lỏng thường bao gồm tổng cộng 95% là propylene glycol và glycerin, và 5% còn lại là hương liệu, nicotine và các chất phụ gia khác."* — dùng từ `"thường"`, mô tả tỷ lệ thành phần thương mại minh hoạ của dung dịch thuốc lá điện tử, không phải ngưỡng tách mã phân loại.
  - `sen:24049110:1#5`: *"Hàm lượng nicotin thường là 2 hoặc 4 mg nicotin, gần bằng hàm lượng nicotin trong 1/6 đến 1/3 điếu thuốc..."* — dùng từ `"thường"`, mô tả hàm lượng thương mại phổ biến của kẹo cao su nicotin, không phải ranh giới ngưỡng phân loại.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `nguong-test.mjs`, `test-ho-so-ma.mjs`, `test-ho-so-ma-tra.mjs`, `test-lop-kho.mjs`: PASS (`EXIT=0`).
