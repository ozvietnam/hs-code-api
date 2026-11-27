> **Trạng thái: CEO duyệt 27/11 — CHỜ MÓNG XONG (cuốn chiếu M-81) mới bắt đầu V1.0.**

# Giai đoạn 2 — Ứng dụng thực chiến v1: "Đi bảng" (hs-code-api + Cổng OZ + /tro-ly + bot Zalo)

## Bối cảnh
- Móng (M-81, ADR-0007/0008/0009) biến mỗi gia đình anh em thành **bảng câu hỏi có/không có trích luật**; "Loại khác" = phần bù; mỗi mã 8 số có chuỗi điều kiện cần (của chính nó + mọi cấp cha) và `cauHoiToiThieu` do máy sinh.
- **Gemini Decision 1** (Google, `POST /v1beta/decisions`): một lượt nhận 1–1.000 câu hỏi `noul` (có/không) / `choice`, trả xác suất, ~0,5 giây, **miễn phí 10.000 lượt/ngày mỗi project**, đọc chữ + ảnh. Đúng khuôn với bảng anh em → "tìm đúng sai" thành việc trả lời từng câu có/không, máy tự đi bảng. Hiện **chưa dùng ở đâu** (khảo sát 27/11).
- Hiện trạng đường khách: hs-code-api `api/classify.js` (động cơ `lib/engine-loop.js`, chuỗi LLM `lib/llm-tier.js`: MiniMax → DeepSeek → Hermes → OpenRouter → Gemini); Cổng OZ MCP 25 công cụ (`apps/gateway/src/tools/index.ts`, `phan_loai_hs` → /api/classify); `/tro-ly` (`apps/gateway/src/tro-ly/`, Gemini flash-lite qua 9Router, luật lời nhắc `tro-ly/luat.ts`); bot Zalo gọi Cổng MCP (`core/mcp.js`, não định tuyến `packs/hs/brain.js` Gemini flash-lite, dựng câu trả lời tất định `packs/hs/render.js`).
- Chưa có bộ hội thoại thật của khách; bộ đo hiện có rút từ luật/TB-TCHQ (`scripts/ca-do/*.jsonl`, zalo-bot `eval/`, ozplugin `scripts/do-tro-ly-prod.mjs`).

## Nguyên tắc
1. **Máy đi bảng, mô hình quyết định trả lời có/không, mô hình trò chuyện chỉ hỏi và nói.** Mô hình trò chuyện không tự chọn mã (ADR-0004, ADR-0005).
2. Ba trạng thái mỗi câu: CÓ (xác suất ≥ ngưỡng trên) · KHÔNG (≤ ngưỡng dưới) · CHƯA BIẾT → dừng hỏi đúng `cauHoi` đó, hoặc chốt kèm giả định khi một nhánh gần như luôn đúng (quyết định CEO 24/11).
3. Trả cho khách: mã 8 số + căn cứ trích luật; thiếu dữ kiện thì 6 số đã chắc + **nói rõ thiếu gì** (CEO 21/11). Câu chữ với khách thật: CEO duyệt.
4. Mọi bước sau công tắc mặc định tắt; đo bậc thang T1/T2/T3 (đúng/sai/dừng hỏi, đích sai = 0) trên chuỗi mô hình máy thật; chỉ đo ca sai.
5. Chỗ máy không tự quyết (vùng chồng, trục đa trị, chữ mở `NGHIA_THUONG`) → gói trích luật cho mô hình mạnh hơn phân xử theo Quy tắc 3, ghi vết.

## Các bước (mỗi bước có cổng mở)
**V1.0 — Đo Gemini Decision trên bảng vàng (2 ngày, ngay khi 12 bảng vàng thành dữ liệu).**
Script `scripts/di-bang/do-quyet-dinh.mjs` (hs-code-api): lấy ca thử cổng 10 (ví dụ chú giải/SEN) của 12 nhóm vàng → gửi `cauHoi` của các nút dọc đường đi tới Decision → máy đi bảng → so đích vàng. Chọn ngưỡng trên/dưới cho xác suất. Cổng mở: đích sai = 0 trên ca VE_DONG; ca RE_NHANH phải ra "chưa biết" đúng dữ kiện quyết định.

