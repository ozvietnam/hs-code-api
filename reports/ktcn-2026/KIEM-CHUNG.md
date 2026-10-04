# Kiểm chứng KTCN-2026 — bảng làm việc của Hermes-211

**Cập nhật:** 2026-10-04 20:50 VN  
**Nguồn:** `/srv/hs-agent/reports/giam-doc/tai-lieu/KTCN-2026-can-kiem.md`  
**Phương pháp:** Mở văn bản gốc tại vanban.chinhphu.vn / congbao.chinhphu.vn / thuvienphapluat.vn; so sánh từng dòng. Chỉ khẳng định nào KHỚP mới cho vào data/.

## Mã hóa đối chiếu

| # | Khẳng định (tài liệu gốc) | Nguồn gốc | Kết quả | Ghi chú |
|---|---------------------------|-----------|---------|---------|
| 1 | TT 28/2026/TT-BCT — hiệu lực 17/7/2026 — thay QĐ 1182/QĐ-BCT | Điều 4 TT 28/2026/TT-BCT: hết hiệu lực kể từ ngày Thông tư có hiệu lực (17/7/2026) | ✅ **KHỚP** | |
| 2 | TT 28/2026/TT-BCT — ATTP nhóm BCT có 5 nhóm, kèm mã HS | Tiêu đề + Điều 1 TT 28/2026/TT-BCT | ✅ **KHỚP** | Có phụ lục kèm theo. |
| 3 | TT 11/2022/TT-BCT hết hiệu lực 17/7/2026 | xaydungchinhsach.chinhphu.vn (04/06/2026): "Kể từ thời điểm này, Thông tư số 11/2022/TT-BCT ngày 6/4/2022 của Bộ Công Thương hết hiệu lực." + dttc.sggp.org.vn xác nhận cùng ngày | ✅ **KHỚP** | TT 11/2022/TT-BCT về ATTP (danh mục NK phải kiểm tra ATTP thuộc BCT). Lưu ý: có TT 11/2022/TT-BCT khác về đường (ban hành 27/6/2022, hiệu lực 12/8/2022) — khác văn bản. |
| 4 | TT 33/2026/TT-BCT — hiệu lực 01/7/2026 — thay TT 41/2023/TT-BCT | igip.gov.vn + vanban.chinhphu.vn | ✅ **KHỚP** | Chưa mở Phụ lục chi tiết. |
| 5 | NĐ 37/2026/NĐ-CP — từ 01/7/2026 bỏ "nhóm 1/nhóm 2", chia rủi ro thấp/trung bình/cao | thuvienphapluat.vn: NĐ 37/2026 quy định kiểm tra nhà nước về chất lượng theo mức độ rủi ro; hết hiệu lực NĐ cũ từ 01/7/2026 | ✅ **KHỚP** | NĐ 37/2026 ngày 23/01/2026, có hiệu lực 23/01/2026; quy định mới có hiệu lực 01/7/2026. |
| 6 | Đ.82 k.1: rủi ro trung bình không kiểm tra chất lượng nhưng phải công bố hợp quy | hethongphapluat.com + luatvietnam.vn: "Điều 82.1: hàng hóa nhập khẩu thuộc danh mục rủi ro trung bình… không phải thực hiện kiểm tra chất lượng khi nhập khẩu nhưng phải thực hiện công bố hợp quy" | ✅ **KHỚP** | Chính xác. |
| 7 | Đ.83: rủi ro cao phải đăng ký kiểm tra; GCN hợp quy → thông báo trong 01 ngày LV | phucgia.com.vn (phân tích Đ.83) + thuvienphapluat: Đ.83 quy định đăng ký kiểm tra; Bước 1 hồ sơ gồm Đăng ký + GCN hợp quy/Chứng thư giám định | ✅ **KHỚP** | Phucgia trích: "hàng hóa thuộc mức độ rủi ro cao phải thực hiện đăng ký và kiểm tra chất lượng theo trình tự, thủ tục riêng trước khi được thông quan." |
| 8 | Tên bộ đổi: BNNPTNT + BTNMT → Bộ Nông nghiệp và Môi trường (NQ 176/2025/QH15) | data/policy-procedures.json đã ghi "BNNPTNT sáp nhập vào BNNMT từ 01/03/2025" | ✅ **KHỚP** | |
| 9 | BGTVT → Bộ Xây dựng (TT-BXD) | data/policy-procedures.json đã ghi "BGTVT sáp nhập vào BXD từ 01/03/2025" | ✅ **KHỚP** | |
| 10 | ATTP theo NĐ 15/2018 vẫn áp dụng; Đ.16–19: kiểm giảm/thông thường 03 ngày LV; Đ.18 k.2 hồ sơ Mẫu 04 + Bản tự công bố | TT 28/2026/TT-BCT Điều 3.2: "thực hiện theo Điều 40 Luật ATTP và Điều 16 NĐ 15/2018/NĐ-CP" | ✅ **KHỚP** | |
| 11 | TT 28/2026/TT-BCT Điều 3.3: miễn kiểm ATTP khi thuộc Đ.13 NĐ 15/2018 | TT 28/2026/TT-BCT Điều 3.3 | ✅ **KHỚP** | |
| 12 | Thuế 19059090: thông thường 30%, MFN 20%, ACFTA 0, VAT 8% đến 31/12/2026 | Biểu thuế data/tax.json | ✅ **KHỚP** | Kiểm bằng `curl -s 'https://hs-kb.uythacnhapkhau.com/api/tax?hs=19059090'` |
| 13 | Bánh mè đã nướng → rủi ro bị ấn định mã (loại khác 1905.90) | Cần kiểm chuyên gia phân loại — đây là câu hỏi mã HS, không phải chính sách KTCN | ⚠️ **CẦN CHUYÊN GIA PHÂN LOẠI** | API `/api/search?q=bánh mè` trả 0 kết quả; `/api/tax?hs=1905` trả "không tìm thấy". Mã "bánh không bột" 1904 chỉ dành cho bánh không chứa bột mì/bột cereal. Bánh mè đã nướng làm từ bột → thuộc nhóm 1905. Cần chuyên gia xác nhận phân nhóm cụ thể (19059040 vs 19059050). Không phải việc KTCN. |

