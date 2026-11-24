# Hàng đợi việc cho Studio (QT giao 25/11/2026)

Mỗi lần được gọi: lấy **lô kế tiếp chưa có kết quả** theo thứ tự dưới đây, làm 3 đến 6 lô, chạy cổng tới khi lỗi 0, gửi PR từ fork, rồi làm tiếp lượt sau. Lô đã có tệp kết quả trên `main` hoặc trong PR đang mở thì bỏ qua.

| Thứ tự | Việc | Gói (nhánh tmp/studio-viec) | Số lô | Kết quả ghi ở |
|---|---|---|---|---|
| 1 | 01 Soát cạnh loại trừ hai vế (đề ở THE.md của thư mục) | studio-viec/01-soat-canh-hai-ve | 18 | data/do-thi/soat-canh-hai-ve/ |
| 2 | 03 Duyệt cạnh bản đồ 4 số | studio-viec/03-duyet-canh-ban-do | 24 | data/do-thi/soat-studio/03/ |
| 3 | 02 Quan hệ khi chú giải nhắc tên nhóm khác | studio-viec/02-quan-he-nhac-ten | 15 | data/do-thi/soat-studio/02/ |
| 4 | 05 Câu hỏi phân biệt giữa hai nhóm | studio-viec/05-cau-hoi-phan-biet | 16 | data/do-thi/soat-studio/05/ |
| 5 | 04 Điều kiện loại trừ có đúng câu trích không | studio-viec/04-dieu-kien-loai-tru | 32 | data/do-thi/soat-studio/04/ |

Đọc tệp: `https://raw.githubusercontent.com/ozvietnam/hs-code-api/tmp/studio-viec/<đường dẫn>`.

## Luật chung
1. Chỉ dùng chữ trong gói, không dùng trí nhớ về biểu thuế. Không đủ chữ thì chọn nhãn không chắc, không đoán.
2. Trong gói có **mục đã bị làm sai cố ý** để kiểm người soát. Xét từng mục độc lập, đừng chấm hàng loạt. Lô bắt sót mục sai sẽ bị trả lại.
3. Mọi `chungMinh` chép nguyên văn, lược bằng `…`.
4. PR chỉ thêm tệp dưới thư mục kết quả. Không sửa `data/so-tay/`, không sửa mã.
5. Mô tả PR điền đúng: `**Thứ tự gộp (L10):** Độc lập.` · `Không đổi hành vi LLM: chỉ thêm tệp kết quả soát, chưa mã nào đọc.` · lệnh cổng và dòng kết quả.
6. Không nối app thẳng vào `main` của kho này.

## Khuôn kết quả việc 02, 03, 04, 05
Mỗi lô một tệp `lo-NN.json`:
```json
{"khuon":"soat@1","viec":"03","lo":1,"kq":[{"ma":"03-01-01","ketLuan":"DUYET","vi":"lý do ngắn, ít nhất 15 ký tự","chungMinh":"câu nguyên văn"}]}
```
Cổng: `node studio-viec/kiem.mjs 03` (thay số việc), đủ mọi mục, lỗi 0.

### Việc 03: duyệt cạnh bản đồ
Mục nói: giữa `nhomA` và `nhomB`, xét `dacDiem`; nếu `neu` thì vào nhóm `thi`, còn `conNeu` thì vào nhóm `thiKia`.
- `DUYET`: chú giải hai nhóm đỡ cả hai vế, đúng chiều nhóm.
- `SUA`: ý đúng nhưng câu chữ rộng, hẹp hoặc lẫn; ghi `"sua":{"neu":"…","conNeu":"…"}`.
- `BO`: sai chiều, sai nhóm hoặc chú giải không nói vậy.

### Việc 02: quan hệ khi nhắc tên
`cau` trong chú giải `nhomTu` nhắc `nhomDuocNhac`. Đọc cả `chuGiai` (câu dẫn của danh sách, ví dụ "không bao gồm:", thường nằm trước).
- `LOAI_TRU` hàng được nêu không thuộc nhomTu mà thuộc nhomDuocNhac · `NGUYEN_LIEU` là nguyên liệu, thành phần, bộ phận hoặc vật được gia công · `PHAN_BIET` nêu tiêu chí chia giữa hai nhóm, cả hai bên đều được tả · `DAN_CHIEU` chỉ tham khảo · `KHONG_RO`.

### Việc 05: câu hỏi phân biệt
`hoi`: trả lời Có thì vào `neuCo`, Không thì vào `neuKhong`.
- `DUNG` · `SUA` (ý đúng, câu hỏi chưa rõ; ghi `hoiMoi`) · `SAI` (đảo chiều hoặc chú giải không đỡ).

### Việc 04: điều kiện loại trừ
Mục nói: theo `trich`, hàng thoả `dieuKien` không thuộc `nhomNguon` mà thuộc `nhomDich`.
- `DUNG` · `RONG` (dieuKien rộng hơn câu trích; ghi `dieuKienMoi` sát chữ) · `SAI` (điều kiện hoặc nhóm đích không phải điều câu trích nói) · `KHONG_RO`. `chungMinh` chép từ `trich`.
