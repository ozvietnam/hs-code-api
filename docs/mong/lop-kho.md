# Bảng lớp kho dữ liệu & Cổng chống lẫn (`lop-kho@1`)

Thực hiện thẻ **M-23 (`#1910`)** theo **ADR-0005** và `docs/ke-hoach-lam-chac-mong.md`.

## 1. Sáu lớp dữ liệu dưới `data/`

> **Nguyên tắc phân lớp `RUT_TU_LUAT`:** chỉ xếp `RUT_TU_LUAT` khi **mỗi mục có trích nguyên văn máy kiểm được và không do AI tự diễn**; mọi bảng tổng hợp hoặc diễn giải chưa chứng minh từng mục có trích nguyên văn đều xuống `BO_TRO` (hoặc `THUC_TE` / `KY_THUAT` tùy bản chất).

| Lớp | Vai trò & Quy tắc tin cậy | Ai được đọc ở đường phân loại mới |
|---|---|---|
| `LUAT` | Văn bản quy phạm pháp luật gốc, biểu thuế 2022/2026, chú giải Phần/Chương/Nhóm/Phân nhóm bản HS 2022, SEN AHTN 2022, ý kiến WCO gốc, văn bản chuyên ngành. | Mọi mô-đun luật (`lib/chu-giai-goc.js`, `lib/do-thi/phai-doc.js`, `lib/do-thi/dan-chieu.js`, `lib/sen.js`, `lib/wco-op.js`, `/api/notes`). |
| `RUT_TU_LUAT` | Cấu trúc/tổng hợp rút từ văn bản luật **chỉ khi mỗi mục có trích nguyên văn máy kiểm được và không do AI tự diễn** (phần `trich` của sổ tay nhóm, `ho-so/ranh-gioi`, `chu-giai-2-phan-xvi` phần `trich`, `tu-vung@*`, `canh-nhac-nhom`). | Được đọc ở phần có trích luật gốc đã kiểm chứng; tách rạch ròi với trường diễn giải `BO_TRO`. |
| `BO_TRO` | Từ điển, đồng nghĩa, tên thương mại, bản dịch không chính thức (`wco-op/vi.json`), bảng diễn giải/AI chưa chứng minh từng mục có trích (`chu-giai-heading.json` phần diễn giải, `explanatory-notes.json`, `attributes.json`, `decision-tables/**`, `loai-khac-*`, `luat-goc/tom-tat/**`...), phân loại vật liệu, nhãn tiếng Trung/Anh. | **Cấm** mọi mô-đun luật nạp (trừ ngoại lệ có kiểm soát duy nhất `data/wco-op/vi.json` kèm cảnh báo không chính thức trong `lib/wco-op.js`). |
| `TIEN_LE` | Thông báo kết quả phân loại của cơ quan Hải quan: `data/luat-goc/thong-bao.jsonl` (M-19), `data/precedents.json` (TB-TCHQ), `data/tien-le-thay-the.json`, `data/community/{tb-tchq,intl-precedents,examples}/**`, `data/community-parked/**`. | **Cấm** mọi mô-đun luật nạp; **chỉ bước kiểm cuối** (`lib/kiem-truoc-chot.js`, `lib/do-thi/tieu-chi-6.js`) được nạp. |
| `THUC_TE` | Tờ khai nội bộ OZ (`oz-gold-final.jsonl`, `oz-export/*`), ánh xạ thực tế (`mic-hs-map.json`, `mic-products.json`), phản hồi người dùng (`feedback.jsonl`), bộ chuẩn gán nhãn (`bo-chuan/*`). | **Cấm** mọi mô-đun luật nạp; chỉ dùng để đo chuẩn và đối chiếu sau khi đọc luật (L1/ADR-0005). |
| `KY_THUAT` | Chỉ mục tìm kiếm/vector (`search.json`, `luat-goc/chi-muc/**`, `gd0/**`), snapshot biểu thuế, báo cáo đo/soát lỗi, hàng đợi, nhật ký lỗi/audit, prompt LLM, cấu hình cổng (`bang-co.json`, `dau-noi.json`, `lop-kho.json`). | Hạ tầng kỹ thuật, tìm nhanh đường vào, cổng kiểm và đo đạc. |

## 2. Độ phủ kiểm kê trên nhánh (`4.418` tệp trên `origin/main` + `data/lop-kho.json` = `4.419` tệp)

Kiểm tra trực tiếp bằng `node scripts/test-lop-kho.mjs --thong-ke` cho tổng cộng **164 mục** (gồm cả các mục `tuyChon: true` dự phòng cho `data/luat-goc/*` và `data/oz-export/*`), phủ **100% — 4.419/4.419 tệp thật** dưới `data/` (không sót tệp nào, mỗi tệp khớp đúng 1 mục):

