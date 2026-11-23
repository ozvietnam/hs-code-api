# Quy trình soạn BẢN ĐỒ QUAN HỆ tầng 4 số (Gemini ở AI Studio soạn, máy kiểm, chấm chéo mới nâng bậc)

**Phục vụ bước nào của ADR-0004:** Quy tắc 1 — so nhóm (B1: tìm đoạn văn bản luật nhắc tới hàng, đọc tên nhóm → chú giải Phần / Chương → chú giải chi tiết → ý kiến WCO, soát điều loại trừ trước). Bản đồ cho phép bước 4 số so theo NGHĨA của hàng (dạng vật lý, chất liệu, chức năng / cơ chế, dùng ở đâu, ai dùng, là bộ phận của gì) và cho cạnh phân biệt giữa các nhóm hay nhầm. Không phục vụ quy tắc nào khác; không đụng đường khách (`api/`, `lib/llm*`, cờ `HS_*`).

Vòng lặp theo skill `studio-loop`: Claude (hoặc người) chỉ đóng gói, đưa Studio, tải kết quả, kiểm, nạp, mở PR; KHÔNG tự soạn nội dung bản đồ; KHÔNG gọi LLM trả phí / API key.

## 1. Các món

| Món | Tệp | Việc |
|---|---|---|
| Khuôn (System instructions của Studio) | `docs/giao-viec/do-thi/SOAN-BAN-DO-4SO.md` | luật soạn, khuôn JSON `bd4@1` |
| Gói soạn | `node scripts/goi-soan-ban-do-4so.mjs --nhom=a,b,c --out=<tiền tố>` | `<tiền tố>.txt` cho Studio, `<tiền tố>.json` cho cổng |
| Cổng máy | `node scripts/kiem-ban-do-4so.mjs <tệp> --goi=<gói>.json` | đỏ / vàng, mã thoát 1 khi có đỏ |
| Ca tiêm lỗi | `node scripts/test-kiem-ban-do-4so.mjs` (trong `npm test`) | mỗi mã đỏ ≥ 1 ca |
| Nạp | `node scripts/nap-ban-do-4so.mjs <tệp> --goi=<gói>.json` | ghi `data/do-thi/ban-do-4so/<nhóm>.json` (`nguonLoai: AI_NHAP`, `taoBoi: google-studio`, `chamCheo: null`) |
| Chấm chéo | `node scripts/cham-cheo-ban-do-4so.mjs --goi --nhom=…` / `--ap=<kq.json>` | gói chấm chéo 12 nhóm; áp DUYET / SUA / BO |
| Cạnh trong đồ thị | `lib/do-thi/dung-bang-canh.js` loại **C16 Phân-biệt-theo-nghĩa** | bậc 4 mặc định; bậc 1 chỉ sau chấm chéo |

Cỡ gói (đo 23/11/2026, vòng 1, 30 nhóm): khoảng 640 nghìn ký tự, đã nằm trong mức Studio chạy được với sổ tay 4 số (1–1,6 triệu ký tự / lượt, 7–14 phút). Mốc 150 nghìn ký tự của gói PN6 không áp ở đây vì riêng chú giải chi tiết của 30 nhóm đã ≈ 190 nghìn. Nếu Studio chậm hoặc rỗng lượt: chia đôi gói (15 nhóm) rồi chạy lại. Đầu ra có trần ≈ 65 nghìn token nên khuôn bắt trả ≤ 4 nhóm / lượt và nối bằng `CON_LAI:` + "tiếp". Bài học vòng 1 (23/11): (1) 8 nhóm / lượt bị cắt giữa JSON; (2) Gemini hay quên dòng `CON_LAI:` — người / autopilot phải tự giữ danh sách nhóm đã soạn, không dựa vào dòng đó; (3) tắt Grounding with Google Search TRƯỚC khi Run, đổi sau lượt đầu không có tác dụng với chat đã chạy (có lượt vẫn kèm Citations web — cổng trích nguyên văn chặn phần đó); (4) cổng bỏ MỤC / CẠNH lỗi, không bỏ cả nhóm.

## 2. Vòng soạn

