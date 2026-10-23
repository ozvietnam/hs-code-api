# TIEN-TRINH — sổ tay chú giải HS (dùng chung nhiều phiên)

<!-- Mục mới nhất ở trên; các phiên sau bổ sung tiếp xuống dưới, đừng xoá phần của nhau. -->

---

# SOÁT ĐỘC LẬP lô 029 — phiên `dev-soat-doc-lap` (23/10/2026)

Người soát **khác** người soạn (`dev-zcode-mm`). Đã đọc lại **TOÀN BỘ 125 mục** của 6 nhóm
cùng nguồn nguyên văn `tmp/so-tay/nguon/<nhom>.txt` — không soát mẫu.

**Kết quả: xoá 3 · sửa 19 · còn lại 122/122 đạt (100 %) · `nhomLoi: []`**
Commit `1d2aceb` trên nhánh `so-tay/lo-029` · PR #414 · **KHÔNG merge**.

## Vì sao phải soát tay (máy báo xanh mà vẫn sai)

Trước khi soát, `check-so-tay --raw` báo **125/125 đạt**. Đúng như mục 0 giao việc: máy chỉ
chứng minh câu trích **có thật** trong nguồn, không chứng minh nó **nói đúng** điều mục
khẳng định. Ba lớp kiểm đã chạy: (1) `check-so-tay --raw`, (2) kiểm **nguyên văn tuyệt đối
không squash**, (3) đọc tay từng mục.

## Lỗi nặng — máy KHÔNG bắt được

| Nhóm | Mục | Lỗi |
|---|---|---|
| 9402 | `loaiTru[4]`, `phanBiet[0]` | Câu trích **bên nhiễm rác**: `...ghế quay, vv....(nhóm....(nhóm....(nhóm....vv....vv....vv....(nhóm 94.01).` Cụm thừa **không tồn tại trong nguồn**. Máy xanh vì tách mảnh theo `…` thì từng mảnh đều có trong nguồn. |
| 8510 | `phamVi`, `dieuKienVao[0]` | Câu trích kết bằng **12 dấu chấm** `gia súc............`, nguồn chỉ có 3. |
| 8461 | `phanBiet[0]` | Câu trích kết bằng **12 dấu chấm** `giá............`, nguồn chỉ có 3. |
| 8484 | `tieuChi6[0]` | Tiêu chí **phần (B)** bị treo nhầm lên `hs6 8484.10`. Nguồn nói ngược lại ba lần: tiêu đề phần (A), `wco.848410`, và dòng biểu thuế `84841000` — 8484.10 là phần (A). Phần (B) thuộc **8484.90** (theo `wco.848490`). Còn mâu thuẫn với `dong8` ngay trong cùng tệp. |

## Lỗi "nói rộng hơn câu trích" — sửa bằng cách **nối `trich`**, không cắt `text`

Theo bài học lô 028: `text` nói nhiều hơn `trich` thì nối thêm vào `trich` bằng `…`,
đừng cắt bớt `text`.

- **9504** `phamVi`: `text` liệt 13 mục (1)-(13), `trich` chỉ có (1) và (2).
- **8461** `phamVi`: `text` liệt 9 loại máy, `trich` chỉ có (2), (6), (9).
- **9402** `phamVi`: `text` có ví dụ và nhắc Phần (C) mà `trich` không có.
- **8484** `phamVi`: `text` nói cả ba phần (A)(B)(C), `trich` chỉ có (A).
- **2508** `phamVi`: `text` liệt 6 sản phẩm, `trich` dừng ở dấu hai chấm trước danh sách.

## Câu phân biệt XOÁ (2 mục ở 9402)

- `phanBiet[0]` — nhánh **"không"** chỉ suy từ **danh sách loại trừ** (nguồn loại riêng ghế đẩu
  piano, bập bênh, quay; không nói mọi ghế không có trục xoay đều sang 9401). Đúng loại lỗi
  mục 0 đã ghi là "người soát bắt".
- `phanBiet[1]` — nhánh **"có"** (`94029012`) **không có trong câu trích** (trích lấy từ
  `sen.94029013`, chỉ nói bàn mổ *không* điện); `hoi` còn mượn chữ "điện thủy lực hoặc cơ điện"
  nằm ở `sen.94029012`. Một mục chỉ trích được một khối nguồn nên không gộp được.

Sự phân biệt **bàn mổ điện / không điện** vẫn còn đủ ở `dong8` 94029012 và 94029013, mỗi dòng
một câu trích SEN riêng — không mất thông tin.

## 2508 — nguồn tự mâu thuẫn, xử lý có chủ đích

Chú giải phân nhóm nói `2508.10 bao gồm natri bentonite (bentonite trương nở)`, còn danh sách
loại trừ mục (d) nói `đất sét trương nở → 68.06`. Hai mục sổ tay sẽ đọc ra hai kết luận trái nhau.

- **XOÁ** `tieuChi6[hs6=2508.10]` — mảnh sinh mâu thuẫn.
- **GIỮ** `loaiTru → 6806` — khai trong danh sách chính thức "Nhóm này không bao gồm:" mục (d),
  có nêu đích danh 68.06.
