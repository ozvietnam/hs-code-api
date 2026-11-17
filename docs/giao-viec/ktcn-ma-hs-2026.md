# Giao việc: dựng ma trận mã HS 8 số × kiểm tra chuyên ngành 2026 (giao Google AI Studio)

- **Giao:** 2026-11-17. **Người điều phối và soát:** Claude. Thợ ngoài (Gemini trong Google AI Studio) **không tự gộp** vào `main`.
- **Vì sao:** `data/ktcn-regime-2026.json` đã có 15 danh mục kiểm tra chuyên ngành mới theo NĐ 37/2026/NĐ-CP (thay cách chia nhóm 1/nhóm 2 bằng 3 mức rủi ro, áp dụng từ 01/7/2026), nhưng mới chỉ có **siêu dữ liệu**. Ghi chú của tệp nói rõ: *"danh mục mới chưa có phụ lục mã HS gốc trong repo"*. Vì vậy `/api/tax` chỉ báo được "căn cứ cũ, cần đối chiếu". Ma trận này lấp đúng chỗ thiếu đó, và là nền cho hai sản phẩm mới của Cổng OZ: **Kiểm tra pháp lý mặt hàng khó** (tầng 3) và **Báo giá kiểm định** (tầng 4). Kế hoạch nằm ở doc Claude "Kế hoạch bán dịch vụ Cổng OZ MCP", mục 10.
- **Đầu ra:** `data/ktcn-ma-hs-2026/<so-hieu-slug>.json`, mỗi văn bản một tệp, rồi mở **một PR cho mỗi văn bản**.

## 1. Nguồn đầu vào (người điều phối chuẩn bị trước khi chạy Studio)

| # | Văn bản | Bộ | Loại | Hiệu lực | Độ tin hiện tại |
|---|---|---|---|---|---|
| 1 | 33/2026/TT-BCT | BCT | Rủi ro chất lượng | 01/7/2026 | SECONDARY |
| 2 | 28/2026/TT-BCT | BCT | An toàn thực phẩm | 17/7/2026 | PRIMARY_QUOTED |
| 3 | 36/2026/TT-BKHCN | BKHCN | Rủi ro chất lượng | 01/7/2026 | SECONDARY |
| 4 | 41/2026/TT-BXD | BXD | Rủi ro chất lượng | 01/7/2026 | PRIMARY_QUOTED |
| 5 | 49/2026/TT-BXD | BXD | Rủi ro chất lượng | 01/7/2026 | SECONDARY |
| 6 | 27/2026/TT-BNNMT | BNNMT | Rủi ro chất lượng | 01/7/2026 | PRIMARY_QUOTED |
| 7 | 01/2026/TT-BNNMT | BNNMT | Kiểm dịch | 01/1/2026 | SECONDARY |
| 8 | 16/2026/TT-BNV | BNV | Rủi ro chất lượng | 28/7/2026 | SECONDARY |
| 9 | 125/2026/TT-BCA | BCA | Rủi ro chất lượng | 01/7/2026 | SECONDARY |
| 10 | 126/2026/TT-BQP | BQP | Rủi ro chất lượng | 02/9/2026 | SECONDARY |
| 11 | 24/2026/TT-BYT | BYT | Rủi ro chất lượng | 01/7/2026 | SECONDARY |
| 12 | 26/2026/TT-BYT | BYT | Rủi ro chất lượng | 01/7/2026 | SECONDARY |
| 13 | 27/2026/TT-BYT | BYT | Rủi ro chất lượng | 01/7/2026 | SECONDARY |
| 14 | 28/2026/TT-BYT | BYT | Rủi ro chất lượng | 01/7/2026 | **UNVERIFIED** (xác minh văn bản trước) |

`22/2026/TT-BNNMT` chỉ quy định cơ quan kiểm tra, không có phụ lục mã HS, nên **bỏ khỏi đợt này**.

Mỗi văn bản cần **bản gốc có phụ lục mã HS**, ưu tiên theo thứ tự: congbao.chinhphu.vn → vanban.chinhphu.vn → cổng thông tin của bộ ban hành. Tải PDF, trích chữ ra `data/ktcn-ma-hs-2026/nguon/<slug>.txt` (giữ nguyên văn, kể cả bảng), và ghi URL vào trường `nguon.url`. **Không dùng bài báo hay trang tổng hợp làm nguồn mã HS.**

## 2. Cách chạy Studio (một lượt cho mỗi văn bản, không chia nhỏ)

- Một cửa sổ Studio duy nhất. Model Gemini mạnh nhất đang miễn phí. Tắt tìm kiếm Google. Bật URL context, hoặc dán nguyên `nguon/<slug>.txt`.
- **Đưa nguyên cả phụ lục trong một lượt**, kể cả khi phụ lục dài hàng trăm dòng. Không cắt lô.
- Dán khối **System instructions** ở mục 3. Lời nhắc người dùng chỉ gồm: số hiệu văn bản và nguồn.
- Tải JSON về, chạy máy kiểm ở mục 5, rồi mở PR.

## 3. System instructions (dán nguyên văn vào Studio)

