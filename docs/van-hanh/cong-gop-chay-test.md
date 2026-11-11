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

## Sáu quy tắc bắt buộc

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
   # PR đã gộp rồi thì khối dưới ra git diff RỖNG và MERGE_EXIT=0 — trông y như cổng hỏng.
   # Kiểm trạng thái TRƯỚC, khỏi mất một lượt đi tìm lỗi không có:
   gh pr view <số> -R ozvietnam/hs-code-api --json state --jq .state   # phải là OPEN

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

5. **Cổng xanh / delta 0 KHÔNG phải bằng chứng bản vá có tác dụng.** Bốn quy tắc trên chỉ chứng minh
   *"cây này có PR và cổng chạy thật"*; delta 0 chỉ chứng minh *"không hồi quy"*. Phải **đo trực tiếp
   hành vi trước/sau** trên dữ liệu thật và dán lệnh + số. Không có số ⇒ **CHẶN**.
   Chi tiết: [Quy tắc 5](#quy-tắc-5--bẫy-bản-vá-rỗng-ozv-310).

6. **Biên bản `TRẢ THỢ` phải chặn được tay người gộp.** Kết luận chặn ⇒ gắn nhãn `tra-tho` bằng REST;
   trước **mọi** lần gộp phải đọc nhãn + bình luận soát cuối. Còn nhãn ⇒ cấm gộp.
   Kèm luật kiểm đối kháng cho PR sửa regex (6b) và PR chép mẫu từ repo khác (6c).
   Chi tiết: [Quy tắc 6](#quy-tắc-6--biên-bản-trả-thợ-phải-chặn-được-tay-người-gộp-ozv-337).

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

**Cổng quy tắc 4 không báo gì cả** — nhưng **lý do thì khác** điều bản tài liệu đầu tiên viết. Bản đó
ghi *"vì `git diff origin/main HEAD` chỉ thấy phần PR thêm vào, nền thiếu commit `main` thì nó không đo"*.
Câu đó **sai**, Thợ HS 01 bác lại ở lượt soát thứ hai và chứng minh bằng số.

Sự thật: nhánh #1191 **cắt từ `6df451fe`**, nên gộp nó vào worktree đứng ở `9863158f` thì **phép gộp tự
mang `6df451fe` theo**. Cây đó **đúng thật là `main` + PR** — cổng im vì **không có gì để báo**. Ca
đó là ca *cổng đúng*, không phải ca *cổng mù*.

Khi nền **thiếu thật** (nhánh không chứa commit `main` đang xét) thì cổng **đỏ to và chỉ đúng thủ phạm**.
Thợ kiểm ngược bằng PR #1193 trên ba nền cũ khác nhau:

```
nền 9c12c74e -> cổng đo 13 tệp (GitHub: 11) | ancestor_exit=1
nền 6df451fe -> cổng đo 13 tệp (GitHub: 11) | ancestor_exit=1
nền 9863158f -> cổng đo 13 tệp (GitHub: 11) | ancestor_exit=1
```

Tệp của commit `main` bị thiếu hiện ra dạng **bị xoá ngược** (`-146`), và `git merge-base --is-ancestor`
thoát **1**. Tức cổng quy tắc 4 **trả lời được** câu *"cây này đúng là `main` mới + PR"*.

Vậy giữ hai dòng dưới đây **không phải** vì cổng mù, mà vì **worktree cũ làm người soát mất một lượt**
(dòng `git worktree add` chết `EXIT=128`, rồi sinh phản xạ `cd` vào worktree cũ) và vì **không phải lúc
nào nhánh cũng tình cờ cắt từ commit đủ mới** như ca #1191.

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
# BƯỚC 0 — chốt TRẢ THỢ (quy tắc 6a). Trước cả khi dựng worktree.
gh pr view <số> -R ozvietnam/hs-code-api --json labels,comments \
  -q '{nhan: [.labels[].name], soat_cuoi: (.comments | last | .body[0:200])}'
# Còn nhãn tra-tho, HOẶC biên bản soát cuối là TRẢ THỢ ⇒ DỪNG, không gộp.

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

- [ ] **Nhãn `tra-tho` + bình luận soát cuối đã đọc** (quy tắc 6a) — dán kết quả lệnh `--json
      labels,comments`. Đây là gạch **đầu tiên**, không phải gạch cuối.
- [ ] **Ai viết PR** — vì đây là thứ làm luật *"không tự gộp PR do mình viết"* kiểm được từ bên ngoài.
- [ ] **SHA bản gộp thử** (`git rev-parse HEAD` trên cây gộp thử).
- [ ] **Dòng `git diff --stat origin/main HEAD`** + số tệp/số dòng của PR để đối chiếu (quy tắc 4).
- [ ] **Tổng số ca test chạy thật** — nguyên dòng `dem-ca-test.mjs` in ra, kèm `EXIT=0` của chính lần
      chạy đó (quy tắc 2, 3). Số trọn bộ ghi rõ là **lấy ở CI**.
- [ ] **Hai mốc `bo-kiem-luat`** đo tại chỗ cùng nhịp, cả hai bên — **ba mốc** nếu PR sửa chính tệp đo
      điểm (quy tắc 6b-bis).
- [ ] **Bằng chứng bản vá CÓ tác dụng** (quy tắc 5): tên ca đỏ trên `main` chưa sửa, hoặc số đo hành vi
      trước/sau khi cổng ra delta 0.
- [ ] **Kiểm đối kháng ba chiều** (quy tắc 6b) khi PR chạm regex ăn dữ liệu thật: nhánh đã `grep`, hai
      chiều, ca ReDoS kèm số ms.
- [ ] **Dòng "mẫu gốc chịu được ngữ cảnh mới vì…"** (quy tắc 6c) khi PR chép mẫu từ repo khác.
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
PR **chỉ tài liệu** thì không bắt buộc.

**PR dữ liệu nhóm KHÔNG được miễn** — bản đầu của tài liệu này từng ghi "chỉ tài liệu hoặc chỉ thêm dữ
liệu nhóm thì không bắt buộc". Đó là **nới chuẩn gốc** (`ai-live:docs/cong-gop-pr.md` không có ngoại lệ
theo loại PR), và nới đúng vào loại PR đông nhất repo này. Thợ HS 01 tìm ra khi soát độc lập PR #1191,
có bằng chứng ngay trong repo: **#1190 là PR dữ liệu nhóm, +1174 dòng, đã chạy `soat-khac`**, và dòng
`KẾT LUẬN` của nó nhắm đúng loại lỗi mà cổng này bắt được — **lệch dữ liệu giữa `so-tay/8541.json`,
`ten-khac-8541.json` và `tu-vung@2.json`**, không phải lỗi mã. PR dữ liệu nhóm là nơi lỗi **lệch giữa
ba tệp** sinh ra, mà đó chính là thứ một model khác dễ thấy hơn người đã soạn dữ liệu.

### PR thêm cổng chặn: cổng xanh trên dữ liệu sạch chưa chứng minh được gì

PR thêm/sửa **cổng chặn** (`bo-kiem-luat`, `check-cay`, `check-legal-basis`, `check-so-tay`…) thì phải
**tự tiêm dữ liệu bẩn** và xem cổng có **đỏ đúng dòng** mình nhắm, rồi hoàn nguyên. Cổng xanh trên dữ
liệu sạch cũng là kết quả của một cổng **không bao giờ đỏ**. Dán cả hai chiều vào biên bản: đỏ đúng khi
bẩn, xanh khi sạch.

### Quy tắc 5 — bẫy bản vá rỗng (OZV-310)

**Chỗ hỏng.** PR sửa lỗi `#1192` qua đủ 4 quy tắc trên, cổng không-hồi-quy toàn biểu ra **37/37 trường
delta 0** (`chotDung` 4030 → 4030). Nhưng **một bản vá rỗng cũng ra đúng kết quả đó**, cũng khớp số tệp,
cũng xanh test: 4 quy tắc đầu chỉ chứng minh *"cây này có PR và cổng chạy thật"*, delta 0 chỉ chứng minh
*"không hồi quy"*. Không câu nào trong số đó chứng minh **bản sửa có tác dụng**.

Chỉ khi dò ngược vào `data/tax.json` và gọi thẳng `khopCumTrongChu` trên cả hai cây mới ra bằng chứng:
**1.408 nhãn đang bị đọc ngược nghĩa → 0**, và biết thêm vì sao cổng phẳng (1.255 dòng `whether or not`
nằm ở chữ **Anh**, chưa vào đường chốt mã tiếng Việt). Công cụ đo một lần thì viết **ngoài repo**, nhưng
**dán lệnh + số** để người sau chạy lại được.

**Việc người soát phải làm:**

- **PR *sửa lỗi* hoặc sửa cổng chặn:** dựng cây có **test của PR** nhưng **mã của `origin/main`**, chạy
  đúng tệp test đó, xác nhận ca mới **ĐỎ đúng chỗ** — đỏ ở đúng phép kiểm mô tả lỗi, không phải đỏ vì
  cây dựng sai. Dán **tên các ca đỏ** vào biên bản.
- **Khi bảng đo tổng hợp ra delta 0 trên mọi trường:** không được coi là đạt. **Đo trực tiếp hành vi**
  trước/sau (`origin/main` vs bản gộp thử), dán **lệnh + số**. Không có số ⇒ **CHẶN**.
- **PR *thêm dữ liệu*:** delta 0 **trên chỉ số của chính nhóm mới là bất thường** — nghĩa là dữ liệu
  **mồ côi**, chưa nối vào đường chạy. Chỉ số phủ của nhóm mới phải nhích **đúng số lượng thêm**, nhóm
  cũ không hồi quy.

Cách dựng cây "test của PR + mã của `main`" ở repo này — đổi `<tệp-mã>` thành tệp mã mà PR sửa:

```bash
cd /paperclip/workspaces/tmp/hs-soat-<số>   # cây đã gộp thử, đã nối node_modules (quy tắc 1)
git checkout origin/main -- <tệp-mã>        # ví dụ lib/so-tay-runtime.js
git diff --stat origin/main                 # PHẢI chỉ còn tệp test, mã về đúng main
node scripts/<bộ-test-của-PR>.mjs > /tmp/do.log 2>&1; echo "EXIT=$?"; tail -8 /tmp/do.log
git checkout HEAD -- <tệp-mã>               # hoàn nguyên trước khi chạy cổng
```

> **Bẫy trong chính quy tắc 5: "đỏ" rỗng.** Runner có thể in chữ `failed` trong khi **0 ca chạy** (cây
> thiếu gói, tệp nạp lỗi). Ai đọc "failed" thành "đỏ đúng chỗ" là tự ký một bằng chứng rỗng y như thứ
> quy tắc 5 sinh ra để chặn. **Chỉ nhận là đỏ khi log ghi `N failed | M passed` kèm TÊN CA.**
> Mẫu đạt (#1223, bê tệp test của PR sang nền `45745b83`):
>
> ```
> FAIL 030611 thiếu dữ kiện (chỉ tên PN6 + "Đông lạnh") → KHÔNG tự chốt dòng Loại khác 03061190
> FAIL 030612 thiếu dữ kiện (chỉ tên PN6 + "Đông lạnh") → KHÔNG tự chốt dòng Loại khác 03061290
> 93 passed, 2 failed
> ```
>
> Trên cây PR: **95 passed, 0 failed, `EXIT=0`**. Có tên ca ⇒ đỏ thật.
>
> Và giữ luật: **không `git checkout` trong worktree đang chạy cổng.** Kiểm đỏ xong, hoàn nguyên, rồi
> mới chạy cổng — hoặc dùng worktree thứ hai.

### Quy tắc 6 — biên bản TRẢ THỢ phải chặn được tay người gộp (OZV-337)

**Chỗ hỏng.** Bốn quy tắc đầu dạy người soát kết luận cho đúng; quy tắc 5 dạy đừng tin cổng xanh. Không
quy tắc nào giữ được **kết luận đã đúng rồi**. Biên bản `TRẢ THỢ` là chữ trong một bình luận giữa hàng
chục bình luận khác; `gh pr merge` không đọc chữ. Ngày 11/11 cả `ozplugin` và `hs-code-api` đều gộp PR
**sau** khi giám đốc đã chặn, **mỗi lần chỉ 7–12 phút sau biên bản chặn** — ở repo này là
[#1210](https://github.com/ozvietnam/hs-code-api/pull/1210): chặn `15:57:52Z` → gộp `16:09:37Z` =
**11 phút 45 giây**. Chỗ hỏng thật nằm ở con số đó: **một biên bản chặn chỉ sống được 7–12 phút** nếu
không có gì giữ nó. Một lỗi lặp ở hai repo độc lập trong cùng một buổi thì không phải người bất cẩn, mà
là **thiếu cái chốt**.

#### 6a. TRẢ THỢ ⇒ gắn nhãn `tra-tho`; trước mọi lần gộp phải đọc nhãn

Khi kết luận **TRẢ THỢ**, người soát bắt buộc gắn nhãn cùng lúc với bình luận — **bằng REST, và phải
đọc lại kết quả**:

```bash
gh api -X POST repos/ozvietnam/hs-code-api/issues/<số>/labels \
  -f "labels[]=tra-tho" -q '[.[].name]'
# PHẢI in ra một danh sách CÓ "tra-tho". Không in ⇒ nhãn chưa gắn ⇒ chốt chưa tồn tại.
```

(Nhãn `tra-tho` đã tạo trên `ozvietnam/hs-code-api` ngày 11/11/2026, màu `#B60205`.)

> **Đừng dùng `gh pr edit --add-label` — nó hỏng, và hỏng im lặng.**
> `gh pr edit <số> --add-label tra-tho` **chết** với `GraphQL: Projects (classic) is being deprecated …
> (repository.pullRequest.projectCards)`: `gh pr edit` hỏi kèm `projectCards` qua GraphQL nên cả lệnh
> đổ, dù việc gắn nhãn chẳng liên quan gì tới Projects. **Nhãn không được gắn.** Chiều gỡ
> (`--remove-label`) hỏng y vậy. Kiểm chứng 11/11/2026 ở `ozplugin#385`: gỡ nhãn sạch (`[]`) → chạy
> `gh pr edit --add-label` → `EXIT=1`, đọc lại nhãn vẫn `[]`; đường REST in `["tra-tho"]` ngay.
> Bẫy phải nhớ: lần thử đầu tưởng lệnh *có* chạy, vì nhãn đã do người khác gắn sẵn bằng REST từ trước.
> **Lệnh in lỗi mà kết quả vẫn "đúng" là lúc dễ kết luận sai nhất** — nên luật là đọc lại nhãn bằng một
> lệnh riêng, không suy từ mã thoát.
> Đây đúng là thứ quy tắc 6 sinh ra để chặn: **một cái chốt mà lệnh dựng nó không chạy thì cái chốt
> không tồn tại.**

**Bước đầu tiên** của mọi lần gộp — trước `gh pr merge`, trước cả khi dựng worktree:

```bash
gh pr view <số> -R ozvietnam/hs-code-api --json labels,comments \
  -q '{nhan: [.labels[].name], soat_cuoi: (.comments | last | .body[0:200])}'
# Còn nhãn tra-tho, HOẶC biên bản soát cuối là TRẢ THỢ ⇒ DỪNG, không gộp.
```

**Tuyệt đối không gộp** nếu còn nhãn `tra-tho`, **hoặc** bình luận soát mới nhất là `TRẢ THỢ`. Nhãn chỉ
được gỡ khi có **đủ hai thứ, đúng thứ tự**: commit sửa mới **sau** giờ của biên bản chặn, **rồi** một
biên bản soát lại trên PR nói rõ đã kiểm lại từng lỗi đã chặn. Gỡ nhãn mà chưa có commit mới là dựng lại
đúng chỗ hỏng.

Gỡ nhãn cũng đi REST:

```bash
gh api -X DELETE repos/ozvietnam/hs-code-api/issues/<số>/labels/tra-tho -q '[.[].name]'
# PHẢI in danh sách KHÔNG còn "tra-tho".
```

Và người gỡ nhãn + gộp phải là người **không viết PR** đó (OZV-283).

#### 6b. Sửa regex ăn dữ liệu thật / chữ khách / đầu ra LLM ⇒ kiểm đối kháng ba chiều

Áp khi PR sửa hoặc thêm mẫu regex chạy trên dữ liệu nghiệp vụ thật, chữ khách gõ, hoặc đầu ra LLM:

1. **Rã mẫu thành từng nhánh, `grep` mỗi nhánh trong dữ liệu đích** (bài học `#1210`) — xem nhánh đó có
   là **từ thật của biểu thuế** không. Biến thể không dấu là chỗ chết người:

   `data/tax.json` là **object khoá theo mã HS** (không phải mảng), tên hàng tiếng Việt ở trường `vn`:

   ```bash
   # đổi "nhung" thành nhánh mình vừa thêm vào regex
   node -e '
     const t=require("./data/tax.json");
     const re=new RegExp("\\b"+process.argv[1]+"\\b","i");
     let n=0;for(const [hs,r] of Object.entries(t)){
       if(re.test(r.vn||"")){if(n++<4)console.log("  ",hs,(r.vn||"").slice(0,55));}}
     console.log("  nhánh \""+process.argv[1]+"\" trùng",n,"dòng tiếng Việt của biểu");' nhung
   ```

   Đo thật trên `main` `cd5ddbbf` (chạy đúng lệnh trên):

   ```
   nhánh "nhung" trùng 3 dòng:  59070040 vải phủ nhung xơ · 59111000 vải phớt · 07095500 Nấm Tùng Nhung
   nhánh "ma"    trùng 4 dòng:  12115000 Cây ma hoàng · 13021400 từ cây ma hoàng
                                32141000 Ma tít gắn kính · 96180000 Ma-nơ-canh
   ```

   Ở `#1210`, nhánh `nhung|ma` không dấu đã cắt mất mệnh đề phủ định của **5 nhóm hàng thật** trong
   biểu thuế. Quét cả `r.en` (chữ Anh) thì số trùng còn cao hơn (`ma` ra 21 dòng) — nhớ đo **đúng
   trường mà regex của mình thật sự chạy trên đó**, kẻo tự dọa mình bằng số của cột khác.

2. **Đo hai chiều trên cùng bộ ca** (bài học `ai-live#223/#228`): chứng minh đồng thời chiều *bắt được
   lỗi cũ* **và** chiều *không bắt nhầm dữ liệu nghiệp vụ hợp lệ / không mở lỗ mới*. Một chiều không đủ
   — mẫu bắt hết mọi thứ cũng "bắt được lỗi cũ". Mẫu đạt (#1223, gọi thẳng hàm bị đổi trên **2.140 mẫu
   `cachDoc` thật / 396 khoá**): bản cũ sót cú pháp **28** khoá, bản mới **14** ⇒ *tốt hơn 14, xấu hơn 0*;
   và **0/2140** mẫu bóc ra rỗng.

3. **Một ca chuỗi dài đối kháng (ReDoS):** regex có lookbehind hoặc nhóm lặp mà ăn đầu ra LLM / chữ
   khách phải có một ca chuỗi dài bất thường (**~40.000 từ lặp**) **chạy xong dưới 2 giây**. Đầu ra LLM
   dài bao nhiêu là việc của model, không phải việc ta đoán. Cổng CI **không bao giờ tự sinh ca này**.

   ```bash
   # đổi lib/hàm thành hàm mà PR sửa; đặt chuỗi lặp ở GIỮA hai mốc mà regex phải khớp
   node -e '
     const {coCumTuyChon}=require("./lib/cum-tuy-chon.js");
     const s="đã hoặc chưa "+"a ".repeat(40000)+"có hoặc không có "+"b ".repeat(40000)+"đầu";
     const t=Date.now(); const r=coCumTuyChon(s);
     console.log("độ dài:",s.length,"ký tự · kết quả:",r,"· ms:",Date.now()-t);'   # phải < 2000
   ```

   Đo thật trên `main` `cd5ddbbf`: `độ dài: 160033 ký tự · kết quả: true · ms: 4`.
   Mẫu đạt khác (#1223): 40.000 lần lặp (1,64 triệu ký tự) = **23 ms**; 5.000 ngoặc mở lồng = 0 ms.

#### 6b-bis. PR sửa CHÍNH tệp đo điểm ⇒ phải ĐO BA CHIỀU

PR sửa `scripts/bo-kiem-luat.mjs`, `scripts/check-*.mjs` hay bất kỳ tệp sinh ra bảng số (`eval:*`) thì
bảng số **do chính tệp bị sửa in ra**, nên nó **không tự chứng minh được gì**. Dựng **ba** cây:

| cây | cách dựng |
|---|---|
| nền | `origin/main` vừa fetch |
| **chỉ dữ liệu** | `git checkout refs/pr<n>-head -- <chỉ các tệp data/>` (giữ nguyên gate của `main`) |
| đầy đủ | gộp cả PR |

```bash
# trên cây đứng ở origin/main, đã nối node_modules
git checkout refs/pr<n>-head -- data/<đường-dẫn-PR-sửa>
git diff --stat origin/main            # PHẢI chỉ còn tệp data/, scripts/ về đúng main
node scripts/bo-kiem-luat.mjs --toan-bieu --json > /tmp/chi-du-lieu.json; echo "EXIT=$?"
```

Dấu hiệu **nới thước** phải soi: `không thể chốt` hoặc `nemLoi` **giảm bất thường**, ca chạy sang trạng
thái dễ hơn (`chotSai` → `hỏi` → `chotDung` mà tổng ca đứng yên).

Mẫu đã làm thật — **PR [#1223](https://github.com/ozvietnam/hs-code-api/pull/1223)**:

| cây | chotDung | chotSai | chotLKSai | không thể chốt |
|---|---:|---:|---:|---:|
| nền `45745b83` | 4727 | 19 | 13 | 1845 |
| **chỉ dữ liệu** (gate của `main`) | 4727 | 19 | **11** | 1845 |
| đầy đủ (gộp PR) | **4763** | **16** | **11** | 1845 |

Đọc ra: **phần dữ liệu** tự nó kéo `chotLoaiKhacSai` **13→11** — đúng mục tiêu thẻ; **phần gate** kéo
thêm `chotDung` +36 và `chotSai` −3, và số học trong loại ca cho thấy 36 ca vào `chotDung` đến từ
`hỏi` −33 và `chotSai` −3. `không thể chốt` **giữ nguyên 1845 cả ba cây**, `nemLoi` **0** ⇒ không ca nào
bị đẩy sang trạng thái dễ để lấy điểm. Biên bản:
<https://github.com/ozvietnam/hs-code-api/pull/1223#issuecomment-6801928049>

#### 6c. Chép mẫu từ repo khác phải xét ngữ cảnh mới

Luật dùng lại xuyên repo (tra `sourcebot` trước khi tự viết) vẫn giữ nguyên — nhưng chép regex hay hàm
từ repo khác (ví dụ `zalo-bot/packs/hs/loc-tap-am.js` → `lib/soat-luat-re.js`) thì **phải ghi một dòng
trong PR** chứng minh mẫu gốc chịu được ngữ cảnh đích: *"mẫu gốc chịu được ngữ cảnh mới vì…"* — dữ liệu
ở đây khác gì nơi gốc, và đã kiểm chiều nào. **Mẫu đúng trên câu chat ngắn có thể sai trên một chương
biểu thuế** (xem 6b.1: `nhung`, `ma`).

### PR dữ liệu ra delta 0 **vì không ai đo**: hai mốc phải đo TẠI CHỖ, CÙNG NHỊP

Mục trên nói về PR *sửa lỗi*. Mục này là mặt ngược lại và đã **mất tiền thật** ngày 11/11.

Sáu PR lô ranh giới gộp trong khoảng **15:04Z–15:35Z**, mỗi PR **0 bình luận biên bản**, không PR nào
có mốc `bo-kiem-luat --toan-bieu`. Khi giám đốc dự án kiểm `main` sau khi gộp PR #1196 thì phát hiện
**hai hồi quy thật** đã nằm trong `main`:

| PR | Hồi quy | Ca hỏng |
|---|---|---|
| #1200 (lô L2, chương 03) | `chotLoaiKhacSai` **11 → 13** | `03061190`, `03061290` — **tự chốt dòng "Loại khác" khi thiếu dữ kiện** (trước đó `KHONG_THE_CHOT`, im lặng và an toàn) |
| #1205 (lô L10, chương 37) | `chotSai` **17 → 19** | `37069090` — **chốt sai sang mã khác `37069040`**, 2 ca cùng một mã |

Cả hai PR đều có mặt tích cực thật (`chotDung` +34 và +84). Cổng không nói "PR xấu" — cổng nói
**`chotSai`/`chotLoaiKhacSai` không được tăng, tổng VÀ từng loại ca**. Thêm ca đúng không mua được quyền
thêm ca chốt sai: với người khai, **trích sai mã tệ hơn không trích**.

Ba điều rút ra, áp cho mọi PR sửa `data/`:

1. **Đo hai mốc tại chỗ, cùng nhịp** — một trên `origin/main` **vừa fetch**, một trên bản gộp thử.
   `main` ở repo này tiến từng phút; **mốc lưu sẵn là mốc sai**. Ở nhịp 11/11, thợ đo nền `ade04cd0`
   ra `chotSai` 12 còn nền thật lúc soát (`9e1c171e`) là **17** — chênh lệch của thợ đúng, mốc tuyệt
   đối thì lệch, và nếu lấy mốc cũ làm chuẩn thì +2 kia chìm luôn.
2. **So từng loại ca, không chỉ so tổng.** Dùng `--json` rồi so `theoLoai`; tổng có thể phẳng trong khi
   một loại tăng và một loại giảm.
3. **So `chiTietLoi` theo khoá `hs8|loaiCa`** để ra **danh sách ca** hỏng, không chỉ con số. Đó là cách
   duy nhất tìm ra 4 ca trên, và là thứ dán lên PR để người vá khỏi dò lại:

   ```bash
   node scripts/bo-kiem-luat.mjs --toan-bieu --json > /tmp/nen.json   # trên origin/main
   node scripts/bo-kiem-luat.mjs --toan-bieu --json > /tmp/pr.json    # trên bản gộp thử
   # rồi so hai tệp theo khoá hs8|loaiCa, in ca MỚI và ca ĐỔI kết quả
   ```

Thẻ vá: OZV-325. Khi một họ tệp (`data/ho-so/ranh-gioi/`) có nhiều PR mở song song thì **dừng gộp cả họ**
cho tới khi từng PR có hai mốc — vì chúng hỏng theo cùng một kiểu.

**Không tự gộp PR do chính mình viết.** Người thứ hai soát độc lập + dán biên bản; cú `gh pr merge` vẫn
do giám đốc dự án bấm sau khi có biên bản ĐẠT và CI xanh **trên commit cuối** (kiểm `head_sha` khớp —
đừng dùng số ca của commit trước làm bằng chứng cho commit mới). Chuẩn chốt ở OZV-283/OZV-290.

Xem thêm: `docs/MERGE-PROCEDURE.md` (PR có sửa `data/precedents.json`).
