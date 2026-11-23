Tạo một app Node.js nhỏ, CHỈ gồm 2 tệp dưới đây (không giao diện, không gọi Gemini, không thêm thư viện).

1. `scripts/tom-tat-ban-do-4so.mjs` — export hàm thuần `tomTat(banDo)`:
   - `banDo`: mảng đối tượng `{ nhom: "8536", kieuNhom: "THEO_CHUC_NANG", hoSo: { chucNang:[…], coChe:[…], dangVatLy:[…], chatLieu:[…], oDauAiDung:[…], hangDuocNeu:[…], dieuKienBatBuoc:[…] }, canh: [{ den:"8535", loai:"PHAN_BIET", dacDiem:"…", … }], khongChac:[…] }`.
   - Trả chuỗi Markdown: một bảng, mỗi nhóm một dòng, cột: `Nhóm | Kiểu | Mục hồ sơ | Cạnh | Nối tới | Không chắc`. "Mục hồ sơ" = tổng số mục của 7 trục; "Nối tới" = các mã `den` không trùng, nối bằng dấu phẩy, theo thứ tự xuất hiện; "Không chắc" = số mục `khongChac`. Dòng cuối bảng: `**Tổng** | | <tổng mục> | <tổng cạnh> | <số mã den khác nhau> | <tổng không chắc>`.
   - Trục thiếu hoặc không phải mảng thì tính 0; nhóm thiếu `canh` thì 0 cạnh. Ký tự `|` trong dữ liệu phải thoát thành `\|`.
   - Chạy dòng lệnh: `node scripts/tom-tat-ban-do-4so.mjs ban-do.json` in bảng ra stdout.
2. `tests/tom-tat-ban-do-4so.test.mjs` (`node:test`), ít nhất 5 ca: hai nhóm bình thường; trục thiếu; nhóm không có `canh`; `den` trùng lặp chỉ in một lần; dữ liệu chứa `|`.

Điều kiện xong: `node --test tests/tom-tat-ban-do-4so.test.mjs` đạt hết. Báo lại nguyên kết quả lệnh.
