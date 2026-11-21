<!-- Luật: docs/luat-duong-khach.md. Cách chạy test và cổng gộp: CLAUDE.md luật 9, docs/van-hanh/cong-gop-chay-test.md. -->

**Thứ tự gộp (L10):** <!-- "Độc lập", hoặc "Gộp sau #N" / "Gộp trước #N" khi dựa trên PR khác hay đụng cùng tệp -->

## Vì sao

<!-- Sự việc thật hoặc số thẻ OZV. Một đoạn. -->

## Thay đổi

<!-- Tệp nào, làm gì. -->

## Luật đường khách

**L1 — PR có sửa tệp gọi LLM, prompt, hay chuỗi mô hình không?** Trả lời bằng MỘT trong hai cách, xoá cách kia. CI
(`Luat L1`) đỏ nếu PR đụng tệp gọi LLM mà chưa trả lời.

Không đổi hành vi LLM: <!-- lý do cụ thể, vd "chỉ thêm trường log, prompt và số lượt giữ nguyên". Xoá dòng này nếu CÓ đổi. -->

Công tắc: <!-- `HS_TEN_CO` (mặc định tắt), đã khai ở data/luat/bang-co.json với doiQuyetDinhLLM: true. Xoá dòng này nếu KHÔNG đổi. -->

- [ ] Tắt công tắc = như `main`: <!-- sha256 đầu ra trên origin/main và trên nhánh, cùng bộ ca LLM giả -->
- [ ] Công tắc tắt là hết tác dụng (nút quay lui thật)

### Đo bằng chuỗi mô hình máy thật

<!-- Bắt buộc khi có đổi hành vi LLM. Ghi: mô hình / chuỗi đã dùng; đo qua Cổng thật hay chưa; bộ mẫu; số trước và sau.
     Số đo bằng mô hình khác (Gemini flash ở dev, LLM giả) ghi riêng, KHÔNG dùng làm lý do gộp.
     Chưa đo được trên máy thật thì ghi rõ "chưa đo" và ai sẽ đo sau khi QT bật. Có tra web: ghi số vòng đã chạy ở dev (L9: tối đa 1). -->

## Các ô còn lại

- [ ] **L2** — PR không thêm nơi dựng câu hỏi gửi khách ngoài lõi (`node scripts/test-cau-hoi-co-can-cu.mjs` xanh). Câu hỏi mới có `canCu` + `nguon`.
- [ ] **L3** — Không module nào tự đoán nhóm / phân nhóm. Ca test chứng minh cơ chế và có ca ngược.
- [ ] **L4** — Thêm route, hoặc nối / gỡ kho tri thức: đã sửa `data/luat/dau-noi.json` (`node scripts/test-dau-noi.mjs` xanh).
- [ ] **L5** — Có chạy bóng / ghi số đo: không chặn đường trả lời; dòng số đo có bên gọi, lý do bỏ qua, chi phí LLM; cờ `shadow` có chủ + ngày xét trong `data/luat/bang-co.json`.
- [ ] **L6** — Trường trạng thái mới phân biệt "chưa kiểm" với "đã kiểm, không có".
- [ ] **L7** — Mỗi con số trong PR ghi phép đo, mô hình, số mẫu; mẫu số đã tách "không cần" khỏi "thiếu".
- [ ] **L8** — Thêm / đổi cờ `HS_*`: đã sửa `data/luat/bang-co.json` (`node scripts/test-bang-co.mjs` xanh).
- [ ] **L11** — Thêm / sửa nhánh tối ưu (dừng sớm, cache, bỏ vòng): không rẽ khi có tín hiệu tất định trái kết luận; kết quả ghi bước CHƯA chạy; đã khai `nhanhBoQua`; có số đúng nhóm của chính nhánh đó.

<!-- Ô không liên quan: đánh dấu và ghi "không áp dụng". -->

## Test

<!-- Lệnh đã chạy + tổng số ca + EXIT của chính lần chạy đó. Trọn bộ `npm test` lấy ở CI. -->

## Chưa kiểm / giới hạn

<!-- Điều chưa đo, chưa chạy qua Cổng, hoặc còn nghi. -->
