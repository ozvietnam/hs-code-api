#!/usr/bin/env python3
"""Chấm theo docs/tang-4so/LUAT-DO.md.
  python3 scripts/tang-4so/cham.py <ca-sai.json> <ket-qua.jsonl> [--ghi ca-sai-moi.json] [--nguyen-nhan nn.json]

Ca đạt:
 - nhãn CHOT: hệ CHOT đúng nhóm trong nhãn VÀ chứng minh được bằng điều khoản/trích dẫn thật (chungMinh);
 - nhãn PHAN_VAN: hệ KHÔNG chốt, trả đáp án điều kiện có >=2 nhánh, các nhánh trùng nhóm trong nhãn (mỗi nhánh khác nhóm) và có căn cứ."""
import argparse, json, re, sys, collections

def nhom_nhan(c):
    n = c.get("nhomNhan") or c.get("nhan")
    return [str(x)[:4] for x in (n if isinstance(n, list) else [n])]

def nhanh_cua(r):
    nh = [b["nhom"] for b in (r.get("nhanh") or []) if b.get("nhom")]
    if not nh and r.get("dapAnDieuKien"):  # đường thay thế: đọc từ chuỗi "Nếu A → nhóm X; nếu B → nhóm Y"
        nh = re.findall(r"(?:→|->)\s*(?:nhóm\s*)?(\d{4})", r["dapAnDieuKien"])
    return nh

def nap_nhan(c, bc):
    """Nhãn hiện hành (có thể QT đã sửa) lấy từ bộ chuẩn, không dùng bản chép trong tệp ca-sai."""
    b = bc.get(c["ca"])
    if not b: return c
    c = dict(c); c["nhan"] = b["ketQua"]; c["nhomNhan"] = b["nhom"]; c["nhomBatBuoc"] = b.get("nhomBatBuoc") or b["nhom"]
    return c

def dat(c, r):
    nhan = c.get("nhan") or c.get("nhanKetQua")
    nn = nhom_nhan(c)
    if r is None: return False, "CHUA_CHAY"
    if nhan == "CHOT":
        if r["ketQua"] != "CHOT": return False, "KHONG_CHOT"
        if r.get("nhom") not in nn: return False, "SAI_NHOM"
        if not r.get("chungMinh"): return False, "KHONG_CHUNG_MINH"
        return True, "OK"
    if r["ketQua"] != "PHAN_VAN": return False, "CHOT_KHI_PHAI_HOI" if r["ketQua"] == "CHOT" else "BE_TAC"
    nh = nhanh_cua(r)
    trung = {n for n in nh if n in nn}
    bat = c.get("nhomBatBuoc") or nn  # mặc định: các nhánh phải phủ ĐỦ các nhóm trong nhãn
    if len(trung) < 2 or not set(bat) <= set(nh): return False, "NHANH_KHONG_TRUNG_NHAN"
    if not r.get("chungMinh"): return False, "NHANH_KHONG_CAN_CU"
    return True, "OK"

def nguyen_nhan_so_bo(c, r, ly_do):
    nhan = c.get("nhan") or c.get("nhanKetQua"); nn = nhom_nhan(c)
    uv = r.get("ungVien") or []
    trong = [n for n in nn if n in uv]
    if (nhan == "CHOT" and not trong) or (nhan == "PHAN_VAN" and len(trong) < 2): return "TIM_SOT"
    if nhan == "PHAN_VAN" and r["ketQua"] == "CHOT": return "KHONG_HOI"
    if nhan == "CHOT": return "AP_SAI"
    return "AP_SAI"

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("ca_sai"); ap.add_argument("ket_qua")
    ap.add_argument("--ghi"); ap.add_argument("--nguyen-nhan")
    ap.add_argument("--bo-chuan", default="data/bo-chuan/4so-v1.jsonl")
    A = ap.parse_args()
    cas = json.load(open(A.ca_sai))
    bc = {}
    for l in open(A.bo_chuan):
        d = json.loads(l); bc[d["ca"]] = d
    cas = [nap_nhan(c, bc) for c in cas]
    kq = {}
    for l in open(A.ket_qua):
        d = json.loads(l); kq[d["ca"]] = d
    nn_tay = json.load(open(A.nguyen_nhan)) if A.nguyen_nhan else {}
    con, ra = [], []
    for c in cas:
        r = kq.get(c["ca"])
        ok, ly = dat(c, r)
        if ok: ra.append(c["ca"]); continue
        m = dict(c)
        if r:
            m.update({"heTra": r["ketQua"], "heNhom": r.get("nhom") or nhanh_cua(r), "ungVien": r.get("ungVien"), "lyKhongDat": ly,
                      "dapAnHe": r.get("dapAnDieuKien")})
            m["nguyenNhan"] = nn_tay.get(str(c["ca"])) or nguyen_nhan_so_bo(c, r, ly)
        con.append(m)
    dem = collections.Counter(m.get("nguyenNhan") for m in con)
    print(f"Đo {len(cas)} ca: đạt {len(ra)}, còn sai {len(con)}")
    print("Theo nguyên nhân:", dict(dem))
    print("Theo lý do chưa đạt:", dict(collections.Counter(m.get("lyKhongDat") for m in con)))
    print("Ra khỏi danh sách:", ra)
    if A.ghi: json.dump(con, open(A.ghi, "w"), ensure_ascii=False, indent=1)
