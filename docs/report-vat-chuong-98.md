# Report: 457 mã "thiếu VAT" — CEO review

> Trạng thái: **Cần CEO quyết định** (không phải bug — xem kết luận).
> Nguồn dữ liệu: `data/tax.json` (11.871 mã). Sinh báo cáo: `node scripts/report-vat-missing.mjs`.

## TL;DR (đọc 20 giây)

- Có **457/11.871 mã** cột `vat` **rỗng**.
- **100% trong số đó thuộc Chương 98** (mã ưu đãi thuế nhập khẩu riêng).
- Cả 457 mã đều **có thuế MFN**, chỉ **không có VAT** — và đây là **đúng bản chất biểu thuế**, không phải lỗ hổng dữ liệu.
- **Khuyến nghị:** giữ nguyên VAT rỗng cho Ch.98 + thêm 1 ghi chú/cờ trong response API để hệ thống gọi (ERP) hiểu là "tra VAT theo mã gốc Ch.1–97". Không cần enrich thủ công 457 dòng.

## Vì sao VAT rỗng ở Chương 98 là ĐÚNG

Chương 98 của Biểu thuế XNK Việt Nam (kèm theo Thông tư 31/2022/TT-BTC và các văn bản sửa đổi) **không phải là một chương hàng hóa độc lập**. Nó là danh mục **"mã riêng"** gán cho một số mặt hàng đã được phân loại ở Chương 1–97, nhằm hưởng **mức thuế suất thuế nhập khẩu ưu đãi riêng** (thường thấp hơn MFN thông thường).

Hệ quả:
- Ch.98 **chỉ quy định thuế nhập khẩu** (MFN/ưu đãi) → nên có `mfn`.
- **VAT không khai theo mã Ch.98** mà theo **mã HS gốc (Ch.1–97)** của chính mặt hàng đó → nên `vat` để trống là chuẩn.
- Ví dụ: `98041500 – Tôm hùm Na Uy` có MFN 27% (mã riêng), nhưng VAT của tôm hùm tra theo mã thủy sản gốc ở Chương 03.

## Bằng chứng số liệu

| Chỉ số | Giá trị |
|---|---|
| Tổng mã trong `tax.json` | 11.871 |
| Mã có cột `vat` rỗng | **457** |
| Trong đó thuộc Chương 98 | **457 (100%)** |
| Mã Ch.98 **có** MFN | 457 (100%) |
| Mã Ch.98 **thiếu** MFN | 0 |
| Mã rỗng VAT ngoài Ch.98 | **0** |

Phân bố theo nhóm 4 số (top): `9849` ống dẫn nhiên liệu/nhiệt/nước (239 mã), `9818` nắp chụp cách điện (48), `9834` bàn phím cao su (32), `9836` sơ mi rơ moóc (29), `9840` lõi kim loại (18), `9804` tôm (13)… — đều là mặt hàng sản xuất/gia công hưởng ưu đãi riêng.

## 3 phương án cho CEO

1. **Giữ nguyên + gắn cờ (khuyến nghị).** VAT rỗng ở Ch.98 là đúng. Thêm `vatNote: "Ch.98 mã riêng — VAT tra theo mã gốc Ch.1–97"` vào response `/api/tax` khi mã bắt đầu bằng `98`. Rẻ, đúng chuẩn, ERP không hiểu nhầm là thiếu dữ liệu. **Không đụng 457 dòng.**
2. **Map sang mã gốc.** Với mỗi mã Ch.98, ánh xạ tới mã HS gốc (Ch.1–97) rồi lấy VAT từ đó. Chính xác nhất cho người tra nhưng tốn công (mô tả Ch.98 không luôn kèm mã gốc → cần đối chiếu thủ công/AI, rủi ro sai).
3. **Điền cứng VAT.** Tự suy VAT cho từng mã. **Không nên** — dễ bịa, sai bản chất pháp lý.

## Việc tiếp theo nếu CEO chọn PA1

- Sửa `lib/tax-mapper.js`: khi `hs` bắt đầu `98`, gắn `vatNote` + để `vat: null` (thay vì chuỗi rỗng) cho rõ nghĩa.
- Cập nhật `docs/TONG-QUAN.md` mục "chất lượng dữ liệu": đánh dấu 457 mã Ch.98 là **đã giải trình** (không còn là "thiếu").