**V1.1 — Bộ đề thực chiến (3 ngày, song song V1.0).**
Rút từ bảng `phan_loai_cong_viec` (Postgres `oz_gateway`, cột `dau_vao`: tenHang/thongSo/congDung/chatLieu…; ~511 lượt/7 ngày), nhật ký bot Zalo, và các hội thoại chị Vân chấm Haiku chưa đạt → 100 ca, đáp án do mô hình mạnh + luật chấm (quyết định CEO 13/11; thiếu dữ kiện thì chỉ ghi 6 số). Không lưu giá, số lượng, tờ khai. Đồng thời xếp **thứ tự cuốn chiếu M-81 theo tần suất nhóm 4 số khách hỏi**.

**V1.2 — Động cơ "đi bảng" chạy bóng (5–7 ngày).**
`lib/di-bang/` trong hs-code-api: vào cửa bằng tìm ứng viên đã có (GĐ2 top-5 93%) + khối phân biệt GĐ3 → với mỗi nhóm ứng viên đã `DONG` trong sổ điểm: gom câu hỏi theo tầng → Decision (gộp nhiều câu một lượt) → đi bảng → kết quả `{ma, capDaChot, canCu[], cauHoiThieu[], giaDinh[], soVet[]}`. Nhóm chưa `DONG` → động cơ cũ. Cờ `HS_DI_BANG=shadow`: chạy song song động cơ cũ, ghi so sánh, khách vẫn nhận bản cũ. Bộ khoá Decision nhiều project + dự phòng hỏi có/không bằng chuỗi LLM hiện có khi hết hạn mức.

**V1.3 — Cổng MCP + /tro-ly + bot Zalo (3–5 ngày).**
Công cụ mới `di_bang_hs` (hoặc `phan_loai_hs` đổi động cơ sau cờ) trả khối có cấu trúc trên; `tra_bang_anh_em` để LLM khách đọc bảng (lớp 4 của kế hoạch móng). `/tro-ly` và bot Zalo: mô hình trò chuyện giữ Gemini flash-lite; việc của nó là gom mô tả/ảnh, gọi công cụ, hỏi đúng `cauHoiThieu`, dựng câu trả lời (Zalo đã dựng tất định ở `render.js`). Haiku chỉ thử lại cho vai trò trò chuyện nếu bộ đề V1.1 cho thấy flash-lite hụt.

**V1.4 — Bật thật theo nhóm đã phủ (cuốn chiếu).**
Danh sách trắng: nhóm 4 số `DONG` + đạt T1/T2/T3 trên ca của nhóm đó → `HS_DI_BANG=on` cho nhóm ấy; mở rộng theo nhịp cuốn chiếu M-81. Kho đáp án lưu **câu trả lời theo từng điều kiện** (không theo tên hàng) để tránh bẫy cùng tên khác thông số.

## Ai làm
- agy: `lib/di-bang/`, script đo V1.0, công cụ MCP (theo thẻ GitHub, quy trình móng).
- Paperclip — GĐ hs-code-api: bộ đề V1.1, chạy bóng V1.2, báo số; GĐ Cổng OZ: công cụ + /tro-ly; GĐ zalo-bot: dựng câu trả lời.
- Phiên fork AI Studio: soát lớp hai mọi PR đụng đường khách.
- QT: ADR-0010 (kiến trúc đi bảng + mô hình quyết định), ngưỡng, ký qt-duyet kèm báo cáo bậc thang khớp sha.

## Điều kiện và rủi ro
- Phụ thuộc cuốn chiếu M-81: v1 chỉ phủ tới đâu móng tới đó; ưu tiên nhóm khách hỏi nhiều.
- Bậc miễn phí Decision: Google được dùng dữ liệu (CEO đã cho với thông tin hàng, không gửi tờ khai/giá); 10.000 lượt/ngày/project → nhiều project.
- Xác suất có thể lệch → ngưỡng chọn bằng số đo V1.0, không bằng mắt.
- Không huấn luyện mô hình riêng trong v1; bộ vết "mô tả → điều kiện → đường đi → câu hỏi" được ghi lại làm dữ liệu cho việc đó sau này.

## Kiểm
- V1.0: báo bảng đúng/sai/chưa biết trên ca vàng, đích sai = 0.
- V1.2: chạy bóng ≥ 3 ngày; so với động cơ cũ trên bộ đề V1.1 theo bậc thang; độ trễ thêm ≤ 1 giây.
- V1.3: `do-tro-ly-prod.mjs` (ozplugin) và `qa-that.mjs` (zalo-bot) không tụt so với mốc; câu chữ CEO duyệt.
