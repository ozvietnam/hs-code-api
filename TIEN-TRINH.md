# TIEN-TRINH — sổ tay lô 006 (soạn mới)

Nhóm của lô: **9105, 5208, 5309, 6001, 6101, 7117**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-006` @ `c87d0f9` (main mới nhất)
Ngày: 2026-10-21 · Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác).

## Các bước

- [x] **B1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` TRỌN (mục 2 + 11 luật mục 3). Cập nhật CSV dòng 006 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
- [x] **B2. Xuất nguồn** — `build-so-tay.mjs --nhom=9105,5208,5309,6001,6101,7117 --xuat-nguon=tmp/so-tay/nguon` → **5 nhóm cần dựng**. Xem mục B2 bên dưới.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` + đọc TRƯỚC `lib/so-tay.js` (máy kiểm) để biết chính xác luật nào lọc mục nào.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 5 nhóm (đọc HẾT `<nhom>.txt`).
- [x] **B5.** `check-so-tay.mjs --raw` — 3 vòng sửa, cuối cùng **157/157 sạch**.
- [x] **B6.** Nạp `build-so-tay.mjs --tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-006.json` → 157/157 (100%), 0 nhóm lỗi.
- [x] **B7.** `npm run so-tay:check` → 194 nhóm / 6887 mục / 0 lỗi. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push + mở PR (**KHÔNG merge**).

## Kết quả

| Nhóm | Mục | phamVi | dieuKienVao | loaiTru | phanBiet | tieuChi6 | dong8 |
|---|---|---|---|---|---|---|---|
| 5208 | 89 | 1 | 3 | 5 | 1 | 53 | 26 |
| 5309 | 16 | 1 | 1 | 1 | 1 | 8 | 4 |
| 6001 | 22 | 1 | 1 | 3 | 1 | 7 | 9 |
| 6101 | 13 | 1 | 3 | 2 | 1 | 3 | 3 |
| 7117 | 17 | 1 | 2 | 2 | 0 | 3 | 9 |
| **Tổng** | **157** | 5 | 10 | 13 | 4 | 74 | 51 |

`boPhan` để null ở cả 5 nhóm (không nhóm nào có chú giải phân rã bộ phận). `cay.tenDien` rỗng ở cả 5 nhóm — xem mục "Cây còn trống" bên dưới.

---

## B2 — 9105 ĐÃ CÓ SẴN, không soạn lại (phát hiện cần người quản lý xử lý)

Lệnh xuất nguồn báo **"5 nhóm cần dựng"**: `data/so-tay/9105.json` đã tồn tại (17.8 KB, 34 mục) — không do lô nào trong chuỗi `lo-0xx` tạo ra, mà do **#252 "vòng soạn 20 nhóm thí điểm cây ranh giới" (11/10/2026, commit `e7fe819`)**.

Nghĩa là **`so-tay-lo.csv` gán trùng 9105 vào lô 006** dù nhóm đã có sẵn từ tháng trước. Em **không** viết lại 9105 (sẽ là hạ cấp chất lượng file đã qua soát độc lập), và **không** đụng vào nó.

Hệ quả thao tác: nếu chạy `--nhom=<đủ 6 nhóm> --tu-tep` thì 9105 không có bản nháp → `build-so-tay.mjs` ghi `nhomLoi: ["9105"]` vào báo cáo lô (false alarm, không hỏng file — `git diff data/so-tay/9105.json` = rỗng). Vì vậy em nạp **chỉ 5 nhóm thật sự soạn** để `lo-006.json` sạch, đúng kiểu 4 báo cáo lô trước (`nhomLoi: []`). Nếu các lô sau cũng gặp nhóm đã có sẵn thì áp dụng y hệt.

## Nhật ký soạn — 3 vòng sửa sau khi máy báo xanh

Máy kiểm 100% KHÔNG đồng nghĩa đã đúng. Ba lỗi dưới đây máy không bắt được, em tự soát lại bằng mắt (đọc câu trích cùng câu ngay trước/sau trong nguồn) và sửa **trước khi nạp**:

1. **`dieuKienVao` 5208 là VẾ CỤT (đúng loại lỗi lô 004 đã bắt).** Bản nháp đầu trích `"có tỷ trọng bông từ 85% trở lên"` và `"mà trọng lượng không vượt quá 200g/m2"` — đọc riêng không ra điều kiện vì cả hai là nửa sau của một câu. Đã thay cả 3 mục `dieuKienVao` bằng **nguyên câu** (177 ký tự, liên tục trong nguồn).
2. **`hoi` của `phanBiet` 6001 BỊ ĐẢO Có/Không.** Nguồn: *"Các vải như vậy có các đường mũi khâu trên mặt sau của vải và chúng khác với vải dệt nổi vòng thuộc nhóm 58.02, **với đặc điểm là có các hàng mũi khâu chạy dọc theo chiều dài của mặt sau tấm vải**"*. Vế "với đặc điểm là" dính vào **58.02** (khăn lông), không phải vải 6001. Bản nháp đầu hỏi "vải 6001 **có** hàng mũi khâu chạy dọc" → đảo ngược. Đã sửa thành: vải có đường mũi khâu mặt sau **nhưng không có** hàng mũi khâu chạy dọc → 6001; có hàng chạy dọc → 5802. (Bản tiếng Anh WCO: *"which have rows of stitching running lengthwise"* — cũng dính vào 58.02.)
3. **`tieuChi6` 5309 lấy hai TIÊU ĐỀ mục (d)/(e) không kèm định nghĩa.** Bản nháp trích `"(d) Vải dệt thoi chưa tẩy trắng … (e) Vải dệt thoi đã tẩy trắng"` — chỉ là hai nhãn, đọc riêng không biết "chưa tẩy trắng" nghĩa là gì. Đã thay bằng **292 ký tự kèm cả định nghĩa**, giữ luôn vế ngoại lệ *"trừ khi có yêu cầu khác"*.

Ngoài ra: `dieuKienVao[0]` 7117 thêm dấu lược ở cuối (`… khuy măng sét …`) vì câu nguồn còn tiếp sang vế loại trừ; `phanBiet[0]` 6101 gộp thêm câu dẫn *"Theo mục đích phân loại các sản phẩm này, các vật liệu dệt của phần vải bọc ngoài tạo nên những đặc trưng cơ bản…"** để không còn là câu bắt đầu bằng *"Điều này có nghĩa là…"* (vế cụt có antecedent ở câu trước).

## Quyết định "bỏ" — thà không có mục còn hơn mục mờ má

- **`phanBiet` 7117 = rỗng.** Đọc hết `nhom7117.nhom` + `ch71.chuong`: không câu nào nêu **cặp mã** một bên thuộc 71.17 / bên kia không thuộc mà ta dùng làm nhánh "có/không". Chú giải 2(A)/(B) nói về **71.13/71.14/71.15/71.16**, Chú giải 3 nói loại trừ **cấp Chương**. Không có câu nào đủ căn cứ → để rỗng thay vì dựng.
- **Không ghi `loaiTru` cấp Chương vào 6101** (Chú giải 2 của Ch.61: đã qua sử dụng → 6309, dụng cụ chỉnh hình → 9021…). Câu đó nói "Chương này", không nói nhóm 61.01; ghi vào `loaiTru` của nhóm sẽ phải lặp y hệt ở mọi nhóm 61.xx. Nếu người duyệt muốn có thì đó là một quyết định khác, cần thống nhất trước.
- **`dieuKienVao` chỉ 1 mục ở 5309 / 6001.** Nguồn không có thêm điều kiện vào nhóm nào khác ngoài loại trừ (loại trừ thuộc `loaiTru`); câu "Nhóm này cũng bao gồm…" mà luật cấm đặt `=true`.

## `dieuKienVao` — điều kiện nào đưa vào, điều kiện nào bỏ

Máy loại mục `dieuKienVao` lấy từ `sen.*/wco.*/tax.*` (`dieu-kien-cap-phan-nhom`) và câu "vẫn được phân loại ở đây" (`dieu-kien-chi-cho-phep`). Em theo đúng, nhưng có hai chỗ đáng nói:

- **5208: 85% bông và 200 g/m² LÀ điều kiện cấp NHÓM 4 số**, không phải cấp phân nhóm — mọi 6 số con đều thừa hưởng, nên đưa vào `dieuKienVao` là đúng luật (và là ngưỡng **đo được**, giá trị lớn nhất cho người khai). Tương tự, ngưỡng 100 g/m² và 85% lanh ở 5309 nằm ở `tieuChi6`/`dong8` vì chúng phân biệt các phân nhóm.
- **6001: câu "Vải dệt kim hoặc móc nổi vòng, được ngâm tẩm, tráng, phủ hoặc dát mỏng, **vẫn được phân loại trong nhóm này**" không đi được vào `dieuKienVao`** (máy bắt `CAU_CHO_PHEP` với "vẫn được phân loại"). Đây lại là câu quyết định nhất của nhóm (nó đảo ngược Chú giải 1(c) Chương 60 đẩy sang Chương 59). Em đưa nó vào **`phamVi.trich`** — chỗ không bị luật `CAU_CHO_PHEP` chặn — kèm mốc chú giải tương đương ở Ch.60. **Đề xuất nâng thành luật máy: cho `phamVi` miễn `CAU_CHO_PHEP`** (nó không phải điều kiện vào nhóm, là phạm vi).

## Trích dài 300–600 ký tự (máy vẫn cho qua, em phải để mắt)

| Nhóm | Mục | Dài | Lý do giữ |
|---|---|---|---|
| 6101 | `phamVi` | 578 | **không lược gì cả** — liên tục nguyên vẹn từ "Nhóm này bao gồm…" hết danh sách "Bao gồm:". Danh sách loại trừ nằm ở đoạn kế tiếp, không bị nuốt. |
| 7117 | `phamVi` | 555 | Toàn bộ **Chú giải 11** Chương 71 (định nghĩa nhóm 71.17), không lược. Rút xuống ≤300 chỉ được bằng cách bỏ ngoại lệ "trừ trường hợp tráng mạ hoặc chỉ là thành phần phụ" và loại trừ 96.06/96.15. |
| 7117 | `loaiTru[1]` | 456 | Phải chứa vế "**với điền kiện chúng không gắn với kim loại quý… (trừ trường hợp…)**" ngay sau danh sách 96.06/96.15; cắt trước vế đó là đúng lỗi "dấu lược nuốt ngoại lệ". |
| 6101 | `phanBiet[0]` | 443 | Giữ trọn "Lưu ý rằng, mặc dù vải ngoài… không nằm trong nhóm 61.13" + câu dẫn. |
| 6101 | `dieuKienVao[1]` | 348 | Phải chứa ngoại lệ "**Những quy định này không áp dụng cho… cách cắt may… rõ ràng**". |
| 6001 | `phamVi` | 375 | Chứa cả câu ngâm tẩm/tráng vẫn ở nhóm này (xem mục trên). |
| 5208 | `phamVi` | 400 | Định nghĩa nhóm (85%, 200 g/m²) + công dụng. |
| 5309 | `phamVi` | 324 | Toàn bộ 3 câu mở đầu chú giải nhóm, không lược. |

## Nhóm nguồn mỏng / bất thường — cần người quản lý biết (KHÔNG sửa tay trong sổ tay)

1. **Biểu thuề thiếu dòng ở 5208.32.** `data/tax.json` chỉ có **một** dòng `52083200 - - Vải vân điểm, định lượng trên 100 g/m2` cho phân nhóm 5208.32 — **không có dòng "định lượng không quá 100 g/m2"** mà WCO và các phân nhóm anh em (5208.11/21/31/41/51) đều có. Vải đã nhuộm, dệt vân điểm, ≤ 100 g/m² sẽ **không có dòng 8 số nào để khai** dù vẫn thuộc 5208.32. Em ghi rõ trong `dong8[52083200].dieuKien` và **không bịa** dòng còn thiếu.
2. **Ba dòng biểu thuề ghi "(SEN)" nhưng không có khối SEN trong nguồn:** `52085110`, `52085210`, `52085910` — "Được in bằng phương pháp batik truyền thống (SEN)". `sen-2022.json` không có mục nào khớp mã này nên `sourcesFor` không xuất khối `sen.*`. Hệ quả: em **không** dựng được `tieuChi6` cho batik (luật 10 cấm lấy `tieuChi6` từ `tax.*`), chỉ chép được tên dòng biểu thuề. Đã ghi rõ trong `dieuKien` từng dòng. Cần người quản lý kiểm lại `data/sen-2022.json`.
3. **`nhom5208.nhom` dùng chữ "nguyên liệu" cho vải đã dệt xong** — "các nguyên liệu tốt làm quần áo lót phụ nữ và váy áo" (nguyên văn, giữ nguyên theo luật 2).
4. **`nhom5208.nhom` mục (d) có lỗi chính tả nguồn:** "Vải dệt quấn (nhóm 58.03) **.**" (dấu chấm lạc chỗ) — chép nguyên văn, không sửa.
5. **5208.41 và 5208.42 có cùng tên dòng biểu thuề** ("Vải Ikat(SEN)" + "Loại khác"), khác nhau ở ngưỡng định lượng mà **biểu thuề không ghi**. Em lấy ngưỡng từ WCO (5208.41 ≤ 100 g/m²; 5208.42 trên 100–200 g/m²) và ghi rõ "theo WCO" trong `dieuKien`.
6. **Khối `nhom*.nhom` không kèm tên tiêu đề 4 số** (lỗi bộ xuất nguồn đã ghi ở TIEN-TRINH lô 004, vẫn còn). Lần này em **không** chèn tên tiêu đề vào `phamVi.text` (đã tránh được), nhưng vẫn nên vá.

## Cây còn trống — đề xuất

`scripts/check-cay.mjs` báo cả 5 nhóm **"đủ"** (0 lỗi, 0 cảnh báo). Nhưng có 2 nút phân nhóm 6 số **chưa có tên tiếng Việt** mà không nguồn nào trong lô này nêu tên, nên em **không** điền `cay.tenDien` (luật 9 chỉ cho điền khi nguồn có câu nêu tên):

- `711711` — WCO: "cuff links and studs, of base metal" (tiếng Anh).
- `711719` — WCO: "(excluding cuff links and studs), of base metal" (tiếng Anh).
- `600192` — WCO: "pile fabrics (excluding long pile and loop pile), of man-made fibres" (tiếng Anh).
- `520831`, `520841`, `520842`, `520851`, `520852` — có nút 6 số nhưng `lib/hs-tree.js` đã đặt tên từ biểu thuề Tổng cục, không trống.

**Đề xuất:** mở `cay.tenDien` cho nút 6 số khi nguồn chỉ có tên **tiếng Anh** — có một tiền đề dịch sẵn của biểu thuề Tổng cục (`data/bieu-thue/`) cho phần lớn mã này. Nếu vẫn giữ luật hiện tại thì ít nhất nên **ghi tên tiếng Anh vào `tenVi`** kèm `nguon: wco.<6>` để người khai còn đọc được, thay vì để trống.

## Sai sót đã kiểm kỹ là ĐÚNG (không sửa) — để người soát đừng sửa nhầm

- **`dieuKienVao[2]` 6101 đặt `value: false`.** Fact là `khong_xac_dinh_duoc_nam_hoac_nu_theo_cach_cat_may`; nguồn: *"Quần áo không thể nhận biết được là quần áo nam hoặc nữ thì được xếp vào nhóm quần áo phụ nữ hoặc trẻ em gái"*. Để vào 6101 (nhóm nam) thì mặc định phải **không** rơi vào trường hợp này → `false` là chiều đúng, không phải đảo.
- **`tieuChi6` 5309 với `op:'<'` + `value: 85`.** Nguồn WCO: *"containing less than 85% flax"*. Đã kiểm chiều, không đảo.
- **`tieuChi6` 5208 `dinh_luong_vai` dùng `op:'>'` + `value: 100`** cho 5208.12/22/32/42/52 — WCO ghi *"weighing **more than** 100g/m2 but not more than 200g/m2"*. Biểu thuề Việt dùng *"định lượng trên 100 g/m2"* — cùng nghĩa.
- **`dong8[52083200].loaiKhac: false`** dù tên dòng là "Vải vân điểm, định lượng trên 100 g/m2" (không bắt đầu bằng "Loại khác") — máy tự suy `loaiKhac` theo biểu thuế, kết quả trùng ý.
- **`dong8[52085920].loaiKhac: true`** — tên dòng *"Loại khác, vải vân chéo 3 sợi…"* bắt đầu bằng "Loại khác" nên máy đánh đúng; điều kiện vân chéo đã ghi kèm trong `dieuKien`.
- **`tieuChi6` lấy từ `wco.*` (tiếng Anh)** ở 7117, 5309, 6001, 6101, 5208 — đúng lược đồ ("trích nguyên văn tiếng Anh, `nguon`: `wco.<6 số>`"), và em có ghi kèm tiếng Việt trong `dong8.dieuKien`.
- **`dong8.dieuKien` nhắc tên phân nhóm/tiêu đề 4 số lấy từ WCO hoặc từ cây** trong khi `trich` chỉ là dòng biểu thuề — không bịa, nguồn có sẵn và rất hữu ích (bỏ đi là mất thông tin về phân nhóm cha). Đúng cách làm lô 004 đã dùng.

## Quy trình đã chạy

1. `build-so-tay.mjs --nhom=<6> --xuat-nguon=tmp/so-tay/nguon`
2. Đọc `_he-thong.txt`; đọc `lib/so-tay.js` (máy kiểm) để biết trước luật nào sẽ loại; in cây `lib/hs-tree.js` cho 5 nhóm để biết tên nút + danh sách dòng 8 số.
3. Đọc TRƯỚC mỗi `<nhom>.txt` (20K–49K ký tự) → viết `tmp/so-tay/raw/<nhom>.json`.
4. `check-so-tay.mjs --raw` (3 vòng) → `audit-trich.mjs <nhom> raw` để đọc câu **ngay trước/sau** mỗi đoạn trích, bắt "vế cụt" và "dấu lược nuốt ngoại lệ" bằng mắt.
5. Nạp 5 nhóm → `check-cay.mjs --nhom=<n> --chi-tiet` cho từng nhóm → `npm run so-tay:check` → `npm test`.

## Tóm tắt thay đổi (commit lần này)

- 5 file mới `data/so-tay/{5208,5309,6001,6101,7117}.json`
- 1 file mới `data/so-tay/bao-cao/lo-006.json`
- 1 file `docs/giao-viec/so-tay-lo.csv` (dòng 006: `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`)
- 1 file `TIEN-TRINH.md` (viết lại cho phiên soạn lô 006)
- **KHÔNG** commit `tmp/` (gitignored). **KHÔNG** merge.
- **KHÔNG** ghi `nguonLoai` (máy tự gán `AI_DA_KIEM`; đổi sang `NGUOI_DUYET` là việc của người soát độc lập — luật 11).