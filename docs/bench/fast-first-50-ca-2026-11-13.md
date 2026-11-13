# Đo cổng FAST-FIRST trên bộ 50 ca TB-TCHQ — 13/11/2026 (OZV-631 / OZV-570)

**Câu hỏi:** nếu bật `HS_CLASSIFY_FAST_FIRST` ở prod thì bao nhiêu % lượt đi đường nhanh
(`fastFirstUngVien` trả đúng 1 mã 8 số ⇒ bỏ lời GIR vòng 2) và đường nhanh có chọn đúng mã không?

**Phương pháp (no-LLM, no-mạng):** `node scripts/do-fast-first-50-ca.mjs` — gọi đúng
`gather()` thật (tiền lệ Oz từ `data/oz-gold-final.jsonl`, bảng quyết định, cặp mã dễ nhầm)
rồi gọi `fastFirstUngVien()` như `classifyLoop`. Không có khoá LLM trên máy đo nên **r1 được
dựng tất định** theo 2 chiều (giữ khuôn r1 của replay1211 trong `benchmark-50-ca-tb-tchq.mjs`):

- **[dung-huong]** r1 dẫn đầu đúng phân nhóm 6 số của mã vàng, tự tin 80 (≥ ngưỡng 75), unknowns rỗng —
  kịch bản LÝ TƯỞNG của vòng 1 thinking-off ⇒ đo tỉ lệ có đường nhanh + độ đúng.
- **[sai-huong]** r1 dẫn đầu mã dễ nhầm (`maLan` của chính ca đó, 87 lượt) ⇒ đo cổng có chặn đúng không.

## 4 số (tái lập: chạy lại nhiều lần ra y hệt, `diff` = 0)

| # | Số đo | Kết quả |
|---|---|---|
| 1 | Tỉ lệ có đường nhanh (đúng hướng) | **1/50 (2,0%)** — ca stt 44 (nắp thùng xe bán tải 87082998, bảng quyết định đã duyệt nhóm 8708) |
| 2 | Độ đúng của đường nhanh | **1/1 (100%)** — mã đường nhanh = mã vàng |
| 3 | Đường nhanh SAI | **0 ca** |
| 4 | Cổng chặn đúng (87 lượt sai hướng) | **86/87 chặn (98,9%)**; 1 lượt còn lại cổng trả **đúng mã vàng** (stt 44: dẫn 87082995 → trả 87082998, cùng phân nhóm 6 — tự sửa dòng 8 số). **0 lượt chốt theo hướng sai.** |

Vì sao 49 ca không có đường nhanh: cả 49 ca đều **có** tiền lệ Oz nhưng độ khớp **< 75%**
(`tien-le-khop-duoi-75`) — bộ 50 ca là ca luật TB-TCHQ (hàng đặc thù, tranh chấp phân nhóm),
không phải traffic lặp lại hằng ngày của Oz nên không tiền lệ nào đạt ngưỡng tin. Không ca nào
bị chặn vì "mâu thuẫn nguồn độc lập" hay lọc hs6 ở chiều đúng hướng.

## Kết luận (1 câu)

**Phần tất định SẠCH — không có ca đường nhanh chọn sai mã, không có lượt cổng chốt nhầm khi
vòng 1 sai hướng; nhưng trên bộ ca luật TB-TCHQ đường nhanh gần như không nổ (1/50) ⇒ bật cờ ở
prod là AN TOÀN (không gây sai) nhưng TIẾT KIỆM GẦN BẰNG 0 trên dạng traffic này** — giá trị thật
của cổng nằm ở traffic lặp lại thường ngày của Oz (tiền lệ khớp cao), bộ đo đó cần đo riêng trên
dữ liệu tờ khai Oz, không thay thế được bằng bộ 50 ca luật này.

## Giới hạn

- Chưa đo vòng 1 LLM thật (không có khoá trên máy agent): tỉ lệ prod còn nhân thêm xác suất vòng 1
  đạt đồng thời 3 điều kiện (đúng hướng + tự tin ≥ 75 + unknowns rỗng). ΔĐ8 (độ đúng 8 số có LLM)
  vẫn đang chờ QT cấp secret cho CI — phép đo này KHÔNG thay thế ΔĐ8.
- Ở prod, ứng viên đường nhanh còn phải qua toàn bộ `gates()` G1–G8 nữa (một lớp chặn nữa — chỉ làm
  tỉ lệ đi nhanh TỐI ĐA bằng số đo trên, không thể cao hơn).
