# M-37 — Chỉ mục nghĩa trên nút luật (cửa vào)

Căn cứ: `docs/mong/nghien-cuu-do-thi-hs.md` (tìm theo nghĩa để **vào cửa**, không để kết luận), ADR-0005, khuôn `docs/mong/khuon-nut-luat.md`, câu M-31 (`data/luat-goc/cau/`).
Chỉ mục KHÔNG nối vào đường khách nào. `lib/chi-muc-luat.js` chỉ có `timNghia(q, {limit})`; chỗ cắm của M-41 (`timNghia` trong `lib/tim-luat.js`) đồng bộ và chờ một mảng, còn hàm này bất đồng bộ (phải nhúng câu hỏi) nên khi cắm cần `await` và lấy `.ketQua`.

## Cái gì vào chỉ mục

| Kho | Mục | Ghi chú |
|---|---|---|
| phan | 737 | mọi câu của Phần (tên, chú giải, khái quát) |
| chuong | 4.180 | mọi câu của Chương (chú giải, khái quát, phân chương) |
| nhom | 29.684 | chú giải chi tiết nhóm |
| phan-nhom | 1.869 | chú giải chi tiết phân nhóm |
| sen | 3.285 | SEN |
| bieu | 7.146 | chỉ TÊN cấp chương (97), nhóm (1.269), phân nhóm 6 số (5.780); không dòng 8 số, không tiêu đề không mã |
| **cộng** | **46.901** | trên 64.124 câu của 6 kho nguồn |

- Không vào: `gir`, `wco` (980/980 nút đều `ocr:true`, nên 0 mục WCO), `thong-bao` (tiền lệ), mọi nút `lop` TIEN_LE / BO_TRO / THUC_TE, id `tb:*` / `wco:*`. Số nút bị cấm trong 6 kho nguồn: 0 (cổng vẫn kiểm).
- Câu dẫn trần ("Nhóm này không bao gồm:") không thành mục riêng, vì các mục con đã mang nó trong chữ nhúng. Tên trong biểu luôn là mục.
- Chữ nhúng = `passage: đường dẫn cha (Phần › Chương › Nhóm[ › Phân nhóm]) | câu dẫn | câu`. Tên Phần cắt 60, Chương 70, Nhóm/Phân nhóm 80 ký tự để tên Phần dài không lấn câu. Câu dẫn của dòng biểu = tiêu đề cha không mã ("Ngựa:"); của kho khác = `dan` của M-31.
- Đường dẫn cha lấy từ id + `data/hs-sections.json` (chương → phần). Với SEN, đường dẫn dừng ở nhóm / phân nhóm 6 số, không chứa mã 8 số.
- Gộp: không phải gộp (vec.bin 17,2 MB < 25 MB). Mã gộp có sẵn (câu ngắn < 80 ký tự liền nhau cùng câu dẫn và cùng đường dẫn cha) và có test, tự bật khi quá 25 MB.

## Cỡ tệp, bộ nhớ, thời gian (máy dev .131, CPU, 32 nhân, tải nền ~28)

| Số đo | Giá trị |
|---|---|
| `vec.bin` | 18.009.984 byte (46.901 × 384 int8) |
| `id.json` / `meta.json` | 889.131 / ~2.100 byte |
| Dựng (transformers.js, q8, CPU, giới hạn 16 nhân, mẻ 64) | 898 giây (15 phút) |
| Dựng lần hai (`--kiem`) | 1.028 giây; cùng `idSha256` và `vecSha256` (`7a4ee66e…`) với lần một, nghĩa là ra cùng danh sách và cùng từng byte vectơ |
| Nạp chỉ mục (đọc + sha256 mọi kho nguồn) | 191 ms; RSS tiến trình 45 → 93 MB |
| Nạp mô hình (dùng chung `khoiTaoModel()` của embed-pool) | 1,7 s; RSS 527 MB (mô hình đã có ở máy phục vụ, không nạp bản thứ hai) |
| Truy vấn đầu (đọc lười các kho để dựng kết quả) | 562 ms; RSS 638 MB |
| Mỗi truy vấn sau | trung vị 49 ms (tối đa 77): nhúng câu hỏi ~8 ms + quét int8 ~41 ms bằng JS thuần |

