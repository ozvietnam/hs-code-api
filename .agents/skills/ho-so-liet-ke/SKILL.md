---
name: ho-so-liet-ke
description: >-
  Quy tắc và quy trình chuẩn của QT để rút vấn đề chỉ liệt kê được (thẻ M-75,
  data/ho-so-ma/liet-ke/<ch>.jsonl: GIR 2a, GIR 3b/c, bộ phận, đa chức năng,
  công dụng/phù hợp) trên kho ozvietnam/hs-code-api. Bắt buộc nạp skill này trước
  khi làm mới hoặc sửa PR tra-tho của M-75 cho mọi chương.
---

# Skill `ho-so-liet-ke` — Vấn đề chỉ liệt kê được (M-75)

## 1. Mục đích & Phạm vi

Gắn vào đúng nút (`bieu:*` hoặc `chuong:<ch>`) mọi vấn đề phân loại mở chỉ có thể liệt kê câu hỏi từ luật (`loai: "CHI_LIET_KE"`) và ghi lý do tường minh cho các câu kích hoạt không đặt tiêu chí mở (`loai: "BO_QUA"`) trong `data/ho-so-ma/liet-ke/<ch>.jsonl`, kèm báo cáo `docs/mong/the/M-75-liet-ke-<ch>.md`.

- **Nhánh & Worktree:** Nhánh `agy/m-75-c<ch>` tách sạch từ `origin/main` mới nhất trên git worktree cô lập.
- **Phạm vi tệp cứng (2 tệp):** Chỉ chạm `data/ho-so-ma/liet-ke/<ch>.jsonl` và `docs/mong/the/M-75-liet-ke-<ch>.md` (không sửa `<PHAN>.jsonl`, `scripts/`, `data/lop-kho.json`, `api/`, `lib/`).
- **Ưu tiên `tra-tho`:** Có bất kỳ PR nào đang gắn nhãn `tra-tho` thì bắt buộc sửa xong trước khi nhận chương mới; tuyệt đối không tự `gh pr merge`.

---

## 2. Bốn Luật Bắt Buộc Của QT (Danh sách lỗi cấm & Ví dụ PR thật)

### Luật 1 — Cụm công dụng (`"chủ yếu/thường được dùng…"`, `"dùng để…"`) chỉ là `CHI_LIET_KE` khi LUẬT đặt chính công dụng làm điều kiện
- **Quy tắc:**
  - **Đánh `CHI_LIET_KE` khi:** Lời tên nhóm / phân nhóm / dòng biểu hoặc chú giải **PHÁP LÝ** (`nguon: "LUAT"`), hoặc câu chú giải chi tiết đặt điều kiện ranh giới đóng/mở nhóm (`"với điều kiện…"`, `"chỉ bao gồm…"`, `"trừ khi…"`), đặt chính mục đích sử dụng / sự phù hợp / tính chuyên dùng / GIR 2(a) / GIR 3(b) / bộ phận làm điều kiện phân loại.
  - **Đánh `BO_QUA` khi:** Câu chú giải chi tiết (`HUONG_DAN`) chỉ mô tả ứng dụng thương mại thông thường hoặc ví dụ minh hoạ của mặt hàng đã xác định theo bản chất vật lý/hoá học (`"Các sản phẩm này thường được dùng trong…"`, `"chủ yếu dùng để sản xuất…"` mà lời nhóm không hề chia theo công dụng).
- **Lỗi cấm (PR thật bị trả):**
  - `#2120` (Ch.35), `#2124` (Ch.25), `#2126` (Ch.27): đánh `CHI_LIET_KE` tràn lan cho các câu mô tả công dụng phổ biến trong chú giải giải thích khi lời nhóm không đặt điều kiện công dụng.

