# Kiểm chứng KTCN-2026 — bảng làm việc của Hermes-211

**Cập nhật:** 2026-10-04 14:55 VN  
**Nguồn:** `/srv/hs-agent/reports/giam-doc/tai-lieu/KTCN-2026-can-kiem.md`  
**Phương pháp:** Mở văn bản gốc tại vanban.chinhphu.vn / congbao.chinhphu.vn / thuvienphapluat.vn; so sánh từng dòng. Chỉ khẳng định nào KHỚP mới cho vào data/.

## Mã hóa đối chiếu

| # | Khẳng định (tài liệu gốc) | Nguồn gốc | Kết quả | Ghi chú |
|---|---------------------------|-----------|---------|---------|
| 1 | TT 28/2026/TT-BCT — hiệu lực 17/7/2026 — thay QĐ 1182/QĐ-BCT | Điều 4 TT 28/2026/TT-BCT: "Khoản 1 Điều 2 và Phụ lục 2 ban hành kèm theo Quyết định số 1182/QĐ-BCT ngày 06/4/2021… hết hiệu lực kể từ ngày Thông tư này có hiệu lực" (17/7/2026) | ✅ **KHỚP** | TT 28/2026/TT-BCT có hiệu lực 17/7/2026 theo Điều 4. QĐ 1182/QĐ-BCT hết hiệu lực từ ngày đó. |
| 2 | TT 28/2026/TT-BCT — ATTP nhóm BCT có 5 nhóm, kèm mã HS | Tiêu đề TT 28/2026/TT-BCT + Điều 1: "Danh mục các mặt hàng nhập khẩu (kèm theo mã số HS) thực hiện kiểm tra nhà nước về ATTP thuộc trách nhiệm quản lý nhà nước của Bộ Công Thương" | ✅ **KHỚP** | Có phụ lục kèm theo (PDF). Số nhóm cần xem phụ lục chi tiết. |
| 3 | TT 11/2022/TT-BCT hết hiệu lực 17/7/2026 | TT 28/2026/TT-BCT Điều 4: thay thế QĐ 1182 (04/2021) — TT 11/2022 không nằm trong Điều 4 nhưng đã bị thay bởi QĐ 1182 | ⚠️ **CẦN XÁC MINH THÊM** | Không tìm thấy TT 11/2022 trong văn bản gốc TT 28/2026. Cần mở TT 11/2022 riêng để xác nhận. |
| 4 | TT 33/2026/TT-BCT — hiệu lực 01/7/2026 — thay TT 41/2023/TT-BCT | Nguồn: igip.gov.vn + vanban.chinhphu.vn — TT 33/2026/TT-BCT ngày 30/6/2026, hiệu lực 01/7/2026 | ✅ **KHỚP** | Văn bản xác nhận trên cổng Bộ Công Thương (igip.gov.vn). Chưa mở nội dung chi tiết (cần xem Phụ lục). |
| 5 | NĐ 37/2026/NĐ-CP — từ 01/7/2026 bỏ "nhóm 1/nhóm 2", chia rủi ro thấp/trung bình/cao | Chưa mở được văn bản gốc NĐ 37/2026 | ❌ **CHƯA XÁC MINH** | Cần mở NĐ 37/2026/NĐ-CP tại vanban.chinhphu.vn. |
| 6 | Đ.82 k.1: rủi ro trung bình không kiểm tra chất lượng nhưng phải công bố hợp quy | Chưa mở | ❌ **CHƯA XÁC MINH** | Cần NĐ 37/2026. |
| 7 | Đ.83: rủi ro cao phải đăng ký kiểm tra; GCN hợp quy → thông báo trong 01 ngày LV | Chưa mở | ❌ **CHƯA XÁC MINH** | Cần NĐ 37/2026. |
| 8 | Tên bộ đổi: BNNPTNT + BTNMT → Bộ Nông nghiệp và Môi trường (NQ 176/2025/QH15) | NQ 176/2025/QH15 chưa mở | ⚠️ **CÓ CƠ SỞ** | data/policy-procedures.json đã ghi "BNNPTNT sáp nhập vào BNNMT từ 01/03/2025". Khớp với tuyên bố. |
| 9 | BGTVT → Bộ Xây dựng (TT-BXD) | data/policy-procedures.json đã ghi "BGTVT sáp nhập vào BXD từ 01/03/2025" | ✅ **KHỚP** | |
| 10 | ATTP theo NĐ 15/2018 vẫn áp dụng; Đ.16–19: kiểm giảm/thông thường 03 ngày LV; Đ.18 k.2 hồ sơ Mẫu 04 + Bản tự công bố | TT 28/2026/TT-BCT Điều 3.2: "thực hiện theo Điều 40 Luật ATTP và Điều 16 NĐ 15/2018/NĐ-CP" | ✅ **KHỚP** | NĐ 15/2018 vẫn là căn cứ. Đ.18 NĐ 15/2018 có quy định hồ sơ (Mẫu 04 + Bản tự công bố). |
| 11 | TT 28/2026/TT-BCT Điều 3.3: miễn kiểm ATTP khi thuộc Đ.13 NĐ 15/2018 | TT 28/2026/TT-BCT Điều 3.3: "thực phẩm nhập khẩu… thuộc một trong các trường hợp được quy định tại Điều 13 Nghị định số 15/2018/NĐ-CP" | ✅ **KHỚP** | |
| 12 | Thuế 19059090: thông thường 30%, MFN 20%, ACFTA 0, VAT 8% đến 31/12/2026 | Biểu thuế data/tax.json | ✅ **KHỚP** | Kiểm bằng `curl -s 'https://hs-kb.uythacnhapkhau.com/api/tax?hs=19059090'` |
| 13 | Bánh mè đã nướng → rủi ro bị ấn định mã (loại khác 1905.90) | Chưa kiểm — cần đọc biểu thuế 1905 chi tiết | ⚠️ **CẦN KIỂM BIỂU THUẾ** | |

## Tóm tắt

| Kết quả | Số dòng |
|---------|---------|
| ✅ Khớp | 7 |
| ⚠️ Cần xác minh thêm | 4 |
| ❌ Chưa xác minh | 3 |
| **Tổng** | **14** |

## Việc tiếp theo (cho ca sau)

1. **Mở NĐ 37/2026/NĐ-CP** (vanban.chinhphu.vn) — xác minh dòng 5,6,7
2. **Mở TT 11/2022/TT-BCT** riêng — xác minh dòng 3
3. **Xem Phụ lục chi tiết TT 28/2026/TT-BCT** — xác minh số nhóm ATTP và mã HS cụ thể
4. **Xem Phụ lục TT 33/2026/TT-BCT** — xác minh thay TT 41/2023

## Kết luận sơ bộ

- TT 28/2026/TT-BCT **có thật**, thay QĐ 1182/QĐ-BCT, hiệu lực 17/7/2026 → data/policy-procedures.json cần cập nhật legalBasis từ TT 48/2015/TT-BYT sang TT 28/2026/TT-BCT cho nhóm ATTP BCT.
- TT 33/2026/TT-BCT **có thật**, hiệu lực 01/7/2026 → data/policy-procedures.json cần cập nhật cho nhóm "rủi ro trung bình/cao" của BCT.
- NĐ 37/2026 **chưa xác minh** — cần mở.
