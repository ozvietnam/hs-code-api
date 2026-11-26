# M-76 — Cấp 6 và 8 số: tách anh em, Loại khác phủ định, SEN (Chương 76)

- **Thẻ gốc**: [#1968](https://github.com/ozvietnam/hs-code-api/issues/1968) · **PR nháp**: #1995 · **Nhánh**: `mong/m-76-tach-68`
- **Chuẩn khuôn**: `ho-so-ma@1` (ADR-0006, khuôn M-71 `lib/ho-so-ma/ghep.js`, bổ sung #1981: `phuDinh`, `thuatNgu`)
- **Đồng bộ nền**: `origin/main` (`578279fc` — đã gộp #1981, #1996, #1997)

## 1. Bố cục tệp và số liệu Chương 76

Theo khuôn M-71 (`lib/ho-so-ma/ghep.js`, mỗi mã một tệp — QT đã rút điểm 2 gộp tệp):

| Thư mục | Số tệp | Số bản ghi | Ghi chú |
|---|---:|---:|---|
| `data/ho-so-ma/phan-nhom/<6 số>.jsonl` | 35 | 42 | 35 phân nhóm 6 số + 6 tiêu đề 7 số (nằm chung tệp 6 số cha theo `ghep.tepCuaNut`) + 1 `DINH_NGHIA` chú giải phân nhóm `7607.11` |
| `data/ho-so-ma/dong/<8 số>.jsonl` | 74 | 84 | 74 dòng 8 số (56 `TACH_ANH_EM`, 18 `BO_QUA` con đơn) + 10 `DINH_NGHIA` từ chú giải SEN `sen:76*` |
| **Tổng Chương 76** | **109** | **126** | **94 `TACH_ANH_EM`** (trong đó **31 `Loại khác`** có mảng `phuDinh`), **21 `BO_QUA`** con đơn, **11 `DINH_NGHIA`** có `thuatNgu`, **0 `VENH`** |

## 2. Sửa đủ các điểm QT chốt cho Bước 0

1. **`data/lop-kho.json`**: giữ nguyên bản `main`, chỉ chèn 2 mục `data/ho-so-ma/phan-nhom/**` và `data/ho-so-ma/dong/**` (+12/-0, không định dạng lại tệp).
2. **Mỗi mã một tệp theo khuôn M-71**: quay về 109 tệp (`phan-nhom/<6 số>.jsonl` và `dong/<8 số>.jsonl`) để `lib/ho-so-ma/ghep.js` ghép thẳng theo đường đi; `ghep.hoSo("7606.12.32")` nạp đủ cả cấp 6 và cấp 8 số.
3. **Chú giải phân nhóm `7607.11` (`pn:760711:ct:1`)**: gộp thành **MỘT** bản ghi `DINH_NGHIA` duy nhất (`hs:bieu:760711:7610`), không chẻ 5 `PHAI_LA`. Lưu ý Cổng 4 (`cong.mjs` dòng 275): `thuatNgu` bắt buộc phải xuất hiện nguyên chữ trong nút nguồn `pn:760711:ct:1`, vì vậy đặt `thuatNgu: "gia công hoặc xử lý bề mặt"` (nguyên chữ trong `pn:760711:ct:1#1`), đồng thời `dieuKien` và `ghiChu` ghi rõ giải nghĩa cụm `"chưa gia công thêm"` cùng 4 mục `(1)–(4)`.
4. **Khuôn #1981 (`phuDinh` + `thuatNgu`)**: 31/31 dòng `Loại khác` có mảng `phuDinh` chứa đủ anh em có tên cùng cấp và giữ `voi`; 11/11 bản ghi `DINH_NGHIA` có trường `thuatNgu` khớp nguyên chữ nút nguồn.
5. **`scripts/ho-so-ma/tach-68-test.mjs` tự quét mọi chương**: giống `nguong-test.mjs` (#1996), tự động phát hiện mọi chương có tệp trong `data/ho-so-ma/{phan-nhom,dong}/` để 10 PR bước 1 (`84, 85, 39, 73, 94, 87, 90, 61, 62, 40`) không cần sửa `danh-sach-test.txt` hay viết thêm tệp test riêng.

## 3. Ranh giới phạm vi (không lấn thẻ khác)

- **7 tiêu đề 5 số (`TIEU_DE_5`)**: `bieu:76042`, `bieu:76051`, `bieu:76052`, `bieu:76061`, `bieu:76069`, `bieu:76071`, `bieu:76169` ánh xạ sang `data/ho-so-ma/nhom/*.jsonl` (phạm vi M-73) nên M-76 không ghi lấn.
- **Không chép lại** `NGUONG` (M-74), `CHI_LIET_KE` (M-75), câu ví dụ/mẫu SEN (`UltraTouch`, `0,175 mm`), tiền lệ `tb:`, ý kiến `wco:`, hay dữ liệu khách.

## 4. Kết quả tự kiểm trên nền `origin/main` (`578279fc`)

- `node scripts/ho-so-ma/khuon.mjs` → **0 lỗi**
- `node scripts/ho-so-ma/cong.mjs --pham-vi chuong:76 --cong 4,5` → **0 lỗi** (Cổng 4 TRÍCH + Cổng 5 VÂN TAY)
- Cổng 1 ĐỦ & Cổng 3 ANH EM trên 35/35 phân nhóm 6 số Chương 76 (`--chi-trong`) → **0 lỗi**
- `node scripts/ho-so-ma/tach-68-test.mjs` → **tất cả ca xanh**
- `node scripts/test-lop-kho.mjs`, `node scripts/test-ho-so-ma.mjs`, `node scripts/test-danh-sach-test.mjs`, `node scripts/mong/kiem-pham-vi-the.mjs` → **PASS**
