# Phân tích 17 cụm mâu thuẫn chỉ mục đồng nghĩa C1 (`Lệch hẳn liên kho`)

> Báo cáo phân tích pháp lý & nguyên nhân gốc cho toàn bộ **17 cụm lệch hẳn liên kho** (`c1.mauThuan` trong [`lib/do-thi/dung-bang-canh.js`](../../lib/do-thi/dung-bang-canh.js)), đối chiếu từ danh sách tự động tại [`docs/do-thi/mau-thuan-dong-nghia.md`](./mau-thuan-dong-nghia.md).
>
> **Phạm vi:** Chỉ phân tích và đề xuất hướng giữ/bỏ/thu hẹp — **không** chỉnh sửa trực tiếp các kho đồng nghĩa trong đợt báo cáo này. Cụm nào không có chữ luật quyết định sẽ ghi rõ **`chưa đủ căn cứ`**, không suy đoán vượt văn bản pháp lý.

---

## 1. Phương pháp & Tổng hợp kết quả

### 1.1. Nguồn đối chiếu
- **Chỉ mục đồng nghĩa C1 (`KHO_C1`):** kiểm tra khóa/giá trị nguyên gốc (trước khi qua `khongDau()` ở [`lib/do-thi/tu-khoa.js`](../../lib/do-thi/tu-khoa.js)) trên cả 8 kho nguồn: `trade-synonyms.json`, `hs-aliases.json`, `vn-product-synonyms.json`, `synonyms.json`, `search.json`, `tu-vung/ten-khac-*.json`, `english-product-map.json`, `brand-product-map.json`.
- **Tờ khai OZ (TK) & Thông báo phân loại (TB-TCHQ):** tái lập số đếm khớp nguyên cụm không dấu trên 5.733 dòng `data/oz-gold-final.jsonl` và 4.897 thông báo `TB-TCHQ` trong `data/precedents.json` (chỉ báo cáo số lượng thống kê và số hiệu TB-TCHQ công khai, không trích thông tin tờ khai/khách hàng). Đồng thời kiểm tra dạng **có dấu** của cụm từ khớp để phát hiện va chạm đồng âm bỏ dấu và lỗi cắt cụm từ.
- **Văn bản pháp lý & chú giải công khai:** Biểu thuế hiện hành (`data/tax.json`), Chú giải Pháp lý Phần/Chương (`data/chu-giai-chuong.json`), Chú giải chi tiết nhóm & SEN (`data/chu-giai-heading.json`, `data/explanatory-notes.json`), Tuyển tập ý kiến phân loại WCO (`data/wco-op/opinions.json`), và thông báo phân loại `TB-TCHQ` (`data/precedents.json`).

### 1.2. Thống kê kết luận (17 cụm)

| Nhóm kết luận | Số cụm | Danh sách cụm |
|---|---:|---|
| **Có đích sai rõ ràng (giải quyết được bằng chữ luật / rà soát lỗi kho)** | **8** | `#5 bình thủy`, `#6 ray truot`, `#11 may in 3d`, `#12 chot cai`, `#13 goi do vong bi`, `#14 hat nhua pvc`, `#16 Copper wire` *(kèm phân nhánh cách điện 7408/8544)*, `#17 printed circuit board` |
| **Mơ hồ thật (các hướng đều có cơ sở pháp lý, cần dữ kiện phân biệt theo luật)** | **8** | `#1 giay` *(kèm rủi ro bỏ dấu)*, `#2 tu dien` *(va chạm 3 nghĩa khi bỏ dấu + thu hẹp 85439030)*, `#3 tham trai san`, `#7 dep quai ngang`, `#8 guong soi`, `#9 man hinh hmi`, `#10 robot công nghiệp`, `#15 quan jean nu` |
| **`Chưa đủ căn cứ` (không có chữ luật chốt đích cho cụm trần)** | **1** | `#4 thanh truot` |
| **Tổng cộng** | **17** | |

### 1.3. Ba lỗi hệ thống nổi bật lộ ra qua 17 cụm
1. **Va chạm đồng âm do bỏ dấu (`khongDau`)**: Cụm `"tu dien"` gộp chung **tụ điện** (`8532`), **tủ điện** (`8537`) và **từ điển** (`8543.70.30`); cụm `"giay"` va chạm **giày** (`64xx`) với **giấy** (`48xx`, `82xx`, `8443`…).
2. **Lỗi kỹ thuật trong trình nạp / trích kho C1**:
   - [`lib/do-thi/dung-bang-canh.js`](../../lib/do-thi/dung-bang-canh.js) nạp cả mục `"loai": "TRAI_NGHIA"` từ `data/tu-vung/ten-khac-*.json` (tổng 10 mục trong `ten-khac-8539.json` và `ten-khac-8714.json`), khiến `"chốt cài"` bị trỏ ngược vào `85395210` (*Loại đầu đèn ren xoáy*).
   - `data/synonyms.json` trích chuỗi trong ngoặc kép `“printed circuit board”` từ WCO Opinion `900659/1` vốn nói về **máy vẽ ảnh laser (`Laser photoplotter`)**, biến `9006` (*máy ảnh*) thành đích của PCB.
   - `data/english-product-map.json` kế thừa bắc cầu thiếu kiểm soát (`"copper wire"` → `"dây đồng"` → `hs-aliases["day dong"]` → `85168030` *điện trở đốt nóng*).
3. **Bẫy tiền lệ & n-gram cắt cụt ở `hs-aliases.json` và `TB-TCHQ`**: Cụm `"bình thủy"` trong `oz-gold-final.jsonl` và `TB-TCHQ` (`3926/TB-TCHQ`, `6872/TB-TCHQ`) thực chất là **`"bình thủy tinh"`** bị khớp tiền tố 2 chữ, khiến bộ lọc tự động `(a)` tưởng `9617` sai, trong khi theo luật **`9617`** mới là đích đúng của *bình thủy (chân không)*, còn `hs-aliases["binh thuy"] -> 70139900` bị cắt cụt từ `"bình thủy tinh"`. Tương tự, `may in 3d -> 84433290` và `hat nhua pvc -> 39253000` phản ánh mã khai báo cũ / sai mã sản phẩm đầu ra thay vì nguyên liệu đầu vào.

---

## 2. Bảng tổng hợp 17 cụm

| # | Cụm | Kho & đích xung đột | TK / TB (đích · toàn kho) | Nhóm kết luận | Đề xuất ngắn |
|---:|---|---|---:|---|---|
| 1 | `giay` | `6403` (`vn-product-synonyms`)<br>`6404` (`hs-aliases`) | 39 / 139 TK<br>0 / 167 TB | Mơ hồ thật (+ rủi ro bỏ dấu) | Giữ cả hai, phân biệt vật liệu mũ giày (`da` vs `dệt`); tách nghĩa `"giày"` vs `"giấy"`. |
| 2 | `tu dien` | `8532`, `8537` (`hs-aliases`)<br>`8543` (`ten-khac`) | 12 / 16 TK<br>4 / 26 TB | Mơ hồ thật (va chạm 3 nghĩa bỏ dấu) | Tách theo dấu: `"tụ điện"`→`8532`, `"tủ điện"`→`8537`, `"từ điển"` thu hẹp vào `85437030` (bỏ trỏ trần `85439030`). |
| 3 | `tham trai san` | `3918`, `5705` (`hs-aliases`)<br>`5703` (`vn-product-synonyms`) | 4 / 4 TK<br>0 / 0 TB | Mơ hồ thật | Giữ cả 3, phân biệt bề mặt plastic (`3918`) vs dệt tạo búi (`5703`) vs dệt không dệt/khác (`5705`). |
| 4 | `thanh truot` | `7326` (`hs-aliases`)<br>`8483` (`vn-product-synonyms`) | 3 / 3 TK<br>0 / 1 TB | **Chưa đủ căn cứ** | **Chưa đủ căn cứ**; xem xét bỏ/thu hẹp gán trần `8483` (vì `84.83` không định danh thanh trượt; phân nhánh `8482`/`8302`/`7326`/bộ phận máy). |
| 5 | `bình thủy` | `7013` (`hs-aliases`)<br>`9617` (`trade-synonyms`) | 2 / 2 TK<br>2 / 2 TB | Có đích sai rõ ràng | Giữ `trade-synonyms`→`9617`; sửa `hs-aliases` `"binh thuy"`→`"bình thủy tinh"` cho `7013` (bỏ `"binh thuy"` trần→`7013`). |
| 6 | `ray truot` | `7323` (`hs-aliases`)<br>`8302` (`vn-product-synonyms`) | 2 / 2 TK<br>1 / 1 TB | Có đích sai rõ ràng | Giữ `vn-product-synonyms`→`8302`; bỏ/thu hẹp `7323` (`73239310` nhà bếp) ở `hs-aliases`. |
| 7 | `dep quai ngang` | `6402` (`vn-product-synonyms`)<br>`6405` (`hs-aliases`) | 2 / 2 TK<br>0 / 0 TB | Mơ hồ thật | Giữ cả hai (cộng `6403`/`6404`), phân biệt theo vật liệu mũ/quai và đế ngoài (Chú giải 4 Ch.64). |
| 8 | `guong soi` | `3926` (`hs-aliases`)<br>`7009` (`vn-product-synonyms`) | 2 / 2 TK<br>0 / 0 TB | Mơ hồ thật | Giữ cả hai, phân biệt mặt gương thủy tinh kể cả khung nhựa (`7009`) vs mặt gương plastic (`3926`). |
| 9 | `man hinh hmi` | `8528` (`hs-aliases`)<br>`8537` (`vn-product-synonyms`) | 2 / 2 TK<br>0 / 0 TB | Mơ hồ thật | Giữ cả hai, phân biệt màn hình hiển thị thuần (`8528`) vs bảng điều khiển lập trình (`8537`, `103/TB-TCHQ`). |
| 10 | `robot công nghiệp` | `8428` (`trade-synonyms`)<br>`8479` (`hs-aliases`) | 2 / 2 TK<br>0 / 0 TB | Mơ hồ thật | Giữ cả hai, phân biệt robot chuyên nâng/xếp dỡ/AGV (`8428.70`) vs robot đa năng chưa chi tiết (`8479.50`). |
| 11 | `may in 3d` | `8443` (`hs-aliases`)<br>`8485` (`vn-product-synonyms`) | 1 / 3 TK<br>0 / 1 TB | Có đích sai rõ ràng | Giữ `vn-product-synonyms`→`8485` (bắt buộc theo Chú giải 10 Ch.84); bỏ `8443` (`84433290`) ở `hs-aliases`. |
| 12 | `chot cai` | `8308` (`hs-aliases`)<br>`8539` (`ten-khac`) | 1 / 1 TK<br>0 / 1 TB | Có đích sai rõ ràng | Giữ `8308` (bổ sung phân biệt `3926`/`8302`); bỏ `8539` (lỗi nạp `TRAI_NGHIA` từ `ten-khac-8539.json`). |
| 13 | `goi do vong bi` | `7325` (`hs-aliases`)<br>`8483` (`vn-product-synonyms`) | 1 / 1 TK<br>0 / 0 TB | Có đích sai rõ ràng | Giữ `vn-product-synonyms`→`8483`; bỏ `7325` (`73251090`) ở `hs-aliases`. |
| 14 | `hat nhua pvc` | `3904` (`vn-product-synonyms`)<br>`3925` (`hs-aliases`) | 1 / 1 TK<br>0 / 2 TB | Có đích sai rõ ràng | Giữ `vn-product-synonyms`→`3904`; bỏ `3925` (`39253000`) ở `hs-aliases`. |
| 15 | `quan jean nu` | `6104` (`hs-aliases`)<br>`6204` (`vn-product-synonyms`) | 1 / 1 TK<br>0 / 0 TB | Mơ hồ thật | Giữ cả hai, phân biệt vải dệt kim/móc (`6104`) vs vải dệt thoi/denim (`6204`). |
| 16 | `Copper wire` | `7408` (`synonyms`)<br>`8516`, `8544` (`english-product-map`) | 0 / 0 TK<br>0 / 0 TB | Có đích sai rõ ràng (+ phân nhánh cách điện) | Bỏ `8516` (lỗi bắc cầu qua `"day dong"`→`85168030`); giữ `7408` (dây đồng trần) & thu hẹp `8544` cho dây đã cách điện. |
| 17 | `printed circuit board` | `8534` (`english-product-map`)<br>`9006` (`synonyms`) | 0 / 0 TK<br>0 / 0 TB | Có đích sai rõ ràng | Giữ `english-product-map`→`8534`; bỏ `"printed circuit board"` ở `synonyms.json` dưới khóa `900659`. |

