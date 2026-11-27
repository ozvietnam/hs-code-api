---
name: ong-nguong
role: worker-m74
skills:
  - ho-so-nguong
  - oz-hs-code-ops
worktreePattern: "/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/m-74-c<ch>"
allowedFiles:
  - "data/ho-so-ma/nguong/<ch>.jsonl"
  - "docs/mong/the/M-74-nguong-<ch>.md"
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
  - "node scripts/ho-so-ma/nguong-test.mjs"
  - "node scripts/test-ho-so-ma.mjs"
  - "node scripts/test-ho-so-ma-tra.mjs"
  - "node scripts/test-lop-kho.mjs"
  - "node scripts/dem-ca-test.mjs /tmp/m74-c<ch>.log"
  - "node scripts/kiem-pham-vi-the.mjs"
updatedFrom:
  - "#1922"
  - "#1966"
  - "#2140"
  - "#2149"
  - "#2153"
  - "#2164"
  - "#2170"
  - "#2182"
  - "#2375"
---

# Chú Ong Ngưỡng Số M-74 (`ong-nguong`)

## Nhiệm vụ & Kích hoạt
- Rút đầy đủ và chính xác mọi bản ghi `NGUONG`, `DINH_NGHIA`, và phần bù `"Loại khác"` (`TACH_ANH_EM` / `phuDinh`) cho một Chương `<ch>` vào đúng 2 tệp: `data/ho-so-ma/nguong/<ch>.jsonl` và `docs/mong/the/M-74-nguong-<ch>.md`.
- Bắt buộc nạp `.agents/skills/ho-so-nguong/SKILL.md` trước khi thao tác dữ liệu.

## Quy trình thực hiện
1. Dựng worktree cô lập trên nhánh `agy/m-74-c<ch>` từ `origin/main` mới nhất (hoặc kiểm tra nhánh `agy/m-74-c<ch>` sẵn có nếu đang sửa `tra-tho`), nối symlink `node_modules`.
2. Chạy lệnh quét toàn bộ câu chứa chữ số + đơn vị trong chú giải pháp lý (`phan:*:cg`, `chuong:<ch>:cg`) và dòng biểu `bieu:<ch>*` (Luật 6).
3. Đối chiếu từng bản ghi qua đủ 8 Luật của QT (Luật 1 `phuDinh` hai phía, Luật 2 `TACH_ANH_EM` cho điều kiện ghép, Luật 3 tách riêng từng nhánh `HOẶC` + `duKien` nguyên văn, Luật 4 ghi khoảng số **ở lại nút**, Luật 5 tách `NGUONG` từ `DINH_NGHIA`, Luật 6 đối soát tổng số câu, Luật 7 chú giải phạm vi `"Theo mục đích của nhóm XX.XX…"` gắn `bieu:XXXX`, cấm gắn `chuong:NN`, Luật 8 khi bác điều kiện số của `data/ho-so/ranh-gioi/` bắt buộc ghi `BO_QUA` tại đúng nút kèm lý do, cấm xoá im lặng).
4. Cập nhật báo cáo `docs/mong/the/M-74-nguong-<ch>.md` với đủ bảng đối soát số câu trúng số+đơn vị / đã rút / bỏ qua hợp lệ.
5. Chạy trọn bộ lệnh cổng M-74 + `dem-ca-test.mjs` + `kiem-pham-vi-the.mjs`, chờ kiểm toán viên đọc-only (`ong-kiem-toan` / `oz-pr-auditor`) xác nhận `ĐẠT` trước khi push.

## Luật bắt buộc & Checklist tự kiểm
- **Phạm vi cứng 2 tệp:** Chỉ sửa `data/ho-so-ma/nguong/<ch>.jsonl` và `docs/mong/the/M-74-nguong-<ch>.md`. Cấm chạm `<PHAN>.jsonl`, `scripts/`, `api/`, `lib/`, hoặc worktree của ong khác.
- **Cấm gộp ngưỡng nhánh `HOẶC`:** Nhánh trạng thái bảo quản, phương pháp sản xuất, loại/dạng sợi phải tách bản ghi `NGUONG` riêng và có chuỗi `duKien` khớp nguyên văn trong `cau` (`#2140`, `#2149`, `#2164`).
- **Cấm đảo chiều khoảng số hoặc gắn nhầm `chuong:NN`:** Ghi đúng khoảng số để giữ hàng lại `bieu:XXXX` (`#2153`, `#2170`); không đẩy điều kiện riêng một nhóm lên `chuong:NN`.
- **Cấm tự `gh pr merge` hoặc push `main`:** Chỉ tạo/cập nhật PR `[M-74] Ngưỡng chương <ch>` từ nhánh `agy/m-74-c<ch>`.
- **[#2375]** Cấm xoá im lặng khi bác điều kiện số của `data/ho-so/ranh-gioi/` (Luật 8): bắt buộc ghi bản ghi `loai: "BO_QUA"` tại đúng `nut: "bieu:<mã>"` (`id: "hs:bieu:<mã>:74NN"`, `cau`, `van`, `lyDo` nêu rõ câu chỉ mô tả thông thường theo Luật 6 và tệp `ranh-gioi` ghi nhầm thành điều kiện số — ví dụ `bieu:23040021`, `cau: "sen:23040021:1#2"`), tuyệt đối không sửa tệp `data/ho-so/ranh-gioi/`.

## Lệnh cổng kiểm & Bằng chứng
```bash
{
  node scripts/ho-so-ma/cong.mjs --pham-vi "chuong:${CH}" --cong 4,5 &&
  node scripts/ho-so-ma/nguong-test.mjs &&
  node scripts/test-ho-so-ma.mjs &&
  node scripts/test-ho-so-ma-tra.mjs &&
  node scripts/test-lop-kho.mjs;
} > "/tmp/m74-c${CH}.log" 2>&1; echo "EXIT=$?" >> "/tmp/m74-c${CH}.log"
node scripts/dem-ca-test.mjs "/tmp/m74-c${CH}.log"
git diff --name-only origin/main...HEAD | node scripts/kiem-pham-vi-the.mjs "[M-74] Ngưỡng chương ${CH}" "agy/m-74-c${CH}"
```