Mô hình `Xenova/multilingual-e5-small` q8, 384 chiều, tiền tố `passage: ` khi dựng, `query: ` khi hỏi. Không dùng GPU, không dùng Ollama. Bge-m3 (chữ trong thẻ) không dùng, vì chỉ mục phải cùng không gian với mô hình đang chạy ở máy phục vụ.

## Dựng lại, kiểm và cổng

- `node scripts/luat-goc/chi-muc.mjs` dựng; `--kiem` dựng vào bộ nhớ rồi so id và sha256 vectơ với tệp đang có.
- `meta.json` ghi số mục, mô hình, sha256 của 13 tệp nguồn (6 kho, 6 kho câu, `hs-sections.json`) và sha256 của `vec.bin` / `id.json`. Không có dấu thời gian.
- Kho nguồn lệch sha so với `meta.nguon` → `timNghia` trả `{trangThai:"CU", tepLech:[…], ketQua:[]}`, không trả kết quả cũ. Thiếu tệp → `THIEU`; `vec.bin` sai sha → `HONG`; không nhúng được câu hỏi → `LOI`.
- `scripts/test-chi-muc-luat.mjs` (36 ca, không mạng, không mô hình, vectơ giả; nằm trong `danh-sach-test.txt`): ca ngược TIEN_LE / BO_TRO / `tb:` lọt vào chỉ mục / WCO scan / dòng 8 số / tiêu đề không mã / sha lệch / `vec.bin` bị sửa / câu hỏi rỗng / không nhúng được / lib không đọc từ điển, tờ khai, tiền lệ / không đường khách nào nạp lib. Phần cuối kiểm chỉ mục thật: dựng lại danh sách (không cần mô hình) ra đúng `id.json`.
- Sau này ai sửa kho luật gốc thì chỉ mục thành `CU` (test không đỏ, chỉ in INFO) cho tới khi dựng lại.

## 15 truy vấn bằng lời thường (tự nghĩ, không lấy từ bộ thử nào trong repo)

Mỗi truy vấn in 3 nút đầu: id nút (điểm cosine) · đường dẫn cha (id) · câu nhắc đầu (chữ cắt 170 ký tự, kèm câu dẫn nếu có).


### máy bơm nước dùng tưới vườn
- nhom:8432:ct:34 (0.8756) · phan:XVI › chuong:84 › bieu:8432
  - câu `nhom:8432:ct:34#1`: (b) Máy đẩy chất lỏng và bơm chất lỏng (bao gồm trục bơm để đặt trên những bánh xe của máy nông nghiệp để phun, hoặc tưới, v.v..)  [dẫn: Nhóm này không bao gồm:]
- sen:84137011:1 (0.8728) · phan:XVI › chuong:84 › bieu:8413 › bieu:841370
  - câu `sen:84137011:1#1`: 8413.70.11 8413.70.19 BƠM NƯỚC MỘT TẦNG, MỘT CHIỀU HÚT, TRỤC NGANG ĐƯỢC TRUYỀN ĐỘNG BẰNG DÂY ĐAI HOẶC KHỚP NỐI TRỰC TIẾP, TRỪ LOẠI BƠM ĐỒNG TRỤC VỚI ĐỘNG CƠ Đây là loại b
- sen:84137019:1 (0.8728) · phan:XVI › chuong:84 › bieu:8413 › bieu:841370
  - câu `sen:84137019:1#1`: 8413.70.11 8413.70.19 BƠM NƯỚC MỘT TẦNG, MỘT CHIỀU HÚT, TRỤC NGANG ĐƯỢC TRUYỀN ĐỘNG BẰNG DÂY ĐAI HOẶC KHỚP NỐI TRỰC TIẾP, TRỪ LOẠI BƠM ĐỒNG TRỤC VỚI ĐỘNG CƠ Đây là loại b

### áo thun cotton cho trẻ em
- nhom:6111:ct:2 (0.8612) · phan:XI › chuong:61 › bieu:6111
  - câu `nhom:6111:ct:2#2`: bao gồm, ngoài các sản phẩm khác, các sản phẩm dệt kim hoặc móc như áo khoác ngắn cho trẻ em, áo tiên, quần yếm của trẻ con, yếm dải của trẻ sơ sinh, găng tay, găng tay h
