# M-81 · Phiếu 2: đo mù vòng 2, Gemini soạn 4 nhóm mới (chấm Đúng/Sai `0/0/0`)

Thẻ #2410 · ADR-0008/0009/0010 · theo lời giao của QT (bình luận 27/11 13:49Z, cập nhật chuẩn chấm Đúng/Sai `ADR-0010` ngày 28/11). Nhóm 85.16, 94.05, 84.71, 40.16; vàng `docs/mong/the/M-81-vang-{8516,9405,8471,4016}.md` (#2436, #2437, #2434, #2435). **Chỉ là dữ liệu chấm**, không nạp vào `data/ho-so-ma/`.

## Cách làm (C', như vòng 1)

- Gemini 4 Hydrogen, mức nghĩ Cao, Studio chế độ chat; tắt Tìm kiếm Google, URL context, thực thi mã, gọi hàm. Mỗi nhóm một chat mới.
- Đề = `HUONG_DAN_TACH_DIEU_KIEN` + **skill `doc-tron-nhom` trên main dùng thẳng** (sha256 trong `nen.txt`, main `6a76f231b`) + gói nhóm `goi-nhom` (`khongChia`). Dựng bằng `p2.mjs de <nhóm>`; vân tay đề ở `sha256.txt`, đề lưu `.131:~/phieu2/de-*.txt`.
- **Kiểm mù:** phần hệ thống + skill có 0 lần mã của 16 nhóm vàng (12 cũ + 4 mới) ở mọi dạng, 0 chữ "vàng". Trong `scripts/test-dieu-kien.mjs` và 12 vàng cũ, 4 mã mới chỉ xuất hiện ở **chữ luật dẫn chiếu** của nhóm khác (vd. 85.01 "dùng cho hàng hoá nhóm … 85.16", 87.08 loại trừ 40.16, 73.26 loại trừ 94.05, 85.17 dẫn 84.71), không phải nội dung vàng mới; các tệp này không vào đề.
- **Bộ lọc chép lại của Google** cắt câu trả lời nhiều lần dù đã thay dấu cách trong `trich` bằng `¦`. Cách đã dùng (chỉ đổi định dạng, không đổi nội dung đề):
  - 94.05: hai lần chỉ ra `{`; chat mới với lời dặn thay `¦` cho **mọi** chuỗi giá trị → trọn vẹn.
  - 85.16: cắt ở nút `bieu:85169040`; viết tiếp hai lần vẫn bị cắt đúng chỗ đó → bỏ qua vế 2 của nút này; giaiChong lấy ở lượt viết tiếp; **canhTranh mất** (bị cắt). Bản ghép: `goc/tra-8516.txt`.
  - 84.71, 40.16: trọn vẹn lượt đầu.
- Trả lời gốc của Gemini: `goc/tra-<nhóm>.txt`. Chuẩn hoá: `p2.mjs nap` (qua `chuanHoaGoiNhom`). Chấm nhị phân Đúng/Sai (`ADR-0010`): một trợ lý Claude so theo nút và nghĩa luật (`cham/`), mọi mục `một phần`, `thiếu`, `sai phạm vi`, `sai nghĩa` đều tính là điều kiện **Sai**, không tính điểm trung bình thập phân và không báo phần trăm. Lỗi HO_PHU cổng 7 và chọn sớm cổng 10 lúc đo (đã giao agy sửa) **không** tính vào lỗi Gemini.

## ⚠ Lỗi máy lúc đo ban đầu: chuẩn hoá âm thầm bỏ điều kiện (đã sửa ở #2447)

Trước #2447, `tach-dieu-kien.mjs` (vòng gộp chunk, khoá `nut|ve|phu|nguon|trich`) coi các điều kiện **khác nhau** nhưng cùng một câu trích là trùng và bỏ, **không ghi lỗi**. Ở `khongChia` không có chunk chồng nhau mà vẫn mất:

| Nhóm | Gemini viết | Sau chuẩn hoá cũ (a) |
|---|---|---|
| 94.05 | 185 | 121 |
| 85.16 | 97 | 83 |
| 84.71 | 81 | 74 |
| 40.16 | 63 | 63 |

Vì vậy bảng chấm dưới đây ghi cả hai bộ để truy vết: **(a)** sau chuẩn hoá cũ trước #2447, **(b)** theo bản gốc Gemini (trùng byte với bản chuẩn hoá đã sửa ở `chuan-hoa-lai.md`). Kết quả cổng trong `cong/` chạy trên bản (a); bản gốc chạy ở `cong-goc/`.

## Bảng chấm Đúng/Sai (số đếm nguyên)

