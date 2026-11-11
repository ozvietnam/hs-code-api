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

## Bẫy 3 — chạy trọn bộ `npm test` trên máy agent thì KHÔNG BAO GIỜ xong

Đo thật 11/11 (OZV-272):

- Trọn bộ `npm test` trên CI: **26m19s**.
- Giới hạn một lệnh chạy nền trên máy agent: **~10 phút**.

⇒ **26 phút không nhét vào 10 phút được.** Lệnh sẽ bị SIGTERM (`EXIT=143`) giữa chuỗi, **bất kể máy
rảnh hay bận, bất kể PR nào**. Đứt giữa chuỗi ở máy agent **không phải** dấu hiệu test đỏ, và cũng
**không phải** dấu hiệu "có bộ test nào chậm bất thường".

Hai lần em (GĐ) đọc sai chỗ này, ghi lại để khỏi lặp:

1. Tưởng là *"có một bộ test chậm hơn 10 phút"*. Đo sạch: bộ nặng nhất
   (`test-cong-ranh-gioi.mjs`, 4.498 ca qua 2.140 bản nháp) chạy **7m45s, `EXIT=0`** — bình thường.
2. Tưởng là *"máy yếu"*. Thật ra lúc đo **tải 199 trên 32 lõi** vì nhiều agent chạy song song — và
   3 việc gây tải là của chính em, trong đó hai chặng test **trùng nội dung** chạy cùng lúc.

**Luật rút ra:**

- **Số ca trọn bộ ⇒ lấy ở CI.** Máy agent không phải chỗ chạy trọn bộ.
- Chạy cục bộ chỉ để kiểm **những bộ liên quan tới thay đổi của mình**, không phải cả 212 bước.
- Trước khi tin bất kỳ **số đo thời gian**: `cat /proc/loadavg`. Số đầu **> 32** (số lõi) ⇒ số đo vô
  nghĩa, chờ hoặc lấy số CI.
- **Không chạy hai lệnh kiểm nặng trùng nội dung cùng lúc.** Máy dùng chung với thợ; việc nền của
  giám đốc không được giành CPU với ưu tiên đang chạy.

## Cổng gộp đầy đủ cho một PR

```bash
gh pr checks <số> -R ozvietnam/hs-code-api   # phải toàn xanh; đang chạy thì CHỜ, đỏ thì trả thợ
```

**Số ca trọn bộ lấy từ CI** (job `test` chạy sẵn `dem-ca-test.mjs` ở bước cuối) — mở log job và dán
nguyên dòng `Số ca test đọc từ log: ...`. Đừng cố chạy trọn bộ ở máy agent (Bẫy 3).

Rồi lấy nhánh ra worktree riêng, cài/nối `node_modules` (quy tắc 1), và chạy **phần liên quan**:

```bash
node scripts/<bộ-test-liên-quan-thay-đổi>.mjs       # phải xanh, EXIT=0
node scripts/bo-kiem-luat.mjs --toan-bieu           # chotSai/chotLoaiKhacSai không tăng, nemLoi 0
```

Đạt hết ⇒ `gh pr merge <số> --squash`, rồi kiểm lại `main`. Không đạt ⇒ bình luận lỗi cụ thể lên thẻ, trả thợ.

**Không tự gộp PR do chính mình viết** — chuyển cho người soát khác.

Xem thêm: `docs/MERGE-PROCEDURE.md` (PR có sửa `data/precedents.json`).