| Lớp | Số tệp thật trên nhánh | Ví dụ tiêu biểu |
|---|---:|---|
| `LUAT` | **26** | `data/tax.json`, `data/bieu-thue/2026.04.05/**`, `data/luat-goc/{bieu,chuong,gir}.jsonl`, `data/sen-2022.json`, `data/wco-op/opinions.json`, `data/plhq-registry.json`, `data/thue-tam-thoi.json`, `data/van-ban-chuyen-nganh/**` |
| `RUT_TU_LUAT` | **3.795** | `data/so-tay/[0-9][0-9][0-9][0-9].json` (1.269), `data/do-thi/ban-do-4so/*.json` (372), `data/ho-so/ranh-gioi/**` + `phan-biet-vat-lieu/**` (2.141), `data/luat/chu-giai-2-phan-xvi.json` (`trich`), `data/luat/dieu-khoan-tang2.json` (*361 dòng TỔNG QUÁT gắn nhầm nhãn chú giải – xem M-35*) |
| `BO_TRO` | **198** | `data/loai-khac-products/**` (97), `data/decision-tables/**` (32), `data/wco-op/vi.json`, `data/chu-giai-chuong.json`, `data/chu-giai-heading.json`, `data/explanatory-notes.json`, `data/legal-notes-enriched.json`, `data/synonyms.json`, `data/taxonomy/**`, `data/bieu-thue/zh/**` |
| `TIEN_LE` | **177** | `data/community/tb-tchq/**` (170), `data/community/intl-precedents/**` (2), `data/community/examples/**` (1), `data/community-parked/**` (2), `data/precedents.json`, `data/tien-le-thay-the.json` (cùng `data/luat-goc/thong-bao.jsonl` chờ gộp M-19) |
| `THUC_TE` | **14** | `data/mic-hs-map.json`, `data/mic-products.json`, `data/oz-gold-final.jsonl`, `data/feedback.jsonl`, `data/bo-chuan/*.{json,jsonl}`, `data/ho-so/{hieu-chinh-tien-le,lat-1,lat-2}.json`, `data/community/mic/**` |
| `KY_THUAT` | **209** | `data/so-tay/_bao-cao.json` + `bao-cao/**` (125), `data/do-thi/soat-*/**` (19), `data/bench/**` (9), `data/versions/**` (6), `data/search.json`, `data/luat/{bang-co,dau-noi}.json`, `data/lop-kho.json`, `data/prompts/**` |
| **Tổng cộng** | **4.419** | **100% có lớp (0 thiếu, 0 trùng)** |

## 3. Kho lẫn nhiều lớp theo trường (`truongLan` — mục tiêu dọn ở M-21 / M-22 / M-24 / M-35)

Các kho cũ dưới đây đang trộn nguyên văn luật với diễn giải AI/máy sinh hoặc tiền lệ; `data/lop-kho.json` ghi rõ từng trường trong `truongLan`:

| Tệp kho | Trường `LUAT` / `RUT_TU_LUAT` | Trường `BO_TRO` / `TIEN_LE` / `THUC_TE` / `KY_THUAT` |
|---|---|---|
| `data/chu-giai-heading.json` | `nhom`, `nhom_day_du`, `ten_nhom`, `sen` (`LUAT`) | `bao_gom`, `khong_bao_gom`, `loai_tru` (*dính chữ chương sau, chữ lặp*), `tinh_chat`, `phan_biet` (`BO_TRO`); `nguon`, `nguon_toan_van`, `phien_ban`, `sen_nguon` (`KY_THUAT`) |
| `data/chu-giai-chuong.json` | `chuong` (`LUAT`) | `phan` (`BO_TRO` — *bản cũ không nguồn, thay bằng `luat-goc/phan.jsonl`, thiếu Chú giải 9 Phần XV…*); `nguon_toan_van`, `phien_ban` (`KY_THUAT`) |
| `data/explanatory-notes.json` | — | `noteVi` (`BO_TRO` — *câu cụt, gán giả cấp 8 số, trộn HS 2017*); `noteType`, `sourceFile` (`KY_THUAT`) |
| `data/legal-notes-enriched.json` | `chu_giai_nhom`, `sen` (`LUAT`) | `bao_gom`, `khong_bao_gom`, `loai_tru`, `tinh_chat`, `phan_biet` (`BO_TRO` — *câu cụt, gán giả cấp 8 số, trộn HS 2017*); `nguon_phap_ly`, `_src` (`KY_THUAT`) |
| `data/notes.json` | Toàn bộ khóa Chương đều thuộc `RUT_TU_LUAT` | Sẽ thay bằng `data/luat-goc/phan.jsonl` + `chuong.jsonl` ở M-21 |
| `data/luat/chu-giai-2-phan-xvi.json` | `nguyenVan` (`LUAT`); `trich`, `trichBoSung` (*gốc là `.phan` cũ*, `RUT_TU_LUAT`) | `tomTat`, `moTa` (`BO_TRO`); `phienBan`, `nguonGoc` (`KY_THUAT`) |
| `data/so-tay/[0-9][0-9][0-9][0-9].json` | Phần có `trich`: `phamVi`, `dieuKienVao`, `loaiTru`, `tieuChi6`, `dong8` (`RUT_TU_LUAT`) | `op`, `value`, `hoi` (*câu hỏi*), `phanBiet` (`BO_TRO`); `cay`, `dungTuNguon`, `taoBoi`, `kiemTra` (`KY_THUAT`) |
| `data/tax-enriched.json` | `warnings` (`RUT_TU_LUAT`) | `enrichedAt`, `enrichModel` (`KY_THUAT`) |
| `data/do-thi/canh-nhac-nhom.json` | `trich` (`LUAT`) | `quanHe` (`BO_TRO`); `nguonLoai` (`KY_THUAT`) |
| `data/do-thi/ban-do-4so/*.json` | `canh` (`RUT_TU_LUAT`) | `hoSo` (`THUC_TE`); `chamCheo`, `nguonLoai` (`KY_THUAT`) |
| `data/precedents.json` | — | `tbTchqNumber`, `outcome`, `girRule`, `productName`, `technicalSpec` (`TIEN_LE`); `confusedWith` (`BO_TRO`); `sourceFile`, `sourceUrl` (`KY_THUAT`) |

