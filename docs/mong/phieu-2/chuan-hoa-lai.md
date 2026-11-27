# M-81 · Phiếu 2c: chấm lại vòng 2 sau sửa gộp chunk + gốc sai nghĩa `8516:8108`

Thẻ #2410. Đầu vào: trả lời gốc Gemini `goc/tra-<nhóm>.txt` (trùng byte `~/phieu2/tra-*.txt` trên .131), vàng `docs/mong/the/M-81-vang-{8516,9405,8471,4016}.md`, main `f2dee4901` (đã có #2447). Không sửa skill / test / `data/`.

## 1. Gốc sai nghĩa `hs:bieu:8516:8108`

### Gemini viết gì

| Trường | Giá trị |
|---|---|
| nút / vế | `bieu:8516`, `ve: 0`, `phu: true`, `CO_KHONG`, `MO_TA_HUONG_DAN` |
| cauHoi | "Sản phẩm có phải là thiết bị nhiệt điện thương mại không thường được sử dụng trong gia đình (thuộc nhóm 84.19) không?" |
| trich / nguon | "thiết bị nhiệt điện khác mà không thường được sử dụng trong gia đình" / `nhom:8516:ct:57#1` |

### Câu luật gốc (nguyên văn từ gói đề `de-8516.txt`)

- Tên nhóm `bieu:8516#1` (6 vế, chỉ vế 5 mang chữ "gia dụng"): "…; bàn là điện; **dụng cụ nhiệt điện gia dụng khác**; các loại điện trở đốt nóng bằng điện, trừ loại thuộc nhóm 85.45".
- Chú giải nhóm chia mục (A)…(F) theo từng vế. Mục ứng vế 5: `ct:31` "(E) THIẾT BỊ NHIỆT ĐIỆN KHÁC LOẠI SỬ DỤNG CHO MỤC ĐÍCH GIA DỤNG"; `ct:32` "Nhóm này bao gồm tất cả các máy và thiết bị nhiệt điện với điều kiện chúng thường được sử dụng trong gia đình."
- Danh sách loại trừ nằm **trong mục (E)**, sau mục con (20) `ct:53` và trước tiêu đề `ct:62` "(F) CÁC ĐIỆN TRỞ NUNG NÓNG BẰNG ĐIỆN": `ct:54` "Nhóm này loại trừ:" → `ct:57` "(c) Máy pha cà phê dùng cho quầy hàng, máy ủ sữa hoặc trà, chảo rán và chảo chao dầu mỡ, ví dụ, trong các cửa hàng bán đồ rán, và các thiết bị nhiệt điện **khác** mà không thường được sử dụng trong gia đình (nhóm 84.19…)."
- Biểu chính (`bieu-chinh.jsonl.gz` 2026.04.05) giữ hàng không gia dụng ở các vế khác: 8516.10.11 "Bình thủy điện … loại gia dụng (SEN)" / 8516.10.19 "Loại khác"; 8516.40.10 "Loại được thiết kế sử dụng hơi nước từ hệ thống nồi hơi công nghiệp"; 8516.80.10 "… dùng cho lò công nghiệp" / 8516.80.30 "Dùng cho thiết bị gia dụng".
- Vàng: tiêu chí gia dụng là điều kiện dương của vế 5 (`8516:8112`, `moNguon ct:32`) và của phần bù [85167] (`85167:8101`); `ct:57` chỉ vào `CANH_TRANH` 84.19 (`8516:81104`), không vào `ve: 0`.

### Sai ở đâu

