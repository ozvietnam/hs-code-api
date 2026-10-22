# TIEN-TRINH — lô 011 (soạn sổ tay chú giải)

Nhóm của lô: **6302, 8201, 8309, 9028, 9607** (8311 ĐÃ CÓ SẴN — không soạn lại, không nạp lại)
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-011` @ `2ab88d7` (main mới nhất) · Ngày: 2026-10-22
Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác, mục 4 giao việc).

## Sai lệch brief ↔ CSV (đã xử lý, không im lặng)

Brief dòng 4 ghi nhóm `6302,8201,8309,8311,9028,9607` — **khớp** CSV.
Brief dòng 6 kèm **lệnh mẫu** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**
(`docs/giao-viec/so-tay-lo.csv` dòng `001`), copy-paste nhầm (memory `so-tay-lo-quy-trinh`; lô 010 gặp y hệt).
Đã bỏ lệnh mẫu, chốt nhóm theo CSV:

```
$ awk -F, '$1=="011"' docs/giao-viec/so-tay-lo.csv
011,6302 8201 8309 8311 9028 9607,6,112809,dang-lam,dev-zcode-mm,,oz:6 oz:6 oz:6 oz:6 oz:6 oz:6,96.1
```

## Các bước

- [x] **B1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` **TRỌN** (mục 0 đợt 1: 14 kiểu lỗi; mục 0/vòng 2:
  bắt buộc soát độc lập; mục 1 bài học bước 1; mục 2 gói việc; mục 3 **11 luật**; mục 4 người duyệt).
  Cập nhật CSV dòng 011 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
