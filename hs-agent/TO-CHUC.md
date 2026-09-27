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
| **giám đốc máy** | đọc `can-nguoi.md`, tự xử phần máy làm được, chỉ đẩy lên người phần cần người | 08:20 · 13:20 · 20:20 (chỉ gọi LLM khi bản tóm máy đổi) | `reports/giam-doc/<ngày>.md` + bộ nhớ/skill của nó | **Hermes-211** (Hermes Agent, user `hsgd`, dịch vụ `hermes-hsgd`) — chờ khóa 9Router riêng | CEO |

## Tài nguyên chung (mọi job dùng — đổi phải qua PR)

`config/jobs.json` (ngân sách), `config/providers.json` (thứ tự LLM, trần ngày), `/etc/hs-agent/env` (khóa — chỉ quản trị server nạp),
`state/ledger.json` (token theo provider), công tắc `STOP`.

## Luật của quản đốc (vì sao nó tồn tại)

1. **Im lặng là lỗi.** Job quá `expectHours` không chạy → `critical`, báo cả trong giờ yên.
2. **Kẹt là lỗi.** Cùng một trạng thái xấu (`waiting`, `gate-red`, `ship-blocked`, `budget`) ≥ 36 giờ → báo kèm chủ. `stale`, `regression`, `error` báo ngay.
3. **Mỗi vấn đề báo một lần.** Khóa ổn định + sổ đã-báo; nhắc lại sau 24 giờ; hết thì ghi "đã hết". (Ở 201, một cảnh báo không có sổ đã tự lặp 2.534 lần trong 2 giờ.)
4. **Bằng chứng máy, không phải lời "đã chạy".** Mỗi dòng có giờ chạy cuối + trạng thái + lệnh để kiểm.
5. **Giờ yên 23:00–07:00 VN** — trừ `critical`.

## Giám đốc máy — Hermes-211 (nhân bản mô hình giám đốc VPS 201)

- Cài 25/09: Hermes Agent tại `/opt/oz-brain/hermes/hermes-agent`, `HERMES_HOME=/home/hsgd/.hermes`, user riêng `hsgd`
  (nhóm `hsagent` để đọc state/report; sudo CHỈ `systemctl start/status hs-agent@*` và `journalctl -u hs-agent*`).
- Có sẵn: bộ nhớ lâu dài (`memories/MEMORY.md`), tự viết/sửa skill (skill gốc `hs-agent-van-hanh`), tra lại hội thoại cũ.
- Nhịp: cron `HS-GiamDoc-3lan` với monitor-script `hs-gd-canh.sh` — bản tóm máy không đổi thì không gọi LLM; giờ yên 23–07.
- Không có quyền: `/etc/hs-agent/env`, `/srv/hs-private`, sửa/push repo. Approvals deny chặn thêm ở tầng agent.
- Còn thiếu: khóa 9Router riêng (`hsgd`) để nó nghĩ được; bot Telegram để nó nói được với người.
- Trước khi được mở PR dữ liệu của riêng mình: **sát hạch** — trích lại ≥ 30 tiền lệ đã có trong kho (biết đáp án),
  khớp mã HS ≥ 95 %, 0 lỗi lọc riêng tư (§2.10 điểm 5).

### Sát hạch trích lại (kết quả 27/09)

- **Mẫu 1–30 (verify afe26b4):** 26/30 khớp 8 số (87%). Trên n=28 đáp án đủ 8 số → 26/28 = **93%** (chưa đạt ngưỡng ≥95%).
  - **#28, #29:** LLM trả 10 số `2517410000`/`2517490000`; text gốc có `2517.41.00.10`/`2517.49.00.10`. `codeAppears(10-số)` → false vì regex 10 số tách thành 4 phần `2517·41·00·00` nhưng text chỉ có 3 phần tách bằng `.` (`2517·41·00·10`). → **Lỗi logic verify**, không phải LLM sai.
  - **#9:** đáp án kho chỉ 4 số `3919` — lỗi dữ liệu kho.
  - **#5:** error (abort timeout LLM).
- **Mẫu mới (thutucxuatnhapkhau.vn):** 9/9 URL → trả login page (cần đăng nhập); #31 (thuvienxuatnhapkhau.com) → 404.
- **Kho tb-tchq:** 272/312 (87%) nguồn luatvietnam.vn cần login → không sát hạch được từ máy. 31 thuvienxuatnhapkhau.com (công khai). 9 thutucxuatnhapkhau.vn (cần login).
- **Cần dev dữ liệu:** lưu toàn văn vào kho để mở rộng sát hạch.
- **Điều kiện mở PR:** CHƯA ĐẠT (26/28 < 27/28).
