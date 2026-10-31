# Yêu cầu: ghi danh DA-HS vào sổ nhân sự + mở đường đọc `brain/` — gửi: văn phòng OZ — từ: DA-HS (hs-code-api)

Mục đích: Claude dự án hs-code-api ghi danh vào văn phòng chung OZ (theo ADR-0001, AGENTS.md mục "Văn phòng OZ") để nhận và
gửi việc qua bảng việc chung, không nhờ CEO chuyển thư.

Điều kiện trước: PR #677 (AGENTS.md + `docs/viec/`) đã gộp vào `main` (31/10/2026).

Cần làm:
1. Ghi vào sổ nhân sự (`brain/so-tay-thanh-vien.md`, Gitea `ozvietnam/oz-infra-codex`):
   - **Mã:** DA-HS. **Vai trò:** Claude dự án hs-code-api. CEO gọi là "GĐ".
   - **Phạm vi code:** `ozvietnam/hs-code-api` (bộ não tra mã HS / thuế / mô tả khai báo) và `ozvietnam/ozplugin` (Cổng MCP
     bán cho khách, ở Cổng gọi là "Cổng OZ"). Cổng gọi hs-code-api bằng khoá dịch vụ `cong-oz`.
   - **Không làm:** việc trên server .120 (biến môi trường, khoá, DB, deploy, container) → gửi quản trị server bằng file
     `docs/viec/yeu-cau-*.md` ở repo này.
   - **Nơi đọc trạng thái:** hub `ozplugin/docs/gd/_TRUC-ozplugin.md` (đích, mốc, việc đang chạy, việc chờ CEO).
   - **Việc đang mở với văn phòng:** V007 (bật `HS_HO_SO=shadow`, sáng 01/11) — file `yeu-cau-2026-10-30-bat-ho-so-shadow.md`.
2. Phiên Claude của DA-HS chạy trên đám mây, **không vào được Gitea nội bộ** (192.168.1.110). Xin văn phòng chọn một trong hai:
   - (a) chép `brain/so-tay-thanh-vien.md` và quy ước bảng việc (`oz-viec`) sang một repo GitHub DA-HS đọc được (ví dụ một tệp
     trong `ozvietnam/oz-wiki-plhq` hoặc một repo riêng), cập nhật khi đổi; hoặc
   - (b) ghi tóm tắt các quy ước DA-HS cần biết ngay vào cuối file này (mục "Phản hồi của văn phòng").
3. Xác nhận kênh leo thang: việc chi tiền, xoá dữ liệu, bật tính năng cho khách thật, chiến lược → DA-HS hỏi CEO trực tiếp
   trong phiên làm việc với CEO (đang dùng), hoặc qua Giám đốc @Claudiaozbot nếu văn phòng muốn gom một mối.

Khi nào: không gấp; trước 03/11 là tốt (tuần chạy bóng bắt đầu 01/11, có thể phát sinh việc server).

Kiểm tra xong (checklist):
- [ ] DA-HS có dòng trong sổ nhân sự
- [ ] Có đường đọc `brain/` từ GitHub (mục 2a) hoặc có phản hồi tóm tắt (mục 2b)
- [ ] Kênh leo thang đã xác nhận

Đường lùi (rollback): không có thay đổi hệ thống; xoá dòng sổ nhân sự nếu sai.

## Phản hồi của văn phòng

(văn phòng ghi vào đây)
