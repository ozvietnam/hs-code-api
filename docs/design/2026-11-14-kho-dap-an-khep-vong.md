# Thiết kế Một trang (v2) — Kho đáp án khép vòng ("Cuốn sổ thứ tư", G5 · OZV-760)

- **Ngày:** 14/11/2026 (bản v2 — đã sửa đủ 6 điểm từ báo cáo soát độc lập `/paperclip/du-lieu/nghien-cuu/OZV-760-soat-doc-lap-thiet-ke.md`)
- **Người viết:** GĐ `hs-code-api` · **Thẻ:** [OZV-760](/OZV/issues/OZV-760) (con của [OZV-754](/OZV/issues/OZV-754))
- **Đã đối chiếu mã trên `main`:** `lib/classify-cache.js`, `db/migrations/0002_classify_cache.sql`, `api/classify.js`, `lib/b1b-web.js`, `lib/ho-so/api.js`, `api/feedback.js`, `lib/feedback-store.js`, `lib/embed-pool.js`, `scripts/build-hs-aliases.mjs`, `lib/subheading-check.js`, `lib/so-tay-gates.js`, `lib/kiem-truoc-chot.js`, `data/attributes.json`.

---

## 1. Số đo hiện trạng 7 ngày gần nhất & Kiểm chứng tại mã nguồn

### 1.1. Số đo thật 7 ngày trên `oz_gateway` (`phan_loai_cong_viec`, `loai = 'PHAN_LOAI'`, QT chạy 14/11: **511 lượt**)
| Khoá tra lại chặt dần | Số món khác nhau / 511 lượt | % lượt là HỎI LẠI món đã từng hỏi | Ý nghĩa thiết kế (Trả ĐÁP ÁN vs Dùng lại DỮ KIỆN) |
|---|---|---|---|
| **1. Băm y hệt (`bam_dau_vao` — `classify_cache` đang bắt)** | **410** | **19,8%** (~73,0 lượt/ngày) | Mức hiện tại đang cứu được. |
| **2. Chuẩn hoá `tenHang + thuongHieu`** | **232** | **54,6%** | Trần tối đa của **Dùng lại DỮ KIỆN** (`khoa_du_kien`: web B1b, ứng viên nhóm). |
| **3. `+ chatLieu`** | **288** | **43,6%** | Cùng tên + hãng + chất liệu nhưng còn khác công dụng / thông số. |
| **4. `+ congDung`** | **329** | **35,6%** | Cùng tên + hãng + chất liệu + công dụng nhưng khác thông số kỹ thuật (`thongSo`). |
| **5. `+ thongSo` (chặt nhất — đủ điều kiện mặt hàng)** | **401** | **21,5%** | Đích trung thực của **Dùng lại ĐÁP ÁN** (`khoa_dap_an`) ở Giai đoạn 1. |

- **Phát hiện cốt lõi từ số thật của QT:** Chênh lệch **33,1 điểm phần trăm** (`54,6%` vs `21,5%`) là các lượt **cùng tên hàng + thương hiệu nhưng khác thông số kỹ thuật** (vd hai máy bơm ly tâm cùng tên, một cái `0,37 kW`, một cái `7,5 kW`). Nếu bỏ `thongSo` khỏi khoá đáp án thì sẽ trả nhầm mã của lượt trước cho lượt sau mà động cơ không chạy nên không bao giờ phát hiện được `mau_thuan`. Do đó, thiết kế v2 **tách cứng**:
  - **21,5% → 25%** lượt trùng đủ cả `thongSo` + dữ kiện quyết định: **Dùng lại ĐÁP ÁN** (`khoa_dap_an`).
  - **20% → 33%** lượt trùng tên/hãng/model nhưng khác hoặc thiếu `thongSo`: **Chỉ dùng lại DỮ KIỆN đã tra** (`khoa_du_kien` — không tra web `B1b` lại, nhưng bắt buộc chạy động cơ để chốt mã theo đúng `thongSo` mới).
- **Hai số đo thực tế khác từ truy vấn 511 lượt của QT:**
  1. Món bị hỏi lặp nhiều nhất: **20 lần / 7 ngày** (tiếp theo: `16, 16, 8, 8, 7, 7, 6`); có **111 món** bị hỏi từ 2 lần trở lên.
  2. `503/511` lượt có trạng thái `XONG`, nhưng **0 lượt có trường mã HS trong `ket_qua`** của bảng `phan_loai_cong_viec` (khoá chính `ma_luot`, cột `dau_vao` dùng khoá `tenHang, thongSo, congDung, chatLieu, thuongHieu, xuatXu`) ⇒ không thể nạp ngược từ `phan_loai_cong_viec`. Nguồn nạp ngược khả thi duy nhất hiện có là bảng `classify_cache` trong DB `hs_code_api` (đang lưu `phan_hoi` JSONB đầy đủ).
