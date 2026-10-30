# Đề xuất từ vựng `tu-vung@2` — khoá còn thiếu khi số hoá ranh giới 6→8 số

> Ngày 30/10/2026, #577 (L1-4, gia cố cho thợ rẻ). **Chỉ là đề xuất.** `data/tu-vung/tu-vung@1.json` khoá cứng theo bench
> (`bench-may-nghi`, `check-tu-vung`) và KHÔNG được sửa trong lúc số hoá lát 1. Thêm khoá là việc của L1-3a, cần Claude/GĐ
> duyệt, đo lại bench, rồi mới nâng phiên bản.

## Quy tắc cho người soạn (thợ) cho tới khi có `tu-vung@2`

Gặp chữ biểu cần một trong các ý dưới (hoặc bất kỳ ý nào `--tu-vung` không có khoá):

1. **Không tự đặt khoá**, không mượn khoá gần nghĩa (vd không dùng `duongKinhLoi` cho "số lõi"), không dồn ý vào `tenLoai`.
2. Để trống `dieuKienSo` của mục đó.
3. Ghi `ghiChuSoan`: `{"ma": "<mã>", "loai": "THIEU_KHOA_TU_VUNG", "khoaDeXuat": "<tên khoá dưới đây>", "ghiChu": "<trích nguyên văn chữ biểu cần khoá>"}`.
4. Chạy `--ap-spec` / `--kiem`: máy in **DỪNG** và thoát mã 3. Mở PR ở trạng thái DỪNG (mẫu PR trong `QUY-TRINH-SO-HOA.md`) và báo lại trên issue.

Máy giúp nhận ra: `--goi` gắn cờ `nghiThieuKhoa` cho mục có chữ gợi ý (số sợi/lõi, tỉ lệ, "chỉ hoặc chủ yếu", phương pháp chế tạo);
spec dùng khoá không có trong `tu-vung@1` bị từ chối với `THIEU_KHOA_TU_VUNG` (mã thoát 3).

## Khoá đề xuất

| Khoá đề xuất | Kiểu | Đơn vị / giá trị | Chữ biểu gặp ở lát 1 (ví dụ) | Ghi chú thiết kế |
|---|---|---|---|---|
| `soLoi` | `SO` | lõi (số nguyên) | 8544.42.91 "Cáp dữ liệu dẹt có hai sợi hoặc hơn" (sợi = lõi dẫn); cáp nhiều lõi ở 8544.49 | Cần đọc số chữ ("hai", "ba") lẫn số ("2 lõi"); "hai … hoặc hơn" = `>= 2`. |
| `soSoi` | `SO` | sợi | dây/cáp bện, sợi quang (85.44, 90.01) | Tách khỏi `soLoi` nếu chữ biểu phân biệt sợi bện với lõi dẫn; nếu không, gộp một khoá `soLoi`. |
| `tiLe` | `SO` (không thứ nguyên) hoặc cặp `{tu, mau}` | tỉ số, vd `0.1` | "độ dày không quá 1/10 đường kính", "chiều dài gấp … lần" | Cần nói rõ đại lượng tử/mẫu; có thể tách thành khoá riêng theo cặp đại lượng (vd `tiLeDayTrenDuongKinh`). |
| `chiHoacChuYeu` | `CO_KHONG` (kèm `dungCho`) | — | 8414.59.10 "loại chỉ sử dụng hoặc chủ yếu sử dụng để làm mát bộ vi xử lý…" | Hiện chỉ ghi được `dungCho`; "chỉ hoặc chủ yếu" là mức ràng buộc khác "dùng cho" — cổng không được coi hai câu tương đương. |
| `phuongPhapCheTao` | `LIET_KE` | `DUC`, `REN`, `CAN_NONG`, `CAN_NGUOI`, `KEO`, `DAP`, `HAN`, `EP_PHUN`, `THOI` … | "được rèn", "cán nóng", "đúc" (72.xx, 73.xx, 84.83 trục rèn) | `cachDoc` phải phân biệt "gang đúc" (vật liệu) với "được đúc" (phương pháp). |

## Việc cần làm khi lên `tu-vung@2` (L1-3a)

- Thêm khoá + `cachDoc` vi/en/zh + `cauHoi`, `nguonLoai: CLAUDE_DUYET` sau soát độc lập.
- `lib/tu-vung.js#docGiaTri` đọc được số chữ ("hai sợi") và phân số ("1/10").
- Chạy lại `node scripts/check-tu-vung.mjs`, `node scripts/bench-may-nghi.mjs`; bench không được tụt.
- Mở lại các mục `THIEU_KHOA_TU_VUNG` đã ghi trong bản nháp (`grep -l THIEU_KHOA_TU_VUNG data/ho-so/ranh-gioi/*.json`).
