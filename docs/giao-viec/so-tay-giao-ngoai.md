# Giao việc: dựng sổ tay chú giải cho các nhóm còn lại (giao agent ngoài)

- **Giao:** 2026-10-07. **Người duyệt và gộp:** Claude (phiên quản lý). Agent ngoài **không tự gộp** vào `main`.
- **Thiết kế:** [`docs/backlog/08-so-tay-chu-giai.md`](../backlog/08-so-tay-chu-giai.md).
- **Phạm vi:** 1.076 nhóm 4 số còn lại (đã trừ 152 nhóm của vòng 1, vòng 2 và đợt 1 theo tần suất, trừ chương 98), chia sẵn **180 lô**
  trong [`so-tay-lo.csv`](so-tay-lo.csv), **xếp theo ưu tiên (số tờ khai thật của Oz theo nhóm), không theo chương**. Cột `phu_cum_pct` là độ phủ
  tờ khai sau khi xong lô đó. Tái tạo bằng `node scripts/gen-so-tay-lo.mjs [--demand=<kết quả GET /api/demand>]`. Mỗi lô có tối đa 6 nhóm và ≤ 350 nghìn ký tự nguồn.
- **Một agent nhận một lô.** Ghi tên vào cột `nguoi_lam` và chuyển `trang_thai` sang `dang-lam`. Làm xong một lô thì mở **một PR**.


> **CẬP NHẬT 28/10/2026 — chia 3 tầng theo vai (progressive disclosure), không cần đọc trọn file này khi làm việc:**
> - Luật chung cho CẢ soạn lẫn soát: [`so-tay/LUAT-CHUNG.md`](so-tay/LUAT-CHUNG.md)
> - Người soạn một lô: [`so-tay/SOAN-LO.md`](so-tay/SOAN-LO.md)
> - Người soát độc lập một PR: [`so-tay/SOAT-LO.md`](so-tay/SOAT-LO.md)
>
> File này giờ giữ vai trò **lịch sử + bài học các vòng** (tra cứu khi cần).

## 00. Đợt 1 theo tần suất (09/10/2026, #194): 32 nhóm, phủ 83,4% lên 90,1%

Làm đúng quy trình dưới đây: 6 agent soạn (5–6 nhóm mỗi agent), 6 agent soát độc lập, máy kiểm lần cuối, rồi tự soát mẫu 26 mục ngẫu nhiên.
Kết quả: 821/821 mục đạt; soát độc lập xoá 14 và sửa 39 (vòng 2 là xoá 325 / sửa 95), ít hơn nhiều vì người soạn đã tránh sẵn các lỗi
đã biết và bị dặn "thà soạn ít mục chắc chắn". Lỗi mới người soát bắt được, nên thêm vào tiêu chí soát:

- **Cắt trích để né câu rào:** người soạn cắt câu trích ngay trước "tùy từng trường hợp"/"thường…" để qua luật máy (6110) → mục nói chắc hơn nguồn. Máy không bắt được, người soát phải bắt.
- **`hoi` của `phanBiet` bị đảo** so với câu loại trừ trong nguồn (9106, 9017, 7013): nhánh Có/Không bị hoán đổi hoặc `hoi` gộp thêm vế ngoài câu.
- **Một nhánh của "A hoặc B"** bị chọn làm đích duy nhất (8708 → 7009: nguồn nói "70.09 hoặc Chương 90").
- **Mất ngoại lệ ngay sau câu trích** (8708: kính an toàn chưa khung vẫn thuộc 8708.22 nếu có sưởi).
- Máy chỉ kiểm câu trích ≤ 600 ký tự (lược đồ ghi 300); trích 300–600 ký tự vẫn qua, người soát cần để mắt.

## 0. Vòng 2 (09/10/2026) và điều quan trọng nhất: PHẢI có người soát độc lập

Vòng 2 làm 60 nhóm hay gặp nhất trong tờ khai thật của Oz (xếp theo số tờ khai; chỉ đếm tổng theo nhóm). Máy kiểm chỉ chứng minh
câu trích có thật trong nguồn, **không** chứng minh nó nói đúng điều mục khẳng định. Khi giao 6 agent *soát độc lập* (không phải người soạn)
đọc lại từng mục cùng nguồn, họ xoá/sửa một phần lớn: vòng 2 xoá 325 + sửa 95 trên ~1.300 mục; vòng 1 (đã gộp từ 07/10, chỉ soát mẫu 13 mục)
soát lại xoá 262 + sửa 281. Kết luận: **không lô nào được gộp nếu chưa qua bước soát độc lập** (mục 4).

Bảng kiểu lỗi đã tách theo vai (28/10): các lỗi **máy tự loại** nằm ở [`so-tay/SOAN-LO.md`](so-tay/SOAN-LO.md), các lỗi **chỉ người soát bắt được** nằm ở [`so-tay/SOAT-LO.md`](so-tay/SOAT-LO.md).