---

## 3. Phân tích chi tiết từng cụm (1–17)

### 1. Cụm `giay` (`6403` / `6404`)
- **Kho & đích:**
  - `data/vn-product-synonyms.json`: `"giày": ["6403", "dép", "ủng"]` → đích **`6403`**.
  - `data/hs-aliases.json`: `{"phrase": "giay", "hsCode": "64041990", "count": 2}` → đích **`6404`**.
  - Ghi nhận va chạm dấu: `vn-product-synonyms` dùng khóa có dấu `"giày"` nên không đụng các khóa `"giấy a4"`, `"giấy in"` (`4802`), nhưng `hs-aliases` lưu dạng không dấu `"giay"`, khi qua `khongDau()` sẽ đồng âm hoàn toàn giữa `"giày"` và `"giấy"`.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`39` TK** tại 2 đích (`6403`: **17** TK, 100% dạng `"giày"`; `6404`: **22** TK, 100% dạng `"giày"`) / **`139` TK** toàn kho khớp `"giay"` (ngoài 2 đích trên còn có `6402`: 22 TK `"giày"`, `6405`: 17 TK `"giày"`, `6406`: 7 TK `"giày"`/`"giầy"`, và các nhóm mang nghĩa `"giấy"` như `8208`: 7 TK `"giấy"`, `8443`: 7 TK `"giấy"`, `3926`: 4 TK `"giấy"`…).
  - TB-TCHQ: **`0` TB** tại `6403` và `6404` / **`167` TB** toàn kho khớp `"giay"` (phần lớn là `"giấy"` thuộc `4811` [17 TB], `3926` [14 TB], `8543` [12 TB], `3824` [11 TB], `4802` [10 TB], `4823` [8 TB]…).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`6403`**:
    - `tax.6403`: *"Giày, dép có đế ngoài bằng cao su, plastic, da thuộc hoặc da tổng hợp và mũ giày bằng da thuộc"*
    - `chu-giai-heading#6403`: *"Nhóm này bao gồm giày, dép có phần mũ (xem Chú giải tổng quát, Phần (D)) được làm bằng da thuộc và có đế ngoài (xem Chú giải tổng quát, Phần (C)) được làm bằng: (1) Cao su... (2) Plastic... (3) Vải dệt thoi hoặc các sản phẩm dệt khác có lớp ngoài bằng cao su hoặc plastic có thể nhìn thấy được bằng mắt thường... (4) Da thuộc... (5) Da tổng hợp..."*
  - Ủng hộ **`6404`**:
    - `tax.6404`: *"Giày, dép có đế ngoài bằng cao su, plastic, da thuộc hoặc da tổng hợp và mũ giày bằng vật liệu dệt"*
    - `chu-giai-heading#6404`: *"Nhóm này bao gồm giày, dép có phần mũ (xem Chú giải tổng quát, Phần (D)) được làm bằng vật liệu dệt và có đế ngoài (xem Chú giải tổng quát, Phần (C)) được làm bằng các loại vật liệu giống các vật liệu dùng làm đế của giày, dép thuộc nhóm 64.03 (xem Chú giải của nhóm đó)."*
  - Quy tắc phân biệt bắt buộc giữa hai bên (và các nhóm khác trong Chương 64):
    - `chu-giai-chuong#64` (Chú giải 4(a)–(b)): *"(a) vật liệu làm mũ giày được xếp theo loại vật liệu cấu thành có diện tích mặt ngoài lớn nhất, không tính đến các phụ kiện hoặc đồ phụ trợ... (b) vật liệu cấu thành của đế ngoài được tính là vật liệu có bề mặt rộng nhất trong việc tiếp xúc với đất..."*
    - `chu-giai-chuong#64` (Chú giải 3(a)–(b)): *"(a) thuật ngữ 'cao su' và 'plastic' kể cả vải dệt thoi hoặc các sản phẩm dệt khác có lớp ngoài bằng cao su hoặc plastic có thể nhìn thấy được bằng mắt thường... (b) thuật ngữ 'da thuộc' liên quan đến các mặt hàng thuộc các nhóm 41.07 và từ 41.12 đến 41.14."*
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Mơ hồ thật** về mặt cấu tạo vật liệu (và mở rộng thực tế sang cả `6402` mũ cao su/plastic, `6405` loại khác), đồng thời tiềm ẩn **va chạm bỏ dấu** `"giày"` vs `"giấy"`.
  - **Đề xuất:** `Mơ hồ thật — giữ cả hai hướng 6403 và 6404 (cùng lưu ý 6402, 6405), phân biệt bằng vật liệu cấu thành mũ giày có diện tích bề mặt ngoài lớn nhất (da thuộc → 6403; vật liệu dệt → 6404; cao su/plastic → 6402) theo Chú giải 4(a) Chương 64; đồng thời không gán đơn âm không dấu "giay" ở hs-aliases.json làm đích mặc định vì trùng âm với "giấy".`

---

### 2. Cụm `tu dien` (`8532` / `8537` / `8543`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "tu dien", "hsCode": "85322200", "count": 12, "alternatives": [{"hsCode": "85371099", "count": 2}]}` → trỏ **`8532`** (chính) và **`8537`** (phụ).
  - `data/tu-vung/ten-khac-8543.json`: mục `{"ma": "85439030", "kieu": "CONG_DUNG", "loai": "DONG_NGHIA", "cachDoc": {"vi": ["phiên dịch", "từ điển"]}}` → trỏ **`8543`**.
  - **Nguyên nhân gốc rễ:** **Va chạm đồng âm khi bỏ dấu (`khongDau`)** giữa **3 từ tiếng Việt khác nghĩa hoàn toàn**: `"tụ điện"` (`8532`), `"tủ điện"` (`8537`) và `"từ điển"` (`8543.70.30`).
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`12` TK** tại 3 đích (`8532`: **9** TK, 100% dạng `"tụ điện"`; `8537`: **3** TK, 100% dạng `"tủ điện"`; `8543`: **0** TK) / **`16` TK** toàn kho (ngoài đích có `8414`: 2 TK `"tủ điện"`, `8536`: 1 TK `"tủ điện"`, `8538`: 1 TK `"tủ điện"`).
  - TB-TCHQ: **`4` TB** tại 3 đích (`8532`: **0** TB; `8537`: **2** TB là `4978/TB-TCHQ` và `4040/TB-TCHQ` cùng mã `8537.10.19` — lưu ý cả 2 TB này khớp `"tu dien"` do liệt kê linh kiện `"tụ điện"` trên bảng mạch điều khiển *Control PCB Assembly*, không phải `"tủ điện"`; `8543`: **2** TB là `1127/TB-TCHQ` và `2392/TB-TCHQ` cùng mã `8543.70.30` cho máy đọc sách *"có chức năng từ điển"*) / **`26` TB** toàn kho.
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`8532` (`tụ điện`)**:
    - `tax.8532`: *"Tụ điện, loại có điện dung cố định, biến đổi hoặc điều chỉnh được (theo mức định trước) (+)."*
    - `chu-giai-heading#8532`: *"Về mặt nguyên lý, các tụ điện (hoặc bộ điện dung) bao gồm hai bề mặt dẫn, được cách ly bằng vật liệu cách điện (điện môi)... nhóm này bao gồm tất cả các tụ điện mà không xét đến kiểu tụ, phương pháp chế tạo, và với mọi mục đích sử dụng..."*
  - Ủng hộ **`8537` (`tủ điện`)**:
    - `tax.8537`: *"Bảng, panel, giá đỡ, bàn, tủ và các loại hộp và đế khác, được lắp với hai hay nhiều thiết bị thuộc nhóm 85.35 hoặc 85.36, dùng để điều khiển hoặc phân phối điện..."*
    - `chu-giai-heading#8537`: *"Chúng gồm một hệ thống các thiết bị thuộc hai nhóm nêu ở trên (ví dụ, các thiết bị đóng ngắt và cầu chì) được lắp ráp lại với nhau trên một bảng, panel, giá đỡ v.v… hoặc được gá trên tủ, bàn v.v.."*
  - Ủng hộ **`8543` (`chức năng từ điển`)**:
    - `tax.85437030`: *"- - Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển"* và `tax.85439030`: *"- - Của hàng hóa thuộc phân nhóm 8543.70.30"*.
    - `TB-TCHQ 1127/TB-TCHQ` & `2392/TB-TCHQ` (`8543.70.30`): máy đọc sách điện tử có chức năng từ điển.
