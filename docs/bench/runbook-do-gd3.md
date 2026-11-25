# Runbook đo Giai đoạn 3 qua kênh đo riêng (`scripts/do-do-thi-gd3.mjs`)

Tài liệu hướng dẫn **QT (quản trị server)** chạy công cụ đo Giai đoạn 3 bằng chuỗi mô hình thật qua **container đo / kênh đo riêng** và **khoá API đo riêng**, tuân thủ luật **L1** (`docs/luat-duong-khach.md`), **Luật đo 23/11** (`docs/tang-4so/LUAT-DO.md`) và điều kiện nhận GĐ3 trong [`docs/ke-hoach-do-thi-tri-thuc-hs.md`](../ke-hoach-do-thi-tri-thuc-hs.md) (mục 2, mục 6 GĐ3, mục 9).

> [!CAUTION]
> **CẤM chạy `--llm that` trong container đang phục vụ khách (`hs-code-api`) hoặc bằng khoá API đang phục vụ khách.**
> - Mọi lượt đo `--llm that` **bắt buộc** chạy trong **container đo / kênh đo riêng** (ví dụ `hs-code-api-bench`) dùng **khoá API đo riêng**, tuyệt đối không dùng chung quota hay tranh CPU/mạng với container phục vụ khách thật.
> - **Luật đo 23/11 (`docs/tang-4so/LUAT-DO.md`):** chỉ đo lại các ca còn sai — **đã bỏ mặc định 300 ca** khi chạy `--llm that`. Khi truyền `--llm that`, bắt buộc phải kèm `--bo <tệp jsonl>` hoặc `--gioi-han <n>` (thiếu cả hai script sẽ thoát mã `1`).
> - **Riêng tư & giữ sạch repo:** bộ `v3-gan-nhan.jsonl` (mô tả lấy từ tờ khai khách hàng) và mọi tệp kết quả `/tmp/gd3-*.json`, `/tmp/gd3-*.md` **bắt buộc giữ ngoài repo**, tuyệt đối không commit vào repo công khai. Không sửa mã nguồn hay tệp dữ liệu trong repo khi đo.

---

## 1. Chuẩn bị kênh đo riêng và kiểm tra trước khi đo

1. Dựng hoặc chọn **container đo riêng** (tách khỏi container phục vụ khách `hs-code-api`, gắn khoá API đo riêng và biến môi trường nền giống máy thật):
   ```bash
   CONTAINER_DO=hs-code-api-bench
   ```
2. Kiểm tra tải CPU trên máy chạy container đo (số đầu của `/proc/loadavg` phải thấp hơn số lõi, tránh làm p95 bị méo):
   ```bash
   docker exec "$CONTAINER_DO" cat /proc/loadavg
   ```
3. Kiểm tra commit và trạng thái chuỗi mô hình của kênh đo riêng qua `/api/health` của container đo (không kiểm bằng container khách):
   ```bash
   docker exec "$CONTAINER_DO" curl -sS http://127.0.0.1:3000/api/health | jq '{commit, llm: .checks.llm}'
   ```
   - Đảm bảo `llm.private.ok == true` trong nhánh `checks.llm` (dùng khoá đo riêng hợp lệ, không huấn luyện).
   - Nếu Gemini trả phí đang lỗi `402` hoặc bị ngắt mạch trên kênh đo, xử lý theo [`docs/viec/yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md`](../viec/yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md) trước khi đo để tránh nhiễu độ trễ.

---

## 2. Cấu hình nền (`nen`) và biến môi trường khi chạy `--llm that`

Script `scripts/do-do-thi-gd3.mjs` chạy ở chế độ mặc định `--che-do ca-hai` sẽ tự so **`nen` vs BẬT**:
- **`nen` (nền thật khách hàng):** giữ nguyên **mọi** cờ `HS_*` đang đặt trong `process.env` của kênh đo (máy thật đang chạy: `HS_TIM_TRUOC=on`, `HS_TIM_TRUOC_NAP=0`, `HS_CHOT_SOM_CO_KIEM=on`, `HS_HOI_THEO_SO_TAY=on`, `HS_SO_TAY=full`, `HS_CLASSIFY_ENGINE=loop`).
- **BẬT (`goi` hoặc `ba-buoc`):** chỉ ghi đè `HS_TIM_TRUOC=goi` (hoặc chạy phần `ba-buoc`) **lên trên cùng tập cờ nền env**, giúp đo đúng chênh lệch công bằng so với cấu hình khách hàng đang chạy thật.
- **`tat` (tuỳ chọn `--che-do tat`):** chỉ dùng khi cần đo đường tắt hẳn `HS_TIM_TRUOC` cho đối chiếu L1.

