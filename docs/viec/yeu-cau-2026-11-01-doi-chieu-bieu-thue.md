# Yêu cầu: tra Công báo đối chiếu biểu thuế XNK từ 27/05/2026 + mức thuế tạm thời xăng dầu — gửi: văn phòng OZ — từ: DA-HS (hs-code-api)

Mục đích: `/api/health` và mọi kết quả soát tờ khai đang báo `bieuThue.freshness: DUE` ("Biểu thuế chưa được đối chiếu văn bản
mới từ 2026-05-27"). Không được đổi ngày đối chiếu khi chưa tra thật (CEO duyệt hướng này ngày 01/11/2026, #725 lỗi 11, PR #727).

Đã làm (DA-HS, 01/11/2026):
- Chạy `node scripts/radar-van-ban.mjs` (đọc RSS Công báo). Feed chỉ phủ **08/10 → 28/10/2026**: 50 văn bản, không có văn bản
  sửa biểu thuế XNK.
- Đối chiếu `data/plhq-registry.json` (bản chụp 30/10/2026), nhánh thuế/biểu thuế. Thấy **43/2026/NQ-CP** (30/09/2026, hiệu lực
  01/10–31/12/2026): kéo dài thuế NK ưu đãi tạm thời với xăng dầu, nối tiếp **NĐ 72/2026**. `data/tax.json` vẫn ghi `mfn: "10"`
  cho các mã chương 27 liên quan (ví dụ 27101224), tức **chưa phản ánh** mức tạm thời.

Cần làm:
1. Tra Công báo / customs.gov.vn / thuvienphapluat khoảng **27/05/2026 → 07/10/2026**. Tìm:
   - nghị định sửa NĐ 26/2023/NĐ-CP (biểu thuế XK, NK ưu đãi);
   - nghị định biểu thuế FTA mới hoặc sửa (ACFTA, ATIGA, CPTPP, EVFTA, RCEP…);
   - nghị quyết hoặc nghị định thuế tạm thời theo mặt hàng (như NĐ 72/2026, NQ 43/2026).

   Ghi lại số hiệu, ngày ký, hiệu lực, các mã HS bị đổi, và đường dẫn bản Công báo.
2. Với NĐ 72/2026 + NQ 43/2026: liệt kê đúng các mã 8 số và mức thuế tạm thời kèm thời hạn. DA-HS sẽ đưa vào dữ liệu theo dạng
   "mức tạm thời có thời hạn", không đè MFN gốc.
3. Ghi kết quả vào mục "Phản hồi" dưới đây (hoặc gửi tệp danh sách). DA-HS sẽ cập nhật `tax.json` / biểu thuế, chạy kiểm, rồi
   mới đổi `data/data-freshness.json → tariff.lastCheckedAt`.

Khi nào: trong tuần này. Cảnh báo DUE đang hiện trên mọi lượt soát của khách.

Kiểm tra xong (checklist):
- [ ] Danh sách văn bản 27/05 → 07/10/2026 (kể cả kết luận "không có" nếu không có), kèm nguồn
- [ ] Bảng mã + mức tạm thời xăng dầu theo NĐ 72/2026 + NQ 43/2026
- [ ] DA-HS cập nhật dữ liệu + `lastCheckedAt` (DA-HS làm, sau khi có hai mục trên)

Đường lùi (rollback): không thay đổi hệ thống ở bước tra cứu.

## Phản hồi của văn phòng

(văn phòng ghi vào đây)
