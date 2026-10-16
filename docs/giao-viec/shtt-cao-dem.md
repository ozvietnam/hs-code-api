# Giao việc: cào dữ liệu SHTT (nhãn hiệu) — hai trục **nhập Việt Nam** và **xuất Trung Quốc** (chạy đêm)

- **Giao:** 2026-10-16, CEO duyệt. Thợ: **dev zcode** (máy ở Việt Nam, mạng mở). Người kiểm và gộp: Claude (phiên quản lý). Thợ **không tự gộp** vào `main`.
- **Hạn:** chạy đêm 16→17/10, PR mở **trước 05:00**, Claude kiểm và duyệt **trước 06:00**.
- **Nhánh:** `zcode/shtt-cao-dem` tạo từ `main`. Một PR duy nhất vào `main`.
- **Cổng chặn bằng máy:** `npm run shtt:kiem` phải **PASS** trên nhánh của bạn. Đây là bài kiểm TDD viết sẵn: hiện giờ nó **đỏ** (`thiếu bao-cao.json`); việc của bạn là làm nó **xanh** bằng dữ liệu thật. Bộ kiểm tự kiểm bằng `node scripts/test-shtt-kiem.mjs` (12/12 phải xanh, không sửa bộ kiểm).

Đọc trước: [`docs/trademark-sources.md`](../trademark-sources.md) (khảo sát nguồn 07/2026, có script nạp sẵn) và
`lib/trademark-watch.js` (máy cảnh báo hai trục; dữ liệu bạn cào sẽ nạp vào `data/trademark-watch.json`).

## Vì sao luật chặt

Kết quả là **cảnh báo rủi ro SHTT** cho người nhập hàng từ Trung Quốc: hải quan hai nước **tạm dừng thông quan** hàng mang
nhãn đã ghi nhận (VN: TT 13/2015 + TT 13/2020/TT-BTC, từ 01/03/2026 hải quan chủ động dừng; TQ: GACC 知识产权海关保护备案).
Một nhãn "có ghi nhận" bịa ra làm khách bỏ lô hàng vô cớ; một nhãn bị bỏ sót làm khách mất lô hàng. Vì vậy:
**không bịa, không đoán, không lách captcha, mọi bản ghi có bản thô kèm sha256.**

## 1. Đơn đặt hàng: danh sách ứng viên

`data/shtt/ung-vien-nhan-hieu.csv` — **1.246 nhãn** rút từ tờ khai Oz đã ẩn danh + nhãn phổ biến + watchlist
(sinh bằng `npm run shtt:ung-vien`, không sửa tay). Cột `uu_tien`: **1 = 159 nhãn làm trước**, 2 = 251, 3 = 836.
`loai = TEN_CONG_TY` (124 dòng) là tên công ty lọt vào ô nhãn hiệu — vẫn tra nhưng xếp sau trong cùng mức ưu tiên.
Tra theo `chuan` (không dấu, chữ thường) và cả `nhan` nguyên bản.

## 2. Nguồn — làm theo thứ tự, mỗi nguồn một trạng thái

| Mã nguồn | Trục | Nguồn (chính thức) | Tra gì | Giá trị |
|---|---|---|---|---|
| `vn-tchq-giam-sat` | VN nhập | Tổng cục Hải quan — "Danh sách hàng hoá/nhãn hiệu có yêu cầu kiểm tra, giám sát về SHTT" (`customs.gov.vn`, mục Tra cứu / Thông báo của Cục GSQL). Trang dựng bằng JS: tìm bằng trình duyệt thật, lấy **toàn bộ danh sách** (không chỉ ứng viên) | mọi nhãn + chủ sở hữu + số hồ sơ + hiệu lực | **Cao nhất** — đây là tập gây tạm dừng thông quan thật (`customsRecorded`) |
| `cn-gacc-beian` | TQ xuất | Hải quan Trung Quốc — 知识产权海关保护备案 "有效备案查询" (cổng `online.customs.gov.cn` → 知识产权; `haiguanbeian.com` là bên thứ ba, chỉ dùng để tìm đường, **không** lấy dữ liệu từ đó) | tra từng ứng viên ưu tiên 1→2: số 备案 (T…/C…/P…), loại quyền, chủ, hiệu lực | **Cao nhất** (`gaccRecorded`) |
| `vn-ipvietnam-dang-ky` | VN nhập | WIPO Publish của Cục SHTT: `https://wipopublish.ipvietnam.gov.vn/wopublish-search/public/trademarks` | tra từng ứng viên: số đơn, số bằng, tình trạng, chủ, nhóm Nice, ngày nộp | Cao |
| `tmview-cn-vn` | cả hai | TMview `https://www.tmdn.org/tmview/` (gộp CNIPA + IP Việt Nam) — đã có `scripts/ingest-tmview.mjs` gọi JSON `api/search/results` với `offices=CN,VN` | như trên, có `office` | Cao (một nguồn phủ hai nước) |
| `cn-cnipa-dang-ky` | TQ xuất | CNIPA `https://sbj.cnipa.gov.cn/sbj/sbcx/` | chỉ khi TMview không với tới; có captcha thì **ghi CAPTCHA, dừng** | Vừa |

