# Yêu cầu: runbook đo A3 (classify) + checklist QT Gemini/MiniMax/health SHA — gửi: quản trị server — từ: DA-HS (hs-code-api)

**Mục đích.** Sau thực địa GĐ (~01:33 VN 17/11): câu FT-S13 `/api/classify` **~57 s** `NEED_FACTS`; `debug.llm.chuoiChinhLoi` cho thấy MiniMax timeout ~30 s, DeepSeek/Hermes/OpenRouter thiếu khoá, Gemini ngắt mạch 402. Early-exit (loa/cốc) vẫn <10 s — ổn. Health `commit` vẫn `null` (OZV-724). File này gom **một checklist QT** + **runbook đo 3 câu** để QT xử lý trên máy chủ triển khai mà không cần đoán lại.

**Điều kiện trước.**
- Không sửa logic runtime từ thẻ này (docs-only).
- Không dán khoá / mật khẩu / mô tả tờ khai khách vào file hay chat.
- Phần tắt Gemini 402 đã có yêu cầu riêng đang mở PR: [`docs/viec/yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md`](yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md) · GitHub [#1415](https://github.com/ozvietnam/hs-code-api/pull/1415). File này **không thay** #1415 — chỉ neo checklist + lệnh đo.

**Tham chiếu đo cũ (đọc thêm, không bắt QT làm lại hết).**
- [`yeu-cau-2026-11-02-do-do-tre-minimax.md`](yeu-cau-2026-11-02-do-do-tre-minimax.md) — trích log p50/p95 + 5 lượt debug khoá dịch vụ.
- Nghiên cứu A3 (14/11): Cloudflare **403** nếu thiếu `User-Agent` trình duyệt-like; mẫu UA đã dùng: `Mozilla/5.0 (compatible; OZ-A3-measure/1.0)`.
- Health SHA: [`docs/deploy-coolify.md`](../deploy-coolify.md) mục «Biết ảnh đang chạy là bản nào (OZV-724)» — máy chủ dùng Dockerfile overlay nên ARG repo có thể không vào ảnh.

---

## Checklist QT (3 mục — đánh dấu tại đây)

### (1) Tắt / gỡ Gemini 402

Làm theo phần A của [`yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md`](yeu-cau-2026-11-16-tat-gemini-402-va-kho-dap-an.md) (PR [#1415](https://github.com/ozvietnam/hs-code-api/pull/1415)):

- [ ] `GEMINI_TRA_PHI_CHOT_CUOI=off` trên env prod.
- [ ] Gỡ / để trống `GEMINI_API_KEY` tới khi khoá mới không còn 402.
- [ ] Nhật ký ~30 phút không còn `[llm] ngắt mạch MỞ: gemini` vì 402.
- [ ] Một lượt `POST /api/suggest` mô tả hàng thường vẫn trả (không phụ thuộc Gemini trả phí).

### (2) Kiểm MiniMax latency / timeout trên máy chủ triển khai

- [ ] Ghi bảng cấu hình (chỉ TÊN biến + giá trị không bí mật; khoá chỉ «có/không»): `MINIMAX_MODEL`, `MINIMAX_FALLBACK_MODEL`, mọi `LLM_TIMEOUT_MS_*`, `LOOP_*_TIMEOUT_MS`, `CLASSIFY_BUDGET_MS`, `GEMINI_TRA_PHI_CHOT_CUOI`, `MINIMAX_API_KEY` (có/không), `GEMINI_API_KEY` (có/không). Đặc biệt nếu `LLM_TIMEOUT_MS_*` < 60000 — ghi rõ (trần cắt MiniMax có suy luận).
- [ ] Trích log container 7 ngày gần nhất cho `POST /api/classify` và `POST /api/describe`: p50 / p95 / max `ms`, số 502/504, số dòng `[llm] ngắt mạch MỞ` (mẫu lệnh ở file 02/11).
- [ ] Chạy **bảng 3 câu đo** dưới đây (public, không khoá dịch vụ cũng được; có `debug: true` nếu gọi bằng khoá nội bộ để đọc `chuoiChinhLoi`). Dán bảng kết quả vào mục «Kết quả».

### (3) Dockerfile ARG / health `commit` (OZV-724)

Prod vẫn trả `commit: null` → mọi phép đo A3 không biết đang đo SHA nào.

- [ ] Xác nhận lệnh build trên máy chủ có `--build-arg SOURCE_COMMIT=$(git rev-parse HEAD)` (và tốt nhất `BUILD_TIME`), **hoặc** `SOURCE_COMMIT` trong `hs.env` nếu overlay Dockerfile không kế thừa ARG repo.
- [ ] Redeploy một lần sau khi sửa build arg.
- [ ] `GET /api/health` → `commit` là SHA ngắn (7–12 hex), khớp commit đang chạy; `buildTime` ISO khác null.

```bash
curl -sS -H 'User-Agent: Mozilla/5.0 (compatible; OZ-A3-measure/1.0)' \
  https://hs-kb.uythacnhapkhau.com/api/health | jq '{commit,buildTime,lyDo}'
```

**Đường lùi (rollback).** Chỉ env / build arg — không đổi mã. Gemini: bật lại khi khoá mới không 402 (xem #1415). Timeout MiniMax: giữ giá trị cũ nếu chưa có số đo mới. Health SHA: bỏ ARG → `commit` về `null` (health vẫn 200).

---

## Runbook đo latency `/api/classify` (3 câu mẫu)

**Luật đo.**
1. Luôn gửi `User-Agent` (thiếu → Cloudflare 403).
2. Ghi `loadavg` trước khi đo (`cat /proc/loadavg` — số đầu > số lõi thì số đo vô nghĩa).
3. Mỗi câu: HTTP code + `time_total` + từ JSON: `status`, `results[0].hs` (nếu có), và nếu có debug: `debug.llm.chuoiChinhLoi` / `engine.ms`.
4. Không dùng mô tả từ tờ khai khách; ba câu dưới là hàng công khai / tự đặt.
5. Cửa sổ Pro/đo ngắn: 1 lượt/câu là đủ cho QT xác nhận; muốn p50 thì lặp 3 lần sau khi ổn Gemini/MiniMax.

### Bảng 3 câu

| id | Mục đích | Mô tả gửi | Kỳ vọng thô (sau khi QT xử lý) |
|---|---|---|---|
| a3-fast | Early-exit / đường nhanh | `loa bluetooth di động pin sạc` | < 10 s (thực địa loa/cốc đã OK) |
| a3-mid | NEED_FACTS / hỏi lại | `máy bơm nước ly tâm gia dụng 1.5HP` | thường < 25 s; nếu ~57 s + `chuoiChinhLoi` MiniMax timeout → vẫn còn kẹt chuỗi AI |
| a3-ft | Câu kiểu FT-S13 (dài hơn, dễ đốt LLM) | `van bi inox 304 nối ren trong DN25 PN16 dùng cho nước` | ghi giây + status; nếu MiniMax timeout 30 s rồi rơi tầng dự phòng → báo QT mục (1)+(2) |

### Lệnh (một lượt / câu)

```bash
mkdir -p /tmp/ozv-1351-a3
UA='Mozilla/5.0 (compatible; OZ-A3-measure/1.0)'
BASE=https://hs-kb.uythacnhapkhau.com

# a3-fast
printf '%s' '{"description":"loa bluetooth di động pin sạc"}' > /tmp/ozv-1351-a3/body-fast.json
curl -sS -m 100 -o /tmp/ozv-1351-a3/resp-fast.json -w 'a3-fast %{http_code} %{time_total}\n' \
  -X POST "$BASE/api/classify" \
  -H 'Content-Type: application/json' -H "User-Agent: $UA" \
  --data-binary @/tmp/ozv-1351-a3/body-fast.json
jq '{status, hs: .results[0].hs, engineMs: .engine.ms, chuoiChinhLoi: .debug.llm.chuoiChinhLoi}' \
  /tmp/ozv-1351-a3/resp-fast.json

# a3-mid
printf '%s' '{"description":"máy bơm nước ly tâm gia dụng 1.5HP"}' > /tmp/ozv-1351-a3/body-mid.json
curl -sS -m 100 -o /tmp/ozv-1351-a3/resp-mid.json -w 'a3-mid %{http_code} %{time_total}\n' \
  -X POST "$BASE/api/classify" \
  -H 'Content-Type: application/json' -H "User-Agent: $UA" \
  --data-binary @/tmp/ozv-1351-a3/body-mid.json
jq '{status, hs: .results[0].hs, engineMs: .engine.ms, chuoiChinhLoi: .debug.llm.chuoiChinhLoi}' \
  /tmp/ozv-1351-a3/resp-mid.json

# a3-ft
printf '%s' '{"description":"van bi inox 304 nối ren trong DN25 PN16 dùng cho nước"}' > /tmp/ozv-1351-a3/body-ft.json
curl -sS -m 100 -o /tmp/ozv-1351-a3/resp-ft.json -w 'a3-ft %{http_code} %{time_total}\n' \
  -X POST "$BASE/api/classify" \
  -H 'Content-Type: application/json' -H "User-Agent: $UA" \
  --data-binary @/tmp/ozv-1351-a3/body-ft.json
jq '{status, hs: .results[0].hs, engineMs: .engine.ms, chuoiChinhLoi: .debug.llm.chuoiChinhLoi}' \
  /tmp/ozv-1351-a3/resp-ft.json
```

Gọi bằng khoá nội bộ (`Authorization: Bearer …`) + `"debug": true` trong body nếu cần đọc `chuoiChinhLoi` / `engine.log` — **không** commit khoá; chỉ dán trường lỗi/ms vào mục Kết quả.

**Đọc kết quả nhanh.**
- `time_total` ~ early-exit (<10 s) + `status` hợp lệ → đường nhanh ổn.
- `time_total` ≳ 45–60 s và `chuoiChinhLoi` chứa MiniMax timeout / Gemini 402 → làm tiếp checklist (1)+(2); đừng chỉnh mã classify từ thẻ docs này.
- Health `commit: null` → checklist (3) chưa xong; số đo A3 phải ghi rõ «SHA chưa biết».

---

## Khi nào

Ngay trong nhịp vận hành tiếp theo (17/11) — ưu tiên mục (1) Gemini 402 (đã có #1415), rồi (3) health SHA, rồi (2) đo 3 câu + log MiniMax.

## Kết quả

_(quản trị server điền)_

| id | http | time_total (s) | status | hs | chuoiChinhLoi / ghi chú |
|---|---|---:|---|---|---|
| a3-fast | | | | | |
| a3-mid | | | | | |
| a3-ft | | | | | |

- Health sau redeploy: `commit=` … · `buildTime=` …
- Cấu hình timeout / Gemini (không khoá): …

Tham chiếu thẻ: [OZV-1351](/OZV/issues/OZV-1351) · PR docs-only kèm theo.
