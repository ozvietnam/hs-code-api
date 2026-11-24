#!/usr/bin/env python3
"""Chốt kèm giả định (CEO chọn A ngày 24/11/2026): câu trả lời có điều kiện mà một nhánh gần như luôn đúng, mọi nhánh khác hiếm → CHOT nhánh đó, ghi rõ giả định.
Người xét chỉ thấy câu mô tả và điều kiện từng nhánh: KHÔNG thấy mã nhóm, nhãn, tờ khai. Hai lượt hỏi độc lập (đảo thứ tự nhánh), cả hai cùng kết luận mới chốt.
  AGY_MODEL=gemini-4-hydrogen-high python3 gia_dinh.py <ket-qua.jsonl> <ra.jsonl> [ca,ca,...]"""
import json, os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
VAO, RA = sys.argv[1:3]; CHON = {int(x) for x in sys.argv[3].split(",")} if len(sys.argv) > 3 else None
A = os.path.expanduser("~/.local/bin/agy"); M = os.environ.get("AGY_MODEL", "gemini-4-hydrogen-high")
P = """Người bán khai đúng một câu mô tả hàng: %s
Câu này chưa nói rõ một số điểm. Dưới đây là các trường hợp có thể (đánh số, thứ tự ngẫu nhiên):
%s
Với MỖI trường hợp, trong thực tế thương mại, hàng được gọi đúng bằng câu mô tả trên rơi vào trường hợp đó ở mức nào:
GAN_NHU_LUON = khoảng 95%% trở lên; THUONG_GAP = từ khoảng 5%% tới dưới 95%%; HIEM = dưới khoảng 5%%; TRAI = trái với điều người bán đã nói.
Không chắc thì chọn THUONG_GAP. Không gọi công cụ, không đọc tệp, không nêu mã HS. Trả đúng một JSON: {"muc": {"1": "...", "2": "..."}, "lyDo": "ngắn"}"""


def hoi(mo, nh):
    q = P % (mo, "\n".join(f"{i}. {n['neu']}" for i, n in enumerate(nh, 1)))
    with tempfile.TemporaryDirectory() as t:
        r = subprocess.run([A, "-p", q, "--model", M, "--output-format", "json"], capture_output=True, text=True, timeout=600, cwd=t)
    x = json.loads(re.search(r"\{.*\}", json.loads(r.stdout).get("response") or "", re.S).group(0))["muc"]
    return {n["nhom"]: x[str(i)] for i, n in enumerate(nh, 1)}


def lam(r):
    nh = [n for n in r.get("nhanh") or [] if n.get("neu") and n.get("nhom")]
    if r["ketQua"] != "PHAN_VAN" or len(nh) < 2 or (CHON and r["ca"] not in CHON) or len({n["nhom"] for n in nh}) != len(nh): return r, None
    try: m1, m2 = hoi(r["moTa"], nh), hoi(r["moTa"], nh[::-1])
    except Exception as e: return r, "LOI " + str(e)[:80]
    chot = lambda m: [g for g, v in m.items() if v == "GAN_NHU_LUON"] if all(v in ("GAN_NHU_LUON", "HIEM", "TRAI") for v in m.values()) else []
    a, b = chot(m1), chot(m2)
    if len(a) == 1 and a == b:
        n = next(x for x in nh if x["nhom"] == a[0])
        r = {**r, "ketQua": "CHOT", "nhom": a[0], "giaDinh": n["neu"], "neuKhac": [{"neu": x["neu"], "nhom": x["nhom"]} for x in nh if x["nhom"] != a[0]], "truocGiaDinh": "PHAN_VAN"}
    return r, (m1, m2)


rs = [json.loads(l) for l in open(VAO, encoding="utf-8")]
with ThreadPoolExecutor(2) as ex, open(RA, "w", encoding="utf-8") as f:
    for r, m in ex.map(lam, rs):
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
        if m is not None: print(r["ca"], r["ketQua"], r.get("nhom") if r["ketQua"] == "CHOT" else "", m, flush=True)
