# Nghiên cứu thực nghiệm: Đọc một lần từ Chương xuống 8 số (M-82 · ADR-0011)

> Tài liệu này ghi chép số liệu thực đo, so sánh hai mô hình mạnh khác dòng (`Người đọc` vs `Người phản biện`) và bài học quy trình cho thí điểm **M-82** (`#2483`, `ADR-0011`).
> Mọi đánh giá kết quả tuân thủ `ADR-0010` mục 1: đếm thẳng số ca `ĐÚNG` / `CHƯA ĐỦ DỮ KIỆN` / `SAI` và diễn đạt *"dùng N lần thì mấy lần sai"*, không dùng tỷ lệ phần trăm cho kết luận phân loại.

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
3. **4 Luật đọc cốt tử đã vào bản chính `.agents/skills/doc-mot-lan/SKILL.md` (do `agy` giữ):** Luật 1 (không chốt sớm ngoài lời phân nhóm), Luật 2 (loại trừ ngoại nhóm đặt tại nút nhóm 4 số), Luật 3 (mỗi trục `GIA_TRI` một loại giá trị, không rải `CO_KHONG`, không gộp ý), Luật 4 (không thu hẹp/mở rộng chữ biểu bằng giả định, không tự chốt vùng chồng mở bằng `QUY_TAC_3`).

---

## 2. Thí điểm Chương 94 (`94.01–94.06`) — Dây chuyền mù 100% trên `agy`

### 2.1 Phương pháp, Kỷ luật soạn mù & Phân vai mô hình

1. **Nguyên tắc cốt lõi (`ADR-0011`):**
   - Thực hiện **một lượt đọc trọn gói luật từ trên xuống dưới (`2 → 4 → 6 → 8`)** do mô hình mạnh thực hiện, đi kèm **đúng 1 vòng phản biện độc lập** bởi một mô hình mạnh khác dòng cho toàn bộ điểm mơ hồ (`DIEM_MO_HO`).
   - Máy (`goi-chuong.mjs`, `goi-nhom.mjs --soan-mu`, `doc-mot-lan.mjs`) chỉ làm hai việc tất định: (a) dựng gói đủ luật (gồm nguyên văn `GIR 1–6` từ `data/luat-goc/gir.jsonl`, chú giải Phần/Chương, chú giải tổng quát `:kq:`, chú giải chi tiết nhóm/phân nhóm, `SEN`, cạnh loại trừ ra/vào và tài liệu ứng viên `timCgct`); (b) kiểm tra **100% câu trích có thật nguyên văn trong `data/luat-goc` và gắn đúng `idCau`**. Các cổng `6–14` cũ chỉ chạy ở chế độ cảnh báo tham khảo, không chặn nghiệm thu.
2. **Kỷ luật soạn mù tuyệt đối (`#2483` mục 7):**
   - Trong suốt quá trình xây dựng và chạy dây chuyền Chương 94, **tuyệt đối không mở** `docs/mong/the/M-81-vang-9405.md` (hay bất kỳ tệp `M-81-vang-*.md` nào), không mở `docs/mong/phieu-*/`, không đọc bình luận chấm điểm `#2410`, và dùng cờ `--soan-mu` trên `goi-nhom.mjs` để không nạp dữ liệu cũ ở `data/ho-so-ma/dieu-kien/94.jsonl` hay `M-81-canh-tranh.md`.
   - Không đọc hay trích dẫn nguồn `tb:` (TB-TCHQ) hoặc `wco:` (ý kiến phân loại WCO) ở bất kỳ bản ghi nào.
3. **Đội hình hai mô hình mạnh khác dòng (đã báo cáo và được QT duyệt tại `#2483#issuecomment-7233837274`):**