- [x] **B2.** Xuất nguồn — `build-so-tay.mjs --nhom=6302,8201,8309,8311,9028,9607 --xuat-nguon=tmp/so-tay/nguon`
  → script in **"sổ tay: 5 nhóm cần dựng"** — nó **tự bỏ 8311** (đã có `data/so-tay/8311.json`, dựng 11/10 #252).
  Xuất ra 5 tệp nguồn + `_he-thong.txt`. Xem mục B2 bên dưới.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` trọn, rồi đọc **HẾT cả 5 tệp nguồn** (~130 ký tự).
  Đọc **mã nguồn `lib/so-tay.js`** (444 dòng) + `scripts/build-so-tay.mjs` **trước khi soạn** để biết chính xác
  luật máy nào lọc mục nào (tiết kiệm vòng lặp). In cây `lib/hs-tree.js` cho cả 5 nhóm.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 5 nhóm.
- [x] **B5.** `check-so-tay.mjs --raw` → 3 vòng (mục "Máy kiểm"). Thêm **tự soát nguyên văn** bằng máy
  (xem mục "Tự soát"). **Phải tự soát** — bắt được 1 lỗi nguyên văn mà máy `check-so-tay` KHÔNG bắt.
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-011.json`
  → **124/124 (100 %)**, 0 nhóm lỗi, 5 nhóm. **Không nạp 8311** (xem B2).
- [x] **B7.** `check-cay.mjs --chi-tiet` → **5 nhóm đủ**, 0 lỗi lệch cây.
  `npm run so-tay:check` → **222 nhóm / 7422 mục / 0 lỗi**. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push + mở PR (**KHÔNG merge**).

## B2 — 8311 ĐÃ CÓ SẴN: không soạn lại VÀ không nạp lại

`data/so-tay/8311.json` tồn tại từ 11/10 (commit `e7fe819`, #252), 23/23 mục, `taoBoi.provider` =
"Claude (phiên soạn + soát độc lập, 11/10/2026)".
Nạp lại bằng `--force` sẽ ghi `taoBoi.provider = dev-zcode-mm` — **gán nhầm tác giả** (giống lỗi lô 010 với 9406).
⇒ Chỉ truyền 5 nhóm mới vào `--nhom`; `git status` xác nhận `data/so-tay/8311.json` **không đổi một byte nào**.

## Kết quả

| Nhóm | Mục | phamVi | dieuKienVao | loaiTru | phanBiet | tieuChi6 | dong8 | boPhan | cay.tenDien |
|---|---|---|---|---|---|---|---|---|---|
| 6302 | 53 | 1 | 0 | 4 | 2 | 21 | 20 | 0 | 5 |
| 8201 | 25 | 1 | 1 | 6 | 2 | 7 | 7 | 1 | 0 |
| 8309 | 13 | 1 | 0 | 0 | 0 | 2 | 10 | 0 | 0 |
| 9028 | 24 | 1 | 0 | 3 | 3 | 8 | 8 | 1 | 0 |
| 9607 | 9 | 1 | 0 | 1 | 1 | 3 | 3 | 0 | 0 |
| **Tổng** | **124** | 5 | 1 | 15 | 8 | 41 | 48 | 2 | 5 |

`boPhan` có ở 2 nhóm (8201, 9028) — đều là câu nguyên văn trong chú giải nhóm.
`cay.tenDien` 5 mục: 630222 / 630232 / 630251 / 630259 / 630299 — 5 phân nhóm 6 số mà cây chưa có tên
(`lib/hs-tree.js` không dựng được tên cho chúng), điền từ tên WCO kèm trích.

## Máy kiểm

```
$ node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw
6302: đạt 53/53    8201: đạt 25/25    8309: đạt 13/13
9028: đạt 24/24    9607: đạt 9/9
sổ tay (bản nháp): 5 nhóm, 124 mục, 0 mục không kiểm được nguồn

$ node scripts/build-so-tay.mjs --nhom=6302,8201,8309,9028,9607 --tu-tep=tmp/so-tay/raw --force \
    --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-011.json
mục đạt 124/124 (100 %) — nghiệm thu bước 1 cần ≥ 95 %; nhóm lỗi: 0

$ node scripts/check-cay.mjs --nhom=6302,8201,8309,9028,9607 --chi-tiet
máy kiểm cây: 5 nhóm, 0 lỗi lệch cây, 5 nhóm đủ

$ npm run so-tay:check   →  222 nhóm, 7422 mục, 0 mục không kiểm được nguồn
$ npm test               →  ALL TESTS PASSED
```

## Tự soát

Máy kiểm chỉ chứng minh **câu trích có thật trong nguồn**, không chứng minh nó **nói đúng điều mục khẳng định**.
Câu trích được `squash` (bỏ TOÀN BỘ dấu câu, hạ chữ thường) trước khi so ⇒ **ngoặc kép thẳng/cong, lỗi chính tả,
thiếu dấu tiếng Việt đều lọt qua máy**. Nên tôi viết thêm máy kiểm riêng
`tmp/so-tay/raw/_verbatim.mjs`: tách `trich` theo dấu lược rồi **so khớp NGUYÊN VĂN** (không squash) với tệp nguồn,
đồng thời báo độ dài `trich` > 300 và `text`/`quyTac`/`tomTat` > 220 (runtime clip, `lib/so-tay-gates.js`).

**Lần 1 — máy tự soát bắt (3 lỗi), trong đó có lỗi mà `check-so-tay` KHÔNG bắt:**

| # | lỗi | sửa |
|---|---|---|
| 1 | 6302 `loaiTru[3]` + `phanBiet[1]` — tôi chép 3 dòng của Chú giải 2 Chương 63 nối bằng `\n`, nhưng nguồn có **dòng trống** giữa các mục (`\n\n`) | cắt còn đúng 1 dòng liền: `(b) Quần áo đã qua sử dụng hoặc các mặt hàng đã qua sử dụng khác thuộc nhóm 63.09` |

⇒ **Lỗi #1 là loại mà `check-so-tay` không thể bắt** (squash bỏ khoảng trắng nên vẫn "khớp").
Cùng loại với bài học lô 010 (chép tay 2 chữ tiếng Việt có dấu: "bọt cạa"/"bọt cạo", "gá lắm"/"gá lắp").

**Lần 2 — `check-so-tay` bắt (1 lỗi):** `9607.phanBiet` dùng mã 6 số `960711`/`960719` →
`ma-khong-co-that` (luật: mã trong `phanBiet` phải là **nhóm 4 số có trong `chu-giai-heading.json`** hoặc
**dòng 8 số có trong biểu thuế**). Sửa: `96071100` / `96071900`.

**Lần 3 — tự đọc lại từng mục theo 14 kiểu lỗi mục 0 giao việc, bắt 4 lỗi KHÔNG ai bắt được:**

| # | lỗi | sửa |
|---|---|---|
| 3 | **6302 `phamVi` lược nuốt ngoại lệ.** Bản đầu lược từ mục (1) sang mục (3) — mà câu ngay sau mục (2) là "Tuy nhiên, cũng nên lưu ý rằng… (nhóm 63.04)" (loại trừ ren/nhung/gấm) | Kéo **nguyên vẹn** câu "Tuy nhiên…" vào trích → `trich` dài **401 ký tự** (xem "Vì sao 6302 vượt 300") |
| 4 | **9028 `phamVi.text` nói "kể cả bộ phận và phụ kiện" nhưng trích không có câu đó** — tôi đã gộp ý ở 2 chỗ khác nhau thành một kết luận (đúng kiểu lỗi bài học bước 1) | nối thêm vào trích: "… vẫn thuộc nhóm này … các bộ phận và phụ kiện của những công tơ thuộc nhóm này cũng được phân loại vào nhóm này." |
| 5 | **8309 `dong8` 83099089/99 gán `nguon = wco.830990`** — mà 2 dòng này thuộc nhánh 8309908, không phải cả phân nhóm 830990 | đổi `nguon`/`trich` sang đúng dòng biểu thuế (`83099089 - - - Loại khác`) |
| 6 | **`dong8[].dieuKien` ở 6302 ghi "khăn trải giường từ bông…" nhưng câu trích (dòng biểu thuế) chỉ ghi "Từ bông"** — tự thêm hiểu biết riêng, đúng luật mục 3.7 | đánh dấu rõ phần lấy từ tên WCO theo **mẫu 8311 đã duyệt**: `(tên WCO 630221)` |

**Lần 4 — các kiểu lỗi đã rà, không dính:**

| kiểu lỗi | kết quả |
|---|---|
| Cắt trích để né câu rào | 6 dấu lược `…` trong lô, tự kê từng cái: lược **danh sách ví dụ** (6302 mục (1)(2), 8201 mục (1)), lược **phần mô tả cấu tạo** (9607 giữa mục (1) và (2)), lược **phần "dù chúng có hay không…"** (9028). Không cái nào nuốt ngoại lệ — cái "dù chúng có hay không" là câu **cho phép**, không phải ngoại lệ. |
| `dieuKienVao` từ câu CHO PHÉP | Chỉ 1 mục (8201), lấy từ "chủ yếu sử dụng trong nông nghiệp làm vườn hoặc lâm nghiệp" — không dính `CAU_CHO_PHEP`; phần "mặc dầu… có thể" không biến thành điều kiện. 4 nhóm khác **để trống** (xem "Vì sao `dieuKienVao` gần như trống"). |
| `dieuKienVao` là điều kiện phân nhóm / "A hoặc B" | 4 nhóm không có mục nào. Với nhóm có mục, "nông nghiệp làm vườn HOẶC lâm nghiệp" nằm trong **một** tên fact, không tách thành 2 điều kiện. |
| `loaiTru` "thường thuộc/tùy trường hợp" | Rà 15 mục: không mục nào dính. **2 câu có "thường" nhưng xử lý khác nhau** — xem mục "2 câu có định ngữ giới hạn". |
| `loaiTru` đích không đích danh (Chương N / ví dụ) | **BỎ 4 câu**: 8201 (d) "…được đẩy hoặc kéo bằng tay (Chương 84)"; 9607 Chú giải 1 (a)(b)(f)(g)(h)(ij)(k)(l)(m) — chỉ `Chương N` + ví dụ trong ngoặc; 8309 chú giải Chương 83 (lò xo, xích… "Chương 73 đến 76 và từ 78 đến 81"). |
| Mất ngoại lệ ngay sau câu trích | Đọc từng câu kế tiếp sau mọi trích: lỗi #3 là trường hợp duy nhất phát sinh, đã sửa. |
| `hoi` của `phanBiet` nhắc mã / bị đảo | 8 mục: không `hoi` nào có mã phân nhóm hay "WCO". Chiều `neuCo`/`neuKhong` đối chiếu từng câu — ví dụ 8201: câu nguồn "…khác xa với các loại kéo thuộc nhóm 82.13 VÌ CHÚNG KHÔNG CÓ các vòng xỏ ngón tay vào" ⇒ **có vòng xỏ → 8213, không → 8201** (đúng chiều). |
| Nhánh "không" chỉ suy từ cấu trúc anh em | 8 `phanBiet`: nhánh `không` luôn là **chính nhóm 9028/8201/6302** (rơi về phía an toàn) hoặc một nhóm được nêu đích danh. **Không mục nào** dùng dòng "Loại khác" làm đích. |
| Nhiều mục cùng một câu hỏi | 6302: 2 câu hỏi khác (cắt vuông/hình chữ nhật ↔ đã qua sử dụng). 9028: 3 câu hỏi khác (bơm ↔ tốc độ lưu lượng ↔ tổng lượng điện). 8201: 2 (vòng xỏ ngón tay ↔ y tế). |
| `text`/`dieuKien`/`tomTat` thêm chữ không có trong câu trích | Sửa lỗi #4, #6. Còn lại: mọi `dieuKien` chỉ diễn đạt lại đúng dòng biểu thuế, phần lấy từ `wco` đã ghi rõ `(tên WCO <mã>)`. |
| Dòng 8 số trùng chữ mà nguồn không phân biệt được | **8309**: 4 dòng — xem mục "83099081/91 và 83099089/99 trùng chữ". Ghi rõ "nguồn không phân biệt được; đối chiếu biểu thuế", **không đoán**, và **không** gán `tieuChi` cho 4 dòng đó. |
| Nguồn tự mâu thuẫn | 2 nơi — xem "2 nguồn tự mâu thuẫn ở tầng điều kiện". Cả hai đều dẫn tới **để trống `dieuKienVao`**. |
| `cay` soạn tay | Không soạn. `cay.tenDien` chỉ 5 mục của 6302, đều là phân nhóm 6 số **thật sự chưa có tên** (không phải `suyRa`), lấy từ `wco.*`. |

## Vì sao `dieuKienVao` gần như trống (1/124)

Giao việc mục 0: `dieuKienVao` là các sự kiện **mô tả hàng thuộc nhóm**, không phải điều kiện cần, và cổng
**không được** loại nhóm chỉ vì thiếu một `dieuKienVao`. Để trống an toàn hơn bịa — nhất là sau bài học lô 010
(`dieuKienVao` 3407 lấy nhầm điều kiện của dòng 8 số; máy không bắt được).

- **8201** — có đúng 1 điều kiện ở **tầm nhóm 4 số**: "dụng cụ cầm tay chủ yếu sử dụng trong nông nghiệp…".
  Kèm `ngoaiTru` cho câu "Nhóm này cũng bao gồm các bộ phận bằng kim loại cơ bản…" (bộ phận không "chủ yếu sử dụng").
- **6302** — Chú giải 1 Chương 63: "Phân chương I chỉ áp dụng cho các sản phẩm may sẵn đã hoàn thiện" là ứng viên rõ ràng nhất,
  **nhưng mâu thuẫn với chú giải nhóm** (mảnh vải chỉ cắt dọc, không may) ⇒ **bỏ**.
- **8309** — ứng viên "bằng kim loại cơ bản" bị **mục (9)** phủ định (khóa cài túi gồm dây thép + dải nhựa/giấy) ⇒ **bỏ**.
- **9028** — ứng viên "một thiết bị chuyển động theo tốc độ tỷ lệ thuận…" bị **công tơ tĩnh** (mục II(B)) phủ định ⇒ **bỏ**.
- **9607** — ứng viên "có thể làm bằng toàn bộ hoặc một phần kim loại quý…" là câu **cho phép** (`_he-thong` dòng 28) ⇒ **bỏ**.

## 2 nguồn tự mâu thuẫn ở tầng điều kiện (đề nghị bổ sung mục 1)

1. **6302**: Chú giải 1 Chương 63 "chỉ áp dụng cho các sản phẩm may sẵn đã hoàn thiện" ⟷ chú giải nhóm 6302
   "còn bao gồm các mảnh vải, bằng cách cắt dọc đơn giản theo đường định sẵn… không có sợi chỉ ngang" (không may).
   ⇒ Không có điều kiện vào nhóm nào đúng cho **mọi** thành viên ⇒ `dieuKienVao = []`.
2. **8309**: chú giải nhóm mở đầu "một tập hợp các sản phẩm bằng kim loại cơ bản" ⟷ mục (9)
   "Khóa cài để đóng kín túi… bao gồm một hoặc hai sợi dây thép lồng giữa hai dải nhựa hoặc hai dải giấy".
   ⇒ `dieuKienVao = []`.

## 8309: gần như trống vì nguồn không có mã đích

8309 có **0 loaiTru, 0 phanBiet, 0 dieuKienVao** — đây là **hệ quả của nguồn**, không phải bỏ sót:

- Chú giải nhóm chỉ loại trừ "những nút cơ học phần lớn làm bằng nhựa, sứ..." — **không nêu mã nhóm nào** ⇒
  không được `loaiTru` (luật mục 3.3: chỉ ghi khi nêu **đích danh**).
- Chú giải Chương 83 và Chú giải Phần XV có loại trừ **Phần/Chương** ("lò xo, xích… Chương 73 đến 76"), không đích danh nhóm 83.09.
- Danh sách mục (1)–(10) là **ví dụ liệt kê**, không phải câu phân định 8309.10 (nắp hình vương miện) với 8309.90.
  Muốn tách thì phải suy từ tên WCO — mà `wco.830910` ghi "Stoppers; corks, of base metal", **không** phân biệt với
  "830990 Stoppers; caps and lids, of base metal" ⇒ **không đủ căn cứ**, không ghi.

⇒ Còn 13 mục: 1 `phamVi` + 2 `tieuChi6` + 10 `dong8`.

## 83099081/91 và 83099089/99 trùng chữ (lỗi kệ sách biểu thuế)

`data/tax.json` có **4 dòng trùng chữ hoàn toàn**:
`83099081 - - - Nút chai; nút xoáy` ≡ `83099091 - - - Nút chai; nút xoáy` và
`83099089 - - - Loại khác` ≡ `83099099 - - - Loại khác`.
Có vẻ **thiếu dòng tiêu đề quốc gia 8309908 và 8309909** trong biểu thuế (cây `lib/hs-tree.js` gom 4 lá này
thẳng vào phân nhóm 830990).
Xử lý: `dieuKien` ghi rõ "dòng biểu thuế … có chữ giống hệt nhau, nguồn không phân biệt được; đối chiếu biểu thuế",
**không gán `tieuChi`** cho 4 dòng (không có căn cứ để đảo chiều), không đoán.

## 2 câu có định ngữ giới hạn — giữ hay bỏ

1. **6302 → 6307**: "các sản phẩm này **thường** được làm bằng các vật liệu thô dày, **không được xem là phù hợp** với miêu tả
   `Khăn dùng cho nhà bếp` **được loại ra khỏi nhóm này** (nhóm 63.07)" — "thường" bọc **vật liệu**, còn **loại trừ thì dứt khoát**
   ⇒ **giữ**, và `dieuKien` giữ nguyên "thường" theo luật mục 0.
2. **6302 → 6304**: "…các sản phẩm này **thường được phân loại trong nhóm 63.04**" — chính vế đích có định ngữ giới hạn,
   **và 6304 nằm trong chính nhóm 6302** ⇒ **BỎ** (không phải loại trừ ra khỏi nhóm). Máy `check-so-tay` **không** bắt được
   (`HEDGE_LOAI_TRU` chỉ bắt "thường nằm|thuộc|được xếp", không bắt "thường được phân loại").
   **Câu này vẫn nằm trong `phamVi.trich` của 6302** (kéo vào để không nuốt ngoại lệ).

## Vì sao 6302 vượt trần 300 ký tự (một câu trích duy nhất trong lô)

`phamVi.trich` của 6302 dài **401 ký tự** (máy cho qua, trần cứng là 600 — mục 0 giao việc: "trích 300–600 ký tự vẫn qua,
người soát cần để mắt"). Lý do: mục (2) **khăn trải bàn** không thể trích mà không kèm câu ngoại lệ ngay sau nó —
"Tuy nhiên, cũng nên lưu ý rằng… (nhóm 63.04)" dài 269 ký tự và **câu đó không được lược** (lược là nuốt ngoại lệ).
Ba cách, đã chọn cách 3:

| cách | độ dài | hậu quả |
|---|---|---|
| 1. chỉ trích mục (3)+(4) | 220 | ✓ vừa 300 nhưng **thiếu 2/4 thành phần** — đúng lỗi lô 010 ("phamVi thiếu thành phần") |
| 2. trích mục (1)+(3)+(4), lược qua mục (2) | 243 | ✗ **nuốt câu "Tuy nhiên…"** — vi phạm luật dấu lược |
| **3. trích đủ (1)(2)(3)(4) + nguyên văn câu ngoại lệ** | **401** | ✓ đủ thành phần, không nuốt gì; vượt trần 300 nhưng dưới 600 |

Phạm vi khăn trải giường / khăn trải bàn còn được phủ thêm bởi `tieuChi6` (630210, 630221, 630222, 630229, 630231,
630232, 630239, 630240, 630251, 630253, 630259) và `dong8` tương ứng — người đọc sổ tay không mất thông tin.

## Mục `dieuKien` có ghi điều câu trích không nói

Đã rà toàn bộ 48 `dieuKien` của `dong8` + 5 `phamVi.text` + 2 `boPhan`:
**không mục nào** khẳng định điều ngoài câu trích. Ba chỗ tôi **cố tình không** ghi:

- `63025110` — biểu thuế chỉ ghi "Được in bằng phương pháp batik truyền thống (SEN)"; **không** ghi thêm "từ bông"
  (chỉ có trong tên WCO 630251, nên tôi ghi "khăn trải bàn từ bông (tên WCO 630251)" — có nhãn nguồn rõ).
- `83099092` — không thêm "dùng cho thùng kim loại" vào ngoài chữ biểu thuế.
- `90289010` — "Vỏ hoặc thân của công tơ nước": không ghi thêm công dụng/chất liệu nào.

Nguồn `sen.*` **không có** cho lô này, kể cả mục `63025110` mang nhãn `(SEN)` trong biểu thuế
⇒ theo luật mục 3.6 ("có SEN thì ưu tiên điều kiện từ SEN") không có gì để ưu tiên; lấy từ dòng biểu thuế.

## Bàn giao

- **PR #391** đang mở, **KHÔNG merge**: https://github.com/ozvietnam/hs-code-api/pull/391
  CI: `test` ✅ (2m19s) · `bench` ✅ (10m47s) · "Vercel: Deployment was blocked" ❌ là **đỏ có sẵn**
  (memory `vercel-check-blocked-la-pre-existing` — Vercel đã gỡ khỏi deploy từ 09/10/2026).
- Việc còn lại của người duyệt (mục 4 giao việc): **soát độc lập TOÀN BỘ** `phamVi` / `boPhan` / `dieuKienVao` /
  `loaiTru` / `phanBiet` — tức **31 mục** (5 phạm vi + 2 bộ phận + 1 điều kiện + 15 loại trừ + 8 phân biệt);
  cộng 41 `tieuChi6` + 48 `dong8` + 5 `tenDien` nếu muốn soi thêm. Đặc biệt nên soi:
  - **8309** (13 mục, không có loại trừ/phân biệt nào) — xem "8309: gần như trống vì nguồn không có mã đích";
  - **`phamVi.trich` 401 ký tự của 6302** — đây là **quyết định cân đối** của người soạn, cần người đọc xác nhận;
  - **4 dòng trùng chữ của 8309** — xác nhận đã ghi "đối chiếu biểu thuế" là đúng thay vì đoán.
- Sau đó tự soát ngẫu nhiên ≥ 10 % phần còn lại.
- Khi đạt: `so-tay-lo.csv` dòng 011 → `trang_thai=xong` + điền `pr=<số>`.
- Nhớ: lỗi kệ sách ở mục "83099081/91… trùng chữ", "2 nguồn tự mâu thuẫn" nên bổ sung vào **mục 1** của
  `docs/giao-viec/so-tay-giao-ngoai.md` để các lô sau tránh.

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

# TIEN-TRINH — lô 011, PHIÊN SOÁT ĐỘC LẬP (22/10/2026)

Nhánh `so-tay/lo-011`, PR **#391**. Người soát: phiên Claude **độc lập**, không phải người soạn
(`dev-zcode-mm`). Commit soát: **`cfa4a73`** (đã push, **KHÔNG merge**).

## Đã làm

- [x] **S1.** Đọc lại **TOÀN BỘ 124 mục** của 5 nhóm (6302, 8201, 8309, 9028, 9607) cùng
  `tmp/so-tay/nguon/<nhom>.txt` — không chỉ 31 mục `phamVi/boPhan/dieuKienVao/loaiTru/phanBiet`.
  Đọc thêm `lib/so-tay.js` (luật máy), `lib/so-tay-runtime.js` (runtime đọc `loaiTru`),
  `scripts/audit-trich.mjs` (in câu trước/sau mỗi trích) và đối chiếu `docs/giao-viec/so-tay-giao-ngoai.md`.
- [x] **S2.** Chạy `tmp/so-tay/raw/_verbatim.mjs` (so **NGUYÊN VĂN**, không squash) — 0 mục lệch,
  1 cảnh báo độ dài (401). Chạy `audit-trich.mjs` cho cả 5 nhóm để soi từng đoạn lược.
- [x] **S3.** Ghi `review/{6302,8201,8309,9028,9607}.json` — mỗi tệp ghi đủ mục đã soi, lý do từng
  quyết định, và `canhBaoKhongSuaTrongAudit` cho những chỗ cố ý không sửa.
- [x] **S4.** Áp: `scripts/apply-review-lo011.mjs` (`TARGET=raw APPLY=1`) → `check-so-tay --raw` 124/124
  → `build-so-tay --tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=lo-011.json`
  → `TARGET=data APPLY=1` đổi `nguonLoai` **30 mục** sang `NGUOI_DUYET`.
- [x] **S5.** Kiểm chạy lại: `so-tay:check` 222 nhóm / 7422 mục / 0 lỗi · `check-cay` 5 nhóm đủ ·
  `npm test` **ALL TESTS PASSED** · in lại `sangNhom` + đếm `nguonLoai` (không trùng mục).
- [x] **S6.** Commit + push + cập nhật thân PR #391. **KHÔNG merge.**

## Kết quả: soát 124 → sửa 3, xoá 0, giữ 121

**Không mục nào phải xoá** — 124/124 câu trích nguyên văn. Bản nháp tốt hơn vòng 2 (xoá 325/sửa 95)
và ngang lô 010 (sửa 7/104); nhóm 8309 sạch tuyệt đối (13/13 giữ).

| Nhóm | Mục | Sửa | Xoá | Đổi `nguonLoai` |
|---|---|---|---|---|
| 6302 | 53 | 1 (`phanBiet[1]`) | 0 | 7 |
| 8201 | 25 | 2 (`phanBiet[0]`, `tieuChi6[4]`) | 0 | 11 |
| 8309 | 13 | 0 | 0 | 1 |
| 9028 | 24 | 2 (`loaiTru[2]`, `phanBiet[0]`) | 0 | 8 |
| 9607 | 9 | 0 | 0 | 3 |
| **Tổng** | **124** | **3** | **0** | **30** |

### Ba lỗi nặng (máy không bắt được)

1. **6302 `phanBiet[1]` — "đã qua sử dụng → 6309" nói hơn nguồn.** Câu trích chỉ có Chú giải 2(b) Chương 63
   nhưng mục biến nó thành *quy tắc nhị phân*. Chú giải 3 ngay dưới, **cùng khối nguồn**, nói 6309 chỉ chứa
   hàng thoả **cả hai** điều kiện (còn mặc được + đóng gói cỡ lớng/kiện/bao). Đã kéo cả hai điều kiện
   vào `hoi` và `trich`. Đây là biến thể của lỗi "mất điều kiện ngay sau câu trích" — lần này điều kiện
   nằm ở **chú giải kế tiếp** chứ không phải câu liền.
2. **8201 `phanBiet[0]` — nhánh "Có" suy ngược từ câu đối chiểu + trích mồ côi.** Trích câu *"Những loại
   dụng cụ này khác xa với các loại kéo thuộc nhóm 82.13 vì chúng không có các vòng xỏ ngón tay vào"*;
   chủ thể nằm câu trước, và *"có vòng xỏ → 8213"* chỉ suy ra từ phần đối chiểu. Đã đổi sang câu loại trừ
   tường minh ngay trong chú giải nhóm. Kèm sửa `tieuChi6[820150]`: nối chủ thể bằng `…` (mục trích mồ côi).
3. **9028 `loaiTru[2]` + `phanBiet[0]` — trích mồ côi và mất phạm vi.** Trích bắt đầu bằng *"trừ các bơm
   chất lỏng …"*; chủ ngữ *"Công tơ đo chất lỏng sản xuất hoặc cung cấp"* nằm ở tiêu đề mục (B) ngay trước,
   và nguồn chỉ nêu loại trừ này cho phần **công tơ chất lỏng** chứ không nói cho công tơ khí.

### Máy bắt lỗi ngay trong bản sửa của người soát (bài học cho lô sau)

- Chép **trọn dòng nguồn** 9028 kèm dấu `…` **có sẵn trong nguồn** → `check-so-tay` loại 2 mục
  `trich-khong-co-trong-nguon`. Phải lược **trước** dấu `…` của nguồn (cùng họ với
  `so-tay-nguon-co-dau-cham-ellipsis-that`).
- Thử nối 2 khối `wco.*` cho 9607 → máy loại: **một mục chỉ được trích từ một khối nguồn**. Đã hoàn nguyên.
- Rút `trich` 6302 về ≤300 bằng cách bỏ dấu `…` giữa hai câu liền dòng có dòng trống ở giữa → verbatim
  checker báo lệch. Phải giữ `…`.

### Những chỗ cố ý KHÔNG sửa (xin người quản lý quyết)

1. **`phanBiet` trùng cặp với `loaiTru`** (6302: 2, 9028: 2). Cùng câu nguồn, cùng chiều, không sai — nhưng
   quét 90 nhóm sổ tay đã gộp thì **0/480 phanBiet trùng cặp với loaiTru**. Đề xuất luật máy hoặc quy ước.
2. **8201 thiếu loại trừ mục (d)**: nguồn chỉ nêu *"Chương 84"*, không nêu nhóm đích → không ghi `loaiTru`
   được (đúng luật 3). Thực tế *trục làm vườn, máy cắt cỏ đẩy-kéo* rất dễ bị khai nhầm vào 8201.
3. **6302 thiếu loại trừ 5601** ("các sản phẩm mềm xơ") — không tự chèn vì đó là mở rộng phạm vi soát.
4. **8309**: dấu `…` của chính nguồn làm cụt câu loại trừ *"không bao gồm những nút cơ học phần lớn làm
   bằng nhựa, sứ…"* → thêm một đầu mục kệ sách.
5. **9607 `phanBiet[0]`**: nhánh "Có" có căn cứ ở `tieuChi6[960711]` nhưng không nằm trong cùng câu trích,
   và không sửa được vì 960711/960719 là hai khối `wco.*` riêng. Nếu muốn sửa thì phải đổi luật "một mục chỉ
   trích từ một khối nguồn".
6. **Xác nhận cho `phamVi.trich` 401 ký tự của 6302** (PR từng xin xác nhận): **giữ nguyên** — đoạn lược
   không có ngoại lệ nào áp vào chính mệnh đề mà `text` khẳng định, ngoại lệ 63.04 đã kéo nguyên văn vào trích.
   Sau khi sửa, `6302.phanBiet[1].trich` dài 329 ký tự — cùng lý do (kéo ngoại lệ, không nuốt).

### Kiểm chéo kiến thức từ 3 trợ soát chạy song song

Em chạy 3 agent audit độc lập (mỗi agent 2–3 nhóm) rồi **tự kiểm lại từng nhận định** trước khi đưa vào
review. Kết quả: phần lớn nhận định của họ là **over-reach theo quy ước sẵn có** (đòi bỏ `neuKhong` = chính
nhóm trong khi 318/480 `phanBiet` sẵn có trong sổ tay dùng đúng mẫu đó; đòi `tieuChi: null` cho dòng trần
trong khi 275 dòng `dong8` đã gộp dùng mẫu "Loại khác: phần còn lại…"; đòi bỏ loại trừ cấp Chương trong
khi chính lô này có 3 mục như vậy và lô 007/009 đã duyệt). Giữ lại 3 ý đúng: **2 câu trích ở 9607/8201**,
**câu trích mồ côi ở 9028**, và **thiếu điều kiện ở 6302 `phanBiet[1]`**.

## Việc còn lại của người quản lý

1. Đọc `review/*.json` (mỗi tệp có `canhBaoKhongSuaTrongAudit`) và quyết 5 mục "cố ý không sửa" ở trên.
2. Tự soát ngẫu nhiên ≥ 10 % phần còn lại (mục 4 giao việc).
3. Cân nhắc đưa 2 luật máy mới phát hiện: (a) `phanBiet` không lặp cặp với `loaiTru`; (b) `phanBiet` mà
   câu trích chỉ nêu MỘT vế của cặp cấp 6 số → bắt nhắc bổ sung khối nguồn kia (9607).
4. Bổ sung kệ sách mới vào **mục 1** `docs/giao-viec/so-tay-giao-ngoai.md`: 8309 mất nửa câu loại trừ do
   `…` của nguồn; 8201 mục (d) chỉ nêu "Chương 84" nên không dùng được.
5. Khi đạt: `so-tay-lo.csv` dòng 011 → `trang_thai=xong` + `pr=391`, rồi merge.
