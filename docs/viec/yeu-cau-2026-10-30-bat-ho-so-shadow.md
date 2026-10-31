> Ghi nhận văn phòng OZ: **V007** trên bảng việc chung — quản trị server làm sáng 01/11/2026, báo Giám đốc. (Đây là yêu cầu mẫu đầu tiên của repo.)

> **Gửi dev máy chủ — từ CEO Oz (30/10/2026).** Điều kiện ở mục 0 **đã đủ**: mã đã lên `main` (PR #674, commit `b4ba34e`).
> **Làm vào sáng 01/11/2026 hoặc sau đó** (khi gói MiniMax có lại hạn mức, để không tốn tiền Gemini trả phí).
> Xong mục 6 thì gửi lại kết quả cho CEO. Thắc mắc thì hỏi CEO, CEO chuyển cho GĐ (Claude).

# Bật chạy bóng hồ sơ phân loại (`HS_HO_SO=shadow`) + chạy thử nội bộ

Việc của dev máy chủ (.120). Job L1-5f (#648). Không cần Claude. Làm theo thứ tự, đánh dấu từng ô ở mục 6.

**Mục đích:** cho động cơ "hồ sơ phân loại" chạy ngầm trên lượt thật của các mã lát 1, chỉ ghi **số đo** (không ghi nội dung
khách). Khách và ERP vẫn nhận phản hồi **y như cũ**. Riêng một khoá nội bộ mới (`oz-noi-bo`) được nhận bản mới để nhóm Oz
xem thử bằng mắt, không đụng khách.

Hợp đồng chi tiết: `docs/api/ho-so-contract.md` mục 0. Biến môi trường chung của máy chủ: `docs/deploy-coolify.md`.

---

## 0. Điều kiện trước

- PR L1-5f đã gộp vào `main` trên GitHub `ozvietnam/hs-code-api` (cần mã có `HS_HO_SO_THU_CALLERS` và
  `/api/admin/ho-so-shadow`).
- Có quyền SSH vào .120 và sửa được `/opt/hs-code-api/hs.env`.
- Biết `HS_API_TOKEN` (để đọc báo cáo). **Không** dán khoá nào vào issue, chat hay tài liệu.

## 1. Tạo khoá dịch vụ nội bộ `oz-noi-bo`

Khoá dịch vụ nằm trong **một** biến `HS_SERVICE_TOKENS`, dạng `tên:khoá` cách nhau bằng dấu phẩy (đọc ở
`lib/auth.js#parseServiceTokens`): tên là phần trước dấu `:` **đầu tiên**, khoá là phần còn lại. Hiện có dạng:

```
HS_SERVICE_TOKENS=cong-oz:<khoá-cổng>,erp:<khoá-erp>
```

1. Sinh khoá mới (chỉ chữ + số, không có dấu `,` hay `:`):

   ```bash
   openssl rand -hex 32
   ```

   Lưu khoá này ở nơi đang lưu các khoá khác. Đây là khoá của nhóm Oz dùng để xem thử.
2. Mở `/opt/hs-code-api/hs.env`, tìm dòng `HS_SERVICE_TOKENS=` và **thêm vào cuối dòng đó** (giữ nguyên các mục cũ):

   ```
   HS_SERVICE_TOKENS=cong-oz:<khoá-cổng>,erp:<khoá-erp>,oz-noi-bo:<khoá-mới>
   ```

   `deploy-safe.sh` chạy container bằng `docker run --env-file`, docker đọc giá trị **nguyên văn**: giữ đúng kiểu viết của
   dòng hiện có, không thêm dấu nháy, không thêm dấu cách quanh `,` và `:`.
3. **Không** thêm `oz-noi-bo` vào `HS_INTERNAL_CALLERS` (không cần — biến đó chỉ cho khoá nhận số đếm từ kho tờ khai Oz).

## 2. Đặt biến bật chạy bóng

Thêm hai dòng vào `/opt/hs-code-api/hs.env`:

```
HS_HO_SO=shadow
HS_HO_SO_THU_CALLERS=oz-noi-bo
```

Ý nghĩa:

| Biến | Giá trị | Tác dụng |
|---|---|---|
| `HS_HO_SO` | `shadow` | Mã lát 1 có ranh giới đã duyệt: tính hồ sơ ngầm, ghi một dòng số đo vào `/data/ho-so-shadow.jsonl`, **trả phản hồi cũ**. Mã khác: không đổi gì. |
| `HS_HO_SO_THU_CALLERS` | `oz-noi-bo` | Lượt gọi bằng khoá `oz-noi-bo` được nhận **bản mới** (như `on`): có `hoSo`, `moTaEcus`, `hoSoMeta.cheDo = "on"`, `hoSoMeta.thuNoiBo = true`. Vẫn ghi số đo, đánh dấu `cheDo: "thu"`. |

**Cấm** ghi `erp` hay `cong-oz` vào `HS_HO_SO_THU_CALLERS`: ERP và Cổng đang phục vụ khách thật, ghi vào là khách nhận bản
mới ngay. Lượt công khai (không token) và `HS_API_TOKEN` không bao giờ được chạy thử, dù ghi gì vào biến này.

Không cần đặt thêm biến nào. Các biến tuỳ chọn (để mặc định trừ khi GĐ yêu cầu):

| Biến | Mặc định | Khi nào đổi |
|---|---|---|
| `HS_HO_SO_VIET` | `LLM` | `MAY` = bộ viết không gọi LLM (bớt chi phí, nhưng không đo được tỉ lệ LLM rơi về máy) |
| `HS_HO_SO_NGHIEN_CUU` | bật | `false` = tắt tra web/định danh trong bước nghiên cứu |
| `HS_HO_SO_HAN_DOC_MS` / `_DOI_CHIEU_MS` / `_NGHIEN_CUU_MS` / `_VIET_MS` | 35000 / 15000 / 30000 / 35000 | Hạn từng bước (ms); quá hạn thì bước đó rơi về phần máy |

**Chi phí:** ở chế độ `shadow`, mỗi lượt `describe`/`classify`/`declaration-sheet` có mã lát 1 tốn thêm vài lời gọi LLM (đọc dữ
kiện + viết) chạy song song với đường cũ. Lượt khoá dịch vụ vẫn đi `withPrivateData` (chỉ nhà cung cấp không huấn luyện).

## 3. Tạo lại container

```bash
/opt/hs-code-api/deploy-safe.sh main --force
```

Chờ lệnh xong (container cũ được xả lượt đang chạy trước khi dừng — xem `docs/deploy-coolify.md` mục 4b).

## 4. Kiểm sau khi bật

Chuẩn bị biến trong phiên shell (không in khoá ra màn hình):

```bash
set -a; . /opt/hs-code-api/hs.env; set +a
KHOA_NOI=$(printf '%s' "$HS_SERVICE_TOKENS" | tr ',' '\n' | sed -n 's/^oz-noi-bo://p')
KHOA_ERP=$(printf '%s' "$HS_SERVICE_TOKENS" | tr ',' '\n' | sed -n 's/^erp://p')
API=https://hs-kb.uythacnhapkhau.com
```

1. **Máy chạy, đã nạp biến:**

   ```bash
   curl -s $API/api/health | jq '.status'                         # → giống trước khi bật (thường "healthy"); không được là "draining"
   docker exec hs-code-api sh -c 'echo $HS_HO_SO $HS_HO_SO_THU_CALLERS'   # → shadow oz-noi-bo
   docker logs hs-code-api 2>&1 | grep -i rewrites | tail -1      # còn rewrite (mất rewrite = 404 khắp nơi)
   ```

2. **Đếm số đo trước khi thử:**

   ```bash
   curl -s -H "Authorization: Bearer $HS_API_TOKEN" $API/api/admin/ho-so-shadow | jq '{soLuot, theoCheDo}'
   ```

   Ghi lại `soLuot` (lần đầu có thể là `0`). Không token phải ra **401**:
   `curl -s -o /dev/null -w '%{http_code}\n' $API/api/admin/ho-so-shadow` → `401`.

3. **Khách nhận phản hồi CŨ** (dùng hàng mẫu công khai trong bộ đề, mã lát 1 `96170010`):

   ```bash
   BODY='{"hsCode":"96170010","productName":"Bình giữ nhiệt chân không","customerDescription":"Bình giữ nhiệt chân không hoàn chỉnh, thép không gỉ hai lớp, nắp nhựa, dung tích 500ml, mới 100%","condition":"Mới 100%"}'
   # lượt công khai (không token)
   curl -s -X POST $API/api/describe -H 'content-type: application/json' -d "$BODY" \
     | jq '{coHoSo: has("hoSo"), coHoSoMeta: has("hoSoMeta"), coMoTaEcus: has("moTaEcus"), customsDescription, level: .compliance.level}'
   # lượt ERP
   curl -s -X POST $API/api/describe -H 'content-type: application/json' -H "Authorization: Bearer $KHOA_ERP" -d "$BODY" \
     | jq '{coHoSo: has("hoSo"), coHoSoMeta: has("hoSoMeta")}'
   ```

   Cả hai phải ra `coHoSo: false`, `coHoSoMeta: false`, `coMoTaEcus: false` — đúng hình dạng cũ.

4. **Số đo tăng:**

   ```bash
   curl -s -H "Authorization: Bearer $HS_API_TOKEN" $API/api/admin/ho-so-shadow | jq '{soLuot, theoCheDo, trangThai}'
   ```

   `soLuot` tăng **2** so với bước 2, `theoCheDo.shadow` tăng 2.

5. **Khoá nội bộ nhận bản MỚI:**

   ```bash
   curl -s -X POST $API/api/describe -H 'content-type: application/json' -H "Authorization: Bearer $KHOA_NOI" -d "$BODY" \
     | jq '{hoSoMeta, moTaEcus, banNhap, trangThai: .hoSo.ketLuan.trangThai}'
   ```

   Phải có `hoSoMeta.cheDo: "on"`, `hoSoMeta.thuNoiBo: true`. Gọi lại bước 4: `theoCheDo.thu` tăng 1.

6. **Báo cáo đầy đủ trong container** (cùng số với endpoint):

   ```bash
   docker exec hs-code-api node scripts/bao-cao-shadow.mjs           # bảng chữ
   docker exec hs-code-api node scripts/bao-cao-shadow.mjs --json    # JSON
   docker exec hs-code-api node scripts/bao-cao-shadow.mjs --tu=2026-11-02 --den=2026-11-06   # lọc ngày (UTC)
   ```

   Tệp số đo nằm ở `/data/ho-so-shadow.jsonl` trong container (thư mục `HS_DATA_DIR`). Mỗi dòng chỉ có số và mã HS, không có
   tên hàng hay mô tả. Khoảng 0,5 KB/lượt.

## 5. Tắt (rollback)

Bất kỳ lúc nào thấy lạ (endpoint chậm hẳn, lỗi tăng, khách báo khác thường):

1. Trong `/opt/hs-code-api/hs.env` đổi `HS_HO_SO=shadow` thành `HS_HO_SO=off` (có thể để nguyên `HS_HO_SO_THU_CALLERS` — `off`
   tắt hết, kể cả chạy thử).
2. `/opt/hs-code-api/deploy-safe.sh main --force`
3. Kiểm: `POST /api/ho-so` bằng khoá nội bộ trả **503 `HO_SO_TAT`**:

   ```bash
   curl -s -X POST $API/api/ho-so -H 'content-type: application/json' -H "Authorization: Bearer $KHOA_NOI" \
     -d '{"maHs":"96170010","tenHang":"Bình giữ nhiệt"}' | jq .error     # → "HO_SO_TAT"
   ```

   và bước 4.5 không còn `hoSoMeta`. Tệp `/data/ho-so-shadow.jsonl` giữ lại để đọc báo cáo; muốn xoá thì báo GĐ trước.

Thu hồi khoá `oz-noi-bo`: xoá mục `,oz-noi-bo:<khoá>` khỏi `HS_SERVICE_TOKENS` rồi tạo lại container.

## 6. Nghiệm thu (đánh dấu rồi gửi GĐ)

- [ ] PR L1-5f đã ở `main`; `deploy-safe.sh main --force` chạy xong, `/api/health` trả `status` như trước khi bật (không `draining`).
- [ ] `hs.env` có `HS_HO_SO=shadow`, `HS_HO_SO_THU_CALLERS=oz-noi-bo`, mục `oz-noi-bo:<khoá>` trong `HS_SERVICE_TOKENS`;
      **không** có `erp`/`cong-oz` trong `HS_HO_SO_THU_CALLERS`.
- [ ] `/api/admin/ho-so-shadow` không token → 401; có `HS_API_TOKEN` → 200.
- [ ] `describe` công khai và bằng khoá ERP trên mã `96170010` → không có `hoSo`/`hoSoMeta`/`moTaEcus`.
- [ ] `soLuot` tăng đúng số lượt đã gọi (`theoCheDo.shadow`).
- [ ] `describe` bằng khoá `oz-noi-bo` → `hoSoMeta.cheDo = "on"`, `thuNoiBo = true`; `theoCheDo.thu` tăng.
- [ ] Đã thử rollback một lần trên giờ vắng (đặt `off` → 503 `HO_SO_TAT` → đặt lại `shadow`), hoặc ghi rõ "chưa thử".
- [ ] Gửi GĐ: giờ bật, kết quả `bao-cao-shadow.mjs` sau 24 giờ (chỉ số, không khoá).

Chạy bóng tối thiểu **5 ngày làm việc** trước khi GĐ trình CEO bật `on` (plan L1-5f). Không tự đổi sang `HS_HO_SO=on`.