- **Phân tích & Đề xuất giữ/bỏ:**
  - Cả 3 hướng đều có cơ sở pháp lý đúng cho **3 từ có dấu khác nhau**, nhưng ghép chung vào chỉ mục không dấu `"tu dien"` gây nhiễu chéo nặng. Ngoài ra, trong `data/tu-vung/ten-khac-8543.json`, cụm trần `"từ điển"` hiện gắn vào `85439030` (bộ phận) thay vì `85437030` (máy hoàn chỉnh có chức năng từ điển, và dễ nhầm sách từ điển nhóm `4901`).
  - **Đề xuất:** `Mơ hồ thật do va chạm đồng âm bỏ dấu — giữ cả 3 hướng nhưng bắt buộc phân biệt có dấu ở tầng tra C1: "tụ điện" → 8532 (hs-aliases); "tủ điện" → 8537 (hs-aliases); tại data/tu-vung/ten-khac-8543.json thu hẹp cụm trần "từ điển" (mã 85439030) thành cụm cụ thể như "chức năng từ điển" / "máy từ điển" trỏ về 85437030.`

---

### 3. Cụm `tham trai san` (`3918` / `5703` / `5705`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "tham trai san", "hsCode": "57050092", "count": 1, "alternatives": [{"hsCode": "39181019", "count": 1}, {"hsCode": "57050099", "count": 1}]}` → trỏ **`3918`** và **`5705`**.
  - `data/vn-product-synonyms.json`: `"thảm trải sàn": ["5703", "thảm"]` → trỏ **`5703`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`4` TK** tại các đích (`3918`: **2** TK `"thảm trải sàn"`; `5703`: **0** TK; `5705`: **2** TK `"thảm trải sàn"`) / **`4` TK** toàn kho.
  - TB-TCHQ: **`0` TB** khớp nguyên cụm `"tham trai san"` ở mọi đích (trong `data/precedents.json` có 7 TB thuộc `3918` và 9 TB thuộc `5705` dùng các cụm khác như *"thảm rối"*, *"thảm chùi chân"*, *"tấm trải sàn"*).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`3918`**:
    - `tax.3918`: *"Tấm trải sàn bằng plastic, có hoặc không tự dính, dạng cuộn hoặc dạng tấm rời để ghép; tấm phủ tường hoặc phủ trần bằng plastic, như đã nêu trong Chú giải 9 của Chương này."*
    - `chu-giai-chuong#39` (Chú giải 1 & 2(p)): *"Tuy nhiên, thuật ngữ này [plastic] không áp dụng đối với các vật liệu được coi là vật liệu dệt thuộc Phần XI."* và *"2. Chương này không bao gồm: ... (p) Các mặt hàng thuộc Phần XI (nguyên liệu dệt và các sản phẩm dệt)"*.
    - `chu-giai-heading#3918`: *"Phần đầu của nhóm này bao gồm plastic loại thường được sử dụng như các tấm trải sàn, ở dạng cuộn hoặc ở dạng tấm rời để ghép."*
  - Ủng hộ **`5703`** và **`5705`** (Chương 57):
    - `chu-giai-chuong#57` (Chú giải 1): *"1. Theo mục đích của Chương này, thuật ngữ 'thảm và các loại hàng dệt trải sàn khác' có nghĩa là các loại trải sàn trong đó vật liệu dệt được dùng làm bề mặt ngoài của sản phẩm khi sử dụng..."*
    - `tax.5703`: *"Thảm và các loại hàng dệt trải sàn khác (kể cả thảm cỏ), tạo búi, đã hoặc chưa hoàn thiện."*
    - `chu-giai-heading#5703`: *"Nhóm này bao gồm thảm may chần (nổi nhung) và các loại hàng dệt trải sàn khác may chần... Nhóm này không bao gồm các sản phẩm bằng plastic thuộc Chương 39."*
    - `tax.5705`: *"Các loại thảm khác và các loại hàng dệt trải sàn khác, đã hoặc chưa hoàn thiện."* (`5705.00.21`, `5705.00.92`: *"- - Tấm trải sàn không dệt, loại dùng cho xe có động cơ..."*).
    - `chu-giai-heading#5705`: *"Nhóm này bao gồm thảm và các loại hàng dệt trải sàn khác, trừ các sản phẩm được bao hàm bởi một nhóm cụ thể hơn của Chương này. Nhóm này bao gồm: (1) Các loại thảm nổi vòng liên kết... (2) Các loại thảm hàng chất liệu không dệt... (3) Các loại thảm làm bằng 'cách nhồi' ('flocking')... (4) Các loại thảm dệt kim."*
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Mơ hồ thật**: Cả `3918`, `5703` và `5705` đều hợp lệ tùy vật liệu bề mặt lộ ra khi sử dụng và công nghệ dệt. (Lưu ý `vn-product-synonyms.json` hiện chỉ trỏ một mã `5703` là hơi thiếu so với nhóm không dệt `5705` và tấm trải sàn nhựa `3918`).
  - **Đề xuất:** `Mơ hồ thật — giữ cả ba đích 3918, 5703, 5705, phân biệt bằng hai dữ kiện theo Chú giải 1 Chương 57 và Chú giải 2(p) Chương 39: (1) bề mặt sử dụng bằng plastic (→ 3918) hay vật liệu dệt (→ Chương 57); (2) nếu là vật liệu dệt thì là tạo búi/tufted (→ 5703) hay không dệt/nổi vòng liên kết/flocking/dệt kim (→ 5705).`

---

### 4. Cụm `thanh truot` (`7326` / `8483`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "thanh truot", "hsCode": "73269099", "count": 2}` → trỏ **`7326`**.
  - `data/vn-product-synonyms.json`: `"thanh trượt": ["8483"]` → trỏ **`8483`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`3` TK** tại `7326` (`"thanh trượt"`), **`0` TK** tại `8483` / **`3` TK** toàn kho.
  - TB-TCHQ: **`0` TB** tại `7326` và `8483` / **`1` TB** toàn kho (`2991/TCHQ-TXNK` → `8432.29.00`: *"thanh trượt bằng thép điều chỉnh độ dày lớp đất xới"* của máy xới đất cầm tay thuộc `84.32`).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Bên **`7326`**:
    - `tax.7326`: *"Các sản phẩm khác bằng sắt hoặc thép"*.
    - `chu-giai-heading#7326`: *"Nhóm này bao gồm tất cả các sản phẩm bằng sắt hoặc thép thu được bằng cách rèn hoặc dập... trừ các sản phẩm thuộc các nhóm trên của chương này hoặc được bao hàm bởi Chú giải 1 cho phần XV hoặc thuộc Chương 82 hoặc 83 hoặc được bao hàm cụ thể hơn ở nơi khác trong Danh mục... Nhóm này không bao gồm những vật rèn là những sản phẩm thuộc những nhóm khác của Danh mục (ví dụ những bộ phận rời có thể nhận dạng của máy móc hoặc các đồ dùng cơ khí)..."* — đây chỉ là nhóm tồn đọng cuối Chương 73, không định danh riêng `"thanh trượt"`.
  - Bên **`8483`**:
    - `tax.8483`: *"Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên; thân ổ và gối đỡ trục dùng ổ trượt; bánh răng và cụm bánh răng; vít bi hoặc vít đũa; hộp số và các cơ cấu điều tốc khác, kể cả bộ biến đổi mô men xoắn; bánh đà và ròng rọc, kể cả khối puli; ly hợp và khớp nối trục (kể cả khớp nối vạn năng)."*
    - Kiểm tra toàn văn `chu-giai-heading#8483` và `chu-giai-chuong#84`: **không có chữ luật nào** xếp chung `"thanh trượt"` (`slide rail` / `linear guide`) vào `84.83` (chú ý `84.83` là *gối đỡ trục dùng ổ trượt*, *vít bi/vít đũa*, *thanh răng*, chứ không phải ray/thanh trượt dẫn hướng tuyến tính).
    - Tham chiếu thêm các nhóm liên quan có nhắc từ khóa trong chú giải HS nhưng **chưa** có trong đích của cụm này: `chu-giai-heading#8482` mục (A) bao gồm *"cơ chế trượt với ổ bi của vòng bi... một đường dẫn hướng"*; `chu-giai-heading#8302` mục (F)(1) nhắc *"thanh chống và các thanh trượt"* dùng cho hòm, tủ, đồ nội thất/cửa; và `2991/TCHQ-TXNK` xếp thanh trượt máy xới đất vào `8432.29.00` (bộ phận máy nông nghiệp).
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Chưa đủ căn cứ**: Không có chữ luật hay TB-TCHQ nào khẳng định `"thanh trượt"` thuộc `8483`, cũng không có cơ sở chứng minh mọi `"thanh trượt"` đều là sản phẩm sắt/thép tồn đọng `7326`.
  - **Đề xuất:** **`Chưa đủ căn cứ`** để giữ hay chốt một đích duy nhất từ văn bản hiện có; cần rà soát lại lý do `vn-product-synonyms.json` gán trần `"thanh trượt": ["8483"]` (dễ nhầm sang truyền động quay `84.83` trong khi cơ cấu trượt dùng ổ bi nằm ở `84.82`, thanh trượt đồ nội thất nằm ở `83.02`, bộ phận máy chuyên dùng thuộc nhóm máy tương ứng, và phần còn lại bằng thép mới về `73.26`).

---