- **Câu lệnh SQL chuẩn để đo lại trên `oz_gateway` (dùng đúng khoá chính `ma_luot` và khoá JSON thật):**
```sql
WITH raw AS (
  SELECT ma_luot, tao_luc, bam_dau_vao,
         lower(regexp_replace(coalesce(dau_vao->>'tenHang', ''), '\s+', ' ', 'g')) AS ten,
         lower(trim(coalesce(dau_vao->>'thuongHieu', ''))) AS hang,
         lower(trim(coalesce(dau_vao->>'chatLieu', ''))) AS chat_lieu,
         lower(trim(coalesce(dau_vao->>'congDung', ''))) AS cong_dung,
         lower(regexp_replace(coalesce(dau_vao->>'thongSo', ''), '\s+', ' ', 'g')) AS thong_so
  FROM phan_loai_cong_viec
  WHERE loai = 'PHAN_LOAI' AND tao_luc >= now() - interval '7 days'
)
SELECT count(*) AS tong_luot,
       round(100.0 * (count(*) - count(DISTINCT bam_dau_vao)) / NULLIF(count(*), 0), 1) AS pct_bam_y_het,
       round(100.0 * (count(*) - count(DISTINCT (ten, hang))) / NULLIF(count(*), 0), 1) AS pct_ten_hang,
       round(100.0 * (count(*) - count(DISTINCT (ten, hang, chat_lieu, cong_dung, thong_so))) / NULLIF(count(*), 0), 1) AS pct_du_thong_so
FROM raw;
```

### 1.2. Đối chiếu thực tế mã nguồn (đã sửa các chỗ hiểu lệch ở v1)
1. **`lib/classify-cache.js` & `api/classify.js:188`:** Đang băm `{attrs, hoSoKhaiBao, tier, kenhGoi, noiBo}` và chỉ mở cho `serviceCaller(req) !== null` (ghi chú `db/migrations/0002_classify_cache.sql`: tránh lộ `attrs` của khách này cho caller công khai khác). Tuy nhiên `ghiCache` hiện đang ghi cả lượt `NEED_FACTS` / `NEEDS_EXPERT` / `degraded` — `kho_dap_an` phải chặn lỗ hổng này.
2. **`brand` và `model` chưa vào `attrs` của `classify()`:** `data/attributes.json` hiện không có `brand`/`model`, nên `api/classify.js:117-160` chỉ đưa `brand, model` vào `attrsHoSo` mà không đưa vào `attrs` truyền xuống `classify()` ⇒ `lib/b1b-web.js:37,109` đọc `rawAttrs.brand`/`rawAttrs.model` bị rỗng. PR 1b phải truyền `thuongHieu: body?.thuongHieu || body?.brand || null` và `model: body?.model || null` vào `attrs`.
3. **`api/feedback.js` & `lib/feedback-store.js`:** Đã có sẵn luồng duyệt `reviewFeedback`, `bulkReviewFeedback`, `bulkApproveByPattern` (`status: 'pending' | 'approved' | 'rejected'`). Thiết kế v2 móc trực tiếp vào luồng duyệt sẵn có này, **không tạo đường duyệt feedback thứ hai**.
4. **`scripts/build-hs-aliases.mjs` (`CHAPTER_FORM`):** Nguồn của script này là `data/oz-gold-final.jsonl` (tập vàng do **người** chốt). **Tuyệt đối không đẩy bản ghi do máy chấm tự động vào `oz-gold-final.jsonl` hay `hs-aliases.json`** để tránh làm bẩn tập vàng bằng kết quả của mô hình.
5. **`lib/embed-pool.js` & `data/gd0/index-e5-small.json`:** Chỉ mục hiện có chỉ là vector cấp nhóm 4 số / phân nhóm 6 số (`vec4`, `vec6`), không phải vector từng mặt hàng, và cờ `HS_EMBED_POOL` mặc định đang `off`. Do đó tầng K3 (PR 3) phải dùng cột vector riêng trên bảng `kho_dap_an` với công tắc độc lập.

---