- **Không** đảo phủ định (phủ định đúng: loại trừ → `phu: true`), **không** sai trục, đọc chữ luật **đúng nghĩa**.
- **Gán sai phạm vi (sai vế):** câu loại trừ của mục (E) (chỉ chi phối vế 5) bị nâng lên `ve: 0` của cả nhóm. Chữ "khác" trong `ct:57` trỏ về chính thiết bị của mục (E); tiêu chí "không thường dùng trong gia đình" là phủ định của chữ định tính "gia dụng" chỉ vế 5 mang. Đặt ở `ve: 0` thì loại cả vế 1–4 và 6, trái chữ biểu ở 8516.10.19, 8516.40.10, 8516.80.10.
- Bậc ADR-0004: **Quy tắc 1, soát loại trừ cấp nhóm 4 số** (cổng `NGOAI_PHAM_VI`): đường đi sai ngay từ cửa nhóm.
- Ô ca không lộ hết tác hại: theo quy ước chấm nới, X5/X9 đúng đích "nhờ điều kiện sai phạm vi" và không ca nào bị tính sai vì `8108`. Chấm chặt thì T24 (bàn là tiệm may) và T26b (bàn là nối ống hơi nồi hơi công nghiệp) bị đẩy sang 84.19; T1–T4, T53, T54 có thể nhận thêm lối ra 84.19 trái luật.

### Có lặp ở 3 nhóm kia không (soát mọi điều kiện `ve: 0` tại nút 4 số, đối chiếu vị trí câu nguồn trong chú giải nhóm)

| Nhóm | Câu loại trừ nằm trong một mục, bị nâng lên `ve: 0` | Sai nghĩa? |
|---|---|---|
| 85.16 | 6 điều kiện từ danh sách trong mục (E): `ct:56` ×2 (84.20, 84.51), `ct:57`, `ct:58` (85.14), `ct:59` (85.43), `ct:61` (96.13) | 1 (`ct:57`). Các câu còn lại nêu loại hàng cụ thể, không dòng con nào ghi đích danh hàng đó → vô hại (vàng chặt hơn: `ct:56` gắn vế bàn là, `ct:58/59` vào `CANH_TRANH`) |
| 84.71 | `ct:55` (84.70), `ct:56` (84.72), thuộc danh sách "Do đó, nhóm này không bao gồm:" `ct:53` **trong mục (II)** (đầu đọc, máy truyền dữ liệu…). Gemini để `ct:54` "(a) Máy xử lý dữ liệu tự động … ở Phần I" lại, đúng (nâng lên thì loại cả vế 1–2) | 0. Loại hàng cụ thể, không dòng con nào ghi đích danh |
| 94.05 | `ct:8` "(5) Đèn xách tay (trừ đèn thuộc nhóm 85.13)" trong mục (I) → `9405:8112` ve 0. Danh sách `ct:28–40` đứng sau mục cuối, áp cả nhóm → `ve: 0` đúng | 0 |
| 40.16 | Chú giải nhóm không chia mục; `ct:17` "Các mặt hàng sau cũng bị loại trừ khỏi nhóm này:" áp cả nhóm → `ve: 0` đúng | 0 |

Đối chứng: phạm vi của chữ **biểu** theo dấu `;` thì Gemini làm đúng ở cả 4 nhóm ("chưa được chi tiết hoặc ghi ở nơi khác" chỉ gắn vế 3–6 của 84.71; "nguồn sáng cố định thường xuyên" chỉ gắn vế biển hiệu của 94.05). Skill có luật riêng cho `;` (bước 4, Tầng 4) nhưng với chú giải nhóm thì Luật 3 lại viết "**mọi mệnh đề loại trừ ở … Chú giải nhóm** … Dùng `ve: 0, phu: true`" và bước 4 viết "`ve: 0` … thường là `phu: true` cho mệnh đề loại trừ ở Chú giải Phần/Chương/nhóm"; không có phép kiểm phạm vi mục.

**Kết luận: lỗi hệ thống.** Cùng một cơ chế (luật skill đẩy mọi loại trừ của chú giải nhóm lên `ve: 0`, không xét câu đó nằm trong mục nào) sinh 9 lần nâng sai phạm vi ở 3/4 nhóm. Chỉ 1 lần thành sai nghĩa, vì chỉ câu đó loại theo **thuộc tính** (nơi dùng), là phủ định chữ định tính của một vế. Các lần còn lại loại theo **loại hàng** nên tình cờ vô hại. Nhóm sau có chú giải chia mục theo vế mà loại trừ theo công dụng, nơi dùng hoặc quy mô sẽ lặp lỗi này.

### Đề xuất luật cho skill `doc-tron-nhom` (chưa sửa skill; sạch mã cho đo mù)

