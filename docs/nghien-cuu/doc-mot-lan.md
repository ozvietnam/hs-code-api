# Nghiên cứu thực nghiệm: Đọc một lần từ Chương xuống dòng 8 số (M-82 · ADR-0011)

> Sổ tay phương pháp và báo cáo số liệu thực đo của dây chuyền **đọc một lần từ Chương (2 số) xuống Nhóm (4 số), Phân nhóm (6 số) và Dòng (8 số)** theo tiêu chuẩn QT (`ADR-0011`, thẻ `M-82` `#2483`).
> Mọi đánh giá kết quả tuân thủ `ADR-0010` mục 1: đếm thẳng số ca `ĐÚNG` / `CHƯA ĐỦ DỮ KIỆN` / `SAI` và diễn đạt *"dùng N lần thì mấy lần sai"*, không dùng tỷ lệ phần trăm cho kết luận phân loại.

---

## Thí điểm Chương 94 (`94.01–94.06`) — Dây chuyền mù 100% trên `agy`

### 1. Phương pháp, Kỷ luật soạn mù & Phân vai mô hình

1. **Nguyên tắc cốt lõi (`ADR-0011`):**
   - Thay vòng lặp cũ (*"mô hình rẻ soạn — cổng bắt lỗi — sai thì thêm cổng"*) bằng **một lượt đọc trọn gói luật từ trên xuống dưới (`2 → 4 → 6 → 8`)** do mô hình mạnh thực hiện, đi kèm **đúng 1 vòng phản biện độc lập** bởi một mô hình mạnh khác dòng cho toàn bộ điểm mơ hồ (`DIEM_MO_HO`).
   - Máy (`goi-chuong.mjs`, `goi-nhom.mjs --soan-mu`, `doc-mot-lan.mjs`) chỉ làm hai việc tất định: (a) dựng gói đủ luật (gồm nguyên văn `GIR 1–6` từ `data/luat-goc/gir.jsonl`, chú giải Phần/Chương, chú giải tổng quát `:kq:`, chú giải chi tiết nhóm/phân nhóm, `SEN`, cạnh loại trừ ra/vào và tài liệu ứng viên `timCgct`); (b) kiểm tra **100% câu trích có thật nguyên văn trong `data/luat-goc` và gắn đúng `idCau`**. Các cổng `6–14` cũ chỉ chạy ở chế độ cảnh báo tham khảo, không chặn nghiệm thu.
2. **Kỷ luật soạn mù tuyệt đối (`#2483` mục 7):**
   - Trong suốt quá trình xây dựng và chạy dây chuyền Chương 94, **tuyệt đối không mở** `docs/mong/the/M-81-vang-9405.md` (hay bất kỳ tệp `M-81-vang-*.md` nào), không mở `docs/mong/phieu-*/`, không đọc bình luận chấm điểm `#2410`, và dùng cờ `--soan-mu` trên `goi-nhom.mjs` để không nạp dữ liệu cũ ở `data/ho-so-ma/dieu-kien/94.jsonl` hay `M-81-canh-tranh.md`.
   - Không đọc hay trích dẫn nguồn `tb:` (TB-TCHQ) hoặc `wco:` (ý kiến phân loại WCO) ở bất kỳ bản ghi nào.
3. **Đội hình hai mô hình mạnh khác dòng (đã báo cáo và được QT duyệt tại `#2483#issuecomment-7233837274`):**

| Vai trò | Tên mô hình thực chạy | Cấu hình & Kỷ luật hạn mức | Ghi chú thực nghiệm trên máy Mac `agy` |
|---|---|---|---|
| **Người đọc (`nguoiDoc`)** | `gemini-4-hydrogen-tiered-xhigh` | Antigravity Gemini 4 Pro bậc suy luận cao nhất (`0` lượt dùng bản nhẹ `flash`/`flash_lite`, `0` đụng hạn mức Claude Max) | Mỗi gói chạy đúng `1` lượt đơn (`plannerTurns = 1`, `toolCalls = 0`), giữ kích thước lời nhắc `< 148 KB` UTF-8 để tránh ngưỡng cắt `184 KB` của `CreateConversation`. |
| **Người phản biện (`nguoiPhanBien`)** | `gemini-4-argon-high` | Mô hình Gemini 4 mạnh **khác dòng** với `gemini-4-hydrogen-tiered-xhigh` | Độc lập phản biện 1 vòng cho cả **77 `DIEM_MO_HO` Chương 94** và hỗ trợ chéo **58 `DIEM_MO_HO` Chương 40** (`#2484`, bàn giao tại `origin/agy/m-82-c40-phan-bien` `55a13850b`, `434 s`, `0` lỗi trích). |
| **Máy kiểm tất định** | `scripts/ho-so-ma/doc-mot-lan.mjs` + `test-doc-mot-lan.mjs` | Node.js tất định, không mạng, không gọi mô hình | Đối chiếu từng chuỗi trích với `data/luat-goc`, dựng tất định `bang-anh-em.jsonl` + `ma6`/`ma8` trong `<nhóm>.json`, tương thích 100% với `khuon.mjs` của `#2484`. |

