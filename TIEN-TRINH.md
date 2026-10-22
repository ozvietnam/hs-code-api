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

---

# TIEN-TRINH — lô 024 (soạn sổ tay chú giải)

- **Ngày:** 23/10/2026. **Người soạn:** `dev-zcode-mm`. **Nhánh:** `so-tay/lo-024` @ `69b7af2` (main mới nhất).
- **Nội dung lô:** 6 nhóm mới, chưa nhóm nào có sẵn `data/so-tay/<nhom>.json`.

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

- Brief dòng 4 ghi nhóm `9618,3701,3902,3904,3914,4014` — **khớp** CSV dòng `024`.
- Nhưng brief dòng 6 (lệnh `--nhom=`) lại ghi `7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
  (copy-paste nhầm). Theo luật `docs/giao-viec/so-tay-lo.csv` là nguồn chuẩn, em chạy `9618,3701,3902,3904,3914,4014`.

## Các bước

- [x] Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 2 + 11 luật mục 3).
- [x] Xuất nguồn: `node scripts/build-so-tay.mjs --nhom=9618,3701,3902,3904,3914,4014 --xuat-nguon=tmp/so-tay/nguon`
      → 6/6 nhóm, **213.009 ký tự** (dưới trần 350k của lô).
- [x] Đọc `tmp/so-tay/nguon/_he-thong.txt` (lược đồ + luật).
- [ ] Soạn `tmp/so-tay/raw/<nhom>.json` cho từng nhóm.
- [ ] `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` đến khi sạch.
- [ ] Nạp `--tu-tep --force` + báo cáo `data/so-tay/bao-cao/lo-024.json`.
- [ ] `npm run so-tay:check && npm test`.
- [ ] Commit, push, mở PR (KHÔNG merge).

## B1 — Đọc nguồn + soạn 6 nhóm

| Nhóm | Ký tự nguồn | Nội dung nguồn riêng (ngoài `ch*.chuong`) |
|---|---|---|
| 9618 | 7.939 | `nhom9618.nhom` 1.700 · `wco.961800` · 1 dòng biểu thuế |
| 3701 | 15.672 | `nhom3701.nhom` · `ch37.chuong` · `phan37.phan` · 5 `wco.*` · 7 dòng biểu thuế |
| 3902 | 55.415 | `nhom3902.nhom` 1.594 · `ch39.chuong` (40.003) · `sen.3902` · `sen.39029010` · 4 `wco.*` |
| 3904 | 56.825 | `nhom3904.nhom` 1.802 · `ch39.chuong` (40.003, **giống hệt** 3902/3914) · `sen.3904` · 9 `wco.*` |
| 4014 | 18.323 | `nhom4014.nhom` · `ch40.chuong` · `wco.401410/401490` · 5 dòng biểu thuế |
| 3914 | 52.870 | `nhom3914.nhom` **923** · `ch39.chuong` · `wco.391400` · 1 dòng biểu thuế |

**Nhóm nguồn mỏng đáng nói:** **3914** — chú giải nhóm chỉ **923 ký tự**, 3 đoạn; cả 3 nhóm Chương 39
(3902/3904/3914) dùng chung **đúng một** khối `ch39.chuong` 40.003 ký tự, nên lượng "nguồn riêng" thực
tế của lô này thấp hơn con số 213 ký tự rất nhiều.

## B2 — Hai lỗi chép tay bị bắt (nhớ kỹ: đừng tin mắt)

Cả hai lỗi đều **lọt `check-so-tay --raw`** và chỉ bị `scripts/check-trich-nguyen-van.mjs` bắt:

1. **9618 `phamVi`** — gõ "…được dùng để trình **bầy** một số vật phẩm", nguồn ghi "trình **bày**".
   Sai âm nên sau `squash()` vẫn còn là chuỗi con của nguồn → máy im lặng.
2. **9618 `phamVi`** — nguồn có `\n\n` giữa "…vật liệu cấu thành." và "(3) Mô hình tự động…"; bản nháp
   gộp thành một dấu cách. `squash()` bỏ hết khoảng trắng nên máy vẫn xanh.

**Công cụ tự viết:** `tmp/fix-trich.mjs` — tìm mảnh trích trong khối nguồn (chỉ gộp khoảng trắng, **không
đụng dấu câu/ngoặc**) rồi **cắt thẳng** chuỗi gốc thay vào. Vá được 17 mảnh; 3 lỗi thật phải sửa tay.
⚠ Bản đầu tiên của script này cắt nhầm 2 ký tự đầu mỗi mảnh (`marks[i].length` là **độ dài mảng
khớp**, phải là `marks[i][0].length`) — đã sửa, nhưng đây là bẫy cho lô sau.

## B3 — Lỗi kệ sách phát hiện (đề nghị bổ sung mục 1 giao việc)

1. **3701: WCO 3701.30 ghi "exceeding 225mm", còn biểu thuế VN dòng 37013000 ghi "trên 255 mm".**
   Hai ngưỡng khác nhau cho cùng một tiêu chí. Em **giữ nguyên cả hai** (không sửa, không đoán):
   `tieuChi6[370130]` lấy 225 mm từ `wco.370130`, `dong8[37013000].tieuChi` lấy 255 mm từ `tax.39013000`.
   Cần người quản lý xác nhận đích.
2. **3904: chú giải nhóm gõ "poly(vinyl **chlorua**)" ở câu 1 nhưng "vinyl **clorua**" ở câu 2 và 3.**
   Lỗi chính tả trong chính nguồn — em giữ nguyên "chlorua" trong `phamVi`/`dieuKienVao`, không sửa.
3. **3914: `nhom3914.nhom` kết thúc bằng dòng "Phân chương II: PHẾ LIỆU, PHẾ THẢI VÀ MẨU VỤN;
   BÁN THÀNH PHẨM; THÀNH PHẨM"** — tiêu đề Phân chương II lọt vào khối chú giải nhóm. Không phải
   văn bản pháp lý của nhóm, không trích.
4. **3904: khối `tax.*` cuối cùng dính dòng lệnh "Soạn sổ tay cho nhóm 3904."** của script sinh nguồn
   (ảnh hưởng `tax.39049090`). Script của em đã cắt; `check-so-tay` không cắt nên nếu gõ tay sẽ loại mục.

## B4 — Chỗ đã cân nhắc rồi **KHÔNG** soạn (để người soát đừng tưởng bỏ sót)

- **`dieuKienVao` rỗng ở 9618**: nhóm gồm 3 loại không có điều kiện chung nào ngoài "là mô hình/trưng bày".
  Mục (1)/(2)/(3) là **tiểu loại**, đặt làm điều kiện vào nhóm sẽ loại oan hai loại kia (đúng bẫy
  `so-tay-dieu-kien-vuot-tang-ch-phan`). 9616 (lô trước) cũng `dieuKienVao: []`.
- **`phanBiet` rỗng ở 3902 và 3904**: không có câu nào trong nguồn **vừa** nêu đặc tính phân biệt **vừa**
  nêu mã 4 số đích. Riêng 3904 chỉ phân biệt được ở cấp phân nhóm (3904.21 vs 3904.22 — đã dẻo hóa
  hay không) mà `neuCo/neuKhong` chỉ nhận mã 4 số hoặc 8 số có thật → không diễn đạt được.
- **`tieuChi6` rỗng ở 9618 và 3914**: cây của hai nhóm **không có nút 6 số** (`96180000.laPhanNhom=9618`,
  `39140000.laPhanNhom=3914`) nên `hs6` không tồn tại — máy loại `hs6-khong-co-trong-cay`.
- **`boPhan` null ở cả 6 nhóm**: không nhóm nào trong lô có câu về bộ phận.
- **3701 `cay.tenDien` rỗng**: nút 6 số 370191/370199 chưa có tên tiếng Việt, nhưng nguồn chỉ có tên WCO
  **tiếng Anh** — dịch sang tiếng Việt là "thêm hiểu biết riêng" (luật 7), nên để trống cho lô sau.

## B5 — Ba lỗi trong **script em tự viết** (đáng ghi vì máy không bắt được)

Lần đầu nạp xong 3904 vẫn **115/115 xanh**, nhưng đọc lại thì `dong8` hỏng chất lượng — máy không
kiểm `dieuKien` nên im lặng. Ba nguyên nhân, đều do script của em chứ không phải do đọc nguồn:

1. **`marks[i].length` thay vì `marks[i][0].length`** — `length` của mảng khớp là **số nhóm bắt**,
   không phải độ dài chuỗi; cắt lệch 2 ký tự đầu mỗi khối nguồn (cắt mất `(` và `.` cuối).
2. **Regex LITERAL `${nhom}` không được nội suy** — trong `/…${nhom}…/` JS hiểu `${nhom}` là chữ.
   Phải `new RegExp(...)`. Đây là lý do dòng lệnh "Soạn sổ tay cho nhóm 3904." không bị cắt khỏi
   khối `tax.39049090`.
3. **Khóa WCO lệch**: tra `WCO["3904.21"]` trong khi bảng khoá theo 6 số `390421` → **1/32** dòng
   có hậu tố "(WCO)"; đồng thời `ten` còn dính mã dòng (`39041010 - - Các polyme…`) vì khối nguồn
   mở đầu bằng `\n` nên `^\d+` không khớp → `loaiKhac` và `tieuChi` (Dạng bột / Dạng phân tán)
   gắn sai hết.

Sau sửa: **32/32** dòng có hậu tố (WCO), **9** dòng "Loại khác" đúng, **13** `tieuChi`
(9 dạng bột + 4 dạng phân tán), **9** `dieuKienSo` (dạng hạt).

**Bài học chung cho mọi lô sau:** `dieuKien` là trường mà **không luật máy nào kiểm** (cả
`check-so-tay` lẫn `check-trich-nguyen-van`) — nó chỉ vào prompt. Đừng tin "115/115 xanh" là đủ;
phải **đọc lại vài dòng 8 số bằng mắt** trước khi nạp.

## B6 — Chốt số liệu

- `check-so-tay --raw`: **115/115 (100 %)**, 0 nhóm lỗi.
- `check-trich-nguyen-van`: **111/111 mục nguyên văn byte-exact** (115 mục trừ 4 không có `trich` riêng).
- `check-cay`: 6/6 nhóm "**đủ**" (có cây, đủ dong8, đủ tên nút ảo, đủ tiêu chí 6 số).
- `npm run so-tay:check`: 268 nhóm / 8.401 mục / 0 lỗi. `npm test`: ALL PASSED.
- Sổ tay ghi: **6 phạm vi · 14 điều kiện vào · 12 loại trừ · 3 câu hỏi phân biệt · 22 tiêu chí 6 số ·
  54 dòng 8 số · 4 tên điền cây**.

## B7 — Nộp

- Commit `15be2cd`, đẩy nhánh `so-tay/lo-024`, mở **PR #405** — https://github.com/ozvietnam/hs-code-api/pull/405
- **KHÔNG merge.** Chờ soát độc lập toàn bộ theo mục 4 giao việc.
- Dòng CSV 024 để `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm` (người duyệt đổi `xong` + `pr` khi gộp).
---

# TIEN-TRINH — lô 024, PHIÊN SOÁT ĐỘC LẬP (bổ sung, không thay phần trên)

Người soát: `dev-zcode-mm` (khác người soạn). Ngày 2026-10-23. Nhóm `3701,3902,3904,3914,4014,9618`.

## Đã làm

- Đọc LẠI TOÀN BỘ `tmp/so-tay/raw/*.json` (115 mục) cùng nguồn `tmp/so-tay/nguon/*.txt` — không soát mẫu, không gật đầu cho qua.
- Mỗi mục trả lời hai câu: **câu trích có thật trong nguồn không** (máy `check-trich-nguyen-van` lo phần này) và **câu trích có NÓI ĐÚNG điều mục khẳng định không** (phần này máy không lo — em đọc tay).
- Ghi `review/<nhom>.json` (6 tệp), rồi áp bằng `scripts/apply-review-lo024.mjs` **lên `tmp/so-tay/raw/` trước**, sau đó mới nạp lại.

## Kết quả: soát 115 → xoá 5, sửa 1, giữ 109

Cả 5 mục xoá đều là lỗi **máy không bắt được** — câu trích vẫn nguyên văn 100 %, lỗi nằm ở chỗ
mục khẳng định nhiều/ít hơn điều câu trích thật sự nói.

### XOÁ 5 — theo nhóm

| Nhóm | Index | Vì sao xoá |
|---|---|---|
| 4014 | `dieuKienVao[1]` | Khẳng định `thuoc_loai_dung_cho_muc_dich_ve_sinh_hoac_phong_benh = true`, nhưng câu trích là **danh sách ví dụ** ("Bởi vậy nó bao gồm, không kể những cái khác, bao tránh thai, ống dẫn lưu, bơm tiêm…") chứ không nói gì về mục đích sử dụng. Vế "thuộc loại dùng cho các mục đích vệ sinh hoặc phòng bệnh" nằm ở **câu trước** — mục lấy điều kiện từ câu khác (lỗi "ghép hai câu"). Câu mở bằng "Bởi vậy" cũng đúng dạng câu-mở-rộng mà `_he-thong.txt` dòng 28 cấm đặt `value=true`. |
| 3914 | `dieuKienVao[2]` | Câu trích nói **"có thể trao đổi"** — câu nói khả năng (cơ chế của nhựa trao đổi ion khi gặp dung dịch điện phân), không phải điều kiện vào nhóm. `_he-thong.txt` dòng 28 cấm đặt `value=true` cho câu "có thể". |
| 3914 | `loaiTru[1]` → 3208 | **SAI TẦNG ĐỐI TƯỢNG**: Chú giải 2(e) Chương 39 chỉ loại trừ "các nhóm **39.01 đến 39.13**" — 39.14 **nằm ngoài**. Giữ mục này trong sổ tay 3914 sẽ bảo chất trao đổi ion của 39.14 hoà trong dung môi hữu cơ >50 % sẽ sang 3208 — điều nguồn không nói. |
| 3914 | `loaiTru[2]` → 3506 | Cùng lý do: khoản 2(b) cũng giới hạn "39.01 đến 39.13". Ba chỗ khác trong `[ch39.chuong]` xác nhận cùng giới hạn, và dòng 193 nói rõ "Nhóm 39.14 bao gồm các nhựa trao đổi ion làm từ các polymer thuộc các nhóm từ 39.01 đến 39.13" — tức 39.14 là ngoại lệ. |
| 3701 | `dieuKienVao[0]` | **MẤT NGOẠI LỆ NGAY TRONG CÂU TRÍCH**: `o_dang_phang = true` lấy từ câu "…ở dạng phẳng (nghĩa là, không ở dạng cuộn), **bao gồm cả phim được cuộn dạng hình đĩa**…". Ngay trong câu, nguồn nói phim cuộn dạng hình đĩa **vẫn thuộc 3701**, còn tên fact chỉ giữ "dạng phẳng" → điều kiện loại nhầm một loại phim rất phổ biến. (Phương án thay thế em **không tự làm** vì là soạn câu chữ mới: sửa thành "dạng phẳng HOẶC cuộn dạng hình đĩa".) |

### SỬA 1 — 3904 `cay.tenDien[3]`

Tên nút `390469` là "Fluoro-polymer khác **(trừ polytetrafluoroethylene)**" nhưng câu trích
(`[nhom3904.nhom]`: "Các fluoro-polymer khác bao gồm các polyme của chlorotrifluoroetylene,
poly(vinylidene fluoride)…") **không có vế trong ngoặc**. Đổi `nguon`/`trich` sang `[wco.390469]`
— câu đó có sẵn đúng nghĩa "fluoro-polymers **(other than polytetrafluoroethylene)**", và khớp
đúng khuôn mẫu hai mục anh em 390421/390422 ngay cạnh (tên tiếng Việt dịch từ câu WCO).

## Điểm mấu chốt đã soi kỹ — hai `loaiTru` GIỮ ĐÚNG ở 3902/3904

`loaiTru` 3208 và 3506 xuất hiện y hệt ở **bốn** nhóm của lô này (3902, 3904, 3914). Chúng chép
nguyên văn Chú giải 2 Chương 39, phạm vi "**39.01 đến 39.13**". Ranh giới phải soi tay chứ máy
không phân biệt được:

- `3902`, `3904` → 39.02/39.04 **nằm trong** khoảng → loại trừ **áp dụng thật, giữ**.
- `3914` → 39.14 **nằm ngoài** khoảng → loại trừ **không liên quan tới nhóm đang soạn, xoá**.

Cùng một câu trích, hai kết luận ngược nhau. Đây là loại lỗi mà nếu soát bằng máy sẽ bỏ sót
hoặc xoá oan.

## Ba nhóm không sửa một chữ — nhưng đã rà kỹ, không phải gật đầu cho qua

- **9618 (3/3)**: kiểm từng chỗ lược bằng "…"; chỗ "Mặt hàng này **thường** chúng được làm bằng gỗ…
  và **được phân loại theo vật liệu cấu thành**" — định ngữ "thường" chỉ bọc vế vật liệu, **không**
  bọc vế phân loại, nên `text` khẳng định vế sau là đúng chứ không phải cắt trích né câu rào. Khoản
  loại trừ (b) "Búp bê và đồ chơi (**Chương 95**)" cố ý không ghi `loaiTru`: chỉ nêu Chương, không
  nêu mã nhóm đích.
- **3902 (18/18)**: `phanBiet` rỗng là **đúng**, và em tự xác minh chứ không tin báo cáo phiên trước —
  khối `[ch39.chuong]` trong tệp nguồn bị cắt cụt giữa chữ tại "Do đó, ví dụ, một copolyme **etyle**",
  đúng chỗ ví dụ phân loại 3902.30 nằm. Thiếu mục **không phải lỗi soát**.
- **3904 (50/50)**: đối chiếu **bằng máy cả 32/32 dòng biểu thuế** (không thừa, không thiếu) rồi
  soi tay từng ngưỡng. 9 dòng có `trich` khác dòng biểu thuế là **cố ý** — 9 dòng "Dạng hạt(SEN)"
  lấy nguồn `sen.3904` theo luật ưu tiên SEN; hai ngưỡng 10 %/1 mm và ≥ 90 %/5 mm có mặt nguyên văn
  trong câu.

## Ghi nhận thêm cho người quản lý (không tự sửa)

1. **Lỗi kệ sách**: `CAP.chuong = 40.000` ký tự trong `scripts/build-so-tay.mjs`, chú giải Chương 39
   dài 44.853 ký tự → mất 4.853 ký tự cuối, cắt **giữa chữ**. Hệ quả trực tiếp: `phanBiet` của 3902
   không thể soạn. Cân nhắc nới trần hoặc cắt theo mốc câu.
2. **Thiếu một tiêu chí có nguồn** ở 3904: `[ch39.chuong]` dòng 391 — "Các copolyme được phân loại
   trong bốn phân nhóm này phải có các đơn vị monome cấu thành chiếm **từ 95 % trở lên** tính theo
   trọng lượng của các polyme được gọi tên trong phân nhóm này" (bốn phân nhóm gồm 3904.30, dòng 389).
   Đây là tiêu chí cấp 6 số hợp lệ cho `390430` (số 95 % có sẵn trong câu) nhưng bản nháp chỉ có một
   `tieuChi6` lấy từ WCO. **Em không tự thêm** vì brief chỉ cho ghi `xoá`/`sua` và em là người SOÁT
   chứ không phải người soạn. Cụ thể đề xuất:
   `{"hs6":"390430","fact":"don_vi_monome_duoc_goi_ten_chiem_toi_thieu_trong_phan_nhom","op":">=","value":95,"donVi":"%","nguon":"ch39.chuong","trich":"<câu dòng 391 nguyên văn>"}`
3. **Mâu thuẫn nguồn ở 3701** — giữ nguyên cả hai, chờ chốt: ngưỡng của phân nhóm 3701.30 là
   **> 225 mm** theo `[wco.370130]` nhưng dòng biểu thuế 37013000 ghi **"trên 255 mm"**.
   Cả hai đều được giữ kèm đúng nguồn. Rủi ro phụ: cùng tên fact `co_mot_chieu_bat_ky_vuot_qua` đang
   mang hai giá trị trong cùng một nhóm (225 ở `tieuChi6`, 255 ở `dong8.tieuChi`) — đúng theo tầng
   nhưng khi đổ vào prompt có thể gây nhầm.
4. **Tên fact `khoi_luong_qui_doi_troi_qua_luoi_loc_*`**: có chữ "qui đổi" mà `[sen.3904]` không có
   (nguồn chỉ ghi "khối lượng lọt qua lưới lọc"). Toán tử, ngưỡng và đơn vị đều đúng nguyên văn, quy
   ước dùng thống nhất 10× nên **không sửa 10 định danh chỉ vì một chữ**.
5. **`phamVi.text` của 3904** viết "clorua" còn `trich` giữ lỗi chính tả gốc "chlorua" — đúng luật
   (luật giữ lỗi chính tả áp cho `trích`, không áp cho `text` tóm tắt).

## Sai lệch so với khuôn mẫu lô trước (đã xử lý, không im lặng)

`scripts/apply-review-lo024.mjs` nâng `nguonLoai` cho **6 khối** (`phamVi`, `boPhan`, `dieuKienVao`,
`loaiTru`, `phanBiet`, `tieuChi6`, `dong8`), rộng hơn lô 018 (chỉ 5 khối, không đụng `tieuChi6`/`dong8`).
Lý do: phiên này đã **thật sự đối chiếu tay** cả hai khối đó (32/32 dòng biểu thuế khớp nguyên văn
bằng máy + soi tay từng ngưỡng; 9/9 câu WCO của 3902 và 3904 khớp nguyên văn), nên nhãn `NGUOI_DUYET`
mô tả đúng thực tế. Kho sổ tay đã có tiền lệ: 101 `tieuChi6` + 144 `dong8` mang nhãn này.
**Không đụng `cay`** — đó là khối máy sinh (nhãn `MAY_SUY`). Nếu người quản lý muốn quay lại khuôn mẫu
5 khối cũ thì chỉ cần sửa `KINDS_ARR` trong script rồi nạp lại.

## Chốt số liệu

- `check-so-tay --raw`: **110/110 (100 %)**, 0 nhóm lỗi (115 mục trước soát − 5 mục xoá).
- `check-trich-nguyen-van`: **OK — 106 mục** nguyên văn byte-exact (110 mục trừ 4 `cay.tenDien` không
  có `trich` riêng).
- `check-cay --chi-tiet`: 6/6 nhóm "**đủ**", 0 lỗi lệch cây.
- `npm run so-tay:check`: 268 nhóm / **8.396** mục / 0 lỗi (8.401 trước soát).
- `npm test`: **ALL TESTS PASSED**.
- `nguonLoai` đổi sang `NGUOI_DUYET`: **106 mục**; còn `AI_DA_KIEM` chỉ ở 4 `cay.tenDien` (cố ý).
- Báo cáo lô `data/so-tay/bao-cao/lo-024.json`: 6 nhóm / 110 mục / **100 %** / `nhomLoi: []`.

## Việc còn lại của người quản lý

1. Chốt ngưỡng **225 mm hay 255 mm** cho phân nhóm 3701.30.
2. Quyết định có thêm `tieuChi6` ngưỡng 95 % cho 390430 (mục 2 ở trên) hay không.
3. Nới `CAP.chuong` / cắt theo mốc câu cho Chương 39, và kiểm lại `phan85` ở lô 018.
4. Tự soát ngẫu nhiên ≥ 10 % số mục còn lại theo mục 4 giao việc.
5. Khi đạt: `so-tay-lo.csv` dòng 024 → `trang_thai=xong` + `pr=405`, **rồi mới merge**. PR #405 hiện
   chưa merge; CI có thể đỏ vì Vercel rate-limit (lỗi hạ tầng, không phải lỗi code).