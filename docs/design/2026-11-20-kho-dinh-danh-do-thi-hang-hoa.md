# Thiết kế Hai trang — Kho định danh & Đồ thị hàng hoá theo hãng+model (Nối G5 · OZV-1657)

- **Ngày:** 20/11/2026 · **Người viết:** GĐ `hs-code-api` · **Thẻ:** [OZV-1657](/OZV/issues/OZV-1657) (phối hợp [OZV-1656](/OZV/issues/OZV-1656), nối thiết kế G5 [OZV-760](/OZV/issues/OZV-760) / PR [#1310](https://github.com/ozvietnam/hs-code-api/pull/1310))
- **Đã đối chiếu mã & báo cáo:** `docs/design/2026-11-14-kho-dap-an-khep-vong.md`, `db/migrations/0003_kho_dap_an.sql`, `lib/identify.js`, `lib/attribute-frames.js`, `lib/xac-minh-nguon.js`, `lib/ho-so/nghien-cuu.js`, `api/classify.js`, PR [#1496](https://github.com/ozvietnam/hs-code-api/pull/1496) (`qt/dinh-danh-tim-web`), PR [#1497](https://github.com/ozvietnam/hs-code-api/pull/1497) (`qt/classify-dung-dinh-danh`), và báo cáo thực nghiệm 10 mẫu `/paperclip/du-lieu/nghien-cuu/OZV-1656-do-10-mau-dinh-danh.md`.

---

## 1. Số đo nền & Ước lượng tốc độ đầy kho (Mục 3 của [OZV-1657](/OZV/issues/OZV-1657))

### 1.1. Tỷ lệ lượt mang thương hiệu / model trên các tập dữ liệu thật
| Nguồn dữ liệu | Quy mô mẫu | Có mã Model bóc được | Có Thương hiệu / NSX | Có Model hoặc Hãng | Ý nghĩa vận hành cho Kho định danh |
|---|---:|---:|---:|---:|---|
| **1. `oz_gateway.phan_loai_cong_viec`** (QT đo 14–15/11) | **1.159 dòng** (7 ngày: **511 lượt** `PHAN_LOAI`, **797 dòng** có mã 8 số) | *(CẦN QT chạy SQL mục 1.2 để tách riêng cột `model`)* | **54,6%** lượt lặp theo `tenHang + thuongHieu` (279/511 lượt trên 232 món) | **54,6%** lặp tên+hãng vs **21,5%** lặp đủ `thongSo` | **33,1% tổng số lượt** (~170 lượt/tuần) trùng hàng/hãng nhưng thiếu hoặc khác `thongSo` — đúng vùng Kho định danh cấp dữ kiện để động cơ chốt 8 số. |
| **2. Thực địa khách hỏi 24h** (20/11) & **`data/ml-log.jsonl`** | **40 lượt** (24h) · **70 lượt** (`ml-log`) | **22,5%** (9/40 lượt 24h: `van fv420` 5 lượt, `tủ cnc mod...` 4 lượt) · **24,3%** (17/70 `ml-log`) | **10,0%** (7/70 `ml-log` ghi rõ hãng trong câu ngắn) | **27,1%** (19/70 `ml-log`) | Các ca có model trên thực địa (`van fv420`) đang dừng **100% ở 6 số (`NEED_FACTS`)** vì khách chỉ gõ model, không nhớ thông số kỹ thuật. |
| **3. `data/loai-khac-products.jsonl`** (mặt hàng "Loại khác") | **11.072 dòng** | **1.932 dòng (17,4%)** | **90 dòng (0,8%)** | **2.022 dòng (18,3%)** | Nguồn seed tự nhiên gần 2.000 mã model công nghiệp thuộc các phân nhóm `.90/.99` khó nhất. |
| **4. `data/oz-gold-final.jsonl`** (tờ khai thông quan) | **5.734 dòng** | **2.754 dòng (48,0%)** | **5.370 dòng (93,7%)** | **5.503 dòng (96,0%)** | Khi lên tới bước khai báo / cus check (`erp-xnk`), **96% mặt hàng có hãng hoặc model** (48% có mã model chuẩn). |
| **5. Thực nghiệm 10 mẫu máy móc qua `identify()`** ([OZV-1656](/OZV/issues/OZV-1656)) | **10 mẫu** máy móc/phụ tùng có model thật | **10/10 (100%)** (sinh 6–10 trường ở **9/10 mẫu**) | **9/10 (90%)** đúng NSX (trừ `FP6308U` thiếu hãng ở đầu vào) | Trước PR #1496: **0/10** có nguồn (`10/10 KHONG_NGUON`), TB **26,3 s/lượt** | Sau bước 0 tra SearXNG (PR [#1496](https://github.com/ozvietnam/hs-code-api/pull/1496)): **3/3 mẫu thử** (`FP6308U`, `VFD015M21A`, `HG-KR43`) lên **`CORROBORATED`** (3–4 tên miền) trong **0,9–1,4 s**. |

### 1.2. Câu lệnh SQL đo trực tiếp tỷ lệ bóc `thuongHieu + model` trên `.120` (`oz_gateway.phan_loai_cong_viec`)
```sql
WITH b AS (
  SELECT ma_luot, tao_luc,
         nullif(trim(coalesce(dau_vao->>'thuongHieu', dau_vao->>'brand', '')), '') AS hang_khai,
         nullif(trim(coalesce(dau_vao->>'model', '')), '') AS model_khai,
         (coalesce(dau_vao->>'tenHang','') || ' ' || coalesce(dau_vao->>'thongSo','')) ~ '\m([A-Z]{1,6}[-/]?\d{2,}[A-Z0-9.-]*|\d{2,}[A-Z]{1,4}\d*[A-Z0-9-]*)\M' AS co_model_trong_chu
  FROM phan_loai_cong_viec
  WHERE loai = 'PHAN_LOAI'
)
SELECT count(*) AS tong_luot,
       count(*) FILTER (WHERE hang_khai IS NOT NULL) AS co_hang_khai,
       count(*) FILTER (WHERE model_khai IS NOT NULL OR co_model_trong_chu) AS co_model_boc_duoc,
       count(*) FILTER (WHERE hang_khai IS NOT NULL OR model_khai IS NOT NULL OR co_model_trong_chu) AS co_hang_hoac_model,
       round(100.0 * count(*) FILTER (WHERE hang_khai IS NOT NULL OR model_khai IS NOT NULL OR co_model_trong_chu) / NULLIF(count(*), 0), 1) AS pct_co_dinh_danh
FROM b;
```

### 1.3. Ước lượng tốc độ đầy kho
1. **Luồng khách tự nhiên (chế độ bóng + sản xuất):** ~90 lượt phân loại/ngày × ~25% có model/hãng + các đơn `erp-xnk` (cus check) ⇒ mỗi ngày tích luỹ **10–15 model mới** (~350–450 model/tháng), và ngay lập tức phục vụ **54,6%** lượt hỏi lặp.
2. **Luồng nạp khởi tạo & bot thu thập chạy đêm (ngoài giờ cao điểm 00:00–06:00 VN):**
   - Nạp từ tập model sẵn có trong các lượt `phan_loai_cong_viec` + đơn hàng `erp-xnk` (`ozsource`) với hàng chờ giới hạn tốc độ theo tên miền (5–10 model/phút × 360 phút = **1.800–3.600 model/đêm** qua SearXNG nội bộ + mô hình miễn phí/rẻ, 0 USD).
   - Kho đạt mốc **10.000 model sau ~3–5 đêm**, và mốc **100.000 model sau ~30–45 đêm** chạy nền.

---

## 2. Kiến trúc Đồ thị Hàng hoá trên Postgres & Nối G5 (`db/migrations/0004_kho_dinh_danh.sql`)

### 2.1. Nguyên tắc kiến trúc (1 kho, 1 chủ, mở rộng không sửa cấu trúc bảng)
- **Không lập repo mới:** Kho định danh đặt trong `hs-code-api` (cùng CSDL Postgres `hs_code_api`), là nửa **"Dùng lại DỮ KIỆN đã tra"** của thiết kế Kho đáp án v2 (G5, `docs/design/2026-11-14-kho-dap-an-khep-vong.md`), nối với bảng `kho_dap_an` (`0003_kho_dap_an.sql`) qua khoá chuẩn `khoa_hang_model` (`<hang_chuan>::<model_rut_gon>`).
- **Thứ tự chuẩn của chuỗi định danh & phân loại:**
  1. `/api/identify` (`dinh_danh_hang`): **Đọc Kho định danh (`< 100 ms`) → Trượt hoặc thiếu trường bắt buộc thì chạy bước 0 tra web SearXNG (PR #1496) + LLM → Ghi kết quả không chặn (`fire-and-forget`) vào Kho định danh**.
  2. `/api/classify` (`phan_loai_hs`): Dùng lại `body.dinhDanh` nếu Cổng đã truyền xuống (PR #1497) hoặc tra nhanh Kho định danh theo `thuongHieu + model` (`< 50 ms`). **Luật cứng từ G5:** Dùng lại DỮ KIỆN từ Kho định danh thì động cơ `classify()` **VẪN CHẠY**; chỉ trả thẳng ĐÁP ÁN từ `kho_dap_an` khi bản ghi ở trạng thái `DUYET` và khớp đủ `thongSo` + `du_kien_quyet_dinh` của phân nhóm 6 số.
- **Lược đồ Đồ thị Hàng hoá (5 bảng chỉ-thêm, `loai_nut` và `loai_canh` là dữ liệu — thêm loại nút/cạnh mới KHÔNG cần migration `ALTER TABLE`):**

| Bảng | Cột chính & Kiểu dữ liệu | Vai trò trong Đồ thị Hàng hoá |
|---|---|---|
| **1. `dd_nut`** (Nút đồ thị) | `nut_id BIGSERIAL PK` · `loai_nut VARCHAR(32) NOT NULL` · `khoa_chuan VARCHAR(200) NOT NULL` · `ten_hien_thi TEXT NOT NULL` · `chuong_ung_vien CHAR(2)` · `thuoc_tinh_nhanh JSONB DEFAULT '{}'` · `muc_kiem_chung VARCHAR(16) DEFAULT 'HYPOTHESIS'` · `nguoi_xac_nhan VARCHAR(80)` · `tao_luc/cap_nhat_luc TIMESTAMPTZ` · `UNIQUE (loai_nut, khoa_chuan)` | Lưu mọi thực thể: `HANG_SX` (nhà sản xuất), `THUONG_HIEU` (brand, kèm `ten_mien_chinh_thuc[]` trong `thuoc_tinh_nhanh`), `DONG_SP` (series/product line), `MODEL` (mã model cụ thể), `SHOP` (người bán trên sàn), `NIEM_YET` (link sản phẩm 1688/Taobao/MIC...), `NHOM_HS` (nhóm/phân nhóm/mã HS 4/6/8 số). |
| **2. `dd_bi_danh`** (Cách viết khác) | `bi_danh_id BIGSERIAL PK` · `nut_id BIGINT FK -> dd_nut` · `loai_nut VARCHAR(32) NOT NULL` · `cach_viet_goc TEXT NOT NULL` · `bi_danh_chuan VARCHAR(200) NOT NULL` · `bi_danh_rut_gon VARCHAR(200) NOT NULL` · `ngon_ngu VARCHAR(8)` (`vi\|en\|zh\|code`) · `UNIQUE (loai_nut, bi_danh_chuan, nut_id)` | Bắt mọi biến thể cách viết của hãng, thương hiệu, dòng sản phẩm và model (tiếng Việt/Anh/Trung, có hoặc không có dấu gạch nối `-`, `/`, `.`, khoảng trắng). Tra cứu O(log N) qua chỉ mục `(loai_nut, bi_danh_rut_gon)`. |
| **3. `dd_nguon`** (Nguồn & Con trỏ MinIO) | `nguon_id BIGSERIAL PK` · `url_chuan TEXT NOT NULL` · `url_goc TEXT NOT NULL` · `ten_mien VARCHAR(120) NOT NULL` · `loai_nguon VARCHAR(24) NOT NULL` (`TRANG_HANG\|CATALOGUE\|SAN_TM\|TIM_WEB_SNIPPET\|DIEN_DAN`) · `do_tin SMALLINT NOT NULL` (`4..1`) · `http_status SMALLINT` · `ma_bam_noi_dung CHAR(64)` (`SHA-256`) · `duong_dan_minio TEXT` · `trich_doan_luu TEXT` · `lan_cuoi_mo TIMESTAMPTZ` | Lưu URL + độ tin của nguồn (`TRANG_HANG=4 > CATALOGUE=3 > SAN_TM=2 > TIM_WEB_SNIPPET=1 > DIEN_DAN=1`). **Bản lưu thô (HTML đoạn trang, ảnh nameplate, PDF catalogue) đặt ở MinIO máy chủ nhà (`duong_dan_minio`)**, Postgres chỉ giữ đường dẫn + mã băm `SHA-256` + đoạn trích ngắn ≤ 1.000 ký tự đã lọc riêng tư. |
| **4. `dd_du_kien`** (Thông số kỹ thuật) | `du_kien_id BIGSERIAL PK` · `nut_id BIGINT FK -> dd_nut` · `ten_chuan VARCHAR(64) NOT NULL` · `gia_tri_chu TEXT NOT NULL` · `gia_tri_so DOUBLE PRECISION` · `don_vi VARCHAR(32)` · `nguon_id BIGINT FK -> dd_nguon` · `trich_doan TEXT` · `muc_kiem_chung VARCHAR(16) NOT NULL` (`HYPOTHESIS\|CORROBORATED\|VERIFIED`) · `nguoi_xac_nhan VARCHAR(80)` · `trang_thai_mau_thuan VARCHAR(16) DEFAULT 'THONG_NHAT'` · `ngay_thu_thap/han_dung TIMESTAMPTZ` | Mỗi thông số kỹ thuật của `MODEL` / `DONG_SP` là **1 dòng độc lập** (`nguyenLyHoatDong`, `chucNangChinh`, `cauThanhModule`, `power`, `voltage`, `chatLieu`, `congSuatBieuKien`...), có nguồn, câu trích nguyên văn, nhãn kiểm chứng và hạn dùng riêng. |
| **5. `dd_canh`** (Cạnh quan hệ) | `canh_id BIGSERIAL PK` · `tu_nut_id BIGINT FK -> dd_nut` · `loai_canh VARCHAR(40) NOT NULL` · `den_nut_id BIGINT FK -> dd_nut` · `thuoc_tinh_canh JSONB DEFAULT '{}'` · `nguon_id BIGINT FK -> dd_nguon` · `muc_kiem_chung VARCHAR(16) DEFAULT 'HYPOTHESIS'` · `nguoi_xac_nhan VARCHAR(80)` · `ngay_thu_thap/han_dung TIMESTAMPTZ` · `UNIQUE (tu_nut_id, loai_canh, den_nut_id, COALESCE(nguon_id, 0))` | Lưu toàn bộ hệ sinh thái quan hệ có nguồn + ngày + nhãn kiểm chứng: `SO_HUU_THUONG_HIEU`, `CO_DONG_SP`, `GOM_MODEL`, `DI_KEM`, `PHU_TUNG_CUA`, `THAY_THE_CHO`, `BAN_MODEL`, `NIEM_YET_CUA_SHOP`, `THUOC_NHOM_HS`, `CO_HO_SO_SHTT`. |

### 2.2. Năm nghiệp vụ Đồ thị Hàng hoá gánh thay người & Đường đọc nút/cạnh
| Nghiệp vụ thay người | Đọc Nút & Cạnh nào trong Đồ thị | Kết quả trả ra & Nguồn nạp cạnh sẵn có |
|---|---|---|
| **1. Cus check điền sẵn (`erp-xnk` / `dinh_danh_hang`)** | Tra `dd_bi_danh (MODEL)` → `dd_nut (MODEL)` → cạnh `GOM_MODEL` ngược lên `THUONG_HIEU` / `HANG_SX` → đọc `dd_du_kien` + `dd_nguon`. | Điền sẵn hãng sản xuất, nguyên lý hoạt động, công suất, điện áp, chất liệu kèm URL + trích đoạn bằng chứng chỉ trong `< 50 ms` (không tốn 26s chờ LLM). |
| **2. Gợi ý hàng đi kèm / phụ tùng / đã nhập cùng shop** | Từ `MODEL` đọc cạnh `DI_KEM`, `PHU_TUNG_CUA`, `THAY_THE_CHO` sang `MODEL` khác; từ `SHOP` / `NIEM_YET` đọc cạnh `BAN_MODEL` và `THUOC_NHOM_HS`. | Cảnh báo khi khách khai phụ tùng (`FP6308U`) vào mã máy hoàn chỉnh hoặc ngược lại; gợi ý bộ mã HS đồng bộ của các món mua cùng một shop `ozsource`. **Nguồn nạp:** giỏ hàng `ozsource` đẩy link sàn + shop vào đơn `erp-xnk`. |
| **3. Cảnh báo SHTT theo thương hiệu** | Từ `MODEL` → `GOM_MODEL` → `THUONG_HIEU` → đọc cạnh `CO_HO_SO_SHTT` (`thuoc_tinh_canh.maHoSoShtt`). | **Không chép dữ liệu của `oz-shtt` sang, không nối tắt hai repo** (luật 26/10: mọi thứ qua Cổng). Kho chỉ giữ cạnh tham chiếu `THUONG_HIEU → maHoSoShtt` để Cổng OZ gọi `kiem_tra_shtt` cảnh báo rủi ro nhãn hiệu / yêu cầu giấy uỷ quyền ngay từ bước định danh. |
| **4. Sinh mô tả hải quan chuẩn TT 39/2018 (`/api/describe`, `vietMoTa`)** | Từ `MODEL` đọc `dd_du_kien` (lọc các trường `required` của chương theo `data/chapter-declaration-fields.json` và `ranh-gioi` của `NHOM_HS`). | Ghép mô tả tờ khai ECUS ≤ 200 ký tự bằng máy tất định (`cheDoViet = 'MAY'`), đủ tên hàng + nhãn hiệu + model + thông số bắt buộc, 0 token AI. |
| **5. Tra & phân loại mã HS (`/api/classify`, nối G5)** | Từ `MODEL` đọc `dd_du_kien` (`muc_kiem_chung IN ('CORROBORATED','VERIFIED')`) + cạnh `THUOC_NHOM_HS` (nối `kho_dap_an.khoa_hang_model`). | Bơm các dữ kiện đã xác minh vào `attrs` (`congDung`, `thongSo`, `facts`) để động cơ `classify()` + cổng `chotDong8` chốt thẳng 8 số, giảm tỷ lệ dừng ở 6 số (`NEED_FACTS`). |

---

## 3. Quy tắc Chuẩn hoá · Phân giải Mâu thuẫn · Hạn dùng · Điều kiện nâng `VERIFIED`

1. **Quy tắc chuẩn hoá Hãng và Model (`lib/kho-dinh-danh.js`):**
   - **Hãng / Thương hiệu (`chuanHoaHang`):** `NFKC`, chữ thường, cắt hậu tố pháp nhân (`co., ltd`, `inc.`, `gmbh`, `corp.`, `corporation`, `electric`, `electronics`, `有限公司`, `股份有限公司`, `주식회사`), gộp khoảng trắng (vd `"Mitsubishi Electric Corp."` → `mitsubishi`). Các tên đa ngữ (`"三菱"`, `"Mitsubishi"`, `"Mitsubishi Electric"`) được lưu thành các dòng trong `dd_bi_danh` cùng trỏ về một `nut_id` (`THUONG_HIEU`).
   - **Model (`chuanHoaModel`):** `NFKC`, chữ hoa ASCII, cắt tiền tố nhãn (`model:`, `mã:`, `type:`, `p/n:`, `part no:`, `型号:`), sinh đồng thời 2 khoá trong `dd_bi_danh`:
     - `bi_danh_chuan`: giữ dấu gạch nối/chấm giữa các cụm chữ-số (`FR-D720-0.75K`, `CR 10-5`, `6ES7214-1AG40-0XB0`).
     - `bi_danh_rut_gon`: xoá mọi ký tự ngoài `[a-z0-9]` (`frd720075k`, `cr105`, `6es72141ag400xb0`). Nhờ đó khách gõ `"FRD720 0.75K"` hay `"FR-D720-0.75K"` đều trúng 100% ở lần tra đầu.
   - **Chặn model quá ngắn / chung chung:** Không tạo nút `MODEL` độc lập nếu `bi_danh_rut_gon` dài `< 4` ký tự hoặc chỉ gồm số thuần tuý / đơn vị đo (`100W`, `220V`, `304`, `DN50`, `M12`).
2. **Quy tắc khi hai nguồn mâu thuẫn (`trang_thai_mau_thuan`):**
   - Khi một nguồn mới cung cấp thông số `ten_chuan` của cùng `nut_id` có giá trị khác với dòng đang lưu (sau khi đã quy đổi về cùng đơn vị chuẩn trong `lib/so-tay-gates.js`, lệch `> 1%` với số hoặc khác giá trị liệt kê):
     - **Tuyệt đối không ghi đè làm mất dấu vết:** Giữ cả hai dòng trong `dd_du_kien`, gắn `trang_thai_mau_thuan = 'MAU_THUAN'`.
     - **Phân giải theo bậc độ tin (`do_tin`):** Nếu một dòng đạt `VERIFIED` (hoặc từ `TRANG_HANG` độ tin 4 có trích đoạn khớp nguyên văn) còn dòng kia chỉ là `HYPOTHESIS` / `DIEN_DAN` (độ tin 1) ⇒ dòng độ tin cao thắng (`DA_PHAN_GIAI`).
     - **Hạ bậc an toàn khi ngang sức:** Nếu hai nguồn cùng đạt `CORROBORATED` (hoặc hai trang `SAN_TM` / `CATALOGUE` độ tin ngang nhau) mà mâu thuẫn trên một thông số thuộc `duKienQuyetDinh` của phân nhóm 6 số (vd một nguồn ghi công suất `0,75 kW`, nguồn kia ghi `1,5 kW` ngay ranh giới 1 kW) ⇒ **không tự chọn**, trả trạng thái thông số đó về `HYPOTHESIS` (kèm cả 2 nguồn trong `mau_thuan`) để động cơ phân loại bắt buộc hỏi khách (`NEED_FACTS`) hoặc yêu cầu ảnh chụp nhãn hàng thật.
3. **Hạn dùng của dữ kiện (`han_dung` / TTL):**
   - **Thông số kỹ thuật/vật lý cố định của một mã model (`dd_du_kien`):** `VERIFIED` hạn **365 ngày**; `CORROBORATED` hạn **180 ngày**; `HYPOTHESIS` hạn **30 ngày** (quá hạn vẫn giữ trong kho nhưng hạ về `HYPOTHESIS` và kích hoạt tra web làm mới ở nền).
   - **Cạnh thương mại (`BAN_MODEL`, `NIEM_YET_CUA_SHOP`):** hạn **90 ngày** (vì shop trên sàn có thể đổi mặt hàng trong link niêm yết).
   - **Cạnh pháp lý / mã HS (`THUOC_NHOM_HS`, `CO_HO_SO_SHTT`):** gắn chặt với `phien_ban_bieu` (`2026.04.05`) và `hash_so_tay` (`data/so-tay/<nhom4>.json`, `data/ho-so/ranh-gioi/<pn6>.json`). Ngay khi biểu thuế hoặc sổ tay nhóm đó cập nhật, cạnh `THUOC_NHOM_HS` tự động hết hiệu lực chốt nhanh và phải chạy lại cổng máy.
4. **Ai được nâng nhãn lên `VERIFIED`:**
   - **Cấm AI và bot đêm tự nâng nhãn:** Mọi dòng do LLM sinh hoặc bot thu thập chạy đêm nạp vào chỉ được mang nhãn tối đa `HYPOTHESIS` (nếu 1 nguồn) hoặc `CORROBORATED` (khi máy xác minh `lib/xac-minh-nguon.js` mở lại được `≥ 2` tên miền độc lập cùng chứa đúng mã `model` và câu `trich_doan` nguyên văn chứa giá trị thông số đó).
   - **Chỉ nâng lên `VERIFIED` qua 2 cổng:**
     1. **Cổng Người duyệt (`chuyen_vien:<id>`):** Chuyên viên / người duyệt xác nhận trên luồng `reviewFeedback` (`lib/feedback-store.js`) hoặc duyệt hồ sơ phân loại có ảnh chụp nameplate / catalogue thật.
     2. **Cổng Máy chính hãng (`cong_may:nsx_xac_minh`):** URL nguồn thuộc danh sách `ten_mien_chinh_thuc[]` đã đăng ký của nút `HANG_SX`/`THUONG_HIEU`, máy mở trực tiếp (`HTTP 200`) hoặc qua Open Browser MCP lưu được bản gốc vào MinIO có `ma_bam_noi_dung` (`SHA-256`), câu `trich_doan` chứa nguyên văn cả mã `model` lẫn giá trị thông số, và `trang_thai_mau_thuan = 'THONG_NHAT'`.

---

## 4. Ràng buộc Lưu trữ (Postgres + MinIO, 0 dữ liệu trên GitHub) · Dung lượng 3 mốc · Chỉ mục `< 100 ms`

### 4.1. Ranh giới lưu trữ & Riêng tư
- **Kho mã GitHub (`ozvietnam/hs-code-api`):** CHỈ chứa mã nguồn (`lib/`), lược đồ (`db/migrations/`), và tài liệu thiết kế (`docs/design/`). **Tuyệt đối không commit dữ liệu kho định danh, bản lưu HTML/PDF/ảnh, hay tệp dump vào Git (kể cả Git LFS).**
- **Tách dữ liệu cấu trúc và bản lưu thô trên máy chủ nhà:**
  - **Postgres (`hs_code_api`):** Chỉ giữ các bảng `dd_nut`, `dd_bi_danh`, `dd_nguon` (metadata + `ma_bam_noi_dung` + `trich_doan_luu` ≤ 1.000 ký tự), `dd_du_kien`, `dd_canh`.
  - **MinIO (sẵn có trên máy chủ nhà):** Giữ toàn bộ bản lưu thô (HTML trang sản phẩm đã cắt script, ảnh chụp nhãn nameplate, tệp PDF datasheet/catalogue) nén `zstd` theo đường dẫn định danh bằng nội dung: `s3://hs-dinh-danh/raw/<2-ký-tự-đầu-sha256>/<sha256>.zst`.
- **Bộ lọc riêng tư (`locRiengTuKhoDapAn` dùng chung với G5):** Chỉ lưu thông tin kỹ thuật của hàng hoá (hãng, thương hiệu, dòng, model, thông số, link sàn công khai); cắt sạch số tờ khai, số invoice/bill, số lượng, đơn giá, tên/MST/SĐT khách hàng.

### 4.2. Ước lượng dung lượng theo 3 mốc & Yêu cầu hạ tầng
| Mốc quy mô | Số dòng ước tính (`dd_nut` / `dd_bi_danh` / `dd_du_kien` / `dd_canh`) | Dung lượng Postgres (gồm cả B-tree Index) | Dung lượng MinIO (bản lưu trang/ảnh/PDF nén ~80–100 KB/model) | Thời gian tra cứu theo `hãng + model` (B-tree lookup) |
|---|---:|---:|---:|---:|
| **Mốc 1: 10.000 model** | ~15k nút · ~40k bí danh · ~100k dữ kiện · ~50k cạnh | **~120 MB** | **~1 GB** | **`< 2 ms`** (qua mạng nội bộ `< 15 ms`) |
| **Mốc 2: 100.000 model** | ~130k nút · ~350k bí danh · ~1M dữ kiện · ~500k cạnh | **~1,2 GB** | **~10 GB** | **`< 4 ms`** (qua mạng nội bộ `< 25 ms`) |
| **Mốc 3: 1.000.000 model** | ~1,2M nút · ~3,5M bí danh · ~10M dữ kiện · ~5M cạnh | **~12 GB** | **~100 GB** | **`< 8 ms`** (qua mạng nội bộ **`< 40 ms`**, dưới xa đích `100 ms`) |

- **Tại sao giữ trên Postgres mà chưa cần Graph DB riêng (Neo4j/Memgraph)?** Ở mốc 1 triệu model (~12 GB), toàn bộ cây chỉ mục B-tree của `dd_bi_danh` (~3,5 triệu dòng, ~250 MB index) và `dd_canh` (~5 triệu dòng, ~400 MB index) nằm gọn trong RAM `shared_buffers` của Postgres. Các truy vấn nghiệp vụ ở Mục 2.2 chỉ đi **1–2 bước nhảy cố định** (`bi_danh → MODEL → du_kien / canh`), truy vấn bằng `JOIN` có chỉ mục trên Postgres đạt `< 8 ms` mà không phát sinh chi phí vận hành/đồng bộ hai hệ CSDL.
- **5 chỉ mục bắt buộc để giữ thời gian tra `< 100 ms` ở mốc 1 triệu model:**
  1. `CREATE INDEX IF NOT EXISTS idx_dd_bi_danh_tra_nhanh ON dd_bi_danh (loai_nut, bi_danh_rut_gon);`
  2. `CREATE UNIQUE INDEX IF NOT EXISTS idx_dd_nut_loai_khoa ON dd_nut (loai_nut, khoa_chuan);`
  3. `CREATE INDEX IF NOT EXISTS idx_dd_du_kien_nut_ten ON dd_du_kien (nut_id, ten_chuan, muc_kiem_chung);`
  4. `CREATE INDEX IF NOT EXISTS idx_dd_canh_tu ON dd_canh (tu_nut_id, loai_canh);`
  5. `CREATE INDEX IF NOT EXISTS idx_dd_canh_den ON dd_canh (den_nut_id, loai_canh);`
- **Sao lưu & Phục hồi:**
  - **Postgres:** `pg_dump -Fc --table='dd_*'` hàng ngày (ở mốc 100k model bản nén chỉ ~250 MB, mốc 1M model ~2,5 GB) + WAL archiving cùng cụm Postgres `hs_code_api`.
  - **MinIO:** Vì tệp lưu theo khoá bất biến `SHA-256` (content-addressed, không bao giờ sửa tệp cũ), sao lưu bằng `mc mirror --watch` hoặc chạy incremental mỗi đêm chỉ chép thêm các tệp băm mới phát sinh trong ngày.
- **Bot thu thập chạy đêm:** Chạy bằng hàng chờ ưu tiên (1. model khách hỏi trượt kho trong ngày → 2. model/link sàn từ đơn `erp-xnk` → 3. model trong `phan_loai_cong_viec`), giới hạn tốc độ theo từng tên miền (`≤ 1 request / 3 giây / domain`), chỉ dùng SearXNG nội bộ (`lib/tim-web.js`) + mô hình miễn phí/rẻ (không gọi Claude, không gọi MiniMax); mọi dữ kiện bot đêm ghi vào kho ở nhãn `HYPOTHESIS` (hoặc `CORROBORATED` khi máy `xacMinhNhieu` xác nhận ≥ 2 miền độc lập khớp trích đoạn), không tự nâng lên `VERIFIED`.
- **Hạ tầng:** `CẦN QT: cần ~15 GB ổ đĩa Postgres và ~120 GB bucket MinIO (s3://hs-dinh-danh) cho mốc 1 triệu model (mốc 100 nghìn model đầu tiên chỉ cần ~1,5 GB Postgres + ~12 GB MinIO).`

---

## 5. Năm điểm phản biện đề nghị của QT khi đối chiếu với mã nguồn hiện có

Đối chiếu yêu cầu trên thẻ với mã nguồn hiện hành trên `main` (`lib/identify.js`, `lib/attribute-frames.js`, `lib/xac-minh-nguon.js`) và 2 nhánh PR [#1496](https://github.com/ozvietnam/hs-code-api/pull/1496), [#1497](https://github.com/ozvietnam/hs-code-api/pull/1497), có **5 điểm trong giả định ban đầu cần chỉnh lại** để không tạo lỗ hổng khi dựng kho:

1. **Mã hiện tại gán nhãn `HYPOTHESIS/CORROBORATED/VERIFIED` cho CẢ MÓN (`frame`), chưa gán ở mức TỪNG DÒNG DỮ KIỆN (`lib/attribute-frames.js:83-93`, `lib/identify.js:116-123`):**
   - *Hiện trạng:* `identify()` trả `frame.truong` là một object phẳng `{power: "22 kW", voltage: "380V", ...}` tách rời khỏi mảng `nguon: [{url, trich}]`, rồi gọi `tamGiacKiemChung(daMo)` gán một nhãn `xacMinh.muc` chung cho cả món. Nếu trang nguồn chỉ chứa câu trích về `22 kW` mà không hề nói tới `380V` (do LLM tự nhớ), việc chép nguyên `xacMinh.muc` của món xuống mọi dòng thông số trong `dd_du_kien` sẽ biến thông số LLM tự đoán thành `CORROBORATED`/`VERIFIED`.
   - *Cách sửa trong Kho định danh:* Khi ghi từ `identify()` vào `dd_du_kien`, máy đối chiếu từng `gia_tri_chu` với `trich` của các nguồn `daMo`: thông số nào có giá trị xuất hiện trong câu trích đã xác minh của nguồn đó mới được gán `nguon_id` và hưởng nhãn `CORROBORATED`/`VERIFIED`; thông số nào không nằm trong câu trích đã xác minh thì ghi `nguon_id = NULL`, `muc_kiem_chung = 'HYPOTHESIS'`.
2. **Hàm `tamGiacKiemChung` (`lib/attribute-frames.js:76,87`) đang tin cờ `loai: "nsx"` do LLM tự khai để nâng thẳng lên `VERIFIED`:**
   - *Hiện trạng:* Dòng 87 viết `if (chiTiet.some((n) => String(n.loai || '').toLowerCase() === 'nsx' || NSX_RE.test(String(n.url)))) return { muc: 'VERIFIED' }`, trong khi `n.loai` chính là trường do LLM sinh ra trong JSON (`lib/identify.js:24`) và `NSX_RE` chỉ hardcode đúng 11 hãng.
   - *Cách sửa trong Kho định danh:* Bỏ việc tin `n.loai === 'nsx'` của LLM khi ghi kho lâu dài. Chỉ công nhận nguồn NSX khi `tenMien(url)` khớp danh sách `ten_mien_chinh_thuc[]` đã đăng ký trên nút `HANG_SX`/`THUONG_HIEU` (hoặc `NSX_RE` đã kiểm duyệt).
3. **3/10 trang hãng lớn (`Siemens`, `Omron`, `SMC`) chặn `fetch` bằng WAF `HTTP 403` và `Grundfos` là SPA rỗng (`OZV-1656`):**
   - *Hiện trạng:* PR [#1496](https://github.com/ozvietnam/hs-code-api/pull/1496) đã thêm bước 0 tra SearXNG (`lib/dinh-danh-tim-web.js`), nhưng sau khi LLM trả kết quả thì `lib/identify.js` vẫn đưa URL qua `xacMinhNhieu` gọi `fetch` trực tiếp. Với các trang hãng có WAF trả `HTTP 403` hoặc SPA chỉ có khung JS rỗng, `xacMinhNhieu` vẫn đánh `moDuoc: false` và vứt bỏ nguồn đó!
   - *Cách sửa trong Kho định danh:* Với nguồn có `tu === 'TIM_WEB'` (do SearXNG nội bộ trực tiếp trả về `doanTrich` có chứa đúng mã `model` dài `≥ 4` ký tự), nếu bước `fetch` trực tiếp gặp `HTTP 403` hoặc SPA rỗng nhưng câu `trich` khớp với `doanTrich` của SearXNG, cho phép lưu vào `dd_nguon` với `loai_nguon = 'TIM_WEB_SNIPPET'` (tối đa lên `CORROBORATED` khi có `≥ 2` tên miền độc lập trên SearXNG cùng khớp), đồng thời đẩy URL bị 403 vào hàng chờ để bot đêm mở qua Open Browser MCP lấy bản lưu đầy đủ vào MinIO.
4. **PR [#1497](https://github.com/ozvietnam/hs-code-api/pull/1497) chỉ mới nối `body.dinhDanh` vào động cơ hồ sơ (`lib/ho-so/nghien-cuu.js`), CHƯA nối dữ kiện định danh vào động cơ phân loại `classify()`:**
   - *Hiện trạng:* PR #1497 giúp `lib/ho-so/nghien-cuu.js` không gọi lại `identify()` lần thứ hai khi `HS_HO_SO=shadow|on`, nhưng tác giả PR #1497 giữ nguyên `attrs` của `classify()` không đổi (vì lo ngại dữ kiện `frame.truong` chưa kiểm làm lệch mã). Tuy nhiên, báo cáo thực nghiệm [OZV-1656](/OZV/issues/OZV-1656) (Mục 2.1) chứng minh nếu không nạp thông số định danh vào `attrs` (`congDung`, `thongSo`), `classifyLoop` vẫn xếp nhầm `FP6308U` sang `8413.60` (thay vì `8413.30`) và vẫn hỏi lại công suất `0.75 kW` của biến tần `FR-D720-0.75K`.
   - *Cách sửa trong Kho định danh:* Tách bạch theo mức kiểm chứng — các dòng `dd_du_kien` mới ở mức `HYPOTHESIS` thì **không** tự bơm vào `attrs` của `classify()`, nhưng các dòng `dd_du_kien` đã đạt **`CORROBORATED` hoặc `VERIFIED`** (có câu trích nguồn xác thực) thì được nạp vào `attrs.thongSo` / `attrs.congDung` trước khi gọi `classify()`.
5. **Lỗi khớp chuỗi con của `doanChuong()` (`lib/attribute-frames.js:54-63`) làm bộ lọc `hopLe` (`lib/identify.js:98-109`) xoá mất trường bắt buộc của 3/10 mẫu máy móc:**
   - *Hiện trạng:* Từ khoá `"pp"` của Chương 39 khớp nhầm vào mã model `"DSBC-32-100-PPVA-N3"` (xi lanh khí nén Festo Chương 84), và máy móc điện tử (biến tần, PLC Chương 85) chỉ được nạp khung Chương 84 nên bị `hopLe` cắt mất trường `voltage`.
   - *Cách sửa:* Trong `doanChuong()`, bắt buộc khớp theo ranh giới từ cho từ khoá ngắn (`≤ 3` ký tự như `pp`, `pe`, `pvc`, `abs`) và luôn nạp kèm cả khung Chương `84` + `85` (+ `90`) khi đầu vào có mã `model`; trong bảng `dd_du_kien`, cho phép lưu mọi `ten_chuan` hợp lệ thuộc tập hợp khung của mọi chương ứng viên.

---

## 6. Lộ trình thi công theo đợt (sau khi QT duyệt thiết kế & gộp PR #1496, #1497)

1. **PR 1 — Chế độ bóng Kho định danh (`HS_KHO_DINH_DANH=off|shadow`, trần đọc kho `100 ms`):**
   - *Tệp:* `db/migrations/0004_kho_dinh_danh.sql`, `lib/kho-dinh-danh.js`, nối vào `lib/identify.js`, `scripts/test-kho-dinh-danh.mjs`.
   - *Hành vi:* Khi `HS_KHO_DINH_DANH=shadow`, `/api/identify` tra thử `dd_bi_danh` → `dd_nut` → `dd_du_kien` với timeout cứng `100 ms`, ghi log số đo `{type: "kho_dinh_danh", ketQua: "TRUNG_KHO"|"TRUOT_KHO", msTraKho, mucKiemChung}`, vẫn chạy bước 0 tra web + LLM như bình thường rồi ghi không chặn (`fire-and-forget`) nút `THUONG_HIEU`, `MODEL`, `dd_bi_danh`, `dd_nguon`, `dd_du_kien` (tách mức kiểm chứng từng dòng thông số theo Mục 5.1–5.2). Khi bật `HS_KHO_DINH_DANH=on` và bản ghi đạt `CORROBORATED`/`VERIFIED` đủ trường bắt buộc, trả ngay từ kho trong `< 100 ms` (0 lượt web, 0 token AI).
2. **PR 2 — Nạp dữ kiện `CORROBORATED`/`VERIFIED` từ Kho định danh vào `api/classify.js` + Vá `doanChuong()` (`lib/attribute-frames.js`):**
   - *Tệp:* `lib/attribute-frames.js`, `api/classify.js`, `lib/kho-dinh-danh.js`, `scripts/test-classify-kho-dinh-danh.mjs`.
   - *Hành vi:* Sửa lỗi khớp chuỗi con `"pp"` → `"PPVA"` và luôn kèm khung Chương 84+85 cho hàng có model; khi `/api/classify` nhận hàng có `thuongHieu + model` (hoặc `body.dinhDanh`), chỉ nạp các thông số đã đạt `CORROBORATED`/`VERIFIED` vào `attrs` để động cơ `classify()` chạy và chốt 8 số. Đo đối chiếu trước–sau trên 10 mẫu máy móc của [OZV-1656](/OZV/issues/OZV-1656).
3. **PR 3 — Nạp cạnh hệ sinh thái (`SHOP`, `NIEM_YET`, `DI_KEM`/`PHU_TUNG_CUA`, `CO_HO_SO_SHTT`) & Công cụ bot thu thập chạy đêm (`scripts/bot-thu-thap-dinh-danh.mjs`):**
   - *Tệp:* `scripts/bot-thu-thap-dinh-danh.mjs`, API đọc đồ thị cho `erp-xnk` (cus check) và Cổng OZ (nối cạnh `CO_HO_SO_SHTT` gọi `kiem_tra_shtt`).
