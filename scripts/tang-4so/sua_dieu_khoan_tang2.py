#!/usr/bin/env python3
"""Sửa hai lỗi dữ liệu của data/luat/dieu-khoan-tang2.json (tất định, chạy lại không đổi thêm):
 1. apChoChuong của Phần XI (gan "50") thiếu Chương 54 (Chương 54 thuộc Phần XI; hs-sections.json liệt kê 50-63).
 2. id trùng: 128 id xuất hiện nhiều lần (350 mục; mục chú giải chi tiết bị tách cùng khuôn id với chú giải pháp lý). Mục xuất hiện lần đầu giữ id,
    các lần sau thêm hậu tố "~2", "~3"... (thứ tự trong tệp không đổi) để dieu_khoan.theo_id không ghi đè nhau.
Giữ nguyên định dạng tệp (json indent=0)."""
import collections, json, os
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
P = f"{REPO}/data/luat/dieu-khoan-tang2.json"
t = json.load(open(P))
sua54 = 0
for x in t:
    ch = x.get("apChoChuong")
    if x["cap"] == "phan" and x["gan"] == "50" and ch and "54" not in ch and "53" in ch:
        ch.append("54"); ch.sort(); sua54 += 1
dem = collections.Counter(); trung = 0
for x in t:
    dem[x["id"]] += 1
    if dem[x["id"]] > 1: x["id"] = f"{x['id']}~{dem[x['id']]}"; trung += 1
json.dump(t, open(P, "w"), ensure_ascii=False, indent=0)
print("them Chuong 54 vao", sua54, "muc; doi id", trung, "muc")