### Luật 2 — Cụm bao gồm cả hai trạng thái (`"đã hoặc chưa hoàn thiện"`, `"có hoặc không…"`, `"đã hay chưa…"`) → `BO_QUA`
- **Quy tắc:**
  - Các cụm liệt kê cả hai cực đối lập (`"đã hoặc chưa hoàn thiện"`, `"đã hoặc chưa ngâm tẩm"`, `"có hoặc không có lớp lót"`, `"có hoặc không kèm theo…"`) nghĩa là **nhóm nhận cả hai trạng thái**, không đặt câu hỏi sàng lọc nào.
  - Nếu câu chỉ trúng kích hoạt vì cụm bao gồm cả hai trạng thái đó → bắt buộc đánh `loai: "BO_QUA"`, `lyDo: "\"đã hoặc chưa hoàn thiện\" bao gồm cả hai trạng thái, không phải tiêu chí"` (hoặc trích đúng cụm `"có hoặc không…"` tương ứng).
  - Nếu cùng câu vừa có tiêu chí mở thật (ví dụ `"dùng để rây sàng"`, `"dùng cho máy móc"`) vừa có đuôi `"đã hoặc chưa hoàn thiện"` → giữ `CHI_LIET_KE` cho tiêu chí công dụng thật, nhưng `dieuKien` **chỉ được hỏi về tiêu chí công dụng thật**, tuyệt đối không hỏi về trạng thái hoàn thiện/chưa lắp ráp.
  - **Phân biệt chiều ngược lại:** Khi `"chưa hoàn thiện"` / `"chưa hoàn chỉnh"` / `"chưa lắp ráp"` đứng **một mình** để tách riêng phân nhóm/dòng (ví dụ `5702.3x`, `5702.50` `"chưa hoàn thiện"` đối lập với `5702.4x`, `5702.9x` `"đã hoàn thiện"`) → **giữ `CHI_LIET_KE`**.
- **Lỗi cấm (PR thật bị trả):**
  - `#2157` (Ch.57): đánh sai `CHI_LIET_KE` cho 5 tên nhóm `bieu:5701#1`..`5705#1` chỉ vì có cụm `"đã hoặc chưa hoàn thiện"`.
  - `#2159` (Ch.58): đánh sai `CHI_LIET_KE` cho `bieu:5805#1` vì cụm `"đã hoặc chưa hoàn thiện"`.

### Luật 3 — Chống bắt nhầm cụm từ khoá, dòng bảng số liệu, loại trừ M-72 và tiêu đề chương (GIR 1)
- **Quy tắc:** Bắt buộc đánh `BO_QUA` (nếu nằm trong tập câu kích hoạt của cổng) hoặc loại bỏ (nếu ngoài tập kích hoạt) đối với:
  1. **Bắt nhầm nghĩa tiếng Việt:** Ví dụ `"bộ phận của động vật"` / `"các bộ phận của cây"` chỉ nguồn gốc sinh học để chiết xuất/chế biến chứ không phải bộ phận cấu thành sản phẩm công nghiệp.
  2. **Dòng bảng số liệu / tiêu đề cột** (`| … |`) hoặc chú giải định lượng thuần số đã thuộc M-74.
  3. **Câu loại trừ sang nhóm/chương khác (`LOAI_SANG`)**: thuộc phạm vi thẻ M-72 / M-73 (ghi rõ `lyDo` dẫn chiếu nhóm bị loại sang).
  4. **Tiêu đề Chương (`bieu:<ch>#1`, `chuong:<ch>#1`)**: theo GIR 1, tên chương chỉ để tra cứu tham khảo, bắt buộc là `BO_QUA` (không bao giờ là `CHI_LIET_KE`).
  5. **Chất lượng câu `dieuKien`:** Phải là câu hỏi tiếng Việt đơn điều kiện trọn nghĩa, không có tiền tố `[...]`, không lọt mã nút nội bộ (`bieu XXXX`, `chuong NN`) và không có chuỗi cắt ngang từ `"…"`; trường `den` chỉ chứa mã nút đích hợp lệ thực sự tồn tại trong kho luật.
- **Lỗi cấm (PR thật bị trả):**
  - `#2120`, `#2126`: bắt nhầm `"bộ phận của động vật"` (nguồn chiết xuất dược chất) và dòng bảng kỹ thuật làm `CHI_LIET_KE`.

