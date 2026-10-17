# Giao việc: tên tiếng Trung cấp 6 số cho mọi mã HS (#336 mục 5) — lấy NGUYÊN VĂN từ nguồn chính thống

- **Giao:** 2026-10-17, CEO chốt (#336). Thợ: **dev zcode** (máy ở Việt Nam, mạng mở, Chrome thật). Người kiểm và gộp: Claude. Thợ **không tự gộp** vào `main`.
- **Hạn:** chạy đêm 17→18/10, PR mở **trước 05:00**, Claude kiểm và duyệt **trước 06:00**.
- **Nhánh:** `zcode/bieu-thue-tieng-trung` tạo từ `main`. Một PR duy nhất vào `main`.
- **Cổng chặn bằng máy:** `npm run bieu-thue:kiem-zh` phải **PASS** trên nhánh của bạn. Hiện nó **đỏ** (`thiếu bao-cao.json`); việc của bạn là làm nó xanh bằng dữ liệu thật. Bộ kiểm tự kiểm bằng `node scripts/test-bieu-thue-zh.mjs` (12/12, không sửa bộ kiểm).

## Vì sao

Khách và nhà cung cấp Trung Quốc gọi hàng theo tên trong **进出口税则** của họ. `/api/tax` sẽ trả `tenZh` cạnh tên Việt/Anh để
hai bên đối chiếu nhanh và để `/api/search` nhận từ khoá tiếng Trung. **Trích sai còn tệ hơn không trích**, nên:
**chỉ chép nguyên văn từ văn bản chính thống của Trung Quốc; không dịch máy, không dùng LLM viết tên; không lấy từ trang bên thứ ba.**

## 1. Nguồn — chỉ tên miền `gov.cn`, thử theo thứ tự

| Mã nguồn | Văn bản | Tìm ở đâu | Ghi chú |
|---|---|---|---|
| `gacc-shuize-2026` | 《中华人民共和国进出口税则（2026）》 — phụ lục của 《2026年关税调整方案》 (国务院关税税则委员会) | `gov.cn` (Công báo Quốc vụ viện), `mof.gov.cn` (Bộ Tài chính, 关税司), `customs.gov.cn` (海关总署, mục 税则/公告) | Nguồn **ưu tiên nhất**. Tệp PDF/Excel rất lớn; tải nguyên tệp, không chụp màn hình từng trang |
| `gacc-guifan-shenbao` | 《中华人民共和国海关进出口商品规范申报目录及释义》 (海关总署公告, bản mới nhất) | `customs.gov.cn` → 公告 → 附件 | Có 商品编码 10 số + 商品名称; dùng **bổ sung** khi tệp trên thiếu dòng |
| `gacc-online-guilei` | Cổng tra cứu 归类/商品编码 của 海关总署 (`online.customs.gov.cn`) | chỉ khi hai tệp trên không tải được | Tra từng mã thì chậm; có anti-bot (HTTP 412) thì ghi `CHAN`, **không lách** |

`customs.gov.cn` trả HTTP 412 (Aliyun WAF) từ máy ngoài Trung Quốc; từ máy VN với Chrome thật thường mở được. Không mở được thì ghi `CHAN` kèm mã HTTP và giờ.
**Không dùng** hsbianma, hsciq, 51hs, Flexport, Baidu Wenku hay bất kỳ bản sao nào ngoài `gov.cn` (bộ kiểm đỏ ngay).

## 2. Khớp cấp 6 số

- Mã Trung Quốc có 8–10 số; **6 số đầu là HS chung quốc tế** (HS 2022), trùng với 6 số đầu của mã Việt Nam. Chỉ lấy tên ở **dòng 6 số** (phân nhóm WCO), không lấy tên dòng 8/10 số của Trung Quốc.
- Dòng 6 số nào tên là 「其他」(loại khác) hoặc tên cụt, ghi thêm `tenZhCha` = tên dòng cha gần nhất (nhóm 4 số hoặc gạch đầu dòng cấp trên) để người đọc hiểu. Không tự ghép câu.
- Danh sách hs6 cần phủ: 5.784 mã (6 số đầu của 11.871 mã trong `data/tax.json`). Mã nào văn bản TQ không có (khác ấn bản, dòng gộp), ghi vào `thieu.jsonl` kèm `lyDo` — **không đoán**.
- Giữ nguyên chữ giản thể như văn bản. Không phiên âm, không dịch sang tiếng Việt (việc dịch là chuyện khác, sau này).

## 3. Luật (bắt buộc)

1. Bản thô: tệp PDF/Excel đã tải lưu vào `data/_src/bieu-thue-zh/<sha256>.<đuôi>` (gitignored) và ghi vào `data/bieu-thue/zh/raw-index.json` (`{tho:[{sha256,url,layLuc,bytes}]}`, commit). Zip đính kèm PR hoặc link Drive.
2. Mỗi dòng ghi `nguon.viTri` (số trang PDF hoặc sheet/dòng Excel) để kiểm tay được.
3. Lấy từ cổng tra cứu thì ≤ 1 yêu cầu/giây, UA `hs-code-api/bieu-thue-zh (ozvietnam, ceo@ozfreight.vn)`, không đổi IP, không lách anti-bot.
4. Không sửa `lib/`, `scripts/bieu-thue/kiem-zh.mjs`, `scripts/test-bieu-thue-zh.mjs`, `data/tax.json`. Script trích để ở `scripts/bieu-thue/zh-<mã nguồn>.mjs` (Node 22; đọc PDF thì khai thư viện trong PR).
5. `camKet.khongDichMay = true` và `camKet.khongLachAntiBot = true` trong `bao-cao.json` là lời cam kết của bạn, bộ kiểm chỉ đọc được cờ — nói thật.

## 4. Định dạng đầu ra (`data/bieu-thue/zh/`, UTF-8)

- `hs6-zh.jsonl` — một dòng một hs6:
  `{"hs6":"850440","tenZh":"静止式变流器","tenZhCha":null,"capKhop":6,"nguon":{"url":"<url gov.cn của tệp>","sha256":"<sha256 tệp thô>","layLuc":"2026-10-18T01:00:00Z","viTri":"trang 1234"}}`
- `thieu.jsonl` — `{"hs6":"...","lyDo":"..."}` cho mã không tìm thấy.
- `bao-cao.json` — `{ngay, may, camKet:{khongDichMay:true, khongLachAntiBot:true}, nguon:[{ma, vanBan, url, trangThai: OK|CHAN|LOI|BO_QUA, soDong, ghiChu}]}`.
- `raw-index.json` — như luật 1.

## 5. Vòng làm

```bash
git clone https://github.com/ozvietnam/hs-code-api.git && cd hs-code-api && npm ci
git checkout -b zcode/bieu-thue-tieng-trung origin/main
npm run bieu-thue:kiem-zh          # ĐỎ: thiếu bao-cao.json — đúng
node scripts/test-bieu-thue-zh.mjs # 12/12 xanh
# … tải tệp chính thống, trích dòng 6 số, ghi 4 tệp trên …
npm run bieu-thue:kiem-zh          # phải PASS; in phủ x/5784
npm test
git add data/bieu-thue/zh scripts/bieu-thue/zh-*.mjs && git commit -m "data(bieu-thue): tên tiếng Trung cấp 6 số từ <văn bản> — phủ x/5784"
git push -u origin zcode/bieu-thue-tieng-trung
```

Thân PR: dán nguyên văn kết quả `npm run bieu-thue:kiem-zh`, bảng `bao-cao.json`, ảnh trang bìa/công báo của tệp đã tải (để thấy đúng văn bản, đúng năm).

## 6. Claude kiểm buổi sáng (05:00–06:00)

1. `npm run bieu-thue:kiem-zh` PASS; `npm test` xanh; CI xanh.
2. Mở tệp thô trong zip, chọn ngẫu nhiên 20 dòng đối chiếu `tenZh` với văn bản tại `viTri` — **một dòng bịa là trả PR**.
3. Gộp squash; nối `tenZh` vào `/api/tax` (#336 mục 5) và `/api/search` ở PR riêng của Claude; cập nhật `data/bieu-thue/README.md`.

Không nằm trong đợt này: dịch tên sang tiếng Việt, tên dòng 8/10 số của Trung Quốc, thuế suất Trung Quốc.
