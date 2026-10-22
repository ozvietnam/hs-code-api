# TIEN-TRINH — lô 016 (soạn + soát độc lập sổ tay chú giải)

Nhóm của lô: **5808, 6214, 6216, 6809, 6909, 7314**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-016` @ `400298a` (main mới nhất) · Ngày: 2026-10-22
Pha 1 (dưới đây) là **người soạn**. Pha 2 (cuối tệp) là **người soát độc lập** — mục 4 giao việc,
bắt buộc trước khi gộp.

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `5808,6214,6216,6809,6909,7314` — **khớp** CSV dòng `016`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu, chốt
nhóm theo CSV. Cập nhật CSV dòng 016 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `build-so-tay.mjs --nhom=5808,6214,6216,6809,6909,7314 --xuat-nguon=tmp/so-tay/nguon`
  → **cả 6 nhóm đều phải dựng** (không có nhóm nào có sẵn từ lô trước). 200.722 ký tự nguồn.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn**. Đọc `lib/so-tay.js`
  trước khi soạn để biết luật máy nào lọc mục nào. In cây `lib/hs-tree.js` cho cả 6 nhóm.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 6 nhóm — 118 mục.
- [x] **B5.** `check-so-tay.mjs --raw` chạy **6 lần** (xem dưới). Thêm **kiểm tra nguyên văn TUYỆT ĐỐI**
  (`tmp/so-tay/kiem-nguyen-van.mjs`, không bỏ dấu câu, giữ hoa/thường và ngoặc kép) — **0 sai / 118 mục**
  sau 2 lần sửa. Tự soát bằng mắt theo 14 kiểu lỗi mục 0 — sửa 3 mục thêm (xem dưới).
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-016.json`
  → **118/118 (100 %)**, 0 nhóm lỗi.
- [x] **B7.** `check-cay.mjs --chi-tiet` → **0 lỗi lệch cây**, 5/6 nhóm "đủ" (6809 còn 1 cảnh báo xem dưới).
  `npm run so-tay:check` → **233 nhóm / 7615 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push nhánh `so-tay/lo-016` + mở PR (**KHÔNG merge**).

## Kết quả

| nhóm | mục | đạt | ghi chú |
|---|---|---|---|
| 5808 | 23 | 23 | 2 điều kiện vào · 12 loại trừ · 2 câu hỏi phân biệt · 2 tiêu chí 6 số · 4 dòng 8 số |
| 6214 | 23 | 23 | 1 điều kiện vào (60 cm) · 5 loại trừ · 2 câu hỏi phân biệt · 5 tiêu chí 6 số · 9 dòng 8 số |
| 6216 | 10 | 10 | 1 điều kiện vào · 2 loại trừ · 2 câu hỏi phân biệt · 4 dòng 8 số — **nguồn mỏng nhất lô** |
| 6809 | 15 | 15 | 1 điều kiện vào · 5 loại trừ · 1 câu hỏi phân biệt · 2 tiêu chí 6 số · 5 dòng 8 số |
| 6909 | 18 | 18 | 1 điều kiện vào · 6 loại trừ · 2 câu hỏi phân biệt · 4 tiêu chí 6 số · 4 dòng 8 số |
| 7314 | 29 | 29 | 2 điều kiện vào · 2 loại trừ · 2 câu hỏi phân biệt · 11 tiêu chí 6 số · 11 dòng 8 số |
| **Tổng** | **118** | **118 (100 %)** | 8 điều kiện vào · 32 loại trừ · 11 câu hỏi phân biệt · 24 tiêu chí 6 số · 37 dòng 8 số · 0 `boPhan` |

## Máy loại

Lần 1–6 của `check-so-tay --raw` chỉ bắt **3 lỗi hình thức** (xem dưới); **không mục nào bị máy loại
vì sai nghĩa**. Các sửa đổi:

| # | Lỗi | Xử lý |
|---|---|---|
| 1 | `fact` chứa chữ hoa (`…thang_Mohs`) — `lib/so-tay.js` đòi slug `[a-z0-9_]` | hạ chữ thường (`mohs`) |
| 2 | `trich` 7314 viết `trong chương này…` (chữ t thường) trong khi nguồn là `Trong chương này…` | sửa hoa/thường — máy **không** bắt (memory `check-so-tay-squash-mat-ky-tu`) |
| 3 | `trich` 6216 có khoảng trắng quanh dấu lược `…` làm đoạn lệch nguyên văn | bỏ khoảng trắng thừa |

## Tự soát mắt — 3 mục sửa thêm (máy không bắt được)

1. **6909 `loaiTru` 8546|8547**: `trich` bắt đầu giữa câu (`cũng như các bộ phận…`) nên mất chủ ngữ →
   trích trọn câu `(f) Các thiết bị điện … thuộc các nhóm 85.46 hoặc 85.47.` Dải "85.33 đến 85.38"
   vẫn nằm trong trích nhưng **không** ghi `loaiTru` (luật 3: dải không phải đích danh).
2. **7314 `dong8` 73141910**: `dieuKien` có "đai liền dùng cho máy móc" nhưng `trich` WCO không nói →
   chuyển sang `nguon: tax.73141910` (dòng biểu thuế nói đủ cả hai vế). `dong8` 73141990 bỏ vế
   "trừ loại đai liền dùng cho máy móc" vì câu trích WCO không có.
3. **6909 `phamVi`**: bỏ dấu lược `…` vì hai câu nằm liền nhau (lược là vô nghĩa và che mất câu).

## Nguồn mỏng / bất thường (báo lại người duyệt)

- **6216 — nguồn mỏng nhất lô.** Chú giải nhóm chỉ có 5 câu: "mọi loại chất liệu dệt (kể cả hàng ren)
  trừ dệt kim hoặc móc", tham chiếu chéo `Chú giải chi tiết nhóm 61.16` (**không nằm trong bộ nguồn
  của lô nên không trích được**), và "găng tay bảo vệ trong công nghiệp". Không có `sen.*`, không có
  `tieuChi6` (cây 6216 không có nút 6 số nào), không có `boPhan` → chỉ ghi được 10 mục.
  → **Gợi ý cho người duyệt**: mở rộng `sourcesFor` để kéo chú giải 61.16 cho 6216 sẽ làm nhóm này đầy hơn.
- **6214 — dòng 8 số batik không có nguồn SEN.** 4 dòng `…10` ghi "Được in bằng phương pháp batik
  truyền thống (SEN)" nhưng `data/sen-2022.json` **không có mục nào cho 6214** (đã kiểm: 6 mục SEN
  của Chương 62 đều không chạm 6214). Vì vậy 4 dòng batik trích `tax.<8 số>`, còn 5 dòng "Loại khác"
  trích `wco.<6 số>` — vật liệu của dòng batik **không** ghi vào `dieuKien` (trích không nói), để
  `tieuChi6` cấp 6 số bù lại. Cần người duyệt xác nhận cách chia này.
- **6214 — kệ sách tự mâu thuẫn về ngưỡng 60 cm.** Chú giải chương 62 mục 8: "không có cạnh nào **trên**
  60 cm → 62.13; khăn tay có cạnh **trên** 60 cm → 62.14". Chú giải nhóm 6214 mục (d): "khăn quàng cổ
  vuông **không có cạnh quá** 60 cm → 62.13" (tức ≤ 60 cm, lệch 1 cm ở ranh giới). Sổ tay ghi cả hai
  câu **nguyên văn** và không tự hoà giải; người khai cần cân nhắc.
- **6909 — thang Mohs có thang mở rộng.** Chú giải phân nhóm 6909.12 ghi thang Mohs mở rộng (bột tan = 1,
  kim cương = 15; nhôm nóng chảy = 12, cacbua silic = 13), trong khi tiêu chí WCO của 6909.12 là
  "≥ 9 trên thang Mohs". `tieuChi6` ghi `≥ 9` theo đúng câu WCO; **không** thêm ghi chú thang mở rộng
  (khác nguồn, ghép câu xa nhau).
