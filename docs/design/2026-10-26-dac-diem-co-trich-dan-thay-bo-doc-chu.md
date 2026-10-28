# Thiết kế: Đặc điểm có câu trích thay cho bộ đọc chữ — AI khai, máy kiểm, sổ tay chấm

**Ngày:** 2026-10-26 · **Trạng thái:** 📝 Nháp chờ CEO chốt — chưa code · **Liên quan:** #434, #452, #459 (bộ đọc ren M),
#458, #411, #416 (giao thức đo), #457, `docs/design/2026-10-20-vong-lap-chua-biet-va-tang-model-nhanh.md` (§4 + GĐ2),
`docs/backlog/08-so-tay-chu-giai.md`, `docs/backlog/09-hieu-suat-llm.md`

> **Nguồn dẫn.** Mã dẫn theo `origin/main` 55ef84d. Ký hiệu mới của PR #459 (sắp gộp) dẫn theo nhánh
> `fix/so-tay-gates-ren-m-vat-lieu` 2e276c2, ghi `#459:`; sau khi gộp, số dòng `lib/engine-loop.js` từ dòng 66 lùi 5.
> ERP dẫn theo `develop` 18d6db8b. "Đo 26/10" = chạy offline tất định (không LLM, không mạng) trên cây #459, mã Oz đã
> khai làm đầu vào, `productText` = `sampleDesc` của `data/oz-gold-final.jsonl`. `[INFERRED]` = chưa kiểm trực tiếp.

## Tóm tắt điều hành (đọc 1 phút)

- **Vấn đề.** Để chia dòng thuế 8 số, máy đang tự "đọc chữ" lấy dữ kiện (đường kính, vật liệu, công suất…) bằng các mẫu
  chữ viết tay. Mỗi lối khách viết mới ("M8x30", "ĐK: 60mm", "phi 19", "dày 0,5mm", "50L") lại phải vá một bộ đọc —
  và vá **hai lần** (engine + bản sao ở ERP). Bộ đọc còn **đọc nhầm**: "dạng cuộn 1000m" bị coi là đường kính, máy
  chấm thành "ống hút và xả bùn dùng trong khai thác mỏ" (prod chưa đổi mã cuối chỉ vì công tắc chốt dòng đang tắt).
- **Cách mới.** AI vốn hiểu hàng → ngay trong lượt AI đang quyết mã (vòng 2), AI **khai** từng dữ kiện sổ tay cần, mỗi
  dữ kiện kèm **câu chép nguyên văn** hồ sơ khách. Máy **kiểm**: câu có thật, con số và đơn vị suy được từ câu. Sổ tay
  (máy, không AI) **so số** rồi chọn hoặc chặn dòng. Bộ đọc chữ chỉ còn là lưới dự phòng. Chỉ hỏi khách điều **vẫn
  chưa biết**.
- **Khách thấy gì.** Bớt bị hỏi lại điều đã ghi, bớt cảnh báo oan, điều máy đọc được hiện kèm câu trích. Mã cuối ở prod
  **không đổi** chừng nào công tắc chốt dòng riêng (`HS_SO_TAY_DONG`) còn tắt.
- **Hiệu quả — có trần, nói thẳng.** Chỉ 12 % dòng oz-gold thuộc phân nhóm có điều kiện số. Trên oz-gold, 16/32 món
  đang kẹt "thiếu số liệu" có số rõ trong mô tả; khai đúng như người đọc thì 12 món ra đúng mã Oz đã khai, câu hỏi dòng
  biểu 33 → 18. Lợi lớn hơn: hồ sơ khách viết tự do / tiếng Trung, chặn lỗi đọc nhầm, và **ngừng viết bộ đọc mới** —
  thêm một dữ kiện = thêm một dòng bảng khoá.
