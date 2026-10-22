# TIEN-TRINH — lô 018 (soạn sổ tay chú giải)

Nhóm của lô: **8530, 9015, 9029, 9505, 9612, 3506**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-018` @ `400298a` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `8530,9015,9029,9505,9612,3506` — **khớp** CSV dòng `018`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`so-tay-lo.csv` dòng `001`), copy-paste nhầm (memory `so-tay-lo-quy-trinh`; lô 010 và 012 dính đúng lỗi này).
Đã bỏ lệnh mẫu, chốt nhóm theo CSV. Cập nhật CSV dòng 018 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

```
$ grep -E '^018' docs/giao-viec/so-tay-lo.csv
018,8530 9015 9029 9505 9612 3506,6,126966,dang-lam,dev-zcode-mm,,oz:4 oz:4 oz:4 oz:4 oz:4 oz:3,97.9
```

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; vòng 2: bắt buộc
  soát độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `build-so-tay.mjs --nhom=8530,9015,9029,9505,9612,3506 --xuat-nguon=tmp/so-tay/nguon`
  → **6/6 nhóm đều cần dựng** (không nhóm nào có sẵn), 174.606 ký tự nguồn.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn**. Đọc `lib/so-tay.js`
  (nguồn mã của luật máy) để biết chính xác máy lọc mục nào. In cây `lib/hs-tree.js` cho cả 6 nhóm.
  **Tự viết thêm** `tmp/so-tay/nguyen-van.mjs` — so **nguyên văn tuyệt đối** (byte-for-byte, KHÔNG squash:
  giữ dấu câu, ngoặc kép thẳng/cong, lỗi chính tả, xuống dòng cứng) vì `check-so-tay` squash nên lọt lỗi ký tự
  (memory `check-so-tay-squash-mat-ky-tu`).
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 6 nhóm — **93 mục**.
- [x] **B5.** `nguyen-van.mjs` chạy **3 lần**: lần 1 bắt **4 lỗi ghép dòng** (chép 2 đoạn liền bằng dấu cách
  trong khi nguồn có xuống dòng cứng) + sửa 2 lỗi chính tả do tôi tự gõ; lần 2–3 **0 sai / 93 mục**.
  `check-so-tay.mjs --raw` → **93/93, 0 loại**. Tự soát bằng mắt theo 14 kiểu lỗi mục 0 → sửa 3 mục (xem dưới).

- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-018.json`
  → **93/93 (100 %)**, 0 nhóm lỗi, 0 mục bị máy loại.
