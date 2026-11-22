# Đề xuất đặc tả: Trạng thái `"nhóm chưa chốt, hỏi trước"` ở tầng 4 số (#1645 Việc 3)

> **Trạng thái tài liệu:** Bản đề xuất & kiểm chứng ngoại tuyến (`lib/do-thi/hoi-truoc-4so.js`, `scripts/demo-hoi-truoc-4so.mjs`).
> **Tuyệt đối CHƯA nối vào đường khách** (`/api/classify`, `/api/identify`, `lib/engine-loop.js`) cho đến khi QT duyệt thiết kế và quy định công tắc `HS_*` bật từng bước.

## 1. Bối cảnh & vấn đề hiện tại (ADR-0004)

- Hiện tại động cơ phân loại khoá một nhóm 4 số ở cuối vòng 1 / vòng 2 rồi mới sinh câu hỏi chi tiết ở tầng phân nhóm 6 số hoặc dòng 8 số.
- Trên bộ chuẩn `data/bo-chuan/4so-v1.jsonl` (100 ca theo `ADR-0004`): **20/100 ca ở trạng thái `PHAN_VAN`**, trong đó **15 ca thuộc ô D** (hồ sơ khách thiếu một đặc điểm quyết định ở tầng 4 số như đế/mũ giày, cơ cấu cơ khí/van, có phủ chất trợ dung hay dây trần, tấm có keo/ghép lớp/đơn lớp, kích cỡ trẻ ≤ 86 cm…), **4 ca ô B** và **1 ca ô C**.
- Nếu hệ đoán bừa một nhóm 4 số rồi hỏi tiếp theo sổ tay 6–8 số của nhóm đoán sai đó, cả chuỗi câu hỏi và kết quả sau đó đều lệch nhóm (`L3` / `ADR-0004`: *hàng hoá thiếu dữ kiện để áp Quy tắc 1–3 thì phải hỏi để phân định đúng nhóm 4 số trước*).

## 2. Khuôn trạng thái mới ở tầng 4 số (L6)

Tầng 4 số phân biệt rõ 3 trạng thái tất định, không dùng chung một mảng rỗng:

| Trạng thái (`trangThai`) | Ý nghĩa pháp lý | `dapAnDieuKien` | `cauHoi` |
|---|---|---|---|
| `CHOT_NHOM` | Chỉ có đúng 1 nhóm 4 số sống sót sau lọc chú giải / loại trừ | `null` | `null` |
| `CHUA_CHOT_NHOM_HOI_TRUOC` | Còn từ ≥ 2 nhóm ứng viên hợp lệ mà hồ sơ chưa có dữ kiện phân định | `"Nếu <đặc điểm A> → nhóm X (<căn cứ>); nếu <đặc điểm B> → nhóm Y (<căn cứ>)…"` | Câu hỏi trực tiếp giúp tách rõ từng nhánh |
| `KHONG_DU_CAN_CU` | Danh sách ứng viên rỗng hoặc không có nhóm hợp lệ trong biểu thuế | `null` | Câu hỏi đề nghị bổ sung tên/mô tả hàng |

## 3. Khuôn dữ liệu đầu ra (`phanTichHoiTruoc4So`)

```json
{
  "trangThai": "CHUA_CHOT_NHOM_HOI_TRUOC",
  "nhomUngVien": ["8210", "7323"],
  "nhanh": [
    {
      "nhom": "8210",
      "dieuKien": "dụng cụ cơ khí cầm tay nặng ≤ 10 kg (có cơ cấu cơ khí)",
      "canCu": "Tên nhóm & CGCT 82.10",
      "nguon": "chu-giai-heading.json#8210",
      "truc": "co_cau"
    },
    {
      "nhom": "7323",
      "dieuKien": "bộ đồ ăn, đồ dùng nhà bếp bằng sắt hoặc thép không có cơ cấu cơ khí",
      "canCu": "Tên nhóm & CGCT 73.23",
      "nguon": "chu-giai-heading.json#7323",
      "truc": "co_cau"
    }
  ],
  "dapAnDieuKien": "Nếu dụng cụ cơ khí cầm tay nặng ≤ 10 kg (có cơ cấu cơ khí) → nhóm 8210 (Tên nhóm & CGCT 82.10); nếu bộ đồ ăn, đồ dùng nhà bếp bằng sắt hoặc thép không có cơ cấu cơ khí → nhóm 7323 (Tên nhóm & CGCT 73.23)",
  "cauHoi": "Hàng thuộc dạng dụng cụ cơ khí cầm tay nặng ≤ 10 kg (có cơ cấu cơ khí) để vào nhóm 8210 hay là đồ dùng nhà bếp bằng sắt hoặc thép không có cơ cấu cơ khí vào nhóm 7323?",
  "trucPhanBiet": ["co_cau"],
  "quyTac": "QT1",
  "canCu": [
    { "nhom": "8210", "nguon": "chu-giai-heading.json#8210", "canCu": "Tên nhóm & CGCT 82.10" },
    { "nhom": "7323", "nguon": "chu-giai-heading.json#7323", "canCu": "Tên nhóm & CGCT 73.23" }
  ]
}
```

