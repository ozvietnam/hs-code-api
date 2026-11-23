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

## Hồ sơ đi theo đồ thị (23/11/2026, vòng 4)
Áp cho mọi lượt phán xử tầng 4 số (so_nhom.py --ho-so do-thi). Căn cứ: ADR-0002, ADR-0004.
1. **Hồ sơ là các khoản NỐI, không phải cả Chương/Phần.** Với mỗi cặp nhóm ứng viên, chỉ đưa khoản luật nối hai nhóm đó: khoản loại trừ/định nghĩa của Chương/Phần nêu đích danh nhóm kia, cạnh LOAI_TRU / phân biệt / thông báo / WCO giữa hai nhóm, phanBiet trong sổ tay, Chú giải 1-2 Phần XVI khi hàng là bộ phận máy. Mỗi khoản nguyên văn + id + cạnh dẫn tới. Khoản trỏ cả Chương/Phần chỉ tính khi có chữ của hàng.
2. **Ứng viên sót được tìm bằng cạnh, không bằng cắt.** Đi 1 bước từ mỗi ứng viên theo cạnh sang nhóm chưa có; đồ thị đề xuất, độ liên quan với chữ của hàng và độ hội tụ xếp hạng (tối đa 12 nhóm thêm). Cấm cắt ứng viên vì độ dài; hồ sơ quá 40 KB thì báo, không cắt.
3. **Đo cấu trúc trước, đo LLM sau.** Mỗi lần đổi bảng cạnh/khoản phải chạy `scripts/tang-4so/kiem_do_thi.py` (không LLM) trên các ca còn sai: (i) nhóm trong nhãn có trong ứng viên sau mở rộng không; (ii) có khoản nối hai nhóm trong nhãn không, id nào; (iii) KB hồ sơ. Ca trượt (i) hay (ii) thì sửa dữ liệu/mã, không gọi LLM.
4. **Sửa tận gốc, không theo tên hàng.** Gốc thường gặp: khoản chú giải Phần bị tách sót (định dạng "N.-"), đích khoản rỗng khi luật chỉ nói "nhóm còn lại"/"chức năng riêng", cạnh có sẵn nhưng mã chỉ đi theo chữ của hàng. Thêm chú giải Phần phải qua `scripts/tang-4so/tach_phan_bo_sung.py` (tất định), không gõ tay.
5. **Khoản nối yếu không phải căn cứ.** Khoản chỉ trỏ cả Chương/Phần mà không gọi đúng loại hàng (vd Chú giải 1(a) Phần XVI cho 39.24 - 84.81) chỉ giúp đưa nhóm vào xét; căn cứ chốt hay hỏi phải là khoản gọi đúng loại hàng.
6. **Còn thiếu thì ghi rõ:** chú giải Phần của các Phần VII, VIII, IX, X, XII, XIII, XIV, XVIII-XXI chưa có trong data/chu-giai-chuong.json (chỉ có tiêu đề); data/luat/dieu-khoan-tang2.json còn thiếu Chương 54 trong apChoChuong Phần XI và có id trùng ở mục chú giải chi tiết Phần XVII. Đây là THIEU_DIEU_KHOAN, cần nguồn.
7. **Thu gọn hồ sơ, không cắt ứng viên (23/11, vòng 4b).** Mỗi nhóm: tên + chú giải chi tiết chỉ giữ đoạn đầu (phạm vi), đoạn có chữ của hàng (>= 2 từ khoá) và đoạn loại trừ/trỏ sang ứng viên khác; nhóm đáng xét còn lại và nhóm do đồ thị kéo thêm chỉ tên + phạm vi; nhóm ngoài tập đáng xét chỉ tên. Khoản nối chỉ xét giữa các nhóm đáng xét (10 nhóm khớp hàng nhất + 4 ứng viên gốc đầu + 5 nhóm đồ thị điểm cao nhất), mỗi cặp tối đa 2 khoản, một trích dẫn chỉ in một lần (C5 / C7 / phanBiet / điều khoản trùng chữ), tiền lệ chỉ lấy khi cặp chưa có khoản luật. Khoản định nghĩa quá 1.500 ký tự mà chỉ nêu cả Chương/Phần thì bỏ.
8. **Kiểm độc lập.** Phần mở rộng một bước đã chỉnh trên 11 ca v1; bộ v2 (40 ca sai vòng 0) là bộ kiểm không chỉnh thêm: `kiem_do_thi.py --ca-sai docs/tang-4so/ca-sai-v2-vong0.json --bo-chuan data/bo-chuan/4so-v2.jsonl`. Kết quả không được dùng để chỉnh trọng số rồi báo lại trên chính bộ đó.
9. **Thiếu dữ liệu luật** ghi ở `docs/tang-4so/thieu-du-lieu-luat.md` (danh sách Phần chưa có chú giải Phần). Lỗi dữ liệu tách điều khoản sửa bằng `scripts/tang-4so/sua_dieu_khoan_tang2.py`, không sửa tay.
