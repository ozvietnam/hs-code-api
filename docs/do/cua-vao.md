# Thước đo cửa vào (`M-79` · `#1971`)

> **Trạng thái:** Chỉ dựng thước và bộ thử nhỏ lấy từ `data/luat-goc`; **chưa chạy đo lớn**, **không dùng tờ khai hay dữ liệu khách làm đáp án** (theo `ADR-0006` và `#1971`).

## 1. Mục tiêu

Hồ sơ vấn đề mã 8 số (Khâu 3) chỉ phát huy tác dụng khi **cửa vào** đưa được nhóm 4 số / phân nhóm đúng vào danh sách ứng viên để so sánh. Thước đo `scripts/do-cua-vao.mjs` đo trực tiếp nút thắt này trên 3 kênh:

| Kênh | Thẻ | Nguồn mã | Trạng thái hiện tại |
|---|---|---|---|
| `m41_tim_luat` | **M-41** | `lib/tim-luat.js` (tìm chữ trên 6 kho luật gốc) | **Đã cắm** (`main`) |
| `m37_tim_nghia` | **M-37** | Chỗ cắm `timNghia(moTa, { thuMuc, limit })` | `CHUA_CAM` (chờ `#1946`) |
| `m52_loc` | **M-52** | Chỗ cắm `loc(moTa, { thuMuc, limit })` | `CHUA_CAM` (chờ `#1955`) |

## 2. Cách chạy

```bash
# Chạy thước với bộ thử nhỏ dựng từ nguyên văn data/luat-goc
node scripts/do-cua-vao.mjs

# Xuất JSON cho xử lý tự động
node scripts/do-cua-vao.mjs --json --limit 20

# Chạy trên bộ 10 mặt hàng CEO + hàng QT tự soạn có căn cứ luật
node scripts/do-cua-vao.mjs --bo <duong-dan-bo-do.json> --limit 20 --bao-cao docs/do/cua-vao-ket-qua.md

# Chạy toàn bộ bài kiểm (ca thuận + ca ngược + chặn tờ khai)
node scripts/do-cua-vao-test.mjs
```

### Khuôn tệp `--bo <duong-dan-bo-do.json>` (dành cho 10 mặt hàng CEO + hàng QT)

```json
[
  {
    "id": "ceo-01",
    "loaiCa": "THUAN",
    "nhomHienTuong": "KHOP_THANG",
    "moTa": "bình chứa bằng nhôm dung tích 500 lít",
    "nhomDung": "7611",
    "phanNhomDung": "761100",
    "canCuLuat": ["bieu:7611"],
    "ghiChu": "Nhóm 76.11: bình chứa nhôm dung tích trên 300 lít."
  },
  {
    "id": "nguoc-01",
    "loaiCa": "NGUOC",
    "kieuNguoc": "RONG_KHONG_DOAN",
    "moTa": "vật thể hư cấu xyzzy 9999",
    "nhomDung": null,
    "phanNhomDung": null,
    "canCuLuat": ["bieu:7611"],
    "ghiChu": "Kiểm trung thực khi không có câu luật nhắc."
  }
]
```

**Cổng độ sạch bắt buộc trong `kiemBoDo`:**
1. Mọi ca đều phải có `canCuLuat` trỏ tới ID nút **tồn tại thật** trong 6 kho `data/luat-goc` (`phan`, `chuong`, `bieu`, `nhom`, `phan-nhom`, `sen`).
2. Từ chối ngay bất kỳ bản ghi nào chứa `tb:`, `to_khai`, `tờ khai`, `oz-export`, hoặc `khách hàng`.

## 3. Cách đọc số

Khi nhìn bảng báo cáo của thước đo, cần đọc đồng thời **4 chỉ số** — không bao giờ chỉ nhìn một con số tổng:

