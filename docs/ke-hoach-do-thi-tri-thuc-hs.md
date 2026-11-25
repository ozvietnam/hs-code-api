# Kế hoạch: đồ thị tri thức HS — tìm kiếm chọn nhóm, đi cạnh xuống mã

Ngày 21/11/2026 · QT soạn theo chỉ đạo của CEO · kho mã: `ozvietnam/hs-code-api`
Trạng thái: CEO duyệt 21/11/2026. Bản này đã gộp 5 điểm siết từ lượt soát độc lập cùng ngày (mục 4.6, bước 2, bước 5–6, thước đo p95, bảng xếp hạng theo lượng hàng).

## 1. Vì sao làm

Kho đang là các tệp rời, chỉ nối với nhau qua mã HS. Muốn đọc tri thức của một mã thì phải đoán đúng mã trước. Số đo ngày 21/11:

- 99,8% tri thức nằm sau bước AI đoán mã; 14.101 mục luật (sổ tay, chú giải, sổ PN6) chỉ mở được bằng mã.
- 76% cạnh loại trừ trong sổ tay chỉ có một chiều (8481 nhắc sang 8412, 8412 không nhắc lại).
- Ca van điện từ khí nén 5/2: kho có đủ đáp án (2 thông báo phân loại, 37 tờ khai mẫu, chú giải) nhưng máy ra 848180 hoặc 841221; mã đúng 84812090.

Nghiên cứu cùng ngày (3 bài báo 2026 + thử nghiệm trên 2.000 tờ khai của OZ) cho hướng đi: với AI yếu, **chọn nhóm 4 số bằng tìm kiếm**, **từ 4 số xuống 6 và 8 số thì đi theo cạnh** của đồ thị, mỗi bước AI chỉ đọc phần phân biệt.

## 2. Đích đến và thước đo

Đo trên máy thật, qua Cổng, bằng đúng chuỗi mô hình đang phục vụ khách. Số nền lấy ở giai đoạn 0, trước khi sửa gì.

| Thước đo | Hiện biết | Đích |
|---|---|---|
| Nhóm 4 số đúng có trong danh sách ứng viên trước khi AI chọn (2.000 tờ khai, không AI) | 88,3% | ≥ 93% |
| Nhóm 4 số máy chọn đúng (bộ 50 ca chuẩn + bộ van + bộ mới 300 ca) | chưa có số nền cùng phép đo | không kém nền ở mọi bộ, hơn nền ở bộ van |
| Phân nhóm 6 số đúng | chưa có số nền | hơn nền ≥ 10 điểm |
| Ca van 5/2 lặp 5 lượt | ra 2 mã khác nhau, đều sai | 5/5 ra 848120 |
| Cùng một mô tả hỏi 5 lần ra cùng mã | không ổn định | ≥ 95% số ca |
| Câu hỏi gửi khách có căn cứ (sổ / biểu thuế) | công tắc đang tắt | 100%, không còn câu AI tự nghĩ |
| Thời gian một lượt (trung vị) | khoảng 17–29 giây | ≤ 45 giây |
| Thời gian một lượt, 5% chậm nhất (p95) | chưa đo | ≤ 80 giây (động cơ cắt ở 85 giây; vượt là khách nhận lỗi) |
| Hàng OZ chưa từng khai: nhóm đúng trong 5 ứng viên | 75% | ≥ 85% |

Thước đo "số tệp đã soạn" bỏ, không dùng nữa.

## 3. Nút

Không đổi chỗ chứa. Nút là chính các tệp đang có; đồ thị là **bảng cạnh sinh tự động** từ các tệp đó, nạp vào bộ nhớ khi khởi động.

