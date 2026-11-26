# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 85

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/XVI.jsonl`: giữ nguyên **51 bản ghi** Phần XVI từ Chương 84 (**y hệt từng byte**), gồm **18 `CHI_LIET_KE` + 33 `BO_QUA`**.
  - `data/ho-so-ma/liet-ke/85.jsonl`: **152 bản ghi** (**108 `CHI_LIET_KE` + 44 `BO_QUA`**; đã bỏ 2 nút con trùng nguyên văn tên tổ tiên `bieu:850300`, `bieu:85414200` và đổi 4 mã `id` tránh trùng `nguong/85.jsonl`: `hs:bieu:85030020:8502`, `hs:bieu:8509:8506`, `hs:bieu:8535:8502`, `hs:bieu:8536:8502`), phủ 100% câu chứa cụm kích hoạt thuộc Chương 85 và SEN 85 (`chuong:85:kq:6#1`, `chuong:85:kq:19#1`, `chuong:85:kq:20#1`, `chuong:85:kq:27#1`, `sen:85371013:1#1`, các nhóm/dòng bộ phận `85.03`, `85.22`, `85.29`, `85.38`, máy/thiết bị chưa lắp ráp `85.11`, `85.12`, `85.18`, `85.41`, pin/ắc quy thải 8549.11–8549.19).
  - Tổng phạm vi Chương 85 (+ Phần XVI): **203 bản ghi**, **0** nút con trùng tên tổ tiên.
- **Tuân thủ chỉ đạo QT sau soát tay Chương 84:**
  - Không chứa `gir:`, `wco:` hay `tb:` (chỉ giữ câu chú giải Phần/Chương tự áp quy tắc GIR như Chú giải Phần XVI máy chưa hoàn chỉnh/tháo rời và nhóm 85 chưa lắp ráp).
  - Không đặt nhãn `[...]` ở đầu `dieuKien`.
  - Lọc các mục loại trừ đích danh M-72 (`KHONG_DUOC_LA` như `nhom:8513:ct:10#4 → 90.18`, `nhom:8515:ct:48#1 → 84.86`, `nhom:8527:ct:12#1 → 87.05`, `nhom:8528:ct:34#1 → 87.05`) và câu dẫn sang `BO_QUA` với lý do tường minh.
- **Kiểm chứng chung:**
  - [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) (`--pham-vi 85` qua Cổng 4/5 tại [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs))