### 5. Cụm `bình thủy` (`7013` / `9617`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "binh thuy", "hsCode": "70139900", "count": 2}` → trỏ **`7013`**.
  - `data/trade-synonyms.json`: mục `binh-giu-nhiet-chan-khong`, `terms: [..., "bình thủy", ...]`, `candidates`: `96170010` (*"Bình/phích có lớp CHÂN KHÔNG giữa hai vách, còn nguyên vỏ, hoàn chỉnh"*) và `96170020` (*"Bộ phận rời của bình chân không, trừ ruột thủy tinh"*) → trỏ **`9617`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`2` TK** tại `7013` (kiểm tra cho thấy **2/2** TK đều khớp tiền tố của cụm `"bình thủy tinh"`!), **`0` TK** tại `9617` / **`2` TK** toàn kho.
  - TB-TCHQ: **`2` TB** tại `7013` (`3926/TB-TCHQ` → `7013.37.00`: *"1 bình thủy tinh dung tích 1800ml"*; `6872/TB-TCHQ` → `7013.99.00`: *"Bình thủy tinh (dạng rỗng dùng để đựng nước)..."`), **`0` TB** tại `9617` / **`2` TB** toàn kho.
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`9617`** (cho `"bình thủy"` đúng nghĩa tiếng Việt = phích nước giữ nhiệt chân không):
    - `tax.9617`: *"Phích chân không và các loại bình chân không khác, hoàn chỉnh; bộ phận của chúng trừ ruột thủy tinh."*
    - `chu-giai-heading#9617`: *"Nhóm này bao gồm: (1) Các phích chân không và các bình chân không tương tự khác, với điều kiện chúng hoàn chỉnh. Nhóm này bao gồm các bình chân không, bình có tay cầm, lọ ... được thiết kế để giữ các chất lỏng, các đồ ăn hoặc các sản phẩm khác ở nhiệt độ tương đối ổn định trong một thời gian hợp lý. Các mặt hàng thường này gồm một bình có hai lớp vách ngăn (bên trong), thường bằng thủy tinh, với lớp chân không ở giữa hai vách ngăn đó, phía ngoài có một lớp vỏ bảo vệ bằng kim loại, bằng plastic, hoặc vật liệu khác..."*
  - Ủng hộ **`7013`** (chỉ cho `"bình thủy tinh"` thông thường **không** có cách nhiệt chân không) và **loại trừ bình chân không khỏi `7013`**:
    - `tax.7013`: *"Bộ đồ ăn, đồ nhà bếp, đồ vệ sinh, đồ dùng văn phòng, đồ trang trí nội thất hoặc đồ dùng cho các mục đích tương tự bằng thủy tinh (trừ các sản phẩm thuộc nhóm 70.10 hoặc 70.18)"*.
    - `chu-giai-chuong#70` (Chú giải 1(ij)): *"1. Chương này không bao gồm : ... (ij) Khuy, bình chân không, bình xịt dầu thơm hoặc các bình xịt tương tự hoặc các sản phẩm khác thuộc Chương 96."*
    - `chu-giai-heading#7013`: *"Nhóm này không bao gồm: ... (h) Phích chân không và các loại bình chân không khác thuộc nhóm 96.17."*
    - `TB-TCHQ 3926/TB-TCHQ` (`7013.37.00`) & `6872/TB-TCHQ` (`7013.99.00`): đều là **bình thủy tinh** đựng nước thường, không phải bình chân không.
  - Lưu ý thêm: `"bình thủy điện"` (water dispenser có bộ phận đun nóng dùng điện) thuộc `8516.10.11` (`tax.85161011`, `SEN 8516.10.11`), còn ruột thủy tinh rời của phích chân không thuộc `7020` (`chu-giai-heading#9617`).
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đảo ngược kết luận phân loại máy `(a)` của `mau-thuan-dong-nghia.md`:** Bộ lọc cơ học gắn nhãn `(a) nghi đích sai ở kho trade-synonyms` **chỉ do bẫy tiền tố n-gram** (`"bình thủy"` khớp nhầm vào 2 TK và 2 TB-TCHQ của `"bình thủy tinh"` ở `7013`!). Theo chữ luật (`chu-giai-chuong#70` Chú giải 1(ij), `chu-giai-heading#7013` loại trừ `(h)`, `chu-giai-heading#9617`), `"bình thủy"` (phích giữ nhiệt chân không) thuộc **`9617`** là **ĐÚNG**; còn `hs-aliases["binh thuy"] -> 70139900` bị cắt cụt từ `"bình thủy tinh"`.
  - **Đề xuất:** `Giữ trade-synonyms/9617 (bình/phích chân không); Bỏ đích "binh thuy" → 7013 trong data/hs-aliases.json (hoặc đổi khóa thành "binh thuy tinh" → 7013 để không va chạm với "bình thủy").`

---

### 6. Cụm `ray truot` (`7323` / `8302`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "ray truot", "hsCode": "73239310", "count": 1}` → trỏ **`7323`**.
  - `data/vn-product-synonyms.json`: `"ray trượt": ["8302"]` → trỏ **`8302`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`2` TK** tại `7323` (`"ray trượt"`), **`0` TK** tại `8302` / **`2` TK** toàn kho.
  - TB-TCHQ: **`0` TB** tại `7323`; **`1` TB** tại `8302` (`7082/TB-TCHQ` → `8302.42.90`: *"Thanh truyền con lăn nhựa... gồm thanh thép hình có gắn con lăn bằng nhựa chạy dọc... dùng làm ray trượt cho bàn văn phòng, giường thông minh..."*).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`8302`**:
    - `tax.8302`: *"Giá, khung, phụ kiện và các sản phẩm tương tự bằng kim loại cơ bản dùng cho đồ nội thất, cho cửa ra vào, cầu thang, cửa sổ, mảnh che, than xe (coachwork), yên cương, rương, hòm hoặc các loại tương tự..."* (`8302.41`: dùng cho xây dựng; `8302.42`: dùng cho đồ nội thất).
    - `chu-giai-heading#8302`: mục (D)(3) nêu *"Các loại khung cửa trượt theo rãnh của các loại cửa kính trong các cửa hiệu, nhà để xe... (ví dụ: các thiết bị để làm rãnh trượt, làm bánh xe và con lăn)"*; mục (E) bao gồm phụ kiện đồ nội thất; mục (F)(1) nêu *"thanh chống và các thanh trượt"*.
    - `TB-TCHQ 7082/TB-TCHQ` (`8302.42.90`): xác nhận ray trượt cho bàn văn phòng, giường thuộc `8302.42.90`.
  - Bên **`7323`** (bị loại trừ nếu là phụ kiện `83.02`):
    - `tax.7323`: *"Bộ đồ ăn, đồ nhà bếp hoặc các loại đồ gia dụng khác và các bộ phận của chúng, bằng sắt hoặc thép..."* (`7323.93.10`: `"- - - Đồ dùng nhà bếp"` bằng thép không gỉ).
    - `chu-giai-chuong#73.phan` (Chú giải 2 Phần XV) & `chu-giai-chuong#83` (Chú giải 1): *"2. Trong Danh mục này, khái niệm 'các bộ phận có công dụng chung' có nghĩa: ... (c) Sản phẩm thuộc các nhóm 83.01, 83.02, 83.08, 83.10... Theo nội dung trên và theo Chú giải 1 của Chương 83, các sản phẩm thuộc Chương 82 hoặc 83 được loại trừ khỏi các Chương từ Chương 72 đến Chương 76..."*
    - Lưu ý ranh giới thực tế trong `data/precedents.json`: `5222/TCHQ-TXNK` và `6523/TCHQ-TXNK` chỉ phân loại **khung giá để bát đĩa hoàn chỉnh** bằng thép/inox lắp vào tủ bếp vào `73.23` (vì `chu-giai-heading#7323` liệt kê *"giá đựng bát đĩa"*), không phân loại bản thân `"ray trượt"` vào `73.23`.
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đích `7323` (`73239310`) sai đối với bản thân `"ray trượt"`.** Ray trượt rời bằng kim loại cơ bản dùng cho tủ, ngăn kéo, cửa thuộc `83.02` (và bị loại trừ khỏi Chương 73 theo Chú giải 2 Phần XV). Đích `73239310` trong `hs-aliases.json` phát sinh từ dữ liệu khai ray trượt gắn kèm/phục vụ giá bát nhà bếp. (Ngoài ra lưu ý riêng: ray trượt ổ bi công nghiệp dùng cho máy thuộc `84.82`).
  - **Đề xuất:** `Giữ vn-product-synonyms/8302 cho "ray trượt"; Bỏ đích 7323 (73239310) khỏi "ray truot" ở data/hs-aliases.json.`

---

### 7. Cụm `dep quai ngang` (`6402` / `6405`)
- **Kho & đích:**
  - `data/vn-product-synonyms.json`: `"dép quai ngang": ["6402", "dép"]` → trỏ **`6402`**.
  - `data/hs-aliases.json`: `{"phrase": "dep quai ngang", "hsCode": "64051000", "count": 3}` → trỏ **`6405`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`2` TK** tại `6405` (`"dép quai ngang"`), **`0` TK** tại `6402` / **`2` TK** toàn kho.
  - TB-TCHQ: **`0` TB** toàn kho.
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`6402`** (khi đế ngoài và mũ/quai bằng cao su hoặc plastic):
    - `tax.6402`: *"Các loại giày, dép khác có đế ngoài và mũ giày bằng cao su hoặc plastic"*.
    - `chu-giai-heading#6402`: *"Nhóm này bao gồm giày, dép có đế ngoài và mũ giày bằng cao su hoặc plastic, loại trừ các loại giày, dép thuộc nhóm 64.01... (d) Sandal có đai vòng qua mu bàn chân..."*
  - Ủng hộ **`6405`** (chỉ khi tổ hợp vật liệu không thuộc `6401–6404`):
    - `tax.6405`: *"Giày, dép khác"* (`6405.10.00`: `"- Có mũ giày bằng da thuộc hoặc da tổng hợp"`; `6405.20.00`: `"- Có mũ giày bằng vật liệu dệt"`; `6405.90.00`: `"- Loại khác"`).
    - `chu-giai-heading#6405`: *"Nhóm này bao gồm các loại giày, dép cụ thể như: (1) Giày, dép, có đế ngoài bằng cao su hoặc plastic, và phần mũ được làm bằng các vật liệu trừ cao su, plastic, da thuộc hoặc vật liệu dệt; (2) Giày, dép có đế ngoài làm bằng da thuộc hoặc da tổng hợp, và có phần mũ được làm bằng các vật liệu trừ da thuộc hoặc vật liệu dệt; (3) Giày, dép có đế ngoài làm bằng gỗ, lie, dây xe hoặc dây thừng, bìa giấy, da lông, vải dệt, nỉ (phớt), sản phẩm không dệt, vải sơn, sợi cọ, rơm, xơ mướp,.v.v. Phần mũ giày của các loại giày, dép này có thể được làm bằng bất cứ vật liệu gì."*
  - Tiêu chí phân định chung của Chương 64 (`chu-giai-chuong#64`, Phần (D) & Chú giải 4):
    - *"Kích cỡ của mũ giày thay đổi tùy theo kiểu cách của từng loại giày dép... cho tới những loại đơn giản chỉ gồm có đai hoặc dây da (ví dụ như dép sandal)."*
    - Chú giải 4(a)–(b): phân loại theo vật liệu có diện tích bề mặt ngoài lớn nhất của **mũ/quai dép** và vật liệu tiếp xúc đất rộng nhất của **đế ngoài** (vì vậy nếu quai bằng da thuộc + đế cao su/plastic thì vào **`6403`**, quai bằng vật liệu dệt + đế cao su/plastic thì vào **`6404`**, quai bằng cao su/plastic + đế cao su/plastic vào **`6402`**, chỉ tổ hợp ngoài `6401–6404` — ví dụ mũ da tổng hợp mà `6403` không nhận hoặc đế gỗ/cói/vải — mới vào **`6405`**).
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Mơ hồ thật**: Cụm `"dép quai ngang"` chỉ mô tả hình dáng, không chứa dữ kiện vật liệu quai và đế.
  - **Đề xuất:** `Mơ hồ thật — giữ cả hai bên 6402 và 6405 (và mở rộng cân nhắc 6403/6404 khi quai bằng da thuộc hoặc dệt), phân biệt bằng dữ kiện bắt buộc theo Chú giải 4 Chương 64: chất liệu quai/mũ dép và chất liệu đế ngoài.`

---

### 8. Cụm `guong soi` (`3926` / `7009`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "guong soi", "hsCode": "39269099", "count": 2}` → trỏ **`3926`**.
  - `data/vn-product-synonyms.json`: `"gương soi": ["7009", "gương"]` → trỏ **`7009`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`2` TK** (`3926`: **1** TK `"gương soi"`; `7009`: **1** TK `"gương soi"`) / **`2` TK** toàn kho.
  - TB-TCHQ: **`0` TB** khớp `"guong soi"` (trong kho có 12 TB ở `7009` cho *"gương thủy tinh"* / *"kính gương"*).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`7009`** (gương có bề mặt phản chiếu bằng **thủy tinh**, **kể cả có khung/vỏ bằng plastic**):
    - `tax.7009`: *"Gương thủy tinh, có hoặc không có khung, kể cả gương chiếu hậu"*.
    - `chu-giai-heading#7009`: *"Thuật ngữ 'gương kính' áp dụng cho loại kính mà một mặt của nó đã được phủ kim loại (thường là bạc, đôi khi là platin hoặc nhôm) để tạo một sự phản chiếu rõ ràng và sáng loáng. Nhóm này bao gồm gương ở dạng tấm... gương nhà vệ sinh (kể cả gương cầm tay hoặc gương treo), gương bỏ túi (có hoặc không có vỏ bảo vệ)... Tất cả các loại gương này có thể được đệm lót (bằng cáctông, vải sợi, ...) hoặc được đóng khung (bằng kim loại, gỗ, plastic ...,)"*.
  - Ủng hộ **`3926`** (chỉ khi bề mặt phản chiếu làm bằng **plastic / mica / acrylic**, không phải thủy tinh):
    - `tax.3926`: *"Các sản phẩm khác bằng plastic và các sản phẩm bằng các vật liệu khác của các nhóm từ 39.01 đến 39.14."*
    - `chu-giai-chuong#39` (Chú giải 1): định nghĩa plastic là nguyên liệu thuộc `39.01–39.14` (không gồm thủy tinh Chương 70); ngược lại nhóm `70.09` chỉ bao phủ *gương thủy tinh* (`Glass mirrors`). (Ngoài ra gương bằng kim loại cơ bản thuộc `83.06` theo `chu-giai-heading#8306`).
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Mơ hồ thật theo vật liệu mặt gương**, kèm lưu ý rất dễ nhầm: gương thủy tinh lắp khung/vỏ nhựa vẫn phải vào **`7009`** theo nguyên văn `chu-giai-heading#7009`, chỉ gương dùng tấm nhựa/acrylic phản quang (hoặc khung nhựa rỗng chưa gắn gương thủy tinh) mới thuộc **`3926`**.
  - **Đề xuất:** `Mơ hồ thật — giữ cả 7009 và 3926, phân biệt bằng vật liệu bề mặt gương: mặt gương bằng thủy tinh tráng kim loại (dù có khung/vỏ bọc bằng plastic) → 7009 (chu-giai-heading#7009); mặt gương làm từ plastic/acrylic/mica → 3926 (tax.3926).`

---

### 9. Cụm `man hinh hmi` (`8528` / `8537`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "man hinh hmi", "hsCode": "85285910", "count": 2}` → trỏ **`8528`**.
  - `data/vn-product-synonyms.json`: `"màn hình hmi": ["8537", "bảng điều khiển"]` → trỏ **`8537`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`2` TK** tại `8528` (`"màn hình hmi"`), **`0` TK** tại `8537` / **`2` TK** toàn kho. *(Tham chiếu thêm: cụm `"hmi"` đơn lẻ có 9 TK: 5 TK ở `8528`, 4 TK + 1 TB ở `8537`).*
  - TB-TCHQ: **`0` TB** khớp nguyên cụm liền `"man hinh hmi"`, nhưng có **2 TB-TCHQ trực tiếp về màn hình điều khiển HMI / cảm ứng điều khiển** thuộc `8537`:
    - `TB-TCHQ 103/TB-TCHQ` → `8537.10.12`: *"Màn hình điều khiển cảm ứng Siemens SIMATIC HMI KTP 1200 Basic, là thiết bị điều khiển có trang bị bộ xử lý lập trình, dùng để theo dõi, giám sát và điều khiển hệ thống tự động hóa trong công nghiệp."*
    - `TB-TCHQ 6966/TCHQ-TXNK` → `8537.10`: *"Màn hình cảm ứng điều khiển (controller touch screen) 5,7 inch... gồm màn hình LCD, board mạch, cáp nguồn, khung kim loại, điện áp dưới 1000V; dùng trong bảng điều khiển của cánh tay robot..."*
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`8537`** (bảng/thiết bị điều khiển có lắp bộ xử lý lập trình hoặc linh kiện điều khiển điện):
    - `tax.8537` & `tax.85371012`: *"Bảng, panel, giá đỡ, bàn, tủ và các loại hộp và đế khác, được lắp với hai hay nhiều thiết bị thuộc nhóm 85.35 hoặc 85.36, dùng để điều khiển hoặc phân phối điện..."*; `8537.10.12`: *"- - - Bảng điều khiển có trang bị bộ xử lý lập trình (SEN)"*.
    - `chu-giai-heading#8537` (`SEN 8537.10.12`): *"Các bảng điều khiển này được sử dụng cho các bộ điều khiển cơ điện tử tự động, như bộ điều khiển máy trong các dây chuyền lắp ráp của nhà máy... Các chương trình để điều khiển sự vận hành máy móc thường được lưu trữ trong các bộ nhớ được duy trì bằng ắc qui hoặc bộ nhớ không xóa."*
    - `TB-TCHQ 103/TB-TCHQ` (`8537.10.12`) & `6966/TCHQ-TXNK` (`8537.10`).
  - Ủng hộ **`8528`** (màn hình hiển thị thuần túy, không có chức năng/mạch điều khiển lập trình):
    - `tax.8528`: *"Màn hình và máy chiếu, không gắn với thiết bị thu dùng trong truyền hình..."* (`8528.52.00`: kết nối trực tiếp với ADP `84.71`; `8528.59`: loại khác).
    - `chu-giai-heading#8528` (Phần A & B): bao gồm màn hình chỉ tiếp nhận tín hiệu hình ảnh từ ADP (`84.71`) hoặc nguồn video khác để hiển thị. *(Lưu ý phụ: nếu chỉ là tấm mô-đun màn hình dẹt chưa thành phẩm có cảm ứng thì xét `8524` theo Chú giải 7 Chương 85, hoặc màn cảm ứng thuần đóng vai trò thiết bị nhập tọa độ X-Y cho máy tính `84.71` thì xét `8471.60.40`).*
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Mơ hồ thật** dựa trên cấu tạo phần cứng bên trong thiết bị gắn mác `"màn hình HMI"`: thiết bị HMI công nghiệp hoàn chỉnh tích hợp bộ xử lý lập trình/board mạch điều khiển truyền thông PLC để giám sát & điều khiển máy thuộc **`8537`** (có `103/TB-TCHQ` trực tiếp cho dòng SIMATIC HMI); còn màn hình hiển thị công nghiệp thuần túy chỉ nhận tín hiệu xuất hình thuộc **`8528`**.
  - **Đề xuất:** `Mơ hồ thật — giữ cả 8537 và 8528, phân biệt bằng cấu tạo điều khiển: có trang bị bộ xử lý lập trình / mạch điều khiển điện áp ≤ 1.000V dùng cho tự động hóa máy móc (→ 8537.10.12 / 8537.10.19 theo SEN 8537.10.12 & 103/TB-TCHQ) hay chỉ là màn hình hiển thị tín hiệu video/dữ liệu thuần túy (→ 8528).`

---

### 10. Cụm `robot công nghiệp` (`8428` / `8479`)
- **Kho & đích:**
  - `data/trade-synonyms.json`: mục `robot-cong-nghiep-8428`, `terms: [..., "robot công nghiệp", ...]`, `candidates`: `[{"hs": "84287000", "whenVi": "- Rô bốt công nghiệp — mã 8428.70.00"}]` → trỏ **`8428`**.
  - `data/hs-aliases.json`: `{"phrase": "robot cong nghiep", "hsCode": "84795000", "count": 2}` → trỏ **`8479`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`2` TK** tại `8479` (`"robot công nghiệp"`), **`0` TK** tại `8428` / **`2` TK** toàn kho.
  - TB-TCHQ: **`0` TB** khớp nguyên cụm `"robot cong nghiep"`, nhưng có **`1` TB xác nhận mã mới `8428.70.00`**: `TB-TCHQ 1538/TB-TCHQ` (*"Robot tự hành AGV... băng tải gắn trên xe tự động nhận/trả hàng... thuộc nhóm 84.28, mã số 8428.70.00 '- Rô bốt công nghiệp'"*).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`8428`** (`8428.70.00` — phân nhóm mới của HS 2022):
    - `tax.8428` & `tax.84287000`: *"Máy nâng hạ, giữ, xếp hoặc dỡ hàng khác (ví dụ, thang máy (lift), thang cuốn, băng tải, thùng cáp treo)."* → `8428.70.00`: *"- Rô bốt công nghiệp"*.
    - `chu-giai-chuong#84` (Chú giải 8): *"Theo yêu cầu của phân loại, máy móc sử dụng cho hai mục đích trở lên được phân loại theo mục đích sử dụng chính... Theo Chú giải 2 của Chương này và Chú giải 3 của Phần XVI, loại máy mà công dụng chính của nó không được mô tả trong bất kỳ nhóm nào hoặc không có công dụng nào là chủ yếu, nếu nội dung nhóm không có yêu cầu khác, thì được phân loại vào nhóm 84.79."*
    - `TB-TCHQ 1538/TB-TCHQ` (`8428.70.00`): kết luận AGV xếp dỡ hàng thuộc `8428.70.00` (không phải `8479.50`).
  - Ủng hộ **`8479`** (`8479.50.00`):
    - `tax.8479` & `tax.84795000`: *"Máy và thiết bị cơ khí có chức năng riêng biệt, chưa được chi tiết hoặc ghi ở nơi khác thuộc Chương này."* → `8479.50.00`: *"- Rô bốt công nghiệp, chưa được chi tiết hoặc ghi ở nơi khác"*.
    - `chu-giai-heading#8479` (mục (I)(7)): *"Nhóm này chỉ bao gồm những rô bốt công nghiệp có khả năng thực hiện nhiều chức năng đơn giản bằng việc sử dụng những dụng cụ khác nhau. Tuy nhiên, nhóm này không bao gồm những rô bốt công nghiệp được thiết kế đặc biệt để thực hiện một chức năng cụ thể; những rô bốt công nghiệp đó được phân loại vào trong nhóm bao gồm chức năng của chúng (ví dụ, nhóm 84.24, 84.28 hoặc 85.15)."*
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Mơ hồ thật** hoàn toàn hợp lệ trong HS 2022 vì cả `8428.70.00` và `8479.50.00` đều có tên dòng thuế *"Rô bốt công nghiệp"*. Tuy nhiên, `trade-synonyms.json` mục `robot-cong-nghiep-8428` ghi `whenVi: "- Rô bốt công nghiệp — mã 8428.70.00"` chưa nêu điều kiện chức năng nâng/hạ/xếp/dỡ của nhóm `84.28`, dễ gây kéo nhầm cả robot đa năng/robot lắp ráp vào `8428.70.00`.
  - **Đề xuất:** `Mơ hồ thật — giữ cả 8428 (bổ sung điều kiện chuyên nâng hạ, giữ, xếp, dỡ hàng hóa vào trade-synonyms) và 8479, phân biệt bằng chức năng thiết kế theo chu-giai-heading#8479 mục (I)(7) và Chú giải 8 Chương 84: robot chuyên xử lý/nâng/xếp/dỡ vật liệu (như AGV, palletizer) → 8428.70.00 (1538/TB-TCHQ); robot đa năng chưa chi tiết thực hiện nhiều thao tác bằng các đầu công cụ khác nhau → 8479.50.00 (còn robot chuyên hàn → 85.15, chuyên phun sơn → 84.24).`

---

### 11. Cụm `may in 3d` (`8443` / `8485`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "may in 3d", "hsCode": "84433290", "count": 4}` → trỏ **`8443`**.
  - `data/vn-product-synonyms.json`: `"máy in 3d": ["8485", "máy sản xuất bồi đắp", "lắng đọng plastic"]` → trỏ **`8485`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`1` TK** tại `8443` (`"máy in 3d"`), **`0` TK** tại `8485` / **`3` TK** toàn kho (ngoài đích có `3926`: 1 TK, `8537`: 1 TK).
  - TB-TCHQ: **`0` TB** tại `8443` và `8485` / **`1` TB** toàn kho (`2538/TB-TCHQ` → `8463.90.10`, máy in 3D kim loại bằng tia laser — ban hành theo biểu thuế cũ trước HS 2022).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`8485`** (bắt buộc theo HS 2022 hiện hành):
    - `tax.8485`: *"84.85 Máy móc sử dụng công nghệ sản xuất bồi đắp."* (`Machines for additive manufacturing`, gồm `8485.10` kim loại, `8485.20` plastic/cao su, `8485.30` gốm/thủy tinh/thạch cao/xi măng, `8485.80` loại khác, `8485.90` bộ phận).
    - `chu-giai-chuong#84` (Chú giải 10): *"10. Theo mục đích của nhóm 84.85, khái niệm 'công nghệ sản xuất bồi đắp' (còn được gọi là công nghệ in 3D) có nghĩa là sự hình thành các vật thể hữu hình, dựa trên mô hình kỹ thuật số, bằng cách đắp chồng và tạo lớp liên tiếp, và hợp nhất (consolidation) và đóng rắn (solidification), từ vật liệu (ví dụ, kim loại, nhựa hoặc gốm). Theo Chú giải 1 Phần XVI và Chú giải 1 Chương 84, các máy đáp ứng mô tả của nhóm 84.85 được phân loại trong nhóm này và không phân loại vào nhóm khác của Danh mục."*
    - `chu-giai-heading#8485`: *"Nhóm này bao gồm các loại máy sử dụng công nghệ sản xuất bồi đắp (còn được gọi là in 3D)..."* (mô tả đầy đủ 7 công nghệ in 3D).
  - Loại trừ khỏi **`8443`**:
    - `tax.8443` & `chu-giai-heading#8443`: nhóm `84.43` chỉ bao gồm máy in văn bản/hình ảnh lên ấn phẩm (*"thiết bị in chữ, ký tự hoặc hình ảnh, để in các ấn phẩm"*), máy copy, máy fax.
    - Chú giải 10 Chương 84 loại trừ dứt khoát mọi máy in 3D đáp ứng mô tả `84.85` khỏi các nhóm khác của Danh mục (kể cả `84.43` hay mã cũ `84.63` trước HS 2022).
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đích `8443` (`84433290`) sai / lỗi thời theo HS 2022.** Trước năm 2022 khi chưa có nhóm `84.85`, tờ khai thường áp nhầm máy in 3D vào `8443.32.90` (*máy in khác*) hoặc `8477`/`8479`/`8463`. Từ biểu thuế hiện hành (`TT 31/2022/TT-BTC`), Chú giải 10 Chương 84 đã chỉ định duy nhất **`84.85`** cho *"công nghệ in 3D"*.
  - **Đề xuất:** `Giữ vn-product-synonyms/8485; Bỏ đích 8443 (84433290) cho "may in 3d" ở data/hs-aliases.json.`

---

### 12. Cụm `chot cai` (`8308` / `8539`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "chot cai", "hsCode": "83081000", "count": 2}` → trỏ **`8308`**.
  - `data/tu-vung/ten-khac-8539.json`: mục `{"ma": "85395210", "kieu": "TEN_LOAI", "giaTri": "đầu đèn ren xoáy", "loai": "TRAI_NGHIA", "cachDoc": {"vi": ["chốt cài", "loại hai chân"]}}` → trỏ **`8539`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`1` TK** tại `8308` (`"chốt cài"`), **`0` TK** tại `8539` / **`1` TK** toàn kho.
  - TB-TCHQ: **`0` TB** tại `8308` và `8539` / **`1` TB** toàn kho (`101/TB-TCHQ` → `3926.90.99`: *"Chốt cài nhựa MEC00001913..."* dùng cho cốp xe máy điện). *(Tham chiếu thêm: `752/TB-TCHQ` → `8539.50.00` là bóng đèn LED "đui cài / đuôi ngạnh", không gọi là "chốt cài").*
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Lật tẩy đích **`8539` (SAI 100%)**:
    - `tax.85395210`: `"- - - Loại đầu đèn ren xoáy"` (`Equipped with screw bases`).
    - `chu-giai-heading#8539`: *"và đầu đèn (đuôi đèn) (ví dụ, đuôi xoáy, chốt cài hoặc loại hai chân) để gắn vào đui đèn."* — ở đây *"chốt cài"* chỉ là **tính từ mô tả kiểu chân bóng đèn** (đối lập với đuôi ren xoáy `8539.52.10`!). Chính `data/tu-vung/ten-khac-8539.json` đã gắn nhãn mục này là **`"loai": "TRAI_NGHIA"`** so với `85395210`, nhưng `lib/do-thi/dung-bang-canh.js` (dòng 382) đã đọc nhầm mọi mục `muc[]` bất kể `loai === "TRAI_NGHIA"`, biến từ trái nghĩa thành từ đồng nghĩa trỏ thẳng vào mã ngược `85395210`!
  - Ủng hộ **`8308`** (đối với khóa có chốt bằng kim loại cơ bản dùng cho may mặc/giày dép/đồ da):
    - `tax.8308` & `tax.83081000`: *"Móc cào, khóa móc cài, khóa thắt lưng, cài thắt lưng, khóa có chốt, mắt cài khóa, khoen và các loại tương tự, bằng kim loại cơ bản, dùng cho quần áo hoặc phụ kiện quần áo, giày dép, trang sức..."*; `8308.10.00`: *"- Khóa có chốt, mắt cài khóa và khoen"*.
    - `chu-giai-heading#8308`: *"(A) Khóa có chốt, mắt cài khóa và khoen dùng cho quần áo, giày dép, vải bạt, lều hoặc vải buồm."*
    - *(Lưu ý phạm vi: nếu "chốt cài" là phụ kiện cửa/nội thất bằng kim loại cơ bản thì xét `8302` theo `chu-giai-heading#8302` mục (D)(1): "chốt cài và chốt chặn cửa sổ"; nếu bằng plastic thì thuộc `3926` như `101/TB-TCHQ` → `3926.90.99`).*
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đích `8539` sai hoàn toàn do lỗi hệ thống nạp `TRAI_NGHIA` vào chỉ mục C1.**
  - **Đề xuất:** `Giữ 8308 (hs-aliases) cho khóa có chốt bằng kim loại cơ bản (bổ sung cảnh báo phân biệt với chốt cài bằng nhựa 3926 theo 101/TB-TCHQ và chốt cài cửa 8302); Bỏ đích 8539 bằng cách sửa lib/do-thi/dung-bang-canh.js để loại trừ mọi mục có loai === "TRAI_NGHIA" khi nạp data/tu-vung/ten-khac-*.json vào C1 (đồng thời xử lý luôn 9 mục TRAI_NGHIA khác trong ten-khac-8539.json và ten-khac-8714.json).`

---

### 13. Cụm `goi do vong bi` (`7325` / `8483`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "goi do vong bi", "hsCode": "73251090", "count": 1}` → trỏ **`7325`**.
  - `data/vn-product-synonyms.json`: `"gối đỡ vòng bi": ["8483"]` → trỏ **`8483`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`1` TK** tại `7325` (`"gối đỡ vòng bi"`), **`0` TK** tại `8483` / **`1` TK** toàn kho.
  - TB-TCHQ: **`0` TB** khớp nguyên cụm `"goi do vong bi"`, nhưng có **`TB-TCHQ 24028/TB-CHQ` → `8483.20.90`** trực tiếp cho *"Gối đỡ dùng ổ bi bằng thép dùng trong công nghiệp (Ball Bearing Unit...): thân ổ (gối đỡ) bằng gang đúc đã gắn ổ bi bên trong"*.
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`8483`** (**đích đúng tuyệt đối**):
    - `tax.8483`: *"Trục truyền động (kể cả trục cam và trục khuỷu) và tay biên; thân ổ và gối đỡ trục dùng ổ trượt..."* (`8483.20`: `"- Thân ổ, có lắp ổ bi hoặc ổ đũa"`; `8483.30`: `"- Thân ổ, không lắp ổ bi hoặc ổ đũa; gối đỡ trục dùng ổ trượt"`).
    - `chu-giai-heading#8483` (mục (B) *THÂN Ổ VÀ GỐI ĐỠ TRỤC DÙNG Ổ TRƯỢT*): *"Thân ổ bao gồm một khung hoặc một khối được thiết kế để đựng ổ trượt, ổ bi, ổ đũa… mà trong đó... các đầu mút của một trục hoặc trục nghiêng, quay... Thân ổ dùng ổ lăn gắn ổ bi, ổ đũa hoặc ổ đũa kim cũng được phân loại vào nhóm này; nhưng ổ bi, ổ đũa hoặc ổ đũa kim riêng lẻ thì được phân loại vào nhóm 84.82."* Và đoạn phân định ranh giới với `73.25`/`73.26`: *"nhưng miếng đệm, đĩa hoặc giá đỡ công xon , v.v.., không được gắn với một thân ổ dùng ổ lăn (hoặc bản thân chúng cũng không thiết kế để chứa một ổ bi) được phân loại theo vật liệu cấu thành (thường phân vào nhóm 73.25 hoặc 73.26)"*.
    - `TB-TCHQ 24028/TB-CHQ` (`8483.20.90`): khẳng định gối đỡ có thân ổ bằng gang đúc gắn ổ bi thuộc `8483.20.90`.
  - Loại trừ khỏi **`7325`**:
    - `tax.7325`: *"Các sản phẩm đúc khác bằng sắt hoặc thép."*
    - `chu-giai-chuong#73.phan` (Chú giải 1(f) Phần XV): *"1. Phần này không bao gồm: ... (f) Các sản phẩm thuộc Phần XVI (máy móc, các thiết bị cơ khí và đồ điện)"*.
    - `chu-giai-heading#7325`: *"Nhóm này không bao gồm những vật đúc là những sản phẩm rơi vào các nhóm khác của Danh mục (ví dụ các bộ phận máy móc có thể nhận dạng hoặc các đồ dùng cơ khí)..."*
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đích `7325` (`73251090`) sai rõ ràng theo chữ luật.** Tuy vỏ gối đỡ thường làm bằng **gang đúc** (khiến tờ khai cũ áp nhầm vào `7325.10.90`), Chú giải 1(f) Phần XV, `chu-giai-heading#7325` và `chu-giai-heading#8483` mục (B) quy định rõ thân/vỏ thiết kế để chứa ổ bi thuộc **`84.83`** (`8483.20` nếu đã lắp vòng bi, `8483.30` nếu chưa lắp vòng bi); chỉ miếng đệm/giá đỡ *không* thiết kế để chứa ổ bi mới rơi về `73.25`/`73.26`.
  - **Đề xuất:** `Giữ vn-product-synonyms/8483; Bỏ đích 7325 (73251090) cho "goi do vong bi" ở data/hs-aliases.json.`

---

### 14. Cụm `hat nhua pvc` (`3904` / `3925`)
- **Kho & đích:**
  - `data/vn-product-synonyms.json`: `"hạt nhựa pvc": ["3904", "poly vinyl clorua"]` → trỏ **`3904`**.
  - `data/hs-aliases.json`: `{"phrase": "hat nhua pvc", "hsCode": "39253000", "count": 2}` → trỏ **`3925`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`1` TK** tại `3925` (`"hạt nhựa pvc"`), **`0` TK** tại `3904` / **`1` TK** toàn kho.
  - TB-TCHQ: **`0` TB** tại `3904` và `3925` / **`2` TB** toàn kho (là 2 bản ghi cùng số `3292/TB-TCHQ` → `3812.39.00` cho *"Nguyên liệu sản xuất hạt nhựa PVC - Chất ổn định..."*; trong `3904` có 7 TB cho nhựa PVC/fluoropolymer nguyên sinh như `6089/TB-TCHQ`, `6090/TB-TCHQ`, `1049/TB-TCHQ`).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`3904`** (**đích đúng tuyệt đối**):
    - `tax.3904`: *"Polyme từ vinyl clorua hoặc từ các olefin đã halogen hóa khác, dạng nguyên sinh."* (có các dòng `3904.10.91`, `3904.21.10`, `3904.22.20` `"- - - Dạng hạt(SEN)"`).
    - `chu-giai-chuong#39` (Chú giải 6(b)): *"6. Trong các nhóm từ 39.01 đến 39.14, thuật ngữ 'dạng nguyên sinh' chỉ áp dụng với những dạng sau: ... (b) Các khối với hình dạng không đều, cục, bột (kể cả bột đúc khuôn), hạt, mảnh và các dạng khối tương tự."*
    - `chu-giai-heading#3904`: *"Nhóm này bao gồm poly(vinyl chlorua) (PVC), các copolyme vinyl clorua..."* kèm SEN *"DẠNG HẠT VÀ CÁC DẠNG TƯƠNG TỰ"*.
  - Loại trừ khỏi **`3925`**:
    - `tax.3925` & `tax.39253000`: *"Đồ vật bằng plastic dùng trong xây lắp, chưa được chi tiết hoặc ghi ở nơi khác (+)."*; `3925.30.00`: *"- Cửa chớp, mành che (kể cả mành chớp lật) và các sản phẩm tương tự và các bộ phận của nó"*.
    - `chu-giai-chuong#39` (Chú giải 11) & `chu-giai-heading#3925`: *"11. Nhóm 39.25 chỉ áp dụng đối với các sản phẩm sau đây, những sản phẩm không thuộc các nhóm trước của phân Chương II: ... (f) Cửa chớp, rèm che (kể cả mành chớp lật) và các sản phẩm tương tự và các bộ phận và phụ kiện của chúng..."* — hoàn toàn là thành phẩm xây lắp thuộc Phân chương II, không bao giờ chứa nguyên liệu hạt nhựa nguyên sinh thuộc Phân chương I (`39.04`).
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đích `3925` (`39253000`) sai hoàn toàn theo chữ luật.** Hạt nhựa PVC là nguyên liệu dạng nguyên sinh (`39.04`, Chú giải 6(b) Chương 39); việc `hs-aliases.json` trỏ `"hat nhua pvc"` → `39253000` (cửa chớp/mành che) là nhầm lẫn mã thành phẩm sản xuất hoặc dữ liệu tờ khai sai.
  - **Đề xuất:** `Giữ vn-product-synonyms/3904; Bỏ đích 3925 (39253000) cho "hat nhua pvc" ở data/hs-aliases.json.`

---

### 15. Cụm `quan jean nu` (`6104` / `6204`)
- **Kho & đích:**
  - `data/hs-aliases.json`: `{"phrase": "quan jean nu", "hsCode": "61046900", "count": 1}` → trỏ **`6104`**.
  - `data/vn-product-synonyms.json`: `"quần jean nữ": ["6204"]` → trỏ **`6204`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`1` TK** tại `6104` (`"quần jean nữ"`), **`0` TK** tại `6204` / **`1` TK** toàn kho.
  - TB-TCHQ: **`0` TB** toàn kho.
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`6104`** (chỉ khi sản phẩm được **dệt kim hoặc móc**):
    - `tax.6104`: *"Bộ com-lê... quần dài, quần yếm có dây đeo, quần ống chẽn và quần soóc (trừ quần áo bơi), dùng cho phụ nữ hoặc trẻ em gái, dệt kim hoặc móc."* (`6104.62.00` từ bông; `6104.63.00` từ sợi tổng hợp; `6104.69.00` từ vật liệu dệt khác).
    - `chu-giai-chuong#61` (Chú giải 1): *"1. Chương này chỉ áp dụng với mặt hàng may mặc sẵn được dệt kim hoặc móc."*
  - Ủng hộ **`6204`** (khi sản phẩm may từ **vải dệt không dệt kim/móc**, tức vải dệt thoi — như vải denim):
    - `tax.6204`: *"Bộ com-lê... quần dài, quần yếm có dây đeo, quần ống chẽn và quần soóc (trừ quần áo bơi) dùng cho phụ nữ hoặc trẻ em gái."* (`6204.62.00` từ bông; `6204.63.00` từ sợi tổng hợp; `6204.69.00` từ vật liệu dệt khác).
    - `chu-giai-chuong#62` (Chú giải 1): *"1. Chương này chỉ áp dụng đối với những mặt hàng may sẵn bằng vải dệt bất kỳ trừ mền xơ, không bao gồm các sản phẩm dệt kim hoặc móc (trừ các mặt hàng thuộc nhóm 62.12)."*
    - Lưu ý tham chiếu biểu thuế: `tax.52094200` và `tax.52114200` mô tả *"- - Vải denim"* là **`Fabrics, woven`** (vải dệt thoi → quần may từ vải denim truyền thống thuộc **`6204`**), nhưng trên thực tế thương mại vẫn có quần giả jean / jegging may từ vải dệt kim (`6104`).
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Mơ hồ thật** dựa trên cấu trúc vải (dệt kim/móc → `6104` vs dệt thoi → `6204`). Quần jean denim thông thường nghiêng mạnh về `6204`, nhưng không có chữ luật nào cấm tên thương mại `"quần jean nữ"` nếu sản phẩm làm từ vải dệt kim. (Riêng mức 8 số `61046900` ở `hs-aliases` không đại diện chung cho quần jean vốn thường là bông `.62` hoặc sợi tổng hợp `.63`).
  - **Đề xuất:** `Mơ hồ thật — giữ cả 6204 (ưu tiên mặc định cho vải denim dệt thoi) và 6104 (chỉ áp dụng nếu vải dệt kim/móc), phân biệt bằng dữ kiện bắt buộc theo Chú giải 1 Chương 61 và Chú giải 1 Chương 62: phương pháp tạo vải (dệt kim/móc vs dệt thoi).`

---

### 16. Cụm `Copper wire` (`7408` / `8516` / `8544`)
- **Kho & đích:**
  - `data/synonyms.json`: `muc["7408"]` chứa `{"en": "Copper wire", "nhan": "NGUYEN_VAN", "nguon": {"tap": "data/wco-hs-international.csv", "ma": "7408"}}` → trỏ **`7408`**.
  - `data/english-product-map.json`: `"copper wire": ["dây đồng", "dây điện"]`, giải gián tiếp qua:
    - `"dây đồng"` → `hs-aliases.json` (`{"phrase": "day dong", "hsCode": "85168030", "count": 3}`) → tạo đích **`8516`**!
    - `"dây điện"` → `vn-product-synonyms.json` (`"dây điện": ["8544", ...]`) và `hs-aliases.json` (`85444294`, `85444295`, `85444297`, `85444922`) → tạo đích **`8544`**!
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`0` TK** (cụm tiếng Anh `"copper wire"` không xuất hiện nguyên cụm trong `tenHang`).
  - TB-TCHQ: **`0` TB** khớp `"copper wire"` (trong kho có `1757/TB-TCHQ`, `1758/TB-TCHQ` cho *"Dây đồng đơn / dây đồng tinh luyện"* thuộc `7408.11.90` và 89 TB thuộc `8544` cho dây/cáp điện cách điện).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`7408`** (đích chính danh cho *"Copper wire"* — dây đồng trần, chưa cách điện):
    - `tax.7408`: *"Dây đồng. (Copper wire)"*.
    - `chu-giai-heading#7408`: *"Dây thu được bởi cán, ép đùn nén hoặc kéo chuốt và ở dạng cuộn... Nhóm này không bao gồm: ... (f) Dây cách điện và cáp (bao gồm cả dây tráng men) (nhóm 85.44)."*
    - `TB-TCHQ 1757/TB-TCHQ` & `1758/TB-TCHQ` (`7408.11.90`): dây đồng tinh luyện mặt cắt tròn đặc.
  - Ủng hộ **`8544`** (chỉ khi dây đồng **đã cách điện / tráng men**):
    - `tax.8544`: *"Dây điện, cáp điện (kể cả cáp đồng trục) có cách điện (kể cả loại đã tráng men cách điện hoặc mạ lớp cách điện) và dây dẫn có cách điện khác..."* (`8544.11`: dây quấn bằng đồng đã bọc cách điện/tráng men).
    - `chu-giai-heading#8544`: *"Loại trừ khỏi nhóm này các điện trở đốt nóng bằng điện có vỏ bọc cách điện (ví dụ, các dây hợp kim đặc biệt quấn xoắn ốc xung quanh một lõi bằng các sợi thủy tinh hay các sợi amiăng) thuộc nhóm 85.16"*.
  - Loại trừ **`8516` (SAI đối với `Copper wire`)**:
    - `tax.8516` & `tax.85168030`: *"Dụng cụ điện đun nước nóng... các loại điện trở đốt nóng bằng điện, trừ loại thuộc nhóm 85.45."* → `8516.80.30`: *"- - Dùng cho thiết bị gia dụng"* (`Resistors; electric heating`).
    - `chu-giai-heading#8516` & `chu-giai-heading#8544`: `8516.80` chỉ bao gồm **điện trở đốt nóng** (thường bằng dây hợp kim điện trở đặc biệt), không phải dây đồng dẫn điện (`Copper wire`). Đích `8516` lọt vào `"copper wire"` chỉ vì `english-product-map` dịch `"copper wire"` → `"dây đồng"` rồi kế thừa mù `hs-aliases["day dong"] -> 85168030`.
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đích `8516` sai hoàn toàn do kế thừa bắc cầu qua `hs-aliases["day dong"] -> 85168030`**. Còn giữa **`7408`** và **`8544`** là phân nhánh hợp pháp theo điều kiện **trần vs đã cách điện** (`chu-giai-heading#7408` loại trừ `(f)`).
  - **Đề xuất:** `Bỏ đích 8516 khỏi "copper wire" (rà soát tách hoặc bỏ gán trần "day dong" → 85168030 trong data/hs-aliases.json); Giữ 7408 (synonyms) cho "Copper wire" trần chưa cách điện, và thu hẹp liên kết sang "dây điện" / 8544 ở data/english-product-map.json chỉ khi có thông tin đã bọc cách điện hoặc tráng men (insulated/enamelled copper wire).`

---

### 17. Cụm `printed circuit board` (`8534` / `9006`)
- **Kho & đích:**
  - `data/english-product-map.json`: `"printed circuit board": ["mạch in", "bảng mạch in"]`, trong đó `"mạch in"` giải qua `hs-aliases.json` (`85340010`, `85340020`) → trỏ **`8534`**.
  - `data/synonyms.json`: `muc["900659"]` chứa `{"en": "printed circuit board", "phapLy": true, "nhan": "NGUYEN_VAN", "nguon": {"tap": "data/wco-op/opinions.json", "id": "900659/1", "ma": "900659", "trich": "1. Laser photoplotter for creating latent “printed circuit board” images on photosensitive film from digital formats (which is subsequently used in the production of printed circuit bo..."}}` → trỏ **`9006`**.
- **Số lượng hàng (TK / TB):**
  - TK OZ: **`0` TK** khớp `"printed circuit board"`.
  - TB-TCHQ: **`0` TB** khớp `"printed circuit board"` (trong kho có **5 TB** thuộc `8534` cho mạch in chưa gắn linh kiện như `2519/TB-TCHQ`, `5007/TB-TCHQ`, `1572/TB-TCHQ`, và **0 TB** thuộc `9006`).
- **Chữ luật / Chú giải ủng hộ từng bên:**
  - Ủng hộ **`8534`** (**đích đúng** cho mạch in chưa gắn linh kiện chủ động):
    - `tax.8534`: *"Mạch in. (Circuits; printed)"*.
    - `chu-giai-chuong#85` (Chú giải 8): *"8. Theo mục đích của nhóm 85.34 'mạch in' là mạch được tạo ra trên một tấm cách điện bằng một quy trình in mạch nào đó (ví dụ, rập nổi, mạ, khắc axit) hoặc bằng kỹ thuật tạo 'mạch điện màng'... Thuật ngữ 'mạch in' không bao gồm mạch đã tổ hợp với các phần tử trừ các phần tử đã được hình thành trong quá trình in mạch..."* (Nếu đã lắp linh kiện chủ động thành PCBA thì phân loại theo Chú giải 2 Phần XVI như `8537`, `8543`…, theo `chu-giai-heading#8534`).
  - Lật tẩy đích **`9006` (SAI 100%)**:
    - `tax.9006` & `tax.90065921`: *"Máy ảnh (trừ máy quay phim); thiết bị đèn chớp và đèn flash máy ảnh..."*; `9006.59.21`: *"- - - - Máy vẽ ảnh laser"*.
    - `chu-giai-heading#9006` (mục (16)) & `data/wco-op/opinions.json#900659/1`: *"(16) Máy chụp laser để tạo ra hình ảnh 'tấm mạch in' ẩn trên phim nhạy, thường từ các định dạng số (thường được sử dụng để sản xuất các tấm mạch in) bằng các tia laser."* (Nguyên văn WCO `900659/1`: *"Laser photoplotter for creating latent “printed circuit board” images on photosensitive film from digital formats (which is subsequently used in the production of printed circuit boards)..."*).
    - **Nguyên nhân sai:** Trình sinh `synonyms.json` cắt đúng cụm nằm trong ngoặc kép `“printed circuit board”` từ WCO Opinion `900659/1` mà bỏ qua chủ thể thật của câu là **`Laser photoplotter`** (máy vẽ ảnh laser dùng để chế tạo phim cho ngành sản xuất mạch in), dẫn đến gán sai `"printed circuit board"` vào nhóm máy ảnh **`9006`**!
- **Phân tích & Đề xuất giữ/bỏ:**
  - **Đích `9006` sai 100% — lỗi trích xuất từ văn bản WCO Opinion `900659/1` trong `data/synonyms.json`.**
  - **Đề xuất:** `Giữ english-product-map/8534 (lưu ý bổ sung quy tắc phân biệt mạch in trần 8534 với PCBA đã gắn linh kiện chủ động theo Chú giải 8 Chương 85); Bỏ mục {"en": "printed circuit board"} dưới khóa "900659" trong data/synonyms.json (đúng ra 900659 là "laser photoplotter").`