## 4. Nguồn căn cứ & thứ bậc rút nhánh (0 AI, tất định)

Mỗi nhánh `nhom` bắt buộc có `dieuKien` đặc thù + `canCu` + `nguon` lấy từ kho tri thức chuẩn của hệ thống (không bịa ngoài tài liệu):

1. **Cạnh đồ thị giữa các nhóm đang cùng sống (`C5` / `C6` / `C7` / `C9` / `WCO` qua `lib/do-thi/index.js#canhGiuaNhomConSong`):**
   - Ưu tiên cao nhất vì mang sẵn điều kiện phân biệt hai đầu và nguồn trích đã kiểm kiểm định (`nguon`, `trich`).
2. **Chú giải chi tiết nhóm (`data/chu-giai-heading.json` — `ten_nhom`, `nhom`, `phan_biet`, `bao_gom`):**
   - Rút cụm điều kiện rẽ nhánh đặc trưng giữa các ứng viên (tránh lặp nguyên câu dài; tách đúng phần khác nhau về chất liệu, cơ cấu/nguyên lý, hình dạng/gia công, công dụng/vật trang trí lễ hội, hoặc ngưỡng đối tượng/kích thước).
3. **Chú giải chương / phần (`data/chu-giai-chuong.json`, `data/notes.json`):**
   - Bắt các ranh giới mang tính quy tắc chương (ví dụ Chú giải 4 Chương 64 về đế/mũ giày, Chú giải 10 Chương 39, Chú giải 9 Chương 40, Chú giải 6 Chương 61, Chú giải 2(a) Phần XVI…).

## 5. Ràng buộc an toàn & điều kiện kích hoạt ngược

- **Ca ngược 1 nhóm:** khi chỉ còn 1 nhóm 4 số sau bước loại trừ → trả `CHOT_NHOM`, `dapAnDieuKien = null`, `cauHoi = null`, không tạo câu hỏi thừa.
- **Không gắn nhãn GIR tự ý (L3):** trạng thái này chỉ nêu quy tắc phân định giữa các nhánh để *hỏi*, không tự chọn một mã HS cuối.
- **Tôn trọng L2 (`test-cau-hoi-co-can-cu.mjs`):** không dùng khóa `questionVi:` ngoài lõi; dùng trường đặc tả `cauHoi` và giữ mỗi câu hỏi kèm đủ danh sách `canCu[]`.
- **Cô lập hoàn toàn trong `lib/do-thi/hoi-truoc-4so.js`:** được liệt kê trong `data/luat/dau-noi.json` (`kho.bangCanh.moDun`), không được `api/*` hay đường khách nào `require`.

## 6. Lộ trình nối đường khách (chỉ thực hiện sau khi QT duyệt)

1. Mở PR riêng khai cờ mới (ví dụ `HS_HOI_TRUOC_4SO`, mặc định TẮT `macDinhBat: false`, `doiQuyetDinhLLM: true`) trong `data/luat/bang-co.json`.
2. Sau khi QT xác nhận độ chính xác và tỷ lệ hỏi không tăng oan trên Cổng thật với bộ ca đóng, mới nối vào cuối bước kiểm tầng 4 số của `lib/engine-loop.js` và hợp đồng `nextAction` ở đường khách.