Trạng thái từng nguồn ghi vào `bao-cao.json`: `OK` (có tệp), `CHAN` (HTTP 4xx/5xx/timeout từ máy bạn — ghi mã HTTP + giờ),
`CAPTCHA` (đòi captcha/anti-bot — **không lách**, chụp ảnh màn hình để vào PR), `LOI` (lỗi khác, ghi stack ngắn), `BO_QUA` (hết giờ — ghi đã tra tới đâu).
Nguồn `CHAN`/`CAPTCHA` **không phải lỗi của bạn**; nguồn OK mà dữ liệu bịa mới là lỗi.

Thứ tự khi thiếu giờ: `vn-tchq-giam-sat` (toàn bộ) → `cn-gacc-beian` (ưu tiên 1) → `tmview-cn-vn` (ưu tiên 1) → `vn-ipvietnam-dang-ky` (ưu tiên 1) → mở rộng ưu tiên 2 → 3.

## 3. Luật cào (bắt buộc)

1. **Tốc độ lịch sự:** ≤ 1 yêu cầu/giây/nguồn, có `User-Agent` nêu rõ `hs-code-api/shtt (ozvietnam, ceo@ozfreight.vn)`. Bộ kiểm đỏ nếu > 5 % khoảng cách < 500 ms.
2. **Không lách captcha, không đổi IP/proxy xoay, không giả trình duyệt để qua anti-bot.** Trình duyệt thật (Chrome/Playwright có đầu) được phép; gặp captcha thì ghi `CAPTCHA` và chuyển nguồn.
3. **Bản thô:** mỗi trang/phản hồi đã dùng lưu nguyên văn vào `data/_src/shtt/raw/<mã nguồn>/<sha256>.html|json` (gitignored) và ghi vào `data/shtt/raw-index.json` (`{tho:[{sha256,url,layLuc,bytes}]}`, commit). Zip thư mục raw đính kèm PR (kéo thả vào ô bình luận) hoặc để link Drive.
4. **Không suy diễn:** không gán `nhomNice`, `hieuLucDen`, chủ sở hữu khi trang không ghi — để `null`/`[]`. Không "khớp mờ" nhãn: `ungVien` chỉ ghi khi kết quả tra **chính xác chuỗi** `chuan` (hoặc `nhan`); kết quả gần giống ghi vào `ghiChu` của dòng, không ghi `ungVien`.
5. **Tra mà không thấy** cũng là dữ liệu: ghi `khong-tim-thay.jsonl` (`{ungVien, nguonMa, nguon:{url, layLuc}}`). Độ phủ = tìm thấy + không tìm thấy.
6. **Riêng tư:** không lấy gì ngoài bảng tra công khai; không đụng `data/oz-export/`; không ghi tên khách, số tờ khai.
7. Không sửa `lib/`, `scripts/shtt/kiem.mjs`, `scripts/test-shtt-kiem.mjs`, `ung-vien-nhan-hieu.*`. Script cào của bạn để ở `scripts/shtt/cao-<mã nguồn>.mjs` (Node 22, không thêm dependency ngoài `playwright` nếu cần — khai trong PR).

## 4. Định dạng đầu ra (`data/shtt/`, JSON Lines, UTF-8, một dòng một bản ghi)

Khối chung mọi dòng: `"nguon": {"url": "...", "layLuc": "2026-10-16T21:03:05.120Z", "sha256": "<sha256 bản thô>"}`.