| Biến | Giá trị trên kênh đo riêng | Ghi chú |
|---|---|---|
| `MINIMAX_API_KEY` (và các khoá LLM khác) | **Khoá đo riêng** | Tuyệt đối không dùng khoá đang phục vụ khách |
| `HS_CLASSIFY_ENGINE` | `loop` | Giữ nguyên từ env kênh đo |
| `HS_TIM_TRUOC` | `on` (trong `nen`) | `nen` đọc nguyên từ env (`on`); nhánh BẬT (`goi`) chỉ ghi đè thành `goi` trong lúc chạy nhánh BẬT |
| `HS_TIM_TRUOC_NAP` | `0` | Giữ nguyên từ env kênh đo |
| `HS_CHOT_SOM_CO_KIEM` | `on` | Giữ nguyên từ env kênh đo |
| `HS_HOI_THEO_SO_TAY` | `on` | Giữ nguyên từ env kênh đo |
| `HS_SO_TAY` | `full` | Giữ nguyên từ env kênh đo |
| `HS_LLM_PRIVATE_ALL` | `true` | Script tự đặt `true` nếu chưa đặt — bắt buộc để dữ liệu Oz chỉ đi nhà cung cấp không huấn luyện |
| `HS_EVAL_EXCLUDE_HOLDOUT` | `1` (tuỳ chọn) | Nếu có chạy mẫu S-7 (`--chi-bo s7 --gioi-han <n>`), script tự lọc loại toàn bộ 607 dòng holdout |

---

## 3. Các lệnh chạy trên container đo riêng (bắt buộc `--bo` hoặc `--gioi-han`)

> Mọi lệnh `--llm that` dưới đây đều truyền `--che-do ca-hai` (tự so `nen` vs BẬT) và **bắt buộc** có `--bo` hoặc `--gioi-han` theo Luật đo 23/11. Các tệp dữ liệu riêng như `v3-gan-nhan.jsonl` đặt ngoài repo (ví dụ `/tmp/v3-gan-nhan.jsonl` hoặc mount chỉ đọc vào `/srv/bench/v3-gan-nhan.jsonl` trong container đo).

### Bước A — Chạy thử nhanh `van52` (5 lượt `nen` + 5 lượt BẬT)
Kiểm tra kết nối khoá đo riêng, cờ nền `nen` đang giữ và độ ổn định ca van 5/2:

```bash
docker exec "$CONTAINER_DO" node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --che-do ca-hai \
  --chi-bo van52 \
  --gioi-han 5 \
  --gian 1500 \
  --json /tmp/gd3-van52.json \
  --ghi-bao-cao /tmp/gd3-van52.md \
  --che-pII
```

- **Ước tính:** 10 lượt classify (5 `nen` + 5 BẬT) · ~20–25 lượt gọi AI · **~3–7 phút**.

### Bước B — Đo tập ca còn sai / bộ `v3-gan-nhan.jsonl` (ngoài repo)

Đặt tệp `v3-gan-nhan.jsonl` (hoặc tệp danh sách ca còn sai của vòng trước) **ngoài repo**, ví dụ `/tmp/v3-gan-nhan.jsonl`, rồi truyền `--bo`:

```bash
docker exec "$CONTAINER_DO" node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --che-do ca-hai \
  --chi-bo bo \
  --bo /tmp/v3-gan-nhan.jsonl \
  --gian 1500 \
  --json /tmp/gd3-v3.json \
  --ghi-bao-cao /tmp/gd3-v3.md \
  --che-pII
```

- Khi truyền `--bo <tệp>` mà không truyền `--chi-bo`, script cũng mặc định chỉ chạy đúng bộ `--bo` đó (không kéo bộ S-7 300 ca).
- Nếu muốn so thêm luồng 3 bước `lib/do-thi/ba-buoc.js` song song với `goi`, thêm `--phuong-an ca-hai`.

### Bước C — Lấy mẫu nhỏ `van30` hoặc `s7` có giới hạn rõ (`--gioi-han`)

Theo Luật đo 23/11, không chạy cả bộ 300 ca S-7 mặc định; khi cần kiểm tra có kiểm soát, luôn giới hạn số ca bằng `--gioi-han`:

```bash
# Kiểm tra van30 (30 ca)
docker exec "$CONTAINER_DO" node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --che-do ca-hai \
  --chi-bo van30 \
  --gioi-han 30 \
  --gian 1500 \
  --json /tmp/gd3-van30.json \
  --ghi-bao-cao /tmp/gd3-van30.md \
  --che-pII

# Kiểm tra mẫu nhỏ S-7 (ví dụ 30 ca có chỉ định --gioi-han)
docker exec "$CONTAINER_DO" node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --che-do ca-hai \
  --chi-bo s7 \
  --gioi-han 30 \
  --gian 1500 \
  --json /tmp/gd3-s7-30.json \
  --ghi-bao-cao /tmp/gd3-s7-30.md \
  --che-pII
```

### Tự kiểm offline trên Mac/CI (`--llm gia`)

Trên Mac hoặc CI vẫn chạy tiện bằng `--llm gia` (chặn mạng 100%, không cần `--bo`/`--gioi-han` bắt buộc):

```bash
node scripts/do-do-thi-gd3.mjs --llm gia --gioi-han 10 --che-do ca-hai --phuong-an ca-hai --che-pII
```

---

## 4. Cách đọc kết quả theo điều kiện nhận GĐ3

Mở tệp báo cáo Markdown (ví dụ `/tmp/gd3-v3.md` hoặc `/tmp/gd3-van52.md`) và kiểm tra mục `Cờ nền đang giữ (nen)` để xác nhận đúng 5 cờ nền đang có trong env trước khi đối chiếu bảng `nen` vs BẬT:

| # | Thước đo | Ngưỡng nhận GĐ3 | Ý nghĩa khi không đạt |
|---|---|---|---|
| 1 | **Đúng nhóm 4 số** | **BẬT > `nen`** | Kiểm tra mục `Bị loại ở L1 (rủi ro 1)`: nếu tỉ lệ này cao, AI lượt 1 đang loại mất nhóm đúng mà `timTruoc` đã tìm thấy |
| 2 | **Van 5/2 (5 lượt) — Ổn định** | **5/5 lượt đúng nhóm `8481`** | Còn dao động sang `8412` / `848180` → kiểm tra gói phân biệt `8412-8481` và xem lượt 1 có giữ `8481` không |
| 3 | **Thời gian — Trung vị** | **≤ 45 s** | Chậm quá trần: kiểm tra `chuoiMoHinh.daDung`, `luotAi.trungBinh` (có bị vòng sửa lặp lại không) |
| 4 | **Thời gian — p95** | **≤ 80 s** | Rủi ro chạm trần cắt **85 s** của động cơ / Cloudflare (~95–100 s) khiến khách nhận lỗi |

### Các chỉ số chẩn đoán kèm theo
- **Bị loại ở L1 (rủi ro 1 mục 9):** `số ca có nhóm đúng trong ứng viên trước L1 nhưng không còn sau L1 / số ca có nhóm đúng trong ứng viên trước L1`. Ở cả `nen` (khi `HS_TIM_TRUOC=on`) lẫn BẬT (`goi`/`ba-buoc`), chỉ số này đều được tính để so sánh công bằng.
- **Ký tự gói AI nhận:**
  - Lượt 1 (`V1` / khối tìm trước): đối chiếu ngưỡng thiết kế **~1.300 ký tự** (`timTruoc.khoi ≤ 1.500`, `luotMot ≤ 1.300`).
  - Gói phân biệt (`goiPhanBiet`): đối chiếu ngưỡng **6–7 nghìn ký tự** (trần cứng `7.000`).
- **Số lượt AI/ca (`luotAi.trungBinh`):** mục tiêu ≤ 2,2 lượt/ca ở chế độ chuẩn; tăng vọt (> 2,5) là dấu hiệu AI bị `gates()` chặn và phải gọi thêm vòng sửa.

---

## 5. Xử lý sau đo

- **Đạt cả ngưỡng so với `nen` trên kênh đo riêng:** mới xem xét trình QT bật `HS_TIM_TRUOC=goi` (theo quy trình L1 và báo cáo kèm `gitSha`, `chuoiMoHinh`, tập cờ nền `coNen`, số lượt mẫu, ngày đo).
- **Chưa đạt bất kỳ điều kiện nào:** giữ nguyên cấu hình nền trên máy thật (`HS_TIM_TRUOC=on`); gửi lại bảng Markdown (không chứa mô tả hàng/PII) + số lỗi/nguyên nhân gốc theo Luật đo 23/11 để sửa trước khi đo lại đúng các ca còn sai.
- **Dọn tệp tạm:** giữ `v3-gan-nhan.jsonl` và mọi `/tmp/gd3-*` ở ngoài repo, không bao giờ đưa vào kho mã nguồn.
