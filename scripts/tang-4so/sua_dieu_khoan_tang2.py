#!/usr/bin/env python3
"""Sửa lỗi dữ liệu của data/luat/dieu-khoan-tang2.json (tất định, chạy lại không đổi thêm).

Gốc lỗi apChoChuong: bộ tách dựng dải chương từ các Chương có trường `phan` khác rỗng
trong chu-giai-chuong.json. Chương 54 thuộc Phần XI nhưng `phan` rỗng → bị rơi khỏi
apChoChuong (116/116 khoản gan "50"). Nguồn đúng là data/hs-sections.json (đủ 50–63,
kể cả 54; Phần XV đúng là 72–76,78–83 — không có Chương 77).

Gốc lỗi dich ảo: bộ trích bắt mọi dạng XX.YY trong nguyên văn (tỷ lệ 99.94%, số đo
g/m², nhóm HS cũ đã bãi bỏ như 84.69 / 95.01 / 95.02) rồi ghép thành mã 4 chữ số.
Đối chiếu với khoá của data/chu-giai-heading.json (nhóm 4 số hiện hành) rồi bỏ mã
không có thật; giữ Cxx / P:… và mã 4 số còn hiệu lực.

 1. Đồng bộ apChoChuong của mọi khoản cap=phan theo hs-sections (gan = Chương đầu Phần).
 2. id trùng: mục xuất hiện lần đầu giữ id, các lần sau thêm hậu tố "~2", "~3"...
 3. Lọc dich: bỏ mã 4 chữ số không có trong chu-giai-heading.json.

Giữ nguyên định dạng tệp (json indent=0)."""
import collections, json, os, re

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
P = f"{REPO}/data/luat/dieu-khoan-tang2.json"
SECTIONS = f"{REPO}/data/hs-sections.json"
HEADING = f"{REPO}/data/chu-giai-heading.json"

secs = json.load(open(SECTIONS))["sections"]
chuong_theo_gan = {}
for s in secs:
    chs = [str(c) for c in (s.get("chapters") or [])]
    if chs:
        chuong_theo_gan[chs[0]] = chs

nhom_that = set(json.load(open(HEADING)))

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

loc_dich = 0
vi_du_ao = []
for x in t:
    dich = x.get("dich")
    if not dich:
        continue
    moi = []
    for ma in dich:
        s = str(ma)
        if re.fullmatch(r"\d{4}", s) and s not in nhom_that:
            loc_dich += 1
            if len(vi_du_ao) < 12:
                vi_du_ao.append(f"{x['id']}->{s}")
            continue
        moi.append(ma)
    if moi != list(dich):
        x["dich"] = moi

json.dump(t, open(P, "w"), ensure_ascii=False, indent=0)
print("dong-bo apChoChuong", sua_ap, "muc; doi id", trung, "muc; loc dich ao", loc_dich, "muc")
for gan, (truoc, sau, thieu) in sorted(bang_truoc.items()):
    print(f"  gan={gan}: thieu={thieu} ({len(truoc)}->{len(sau)} chuong)")
if vi_du_ao:
    print("  dich ao:", "; ".join(vi_du_ao))
