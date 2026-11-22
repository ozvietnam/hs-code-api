# Phân tích 267 cặp mâu thuẫn C4 và Quy tắc bản 2 (`#1611`)

> Báo cáo phân tích định lượng toàn bộ **267 cặp mâu thuẫn** (`55` `model` + `212` `hang`) trong bảng tra C4 bản 1 (`data/do-thi/c4-model-hang.json`, `phienBan: 1`, `bam: 4c24d1c6…`), làm căn cứ thiết kế **C4 bản 2 (`phienBan: 2`)** trong [`scripts/dung-c4-model-hang.mjs`](../../scripts/dung-c4-model-hang.mjs).
>
> **Tuân thủ riêng tư & phạm vi (`#1611` · `#1595`):**
> - **0 dữ liệu khách hàng / PII:** Không trích tên hàng thô (`tenHang`), mô tả gốc (`sampleDesc`), tên khách hàng, đơn giá, số lượng, số tờ khai hay tên pháp nhân doanh nghiệp. Mọi ví dụ chỉ dùng `khoaChuan`, mã nhóm 4 số, số dòng, vị trí dòng `data/oz-gold-final.jsonl` và tiêu đề nhóm công khai của biểu thuế (`data/tax.json` / `lib/hs-tree.js`).
> - **Chưa nối đường tìm khách hàng:** C4 bản 2 vẫn tách rời hoàn toàn khỏi `api/`, `lib/tim-truoc.js`, `lib/llm*`, `data/prompts/` và không thêm công tắc `HS_*`.

---

## 1. Tổng hợp phân loại toàn bộ 267 cặp mâu thuẫn (Bản 1)

Trong C4 bản 1 dựng trên **5.734** dòng `data/oz-gold-final.jsonl` (**5.633** dòng mang mã 8 số còn hiệu lực trong `data/tax.json`):
- Khoá `hang` đơn lẻ có **329** khoá xuất hiện `≥ 2` dòng, trong đó **212** khoá mâu thuẫn (**`212 / 329 = 64,44%`**) và chỉ **117** khoá thuần một nhóm (**`35,56%`**).
- Khoá `model` có **163** khoá xuất hiện `≥ 2` dòng, trong đó **55** khoá mâu thuẫn (**`55 / 163 = 33,74%`**) và **108** khoá thuần một nhóm (**`66,26%`**).

Toàn bộ **267** cặp mâu thuẫn được phân loại tất định, không giao nhau vào 3 nhóm nguyên nhân gốc:

| Nhóm nguyên nhân | Bản chất | Mâu thuẫn `hang` (`212`) | Mâu thuẫn `model` (`55`) | Tổng (`267`) | Tỷ trọng / `267` |
|---|---|---:|---:|---:|---:|
| **A. Khác dòng sản phẩm / bộ phận hệ thống** | Cùng một hãng sản xuất nhiều dòng hàng thuộc nhiều nhóm HS khác nhau, hoặc cùng mã máy mẹ gán cho các phụ tùng rời | **151** (`71,23%`) | **13** (`23,64%`) | **164** | **61,42%** |
| **B. Khai sai / ranh giới phân loại chưa thống nhất** | Cùng một mặt hàng hoặc cùng một mã model cụ thể nhưng các tờ khai xếp vào 2 nhóm HS khác nhau | **13** (`6,13%`) | **27** (`49,09%`) | **40** | **14,98%** |
| **C. Tên pháp nhân-XNK / địa danh / mã ngắn / thông số chung** | Tên đơn vị thương mại-XNK hoặc địa danh điền vào trường hãng; mã ngắn 2–3 ký tự, thông số chuẩn (`DN15`, `PD20W`) hoặc tên máy tương thích ở `model` | **48** (`22,64%`) | **15** (`27,27%`) | **63** | **23,60%** |
| **Tổng cộng** | | **212** (`100%`) | **55** (`100%`) | **267** | **100,00%** |

### Nhận xét trọng tâm từ bảng phân rã
1. **Ở `hang` (212 cặp), `71,23%` là mơ hồ thật do đa dòng sản phẩm (Nhóm A) và `22,64%` là tên pháp nhân/địa danh (Nhóm C):** tổng cộng **`93,87%`** (`199 / 212`) mâu thuẫn ở `hang` xuất phát từ bản chất trường hãng không định danh được 1 nhóm HS duy nhất.
2. **Ở `model` (55 cặp), gần một nửa (`27 / 55 = 49,09%`) lại chính là tín hiệu phát hiện khai sai hoặc ranh giới HS nóng (Nhóm B):** ví dụ cụm phụ kiện cửa `8301 ↔ 8302 ↔ 3926` (7 model), cảm biến quang/tiệm cận `8541 ↔ 9031 ↔ 8548` (4 model), HMI `8528 ↔ 8537` (2 model), tủ nhiệt công nghiệp `8419 ↔ 8516` (2 model).
3. **15 cặp nhóm 4 số xung đột lặp lại nhiều nhất trong 267 cặp:**

| # | Cặp nhóm xung đột | Tổng số lần gặp | Ở `hang` | Ở `model` |
|---:|---|---:|---:|---:|
| 1 | `8504 ↔ 8544` | 17 | 13 | 4 |
| 2 | `8528 ↔ 8537` | 12 | 9 | 3 |
| 3 | `8536 ↔ 8538` | 10 | 7 | 3 |
| 4 | `6103 ↔ 6204` | 10 | 10 | 0 |
| 5 | `8501 ↔ 8537` | 10 | 10 | 0 |
| 6 | `8536 ↔ 8537` | 8 | 8 | 0 |
| 7 | `8412 ↔ 8481` | 8 | 7 | 1 |
| 8 | `8421 ↔ 8481` | 8 | 7 | 1 |
| 9 | `6101 ↔ 6103` | 7 | 7 | 0 |
| 10 | `6101 ↔ 6204` | 7 | 7 | 0 |
| 11 | `3926 ↔ 7326` | 7 | 6 | 1 |
| 12 | `8301 ↔ 8302` | 7 | 2 | 5 |
| 13 | `4016 ↔ 8481` | 6 | 4 | 2 |
| 14 | `8537 ↔ 8538` | 5 | 5 | 0 |
| 15 | `8421 ↔ 8483` | 5 | 4 | 1 |

---

## 2. Vì sao khoá `hang` đơn lẻ thất bại (`64,44%` mâu thuẫn và bẫy `soDong = 2`)

