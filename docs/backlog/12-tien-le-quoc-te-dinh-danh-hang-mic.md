# Bước 12 — Tiền lệ quốc tế, định danh hàng hoá và nguồn Made-in-China

> Phát sinh 15/10/2026 sau case study glovebox MBraun MB-200MOD qua Cổng MCP
> (CEO phản biện 2 vòng: lượt 1 sai 8479.89.69 vì xếp mã khi chưa bóc nguyên lý
> hoạt động; lượt 2+3 sửa thành 8421.39.90 bằng chuỗi bằng chứng quốc tế phải tự
> ra ngoài tìm) + **chỉ thị CEO bổ sung nguồn Made-in-China 15/10 chiều**.
> Trạng thái: **ĐANG TRIỂN KHAI — sóng P0 (B-3, C-2, C-4) xong 15/10; sóng kế: A-1 + A-2.**

## ĐÃ LÀM (thực chứng 15/10, không làm trùng lại)

1. **Ba công thức fetch đã kiểm chứng chạy thật:**
   - CBP CROSS: web là SPA (fetch HTML chỉ ra footer) nhưng
     `GET https://rulings.cbp.gov/api/ruling/{ID}` (UA browser, `Accept: application/json`)
     trả `{text: toàn văn ruling}` — đã verify M82907 nguyên văn 4.531 ký tự. **Public domain** (tác phẩm chính phủ Mỹ).
   - ABF TCO (Úc): `…/tariffconcessionorders.aspx?tcn={mã 6 số}` — WebFetch bị 403,
     headless server-side OK; bảng `Tariff Classification | TCO Number | TCO description | Operative date`
     parse được (TCO 1679759 "GLOVE BOXES, laboratory… incorporating a gas purification system"
     nguyên văn + cả dòng isolator 2016–2024 + cartridge lọc O₂/ẩm 1679803).
   - WCO OP corroboration công khai: janronconsult.com tái bản Compendium Ch.84
     khớp OCR nội bộ → đóng được cờ `daSoatAnh` kiểu nguồn B tạm.
