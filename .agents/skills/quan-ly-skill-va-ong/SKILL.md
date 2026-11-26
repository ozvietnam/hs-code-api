---
name: quan-ly-skill-va-ong
description: >-
  SOP chuẩn của Oz Vietnam để tạo mới, nâng cấp từ lỗi tra-tho / nhận xét của
  QT, kiểm tra an toàn và đồng bộ các SKILL.md cùng lời nhắc chú ong
  (.agents/prompts/*.md) giữa repo ozvietnam/hs-code-api và plugin cục bộ
  oz-orchestrator.
---

# Skill `quan-ly-skill-va-ong` — Tự Viết, Nâng Cấp & Đồng Bộ Skill / Lời Nhắc Chú Ong

## 1. Mục đích & Phạm vi

Biến mọi phản hồi `tra-tho`, nhận xét soát của QT (như `#1922`, `#1966`, `#1967`, các PR bị trả), và kinh nghiệm vận hành lặp lại thành quy tắc chuẩn hoá trong `.agents/skills/*/SKILL.md` và `.agents/prompts/*.md` ngay trong kho `ozvietnam/hs-code-api`, sau đó kiểm tra máy tự động và đồng bộ nguyên byte sang `/Users/ozvietnamdesktop/.gemini/config/plugins/oz-orchestrator/`.

- **Nhánh & Worktree:** Luôn chạy trên worktree cô lập `/Users/ozvietnamdesktop/Documents/Claude/Projects/hs-code-api-wt/<slug>` với nhánh `agy/...` tách sạch từ `origin/main`.
- **Tiêu đề PR:** Dùng `docs(skills): ...` hoặc `chore(agents): ...` — **không** gắn `[M-xx]` (vì không phải thẻ móng).
- **Ràng buộc an toàn:** Không chạm `api/`, `lib/`, `data/prompts/`, `lib/llm-tier.js`, `lib/llm.mjs`, dữ liệu riêng tư (`data/oz-export/*`, `oz-gold*`, `.env`), không nhắc biến `HS_*` chưa khai báo trong `data/luat/bang-co.json`, tuyệt đối không push thẳng `main` và không tự `gh pr merge`.

---

## 2. Quy tắc viết & nâng cấp từ phản hồi `tra-tho` / QT

### Luật 1 — Mọi lỗi `tra-tho` lặp lại hoặc luật mới từ QT phải đi vào `SKILL.md` và lời nhắc chú ong
- Khi sửa PR `tra-tho` (`ong-sua-tra-tho.md`), ngoài việc vá đúng dữ liệu trên nhánh PR cũ, phải trích xuất nguyên nhân gốc thành một luật tổng quát (`### Luật N — ...`), kèm ví dụ PR thật (`#2140`, `#2157`, `#2170`, ...) và checklist cho chú ong tương ứng.

### Luật 2 — Dùng công cụ tất định `scripts/quan-ly-skill.mjs`, không sửa chắp vá tay dễ lệch cấu trúc
- Luôn ưu tiên tạo hoặc cập nhật qua `node scripts/quan-ly-skill.mjs` để giữ đúng YAML frontmatter, đánh số `Luật N` nối tiếp, đảm bảo chạy lại nhiều lần không trùng lặp (idempotent), và giữ `updatedFrom` trên lời nhắc chú ong.

### Luật 3 — Cấm lọt `HS_*` chưa khai báo, dữ liệu khách hàng, và lệnh tự gộp PR
- Trước khi commit hoặc đồng bộ plugin, bắt buộc chạy `node scripts/quan-ly-skill.mjs --kiem` và `node scripts/test-quan-ly-skill.mjs`.
- Mọi đề cập tới `gh pr merge`, `main`, hoặc đường dẫn dữ liệu khách hàng chỉ được phép xuất hiện trong ngữ cảnh **cấm / phòng chống rò rỉ**.

### Luật 4 — Đồng bộ hai nơi nguyên byte với `oz-orchestrator`
- Repo `ozvietnam/hs-code-api` (`.agents/{rules,agents,prompts,skills}`) và plugin `/Users/ozvietnamdesktop/.gemini/config/plugins/oz-orchestrator/` phải khớp từng byte qua `--dong-bo` và `--kiem --bat-buoc-plugin`.
- Trên CI Linux (`test-all.yml`), `--kiem` tự bỏ qua thư mục plugin Mac nếu không truyền `--bat-buoc-plugin`, nhưng toàn bộ test parity giả lập trong `scripts/test-quan-ly-skill.mjs` vẫn chạy đầy đủ.

---

## 3. Quy trình thao tác chuẩn với `scripts/quan-ly-skill.mjs`

### Tạo mới một skill
```bash
node scripts/quan-ly-skill.mjs --tao-skill \
  --ten "<slug-skill>" \
  --mo-ta "<mô tả ngắn khi nào nạp skill>" \
  --muc-dich "<mục đích và phạm vi áp dụng>"
```

### Nâng cấp skill từ nhận xét QT / `tra-tho` (cờ dòng lệnh hoặc `--tu-json`)
```bash
node scripts/quan-ly-skill.mjs --cap-nhat-skill \
  --ten "ho-so-nguong" \
  --luat-tieu-de "Tiêu đề luật ngắn gọn" \
  --quy-tac "Nội dung quy tắc bắt buộc..." \
  --pr "#2170" \
  --vi-du "Mô tả ca thật bị QT trả và cách sửa đúng"

# Hoặc nạp trực tiếp từ tệp JSON bài học (cập nhật cả skill lẫn lời nhắc chú ong):
node scripts/quan-ly-skill.mjs --cap-nhat-skill --tu-json /tmp/bai-hoc-tra-tho.json
node scripts/quan-ly-skill.mjs --cap-nhat-loi-nhac --tu-json /tmp/bai-hoc-tra-tho.json
```

### Tạo hoặc cập nhật lời nhắc chú ong (`.agents/prompts/<bee>.md`)
```bash
node scripts/quan-ly-skill.mjs --tao-loi-nhac \
  --ten "ong-moi" \
  --vai-tro "worker-chuyen-trach" \
  --skill "oz-hs-code-ops"

node scripts/quan-ly-skill.mjs --cap-nhat-loi-nhac \
  --ten "ong-nguong" \
  --quy-tac "Kiểm tra Luật 7 trước khi gắn nut chuong:NN" \
  --nguon "#2170"
```

### Kiểm tra, đồng bộ plugin & chạy bộ test cổng
```bash
node scripts/quan-ly-skill.mjs --dong-bo --plugin-dir /Users/ozvietnamdesktop/.gemini/config/plugins/oz-orchestrator
node scripts/quan-ly-skill.mjs --kiem --bat-buoc-plugin --plugin-dir /Users/ozvietnamdesktop/.gemini/config/plugins/oz-orchestrator
node scripts/test-quan-ly-skill.mjs
```
