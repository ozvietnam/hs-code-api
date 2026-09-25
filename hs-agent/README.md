# hs-agent — harness agent tự hành trên `vps-hsagent`

Thiết kế: [`docs/vps-agent-tu-hanh.md`](../docs/vps-agent-tu-hanh.md) §2. Tệp này là
hướng dẫn vận hành. Chỉ dùng Node ≥ 22, không có dependency ngoài.

## Nguyên tắc (không đổi được bằng cấu hình)

- Agent **không ghi `main`**: `lib/workspace.mjs` chỉ push `refs/heads/agent/<job>/<ngày>`, tên khác bị từ chối ngay trong code. Branch protection trên GitHub là lớp chặn thứ hai.
- Agent **chỉ commit tệp khớp `writeAllow`** trong `config/jobs.json`. Script nào sửa tệp đã theo dõi ngoài vùng → hủy ship.
- **Cửa kiểm chạy trước PR**; cửa chặn đỏ thì không có PR.
- Bản ghi tiền lệ phải qua **kiểm tất định** (`lib/extract.mjs`): mã HS xuất hiện nguyên văn trong toàn văn, ≥ 60 % từ mô tả có trong toàn văn, số hiệu/ngày lấy từ tiêu đề nguồn, qua lọc riêng tư của repo.
- **Ngân sách cứng** mỗi lần chạy (`config/jobs.json`) và mỗi provider mỗi ngày (`config/providers.json`).
- **Công tắc tắt**: `touch /srv/hs-agent/STOP` → mọi job bỏ qua. Gỡ tệp để chạy lại.

## Job

| Job | Lịch (giờ VN) | LLM | Việc |
|---|---|---|---|
| `legal-watch` (J1) | 06:30 hằng ngày | không | Quét 5 thư mục vbpl.ts24 (mới nhất trước). Công văn phân loại chưa có trong kho → hàng đợi. Quyết định phòng vệ thương mại → rút mã HS bị áp. Thông tư/nghị định về danh mục, thuế, hải quan → báo cáo. |
| `precedent-extract` (J2) | 07:00 hằng ngày | có | Lấy ≤ 15 văn bản trong hàng đợi, LLM trích, kiểm tất định, ghi `data/community/tb-tchq/agent-vbpl-<ngày>.json`, chạy 8 cửa kiểm, mở PR nhãn `agent`. Chưa có khóa LLM → dừng êm, báo "chờ khóa". |
| `bench-night` (J3) | 02:00 hằng đêm | không | `npm test` + `bench-delta --full` trên `main`; mức nào giảm > 0,5 điểm so với trung vị 7 lần trước → Telegram ngay. |
| `freshness` (J5) | 07:30 thứ Hai | không | `scripts/check-freshness.mjs`. |
| `digest` | 08:00 hằng ngày | không | Tóm tắt 24 giờ: job, hàng đợi, PR agent đang chờ, token theo provider. Gửi Telegram nếu có khóa, luôn ghi tệp. Dọn log > 90 ngày. |
| `watchdog` (quản đốc) | mỗi giờ, phút 17 | không | Đọc sổ của chính harness: job im quá hạn (critical, báo cả giờ yên), job kẹt cùng trạng thái ≥ 36 giờ, hàng đợi cũ, thiếu khóa/kênh. Ghi `reports/can-nguoi.md` (việc · ai phải làm · bằng chứng); Telegram chỉ khi vấn đề MỚI hoặc sau 24 giờ (sổ đã-báo). Xem `TO-CHUC.md`. |

## Cài trên VPS

```bash
ssh -p 2202 oz@192.168.1.211
sudo -u hsagent git -C /srv/hs-code-api pull --ff-only
sudo bash /srv/hs-code-api/hs-agent/scripts/install.sh           # cài unit, chưa bật lịch
sudo systemctl start hs-agent@legal-watch.service                 # chạy tay thử
journalctl -u hs-agent@legal-watch -n 60 --no-pager
sudo bash /srv/hs-code-api/hs-agent/scripts/install.sh --enable  # bật 6 timer (kể cả quản đốc)
bash /srv/hs-code-api/hs-agent/scripts/selfcheck.sh               # checklist §1.4
```

Chạy tay một job bằng user agent (dry-run: không push, không PR, không Telegram):

```bash
sudo -u hsagent bash -c 'set -a; . /etc/hs-agent/env 2>/dev/null; set +a; cd /srv/hs-code-api && node hs-agent/run.mjs legal-watch --dry-run'
```

(`/etc/hs-agent/env` là `600 root:hsagent`, hsagent không tự đọc được; systemd đọc hộ qua `EnvironmentFile=`. Chạy tay có khóa thì dùng `sudo systemctl start hs-agent@<job>`.)

## Khóa trong `/etc/hs-agent/env`

| Biến | Cần cho |
|---|---|
| `GITHUB_TOKEN` | J2 mở PR, digest đếm PR agent |
| Deploy key SSH của hsagent (không phải biến) | J2 push nhánh `agent/*` |
| Ít nhất một: `HERMES_API_KEY`+`HERMES_BASE_URL`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `MINIMAX_API_KEY` | J2 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | digest và cảnh báo |
| `HS_API_TOKEN` | (dự phòng) job gọi API prod |

Model và trần mỗi provider sửa trong `config/providers.json` qua PR; có thể ghi đè model bằng biến `*_MODEL`.

## Thư mục trên VPS

```
/srv/hs-agent/state/     queue.json (hàng đợi J2) · vbpl-seen.json · ledger.json (token/ngày) · runs.json (500 lần chạy gần nhất) · bench.json
/srv/hs-agent/logs/<job>/<ngày>.log
/srv/hs-agent/reports/   legal-watch/ · bench/ · digest/   (báo cáo ngày, không vào git)
/srv/hs-agent/work/<job> worktree của lần chạy gần nhất (giữ lại khi cửa kiểm đỏ để xem)
/srv/hs-raw/<domain>/    HTML thô đã tải (cache 30 ngày cho trang văn bản)
```

## Thêm job mới

1. Viết `jobs/<tên>.mjs` export `default async ({ cfg, log, budget, dryRun }) => ({ status, lines })`.
2. Khai ngân sách + `writeAllow` trong `config/jobs.json`, đăng ký trong `JOBS` của `run.mjs`.
3. Thêm `systemd/hs-agent-<tên>.timer` và tên job vào `JOBS` trong `scripts/install.sh`.
4. Test offline trong `test/harness.test.mjs` (không mạng, không ghi `data/`).

Giai đoạn 2 (cần Hermes, theo §2.5): dựng mục mâu thuẫn từ tiền lệ mới, soạn nháp bảng quyết định qua cửa nghiệm thu tờ khai Oz, xử lý cảnh báo audit, học từ log truy vấn prod.