4. **Áp dụng 4 Luật đọc cốt tử trong `.agents/skills/doc-mot-lan/SKILL.md` ngay trên Chương 94:**
   - **Luật 1:** Chữ phân nhóm không nói thì không chốt (cấm kéo chú giải cấp nhóm xuống ép chốt phân nhóm con) — giữ `CHƯA ĐỦ DỮ KIỆN` kèm `cauHoi` và ghi `DIEM_MO_HO`.
   - **Luật 2:** Mọi loại trừ có đích ngoài nhóm 4 số đặt ở cửa nhóm 4 số (`bieu:94XX`, `ve: 0, phu: true` và `nhom.loaiTru`), cấm đặt ở nút con 6/8 số làm hàng bị loại trượt xuống `"Loại khác"` nội nhóm.
   - **Luật 3:** Mỗi trục `GIA_TRI` chỉ chứa một loại giá trị thuần nhất; gom các anh em cùng thuộc tính về trục chung thay vì rải `CO_KHONG`; tách điều kiện nguyên tử không gộp ý; với `9405.99.20` (*"Chụp đèn bằng vật liệu khác"*), biểu diễn đúng phần bù `phu: true, tap: ["vật liệu dệt"]` thay vì nhét chữ `"vật liệu khác"` như một tên vật liệu.
   - **Luật 4:** Không thu hẹp hay mở rộng chữ biểu bằng giả định; không suy luật chung từ một dòng có tên riêng; không dùng `GIAI_CHONG` kiểu `QUY_TAC_3` để tự chốt cứng các cặp giao thoa đa trục khi chưa có dữ kiện đặc tính cơ bản trên hàng thật; và không lạm dụng `"CHỐT KÈM GIẢ ĐỊNH"` khi hai nhánh đều mở ngoài thực tế.

---

### 2. Số liệu đo thực tế Chương 94 (Lượt gọi, Token, Thời gian & Sản lượng)

#### 2.1 Thống kê từng giai đoạn thực chạy (`metrics.json`)

