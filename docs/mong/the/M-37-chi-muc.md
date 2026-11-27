# M-37 — Chỉ mục nghĩa trên nút luật (cửa vào)

Căn cứ: `docs/mong/nghien-cuu-do-thi-hs.md` (tìm theo nghĩa để **vào cửa**, không để kết luận), ADR-0005, khuôn `docs/mong/khuon-nut-luat.md`, câu M-31 (`data/luat-goc/cau/`).
Chỉ mục KHÔNG nối vào đường khách nào. `lib/chi-muc-luat.js` chỉ có `timNghia(q, {limit})`; chỗ cắm của M-41 (`timNghia` trong `lib/tim-luat.js`) đồng bộ và chờ một mảng, còn hàm này bất đồng bộ (phải nhúng câu hỏi) nên khi cắm cần `await` và lấy `.ketQua`.

## Cái gì vào chỉ mục

| Kho | Mục | Ghi chú |
|---|---|---|
| phan | 693 | mọi câu của Phần (tên, chú giải, khái quát) |
| chuong | 3.933 | mọi câu của Chương (chú giải, khái quát, phân chương) |
| nhom | 28.647 | chú giải chi tiết nhóm |
| phan-nhom | 1.849 | chú giải chi tiết phân nhóm |
| sen | 3.112 | SEN |
| bieu | 6.930 | chỉ TÊN cấp chương, nhóm, phân nhóm 6 số, trừ Chương 98; không dòng 8 số, không tiêu đề không mã |
| **cộng** | **45.164** | trên 64.124 câu của 6 kho nguồn |

- Không vào: **Chương 98** (mục riêng của Việt Nam; 216 mục tên biểu `bieu:98*`), `gir`, `wco` (980/980 nút đều `ocr:true`, nên 0 mục WCO), `thong-bao` (tiền lệ), mọi nút `lop` TIEN_LE / BO_TRO / THUC_TE, id `tb:*` / `wco:*`. Số nút bị cấm trong 6 kho nguồn: 0 (cổng vẫn kiểm).
- Câu dẫn trần ("Nhóm này không bao gồm:") không thành mục riêng, vì các mục con đã mang nó trong chữ nhúng. Tên trong biểu luôn là mục.
- **Mảnh ngắn gộp, không bỏ chữ.** Mục ngoài biểu dài dưới 30 ký tự (ví dụ "và các vòng làm kín dầu.") gộp vào câu liền trước CÙNG NÚT: id mục = id câu đầu, `id.json.gom` ghi `[id câu đầu, id mảnh…]`, kết quả trả chữ các câu nối bằng một dấu cách. Mảnh đứng đầu nút (không có câu liền trước cùng nút) vẫn là mục riêng. Gộp 1.521 mảnh vào 1.122 mục.
- Chữ nhúng = `passage: đường dẫn cha (Phần › Chương › Nhóm[ › Phân nhóm]) | câu dẫn | câu`. Tên Phần cắt 60, Chương 70, Nhóm/Phân nhóm 80 ký tự để tên Phần dài không lấn câu. Câu dẫn của dòng biểu = tiêu đề cha không mã ("Ngựa:"); của kho khác = `dan` của M-31.
- Đường dẫn cha lấy từ id + `data/hs-sections.json` (chương → phần). Với SEN, đường dẫn dừng ở nhóm / phân nhóm 6 số, không chứa mã 8 số.
- Gộp theo cỡ: chưa bật (vec.bin 16,5 MB < 25 MB). Mã gộp có sẵn (câu < 80 ký tự liền nhau cùng câu dẫn và cùng đường dẫn cha) và có test, tự bật khi quá 25 MB.

## Cỡ tệp, bộ nhớ, thời gian (máy dev .131, CPU, 32 nhân, tải nền ~28)

