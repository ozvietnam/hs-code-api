# 12 — Pipeline phân loại theo tầng + lớp "trợ lý cầm điện thoại" (CEO 16/10)

> Bối cảnh: bench 80 mẫu (15/10) chứng minh **suy nghĩ sâu tạo ra chất lượng** (tắt → Đ8 rơi 57→39),
> trong khi p50 ~115–150 s vượt trần 125 s của Cloudflare. Kết luận kiến trúc: **đừng rút ngắn
> suy nghĩ để vừa đường dây — đổi cách phục vụ, và tổ chức lại suy nghĩ thành từng tầng có căn cứ.**
> Hai phần của thiết kế này khớp hai ý CEO nêu ngày 16/10.

## Phần A — "Trợ lý cầm điện thoại" (async)

Bác sĩ cần thời gian suy nghĩ → không bắt khách ngồi nghe đường dây. Trợ lý trực tổng đài nhận cuộc,
ghi biên nhận, hẹn gọi lại:

1. `phan_loai_hs` (Cổng) **trả biên nhận tức thì** (<2 s): `{maLuot, trangThai: "DANG_XU_LY", uocTinhGiay: 90}`.
2. Worker nền chạy pipeline (mục B) — không còn bị trần HTTP nào cắt.
3. Tool mới `ket_qua_phan_loai(maLuot)` → trả: `DANG_XU_LY` (kèm đang ở bước nào) | `CAN_DU_KIEN` (danh sách câu hỏi — khách trả lời thì `bo_sung_du_kien(maLuot, ...)` chạy tiếp, **không mất công đã làm**) | `XONG` (kết quả đầy đủ như hiện tại).
4. Kết quả cache theo hash hồ sơ (TTL ngày) — SKU lặp không trả giá hai lần.

Chi phí: thêm bảng `phan_loai_cong_viec` (migration chỉ thêm) + worker queue trong tiến trình (không
cần Redis) + 2 tool mới + lời dặn J18 cập nhật ("luôn hỏi lại bằng ket_qua_phan_loai"). Ước ~1 ngày.
Không đổi gì các tool tra cứu tất định (vốn nhanh, giữ nguyên mode đồng bộ).

## Phần B — Pipeline chia tầng, tìm kiếm mở rộng GẮN MỤC TIÊU

Hiện trạng engine-loop: 1 lượt "hiểu" + 1 lượt "quyết định" + vòng sửa. Đề xuất tách thành 4 bước,
mỗi bước nhỏ–nhanh–có căn cứ riêng (đúng sứ mệnh phễu #236):

```
B1. KHUNG SẢN PHẨM (thinking-off, ~3-5 s)
    tên hàng vi/zh/en · brand · model · loại khai · chất liệu khai · công dụng khai
    + SO SÁNH với danh mục thuộc tính quyết định (attributes registry đã có):
      từng nhóm ứng viên cần fact gì → liệt kê GAP (đang thiếu gì, để quyết 2/4/8 số)
B1b. TÌM KIẾM MỞ RỘNG CÓ MỤC TIÊU (chỉ khi gap + có model/brand/URL)
    MỖI query sinh ra kèm mục tiêu gắn nhãn: "xác định [nguyên lý hoạt động]" /
    "[công suất danh định]" / "[vật liệu chính]" — không search chung chung.
    Kết quả trả về là TÍN HIỆU (hint) có source.url + trích đoạn, ghi rõ độ tin;
    KHÔNG BAO GIỜ là căn cứ pháp lý (luật: mọi chốt phải có bằng chứng từ kho pháp lý).
    Nguồn: search API (Brave/Serper — chọn sau, có câu chuyện chi phí + riêng tư bên dưới)
    + made-in-china đã có (giữ vai trò đối chiếu nhóm).
B2. HỒ SƠ BẢN CHẤT (gộp B1 + B1b + input khách, mỗi dòng ghi nguồn: KHÁCH / WEB / MIC)
B3. QUYẾT ĐỊNH PHỄU TỪNG TẦNG — mỗi tầng một lời gọi nhỏ, có basis + confidence + cờ riêng:
    3a. Chương (2 số): chú giải chương + loại trừ phần  ← ứng viên từ B1
    3b. Nhóm (4 số): chú giải nhóm + bảng quyết định + tiền lệ Oz/TB-TCHQ + cặp dễ nhầm
    3c. Dòng 6→8: so-tay dieuKienSo + anh-em cùng PN6 + ngưỡng số có trích dẫn
    Tầng trên hết sạch ứng viên → dừng sớm, trả NEED_FACTS/NEEDS_EXPERT (tiết kiệm tầng dưới).
    Cache được đáp án 3a/3b theo (hồ sơ, nhóm) → lần sau chỉ chạy 3c.
B4. CÁC TOOL HIỆN CÓ giữ nguyên: tra_thue / tra_thu_tuc / describe / ... chạy trên mã đã chốt.
```

Vì sao tách tầng lại **nhanh hơn** gộp một lượt 130 s: mỗi call prompt nhỏ hơn nhiều (chỉ mang
chú giải của TỪNG tầng, không phải gói 10k ký tự), thinking trong phạm vi hẹp nên ít lang thang;
tổng 3 call nhỏ ~30–60 s < 1 call khổng lồ. Được kiểm bằng bench trước khi chốt (xem E).

## Phần C — Ràng buộc phải giữ (không thương lượng)

- Web search **chỉ gửi model/brand/URL công khai + từ khoá mục tiêu**, không gửi nguyên văn mô tả
  khách (nhất là khi `X-OZ-Chia-Se: 0`) — chống rò dữ liệu qua log search engine.
- Tín hiệu web không bao giờ được trích vào `basis`/`canCuPhapLy`; máy kiểm trích dẫn vẫn chỉ chấp nhận
  nguồn hồ sơ GỐC + kho pháp lý (luật bất biến).
- `nhanAi: "AI_CHUA_KIEM"` áp cho mọi trường B1b sinh ra (đã có hạ tầng nhãn từ ozplugin #171).

## Phần D — Việc cần quyết (chờ CEO)

1. **Duyệt kiến trúc A+B** để chia milestone (ước: A ~1 ngày; B tách 3 PR nhỏ B1/B1b/B3 + bench).
2. **Chọn search API** (Brave Search API ~$5/1k; Serper ~$1/1k; Google CSE) — chi phí vận hành mới,
   cần anh duyệt vì liên quan thẻ thanh toán.
3. Bench `low` (đang chạy, ~11:30 xong) — nếu Đ8 giữ ≥55 và p50 <110 s thì **tạm bật làm cầu nối**
   trong lúc xây A+B (1 biến env, revert được).

## Phần E — Cách nghiệm thu

- Bench 80 vàng × 2 lượt cho MỖI thay đổi (theo luật #193): Đ8 không giảm quá 2 điểm; p50/p90 phải giảm thật.
- A: hết 524/connection-lost trên log Cổng; thời gian phản hồi biên nhận <2 s.
- B1b: tỉ lệ ca "đáng lẽ tự tìm được" chuyển thành hết gap (đo bằng số ca NEED_FACTS giảm).