- **5808 mục (g)** — câu nguồn kết bằng "(nhóm 83.08 hoặc 96.06 **tùy từng trường hợp**)". Luật máy
  `loai-tru-chi-la-thuong` loại mục đó, nên chỉ ghi nhánh **khóa kéo → 96.07** (câu trích tự nói đủ);
  nhánh móc/mắt cài/bấm nén **bị bỏ** có chủ đích.
- **6809 — 1 cảnh báo `check-cay`**: `phan-nhom-chua-co-tieu-chi:680990`. Tên WCO của 680990 là
  "n.e.c. in heading no. 6809" — **không có tiêu chí phân biệt** để ghi; đây là phân nhóm gom, không
  sửa được mà không bịa. Không phải lỗi (`loi=0`).
- **Không nhóm nào có `sen.*`** trong lô này → `phienBan` của cả 6 nhóm là `HS2022`.

## Mục `dieuKien` ghi thêm chữ ngoài câu trích

**Không có mục nào** — mọi `dieuKien`/`text` chỉ diễn đạt đúng điều câu trích nói. Ba chỗ dễ
nghi đã rà lại và sửa hoặc bỏ:
- 7314 `dong8` 73141910/73141990 (xem mục 2 ở trên),
- 6216 `dong8` 62160099: `dieuKien` chép lại đúng câu định nghĩa nhóm, không thêm "khác",
- 6214 4 dòng batik: `dieuKien` chỉ ghi "Được in bằng phương pháp batik truyền thống (SEN)",
  **không** ghi vật liệu vì câu trích biểu thuế không nói.

## Ghi chú khác

- `cay.tenDien` để TRỐNG cả 6 nhóm: mọi nút ảo đã có tên từ biểu thuế (kể cả tiêu đề quốc gia
  `6216009` = "Loại khác"), và hai phân nhóm 6 số thiếu tên tiếng Việt (`680919`, `731419`) chỉ có
  tên **tiếng Anh** trong nguồn WCO — dịch sang tiếng Việt là "thêm hiểu biết riêng" (luật 7), nên bỏ.
- `trich` dài nhất lô: **335 ký tự** (`phamVi` 6909, hai câu nguyên văn liền nhau). Vượt mốc mềm 300
  của lược đồ nhưng dưới trần 600 của máy; cắt bớt sẽ mất chính câu loại trừ "sản phẩm chịu lửa
  được thiết kế chịu nhiệt độ cao" — cắt trích để né câu rào đúng kiểu lỗi mà người duyệt phải bắt.
---

# Pha 2 — SOÁT ĐỘC LẬP (người soát ≠ người soạn)

- [x] **S1.** Đọc lại `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0: 14 kiểu lỗi, 5 kiểu lỗi mới
  bổ sung sau vòng 2; mục 3: 11 luật; mục 4: soát bắt buộc TOÀN BỘ) + brief
  `brief-st-soat-lo016.md`. Nhóm lấy theo CSV dòng `016` (`5808 6214 6216 6809 6909 7314`) —
  khớp brief.
- [x] **S2.** Đọc `lib/so-tay.js` (`quoteInSource`, `HEDGE_LOAI_TRU`, `CAU_CHO_PHEP`,
  `dieu-kien-cap-phan-nhom`, `soCoTrongTrich`) để biết máy bắt được gì và KHÔNG bắt gì.
- [x] **S3.** Đọc **HẾT 6 tệp nguồn** (200.722 ký tự) rồi đọc **6 bản nháp**, soát **từng mục**
  một với nguồn — 118/118 mục, không lấy mẫu.
- [x] **S4.** Chạy bộ kiểm **thứ hai** (byte-exact, không squash) `scripts/check-trich-nguyen-van.mjs`
  → **116/116 câu trích nguyên văn tuyệt đối** sau khi sửa.

  **Đo lại chính xác cái `check-so-tay` bắt được gì** (thử cố tình bẻ 3 kiểu lỗi rồi chạy lại):
  `check-so-tay` so qua `squash()` = `normalize('NFC').toLowerCase()` rồi **xoá mọi ký tự không phải
  chữ/số**. Hệ quả:
  - **KHÔNG bắt**: hoa/thường ở chữ ASCII hay chữ có dấu đơn (`Trong`/`trong`,
    `Sản phẩm`/`sản phẩm`), ngoặc kép thẳng ↔ cong (`"` vs `“…”`), dấu câu (`58.09` vs `58,09`),
    số gạch đầu dòng, dòng trống. Đây đúng là các lỗi lô 010–014 đã dính
    (memory `check-so-tay-squash-mat-ky-tu`).
  - **Vô tình BẮT**: chữ Việt có dấu chồng mà JS **không** hạ chữ thường được (`Ẻ`, `ễ`, `ữ`, `ậ`,
    `ọ`, `Đ`…) — lỗi hoa/thường ở đúng những chữ đó vẫn bị loại. Hành vi không ổn định, **không nên
    dựa vào**; máy mới so thẳng với khối nguồn nên không còn phụ thuộc.
