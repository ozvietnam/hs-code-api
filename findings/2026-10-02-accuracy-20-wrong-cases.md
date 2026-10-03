# 20 ca sai — search-only (searchCandidates, không LLM), n=50 holdout

**Ngày:** 2026-10-02  
**Chế độ:** search-only (search-utils.js cơ bản, không LLM)  
**Mẫu:** 50 tờ khai holdout (oz-gold-final, HS_EVAL_EXCLUDE_HOLDOUT=1)  
**Baseline (không LLM, n=763):** 4 số top1=37.9%, top3=40.6%; 8 số top1=8.7%, top3=14.2%

## Bảng tổng hợp 20 ca sai

| # | GT (đúng) | Mô tả hàng | Top1 sai | Phân loại nguyên nhân |
|---|-----------|-------------|-----------|----------------------|
| 1 | 70072990 | Kính cường lực bảo vệ màn hình điện thoại 5-10" | 98452000 (dây điện) | **Thiếu từ điển**: "kính cường lực điện thoại" hoàn toàn không có trong trade-synonyms.json |
| 2 | 95079000 | Dây trục câu cá nylon lụa Nhật DC-30 | 54050000 (sữa bò) | **Thiếu từ điển**: "dây câu cá", "trục câu" |
| 3 | 64029990 | Dép nhựa PVC đi trong/ngoài nhà | 76042110 (khuôn kim loại) | **Thiếu từ điển**: "dép nhựa", "PVC dép" |
| 4 | 85241200 | Mô-đun màn hình OLED kèm cảm ứng điện thoại | 84862094 (lò sản xuất bán dẫn) | **Chú giải/bảng quyết định**: OLED module là linh kiện điện thoại 85.24 hay màn hình 70.07? Cần bảng quyết định rõ ràng. |
| 5 | 85340010 | Mạch in PCB LED A05 1 lớp nhôm+nhựa | 90319030 (bộ phận máy đo) | **Chú giải thiếu**: PCB linh kiện điện tử chưa lắp → phân biệt 8534 vs 9031 |
| 6 | 85444299 | Cáp sạc Type C-Type C 65W điện thoại | 98342000 (cáp khác) | **Thiếu từ điển**: "cáp sạc", "Type C" |
| 7 | 48236900 | Giấy nến lót nướng bánh không thấm dầu | 48059110 (giấy kraft khác) | **Thiếu từ điển**: "giấy nến", "lót nướng" |
| 8 | 84839019 | Thanh răng bộ phận trục truyền động máy công nghiệp | 84669330 (bộ phận kim loại) | **Chú giải/bảng quyết định**: phân biệt 84.83 (bộ phận máy) vs 84.66 (cavity molds) |
| 9 | 85044019 | Bộ sạc điện thoại 20W 220V | 98183200 (bộ sạc khác) | **Thiếu từ điển**: "bộ sạc", "củ sạc" |
| 10 | 39211399 | Tấm nhựa PU giả da xốp, nhựa 60.5% | 48070000 (giấy/tấm bìa) | **Mô tả mơ hồ**: "giả da" → nhựa hay da? Nhưng nhựa PU là nhựa 39.21 |
| 11 | 70072990 | Tấm kính cường lực bảo vệ màn hình điện thoại | 39269044 (đệm cứu sinh) | **Thiếu từ điển** (cùng loại #1) |
| 12 | 64059000 | Giày vải canvas + cao su, không phải bảo hộ | 64039130 (giày bảo hộ khác) | **Chú giải/bảng quyết định**: phân biệt giày vải thường 64.05 vs giày bảo hộ 64.03 |
| 13 | 84123100 | Xy lanh khí nén tịnh tiến SDA12x10B | 76042110 (khuôn kim loại) | **Thiếu từ điển**: "xy lanh khí nén" |
| 14 | 48182000 | Giấy lụa lau chùi 1 lần 1500 tờ/gói | 56090000 (sợi len/cotton) | **Thiếu từ điển**: "giấy lụa", "giấy rút" |
| 15 | 67041900 | Lông mi giả vật liệu dệt tổng hợp trong hộp nhựa | 67030000 (lông tóc người/động vật) | **Mô tả mơ hồ**: "vật liệu dệt tổng hợp" → 67.04 (nhân tạo) hay 67.03 (lông thật)? nhưng "tổng hợp" → 67.04 đúng |
| 16 | 39269099 | Dây rút nhựa buộc hàng 0.07×28cm | 48059110 (giấy kraft khác) | **Thiếu từ điển**: "dây rút", "buộc hàng" |
| 17 | 96200030 | Chân giá đỡ điện thoại 3 chân sắt mạ | 85437040 (máy khuếch tán âm) | **Thiếu từ điển**: "chân giá đỡ điện thoại", "tripod điện thoại" |
| 18 | 70072990 | Kính cường lực full HD 4 lớp bảo vệ màn hình | 98452000 (dây điện) | **Thiếu từ điển** (cùng loại #1) |
| 19 | 70072990 | Kính cường lực KZHDIP001 điện thoại 158×75mm | 84863030 (máy sản xuất bán dẫn) | **Thiếu từ điển** (cùng loại #1) |
| 20 | 87141090 | Bộ đĩa xích và nhông xe mô tô 100-110CC DREAM | 98182900 (bộ phận xe đạp) | **Chú giải/bảng quyết định**: phân biệt bộ phận mô tô 87.14 vs xe đạp 87.14 khác |

## Tổng hợp theo nguyên nhân

| Nguyên nhân | Số ca | % (20) |
|-------------|-------|--------|
| **Thiếu từ điển** (không có entry cho tên thương mại phổ biến) | 12 | 60% |
| **Thiếu chú giải/bảng quyết định** (GIR 1/6 chưa phân giải rõ ranh giới nhóm) | 6 | 30% |
| **Mô tả mơ hồ** (từ người dùng không đủ đặc điểm phân biệt) | 2 | 10% |

## Nguyên nhân lớn nhất: thiếu từ điển (12/20)

Các cụm từ hoàn toàn vắng mặt trong `data/trade-synonyms.json`:
- "kính cường lực điện thoại", "kính bảo vệ màn hình" → 70072990
- "dây trục câu cá", "dây câu" → 95079000
- "dép nhựa PVC" → 64029990
- "cáp sạc", "cáp Type C", "sạc điện thoại" → 85444299, 85044019
- "giấy nến", "lót nướng" → 48236900
- "xy lanh khí nén" → 84123100
- "giấy lụa", "giấy rút" → 48182000
- "dây rút nhựa", "dây buộc hàng" → 39269099
- "chân giá đỡ điện thoại", "tripod điện thoại" → 96200030

## Kết quả sau khi thêm 5 entries (02/10)

**Bench-delta --full (763 tờ khai): delta = 0**
Nguyên nhân: 5 entries mới (85340010, 84839019, 67041900, 64059000, 39211399) không nằm trong holdout ratio=0.15 (chỉ 45/5156 records). Smoke test 5/5 đúng 8 số ✓.

**Số benchmark (bench-delta cache, 763 tờ khai):**
- 4 số top1 = 26.0% · top3 = 34.2%
- 8 số top1 = 14.5% · top3 = 19.8%

**Những gì đã làm:**
1. Thêm 5 entries cho 5 nhóm hoàn toàn vắng mặt: mach-in-pcb-1-lop→85340010, thanh-rang-truyen-dong→84839019, long-mi-gia-synthetic→67041900, giay-vai-canvas→64059000, pu-gia-da-xop→39211399
2. Sửa pu-gia-da-xop: bỏ 39219099 vì không là leaf trong biểu thuế
3. Self-reject CI guard: 0/52 tự loại đúng mã ✓
4. Push nhánh: hermes/lan-C-accuracy-v2 @ 66f9557

**Còn lại (root cause cơ chế):**
- Nguyên nhân A (5 ca): loại khác chiếm top1 → cần cơ chế loại "loại khác" khi có trade-synonym entry cùng nhóm
- Nguyên nhân B (2 ca): 85340010/85340020 đánh bại nhau → cần decision table 8534 (pcbLayers attr đã có trong decision-tables/8534.json)

**PR:** nhánh hermes/lan-C-accuracy-v2 đã push lên origin. Cần dev mở PR draft.

## Oz-gold opportunity analysis (03/10)

**Key insight: delta=0 because our 17 target HS codes cover only 8.4% of wrong records in holdout**

Our 17 target HS codes:
- 572 oz-gold records / 5156 total (11.1%)
- 55 wrong records in holdout / 651 total wrong (8.4%)
- If all fixed: +7.2 percentage points overall (14.7% → 21.9%)

**Oz-gold top-volume groups (biggest opportunity):**
| Group | oz-gold records | % | decision-table |
|-------|----------------|---|----------------|
| 3926  | 333            | 6.5% | origin/hermes/decision-3926 |
| 8536  | 196            | 3.8% | 63 rules, draft, 0 test cases |
| 8481  | 179            | 3.5% | no table |
| 8504  | 153            | 3.0% | 72 rules, draft, 2 test cases |
| 8537  | 133            | 2.6% | no table |
| 8544  | 122            | 2.4% | 6 rules, draft, 0 test cases |
| 8483  | 93             | 1.8% | 9 rules, draft, 0 test cases |
| 6402  | 74             | 1.4% | 13 rules, draft, 0 test cases |

**Top 4 groups = 861 records = 16.7% of oz-gold.**

**Note on 8714 dia xích:**
- Entry `dia-xich-nhong-xe-mo-to` exists (candidates=87141090, avoid=8483) ✓
- 8714 table has rules: partKind=transmission → 87141040, partKind=other → 87141090
- Holdout record (GT=87141090, top1 wrong) has no description → table can't activate
- Root cause: holdout only has {truth, top} — no description for table resolution

**Next priority: 8536 and 3926** — highest oz-gold volume with draft tables needing test cases.

## 8536 deep analysis (06:10 03/10)

**Key findings:**
1. 52 entries cover all 17 wrong-case GTs ✓
2. `extractFacts` on oz-gold (196 records, full text):
   - Function detected: 73% (143/196)
   - CurrentRating detected: 1% (2/196) — **root cause identified**
   - SpecialApp detected: 6% (11/196)
3. **0/196 resolve correctly** — ALL 63 rules require `currentRating` (enum, mandatory)
4. Oz-gold data:
   - Ampere in SPECS field: **93%** (182/196 records)
   - Ampere in tenHang field: **2%** (3/196)
5. Root cause: `extractFacts` reads `text` but `ampere` is in `specs` field (93% coverage)
6. Architecture gap: `currentRating` is enum type, but `specs` parser only runs for `number` type inputs

**Potential fixes (dev scope):**
1. Add number-type `currentRatingAmpere` with `fromSpec` parsing → auto-detect from specs
2. Extend `extractFacts` to read `specs` for enum attributes → backward compatible
3. Add rules for junctionBlock/switch/plug WITHOUT `currentRating` → resolution for common cases
