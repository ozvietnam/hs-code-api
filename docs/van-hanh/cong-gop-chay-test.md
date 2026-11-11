# Cổng gộp: chạy test cho ĐÚNG rồi hãy nói "xanh"

Chốt tại Phòng họp Giám đốc 11/11/2026 ([OZV-271](https://github.com/ozvietnam/hs-code-api/issues) → OZV-272).
Áp dụng cho **mọi người soát PR** của `hs-code-api` (giám đốc dự án và thợ).

## Vì sao có tài liệu này

Cổng gộp từng có lỗ: lệnh kiểm **trượt** hoặc **bỏ sót test**, nhưng người soát vẫn ghi "test xanh" lên PR.
Hai cái bẫy đã gặp thật ở repo này — cả hai đều **thoát 0** hoặc **in chữ trông như xanh**:

### Bẫy 1 — `npm ci` bỏ hết devDependencies mà vẫn thành công

Môi trường agent có `NODE_ENV=production`. npm thấy biến đó thì **tự bật `omit=dev`**, nên:

```
npm ci --prefer-offline        # exit 0, cài 44 gói, KHÔNG có xlsx
```

`xlsx`, `pdf-parse`, `@electric-sql/pglite` đều là `devDependencies`. Thiếu `xlsx` thì
`scripts/test-bieu-thue.mjs` chết với `Error: Cannot find module 'xlsx'` — và trước đây việc này
bị kết luận nhầm là *"máy thiếu gói xlsx"*, rồi đi chạy `npm test` rời từng bước.

**Không phải máy thiếu gói. Là lệnh cài đã bỏ qua nhóm dev.** Cách đúng:

```bash
npm ci --include=dev --prefer-offline --no-audit --no-fund
node -e "console.log(require('xlsx').version)"   # phải in 0.18.5
```

Kiểm nhanh môi trường có đang bẫy mình không: `npm config get omit` → ra `dev` là đang bẫy.

### Bẫy 2 — `=== ALL TESTS PASSED ===` từng nằm GIỮA chuỗi test

`npm test` là chuỗi 212 bước nối bằng `&&`. Nhãn `=== ALL TESTS PASSED ===` từng đứng ở bước 197,
tức **còn 14 bước test chạy sau nhãn**. Ai `grep "ALL TESTS PASSED"` để kết luận là đọc nhầm.

Nhãn đã được đẩy về **bước cuối cùng** (OZV-272). Dù vậy, đừng lấy nhãn làm bằng chứng — lấy **số ca + EXIT**.

## Ba quy tắc bắt buộc

1. **Worktree mới ⇒ cài gói TRƯỚC khi chạy lệnh kiểm.**

   ```bash
   git worktree add /paperclip/workspaces/tmp/hs-xx <nhánh>
   cd /paperclip/workspaces/tmp/hs-xx
   # package-lock.json không đổi so với kho gốc → nối cho nhanh:
   ln -s /paperclip/workspaces/hs-code-api/node_modules node_modules
   # package-lock.json CÓ đổi → cài riêng:
   npm ci --include=dev --prefer-offline --no-audit --no-fund
   ```

2. **Chỉ tin lệnh kiểm khi log có ĐỦ CẢ hai:** dòng tổng kết **số ca** (`passed` / `pass`) **và**
   `EXIT=0` **của chính lần chạy đó**. Thiếu một trong hai ⇒ coi như chưa chạy.

   ```bash
   npm test > /tmp/hs-test.log 2>&1; echo "EXIT=$?" >> /tmp/hs-test.log
   node scripts/dem-ca-test.mjs /tmp/hs-test.log
   ```

   `scripts/dem-ca-test.mjs` đếm số ca thật từ log và **thoát 1** khi thiếu bằng chứng
   (không đếm được ca nào, thiếu `EXIT=`, `EXIT≠0`, có ca đỏ, hoặc có dòng trượt vì thiếu gói).
   Nó chỉ **đọc** log, không chạy test, không ghi `data/`.

3. **Bình luận soát trên PR phải dán TỔNG SỐ CA TEST CHẠY THẬT**, không chỉ ghi chữ "xanh".
   Dán nguyên dòng mà `dem-ca-test.mjs` in ra, ví dụ:

   ```
   ca xanh 1234 (tổng kết 1456 ca / 188 bộ) · ca đỏ 0 · EXIT=0
   ```

## Cổng gộp đầy đủ cho một PR

```bash
gh pr checks <số> -R ozvietnam/hs-code-api   # phải toàn xanh; đang chạy thì CHỜ, đỏ thì trả thợ
# lấy nhánh ra worktree riêng, cài/nối node_modules (quy tắc 1)
npm test > /tmp/hs-test.log 2>&1; echo "EXIT=$?" >> /tmp/hs-test.log
node scripts/dem-ca-test.mjs /tmp/hs-test.log           # phải XANH
node scripts/bo-kiem-luat.mjs --toan-bieu                # chotSai/chotLoaiKhacSai không tăng, nemLoi 0
```

Đạt hết ⇒ `gh pr merge <số> --squash`, rồi kiểm lại `main`. Không đạt ⇒ bình luận lỗi cụ thể lên thẻ, trả thợ.

Xem thêm: `docs/MERGE-PROCEDURE.md` (PR có sửa `data/precedents.json`).
