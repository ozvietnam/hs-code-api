# Giai đoạn 2 đồ thị tri thức: đo ngoại tuyến, không AI (24/11/2026)

Công cụ: `scripts/do-do-thi-gd2.mjs --so-sanh-tien-xu-ly`. Lượt ON có mô hình nghĩa thật (`coModelNghia: true`, chỉ mục 21.314 mục). Cờ khách không đổi.
Hai cấu hình chạy nối tiếp: có và không có `HS_TIM_CGCT`. ON = `HS_TIEN_XU_LY=on` (tiền xử lý câu + tìm theo nghĩa).

| Bộ | Thước | Đích | OFF | ON | ON + chú giải |
|---|---|---|---|---|---|
| S-7 để riêng (300) | nhóm trong 5 ứng viên | ≥ 92% | 89,0% | **93,0%** | **93,0%** |
| S-7 để riêng (300) | 6 số trong 3 ứng viên | ≥ 76% | 83,0% | 87,7% | 90,3% |
| S-7 để riêng (300) | trung vị chậm thêm so với OFF cùng cấu hình | ≤ 100 ms | — | **+104,9 ms** | +85,8 ms (chính cột OFF có chú giải đã chậm hơn OFF không chú giải ~94 ms) |
| Chưa từng khai (100) | nhóm trong 5 ứng viên | không kém nền | 56% | 69% | 69% |
| Van 5/2, van khí nén | 5/5; 30/30 | — | 100% | 100% | 100% |

## Kết luận
- Ba trong bốn điều kiện không cần AI đạt: nhóm trong 5 ứng viên 93,0%, 6 số 87,7% / 90,3%, hàng chưa từng khai không kém nền.
- **Chưa đạt chặt: chậm thêm.** Cấu hình gọn (không chú giải) +104,9 ms, vượt 100 ms khoảng 5%. Có chú giải thì chậm hơn bản gốc khoảng 0,18 giây.
- **Chưa đo: điều kiện "Có AI, nhóm 4 số không kém nền"** trên máy thật, bằng chuỗi mô hình đang phục vụ khách.

## Ghi chú về thước
- "6 số trong 3 ứng viên" tính trong nhóm đúng (nhóm đúng phải nằm trong danh sách), không phải 6 số trong 3 ứng viên tự do.
- `moRongUngVien` (C5, C6) chưa nối vào bước tìm: trên 300 ca, kéo thêm 798 nhóm, cứu 1 ca; 7 ca có cạnh tới nhưng điều kiện không khớp, 4 ca không có cạnh. Muốn dùng phải sửa luật khớp hoặc để ở bước phân biệt.

## Ba lỗi của công cụ đo đã sửa
1. Thiếu thư viện mô hình thì im lặng, gọi phần còn lại là tìm theo nghĩa: giờ in cảnh báo và thoát mã 3.
2. Bộ chưa từng khai lấy từ kho tiền lệ: mỗi ca tự tìm thấy chính nó (99% giả): giờ loại chính thông báo của ca.
3. Còn bản ghi gần trùng tên (33/100 ca): giờ loại thêm bản ghi trùng từ 80% chữ. Trước khi lọc, ON đo 77%.