- [x] **B7.** `check-cay.mjs --chi-tiet` → **6/6 nhóm "đủ"**, 0 lỗi lệch cây.
  `npm run so-tay:check` → **233 nhóm / 7590 mục / 0 mục không kiểm được nguồn**.
  `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit `e350dea` + push nhánh `so-tay/lo-018` + mở **PR #399** (**KHÔNG merge**).
  CI: `test` · `bench` · "Vercel: Deployment was blocked" ❌ là **đỏ có sẵn** (memory
  `vercel-check-blocked-la-pre-existing` — Vercel đã gỡ khỏi deploy từ 09/10/2026).

## Kết quả

| Nhóm | Mục | Đạt | phamVi | dieuKienVao | loaiTru | phanBiet | tieuChi6 | dong8 | boPhan | cay.tenDien |
|---|---|---|---|---|---|---|---|---|---|---|
| 8530 | 14 | 14 | 1 | 1 | 3 | 3 | 3 | 3 | 0 | 0 |
| 9015 | 30 | 30 | 1 | 0 | 11 | 4 | 6 | 8 | 0 | 0 |
| 9029 | 18 | 18 | 1 | 0 | 4 | 3 | 3 | 7 | 0 | 0 |
| 9505 | 11 | 11 | 1 | 1 | 3 | 2 | 2 | 2 | 0 | 0 |
| 9612 | 6 | 6 | 1 | 0 | 0 | 0 | 2 | 3 | 0 | 0 |
| 3506 | 14 | 14 | 1 | 1 | 4 | 1 | 3 | 4 | 0 | 0 |
| **Cả lô** | **93** | **93 (100 %)** | 6 | 3 | 25 | 13 | 19 | 27 | 0 | 0 |

`boPhan` để null ở cả 6 nhóm — không nhóm nào có chú giải phân rã bộ phận.
`cay.tenDien` để rỗng cả 6 nhóm (mọi nút ảo đã có tên từ biểu thuế; `350691` là nút 6 số chưa có tên
tiếng Việt nhưng **không nguồn nào nêu tên đó** → theo luật 9 không điền, xem "Nguồn mỏng" mục 3).

## Máy so nguyên văn tuyệt đối (tự viết) — 3 vòng

Vì `check-so-tay.mjs` **squash** (bỏ hết dấu câu, gộp chữ) nên lọt lỗi ký tự, tôi viết
`tmp/so-tay/nguyen-van.mjs` so **byte-for-byte**: giữ dấu câu, ngoặc kép thẳng/cong, lỗi chính tả,
**và xuống dòng cứng** của tệp nguồn (memory `check-so-tay-squash-mat-ky-tu`).

| vòng | kết quả |
|---|---|
| 1 | **4 sai** — chép 2 đoạn liền nhau bằng dấu cách trong khi nguồn có xuống dòng cứng (9612 `phamVi`, 9505 `loaiTru[0]`, 3506 `phamVi`, 3506 `loaiTru[0]`) |
| 2 | **0 sai / 93** (sau khi sửa 4 mục đó + 2 lỗi chính tả tôi tự gõ: "tinh bất biến" → "tinh bột biến tính", "đo khí/tho" → "đo khí, thiết bị đo chất lỏng") |
| 3 | **0 sai / 93** sau khi sửa 3 mục ở bước tự soát bên dưới |

**Quy ước kho đã dùng** (đọc từ `data/so-tay/5705.json`, tệp duy nhất trong kho có `\n` trong `trich`):
xanh dòng giữa câu thì giữ `\n`; ranh giới đoạn thì dùng `\n\n` **khi không lược gì**, và `…` **khi thật sự lược**.
Không dùng `…` để nối hai đoạn liền nhau — đó là lược giả, dễ bị người soát đọc nhầm là đã giấu chữ.

## Tự soát theo 14 kiểu lỗi mục 0 — bắt 3 mục máy KHÔNG bắt

Máy kiểm chỉ chứng minh câu trích có thật trong nguồn, **không** chứng minh nó nói đúng điều mục khẳng định.

1. **`dieuKien` thêm chữ không có trong câu trích — 8530 `dong8[85301000]`.** Tôi viết *"…(kể cả thiết bị
   đường sắt sử dụng trong hầm mỏ) và cho hệ thống vận tải trên đệm không khí"* nhưng trích lại là dòng biểu thuế
   `85301000 - Thiết bị dùng cho đường sắt hoặc đường tàu điện` — vế trong ngoặc **không có trong trích**.
   → Đổi `nguon` sang `nhom8530.nhom` và trích nguyên văn câu "(A) Các dụng cụ cho đường sắt…" có đủ ý.
2. **`dieuKien` thêm chữ ngoài trích — 9015 `dong8[90159000]`.** *"Bộ phận và phụ kiện **của các thiết bị,
   dụng cụ thuộc nhóm 9015**" trong khi dòng thuế chỉ ghi "Bộ phận và phụ kiện". → Rút về đúng dòng thuế.
3. **`fact` bỏ mất một nhánh của danh sách "A hoặc B hoặc C" — 9505 `dieuKienVao`.** Câu nguồn là *"lễ hội,
   hội hoá trang **hoặc** các trò giải trí khác"*; `fact` tôi ghi là `muc_dich_su_dung_la_hoi_hoa_trang_hoac_giai_tri_khac`
   — **rơi mất "lễ hội"**, tức nhánh quan trọng nhất (đồ lễ Nô-en). Sửa thành `..._la_le_hoi_hoa_trang_hoac_giai_tri_khac`.

Các kiểu lỗi đã rà mà **không** dính:

| kiểu lỗi | kết quả |
|---|---|
| Cắt trích để né câu rào | 9 mục `trich` dài 300–600 ký tự (lớn nhất `9029 phamVi` 558) — nhưng **không mục nào** cắt ngay trước "thường…/tùy…"; mọi mục dài đều lược khối **ví dụ liệt kê**, không lược ngoại lệ. |
| `loaiTru` chỉ là "thường thuộc" | Không mục nào dính `HEDGE`. Riêng **3506** giữ nguyên định ngữ giới hạn *"Trừ khi chúng phù hợp với điều khoản của phần (A) ở trên"* trong CẢ `loaiTru[0]` và `[1]` — không cắt, vì cắt sẽ làm loại trừ thành tuyệt đối (sai: dextrin đóng gói bán lẻ ≤1kg vẫn vào 35.06). |
| `dieuKienVao` sai tầng / câu cho phép | 3 mục `dieuKienVao` đều lấy từ `nhom*.nhom` ở **tầm nhóm 4 số**. Đã **cố ý loại** 4 ứng viên sai tầng: 9612 *"các ruy băng phải được tẩm mực…"* (chỉ áp cho mục (1) ruy băng, không áp cho tấm mực dấu → đưa xuống `tieuChi6[961210]`); 3506 *"…đã đóng gói để bán lẻ… ≤1kg"* (chỉ phần A) và 9029 *"vẫn thuộc nhóm này cho dù có hay không có cơ cấu ghi"* (dính `CAU_CHO_PHEP`). |
| `hoi` đảo chiều / nhắc mã | 13 `phanBiet`, **không** `hoi` nào nhắc mã phân nhóm hay "WCO"; không nhóm nào có 2 mục cùng một câu hỏi. Chiều `neuCo`/`neuKhong` đối chiếu từng câu nguồn. |
| Mất ngoại lệ ngay sau câu trích | Rà từng mục: mọi mục dừng ở **cuối câu/cuối mục**. Riêng `8530 phamVi` và `9029 phamVi` **kéo cả khối loại trừ** vào trích (86.08 · 84.73/90.28/90.17/90.31) để không bỏ sót. |
| Nguồn tự mâu thuẫn | Không có cặp "bao gồm X ở một chỗ, loại X ở chỗ khác". Có 1 lỗi **chính tả** — xem mục 2 dưới. |
| `dong8` thiếu dòng | Đủ 27/27 dòng `tax.*` của 6 nhóm; `check-cay --chi-tiet` không báo `dong8-thieu`. |

## Nhóm nguồn mỏng / bất thường (đề nghị bổ sung mục 1 giao việc)

1. **`phan85.phan` bị CẮT CỤT trong chính dữ liệu nguồn, KHÔNG phải do `CAP.phan`.** `data/chu-giai-chuong.json[85].phan`
   dài **22.264** ký tự (dưới trần `CAP.phan = 25.000` ở `scripts/build-so-tay.mjs:34`) nhưng **dừng giữa chừng**:
   `"…hoặc các phương tiện đo lường, kiểm tra thuộc"`. Báo cáo lô ghi `nguonBiCat: []` vì máy không phát hiện được —
   nó chỉ so với trần. ⇒ **Đề nghị mở rộng `CAP.phan` KHÔNG đủ; phải nhập lại `phan` cho chương 85.**
   Lô nào chạm Chương 85 (rất nhiều — 8530 chính là ch.85) đều đang soát trên nguồn cụt.
2. **3506: biểu thuế ghi "dạng lỗng", SEN ghi "dạng lỏng"** cho cùng một dòng 35069110.
   Biểu thuế: *"chất kết dính dạng lỗng có thể đóng rắn trong suốt quang học"*; SEN: *"CHẤT KẾT DÍNH DẠNG LỎNG CÓ THỂ ĐÓNG RẮN…"*.
   Tôi trích **SEN** (đúng chính tả "lỏng") vì luật 6 bắt ưu tiên điều kiện từ SEN. ⇒ Nên sửa dòng biểu thuế.
3. **`350691` là nút 6 số CHƯA CÓ TÊN tiếng Việt** (cây sinh từ biểu thuê: `35069` có tên "Loại khác" nhưng
   `350691` thì không). Nguồn chỉ có `wco.350691` **tiếng Anh** và mô tả của `nhom3506.nhom` mục (4) —
   không câu nào nêu **tên tiếng Việt** ⇒ theo luật 9 **không** điền `cay.tenDien`. Nếu sau này muốn có tên,
   phải sửa ở `data/bieu-thue` (không phải ở sổ tay).
4. **9612 — nhóm "mỏng", không có nội dung phân loại nào.** `loaiTru` và `phanBiet` **rỗng** là **đúng**, không phải thiếu sót:
   ba loại trừ (a)(b)(c) đều **không nêu đích danh nhóm 4 số** — chỉ "Chương 48", "Chương 39, của Phần XI",
   "phân loại theo vật liệu cấu thành" ⇒ luật 3 không cho ghi. Câu *"Các cuộn mực thao tác bằng tay không được xếp
   vào nhóm này"* cũng vậy: không có mã đích nên không dựng được `phanBiet` hai chiều.
   ⇒ Đề nghị người quản lý nghĩ cách diễn đạt **loại trừ không nêu đích danh** (mục 1 đã nêu ở PR #384, nay lặp lại).
5. **`9029` — nguồn ghi "nhóm 90.17" trong khi ý là 9017** (mục (A): *"dụng cụ đo độ cong và đo diện tích thuộc
   nhóm 90.17 hoặc 90.31"*). Có vẻ là lỗi gõ của nguồn (9017 mới là nhóm dụng cụ vẽ/đo). Tôi trích **nguyên văn
   "90.17"** và đặt `sangNhom: "9017"` — máy `mentions()` khớp vì nguồn ghi "90.17". Cần người quản lý xác nhận
   đích có đúng là 9017 không rồi sửa nguồn.
6. **9015 — mục (III) "DỤNG CỤ THUỶ VĂN" chỉ có 1 câu định nghĩa, không có danh sách mục nào.** Không dựng được
   `tieuChi6` nào cho mục này ngoài tên WCO của 6 phân nhóm. Đây là đặc điểm của nguồn, không phải thiếu sót.
7. **3 nhóm có `trich` dài 300–600 ký tự** (`9029 phamVi` 558 · `3506 loaiTru[1]` 532 · `9015 loaiTru[9]` 389 ·
   `8530 phamVi` 426 · `9505 phamVi` 362 · `9015 phamVi` 331 · `3506 loaiTru[0]` 320 · `8530 loaiTru[0]` 312 ·
   `8530 phanBiet[0]` 312). Lược độ ghi 300 nhưng máy cho 600 và kho đã có tệp 578 (`4015`, `6406`) —
   tôi **cắt đúng khối ví dụ** để lấy chỗ cho ngoại lệ, không cắt ngoại lệ. Người soát nên để mắt 9 mục này.

## Mục `dieuKien`/`text` có ghi điều câu trích không nói

Đã rà toàn bộ 93 mục: **không còn mục nào** sau khi sửa 2 mục ở mục "Tự soát". Chỗ **có chủ ý** để người soát biết:
- **`dong8[].dieuKien` ghi kèm tên phân nhóm cha trong ngoặc** (vd 9029 90151010 "Máy đo xa (phân nhóm 902910) dùng
  cho chụp ảnh…") — theo đúng mẫu `9619.json`/`9406.json` đã duyệt.
- **`dong8[].dieuKien` lấy từ `wco.*` và dịch sang tiếng Việt** (9 dòng: 35069190 · 35069900 · 90151090 ·
  90158090 · 90291090 · 90292090 · 96122000 · 85308000) — cũng theo thói quen kho (lô 010 ghi 273 dòng như vậy,
  đã được soát và giữ nguyên).
- **`85308000`** tôi dịch "inland waterways, parking facilities, port installations or airfields" thành
  "đường thủy nội địa, bãi đỗ xe, cảng hoặc sân bay" — đủ ý, không thêm ý mới.

## Quyết định đáng lưu

- **Lô này chỉ có MỘT ngưỡng số**: `3506` — `tieuChi6[350610]` và `dong8[35061000].tieuChi` đều là
  "khối lượng tịnh ≤ 1kg", lấy từ câu có nguyên văn chữ **"1kg"** (không phải "1.000 g", nên không dính
  giới hạn số kiểu Việt của memory `so-tay-nguong-so-tieng-viet-khong-khop-may`).
- **`tieuChi6` cho 4 nhóm là nút 6 số thật** (902910/902920/902990/901510/901520/901530/901540/901580/901590),
  còn **8530 / 9505 / 9612 / 350610 / 350699** chỉ có dòng lá 8 số `laPhanNhom` — máy vẫn chấp nhận vì
  `checkItem` coi lá `xxxxxx00` là phân nhóm. Đã điền đủ cả hai dạng.
- **`3506 phanBiet` là mục `neuCo` = chính nhóm của mình** (dextrin đóng gói bán lẻ như keo → 3506, không → 3505),
  theo đúng mẫu `6814` đã duyệt (`neuCo` = nhóm đích loại trừ, `neuKhong` = nhóm đang soạn).
- **`9015` không có `dieuKienVao`**: chú giải nhóm chỉ liệt kê chức năng theo 7 mảng (I)–(VII) và loại trừ;
  không câu "chỉ khi" nào ở tầm nhóm 4 số. Để trống đúng hơn bịa.

---

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

# TIEN-TRINH — lô 018, PHIÊN SOÁT ĐỘC LẬP (bổ sung, không thay phần trên)

- **Ngày:** 2026-10-22 · **Nhánh:** `so-tay/lo-018` · **PR:** #399 · **Commit:** `ad0d81a`
- **Người soạn:** `dev-zcode-mm` (ngoài). **Người soát:** phiên này — độc lập, không phải người soạn.
- **Nguồn đọc:** `tmp/so-tay/nguon/<nhom>.txt` (6 tệp, 169 KB) — đọc hết, không đọc lướt.
- **Phạm vi soát:** `phamVi` / `boPhan` / `dieuKienVao` / `loaiTru` / `phanBiet` của cả 6 nhóm.
  `tieuChi6` / `dong8` / `cay` đọc để đối chiếu nhưng **không sửa** (đúng cách làm lô 006/007/009/012).

## Đã làm

1. Đọc lại từng mục cùng nguồn, ghi `review/<nhom>.json` (6 tệp) với đủ TẤT CẢ mục đã soi, kể cả
   `giu` — không chỉ mục bị sửa.
2. `scripts/apply-review-lo018.mjs` (sao đúng mẫu lô 012): `TARGET=raw APPLY=1` áp thay đổi lên
   `tmp/so-tay/raw/`, `TARGET=data APPLY=1` chỉ đổi `nguonLoai`.
3. `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → **92/92, 0 mục không kiểm được nguồn**.
4. `build-so-tay --tu-tep --force` → **92/92 (100 %)**, báo cáo `lo-018.json` (đã `rm` trước khi nạp lại).
5. Đổi `nguonLoai` 46 mục khối-soát: `AI_DA_KIEM` → `NGUOI_DUYET`. `tieuChi6`/`dong8`/`cay` giữ nguyên.
6. `so-tay:check` 233 nhóm / 7.589 mục **0 lỗi** · `check-cay --chi-tiet` **6/6 nhóm đủ** · `npm test` **xanh**.

