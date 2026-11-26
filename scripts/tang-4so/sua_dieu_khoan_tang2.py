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

 1. Loại bỏ 397 khoản con giả nằm sau tiêu đề TỔNG QUÁT (WCO Explanatory Notes) và
    khôi phục 37 chú giải pháp lý đơn cuối chương/phân nhóm bị nuốt vào `dan` (kể cả
    sửa `chuong:63:chu_giai:1a..1e` thành `chuong:63:chu_giai_phan_nhom:1`).
 2. Đồng bộ apChoChuong của mọi khoản cap=phan theo hs-sections (gan = Chương đầu Phần).
 3. id trùng: đánh số lại từ gốc id (bỏ hậu tố ~N cũ), mục xuất hiện lần đầu giữ id gốc,
    các lần sau thêm hậu tố "~2", "~3"...
 4. Lọc dich: bỏ mã 4 chữ số không có trong chu-giai-heading.json.

Giữ nguyên định dạng tệp (json indent=0)."""
import collections, json, os, re

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
P = f"{REPO}/data/luat/dieu-khoan-tang2.json"
SECTIONS = f"{REPO}/data/hs-sections.json"
HEADING = f"{REPO}/data/chu-giai-heading.json"
CHU_GIAI_CHUONG = f"{REPO}/data/chu-giai-chuong.json"

CUM_CO_KHOAN_CON_THAT = {
    "chuong:11:chu_giai:3",
    "chuong:32:chu_giai:6",
    "phan:50:chu_giai:2",
    "chuong:55:chu_giai:1",
    "chuong:64:chu_giai_phan_nhom:1",
    "chuong:69:chu_giai:2",
    "phan:72:chu_giai:8",
    "phan:86:chu_giai:5",
    "chuong:86:chu_giai:3",
    "chuong:90:chu_giai:7",
    "chuong:95:chu_giai_phan_nhom:1",
}


def chuan(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def truoc_tong_quat(van_ban):
    if not van_ban:
        return ""
    idx = van_ban.find("TỔNG QUÁT")
    return van_ban[:idx] if idx != -1 else van_ban


def tien_to_cum(id_str):
    goc = str(id_str or "").split("~")[0]
    m = re.match(r"^((?:chuong|phan):\d+:[a-z_]+:\d+)[a-z]+$", goc)
    return m.group(1) if m else goc


def trich_dich(van_ban, nhom_hop_le):
    ma_4so = []
    for m in re.finditer(r"\b(\d{2})\.(\d{2})\b", van_ban):
        ma = m.group(1) + m.group(2)
        if ma in nhom_hop_le and ma not in ma_4so:
            ma_4so.append(ma)
    ma_chuong = []
    for m in re.finditer(r"[Cc]hương\s+(\d{1,2})\b", van_ban):
        ch = f"C{int(m.group(1)):02d}"
        if ch not in ma_chuong:
            ma_chuong.append(ch)
    return ma_4so + ma_chuong


def phan_loai_kieu(van_ban):
    if re.search(r"không bao gồm|không áp dụng|loại trừ|trừ các", van_ban, re.I):
        return "LOAI_TRU"
    if re.search(r"được phân loại|phân loại vào|xếp vào", van_ban, re.I):
        return "QUY_TAC_PHAN_LOAI"
    return "DINH_NGHIA_PHAM_VI"


secs = json.load(open(SECTIONS))["sections"]
chuong_theo_gan = {}
for s in secs:
    chs = [str(c) for c in (s.get("chapters") or [])]
    if chs:
        chuong_theo_gan[chs[0]] = chs

nhom_that = set(json.load(open(HEADING)))
cg_chuong = json.load(open(CHU_GIAI_CHUONG))

t_goc = json.load(open(P))
t = []
da_khoi_phuc = set()
so_loai_bo_sau_tq = 0
so_khoi_phuc_don = 0

for x in t_goc:
    entry = cg_chuong.get(str(x.get("gan") or ""), {})
    truong = "phan" if x.get("cap") == "phan" else "chuong"
    vb_truoc_raw = truoc_tong_quat(entry.get(truong) or "").strip()
    vb_truoc_chuan = chuan(vb_truoc_raw)
    nv_chuan = chuan(x.get("nguyenVan"))
    if nv_chuan and nv_chuan in vb_truoc_chuan:
        t.append(x)
        continue

    so_loai_bo_sau_tq += 1
    pref = tien_to_cum(x.get("id"))
    if pref in CUM_CO_KHOAN_CON_THAT or pref in da_khoi_phuc:
        continue

    dan0 = (x.get("dan") or "").strip()
    pos = vb_truoc_raw.find(dan0) if dan0 else -1
    if pos == -1 and dan0:
        pos = vb_truoc_raw.find(dan0[:40])
    if pos == -1:
        continue

    nv_moi = vb_truoc_raw[pos:].strip()
    la_ch63_pn = (
        x.get("cap") == "chuong"
        and str(x.get("gan")) == "63"
        and dan0.startswith("1. Phân nhóm 6304.20")
    )
    vung_moi = "chu_giai_phan_nhom" if la_ch63_pn else x["vung"]
    khoan_moi = "1" if la_ch63_pn else str(x["khoan"])
    id_moi = f"{x['cap']}:{x['gan']}:{vung_moi}:{khoan_moi}"

    ban_ghi = {
        "id": id_moi,
        "cap": x["cap"],
        "gan": x["gan"],
        "vung": vung_moi,
        "khoan": khoan_moi,
        "diem": "",
        "kieu": phan_loai_kieu(nv_moi),
        "dich": trich_dich(nv_moi, nhom_that),
        "dan": "",
        "nguyenVan": nv_moi,
        "hieuLuc": x.get("hieuLuc") or "BAT_BUOC",
    }
    if x.get("cap") == "phan" and "apChoChuong" in x:
        ban_ghi["apChoChuong"] = list(x["apChoChuong"])
    t.append(ban_ghi)
    da_khoi_phuc.add(pref)
    so_khoi_phuc_don += 1
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
    goc_id = str(x["id"]).split("~")[0]
    dem[goc_id] += 1
    id_chuan = goc_id if dem[goc_id] == 1 else f"{goc_id}~{dem[goc_id]}"
    if x["id"] != id_chuan:
        x["id"] = id_chuan
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
print(
    "loai-bo sau TỔNG QUÁT",
    so_loai_bo_sau_tq,
    "muc; khoi-phuc chu giai don",
    so_khoi_phuc_don,
    "muc; dong-bo apChoChuong",
    sua_ap,
    "muc; doi id",
    trung,
    "muc; loc dich ao",
    loc_dich,
    "muc; tong con",
    len(t),
    "muc",
)
for gan, (truoc, sau, thieu) in sorted(bang_truoc.items()):
    print(f"  gan={gan}: thieu={thieu} ({len(truoc)}->{len(sau)} chuong)")
if vi_du_ao:
    print("  dich ao:", "; ".join(vi_du_ao))
