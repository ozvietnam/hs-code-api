# Luật đo và vòng sửa lỗi tầng nhóm 4 số

CEO chốt ngày 23/11/2026. Bổ sung cho ADR-0004. Mọi agent làm việc trên tầng 4 số phải theo.

## Thước đo
- Bộ chuẩn theo luật: `data/bo-chuan/4so-v1.jsonl` (dùng để sửa) và `data/bo-chuan/4so-v2.jsonl` (dùng để kiểm). Tờ khai không phải đáp án.
- Một ca **đạt** khi:
  - nhãn `CHOT`: hệ chốt đúng nhóm trong nhãn;
  - nhãn `PHAN_VAN`: hệ KHÔNG chốt, mà trả đáp án điều kiện "Nếu A → nhóm X; nếu B → nhóm Y" có ít nhất hai nhánh trùng nhãn.
- Hệ trả một mã mà không chứng minh được bằng điều khoản luật thì tính là sai, kể cả khi trùng nhãn do may.

## Luật đo
1. **Chỉ đo lại các ca lần đo trước còn sai.** Danh sách ca sai nằm ở `docs/tang-4so/ca-sai-<bộ>-vong<N>.json`. Cấm chạy lại cả bộ 100, 200 hay 300 ca.
2. **Mỗi lần đo xong phải dừng lại tìm nguyên nhân từng ca sai.** Mỗi ca ghi đúng một nguyên nhân gốc:
   - `HIEU_HANG`: hiểu sai bản chất hàng;
   - `TIM_SOT`: nhóm đúng không vào danh sách ứng viên;
   - `THIEU_DIEU_KHOAN`: luật có điều khoản tách được nhưng dữ liệu chưa có hoặc chưa nối;
   - `AP_SAI`: điều khoản có trong hồ sơ mà bước so sánh không áp;
   - `KHONG_HOI`: thiếu dữ kiện quyết định mà vẫn chốt;
   - `NHAN_SAI`: nhãn bộ chuẩn sai. Phải nêu điều khoản chứng minh; QT duyệt mới được sửa nhãn.
3. **Sửa tận gốc trong mã hoặc dữ liệu luật**, theo nhóm nguyên nhân. Không vá riêng từng ca: cấm viết điều kiện theo tên hàng của ca thử.
4. **Đo lại đúng các ca vừa sửa.** Ca nào đạt thì ra khỏi danh sách. Ca chưa đạt quay lại bước 2.
5. Lặp cho tới khi danh sách rỗng. Mỗi vòng ghi một dòng vào `docs/tang-4so/nhat-ky-vong.md`: số vòng; số ca còn sai theo từng nguyên nhân; đã sửa gì (tệp, hàm); ca nào ra khỏi danh sách.
6. Bộ kiểm v2 cũng theo luật này: chỉ đo các ca v2 còn sai, sau khi danh sách v1 đã rỗng hoặc đứng yên qua hai vòng.

## Nguồn AI khi đo
- Gom ứng viên, tách chữ: máy nhà `gpu-nha` khi rảnh (đêm, tới 8h sáng).
- Hiểu hàng và phán xử: LLM mạnh qua gói thuê bao (Antigravity).
- Không dùng khoá đang phục vụ khách (MiniMax, Gemini của máy thật) cho vòng lặp này.
