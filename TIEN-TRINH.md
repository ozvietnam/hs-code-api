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
- [x] **B8.** Commit + push + mở PR (**KHÔNG merge**).

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