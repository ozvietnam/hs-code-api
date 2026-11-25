# Runbook đo Giai đoạn 3 trên máy chủ thật (`scripts/do-do-thi-gd3.mjs`)

Tài liệu hướng dẫn **QT (quản trị server)** chạy công cụ đo Giai đoạn 3 trên container máy thật (`.120`), dùng đúng chuỗi mô hình đang phục vụ khách qua Cổng OZ (luật **L1**, `docs/luat-duong-khach.md`), và đối chiếu kết quả với điều kiện nhận GĐ3 trong [`docs/ke-hoach-do-thi-tri-thuc-hs.md`](../ke-hoach-do-thi-tri-thuc-hs.md) (mục 2, mục 6 GĐ3, mục 9).

> **Nguyên tắc L1:** Không sửa mã nguồn hay tệp dữ liệu trong repo khi đo. Mọi tệp kết quả JSON/Markdown ghi ra `/tmp/` (ngoài repo, không commit dữ liệu hay dump tờ khai Oz).

---

## 1. Kiểm tra trước khi đo (trong container `hs-code-api`)

1. Kiểm tra tải CPU (số đầu của `/proc/loadavg` phải thấp hơn số lõi, nếu cao sẽ làm p95 bị méo):
   ```bash
   docker exec hs-code-api cat /proc/loadavg
   ```
2. Kiểm tra `SOURCE_COMMIT` / `HS_COMMIT` và chuỗi mô hình đang chạy qua `/api/health`:
   ```bash
   curl -sS http://127.0.0.1:3000/api/health | jq '{commit, llm: .llm}'
   ```
   - Đảm bảo `llm.private.ok == true` (có `minimax` hoặc khoá không huấn luyện hợp lệ).
   - Nếu Gemini trả phí đang lỗi `402` hoặc bị ngắt mạch, xử lý theo [`docs/viec/yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md`](../viec/yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md) trước khi đo để tránh nhiễu độ trễ.

---

## 2. Biến môi trường cần có khi chạy `--llm that`

Script `scripts/do-do-thi-gd3.mjs` chạy trực tiếp bên trong container nên kế thừa sẵn env của tiến trình server (`MINIMAX_API_KEY`, `LOOP_MODEL`, `LLM_STEP_*`, `HS_CLASSIFY_ENGINE=loop`, `HS_SO_TAY`, `HS_CHOT_SOM_CO_KIEM`, `HS_GON_DAU_RA`, `HS_MAX_VONG_SUA`…).

| Biến | Giá trị khi chạy script | Ghi chú |
|---|---|---|
| `HS_CLASSIFY_ENGINE` | `loop` | Script tự đặt `loop` trong tiến trình đo |
| `HS_LLM_PRIVATE_ALL` | `true` | Script tự đặt `true` nếu chưa đặt — bắt buộc để dữ liệu Oz (`s7`, `van30`) chỉ đi nhà cung cấp không huấn luyện |
| `HS_TIM_TRUOC` | tự xoay vòng | Script tự chạy 2 lượt: **TẮT** (xoá biến trong tiến trình) và **BẬT** (`HS_TIM_TRUOC=goi`) — **không cần sửa env container đang phục vụ khách** |
| `HS_EVAL_EXCLUDE_HOLDOUT` | `1` (tuỳ chọn) | Riêng bộ S-7 `de-rieng-300.jsonl`, script đã tự bọc `ozSearch` để loại toàn bộ danh sách cách ly S-7 (`de-rieng-danh-sach-loai.json`, 607 dòng) |

---

## 3. Các lệnh chạy từng bước (từ nhẹ tới nặng)

### Bước A — Chạy thử nhanh trên `van52` (5 lượt TẮT + 5 lượt BẬT)
Kiểm tra kết nối chuỗi mô hình thật và độ ổn định ca van 5/2 trước khi chạy bộ lớn:

```bash
docker exec hs-code-api node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --chi-bo van52 \
  --gian 1500 \
  --json /tmp/gd3-van52.json \
  --ghi-bao-cao /tmp/gd3-van52.md \
  --che-pII
```

- **Ước tính:** 10 lượt classify (5 TẮT + 5 BẬT) · ~20–25 lượt gọi AI · **~3–7 phút**.

### Bước B — Bộ 30 ca van khí nén (`van30`)

```bash
docker exec hs-code-api node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --chi-bo van30 \
  --gian 1500 \
  --json /tmp/gd3-van30.json \
  --ghi-bao-cao /tmp/gd3-van30.md \
  --che-pII
```

- **Ước tính:** 60 lượt classify (30 TẮT + 30 BẬT) · ~120–140 lượt gọi AI · **~20–35 phút**.

### Bước C — Đủ 3 bộ GĐ3 (`van52` + `van30` + `s7` 300 ca)

> Nên chạy trong `tmux` / `screen` hoặc nền với log ngoài repo vì bộ S-7 300 ca chạy 2 chế độ mất vài giờ. Nếu muốn chạy kiểm thử nhanh trước trên 30 ca S-7, thêm `--nhanh` hoặc `--gioi-han=30`.

