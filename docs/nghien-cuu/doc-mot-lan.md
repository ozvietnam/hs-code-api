# Nghiên cứu thực nghiệm: Đọc một lần từ Chương xuống 8 số (M-82 · ADR-0011)

> Tài liệu này ghi chép số liệu thực đo, so sánh hai mô hình khác họ (`Người đọc` vs `Người phản biện`) và bài học quy trình cho thí điểm **M-82** (`#2483`, `ADR-0011`).

---

## 1. Thí điểm Chương 40 (`40.01–40.17`) — Máy `gpu-agy` (Windows · RTX PRO 5000 72GB)

### 1.1 Đội hình mô hình & cấu hình thực chạy
| Vai trò | Mô hình thực dùng | Hạ tầng chạy | Kỷ luật mù & phạm vi |
|---|---|---|---|
| **Người đọc (Reader)** | `Gemini Pro` (`Antigravity pro / gemini-4-neon-high`) | Antigravity (`Model: "pro"`, tuyệt đối không dùng `flash`/`flash_lite`) | Đọc mù 100% từ gói luật `data/luat-goc` (`goi-chuong-40` + `goi-4001..4017`); không mở `M-81-vang-4016.md`, `phieu-*/`, `dieu-kien/40.jsonl`, `#2410`; không chạy `soi-chong`. |
| **Người phản biện (Challenger)** | `gpt-oss:120b` (họ mô hình hoàn toàn khác `Gemini`) | Ollama cục bộ (`100% GPU` trên RTX PRO 5000 72GB Blackwell, `temperature=0.1`, `num_ctx=16384`) | Phản biện **đúng 1 vòng** trên từng `DIEM_MO_HO` kèm đúng các câu luật nguyên văn; không lặp vòng 2. |
| **Cổng máy hình thức** | `kiem-trich-m82.mjs` (tất định, không LLM) + `cong.mjs --cong 6..14` (chẩn đoán) | Node.js `v22.23.5` cục bộ | Chặn cứng trích không nguyên văn, `idCau` giả, thiếu mã 8 số, thiếu `canhTranhTimThay`, lẫn `tb:`/`wco:`; Cổng 6–14 chỉ chẩn đoán (không chạy vòng sửa theo ADR-0011). |

> **Ghi chú chọn mô hình:** Trên máy Windows `gpu-agy`, công cụ `invoke_subagent` không có mô hình Claude; đội thực hiện chọn **Gemini Pro** (mạnh nhất trên nền tảng) làm Người đọc và **`gpt-oss:120b`** cục bộ (120 tỷ tham số, 100% GPU, khác hẳn họ Gemini) làm Người phản biện, khai báo minh bạch trước khi chạy tại `#2440#issuecomment-7232746059`.

### 1.2 Số liệu sản lượng, số lượt gọi và thời gian thực đo
| Giai đoạn | Phạm vi | Số phiên / lượt gọi LLM | Thời gian thực đo | Sản lượng đầu ra | Kiểm chứng hình thức (`kiem-trich-m82`) |
|---|---|---:|---:|---|---|
| **Bước A — Đóng gói** | Chương 40 + 17 nhóm `40.01–40.17` | `0` (tất định) | `~15 s` | `1` gói chương + `17` gói nhóm (có `canhTranhTimThay` từ `#2481`) | `vanTayGoi` khớp `18/18` |
| **Bước B — Đọc Bậc 2 (`CHUONG`)** | `chuong.json` | `1` phiên `Gemini Pro` | `~5 phút` | `7` phạm vi, `9` loại trừ, `10` định nghĩa, `8` ưu tiên, `5` trục chính, `35` cạnh tranh, `6` `DIEM_MO_HO` | **PASS `0` lỗi** (`229` trích nguyên văn) |
| **Bước C — Đọc Bậc 4/6/8 (song song 4 ong)** | 17 nhóm `40.01–40.17` (`40.16` 1 ong riêng mù hoàn toàn) | `4` phiên `Gemini Pro` song song (`4001–4005`, `4006–4010`, `4011–4015 & 4017`, `4016`) | `~10 phút` wall-clock (tổng CPU-read ong ~20 phút) | `498` `DIEU_KIEN/GIAI_CHONG/CANH_TRANH`, `215/215` mã 8 số (`135` `ĐÚNG`, `80` `CHƯA ĐỦ DỮ KIỆN`), `188/188` `canhTranhTimThay`, `52` `DIEM_MO_HO` | **PASS `0` lỗi** trên cả `17/17` tệp (`2.407` trích nguyên văn) |
| **Bước D1 — Phản biện 1 vòng** | Toàn bộ `58` `DIEM_MO_HO` (`6` chương + `52` nhóm) | `58` lượt gọi `gpt-oss:120b` cục bộ (`128.266` prompt tok + `98.230` eval tok, `$0` phí API) | `25,43 phút` (`1.525,7 s`, trung bình `26,3 s`/điểm; khi ấm `6,6–19 s`/điểm) | `34` `CHỐT`, `2` `CHỐT KÈM GIẢ ĐỊNH`, `22` `CHƯA ĐỦ DỮ KIỆN` | `53/58` (`91,4%`) `0` lỗi trích ngay lần đầu; `5/58` mục bị bắt trích cắt gọt |
| **Bước D2 — Người đọc chốt cuối (1 vòng)** | `diem-mo-ho.jsonl` (`58` mục) | `1` lượt `Gemini Pro` | `~4 phút` | `27` `CHỐT`, `5` `CHỐT KÈM GIẢ ĐỊNH`, `26` `CHƯA ĐỦ DỮ KIỆN` | **PASS `0` lỗi** (`370` trích nguyên văn) |
| **Tổng cộng toàn Chương 40** | **1 chương · 17 nhóm · 215 mã 8 số** | **6 phiên `Gemini Pro` + 58 lượt `gpt-oss:120b`** | **~45 phút wall-clock** | `18` JSON + `diem-mo-ho.jsonl` + `dieu-kien.jsonl` + `bang-anh-em.jsonl` (`102` bảng) + `docs/so-tay-tra-sai/40.md` (`25/25` trích đúng) | **`3.006` trích nguyên văn trong JSON/JSONL — `0` lỗi** |