## 2. Cấu trúc một bản ghi ("Cuốn sổ thứ tư" — `db/migrations/0003_kho_dap_an.sql`)

Bảng `kho_dap_an` đặt trong Postgres kín `hs_code_api` (luật migration: chỉ thêm `CREATE TABLE/INDEX IF NOT EXISTS`, idempotent):

| Nhóm trường | Tên cột (`kho_dap_an`) | Kiểu & Quy tắc chuẩn |
|---|---|---|
| **1. Hai khoá tách biệt (Đáp án vs Dữ kiện)** | `khoa_dap_an` (`CHAR(64)` **PK**) · `khoa_du_kien` (`CHAR(64)` indexed) · `khoa_hang_model` (`VARCHAR(160)` indexed) · `tier` (`VARCHAR(16)`) | **`khoa_dap_an` (nghiêm):** `sha256` của `{tenChuan, chatLieuChuan, congDungChuan, chucNangChuan, thongSoChuan, xuatXuChuan, thuongHieuChuan, modelChuan, nameZhChuan, supplierHsChuan, factsChuan, duKienQuyetDinhChuan, tier}`. **`khoa_du_kien` (lỏng):** `sha256` của `{tenChuan, thuongHieuChuan, modelChuan}` — chỉ dùng để lấy lại dữ kiện `WEB`, **không dùng để trả mã**. |
| **2. Mô tả hàng đã lọc riêng tư** | `ten_chuan_vi` (`TEXT`) · `ten_zh_chuan` (`TEXT`) · `thong_so_chuan` (`TEXT`) · `vec_e5` (`REAL[]`) | Đã qua hàm `locRiengTuKhoDapAn()` (mục 4.2): **bỏ cột `ten_hang_goc`**, chỉ lưu chuỗi hàng hoá đã cắt sạch số tờ khai, invoice, đơn giá, số lượng. |
| **3. Dữ kiện + nguồn + ngày** | `du_kien` (`JSONB`) · `du_kien_quyet_dinh` (`JSONB`) | `du_kien`: mảng `[{fact, giaTri, donVi, nguon: 'KHACH'\|'WEB'\|'MAY_SUY'\|'CHAM', url, trichDoanWeb, ngayThuThap}]` (**bỏ `bangChung` nguyên văn của khách**; chỉ `nguon = 'WEB'` mới lưu `url` và `trichDoanWeb` công khai). `du_kien_quyet_dinh`: map `{[fact]: {giaTri, donVi}}` của các khoá bắt buộc theo `ranh-gioi` / `so-tay` nhóm đó. |
| **4. Mã 6/8 số & phản hồi chuẩn** | `ma_hs` (`VARCHAR(8)`) · `cap_da_chac` (`SMALLINT`) · `muc_chac` (`VARCHAR(20)`) · `phan_hoi_chuan` (`JSONB`) | `cap_da_chac` ∈ `{6, 8}` (thiếu dữ kiện quyết định dòng 8 số chỉ ghi 6 số). `phan_hoi_chuan`: lưu khối `{results, girRulesApplied, candidates, ecus, hoSo}` đã lọc sạch thông tin tờ khai riêng để dựng lại phản hồi (mục 5.1). |
| **5. Căn cứ sổ & phiên bản** | `can_cu` (`JSONB`) · `phien_ban_bieu` (`VARCHAR(20)`) · `hash_so_tay` (`CHAR(16)`) | `{soTayNhom, ranhGioiPn6, dieuKienSo, tienLeTb, gir}` + `phienBanDuLieu()` (`2026.04.05`) + băm ngắn của `data/so-tay/<nhom4>.json` và `data/ho-so/ranh-gioi/<pn6>.json`. Đổi `phien_ban_bieu` ⇒ quét hạ trạng thái về `CHO_CHAM` một lần mỗi tiến trình (giống `donPhienBanCu`). |
| **6. Trạng thái & kiểm chứng** | `trang_thai` (`VARCHAR(16)`) · `mo_hinh_cham` (`VARCHAR(80)`) · `ngay_cham` · `mau_thuan` (`JSONB`) · `so_lan_gap` (`INT`) · `han_xem_lai` (`TIMESTAMPTZ`) | `trang_thai` ∈ `{'CHI_DU_KIEN', 'NHAP', 'CHO_CHAM', 'DUYET'}`. `mau_thuan`: mảng `[{maHs, capDaChac, ngay, lyDo}]` (**không lưu `luotId`**). **Không có cột `phan_hoi` thô từ feedback**. |

