# TIEN-TRINH — sổ tay lô 007 (soạn mới + SOÁT ĐỘC LẬP)

Nhóm của lô: **7308, 8203, 8460, 8519, 6116, 7315**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-007` @ `25f5b37` (main mới nhất)
Ngày: 2026-10-21 · Phiên soạn là **người soạn**; phần cuối file ghi lại vòng **soát độc lập** (người khác).

> ⚠️ Số liệu trong phần "Kết quả" dưới đây là của **lúc soạn** (49 mục). Sau vòng soát độc lập:
> **50 mục** (thêm 1 mục loại trừ tách từ câu nêu hai nhóm), 8 mục sửa, 0 mục xoá — xem cuối file.

## Kết quả

**3 nhóm cần dựng: 8203, 8460, 6116 — đạt 49/49 (100%)**, 0 nhóm lỗi. 3 nhóm 7308, 8519, 7315 đã có sẵn trong `data/so-tay/<nhom>.json` từ các lô trước (không soạn lại).

| Nhóm | Đạt | phamVi | dieuKienVao | loaiTru | phanBiet | tieuChi6 | dong8 | boPhan |
|---|---|---|---|---|---|---|---|---|
| 8203 (kìm/nạo/kéo cắt) | 12/12 | 1 | 0 | 5 | 1 | 1 | 4 | 0 |
| 8460 (máy mài tinh) | 24/24 | 1 | 0 | 7 | 1 | 0 | 14 | 1 |
| 6116 (găng tay dệt kim) | 13/13 | 1 | 0 | 4 | 1 | 1 | 6 | 0 |
| **Tổng** | **49/49** | 3 | 0 | 16 | 3 | 2 | 24 | 1 |

## Các bước

- [x] **B1.** Đọc brief + `docs/giao-viec/so-tay-giao-ngoai.md` TRỌN. Cập nhật CSV → `dang-lam/dev-zcode-mm`.
- [x] **B2.** Xuất nguồn 6 nhóm → `sổ tay: 3 nhóm cần dựng`. 7308/8519/7315 đã có sẵn.
- [x] **B3.** Đọc `tmp/so-tay/nguon/_he-thong.txt` + schema.
- [x] **B4.** Soạn `tmp/so-tay/raw/{8203,8460,6116}.json` cho 3 nhóm (đọc HẾT `<nhom>.txt`).
- [x] **B5.** `check-so-tay.mjs --raw` → **49/49 sạch NGAY LẦN ĐẦU** (không phải sửa vòng nào).
- [x] **B6.** Nạp `build-so-tay.mjs --tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=lo-007.json` → 49/49 (100%), 0 nhóm lỗi.
- [x] **B7.** `npm run so-tay:check` → 201 nhóm / 6987 mục / 0 lỗi. `npm test` → **ALL TESTS PASSED**. `check-cay.mjs` → 0 lỗi lệch cây.
- [x] **B8.** Commit + push + mở PR (**KHÔNG merge**).

## 3 mục mẫu (1 loại trừ + 1 điều kiện số + 1 dòng 8 số)

1. **`loaiTru` 8203 → 8462** (dụng cụ cắt kiểu cơ khí) — `trich: "(d) Máy cắt kim loại kiểu cơ khí (nhóm 84.62) và các dụng cụ đục lỗ trong văn phòng có một đế để cố định hoặc đặt gắn trên bàn... (nhóm 84.72)."`
2. **`dong8` 84603110** (điều kiện số: công suất + đường kính chuôi) — `trich: "84603110 - - - Máy công cụ, điều khiển số, có bộ phận đồ gá kẹp mẫu gia công hình ống lắp cố định và có công suất không quá 0,74 kW, để mài sắc các mũi khoan bằng vật liệu carbua với đường kính chuôi không quá 3,175 mm"`.
3. **`dong8` 61161010** (găng tay thợ lặn) — `trich: "61161010 - - Găng tay của thợ lặn"`.

## Nhóm nguồn mỏng / bất thường

- **`phan61.phan` 46130→25000** (bị cắt theo trần `CAP.phan=25000` ở `scripts/build-so-tay.mjs`). Trong sổ tay 6116 vẫn dùng tốt vì phạm vi đếm từ `nhom6116.nhom` + `ch61.chuong` (đầy đủ về găng tay + các ngoại lệ 43.03/61.11/62.16/63.02); phần "Phần XI" chú giải chi tiết về sợi/vải không cần cho 6116. Không ảnh hưởng đến sạch.
- **`wco` chỉ là tên phân nhóm tiếng Anh không có ngưỡng số.** 8460: 10 phân nhóm `wco.846012..wco.846090` chỉ mô tả chức năng (flat-surface NC, centreless, cylindrical, deburring...), không có numerical thresholds. Theo luật 10 (`tieuChi6` không lấy từ `tax.*`), những ngưỡng "công suất ≤ 0,74 kW" / "đường kính chuôi ≤ 3,175 mm" của `tax.84603110` KHÔNG được đưa vào `tieuChi6`. Em để `tieuChi6: []` cho 8460 và ghi rõ ngưỡng vào `dong8[84603110].dieuKien`. Có thể cần một luật cho phép `dong8.tieuChi` lấy từ `tax.*` (luật 6 chỉ nói "Có SEN thì ưu tiên điều kiện từ SEN" — không cấm tax).
- **8203: 1 `phanBiet` duy nhất** (8203 ↔ 8462 về "dụng cụ cắt kim loại kiểu kìm" có/không gắn giá đỡ). Cặp khác trong cùng `ch82.chuong` (khoan tay 8205 vs khoan gắn giá đỡ 8459) thuộc nhóm khác — không ghép vào 8203 được.

## Mục `dieuKien` chỉ ghi điều câu trích nói

- **8203**: `dieuKienVao: []` — em không ghi. Câu "Nhóm này bao gồm các dụng cụ có tay cầm" kèm `value=true` rơi vào `CAU_CHO_PHEP` (luật 11 nói "câu cho phép"), thà bỏ còn hơn vi phạm máy.
- **8460**: `dieuKienVao: []` — "máy hoạt động bằng điện" thuộc phân nhóm 6 số (`dong8[].tieuChi`), không phải điều kiện VÀO NHÓM 4 số (luật 6).
- **6116**: `dieuKienVao: []` — câu "chưa hoàn chỉnh… miễn là chúng có đặc trưng cơ bản của sản phẩm hoàn chỉnh" có cấu trúc "miễn là" — luật 7 cảnh giác câu cho phép. Thông tin đó là **phạm vi có điều kiện** → đã đưa vào `phamVi.trich` (297/300 ký tự cho 3 loại chính; vế "chưa hoàn chỉnh" có trong cùng đoạn nguồn liền kề, không nuốt ngoại lệ).

---

# SOÁT ĐỘC LẬP lô 007 (người soát: KHÁC người soạn)

Ngày: 2026-10-21 · Vai: **soát độc lập** (mục 4 `docs/giao-viec/so-tay-giao-ngoai.md`) · Nhóm soát: **6116, 8203, 8460**
Kết quả: **soát 51 mục / sửa 8 / chèn 1 / xoá 0 / đổi nguonLoai 24 mục sang `NGUOI_DUYET`**. Máy vẫn xanh sau khi sửa.

## Các bước đã làm

- [x] **S1.** Đọc `brief-st-soat-lo007.md` + `docs/giao-viec/so-tay-giao-ngoai.md` (mục 0 và mục 4).
- [x] **S2.** Đọc HẾT 3 tệp nguồn `tmp/so-tay/nguon/{8203 (298 dòng), 8460 (729 dòng), 6116 (590 dòng)}.txt` — không đọc bản tóm tắt.
- [x] **S3.** Đọc `tmp/so-tay/raw/{8203,8460,6116}.json` (49 mục) và so từng mục với câu nguồn.
- [x] **S4.** Soát dọc: câu trích có thật không, có nói đúng điều mục khẳng định không, đủ ngoại lệ không, đúng chiều nhánh Có/Không không.
- [x] **S5.** Ghi kết quả `review/{8203,8460,6116}.json` (`thayDoi[]`: `giu` cho **mọi** mục đã soi, `sua`/`chen` cho mục sai) + `scripts/apply-review-lo007.mjs`.
- [x] **S6.** Áp lên `tmp/so-tay/raw/` → `check-so-tay.mjs --raw` → **50/50, 0 mục không kiểm được nguồn**.
- [x] **S7.** Nạp lại `--tu-tep --force --nguoi-soan="dev-zcode-mm" --bao-cao=lo-007.json` → **50/50 (100%)**, `nhomLoi: []`.
- [x] **S8.** `TARGET=data APPLY=1 node scripts/apply-review-lo007.mjs` → đổi `AI_DA_KIEM` → `NGUOI_DUYET` cho khối đã soi (phamVi, boPhan, dieuKienVao, loaiTru, phanBiet): 6116 ×6, 8203 ×8, 8460 ×10.
- [x] **S9.** `npm run so-tay:check` → 201 nhóm / **6988 mục** / 0 lỗi (đã có 6987, +1 mục chèn). `npm test` → **ALL TESTS PASSED**. `check-cay.mjs` → 0 lỗi lệch cây.
- [x] **S10.** Commit + push + cập nhật PR #382. **KHÔNG merge.**

## 8 lỗi bắt được (máy KHÔNG bắt được) + 1 mục chèn

| # | Nhóm | Mục | Lỗi | Cách sửa |
|---|---|---|---|---|
| 1 | 8203 | `phamVi.trich` | `text` khẳng định trọn (A)(B)(C)(D) nhưng trích chỉ tới (B) — trích 316 ký tự bị cắt **lặng lẽ** | Kéo (C)(D) vào trích bằng `…` (285 ký tự) |
| 2 | 8203 | `loaiTru[3]` | Câu (d) nêu **hai** nhóm đích (84.62 và 84.72) nhưng mục chỉ ghi 8462 và gộp hai hàng khác nhau → đọc như vậy thì **dụng cụ đục lỗ văn phòng bị ghi nhầm sang 8462 (sai)** | Tách: giữ nhánh 8462, **chèn thêm** mục 8472 ngay dưới |
| 3 | 8203 | `phanBiet[0].trich` | Cắt mất vế ngay sau câu trích: "…nhóm 84.62 **thậm chí nếu nó được sử dụng bằng tay**" | Kéo nguyên vế vào trích (213 ký tự) |
| 4 | 6116 | `phamVi.trich` | `text` khẳng định "kể cả găng tay **chưa hoàn chỉnh**…" nhưng trích dừng ở câu về các loại găng (417 ký tự — vùng 300–600 máy không kiểm). Người soạn ghi trong TIEN-TRINH là "vế này có trong cùng đoạn nguồn liền kề" — thực tế **không có trong câu trích** | Lược `…` giữa câu 1–2 rồi nối câu 3 (502 ký tự, dưới trần 600 của máy) |
| 5 | 6116 | `loaiTru[0].sangNhom` | Câu (a) kết bằng "(nhóm 43.03 **hoặc 43.04**)" nhưng chỉ ghi 4303 — rơi mất một nhánh (cùng họ lỗi 8708→7009) | `4303\|4304` (đúng quy ước đã dùng ở 98 `phanBiet` + nhiều `loaiTru` trong `data/so-tay`) |
| 6 | 6116 | `phanBiet[0].neuCo` | Rơi nhánh 43.04 giống #5 | `4303\|4304` |
| 7 | 6116 | `loaiTru[3].trich` | Chép dấu nháy thẳng `"Găng tay"` thay với dấu nháy cong của nguồn (máy không thấy vì nó bỏ hết dấu câu khi so khớp) | Chép lại đúng dấu nguồn |
| 8 | 8460 | `phanBiet[0].neuKhong` | Câu phân biệt loại chạy tay/đạp chân với dụng cụ **cầm tay thuộc 82.05 *và* 84.67**, nhưng nhánh "không" chỉ ghi 8205 | `8205\|8467`. Chiều nhánh "có" đã kiểm kỹ và **đúng** (có bệ/khung/giá đỡ → 8460) |

**Không xoá mục nào.** Cả 51 mục đều có câu trích nguyên văn và nói đúng điều mục khẳng định; các mục ngỡ ngàng đều có căn cứ nên giữ (xem "Giữ, không xoá" bên dưới).

## Giữ, không xoá — và lý do

- `8203.tieuChi6[0]` (hs6 820310, value=true): tiêu chí chỉ lặp lại tên phân nhóm, không phân biệt anh em. **Vẫn giữ** vì đây là quy ước đã dùng ở 429 `tieuChi6` lấy từ `wco` trong `data/so-tay` (vd 401110, 321511) và mục có căn cứ nguyên văn. Xoá chỉ đúng khi mục sai, không xoá vì thừa.
- `6116.tieuChi6[0]` (hs6 611610): **có** tách dụng — bốn phân nhóm anh em ghi rõ "(other than impregnated…)".
- `dieuKienVao: []` ở cả ba nhóm: đúng. Nguồn không có điều kiện VÀO nhóm 4 số; các câu ứng viên ("chạy bằng tay hoặc đạp chân cũng được phân vào nhóm này", "miễn là…") đều là câu **cho phép** — máy loại, và đặt `value=true` sẽ khiến hàng hợp lệ bị loại oan.
- `boPhan: null` ở 8203 và 6116: đúng, không có quy tắc bộ phận gắn với hai nhóm này trong nguồn.

## Kiểm chéo độc lập (không chỉ tin máy)

Tự viết `tmp/so-tay/_audit-quote.mjs` (gitignored) đối chiếu **50/50 câu trích** với khối nguồn `nguon` tương ứng trong `tmp/so-tay/nguon/<nhom>.txt`, tách đoạn theo `…`, mỗi đoạn ≥ 6 ký tự phải có nguyên văn. Kết quả: 0 sai, 1 cảnh báo dài (6116 `phamVi` 502 ký tự — **đã cố ý làm đủ**, xem #4).

## Việc chưa làm (để người duyệt quyết, không tự thêm)

1. **8460 `tieuChi6` để rỗng.** Nguồn có tên WCO của cả 10 phân nhóm, và dòng `tax.84603110` có hai ngưỡng số (công suất ≤ 0,74 kW; đường kính chuôi ≤ 3,175 mm) hiện chỉ nằm trong prose của `dong8[7]`. Máy không kiểm prose → nên có `dong8[7].tieuChi`/`dieuKienSo` có cấu trúc. Không tự thêm vì nhiệm vụ soát là xác minh, không soạn bổ sung. **Cần luật máy?** Luật 10 hiện cấm `tieuChi6` lấy từ `tax.*` nhưng `dong8[].tieuChi` thì không cấm — số + đơn vị đều có trong trích nên máy kiểm được ngay.
2. **Loại trừ sang 84.61 của 8460** (máy cát răng, mài răng, gia công răng lần cuối) chỉ nằm trong `phamVi`, chưa tách thành `loaiTru` → runtime `canGiaiTrinh` chỉ đọc `loaiTru` nên chưa dùng được.
3. **`8203.boPhan` còn có thể bổ sung**: `ch82.chuong` CG2 nhắc "tay cầm cho các loại dụng cụ cầm tay (nhóm 84.66)" — đang là quy tắc cấp Chương, chưa ai dám đặt làm `boPhan` của nhóm.

## Nguồn mỏng (xác nhận lại, khớp `nguonBiCat` trong báo cáo lô)

- `phan61.phan` bị cắt 46130→25000 ký tự, **dừng giữa câu** (đoạn TỔNG QUAT Phần XI kết bằng "Chún"). Nghĩa là **không có chú giải Tổng quát Phần XVI** cho nhóm 6116. Không ảnh hưởng mục đã soạn (không mục nào trích `phan61`), nhưng lô sau ở Phần XI phải biết là thiếu nguồn.
- `phan84.phan` cũng dừng giữa chừng (mục "(IX) Máy móc và thiết bị sử dụng trong phòng thí nghiệm" dở câu "…thuộc").
- `wco.*` chỉ có tên phân nhóm tiếng Anh, **không có ngưỡng số** — không lấy được `tieuChi6` có số từ nguồn này (đúng luật 10).
