# Quy trình Merge PR có thay đổi data/precedents.json

## ⚠️  Lý do

PR #293 đã làm mất 20 hsCode keys, 53 records (ref, hsCode) do agent tự rebase và merge thủ công bằng Python script thay vì qua admin review.

## Quy trình chuẩn

### 1. PR mở (agent)
- Agent mở PR, chạy `npm test` → pass
- Agent **KHÔNG** tự merge dù có quyền admin

### 2. Pre-merge checklist (agent)
```bash
# Verify mọi thay đổi đều OK
npm test                                              # Tests pass
node scripts/validate-community.mjs <file>          # 0 lỗi
node scripts/ci-check-precedents-coverage.mjs         # Pass (sẽ tự động thêm vào CI)
node scripts/sync-doc-counts.mjs                     # Counts update
```

### 3. Admin review
- Check diff: không có reformat 1 dòng
- Check precedents.json: không mất keys
- Check conflict: rebase thủ công bằng git, KHÔNG dùng script tự chế

### 4. Merge (admin)
```bash
# Nếu có conflict về precedents.json:
git checkout main
git pull origin main
git checkout <branch>
git rebase main
# Nếu conflict:
#   - Mở precedents.json trong editor
#   - Resolve thủ công (giữ tất cả keys từ main + thêm keys mới từ branch)
#   - Verify: node scripts/ci-check-precedents-coverage.mjs
git push --force-with-lease

# Nếu KHÔNG có conflict:
gh pr merge <N> --squash --delete-branch --admin
```

### 5. Post-merge (admin)
```bash
node scripts/ci-check-precedents-coverage.mjs  # Verify không mất
node scripts/sync-doc-counts.mjs              # Update counts
```

## Lệnh cấm

❌ **KHÔNG** tự merge PR có conflict
❌ **KHÔNG** dùng Python script tự merge JSON
❌ **KHÔNG** dùng `git rebase` không qua review
❌ **KHÔNG** commit file bị reformat 1 dòng

## Bug đã gặp

- PR #293: mất 20 hsCode, 53 records
- PR #296: reformat 12 file JSON thành 1 dòng

## Liên hệ

- Memory: `~/.hermes/profiles/legal-customs/memories/BUGS_FOUND_2026-10-15.md`
- Skill: `tb-tchq-process-and-review`
- Script: `ci-check-precedents-coverage.mjs`