| Loại nút | Số lượng | Tệp gốc |
|---|---|---|
| Chương / Phần | 97 / 21 | chú giải |
| Nhóm 4 số | 1.269 (1.243 có sổ tay) | `data/so-tay/<nhóm>.json` |
| Phân nhóm 6 số | khoảng 5.750 | cây biểu thuế, `tieuChi6` |
| Dòng 8 số | 11.871 | biểu thuế |
| Sổ ranh giới PN6 | 2.140 (1.744 đã duyệt) | `data/ho-so/ranh-gioi/` |
| Thông báo phân loại hải quan | 4.908 | `data/precedents.json` |
| Tờ khai mẫu OZ | 5.734 | `data/oz-gold-final.jsonl` |
| Cụm từ gọi tên hàng (Việt, Anh, Trung, tên thương mại) | khoảng 23.000 cụm ở 6 kho rời | các kho đồng nghĩa |
| Dữ kiện phân biệt (vật liệu, công dụng, nguồn động lực, kích thước…) | 345 khoá | `tu-vung@2.json` |
| Model / hãng | chưa có kho | 2.995 tờ khai có ghi model |

## 4. Cạnh — phần cốt lõi

Mỗi cạnh có: loại, từ nút, tới nút, điều kiện, **nguyên văn trích** và nguồn. Cạnh không có trích dẫn thì không được dùng để chốt mã, chỉ để gợi ý.

### 4.1 Cạnh tìm kiếm (đưa câu của khách tới nhóm, không cần biết mã)

| Cạnh | Từ → tới | Dựng từ đâu | Hiện có | Thiếu |
|---|---|---|---|---|
| C1 Gọi-là | cụm từ → nhóm / phân nhóm | 6 kho đồng nghĩa + tên hàng trong thông báo và tờ khai | Có nhưng rời, mỗi hàm tìm dùng một kho; hai hàm tìm chính không dùng đồng nghĩa tiếng Việt | Gộp một bảng, mọi hàm tìm đọc chung |
| C2 Đã-khai | tờ khai mẫu → mã | sẵn có | 5.734 | Chỉ mục tìm theo nghĩa trên từng dòng (thử nghiệm: +5 điểm ở 5 ứng viên, +14 điểm ở 6 số) |
| C3 Đã-phán | thông báo phân loại → mã | sẵn có | 4.908, chỉ tra theo mã đã chọn | Tra theo mô tả; từ khoá chuẩn hoá cho từng thông báo |
| C4 Model-là | model / hãng → nhóm | trường model, hãng của tờ khai; kết quả định danh có nguồn | Chưa có | Bảng mới, chỉ nhận dòng có nguồn |

### 4.2 Cạnh ngang giữa các nhóm (chống chọn nhầm nhóm)

| Cạnh | Từ → tới | Dựng từ đâu | Hiện có | Thiếu |
|---|---|---|---|---|
| C5 Loại-trừ | nhóm A → nhóm B, kèm điều kiện | `loaiTru[]` của sổ tay | 4.724 dòng | 76% một chiều |
| C6 Loại-trừ-ngược | nhóm B → nhóm A | **sinh tự động** bằng cách đảo C5 | 0 | 3.772 cạnh, sinh bằng máy, giữ nguyên trích dẫn của bên A |
| C7 Phân-biệt | nhóm A ↔ nhóm B qua một câu hỏi có/không | `phanBiet[]` | 3.103 câu ở 1.001 sổ | 178 nhóm trống |
| C8 Dễ-nhầm | nhóm ↔ nhóm | `confusion-pairs.json` (320 cặp) + trường "hay nhầm với" của thông báo phân loại | Có, động cơ không đọc | Nối vào bước chọn nhóm |
| C9 Chú-giải-chi-phối | chú giải phần/chương → nhóm (ví dụ chú giải Phần XVI cho 84/85) | tham chiếu chéo trong chú giải gốc | 6.666 tham chiếu, 64,6% đã vào sổ tay | 35% còn lại |

### 4.3 Cạnh dọc (đi xuống mã)

| Cạnh | Từ → tới | Dựng từ đâu | Hiện có | Thiếu |
|---|---|---|---|---|
| C10 Tách-phân-nhóm | nhóm → phân nhóm 6 số, kèm tiêu chí | `tieuChi6` | 45% phân nhóm cần phân biệt | 55%, trong đó có 8481 và 8412 |
| C11 Tên-riêng-thắng-loại-khác | phân nhóm có tên riêng → phân nhóm "loại khác" cùng nhóm | **sinh tự động** từ cây biểu thuế | 0 | Toàn bộ; đây là cạnh lẽ ra chặn 848180 thay cho 848120 |
| C12 Tách-dòng | phân nhóm → dòng 8 số, kèm điều kiện máy đọc được | sổ ranh giới đã duyệt | 1.744 sổ | 377 sổ bị trả về, 27 sổ nháp |
| C13 Cần-dữ-kiện | cạnh C7, C10, C12 → dữ kiện phân biệt | khoá từ vựng trong điều kiện | Có ở sổ PN6 | Chuẩn hoá cho C7 và C10 |