### Luật 4 — Tự dò `/dùng|sử dụng|phù hợp|thích hợp/` trên toàn bộ chú giải pháp lý + dòng biểu và ghi số đối soát
- **Quy tắc:** Bộ biểu thức `RE_KICH_HOAT_LIET_KE` của cổng chỉ là mức sàn tối thiểu (nhiều dòng biểu hoặc chú giải pháp lý viết `"loại dùng trong…"`, `"dùng làm…"`, `"sử dụng như…"`, `"phù hợp với…"`, `"thích hợp để…"`, `"Các bộ phận, đồ trang trí và đồ phụ trợ cho…"` không lọt vào regex hẹp).
- Trước khi chốt tệp, bắt buộc chạy lệnh dò mở rộng `/dùng|sử dụng|phù hợp|thích hợp|bộ phận|chưa lắp ráp|chưa hoàn chỉnh|chưa hoàn thiện|đặc trưng cơ bản|ở dạng bộ|để nhân giống|nhân giống|để gieo trồng|gieo trồng|để làm|để chế biến|để sản xuất|thức ăn chăn nuôi|thức ăn gia súc|dùng cho người|mục đích|để trồng|để gieo|hạt giống|cây giống|con giống|giống(?! như| nhau| với| hệt)/i` trên **toàn bộ chú giải pháp lý (`chuong` phần `cg`/`cgpn`) và dòng biểu (`bieu`)** của chương, xét duyệt từng câu trúng, bổ sung đủ các câu đặt điều kiện thật vào `<ch>.jsonl`, và ghi số lượng đối soát vào `docs/mong/the/M-75-liet-ke-<ch>.md`.
- **Lỗi cấm (PR thật bị trả vì bỏ sót):**
  - `#2125` (Ch.26), `#2128` (Ch.31), `#2130` (Ch.36), `#2133` (Ch.43): chỉ chạy theo `RE_KICH_HOAT_LIET_KE` nên bỏ sót các dòng biểu / chú giải pháp lý có điều kiện `"dùng…"` / `"sử dụng…"` / `"phù hợp…"`.

---

## 3. Các Bước Thực Hiện Chuẩn

1. **Chuẩn bị nhánh sạch trên worktree cô lập:**
   `git checkout -B agy/m-75-c<ch> origin/main` (hoặc `git checkout agy/m-75-c<ch>` khi vá PR `tra-tho` — thêm commit mới nối tiếp, không force-push).
2. **Quét 2 tầng câu ứng viên:**
   - Tầng 1: 100% câu khớp `RE_KICH_HOAT_LIET_KE` của chương (`kiemPhuLietKe` bắt buộc `thieu: []`).
   - Tầng 2: Toàn bộ câu `LUAT` (`chuong` `cg`/`cgpn` + `bieu`) khớp regex mở rộng ở Luật 4.
3. **Phân loại từng câu qua đủ 4 Luật & khử trùng tổ tiên–con cháu:**
   - Kiểm tra Luật 2 (`"đã hoặc chưa…"` / `"có hoặc không…"` → `BO_QUA`), Luật 1 (công dụng luật định vs mô tả thông thường), Luật 3 (tiêu đề chương GIR 1, nguồn chiết xuất, bảng, loại trừ M-72).
   - Tránh trùng tên câu hỏi giữa nút cha 6 số `.00` và nút con 8 số (`kiemTrungTenToTien` = `0`).
4. **Ghi báo cáo `docs/mong/the/M-75-liet-ke-<ch>.md`:** Nêu tổng số bản ghi (`CHI_LIET_KE` + `BO_QUA`), tỷ lệ phủ câu kích hoạt (`100%`), và số câu `LUAT` dò mở rộng `/dùng|sử dụng|phù hợp|thích hợp/` đã rà soát (Luật 4).
5. **Chạy trọn bộ lệnh tự kiểm & kiểm toán độc lập `oz-pr-auditor`** đạt `APPROVE` trước khi `git push` và báo `XONG` / `CẬP NHẬT` trên `#1967`.

---

## 4. Lệnh Tự Kiểm Trước Khi Nộp