| Vai trò | Tên mô hình thực chạy | Cấu hình & Kỷ luật hạn mức | Ghi chú thực nghiệm trên máy Mac `agy` |
|---|---|---|---|
| **Người đọc (`nguoiDoc`)** | `gemini-4-hydrogen-tiered-xhigh` | Antigravity Gemini 4 Pro bậc suy luận cao nhất (`0` lượt dùng bản nhẹ `flash`/`flash_lite`, `0` đụng hạn mức Claude Max) | Mỗi gói chạy đúng `1` lượt đơn (`plannerTurns = 1`, `toolCalls = 0`), giữ kích thước lời nhắc `< 148 KB` UTF-8 để tránh ngưỡng cắt `184 KB` của `CreateConversation`. |
| **Người phản biện (`nguoiPhanBien`)** | `gemini-4-argon-high` | Mô hình Gemini 4 mạnh **khác dòng** với `gemini-4-hydrogen-tiered-xhigh` | Độc lập phản biện 1 vòng cho cả **77 `DIEM_MO_HO` Chương 94** và hỗ trợ chéo **58 `DIEM_MO_HO` Chương 40** (`#2484`, bàn giao tại `origin/agy/m-82-c40-phan-bien` `55a13850b`, `434 s`, `0` lỗi trích). |
| **Máy kiểm tất định** | `scripts/ho-so-ma/doc-mot-lan.mjs` + `test-doc-mot-lan.mjs` | Node.js tất định, không mạng, không gọi mô hình | Đối chiếu từng chuỗi trích với `data/luat-goc`, dựng tất định `bang-anh-em.jsonl` + `ma6`/`ma8` trong `<nhóm>.json`, tương thích 100% với `khuon.mjs` trên `main`. |

### 2.2 Số liệu đo thực tế Chương 94 (Lượt gọi, Token, Thời gian & Sản lượng)

#### Thống kê từng giai đoạn thực chạy (`metrics.json`)

| Giai đoạn | Hạng mục | Mô hình thực chạy | Số lượt gọi LLM | Token vào / ra | Thời gian thực đo (`wall-clock`) | Đầu ra & Kiểm nguyên văn |
|---|---|---|---:|---:|---:|---|
| **Bước 0 — Đóng gói mù** | `goi-chuong(94)` + `6` `goi-nhom(9401..9406, --soan-mu)` (kèm nguyên văn `GIR 1–6`) | Tất định (`0` LLM) | `0` | `0 / 0` | `~6 s` | `7` gói luật đủ chữ + vân tay `sha256` (`0` `tb:`/`wco:`) |
| **Bước 1 — Đọc Bậc 2 (`CHUONG`)** | `chuong.json` (Phần `XX`, Chương `94`) | `gemini-4-hydrogen-tiered-xhigh` | `1` | `66.328 / 65.004` | `267,99 s` (`~4,5 phút`) | `1` bản ghi `CHUONG` (`7` phạm vi, `16` loại trừ, `4` định nghĩa, `6` ưu tiên, `6` trục chính, `19` cạnh tranh, `6` `DIEM_MO_HO`) |
| **Bước 2 — Đọc Bậc 4→6→8 (`6` nhóm)** | Đợt 1 (`94.05`, `94.01`, `94.03`) → Đợt 2 (`94.02`, `94.04`, `94.06`) | `gemini-4-hydrogen-tiered-xhigh` | `6` | `370.295 / 588.047` | `855,12 s` (`~14,3 phút`) | `6` tệp `9401..9406.json` (`516` bản ghi điều kiện/giải chồng/cạnh tranh sau chuẩn hoá Luật 1–5, `0` sót nút có tên, `0` sót `timCgct`, riêng `94.05` chạy `535,95 s` sinh `142.309` token ra với `0` lỗi trích) |
| **Bước 3 — Phản biện 1 vòng** | Toàn bộ `77` `DIEM_MO_HO` của Chương 94 (chia `7` lô song song) | `gemini-4-argon-high` | `7` | `373.648 / 164.358` | `771,09 s` (`~12,9 phút`) | `77/77` phản biện độc lập kèm `chungMinh[]` nguyên văn (`0` lỗi trích câu nguồn) |
| **Bước 4 — Chốt 1 vòng cuối** | Người đọc xem lại phản biện & chốt `77` `DIEM_MO_HO` (`7` lô song song) | `gemini-4-hydrogen-tiered-xhigh` | `7` | `436.308 / 411.477` | `597,00 s` (`~10,0 phút`) | Chốt `77` dòng `diem-mo-ho.jsonl` (`soVongPhanBien = 1`), đổi kết luận `9` điểm sang `CHƯA ĐỦ DỮ KIỆN` |
| **Bước 5 — Hệ thống hoá & Kiểm máy** | `doc-mot-lan.mjs --dung-bang` & `--kiem --chuong 94` + sổ tay `94.md` | Tất định (`0` LLM) | `0` | `0 / 0` | `~5 s` | **`PASS 0 lỗi khuôn · 0 lỗi trích & khớp 100% vanTayGoi / 17.233 câu trích nguyên văn · 0 lỗi phủ`** (`54` mã 6 số: `24 ĐÚNG · 30 CHƯA ĐỦ DỮ KIỆN`; `127` mã 8 số: `45 ĐÚNG · 82 CHƯA ĐỦ DỮ KIỆN`) |
| **Tổng toàn Chương 94** | **1 chương · 6 nhóm · 54 mã 6 số · 127 mã 8 số** | **`gemini-4-hydrogen-tiered-xhigh` + `gemini-4-argon-high`** | **`21` lượt đơn (`0` tool)** | **`1.246.579 / 1.228.886`** | **`2.490,19 s` (`~41,5 phút`)** | **`10` tệp kho `doc-mot-lan/94/` + `83` bẫy tra sai tại `docs/so-tay-tra-sai/94.md`** |

