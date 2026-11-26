# M-75 (#1967) — Vấn đề chỉ liệt kê được (Chương 76 + Phần XV + GIR 2/3)

- **Khuôn áp dụng:** `ho-so-ma@1` (`#1981` đã gộp vào `main`: [`docs/mong/khuon-ho-so-ma.md`](../../docs/mong/khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../docs/decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT` trong `data/lop-kho.json`):**
  - `data/ho-so-ma/liet-ke/gir.jsonl`: **5 bản ghi `CHI_LIET_KE`** (GIR 2(a), 2(b)→3, 3(b), 3(c) gắn đúng nút `gir:2:a`, `gir:2:b`, `gir:3:b`, `gir:3:c`, trích câu của chính quy tắc trong `data/luat-goc/gir.jsonl`).
  - `data/ho-so-ma/liet-ke/XV.jsonl`: **18 bản ghi** (**5 `CHI_LIET_KE`** Phần XV + **13 `BO_QUA`**, đã chuyển 5 bản ghi GIR sang `gir.jsonl`).
  - `data/ho-so-ma/liet-ke/76.jsonl`: **27 bản ghi** (**17 `CHI_LIET_KE`** trên `bieu:76*` + **10 `BO_QUA`**, không có `wco:`).
  - **Tổng: 50 bản ghi** (27 `CHI_LIET_KE`, 23 `BO_QUA`), không chứa dữ liệu khách, tờ khai, tiền lệ (`tb:`) hay ý kiến WCO (`wco:`).
- **Công cụ & bài kiểm chung:**
  - `scripts/ho-so-ma/liet-ke.mjs` (`--tao`, `--kiem`, `--bao-cao`, gồm `kiemTrungTenToTien` khử lặp nút con trùng nguyên văn tên tổ tiên)
  - `scripts/ho-so-ma/liet-ke-test.mjs` (test chung duy nhất của M-75, tự quét mọi tệp trong `data/ho-so-ma/liet-ke/`, đã đăng ký vào `scripts/danh-sach-test.txt`)

## 1. Phân nhóm các vấn đề `CHI_LIET_KE` (27 bản ghi)

| Nhóm vấn đề | Số lượng | Nút gắn | Căn cứ (`cau`) | Luật hỏi điều gì |
|---|---:|---|---|---|
| **GIR 2(a)** chưa hoàn chỉnh / chưa lắp ráp / tháo rời | 2 | `gir:2:a` (`gir.jsonl`) | `gir:2:a#1`, `gir:2:a#2` | Đã có đặc trưng cơ bản của hàng hoàn chỉnh chưa; có đủ chi tiết chỉ lắp ráp đơn thuần không |
| **GIR 2(b) & 3(b)/(c)** hỗn hợp / đa cấu thành / bộ hàng / đặc tính cơ bản | 5 | `gir:2:b`, `gir:3:b`, `gir:3:c`, `phan:XV`, `bieu:7607` | `gir:2:b#3`, `gir:3:b#1`, `gir:3:c#1`, `phan:XV:kq:18#2`, `nhom:7607:ct:6#1` | Nguyên liệu/bộ phận nào tạo đặc tính cơ bản; vật liệu ghép giấy-nhôm giữ tính chất của lớp nào |
| **Bộ phận** Phần XV (công dụng chung vs chuyên biệt) & Phần XVI/XVII | 12 | `phan:XV`, `bieu:7608`, `bieu:7610`, `bieu:7615`, `bieu:761510`, `bieu:761520`, `bieu:7616` | `phan:XV:cg:2:a#1`, `cg:2:ket#1`, `kq:24#1`, `kq:25#1`, `nhom:7608:ct:14#1`, `bieu:7610#1`, `nhom:7610:ct:5#1`, `bieu:7615*`, `nhom:7616:ct:5#1`, `10#1` | Có phải bộ phận công dụng chung (Chú giải 2 Phần XV) hay bộ phận chuyên biệt của kết cấu, xích, đồ gia dụng hoặc máy/xe Phần XVI/XVII (Chương 84–88) |
| **Cụm mục đích mở**: *"chủ yếu dùng"*, *"phù hợp để làm..."*, *"chuyên dùng"*, *"thiết kế đặc biệt"* | 8 | `bieu:7601`, `76042110`, `7609`, `7611`, `7612`, `76129010`, `76169920` | `nhom:7601:ct:2#1`, `bieu:76042110#1`, `nhom:7609:ct:3#1`, `nhom:7611:ct:3#1`, `nhom:7612:ct:6#1`, `bieu:76129010#1`, `sen:76129010:1#4`, `bieu:76169920#1` | Khảo sát công dụng chủ yếu/thiết kế chuyên biệt (luyện kim, dàn lạnh ĐH xe cơ giới, lắp kết cấu 76.10, container 86.09, đựng sữa tươi chịu va đập, bịt đầu bút chì…) |

## 2. Xử lý `BO_QUA` & chống lặp tầng
- Toàn bộ **32/32** câu khớp `RE_KICH_HOAT_LIET_KE` (đã loại `wco:` theo ADR-0006) trên đường đi `phan:XV` + `chuong:76` đều đã có bản ghi tương ứng.
- Mọi nút con trùng nguyên văn tên tổ tiên đều được loại bằng `laNutConTrungTenToTien` và kiểm chặn ở `kiemTrungTenToTien` (+ ca ngược `6c`).
