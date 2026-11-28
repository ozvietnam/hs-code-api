# Nghiên cứu thực nghiệm: Đọc một lần từ Chương xuống 8 số (M-82 · ADR-0011)

> Tài liệu này ghi chép số liệu thực đo, so sánh hai mô hình mạnh khác dòng (`Người đọc` vs `Người phản biện`) và bài học quy trình cho thí điểm **M-82** (`#2483`, `ADR-0011`).

---

## 1. Thí điểm Chương 40 (`40.01–40.17`) — Phối hợp `gpu-agy` (Người đọc) & `agy` (Người phản biện)

### 1.1 Đội hình mô hình & cấu hình thực chạy
| Vai trò | Mô hình thực dùng | Hạ tầng chạy | Kỷ luật mù & phạm vi |
|---|---|---|---|
| **Người đọc (Reader)** | `Gemini Pro` (`Antigravity pro / gemini-4-neon-high`) | Máy Windows `gpu-agy` (`Model: "pro"`, tuyệt đối không dùng `flash`/`flash_lite`) | Đọc mù 100% từ gói luật `data/luat-goc` (`goi-chuong-40` + `goi-4001..4017`); không mở `M-81-vang-4016.md`, `phieu-*/`, `dieu-kien/40.jsonl`, `#2410`; không chạy `soi-chong`. |
| **Người phản biện (Challenger)** | `gemini-4-argon-high` (mô hình mạnh khác dòng với `gemini-4-neon-high`) | Máy Mac `agy` (bàn giao sạch qua `origin/agy/m-82-c40-phan-bien`, `55a13850b`) | Che mù 100% lần chạy thử cũ; phản biện **đúng 1 vòng** trên toàn bộ `58` `DIEM_MO_HO` bằng trích nguyên văn từ `data/luat-goc` (`434 s`, `0` lỗi trích). |
| **Cổng máy hình thức** | `scripts/ho-so-ma/khuon.mjs` (`THU_MUC_KHO` gồm `doc-mot-lan`) + `kiem-trich-m82.mjs` + `cong.mjs --cong 6..14` (chẩn đoán) | Node.js `v22.23.5` cục bộ | Chặn cứng lỗi khuôn `doc-mot-lan`, trích không nguyên văn, `idCau` giả, thiếu mã 8 số, thiếu `canhTranhTimThay`, lẫn `tb:`/`wco:`; Cổng 6–14 chỉ chẩn đoán (không chạy vòng sửa theo ADR-0011). |

> **Bài học kỷ luật chọn mô hình (từ phản hồi QT trên `#2484`):** Ở lượt thử đầu tiên, `gpu-agy` đã dùng mô hình cục bộ `gpt-oss:120b` làm Người phản biện và mắc lỗi suy luận nghiêm trọng ở `10/58` điểm (dính bẫy dịch `mh:4008:01`, đọc ngược Chú giải loại trừ `39:cg:2:l` ở `mh:4014:01`, đẩy chắn bùn `4016.99.16` sang `4016.99.18`, và không bắt được 2 ca chốt sớm ở `40.16`). Theo chỉ đạo QT và luật CEO (không dùng LLM cục bộ yếu hơn phản biện chéo mô hình mạnh, máy GPU nhà không chạy `gpt-oss`), toàn bộ `58` điểm mơ hồ đã được **`agy` phản biện lại từ đầu bằng `gemini-4-argon-high`**, đạt **`0/58` lỗi trích** và **`56/58` đồng thuận pháp lý** ở vòng chốt cuối của Người đọc (`2` điểm `mh:4016:01, :04` được giữ mở theo Luật đọc 4).