#### Chi tiết thời gian và quy mô từng nhóm 4 số của Chương 94

| Nhóm 4 số | Tên nhóm (tóm tắt) | Thời gian đọc Bậc 4→6→8 | Token vào / ra | Số điều kiện & giải chồng (`dieuKien` đã chuẩn hoá Luật 1–5) | Số điểm mơ hồ cấp nhóm |
|---|---|---:|---:|---:|---:|
| **`94.01`** | Ghế ngồi (trừ nhóm `94.02`) và bộ phận | `412,54 s` | `69.697 / 104.172` | `120` (`87` `DIEU_KIEN` + `32` `GIAI_CHONG` + `1` `CANH_TRANH`) | `17` |
| **`94.02`** | Đồ nội thất y tế, giải phẫu, nha khoa, thú y; ghế cắt tóc | `319,05 s` | `48.113 / 82.616` | `60` (`60` `DIEU_KIEN` + `0` `GIAI_CHONG` + `0` `CANH_TRANH`) | `11` |
| **`94.03`** | Đồ nội thất khác và bộ phận | `373,40 s` | `73.466 / 99.503` | `87` (`75` `DIEU_KIEN` + `11` `GIAI_CHONG` + `1` `CANH_TRANH`) | `8` |
| **`94.04`** | Khung đệm; bộ đồ giường, nệm, chăn, đệm ghế, gối | `310,02 s` | `49.608 / 77.315` | `43` (`40` `DIEU_KIEN` + `2` `GIAI_CHONG` + `1` `CANH_TRANH`) | `9` |
| **`94.05`** | Đèn (`luminaires`) và bộ đèn; biển hiệu được chiếu sáng và bộ phận | `535,95 s` | `81.458 / 142.309` | `161` (`126` `DIEU_KIEN` + `34` `GIAI_CHONG` + `1` `CANH_TRANH`) | `18` |
| **`94.06`** | Nhà lắp ghép | `319,07 s` | `47.953 / 82.132` | `45` (`39` `DIEU_KIEN` + `5` `GIAI_CHONG` + `1` `CANH_TRANH`) | `8` |

### 2.3 Phân tích 77 `DIEM_MO_HO` của Chương 94 & Các ca đổi kết luận sau 1 vòng phản biện

#### Phân bố 77 `DIEM_MO_HO` theo kiểu mơ hồ (`loaiMoHo`)

