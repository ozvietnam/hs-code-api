# Báo cáo M-75 — Vấn đề chỉ liệt kê được Chương 73

- **Thẻ:** `#1967` (`M-75`) · **Nhánh:** `mong/m-75-c73` (tuân thủ luật nộp chương mới của QT: chỉ chạm `data/ho-so-ma/liet-ke/73.jsonl` và `docs/mong/the/M-75-liet-ke-73.md`)
- **Kho xuất:** [`data/ho-so-ma/liet-ke/73.jsonl`](../../../data/ho-so-ma/liet-ke/73.jsonl) — **55 bản ghi** (**38 `CHI_LIET_KE`** + **17 `BO_QUA`**), phủ **100%** các câu kích hoạt Chương 73 (0 `tb:`, 0 `wco:`, 0 `gir:`, không dữ liệu khách, không nhân bản `phan:XV` ở `#1975`).
- **Đã xử lý theo góp ý QT (`#2000`):** áp dụng quy tắc bỏ nút con có tên trùng nguyên văn tổ tiên — loại **`bieu:731600`** và **`bieu:73160000`** (trùng nguyên văn tên `bieu:7316`), giữ một câu hỏi duy nhất ở tổ tiên cao nhất **`bieu:7316`**.
- *(Lưu ý: `test-lop-kho.mjs` sẽ xanh ngay khi `#1975` mang mục `data/ho-so-ma/liet-ke/**` vào `data/lop-kho.json` được gộp vào `main`.)*

## Nội dung chính đã rút
1. **Dòng biểu thuế (`bieu:73*`, 12 `CHI_LIET_KE` sau khi khử lặp tầng `731600`/`73160000`):**
   - `73.02`: vật liệu chuyên dùng cho ghép/định vị đường ray (phân biệt bu lông/đinh thông thường `73.17`/`73.18`).
   - `73.08`: kết cấu và bộ phận rời của kết cấu (trừ nhà lắp ghép `94.06` và bộ phận máy Phần XVI).
   - `73.15`, `73.16`, `73.21`, `73.22`, `73.23`, `73.24` (+ `7324.90.91/93`): bộ phận đặc trưng nhận dạng được của sản phẩm tương ứng (phân biệt bộ phận công dụng chung theo Chú giải 2 Phần XV).
2. **Chú giải chi tiết nhóm (`nhom:73*`) & `sen:73089020:2` (26 `CHI_LIET_KE` + 17 `BO_QUA`):**
   - Ranh giới chế tác thành bộ phận nhận dạng được của sản phẩm/máy móc Phần XVI/XVII (`7303`, `7304`, `7305`, `7306`, `7308`, `7312`, `7320`, `7325`, `7326` gồm vật đúc/vật rèn chưa hoàn thiện mang đặc tính cần thiết của sản phẩm hoàn thiện).
   - Điều kiện phụ kiện nối đầu lỗ ống (`7307`), vòng kẹp thiết kế đặc biệt lắp kết cấu (`7308` vs `7326`), dây xoắn lỏng thích hợp làm hàng rào (`7313`), tính chất sắt/thép còn giữ nguyên khi gắn nắp/tay cầm vật liệu khác (`7323`, `7324`), công dụng chủ yếu trong gia đình (`7323`).
   - `BO_QUA` tường minh cho tiêu đề mục (`nhom:7323:ct:1#1`), câu dẫn dấu hai chấm, mô tả ví dụ minh họa công dụng và mục loại trừ đích danh thuộc cạnh `KHONG_DUOC_LA` (`M-72`).

## Kiểm chứng
- `node scripts/ho-so-ma/cong.mjs --pham-vi 73 --cong 4,5`: **0 lỗi khuôn**, Cổng 4/5 **61 mục kiểm, 0 lỗi**.
- `node scripts/test-ho-so-ma.mjs`: **83 passed, 0 failed**.
- `dem-ca-test.mjs`: **86 ca xanh, 0 ca đỏ, EXIT=0**.
- `kiem-pham-vi-the.mjs`: **`PASS phạm vi M-75`** (chỉ 2 tệp trong phạm vi M-75).
