# Sổ tay chú giải — GÓI VIỆC NGƯỜI SOÁT ĐỘC LẬP (một PR)

> Tầng vận hành cho vai SOÁT (một người/agent KHÁC người soạn). Đọc [`LUAT-CHUNG.md`](LUAT-CHUNG.md) TRƯỚC. Không cần đọc trọn `so-tay-giao-ngoai.md`.

## Việc CỦA NGƯỜI SOÁT với mỗi PR

- CI xanh, `so-tay:check` xanh, tỷ lệ đạt của lô ≥ 95 %.
- **Soát độc lập bắt buộc, TOÀN BỘ** `phamVi`, `boPhan`, `dieuKienVao`, `loaiTru`, `phanBiet` của lô (không chỉ mẫu): một người/agent KHÁC người soạn
  đọc từng mục cùng nguồn, ghi `xoa`/`sua` theo `index` (cách làm ở vòng 2: tệp `review/<nhom>.json` rồi áp lên bản nháp trước khi nạp). Mục `sua` phải qua `check-so-tay --raw` lại. PR ghi số mục soát/xoá/sửa.

## Kiểu lỗi MÁY KHÔNG bắt được — người soát phải bắt

Bảng gốc vòng 1/2 (tách từ `so-tay-giao-ngoai.md`, giữ nguyên):

| Kiểu lỗi | Xử lý |
|---|---|
| Một nhánh của "A hoặc B" bị tách thành điều kiện độc lập (AND) | Người soát bắt |
| Nhánh "không" của `phanBiet` chỉ suy từ cấu trúc anh em / danh sách loại trừ | Người soát bắt |
| Dấu lược "…" nuốt mất ngoại lệ ("trừ", "tuy nhiên", "với điều kiện") hoặc câu liền sau trích là ngoại lệ | Người soát bắt |
| `text`/`tomTat`/`dieuKien` thêm chữ không có trong câu trích (số hiệu chú giải, ví dụ, mã 8 số) | Người soát bắt |
| Nguồn tự mâu thuẫn (bao gồm X ở một chỗ, loại X ở chỗ khác — vd 8409 "bơm phun") | Bỏ cả hai phía |

Bài học đợt theo tần suất 09/10 (mục 00 của `so-tay-giao-ngoai.md`):

- **Cắt trích để né câu rào:** người soạn cắt câu trích ngay trước "tùy từng trường hợp"/"thường…" để qua luật máy (6110) → mục nói chắc hơn nguồn. Máy không bắt được, người soát phải bắt.
- **`hoi` của `phanBiet` bị đảo** so với câu loại trừ trong nguồn (9106, 9017, 7013): nhánh Có/Không bị hoán đổi hoặc `hoi` gộp thêm vế ngoài câu.
- **Một nhánh của "A hoặc B"** bị chọn làm đích duy nhất (8708 → 7009: nguồn nói "70.09 hoặc Chương 90").
- **Mất ngoại lệ ngay sau câu trích** (8708: kính an toàn chưa khung vẫn thuộc 8708.22 nếu có sưởi).
- Máy chỉ kiểm câu trích ≤ 600 ký tự (lược đồ ghi 300); trích 300–600 ký tự vẫn qua, người soát cần để mắt.

Ngoài ra (bài học bước 1, máy chưa bắt): ghép hai câu xa nhau thành một kết luận (mạch MCO → 85.42); agent ghi tên phân nhóm theo hiểu biết riêng vào `dieuKien` — máy không kiểm `dieuKien`, người duyệt phải soát.

## Thước đo "soát THẬT" (không gật đầu cho qua)

Vòng 2 từng xoá 325 + sửa 95 trên ~1.300 mục; đợt theo tần suất xoá 14 + sửa 39 trên 821 mục (người soạn đã tránh sẵn lỗi đã biết). Mục mờ má → **XOÁ**, không sửa câu nguồn/mã để lách.

## VIỆC CỦA NGƯỜI DUYỆT (phiên quản lý) — KHÔNG phải của người soát

Ba việc dưới đây thuộc người duyệt sau khi nhận kết quả soát (nguồn: mục 4 `so-tay-giao-ngoai.md`) — người soát **KHÔNG gộp PR, KHÔNG tự cập nhật CSV**:

- Tự soát ngẫu nhiên ≥ 10 % số mục còn lại: `dieuKien`/`hoi` có đúng nghĩa với câu trích không, có ghép câu hay thêm hiểu biết riêng không.
- Bổ sung lỗi kệ sách mới phát hiện vào phần 1. Lỗi lặp lại thì đưa thành luật máy (`lib/so-tay.js`) cho các lô sau.
- Đạt thì gộp và cập nhật `so-tay-lo.csv` (`trang_thai=xong`, `pr`).