### 4.4 Cạnh kiểm chứng (tự soát sau khi chốt)

| Cạnh | Từ → tới | Dùng để |
|---|---|---|
| C14 Tiền-lệ-ủng-hộ | tờ khai / thông báo ↔ mã vừa chốt | 3 tờ khai gần nhất cùng mã và rất giống: đúng nhóm 98,5% (phủ 23,5% ca). Lệch thì hạ độ tin, gắn cờ, không tự đổi mã |
| C15 Căn-cứ | mọi quyết định → nguyên văn đã đọc | Hồ sơ giải trình; không có căn cứ thì ghi rõ "chưa có" |

### 4.5 Thứ bậc khi các cạnh nói ngược nhau

1. Chú giải, loại trừ, phân biệt có trích nguyên văn (C5, C6, C7, C9).
2. Thông báo phân loại của hải quan (C3).
3. Tờ khai mẫu của OZ (C2, C14).

- Tờ khai cũ không được tự mở nhánh dừng sớm khi đang bị cạnh luật hoặc thông báo phân loại phản đối. Lý do: một mặt hàng khai sai lặp lại 10 lần vẫn là sai.
- Khi dựng C2, C3, C4, C14: chỉ nhận mã còn tồn tại trong biểu thuế hiện hành; mã đã bị tách hoặc xoá thì ghi nhận riêng, không dùng để ủng hộ.
- Phép kiểm tiền lệ áp cho cả bốn nhánh dừng sớm của động cơ, không chỉ nhánh dừng sớm để hỏi.

### 4.6 Cạnh nào máy sinh, cạnh nào phải soạn

- **Máy sinh ngay, không cần AI:** C6, C11, gộp C1, nối C8, C14. Đây là phần làm trước.
- **Máy sinh nháp, người hoặc mô hình mạnh duyệt** theo quy trình soạn–soát đang có của sổ PN6: C10 còn thiếu, C12 bị trả về, C9 còn lại, C3 từ khoá.
- **Mới hoàn toàn:** C4.

## 5. Máy đi trên đồ thị thế nào

| Bước | Ai làm | Đọc cạnh | Lượng chữ AI nhận | Ra gì |
|---|---|---|---|---|
| 1. Tìm ứng viên | Luật, khoảng 1,5 giây | C1–C4 | — | 8–10 nhóm, mỗi nhóm kèm bằng chứng |
| 2. Mở rộng theo cạnh ngang | Luật | C5, C6, C8 | — | Được kéo thêm nhóm **chưa có** trong ứng viên, nhưng chỉ khi điều kiện của chính dòng loại trừ khớp mô tả hàng; tối đa 2–3 nhóm |
| 3. AI lượt một | AI | — | khoảng 1.300 ký tự | Rút dữ kiện của hàng; giữ tối đa 3 nhóm |
| 4. Cắt gói phân biệt | Luật | C5–C9 **chỉ giữa các nhóm còn sống** | — | Gói 6–7 nghìn ký tự, toàn trích dẫn nguyên văn |
| 5. AI lượt hai | AI | — | 6–7 nghìn ký tự | Chốt nhóm 4 số, kèm trích dẫn. Nhóm chưa có cạnh C10 thì chọn luôn phân nhóm 6 số trong lượt này, không mở lượt riêng |
| 6. Xuống 6 số | Luật theo cạnh; AI lượt ba chỉ khi nhóm có quá nhiều phân nhóm và còn dư thời gian | C10, C11, C13 | tối đa 3.000 ký tự | Phân nhóm; thiếu dữ kiện thì hỏi đúng câu của cạnh |
| 7. Xuống 8 số | Luật | C12, C13 | — | Dòng; thiếu dữ kiện thì dừng ở 6 số và hỏi |
| 8. Tự soát | Luật | C14, C15 | — | Độ tin, cờ, hồ sơ căn cứ |