| Nhóm | ĐK vàng | Đúng (a) → (b) | Sai = `một phần` + `thiếu` + `sai nghĩa` (a) → (b) | Cặp chồng vàng: tìm / sót (a) → (b) | Ca 3 ô: `ĐÚNG` / `CHƯA ĐỦ DỮ KIỆN` / `SAI` (b) | Sai nghĩa / sai phạm vi (a) → (b) |
|---|---|---|---|---|---|---|
| 85.16 | 51 | 41 | **11** (7 + 3 + 1) | 9: 9 / 0 | 42 / 15 / **8** (65 ca) | 1 (`8516:8108`) |
| 84.71 | 62 | 43 → 46 | **19** (15 + 4 + 0) → **16** (15 + 1 + 0) | 6: 6 / 0 | 27 / 16 / **4** (47 ca) | 0 |
| 40.16 | 64 | 40 | **24** (22 + 2 + 0) | 10: 3 / **7** | 25 / 13 / 0 (38 ca) | 0 |
| 94.05 | 105 | 84 → 85 | **28** (17 + 4 + 7) → **20** (18 + 2 + 0) | 39: 10 / **29** → 31 / **8** | 13 / 28 / 0 (41 ca) | 7 → 0 |
| **Gộp** | **282** | **208 → 212** | **82** (61 + 13 + 8) → **71** (62 + 8 + 1) | **64: 28 / 36 → 49 / 15** | **107 / 72 / 12** (191 ca) | **8 → 1** |

- **Điều kiện sai trên bản gốc (b):** `71` điều kiện sai (`62` một phần + `8` thiếu + `1` điều kiện thừa gán sai phạm vi/sai nghĩa `8516:8108`; đối với `282` điều kiện vàng có `212` đúng và `70` sai, cộng `1` điều kiện loại trừ đặt sai phạm vi ở `8516:8108`). Ở bản (a), `7` sai nghĩa của `94.05` do chuẩn hoá cũ bỏ ¬kim loại cơ bản / +nơi công cộng khỏi vế khai triển De Morgan của `"trừ …"` (xem `cham/9405.md`).
- **Cặp chồng sót trên phiếu:** (a) `36/64` cặp · (b) **`15/64` cặp**.
- **Ca thử trên bản (a) → (b):** (a) `107 / 70 / 14` (`191` ca) → (b) **`107 / 72 / 12`** (`191` ca).

## So ngưỡng `0/0/0` theo `ADR-0010` (CEO chốt 28/11)

| Hạng mục ngưỡng `0/0/0` | Ngưỡng đạt | Chuẩn hoá cũ (a) | Bản gốc Gemini (b) |
|---|---|---|---|
| Điều kiện sai (`một phần` + `thiếu` + `sai phạm vi` + `sai nghĩa`) | `0` | `82` (`74 + 8 sai nghĩa`) ✘ | `71` (`70 + 1 sai nghĩa`) ✘ |
| Ca ra đích sai | `0` | `14` ✘ | `12` ✘ |
| Cặp chồng sót (chỉ phiếu) | `0` | `36` ✘ | `15` ✘ |

