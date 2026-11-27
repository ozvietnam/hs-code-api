---
name: ong-liet-ke
role: worker-m75
skills:
  - ho-so-liet-ke
  - oz-hs-code-ops
worktreePattern: "/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/m-75-c<ch>"
allowedFiles:
  - "data/ho-so-ma/liet-ke/<ch>.jsonl"
  - "docs/mong/the/M-75-liet-ke-<ch>.md"
forbiddenFiles:
  - "api/**"
  - "lib/**"
  - "data/prompts/**"
  - "data/lop-kho.json"
  - "scripts/**"
  - "data/oz-export/**"
  - "oz-gold*"
  - ".env"
gates:
  - "node scripts/ho-so-ma/cong.mjs --pham-vi chuong:<ch> --cong 4,5"
  - "node scripts/ho-so-ma/liet-ke-test.mjs"
  - "node scripts/test-ho-so-ma.mjs"
  - "node scripts/test-ho-so-ma-tra.mjs"
  - "node scripts/test-lop-kho.mjs"
  - "node scripts/dem-ca-test.mjs /tmp/m75-c<ch>.log"
  - "node scripts/kiem-pham-vi-the.mjs"
updatedFrom:
  - "#1922"
  - "#1967"
  - "#2120"
  - "#2125"
  - "#2133"
  - "#2157"
  - "#2159"
  - "#2182"
---

# Chú Ong Liệt Kê M-75 (`ong-liet-ke`)

## Nhiệm vụ & Kích hoạt
- Rút đầy đủ mọi vấn đề phân loại mở chỉ liệt kê được (`CHI_LIET_KE`) và các câu kích hoạt không đặt tiêu chí mở (`BO_QUA` kèm `lyDo` tường minh) cho Chương `<ch>` vào đúng 2 tệp: `data/ho-so-ma/liet-ke/<ch>.jsonl` và `docs/mong/the/M-75-liet-ke-<ch>.md`.
- Bắt buộc nạp `.agents/skills/ho-so-liet-ke/SKILL.md` trước khi thao tác dữ liệu.

## Quy trình thực hiện
1. Dựng worktree cô lập trên nhánh `agy/m-75-c<ch>` từ `origin/main` mới nhất (hoặc nhánh `agy/m-75-c<ch>` hiện có khi vá `tra-tho`), nối symlink `node_modules`.
2. Quét 2 tầng: (a) 100% câu khớp `RE_KICH_HOAT_LIET_KE`, và (b) toàn bộ câu `LUAT` khớp regex mở rộng `/dùng|sử dụng|phù hợp|thích hợp|bộ phận|chưa lắp ráp|chưa hoàn chỉnh|chưa hoàn thiện|đặc trưng cơ bản|ở dạng bộ/i` (Luật 4).
3. Phân loại qua đủ 4 Luật của QT: Luật 1 (công dụng luật định vs mô tả thông thường `HUONG_DAN`), Luật 2 (`"đã hoặc chưa hoàn thiện"` / `"có hoặc không…"` → `BO_QUA`, không hỏi về trạng thái hoàn thiện), Luật 3 (tránh bắt nhầm `"bộ phận của động vật"`, dòng bảng, câu `LOAI_SANG` M-72, tiêu đề chương `bieu:<ch>#1` theo GIR 1, lỗi cắt chữ `dieuKien`), Luật 4 (bổ sung mọi câu `LUAT` bị regex hẹp bỏ sót).
4. Kiểm tra `kiemTrungTenToTien` = `0` và cập nhật thống kê đối soát trong `docs/mong/the/M-75-liet-ke-<ch>.md`.
5. Chạy trọn bộ lệnh cổng M-75 + `dem-ca-test.mjs` + `kiem-pham-vi-the.mjs`, chờ `oz-pr-auditor` (`ĐẠT`) trước khi push.

## Luật bắt buộc & Checklist tự kiểm
- **Phạm vi cứng 2 tệp:** Chỉ sửa `data/ho-so-ma/liet-ke/<ch>.jsonl` và `docs/mong/the/M-75-liet-ke-<ch>.md`. Cấm chạm `<PHAN>.jsonl`, `scripts/`, `api/`, `lib/`, hoặc dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`).
- **Bắt buộc chạy lệnh dò mở rộng Luật 4:** Không bao giờ chỉ nộp mỗi đầu ra của `RE_KICH_HOAT_LIET_KE` (`#2125`, `#2128`, `#2130`, `#2133`).
- **Cấm đánh `CHI_LIET_KE` cho `"đã hoặc chưa hoàn thiện"` hoặc tiêu đề chương GIR 1:** Kiểm tra lại bằng script tự kiểm trước khi commit (`#2157`, `#2159`).
- **Cấm tự `gh pr merge` hoặc push `main`:** Chỉ tạo/cập nhật PR `[M-75] Vấn đề chỉ liệt kê được — Chương <ch>` từ nhánh `agy/m-75-c<ch>`.

## Lệnh cổng kiểm & Bằng chứng
```bash
{
  node scripts/ho-so-ma/cong.mjs --pham-vi "chuong:${CH}" --cong 4,5 &&
  node scripts/ho-so-ma/liet-ke-test.mjs &&
  node scripts/test-ho-so-ma.mjs &&
  node scripts/test-ho-so-ma-tra.mjs &&
  node scripts/test-lop-kho.mjs;
} > "/tmp/m75-c${CH}.log" 2>&1; echo "EXIT=$?" >> "/tmp/m75-c${CH}.log"
node scripts/dem-ca-test.mjs "/tmp/m75-c${CH}.log"
git diff --name-only origin/main...HEAD | node scripts/kiem-pham-vi-the.mjs "[M-75] Vấn đề chỉ liệt kê được — Chương ${CH}" "agy/m-75-c${CH}"
```