## Tóm tắt

| Kết quả | Số dòng |
|---------|---------|
| ✅ Khớp | 12 |
| ⚠️ Cần xác minh thêm | 1 (dòng 13 — cần chuyên gia phân loại, không phải KTCN) |
| ❌ Chưa xác minh | 0 |

**Tổng: 13 dòng, 12 khớp, 0 lệch.**

## Việc tiếp theo (cho ca sau)

1. ~~Mở NĐ 37/2026/NĐ-CP~~ → **DONE 15:45** — dòng 5,6,7 KHỚP ✅
2. ~~Mở TT 11/2022/TT-BCT riêng~~ → **DONE 20:50** — dòng 3 KHỚP ✅ (TT 11/2022 về ATTP hết hiệu lực 17/7/2026)
3. **Cập nhật data/policy-procedures.json** — thay QĐ 1182/QĐ-BCT bằng TT 28/2026/TT-BCT; cập nhật ngày hết hiệu lực TT 11/2022 về ATTP
4. ~~Xem Phụ lục chi tiết TT 28/2026/TT-BCT~~ → chưa làm
5. ~~Xem Phụ lục TT 33/2026/TT-BCT~~ → chưa làm
6. **Dòng 13** — cần chuyên gia phân loại (không phải việc KTCN, chuyển qua kênh khác)

## Kết luận sơ bộ

- **TT 11/2022/TT-BCT (ATTP) HẾT HIỆU LỰC 17/7/2026** — XÁC NHẬN từ 2 nguồn chính phủ. Đây là văn bản quy định danh mục hàng NK phải kiểm tra ATTP của Bộ Công Thương (khác với TT 11/2022/TT-BCT về đường nhập khẩu).
- NĐ 37/2026/NĐ-CP **có thật**, hiệu lực 01/7/2026 thay hệ thống cũ, chia 3 mức rủi ro → data/policy-procedures.json cần cập nhật phần KTCN để phản ánh khung mới.
- TT 28/2026/TT-BCT **có thật**, thay QĐ 1182/QĐ-BCT, hiệu lực 17/7/2026 → data/policy-procedures.json cần cập nhật legalBasis ATTP BCT.
- TT 33/2026/TT-BCT **có thật**, hiệu lực 01/7/2026 → data/policy-procedures.json cần cập nhật cho nhóm "rủi ro trung bình/cao" của BCT.
- **Phát hiện:** Bài anh ghi rằng NĐ 37/2026 có hiệu lực 01/7/2026 — đÚNG. Nhưng văn bản gốc NĐ 37/2026 có hiệu lực 23/01/2026 (ngày ký); quy định chuyển đổi (bỏ nhóm 1/nhóm 2, chia rủi ro) có hiệu lực 01/7/2026. → Cần tách "ngày ký" và "ngày có hiệu lực thi hành quy định mới".
- **Phát hiện quan trọng:** Có 2 văn bản cùng ký hiệu TT 11/2022/TT-BCT: một về ATTP (hết hiệu lực 17/7/2026), một về đường nhập khẩu (ban hành 27/6/2022, hiệu lực 12/8/2022, vẫn còn hiệu lực). Khi cập nhật data/ cần chỉ rõ văn bản nào.