| Giai đoạn | Hạng mục | Mô hình thực chạy | Số lượt gọi LLM | Token vào / ra | Thời gian thực đo (`wall-clock`) | Đầu ra & Kiểm nguyên văn |
|---|---|---|---:|---:|---:|---|
| **Bước 0 — Đóng gói mù** | `goi-chuong(94)` + `6` `goi-nhom(9401..9406, --soan-mu)` (kèm nguyên văn `GIR 1–6`) | Tất định (`0` LLM) | `0` | `0 / 0` | `~6 s` | `7` gói luật đủ chữ + vân tay `sha256` (`0` `tb:`/`wco:`) |
| **Bước 1 — Đọc Bậc 2 (`CHUONG`)** | `chuong.json` (Phần `XX`, Chương `94`) | `gemini-4-hydrogen-tiered-xhigh` | `1` | `66.328 / 65.004` | `267,99 s` (`~4,5 phút`) | `1` bản ghi `CHUONG` (`5` phạm vi, `16` loại trừ, `4` định nghĩa, `5` ưu tiên, `5` trục chính, `18` cạnh tranh, `6` `DIEM_MO_HO`) |
| **Bước 2 — Đọc Bậc 4→6→8 (`6` nhóm)** | Đợt 1 (`94.05`, `94.01`, `94.03`) → Đợt 2 (`94.02`, `94.04`, `94.06`) | `gemini-4-hydrogen-tiered-xhigh` | `6` | `370.295 / 588.047` | `855,12 s` (`~14,3 phút`) | `6` tệp `9401..9406.json` (`0` sót nút có tên, `0` sót `timCgct`, riêng `94.05` chạy `535,95 s` sinh `142.309` token ra với `0` lỗi trích) |
| **Bước 3 — Phản biện 1 vòng** | Toàn bộ `77` `DIEM_MO_HO` của Chương 94 (chia `7` lô song song) | `gemini-4-argon-high` | `7` | `373.648 / 164.358` | `771,09 s` (`~12,9 phút`) | `77/77` phản biện độc lập kèm `chungMinh[]` nguyên văn (`0` lỗi trích câu nguồn) |
| **Bước 4 — Chốt 1 vòng cuối** | Người đọc xem lại phản biện & chốt `77` `DIEM_MO_HO` (`7` lô song song) | `gemini-4-hydrogen-tiered-xhigh` | `7` | `436.308 / 411.477` | `597,00 s` (`~10,0 phút`) | Chốt `77` dòng `diem-mo-ho.jsonl` (`soVongPhanBien = 1`), đổi kết luận `9` điểm sang `CHƯA ĐỦ DỮ KIỆN` |
| **Bước 5 — Hệ thống hoá & Kiểm máy** | `doc-mot-lan.mjs --dung-bang` & `--kiem --chuong 94` + sổ tay `94.md` | Tất định (`0` LLM) | `0` | `0 / 0` | `~5 s` | **`PASS 0 lỗi khuôn · 0 lỗi trích / 14.413 câu trích nguyên văn · 0 lỗi phủ`** (`54` mã 6 số: `24 ĐÚNG · 30 CHƯA ĐỦ DỮ KIỆN`; `127` mã 8 số: `45 ĐÚNG · 82 CHƯA ĐỦ DỮ KIỆN`) |
| **Tổng toàn Chương 94** | **1 chương · 6 nhóm · 54 mã 6 số · 127 mã 8 số** | **`gemini-4-hydrogen-tiered-xhigh` + `gemini-4-argon-high`** | **`21` lượt đơn (`0` tool)** | **`1.246.579 / 1.228.886`** | **`2.490,19 s` (`~41,5 phút`)** | **`9` tệp kho `doc-mot-lan/94/` + `82` bẫy tra sai tại `docs/so-tay-tra-sai/94.md`** |

*(Ghi chú phối hợp liên trạm trong cùng phiên M-82: ngoài `21` lượt của Chương 94, `agy` đã chạy thêm `3` lô song song `gemini-4-argon-high` trong `434 s` để phản biện độc lập 1 vòng cho toàn bộ `58` `DIEM_MO_HO` của Chương 40 trên `#2484` với `0` lỗi trích nguyên văn.)*

#### 2.2 Chi tiết thời gian và quy mô từng nhóm 4 số của Chương 94

| Nhóm 4 số | Tên nhóm (tóm tắt) | Thời gian đọc Bậc 4→6→8 | Token vào / ra | Số điều kiện & giải chồng (`dieuKien`) | Số điểm mơ hồ cấp nhóm |
|---|---|---:|---:|---:|---:|
| **`94.01`** | Ghế ngồi (trừ nhóm `94.02`) và bộ phận | `412,54 s` | `69.697 / 104.172` | `141` (`116` `DIEU_KIEN` + `24` `GIAI_CHONG` + `1` `CANH_TRANH`) | `17` |
| **`94.02`** | Đồ nội thất y tế, giải phẫu, nha khoa, thú y; ghế cắt tóc | `319,05 s` | `48.113 / 82.616` | `60` (`59` `DIEU_KIEN` + `0` `GIAI_CHONG` + `1` `CANH_TRANH`) | `11` |
| **`94.03`** | Đồ nội thất khác và bộ phận | `373,40 s` | `73.466 / 99.503` | `102` (`82` `DIEU_KIEN` + `19` `GIAI_CHONG` + `1` `CANH_TRANH`) | `8` |
| **`94.04`** | Khung đệm; bộ đồ giường, nệm, chăn, đệm ghế, gối | `310,02 s` | `49.608 / 77.315` | `33` (`30` `DIEU_KIEN` + `3` `GIAI_CHONG`) | `9` |
| **`94.05`** | Đèn (`luminaires`) và bộ đèn; biển hiệu được chiếu sáng và bộ phận | `535,95 s` | `81.458 / 142.309` | `186` (`158` `DIEU_KIEN` + `27` `GIAI_CHONG` + `1` `CANH_TRANH`) | `18` |
| **`94.06`** | Nhà lắp ghép | `319,07 s` | `47.953 / 82.132` | `36` (`30` `DIEU_KIEN` + `5` `GIAI_CHONG` + `1` `CANH_TRANH`) | `8` |