| Kiểu điểm mơ hồ (`loaiMoHo`) | Số lượng | Nội dung pháp lý điển hình gặp ở Chương 94 |
|---|---:|---|
| `NGHIA_THUONG_PHAN_NHOM` | `30` | Chữ phân nhóm/dòng dùng khái niệm thực tế không kèm định nghĩa định lượng trong biểu/SEN (*đèn pha* vs *đèn rọi* vs *downlight* `dmh:9405:8`; *đèn phòng mổ* vs *đèn khám* `dmh:9405:2`; *không gian mở công cộng/đường phố lớn* vs *sân hiên nhà riêng* `dmh:9405:7`; *ghế văn phòng* vs *ghế xoay gia đình*). |
| `RANH_GIOI_CHUONG_NHOM` | `16` | Ranh giới giữa Chương 94 với các Chương `39`, `42`, `44`, `63`, `70`, `83`, `85`, `87`, `90`, `95` (đèn tích hợp pin sạc `85.13` vs `94.05` `dmh:9405:3`; biển hiệu tĩnh `94.05` vs bảng chỉ báo điện tử `85.31` `dmh:9405:4`; dây đèn `94.05` vs đèn lồng lễ hội `95.05` `dmh:9405:5`). |
| `VAT_LIEU_CAU_TAO` | `15` | Phối hợp đa vật liệu ở cấp 6/8 số (ghế khung gỗ + khung kim loại kết hợp song mây; bộ phận đèn thuỷ tinh kết hợp kim loại/plastic `dmh:9405:15`; khối mô-đun xây dựng kết cấu thép ốp vật liệu khác `dmh:9406:5`). |
| `BO_PHAN_VS_NGUYEN_CHIEC` | `8` | Hàng tháo rời/chưa hoàn chỉnh theo `GIR 2(a)` đối đầu các mệnh đề cấm bộ phận rời của Chương 94 (mặt kính/đá rời Chú giải `3(A)`, đệm rời Chú giải `3(B)`, bộ đèn nhập thiếu bóng `dmh:9405:14`, cấu kiện nhà lắp ghép trình bày riêng `kq:20#1`). |
| `DA_CHUC_NANG_CHUC_NANG_CHINH` | `6` | Tổ hợp đa chức năng cần xác định đặc tính cơ bản theo `GIR 3(b)` (quạt trần liền đèn, đèn bàn tích hợp loa/sạc không dây, sưởi phòng tắm có đèn `dmh:9405:17`; tủ gương có đèn; giường gắn thiết bị massage). |
| `DIEU_KIEN_DAT_SAN_TREO_TUONG` | `1` | Xung đột giữa ngoại lệ Chú giải `2(a)` (cho phép tủ có ngăn/giá sách/kệ đơn kèm giá đỡ gắn tường hoặc đặt trên đồ vật khác vào `94.03`) với loại trừ thiết bị văn phòng để bàn `39.26/83.04` và đồ gỗ nhỏ `44.20` tại `chuong:94:kq:13#2` (`dmh:94:1`). |
| `NGUON_SANG_LED_MODULE_VS_DEN` | `1` | Ranh giới 3 tầng công nghệ chiếu sáng LED: linh kiện chip/gói LED `85.41` (Chú giải `12(a)(ii)` Chương 85) ↔ bóng/mô-đun nguồn sáng LED `85.39` ↔ bộ đèn hoàn chỉnh `94.05` (`dmh:9405:1`). |
| **Tổng cộng** | **`77`** | **Sau 1 vòng phản biện `gemini-4-argon-high` + chốt `gemini-4-hydrogen-tiered-xhigh`: `77/77` giữ chuẩn `CHƯA ĐỦ DỮ KIỆN` kèm `cauHoiKhach` cụ thể (`0` chốt ẩu khi thiếu thông tin hàng thật).** |

#### Danh sách 9 điểm mơ hồ đổi kết luận sau 1 vòng phản biện (`doiKetLuanSauPhanBien = true`)

