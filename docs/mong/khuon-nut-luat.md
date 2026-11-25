# Khuôn nút luật `nut-luat@1`

Mọi thẻ lớp 1 ghi ra JSONL, mỗi dòng một nút, ở `data/luat-goc/<kho>.jsonl`. **Mỗi kho một thẻ, một người ghi.** Kho cũ trong `data/` giữ nguyên tới lớp 2.

```json
{"id":"phan:XV:cg:2:a","loai":"CHU_GIAI","cha":"phan:XV:cg:2","so":"2(a)","nguyenVan":"(a) Các sản phẩm thuộc nhóm 73.07…","lop":"LUAT",
 "nguon":{"vanBan":"Chú giải chi tiết HS 2022 (bản dịch kèm CV 1810/TCHQ-TXNK 2024)","ban":"HS2022","trang":1489},"hieuLuc":{"tu":null,"den":null}}
```

| Trường | Luật |
|---|---|
| `id` | Duy nhất toàn kho, đúng ngữ pháp dưới đây |
| `loai` | `QUY_TAC` · `TEN` · `CHU_GIAI` · `CHU_GIAI_PHAN_NHOM` · `KHAI_QUAT` · `CHU_GIAI_CHI_TIET` · `SEN` · `Y_KIEN_WCO` · `THONG_BAO` |
| `lop` | `LUAT` (tên nhóm, chú giải Phần/Chương/phân nhóm, quy tắc) · `HUONG_DAN` (khái quát, chú giải chi tiết, SEN, WCO) · `TIEN_LE` (thông báo) |
| `cha` | id nút cha có thật trong cùng kho, hoặc `null` |
| `so` | Số hiệu in trong văn bản ("9(c)"), không có thì `null` |
| `nguyenVan` | Chép nguyên văn. Chỉ được: nối dòng bị ngắt, bỏ số trang, bỏ đầu/chân trang. Không sửa chữ, không tóm tắt |
| `nguon.trang` | Trang PDF (đếm từ 1). Không biết thì `null` và ghi vào `thieu-trang` của thẻ |

**Ngữ pháp id**

| Nút | id |
|---|---|
| Quy tắc tổng quát | `gir:1`, `gir:2:a`; chú giải chi tiết `gir:2:a:ct:1` |
| Phần | `phan:XV` (tên), `phan:XV:cg:9:c`, `phan:XV:cgpn:1:a`, `phan:XV:kq:1` |
| Chương | `chuong:76`, `chuong:76:cg:2`, `chuong:76:cgpn:1:a`, `chuong:76:kq:1` |
| Phân chương (Ch. 28, 29, 39, 63, 69, 71, 72…) | `chuong:28:pc:II` (tên), Tổng quát `chuong:28:pc:II:kq:1` – thuộc M-13, kể cả khi in sau nhóm đầu |
| Chú giải chi tiết nhóm | `nhom:7616:ct:1` (đoạn, theo thứ tự) |
| Chú giải chi tiết phân nhóm | `pn:761610:ct:1` |
| SEN | `sen:76169920:1` (mã 4–8 số); áp cho cả chương `sen:chuong:87:1`, cả Phần `sen:phan:XI:1`, lời nói đầu `sen:md:1` |
| Ý kiến WCO | `wco:852852:6` |
| Tên trong biểu | `bieu:7616`, `bieu:76161`, `bieu:76161020` |
| Thông báo phân loại | `tb:851-2023:84812090` |

Số điểm viết thường, theo thứ tự in: `cg:1:a:ii`. Khoản bổ sung Việt Nam/SEN trong chú giải chương: `chuong:NN:cgbs:1`.

**Ranh giới để không chồng nhau:** "Chú giải" và "Chú giải bổ sung" → kho Phần/Chương. "Chú giải phân nhóm" của Phần/Chương → cùng kho Phần/Chương (`cgpn`). "Chú giải chi tiết phân nhóm" (trong chú giải nhóm) → kho phân nhóm. "Khái quát chung" → `kq`, lớp `HUONG_DAN`.

**Trường thêm được phép (không bắt buộc):** `nguon.trangDen` (trang cuối khi nút qua trang) · `apChung` (mảng mã phân nhóm cùng chịu một đoạn) · `ghiChu` (sự thật về bản in: mã in không còn trong biểu, nghi lỗi in – giữ theo bản in, không sửa) · `thieu` (phần chỉ có hình/công thức không rút được chữ, kèm trang).

Đoạn trong chú giải nhóm nói về phân nhóm nhưng **không nêu mã** (72.12 trang 1528, 72.17 trang 1534): thuộc kho nhóm (M-14), không đoán mã. Đoạn giải thích phân nhóm nằm trong phần Khái quát của Phần/Chương: thuộc `kq` của M-11 / M-13.

**Đoạn kết của khoản** (in sau các điểm con, ví dụ Chú giải 2 Phần XV "Từ Chương 73 đến…"): là nút riêng `…:cg:2:ket`, `cha` là khoản, `so: null`, đứng sau các điểm con. Nút khoản chỉ giữ câu dẫn. Không nối đoạn kết vào câu dẫn, không dùng trường `doanSau`.

Chương 77 để dự phòng, bản in không có chữ: không tạo nút.

Cổng: `node scripts/kiem-luat-goc.mjs <kho>`.
