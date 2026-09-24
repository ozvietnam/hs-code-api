# Từ điển mâu thuẫn HS — `data/confusion-pairs.json`

**Là gì:** danh sách mặt hàng mà doanh nghiệp hay khai mã A nhưng Hải quan hay
ấn định mã B, kèm **tiêu chí phân biệt** (câu hỏi "A hay B?"), luật "nếu… thì…",
lý do hay nhầm (vô ý / cố ý), căn cứ pháp lý và số công văn/thông báo nếu có.
Trọng tâm chương 84 – 85 – 90 (máy móc, điện, đo lường) — nơi Oz và khách hay bị
ấn định lại nhất.

**Nguồn:** CEO soạn cùng Grok, 07–09/2026, lưu trên Google Drive:
`HS_Mau_Thuan_Reports_2026/MASTER_Tu_Dien_Mau_Thuan_HS_System` (50 báo cáo
chi tiết MT-001…MT-050 + 12 tệp DEEP theo nhóm ngành, CSV RAG 150 cặp) và bản
gộp `TU_DIEN_MAU_THUAN_HS_MOT_FILE.md`. Agent cấu trúc hoá theo schema bên
dưới; `scripts/build-confusion-pairs.mjs` gộp, chuẩn hoá mã, gắn cờ mã cũ.

**Khác gì `conflicts.json`:** conflicts đứng ở **mã 8 số** ("mã này hay nhầm với
mã kia"). Từ điển này đứng ở **mặt hàng**: nhận diện bằng tên gọi trong câu hỏi
rồi nói hàng này hay bị kéo về đâu và câu hỏi nào phân định. Đúng tinh thần
"hiểu bản chất hàng trước, luật sau" (hướng dẫn agent §3.5).

## Trạng thái tin cậy

- Mọi mục `verified: false` cho tới khi CEO duyệt. API tra cứu **kín** (Bearer),
  theo nguyên tắc `lib/public-access.js` (seed chưa xác minh không công bố).
- ~15 mục có công văn/thông báo thật (6966/TCHQ-TXNK, 2578/TCHQ-TXNK,
  1538/TB-TCHQ, 3387/TB-TCHQ, 1447/TCHQ-TXNK…); các mục có số hiệu trùng kho
  `precedents.json` được nối tự động (`precedents[]` trong đầu ra).
- Mục `oldTariff: true` có mã theo biểu thuế cũ (vd 8525.80.xx) — giữ để đối
  chiếu, cần chuyển sang mã hiện hành.
- `girRule` chỉ là trích dẫn của nguồn, đi ra dưới tên `girRuleVi` (hiển thị).
  Không phải determination; mọi trích dẫn GIR chính thức đi qua `lib/gir.js`.

## Dùng ở đâu

| Chỗ | Cách dùng |
|---|---|
| `/api/suggest`, `/api/search` | `confusionAlerts[]`: **HIGH** = tên hàng khớp mục và gợi ý đầu rơi vào mã DN hay khai sai; **CHECK** = tên khớp, gợi ý đầu nằm trong mã HQ ấn định; **INFO** = chỉ trùng mã hay khai sai (tiền tố ≥ 6 số, tối đa 3). Mỗi cảnh báo mang `essenceTestVi`, `rules[]`, `correctHs`, `declaredHs`, `warningVi`, `sourceRefs`, `precedents`. |
| `GET /api/confusion-pairs?q=` | nhận diện theo tên hàng |
| `GET /api/confusion-pairs?hs=` | mục có mã đúng hoặc mã hay khai sai là tiền tố của mã hỏi |
| `GET /api/confusion-pairs?id=MT-049` | một mục |
| Viết bảng quyết định | `essenceTestVi` + `rules[]` là đầu vào cho `inputs`/`rules` của `data/decision-tables/<nhóm>.json`; ưu tiên 8536, 8501, 8504, 8481, 9031 |

## Schema một mục

```json
{
  "id": "MT-049", "origin": "grok-mt", "group": "bom-van-may-nen",
  "nameVi": "Xi lanh khí nén", "nameEn": "Pneumatic cylinder / air cylinder",
  "aliases": ["xi lanh khí nén", "pneumatic cylinder", "air cylinder"],
  "chapters": ["84", "85"],
  "correctHs": ["8412.31", "8412.39"], "declaredHs": ["8481.20", "8481.80", "8479.89", "8501"],
  "essenceTestVi": "Hàng tạo CHUYỂN ĐỘNG từ khí nén hay ĐIỀU KHIỂN dòng chảy (van)?",
  "rules": [{ "ifVi": "xi lanh tạo chuyển động tuyến tính từ khí nén", "hs": "8412.31" }],
  "whyMisdeclaredVi": "…", "deliberateVi": null,
  "girRule": "GIR 1", "legalBasisVi": "Chú giải 8412; Note 1(m) Section XVI",
  "sourceRefs": [{ "type": "TB-TCHQ", "reference": "1538/TB-TCHQ", "date": "2023-04-05" }],
  "warningVi": "Khai 8481/8479 cho xi lanh khí nén thuần → rủi ro ấn định 8412.31 và truy thu",
  "relatedIds": ["MT-042", "MT-025"], "examples": ["SMC CQ2", "Festo DSNU"],
  "verified": false
}
```

Nhóm (`group`): `cam-bien-do-luong`, `motor-drive-servo`, `board-module-hmi`,
`bom-van-may-nen`, `robot-agv`, `dien-cong-tac-nguon`, `may-cong-cu`,
`thiet-bi-quang`, `may-in`, `thiet-bi-nhiet`, `may-dong-goi`, `khac`.

## Kiểm

`npm run test:confusion-pairs` (trong `npm test`): mã sống trong biểu thuế (mã
cũ phải có cờ), alias không chung chung và không thuộc quá 3 mục, 8 câu nhận
diện đúng mục, 7 câu không liên quan không bị lan, mức HIGH/CHECK/INFO đúng,
đầu ra không tự gắn nhãn GIR.

## Nhập lại từ Drive

1. Agent đọc Drive, ghi JSON theo schema vào scratchpad (brief: cùng luật
   "không bịa, có dấu, không tên doanh nghiệp").
2. `node scripts/build-confusion-pairs.mjs a.json b.json …` → `data/confusion-pairs.json`.
3. `npm run test:confusion-pairs`, rồi `npm test`.
