# Soát độ mới dữ liệu — 11/2026

Ngày soát: **11/11/2026**. Lý do: `/api/health` báo `dataStatus: stale` vì `data/data-freshness.json` có các nguồn
quá hạn đối chiếu. Phạm vi: `tariff`, `precedents`, `legalDocs`, `ktcnLists`, `plhqRegistry`, `ministries`.
`vatReduction` do việc khác xử lý — không soát ở đây (chỉ ghi một điểm liên quan ở mục 1.5).

## Cách đọc nhãn

| Nhãn | Nghĩa |
|---|---|
| **ĐÃ KIỂM – NGUỒN GỐC** | Đã đọc toàn văn bản gốc trên cổng Chính phủ (datafiles/vanban.chinhphu.vn) trong lần soát này. |
| **ĐÃ KIỂM – TRANG CHÍNH THỐNG** | Đã mở trang thông tin văn bản trên cổng chính thống (số, ngày, hiệu lực), chưa đọc phụ lục. |
| **SỔ PLHQ (NGUON_A)** | Lấy từ `data/plhq-registry.json` (bản đồng bộ 2026-11-09), mục mà kho cộng đồng ghi đã đối chiếu nguồn A, có căn cứ điều khoản + số Công báo. Lần soát này KHÔNG tự mở lại Công báo cho các mục này. |
| **THỨ CẤP** | Chỉ có trên báo, cổng tỉnh, trang luật tư nhân (luatvietnam, thuvienphapluat, …). Cần đối chiếu Công báo trước khi sửa dữ liệu. |
| **CHƯA XÁC MINH** | Chỉ thấy tiêu đề trong kết quả tìm kiếm, không mở được nội dung. |

Lưu ý phương pháp: tra cứu bằng công cụ tìm kiếm web + mở trang. Không duyệt tuần tự từng số Công báo; customs.gov.vn trả
503, thuvienphapluat.vn trả 403 khi mở trực tiếp. Có thể còn văn bản chưa thấy.

## Tóm tắt — việc gấp

1. **KHẨN – thuế NK ưu đãi (MFN) xăng dầu đang 0% nhưng `tax.json` trả 2–10%.** NĐ 72/2026/NĐ-CP (0% từ 09/3/2026) đã được
   kéo dài bởi NQ 25/2026/NQ-CP (tới 30/6/2026) và **NQ 43/2026/NQ-CP (từ 01/10/2026 đến hết 31/12/2026)** — đã đọc toàn văn
   NQ 43. Ít nhất 15 dòng (biểu thuế Tổng cục ghi chú "0% từ 09/3-30/4 theo NĐ72") + 3 dòng của Điều 2 NQ 25 (thứ cấp)
   đang sai thuế suất ở `/api/tax`.
2. **Biểu thuế chưa có cột VN–UAE CEPA** (NĐ 143/2026/NĐ-CP, ký và hiệu lực 05/5/2026, thuế suất 2026 áp từ 03/02/2026).
3. **NĐ 201/2026/NĐ-CP** (ngày 08/6/2026, hiệu lực 23/7/2026) sửa thuế XK một số khoáng sản/bismut — `bieu-chinh` còn `xk`
   cũ (vd 2529.22.00 còn 10%, mới 5%). API hiện không trả thuế XK nên mức ảnh hưởng thấp hơn mục 1.
4. **`legal-docs.json` lệch sổ văn bản**: 69/2018/NĐ-CP (đã bị NĐ 292/2026 thay từ 05/9/2026), 23/2019/QĐ-TTg (bị
   31/2026/QĐ-TTg thay từ 14/8/2026), TT 12/2022 + 62/2024/TT-BGTVT, TT 29/2025/TT-BKHCN… vẫn ghi `ACTIVE`/`AMENDED`.
5. **Tiền lệ**: bản ghi mới nhất trong `precedents.json` là 20/8/2026. Từ 15/9/2026 TT 85/2026/TT-BTC thay TT 14/2015 —
   đã thấy thông báo phân loại ký hiệu mới `…/TB-KĐHQ` (tháng 10/2026) mà bộ nạp hiện chưa có dạng này.

