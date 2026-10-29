# Số nền bench mô tả ECUS + soát cặp mô tả/mã — 29/10/2026 (Đợt 0C)

Đo trên `main` tại commit `72be7d4`, **trước** khi Đợt 0A/0B sửa `describe` và soát. Dùng để so trước/sau mỗi đợt
(thiết kế: ozplugin `docs/gd/ghi-nhan-mo-ta-ecus.md` mục 15, 27, 34, 36).

Tệp này chỉ có **số tổng hợp**. Không có câu mô tả nào của Oz. Chi tiết từng ca nằm ở `data/oz-export/bench/`
(gitignore, chỉ ở máy chạy).

## Cách đo

- **Sinh:** đầu vào là các trường tách rời (tên hàng, chất liệu, công dụng, hiệu, model, KT, thông số, tình trạng, xuất
  xứ) → `describeProduct` (`lib/describe-core.js`) → chấm chuỗi cuối `customsDescription`.
  - **Mock** = LLM "dội lại" đúng các trường đầu vào vào `declaration`. Cách này đo phần tất định sau LLM: neo tên biểu
    thuế (vòng 1), ghép, vòng 2 "(thiếu: …)". Không gọi mạng.
- **Oz:** 200 mẫu `data/oz-gold-final.jsonl`, lấy phân tầng theo chương, **chỉ trong tập giữ riêng** của
  `lib/holdout.js`, có bật `HS_EVAL_EXCLUDE_HOLDOUT=1`. Đã bỏ mã không còn trong biểu hiện hành. Seed 42.
- **Bộ đề:** 38 ca công khai `data/bench/mo-ta-bo-de.json` (Claude chấm duyệt, `CLAUDE_DUYET`). Bộ đề được soạn trước
  khi chạy bench, không xem đầu ra máy sinh.
- **Soát:** `runDeclarationCheck` (`lib/declaration-check.js`), chạy với K1 và **K2 tắt** (K2 gọi LLM). Bench gọi thêm
  thẳng phần K2 tất định: `so-tay-runtime#anhEmKhop` và `evidence-pack` `tienLeMaKhac`. Ca cài lỗi gồm hai loại:
  - (a) bỏ một dữ kiện quyết định;
  - (b) đổi một dữ kiện sang dòng anh em.

  "Có cờ mới" = ca lỗi có cờ CANH_BAO/LOI mà ca chuẩn của nó không có. "Cờ đúng loại" tính như sau:
  - với ca bỏ dữ kiện: cờ thiếu (K1 `THIEU_*`/`MISSING_*`) hoặc cờ K2;
  - với ca đổi anh em: cờ K2.

## 1. Sinh mô tả — Oz, mock, 200 mẫu

| Chương | n | Dài TB | ≤200 | Dấu ngăn | "xuất xứ" | Chữ cấm | Đủ trường BB | Hiệu | KT | Giống câu Oz (Jaccard) |
|---|---|---|---|---|---|---|---|---|---|---|
| 85 | 53 | 181 | 100% | 100% | 100% | 49% | 13% | 28% | 13% | 0.21 |
| 84 | 35 | 161 | 100% | 100% | 100% | 60% | 26% | 54% | 6% | 0.22 |
| 39 | 24 | 160 | 100% | 100% | 100% | 17% | 0% | 17% | 0% | 0.10 |
| 73 | 10 | 129 | 100% | 100% | 100% | 50% | 0% | 70% | 20% | 0.20 |
| 64 | 7 | 149 | 100% | 100% | 100% | 71% | 14% | 0% | 0% | 0.17 |
| 90 | 7 | 169 | 100% | 100% | 100% | 57% | 0% | 71% | 0% | 0.14 |
| 94 | 9 | 133 | 100% | 100% | 100% | 78% | 0% | 22% | 0% | 0.11 |
| 96 | 6 | 86 | 100% | 100% | 100% | 17% | — | 17% | 0% | 0.16 |
| 40 | 6 | 176 | 100% | 100% | 100% | 67% | 0% | 50% | 33% | 0.18 |
| 61 | 6 | 92 | 100% | 100% | 100% | 17% | 0% | 33% | 0% | 0.16 |
| khác | 37 | 119 | 100% | 100% | 100% | 43% | 14% | 24% | 0% | 0.17 |
| **Tổng máy sinh** | 200 | 152 | 100% | 100% | **100%** | **47%** | **11%** | **34%** | **7%** | **0.18** |
| *Câu Oz cùng mẫu* | 200 | 161 | 100% | 99% | 1% | 1% | 30% | 67% | 81% | 1.00 |