### 1.3 Phân tích 58 `DIEM_MO_HO` — Giá trị thật của phản biện 1 vòng

#### Phân loại theo nguyên nhân gốc
| Loại điểm mơ hồ (`loaiMoHo`) | Số lượng | Ví dụ tiêu biểu |
|---|---:|---|
| `MO_HO_NGU_NGHIA` (mơ hồ câu chữ / mức gia công) | `17` | `mh:40:04` (in phụ trợ vs trung gian in `Ch.49`), `mh:4008:02` (tấm lát sàn có khớp ghép âm dương), `mh:4009:03` (ống nhiên liệu cuộn dài), `mh:4014:02` (bao ngón tay phòng sạch ESD) |
| `CHONG_CA_HAI_NHANH` (chồng hai nhánh biểu / cấu trúc cấp gạch) | `17` | `mh:4005:03` (`4005.99.10` vs `.20`), `mh:4011:02` (máy `84.29/84.30` ở `4011.80` và `4011.90.20`), `mh:4012:01` (lốp trơn dưới "Loại khác"), `mh:4016:01–06` |
| `RANH_GIOI_VAT_LIEU` (cao su / plastic / dệt / ebonit) | `12` | `mh:40:01` (`TPE` vs `Ch.40`), `mh:40:02` (ngưỡng `1.500 g/m²` & `≤50%` dệt), `mh:4014:01` (silicone), `mh:4015:01` (đồ lặn neoprene), `mh:4017:01` (ebonit `>15/100` S) |
| `THIEU_NGUONG_DINH_LUONG` (luật không cho con số cứng) | `4` | `mh:40:03` (`≤5%`/`<2%` chỉ ở chú giải tổng quát), `mh:4003:01` (cao su tái sinh trộn nguyên chất), `mh:4004:01` & `mh:4012:03` (lốp quá mòn không đắp lại được) |
| `THIEU_SEN_HOAC_CHU_THICH` (thiếu hình vẽ / chân trang trong dữ liệu luật) | `4` | `mh:4001:01` (thiếu bảng `TSNR GP` trong `sen:40012250`), `mh:4009:02` (SEN ống ga Indonesia), `mh:4011:01` & `mh:4013:01` (thiếu sơ đồ đo và chú thích `(1)` sau `buses`) |
| `BAY_DICH_THUAT` (bẫy bản dịch Việt dễ dẫn sai) | `4` | `mh:4001:02` (*Váng cao su* vs *Cao su bọt*), `mh:4005:01` & `mh:4006:01` (*Của nhựa tự nhiên* = *natural gums*), `mh:4008:01` (dịch nhầm `> 5mm` ngay sau tấm/tờ/dải tại `nhom:4008:ct:2#1`) |
| **Tổng** | **58** | |