Đã sửa trong PR này: tên BTC trong `ministries-vn.json` (Tổng cục Hải quan → Cục Hải quan); cập nhật `lastCheckedAt` +
`ghiChuSoat` cho `ktcnLists` và `ministries`. **Không** cập nhật ngày cho `tariff`, `precedents`, `legalDocs` (còn việc
sửa dữ liệu). `plhqRegistry` chưa quá hạn (xem mục 5).

---

## 1. Biểu thuế (`tariff`) — lastCheckedAt 2026-05-27 → **CẦN SỬA DỮ LIỆU, không cập nhật ngày**

Dữ liệu hiện có: `data/tax.json` = bản `v2-2026-04-05-cs` (giá trị thuế giữ từ `v1-2026-01-01`; cột `cs` theo biểu thuế
Tổng cục 2026.04.05). `data/bieu-thue/2026.04.05/` là bản trích biểu thuế Tổng cục cập nhật đến 05/4/2026.

### 1.1 Xăng dầu: 0% MFN đang hiệu lực đến 31/12/2026 — KHẨN

| Văn bản | Ngày | Hiệu lực | Nội dung | Nhãn |
|---|---|---|---|---|
| NĐ 72/2026/NĐ-CP | 09/3/2026 | 09/3/2026 | Sửa thuế suất NK ưu đãi một số mặt hàng xăng, dầu, nguyên liệu SX xăng dầu (Phụ lục II NĐ 26/2023) về 0%; ban đầu áp tới 30/4/2026 | ĐÃ KIỂM – TRANG CHÍNH THỐNG ([vanban.chinhphu.vn](https://vanban.chinhphu.vn/?docid=217144&pageid=27160)); PDF gốc là ảnh quét, chưa đọc được danh mục mã |
| NQ 25/2026/NQ-CP | 30/4/2026 | 01/5/2026 | Kéo dài NĐ 72 tới 30/6/2026; theo báo, Điều 2 thêm 0% cho 2710.19.20, 2710.19.89, 2711.19.00 | Số/ngày: ĐÃ KIỂM – TRANG CHÍNH THỐNG ([vanban.chinhphu.vn](https://vanban.chinhphu.vn/?docid=217967&pageid=27160)); danh sách 3 mã: THỨ CẤP ([Vietnam Law Magazine](https://vietnamlawmagazine.vn/import-duty-cuts-to-0-per-cent-for-certain-fuel-products-extended-until-june-30-79364.html)) |
| NQ 34/2026/NQ-CP | ~07/2026 | 01/7–30/9/2026 (theo báo) | Kéo dài tiếp tới 30/9/2026 | CHƯA XÁC MINH (chỉ thấy trên báo, vd [lsvn.vn](https://lsvn.vn/chinh-thuc-keo-dai-thoi-han-ap-dung-uu-dai-thue-voi-mat-hang-xang-dau-den-30-9-2026-a175223.html)); NQ 43 không dẫn NQ 34 trong phần căn cứ |
| **NQ 43/2026/NQ-CP** | 30/9/2026 | 01/10/2026 – 31/12/2026 | Điều 1: "Kéo dài thời hạn áp dụng Nghị quyết số 25/2026/NQ-CP … và Nghị định số 72/2026/NĐ-CP … đến hết ngày 31 tháng 12 năm 2026." | **ĐÃ KIỂM – NGUỒN GỐC** ([PDF datafiles.chinhphu.vn](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/9/43_2026_nq-cp_30092026_1-signed.signed.pdf)) |

Các dòng `tax.json` bị ảnh hưởng — biểu thuế Tổng cục 2026.04.05 ghi ở cột MFN "(0% từ 09/3-30/4 theo NĐ72)", còn
`tax.json` chỉ giữ số trước ngoặc:

| Mã | Mô tả (rút gọn) | `mfn` trong tax.json | Đang áp |
|---|---|---|---|
| 27073000 | Xylen | 3 | 0 |
| 27090020 | Condensate | 3 | 0 |
| 27101221, 27101222, 27101224, 27101225 | Xăng động cơ (chưa pha chế / pha ethanol) | 10 | 0 |
| 27101280 | Naphtha, reformate, chế phẩm pha chế xăng | 10 | 0 |
| 27101971, 27101972 | Nhiên liệu diesel | 7 | 0 |
| 27101979 | Dầu nhiên liệu | 7 | 0 |
| 27101981, 27101982 | Nhiên liệu động cơ máy bay | 7 | 0 |
| 27101983 | Kerosine khác | 7 | 0 |
| 29024300 | p-Xylen | 3 | 0 |
| 29029090 | Hydrocarbon mạch vòng loại khác | 2 | 0 |
| 27101920, 27101989, 27111900 | (Điều 2 NQ 25 — THỨ CẤP) | 5 | 0 (cần kiểm toàn văn NQ 25) |

Danh sách 15 dòng đầu lấy từ ghi chú của biểu thuế Tổng cục (dữ liệu repo), chưa đối chiếu được với phụ lục NĐ 72 (bản
PDF trên cổng là ảnh quét). Nên OCR/đọc phụ lục NĐ 72 và toàn văn NQ 25 trước khi sửa.

**Đề xuất sửa (PR sau):**
- Không ghi đè `mfn` gốc (NĐ 26/2023 vẫn là mức "nền", sẽ quay lại từ 01/01/2027 nếu không gia hạn). Thêm trường mức
  tạm thời có thời hạn, ví dụ `mfnTamThoi: { muc: "0", tu: "2026-03-09", den: "2026-12-31", canCu: ["72/2026/NĐ-CP",
  "25/2026/NQ-CP", "43/2026/NQ-CP"] }`, và để `/api/tax` trả mức đang áp kèm cảnh báo hết hạn — giống cơ chế
  `vatReduction`.
- Thêm một mục vào `data-freshness.json` (vd `petroleumMfnZero`, `validUntil: 2026-12-31`, `warnBeforeDays: 45`) để
  health tự báo khi sắp hết hạn.
- Ghi quan hệ "sửa đổi" 72/2026, 201/2026 → 26/2023 vào sổ PLHQ (sổ hiện chỉ có 72/2026; chưa có NQ 25/2026, 201/2026,
  143/2026).

### 1.2 VN–UAE CEPA — NĐ 143/2026/NĐ-CP (chưa có cột trong dữ liệu)

- Biểu thuế NK ưu đãi đặc biệt thực hiện CEPA Việt Nam – UAE giai đoạn 2026–2027; ký 05/5/2026, hiệu lực từ ngày ký
  đến hết 31/12/2027; thuế suất 2026 áp từ 03/02/2026, 2027 áp từ 01/01/2027; tờ khai từ 03/02/2026 tới trước ngày
  hiệu lực được xử lý tiền thuế nộp thừa. Nhãn: **THỨ CẤP** ([luatvietnam](https://luatvietnam.vn/thue/nghi-dinh-143-2026-nd-cp-bieu-thue-nhap-khau-uu-dai-viet-nam-uae-2026-2027-434005-d1.html)); trang Công báo có
  trong kết quả tìm kiếm ([congbao.chinhphu.vn](https://congbao.chinhphu.vn/van-ban/nghi-dinh-so-143-2026-nd-cp-469481.htm)) nhưng chưa mở.
- Quy tắc xuất xứ kèm theo: TT 24/2026/TT-BCT (05/5/2026) — **THỨ CẤP** ([luatvietnam EN](https://english.luatvietnam.vn/circular-no-24-2026-tt-bct-dated-may-05-2026-of-the-ministry-of-industry-and-trade-providing-the-rules-of-origin-within-the-framework-of-the-compreh-433916-doc1.html)).
- Văn bản ban hành **trước** lastCheckedAt (27/5) nhưng dữ liệu chưa có: `bieu-chinh` 2026.04.05 không có cột UAE;
  `lib/fta*` không có mã FTA này.
- **Đề xuất:** chờ biểu thuế Tổng cục bản mới (có cột CEPA) rồi chạy lại skill `bieu-thue-xnk`; thêm FTA `uae_cepa`
  vào bảng FTA. Không tự nhập tay phụ lục.

### 1.3 Thuế xuất khẩu — NĐ 201/2026/NĐ-CP

- Ngày 08/6/2026, hiệu lực 23/7/2026; sửa thuế suất XK một số mặt hàng trong Biểu thuế XK của NĐ 26/2023; Điều 2 thay
  tên cơ quan trong NĐ 26/2023: "Bộ Kế hoạch và Đầu tư" → "Bộ Tài chính", "Bộ Giao thông vận tải" → "Bộ Xây dựng",
  "Bộ Thông tin và Truyền thông" → "Bộ Khoa học và Công nghệ". Nhãn: **THỨ CẤP** ([Tạp chí Thuế–Hải quan](https://thuehaiquan.tapchikinhtetaichinh.vn/sua-doi-thue-suat-xuat-khau-va-tham-quyen-quan-ly-mot-so-mat-hang-tu-ngay-2372026-158583.html),
  [VietnamPlus](https://www.vietnamplus.vn/dieu-chinh-thue-suat-thue-xuat-khau-cua-mot-so-mat-hang-post1115366.vnp)). Một bản tóm tắt tìm kiếm ghi ngày ký 28/6 — các nguồn khác ghi 08/6; cần đối chiếu.
- Mức mới theo bài báo: 2529.10.10, 2529.10.90, 2529.21.00, 2529.30.00 → 10%; 2529.22.00 → 5% (cũ 10%); bismut tách
  mã 10 số: phế liệu 8106.10.10.10, 8106.90.10.10 → 22%; xi măng bismut 8106.10.10.20, 8106.10.90.20, 8106.90.10.20,
  8106.90.90.20 → 0%; loại khác → 5%.
- Dữ liệu: `bieu-chinh` ghi `xk = 10` cho 25292200 (căn cứ 26/2023). `tax.json` không có cột thuế XK và API không trả
  thuế XK → ảnh hưởng thấp. **Đề xuất:** cập nhật khi nạp biểu thuế mới; ghi 201/2026 vào sổ PLHQ.

### 1.4 Dự thảo (chưa ban hành — không đổi dữ liệu)

- Dự thảo NĐ sửa đổi, bổ sung NĐ 26/2023 (Bộ Tài chính lấy ý kiến 25/8/2026): thuế XK một số mặt hàng, chương trình
  ưu đãi linh kiện ô tô (Điều 8)… **CHƯA BAN HÀNH** theo những gì tìm được ([xaydungchinhsach.chinhphu.vn](https://xaydungchinhsach.chinhphu.vn/du-thao-nghi-dinh-sua-doi-bo-sung-ve-bieu-thue-uu-dai-thue-danh-muc-hang-hoa-119260825151701972.htm)). Soát lại lần sau.
- Không thấy nghị định sửa NĐ 26/2023 về thuế NK ưu đãi ban hành tháng 9–10/2026 (tìm web, có thể sót).
- Về "NĐ 144/2024": sổ biểu thuế (`van-ban-bieu-thue.json`) đã ghi 144/2024/NĐ-CP, 199/2025, 73/2025, 108/2025,
  260/2025, 56/2026, 72/2026 là văn bản hiện hành của biểu thuế 2026.04.05 — không có gì mới ở nhóm này sau 27/5 ngoài
  các mục 1.1–1.3.

### 1.5 Ngoài phạm vi nhưng liên quan

- NQ 43/2026/NQ-CP Điều 2 cũng kéo dài NQ 19/2026/QH16 (thuế BVMT, GTGT với xăng dầu, nhiên liệu bay) tới 31/12/2026 —
  chuyển cho việc `vatReduction` và cột `bvmt`.

## 2. Tiền lệ phân loại (`precedents`) — lastCheckedAt 2026-09-24 → **CẦN BỔ SUNG, không cập nhật ngày**

Dữ liệu: 4.857 bản ghi; mới nhất 20639/TB-CHQ ngày 20/8/2026 (190 bản ghi dạng `TB-CHQ`).

Phát hiện:
- **TT 85/2026/TT-BTC** (hiệu lực 15/9/2026, thay TT 14/2015 — SỔ PLHQ NGUON_A, Công báo số 409 ngày 18/7/2026) đổi thủ
  tục: theo báo, gộp về một loại "Thông báo kết quả phân tích, phân loại" ([thuonghieucongluan](https://thuonghieucongluan.com.vn/thong-tu-85-2026-tt-btc-rut-ngan-thu-tuc-va-tao-thuan-loi-trong-phan-loai-hang-hoa-xuat-nhap-khau-a326949.html) — THỨ CẤP).
- Thông báo ký hiệu mới **`…/TB-KĐHQ`** (tháng 10/2026) — CHƯA XÁC MINH (chỉ thấy tiêu đề, thuvienphapluat trả 403):
  - 246/TB-KĐHQ (26/10/2026) — hỗn hợp chế phẩm hóa chất dạng bột, chất tạo liên kết trong mực in
  - 248/TB-KĐHQ (27/10/2026) — chất bôi trơn G60
  - 250/TB-KĐHQ (29/10/2026) — tân dược Konimag
- 07/TB-CHQ/2026 — xác định trước mã số, cáp đồng trục chưa gắn đầu nối (CHƯA XÁC MINH, [luatvietnam](https://luatvietnam.vn/xuat-nhap-khau/thong-bao-07-tb-chq-2026-ket-qua-xac-dinh-ma-so-cho-cap-dong-truc-chua-gan-dau-noi-426243-d6.html)).
- CV 23405/CHQ-NVTHQ (23/10/2026) — trả lời DN là **không đủ cơ sở xác định mã**; không phải tiền lệ, không nạp.

**Đề xuất:** (1) chạy lại nguồn nạp tiền lệ cho giai đoạn 21/8 → nay; (2) cho bộ nạp/`tbTchqNumber` nhận ký hiệu
`TB-KĐHQ` (và kiểm tra ai là cơ quan ban hành theo TT 85/2026 trước khi gắn nhãn); (3) không nhập hàng loạt khi chưa có
toàn văn; remap mã theo biểu hiện hành như quy trình cũ.

## 3. Văn bản chính sách (`legalDocs`) — lastCheckedAt 2026-07-02 → **CẦN SỬA, không cập nhật ngày**

So `data/legal-docs.json` (108 mục) với `data/plhq-registry.json` (bản 2026-11-09). Các mục dưới đây sổ PLHQ ghi đã hết
hiệu lực (toàn bộ hoặc một phần), có căn cứ NGUON_A, trong khi `legal-docs.json` còn `ACTIVE`/`AMENDED`:

| legal-docs.json | Trạng thái nên ghi | Thay bởi / từ ngày | Ảnh hưởng `cs` của tax.json |
|---|---|---|---|
| 69/2018/ND-CP | EXPIRED (REPLACED) | 292/2026/NĐ-CP, 05/9/2026 (Điều 65 khoản 1; Công báo số 456 ngày 03/8/2026) | 21 dòng |
| 23/2019/QD-TTG | REPLACED | 31/2026/QĐ-TTg, 14/8/2026 (Điều 5 khoản 1; Công báo số 393 ngày 14/7/2026) | **749 dòng** |
| 12/2022/TT-BGTVT | REPLACED | 49/2026/TT-BXD (bãi bỏ), 01/7/2026 | 1.315 dòng |
| 62/2024/TT-BGTVT | REPLACED | 49/2026/TT-BXD (bãi bỏ), 01/7/2026 | 1.315 dòng |
| 29/2025/TT-BKHCN (+ -PL1, -PL2) | REPLACED | 36/2026/TT-BKHCN, 01/7/2026 | 62 dòng |
| 01/2021/TT-BLDTBXH | REPLACED | 16/2026/TT-BNV, 28/7/2026 (sổ NGUON_A; `ktcn-regime` còn ghi LOW/"chưa xác minh" — nên nâng) | 123 dòng |
| 04/2021/TT-BXD | REPLACED | 11/2026/TT-BXD, 01/6/2026 | 34 dòng |
| 113/2017/ND-CP, 82/2022/ND-CP | REPLACED | 26/2026/NĐ-CP (Luật Hóa chất), 17/01/2026 | — |
| 1182/QD-BCT (+ -PL1) | AMENDED (hết hiệu lực một phần) | 28/2026/TT-BCT bãi bỏ một phần | — |
| 12/2018/TT-BTC *(mã sai, đúng là 12/2018/TT-BCT)* | AMENDED (sổ ghi hết hiệu lực một phần, hết hẳn 31/12/2026) | 48/2026/TT-BCT (05/9/2026) | — |
| 41/2019/TT-BCT, 42/2019/TT-BCT, 08/2023/TT-BCT | AMENDED (hết hiệu lực một phần) | 48/2026/TT-BCT | — |
| 37/2013/TT-BCT | AMENDED | 07/2026/TT-BCT (10/4/2026) | — |
| 2105/QD-BCT (+ -2025) | sổ ghi hết hiệu lực 16/6/2026 nhưng mức `CHUA_XAC_MINH` | 1309/QĐ-BCT | kiểm trước khi sửa |

Ghi chú:
- Runtime `/api/tax` đã gắn `policyBasisReview` từ sổ PLHQ cho cột `cs`, nên người dùng vẫn được cảnh báo; chỗ lệch là
  `legal-docs.json` (dùng cho `legalDocs`/`legalCitations`, `legal_status`).
- Văn bản mới nên thêm vào `legal-docs.json`: 292/2026/NĐ-CP (cấm XK/NK mới: thuốc lá điện tử, thuốc lá nung nóng, kim
  cương thô, hàng sản xuất bằng lao động cưỡng bức — theo [KPMG](https://kpmg.com/vn/vi/insights/2026/08/decree-292-on-implementation-of-foreign-trade-management-law.html), THỨ CẤP), 31/2026/QĐ-TTg, 48/2026/TT-BCT,
  42/2026/TT-BCT (hàng lưỡng dụng, hiệu lực 12/9/2026 — sổ ghi NGUON_THU_CAP), 85/2026/TT-BTC.
- **Đề xuất:** viết script đồng bộ trạng thái `legal-docs.json` từ sổ PLHQ (chỉ mục NGUON_A), thay vì sửa tay; sửa mã
  `12/2018/TT-BTC` → `12/2018/TT-BCT`, gộp các mục trùng (`765/QD-BCT …`, `01/2024/FT-BNNPTNT` …).
- Cột `cs` của tax.json dẫn 23/2019/QĐ-TTg ở 749 dòng: cần đối chiếu phụ lục 31/2026/QĐ-TTg rồi mới đổi.

## 4. Danh mục KTCN (`ktcnLists`) — lastCheckedAt 2026-10-04 → **đã soát, không thấy văn bản danh mục mới → cập nhật ngày**

Đã tìm: thông tư "Danh mục sản phẩm, hàng hóa có mức độ rủi ro trung bình, cao" và danh mục KT ATTP/kiểm dịch ban hành
sau 04/10/2026. Kết quả chỉ ra các thông tư cuối tháng 6/2026 đã có trong `ktcn-regime-2026.json` (33/2026/TT-BCT,
36/2026/TT-BKHCN, 27/2026/TT-BNNMT, 49/2026/TT-BXD…). Không thấy thông tư danh mục mới sau 04/10.

- NĐ 46/2026/NĐ-CP (ATTP) vẫn tạm ngưng theo NQ 15/2026/NQ-CP, tiếp tục áp NĐ 15/2018 — không thấy văn bản mới thay đổi
  việc này; Luật ATTP (sửa đổi) mới là dự thảo (27/7/2026), chưa thấy thông qua (THỨ CẤP).
- Văn bản liên quan nhưng không phải danh mục rủi ro: 292/2026/NĐ-CP, 42/2026/TT-BCT (lưỡng dụng), 31/2026/QĐ-TTg —
  đã đưa vào mục 3.
- Việc cũ vẫn mở (không phải phát hiện mới): chưa đối chiếu phụ lục mã HS của các TT 2026 để cập nhật cột `cs`;
  `ktcn-regime-2026.json` mục `bldtbxh-01-2021` (LOW) có thể nâng theo sổ PLHQ (NGUON_A).

Giới hạn: tìm qua web, không duyệt tuần tự Công báo — ghi rõ trong `ghiChuSoat`.

## 5. Sổ văn bản cộng đồng (`plhqRegistry`) — **chưa quá hạn, không sửa**

`data/plhq-registry.json` có `syncedAt` 2026-11-09 (workflow `plhq-sync` chạy hằng ngày). Manifest ghi `lastCheckedAt`
2026-11-05, `checkEveryDays` 7 → tới 11/11 mới 6 ngày, chưa DUE. `scripts/sync-plhq.mjs --touch-freshness` tự cập nhật
khi ≥ 6 ngày. Sổ còn thiếu: 143/2026/NĐ-CP, 201/2026/NĐ-CP, 25/2026/NQ-CP (đề xuất gửi lên kho oz-wiki-plhq).

## 6. Bộ ngành (`ministries`) — lastCheckedAt 2026-09-24 → **đã soát, sửa nhỏ, cập nhật ngày**

- Chính phủ nhiệm kỳ Quốc hội khoá XVI (2026–2031) được thông qua 07/4/2026 với **14 bộ, 3 cơ quan ngang bộ**, cùng danh
  sách như sau sắp xếp 03/2025 ([Nhân Dân](https://nhandan.vn/chinh-phu-nhiem-ky-quoc-hoi-khoa-xvi-co-14-bo-3-co-quan-ngang-bo-post953806.html), [VOV](https://vov.vn/chinh-tri/chinh-phu-nhiem-ky-moi-co-14-bo-va-3-co-quan-ngang-bo-post1281894.vov) — THỨ CẤP; số hiệu nghị quyết QH các báo ghi
  không thống nhất nên **không** ghi vào dữ liệu). Các bộ XNK trong `ministries-vn.json` (BCT, BCA, BYT, BKHCN,
  BVHTTDL, BXD, BTC, NHNN, BQP, BNNMT, BNV đang ACTIVE; BTTTT, BNNPTNT, BTNMT, BGTVT, BLĐTBXH là MERGED) khớp cơ cấu này.
- NĐ 201/2026 Điều 2 (mục 1.3) đổi tên bộ trong NĐ 26/2023 theo đúng các quan hệ kế thừa đã có trong tệp
  (BTTTT→BKHCN, BGTVT→BXD).
- **Đã sửa:** `BTC.fullNameVi` "Bộ Tài chính (Tổng cục Hải quan)" → "Bộ Tài chính (Cục Hải quan)"; thêm
  `renamedFromVi`, `effectiveDate` 2025-03-01, `legalBasis` (NĐ 29/2025/NĐ-CP; QĐ 382/QĐ-BTC ngày 26/02/2025 về Cục Hải quan
  trực thuộc Bộ Tài chính, hiệu lực 01/03/2025; sửa đổi bởi QĐ 2019/QĐ-BTC 11/6/2025) — THỨ CẤP, nhiều nguồn khớp
  ([Thời báo Tài chính](https://thoibaotaichinhvietnam.vn/tu-13-co-quan-hai-quan-se-hoat-dong-theo-co-cau-to-chuc-moi-171520.html), [luatvietnam](https://luatvietnam.vn/co-cau-to-chuc/quyet-dinh-382-qd-btc-cua-bo-tai-chinh-quy-dinh-chuc-nang-nhiem-vu-quyen-han-va-co-cau-to-chuc-cua-cuc-hai-quan-391519-d1.html)); chính repo
  cũng đã dùng ký hiệu `CHQ-NVTHQ`, `TB-CHQ` của Cục Hải quan.

## 7. Việc tiếp theo (theo thứ tự)

1. Thêm cơ chế thuế suất MFN tạm thời cho 15 (+3) dòng xăng dầu tới 31/12/2026 (mục 1.1) — sau khi đọc được phụ lục NĐ 72
   và toàn văn NQ 25.
2. Đồng bộ trạng thái `legal-docs.json` từ sổ PLHQ (mục 3); thêm văn bản mới.
3. Nạp tiền lệ 21/8 → nay, hỗ trợ ký hiệu `TB-KĐHQ` (mục 2).
4. Khi có biểu thuế Tổng cục mới: cột VN–UAE CEPA (NĐ 143/2026) và thuế XK theo NĐ 201/2026.
5. Xong 1–3 thì cập nhật `lastCheckedAt` của `tariff`, `legalDocs`, `precedents`.
