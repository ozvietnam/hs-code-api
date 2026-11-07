# 42 ca Thông báo phân loại xếp khác chữ biểu thuế

Phân tích từng mục loại `LECH_CHUA_PHAN_XU` trong `data/ho-so/hieu-chinh-tien-le.json`, nhằm trả lời một câu hỏi:
vì sao TB-TCHQ xếp hàng vào mã khác với cách đọc thuần chữ biểu thuế.

- `ca/<id>.json`: một tệp cho mỗi ca. Gồm hàng hoá, hai mã, chênh thuế, nhãn nguyên nhân, giải thích, căn cứ nguyên văn
  có nguồn, mức chắc, bài học, đề xuất cho bảng, và những gì chưa kiểm được.
- `nhom.json`: xếp 42 ca vào 5 nhóm nguyên nhân, kèm đề xuất chung và 8 ca cần người quyết.

| Nhóm | Số ca | Ý nghĩa |
|---|---|---|
| D | 17 | Chữ biểu hẹp hơn cách đọc thuần (bản Anh, SEN, chú giải, quy chuẩn, tầng không mã) và Hải quan đọc đúng |
| A | 5 | Hải quan đã tự sửa đổi, thay thế; dữ liệu tiền lệ còn giữ bản cũ |
| B | 5 | Thông báo áp theo biểu cũ; dòng mới chỉ có từ biểu 30/12/2022 |
| C | 7 | Máy đọc nhầm hàng (tên khai của doanh nghiệp, tờ khai nhiều mặt hàng) |
| E | 8 | Còn mở, cần người quyết |

Trạng thái: **chưa áp vào bảng hiệu chỉnh**, chờ CEO quyết. Các câu trích lấy qua công cụ đọc web (luatvietnam, thư viện
pháp luật) được ghi rõ trong từng tệp; chưa đối chiếu bản PDF gốc. Dữ liệu cần sửa sau khi CEO chốt:
`data/precedents.json` đang giữ Thông báo đã bị thay thế (293, 18172, 6448, 6449) như tiền lệ còn hiệu lực.
