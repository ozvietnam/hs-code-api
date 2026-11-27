# Vòng 2b — sót chồng của DÂY CHUYỀN (soạn Gemini + soi Gemma 4 31B + cổng 8)
Nguồn: phiếu bản gốc (bộ b trong <nhom>.md mục 6), ~/phieu2/soi/soi-<nhom>-gemma4_31b.json, ~/phieu2/cong-goc/<nhom>.txt.
Xếp mỗi cặp chồng vàng (GIAI_CHONG + VUNG_CHONG): (1) phiếu đã giải/tách · (2) chưa, khâu SOI chỉ ra · (3) chưa, CỔNG 8 cảnh báo đúng cặp · (4) sót cả dây chuyền.
Lưu ý cổng 8: tệp chỉ in 20 cảnh báo đầu mỗi nhóm (4016 có 52, 9405 có 24). Cặp không thấy trong 20 dòng được suy từ trục bản gốc: hai nút khác trục hoặc CO_KHONG → máy không chứng minh rời → có cảnh báo; cùng trục đơn trị khác giá trị → máy coi rời → KHÔNG cảnh báo. Đánh dấu "(suy ra)".

## Bảng
| Nhóm | Cặp vàng | (1) phiếu | (2) soi | (3) cổng 8 | (4) sót | Sót A (soạn+soi) | Sót B (+cổng 8) |
|---|---|---|---|---|---|---|---|
| 8516 | 9 | 9 | 0 | 0 | 0 | 0/9 = 0 % | 0 % |
| 8471 | 6 | 6 | 0 | 0 | 0 | 0/6 = 0 % | 0 % |
| 4016 | 10 | 3 | 1 | 6 | 0 | 6/10 = 60 % | 0 % |
| 9405 | 39 | 31 | 5 | 1 | 2 | 3/39 = 7,7 % | 2/39 = 5,1 % |
| **Gộp** | **64** | **49** | **6** | **7** | **2** | **9/64 = 14,1 %** | **2/64 = 3,1 %** |

## Chi tiết từng nhóm
**4016** (phiếu sót 7):
- (2) soi: 4016991 × 4016995 — "gioăng cao su cho động cơ ô tô" (đúng mặt hàng, đúng lý do).
- (3) cổng 8: 40169920 × 4016995, 40169930 × 4016995 (thấy); 40169940 × 4016995, 40169912 × 40169916/17/18 (suy ra: 4016995 trục "mục đích" daTri, .40/.16 CO_KHONG, .12 trục "nhóm xe" ≠ trục "vai trò xe đạp").
- Soi không thấy cặp nào trong 3 VUNG_CHONG xe đạp có động cơ phụ trợ; cổng 8 chỉ bắt được vì khác trục, lẫn trong 52 cảnh báo (46 không phải cặp chồng vàng).

**9405** (phiếu sót 8):
- (2) soi: 940591 × 940592 (chao thủy tinh viền nhựa — đúng mẫu Quy tắc 3); [9405501] × 94055040 (đèn bão đốt dầu), × 94055050 (đèn thợ mỏ đốt dầu); 94054110 × 94054130, 94054210 × 94054230 (đèn pha tàu thủy bằng kim loại cơ bản) — đều là VUNG_CHONG vàng.
- (3) cổng 8: 94054910 × 94054930 (soi ở bảng 940549 lại nêu nhầm cặp pha × "Loại khác").
- (4) sót cả dây chuyền: 94059120 × 94059150 và 94059220 × 94059230 (bộ phận của đèn pha nếu đèn pha là một loại đèn rọi). Phiếu để trục "loại đèn dùng bộ phận" ĐƠN trị (vàng đa trị) → máy coi rời, cổng 8 im; soi không nêu. Cùng gốc: 940591 × 940592 cũng đơn trị, cổng 8 im, chỉ soi cứu được.

**8516, 8471**: phiếu đã giải hết; soi nêu lại các cặp vàng đã có GIAI_CHONG (xem dưới).

