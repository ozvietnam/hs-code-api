# ADR-0004: Quy trình phân loại chuẩn, đi đúng trình tự 6 Quy tắc

- Trạng thái: **Đã duyệt** (CEO, 22/11/2026)
- Thay thế: mọi chỉ số "đúng mã 8 số" một lần trước đây. Bổ sung cho ADR-0002 và ADR-0003: đồ thị và tiêu chí 6 số là công cụ phục vụ quy trình này.
- Hiệu lực: luật cao nhất của hs-code-api. PR nào trái quy trình này thì không gộp.

Bản nháp ngày 22/11/2026, chờ CEO duyệt một lần. Sau khi duyệt, văn bản này đưa vào repo thành ADR và trở thành luật cao nhất. Mọi agent, mọi PR, mọi phép đo phải theo nó; việc nào không phục vụ quy trình này thì không làm.

## 1. Trình tự bắt buộc cho mỗi mặt hàng

**B0. Xác định bản chất hàng.**
- Xác định hàng là cái gì theo bản chất, không theo tên thương mại: làm bằng gì, chức năng chính, dùng cho máy hay thiết bị nào, trạng thái ra sao (hoàn chỉnh, chưa hoàn chỉnh, tháo rời, bộ phận, bộ, hỗn hợp).
- Nếu là bộ phận thì phải xác định **máy chủ** trước.
- Thiếu một dữ kiện mà luật dùng để tách hàng thì **dừng lại hỏi khách**. Câu hỏi phải gắn với đúng điều kiện luật cần dữ kiện đó, ví dụ: thanh quay hay chỉ chạy thẳng; vật liệu mặt đế tiếp đất; có van không; chất phân tán là nước hay dung môi; vận thăng có chở người không.

**B1. Quy tắc 1: tìm đoạn văn bản luật nhắc tới hàng.**
- Đọc theo thứ tự: tên nhóm → chú giải Phần và Chương (soát **điều loại trừ** trước) → chú giải chi tiết → ý kiến phân loại WCO.
- Với bộ phận máy, áp Chú giải 2 Phần XVI đúng thứ tự 2(a) → 2(b) → 2(c). Nhóm định danh riêng (8482, 8483, 8501, 8545…) thắng nhóm bộ phận (8431, 8503…).
- **Chỉ còn một nhóm thì DỪNG** và ghi rõ "Quy tắc 1". Không được viện dẫn Quy tắc 3 khi Quy tắc 1 đã giải quyết.

**B2–B5. Chỉ dùng khi Quy tắc 1 không giải quyết được.**
- Phải ghi rõ vì sao Quy tắc 1 không đủ.
- Thứ tự: Quy tắc 2 → 3a → 3b → 3c → 4 → 5. Dừng ở quy tắc đầu tiên giải quyết được.

**B6. Quy tắc 6: đi xuống trong nhóm.**
- Lặp lại B0–B5 ở từng cấp phân nhóm.
- Chỉ so các phân nhóm cùng cấp gạch, dùng chú giải phân nhóm.
- Xuống dòng 8 số theo biểu thuế Việt Nam và SEN.
- Dòng 8 số có dạng "của hàng thuộc phân nhóm X" thì phải phân loại máy chủ tới mức X.

**Tiền lệ** (thông báo của Tổng cục Hải quan, tờ khai cũ) chỉ dùng để **kiểm chứng ở bước cuối**, không bao giờ làm căn cứ chọn mã. Tiền lệ trái với chuỗi luật thì ghi cảnh báo, không đi theo.

## 2. Đầu ra bắt buộc

Mỗi tầng (4, 6, 8 số) phải có đủ:
- quy tắc quyết định;
- đoạn luật trích nguyên văn, kèm nguồn (tệp và khoá);
- hoặc trạng thái "dừng, cần hỏi", kèm câu hỏi và điều kiện luật mà câu hỏi phục vụ.

Không có trích dẫn thì không được trả mã.

## 3. Cổng máy (kiểm mọi câu trả lời và mọi PR)

Máy kiểm tự động và báo đỏ khi:
- có tầng không kèm trích dẫn;
- viện dẫn Quy tắc 3 trong khi đã có một nhóm khớp Quy tắc 1;
- dùng tiền lệ làm căn cứ chọn mã;
- mã thuộc Phần XV / Chương 73 mà chưa soát Chú giải 1(f) Phần XV và Chú giải 2 Phần XVI;
- điều kiện đảo ngược vế "trừ / nhưng không" (cổng `KHOA_NGUOC_VE_TRU`);
- điều kiện rộng hơn hoặc hẹp hơn chữ luật;
- chốt mã khi điều kiện luật đang thiếu dữ kiện, thay vì dừng hỏi.