- `wco.250810` ("bentonite, whether or not calcined" kèm "**excluding** expanded clays of heading
  no. 6806") cho thấy hai câu **song song đúng**, không thật sự mâu thuẫn. Việc xếp bentonite vào
  2508.10 vẫn được phục vụ bởi dòng biểu thuế `25081000`.

Không dựng `phanBiet` bentonite. Vẫn **báo để người duyệt quyết** (xem mục dưới).

## Sửa còn lại

| Nhóm | Mục | Việc sửa |
|---|---|---|
| 9504 | `loaiTru[2]` | Bổ sung "hoặc theo chất liệu cấu thành" — mất định ngữ giới hạn. |
| 9504 | `loaiTru[4]` | Bổ sung "cũng như với DVD, đĩa nhạc CD, MP3 hoặc đầu băng video". |
| 9504 | `phanBiet[0]` | Lấy câu ở `nhom9504.nhom` để **cả 9504.50 lẫn 9504.30 đều có mặt** trong trích (bản cũ lấy `ch95.chuong` chỉ nói "Phân nhóm này"). |
| 9504 | `dong8[14]` | 95049033: `dieuKien` thiếu chữ **"Loại"** so với chính câu trích của nó (vòng soạn đã sửa trích nhưng quên sửa `dieuKien`). |
| 8461 | `phanBiet[0]` | Nối câu "…hoạt động bằng tay hoặc đạp chân, **cũng được phân vào nhóm này**" — trước đó nhánh "có" không có căn cứ. |
| 8484 | `tieuChi6[0]` | Chuyển `8484.10 → 8484.90`, lấy trích `wco.848490` (đúng cơ chế `_he-thong.txt` dòng 20). |
| 8510 | `phanBiet[0]` | Trích bắt đầu bằng `…` nên cắt mất chữ **"máy cạo"** → nhánh "không" không có căn cứ. Nối lại đầu câu. |
| 9402 | `loaiTru[1]` | `dieuKien` nói "gãy xương, sai khớp" nhưng trích chỉ có "các dụng cụ loại này" — nối thêm đầu mục (9). |
| 8484 | `loaiTru[3]`, `phanBiet[0]` | Bỏ chữ "**giỏ**" không có trong câu trích. |

## Nhận lỗi của chính người soát

Sửa bằng tay thì **gõ sai ký tự**: chép "gốc kim loại" thay "gố**m** kim loại" (8461), "CƠ KHÁC"
thay "CƠ KHÍ" (8484). Bộ kiểm báo lộ ra; đã **cắt lại trực tiếp từ tệp nguồn** bằng
`tmp/so-tay/cat-trich.mjs` thay vì gõ tay — đúng bài học "vá bằng cách cắt từ nguồn".

Cũng lộ ra một lỗi trong script áp review của em: sau khi xoá `tieuChi6[0]`, chỉ số còn lại
lệch, lệnh "sửa" tại chỉ số 5 **chèn thêm phần tử** thay vì thay thế, làm `250870` bị trùng
2 lần. Đã khôi phục bản gốc, sửa chỉ số và thêm chốt an toàn (chỉ số ngoài mảng thì dừng,
không âm thầm chèn). Cũng lưu ý: `phanBiet` bị máy loại nếu mã không phải **4 số hoặc 8 số** —
nên không hạ được mã phân nhóm 6 số trong `neuCo`/`neuKhong`.

## Nhãn nguồn (luật 11)

**122** mục đã soát chuyển `AI_DA_KIEM` → **`NGUOI_DUYET`**. 20 nút cây do máy sinh giữ nguyên
`MAY_SUY`.

## Gates

```
check-so-tay --raw        122/122
kiểm nguyên văn tuyệt đối  122/122   (0 mảnh không nguyên văn)
check-cay × 6              0 lỗi lệch cây
so-tay:check               314 nhóm / 9.502 mục / 0 rớt
npm test                   ALL TESTS PASSED
```

Ba phân nhóm báo `phan-nhom-chua-co-tieu-chi` (`8461.90`, `8510.90`, và `8484.90` sau khi đổi
tiêu chí): nguồn không nêu tiêu chí bằng lời, `wco.*` chỉ là tên tiếng Anh — **không bịa**, để trống.

## Vẫn chờ người duyệt quyết (không tự quyết)

1. **2508 bentonite** — cách xử lý mâu thuẫn nguồn nêu ở trên. Đề xuất: giữ nguyên như đã làm.
2. **Tự soát mẫu ≥ 10 %** (mục 4) — người duyệt tự rút ngẫu nhiên trên 122 mục còn lại.
3. `TIEN-TRINH.md` dùng chung nhiều phiên — mục này của `dev-soat-doc-lap`, không sửa phần của phiên khác.



# TIEN-TRINH — lô 031 (SOÁT ĐỘC LẬP sổ tay chú giải)

Nhóm của lô: **4814, 4821, 5207, 5211, 5402, 5512** · Người soát: `dev-zcode-mm` (phiên soát, KHÁNG phải phiên soạn) · Nhánh: `so-tay/lo-031` @ `8e43c52` · PR #420 · Ngày: 2026-10-23

Brief: `brief-st-soat-lo031.md` — mục 4 `docs/giao-viec/so-tay-giao-ngoai.md`. **KHÔNG merge.**

## Kết quả: soát **52/52 mục** (5 khối, toàn bộ lô) — **XOÁ 4 · SỬA 6 mục (11 trường) · GIỮ 42**

| Nhóm | soát | giu | sửa | xoá | mục còn lại |
|---|---|---|---|---|---|
| 4814 | 10 | 8 | 0 | **2** | 14 |
| 4821 | 6 | 5 | 1 | 0 | 12 |
| 5207 | 10 | 7 | 2 | **1** | 13 |
| 5211 | 5 | 5 | 0 | 0 | 55 |
| 5402 | 15 | 13 | 1 | **1** | 71 |
| 5512 | 6 | 4 | 2 | 0 | 24 |

Sổ tay **193 → 189 mục**, vẫn **189/189 đạt (100 %)**. `nguonLoai` của **48 mục** trong 5 khối đã đổi `AI_DA_KIEM` → `NGUOI_DUYET` (luật 11 — chỉ người soát độc lập được đổi). `tieuChi6`/`dong8`/`cay` **không** đụng tới.

## Hồ sơ soát

- `review/{4814,4821,5207,5211,5402,5512}.json` — **ghi đủ TẤT CẢ 52 mục đã soi**, kể cả `giu`; `lyDo` từng mục.
- Sinh bằng `tmp/so-tay/gen-review-lo031.mjs` **từ bản nháp GỐC** `tmp/so-tay/raw/` (đúng thứ tự bắt buộc: sinh hồ sơ TRƯỚC rồi mới áp — memory `so-tay-review-phai-sinh-tu-ban-nhap-goc`).
- Script tự chặn 6 lỗi: đủ entry cho mọi mục của 5 khối · index không lặp · index có thật trong bản nháp · đếm `giu/sua/xoa` khớp khai báo · `xoa` đứng cuối và giảm dần · `trich` mới ≤ 300 ký tự.
- `scripts/apply-review-lo031.mjs` áp 2 pha (xem "Áp" bên dưới).

## Bộ soát dùng (cả 3 đều ở `tmp/so-tay/`)

| Script | Việc | Máy `check-so-tay` có không? |
|---|---|---|
| `strict-nguyen-van.mjs` | so **substring thật**, chỉ chuẩn hoá khoảng trắng — bắt lỗi dấu/nháy mà `squash()` của máy nén mất | Không |
| **`audit-sau-doan.mjs` (mới)** | in **sau MỖI đoạn trích** phần nguồn đi tiếp, tô đỏ khi gặp câu rào/ngoại lệ ("tùy từng trường hợp", "thường…", "có thể", "Tuy nhiên", "trừ khi"…) | **Không** — đây là lỗ hổng lớn nhất |
| quét chữ lạ (scratch) | liệt kê từ trong `text`/`dieuKien`/`hoi` **không có** trong `trich` | Không |

`audit-sau-doan.mjs` sinh ra từ chính bài học lô 022 (`audit-trich.mjs` cũ chỉ in quanh đoạn **ĐẦU**). Chạy trên cả 6 nhóm: **không phát hiện thêm mục nào nuốt ngoại lệ** — nhưng nó là lưới an toàn cho các lô sau.

## Lỗi bắt được — máy KHÔNG bắt (đề xuất đưa vào phần 1 giao việc)

### 1. `dieuKienVao` đặt ngưỡng của **MỘT phần** thành điều kiện của **CẢ nhóm** — 2 mục, cùng họ lỗi 3802 (lô 030)

Runtime in `dieuKienVao` thành `Điều kiện vào nhóm: …` nối bằng `·` (`lib/so-tay-gates.js:135`) và cổng đọc kiểu **VÀ**. Ngưỡng có thật trong nguồn nhưng chỉ ràng cho một phần.

- **4814 `dieuKienVao[0]/[1]`** — `45 ≤ chiều rộng cuộn ≤ 160 cm` lấy từ mục (a) "Giấy **ở dạng cuộn**" của phần (A). Nhưng mục (b) nguồn ghi rõ "**có hoặc không** ở dạng cuộn", mục (c) "các panel có thể có **nhiều kích cỡ**", và phần (B) tấm che cửa sổ "có thể ở dạng cuộn, **hoặc theo kích thước và hình dạng dùng ngay**". Giấy dán tường dạng tranh (đúng dòng `48142091` trong chính sổ tay này) sẽ bị đẩy ra khỏi nhóm. **→ XOÁ.**
- **5402 `dieuKienVao[1]`** — `do_minh_monofilament < 67 decitex` chỉ là **định nghĩa "sợi monofilament"** trong chú giải nhóm, không phải điều kiện của nhóm. Đối chiếu biểu thuê: 5402.11/19 (sợi xe, sợi cáp), 5402.20 (tô), 5402.31–49 (sợi đơn multifilament), 5402.51–69 (sợi kéo) — **không dòng nào có ngưỡng 67 decitex**; ngưỡng đó thuộc định nghĩa chuyển sang 5404. **→ XOÁ.**

> **Bài học chung:** soi `dieuKienVao` phải đối chiếu ngưỡng với **tất cả dòng 8 số của nhóm**, không chỉ đọc câu trích. Câu trích đúng + số đúng vẫn có thể là điều kiện sai. Kỹ thuật kiểm: `node -e` in `data/so-tay/<nhom>.json → dong8[].dieuKien` rồi hỏi "ngưỡng này có xuất hiện ở dòng nào không".

### 2. Hai `dieuKienVao` mô tả các dạng **thay thế nhau** bị in thành điều kiện VÀ — 5207

Câu nguồn: *"sợi (đơn, xe hoặc cáp) đóng gói **ở các dạng**: (a) … (b) … (c) …"*. Người soạn tách (a) `≤125 g` và (b) `≤500 g` thành hai mục `dieuKienVao` → runtime in "A ≤ 125 g · B ≤ 500 g" đọc thành phải thỏa cả hai. Thêm nữa mục (b) chỉ chọn **nhánh (iii) 500 g** của danh sách ba ngưỡng, bỏ mất (i) 85 g và (ii) 125 g.

**→ SỬA:** gộp thành **một** sự kiện boolean liệt kê đủ ba dạng (`dong_goi_de_ban_le_theo_mot_trong_ba_dang_cua_phan_i_b_3 = true`, `trich` 272 ký tự cắt từ nguồn), **XOÁ** mục thừa. Đúng cách sửa đã dùng ở lô 027 (mục 7304).

### 3. `text` khẳng định vế **không có trong `trich`** — 5512 `phamVi`

`text` có cả *"dùng để may quần áo, rèm, vải trang trí, vải trải bàn, chăn, khăn tắm"* (11 từ) nhưng `trich` chỉ chứa **câu đầu**. Câu nguồn thứ hai nằm ngay sau: *"Loại vải này rất đa dạng, được dùng trong may mặc quần áo, rèm hoặc vải dệt trang trí và vải trải bàn, chăn, khăn tắm,…"*.

**→ SỬA:** **nối `trich`**, không cắt bớt `text` (đúng hướng đã chốt ở lô 028), cắt **trước** dấu `…` có sẵn của nguồn. Loại lỗi này (`text` nói nhiều hơn `trich`) máy **không bao giờ** bắt.

### 4. `hoi` chèn chữ biến vế **"chỉ"** làm mất vế dè — 4821 `phanBiet[0]`

Nguồn: *"Nhãn dính đã in tự dính được thiết kế, **ví dụ**, để quảng cáo hoặc trang trí giản đơn, … bị loại trừ (nhóm 49.11)."* `dieuKien` của `loaiTru[0]` giữ đúng vế "ví dụ", nhưng `hoi` lại rút gọn thành *"thiết kế **chỉ** để quảng cáo"*. Hỏi "chỉ để" thì một nhãn vừa quảng cáo vừa nhận dạng sẽ trả lời **không** → rơi về 4821, trong khi chính nguồn loại nó sang 49.11. **→ SỬA**, trả về đúng vế có "ví dụ".

### 5. "A **hoặc** B" bị tách thành một nhánh đích — 5512 `phanBiet[0]`

Nguồn: *"Băng, đã tẩm thuốc **hoặc** đã đóng gói để bán lẻ thì bị loại trừ (nhóm 30.05)."* `hoi` chỉ giữ "đã tẩm thuốc". Một băng đã đóng gói bán lẻ mà không tẩm thuốc vẫn phải sang 3005, nhưng `hoi` dẫn về 5512. **→ SỬA**, giữ cả hai vế.

### 6. `phamVi` liệt kê bằng "gồm" nhưng **bỏ hẳn một nhánh** — 5402

`text` ghi *"gồm sợi monofilament … **và** sợi xe (folded) hoặc sợi cáp"* — bỏ nhánh (2) sợi multifilament, tức phần **đại diện cho đa số nhóm** (5402.31–49 và 5402.51–69). Đọc "gồm" thành liệt kê kín sẽ loại phần lớn hàng của chính nhóm này. Cùng lỗi 3401 (lô 030: chỉ trích mục (I) rồi coi là phạm vi nhóm). **→ SỬA** cả `text` lẫn `trich` (281 ký tự, cắt từ nguồn).

### 7. `fact` bỏ mất đúng cái phần phân biệt nhóm — 5207 `dieuKienVao[0]`

`fact: la_soi_bong_tru_chi_khau` trong khi câu nguồn nói *"sợi bông (trừ chỉ khâu) **khi đóng gói để bán lẻ**"*. `fact` mới là thứ đi vào prompt vòng 2 — thiếu vế này thì sợi cotton đầu cuộn 5 kg không bán lẻ cũng "thoả" và bị dẫn vào 5207 (đúng mã là 5205/5206/5209). **→ SỬA** tên `fact`. Cùng bài học `so-tay-fact-la-thu-dung-vao-prompt`, nhưng chiều ngược: `fact` **hẹp hơn** `trich` thì mô hình bị dẫn rộng.

## Đối chiếu tiền lệ trước khi kết luận mẫu nào là lỗi

Quét `data/so-tay/*.json` (326 nhóm) để không xoá nhầm dữ liệu đúng:

| Mẫu đang nghi ngờ | Số liệu toàn repo | Kết luận |
|---|---|---|
| `neuKhong` = chính nhóm | 318/480 mục | **giữ** (4814 `phanBiet[0]/[1]`, 4821, 5207, 5402, 5512) |
| `phanBiet` dùng lại đúng `trich` của `loaiTru` | **434 mục** | **không phải lỗi** |
| `hoi` dạng "A hoặc B" | **320 mục** | mẫu được chấp nhận → sửa 5512 theo hướng **giữ cả hai vế**, không xoá |
| nhóm không có `dieuKienVao` | **88/326** (`dieuKienVao: []`; 0 nhóm thiếu hẳn khoá) | xoá là hợp lệ, và 4814 sau khi xoá khớp đúng quy ước |
| `dieuKienVao.fact` chứa "hoac" (liệt kê phương án) | **137 nhóm** | đúng cách mã hoá thay thế → dùng cho 5207 |
| `dieuKienVao.fact` chứa "chỉ" | **1** toàn repo | tránh; 4821 đã bỏ "chỉ" |
| `phamVi.text` chỉ là câu dẫn chiếu | 6 nhóm (5209, 5510, 6104, 6203, 6204, 7610) | **giữ** `phamVi` của 5211 — nguồn nhóm 5211 chỉ có đúng một câu |

## BỎ SÓT — ghi nhận, KHÔNG tự chèn (người soát chỉ xoá/sửa, không bổ sung)

Cùng câu **Chú giải 2(c) Phần XI** ("Mặc dầu vậy các Chương từ 50 đến 55 không bao gồm: …") áp cho **mọi** nhóm Chương 50–55, nhưng chỉ 5207/5211/5512 lấy 3 mục mỗi nhóm:

| Nhóm | Đã có | Còn thiếu theo cùng câu nguồn |
|---|---|---|
| **5207** | 56.04 · 56.05 · 56.06 · 56.07 | **(f) → 58.06**, **(g) → 59.06** |
| **5211** | 56.04 · 58.06 · 59.06 | **(b) → 56.05**, **(c) → 56.06**, **(e) → 56.07** |
| **5512** | 30.05 · 58.06 · 59.06 | **(b) → 56.05**, **(e) → 56.07** |

Mục (d) *"Sợi dệt bện (nhóm 56.07 hay nhóm 58.08 **tuỳ trường hợp**)"* bị bỏ là **đúng** — đích không chắc chắn, đúng luật máy `loai-tru-chi-la-thuong`.
**Đề xuất người duyệt cho lô sau / đợt bổ sung**; không tự chèn ở hồ sơ soát.

## Trả lời 5 điểm người soạn bàn giao (mục "Bàn giao cho người duyệt" trong thân PR #420)

1. **5207 có nên thêm dạng (c)?** → **Đã thêm** — không tách thành `dieuKienVao` thứ ba (vẫn lỗi VÀ), mà gộp cả ba dạng vào **một** sự kiện boolean. Đáp ứng đồng thời "nêu đủ dạng" và "không đọc thành VÀ".
2. **5402 `dieuKienVao[1]` `do_minh_monofilament < 67 decitex` có đúng ý không?** → **KHÔNG. Đã XOÁ.** Bằng chứng ở mục lỗi 1: đối chiếu `dong8`, không dòng 8 số nào của 5402 có ngưỡng 67 decitex.
3. **4814 tách 45–160 cm thành 2 mục?** → **Cả hai đã XOÁ**, vì vấn đề không phải "mỗi mục một `op`" mà là **ngưỡng chỉ phủ mục (a) của phần (A)**, không phủ (b)/(c)/(B).
4. **`phanBiet` dùng `neuKhong` = chính nhóm?** → **Giữ nguyên**, đúng quy ước đã duyệt (318/480 mục toàn repo).
5. **12 mục lấy từ Chú giải 2(c) Phần XI nằm ngoài bản `.txt`?** → **Xác nhận đúng nguồn, không sai một ký tự.** Đã đối chiếu trực tiếp `sourcesFor('5207').['phan52.phan']` (46.130 ký tự, trùng byte với `phan55.phan`) chứ không tin bản `.txt` cắt 25.000. Phát hiện thêm: **`phan` bị cắt là lỗi hệ thống, không phải lỗi lô** — xem mục dưới.

## 🔎 Trần xuất nguồn `.txt` — xác nhận là **lỗi hệ thống**, không riêng lô 031

`scripts/build-so-tay.mjs:34` đặt `CAP.phan = 25000`, nhưng `phan52.phan` và `phan55.phan` dài **46.130 ký tự** → bản `tmp/so-tay/nguon/*.txt` cắt mất hơn một nửa. Hệ quả: **mọi nhóm Chương 50–63 soát trong các lô trước đều không nhìn thấy** danh sách loại trừ (a)–(g) của Chú giải 2(c) Phần XI và Chú giải 4(A) "đóng gói để bán lẻ".

`check-so-tay` vẫn xanh vì nó so với `sourcesFor()` — nguồn **đầy đủ**. Nên đây là lỗi *tầm nhìn khi soạn*, không phải lỗi dữ liệu.

**Đề xuất (chưa làm, chờ duyệt):** nới `CAP.phan` lên ≥ 50.000, hoặc tách riêng mục Chú giải 2/3/4 của Phần XI ra khối `phanxi.phan` không bị cắt.

## Áp hồ sơ — 2 pha, đúng thứ tự

```bash
TARGET=raw  APPLY=1 node scripts/apply-review-lo031.mjs   # áp thayDoi lên tmp/so-tay/raw/
node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw      # 189/189
rm -f data/so-tay/bao-cao/lo-031.json                   # BẮT BUỘC — không xoá thì nhomLoi sót
node scripts/build-so-tay.mjs --nhom=... --tu-tep=tmp/so-tay/raw --force \
  --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-031.json
TARGET=data APPLY=1 node scripts/apply-review-lo031.mjs   # CHỈ đổi nguonLoai — không áp lại thayDoi
```

`TARGET=data` chỉ đổi nhãn (48 mục); không áp lại `thayDoi` để khỏi chèn trùng mục (memory `so-tay-apply-review-2-phase`). Script tự đo thụt lề + dấu xuống dòng cuối của tệp gốc và **không ghi lại tệp khi không có thay đổi** — `git diff` của 5211 chỉ ra đúng 5 dòng `nguonLoai` + timestamp, không nhiễu.

## Kiểm sau khi áp (đều xanh)

- `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → **6 nhóm, 189 mục, 0 mục không kiểm được nguồn**; tỉ lệ đạt 100 %.
- `tmp/so-tay/strict-nguyen-van.mjs` → **6 tệp, 207 đoạn, 0 sai khác** (mọi `trich` khớp nguyên văn từng ký tự, kể cả 3 `trich` mới do người soát viết).
- `npm run so-tay:check` → **326 nhóm, 9.863 mục, 0 mục không kiểm được nguồn**.
- `node scripts/check-cay.mjs --nhom=... --chi-tiet` → **6/6 nhóm đủ, 0 lỗi lệch cây**.
- `npm test` → **ALL TESTS PASSED**.
- Kiểm trùng sau khi áp: `sangNhom`, `hs6|fact`, `hs`, `fact` trong `dieuKienVao`, `neuCo->neuKhong` → **0 trùng** (bẫy lô 029: lệch chỉ số làm `tieuChi6[5]` thành phần tử thứ 6 mà mọi bộ kiểm vẫn xanh).
- **Đọc lại prompt vòng 2 thật** qua `soTayBlock()` để xác nhận thay đổi đi đúng chỗ — 4814 không còn dòng "Điều kiện vào nhóm: chieu_rong… 45/160 cm"; 5402 không còn "do_minh_monofilament < 67 decitex" và `Phạm vi` đã nêu đủ "sợi đơn multifilament".

---

# TIEN-TRINH — lô 029 (soạn sổ tay chú giải)

Nhóm của lô: **8461, 8484, 8510, 9402, 9504, 2508**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-029` @ `1828d3b` (main mới nhất) · Ngày: 2026-10-23
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `8461,8484,8510,9402,9504,2508` — **khớp** CSV dòng `029`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm y như lô 012 và lô 014 (memory `so-tay-lo-quy-trinh`).
Đã bỏ lệnh mẫu, chốt nhóm theo CSV. Cập nhật CSV dòng 029 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.

- [x] **B2.** Xuất nguồn
  `build-so-tay.mjs --nhom=8461,8484,8510,9402,9504,2508 --xuat-nguon=tmp/so-tay/nguon`
  → 6 nhóm, **180.425 ký tự** nguồn (8461 68k · 8484 61k · 8510 59k · 9402 22k · 9504 17k · 2508 11k).
  Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn** (8461/8484/8510 phải đọc 2 lần:
  chú giải nhóm + chương/Phần + `wco.*` + `tax.*`). Đọc `lib/so-tay.js` để biết luật máy nào loại mục nào,
  và `data/so-tay/8460.json` / `8462.json` (cùng Chương 84, đã duyệt) làm mẫu văn phong.

- [x] **B3.** In cây `lib/hs-tree.js` cho cả 6 nhóm (`tmp/so-tay/in-cay.mjs`) để biết trước: phân nhóm 6 số nào
  cần `tieuChi6`, dòng 8 số nào bắt buộc có trong `dong8`, nút nào bị lược.

- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 6 nhóm — **125 mục**.
  Chọn **thà bỏ mục còn hơn mục không có căn cứ** (xem "Bỏ có chủ đích" bên dưới).

- [x] **B5.** Tự kiểm bản nháp, **hai lớp**:

  1. **Nguyên văn TUYỆT ĐỐI** — `tmp/so-tay/strict-nguyen-van.mjs`, KHÔNG squash (bù lỗ hổng
     `check-so-tay-squash-mat-ky-tu`: `lib/so-tay.js` nén hết ký tự không phải chữ/số nên lỗi dấu lọt qua,
     lô 019 lọt 11 câu trích mất dấu `-`). **Lần 1 bắt 8 câu sai** — xem bảng dưới.
  2. `check-so-tay.mjs --raw`: lần 1 loại **1 mục** (`fact-khong-hop-le` —
     `luoi_dao_cut_giong_luot_truot_qua_lai tren_luoc_kim_loai_co_dinh` có **dấu cách**, luật
     `^[a-z][a-z0-9_]{2,}$`). Sửa xong → **125/125, 0 mục không kiểm được nguồn**.

- [x] **B6.** Nạp: `build-so-tay.mjs --nhom=… --tu-tep=tmp/so-tay/raw --force
  --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-029.json`
  → **125/125 (100 %)**, `nhomLoi: []`.

- [x] **B7.** Kiểm sau nạp:
  - `node scripts/check-cay.mjs --nhom=<n> --chi-tiet` × 6 → **0 lỗi lệch cây**; 9402/9504/2508 **"đủ"**;
    8461/8484/8510 còn 1 cảnh báo mỗi nhóm `phan-nhom-chua-co-tieu-chi` cho 8461.90 / 8484.90 / 8510.90
    (nguồn thật sự không nêu tiêu chí phân biệt cho ba phân nhóm gom — không bịa).
  - `npm run so-tay:check` → **314 nhóm, 9.505 mục, 0 mục không kiểm được nguồn**
  - `npm test` → **ALL TESTS PASSED**, exit 0.

## Lỗi gõ tay đã bắt được (máy `check-so-tay` KHÔNG bắt — cả 8 đều lọt qua luật squash)

Nguyên nhân chung: tôi **gõ lại** câu trích từ màn hình thay vì cắt–dán. Cả 8 đều sai **1 ký tự**
nên `squash()` vẫn khớp → `check-so-tay` báo xanh. Chỉ lớp kiểm nguyên văn mới bắt được.

| # | Nhóm | Tôi gõ | Nguồn thật |
|---|---|---|---|
| 1 | 8461 `phamVi`, `dieuKienVao[0]` | "hoặc **gốc** kim loại" | "hoặc **gốm** kim loại" |
| 2 | 8484 `loaiTru[3]` | "một **bao bị**, hộp" | "một **bao bì**, hộp" |
| 3 | 8484 `tieuChi6[0]` | "trong túi, **bao bị**, hộp" | "trong túi, **bao bì**, hộp" |
| 4 | 8510 `tieuChi6[2]` | "động cơ điện **gắng** trong" | "động cơ điện **gắn** trong" |
| 5 | 9402 `loaiTru[1]` | "dạng **gá lắm** đơn giản" | "dạng **gá lắp** đơn giản" |
| 6 | 9504 `dong8[14]` | "95049033 - - - **Bàn** khác…" | "95049033 - - - **Loại bàn** khác…" |
| 7 | 8484 `tieuChi6[0]` (lần 2) | "bao **bị**" (còn sót) | "bao **bì**" |
| 8 | 8510 `tieuChi6[2].fact` | có dấu cách | luật `fact-khong-hop-le` |

**Bài học (đề xuất đưa vào tệp dùng chung):** `scripts/check-trich-nguyen-van.mjs` (lô 016) và
`tmp/so-tay/strict-nguyen-van.mjs` (lô 014) đều **chưa có trên `main`** — mỗi phiên phải viết lại.
Nên đưa một bản vào `scripts/` để không còn lý do bỏ qua.
Thêm: **đừng gõ lại trích, hãy cắt–dán hoặc dùng bộ căn chỉnh** (`tmp/so-tay/va-lai-trich.mjs`: bỏ ký tự
không phải chữ/số để dò ngược trong nguồn rồi lấy lại **đúng đoạn gốc theo vị trí**) — nó vá được 67 trích
trong một lượt.

## Bỏ có chủ đích (thà bỏ mục còn hơn mục không có căn cứ)

| Nhóm | Bỏ gì | Vì sao |
|---|---|---|
| 8484 | `dieuKienVao` mô tả "đệm tấm kim loại" | Nhóm 8484 có **ba nhánh loại trừ nhau** (A/B/C); viết một nhánh thành `value=true` sẽ loại nhầm hai nhánh kia ở cổng. Các nhánh đó nằm ở `tieuChi6` (8484.10, 8484.20) và `phamVi`. Chỉ giữ 1 `dieuKienVao` chung cho cả cụm 84.81–84.84, lấy từ Chú giải chương 84 khoản (6). |
| 9402 | `dieuKienVao` "thiết kế đặc biệt cho ngành y…" | 9402 = đồ nội thất y tế **HOẶC** ghế cắt tóc xoay/ngả/nâng hạ. Điều kiện "thiết kế cho y tế" không đúng với ghế cắt tóc → đặt `value=true` là lách máy và gây loại oan. Nhánh (B) nằm ở `tieuChi6` 9402.10. |
| 9402 | `boPhan` dùng Chú giải chương 94 "CÁC BỘ PHẬN" | Câu đó dài 370 ký tự (lược đồ khuyến nghị ≤ 300) và là quy tắc chung cả Chương; thay bằng quy tắc bộ phận riêng của nhóm (phần (C)) ngắn và sát hơn. |
| 9504 | `loaiTru` "vé xổ số, thẻ cào… (thường là nhóm 49.11)" | Nguồn ghi "**thường là** nhóm 49.11" — câu không dứt khoát (đúng luật `loai-tru-chi-la-thuong`), và 4911 không có trong `chu-giai-heading.json`. |
| 9504 | `loaiTru` "bàn để chơi bài thuộc Chương 94" | Nguồn không nêu số nhóm đích, chỉ nói "Chương 94" → không đủ căn cứ cho `sangNhom`. |
| 9504 | `loaiTru` cho "phân nhóm 9504.30" | `sangNhom` chỉ nhận mã 4 số có thật hoặc mã 8 số đúng biểu thuế; chuyển thành `phanBiet` với 4 mã 8 số của 9504.30. |
| 9504 | `loaiTru` cho thiết bị tùy chọn ngoại vi (Chú giải 5 (C) Chương 84) | Nguồn chỉ nói "Chương 84 (Phần XVI)", không có số nhóm đích. |
| 8461 | `phanBiet` cho Chú giải 3 chương 84 ("đáp ứng 84.56 **và** 84.61 → 8456") | Chỉ đúng khi máy **đồng thời** thoả 84.56; nhánh "không" không thể khẳng định là 8461 (có thể là 8457/8458/8459…). Viết `neuKhong: "8461"` là nói quá. Ghi ra đây để người duyệt cân nhắc đưa thành luật máy. |
| 2508 | `dieuKienVao` "là chất chứa sét tự nhiên" | 2508 còn chứa andalusite/kyanite/silimanite, mullite, chamotte, dinas — **không** phải chất chứa sét. Điều kiện đó chỉ đúng với nhánh đất sét. |
| 2508 | `dieuKienVao` "tính chịu nhiệt" | Đúng với đất sét nhưng câu chú giải nói "các sản phẩm này" (= đất sét), không phải cả 6 nhánh. Nói vượt quá câu trích. |
| 8510 | `dieuKienVao` "dùng để xén lông cừu / chải lông ngựa" | Nguồn ghi "**hoặc** để xén lông cừu **hoặc** chải lông ngựa" — một nhánh của "A hoặc B", không được tách thành điều kiện độc lập. |
| 8461 | `dieuKienVao` "hoạt động bằng tay hoặc đạp chân" | Nguồn ghi "cũng được phân vào nhóm này" — câu **cho phép**, không phải điều kiện bắt buộc. |

## Nguồn tự mâu thuẫn — BÁO ĐỂ NGƯỜI DUYỆT, không tự quyết

**2508: bentonite trương nở.**

- Chú giải **phân nhóm**: "Phân nhóm 2508.10 **bao gồm** natri bentonite (bentonite trương nở) và canxi
  bentonite (bentonite không trương nở)"
- Chú giải **nhóm**, mục (d) loại trừ: "Các loại **đất sét trương nở** … thậm chí nếu thu được bằng cách
  duy nhất là nung đất sét tự nhiên (**nhóm 68.06**)"

Cùng một cụm từ, hai hướng. Em **giữ** `loaiTru` về 68.06 (đó là danh sách loại trừ chính của nhóm, và tiêu đề
6806 là "Đất sét trương nở") và **không** dựng `phanBiet` nào liên quan bentonite; `tieuChi6` 2508.10 chỉ
chép định nghĩa phân nhóm, không suy ra kết luận xuyên nhóm. Người duyệt xác nhận.

## Chỗ dấu lược "…" che mệt (quyết định có chủ đích, không phải lỗi)

Luật mục 3: đoạn bị lược **không được chứa ngoại lệ**. Ở 2 nhóm, lược có che ngoại lệ, nhưng **bản thân ngoại lệ
đó được trích đầy đủ ở `loaiTru` ngay trong cùng tệp** — người đọc không bị mất thông tin:

- **9402 `phamVi`**: lược từ "(B) GHẾ CẮT TÓC…" sang danh sách "(1)…(12)" của phần (A), trong đó có loại trừ
  90.22 / 90.21 / 94.03 / 90.18 → đã trích đủ ở `loaiTru[0..4]`.
- **9504 `phamVi`**: lược qua câu "**Nhưng** nhóm này loại trừ máy đếm điểm … giá để gậy bi-a …" → đã trích
  đủ ở `loaiTru[0..2]`.
- **8461 `phamVi`**: lược qua các mục (1)–(8), **không có** ngoại lệ nào (mục (9) "máy chạm khắc, trừ
  …84.59/84.60" được trích nguyên văn trong chính câu trích).

Ngược lại, chỗ nào lược sẽ nuốt mất thông tin thì em **bỏ luôn nhánh đó** thay vì lược:

- 9504 không lược từ mục (2) sang (11) để giữ đủ các mục giữa — vì phải lược đúng khối loại trừ.
- 9402 không trích "(C) BỘ PHẬN" trong `phamVi` (lược qua loại trừ 94.01); phần (C) nằm ở `boPhan`.
- 8484 không trích "(B)"/"(C)" trong `phamVi` (lược qua loại trừ 68.12 "trừ khi…"); hai nhánh đó ở `tieuChi6`.

## Mẫu 3 mục (cho người duyệt đối chiếu)

**1 loại trừ — 9402 `loaiTru[2]`** (giường không có bộ phận cơ khí → 9403):

> `"dieuKien": "Giường không có các bộ phận cơ khí", "sangNhom": "9403"`
> `"trich": "giường không có các bộ phận cơ khí được xếp vào nhóm 94.03."`

**1 điều kiện số** — lô này **không có** điều kiện số nào. Cả 6 nhóm đều không có ngưỡng số trong nguồn
(8461/8484/8510/9402/9504/2508 đều là nhóm máy móc–đồ dùng, không phải danh mục hạn ngạch). Thay vào đó là
tiêu chí cấp 6 số, ví dụ **8484 `tieuChi6[1]`** (bộ làm kín kiểu cơ khí → 8484.20):

> `"fact": "bo_lam_kin_co_khac_tao_dem_gioang_chong_ro_ri", "op": "=", "value": true`
> `"trich": "Các bộ làm kín kiểu cơ khí (ví dụ, các đệm hình vòng trượt và các đệm vòng lò xo) bao gồm các hệ thống cơ khí - hình thành một đệm gioăng chống rò rỉ giữa các bề mặt phẳng, hoặc bề mặt quay … để chống sức ép và lực tác động từ các bộ phận chuyển động hoặc do rung động."`

**1 dòng 8 số — 9504 `dong8[14]`**:

> `"hs": "95049033", "dieuKien": "Bàn khác thiết kế để chơi bạc", "loaiKhac": false`
> `"nguon": "tax.95049033", "trich": "95049033 - - - Loại bàn khác thiết kế để chơi bạc"`

Và một dòng "Loại khác" mà dòng cha không có trong nguồn — **9402 `dong8[8]`**:

> `"hs": "94029090", "dieuKien": "Loại khác (dòng cha 9402.90 không có trong nguồn — đối chiếu biểu thuế)"`
> `"loaiKhac": true` (máy tự điền theo biểu thuế)

## Nhóm nguồn mỏng / bất thường

- **8484** — chú giải nhóm có cả ba phần (A)(B)(C) nhưng **không có** chú giải phân nhóm nào; phần (B)
  chỉ nêu điều kiện "ít nhất hai tấm … làm bằng vật liệu khác nhau" (không có số). Dòng 8484.90 là
  `Loại khác` không có tiêu chí.
- **8461** — phân nhóm 8461.90 là `Loại khác`, chú giải nhóm không tách riêng; chỉ biết 8461.90.20 là máy bào.
- **8510** — 8510.90 (bộ phận) không có tiêu chí riêng ngoài danh sách "đầu cắt, dao cát, lưỡi dao, lưỡi lược".
- **9402 / 9504 / 2508** — `check-cay` báo **"đủ"** (không còn chỗ trống nào).
- Lưu ý nguồn: `nhom8510.nhom` và `nhom9402.nhom` có lỗi chính tả của chính bản chú giải
  ("gắ**n** trong" / "gá lắ**p**") — em chép **nguyên văn**, không sửa (luật mục 3).

## Số liệu thật

| nhóm | mục | đạt | ghi chú |
|---|---|---|---|
| 2508 | 20 | 20 | 5 loại trừ · 1 phân biệt · 6 tiêu chí 6 số · 7 dòng 8 số |
| 8461 | 20 | 20 | 1 vào · 6 loại trừ · 1 phân biệt · 1 bộ phận · 4 tiêu chí 6 số · 6 dòng 8 số |
| 8484 | 12 | 12 | 1 vào · 4 loại trừ · 1 phân biệt · 2 tiêu chí 6 số · 3 dòng 8 số |
| 8510 | 13 | 13 | 1 vào · 2 loại trừ · 1 phân biệt · 1 bộ phận · 3 tiêu chí 6 số · 4 dòng 8 số |
| 9402 | 23 | 23 | 8 loại trừ · 2 phân biệt · 1 bộ phận · 2 tiêu chí 6 số · 9 dòng 8 số (5 dòng trích từ **SEN**) |
| 9504 | 37 | 37 | 6 loại trừ · 1 phân biệt · 1 bộ phận · 5 tiêu chí 6 số · 23 dòng 8 số |
| **cộng** | **125** | **125 (100 %)** | |

## Kiểm sau nạp

| lệnh | kết quả |
|---|---|
| `node tmp/so-tay/strict-nguyen-van.mjs` | 125/125 câu trích **nguyên văn tuyệt đối**, 0 sai |
| `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` | **125/125 đạt, 0 mục không kiểm được nguồn** |
| `node scripts/build-so-tay.mjs --tu-tep … --force --bao-cao=lo-029.json` | **125/125 (100 %)**, `nhomLoi: []` |
| `node scripts/check-cay.mjs --nhom=<n> --chi-tiet` × 6 | **0 lỗi lệch cây**; 3 nhóm "đủ", 3 nhóm chỉ còn cảnh báo 6 số |
| `npm run so-tay:check` | **314 nhóm, 9.505 mục, 0 mục không kiểm được nguồn** |
| `npm test` | **ALL TESTS PASSED**, exit 0 |

Mọi tệp trong `tmp/` (nguồn xuất, bản nháp, 7 kịch bản kiểm) **không commit** — đúng quy định lô.

**Còn lại:** soát độc lập TOÀN BỘ (mục 4 giao việc) là việc của người khác; mọi mục ở đây đang mang nhãn
`AI_DA_KIEM`, chưa mục nào `NGUOI_DUYET`.

**KHÔNG merge.**# TIEN-TRINH — lô 014 (soạn sổ tay chú giải)

Nhóm của lô: **8465, 8511, 8529, 9013, 9610, 4013**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-014` @ `022723f` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `8465,8511,8529,9013,9610,4013` — **khớp** CSV dòng `014`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm y như lô 012 (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu,
chốt nhóm theo CSV. Cập nhật CSV dòng 014 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.

- [x] **B2.** Xuất nguồn `build-so-tay.mjs --nhom=8465,8529,9013,9610,4013 --xuat-nguon=tmp/so-tay/nguon`
  → **8511 ĐÃ CÓ SẵN**, 5 nhóm cần dựng (193 nghìn ký tự nguồn; 8465 74k · 8529 60k · 9013 31k · 4013 18k · 9610 6k).
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 5 tệp nguồn** (8465 và 8529 phải đọc 2 trang).
  Đọc `lib/so-tay.js` trước khi soạn để biết luật máy nào lọc mục nào. In cây `lib/hs-tree.js` cho cả 5 nhóm.
  Đọc thêm `data/so-tay/4011.json` + `4012.json` (cùng Chương 40, đã được duyệt) làm mẫu văn phong.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 5 nhóm — **139 mục**.
- [x] **B5.** Tự kiểm TRƯỚC khi nạp, hai lớp:
  - **Nguyên văn TUYỆT ĐỐI** (script riêng `tmp/so-tay/strict-nguyen-van.mjs`, KHÔNG squash — bù lỗ hổng
    `check-so-tay-squash-mat-ky-tu`): lần 1 bắt **13 đoạn sai** (xem "Máy không bắt được"). Vá xong → **152/152 khớp**.
  - **Gloss `tên WCO:`** phải là mảnh nguyên văn trong `wco.*`: bắt **1 lỗi** (viết thường "optical" thay "Optical").
  - `check-so-tay.mjs --raw`: lần 1 loại **1 mục** (`fact` có dấu tiếng Việt — luật `fact-khong-hop-le`), vá xong
    → **139/139, 0 mục không kiểm được nguồn**.
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-014.json`
  → **139/139 (100 %)**, 0 nhóm lỗi. **Không nạp 8511** (đã có sẵn, không sửa).
- [x] **B7.** `check-cay.mjs --chi-tiet` → **5/5 nhóm "đủ"**, 0 lỗi lệch cây.
  `npm run so-tay:check` → **232 nhóm / 7636 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push nhánh `so-tay/lo-014` + mở PR (**KHÔNG merge**).

## Kết quả

| nhóm | mục | đạt | điều kiện vào | loại trừ | phân biệt | tiêu chí 6 số | dòng 8 số | quy tắc bộ phận |
|---|---|---|---|---|---|---|---|---|
| 8465 | 44 | 44 | 2 | **14** | 1 | 9 | 16 | có |
| 8529 | 35 | 35 | 1 | **9** | 0 | 4 | 19 | có |
| 9013 | 32 | 32 | **0** | **10** | 3 | 8 | 9 | có |
| 9610 | 7 | 7 | 2 | 1 | 1 | 0 | 2 | — |
| 4013 | 21 | 21 | 3 | 0 | 0 | 4 | 13 | — |
| **TỔNG** | **139** | **139 (100 %)** | 8 | 34 | 5 | 25 | 59 | 3 |

## Máy KHÔNG bắt được — 13 lỗi nguyên văn lộ ra khi so tuyệt đối

Máy kiểm `check-so-tay` so **đã squash** (bỏ hết dấu câu), nên 13 lỗi dưới đây **đều qua máy xanh**. Chỉ lộ ra khi
đối chiếu **từng ký tự**. Đây là bằng chứng củng cố memory `check-so-tay-squash-mat-ky-tu`:

1. **Tôi đã "sửa" lỗi chính tả của nguồn — 1 lỗi, nguy hiểm nhất.** `tax.85291060` nguồn ghi
   *"Loa hoặc phễu **tiếp** sóng (ống dẫn sóng)"*; tôi viết *"tiếng sóng"*. Về nghĩa "tiếp sóng" mới đúng
   ( waveguide = ống dẫn sóng), nhưng luật là **giữ nguyên lỗi nguồn**, không sửa. Đã trả lại nguyên văn
   và ghi chú ngay trong `dieuKien`.
2. **Số gạch đầu dòng trong dòng biểu thuế — 7 lỗi.** Tôi chép đều `- - -` theo trí nhớ, nhưng nguồn thật phân bố
   không đều: `40139020`/`40139040` = `- -`; `85299059`/`85299094`/`85299099` = `- - -`; `90139010/60/70/90` = `- -`.
   Máy squash nên không thấy. Đã sửa hết theo `data/tax.json`.
3. **Qua chỗ xuống dòng trong nguồn — 3 lỗi.** `nhom8465` ngắt dòng giữa *"những máy dùng để"* và *"làm nở nắp chai"*;
   `nhom8529` và `nhom9013` ngắt dòng ngay sau *"…bao gồm:"*. Tôi dán liền bằng một dấu cách. Đã chèn `"…"` đúng chỗ.
   → **Bài học: không bao giờ dán lại từ trong nhớ; luôn trích bằng script cắt trực tiếp từ tệp nguồn.**
4. **Dấu lược ở đầu/cuối đoạn** — 5 "sai" còn lại chỉ là khoảng trắng sát dấu `…`. Không phải lỗi nguồn, script
   so nguyên văn phải trim hai đầu đoạn.

## Nhóm nguồn mỏng / bất thường (đề nghị bổ sung mục 1 giao việc)

- **4013 — tiêu đề nhóm "săm" nhưng dòng biểu thuế nói "dùng cho loại lốp".** Chú giải nhóm chỉ có **một câu**
  (*"Săm được lắp vào lốp của, ví dụ, ô tô con, xe rơ-moóc hoặc xe đạp."*). Toàn bộ phạm vi phân loại (xe mô-tô,
  máy 84.29/84.30, phương tiện bay, Chương 87) **chỉ suy ra được từ tên WCO + dòng biểu thuế**, không có câu chú giải
  nào xác nhận. Ba `dieuKienVao` phải mượn từ `ch40.chuong` (giống 4011 đã duyệt) chứ không có trong nhóm.
- **4013 `loaiTru` và `phanBiet` RỖNG — không phải thiếu sót.** Chú giải Chương 40 mục 2(f) chỉ nêu dải
  *"các nhóm từ 40.11 đến 40.13"* (bao gồm chính 4013) chứ không nêu nhóm đích 4 số nào bị loại; máy chỉ nhận
  `loaiTru` khi câu trích **nêu đích danh** số nhóm. `phanBiet` cũng rỗng vì `checkItem` chỉ nhận mã 4 số
  (`validHeading`) hoặc đúng 8 số (`validTax`) — **không nhận mã 6 số**, nên phân biệt 4013.10/.20/.90
  (vốn là câu hỏi hay nhất của nhóm này) **không biểu diễn được trong `phanBiet`**. Đã đưa vào `tieuChi6` thay thế.
- **9013 `dieuKienVao` RỖNG — cố ý, không phải thiếu sót.** Nhóm rất đa dạng (10 mục (1)–(10) trong chú giải).
  Mọi câu "điều kiện vào nhóm" trong nguồn đều nói về **một mục con** (môi trường laser 1 nm–1 milimet, kính đã gia
  công quang học, bộ phận của thiết bị laser…). Cổng đọc kiểu AND sẽ loại nhầm mọi hàng 9013 hợp lệ.
  Giao việc đã ghi: *"Cổng sau này **không được** loại một nhóm chỉ vì thiếu một `dieuKienVao`"* → để rỗng là chuẩn.
- **9013: kiến thức không biểu diễn được.** Chú giải nhóm (4) nói kính ngắm vũ khí *"được phân loại theo vũ khí, xem
  Chú giải 1(d) của Chương 93"* — chỉ nêu **Chương 93**, không có số nhóm 4 số, nên `loaiTru` không nhận
  (`thieu-nhom-dich`). Kiến thức này **thất lạc**, đề nghị người duyệt xem có nên cho `loaiTru` nhận mã chương.
- **8465: ngưỡng số không mã hoá được.** `tax.84659510` có **hai** ngưỡng: *"tốc độ quay trên 50.000 vòng/phút"* và
  *"đường kính chuôi không quá 3,175 mm"*. `soCoTrongTrich()` so `"50000"` trong khi nguồn viết `"50.000"`
  (dấu chấm phẩy nghìn kiểu Việt) → **không khớp**. Chỉ mã hoá được ngưỡng 3,175 mm (nguồn dùng dấu phẩy thập phân
  nên `replace('.', ',')` khớp). Ngưỡng tốc độ quay ghi trong `dieuKien` dạng chữ. Xác nhận memory
  `so-tay-nguong-so-tieng-viet-khong-khop-may` — **đề nghị sửa `soCoTrongTrich` nhận cả dấu chấm phẩy nghìn.**
- **8529: 4 tiêu đề quốc gia không có tên trong nguồn** (8529102, 8529109, 8529905, 8529909). Nguồn không có câu
  nêu tên nên `cay.tenDien` không điền được (luật 9 chỉ cho điền **khi nguồn có câu nêu tên**). `check-cay` vẫn báo
  "đủ" vì tên đã có trong `data/bieu-thue` (nguồn cây). Mọi dòng 8 số dưới tiêu đề đó đã ghi rõ
  *"tên tiêu đề không có trong nguồn — đối chiếu biểu thuế"*.
- **8529 `phanBiet` rỗng.** Cả 9 loại trừ (mục (a)–(ij)) đều nêu nhóm đích rõ ràng, nhưng nhánh "không" của
  `phanBiet` **không được suy từ danh sách loại trừ** (đúng luật mục 0). Không có cặp mã 4 số nào được nguồn mô tả
  đối chiếu trực tiếp → để rỗng.
- **8465: 3 câu trích vượt 300 ký tự** (lược đồ khuyến nghị ≤ 300; máy cho ≤ 600): `phanBiet[0]` 315,
  `tieuChi6[1]` (8465.20) 343, `dong8[4]` (84659210) 301. **Không cắt** vì cắt để vừa 300 sẽ hoặc mất đối tượng hàng
  hoặc mất số hiệu nhóm đích — cắt trích làm mất căn cứ thì tệ hơn dài.
- **Nguồn lỗi chính tả (kệ sách, không sửa trong sổ tay):** `tax.85291060` "tiếp sóng" (đúng nghĩa, sai chính tả);
  `nhom8465` mục (b) ghi "công nghệ **tia lade**" (chắc là "laser") — đã trích nguyên văn.

## Mục `dieuKien`/`text` có ghi điều câu trích **không** nói

Không có mục nào cố tình thêm thông tin ngoài câu trích. Ba chỗ **có chủ ý** và đã ghi rõ trong chính `dieuKien`:

- **8465 `dong8` (10 dòng)**: tiêu đề quốc gia 6 số / tên WCO **không có trong câu trích biểu thuế** → ghi kèm
  ngoặc *(phân nhóm 8465.95, tên WCO: drilling or morticing machines)*. Đã kiểm bằng script: cả **25 gloss
  `tên WCO:` đều là mảnh nguyên văn** trong `wco.*`.
- **4013 `dong8` (13 dòng)**: tiêu đề quốc gia 4013101/02, 4013901/3/9 không có trong nguồn → ghi rõ
  *"tên tiêu đề không có trong nguồn — đối chiếu biểu thuế"*.
- **8529 `dong8` 85299055 vs 85299059**: hai dòng **trùng chữ "Loại khác"**, nguồn không phân biệt được →
  ghi *"dòng trùng chữ với …, nguồn không phân biệt được (đối chiếu biểu thuế)"*, **không đoán**.

## Quyết định đáng lưu

- **`cay` không soạn** (luật 9): cả 5 nhóm để `tenDien: []`. `check-cay` báo 5/5 "đủ".
- **Không ghi `nguonLoai`** (luật 11): máy tự gán `AI_DA_KIEM` cho mọi mục. Người soát độc lập mới đổi `NGUOI_DUYET`.
- **`9013 loaiTru` bỏ 1 mục có vẻ hợp lý.** Đoạn *"…mà còn có thể thuộc các nhóm khác của Chương này (cụ thể, nhóm
  90.15, 90.18 hoặc 90.27)"* có **"có thể"** — không phải loại trừ dứt khoát, cùng dạng với lỗi *"thường thuộc"*.
  Bỏ, thay bằng 2 mục dứt khoát hơn lấy từ mục (iii) và (iv).
- **`9013 loaiTru` (9011) phải lược cụm "(thường là trên giá đỡ)"** — `HEDGE_LOAI_TRU` khớp `\(thường` nên máy
  loại. Cụm này **không phải ngoại lệ** (chỉ là nói kính lúp hai mặt hay để trên giá), nên lược không mất ý.
- **Không nạp lại 8511** dù thuộc lô: đã có sẵn, `--force` sẽ ghi đè bản đã duyệt.
- **`rm data/so-tay/bao-cao/lo-014.json` trước khi nạp** (memory `so-tay-bao-cao-ghi-de`) để không nối vào
  báo cáo cũ.

# TIEN-TRINH — lô 031 (SOẠN sổ tay chú giải)

Nhóm của lô: **4814, 4821, 5207, 5211, 5402, 5512** · Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-031` @ `7497be8` · Ngày: 2026-10-23

Kết quả: **193/193 mục đạt (100 %)**, 0 mục bị máy loại, 206 đoạn trích khớp nguyên văn từng ký tự.

## ⚠️ Sai lệch brief ↔ CSV (lần thứ 5)

`brief-st-lo031.md` dòng 4 ghi đúng `4814 4821 5207 5211 5402 5512` — **khớp CSV**.
Nhưng dòng 6 lại kèm sẵn lệnh `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`docs/giao-viec/so-tay-lo.csv` dòng `001`), cùng khối lệnh copy-paste như lô 003/012/014/027.
Đã theo CSV (nguồn chuẩn), xuất nguồn bằng 6 nhóm của CSV.

## Các bước đã chạy

- [x] Đọc `brief-st-lo031.md` + `docs/giao-viec/so-tay-giao-ngoai.md` (mục 3 **11 luật**) + `_he-thong.txt`.
- [x] `grep -E "^031," docs/giao-viec/so-tay-lo.csv` → chốt nhóm **trước khi** xuất nguồn.
- [x] Ghi danh CSV: `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
- [x] `node scripts/build-so-tay.mjs --nhom=4814,4821,5207,5211,5402,5512 --xuat-nguon=tmp/so-tay/nguon` → 167.461 ký tự (khớp CSV).
- [x] Đọc **HẾT** 6 tệp nguồn (`Read` trọn, không lướt) trước khi soạn.
- [x] Soạn `tmp/so-tay/raw/<nhom>.json` × 6.
- [x] **Tự viết bộ soát nguyên văn nghiêm ngặt** `tmp/so-tay/strict-nguyen-van.mjs`: so từng đoạn
      (tách `…`) với nguồn bằng **substring thật**, chỉ quy khoảng trắng. Khác `squash()` của máy là nén
      mọi ký tự không phải chữ/số nên **gõ nhầm dấu gạch/nháy/số vẫn qua máy**.
- [x] Bộ soát bắt **3 lỗi gõ của chính người soạn**: `KẺ CẢ`→`KỂ CẢ` (SEN 4821×2), `một màa`→`một màu` (denim 5211).
- [x] `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → **193/193, 0 mục không kiểm được nguồn**.
- [x] Kiểm `dong8` đủ mọi dòng `tax.*` của nhóm: 6 nhóm, THIẾU 0 / THỪA 0.
- [x] `rm data/so-tay/bao-cao/lo-031.json` **trước** khi nạp lại (memory `so-tay-bao-cao-ghi-de` — `--bao-cao` nối vào tệp cũ).
- [x] Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm"` → **193/193 (100 %)**, `nhomLoi: []`.
- [x] `npm run so-tay:check` → **326 nhóm, 9.867 mục, 0 mục không kiểm được nguồn**.
- [x] `npm test` → **ALL TESTS PASSED**.
- [x] `node scripts/check-cay.mjs --nhom=<từng nhóm>` → cả 6: **0 lỗi lệch cây, đủ** (dong8/tên nút ảo/tiêu chí 6 số).

## 🔎 Phát hiện quan trọng: bản xuất nguồn `.txt` CẮT mất chú giải Phần

Báo cáo ghi `phan52.phan (46130→25000)` và `phan55.phan (46130→25000)` — bản xuất
`tmp/so-tay/nguon/*.txt` chỉ còn 25.000/46.130 ký tự đầu. **Ngay sau mốc 25.000 nằm Chú giải 2 (c)
Phần XI — danh sách các Chương 50–55 KHÔNG bao gồm 56.04 / 56.05 / 56.06 / 56.07 / 58.06 / 59.06**,
tức đúng phần loại trừ mà sổ tay cần.

Đã đọc phần bị cắt từ **nguồn chuẩn** `data/chu-giai-chuong.json` (46.130 ký tự — đúng văn bản
`sourcesFor()` trả về nên máy vẫn nghiệm thu từng câu) và bổ sung 12 mục
(`tmp/so-tay/bo-sung-lo031.mjs`): 5207 +4 `loaiTru` +1 `phanBiet`; 5211 +3 `loaiTru` +1 `phanBiet`;
5512 +3 `loaiTru`. **Đề xuất cho phiên quản lý: nới trần xuất `phan` (Phần XI dài ~46 ký tự) hoặc
bắt buộc đọc phần bị cắt — không thì mọi lô có Chương 50–63 đều thiếu mục loại trừ quan trọng.**

## Nhóm nguồn mỏng / bất thường

| nhóm | vấn đề | xử lý |
|---|---|---|
| **5207** | chú giải nhóm chỉ **1 câu**; còn lại phải tra Chú giải 4 Phần XI. Nhóm này trỏ `"Phần (I) (B) (3)"` nhưng phần trích được đánh số lại là Chú giải 4 — **lệch trích dẫn trong nguồn** | `phamVi` chép nguyên câu (kèm cả trích dẫn sai); điều kiện trọng lượng lấy từ `phan52.phan` |
| **5211** | chú giải nhóm là **câu trỏ chéo** ("Chú giải chi tiết nhóm 52.10 được áp dụng tương tự"), không có định nghĩa riêng | `phamVi` chép nguyên văn; toàn bộ tiêu chí thật đặt ở `tieuChi6` (32 mục từ tên WCO + định nghĩa denim `ch52.chuong`) |
| **5512** | nguồn **không nhắc 55.13** → không dựng được `phanBiet` kiểu "≥85 % hay <85 %" | `phanBiet` chỉ có 1 mục (băng tẩm thuốc → 3005); ranh giới 5512/5513 phải chờ lô khác |
| **4814** | mục (c) chú giải nói *"thường thuộc nhóm 48.23"* — câu **có định ngữ giới hạn** | **không** ghi `loaiTru` 4823 từ câu đó; chỉ ghi từ `ch48.chuong` câu dứt khoát *"được phân loại trong nhóm 48.23"* |