```bash
CH="<ch>"

# 1. Tự dò /dùng|sử dụng|phù hợp|thích hợp/ trên chú giải pháp lý + dòng biểu + kiểm tra lỗi cấm Luật 2 & 3
node --input-type=module -e '
import fs from "node:fs";
import { napLuatCong } from "./scripts/ho-so-ma/cong.mjs";
import { laNutConTrungTenToTien } from "./scripts/ho-so-ma/liet-ke.mjs";
const ch = String(process.argv[1]).padStart(2, "0");
const luat = napLuatCong();
const reMoRong = /dùng|sử dụng|phù hợp|thích hợp|bộ phận|chưa lắp ráp|chưa hoàn chỉnh|chưa hoàn thiện|đặc trưng cơ bản|ở dạng bộ|để nhân giống|nhân giống|để gieo trồng|gieo trồng|để làm|để chế biến|để sản xuất|thức ăn chăn nuôi|thức ăn gia súc|dùng cho người|mục đích|để trồng|để gieo|hạt giống|cây giống|con giống|giống(?! như| nhau| với| hệt)/i;
const ids = [...luat.cau.keys()].filter(id => {
  if (id.startsWith(`chuong:${ch}:cg`)) return true;
  if (!new RegExp(`^bieu:${ch}\\d`).test(id)) return false;
  const nId = id.split("#")[0];
  return !laNutConTrungTenToTien(nId, luat);
});
const rows = fs.existsSync(`data/ho-so-ma/liet-ke/${ch}.jsonl`)
  ? fs.readFileSync(`data/ho-so-ma/liet-ke/${ch}.jsonl`, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l))
  : [];
const daCo = new Set(rows.map(r => r.cau));
const luatHits = ids.map(id => ({ id, text: luat.chuCau(id) })).filter(x => reMoRong.test(x.text));
const chuaGhi = luatHits.filter(x => !daCo.has(x.id));
console.log(`Dò mở rộng LUAT Ch.${ch}: trúng ${luatHits.length} câu, đã có trong ${ch}.jsonl: ${luatHits.length - chuaGhi.length}, chưa ghi: ${chuaGhi.length}`);
for (const m of chuaGhi) console.log(" [CHƯA GHI]", m.id, "=>", m.text);

for (const r of rows) {
  if (r.loai !== "CHI_LIET_KE") continue;
  if (/^(?:bieu|chuong):\d{2}#1$/.test(r.cau)) console.error(" [LỖI GIR1 TIÊU ĐỀ CHƯƠNG]", r.id, r.cau);
  if (/(?:đã hoặc chưa|có hoặc không|đã hay chưa)/i.test(r.trich) && /chưa hoàn thiện|chưa hoàn chỉnh|chưa lắp ráp/i.test(r.dieuKien))
    console.error(" [NGHI LỖI LUẬT 2 ĐÃ HOẶC CHƯA]", r.id, r.cau, "=>", r.dieuKien);
  if (/\b(?:bieu|chuong)\s+\d+|…/.test(r.dieuKien))
    console.error(" [LỖI CÚ PHÁP/CẮT CHỮ dieuKien]", r.id, "=>", r.dieuKien);
}
' "$CH"

# 2. Chạy cổng 4,5 M-75, bộ test liệt kê, hồ sơ mã, lớp kho và đếm ca thực tế
{
  node scripts/ho-so-ma/cong.mjs --pham-vi "chuong:${CH}" --cong 4,5 &&
  node scripts/ho-so-ma/liet-ke-test.mjs &&
  node scripts/test-ho-so-ma.mjs &&
  node scripts/test-ho-so-ma-tra.mjs &&
  node scripts/test-lop-kho.mjs;
} > "/tmp/m75-c${CH}.log" 2>&1; echo "EXIT=$?" >> "/tmp/m75-c${CH}.log"

node scripts/dem-ca-test.mjs "/tmp/m75-c${CH}.log"

# 3. Kiểm tra cứng phạm vi 2 tệp của thẻ M-75
git diff --name-only origin/main...HEAD | node scripts/kiem-pham-vi-the.mjs "[M-75] Vấn đề chỉ liệt kê được — Chương ${CH}" "agy/m-75-c${CH}"
```

- **Bổ sung 27/11 (lỗ hổng thật, PR M-75 Ch.01 của fork):** điều kiện mục đích viết bằng **"để …"** không chứa chữ "dùng" vẫn là CHI_LIET_KE theo Luật 1 — ví dụ dòng biểu "Loại thuần chủng để nhân giống", "Để nhân giống (SEN)" (0101.21, 0102.21, 0103.10, 0105.11.10…), "để gieo trồng" (Ch.07, 10, 12), "thức ăn chăn nuôi", "để chế biến", "dùng cho người". Dạng "… giống" không có chữ "để" cũng là mục đích nhân giống: "Cây phong lan giống" (0602.90.20), "Cây cao su giống (SEN)" (0602.90.50), "hạt giống", "để trồng", "để gieo" (Ch.07, 10, 12) — bắt bằng `giống(?! như| nhau| với| hệt)` để không dính "giống như". Dò mở rộng phải gồm các cụm này (regex dưới đã cập nhật). Các chương đã nộp trước 27/11 phải rà lại bằng regex mới (đợt B).