1. **`dmh:94:1` (`chuong:94` — Tủ/kệ nhỏ đặt bàn hoặc gắn tường):** Lượt đầu định `"CHỐT KÈM GIẢ ĐỊNH"` đẩy toàn bộ đồ nhỏ đặt bàn không chân đặt sàn ra khỏi `94.03`. `gemini-4-argon-high` dẫn trực tiếp `chuong:94:cg:2#2` (*"để đứng trên 1 đồ vật khác"*) đối chiếu `chuong:94:kq:13#2` chứng minh giả định này thu hẹp trái phép Chú giải `2(a)` → đổi sang **`CHƯA ĐỦ DỮ KIỆN`** và hỏi đủ 4 dữ kiện (kiểu lắp đặt, phụ kiện cố định tường, công năng nội thất vs thiết bị văn phòng để bàn, chất liệu).
2. **`dmh:94:3` (`chuong:94` — Đồ nội thất / nhà lắp ghép tháo rời kèm mặt kính/đá/đệm hoặc chi tiết dư):** Chặn giả định gộp theo bộ khi chưa xác minh trình bày đồng bộ cùng chuyến (`chuong:94:kq:17#1`) và định mức vật tư hợp lý (`nhom:9406:ct:11#1`) → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
3. **`dmh:940110:1` (`bieu:940110` — *"Ghế dùng cho phương tiện bay"*):** Lượt đầu định mở rộng hoặc loại trừ cứng tàu vũ trụ/khinh khí cầu/buồng tập lái mặt đất. Phản biện chỉ ra chữ phân nhóm `9401.10` không định nghĩa ranh giới với nhóm `88.02`/`88.05` cho thiết bị bay đặc thù/mô phỏng → đổi sang **`CHƯA ĐỦ DỮ KIỆN`** (đúng Luật đọc 1 & 4).
4. **`dmh:9404:6` (`bieu:940429` — Đệm vừa có lõi lò xo `9404.29.10` vừa tích hợp làm nóng/làm mát bằng điện `9404.29.20`):** Lượt đầu định `"CHỐT KÈM GIẢ ĐỊNH"` ưu tiên `9404.29.10` vì dòng `.20` mở đầu bằng chữ *"Loại khác,"*. Phản biện chứng minh cần kiểm chứng cấu tạo thực tế của đệm kết hợp → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
5. **`dmh:9404:9` (`bieu:9404` — Đệm ngồi / nệm ghế dài so với bộ phận ghế `94.01`):** Bác bỏ `"CHỐT KÈM GIẢ ĐỊNH"`, bắt buộc xác minh hàng nhập tách biệt hoàn toàn (vào `94.04` theo Chú giải `3(B)`) hay nhập đồng bộ/gắn liền khung ghế `94.01` → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
6. **`dmh:9405:9` (`bieu:9405199` — Đèn trần/tường vừa là đèn rọi `9405.19.91` vừa gắn bóng huỳnh quang `9405.19.92`, hoặc máng đèn nhập chưa gắn bóng):** Bác bỏ `"CHỐT KÈM GIẢ ĐỊNH"` ưu tiên `.92` hơn `.91`; giữ mở vùng chồng và hỏi rõ kết cấu quang học rọi điểm cùng trạng thái bóng đi kèm → đổi sang **`CHƯA ĐỦ DỮ KIỆN`** (đồng thời bỏ `GIAI_CHONG` `QUY_TAC_3` tự chốt giữa `.91` và `.92`).
7. **`dmh:9405:12` (`bieu:940541` / `9405.42` / `9405.49` — Đèn pha `.10` / đèn rọi `.20` giao thoa với đèn tàu thuỷ/đầu máy/phương tiện bay/hải đăng bằng kim loại cơ bản `.30` hoặc đèn đường phố `.40/.50`):** Bác bỏ `"CHỐT KÈM GIẢ ĐỊNH"` tự đặt thứ tự ưu tiên giữa dòng tên đèn (`.10/.20`) và dòng công dụng phương tiện + vật liệu (`.30`) → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
8. **`dmh:9405:13` (`bieu:940550` — Đèn đốt bằng dầu `9405.50.1` giao thoa với Đèn bão `9405.50.40` và Đèn thợ mỏ `9405.50.50`):** Chuyển từ `"CHỐT KÈM GIẢ ĐỊNH"` sang **`CHƯA ĐỦ DỮ KIỆN`** khi chưa biết chủng loại đèn cụ thể (đèn bão, đèn thợ mỏ đốt dầu hay đèn dầu nghi lễ/thông thường).
9. **`dmh:9406:5` (`bieu:940620` — Khối mô-đun xây dựng khung chịu lực bằng thép nhưng vỏ tường/sàn/mái bằng vật liệu khác):** Bác bỏ giả định chỉ nhìn khung thép để chốt `9406.20`; bắt buộc hỏi vật liệu của cả kết cấu chịu lực lẫn bao che theo `pn:940620:ct:1` → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.

### 2.4 Kết quả QT chấm mù hai vòng của `94.05` (`#2486`), Luật đọc 5 & Lịch sử vân tay gói (`vanTayGoi`)

