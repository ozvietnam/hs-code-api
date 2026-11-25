# Báo cáo M-35 — Đổi mã nguồn cũ sang id nút luật (#1916)

Ngày: 25/11/2026 · Nhánh: `mong/m-35-zcode` · Khuôn: `nut-luat@1`, bảng đổi `doi-ma@1`.

## 1. Kho nguồn dựng bảng (theo chỉ dẫn QT)

| Kho | Nguồn | Commit |
|---|---|---|
| gir (54 nút) | origin/main | `37406527` |
| chuong (2.439 nút, M-13) | origin/main | `37406527` |
| bieu (21.478 nút, M-18) | origin/main | `37406527` |
| phan (293 nút, M-11) | origin/mong/m-11-phan | `e5a1658c` |
| phan-nhom (482 nút, M-15) | origin/mong/m-15-phan-nhom | `fa336f90` |
| sen (730 nút, M-16) | origin/mong/m-16-sen | `8f9fc03e` |
| nhom (1.231 nút, M-14) | mong/m-14-zcode — **bản tạm** | `1dd2dadc` |

Kho trích được kiểm kê: `data/luat/dieu-khoan-tang2.json` (1.597 dòng), `dieu-khoan-bo-sung.json` (24), `data/so-tay/*.json`, `data/do-thi/*.json` + `ban-do-4so/*.json`, `data/ho-so/ranh-gioi/*.json` (3.788 tệp).

## 2. Số đếm theo từng kiểu mã cũ

| Kiểu mã cũ | Lượt trích | Trích riêng | Đổi được | Luật cũ |
|---|---:|---:|---:|---:|
| `tax.NNNNNNNN` → `bieu:NNNNNNNN` | 19.815 | 11.720 | 11.720 | 0 |
| `ct.NNNN.M` → `nhom:NNNN:ct:M` (lạc chỗ → tìm lại) | 9.744 | 8.208 | 8.119 | 89 |
| `nhomNNNN.nhom` → `nhom:`/`pn:`/`bieu:`/`sen:` | 10.683 | 7.115 | 7.004 | 111 |
| `tieuDe.NNNNNN` → `bieu:NNNNNN` | 2.464 | 1.379 | 1.377 | 2 |
| `chuong:NN:chu_giai…` → `chuong:NN:cg…` | 2.047 | 1.659 | 1.561 | 98 |
| `chNN.chuong` (trích định vị) | 1.290 | 697 | 594 | 103 |
| `phan:NN:chu_giai…` → `phan:<La Ma>:cg…` | 375 | 343 | 211 | 132 |
| `sen.NNNNNNNN` → `sen:NNNNNNNN:N` | 316 | 168 | 166 | 2 |
| `phanNN.phan` (tìm trích) | 123 | 92 | 61 | 31 |
| `px16.cgK[.d]` → `phan:XVI:cg:K[.d]` | 34 | 15 | 11 | 4 |
| `tuongUng.NNNNNNNN` → `bieu:NNNNNNNN` | 10 | 6 | 6 | 0 |
| **Cộng trong phạm vi** | **46.901** | **31.402** | **30.830** | **572** |

Cách đọc cột "đổi được": trích cũ tìm thấy NGUYÊN VĂN trong nút mới, theo phép ghi ở `kiem` của từng dòng:
`nguyenVan` 16.885 · `boMaDau` (trích tax. dính mã đầu dòng) 11.395 · `tonTai` (mã dòng biểu còn, trích không phải tên dòng) 1.330 · `gachDoan` (trích có "…", từng mảnh ≥ 20 ký tự thấy nguyên văn) 1.173 · `cuChuaNut` (trích dính đoạn kết — dòng QT cảnh báo) 34 · `boSoTrang` 7 · `boTienTo` 6. Phép làm phẳng giống `kiem-luat-goc.mjs` (NFC, nối dòng, khoảng trắng quanh dấu nối) cộng gộp biến thể ngoặc kép; không thay một chữ nào trong trích.

Ngoài phạm vi (không phải nút luật, không đổi): `wco.*` 4.178 lượt (chưa có kho wco.jsonl — chờ thẻ lớp 1); nhãn thô `bieu`/`oz`/`tb` không mang mã 21.314 lượt; `nhomNN.phan_biet|tinh_chat` 19 lượt (lớp 2 bỏ khỏi kho luật); `vb.*` 2 lượt.

## 3. Cảnh báo QT đã xử lý đúng lớp