- [x] **S5.** Đếm **tiền lệ** trên 233 nhóm đã gộp trước khi kết luận mẫu nào là lỗi: `phanBiet`
  có `neuKhong` = chính nhóm là **343/506** (chấp nhận, không sửa); `fact` tên bắt đầu `khong_`
  đặt `value=true` có **10** tiền lệ (chấp nhận); `dieuKienVao` có câu rào "thường/nói chung"
  có **24** tiền lệ ở 228 nhóm khác (chấp nhận, xem S8).
- [x] **S6.** Ghi `review/<nhom>.json` (116 mục đã soát: 12 sửa, 2 xoá, 102 giữ) — mỗi mục kèm
  `lyDo`. Áp 2 pha: `TARGET=raw APPLY=1` → `check-so-tay --raw` sạch → `build-so-tay --tu-tep --force`
  → `TARGET=data APPLY=1` **chỉ đổi `nguonLoai`** (memory `so-tay-apply-review-2-phase`: áp lại
  `thayDoi` ở pha 2 sẽ chèn trùng mục).
- [x] **S7.** Nạp lại `--nguoi-soan="dev-zcode-mm" --bao-cao=…lo-016.json` → **116/116 (100 %)**,
  0 nhóm lỗi. **55 mục** trong 5 khối `phamVi`/`dieuKienVao`/`loaiTru`/`phanBiet` đổi
  `AI_DA_KIEM → NGUOI_DUYET` (16+8+6+8+10+7); `tieuChi6`/`dong8`/`cay` giữ nguyên nhãn (đúng cách
  làm của lô 006/007/012).
- [x] **S8.** Gate xanh: `check-so-tay --raw` 116/116 · `check-trich-nguyen-van` 116/116 ·
  `check-cay` **0 lỗi lệch cây** (5/6 nhóm "đủ"; 6809 còn cảnh báo 680990 xem dưới) ·
  `npm run so-tay:check` **233 nhóm / 7613 mục / 0 lỗi** · `npm test` **ALL TESTS PASSED**.
- [x] **S9.** Đếm lại `loaiTru`/`dong8`/`phanBiet` mỗi nhóm → **không mục nào trùng** sau khi áp
  (bẫy lô 007).

## Kết quả soát

| nhóm | soát | sửa | xoá | nguonLoai→NGUOI_DUYET |
|---|---|---|---|---|
| 5808 | 23 | 3 | 1 | 16 |
| 6214 | 23 | 1 | 1 | 8 |
| 6216 | 10 | 1 | 0 | 6 |
| 6809 | 15 | 2 | 0 | 8 |
| 6909 | 18 | 1 | 0 | 10 |
| 7314 | 29 | 4 | 0 | 7 |
| **Tổng** | **118** | **12** | **2** | **55** |

**Số mục còn lại trong sổ tay: 116/116 (100 %).**

## 2 lỗi XOÁ — đều là `dieuKienVao` đặt SAI TẦNG, không phải "mờ má"

