# Bảng lớp kho dữ liệu & Cổng chống lẫn (`lop-kho@1`)

Thực hiện thẻ **M-23 (`#1910`)** theo **ADR-0005** và `docs/ke-hoach-lam-chac-mong.md`.

## 1. Năm lớp dữ liệu dưới `data/`

| Lớp | Vai trò & Quy tắc tin cậy | Ai được đọc ở đường phân loại mới |
|---|---|---|
| `LUAT` | Văn bản quy phạm pháp luật gốc, biểu thuế 2022/2026, chú giải Phần/Chương/Nhóm/Phân nhóm bản HS 2022, SEN AHTN 2022, ý kiến WCO gốc, văn bản chuyên ngành. | Mọi mô-đun luật (`lib/chu-giai-goc.js`, `lib/do-thi/phai-doc.js`, `lib/do-thi/dan-chieu.js`, `lib/sen.js`, `lib/wco-op.js`, `/api/notes`). |
| `RUT_TU_LUAT` | Cấu trúc/tổng hợp rút từ văn bản luật (sổ tay nhóm, ranh giới phân nhóm 6 số, bảng quyết định, chỉ số residual, bản dịch phái sinh). | Được đọc khi trích rõ nguồn luật gốc; không được lẫn `phanBiet` hay suy đoán AI không trích. |
| `BO_TRO` | Từ điển tên thương mại, từ đồng nghĩa, bẫy suy luận, nhãn SHTT, cặp dễ nhầm chưa duyệt, phân loại vật liệu, nhãn tiếng Trung/Anh. | **Cấm** mọi mô-đun luật nạp; chỉ dùng để mở rộng tìm cửa vào (có gắn nhãn rõ) hoặc hậu kiểm tách riêng. |
| `THUC_TE` | Tiền lệ thực tế: TB-TCHQ, tờ khai OZ (`oz-gold-final.jsonl`, `oz-export/*`), phản hồi người dùng, bộ chuẩn gán nhãn, dữ liệu cộng đồng. | **Cấm** mọi mô-đun luật nạp; chỉ làm tín hiệu đối chiếu sau khi đọc luật (L1/ADR-0005). |
| `KY_THUAT` | Chỉ mục vector, snapshot phiên bản biểu thuế, báo cáo benchmark, hàng đợi biên soạn, nhật ký lỗi/audit, prompt LLM, cấu hình cổng (`bang-co.json`, `dau-noi.json`, `lop-kho.json`). | Hạ tầng kỹ thuật, cổng kiểm và đo đạc. |

## 2. Độ phủ kiểm kê trên `origin/main` (100% tệp `data/`)

Kiểm tra trực tiếp bằng `node scripts/test-lop-kho.mjs --thong-ke` cho tổng cộng **161 mục** (gồm cả mục `tuyChon: true` dự phòng cho các kho lớp 1 & lớp 3 sắp gộp vào `data/luat-goc/`), phủ **100% — 4.419/4.419 tệp thật** dưới `data/` (không sót tệp nào, mỗi tệp khớp đúng 1 mục):

| Lớp | Số tệp thật trên `origin/main` | Ví dụ tiêu biểu |
|---|---:|---|
| `LUAT` | **26** | `data/tax.json`, `data/bieu-thue/2026.04.05/**`, `data/luat-goc/{bieu,chuong,gir}.jsonl`, `data/sen-2022.json`, `data/wco-op/opinions.json`, `data/plhq-registry.json`, `data/thue-tam-thoi.json`, `data/van-ban-chuyen-nganh/**` |
| `RUT_TU_LUAT` | **3.939** | `data/so-tay/[0-9][0-9][0-9][0-9].json` (1.269), `data/do-thi/ban-do-4so/*.json` (372), `data/ho-so/ranh-gioi/**` + `phan-biet-vat-lieu/**` (2.141), `data/loai-khac-products/**` (97), `data/decision-tables/**` (32), kho chú giải/cấu trúc rút từ luật |
| `BO_TRO` | **56** | `data/synonyms.json`, `data/trade-synonyms.json`, `data/confusion-pairs.json`, `data/tu-vung/ten-khac-*.json`, `data/taxonomy/**`, `data/shtt/ung-vien-nhan-hieu.*`, `data/bieu-thue/zh/**` |
| `THUC_TE` | **190** | `data/community/**` (174), `data/community-parked/**` (2), `data/oz-gold-final.jsonl`, `data/precedents.json`, `data/feedback.jsonl`, `data/bo-chuan/*.{json,jsonl}`, `data/ho-so/{hieu-chinh-tien-le,lat-1,lat-2}.json` |
| `KY_THUAT` | **208** | `data/so-tay/_bao-cao.json` + `bao-cao/**` (126), `data/do-thi/soat-*/**` (19), `data/bench/**` (9), `data/versions/**` (6), `data/luat/{bang-co,dau-noi}.json`, `data/lop-kho.json`, `data/prompts/**` |
| **Tổng cộng** | **4.419** | **100% có lớp (0 thiếu, 0 trùng)** |

