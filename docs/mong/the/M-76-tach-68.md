# M-76 (#1968) — Cấp 6 và 8 số: tách anh em, Loại khác phủ định, chú giải SEN — Chương 76 (PR nháp)

- **Khuôn áp dụng:** `ho-so-ma@1` mở rộng theo `#1981` (`phuDinh`, `thuatNgu`; [`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json` không đổi định dạng tệp):**
  - `data/ho-so-ma/phan-nhom/76.jsonl`: **1 tệp cho cả Chương 76** (42 bản ghi phủ 35 phân nhóm 6 số + 6 tiêu đề 7 số + 1 định nghĩa chú giải phân nhóm `7607.11`).
  - `data/ho-so-ma/dong/76.jsonl`: **1 tệp cho cả Chương 76** (84 bản ghi phủ đủ 74 dòng 8 số + 10 định nghĩa SEN).
  - **Tổng: 2 tệp dữ liệu, 126 bản ghi**, **0 bản `VENH`**, chỉ rút từ `data/luat-goc` (`bieu:76*`, `sen:76*`, `pn:760711:ct:1`). Không có dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay lời AI tự nghĩ.
- **Đã xử lý đủ 4 điểm QT trả trên #1995:**
  1. `data/lop-kho.json`: giữ nguyên bản `main`, chỉ chèn thêm mục cho `data/ho-so-ma/phan-nhom/**` và `data/ho-so-ma/dong/**` (`+12/−0`), không định dạng lại tệp.
  2. Gom 109 tệp lẻ thành **2 tệp theo chương** (`phan-nhom/76.jsonl` và `dong/76.jsonl`).
  3. Chú giải phân nhóm `pn:760711:ct:1`: gộp thành **một `DINH_NGHIA` duy nhất** (`thuatNgu: "chưa gia công thêm"`, trích đủ câu dẫn và 4 mục `(1)–(4)`, không tách 5 `PHAI_LA`). Đã soát toàn Chương 76 (`pn:76*`, `sen:76*`, `chuong:76:cgpn:*`, `bieu:76*`): không có chú giải phân nhóm nào khác ở cấp 6–8 số (`chuong:76:cgpn:1–2` thuộc `chuong:76` của M-72 và đã có ngưỡng ở M-74).
  4. Áp dụng khuôn `#1981`: toàn bộ **31 dòng *"Loại khác"*** ghi trường mảng `phuDinh` (giữ nguyên `voi`, bỏ `ghiChu: "phuDinh: ..."`); toàn bộ **11 `DINH_NGHIA`** (1 chú giải phân nhóm + 10 SEN) đều ghi `thuatNgu`.
- **Phân bổ 126 bản ghi Chương 76:**
  - **94 `TACH_ANH_EM`** (31 *"Loại khác"* có `phuDinh`).
  - **21 `BO_QUA`** cho dòng con duy nhất lặp tên cấp cha (ADR-0006).
  - **11 `DINH_NGHIA`** có `thuatNgu`: 1 từ `pn:760711:ct:1` + 10 từ `sen:76*` (đã lọc sạch câu ví dụ/thông số hàng mẫu `UltraTouch`, `16,35`, `0,175 mm`).
- **Điểm cần QT / M-71 đồng bộ trước khi bỏ nháp:**
  - `#1981` (khuôn `phuDinh`, `thuatNgu`) hiện chưa gộp vào `main`.
  - `lib/ho-so-ma/ghep.js` (`tepCuaNut`, dòng 66–67) và `docs/mong/khuon-ho-so-ma.md` trên `main` hiện vẫn trả khoá 6/8 số thay vì mã chương `76` cho `phan-nhom/` và `dong/` (thuộc phạm vi M-71, ngoài `M-76.tep`).
  - `cong.mjs` Cổng 4 ở `#1981` kiểm `trich` theo từng câu đơn `chuCau(x.cau)` và kiểm `thuatNgu` trên `nNguon.v + dan` (nên câu gộp `pn:760711:ct:1` có `thuatNgu: "chưa gia công thêm"` từ tên nút `bieu:760711` và trích 4 mục `(1)–(4)` cần M-71 chốt quy ước kiểm tương ứng).
  - 7 nút tiêu đề 5 số (`bieu:76042, 76051, 76052, 76061, 76069, 76071, 76169`) trỏ về `nhom/*.jsonl` ngoài phạm vi `M-76` — chờ QT chốt giao M-73 hay mở `[M-01]`.
- **Công cụ & kiểm chứng:**
  - [`scripts/ho-so-ma/tach-68.mjs`](../../../scripts/ho-so-ma/tach-68.mjs) (`--chuong 76 --tao|--kiem|--bao-cao [--gom-tieu-de-5]`)
  - [`scripts/ho-so-ma/tach-68-test.mjs`](../../../scripts/ho-so-ma/tach-68-test.mjs) (24/24 ca xanh gồm 4 ca ngược `TRUNG_TEN_ANH_EM`, `PHU_DINH_THIEU`, `DINH_NGHIA_THIEU_THUAT_NGU`, `VAN_TAY_LECH`; đăng ký trong `scripts/danh-sach-test.txt`).