### 1.2 Số liệu sản lượng, số lượt gọi và thời gian thực đo
| Giai đoạn | Phạm vi | Số phiên / lượt gọi LLM | Thời gian thực đo | Sản lượng đầu ra | Kiểm chứng hình thức (`kiem-trich-m82` & `khuon`) |
|---|---|---:|---:|---|---|
| **Bước A — Đóng gói** | Chương 40 + 17 nhóm `40.01–40.17` | `0` (tất định) | `~15 s` | `1` gói chương + `17` gói nhóm (có `canhTranhTimThay` từ `#2481`) | `vanTayGoi` khớp `18/18` |
| **Bước B — Đọc Bậc 2 (`CHUONG`)** | `chuong.json` | `1` phiên `gemini-4-neon-high` | `~5 phút` | `7` phạm vi, `9` loại trừ, `10` định nghĩa, `8` ưu tiên, `5` trục chính, `35` cạnh tranh, `6` `DIEM_MO_HO` | **PASS `0` lỗi** (`229` trích nguyên văn) |
| **Bước C — Đọc Bậc 4/6/8 (song song 4 ong + đọc lại riêng `40.16` theo 4 luật đọc)** | 17 nhóm `40.01–40.17` (`40.16` đọc lại theo 3 luật + chỉnh 3 mục Luật đọc 4) | `4` phiên ban đầu + `1` phiên đọc lại riêng `40.16` (`gemini-4-neon-high`) | `~10 phút` lượt đầu + `~15 phút` đọc lại `40.16` | `514` `DIEU_KIEN/GIAI_CHONG/CANH_TRANH`, `215/215` mã 8 số (`148` `ĐÚNG`, `67` `CHƯA ĐỦ DỮ KIỆN`), `188/188` `canhTranhTimThay`, `55` `DIEM_MO_HO` cấp nhóm (`52` lượt đầu + `3` điểm mới `mh:4016:07–09`) | **PASS `0` lỗi** trên cả `17/17` tệp (`2.471` trích nguyên văn) |
| **Bước D1 — Phản biện 1 vòng (`agy`)** | `58` `DIEM_MO_HO` (`6` chương + `52` nhóm lượt 1) | `3` lô song song `gemini-4-argon-high` | `434 s` (`~7,2 phút`) | `13` `CHỐT`, `19` `CHỐT KÈM GIẢ ĐỊNH`, `26` `CHƯA ĐỦ DỮ KIỆN` | **PASS `0` lỗi** (`soLoiTrichGoc = 0` trên `58/58` mục) |
| **Bước D2 — Người đọc chốt cuối (1 vòng)** | `diem-mo-ho.jsonl` (`58` mục) + đồng bộ `4005/4006/4014/4016.json` | `1` lượt `gemini-4-neon-high` | `~4 phút` | `13` `CHỐT`, `17` `CHỐT KÈM GIẢ ĐỊNH`, `28` `CHƯA ĐỦ DỮ KIỆN` (`56/58` đồng thuận, `30/58` đổi/khép kết luận; `2` điểm `mh:4016:01, :04` giữ mở theo Luật đọc 4) | **PASS `0` lỗi** (`442` trích nguyên văn) |
| **Tổng cộng toàn Chương 40** | **1 chương · 17 nhóm · 215 mã 8 số** | **6 phiên `gemini-4-neon-high` + 3 lô `gemini-4-argon-high`** | **~42 phút wall-clock** | `18` JSON + `diem-mo-ho.jsonl` (`58` mục) + `dieu-kien.jsonl` (`514` dòng) + `bang-anh-em.jsonl` (`102` bảng) + `docs/so-tay-tra-sai/40.md` (`33/33` trích đúng) | **PASS `0` lỗi khuôn & `0` lỗi trích nguyên văn trên `20/20` tệp JSON/JSONL** |

### 1.3 Phân tích `58` `DIEM_MO_HO` (cộng `3` điểm mới `40.16`) — Giá trị thực của cặp mô hình mạnh khác dòng

