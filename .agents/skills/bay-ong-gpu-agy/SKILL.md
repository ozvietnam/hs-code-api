---
name: bay-ong-gpu-agy
description: >-
  Quy trình tổ chức bầy ong của gpu-agy (trạm GPU Windows RTX PRO 5000 / Node 22)
  trên kho ozvietnam/hs-code-api: phân quyền 5 vai chú ong, khoá chương và git
  worktree cô lập chống chồng tệp, gom PR với trần tối đa 5 PR mở, ưu tiên
  tra-tho, và checklist bàn giao chuẩn.
---

# Skill `bay-ong-gpu-agy` — Tổ Chức Bầy Ong `gpu-agy` (Windows GPU)

## 1. Mục đích, Hạ tầng & Giới hạn An toàn Cứng

Chuẩn hoá cách vận hành bầy ong song song của `gpu-agy` trên trạm GPU Windows (`RTX PRO 5000`, Node 22) cho kho `ozvietnam/hs-code-api` (GitHub là nguồn chân lý duy nhất), bảo đảm tách tệp tuyệt đối, kiểm chứng chéo theo nguyên tắc **Người viết ≠ Người chấm**, và không gây nghẽn hàng đợi soát PR của QT.

- **Môi trường vận hành:** Trạm Windows GPU `RTX PRO 5000`, Node 22, dùng `cmd /c` khi xuất log cổng kiểm để giữ mã hoá UTF-8 sạch cho `scripts/dem-ca-test.mjs` (tránh chuyển hướng PowerShell tạo UTF-16LE làm đếm `0` ca).
- **Vùng cấm tuyệt đối:** Cấm chạm `mong/*`, `api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`, `data/ho-so/ranh-gioi/`, `data/lop-kho.json`, `scripts/` (khi làm thẻ dữ liệu), và tuyệt đối không đọc/ghi/commit dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`, `.keys`).
- **Kỷ luật gộp nhánh:** Tuyệt đối cấm tự chạy `gh pr merge` hoặc push thẳng lên `main`; mọi thay đổi chỉ đẩy lên nhánh làm việc riêng và chờ QT/CEO duyệt khi CI xanh trên `head_sha` cuối.
- **Kỷ luật chạy test cục bộ:** Không chạy full `npm test` (26 phút) cục bộ; chỉ chạy bộ cổng mục tiêu + `scripts/dem-ca-test.mjs` cục bộ, còn kết quả toàn bộ suite lấy từ CI GitHub Actions (`test-all.yml`).

---

## 2. Cơ Cấu 5 Vai Chú Ong (Tối đa ~20 Ong Song Song Theo Lô Chương)

Mỗi lô chương vận hành tối đa khoảng **20 chú ong song song** (chia theo từng chương độc lập, mỗi chương giữ đủ chuỗi khảo sát → soạn → phản biện → kiểm toán), phân quyền rạch ròi giữa 5 vai:

| STT | Vai chú ong | Quyền | Nhiệm vụ & Giới hạn cứng |
|---|---|---|---|
| 1 | **`Ong Tư Lệnh`** (Coordinator) | Điều phối (không sửa dữ liệu chương song song với ong thợ) | Đọc hộp việc / watchdog, khóa chương, cấp phát git worktree cô lập, theo dõi trần **tối đa 5 PR mở cùng lúc**, ưu tiên sửa `tra-tho` trước mọi việc mới, và tổng hợp báo cáo bàn giao. |
| 2 | **`Ong Quét Luật`** | Chỉ-đọc (Read-only) | Quét đủ 3 tầng nguồn (`phan`, `chuong`, `bieu`, `nhom`, `phan-nhom`, `sen`), đối chiếu chỉ-đọc `data/ho-so/ranh-gioi/<ch>*.json`, chụp số liệu nền trước khi sửa và đếm số `daiLuong` đang chứa mã HS. |
| 3 | **`Ong Soạn Ngưỡng`** | Ghi (khóa cứng 1 chương / 1 worktree) | Dựng script tạo/chuẩn hoá bản ghi tất định từ `origin/main`, áp dụng Phễu 5 Chặn & Luật 1–8 (`ho-so-nguong`), bảo đảm `0` mã HS trong `daiLuong`, cập nhật báo cáo đối soát `docs/mong/the/M-74-nguong-<ch>.md`. |
| 4 | **`Ong Phản Biện De Morgan`** | Chỉ-đọc (Read-only) | Săn phản ví dụ phá khoảng số đảo sai trên `"Loại khác"` (Luật 2), bắt cứng bằng regex mọi mã HS trong `daiLuong` (Luật 3), bắt mô tả thông thường (`thường…`, `khoảng…`, `xấp xỉ…`) theo Luật 6/8, kiểm Luật 4 & Luật 7, và kiểm `0` trùng `id` toàn kho `data/ho-so-ma/`. |
| 5 | **`Ong Kiểm Toán Độc Lập`** (`oz-pr-auditor`) | Chỉ-đọc (Người viết ≠ Người chấm) | Chạy độc lập bộ cổng kiểm, xác minh `node scripts/dem-ca-test.mjs <log>` (`ca đỏ 0`, `EXIT=0` trên log UTF-8 sạch xuất bằng `cmd /c`), xác minh `node scripts/kiem-pham-vi-the.mjs`, rà `git diff`, và cấp phán quyết `ĐẠT` trước khi push. |

---

## 3. Khoá Chương, Git Worktree Cô Lập & Chống Chồng Tệp

1. **Một chương — một worktree — một nhánh:**
   - Trước khi tách, chạy `git fetch origin main` mà không làm thay đổi nhánh gốc hay chạm worktree khác.
   - Thẻ M-74 mỗi chương dùng đúng 1 worktree cô lập `C:\dev\hs-code-api-wt\m-74-c<ch>` trên nhánh `gpu-agy/m-74-c<ch>` tách sạch từ `origin/main`.
   - PR cập nhật skill/rule dùng worktree riêng (ví dụ `C:\dev\hs-code-api-wt\docs-skills-<slug>`) trên nhánh `gpu-agy/docs-skills-<slug>` tách sạch từ `origin/main`.
2. **Sở hữu tệp rời nhau (chống chồng tệp):**
   - Tuyệt đối không để 2 chú ong cùng ghi vào 1 tệp hoặc dùng chung 1 worktree ghi.
   - `Ong Tư Lệnh` không tự sửa tệp dữ liệu chương song song với `Ong Soạn Ngưỡng`.
   - Với M-74, `Ong Soạn Ngưỡng` chỉ được sửa đúng **2 tệp cứng**: `data/ho-so-ma/nguong/<ch>.jsonl` và `docs/mong/the/M-74-nguong-<ch>.md`.
3. **Ranh giới vùng cấm không ngoại lệ:**
   - Cấm chạm `mong/*`, `api/`, `lib/`, `data/ho-so/ranh-gioi/`, và cấm đụng bất kỳ dữ liệu riêng tư nào (`data/oz-export/*`, `oz-gold*`, `.env`, `.keys`).

---

## 4. Gom PR, Giới Hạn PR Mở & Ưu Tiên `tra-tho`

- **Mỗi chương = đúng 1 PR:** Tiêu đề `[M-74] Rà ngược ngưỡng số — Chương <ch>`, phạm vi đúng 2 tệp cứng; không gộp nhiều chương vào cùng 1 PR.
- **Skill / Rule = PR riêng:** Tiêu đề `docs(skills): ...` hoặc `chore(agents): ...`, tuyệt đối **không gắn `[M-xx]`** vào tiêu đề PR hạ tầng/skill.
- **Trần tối đa 5 PR mở đồng thời:** `Ong Tư Lệnh` phải kiểm số PR đang mở trước mỗi lần mở PR mới; nếu đã chạm mốc `5` PR mở thì dừng mở thêm cho tới khi có PR được duyệt gộp hoặc đóng.
- **Ưu tiên tuyệt đối `tra-tho`:** Nếu tồn tại bất kỳ PR nào gắn nhãn `tra-tho` hoặc có nhận xét yêu cầu sửa của QT:
  1. Dừng ngay việc mở PR chương mới.
  2. Quay lại đúng nhánh `gpu-agy/...` của PR bị trả, vá dứt điểm bằng **commit nối tiếp** (tuyệt đối không force-push).
  3. Chạy lại trọn bộ cổng kiểm + `Ong Kiểm Toán Độc Lập` (`ĐẠT`) rồi đẩy commit và báo `CẬP NHẬT`.
- **Cấm tự gộp:** Tuyệt đối cấm tự chạy `gh pr merge` hoặc push thẳng lên `main`.

---

## 5. Lộ Trình Bậc Thang & Lệnh Cổng Kiểm Chuẩn Trên Windows

### Lộ trình 5 bậc cho mỗi đơn vị việc
1. **Bậc 1 — Khóa & Khảo sát (`Ong Tư Lệnh` + `Ong Quét Luật`):** Kiểm `0` PR `tra-tho` tồn đọng và số PR mở `< 5` → khóa chương & tạo worktree `C:\dev\hs-code-api-wt\m-74-c<ch>` → quét 3 tầng nguồn + `ranh-gioi` + chụp số liệu nền & đếm `daiLuong` chứa mã HS.
2. **Bậc 2 — Soạn Tất Định (`Ong Soạn Ngưỡng`):** Chạy quy trình Phễu 5 Chặn & Luật 1–8 (`ho-so-nguong`), xử lý sạch `0` mã HS trong `daiLuong`, cập nhật `docs/mong/the/M-74-nguong-<ch>.md`.
3. **Bậc 3 — Phản Biện (`Ong Phản Biện De Morgan`):** Kiểm phản ví dụ De Morgan trên mọi `"Loại khác"`, quét regex mã HS trong `daiLuong`, rà mô tả thường (`thường…`, `khoảng…`, `xấp xỉ…`), rà Luật 4/7 và `0` trùng `id` toàn kho.
4. **Bậc 4 — Kiểm Toán Độc Lập (`Ong Kiểm Toán Độc Lập` / `oz-pr-auditor`):** Chạy độc lập cổng kiểm qua `cmd /c` ra log UTF-8 sạch, kiểm `dem-ca-test.mjs` (`ca đỏ 0`, `EXIT=0`) và `kiem-pham-vi-the.mjs`, cấp phán quyết `ĐẠT`.
5. **Bậc 5 — Bàn Giao (`Ong Tư Lệnh`):** Đẩy nhánh `gpu-agy/...`, mở đúng 1 PR kèm đủ số liệu checklist Mục 6, theo dõi CI `test-all.yml` và phản hồi QT.

### Lệnh cổng kiểm UTF-8 sạch trên Windows (`cmd /c`)
```powershell
# 1) Thẻ M-74 theo chương
$ch = "<ch>"
$log = "$env:TEMP\m74-c$ch.log"
cmd /c "(node scripts/ho-so-ma/cong.mjs --pham-vi chuong:$ch --cong 4,5 && node scripts/ho-so-ma/nguong-rut.mjs --chuong $ch --kiem && node scripts/ho-so-ma/nguong-test.mjs && node scripts/test-ho-so-ma.mjs && node scripts/test-ho-so-ma-tra.mjs && node scripts/test-lop-kho.mjs) > `"$log`" 2>&1"
$rc = $LASTEXITCODE
[System.IO.File]::AppendAllText($log, "`nEXIT=$rc`n", [System.Text.UTF8Encoding]::new($false))
node scripts/dem-ca-test.mjs $log
git diff --name-only origin/main...HEAD | node scripts/kiem-pham-vi-the.mjs "[M-74] Rà ngược ngưỡng số — Chương $ch" "gpu-agy/m-74-c$ch"

# 2) PR cập nhật skill / rule
$skillLog = "$env:TEMP\quan-ly-skill.log"
cmd /c "(node scripts/quan-ly-skill.mjs --kiem && node scripts/test-quan-ly-skill.mjs) > `"$skillLog`" 2>&1"
$rc = $LASTEXITCODE
[System.IO.File]::AppendAllText($skillLog, "`nEXIT=$rc`n", [System.Text.UTF8Encoding]::new($false))
node scripts/dem-ca-test.mjs $skillLog
```

---

## 6. Checklist Bàn Giao PR Bắt Buộc

Trước khi `git push` hoặc nộp báo cáo PR, bắt buộc đối chiếu đủ 6 hạng mục sau:

- [ ] **Số liệu biến động bản ghi:** Ghi rõ số bản ghi **thêm / sửa / bỏ** so với `origin/main` và cơ cấu tổng (`NGUONG`, `DINH_NGHIA`, `TACH_ANH_EM`, `BO_QUA`, `phuDinh`).
- [ ] **Sạch mã `daiLuong`:** Số bản ghi chứa mã dòng/nhóm HS trong `daiLuong` = **`0`** (đã rà toàn bộ bản ghi cũ lẫn mới).
- [ ] **Phủ dải anh em:** Báo rõ số **cụm anh em**, số cụm **phủ kín**, số cụm **chồng** (`0`), số cụm **hở** (`0`).
- [ ] **Bằng chứng cổng kiểm thật:** Đính kết quả chạy thật của `nguong-test.mjs` (hoặc `quan-ly-skill.mjs --kiem` + `test-quan-ly-skill.mjs`), `dem-ca-test.mjs` (`ca đỏ 0`, `EXIT=0` từ log UTF-8 sạch) và `kiem-pham-vi-the.mjs` (`PASS`).
- [ ] **Phạm vi tệp & An toàn:** `git diff --name-only origin/main...HEAD` khớp đúng phạm vi cho phép; `0` thay đổi vùng cấm và không đụng dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`, `.keys`).
- [ ] **Kiểm toán độc lập & Trần PR:** `oz-pr-auditor` đã xác nhận **`ĐẠT`**, tổng số PR mở hiện tại `<= 5`, `0` PR `tra-tho` chưa vá, và tuyệt đối không tự chạy `gh pr merge` hay đẩy thẳng `main`.