1. **Tỷ lệ mâu thuẫn gấp đôi `model`:** Ở ngưỡng `≥ 2` dòng, `hang` mâu thuẫn **`64,44%`** (`212 / 329`) so với **`33,74%`** (`55 / 163`) của `model`. Khi xét nhóm `≥ 3` dòng có mặt trên thực tế ở `oz-gold`, có tới **137 / 170 (`80,59%`)** hãng đa nhóm HS và chỉ **33 (`19,41%`)** hãng còn thuần 1 nhóm.
2. **Các hãng công nghiệp và tiêu dùng đều trải rộng nhiều chương/nhóm:** Một hãng thiết bị điện công nghiệp (`ABB`, `OMRON`, `SIEMENS`, `SCHNEIDER`, `DELTA`, `MITSUBISHI`, `EATON`, `FUJI`, `YASKAWA`) hay khí nén (`SMC`, `AIRTAC`, `FESTO`) hay tiêu dùng/phụ kiện (`NATUREHIKE`, `HARUCO`, `WEKOME`, `EARLDOM`) đều bán đồng thời động cơ (`8501`), bộ điều khiển (`8537`), khí cụ đóng ngắt (`8536`), bộ phận rời (`8538`), dây cáp (`8544`), cảm biến (`9031`/`9026`) hoặc xi lanh (`8412`) vs van (`8481`).
3. **`48` chuỗi không phải nhãn hiệu sản phẩm lọt qua bộ lọc bản 1:**
   - Bản 1 chỉ chặn hậu tố doanh nghiệp khi `loai === 'model'`, cho phép **44** tên đơn vị thương mại/XNK/nhà máy và địa danh tỉnh-thành phố (cùng **4** tên đơn vị thương mại viết tắt/không hậu tố của cùng thực thể) lọt vào `hang`, trong đó một số đơn vị thương mại tổng hợp bán **12–19** nhóm hàng không liên quan (từ đồ gia dụng nhựa đến phụ tùng xe và linh kiện điện tử).
   - Sự trùng lặp tên viết khác hậu tố (như 4 biến thể `HLT*`, 3 biến thể `XUNJIE*`, 2 biến thể `HENGYUNTONG*`, 2 biến thể `SHENZHEN TECH*`, 2 biến thể `HAOMI*`, 2 biến thể `HAOHUA*`, 2 biến thể `GOOD-ARK*`, 2 biến thể `JIANGZUN*`, hay biến thể khoảng trắng `MEAN WELL` vs `MEANWELL`) khiến cùng một thực thể bị tách đôi: một nửa trôi vào `bang` bản 1 dù thực thể đó đa nhóm HS.
4. **Bẫy mẫu nhỏ (`soDong = 2`) trên phép đo kín S-7 và kiểm chứng LOO:**
   - Trên tập giữ riêng S-7 (`scripts/ca-do/de-rieng-300.jsonl`), `hang` `RONALD JACK` trong phần dữ liệu huấn luyện sạch chỉ còn đúng **2** dòng thuộc nhóm khóa (`8301`), nên bản 1 chấp nhận vào `bang` và **đoán sai** ca giữ riêng thuộc nhóm máy ghi thời gian (`9106`), kéo độ chính xác S-7 của bản 1 xuống **`5/6 = 83,33%`**.
   - Kiểm chứng LOO (Leave-One-Out) trên toàn bộ `oz-gold` xác nhận cùng quy luật: với bộ lọc nhiễu v2, độ chính xác LOO của `hang` đơn lẻ tăng đơn điệu theo ngưỡng số dòng:
     - `soDong ≥ 2`: **`105 / 143 = 73,43%`**
     - `soDong ≥ 3`: **`57 / 73 = 78,08%`**
     - `soDong ≥ 4`: **`33 / 40 = 82,50%`**
     - `soDong ≥ 6`: **`23 / 26 = 88,46%`**
   - Do đó, `hang` với `soDong = 2..3` hoặc hãng chỉ chiếm đa số (`≥ 80%`) **không được phép** đứng trong bảng tra tất định chính `bang`.

---

## 3. Chi tiết phân loại 212 cặp mâu thuẫn `hang`

### 3.1. Nhóm A — Hãng bán nhiều dòng sản phẩm (`151 / 212 = 71,23%`)

Top 20 hãng đa dòng sản phẩm theo tổng số dòng tờ khai:

| # | `khoaChuan` | Tổng dòng | Số nhóm | Phân bố `ma(soDong)` |
|---:|---|---:|---:|---|
| 1 | `SMC` | 91 | 12 | 8412(42), 8481(22), 3926(7), 3917(5), 7616(3), 9031(3), 8421(2), 8544(2), 9032(2), 4016(1), 7307(1), 7326(1) |
| 2 | `SMARTKIT` | 29 | 3 | 7323(27), 3924(1), 7326(1) |
| 3 | `NORMAN` | 25 | 3 | 8302(17), 8301(5), 3926(3) |
| 4 | `AIRTAC` | 23 | 6 | 8412(12), 8421(4), 8481(4), 7326(1), 8483(1), 9031(1) |
| 5 | `NORAMAN` | 22 | 2 | 8302(15), 8301(7) |
| 6 | `SCHNEIDER` | 21 | 3 | 8536(18), 8504(2), 9031(1) |
| 7 | `DELTA` | 20 | 8 | 8501(4), 8544(4), 8536(3), 8537(3), 8414(2), 8504(2), 8528(1), 8538(1) |
| 8 | `NATUREHIKE` | 18 | 13 | 6306(4), 4202(2), 7616(2), 3923(1), 6401(1), 6505(1), 7013(1), 8201(1), 8414(1), 9401(1), 9403(1), 9404(1), 9506(1) |
| 9 | `HARUCO` | 15 | 9 | 9506(4), 6307(3), 9019(2), 3926(1), 6117(1), 7615(1), 8302(1), 8516(1), 9603(1) |
| 10 | `LCCVN` | 14 | 4 | 8543(6), 9405(5), 8504(2), 8518(1) |
| 11 | `OMRON` | 13 | 5 | 8536(4), 8538(4), 9031(3), 8504(1), 8517(1) |
| 12 | `WEKOME` | 13 | 4 | 8544(7), 7007(4), 3919(1), 8518(1) |
| 13 | `ZOOMLION` | 13 | 5 | 8431(5), 7318(3), 8483(3), 8504(1), 8528(1) |
| 14 | `MONACO` | 12 | 2 | 3922(10), 6910(2) |
| 15 | `SAM` | 11 | 3 | 8452(9), 3919(1), 8451(1) |
| 16 | `PHOENIX CONTACT` | 10 | 4 | 3926(4), 8542(3), 8536(2), 7419(1) |
| 17 | `TENON` | 10 | 2 | 8301(9), 8536(1) |
| 18 | `ATLAPEX` | 9 | 3 | 4013(4), 4012(3), 4011(2) |
| 19 | `HASENVN` | 9 | 3 | 8504(4), 8544(4), 7007(1) |
| 20 | `VTPC` | 9 | 2 | 8481(7), 8421(2) |

Ngoài top 20 trên còn **131** hãng đa dòng sản phẩm khác trải rộng trên thiết bị điện–tự động hóa (`ABB`, `SIEMENS`, `MITSUBISHI`, `PANASONIC`, `YASKAWA`, `EATON`, `FUJI`, `IDEC`, `KEYENCE`, `CHINT`, `LS`, `FESTO`, `HYDAC`, `STNC`, `AIRWORK`, `DANFOSS`, `KINGSTON`, `LITEON`, `MOLEX`, `TOSHIBA`), phụ kiện điện thoại/máy tính (`ABODOS`, `BXE`, `EARLDOM`, `MOVIK`, `PISEN`, `SENDEM`, `ATTACK SHARK`, `AULA`, `XP-PEN`, `KUZOOM`, `LIKGUS`, `VNWK DESIGN`), dệt may/giày dép (`CTONG`, `GAU KID STORE`, `JINGTONG`, `MIGO MIGO`, `ONI`, `SEVENTEEN`, `XIAO`, `XIN SENGDAI`, `MT`, `VADIKARO`, `NOWEAR`, `PIER NO5`), v.v.

### 3.2. Nhóm B — Cùng sản phẩm nhưng khai sai / ranh giới chưa thống nhất (`13 / 212 = 6,13%`)

Toàn bộ **13** khoá `hang` mà mọi dòng mâu thuẫn đều thuộc về cùng một dòng sản phẩm bị khai lệch nhóm 4 số:

| # | `khoaChuan` | Tổng dòng | Phân bố `ma(soDong)` | Ghi nhận phân loại theo biểu thuế |
|---:|---|---:|---|---|
| 1 | `DTECH` | 2 | 8518(1), 8525(1) | Cùng thiết bị chia tín hiệu HDMI (khớp mã model `DT-7148B`), khai phân tán giữa `8518` và `8525`. |
| 2 | `FORLINX` | 2 | 8528(1), 8537(1) | Cùng cụm màn hình/bộ điều khiển công nghiệp (khớp mã `OK335xD`), lệch ranh giới `8528` ↔ `8537`. |
| 3 | `GPNE` | 2 | 8512(1), 8539(1) | Cùng sản phẩm đèn LED chiếu sáng phương tiện; lệch ranh giới cụm đèn xe (`8512`) vs bóng đèn (`8539`). |
| 4 | `JIN HONGFANG` | 2 | 8419(1), 8516(1) | Cùng tủ gia nhiệt thực phẩm công nghiệp (khớp mã `FD-500`), lệch ranh giới `8419` ↔ `8516`. |
| 5 | `JUNXIFU` | 2 | 8420(1), 8438(1) | Cùng máy cán bột công nghiệp (khớp mã `FKR-240`), lệch ranh giới `8420` ↔ `8438`. |
| 6 | `LEFIRCKO` | 2 | 8548(1), 9031(1) | Cùng cảm biến tiệm cận (khớp mã `TL-W5MC1`), 1 dòng khai nhầm sang `8548` thay vì `9031`. |
| 7 | `MARY JANE` | 3 | 6405(2), 6404(1) | Cùng mẫu giày dép (khớp mã `AK21`), khai lệch giữa `6404` và `6405`. |
| 8 | `TALUN` | 2 | 7321(1), 8419(1) | Cùng lò nướng công nghiệp (khớp mã `TL-6PG`), 1 dòng khai nhầm sang nhóm gia dụng `7321` thay vì `8419`. |
| 9 | `TAOJINGCHI` | 3 | 8537(2), 8528(1) | Cùng màn hình cảm ứng LCD/HMI (khớp dòng `TJC8048X550*`), lệch ranh giới `8528` ↔ `8537`. |
| 10 | `VISKOVITA` | 2 | 3924(1), 3926(1) | Cùng mặt hàng vật tư vệ sinh bằng nhựa xốp; 1 dòng khai nhầm sang đồ gia dụng/nhà bếp (`3924`) thay vì `3926`. |
| 11 | `WATERUN` | 2 | 8414(1), 8421(1) | Cùng thiết bị xử lý khói hàn công nghiệp; lệch ranh giới quạt/máy hút (`8414`) vs thiết bị lọc không khí (`8421`). |
| 12 | `XIPENG` | 2 | 6909(1), 6914(1) | Cùng sản phẩm gốm sứ kỹ thuật chịu mài mòn; lệch ranh giới đồ gốm kỹ thuật (`6909`) vs sản phẩm gốm sứ khác (`6914`). |
| 13 | `ZHONGSHAN JUSHUN CASTE` | 3 | 8716(2), 8302(1) | Cùng mặt hàng bánh xe đẩy dùng cho xe đẩy hàng; lệch ranh giới bộ phận xe không cơ khí (`8716`) vs phụ kiện/bánh xe kim loại (`8302`). |

### 3.3. Nhóm C — Tên đơn vị thương mại / pháp nhân / địa danh (`48 / 212 = 22,64%`)

Gồm **48** mục bị điền tên đơn vị pháp nhân doanh nghiệp, nhà máy hoặc địa danh tỉnh/thành phố vào trường `brands` (được rút gọn ký hiệu để tuân thủ chuẩn 0 PII):
- **Đơn vị thương mại / XNK nhiều ngành (`14` mục):** các biến thể của `XUNJIE*` (3 biến thể, tối đa 19 nhóm HS), `HENGYUNTONG*` (2 biến thể, tối đa 17 nhóm HS), `JIANHU*` (12 nhóm HS), `SHENGYIHENG*` (3 nhóm), `NINGBO CIXI*` (3 nhóm), `ENPING DONGMING*` (2 nhóm), `TONGLU YICHENG*` (2 nhóm), `ZHENGZHOU DAMAISUI*` (2 nhóm), `D.T.P.P*` (2 nhóm), `SENSEN*` (2 nhóm), `SHANTOU GURAO*` (2 nhóm: văn phòng phẩm `9017` & phích chân không `9617`).
- **Nhà sản xuất / nhà cung cấp mang tên pháp nhân hoặc tiền tố tỉnh-thành phố (`34` mục):** các biến thể `HLT*` (4 biến thể), `HAOMI*` (2 biến thể), `HAOHUA*` (2 biến thể), `GOOD-ARK*` (2 biến thể), `JIANGZUN*` (2 biến thể), `SHENZHEN TECH*` (2 biến thể), `SHENZHEN HEXINGSHENG` / `SHENZHEN XINBAILI`, `AIKES PNEUMATIC*`, `DONGGUAN YUXI*`, `FOSHAN DAVIS*`, `HAOYAN CONSTRUCTION*`, `JIANGSU TAIQIANG`, `LEFOO INDUSTRIAL*`, `NINGBO KAILING*`, `NINGBO NATUREHIKE*`, `QIANTAI TEXTILE*`, `SHANGHAI GOHI`, `TAI'AN` / `TAIAN`, `TISLANQI*`, `WANDING*`, `WANTONG*`, `WENLING ZUOYU*`, `WUHAN FLECK*`, `YIWU CHOUNONG*`.

---

## 4. Chi tiết toàn bộ 55 cặp mâu thuẫn `model`

### Tổng hợp 3 nhóm nguyên nhân ở `model` (`55` cặp)
- **Nhóm A (`13 / 55 = 23,64%`):** Mã máy mẹ / cụm bộ sản phẩm được dùng chung cho các bộ phận rời (`AE-102A`, `BRW 200/31,5`, `FOTO 8.9S`, `FTS`, `H3CR-A8E`, `M22-K10`, `MS4SA-AP`, `SL-3K5W-TS`, `SL-8KW-TC`, `X-0606-B5`, `YT-28`, `YT-29`, `ZCY-45R`).
- **Nhóm B (`27 / 55 = 49,09%`):** Cùng sản phẩm/model nhưng khai lệch ranh giới hoặc sai mã — tập trung ở phụ kiện khóa cửa `8301 ↔ 8302 ↔ 3926` (7 model), cảm biến quang/tiệm cận `8541 ↔ 9031 ↔ 8548` (4 model), HMI/điều khiển `8528 ↔ 8537` (2 model), tủ nhiệt công nghiệp `8419 ↔ 8516` (2 model) và 12 model đơn lẻ khác.
- **Nhóm C (`15 / 55 = 27,27%`):**
  - 6 mã 2 ký tự va chạm ngẫu nhiên: `A2`, `C2`, `F3`, `G6`, `G8`, `V5`.
  - 5 mã ngắn 3 ký tự / SKU trùng liên ngành: `A15`, `D20`, `S10`, `S700`, `TM69301-6`.
  - 2 thông số kỹ thuật chuẩn: `DN15` (đường kính danh nghĩa 15 mm), `PD20W` (chuẩn sạc Power Delivery 20W).
  - 2 tên thiết bị đích dùng kèm thay cho model phụ kiện: `IP17`, `NOTE 10`.

### Bảng đầy đủ 55 cặp mâu thuẫn `model`