1. **Kết quả QT chấm mù lần đọc đầu (`d00938a77`) và sau lượt sửa một lượt (`39ecc74bb`):**
   - **Ca thử mù:** **`13 ĐÚNG · 28 CHƯA ĐỦ DỮ KIỆN · 0 SAI → dùng 41 lần thì 0 lần ra mã sai`**; toàn bộ **`12/12` ca ngoài nhóm** đều bị chặn đúng ở nút `9405`.
   - **Đối chiếu bảng vàng `94.05`:**
     - Lần đọc đầu (`d00938a77`): Điều kiện vàng (`105`) tăng từ `85 / 20` (bản cũ) lên **`94 / 11`**; cặp chồng (`39`) đạt `32 / 7`.
     - Sau 1 lượt sửa áp đủ 5 Luật đọc (`39ecc74bb`): **Nội dung ĐẠT — Điều kiện vàng đạt `104 / 105`, cặp chồng đạt `39 / 39` (`0` sót), dùng 41 lần thì `0` lần ra mã sai.**
2. **5 điểm hoàn thiện một lượt trên `94.05` + 3 nâng cấp hệ thống giữ lại cho mọi chương:**
   - **Luật đọc 5 (Quy tắc 6 cho chữ `"khác"`):** Chữ `"khác"` ở `9405.41.20 / 9405.42.20 / 9405.49.20` (*"Đèn rọi khác"*) chỉ so với anh em cùng cấp 3 gạch đứng trên là *"Đèn pha"* (`.10`), không so chéo với nhánh `9405.1`; bổ sung `¬Đèn pha` + 3 cặp `GIAI_CHONG` `pha × rọi` và 2 cặp `.40 × .60` ở `9405.42` & `9405.49`.
   - **Tách trục loại đối tượng và kiểu hàng (Luật đọc 3):** Tách `nhomHang9405` thành `loaiDoiTuong9405` (`daTri: false`: đèn và bộ đèn | biển hiệu được chiếu sáng | bộ phận) và `kieuDen` (`daTri: false`); mở đủ 2 vùng chồng bộ phận *"dùng cho đèn rọi"* × *"dùng cho đèn pha"* ở `9405.91` (`9405.91.20 × 9405.91.50`) và `9405.92` (`9405.92.20 × 9405.92.30`).
   - **Giữ nguyên phạm vi chú giải chung, gói kèm tên nhóm đích & cố định tuyệt đối `vanTayGoi` (`goi-nhom.mjs` + `goi-chuong.mjs` + `doc-mot-lan.mjs`):** Giữ nguyên câu chung Chú giải `1(f)` Chương 94, bổ sung đủ các mục `a..m` của Chú giải 1 Chương 94 và điều kiện *"chưa được chi tiết hoặc ghi ở nơi khác"* trên `bieu:9405#1`; `goi-nhom.mjs` xuất trực tiếp `goi.tenNhomDich` (`bieu:5908#1`, `bieu:8516#1`, `bieu:8531#1`…; trong `DIEU_KIEN` gắn ở `moNguon` để giữ `DIEU_KIEN.nguon` trên đường đi tổ tiên của Cổng 6/14) và bọc `chayVoiDataGoc()` quanh `tim-cgct.js` + `phai-doc.js` để `vanTayGoi` bất biến 100% kể cả khi môi trường chấm chạy khác thư mục (`cwd`) và đặt `HS_DATA_DIR` sang thư mục tạm rỗng.
3. **Truy vết minh bạch gói đã đọc (`vanTayGoiLanDocDau` vs `vanTayGoi` hiện hành):**

