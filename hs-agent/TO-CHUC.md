# Tổ chức của `vps-hsagent` — mỗi luồng một chủ

Theo `docs/vps-agent-tu-hanh.md` §2.10 (bài học từ bãi tập VPS 201): timer và script làm cho máy **chạy**;
chủ thể, sổ, cửa và trường học làm cho máy **bền**. Tệp này trả lời một câu cho từng luồng:
*nếu nó im hoặc kẹt, AI biết, và AI phải làm gì?*

## Vị trí

| Vị trí | Việc | Nhịp | Sổ riêng | Người thực thi | Chủ (ai phải hành động khi kẹt) |
|---|---|---|---|---|---|
| J1 `legal-watch` | quét văn bản mới | 06:30 hằng ngày | `state/vbpl-seen.json`, `queue.json` | code | dev hs-agent |
| J2 `precedent-extract` | trích tiền lệ → PR | 07:00 hằng ngày | `queue.json` (state), PR nhãn `agent` | LLM + kiểm tất định + 8 cửa | dev hs-agent; thiếu khóa → CEO |
| J3 `bench-night` | test + bench đêm | 02:00 | `state/bench.json` | code | dev hs-code-api khi điểm giảm |
| J5 `freshness` | hạn đối chiếu nguồn | thứ Hai 07:30 | — | code | dev dữ liệu khi `[DUE]` |
| `digest` | báo cáo ngày + **việc chờ người** | 08:00 | `reports/digest/` | code | CEO đọc |
| `watchdog` (quản đốc) | bảo hiểm im lặng | mỗi giờ, phút 17 | `state/watchdog.json` (sổ đã-báo), `reports/can-nguoi.md` | code, chỉ đọc | quản trị server khi chính nó im (digest báo) |
| **giám đốc máy** | đọc `can-nguoi.md`, tự xử phần máy làm được, chỉ đẩy lên người phần cần người | 3 lần/ngày | `reports/can-nguoi.md` + nhật ký của nó | **chưa có** — xem dưới | CEO |

## Tài nguyên chung (mọi job dùng — đổi phải qua PR)

`config/jobs.json` (ngân sách), `config/providers.json` (thứ tự LLM, trần ngày), `/etc/hs-agent/env` (khóa — chỉ quản trị server nạp),
`state/ledger.json` (token theo provider), công tắc `STOP`.

## Luật của quản đốc (vì sao nó tồn tại)

1. **Im lặng là lỗi.** Job quá `expectHours` không chạy → `critical`, báo cả trong giờ yên.
2. **Kẹt là lỗi.** Cùng một trạng thái xấu (`waiting`, `gate-red`, `ship-blocked`, `budget`) ≥ 36 giờ → báo kèm chủ. `stale`, `regression`, `error` báo ngay.
3. **Mỗi vấn đề báo một lần.** Khóa ổn định + sổ đã-báo; nhắc lại sau 24 giờ; hết thì ghi "đã hết". (Ở 201, một cảnh báo không có sổ đã tự lặp 2.534 lần trong 2 giờ.)
4. **Bằng chứng máy, không phải lời "đã chạy".** Mỗi dòng có giờ chạy cuối + trạng thái + lệnh để kiểm.
5. **Giờ yên 23:00–07:00 VN** — trừ `critical`.

## Giám đốc máy — chưa dựng, và vì sao

Chưa dựng vì chưa có khóa LLM trên máy này: một giám đốc không có mô hình thì chỉ là thêm một script.
Khi có khóa: dựng một agent (Hermes Agent) chạy dưới user riêng, cron 3 lần/ngày, đầu vào duy nhất là
`reports/can-nguoi.md` + `reports/digest/`, quyền: đọc repo, chạy `run.mjs <job> --dry-run`, mở issue/PR `agent/*`;
không có quyền `/etc/hs-agent/env`, không ghi `main`. Trước khi được mở PR thật, qua **sát hạch**: trích lại
≥ 30 tiền lệ đã có trong kho (biết đáp án), khớp mã HS ≥ 95 %, 0 lỗi lọc riêng tư (§2.10 điểm 5).
