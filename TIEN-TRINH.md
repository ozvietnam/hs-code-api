# TIEN-TRINH — lô 009 (soạn sổ tay chú giải)

Nhóm của lô: **6601, 6603, 6805, 6815, 8212, 9032**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-09` @ `b58dda8` (main mới nhất)
Ngày: 2026-10-22 · Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác).
Quy trình: `docs/giao-viec/so-tay-giao-ngoai.md` mục 2 + 11 luật mục 3.

## ⚠️ Sai lệch brief ↔ CSV (đã chốt theo CSV)

`brief-st-lo009.md` tự mâu thuẫn trong chính nó:

| Nơi | Nhóm ghi |
|---|---|
| brief dòng 4 (`**Nhóm của lô**`) | `6601,6603,6805,6815,8212,9032` |
| brief dòng 6 (lệnh `--nhom=` mẫu) | `7615,9609,3215,6306,6804,7412` ← nhóm của **lô 001** |

Đối chiếu `docs/giao-viec/so-tay-lo.csv` dòng `009`: `6601 6603 6805 6815 8212 9032` — khớp dòng 4.
Đây là copy-paste mẫu từ brief lô trước (memory `so-tay-lo-quy-trinh` đã cảnh báo đúng loại lỗi này;
lô 008 và 003 từng dính y hệt). **Em theo CSV.**

## Các bước

- [x] **B1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` TRỌN. Cập nhật CSV dòng 009 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
- [x] **B2. Kiểm tra tệp cũ** — cả 6 nhóm đều **chưa** có `data/so-tay/<nhom>.json` → soạn mới toàn bộ, không copy tệp cũ (khác lô 006/008 vốn gán trùng nhóm đã có sẵn).
- [x] **B3. Xuất nguồn** — `build-so-tay.mjs --nhom=6601,6603,6805,6815,8212,9032 --xuat-nguon=tmp/so-tay/nguon` → 6 tệp, tổng **98.915 ký tự** (dưới trần 350k của lô; CSV ghi 69.428 — chênh vì file xuất kèm phần đầu nguồn).
- [x] **B4.** Đọc `tmp/so-tay/nguon/_he-thong.txt`, rồi đọc `lib/so-tay.js` (máy kiểm) để biết chính xác luật nào lọc mục nào, và in cây `lib/hs-tree.js` cho cả 6 nhóm.
- [x] **B5.** Đọc HẾT 6 tệp nguồn (3.852–37.439 ký tự/tệp) → viết `tmp/so-tay/raw/<nhom>.json`.
- [x] **B6.** `check-so-tay.mjs --raw` → 94/94 sạch, **nhưng phải tự soát bằng mắt** — đã sửa **9 lỗi** máy không bắt (mục dưới) → chạy lại, vẫn 94/94.
- [x] **B7.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-009.json` → **94/94 (100 %)**, 0 nhóm lỗi.
- [x] **B8.** `check-cay.mjs --nhom=<6> --chi-tiet` → **0 lỗi lệch cây** (3 cảnh báo xem dưới). `npm run so-tay:check` → 212 nhóm / 7194 mục / 0 lỗi. `npm test` → **ALL TESTS PASSED**.
- [x] **B9.** Commit + push + mở PR (**KHÔNG merge**).

## Tự soát bằng mắt — 9 lỗi máy KHÔNG bắt được (đã sửa trước khi nạp)

Máy chỉ chứng minh câu trích **có thật trong nguồn**; nó không chứng minh câu đó **nói đúng điều mục khẳng định**. Em chạy `scripts/audit-trich.mjs` cho từng mục (in câu ngay trước/sau) + quét tự động "chữ trong `text`/`dieuKien`/`tomTat`/`quyTac`/`hoi` nhưng không có trong `trich`". Kết quả:

1. **`phanBiet` 6603 ĐẢO CHIỀU — nguy hiểm nhất.** Bản nháp đầu ghi `neuCo=6603, neuKhong=6602` cho *"Hàng là gậy chống chưa hoàn chỉnh không?"*. Đọc lại: câu nguồn nói **gậy chống chưa hoàn chỉnh → 66.02**, tức khi hàng **CÓ** đặc tính đó thì đi là `6602`, không phải `6603`. Đã đảo. (Đúng kiểu lỗi memory `so-tay-soat-lo007` đã cảnh báo: *"`hoi` của `phanBiet` bị đảo so với câu loại trừ trong nguồn"*.)
2. **Lỗi gõ ký tự trong câu trích 8212.** Em gõ `"hình dạnh cơ bản"` thay vì `"hình dạng cơ bản"` → `trich-khong-co-trong-nguon`. Máy bắt đúng; đã sửa.
3. **`phamVi` 8212 nói thứ câu trích không có.** `text` có mệnh đề *"phôi lưỡi dao cạo râu… đã khoan lỗ sẵn cũng thuộc nhóm này"* — nằm ở **đoạn kế tiếp**, không có trong trích. Đã **rút gọn `text`**.
4. **`dieuKienVao` 8212 là ĐIỀU KIỆN SAI CẤP — đã XOÁ.** Câu *"Phôi lưỡi dao cạo râu… **với điều kiện là** những phôi này đã được khoan lỗ sẵn…"* là điều kiện **riêng cho phôi lưỡi** (8212.20), **không phải** điều kiện vào cả nhóm: lưỡi dao cạo thành phẩm không cần khoan lỗ sẵn. Ghi ở cấp nhóm sẽ khiến cổng loại nhầm lưỡi thành phẩm. **XOÁ** — thà không có còn hơn có điều kiện sai.
5. **`dieuKienVao` 6805 là VẾ CỤT.** Bản nháp trích bắt đầu bằng *"…hoặc dạng sợi chỉ hoặc dây bện, **mà trên đó** các vật liệu mài…"* — "trên đó" có antecedent ở câu trước, đọc riêng không ra. Đã kéo về **đủ câu** từ "Nhóm này gồm…".
6. **`dieuKienVao` 6815 là VẾ CỤT.** Bản nháp trích bắt đầu bằng *"chưa được xếp vào các nhóm trước…"* — mất chủ ngữ. Đã thêm *"các sản phẩm bằng đá hoặc bằng các chất khoáng khác,"*.
7. **`dieuKien`/`hoi` 6815 vượt câu trích.** `loaiTru` 69.02/69.03 viết *"…(gạch xây và hình khối magiê hoặc magiê crom đã liên kết bằng hoá học)"* — chi tiết nằm ở **câu trước**; `phanBiet` viết *"có cùng thành phần… trong lò"* — hoàn toàn không có trong nguồn. Đã rút về đúng câu trích.
8. **`dieuKien`/`fact` 9032 vượt câu trích.** `loaiTru[3]` và `[4]` ghi ngoặc *"(khi không đáp ứng mô tả bộ điều chỉnh tự động ở đoạn trên)"* nhưng câu trích chỉ có mục (1)/(3). Với `[3]` đã **kéo câu dẫn vào trích** (còn 200 ký tự, dưới 300) nên ngoặc có căn cứ; với `[4]` không kéo được (phải lược qua mục (2)) nên **bỏ ngoặc**. `loaiTru[5]` bỏ *"của bộ điều chỉnh tự động"*; `tieuChi6` 9032.20 đổi tên `fact` từ `tu_dong_kiem_tra_ap_luc` → `kiem_tra_hoac_dieu_chinh_ap_luc` vì câu nguồn **không** có chữ "tự động".
9. **`tomTat`/`quyTac` 6603 và 9032 diễn đạt lại.** 6603 dùng *"phần gắn cứng"* (nguồn nói *"có thể nhận biết được"* + *"không gắn với ô, dù che, gậy chống"*) và *"xếp riêng"* (nguồn: *"được phân loại riêng"*); 9032 thêm chữ *"chính nhóm này"*. Đã viết lại theo đúng văn phong nguồn.

## Quyết định "bỏ" — thà không có mục còn hơn mục mờ má

- **Không ghi `loaiTru` cấp Chương.** Cả 6 nhóm đều có câu loại trừ cấp chương ghi "Chương 95" / "Chương 72 hoặc Chương 73" / "Chương 69"… mà **không** nêu đích danh nhóm (luật 3). Ghi vào nhóm 4 số sẽ phải lặp yệt ở mọi nhóm cùng chương. Sắp tới có câu "gậy chống đo → 90.17" (ch66), "đá in litô → 84.42" / "đầu mũi khoan nha khoa → 90.18" (ch68), "van → 84.81" (ch90) — **cùng cấp chương, cùng bỏ**, và ghi chú ở PR để người duyệt quyết có mở ngoại lệ hay không.
- **`dieuKienVao` rỗng ở 3/6 nhóm (6601, 6603, 8212).** Các câu ứng viên đều là câu **bao hàm** ("Nhóm này bao gồm…"), câu **cho phép** ("không phụ thuộc vào nguyên liệu tạo thành") hoặc thuộc **phân nhóm** chứ không phải điều kiện chung của cả nhóm.
  - Riêng 6603: câu *"Với những trường hợp loại trừ này, nhóm bao gồm các bộ phận… có thể nhận biết được"* nghe như điều kiện, nhưng nó **có điều kiện tiền đề** ("Với những trường hợp loại trừ này") — tách riêng ra sẽ đảo nghĩa. Đưa vào `boPhan` + `tieuChi6` 6603.90 thay vì `dieuKienVao`.
- **`loaiTru` 6815 mục (b) BỎ — máy loại đúng lý do.** Câu *"(nhóm 69.02 hoặc 69.03, **tùy trường hợp cụ thể**)"* khớp luật máy `loai-tru-chi-la-thuong`. Không ghi đích khi nguồn nói "tùy trường hợp". (Mục (5) — cùng đích 69.02/69.03 nhưng **không** có định ngữ "tùy trường hợp" — thì ghi được.)
- **Không ghi `tieuChi6` cho 3 phân nhóm "n.e.c."**: `660199` (*"n.e.c. in heading no. 6601 (including walking stick umbrellas)"*), `681599` (*"n.e.c. or included in heading no. 6815"*), `821290` (biểu thuề chỉ ghi *"Các bộ phận khác"*). "n.e.c." là phủ định (không thuộc chỗ khác), **không phải tiêu chí dương** để phân biệt. `check-cay` báo 3 cảnh báo này — là **đúng theo nguồn**, không phải thiếu sót.
- **Không điền `cay.tenDien` cho 3 nút 6 số chưa có tên tiếng Việt**: `681513`, `681519`, `903289`. Nguồn duy nhất đặt tên cho chúng là **tiếng Anh** (`wco.*`). Điền tên tiếng Việt tức là **dịch do em tự làm** — vi phạm luật 2 (*"không diễn đạt lại"*). Quy ước đã dùng ở 20+ tệp sẵn có là `tenDien` **luôn** lấy từ nguồn tiếng Việt. **Bỏ, và báo người quản lý** (xem dưới).
  - Ba nút ảo `NHOM_MOT_GACH` (`66019`, `68151`, `68159`, `90328`) và tiêu đề `TIEU_DE_QG` `9032893` **đã có tên** từ biểu thuế Tổng cục → không điền (điền sẽ sinh cảnh báo `ten-dien-trung-bieu-thue`).

## Trích dài 300–600 ký tự (máy vẫn cho qua, người soát phải để mắt)

| Nhóm | Mục | Dài | Vì sao giữ |
|---|---|---|---|
| 9032 | `dieuKienVao` | 568 | Nguyên vẹn **Chú giải 7(a) Chương 90** — câu dẫn *"7. Nhóm 90.32 chỉ áp dụng với:"* chính là điều kiện vào nhóm. Cắt bất cứ vế nào cũng mất nghĩa: cắt *"cho dù… không phụ thuộc"* là mất ngoại lệ (thiết bị không phụ thuộc hiện tượng điện **vẫn** thuộc 9032); cắt *"được thiết kế để điều chỉnh, và duy trì…"* là mất đúng điều kiện. 568/600 — sát trần nhưng hợp lệ. |
| 9032 | `phamVi` | 534 | Phải chứa **cả hai mục (A) và (B)** của nhóm mới đủ bảo hiểm cho `text`. Đoạn lược giữa (A) và (B) là phần diễn giải *"Chúng được thiết kế để đưa hệ số này tới…"*, **không chứa** ngoại lệ — nên lược được. |
| 6603 | `boPhan` | 485 | Quy tắc bộ phận của 6603 có **hai vế đối xứng** (loại trừ phụ kiện dệt/bao bì/hộp đựng ô → xếp riêng; phần còn lại mới vào 6603). Chỉ trích một vế thì `quyTac` thành nửa vời. Hai vế là **hai câu liền nhau** trong nguồn, nối bằng dấu chấm — không lược mất gì. |

Tất cả mục còn lại đều ≤ 300 ký tự.

## Nhóm nguồn mỏng / bất thường — cần người quản lý biết (KHÔNG sửa tay trong sổ tay)

1. **Không nhóm nào có `SEN` hay ngưỡng số nào.** Cả 6 nhóm chỉ có nguồn `nhom*/ch*/wco*/tax*` — **không** có `sen.*`, và **không** câu nào chứa ngưỡng số (công suất, kích thước, nhiệt độ…). Hệ quả: **lô này không có mục điều kiện số nào** (`dieuKienVao`/`tieuChi6`/`dong8.tieuChi` đều là boolean hoặc chuỗi). Đây là **đặc tính của lô**, không phải thiếu sót — nhưng PR phải nói rõ, không được báo "có 1 mục điều kiện số" như mẫu bắt buộc.
2. **`nhom6601.nhom` mỏng.** Toàn bộ chú giải nhóm 6601 chỉ có 4 đoạn + 2 mục loại trừ + 1 chú giải phân nhóm 6601.10. Không có chú giải cho 6601.91/6601.99. Đây là lý do `dieuKienVao` rỗng và chỉ 1 `loaiTru`.
3. **`nhom6805.nhom` có câu đứt giữa chừng.** Đoạn đầu nguyên văn dừng ở *"…thường bằng hồ"* rồi xuống dòng *"dán hoặc plastic"* (nguồn bị ngắt dòng giữa câu). Em chép nguyên văn liền, **không** sửa — nhưng người quản lý nên kiểm lại nguồn gốc.
4. **Hai dòng biểu thuề trùng chữ, nguồn KHÔNG phân biệt được** — em ghi rõ trong `dong8.dieuKien`, không đoán:
   - `68151310` và `68151910` đều ghi **"Sợi hoặc chỉ"**. Phân biệt bằng vật liệu cha (6815.13 = vật phẩm xơ carbon; 6815.19 = graphit/carbon khác, theo `wco.681513`/`wco.681519`).
   - `90328939` và `90328990` đều ghi **"Loại khác"**. `90328939` nằm dưới tiêu đề quốc gia `9032.89.3` (*"Loại khác, hoạt động bằng điện"*); `90328990` là dòng gom cấp 8 số của `9032.89`.
5. **`loaiTru` 9032 có ba mục là nhánh PHỦ ĐỊNH, không phải danh sách đen.** Mục `9025|9026|9030` và `8536` chỉ áp dụng *"Nếu không đáp ứng các mô tả được chỉ ra ở đoạn trên"* (tức thiết bị **không** phải bộ điều chỉnh tự động); mục `8536` còn nói *"nói chung"*. Em ghi đúng định ngữ giới hạn trong `dieuKien` — **cổng sau không được coi 3 mục này là loại trừ tuyệt đối**.
6. **Không nhóm nào bị cắt trần khi xuất nguồn** — `nguonBiCat` rỗng ở cả 6 nhóm trong báo cáo lô. (Ngược lại lô 008 có 2 nguồn bị cắt.)
7. **`phanBiet` 6601 cần người soát kiểm chiều nhánh.** Nguồn chỉ nói *"Nhóm này không bao gồm: (b) Các loại lều trại trên bãi biển, **không mang tính chất** như dù che hoặc dù che có thể làm thành lều (nhóm 63.06)"* — nhánh `neuCo=6601` là **nhánh "còn lại" của câu loại trừ**, không phải câu nguồn nói thẳng. Em **không** ghép thêm câu chú giải *"Dù che làm thành lều là loại dù lớn có gắn 'một màn che bao quanh'…"* vào trích, vì giữa hai câu có câu mở đoạn **"Nhóm này không bao gồm:"** — lược qua nó là lược mất ngoại lệ (đúng lỗi vòng 1 đã dạy).
8. **Ba nút 6 số thiếu tên tiếng Việt** (`681513`, `681519`, `903289`) — xem mục "Quyết định bỏ" ở trên. Cần người quyết định: cho phép dịch tên WCO sang tiếng Việt (kèm trích tiếng Anh) hay không. **Hiện chưa có tiền lệ** trong 200+ nhóm sẵn có — tất cả `tenDien` đều lấy từ nguồn tiếng Việt.

## Sai sót đã kiểm kỹ là ĐÚNG (không sửa) — để người soát đừng sửa nhầm

- **`phanBiet` 6601 với `neuCo = 6601` (chính nhóm của nó).** Chấp nhận được: mã trong nhóm không cần được nêu trong trích; câu loại trừ dứt khoát với đích danh vẫn tạo đúng cặp nhánh. (Lô 008 dùng y hệt cho 3916.)
- **`loaiTru` 6815 `sangNhom: "6902|6903"` và `phanBiet` `neuCo: "6902|6903"`.** Nguồn nói *"nhóm 69.02 **hoặc** 69.03"* — em ghi **cả hai** bằng ký hiệu `a|b` (quy ước đã xác nhận ở lô 007), **không** chọn một nhánh làm đích duy nhất (đúng lỗi vòng 2 đã dạy: 8708 → 7009).
- **`tieuChi6` 66039010 / 66039020 có `value` là CHUỖI `"66.01"` / `"66.02"`.** Đây là tiêu chí phân biệt hai dòng 8 số của 6603.90 — cùng dạng với `dong8.dieuKien`, chỉ khác là đặt vào `tieuChi`. Chữ trong `value` nằm nguyên văn trong dòng biểu thuề.
- **`dieuKienVao` 9032 lấy từ `ch90.chuong`** (không phải `nhom*.nhom`). Hợp lệ vì **Chú giải 7 nêu đích danh "Nhóm 90.32"** — đây là điều kiện vào riêng nhóm này, không phải nguyên tắc chung cho cả Chương 90 (khác với trường hợp 4819 lô 008 mà người soát đã xoá).
- **`tieuChi6` lấy từ `wco.*` (tiếng Anh)** ở cả 6 nhóm — đúng lược độ; em ghi kèm tiếng Việt trong `fact`/`value`.

## Quy trình đã chạy

1. `build-so-tay.mjs --nhom=<6> --xuat-nguon=tmp/so-tay/nguon`
2. Đọc `_he-thong.txt`; đọc `lib/so-tay.js` (máy kiểm); in cây `lib/hs-tree.js` cho 6 nhóm; kiểm mọi mã đích có thật trong `chu-giai-heading.json`/`tax.json`.
3. Đọc TRƯỚC cả 6 tệp `<nhom>.txt` → viết `tmp/so-tay/raw/<nhom>.json`.
4. `check-so-tay.mjs --raw` → 1 lỗi (lỗi gõ "dạnh") → sửa → 94/94 sạch → `audit-trich.mjs` cả 6 nhóm + quét chữ vượt trích → sửa 9 chỗ → `--raw` lại (94/94) → quét lại (chỉ còn 3 chú thích đã đánh dấu).
5. `rm -f data/so-tay/bao-cao/lo-009.json` → nạp 6 nhóm → `check-cay.mjs --nhom=<6> --chi-tiet` → `npm run so-tay:check` → `npm test`.

## Kết quả

| Nhóm | Tổng mục | phamVi | dieuKienVao | loaiTru | phanBiet | boPhan | tieuChi6 | dong8 | cay.tenDien |
|---|---|---|---|---|---|---|---|---|---|
| 6601 | 8 | 1 | 0 | 1 | 1 | 0 | 2 | 3 | 0 |
| 6603 | 9 | 1 | 0 | 1 | 1 | 1 | 2 | 3 | 0 |
| 6805 | 10 | 1 | 1 | 1 | 1 | 0 | 3 | 3 | 0 |
| 6815 | 26 | 1 | 1 | 4 | 4 | 0 | 6 | 10 | 0 |
| 8212 | 11 | 1 | 0 | 2 | 2 | 0 | 2 | 4 | 0 |
| 9032 | 30 | 1 | 1 | 6 | 5 | 1 | 5 | 11 | 0 |
| **Tổng** | **94** | 6 | 3 | 15 | 14 | 2 | 20 | 34 | 0 |

**Tỷ lệ đạt: 94/94 (100 %)**, `nhomLoi: []`, 0 mục bị máy loại.

## Kiểm chứng

| Lệnh | Kết quả |
|---|---|
| `check-so-tay.mjs --raw=tmp/so-tay/raw` | 6 nhóm, 94 mục, **0** mục không kiểm được nguồn |
| `build-so-tay.mjs --tu-tep --force` | **94/94 (100 %)**, 0 nhóm lỗi |
| `check-cay.mjs --nhom=<6> --chi-tiet` | 6 nhóm, **0 lỗi lệch cây**; 3 cảnh báo `phan-nhom-chua-co-tieu-chi` (xem mục "Quyết định bỏ") |
| `npm run so-tay:check` | 212 nhóm, 7194 mục, **0 lỗi** |
| `npm test` | **ALL TESTS PASSED** |

## Bàn giao

- **KHÔNG merge** — PR đang mở, chờ người duyệt.
- Việc còn lại của người duyệt (mục 4 giao việc): **soát độc lập TOÀN BỘ** `phamVi`/`boPhan`/`dieuKienVao`/`loaiTru`/`phanBiet` của 6 nhóm này (**27 mục**); rồi tự soát ngẫu nhiên ≥ 10 % phần còn lại (67 mục `tieuChi6`/`dong8`).
- **Ba chỗ cần người soát để mắt nhiều nhất** (máy không có khả năng phát hiện):
  1. Chiều nhánh `phanBiet[0]` 6601 (mục "Nhóm nguồn mỏng" #7).
  2. Ba `dieuKien`/`fact` của 9032 đã sửa theo hướng **rút về đúng câu trích** — kiểm xem có bị rút quá tay không.
  3. Ba chú thích "Dòng cha không có trong nguồn — đối chiếu biểu thuế" trong `dong8` (6815 ×4, 9032 ×2) — đây là **metadata về biểu thuề**, không phải mệnh đề từ câu trích; lô 008 đã dùng cùng cách và được duyệt, nhưng cần xác nhận nhất quán.
- Khi đạt: `so-tay-lo.csv` dòng 009 → `trang_thai=xong` + điền `pr`.
- Lỗi kệ sách mới phát hiện (nguồn 6805 ngắt dòng giữa câu) nên bổ sung vào mục 1 của `so-tay-giao-ngoai.md`.

## Tóm tắt thay đổi (commit lần này)

- 6 file mới `data/so-tay/{6601,6603,6805,6815,8212,9032}.json`
- 1 file mới `data/so-tay/bao-cao/lo-009.json`
- 1 file `docs/giao-viec/so-tay-lo.csv` (dòng 009: `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`)
- 1 file `TIEN-TRINH.md` (viết lại cho phiên soạn lô 009; bản lô 008 còn nguyên trong lịch sử git)
- **KHÔNG** commit `tmp/` (gitignored). **KHÔNG** ghi `nguonLoai` (máy tự gán `AI_DA_KIEM`; đổi sang `NGUOI_DUYET` là việc của người soát độc lập — luật 11). **KHÔNG** soạn `cay` (máy sinh). **KHÔNG** merge.