- nhom:6209:ct:5 (0.8604) · phan:XI › chuong:62 › bieu:6209
  - câu `nhom:6209:ct:5#1`: (a) Mũ bonnet (mũ rộng vành có dây buộc ở cằm) dành cho trẻ em (nhóm 65.05).  [dẫn: Nhóm này không bao gồm:]
- nhom:6209:ct:2 (0.8573) · phan:XI › chuong:62 › bieu:6209
  - câu `nhom:6209:ct:2#1`: Nhóm này, không kể những cái khác, bao gồm các sản phẩm như áo khoác ngắn cho trẻ em, áo tiên, quần yếm của trẻ con, yếm dải của trẻ sơ sinh, găng tay, găng tay hở ngón, 

### nồi chiên không dầu
- sen:84148043:1 (0.8665) · phan:XVI › chuong:84 › bieu:8414 › bieu:841480
  - câu `sen:84148043:1#15`: Ưu điểm chính của máy nén kín và bán kín là không có lỗ rò ga.
- nhom:8487:ct:5 (0.8612) · phan:XVI › chuong:84 › bieu:8487
  - câu `nhom:8487:ct:5#6`: và các vòng làm kín dầu.
- bieu:841470 (0.8598) · phan:XVI › chuong:84 › bieu:8414
  - câu `bieu:841470#1`: - Tủ an toàn sinh học kín khí:

