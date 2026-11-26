# M-74 (#1966) — Ngưỡng số và phân dải anh em (Chương 76)

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../../docs/mong/khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../docs/decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, khai trong `data/lop-kho.json`):**
  - `data/ho-so-ma/nguong/XV.jsonl`: **6 bản ghi `NGUONG`** ở cấp Phần XV (`phan:XV`).
  - `data/ho-so-ma/nguong/76.jsonl`: **41 bản ghi `NGUONG`** trên đường đi Chương 76 (`chuong:76` và `bieu:76*`).
  - **Tổng: 47 bản ghi**, không chứa dữ liệu khách, tờ khai hay tiền lệ `tb:`.
- **Công cụ & bài kiểm:**
  - `scripts/ho-so-ma/nguong.mjs` (`--tao`, `--kiem`, `--bao-cao`)
  - `scripts/ho-so-ma/nguong-test.mjs` (đã đăng ký vào `scripts/danh-sach-test.txt`)

## 1. Các cụm anh em phân dải bằng ngưỡng số (9 cụm — phủ kín dải)

Tất cả **9 cụm anh em** dưới đây đều qua Cổng 3 (`ANH EM`) và `kiemDaiAnhEm()`: không hở giữa chừng, không chồng dải, `voi` trỏ đúng anh em cùng cha:

| Cụm anh em (cha) | Đại lượng (đơn vị) | Các dải của từng nút | Căn cứ câu luật (`cau`) |
|---|---|---|---|
| `chuong:76` (`7606` ↔ `7607`) | chiều dày (`mm`) | `bieu:7607`: `(..0,2]` · `bieu:7606`: `(0,2..+∞)` | `bieu:7606#1`, `bieu:7607#1` |
| `chuong:76` (`7611` ↔ `7612`) | dung tích (`lít`) | `bieu:7612`: `(..300]` · `bieu:7611`: `(300..+∞)` | `bieu:7611#1`, `bieu:7612#1` |
| `bieu:76051` (`760511` ↔ `760519`) | kích thước mặt cắt ngang lớn nhất (`mm`) | `760519` (*Loại khác*): `(..7]` · `760511`: `(7..+∞)` | `bieu:760511#1` |
| `bieu:760519` (`76051910` ↔ `76051990`) | đường kính (`mm`) | `76051910`: `(..0,0508]` · `76051990` (*Loại khác*): `(0,0508..+∞)` | `bieu:76051910#1` |
| `bieu:76052` (`760521` ↔ `760529`) | kích thước mặt cắt ngang lớn nhất (`mm`) | `760529` (*Loại khác*): `(..7]` · `760521`: `(7..+∞)` | `bieu:760521#1` |
| `bieu:760529` (`76052910` ↔ `76052990`) | đường kính (`mm`) | `76052910`: `(..0,254]` · `76052990` (*Loại khác*): `(0,254..+∞)` | `bieu:76052910#1` |
| `bieu:7614101` (`76141011` / `.12` / `.19`) | đường kính (`mm`) | `.11`: `(..25,3]` · `.12`: `(25,3..28,28]` · `.19` (*Loại khác*): `(28,28..+∞)` | `bieu:76141011#1`, `bieu:76141012#1` |
| `bieu:7614901` (`76149011` / `.12` / `.19`) | đường kính (`mm`) | `.11`: `(..25,3]` · `.12`: `(25,3..28,28]` · `.19` (*Loại khác*): `(28,28..+∞)` | `bieu:76149011#1`, `bieu:76149012#1` |
| `bieu:76169` (`761691` ↔ `761699`) | kích thước mặt cắt ngang dây (`mm`) | `761691`: `(..6]` · `761699` (*Loại khác*, với lưới/tấm đan): `(6..+∞)` | `chuong:76:cgpn:2#1` |