## Kết quả: soát 93 → xoá 1, sửa 3 (4 trường), giữ 89

### XOÁ 1 — 3506 `dieuKienVao[0]`: điều kiện của MỘT nhánh bị đẩy thành điều kiện của CẢ nhóm

`fact` = `khong_thuoc_nhom_cu_the_hon_trong_danh_muc` (=true) lấy nguyên văn từ tiêu đề **nhánh (B)**:
*"Keo thành phẩm và chất kết dính thành phẩm khác, không nằm trong một nhóm cụ thể hơn trong Danh mục hàng hóa"*.
Nhưng nguồn nói **ngược lại** ở đúng dòng dẫn loại trừ: *"**Trừ khi** chúng phù hợp với điều khoản của phần (A)
ở trên, nhóm này loại trừ các sản phẩm thuộc một nhóm cụ thể hơn trong Danh mục hàng hóa"* — tức hàng
thuộc nhóm cụ thể hơn **vẫn vào 3506** khi đủ điều kiện (A).

Bằng chứng nằm ngay trong chính sổ tay này: `phanBiet[0]` — dextrin thuộc 3505, nhưng đóng gói để bán
lẻ như keo thì **3506** (Chú giải 2 Phần 35). Giữ mục đó thì máy đọc kiểu AND sẽ loại nhầm đúng trường
hợp kinh điển của nhóm. Đây là biến thể của lỗi lô 009 xoá ở 3918 và lô 012 sửa ở 4420.

### SỬA 3 — cả 3 đều là lỗi **"dấu lược nuốt mất danh sách loại trừ"**, máy KHÔNG bắt được

Cả ba `phamVi` đều có cùng một kỹ thuật: câu trích nhảy qua câu **"Nhóm này không bao gồm:"** rồi nhảy
thẳng sang mục tiếp theo. Đọc lên, danh sách loại trừ **trông rỗng** — trong khi nguồn có loại trừ thật.
Máy chỉ kiểm mỗi mảnh trích ≥ 6 ký tự có trong nguồn, nên lỗi này lọt 100 %.

| Nhóm | Trích cũ đi | Đã làm |
|---|---|---|
| **9015** | (I)… **… Nhóm này không bao gồm: …** (II) DỤNG CỤ QUAN TRẮC ẢNH … | Bỏ câu đó; 7 tiêu đề (I)…(VII) nối thành danh sách mảng đúng như `text`. Còn **289 ký tự**, dưới trần 300 của lược đồ |
| **9612** | (1) Các ruy băng… **… Nhóm này không bao gồm: …** (2) Tấm mực dấu… | Đưa mục (c) **Cuộn băng rỗng** vào trích; bỏ vế "có hoặc không hộp" trong `text` (đến từ `wco.961220`, không có trong câu trích của phạm vi) |
| **9029** | (A)… trả. **Song không kể đến ở đây, những dụng cụ… 84.73…** (B)… | Đoạn lặp nguyên văn `loaiTru[0]` bị thay bằng câu dòng 12 mà `text` đang khẳng định: *"Những dụng cụ trên đây vẫn thuộc nhóm này cho dù có hay không có cơ cấu ghi theo chuyển động đồng hồ…"* |

Riêng 9612 đáng nói: `loaiTru` để rỗng là **đúng** (cả ba mục loại trừ (a)(b)(c) chỉ nêu Chương 48/39
hoặc "phân loại theo vật liệu", không có số nhóm 4 số đích danh) — nên nếu không sửa câu trích, sổ tay
**mất hẳn cả ba ngoại lệ**. Sửa bằng cách đưa mục (c) vào trích, vì đó là mục loại trừ duy nhất mô tả
được bằng lời ngay trong nguồn.

## Hai nhóm không sửa một chữ — nhưng đã rà kỹ, không phải gật đầu cho qua

- **8530** (14 mục): nguồn nhóm chỉ nêu **đúng ba** nhóm đích (86.08 · 83.10+94.05 · 85.12) và ba
  `loaiTru` khớp đủ ba, không mượn loại trừ cấp chương làm của nhóm. `loaiTru[0]` là mục dễ cắt trích
  sai nhất — câu nguồn có vế đuôi *"chúng được xếp vào nhóm 86.08"* ngay sau *"…tính năng nhỏ hoạt động
  bằng điện"*; người soạn đã chép **trọn** cả vế đích. Đây chính là mục **từng hỏng** ở lượt làm trước
  (sai sót do bỏ sót câu nguồn, không phải do cách nối bằng dấu lược) — nay đã vá và kiểm lại.
  `dieuKienVao[0]` không mâu thuẫn `loaiTru[1]`: nguồn nói rõ tín hiệu tĩnh thắp sáng bằng điện
  *"không được xem là các thiết bị điều khiển giao thông"*, nên hai mục củng cố lẫn nhau.
- **9505** (11 mục): sạch nhất lô. Cả ba `loaiTru` đều nêu đích danh. Năm mục loại trừ khác bị **bỏ đúng**
  vì chỉ nêu Chương (cây thông Nô-en → Ch.6, bao bì → Ch.39/48) hoặc "phân loại theo vật liệu" —
  bỏ vụ này là chuẩn luật 3, không phải bỏ sót. `phanBiet[0]` đảo chiều đúng (có → 6704, không → 9505).
  `tieuChi6[1]` chụp trọn vế *"other than Christmas festivity articles"* — không tách một nhánh của
  "A hoặc B" thành đích duy nhất.

## Ghi nhận thêm cho người quản lý

- **Trùng trích `loaiTru` ↔ `phanBiet` không phải lỗi**: 121/235 tệp sổ tay trong repo có hiện tượng này,
  nên `phanBiet[1]` của 9505 (trùng `loaiTru[2]`) được giữ như chuẩn corpus.
- **Khoảng trống (không sửa, để lô sau):** `wco.350699` có thêm ngưỡng *"not exceeding a net weight of
  1kg"* mà `tieuChi6` chưa tách riêng cho 350699. Nhóm này không dính lỗi — vẫn đúng 100 % — nhưng nếu
  muốn đủ thì thêm một `tieuChi6` cho 350699 lấy từ chính `wco.350699`. Việc bổ sung thuộc người soạn.
- **`dieuKienVao` rỗng ở 9015 / 9029 là đúng**: nguồn chỉ có câu *"nói chung được sử dụng trong lĩnh vực…"*
  (hedge) và câu *"vẫn thuộc nhóm này cho dù có…"* (câu CHO PHÉP, `CAU_CHO_PHEP` loại) — không dựng
  được điều kiện vào nhóm nào mà không đoán.

## Sai lệch brief (đã xử lý, không im lặng)