#### Phân loại `58` điểm đã phản biện theo nguyên nhân gốc
| Loại điểm mơ hồ (`loaiMoHo`) | Số lượng | Ví dụ tiêu biểu |
|---|---:|---|
| `MO_HO_NGU_NGHIA` (mơ hồ câu chữ / mức gia công) | `17` | `mh:40:04` (in phụ trợ vs trung gian in `Ch.49`), `mh:4008:02` (tấm lát sàn có khớp ghép âm dương), `mh:4009:03` (ống nhiên liệu cuộn dài), `mh:4014:02` (bao ngón tay phòng sạch ESD) |
| `CHONG_CA_HAI_NHANH` (chồng hai nhánh biểu / cấu trúc cấp gạch) | `17` | `mh:4005:03` (`4005.99.10` vs `.20`), `mh:4011:02` (máy `84.29/84.30` ở `4011.80` và `4011.90.20`), `mh:4012:01` (lốp trơn dưới "Loại khác"), `mh:4016:01–06` |
| `RANH_GIOI_VAT_LIEU` (cao su / plastic / dệt / ebonit) | `12` | `mh:40:01` (`TPE` vs `Ch.40`), `mh:40:02` (ngưỡng `1.500 g/m²` & `≤50%` dệt), `mh:4014:01` (silicone), `mh:4015:01` (đồ lặn neoprene), `mh:4017:01` (ebonit `>15/100` S) |
| `THIEU_NGUONG_DINH_LUONG` (luật không cho con số cứng) | `4` | `mh:40:03` (`≤5%`/`<2%` chỉ ở chú giải tổng quát), `mh:4003:01` (cao su tái sinh trộn nguyên chất), `mh:4004:01` & `mh:4012:03` (lốp quá mòn không đắp lại được) |
| `THIEU_SEN_HOAC_CHU_THICH` (thiếu hình vẽ / chân trang trong dữ liệu luật) | `4` | `mh:4001:01` (thiếu bảng `TSNR GP` trong `sen:40012250`), `mh:4009:02` (SEN ống ga Indonesia), `mh:4011:01` & `mh:4013:01` (thiếu sơ đồ đo và chú thích `(1)` sau `buses`) |
| `BAY_DICH_THUAT` (bẫy bản dịch Việt dễ dẫn sai) | `4` | `mh:4001:02` (*Váng cao su* vs *Cao su bọt*), `mh:4005:01` & `mh:4006:01` (*Của nhựa tự nhiên* = *natural gums*), `mh:4008:01` (dịch nhầm `> 5mm` ngay sau tấm/tờ/dải tại `nhom:4008:ct:2#1`) |
| **Tổng đã phản biện** | **58** | *(Cộng thêm `3` điểm mới phát hiện khi đọc lại `40.16` theo Luật 1 & 4: `mh:4016:07` đệm nước, `mh:4016:08` cốt làm lốp, `mh:4016:09` vùng chồng `4016.99.12` × `.16/.17/.18`)* |

#### Những điểm đổi kết luận quan trọng nhờ phản biện `gemini-4-argon-high` (`30/58` điểm khép/đổi kết luận)
- **`mh:4005:03` (`4005.99.10` vs `4005.99.20`):** `gemini-4-argon-high` chứng minh theo cấu trúc xuyên suốt Chương 40 và `nhom:4005:ct:10#1`, mủ cao su tự nhiên hỗn hợp dạng lỏng `latex` (không chứa carbon/silica) xếp vào **`4005.99.10`**, còn dạng nguyên sinh rắn xếp vào **`4005.99.20`** (ngược với cách áp cơ học QT 3(c)).
- **`mh:4006:02` (`4006.90.11` vs `4006.90.19`):** Chốt dứt khoát theo 3 mục `(A)-(B)-(C)` của `nhom:4006:ct:3..8`: Mục `(C)` (chỉ, vòng, đĩa, tấm/tờ/dải cắt hình ngoài chữ nhật) vào `4006.90.11`, còn Mục `(A)-(B)` (thanh, ống, dạng hình ép đùn) vào `4006.90.19` → cập nhật `4006.json`.
- **`mh:4008:05` (`4008.21.30`):** Dẫn đích danh `sen:40082130:1#3` khẳng định băng chắn nước cao su không xốp dạng dải ngang có gân làm kín mạch ngừng bê tông thuộc **`4008.21.30`** (cập nhật sổ tay `40.md`).
- **`mh:4014:02` (`4014.90.50`):** Phân tích chuẩn cụm *"thuộc loại dùng cho"* (*of a kind used for*): bao ngón tay cao su mỏng nhúng khuôn (dùng y tế, phòng sạch ESD hay văn phòng) thuộc mã đích danh **`4014.90.50`**, chỉ chụp cao su đúc dày cơ khí mới sang `40.16` → cập nhật `4014.json` và `40.md`.
- **`mh:4016:02`, `mh:4016:03`, `mh:4016:05`, `mh:4016:06`:** Chốt `4016.99.54` cho vỏ bọc hệ thống dây điện ô tô, `4016.99.60`/`4016.99.70` thắng `4016.99.5`, `4016.93.10` thắng `4016.93.20` cho vòng cách điện chân tụ mạch in ECU, và `4016.99.16` (*Chắn bùn xe đạp*) là phụ kiện tách dòng riêng khỏi `4016.99.17`/`18` → tích hợp trực tiếp vào `4016.json` v2.

