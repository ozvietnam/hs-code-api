# TIEN-TRINH — sổ tay lô 007 (soạn mới)

Nhóm của lô: **7308, 8203, 8460, 8519, 6116, 7315**
Người soạn: `dev-zcode-mm` · Nhánh: `so-tay/lo-007` @ `25f5b37` (main mới nhất)
Ngày: 2026-10-21 · Phiên này là **người soạn** (không phải soát độc lập — việc đó là người khác).

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
