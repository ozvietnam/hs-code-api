#!/usr/bin/env python3
"""Sửa lỗi dữ liệu của data/luat/dieu-khoan-tang2.json (tất định, chạy lại không đổi thêm).

Gốc lỗi apChoChuong: bộ tách dựng dải chương từ các Chương có trường `phan` khác rỗng
trong chu-giai-chuong.json. Chương 54 thuộc Phần XI nhưng `phan` rỗng → bị rơi khỏi
apChoChuong (116/116 khoản gan "50"). Nguồn đúng là data/hs-sections.json (đủ 50–63,
kể cả 54; Phần XV đúng là 72–76,78–83 — không có Chương 77).

 1. Đồng bộ apChoChuong của mọi khoản cap=phan theo hs-sections (gan = Chương đầu Phần).
 2. id trùng: mục xuất hiện lần đầu giữ id, các lần sau thêm hậu tố "~2", "~3"...

Giữ nguyên định dạng tệp (json indent=0)."""
import collections, json, os

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
P = f"{REPO}/data/luat/dieu-khoan-tang2.json"
SECTIONS = f"{REPO}/data/hs-sections.json"

secs = json.load(open(SECTIONS))["sections"]
chuong_theo_gan = {}
for s in secs:
    chs = [str(c) for c in (s.get("chapters") or [])]
    if chs:
        chuong_theo_gan[chs[0]] = chs

t = json.load(open(P))
sua_ap = 0
bang_truoc = {}  # gan -> (trước, sau) lần đầu thấy
for x in t:
    if x.get("cap") != "phan":
        continue
    gan = str(x.get("gan") or "")
    can = chuong_theo_gan.get(gan)
    if not can:
        continue
    truoc = [str(c) for c in (x.get("apChoChuong") or [])]
    if truoc != can:
        if gan not in bang_truoc:
            thieu = [c for c in can if c not in truoc]
            bang_truoc[gan] = (truoc, can, thieu)
        x["apChoChuong"] = list(can)
        sua_ap += 1

dem = collections.Counter()
trung = 0
for x in t:
    dem[x["id"]] += 1
    if dem[x["id"]] > 1:
        x["id"] = f"{x['id']}~{dem[x['id']]}"
        trung += 1

json.dump(t, open(P, "w"), ensure_ascii=False, indent=0)
print("dong-bo apChoChuong", sua_ap, "muc; doi id", trung, "muc")
for gan, (truoc, sau, thieu) in sorted(bang_truoc.items()):
    print(f"  gan={gan}: thieu={thieu} ({len(truoc)}->{len(sau)} chuong)")