1. **5808 `dieuKienVao` "vải dệt thoi khổ hẹp có tua viền"** (`ch58.chuong`). Chú giải chương 58
   mục 5 chỉ nói câu đó như một **chủng kiến riêng cho mục (3) phần (A)**. Đặt làm điều kiện vào
   **cả nhóm 5808** thì mọi hàng tua/ngù/trang trí dạng chiếc — không phải vải dệt thoi — đều bị
   loại oan. Máy có luật `dieu-kien-cap-phan-nhom` nhằm chặn đúng lỗi này, nhưng luật chỉ soi
   nguồn `wco/sen/tax` nên câu lấy từ `ch*.chuong` lọt qua.
2. **6214 `dieuKienVao` "cạnh trên 60 cm"** (`ch62.chuong`). Ngưỡng 60 cm của chú giải chương 62
   mục 8 chỉ nói về **khăn vuông hoặc gần như vuông**; mạng che, khăn choàng vai, khăn choàng
   rộng đội đầu không có "cạnh" để đo. Thêm nữa kệ sách **tự mâu thuẫn tại đúng mốc 60 cm**:
   chương 62 mục 8 "Khăn tay có cạnh trên 60 cm → 62.14" vs chú giải nhóm mục (d) "khăn quàng cổ
   vuông không có cạnh quá 60 cm → 62.13". Hard-code một ngưỡng là nhúng mâu thuẫn kệ sách vào
   sổ tay. **Thông tin không mất**: `phanBiet[0]` đã hỏi đúng câu này và trích trọn mục 8.

## Lỗi lặp lại đáng chú ý — `text`/`trich` LỆCH NHAU (5/6 nhóm)

Cùng một kiểu lỗi, xuất hiện ở **cả 5 nhóm có `phamVi`**: `text` tóm tắt **cả nhóm** nhưng
`trich` chỉ chép **một–hai câu**, nên phần lớn `text` không có câu nào trong trích dìu. Máy không
bắt được vì nó chỉ so câu trích với nguồn, không so `text` với `trích`.

| nhóm | `text` khẳng định | `trich` gốc chỉ có |
|---|---|---|
| 6214 | 5 loại khăn mục (1)–(4) + "không dệt kim hoặc móc" | **một** câu về cạnh-rìa (59 ký tự) — nặng nhất lô |
| 5808 | tiêu đề (A) + (B) + "trang trí nội thất" | một câu về trang trí **quần áo** |
| 7314 | tiêu đề (A), mối hàn, tiêu đề (B) | hai câu về **cách bện/đan** |
| 6809 | thạch cao có xơ sợi, ngâm phèn; pa-nen/tấm/bảng | đoạn 1 (không có đoạn 2) |
| 6909 | nội dung 4 mục liệt kê (1)–(4) | 2 câu: định nghĩa gốm + loại trừ chịu lửa |

Xử lý: nới `trich` đủ dẫu chứng cho `text` (5808/6214/6809/7314), hoặc bỏ phần `text` không có
căn cứ khi nới sẽ vượt xa mốc 300 ký tự của lược đồ (6909 — cùng nội dung đã có ở `tieuChi6`).

## 12 mục SỬA còn lại

- **`trich` mất chủ ngữ** (2): 5808 `dieuKienVao[0]` bắt đầu tại "miễn là…" — không biết "những
  loại này" là gì; 6909 `loaiTru[5]` (đã do người soạn tự sửa). Nới trích ra trọn câu.
- **`dieuKien` có vế không có trong trích** (1): 5808 `loaiTru[10]` nói thêm vế "thắt nút
  (swordknot)" lấy từ câu kế tiếp → nới trích tới đúng mệnh đề đó.
- **`hoi` thêm vế ngoài câu nguồn** (1): 6809 `phanBiet[0]` thêm "và các sản phẩm dạng tấm"
  trong khi nguồn chỉ nói "Các pa-nen, v.v" → bỏ vế thừa.
- **`text` mượn chữ khối nguồn khác** (1): 6216 `phamVi` lấy "găng tay hở ngón và găng bao tay"
  từ `tax.62160010` trong khi `nguon` khai `nhom6216.nhom`; một mục chỉ được trích từ **một** khối.