---

## 3. Tách rõ "Dùng lại ĐÁP ÁN" vs "Dùng lại DỮ KIỆN" & Khi nào CẤM dùng lại

| Cơ chế | Khoá & Điều kiện khớp | Hành vi khi trúng | Động cơ `classify()` có chạy không? |
|---|---|---|---|
| **A. Dùng lại ĐÁP ÁN (0 lượt AI phân loại)** | **1. Tầng K1 (`khoa_dap_an`):** Khớp 100% `{ten, chatLieu, congDung, chucNang, thongSo/specs, xuatXu, thuongHieu, model, facts, tier}` **VÀ** bản ghi ở trạng thái **`DUYET`** (`cap_da_chac = 8`) **VÀ** mọi `du_kien_quyet_dinh` của phân nhóm 6 số đều có mặt và khớp giá trị.<br>**2. Tầng K2-Đáp án (`khoa_hang_model`):** Cùng `thuongHieu + model` trên bản **`DUYET`**, **VÀ** toàn bộ `thongSo`/`facts` quyết định dòng 8 số của nhóm đó đều có mặt và khớp 100% với bản ghi (khách khai thêm thông số mới mà bản ghi chưa có ⇒ **không** coi là khớp).<br>**3. Tầng K3-Đáp án (PR 3, bản `DUYET`):** `cosine(vec_e5) ≥ 0.88` + mô hình G3 (`OZV-758`) xác nhận `CÓ` (`p ≥ 0.90`) + khớp đủ `du_kien_quyet_dinh` của nhóm. | Trả đáp án từ `phan_hoi_chuan` (kèm cách dựng `hoSo/ecus` ở mục 5.1). | **KHÔNG chạy `classify()`** (tiết kiệm 100% lượt LLM phân loại & tra web). |
| **B. Dùng lại DỮ KIỆN (`khoa_du_kien` / `khoa_hang_model`)** | Trùng `(tenChuan, thuongHieuChuan)` hoặc `(thuongHieuChuan, modelChuan)` nhưng **khác `thongSo`**, hoặc khách gửi thêm/thiếu dữ kiện, hoặc bản ghi mới ở trạng thái `NHAP` / `CHI_DU_KIEN` / `cap_da_chac = 6`. | **KHÔNG trả mã.** Chỉ nạp các `du_kien` nguồn `WEB` đã lưu (`trichDoanWeb`, `url`) vào đầu vào và đặt `_b1bDaThu: true` để bỏ qua bước gọi SearXNG / z.ai (`B1b`). | **CÓ chạy động cơ `classify()`** và toàn bộ cổng sổ tay / `dieu-kien-so` trên `thongSo` mới của khách. |

### 7 điều kiện CẤM trả ĐÁP ÁN từ kho (vi phạm 1 điều ⇒ chỉ được Dùng lại DỮ KIỆN hoặc chạy mới):
1. **Khác hoặc thiếu `thongSo` / `du_kien_quyet_dinh`:** Lượt mới khác `specs`/`thongSo`, hoặc khai thêm thông số kỹ thuật mà bản ghi kho chưa có, hoặc thiếu một `duKienQuyetDinh` bắt buộc của phân nhóm đó trong `data/ho-so/ranh-gioi/<pn6>.json`.
2. **Bản ghi chưa `DUYET`:** Bản ghi đang ở `NHAP`, `CHO_CHAM`, hoặc `CHI_DU_KIEN`. (**Bỏ hoàn toàn quy định trả bản `NHAP` 24 giờ** của v1 — bản `NHAP` máy tự sinh chưa ai chấm không bao giờ được trả thẳng mã cho khách).
3. **Lượt gốc không ra mã chốt:** Lượt gốc có `status` là `NEED_FACTS`, `NEEDS_EXPERT`, `NO_CANDIDATES`, `QUA_GIO` (503), `degraded: true`, hoặc lỗi LLM.
4. **Lệch hạng `tier`:** Bản ghi được tạo ở `tier = 'standard'` (chưa lên `DUYET` qua mô hình mạnh) không bao giờ trả cho lượt yêu cầu `tier = 'premium'`.
5. **Bản ghi chỉ mới chắc ở 6 số (`cap_da_chac = 6`):** Chỉ dùng để nạp `du_kien` đã lưu, không trả làm đáp án 8 số.
6. **Hết hạn pháp lý:** `phien_ban_bieu` hoặc `hash_so_tay` của nhóm/phân nhóm đó đã đổi, hoặc `now() > han_xem_lai`.
7. **Lượt kiểm thử / chấm điểm:** Có `debug=true` hoặc header `X-OZ-Eval-Holdout: 1`.