1. **Tỉ lệ trúng nhóm 4 số ở chiều `NHAC` (`Top-5` / `Top-10` / `Top-20`):**
   - Chỉ đếm nút xuất hiện ở chiều **`NHAC`** (ứng viên dương), xếp hạng theo nhóm 4 số duy nhất xuất hiện đầu tiên.
   - Nút chỉ xuất hiện ở chiều **`LOAI`** (câu loại trừ) **không bao giờ được tính là trúng** (`coNhom4 = false`, cờ `chiXuatHienOLoai = true`). Đây là bẫy phổ biến khiến đo recall bị ảo nếu không tách chiều.
2. **Dòng `LOAI` chiếm chỗ ở đầu danh sách (`soDongLoai` & `top3Loai`):**
   - Nếu `nhomDung` bị đẩy xuống ngoài Top-5 vì các câu loại trừ (`"trừ nhà lắp ghép thuộc nhóm 94.06"`) hoặc câu phủ định (`"chưa cách điện"` khớp từ `"cách điện"`) chen lên trước, đó là lỗi **xếp hạng / phân cực của cửa vào**, không phải lỗi hồ sơ Khâu 3.
3. **Số ca thuận trả `RỖNG` (`caRongTrenThuan`):**
   - Với `M-41` (tìm chữ thuần), các mô tả thương mại/đời thường đúng nghĩa nhưng khác chữ biểu thuế (ví dụ `"vỏ lon nước giải khát bằng nhôm"`, `"ghế xoay văn phòng"`) sẽ trả `RỖNG`. Con số này đo trực tiếp **khoảng trống cần M-37 (tìm nghĩa)** lấp vào.
4. **Ca ngược đạt (`caNguocDat / tongCaNguoc`):**
   - Bắt buộc đạt **100%**. Nếu tăng recall bằng cách đoán bừa khi không có căn cứ luật thì ca ngược `RONG_KHONG_DOAN` sẽ đỏ ngay.

## 4. Kết quả kiểm thử nhanh trên bộ mẫu luật gốc (chưa đo lớn)

Chạy `node scripts/do-cua-vao.mjs --limit 20` trên 12 ca dựng thước (`BO_THU_LUAT_MAU`: 10 ca thuận từ `data/luat-goc` + 2 ca ngược) cho **6/10 (60%)** ca thuận trúng nhóm 4 số ở Top-5 `NHAC` của `M-41`:

- **Ca thuận khớp thẳng chữ biểu thuế (4/4):** `7611` (`#2`), `7607` (`#1`), `7605` (`#1`), `7318` (`#2`) đều lọt **Top-5 `NHAC`** của `M-41`.
- **Ca thuận dính bẫy phủ định / loại trừ (2 ca):**
  - `"dây cáp điện cách điện"` (`8544`): lọt Top-5 ở hạng `#4` (`12 NHAC / 8 LOAI`), đứng **sau** 3 nhóm `"chưa cách điện"` (`7312`, `7413`, `7614`).
  - `"nhà lắp ghép"` (`9406`): đứng hạng `#3` (`11 NHAC / 9 LOAI`), đứng sau `7308`, `7610` (mệnh đề `"trừ nhà lắp ghép thuộc nhóm 94.06"` chen ở đầu) và có 9 dòng `LOAI` chiếm slot.
- **Ca thuận lệch từ vựng thương mại ↔ luật (4 ca):** `"máy bơm ly tâm"` (`8413`, không thấy), `"thang máy chở người"` (`8428`, không thấy), `"vỏ lon nước giải khát bằng nhôm"` (`7612`, rỗng), `"ghế xoay văn phòng"` (`9401`, rỗng) — `M-41` tìm chữ thuần chưa đưa được nhóm đúng vào Top-20; đây chính là khoảng trống cần đo lại sau khi cắm **M-37** và **M-52**.
- **Ca ngược (`RONG_KHONG_DOAN`):** đạt **2/2** (100% trả rỗng trung thực, không đoán).

> Ghi chú cho QT: Khi có danh sách **10 mặt hàng CEO** + mặt hàng QT bổ sung, chỉ cần lưu thành tệp JSON đúng khuôn mục 2 và chạy `node scripts/do-cua-vao.mjs --bo <tep.json>` để lấy số chuẩn cho cả 3 kênh `M-41`, `M-37`, `M-52`.
