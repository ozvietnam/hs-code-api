# Giao việc: dựng sổ tay chú giải — bước 1 (chạy trên .120)

> **✅ Xong 07/10/2026.** Không vào được .120 (khoá SSH không có quyền) nên phiên quản lý tự làm bằng 10 agent
> con, không gọi AI ngoài. 60 nhóm (30 nhóm có bảng quyết định + 30 nhóm hay nhầm nhất theo `conflicts.json`,
> vì kết quả bench ở `/tmp/egcb/out` không truy cập được), **2.237/2.274 mục đạt (98,4 %)**. Bài học và gói
> giao các nhóm còn lại: [`so-tay-giao-ngoai.md`](so-tay-giao-ngoai.md). Phần dưới giữ để chạy lại bằng AI
> trên .120 khi cần.

- **Giao:** 2026-10-07. Người duyệt và gộp: Claude (phiên quản lý). Thiết kế: [`docs/backlog/08-so-tay-chu-giai.md`](../backlog/08-so-tay-chu-giai.md).
- **Ai chạy:** Hermes / agent trên máy .120, vì cần khoá AI (MiniMax/Gemini) và kết quả bench ở `/tmp/egcb/out/`.
- **Đầu vào đã sẵn sàng trên `main`:**
  - toàn văn chú giải HS 2022 (#163);
  - SEN 2022 theo mã 8 số (`data/sen-2022.json`);
  - bộ kiểm nguồn (`lib/so-tay.js`);
  - script dựng (`scripts/build-so-tay.mjs`).

## Lệnh

```bash
cd /opt/hs-code-api            # hoặc thư mục repo trên .120
git pull origin main
set -a; . /opt/hs-code-api/hs.env; set +a   # khoá AI — KHÔNG in ra màn hình, KHÔNG commit

# 0. Chạy khô 1 nhóm: xem prompt, không gọi AI
node scripts/build-so-tay.mjs --nhom=8509 --dry

# 1. Dựng thử 3 nhóm, xem kết quả
node scripts/build-so-tay.mjs --nhom=8509,8516,3926
cat data/so-tay/_bao-cao.json | head -40
npm run so-tay:check            # phải xanh

# 2. ~60 nhóm của bộ đo (truth/top/top3 trong kết quả bench đã lưu)
node scripts/build-so-tay.mjs --bench='/tmp/egcb/out/v5-*.json' --concurrency=2
npm run so-tay:check
npm test
```

## Máy kiểm gì (`lib/so-tay.js`)

Mỗi mục AI đề xuất phải có `nguon` và `trich`, trong đó `trich` là câu nguyên văn. Mục bị loại nếu rơi vào một trong các trường hợp sau, và lý do được ghi vào `data/so-tay/_bao-cao.json`:

- câu trích không có nguyên văn trong nguồn đã nêu;
- `loaiTru`: nhóm đích không có thật, hoặc không được nêu trong câu trích (vd "(nhóm 84.14)");
- `dieuKienVao` có ngưỡng số mà số đó không có trong câu trích;
- `dong8`: mã không thuộc nhóm hoặc không có trong biểu thuế.

## Nghiệm thu bước 1

- `_bao-cao.json`: `tyLeDat` ≥ 95 %, không có nhóm nào trong `nhomLoi`.
- `npm run so-tay:check` và `npm test` xanh.
- Mở **một PR** gồm `data/so-tay/*.json` và `_bao-cao.json`. Trong PR ghi rõ: số nhóm, tỷ lệ đạt, chi phí ước tính, nhà cung cấp/mô hình đã dùng, và 3 mục mẫu để CEO chấm "giống sổ tay của tôi".
- **Không** sửa tay câu trích cho đạt. Mục bị loại thì để bị loại; cần thì dựng lại nhóm đó với `--nhom=<n> --force`.

## Sau bước 1

- **Bước 2:** chạy khô các cổng trên 113 kết quả đã lưu, không gọi AI.
- **Bước 3:** nối vào `lib/engine-loop.js`.

Cả hai bước làm theo `docs/backlog/08-so-tay-chu-giai.md`.
