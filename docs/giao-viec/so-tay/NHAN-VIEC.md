# Nhận việc — số hoá ranh giới PN6 lát 2 (#577 tiếp)

> Dành cho agent mới vào nhận một mã. Danh sách 100 PN6: `data/ho-so/lat-2.json` (sinh bằng `node scripts/lap-lat-2.mjs`),
> bám theo sổ tay nhóm 4 số đã có. Mỗi PN6 là một issue `[lát 2]` nhãn `job`.

## 1. Đọc trước khi làm (đúng thứ tự)

1. [`BANG-LUAT-CHUNG.md`](BANG-LUAT-CHUNG.md) — chữ biểu thuế → cách viết đúng, sai hay gặp.
2. [`QUY-TRINH-SO-HOA.md`](QUY-TRINH-SO-HOA.md) — từng bước làm một PN6, các điểm DỪNG.
3. [`LUAT-CHUNG.md`](LUAT-CHUNG.md) — luật chi tiết, ví dụ, mã lỗi.

Không đọc `data/bench/*`, `data/oz-export/*`, `data/oz-gold-final.jsonl` (xem mục 0 của QUY-TRINH).

## 2. Chọn việc

- Mở danh sách issue có `[lát 2]` trong tiêu đề, nhãn `job`, còn mở và **chưa ai nhận** (không có comment `nhận …` còn hiệu lực).
- Lấy issue **nhỏ nhất** theo số thứ tự (số issue nhỏ trước, cũng là `thuTu` nhỏ trước trong `lat-2.json`).
- Comment đúng một dòng: `nhận <tên agent>`.
- **Quá 24 giờ** kể từ comment `nhận` mà chưa có PR thì người khác được nhận: comment `nhận <tên mình> (lượt trước quá 24h)`.

## 3. Làm

- **Một agent một mã**: không nhận hai issue cùng lúc, không gộp hai PN6 vào một PR.
- Bắt đầu: `git fetch origin main && git switch -c so-hoa/<pn6> origin/main`.
- Làm theo `QUY-TRINH-SO-HOA.md`; chỉ sửa đúng 2 tệp: `docs/giao-viec/so-tay/spec/<pn6>.json` và `data/ho-so/ranh-gioi/<pn6>.json` (máy sinh).
- Issue ghi "có tiền lệ" (cờ `canHieuChinhTienLe`): nếu `--goi` in `[CẦN BẢNG HIỆU CHỈNH TIỀN LỆ]` thì **dừng**, ghi vào issue, không ép cho xanh — việc đó do Claude giữ.
- Vướng ngoài bảng luật: `DUNG` có lý do, comment vào issue, không mở vòng sửa công cụ.
- Mở PR vào `main`, thân PR trỏ `Closes #<issue>`.

## 4. Soát

- Thợ **không tự duyệt, không tự merge** PR của mình.
- Người soát là một phiên **khác** phiên soạn, độc lập, dùng [`SOAT-RANH-GIOI.md`](SOAT-RANH-GIOI.md). Duyệt và merge do Claude.

## 5. Runner chuẩn `nhan-viec.sh` (duyệt 02/11 — bớt lỗi cơ khí)

Thợ chỉ soạn spec; phần còn lại chạy một lệnh (worktree + npm install riêng + nhận việc →
test exit-code đúng + chặn tệp ngoài quy định + PR đúng mẫu + dọn dẹp):

```bash
bash scripts/nhan-viec.sh mo  <pn6> <số issue>   # mở
# …soạn spec trong worktree theo QUY-TRINH-SO-HOA.md…
bash scripts/nhan-viec.sh nop <pn6> <số issue>   # nộp (PR; DỪNG tự draft)
```

Trước khi nhận việc lớn: xem bảng khoá còn thiếu `de-xuat-khoa-lat-2.md` (sinh bởi
`node scripts/quet-khoa-lat-2.mjs`) — PN6 nằm trong bảng ⇒ cân nhắc để Claude duyệt khoá @2 trước.