---

## 4. Đường ghi · Bộ lọc riêng tư · Ai duyệt lên `DUYET` · Cổng máy kiểm gì

### 4.1. Luật ghi vào kho (chỉ ghi khi lượt gốc RA MÃ)
- Tại `api/classify.js`, việc ghi vào `kho_dap_an` chạy **không chặn (`fire-and-forget`)** sau khi có kết quả:
  - **Được ghi bản `NHAP`:** Khi và chỉ khi `result.results?.[0]?.hs` là mã 6 hoặc 8 số hợp lệ trong `data/tax.json`, `result.degraded !== true`, và `result.status` **không** thuộc `{'NEED_FACTS', 'NEEDS_EXPERT', 'NO_CANDIDATES', 'QUA_GIO'}`. Cách tính `cap_da_chac`: lấy từ `result.hoSo?.capDaChac` nếu có; nếu không, bằng `8` khi mã đầu là 8 số và `missing.length === 0`, bằng `6` khi dừng ở 6 số hoặc còn `missing` cấp 8 số.
  - **Chỉ ghi dữ kiện web (`trang_thai = 'CHI_DU_KIEN'`, `ma_hs = NULL`):** Khi lượt trả `NEED_FACTS` nhưng bước `B1b` (`lib/b1b-web.js`) tìm được `webHint` có nguồn (`nguon.length > 0`), chỉ lưu `du_kien` nguồn `WEB` theo `khoa_du_kien` / `khoa_hang_model` để lần sau không tốn lượt tra web lại.
  - **Bắt mâu thuẫn (`mau_thuan`):** Trong chế độ `shadow` (hoặc khi động cơ chạy trên bản `NHAP`), nếu cùng `khoa_dap_an` mà động cơ ra mã khác với `ma_hs` đang lưu ⇒ thêm vào `mau_thuan[]` và chuyển `trang_thai = 'CHO_CHAM'`.

### 4.2. Đặc tả bộ lọc riêng tư (`locRiengTuKhoDapAn`)
1. **Chỉ nhận danh sách trắng trường hàng hoá:** `tenHang`, `nameZh`, `chatLieu`, `congDung`, `chucNang`, `specs` (`thongSo`), `thuongHieu` (`brand`), `model`, `xuatXu`, và mảng `facts` đã khớp khoá trong `lib/tu-vung.js`.
2. **Cắt bỏ triệt để trường định danh khách/đơn hàng:** Không nhận và không lưu `luotId`, `orderCode`, `directorNote`, `chosenBy`, `customerDescription` nguyên văn chưa lọc, `bangChung` nguyên văn của khách, hay `phan_hoi` thô từ `/api/feedback`.
3. **Regex quét sạch số liệu thương mại/chứng từ trong chuỗi mô tả & thông số:** Trước khi lưu `ten_chuan_vi`, `thong_so_chuan` hoặc nhúng `vec_e5`, hàm `locChuoiHangHoa(s)` xoá mọi cụm khớp:
   - Số tờ khai hải quan (`\b\d{11,12}\b`), mã đơn/hoá đơn (`\b(inv|invoice|po|hd|so|bill|awb|bl)[\s#:.-]*[a-z0-9-]{4,}\b`).
   - Đơn giá & số tiền (`\b\d+([.,]\d+)?\s*(usd|vnd|cny|rmb|eur|jpy|đ|vnđ|\$|¥)\b`).
   - Số lượng thương mại (`\b(sl|so luong|qty|quantity)\s*[:=]?\s*\d+\b`, `\b\d+\s*(thung|kien|pallet|carton|lo)\b`), đồng thời giữ nguyên thông số kỹ thuật (`kW, HP, V, A, Hz, mm, cm, m, kg, g, ml, l, %, °C`).

