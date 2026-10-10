# data/wco-op — kho RIÊNG TƯ của Tuyển tập ý kiến phân loại WCO (#196)

**Không commit bất cứ thứ gì ở đây ngoài tệp README này** (`.gitignore` chặn). Repo công khai theo CC BY-SA, còn
nội dung WCO có bản quyền; Oz dùng bản mua lại, chỉ để nội bộ.

Tệp PDF ~136 MB cũng vượt giới hạn 100 MB của GitHub, nên không đẩy qua git được. Chép thẳng lên server
(`scp`/`rclone`) vào thư mục này.

| Tệp | Do ai sinh | Có chữ WCO? |
|---|---|---|
| `WCO Compendium 2022.pdf` (tên tuỳ ý) | đặt tay | có — nguồn gốc |
| `pages-en.jsonl` | `scripts/wco-op-extract.py` | có — chỉ phần tiếng Anh |
| `extract-report.json` | `scripts/wco-op-extract.py` | **không** — chỉ số liệu, dán gửi nhờ chỉnh được |
| `opinions.json` | `scripts/wco-op-parse.mjs` | có — mỗi ý kiến một mục |
| `parse-report.json` | `scripts/wco-op-parse.mjs` | **không** — chỉ mã + số liệu |

Quy trình và cách đọc báo cáo: `docs/giao-viec/wco-op.md`.
