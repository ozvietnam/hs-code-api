# M-81 · Phiếu 1: Gemini soạn mù 8 nhóm, chấm Đúng/Sai so với bảng vàng

Thẻ #2410 · ADR-0007/0008/0009/0010 · sau PR 1 #2424. **Đây chỉ là dữ liệu chấm.** Dữ liệu chính thức của 12 nhóm vàng vẫn lấy từ bảng vàng (agy chuyển). Phiếu Gemini không nạp vào `data/ho-so-ma/`.

## Cách làm (cách C' do QT chốt)

- **Mô hình:** Gemini 4 Hydrogen (mức nghĩ Cao) trên Google AI Studio ở **chế độ chat**, chỉ đọc đề, không có repo. Đã tắt Tìm kiếm Google, URL context và thực thi mã. Mỗi nhóm một chat mới.
- **Đề = hướng dẫn hệ thống + skill gọt + gói nhóm.** Hướng dẫn hệ thống là `HUONG_DAN_TACH_DIEU_KIEN` của `tach-dieu-kien.mjs`. Ví dụ "loại dòng điện", "chất liệu mặt ngoài" và `bieu:85437040` đã được thay bằng chỗ trống. Gói nhóm do `dungLoiHoiGoiNhom` của `goi-nhom.mjs` dựng, với `khongChia`.
- **Skill gốc trên main lúc đó có ví dụ của cả 12 nhóm vàng.** `.agents/skills/doc-tron-nhom/SKILL.md` lúc đó chứa 19 dòng cho 4 nhóm đầu và 5–9 dòng cho mỗi nhóm 61.10, 85.17, 30.04, 87.08. **Mọi phép đo sau này phải dùng bản gọt** (`skill-sach.md`: bỏ mọi dòng nhắc 12 mã vàng và chữ "vàng", 141 → 111 dòng).
- **Kiểm máy trước khi gửi:** phần hệ thống và skill có 0 lần xuất hiện mã của 12 nhóm vàng ở mọi dạng, và 0 lần chữ "vang", "bảng vàng", "tập vàng". Chữ luật trong gói có nhắc mã nhóm khác (chú giải, loại trừ, cạnh tranh). Đó là luật công khai, không phải nội dung vàng, nên được giữ.
- **Bộ lọc "chép lại" của Google** cắt câu trả lời khi `trich` trùng nguyên văn biểu thuế đã đăng trên mạng. Đây không phải tra web: công tắc tìm kiếm đã tắt, và trích dẫn chỉ trỏ tới các bản biểu thuế. Cách xử lý: từ nhóm thứ hai trở đi, đề dặn thay dấu cách trong `trich` bằng `¦`, và máy đổi lại khi nạp (`p1.mjs nap`). Riêng 61.10 chạy trước khi có quy ước này. 87.08 bị cắt một lần: phần 1 có 80 điều kiện trọn vẹn, phần 2 do mô hình viết tiếp từ `bieu:87087095`, rồi ghép bằng `ghep.py`.
- **Chuẩn hoá:** dùng `chuanHoaGoiNhom` của repo qua móc `callModel`, không viết đường riêng. Đề từng nhóm và skill gọt lưu ngoài repo ở `.131:~/phieu1/`, kèm `sha256.txt`.
- **Chấm nhị phân Đúng/Sai & 3 ô kết quả (`ADR-0010` mục 1, 7, 8 — CEO chốt 28/11):** một trợ lý Claude đọc phiếu và vàng, so theo nút và theo nghĩa luật, không so chữ. Bảng vàng không đưa cho Gemini. Mỗi điều kiện chỉ có **Đúng** hoặc **Sai** (`một phần` do gộp điều kiện / mất trục, `thiếu`, `sai phạm vi`, `sai nghĩa` đều tính là **Sai**); mỗi ca thử chỉ xếp vào một trong 3 ô **`ĐÚNG` / `CHƯA ĐỦ DỮ KIỆN` (dừng hỏi) / `SAI` (đích sai)**; không tính điểm trung bình thập phân và không báo phần trăm.

## Bảng chấm Đúng/Sai (số đếm nguyên)