### 4.3. Đường duyệt lên `DUYET` & Cổng máy kiểm bắt buộc
- **Hai nguồn lên `DUYET`:**
  1. **Từ luồng duyệt sẵn có của `lib/feedback-store.js` (`reviewFeedback` / `bulkApproveByPattern`):** Khi bản ghi feedback được chuyển sang `status = 'approved'`, hệ thống ánh xạ trường (`input.nameVi || productName → tenHang`, `input.titleZh → nameZh`, `input.specsZh → specs`, `input.facts → facts`), lọc qua `locRiengTuKhoDapAn()`, kiểm qua **Cổng máy** dưới đây rồi ghi lên `DUYET`.
  2. **Từ lô chấm định kỳ (`scripts/cham-kho-dap-an.mjs`) + নমুনা kiểm bằng người 5%/tuần:** Chạy ngoài đường khách cho các bản `CHO_CHAM`, các dòng nạp ngược từ bảng `classify_cache` hiện có, và bản `NHAP` có `so_lan_gap >= 2`. Mô hình mạnh hơn (Opus / Gemini Pro) chấm độc lập; vì `so_lan_gap >= 2` không đồng nghĩa với đúng và mô hình chấm có thể cùng họ với mô hình phân loại, mỗi tuần xuất ngẫu nhiên **5% bản `DUYET` do máy chấm** để người kiểm chéo.
- **Cổng máy kiểm bắt buộc trước khi bất kỳ bản ghi nào lên `DUYET`:**
  1. `ma_hs` (8 số) tồn tại trong `data/tax.json`.
  2. Chạy `chotDong8` (`lib/so-tay-gates.js`) + `kiemTruocChot` (`lib/kiem-truoc-chot.js`) + `checkPolarity` & `checkSubheading` (`lib/subheading-check.js`) = **0 lỗi chặn, 0 cờ `loaiKhacSai`**.
  3. Nếu mô hình chấm hoặc feedback chọn mã X mà sổ tay chưa có điều kiện hoặc chặn X ⇒ **không lên `DUYET`**, xuất vào `data/so-thieu-luat.jsonl` để Giám đốc mở thẻ cuốn chiếu sửa sổ tay nhóm đó.

---

## 5. Đường đọc, Cách dựng lại `hoSo/ecus` & Nối `ADR-034`

### 5.1. Cách dựng lại phản hồi và `hoSo/ecus` (sửa lời hứa `< 20ms, 0 token` cho đúng thực tế)
- Trong `api/classify.js:165`, sau `classify()` còn bước `ganHoSoClassify(kq, attrsHoSo, quyen)` (`lib/ho-so/api.js:511`). Khi `HS_HO_SO=on` và mã thuộc lát 1, `chayHoSo()` mặc định gọi LLM (`docDuKien`, `vietMoTa`). Do đó khi trúng `khoa_dap_an` của một bản `DUYET`:
  1. **Trường hợp 1 (`HS_HO_SO=off` hoặc mã ngoài lát 1, hoặc bên gọi không gửi trường tờ khai riêng khác bản lưu):** Trả trực tiếp từ `phan_hoi_chuan` đã lưu trong `kho_dap_an` ⇒ thời gian tra kho **≤ 20–50 ms** (trần cứng `150 ms`), **`usage: []` (0 token AI)**.
  2. **Trường hợp 2 (`HS_HO_SO=on`, mã thuộc lát 1, và bên gọi gửi `loaiToKhai` / `packaging` / `dimensions` / `condition` riêng của tờ khai):** Bỏ qua hoàn toàn `classify()` (**0 lượt AI phân loại**), lấy `results` + `du_kien` chuẩn từ `kho_dap_an` rồi gọi `ganHoSoClassify` với chế độ ghép cụm máy tất định (`cheDoViet = 'MAY'` từ `cumDaKiem` của `lib/ho-so/viet-mo-ta.js`, không gọi LLM) ⇒ vẫn **0 token AI**, tổng thời gian **< 100 ms**. (Nếu bên gọi yêu cầu viết lại văn phong bằng LLM `HS_HO_SO_VIET=LLM` thì chỉ tốn đúng 1 lượt viết mô tả, không tốn 2–4 lượt phân loại).
- **Phạm vi caller:** Mặc định mở cho các khoá dịch vụ (`serviceCaller(req) !== null`: Cổng OZ, bot Zalo, ERP). Với caller công khai không khoá, đặt dưới công tắc riêng `HS_KHO_DAP_AN_CONG_KHAI=false` (mặc định tắt) để bảo vệ pool DB 5 kết nối (`lib/db.js:40`).