```
Bạn trích PHỤ LỤC MÃ HS của một thông tư danh mục kiểm tra chuyên ngành Việt Nam 2026 ra JSON. Chỉ trích, không suy luận.

LUẬT
1. Mỗi dòng phụ lục có mã HS -> một phần tử trong "dong". Không bỏ dòng nào, không thêm dòng nào không có trong văn bản.
2. "maHs" chép đúng chữ số trong văn bản, bỏ dấu chấm và khoảng trắng. Văn bản ghi 4 hoặc 6 số thì giữ 4 hoặc 6 số và đặt "capMa" = 4 | 6 | 8. KHÔNG tự mở rộng ra mã 8 số con.
3. Một ô ghi nhiều mã hoặc một khoảng ("8516.10.11 đến 8516.10.19") -> tách thành nhiều phần tử, mỗi phần tử đều mang cùng "nguyenVan" của cả ô. Khoảng mã thì đặt "laKhoang": true và chỉ liệt kê hai đầu mút, không tự sinh mã ở giữa.
4. "nguyenVan" = chép NGUYÊN VĂN cả dòng phụ lục (tên hàng + mã + QCVN + ghi chú), tối đa 600 ký tự. Không sửa chính tả, không tóm tắt.
5. "mucRuiRo": "CAO" | "TRUNG_BINH" | "THAP" | null, lấy đúng từ tên phụ lục hoặc cột trong văn bản. Văn bản không ghi thì để null.
6. "bienPhap": chép nguyên văn biện pháp quản lý hoặc kiểm tra nếu văn bản có (ví dụ "kiểm tra nhà nước trước thông quan", "chứng nhận hợp quy"). Không có thì để null.
7. "qcvn": danh sách số hiệu QCVN hoặc TCVN văn bản ghi cho dòng đó. Không có thì để [].
8. "dieuKienLoaiTru": chép nguyên văn nếu dòng có câu loại trừ hoặc chỉ áp cho một phần ("trừ loại…", "chỉ áp dụng đối với…"). Không có thì để null.
9. Chỗ không đọc được (bảng vỡ, OCR lỗi) -> vẫn tạo phần tử với "canNguoiXem": true và ghi lý do vào "ghiChuTho". KHÔNG đoán mã.
10. Không viết lời bình. Không trích điều khoản ngoài phụ lục. Không gắn nhãn GIR.

ĐẦU RA: đúng một khối JSON theo lược đồ, không có chữ nào khác.
{
  "phienBan": "ktcn-ma-hs@1",
  "soHieu": "<số hiệu>",
  "nguon": { "url": "<url>", "tepChu": "nguon/<slug>.txt" },
  "phuLuc": [ { "ten": "<tên phụ lục nguyên văn>", "mucRuiRo": "CAO|TRUNG_BINH|THAP|null" } ],
  "dong": [
    {
      "stt": "<số thứ tự trong phụ lục, nguyên văn>",
      "phuLuc": "<tên phụ lục chứa dòng>",
      "maHs": "85161011",
      "capMa": 8,
      "laKhoang": false,
      "tenHang": "<tên hàng nguyên văn>",
      "mucRuiRo": "CAO",
      "bienPhap": null,
      "qcvn": ["QCVN 4:2009/BKHCN"],
      "dieuKienLoaiTru": null,
      "nguyenVan": "<cả dòng nguyên văn>",
      "canNguoiXem": false,
      "ghiChuTho": null
    }
  ]
}
```

## 4. Luật bất biến (máy và người soát cùng giữ)

- Dữ liệu này là **tín hiệu kiểm tra chuyên ngành**, **không phải** `canCuPhapLy` và không phải trích dẫn GIR (luật 6 và 7a trong `CLAUDE.md`).
- `nguyenVan` phải là **chuỗi con** của `nguon/<slug>.txt`, sau khi chuẩn hoá khoảng trắng.
- Không ghi đè `data/ktcn-regime-2026.json`. Chỉ thêm trường `maHsTep` trỏ tới tệp mới khi PR được duyệt.
- Văn bản đang ở mức UNVERIFIED (28/2026/TT-BYT) phải xác minh số hiệu trên Công báo **trước** khi trích.

## 5. Máy kiểm (người điều phối chạy trước khi mở PR)

Script cần viết: `scripts/check-ktcn-ma-hs.mjs <tệp.json>`. Đỏ khi gặp một trong các lỗi sau:
1. JSON sai lược đồ, hoặc thiếu trường.
2. `maHs` không phải chữ số, hoặc `capMa` khác độ dài của `maHs`.
3. `maHs` 8 số không có trong `data/tax.json`; mã 4 hoặc 6 số không là tiền tố của mã nào trong `data/tax.json`.
4. `nguyenVan` không là chuỗi con của tệp nguồn (sau chuẩn hoá khoảng trắng).
5. `soHieu` không có trong `data/ktcn-regime-2026.json` → `lists[].code`.
6. Trùng cặp (`phuLuc`, `maHs`, `stt`).

Báo cáo in ra: tổng số dòng, số dòng `canNguoiXem`, số mã 4/6/8 số, số khoảng mã.

## 6. Soát độc lập (bắt buộc, không phải người hay agent đã soạn)

- Lấy ngẫu nhiên 20 dòng, hoặc toàn bộ nếu ít hơn 20, rồi đối chiếu tay với PDF gốc: mã, mức rủi ro, QCVN, câu loại trừ.
- Mọi dòng `canNguoiXem` phải được xử lý (sửa theo PDF hoặc xoá có ghi lý do) trước khi gộp.
- Ghi biên bản soát vào PR, gồm số dòng đã soát, số lỗi, SHA.

## 7. Thứ tự ưu tiên

Làm trước các văn bản phủ nhiều hàng nhập từ Trung Quốc mà khách OZ hay hỏi: **36/2026/TT-BKHCN** (đồ điện gia dụng, đồ chơi, dây cáp) → **33/2026/TT-BCT** → **41/2026/TT-BXD** (vật liệu xây dựng) → **27/2026/TT-BYT** (dụng cụ, bao bì tiếp xúc thực phẩm) → **28/2026/TT-BCT** → các văn bản còn lại.
