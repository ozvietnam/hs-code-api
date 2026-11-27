# Báo cáo M-74 — Ngưỡng số và phân dải anh em Chương 73

- **Thẻ:** `#1966` (`M-74`) · **Nhánh:** `mong/m-74-c73` (tuân thủ luật nộp chương mới của QT: chỉ chạm `data/ho-so-ma/nguong/73.jsonl` và `docs/mong/the/M-74-nguong-73.md`)
- **Kho xuất:** [`data/ho-so-ma/nguong/73.jsonl`](../../../data/ho-so-ma/nguong/73.jsonl) — **125 bản ghi `NGUONG`** (không chứa `tb:`, `wco:`, `gir:`, không dữ liệu khách).
- *(Lưu ý: `nguong/XV.jsonl` đã có sẵn trên `origin/main` từ #1973; Chương 73 không nhân bản lại Phần XV.)*

## Tóm tắt phân dải & ngưỡng chính Chương 73
1. **Định nghĩa Chú giải 2 Chương 73 (`chuong:73`):** `"dây"` có kích thước mặt cắt ngang `<= 16 mm`.
2. **Nhóm `73.05` vs `73.06` (`bieu:73`):** đường kính ngoài ống mặt cắt tròn (ngoài 73.03–73.04) `> 406,4 mm` (`73.05`) vs `<= 406,4 mm` (`73.06`, phủ định anh em).
3. **Nhóm `73.09` vs `73.10` & các phân cấp dung tích (`lít`):**
   - `73.09` (`> 300 lít`) vs `73.10` (`<= 300 lít`); `7310.10` (`>= 50 lít`) vs `7310.2` (`< 50 lít`); `7310.21.1`/`29.1` (`< 1 lít`) vs `.9` (`>= 1 lít`).
   - `7311.00.21/22` (CNG/LNG ô tô: `[30, 110)` và `>= 110 lít`; trường hợp `< 30 lít` chuyển sang `7311.00.26`), `7311.00.23/24/25` (LPG: `< 30`, `[30, 110)`, `>= 110`), `7311.00.26/27/29` (loại khác thép đúc liền), `7311.00.91/92/94/99` (`<= 7,3`, `(7,3; 30)`, `[30, 110)`, `>= 110 lít`).
4. **Ống & phụ kiện (`73.03`, `73.04`, `73.05`, `73.06`, `73.07`):**
   - Giới hạn chảy / áp lực: `80.000 psi` (`7304.22/23/24/29`, tách theo không ren / có ren), `42.000 psi` (`7304.31/39/51/59/90`, `7305.39`, `7306.30.4`, `7306.90.91`).
   - Đường kính ngoài / đường kính trong / đường chéo ngoài (`mm`, `cm`), hàm lượng `carbon < 0,45%` (`7304.31/39/90`, `7306.30.91`, `7306.90.97`) và `niken >= 30%` (`7306.40.30`).
   - Lưu ý chữ luật tại **`bieu:73069097`**: ghi nghiêm ngặt `"trên 12,5 mm"` (`tu: 12.5, gomTu: false`), giữ nguyên văn theo TT31.
   - `7307.21/22/23/29` & `7307.91/92/93/99`: 8 cặp `< 15 cm` vs `>= 15 cm`.
5. **Khác (`73.08`, `73.12`, `73.14`, `73.15`, `73.18`):**
   - `7308.30.10`: độ dày cửa `6–8 mm`; `7312.10.20`: đường kính `<= 3 mm`; `7314.20`: dây `>= 3 mm` và mắt lưới `>= 100 cm²`; `7315.11.91`: độ dài mắt xích `6–32 mm`; `7318.12/14/15/16/19/23/29`: 7 cặp anh em `<= 16 mm` vs `> 16 mm`.
   - Loại bỏ câu mô tả `"Thông thường..."` ở `sen:73089060:1#5/#6` theo quy tắc không dựng `NGUONG` từ ví dụ minh họa.

## Kiểm chứng
- Khuôn `ho-so-ma@1`: **0 lỗi**.
- Cổng 4 (`TRÍCH`) & Cổng 5 (`VÂN TAY`) phạm vi `73`: **131 mục kiểm, 0 lỗi**.
- Cổng 3 (`ANH EM`) & `kiemDaiAnhEm` (kèm `XV.jsonl`): **44 cụm kiểm (43 cụm phủ kín 100%; cụm CNG/LNG 73110021/22 chỉ định ngưỡng từ 30 lít, `< 30 lít` rơi sang `73110026`), 0 lỗi chồng/hở/voi**.
- `kiemDonViDaiLuong`: **0 lỗi**.
- Đối chiếu **75/75** tệp `data/ho-so/ranh-gioi/73*.json`: **100%** mã có điều kiện số (`68` mục) đều được phủ.
