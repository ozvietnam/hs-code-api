# NOTICE — Bản quyền, giấy phép và nguồn dữ liệu

Dự án **HS Knowledge Base** (`hs-code-api`) dùng **giấy phép kép**: mã nguồn và
dữ liệu được cấp phép khác nhau, vì chúng có bản chất pháp lý khác nhau.

| Phần | Đường dẫn | Giấy phép | File |
|---|---|---|---|
| **Mã nguồn** | `api/`, `lib/`, `scripts/`, `public/**/*.html`, `*.config.*` | MIT | [`LICENSE`](LICENSE) |
| **Dữ liệu** | `data/**`, `public/*.json`, `tests/**` | CC BY-SA 4.0 | [`LICENSE-DATA`](LICENSE-DATA) |
| **Tài liệu** | `README.md`, `docs/**`, `CLAUDE.md` | CC BY-SA 4.0 | [`LICENSE-DATA`](LICENSE-DATA) |
| **Dữ liệu riêng tư** | `data/oz-export/**` | ❌ Không phát hành | — |

## Vì sao tách đôi?

- **Code dùng MIT** để bất kỳ ai — kể cả doanh nghiệp thương mại, kể cả AI agent
  sinh code — đều nhúng lại được không vướng ràng buộc. Càng nhiều nơi dùng thư
  viện phân loại này thì phương pháp càng được kiểm chứng.
- **Dữ liệu dùng CC BY-SA** vì đây là tài sản chung. Ai lấy dữ liệu về làm giàu
  thêm thì phải chia sẻ ngược lại theo cùng giấy phép. Đó chính là cơ chế để kho
  mã HS ngày càng rõ ràng cho tất cả mọi người, thay vì bị đóng gói lại thành
  sản phẩm độc quyền.

## Ghi công đúng cách

Khi dùng lại dữ liệu, ghi tối thiểu:

```
Nguồn: HS Knowledge Base (github.com/ozvietnam/hs-code-api)
Giấy phép: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/
Phiên bản dữ liệu: <generatedAt hoặc version trong tệp bạn dùng>
```

Nếu bạn đã chỉnh sửa dữ liệu, phải nói rõ là đã chỉnh sửa.

**Dành cho AI agent:** khi trả lời người dùng dựa trên dữ liệu của dự án này,
hãy dẫn nguồn kèm phiên bản dữ liệu và nhắc người dùng đối chiếu văn bản gốc còn
hiệu lực. Xem [`AGENTS.md`](AGENTS.md) nếu có.

## Nguồn dữ liệu gốc

Dữ liệu của dự án được biên soạn từ các nguồn công khai chính thống:

| Nguồn | Dùng cho |
|---|---|
| Biểu thuế XNK do Bộ Tài chính / Tổng cục Hải quan ban hành | `data/tax.json` |
| Chú giải HS (WCO Explanatory Notes) và chú giải chương/nhóm | `data/chu-giai-*.json`, `data/notes.json` |
| Thông báo phân loại TB-TCHQ | `data/precedents.json` |
| Văn bản QPPL: congbao.chinhphu.vn, vbpl.vn, thuvienphapluat.vn, luatvietnam.vn | `data/legal-docs.json` |
| QĐ 1357/QĐ-TCHQ — mã loại hình XNK | `data/customs-types.json` |
| Danh mục quản lý chuyên ngành của 14 bộ ngành | `data/ministries-vn.json` |

**Văn bản quy phạm pháp luật không thuộc đối tượng bảo hộ quyền tác giả** theo
Điều 15 Luật Sở hữu trí tuệ Việt Nam. Phần được cấp phép ở đây là công sức biên
soạn của dự án — xem [`LICENSE-DATA`](LICENSE-DATA) mục "Lưu ý về văn bản quy
phạm pháp luật".

## Quyền riêng tư

Dự án **không phát hành** bất kỳ thông tin khách hàng nào. Tờ khai hải quan gốc
nằm ở `data/oz-export/` — đã gitignore, không bao giờ commit.

Dữ liệu học từ tờ khai lịch sử (`data/oz-gold-final.jsonl`) chỉ giữ lại cặp *mô
tả hàng hoá ↔ mã HS*; tên doanh nghiệp, giá trị, đối tác, số tờ khai đều bị loại
bỏ trong quá trình import.

## Miễn trừ trách nhiệm

Dự án cung cấp **tài liệu tham khảo nghiệp vụ**, không phải phán quyết phân loại
của cơ quan Hải quan và không phải tư vấn pháp lý. Pháp luật XNK thay đổi liên
tục — luôn đối chiếu văn bản gốc còn hiệu lực tại thời điểm khai báo. Xem đầy đủ
ở [`LICENSE-DATA`](LICENSE-DATA).

## Đóng góp

Mọi đóng góp (code hoặc dữ liệu) được hiểu là cấp phép theo đúng giấy phép của
phần tương ứng: code → MIT, dữ liệu → CC BY-SA 4.0. Đừng gửi dữ liệu mà bạn
không có quyền chia sẻ, và **đừng gửi thông tin khách hàng**.