Câu hỏi gửi khách ở bước 6–7 chính là dữ kiện mà cạnh đang cần (C13). Vì vậy câu hỏi luôn có căn cứ và luôn đúng nhóm đang xét.

Nhánh dừng sớm hiện có chỉ được giữ khi C14 ủng hộ và không bị cạnh bậc cao hơn phản đối (mục 4.5). Không có tiền lệ ủng hộ thì phải đi đủ các bước.

Khuôn đầu ra không đổi: câu hỏi vẫn trả trong `nextAction.questions` kèm `canCu`, `nguon`, để ba chỗ đang đọc bên ERP (giỏ hàng, rà soát khi tạo đơn, cus check) không vỡ.

## 6. Lộ trình

Mỗi giai đoạn nằm sau công tắc mặc định tắt, bật trên máy thật để đo, không đạt thì tắt. Giai đoạn sau chỉ bắt đầu khi giai đoạn trước có số.

| Giai đoạn | Việc | Điều kiện nhận (đo trên máy thật) |
|---|---|---|
| 0. Số nền | Chạy công cụ đo mới trên máy chủ với 4 bộ ca: 50 ca chuẩn, 30 ca van và khí nén, ca van 5/2 lặp 5 lượt, và bộ mới 300 ca lấy ngẫu nhiên từ tờ khai (để riêng, không dùng khi chỉnh). Đo PR #1536 ở 3 chế độ | Có bảng số nền ghi kèm phiên bản và chuỗi mô hình |
| 1. Bảng cạnh máy sinh | Lệnh dựng bảng cạnh từ tệp đang có: C5, C6, C7, C8, C11, C14 và bảng C1 gộp. Cổng máy: cạnh thiếu trích dẫn là đỏ; số cạnh theo loại ghi vào bảng đấu nối. Kèm bảng xếp hạng nhóm theo số dòng tờ khai (bao nhiêu nhóm chiếm 80% hàng thật) để định khối lượng giai đoạn 6 | Dựng lại ra cùng kết quả; 0 cạnh thiếu nguồn; ca van: từ 8412 đi cạnh ngược tới được 8481, từ 848180 đi C11 tới được 848120 |
| 2. Tìm ứng viên đủ nguồn | Bước 1–2: thêm tìm theo nghĩa trên từng dòng tờ khai và thông báo phân loại bằng cách mở rộng chỉ mục `embed-pool` đang có (một bản mô hình duy nhất trong bộ nhớ); mọi hàm tìm đọc bảng C1 gộp | Không AI: nhóm đúng trong 5 ứng viên ≥ 92%, 6 số trong 3 ứng viên ≥ 76%, thêm ≤ 0,1 giây. Có AI: nhóm 4 số không kém nền |
| 3. Chọn nhóm bằng gói phân biệt | Bước 3–5 | Nhóm 4 số hơn nền trên bộ 300 ca; ca van 5/5 đúng nhóm; thời gian ≤ 45 giây |
| 4. Xuống 6 số theo cạnh | Bước 6, dùng C10 và C11; câu hỏi lấy từ cạnh | 6 số hơn nền ≥ 10 điểm; ca van 5/5 ra 848120; 100% câu hỏi có căn cứ |
| 5. Xuống 8 số và tự soát | Bước 7–8; đưa sổ PN6 ra khỏi chạy bóng theo số đo | 8 số không kém nền; mỗi kết quả có hồ sơ căn cứ |
| 6. Soạn cạnh còn thiếu, chỉ cho phần hàng về nhiều | Chỉ soạn C10 và soạn lại sổ bị trả về cho các nhóm chiếm 80% số dòng tờ khai (danh sách lấy từ bảng xếp hạng cuối giai đoạn 1). Không soạn dàn trải cả 1.269 nhóm. Phần đuôi dài: xem mục 6.2 | Mỗi đợt: độ phủ cạnh tính theo số dòng tờ khai, không theo số tệp |
| 7. Hàng chưa từng khai | Cho AI viết lại tên hàng theo ngôn ngữ biểu thuế trước khi tìm; dùng nguồn định danh | Bỏ nguồn tờ khai: nhóm đúng trong 5 ứng viên từ 75% lên ≥ 85% |