- **Kết luận: `KHÔNG ĐẠT` ở cả 4/4 nhóm** (không nhóm nào có `0` điều kiện sai; `85.16` và `84.71` ra thẳng mã đích sai không dừng hỏi; `40.16` và `94.05` sót cặp chồng).
- **Tác động thực tế theo chuẩn báo cáo CEO (`#2410#issuecomment-7231147427`):**
  - Bản gốc Gemini (b): **`12/191 ca ra mã sai, tức cứ khoảng 16 lần dùng có 1 lần khai sai`** (bản chuẩn hoá cũ trước #2447: `14/191 ca ra mã sai, tức cứ khoảng 14 lần dùng có 1 lần khai sai`).

## Điểm yếu lặp lại

1. **VUNG_CHONG vẫn 0** (như vòng 1): không phát hiện cặp chồng theo mặt hàng cụ thể (40.16: 3, 94.05: 7).
2. **Chữ "khác" / "Loại khác"** đọc không đều: thiếu (4016995, 4 cặp), quá rộng (401695), sai phạm vi (`8516:8108`).
3. **Gộp nguyên tử**: Chú giải 6(A)/6(C) 84.71; "tín hiệu + không nhấp nháy + sân bay" 94.05; "tấm + ghép" 40.16.
4. **Trục dựng lệch**: 85.16 mọi trục đơn trị (máy chứng minh rời 33 cặp luật không cho rời); 40.16/94.05 mỗi anh em một trục riêng (mất phép rời của vàng).
5. **Thiếu loại trừ chung / chú giải bắt buộc & thiếu nhóm cạnh tranh ngoài gói**: CG1 Phần XVI, CG1 Ch.94; dây đèn Nô-en; 8516.60 mục (2) phần (E); gói `84.71` thiếu nhóm cạnh tranh `85.23` do luật không nhắc số nhóm `84.71` (dẫn tới sửa máy dựng gói kéo `canhTranhTimThay` và Cổng 13 theo `ADR-0010`).
6. **Dùng chung `trich`** cho nhiều điều kiện trong một vế.

## Tệp

`goc/` trả lời gốc · `jsonl-goc/`, `cong-goc/`, `soi/`, `soi.mjs` vòng 2b · `jsonl/` sau chuẩn hoá cũ · `cham/` chấm chi tiết + `tong.json` (tệp lịch sử không sửa, khoá `*_goc` = bộ b) · `cong/` cổng 6–12 (bộ a) · `p2.mjs`, `sha256.txt`, `nen.txt`.

## Vòng 2b (lịch sử truy vết, đã bãi bỏ khâu soi chấm chéo theo `ADR-0010` mục 6)

> **Lưu ý bắt buộc theo `ADR-0010` mục 6–8 (CEO phê 28/11, `#2410#issuecomment-7231263425`):**
> - Khâu soi bằng mô hình cục bộ yếu hơn (`Gemma` / `soi.mjs` / `soi-chong.mjs`) với vai người chấm và gói 212 phiếu người làm nghề chấm chéo **đã bãi bỏ**, không dùng làm căn cứ nghiệm thu (phần kiểm chồng số học tất định vẫn giữ trong Cổng 8; các mắt thiếu bằng chứng đi vào **Cổng 14 `ĐỦ CHUỖI`**).
> - Kết quả mỗi ca chỉ chấm theo **3 ô** (`ĐÚNG` / `SAI` / `CHƯA ĐỦ DỮ KIỆN`), đối chiếu ngưỡng nhị phân **`0/0/0`** (`0` điều kiện sai · `0` ca ra đích sai · `0` cặp chồng sót), và báo cáo theo dạng *"dùng N lần thì mấy lần ra kết quả sai"* (không dùng phần trăm).
> - Số liệu Vòng 2b dưới đây chỉ giữ dạng số đếm nguyên để lưu vết lịch sử phép thử ngày 27/11.

- **Mô hình từng thử ngày 27/11:** Gemma 4 31B (`soi.mjs`, 55 bảng anh em). Kết quả thô lịch sử: `soi/soi-<nhóm>-gemma4_31b.json`.
- **Phiếu đem thử = bản gốc Gemini** (bộ b): `jsonl-goc/`; cổng 6–12 trên bản này: `cong-goc/` (`*-c8-du.txt` = cổng 8 in đủ cảnh báo).
- Bảng truy vết lịch sử theo thứ tự: (1) phiếu giải → (2) soi chỉ ra → (3) cổng 8 cảnh báo → (4) sót cả dây chuyền. Chi tiết `cham/soi-2b.md`.

| Nhóm | Cặp vàng | (1) phiếu | (2) soi | (3) cổng 8 | (4) sót | Sót sau soạn+soi | Sót sau +cổng 8 | Soi chồng đúng / thừa | Soi hở đúng / sai |
|---|---|---|---|---|---|---|---|---|---|
| 85.16 | 9 | 9 | 0 | 0 | 0 | 0/9 | 0/9 | 1 / 0 | 1 / 0 |
| 84.71 | 6 | 6 | 0 | 0 | 0 | 0/6 | 0/6 | 4 / 0 | 1 / 0 |
| 40.16 | 10 | 3 | 1 | 6 | 0 | 6/10 | 0/10 | 3 / 1 | 0 / 0 |
| 94.05 | 39 | 31 | 5 | 1 | **2** | 3/39 | **2/39** | 10 / 2 | 0 / 0 |
| **Gộp** | **64** | **49** | **6** | **7** | **2** | **9/64** | **2/64** | **18 / 3** | **2 / 0** |

- Soi bắt 6/15 cặp phiếu bỏ sót (940591×940592; "đốt dầu"×đèn bão/đèn thợ mỏ; "đèn pha"×đèn tàu .41/.42; 4016991×4016995). Không bắt 3 cặp "xe đạp có động cơ phụ trợ" và 3/4 cặp "khác" quanh 4016995 (40.16) — các cặp này chỉ cổng 8 cảnh báo (trong tổng 52 cảnh báo cổng 8 ở 40.16).
- **2 cặp chồng vẫn sót qua cả dây chuyền** (94.05): `94059120×94059150`, `94059220×94059230` — bộ phận đèn pha khi đèn pha cũng là đèn rọi. Gốc: Gemini để trục "loại đèn dùng bộ phận" đơn trị (vàng đa trị) → máy coi rời, cổng 8 im, soi không nêu.

### Kết luận Vòng 2b theo ngưỡng `0/0/0` (`ADR-0010`)

| Hạng mục ngưỡng `0/0/0` | Ngưỡng đạt | Kết quả Vòng 2b (bộ b) |
|---|---|---|
| Điều kiện sai (`một phần` + `thiếu` + `sai phạm vi` + `sai nghĩa`) | `0` | **`71`** (`70 + 1 sai nghĩa`) ✘ |
| Ca ra đích sai | `0` | **`12`** (`12/191` ca) ✘ |
| Cặp chồng sót | `0` | **`15`** trên phiếu (`9` sau soạn+soi · **`2`** sau cả cổng 8) ✘ |

**Kết luận: `KHÔNG ĐẠT`** — còn `71` điều kiện sai (`70 + 1 sai nghĩa`), `15/64` cặp chồng sót trên phiếu (`2/64` cặp lọt qua cả cổng 8), và **`12/191 ca ra mã sai, tức cứ khoảng 16 lần dùng có 1 lần khai sai`**. Hàng đợi cuốn chiếu dừng để sửa máy dựng gói (`canhTranhTimThay`), mở Cổng 13 (`PHỦ CẠNH TRANH`) & Cổng 14 (`ĐỦ CHUỖI`), rồi đo lại các ca sai theo `ADR-0010`.