2. **Phễu định danh hàng 5 bước đã chạy tay thành công** (case glovebox):
   model+HSX (EN) là chìa khoá → khung thuộc tính → tam giác kiểm chứng →
   dịch sang ngôn ngữ chức năng biểu thuế → mới tra tiền lệ + phễu 2/4→6→8.
   Bài học: tên tiếng Việt tra bằng `tim_ma_hs` cho kết quả sai lệch hoàn toàn
   ("hộp găng tay" → găng may mặc); mô tả chức năng ("sealed chamber + glove ports
   + gas purification") mới trúng tiền lệ.
3. **Tham chiếu kỹ thuật nguồn C sẵn có:** repo `ozsource` (private) đã có
   `src/lib/capture/made-in-china.ts` (thuần, test bằng fixture) +
   `extractMadeInChina()` trả `ProductPayload` schemaVersion 2: `title, gallery,
   price (USD), shop, specs[], minOrderQty, skuId, hsCodeHint` — nền tảng trực
   tiếp cho crawler máy chủ.

## Nguyên tắc bất biến của toàn bước

1. **MCP/API chỉ đọc DB cục bộ** — không bao giờ scrape web trong luồng phục vụ
   (fetch ngoài thất bại ~50% số lần thử 15/10; classify đã chịu trần 90 s).
   Crawler là job offline (cron), đổ vào `data/`, đi luồng merge-community sẵn có.
2. **Dữ kiện ≠ bằng chứng.** HS 10 số do người bán MiC tự khai, mã trong TCO do
   người đề xuất, trade data (Zauba…) là **tín hiệu (signal)** cho xếp hạng/gợi ý.
   Chỉ GIR + chú giải + biểu thuế + tiền lệ pháp lý (TB-TCHQ, WCO OP, BTI, phán
   quyết) là **bằng chứng** được chốt mã. Thiếu bằng chứng → `NEED_FACTS` /
   `NEEDS_EXPERT` (đúng điều kiện CEO chốt 14/10).
3. Mọi bản crawl mang `snapshotHash + retrievedAt + license + nguồn`;
   precedents hiển thị **mức kiểm chứng** (sourceUrl đã mở lại chưa).
4. Bản quyền: WCO OP/EN + SEN **chỉ** nằm repo này (quyết định 13/10, KHÔNG nhân
   đôi sang oz-wiki); CBP public domain; ABF/Commonwealth ghi attribution; EU BTI
   rà điều khoản tái sử dụng trước khi mirror.

## VIỆC MỞ RỘNG

### PHẦN A — Stage `dinh_danh_hang` (định danh hàng trước khi phân loại)

Phễu 5 bước: (1) truy vết bằng **model + HSX tiếng Anh** (trang NSX → manual PDF
thường ở commons phòng lab → marketplace đấu giá → trang thiết bị viện nghiên
cứu); (2) đóng **khung thuộc tính theo template chương** (chức năng chính, nguyên
lý hoạt động, cấu thành module, công suất/điện áp, vật liệu, ngữ cảnh) — dùng
CHUNG schema với template khai báo TT 39 (`machineryGeneric`…): hiểu hàng xong
thì các trường khai báo tự đầy; (3) **tam giác kiểm chứng**: 1 nguồn phụ =
HYPOTHESIS, 2 nguồn độc lập khớp = CORROBORATED, tài liệu sơ cấp NSX = VERIFIED;
(4) dịch sang ngôn ngữ chức năng biểu thuế; (5) mới vào phễu 2/4→6→8 + tiền lệ.

| ID | Việc | Ưu tiên | Ước lượng | Nghiệm thu |
|---|---|---|---|---|
| A-1 | **Schema khung thuộc tính dùng chung** `data/attribute-frames.json`: định nghĩa frame theo chương (mở rộng template TT 39 sẵn có: thêm `nguyenLyHoatDong`, `cauThanhModule`, `nguon[]` với nhãn HYPOTHESIS/CORROBORATED/VERIFIED + URL + retrievedAt) | P1 | 1–2 ngày | Frame của case glovebox (MBraun) + 2 case khác (1 máy TQ, 1 hàng tiêu dùng) điền được đủ trường; test schema |
| A-2 | **Endpoint `POST /api/identify`** (não: M3, thinking off): nhận `{tenHang, model, thuongHieu, moTa, anhUrl[]}` → trả frame có nhãn kiểm chứng + danh sách nguồn; ảnh đi M3 multimodal đọc nameplate/model plate (đã đo 1,4–2 s, backlog 09) | P1 | 3–5 ngày | 20 mẫu vàng gồm 5 món chỉ có ảnh nameplate; ≥80% frame đạt CORROBORATED trở lên; p50 < 30 s |
| A-3 | **Cổng MCP tách tool `dinh_danh_hang`** chạy trước `phan_loai_hs`: `phan_loai_hs` nhận frame làm đầu vào; cập nhật `instructions`/`sinhSkill()` dạy thứ tự gọi; frame thiếu trường bắt buộc → trả NEED_FACTS đúng hợp đồng đang thiết kế | P1 | 2–3 ngày | Bộ đàm thoại mẫu qua Cổng: tên nghèo nàn → tool hỏi đích danh → frame đầy → phan_loai_hs chốt kèm bằng chứng |

### PHẦN B — Kho tiền lệ quốc tế (kiến trúc 3 tầng)

Tầng 1 mirror đầy (crawler offline, cron): CBP CROSS + ABF TCO (WCO đã có sẵn
trong kho). Tầng 2 cache-on-demand: EU BTI, UK, Canada. Tầng 3 live-only không
lưu (trang luật sư, gazette). Tất cả đổ vào `data/community/intl-precedents/`
theo schema `precedents.json` + trường mở rộng.

| ID | Việc | Ưu tiên | Ước lượng | Nghiệm thu |
|---|---|---|---|---|
| B-1 | **Crawler CBP CROSS**: khảo sát cách enumerate danh sách ruling ID (sitemap/search API) → bóc qua `/api/ruling/{ID}` → lọc nhóm 84+85 + từ khoá ngành → `data/community/intl-precedents/cbp/*.json` | P1 | 2–3 ngày | ≥1.000 ruling chéo ngành máy móc; mẫu M82907 trong kho khớp nguyên văn API; validate-community 0 lỗi |
| B-2 | **Crawler ABF TCO**: duyệt `?tcn=` toàn bộ mã 6 số liên quan (84, 85, 90…), headless, parse bảng TCO → lô `abf/*.json` kèm attribution | P1 | 2 ngày | Toàn bộ TCO nhóm 84+85 trong kho; TCO 1679759 nguyên văn; license ghi đúng |
| B-3 ✅ (15/10) | **`merge-community` nhận loại mới `intl-precedent`**: schema (country, instrumentType: RULING/TCO/BTI/OP, snapshotHash, retrievedAt, license, verbatimText) + validate + CI sync-doc-counts như luật TB-TCHQ | P0 (chặn B-1/B-2 gộp) | 1–2 ngày | Lô thử 10 bản ghi qua đầy đủ validate → merge → test xanh |
| B-4 | **Tìm kiếm chéo nguồn theo mô tả chức năng**: `/api/precedents` mở rộng index tiền lệ quốc tế, query tiếng Anh chức năng ("sealed chamber gas purification") trả WCO OP + CBP + ABF + TB-TCHQ xếp hạng cùng bảng | P1 | 2–3 ngày | Truy vấn case glovebox trả đúng bộ 3 (WCO 8421.39/1, M82907, TCO 1679759) trong top 5 |
| B-5 | **Soát ảnh WCO OP** (`daSoatAnh`): đối chiếu bản scan Compendium gốc cho các opinion đang được dẫn trong hồ sơ thật; dùng nguồn công khai corroborate làm NGUON_B tạm | P2 | theo lô | Opinion 8421.39/1 đạt daSoatAnh=true kèm ảnh gốc |
| B-6 | **Cache-on-demand EU BTI/UK/Canada**: fetcher recipe từng nguồn (URL pattern, UA, extraction, fallback) + cache TTL 30 ngày + snapshotHash | P2 | 3–4 ngày | Truy vấn "glove box" BTI trả kết quả có nhãn nguồn + ngày lấy |
| B-7 | **Nhãn mức kiểm chứng cho precedents**: trường `xacMinh` (sourceUrl đã mở lại tự động chưa) hiển thị ở API + Cổng — CEO đã đồng ý hướng 15/10 | P1 | 1 ngày | Mọi record precedents trả kèm xacMinh; tối ưu ưu tiên soi các record đang được cite |

### PHẦN C — Nguồn Made-in-China (CEO bổ sung 15/10)

**Vai trò trong phễu:** lối vào tự nhiên của bước 1–2 phần A — tìm hàng qua **tên
hàng, model, và các sản phẩm có tính năng tương tự**; trang cửa người bán
(storefront) có **đủ thông số kỹ thuật, thậm chí cả HS code 10 số**. Ba giá trị:
(i) điền khung thuộc tính cho máy TQ (đa số khách Oz), (ii) HS 10 số TQ = 8 số
đầu khớp WCO → sinh **ứng viên nhóm** + từ vựng chức năng cho tra tiền lệ,
(iii) ví dụ khẳng định (`viDu`) cho 3.121 dòng "Loại khác" + confusion-pairs.

| ID | Việc | Ưu tiên | Ước lượng | Nghiệm thu |
|---|---|---|---|---|
| C-1 | **Port bộ bóc MiC sang máy chủ**: chuyển `src/lib/capture/made-in-china.ts` (ozsource — thuần, test bằng fixture) sang crawler Node (linkedom/cheerio), giữ nguyên `ProductPayload` schemaVersion 2 (`specs, hsCodeHint, price, minOrderQty, shop, gallery, skuId`); thêm adapter **tìm kiếm** MiC (tên hàng/model/similar) chứ không chỉ trang chi tiết | P1 | 3–4 ngày | Crawl 100 URL sản phẩm mẫu (đủ ngành) → 0 lỗi schema; fixture test port từ ozsource sang giữ nguyên |
| C-2 ✅ (15/10) | **Lớp tín hiệu MiC**: bảng map HS 10 số TQ → ứng viên 6 số WCO → dòng 8 VN; ghi vào kho là `signal` (rank hint) KHÔNG phải evidence; rule chặn trong engine: không bao giờ chốt mã chỉ vì MiC hsCodeHint | P0 (chặn dùng sai bằng chứng) | 2 ngày | Test: classify có MiC hint sai vẫn không bị kéo theo; hint đúng thì ranking cải thiện đo được trên 80 mẫu vàng |
| C-3 | **Tương tự theo tính năng (similar products)**: từ khung thuộc tính tìm sản phẩm MiC cùng tính năng → sinh từ vựng chức năng EN cho bước tra tiền lệ + `viDu` cho dòng "Loại khác" (đi luồng duyệt lô, không bao giờ DETERMINISTIC — đúng luật #195) | P2 | 3 ngày | 20 dòng "Loại khác" hay gặp có ≥3 viDu có nguồn; máy kiểm trích dẫn pass |
| C-4 ✅ (15/10) | **Tuân thủ crawl MiC**: tôn trọng robots.txt, giới hạn QPS, cache riêng TTL dài, chỉ giữ trường dữ kiện + URL nguồn + retrievedAt (không sao chép gallery/mô tả dài vào kho công khai — dữ kiện số liệu không có SHTT nhưng nội dung sáng tạo có) | P0 (chặn C-1 chạy) | 0,5 ngày | Crawler có rate limiter + robots check trong code + test |

### Thứ tự khởi động đề xuất

1. **B-3 + C-2 + C-4** (3 thẻ P0 — luật/anh giữ cho phần còn lại không làm sai).
2. **A-1 + A-2** (stage định danh — giá trị thấy được ngay cho khách Cổng).
3. **B-1 + B-2** (2 crawler mirror chạy đêm 1 lần lấy số liệu nền).
4. **B-4 + A-3 + B-7** (nối vào Cổng MCP + tìm kiếm chéo).
5. Phần còn lại P2 theo nhu cầu.

## DUY TRÌ THEO THỜI GIAN

| Việc | Chu kỳ | Ghi chú |
|---|---|---|
| Re-crawl CBP CROSS (ruling mới nhóm 84/85/90) | hàng tháng | diff theo ID mới + amended |
| Re-crawl ABF TCO | hàng tháng | TCO mới/bị thu hồi (cột operative/revoked) |
| Cache EU BTI/UK/CA flush | TTL 30 ngày | theo demand |
| Re-crawl MiC theo SKU theo dõi | TTL 90 ngày / theo demand | chỉ trang đang được cite |
| Bảng license + nguồn | mỗi lô | kiểm tra thay đổi điều khoản tái sử dụng |

## KPI

- `% ca phân loại có frame định danh CORROBORATED+` (mục tiêu ≥70% sau quý đầu).
- `Đ8` trên tập con có frame đầy đủ so với tổng thể (kỳ vọng chênh +8–12 điểm,
  cùng bối với #195).
- `p50` `/api/identify` < 30 s; p90 < 60 s.
- Tiền lệ quốc tế: số nguồn đồng thuận hiển thị được trong từng kết quả
  `phan_loai_hs` (WCO/BTI/CBP/ABF/TB-TCHQ).
- 0 ca chốt mã chỉ trên tín hiệu MiC (test chặn C-2 luôn xanh).
