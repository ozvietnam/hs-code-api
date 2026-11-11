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

## Bốn quy tắc bắt buộc

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

4. **Gộp thử xong phải xác nhận cây đúng là cây CÓ PR.** Dùng **ref có tên**, không dùng `FETCH_HEAD`.
   Chạy `git diff --stat origin/main HEAD` và đối chiếu **đúng số tệp + số dòng** của PR rồi mới tin
   con số test. Bình luận soát phải ghi **SHA bản gộp thử** và dòng `git diff --stat` bên cạnh số ca.

   ```bash
   git fetch origin pull/<số>/head:refs/pr<số>-head --force
   git fetch origin main
   git worktree remove /paperclip/workspaces/tmp/hs-soat-<số> --force 2>/dev/null; git worktree prune
   git worktree add --detach /paperclip/workspaces/tmp/hs-soat-<số> origin/main
   cd /paperclip/workspaces/tmp/hs-soat-<số>
   ln -s /paperclip/workspaces/hs-code-api/node_modules node_modules   # quy tắc 1
   git reset --hard origin/main            # BẮT BUỘC — xem Bẫy 4b, đừng bỏ dòng này
   git merge --no-edit refs/pr<số>-head
   git rev-parse HEAD                      # SHA bản gộp thử — dán lên PR
   git diff --stat origin/main HEAD        # PHẢI khớp số tệp + số dòng của PR
   gh pr view <số> -R ozvietnam/hs-code-api --json files \
     --jq '.files[] | "\(.path) +\(.additions) -\(.deletions)"'
   ```

### Bẫy 4 — `FETCH_HEAD` bị ghi đè, cổng chạy trên `main` thuần mà log vẫn xanh

Phát hiện ở OZV-290 (Giám đốc Cổng OZ), cùng họ với hai bẫy trên. Khối lệnh cũ gộp thử bằng
`git fetch origin pull/<số>/head` rồi `git merge FETCH_HEAD`. Nếu giữa hai lệnh đó có **bất kỳ**
`git fetch` nào khác (ví dụ `git fetch origin main` để lấy `main` vừa tiến), lệnh fetch sau
**ghi đè `FETCH_HEAD`**. `git merge FETCH_HEAD` kế tiếp báo `Already up to date`, cổng chạy trên
**`main` thuần, không có một dòng nào của PR**, mà log ra đúng dạng của một bản gộp đạt — **đủ cả hai
điều kiện của quy tắc 2**.

Nguy hiểm đúng kiểu Bẫy 1 và 2: **log xanh thật, nhưng của một cây không phải cây mình tưởng đang kiểm.**
Quy tắc 2 không bắt được, vì nó chỉ hỏi "số ca có thật không", không hỏi "cây này có chứa PR không".

Ở repo này bẫy còn dễ sập hơn: dữ liệu nhóm HS gần như **luôn** cần `git fetch origin main` giữa lúc soát
(nhánh thợ cắt từ `main` cũ, nhóm khác đã gộp xen vào), nên lệnh ghi đè `FETCH_HEAD` là việc *bình thường
phải làm*, không phải sơ suất hiếm gặp.

**Mẫu áp dụng đầu tiên:** PR #1190 (nhóm 8541) — bản gộp thử `8aabe677`, `3 tệp, +1174/−9`, khớp đúng số
của PR; cả hai mốc `bo-kiem-luat --toan-bieu` đo tại chỗ trên **chính cây đó**, không dùng mốc lưu sẵn.

### Bẫy 4b — soát LẠI cùng một PR: worktree cũ còn đó, cổng quy tắc 4 **im lặng** trên nền `main` cũ

Thợ HS 01 tìm ra khi soát độc lập PR #1191, và **nó là lỗi của bản tài liệu đầu tiên** (bản đó bỏ mất
dòng `git reset --hard origin/main` có trong chuẩn gốc). Giám đốc dự án đã tái lập lại đúng tình huống.

Đường dẫn `hs-soat-<số>` cố định theo **số PR**. Thợ push thêm commit rồi soát lại cùng PR đó — việc xảy
ra suốt — thì dòng `git worktree add` **chết ngay**:

```
fatal: '/paperclip/workspaces/tmp/hs-soat-1191' already exists   # RERUN_EXIT=128
```

Phản xạ tự nhiên khi đó là `cd` vào worktree cũ rồi `git merge` luôn. Worktree cũ còn đứng ở **`main` của
nhịp trước**. Tái lập thật (worktree ở `9863158f`, `origin/main` đã tiến tới `6df451fe`):

```
git merge --no-edit refs/pr1191-head
git diff --stat origin/main HEAD
 CLAUDE.md                           |  2 +-
 docs/van-hanh/cong-gop-chay-test.md | 59 +++++++++++++++++++++++++---
 2 files changed, 56 insertions(+), 5 deletions(-)      ← KHỚP ĐÚNG SỐ CỦA PR
```

**Cổng quy tắc 4 không báo gì cả.** Vì `git diff origin/main HEAD` chỉ thấy phần PR thêm vào, còn việc
nền thiếu 1 commit `main` thì nó không đo. Lần đó vô hại (gộp ra fast-forward), nhưng điều đang kiểm là
*"cây này đúng là `main` mới + PR"* — và cổng **không** trả lời được câu đó.

Vì vậy hai dòng trong khối lệnh trên là **bắt buộc, không phải cho gọn**:

- `git worktree remove … --force; git worktree prune` — để soát lại lần hai không chết ở dòng 3, khỏi
  sinh ra phản xạ dùng lại worktree cũ;
- `git reset --hard origin/main` **ngay trước** `git merge` — để nền luôn là `main` vừa fetch, bất kể
  worktree trước đó đứng ở đâu. Chuẩn gốc có dòng này; bản đầu của tài liệu này bỏ mất nó.

Muốn chắc thêm một nhịp: `git merge-base --is-ancestor origin/main HEAD` phải xanh sau khi gộp thử.

**Chuẩn chung toàn công ty:** bản gốc ở `ozvietnam/ai-live` `docs/cong-gop-pr.md`; `ozplugin/docs/cong-gop-pr.md`
(OZV-282) là **bản chép** và tự khai như vậy. Câu chữ quy tắc 4 ở đây lấy từ đó — **sửa chuẩn thì sửa bản
gốc `ai-live` trước**, kẻo sửa đúng một bản chép. (Số thẻ gán cho quy tắc 4 giữa hai repo vốn đã lệch:
`ai-live` ghi OZV-271/OZV-283, `ozplugin` ghi OZV-271/OZV-282.)

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

Rồi **dựng bản gộp thử bằng ref có tên** và xác nhận cây có PR (quy tắc 4 — khối lệnh ở trên), cài/nối
`node_modules` (quy tắc 1), và chạy **phần liên quan** trên **chính cây gộp thử đó**:

```bash
node scripts/<bộ-test-liên-quan-thay-đổi>.mjs       # phải xanh, EXIT=0
node scripts/bo-kiem-luat.mjs --toan-bieu           # chotSai/chotLoaiKhacSai không tăng, nemLoi 0
```

Hai mốc so sánh của `bo-kiem-luat` phải **đo tại chỗ cả hai bên** (nền `origin/main` và bản gộp thử)
trong cùng nhịp soát — **không dùng mốc lưu sẵn** từ nhịp trước, vì `main` đã tiến.

Lấy `EXIT` của **chính lệnh node**, đừng để `| tail` ăn mất mã thoát:

```bash
node scripts/<bộ>.mjs > /tmp/g.log 2>&1; echo "EXIT=$?"; tail -6 /tmp/g.log
```

Đạt hết ⇒ **bình luận biên bản TRƯỚC**, **rồi mới** `gh pr merge <số> --squash`, rồi kiểm lại `main`.
Không đạt ⇒ bình luận lỗi cụ thể lên thẻ, trả thợ.

### Bình luận soát phải có gì (danh sách — thiếu gạch nào là biên bản chưa đủ)

Chép từ chuẩn chung; hai gạch cuối là **luật OZ**, bản tài liệu đầu rơi mất nên ghi thành danh sách cho
khỏi rơi lần nữa:

- [ ] **Ai viết PR** — vì đây là thứ làm luật *"không tự gộp PR do mình viết"* kiểm được từ bên ngoài.
- [ ] **SHA bản gộp thử** (`git rev-parse HEAD` trên cây gộp thử).
- [ ] **Dòng `git diff --stat origin/main HEAD`** + số tệp/số dòng của PR để đối chiếu (quy tắc 4).
- [ ] **Tổng số ca test chạy thật** — nguyên dòng `dem-ca-test.mjs` in ra, kèm `EXIT=0` của chính lần
      chạy đó (quy tắc 2, 3). Số trọn bộ ghi rõ là **lấy ở CI**.
- [ ] **Hai mốc `bo-kiem-luat`** đo tại chỗ cùng nhịp, cả hai bên.
- [ ] **Một dòng "đã tra `sourcebot` gì, dùng lại gì"** — luật CEO 11/11, bắt buộc với PR sửa logic có
      thể đã có ở repo khác.
- [ ] **Dòng `KẾT LUẬN` của `soat-khac`** khi PR thuộc diện (xem dưới).

### Khi nào phải soát bằng model khác (`soat-khac`)

PR **> 300 dòng thêm**, hoặc chạm **tiền / khoá / dữ liệu khách / đăng nhập / điểm số**:

```bash
/paperclip/bin/soat-khac ozvietnam/hs-code-api <số>   # Gemini — khác model thợ
```

Dán dòng `KẾT LUẬN` vào PR. **CHẶN** thì kiểm lại lỗi đó **bằng tay**: lỗi thật ⇒ trả thợ; báo sai ⇒ ghi
rõ lý do rồi mới gộp. Repo này chạm **tờ khai khách Oz** và **khoá LLM** nên thuộc diện rất thường xuyên;
PR chỉ tài liệu hoặc chỉ thêm dữ liệu nhóm thì không bắt buộc.

### PR thêm cổng chặn: cổng xanh trên dữ liệu sạch chưa chứng minh được gì

PR thêm/sửa **cổng chặn** (`bo-kiem-luat`, `check-cay`, `check-legal-basis`, `check-so-tay`…) thì phải
**tự tiêm dữ liệu bẩn** và xem cổng có **đỏ đúng dòng** mình nhắm, rồi hoàn nguyên. Cổng xanh trên dữ
liệu sạch cũng là kết quả của một cổng **không bao giờ đỏ**. Dán cả hai chiều vào biên bản: đỏ đúng khi
bẩn, xanh khi sạch.

### PR tự nhận sửa lỗi mà cổng ra delta 0: phải đo hành vi trước/sau

PR *sửa lỗi* (không phải thêm dữ liệu, không phải tài liệu) mà cổng không-hồi-quy ra **delta 0 trên mọi
trường** thì **chưa đủ để gộp**: một bản vá **rỗng** cũng cho đúng kết quả đó, cũng khớp số tệp, cũng
xanh test. Phải **đo trực tiếp hành vi** trên nền `origin/main` và trên bản gộp thử, rồi dán số.

Mẫu: PR #1192 (vá đọc cụm "có hoặc không có X") có `chotDung` **4030 → 4030**, 37/37 trường delta 0.
Chỉ khi dò ngược vào `data/tax.json` và gọi thẳng `khopCumTrongChu` trên cả hai cây mới ra bằng chứng:
**1.408 nhãn đang bị đọc ngược nghĩa → 0**, và biết thêm vì sao cổng phẳng (1.255 dòng `whether or not`
nằm ở chữ **Anh**, chưa vào đường chốt mã tiếng Việt). Công cụ đo một lần thì viết **ngoài repo**, nhưng
**dán lệnh + số** để người sau chạy lại được. Đề xuất thành quy tắc chung ở OZV-310.

**Không tự gộp PR do chính mình viết.** Người thứ hai soát độc lập + dán biên bản; cú `gh pr merge` vẫn
do giám đốc dự án bấm sau khi có biên bản ĐẠT và CI xanh **trên commit cuối** (kiểm `head_sha` khớp —
đừng dùng số ca của commit trước làm bằng chứng cho commit mới). Chuẩn chốt ở OZV-283/OZV-290.

Xem thêm: `docs/MERGE-PROCEDURE.md` (PR có sửa `data/precedents.json`).
