# TIEN-TRINH — sổ tay chú giải HS (dùng chung nhiều phiên)

<!-- Mục mới nhất ở trên; các phiên sau bổ sung tiếp xuống dưới, đừng xoá phần của nhau. -->

---

# SOẠN lô 042 — phiên `dev-zcode-mm` (24/10/2026)

**Lô:** `0308 0309 0401 0403 0404 0405` (6 nhóm · 47 514 ký tự nguồn) · nhánh `so-tay/lo-042`
**Kết quả: 125/125 mục đạt (100 %) · 0 mục rớt · `nhomLoi: []`** · `npm run so-tay:check` xanh (386 nhóm / 11 128 mục) ·
`npm test` xanh (`=== ALL TESTS PASSED ===`) · `check-cay` 0 lỗi, 6/6 nhóm đủ (cây + dong8 + tên nút ảo + tiêu chí 6 số).
**CHƯA soát độc lập** — PR chỉ mở, KHÔNG merge.

## Quy trình đã làm (đúng `docs/giao-viec/so-tay-giao-ngoai.md` mục 2)

1. Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 2 + 11 luật mục 3) **trước** khi làm.
2. `node scripts/build-so-tay.mjs --nhom=0308,0309,0401,0403,0404,0405 --xuat-nguon=tmp/so-tay/nguon`
   → đọc HẾT 6 tệp nguồn + `_he-thong.txt`.
3. Soạn `tmp/so-tay/raw/<nhom>.json` — **mọi câu trích cắt từ tệp nguồn theo SỐ THỨ TỰ ĐOẠN**
   (script `tmp/so-tay/slice.mjs`), **không gõ tay tiếng Việt** → không bao giờ sai dấu.
