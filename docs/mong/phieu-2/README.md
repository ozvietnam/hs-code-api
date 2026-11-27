# M-81 · Phiếu 2: đo mù vòng 2, Gemini soạn 4 nhóm mới

Thẻ #2410 · theo lời giao của QT (bình luận 27/11 13:49Z). Nhóm 85.16, 94.05, 84.71, 40.16; vàng `docs/mong/the/M-81-vang-{8516,9405,8471,4016}.md` (#2436, #2437, #2434, #2435). **Chỉ là dữ liệu chấm**, không nạp vào `data/ho-so-ma/`.

## Cách làm (C', như vòng 1)

- Gemini 4 Hydrogen, mức nghĩ Cao, Studio chế độ chat; tắt Tìm kiếm Google, URL context, thực thi mã, gọi hàm. Mỗi nhóm một chat mới.
- Đề = `HUONG_DAN_TACH_DIEU_KIEN` + **skill `doc-tron-nhom` trên main dùng thẳng** (sha256 trong `nen.txt`, main `6a76f231b`) + gói nhóm `goi-nhom` (`khongChia`). Dựng bằng `p2.mjs de <nhóm>`; vân tay đề ở `sha256.txt`, đề lưu `.131:~/phieu2/de-*.txt`.
- **Kiểm mù:** phần hệ thống + skill có 0 lần mã của 16 nhóm vàng (12 cũ + 4 mới) ở mọi dạng, 0 chữ "vàng". Trong `scripts/test-dieu-kien.mjs` và 12 vàng cũ, 4 mã mới chỉ xuất hiện ở **chữ luật dẫn chiếu** của nhóm khác (vd. 85.01 "dùng cho hàng hoá nhóm … 85.16", 87.08 loại trừ 40.16, 73.26 loại trừ 94.05, 85.17 dẫn 84.71), không phải nội dung vàng mới; các tệp này không vào đề.
- **Bộ lọc chép lại của Google** cắt câu trả lời nhiều lần dù đã thay dấu cách trong `trich` bằng `¦`. Cách đã dùng (chỉ đổi định dạng, không đổi nội dung đề):
  - 94.05: hai lần chỉ ra `{`; chat mới với lời dặn thay `¦` cho **mọi** chuỗi giá trị → trọn vẹn.
  - 85.16: cắt ở nút `bieu:85169040`; viết tiếp hai lần vẫn bị cắt đúng chỗ đó → bỏ qua vế 2 của nút này; giaiChong lấy ở lượt viết tiếp; **canhTranh mất** (bị cắt). Bản ghép: `goc/tra-8516.txt`.
  - 84.71, 40.16: trọn vẹn lượt đầu.
- Trả lời gốc của Gemini: `goc/tra-<nhóm>.txt`. Chuẩn hoá: `p2.mjs nap` (qua `chuanHoaGoiNhom`). Chấm: một trợ lý Claude so theo nút và nghĩa luật (`cham/`), cột như vòng 1. Lỗi HO_PHU cổng 7 và chọn sớm cổng 10 (đang sửa, giao agy) **không** tính vào điểm Gemini.

## ⚠ Lỗi máy: chuẩn hoá âm thầm bỏ điều kiện

`tach-dieu-kien.mjs` (vòng gộp chunk, khoá `nut|ve|phu|nguon|trich`) coi các điều kiện **khác nhau** nhưng cùng một câu trích là trùng và bỏ, **không ghi lỗi**. Ở `khongChia` không có chunk chồng nhau mà vẫn mất:

| Nhóm | Gemini viết | Sau chuẩn hoá |
|---|---|---|
| 94.05 | 185 | 121 |
| 85.16 | 97 | 83 |
| 84.71 | 81 | 74 |
| 40.16 | 63 | 63 |

Vì vậy bảng chấm có hai bộ: **(a)** sau chuẩn hoá (như máy nạp), **(b)** theo bản gốc Gemini. Kết quả cổng trong `cong/` chạy trên bản (a). Gemini dùng chung một `trich` cho nhiều điều kiện trong cùng vế cũng là điểm yếu (trích phải là câu chống cho đúng điều kiện đó), nhưng máy không được bỏ im lặng.