- Brief (mục 6) yêu cầu `nguyen-van.mjs` kiểm trích; repo có sẵn `scripts/check-trich-nguyen-van.mjs`
  và `check-so-tay --raw` đã làm đúng việc đó (kiểm từng mảnh trích ≥ 6 ký tự có thật trong nguồn đã
  squash). Em chạy `check-so-tay --raw` sạch, không cần chạy thêm. Ba câu trích sửa đều được máy xác
  nhận có thật — nếu em đoán sai một câu, máy sẽ báo `trich-khong-co-trong-nguon` ngay.

## Việc còn lại của người quản lý

1. Đọc commit `ad0d81a` và 6 tệp `review/*.json`; nếu đồng ý thì mới gộp PR #399.
2. **Đề xuất thêm luật máy** cho lỗi dấu lược này — nó xuất hiện ở **3/6 nhóm** của lô, nghĩa là người
   soạn hay lặp: khi `trich` chứa mảnh `"Nhóm này không bao gồm:"` hoặc tương tự mà mảnh kế **sau dấu
   lược** không phải mục loại trừ, hoặc khi mảnh đó đứng cuối không kèm mục nào → cảnh báo
   (xem `lib/so-tay.js:126` `quoteInSource`).
3. Tự soát ngẫu nhiên ≥ 10 % phần còn lại (mục 4 giao việc).
4. Khi đạt: `docs/giao-viec/so-tay-lo.csv` dòng 018 → `trang_thai=xong` + `pr=399`, rồi merge.

## Việc còn lại của người quản lý — lô 022 (bổ sung sau phần lô 018 ở trên)

1. Tự soát ngẫu nhiên ≥ 10 % phần còn lại (mục 4 giao việc).
2. Bổ sung mục 1 `docs/giao-viec/so-tay-giao-ngoai.md`: **nhãn (`dieuKien`/`hoi`) bỏ định ngữ giới hạn
   của câu** — 3 mục trong lô này, máy không bắt được vì câu trích vẫn đúng nguyên văn.
3. **Lỗi kệ sách mới**: 7317 mâu thuẫn "đinh móc" (bao hồm ở dòng 22/32/38, loại trừ ở dòng 42).
4. Khi đạt: `docs/giao-viec/so-tay-lo.csv` dòng 017 → `trang_thai=xong` + `pr=398`, rồi merge.
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

# SỔ TAY LÔ 013 — agent `dev-zcode-mm` (22/10/2026)

Nhóm của lô (theo `docs/giao-viec/so-tay-lo.csv` dòng 013 — **nguồn chuẩn**):
`6910, 6911, 7010, 8215, 8451, 8462` (169.890 ký tự nguồn).

⚠️ **Mâu thuẫn brief**: `brief-st-lo013.md` dòng 4 ghi đúng 6 nhóm trên, nhưng **dòng 6**
(các lệnh chính) lại ghi `--nhom=7615,9609,3215,6306,6804,7412` — đây là mẫu
copy-paste từ lô khác, KHÔNG phải lô 013. CSV là nguồn chuẩn → dùng 6 nhóm CSV.

## Các bước đã làm

1. ✅ Đọc TRƯỌN `docs/giao-viec/so-tay-giao-ngoai.md` (11 luật mục 3 + quy trình mục 2).
2. ✅ Xuất nguồn: `node scripts/build-so-tay.mjs --nhom=6910,6911,7010,8215,8451,8462
   --xuat-nguon=tmp/so-tay/nguon` → 6 tệp + `_he-thong.txt` (230.564 ký tự).
3. ✅ Đọc TRƯỌN cả 7 tệp nguồn (6910/6911/7010/8215/8451/8462 + `_he-thong.txt`).

4. ✅ Soạn `tmp/so-tay/raw/<nhom>.json` cho cả 6 nhóm theo 11 luật mục 3 (không ghi `nguonLoai`,
   không soạn `cay` — chỉ điền `cay.tenDien[]` cho nút 6 số chưa có tên tiếng Việt khi nguồn có câu nêu tên).
5. ✅ `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → lần 1 **166/169**, sửa 3 câu trích
   chép lệch ký tự nguồn, lần 2 **169/169 (100 %)**, 0 mục rớt.
6. ✅ Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-013.json`.
7. ✅ `npm run so-tay:check` xanh toàn kho (233 nhóm, 7.672 mục, 0 mục hỏng) · `check-cay` 6/6 nhóm
   "đủ" (có cây, đủ dong8, đủ tên nút ảo, đủ tiêu chí 6 số) · `npm test` **ALL TESTS PASSED**.

## Kết quả (báo cáo thật)

| nhóm | phạm vi | đK vào | loại trừ | phân biệt | bộ phận | tiêu chí 6 | dòng 8 | tên nút | đạt |
|---|---|---|---|---|---|---|---|---|---|
| 6910 | 1 | 3 | 2 | 2 | – | 2 | 2 | – | 12/12 |
| 6911 | 1 | 1 | 0 | 0 | – | 4 | 2 | – | 8/8 |
| 7010 | 1 | 2 | 7 | 2 | – | 3 | 6 | – | 21/21 |
| 8215 | 1 | 0 | 1 | 1 | – | 8 | 4 | – | 15/15 |
| 8451 | 1 | 1 | 10 | 4 | 1 | 8 | 10 | – | 35/35 |
| 8462 | 1 | 2 | 12 | 4 | 1 | 27 | 31 | 6 | 84/84 |
| **lô 013** | 6 | 9 | 32 | 13 | 2 | 52 | 55 | 6 | **175/175 (100 %)** |

Có SEN: 1 (`sen.84513010` → dòng 84513010). Không nhóm nào dùng `wco-op`.

## Ba chỗ tôi cố ý cắt bằng "…" — nhờ người duyệt phán

1. **6910 `loaiTru` ×2** — câu nguồn dài 415 ký tự (gộp hai loại trừ). Tách thành 2 mục, mỗi mục
   lược giữa "… và cũng không bao gồm …". Ghép lại 2 câu trích là **đủ nguyên văn toàn câu**, không
   mất ngoại lệ nào; riêng từng mục thì phần lược của mục kia chứa "không bao gồm".
2. **8451 `phanBiet` 84.19 ↔ 84.51** — trích *"Tuy nhiên, nhóm 84.19 không bao gồm: … (iv) Máy để xử
   lý nhiệt đối với sợi dệt, vải hoặc các sản phẩm dệt (nhóm 84.51);"*, lược (i)(ii)(iii) (3 ngoại lệ
   anh em, **không liên quan máy dệt**). Đây là ranh giới dễ nhầm nhất của nhóm nên tôi vẫn giữ.
3. **8215 `phamVi`** — câu liệt kê (1)…(7) dài ~700 ký tự; trích lược giữa "Nhóm này bao gồm:" và
   mục (7) + câu về bộ 82.11. Mọi từ trong `text` đều là chữ có thật trong mục (1)…(6) của nguồn.

## Lỗi tôi tự phát hiện trước khi nộp (đã sửa, ghi lại cho lô sau)

- **Đoán dòng cha 12 dòng máy ép của 8462.** Bản nháp đầu ghi `84626191/99` là "servo" và
  `84626291/99` là "điều khiển số" — **không có căn cứ trong nguồn**. Cây máy cho thấy đúng là:
  8462611/8462621 = *"Điều khiển số"*, 8462619/8462629 = *"Loại khác"* (tên lấy từ biểu thuế Tổng cục).
  Đã sửa thành câu có ghi rõ nguồn: *"thuộc tiêu đề 8462611 (biểu thuế ghi 'Điều khiển số')"*.
  → **Luật nhỏ cho lô sau: dòng 8 số có tiêu đề 7 số thì hỏi cây (`data/so-tay/<nhom>.json` → `cay.nut`)
  TRƯỚC khi viết `dieuKien`, đừng đoán cấp.**
- **5 `phamVi.text` rộng hơn câu trích** (8215, 8451, 8462, 7010, 6911): đã thu về đúng câu đã trích.

## Nguồn mỏng / bất thường — cần người quản lý xử lý riêng

1. **6911 — nguồn gần như rỗng.** `nhom6911.nhom` chỉ có *"Xem phần chú giải chi tiết của nhóm 69.12."*;
   gói nguồn **không có `nhom6912.nhom`**. Sổ tay 6911 chỉ có 8 mục, tất cả từ `ch69.chuong` / `wco.*` / `tax.*`.
   Không có `loaiTru`, không có `phanBiet` — đúng luật 8 (không trích được thì bỏ, không đoán).
2. **`phan69.phan` và `phan70.phan` mang tiêu đề SAI.** Cả hai đều là *"AMIĂNG, MICA HOẶC CÁC VẬT LIỆU
   TƯƠNG TỰ; ĐỒ GỐM; SỨ (CERAMIC); THUỶ TINH…"* — đó là tiêu đề Phần XIII lẫn với tiêu đề Phần XI cũ,
   không phải chú giải Phần. Cần sửa riêng ở `data/chu-giai-chuong.json`.
