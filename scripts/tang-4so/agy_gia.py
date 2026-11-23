#!/usr/bin/env python3
"""agy GIẢ để thử luồng so_nhom.py mà không gọi LLM thật (hết hạn mức). Cách dùng: AGY_BIN=scripts/tang-4so/agy_gia.py"""
import json, re, sys
p = sys.argv[sys.argv.index("-p") + 1]
if "kiểm toán viên" in p:
    ng = re.findall(r"^- (\d{4}) ", p, re.M)
    y = [n for n in ng if n not in re.findall(r"CHỐT nhóm (\d{4})", p)][:1] or ng[:1]
    r = {"phanBien": [{"nhomY": y[0], "giaDinh": "hàng là chi tiết rời", "hoSoCoNeu": False, "neuKhac": "hàng là bộ hoàn chỉnh", "trichLuat": "", "canCu": re.findall(r"^\[([a-z]+:\d+:chu_giai:[0-9a-z]+)\]", p, re.M)[:1]}]}
else:
    ng = re.findall(r"^### Nhóm (\d{4}):", p, re.M)
    ids = re.findall(r"^\[([a-z]+:\d+:chu_giai:[0-9a-z]+)\]", p, re.M)
    xet = [{"nhom": n, "ketLuan": "KHOP" if i == 0 else "LOAI", "dieuKhoan": ids[:1], "trich": "Nhóm này bao gồm hàng", "dieuKienVao": "dạng A", "duKienQuyetDinh": "x", "daCo": True} for i, n in enumerate(ng)]
    r = {"xet": xet, "ketQua": "CHOT", "nhom": ng[0], "quyTac": "QT1", "nhomThieu": []}
print(json.dumps({"status": "SUCCESS", "response": json.dumps(r, ensure_ascii=False)}))