Chữ cấm gặp trong máy sinh (số mẫu): "hoặc" 73, "kể cả" 23, "các loại" 19, "không gồm" 11. Trường bắt buộc hay thiếu
nhất: 85 công suất (42), 84 công suất (25), 39 loại nhựa (24), 39 dạng (17), 85 điện áp (16).

## 2. Sinh mô tả — bộ đề công khai, mock, 38 ca

| | n | Dài TB | ≤200 | Dấu ngăn | "xuất xứ" | Chữ cấm | Đủ trường BB | Hiệu | KT | Giống moTaMau (J) |
|---|---|---|---|---|---|---|---|---|---|---|
| Máy sinh | 38 | 124 | 97% | 100% | 0% | 39% | 11% | 11% | 3% | 0.23 |
| moTaMau (chuẩn) | 38 | 128 | 100% | 100% | 0% | 0% | 17% | 11% | 16% | 1.00 |

**Dữ kiện quyết định có mặt trong chuỗi máy sinh (thước đo 15.2): 43% (41/95).** Chỉ tính các dữ kiện không bị đánh dấu
`khongDuCanCu`. Chia theo cấp:

| Cấp | Có mặt / tổng |
|---|---|
| Cấp 4 | 12/24 |
| Cấp 6 | 16/39 |
| Cấp 8 | 13/27 |
| Loại trừ | 0/5 |

Chỉ **13%** số ca có đủ 100% dữ kiện.

Bench bỏ "xuất xứ" ở đây vì bộ đề không truyền xuất xứ.

## 3. Lượt LLM thật — 20 lượt, bộ đề, qua `https://hs-kb.uythacnhapkhau.com/api/describe`

Đã dùng đủ trần 20 lượt. Chọn bộ đề vì là dữ liệu công khai: không gửi dữ liệu Oz qua lượt công khai.

**Cả 20 lượt đều trả `degraded: true`.** LLM phía server lỗi, nên mô tả rơi về đường dự phòng (ghép thô từ ngữ cảnh).
Bản bench đó chưa lưu `llmError`, nên không biết lý do. Bản hiện tại đã lưu.

Các số ra gần trùng chế độ mock:

| | Tổng | Lý do |
|---|---|---|
| Dữ kiện quyết định có mặt | 40% (21/52) | — |
| Chữ cấm | 40% | — |
| Giống moTaMau (Jaccard) | 0.23 | — |
| Lỗi/degraded | 100% | LLM phía server lỗi |

Hai cách chạy ra số gần trùng, nghĩa là mock tái hiện đúng đường tất định của production. **Chưa có số nền của mô tả do LLM
thật sinh.** Cần đo lại khi LLM của server ổn, hoặc chạy cục bộ bằng `--llm=that` với khoá riêng tư.

## 4. Soát cặp mô tả + mã — K1 + K2 tất định (K2 LLM tắt)

| Nguồn | Loại ca lỗi | n | Có cờ mới | Cờ đúng loại | qua K1 | qua K2 tất định |
|---|---|---|---|---|---|---|
| Oz (200 ca chuẩn) | bỏ dữ kiện | 187 | 6% | 6% | 6% | 1% |
| Oz | đổi anh em (luật thay chữ) | 13 | 23% | **0%** | 23% | 0% |
| Bộ đề (38 ca chuẩn) | bỏ dữ kiện | 43 | 7% | 7% | 5% | 2% |
| Bộ đề | đổi anh em (mã đích xác định) | 21 | 14% | 14% | 0% | 14% |

Nền báo oan, tức ca chuẩn vẫn bị gắn cờ:

| Nguồn | K1 | K2 tất định |
|---|---|---|
| Oz | 86% | 4% |
| Bộ đề | 89% | 55% |

- Ở bộ đề, cờ K2 tất định chủ yếu là `TIEN_LE_MO_TA_TUONG_TU_MA_KHAC` (19/38).
- K1 trên câu Oz chủ yếu báo `THIEU_THONG_SO_THEO_NHOM`.
- Bench đã truyền `donViTinh` theo biểu để K1 không báo `UNIT_MISSING` oan.