| Số đo | Giá trị |
|---|---|
| `vec.bin` | 17.342.976 byte (45.164 × 384 int8) |
| `id.json` / `meta.json` | 932.543 / 2.350 byte |
| Dựng (transformers.js, q8, CPU, giới hạn 16 nhân, mẻ 64) | 869 giây (14,5 phút) |
| Dựng lần hai (`--kiem`) | 865 giây; cùng `idSha256` và `vecSha256` (`bfa10f1c…`) với lần một: cùng danh sách, cùng từng byte vectơ |
| Nạp chỉ mục (đọc + sha256 mọi kho nguồn) | 204 ms; RSS tiến trình 45 → 93 MB |
| Nạp mô hình (dùng chung `khoiTaoModel()` của embed-pool) | 1,8 s; RSS 523 MB (mô hình đã có ở máy phục vụ, không nạp bản thứ hai) |
| Truy vấn đầu (đọc lười các kho để dựng kết quả) | 597 ms; RSS 639 MB |
| Mỗi truy vấn sau | trung vị 65 ms (tối đa 111): nhúng câu hỏi ~15 ms + quét int8 ~52 ms bằng JS thuần. Máy dev đang tải nền ~25–30 nên chậm hơn lần đo trước (49 ms, chỉ mục 46.901 mục) |

Mô hình `Xenova/multilingual-e5-small` q8, 384 chiều, tiền tố `passage: ` khi dựng, `query: ` khi hỏi. Không dùng GPU, không dùng Ollama. Bge-m3 (chữ trong thẻ) không dùng, vì chỉ mục phải cùng không gian với mô hình đang chạy ở máy phục vụ.

## Dựng lại, kiểm và cổng