### 5.2. Nối khép vòng `ADR-034` của `erp-xnk`
- `erp-xnk` giữ nguyên `src/lib/extension/hs-feedback.ts` (`POST /api/feedback`). Phía `hs-code-api`, khi `HS_FEEDBACK_KHO_DAP_AN=on`:
  - `POST /api/feedback` vẫn ghi `/data/feedback.jsonl` như cũ, đồng thời nếu tìm thấy bản ghi tương ứng trong `kho_dap_an` mà `correctedHsCode !== hsCodeAtTime` thì đẩy vào `mau_thuan[]` và hạ trạng thái về `CHO_CHAM` ngay lập tức (ngăn kho tiếp tục trả mã bị nhân viên sửa).
  - Khi `PATCH /api/feedback` (`reviewFeedback` / `bulkApproveByPattern`) duyệt `approve`, bản ghi đã lọc riêng tư và qua cổng máy được cập nhật thẳng lên `DUYET` trong `kho_dap_an`.

---

## 6. Số đo mục tiêu (kèm câu lệnh máy chạy được cho từng số đo)

| Số đo | Mốc nền đo thật (14/11) | Đích Giai đoạn 1 (K1 + K2 + lưu B1b) | Đích Giai đoạn 2 (+ K3 gần nghĩa cho bản `DUYET`) | Câu lệnh đo bằng máy (chạy được) |
|---|---|---|---|---|
| **1. Tỷ lệ lượt lặp trả ĐÁP ÁN từ kho (0 lượt AI phân loại)** | **19,8%** (`classify_cache` băm y hệt trên 511 lượt) | **21% – 25%** (khớp đủ cả `thongSo` + dữ kiện quyết định) | **30% – 40%** (nhờ K3 bắt thêm câu khác chữ nhưng đủ dữ kiện) | `node scripts/thong-ke-kho-dap-an.mjs --days=7 --json` (đếm tỷ lệ dòng log `{"type":"kho_dap_an","ketQua":"TRUNG_DAP_AN"}` / tổng lượt). |
| **2. Tỷ lệ lượt lặp tái sử dụng DỮ KIỆN (`khoa_du_kien`, 0 lượt web B1b lặp)** | **0%** (hiện `B1b` dùng xong là bỏ) | **20% – 33%** (phần chênh giữa 54,6% và 21,5%) | **≥ 35%** | `node scripts/thong-ke-kho-dap-an.mjs --days=7 --json` (đếm tỷ lệ `ketQua:"TRUNG_DU_KIEN"` và giảm tỷ lệ `coGoiWeb:true` trong log `b1b_web`). |
| **3. Tỷ lệ lệch mã giữa Kho và Động cơ trong chế độ bóng (`mau_thuan`)** | Chưa đo | **< 1,0%** trên các lượt trúng `khoa_dap_an` | **< 0,5%** trên các bản `DUYET` | `node scripts/thong-ke-kho-dap-an.mjs --days=7 --json` (tỷ lệ `le_ra_trung_dap_an` có `maKho !== maDongCo`). |
| **4. Tỷ lệ ghép nhầm 2 dòng 8 số anh em ở K3 (False-Positive)** | — (chưa bật K3) | **0%** (K3 tắt ở Giai đoạn 1) | **0%** (trần cứng `< 1%`) trên bộ cặp dòng 8 số anh em cùng PN6 | `node scripts/test-kho-dap-an-k3.mjs --json` (sinh cặp mô tả từ các dòng 8 số anh em trong `data/ho-so/ranh-gioi/*.json` đã `DUYET` + 50 ca `benchmark-50-ca-tb-tchq.mjs`). |
| **5. Số lượt gọi LLM & tra web trung bình mỗi lượt khách** | Đo từ mảng `usage.length` và log `b1b_web` 7 ngày trước khi bật | Giảm **≥ 20%** tổng lượt gọi LLM · giảm **≥ 60%** lượt tra web lặp cho cùng model | Giảm **≥ 35%** tổng lượt gọi LLM | `node scripts/thong-ke-kho-dap-an.mjs --compare-days=7 --json` (tính `avg(usage_calls)` và `sum(coGoiWeb)` trước/sau). |

---

## 7. Hai phương án & Lộ trình PR an toàn (tách công tắc, hạn 150 ms)