## 2. Ngưỡng định nghĩa Phần XV & Chương 76 + ngưỡng đơn tại nút lá
- **Phần XV (`phan:XV`):** tỷ lệ khối lượng kim loại cơ bản trong hợp kim (`>= 50%`, `phan:XV:cg:5:b#1`), bột lọt rây `>= 90%` qua mắt rây `1 mm` (`phan:XV:cg:8:b#1`), tỉ lệ `chiều dày / chiều rộng > 1/10` với thanh/que & dây chữ nhật (`phan:XV:cg:9:a#3`, `c#3`) vs `<= 1/10` với tấm/lá/dải/lá mỏng (`phan:XV:cg:9:d#1`).
- **Chương 76 (`chuong:76` Chú giải phân nhóm 1):** nhôm không hợp kim `Al >= 99%`, `Fe+Si <= 1%`, mỗi nguyên tố khác `<= 0,1%` (`chuong:76:cgpn:1:a#1`), ngoại lệ `0,1% < Cu <= 0,2%` kèm `Cr <= 0,05%` và `Mn <= 0,05%` (`chuong:76:cgpn:1:a#3`), và hợp kim nhôm khi tổng nguyên tố khác `> 1%` (`chuong:76:cgpn:1:b:ii#1`).
  - *Lưu ý phân loại hợp kim:* 6 cặp anh em *không hợp kim vs hợp kim* (`7601.10/.20`, `7604.10/.2`, `7605.1/.2`, `7606.11/.12`, `7606.91/.92`, `7608.10/.20`) áp dụng đồng thời điều kiện đa nguyên tố `(i)` và `(ii)` của Chú giải phân nhóm 1, không quy về 1 trục `Al >= 99%` đơn lẻ (ví dụ `0,5% Cu` tổng tạp chất `0,5% <= 1%` vẫn là hợp kim do vi phạm bảng giới hạn `(i)`).
- **Nút 6/8 số & SEN:** `7606.12.33` (`chiều rộng > 1m`, tách với `.39` khi thuộc 5082/5182 dạng cuộn rộng `<= 1 m`); `7606.12.32` SEN (`độ dày 0,175..0,432 mm`, `chiều rộng 254..1000 mm`); `7606.12.33` SEN (`Al 93,5–96,0%`, `Mg 4,0–5,0%`, `Mn`); `7607.20.10` SEN (`16,35 pound/1000 ft2`, độ bức xạ `0,05`, độ phản xạ `95%`); `7616.99.30` (`đồng xèng hình tròn, chiều dày > 1/10 đường kính`).

## 3. Chỗ hở / chồng phát hiện từ chính văn bản luật & SEN

| Mục | Loại | Khoảng chồng / hở | Câu luật & trích nguyên văn | Xử lý theo luật |
|---|---|---|---|---|
| `7606` vs `7607` với `SEN 7606.12.32` | `CHONG_SEN_VOI_LUAT` | Đoạn `[0,175; 0,2] mm` | `bieu:7606#1` (`"chiều dày trên 0,2 mm"`), `bieu:7607#1` (`"chiều dày (trừ phần bồi) không quá 0,2 mm"`), `sen:76061232:1#3` (`"độ dày từ 0,175 mm nhưng không quá 0,432 mm"`) | Theo Quy tắc 1 (`LUAT` thắng `HUONG_DAN`): lá `<= 0,2 mm` phải xếp `76.07`, không vào `7606.12.32`. |
| `SEN 7606.12.33` bảng `Mn` 5182 vs 5082 | `HO_THONG_LE_SEN` | Khoảng `(0,15%; 0,20%)` Mn | `sen:76061233:1#2` (`"Mangan, Mn\t<= 0,15\t0,20 -0,50"`) | Bảng thông lệ tham khảo của SEN để hở giữa 5182 (`<= 0,15%`) và 5082 (`0,20–0,50%`); không tự điền ngưỡng ngoài chữ SEN. |

## 4. Đối chiếu tài liệu tham khảo `data/ho-so/ranh-gioi/76*.json`
Đã rà toàn bộ **18 tệp** `76*.json`; cả **8 mã số có ngưỡng định lượng** (`76051910`, `76052910`, `76061233`, `76141011`, `76141012`, `76149011`, `76149012`, `76169930`) đều đã chuyển sang `NGUONG` kèm `trich` nguyên văn và `duKien` có thật trong `cau`, đồng thời bổ sung thêm `7605.11/.21` (`> 7 mm`), `76.06/76.07` (`0,2 mm`), `76.11/76.12` (`300 lít`), Chú giải phân nhóm `1` & `2` Chương 76 (`7616.91 <= 6 mm`), Phần XV (`5/8/9`) và các ngưỡng từ `SEN`.