### pin sạc dự phòng cho điện thoại
- nhom:8506:ct:3 (0.8664) · phan:XVI › chuong:85 › bieu:8506
  - câu `nhom:8506:ct:3#1`: Các pin sơ cấp được sử dụng để cấp nguồn cho nhiều mục đích khác nhau (chuông điện, các thiết bị điện thoại, máy trợ thính, camera, đồng hồ, máy tính bỏ túi, máy tạo nhịp
- nhom:8506:ct:2 (0.8601) · phan:XVI › chuong:85 › bieu:8506
  - câu `nhom:8506:ct:2#8`: Đặc điểm chính của pin sơ cấp là không sạc được hoặc sạc không hiệu quả.
- nhom:9021:ct:56 (0.8596) · phan:XVIII › chuong:90 › bieu:9021
  - câu `nhom:9021:ct:56#3`: Chúng có một bộ pin điện được liên kết với tim bằng các điện cực để phát xung kích thích tim.  [dẫn: Nhóm này gồm có:]

### gạo thơm đóng túi
- sen:10063060:1 (0.8802) · phan:II › chuong:10 › bieu:1006 › bieu:100630
  - câu `sen:10063060:1#1`: 1006.30.60 GẠO MALYS Gạo Malys (Oryza Sativa L. còn được gọi là “gạo Malys Angkor”) dùng để chỉ các loại gạo thơm cao cấp nhạy cảm với thời tiết ẩm ướt, gạo có mùi thơm t
- sen:10063070:1 (0.8797) · phan:II › chuong:10 › bieu:1006 › bieu:100630
  - câu `sen:10063070:1#1`: 1006.30.70 GẠO THƠM KHÁC Gạo thơm, hay còn gọi là gạo có hương thơm, là loại gạo hảo hạng, có mùi thơm tự nhiên và mùi thơm đặc trưng.
- nhom:1006:ct:6 (0.875) · phan:II › chuong:10 › bieu:1006
  - câu `nhom:1006:ct:6#1`: Loại gạo đã xát toàn bộ có thể được đánh bóng rồi hồ (glazed) bề mặt để tăng giá trị cảm quan.

### giày thể thao đế cao su
- nhom:6401:ct:11 (0.8809) · phan:XII › chuong:64 › bieu:6401
  - câu `nhom:6401:ct:11#1`: Quy trình này tương tự như đúc bằng lực ép, chỉ khác là các phôi đã tạo hình trước hoặc phôi ở dạng hạt được sử dụng trong quy trình đúc bằng lực ép được thay thế bằng mộ
- bieu:640411 (0.8791) · phan:XII › chuong:64 › bieu:6404
  - câu `bieu:640411#1`: - - Giày, dép thể thao, giày tennis, giày bóng rổ, giày thể dục, giày luyện tập và các loại tương tự:  [dẫn: - Giày, dép có đế ngoài bằng cao su hoặc plastic:]
- sen:64039130:1 (0.8777) · phan:XII › chuong:64 › bieu:6403 › bieu:640391
  - câu `sen:64039130:1#1`: 6401.92.10 6402.91.92 6402.99.20 6403.91.30 6403.99.30 GIÀY DÉP, CÓ MŨI GIÀY ĐƯỢC GẮN BẢO VỆ KHÔNG PHẢI KIM LOẠI Giày dép có gắn mũi bảo vệ không phải kim loại, như nhựa 

### dây cáp sạc USB
- bieu:983424 (0.8794) · bieu:9834
  - câu `bieu:983424#1`: - Giắc cắm, đầu nối cổng nối USB, giắc mạng để nối dây dẫn tín hiệu
- nhom:8544:ct:15 (0.8606) · phan:XVI › chuong:85 › bieu:8544
  - câu `nhom:8544:ct:15#1`: (3) Các dây và cáp viễn thông (kể cả cáp ngầm dưới biển và dây, cáp truyền dữ liệu) nói chung có cấu tạo thành cặp, 4 lõi hoặc một lõi cáp, chúng đều có vỏ bọc.  [dẫn: Nhóm này bao gồm, không kể những cái khác:]
- bieu:983420 (0.8603) · bieu:9834
  - câu `bieu:983420#1`: - Đầu kết nối USB mini, sử dụng cho nạp pin và truyền dữ liệu từ điện thoại đến máy tính PC

### ghế sofa bọc da
- pn:940171:ct:1 (0.8658) · phan:XX › chuong:94 › bieu:9401 › bieu:940171
  - câu `pn:940171:ct:1#1`: Phân nhóm 9401.61 và 9401.71 “Ghế bọc” là loại ghế có một lớp lót mềm, ví dụ bằng bông, lanh, lông thú, nhựa xốp hay cao su xốp, được định dạng theo ghế (cố định hay khôn
- pn:940161:ct:1 (0.8655) · phan:XX › chuong:94 › bieu:9401 › bieu:940161
  - câu `pn:940161:ct:1#1`: Phân nhóm 9401.61 và 9401.71 “Ghế bọc” là loại ghế có một lớp lót mềm, ví dụ bằng bông, lanh, lông thú, nhựa xốp hay cao su xốp, được định dạng theo ghế (cố định hay khôn
- nhom:9401:ct:13 (0.8577) · phan:XX › chuong:94 › bieu:9401
  - câu `nhom:9401:ct:13#1`: Nhóm này cũng bao gồm những bộ phận có thể xác định được của ghế, như lưng ghế, mặt ghế và tay tựa (đã hoặc chưa bọc rơm hay bọc bằng mây đan, nhồi hay lắp lò xo), vỏ bọc

### đồ chơi lắp ráp bằng nhựa
- nhom:9503:ct:25 (0.8733) · phan:XX › chuong:95 › bieu:9503
  - câu `nhom:9503:ct:25#1`: (iii) Đồ chơi xây dựng (bộ lắp ráp xây dựng, hình khối, v.v).  [dẫn: Chúng bao gồm:]
- nhom:9508:ct:14 (0.8661) · phan:XX › chuong:95 › bieu:9508
  - câu `nhom:9508:ct:14#1`: (b) Máy kéo và các xe vận tải khác, kể cả rơmoóc, ngoại trừ các loại được thiết kế đặc biệt dành cho và là một bộ phận của trò giải trí (ví dụ rơmoóc đóng vai trò hỗ trợ   [dẫn: Nhóm này không bao gồm:]
- nhom:9508:ct:4 (0.8658) · phan:XX › chuong:95 › bieu:9508
  - câu `nhom:9508:ct:4#2`: Chúng sử dụng xe chuyên dụng trong đó người chơi ngồi và được giữ chặt khi di chuyển trên đường ray lên xuống theo kiểu thiết kế, đôi khi có một hoặc nhiều lần đảo ngược   [dẫn: Trò chơi di chuyển trong công viên giải trí và trò chơi công]

### dầu gội đầu
- nhom:3305:ct:2 (0.8815) · phan:VI › chuong:33 › bieu:3305
  - câu `nhom:3305:ct:2#2`: Toàn bộ các loại dầu gội đầu này có thể chứa dược phẩm phụ trợ hoặc thành phần khử mùi, ngay cả chúng có chức năng phòng bệnh hoặc chữa bệnh (xem Chú giải 1(e) của Chương  [dẫn: Nhóm này gồm có:]
- nhom:3301:ct:13 (0.8765) · phan:VI › chuong:33 › bieu:3301
  - câu `nhom:3301:ct:13#1`: Nhựa dầu đã được chiết xuất, trong thương mại có tên gọi là "nhựa dầu đã điều chế" hoặc "nhựa dầu spice", thu được từ các nguyên liệu thực vật thô cellular tự nhiên (thôn
- bieu:330510 (0.8746) · phan:VI › chuong:33 › bieu:3305
  - câu `bieu:330510#1`: - Dầu gội đầu:

### xe đạp điện
- phan:XVII:kq:3 (0.8859) · phan:XVII
  - câu `phan:XVII:kq:3#28`: (e) Thiết bị chiếu sáng, phát tín hiệu, gạt nước, chống tạo sương và tuyết họat động bằng điện dùng cho xe đạp hoặc các phương tiện có động cơ (nhóm 85.12);
- sen:87116012:1 (0.8819) · phan:XVII › chuong:87 › bieu:8711 › bieu:871160
  - câu `sen:87116012:1#2`: Nó có chiều cao thông thường dưới 50 cm (20 in), và chiều dài lên đến 1 m (3 ft 3 in).
- sen:87116092:1 (0.8819) · phan:XVII › chuong:87 › bieu:8711 › bieu:871160
  - câu `sen:87116092:1#2`: Nó có chiều cao thông thường dưới 50 cm (20 in), và chiều dài lên đến 1 m (3 ft 3 in).

### ống thép không gỉ hàn
- bieu:982910 (0.9213) · bieu:9829
  - câu `bieu:982910#1`: - Hàn, bằng thép không gỉ
- bieu:9828 (0.9015) · —
  - câu `bieu:9828#1`: Ống chống bằng thép hàn có đầu nối đi kèm, đường kính từ 20 inch đến 36 inch, sử dụng cho khoan dầu hoặc khí.
- bieu:982800 (0.896) · bieu:9828
  - câu `bieu:982800#1`: Ống chống bằng thép hàn có đầu nối đi kèm, đường kính từ 20 inch đến 36 inch, sử dụng cho khoan dầu hoặc khí.

### cà phê rang xay đóng gói
- nhom:0901:ct:4 (0.8795) · phan:II › chuong:09 › bieu:0901
  - câu `nhom:0901:ct:4#1`: (3) Cà phê đã rang (đã hoặc chưa khử chất caffeine) đã hoặc chưa xay, nghiền.  [dẫn: Nhóm này gồm:]
- sen:09011120:1 (0.8771) · phan:II › chuong:09 › bieu:0901 › bieu:090111
  - câu `sen:09011120:1#1`: 0901.11.20 0901.12.20 0901.21.11 CÀ PHÊ ARABICA
- sen:09011220:2 (0.8758) · phan:II › chuong:09 › bieu:0901 › bieu:090112
  - câu `sen:09011220:2#1`: 0901.11.30 0901.12.20 0901.21.12 CÀ PHÊ ROBUSTA

### kinh mat chong tia uv
- sen:02109910:1 (0.8503) · phan:I › chuong:02 › bieu:0210 › bieu:021099
  - câu `sen:02109910:1#1`: 0210.99.10 THỊT GÀ THÁI MIẾNG ĐÃ ĐƯỢC LÀM KHÔ ĐÔNG LẠNH Thịt gà thái miếng đã được làm khô đông lạnh là thịt gà ở dạng khối vuông được bảo quản đông lạnh, sau đó đưa chún
- nhom:3214:ct:16 (0.8458) · phan:VI › chuong:32 › bieu:3214
  - câu `nhom:3214:ct:16#2`: Matit có thể sử dụng để gắn một số khớp nối trong xây dựng hoặc sửa chữa nhà, để gắn hoặc sửa chữa các đồ bằng thủy tinh, gốm sứ hoặc kim loại, như chất độn và chất làm d
- bieu:250200 (0.8412) · phan:V › chuong:25 › bieu:2502
  - câu `bieu:250200#1`: Pirít sắt chưa nung

### thịt gà đông lạnh ướp muối
- sen:02109910:1 (0.9004) · phan:I › chuong:02 › bieu:0210 › bieu:021099
  - câu `sen:02109910:1#1`: 0210.99.10 THỊT GÀ THÁI MIẾNG ĐÃ ĐƯỢC LÀM KHÔ ĐÔNG LẠNH Thịt gà thái miếng đã được làm khô đông lạnh là thịt gà ở dạng khối vuông được bảo quản đông lạnh, sau đó đưa chún
- bieu:020322 (0.8767) · phan:I › chuong:02 › bieu:0203
  - câu `bieu:020322#1`: - - Thịt mông đùi (hams), thịt vai và các mảnh của chúng, có xương  [dẫn: - Đông lạnh:]
- nhom:0204:ct:1 (0.8728) · phan:I › chuong:02 › bieu:0204
  - câu `nhom:0204:ct:1#1`: Nhóm này bao gồm thịt tươi, ướp lạnh hoặc đông lạnh của cừu (cừu đực, cừu cái và cừu non), dê hoặc dê non, nuôi hoặc hoang. ***

## Nhận xét thật

Đúng cửa (nhóm đúng nằm trong 3 nút đầu): gạo thơm (SEN 1006.30.60/70 và nhóm 10.06), dầu gội đầu (nhóm 33.05), cà phê rang xay (nhóm 09.01), ghế sofa bọc da (phân nhóm 9401.61 / 9401.71), giày thể thao (dòng tên 6404.11), máy bơm nước (nhóm 84.13 qua SEN, nhóm 84.32 đứng đầu: gần), đồ chơi lắp ráp (nhóm 95.03). Một phần: thịt gà đông lạnh ướp muối (ra đúng chương 02, nhóm 02.10 qua SEN nhưng không ra 02.07), xe đạp điện (SEN 8711 nhưng đầu bảng là câu khái quát Phần XVII).

Trượt:
- **Tên thương mại** ("nồi chiên không dầu"): luật không có chữ này, kết quả là máy nén kín và vòng làm kín dầu, nhiễu. Đây là việc của LLM mở rộng tên, không của chỉ mục.
- **Áo thun trẻ em** ra nhóm 61.11 / 62.09 (quần áo trẻ em), không ra 61.09 (áo phông) dù lấy 10 nút. **Pin sạc dự phòng** ra nhóm 85.06 (pin sơ cấp), không ra 85.07 (ắc quy) trong 10 nút. Hai ca này cho thấy chỉ mục bắt từ nổi ("trẻ em", "pin", "điện thoại") hơn là khái niệm.
- **Không dấu** ("kinh mat chong tia uv"): trượt hoàn toàn (ra thịt gà làm khô đông lạnh, matit, pirít). e5-small yếu với tiếng Việt mất dấu. Phải kèm tìm theo chữ không dấu của M-41, không dựa riêng chỉ mục này.
- **Ống thép không gỉ hàn** và **dây cáp sạc USB**: đầu bảng là dòng tên của Chương 98 (chương riêng của Việt Nam, không thuộc Phần nào nên đường dẫn trống); nhóm 85.44 chỉ đứng thứ 2 ở ca USB; ca ống thép không ra nhóm 73.06 trong 3 nút đầu.

Điều cần biết khi dùng:
- Điểm cosine nằm trong dải hẹp 0,84–0,92 nên không dùng làm ngưỡng; chỉ dùng thứ hạng và để LLM chọn.
- Có 3.812 mục ngoài biểu dài dưới 30 ký tự (8%), phần lớn là mảnh câu do bộ tách của M-31 ("và các vòng làm kín dầu."). Với mảnh ngắn, chữ nhúng gần như chỉ còn đường dẫn nên hay trồi lên. Chưa lọc; nếu thấy nhiễu thì nâng ngưỡng độ dài hoặc sửa bộ tách.
- Nguyên văn 674 mục SEN và 1 mục biểu có chữ dạng mã 8 số trong chính câu ("8413.70.11 … BƠM NƯỚC MỘT TẦNG…"), và id nút SEN (`sen:84137011:1`) chứa mã. Đó là chữ của luật, không cắt (cổng nguyên văn). Nếu muốn lớp phục vụ không bao giờ lộ mã 8 số, QT quyết ẩn ở lớp phục vụ; chỉ mục không làm việc đó.
- Mỗi kết quả trả: nút (id, kho, lop, loai, trang), đường dẫn cha [{id, ten}], tối đa 3 câu nhắc {id, điểm, chu, dan}. Không có trường mã, thuế, tờ khai, tiền lệ.