- **Hai chỉ mục, hai chế độ** (M-37b, #2023):
  - `data/luat-goc/chi-muc/` (vec.bin + id.json + meta.json) — **KHÔNG lưu trong kho** (giảm ~17,6MB binary). Không đường nào của khách đọc nó. Dựng bằng `npm run build:chi-muc-luat` (chính là `node scripts/luat-goc/chi-muc.mjs`, khoảng 15 phút CPU, cần mô hình e5 lần đầu tải từ HF). Job CI riêng `.github/workflows/chi-muc.yml` dựng thật rồi chạy `test-chi-muc-luat` trên chỉ mục vừa dựng; KHÔNG đưa vào `build` của máy chủ (nặng CPU, cần mô hình).
  - `data/do-thi/chi-muc-nghia.{bin,meta.json}` — **giữ nguyên trong kho**: embed-pool nạp cho `timTheoNghia`, mà `lib/tim-truoc.js` gọi — đó là đường chọn mã của khách (biên bản QT 26/11); không thuộc thẻ M-37b.
- Thiếu chỉ mục luật → `timNghia` trả `THIEU` êm (bỏ qua **có ghi rõ** ở test; job CI riêng vẫn dựng thật để kiểm). `npm run build:chi-muc-luat` dựng; `--kiem` dựng vào bộ nhớ rồi so id và sha256 vectơ với tệp đang có.
- `meta.json` ghi số mục, mô hình, sha256 của 13 tệp nguồn (6 kho, 6 kho câu, `hs-sections.json`) và sha256 của `vec.bin` / `id.json`. Không có dấu thời gian.
- Kho nguồn lệch sha so với `meta.nguon` → `timNghia` trả `{trangThai:"CU", tepLech:[…], ketQua:[]}`, không trả kết quả cũ. Thiếu tệp → `THIEU`; `vec.bin` sai sha → `HONG`; không nhúng được câu hỏi → `LOI`.
- `scripts/test-chi-muc-luat.mjs` (39 ca, không mạng, không mô hình, vectơ giả; nằm trong `danh-sach-test.txt`): ca ngược TIEN_LE / BO_TRO / `tb:` lọt vào chỉ mục / WCO scan / dòng 8 số / tiêu đề không mã / sha lệch / `vec.bin` bị sửa / câu hỏi rỗng / không nhúng được / lib không đọc từ điển, tờ khai, tiền lệ / không đường khách nào nạp lib. Phần cuối kiểm chỉ mục thật (chỉ khi tệp có trên đĩa): dựng lại danh sách (không cần mô hình) ra đúng `id.json`.
- **Chỉ mục cũ (nếu đang có trên đĩa) thì bài kiểm ĐỎ.** Kho nguồn lệch sha so với `meta.nguon` làm `test-chi-muc-luat` đỏ, kèm lời chỉ lệnh `DỰNG LẠI: npm run build:chi-muc-luat` — tệp không cần commit. Lúc chạy, `timNghia` vẫn trả `CU` và không trả kết quả cũ.
- `data/lop-kho.json` khai `data/luat-goc/chi-muc/**` là lớp RUT_TU_LUAT, `tuyChon: true` (sản phẩm dựng có thể vắng trên đĩa máy dev; job CI riêng dựng thật). Báo cáo này nằm ở `docs/mong/the/` (tệp chung).

## 15 truy vấn bằng lời thường (tự nghĩ, không lấy từ bộ thử nào trong repo)

Bảng dưới là bản **SAU** sửa (bỏ Chương 98, gộp mảnh ngắn). Mỗi truy vấn in 3 nút đầu: id nút (điểm cosine) · đường dẫn cha (id) · câu nhắc đầu (chữ cắt 170 ký tự, kèm câu dẫn nếu có). Bảng TRƯỚC / SAU các nút đứng đầu nằm ngay sau 15 truy vấn.


### máy bơm nước dùng tưới vườn
- phan:XVI:kq:7 (0.878) · phan:XVI
  - câu `phan:XVI:kq:7#6`: (3) Các hệ thống tưới bao gồm một trạm điều khiển gồm thiết bị lọc, bơm phun, van đo... các hệ thống ống dẫn nhánh ở dưới đất và một mạng lưới đặt trên bề mặt (nhóm 84.24
- sen:84137011:1 (0.8764) · phan:XVI › chuong:84 › bieu:8413 › bieu:841370
  - câu `sen:84137011:1#1`: 8413.70.11 8413.70.19 BƠM NƯỚC MỘT TẦNG, MỘT CHIỀU HÚT, TRỤC NGANG ĐƯỢC TRUYỀN ĐỘNG BẰNG DÂY ĐAI HOẶC KHỚP NỐI TRỰC TIẾP, TRỪ LOẠI BƠM ĐỒNG TRỤC VỚI ĐỘNG CƠ Đây là loại b
- sen:84137019:1 (0.8764) · phan:XVI › chuong:84 › bieu:8413 › bieu:841370
  - câu `sen:84137019:1#1`: 8413.70.11 8413.70.19 BƠM NƯỚC MỘT TẦNG, MỘT CHIỀU HÚT, TRỤC NGANG ĐƯỢC TRUYỀN ĐỘNG BẰNG DÂY ĐAI HOẶC KHỚP NỐI TRỰC TIẾP, TRỪ LOẠI BƠM ĐỒNG TRỤC VỚI ĐỘNG CƠ Đây là loại b

### áo thun cotton cho trẻ em
- nhom:6111:ct:2 (0.8635) · phan:XI › chuong:61 › bieu:6111
  - câu `nhom:6111:ct:2#2`: bao gồm, ngoài các sản phẩm khác, các sản phẩm dệt kim hoặc móc như áo khoác ngắn cho trẻ em, áo tiên, quần yếm của trẻ con, yếm dải của trẻ sơ sinh, găng tay, găng tay h
- nhom:6209:ct:5 (0.8589) · phan:XI › chuong:62 › bieu:6209
  - câu `nhom:6209:ct:5#1`: (a) Mũ bonnet (mũ rộng vành có dây buộc ở cằm) dành cho trẻ em (nhóm 65.05).  [dẫn: Nhóm này không bao gồm:]
- nhom:6209:ct:2 (0.8582) · phan:XI › chuong:62 › bieu:6209
  - câu `nhom:6209:ct:2#1`: Nhóm này, không kể những cái khác, bao gồm các sản phẩm như áo khoác ngắn cho trẻ em, áo tiên, quần yếm của trẻ con, yếm dải của trẻ sơ sinh, găng tay, găng tay hở ngón, 

### nồi chiên không dầu
- bieu:8414 (0.8621) · phan:XVI › chuong:84
  - câu `bieu:8414#1`: Bơm không khí hoặc bơm chân không, máy nén không khí hoặc chất khí khác và quạt; nắp chụp hút tuần hoàn gió hoặc thông gió có kèm theo quạt, có hoặc không lắp bộ phận lọc
- sen:84148043:1 (0.862) · phan:XVI › chuong:84 › bieu:8414 › bieu:841480
  - câu `sen:84148043:1#15`: Ưu điểm chính của máy nén kín và bán kín là không có lỗ rò ga.
- nhom:8402:ct:14 (0.8564) · phan:XVI › chuong:84 › bieu:8402
  - câu `nhom:8402:ct:14#4`: Nó tuần hoàn trong vòng tròn khép kín, ra khỏi nồi hơi và lại được đưa vào trong nồi hơi.

### pin sạc dự phòng cho điện thoại
- nhom:8506:ct:3 (0.8669) · phan:XVI › chuong:85 › bieu:8506
  - câu `nhom:8506:ct:3#1`: Các pin sơ cấp được sử dụng để cấp nguồn cho nhiều mục đích khác nhau (chuông điện, các thiết bị điện thoại, máy trợ thính, camera, đồng hồ, máy tính bỏ túi, máy tạo nhịp
- nhom:8506:ct:2 (0.8642) · phan:XVI › chuong:85 › bieu:8506
  - câu `nhom:8506:ct:2#8`: Đặc điểm chính của pin sơ cấp là không sạc được hoặc sạc không hiệu quả.
- nhom:9021:ct:56 (0.8596) · phan:XVIII › chuong:90 › bieu:9021
  - câu `nhom:9021:ct:56#3`: Chúng có một bộ pin điện được liên kết với tim bằng các điện cực để phát xung kích thích tim.  [dẫn: Nhóm này gồm có:]

### gạo thơm đóng túi
- sen:10063070:1 (0.8878) · phan:II › chuong:10 › bieu:1006 › bieu:100630
  - câu `sen:10063070:1#1`: 1006.30.70 GẠO THƠM KHÁC Gạo thơm, hay còn gọi là gạo có hương thơm, là loại gạo hảo hạng, có mùi thơm tự nhiên và mùi thơm đặc trưng.
- sen:10063060:1 (0.8815) · phan:II › chuong:10 › bieu:1006 › bieu:100630
  - câu `sen:10063060:1#1`: 1006.30.60 GẠO MALYS Gạo Malys (Oryza Sativa L. còn được gọi là “gạo Malys Angkor”) dùng để chỉ các loại gạo thơm cao cấp nhạy cảm với thời tiết ẩm ướt, gạo có mùi thơm t
- sen:10063050:1 (0.8741) · phan:II › chuong:10 › bieu:1006 › bieu:100630
  - câu `sen:10063050:1#1`: 1006.30.50 GẠO BASMATI Gạo Basmati là một loại gạo thơm hạt dài, mảnh.

### giày thể thao đế cao su
- bieu:640411 (0.8751) · phan:XII › chuong:64 › bieu:6404
  - câu `bieu:640411#1`: - - Giày, dép thể thao, giày tennis, giày bóng rổ, giày thể dục, giày luyện tập và các loại tương tự:  [dẫn: - Giày, dép có đế ngoài bằng cao su hoặc plastic:]
- bieu:640312 (0.8749) · phan:XII › chuong:64 › bieu:6403
  - câu `bieu:640312#1`: - - Giày ống trượt tuyết, giày trượt tuyết băng đồng và giày ống gắn ván trượt  [dẫn: - Giày, dép thể thao:]
- nhom:6401:ct:11 (0.8745) · phan:XII › chuong:64 › bieu:6401
  - câu `nhom:6401:ct:11#1`: Quy trình này tương tự như đúc bằng lực ép, chỉ khác là các phôi đã tạo hình trước hoặc phôi ở dạng hạt được sử dụng trong quy trình đúc bằng lực ép được thay thế bằng mộ

### dây cáp sạc USB
- nhom:8544:ct:15 (0.8559) · phan:XVI › chuong:85 › bieu:8544
  - câu `nhom:8544:ct:15#1`: (3) Các dây và cáp viễn thông (kể cả cáp ngầm dưới biển và dây, cáp truyền dữ liệu) nói chung có cấu tạo thành cặp, 4 lõi hoặc một lõi cáp, chúng đều có vỏ bọc.  [dẫn: Nhóm này bao gồm, không kể những cái khác:]
- nhom:7413:ct:3 (0.8539) · phan:XV › chuong:74 › bieu:7413
  - câu `nhom:7413:ct:3#1`: Tuy nhiên nhóm này không bao gồm dây, cáp cách điện (nhóm 85.44).
- sen:73121010:1 (0.8528) · phan:XV › chuong:73 › bieu:7312 › bieu:731210
  - câu `sen:73121010:1#6`: DÂY CÁP CHỐNG XOẮN Đặc điểm của dây cáp chống xoắn là lớp ngoài bị xoắn theo hướng ngược lại với các lớp ở trong. (Nguồn: Phi-líp-pin)

### ghế sofa bọc da
- pn:940171:ct:1 (0.8649) · phan:XX › chuong:94 › bieu:9401 › bieu:940171
  - câu `pn:940171:ct:1#1`: Phân nhóm 9401.61 và 9401.71 “Ghế bọc” là loại ghế có một lớp lót mềm, ví dụ bằng bông, lanh, lông thú, nhựa xốp hay cao su xốp, được định dạng theo ghế (cố định hay khôn
- pn:940161:ct:1 (0.8624) · phan:XX › chuong:94 › bieu:9401 › bieu:940161
  - câu `pn:940161:ct:1#1`: Phân nhóm 9401.61 và 9401.71 “Ghế bọc” là loại ghế có một lớp lót mềm, ví dụ bằng bông, lanh, lông thú, nhựa xốp hay cao su xốp, được định dạng theo ghế (cố định hay khôn
- phan:XI:kq:9 (0.8557) · phan:XI
  - câu `phan:XI:kq:9#2`: Chỉ cao su và sợi (cord) cao su, được bọc bằng vật liệu dệt nằm trong nhóm 56.04.

### đồ chơi lắp ráp bằng nhựa
- nhom:9508:ct:11 (0.8706) · phan:XX › chuong:95 › bieu:9508
  - câu `nhom:9508:ct:11#2`: Chúng thường có người điều hành hoặc người phục vụ và có thể được lắp đặt trong các tòa nhà kiên cố hoặc quầy nhượng quyền độc lập (independent concession stalls).
- nhom:9503:ct:25 (0.8695) · phan:XX › chuong:95 › bieu:9503
  - câu `nhom:9503:ct:25#1`: (iii) Đồ chơi xây dựng (bộ lắp ráp xây dựng, hình khối, v.v).  [dẫn: Chúng bao gồm:]
- bieu:950823 (0.8666) · phan:XX › chuong:95 › bieu:9508
  - câu `bieu:950823#1`: - - Trò chơi xe đụng  [dẫn: - Trò chơi di chuyển trong công viên giải trí và trò chơi cô]

### dầu gội đầu
- nhom:3305:ct:2 (0.8805) · phan:VI › chuong:33 › bieu:3305
  - câu `nhom:3305:ct:2#1`: (1) Các loại dầu gội đầu, chứa xà phòng hoặc các chất hữu cơ hoạt động bề mặt khác (xem Chú giải 1(c) của Chương 34), và các loại dầu để gội đầu khác.  [dẫn: Nhóm này gồm có:]
- nhom:3301:ct:34 (0.8757) · phan:VI › chuong:33 › bieu:3301
  - câu `nhom:3301:ct:34#1`: (d) Gôm, dầu gỗ thông hoặc sulphat turpentine và dầu terpen khác được điều chế bằng cách chưng cất hoặc xử lý các loại gỗ tùng bách (nhóm 38.05). ***  [dẫn: Ngoài những điều đã đề cập ở trên, nhóm này cũng không bao g]
- bieu:330510 (0.875) · phan:VI › chuong:33 › bieu:3305
  - câu `bieu:330510#1`: - Dầu gội đầu:

### xe đạp điện
- phan:XVII:kq:3 (0.8839) · phan:XVII
  - câu `phan:XVII:kq:3#28`: (e) Thiết bị chiếu sáng, phát tín hiệu, gạt nước, chống tạo sương và tuyết họat động bằng điện dùng cho xe đạp hoặc các phương tiện có động cơ (nhóm 85.12);
- nhom:8711:ct:3 (0.8834) · phan:XVII › chuong:87 › bieu:8711
  - câu `nhom:8711:ct:3#5`: Ắc quy điện của những mô tô điện loại “plug - in” này có thể được sạc bằng cách cắm chúng vào một nguồn cấp điện hoặc trạm sạc.
- bieu:871160 (0.8793) · phan:XVII › chuong:87 › bieu:8711
  - câu `bieu:871160#1`: - Loại dùng động cơ điện để tạo động lực:

### ống thép không gỉ hàn
- sen:73269030:1 (0.8861) · phan:XV › chuong:73 › bieu:7326 › bieu:732690
  - câu `sen:73269030:1#1`: 7326.90.30 BỘ KẸP BẰNG THÉP KHÔNG GỈ ĐÃ LẮP VỚI MĂNG SÔNG CAO SU DÙNG CHO CÁC ỐNG KHÔNG CÓ ĐẦU NỐI VÀ PHỤ KIỆN GHÉP NỐI BẰNG GANG ĐÚC Bộ lắp ráp này bao gồm một dải thép 
- pn:730512:ct:2 (0.8796) · phan:XV › chuong:73 › bieu:7305 › bieu:730512
  - câu `pn:730512:ct:2#2`: Sau khi hàn không có mối hàn kim loại đắp lên trên bề mặt ngoài của ống hoàn thiện.
- bieu:730723 (0.8779) · phan:XV › chuong:73 › bieu:7307
  - câu `bieu:730723#1`: - - Loại hàn giáp mối:  [dẫn: - Loại khác, bằng thép không gỉ:]

### cà phê rang xay đóng gói
- nhom:0901:ct:4 (0.8781) · phan:II › chuong:09 › bieu:0901
  - câu `nhom:0901:ct:4#1`: (3) Cà phê đã rang (đã hoặc chưa khử chất caffeine) đã hoặc chưa xay, nghiền.  [dẫn: Nhóm này gồm:]
- nhom:0901:ct:3 (0.8773) · phan:II › chuong:09 › bieu:0901
  - câu `nhom:0901:ct:3#1`: (2) Cà phê đã khử chất caffeine bằng cách ngâm hột nguyên liệu vào các dung môi khác nhau.  [dẫn: Nhóm này gồm:]
- sen:09011220:1 (0.8767) · phan:II › chuong:09 › bieu:0901 › bieu:090112
  - câu `sen:09011220:1#6`: Hạt cà phê arabica Arabica coffee bean Hạt cà phê arabica (Nguồn: In-đô-nê-xi-a )

### kinh mat chong tia uv
- sen:02109910:1 (0.8517) · phan:I › chuong:02 › bieu:0210 › bieu:021099
  - câu `sen:02109910:1#1`: 0210.99.10 THỊT GÀ THÁI MIẾNG ĐÃ ĐƯỢC LÀM KHÔ ĐÔNG LẠNH Thịt gà thái miếng đã được làm khô đông lạnh là thịt gà ở dạng khối vuông được bảo quản đông lạnh, sau đó đưa chún
- sen:26209910:1 (0.8445) · phan:V › chuong:26 › bieu:2620 › bieu:262099
  - câu `sen:26209910:1#6`: Quá trình luyện kim sau đó được thực hiện ở nhiệt độ 1.700-1.000°C, trong đó soda iron matte được tách ra để loại bỏ thiếc như kim loại với hàm lượng sắt thấp. (Nguồn: Ma
- sen:62114931:1 (0.8442) · phan:XI › chuong:62 › bieu:6211 › bieu:621149
  - câu `sen:62114931:1#1`: 6211.42.20 6211.43.20 6211.49.31 6211.49.39 ÁO CHOÀNG KHÔNG TAY DÙNG ĐỂ CẦU NGUYỆN Theo truyền thống, áo choàng không tay dùng để cầu nguyện là áo 2 mảnh chỉ được mặc bởi

### thịt gà đông lạnh ướp muối
- sen:02109910:1 (0.8988) · phan:I › chuong:02 › bieu:0210 › bieu:021099
  - câu `sen:02109910:1#1`: 0210.99.10 THỊT GÀ THÁI MIẾNG ĐÃ ĐƯỢC LÀM KHÔ ĐÔNG LẠNH Thịt gà thái miếng đã được làm khô đông lạnh là thịt gà ở dạng khối vuông được bảo quản đông lạnh, sau đó đưa chún
- nhom:0204:ct:1 (0.8718) · phan:I › chuong:02 › bieu:0204
  - câu `nhom:0204:ct:1#1`: Nhóm này bao gồm thịt tươi, ướp lạnh hoặc đông lạnh của cừu (cừu đực, cừu cái và cừu non), dê hoặc dê non, nuôi hoặc hoang. ***
- bieu:0209 (0.8717) · phan:I › chuong:02
  - câu `bieu:0209#1`: Mỡ lợn không dính nạc và mỡ gia cầm, chưa nấu chảy hoặc chiết xuất cách khác, tươi, ướp lạnh, đông lạnh, muối, ngâm nước muối, làm khô hoặc hun khói

## Trước / sau (3 nút đầu)

| Truy vấn | Trước | Sau |
|---|---|---|
| máy bơm nước dùng tưới vườn | nhom:8432:ct:34 sen:84137011:1 sen:84137019:1 | phan:XVI:kq:7 sen:84137011:1 sen:84137019:1 |
| áo thun cotton cho trẻ em | nhom:6111:ct:2 nhom:6209:ct:5 nhom:6209:ct:2 | nhom:6111:ct:2 nhom:6209:ct:5 nhom:6209:ct:2 |
| nồi chiên không dầu | sen:84148043:1 nhom:8487:ct:5 bieu:841470 | bieu:8414 sen:84148043:1 nhom:8402:ct:14 |
| pin sạc dự phòng cho điện thoại | nhom:8506:ct:3 nhom:8506:ct:2 nhom:9021:ct:56 | nhom:8506:ct:3 nhom:8506:ct:2 nhom:9021:ct:56 |
| gạo thơm đóng túi | sen:10063060:1 sen:10063070:1 nhom:1006:ct:6 | sen:10063070:1 sen:10063060:1 sen:10063050:1 |
| giày thể thao đế cao su | nhom:6401:ct:11 bieu:640411 sen:64039130:1 | bieu:640411 bieu:640312 nhom:6401:ct:11 |
| dây cáp sạc USB | bieu:983424 nhom:8544:ct:15 bieu:983420 | nhom:8544:ct:15 nhom:7413:ct:3 sen:73121010:1 |
| ghế sofa bọc da | pn:940171:ct:1 pn:940161:ct:1 nhom:9401:ct:13 | pn:940171:ct:1 pn:940161:ct:1 phan:XI:kq:9 |
| đồ chơi lắp ráp bằng nhựa | nhom:9503:ct:25 nhom:9508:ct:14 nhom:9508:ct:4 | nhom:9508:ct:11 nhom:9503:ct:25 bieu:950823 |
| dầu gội đầu | nhom:3305:ct:2 nhom:3301:ct:13 bieu:330510 | nhom:3305:ct:2 nhom:3301:ct:34 bieu:330510 |
| xe đạp điện | phan:XVII:kq:3 sen:87116012:1 sen:87116092:1 | phan:XVII:kq:3 nhom:8711:ct:3 bieu:871160 |
| ống thép không gỉ hàn | bieu:982910 bieu:9828 bieu:982800 | sen:73269030:1 pn:730512:ct:2 bieu:730723 |
| cà phê rang xay đóng gói | nhom:0901:ct:4 sen:09011120:1 sen:09011220:2 | nhom:0901:ct:4 nhom:0901:ct:3 sen:09011220:1 |
| kinh mat chong tia uv | sen:02109910:1 nhom:3214:ct:16 bieu:250200 | sen:02109910:1 sen:26209910:1 sen:62114931:1 |
| thịt gà đông lạnh ướp muối | sen:02109910:1 bieu:020322 nhom:0204:ct:1 | sen:02109910:1 nhom:0204:ct:1 bieu:0209 |

Đọc bảng: Chương 98 hết xuất hiện (ống thép không gỉ hàn giờ ra chương 73, dây cáp USB đứng đầu là nhóm 85.44). Gạo thơm, dầu gội, cà phê, ghế sofa, áo thun, pin sạc giữ nút đúng ở đầu bảng. Nhiều ca đổi thứ hạng nhẹ (câu liền kề được gộp nên đoạn dài hơn thắng). Ba ca xấu đi nhẹ: máy bơm nước (câu khái quát Phần XVI lên đầu), đồ chơi lắp ráp (9508 lên trước 9503), xe đạp điện (SEN 8711 rớt khỏi top 3, chú giải nhóm 8711 lên). Không ca nào trượt mới. Ca tên thương mại, áo thun trẻ em (61.11 thay vì 61.09), pin sạc (85.06 thay vì 85.07) và không dấu vẫn trượt như trước.

## Nhận xét thật

Đúng cửa (nhóm đúng nằm trong 3 nút đầu): gạo thơm (SEN 1006.30.x), dầu gội đầu (33.05), cà phê rang xay (09.01), ghế sofa bọc da (9401.61 / 9401.71), giày thể thao (dòng tên 6404.11), dây cáp sạc USB (85.44), đồ chơi lắp ráp (95.03 / 95.08), máy bơm nước (84.13 qua SEN). Một phần: thịt gà đông lạnh ướp muối (đúng chương 02, nhóm 02.10 nhưng không ra 02.07), xe đạp điện (nhóm 87.11 nhưng đầu bảng là câu khái quát Phần XVII), ống thép không gỉ hàn (đúng chương 73 nhưng chưa ra 73.06 trong 3 nút đầu).

Trượt, không đổi sau sửa:
- **Tên thương mại** ("nồi chiên không dầu"): luật không có chữ này, ra máy nén kín, nhiễu. Việc của LLM mở rộng tên, không của chỉ mục.
- **Áo thun trẻ em** ra 61.11 / 62.09, không ra 61.09; **pin sạc dự phòng** ra 85.06 (pin sơ cấp), không ra 85.07.
- **Không dấu** ("kinh mat chong tia uv"): trượt hoàn toàn. e5-small yếu với tiếng Việt mất dấu; phải kèm tìm chữ không dấu của M-41.

Điều cần biết khi dùng:
- Điểm cosine nằm trong dải hẹp (khoảng 0,84–0,92): chỉ dùng thứ hạng, không dùng ngưỡng.
- Nguyên văn khoảng 650 mục SEN có chữ dạng mã 8 số trong chính câu ("8413.70.11 … BƠM NƯỚC MỘT TẦNG…") và id nút SEN (`sen:84137011:1`) chứa mã. Đó là chữ của luật, không cắt. Nếu lớp phục vụ phải che mã 8 số thì che ở lớp phục vụ.
- Mỗi kết quả trả: nút (id, kho, lop, loai, trang), đường dẫn cha [{id, ten}], tối đa 3 câu nhắc {id, điểm, chu, dan, gom?}. Không có trường mã, thuế, tờ khai, tiền lệ.