- **`dieuKien` thêm chữ không có trong trích** (3): 7314 `dong8` 73144100 / 73144200 / 73144900
  thêm "Tấm đan," — tên WCO của ba phân nhóm này là "grill, netting and fencing"; tấm đan
  (woven cloth) là **7314.12/14/19**, không thuộc 7314.41/42/49. Chính bản thảo cũng tự nhất quán ở
  73143100/73143900 (chỉ ghi "Phên, lưới và rào") → đây là **lỗi**, không phải quy ước.
- **`phamVi.text`** (5): xem bảng trên.

## Đã cân và GIỮ (không phải lỗi) — đừng sửa vội ở lô sau

1. **`dieuKienVao` có tiền tố "thường"/"nói chung"**: 6909 "thường được làm từ gốm đã được thủy
   tinh hóa", 7314 "nói chung được sản xuất bằng… dây sắt hoặc thép". Câu rào **hiện nguyên trong
   trích** (không phải trích bị cắt để lách luật), và điều kiện là đặc trưng **định nghĩa** của
   tiêu đề: chú giải chương 69 mục 1 xác nhận Chương 69 chỉ áp dụng cho gốm/sứ đã nung. 228 nhóm
   đã gộp có 24 mục cùng dạng.
2. **5808 `loaiTru[6]` khóa kéo → 9607**: câu gốc kết bằng "(nhóm 83.08 hoặc 96.06 **tùy từng
   trường hợp**)" nên bị lược; nhưng chỉ nhánh **móc/mắt cài/bấm nén** mới rào, nhánh **khóa kéo**
   thì không → cắt trích ở đây **không** làm mục nói chắc hơn nguồn.
3. **`dieuKienVao` ngưỡng 16 mm của 7314**: là định nghĩa chữ "dây" ở **cả** chú giải nhóm lẫn
   chú giải chương 73 mục 2, và tiêu đề 7314 là "Iron or steel **wire**" → điều kiện vào nhóm
   4 số, không phải ngưỡng cấp phân nhóm (memory `so-tay-dieu-kien-sai-cap-phan-nhom`).
4. **6909 `loaiTru[5]` giữ dải "85.33 đến 85.38" trong trích nhưng không ghi `sangNhom`**: đúng
   luật 3 (dải số không phải đích danh).
5. **6214 `dong8` dòng "Loại khác" không thêm "trừ loại batik"**: `sen-2022.json` không có mục
   nào cho 6214 (đã kiểm) và máy không nối được hai khối nguồn cho một mục → để thiếu còn hơn bịa.

## Bài học đề xuất (mục 4: chuyển thành luật máy cho lô sau)

1. **Máy phải bắt lỗi "sai tầng" của `dieuKienVao` lấy từ `ch*.chuong`/`phan*.phan`.** Luật
   `dieu-kien-cap-phan-nhom` hiện chỉ chặn `wco/sen/tax`; hai lỗi xoá của lô này đều lọt qua
   đúng kẽ hở đó. Cần thêm: câu trích dạng **"X được phân loại vào nhóm Y"** (đủ điều kiện riêng)
   không được đặt làm điều kiện vào nhóm 4 số — trừ khi nó là định nghĩa thuật ngữ dùng trong
   *tiêu đề* nhóm (như 7314 "dây" ≤ 16 mm).
2. **Nên có máy kiểm thứ hai so NGUYÊN VĂN.** `check-so-tay` squash() nên lỗi hoa/thường (chữ ASCII
   hoặc chữ có dấu đơn), dấu câu, ngoặc kép và số gạch đầu dòng đều "đạt" (lô 010–014 đều dính).
   Đã thêm `scripts/check-trich-nguyen-van.mjs` trong lô này — dùng được cho các lô sau.
3. **Dạy `dieuKienVao` phải nằm trong tầm 4 số**: ngưỡng/thuộc tính của một **tiểu loại** trong
   danh sách mục (vd mục (3) phần (A) của 5808) không phải điều kiện của cả nhóm.
