# Legal Docs EXPIRED — Need Status Verification + New Docs Add

## Tóm tắt

8 văn bản pháp luật trong `data/legal-docs.json` có `status: "EXPIRED"`. Kiểm tra
cho thấy:
- 5 có thể vẫn CÒN HIỆU LỰC (đánh giá sai status)
- 1 đã được thay thế nhưng văn bản thay thế chưa có trong kho
- 7 văn bản mới từ Bộ Công Thương (2024–2026) CHƯA có trong kho

## 8 EXPIRED docs — chi tiết

| Mã | Tên | Hiệu lực | citedInHsCount | Phân tích |
|-----|------|-----------|----------------|-----------|
| **691/QD-BCT-2023** | Gia hạn tự vệ thép dài | 2023-03-22 | 14 | Safeguard thép từ 2016, WTO cho phép 8 năm → đến 2026. Có thể vẫn active. |
| **691/QD-BCT** (duplicate) | Gia hạn tự vệ thép dài | 2023-03-22 | 3 | Trùng với 691/QD-BCT-2023 |
| **693/QD-BCT-2023** | Gia hạn chống lẩn tránh thép cuộn/dây | 2023-03-22 | 4 | Tương tự 691, cần xác nhận còn hiệu lực |
| **693/QD-BCT** (duplicate) | Gia hạn chống lẩn tránh | 2023-03-22 | 3 | Trùng |
| **715/QD-BCT-2020** | Gia hạn tự vệ phân bón DAP, MAP | 2020-03-07 | 8 | UNCLEAR — có thể đã hết hiệu lực |
| **715/QD-BCT** (duplicate) | Gia hạn tự vệ phân bón | 2020-03-07 | 4 | Trùng |
| **1978/QD-BCT-2025** | Rà soát cuối kỳ CBPG thép hình H (Trung Quốc) | 2025-07-08 | 5 | Đã có `replacedBy: 915/QD-BCT` trong kho — ĐÚNG nhưng 915 chưa có |
| **1978/QD-BCT** (duplicate) | Rà soát cuối kỳ CBPG | 2025-07-08 | 5 | Trùng |

### Sources (từ web search)
- **691/QD-BCT**: Gia hạn lần 2 (2020→2023), hiệu lực đến 21/3/2023. Safeguard thép dài
  áp dụng từ 2016. WTO cho phép tối đa 8 năm = 2024. Nhưng có thể đã gia hạn thêm sau 2023.
- **915/QD-BCT**: "không gia hạn" biện pháp CBPG thép hình H từ Malaysia — hết hiệu lực 16/4/2026.
  (không phải replacement, mà là chấm dứt)
- **914/QD-BCT** (2025): Thuế CBPG tạm thời thép mạ CN/Hàn — 16/4/2025, 120 ngày.
- **2310/QD-BCT** (2025): Thuế CBPG chính thức thép mạ CN/Hàn — đã có trong kho (ACTIVE).
- **2822/QD-BCT** (2024): Gia hạn CBPG thép cán phẳng sơn CN/Hàn.
- **2868/QD-BCT** (2025): Kết quả rà soát chống lẩn tránh đường mía.
- **1454/QD-BCT** (2026): Rà soát cuối kỳ CBPG thép hình H Trung Quốc — đang điều tra.

## Hành động cần thiết

### 1. Dev dữ liệu — Verify và cập nhật status
- [ ] 691/QD-BCT-2023: Xác nhận với nguồn BCT xem có gia hạn sau 2023 không.
  Nếu còn → đổi status thành ACTIVE + ghi effectiveDate mới.
- [ ] 693/QD-BCT-2023: Tương tự.
- [ ] 715/QD-BCT-2020: Xác nhận trạng thái cuối cùng. Có thể đã hết hiệu lực.
- [ ] 1978/QD-BCT-2025: Xác nhận replacedBy = 915/QD-BCT (đúng theo web search).

### 2. Dev dữ liệu — Add văn bản mới chưa có
- [ ] **915/QD-BCT**: Không gia hạn CBPG thép H Malaysia, hiệu lực đến 16/4/2026.
  Source: trungtamwto.vn, quangninh.gov.vn, sggp.org.vn
- [ ] **914/QD-BCT** (2025): CBPG tạm thời thép mạ CN/Hàn, 16/4/2025.
  Source: thuvienphapluat.vn, vsa.com.vn
- [ ] **2822/QD-BCT** (2024): CBPG thép cán phẳng sơn CN/Hàn, gia hạn.
  Source: 5208/TCHQ-TXNK
- [ ] **2868/QD-BCT** (2025): Rà soát chống lẩn tránh đường mía, AR02.AC02-AS01.
  Source: thuvienphapluat.vn
- [ ] **1454/QD-BCT** (2026): Rà soát cuối kỳ CBPG H-steel CN, đang điều tra.
  Source: moit.gov.vn, thuvienphapluat.vn
- [ ] **1959/QD-BCT** (2025): CBPG chính thức thép cán nóng CN (kết thúc điều tra Ấn Độ).
  Source: thuvienphapluat.vn
- [ ] **1204/QD-BCT** (2025): Sửa đổi 914/QĐ-BCT (thép mạ).
  Source: moit.gov.vn

## Tác động

Các văn bản EXPIRED được cite trong `tax.json` `cs` field:
- 691 (thép dài): ảnh hưởng 14+3 = 17 mã HS
- 715 (phân bón): ảnh hưởng 8+4 = 12 mã HS
- 693 (thép cuộn chống lẩn): ảnh hưởng 4+3 = 7 mã HS
- 1978 (thép H): ảnh hưởng 5+5 = 10 mã HS

→ Tổng cộng ~46 mã HS có thông tin chính sách phụ thuộc vào các văn bản này.

## Nguồn
- `lib/data-freshness.js` → legalDocs DUE (92 ngày chưa đối chiếu)
- Web search: thuvienphapluat.vn, moit.gov.vn, thaitr.dft.go.th, trungtamwto.vn,
  quangninh.gov.vn, sggp.org.vn, luatvietnam.vn
- tax.json cs field inspection
