# [M-75] Vấn đề chỉ liệt kê được — Chương 24

- Chương **24** (Thuốc lá và nguyên liệu thay thế lá thuốc lá đã chế biến; sản phẩm chứa/không chứa nicotin dùng để hút không đốt cháy / nạp nicotin).
- Tổng số bản ghi: **24** (**12** `CHI_LIET_KE`, **12** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (16/16).
- Đối soát dò mở rộng `LUAT` (regex PR #2373 gồm `dùng|sử dụng|…|để (hít|ngậm|…)|…`): **trúng 9 / đã có 9 / chưa ghi 0**.
- `id` dạng `hs:<nut>:75NN` (không trùng `data/ho-so-ma/**` trên `main`; không có `nguong/24.jsonl`).
- Tiêu đề chương `bieu:24#1` / `chuong:24#1` không nằm trong tập kích hoạt cổng cũng không trong câu LUAT mở rộng sau lọc `laNutConTrungTenToTien` — không ghi bản ghi; nếu có thì bắt buộc `BO_QUA` theo GIR 1.
- Điểm chính `CHI_LIET_KE`: dòng biểu chia theo công dụng (`2403.11` tẩu nước, `2403.19.20` để sản xuất thuốc lá điếu, `2403.99.40` để hít/ngậm, `24.04`/`2404.1` hút không đốt cháy, `2404.12.10` dùng cho thuốc lá điện tử, `2404.91` dùng qua đường miệng) + liệt kê công dụng pháp lý trong chú giải chi tiết nhóm 24.04.
- `BO_QUA`: Chú giải phân nhóm 1 tại `chuong:24` (Luật 7 — chỉ áp `2403.11`, đã gắn ở `bieu:240311`), loại trừ M-72 (`cgpn:1#2`), mô tả thương mại chú giải/SEN (`chủ yếu được dùng để sản xuất thuốc trừ sâu`, e-juice/NRT), câu khẳng định vẫn thuộc nhóm 2402.
- Sửa `tra-tho` PR #2372: thêm `hs:bieu:24039940:7524`; đổi `hs:chuong:24:7501` → `BO_QUA` (Luật 7).
- Kiểm tra: `khuon`, `cong 3/4/5`, `kiemPhuLietKe`, `kiemTrungTenToTien`, `liet-ke-test`, `test-ho-so-ma`, `test-lop-kho`, `kiem-pham-vi-the` — xem log nhịp nộp.