---

### 3. Phân tích 77 `DIEM_MO_HO` của Chương 94 & Các ca đổi kết luận sau 1 vòng phản biện

#### 3.1 Phân bố 77 `DIEM_MO_HO` theo kiểu mơ hồ (`loaiMoHo`)

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

#### 3.2 Danh sách 9 điểm mơ hồ đổi kết luận sau 1 vòng phản biện (`doiKetLuanSauPhanBien = true`)

Đây là giá trị cốt lõi nhất của cơ chế **Người phản biện mạnh khác dòng (`gemini-4-argon-high`)**: phát hiện và chặn đứng cả **9 trường hợp** mà Người đọc ở lượt đầu định `"CHỐT"` hoặc `"CHỐT KÈM GIẢ ĐỊNH"` dựa trên suy diễn ngoài câu chữ phân nhóm:

1. **`dmh:94:1` (`chuong:94` — Tủ/kệ nhỏ đặt bàn hoặc gắn tường):** Lượt đầu định `"CHỐT KÈM GIẢ ĐỊNH"` đẩy toàn bộ đồ nhỏ đặt bàn không chân đặt sàn ra khỏi `94.03`. `gemini-4-argon-high` dẫn trực tiếp `chuong:94:cg:2#2` (*"để đứng trên 1 đồ vật khác"*) đối chiếu `chuong:94:kq:13#2` chứng minh giả định này thu hẹp trái phép Chú giải `2(a)` → đổi sang **`CHƯA ĐỦ DỮ KIỆN`** và hỏi đủ 4 dữ kiện (kiểu lắp đặt, phụ kiện cố định tường, công năng nội thất vs thiết bị văn phòng để bàn, chất liệu).
2. **`dmh:94:3` (`chuong:94` — Đồ nội thất / nhà lắp ghép tháo rời kèm mặt kính/đá/đệm hoặc chi tiết dư):** Chặn giả định gộp theo bộ khi chưa xác minh trình bày đồng bộ cùng chuyến (`chuong:94:kq:17#1`) và định mức vật tư hợp lý (`nhom:9406:ct:11#1`) → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
3. **`dmh:940110:1` (`bieu:940110` — *"Ghế dùng cho phương tiện bay"*):** Lượt đầu định mở rộng hoặc loại trừ cứng tàu vũ trụ/khinh khí cầu/buồng tập lái mặt đất. Phản biện chỉ ra chữ phân nhóm `9401.10` không định nghĩa ranh giới với nhóm `88.02`/`88.05` cho thiết bị bay đặc thù/mô phỏng → đổi sang **`CHƯA ĐỦ DỮ KIỆN`** (đúng Luật đọc 1 & 4).
4. **`dmh:9404:6` (`bieu:940429` — Đệm vừa có lõi lò xo `9404.29.10` vừa tích hợp làm nóng/làm mát bằng điện `9404.29.20`):** Lượt đầu định `"CHỐT KÈM GIẢ ĐỊNH"` ưu tiên `9404.29.10` vì dòng `.20` mở đầu bằng chữ *"Loại khác,"*. Phản biện chứng minh cần kiểm chứng cấu tạo thực tế của đệm kết hợp → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
5. **`dmh:9404:9` (`bieu:9404` — Đệm ngồi / nệm ghế dài so với bộ phận ghế `94.01`):** Bác bỏ `"CHỐT KÈM GIẢ ĐỊNH"`, bắt buộc xác minh hàng nhập tách biệt hoàn toàn (vào `94.04` theo Chú giải `3(B)`) hay nhập đồng bộ/gắn liền khung ghế `94.01` → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
6. **`dmh:9405:9` (`bieu:9405199` — Đèn trần/tường vừa là đèn rọi `9405.19.91` vừa gắn bóng huỳnh quang `9405.19.92`, hoặc máng đèn nhập chưa gắn bóng):** Bác bỏ `"CHỐT KÈM GIẢ ĐỊNH"` ưu tiên `.92` hơn `.91`; giữ mở vùng chồng và hỏi rõ kết cấu quang học rọi điểm cùng trạng thái bóng đi kèm → đổi sang **`CHƯA ĐỦ DỮ KIỆN`** (đồng thời bỏ `GIAI_CHONG` `QUY_TAC_3` tự chốt giữa `.91` và `.92`).
7. **`dmh:9405:12` (`bieu:940541` / `9405.42` / `9405.49` — Đèn pha `.10` / đèn rọi `.20` giao thoa với đèn tàu thuỷ/đầu máy/phương tiện bay/hải đăng bằng kim loại cơ bản `.30` hoặc đèn đường phố `.40/.50`):** Bác bỏ `"CHỐT KÈM GIẢ ĐỊNH"` tự đặt thứ tự ưu tiên giữa dòng tên đèn (`.10/.20`) và dòng công dụng phương tiện + vật liệu (`.30`) → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.
8. **`dmh:9405:13` (`bieu:940550` — Đèn đốt bằng dầu `9405.50.1` giao thoa với Đèn bão `9405.50.40` và Đèn thợ mỏ `9405.50.50`):** Chuyển từ `"CHỐT KÈM GIẢ ĐỊNH"` sang **`CHƯA ĐỦ DỮ KIỆN`** khi chưa biết chủng loại đèn cụ thể (đèn bão, đèn thợ mỏ đốt dầu hay đèn dầu nghi lễ/thông thường).
9. **`dmh:9406:5` (`bieu:940620` — Khối mô-đun xây dựng khung chịu lực bằng thép nhưng vỏ tường/sàn/mái bằng vật liệu khác):** Bác bỏ giả định chỉ nhìn khung thép để chốt `9406.20`; bắt buộc hỏi vật liệu của cả kết cấu chịu lực lẫn bao che theo `pn:940620:ct:1` → đổi sang **`CHƯA ĐỦ DỮ KIỆN`**.