> **Phạm vi câu loại trừ của chú giải nhóm.** (1) Câu "nhóm này loại trừ / không bao gồm" đứng trong một mục (A), (B)… hoặc (I), (II)… của chú giải nhóm chỉ chắc chắn chi phối vế tên nhóm mà mục đó giải thích. Chỉ nâng lên `ve: 0` khi câu đứng ngoài mọi mục, hoặc khi đã chứng minh nó không loại hàng mà một vế khác hay một dòng biểu con ghi đích danh. (2) Câu loại trừ theo thuộc tính chung (nơi dùng, quy mô, đối tượng dùng…) đúng bằng phủ định của chữ định tính mà chỉ một vế mang thì gắn `phu: true` vào đúng vế đó, hoặc ghi `CANH_TRANH`; cấm `ve: 0`. (3) Chữ biểu thắng vị trí câu trong chú giải chi tiết: `ve: 0` nào làm một dòng con mất hàng của chính nó là sai phạm vi.

Bốn câu trước khi sửa (CLAUDE.md):
1. **Bậc:** Quy tắc 1, soát loại trừ cấp nhóm 4 số.
2. **Cấu trúc sinh lỗi:** Luật 3 + bước 4 của skill mặc định `ve: 0` cho mọi loại trừ của chú giải nhóm. Cơ chế xuất hiện ở 3 nhóm, nên sửa luật chứ không sửa ca `8108`.
3. **Kho đã có:** skill đã có luật phạm vi cho `;` (Tầng 4) và luật "văn bản cao hơn thắng" (Tầng 1). Chỉ cần mở rộng hai luật này sang câu loại trừ của chú giải nhóm, không viết luật mới. Gói `goi-nhom` đã giữ thứ tự `ct:N` và tiêu đề mục (A)…(F), nên LLM có đủ dữ kiện.
4. **Cổng giữ:** khâu soi (ADR-0008) hỏi thêm một câu hẹp PHẠM VI cho mỗi `ve: 0, phu: true` có nguồn chú giải nhóm: "điều kiện này có loại hàng mà một vế khác hay một dòng con ghi đích danh không?". Bộ ca rẽ nhánh có ca cho hàng không mang chữ định tính đi qua các vế không có chữ đó. Cổng 8 / cổng 10 hiện không bắt được lỗi này (cổng 10 chấm ca nới).

## 2. Chấm lại vòng 2 trên bản chuẩn hoá đã sửa

### Chạy lại chuẩn hoá

`p2.mjs nap <nhóm>` không đổi logic, chỉ đổi chỗ đọc thành `docs/mong/phieu-2/goc/` và chỗ ghi thành thư mục tạm (không ghi vào `data/`). Lệnh gọi `tachGoiNhom(…, { khongChia: true })` → `gopKetQuaChunk` của #2447 trên main `f2dee4901`.

| Nhóm | Gemini viết (DK) | Chuẩn hoá cũ (a) | **Chuẩn hoá đã sửa** | Bản ghi (DK/GC/CT) | `canhBao` | So `jsonl-goc/` |
|---|---|---|---|---|---|---|
| 85.16 | 97 | 83 | **97** | 101 (97/4/0) | 0 | trùng byte |
| 94.05 | 185 | 121 | **185** | 186 (185/0/1) | 0 | trùng byte |
| 84.71 | 81 | 74 | **81** | 89 (81/8/0) | 0 | trùng byte |
| 40.16 | 63 | 63 | **63** | 71 (63/7/1) | 0 | trùng byte |

- sha256 bản mới = `jsonl-goc/` (bộ b): 8516 `c2bff339…`, 9405 `a70f735e…`, 8471 `14c14a7f…`, 4016 `789d99dc…`. Không mất điều kiện nào; không có cặp trùng khoá khác nội dung.
- 84.71 vẫn còn `loi` CANH_TRANH `phepThu "nhom:8471:ct:55#1" không hợp lệ hoặc không nguyên văn`, như bản cũ (cổng 12 FAIL, 0 CANH_TRANH). Lỗi này thuộc phiếu, không thuộc chuẩn hoá.
- Cổng 6–12 (`cong.mjs --pham-vi <nhóm> --cong 6..12`, kho tạm = `data/ho-so-ma` + phiếu): kết quả **trùng `cong-goc/`** ở cả 4 nhóm, chỉ khác dòng đếm "khuôn" (nền kho khác).

