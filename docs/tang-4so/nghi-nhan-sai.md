# Ca nghi nhãn bộ chuẩn sai (v1)

Theo LUAT-DO.md: KHÔNG tự sửa nhãn; các ca dưới đây VẪN nằm trong danh sách ca sai (`ca-sai-v1-vong2.json`) chờ QT duyệt.
Cả bốn ca có chung dấu hiệu: nhãn CHOT ghi "không điều loại trừ nào áp" hoặc "tên nhóm mô tả đúng hàng", trong khi tầng điều khoản có điều chỉ ra dữ kiện quyết định mà mô tả hàng không có.

| Ca | Hàng | Nhãn | Hệ trả (vòng 2) | Điều khoản chứng minh |
|---|---|---|---|---|
| 37 | Dây dù câu cá | CHOT 9507 | PHAN_VAN 5607 / 9507 | `chuong:95:chu_giai:1c`: Chương 95 không bao gồm "sợi, monofilament, dây bện… dùng cho đánh bắt thuỷ sản, đã cắt thành từng đoạn nhưng chưa làm thành dây câu" (→ 4206, Chương 39, Phần XI). Mô tả không nói đã gắn lưỡi, chì, phao hay chưa, nên chưa thể chốt 9507. |
| 40 | Đệm chữ thập phun hồ | CHOT 8424 | PHAN_VAN 8483 / 8474 | `phan:84:chu_giai:2a`, `2b`: đây là bộ phận máy; nhóm định danh riêng (8483 nếu là đệm khớp nối truyền động) thắng nhóm máy. Nhãn viện "tên nhóm 8424 mô tả đúng hàng" cho một bộ phận, không qua Chú giải 2 Phần XVI. Vị trí lắp của đệm không có trong mô tả. |
| 44 | Vỏ khung bộ điều khiển | CHOT 8538 | PHAN_VAN 8538 / 9033 / 7326 | `chuong:90:chu_giai:2b`, `chuong:90:chu_giai:2c`: vỏ của bộ điều khiển tự động thuộc 90.32 đi theo máy (9033) chứ không phải 85.38. Loại bộ điều khiển (PLC/tủ điện 85.37 hay điều khiển tự động 90.32) không có trong mô tả. |
| 69 | Cân điện tử (cân bàn) | CHOT 8423 | vòng 1: PHAN_VAN 8423 / 9016; vòng 2: CHOT 8423 | `chuong:90:chu_giai:1g`: cân/máy kiểm tra theo nguyên lý cân thuộc 84.23, trừ cân có độ nhạy 5 cg trở lên (9016). Mô tả không có độ nhạy. Hệ dao động giữa hai vòng; ca này đã ra khỏi danh sách ở vòng 2 nhưng đáng xem lại nhãn. |

## QT duyệt (23/11/2026)

- **Ca 37 → PHAN_VAN** (nhóm 9507, 5607, 5404; bắt buộc có nhánh 9507 và 5607): đã làm thành dây câu (gắn lưỡi/chì/phao, sẵn dùng) → 9507; chỉ là dây/cước cuộn hoặc cắt đoạn chưa làm thành dây câu → Phần XI (5404/5607), theo `chuong:95:chu_giai:1c`.
- **Ca 44 → PHAN_VAN** (8538, 9033): vỏ cho bảng/tủ điều khiển điện 85.37 → 8538; vỏ của bộ điều khiển tự động 90.32 → 9033.
- **Ca 40 → PHAN_VAN** (8424, 8483, 8484, 4016; bắt buộc có nhánh 8424): bộ phận chỉ dùng cho máy phun 84.24, không phải hàng của nhóm riêng → 8424 (Chú giải 2(b) Phần XVI); nếu bản thân là hàng của nhóm định danh (khớp nối 8483, gioăng 8484/4016) → nhóm đó (2(a)).
- **Ca 69: GIỮ nhãn CHOT 8423** (cân bàn không thể có độ nhạy 5 cg). Hệ hỏi ca này là hỏi thừa.

Nhãn đã sửa trong `data/bo-chuan/4so-v1.jsonl` kèm trường `suaNhan {boi, ngay, lyDo, truoc}`; trường `nhomBatBuoc` là các nhóm mà nhánh của hệ phải có. `cham.py` nay đọc nhãn từ bộ chuẩn và chấm PHAN_VAN đúng nghĩa: các nhánh của hệ phải phủ đủ `nhomBatBuoc` (mặc định là mọi nhóm trong nhãn) và có ít nhất hai nhánh thuộc nhãn.