## Bảng chấm

| Nhóm | ĐK vàng | Khớp / một phần / thiếu (a) → (b) | Tỉ lệ (a) → (b) | Cặp vàng: tìm / sót (a) → (b) | Ca đúng / dừng hỏi / sai (b) | Sai nghĩa (a) → (b) |
|---|---|---|---|---|---|---|
| 85.16 | 51 | 41/7/3 | 0,873 | 9: 9/0 | 42 / 15 / 8 | 1 |
| 84.71 | 62 | 43/15/4 → 46/15/1 | 0,815 → 0,863 | 6: 6/0 | 27 / 16 / 4 | 0 |
| 40.16 | 64 | 40/22/2 | 0,797 | 10: 3/7 | 25 / 13 / 0 | 0 |
| 94.05 | 105 | 84/17/4 → 85/18/2 | 0,881 → 0,895 | 39: 10/29 → 31/8 | 13 / 28 / 0 | 7 → 0 |

- **Trung bình mù:** (a) 0,84 · (b) **0,86**. Vòng 1 mù: 0,72.
- **Sót chồng gộp:** (a) 36/64 = 56% · (b) 15/64 = **23%**.
- **Sai nghĩa (b): 1.** 85.16 `8516:8108`: loại trừ "không dùng trong gia đình → 84.19" gắn cho cả nhóm, luật chỉ áp vế 5. 7 sai nghĩa của 94.05 ở (a) do chuẩn hoá bỏ ¬kim loại cơ bản / +nơi công cộng khỏi vế khai triển De Morgan của "trừ …" (xem `cham/9405.md`).

## So ngưỡng mở cuốn chiếu

| Ngưỡng | (a) | (b) |
|---|---|---|
| TB ≥ 0,85 | 0,84 ✘ | 0,86 ✔ |
| Không nhóm < 0,75 | min 0,797 ✔ | ✔ |
| Sót chồng ≤ 10% | 56% ✘ | 23% ✘ |
| 0 sai nghĩa | 8 ✘ | 1 ✘ |

**Chưa đạt ngưỡng mở cuốn chiếu**, kể cả theo bản gốc: còn sót chồng (VUNG_CHONG 0/10 ở 40.16 + 94.05) và một sai nghĩa.

## Điểm yếu lặp lại

1. **VUNG_CHONG vẫn 0** (như vòng 1): không phát hiện cặp chồng theo mặt hàng cụ thể (40.16: 3, 94.05: 7).
2. **Chữ "khác" / "Loại khác"** đọc không đều: thiếu (4016995, 4 cặp), quá rộng (401695), sai phạm vi (8516:8108).
3. **Gộp nguyên tử**: Chú giải 6(A)/6(C) 84.71; "tín hiệu + không nhấp nháy + sân bay" 94.05; "tấm + ghép" 40.16.
4. **Trục dựng lệch**: 85.16 mọi trục đơn trị (máy chứng minh rời 33 cặp luật không cho rời); 40.16/94.05 mỗi anh em một trục riêng (mất phép rời của vàng).
5. **Thiếu loại trừ chung / chú giải bắt buộc**: CG1 Phần XVI, CG1 Ch.94; dây đèn Nô-en; 8516.60 mục (2) phần (E).
6. **Dùng chung `trich`** cho nhiều điều kiện trong một vế.

## Tệp

`goc/` trả lời gốc · `jsonl-goc/`, `cong-goc/`, `soi/`, `soi.mjs` vòng 2b · `jsonl/` sau chuẩn hoá · `cham/` chấm chi tiết + `tong.json` (khoá `*_goc` = bộ b) · `cong/` cổng 6–12 (bộ a) · `p2.mjs`, `sha256.txt`, `nen.txt`.

## Vòng 2b: khâu soi (ADR-0008) — sót chồng của dây chuyền soạn + soi + cổng 8

