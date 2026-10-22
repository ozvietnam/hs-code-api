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

# TIEN-TRINH — lô 015 (soạn sổ tay chú giải)

Nhóm của lô: **4418, 5511, 5602, 5609, 5804, 5806**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-015` @ `400298a` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `4418,5511,5602,5609,5804,5806` — **khớp** CSV dòng `015`.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — không thuộc lô 015 (đối chiếu
`so-tay-lo.csv`: đó là nhóm của lô 001), copy-paste nhầm (memory `so-tay-lo-quy-trinh`). Đã bỏ lệnh mẫu,
chốt nhóm theo CSV. Cập nhật CSV dòng 015 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.

## Các bước

- [x] **B1.** Đọc TRỌN `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 đợt 1: 14 kiểu lỗi; vòng 2: bắt buộc soát
  độc lập; mục 1 bài học; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt) + brief.
- [x] **B2.** Xuất nguồn `--nhom=4418,5511,5602,5609,5804,5806 --xuat-nguon=tmp/so-tay/nguon`
  → **cả 6 nhóm đều cần dựng** (không nhóm nào có sẵn), 183.973 ký tự nguồn.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn + **HẾT cả 6 tệp nguồn**. Đọc `lib/so-tay.js` (444 dòng)
  để biết luật máy nào lọc mục nào. In cây `lib/hs-tree.js` cho cả 6 nhóm + tra `nodeOf()` cho từng mã 6 số
  (phân biệt nút 6 số thật với `laPhanNhom` của lá 8 số — chỉ nút thật mới nhận `tieuChi6`/`tenDien`).
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 6 nhóm — 176 mục.
- [x] **B5.** Kiểm 2 lớp:
  1. `node tmp/so-tay/nguyen-van.mjs` — máy **so nguyên văn** (không squash dấu câu, không hạ chữ thường).
     Bắt được **2 lỗi** mà `check-so-tay` bỏ lọt: bỏ sót một dấu gạch trong 2 dòng `tax.*`
     (`44189100 - - Của tre` và `58063910 - - - Từ tơ tằm` khai báo trong bản nháp chỉ có 1–2 dấu).
     Lần cuối: **176/176 nguyên văn tuyệt đối, 0 sai, 0 trích > 300 ký tự**.
  2. `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw` → **176/176 (100 %)**, 0 mục loại.
  Rồi **tự soát bằng mắt theo 14 kiểu lỗi mục 0 đợt 1** — sửa **9 lỗi** (xem dưới).
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-015.json`
  → **176/176 (100 %)**, 0 nhóm lỗi.
- [x] **B7.** `check-cay.mjs --chi-tiet` cho cả 6 nhóm → **6/6 "đủ"**, 0 lỗi lệch cây.
  `npm run so-tay:check` → **233 nhóm / 7.673 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push nhánh `so-tay/lo-015` + mở **PR** (**KHÔNG merge**).

## Kết quả

| Nhóm | phạm vi | đk vào | loại trừ | phân biệt | bộ phận | tiêu chí 6 | tên nút | dòng 8 | đạt |
|---|---|---|---|---|---|---|---|---|---|
| 4418 | 1 | 3 | 4 | 4 | 1 | 18 | 2 | 21 | 54/54 |
| 5511 | 1 | 2 | 5 | 0 | 0 | 3 | 0 | 5 | 16/16 |
| 5602 | 1 | 3 | 8 | 3 | 0 | 4 | 0 | 4 | 23/23 |
| 5609 | 1 | 2 | 3 | 2 | 0 | 0 | 0 | 1 | 9/9 |
| 5804 | 1 | 3 | 4 | 3 | 1 | 4 | 2 | 11 | 29/29 |
| 5806 | 1 | 4 | 8 | 4 | 0 | 6 | 3 | 19 | 45/45 |
| **Tổng** | **6** | **17** | **32** | **16** | **2** | **35** | **7** | **61** | **176/176** |

## Chín lỗi tự soát đã sửa (máy KHÔNG bắt được)

1. **4418 `phamVi.text` chép nhầm từ lô khác** — ghi "(trừ chỉ khâu)" trong khi nguồn 4418 không có chữ này
   (chép từ 5511). Máy chỉ kiểm `trich`, không kiểm `text`. Đã viết lại theo đúng câu trích.
2. **4418 `boPhan.quyTac` mô tả câu đã bị tôi cắt khỏi trích** — `quyTac` nói "chưa lắp ráp / tháo rời" nhưng
   `trich` chỉ còn câu về phụ kiện. Đã sửa `quyTac` theo đúng phần trích còn lại (luật 7: không ghép).
3. **4418 `44187310` — `dieuKien` ghi "dùng cho sàn khảm" nhưng trích `wco.441873` không có câu đó.** Đã đổi
   sang nguồn `tax.44187310` và ghi rõ phần cha theo quy ước của lô trước (6204).
4. **4418 `44188110` — tiền tố "Sản phẩm gỗ kết cấu kỹ thuật" lấy từ định nghĩa 4418.81/82/83/89**, không có
   trong câu SEN. Đã bỏ tiền tố và nối thêm câu mô tả glulam của chính SEN (vẫn nguyên văn).
5. **5511 — "tô filament nhân tạo", "amiăng của nhóm 25.24"** là chữ tôi thêm, câu nguồn không có đủ. Đã sửa
   theo nguyên văn (kể cả lỗi gõ kép "không quá quá 5mm" của nguồn — giữ nguyên).
6. **5511 `55111010`/`55112010` — `tieuChi` 85 % trích từ `wco`, còn `dieuKien` lại lấy câu `tax`.** Máy không
   kiểm chéo `dieuKien` với `trich`. Đã thống nhất: `trich` = dòng biểu thuế, điều kiện % nằm ở `tieuChi6`.
7. **5602 `dieuKienVao[2]` MẤT NGOẠI LỆ** — trích câu "các nhóm 56.02 và 56.03 bao gồm phớt… đã ngâm tẩm…
   với plastic hoặc cao su", câu liền sau bắt đầu bằng **"Tuy nhiên"** và loại phớt có ≤ 50 % vật liệu dệt
   (Chương 39/40). Đã đưa nguyên văn ngoại lệ đó vào `ngoaiTru`.
8. **5804 `loaiTru` → 58.10 — câu trích "Những sản phẩm như vậy…" tự nó không nói điều gì** (từ đại từ, cần câu
   trước). Đã nối thêm vế định danh ("điền phủ hoặc trang trí các mắt lưới của nền vải đã có sẵn…") bằng "…".
9. **5806 `58062010`/`58062090` — `tieuChi` 5 % "đạt" máy nhờ chữ số `5` trong chính mã `58062010`**, không phải
   vì con số 5 % có trong câu. Đây là lỗ hổng của `soCoTrongTrich()` (nó kiểm tra chuỗi thô). Đã bỏ `tieuChi`
   ở hai dòng này; ngưỡng 5 % giữ ở `tieuChi6` (580620) với câu `wco` có "5%" thật.

Ngoài ra đã chạy thêm một kiểm tự động: **không `dieuKien`/`text`/`quyTac` nào nhắc mã HS mà câu trích không có**
(0 phát hiện).

## Nguồn mỏng / bất thường — cần người duyệt biết

1. **`CAP.phan = 25.000` cắt mất một nửa Chú giải Phần XI** (`scripts/build-so-tay.mjs:34`).
   `nguonBiCat` ghi `phan55.phan (46130→25000)` và `phan56.phan (46130→25000)` cho 5511/5602/5609.
   Phần bị cắt **không phải phần thừa**: mất hẳn mục *"Mặc dầu vậy các Chương từ 50 đến 55 không bao gồm"*
   với các loại trừ **56.05 / 56.06 / 56.07 / 58.08 / 59.06 / 58.06**, mất bảng *"Sợi đã đóng gói cho bán lẻ"*
   (85 g / 125 g / 500 g) và bảng phân loại sợi xe/chão bện theo độ mảnh. Những mục đó **lẽ ra phải là
   `loaiTru` rất tốt cho 5511**.
   → Em **không** trích ra ngoài gói nguồn được xuất (luật 1 mục 3: *chỉ trích từ các nguồn trong tệp `<nhom>.txt`*),
   nên 5511 chỉ có 5 loại trừ thay vì ~10. Đây là hậu quả của lỗi kệ sách, **không phải** lỗi soạn.
   *Đây là lần thứ hai báo (PR #390 lô 012 đã báo); chưa sửa vì ngoài phạm vi lô.*
2. **4418 chú giải ghi "Phân nhóm 4418.71"** cho panel lát sàn đã lắp ghép, trong khi cây hiện hành là
   **4418.73** (và "Chú giải chi tiết" chỉ liệt kê 4418.71 chứ không có 4418.73). Đây là lỗi đánh số của nguồn
   (giống dạng "số hiệu chú giải cũ" mục 1). Em **không dùng** câu đó làm căn cứ cho mục nào, chép nguyên văn
   thì giữ nguyên.
3. **5511 nguồn rất mỏng**: `nhom5511.nhom` chỉ **một câu**; phần định nghĩa "đóng gói để bán lẻ" dẫn tới
   Phần (I)(B)(3) nhưng gói không có nguồn nào nói rõ (nên `dieuKienVao` chỉ 2 mục, `phanBiet` **rỗng**,
   `boPhan` **null** — đã kiểm và xác nhận là thiếu thật, không phải bỏ sót).
4. **5609 nguồn mỏng nhất lô**: `nhom5609.nhom` chỉ 2 đoạn, chỉ 1 dòng biểu thuế, không có `tieuChi6`
   (`56090000` không tách phân nhóm). 9 mục là hết những gì nguồn cho phép.
5. **5602 `loaiTru` (a)/(b) và (c) không ghi được** vì chỉ nêu *"Chương 39 hoặc 40"* và *"Chương 57"* —
   luật 3 không cho ghi khi nguồn không nêu đích danh nhóm.
6. **5609 `loaiTru` (c) bị bỏ có chủ ý**: câu ghi *"được phân loại vào các nhóm thích hợp (ví dụ: dây giầy … nhóm
   63.07)"* — số 63.07 chỉ là **ví dụ trong câu không xác định**, đúng loại luật 3 cấm.
7. **5806 `loaiTru` (f) bị máy loại đúng luật**: *"…(nhóm 83.08 hoặc 96.06 **tùy từng trường hợp cụ thể**)"* —
   `HEDGE_LOAI_TRU` loại. Là mẫu "hedge nằm trong ngoặc chỉ danh sách mã" đã được báo ở PR #390.

## Việc còn lại của người quản lý

1. **Soát độc lập TOÀN BỘ** `phamVi`, `boPhan`, `dieuKienVao`, `loaiTru`, `phanBiet` của lô (mục 4 giao việc) —
   6 nhóm, 73 mục; riêng `loaiTru` + `dieuKienVao` là 49 mục. Chưa được soát thì **đừng gộp**.
2. **Quyết định về `CAP.phan`** (xem mục 1 ở trên) — lô này là bằng chứng thứ hai, và 4/6 nhóm của lô là
   Chương 55–58 nên mọi lô sau cùng khu vực cũng sẽ thiếu.
3. Bổ sung mục 1 `docs/giao-viec/so-tay-giao-ngoai.md` với 2 lỗi mới của lô này:
   (a) `text`/`dieuKien`/`quyTac` viết theo **hiểu biết riêng** chứ không theo câu trích (máy không kiểm các
   trường này — 3/9 lỗi tự soát rơi vào đây);
   (b) `dong8.tieuChi` "đạt" máy **nhờ chữ số trùng trong mã HS** (`58062010` chứa `5`) — `soCoTrongTrich()`
   nên kiểm theo ranh giới từ, không phải `includes`.
4. Cân nhắc máy kiểm chéo `dieuKien` với `trich` (kiểu số chữ / mã nhắc) để bắt lỗi loại (a).
5. Tự soát ngẫu nhiên ≥ 10 % phần còn lại (mục 4 giao việc).
6. Khi đạt: `so-tay-lo.csv` dòng 015 → `trang_thai=xong` + `pr=<số>`, rồi merge.

---

# 2026-10-22 — SOÁT ĐỘC LẬP lô 015 (PR #397) — người soát: Claude (`dev-zcode-mm` / phiên quản lý)

Không phải người soạn. Đã đọc **lại toàn bộ** `phamVi` / `boPhan` / `dieuKienVao` / `loaiTru` /
`phanBiet` của 6 nhóm **cùng nguồn nguyên văn** `tmp/so-tay/nguon/<nhom>.txt` (đọc hết, không đọc
bản nháp trước), rồi mới đối chiếu từng mục.

## Số liệu

| | |
|---|---|
| Mục đã soát tay | **73** (4418: 13 · 5511: 8 · 5602: 15 · 5609: 8 · 5804: 12 → còn 11 · 5806: 17) |
| Kết quả | **xoá 1, sửa 5 mục (8 trường), giữ 67** |
| Nhóm sạch | 4418 · 5511 · 5602 · 5609 (`review/<nhom>.json` = `[]`) |
| Nhóm có lỗi | **5804** (xoá 1 / sửa 2) · **5806** (sửa 3) |
| Sau khi sửa | 175/175 mục đạt máy; `check-so-tay.mjs --raw` 0 lỗi; `so-tay:check` 233 nhóm / 7.672 mục 0 lỗi; `npm test` xanh; `check-cay` 6/6 xanh |
| Nhãn | 72 mục đã soát đổi `AI_DA_KIEM` → `NGUOI_DUYET` (đúng bằng số mục tôi đếm tay) |

## 6 lỗi tìm được — máy KHÔNG bắt được (tất cả đều đã sửa/xoá)

1. **`5804 loaiTru[0]` — gộp "A và B" thành một nhánh đích** (nghiêm trọng nhất).
   Câu nguồn loại trừ hai vật hàng khác nhau: *"Vải dệt thưa thuộc các Chương 50 đến 55"* (loại vì
   **ở lại** Chương 50–55) và *"vải dệt quấn thuộc nhóm 58.03"*. Bản nháp gộp chung điều kiện và trỏ
   **cả hai → 5803**, tức bảo Hải quan rằng vải dệt thưa chương 50–55 thuộc 5803 — ngược hẳn nguồn.
   Máy không bắt được vì trích nguyên văn và "58.03" có trong câu. **Đã sửa:** thu hẹp `dieuKien`
   còn "vải dệt quấn". (Người soạn tự viết đúng ở `phanBiet[0]` cùng câu đó — chứng tỏ lỗi lệch chỗ.)
2. **`5804 dieuKienVao[2]` — câu CHO PHÉP đặt thành điều kiện bắt buộc.**
   *"Hàng ren **có thể** được làm bằng tay hoặc bằng máy."* → `_he-thong.txt` dòng 28 cấm rõ. Mẫu
   `CAU_CHO_PHEP` của máy (`lib/so-tay.js:166`) không có "có thể" nên lọt. Thêm nữa mục này vô nghĩa
   phân loại (mọi mặt hàng đều làm tay hoặc máy). **Đã xoá** — thông tin tay/máy còn nguyên ở
   `tieuChi6[1..3]` (wco.580421/29/30).
3. **`5804 phamVi` — phạm vi mất nửa nhóm.** Trích chỉ lấy Phần (I) (vải tuyn, lưới) và dừng trước
   "(II) HÀNG REN"; nhưng 3/4 phân nhóm 6 số của 5804 (5804.21/.29/.30 — 8/11 dòng biểu thuế) là
   **hàng ren**. Người đọc sẽ tưởng 5804 chỉ là vải lưới và loại nhầm ren (ren cổ áo, ren bảng…).
   **Đã sửa:** trích cả hai phần, nguyên văn từ đúng khối `nhom5804.nhom`.
4. **`5806 phamVi` — `text` thêm chữ không có trong trích.** `text` khẳng định nhóm gồm "(B) các dây
   buộc" nhưng trích lấy từ `ch58.chuong` (Chú giải 5 Ch.58) và **không có câu nào** nói vế đó — nó đến
   từ mục (B) của chính chú giải nhóm. **Đã sửa:** chuyển phạm vi về `nhom5806.nhom`, trích tiêu đề
   (A) + câu định nghĩa khổ 30 cm + tiêu đề (B). Hệ quả: `nguonDung` của 5806 không còn `ch58.chuong`
   (đúng sự thật — không mục nào còn trích khối đó).
5. **`5806 phanBiet[1]` — mất một nhánh của "A hoặc B".** Nguồn: *"(nhóm 58.07 **hoặc** 58.08)"*;
   bản nháp đặt `neuCo = "5807"`. Cùng câu đó ở `loaiTru[2]` đã ghi đúng `5807|5808`. **Đã sửa**
   thành `5807|5808` (mẫu đã có sẵn: 104/511 `phanBiet` trong dữ liệu gộp dùng nhiều mã).
6. **`5806 dieuKienVao[3]` — trích mồ côi.** Câu mở *"**Các sản phẩm nói trên** gồm có cả những ray
   băng…"*: đọc riêng câu trích thì không biết "sản phẩm nói trên" là gì, nên fact không có chủ thể để áp.
   **Đã sửa** bằng cách nối chủ thể bằng `…` với câu mở đoạc ngay trước (nguyên văn, cùng khối nguồn).

## Những gì tôi cố ý KHÔNG đụng (đã cân, thấy đúng)

* **`4418 dieuKienVao[0]` "cũng là tre hay vật liệu có tính chất gỗ"** (Chú giải 6 Ch.44) — có tiền lệ
  nguyên văn trong dữ liệu gộp (`5208 la_vai_det_thoi`, `5309`, `3925 la_ong_mang_hoac_phu_kien`);
  luật Chú giải cấp chương áp cho cả chương.
* **`5511 loaiTru[0]` "tô ≤ 2 m → 5503 hoặc 5504"** — giữ đủ **cả hai** nhánh (`5503|5504`), đúng luật 3.
* **`5602`/`5609`/`4418` loại trừ lấy từ Chú giải cấp chương** — mẫu đã chấp nhận (8201, 9607).
* **`5804` bỏ qua loại trừ "sản phẩm làm từ hàng ren → nhìn chung ở Chương 62/63 (ví dụ 62.14, 62.17,
  63.04)"** — câu có định ngữ rào *"nhìn chung"* và các số nhóm chỉ là **ví dụ** ⇒ đúng luật 3, bỏ có chủ ý.
* **`5804 tieuChi6[0]` bỏ vế ngoặc "(other than fabrics of headings 60.02 to 60.06)"** của wco.580410,
  và `580639` bỏ "n.e.c. in item no. 5806.3" — đây là quy ước chung của 511 `phanBiet`/tất cả `tieuChi6`
  đã gộp; sửa riêng một nhóm sẽ gây lệch, nên **ghi nhận chứ không sửa**.

## Kiểm bổ sung tôi chạy thêm (ngoài 3 tầng máy sẵn có)

1. **In câu ngay SAU mỗi câu trích** (73 mục) để bắt "mất ngoại lệ ngay sau trích" — kết quả: không mục
   nào bỏ mất ngoại lệ; riêng `5602 dieuKienVao[2]` và `5806 dieuKienVao[1]` **đã** kéo ngoại lệ vào
   `ngoaiTru` ngay từ bản nháp (đúng cách chữa bài học lô 009).
2. **Ngưỡng số có thật trong trích, không phải trùng chữ số trong mã HS** — 6 ngưỡng của lô
   (5511 ×2 `85%`, 5806 `5%` + 3 dòng `12 mm`) đều khớp theo **ranh giới chữ số**. Lỗi
   `soCoTrongTrich()` dùng `includes` (báo ở TIEN-TRINH người soạn) **không** xảy ra trong lô này.
3. **Đối chiếu tên tiêu đề quốc gia** mà `dieuKien` của dòng 8 số ghi ("từ tơ tằm" của 5804101…):
   hỏi `lib/hs-tree.js` → `5804101 = "Từ tơ tằm"` (`tenNguon: bieu-thue@2026.04.05`) — đúng sự thật,
   người soạn ghi rõ "đối chiếu biểu thuế" là đúng luật.
4. **Đủ dòng 8 số**: 4418 21/21 · 5511 5/5 · 5602 4/4 · 5609 1/1 · 5804 11/11 · 5806 19/19.

## Kiến nghị bổ sung vào tài liệu (đề xuất, chưa tự sửa luật máy)

1. `CAU_CHO_PHEP` (`lib/so-tay.js:166`) thêm mẫu **"có thể"** — hiện câu `… **có thể** được làm bằng tay
   hoặc bằng máy` lọt vào `dieuKienVao` với `value=true` (đã xoá ở lô này).
2. Thêm **kiểm chéo `dieuKien`/`text` với `trich`** (mã HS nhắc trong `text` mà câu trích không có;
   hoặc ngược lại câu trích nói "A và B" mà `dieuKien` chỉ giữ một nhánh) — đây là lớp lỗi mà cả 3 tầng
   máy đều im; 5/6 lỗi tôi tìm nằm ở đây.
3. `soCoTrongTrich()` nên khớp **theo ranh giới chữ số** (`(^|\D)5(\D|$)`), không dùng `includes`
   (xác nhận lại vấn đề người soạn đã báo; lô này chưa dính nhưng lô sau có thể dính).

**Việc còn lại của người quản lý:** tự soát ngẫu nhiên ≥ 10 % phần còn lại (67 mục đã giữ), quyết
định về `CAP.phan = 25.000` (vẫn treo, lô này là bằng chứng thứ hai), rồi mới gộp. PR #397 **để mở,
KHÔNG merge**.

---

# Lô 021 — `dev-zcode-mm` (2026-10-22)

## Bước 0. Ghi danh + xuất nguồn

* **Nhóm lô 021 (theo `docs/giao-viec/so-tay-lo.csv`, nguồn chuẩn):** `6802,6903,7310,7311,7324,7325` (6 nhóm).
* ⚠️ **Lệnh mẫu trong `brief-st-lo021.md` ghi nhầm** `--nhom=7615,9609,3215,6306,6804,7412` — đó không phải nhóm của lô 021
  (đúng `so-tay-lo.csv` dòng 22). Em theo CSV, đúng như `MEMORY.md` đã cảnh báo (brief hay copy-paste nhầm).
* Đọc TRƯỚC `docs/giao-viec/so-tay-giao-ngoai.md` (mục 3 = 11 luật) và `tmp/so-tay/nguon/_he-thong.txt`.
* `node scripts/build-so-tay.mjs --nhom=6802,6903,7310,7311,7324,7325 --xuat-nguon=tmp/so-tay/nguon` →
  6 tệp nguồn, tổng 118.525 ký tự. (CSV ghi `ky_tu_nguon=89541` — chênh vì CSV đếm **không kèm cây HS**;
  không ảnh hưởng gì.)

## Bước 1. Soạn bản nháp `tmp/so-tay/raw/*.json` (6 nhóm)

* Đọc TRỌN 6 tệp nguồn (mỗi tệp 14–22 nghìn ký tự) + `_he-thong.txt`; đọc `lib/so-tay.js` (máy kiểm)
  và một tệp đã gộp (5806) để bám đúng lược đồ.
* Nguyên tắc bám: **thà bỏ mục còn hơn mục không căn cứ**; không dùng hiểu biết riêng; câu "…(trừ…)/(tuy nhiên…)"
  phải kéo vào trích; "Chương N" / số nhóm chỉ là ví dụ thì KHÔNG làm `loaiTru`; `nguonLoai` không tự ghi.
* Kết quả `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw`:
  **6802 35/35 · 6903 13/13 · 7310 31/31 · 7311 17/17 · 7324 22/22 · 7325 16/16 = 134/134 (100 %)**,
  0 mục không kiểm được nguồn.

## Bước 2. Tự soát bản nháp TRƯỚC khi nạp (3 tầng kiểm ngoài máy)

Ngoài `check-so-tay --raw` (chỉ chứng minh câu trích CÓ trong nguồn), em chạy thêm 3 lớp:

1. **In câu NGAY SAU mỗi câu trích** (bắt "mất ngoại lệ ngay sau trích") — 134 mục. Bắt được **3 lỗi của chính bản nháp**:

   | # | Nhóm | Vấn đề | Xử lý |
   |---|---|---|---|
   | 1 | `6802 phamVi` | Câu trích dừng ngay trước **"Tuy nhiên, có một số trường hợp loại trừ…"** — ngoại lệ bị nuốt | **Đã sửa:** kéo nguyên văn cả câu "Tuy nhiên…" vào trích; `text` nói rõ "trừ các trường hợp được phân loại cụ thể hơn ở nhóm khác" |
   | 2 | `7311 dieuKienVao[2]` | "đã thử sức chịu đựng ở áp suất cao" — nguồn mở đầu bằng **"Một số là những xylanh, ống, chai lọ…"**, tức chỉ mô tả MỘT phần hàng, đặt `=true` là nói chắc hơn nguồn | **XOÁ mục** (đúng câu "thà bỏ mục còn hơn mục không căn cứ") |
   | 3 | `7325` | Bỏ sót ngoại lệ **"(trừ các mặt hàng thuộc nhóm 83.06)"** nằm giữa danh sách mặt hàng của nhóm | **Đã thêm** `loaiTru` → 8306 với trích `…hoa, bộ lá cây giả,..., (trừ các mặt hàng thuộc nhóm 83.06); chai thủy ngân.` |

2. **Đối chiếu NGUYÊN VĂN từng ký tự** (không chỉ `squash` của máy — máy bỏ qua dấu gạch và ngắt dòng): **143 đoạn trích, 0 sai**.
   Bắt được **2 lỗi dấu gạch**: `tax.68029200` và `tax.68029900` trong nguồn ghi `- -` (hai gạch) chứ không phải `- - -`;
   máy vẫn cho qua vì `squash` xoá dấu câu → **đã sửa về đúng nguyên văn**.

3. **Ngưỡng số / câu trích 300–600 ký tự / dòng 8 số**:
   * Ngưỡng của lô: `6802` 7 cm · `7310` 50 l, 300 l · `6903` 50 % ×2 · `7311` 7,3/30/110 l ×8 dòng — mọi ngưỡng đều có **nguyên văn trong câu trích**.
   * Trích dài 300–600 ký tự (máy vẫn qua, người soát phải để mắt): `6802 phamVi` (~324), `6903 boPhan` (~340) — em cân và giữ vì cả hai chứa **ngoại lệ** quan trọng, cắt sẽ mất nghĩa.
   * Đủ dòng 8 số: 6802 **11/11** · 6903 3/3 · 7310 **12/12** · 7311 **12/12** · 7324 **10/10** · 7325 6/6.

## Bước 3. Nạp + máy kiểm

```
node scripts/build-so-tay.mjs --nhom=6802,6903,7310,7311,7324,7325 --tu-tep=tmp/so-tay/raw --force \
  --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-021.json
→ mục đạt 134/134 (100 %) — nghiệm thu bước 1 cần ≥ 95 %; nhóm lỗi: 0
npm run so-tay:check   → sổ tay: 250 nhóm, 8112 mục, 0 mục không kiểm được nguồn  ✅
node scripts/check-cay.mjs --nhom=6802,6903,7310,7311,7324,7325 --chi-tiet
  → máy kiểm cây: 6 nhóm, 0 lỗi lệch cây, 6 nhóm đủ ✅
```

Sổ tay ghi được: 6 phạm vi · 15 điều kiện vào · 26 loại trừ · 3 câu hỏi phân biệt · 2 quy tắc bộ phận ·
22 tiêu chí 6 số · 8 tên nút điền · 54 dòng 8 số. Không nhóm nào dùng SEN.

| nhóm | phạm vi | dieuKienVao | loaiTru | phanBiet | boPhan | tieuChi6 | tenDien | dong8 |
|---|---|---|---|---|---|---|---|---|
| 6802 | 1 | 2 | 8 | 1 | 1 | 8 | 3 | 11 |
| 6903 | 1 | 2 | 2 | 0 | 1 | 4 | 0 | 3 |
| 7310 | 1 | 3 | 9 | 1 | 0 | 3 | 2 | 12 |
| 7311 | 1 | 2 | 1 | 0 | 0 | 0 | 0 | 12 |
| 7324 | 1 | 4 | 1 | 0 | 0 | 4 | 2 | 10 |
| 7325 | 1 | 2 | 3 | 1 | 0 | 3 | 1 | 6 |

## Những gì em cố Ý KHÔNG ghi (đã cân, có lý do — để người soát không tưởng là bỏ sót)

| Nhóm | Câu có trong nguồn | Vì sao không thành mục |
|---|---|---|
| 6802 | "(c) Các sản phẩm từ đá steatite đã nung (Chương 69 hoặc Chương 85)" | Chỉ nêu **Chương** → đúng luật 3 (không tính "Chương N"), và máy cũng không nhận mã đích |
| 6802 | "(e) Các sản phẩm thuộc Chương 91 (ví dụ, đồng hồ và vỏ đồng hồ…)" | Chương → như trên |
| 6802 | "Các phiến đá dùng làm bề mặt của các đồ nội thất … được xếp vào Chương 94 nếu chúng được trình bày cùng với các bộ phận của đồ nội thất …" | Chỉ có Chương 94, không có mã cụ thể; **vế ngoại lệ "tuy nhiên … được trình bày riêng thì vẫn được xếp trong nhóm này" giữ nguyên trong nguồn** nên không mất nghĩa |
| 6802 | "…tuy nhiên đá cuội, đá hạt, đá dăm chưa được xử lý và các loại cát tự nhiên được nhuộm màu được xếp vào Chương 25" | Chỉ Chương 25 |
| 6802 | "Nhóm này cũng bao gồm thêm đá hạt, đá dăm và bột đá … được nhuộm màu nhân tạo (kể cả đá phiến) … tuy nhiên đá cuội … Chương 25" | Câu **"cũng bao gồm"** → `_he-thong.txt` dòng 28 cấm đặt `value=true`. Thông tin này **đã vào** `tieuChi6[680210]` + `dong8.68021000` (đúng cấp) |
| 6903 | ch69 "(d) các phần cắt rời … bằng vật liệu gốm áp điện từ … (nhóm 38.24)", "(e) nhóm 68.04", "(g) nhóm 85.46/85.47" | Loại trừ **cấp chương** chung cho mọi nhóm 69.04–69.14, không riêng 6903 → đã lấy loại trừ **riêng của 6903** là nón Seger (38.24) |
| 6903 | "…các gạt dẫn chỉ máy dệt bằng vật liệu tương tự sẽ được xếp vào nhóm 69,09 vì chúng được thiết kế rõ ràng dành cho các mục đích sử dụng không chịu lửa" | **Máy loại vì nguồn ghi "69,09" (dấu PHẨY)** mà `mentions()` chỉ nhận "69.09" / "6909". Không sửa nguồn ⇒ **không thành `loaiTru`**. Thông tin vẫn còn nguyên trong `boPhan.trich` (em kéo cả câu này vào trích) |
| 7324 | "(b) Tủ nhỏ đựng thuốc và tủ tường vệ sinh và các đồ đạc khác thuộc Chương 94" | Chỉ Chương 94 |
| 7310 / 7311 / 7324 / 7325 | các câu **"có thể …"**, **"Một số là …"**, **"Tất cả các đồ chứa có thể được trang bị …"** | `_he-thong.txt` dòng 28 — không đặt thành điều kiện vào nhóm. Riêng 7324 câu *"với điều kiện rằng chúng vẫn còn nguyên tính chất của các mặt hàng bằng sắt hoặc thép"* thì **có "với điều kiện"** thật nên em giữ làm `dieuKienVao` |
| 6903 / 7311 / 7324 / 7325 | — | **`phanBiet` để trống**: không có câu nào nêu được **cả hai nhánh** có căn cứ. Luật "nhánh 'không' phải có căn cứ trong nguồn; không suy từ cấu trúc anh em hay danh sách loại trừ" ⇒ thà để trống còn hơn đoán. (6802 / 7310 / 7325 có đủ 1 cặp.) |

## Lỗi KỆ SÁCH phát hiện (đề xuất sửa riêng, KHÔNG tự sửa trong sổ tay)

1. **`data/chu-giai-chuong.json`: `phan` của Chương 68 và 69 mang tiêu đề Phần XI**
   (*"AMIĂNG, MICA HOẶC CÁC VẬT LIỆU TƯƠNG TỰ; ĐỒ GỐM; SỨ (CERAMIC); THUỶ TINH…"*) trong khi Chương 68/69 thuộc **Phần XIII**
   (đã kiểm bằng `data/hs-sections.json`). `lib/so-tay.js#phanHopLe()` vẫn cho 2 nhóm này nhận `phan68.phan`/`phan69.phan`.
   Lô này **không trích** 2 nguồn đó, nhưng lô sau sẽ dễ bị dẫn.
2. **Chú giải nhóm 7310 viết "dung tích không vượt quá 3001"** (thiếu chữ `l`, đọc thành 3001 lít; chỗ đối chiếu còn ra
   "trên 3001"). Số `300` **có thật** trong chuỗi nên máy vẫn kiểm được `dieuKienVao ≤ 300 l`, nhưng nên sửa kệ sách.
3. **Ngắt dòng giữa câu trong `nhom6903.nhom`**: *"…sẽ được xếp\n\nvào nhóm 69,09 vì…"* — dấu trang trang in;
   người đọc diff dễ tưởng sổ tay sửa câu. (Không phải lỗi sổ tay.)
4. **`tax.68029200` / `tax.68029900` ghi `- -` thay vì `- - -`** như các dòng ngang hàng — máy `squash` xoá dấu câu nên không bắt.

## Kiến nghị bổ sung vào tài liệu / luật máy (đề xuất, KHÔNG tự sửa)

1. **`mentions()` không nhận dạng dạng "69,09"** (dấu phẩy thay dấu chấm) — đây là **lần 2** trong lô 021 (6903) sau các
   lô trước; nên chuẩn hoá dấu trước khi so (vd `t.replace(/(\d)[,.](\d)/g,'$1.$2')`).
2. **Kiểm NGUYÊN VĂN (không squash) cho nguồn `tax.*`** — câu trích dòng biểu thuế luôn ngắn và luật 2 bắt buộc
   "giữ nguyên ký tự nguồn"; `squash` hiện cho lọt lệch số gạch (`- -` vs `- - -`).
3. **`soCoTrongTrich()` nên khớp theo RANH GIỚI CHỮ SỐ**, không dùng `includes` — lô 015 đã đề xuất, lô này là bằng
   chứng thứ hai: `dieuKienVao ≤ 300` của 7310 khớp nhầm với chuỗi `"3001"` trong nguồn.
4. **Đề xuất thêm kiểm `dieuKienVao` bắt đầu bằng "Một số…" / "Có thể…"** (mô tả MỘT phần hàng mà bản nháp dễ đặt `=true`)
   — bài học này lô này đã dính 1 lần (`7311 dieuKienVao[2]`) và máy hiện im.

**Việc còn lại của người quản lý:** soát độc lập TOÀN BỘ 6 nhóm (134 mục) + tự soát ngẫu nhiên ≥ 10 % phần còn lại,
quyết định về 4 kiến nghị luật máy trên, rồi mới gộp. PR **để mở, KHÔNG merge**.

---

# 2026-10-23 — SOÁT ĐỘC LẬP lô 021 (PR #402) — người soát: Claude (phiên quản lý, KHÁC người soạn `dev-zcode-mm`)

> Người soạn đã tự soát bản nháp và ghi ở trên rằng **7324 giữ "với điều kiện rằng" thành `dieuKienVao` là có chủ ý**.
> Em **XOÁ mục đó** — lý do ở mục 1 dưới đây; đây là chỗ duy nhất em bác ý rõ ràng của người soạn, nên ghi đầu tiên.

## Số liệu

| | |
|---|---|
| Phạm vi soát | **50 mục** = toàn bộ 5 khối của 6 nhóm (6802: 13 · 6903: 6 · 7310: 14 · 7311: 4 · 7324: 6 · 7325: 7) |
| Kết quả | **giữ 42 · sửa 7 · xoá 1** |
| Tổng mục sau soát | 134 → **133** (bao cáo lô `133/133`, 100 %) |
| `nguonLoai` | 49 mục 5 khối → `NGUOI_DUYET`; `tieuChi6`/`dong8`/`cay` giữ `AI_DA_KIEM` (đúng luật 11) |
| Cổng | `check-so-tay --raw` 133/133 · `so-tay:check` 250 nhóm / 8.111 mục / 0 lỗi · `check-cay --chi-tiet` 6/6 · `npm test` ALL TESTS PASSED |

Hồ sơ: `review/{6802,6903,7310,7311,7324,7325}.json` — mỗi tệp ghi **đủ 50/50 mục đã soi** (kể cả mục `giu`) kèm `lyDo` riêng.

## Tầng máy em viết thêm cho vòng soát (`scripts/audit-lo021.mjs`)

`check-so-tay` chỉ chứng minh câu trích **có thật trong nguồn**, và nó so bằng `squash()` — bỏ HẾT dấu câu.
Script của em làm 3 việc CI chưa làm, chạy trước khi đọc tay:
1. **Nguyên văn từng mảnh** (tách theo `…`) so với đúng khối nguồn khai ở `nguon`, chỉ chuẩn hoá khoảng trắng → **50/50 mục đều khớp tuyệt đối, 0 lỗi đỏ**.
2. **In 240 ký tự nguồn ngay SAU mảnh trích cuối** — đây là chỗ duy nhất lộ ra ngoại lệ bị nuốt. Nó bắt được cả lỗi thật của lô này (mục 4, 5) và cả nhiễu phải bác bỏ (mục "Những gì em soi thấy nhưng KHÔNG sửa").
3. Cảnh báo trích 300–600 ký tự (vùng cắt lặng lẽ) + câu trích mở bằng từ rào.

## 8 lỗi tìm được — máy KHÔNG bắt được

1. **XOÁ — 7324 `dieuKienVao[3]`: câu CHO PHÉP có điều kiện bị đặt thành `= true`.**
   Nguồn: *"Chúng **có thể** được gắn với nắp, tay cầm… **với điều kiện rằng** chúng vẫn còn nguyên tính chất của các mặt hàng bằng sắt hoặc thép."*
   Mục đã bỏ vế "có thể … với điều kiện rằng", thành khẳng định phẳng `van_con_nguyen_tinh_chat… = true`.
   Đúng hình dạng luật `dieu-kien-chi-cho-phep` cấm — nhưng `CAU_CHO_PHEP` (`lib/so-tay.js:166`) không có mẫu
   "có thể … với điều kiện rằng" nên lọt. Thêm nữa khẳng định này **vốn hiển nhiên**: hàng 7324 đã là mặt hàng sắt/thép
   theo `dieuKienVao[0]`, nên mục không thêm thông tin phân loại nào, chỉ thêm nhiễu vào prompt.
2. **SỬA — 6802 `phanBiet[0]`: rơi 2/3 nhánh đích.** Câu trích nêu *"nhóm 68.03, 96.09 và 96.10"* nhưng `neuCo` chỉ `"6803"`.
   Sửa thành `"6803|9609|9610"` (quy ước a|b đã có **61/531** `phanBiet` trong sổ tay). `neuKhong:"6802"` giữ nguyên — mẫu "ở lại nhóm này", 318/480 mục.
3. **SỬA — 7325 `ngoaiTru` (cả 2 `dieuKienVao`): cắt lặng lẽ mất vế nhượng bộ.** Nguồn: *"…các vật đúc chưa hoàn thiện mà đòi hỏi sự gia công tiếp theo **như có đặc tính cần thiết của những sản phẩm như thế nhưng đã hoàn thiện**."*
   Bản nháp dừng ở "…gia công tiếp theo." ⇒ ngoại lệ bị **thu hẹp**: vật đúc chưa hoàn thiện *nhưng đã có đặc tính cần thiết* sẽ không còn bị loại — trái nguồn.
4. **SỬA — 7325 `dieuKienVao[0].ngoaiTru`: lỗi chính tả của người soạn, "đồ dùng cơ khế".** Nguồn là "cơ khí".
   `ngoaiTru` được nạp vào prompt và dùng `phraseHit` — sai một chữ là mất khả năng khớp. *(Người soát tự dính đúng lỗi loại này một lần khi chép câu `ch68.chuong` — đã sinh lại chuỗi từ kệ sách bằng script thay vì gõ tay.)*
5. **SỬA — 7325 `loaiTru[2]`: `dieuKien` làm mất điều kiện, có thể chuyển nhầm cả nhóm.**
   Bản nháp: *"hoa, bộ lá cây giả **và** các mặt hàng thuộc nhóm 83.06 (loại trừ nằm ngay trong danh sách mặt hàng của nhóm)"*.
   Nguồn: *"(trừ các mặt hàng thuộc nhóm 83.06)"* đứng sau "hoa, bộ lá cây giả" ⇒ chính "hoa, bộ lá cây giả" **được bao gồm**, trừ phần thuộc 83.06.
   Chữ "và" làm câu đọc thành danh sách ba thành phần ngang hàng. `gates.js:206` `phraseHit(dieuKien)` rồi hỏi thẳng người khai ⇒
   một tờ khai khai *"nhánh cọt bằng gang đúc mô phỏng cây"* sẽ khớp "hoa, bộ lá cây giả" và bị chuyển sang 83.06 — **trái với phần "bao gồm" của chính câu chú giải**.
   Ngoài ra ngoặc "(loại trừ nằm ngay trong danh sách mặt hàng của nhóm)" là chữ tự viết, không có trong nguồn (luật 7). Sửa thành `"hoa, bộ lá cây giả thuộc nhóm 83.06"`.
6. **SỬA — 7310 `dieuKienVao[1].ngoaiTru`: thêm mã 73.09 không có trong nguồn + SAI CHIỀU với nghĩa trường.**
   Chú giải chỉ viết *"nhóm trước"*, không nêu số — 73.09 là suy diễn (đúng nhưng không được ghi vào sổ tay).
   Quan trọng hơn: `ngoaiTru` của điều kiện ngưỡng số nghĩa là *"hàng thuộc ngoại lệ → điều kiện không áp dụng"*; `gates.js:226` bỏ qua kiểm ngưỡng khi khớp và dòng 230 in ra **"ngoại lệ không giới hạn"**.
   Câu này lại khẳng định trên 300 l **KHÔNG** thuộc 7310 ⇒ đặt vào đây là ngược chiều. Xoá; thông tin "nhóm trước áp dụng cho >300 l" vẫn nằm nguyên văn trong `phamVi.trich`.
7. **SỬA — 6903 `dieuKienVao[0].ngoaiTru`: nối chéo khối nguồn.** `nguon` khai `ch69.chuong` nhưng `ngoaiTru` ghi "nón Seger…" — câu đó ở `nhom6903.nhom`.
   Với `dieuKienVao`, `nguon` **chính là căn cứ pháp lý** runtime dán cạnh fact (`gates.js:135` in `fact … [nguon]`; nhánh ngưỡng số gửi kèm `legal:{nguon,trich}`) ⇒ ngoại lệ gắn nhầm khối là căn cứ sai. Xoá; nội dung đã có đúng nguồn ở `loaiTru[0]`.
8. **SỬA — 6802 `boPhan.trich`: diễn đạt có chữ nằm ngoài câu trích.** `trich` lược bằng `…` đúng nơi có ngoặc ví dụ *"(ví dụ, đá thạch anh, đá lửa, dolomit và steatit)"*, nhưng `quyTac` lại liệt kê nguyên các ví dụ đó.
   Sửa theo hướng an toàn: **ghi trọn câu** (336 ký tự, nguyên văn, sinh bằng `indexOf` trên kệ sách, dưới trần 600 của máy) chứ không sửa `quyTac`.

## Những gì em soi thấy nghi ngờ nhưng KHÔNG sửa (đã cân)

| Nhóm / mục | Biểu hiện | Vì sao giữ |
|---|---|---|
| 6903 `boPhan` | `trich` **439 ký tự**, mở bằng "Tuy nhiên" | Đã đọc tay: câu ghi **TRỌN** cả hai câu, không lược gì; "Tuy nhiên" là chính từ nối câu loại trừ, không phải cắt trích. Vượt mốc 300 của lược đồ, dưới trần 600 của máy |
| 6802 `phamVi` (315), 7310 `phamVi` (413) | vùng cắt lặng lẽ 300–600 | 6802 dừng trước câu **dẫn chiếu**; 7310 dừng đúng cuối đoạn nguồn. Không mất ngoại lệ nào |
| 6903 `phamVi.text` | nguồn viết "chưa được nêu cụ thể hoặc **được** xếp", `text` viết "hoặc **chưa** xếp" | Đọc theo phạm vi phủ định là đúng nghĩa gốc HS (*all refractory **not** specified or included in preceding headings*), **không phải** thêm hiểu biết riêng |
| 6903 `dieuKienVao[1]` | câu kế "Tùy theo mục đích sử dụng cụ thể…" | Chỉ **bổ sung** thuộc tính (dẫn/cách nhiệt, giãn nở, chống mài mòn), không phủ định ⇒ mục không nói quá |
| 6903 `loaiTru[1]` (graphit → 8545) | lấy từ Chú giải **cấp Chương** | Áp cho mọi nhóm trong chương — hợp lệ (tiền lệ 8201→8466, 9607→7117) |
| 6802 / 7324 | bỏ các loại trừ chỉ nêu *"Chương N"* (25, 91, 94) | Đúng luật 3 |
| 7310 `phanBiet[0]`, 7325 `phanBiet[0]` | dễ đảo nhánh | Đã đọc kỹ chiều, **đúng**: có-thì-sang / không-thì-ở-lại |
| 7310 `dieuKienVao[0..2]` | 3 fact dùng chung **một** câu trích | Chấp nhận — một câu, ba sự kiện mô tả hàng thuộc nhóm |
| 7324 `dieuKienVao[0..2]` | 3 fact dùng chung **một** câu trích | Như trên |
| 6903 `loaiTru[0].dieuKien` | "các sản phẩm này" → "sản phẩm này" (số ít) | Sắc thái thuật ngữ, không đổi câu trả lời của cổng. Ghi nhận, **không sửa** để tránh vác nhẹ |

## Kiến nghị luật máy (đề xuất, KHÔNG tự sửa)

1. **Bổ sung mẫu vào `CAU_CHO_PHEP`**: `có thể … với điều kiện rằng` / `với điều kiện là` — đây là lỗi **mục 1** lọt máy.
2. **Kiểm `ngoaiTru` cũng phải nằm trong khối nguồn khai ở `nguon`** — bắt được lỗi **mục 7**. Hiện `ngoaiTru` là prose tự do, máy không hề đọc.
3. **Kiểm `ngoaiTru` của điều kiện ngưỡng số không được MÂU THUẪN CHIỀU** với `op` (bắt lỗi **mục 6**): `ngoaiTru` nói "trên ngưỡng là sang nhóm khác" thì đặt vào đây là sai nghĩa.
4. **`phanBiet`: kiểm ĐỦ mọi mã đích câu trích nêu**, không chỉ kiểm mã đích *có* trong câu — bắt lỗi **mục 2** (lặp lại ở 8460 "82.05 và 84.67", 6116 "43.03 hoặc 43.04", 8708 vòng trước — lần thứ 4 cùng họ).
5. **Vùng mù 300–600 ký tự nên bắt buộc người soát đọc tay** — lô này có 3 trích ở vùng đó; may mắn là cả 3 đều đủ câu.

## Việc còn lại của người quản lý

- Tự soát ngẫu nhiên **≥ 10 %** phần còn lại (`tieuChi6` + `dong8` + `cay`: 84 mục) — mục §4 bullet 2 của `so-tay-giao-ngoai.md`, **em không làm thay** vì đó là việc của người duyệt chứ không phải người soát độc lập.
- Quyết định 5 kiến nghị luật máy ở trên + 4 lỗi kệ sách do người soạn ghi (Section XI nhầm cho ch.68/69; "3001"; ngắt dòng `nhom6903`; `tax.68029200/68029900` thiếu gạch).
- PR **để mở, KHÔNG merge** — em chưa gộp.
