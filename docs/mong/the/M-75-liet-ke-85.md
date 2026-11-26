# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 85

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/liet-ke/XVI.jsonl`: giữ nguyên **51 bản ghi** Phần XVI từ Chương 84 (**y hệt từng byte**), gồm **18 `CHI_LIET_KE` + 33 `BO_QUA`**.
  - `data/ho-so-ma/liet-ke/85.jsonl`: **154 bản ghi** (**110 `CHI_LIET_KE` + 44 `BO_QUA`**) phủ 100% câu chứa cụm kích hoạt thuộc Chương 85 và SEN 85 (`chuong:85:kq:6#1`, `chuong:85:kq:19#1`, `chuong:85:kq:20#1`, `chuong:85:kq:27#1`, `sen:85371013:1#1`, các nhóm/dòng bộ phận `85.03`, `85.22`, `85.29`, `85.38`, máy/thiết bị chưa lắp ráp `85.11`, `85.12`, `85.18`, `85.41`, pin/ắc quy thải 8549.11–8549.19).
  - Tổng phạm vi Chương 85 (+ Phần XVI): **205/205 câu kích hoạt được phủ** (`0` thiếu).
- **Tuân thủ chỉ đạo QT sau soát tay Chương 84:**
  - Không chứa `gir:`, `wco:` hay `tb:` (chỉ giữ câu chú giải Phần/Chương tự áp quy tắc GIR như Chú giải Phần XVI máy chưa hoàn chỉnh/tháo rời và nhóm 85 chưa lắp ráp).
  - Không đặt nhãn `[...]` ở đầu `dieuKien`.
  - Lọc các mục loại trừ đích danh M-72 (`KHONG_DUOC_LA` như `nhom:8513:ct:10#4 → 90.18`, `nhom:8515:ct:48#1 → 84.86`, `nhom:8527:ct:12#1 → 87.05`, `nhom:8528:ct:34#1 → 87.05`) và câu dẫn sang `BO_QUA` với lý do tường minh.
- **Công cụ & bài kiểm:**
  - [`scripts/ho-so-ma/liet-ke-rut.mjs`](../../../scripts/ho-so-ma/liet-ke-rut.mjs) (`--chuong 85 --tao|--kiem|--bao-cao`)
  - [`scripts/ho-so-ma/liet-ke-85-test.mjs`](../../../scripts/ho-so-ma/liet-ke-85-test.mjs) (đã đăng ký vào `scripts/danh-sach-test.txt`)