**Ý nghĩa của `dieuKienVao` (quan trọng cho bước nối cổng):** đó là các sự kiện *mô tả hàng thuộc nhóm*, không phải điều kiện cần.
Cổng sau này **không được** loại một nhóm chỉ vì thiếu một `dieuKienVao`. Dùng chúng để gợi ý hỏi người khai, không để chặn.

## 1. Kết quả bước 1 và bài học (60 nhóm, 07/10/2026)

Bước 1 do phiên quản lý giao cho 10 agent con, mỗi agent 6 nhóm. Agent con soạn sổ tay theo đúng quy trình dưới đây.

| | |
|---|---|
| Mục đạt máy kiểm | **2.237/2.274 (98,4 %)**, 0 nhóm lỗi |
| Sổ tay ghi được | 58 phạm vi, 317 điều kiện vào, 530 loại trừ, 236 câu hỏi phân biệt, 40 quy tắc bộ phận, 1.056 dòng 8 số. 20 nhóm có dùng SEN |
| Chi phí mỗi agent (6 nhóm) | 145–280 nghìn token, 5–13 phút |
| Chi phí mỗi nhóm | ≈ 35 nghìn token. Nhóm dài nhất (8504, 78 nghìn ký tự nguồn) tốn gấp đôi |
| Soát tay ngẫu nhiên 13 mục | 13/13 đúng nghĩa |

Lỗi tìm được trong lúc làm, và cách đã xử lý:

| Lỗi | Xử lý |
|---|---|
| Các trường `bao_gom`, `khong_bao_gom`, `loai_tru`, `phan_biet`, `tinh_chat` thu qua KG là tóm tắt hoặc cắt dán, có chỗ gán nhầm nhóm (8480 mang nội dung 8482; 3307 mang chú giải Chương 34; 2917 khẳng định sai) | Máy kiểm **chỉ cho trích văn bản pháp lý nguyên văn**. Mục ghi các trường đó mà câu có nguyên văn ở nguồn thật thì được gắn lại nguồn, còn lại bị loại |
| Chú giải Phần của ch.39 và ch.40 là chú giải Phần VI, không phải Phần VII | Máy kiểm bỏ `phan<ch>.phan` khi văn bản không thuộc đúng Phần |
| Dòng biểu thuế VN chỉ ghi "- - - Loại khác", thiếu tên phân nhóm cha | Thêm nguồn `wco.<6 số>` (tên phân nhóm WCO) |
| Chú giải chương bị cắt trong prompt (ch.72 mất mục (IV)(B)) | Nới trần: chương 40 nghìn, Phần 25 nghìn ký tự |
| `phanBiet` trỏ tới mã mà câu trích không nêu (3812 → 2917 trong khi nguồn chỉ nói "Chương 29") | Máy kiểm loại câu này |
| Ghép hai câu xa nhau thành một kết luận (mạch MCO → 85.42) | Prompt cấm. **Máy chưa bắt được**, người duyệt phải soát |
| Agent ghi tên phân nhóm theo hiểu biết riêng vào `dieuKien` | Prompt cấm, có nguồn `wco` thay thế. **Máy không kiểm `dieuKien`**, người duyệt phải soát |

Lỗi của dữ liệu nguồn (kệ sách), cần sửa riêng chứ không sửa trong sổ tay:

- 8518: chú giải nhóm có đoạn "………", thiếu các phần B–D.
- 1702: mất dòng đầu.
- 3208, 4202: mất dòng tên nhóm.
- Chú giải nhóm còn dùng số hiệu chú giải chương cũ (8541 ghi "Chú giải 8 (a)", bản hiện hành là 12(a)).
- SEN gắn ở dòng cha: 8504 (đầu điện áp cao), 8536.

## 2. Gói việc cho một lô (người soạn)

Toàn bộ lệnh + mô tả PR phải có + bảng lỗi máy tự loại: [`so-tay/SOAN-LO.md`](so-tay/SOAN-LO.md).

## 3. Luật bắt buộc (máy kiểm phần lớn, phần còn lại người duyệt soát)

11 luật hiện chạy: [`so-tay/LUAT-CHUNG.md`](so-tay/LUAT-CHUNG.md) — bắt buộc với cả người soạn và người soát.

## 4. Người duyệt (phiên quản lý) làm gì với mỗi PR

Quy trình soát độc lập + danh sách lỗi máy không bắt được + thước đo "soát THẬT": [`so-tay/SOAT-LO.md`](so-tay/SOAT-LO.md).

Ước tính toàn bộ 185 lô: soạn ~35 nghìn token/nhóm + soát độc lập ~30 nghìn token/nhóm → khoảng 70 triệu token. Vòng 2 (60 nhóm) mất khoảng 2 giờ với 10 agent soạn + 6 agent soát chạy song song.
