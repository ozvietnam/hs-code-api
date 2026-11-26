# M-74 (#1966) — Ngưỡng số và phân dải anh em — Chương 41

- **Khuôn áp dụng:** `ho-so-ma@1` ([`docs/mong/khuon-ho-so-ma.md`](../khuon-ho-so-ma.md), [`docs/decisions/0006-ho-so-van-de-ma-8-so.md`](../../decisions/0006-ho-so-van-de-ma-8-so.md))
- **Kho dữ liệu (`RUT_TU_LUAT`, theo `data/lop-kho.json` trên `main`):**
  - `data/ho-so-ma/nguong/41.jsonl`: **9 bản ghi** (**8 `NGUONG`**, **1 `TACH_ANH_EM`**, **1** bản ghi "Loại khác" gắn mảng `phuDinh`).
- **Đối soát tự động số + đơn vị & rà 7 Luật QT (`ho-so-nguong`, Luật 6):**
  - **Chú giải pháp lý + dòng biểu (`chuong:41:cg*`, `phan:VIII*`, `bieu:41*`):** **4 câu trúng số+đơn vị / 4 câu đã rút thành bản ghi / 0 câu bỏ sót** (`bieu:410120#1` và `bieu:41012000#1` mỗi câu tách đủ **3 `NGUONG`** theo 3 nhánh trạng thái bảo quản `≤ 8 kg` khi làm khô đơn giản, `≤ 10 kg` khi muối khô, `≤ 16 kg` khi ở dạng tươi/muối ướt/bảo quản cách khác theo Luật 3–4; `bieu:410150#1` và `bieu:41015000#1` rút **2 `NGUONG`** `> 16 kg`; `bieu:410190#1` gắn **1 `TACH_ANH_EM`** với `phuDinh: ["bieu:410120", "bieu:410150"]` theo Luật 1–2; 16 câu khác có chữ số chỉ là số thứ tự mục và mã nhóm/chương dẫn chiếu hợp lệ được bỏ qua).
  - **SEN, chú giải chi tiết & `ranh-gioi`:** `sen:41*` và `pn:41*` có **0 câu**; `data/ho-so/ranh-gioi/41*.json` (`410190.json`, `410411.json`) có **0 dòng `dieuKienSo` định lượng**; `nhom:41*` (`HUONG_DAN`) có **2 câu** giải thích mặt hàng da láng/da láng phủ màng mỏng trong cùng phân nhóm `4114.20` (`nhom:4114:ct:15#1`, `nhom:4114:ct:17#1`, bỏ qua hợp lệ theo lớp giải thích thuật ngữ cùng phân nhóm); toàn bộ bản ghi gắn trực tiếp nút `bieu:*` (Luật 7).
- **Tuân thủ quy tắc QT:**
  - Không lấy thông số ví dụ, bảng mẫu hay ước lượng; trích đúng câu của chính nút; không gắn `gir:`, `wco:`, `tb:`; dùng bộ kiểm chung [`scripts/ho-so-ma/nguong-test.mjs`](../../../scripts/ho-so-ma/nguong-test.mjs) và [`scripts/ho-so-ma/cong.mjs`](../../../scripts/ho-so-ma/cong.mjs).