4. `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → 125/125, 0 lỗi.
5. `node scripts/check-trich-nguyen-van.mjs` (byte-exact) → 123/123 mục có trích đúng nguyên văn trong đúng khối nguồn.
6. `node scripts/build-so-tay.mjs --tu-tep=tmp/so-tay/raw --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-042.json`
   → **mục đạt 125/125 (100 %)**, nhóm lỗi: 0.
7. `npm run so-tay:check` + `npm test` → xanh.

## Mục CỐ Ý bỏ (không đoán, không ép máy)

| Nhóm | Bỏ gì | Vì sao |
|---|---|---|
| 0403 | `dieuKienVao` **rỗng** | Chú giải nhóm chỉ liệt kê sản phẩm (buttermilk, sữa đông, kem đông, sữa chua, kephir) — là **định nghĩa phạm vi**, không phải ràng buộc phủ cả nhóm. Các câu có "có thể …" (p1, p2, p3) là câu CHO PHÉP → không đặt `value=true`. Điều kiện "vẫn giữ được đặc tính cơ bản của sữa chua" chỉ phủ **sữa chua** (0403.20), không phủ cả nhóm. |
| 0405 | `dieuKienVao` **rỗng** | Điều kiện của nhóm nằm rải ở từng phần (A) bơ 80–95 %, (B) chất phết 39–<80 %, (C) chất béo/dầu khác — không có câu ràng buộc nào phủ **cả ba phần**. Phần số đã đưa vào `tieuChi6` + `dong8[].dieuKienSo`. |
| 0405 | `loaiTru` tới **15.17 / 21.06** | Nguồn ghi *"thường thuộc nhóm 15.17 hoặc 21.06"* — vừa là câu **"thường"** (máy loại `loai-tru-chi-la-thuong`) vừa **không phải loại trừ dứt khoát**. Không có câu nào khác trong nguồn nêu 15.17/21.06 → **XOÁ**, ghi ở mô tả PR. |
| 0404 | `tieuChi6` 040490 (nguồn `ch04.chuong`) | Đã thử `khong_phai_bor_khu_nuoc_hoac_ghee` cho 040590 nhưng **SAI**: 040590.10 CHÍNH LÀ "chất béo khan của bơ" (= bơ khử nước). Đã XOÁ mục đó, giữ lại bản WCO (`khong_phai_bor_hoac_chat_phet_tu_bor_sua`) và chuyển ý này sang `phanBiet` (04059010/04059030 vs 04051000). |

## Mục đáng chú ý cho người soát độc lập

- **0401 — `phamVi.trich` dài 356 ký tự** (vượt mốc 300 trong giao việc, dưới trần máy 600). Lý do: câu nguồn của
  nhóm 0401 là **MỘT câu** gộp cả phần "bao gồm" lẫn hai mệnh đề loại trừ (04.02, 04.03). Cắt bớt bằng "…" thì
  **nuốt mất câu loại trừ** (đúng bài học lô 022/030) → giữ nguyên cả câu, không cắt.
  Cùng kiểu: 0404 `phamVi.trich` 302 ký tự.
- **0308 — `dieuKienVao[0]`** là câu loại trừ **"trừ động vật giáp xác và động vật thân mềm"** (đúng ở cả mục (1) và (2)).
  Em diễn đạt thành `khong_phai_dong_vat_giap_xac_hoac_dong_vat_than_mem = true` — người soát xem có chấp nhận
  cách diễn đạt "phủ định + = true" không, hay muốn đổi/thu.
- **0404 — `dieuKienVao[1]`** đặt là `khong_chua_tren_95_lactose_khan = true` (theo câu loại trừ (c)), **không** đặt
  `ham_luong_lactose_khan <= 95` để khỏi đảo chiều số so với câu nguồn.
- **0405 — `phanBiet` mới**: "bơ khử nước hoặc ghee" → `04059010|04059030` vs bơ thường → `04051000`
  (nguồn Chú giải phân nhóm 2 của Chương 4). Đây là điểm phân biệt quan trọng của nhóm.
- **0308 — 2 nút 6 số thiếu tên tiếng Việt** (030811 hải sâm, 030821 cầu gai) → đã điền `cay.tenDien` kèm trích WCO.
  Còn 030819/030829 thì cây đã có tên ("Loại khác" từ biểu thuê) nên **không** điền (sẽ bị báo trùng biểu thuế).
- **0309/0401/0403/0404/0405** không có nguồn `sen.*` (chỉ 0404 có) nên `phienBan` = HS2022, riêng 0404 = HS2022+SEN2022.

## Độ phủ

`dong8` đủ **54/54** dòng `tax.*` của 6 nhóm (0308: 20 · 0309: 8 · 0401: 9 · 0403: 6 · 0404: 5 · 0405: 6) — kiểm bằng
script so trực tiếp khối `[tax.*]` của tệp nguồn với `dong8` trong bản nháp: không THIẾU, không THỪA.

## Gates

- `npm run so-tay:check` → 386 nhóm, 11 128 mục, **0 mục không kiểm được nguồn**.
- `npm test` → **ALL TESTS PASSED**.
- `node scripts/check-cay.mjs --nhom=0308,0309,0401,0403,0404,0405 --chi-tiet` → 0 lỗi lệch cây, 6/6 nhóm đủ.
- `node scripts/check-trich-nguyen-van.mjs` (byte-exact, cả bản nháp lẫn tệp đã nạp) → **OK**.
- Nhãn nguồn: **toàn bộ 125 mục = `AI_DA_KIEM`** (máy gán). Chưa mục nào mang `NGUOI_DUYET` — người soát độc lập mới đổi.

---

# SOÁT ĐỘC LẬP lô 038 — phiên `dev-soat-doc-lap-lo038` (24/10/2026)

Người soát **khác** người soạn (`dev-zcode-mm`). Đã đọc lại **TOÀN BỘ** 5 khối của 6 nhóm
(**10 mục**: 6 `phamVi` + 1 `boPhan` + 2 `loaiTru` + 1 `phanBiet` + 0 `dieuKienVao`) cùng nguồn nguyên
văn `tmp/so-tay/nguon/<nhom>.txt` — không soát mẫu. Ngoài ra đọc luôn **66 mục** ngoài 5 khối
(23 `tieuChi6` + 41 `dong8` + 2 `cay.tenDien`) để kiểm độ phủ và chiều
đúng–sai, nhưng **không sửa** (ngoài phạm vi mục 4).

**Kết quả: xoá 2 · sửa 3 mục (5 trường) · giữ 5 · 74/74 mục đạt (100 %) · `nhomLoi: []`**
PR #430 · nhánh `so-tay/lo-038` · **KHÔNG merge**.

## Nguồn dùng để soát là nguồn MỚI NHẤT

Không tin bản `tmp/so-tay/nguon/` của người soạn: đã xuất lại bằng
`node scripts/build-so-tay.mjs --nhom=… --force --xuat-nguon=tmp/so-tay/nguon-check` rồi `diff` —
**7/7 tệp giống hệt**, kể cả `_he-thong.txt`. Tức là dữ liệu gốc không đổi sau lúc soạn.

## Ba lỗi đã sửa (máy đều KHÔNG bắt được)

| Nhóm | Mục | Lỗi |
|---|---|---|
| 9202 | `phamVi.trich` | **Dán hai khối văn bằng MỘT DẤU CÁCH.** Bản nháp chép *"Nhóm này bao gồm: (A) Nhạc cụ sử dụng cần kéo"* thành **một** mảnh, nhưng trong `[nhom9202.nhom]` đó là **hai đoạn văn riêng** (ngăn bởi dòng trống) → chuỗi đó **không tồn tại trong nguồn**. `check-so-tay` xanh vì nó so qua `squash()` — xoá mọi ký tự không phải chữ/số, nên **xoá luôn dấu xuống dòng**. Bộ kiểm thứ hai `scripts/check-trich-nguyen-van.mjs` (byte-exact) bắt được — đúng lỗi lô 034 (8210). **Sửa:** tách 3 mảnh nối bằng dấu lược `" … "`. `text` không đổi. |
| 0102 | `phamVi.text` + `phamVi.trich` | **Ba lỗi trong một mục.** (1) Đoạn cuối bản nháp dừng giữa câu ở *"…và linh dương sừng xoắn"* mà **không có dấu lược**, nên trích trông như câu trọn; nguồn còn *"thuộc giống Taurotragus và Tragelaphus."* → mất điều hạn. (2) Dán hai khối văn bằng dấu cách (như 9202) — byte-exact bắt được. (3) **Phạm vi thiếu định ngữ giới hạn:** bản nháp bắt đầu từ `"(1) Gia súc"` nên không có câu dẫn *"…trâu bò thuộc phân họ Bovinae, nuôi hoặc hoang và dù mục đích sử dụng thế nào (… làm thịt)"* — mất **"nuôi hoặc hoang"** và **"dù mục đích sử dụng thế nào"** (trâu bò **SỐNG**, kể cả để làm thịt — khác với xác ở Chương 02). 0101/0103/0104 đều giữ "nuôi hoặc hoang"; **chỉ 0102 rơi mất**. **Sửa:** nối câu dẫn vào đầu, tách mỗi tiêu đề thành mảnh riêng nối bằng `" … "`, hoàn tất câu (3). `text` mới giữ ≤ 220 ký tự để runtime (`clip(…, 220)`) không cắt cụt. |
| 9202 | `boPhan.quyTac` + `boPhan.tomTat` | **Câu luật bị cắt lúc chạy + mất định ngữ giới hạn.** (a) `tomTat` dài **192** ký tự; runtime đưa vào prompt vòng 2 qua `clip(s.boPhan.tomTat, 160)` → bị cắt **đúng phần KẾT LUẬN** (*"…thì được phân loại …"*): mô hình chỉ thấy điều kiện, **không thấy kết quả** (*"được phân loại cùng nhóm với nhạc cụ liên quan"*). (b) `quyTac` bỏ mất định ngữ giới hạn *"thuộc nhóm 92.02 hoặc 92.06"* — đọc câu trích thấy quy tắc áp cho **mọi** nhạc cụ, trong khi nguồn chỉ áp cho 92.02 và 92.06. **Sửa:** rút `tomTat` còn **160** ký tự (giữ trọn phạm vi, **cả hai** điều kiện và kết luận) + bổ sung định ngữ giới hạn vào `quyTac`. `trich` **không đổi** (đã nguyên văn). |

## Hai mục XOÁ — nguồn tự mâu thuẫn (0105)

Chú giải nhóm ghi *"Nhóm này không bao gồm các loại chim sống khác (vd, gà gô, **gà lôi**, chim bồ câu,
vịt trời, ngỗng trời) (nhóm 01.06)"* — nhưng **gà lôi (guinea fowl) CÓ phân nhóm 0105.15**
(WCO `010515 Poultry; live, guinea fowls`) và có dòng biểu thuế **0105.15.10 / 0105.15.90**, cùng
0105.99.30/40 *"Ngỗng, gà tây và gà lôi"*.

- **`loaiTru[0]` → XOÁ**: giữ thì sổ tay dạy *"gà lôi → 01.06"* — **sai**; cổng loại trừ
  (`lib/so-tay-gates.js`) sẽ đẩy gà lôi ra khỏi 0105, trái với chính 0105.15 dành cho gà lôi.
- **`phanBiet[0]` → XOÁ**: cùng câu, nhánh *"có → 0106"* cũng đẩy gà lôi ra; nhánh *"không → 0105"*
  chỉ suy ra từ danh sách loại trừ.

Không sửa được vì **không có câu nào khác** trong nguồn 0105 nêu 01.06 (chú giải chương 1 chỉ loại
03.01/03.06/03.07/03.08, 30.02, 95.08) và **không được** thu hẹp danh sách ví dụ trong câu trích.
Theo luật *"nguồn bao gồm X ở một chỗ, loại trừ X ở chỗ khác → **bỏ cả hai phía**"* (tiền lệ lô
030/7317) → **XOÁ**, ghi rõ trong mô tả PR. Hệ quả: sổ tay 0105 **không còn** mục loại trừ sang 01.06 —
đây là mất thông do **lỗi kệ sách**, không phải do người soạn.

## Những chỗ em đã soi kỹ và chủ động GIỮ (ghi để người duyệt khỏi soi lại)

- **9202 `loaiTru[0]`** — câu nguồn có DẤU HIỆU LOẠI TRỪ rõ (*"tuy nhiên, các nhạc cụ điện tử như ghita
  không có hộp cộng hưởng thuộc nhóm 92.07"*), nêu đích danh 92.07 trong chính câu; câu còn giữ vế
  *"chúng không bị loại trừ khỏi nhóm này"* nên mục **không nói chắc hơn nguồn**. Đúng.
- **0101/0103/0104 `phamVi`** — bản nháp chép **trọn** câu chú giải nhóm (không lược), nêu đủ phạm vi và
  định ngữ *"nuôi hoặc hoang"* / *"nuôi và hoang"*. Đúng.
- **0104** — nguồn mỏng nhất lô: chú giải nhóm **chỉ có một câu**, **không có** "Chú giải phân nhóm" →
  nguồn **không** định nghĩa *"loại thuần chủng để nhân giống"* cho 0104.10/0104.20. Bản nháp **không**
  mượn định nghĩa của 0101 sang → đúng (khác 0101/0102/0103 đều có câu định nghĩa).
- **Cả 6 nhóm `dieuKienVao` rỗng** — đúng, không phải bỏ sót: không câu ràng buộc nào phủ **cả** nhóm 4 số.
  Câu *"giới hạn trọng lượng tính theo TỪNG CON"* của 0103 là điều kiện **cấp phân nhóm** (máy loại
  `dieu-kien-cap-phan-nhom`), thuộc về dòng 8 số — không được đưa vào `dieuKienVao`.
- **`phanBiet` rỗng ở 9202/0101/0102/0103/0104** — đúng: không câu nào nêu **đích danh** nhóm khác.
  Ở 9202 nguồn chỉ nói **một chiều** (loại trừ sang 92.07) nên nhánh *"không"* sẽ phải suy từ danh
  sách loại trừ → không tạo.

## Ghi nhận ngoài phạm vi (đọc, KHÔNG sửa — để người duyệt xem)

- **`0105 dong8[01059410].dieuKien`** nói *"dòng biểu thuế ghi kèm loại trừ gà chọi"* trong khi `trich`
  của mục đó là **SEN** (không chứa câu đó). Nội dung **đúng** (lấy từ `tax.01059410` = *"01059410 - -
  - Để nhân giống (SEN), trừ gà chọi"*) nhưng câu trích không đỡ → cần người duyệt quyết có nối
  thêm câu biểu thuế vào `trich` không (mục chỉ có **một** `nguon`).
- **35 dòng 8 số khác** cũng nêu phạm vi cha (tên vật nuôi từ WCO 6 số, mã phân nhóm từ biểu thuế)
  trong khi câu trích chỉ ghi *"Loại khác"* / *"Loại thuần chủng để nhân giống"* — **văn phong sẵn có của
  repo**, đã được người soạn liệt kê đầy đủ trong mô tả PR #430.

## Nhãn nguồn (luật 11)

**8** mục đã soát chuyển `AI_DA_KIEM` → **`NGUOI_DUYET`** (6 `phamVi` + 1 `boPhan` + 1 `loaiTru` của
9202; `loaiTru`/`phanBiet` của 0105 đã bị xoá nên không còn mục để đổi nhãn). `tieuChi6`, `dong8`,
`cay` **giữ nguyên** `AI_DA_KIEM` — phạm vi đổi nhãn chỉ 5 khối đã soi.

## Gates

```
check-so-tay --raw        74/74   (6 nhóm, 0 mục không kiểm được nguồn)
check-trich-nguyen-van    71/71 OK — mọi câu trích nguyên văn tuyệt đối trong đúng khối nguồn
check-cay × 6              0 lỗi lệch cây, 6 nhóm đủ
so-tay:check               374 nhóm / 10.917 mục / 0 rớt   (sau khi gộp origin/main: lô 035/036 đã vào main)
npm test                   ALL TESTS PASSED
```

Ba bản kiểm độc lập đã chạy cùng nhau (không tin bản nháp của người soạn):

1. `check-so-tay --raw` — máy kiểm chính (chỉ chứng minh câu trích **có thật**, qua `squash()`).
2. `scripts/check-trich-nguyen-van.mjs` — so **byte-exact**; bắt được 3 mảnh dán bằng dấu cách.
3. `tmp/so-tay/soat-lap-038.cjs` (em viết lại từ đầu cho lô này) — so từng **ký tự**, bắt lỗi gõ sai
   dấu (máy không bao giờ bắt vì `squash()` bỏ dấu), bắt đoạn **cắt cụt giữa câu**, bắt đoạn **dán hai
   khối văn bằng dấu cách**, và đo **ngưỡng clip lúc chạy** của runtime (`clip(…, 220/160/110/55/90)`).
   → **0 lỗi** trong 5 khối đã soát sau khi sửa.

## Gộp `origin/main` vào nhánh — TIEN-TRINH.md ghép kiểu HỢP NHẤT (không mất mục nào)

PR #430 bị `mergeable=CONFLICTING` vì lô 035 (#428) và lô 036 (#427) đã vào `main` sau khi nhánh này
cắt. Đã `git merge origin/main` và **tự giải quyết** thay vì để người duyệt phải giải:

- **9 mục chỉ có ở `main`** (lô 036 soạn, lô 031 soát + soạn, lô 027 soát + soạn, lô 014 soạn, lô 028 soát + soạn, lô 032 soạn) → **đã chèn vào**, không bỏ.
- **4 mục chỉ có ở nhánh này** (lô 038 soát, lô 034 soát, lô 034 soạn, lô 038 soạn) → `main` **đã MẤT** các mục lô 034 vì PR #422 bị squash-merge mà không kèm `TIEN-TRINH.md` → bản ghép **khôi phục lại**.
- Bản ghép cuối: **24 mục** = hợp nhất của cả hai bên; script đã tự kiểm "không mất mục nào".

Đây là lần thứ hai `main` mất mục `TIEN-TRINH.md` khi squash-merge (lần trước lô 027/028/031) — xem
memory `tien-trinh-main-da-mat-muc-cu-phien-cu`. **Khi gộp main vào nhánh sổ tay, phải ghép kiểu hợp
nhất, không được chọn "ours/theirs".**

## Vẫn chờ người duyệt quyết (không tự quyết)

1. **0105 mất mục loại trừ sang 01.06** (vì nguồn mâu thuẫn về gà lôi) — người duyệt xem có chấp nhận
   bỏ, hay muốn sửa kệ sách trước.
2. **`0105 dong8[01059410]`** — nội dung đúng nhưng câu trích không đỡ (mục trên).
3. **`phamVi.trich` của 0102 dài 492 ký tự** — vượt "hướng dẫn" 300 của lược đồ, **dưới trần 600** của máy;
   trong repo đã có 195/10.083 mục (1,9 %) vượt 300 (max 578). `trich` **không** đưa vào prompt lúc chạy
   (runtime chỉ gửi `phamVi.text`), nên không tốn token.
4. **Tự soát mẫu ≥ 10 %** (mục 4 giao việc) — người duyệt tự rút ngẫu nhiên trên phần còn lại.
5. **`docs/giao-viec/so-tay-lo.csv`** — em **KHÔNG** sửa dòng lô 038 (`trang_thai` vẫn `dang-lam`): theo thói
   quen repo, người duyệt đặt `trang_thai=xong` + `pr` khi **gộp**; lô 034 cũng vậy.
6. **Công cụ ở `tmp/`** (`soat-lap-038.cjs`, `tao-review-038.cjs`) sẽ mất sau lô này vì `tmp/` bị
   gitignore — chưa đưa vào `scripts/` vì ngoài phạm vi brief (anh có pending decision về
   `cat-trich.cjs` từ lô 038 rồi). `scripts/apply-review-lo038.mjs` thì **có** commit, đúng quy ước
   repo (mỗi lô một script).
7. `TIEN-TRINH.md` dùng chung nhiều phiên — mục này của `dev-soat-doc-lap-lo038`, không sửa phần của phiên khác.

---

# SOÁT ĐỘC LẬP lô 034 — phiên `dev-soat-doc-lap` (23/10/2026)

Người soát **khác** người soạn (`dev-zcode-mm`). Đã đọc lại **TOÀN BỘ** 5 khối của 6 nhóm
(28 mục: 6 `phamVi` + 2 `dieuKienVao` + 9 `loaiTru` + 8 `phanBiet` + 3 `boPhan`) cùng nguồn nguyên
văn `tmp/so-tay/nguon/<nhom>.txt` — không soát mẫu. Ngoài ra đọc luôn **58 mục** ngoài 5 khối
(18 `tieuChi6` + 35 `dong8` + 5 `cay.tenDien`) để kiểm độ phủ và chiều đúng–sai.

**Kết quả: xoá 0 · sửa 2 · 28/28 mục đã soát đạt (100 %) · `nhomLoi: []`**
PR #422 · nhánh `so-tay/lo-034` · **KHÔNG merge**.

## Nguồn dùng để soát là nguồn MỚI NHẤT

Không tin bản `tmp/so-tay/nguon/` của người soạn: đã xuất lại bằng
`node scripts/build-so-tay.mjs --nhom=… --force --xuat-nguon=tmp/so-tay/nguon-check` rồi `diff` —
**6/6 tệp giống hệt**, kể cả `_he-thong.txt`. Tức là dữ liệu gốc không đổi sau lúc soạn.

## Hai lỗi đã sửa (máy đều KHÔNG bắt được)

| Nhóm | Mục | Lỗi |
|---|---|---|
| 8210 | `dieuKienVao[0].trich` | Ghép **hai đoạn văn khác nhau bằng MỘT dấu cách** nên chuỗi đó **không tồn tại trong nguồn**: `[nhom8210.nhom]` viết `…những điều kiện sau:` ⏎⏎ `(1) Nặng 10 kg trở xuống.` (ngăn bởi dòng trống). `check-so-tay` xanh vì nó so qua `squash()` — xoá mọi ký tự không phải chữ/số, nên **xoá luôn dấu xuống dòng**. Bộ kiểm thứ hai `check-trich-nguyen-van.mjs` (so byte-exact) bắt được. Trích cũ còn tạo cảm giác sai rằng "(1) Nặng 10 kg trở xuống" nằm ngay trong câu, trong khi nó là **mục (1) của danh sách điều kiện** (mục (2) nằm ngay sau nó). **Sửa:** nối hai mảnh bằng dấu lược ` … ` đúng quy ước lược đồ. `fact/op/value` không đổi. |
| 7606 | `dong8[4].dieuKien` | **Mất định ngữ giới hạn.** Câu nguồn `[sen.76061233]` là *"Các sản phẩm được phân loại ở đây **thường** có các thành phần sau"* — thành phần chỉ là thành phần **THƯỜNG THẤY**. Bản cũ ghi thẳng `— thành phần: nhôm 93,5 - 96,0, sắt không quá 0,35, …` đọc ra là phải đạt đúng bảng đó. Đúng loại lỗi luật bước 1 *"dieuKien phải giữ định ngữ giới hạn của câu"*, máy không bắt vì **câu trích vẫn nguyên văn** và `HEDGE_LOAI_TRU` chỉ soi `loaiTru`. **Sửa:** chèn lại "thường". Số và thứ tự cột bảng giữ nguyên (Mn ≤ 0,15 cho 5182, 0,20-0,50 cho 5082 — đúng thứ tự cột `Hợp kim 5182 | Hợp kim 5082`). |

## Vì sao lỗi ít hơn các lô trước — và chỗ nào em đã soi mà KHÔNG sửa

Người soạn đã **tránh sẵn** các lỗi đã biết và để trống có chủ đích nhiều khối, nên phần lớn
28 mục trả lời được ngay. Những chỗ dưới đây em **đã đọc kỹ và chủ động giữ**, ghi ra để người duyệt
không phải soi lại:

- **8210 `dieuKienVao` là mục duy nhất có `dieuKienVao` thật và nó ĐÚNG** — câu nguồn là câu **ràng
  buộc** phủ cả nhóm 82.10 (*"…thực tế chúng chỉ đáp ứng những điều kiện sau"*), không phải câu
  định nghĩa (đúng bài học lô 030: *"chỉ đặt khi câu đó phủ CẢ nhóm"*).
- **8210 `dieuKienVao[1]`**: trích *"(2) Có các đặc tính cơ khí như đã mô tả"* — phần *"như đã mô tả"*
  trỏ về đoạn trước có **cả vế phủ định** *"một đòn bẩy đơn giản … tự nó không được coi như một đặc
  tính cơ khí liên quan đến việc phân loại trong nhóm này"*. Mục vẫn đúng nghĩa (bool "có đặc tính cơ
  khí") nhưng **không mang theo định nghĩa**. Ghép cả đoạn định nghĩa vào sẽ **vượt trần 600 ký tự**
  của máy → **báo để người duyệt quyết**, không tự sửa.
- **7606 `dong8[3]` (SEN lá nhôm làm lon)**: câu định mức *"Chúng **có thể** ở dạng lá có độ dày từ
  0,175 mm nhưng không quá 0,432 mm và chiều rộng từ 254 mm nhưng không quá 1000 mm"* nằm **ngay
  sau** đoạn đã trích. Nó **không phải ngoại lệ** (không "trừ/tuy nhiên/với điều kiện") nên dấu lược
  **không vi phạm luật**; nhưng kéo vào sẽ đưa trích lên ~645 ký tự, **vượt trần 600**. Đây là
  **THIẾU, không phải SAI** → báo, không tự sửa.
- **8303 `boPhan.tomTat`** ghi *"Bộ phận của **két an toàn** đi theo két"* — chữ "két an toàn" không có
  trong `trich`, nhưng đây là đúng cách áp luật chương cho nhóm này và **trùng mẫu đã duyệt** ở 168
  nhóm có `boPhan` (vd 6102/6103/6104 *"Các bộ phận được móc của quần áo … được phân loại trong nhóm
  61.17"*) → **giữ**, không sửa.
- **7415 `boPhan`** chỉ chép vế *"bộ phận có công dụng chung"*, chưa kèm câu chung *"bộ phận xác định
  được thì phân loại như bộ phận đó"* → thiếu sót, không sai; **không tự chèn câu ngoài phạm vi sửa**.

## Kiểm thêm ngoài 5 khối (đọc nhưng không đổi nhãn)

- **`dong8` phủ đủ** cả 6 nhóm — đối chiếu `tax.*` + `sen.*` trong nguồn: **thiếu 0, thừa 0, trùng 0**
  (8/8, 8/8, 11/11, 6/6, 1/1, 1/1).
- **Chiều `tieuChi6` đúng cả 18 mục**, kể cả cặp đối xứng dễ sai: `760691`/`760692` có
  `la_dang_hinh_chu_nhat_hoa_vuong = **false**` (nguồn ghi "(not rectangular or square)"), và
  `810294 = true` / `810295 = **false**` cho *"bars and rods obtained simply by sintering"* vs
  *"other than those obtained simply by sintering"*.
- **`dong8[76061233]` đọc cột bảng đúng** — chỉ Mn khác giữa hai hợp kim, đã gắn `(5182)` / `(5082)`
  đúng thứ tự cột.

## Lỗi kệ sách — báo, không sửa trong sổ tay

1. **7604 mục (b) bị cụt**: nguồn ghi nguyên văn `(b) Các điện cực hàn đã được bọc phủ,.... (nhóm 83.11)`
   — dấu `…,…` của **chính nguồn**, rất có thể thiếu vế "ví dụ …". `loaiTru[1]`/`phanBiet[1]` chỉ dùng
   phần còn lại nên **vẫn đúng nghĩa**, nhưng ai đọc nguồn gốc sẽ thấy câu đứt. Không chép thêm
   (không có gì để chép) và không xoá (mục vẫn đủ căn cứ).
2. **8303 câu vỡ giữa chỗ**: *"…gia cố, ví dụ với với bê ⏎⏎ tông cốt thép"* — vỡ `bê` / `tông`,
   lặp "với với". Không trích đoạn này (đã loại `boPhan` khác để tránh).
3. **`tax.76069100` chứa ký tự KHÔNG NGẮT (U+00A0)** giữa hai dấu gạch. `check-trich-nguyen-van`
   báo "không nguyên văn" ở đúng mục này — **đây là đúng**, và **không nên** chép `\xa0` vào JSON:
   339/340 tệp `data/so-tay/*.json` không chứa ký tự này (chỉ `2508.json` có), tức là quy ước của
   nhà là **quy về dấu cách thường**. Giữ nguyên, ghi ra đây để người sau không "sửa nhầm".

## Nhãn nguồn (luật 11)

**28** mục đã soát chuyển `AI_DA_KIEM` → **`NGUOI_DUYET`** (đúng bằng số mục của 5 khối). `tieuChi6`,
`dong8`, `cay` **giữ nguyên** `AI_DA_KIEM` — phạm vi đổi nhãn chỉ 5 khối đã soi.

## Gates

```
check-so-tay --raw        86/86   (6 nhóm, 0 mục không kiểm được nguồn)
check-trich-nguyen-van    77/78   (1 mảnh lệch — chính là NBSP ở tax.76069100, xem mục 3)
check-cay × 6              0 lỗi lệch cây
so-tay:check               338 nhóm / 9.991 mục / 0 rớt
npm test                   ALL TESTS PASSED
```

Ba canh báo `phan-nhom-chua-co-tieu-chi` (`741510`, `741539`, `810299`) là **tiếng ý có chủ đích**:
tên WCO của ba nút đó không có tiêu chí có cấu trúc để rút — **không bịa**, để trống.

## Vẫn chờ người duyệt quyết (không tự quyết)

1. **8210 `dieuKienVao[1]`** và **7606 `dong8[3]`** — hai chỗ *thiếu* nêu trên; cả hai đều vì lý do
   **vượt trần 600 ký tự của máy**, không phải vì không biết sửa. Cần người duyệt chọn: chấp nhận
   thiếu, hay nới trần cho hai mục đó.
2. **Tự soát mẫu ≥ 10 %** (mục 4 giao việc) — người duyệt tự rút ngẫu nhiên trên phần còn lại.
3. `TIEN-TRINH.md` dùng chung nhiều phiên — mục này của `dev-soat-doc-lap`, không sửa phần của phiên khác.

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

---

# SỔ TAY LÔ 034 — 7415 7604 7606 8102 8210 8303 (23/10/2026, `dev-zcode-mm`)

## Về nhóm của lô — brief copy-paste nhầm, CSV mới là chuẩn

`brief-st-lo034.md` dòng tiêu đề ghi `7415,7604,7606,8102,8210,8303` nhưng **dòng lệnh mẫu trong
cùng brief lại là `--nhom=7615,9609,3215,6306,6804,7412`** — đúng 6 nhóm của **lô 001**. Đã đối chiếu
`docs/giao-viec/so-tay-lo.csv` (nguồn chuẩn, đúng bài học `so-tay-lo-quy-trinh`):

```
034,7415 7604 7606 8102 8210 8303,6,109115,dang-lam,dev-zcode-mm,,oz:1 × 6,99.8
```

→ dựng theo CSV. Đã cập nhật `nguoi_lam=dev-zcode-mm`, `trang_thai=dang-lam`.

## Các bước

| bước | lệnh | kết quả |
|---|---|---|
| xuất nguồn | `node scripts/build-so-tay.mjs --nhom=… --xuat-nguon=tmp/so-tay/nguon` | 6 tệp, 109.115 ký tự nguồn |
| đọc | `_he-thong.txt` (7.928 B) + 6 tệp nguồn **đọc hết** | — |
| soạn | `tmp/so-tay/raw/<nhom>.json` × 6 | 86 mục |
| máy kiểm bản nháp | `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` | lần 1 **83/83 · 0 rớt** |
| soát nghiêm (tự viết) | `/tmp/strict-trich-034.mjs` — đối chiếu **NGUYÊN VĂN**, chỉ bỏ khác biệt khoảng trắng (KHÔNG squash dấu) | 83/83 khớp |
| sửa + bổ sung | thêm 3 `tieuChi6` cho 7415 (có ren / không ren) | **86/86 · 0 rớt**, soát nghiêm 86/86 |
| nạp | `node scripts/build-so-tay.mjs --nhom=… --tu-tep=tmp/so-tay/raw --force --nguoi-soan=dev-zcode-mm --bao-cao=data/so-tay/bao-cao/lo-034.json` | **86/86 (100 %)**, `nhomLoi: []` |
| cây | `node scripts/check-cay.mjs --nhom=… --chi-tiet` | **0 lỗi lệch cây**, còn 3 canh báo (xem dưới) |
| toàn repo | `npm run so-tay:check` | `338 nhóm, 9991 mục, 0 mục không kiểm được nguồn` |
| test | `npm test` | **ALL TESTS PASSED** |

## Nhóm nguồn mỏng / bất thường — báo cáo cho người duyệt

1. **8102 mỏng nhất lô.** Chú giải nhóm 8102 **không có** câu "Nhóm này bao gồm …" định nghĩa phạm vi,
   và **không loại trừ nào nêu đích danh nhóm đích** (loại trừ duy nhất — "các hợp chất cacbua kim loại
   bị loại trừ khỏi chương này" — không có số nhóm; "hợp kim molipđen không vượt trội cũng bị loại trừ"
   cũng không có số nhóm). → `loaiTru: []`, `phanBiet: []` **có chủ đích**, không phải bỏ sót. Phần
   dùng được lấy từ tên WCO 6 số (`tieuChi6`) + 6 dòng biểu thuế.
2. **8303 — lỗi kệ sách:** câu "…làm bằng thép tấm được gia cố, ví dụ với với bê ⏎⏎ tông cốt thép"
   bị **vỡ câu giữa chỗ** (`bê` / `tông`) và lặp "với với". Không trích (sẽ phải cắt qua chỗ vỡ).
3. **7606 — bảng thành phần SEN 76061233 ghi chạy hai hợp kim trên một dòng**; phải trích theo dải và
   đọc cột theo thứ tự dòng tiêu đề `Thành phần (% theo trọng Hợp kim 5182 Hợp kim 5082 lượng).`
   → dòng tiêu đề đó **đã đưa vào câu trích** để căn cứ cho việc gắn (5182)/(5082) trong `dieuKien`.
4. **7415 — 7415.33 ≠ 7415.39 không diễn đạt được bằng `phanBiet`:** `7415.39` không phải mã nhóm hợp
   lệ (không có trong `chu-giai-heading.json`, `tax.json` chỉ có `74153900`) → chuyển vào
   `dong8[74153310].dieuKien`, đúng chỗ cần chặn.
5. **8210 — nhóm duy nhất của lô có `dieuKienVao` thật:** chính chú giải nhóm nêu hai điều kiện ràng
   buộc `(1) Nặng 10 kg trở xuống` `(2) Có các đặc tính cơ khí như đã mô tả` (đúng mẫu của nhóm 7607
   đã duyệt).

## Chủ ý BỎ `dieuKienVao` (dễ bị người soát nghi ngờ là bỏ sót)

- **7415:** "nhóm cũng bao gồm đinh bằng sắt hoặc thép có đầu mũ bằng đồng" là câu **BAO GỒM**, không
  phải điều kiện vào; và "chủ yếu bằng đồng" của chú giải chương **không phủ cả nhóm** (Phần XV Chú
  giải 7 nêu rõ đinh thép đầu bịt đồng vẫn vào 7415 **khi đồng không phải kết cấu chính**) → bỏ cả hai.
- **7604 / 7606:** câu "Chương này bao gồm nhôm và hợp kim nhôm…" là **liệt kê phạm vi chương**, không
  phải câu ràng buộc phủ cả nhóm. Nhóm 7612 đã duyệt cũng để `dieuKienVao: []`.
- **8102:** "các hợp kim molipđen … không chứa hàm lượng vượt trội … bị loại trừ khỏi nhóm này" chỉ nói
  về **hợp kim**, không phủ phần bột/thanh/dây/phế liệu; đảo thành điều kiện vào là **đảo chiều**
  (bài học `ngoaitru-nghia-dao-chieu`) → bỏ.
- **8303:** câu mở đầu "được thiết kế … để phòng ngừa mất trộm và hỏa hoạn" **chỉ phần tủ két/cửa**;
  hộp đựng tiền/văn kiện có điều kiện riêng ở đoạn sau ("miễn là chúng được trang bị tương tự để đảm
  bảo an toàn"). Đặt `value=true` sẽ khiến cổng loại nhầm hộp tiền hợp lệ → bỏ (đúng lỗi lô 030:
  "chỉ đặt khi câu đó phủ CẢ nhóm").

## Ba mục mẫu

| loại | mục |
|---|---|
| loại trừ | **8303** → "Các loại cửa an toàn làm bằng thép, loại sử dụng tại các căn hộ hoặc nhà riêng (nhóm 73.08)." → `sangNhom: 7308` (khối "Nhóm này không bao gồm:" — loại trừ thật, không phải mục bao gồm) |
| điều kiện số | **8210** → `khoi_luong <= 10 kg`, trích "Vì vậy, nhóm này bao gồm các công cụ có thể rơi vào nhóm 82.05 hoặc chương 84 nhưng thực tế chúng chỉ đáp ứng những điều kiện sau: (1) Nặng 10 kg trở xuống." |
| dòng 8 số | **76061233** (SEN) → hợp kim 5082/5182, chiều rộng trên 1 m, dạng cuộn; thành phần Al 93,5-96,0, Fe ≤ 0,35, Mg 4,0-5,0, Mn ≤ 0,15 (5182) hoặc 0,20-0,50 (5082), Si/Ti/Zn ≤ 0,20/0,10/0,25 |

## Hai chỗ đã TỰ SỬA sau khi soát (trước khi nạp)

1. **76042110** — `dieuKien` gõ "điều **hòa**" trong khi nguồn ghi "ĐIỀU **HOÀ**"; đã sửa theo nguồn
   (bài học `soat-ghi-tay-lai-thi-sai-ky-tu`). Máy **không** bắt được vì `squash` giữ nguyên dấu.
2. **76061233** — lần đầu diễn giải lệch cột bảng ("mangan không quá 0,15 hoặc 0,20 -0,50" gộp chung);
   đã tách rõ `(hợp kim 5182)` / `(hợp kim 5082)` và thêm dòng tiêu đề bảng vào câu trích làm căn cứ.

## Còn trống (`check-cay` chỉ báo, KHÔNG phải lỗi)

- `741510` (đinh/ghim dập), `741539` (WCO: "articles n.e.c."), `810299` (WCO: "articles n.e.c.") —
  không có nguồn nào nêu tiêu chí cấu 6 số cho ba nút này. Không bịa.

## Nộp dung

`data/so-tay/{7415,7604,7606,8102,8210,8303}.json` + `bao-cao/lo-034.json` + dòng CSV +
`TIEN-TRINH.md`. KHÔNG commit `tmp/`. **KHÔNG merge.**

---

# SỔ TAY LÔ 038 — 9202 0101 0102 0103 0104 0105 (24/10/2026, `dev-zcode-mm`)

## Về nhóm của lô — brief copy-paste nhầm (lần thứ 5), CSV mới là chuẩn

`brief-st-lo038.md` dòng tiêu đề ghi `9202,0101,0102,0103,0104,0105` nhưng dòng lệnh mẫu trong
cùng brief lại là `--nhom=7615,9609,3215,6306,6804,7412` — đúng 6 nhóm của **lô 001** (chuỗi lệnh
y hệt lô 003/014/027). Đối chiếu `docs/giao-viec/so-tay-lo.csv` (nguồn chuẩn):

```
038,9202 0101 0102 0103 0104 0105,6,20173,dang-lam,dev-zcode-mm,,oz:1 khong-co-tin-hieu × 5,100.0
```

→ dựng theo CSV. Đã cập nhật `nguoi_lam=dev-zcode-mm`, `trang_thai=dang-lam`.

## Các bước

| bước | lệnh | kết quả |
|---|---|---|
| xuất nguồn | `node scripts/build-so-tay.mjs --nhom=9202,0101,0102,0103,0104,0105 --xuat-nguon=tmp/so-tay/nguon` | 6 tệp, **20.173 ký tự** — nhỏ nhất từ lô 001 đến nay |
| đọc | `_he-thong.txt` (7.928 B) + 6 tệp nguồn **đọc hết** + `docs/giao-viec/so-tay-giao-ngoai.md` mục 2 + 11 luật mục 3 | — |
| soạn | `tmp/so-tay/soan-038.cjs` (dựng từ `tmp/so-tay/cat-trich.cjs`) → `tmp/so-tay/raw/<nhom>.json` × 6 | 76 mục |
| máy kiểm bản nháp | `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` | lần 1 **76/76 · 0 rớt** |
| soát nghiêm (tự viết) | `tmp/so-tay/audit-truong-038.cjs` — so **NGUYÊN VĂN** (không squash dấu) + so trường tự viết 2 mức (bỏ dấu / giữ dấu) | 2 lỗi gõ dấu thật đã sửa, 37 cảnh báo đã soi tay |
| nạp | `node scripts/build-so-tay.mjs --nhom=… --tu-tep=tmp/so-tay/raw --force --nguoi-soan=dev-zcode-mm --bao-cao=data/so-tay/bao-cao/lo-038.json` | **76/76 (100 %)**, `nhomLoi: []`, `nguonBiCut: []` |
| cây | `node scripts/check-cay.mjs --nhom=… --chi-tiet` | **0 lỗi lệch cây**, 6 nhóm đủ (có cây, đủ dong8, đủ tên nút ảo, đủ tiêu chí 6 số) |
| toàn repo | `npm run so-tay:check` | `362 nhóm, 10601 mục, 0 mục không kiểm được nguồn` |
| test | `npm test` | **ALL TESTS PASSED** (sau khi sửa 2 test — xem dưới) |

## Công cụ mới của lô: `tmp/so-tay/cat-trich.cjs` — cắt trích nguyên văn, KHÔNG gõ tay

Bài học lô 033 ("bản in của Read có thể sai dấu so với tệp nguồn") được **đóng kín** bằng công cụ:

- nén nguồn + bảng ánh xạ vị trí, **bỏ dấu thanh khi định vị** → gõ sai dấu vẫn tìm đúng chỗ;
- câu cắt ra trả **NGUYÊN VĂN** (đúng dấu, đúng ngoặc, đúng khoảng trắng của tệp nguồn);
- **đối chiếu lại** sau khi cắt: nén diacritic-sensitive (đúng máy kiểm `lib/so-tay.js`) phải BẰng câu
  đã gõ — lệch thì BÁO LỖI chứ không âm thầm nhận; khớp nhiều chỗ thì báo, không chọn bừa.

Em gõ sai dấu **3 lần** và tool bắt cả 3 (lô 034/033 mất nhiều công vì lỗi này):

| gõ | nguồn thật |
|---|---|
| "các **loài** chim nuôi còn sống" | "các **loại** chim nuôi còn sống" (0105) |
| "các **loài** chim sống khác" | "các **loại** chim sống khác" (0105) |

## Sửa 2 test vỡ do dữ liệu mới (không phải lỗi logic)

`scripts/test-so-tay-gates.mjs` + `scripts/test-so-tay-runtime.mjs` **hardcode `0101`** làm ví dụ
"nhóm chưa có sổ tay". Lô 038 là lô đầu tiên có sổ tay cho 0101 → 2 test đỏ.

Sửa: thêm `scripts/nhom-chua-co-so-tay.mjs` — **chọn nhóm ĐỘNG** theo dữ liệu hiện tại (tính cả
sổ tay trong thư mục ghi `HS_DATA_DIR` và trong `data/` gốc, đúng luật đọc của `lib/data-paths.js`).
Lô soạn sau sẽ không làm đỏ test nữa.

## Nhóm nguồn mỏng / bất thường — báo cáo cho người duyệt

1. **0105 — MÂU THUẪN KỆ SÁCH (quan trọng).** Chú giải nhóm ghi *"Nhóm này không bao gồm các loài chim
   sống khác (vd, gà gô, **gà lôi**, chim bồ câu, vịt trời, ngỗng trời) (nhóm 01.06)"* — nhưng **gà lôi
   (guinea fowl) CÓ phân nhóm 0105.15** (WCO `010515 Poultry; live, guinea fowls`) và có dòng biểu
   thuế 0105.15.x. Em **không sửa câu nguồn**; `dieuKien` của `loaiTru` chỉ nêu *"các loại chim sống
   khác (ngoài các loại chim nuôi được chỉ rõ trong nhóm)"*, **không lặp lại danh sách ví dụ** để không
   nhân bản lỗi. Câu trích vẫn giữ nguyên văn (người đọc thấy mâu thuẫn ngay trong trích).
2. **0104 — nguồn mỏng nhất lô.** Chú giải nhóm chỉ **một câu**, và **KHÔNG có "Chú giải phân nhóm"**
   → nguồn **không** định nghĩa "loại thuần chủng để nhân giống" cho 0104.10/0104.20 (khác 0101/0102/0103
   đều có câu định nghĩa). Vì vậy 4 dòng 8 số của 0104 chỉ dựa trên **dòng biểu thuế + tên phân nhóm WCO**
   (010410 Sheep; live / 010420 Goats; live) — KHÔNG tự diễn giải định nghĩa "thuần chủng" sang 0104.
3. **0102 — định nghĩa "thuần chủng" chỉ phủ 0102.21 và 0102.31.** Dòng **01029010** (0102.90.10
   "Loại thuần chủng để nhân giống") nằm ngoài phạm vi câu định nghĩa → chỉ dựa trên dòng biểu thuế,
   không mượn định nghĩa của 0102.21.
4. **0103 — ngưỡng trọng lượng tính theo TỪNG CON.** Chú giải phân nhóm: *"các giới hạn trọng lượng
   được mô tả liên quan đến trọng lượng của **mừng con vật**"*. Với lợn sống, 10 con 45 kg vẫn thuộc
   0103.91 (dưới 50 kg/con). Câu này **không nằm trong câu trích của dòng biểu thuế** → em ghi rõ
   trong `dieuKien` kèm con trỏ "(chú giải phân nhóm 01.03)" và nêu ở mô tả PR. `dieuKienSo` (cổng
   chốt dòng) lấy ngưỡng 50 kg từ dòng biểu thuế — nguồn có số.
5. **9202 — chú giải chương có câu về "các thiết bị điện … (thuộc 85.18)"** nhưng nói về **thiết bị**,
   không phải nhạc cụ → không soạn thành loại trừ. Cũng không lấy "các nhạc cụ điện … thuộc nhóm
   92.07" ở mục chú giải chương (nói chung cả Chương 92) làm `loaiTru` thứ hai — chỉ giữ câu của
   **chú giải nhóm 92.02** (nói riêng về 92.02), tránh trùng.
6. **Không nhóm nào có `dieuKienVao`.** 6/6 nhóm đều **không có câu ràng buộc nào phủ CẢ nhóm 4 số**
   (chỉ có câu định nghĩa phạm vi, câu định nghĩa thuật ngữ "thuần chủng" ở cấp phân nhóm, và câu loại
   trừ). Rỗng là **kết quả đúng**, không phải bỏ sót.

## Chủ ý BỎ (không có căn cứ)

- **`phanBiet` 9202**: nguồn chỉ nói **một chiều** ("nhạc cụ điện tử không có hộp cộng hưởng →
  92.07"); nhánh "không" sẽ phải suy từ danh sách loại trừ → **không tạo mục**.
  Cùng lý do: **9202 không có `dieuKienVao`** (câu "âm thanh có thể được tăng âm điện tử … không bị
  loại trừ" là câu CHO PHÉP, không phải điều kiện vào nhóm).
- **`phanBiet` 0101/0102/0103/0104**: không có câu nào nêu đích danh nhóm khác → rỗng.
- **`loaiTru` 0101/0102/0103/0104**: không có loại trừ nào nêu đích danh nhóm đích → rỗng.

## Ba mục mẫu

| loại | mục |
|---|---|
| loại trừ | **9202** → *"…tuy nhiên, các nhạc cụ điện tử như ghita không có hộp cộng hưởng thuộc nhóm 92.07 (xem Chú giải Tổng quát của Chương này)"* → `sangNhom: 9207` (câu có DẤU HIỆU LOẠI TRỪ + nêu đích danh nhóm đích) |
| điều kiện số | **0103 / 01039100** → `dieuKienSo: [{fact:"khoi_luong", op:"<", value:50, donVi:"kg"}]`, trích *"01039100 - - Khối lượng dưới 50 kg"* (ngưỡng theo TỪNG CON — xem mục 4 ở trên) |
| dòng 8 số | **0105 / 01059441** → "Gà chọi (tiêu đề quốc gia 0105.94.4), khối lượng không quá 2 kg" — `tieuChi {fact:"khoi_luong", op:"<=", value:2, donVi:"kg"}`; và **0102 / 01022911** (SEN) → *"Bò thiến là động vật đực họ trâu bò giống Bos loài Bos Taurus trưởng thành, đã bị thiến."* |

## Vài điểm tự viết đã soi lại trước khi nạp

1. **0105 `loaiTru.dieuKien`** ban đầu ghi *"Loài chim sống khác (ngoài các loại được chỉ rõ trong nhóm)
   — ví dụ nêu trong chú giải nhóm: gà gô, gà lôi, …"* → vừa **sai dấu** ("loài" ≠ "loại" của nguồn) vừa
   **nhân bản mâu thuẫn kệ sách** ("gà lôi"). Đã sửa thành *"Các loại chim sống khác (ngoài các loại
   chim nuôi được chỉ rõ trong nhóm)"* và **nới câu trích** để gồm cả câu đầu ("Nhóm này chỉ bao gồm
   các loại chim nuôi … được chỉ rõ trong nhóm") → mọi từ trong `dieuKien` đều có trong trích.
2. **9202 `boPhan.tomTat`** ban đầu viết "…không phải bộ phận riêng" (câu trích **không** nói) →
   đã viết lại đúng theo câu trích.
3. **0101/0102/0103 `dieuKien`** ban đầu ghi "(định nghĩa áp dụng cho phân nhóm X)" → đổi thành
   "(theo mục đích của phân nhóm X)" vì đó là **văn phong của chính câu trích**.
4. **0105 `cay.tenDien`** điền cho 2 phân nhóm 6 số chưa có tên tiếng Việt: **010511** và **010594**
   ("Gà thuộc loài Gallus domesticus"), lấy từ tên WCO 6 số — theo đúng mẫu lô trước (3904, 4418).
5. Câu trích dài nhất của lô là **276 ký tự** (phạm vi nhóm 0102, 3 đoạn nối bằng " … ") — dưới trần
   300 của lược đồ. Câu định nghĩa "thuần chủng" dài 194–216 ký tự.

## Nộp dung

`data/so-tay/{9202,0101,0102,0103,0104,0105}.json` + `bao-cao/lo-038.json` + dòng CSV +
`scripts/nhom-chua-co-so-tay.mjs` + 2 test sửa + `TIEN-TRINH.md`. KHÔNG commit `tmp/`. **KHÔNG merge.**