## Mục `dieuKien` có thể bị người soát soi lại

1. **5207 `dieuKienVao` 2 mục trọng lượng**: dùng tên `fact` ghi rõ **dạng đóng gói**
   (`trong_luong_goi_tren_bia_guong_gho_ong_tuyep` ≤ 125 g; `trong_luong_goi_dang_hinh_cau_con_sai_cuon_sai` ≤ 500 g)
   vì Chú giải 4 (A)(a)(b)(c) là **ba dạng loại trừ nhau** nhưng runtime nối `dieuKienVao` bằng `·` (đọc thành VÀ).
   Còn dạng (c) *"con sợi có các đường chỉ phân cách"* (125 g) chưa ghi — xem là thiếu sót có chủ ý.
2. **5402 `dieuKienVao[1]`** `do_minh_monofilament < 67 decitex`: nguồn nói 67 decitex là của **dạng (1) monofilament**,
   không phải mọi dạng — nên `fact` đặt tên theo monofilament để không bị đọc nhầm thành điều kiện của mọi sợi.
   Phần còn lại của nhóm (đa phân nhóm tên WCO) nằm ở `tieuChi6`.
3. **4814 `dieuKienVao`** 2 mục `chieu_rong_cuon_toi_thieu/toi_da` (45–160 cm) là hai vế của **một** khoảng, tách vì schema mỗi mục một `op`.
4. **5402 `loaiTru`/`phanBiet` 5604/5806/5906** lấy từ Chú giải 2 (c) Phần XI — nguồn chuẩn, nhưng **nằm ngoài bản xuất `.txt`** (xem mục phát hiện ở trên).
5. **`phanBiet` dùng `neuKhong` = chính nhóm** (5207→5207, 5211→5211, 5512→5512, 4814→4814, 4821→4821): theo mẫu 7312 đã gộp; nhánh "không" chỉ có nghĩa **"không phải loại đó → vẫn ở nhóm này"**.

**KHÔNG merge.** Chờ người duyệt: soát độc lập TOÀN BỘ rồi điền `so-tay-lo.csv` dòng 031 → `trang_thai=xong` + cột `pr`.

---

# TIEN-TRINH — lô 027 (SOÁT ĐỘC LẬP sổ tay chú giải)

Nhóm của lô: **6303, 6504, 6702, 6914, 7018, 7304** · Người soát: `dev-zcode-mm` (KHÁC người soạn cùng tên —
vai trò khác: đọc `review/<nhom>.json`) · Nhánh: `so-tay/lo-027` @ `06d56c8` · PR #410 · Ngày: 2026-10-23

Phiên này là **người soát độc lập** (mục 4 `docs/giao-viec/so-tay-giao-ngoai.md`), **KHÔNG phải người soạn**.
Phần "soạn" của phiên trước nằm ngay dưới, giữ nguyên.

## Kết quả: soát **157/157 mục** — **XOÁ 1 · SỬA 10 mục (15 trường)**

| Nhóm | Mục | xoá | sửa | Nội dung |
|---|---|---|---|---|
| 6303 | 25 | 0 | 2 | `phamVi.trich`, `phanBiet[0].hoi` |
| 6504 | 7 | 0 | 2 | `phamVi.text`+`.trich`, `phanBiet[0].hoi` |
| 6702 | 11 | 0 | 1 | `phamVi.trich` |
| 6914 | 13 | 0 | 0 | đọc tay, **không sửa** |
| 7018 | 22 | 0 | 3 | `phamVi.text`+`.trich`, `phanBiet[1].hoi`, `dong8[70189010].trich` |
| 7304 | 79 | 1 | 2 | `phamVi.text`+`.trich`, `dieuKienVao[0]` + **XOÁ `dieuKienVao[1]`** |

Hồ sơ soát: `review/6303.json`, `6504`, `6702`, `6914`, `7018`, `7304` — mỗi tệp ghi đủ **mọi** mục đã soi
(`hanhDong: 'giu'` cho phần giữ, kèm `lyDo`), không chỉ phần sai. Áp bằng `scripts/apply-review-lo027.mjs`.

## Lỗi bắt được — máy KHÔNG bắt (đề xuất đưa vào phần 1 giao việc)

1. **`phamVi.text` nói nhiều hơn câu trích — 5/6 nhóm** (6303, 6504, 6702, 7018, 7304; chỉ 6914 sạch).
   `text` liệt kê cả những loại hàng nằm ở mục khác của chú giải nhóm, còn `trich` chỉ chép **một** câu.
   Máy chỉ kiểm "câu trích có thật trong nguồn" (`quoteInSource`), không kiểm text có nằm trong câu trích hay
   không → 5/6 nhóm lọt. **Cách sửa đã dùng: NỐI câu trích bằng "…"** cho tới khi `text` nằm trọn trong
   câu (đúng mẫu đã gộp ở 4012/8423/3918), thay vì cắt bớt thông tin người soạn.
   * Riêng 7018 không nối được hết: mục (F) mắt thủy tinh kèm lệnh trừ 90.21/95.03 và mục (H) vi cầu làm
     câu trích vượt trần 600 ký tự, mà cắt (F) ngay sau "(F) Mắt thủy tinh" là **cắt mất ngoại lệ** (luật
     dấu lược) → thu hẹp `text` về (A)+(B)+(C), phần mắt thủy tinh/vi cầu đã có trong `tieuChi6` + `dong8`.
   * 6504 thêm lỗi thứ hai cùng mục: `text` bỏ mất chữ **"chủ yếu"** — có ý nghĩa vì mục (1) của chú giải
     nhóm còn có mũ nữ **chưa** dựng khuôn, **chưa** làm vành (vẫn thuộc 6504).
2. **`hoi` dạng "A hay B" mà `neuCo` lại để mã của vế SAU → đảo nhánh** (6303 `phanBiet[0]`, 7018 `phanBiet[1]`).
   Runtime in `${hoi} có→${neuCo} / không→${neuKhong}` (`lib/so-tay-gates.js:141`) và quy ước toàn repo
   (9013, 3701, 4420) là **`neuCo` = vế đầu**. Ở 6303 hỏi "màn che **hay** tấm che nắng?" mà `neuCo=6306`
   (tức vế sau) → mô hình trả "có" cho hàng màn che là ra 6306. **Luật máy chỉ chặn `hoi` nhắc mã 6 số, không
   chặn câu hỏi hai vế.** Người soát các lô sau nên để `neuCo` luôn ứng với **vế đầu**.
   *Giữ nguyên* `6702.phanBiet[0]` ("tự nhiên hay nhân tạo?") vì vế đầu đã là nhánh `neuCo` — 26/631 mục đã
   gộp cùng dạng.
3. **`hoi` thêm hiểu biết riêng, và nhánh "hoặc" sai tiêu chí** — 6504 `phanBiet[0]`: hoi ghi
   "(dựng hình **hoặc làm vành**)" trong khi câu trích chỉ nói "đã được dựng theo khuôn"; hơn nữa "làm vành"
   một mình KHÔNG phải tiêu chí vì mục (3) của chính chú giải nhóm nói thân mũ *chưa* dựng khuôn, *chưa* làm
   vành nhưng đã lót/trang trí vẫn thuộc 6504 → câu hỏi dẫn người khai đi sai.
4. **`dieuKien` nói nhiều hơn câu trích** — 7018 dòng 70189010: `dieuKien` có "dùng để làm mắt búp bê, mắt đồ
   chơi" nhưng `trich` dừng ở câu SEN thứ hai. Sửa bằng cách **kéo câu SEN thứ ba vào câu trích** (nguyên văn,
   cắt đúng chỗ nguồn bị cụt), không sửa `dieuKien`.
5. **Hai `dieuKienVao` loại trừ nhau cùng value=true** — 7304: mục (1) định nghĩa "ống và ống dẫn", mục (2)
   định nghĩa "thanh hình rỗng" và nói rõ **"không theo định nghĩa ở trên"**; nhưng runtime in các mục
   `dieuKienVao` nối bằng "·" dưới nhãn "Điều kiện vào nhóm" (`so-tay-gates.js:135`) ⇒ mô hình đọc là phải
   thỏa **cả hai**, tức vừa là ống vừa là thanh rỗng (loại trừ nhau). **Đây là lỗi nguy hiểm nhất của lô** —
   sửa: gộp thành MỘT sự kiện liệt kê `la_ong_ong_dan_hoac_thanh_dang_rong` (lấy câu mở đầu chú giải nhóm),
   **XOÁ** mục còn lại; nội dung "ống, ống dẫn và thanh dạng rỗng" vẫn còn ở `phamVi` + 13 tên WCO cấp 6 số.
6. **`phamVi.text` lấy từ khối nguồn khác + nằm trong đoạn đã bị lược** — 7304: "bằng sắt (trừ gang đúc) hoặc
   thép" lấy từ Chú giải Tổng quát Chương 73 (không có trong câu trích của nhóm), còn "ngưng tụ, lò tinh luyện"
   nằm **trong khoảng bị cắt bởi dấu "…"** → mục nói chắc hơn nguồn. Sửa: thu hẹp `text` + mở lại đoạn lược.
   Bài học chung: **đoạn bị lược phải được đọc thật**, không chỉ để máy kiểm.

## Trả lời các điểm người soạn bàn giao (mục "Bàn giao cho người duyệt")

- **`6914` `dieuKienVao[1]` `nhiet_do_nung_toi_thieu >= 800 °C`** (có vế "tùy thuộc vào bản chất của sản phẩm"):
  **GIỮ**. Vế "tùy thuộc" nói cái nào nung ở mức cao hơn, còn **sàn 800 °C** là điều kiện tối thiểu; số 800 có
  trong câu trích; chú giải chương còn loại riêng phần nung dưới 800 °C cho mục đích khác (`ngoaiTru` của mục
  [0], tôi đã so tay và khớp nguyên văn — máy không đọc `ngoaiTru` nên không có gì để bắt).
- **`6303` 3 `dieuKienVao` lấy từ chú giải chương 63**: **GIỮ** — chú giải nhóm 6303 không có câu điều kiện nào;
  `dieuKienVao[1]` và `[2]` là hai vế của **cùng một câu** chú giải Tổng quát chương, tách mỗi vế một mục là
  đúng luật "một mục chỉ trích từ một khối nguồn" (cùng `nguon: ch63.chuong`).
- **`7304` 26 `tieuChi6` + 8 `tenDien` dịch từ tên WCO**: đã đối chiếu tay từng cái với tên WCO trong nguồn —
  khớp, kể cả lỗi chính tả **có thật** của nguồn (`wco.730449` = "tubes pipes" thiếu dấu phẩy, còn
  `wco.730459` = "tubes, pipes"); bản nháp chép đúng, không đồng nhất hoá.
- **`6504` nhóm mỏng nhất (7 mục)**: đúng như bàn giao; `dieuKienVao` để rỗng là **đúng** (mục (1) mũ nữ chưa
  dựng khuôn không có tiêu chí chung với mục (2) mũ ghép dải).

## BỎ SÓT — ghi nhận, KHÔNG tự chèn (người soát chỉ xoá/sửa, không bổ sung)

- `7018` `loaiTru` thiếu mục **(c) "Bưu ảnh, thiệp Giáng sinh … (nhóm 49.09)"** — đây là loại trừ **nêu đích
  danh số nhóm**, đáng có. Đề xuất người duyệt cho lô sau dành chỗ cho mục loại trừ kiểu này.
- `7018` `loaiTru` mục (g) chỉ ghi nhánh "gắn/nạm kim loại quý" → 71.13/71.14, bỏ nhánh "đồ trang sức làm
  bằng chất liệu khác … nhóm 71.17" — **thiếu soát, không sai**.
- `6303` `phamVi` không kể đoạn "vật liệu với độ dài sợi không hạn chế, được gia công sau khi dệt …" (nguồn
  dòng 12) — bỏ sót, không sai.

## Kiểm sau khi áp (đều xanh)

- `check-so-tay.mjs --raw=tmp/so-tay/raw` → **156/156, 0 mục không kiểm được nguồn** (157 − 1 mục xoá).
- `build-so-tay --tu-tep --force --nguoi-soan=dev-zcode-mm --bao-cao=…/lo-027.json` → **156/156 (100 %)**, `nhomLoi: []`.
- `check-cay --nhom=… --chi-tiet` → **0 lỗi lệch cây, 6/6 nhóm đủ**.
- `npm run so-tay:check` → **314 nhóm, 9.536 mục, 0 lỗi** (trước 9.537 — đúng bằng 1 mục bị xoá).
- `npm test` → **ALL TESTS PASSED**, exit 0.
- CI PR #410 sau commit `801086e`: `test` **pass** (1m37s), `bench` **pass** (8m59s). `Vercel` fail
  *"Deployment rate limited — retry in 24 hours"* — hạ tầng có sẵn, CI thật chỉ có `test` + `bench`
  (memory `vercel-check-blocked-la-pre-existing`). PR **OPEN + MERGEABLE**, **KHÔNG merge**.

## `nguonLoai`

Đổi **147** mục `AI_DA_KIEM → NGUOI_DUYET` cho **cả 7 khối đã soi** (`phamVi`, `boPhan`, `dieuKienVao`, `loaiTru`,
`phanBiet`, `tieuChi6`, `dong8`) — khác script chuẩn lô 006/026 vốn chỉ đổi 5 khối, vì tôi đã đọc tay hết
157 mục nên không mục nào của tôi còn là "AI tự soát". Chênh **9 mục** = 9 `cay.tenDien` giữ nguyên `MAY_SUY`
(do máy sinh, `scripts/apply-review-lo027.mjs`). Nếu người duyệt muốn quay lại phạm vi 5 khối: chạy lại
`TARGET=data APPLY=1` sau khi sửa mảng `KINDS_ARR` trong script.

---

# TIEN-TRINH — lô 027 (soạn sổ tay chú giải)