### 1.4 Tác động thực đo của 4 Luật đọc mới trên nhóm `40.16` (v1 → v2/v3) & Chẩn đoán Cổng 6–14

Sau khi QT chấm mù `40.16` v1 (`25 ĐÚNG · 11 CHƯA ĐỦ DỮ KIỆN · 2 SAI` trên 38 ca thử) và ban hành 3 Luật đọc đầu tiên, bản đọc lại `40.16` (`979d3e8dc` → `1e8c9421a`) được QT chấm lại đạt **`26 ĐÚNG · 12 CHƯA ĐỦ DỮ KIỆN · 0 SAI`** (**`0` lần ra mã sai / `38` ca thử**, tìm đủ **`10/10` cặp chồng vàng**). Tiếp đó, `gpu-agy` hoàn thiện các điểm theo **Luật đọc 4** (giữ nguyên chữ biểu `4016.99.1` cả ở vế `8101`/`8102` lẫn phần `lyDo`/`cauHoi`, thêm *"hoặc các Chương khác"* vào `4016:8105`, gỡ 5 `GIAI_CHONG` tự chốt `.12 × .16/.17/.18` và `401691/401693 × 401695` để mở thành vùng chồng + `mh:4016:09`):

| Chỉ tiêu nhóm `40.16` | Trước (v1 — chưa có luật mới) | Sau (áp 4 luật đọc mới) |
|---|---:|---:|
| Kết quả chấm bảng vàng của QT (`38` ca thử) | `25 ĐÚNG · 11 CHƯA ĐỦ · 2 SAI` | **`26 ĐÚNG · 12 CHƯA ĐỦ · 0 SAI`** (`0` lần sai trên `38` ca, `10/10` cặp chồng vàng) |
| Loại trừ có đích ngoài nhóm đặt ở nút con (`6/8` số) | `8` (gây lọt ca 36 bộ gioăng `84.84` xuống `4016.99.59`) | **`0`** (100% đặt ở `bieu:4016` `ve: 0, phu: true`; `doBangAnhEm` chặn ngay `NGOAI_PHAM_VI`) |
| `CO_KHONG` trên nút con / `GIA_TRI` toàn nhóm | `47` / `10` | **`7`** / **`54`** (gom trục `GIA_TRI` chung, tách sạch trục `"nhóm xe Ch.87"` khỏi `"loại xe"`) |
| Cặp `GIAI_CHONG` (không tự chốt vùng chồng mở) | `8` | **`12`** (`4016995 × 4016991` dùng `TRU` chữ *"khác"*; `.12 × .16/.17/.18` và `401691/93 × 401695` để mở vùng chồng) |
| `DIEM_MO_HO` (`40.16`) | `6` (chốt sớm vào `4016.95.00`) | **`9`** (thêm `mh:4016:07` đệm nước, `mh:4016:08` cốt làm lốp, `mh:4016:09` vùng chồng `87.11` × xe đạp) |