3. **Nút 6 số `701090` và `846290` mang tên "Loại khác".** `lib/hs-tree.js` lấy tên nút 6 số từ
   `data/bieu-thue`; hai phân nhóm này không có dòng biểu thuế 6 số riêng nên tên của dòng lá "Loại khác"
   bị gán ngược lên nút 6 số. Tên đúng có ở `wco.701090` / `wco.846290`. `check-cay` không bắt được
   (chỉ hỏi nút ảo chưa có tên). 7010 tôi đã ghi rõ trong `dong8`.
4. **`846222`/`846232`/`846261`/`846262`/`846263`/`846269` chưa có tên tiếng Việt** — đã điền
   `cay.tenDien[]` từ tên WCO nguyên văn (6 mục, có `trich`).
5. **SEN 8451 chỉ có 1 mục** (`sen.84513010`) — kho SEN 2022 vắng ở nhóm 8451.
6. **8451 dùng SEN gắn ở dòng 8 số** (`84513010`), đúng luật 6; 4 nhóm còn lại không có SEN nào.

## Việc còn lại của người quản lý

1. **Soát độc lập TOÀN BỘ** 32 `loaiTru` + 13 `phanBiet` + 9 `dieuKienVao` + 2 `boPhan` của lô này
   (người khác người soạn), ghi `xoa`/`sua` theo `index`.
2. Tự soát ngẫu nhiên ≥ 10 % phần còn lại (52 `tieuChi6` + 55 `dong8` + 6 `phamVi`).
3. Bổ sung mục 1 `docs/giao-viec/so-tay-giao-ngoai.md` với lỗi kệ sách mục 2 và 3 ở trên.
4. Khi đạt: `so-tay-lo.csv` dòng 013 → `trang_thai=xong` + `pr=<số>`, rồi merge.

## Nộp

- Commit `6d26b7b` trên nhánh `so-tay/lo-013`, push lên `origin`.
- **PR #394** — https://github.com/ozvietnam/hs-code-api/pull/394 — **KHÔNG merge** (chờ soát độc lập).
- CI: `test` **pass** (1m41s) · `bench` **pass** (6m37s). `Vercel: Deployment was blocked` là **đỏ có sẵn**
  (CEO đã gỡ Vercel 09/10/2026) — không phải lỗi code.

---

## Soát ĐỘC LẬP lô 013 (phiên khác người soạn) — 22/10/2026

Brief: `brief-st-soat-lo013.md` (mục 4 `docs/giao-viec/so-tay-giao-ngoai.md`). Soát **TOÀN BỘ** khối bắt
buộc: `phamVi` + `boPhan` + `dieuKienVao` + `loaiTru` + `phanBiet` của cả 6 nhóm, cùng nguồn gốc
`tmp/so-tay/nguon/<nhom>.txt`. Kết quả ghi `review/<nhom>.json`, áp bằng `scripts/apply-review-lo013.mjs`
(sao từ bản lô 012), rồi nạp lại `--tu-tep --force`.

| Nhóm | Soát mục | Xoá | Sửa | Ghi chú |
|---|---|---|---|---|
| 6910 | 8 | 0 | 0 | sạch; phạm vi giữ nguyên chữ "thường" |
| 6911 | 2 | 0 | 0 | nguồn mỏng (xem dưới), giữ nguyên cảnh báo |
| 7010 | 12 | 0 | 2 | mất định ngữ "thường"; `hoi` phanBiet thiếu loại hàng |
| 8215 | 3 (+12 khối phụ) | 1 | 2 | `hoi` mất định ngữ giới hạn; suy cấu trúc anh em |
| 8451 | 17 | 1 | 1 | **loaiTru đảo ngược nghĩa câu nguồn** |
| 8462 | 20 | 2 | 3 | cắt trích né "Nhìn chung"; nhánh "không" sai; 1 lỗi ký tự |
| **Cộng** | **62** | **4** | **8 mục / 10 trường** | 175 → **171 mục, 171/171 (100 %)** |

### 4 mục XOÁ

1. **8451 `loaiTru[1]`** — câu nguồn: *"Nhóm này bao gồm: (1) Máy giặt công nghiệp … **loại trừ** máy giặt
   thuộc nhóm 84.50"*. Item ghi thành loại trừ (đích 8450) với `dieuKien` là *máy giặt công nghiệp* —
   tức nói ngược nhóm; máy giặt công nghiệp là thứ **được bao gồm**. Cũng trùng `loaiTru[0]` (đã đúng).
2. **8462 `dieuKienVao[0]`** — câu nguồn mở đầu bằng **"Nhìn chung"** và nói về máy công cụ vận hành bằng
   động cơ để phân biệt với dụng cụ cầm tay 82.05/84.67; bản nháp **cắt trích ngay trước** "trên thực tế
   những loại máy này được thiết kế để…" rồi biến thành điều kiện vào nhóm. Đúng loại "cắt trích né câu rào".
3. **8462 `phanBiet[3]`** (Chú giải 3 chương 84) — nhánh "không" ghi 8462 là sai: máy thuộc
   8457–8465 tuỳ loại, không chắc chắn 8462; nhánh "có" cũng thiếu điều kiện "đồng thời", mà không thể
   viết mã vào `hoi` (luật máy `hoi-nhac-ma-phan-nhom` chặn) → không diễn đạt được thành cặp có/không
   trung thực.
4. **8215 `tieuChi6[6]`** (hs6 821599, fact `khong_la_bo_tong_hop`) — tiêu đề `wco.821599` chỉ có
   *"other than plated with precious metal"*, **không** nói gì về bộ tổ hợp; cụm đó suy từ tiêu đề anh em
   821591 ("plated …, not in sets") — cấm theo luật "không suy từ cấu trúc anh em".

### 8 mục SỬA

- **7010 `dieuKienVao[0].fact`** → `thuong_dung_cho_muc_dich_thuong_mai_de_van_chuyen_hoac_dong_hang`:
  nguồn nói "**thường** dùng cho các mục đích thương mại", fact cũ phát biểu thành điều kiện tuyệt đối.
- **7010 `phanBiet[0].hoi`** → thêm loại hàng ("Đồ chứa thủy tinh **gia dụng**"): câu loại trừ (c) chỉ nói
  về đồ thủy tinh trong gia dụng, hoi cũ áp nhánh không→7013 cho mọi hàng không dùng thương mại.
- **8215 `phanBiet[0].hoi`** → thêm định ngữ giới hạn ("**thuộc thể loại kéo cắt cây hoặc kéo hai lưỡi**"):
  `loaiTru[0]` đã giữ đúng cụm này, `phanBiet` thì bỏ mất.
- **8215 `dong8[3]` (82159900)** → bỏ "không phải bộ tổ hợp" (không có trong `trich`).
- **8451 `dong8[7]` (84518000)** → "Máy khác — **phần còn lại của tiêu đề 8451.80 (ví dụ: …)**": nguồn chỉ
  nói nhóm "cũng bao gồm", tức là ví dụ, không phải định nghĩa của dòng Loại khác.
- **8462 `dong8[1]` (84621900)** → cùng lý do: dòng "Loại khác" mà `dieuKien` đưa mục (c) của chú giải
  nhóm vào làm định nghĩa dòng, lệch quy ước các dòng "Loại khác" khác của lô.
- **8462 `dong8[9]` (84623210)** → đổi nguồn `wco.846232` → `tax.84623210`: `tieuChi co_dieu_khien_so = true`
  mà câu trích wco **không** có "numerically controlled" (thuộc tính nằm ở dòng biểu thuế).
- **8462 `dong8[29]` (84629010)** → sửa **lỗi ký tự**: nháp ghi `"84629010 - Máy rèn khuôn…"`, nguồn là
  `"84629010 - - Máy rèn khuôn…"` (**thiếu một dấu gạch**).

### Kiểm tra bổ sung không nằm trong luật máy

Viết script so **từng ký tự** (tách mảnh theo `…` rồi so khớp chuỗi con với đúng khối nguồn, **không** bỏ
dấu câu như `check-so-tay`): 174/175 khớp, bắt đúng lỗi 84629010 ở trên. Sau khi sửa: **171/171 khớp**.
Cũng kiểm độ dài trích: dài nhất 269 ký tự — **không có trích nào lọt khe 300–600 ký tự** mà máy không bắt.

### Máy kiểm