## 3. Kho lẫn nhiều lớp theo trường (`truongLan` — mục tiêu dọn ở M-21 / M-22 / M-24)

Các kho cũ dưới đây đang trộn văn bản luật với trường AI/kỹ thuật hoặc tiền lệ; `data/lop-kho.json` ghi rõ từng trường trong `truongLan`:

| Tệp kho | Trường `LUAT` / `RUT_TU_LUAT` | Trường `BO_TRO` / `THUC_TE` / `KY_THUAT` |
|---|---|---|
| `data/chu-giai-heading.json` | `nhom`, `nhom_day_du`, `ten_nhom`, `sen` (`LUAT`); `bao_gom`, `khong_bao_gom`, `loai_tru` (`RUT_TU_LUAT`) | `tinh_chat`, `phan_biet` (`BO_TRO`); `nguon`, `nguon_toan_van`, `phien_ban`, `sen_nguon` (`KY_THUAT`) |
| `data/chu-giai-chuong.json` | `chuong`, `phan` (`LUAT`) | `nguon_toan_van`, `phien_ban` (`KY_THUAT`) |
| `data/explanatory-notes.json` | `noteVi` (`RUT_TU_LUAT`) | `noteType`, `sourceFile` (`KY_THUAT`) |
| `data/legal-notes-enriched.json` | `chu_giai_nhom`, `sen` (`LUAT`); `bao_gom`, `khong_bao_gom`, `loai_tru` (`RUT_TU_LUAT`) | `tinh_chat`, `phan_biet` (`BO_TRO`); `nguon_phap_ly`, `_src` (`KY_THUAT`) |
| `data/notes.json` | Toàn bộ khóa Chương đều thuộc `RUT_TU_LUAT` | Sẽ thay bằng `data/luat-goc/phan.jsonl` + `chuong.jsonl` ở M-21 |
| `data/so-tay/[0-9][0-9][0-9][0-9].json` | `phamVi`, `dieuKienVao`, `loaiTru`, `tieuChi6`, `dong8` (`RUT_TU_LUAT`) | `phanBiet` (`BO_TRO`); `cay`, `dungTuNguon`, `taoBoi`, `kiemTra` (`KY_THUAT`) |
| `data/tax-enriched.json` | `warnings` (`RUT_TU_LUAT`) | `enrichedAt`, `enrichModel` (`KY_THUAT`) |
| `data/do-thi/canh-nhac-nhom.json` | `trich` (`LUAT`) | `quanHe` (`BO_TRO`); `nguonLoai` (`KY_THUAT`) |
| `data/do-thi/ban-do-4so/*.json` | `canh` (`RUT_TU_LUAT`) | `hoSo` (`THUC_TE`); `chamCheo`, `nguonLoai` (`KY_THUAT`) |
| `data/precedents.json` | — | `tbTchq` (`THUC_TE`); `confusedWith` (`BO_TRO`) |

## 4. Cổng chống lẫn `scripts/test-lop-kho.mjs`

1. **Mọi tệp trong `data/` đều phải có lớp:** thêm tệp mới vào `data/` mà chưa khai vào `data/lop-kho.json` ⇒ **ĐỎ**.
2. **Không trùng lặp / không sai lớp:** một tệp không được khớp hai mục khác nhau; mọi `lop` phải nằm trong 5 lớp chuẩn; mọi `aiDoc` bắt buộc phải tồn tại.
3. **Cấm mô-đun luật nạp `BO_TRO` hoặc `THUC_TE`:** quét tĩnh (`moDunLuatCamLan`) cả đường nạp trực tiếp lẫn gián tiếp (theo `require`/`import`) trên `lib/chu-giai-goc.js` (M-21), `lib/do-thi/phai-doc.js`, `lib/do-thi/dan-chieu.js` (M-32), `lib/sen.js`, `lib/wco-op.js`.
   - **Ngoại lệ chuyển tiếp có kiểm soát (chờ gỡ ở M-34):** trước M-34, `lib/do-thi/phai-doc.js` đọc đồ thị cạnh qua cầu `lib/do-thi/index.js → lib/do-thi/dung-bang-canh.js`. Cổng vẫn kiểm chặt trực tiếp `lib/do-thi/phai-doc.js`: **đỏ ngay** nếu đọc bất kỳ kho `BO_TRO`/`THUC_TE` nào (trực tiếp hay qua module trung gian mới), nếu `LOAI` chứa `'C8'`/`'C1'`, hoặc nếu gọi `tienLeUngHo`.

## 5. Cách cập nhật khi thêm kho mới

1. Thêm mục `{ "duongDan": "data/...", "lop": "...", "aiDoc": [...], "moTa": "..." }` vào `data/lop-kho.json` (khớp duy nhất, không chồng lên mục glob đã có).
2. Nếu là tệp có cả nguyên văn luật lẫn trường phụ trợ, khai thêm `"truongLan"`.
3. Chạy `node scripts/test-lop-kho.mjs --thong-ke` và xác nhận tất cả ca thuận lẫn 6 ca ngược đều xanh.