| Tệp hồ sơ | `vanTayGoiLanDocDau` (gói v1 lần đọc mù đầu) | `vanTayGoi` hiện hành (gói v3 có GIR 1–6 + `tenNhomDich`) | Phạm vi đọc trên gói cũ (v1) vs cập nhật trên gói hiện hành (v3) |
|---|---|---|---|
| `chuong.json` | `e642f4548841…` | `e642f4548841…` | Không đổi (`100%` đọc từ đầu trên gói đã có GIR 1–6, Chú giải Phần XX / Chương 94 và ứng viên `timCgct`). |
| `9401.json` | `a4426c4cee9e…` | `890ddb517009…` | Lần đọc mù đầu (cây 4→6→8 + `17` `DIEM_MO_HO`) đọc trên v1; vòng 2 bổ sung đủ Chú giải 1 `a..m` & câu tên nhóm đích trên v3. |
| `9402.json` | `0e7f6be68f92…` | `e4f13f354473…` | Lần đọc mù đầu (cây 4→6→8 + `11` `DIEM_MO_HO`) đọc trên v1; vòng 2 bổ sung đủ Chú giải 1 `a..m` & câu tên nhóm đích trên v3. |
| `9403.json` | `7abedfc86930…` | `826fa96795bc…` | Lần đọc mù đầu (cây 4→6→8 + `8` `DIEM_MO_HO`) đọc trên v1; vòng 2 tách gộp ý Luật 3, phủ định anh em `9403.8` Luật 5, đủ Chú giải 1 `a..m` & tên nhóm đích trên v3. |
| `9404.json` | `66c64bfc202c…` | `5d53468a9852…` | Lần đọc mù đầu (cây 4→6→8 + `9` `DIEM_MO_HO`) đọc trên v1; vòng 2 chuẩn hoá `daTri` Luật 3, phủ định anh em `9404.29` Luật 5, đủ Chú giải 1 `a..m` & tên nhóm đích trên v3. |
| `9405.json` | `b536f5141d91…` | `6352d91d98cc…` | Lần đọc mù đầu (cây 4→6→8 + `18` `DIEM_MO_HO`) đọc trên v1; vòng 2 sửa trọn 5 mục (`9405.4x.20`, tách trục `loaiDoiTuong9405`/`kieuDen`, `.40×.60`, bộ phận rọi×pha, Chú giải 1 `a..m` & `moNguon` tên nhóm đích `59.08, 85.16, 85.31`) trên v3. |
| `9406.json` | `28588fc19339…` | `486d90b0cad3…` | Lần đọc mù đầu (cây 4→6→8 + `8` `DIEM_MO_HO`) đọc trên v1; vòng 2 phủ định anh em `9406.90` Luật 5, đủ Chú giải 1 `a..m` & tên nhóm đích trên v3. |

### 2.5 Chẩn đoán Cổng 6–14 ở chế độ cảnh báo (Tham khảo theo `ADR-0011` mục 1)

| Cổng tham khảo | Tên cổng | Số lỗi cảnh báo | Ghi chú chẩn đoán |
|---:|---|---:|---|
| **6** | `TÁCH` | **`0`** | 100% nút có tên có điều kiện nguyên tử hợp lệ trên đường đi |
| **7** | `PHỦ` | `4` | Báo `HO_PHU` tự nhiên tại các nút cha không có dòng `"Loại khác"` (`chuong:94`, `9401`, `9403`, `9405`; riêng `94042` đã chứng minh phủ kín) |
| **8** | `CHỒNG` | **`0`** | `0` lỗi (`14` cặp chứng minh rời nhau `roiNhau`, `69` cặp giải chồng bằng `TRU`/`CHU_GIAI`, `120` cảnh báo giao thoa mở tương ứng `DIEM_MO_HO`) |
| **9** | `HỎI` | **`0`** | 100% nhánh `"Loại khác"` sinh được câu hỏi tối thiểu sạch |
| **10** | `DÒ` | **`0`** | `0` lỗi cấu trúc dò bảng anh em |
| **11** | `MỞ` | **`0`** | `427` điều kiện phân loại sạch (`86` `DINH_NGHIA_LUAT`, `150` `MO_TA_HUONG_DAN`, `191` `NGHIA_THUONG`) |
| **12** | `BÙ` | `1` | Nhắc cấp `chuong:94` (5 nhóm có phạm vi mở/dư `9401, 9403, 9404, 9405, 9406` đều có bản ghi `CANH_TRANH`, `soCanhTranh = 5`; riêng `9402` không phải nhóm dư và đã phủ đủ `nhom.canhTranh` / `nhom.khongCanhTranh`) |
| **13** | `PHỦ CẠNH TRANH` | **`0`** | Phủ đủ 100% ứng viên `timCgct` trên cả 6 nhóm `94.01–94.06` |
| **14** | `ĐỦ CHUỖI` | **`0`** | **`0` lỗi chuỗi và `thieuBangChungSai = 0` trên toàn bộ `127/127` dòng 8 số** |
