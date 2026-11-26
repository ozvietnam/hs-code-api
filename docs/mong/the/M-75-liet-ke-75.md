# M-75 (#1967) — Vấn đề chỉ liệt kê được — Chương 75

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/liet-ke/75.jsonl`: **6 bản ghi** (**1 `CHI_LIET_KE`** + **5 `BO_QUA`**) phủ 100% (6/6) câu kích hoạt `RE_KICH_HOAT_LIET_KE` thuộc Chương 75 (câu Phần XV giữ nguyên ở `liet-ke/XV.jsonl`) và rà soát dò mở rộng LUAT (**0** câu mới) (`0` nút con trùng nguyên văn tên tổ tiên, `0` dòng bảng).
  - Áp dụng Luật 1: chỉ giữ `CHI_LIET_KE` cho `nhom:7508:ct:2#1` (a-nốt mạ điện, là ranh giới với tấm/thanh 75.05/75.06); chuyển `nhom:7508:ct:21#1` (`dụng cụ gia đình, vệ sinh`) sang `BO_QUA` vì chỉ là mục liệt kê minh họa và nhóm 75.08/7508.10/7508.90 không đặt điều kiện công dụng.
- **Tuân thủ quy tắc QT:**
  - Chỉ giữ đúng tệp dữ liệu chương và tài liệu thẻ; dùng bộ kiểm chung [`scripts/ho-so-ma/liet-ke-test.mjs`](../../../scripts/ho-so-ma/liet-ke-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs) (Cổng 4/5).
  - Không chứa `gir:`, `wco:`, `tb:`; không đặt nhãn `[...]` ở đầu `dieuKien`; tách mục loại trừ/mô tả công dụng thông thường và liệt kê minh họa sang `BO_QUA` với lý do tường minh.

## Rà soát bổ sung theo regex PR #2230
- Dò mở rộng `LUAT` (regex PR #2230): trúng **1** câu, đã có trong `75.jsonl`: **1**, chưa ghi: **0** (bổ sung **1** bản ghi `BO_QUA`: `chuong:75:cgpn:2#1`). Tổng bản ghi sau rà: **7** (**1** `CHI_LIET_KE`, **6** `BO_QUA`).