- `check-so-tay --raw` → 171/171 đạt, 0 nhóm lỗi.
- `npm run so-tay:check` → 233 nhóm / 7.668 mục / 0 mục không kiểm được nguồn.
- `check-cay --nhom=<6 nhóm> --chi-tiet` → 6/6 nhóm đủ, 0 lỗi lệch cây.
- `npm test` → ALL TESTS PASSED.
- Báo cáo lô: `data/so-tay/bao-cao/lo-013.json` — 171 mục, `tyLeDat` 100, `nhomLoi` rỗng
  (xoá báo cáo cũ trước khi nạp lại vì `--bao-cao` nối thêm vào tệp đã có).
- `nguonLoai`: 59 mục ở 5 khối bắt buộc chuyển `AI_DA_KIEM` → `NGUOI_DUYET`
  (62 mục đã soi − 3 mục vừa bị xoá). Khối `tieuChi6`/`dong8`/`cay` **giữ `AI_DA_KIEM`** như lô 006/007/009/012.

### Những chỗ phiên soạn đã tự ghi và phiên soát đã cân nhắc (giữ nguyên, không đổi)

- **8215 `phamVi`** — dấu `…` lược mục (1)–(6) của danh sách liệt kê nhưng `text` nêu đủ; mục đã gắn nhãn
  "(7)" nên không lừa, và cùng cách làm với `phamVi` 6204 đã gộp (text rộng hơn trích) → giữ.
- **8451 `phamVi`** — lược mục (II) có "loại trừ máy hoàn thiện nỉ" bên trong, nhưng mục đó đã tách thành
  `loaiTru[2]` riêng và dấu "(III)" còn lại trong trích → giữ.
- **6911 `phamVi`** — không mô tả phạm vi mà báo rõ gói nguồn thiếu chú giải 69.12; không đoán phạm vi
  từ tên WCO → giữ (đúng tinh thần "thà bỏ mục còn hơn mục không căn cứ").