| Tệp | Trường bắt buộc | Trường thêm |
|---|---|---|
| `vn-tchq-giam-sat.jsonl` | `nhan`, `chuSoHuu`, `soHoSo` | `nhomNice[]`, `hangHoa` (chữ nguyên văn), `hieuLucTu`, `hieuLucDen` (YYYY-MM-DD/null), `daiDien`, `ghiChu` |
| `cn-gacc-beian.jsonl` | `nhan`, `chuSoHuu`, `soHoSo` (số 备案), `loaiQuyen` ∈ NHAN_HIEU/BAN_QUYEN/SANG_CHE/KIEU_DANG/KHAC | `hieuLucDen`, `quocTichChu`, `ungVien`, `ghiChu` |
| `vn-ipvietnam-dang-ky.jsonl` | `nhan`, `soDon`, `tinhTrang` ∈ DANG_KY/DANG_XU_LY/HET_HAN/TU_CHOI/KHAC, `ungVien` | `soBang`, `chuSoHuu`, `nhomNice[]`, `ngayNop`, `ngayCap`, `hetHan`, `ghiChu` |
| `tmview-cn-vn.jsonl` | `nhan`, `office` ∈ CN/VN, `soDon`, `tinhTrang`, `ungVien` | như trên |
| `cn-cnipa-dang-ky.jsonl` | `nhan`, `soDon`, `tinhTrang`, `ungVien` | như trên |
| `khong-tim-thay.jsonl` | `ungVien`, `nguonMa`, `nguon.url`, `nguon.layLuc` | `ghiChu` |
| `raw-index.json` | `tho[].sha256/url/layLuc/bytes` | — |
| `bao-cao.json` | `ngay`, `may` (OS + mạng, không IP), `batDau`, `ketThuc`, `camKet: {khongLachCaptcha: true, tocDo: "…"}`, `nguon[]: {ma, trangThai, soBanGhi, ghiChu}` | `loiTruot[]`, `thoiGianTungNguon` |

Tình trạng registry quy về 5 giá trị trên; chữ gốc của trang (vd "Đang giải quyết", "有效") ghi vào `tinhTrangGoc`.

## 5. Vòng làm

```bash
git clone https://github.com/ozvietnam/hs-code-api.git && cd hs-code-api && npm ci
git checkout -b zcode/shtt-cao-dem origin/main
npm run shtt:kiem                 # ĐỎ: "thiếu bao-cao.json" — đúng, chưa có dữ liệu
node scripts/test-shtt-kiem.mjs   # 12/12 xanh — bộ kiểm đúng
# … cào từng nguồn, ghi data/shtt/*.jsonl + raw-index.json + bao-cao.json …
npm run shtt:kiem                 # phải PASS (cảnh báo độ phủ được phép, lỗi thì không)
npm test                          # toàn kho vẫn xanh
git add data/shtt scripts/shtt/cao-*.mjs && git commit -m "data(shtt): cào đêm 16-17/10 — <tóm tắt số liệu từng nguồn>"
git push -u origin zcode/shtt-cao-dem
```

Mở PR nháp vào `main`, thân PR dán **nguyên văn** kết quả `npm run shtt:kiem` + bảng `bao-cao.json` + ảnh chụp mọi trang báo captcha/chặn.
Commit giữa đêm theo từng nguồn xong (không gom một commit cuối) để mất điện vẫn còn phần đã làm.

## 6. Claude kiểm buổi sáng (05:00–06:00)

1. `npm run shtt:kiem` PASS trên nhánh; `npm test` xanh; CI xanh.
2. Chọn ngẫu nhiên 10 bản ghi/nguồn, mở `nguon.url` (hoặc bản thô trong zip) đối chiếu từng trường — **một bản ghi bịa là trả PR**.
3. Nạp vào watchlist bằng cơ chế sẵn có: `scripts/ingest-trademark-watch.mjs --customs` (TCHQ) / `--gacc` / TMview, mỗi nguồn một commit; `customsRecorded`/`gaccRecorded` chỉ bật từ đúng nguồn recordal.
4. Gộp squash; cập nhật `docs/trademark-sources.md` bảng reachability (đo từ máy VN) và báo CEO: số nhãn ưu tiên 1 có ghi nhận hải quan hai nước.

Việc **không** nằm trong đợt này: mở `/api/trademark` ra công khai (CEO quyết sau khi xem số đã verify), sáng chế/kiểu dáng, bản quyền.