QT 27/11 (#2410): sót chồng là việc của **khâu soi** + cổng 8, ngưỡng áp cho dây chuyền.

- **Người soi:** Gemma 4 31B (Ollama máy GPU nhà, hãng khác Gemini), `soi.mjs`: mỗi bảng anh em một lượt (55 bảng, 3–57 giây/bảng), chỉ đưa điều kiện đã soạn của dòng cha + các anh em; hỏi hẹp CHỒNG (có mặt hàng ví dụ) và HỞ. Kết quả thô: `soi/soi-<nhóm>-gemma4_31b.json` (kèm prompt từng bảng).
- **Phiếu đem soi = bản gốc Gemini** (bộ b): nạp ở kho tạm có khoá gộp sửa cục bộ (`JSON.stringify(d)`, không đẩy lên), `jsonl-goc/`; cổng 6–12 trên bản này: `cong-goc/` (`*-c8-du.txt` = cổng 8 in đủ cảnh báo).
- Chấm: mỗi cặp chồng vàng xếp vào một ô theo thứ tự (1) phiếu giải → (2) soi chỉ ra → (3) cổng 8 cảnh báo → (4) sót cả dây chuyền. Chi tiết `cham/soi-2b.md`.

| Nhóm | Cặp vàng | (1) phiếu | (2) soi | (3) cổng 8 | (4) sót | Sót A soạn+soi | Sót B +cổng 8 | Soi chồng đúng / thừa | Soi hở đúng / sai |
|---|---|---|---|---|---|---|---|---|---|
| 85.16 | 9 | 9 | 0 | 0 | 0 | 0% | 0% | 1 / 0 | 1 / 0 |
| 84.71 | 6 | 6 | 0 | 0 | 0 | 0% | 0% | 4 / 0 | 1 / 0 |
| 40.16 | 10 | 3 | 1 | 6 | 0 | 60% | 0% | 3 / 1 | 0 / 0 |
| 94.05 | 39 | 31 | 5 | 1 | 2 | 7,7% | 5,1% | 10 / 2 | 0 / 0 |
| **Gộp** | **64** | **49** | **6** | **7** | **2** | **14,1%** | **3,1%** | **18 / 3** | **2 / 0** |

- Soi bắt 6/15 cặp phiếu bỏ sót (940591×940592; "đốt dầu"×đèn bão/đèn thợ mỏ; "đèn pha"×đèn tàu .41/.42; 4016991×4016995). Không bắt 3 cặp "xe đạp có động cơ phụ trợ" và 3/4 cặp "khác" quanh 4016995 (40.16) — các cặp này chỉ cổng 8 cảnh báo.
- **Cổng 8 nhiễu:** 40.16 có 52 cảnh báo, chỉ 6 là cặp vàng chưa giải. Bộ B dựa vào cảnh báo này nên là cận dưới lạc quan; người duyệt phải lọc 52 → 6.
- **2 cặp sót cả dây chuyền** (94.05): 94059120×94059150, 94059220×94059230 — bộ phận đèn pha khi đèn pha cũng là đèn rọi. Gốc: Gemini để trục "loại đèn dùng bộ phận" đơn trị (vàng đa trị) → máy coi rời, cổng 8 im, soi không nêu.
- Soi thừa 3 (thảm ghép hình 40169110×40169120; ví dụ không phải đèn 94053×940550; "Loại khác" 94054910×94054990). 2 chỗ hở soi nêu đều đúng ([85163] "kể cả" bị viết thành điều kiện hạn chế; [84714] máy chỉ có CPU — vàng cũng giữ HO_PHU chủ đích).

### So ngưỡng cho dây chuyền (bộ b)

| Ngưỡng | Kết quả |
|---|---|
| TB ≥ 0,85 | 0,86 ✔ |
| Không nhóm < 0,75 | min 0,797 ✔ |
| Sót chồng ≤ 10% | A (soạn+soi) 14,1% ✘ · B (+cổng 8) 3,1% ✔ |
| 0 sai nghĩa | 1 ✘ (85.16 `8516:8108`; khâu soi chồng/hở không soi sai nghĩa) |

**Dây chuyền soạn + soi + cổng 8 đạt 3/4 ngưỡng; còn 1 sai nghĩa.** Hai điều kiện để tính kết quả này: sửa khoá gộp `tach-dieu-kien.mjs` (đang giao agy), và cổng 8 cần cách lọc cảnh báo (52 → 6 ở 40.16) để người duyệt không chìm.