#### Kết quả chẩn đoán Cổng 6–14 (chỉ cảnh báo theo ADR-0011, chạy trên bản sao tạm `tmp-ho-so`)
| Cổng chẩn đoán | Toàn Chương 40 (`40.01–40.17`, 17 nhóm) | Riêng `40.16` v1 | Riêng **`40.16` hiện hành** (sau 4 luật) |
|---|---:|---:|---:|
| **Khuôn (`khuon.mjs`)** | **PASS `0` lỗi** (`7.739` bản ghi) | **PASS `0` lỗi** | **PASS `0` lỗi** |
| **Cổng 6 TÁCH** | `771` mục, `233` cảnh báo | `108` mục, `3` cảnh báo | **PASS `121/121` (`0` lỗi)** |
| **Cổng 7 PHỦ** | `102` bảng, `13` `HO_PHU` | **PASS `10/10` (`0` lỗi)** | **PASS `10/10` (`0` lỗi)** |
| **Cổng 8 CHỒNG** | `534` cặp, `1` lỗi (`4007`), `348` cảnh báo mềm | **PASS `69/69` (`0` lỗi)** | **PASS `73/73` (`0` lỗi**, `48` cảnh báo mềm) |
| **Cổng 9 HỎI** | **PASS `81/81` (`0` lỗi)** | **PASS `10/10` (`0` lỗi)** | **PASS `10/10` (`0` lỗi)** |
| **Cổng 10 DÒ** | **PASS `0` lỗi** (`81` cảnh báo thiếu ví dụ) | **PASS `0` lỗi** | **PASS `0` lỗi** (`10` cảnh báo) |
| **Cổng 11 MỞ** | **PASS `377/377` (`0` lỗi)** | **PASS `73/73` (`0` lỗi)** | **PASS `85/85` (`0` lỗi**, `28` cảnh báo) |
| **Cổng 12 BÙ** | **PASS `17/17` (`0` lỗi)** | **PASS `1/1` (`0` lỗi)** | **PASS `1/1` (`0` lỗi)** |
| **Cổng 13 PHỦ CẠNH TRANH** | **PASS `188/188` (`0` lỗi)** | **PASS `40/40` (`0` lỗi)** | **PASS `40/40` (`0` lỗi)** |
| **Cổng 14 ĐỦ CHUỖI** | `215` mã, `74` lỗi *(giảm từ `170`)* | `33` mã, `96` lỗi | **PASS `33/33` (`0` lỗi)** |

> **Kết luận thực nghiệm nổi bật:** Chỉ bằng việc áp dụng **4 Luật đọc ngắn gọn** trong đúng **1 lượt đọc mù** (không vòng lặp sửa cổng, không chạy `soi-chong`), nhóm phức tạp nhất Chương 40 (`40.16`, `33` mã 8 số, `40` cạnh tranh ứng viên) đã giảm từ **`2` lần sai** xuống **`0` lần sai trên `38` ca thử** (khớp phân bố bảng vàng) và đạt **10/10 cổng chẩn đoán xanh (`0` lỗi từ Khuôn đến Cổng 14)**!

### 1.5 Nâng cấp hạ tầng khuôn & bài học giữ lại cho `doc-mot-lan`
1. **Nâng cấp `scripts/ho-so-ma/khuon.mjs`:** Đã thêm `doc-mot-lan` vào `THU_MUC_KHO` và cài đặt kiểm khuôn chặt từng tệp (`chuong.json`, `<nhóm>.json`, `diem-mo-ho.jsonl`, `dieu-kien.jsonl`, `bang-anh-em.jsonl`: cấm `tb:`/`wco:`, `soVongPhanBien === 1`, bắt buộc `cauHoi`/`cauHoiKhach` khi `CHƯA ĐỦ DỮ KIỆN`, từ chối tệp/thư mục lạ — không bỏ qua im lặng), kèm bộ kiểm thử `scripts/test-doc-mot-lan-khuon.mjs` đăng ký trong `scripts/danh-sach-test.txt`.
2. **Bắt buộc cặp mô hình mạnh khác dòng (`ADR-0011`):** Phản biện bằng `gemini-4-argon-high` đạt `0` lỗi trích trên `58/58` mục và giải quyết chính xác mọi câu hỏi QT 3(a)/3(c)/QT 6, vượt trội hoàn toàn so với mô hình cục bộ nhỏ hơn.
3. **3 Luật đọc cốt tử đã vào bản chính `.agents/skills/doc-mot-lan/SKILL.md` (do `agy` giữ):** Luật 1 (không chốt sớm ngoài lời phân nhóm), Luật 2 (loại trừ ngoại nhóm đặt tại nút nhóm 4 số), Luật 3 (mỗi trục `GIA_TRI` một loại giá trị, không rải `CO_KHONG`, không gộp ý).