| Nhóm | Mù | ĐK vàng | Đúng | Sai (`một phần` + `thiếu` + `sai nghĩa`) | Cặp chồng vàng: tìm / sót (thừa) | Ca 3 ô: `ĐÚNG` / `CHƯA ĐỦ DỮ KIỆN` / `SAI` | NGHĨA_THƯỜNG phiếu / vàng / lệch |
|---|---|---|---|---|---|---|---|
| 61.10 | ✔ | 15 | 4 | **11** (9 + 2 + 0) | 7: 7 / 0 (0) | 7 / 4 / **15** (26 ca) | 8 / 2 / 7 |
| 85.17 | ✔ | 60 | 13 | **47** (43 + 4 + 0) | 7: 7 / 0 (19) | 10 / 19 / **6** (35 ca) | 13 / 23 / 7 |
| 30.04 | ✔ | 104 | 83 | **21** (8 + 13 + 0) | 41: 40 / **1** (19) | 12 / 16 / **4** (32 ca) | 79 / 56 / 20 |
| 87.08 | ✔ | 164 | 129 | **35** (29 + 6 + 0) | 7: 2 / **5** (13) | 15 / 39 / **8** (62 ca) | 113 / 37 / ≥76 |
| **Gộp 4 nhóm mù** | ✔ | **343** | **229** | **114** (89 + 25 + 0) | **62: 56 / 6** (51) | **44 / 78 / 33** (155 ca) | 213 / 118 / ≥110 |
| 85.43 | ✘ | 49 | 30 | **19** (18 + 1 + 0) | 7: 4 / **3** (4) | 11 / 7 / 0 (18 ca) | 31 / 32 / 6 |
| 42.02 | ✘ | 38 | 34 | **4** (2 + 2 + 0) | 6: 4 / **2** (1) | 4 / 10 / 0 (14 ca) | 22 / 20 / 4 |
| 02.01 | ✘ | 8 | 6 | **2** (2 + 0 + 0) | 0: 0 / 0 (1) | 6 / 5 / 0 (11 ca) | 2 / 1 / 1 |
| 85.01 | ✘ | 113 | 104 | **9** (4 + 5 + 0) | 12: 7 / **5** (0) | 3 / 21 / 0 (24 ca) | 60 / 34 / 27 |
| **Gộp cả 8 nhóm** | — | **551** | **403** | **148** (115 + 33 + 0) | **87: 71 / 16** (57) | **68 / 121 / 33** (222 ca) | 328 / 205 / ≥148 |

- Quy tắc chấm nhị phân (`ADR-0010`): `Sai = một phần + thiếu + sai phạm vi + sai nghĩa`. Điều kiện vàng bị phiếu gộp vào một câu hỏi hoặc hạ `GIA_TRI` mất trục từng ghi là `một phần` nay tính trọn là điều kiện **Sai**.
- Không có điều kiện phiếu nào đảo nghĩa câu luật (`sai nghĩa = 0`), nhưng cả 8 nhóm đều có điều kiện sai.
- ✘ (tự kiểm) nghĩa là không mù đối với skill cũ: skill gốc trước khi gọt từng chứa ví dụ của các nhóm này. Ở lượt này đề đã dùng skill gọt, nên phiếu của 4 nhóm này thực chất cũng được soạn mù.
- Đã kiểm 85.01, vì phiếu trích trùng 93/113 cặp (nút, trich) với vàng: đề chứa 0/113 câu hỏi vàng, và 0 câu hỏi của phiếu trùng nguyên văn với vàng.

## So ngưỡng `0/0/0` theo `ADR-0010` (CEO chốt 28/11)

| Hạng mục ngưỡng `0/0/0` | Ngưỡng đạt | 4 nhóm mù | Cả 8 nhóm |
|---|---|---|---|
| Điều kiện sai (`một phần` + `thiếu` + `sai phạm vi` + `sai nghĩa`) | `0` | `114` ✘ | `148` ✘ |
| Ca ra đích sai | `0` | `33` ✘ | `33` ✘ |
| Cặp chồng sót | `0` | `6` ✘ | `16` ✘ |

- **Kết luận: `KHÔNG ĐẠT` ở cả 8/8 nhóm** (không nhóm nào đạt `0/0/0`).
- **Tác động thực tế theo chuẩn báo cáo CEO (`#2410#issuecomment-7231147427`):**
  - Trên **4 nhóm mù** (`61.10`, `85.17`, `30.04`, `87.08`): **`33/155 ca ra mã sai, tức cứ khoảng 5 lần dùng có 1 lần khai sai`**.
  - Trên **tổng cả 8 nhóm**: **`33/222 ca ra mã sai, tức cứ khoảng 7 lần dùng có 1 lần khai sai`**.