---

### 4. Chẩn đoán Cổng 6–14 ở chế độ cảnh báo (Tham khảo theo `ADR-0011` mục 1)

Khi chạy `node scripts/ho-so-ma/doc-mot-lan.mjs --kiem --chuong 94`, bên cạnh kết quả nghiệm thu chính (**`PASS`: `0` lỗi khuôn, `0` lỗi trích trên `14.413` câu trích nguyên văn, `0` lỗi phủ trên `6/6` nhóm & `127/127` mã 8 số**), bảng chẩn đoán tham khảo Cổng `6–14` đạt:

| Cổng tham khảo | Tên cổng | Số lỗi cảnh báo | Ghi chú chẩn đoán |
|---:|---|---:|---|
| **6** | `TÁCH` | **`0`** | 100% nút có tên có điều kiện nguyên tử hợp lệ trên đường đi |
| **7** | `PHỦ` | `5` | Báo `HO_PHU` tự nhiên tại các nút cha không có dòng `"Loại khác"` (`chuong:94`, `9401`, `9403`, `94042`, `9405`) — đúng bản chất biểu thuế, không ép giả `tapDu` |
| **8** | `CHỒNG` | **`0`** | `0` lỗi (`89` cặp cùng trục, `63` cặp giải chồng bằng `TRU`/`CHU_GIAI`, `133` cảnh báo giao thoa mở tương ứng `DIEM_MO_HO`) |
| **9** | `HỎI` | **`0`** | 100% nhánh `"Loại khác"` sinh được câu hỏi tối thiểu sạch |
| **10** | `DÒ` | **`0`** | `0` lỗi cấu trúc dò bảng anh em |
| **11** | `MỞ` | **`0`** | `374` điều kiện phân loại sạch (`76` `DINH_NGHIA_LUAT`, `118` `MO_TA_HUONG_DAN`, `180` `NGHIA_THUONG`) |
| **12** | `BÙ` | `1` | Nhắc cấp `chuong:94` (các nhóm `9401..9406` đều đã có `CANH_TRANH` đầy đủ) |
| **13** | `PHỦ CẠNH TRANH` | **`0`** | Phủ đủ 100% ứng viên `timCgct` trên cả 6 nhóm `94.01–94.06` |
| **14** | `ĐỦ CHUỖI` | **`0`** | **`0` lỗi chuỗi và `thieuBangChungSai = 0` trên toàn bộ `127/127` dòng 8 số** |
