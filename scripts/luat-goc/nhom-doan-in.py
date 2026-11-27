#!/usr/bin/env python3
"""M-14: rút RANH GIỚI ĐOẠN của bản in từ cây cấu trúc có sẵn trong PDF (tagged PDF do Word xuất: mỗi đoạn Word một thẻ P, mỗi tiêu đề nhóm một thẻ H4).
Tất định, không mạng, không AI. Cần poppler (chạy một lần ở máy có PDF); kết quả là đầu vào của nhom-tach.py, chữ của nút KHÔNG lấy từ đây.
  pdfinfo -struct-text "Chu giai HS 2022 Toan tap (HQKV8).pdf" > struct.txt
  python3 scripts/luat-goc/nhom-doan-in.py struct.txt > ~/luat-goc-txt/doan-in-hs2022.tsv
Mỗi dòng: <loại>\\t<chữ>. Loại: H1…H4, P (đoạn), R (ô đầu một hàng bảng), O (ô tiếp theo cùng hàng). Bỏ đoạn trống. Không lấy số trang, đầu/chân trang (PDF đánh dấu là artifact)."""
import re
import sys
import unicodedata

KHOI = re.compile(r"^( *)(H[1-6]|P|TD|TR|Table|TBody|Sect|Document)(?: \(block\))?(?: \".*)?$")


def main():
    ra, cur, trong_bang, hang_moi = [], None, -1, False
    for l in open(sys.argv[1], encoding="utf8"):
        l = l.rstrip("\n")
        s = l.strip()
        if s.startswith('"') and s.endswith('"') and len(s) >= 2:
            if cur is not None:
                cur[1].append(s[1:-1])
            continue
        m = KHOI.match(l)
        if not m:
            continue
        muc, t = len(m.group(1)), m.group(2)
        if trong_bang >= 0 and muc <= trong_bang:
            trong_bang = -1
        if t == "Table" and trong_bang < 0:
            trong_bang = muc
        if t == "TR":
            hang_moi = True
        if t == "TD" and trong_bang >= 0:
            cur = ["R" if hang_moi else "O", []]
            ra.append(cur)
        elif t == "P" and trong_bang >= 0:
            if cur is None or cur[0] not in "RO" or "".join(cur[1]).strip():  # ô có nhiều đoạn
                cur = ["O", []]
                ra.append(cur)
        elif t == "P" or t[0] == "H":
            cur = [t, []]
            ra.append(cur)
        if t in ("P", "TD") and trong_bang >= 0:
            hang_moi = False if t == "P" else hang_moi and False
    for t, v in ra:
        s = re.sub(r"\s+", " ", unicodedata.normalize("NFC", "".join(v)))
        if s.strip():
            print(f"{t}\t{s}")


main()