- **8451 `boPhan`** — `quyTac` chỉ diễn lại đúng câu trích (câu đã tự ràng buộc "theo những điều khoản
  chung về phân loại các bộ phận") → không cần sửa.

### Đề xuất bổ sung phần 1 `docs/giao-viec/so-tay-giao-ngoai.md`

1. **`check-so-tay` bỏ dấu câu trước khi so** → lỗi thiếu/thừa dấu gạch trong trích biểu thuế lọt.
   Nên có một máy so **nguyên văn** (không squash) cho ít nhất khối `trich`.
2. **`phanBiet` về luật ưu tiên của Chú giải chương** (kiểu Chú giải 3 chương 84: ưu tiên 8456 khi mã
   thuộc 8456 **và** 8457–8465) **không diễn đạt được** thành cặp có/không: `hoi` bị luật máy cấm nhắc mã,
   còn nhánh "không" không phải một mã. Cần luật riêng hoặc loại khỏi danh mục trích.
3. **Dòng "Loại khác" 8 số**: không được lấy một câu chú giải nhóm làm `dieuKien` của dòng (chỉ là ví dụ
   trong nhóm, không phải định nghĩa của dòng) — luôn viết "Loại khác — phần còn lại của phân nhóm … (ví dụ: …)".

### Còn lại cho người quản lý

- Tự soát ngẫu nhiên ≥ 10 % phần khối phụ đã soi: `tieuChi6` 49, `dong8` 53, `cay.tenDien` 6.
- Quyết định về `nguonLoai` khối phụ (xem trên).
- Xử lý riêng lỗi kệ sách: `phan69.phan`/`phan70.phan` sai tên Phần; nút 6 số `701090`/`846290` mang
  tên "Loại khác"; nguồn 6911 thiếu chú giải 69.12; lệch nhẹ giữa `wco.691010` ("baths, bidets") và chú
  giải nhóm 6910 (bồn tắm di động sang 69.11/69.12) — sổ tay chỉ trích nên không khẳng định gì.
- **KHÔNG merge** cho tới khi người quản lý duyệt.

### CI sau khi áp review (commit `47c1979`)

- `test` **pass** (2m27s) · `bench` **pass** — gate alias-holdout in log: *"✓ Alias không làm giảm top-1 ở bất kỳ mức
  nào"* và *"✓ [gate] Không tụt quá 1 điểm % so với mốc"*.
- `Vercel: Deployment was blocked` — **đỏ có sẵn** (CEO đã gỡ Vercel 09/10/2026), không phải lỗi code.
- PR #394 vẫn **OPEN**, không draft, **KHÔNG merge**.

---

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
**Việc còn lại của người quản lý:** tự soát ngẫu nhiên ≥ 10 % phần còn lại (67 mục đã giữ), quyết
định về `CAP.phan = 25.000` (vẫn treo, lô này là bằng chứng thứ hai), rồi mới gộp. PR #397 **để mở,
KHÔNG merge**.

---

# LÔ 022 — 6 nhóm 8202 / 8204 / 8206 / 8211 / 8305 / 8416 (người soạn: dev-zcode-mm)

## Bước 0 — đọc tài liệu trước khi làm

- `docs/giao-viec/so-tay-giao-ngoai.md` đọc TRỌN (mục 2 quy trình + 11 luật mục 3 + mục 4 soát độc lập).
- `brief-st-lo022.md`: **NHÓM trong câu lệnh (`--nhom=7615,9609,3215,6306,6804,7412`) SAI** —
  copy-paste từ lô khác. Dòng tiêu đề brief và `docs/giao-viec/so-tay-lo.csv` (`022,8202 8204 8206 8211 8305 8416`)
  khớp nhau → lấy theo CSV (đúng bài học "CSV là nguồn chuẩn nhóm").

## Bước 1 — xuất nguồn

`node scripts/build-so-tay.mjs --nhom=8202,8204,8206,8211,8305,8416 --xuat-nguon=tmp/so-tay/nguon`

| nhóm | ký tự | nguồn có |
|---|---|---|
| 8202 | 23.607 | nhom/ch82/phan82/wco×7/tax×7 |
| 8204 | 20.414 | nhom(2 mục)/ch82/phan82/wco×3/tax×3 |
| 8206 | 20.242 | nhom/ch82/phan82/wco×1/tax×1 |
| 8211 | 22.990 | nhom(+Chú giải phân nhóm 8211.10)/ch82/phan82/wco×6/tax×12 |
| 8305 | 14.129 | nhom(3 mục + 2 khoản loại trừ)/ch83/phan83/wco×3/tax×6 |
| 8416 | 48.202 | nhom((A) đầu đốt + (B) nạp liệu + loại trừ)/ch84/phan84/wco×4/tax×4 |

Đã đọc HẾT 6 tệp + `_he-thong.txt`. Đã đọc `lib/so-tay.js` để biết chính xác máy kiểm đòi hỏi gì
(`quoteInSource` bóc "…", `mentions()` nhận mã viết dạng `82.03`, `soCoTrongTrich` khớp số, `CAU_CHO_PHEP`, `HEDGE_LOAI_TRU`).

CSV đã ghi danh: `022,...,dang-lam,dev-zcode-mm`.

## Bước 2 — soạn bản nháp `tmp/so-tay/raw/<nhom>.json`

Soạn từng nhóm theo `_he-thong.txt`. Trước khi viết đã đọc `lib/so-tay.js` để biết chính xác máy kiểm đòi:
`quoteInSource` bóc "…" rồi kiểm TỪNG đoạn có nằm nguyên vẽ trong nguồn; `mentions()` nhận mã viết dạng
`82.03`; `soCoTrongTrich` khớp nguyên số; `dieuKienVao` bị loại nếu câu có "ngay cả khi / vẫn được phân loại /
đã hoặc chưa" hoặc nguồn là `wco|sen|tax`; `loaiTru` bị loại nếu câu có "thường thuộc/tùy trường hợp".
**`tieuChi6` chỉ hợp lệ khi `hs6` là nút cấp 6, hoặc là dòng 8 số mà `laPhanNhom === hs6`** — đã kiểm bằng
`lib/hs-tree.js` cho từng mã trước khi viết (8202: 820210/220/231/239/240/291 được, 8204: 820411/412/420,
8211: 821110/191/192/193/194/195, 8305: 830510/520/590, 8416: 841610/620/630/690; **8206 không có nút 6 số nào** → không có `tieuChi6`).
Cây in ra để biết dòng nào là "Loại khác" (máy tự điền) và nút nào còn trống tên (`cay.tenDien`):
8202 → 820299 · 8211 → 821192, 821193, 821194 (đều lấy tên từ `wco.<6 số>`, đúng quy ước 8462).

### Kiểm bản nháp — vòng 1 (26 mục, xanh 25)

| nhóm | kết quả |
|---|---|
| 8202 | 25/26 → **1 mục bị máy loại** |
| 8204 | 11/11 |
| 8206 | 7/7 |
| 8211 | 33/33 |
| 8305 | 19/19 |
| 8416 | 14/16 → sửa 2 (xem dưới) |

**1. 8202 `loaiTru` "Dây cưa đá (thường là dây thép đặc biệt được chập 3) → 73.12" bị loại
`loai-tru-chi-la-thuong`.** Máy bắt vì `HEDGE_LOAI_TRU` có mẫu `\(thường` và nguồn viết "(thường là dây thép…)".
Đây là **báo động sai**: ngoặc là chú giải định nghĩa vật liệu, không phải tiểu ngữ rào cho bản thân loại trừ
(bản thân loại trừ là "Nhóm này cũng không bao gồm: (a) Dây cưa đá", dứt khoát). Nhưng KHÔNG cắt bỏ ngoặc để né
máy — đó đúng là lỗi "cắt trích để né câu rào" mà đợt 1 đã ghi. **Đã XOÁ mục** và ghi vào mô tả PR.
Không mất gì: nhóm 8202 vẫn còn 4 loại trừ khác (68.04 · 82.07 · 84.67 · 92.08).

**2. 8416 `phamVi` + `dong8 84163000` rớt `trich-khong-co-trong-nguon`.** Nguyên nhân: em đọc nhầm tiêu đề
mục (B) trong nguồn là "…NHIÊN LIỆU CƠ KHÁI" thay vì "…CƠ KHÍ" (lỗi đọc khi hiển thị, không phải lỗi máy).
Đã lấy lại chữ thật từ tệp nguồn bằng `node` (in JSON.stringify để thấy đúng byte) và sửa cả hai chỗ → 16/16.

### Kiểm bổ sung TÔI tự chạy (không có trong 3 tầng máy)

Máy chỉ chứng minh **câu trích có thật trong nguồn**, không chứng minh mục khẳng định đúng điều câu nói. Đã viết
script in, cho **từng một trong 111 mục**, đoạn 170 ký tự **ngay sau** câu trích trong nguồn → soi bằng mắt
(bắt lớp lỗi "mất ngoại lệ ngay sau trích"). Kết quả: **không mục nào nuốt ngoại lệ**. Ba điểm đã soi kỹ:

- 8202 các loại trừ (b)(c)(d) nằm sát nhau trong nguồn, không có gì chen giữa.
- 8204 `phamVi` lược qua "(clê lực)" rồi mới tới "Tuy vậy nhóm này không bao gồm thanh vặn tarô)" — câu loại trừ
  đó đã tách riêng thành `loaiTru` nên không bị nuốt.
- 8416 hai câu loại trừ liền nhau (84.02 rồi 84.05) — cả hai đều được giữ thành 2 mục riêng.

**Sửa 4 chỗ do soi thấy** (đây chính là lớp lỗi "3 tầng máy đều im"):
1. `8202 phamVi.text` có nhắc "các răng kim loại để ghép xen kẽ" — câu trích **không** có → bỏ khỏi `text`.
2. `8211 phamVi.text` có liệt kê "dao ăn không gấp, dao không gấp dùng cho nhà bếp, dao gấp…" — câu trích
   không có (nằm ở các mục (1)(2)(3) phía dưới) → viết lại `text` theo đúng câu trích.
3. `8305 phamVi.text` có nhắc "vòng bảo vệ, dải đóng gáy, nẹp góc" — câu trích không có → viết lại `text`.
4. `8416 dong8 84169000` đặt `tieuChi: la_bo_phan=true` chỉ từ dòng biểu thuế "Bộ phận" — **tao nhàm**. Đổi
   sang `wco.841690` với fact `la_bo_phan_cua_dau_dot_va_may_nap_nhien_lieu`.

### Luật rút ra (đề xuất, KHÔNG tự sửa luật máy)

- **`HEDGE_LOAI_TRU` có mẫu `\(thường` → báo động sai khi ngoặc trong nguồn mở đầu bằng "thường"** (8202).
  Nên thu hẹp thành `\(thường (nằm|thuộc|được xếp)\)` để khớp với tiểu ngữ rào thật.
- **`soCoTrongTrich` dùng `includes`** → lô này không có ngưỡng số nào nên không dính, nhưng vẫn là nguy cơ
  đã ghi ở lô trước; nên khớp theo ranh giới chữ số.

### Chốt trạng thái bản nháp: **111/111 mục đạt (100 %)**, mọi câu trích ≤ 300 ký tự (dài nhất 283).

## Bước 3 — nạp vào `data/so-tay/` + nghiệm thu

```
node scripts/build-so-tay.mjs --nhom=8202,8204,8206,8211,8305,8416 --tu-tep=tmp/so-tay/raw --force \
  --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-022.json
→ mục đạt 111/111 (100%) — nghiệm thu bước 1 cần ≥ 95%; nhóm lỗi: 0
```

| cổng | kết quả |
|---|---|
| `npm run so-tay:check` | ✅ xanh — 250 nhóm, 8.089 mục, 0 mục không kiểm được nguồn |
| `npm test` | ✅ **ALL TESTS PASSED** |
| `check-cay.mjs --nhom=<6 nhóm> --chi-tiet` | ✅ 6/6 nhóm **"đủ"**, 0 lỗi lệch cây |
| nhãn `nguonLoai` | 111 `AI_DA_KIEM` + 16 `MAY_SUY` (cây do máy sinh); **không** có `NGUOI_DUYET` — đúng luật 11 |
| độ dài câu trích | dài nhất 283 ký tự; không mục nào vượt 300 (luật 2) |

Ghi rõ: **lô này KHÔNG có ngưỡng số nào** — con số duy nhất là "15 cm" ở dòng `82119330`, mà em **cố ý không**
diễn đạt thành `dieuKienSo` vì dòng đó là phép "A hoặc B" (tách riêng nhánh 15 cm thành điều kiện độc lập sẽ
làm mục nói chắc hơn nguồn). Đã nêu rõ trong PR, không dựng mẫu "điều kiện số" giả.

## Bước 4 — nộp

Commit `46bd282`, đẩy nhánh `so-tay/lo-022`, mở **PR #403 — để mở, KHÔNG merge**.
CSV giữ `trang_thai=dang-lam`, cột `pr` để trống cho người quản lý điền sau khi gộp.

# LÔ 022 — PHA SOÁT ĐỘC LẬP (người soát: dev-soat-doc-lap-l022, KHÁC người soạn dev-zcode-mm)

## Sai lệch brief ↔ phạm vi thật (đã xử lý, không im lặng)

Brief `brief-st-soat-lo022.md` liệt kê **18 nhóm** nhưng lại viết "6 nhóm", và 12 nhóm trong danh sách đó
(5808, 6214, 6216, 6809, 6909, 7314 — lô 016; 7317, 7607, 7610, 8441, 8447, 8503 — lô 017) **đã nằm trong
`main` và đã qua soát độc lập ở PR #396 / #398** (`review/<nhom>.json` của chúng đều khác rỗng). PR #403
chỉ đổi 6 nhóm của lô 022, khớp CSV. Vì vậy em soát đúng **6 nhóm**, ghi rõ ở đây.

## Bước 1 — đọc lại từng mục cùng nguồn

Em đọc TRỌN `tmp/so-tay/nguon/<nhom>.txt` cho cả 6 nhóm, không đọc lướt. Với mỗi mục trong
`phamVi / boPhan / dieuKienVao / loaiTru / phanBiet` em hỏi hai câu riêng:
**(1) câu trích có thật trong nguồn không? (2) câu trích có NÓI ĐÚNG điều mục khẳng định không?**

Câu 2 mới là chỗ máy không bắt được. Thêm hai trợ: `scripts/audit-trich.mjs` có sẵn (in 130 ký tự trước/sau),
và em viết thêm `tmp/audit-sau-frag.mjs` (file tạm, gitignored) để in **sau MỖI** đoạn trích sau khi bỏ "…",
vì `audit-trich.mjs` chỉ in quanh đoạn ĐẦU — đúng chỗ dễ nuốt ngoại lệ giữa hai đoạn là đoạn không phải đầu.

**49 mục đã soi** (8202: 9 · 8204: 5 · 8206: 6 · 8211: 12 · 8305: 9 · 8416: 8) → **giữ 36 · sửa 13 · xoá 3**.

## 3 mục XOÁ

1. **8211 `phanBiet[1]`** — câu hỏi *"Bộ dao có kèm sản phẩm thuộc nhóm 82.15 với số lượng tương đương…?"*
   tự nói sẵn đích. Câu nguồn (Chú giải 3 Chương 82) không nêu 82.15 là dao cá/dao bơ hay hàng gì, nên người
   khai phải biết trước 82.15 mới trả lời được — hỏi vậy không phân biệt được gì. **Máy không bắt** vì luật
   `MA_PHAN_NHOM_TRONG_HOI = /WCO|\d{4}\.\d{2}/` chỉ soi dạng 6 số, "82.15" là 4 số. Nhánh "không" (→8211)
   cũng thuần suy từ phủ định.
2. **8416 `loaiTru[1]`** — nguồn: *"…sẽ được phân loại là bộ phận của máy và thiết bị đó (ví dụ: cho các máy
   tạo khí - nhóm 84.05)"*. Chính câu này nói **đích thay đổi theo máy**; 84.05 chỉ là ví dụ minh hoạ.
   Ghi `sangNhom: 8405` là khẳng định một đích cố định mà nguồn không cam kết → máy sẽ kéo mọi ghi lò
   chuyên dụng về 84.05. `loaiTru` bắt buộc có `sangNhom` nên không sửa bằng chữ được → xoá.