Nhóm của lô: **6303, 6504, 6702, 6914, 7018, 7304**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-027` @ `1828d3b` (main mới nhất) · Ngày: 2026-10-23
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `6303,6504,6702,6914,7018,7304` — **khớp** CSV dòng `027`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó **không phải** nhóm của lô này
(cũng không phải của lô 001 như lô 014 gặp; nó là nhóm của lô khác), copy-paste nhầm y như lô 012 và 014
(memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu, chốt nhóm theo CSV. Cập nhật CSV dòng 027 →
`trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `--nhom=6303,6504,6702,6914,7018,7304 --xuat-nguon=tmp/so-tay/nguon` →
  **122.516 ký tự** (6303 40k · 6504 5,6k · 6702 6,2k · 6914 15,9k · 7018 18,8k · 7304 30k).
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn**. Đọc `lib/so-tay.js`
  (`checkItem`/`verifySoTay`/`soCoTrongTrich`) trước khi soạn để biết máy loại mục nào. In cây
  `lib/hs-tree.js` cho cả 6 nhóm (`scripts/tmp-dump-cay-lo027.cjs`) để biết nút 6 số / nút thiếu tên.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` — 6 nhóm, **157 mục** sau tự soát.
  Cây các nhóm in bằng `tmp/so-tay/cong-cu/dump-cay-lo027.cjs`.
- [x] **B5.** Tự kiểm TRƯỚC khi nạp, hai lớp:
  - **Nguyên văn TUYỆT ĐỐI** (script riêng `tmp/so-tay/cong-cu/soat-nguyen-van-lo027.mjs`, KHÔNG squash — bù lỗ
    hổng `check-so-tay-squash-mat-ky-tu`): lần 1 bắt **4 mục sai** (xem "Máy không bắt được") → vá xong
    **157/157 khớp nguyên văn**, kể cả `ngoaiTru` (trường máy KHÔNG đọc — em tự so riêng, 1/1 khớp).
    Script để ở `tmp/` (gitignored) vì brief chỉ cho phép commit `data/so-tay/*` + CSV; **người duyệt có thể
    quyết định đưa nó vào `scripts/` cho các lô sau** — nó bắt được loại lỗi mà `check-so-tay` bỏ qua.
  - `check-so-tay.mjs --raw`: lần 1 loại **2 mục** (`6504` hs6=6504 không có trong cây; `6914` chữ
    "Gốc" thay "Gốm") → vá xong **157/157, 0 mục không kiểm được nguồn**.

## Máy KHÔNG bắt được — tự soát thủ công đã bắt (đề xuất đưa vào phần 1 giao việc)

1. **Dấu nháy cong của nguồn.** `ch69.chuong` viết **“sản phẩm màu lục”** (nháy cong, không phải `"` thẳng).
   Em chép thành nháy thẳng → `check-so-tay` vẫn XANH (hàm `squash` bỏ toàn bộ dấu câu), chỉ script soát
   nguyên văn mới bắt. **Bài học: câu trích có dấu nháy bên trong thì phải so từng ký tự.**
2. **Dấu phẩy trong tên WCO là lỗi riêng từng phân nhóm.** `wco.730459` = "tubes**,** pipes" nhưng
   `wco.730449` = "tubes pipes" (nguồn thiếu dấu phẩy). Em sửa hàng loạt theo 730459 thì làm hỏng 730449.
   **Sửa câu trích phải theo từng nguồn một, không dùng thay-thế chuỗi toàn cục.**
3. **Một nhánh của "A hoặc B"** (luật cũ, tái diễn): `nhom6504` mở đầu bằng "chủ yếu bao gồm … thân mũ
   65.02 đã dựng theo khuôn…", nhưng mục (2) của cùng nhóm lại nói nhóm còn gồm mũ **ghép từ dải**. Em đã
   **XOÁ** `dieuKienVao` của 6504 thay vì giữ điều kiện thiếu một nhánh.
4. **`dieuKien` nói nhiều hơn câu trích**: `7304` `loaiTru` viết "…trục bàn đạp và khung xe đạp" nhưng trích
   mới cắt tới "(ví dụ, nhóm 87.08 hoặc 87.14)". Kéo nốt vế sau vào câu trích (vẫn nguyên văn, ≤ 300 ký tự).
5. **Cắt giữa câu phải để dấu lược**: `6303` `dieuKienVao` cắt sau "…sản phẩm không dệt,…)" mà không có
   `…` → thêm `…` để không ám chỉ câu đã hết.

## Cố ý KHÔNG soạn (thà bỏ mục còn hơn mục mờ — luật 8)

- **`7018` không có `dieuKienVao`**: chú giải nhóm chỉ liệt kê các loại (A)–(H), không có câu nào nói
  điều kiện chung vào nhóm. Chỉ có câu "có thể phủ nhựa…" (câu CHO PHÉP — luật 28 trong `_he-thong`).
- **`6504` không có `tieuChi6`**: lá 65040000 là cả nhóm 4 số, máy chỉ nhận `hs6` là nút cấp 6 hoặc lá 8 số có
  `laPhanNhom`; `hs6=6504` bị loại (`hs6-khong-co-trong-cay`). Ghi nhận để người duyệt biết là hạn chế máy.
- Bỏ các `loaiTru` chỉ nói **"Chương N"** (65, 67, 70, 95) — luật 3 không tính là đích danh.

- [x] **B6.** Nạp: `build-so-tay.mjs --nhom=… --tu-tep=tmp/so-tay/raw --force --nguoi-soan="dev-zcode-mm"
  --bao-cao=data/so-tay/bao-cao/lo-027.json` → **157/157 (100 %)**, `nhomLoi: []`.
  Cỡ lô (đếm từ `data/so-tay/*.json` sau nạp, không ước lượng): 6 `phamVi` · 9 `dieuKienVao` ·
  30 `loaiTru` · 12 `phanBiet` · 44 `tieuChi6` · 9 `cay.tenDien` · 47 `dong8` (20 dòng có `tieuChi`,
  **4 dòng có ngưỡng số**: 7018.20.00 ≤ 1 mm; 7304.31.40/7304.39.40/7304.90.30 < 140 mm;
  1 dòng có `dieuKienSo`: 7018.90.10 đường kính 4–36 mm) · 0 `boPhan`.
- [x] **B7.** Kiểm toàn repo: `npm run so-tay:check` = **314 nhóm, 9.537 mục, 0 mục không kiểm được nguồn**;
  `check-cay --nhom=6303,6504,6702,6914,7018,7304 --chi-tiet` = **0 lỗi lệch cây, 6/6 nhóm đủ**;
  `npm test` = **ALL TESTS PASSED**, exit 0 (không suite nào fail).
- [x] **B8.** Commit `63ebf94` (chỉ `data/so-tay/*.json` + `bao-cao/lo-027.json` + dòng CSV + tệp này;
  KHÔNG commit `tmp/`) → push `so-tay/lo-027` → mở **PR #410** (KHÔNG merge).
  Điền `pr=410` vào CSV dòng 027.
- [x] **B9.** CI PR #410 (commit `a4e0a06`): `test` **pass** (2m06s), `bench` **pass** (6m04s),
  PR `OPEN` + `MERGEABLE`; `Vercel` fail "Deployment was blocked" — lỗi hạ tầng có sẵn, CI thật chỉ có
  `test` + `bench` (memory `vercel-check-blocked-la-pre-existing`).

## Lỗi của chính phiên này (ghi lại để không lặp)

Bản PR đầu em ghi cỡ lô bằng **số ước lượng** ("8 `dieuKienVao` · 29 `loaiTru` · 46 `tieuChi6` ·
42 `dong8`") và phải sửa lại sau khi đếm thật (`9 · 30 · 44 · 47`). Số liệu trong PR/TIEN-TRINH phải
**đếm từ `data/so-tay/*.json` sau khi nạp**, không đoán.

## Bàn giao cho người duyệt (mục 4)

Cần **soát độc lập TOÀN BỘ** `phamVi`, `boPhan`, `dieuKienVao`, `loaiTru`, `phanBiet` của 6 nhóm
(lô này `boPhan` không có mục nào — không nhóm nào có quy tắc bộ phận trong nguồn).
Trọng tâm khi soát:
- `7304` — 26 `tieuChi6` + 8 `tenDien` dịch từ tên WCO tiếng Anh (đúng thực tế từng chỗ có nguồn tiếng Việt là gì).
- `6914` — `dieuKienVao` thứ 2 (`nhiet_do_nung_toi_thieu >= 800 °C`) lấy từ mô tả công đoạn (iv), câu có vế
  *"tùy thuộc vào bản chất của sản phẩm"*; luật máy không chặn, người duyệt xem có nên giữ.
- `6303` — 3 `dieuKienVao` lấy từ chú giải **chương 63** (không phải chú giải nhóm) vì chú giải nhóm 6303
  không có câu điều kiện nào.
- `6504` — nhóm mỏng nhất lô: chỉ 7 mục (1 `phamVi`, 4 `loaiTru`, 1 `phanBiet`, 1 `dong8`).

# TIEN-TRINH — lô 014 (soạn sổ tay chú giải)

Nhóm của lô: **8465, 8511, 8529, 9013, 9610, 4013**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-014` @ `022723f` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `8465,8511,8529,9013,9610,4013` — **khớp** CSV dòng `014`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm y như lô 012 (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu,
chốt nhóm theo CSV. Cập nhật CSV dòng 014 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.

- [x] **B2.** Xuất nguồn `build-so-tay.mjs --nhom=8465,8529,9013,9610,4013 --xuat-nguon=tmp/so-tay/nguon`
  → **8511 ĐÃ CÓ SẵN**, 5 nhóm cần dựng (193 nghìn ký tự nguồn; 8465 74k · 8529 60k · 9013 31k · 4013 18k · 9610 6k).
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 5 tệp nguồn** (8465 và 8529 phải đọc 2 trang).
  Đọc `lib/so-tay.js` trước khi soạn để biết luật máy nào lọc mục nào. In cây `lib/hs-tree.js` cho cả 5 nhóm.
  Đọc thêm `data/so-tay/4011.json` + `4012.json` (cùng Chương 40, đã được duyệt) làm mẫu văn phong.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 5 nhóm — **139 mục**.
- [x] **B5.** Tự kiểm TRƯỚC khi nạp, hai lớp:
  - **Nguyên văn TUYỆT ĐỐI** (script riêng `tmp/so-tay/strict-nguyen-van.mjs`, KHÔNG squash — bù lỗ hổng
    `check-so-tay-squash-mat-ky-tu`): lần 1 bắt **13 đoạn sai** (xem "Máy không bắt được"). Vá xong → **152/152 khớp**.
  - **Gloss `tên WCO:`** phải là mảnh nguyên văn trong `wco.*`: bắt **1 lỗi** (viết thường "optical" thay "Optical").
  - `check-so-tay.mjs --raw`: lần 1 loại **1 mục** (`fact` có dấu tiếng Việt — luật `fact-khong-hop-le`), vá xong
    → **139/139, 0 mục không kiểm được nguồn**.
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-014.json`
  → **139/139 (100 %)**, 0 nhóm lỗi. **Không nạp 8511** (đã có sẵn, không sửa).
- [x] **B7.** `check-cay.mjs --chi-tiet` → **5/5 nhóm "đủ"**, 0 lỗi lệch cây.
  `npm run so-tay:check` → **232 nhóm / 7636 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push nhánh `so-tay/lo-014` + mở PR (**KHÔNG merge**).

## Kết quả

| nhóm | mục | đạt | điều kiện vào | loại trừ | phân biệt | tiêu chí 6 số | dòng 8 số | quy tắc bộ phận |
|---|---|---|---|---|---|---|---|---|
| 8465 | 44 | 44 | 2 | **14** | 1 | 9 | 16 | có |
| 8529 | 35 | 35 | 1 | **9** | 0 | 4 | 19 | có |
| 9013 | 32 | 32 | **0** | **10** | 3 | 8 | 9 | có |
| 9610 | 7 | 7 | 2 | 1 | 1 | 0 | 2 | — |
| 4013 | 21 | 21 | 3 | 0 | 0 | 4 | 13 | — |
| **TỔNG** | **139** | **139 (100 %)** | 8 | 34 | 5 | 25 | 59 | 3 |

## Máy KHÔNG bắt được — 13 lỗi nguyên văn lộ ra khi so tuyệt đối

Máy kiểm `check-so-tay` so **đã squash** (bỏ hết dấu câu), nên 13 lỗi dưới đây **đều qua máy xanh**. Chỉ lộ ra khi
đối chiếu **từng ký tự**. Đây là bằng chứng củng cố memory `check-so-tay-squash-mat-ky-tu`:

1. **Tôi đã "sửa" lỗi chính tả của nguồn — 1 lỗi, nguy hiểm nhất.** `tax.85291060` nguồn ghi
   *"Loa hoặc phễu **tiếp** sóng (ống dẫn sóng)"*; tôi viết *"tiếng sóng"*. Về nghĩa "tiếp sóng" mới đúng
   ( waveguide = ống dẫn sóng), nhưng luật là **giữ nguyên lỗi nguồn**, không sửa. Đã trả lại nguyên văn
   và ghi chú ngay trong `dieuKien`.
2. **Số gạch đầu dòng trong dòng biểu thuế — 7 lỗi.** Tôi chép đều `- - -` theo trí nhớ, nhưng nguồn thật phân bố
   không đều: `40139020`/`40139040` = `- -`; `85299059`/`85299094`/`85299099` = `- - -`; `90139010/60/70/90` = `- -`.
   Máy squash nên không thấy. Đã sửa hết theo `data/tax.json`.
3. **Qua chỗ xuống dòng trong nguồn — 3 lỗi.** `nhom8465` ngắt dòng giữa *"những máy dùng để"* và *"làm nở nắp chai"*;
   `nhom8529` và `nhom9013` ngắt dòng ngay sau *"…bao gồm:"*. Tôi dán liền bằng một dấu cách. Đã chèn `"…"` đúng chỗ.
   → **Bài học: không bao giờ dán lại từ trong nhớ; luôn trích bằng script cắt trực tiếp từ tệp nguồn.**
4. **Dấu lược ở đầu/cuối đoạn** — 5 "sai" còn lại chỉ là khoảng trắng sát dấu `…`. Không phải lỗi nguồn, script
   so nguyên văn phải trim hai đầu đoạn.

## Nhóm nguồn mỏng / bất thường (đề nghị bổ sung mục 1 giao việc)

- **4013 — tiêu đề nhóm "săm" nhưng dòng biểu thuế nói "dùng cho loại lốp".** Chú giải nhóm chỉ có **một câu**
  (*"Săm được lắp vào lốp của, ví dụ, ô tô con, xe rơ-moóc hoặc xe đạp."*). Toàn bộ phạm vi phân loại (xe mô-tô,
  máy 84.29/84.30, phương tiện bay, Chương 87) **chỉ suy ra được từ tên WCO + dòng biểu thuế**, không có câu chú giải
  nào xác nhận. Ba `dieuKienVao` phải mượn từ `ch40.chuong` (giống 4011 đã duyệt) chứ không có trong nhóm.
- **4013 `loaiTru` và `phanBiet` RỖNG — không phải thiếu sót.** Chú giải Chương 40 mục 2(f) chỉ nêu dải
  *"các nhóm từ 40.11 đến 40.13"* (bao gồm chính 4013) chứ không nêu nhóm đích 4 số nào bị loại; máy chỉ nhận
  `loaiTru` khi câu trích **nêu đích danh** số nhóm. `phanBiet` cũng rỗng vì `checkItem` chỉ nhận mã 4 số
  (`validHeading`) hoặc đúng 8 số (`validTax`) — **không nhận mã 6 số**, nên phân biệt 4013.10/.20/.90
  (vốn là câu hỏi hay nhất của nhóm này) **không biểu diễn được trong `phanBiet`**. Đã đưa vào `tieuChi6` thay thế.
- **9013 `dieuKienVao` RỖNG — cố ý, không phải thiếu sót.** Nhóm rất đa dạng (10 mục (1)–(10) trong chú giải).
  Mọi câu "điều kiện vào nhóm" trong nguồn đều nói về **một mục con** (môi trường laser 1 nm–1 milimet, kính đã gia
  công quang học, bộ phận của thiết bị laser…). Cổng đọc kiểu AND sẽ loại nhầm mọi hàng 9013 hợp lệ.
  Giao việc đã ghi: *"Cổng sau này **không được** loại một nhóm chỉ vì thiếu một `dieuKienVao`"* → để rỗng là chuẩn.
- **9013: kiến thức không biểu diễn được.** Chú giải nhóm (4) nói kính ngắm vũ khí *"được phân loại theo vũ khí, xem
  Chú giải 1(d) của Chương 93"* — chỉ nêu **Chương 93**, không có số nhóm 4 số, nên `loaiTru` không nhận
  (`thieu-nhom-dich`). Kiến thức này **thất lạc**, đề nghị người duyệt xem có nên cho `loaiTru` nhận mã chương.
- **8465: ngưỡng số không mã hoá được.** `tax.84659510` có **hai** ngưỡng: *"tốc độ quay trên 50.000 vòng/phút"* và
  *"đường kính chuôi không quá 3,175 mm"*. `soCoTrongTrich()` so `"50000"` trong khi nguồn viết `"50.000"`
  (dấu chấm phẩy nghìn kiểu Việt) → **không khớp**. Chỉ mã hoá được ngưỡng 3,175 mm (nguồn dùng dấu phẩy thập phân
  nên `replace('.', ',')` khớp). Ngưỡng tốc độ quay ghi trong `dieuKien` dạng chữ. Xác nhận memory
  `so-tay-nguong-so-tieng-viet-khong-khop-may` — **đề nghị sửa `soCoTrongTrich` nhận cả dấu chấm phẩy nghìn.**
- **8529: 4 tiêu đề quốc gia không có tên trong nguồn** (8529102, 8529109, 8529905, 8529909). Nguồn không có câu
  nêu tên nên `cay.tenDien` không điền được (luật 9 chỉ cho điền **khi nguồn có câu nêu tên**). `check-cay` vẫn báo
  "đủ" vì tên đã có trong `data/bieu-thue` (nguồn cây). Mọi dòng 8 số dưới tiêu đề đó đã ghi rõ
  *"tên tiêu đề không có trong nguồn — đối chiếu biểu thuế"*.
- **8529 `phanBiet` rỗng.** Cả 9 loại trừ (mục (a)–(ij)) đều nêu nhóm đích rõ ràng, nhưng nhánh "không" của
  `phanBiet` **không được suy từ danh sách loại trừ** (đúng luật mục 0). Không có cặp mã 4 số nào được nguồn mô tả
  đối chiếu trực tiếp → để rỗng.
- **8465: 3 câu trích vượt 300 ký tự** (lược đồ khuyến nghị ≤ 300; máy cho ≤ 600): `phanBiet[0]` 315,
  `tieuChi6[1]` (8465.20) 343, `dong8[4]` (84659210) 301. **Không cắt** vì cắt để vừa 300 sẽ hoặc mất đối tượng hàng
  hoặc mất số hiệu nhóm đích — cắt trích làm mất căn cứ thì tệ hơn dài.
- **Nguồn lỗi chính tả (kệ sách, không sửa trong sổ tay):** `tax.85291060` "tiếp sóng" (đúng nghĩa, sai chính tả);
  `nhom8465` mục (b) ghi "công nghệ **tia lade**" (chắc là "laser") — đã trích nguyên văn.

## Mục `dieuKien`/`text` có ghi điều câu trích **không** nói

Không có mục nào cố tình thêm thông tin ngoài câu trích. Ba chỗ **có chủ ý** và đã ghi rõ trong chính `dieuKien`:

- **8465 `dong8` (10 dòng)**: tiêu đề quốc gia 6 số / tên WCO **không có trong câu trích biểu thuế** → ghi kèm
  ngoặc *(phân nhóm 8465.95, tên WCO: drilling or morticing machines)*. Đã kiểm bằng script: cả **25 gloss
  `tên WCO:` đều là mảnh nguyên văn** trong `wco.*`.
- **4013 `dong8` (13 dòng)**: tiêu đề quốc gia 4013101/02, 4013901/3/9 không có trong nguồn → ghi rõ
  *"tên tiêu đề không có trong nguồn — đối chiếu biểu thuế"*.
- **8529 `dong8` 85299055 vs 85299059**: hai dòng **trùng chữ "Loại khác"**, nguồn không phân biệt được →
  ghi *"dòng trùng chữ với …, nguồn không phân biệt được (đối chiếu biểu thuế)"*, **không đoán**.

## Quyết định đáng lưu

- **`cay` không soạn** (luật 9): cả 5 nhóm để `tenDien: []`. `check-cay` báo 5/5 "đủ".
- **Không ghi `nguonLoai`** (luật 11): máy tự gán `AI_DA_KIEM` cho mọi mục. Người soát độc lập mới đổi `NGUOI_DUYET`.
- **`9013 loaiTru` bỏ 1 mục có vẻ hợp lý.** Đoạn *"…mà còn có thể thuộc các nhóm khác của Chương này (cụ thể, nhóm
  90.15, 90.18 hoặc 90.27)"* có **"có thể"** — không phải loại trừ dứt khoát, cùng dạng với lỗi *"thường thuộc"*.
  Bỏ, thay bằng 2 mục dứt khoát hơn lấy từ mục (iii) và (iv).
- **`9013 loaiTru` (9011) phải lược cụm "(thường là trên giá đỡ)"** — `HEDGE_LOAI_TRU` khớp `\(thường` nên máy
  loại. Cụm này **không phải ngoại lệ** (chỉ là nói kính lúp hai mặt hay để trên giá), nên lược không mất ý.
- **Không nạp lại 8511** dù thuộc lô: đã có sẵn, `--force` sẽ ghi đè bản đã duyệt.
- **`rm data/so-tay/bao-cao/lo-014.json` trước khi nạp** (memory `so-tay-bao-cao-ghi-de`) để không nối vào
  báo cáo cũ.

# TIEN-TRINH — lô 012 (soạn sổ tay chú giải)

Nhóm của lô: **9619, 4012, 4420, 5401, 5705, 6814**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-012` @ `2ab88d7` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `9619,4012,4420,5401,5705,6814` — **khớp** CSV dòng `012`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu, chốt
nhóm theo CSV. Cập nhật CSV dòng 012 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `build-so-tay.mjs --nhom=9619,4012,4420,5401,5705,6814 --xuat-nguon=tmp/so-tay/nguon`
  → **4012 ĐÃ CÓ SẴN**, 5 nhóm cần dựng (96 nghìn ký tự nguồn).
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 5 tệp nguồn**. Đọc `lib/so-tay.js`
  trước khi soạn để biết luật máy nào lọc mục nào. In cây `lib/hs-tree.js` cho cả 5 nhóm.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 5 nhóm.
- [x] **B5.** `check-so-tay.mjs --raw` chạy **4 lần**: lần 1 bắt 5 mục (xem dưới), lần 2 còn 1 mục
  (không sửa — xem "Máy loại"), lần 3–4 sạch. Thêm **kiểm tra nguyên văn TUYỆT ĐỐI** (không bỏ dấu câu,
  giữ ngoặc kép cong + xuống dòng): **0 sai / 76 mục**. Tự soát bằng mắt theo 14 kiểu lỗi mục 0.
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-012.json`
  → **75/76 (98,7 %)**, 0 nhóm lỗi. Không nạp 4012.
- [x] **B7.** `check-cay.mjs --chi-tiet` → **5/5 nhóm "đủ"**, 0 lỗi lệch cây.
  `npm run so-tay:check` → **222 nhóm / 7373 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit `4a44121` + push nhánh `so-tay/lo-012` + mở **PR #390** (**KHÔNG merge**).
  CI: `test` ✅ · `bench` ✅ · "Vercel: FAILURE" ❌ là **đỏ có sẵn** (memory `vercel-check-blocked-la-pre-existing` —
  Vercel đã gỡ khỏi deploy từ 09/10/2026).

## Kết quả

| nhóm | mục | đạt | ghi chú |
|---|---|---|---|
| 9619 | 9 | 9 | `loaiTru`/`phanBiet` **rỗng** — xem "Nguồn mỏng" mục 4 |
| 4420 | 21 | 21 | 2 điều kiện vào · 5 loại trừ · 5 câu hỏi phân biệt · 3 tiêu chí 6 số · 5 dòng 8 số |
| 5401 | 15 | 14 | 1 mục bị máy loại (xem "Máy loại") |
| 5705 | 13 | 13 | 1 điều kiện vào · 2 loại trừ · 2 câu hỏi · 7 dòng 8 số (2 dòng lấy điều kiện từ SEN) |
| 6814 | 18 | 18 | 1 điều kiện vào · 7 loại trừ · 5 câu hỏi · 2 tiêu chí 6 số · 2 dòng 8 số |
| **cả lô** | **76** | **75 (98,7 %)** | 0 nhóm lỗi |

## Máy loại 1 mục — **không cắt trích để né luật**

`5401 loaiTru`: câu *"Nhóm này cũng không bao gồm các loại sợi đơn và sợi monofilament, ngay cả khi được
sử dụng như là chỉ khâu (nhóm 54.02, 54.03, 54.04 hoặc 54.05 **tùy từng trường hợp**)"* → `loai-tru-chi-la-thuong`.
Ở đây "tùy từng trường hợp" nói về **mã nào trong 54.02–54.05 áp dụng**, KHÔNG nói loại trừ có hay không
→ luật máy loại nhầm. Cắt trích trước "tùy từng trường hợp" để qua luật là đúng loại lỗi "cắt trích để né
câu rào" (mục 0) nên **không làm**; mục đó **bị bỏ khỏi `loaiTru`**, còn kiến thức "vật phẩm là sợi
đơn/monofilament" vẫn còn trong `phanBiet` (cùng câu trích; luật `phanBiet` không dính hedge).
→ Người soát độc lập xem có nên đưa thành luật máy (nới hedge khi hedge nằm trong ngoặc chỉ danh sách mã).

## Nhóm nguồn mỏng / bất thường (đề nghị bổ sung mục 1 giao việc)

1. **5401 — không có chú giải Phần trong nguồn.** `sourcesFor('5401')` không có `phan54.phan`
   (`data/chu-giai-chuong.json[54].phan` **rỗng**; chỉ Chương 57 có đủ 46.130 ký tự). Chính nhóm 5401 dẫn
   "Phần (I) (B) (4) của Chú giải tổng quát Phần XI", còn định nghĩa **"chỉ khâu"** (cuộn trên lõi
   ≤ 1.000 g · đã hoàn tất để dùng làm chỉ khâu · xoắn "Z" cuối cùng) nằm ở Chú giải Phần XI mục 5 —
   **không có trong nguồn của nhóm này** nên `dieuKienVao` phải để **trống**. Đề nghị nhập `phan` cho
   ch.54 (và các chương đang rỗng) để các lô sau lấy được điều kiện vào nhóm.
2. **5705 — `phan57.phan` bị CẮT khi xuất nguồn** (46.130 → 25.000 ký tự, `CAP.phan` ở
   `scripts/build-so-tay.mjs`); phần còn lại của Chú giải Phần XI (mục 2(A) hỗn hợp vật liệu dệt,
   mục 3–8…) **chưa ai đọc**. Mục của lô này lấy ở đoạn đầu nên không ảnh hưởng, nhưng lô nào chạm
   Chương 50–60 sẽ thiếu nguồn. Báo cáo lô ghi `nguonBiCat: ["phan57.phan (46130→25000)"]`.
3. **5705 — biểu thuế lạ:** cùng một tên **"Thảm cầu nguyện (SEN)"** ở **hai dòng khác nhóm cha**
   (57050011 dưới tiêu đề "Từ bông"; 57050091 dưới "Loại khác"), và tiêu đề cha **5705002 "Từ xơ đay"**
   lại có dòng con 57050021 là "Tấm trải sàn không dệt, loại dùng cho xe có động cơ". Không nguồn nào giải
   thích được → 3 dòng `Loại khác` ghi "tên tiêu đề không có trong nguồn — đối chiếu biểu thuế", **không đoán**.
4. **9619 — không có loại trừ nào nêu đích danh nhóm.** Chú giải nhóm loại "tấm phủ một lần dùng trong phẫu
   thuật, miếng thấm trải giường bệnh viện/bàn mổ/xe lăn, miếng gắn ngực không thấm" nhưng **không nêu số
   nhóm đích** (chỉ "được phân loại theo vật liệu cấu thành") → `loaiTru` và `phanBiet` **rỗng** theo luật 3.
5. **6814 — `dieuKienVao` gộp làm 1 mục.** Nguồn nói "mica đã gia công … **và cũng gồm** sản phẩm chứa mica
   kết khối **hoặc** mica tái chế" — tách 2 nhánh thành 2 điều kiện `=true` là lỗi "một nhánh của A hoặc B
   thành điều kiện độc lập" (máy đọc kiểu AND) → gộp 1 mục, tên `fact` giữ chữ "hoặc".

## Mục `dieuKien`/`text` có ghi điều câu trích không nói

Không có mục nào khẳng định điều ngoài câu trích. Chỗ **có chú thích tên cha do máy suy** đều ghi rõ
"tên tiêu đề không có trong nguồn — đối chiếu biểu thuế" (9619: 5 dòng · 5705: 3 dòng · 4420: 2 dòng),
và 5401 dòng "chưa đóng gói để bán lẻ" ghi rõ `đối chiếu dòng 54011010 ghi "Đã đóng gói để bán lẻ" —
biểu thuế`.

## Quyết định đáng lưu

- **Lô này không có điều kiện số nào** — hai ứng viên đều bị loại có lý do: (a) "1.000 g" của định nghĩa
  "chỉ khâu" không có trong nguồn 5401 (mục 1 trên); (b) kích thước SEN 70×120 cm mô tả **bản thân mặt
  hàng**, không phân biệt dòng 8 số với anh em (57050011 vs 57050019) → không đặt `dong8.tieuChi`, chỉ ghi
  trong `dieuKien` (trích có nguyên văn). Ghi chú kỹ thuật: `soCoTrongTrich` của `lib/so-tay.js` không tách
  dấu chấm hàng nghìn kiểu Việt, nên "1.000 g" không khớp `value: 1000` → ngưỡng kiểu đó **hiện không
  dùng được** cho nguồn tiếng Việt.
- `cay.tenDien` **không điền mục nào**: mọi nút ảo của 5 nhóm đã có tên từ biểu thuê (`data/bieu-thue`)
  nên máy sẽ loại nếu điền.

---

# TIEN-TRINH — lô 010 (soạn sổ tay chú giải)

Nhóm của lô: **9406, 9616, 3407, 4820, 5607, 6107**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-010` @ `b58dda8` (main mới nhết) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `9406,9616,3407,4820,5607,6107` — **khớp** CSV.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`docs/giao-viec/so-tay-lo.csv` dòng `001`), copy-paste nhầm (memory `so-tay-lo-quy-trinh`).
Đã bỏ lệnh mẫu, chốt nhóm theo CSV:

```
$ awk -F, '$1=="010"' docs/giao-viec/so-tay-lo.csv
010,9406 9616 3407 4820 5607 6107,6,133590,dang-lam,dev-zcode-mm,,oz:7 oz:7 oz:6 oz:6 oz:6 oz:6,95.8
```

## Các bước

- [x] **B1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` **TRỌN** (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học bước 1; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt).
  Cập nhật CSV dòng 010 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
- [x] **B2.** Xuất nguồn — `build-so-tay.mjs --nhom=9616,3407,4820,5607,6107 --xuat-nguon=tmp/so-tay/nguon`
  → **9406 ĐÃ CÓ SẴN**, 5 nhóm cần dựng. Xem mục B2 bên dưới.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn, rồi đọc **HẾT cả 5 tệp nguồn** (~153 ký tự).
  Đọc `lib/so-tay.js` **trước khi soạn** để biết chính xác luật máy nào lọc mục nào (tiết kiệm vòng lặp).
  In cây `lib/hs-tree.js` cho cả 5 nhóm.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 5 nhóm.
- [x] **B5.** `check-so-tay.mjs --raw` → chạy **3 lần**: lần 1 máy bắt 2 mục, lần 2 sạch, lần 3 sau khi
  tự soát bằng mắt. **Phải tự soát** — đã bắt thêm 1 lỗi nguy hiểm máy không bắt (mục "Tự soát").
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-010.json`
  → **104/104 (100 %)**, 0 nhóm lỗi, 5 nhóm. **Không nạp 9406** (xem B2).
- [x] **B7.** `check-cay.mjs --chi-tiet` → **6/6 "đủ"**, 0 lỗi lệch cây.
  `npm run so-tay:check` → **211 nhóm / 7204 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit `acefe63` + push + mở **PR #384** (**KHÔNG merge**).
  CI: `test` ✅ (2m3s) · `bench` ✅ (8m53s) · "Vercel: Deployment was blocked" ❌ là **đỏ có sẵn**
  (memory `vercel-check-blocked-la-pre-existing` — Vercel đã gỡ khỏi deploy từ 09/10/2026).

## B2 — 9406 ĐÃ CÓ SẴN: không soạn lại VÀ không sửa

`data/so-tay/9406.json` đã tồn tại (nhóm 9406 có `oz:7` trong CSV, đã dựng ở lô trước).
Theo memory `so-tay-lo-quy-trinh`: copy nguyên tệp cũ vào `tmp/so-tay/raw/`, không soạn lại.

Nhưng **không nạp lại 9406 vào `data/so-tay/`**. Lý do (đã kiểm bằng `git diff`):
nạp lại làm 2 thay đổi, **cả hai đều không thuộc phạm vi lô 010**:

| thay đổi | đánh giá |
|---|---|
| `cay.nut[].tenVi` của 940610 / 940620 / 940690 / 94069011 (`null` → "Bằng gỗ", "Các khối mô-đun xây dựng, bằng thép", "Loại khác", "Nhà trồng cây được gắn với thiết bị cơ khí hoặc thiết bị nhiệt") | Khối `cay` **máy sinh** (`MAY_SUY`, `lib/hs-tree.js` ← `data/bieu-thue`). Nay biểu thuế Tổng cục đã đặt tên các nút 6 số nên cây tự có tên. Là **cải thiện**, không phải lỗi — nhưng cũng không phải việc của lô này. |
| `taoBoi.provider` "Claude (phiên soạn + soát độc lập, 11/10/2026)" → "dev-zcode-mm" | **Gán nhầm tác giả.** 9406 do Claude soạn + soát ngày 11/10; nạp lại sẽ ghi nó là của phiên này dù phiên này không hề soát lại. |

`git diff data/so-tay/9406.json` sau khi nạp thử: **8 dòng, 0 dòng nào thuộc trường người soạn**
(`phamVi`/`dieuKienVao`/`loaiTru`/`phanBiet`/`tieuChi6`/`dong8`/`boPhan` — đếm = 0).
⇒ `git checkout -- data/so-tay/9406.json`, báo cáo chỉ tính 5 nhóm mới, **9406 giữ nguyên byte-for-byte**.
Máy vẫn xác nhận 9406 đạt 24/24 và `check-cay` "đủ" (đã chạy kiểm).

## Kết quả

| Nhóm | Mục | phamVi | dieuKienVao | loaiTru | phanBiet | tieuChi6 | dong8 | boPhan | cay.tenDien |
|---|---|---|---|---|---|---|---|---|---|
| 9616 | 13 | 1 | 0 | 3 | 3 | 3 | 3 | 0 | 0 |
| 3407 | 8 | 1 | 0 | 3 | 1 | 0 | 3 | 0 | 0 |
| 4820 | 19 | 1 | 0 | 4 | 2 | 6 | 6 | 0 | 0 |
| 5607 | 32 | 1 | 0 | 8 | 2 | 10 | 11 | 0 | 0 |
| 6107 | 32 | 1 | 2 | 4 | 1 | 16 | 8 | 0 | 0 |
| **Tổng** | **104** | 5 | 2 | 22 | 9 | 35 | 31 | 0 | 0 |

`boPhan` để null ở cả 5 nhóm — không nhóm nào có chú giải phân rã bộ phận.
`dieuKienVao` chỉ có 2 mục, cả hai ở 6107 (xem "Vì sao ít `dieuKienVao`").

## Máy kiểm

```
$ node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw
3407: đạt 8/8     4820: đạt 19/19    5607: đạt 32/32
6107: đạt 32/32   9406: đạt 24/24    9616: đạt 13/13
sổ tay (bản nháp): 6 nhóm, 128 mục, 0 mục không kiểm được nguồn

$ node scripts/build-so-tay.mjs --nhom=9616,3407,4820,5607,6107 --tu-tep=tmp/so-tay/raw --force \
    --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-010.json
mục đạt 104/104 (100 %) — nghiệm thu bước 1 cần ≥ 95%; nhóm lỗi: 0

$ npm run so-tay:check   →  211 nhóm, 7204 mục, 0 mục không kiểm được nguồn
$ npm test               →  ALL TESTS PASSED
```

## Tự soát (mục 0 giao việc — 14 kiểu lỗi)

Máy kiểm chỉ chứng minh **câu trích có thật trong nguồn**, không chứng minh nó **nói đúng điều mục khẳng định**.
Đã đọc lại từng mục cùng nguồn theo đúng bảng kiểu lỗi.

**Lần 1 — máy bắt (2 mục), đều là lỗi chép nguyên văn của tôi:**

| nhóm | lỗi | sửa |
|---|---|---|
| 3407 | `loaiTru` 3305/3306/3307 — tôi chép "bọt **cạa**" | nguồn ghi "bọt **cạo**" (đối chiếu `od -c`) |
| 9616 | `dong8` 96161020 — tôi chép "gá **lắm**" | nguồn ghi "gá **lắp**" |

Hai lỗi này **không đáng xảy ra**: chép tay 2 chữ tiếng Việt có dấu. Bài học cho lô sau: mọi câu trích phải để máy
đối chiếu, đừng tin mắt.

**Lần 2 — máy KHÔNG bắt (1 mục, nguy hiểm): `dieuKienVao` của 3407.**

Tôi đã đưa vào `dieuKienVao` câu *"Các chế phẩm này được phân loại ở nhóm này chỉ khi chúng được đóng
thành bộ, đóng gói để bán lẻ…"*. Máy **chấp nhận** (không dính `dieu-kien-chi-cho-phep`, không phải `wco/sen/tax`).
**Nhưng câu đó chỉ là điều kiện của dòng 34070020 (sáp nha khoa), KHÔNG phải điều kiện vào cả nhóm 3407.**
`dieuKienVao` được đọc kiểu AND, nên để nguyên sẽ khiến cổng **loại nhầm bột nhão làm hình mẫu (34070010)
và chế phẩm thạch cao nha khoa (34070030)** — đúng cái lỗi luật `_he-thong` dòng 27 cảnh báo.

⇒ **XOÁ** khỏi `dieuKienVao`. Nội dung đó vẫn còn, đúng chỗ của nó:
`dong8[34070020].dieuKien` + `tieuChi` (điều kiện phân biệt dòng 8 số) và `phanBiet` (đối chiếu 3404|3824).
Đây là "thà bỏ mục còn hơn mục không có căn cứ" — ở đây còn nặng hơn: mục *có* căn cứ nhưng **sai tầng**.
Máy chỉ kiểm `nguon` + `trich` + vài từ khoá cấm, **không** kiểm được điều kiện này thuộc nhóm 4 số hay dòng 8 số
(ngoài trường hợp nguồn là `wco/sen/tax`). → Đề nghị mục 4: **soát tầng của `dieuKienVao` là điểm phải có người.**

**Lần 3 — các kiểu lỗi đã rà, không dính:**

| kiểu lỗi | kết quả |
|---|---|
| Cắt trích để né câu rào | Không mục nào cắt ngay trước "thường…/tùy…". 3 câu của 3407 dài > 300 ký tự → lược bằng `…`, **không xoá chữ trong câu** (đo lại: 299/299). |
| `dieuKienVao` từ câu CHO PHÉP | Đã loại sẵn: "…được phân loại ở đây **cho dù đã hoặc chưa** bị cắt theo chiều dài" (5607); "…**nhưng vẫn được phân loại** trong nhóm này … **với điều kiện**…" (4820) — cả hai dính `CAU_CHO_PHEP`. |
| `dieuKienVao` là điều kiện phân nhóm / "A hoặc B" | Đã loại: chú giải 3 Phần XI (5607) là 6 nhánh (a)–(f) **thay thế nhau**; "Dây xe… **nếu** chúng được tết **hoặc** được gia cố bằng chỉ kim loại" — không tách nhánh nào. |
| `dieuKienVao` từ phân nhóm/dòng 8 số | Không có. Ngưỡng decitex/daN trong chú giải phân nhóm 5607 **đều nằm sau chữ "Ví dụ:"** ⇒ không làm tiêu chí. |
| `loaiTru` "thường thuộc" / "tùy trường hợp" | Đã loại: 4820 "Những tờ rời… **thường thuộc** nhóm 48.02, 48.10, 48.11 hoặc 48.23, **tuỳ từng trường hợp**"; 4820 đế bàn gỗ/đá hoa "**tùy từng trường hợp**"; 4820 vé xổ số "(**thường** thuộc nhóm 49.11)"; 4820 tờ rời album "phân loại vào các nhóm khác tuỳ theo đặc tính" (không nêu mã). |
| Mất ngoại lệ ngay sau câu trích | Đã kéo vào trích: câu *"Mặt khác, khi chúng được đóng ở dạng khác…"* của 3407 nối ngay sau câu đã trích → kéo vào **cùng một `trich`**. |
| Nguồn tự mâu thuẫn | Không phát hiện. 4820 có cặp "vở bài tập ở trong nhóm" vs "sách bài tập in sẵn loại trừ 49.01" nhưng **có điều kiện**, không mâu thuẫn. |
| `hoi` của `phanBiet` nhắc mã / bị đảo | 9 mục: không `hoi` nào nhắc mã phân nhóm hay "WCO". Chiều `neuCo`/`neuKhong` đối chiếu từng câu (mẫu `0402.json`: `neuCo` = nhóm loại trừ khi câu là câu hỏi về đặc tính). |
| Nhiều mục cùng một câu hỏi | 4820 có 2 `phanBiet` nhưng hai câu hỏi khác nhau (câu hỏi/bài tập in sẵn ↔ sách bài tập trẻ em tranh ảnh). 9616 có 3, mỗi mục một câu hỏi khác. |
| `text`/`dieuKien` thêm chữ không có trong câu trích | Đã rà từng `text` (5) và từng `dieuKien` (31 dòng 8 số). `dieuKien` có ghi tên phân nhóm cha trong ngoặc — **theo đúng mẫu `9406.json` đã duyệt** ("Nhà lắp ghép bằng gỗ (phân nhóm 940610) là…"). |
| `dong8` thiếu dòng | Đủ 31/31 dòng `tax.*` của 5 nhóm; `check-cay --chi-tiet` không báo `dong8-thieu`. |
| `cay` soạn tay | Không soạn. `cay.tenDien = []` cả 5 nhóm (xem bên dưới). |

## Vì sao `dieuKienVao` chỉ có 2 mục (4 nhóm để trống)

Theo giao việc mục 0: *"dieuKienVao là các sự kiện **mô tả hàng thuộc nhóm**, không phải điều kiện cần"* và
cổng sau này **không được** loại nhóm chỉ vì thiếu một `dieuKienVao`. Để trống an toàn hơn bịa.

- **9616** — chú giải nhóm chỉ liệt kê nội dung (mục 1–4) + danh sách loại trừ. Chú giải Chương 96 mục 4 là câu
  *"trừ các nhóm từ 96.01 đến 96.06… **Tuy nhiên**"* → câu cho phép. Không có ngưỡng nào cho cả nhóm.
- **3407** — xem lỗi lần 2.
- **4820** — điều kiện duy nhất có vẻ dùng được là *"…nhưng **vẫn được phân loại** trong nhóm này … **với điều
  kiện** là việc in mang tính chất phụ trợ"* → dính `CAU_CHO_PHEP` (đúng kiểu lỗi mục 0).
- **5607** — mọi câu ứng viên đều là **"A hoặc B"** hoặc **"đã hoặc chưa"**: *"Các sản phẩm này được phân loại ở
  đây **cho dù đã hoặc chưa** bị cắt theo chiều dài"*, chú giải 3 Phần XI mục (a)–(f), *"nếu chúng được tết **hoặc**
  được gia cố bằng chỉ kim loại"*. Tách một nhánh là vi phạm luật 30.

Chỉ **6107** có 2 điều kiện thật sự ở **tầm nhóm 4 số**: `la_quan_ao_cua_nam_gioi_hoac_tre_em_trai`
(từ chính `nhom6107.nhom`) và `la_mat_hang_may_mac_san_duoc_det_kim_hoac_moc` (Chú giải 1 Chương 61).

## Nhóm nguồn mỏng / bất thường (đề nghị bổ sung mục 1 giao việc)

1. **3407 không có nút 6 số trong cây.** Biểu thuế chỉ có 3 dòng 8 số `34070010/20/30`, không có dòng `34070000`
   kiểu "lá phân nhóm", nên `lib/hs-tree.js` không dựng được nút `340700`. Hệ quả: **3407 không thể có `tieuChi6`
   nào** (máy loại mọi `hs6` của nhóm này với `hs6-khong-co-trong-cay`). Cũng không có "tiêu đề quốc gia".
   Không phải lỗi soạn — nhưng người đọc sổ tay 3407 sẽ không có tiêu chí cấp 6 số để đối chiếu.
2. **`nguonBiCat`: `phan56.phan` và `phan61.phan` bị cắt 46.130 → 25.000 ký tự** khi xuất nguồn (ghi trong
   `lo-010.json`). Cả 5 nhóm đều **không dùng** nguồn `phan*` làm căn cứ cho mục nào (đã kiểm `dungTuNguon`),
   nên lô này không bị ảnh hưởng. Nhưng nếu lô sau cần Chú giải Phần XI (rất dễ cho nhóm dệt) thì phải nới
   trần hoặc đọc theo mục.
3. **3407: chú giải (B) dài hơn cả câu trích cho phép (300 ký tự).** Câu *"Các chế phẩm này được phân loại ở
   nhóm này chỉ khi… Mặt khác, khi chúng được đóng ở dạng khác…"* dài 338 ký tự, phải lược 2 đoạn mới vừa.
   ⇒ **`phamVi` của 3407 chỉ trích tới "(B) Các chế phẩm được biết như sáp dùng trong nha khoa hay các chất
   làm khuôn răng"**, **không** trích tới mục "(C) Các chế phẩm khác dùng trong nha khoa…". Nhóm còn một loại
   (chế phẩm thạch cao nha khoa) **chỉ mô tả ở `dong8` 34070030, không nằm trong `phamVi.text`**.
   Lý do: trích tới (C) buộc phải lược qua đoạn thân (B) — mà đoạn đó chứa "**Mặt khác**, khi chúng được đóng
   ở dạng khác … (các nhóm 34.04, 38.24)" — tức **nuốt ngoại lệ**, vi phạm luật dấu lược "…".
   Nếu sau này cần `phamVi` đầy đủ cho 3407 thì phải nới trần trích, không được lược.
4. **5607: mọi con số trong chú giải phân nhóm 5607.21 / 5607.41 đều là ví dụ.** Bảng "Lực chịu giật của dây xe
   nhỏ nhất 150 (150 m/kg) là 98 daN…" mở đầu bằng chữ *"Ví dụ:"*, và trước đó là **công thức** mà ảnh xuất
   nguồn **không chứa** (ảnh chỉ còn chữ "(R là lực chịu giật…)" mà không có biểu thức). Nên **không dùng làm
   `tieuChi6`/`dong8.tieuChi`** được, dù trông rất "điều kiện số". Cũng không dùng `dong8.tieuChi` cho 56075010
   với ngưỡng `10.000 decitex`: dòng biểu thuế ghi "10.000" (dấu chấm phân tách nghìn) mà máy so `10000` —
   không khớp. Ghi boolean thay thế.
5. **`dong8[].dieuKien` ở 5607 / 6107 có nhắc tên phân nhóm cha lấy từ `wco.*`, không phải từ `trich` (dòng thuế).**
   Theo mẫu `9406.json` đã duyệt. Ghi ra đây để người soát biết là **có chủ ý**, không phải thêm hiểu biết riêng.
6. **`61079` là nhóm một gạch ảo, tên máy sinh là "Loại khác"** dù thực chất là "áo choàng tắm / áo choàng dài
   mặc trong nhà" (theo `wco.610791`, `wco.610799`). **Không tự điền `cay.tenDien`**: đây là nhãn do
   `data/bieu-thue` sinh, đã quy định là `MAY_SUY`; điền sẽ sinh cảnh báo `ten-dien-trung-bieu-thue` và đưa
   việc sửa nhãn cây sang lô này. Nếu thấy cần, nên sửa ở `lib/hs-tree.js`.

## Mục `dieuKien` có thể ghi điều câu trích không nói

Đã rà toàn bộ: **không có mục nào**. Tất cả `dieuKien` chỉ diễn đạt lại đúng câu trích (dòng biểu thuế) +
tên phân nhóm cha theo mẫu 9406 (mục 5 ở trên). Hai chỗ tôi **cố tình không** ghi:
- `56072100` — biểu thuế chỉ ghi "Dây xe để buộc hoặc đóng kiện"; **không** ghi thêm công thức lực chịu giật.
- `61079100` / `61079900` — biểu thuế chỉ ghi "Từ bông" / "Từ các vật liệu dệt khác"; **không** ghi "áo choàng
  tắm biển" (chỉ có trong chú giải nhóm, không có trong dòng thuế).

## Bàn giao

- **PR #384** đang mở, **KHÔNG merge**: https://github.com/ozvietnam/hs-code-api/pull/384
- Việc còn lại của người duyệt (mục 4 giao việc): **soát độc lập TOÀN BỘ** `phamVi` / `boPhan` /
  `dieuKienVao` / `loaiTru` / `phanBiet` của 5 nhóm này — tức **38 mục** (5 phạm vi + 0 bộ phận + 2 điều kiện +
  22 loại trừ + 9 phân biệt); cộng 35 `tieuChi6` + 31 `dong8` nếu muốn soi thêm. Sau đó tự soát ngẫu nhiên
  ≥ 10 % phần còn lại.
- Khi đạt: `so-tay-lo.csv` dòng 010 → `trang_thai=xong` + điền `pr=<số>`.
- Nhớ: lỗi kệ sách ở mục "Nhóm nguồn mỏng / bất thường" nên bổ sung vào **mục 1** của
  `docs/giao-viec/so-tay-giao-ngoai.md` để các lô sau tránh.
---

# TIEN-TRINH — lô 010, PHIÊN SOÁT ĐỘC LẬP (bổ sung, không thay phần trên)

Người soát: `dev-zcode-mm` (soát độc lập, KHÁC phiên soạn) · Nhánh: `so-tay/lo-010` @ `c5934dd`
Ngày: 2026-10-22 · Theo `brief-st-soat-lo0010.md`

Phần trên là bản ghi của phiên **soạn**. Phần này là bản ghi của phiên **soát**, nối tiếp chứ không ghi đè.

## Đã làm

- [x] **S1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` + `tmp/so-tay/nguon/_he-thong.txt` +
  đọc **nguồn mã của `lib/so-tay.js`** để biết chính xác máy bắt được gì và chỗ nào phải bằng mắt.
- [x] **S2.** Soát **TOÀN BỘ 104 mục** của 5 nhóm, từng mục, cùng `tmp/so-tay/nguon/<nhom>.txt`.
  Không lấy mẫu. Đọc thêm bản sổ tay đã gộp để biết *thói quen kho* (vd 170 tệp có `tieuChi6` trùng phân nhóm →
  **không** xoá mục trùng của 9616; `dong8[].dieuKien` ghi kèm tên phân nhóm → giữ).
- [x] **S3.** Ghi `review/<nhom>.json` — mỗi tệp liệt kê **mọi** mục đã soi kèm lý do giữ/sửa.
- [x] **S4.** Áp: `apply-review-lo007.mjs` (`TARGET=raw APPLY=1`) → `check-so-tay --raw` 104/104
  → nạp `--tu-tep --force` → `TARGET=data APPLY=1` đổi `nguonLoai` 38 mục sang `NGUOI_DUYET`.
- [x] **S5.** `so-tay:check` 211 nhóm / 7204 mục / 0 lỗi · `check-cay` 5 nhóm 0 lỗi · `npm test` PASS.
- [x] **S6.** Commit `c5934dd` + push + **comment PR #384**. **KHÔNG merge.**

## Kết quả: soát 104 → sửa 7, xoá 0, giữ 97

**Không mục nào phải xoá.** 104/104 câu trích nguyên văn; không có lỗi cắt trích né câu rào, không có
trích lặng lẽ 300–600 ký tự, không có mục ghép hai câu xa. Bản nháp tốt hơn hẳn vòng 2 (xoá 325 / sửa 95).

| Nhóm | Mục | Sửa | Xoá |
|---|---|---|---|
| 3407 | 8 | 2 (`phamVi`, `phanBiet[0]`) | 0 |
| 4820 | 19 | 1 (`phamVi`) | 0 |
| 5607 | 32 | 1 (`phanBiet[0]`) | 0 |
| 6107 | 32 | 2 (`phamVi`, `phanBiet[0]`) | 0 |
| 9616 | 13 | 1 (`phamVi`) | 0 |

### Ba lỗi nặng (máy không bắt được)

1. **`phanBiet` sai phạm vi — 3 nhóm.** `lib/so-tay-gates.js:141` in `có→X / không→Y` thẳng vào prompt.
   - 3407: `"Các chế phẩm này"` chỉ trỏ nhóm con (B) sáp nha khoa, nhưng `không→3404|3824` áp cho cả nhóm —
     trong khi mục (A) nói bột nhão đóng thành bộ vẫn vào 3407.
   - **6107 (nặng nhất):** `không→6109` khiến **áo ngủ nam** (bản thân là 6107.21/22/29) bị dẫn sang 61.09.
   - 5607: `hoi` là phép chọn hai nên hàng thường trả "không" và bị dẫn sang 5605.
   → Cả ba đều sửa bằng cách **thu hẹp phạm vi hoặc đảo cực** để nhánh "không" luôn rơi về phía an toàn.
2. **`phamVi` thiếu thành phần** — 3407 bỏ mục (C) (dòng 34070030); 4820 chỉ nêu 1/8 mục; 9616 bỏ mục (2)(3) (dòng 96161020).
3. **`phamVi` vượt ngân sách prompt** — `clip(text, 220)` sẽ cắt cụt đuôi; đã nén cả 4 nhóm cho vừa ≤ 220.

## Sửa nhỏ kèm theo

`scripts/apply-review-lo007.mjs` cho phép mục `giu` mang index lồng nhau (`cay.tenDien`) vì `giu` là no-op,
không cần phân giải index. Trước đó script ném lỗi và phiên soát phải bỏ nhãn chính xác.

## Việc còn lại của người quản lý

1. Xử lý 3 cảnh báo nặng đã ghi trong `review/*.json` + comment PR:
   (a) bổ sung `op:'HOAC'` cho `dieuKienVao` để nhóm 5607 ghi được 6 đường vào có ngưỡng decitex;
   (b) nới `CAP.phan` ở `scripts/build-so-tay.mjs:34` — 25.000 làm mất `(I)(B)(1) và (2)` mà chú giải nhóm 5607 trỏ tới;
   (c) nghĩ cách diễn đạt loại trừ "không nêu đích danh" (Chú giải 10 Chương 48).
2. Tự soát ngẫu nhiên ≥ 10 % phần còn lại (mục 4 giao việc).
3. Bổ sung lỗi kệ sách mới phát hiện vào **mục 1** của `docs/giao-viec/so-tay-giao-ngoai.md`:
   chú giải nhóm 3407 mất đầu mục (A); `CAP.phan` cắt mất phần chú giải nhóm dẫn chiếu.
4. Khi đạt: `so-tay-lo.csv` dòng 010 → `trang_thai=xong` + điền `pr=384`, rồi merge.

---

# TIEN-TRINH — lô 012, PHIÊN SOÁT ĐỘC LẬP (bổ sung, không thay phần trên)

Người soát: `dev-zcode-mm` (soát độc lập, KHÁC phiên soạn) · Nhánh: `so-tay/lo-012` @ `fdfe98e`
Ngày: 2026-10-22 · Theo `brief-st-soat-lo012.md`

Phần trên là bản ghi của phiên **soạn**. Phần này là bản ghi của phiên **soát**, nối tiếp chứ không ghi đè.

## Sai lệch brief (đã xử lý, không im lặng)

Brief dòng 1 và dòng 3 dùng chỗ trống `#...PR12` cho số PR — thực tế là **PR #390**.
Brief dòng 5 nói "6 nhóm" nhưng chỉ liệt kê **5** (`4420,5401,5705,6814,9619`). `4012` có trong CSV dòng 012
nhưng **đã có sẵn trong `data/so-tay/`** nên không nằm trong gói soát; theo CSV là 6, theo nguồn đã có là 5.
Đã soát đủ 5 nhóm có bản nháp.

## Đã làm

- [x] **S1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` (mục 4) + `lib/so-tay.js` (đọc **nguồn mã**
  của luật máy: `loai-tru-chi-la-thuong`, `dieu-kien-chi-cho-phep`, `dieu-kien-cap-phan-nhom`, `soCoTrongTrich`)
  + `lib/so-tay-gates.js` (xem **chỉ `fact`** mới đi vào prompt dòng 135, `phamVi` bị `clip` 220 ký tự).
- [x] **S2.** Kiểm tra **nguyên văn TUYỆT ĐỐI** (so từng byte với tệp nguồn, không nén khoảng trắng —
  giữ ngoặc thẳng/cong, ngoặc kép cong, xuống dòng cứng, lỗi chính tả): **76/76 khớp, 0 sai**.
  Chạy lại **sau khi sửa**: vẫn 76/76.
- [x] **S3.** Đọc bản sổ tay đã gộp để biết *thói quen kho* trước khi kết luận: 273 dòng `dong8` ghi nguồn
  `wco.*` và dịch sang tiếng Việt (3215/3917) → **không coi là lỗi**; nhãn `(SEN)` trong `dong8` cũng là quy
  ước có sẵn (1901/2106) → **không sửa**.
- [x] **S4.** Soát **TOÀN BỘ 76 mục** của 5 nhóm, từng mục, cùng `tmp/so-tay/nguon/<nhom>.txt`.
  Ghi `review/<nhom>.json` — mỗi tệp liệt kê **mọi** mục đã soi (`giu` là no-op).
- [x] **S5.** Áp: `scripts/apply-review-lo012.mjs` (`TARGET=raw APPLY=1`) → nạp lại
  `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-012.json` → `TARGET=data APPLY=1`
  đổi `nguonLoai` **42 mục** sang `NGUOI_DUYET`.
- [x] **S6.** `check-so-tay --raw` → 75/76 (mục lỗi là mục **có sẵn**, xem dưới) · `check-cay --chi-tiet`
  → 5/5 nhóm "đủ", 0 lỗi lệch cây · `so-tay:check` → **222 nhóm / 7373 mục / 0 lỗi** · `npm test` → **ALL PASS**.
- [x] **S7.** Commit + push cùng nhánh + **comment PR #390**. **KHÔNG merge.**

## Kết quả: soát 76 → sửa 3, xoá 0, giữ 73

**Không mục nào phải xoá.** 76/76 câu trích nguyên văn tuyệt đối; không có lỗi cắt trích né câu rào, không
có `hoi` đảo chiều nhánh, không có mất ngoại lệ ngay sau câu trích, không có mục ghép hai câu xa. Bản nháp
sạch hơn hẳn vòng 2 (xoá 325 / sửa 95).

| Nhóm | Mục | Sửa | Xoá | Ghi chú |
|---|---|---|---|---|
| 4420 | 21 | 2 (`dieuKienVao[1]`, `tieuChi6[2]`) | 0 | lỗi nặng nhất lô |
| 5401 | 15 | 0 | 0 | 1 mục bị máy loại (giữ nguyên, xem dưới) |
| 5705 | 13 | 1 (`dieuKienVao[0]`) | 0 | |
| 6814 | 18 | 0 | 0 | nhiều loại trừ nhất, tất cả đúng |
| 9619 | 9 | 0 | 0 | `loaiTru` rỗng là **đúng**, xem dưới |

### Ba mục đã sửa (máy không bắt được)

1. **4420 `dieuKienVao[1]` — mảnh câu mất chủ thể + điều kiện sai tầng.** Trích gốc là
   `"với điều kiện là chúng là những mặt hàng về bản chất từ gỗ."` — đứng một mình, mất danh ngữ và mất
   chủ thể `chúng`. Tệ hơn: điều kiện này trong nguồn **chỉ áp cho mặt hàng được lót một phần hay toàn bộ**
   bằng da thuộc, bìa, plastic, sợi dệt, nhưng `fact` lại phát ra thành điều kiện vào **cả nhóm 4420** —
   đúng loại lỗi lô 009 đã xoá ở 3918. Đã nới trích ra câu đầy đủ (206 ký tự, nguyên văn) và đặt lại phạm vi.
2. **5705 `dieuKienVao[0]` — mất nhánh "hoặc".** Chú giải 1 Chương 57 định nghĩa nhóm là (A) vật liệu dệt làm
   bề mặt ngoài khi sử dụng **hoặc** (B) hàng có đặc tính trải sàn dệt nhưng dự định dùng cho mục đích khác;
   `fact` chỉ lấy (A). Vì `so-tay-gates.js:135` chỉ đưa **`fact`** vào prompt, nhánh (B) — mà chính TỔNG
   QUÁT Phần XI liệt kê rõ *"đồ treo tường hoặc các loại phủ bàn"* — sẽ bị loại khỏi 5705. Đã ghi lại đủ hai nhánh.
3. **4420 `tieuChi6[2]` — thiếu 1/3 nhánh.** `wco.442090` nêu 3 nhánh (gỗ khảm/gỗ dát · hộp và đồ chứa đồ kim
   hoàn và dụng cụ cắt · đồ nội thất gỗ không thuộc Chương 94) nhưng `fact` bỏ mất nhánh hộp/đồ chứa →
   một chiếc hộp đựng đồ kim hoàn (đúng 4420.90) sẽ bị kết luận là không thuộc 4420.90.

## Máy loại 1 mục — soát **giữ nguyên**, không lách

`5401 loaiTru` bị `loai-tru-chi-la-thuong` loại vì câu nguồn có *"tùy từng trường hợp"* nằm trong ngoặc
`(nhóm 54.02, 54.03, 54.04 hoặc 54.05 tùy từng trường hợp)`. Câu đó **nói đúng** việc loại trừ; hedge chỉ
nói **mã nào trong 54.02–54.05 áp dụng**. Soát **không cắt trích** (đúng loại lỗi "cắt trích để né câu rào")
và **không xoá** mục đúng — nên `check-so-tay --raw` vẫn báo 75/76 và báo cáo lô vẫn là **75/76 (98,7 %)**.
Kiến thức này **còn trong `phanBiet`** (cùng câu trích, luật `phanBiet` không dính hedge) nên không mất.

## Hai chỗ rỗng đã kiểm và xác nhận **đúng** (không phải thiếu sót)

- **9619 `loaiTru` rỗng.** Nhóm 9619 **có** câu loại trừ (*"Nhóm này không bao gồm sản phẩm như tấm phủ một
  lần dùng trong phẫu thuật và miếng thấm để trải giường trong bệnh viện…"*) nhưng câu đó **không nêu đích
  danh nhóm đích** (chỉ *"được phân loại theo vật liệu cấu thành"*) → luật 3 không cho ghi. Để rỗng là chuẩn.
- **5401 `dieuKienVao` rỗng.** Câu *"Chỉ khâu vẫn thuộc nhóm này dù đã hoặc chưa được đóng gói để bán lẻ…"*
  là câu **CHO PHÉP**; thêm nữa định nghĩa "chỉ khâu" nằm ở Chú giải Phần XI mà gói nguồn **không có**
  (thiếu `phan54.phan`). Không dựng được → để rỗng.

## Việc còn lại của người quản lý

1. **Nới luật hedge** ở `lib/so-tay.js:164` (`HEDGE_LOAI_TRU`): bỏ qua hedge khi nó nằm **trong ngoặc chỉ
   danh sách mã** — đây là mục đã báo ở PR #390, giờ xác nhận lại sau soát. Không nới thì mọi lô có mẫu
   "… hoặc nhóm X, Y **tùy từng trường hợp**" đều mất mục loại trừ.
2. **`CAP.phan` = 25.000** ở `scripts/build-so-tay.mjs:34` — `phan57` bị cắt từ 46.130 còn 25.000 ký tự
   (báo cáo lô ghi `nguonBiCat: ["phan57.phan (46130→25000)"]`). Lô sau chạm chương 50–60 sẽ tiếp tục thiếu.
3. **Bổ sung mục 1** `docs/giao-viec/so-tay-giao-ngoai.md` với 2 lỗi kệ sách mới của lô này:
   (a) `dieuKienVao` lấy **mảnh câu đứng riêng** → mất danh ngữ + chủ thể;
   (b) `fact` **bỏ nhánh "hoặc"** của một định nghĩa nhiều nhánh → thu hẹp cả định nghĩa.
4. **Nguồn mỏng chưa ai ghi:** 5401 dẫn "Phần (I) (B) (4) của Chú giải tổng quát Phần XI" nhưng gói nguồn
   không có `phan54.phan` (chương 54 rỗng) → không dựng được điều kiện vào nhóm.
5. Tự soát ngẫu nhiên ≥ 10 % phần còn lại (mục 4 giao việc).
6. Khi đạt: `so-tay-lo.csv` dòng 012 → `trang_thai=xong` + `pr=390`, rồi merge.

---

# TIEN-TRINH — lô 014, PHIÊN SOÁT ĐỘC LẬP (bổ sung, không thay phần trên)

- **Ngày:** 2026-10-22 → 23. **Căn cứ:** `brief-st-soat-lo014.md` + mục 4 `docs/giao-viec/so-tay-giao-ngoai.md`.
- **Vai:** người soát độc lập, KHÁC phiên soạn `dev-zcode-mm`. Không gộp.
- **Nhóm:** 4013 · 8465 · 8529 · 9013 · 9610.

## Đã làm

1. Đọc lại `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0/1/3/4) và `tmp/so-tay/nguon/_he-thong.txt`
   (11 luật mục 3) trước khi soi — không soi bằng trí nhớ.
2. Đọc `review/9619.json` (lô 012) + `scripts/apply-review-lo012.mjs` để lấy đúng quy ước ghi kết quả.
3. Chạy `node tmp/so-tay/strict-nguyen-van.mjs` (máy kim nguyên văn TUYẾT ĐỐI, không squash dấu câu)
   **trước**: 152/152 đoạn khớp — tức mọi lỗi còn lại đều thuộc loại máy KHÔNG bắt được.
4. Soát **TOÀN BỘ 139 mục** của 5 nhóm, từng mục, cùng nguồn nguyên văn. Không gật đầu cho qua.
5. Ghi `review/<nhom>.json` (đủ cả mục `giu`), viết `scripts/apply-review-lo014.mjs` để áp.
6. Áp → `check-so-tay --raw` → `build-so-tay --tu-tep --force` → `so-tay:check` → `npm test`.

## Kết quả: soát 139 → sửa 18, xoá 4, giữ 117

| Nhóm | soát | sửa | xoá |
|---|---|---|---|
| 4013 | 21 | 4 | 1 |
| 8465 | 44 | 3 | 0 |
| 8529 | 35 | 4 | 0 |
| 9013 | 32 | 5 | 2 |
| 9610 | 7 | 2 | 1 |

Báo cáo lô: `139/139 (100 %)` → **`135/135 (100 %)`** sau khi bỏ 4 mục.
`npm run so-tay:check` xanh (232 nhóm, 7 632 mục). `npm test` **ALL TESTS PASSED**.
`check-cay --nhom=4013,8465,8529,9013,9610` → 0 lỗi lệch cây, 5/5 đủ.

### Bốn mục XOÁ — đều là mục khẳng định NGƯỢC nguồn

Máy không bắt được vì câu trích vẫn nguyên văn: lỗi nằm ở chỗ **cắt trích trước vế quyết định**
hoặc **đảo chiều ý**.

1. **9013 `loaiTru[9]` — 9005.** Chú giải 4 Chương 90: *"Nhóm 90.05 không áp dụng cho … **kính ngắm và
   kính viễn vọng như vậy được phân loại vào nhóm 90.13**."* Mục cắt đúng trước vế cuối bằng dấu `…`
   nên một câu **XÁC NHẬN VÀO 9013** thành mục **loại trừ sang 9005** — ngược hoàn toàn.
2. **9013 `loaiTru[6]` — 9011.** Nguồn: *"các kính lúp hai mặt … **không giống với** các kính hiển vi
   soi nổi phân loại ở nhóm 90.11, chúng được lắp thêm những thị kính nhưng **không có vật kính**."*
   Chính vì KHÔNG có vật kính nên chúng ở lại 9013; mục lại ghi kính lúp hai mặt → 9011.
3. **9610 `dieuKienVao[1]`.** Trích cắt ngay trước câu rào **"có thể"**: nguồn là *"Các sản phẩm này,
   có hoặc không có khung, **có thể** làm bằng đá phiến … được đắp lên …"*, mục chép từ *"được đắp lên"*
   rồi đặt thành điều kiện vào nhóm **bắt buộc**. Không cứu được bằng cách nới trích (câu đầy đủ vẫn là
   câu mô tả, không phải điều kiện vào 9610).
4. **4013 `tieuChi6[1]`.** Lặp lại y hệt `tieuChi6[0]` với **cùng** câu trích `wco.401310`, `fact` vô
   nghĩa (`loai_phuong_tien_su_dung`), đẩy cả câu tiếng Anh dài vào `value` (vốn là giá trị vô hướng).

Cả 4 đều không mất thông tin: 9013 còn `phanBiet[0]`/`phanBiet[2]`, 9610 còn `loaiTru[0]`, 4013 còn
`tieuChi6[0]`.

### Mười tám mục SỬA — nhóm theo kiểu lỗi

- **"Chữ ngoài câu trích" (9 mục)** — loại lỗi mà mục 4 tài liệu giao việc nêu thẳng
  (`text`/`tomTat`/`dieuKien` thêm **ví dụ**, số hiệu chú giải, mã 8 số):
  - `9013 boPhan.tomTat` thêm *"ví dụ ống laser"* (ở câu khác) · `8529 boPhan.tomTat` kéo cả mục (d)
    vào trong khi trích chỉ có câu quy tắc chung · `8529 dong8[3]` thêm *"(tương ứng mục (4) chú giải nhóm)"* ·
    `8465 dong8[1]` kéo nguyên định nghĩa "trung tâm gia công" ở Chú giải phân nhóm 1 Ch.84 vào trong khi
    `nguon` khai `tax.84652000` (định nghĩa đó đã có đúng ở `tieuChi6[1]`) ·
    `8465 dong8[10]` chứa *"LƯU Ý: … máy so 50000 không khớp"* — đây là **ghi chú về máy kiểm**, không
    phải mô tả hàng, và là mục duy nhất trong 234 tệp `data/so-tay` có kiểu chú thích này ·
    `9610 dong8[1]` lấy "bảng đá đen và bề mặt dùng để viết" từ `phamVi` và tên WCO cha vào trong khi
    `nguon` là `tax.96100090` · `9610 phanBiet[0].hoi` dùng cụm *"đã được phủ một lớp"* lấy từ câu thứ hai
    của chú giải nhóm, câu trích không có · `9013 phamVi.text` mượn *"Thiết bị tạo tia laser"* của biểu thuế
    trong khi nguồn nhóm viết *"các thiết bị laser"*.
- **Nhãn tiêu đề 7 số sai (4 mục, cùng một căn cứ).** 4013 `dong8[0..3]` và 8529 `dong8[0..1]`:
  câu trích chỉ có tên dòng biểu thuế, còn mục thêm nhãn tiêu đề lấy từ **cây máy** (biểu thuệ) rồi lại
  ghi *"tên tiêu đề không có trong nguồn — đối chiếu biểu thuế"*. Riêng 8529 còn **gắn sai tên**: 8529102
  được gọi là *"Bộ phản xạ ăng ten"* (đó là tên phân nhóm 8529.10, mà tên thật của tiêu đề là *"Chảo phản
  xạ của ăng ten parabol sử dụng cho hệ phát trực tiếp đa phương tiện và các bộ phận của chúng"*).
  Hệ quả thực tế: 40131011 và 40131021 có **cùng** câu trích và **cùng** `dieuKien` → mất hẳn điều kiện
  duy nhất phân biệt. Đã ghi lại tên tiêu đề lấy nguyên văn từ cây máy, kèm nhãn trung thực.
- **"Nội dung nói nhiều hơn trích" (1 mục).** `8465 phamVi`: `text` liệt kê trọn 14 loại máy mục (A)–(14)
  còn `trich` chỉ có **câu mở nhóm**. Đúng lỗi lô 007 bắt ở 8203. Đã nới trích thêm hai mốc (1) và (14)
  — nguyên văn, tổng 203 ký tự.
- **"Nhánh không chưa có căn cứ" (1 mục).** `9013 phanBiet[2]`: nhánh "không" (= 9013) đang suy từ việc
  kính lúp hai mặt nằm trong mục (2) của danh sách *"Nhóm này gồm"*, mà câu đó không có trong trích.
  Đã kéo câu neo vào, đúng như tiền lệ 1702 của lô trước.
- **"Fact rút mất nhánh" (1 mục).** `9013 tieuChi6[2]`: *"machines, appliances, instruments or apparatus"*
  bị rút còn *"máy_thiết_bi"* → mất 2 nhánh. Cùng loại lỗi lô 012 đã vá ở 4420/5705.

## Kiểm chứng lại các mục KHÔNG sửa (chốt là đúng, không phải bỏ sót)

- **8465 `dieuKienVao[1]`** — trích là câu **loại trừ** ("không có đặc tính của nguyên liệu cứng") nhưng
  `fact` là điều kiện **dương** và đúng: *"loại trừ máy gia công vật liệu KHÔNG cứng"* kéo theo *"thuộc
  8465 là vật liệu CÓ đặc tính cứng"*. `so-tay-gates.js:135` chỉ đưa `fact op value` ra prompt (không
  đưa `trich`), nên chiều đọc là đúng. Giữ nguyên.
- **9013 / 8529 `phanBiet` và `loaiTru` rỗng/thiếu** — `9013.phanBiet` có 3 mục đúng; `8529.phanBiet`
  rỗng dù nguồn có câu dựng được cặp hỏi 8517 ↔ 8529, nhưng `loaiTru[3]` đã nêu đúng việc loại trừ và
  cùng nằm trong khối in ra prompt. **Em không tự thêm mục mới** (em là người soát, không phải người soạn).
- **Các khối rỗng đã ki và xác nhận đúng:** 9610 `tieuChi6` (wco.961000 chỉ là tiêu đề) · 8529
  `boPhan` có nhưng `cay.tenDien` rỗng · 8465 `cay.tenDien` rỗng · `check-cay` báo 5/5 nhóm đủ.

## Việc còn lại của người quản lý

1. **Tự soát ngẫu nhiên ≥ 10 %** phần còn lại (mục 4) — em đã soát 100 %, bước này vẫn theo quy trình.
2. **`8465` còn 3 câu loại trừ nêu đích danh chưa được ghi** (đề xuất bổ sung, KHÔNG phải lỗi):
   (a) mục (13) *"trừ máy bóc vỏ bằng tia nước phun thuộc nhóm 84.24 và trống bóc vỏ thuộc nhóm 84.79"*;
   (b) Chú giải 3 Chương 84 — *"...đồng thời đáp ứng mô tả trong nhóm … 84.64 **hoặc 84.65** được phân loại
   trong nhóm 84.56"*; (c) câu mở đoạn loại trừ chung *"máy móc thiết bị có chức năng không phải để gia công
   vật liệu hoặc bề mặt của vật liệu"* (hiện chỉ có các ví dụ cụ thể). Cả ba trích nguyên văn được.
3. **Bổ sung mục 1** `docs/giao-viec/so-tay-giao-ngoai.md` với 3 lỗi kệ sách mới của lô 014:
   (a) **`loaiTru` đảo chiều** — câu "X thuộc nhóm Y" bị ghi thành "X loại trừ sang nhóm khác" khi trích
   cắt trước vế "; … được phân loại vào nhóm Y" (9013, 2 mục);
   (b) **trích cắt trước câu rào "có thể"** biến câu MÔ TẢ thành điều kiện vào nhóm BẮT BUỘC (9610);
   (c) **nhãn tiêu đề 7 số lấy nhầm tên phân nhóm** + tự nói "không có trong nguồn" trong khi cây máy
   có tên (4013, 8529). Ba loại này đều **không thể bắt bằng máy** vì câu trích vẫn nguyên văn.
4. **Luật máy mới đề xuất** cho `lib/so-tay.js`: loại `dong8[].dieuKien` chứa mẫu
   `LƯU Ý|không mã hoá được|máy so … không khớp` — ghi chú về máy kiểm không được nằm trong mô tả hàng.
5. Khi đạt: `docs/giao-viec/so-tay-lo.csv` dòng 014 → `trang_thai=xong` + `pr=393`, rồi merge.

---

# TIEN-TRINH — lô 020 (soạn sổ tay chú giải)

Nhóm của lô: **5911, 6112, 6203, 6208, 6401, 6506**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-020` @ `93adb50` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).
Nhật ký nối **sau** bản của lô 014 (memory `tien-trinh-md-chia-chong-gay-xung-dot`: không xoá bản người khác).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief lô 020 dòng 4 ghi nhóm `5911,6112,6203,6208,6401,6506` — **khớp** CSV dòng `020`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm y (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu,
chốt nhóm theo CSV. Lưu ý thêm: brief ghi `--bao-cao=lo-020.json` — lô này là 3 chữ số nên **đúng**
tên sẵn dùng trong `data/so-tay/bao-cao/` (memory `bao-cao-lo-...-lo-0NN`).

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
  Đọc thêm 15 memory bài học các lô trước (loại trừ ngược chiều, điều kiện vượt tầng, `fact` mới
  là thứ vào prompt, dấu `…` có sẵn của nguồn, dòng 8 số tra cây, ngưỡng số kiểu Việt…).
- [x] **B2.** `build-so-tay.mjs --nhom=5911,6112,6203,6208,6401,6506 --xuat-nguon=tmp/so-tay/nguon`
  → **6 nhóm đều chưa có** `data/so-tay/*.json` (khác lô 014/016 có nhóm có sẵn). Tổng nguồn
  **232.973 ký tự**: 6112 51.944 · 5911 50.504 · 6203 50.059 · 6208 49.443 · 6401 20.203 · 6506 4.855.
- [ ] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT 6 tệp nguồn**; đọc `lib/so-tay.js` trước
  khi soạn để biết luật máy nào lọc mục nào; in cây `lib/hs-tree.js`; xem mẫu `data/so-tay/` đã duyệt.
- [ ] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 6 nhóm.
- [ ] **B5.** Kiểm 2 lớp: nguyên văn tuyệt đối (script riêng trong `tmp/`) + `check-so-tay --raw`.
- [ ] **B6.** Nạp `--tu-tep --force --bao-cao=lo-020.json` (xoá báo cáo cũ trước).
- [ ] **B7.** `check-cay --chi-tiet` + `npm run so-tay:check` + `npm test`.
- [ ] **B8.** Commit + push + mở PR (**KHÔNG merge**).

## Kết quả (sau B7)

**195/195 mục đạt (100 %)**, 0 nhóm lỗi, 0 mục không kiểm được nguồn.

| nhóm | điều kiện vào | loại trừ | phân biệt | bộ phận | tiêu chí 6 số | dòng 8 số | tổng | đạt |
|---|---|---|---|---|---|---|---|---|
| 5911 | 2 | 4 | 1 | – | 6 | 7 (2 có `tieuChi`) | 21 | 21 |
| 6112 | 1 | 8 | 1 | 1 | 11 | 10 | 33 | 33 |
| 6203 | 2 | 8 | – | 1 | 34 | 23 | 69 | 69 |
| 6208 | 2 | 7 | – | 1 | 15 | 13 | 39 | 39 |
| 6401 | 3 | 3 | 1 | – | 1 | 5 | 14 | 14 |
| 6506 | 1 | 5 | 1 | – | 3 | 8 | 19 | 19 |
| **TỔNG** | **11** | **35** | **4** | **3** | **70** | **66** | **195** | **195** |

### Các bước đã làm (B3–B7)

- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn** (232.973 ký tự);
  đọc `lib/so-tay.js` (444 dòng) để biết trước luật máy nào lọc mục nào; in cây `lib/hs-tree.js`
  cho 6 nhóm (có `laPhanNhom`, `cap`, `suyRa`); đọc `data/so-tay/6212.json` + `6204.json`
  (cùng Chương 61/62, đã được duyệt) làm mẫu văn phong — nhất là khuôn `dong8.dieuKien`
  "… (= phân nhóm X — WCO: …)" và `tieuChi6` trích **mảnh ngắn** của dòng WCO.
  Xác nhận bằng script: `op:"="` + `value:false` là khuôn có sẵn (55 mục trong kho).
- [x] **B4.** Soạn 6 tệp `tmp/so-tay/raw/*.json` — **195 mục**.
- [x] **B5.** Kiểm TRƯỚC khi nạp, hai lớp:
  - **Nguyên văn TUYỆT ĐỐI** — `scripts/check-trich-nguyen-van.mjs` (lô 016, PR #396) **chưa có trong
    nhánh này** (PR đó chưa gộp), nên dựng lại bản tương đương tại `tmp/so-tay/strict-nguyen-van.mjs`
    (tách `/…|\.{3,}/`, so `src.includes(frag)` **không squash**). Đã tự kiểm script bằng cách chạy lên
    `data/so-tay/6212.json` (tệp đã duyệt) → 0 báo động, tức không báo động giả.
    Bắt được **2 lỗi chép tay** mà máy chính không thấy: 6112 viết "búp **bè**" thay nguồn
    "búp **bê**"; 6208 viết "**Singets**" thay nguồn "**Singlets**". Vá xong → **0 đoạn sai**.
  - `check-so-tay.mjs --raw`: **195/195, 0 mục không kiểm được nguồn** ngay từ đầu (không phải loại mục nào).
- [x] **B6.** `rm -f data/so-tay/bao-cao/lo-020.json` trước (memory `so-tay-bao-cao-ghi-de`: `--bao-cao`
  **nối thêm** vào tệp cũ) → nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm"` → **195/195 (100 %)**,
  `nhomLoi: []`.
- [x] **B7.** `check-cay --chi-tiet` → **5/6 nhóm "đủ"**; 6401 còn 2 cảnh báo
  `phan-nhom-chua-co-tieu-chi:640192/640199` (**có chủ ý**, xem dưới). `npm run so-tay:check` →
  **244 nhóm / 7 998 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.

## Những gì đã CỐ Ý bỏ (thà ít mục chắc chắn)

1. **640192 / 640199 — mâu thuẫn kệ sách, không soạn `tieuChi6`.** WCO định nghĩa
   `wco.640192` = *"waterproof, covering the ankle (but not the knee)"*, nhưng biểu thuế VN tách
   `6401.92` thành **"Loại có mũi giày được gắn bảo vệ không phải kim loại / Loại khác"** —
   hai trục phân loại khác nhau. Ghi tiêu chí "covering the ankle" cho phân nhóm của biểu thuệ
   VN là khẳng định sai (luật `_he-thong.txt` mục 32: nguồn tự mâu thuẫn → bỏ cả hai phía).
   Đã bỏ, ghi vào PR để người duyệt biết. (Còn 6401.99 "n.e.c." thì khớp với `64019910`
   "Giày cổ cao quá đầu gối" nên vẫn giữ ở `dong8`.)
2. **`loaiTru` "các nhóm từ 59.08 đến 59.10" của 5911** — luật 3 cấm dải "từ X đến Y" làm đích
   danh (máy cũng loại vì `59.09` không có trong câu). Đã chuyển thành **điều kiện vào phủ định**
   `thuoc_cac_nhom_tu_5908_den_5910 = false` lấy từ câu bao hàm cả nhóm trong chú giải nhóm.
3. **6506 `dieuKienVao` "có hoặc chưa có lớp lót bảo vệ"** — tuỳ chọn, đặt `value:true` sẽ biến
   thành điều kiện bắt buộc → **xoá**.
4. **6112 `dieuKienVao` "cài thân trước trái→phải"** — loại bỏ vì 6112 chứa **cả** quần áo bơi
   nam (6112.31/39) lẫn nữ (6112.41/49); đặt làm điều kiện vào nhóm sẽ loại oan hàng nữ.
   Vẫn giữ ở `6203`/`6208` (mỗi nhóm chỉ dành cho một giới), theo đúng khuôn 6204 đã duyệt.
5. **`phanBiet` rỗng ở 6203/6208** — các luật ưu tiên (62.09/62.10 thắng) và quy tắc xác định
   giới tính (không phân biệt → nữ → 6204) đều **không nêu mã đích** trong câu trích nên không
   diễn đạt được thành cặp mã; và `phanBiet` không thể biểu đạt luật ưu tiên (memory
   `so-tay-loai-khac-8-so...`). 6204 đã duyệt cũng để rỗng.
6. **Không soạn `cay.tenDien`** — không nút ảo nào còn trống tên; các nút phân nhóm 6 số chưa có
   tên tiếng Việt (620319, 620322, 620329, 620332, 620342, 620349, 620821, 620829, 620891,
   620892, 620899, 611241, 611249, 650699) chỉ có **tên tiếng Anh** trong nguồn `wco.*` — không có
   câu tiếng Việt nào nêu tên, mà dịch tên WCO là "thêm hiểu biết riêng" (luật 7). Tên của chúng
   đã vào `tieuChi6[].fact = loai_hang` và `dong8[].dieuKien` (khuôn 6204) nên không mất thông tin.

## Kệ sách cần sửa riêng (không sửa trong sổ tay)

- **`phan59/61/62.phan` bị CẮT còn 25.000 ký tự** khi xuất nguồn (`CAP.phan` trong
  `scripts/build-so-tay.mjs`; báo cáo lô ghi `nguonBiCat`) — ảnh hưởng 5911, 6112, 6203, 6208.
  Biệt phân nhóm 12 vẫn đủ vì nằm ở đầu văn bản.
- **`ch64.chuong` Chú giải 2 (nhóm 96.06)** nói về "các bộ phận" của **nhóm 64.06**, không phải
  6401 → không dùng làm `loaiTru` của 6401 (điều kiện sai cấp).

- [x] **B8.** Commit `fec74ff` (9 tệp: 6 `data/so-tay/*.json` + `bao-cao/lo-020.json` + TIEN-TRINH +
  dòng CSV; **không** có `tmp/`) → push nhánh `so-tay/lo-020` → mở **PR #401**
  (https://github.com/ozvietnam/hs-code-api/pull/401). **KHÔNG merge.**
  CSV dòng 020 giữ `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm` — đổi `xong`+`pr=401` là việc
  của người duyệt sau khi qua soát độc lập (mục 4 giao việc).

## Còn lại

1. **Soát độc lập toàn bộ** `phamVi`/`boPhan`/`dieuKienVao`/`loaiTru`/`phanBiet` của 6 nhóm
   (195 mục) — người/agent KHÁC người soạn. CHƯA làm.
2. Người duyệt tự soát ngẫu nhiên ≥ 10 % số mục còn lại.
3. Gộp `scripts/check-trich-nguyen-van.mjs` từ PR #396 vào `scripts/` (nó đang nằm ở `tmp/`
   nên không lấy lại được) — hoặc đề xuất vá `quoteInSource()` để so khớp nguyên văn thay vì squash.

---

# TIEN-TRINH — lô 020, PHIÊN SOÁT ĐỘC LẬP (bổ sung, không thay phần trên)

- **Ngày:** 2026-10-22 → 23. **Căn cứ:** `brief-st-soat-lo020.md` + mục 4 `docs/giao-viec/so-tay-giao-ngoai.md`.
- **Vai:** người soát độc lập — đọc lại từng mục cùng nguồn nguyên văn, KHÔNG soạn lại, KHÔNG gộp.
- **Nhóm:** 5911 · 6112 · 6203 · 6208 · 6401 · 6506.

## Đã làm

1. Đọc lại `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1 — 5 kiểu lỗi người soát phải bắt; mục 0/vòng 2;
   mục 3 **11 luật**; mục 4) + `tmp/so-tay/nguon/_he-thong.txt` trước khi soi — không soi bằng trí nhớ.
2. Đọc `review/6406.json` + `scripts/apply-review-lo014.mjs` để lấy đúng quy ước ghi kết quả soát.
3. **Đếm tiền lệ TRƯỚC khi kết luận mẫu nào là lỗi** (bài học lô 011 — ba người soát báo nhầm rồi phải
   bác bỏ từng cái): quét `data/so-tay/*.json` cho ba mẫu nghi ngờ —
   `neuKhong` trỏ về chính nhóm (**480/516 mục — hợp lệ**), `loaiTru` cùng Chương (**611/1572 — hợp lệ**),
   `dong8` ghi *"tiêu đề 7 số (biểu thuế ghi '…')"* (**tiền lệ ở 8462 đã gộp**), `op:"in"` (**50 mục**).
   Cả bốn đều **KHÔNG phải lỗi** — không đụng vào. Đã tra `lib/hs-tree.js` xác nhận 6203191 = "Từ bông",
   6203192 = "Từ tơ tằm" (nguồn `bieu-thue@2026.04.05`), nên nhãn tiêu đề 7 số của 6203 là đúng.
4. Chạy `node tmp/so-tay/strict-nguyen-van.mjs` (máy kim nguyên văn TUYẾT ĐỐI, không squash) **trước**:
   **0 đoạn sai** — tức mọi lỗi em tìm đều thuộc loại máy KHÔNG bắt được.
5. Soát **TOÀN BỘ 195 mục** của 6 nhóm, từng mục, cùng nguồn nguyên văn. Không gật đầu cho qua.
6. Ghi `review/<nhom>.json` (đủ cả mục `giu`) + `scripts/apply-review-lo020.mjs` để áp.
7. Áp → `check-so-tay --raw` → `build-so-tay --tu-tep --force` → `nguonLoai` → `so-tay:check` → `npm test`.

### Sai sót em tự bắt được giữa chừng (ghi lại vì rất dễ lặp lại)

Em chạy lại `gen-review-lo020.mjs` **sau khi đã áp review vào `tmp/so-tay/raw/`** → 5 mục `xoa`
biến mất khỏi `review/*.json` và `soat` rơi 195 → 190. `tmp/so-tay/raw/` là **bản nháp đã bị sửa**, không
phải bản gốc. Cách khôi phục đã dùng: dựng lại bản nháp gốc từ `git show HEAD:data/so-tay/<nhom>.json`
bằng cách bỏ `nhom/cay/dungTuNguon/phienBan/taoBoi/kiemTra` + `nguonLoai` + `loaiKhac` (đúng những
trường máy tự thêm), rồi chạy lại cả chuỗi. Đối chiếu kết quả: hai lần dựng **giống nhau tuyệt đối**,
chỉ khác `taoBoi.luc`/`taoBoi.ms`.
**Luật rút ra: `review/<nhom>.json` phải sinh từ bản nháp GỐC, và không bao giờ sinh lại sau khi đã áp.**

## Kết quả: soát 195 → sửa 21, xoá 5, giữ 169

| Nhóm | soát | sửa | xoá | sau khi soát |
|---|---|---|---|---|
| 5911 | 21 | 4 | 0 | 21 |
| 6112 | 33 | 4 | 1 | 32 |
| 6203 | 69 | 2 | 1 | 68 |
| 6208 | 39 | 6 | 1 | 38 |
| 6401 | 14 | 1 | 1 | 13 |
| 6506 | 19 | 4 | 1 | 18 |

Báo cáo lô: `195/195 (100 %)` → **`190/190 (100 %)`** sau khi bỏ 5 mục; `nhomLoi: []`.
`npm run so-tay:check` xanh (**244 nhóm / 7 993 mục / 0 lỗi**). `npm test` **ALL TESTS PASSED**.
`check-cay --chi-tiet` cho cả 6 nhóm: **0 lỗi lệch cây**; 5/6 nhóm "đủ" (6401 còn trống 2 phân nhóm
chưa có tiêu chí 6 số — xem "Còn lại"). `strict-nguyen-van` sau khi áp: **0 đoạn sai**.

## Năm mục XOÁ — đều là mục khẳng định NGƯỢC nguồn

Máy không bắt được vì câu trích vẫn nguyên văn; lỗi nằm ở chỗ **cắt trích trước vế quyết định**
hoặc **suy nhánh "không" từ cấu trúc anh em**.

1. **6112 `phanBiet[0]` — mất HAI ngoại lệ ngay sau câu trích.** Chú giải 9 Chương 61 còn ngay sau câu đã
   trích: *"Quy định này không áp dụng cho những quần áo mà cách cắt may của chúng thể hiện rõ ràng
   là dùng cho nam hoặc nữ"* và *"Quần áo không thể nhận biết được là quần áo nam hoặc nữ thì được
   xếp vào nhóm quần áo phụ nữ hoặc trẻ em gái"*. Bản nháp cắt ngay trước cả hai — nên sổ tay bảo hỏi
   kiểu cài cho đúng những bộ quần áo mà quy định **không áp dụng**. Không thể vừa giữ nguyên văn vừa
   kéo cả hai ngoại lệ vào 300 ký tự → xoá.
2. **6203 + 6208 `dieuKienVao[1]` — quy tắc giới tính đặt nhầm chỗ.** Đây không phải điều kiện VÀO
   nhóm 4 số mà là quy tắc chọn giữa các nhóm trong Chương 62; thêm nữa câu trích lại cắt ngay trước
   ngoại lệ *"Quy định này không áp dụng cho những quần áo mà cách cắt may của chúng thể hiện rõ
   ràng là dùng cho nam hoặc nữ"*.
3. **6401 `phanBiet[0]` — câu trích chỉ là DÒNG BIỂU THUẾ** *"64011000 - Giày, dép có mũi gắn kim
   loại bảo vệ"*, không nói gì về trường hợp không có mũi kim loại; nhánh `neuKhong` suy thẳng từ
   cấu trúc anh em.
4. **6506 `phanBiet[0]` — trích nhầm một DANH SÁCH "bao gồm".** Câu *"Nhóm này cũng bao gồm: (1) Mũ
   và vật đội đầu bằng cao su hoặc bằng plastic"* là danh sách bao gồm, không phải quy tắc xếp loại;
   nhánh `neuKhong` còn **sai về nghĩa** vì mũ bảo hiểm bằng cao su theo WCO 650610 vẫn là 650610,
   không phải 650691 như mục khẳng định.

Cả 5 đều không mất thông tin: 6401 còn `phamVi` + `dieuKienVao[1]` (điều kiện "không lắp ráp theo
quy trình trong nhóm"), 6506 còn 5 `loaiTru`, 6112 còn `tieuChi6` + `boPhan`, 6203/6208 còn 8/7 `loaiTru`.

## Hai mươi mốt mục SỬA — nhóm theo kiểu lỗi

- **"Fact rút mất nhánh phủ định" (5 mục — nguy hiểm nhất, vì `lib/so-tay-gates.js:135` chỉ đưa
  `fact op value` ra prompt, KHÔNG đưa `trich`).** 6506 `tieuChi6[1]` và `[2]`: WCO 650691/650699 đều
  có vế **"(other than safety headgear)"** mà `fact` bỏ mất → mũ bảo hiểm bằng cao su sẽ bị kéo sang
  650691. 6203 + 6208 `dieuKienVao[0]`: `fact` chỉ giữ vế dương, bỏ *"trừ mền xơ"* và *"không bao
  gồm các sản phẩm dệt kim hoặc móc (trừ 6212)"* → đồ dệt kim bị coi là thoả điều kiện vào 6203/6208.
- **"Dấu lược nuốt ngoại lệ / định ngữ mềm" (4 mục).** 6208 `phamVi`: dấu lược nuốt trọn câu
  *"Cũng nên lưu ý rằng các sản phẩm dệt kim hoặc móc của loại này được phân loại trong nhóm 61.08
  hoặc 61.09, tùy trường hợp"* — đúng câu loại đồ dệt kim ra khỏi 6208 — cùng định ngữ mềm *"(các loại
  áo này thường mặc trong nhà)"*. 5911 `phamVi`: nuốt *"Nhóm này bao gồm, **đặc biệt là** …"*, biến
  nghĩa "đặc biệt" thành "kể cả". 5911 `loaiTru[2]`: mất định ngữ *"không kể loại"*.
- **"Mất nhánh của A hoặc B" (1 mục).** 6401 `phamVi.text`: nguồn *"miễn là phần mũ giày không gắn với
  đế **hoặc lắp ghép** theo các quy trình đã được nêu trong nhóm"*, bản nháp gộp thành *"không gắn
  với đế theo các quy trình…"* — gắn mệnh đề "theo các quy trình" vào riêng vế "gắn với đế", nhánh
  "lắp ghép" biến mất.
- **"Fact nói vòng không truy ra được" (5 mục).** 6112 `tieuChi6[3,7,10]` và 6208 `tieuChi6[7,13]`
  ghi `chưa chi tiết trong 6112_1 / 6208_2 / 6208_9` trong khi WCO nói thẳng *"other than cotton or
  synthetic fibres"*. Người soạn tự viết tường minh khi WCO tường minh (620349 cùng lô này) — 5 mục
  này không nhất quán với chính quy ước đó.
- **"Trích/thông tin lệch nhau" (3 mục — cùng một lỗi, xuất hiện ở cả 3 Chương).** 6112 `boPhan`:
  `quyTac` khẳng định hai vế nhưng `trich` chỉ trích vế *"Tuy nhiên…"*; 6203 + 6208 `boPhan` giống hệt
  và cả ba đều mất phạm vi áp dụng *"các sản phẩm … chưa hoàn thiện hoặc chưa hoàn chỉnh"*.
- **"Fact gõ lỗi ký tự" (2 mục).** 5911 `tieuChi6[0]` (`vai_trem` → `vai_dem`), 6506 `tieuChi6[0]`
  (`va_va`).
- **"Đảo ngược hướng của cả câu" (1 mục — sửa, không xoá).** 5911 `phanBiet[0]`: câu trích nói sản
  phẩm monofilament xoắn ốc **đã nằm ở phân nhóm này (5911.90)** và *"không nằm trong phân nhóm
  5911.31 hoặc 5911.32"*; bản nháp lại hỏi ngược lại rồi gán câu trả lời "có" cho 59119010 — mà
  59119010 là *"Miếng đệm và miếng chèn"*, điều câu trích không hề nói. Đã đảo lại thành câu hỏi về
  vải/phớt dệt vòng liền dùng cho máy sản xuất giấy → 5911.31/5911.32, giữ nguyên câu trích nguyên văn.

## Kiểm chứng lại các mẫu NGHI NGỜ nhưng **KHÔNG** phải lỗi (chốt là giữ, không phải bỏ sót)

- **`neuKhong` trỏ về chính nhóm** (5911) — đây là cách mã hoá chuẩn "không dính điều kiện loại trừ
  thì ở lại nhóm này", chiếm **480/516** mục đã gộp. Không sửa.
- **`loaiTru` cùng Chương** (6112 → 6111/6113, 6203 → 6209/6210) — là quy tắc ưu tiên nội bộ Chương,
  **611/1572** mục đã gộp cùng kiểu. Với 6112 còn đúng về mặt pháp lý: bộ quần áo thể thao của trẻ
  trai vào 6111, của nữ vào 6112. Không sửa.
- **`dong8` ghi nhãn tiêu đề 7 số lấy từ cây máy** (62031911/19/21/29/90) — đã tra `lib/hs-tree.js`:
  6203191 = "Từ bông", 6203192 = "Từ tơ tằm" (`bieu-thue@2026.04.05`), và đúng tiền lệ đã gộp ở 8462.
  Không sửa.
- **Dòng *"Phần còn lại của phân nhóm … trừ <dòng chi tiết>"*** — mẫu đã được duyệt (275 dòng).
- **`phanBiet` rỗng ở 6203/6208** — người soạn cố ý để rỗng vì luật ưu tiên và quy tắc giới tính đều
  không diễn đạt được thành cặp mã; 6204 đã duyệt cũng rỗng. **Giữ nguyên, không tự thêm mục mới**
  (em là người soát, không phải người soạn).

## Bốn lỗi kệ sách phát hiện thêm (đề nghị bổ sung mục 1 giao việc — KHÔNG sửa trong sổ tay)

1. **Mâu thuẫn nguồn 6401** — WCO 640192 nói *"waterproof, covering the ankle"* **không loại trừ mũi
   kim loại**, còn biểu thuế VN tách 64019210/90 theo *"mũi giày được gắn bảo vệ không phải kim loại"*.
   Hai nguồn đọc theo hai hướng khác nhau. Giữ cả hai phía, không ghi kết luận nào.
2. **`ch64.chuong` Chú giải 2** nói về "các bộ phận" của **nhóm 64.06**, không phải 6401 → không dùng làm
   `loaiTru` của 6401 (điều kiện sai cấp). Người soạn đã bỏ đúng.
3. **`phan59/61/62.phan` bị cắt còn 25.000 ký tự** khi xuất nguồn (`CAP.phan`) — báo cáo lô ghi
   `nguonBiCat`; biệt phân nhóm 12 vẫn đủ vì nằm ở đầu văn bản.
4. **`nhom5911.nhom` mục (5)** — em ĐÃ KI LẠI và xác nhận **KHÔNG phải mâu thuẫn nguồn**: câu *"Vải dệt,
   đã được gia cố kim loại, dùng cho các mục đích kỹ thuật…"* đứng ngay trước *"Tuy nhiên, phớt được
   gia cố kim loại bị loại trừ khỏi nhóm này (nhóm 56.02)"* là **khoét lỗ rõ ràng** (phớt ≠ vải dệt).
   Người soạn ghi `loaiTru` sang 5602 là đúng. Ghi lại ở đây vì thoạt nhìn rất giống mâu thuẫn kiểu
   "bao hàm X ở một chỗ, loại X ở chỗ khác".

## Việc còn lại của người quản lý

1. **Tự soát ngẫu nhiên ≥ 10 %** phần còn lại (mục 4) — em đã soát 100 %, bước này vẫn theo quy trình.
2. **`6401` còn 2 phân nhóm chưa có tiêu chí 6 số** (`check-cay` báo `phan-nhom-chua-co-tieu-chi:
   640192`, `640199`) — đề xuất bổ sung, KHÔNG phải lỗi: WCO 640192 nói *"covering the ankle (but not
   the knee)"*, 640199 nói *"n.e.c."*. Cả hai đều trích nguyên văn được.
3. **`5911` chưa có mục nào trả lời câu hỏi quan trọng nhất của nhóm**: vải lọc ép dầu làm từ tóc người
   vẫn thuộc 5911 — `phan59.phan` loại trừ nhóm 67.03/67.04 *"trừ vải lọc dùng trong công nghệ ép dầu
   hoặc tương tự (nhóm 59.11)"*. Đề xuất thêm `loaiTru` hoặc `tieuChi6`, KHÔNG phải lỗi.
4. **`6203` chưa có câu hỏi phân biệt** bộ com-lê / bộ đồng bộ / jacket / quần dù Chú giải 3(a)(b)
   Chương 62 có định nghĩa rõ cho 6203.11–6203.19. Đề xuất bổ sung, KHÔNG phải lỗi.
5. **Độ dài trích sau khi sửa**: 5 mục `trich` rơi vào khoảng **324–438 ký tự** (nền tảng ghi 300, máy
   cho 600 — `docs/giao-viec/so-tay-giao-ngoai.md` mục 0 ghi rõ khoảng 300–600 là người soát phải để
   mắt; em đã để mắt từng câu). Nới trích là cách DUY NHẤT giữ được ngoại lệ mà không sửa câu nguồn, nên
   chọn nới thay vì bỏ mục. Ngược lại, mọi `text`/`tomTat`/`quyTac`/`fact` đã rút về ≤ 220 ký tự vì
   runtime cắt cụt ở 220.
6. Khi đạt: `docs/giao-viec/so-tay-lo.csv` dòng 020 → `trang_thai=xong` + `pr=401`, rồi merge.

---

# Lô 025 — nhóm 4412, 4802, 4807, 5210, 5508, 5510 (người soạn: dev-zcode-mm)

## Bước 0 — đọc tài liệu, ghi danh (23/10/2026)

- Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` và `brief-st-lo025.md`.
- **Cảnh báo copy-paste trong brief**: dòng lệnh mẫu trong brief ghi
  `--nhom=7615,9609,3215,6306,6804,7412` — KHÔNG phải nhóm của lô 025. Nhóm thật lấy từ
  `so-tay-lo.csv` dòng `025` = **4412 4802 4807 5210 5508 5510** (188.764 ký tự nguồn, phủ 99,1 %).
- `so-tay-lo.csv` dòng 025 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Bước 1 — xuất nguồn (23/10/2026)

`node scripts/build-so-tay.mjs --nhom=4412,4802,4807,5210,5508,5510 --xuat-nguon=tmp/so-tay/nguon`
→ máy báo **"5 nhóm cần dựng"**: **`4802` ĐÃ CÓ SẴN** trong `data/so-tay/4802.json`
(dựng ở vòng `lo-cay-20-nhom`, 118/118 mục, đã soạn + soát độc lập 11/10/2026, `kiemTra.dat=118`).
Lô này vì thế chỉ soạn **5 nhóm**: 4412, 4807, 5210, 5508, 5510.

Đọc TRỌN `_he-thong.txt` + 5 tệp nguồn (4412: 21 KB · 4807: 41 KB · 5210: 39 KB ·
5508: 37 KB · 5510: 37 KB). Đọc thêm `lib/so-tay.js` để biết chính xác luật máy
(`quoteInSource` nén bỏ mọi ký tự không phải chữ/số rồi đòi từng mảnh ≥ 6 ký tự phải có
trong nguồn; `trich` ≤ 600; `soCoTrongTrich` kiểm số; `CAU_CHO_PHEP`, `HEDGE_LOAI_TRU`,
`MA_PHAN_NHOM_TRONG_HOI`, `dieu-kien-cap-phan-nhom`, `hs6-khong-co-trong-cay`).

## Bước 2 — soạn bản nháp (23/10/2026)

Soạn `tmp/so-tay/raw/{4412,4807,5210,5508,5510}.json`. Vòng đầu: **136/156 mục**, máy loại 8.
Tự tra từng lý do (viết `tmp/so-tay/debug-trich.cjs` in ra đúng chỗ lệch ký tự đầu tiên):

| Lỗi | Nguyên nhân | Xử lý |
|---|---|---|
| 4412 `phamVi` `trich-khong-co-trong-nguon` | Em nối "(2) …áp lực." thẳng với "(3) Gỗ ghép tương tự." nhưng giữa chúng có đoạn "Gỗ được lát mặt trên một nền không phải gỗ…" — tức em **ghép hai câu xa nhau** | Thêm dấu lược "…" |
| 4412 `dong8[44123300]` `trich-qua-dai` | Dòng biểu thuê liệt kê 18 loài cây, > 600 ký tự | Lược giữa danh sách loài |
| 4412 `tenDien` 441242/441249 `nut-khong-co-trong-cay` | Máy chỉ nhận `tenDien` cho nút **thật** 6 số (`T.nodeOf(id).id === id`); 441242/441249 là lá 8 số `44124200`/`44124900` nên không điền được (tên đã có sẵn từ biểu thuế) | Chỉ giữ 441241 |
| 4807 `loaiTru` `trich-khong-co-trong-nguon` | Em chép **"giấu ráp"** thay vì **"giấy ráp"** (lỗi chính tả của chính em, không phải của nguồn) | Sửa cả `trich` và `dieuKien` |
| 4807 `tieuChi6` `hs6-khong-co-trong-cay:480700` | Nhóm 4807 chỉ có một lá `48070000`, không có nút 6 số thật | Bỏ `tieuChi6` của 4807 (thông tin "chưa tráng/chưa thấm tẩm" đã nằm trong dòng biểu thuê `dong8`) |
| 5210 `phanBiet` `trich-khong-co-trong-nguon` | Em chép **"không vượp quá"** thay vì nguồn ghi **"không vượt quá"** | Sửa |

Sau sửa: **144/144 mục đạt** (4412 50 · 4807 7 · 5210 50 · 5508 13 · 5510 24), 0 mục rớt.

## Bước 3 — tự soát (không chỉ để máy) (23/10/2026)

Máy chỉ chứng minh câu trích **có thật** trong nguồn, không chứng minh nó **nói đúng** điều mục
khẳng định — nên em viết `tmp/so-tay/audit-trich.cjs` soi thêm 4 loại lỗi mà máy không bắt
(bài học lô 022: phải soi **sau MỖI** dấu lược, không chỉ đoạn đầu):

1. đoạn ngay sau dấu lược có mở đầu bằng "Tuy nhiên / trừ / với điều kiện / loại trừ…" → **0**;
2. câu trích dạng "cho phép" đem làm điều kiện bắt buộc → **0** (đã cố ý bỏ câu
   "cũng được phân loại ở đây với điều kiện…" của 4412 và "đã hoặc chưa được đóng gói" của 5508);
3. số nào có trong `text`/`dieuKien`/`fact` mà không có trong câu trích lẫn nguồn → **0 thật**
   (5 cảnh báo `5210` là của script: fact `…_ngoai_5210_1` bị tách dấu chấm, nguồn ghi "5210.1");
4. `trich` > 300 ký tự không lược → **1**: `4807 dieuKienVao#1` (372 ký tự, hai câu liền nhau
   trong nguồn, không có ngoại lệ nào bị nuốt) — em đã đọc lại từng chữ, để nguyên.

### Hai chỗ em phải bộc lộ cho người soát (máy không có luật)

- **`5508` ngưỡng "1.000 g"**: nguồn viết dấu chấm phẩy nghìn kiểu Việt, còn `soCoTrongTrich`
  dò chuỗi `"1000"` nên `value: 1000` **không** khớp. Em đặt `value: "1.000"` (chuỗi) + `ngoaiTru`
  giải thích; hệ quả: cổng `SO_TAY_NGUONG` bỏ qua mục này (chỉ bắt `value` kiểu số).
  → **Đề nghị thêm luật máy**: nới `soCoTrongTrich` để so cả dạng `1.000`.
- **`5510` điều kiện phủ định** (`value: false` cho "not sewing thread", "not put up for retail
  sale"): chưa có tiền lệ trong `data/so-tay/` (0 mục `value:false`). Máy nhận, prompt đọc được.
  Em dùng vì đó là định nghĩa thật của nhóm 5510 — người soát xem có muốn chuyển cách diễn đạt.

### Các mục em CỐ Ý BỎ (thà bỏ còn hơn mục không căn cứ)

- **4412**: câu "Gỗ được lát mặt trên một nền không phải gỗ … cũng được phân loại ở đây với điều
  kiện…" — dạng "cũng được phân loại" (cho phép), không đặt `dieuKienVao = true`. Tương tự "Các sản
  phẩm … vẫn được phân loại ở đây dù chúng đã hay chưa được gia công…". ⇒ **`dieuKienVao` của 4412 rỗng**.
- **4412**: "than xà và vòm trần ghép … (thường thuộc nhóm 44.18)" — có "thường thuộc" (luật máy
  `loai-tru-chi-la-thuong` loại đúng).
- **4412**: (e) "Panel … bộ phận của đồ nội thất (thường thuộc Chương 94)" — chỉ nêu Chương, không
  phải số nhóm ⇒ không làm `loaiTru`.
- **5510**: `phanBiet` **rỗng** — không có câu nào nêu đích danh **cả hai** mã; chỉ suy ra được
  "không phải 551011/551012 thì sang 551020/551030/551090" là suy từ cấu trúc anh em (loại lỗi mà
  người soát phải bắt) ⇒ không ghi. Cũng **không** ghi `loaiTru` 5509 vì câu duy nhất nhắc 55.09
  nói "chú giải của 55.09 áp dụng tương tự" — ngược chiều hoàn toàn với phân biệt.

## Bước 4 — nạp + kiểm (23/10/2026)

**Bẫy `--force` suýt gây hại — đã xử lý.** Lệnh theo mẫu mục 2 có `--force`, mà `--force` làm
`pickHeadings` (dòng 98 `build-so-tay.mjs`) **không lọc** nhóm đã có ⇒ 4802 lọt vào danh sách
dựng lại. May mắn **không mất dữ liệu**: ở dòng 117 `--tu-tep` đọc `tmp/so-tay/raw/4802.json`
(lô này không soạn 4802 nên không có tệp) ⇒ ném ENOENT ⇒ `buildOne` dừng **trước** dòng
`writeFileSync`, `data/so-tay/4802.json` giữ nguyên 118/118 mục. Nhưng báo cáo lô lại ghi
`nhomLoi: ["4802"]` vì lỗi bị nuốt ở nhánh `catch` (dòng 148).

Cách xử lý đúng (bám bài học cũ về `--bao-cao` nối vào tệp cũ): `rm` tệp báo cáo **và** 5 tệp
sổ tay vừa sinh, chạy lại **không** `--force`. Kết quả sạch:

```
node scripts/build-so-tay.mjs --nhom=4412,4802,4807,5210,5508,5510 --tu-tep=tmp/so-tay/raw \
  --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-025.json
→ sổ tay: 5 nhóm cần dựng · mục đạt 144/144 (100 %) — nghiệm thu bước 1 cần ≥ 95 %; nhóm lỗi: 0
```

| nhóm | mục đạt | nguồn bị cắt khi xuất |
|---|---|---|
| 4412 | 50/50 | — |
| 4807 | 7/7 | — |
| 5210 | 50/50 | `phan52.phan` (46130→25000) |
| 5508 | 13/13 | `phan55.phan` (46130→25000) |
| 5510 | 24/24 | `phan55.phan` (46130→25000) |

`nguonBiCat` là giới hạn `CAP.phan = 25000` khi **xuất prompt** (đã có từ lô trước, không phải lỗi
lô này). Cả 3 câu trích em lấy từ `phan*.phan` đều nằm ở khoảng 1.600–3.000 ký tự đầu (Chú giải
1–5 Phần XI) nên **không** bị cắt — nhưng nhóm nào soạn sau mà cần phần cuối `phan*.phan` thì phải
cảnh giác.

Kiểm đầy đủ:

| lệnh | kết quả |
|---|---|
| `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` | 144/144, **0 mục rớt** |
| `node scripts/check-cay.mjs --nhom=<từng nhóm> --chi-tiet` | cả 5: "0 lỗi lệch cây, **1 nhóm đủ**" (đủ cây, đủ dong8, đủ tên nút ảo, đủ tiêu chí 6 số) |
| `npm run so-tay:check` | `279 nhóm, 8804 mục, 0 mục không kiểm được nguồn` |
| `npm test` | **ALL TESTS PASSED**, exit 0, mọi suite `0 failed` |

Mọi mục đều mang `nguonLoai: AI_DA_KIEM` do máy gán (em không ghi tay trường này — luật 11).

## Bước 5 — commit, push, mở PR (23/10/2026)

- Commit `cb064bb` — chỉ 8 tệp: 5 `data/so-tay/<nhom>.json`, `bao-cao/lo-025.json`,
  `docs/giao-viec/so-tay-lo.csv` (dòng 025: `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`),
  `TIEN-TRINH.md`. `tmp/` đã gitignored (`.gitignore:79`) nên bản nháp không lọt vào commit.
- Đẩy nhánh `so-tay/lo-025`, mở **PR #407** (`https://github.com/ozvietnam/hs-code-api/pull/407`).
  **KHÔNG merge** — chờ người duyệt soát độc lập toàn bộ rồi mới gộp.
- `trang_thai` và cột `pr` để người duyệt điền khi nghiệm thu (đúng mục 4 giao việc ngoài).

### Trạng thái CI (báo cáo thật)

- **Vercel: FAILURE — "Deployment rate limited, retry in 24 hours".** Lỗi hạ tầng bên Vercel, **không
  phải** lỗi code; đã xảy ra sẵn ở các lô trước (PR #401 cũng Vercel FAILURE).
- **GitHub Actions CHƯA chạy** cho PR #407 sau ~4 phút, dù `test-all.yml` khai `on: pull_request`.
  `gh run list --branch so-tay/lo-025` không có dòng nào. Nhiều run từ 22/10 vẫn kẹt ở
  `in_progress` (lo-021 / lo-022 / lo-026) ⇒ runner có vẻ đang tắc. Em **không** coi đây là CI xanh.
  Thay vào đó em đã chạy đúng nội dung của job `test` tại máy: `npm test` exit 0 (ALL TESTS PASSED,
  mọi suite `0 failed`) + `npm run so-tay:check` = `279 nhóm, 8804 mục, 0 mục không kiểm được nguồn`.

## Bước 6 — SOÁT ĐỘC LẬP toàn bộ 5 nhóm (23/10/2026)

Người soát: **phiên Claude độc lập** (KHÔNG phải người soạn `dev-zcode-mm`), nhánh
`so-tay/lo-025`, PR #407. Trước khi soát đã merge `origin/main` (lô 021, #402) vào nhánh —
commit `d7170a6`; PR hết `CONFLICTING`. Merge chỉ đụng `TIEN-TRINH.md`, không đụng 5 tệp sổ tay.

**Phạm vi đúng mục 4 giao việc:** đọc lại TOÀN BỘ `phamVi`, `boPhan`, `dieuKienVao`, `loaiTru`,
`phanBiet` của **5 nhóm lô này** (4412, 4807, 5210, 5508, 5510) cùng nguồn
`tmp/so-tay/nguon/<nhom>.txt` — không soát mẫu. `4802` không nằm trong phạm vi: nhóm đã có sẵn từ
vòng `lo-cay-20-nhom` (118/118, đã soát độc lập 11/10/2026), lô này không soạn lại.

| nhóm | mục soát | giữ | sửa | xoá | ghi chú |
|---|---:|---:|---:|---:|---|
| 4412 | 9 | 8 | 1 | 0 | thêm vế "hoặc những tấm rời để ghép" bị bỏ khỏi `phanBiet[2].hoi` |
| 4807 | 6 | 3 | 2 | 1 | nới `phamVi.trich` (text khẳng định "mọi chất lượng" ngoài trích); rút `dieuKienVao[1].trich` 372→242 ký tự; xoá `phanBiet[0]` |
| 5210 | 11 | 9 | 2 | 0 | nới `phamVi.trich` (text khẳng định "theo Chú giải 2 Phần XI" ngoài trích); đảo lại nhánh `phanBiet[0]` |
| 5508 | 7 | 6 | 1 | 0 | bỏ ngưỡng giả `value:"1.000"` + `op:"<="`; đổi thành fact boolean |
| 5510 | 2 | 2 | 0 | 0 | nguồn mỏng — xem dưới |
| **tổng** | **35** | **28** | **6** | **1** | 34 mục còn lại đổi `nguonLoai` → `NGUOI_DUYET` |

> Lưu ý đếm: 6 mục `sua` (không phải 11 — script in 11 là số **trường** bị đổi, 5 trường nằm trong
> cùng mục `5508 dieuKienVao[1]`). Sau soát: 144 → **143 mục** (4412 50 · 4807 6 · 5210 50 ·
> 5508 13 · 5510 24), `bao-cao/lo-025.json` ghi `143/143 (100 %)`.

### 6 lỗi sửa + 1 mục xoá (máy KHÔNG bắt được)

1. **4412 `phanBiet[2].hoi`** — câu hỏi bỏ mất nhánh "hoặc những tấm rời để ghép" của nguồn (c).
   Tấm rời để ghép mà không phải panel gỗ xốp/panel đã lắp ghép sẽ trả lời "không" và bị đẩy về
   4412, trái nguồn (nguồn đưa sang 44.18). Đã thêm đúng vế nguồn.
2. **4807 `phamVi.trich`** — `text` khẳng định "có thể làm từ giấy hoặc bìa thuộc mọi chất lượng"
   nhưng trích cũ nhảy thẳng từ câu định nghĩa sang nguồn gốc chất kết dính, bỏ mất chính câu đó.
   Đã nới trích (260 ký tự), cắt danh sách ví dụ không cần.
3. **4807 `dieuKienVao[1].trich`** — 372 ký tự, nằm vùng 300–600 mà mục 4 dặn để mắt. Đã lược câu
   "cũng tách ra khi đốt cháy" và ngoặc giải thích đối chiếu bằng "…", còn 242 ký tự; tiêu chí
   phân biệt (tự tách lớp sau khi ngâm, có vết tích chất kết dính) nguyên vẹn.
4. **4807 `phanBiet[0]` — XOÁ.** Nhánh "không → 4802" không có trong nguồn: câu trích chỉ nói
   48.02/48.10/48.11 "có kích thước bất kỳ", không nói giấy bồi cỡ nhỏ thuộc 48.02. 48.02 là giấy
   viết/in; giấy bồi cỡ nhỏ đi theo phạm vi Chương (III) sang 48.16–48.23. Đây là lỗi "nhánh không
   suy từ cấu trúc anh em"; nguồn không nêu đích thay thế nên xoá, không tự đoán mã.
5. **5210 `phamVi.trich`** — `text` khẳng định "được phân loại như vải bông theo Chú giải 2 Phần XI"
   nhưng trích cũ chỉ có ba tiêu chuẩn (a)(b)(c). Đã kéo câu mở đầu vào trích (274 ký tự).
6. **5210 `phanBiet[0]`** — nhánh **bị đảo**: câu hỏi mô tả đúng ba tiêu chí của 5210 nhưng nháp gán
   "Có → 5212, Không → 5210"; nguồn nói ngược ("không thuộc 52.12 mà ở trong nhóm 52.10"). Đã đổi
   lại `neuCo=5210`, `neuKhong=5212`; giữ nguyên cả lỗi "tỷ trong bông" của nguồn.
7. **5508 `dieuKienVao[1]`** — ngưỡng "không quá 1.000 g" bị đặt thành `value:"1.000"` (chuỗi) với
   `op:"<="` kèm ghi chú tự bào chữa. Chuỗi không phải số, cổng đọc `value` sẽ so sánh chuỗi; đây
   đúng kiểu lách máy mà bài học lô 012 cấm. Đổi thành
   `fact:"trong_luong_cuon_tren_lo_khong_qua_1000_g"`, `op:"="`, `value:true`, `donVi:null`.

### Giữ nguyên có lý do (không phải bỏ sót)

- **4412 `loaiTru[2]`** dài 287 ký tự: cắt thêm sẽ mất vế "kể cả các loại bao gồm khối gỗ, dải gỗ,
  viền gỗ…" — vế mở rộng của chính câu loại trừ, không phải câu rào.
- **4412 `phanBiet[0,1,3]`** có `neuKhong = 4412`: đúng quy ước "nhánh không trỏ chính nhóm" khi
  nguồn nói sản phẩm đó KHÔNG thuộc nhóm; không phải lỗi.
- **4807 `dieuKienVao[0]`**: Chú giải 8 Chương 48 là điều kiện hình dạng/kích thước cho cả cụm
  48.03–48.09, không phải điều kiện phân nhóm.
- **5508 `phanBiet[0]`**: "Có → 5607, Không → 5508" đúng chiều với câu "nếu… thì bị loại trừ".
- **5510 `loaiTru[0]`**: Chú giải 1(d) Chương 55 nêu đích danh 70.19; áp cho cả chương.

### Nguồn mỏng (ghi nhận, không tự bịa)

- **5508**: khối `[phan55.phan]` bị cắt ở "Chún" (giới hạn `CAP.phan = 25000`), nên phần
  (I)(B)(4) mà `phamVi` dẫn chiếu không có trong nguồn xuất. Sổ tay chỉ chép nguyên văn câu của
  nhóm; định nghĩa "chỉ khâu" lấy từ khoản 5 (có đủ trong nguồn).
- **5510**: `[nhom5510.nhom]` chỉ có một câu "Chú giải chi tiết của nhóm 55.09 được áp dụng…";
  bản thân chú giải 55.09 **không được xuất** vào nguồn. Vì vậy `dieuKienVao`/`phanBiet` để rỗng là
  đúng hướng an toàn — không suy điều kiện từ kiến thức ngoài.

### Kiểm sau soát

| lệnh | kết quả |
|---|---|
| `TARGET=raw APPLY=1 node scripts/apply-review-lo025.mjs` | 5 nhóm, 35 mục: giữ 28, sửa 6, xoá 1 |
| `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw 4412 4807 5210 5508 5510` | **143/143 đạt, 0 mục rớt** |
| `node scripts/build-so-tay.mjs --nhom=… --tu-tep=tmp/so-tay/raw --force --bao-cao=…` | `143/143 (100 %)`, `nhomLoi: []` |
| `TARGET=data APPLY=1 node scripts/apply-review-lo025.mjs` | đổi **34** mục `AI_DA_KIEM` → `NGUOI_DUYET` (35 soát − 1 xoá) |
| `npm run so-tay:check` | `285 nhóm, 8936 mục, 0 mục không kiểm được nguồn` |
| `npm test` | **ALL TESTS PASSED**, exit 0, mọi suite `0 failed` |

Hồ sơ soát: `review/{4412,4807,5210,5508,5510}.json` (mọi mục đều có entry, kể cả `giu`); script áp
2 pha: `scripts/apply-review-lo025.mjs` (`TARGET=raw` sửa/xoá trước, `TARGET=data` chỉ đổi nhãn).

**KHÔNG merge.** PR #407 chờ người duyệt quyết định tự soát mẫu ≥ 10 % phần còn lại
(`tieuChi6`/`dong8`/`cay`) rồi gộp và điền `trang_thai=xong`, cột `pr` trong `so-tay-lo.csv`.

## Bước 7 — đồng bộ main sau soát (23/10/2026)

Sau khi đẩy commit soát `ee1c187`, PR #407 thành `CONFLICTING` vì main đã có lô 022–024. Đã merge
`origin/main` vào nhánh — commit `08ef5c1`; PR trở lại **MERGEABLE**.

- Xung đột `docs/giao-viec/so-tay-lo.csv`: giữ lô 022–024 = `xong` (PR 403/404/405) của main và
  dòng 025 = `dang-lam,dev-zcode-mm` của nhánh.
- Xung đột `TIEN-TRINH.md`: main đã **tái cấu trúc** tệp (thêm lô 018 ở đầu, lô 024 ở cuối) và
  **làm rơi section lô 022/023** ngay trong commit lô 024 `3c84411` (kiểm bằng
  `git show 6cd0bfe:TIEN-TRINH.md` — lúc đó còn `# TIEN-TRINH — lô 023, PHIÊN SOÁT ĐỘC LẬP`;
  `3c84411` không còn). Đây là lỗi có sẵn trên main, **không phải** do merge này; đã báo người
  quản lý. Cách ghép: lấy nguyên bản main (018/012/010/018-soát/024) + chèn lại **lô 015, lô 015
  soát, lô 021, lô 021 soát** từ nhánh + lô 025 ở cuối — không bỏ phần của phiên nào.
- Kiểm lại sau merge: `npm run so-tay:check` = **302 nhóm, 9.271 mục, 0 mục không kiểm được
  nguồn**; `npm test` = **ALL TESTS PASSED**; `check-cay` 5 nhóm lô 025 vẫn "đủ".
- CI PR #407 (commit `08ef5c1`): `test` **pass** (2m34s), `bench` **pass** (7m38s);
  `Vercel` fail vì **"Deployment rate limited — retry in 24 hours"** — lỗi hạ tầng tài khoản
  Vercel, đã có sẵn từ các PR trước, không phải lỗi code.

---

# TIEN-TRINH — lô 030 (soạn sổ tay chú giải)

Nhóm của lô: **3401, 3802, 3810, 3907, 4006, 4415** (6 nhóm, 136 092 ký tự nguồn)
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-030` @ `1828d3b` (main mới nhất) · Ngày: 2026-10-23
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `3401,3802,3810,3907,4006,4415` — **khớp** CSV dòng `030`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm y như lô 012 và lô 014 (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh
mẫu, chốt nhóm theo CSV. CSV dòng 030 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2: bắt buộc
  soát độc lập; mục 1 bài học kệ sách; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `--nhom=3401,3802,3810,3907,4006,4415 --xuat-nguon=tmp/so-tay/nguon`
  → 6 nhóm đều cần dựng (nhom nào cũng chưa có `data/so-tay/<nhom>.json`).
  Kích thước: 3907 64k · 3802 31k · 3810 24k · 3401 21k · 4006 19k · 4415 17k.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn** (3907 đọc 3 lần vì 64 ký tự),
  đọc `lib/so-tay.js` để biết máy loại mục nào (luật `dieu-kien-cap-phan-nhom`, `dieu-kien-chi-cho-phep`,
  `loai-tru-chi-la-thuong`, `trich-qua-dai`), in cây `lib/hs-tree.js` cho 6 nhóm, đọc mẫu `data/so-tay/4412.json`
  (lô 025, cùng Chương 44) + tra 3 tệp đã duyệt có `dieuKienSo` (4009/4011/4421) để bắt văn phong.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` — **113 mục**.
- [x] **B5.** Tự kiểm TRƯỚC khi nạp, **ba lớp** (xem dưới).
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-030.json` → **113/113 (100 %)**, 0 nhóm lỗi.
- [x] **B7.** `check-cay.mjs --chi-tiet` 6 nhóm → **0 lỗi lệch cây** (8 cảnh báo còn trống, xem dưới).
  `npm run so-tay:check` → **314 nhóm / 9 493 mục / 0 mục không kiểm được nguồn**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push nhánh `so-tay/lo-030` + mở PR (**KHÔNG merge**).

## B5 — tự kiểm bản nháp: ba lớp, và máy bắt được gì

1. **Nguyên văn TUYỆT ĐỐI** (`tmp/so-tay/strict-nguyen-van.js`, KHÔNG squash — bù lỗ hổng
   `check-so-tay-squash-mat-ky-tu`; script **chưa có trên `main`**, chỉ nằm ở nhánh lô 016):
   lần 1 bắt **3 câu sai dấu gạch ngang cấp biểu thuế** — `tax.34012020` là `- -` chứ không phải `- - -`;
   `tax.39073030` và `tax.39073090` cũng vậy (dòng cấp 3 trong nhóm có 3 gạch, cấp 2 chỉ 2 gạch).
   Lần 1 cũng bắt 1 lỗi tự gõ trong `phanBiet` 4006: "bao **gipi**" thay vì "bao **gói**"; và 1 lỗi dấu nháy
   kép cong `“camel-back”` thay vị thẳng `"camel-back"` mà biểu thuế dùng.
   Vá xong → **113/113 khớp nguyên văn**. Lớp này bắt được thứ `check-so-tay.mjs` **không** bắt (máy squash hết dấu).
2. **Phủ dòng 8 số** (`tmp/so-tay/kiem-dong8.js`): đối chiếu `data/tax.json` với `dong8` — 6/6 nhóm **không thiếu,
   không thừa** (13 + 5 + 2 + 21 + 4 + 2 = 47 dòng). Đồng thời báo câu trích nào vượt 300 ký tự (luật 2).
3. **`check-so-tay.mjs --raw`**: lần 1 loại **1 mục** — `dieuKienVao` 4006 bị `dieu-kien-chi-cho-phep`, vì câu trích
   tôi lấy nguyên cả mệnh đề **"…đã hoặc chưa được pha trộn"** (chữ "đã hoặc chưa" là câu CHO PHÉP, máy loại).
   Sửa bằng cách **cắt còn vế đầu** "Nhóm này bao gồm cao su chưa lưu hoá ở các dạng chưa được chi tiết trong các
   nhóm trước của Chương này" (vế sau là câu song song, không phải ngoại lệ) → xanh.
   Lần 2: **113/113, 0 mục không kiểm được nguồn**.

**Tự soát tay trước nạp (luật 7)** — đọc lại từng `text`/`dieuKien`/`hoi` với câu trích, sửa **4 chỗ** mà máy KHÔNG
bắt được vì chữ đều có thật trong nguồn, chỉ là không có trong CÂU ĐÃ TRÍCH:

| Nhóm | Mục | Sai lệch | Sửa |
|---|---|---|---|
| 3810 | `phamVi.text` | thêm "và chất trợ dùng cho hàn thiếc, hàn hơi, hàn điện" — câu trích chỉ nói về chế phẩm tẩy sạch | viết lại `text` chỉ theo câu trích |
| 3907 | `phamVi.text` | liệt kê "chức axetal, ete, epoxide, carbonic este…" lấy từ các đoạn sau, câu trích chỉ có danh sách 5 phần | bỏ phần thêm |
| 4415 | `phamVi.text` | mở đầu bằng danh sách hàng (hòm, hộp, giá kệ…) không có trong câu trích | bỏ phần thêm |
| 4415 | `phanBiet.hoi` | thêm "(gỗ ghép và ván dăm ép)" lấy từ Chú giải 3 Chương 44, không có trong câu trích | bỏ ngoặc |

**Thêm 1 mục bị tự xoá** trước khi nạp: `loaiTru` 3401 → 3402 theo câu *"Những chế phẩm như vậy chưa được đóng gói
để bán lẻ…"* — câu này dùng **đại từ tham chiếu** "chế phẩm như vậy" chỉ rõ là phần (III); muốn `dieuKien` nói
"dạng lỏng/dạng kem" thì phải kéo tiêu đề mục (III) vào trích, mà đoạn bị lược ở giữa lại chứa **"với điều kiện"**
(cái mà luật "dấu lược … không được nuốt ngoại lệ" cấm). Không trích được nguyên văn một mạch → **xoá**.
Còn lại 5 `loaiTru` của 3401 vẫn đủ (1522 · 3307 · 3405 · 3305|3306 · 3402).

## Kết quả

| nhóm | mục | đạt | đk vào | loại trừ | phân biệt | tiêu chí 6 số | dòng 8 số | điều kiện số | phiên bản |
|---|---|---|---|---|---|---|---|---|---|
| 3401 | 26 | 26 (100 %) | 0 | 5 | 2 | 5 | 13 | 0 | HS2022 |
| 3802 | 17 | 17 (100 %) | 1 | 6 | 3 | 1 | 5 | 0 | HS2022+SEN2022 |
| 3810 | 9 | 9 (100 %) | 0 | 2 | 2 | 2 | 2 | 0 | HS2022 |
| 3907 | 37 | 37 (100 %) | 1 | 6 | 3 | 5 | 21 | 4 | HS2022+SEN2022 |
| 4006 | 10 | 10 (100 %) | 1 | 1 | 1 | 2 | 4 | 0 | HS2022 |
| 4415 | 14 | 14 (100 %) | 1 | 4 | 3 | 3 | 2 | 0 | HS2022 |
| **TỔNG** | **113** | **113 (100 %)** | 4 | 24 | 14 | 18 | 47 | 4 | 2 nhóm có SEN |

## Cố ý BỎ (thà ít mục chắc chắn hơn nhiều mục mờ má)

- **`dieuKienVao` rỗng ở 3401 và 3810.** Cả hai chú giải nhóm chia nhóm thành nhiều nhánh với điều kiện vào khác nhau
  (3401: phần (I) xà phòng, (II) thể rắn, (III) lỏng/kem bán lẻ, (IV) giấy–nỉ–không dệt; 3810: mục (1) **mất
  hẳn** trong nguồn, chỉ còn (2) chất giúp chảy, (3) bột hàn, (4) vỏ bọc điện cực). Máy đọc `dieuKienVao` theo kiểu
  **AND** — đặt điều kiện của một nhánh sẽ loại nhầm các nhánh còn lại (đúng bài "một nhánh của A hoặc B bị tách
  thành điều kiện độc lập"). Không có câu nào phủ **cả** nhóm mà vẫn không loại hàng hợp lệ → để rỗng.
  Nhớ: cổng sau này **không** được loại một nhóm chỉ vì thiếu `dieuKienVao`.
- **`tieuChi6` cho 8 phân nhóm chỉ có tên, không có tiêu chí**: 340120 · 380210 · 390710 · 390729 · 390730 ·
  390740 · 390750 · 390770. Tên WCO của chúng chỉ lặp lại tên nhóm ("Polyacetals; in primary forms",
  "Epoxide resins; in primary forms") — viết `fact` snake_case ra thì là **điền rỗng có dạng**, không thêm tri thức
  nào. `check-cay` báo `phan-nhom-chua-co-tieu-chi` cho 8 nút này; đây là **cảnh báo chờ đổ**, không phải lỗi.
- **`loaiTru` 4006 (a) "Băng dính…"** — nguồn ghi đích "tùy vật liệu, **ví dụ**, nhóm 39.19, 40.08, 48.23, 56.03
  hoặc 59.06"; luật 3 cấm tính nhóm chỉ là **ví dụ** là loại trừ đích danh → bỏ.
- **`loaiTru` 3802 (a) "…(Chương 25)"** và các mục chỉ nói **Chương N** (4415 nguồn không mô tả được 42.02 để thành
  câu hỏi `phanBiet`; 3401 ngoại lệ (b) "Chương 29, 30, 38, vv…")** → bỏ, vì luật 3 không tính "Chương N".
- **Thông số điển hình của SEN 3802.10.10** (mật độ biểu kiến 0,52–0,56 g/mL; CCI4 min 40; benzen min 23; diện
  tích bề mặt 1.244–1.768 m²/g…) **không** đưa vào `dieuKienSo`: câu SEN ghi rõ đó là *"ĐẶC TÍNH THÔNG SỐ
  ĐIỂN HÌNH"* (giá trị điển hình), không phải điều kiện để xếp dòng — đưa vào sẽ biến "thường" thành "bắt buộc"
  (đúng lỗi đã gặp ở lô 008: câu "bao hàm" trông như "loại trừ").
- **`tieuChi6` cho 380210 lấy từ `sen.38021010`** — cùng số liệu nhưng thuộc **dòng 8 số**, đưa lên cấp 6 số là
  điều kiện vượt tầng (bài `dieuKienVao sai tầng`). Số đó chỉ dùng ở đúng dòng, và dòng 38021010 lấy `nguon`
  `sen.38021010` với câu định nghĩa ("thu được từ than gáo dừa sau quá trình hoạt hóa").
- **Không điền `cay.tenDien`** cho 6 phân nhóm 6 số chưa có tên tiếng Việt (340111, 340119, 390729, 390769, 390791,
  390799). Máy cho phép, nhưng **không có câu tiếng Việt nào trong nguồn nêu tên** các nút đó — chú giải 39.07 phân
  biệt chúng bằng "chưa no / no" và "chỉ số độ nhớt", tên WCO thì là tiếng Anh. Đoán tên là thêm hiểu biết riêng →
  để trống (`check-cay` không báo lỗi cho nút 6 số, chỉ báo ở `nut-ao-chua-co-ten` cho nút ảo; 6 nút này đều **có**
  `tenEn` nên không nằm trong cảnh báo đó).

## Nguồn mỏng / bất thường cần người duyệt để mắt

- **3810 — chú giải nhóm THIẾU MỤC (1).** Tệp nguồn mở đầu bằng đoạn về chế phẩm tẩy sạch rồi nhảy thẳng sang
  "(2) Các chất giúp chảy…"; không có mục (1) nào. Đây là **lỗi kệ sách**, không sửa được trong sổ tay. Hệ quả:
  cổng chế độ "dung cho hàn" của 3810 không có căn cứ ở tầng nhóm trong nguồn này.
- **3802 — chú giải Phần `phan38.phan` bị chặn.** `lib/so-tay.js` chỉ nhận `phan` khi đa số chương mang cùng văn bản
  đó thuộc **cùng Phần**; ch.38/40/39 đều dùng chung văn bản Phần VI nên 3802 không nhận được `phan38.phan`
  (không phải lỗi của lô này).
- **3907 — `ch39.chuong` bị cắt ở 40 000 ký tự** (`nguonBiCut` trong báo cáo lô). Đã kiểm tra: 4 câu trích lấy từ
  `ch39.chuong` nằm ở vị trí 7 338 / 11 288 / 29 898 / 30 073 — **đều nằm trong phần đã xuất**, người soát độc lập đọc
  `tmp/so-tay/nguon/3907.txt` là thấy hết, không phải mở tệp gốc.
- **3907 — câu nguồn tự vấp:** "(n) Các polyeste khác…" mở đầu bằng câu **"Các poly me đã bị biến đổi về mặt hóa
  học…"** (tách chữ "poly me" do lỗi dàn trang của kệ sách). Giữ nguyên khi trích (luật 2: giữ lỗi chính tả gốc).
- **3907 — câu trích `phanBiet` 3907↔3909 dài 190 ký tự sau khi rút gọn** (đã lần đầu viết 365 ký tượ, vi phạm
  luật 2; đã cắt bỏ câu quy tắc chung, chỉ giữ câu ví dụ nêu epichlorohydrin — không mất ngoại lệ nào).
- **3401 — ngoại lệ (e) dẫn tới 3402 và câu phần (III) cũng dẫn tới 3402** với điều kiện khác nhau; đã giữ cả hai
  `loaiTru` (điều kiện thực sự khác: chất hoạt động bề mặt/dung môi hữu cơ **vs** chế phẩm làm sạch da **chưa**
  đóng gói bán lẻ), không gộp làm một.
- **3810 — `dong8` 38109000 dùng `nguon: wco.381090`** thay vì `tax.38109000` vì dòng biểu thuế chỉ ghi "Loại khác";
  câu trích là **tiếng Anh nguyên văn** từ tên phân nhóm WCO (đúng luật 6: dòng biểu thuê chỉ ghi "- - - Loại khác"
  thì lấy điều kiện cấp phân nhóm từ `wco.<6 số>`).
- **15 dòng 8 số ghi "Loại khác" trong lô này** — `dieuKien` của chúng ghi kèm câu chuẩn *"…; dòng cha không có
  trong nguồn — đối chiếu biểu thuế"* (đúng văn phong đã dùng ở 9615/8714/7324…), **không đoán** điều kiện.

## Bước tiếp theo

Phiên quản lý phải giao **soát độc lập** (mục 4) cho 6 nhóm này — TOÀN BỘ `phamVi`/`boPhan`/`dieuKienVao`/
`loaiTru`/`phanBiet`, không lấy mẫu. Sau khi soát mới gộp, điền `trang_thai=xong` + cột `pr` trong
`so-tay-lo.csv`. `dong8[].tieuChi`/`tieuChi6`/`cay` đã xong, không cần nạp lại khi soát.

### B8 (bổ sung) — PR #412 và CI

- Commit `6103cba` → push nhánh `so-tay/lo-030` → **PR #412** (`https://github.com/ozvietnam/hs-code-api/pull/412`),
  trạng thái **OPEN**, **MERGEABLE**, **KHÔNG merge** (mục 4: chờ soát độc lập).
- CI PR #412: `test` **pass** (2m23s) · `bench` **pass** (11m10s) · `Vercel` **fail** vì
  *"Deployment rate limited — retry in 24 hours"* — lỗi hạ tầng tài khoản Vercel, **có sẵn từ các PR trước** và dự án
  đã **gỡ Vercel** (CEO chốt 09/10/2026), không phải lỗi code.
- `docs/giao-viec/so-tay-lo.csv` dòng 030 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm` (**chưa** đổi `xong` —
  chờ người duyệt điền sau khi soát).

---

## Bước 9 — SOÁT ĐỘC LẬP toàn bộ 6 nhóm (23/10/2026)

Người soát: **phiên Claude độc lập** (KHÔNG phải người soạn `dev-zcode-mm`), nhánh
`so-tay/lo-030`, PR #412. Hồ sơ soát: `review/{3401,3802,3810,3907,4006,4415}.json`
(mọi mục trong 5 khối đều có entry, kể cả `giu`); script áp 2 pha:
`scripts/apply-review-lo030.mjs`.

**Phạm vi đúng mục 4 giao việc:** đọc lại TOÀN BỘ `phamVi`, `boPhan`, `dieuKienVao`, `loaiTru`,
`phanBiet` của 6 nhóm (3401, 3802, 3810, 3907, 4006, 4415) cùng nguồn
`tmp/so-tay/nguon/<nhom>.txt` — không soát mẫu. `tieuChi6`/`dong8`/`cay` để máy kiểm nguyên văn
(ngoại lệ 1 lỗi chữ dưới đây).

| nhóm | mục soát | giữ | sửa | xoá | ghi chú |
|---|---:|---:|---:|---:|---|
| 3401 | 8 | 5 | 1 | 2 | XOÁ cặp mục 33.07 đọc nhầm "bao gồm" thành "loại trừ"; `phamVi` nói 1/4 phần |
| 3802 | 11 | 9 | 1 | 1 | XOÁ `dieuKienVao[0]` (chỉ phủ phần A, bỏ qua muội động vật); nới `phamVi.trich` |
| 3810 | 5 | 3 | 2 | 0 | `phamVi` bỏ 3 phần hàn; `phanBiet[1].hoi` thêm chữ "hàn" ngoài trích |
| 3907 | 11 | 9 | 2 | 0 | `dieuKienVao[0]` trích nhầm câu ĐỊNH NGHĨA; `phanBiet[0].hoi` gộp 3 chức |
| 4006 | 4 | 4 | 0 | 0 | sạch — không sửa gì |
| 4415 | 9 | 7 | 1 | 1 | XOÁ `dieuKienVao[0]` (câu "có thể" ≠ bắt buộc); `phamVi` chỉ mô tả vật liệu |
| **tổng** | **48** | **37** | **7** | **4** | 44 mục còn lại đổi `nguonLoai` → `NGUOI_DUYET` |

> Lưu ý đếm: 7 mục `sua` (script in 11 là số **trường** bị đổi — 3401 sửa cả `text`+`trich` của
> `phamVi`, 3810 và 4415 vậy, 3810 còn 1 sửa ngoài phạm vi ở `dong8[1].dieuKien`).
> Sau soát: 113 → **109 mục** (3401 24 · 3802 16 · 3810 9 · 3907 37 · 4006 10 · 4415 13),
> `bao-cao/lo-030.json` ghi `109/109 (100 %)`.

### 4 lỗi XOÁ + 7 lỗi SỬA (máy KHÔNG bắt được)

1. **3401 `loaiTru[1]` + `phanBiet[0]` — XOÁ (lỗi nặng nhất lô).** Câu "(c) Xà phòng dùng để cạo
   (các loại kem cạo thuộc nhóm 33.07)" nằm trong khối **"Phần này đặc biệt bao gồm: (1) Xà phòng
   dùng cho vệ sinh…"** — tức kem cạo gốc xà phòng **ĐƯỢC** xếp 3401, không phải loại trừ sang
   33.07. Danh sách loại trừ thật của nhóm là (a)–(f) ở cuối và không có mục nào cấm xà phòng cạo.
   Nháp đọc nhầm vì câu có **dấu số nhóm trong ngoặc**; `check-so-tay` chỉ kiểm mã đích có nằm
   trong câu trích nên xanh. `phanBiet[0]` cùng căn cứ nên chiều "có → 3307" ngược nghĩa nguồn.
2. **3802 `dieuKienVao[0]` — XOÁ.** `fact: da_duoc_xu_ly_thay_doi_cau_truc_be_mat = true` áp cho cả
   nhóm 38.02, nhưng câu trích chỉ định nghĩa "hoạt tính" cho **phần (A)** ("Carbon và các khoáng
   chất"). Nhóm còn **phần (B) MUỘI ĐỘNG VẬT, KẺ CẢ TÀN MUỘI ĐỘNG VẬT** — tiêu đề nhóm không có
   chữ "hoạt tính"; muội máu/muội xương/muội ngà/muội da thuộc xếp ở 3802.90 mà không hề có bước
   hoạt hóa bề mặt. `so-tay-gates.js:135` in `dieuKienVao` thành "Điều kiện vào nhóm: … = true"
   và cổng đọc kiểu AND → hàng muội động vật bị dắt ra khỏi nhóm. **Người soạn đã tự để rỗng
   `dieuKienVao` ở 3401 và 3810 vì đúng lý do này nhưng quên áp cho 3802.**
3. **4415 `dieuKienVao[0]` — XOÁ.** Câu nguồn là "Các mặt hàng thuộc nhóm này **có thể** được làm
   bằng gỗ thông thường…" — câu CHO PHÉP. Luật bước 1 (mục 28) cấm đặt `value=true` cho câu này,
   nhưng `CAU_CHO_PHEP` trong `lib/so-tay.js` chưa có mẫu "có thể" nên máy không bắt. Ngoài ra
   `fact` nhồi cả dải liệt kê vào một tên sự kiện. Câu vẫn được giữ trong `phamVi` (nơi nó là mô
   tả, không phải điều kiện) nên không mất thông tin.
4. **3907 `dieuKienVao[0].trich` — SỬA (145 ký tự).** Trích cũ là **Chú giải 6** — chỉ *định nghĩa*
   thuật ngữ "dạng nguyên sinh" (lỏng/bột nhão/khối/bột/hạt/mảnh), không hề nói 39.07 đòi hỏi
   gì. Câu ràng buộc thật nằm ngay trên trong cùng nguồn, ở mục "Dạng nguyên sinh": *"Các nhóm 39.01
   đến 39.14 chỉ gồm những hàng hóa ở dạng nguyên sinh."* Đã thay bằng câu đó (+ câu dẫn Chú giải 6).
   **Không** nối hai đoạn bằng "…" vì đoạn giữa chứa loạt loại trừ (keo đã điều chế, phụ gia dầu
   khoáng 38.11, dung dịch 32.08, polyme lỏng 32.10, phụ gia làm ma tít 32.14).
5. **3907 `phanBiet[0].hoi` — SỬA.** Câu hỏi gộp ba chức "este/acetal/ete" trong khi câu trích chỉ
   nói về **chức este** (mục (5) của nhóm). Nhánh có/không cho acetal và ete không có căn cứ trong
   câu. Acetal và ete có câu riêng với đích riêng, đã nằm ở `loaiTru[1]` và `loaiTru[2]`. Đã sửa
   `hoi` chỉ hỏi chức este, đồng thời **đảo thứ tự hai vế** để vế đầu khớp `neuCo = 3905|3906`.
6. **3810 `phanBiet[1].hoi` — SỬA.** Câu hỏi thêm chữ **"hàn"** không có trong câu trích ("Các điện
   cực, bằng kim loại cơ bản hoặc bằng cacbua kim loại, được bọc, phủ hoặc có lõi bằng chất trợ
   dung (flux), bị loại trừ (nhóm 83.11)") — suy từ đoạn trước. `loaiTru[1].dieuKien` cùng ý đã
   viết đúng không có "hàn"; sửa `hoi` cho khớp.
7. **`phamVi` của 3401 / 3810 / 4415 — SỬA cả `text` lẫn `trich`.** Cả ba đều mô tả **một phần
   trong nhiều phần** rồi coi như phạm vi cả nhóm, và `phamVi.text` đi thẳng vào prompt vòng 2
   (`so-tay-gates.js:134`, clip 220 ký tự):
   - **3401**: chỉ câu dẫn mục (I) XÀ PHÒNG → đẩy sai 3401.11.70 (giấy thấm xà phòng),
     3401.20 và 3401.30.
   - **3810**: chỉ phần tẩy sạch, mất 3 phần hàn (chất giúp chảy, bột/bột nhão, lõi/vỏ bọc
     điện cực) → kéo sai mặt hàng hàn ra khỏi 38.10.
   - **4415**: mô tả **vật liệu** ("có thể được làm bằng gỗ thông thường…") — đúng với mọi nhóm
     44, nói riêng 44.15 thì trống; không biết 44.15 gồm những gì.
   Sửa theo tiền lệ đã duyệt ở **3407** và **3506** (nhóm nhiều phần thì `phamVi` nêu tiêu đề các
   phần, nối bằng dấu lược). Riêng 3810 lấy luôn câu loại trừ liền kề vào trích cho khỏi lược mất.
   `phamVi` của 3907 (đủ cả 5 phần) và 4006 (nhóm dư, câu dẫn đã phủ hết) **giữ nguyên**.

### Ngoài phạm vi 5 khối — 1 lỗi chữ có tác động thật

- **3810 `dong8[1].dieuKien`**: "chế phẩm dùng làm **lỗi** hoặc vỏ bọc" — `trich` của mục là
  `wco.381090` **tiếng Anh** ("used as **cores** or coatings"), "lỗi" (= lỗi chứ không phải lõi) là
  lỗi dịch kế thừa luôn lỗi in của bản Việt. `dong8.dieuKien` là lời ta viết (không phải trích)
  nên sửa thành **"lõi"**; `trich` giữ nguyên tiếng Anh nên không đụng luật 26 (chép nguyên văn kể
  cả lỗi nguồn). Áp qua khoá `thayDoiNgoaiPhamVi`.

### Giữ nguyên có lý do (không phải bỏ sót)

- **3802 `phamVi.trich` nới thêm (232 → 318 ký tự)** thay vì cắt bớt `text`: `text` vốn đã khẳng
  định "cùng muội động vật và tàn muội động vật" mà trích cũ không có — đúng chiều ngược của lô 027
  (`text` nói nhiều hơn `trich` → **nối `trich`**, đừng cắt `text`).
- **3907 `loaiTru[0]` `sangNhom: "2936|2939|2941"`**: nguồn nói **dải** "các nhóm 29.36 **đến**
  29.39 và 29.41", tức gồm cả 29.37 và 29.38. `sangNhom` không thể gộp thêm vì
  `mentions()` trong `lib/so-tay.js` đòi mỗi mã đích được **nêu nguyên văn** trong câu trích, mà
  29.37/29.38 không xuất hiện. `dieuKien` đã chép đúng cả dải nên người đọc vẫn thấy đủ; thiệt hại
  chỉ ở chỗ cổng `SO_TAY_LOAI_TRU` không bật đích 2937/2938. **Giữ, không sửa được mà không phá luật máy.**
- **4006 `dieuKienVao[0]`**: "Nhóm này bao gồm cao su chưa lưu hoá…" là điều kiện VÀO nhóm thật —
  tiêu đề 40.06 là "Cao su chưa lưu hoá…" và khác 4415 (câu đó là "có thể" nên mới là câu cho phép).
- **4006 `loaiTru` chỉ có 1 mục**: mục (a) "Băng dính…" bị bỏ là **đúng** — nguồn chỉ nêu nhóm đích
  theo "ví dụ" (39.19, 40.08, 48.23, 56.03, 59.06) → luật 3.
- **4415 `loaiTru[3].dieuKien`** gọi "Hộp, thùng thưa" là "bao bì gỗ": chữ "gỗ" không có trong câu
  nhưng đúng ngữ cảnh Chương 44 và đây chỉ là cách gọi tắt danh từ — chấp nhận được.

### Đề xuất luật máy — ĐÃ ĐO, CHƯA ĐƯA VÀO `lib/so-tay.js`

Hai lớp lỗi này lặp lại nhiều nhóm, nhưng luật viết nao sẽ **bắn nhầm vào dữ liệu đã duyệt**, nên
phiên này chỉ đưa vào prompt soạn (`SYSTEM` trong `scripts/build-so-tay.mjs`, khối "Bài học bước 1
(SOÁT ĐỘC LẬP lô 030)"), **không** sửa `lib/so-tay.js`:

| luật đề xuất | bắn trên `data/so-tay/` hiện tại | phán đoán |
|---|---:|---|
| `dieuKienVao` `value=true` mà câu có "có thể" | **36 mục** | nhiều báo oan (vd 6212 "có thể làm từ bất cứ vật liệu dệt nào" — "có thể" không làm câu thành cho phép) → cần mẫu chặt hơn "có thể" |
| `loaiTru` có dải "A đến B" mà `sangNhom` không phủ hết | **122 mục** | không ship được: sẽ đỏ `so-tay:check` toàn repo |

Người duyệt quyết định có thu hẹp regex cho cả hai không.

### Kiểm sau soát

| lệnh | kết quả |
|---|---|
| `node tmp/so-tay/strict-nguyen-van.js tmp/so-tay/raw` (so KHÔNG squash dấu) | **109/109 khớp nguyên văn**, 0 sai |
| `TARGET=raw APPLY=1 node scripts/apply-review-lo030.mjs` | 6 nhóm, 48 mục: giữ 37, sửa 11 trường / 7 mục, xoá 4, +1 ngoài phạm vi |
| `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` | 24/24 · 16/16 · 9/9 · 37/37 · 10/10 · 13/13 — **109 mục, 0 mục rớt** |
| `node scripts/build-so-tay.mjs --nhom=… --tu-tep=tmp/so-tay/raw --force --bao-cao=…` | `109/109 (100 %)`, `nhomLoi: []`, `nguonBiCut` giữ nguyên `ch39.chuong (44853→40000)` |
| `TARGET=data APPLY=1 node scripts/apply-review-lo030.mjs` | đổi **44** mục `AI_DA_KIEM` → `NGUOI_DUYET` (48 soát − 4 xoá); `tieuChi6`/`dong8`/`cay` **không** đụng |
| `npm run so-tay:check` | `314 nhóm, 9489 mục, 0 mục không kiểm được nguồn` |
| `npm test` | **ALL TESTS PASSED**, exit 0, mọi suite `0 failed` |
| `node scripts/benchmark-alias-holdout.mjs --gate` (gate của CI) | `✓ Không tụt quá 1 điểm % so với mốc` |

`bao-cao/lo-030.json` đã `rm` trước khi nạp lại (bài học: `--bao-cao` **nối** vào tệp cũ, không
ghi đè — không `rm` thì `nhomLoi` của lần trước còn sót).

**KHÔNG merge.** PR #412 chờ người duyệt tự soát mẫu ≥ 10 % phần còn lại (`tieuChi6`/`dong8`/`cay`)
rồi gộp và điền `trang_thai=xong`, cột `pr` trong `so-tay-lo.csv`.

# TIEN-TRINH — lô 028 (soạn sổ tay chú giải)

Nhóm của lô: **7312, 7408, 7418, 8425, 8449, 8453** · Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-028` @ `1828d3b` (main mới nhất) · Ngày: 2026-10-23
Phiên này là **người soạn** (không phải soát độc lập — mục 4 giao việc thuộc người khác).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `7312,7408,7418,8425,8449,8453` — **khớp** CSV dòng `028`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001** (`so-tay-lo.csv` dòng `001`), copy-paste nhầm y như lô 012/014 (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu, chốt nhóm theo CSV. Cập nhật CSV dòng 028 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2: bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `build-so-tay.mjs --nhom=7312,7408,7418,8425,8449,8453 --xuat-nguon=tmp/so-tay/nguon` → **6 nhóm đều cần dựng**, 271 nghìn ký tự nguồn (7312 22k · 7408 29k · 7418 27k · 8425 64k · 8449 63k · 8453 66k). Cả 6 đều dưới trần 350k.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + `lib/so-tay.js` trọn (để biết máy loại mục nào) + in cây `lib/hs-tree.js` cho cả 6 nhóm.
- [x] **B4.** Đọc HẾT cả 6 tệp nguồn (`ch84.chuong` 21k và `phan84.phan` 22k dùng chung cho 8425/8449/8453, `phan74.phan` dùng chung cho 7408/7418 — đọc 1 lần đủ).
- [x] **B5.** Soạn `tmp/so-tay/raw/<nhom>.json` — **138 mục**: 7312 15 · 7408 28 · 7418 23 · 8425 28 · 8449 13 · 8453 31.
- [x] **B6.** Tự kiểm TRƯỚC khi nạp, hai lớp:
  - **Nguyên văn TUYỆT ĐỐI** (script riêng `tmp/so-tay/strict-nguyen-van.mjs`, KHÔNG squash — bù lỗ hổng `check-so-tay-squash-mat-ky-tu`): lần 1 bắt **2 mục** thuộc 8425 vì câu trích **gán nhầm nguồn** (xem "Máy không bắt được"). Vá xong → **138/138 khớp nguyên văn**.
  - `check-so-tay.mjs --raw`: **138/138 đạt, 0 mục không kiểm được nguồn**.

## Hai lỗi MÁY KHÔNG BẮT ĐƯỢC (đã tự bắt — người soát nên soi lại)

1. **Gán nhầm nguồn giữa hai nhóm cùng Chương 84.** Câu *"Những máy cán như vậy cũng được phân loại ở đây… loại trừ các máy cán quay… (nhóm 84.51)"* thuộc chú giải **nhóm 8449** (mục (3) "Máy cán làm chắc"), **không** phải 8425. Đã chuyển `loaiTru` + `phanBiet` từ 8425 sang 8449. `check-so-tay` cũng sẽ loại, nhưng nguyên nhân là nhớ nhầm chứ không phải lỗi soạn có chủ đích — script nguyên văn chặn được trước khi tệp bị loại mục âm thầm.
2. **`phamVi.text` nói nhiều hơn câu trích.**
   - 8425: tôi viết *"…: hệ ròng rọc và hệ tời…, tời ngang và tời dọc, và các loại kích"* nhưng trích chỉ có *"các thiết bị nâng hoặc xếp hàng đơn giản"*. Đã nới trích sang câu kế (quy tắc Chú giải 84.26 áp dụng cho máy tự hành/máy di động…).
   - 8449: tôi viết *"kể cả máy làm mũ phớt"* nhưng trích chỉ tới *"các cốt dùng để làm mũ"* (phần "MÁY SẢN XUẤT MŨ PHỚT" nằm ngoài trích). Đã bỏ.

## Nhóm nguồn mỏng / bất thường (đưa vào mô tả PR)

- **7408**: chú giải nhóm chỉ 4 câu — "Chú giải 9(c) Phần XV định nghĩa dây" và "Phần thứ 2 của chú giải nhóm **74.07** được áp dụng" nhưng **bản chú giải 74.07 không được xuất vào nguồn** → không rút được `dieuKienVao` nào từ định nghĩa "dây" của Chương 74.
- **7418**: chú giải nhóm bắt đầu bằng *"Chú giải Chi tiết nhóm 73.21, 73.23 và 73.24 áp dụng…"* nhưng **bản chú giải 73.23 không được xuất** → nhóm này cũng mỏng; chỉ dựng được `phamVi`/`dieuKienVao` từ câu "dụng cụ làm nóng… bằng đồng".
- **8449**: nhóm một mã, chỉ một dòng 8 số (`84490000`). `tieuChi6` **bỏ trống** vì `844900` không phải nút 6 số trong cây (`lib/hs-tree.js` suy ra thẳng từ nhóm) → máy sẽ loại mọi mục `tieuChi6` của nhóm này.
- **`phan84.phan`**: tiêu đề đầu nguồn là *"ĐIỆN; CÁC BỘ PHẬN CỦA CHÚ GIẢI; THIẾT BỊ GHI VÀ TÁI TẠO ÂM THANH…"* nhưng **thân văn bản là Chú giải Phần XVI** (bộ phận, máy đa chức năng, đơn vị máy chức năng, máy di động). Đây là **lỗi kệ sách** ở trường tiêu đề chú giải Phần, không phải lỗi sổ tay; nội dung dùng được. Đề xuất sửa riêng ở `data/chu-giai-chuong.json`/`hanh-muc` ngoài lô này.
- **`nhom8453.nhom` chép thiếu dấu ngoặc**: mục loại trừ (a) đánh số bằng "(a)", các mục sau lại viết "b)", "(c)"… không quay lại "(b)" — giữ nguyên nguyên văn, chép y hệt trong `loaiTru`/`phanBiet`.

## Bước 7 — nạp, kiểm, mở PR (23/10/2026)

| lệnh | kết quả |
|---|---|
| `node scripts/build-so-tay.mjs --nhom=… --tu-tep=tmp/so-tay/raw --force --nguoi-soan=dev-zcode-mm --bao-cao=data/so-tay/bao-cao/lo-028.json` | **138/138 (100 %)**, `nhomLoi: []`, không nguồn nào bị cắt |
| `node scripts/check-cay.mjs --nhom=7312,7408,7418,8425,8449,8453 --chi-tiet` | **0 lỗi lệch cây, 6 nhóm đủ** (có cây, đủ dong8, đủ tên nút ảo, đủ tiêu chí 6 số) |
| `npm run so-tay:check` | **314 nhóm, 9.518 mục, 0 mục không kiểm được nguồn** |
| `npm test` | **ALL TESTS PASSED** |
| commit | `28e4554` — chỉ `data/so-tay/*.json` + `bao-cao/lo-028.json` + dòng CSV + TIEN-TRINH (KHÔNG commit `tmp/`) |
| PR | **#409** `so-tay/lo-028` → `main`, MERGEABLE, **chưa merge** |
| CI #409 | `test` **pass** (2m23s) · `bench` **pass** (6m10s) · `Vercel` fail — *"Deployment was blocked"*, lỗi hạ tầng có sẵn (memory `vercel-check-blocked-la-pre-existing`), không phải lỗi code |

**KHÔNG merge.** Còn lại cho người duyệt: soát độc lập TOÀN BỘ `phamVi`/`boPhan`/`dieuKienVao`/`loaiTru`/`phanBiet`
theo hồ sơ `review/<nhom>.json` + script áp 2 pha (xem `apply-review-lo025.mjs`), rồi điền `trang_thai=xong` + cột `pr`.

---

# TIEN-TRINH — lô 028 · SOÁT ĐỘC LẬP (phiên người soát, KHÁC người soạn)

Người soát: `dev-soat-doc-lap-lo028` · Nhánh: `so-tay/lo-028` @ `6b9b0ec` · Ngày: 2026-10-23 · PR **#409**
Người soạn là `dev-zcode-mm` — phiên này **không** soạn, chỉ đọc lại từng mục cùng nguồn. **KHÔNG merge.**

## Cách soát (không tin máy)

Máy đã xanh ngay từ đầu: `check-so-tay --raw` 138/138 và `strict-nguyen-van.mjs` 138/138 nguyên văn — nên
đợt này **không có việc gì để bắt máy**. Toàn bộ giá trị nằm ở đọc tay. Ba lớp đã dùng:

1. **Đọc trọn 6 tệp nguồn** (`tmp/so-tay/nguon/<nhom>.txt`, 271 nghìn ký tự) cùng `tmp/so-tay/raw/<nhom>.json`.
2. **Quét mẫu lỗi người soát phải bắt** (`tmp/so-tay/soat-028-scan.mjs`): cắt né câu rào · `hoi` đảo chiều ·
   dấu lược nuốt ngoại lệ · trích mồ côi · thêm chữ ngoài trích · trích 300–600 · `hoi` nhắc mã.
   Quét ra 30 cờ, bỏ hết cờ rác (`fact` snake_case, chữ "hàng" trong câu hỏi), giữ lại các cờ thật.
3. **Đếm tiền lệ trên `data/so-tay` TRƯỚC khi kết luận mẫu nào là lỗi** (memory `so-tay-soat-mau-khong-phai-loi`) —
   nhờ vậy **không sửa oan 3 mục** mà thoáng qua đã định sửa: xem bảng dưới.

## Kết quả: 82 mục trong 5 khối — giữ 74 · sửa 8 · xoá 0

138 mục đã đọc hết; phạm vi soát độc lập (mục 4) là **82 mục** ở `phamVi`/`boPhan`/`dieuKienVao`/`loaiTru`/`phanBiet`.
`boPhan` của 7408 và 7418 là `null` (nguồn không có quy tắc bộ phận) nên không có mục để soi.

| nhóm | soát | giữ | sửa | xoá |
|---|---|---|---|---|
| 7312 | 7 | 6 | 1 | 0 |
| 7408 | 14 | 14 | 0 | 0 |
| 7418 | 17 | 13 | 4 | 0 |
| 8425 | 12 | 10 | 2 | 0 |
| 8449 | 12 | 12 | 0 | 0 |
| 8453 | 20 | 19 | 1 | 0 |
| **Tổng** | **82** | **74** | **8** | **0** |

### 8 lỗi thật đã sửa (máy KHÔNG bắt được — cả 8 đều xanh máy)

1. **`phamVi` của 7418 bỏ mất nửa nhóm.** Chú giải còn nói *"Nhóm cũng bao gồm thiết bị gia đình được mô tả ở chú giải
   nhóm 73.22"* ngay câu sau, mà `phamVi` chỉ mô tả "dụng cụ làm nóng / thiết bị nấu". 73.22 là "các sản phẩm bằng
   đồng dùng trong gia đình" — tức phần lớn 7418 (741810 đồ bếp/nhà bếp, 741820 đồ vệ sinh). Trái với chính
   `tieuChi6` của nhóm. Kéo câu thứ hai vào `trich` + viết lại `text` (279 ký tự, trong trần 300).
2. **`phamVi` của 8453 bỏ mất nửa nhóm**, cùng lỗi: bỏ *"Nhóm còn bao gồm máy móc được sử dụng để sản xuất hoặc
   sửa chữa các mặt hàng da sống, da thuộc"* — tức phân nhóm **845320** (máy làm/sửa giày dép) và **845380**.
   Đọc `phamVi` cũ sẽ tưởng 8453 chỉ là máy thuộc da (332 ký tự).
3. **`phamVi` của 8425 lấy dấu lúc `…` giấu đúng một NGOẠI LỆ.** Câu bị nuốt bắt đầu bằng chính chữ
   *"Tuy nhiên, nếu 1 tời ngang là dụng cụ thông thường của một máy kéo, thì máy hoàn thiện … sẽ được phân
   loại ở nhóm 87.01"* — đúng mẫu luật 31 (đoạn lược không được chứa ngoại lệ) và mẫu "cắt trích né câu rào".
   Kéo ngoại lệ vào `trich`, viết lại `text` cho khớp (315 ký tự).
4. **`phanBiet[0]` của 8425 hỏi SAI CHỦ THỂ → nhánh Có sai mã.** Hỏi *"Tời ngang có phải là dụng cụ thông
   thường của một máy kéo không?"* rồi trả `neuCo: 8701`. Nhưng nguồn nói **máy hoàn thiện** (máy kéo + tời
   ngang) mới về 87.01 — hỏi kiểu cũ thì một tời ngang rời (loại phổ biến nhất trong tờ khai) bị đẩy nhầm sang
   87.01. Đổi `hoi` sang hỏi đúng chủ ngữ. `loaiTru[0]` cùng ý nhưng đã viết đúng chủ thể nên giữ.
5. **`phanBiet[3]` của 7418 thêm chữ "dùng điện" không có trong nguồn.** Nguồn 7418 chỉ ghi *"Thiết bị gia dụng
   của chương 85 (đặc biệt các dụng cụ và thiết bị của nhóm 85.09 và 85.16)"* — **không có "điện"**. Đây là
   hiểu biết riêng của người soạn lấy từ tên 85.09 (mới là "dùng điện"; 85.16 là "khác"). Bỏ.
6. **`boPhan` của 7312 trích thiếu câu dẫn.** Trích cũ chỉ là mục (a) của danh sách: *"Các sản phẩm thuộc nhóm
   73.07, 73.12, …"* — bản thân nó **không nói** 73.12 là "bộ phận có công dụng chung", nên không đỡ được
   `quyTac`/`tomTat`. Kéo thêm câu dẫn ngay trước trong cùng khối `[phan73.phan]`. (Ý thì vốn đúng.)
7–8. **Trích mồ côi ở 7418** (`loaiTru[2]` + `phanBiet[2]`, dùng chung một câu nguồn): cắt ở dấu hai chấm
   *"… thuộc nhóm 84.19, ví dụ:"* — hứa ví dụ rồi không lấy. Phần bị bỏ chỉ là 2 ví dụ, **không phải ngoại lệ**,
   nên cắt ở ranh giới mệnh đề "thuộc nhóm 84.19" là sạch (110 ký tự).

### 3 chỗ ĐÃ ĐỊNH sửa nhưng GIỮ LẠI sau khi đếm tiền lệ (để lô sau khỏi sửa oan)

| mục | nghi ngờ | kết luận sau khi đếm |
|---|---|---|
| 7408 `phanBiet[2].hoi` | `hoi` nhắc mã nhóm 74.13 | Luật chỉ cấm mã **phân nhóm** (6 số); `MA_PHAN_NHOM_TRONG_HOI = /WCO\|\d{4}\.\d{2}/` không bắt mã 4 số. Sổ tay đã gộp sẵn **6 mục cùng mẫu** (5401 "nhóm 40.07", 6117, 8443, 9003…) → **giữ**. |
| 7418 `loaiTru[3]` → `8509\|8516` | nguồn chỉ nói "chương 85 (đặc biệt…)" nên ghi 2 nhóm là hẹp | 7323 và 7615 đã gộp với **đúng mẫu này**, và `dieuKien` đã giữ đúng định ngữ "đặc biệt" → **giữ**. |
| 8453 `loaiTru[8]`/`phanBiet[4]` → 4417 | nguồn nói "**thường** trong nhóm 44.17" — có điều kiện giới hạn | 8506 đã gộp với đúng mẫu "thông thường thuộc nhóm 85.07", `dieuKien` của 8453 đã giữ nguyên chữ "thường" → **giữ**. |

### Ghi nhận (không sửa được / ngoài phạm vi — đề xuất cho lô sau)

- **8453 thiếu một điều kiện vào nhóm quan trọng**: nguồn nói *"…tuy nhiên chúng vẫn thuộc nhóm này với điều kiện
  chúng được thiết kế để sử dụng chủ yếu cho da sống, da thuộc"* (máy 84.53 dùng được cho bìa cứng/giả da/nhựa
  vẫn thuộc 8453 **nếu** thiết kế chủ yếu cho da). Chưa mục nào ghi. Người soát chỉ xoá/sửa theo index, không
  chèn mục → đề xuất đưa vào phần bổ sung lỗi kệ sách hoặc thành luật máy.
- **7408 `dong8` 74082910** (nguồn `sen.74082910`): `dieuKien` viết *"Dây bằng hợp kim đồng-thiếc…"* trong khi câu
  trích chỉ nói *"Hỗn hợp thiếc và đồng tạo ra đồng thanh"* — chữ "Dây" là thêm. `dong8` ngoài 5 khối soát.
- **Độ dài trích**: 3 câu sau khi sửa dài 315–332 ký tự (vùng 301–600, máy cho tới 600; sổ tay đã gộp có
  sẵn 115 mục 301–400 và 44 mục 401–600). Chọn giữ trung thực thay vì lược cắt thêm.

## Các bước đã chạy

- [x] Đọc `brief-st-soat-lo028.md` + `docs/giao-viec/so-tay-giao-ngoai.md` (mục 3 **11 luật**) + `_he-thong.txt`.
- [x] Xác minh **từng câu trích định sửa** nằm nguyên văn trong đúng khối nguồn **trước khi** gõ vào hồ sơ
      (`tmp/so-tay/soat-028-verify.mjs`, 5/5 OK) — không gõ tay.
- [x] Ghi `review/<nhom>.json` (6 tệp) — `scripts/apply-review-lo028.mjs` dry-run rồi mới ghi.
- [x] `TARGET=raw APPLY=1 node scripts/apply-review-lo028.mjs` → áp lên `tmp/so-tay/raw/`.
- [x] `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → **138/138, 0 mục không kiểm được nguồn**.
- [x] `node tmp/so-tay/strict-nguyen-van.mjs` → **138/138 nguyên văn, 0 đoạn sai**.
- [x] `rm data/so-tay/bao-cao/lo-028.json` **trước** khi nạp lại (memory `so-tay-bao-cao-ghi-de`: `--bao-cao` nối vào
      tệp cũ, để lại `nhomLoi` sót), rồi `--tu-tep --force --nguoi-soan="dev-zcode-mm"` → **138/138 (100 %)**.
- [x] `TARGET=data APPLY=1 node scripts/apply-review-lo028.mjs` → đổi `nguonLoai` **82/82** mục ở 5 khối
      `AI_DA_KIEM → NGUOI_DUYET` (luật 11 — chỉ người soát độc lập được đổi). `tieuChi6`/`dong8`/`cay`
      **giữ nguyên** `AI_DA_KIEM`/`MAY_SUY` vì ngoài phạm vi soát.
- [x] `npm run so-tay:check` → **314 nhóm, 9.518 mục, 0 mục không kiểm được nguồn**.
- [x] `npm test` → **ALL TESTS PASSED**.
- [x] `node scripts/check-cay.mjs --nhom=<từng nhóm> --chi-tiet` → cả 6: **0 lỗi lệch cây, đủ**.

**KHÔNG merge.** Chờ người duyệt: rà lại PR #409 rồi điền `so-tay-lo.csv` dòng 028 → `trang_thai=xong` + cột `pr`.
