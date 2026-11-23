#!/usr/bin/env python3
"""Kiểm đồ thị cấp hồ sơ KHÔNG dùng LLM (luật đo 23/11/2026, bước "Hồ sơ đi theo đồ thị").

Với các ca còn sai (docs/tang-4so/ca-sai-v1-vong3.json + ca 10, 38 trong ca-sai-v1-vong2-nhanmoi.json) và ca mẫu "cụm thiết bị dò vải":
  (i)   nhóm trong nhãn có nằm trong ứng viên SAU mở rộng theo cạnh không (nhãn lấy từ data/bo-chuan/4so-v1.jsonl, CHỈ để chấm, không đưa vào hồ sơ);
  (ii)  có ít nhất một khoản luật nối hai nhóm trong nhãn không, id nào;
  (iii) kích thước hồ sơ (prompt thật do so_nhom.py dựng) so với đường cũ.
Không gọi LLM. Chạy:  python3 scripts/tang-4so/kiem_do_thi.py --ra docs/tang-4so/kiem-do-thi-vong4.json"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("--ra", default=None)
ap.add_argument("--hh", default=os.path.expanduser("~/hh-agy-v1.jsonl"))
ap.add_argument("--ca-sai", default=None, help="tệp ca sai khác (vd v2); mặc định: 11 ca v1 + ca mẫu")
ap.add_argument("--bo-chuan", default="data/bo-chuan/4so-v1.jsonl")
ap.add_argument("--khong-kich-thuoc", action="store_true", help="bỏ phần dựng prompt thật (nhanh hơn, không nạp chỉ mục tìm kiếm)")
A = ap.parse_args()

sys.path.insert(0, HERE)
if A.khong_kich_thuoc:
    from do_thi_cap import DoThiCap
    DT = DoThiCap(REPO); SN = None
else:
    sys.argv = ["so_nhom.py", "--ca-sai", "x", "--ra", os.devnull, "--ho-so", "do-thi", "--hh", A.hh, "--cum", "/tmp/cum-kiem.jsonl"]
    import so_nhom as SN  # nạp dữ liệu như đường chạy thật (mô-đun này không tự chạy main khi import)
    DT = SN.DT
    SN.llm_nha = lambda *a, **k: None  # kiểm KHÔNG gọi LLM kể cả máy nhà: ca chưa có cụm trong đệm dùng cụm lấy thẳng từ hồ sơ hàng


def chuan(s): return (s or "").replace("\n", " ").strip()


HH = {}
for l in open(A.hh):
    try: d = json.loads(l); HH[chuan(d["moTa"])] = d
    except Exception: pass
BC = {}
for l in open(os.path.join(REPO, A.bo_chuan)):
    d = json.loads(l); BC[d["ca"]] = d

MAU = {"ca": "mau", "moTa": "Cụm thiết bị dò vải / FABRIC DETECTOR ASSEMBLY, model SMD-01, đầu dò nam châm buộc ở đuôi vải, lắp trên máy nhuộm vải",
       "ungVien": ["8451", "8536"], "nhom": ["8451", "8543", "9031"], "ghiChu": "ca mẫu: hàng là bộ phận máy; kiểm có Chú giải 2(a) Phần XVI và có mở sang 8543 / 9031 không",
       "hh": {"tenDung": "Cụm thiết bị dò vải", "tenKhac": ["Fabric detector assembly"], "banChat": "cụm thiết bị dò, đầu dò nam châm",
              "coChe": "đầu dò nam châm buộc ở đuôi vải để phát hiện vải", "dungChoViecGi": "phát hiện đuôi vải trên máy nhuộm vải", "laBoPhanCua": "máy nhuộm vải",
              "dangVatLy": {"chatLieu": "kim loại, nam châm"}}}

if A.ca_sai:
    DS = json.load(open(os.path.join(REPO, A.ca_sai)))
else:
    ca_sai = {c["ca"]: c for c in json.load(open(f"{REPO}/docs/tang-4so/ca-sai-v1-vong3.json"))}
    for c in json.load(open(f"{REPO}/docs/tang-4so/ca-sai-v1-vong2-nhanmoi.json")):
        if c["ca"] in (10, 38): ca_sai[c["ca"]] = c
    DS = [ca_sai[k] for k in sorted(ca_sai)] + [MAU]


def chuan_canh(cc): return re.sub(r"\(.*?\)$", "", cc)


bang, chi_tiet = [], []
for c in DS:
    if c["ca"] == "mau":
        h = dict(c["hh"]); h["moTa"] = c["moTa"]; nhan = c["nhom"]
    else:
        h = HH.get(chuan(c["moTa"]), {}); nhan = BC[c["ca"]]["nhom"]
    uv0 = list(c["ungVien"])
    if SN is not None and c["ca"] != "mau":
        # ứng viên GỐC như đường chạy thật: gom_ung_vien của so_nhom.py (ứng viên vòng trước + tìm kiếm + khoản loại trừ), chưa mở rộng theo cạnh
        dt_tam, SN.DT = SN.DT, None
        try: uv0, _ = SN.gom_ung_vien({"ca": c["ca"], "ungVien": list(c["ungVien"]), "uuTien": []}, chuan(c["moTa"]), h, {})
        finally: SN.DT = dt_tam
    uv2, nguon = DT.mo_rong(uv0, h)
    ks = DT.dieu_khoan_tach(uv2, h, nguon)
    # (i)
    co0 = {n: (n in uv0) for n in nhan}
    co2 = {n: (n in uv2) for n in nhan}
    # (ii)
    noi = {}
    for k in ks:
        for cc in k["canh"]:
            p = re.split(r"<->|->", chuan_canh(cc))
            if len(p) == 2 and p[0] in nhan and p[1] in nhan and p[0] != p[1]:
                noi.setdefault(k["id"], set()).add("-".join(sorted(p)))
    # hạng của nhóm nhãn trong xếp hạng mở rộng
    hang = {n: next((i + 1 for i, t in enumerate(DT.xep_cuoi) if t[1] == n), None) for n in nhan if n not in uv0}
    # (iii)
    kb_moi = kb_cu = None; cu_uv = cu_noi = None
    if SN is not None:
        mo = chuan(c["moTa"])
        tu = SN.tu_khoa(mo, h.get("tenDung"), h.get("banChat"), h.get("coChe"), h.get("dungChoViecGi"))
        ca = {"ca": c["ca"], "_dt_nguon": nguon, "ungVien": uv0}
        p, _, _, _, _ = SN.dung_prompt(ca, mo, h, uv2, tu, None)
        kb_moi = round(len(p.encode()) / 1024, 1)
        ca2 = {"ca": c["ca"], "ungVien": uv0}
        dt_cu, SN.DT = SN.DT, None
        try:
            p2, p2_ids, _, _, bo = SN.dung_prompt(ca2, mo, h, uv0, tu, None)
            kb_cu = round(len(p2.encode()) / 1024, 1)
            cu_uv = [n for n in uv0 if n not in bo]
            cu_noi = []
            for i in p2_ids:
                x = DT.dk_theo_id.get(i)
                if not x: continue
                for a_ in nhan:
                    for b_ in nhan:
                        if a_ != b_ and x["id"] in {y["id"] for y in sum(DT.dk.hieu_luc(a_[:2]), [])} and (b_ in (x.get("dich") or []) or DT._dich_chi_toi(x.get("dich") or [], b_) and b_[:2] != a_[:2]):
                            cu_noi.append(i)
            cu_noi = sorted(set(cu_noi))
        finally:
            SN.DT = dt_cu
    bang.append({"ca": c["ca"], "nhan": nhan, "nhanTrongUvGoc": co0, "nhanTrongUvSauMoRong": co2, "hangMoRong": hang, "soUvGoc": len(uv0), "soUvSau": len(uv2),
                 "khoanNoiNhan": {k: sorted(v) for k, v in noi.items()}, "soKhoan": len(ks), "kbKhoan": round(sum(len(k["nguyenVan"]) for k in ks) / 1024, 1), "kbHoSoMoi": kb_moi, "kbHoSoCu": kb_cu, "cuNhanTrongUv": ({n: (n in cu_uv) for n in nhan} if cu_uv is not None else None), "cuKhoanNoi": cu_noi})
    chi_tiet.append({"ca": c["ca"], "ungVienSau": uv2, "nhomThem": {n: {"diem": v["diem"], "ly": [(l["tu"], l["loai"], l["id"]) for l in v["ly"]]} for n, v in nguon.items()},
                     "khoan": [{"id": k["id"], "kieu": k["kieu"], "canh": k["canh"][:6], "byte": len(k["nguyenVan"])} for k in ks]})

print(f"{'ca':>4} {'nhan':<22} {'(i) nhan trong UV (goc -> sau)':<38} {'(ii) khoan noi nhan':<44} {'KB moi':>7} {'KB cu':>6}")
for b in bang:
    i = " ".join(f"{n}:{'Y' if b['nhanTrongUvGoc'][n] else 'n'}>{'Y' if b['nhanTrongUvSauMoRong'][n] else 'N'}" + (f"(#{b['hangMoRong'][n]})" if b['hangMoRong'].get(n) else "") for n in b["nhan"])
    ii = "; ".join(f"{k[:36]}" for k in list(b["khoanNoiNhan"])[:3]) or "KHONG"
    print(f"{str(b['ca']):>4} {','.join(b['nhan']):<22} {i:<38} {ii:<44} {b['kbHoSoMoi'] if b['kbHoSoMoi'] is not None else '-':>7} {b['kbHoSoCu'] if b['kbHoSoCu'] is not None else '-':>6}")
tong = [b for b in bang if b["ca"] != "mau"]
da = [b for b in tong if len(b["nhan"]) >= 2]
print(f"TONG {len(tong)} ca: (i) moi: moi nhan trong UV {sum(all(b['nhanTrongUvSauMoRong'].values()) for b in tong)}/{len(tong)}, cu: {sum(all(b['cuNhanTrongUv'].values()) for b in tong if b['cuNhanTrongUv'])}/{len(tong)}; "
      f"(ii) tren {len(da)} ca co >=2 nhan: moi co khoan noi {sum(bool(b['khoanNoiNhan']) for b in da)}, cu {sum(bool(b['cuKhoanNoi']) for b in da)}; KB moi TB {sum(b['kbHoSoMoi'] for b in tong)/len(tong):.1f}, cu TB {sum(b['kbHoSoCu'] for b in tong)/len(tong):.1f}")
if A.ra:
    json.dump({"bang": bang, "chiTiet": chi_tiet}, open(A.ra if os.path.isabs(A.ra) else os.path.join(REPO, A.ra), "w"), ensure_ascii=False, indent=1)
mm = [x for x in chi_tiet if x["ca"] == "mau"]
if not mm: sys.exit(0)
m = mm[0]
print("ca mau: Chu giai 2(a) Phan XVI trong ho so:", "CO" if any(k["id"] == "phan:84:chu_giai:2a" for k in m["khoan"]) else "KHONG", "| mo sang 8543:", "CO" if "8543" in m["ungVienSau"] else "KHONG", "| mo sang 9031:", "CO" if "9031" in m["ungVienSau"] else "KHONG")
