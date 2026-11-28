# ADR-0010 — M-81 chấm đúng/sai; gói nhóm phải kéo nhóm cạnh tranh tìm được bằng máy

- Trạng thái: CHẤP NHẬN (QT, 28/11/2026, theo quyết định CEO 28/11 "phân loại chỉ có đúng hoặc sai")
- Bổ sung: ADR-0007, ADR-0008, ADR-0009. Đứng dưới ADR-0004.
- Ghi chú số: kế hoạch giai đoạn 2 (`docs/ke-hoach-giai-doan-2-di-bang.md`) từng hẹn số 0010; quyết định đi bảng sẽ lấy số kế tiếp còn trống.

## Bối cảnh

Vòng 2b (4 nhóm 85.16, 84.71, 40.16, 94.05) từng được báo "đạt" theo điểm trung bình 0,857 và thấp nhất 0,797. QT dựa vào đó mở cuốn chiếu ngày 28/11. Cách chấm này trái luật đo của repo: đích sai phải bằng 0, cấm báo phần trăm gộp. CEO bác ngày 28/11.

Chấm lại theo đúng/sai trên bản gốc Gemini (bình luận fork trên #2410, 28/11):

| Nhóm | Điều kiện sai | Ca ra đích sai | Cặp chồng sót |
|---|---|---|---|
| 85.16 | 10 + 1 sai nghĩa | 8 | 0 |
| 84.71 | 16 | 4 | 0 |
| 40.16 | 24 | 0 | 0 |
| 94.05 | 20 | 0 | 2 |

Kết luận: KHÔNG ĐẠT. QT rút lệnh mở hàng đợi.

## Gốc đã đo

- Bảng vàng 84.71 (`docs/mong/the/M-81-vang-8471.md`, dòng 7) phải tra thêm ngoài gói ba câu: `chuong:85:cg:5#1` (điện thoại thông minh → 85.17), `chuong:85:cg:6:a#1` (thiết bị lưu trữ bền vững thể rắn → 85.23), `nhom:8523:ct:18#3` (ổ chớp USB).
- Gói `goi-nhom.mjs --nhom 8471` (503 câu, vân tay `2283e8ce…`) không có lần nào nhắc "85.23". `goi-nhom` chỉ lấy nhóm cạnh tranh từ dẫn chiếu số và từ `M-81-canh-tranh.md` (57 nút). Nhóm cạnh tranh mà luật không nhắc số nhóm đang xét thì không vào gói. Người soạn không có câu luật thì không thể viết điều kiện loại.
- Kho đã có máy tìm tất định, không AI: `lib/tim-cgct.js` (`timCgct`). Câu "ổ cứng thể rắn SSD lưu trữ dữ liệu cho máy tính" trả `8523, 8471, 8443, …`. Chưa ai nạp nó vào `goi-nhom`.

Bốn câu theo CLAUDE.md:
1. Bậc ADR-0004: Quy tắc 1, soát loại trừ và nhóm cạnh tranh ở cấp 4 số. Thiếu nhánh phân nhóm (8471.90) thuộc Quy tắc 6.
2. Cấu trúc sinh lỗi: gói nhóm không có tầng tìm kiếm, nên mọi nhóm soạn từ gói đều hụt cùng kiểu. Sửa máy, cấm vá từng nhóm.
3. Kho đã có: `lib/tim-cgct.js` và `lib/do-thi/phai-doc.js` (M-34, chạm một nút kéo ra hết). Nối vào, không viết máy tìm mới.
4. Cổng giữ: cổng 13 dưới đây.

## Quyết định

### 1. Chấm đúng/sai

- Mỗi điều kiện chỉ có đúng hoặc sai. "Một phần", thiếu, sai phạm vi, sai nghĩa đều là sai.
- Mỗi ca thử chỉ có đúng, sai (ra mã khác đích) hoặc dừng hỏi.
- Nhóm đạt khi so với bảng vàng có **0 điều kiện sai, 0 ca đích sai, 0 cặp chồng sót**. Bỏ `tiLe`, trung bình, ngưỡng phần trăm khỏi `so-phieu-dieu-kien` và README phiếu. Số đếm ghi bằng số nguyên (ví dụ 41/51), không đổi ra phần trăm để kết luận.
- `so-diem` giữ nghĩa cũ: `DONG` = cổng máy xanh. Chữ "đạt" chỉ dùng khi so vàng ra 0/0/0.

### 2. Gói nhóm kéo nhóm cạnh tranh tìm được bằng máy

`goi-nhom.mjs` thêm khối `canhTranhTimThay`:
- Câu hỏi cho máy tìm = nguyên văn từng dòng biểu của nhóm và từng câu CGCT của nhóm nêu hàng cụ thể. Gọi `timCgct` (`lib/tim-cgct.js`), giữ 10 nhóm đầu mỗi câu. Đặt 10 là TẠM; đổi bằng số đo ở mục 4.
- Nhóm khác nhóm đang xét xuất hiện trong kết quả là ứng viên cạnh tranh. Gói kéo tài liệu phải đọc của ứng viên qua `phai-doc`: chú giải chương có "Theo mục đích của nhóm X", các câu CGCT của nhóm X mà máy tìm trúng. Mỗi mục ghi nguồn tìm: câu hỏi, hạng, id câu.
- Kết quả tìm chỉ là tài liệu bắt buộc đọc. Không biến thành cạnh, không thành kết luận. Ai chọn nhóm vẫn là người soạn đọc luật (ADR-0005).

### 3. Cổng 13 — PHỦ CẠNH TRANH

Mọi nhóm trong `canhTranhTimThay` phải được bảng trả lời bằng một trong hai cách:
- có trong `CANH_TRANH` với `phepThu` trích nguyên văn, hoặc
- có trong `khongCanhTranh` kèm `trich` nguyên văn chứng minh hàng của nhóm này không rơi vào nhóm kia.

Thiếu thì cổng đỏ. Cổng chỉ kiểm cấu trúc và chuỗi con nguyên văn, không hiểu nghĩa chữ.

### 4. Đo lại chỉ ca sai

Sau khi mục 2 và 3 gộp:
- soạn lại 4 nhóm vòng 2b bằng gói mới;
- chỉ chấm lại 12 ca đích sai, 70 điều kiện sai và 2 cặp chồng sót;
- không chạy lại cả bộ.

Ca vẫn sai thì nêu gốc theo bốn câu ở trên rồi mới sửa tiếp.

### 5. Hàng đợi

Hàng đợi cuốn chiếu dừng tới khi mục 2 và 3 đã gộp và mục 4 ra 0/0/0 trên cả 4 nhóm. Nhóm đang khoá giữ bản nháp, chưa mở PR. Cấm sửa tay từng nhóm cho qua.

## Hệ quả

- Cuốn chiếu chậm lại. Đổi lại, gói đủ luật thì lỗi thiếu nhóm cạnh tranh không nhân ra 1.228 nhóm.
- Còn mở: 85.16 có câu loại trừ đặt sai phạm vi (8516:8108). Đây là lỗi soạn theo Luật 3 của skill `doc-tron-nhom`, không do gói. Mục 4 sẽ cho thấy lỗi này còn hay hết.

## Bổ sung 28/11 — vai trò và ba ô kết quả (CEO phê cách làm M-81)

CEO 28/11, nguyên văn (fork chuyển trên #2410): *"a cần kết quả cuối cùng chỉ có : đúng / sai ( dẫn luật ). [...] đi xây cổng kiểm, cho mô hình kém hơn chạy, sai - sửa cổng, ko sai thì tự động cho qua. Lại còn thuê người chấm chéo? Dùng llm local mà đi chấm chéo cho mô hình thông minh hơn nó 10 lần."*

### 6. Vai trò

- **Người soạn**: mô hình rẻ (Gemini qua agy), chạy dưới cổng máy.
- **Máy (cổng)**: chỉ kiểm phần tất định. Câu trích phải là chuỗi con của văn bản gốc và gắn đúng nút. Chuỗi luật phải đủ. Anh em và nhóm cạnh tranh phải được phủ. Chồng số học phải chứng minh được bằng máy.
- **Mô hình mạnh hơn người soạn** (Claude, theo quyết định CEO 13/11): làm bảng vàng trên mẫu để **tìm lỗi**. Mỗi lỗi tìm được phải thành một cổng máy mới, hoặc làm cổng cũ chặt hơn ("sai thì sửa cổng"). Cấm vá dữ liệu riêng nhóm đó cho qua.
- **Qua đủ cổng thì tự cho qua**: nhóm thành `DONG` và tự gộp khi CI xanh, không chờ người.
- **Bỏ** khâu soi bằng Gemma (`soi-chong.mjs`) với vai người chấm: mô hình yếu hơn không chấm mô hình mạnh hơn. Kết quả soi ở PR #2446 không dùng làm căn cứ. Phần kiểm chồng số học tất định vẫn giữ trong cổng 8.
- **Bỏ** gói duyệt cho người làm nghề (`docs/mong/duyet/`, 212 phiếu) khỏi kế hoạch: không thuê người chấm.

### 7. Ba ô kết quả cho mỗi mã 8 số

- **ĐÚNG**: mỗi bậc 4 → 6 → 8 có câu luật nguyên văn cho chính mã đó, **và** ở mỗi bậc, mọi mã anh em cùng cấp đều bị loại bằng một điều kiện có `trich` nguyên văn. Thiếu một mắt thì không được ghi ĐÚNG.
- **SAI**: dẫn câu luật mà kết quả vi phạm.
- **CHƯA ĐỦ DỮ KIỆN**: nêu đúng `cauHoi` phải hỏi khách, lấy từ điều kiện còn thiếu dữ kiện.

**Cổng 14 — ĐỦ CHUỖI** là cổng dương: nó đòi bằng chứng cho từng mắt, chứ không chỉ "không thấy lỗi". Mọi cổng hiện chỉ báo "không thấy lỗi" phải đổi sang đòi bằng chứng. Ví dụ ở 85.16, cổng 8 ra 0 cảnh báo chỉ vì phiếu ghi mỗi trục một giá trị.

### 8. Báo kết quả

- So với bảng vàng của mô hình mạnh hơn: mỗi ca chỉ một trong ba ô ĐÚNG / SAI / CHƯA ĐỦ DỮ KIỆN.
- Báo dạng "dùng N lần thì mấy lần ra kết quả sai". Vòng 2b: 12/191 ca ra mã sai, tức khoảng 16 lần dùng có 1 lần sai. Không dùng phần trăm.
- Ngưỡng mở hàng đợi vẫn là 0 lần sai trên các ca đã sai trước đó và trên mẫu kiểm.
