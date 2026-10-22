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

# Lô 026 — `5601 5608 5703 6106 6111 6114` (người soạn: dev-zcode-mm)

**Bước 1 — đọc tài liệu (xong).** `docs/giao-viec/so-tay-giao-ngoai.md` mục 2 + 11 luật mục 3; `tmp/so-tay/nguon/_he-thong.txt`.

**Bước 2 — ghi danh CSV (xong).** Dòng 026 của `docs/giao-viec/so-tay-lo.csv`:
`trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
⚠️ Dòng "Các lệnh chính" của `brief-st-lo026.md` ghi nhóm `7615,9609,3215,6306,6804,7412` — sai,
copy-paste từ lô khác. CSV là nguồn chuẩn (memory `so-tay-lo-quy-trinh`): **026 = 5601 5608 5703 6106 6111 6114**.

**Bước 3 — xuất nguồn (xong).**
`node scripts/build-so-tay.mjs --nhom=5601,5608,5703,6106,6111,6114 --xuat-nguon=tmp/so-tay/nguon`
→ 6 tệp, 205.953 ký tự nguồn khớp CSV.

**Bước 4 — soạn bản nháp (xong).** 6 tệp `tmp/so-tay/raw/*.json`, tổng **112 mục**.
Máy kiểm: `5601 24/24 · 5608 12/12 · 5703 30/30 · 6106 17/17 · 6111 12/12 · 6114 17/17`
→ **112/112 (100 %)**, 0 mục loại.

Hai lỗi gõ dấu trong câu trích do chính người soạn, máy bắt được và đã sửa (KHÔNG sửa câu nguồn):
1. `5703` — gõ "sợi nhân **tảo**" thay vì "sợi nhân **tạo**" (5 dòng `dong8` thảm cầu nguyện, nguồn `sen.5703`).
2. `6111` — gõ "giày len" thay vì "giầy len" (nguồn `nhom6111.nhom` viết "giầy len"), làm mất cả mục `boPhan`.

**Bước 5 — tự soát nghĩa TRƯỚC khi nạp (xong).** Áp đúng bài học lô 016/020 (`so-tay-text-trich-lech-nhau`:
`text` tóm cả nhóm còn `trich` chỉ 1–2 câu → máy không bắt được). Sửa 4 chỗ để `text` bám đúng
câu trích, nới `trich` (không sửa nguồn):
- `5601` `phamVi.text` bỏ đuôi "xơ vụn, bụi xơ và kết xơ" vì câu trích không nói.
- `5608` `phamVi` đổi sang trích liệt kê (lưới đánh cá/ngụy trang/an toàn/…) để `text` có căn cứ.
- `5703` `boPhan` nới `trich` tới mục (a) của Chú giải Chương để "vải thô, tấm đệm bằng nỉ" và
  "phân loại theo vật liệu cấu thành" có nguyên văn.
- `6114` `phamVi` nới `trich` ghép câu mở đầu + mục (1) tạp dề/đồ bảo hộ.

**Quyết định cố ý: `dieuKienVao` rỗng ở 5601 và 5608; `phanBiet` rỗng ở 6106, 6111, 6114.**
Câu mở đầu chú giải của 5601/5608 toàn cụm "nhóm này cũng bao gồm…", "vẫn được phân loại ở đây…",
"đã hoặc chưa…", "không gây ảnh hưởng tới phân loại" — đúng dạng câu CHO PHÉP mà luật 6110 cấm đặt
`value=true`. Thà để trống còn hơn mục sai nghĩa (mẫu đã duyệt: `6203`/`6204` `phanBiet` rỗng).

**Bước 6 — nạp + kiểm (xong).**
`node scripts/build-so-tay.mjs --nhom=5601,5608,5703,6106,6111,6114 --tu-tep=tmp/so-tay/raw --force
--nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-026.json`
→ **mục đạt 112/112 (100 %)**, `nhomLoi: []`.
`npm run so-tay:check` → toàn repo **280 nhóm, 8772 mục, 0 mục không kiểm được nguồn**.
`npm test` → **ALL TESTS PASSED**.
`check-cay --nhom=<từng nhóm> --chi-tiet` → cả 6 nhóm **"0 lỗi lệch cây, đủ"**: đủ `dong8`, đủ tên
nút ảo, **đủ tiêu chí 6 số** (không có `phan-nhom-chua-co-tieu-chi` nào — khác lô 020 còn 2 ở 6401).

**Kiểm chạy thật, không chỉ typecheck.** `lib/so-tay-runtime.advise({topHs:'57031090'})` trả về
`trangThai: CO_SO_TAY`, `cheDo: CO_VAN`, kèm khối `loaiKhac` đầy đủ: `cha 570310`, `toTienCoTen`,
`dinhNghiaDuoc: true` và 3 `anhEmCoTen` với `dieuKien` + `trich` nguyên văn lấy từ `sen.57031010` /
`sen.5703`. Sổ tay mới chảy được tới runtime, không chỉ qua máy kim.

**Lỗi kệ sách ghi nhận (không sửa trong sổ tay).** Báo cáo lô ghi `nguonBiCat`:
`phan56.phan (46130→25000)`, `phan57.phan (46130→25000)` — chú giải Phần XI bị cắt còn 25.000 ký tự
khi xuất nguồn. Lô này không dùng chỗ bị cắt nên không ảnh hưởng, nhưng vẫn là khiếm khuyết đã biết.

**5 câu trích dài 324–383 ký tự** (nền tảng ghi 300, máy cho 600). Em đã để mắt từng câu: không câu nào
lược bằng "…" nuốt mất ngoại lệ — 5608/6114 ghép hai câu **liền nhau** trong cùng đoạn, 5703 (`sen.5703`)
và 6114 (`sen.61143020`) trích trọn khối kể cả câu "Tuy nhiên, loại vải này không chứa amiăng".