Với ca Oz đổi anh em, 23% "có cờ mới" đều là cờ **không liên quan**, chủ yếu `VUOT_DO_DAI_ECUS` do câu dài thêm. Không ca
nào bắt đúng mâu thuẫn.

Ca mẫu của sổ thiết kế: đổi "mũi không gắn bảo vệ" → "mũi gắn thép bảo vệ" với mã 64029990 (BD-64-01). **Không bị bắt.**

**K2 LLM chưa đo.** Máy chạy không có khoá LLM riêng tư, gửi dữ liệu Oz qua lượt công khai không được phép, và đã hết 20
lượt LLM cho phần sinh. Lệnh đo sau khi có khoá:

```
node scripts/bench-mo-ta.mjs --mode=soat --nguon=bo-de --llm=that --k2 --max-llm=20
```

## Đọc số

1. **Vòng 1 "neo tên biểu thuế" làm mất tên hàng.** Trong 38 ca bộ đề, chuỗi cuối thường mở đầu bằng chữ biểu thuế, ví
   dụ "Dạng hạt, viên, hạt cườm…", "Hoạt động bằng điện", "Từ sợi tổng hợp". Chất liệu, công dụng và KT bị bỏ. Hệ quả:
   - dữ kiện quyết định chỉ có mặt ở 43% số dữ kiện;
   - KT có mặt ở 7% số câu, so với 81% câu Oz;
   - mệnh đề loại trừ có mặt ở 0/5 dữ kiện loại trừ.

   Đây đúng là việc của 0B.
2. **"xuất xứ" có ở 100% câu sinh từ mẫu Oz có xuất xứ; câu Oz chỉ 1%.** Chữ cấm ("hoặc", "kể cả", "không gồm") đến từ
   chữ biểu thuế chép nguyên.
3. **Nhãn thiếu vẫn là khoá tiếng Anh**, ví dụ "(thiếu: xuatXu, power, voltage)". Câu còn bị đòi "power/voltage" cả với
   hàng không dùng điện, như cáp sạc hay cuộn cảm. Khuôn chương quá thô.
4. **Soát hiện có gần như không bắt được lỗi dữ kiện** khi K2 LLM tắt: tối đa 7% với ca bỏ dữ kiện, 0–14% với ca đổi anh
   em. Đồng thời soát báo oan rất cao ở K1 (86–89%). Đây là số nền cho Đợt 2 (soát chỉ bắt MÂU THUẪN).

## Chỗ còn nghi ngờ (cần biết khi so số)

- "Đủ trường BB" dùng mẫu chữ trong `data/chapter-declaration-fields.json`, khớp thô theo chương. Câu Oz cũng chỉ đạt
  30%. Coi đây là số tương đối, không phải chất lượng tuyệt đối.
- "Hiệu", "KT" và "chữ cấm" đo bằng biểu thức chính quy. Riêng "hoặc" có thể là chữ đúng trong tên hàng.
- Ca Oz cài lỗi được dựng máy móc:
  - (a) bỏ nguyên văn cụm chất liệu, công dụng, thông số hoặc KT nếu cụm đó có trong câu;
  - (b) chỉ 13/200 câu khớp luật thay chữ, và chưa biết mã đích.

  Ca bộ đề thì có mã đích rõ.
- Bộ đề do Claude chấm duyệt, chưa có người duyệt. Ca `lechTienLe` (BD-85-01 kiểu 8544.42.99, BD-85-02 hai TB-TCHQ lệch
  nhau) và các dữ kiện `khongDuCanCu` không được tính vào điểm dữ kiện.

## Lệnh đã chạy (tái hiện)

```
node scripts/check-mo-ta-bo-de.mjs
node scripts/bench-mo-ta.mjs --mode=sinh --nguon=oz --n=200
node scripts/bench-mo-ta.mjs --mode=sinh --nguon=bo-de
node scripts/bench-mo-ta.mjs --mode=sinh --nguon=bo-de --n=20 --api=https://hs-kb.uythacnhapkhau.com --max-llm=20
node scripts/bench-mo-ta.mjs --mode=soat --nguon=oz --n=200
node scripts/bench-mo-ta.mjs --mode=soat --nguon=bo-de
```
