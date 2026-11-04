import json,collections,subprocess
files=subprocess.run(['git','diff','--name-only','origin/main','--','data/ho-so/ranh-gioi'],capture_output=True,text=True).stdout.split()
N=len(files)
ch=collections.Counter(f.split('/')[-1][:2] for f in files)
rows='\n'.join(f'| {c} | {n} |' for c,n in sorted(ch.items()))
treo=sorted(set(open('/home/claude/working/pn6/treo.txt').read().split())); T=len(treo)
tc=dict(sorted(collections.Counter(p[:2] for p in treo).items()))
body=f"""## Nội dung
Vòng số hoá ranh giới 6→8 số bằng **AI Studio (gemini-3.8-flash, thinking Medium)** với system v6 = luật cũ + bộ từ vựng 192 khoá (#1004/#1008), **30 PN6/lượt**, một chat liên tục (17 lượt, ~830k token). Chỉ lấy bản qua cổng 0–5 ngay lượt đầu; bản đỏ đưa vào danh sách treo, không vòng sửa (vòng sửa thử trên c84-1 chỉ cứu 1/11).

**{N} PN6 mới có hồ sơ ranh giới** (trạng thái NHAP, chưa DUYET — cần phiên soát độc lập), theo chương:

| Ch | PN6 xanh |
|---|---|
{rows}

### Kèm theo
- `lib/dieu-kien-so.js`: thang **không viết đơn vị** (`donViKhongVietRa`, hiện gắn cho `tongDungTichTau` GT): khoá đọc đúng ngưỡng + op từ câu trích là bằng chứng thay cho chữ đơn vị, kể cả biên sau "nhưng không quá" (gỡ ch.89).
- `tu-vung@2`: 2 bí danh đơn vị `m3/phút`, `m³/phút` → `m3/min` (gỡ 841581–83 máy điều hoà).
- `test-cong-ranh-gioi` 9c đổi PN6 mẫu "chưa có nháp" sang 840731 (một dòng) vì 847130 đã số hoá.

### Máy kiểm
`test-cong-ranh-gioi` 1.131+ pass / 0 fail, `test-dieu-kien-so` 101/101, `test-tu-vung-2` 677/677, `test-so-tay-gates` 68/68, `test-ho-so-duong-di` 93/93 — chạy sau mỗi gói.

### Treo ({T} PN6)
Theo chương: {tc}. Lỗi chính: `cong2-chong-lan` (cây sâu ch.87 ô tô, 85), `cong3-liet-ke-trong-mot-chuoi`, `cong1-khong-phu-kin`. Danh sách đầy đủ ở `tmp/studio-pn6/tmp-pn6/v6/treo.txt`; dự kiến một vòng sửa riêng kèm `--kiem` cho ch.87.

### Chưa chạy
Còn 27 gói (ch.01–71, 74–83) đã sinh sẵn trên `tmp/studio-pn6/tmp-pn6/v6/` (`plan.txt`, `queue.txt`); chạy tiếp bằng chat mới (chat cũ chạm ~1M token).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Ce55326chdksgQLsfyrNDS"""
json.dump({"title":f"data(ho-so): số hoá ranh giới {N} PN6 ch.72–96 bằng Studio v6 (30 PN6/lượt) + thang không đơn vị GT","head":"so-hoa/pn6-c84","base":"main","body":body},open('/home/claude/working/pr-pn6.json','w'),ensure_ascii=False)
print(N,T)
