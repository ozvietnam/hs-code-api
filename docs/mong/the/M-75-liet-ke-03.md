# M-75 — Vấn đề chỉ liệt kê được — Chương 03

## Tổng quan
- Tổng số bản ghi: **62** (**35** `CHI_LIET_KE`, **27** `BO_QUA`).
- Tỷ lệ phủ câu kích hoạt: **100%** (24/24).
- Dò mở rộng `LUAT` (Luật 4 + regex mục đích/nhân giống/bán lẻ/`ăn được`/`giống`): trúng **36** câu (sau lọc tổ tiên–con), đã có trong `03.jsonl`: **36**, chưa ghi: **0**.

## Rà soát bổ sung theo regex mới (PR #2230 / #2373)
- Bổ sung **21** bản ghi (`id` dạng `hs:<nut>:75NN`):
  - **3** `CHI_LIET_KE`: `bieu:03029#1`, `bieu:03039#1`, `bieu:03057#1` (điều kiện «phụ phẩm ăn được sau giết mổ của cá» ở các phân nhóm 5 số `0302.9`, `0303.9`, `0305.7`).
  - **18** `BO_QUA`: `bieu:030487#1` («giống Thunus» chỉ chi sinh học genus) và 17 dòng biểu phân nhóm 5 số của `03.02`, `03.03`, `03.05` (`0302.1–0302.8`, `0303.1–0303.8`, `0305.4–0305.6`, nơi cụm «ăn được» nằm trong mệnh đề loại trừ phụ phẩm cá sang `0302.9`/`0303.9`/`0305.7` thuộc M-76 và `03055#1` kèm «có hoặc không muối» theo Luật 2).

## Kiểm tra luật M-75
- Luật 1 & 4: Giữ `CHI_LIET_KE` cho `03.09`, 3 phân nhóm phụ phẩm cá ăn được (`0302.9`, `0303.9`, `0305.7`), điều kiện chế biến bộ phận giáp xác/thân mềm/thủy sinh (`03.05–03.09`), 11 nút mục đích nhân giống trên biểu (`0301.93/99`, `0306.31/32/35/36.1`) + 7 điều kiện chứng nhận SEN tương ứng, và 6 nút đóng bao bì kín khí để bán lẻ (`0306.91.2–0306.99.2`).
- Luật 2 & 3: Các câu loại trừ M-72 sang Chương 5, 16.04, 16.05, 23.01, mệnh đề loại trừ phụ phẩm sang phân nhóm anh em (`0302.9`, `0303.9`, `0305.7`), cụm «có hoặc không muối» (`0305.5`) và từ «giống» sinh học (`0302.3`, `0303.4`, `0304.87`) đánh `BO_QUA`.

## Kết quả cổng
- `khuon.mjs`: 0 lỗi; `cong.mjs` Cổng 3, 4, 5: 0 lỗi; `liet-ke-test.mjs`: ĐẠT.