1. **Chọn lô.** Vòng 1 là gói mẫu 30 nhóm của 12 ca đang theo dõi. Các lô sau: `node scripts/goi-soan-ban-do-4so.mjs --lo-tiep` in 30 nhóm kế tiếp trong tập chiếm 80% số dòng tờ khai mẫu OZ, theo hạng của `data/do-thi/xep-hang-luong-hang.json` (93 nhóm theo số dòng), bỏ nhóm đã nạp.
2. **Sinh gói.** `node scripts/goi-soan-ban-do-4so.mjs --nhom=… --out=<thư mục tạm>/goi-vongN` (≤ 30 nhóm). Gói tất định: cùng kho, cùng nhóm ⇒ cùng mã gói (`bam`).
3. **Đẩy lên nhánh tạm** `tmp/studio-ban-do` (không gộp, không vào `main`) để trang Studio `fetch` qua `raw.githubusercontent.com`: `goi-vongN.txt`, `goi-vongN.json`, `system.md` (bản sao của khuôn). Tệp tạm KHÔNG commit vào nhánh PR.
4. **Chạy Studio** theo `studio-loop`: một tab; System instructions = `system.md`; prompt = nội dung `goi-vongN.txt`; model Gemini, tắt Code execution; chat mới sau mỗi 2–4 gói. Gặp "rate limit": đổi model rồi Run lại. Khi trả có `CON_LAI:` thì nhắn "tiếp".
5. **Tải và trích** các khối ```json của các lượt model thành một tệp (mảng); cùng nhóm xuất hiện nhiều lần thì bản cuối thắng.
6. **Cổng.** `node scripts/kiem-ban-do-4so.mjs <tệp> --goi=goi-vongN.json`. Mã thoát 1: nhóm đỏ KHÔNG được nạp. Nhóm đỏ gom vào danh sách treo, vòng sửa riêng cho đúng các nhóm đó (gói chỉ gồm nhóm đỏ + danh sách lỗi); không sửa tại chỗ cả gói. Nhóm Gemini tự thêm ngoài danh sách giao: bỏ (`NHOM_NGOAI_DANH_SACH`).
7. **Nạp.** `node scripts/nap-ban-do-4so.mjs <tệp> --goi=goi-vongN.json`, rồi `node scripts/dung-bang-canh.mjs --ghi` (cập nhật số đếm C16 ở `data/do-thi/thong-ke.json`), rồi `node scripts/test-bang-canh.mjs`. Cạnh vào bảng ở **bậc 4** (gợi ý), chưa được chốt mã.
8. **PR.** Chỉ commit `data/do-thi/ban-do-4so/*.json` và `data/do-thi/thong-ke.json`. Mô tả PR ghi "Phục vụ bước nào của ADR-0004: Quy tắc 1 — so nhóm", mã gói, số nhóm xanh / đỏ.

## 3. Chấm chéo (bắt buộc trước khi nâng bậc)

Cổng máy chỉ bảo đảm chữ trích đúng và khuôn đúng; nó KHÔNG biết cạnh có đúng nghĩa không. Phiên chấm chéo độc lập làm việc đó.

1. `node scripts/cham-cheo-ban-do-4so.mjs --lo-tiep` in tối đa 12 nhóm đã nạp mà chưa chấm.
2. `node scripts/cham-cheo-ban-do-4so.mjs --goi --nhom=<12 nhóm> > cham-cheo-N.txt`: mỗi nhóm kèm bản đồ đã nạp và đoạn luật mà từng căn cứ trích.
3. Đưa Studio (chat mới, model có thể khác model soạn). Câu dặn: với mỗi nhóm trả một mục `{ "nhom", "ketQua": "DUYET|SUA|BO", "loi": [{ "muc", "vi" }], "ghiChu" }`. Tiêu chí:
   - **DUYET**: mọi `y` / `dacDiem` / `neu` / `conNeu` đúng NGHĨA của đoạn trích (không chỉ trùng chữ); `thi` / `thiKia` đúng chiều; không suy rộng; hồ sơ không bịa trục.
   - **SUA**: có lỗi nghĩa cụ thể (nêu `muc` và lý do, dẫn chữ trong đoạn) nhưng sửa được.
   - **BO**: bản đồ hỏng cả nhóm (soạn từ trí nhớ, đảo chiều cạnh, nhiều cạnh vô căn cứ).
4. Áp: `node scripts/cham-cheo-ban-do-4so.mjs --ap=<kq.json>`; rồi `node scripts/dung-bang-canh.mjs --ghi`.
5. **Chỉ nâng bậc sau chấm chéo.** Lúc dựng bảng, một cạnh C16 lên **bậc 1** khi cả hai điều kiện: bản của nhóm có `chamCheo: DUYET` VÀ mọi `canCu` của cạnh còn là chuỗi con nguyên văn của đoạn nguồn (máy kiểm lại lúc dựng, không tin cờ trong tệp). `SUA` giữ bậc 4 chờ soạn lại; `BO` loại cạnh khỏi bảng. `nguonLoai` vẫn là `AI_NHAP` (không tự đổi thành `CLAUDE_DUYET` hay nhãn duyệt người; chuyện đó thuộc CEO).
6. Cạnh bậc 4 không được dùng để CHỐT nhóm, chỉ để gợi ý ứng viên và câu hỏi; đúng như cạnh C8 chưa duyệt.

## 4. Thứ tự các lô

| Lô | Nhóm | Ghi chú |
|---|---|---|
| Vòng 1 (mẫu) | 30 nhóm của 12 ca theo dõi | danh sách ở `goi-vong1` (nhánh `tmp/studio-ban-do`) |
| Lô 2, 3, … | `--lo-tiep`: 30 nhóm theo hạng trong tập chiếm 80% dòng tờ khai (93 nhóm), bỏ nhóm đã nạp | thứ tự lấy từ `data/do-thi/xep-hang-luong-hang.json`; cập nhật tệp xếp hạng bằng `dung-bang-canh.mjs --ghi` khi tờ khai mẫu đổi |
| Sau 80% | nhóm còn lại theo hạng, tới 95% (214 nhóm) | chỉ làm khi 80% đã chấm chéo xong và đo được lợi |

Dừng lô khi một vòng có hơn một nửa nhóm đỏ cổng: sửa khuôn trước (thêm ca tiêm lỗi + luật), không nhân bản tiếp.

## 5. Ranh giới

- Không gọi LLM / agy / khoá trả phí trong repo. Việc Gemini ở Studio nằm ngoài repo.
- Không đổi `api/`, `lib/llm*`, cờ `HS_*`. C16 thuộc `lib/do-thi/` (giai đoạn 1 của ADR-0002: chưa đường khách nào nạp).
- Tệp gói / khối ```json thô chỉ ở nhánh `tmp/studio-ban-do` hoặc ngoài repo; vào `main` chỉ có bản đã nạp qua cổng.
- Sửa kho (chú giải, điều khoản, sổ tay) làm đổi gói; bản đã nạp vẫn được kiểm lại căn cứ lúc dựng bảng cạnh (`canCuNguyenVan`), căn cứ hỏng thì cạnh tụt về bậc 4.