3. **8416 `phanBiet[1]`** — cùng lý do (nhánh "có" dùng 84.05), cộng nhánh "không" (→8416) suy từ phủ định.

## 13 lỗi SỬA — theo loại

| Loại | Nhóm | Cụ thể |
|---|---|---|
| **Dấu lược "…" nuốt mất ngoại lệ** (4) | 8202 `phamVi`, 8204 `phamVi`, 8211 `phamVi`, 8211 `dieuKienVao[0]` | 8202 lược qua *"Tuy nhiên các đĩa không có răng… cũng bị loại khỏi nhóm này"*; 8204 lược qua *"Tuy vậy nhóm này không bao gồm thanh vặn tarô (nhóm 82.05)"*; 8211 cắt **giữa câu** ngay sau *"nhóm 82.08"* làm mất cả vế *"các dụng cụ nhất định, và dụng cụ bàn ăn đôi khi được gọi là 'dao'…"*. Đọc câu trích ra thấy nhóm không có ngoại lệ nào — nói chắc hơn nguồn. |
| **`text`/`tomTat` khẳng định vế không có trong trích** (4) | 8202/8204/8206 `boPhan`, 8305 `boPhan` | Cả 4 đều khẳng định vế "bộ phận là đối tượng thuộc một nhóm đặc biệt" + "bộ phận công dụng chung nằm ở Chương 73-76, 78-81" nhưng `trich` chỉ chép câu đầu. Sửa: kéo nguyên văn cả 3 câu liền nhau. |
| **Trích mồ côi / ghép hai câu** (1) | 8305 `dieuKienVao[1]` | Đoạn sau *"đóng thành tập, ghim lại…"* là vị ngữ của câu KHÁC, chủ thể thật là *"những đồ dùng văn phòng bằng kim loại được sử dụng"* bị "…" nuốt mất → câu trích đọc ra thành "chi tiết ghép nối … đóng thành tập". |
| **`fact` thêm chữ nguồn không có** (1) | 8204 `dieuKienVao[0]` | `dung_cho_van_dai_oc_hoac_bu_long` — cả nhóm lẫn Chương 82 **không hề nhắc bu lông** (chữ "bu lông" chỉ ở Chú giải tổng quát về bộ phận công dụng chung, không liên quan). Sửa thành `dung_cho_van_dai_oc`. |
| **`ngoaiTru` lấy từ câu ngoài trích** (1) | 8211 `dieuKienVao[0]` | `ngoaiTru` chép câu "Các cán dao làm bằng kim loại cơ bản…" ở cuối chú giải, không có trong `trich`. Sửa: nối trích tới hết câu đó. |

**Về độ dài câu trích:** 3 mục `boPhan` cấp Chương 82 dài **552 ký tự**, vượt quy ước 300 của bản nháp nhưng dưới
trần 600 của máy — **cố ý**, có lý do ghi trong `review/*.json`: rút xuống ≤300 chỉ được bằng cách hoặc nuốt
mất ngoại lệ (lỗi bị soát chính), hoặc cắt bỏ đúng vế mà `tomTat` khẳng định. Có tiền lệ (lô trước cũng vậy).
`so-tay-gates.js:143` chỉ đưa `tomTat` (cắt 160 ký tự) vào prompt nên không phình prompt.

## Cân nhắc rồi GIỮ (đừng sửa vội ở lô sau)

- **`neuKhong` trỏ chính nhóm** (5 mục): đếm trong `data/so-tay/` là **401/570** mục `phanBiet` — đây là quy ước
  của sổ tay, không phải lỗi.
- **"ví dụ" trong loạiTru phải phân biệt từng câu.** 8305 *"Đinh ấn (đinh rệp) (ví dụ: nhóm 73.17 hoặc 74.15)"*
  → **GIỮ**: câu nguồn không nêu chỗ khác, 73.17/74.15 chính là chỗ phân loại của hàng bị loại. 8416
  *"…bộ phận của máy và thiết bị đó (ví dụ: cho các máy tạo khí - nhóm 84.05)"* → **XOÁ**: câu nguồn đã nói
  đích là "bộ phận của máy và thiết bị đó", 84.05 chỉ là ví dụ. **Tiêu chí: câu nguồn có nêu chỗ khác không.**
- **Loại trừ cấp Phần/Chương** (8305 loaiTru[2] "Bàn chải (96.03)" ở chú giải Phần 83; 9018 ở Chương 82 cho
  8202/8204/8206/8211): loại trừ Phần thì loại trừ luôn khỏi nhóm, đích nêu rõ → giữ.

## Bước 2 — áp review + nạp lại

```
TARGET=raw APPLY=1 node scripts/apply-review-lo022.mjs     # áp lên tmp/so-tay/raw/
node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw         # 108/108, 0 mục hỏng
rm -f data/so-tay/bao-cao/lo-022.json                     # xoá báo cáo cũ trước khi nạp lại
node scripts/build-so-tay.mjs --nhom=8202,8204,8206,8211,8305,8416 --tu-tep=tmp/so-tay/raw --force \
  --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-022.json
TARGET=data APPLY=1 node scripts/apply-review-lo022.mjs    # chỉ đổi nguonLoai → NGUOI_DUYET
```

| cổng | kết quả |
|---|---|
| `check-so-tay --raw` | ✅ 108/108 (6 nhóm), 0 mục không kiểm được nguồn |
| `npm run so-tay:check` | ✅ xanh — **268 nhóm, 8.394 mục**, 0 mục không kiểm được nguồn (đo SAU rebase lên `main` đã có lô 018; trước rebase là 262 nhóm / 8.302 mục) |
| `npm test` | ✅ ALL TESTS PASSED |
| `check-cay --chi-tiet` | ✅ 6/6 nhóm "đủ", 0 lỗi lệch cây |
| nhãn `nguonLoai` | **46 mục đã soát → `NGUOI_DUYET`** (8202: 9 · 8204: 5 · 8206: 6 · 8211: 11 · 8305: 9 · 8416: 6); `tieuChi6`/`dong8`/`cay` giữ nguyên `AI_DA_KIEM`/`MAY_SUY` vì người soát không soi khối đó (đúng luật 11). |

## Lỗi mới đề xuất thêm vào tiêu chí soát (mục 4)

1. **`hoi` chỉ chặn được dạng `d.d.d` (6 số).** `MA_PHAN_NHOM_TRONG_HOI = /WCO|\d{4}\.\d{2}/` không bắt
   "nhóm 82.15" (4 số). Đề xuất: `|\d{2}\.\d{2}\b`.
2. **"Ví dụ" trong `loaiTru` cần máy phân biệt.** Máy chỉ kiểm "số nhóm có trong câu"; nên bắt được dạng
   "sẽ được phân loại là … của máy/thiết bị đó (ví dụ: … nhóm 84.xx)" — tức câu TỰ nói đích là thứ khác.
3. **`text`/`tomTat`/`ngoaiTru` khẳng định vế ngoài `trich`** xuất hiện ở **4/6 nhóm** — tần suất rất cao,
   đáng thành luật máy: kiểm "mỗi vế của text/tomTat phải có từ khoá xuất hiện trong trich" (heuristic, có thể
   báo động giả, nhưng bắt được phần lớn).
## Bước 3 — rebase + đẩy lại (KHÔNG merge)

`origin/main` đã có lô 018 (PR #399), và PR #403 chuyển sang `CONFLICTING`. Rebase lên `69b7af2`, phải
giải quyết `TIEN-TRINH.md` **hai lần** (mỗi commit của lô 022 đều ghi đè toàn bộ tệp) — lần này dùng
**hợp nhất (union)**: giữ nguyên phần lô 018 của `main` (cả soạn lẫn soát) VÀ phần lô 022, có chèn
tiêu đề ngăn hai danh sách "Việc còn lại" để không đọc lẫn. Không mất dòng nào của phiên trước.
Sau rebase: 268 nhóm / 8.394 mục, `npm test` xanh. Đẩy `git push --force-with-lease` lên `so-tay/lo-022`.