- **361 dòng TỔNG QUÁT gắn nhãn chú giải**: 377 dòng `dieu-khoan-tang2.json` đổi sang `:kq:` (lớp HUONG_DAN) — số cao hơn 361 một chút vì đếm theo trích đã làm phẳng gộp/tách khác nhãn của QT; toàn kho có 743 dòng các kiểu mã trỏ về `:kq:`. Không dòng nào về `:kq:` mà còn lớp LUAT.
- **`phan:NN` cũ ghi số CHƯƠNG, không phải số Phần** (06→Phần II, 28→VI, 50→XI, 72→XV, 84/86→XVI): bảng đổi theo TRÍCH nên vẫn trỏ đúng nút Phần (vd `phan:06:chu_giai:1` → `phan:II:cg:1`).
- **Dòng dính đoạn kết** (26 dòng QT cảnh báo): 37 dòng được ghi chế độ `cuChuaNut` — trích bắt đầu bằng toàn bộ nút đúng, dính đuôi câu dẫn của khoản khác; không sửa trích.

## 4. Chỗ thiếu, chỗ lệch (danh sách `luatCu` — cạnh dựng trên luật cũ, KHÔNG xoá, KHÔNG sửa)

572 trích không còn thấy nguyên văn trong bản 2022, phân loại:

- **Bản dịch cũ khác chữ** (đa số `phan:`, `phanNN.phan`, `chNN.chuong`, `nhomNN.nhom`): ví dụ Phần XI "các trường hợp được áp dụng xuyên suốt Danh mục" (cũ) vs "cũng như một số trường hợp thuộc Danh mục này" (2022); `px16` cũ "bộ phận đã được **định danh**" vs 2022 "đã được **chi tiết**".
- **Trích ghép nhiều nút** (khoản + điểm dính nhau, không thấy nguyên văn trong MỘT nút): `ch01.chuong`, `ch02.chuong`… trích "Chương này bao gồm… trừ: (a) …".
- **Mã không còn trong biểu 2026**: `tieuDe.9849121`, `tieuDe.9849131` (Chương 98 đổi mã).
- **SEN đổi bản**: `sen.52091110`, `sen.70189010` (2 dòng).
- **Gần khớp, chờ thẻ kho soát** (ghiChu trong `luatCu`): `chuong:74:chu_giai:1a` ≈ `chuong:74:cg:1:a`, `chuong:76:chu_giai_phan_nhom:1a` ≈ `chuong:76:cgpn:1:a` — lệch vài ký tự, nghi lỗi chữ bản in; không dùng gần-khớp làm căn cứ đổi.
- **`chu_giai_bs` (khoản bổ sung VN) 5 dòng vào luật cũ**: ngữ pháp `nut-luat@1` hiện chỉ có `cgbs` dưới `chuong:`; khi M-13/M-11 bổ sung nút cgbs, chạy lại bộ dựng là các dòng này tự về đúng chỗ.

## 5. Cổng máy

- `node scripts/test-doi-ma-nguon.mjs` — 48/48 PASS: id đích hợp ngữ pháp, đích có thật + trích thấy được theo chế độ `kiem` với mọi kho có mặt trên nhánh (15.258 dòng gir/chuong/bieu), thống kê khớp đếm thật, hàm đổi đúng 11 kiểu + LUAT_CU + KHONG_RO, ca ngược không bịa.
- `npm test` — ALL TESTS PASSED (exit 0).
- Mo-đun `lib/do-thi/doi-ma-nguon.js` đã khai ở `data/luat/dau-noi.json` (kho.bangCanh.moDun) theo luật QT.

## 6. Việc QT cần biết khi soát

1. `data/luat/dau-noi.json` và tệp báo cáo này nằm ngoài 4 tệp sở hữu của M-35 trong `docs/mong/phan-cong.json` — QT cần thêm `data/luat/dau-noi.json` và `docs/mong/the/M-35-*.md` vào `tep` của M-35 (hoặc gộp rồi tự sửa), nếu không cổng phạm vi thẻ đỏ 2 tệp này.
2. Kho nhom dùng bản tạm `1dd2dadc`: khi QT gộp M-14 (và M-11/15/16), chạy `node lib/do-thi/doi-ma-nguon.js --xay-dung` để dựng lại bảng, rồi commit trong cùng PR.
3. Trích lưu trong bảng cắt 200 ký tự (đã làm phẳng): hai trích chỉ khác nhau sau ký tự thứ 200 gộp về một dòng — dòng bảng đổi thắng danh sách luật cũ (107 dòng gộp, 8 dòng luật cũ trùng khóa được hấp thụ).

## Dựng lại trên kho theo đoạn (QT, 25/11 23:50)

Kho `nhom.jsonl` tách theo đoạn in nên một trích cũ có thể trải nhiều nút. Thêm phép `nhieuNut` (nối nguyên văn các nút liền nhau theo thứ tự in; `moi` + `moiKem`). Kết quả: đổi được 31.063 / 31.402 trích (1.343 trích nhiều nút), còn **339 trích luật cũ** (bản trước ghi 572).