```bash
docker exec hs-code-api node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --gian 1500 \
  --json /tmp/gd3-full.json \
  --ghi-bao-cao /tmp/gd3-full.md \
  --che-pII \
  > /tmp/gd3-full.log 2>&1
```

- **Ước tính tổng (đủ 3 bộ × 2 chế độ TẮT + `goi`):**
  - Tổng số lượt classify: `(5 + 30 + 300) × 2 = 670` lượt.
  - Số lượt gọi AI ước tính: trung bình ~2,0–2,3 lượt/ca → **~1.340–1.550 lượt AI**.
  - Tổng thời gian ước tính (với trung vị 20–30 s/lượt + `--gian 1500` ms): **~3,5–5,5 giờ**.
  - Có thể tách riêng từng bộ (`--chi-bo s7`, `--chi-bo van30`, `--chi-bo van52`) để chủ động thời gian.

### Bước D — Chạy thêm bộ v3 QT gắn nhãn (`--bo`) hoặc so sánh `ba-buoc`

```bash
# Đo riêng bộ v3 đặt tại /tmp/bo-4so-v3.jsonl
docker exec -i hs-code-api node scripts/do-do-thi-gd3.mjs \
  --llm that \
  --chi-bo bo \
  --bo /tmp/bo-4so-v3.jsonl \
  --json /tmp/gd3-v3.json \
  --ghi-bao-cao /tmp/gd3-v3.md \
  --che-pII

# (Tuỳ chọn) Đo thêm luồng 3 bước lib/do-thi/ba-buoc.js song song với `goi`:
#   --phuong-an ca-hai
```

---

## 4. Cách đọc kết quả theo điều kiện nhận GĐ3

Mở `/tmp/gd3-full.md` (hoặc mục `danhGiaTieuChiGd3` trong `/tmp/gd3-full.json`). Chỉ nhận GĐ3 khi **cả 4 điều kiện** đều đạt trên máy chủ thật với `--llm that`:

| # | Thước đo | Ngưỡng nhận GĐ3 | Ý nghĩa khi không đạt |
|---|---|---|---|
| 1 | **S-7 300 ca — Đúng nhóm 4 số** | **BẬT > TẮT** (hơn nền) | Kiểm tra mục `Bị loại ở L1 (rủi ro 1)`: nếu tỉ lệ này cao, AI lượt 1 đang loại mất nhóm đúng mà `timTruoc` đã tìm thấy |
| 2 | **Van 5/2 (5 lượt) — Ổn định** | **5/5 lượt đúng nhóm `8481`** | Còn dao động sang `8412` / `848180` → kiểm tra gói phân biệt `8412-8481` và xem lượt 1 có giữ `8481` không |
| 3 | **Thời gian — Trung vị** | **≤ 45 s** | Chậm quá trần: kiểm tra `chuoiMoHinh.daDung`, `luotAi.trungBinh` (có bị vòng sửa lặp lại không) |
| 4 | **Thời gian — p95** | **≤ 80 s** | Rủi ro chạm trần cắt **85 s** của động cơ / Cloudflare (~95–100 s) khiến khách nhận lỗi |

### Các chỉ số chẩn đoán kèm theo
- **Bị loại ở L1 (rủi ro 1 mục 9):** `số ca có nhóm đúng trong ứng viên trước L1 nhưng không còn sau L1 / số ca có nhóm đúng trong ứng viên trước L1`. Cần giữ thấp; nếu cao, xem lại vì sao lượt 1 loại nhóm đúng hoặc mất khỏi trần 3 nhóm của `nhomConSong`.
- **Ký tự gói AI nhận:**
  - Lượt 1 (`V1` / khối tìm trước): đối chiếu ngưỡng thiết kế **~1.300 ký tự** (`timTruoc.khoi ≤ 1.500`, `luotMot ≤ 1.300`).
  - Gói phân biệt (`goiPhanBiet`): đối chiếu ngưỡng **6–7 nghìn ký tự** (trần cứng `7.000`).
- **Số lượt AI/ca (`luotAi.trungBinh`):** mục tiêu ≤ 2,2 lượt/ca ở chế độ chuẩn; tăng vọt (> 2,5) là dấu hiệu AI bị `gates()` chặn và phải gọi thêm vòng sửa.

---

## 5. Xử lý sau đo

- **Đạt cả 4 điều kiện trên máy chủ thật:** mới xem xét giữ/bật `HS_TIM_TRUOC=goi` (theo quy trình L1 và báo cáo kèm `gitSha`, `chuoiMoHinh`, số lượt mẫu, ngày đo).
- **Chưa đạt bất kỳ điều kiện nào:** giữ `HS_TIM_TRUOC` ở trạng thái **TẮT** trên máy chủ thật; gửi lại bảng Markdown + số lỗi/nguyên nhân (nhóm bị loại ở L1, p95, provider timeout) để sửa trước khi bật lại.
- **Dọn tệp tạm:** giữ tệp kết quả ở `/tmp/`, không đưa vào kho mã nguồn.