## 4. Cổng chống lẫn `scripts/test-lop-kho.mjs`

1. **Mọi tệp trong `data/` đều phải có lớp:** thêm tệp mới vào `data/` mà chưa khai vào `data/lop-kho.json` ⇒ **ĐỎ**.
2. **Không trùng lặp / không sai lớp:** một tệp không được khớp hai mục khác nhau; mọi `lop` phải nằm trong 6 lớp chuẩn (`LUAT`, `RUT_TU_LUAT`, `BO_TRO`, `TIEN_LE`, `THUC_TE`, `KY_THUAT`); mọi `aiDoc` bắt buộc phải tồn tại.
3. **Cấm mô-đun luật nạp `BO_TRO`, `THUC_TE` hoặc `TIEN_LE`:** quét tĩnh (`moDunLuatCamLan`) cả đường nạp trực tiếp lẫn gián tiếp (theo `require`/`import`) trên `lib/chu-giai-goc.js` (M-21), `lib/do-thi/phai-doc.js`, `lib/do-thi/dan-chieu.js` (M-32), `lib/sen.js`, `lib/wco-op.js`.
   - **Ngoại lệ chuyển tiếp có kiểm soát (chờ gỡ ở M-34):** trước M-34, `lib/do-thi/phai-doc.js` đọc đồ thị cạnh qua cầu `lib/do-thi/index.js → lib/do-thi/dung-bang-canh.js`. Cổng vẫn kiểm chặt trực tiếp `lib/do-thi/phai-doc.js`: **đỏ ngay** nếu đọc bất kỳ kho `BO_TRO`/`THUC_TE`/`TIEN_LE` nào (trực tiếp hay qua module trung gian mới), nếu `LOAI` chứa `'C8'`/`'C1'`, hoặc nếu gọi `tienLeUngHo`.
   - **Ngoại lệ bản dịch có kiểm soát ở `lib/wco-op.js`:** chỉ được đọc duy nhất `data/wco-op/vi.json` (`BO_TRO` — bản dịch máy kèm cảnh báo không chính thức) cùng `data/wco-op/opinions.json` (`LUAT`); bất kỳ tệp `BO_TRO`/`THUC_TE`/`TIEN_LE` nào khác đều bị chặn.
   - **Đủ 7 ca ngược:** thiếu lớp (`CA NGƯỢC 1`), nạp `BO_TRO` trực tiếp (`CA NGƯỢC 2`), nạp `THUC_TE` (`CA NGƯỢC 3`), `phai-doc.js` đọc `precedents.json`/`C8` (`CA NGƯỢC 4`), nạp gián tiếp qua module trung gian (`CA NGƯỢC 5`), trùng mục / sai tên lớp (`CA NGƯỢC 6`), và mô-đun luật nạp kho `TIEN_LE` như `precedents.json` / `luat-goc/thong-bao.jsonl` (`CA NGƯỢC 7`).

## 5. Cách cập nhật khi thêm kho mới

1. Thêm mục `{ "duongDan": "data/...", "lop": "...", "aiDoc": [...], "moTa": "..." }` vào `data/lop-kho.json` (khớp duy nhất, không chồng lên mục glob đã có).
2. Nếu là tệp có cả nguyên văn luật lẫn trường phụ trợ, khai thêm `"truongLan"`.
3. Chạy `node scripts/test-lop-kho.mjs --thong-ke` và xác nhận tất cả ca thuận lẫn 7 ca ngược đều xanh.