| Tiêu chí | Phương án A — Đổi ít nhất (Sửa `classify_cache` + thêm bảng `web_facts_cache`) | Phương án B — Đầy đủ ("Cuốn sổ thứ tư" `kho_dap_an` khép vòng, tách PR nhỏ) |
|---|---|---|
| **Cách làm** | Sửa `lib/classify-cache.js` (lọc bỏ `NEED_FACTS`/`NEEDS_EXPERT`, bỏ `kenhGoi`/`noiBo`), tạo bảng phụ lưu `webHint` B1b theo `thuongHieu + model + tenHang`. | Dựng bảng `kho_dap_an` (`CHI_DU_KIEN` / `NHAP` / `CHO_CHAM` / `DUYET`) có tách `khoa_dap_an` và `khoa_du_kien`, chạy bóng trước, chấm bằng mô hình mạnh + cổng máy, nối `feedback-store` và K3. |
| **Đánh giá** | Nhanh nhưng không tách được dữ kiện quyết định theo từng phân nhóm, không bắt được `mau_thuan` để phát hiện sổ thiếu luật, không nối được luồng duyệt `ADR-034`. | Giải quyết trọn vẹn cả bài toán dùng lại đáp án an toàn (có `thongSo`) lẫn dùng lại dữ kiện tìm kiếm (33,1% lượt cùng tên khác thông số), đồng thời tự động chỉ ra nhóm thiếu luật (`so-thieu-luat.jsonl`). |

### Khuyến nghị: **Chọn Phương án B**, triển khai qua các PR nhỏ có **công tắc tắt mặc định (`off`)** và **trần thời gian đọc kho 150 ms**:
1. **PR 1a — Migration `0003` + Мо-đun `lib/kho-dap-an.js` + Chế độ BÓNG (`shadow`) trên `api/classify.js`:**
   - *Tệp:* `db/migrations/0003_kho_dap_an.sql`, `lib/kho-dap-an.js`, `api/classify.js`, `scripts/thong-ke-kho-dap-an.mjs`, `scripts/test-kho-dap-an.mjs`.
   - *An toàn:* Cờ `HS_KHO_DAP_AN=off|shadow` (mặc định `off`; **PR 1a chưa có nhánh `on`**). Ghi không chặn (`fire-and-forget`); đọc bóng bọc trong `voiHan(..., 150)` (`HS_KHO_DAP_AN_TIMEOUT_MS=150` — nếu DB chậm quá 150 ms thì bỏ qua ngay, không để `connectionTimeoutMillis: 2000` của pool làm chậm khách).
2. **PR 1b — Lưu & tái sử dụng dữ kiện web `B1b` theo `khoa_du_kien` + Truyền `thuongHieu/model` vào `attrs`:**
   - *Tệp:* `lib/b1b-web.js`, `api/classify.js`, `scripts/test-b1b-kho-du-kien.mjs`.
   - *An toàn:* Cờ riêng `HS_B1B_KHO_DU_KIEN=off|shadow|on` (mặc định `off`), trần đọc 150 ms.
3. **PR 1c — Nối luồng duyệt `lib/feedback-store.js` (`ADR-034`) vào `kho_dap_an`:**
   - *Tệp:* `lib/feedback-store.js`, `api/feedback.js`, `scripts/test-feedback-kho-dap-an.mjs`.
   - *An toàn:* Cờ riêng `HS_FEEDBACK_KHO_DAP_AN=off|on` (mặc định `off`), đi qua `locRiengTuKhoDapAn()`.
4. **PR 2 — Công cụ chấm lô (`scripts/cham-kho-dap-an.mjs`) + Nạp ngược từ `classify_cache` + Nhánh `HS_KHO_DAP_AN=on` (chỉ trả bản `DUYET`):**
   - *Tệp:* `scripts/cham-kho-dap-an.mjs`, `lib/kho-dap-an.js`, `scripts/test-cham-kho-dap-an.mjs`.
   - *An toàn:* Chạy lô chấm ngoài đường khách + kiểm 100% cổng máy (`chotDong8`, `kiemTruocChot`, `checkPolarity`, `checkSubheading`) + xuất `data/so-thieu-luat.jsonl`. Chỉ mở `HS_KHO_DAP_AN=on` sau khi có ≥ 50 bản `DUYET` và kiểm mẫu 5% bằng người đạt 100%.
5. **PR 3 — Khớp gần nghĩa K3 (`vec_e5` + mô hình quyết định G3 `OZV-758`):**
   - *Tệp:* `lib/kho-dap-an.js`, `scripts/test-kho-dap-an-k3.mjs`.
   - *An toàn:* Cờ riêng `HS_KHO_DAP_AN_K3=off|shadow|on` (mặc định `off`), trần cứng 300 ms, chỉ bật sau khi `test-kho-dap-an-k3.mjs` đạt `0%` ghép nhầm dòng 8 số anh em.