Giai đoạn 1 và 2 không đổi gì trên đường khách cho tới khi bật công tắc. Giai đoạn 6 chạy song song từ sau giai đoạn 1.

### 6.1 Bật cái mới thì bỏ cái cũ

Mỗi giai đoạn bật thật phải kèm danh sách thứ bị thay và ngày gỡ. Không gỡ thì không tính là xong giai đoạn.

| Khi giai đoạn này bật thật và vượt số nền | Gỡ |
|---|---|
| 2 (tìm ứng viên đủ nguồn) | Sáu kho đồng nghĩa rời không còn được hàm nào đọc trực tiếp; cổng lọc 0,6 trong bước gom của động cơ |
| 3–4 (chọn nhóm, xuống 6 số theo cạnh) | Vòng đầu "AI đoán từ mô tả thô"; các nhánh dừng sớm không qua phép kiểm tiền lệ; động cơ cũ `lib/classify.js` nếu không còn đường nào gọi; các công tắc tạm của ngày 21/11 (`HS_TIM_TRUOC`, `HS_CHOT_SOM_CO_KIEM`, `HS_HOI_THEO_SO_TAY`) gộp về một |
| 5 (xuống 8 số, tự soát) | Chế độ chạy bóng của sổ PN6: bật thật hoặc gỡ, không để lơ lửng |

Thước đo đi kèm: số công tắc `HS_*` (hiện 73–75) phải giảm sau mỗi giai đoạn bật thật, không được tăng ròng.

### 6.2 Phần đuôi dài (khoảng 20% lượng hàng, hơn 1.100 nhóm)

Không soạn tay hàng nghìn cạnh cho hàng hiếm, vì phải bảo trì mỗi khi đổi biểu thuế. Hai lựa chọn, quyết sau khi có số của giai đoạn 3:

- Giữ AI đang dùng, đọc gói phân biệt hẹp do đồ thị cắt, và hỏi khách khi không chắc.
- Cho ca khó rẽ sang một lượt mô hình mạnh hơn trên chính gói hẹp đó. Đây là quyết định về tiền và hạn mức, thuộc CEO; QT trình kèm tỉ lệ ca rẽ nhánh và giá mỗi lượt đo được.

### 6.3 Việc song song, ngoài đồ thị

Đồ thị chỉ chữa phần phân loại. Hai phần còn lại của sứ mệnh (thuế và văn bản đúng luật hiện hành; soát tờ khai không báo oan) có lỗi đang chạy trên đường khách và được xử lý song song, không chờ đồ thị:

- Các điểm trong biên bản soát dữ liệu tháng 11 (`docs/soat-du-lieu-2026-11.md`): thuế suất và trạng thái hiệu lực văn bản. QT đang cho xác minh từng điểm với dữ liệu trước khi sửa.
- Soát tờ khai báo oan: cảnh báo K1 bật trên 100% ca đúng, cảnh báo tiền lệ bật trên 47% ca đúng (đã nằm trong kế hoạch sửa 12 mục của PR #1500).
- Chốt chạy bóng sổ PN6 trước hạn xét 27/11.

## 7. Giữ kỷ luật

- Theo 11 luật đường khách và 4 cổng máy đã gộp ngày 21/11. Thêm một cổng: bảng cạnh phải dựng lại được từ tệp gốc và không có cạnh mồ côi.
- Mọi đường (định danh, phân loại, soát tờ khai, sinh mô tả, và sau này là watchdog) đọc **cùng một bảng cạnh**. Nâng cấp sổ ở kho là tới mọi đường.
- Không cho AI tự đoán nhóm ngoài danh sách ứng viên mà không ghi lý do.
- Một việc một lúc trên vùng mã động cơ; trợ lý chỉ mở PR, QT soát và đo rồi mới gộp.

## 8. Không làm trong kế hoạch này

- Không chuyển sang cơ sở dữ liệu đồ thị riêng. Khi bảng cạnh vượt sức chứa bộ nhớ mới tính.
- Không dùng mô hình xếp hạng lại có sẵn trên mạng: thử nghiệm cho thấy làm tệ đi.
- Không huấn luyện mô hình riêng.
- Không nạp nguyên sổ tay của nhiều nhóm vào một lượt AI.

## 9. Rủi ro

| Rủi ro | Cách giữ |
|---|---|
| AI lượt một loại mất nhóm đúng | Luôn nạp kèm nhóm dễ nhầm theo cạnh ngang; đo riêng tỉ lệ "nhóm đúng bị loại ở lượt một" |
| Cạnh ngược sinh tự động tạo nhiễu (một nhóm bị trỏ tới từ hàng chục nhóm) | Hai luật tách riêng: ở bước 2 chỉ kéo nhóm mới khi điều kiện của dòng loại trừ khớp mô tả, tối đa 2–3 nhóm; ở bước 4 chỉ đưa vào gói các cạnh nối giữa những nhóm còn sống |
| Vượt trần 85 giây vì nhiều lượt AI nối đuôi | Tối đa 2 lượt AI cho đa số ca; lượt ba có điều kiện; đo p95 ở mỗi giai đoạn |
| Tờ khai cũ sai lặp lại nhiều lần được coi là tiền lệ | Thứ bậc ở mục 4.5; chỉ nhận mã còn trong biểu thuế hiện hành |
| Số đo đẹp vì tờ khai gần trùng nhau | Bộ 300 ca để riêng; báo riêng số cho hàng chưa từng khai |
| Soạn cạnh C10 bằng AI sai luật | Dùng quy trình soạn–soát hai phiên đang có; cạnh chưa duyệt chỉ để gợi ý |
| Tốn bộ nhớ cho tìm theo nghĩa (300–700 MB) | Đo trên máy thật ở giai đoạn 2 trước khi bật |

## 10. Cần CEO quyết

1. Duyệt hướng và thứ tự giai đoạn ở mục 6.
2. Giai đoạn 6 cần mô hình mạnh để soát cạnh do máy soạn nháp. Dùng nguồn nào là quyết định về hạn mức, QT sẽ trình riêng kèm số lượng cạnh cần soát sau giai đoạn 1.

---

## Cập nhật thực thi 25/11/2026

> Văn bản 21/11/2026 phía trên được giữ nguyên văn bản CEO đã duyệt; mục này chỉ ghi nhận các quyết định thực thi đã chốt tới 25/11/2026.

- **Phối hợp với ADR-0004 (CEO duyệt 22/11/2026):** [`docs/decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md`](decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md) là luật cao nhất; đồ thị tri thức và `tieuChi6` phục vụ quy trình 6 Quy tắc và phép đo bậc thang T1/T2/T3.
- **Giai đoạn 2 đạt mục tiêu tìm ứng viên không cần `moRongUngVien`:** đo ngoại tuyến không AI đạt top-5 93,0% (≥ 92%) và 6 số trong 3 ứng viên đạt 87,7%–90,3% (≥ 76%) trên S-7 300 ca ([`docs/bench/do-thi-gd2-khong-ai-2026-11-24.md`](bench/do-thi-gd2-khong-ai-2026-11-24.md)), tốc độ tiền xử lý rút xuống dưới ngưỡng ≤ 100 ms ở PR `#1869` (QT duyệt 25/11, chờ gộp). PR `#1875` đã đóng ngày 25/11 theo quyết định của QT: cạnh C5/C6 chỉ dùng ở **Giai đoạn 3** để phân biệt giữa các ứng viên đã có, không dùng để kéo thêm nhóm vào danh sách ứng viên.
- **Giai đoạn 3 & công cụ đo:** đã dựng khung mô-đun cô lập (`lib/do-thi/khoi-phan-biet.js`) và chuẩn bị công cụ đo qua Cổng thật trên kênh đo riêng (PR `#1866`, thêm chế độ `nen` giữ nguyên cờ máy thật và giữ bộ kiểm `v3` ngoài repo).
- **Lộ trình gộp/gỡ công tắc `HS_*` (mục 6.1):** kiểm kê 79 cờ và đề xuất lộ trình gộp về một công tắc đồ thị + giảm dần số cờ đã ghi tại [`docs/van-hanh/de-xuat-gop-cong-tac-2026-11.md`](van-hanh/de-xuat-gop-cong-tac-2026-11.md) (PR `#1865`, đã gộp 25/11).