#### Kết quả đối đầu `Người đọc` vs `Người phản biện`
- **Đồng ý với Người phản biện:** `48/58` (`82,8%`).
- **Đổi / khép lại kết luận sau phản biện (`doiKetLuanSauPhanBien: true`):** **`28/58` (`48,3%`)**.
  - Tiêu biểu nhất: **`mh:4009:03`** — ban đầu Người đọc nghiêng về yêu cầu ống dẫn nhiên liệu/nước (`4009.31.91`) phải cắt đoạn/uốn cong sẵn cho xe; `gpt-oss:120b` chỉ ra chính xác chữ luật `bieu:40093191#1` **không hề có điều kiện cắt đoạn/uốn sẵn**, làm Người đọc đổi hẳn sang kết luận sát chữ luật hơn.
  - Ngoài ra `gpt-oss:120b` khép dứt khoát nhiều ranh giới quan trọng: `mh:4002:01` (cao su trương nở dầu khoáng vẫn thỏa *"chưa pha trộn"* tại `.10`/`.40`), `mh:4005:01` (*nhựa tự nhiên* ≠ cao su *Hevea*), `mh:4007:01` (dây bện phức > 5 mm vẫn ở `40.07`), `mh:4009:01` (ống gia cố cả kim loại lẫn dệt vào `4009.4`), `mh:4014:02` (bao ngón tay phòng sạch ESD bị loại khỏi `40.14` sang `40.16`), `mh:4016:01` (`4016.99.54` thuộc `4016.99.5`), `mh:4016:04` (`4016.91/93` thắng `4016.95` bơm hơi).
- **Người đọc bác bỏ / điều chỉnh Người phản biện:** **`10/58` (`17,2%`)** — chứng minh vòng chốt cuối của Người đọc là **bắt buộc**, không thể giao thẳng cho Người phản biện:
  1. **`mh:4008:01` (bẫy dịch thuật):** `gpt-oss:120b` dính thẳng bẫy dịch `nhom:4008:ct:2#1` và kết luận sai rằng tấm/tờ `≤ 5 mm` không thuộc `40.08` (trái với Chú giải pháp lý 7 và chính biểu `4008.11.10`/`90`).
  2. **`mh:4014:01` (đọc ngược Chú giải loại trừ):** `gpt-oss:120b` đọc ngược `chuong:39:cg:2:l#1` (loại trừ cao su tổng hợp khỏi Chương 39) thành bao gồm, từ đó xếp nhầm núm vú silicone vào `4014.90.10` thay vì Chương 39.
  3. **`mh:4016:06` (bỏ qua dòng đích danh):** `gpt-oss:120b` đẩy *Chắn bùn xe đạp* (`4016.99.16`) sang `4016.99.18` (*Phụ kiện **khác** của xe đạp*) kèm 1 trích không nguyên văn.
  4. **`mh:4016:03` & `mh:4016:05` (thiếu QT 3 trong ngữ cảnh phản biện):** Do kịch bản chưa đính kèm 6 Quy tắc tổng quát (`gir:1..6`) vào ngữ cảnh gửi `gpt-oss:120b`, mô hình từ chối áp dụng QT 3(a) và sinh câu hỏi hỏi ngược khách về *"ADR-0011 / QT 3(a)"* — Người đọc đã bác bỏ và chuẩn hóa lại toàn bộ câu hỏi khách sang ngôn ngữ mô tả hàng hóa.

### 1.4 Kết quả chẩn đoán Cổng 6–14 (theo ADR-0011 mục 1: chỉ cảnh báo, KHÔNG lặp sửa)
Chạy trên bản sao cô lập (`tmp-ho-so`, tuyệt đối không sửa `data/ho-so-ma/dieu-kien/40.jsonl`) bằng `bang-anh-em.mjs` (sinh **`PASS 102 bảng`** ngay lượt đầu) và `cong.mjs --cong 6..14`:

| Cổng chẩn đoán | Toàn Chương 40 (`40.01–40.17`, 17 nhóm) | Riêng nhóm `40.16` (soạn mù riêng 1 ong) | Nhận xét nguyên nhân |
|---|---:|---:|---|
| **Khuôn (`khuon.mjs`)** | **PASS `0` lỗi** | **PASS `0` lỗi** | `498/498` bản ghi đúng khuôn |
| **Cổng 6 TÁCH** | `758` mục, `236` cảnh báo | `108` mục, **`3` cảnh báo** | Trên `40.16` chỉ có 3 trích dẫn chéo ngoài đường đi (`nhom:3405`, `nhom:4008`, `phan:XVII`); trên các nhóm khác chủ yếu do `tapDu` dùng cụm diễn giải thay vì cắt từng từ nguyên văn trong `tapDuTrich` (Probe 4 `#2452`) |
| **Cổng 7 PHỦ** | `102` bảng, `13` `HO_PHU` | **PASS `10/10` (`0` lỗi)** | `40.16` đạt `0 HO_PHU` ngay lần đọc đầu tiên |
| **Cổng 8 CHỒNG** | `530` cặp, **`1` lỗi** (`4007` đặt `GIAI_CHONG` xuyên 4 số), `353` cảnh báo mềm | **PASS `69/69` (`0` lỗi**, `53` cảnh báo mềm) | Toàn chương chỉ duy nhất 1 lỗi hình thức `GIAI_CHONG` ở `4007` |
| **Cổng 9 HỎI** | **PASS `81/81` (`0` lỗi)** | **PASS `10/10` (`0` lỗi)** | 100% nút "Loại khác" sinh đủ câu hỏi tối thiểu |
| **Cổng 10 DÒ** | **PASS `0` lỗi** (`81` cảnh báo thiếu ví dụ) | **PASS `0` lỗi** (`10` cảnh báo) | Chưa có tập ví dụ kèm riêng |
| **Cổng 11 MỞ** | **PASS `365/365` (`0` lỗi**, `80` `NGHIA_THUONG`) | **PASS `73/73` (`0` lỗi**, `25` `NGHIA_THUONG`) | 100% điều kiện có nhãn `mo` hợp lệ |
| **Cổng 12 BÙ** | **PASS `17/17` (`0` lỗi)** | **PASS `1/1` (`0` lỗi)** | 100% nhóm có `CANH_TRANH` hợp lệ |
| **Cổng 13 PHỦ CẠNH TRANH** | **PASS `188/188` (`0` lỗi)** | **PASS `40/40` (`0` lỗi)** | Phủ 100% `canhTranhTimThay` từ `#2481` ngay lượt đầu |
| **Cổng 14 ĐỦ CHUỖI** | `215` mã 8 số, `170` lỗi dây chuyền | `33` mã 8 số, `96` lỗi dây chuyền | **Phát hiện quan trọng:** toàn bộ `96` lỗi Cổng 14 của `40.16` chỉ phát sinh dây chuyền từ đúng **3** trích dẫn chéo ngoài đường đi ở Cổng 6 (`nhom:3405`, `nhom:4008`, `phan:XVII`). Nếu chỉ dùng nguồn nội bộ trên đường đi, `40.16` đạt **9/9 cổng xanh ngay lượt đọc mù đầu tiên**! |

### 1.5 Phát hiện hạ tầng & đề xuất cải tiến kỹ năng `doc-mot-lan`
1. **Phát hiện hạ tầng `khuon.mjs` (`kiemKhoHoSo`):** Hiện `scripts/ho-so-ma/khuon.mjs:513` từ chối thư mục `data/ho-so-ma/doc-mot-lan/` là `"lạ ở gốc kho hồ sơ"`, khiến `liet-ke-test.mjs`, `nguong-test.mjs` và `tach-68-test.mjs` đỏ khi kho chứa `data/ho-so-ma/doc-mot-lan/**`. Cần bổ sung 1 dòng bỏ qua thư mục `doc-mot-lan` trong `kiemKhoHoSo` (trên nhánh hạ tầng M-82/khuon vì `khuon.mjs` chưa nằm trong phạm vi `M-82` ở `docs/mong/phan-cong.json`).
2. **Bơm sẵn 6 Quy tắc tổng quát (`gir:1..6`) vào ngữ cảnh Người phản biện:** Giúp Người phản biện không từ chối áp dụng QT 3(a)/QT 6 ở các câu chồng cấp phân nhóm (`mh:4016:03`, `mh:4016:05`).
3. **Cấm Người phản biện viết câu hỏi hỏi ngược khách về luật/quy trình:** Ràng buộc rõ trong prompt phản biện rằng `cauHoiKhach` chỉ hỏi về **đặc tính hàng hóa / chứng từ thực tế**, tuyệt đối không hỏi khách về `ADR`, `QT 3(a)` hay văn bản pháp luật.
4. **Quy tắc đặt trích dẫn chéo ngoài đường đi:** Trong `DIEU_KIEN`, chỉ đặt `nguon` thuộc đúng đường đi (`phan → chuong → nhom → phan-nhom → dong`); các loại trừ chéo từ chương/nhóm ngoài (như `nhom:3405`, `nhom:4008`, `phan:XVII`) nên đưa vào `CANH_TRANH` (vì Cổng 14 nhân rộng 1 lỗi đường dẫn thành 33+ lỗi mã 8 số).
5. **Kiểm tra máy trích nguyên văn ngay sau từng gọi Người phản biện:** `gpt-oss:120b` đạt `91,4%` trích đúng ngay lần đầu nhưng vẫn có `5/58` ca rút gọn bằng `...` — kiểm tra tất định ngay sau phản biện giúp loại sạch 100% trích lỗi ở bước Người đọc chốt cuối mà không cần vòng lặp LLM thứ 2.