- **Chi phí.** Không thêm lượt gọi AI; +≤ 3 giây ở ~25–30 % món (món có điều kiện số); ~9–10 ngày công; đo ~18–28 giờ máy
  trong gói MiniMax (~9–14 giờ nếu chạy chung đợt #416).
- **Lộ trình.** 7 PR nhỏ, cờ mới `HS_DAC_DIEM=off|shadow|on` (mặc định `off` = y hệt hôm nay). Đo bench + kiểm tay →
  CEO bấm nút → shadow 7 ngày → CEO bấm nút → on. Tắt khẩn cấp bằng một dòng env.

## 1. Vấn đề và bằng chứng

### 1.1 Hôm nay máy lấy dữ kiện từ đâu

| Chỗ dùng dữ kiện | Đọc bằng gì | Ghi chú |
|---|---|---|
| Chốt dòng 8 số `chotDong8` | `giaTriCua` (số + đơn vị + từ ngữ cảnh ≤ 30 ký tự trước số), `chatLieuTrong` (`MATERIALS`) — `lib/so-tay-gates.js:287-357`; #459: ren M `:398-433`, loại trừ vật liệu `:355-365` | trong `/api/classify` chỉ chạy khi `HS_SO_TAY_DONG=on` (`lib/engine-loop.js:622`) — prod TẮT (`docs/backlog/08…:234`) |
| Câu hỏi dòng biểu cho ERP | cùng `chotDong8` trên `productText` (`api/so-tay-questions.js:95`), không phụ thuộc cờ (`:10`) | `facts` chỉ dùng để bỏ câu trùng khoá (`:146`), không vào bộ chấm |
| Cảnh báo chữ đặc trưng (G3) | `checkSubheading` so từ (`lib/subheading-check.js:52-94`); #459: hỏi `trangThaiDong8` trước (`subheading-check.js:78-81`) | nguồn cảnh báo oan bu lông M8x30 |
| Cổng ngưỡng vào nhóm | `UNIT_RULES` riêng (`lib/so-tay-gates.js:154-159, 219-233`) | bộ đọc thứ ba |
| ERP tự điền + `facts` gửi engine | **bản port** `LOAI_GIA_TRI` + `MATERIALS` (ERP `src/lib/portal-review-autofill-detectors.ts:6-7, 62, 546`) | không bao giờ gửi đường kính (`:529` `duong_kinh: []`) |
| AI vòng 1 | `product.keySpecs[{k,v,evidence}]`, `material`, `dimensions` (`lib/engine-loop.js:159`) | cổng **bỏ qua** `keySpecs`/`dimensions` nhưng lại trộn diễn giải chưa kiểm `product.nameVi/material/purpose/mechanism` vào chữ bộ đọc đọc (`:536`) |
| AI vòng 2 | thấy sổ tay các nhóm ứng viên ở `full` (`:183`) | "Điều kiện dòng 8 số" bị cắt 90 ký tự (`lib/so-tay-gates.js:139`): **107/266** dòng có ngưỡng số mất ngưỡng (đo 26/10); AI không được nói khoá/đơn vị máy cần |

### 1.2 Ca thật

1. **Bu lông M8x30** (prod 25/10, PR #459): AI chọn đúng 73181510 (tin 95) nhưng bị cảnh báo "đòi đường kính, thân", chỉ
   sang …90, và `/api/so-tay-questions` hỏi lại đường kính. Vá bằng bộ đọc ren M + luật "tên hàng là chi tiết lắp xiết":
   9 tệp, +361/−55 dòng, sửa được 11 dòng oz-gold.
2. **Kẹp giấy** (prod 25/10, PR #452): AI chốt đúng 83059010 (97); câu trích chép kèm nhãn trình bày bị coi là bịa →
   `CAU_TRICH_KHONG_CO` → NEEDS_EXPERT sau 213 s. Bài học: bộ kiểm câu trích là điểm hỏng đơn → **kiểm đặc điểm không
   bao giờ được làm cổng chặn** (§4 điều 5).
3. **Vật liệu** (#434): "trang sức" bị đọc thành gốm sứ ("sứ" nằm trong "sức"); #459 vá bằng ranh giới chữ Unicode + 3
   danh sách loại trừ (vân gỗ, máy cắt thép, giấy phép…).
4. **Đọc nhầm, không chỉ đọc sót** (đo 26/10): "Dây cấp nước … đường kính trong 21mm, dạng cuộn 1000m" → đọc
   [2,1; 100 000] cm → CHOT 4009.21.10 "ống hút và xả bùn dùng trong khai thác mỏ" (Oz khai 4009.21.90). "Đai ốc bi
   1R15-20B1 … đường kính ngoài phi 50mm" → đường kính ngoài đai ốc bị coi là đường kính bu lông → 7318.16.90 (Oz khai .10).
5. **oz-gold** (5.152 dòng có sổ tay, đo 26/10): 32 dòng THIEU_SO_LIEU. Đọc tay: 16 dòng có số kèm từ neo rõ mà bộ đọc
   chưa nhận ("ĐK: 60mm", "đk trong: 16mm", "phi 19mm", "dày 0,5mm", "khổ rộng: 5cm", "Vỏ bình khí 50L", "ĐK ngoài thân
   30mm"); 8 dòng chỉ có kích thước chung ("KT(64x2000)mm", "kích thước 14 mm" — không rõ số nào là đường kính); 3 vướng
   vật liệu đồng chưa mô hình (#458); 5 thật sự thiếu (hồ sơ không ghi) hoặc khoá lỗi.

### 1.3 Giá của cách vá từng bộ đọc

- Mỗi lối viết = một PR regex, ngoại lệ chồng ngoại lệ (#459 phải chặn "Apple M2", "M8.8", bánh xe "M12*25"…), rồi
  vá lại bản port ERP (1.129 dòng bộ dò).
- Sửa cho đọc **nhiều hơn** là rủi ro: #459 phải bỏ "hợp kim" vì làm 2 van thép bị chốt nhầm sang dòng van đồng (2e276c2).
- 50/413 điều kiện số nguyên tử dùng 17 khoá **không có bộ đọc nào** (vd `ham_luong_chat_beo_sua` của bơ 0405.10,
  `chieu_day` 4421) → mãi CHƯA BIẾT; 22 điều kiện khác lưu lệch hệ đơn vị (đo 26/10; §8 R3).
- Trần lợi ích không nằm ở bộ đọc: 4.489/5.152 dòng (87 %) thuộc phân nhóm chưa số hoá điều kiện, 518 (10 %) "phủ định
  chưa hoàn chỉnh"; máy chỉ chốt được 73 dòng (67 trùng mã Oz đã khai).

## 2. Cơ chế

### 2.1 AI khai ở đâu: vòng 2, không thêm lượt gọi

- Vòng 2 (`SYS_R2`, `lib/engine-loop.js:364-386`) đã có sổ tay nhóm ứng viên ở `full` (`:183`) — prod đang `full`
  (`Dockerfile:27`; #416 ghi hs.env đổi sang `full` ngày 23/10) — và đã khai `conditions` kèm `evidence` (`:371-372`).
  Thêm mảng `dacDiem` vào cùng JSON: ~50–150 token ra/món ≈ 0,5–1,5 s (2.000 token ≈ 20 s, `docs/backlog/09…:127`).
- Không thêm lượt riêng: mỗi lượt LLM 45–60 s (`09:56`); tắt suy nghĩ đã đo và bị bác (`09:90-100`) — không đề xuất.
- Không đặt ở vòng 1: chưa biết nhóm nên không biết hỏi khoá nào (nghĩa "đường kính" đổi theo dòng: ngoài của thân ở
  7318, trong ở 7307/4009, bánh xe ở 8302); backlog 09 bước 4 còn muốn **rút ngắn** đầu ra vòng 1.
- Tách `dacDiem` khỏi `conditions`: `conditions` là AI tự chấm MET/UNMET; `dacDiem` chỉ là dữ kiện, chấm là việc của máy
  — đúng nguyên tắc "model là TRỢ LÝ DỮ KIỆN, không đoán thẳng mã" và §4 mục 2–3 của thiết kế 20/10 ("chỉ nhận suy luận
  có câu trích gốc"; "đã khoanh nhóm → tìm đúng 1 dữ kiện"). Khi có tầng model nhanh (GĐ1), lược đồ và bộ kiểm giữ nguyên.
- Vòng sửa 3–4 khai lại → hợp nhất. Lượt lùi "thinking-off" khi quá giờ (`:134-139`) có thể thiếu `dacDiem` → dùng dự phòng.

### 2.2 Máy nói cho AI biết cần khoá nào

Sau `gather()`, máy dựng **danh sách yêu cầu** từ `dong8[].dieuKienSo` của các phân nhóm có dòng đang đưa AI xem
(`codesForPrompt(h4, …, 22)`, `:181`):
- chỉ khoá có trong **bảng khoá** (§2.4 V5) với đơn vị đúng hệ — điều kiện lỗi dữ liệu không bao giờ được hỏi;
- mỗi khoá: tên, đơn vị nhận, **nghĩa theo dòng** (vế câu trích chứa ngưỡng — #459 `veMoHinh`, `so-tay-gates.js:505`),
  cách ghi được nhận (§2.5); `chat_lieu`: 8 vật liệu chuẩn của `MATERIALS`;
- trần 6 khoá / 600 ký tự, xếp theo chênh thuế `tacDongThueDong8` (#411, `lib/so-tay-gates.js:451`);
- rỗng → không thêm gì: ~70–75 % món không thuộc nhóm có `dieuKienSo` (1.294/5.152 dòng oz-gold thuộc nhóm có).

Khối thêm vào gói vòng 2 (ví dụ bu lông):
```
DỮ KIỆN SỔ TAY CẦN KHAI → ghi vào "dacDiem". Chỉ khai khi HỒ SƠ GỐC có đoạn chép nguyên văn chứa đúng số/vật liệu;
không có thì bỏ qua (máy sẽ hỏi). Không suy từ hàng tương tự. Khai dữ kiện, KHÔNG khai mã.
- duong_kinh [mm|cm|m|inch] — "Đường kính ngoài của thân" (7318.15.10, 7318.16.10). Nhận: M8 (ren hệ mét = 8 mm), DN25, Φ/⌀/Ø/phi 30.
- chat_lieu [plastic|cao su|giấy|gỗ|kim loại|thủy tinh|gốm sứ|vải dệt] — vật liệu cấu thành chính của hàng.
```

### 2.3 Lược đồ

AI trả thêm: `"dacDiem":[{"key":"duong_kinh","value":8,"unit":"mm","evidence":"Bu lông lục giác bằng thép mạ kẽm M8x30"}]`
— `value` là số (vật liệu: tên chuẩn, `unit: null`); máy chỉ giữ đúng 4 trường, bỏ mọi trường lạ (kể cả mã HS).

Phản hồi `/api/classify` (chỉ khi `on`, cộng thêm, camelCase): `soTay.dacDiem[] = {key, value, unit, evidence, nguonDuKien,
kiem}` và `soTay.dacDiemXungDot[]`. `nguonDuKien` ∈ `KHACH_XAC_NHAN | ERP_TRICH | AI_TRICH | MAY_DOC`; `kiem` ∈ `DAT |
KHONG_NEO | LOAI_<luật>`. Bản ghi ánh xạ thẳng sang lược đồ bộ nhớ đặc điểm (§5 thiết kế 20/10: `fact`, `value`,
`evidence.trich`, `evidence.source`, `verifiedBy`) để #457 / GĐ2 dùng lại.

### 2.4 Luật kiểm — tất định; trượt thì dữ kiện thành CHƯA BIẾT, không bao giờ thành cổng chặn

| # | Luật | Cách kiểm |
|---|---|---|
| V1 | Câu trích có thật | `verifyQuote(evidence, source) === 'ok'` — cùng nguồn với G2 (`groundingSourceOf` + chữ ảnh, `lib/engine-loop.js:400-409, 518`; `lib/classify.js:308-317, 392-399`, đã bỏ nhãn trình bày từ #452); dài 2–160 ký tự |
| V2 | Số suy được từ câu | giá trị khai, quy về đơn vị chuẩn bằng `quyDoi` của `LOAI_GIA_TRI`, phải **bằng** một số có trong câu (phẩy/chấm thập phân như nhau) sau khi quy đổi đơn vị đi kèm số đó. Mở rộng `numbersBacked` (`lib/extract-specs.js:253-258`) từ "chữ số có mặt" thành "số bằng nhau sau quy đổi". "M8x30" mà khai 30 mm → loại |
| V3 | Đơn vị và neo | đơn vị khai thuộc hệ của khoá; trong câu, đơn vị đứng ngay sau số hoặc sau cả nhóm số nối bằng `x × * - / ( )` ("(0,5*400)cm", "6-10mm"), hoặc số đi với một cách ghi ở §2.5. Khoá dùng chung hệ đơn vị (họ chiều dài; `%`) phải có **từ neo** của chính khoá trong câu ("đường kính/đk/phi/Φ/DN/直径…", "dày/厚…", "rộng/khổ/宽…", "chất béo/fat…"). Có số + đơn vị mà thiếu neo → `KHONG_NEO`: hiện cho chuyên viên, không dùng để quyết |
| V4 | Vật liệu | giá trị thuộc 8 tên chuẩn (`MATERIALS`, #459 `:336`) **và** `chatLieuTrong(evidence)` (kèm loại trừ của #459) có giá trị đó |
| V5 | Đúng yêu cầu | khoá thuộc danh sách yêu cầu của món (§2.2); giá trị nằm trong khoảng hợp lý của hệ (như `plausibleValue`, `lib/extract-specs.js`) |
| V6 | Hình thức | ≤ 8 dữ kiện/món; trùng thì gộp |

**Bảng khoá** — một nơi duy nhất, `lib/dac-diem.js`, dựng từ `LOAI_GIA_TRI`, `MATERIALS`, nhãn `FACT_LABELS`
(`api/so-tay-questions.js:33-47`) và bí danh trong `data/attributes.json` (power ↔ `cong_suat`, voltage ↔ `dien_ap`,
material ↔ `chat_lieu`…). Thêm khoá = thêm một dòng (đơn vị, từ neo, nhãn VI/ZH, khoảng hợp lý), không viết bộ đọc.

### 2.5 Cách ghi được nhận (diễn giải hợp lệ, mỗi dòng có test đột biến)

| Cách ghi | Nghĩa | Ràng buộc |
|---|---|---|
| `M8`, `M8x30`, `M8×1.25`, `M 10` | đường kính danh nghĩa ren hệ mét (mm) — chỉ số ngay sau M | đúng mẫu `KY_HIEU_REN_M` (#459 `:398`); hàng không phải chi tiết lắp xiết (`laChiTietLapXiet`, #459 `:407`) → `KHONG_NEO` (ren trục bánh xe "M12") |
| `DN25` | đường kính danh nghĩa 25 mm | như bộ đọc hiện tại (`lib/so-tay-gates.js:345`) |
| `Φ30`, `⌀30`, `Ø30`, `phi 30` | đường kính 30, theo đơn vị đi kèm; không có đơn vị thì mm | |
| `1.5"`, `2 inch`, `英寸` | inch → 2,54 cm | `寸` không nhận (mơ hồ) |
| `50L`, `500ml`, `升` | dung tích | đơn vị chỉ thuộc một hệ → không cần neo |
| `W/kW/HP/kVA`, `V/kV`, `A/mA`, `bar/kPa/MPa`, `g/kg/tấn/克/公斤`, `mm/cm/m/毫米/厘米/米` | quy đổi theo `quyDoi` hiện có | `%` luôn cần neo |

Không nhận làm kích thước: "D40", "KT(64x2000)mm", số trong mã model ("Wtp-009", "HN-600F", "1R15-20B1"), cấp bền "M8.8".

### 2.6 Thứ tự ưu tiên và xung đột

Ưu tiên quyết **giá trị dùng** của từng khoá: `KHACH_XAC_NHAN` (khách trả lời phiếu rà soát; chỉ nhận từ khoá dịch vụ —
`api/classify.js:101`) > `ERP_TRICH` (`facts[]` có bằng chứng, `api/classify.js:73`; cũng qua V2–V5) > `AI_TRICH` (đạt
V1–V6) > `MAY_DOC` (bộ đọc dự phòng). Nguồn cao đã có giá trị thì không cộng giá trị nguồn thấp (tránh phép `some`,
`lib/so-tay-gates.js:355`, nhặt nhầm "1000m"). Nguồn tương lai: tự tìm đúng 1 dữ kiện ở GĐ2 (trang nhà sản xuất qua
`micLookup`) cắm dưới `AI_TRICH` và chạy trước khi hỏi khách — đúng §4 mục 1 thiết kế 20/10.

- **Bất đồng làm đổi kết luận** (tập dòng THOẢ khác nhau): dùng giá trị nguồn cao, **không** để máy đổi dòng (kể cả khi
  `HS_SO_TAY_DONG=on`), thêm `review.reasons` "Dữ kiện mâu thuẫn: [câu trích A] / [câu trích B]". Khách trả lời khác
  chính chứng từ của khách → xử lý như trên (câu hỏi Q2).
- **Bất đồng không đổi kết luận** (8 mm với 0,8 cm; 8 với 10 cùng ≤ 16 mm) → bỏ qua, chỉ ghi nhật ký.
- **Quyền phủ quyết:** AI khai nhưng trượt kiểm, mà bộ đọc dự phòng ra giá trị khác kết luận → khoá thành CHƯA BIẾT. AI
  chỉ kéo được về "chưa biết", không bao giờ tự khẳng định khi chưa qua kiểm (vd "trang sức bạc": AI khai kim loại, "bạc"
  chưa có trong bảng → không tin bộ đọc "gốm sứ").
- Nhiều giá trị cùng khoá cùng nguồn (bộ nhiều cỡ): máy chấm giữ ngữ nghĩa hiện tại (một giá trị thoả là thoả); các giá trị
  vắt qua ngưỡng → thêm cờ chuyên viên và không để máy đổi dòng.
- Khi `on`, bộ đọc dự phòng chỉ đọc **chữ gốc** (`source`), không đọc `product.*` vòng 1 (`lib/engine-loop.js:536`):
  muốn đóng góp dữ kiện thì AI khai có trích. Các cổng chữ khác (`checkPolarity`, khớp tên loại trừ) giữ chữ cũ.

## 3. Tác động

| Chỗ | `off` | `shadow` | `on` (prod: `HS_SO_TAY_DONG` tắt) | `on` + `HS_SO_TAY_DONG=on` |
|---|---|---|---|---|
| Prompt vòng 2 | y hệt | + khối yêu cầu + `dacDiem` | như shadow | như shadow |
| `chotDong8` trong classify | — | chạy "sẽ là", chỉ ghi nhật ký | chạy tư vấn với dữ kiện, không đổi mã | đổi đuôi 8 số như nay (`:622-628`, tự tin ≥ 85, `dongChot.traNguon` `:639-644`); có xung đột → không đổi |
| Cảnh báo G3 (`:421-426`) | y hệt | ghi "sẽ bỏ" | `trangThaiDong8` dùng dữ kiện: THOẢ → không cảnh báo; TRÁI → cảnh báo nêu đúng số | như `on` |
| Dòng máy ≠ dòng AI | — | ghi nhật ký | `review.needed` + lý do kèm trích (giảm sai-không-cờ) | máy đổi dòng như nay |
| `missing` / `nextAction` classify (`:646-672`) | y hệt | y hệt | y hệt | câu chốt dòng (`:649-653`) chỉ cho khoá còn CHƯA BIẾT |
| `/api/so-tay-questions` | y hệt (bỏ qua `dacDiem`) | y hệt | nhận `dacDiem`, kiểm lại V1–V6 trên chữ gửi kèm, đưa vào `chotDong8` → câu DONG_BIEU của khoá đã biết biến mất | như `on` |
| ERP kỷ luật hỏi (`portal-review-questions.ts:951`, trần 3 câu `:872`) | y hệt | y hệt | ít câu DONG_BIEU hơn; khoá máy đã biết hiện ô điền sẵn kèm câu trích (Q1) | như `on` |
| `status` (`:665-672`) | y hệt | y hệt | không đổi luật | như nay (`chotDong` đổi mã) |

Ngoài phạm vi v1: cổng ngưỡng vào nhóm (`UNIT_RULES`) — bắn thêm lượt giải trình AI, để v2 sau khi có số; trường khai
TT39 (`missingStructured`, câu "OZ tự xác định") — v2, cùng cơ chế.

## 4. Bất biến (mỗi điều có test)

1. Mọi kết luận dùng dữ kiện mang `nguon`/`trich` của dòng sổ tay + `evidence`/`nguonDuKien` của từng dữ kiện dùng.
2. AI không bao giờ ra mã 8 số từ dữ kiện: `dacDiem` không có trường mã; chọn dòng chỉ qua `chotDong8`. Test LLM giả:
   khai dữ kiện + mã sai → `on` không đổi mã; `on` + DONG đổi đúng dòng máy, có trích.
3. Không dữ liệu khách ra ngoài: không thêm lượt LLM (vòng 2 đã trong `withPrivateData`, `api/classify.js:103`);
   `/api/so-tay-questions` vẫn không LLM; nhật ký shadow theo luật #261 (`docs/retention-log.md:10-11`): bản đếm không
   chứa chữ (khoá, mã kiểm, mã HS — cùng mức `access-log`), giá trị + câu trích chỉ ghi khi `X-OZ-Chia-Se: 1`
   (`mlLogDuocPhep`, như `lib/ml-log.js:31-34`), giữ 90 ngày; bench chạy `HS_LLM_PRIVATE_ALL=true`; không commit nhật ký.
4. `HS_SO_TAY=off` hoặc `HS_DAC_DIEM=off` ⇒ y từng byte như hôm nay: prompt vòng 2 (snapshot, như
   `scripts/test-engine-loop-so-tay.mjs:37-38`), phản hồi, `/api/so-tay-questions` trên 5.152 dòng oz-gold (như #459).
5. Kiểm đặc điểm không thêm gì vào `blocks` → không thêm vòng sửa, không NEEDS_EXPERT oan (bài học #452).
6. Không gắn nhãn GIR (rule 6), không đổi `canCuPhapLy` (rule 7a).

## 5. Cờ và lộ trình bật

- `HS_DAC_DIEM=off|shadow|on`, đọc lúc gọi, đặt cạnh `soTayMode()` (#459 `lib/so-tay-gates.js:185`): `HS_SO_TAY=off` ⇒
  coi như `off`; khối yêu cầu chỉ có khi `HS_SO_TAY=full`. `HS_SO_TAY_DONG` giữ nguyên nghĩa và cổng mở riêng
  (`docs/backlog/08…:234-237`).
- **shadow** = AI được hỏi, máy kiểm và tính kết cục "sẽ là" rồi ghi nhật ký; phản hồi không dùng dữ kiện. Vì shadow
  **đổi prompt**, câu trả lời AI có thể dao động như giữa hai lượt chạy → shadow cũng phải qua bench (G1, G3) trước.
- **Rule 7b không cần ngoại lệ**: đây là nối vào quyết định (bước 3b), làm đúng điều kiện "chạy khô + đo bench" trước khi
  lên prod — PR-1 là chạy khô, PR-4 là bench — áp cho cả shadow. Khối cố vấn `lib/so-tay-runtime.js` không đổi.
- Trình tự: PR-1…PR-5 gộp với cờ `off` (không đổi hành vi) → bench + kiểm tay (G1–G6) → GĐ soát → **CEO bấm nút** →
  `shadow` 7 ngày → báo số → **CEO bấm nút** → `on`.
- Lùi ngay khi: tỉ lệ nhân viên sửa mã tăng > 2 điểm, p90 tăng > 10 %, lỗi/timeout tăng, hoặc có ca dữ kiện sai làm
  đổi kết luận. Tắt: `HS_DAC_DIEM=off` (hoặc `HS_SO_TAY=off` tắt cả sổ tay) trong `/opt/hs-code-api/hs.env` +
  `deploy-safe.sh main --force` (`docs/backlog/08…:179`); deploy lúc vắng khách (#418 xả lượt đang chạy).

## 6. Kế hoạch đo

### 6.1 Chạy lại offline trên 5.152 dòng oz-gold (không LLM — phần tất định)

| Mã | Đo gì | Đạt khi |
|---|---|---|
| D1 | `dacDiem` rỗng / cờ off: `chotDong8`, `trangThaiDong8`, `/api/so-tay-questions` | trùng từng byte 5.152/5.152 |
| D2 | Mỗi số bộ đọc hiện đọc được → đổi thành lời khai (câu trích = đoạn từ neo … đơn vị) → qua V1–V6 → chấm | V1–V6 nhận ≥ 99 % (liệt kê ca bị loại); kết cục chấm trùng bộ đọc ở mọi dòng nhận (ca vắt ngưỡng chỉ thêm cờ) |
| D3 | ≥ 1.000 lời khai sai do máy sinh: ×10, đảo chữ số, lấy số khác trong câu (30 của M8x30), sai hệ đơn vị, số trong mã model | loại 100 % ca số/đơn vị không suy được; báo riêng ca "đúng câu, sai nghĩa" (máy không bắt được → G5) |
| D4 | Lời khai "người đọc" cho 32 dòng THIEU_SO_LIEU + 6 dòng máy chốt khác mã Oz | 0 kết luận sai mới. Sơ bộ 26/10: 16 dòng có neo → 12 trùng mã Oz, 2 TRANH_CAP (7311 — lít trùng khoảng, khác loại khí → cờ), 1 vẫn thiếu đồng (8481.40), 1 lệch (7307.92 bộ nối nhanh — chữ biểu thuế nghiêng dòng .10, cần chuyên viên); ca "1000m" về đúng 4009.21.90 |
| D5 | Bảng khoá × sổ tay | 0 điều kiện lỗi khoá/hệ đơn vị lọt vào danh sách yêu cầu |

### 6.2 Bench LLM — 80 mẫu vàng + 150 ERP-like (giao thức #416 K4)

- Hai nhánh `off` / `on`, cùng `HS_CLASSIFY_ENGINE=loop`, `HS_SO_TAY=full` (cờ prod), không đặt `HS_SO_TAY_DONG`,
  `HS_LLM_PRIVATE_ALL=true`; xen kẽ ghép cặp cùng món, ≥ 3 lượt/nhánh (≥ 2 nếu hạn mức thiếu, ghi rõ), cùng container
  `hs-bench` (.120), cùng ngày, cùng khoá. Nhánh `off` dùng chung với #416 K4/K8 nếu chạy cùng đợt.
- Mở rộng `scripts/bench-classify-llm.mjs` (`:90-96`): gọi `/api/so-tay-questions` trong tiến trình bằng mã top
  (+ `dacDiem` ở `on`) → đếm câu DONG_BIEU bắt buộc; đếm cảnh báo G3 trên món top đúng; token ra vòng 2 (`withUsage`,
  #416 K4(i)); thống kê `dacDiem` theo luật kiểm, xung đột, phủ quyết.
- Người chạy: dev có khoá MiniMax, không thì anh Thắng trên `hs-bench`; GĐ soát bảng. Thời lượng `[INFERRED]` từ #416
  K4 (1–1,6 giờ/80 món): ~3–4,6 giờ/lượt/nhánh cho 230 món → ~18–28 giờ máy (~9–14 nếu dùng chung nhánh `off`);
  ~3.000–3.500 lượt gọi (~1.600 nếu dùng chung).
- Hạn mức MiniMax (#416 K4(vii)): `GET /v1/token_plan/remains` trước mỗi lượt, chừa ≥ 30 % hạn mức tuần cho prod, chạy
  thử 10 món đo token rồi mới chạy đủ.
- Cỡ mẫu: chỉ 12/80 và 23/150 món thuộc phân nhóm có điều kiện số (đo 26/10) → bench chủ yếu chứng minh **không hại**;
  lợi ích đo bằng D4 + kiểm tay. ERP rà sâu gọi tier premium (`portal-review-engine.ts:272-274`) — bench mặc định đo
  tier chuẩn; đo thêm premium thì tốn tiền Gemini `[INFERRED]` (câu hỏi 4).

### 6.3 Kiểm tay tỉ lệ dữ kiện sai

100 dữ kiện `DAT` lấy từ các lượt `on`, chia theo khoá (đường kính / vật liệu / khác) và ngôn ngữ (Việt / Trung). Một
chuyên viên Oz chấm: đúng câu? đúng nghĩa (đường kính trong/ngoài; của hàng hay của phụ kiện)? đúng đơn vị? ~2–3 giờ.
Chấm luôn bộ đọc dự phòng trên cùng món để so.

### 6.4 Chỉ số và cổng — TẤT CẢ phải đạt, so nhánh `off` cùng đợt

| Cổng | Ngưỡng |
|---|---|
| G1 đúng đắn | Đ4, Đ8 (TB các lượt) `on` ≥ `off` − 2,0 điểm trên từng bộ (nhiễu ±4–7, `08:193`); `wrongUnflagged` `on` ≤ `off`; `confidentWrong8` ≤ `off` + 1,0; "Loại khác" Đ8 không giảm quá 5 |
| G2 lợi ích | câu DONG_BIEU bắt buộc/món `on` < `off` (gộp hai bộ; nếu `off` < 10 câu thì ≤ và dựa D4); cảnh báo G3 trên món top đúng `on` ≤ `off`; tỉ lệ cờ ≤ `off` + 3 điểm |
| G3 tốc độ | p50 `on` − `off` ≤ 3 s, p90 ≤ 5 s (X = 3 s đề xuất, GĐ chốt); `avgRounds` ≤ `off` + 0,1; `avgPromptCharsR2` ≤ `off` × 1,05; token ra vòng 2 ≤ `off` + 300 |
| G4 chống bật-giả | ≥ 90 % lượt vòng 2 có khối yêu cầu trả `dacDiem` đọc được; bộ kiểm + nhật ký chạy ở 100 % các lượt đó |
| G5 kiểm tay | dữ kiện sai ≤ 3/100; 0 dữ kiện sai làm đổi kết luận (dòng / câu hỏi); thu hồi (hồ sơ có dữ kiện mà AI khai `DAT`) ≥ 70 % |
| G6 bất biến | test §4 xanh; D1–D5 đạt |
| G7 quy trình | GĐ soát → CEO bấm nút → shadow; GĐ báo số shadow → CEO bấm nút → on |

## 7. Các giai đoạn (PR nhỏ, mỗi PR có test và cổng đi tiếp)

| PR | Việc | Công | Đi tiếp khi |
|---|---|---|---|
| PR-1 Nền tất định | `lib/dac-diem.js` (bảng khoá, V1–V6, hợp nhất + xung đột + phủ quyết); `danhGiaDong` / `chotDong8` / `trangThaiDong8` nhận `dacDiem` tuỳ chọn; D1–D3; test đóng băng §10 (chụp sau khi gộp #459) | 2,5 ngày | D1 trùng byte; D2 ≥ 99 %; D3 loại 100 % |
| PR-2 Dọn sổ tay cho khoá | luật mới trong `lib/so-tay.js:244-273`: khoá ∈ bảng, đơn vị đúng hệ (cảnh báo trước, đỏ sau); sửa dữ liệu sẽ bị đánh thức: 7208–7209 ("hàm lượng carbon 0,6 %" lưu `khoi_luong %`, "chiều dày 0,17 mm" lưu `khoi_luong mm`), 8421.22.30 ("500 lít/giờ" lưu `cong_suat`), 8528.69.10 ("đường chéo 300 inch" lưu `cong_suat`), 4009.21.10 ("độ dày thành 1,27 cm" lưu `duong_kinh`); làm cùng #458 | 1–1,5 ngày | D5; oz-gold không thêm kết luận sai |
| PR-3 Engine | khối yêu cầu trong `gather()` (chỉ `full`); `dacDiem` trong `SYS_R2`; kiểm trong `gates()` (không chặn); hợp nhất qua các vòng; nhật ký shadow; `soTay.dacDiem` khi `on`; test LLM giả off/shadow/on | 2 ngày | test §4 xanh; snapshot `off` trùng |
| PR-4 Đo | mở rộng bench §6.2; chạy; kiểm tay §6.3; bảng kết quả | 1 ngày + giờ máy | G1–G6 |
| PR-5 `/api/so-tay-questions` | nhận `dacDiem` (sau cờ), kiểm lại, đưa vào `chotDong8`; không có `dacDiem` → y cũ | 0,5 ngày | test; D1 |
| PR-6 ERP (repo erp-xnk, PR vào `develop`) | chuyển `classify.data.soTay.dacDiem` (`DAT`) + đúng chữ nguồn đã gửi classify sang `/api/so-tay-questions` (`portal-review-engine.ts:313-317`, `hs-kb-client.ts:1858`); câu trả lời khách → `facts` `KHACH_XAC_NHAN` khi gọi lại engine; ô điền sẵn kèm câu trích (UI → preview, CEO duyệt mắt); bỏ đọc `missingFacts` chết; đóng băng bộ dò port. Vô hại khi engine chưa `on` (không có `dacDiem`) | 1,5 ngày | CI xanh; CEO duyệt preview |
| PR-7 Bật | CEO bấm nút → shadow 7 ngày → báo số → CEO bấm nút → on; runbook tắt | 0,5 ngày + theo dõi | §5 |

Tổng ~9–10 ngày công + ~1,5–2 tuần lịch (bench, shadow). PR-1, PR-2 không tốn LLM, làm được ngay.

## 8. Rủi ro và cách chặn

| # | Rủi ro | Cách chặn |
|---|---|---|
| R1 | AI đọc nhầm: số trong mã model thành kích thước ("Wtp-009", "1R15-20B1"), nhầm nghĩa (đường kính ngoài đai ốc ≠ đường kính bu lông; "KT(64x2000)mm") | V2–V3 (số + đơn vị dính số + từ neo); ký hiệu M chỉ cho chi tiết lắp xiết; mâu thuẫn với bộ đọc → không đổi dòng + cờ; phủ quyết chỉ kéo về "chưa biết"; G5; nhật ký tỉ lệ loại theo luật, theo khoá |
| R2 | Prompt + đầu ra dài hơn làm chậm (ngược hướng `09` bước 4) | khối chỉ có ở ~25–30 % món, ≤ 600 ký tự vào, ~50–150 token ra; không đụng vòng 1; không thêm lượt; cổng G3 |
| R3 | Lỗi dữ liệu sổ tay lan ra: `>=` lưu ngược "trở xuống" (#458, 9 dòng), khoá/đơn vị sai (22 điều kiện), vế chưa mô hình (đồng ở 8481.40.10; "ống hút bùn khai thác mỏ" ở 4009.21.10) — hôm nay "ngủ" vì bộ đọc không đọc tới, dữ kiện AI sẽ đánh thức | PR-2 trước PR-3; chỉ hỏi khoá hợp lệ; áp rào `veMoHinh` (#459 `:505`) cho cả `chotDong8` khi DONG bật: còn vế chữ đặc trưng chưa chấm → không chốt |
| R4 | AI "tự bào chữa": khai số hợp với mã nó đã chọn | máy chấm chứ không phải AI; số phải có trong câu; cờ khi dòng máy ≠ dòng AI; shadow đo tỉ lệ đồng ý giữa mã AI và dữ kiện |
| R5 | Tương tác #457 (bộ nhớ phân loại — CEO: để sau; cho dùng chung mã OZ đã chốt giữa khách) | thiết kế này không lưu gì; bản ghi tách `key/value/unit` (dùng lại được) khỏi `evidence` (chữ khách — không bao giờ dùng chung giữa khách); khi làm #457 chỉ lưu `DAT` / `KHACH_XAC_NHAN` |
| R6 | ERP gửi chữ nguồn khác classify → kiểm lại ở `/api/so-tay-questions` trượt | hỏng về phía an toàn (vẫn hỏi); ERP gửi đúng chữ đã gửi classify (tên + specs + bằng chứng `facts`); test ERP |
| R7 | Bench không đủ lực thấy lợi (ít món có điều kiện số) | G1 là cổng "không hại"; lợi đo bằng D4 + G5; báo rõ cỡ mẫu |

## 9. Câu hỏi mở cho CEO

1. Dữ kiện máy đã đọc được kèm câu trích từ chính hồ sơ của khách: **ẩn câu hỏi**, hay **hiện ô điền sẵn để khách bấm
   xác nhận** (không bắt buộc — đề xuất, giống câu "máy tự điền" hiện nay)?
2. Khách trả lời **khác chính chứng từ của khách** (chọn "≤ 16 mm" nhưng mô tả ghi "đường kính 20 mm"): dùng câu trả lời
   + gắn cờ chuyên viên (đề xuất), hay hỏi lại khách?
3. Thứ tự ưu tiên: trần lợi ích nằm ở độ phủ điều kiện số của sổ tay (12 % dòng oz-gold). Làm thiết kế này ngay (ngừng
   vá bộ đọc, chặn lỗi đọc nhầm), hay đẩy số hoá sổ tay (#365, `tieuChi6`) trước? Đề xuất: song song — PR-1/PR-2 không tốn LLM.
4. Đồng ý dùng ~18–28 giờ máy + ~3.000–3.500 lượt MiniMax trong gói cho bench (gộp đợt #416 thì giảm một nửa)? Có đo
   thêm đường tier premium mà ERP rà sâu đang dùng (tốn tiền Gemini) không?

## 10. Những việc NGỪNG làm

- **Ngừng** viết bộ đọc chữ mới cho từng lối viết dữ kiện: từ ngữ cảnh / ký hiệu trong `LOAI_GIA_TRI`, `KY_HIEU_*`,
  `UNIT_RULES`, `SO_DON_VI_RE`, danh sách loại trừ vật liệu (`lib/so-tay-gates.js`) và bản port ERP
  (`src/lib/portal-review-autofill-detectors.ts`).
- **Đóng băng thế nào:** (a) thêm luật bất biến vào `CLAUDE.md` (7c: "Dữ kiện chia dòng = AI khai có trích, máy kiểm; bộ
  đọc chữ đóng băng"); (b) test `scripts/test-bo-doc-dong-bang.mjs` băm nguồn các bảng trên, đỏ khi đổi mà không có dòng
  tương ứng trong `data/so-tay/bo-doc-dong-bang.json` `{issue, lyDo, soDoOzGold: {truoc, sau}}`; (c) luật tương tự ở
  repo erp-xnk (PR-6).
- **Vẫn được phép:** (1) sửa cho bộ đọc đọc **ÍT đi** (bỏ đọc nhầm, như "trang sức" #434, ca "1000m") — kèm số đo oz-gold
  không thêm kết luận sai; (2) giữ đồng bộ engine ↔ port ERP; (3) bộ đọc mới **chỉ khi** đường đi đó không có AI (gọi
  `/api/so-tay-questions` không kèm `dacDiem`: Cổng, MCP) **và** lối viết gặp ≥ 20 lần trong oz-gold / nhật ký **và**
  đo oz-gold thêm đúng, 0 sai mới, GĐ duyệt; (4) điểm mở rộng mới là **dữ liệu**: thêm khoá, đơn vị, từ neo, cách ghi
  vào bảng khoá — kèm test đột biến D3.

## Phụ lục — chỗ mã hiện tại trái hướng này

1. `lib/engine-loop.js:536`: diễn giải vòng 1 (`product.nameVi/material/purpose/mechanism`, chưa kiểm) trộn vào chữ bộ
   đọc dữ kiện đọc → AI khẳng định không cần trích (trái §4 mục 2 thiết kế 20/10); còn `keySpecs`/`dimensions` có `evidence`
   (`:159`) lại bị bỏ.
2. ERP đọc `classify.data.missingFacts` (`portal-review-engine.ts:326-329`, `hs-kb-client.ts:344-347`) nhưng động cơ loop
   không bao giờ trả trường này (`lib/engine-loop.js:828-853`; `git log -S` không có commit nào thêm) → đường chết.
3. `/api/so-tay-questions` chỉ dùng `facts` để bỏ câu theo khoá (`:146`), không đưa vào `chotDong8` (`:95`); ERP gửi khoá
   TT39 camelCase (`portal-review-autofill.ts:686-737`) còn câu DONG_BIEU dùng khoá sổ tay (`duong_kinh`) → `facts` của
   ERP không bao giờ bỏ được câu dòng biểu, cũng không quyết dòng.
4. `soTayBlock` cắt điều kiện dòng 8 số 90 ký tự (`lib/so-tay-gates.js:139`): 107/266 dòng mất ngưỡng; AI không được
   biết khoá/đơn vị máy cần.
5. `lib/so-tay.js:244-273` chỉ kiểm số + đơn vị có trong câu trích, không kiểm khoá / hệ đơn vị → 72/413 điều kiện ngủ.
6. Trong classify, máy chỉ đổi dòng khi `HS_SO_TAY_DONG=on` (`lib/engine-loop.js:622`) — prod tắt; "máy chọn dòng" ở
   prod hiện chỉ thể hiện qua câu hỏi, cảnh báo và cờ.
7. Tài liệu lệch: `docs/backlog/08…:16, 204` ghi prod chạy `gates`; thực tế `full` (`Dockerfile:27`; #416 ghi đổi 23/10).
