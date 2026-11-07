# Bộ đề bẫy phân loại HS (`bo-de-bay@1`)

37 hàng **thật** mà Hải quan đã ra Thông báo phân loại, chọn từ phân tích 42 ca tiền lệ lệch
(`docs/giao-viec/so-tay/tien-le-lech/`). Câu nào cũng có một **mã bẫy**: mã mà cách đọc thuần chữ biểu thuế, tên gọi hoặc
một Thông báo cũ dẫn tới. Dùng bộ đề để đo năng lực phân loại của một mô hình hay một hệ thống, và để thấy giá trị của việc
làm chi tiết từng phân nhóm 6 số.

## Tệp

| Tệp | Nội dung |
|---|---|
| `de.md` | Đề trơn (chỉ mã câu + mô tả hàng) để dán cho mô hình khác |
| `bo-de.json` | Đáp án: mã đúng, mã cũng chấp nhận, mã bẫy, thuế MFN hai mã, vì sao, Thông báo căn cứ, mức chắc |
| `../../scripts/cham-bo-de-bay.mjs` | Máy chấm |

## Bảy loại bẫy

| Mã | Bẫy |
|---|---|
| `NGHIA_HEP` | Chữ biểu nghe rộng, nghĩa thật hẹp (bản Anh, SEN, chú giải, quy chuẩn) |
| `TANG_CHA` | Tầng tiêu đề không mã phía trên quyết định |
| `TEN_KHAI_SAI` | Tên doanh nghiệp tự khai gây nhầm; phải đọc mô tả, kết quả phân tích |
| `TB_BI_THAY` | Thông báo cũ đã bị Hải quan sửa đổi, thay thế |
| `BIEU_CU` | Thông báo theo biểu cũ; biểu hiện hành có dòng mới |
| `THONG_SO` | Thông số đo được quyết định (độ dày, dải tần, dải sôi…) |
| `CONG_DUNG_THIET_KE` | Công dụng theo thiết kế, không theo tên gọi |

## Cách chấm một mô hình khác (ChatGPT, Gemini, DeepSeek…)

1. Dán toàn bộ `de.md` vào mô hình, yêu cầu trả lời đúng định dạng `id,ma` mỗi dòng.
2. Lưu câu trả lời thành tệp, ví dụ `chatgpt.csv`.
3. Chạy `node scripts/cham-bo-de-bay.mjs --tra-loi=chatgpt.csv`.

## Cách chấm hệ thống của mình

`node scripts/cham-bo-de-bay.mjs --he-thong --luu=he-thong.csv` gọi `/api/classify` của bản chạy thật cho từng câu (tốn tiền
LLM mỗi câu). `--chi=B01,K03` để chạy vài câu.

## Đọc kết quả

- **ĐÚNG**: trùng mã 8 số đáp án (hoặc mã trong `chapNhanThem` — chỉ dùng khi chính Hải quan dao động giữa hai dòng cùng thuế).
- **ĐÚNG 6 SỐ**: đúng phân nhóm nhưng sai dòng 8 số.
- **RƠI BẪY**: trả đúng mã bẫy, tức mắc đúng cái sai mà câu được soạn để bắt. Dòng "rơi bẫy mà thuế MFN khác" đếm câu sai làm
  lệch tiền thuế.

## Lưu ý khi so sánh

- Đây là bộ đề **khó có chủ ý**: chỉ gồm các ca từng làm máy hoặc người đọc sai. Điểm thấp hơn nhiều so với độ chính xác trung
  bình trên hàng thường; dùng để so *năng lực xử lý bẫy*, không để ước lượng tỉ lệ đúng chung.
- Hệ thống của mình có các Thông báo này trong kho tiền lệ. Đó chính là giá trị của dữ liệu: mô hình trần không có, nên phải tự
  suy ra từ chữ biểu.
- Mức chắc `VUA` ở một số câu: căn cứ đọc qua trang công bố (chưa đối chiếu PDF gốc) hoặc suy từ chi tiết hàng; xem `viSao`.
- 5 ca chưa đủ căn cứ (đèn LED tàu cá, gas oil, bánh Arletka, gạch porcelain, thép S50C) **không** đưa vào đề.
