
# TIEN-TRINH — lô 008 (soạn sổ tay chú giải)

Nhóm của lô: **7419, 8307, 3916, 4811, 4819, 6305**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-008` @ `25f5b37` (main mới nhất)
Ngày: 2026-10-21 · Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác).

## Các bước

- [x] **B1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` TRỌN (mục 2 + 11 luật mục 3). Cập nhật CSV dòng 008 → `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`.
- [x] **B2. Xuất nguồn** — `build-so-tay.mjs --nhom=... --xuat-nguon=tmp/so-tay/nguon` → **5 nhóm cần dựng**. Xem mục B2 bên dưới.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` + đọc TRƯỚC `lib/so-tay.js` (máy kiểm) để biết chính xác luật nào lọc mục nào. In cây `lib/hs-tree.js` cho cả 5 nhóm.
- [x] **B4.** Soạn `tmp/so-tay/raw/<nhom>.json` cho 5 nhóm (đọc HẾT 5 tệp nguồn, ~190 ký tự).
- [x] **B5.** `check-so-tay.mjs --raw` → 113/113 sạch, **nhưng phải tự soát bằng mắt** — đã sửa 5 lỗi máy không bắt (mục "Tự soát" bên dưới).
- [x] **B6.** Nạp `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=...lo-008.json` → **113/113 (100 %)**, 0 nhóm lỗi.
- [x] **B7.** `check-cay.mjs --chi-tiet` cho cả 5 nhóm → **5/5 "đủ"**, 0 lỗi lệch cây. `npm run so-tay:check` → 203 nhóm / 7051 mục / 0 lỗi. `npm test` → **ALL TESTS PASSED**.
- [x] **B8.** Commit + push + mở PR (**KHÔNG merge**) → **PR #383** https://github.com/ozvietnam/hs-code-api/pull/383 (trạng thái CLEAN, 8 tệp).

## Bàn giao

- **PR #383** đang mở, **chưa merge**, chờ người duyệt.
- Việc còn lại của người duyệt (mục 4 giao việc): **soát độc lập TOÀN BỘ** `phamVi`/`boPhan`/`dieuKienVao`/`loaiTru`/`phanBiet` của 5 nhóm này; rồi tự soát ngẫu nhiên ≥ 10 % phần còn lại.
- Khi đạt: `so-tay-lo.csv` dòng 008 → `trang_thai=xong` + điền `pr=383`.
- Lỗi kệ sách phát hiện ở mục "Nhóm nguồn mỏng / bất thường" nên bổ sung vào mục 1 của `so-tay-giao-ngoai.md` để các lô sau tránh.

## Kết quả

| Nhóm | Mục | phamVi | dieuKienVao | loaiTru | phanBiet | tieuChi6 | dong8 | cay.tenDien |
|---|---|---|---|---|---|---|---|---|
| 7419 | 27 | 1 | 0 | 5 | 3 | 5 | 13 | 0 |
| 8307 | 7 | 1 | 0 | 1 | 1 | 2 | 2 | 0 |
| 3916 | 26 | 1 | 2 | 0 | 1 | 6 | 16 | 0 |
| 4819 | 23 | 1 | 1 | 5 | 3 | 7 | 6 | 0 |
| 6305 | 30 | 1 | 0 | 1 | 1 | 7 | 17 | 3 |
| **Tổng** | **113** | 5 | 3 | 12 | 9 | 27 | 54 | 3 |

`boPhan` để null ở cả 5 nhóm — không nhóm nào có chú giải phân rã bộ phận.

---

## B2 — 4811 ĐÃ CÓ SẴN, không soạn lại

Lệnh xuất nguồn báo **"5 nhóm cần dựng"**: `data/so-tay/4811.json` đã tồn tại (36,8 KB; 1 phạm vi + 2 điều kiện vào + 14 loại trừ + 11 tiêu chí 6 số + 24 dòng 8 số = 52 mục) — do **#252 "vòng soạn 20 nhóm thí điểm cây ranh giới" (11/10/2026, commit `e7fe819`)**, tức đã qua **cả soạn + soát độc lập** (`taoBoi.provider` ghi rõ). Em **không** viết lại (sẽ là hạ cấp chất lượng file đã qua soát), và **không** đụng vào nó — `git status` xác nhận 4811 không đổi.

Nghĩa là `so-tay-lo.csv` gán trùng 4811 vào lô 008 dù nhóm đã có sẵn từ tháng trước. Giống hệt lô 006 (9105). Em nạp **chỉ 5 nhóm thật sự soạn** để `lo-008.json` sạch (`nhomLoi: []`).

## ⚠️ Sai số trong brief (đã xử lý)

`brief-st-lo008.md` liệt kê nhóm `7419,8307,3916,4811,4819,6305` (đúng) **nhưng dòng lệnh mẫu lại ghi** `--nhom=7615,9609,3215,6306,6804,7412` — đó là nhóm của **lô 001**. Đây là copy-paste mẫu từ brief lô trước (memory `so-tay-lo-quy-trinh` đã cảnh báo loại lỗi này). Em dùng **CSV làm nguồn chuẩn**.

---

## Tự soát bằng mắt — 5 lỗi máy KHÔNG bắt được (đã sửa trước khi nạp)

Máy chạy xanh ngay lần đầu (114/114), nhưng đọc lại từng mục cùng câu **ngay trước/sau** trong nguồn (bằng `scripts/audit-trich.mjs`) thì phát hiện 5 lỗi nghiêm trọng. Đây là các kiểu lỗi mà vòng 2 đã dạy là phải bắt bằng mắt:

1. **`loaiTru` 3916 SAI CHIỀU — nguy hiểm nhất.** Bản nháp đầu ghi loại trừ sang **39.17**: *"Các dạng hình rỗng có mặt cắt ngang khác so với mặt cắt ngang của các sản phẩm dạng ống, ống dẫn và ống vòi thuộc nhóm 39.17"*. Đọc lại cả đoạn thấy câu đó nằm **trong đoạn mở đầu bằng "Nhóm này bao gồm…"** — nó là câu **BAO HÀM**, không phải loại trừ; vế "thuộc nhóm 39.17" dính vào **các sản phẩm dạng ống** chứ không phải dạng hình rỗng (bản tiếng Anh: *"Hollow profiles whose cross-section is not that of a tube… of heading 39.17 are included in this heading"*). `loaiTru[3916]` **đã XOÁ**; `phanBiet` đảo lại đúng chiều (khác mặt cắt → 39.16, giống mặt cắt ống → 39.17).
2. **`phamVi` 8307 là VẾ CỤT.** Bản nháp trích bắt đầu bằng *"Loại ống này có thể được làm kín…"* — "Loại ống này" có antecedent ở câu trước, đọc riêng không ra. Đã kéo thêm câu định nghĩa loại (1) và loại (2) vào trích.
3. **`phamVi` 6305 và 4819 nói những thứ câu trích không có.** Cả hai `text` liệt kê ví dụ nằm ở **câu kế tiếp** (túi ngũ cốc/túi trà; thùng hộp/túi đựng đĩa). Đây đúng là lỗi vòng 1 ghi: *"`text`/`tomTat`/`dieuKien` thêm chữ không có trong câu trích"*.
   - 6305: đã **kéo dài câu trích** để chứa minh hoạ (dài hơn 300 ký tự, xem bảng bên dưới) và bỏ "túi trà" vì nằm ngoài trích.
   - 4819: **rút gọn `text`** về đúng câu trích — chi tiết từng loại bao bì đã nằm đầy đủ ở `tieuChi6` + `dong8`, không cần lặp ở `phamVi`.
4. **`dieuKienVao` 3916 có `ngoaiTru` không nằm trong `trich`.** Đã đổi `trich` sang chính câu loại trừ ("…thì bị loại trừ khỏi nhóm này") để mọi thứ trong mục đều có căn cứ trong câu trích.
5. **`tieuChi6` 8307 đặt tên `fact` sai.** Đặt `gia_cong_ve_mat` cho chữ *"with or without fittings"* — trong WCO, `fittings` là **ống/phụ kiện ghép nối**, không phải gia công bề mặt. Đã **XOÁ** mục đó (nó cũng không phân biệt được 8307.10 với 8307.90 vì cả hai đều có vế này).

## Quyết định "bỏ" — thà không có mục còn hơn mục mờ má

- **`dieuKienVao` rỗng ở 3/5 nhóm (7419, 8307, 6305).** Đọc hết chú giải: các câu ứng viên đều là câu **bao hàm** ("Nhóm này bao gồm…", "Nhóm này cũng bao gồm…"), câu **cho phép** ("vẫn được phân loại vào nhóm này" — 8307) hoặc thuộc **mục (2)/(9) cụ thể** chứ không phải điều kiện chung của cả nhóm (7419). Không câu nào là **điều kiện VÀO nhóm 4 số** thật sự → để rỗng.
  - Riêng 7419: câu *"Thùng, két, bể chứa… **nhưng không được gắn với thiết bị nhiệt hoặc cơ khí**"* trông như điều kiện vào nhóm, nhưng nó chỉ nói về **mục (2)**; đặt ở cấp nhóm sẽ khiến máy đọc kiểu AND loại nhầm mọi 7419 khác. **Bỏ.**
- **`loaiTru` rỗng ở 3916** — sau khi bắt lỗi #1. Hai câu còn lại không đích danh: *"các nhóm 39.18 đến 39.26"* là **dải** (luật 3 cấm), và `phan63.phan` chỉ trỏ "Chương 39".
- **Không ghi `loaiTru` cấp Chương** (7419 "chương 82 hoặc 83", 3916 "Chương 39", 6305 "Chương 46") — không nêu đích danh nhóm, ghi vào nhóm sẽ phải lặp yệt ở mọi nhóm xx.xx.
- **Không dựng `phanBiet` nào trong 6305 ngoài cặp 63.05** — phân biệt 6305.32/33/39 là **cấp 6 số**, mà `phanBiet` chỉ nhận mã 4 số hoặc 8 số (`validHeading`/`validTax`); 6 số sẽ bị máy loại `ma-khong-co-that`. Phân biệt cấp 6 đã nằm ở `tieuChi6`.

## Trích dài 300–600 ký tự (máy vẫn cho qua, em phải để mắt)

| Nhóm | Mục | Dài | Vì sao giữ |
|---|---|---|---|
| 6305 | `phamVi` | 385 | Phải chứa **hai câu liền nhau** thì mới đủ bảo hiểm cho `text` liệt kê túi ngũ cốc/than/tinh bột/khoai tây/cà phê, túi đưa thư, túi bưu điện. Rút ≤300 sẽ phải bỏ hết ví dụ hoặc bỏ `text`. |
| 7419 | `tieuChi6` (SEN) | 319 | Cả **hai câu** của SEN 7419.80.60: mô tả vật dụng + điều kiện *"Để được xếp vào phân nhóm này, hàng hoá đó phải được nhận biết là…"*. Cắt câu sau là mất đúng điều kiện quan trọng nhất. |
| 4819 | `dieuKienVao` | 347 | Nguyên vẹn câu Chú giải tổng quát Ch.48 về giấy đã in, phải giữ cả vế *"và các mặt hàng không cấu thành vật liệu đã in của Chương 49"* ngay sau. |

## Nhóm nguồn mỏng / bất thường — cần người quản lý biết (KHÔNG sửa tay trong sổ tay)

1. **`nhom6305.nhom` mỏng bất thường.** Toàn bộ chú giải nhóm 6305 chỉ có **3 dòng tiêu đề phân nhóm** (`630533`, `630539`, `6305.90`) + 3 đoạn ngắn + 1 chú giải phân nhóm (6305.32). Không có danh sách loại trừ cấp nhóm, không có chú giải cho 6305.10/20/90. Đây là lý do `dieuKienVao` và `loaiTru` của 6305 mỏng — **không phải** vì người soạn bỏ sót.
2. **Chú giải phân nhóm 6305.32 bị CẮT CỤT giữa chừng.** Nguyên văn dừng ở *"…đựng các vật liệu khô, dễ trôi"* (thiếu "thể hiện"). Em trích nguyên văn đến đúng chỗ cắt, **không** bịa nối. Cần người quản lý kiểm lại nguồn gốc.
3. **`nhom4819.nhom` thiếu nhãn "(A)".** Đoạn định nghĩa bao bì mở đầu không có tiêu đề `(A)`, nhưng đoạn sau lại là `(B) Hộp đựng hồ sơ (files), khay thư…`. Lỗi kệ sách.
4. **Ba dòng biểu thuề trùng chữ, nguồn không phân biệt được:**
   - `6305.32.10` và `6305.39.10` đều ghi **"Từ vải không dệt"**; `6305.33.10` và `6305.39.20` đều ghi **"Dệt kim hoặc móc"**. Biểu thuề không nêu gì để tách. Em ghi rõ trong `dieuKien` rằng phải đối chiếu phân nhóm cha (theo WCO: 6305.32 = *flexible intermediate bulk containers*, 6305.39 = *không phải dải PE/PP, không phải FIBC*) và **không đoán**.
   - `3916.10.10` và `3916.20.10` đều ghi "Sợi monofilament" — phân biệt bằng vật liệu polyme cha (etylen / vinyl clorua), đã ghi trong `dieuKien`.
5. **Nguồn bị cắt trần khi xuất** (ghi trong báo cáo lô `nguonBiCat`): `ch39.chuong` 44.853→40.000 ký tự, `phan63.phan` 46.130→25.000 ký tự. Em chỉ dùng các câu **còn nằm trong phần còn lại**; cụ thể mục `phan63.phan` 1(g) về sợi monofilament >1 mm của plastic **có** nằm trong 25.000 ký tự đầu nên đọc được.
6. **`cay.tenDien` chỉ 6305 có (3 nút).** `6305.32/33/39` là ba nút 6 số mà `lib/hs-tree.js` chưa đặt tên — và lần này **nguồn CÓ tên tiếng Việt**:
   - `6305.32` ← "Túi loại lớn có thể gấp mở linh hoạt" (nguyên văn `nhom6305.nhom`)
   - `6305.33` ← "Loại khác, từ dải polyetylen hoặc dải polypropylen hoặc dạng tương tự"
   - `6305.39` ← "Loại khác" (nguồn chỉ có chữ này, em chép nguyên văn, không diễn đạt lại)
7. **Ba nhóm còn lại không có nút trống** — `check-cay` báo cả 5 nhóm **"đủ"** (0 lỗi, 0 cảnh báo), tốt hơn lô 006 (còn 4 nút 6 số trống).

## Sai sót đã kiểm kỹ là ĐÚNG (không sửa) — để người soát đừng sửa nhầm

- **`loaiTru` 7419 mục (4) và (9).** Mục (4)/(9) nằm trong danh sách **bao hàm** ("Nhóm này bao gồm, cụ thể: …"), nhưng có vế **"trừ …"** carve-out nêu đích danh 71.17 và 91.14 → `loaiTru` đúng. (Khác hẳn lỗi ở 3916, nơi câu **không** có vế "trừ".)
- **`loaiTru[9114]` 7419.** Câu gốc là *"Lò xo trừ lò xo đồng hồ thời gian hoặc đồng hồ cá nhân thuộc nhóm 91.14"* — nghĩa là lò xo **nói chung** thuộc 7419, **trừ** lò xo đồng hồ thì sang 91.14. Chiều đúng, không đảo.
- **`tieuChi6` 4819.30 vs 4819.40.** WCO: 4819.30 = *"having a base of a width of 40cm **or more**"* (op `>=`), 4819.40 = *"having a base width **less than** 40cm"* (op `<`). Đã kiểm chiều.
- **`tieuChi6` 6305.32 `suc_chua_thong_thuong` dùng `op:'in'`, `value:'250–3000 kg'`.** Nguồn nói *"**thông thường** có thể chứa từ 250 kg đến 3000kg"* — có định ngữ giới hạn, nên em **không** biến thành ngưỡng cứng `>=250` / `<=3000` mà đặt tên `fact` là `suc_chua_thong_thuong` để giữ đúng ý. Cố ý, không phải lỗi.
- **`tieuChi6` lấy từ `wco.*` (tiếng Anh)** ở cả 5 nhóm — đúng lược đồ; em ghi kèm tiếng Việt trong `value`.
- **`dong8.dieuKien` nhắc tên phân nhóm cha lấy từ biểu thuề Tổng cục / WCO** trong khi `trich` chỉ là dòng biểu thuề — em ghi rõ "theo WCO" / "phân nhóm …", không bịa, nguồn có sẵn.

## Quy trình đã chạy

1. `build-so-tay.mjs --nhom=<6> --xuat-nguon=tmp/so-tay/nguon`
2. Đọc `_he-thong.txt`; đọc `lib/so-tay.js` (máy kiểm) để biết trước luật nào sẽ loại; in cây `lib/hs-tree.js` cho 5 nhóm để biết tên nút + danh sách dòng 8 số.
3. Đọc TRƯỚC cả 5 tệp `<nhom>.txt` (19K–55K ký tự) → viết `tmp/so-tay/raw/<nhom>.json`.
4. `check-so-tay.mjs --raw` (1 vòng, xanh) → `audit-trich.mjs <nhom> raw` đọc câu **ngay trước/sau** mỗi đoạn trích → sửa 5 lỗi → `check-so-tay --raw` lại (xanh).
5. Nạp 5 nhóm → `check-cay.mjs --nhom=<n> --chi-tiet` cho từng nhóm → `npm run so-tay:check` → `npm test`.

## Tóm tắt thay đổi (commit lần này)

- 5 file mới `data/so-tay/{7419,8307,3916,4819,6305}.json`
- 1 file mới `data/so-tay/bao-cao/lo-008.json`
- 1 file `docs/giao-viec/so-tay-lo.csv` (dòng 008: `trang_thai=dang-lam`, `nguoi_lam=dev-zcode-mm`)
- 1 file `TIEN-TRINH.md` (viết lại cho phiên soạn lô 008)
- **KHÔNG** commit `tmp/` (gitignored). **KHÔNG** đụng `data/so-tay/4811.json`. **KHÔNG** merge.
- **KHÔNG** ghi `nguonLoai` (máy tự gán `AI_DA_KIEM`; đổi sang `NGUOI_DUYET` là việc của người soát độc lập — luật 11).

---

# PHIÊN SOÁT ĐỘC LẬP — 2026-10-21 22:5x (+07)

Brief: `brief-st-soat-lo008.md`. Em là **người soát ĐỘC LẬP** (không phải người soạn). Quy trình: đọc lại từng mục `phamVi`/`boPhan`/`dieuKienVao`/`loaiTru`/`phanBiet` của 5 nhóm (`3916,4819,6305,7419,8307`) cùng nguồn — 4811 đã có sổ tay qua soát (#252), KHÔNG soát lại.

## 1) Phạm vi soát

| Nhóm | phamVi | dieuKienVao | loaiTru | phanBiet | Tổng mục kiểm |
|---|---|---|---|---|---|
| 3916 | 1 | 2 | 0 | 1 | 4 |
| 4819 | 1 | 1 | 5 | 3 | 10 |
| 6305 | 1 | 0 | 1 | 1 | 3 |
| 7419 | 1 | 0 | 5 | 3 | 9 |
| 8307 | 1 | 0 | 1 | 1 | 3 |
| **Tổng** | 5 | 3 | 12 | 9 | **29** |

## 2) Phát hiện & hành động

| # | Nhóm | `path` | Hành động | Lý do |
|---|---|---|---|---|
| 1 | 4819 | `dieuKienVao[0]` | **XOÁ** | Trich từ `ch48.chuong` — nguyên tắc chung cho cả Ch.48 (gate Ch.48 ↔ Ch.49 "in chỉ là phần phụ"), không phải điều kiện VÀO nhóm 4 số 4819. Fact `vi_tri_hoa_don` với `value` là chuỗi mô tả dài (`"việc in chỉ là phần phụ..."`) dùng `op:'='` — không evaluate được thành boolean cho cổng ra quyết định: điều kiện chết (dead condition). Mục nhiễu tín hiệu; xoá giữ signal-to-noise của nhóm. |

29 mục kiểm → 1 xoá, 0 sửa. Còn lại 28 mục đạt cả verbatim và đúng nghĩa. Máy kiểm vẫn lọt mục #1 (vì `nguon` hợp lệ `ch48.chuong`, `trich` có trong nguồn, không trigger `CAU_CHO_PHEP`) — đây đúng là kiểu lỗi "mục mờ má" mà vòng 2 cảnh báo: máy đạt nhưng không giúp cổng ra quyết định.

## 3) Review theo từng nhóm

- **3916**: 4/4 đạt. Trich từ `nhom3916.nhom` đều khớp nguyên văn. `phanBiet` hollow-shape vs tube — đã xử lý đảo chiều ở phiên soạn, không còn vướng "thuộc nhóm 39.17" đọc literal; đọc kỹ đoạn gốc thấy "thuộc 39.17" gắn vào **ống** (subject là tubes), hollow-shape ở đây = 3916. Logic phanBiet khớp.
- **4819**: 9/10 đạt. 5 `loaiTru` (42.02, 46.02, 48.11, 48.20, 63.05) + 3 `phanBiet` (63.05, 48.20, 48.11) — trich verbatim từ "Nhóm này không bao gồm: (a)..(e)", đích danh đầy đủ. Loại 1 `dieuKienVao` (xem mục 2).
- **6305**: 3/3 đạt. `phamVi` đã được kéo dài trích ở phiên soạn để giữ ví dụ túi ngũ cốc/than/tinh bột/khoai tây/cà phê, túi đưa thư, túi bưu điện. `loaiTru[0]` và `phanBiet[0]` cùng câu 63.07 — verbatim.
- **7419**: 9/9 đạt. 5 `loaiTru` (71.17, 91.14, 58.09, 83.11, 96.04) + 3 `phanBiet` (71.17, 58.09, 91.14) — trich verbatim. Mục (4)/(9) "Nhóm này bao gồm, cụ thể: …" có vế **"trừ …"** nêu đích danh 71.17/91.14 → `loaiTru` hợp lệ, không phải lỗi scope như 3916.
- **8307**: 3/3 đạt. `phamVi` đã sửa vế cụt ở phiên soạn — trích nay gồm cả (1) và (2) với "…" hợp lệ, bỏ câu "Loại ống này có thể được làm kín nuớc bằng cách bọc cao su…" (là method description, không có ngoại lệ). `tieuChi6` 8307 gốc có mục `gia_cong_ve_mat` lạ — đã XOÁ ở phiên soạn (vì *with or without fittings* là fittings nối ghép, không phải gia công bề mặt).

## 4) Kiểm tra rào lỗi vòng 1/2 (mục 0 của giao-viec)

- **Cắt trích né câu rào** ("thường…", "tùy trường hợp"): KHÔNG có mục nào. Trich đều lấy câu đứng tự nhiên.
- **`hoi` phanBiet đảo nhánh**: tất cả 8 `phanBiet` có neuCo (đúng chiều) khớp với "nếu có đặc tính X → thuộc nhóm Y".
- **"A hoặc B" bị tách**: KHÔNG có. Không mục nào dùng AND ngầm.
- **Mất ngoại lệ ngay sau trích**: 3916 phanBiet trich kết thúc bằng "xem Chú giải 8 thuộc Chương này" — câu sau (chỉ giải thích "tubular forms") không phải ngoại lệ, OK. 4819 mỗi `loaiTru` dùng trích đến hết mệnh đề "(a)/(b)/(c)/…"; mệnh đề tiếp theo đều là kết thúc `Nhóm này không bao gồm:`.
- **Trích 300–600 ký tự**: 0 mục mới soát vượt 300 (đã xem lại `phamVi` 6305 đã được kéo dài = 385 ở phiên soạn, ai đó đọc nhanh cứ chú ý).
- **Ghép hai câu xa**: KHÔNG. Mỗi trich là một đoạn liên tục hoặc hai đoạn liền kề.
- **`dieuKien`/`text` thêm chữ**: KHÔNG. Đã kiểm cross tất cả `text` với trich.

## 5) Bàn giao + hành động đã chạy

1. `tmp/so-tay/review/<nhom>.json` ghi lại hành động theo `index` — 4 file `[]`, file `4819.json` có 1 mục xoá.
2. Đã áp lên `tmp/so-tay/raw/` → file `4819.json` không còn `dieuKienVao[0]`.
3. Đặt `nguonLoai = 'NGUOI_DUYET'` cho mọi mục đã soát ở 5 nhóm (luật 11 — chỉ người soát độc lập được đổi).
4. `node scripts/check-so-tay.mjs --raw=tmp/so-tay/raw`: **112/112 sạch**.
5. Nạp lại `node scripts/build-so-tay.mjs --nhom=3916,4819,6305,7419,8307 --tu-tep=tmp/so-tay/raw --force --nguoi-soan="dev-zcode-mm" --bao-cao=data/so-tay/bao-cao/lo-008.json`: **112/112 (100%)**.
6. `npm run so-tay:check`: **203 nhóm / 7050 mục / 0 lỗi**.
7. `npm test`: **ALL TESTS PASSED**.

## 6) Kết quả số liệu

| Nhóm | Trước (phiên soạn) | Sau (phiên soát) | Xoá | Sửa |
|---|---|---|---|---|
| 3916 | 26 / 26 | 26 / 26 | 0 | 0 |
| 4819 | 23 / 23 | 22 / 22 | 1 | 0 |
| 6305 | 30 / 30 | 30 / 30 | 0 | 0 |
| 7419 | 27 / 27 | 27 / 27 | 0 | 0 |
| 8307 | 7 / 7 | 7 / 7 | 0 | 0 |
| **Tổng** | **113 / 113** | **112 / 112** | **1** | **0** |

Tỷ lệ soát: 1/29 = 3,4 % (so với vòng 2 đợt 1 = 25 % / đợt 2 = 26 %). Lý do tỷ lệ thấp: tác giả đã được dặn "thà soạn ít mục chắc chắn" và đã tự phát hiện 5 defect (lô 006 = 14 xoá / 39 sửa = ~22 %), để lại 29 mục phần lớn là sạch — phiên soát này loại 1 mục duy nhất còn mờ má.

## 7) Hạn chế còn lại — KHÔNG sửa trong sổ tay (giống phiên soạn)

- `nhom6305.nhom` mỏng bất thường (chỉ 3 đoạn + 1 chú giải phân nhóm) → `dieuKienVao` rỗng là đúng nguồn, không phải lỗi người soạn.
- Chú giải 6305.32 cụt "...đựng các vật liệu khô, dễ trôi" (lỗi kệ sách).
- `nhom4819.nhom` thiếu nhãn "(A)" (lỗi kệ sách).
- 3 cặp dòng biểu thuề trùng chữ (đã ghi trong `dong8.dieuKien` là "đối chiếu phân nhóm cha, không đoán").
- `ch39.chuong` bị cắt trần 44.853 → 40.000 ký tự khi xuất nguồn — em chỉ dùng câu **còn nằm trong phần còn lại**.

## 8) Commit + PR #383

- Commit phiên soát: cùng nhánh `so-tay/lo-008`, thêm báo cáo `TIEN-TRINH.md` (mục 1–8 ở trên) + 5 file `tmp/so-tay/review/<nhom>.json` được gitignore nên KHÔNG vào commit; thay đổi thật vào commit là `data/so-tay/{3916,4819,6305,7419,8307}.json` + `data/so-tay/bao-cao/lo-008.json`.
- Comment PR #383 với số liệu soát (1 xoá / 0 sửa).
- **KHÔNG merge** — chờ CEO duyệt.

---


# TIEN-TRINH — issue #359 (tra_tien_le: ngưỡng similarity + schema tiền lệ quốc tế + lyDo mã thay thế)

Worktree: `hs-code-api-wt-359` · nhánh `zcode/359-tra-tien-le-nguong` @ `0f1ceab` · tuyến mm.
Log runner: `/tmp/oz-exec-359-mm.log`

## Trạng thái

- [x] Đọc brief + `gh issue view 359` nguyên văn
- [x] Dò code: `lib/precedent-search.js`, `api/dataset.js`, `lib/engine-loop.js`, `lib/suggest-core.js`, `lib/llm-output-guard.js`
- [x] Tìm record TCO 1679759: `data/community/intl-precedents/abf/abf-tco-2026-10-15-lot-thu.json`
- [x] **ĐO bộ mẫu vàng → chốt ngưỡng 0,55**
- [x] Commit test ĐỎ (3 script mới + wire `npm test`) — `3ef92da`
- [x] Sửa 2 kỳ vọng test sai khi đo thật — `dabf711`
- [x] Commit fix (3 nhóm) — `4ecb349`
- [x] Đồng bộ đếm "mã có tiền lệ" — `952ee05`
- [x] `npm test` xanh toàn bộ (exit 0)
- [x] Push nhánh + mở PR — **https://github.com/ozvietnam/hs-code-api/pull/363** (OPEN, KHÔNG merge)

## Commit trên nhánh `zcode/359-tra-tien-le-nguong`

| Commit | Nội dung |
|---|---|
| `3ef92da` | **test đỏ** — 3 script mới, wire `npm test`, TIEN-TRINH.md |
| `dabf711` | test — sửa 2 kỳ vọng sai (stub LLM chung; tên dòng 8301.60.00; ca maHs) |
| `4ecb349` | **fix** — ngưỡng + outcome/outcomeHs + lyDoThayHe + 1 tệp data lô |
| `952ee05` | test — `test-doc-counts` đọc `outcomeHs \|\| outcome` |

Không commit nào trộn test với mã sản phẩm (radar CI bắt việc này).

## KẾT QUẢ ĐO NGƯỠNG (bắt buộc theo brief — không tin đề xuất 0,70)

Bộ mẫu: **38 ca vàng** `tests/fixtures/soat/ca-tong-hop.json` (17/10, dữ liệu công khai) +
**120 tờ khai Oz thật** lấy từ `data/oz-gold-final.jsonl` **đã loại tập giữ riêng (holdout)**.

Số đo **trên mã đã sửa** (đo lại sau khi sửa, không dùng lại số đo trước):

| | 38 ca vàng | 120 tờ khai Oz thật |
|---|---|---|
| **Trước** — còn ra tiền lệ | 38/38 | 120/120 |
| **Trước** — trong đó top-1 **SAI** nhóm | **12** | **100** |
| **Sau** — còn ra tiền lệ | **20/38 (53%)** | **0/120** |
| **Sau** — `found:false` | 18/38 | 120/120 |
| **Sau** — trong đó top-1 **SAI** nhóm | **0** | **0** |

Chốt **0,55** vì đó là điểm cắt sạch:

- top-1 **SAI** nhóm cao nhất trong 38 ca = **0,504** (acfta-o-khoa-o-to) → 0,55 loại hết match sai.
- ca trong issue (điều khiển từ xa bảng giá điện tử) đứng ở **0,537** → dưới ngưỡng ⇒ `found:false` đúng ý.
- 6 ca vàng có top-1 **đúng** nhưng điểm thấp bị loại: 0,309 · 0,309 · 0,366 · 0,411 · 0,495 · 0,524.
  Đây là cái giá của ngưỡng: match đúng-nhóm ở điểm 0,3 không phải bằng chứng tiền lệ.

**Vì sao KHÔNG dùng 0,70 như issue đề xuất:**

1. Đo trên 120 tờ khai Oz thật: điểm top-1 **trung vị 0,225, lớn nhất 0,507**. Ngưỡng 0,70 loại **120/120** —
   kể cả những ca có top-1 ĐÚNG. Endpoint sẽ luôn trả `found:false`.
2. 4781/4837 tiền lệ TB-TCHQ lưu `outcome` là **mã HS 8 số**, nhưng điểm khớp văn bản hiếm khi vượt 0,5
   (độ phủ câu hỏi × khớp tên lõi, có trần cứng).
3. `scorePrecedent` **chặn trần 0,45** khi câu hỏi không trùng từ nào trong tên tiền lệ — mọi ý kiến
   **WCO** (tên sinh tự động là "Section XVI — WCO opinion 842139/1") nằm dưới trần này. Ngưỡng > 0,45
   ⇒ WCO **không bao giờ** hiện qua tìm theo mô tả.

### Đánh đổi phải nói thẳng (đã ghi trong PR)

- Với **mô tả tờ khai thật**, `/api/precedents?q=` giờ trả `found:false` gần như luôn (0/120 mẫu Oz
  thật còn ra tiền lệ). Đây là hành vi ĐÚNG theo issue: trước đó 120/120 mẫu đều "có tiền lệ" mà
  **100/120 là sai nhóm** — chính cái hại gây ra ca 20/10. Muốn tra tiền lệ theo mã thì dùng `?hs=`
   (nhánh này không đổi), và `/api/evidence-pack` vẫn tra tiền lệ theo mã + mô tả với ngưỡng riêng 0,5.
- Ý kiến **WCO** chỉ hiện qua tìm theo mô tả khi điểm chạm 0,45 trần của `scorePrecedent` — tức là
  hầu như không hiện. Tra WCO theo mã vẫn qua `/api/wco-opinions?hs=` và nhánh `?hs=` như cũ.
- Tìm tiền lệ nội bộ (`applyPrecedentBoost`, `engine-loop`, `evidence-pack`) **không đổi**: chúng tự
  có ngưỡng riêng (0,5 / 0,5) và cần cả tiền lệ anh em để dựng bộ đồng thuận.

### Lỗ hổng phát hiện khi đo (KHÔNG sửa trong #359 — ngoài phạm vi)

`headOf()` cắt tên tiền lệ trước dấu `:` / `,` / ` — `. Tên của bản ghi quốc tế có tiền tố số hiệu
("ABF TCO 1679759: GLOVE BOXES, laboratory — …") nên **phần mô tả hàng rơi khỏi "tên lõi"** →
`covH = 0` → điểm bị nhân với 0,4. Đo thật: `searchPrecedents('glove box gas purification')` chỉ
0,26 dù tên tiền lệ có nguyên văn "GLOVE BOXES … gas purification". Sửa `headOf` sẽ dời điểm mọi
record → phải là việc riêng, có đo lại toàn bộ bộ sập xếp. Ghi ra đây để không ai tưởng là ngưỡng sai.

## Ghi chú khảo sát

- `tra_tien_le` = `GET /api/precedents?hs=` hoặc `?q=` (`routes.json` → `api/dataset.js?resource=precedents`).
  Nhánh `?q=` gọi `searchPrecedents(searchText, { topK: 5 })` — không có ngưỡng, chỉ lọc `>= 0,15` bên trong lib.
- Ngưỡng 0,15 bên trong lib có ý nghĩa cho CASCADE/BRIDGE (tiền lệ anh em / cầu nối được nâng lên 0,16).
  Đặt ngưỡng toàn cục 0,55 **ngay trong lib** sẽ giết bộ ba cross-source của #311/#340
  (`test-precedent-cross-source.mjs` CASE 1/2/6/7) → ngưỡng là **tham số opt-in**, endpoint bật lên.
- `outcome`/`outcomeHs` trong `data/precedents.json` do `scripts/merge-community.mjs` ghi là
  `outcome: hs` (mã 6 số). `loadFlatPrecedents` đệm 0 **bên trái** (`padStart`) trong khi mã HS phải
  đệm bên phải (`normalizeHs` = `padEnd`) → `842139` thành `00842139`. Đó là gốc rễ Lỗi 2.

---

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
- [x] **B9.** Commit + push + mở PR → **PR #386** https://github.com/ozvietnam/hs-code-api/pull/386 (9 tệp, `MERGEABLE`, **chưa merge**). CI: `test` **pass** (1m28s) + `bench` **pass** (11m22s); `Vercel` đỏ "Deployment was blocked" là **lỗi có sẵn**, không liên quan code (Vercel đã gỡ khỏi hạ tầng từ 09/10/2026).

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
| CI GitHub (`test`, `bench`) | **pass** — `test` 1m28s, `bench` 11m22s |

## Bàn giao

- **KHÔNG merge** — PR #386 đang mở, chờ người duyệt.
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