## 4. Cách đo

**Bộ chuẩn.** Đáp án lấy từ tờ khai **không phải chân lý**. Bài mẫu 6 ca cho thấy 3/5 mã tờ khai sai luật. Bộ chuẩn phải được gắn nhãn lại theo luật, kèm chuỗi trích dẫn. Ca nào mô tả thiếu dữ kiện thì nhãn đúng là "dừng hỏi + câu hỏi", không phải một mã.

**Đo theo bậc thang**, mỗi tầng xếp vào ba ô: **đúng / sai / dừng hỏi đúng chỗ**.
- T1 (4 số): có AI.
- T2 (4 → 6), đưa sẵn nhóm đúng: không cần AI.
- T3 (6 → 8), đưa sẵn phân nhóm đúng: không cần AI.

**Đích:**
- T2 và T3: sai = 0.
- T1: tiến tới mức chuyên gia.
- Mọi tầng: hỏi đúng chỗ thiếu, không đoán.

## 5. Bài mẫu đã làm (22/11), dùng làm ca chuẩn đầu tiên

| Ca | Kết quả theo luật | Quy tắc quyết | Mã tờ khai | Hệ sai vì |
|---|---|---|---|---|
| Con lăn vận thăng, thép | 8431.31 → 84313110 hoặc 84313120 tuỳ vận thăng có chở người không | Chú giải 2(b) Phần XVI + QT6 | đúng có điều kiện | không xác định máy chủ là thang 8428.10 |
| Bát sen nhựa ABS | 39249090 (có van thì 8481.80) | QT1 + ý kiến WCO 3924.90/4 | **sai** | không tách đầu sen khỏi bộ sen có van; chép theo tờ khai |
| Dép xốp trong nhà | 64029990 (tạm, hỏi kiểu quai) | QT1 + Chú giải 3, 4 Ch.64 + WCO 6402.99/1 | **sai** | nhảy xuống phân nhóm 6402.20 khi không có dữ kiện |
| Bạc trục ty máy khoan | 84833090 hoặc 84314300 | Chú giải 2(a) hoặc 2(b) Phần XVI | đúng có điều kiện | không hỏi thanh quay hay chạy thẳng |
| Giá đỡ chổi than | 85030090 | chú giải chi tiết 85.45 mục (D) + Chú giải 2(b) | **sai** | (hệ đúng; bộ chuẩn sai) |
| Bột nhão nhôm | 32129011 | Chú giải 1(a) Phần XV + nhóm 32.12 | — | không soát điều loại trừ |

## 6. Việc dữ liệu phải làm để máy tự đi được trình tự này

1. **Bộ máy chạy trình tự** B0 → B1 (loại trừ, Chú giải 2 Phần XVI) → dừng → B6. `lib/gir.js` hiện chỉ gắn nhãn sau khi đã chọn mã; phải đổi thành bộ máy dẫn đường.
2. **Chú giải 2 Phần XVI thành bảng có thứ tự:** nhóm định danh riêng, kèm điều kiện của từng nhóm (ví dụ ổ trượt: trục quay), thắng nhóm bộ phận.
3. **Đưa vào sổ tay các câu loại trừ của chú giải chi tiết**, ví dụ "bộ phận giữ chổi than → 85.03", "bột nhão → Ch.32". Nối ý kiến WCO vào nhóm tương ứng.
4. **Bước "phân loại máy chủ"** cho các dòng 8 số dạng "của hàng thuộc phân nhóm…".
5. **Danh sách câu hỏi quyết định** gắn với từng điều kiện luật.
6. **Gắn nhãn lại bộ chuẩn theo luật.** Sửa các tiền lệ bị ghép sai (ví dụ 1097/TB-TCHQ năm 2020).

## 7. Dừng hoặc xuống ưu tiên

Các nhánh sau giữ nguyên trong kho nhưng không làm tiếp: bước tách câu, API Decision của Google, bảng model/hãng.

Các phần vẫn làm vì nằm trong quy trình:
- điều kiện tách phân nhóm theo chữ luật (phục vụ Quy tắc 6);
- câu hỏi phân biệt;
- cạnh nối từ chú giải.