| # | `khoaChuan` | Nhóm | Tổng dòng | Các nhóm 4 số, tiêu đề biểu thuế & vị trí dòng | Phân tích nguyên nhân |
|---:|---|---|---:|---|---|
| 1 | `4F210` | **B** | 2 | `8414` (1 dòng: Bơm không khí hoặc bơm chân không, máy nén không khí hoặc chất khí khác và quạt; nắp ch…) [dòng 3775]<br>`8481` (1 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 4214] | Cùng loại van điều khiển khí nén đạp chân; 1 dòng khai nhầm sang bộ phận máy nén khí (`8414`) thay vì van (`8481`). |
| 2 | `A15` | **C** | 2 | `7318` (1 dòng: Vít, bu lông, đai ốc, vít đầu vuông, vít treo, đinh tán, chốt hãm, chốt định vị, vòng đ…) [dòng 3446]<br>`9403` (1 dòng: Đồ nội thất khác và các bộ phận của chúng.) [dòng 1037] | Mã ngắn 3 ký tự trùng ngẫu nhiên giữa chi tiết kẹp chặt kim loại (`7318`) và đồ nội thất (`9403`). |
| 3 | `A2` | **C** | 3 | `3922` (1 dòng: Bồn tắm, bồn tắm vòi sen, bồn rửa, chậu rửa, bệ rửa vệ sinh (bidets), bệ và nắp xí bệt,…) [dòng 1465]<br>`8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 169]<br>`9405` (1 dòng: Đèn và bộ đèn kể cả đèn pha và đèn rọi và bộ phận của chúng, chưa được chi tiết hoặc gh…) [dòng 3690] | Mã ngắn 2 ký tự va chạm giữa 3 ngành khác hẳn nhau: thiết bị vệ sinh nhựa (`3922`), khóa (`8301`), đèn (`9405`). |
| 4 | `ACA-1210-1-N-A` | **B** | 2 | `8412` (1 dòng: Động cơ và mô tơ khác.) [dòng 1441]<br>`8479` (1 dòng: Máy và thiết bị cơ khí có chức năng riêng biệt, chưa được chi tiết hoặc ghi ở nơi khác …) [dòng 5190] | Cùng chi tiết giảm chấn công nghiệp; lệch ranh giới giữa bộ phận động cơ thủy lực/khí nén (`8412`) và thiết bị cơ khí chức năng riêng (`8479`). |
| 5 | `AE-102A` | **A** | 7 | `4016` (5 dòng: Các sản phẩm khác bằng cao su lưu hóa trừ cao su cứng.) [dòng 1227,2828,2829,3024,3025]<br>`3926` (1 dòng: Các sản phẩm khác bằng plastic và các sản phẩm bằng các vật liệu khác của các nhóm từ 3…) [dòng 1226]<br>`8481` (1 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 2322] | Mã cụm máy nén khí dùng chung cho các phụ tùng rời khác nhóm HS (gioăng cao su `4016`, phớt nhựa `3926`, van một chiều `8481`). |
| 6 | `AIMB-501-A` | **B** | 2 | `8537` (1 dòng: Bảng, panel, giá đỡ, bàn, tủ và các loại hộp và đế khác, được lắp với hai hay nhiều thi…) [dòng 3760]<br>`8542` (1 dòng: Mạch điện tử tích hợp.) [dòng 1425] | Cùng bo mạch điều khiển điện tử; lệch ranh giới giữa bảng/mô-đun điều khiển (`8537`) và vi mạch tích hợp (`8542`). |
| 7 | `AK21` | **B** | 3 | `6405` (2 dòng: Giày, dép khác) [dòng 4819,4842]<br>`6404` (1 dòng: Giày, dép có đế ngoài bằng cao su, plastic, da thuộc hoặc da tổng hợp và mũ giày bằng v…) [dòng 4778] | Cùng mẫu giày dép; lệch nhóm giữa giày có mũ vật liệu dệt (`6404`) và giày khác (`6405`). |
| 8 | `B49-49` | **B** | 2 | `8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 5572]<br>`8302` (1 dòng: Giá, khung, phụ kiện và các sản phẩm tương tự bằng kim loại cơ bản dùng cho đồ nội thất…) [dòng 913] | Cùng phụ kiện chốt khóa cửa nhôm; lệch ranh giới giữa bộ phận ổ khóa (`8301`) và phụ kiện lắp cửa kim loại cơ bản (`8302`). |
| 9 | `BRW 200/31,5` | **A** | 3 | `4009` (2 dòng: Các loại ống, ống dẫn và ống vòi, bằng cao su lưu hóa trừ cao su cứng, có hoặc không kè…) [dòng 4126,4127]<br>`8481` (1 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 5154] | Mã cụm bơm công nghiệp dùng chung cho các phụ tùng khác nhóm: ống cao su (`4009`) và bộ phận van (`8481`). |
| 10 | `C2` | **C** | 3 | `3926` (1 dòng: Các sản phẩm khác bằng plastic và các sản phẩm bằng các vật liệu khác của các nhóm từ 3…) [dòng 3944]<br>`7326` (1 dòng: Các sản phẩm khác bằng sắt hoặc thép) [dòng 2981]<br>`8504` (1 dòng: Máy biến điện (máy biến áp và máy biến dòng), máy biến đổi điện tĩnh (ví dụ, bộ chỉnh l…) [dòng 702] | Mã ngắn 2 ký tự va chạm giữa vật phẩm nhựa (`3926`), sắt thép (`7326`) và bộ biến đổi điện tĩnh (`8504`). |
| 11 | `D20` | **C** | 2 | `8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 4107]<br>`8536` (1 dòng: Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu nối hay lắp tron…) [dòng 3815] | Mã ngắn 3 ký tự trùng ngẫu nhiên giữa ổ khóa tủ (`8301`) và thiết bị đấu nối mạch điện (`8536`). |
| 12 | `DN15` | **C** | 3 | `8481` (2 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 4429,5429]<br>`9026` (1 dòng: Dụng cụ và máy đo hoặc kiểm tra lưu lượng, mức, áp suất hoặc biến số của chất lỏng hoặc…) [dòng 650] | Thông số đường kính danh nghĩa tiêu chuẩn `DN15` (15 mm) bị trích vào `model`; xuất hiện ở van (`8481`) và phụ kiện đo lưu lượng (`9026`). |
| 13 | `DT-7148B` | **B** | 2 | `8518` (1 dòng: Micro và giá đỡ micro; loa, đã hoặc chưa lắp ráp vào trong vỏ loa; tai nghe có khung ch…) [dòng 5616]<br>`8525` (1 dòng: Thiết bị phát dùng cho phát thanh sóng vô tuyến hoặc truyền hình, có hoặc không gắn với…) [dòng 1924] | Cùng thiết bị chia tín hiệu HDMI; khai phân tán giữa nhóm âm thanh (`8518`) và thiết bị phát (`8525`). |
| 14 | `DW13` | **B** | 2 | `3926` (1 dòng: Các sản phẩm khác bằng plastic và các sản phẩm bằng các vật liệu khác của các nhóm từ 3…) [dòng 1772]<br>`8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 1775] | Cùng chi tiết đệm nhựa cửa/khóa; lệch giữa phân loại theo vật liệu plastic (`3926`) và bộ phận khóa (`8301`). |
| 15 | `ESW-35D` | **B** | 2 | `8419` (1 dòng: Trang thiết bị cho phòng thí nghiệm hoặc máy, thiết bị, gia nhiệt bằng điện hoặc không …) [dòng 3393]<br>`8516` (1 dòng: Dụng cụ điện đun nước nóng tức thời hoặc đun nước nóng có dự trữ và đun nước nóng kiểu …) [dòng 1306] | Cùng tủ gia nhiệt công nghiệp xử lý thực phẩm; lệch ranh giới thiết bị nhiệt công nghiệp (`8419`) và thiết bị nhiệt điện gia dụng (`8516`). |
| 16 | `EX-13EA` | **B** | 2 | `8541` (1 dòng: Thiết bị bán dẫn (ví dụ đi-ốt, bóng bán dẫn (tranzito), bộ chuyển đổi dựa trên chất bán…) [dòng 3082]<br>`9031` (1 dòng: Máy, thiết bị và dụng cụ đo lường hoặc kiểm tra, chưa được ghi hay chi tiết ở nơi khác …) [dòng 1195] | Cùng cảm biến quang; lệch ranh giới thiết bị bán dẫn cảm quang (`8541`) và dụng cụ đo kiểm tra quang học (`9031`). |
| 17 | `F3` | **C** | 2 | `4016` (1 dòng: Các sản phẩm khác bằng cao su lưu hóa trừ cao su cứng.) [dòng 867]<br>`8541` (1 dòng: Thiết bị bán dẫn (ví dụ đi-ốt, bóng bán dẫn (tranzito), bộ chuyển đổi dựa trên chất bán…) [dòng 5311] | Mã ngắn 2 ký tự va chạm giữa sản phẩm cao su lưu hóa (`4016`) và đi-ốt phát quang LED (`8541`). |
| 18 | `FD-500` | **B** | 2 | `8419` (1 dòng: Trang thiết bị cho phòng thí nghiệm hoặc máy, thiết bị, gia nhiệt bằng điện hoặc không …) [dòng 2549]<br>`8516` (1 dòng: Dụng cụ điện đun nước nóng tức thời hoặc đun nước nóng có dự trữ và đun nước nóng kiểu …) [dòng 2548] | Cùng tủ gia nhiệt thực phẩm công nghiệp; lệch ranh giới `8419` (công nghiệp) vs `8516` (điện gia dụng/nhiệt điện). |
| 19 | `FKR-240` | **B** | 2 | `8420` (1 dòng: Các loại máy cán là hoặc máy cán ép phẳng kiểu trục lăn khác, trừ các loại máy dùng để …) [dòng 77]<br>`8438` (1 dòng: Máy chế biến công nghiệp hoặc sản xuất thực phẩm hoặc đồ uống, chưa được ghi hoặc chi t…) [dòng 3392] | Cùng máy cán chế biến bột; lệch ranh giới máy cán trục lăn (`8420`) và máy chế biến thực phẩm công nghiệp (`8438`). |
| 20 | `FOTO 8.9S` | **A** | 2 | `8443` (1 dòng: Máy in sử dụng các bộ phận in như khuôn in (bát chữ), ống in và các bộ phận in khác của…) [dòng 417]<br>`8537` (1 dòng: Bảng, panel, giá đỡ, bàn, tủ và các loại hộp và đế khác, được lắp với hai hay nhiều thi…) [dòng 2349] | Mã dòng máy tạo mẫu 3D dùng cho cả máy chính (`8443` — mã khai cũ trước Chú giải 10 Ch.84) và bảng điều khiển rời (`8537`). |
| 21 | `FS-N41N` | **B** | 2 | `8541` (1 dòng: Thiết bị bán dẫn (ví dụ đi-ốt, bóng bán dẫn (tranzito), bộ chuyển đổi dựa trên chất bán…) [dòng 1529]<br>`9031` (1 dòng: Máy, thiết bị và dụng cụ đo lường hoặc kiểm tra, chưa được ghi hay chi tiết ở nơi khác …) [dòng 1183] | Cùng dòng cảm biến/khuếch đại sợi quang; lệch ranh giới `8541` vs `9031` (kèm dòng gộp nhiều model trên cùng tờ khai). |
| 22 | `FS-V31` | **B** | 2 | `8541` (1 dòng: Thiết bị bán dẫn (ví dụ đi-ốt, bóng bán dẫn (tranzito), bộ chuyển đổi dựa trên chất bán…) [dòng 5288]<br>`9031` (1 dòng: Máy, thiết bị và dụng cụ đo lường hoặc kiểm tra, chưa được ghi hay chi tiết ở nơi khác …) [dòng 303] | Cùng cảm biến quang công nghiệp; lệch ranh giới thiết bị bán dẫn cảm quang (`8541`) và dụng cụ đo kiểm tra (`9031`). |
| 23 | `FTS` | **A** | 2 | `8501` (1 dòng: Động cơ điện và máy phát điện (trừ tổ máy phát điện).) [dòng 3733]<br>`8526` (1 dòng: Ra đa, các thiết bị dẫn đường bằng sóng vô tuyến và các thiết bị điều khiển từ xa bằng …) [dòng 2221] | Mã dòng sản phẩm dùng chung cho cả động cơ điện (`8501`) và bộ điều khiển từ xa vô tuyến (`8526`). |
| 24 | `G6` | **C** | 2 | `8424` (1 dòng: Thiết bị cơ khí (được điều khiển bằng tay hoặc không) để phun bắn, phun rải hoặc phun á…) [dòng 1323]<br>`8471` (1 dòng: Máy xử lý dữ liệu tự động và các khối chức năng của chúng; đầu đọc từ tính hoặc đầu đọc…) [dòng 2856] | Mã ngắn 2 ký tự va chạm giữa phụ tùng thiết bị phun cơ khí (`8424`) và thiết bị ngoại vi xử lý dữ liệu (`8471`). |
| 25 | `G8` | **C** | 2 | `8424` (1 dòng: Thiết bị cơ khí (được điều khiển bằng tay hoặc không) để phun bắn, phun rải hoặc phun á…) [dòng 1323]<br>`8471` (1 dòng: Máy xử lý dữ liệu tự động và các khối chức năng của chúng; đầu đọc từ tính hoặc đầu đọc…) [dòng 634] | Mã ngắn 2 ký tự va chạm giữa phụ tùng thiết bị phun cơ khí (`8424`) và thiết bị ngoại vi xử lý dữ liệu (`8471`). |
| 26 | `H3CR-A8E` | **A** | 2 | `8536` (1 dòng: Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu nối hay lắp tron…) [dòng 3835]<br>`8538` (1 dòng: Bộ phận chuyên dùng hay chủ yếu dùng với các thiết bị thuộc nhóm 85.35, 85.36 hoặc 85.37.) [dòng 2839] | Mã dòng rơ le dùng cho cả thiết bị đóng ngắt chính (`8536`) và đế cắm bộ phận rời (`8538`). |
| 27 | `IP17` | **C** | 3 | `8504` (2 dòng: Máy biến điện (máy biến áp và máy biến dòng), máy biến đổi điện tĩnh (ví dụ, bộ chỉnh l…) [dòng 1514,1516]<br>`8544` (1 dòng: Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã tráng men cách điệ…) [dòng 4151] | Tên dòng máy điện thoại đích dùng kèm bị trích làm model chung cho cả bộ nguồn sạc (`8504`) và cáp nối (`8544`). |
| 28 | `KCQ21` | **B** | 2 | `8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 585]<br>`8302` (1 dòng: Giá, khung, phụ kiện và các sản phẩm tương tự bằng kim loại cơ bản dùng cho đồ nội thất…) [dòng 5589] | Cùng phụ kiện chốt khóa cửa; lệch ranh giới giữa bộ phận khóa (`8301`) và phụ kiện gắn cửa (`8302`). |
| 29 | `KMK30` | **B** | 2 | `8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 1815]<br>`8302` (1 dòng: Giá, khung, phụ kiện và các sản phẩm tương tự bằng kim loại cơ bản dùng cho đồ nội thất…) [dòng 306] | Cùng phụ kiện miệng ốp khóa cửa; lệch ranh giới `8301` vs `8302`. |
| 30 | `KPZ19` | **B** | 2 | `8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 5574]<br>`8302` (1 dòng: Giá, khung, phụ kiện và các sản phẩm tương tự bằng kim loại cơ bản dùng cho đồ nội thất…) [dòng 912] | Cùng phụ kiện vấu hãm cửa/khóa; lệch ranh giới `8301` vs `8302`. |
| 31 | `KT65` | **B** | 2 | `3926` (1 dòng: Các sản phẩm khác bằng plastic và các sản phẩm bằng các vật liệu khác của các nhóm từ 3…) [dòng 901]<br>`8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 5511] | Cùng đệm nhựa chống xệ cửa; lệch giữa phân loại theo chất liệu plastic (`3926`) và bộ phận khóa (`8301`). |
| 32 | `KT86` | **B** | 3 | `8301` (2 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 5573,5588]<br>`8302` (1 dòng: Giá, khung, phụ kiện và các sản phẩm tương tự bằng kim loại cơ bản dùng cho đồ nội thất…) [dòng 1802] | Cùng phụ kiện chốt khóa cửa (nhóm `8301` vs phụ kiện lắp cửa `8302`). |
| 33 | `M22-K10` | **A** | 2 | `8536` (1 dòng: Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu nối hay lắp tron…) [dòng 5425]<br>`8538` (1 dòng: Bộ phận chuyên dùng hay chủ yếu dùng với các thiết bị thuộc nhóm 85.35, 85.36 hoặc 85.37.) [dòng 5018] | Mã dòng thiết bị điều khiển dùng cho cả nút bấm chính (`8536`) và khối tiếp điểm phụ rời (`8538`). |
| 34 | `MS4SA-AP` | **A** | 2 | `8536` (1 dòng: Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu nối hay lắp tron…) [dòng 5056]<br>`8538` (1 dòng: Bộ phận chuyên dùng hay chủ yếu dùng với các thiết bị thuộc nhóm 85.35, 85.36 hoặc 85.37.) [dòng 3971] | Mã dòng rơ le thời gian dùng cho cả rơ le (`8536`) và đế rơ le rời (`8538`). |
| 35 | `NOTE 10` | **C** | 2 | `8504` (1 dòng: Máy biến điện (máy biến áp và máy biến dòng), máy biến đổi điện tĩnh (ví dụ, bộ chỉnh l…) [dòng 14]<br>`8544` (1 dòng: Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã tráng men cách điệ…) [dòng 4149] | Tên dòng thiết bị đích dùng kèm bị trích làm model chung cho cả bộ sạc (`8504`) và cáp sạc (`8544`). |
| 36 | `NTS1200A` | **B** | 2 | `8535` (1 dòng: Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu nối hay lắp tron…) [dòng 2084]<br>`8536` (1 dòng: Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu nối hay lắp tron…) [dòng 2078] | Cùng loại cầu chì gắn mạch in; khai lệch ngưỡng điện áp giữa trên 1.000V (`8535`) và không quá 1.000V (`8536`). |
| 37 | `OK335XD` | **B** | 2 | `8528` (1 dòng: Màn hình và máy chiếu, không gắn với thiết bị thu dùng trong truyền hình; thiết bị thu …) [dòng 5169]<br>`8537` (1 dòng: Bảng, panel, giá đỡ, bàn, tủ và các loại hộp và đế khác, được lắp với hai hay nhiều thi…) [dòng 4410] | Cùng cụm màn hình/bo điều khiển công nghiệp; lệch ranh giới màn hình hiển thị (`8528`) và bảng điều khiển (`8537`). |
| 38 | `PD20W` | **C** | 4 | `8504` (2 dòng: Máy biến điện (máy biến áp và máy biến dòng), máy biến đổi điện tĩnh (ví dụ, bộ chỉnh l…) [dòng 14,21]<br>`8544` (2 dòng: Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã tráng men cách điệ…) [dòng 162,340] | Thông số chuẩn công suất sạc `Power Delivery 20W` bị trích làm model chung cho củ sạc (`8504`) và cáp sạc (`8544`). |
| 39 | `S10` | **C** | 3 | `8504` (1 dòng: Máy biến điện (máy biến áp và máy biến dòng), máy biến đổi điện tĩnh (ví dụ, bộ chỉnh l…) [dòng 14]<br>`8518` (1 dòng: Micro và giá đỡ micro; loa, đã hoặc chưa lắp ráp vào trong vỏ loa; tai nghe có khung ch…) [dòng 202]<br>`8544` (1 dòng: Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã tráng men cách điệ…) [dòng 4148] | Mã ngắn 3 ký tự / tên dòng máy phổ thông va chạm giữa củ sạc (`8504`), tai nghe (`8518`) và cáp sạc (`8544`). |
| 40 | `S700` | **C** | 2 | `8504` (1 dòng: Máy biến điện (máy biến áp và máy biến dòng), máy biến đổi điện tĩnh (ví dụ, bộ chỉnh l…) [dòng 789]<br>`9025` (1 dòng: Tỷ trọng kế và các dụng cụ đo dạng nổi tương tự, nhiệt kế, hoả kế, khí áp kế, ẩm kế, có…) [dòng 1351] | Mã chữ+số chung trùng ngẫu nhiên giữa bộ nguồn tĩnh (`8504`) và thiết bị đo nhiệt (`9025`). |
| 41 | `SL-3K5W-TS` | **A** | 2 | `8516` (1 dòng: Dụng cụ điện đun nước nóng tức thời hoặc đun nước nóng có dự trữ và đun nước nóng kiểu …) [dòng 322]<br>`8536` (1 dòng: Thiết bị điện để đóng ngắt mạch hay bảo vệ mạch điện, hoặc dùng để đấu nối hay lắp tron…) [dòng 460] | Mã dòng thiết bị nhiệt dùng chung cho hai linh kiện rời khác nhóm: điện trở đốt nóng (`8516`) và cụm công tắc (`8536`). |
| 42 | `SL-8KW-TC` | **A** | 3 | `8516` (1 dòng: Dụng cụ điện đun nước nóng tức thời hoặc đun nước nóng có dự trữ và đun nước nóng kiểu …) [dòng 258]<br>`8528` (1 dòng: Màn hình và máy chiếu, không gắn với thiết bị thu dùng trong truyền hình; thiết bị thu …) [dòng 3810]<br>`8537` (1 dòng: Bảng, panel, giá đỡ, bàn, tủ và các loại hộp và đế khác, được lắp với hai hay nhiều thi…) [dòng 2232] | Mã dòng thiết bị nhiệt dùng chung cho ba bộ phận rời: thanh điều chỉnh (`8516`), màn hình (`8528`), hộp điều khiển (`8537`). |
| 43 | `TJC8048X550_011CS_Y` | **B** | 2 | `8528` (1 dòng: Màn hình và máy chiếu, không gắn với thiết bị thu dùng trong truyền hình; thiết bị thu …) [dòng 3179]<br>`8537` (1 dòng: Bảng, panel, giá đỡ, bàn, tủ và các loại hộp và đế khác, được lắp với hai hay nhiều thi…) [dòng 2407] | Cùng màn hình cảm ứng giao diện HMI; lặp lại ranh giới `8528` (hiển thị) vs `8537` (điều khiển) đã ghi nhận ở C1. |
| 44 | `TL-6PG` | **B** | 2 | `7321` (1 dòng: Bếp, bếp có lò nướng, vỉ lò, bếp nấu (kể cả loại có nồi hơi phụ dùng cho hệ thống gia n…) [dòng 5482]<br>`8419` (1 dòng: Trang thiết bị cho phòng thí nghiệm hoặc máy, thiết bị, gia nhiệt bằng điện hoặc không …) [dòng 1796] | Cùng thiết bị lò nướng công nghiệp; 1 dòng khai nhầm sang thiết bị đun nấu gia đình bằng thép (`7321`) thay vì `8419`. |
| 45 | `TL-W5MC1` | **B** | 2 | `8548` (1 dòng: Các bộ phận điện của máy móc hoặc thiết bị, chưa được chi tiết hoặc ghi ở nơi khác tron…) [dòng 4293]<br>`9031` (1 dòng: Máy, thiết bị và dụng cụ đo lường hoặc kiểm tra, chưa được ghi hay chi tiết ở nơi khác …) [dòng 1727] | Cùng cảm biến tiệm cận; 1 dòng khai sai vào nhóm tồn đọng bộ phận điện (`8548`) thay vì dụng cụ đo kiểm tra (`9031`). |
| 46 | `TM69301-6` | **C** | 2 | `6403` (1 dòng: Giày, dép có đế ngoài bằng cao su, plastic, da thuộc hoặc da tổng hợp và mũ giày bằng d…) [dòng 148]<br>`9403` (1 dòng: Đồ nội thất khác và các bộ phận của chúng.) [dòng 4706] | Mã SKU trùng ngẫu nhiên giữa dòng sản phẩm giày dép (`6403`, dòng gộp nhiều mã) và đồ nội thất kim loại (`9403`). |
| 47 | `V5` | **C** | 3 | `8301` (1 dòng: Khóa móc và ổ khóa (loại mở bằng chìa, số hoặc điện), bằng kim loại cơ bản; móc cài và …) [dòng 92]<br>`8481` (1 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 62]<br>`9507` (1 dòng: Cần câu, lưỡi câu và các loại dây câu khác; vợt lưới bắt cá, vợt lưới bắt bướm và các l…) [dòng 17] | Mã ngắn 2 ký tự va chạm giữa khóa (`8301`), vòi van (`8481`) và dụng cụ câu cá (`9507`). |
| 48 | `WTP-009` | **B** | 4 | `7007` (3 dòng: Kính an toàn, bao gồm kính tôi hoặc kính dán nhiều lớp (laminated glass).) [dòng 285,1199,4172]<br>`3919` (1 dòng: Tấm, phiến, màng, lá, băng, dải và các hình dạng phẳng khác tự dính, bằng plastic, có h…) [dòng 360] | Cùng mã miếng dán bảo vệ màn hình: 3 dòng kính an toàn (`7007`, gắn hãng chính) vs 1 dòng màng nhựa tự dính (`3919`, hãng khác). |
| 49 | `WTP-012` | **B** | 2 | `3919` (1 dòng: Tấm, phiến, màng, lá, băng, dải và các hình dạng phẳng khác tự dính, bằng plastic, có h…) [dòng 1870]<br>`7007` (1 dòng: Kính an toàn, bao gồm kính tôi hoặc kính dán nhiều lớp (laminated glass).) [dòng 105] | Cùng mã miếng dán bảo vệ màn hình: lệch phân loại vật liệu nhựa tự dính (`3919`) vs kính cường lực (`7007`). |
| 50 | `X-0606-B5` | **A** | 4 | `3926` (2 dòng: Các sản phẩm khác bằng plastic và các sản phẩm bằng các vật liệu khác của các nhóm từ 3…) [dòng 3623,3624]<br>`3917` (1 dòng: Các loại ống, ống dẫn và ống vòi, và các phụ kiện dùng để ghép nối chúng (ví dụ, các đo…) [dòng 3625]<br>`3925` (1 dòng: Đồ vật bằng plastic dùng trong xây lắp, chưa được chi tiết hoặc ghi ở nơi khác (+).) [dòng 2729] | Mã chung của một gói/công trình lắp đặt bằng plastic dùng cho nhiều chi tiết khác nhóm (`3926`, `3917`, `3925`). |
| 51 | `XYCRSC60-C` | **B** | 2 | `7616` (1 dòng: Các sản phẩm khác bằng nhôm) [dòng 3367]<br>`8483` (1 dòng: Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên; thân ổ và gối đỡ trục dùng…) [dòng 434] | Cùng cụm bàn trượt cơ khí căn chỉnh trục XY; lệch phân loại theo chất liệu nhôm (`7616`) vs cơ cấu truyền động (`8483`). |
| 52 | `YT-28` | **A** | 2 | `8467` (1 dòng: Dụng cụ cầm tay, hoạt động bằng khí nén, thủy lực hoặc có gắn động cơ dùng điện hoặc kh…) [dòng 560]<br>`8483` (1 dòng: Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên; thân ổ và gối đỡ trục dùng…) [dòng 527] | Mã dụng cụ khoan cầm tay khí nén dùng cho cả máy chính (`8467`) và bạc trượt phụ tùng (`8483`). |
| 53 | `YT-29` | **A** | 4 | `8467` (2 dòng: Dụng cụ cầm tay, hoạt động bằng khí nén, thủy lực hoặc có gắn động cơ dùng điện hoặc kh…) [dòng 560,5157]<br>`7318` (1 dòng: Vít, bu lông, đai ốc, vít đầu vuông, vít treo, đinh tán, chốt hãm, chốt định vị, vòng đ…) [dòng 2993]<br>`8481` (1 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 4118] | Mã dụng cụ khoan cầm tay khí nén dùng cho cả máy chính (`8467`) và phụ tùng rời (`7318` bu lông, `8481` van chia hơi). |
| 54 | `ZCY-45R` | **A** | 8 | `7318` (2 dòng: Vít, bu lông, đai ốc, vít đầu vuông, vít treo, đinh tán, chốt hãm, chốt định vị, vòng đ…) [dòng 2933,5080]<br>`4016` (1 dòng: Các sản phẩm khác bằng cao su lưu hóa trừ cao su cứng.) [dòng 2934]<br>`8412` (1 dòng: Động cơ và mô tơ khác.) [dòng 2003]<br>`8413` (1 dòng: Bơm chất lỏng, có hoặc không lắp thiết bị đo; máy đẩy chất lỏng(+).) [dòng 5151]<br>`8421` (1 dòng: Máy ly tâm, kể cả máy làm khô bằng ly tâm; máy và thiết bị lọc hoặc tinh chế chất lỏng …) [dòng 2807]<br>`8481` (1 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 3786]<br>`8483` (1 dòng: Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên; thân ổ và gối đỡ trục dùng…) [dòng 3785] | Mã máy công trình khai ở trường `model` cho cả 7 nhóm phụ tùng khác nhau (`7318`, `4016`, `8412`, `8413`, `8421`, `8481`, `8483`). |
| 55 | `ZK2G12K5ALA-06` | **B** | 3 | `8481` (2 dòng: Vòi, van và các thiết bị tương tự dùng cho đường ống, thân nồi hơi, bể chứa hoặc các lo…) [dòng 1087,2070]<br>`8414` (1 dòng: Bơm không khí hoặc bơm chân không, máy nén không khí hoặc chất khí khác và quạt; nắp ch…) [dòng 2979] | Cùng cụm tạo/điều khiển chân không khí nén; lệch ranh giới van (`8481`) vs bơm/bộ tạo chân không (`8414`). |

---

## 5. Quy tắc chấp nhận C4 bản 2 (`phienBan: 2`)

Từ phân tích 267 cặp mâu thuẫn và kiểm tra các khoá được chấp nhận ở bản 1 (phát hiện thêm các mã nhiễu như `DN25`, `SAMSUNG S SERIES`, `PRD SIÊU CAO`, `ZIN`, mã 2 ký tự `SC`, `HX`, `H1`, `H2`, `H3`, `G4`, và 11 chuỗi pháp nhân/địa danh lọt vào `bang` bản 1), C4 bản 2 áp dụng kiến trúc **2 tầng tách bạch**:

### Tầng 1 — Bảng tra tất định chính (`bang`)
1. **`hang_model` (Khoá ghép `HANG | MODEL`, ưu tiên 1):**
   - Ghép từ các dòng có cặp hãng–model rõ ràng (`1` hãng sạch `×` `1–5` model sạch, hoặc `1` model sạch `×` `1–3` hãng sạch; không nhân chéo các dòng liệt kê hàng loạt).
   - Chấp nhận model có độ dài chữ/số `≥ 2` (cứu được mã ngắn như `H3` khi có hãng đi kèm: `TENON | H3 → 8301`, đồng thời tách được `VN WEKOME | WTP-009 → 7007` và `SMC | ZK2G12K5ALA-06 → 8481` khỏi xung đột chéo hãng).
   - Ngưỡng: `soDong ≥ 2` và **thuần `100%`** một nhóm 4 số (`byHeading.size === 1`).
2. **`model` (Mã model đơn lẻ đủ đặc hiệu, ưu tiên 2):**
   - Đòi hỏi **`demChuSo(khoaChuan) ≥ 3`** (loại bỏ toàn bộ mã 2 ký tự như `A2`, `C2`, `F3`, `G6`, `G8`, `V5`, `SC`, `HX`, `H1`–`H3`, `G4`).
   - Chặn thông số kỹ thuật chuẩn (`DN\d+`, `PN\d+`, `PD\d+W?`, `IP\d{2}`, `QC\d.\d`, `USB*`, `HDMI`, `AC/DC*`), tên thiết bị tương thích (`IP17`, `NOTE 10`), và chuỗi mô tả (`ZIN`, `SERIES`, `SIÊU CAO`, ...).
   - Ngưỡng: `soDong ≥ 2` và **thuần `100%`** một nhóm 4 số.
3. **`hang` chuyên biệt ngưỡng cao (ưu tiên 3):**
   - Loại bỏ toàn bộ chuỗi mang hậu tố pháp nhân doanh nghiệp / đơn vị XNK (`laTenCongTyHoacDiaDanhHang()`), địa danh tỉnh–thành phố, và khoá ngắn `< 3` ký tự chữ/số.
   - Chỉ nhận vào `bang` khi thoả đồng thời: **`soDong ≥ 4`**, **thuần `100%`** một nhóm 4 số (`byHeading.size === 1`), và **không va chạm biến thể khoảng trắng** (gộp khoảng trắng/dấu chấm-gạch vẫn chỉ có 1 nhóm 4 số, chặn lỗi kiểu `MEAN WELL` vs `MEANWELL`).

### Tầng 2 — Tín hiệu phụ thứ cấp (`hangThamKhao`, KHÔNG nằm trong `bang`)
- Mọi khoá `hang` sạch (không phải pháp nhân/địa danh, `≥ 3` ký tự) chưa đạt ngưỡng chuyên biệt vào `bang` nhưng thoả:
  - `2 ≤ tongDong < 4` và thuần `100%` (`hang-nhat-quan-it-dong`), **HOẶC**
  - `tongDong ≥ 3` và nhóm chiếm đa số đạt độ tinh khiết `≥ 80%` và vượt nhóm nhì (`hang-da-so-uu-the`),
  được tách riêng vào mảng `hangThamKhao[]` với nhãn `chiGoiY: true`.
- `traC4()` chỉ trả `timThay: true` khi khớp `bang`; `thamKhao[]` được trả riêng để tham khảo và tuyệt đối không làm phát sinh khớp tất định sai.

---

## 6. Kết quả đo so sánh Bản 1 vs Bản 2

### 6.1. Toàn bộ kho mẫu `data/oz-gold-final.jsonl` (5.734 dòng)

| Chỉ số | C4 Bản 1 (`phienBan: 1`) | C4 Bản 2 (`phienBan: 2`) | Chênh lệch / Ghi nhận |
|---|---:|---:|---|
| Số dòng nguồn hợp lệ (còn trong `tax.json`) | 5.633 | 5.633 | Giữ nguyên quy ước `tapNut().ma8` |
| Số dòng có model/hãng hợp lệ | 3.354 | 3.060 | Đã lọc sạch `451` pháp nhân/địa danh, `44` thông số/mô tả, `76` model `< 3` ký tự |
| **Tổng số cặp trong `bang`** | **225** | **137** | `28` `hang_model` + `98` `model` + `11` `hang` chuyên biệt |
| — Trong đó `hang_model` | 0 | **28** | Khoá ghép mới tách nhiễu hãng/model |
| — Trong đó `model` | 108 | **98** | Loại `DN25`, 6 mã 2 ký tự, `SAMSUNG S SERIES`, `PRD SIÊU CAO`, `ZIN` |
| — Trong đó `hang` | 117 | **11** | Chỉ giữ 11 hãng chuyên biệt `≥ 4` dòng thuần 100%, 0 pháp nhân |
| **Số cặp tách sang `hangThamKhao`** | 0 | **98** | `87` hãng 2–3 dòng thuần + `11` hãng đa số `≥ 80%` |
| **Số dòng được `bang` phủ** | 459 (`13,69%` / `8,00%`) | **236** (`7,71%` / `4,12%`) | Giảm độ phủ ảo từ hãng yếu `soDong = 2` và pháp nhân |
| **Số cặp mâu thuẫn (`mauThuan`)** | 267 (`55` model + `212` hang) | **225** (`15` hang_model + `45` model + `165` hang) | Giảm `42` cặp nhờ lọc nhiễu pháp nhân/thông số/ngắn |
| **`maHetHieuLuc` (mã 10 số / hết hiệu lực)** | 99 cặp (30 mã) | **88** cặp (27 mã) | Cô lập sạch `8524.91.00.20`, `8539.39.90.90`, `4011.80.21.20`, `85414029` |
| **Vi phạm `lib/privacy-filter.js` (tên pháp nhân)** | Có hậu tố pháp nhân trong `bang/mauThuan` | **0** tên pháp nhân / PII | Chỉ còn 3 mã HS 10 số trong `maHetHieuLuc` |
| **Tính tất định 2 lần dựng (`sha256`)** | Trùng khớp 100% | Trùng khớp 100% (`e681d3f242d1…`) | Xáo dòng S-7 bất biến 100% |

### 6.2. Tập giữ riêng S-7 300 ca (`node scripts/dung-c4-model-hang.mjs --do-de-rieng`)

Phép đo dựng bảng sạch ca kín trong RAM (`loaiCaKin: true`, loại bỏ **607** dòng khỏi `5.734` dòng) và kiểm tra trên **300** ca `scripts/ca-do/de-rieng-300.jsonl`:

| Chỉ số trên S-7 (300 ca) | Bản 1 (`phienBan: 1`) | Bản 2 — Bảng chính (`bang`) | Bản 2 — Tín hiệu phụ (`thamKhao`, đo riêng) |
|---|---:|---:|---:|
| Số dòng holdout bị loại sạch | 607 | 607 | 607 |
| Số ca có ít nhất 1 khoá hợp lệ | 165 | 151 | — |
| Số ca được phủ | 6 (`2,00%`) | **1** (`0,33%`) | 7 (`2,33%`) |
| Số ca đoán đúng nhóm 4 số | 5 | **1** | 5 |
| Số ca đoán sai nhóm 4 số | 1 (`RONALD JACK`: `8301` vs `9106`) | **0** | 2 (`SAM`: `8452` vs `8451`; `RONALD JACK`: `8301` vs `9106`) |
| **Độ chính xác trên số ca được phủ** | **83,33%** | **100,00%** | **71,43%** |

**Kết luận kiểm chứng:** C4 bản 2 nâng độ chính xác bảng chính `bang` trên S-7 từ **`83,33%`** lên **`100,00%`** (**0** ca sai), đồng thời tách riêng nhóm tín hiệu phụ `hangThamKhao` (vốn chỉ đạt `71,43%` trên S-7) ra khỏi đường tra chính để tránh truyền sai lệch nếu sau này tích hợp vào tầng tìm ứng viên.