## Chấm khâu soi
Chồng soi nêu 21: ĐÚNG 18 · THỪA 3. Hở soi nêu 2: đúng 2 · sai 0.
| Nhóm | Cặp soi nêu | Đánh giá |
|---|---|---|
| 8516 | 851680 × 851690 (thanh nhiệt thay thế) | ĐÚNG — cặp vàng (CHU_GIAI ct:66#1), phiếu đã có GIAI_CHONG, điều kiện chưa tách |
| 8516 HỞ | [85163]: máy sấy tóc không phải loại chụp đầu/dạng súng | ĐÚNG — câu 851631 của phiếu viết phần "chụp đầu hoặc dạng súng" như điều kiện hạn chế, trong khi chú giải ghi "kể cả" |
| 8471 | 847160 × 847170; 84718010 × 84718070 | ĐÚNG x2 — cặp vàng, phiếu có GIAI_CHONG |
| 8471 | 84716030 × 84716040 (bàn phím có touchpad); 84719010 × 84719030 (máy quét mã vạch + vân tay) | ĐÚNG x2 — vàng CHUA_CHUNG_MINH_TACH (Chú giải 3 Phần XVI), chồng thật |
| 8471 HỞ | [84714]: máy chỉ có CPU, không có bộ nhập/xuất | ĐÚNG — vàng cũng giữ HO_PHU có chủ đích (điểm g5) |
| 4016 | 4016991 × 4016995 | ĐÚNG — cặp vàng |
| 4016 | 40169960 × 4016995 (lót đường ray); 40169970 × 4016995 (gối cầu) | ĐÚNG x2 — vàng CHUA_CHUNG_MINH_TACH: "khác" của 4016995 không trỏ anh em đứng sau, luật không tách |
| 4016 | 40169110 × 40169120 (thảm ghép hình) | **THỪA** — thảm ghép là "tấm rời để ghép" (.20), không phải tấm nguyên chiếc; luật tách theo dạng, phiếu cùng trục đơn trị đã tách |
| 9405 | 940591×940592; 9405501×.40, ×.50; .41 .10×.30; .42 .10×.30 | ĐÚNG x5 — cặp vàng |
| 9405 | 94051991 × 94051992 (đèn rọi dùng bóng huỳnh quang); 94059120 × 94059140; 94059210 × 94059220; 94059910 × 94059940; 94059920 × 94059930 | ĐÚNG x5 — vàng CHUA_CHUNG_MINH_TACH (trục đèn chủ đa trị × kiểu/vật liệu bộ phận), chồng có thật |
| 9405 | 94053 × 940550 ("dây đèn Nô-en không dùng điện, hạt phát quang") | **THỪA** — mặt hàng ví dụ không phải đèn/bộ đèn (hạt phát quang không có nguồn sáng); không có câu luật hay ví dụ thật cho dây đèn Nô-en không điện |
| 9405 | 94054910 × 94054990 (đèn pha × "Loại khác") | **THỪA** — "Loại khác" rời theo cấu trúc (Quy tắc 6, phần bù); không phải chồng. Soi bỏ qua đúng cặp cần nêu (.10 × .30) |

## Nhận xét
- Soi bắt 6/15 cặp phiếu sót (40 %), mạnh ở mẫu "đèn pha × đèn tàu", "đốt dầu × đèn bão/thợ mỏ", "hai vật liệu". Không bắt: 3 VUNG_CHONG xe đạp có động cơ (4016), 4 cặp "khác" của 4016995 chỉ bắt 1, 2 cặp bộ phận đèn pha/rọi (9405).
- Cổng 8 cứu thêm 7 cặp nhưng chỉ vì khác trục; độ nhiễu cao (4016: 52 cảnh báo, chỉ 6 là cặp vàng chưa giải). Khi người soạn để trục đơn trị sai (9405 bộ phận), cổng 8 im hẳn → 2 cặp sót cả dây chuyền. Lỗ chung: trục đơn trị/đa trị là điểm mù của cả soạn lẫn cổng.