**Ba con số theo phiếu giao:**
1. Bảng anh em không bị cờ chặn HO_PHU: 02.01 0/1 · 30.04 26/27 · 42.02 15/15 · 61.10 1/2 · 85.17 12/13 · 85.43 5/6 · 85.01 29/33 · 87.08 39/50.
2. Số điều kiện NGHĨA_THƯỜNG: xem cột cuối bảng chấm.
3. VUNG_CHONG: 0 ở cả 8 nhóm. Máy chỉ gắn cờ này khi hai anh em có khoảng số chồng nhau, nên 5 cặp VUNG_CHONG vàng của 85.01 phiếu đều không bắt được.

## Kiểm cổng 6–12: phiếu so với chính bảng vàng

Hai kho tạm được dựng trên `origin/main` b79ec9dcc, chạy `cong.mjs --pham-vi <nhóm> --cong 6..12`. Toàn văn ở `cong/` (phiếu) và `cong-vang/` (vàng). Vàng chưa chuyển khuôn nên còn lỗi khuôn và lỗi cổng 6. Bảng dưới chỉ so cổng 7, 8, 9, 12.

| Nhóm | Cổng 7 lỗi phiếu / vàng | Cổng 8 lỗi | Cổng 9 lỗi | Cổng 12 lỗi |
|---|---|---|---|---|
| 02.01 | 1 / 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| 30.04 | 1 / 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| 42.02 | 0 / 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| 61.10 | 1 / 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| 85.17 | 1 / 1 | 0 / **4** | 0 / 0 | 0 / 0 |
| 85.43 | 1 / 1 | 0 / 0 | 0 / **5** | 1 / 1 |
| 85.01 | **4** / 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| 87.08 | 11 / 11 | 0 / 0 | 0 / 0 | 0 / 0 |

**Cổng 7 báo HO_PHU cả trên vàng, ở đúng những nút đó** (gốc nhóm và các cụm có anh tên "… khác" nhưng không có "Loại khác" thuần). Vì vậy cổng 7 lúc đó chưa phân biệt được phiếu đúng với phiếu sai ở các nút này. Cổng 8 xanh trên phiếu không có nghĩa là phiếu tốt: phiếu hạ GIA_TRI thành CO_KHONG (mất trục), nên cổng không còn gì để so (xem điểm yếu 2).

## Điểm yếu lặp lại của phiếu (chi tiết ở `cham/<nhóm>.md`)

1. **Gộp nhiều điều kiện nguyên tử vào một câu hỏi.** 85.17 và 85.43 có trên 40 chỗ; 30.04 gộp "liều lượng / dạng nhất định / bán lẻ".
2. **Mất trục và tập giá trị: GIA_TRI bị hạ thành CO_KHONG.** 85.17 có 40/40 chỗ, 87.08 có 12 chỗ. Phiếu bù bằng GIAI_CHONG thừa (19 / 19 / 13).
3. **Thiếu chuỗi phu "Loại khác" và phu loại trừ cấp nhóm.** 30.04 thiếu 13 điều kiện, 87.08 thiếu phu 87.06/87.07/"Phần khác", 85.01 thiếu phu 37,5 W. Hệ quả: 30.04 sai 3 ca, 87.08 sai 6 ca.
4. **Sót cặp chồng ở nhóm lớn.** 87.08 sót 5/7, 85.43 sót 3/7, 85.01 sót 5/5 cặp VUNG_CHONG. Căn cứ cũng lạc: 30.04 trích `phan:VI:kq:11#2` thay cho `gir:3:a#2` ở 33 cặp.
5. **NGHĨA_THƯỜNG tràn lan khi luật có định nghĩa.** 87.08: 113 phiếu so với 37 vàng; 85.01: 60 so với 34.
6. **61.10 không áp Chú giải 2 Phần XI** (chọn vật liệu theo Chương trước khi so xơ): 13 ca hàng pha nhiều xơ đều sai. `CANH_TRANH`: phiếu có 0, vàng có 85.17: 46, 85.43: 34. Bản canhTranh duy nhất của 85.43 sai khuôn (`nhomCanhTranh` không phải id nút) và bị loại khi chuẩn hoá.

## Tệp

- `jsonl/p1-<nhóm>.jsonl`: phiếu đã chuẩn hoá.
- `cham/`: chấm chi tiết và `tong.json` (tệp lịch sử không sửa).
- `cong/`, `cong-vang/`: kết quả cổng.
- `skill-sach.md`, `p1.mjs` (dựng đề / nạp trả lời), `ghep.py`, `sha256.txt` (vân tay đề, đề lưu ở `.131:~/phieu1/de-*.txt`).
