# HS Code API — Biểu thuế XNK Việt Nam 2026

API tra cứu mã HS Code, thuế suất và chú giải hàng hóa XNK Việt Nam.

**Dữ liệu:** Biểu thuế XNK 2026 · Danh mục HHDM XNK (TT31/2022/TT-BTC)  
**Hosted:** Vercel (free tier)

---

## Endpoints

### 1. Tra thuế theo mã HS
```
GET /api/tax?hs=39261000
```

**Response:**
```json
{
  "found": true,
  "hs": "39261000",
  "mo_ta": "- Đồ dùng trong văn phòng hoặc trường học",
  "don_vi": "kg/chiếc",
  "thue": {
    "nk_tt": "30",
    "nk_mfn": "20",
    "vat": "8/10",
    "acfta": "0 (-KH, ID, MY, MM)",
    "bvmt": null,
    "giam_vat": null
  },
  "chinh_sach": "Hàng tiêu dùng QSD cấp NK (08/2023/TT-BCT - PL1.I)...",
  "canh_bao_cs": true
}
```

### 2. Tìm kiếm theo từ khóa hoặc mã HS
```
GET /api/search?q=bàn+chải
GET /api/search?q=8509&limit=10
GET /api/search?q=nhựa&cs_only=1
```

**Tham số:**
- `q` — từ khóa tiếng Việt hoặc mã HS (bắt buộc)
- `limit` — số kết quả tối đa (mặc định 20, tối đa 50)
- `cs_only=1` — chỉ hiện hàng có chính sách CS

### 3. Tra chú giải theo chương/nhóm
```
GET /api/notes?chapter=85
GET /api/notes?heading=8509
```

---

## Cài đặt local

```bash
npm install
npm run dev
```

API chạy tại `http://localhost:3000`

---

## Deploy lên Vercel

1. Push repo lên GitHub
2. Vào vercel.com → Import project từ GitHub
3. Vercel tự detect Next.js, deploy tự động

---

## Cấu trúc dữ liệu

```
data/
  tax.json      — 11.871 mã HS 8 số, lookup theo mã
  search.json   — index nhẹ cho tìm kiếm
  notes.json    — chú giải 87 chương (TT31/2022/TT-BTC)
```

## Cập nhật dữ liệu

Khi có biểu thuế mới:
1. Cập nhật `BT2026_compact.csv`
2. Chạy script convert để rebuild `tax.json` và `search.json`
3. Push lên GitHub → Vercel tự redeploy
