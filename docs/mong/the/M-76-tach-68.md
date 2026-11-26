# M-76 (#1968) — Cấp 6 và 8 số: tách anh em, Loại khác phủ định, chú giải SEN — Chương 76 (PR nháp)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/phan-nhom/*.jsonl`: **35 tệp** (35 phân nhóm 6 số + 6 tiêu đề 7 số gắn vào tệp phân nhóm 6 số tương ứng theo `lib/ho-so-ma/ghep.js`).
  - `data/ho-so-ma/dong/*.jsonl`: **74 tệp** (74 dòng 8 số của Chương 76).
  - **Tổng: 109 tệp, 130 bản ghi**, **0 bản `VENH`**, chỉ rút từ `data/luat-goc` (`bieu:76*`, `sen:76*`, `pn:760711:ct:1`). Không có dữ liệu khách, tờ khai, `tb:`, `wco:`, `gir:`, hay lời AI tự nghĩ.
- **Phân bổ 130 bản ghi Chương 76:**
  - **94 `TACH_ANH_EM`** (trong đó **31 dòng *"Loại khác"*** do máy sinh 100% tất định, phủ định đủ anh em có tên cùng cấp qua `ghiChu: "phuDinh: bieu:..."` — tương thích khuôn `main` hiện hành trước khi `#1981` gộp).
  - **21 `BO_QUA`** cho các dòng con duy nhất lặp lại tên cấp cha (như `76011000`, `76020000`, `76071900`…) để qua Cổng 1 ĐỦ mà không nhân bản điều kiện cấp cha theo ADR-0006.
  - **10 `DINH_NGHIA` từ chú giải SEN** (phủ đủ 10/10 dòng `sen:76*`: `76042110`, `76042120`, `76061232`, `76061233`, `76072010`, `76109030`, `76129010`, `76169920`, `76169930`, `76169951`), kèm `ghiChu: "nguon_sen: sen:..."`. Lọc sạch câu ví dụ/thông số hàng mẫu (`UltraTouch`, `16,35`, `0,175 mm`, *"Chúng có thể ở dạng..."*).
  - **5 `PHAI_LA` từ chú giải phân nhóm** (`pn:760711:ct:1#1,2,4,5,7`): quy định các công đoạn xử lý bề mặt được phép ở phân nhóm `7607.11`.
  - **Không trùng phạm vi M-74 / M-75:** không sinh bản ghi `NGUONG` (M-74) hay `CHI_LIET_KE` (M-75); dùng dải mã định danh `hs:<nut>:7601..7614` tránh va chạm ID.
- **Đề xuất gửi QT về 7 nút tiêu đề 5 số (`TIEU_DE_5`, ngoài phạm vi `M-76`):**
  - Theo `lib/ho-so-ma/ghep.js`, 7 nút tiêu đề 5 số của Chương 76 (`bieu:76042`, `bieu:76051`, `bieu:76052`, `bieu:76061`, `bieu:76069`, `bieu:76071`, `bieu:76169`) trỏ vào `data/ho-so-ma/nhom/*.jsonl` — thuộc phạm vi **M-73**, nằm ngoài `M-76.tep` trong `docs/mong/phan-cong.json`.
  - Trong PR nháp này, công cụ giữ nguyên kỷ luật phạm vi (không ghi `data/ho-so-ma/nhom/`). Kết quả: 3 nhóm (`7604`, `7607`, `7616`) vẫn qua Cổng 3 nhờ có phân nhóm 6 số anh em cùng cấp; riêng **2 cặp thuần tiêu đề 5 số** (`76051/76052` ở nhóm `7605` và `76061/76069` ở nhóm `7606`) cần QT quyết định: để **M-73** làm, hay mở PR `[M-01]` cho phép `tach-68.mjs --gom-tieu-de-5` ghi thêm tiêu đề 5 số.
- **Công cụ & kiểm chứng (tự động + ca ngược):**
  - [`scripts/ho-so-ma/tach-68.mjs`](../../../scripts/ho-so-ma/tach-68.mjs) (`--chuong 76 --tao|--kiem|--bao-cao [--gom-tieu-de-5]`)
  - [`scripts/ho-so-ma/tach-68-test.mjs`](../../../scripts/ho-so-ma/tach-68-test.mjs) (20 ca xanh gồm 3 ca ngược: `TRUNG_TEN_ANH_EM`, `PHU_DINH_THIEU`, `VAN_TAY_LECH`; đã đăng ký trong `scripts/danh-sach-test.txt`).
  - Xác minh toàn bộ cổng: `khuon.mjs` (0 lỗi), `cong.mjs` Cổng 4/5 (0 lỗi), Cổng 1 ĐỦ & Cổng 3 ANH EM xanh trên 35/35 phân nhóm 6 số, `test-ho-so-ma.mjs` (65/65), `test-lop-kho.mjs`, `kiem-pham-vi-the.mjs`, `kiem-pr-l1.mjs`.