### Bảng chấm (cột như README; khớp theo nghĩa luật)

Phiếu đã chuẩn hoá đúng trùng byte với bộ (b), nên giữ nguyên chấm chi tiết của `cham/<nhóm>.md` mục 6. Tôi soát độc lập các mục đổi điểm giữa (a) và (b): 847149 ×3 (CPU / bộ nhập / bộ xuất khớp vàng `847149:8103–8105`, THIẾU → KHỚP) và 94053 ×2 (giá trị gộp "Dây đèn dùng cho cây Nô-en" so với vàng tách hai điều kiện, THIẾU → MỘT_PHẦN). Cả hai mục đúng như bộ (b) đã chấm.

| Nhóm | ĐK vàng | Khớp / một phần / thiếu | Tỉ lệ | Cặp vàng: tìm / sót | Ca đúng / dừng hỏi / sai | Sai nghĩa |
|---|---|---|---|---|---|---|
| 85.16 | 51 | 41/7/3 | 0,873 | 9: 9/0 | 42 / 15 / 8 | 1 (`8516:8108`) |
| 84.71 | 62 | 46/15/1 | 0,863 | 6: 6/0 | 27 / 16 / 4 | 0 |
| 40.16 | 64 | 40/22/2 | 0,797 | 10: 3/7 | 25 / 13 / 0 | 0 |
| 94.05 | 105 | 85/18/2 | 0,895 | 39: 31/8 | 13 / 28 / 0 | 0 |
| **Gộp** | 282 | 212/62/8 | **TB 0,857** · min 0,797 | 64: 49/15 (sót 23,4 %) | 107 / 72 / 12 (191 ca) | **1** |

### So với số cũ

| Chỉ số | Chuẩn hoá cũ (a) | Gốc Gemini (b) | **Chuẩn hoá đã sửa** |
|---|---|---|---|
| TB tỉ lệ | 0,841 | 0,857 | **0,857** |
| Min | 0,797 | 0,797 | 0,797 |
| Sót chồng (chỉ phiếu) | 36/64 = 56 % | 15/64 = 23 % | 15/64 = **23,4 %** |
| Sót chồng dây chuyền (soạn + soi) / (+ cổng 8) | — | 14,1 % / 3,1 % | **14,1 % / 3,1 %** (phiếu và cổng trùng, soi 2b dùng nguyên) |
| Ca đúng / dừng hỏi / sai | 107 / 70 / 14 | 107 / 72 / 12 | 107 / 72 / 12 |
| Sai nghĩa | 8 (7 do chuẩn hoá ở 94.05) | 1 | **1** |

Mức chênh 0,84 → 0,857 toàn do lỗi máy chuẩn hoá: sửa #2447 khôi phục đủ phần của Gemini, không còn chênh giữa "như máy nạp" và "bản gốc".

### Ngưỡng mở cuốn chiếu (dây chuyền soạn + soi + cổng 8, trên bản chuẩn hoá đã sửa)

| Ngưỡng | Kết quả |
|---|---|
| TB ≥ 0,85 | 0,857 ✔ |
| Không nhóm < 0,75 | min 0,797 ✔ |
| Sót chồng ≤ 10 % | soạn + soi 14,1 % ✘ · + cổng 8 3,1 % ✔ |
| 0 sai nghĩa | 1 ✘ (`8516:8108`, lỗi hệ thống của skill, mục 1) |

Còn chặn: **1 sai nghĩa**. Muốn gỡ thì sửa luật phạm vi loại trừ trong skill (đề xuất ở mục 1), rồi đo mù lại ít nhất một nhóm có chú giải nhóm chia mục theo vế và có loại trừ theo thuộc tính. Không soạn lại 4 nhóm vàng này. Cổng 8 vẫn cần cách lọc cảnh báo (40.16: 52 → 6) thì bộ "+ cổng 8" mới dùng được thật.
