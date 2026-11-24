#!/usr/bin/env python3
"""Tách "điều khách nói" khỏi "điều suy ra" trong hồ sơ hiểu hàng, và nêu các cách hiểu khác của cùng mô tả.
Chỉ đọc mô tả + hồ sơ hiểu hàng: KHÔNG đọc nhãn, đáp án hay tờ khai.
  AGY_MODEL=gemini-4-hydrogen-high python3 hh_tach_suy.py <ca-sai.json> <hh.jsonl> <hh-ra.jsonl> <uv-cu-ra.json>"""
import json, os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
CS, HH, RA, UV = sys.argv[1:5]
A = os.path.expanduser("~/.local/bin/agy"); M = os.environ.get("AGY_MODEL", "gemini-4-hydrogen-high")
P = """Khách chỉ khai đúng một câu mô tả hàng. Một bước trước đã viết hồ sơ hiểu hàng, có thể đã thêm chi tiết khách không nói.
MÔ TẢ CỦA KHÁCH: %s
HỒ SƠ HIỂU HÀNG: %s
Việc của bạn (không gọi công cụ, không đọc tệp):
1) suyDoan: liệt kê chi tiết (tối đa 3, quan trọng nhất) trong hồ sơ KHÔNG có trong mô tả và có thể làm đổi nhóm HS 4 số. Với mỗi chi tiết ghi loai:
   TAT_YEU = mọi hàng gọi đúng tên này theo định nghĩa đều có; THUONG_GAP = hay gặp nhưng có hàng cùng tên mà không có.
2) cachHieuKhac: các loại hàng KHÁC mà người bán vẫn gọi đúng bằng câu mô tả này. Điều kiện bắt buộc, thiếu một điều là bỏ:
   (a) khớp MỌI điều khách đã nói (tên, chất liệu, công dụng), chỉ khác ở điều khách KHÔNG nói;
   (b) không thêm chức năng chính khách không nói;
   (c) gặp thật trong thương mại dưới đúng tên này, không phải trường hợp hiếm;
   (d) sang nhóm 4 số khác so với cách hiểu trong hồ sơ.
   Tối đa 2 mục, mỗi mục đúng 1 nhóm nên xét. Không có thì để rỗng: rỗng là kết quả bình thường.
Trả đúng một JSON: {"suyDoan":[{"diem":"...","loai":"TAT_YEU|THUONG_GAP"}],"cachHieuKhac":[{"moTa":"...","khacODiem":"...","nhom":["0000"]}]}"""
H = {}
for l in open(HH, encoding="utf-8"):
    d = json.loads(l); H[d["moTa"]] = d


def lam(c):
    h = dict(H[c["moTa"]]); q = P % (c["moTa"], json.dumps(h, ensure_ascii=False)[:6000])
    with tempfile.TemporaryDirectory() as t:
        try:
            r = subprocess.run([A, "-p", q, "--model", M, "--output-format", "json"], capture_output=True, text=True, timeout=600, cwd=t); d = json.loads(r.stdout)
            x = json.loads(re.search(r"\{.*\}", d.get("response") or "", re.S).group(0))
        except Exception as e: return c, None, str(e)[:100]
    h["suyDoan"] = [s["diem"] for s in x.get("suyDoan", []) if s.get("loai") == "THUONG_GAP"]
    h["canXacNhan"] = list(h.get("canXacNhan") or []) + ["(suy ra, khách không nói) " + x2 for x2 in h["suyDoan"]]
    h["cachHieuKhac"] = [{k: y.get(k) for k in ("moTa", "khacODiem")} for y in x.get("cachHieuKhac", [])]
    them = [n for y in x.get("cachHieuKhac", []) for n in (y.get("nhom") or []) if re.fullmatch(r"\d{4}", str(n))]
    return c, (h, list(dict.fromkeys(them))[:2], x), None


cs = json.load(open(CS, encoding="utf-8")); loi = 0; uv = []
with ThreadPoolExecutor(2) as ex, open(RA, "w", encoding="utf-8") as f:
    for c, k, e in ex.map(lam, cs):
        if e: loi += 1; print("LOI", c["ca"], e, flush=True); f.write(json.dumps(H[c["moTa"]], ensure_ascii=False) + "\n"); continue
        f.write(json.dumps(k[0], ensure_ascii=False) + "\n"); uv.append({"ca": c["ca"], "ungVien": k[1]})
        print(c["ca"], "| thuong gap:", k[0]["suyDoan"][:4], "| hieu khac:", [(y["moTa"][:50], y.get("nhom")) for y in k[2].get("cachHieuKhac", [])], flush=True)
json.dump(uv, open(UV, "w"), ensure_ascii=False); sys.exit(1 if loi else 0)
