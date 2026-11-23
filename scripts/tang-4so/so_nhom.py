#!/usr/bin/env python3
"""Tầng 4 số theo ADR-0004 (bản vòng sửa): gom ứng viên -> tầng điều khoản -> phán xử bằng LLM mạnh (Antigravity)
-> luật cứng "phải hỏi" (tất định) -> CHOT / PHAN_VAN kèm điều khoản căn cứ.

  python3 scripts/tang-4so/so_nhom.py --ca-sai docs/tang-4so/ca-sai-v1-vong0.json --vong 1 --ra ket-qua.jsonl

Chỉ đo các ca trong --ca-sai (luật đo: cấm chạy lại cả bộ). Mỗi ca tối đa 2 lượt gọi LLM mạnh.
Hồ sơ hàng dùng lại từ --hh (hh_agy.py tạo), không chạy lại."""
import argparse, gzip, json, os, re, sys, urllib.request, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dieu_khoan import DieuKhoan, bo_dau
import agy

ap = argparse.ArgumentParser()
ap.add_argument("--repo", default=os.path.abspath(os.path.join(HERE, "..", "..")))
ap.add_argument("--bo-chuan", default="data/bo-chuan/4so-v1.jsonl")
ap.add_argument("--ca-sai", required=True)
ap.add_argument("--hh", default=os.path.expanduser("~/hh-agy-v1.jsonl"))
ap.add_argument("--cum", default="docs/tang-4so/cache-cum-v1.jsonl", help="bộ nhớ đệm cụm từ dò luật")
ap.add_argument("--ra", required=True)
ap.add_argument("--vong", type=int, default=1)
ap.add_argument("--llm-nha", default=os.environ.get("LLM_NHA", "http://192.168.1.68:11434/v1/chat/completions"))
ap.add_argument("--toi-da-uv", type=int, default=16)
A = ap.parse_args()
REPO = A.repo
P = lambda p: p if os.path.isabs(p) else os.path.join(REPO, p)

# ---------------- dữ liệu luật ----------------
TEN = {}
for l in gzip.open(f"{REPO}/data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz", "rt"):
    d = json.loads(l); m = d.get("maChuan") or ""
    if len(m) >= 4 and (d.get("soChuSo") == 4 or m[:4] not in TEN): TEN[m[:4]] = d.get("moTaVi", "")
CGN = json.load(open(f"{REPO}/data/chu-giai-heading.json"))
DK = DieuKhoan(REPO)
_sp = importlib.util.spec_from_file_location("ttl", os.path.join(HERE, "tim_tong_luc.py"))
ttl = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(ttl)
IDX = ttl.ChiMuc(REPO)

def so_tay(n):
    try: return json.load(open(f"{REPO}/data/so-tay/{n}.json"))
    except Exception: return {}

def nhom_hop_le(x):
    x = re.sub(r"\D", "", str(x))[:4]
    return x if x in TEN else None

def tu_khoa(*chuoi):
    bo = {"dung", "cho", "cac", "loai", "khac", "bang", "hoac", "duoc", "trong", "nhung", "voi", "cua", "mot", "nay", "cac", "khong", "co"}
    tu = set()
    for s in chuoi:
        for w in re.findall(r"[a-z0-9]+", bo_dau(s if isinstance(s, str) else json.dumps(s, ensure_ascii=False) if s else "")):
            if len(w) >= 4 and w not in bo: tu.add(w)
    return sorted(tu)

def doan_khop(text, tu, cap):
    if not text: return ""
    doan = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not doan: return ""
    chon = [doan[0]] + [p for p in doan[1:] if any(t in bo_dau(p) for t in tu)]
    return "\n".join(chon)[:cap]

# ---------------- hồ sơ hàng ----------------
def chuan(s): return (s or "").replace("\n", " ").strip()
HH = {}
for l in open(A.hh):
    try: d = json.loads(l); HH[chuan(d["moTa"])] = d
    except Exception: pass

CUM = {}
if os.path.exists(P(A.cum)):
    for l in open(P(A.cum)):
        try: d = json.loads(l); CUM[d["moTa"]] = d["cum"]
        except Exception: pass

def llm_nha(msg, mx=3000):
    """Máy nhà: chỉ việc phụ (tách cụm từ). Không sẵn thì trả None, người gọi dùng đường thay thế."""
    b = {"model": "gpt-oss:120b", "max_tokens": mx, "reasoning_effort": "low", "response_format": {"type": "json_object"},
         "messages": [{"role": "user", "content": msg}]}
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(A.llm_nha, json.dumps(b).encode(),
            {"Content-Type": "application/json", "Authorization": "Bearer x"}), timeout=60))
        return json.loads(r["choices"][0]["message"]["content"] or "{}")
    except Exception:
        return None

def cum_tu_ho_so(mo, h):
    """Đường thay thế khi máy nhà không trả lời: cụm ngắn lấy thẳng từ hồ sơ hàng."""
    def ngan(x): return [c.strip() for c in re.split(r"[,;/()]|\bvà\b", x or "") if 2 <= len(c.split()) <= 4 or len(c.split()) == 1 and len(c) > 3][:5]
    dv = h.get("dangVatLy") or {}
    ten = [h.get("tenDung")] + list(h.get("tenKhac") or [])
    return {"ten": [t for t in ten if t and len(t.split()) <= 5], "ten_en": [t for t in (h.get("tenKhac") or []) if t and re.search(r"[a-z]", t) and len(t.split()) <= 4],
            "chat_lieu": ngan(dv.get("chatLieu") if isinstance(dv, dict) else ""), "cau_tao": ngan(dv.get("hinhDang") if isinstance(dv, dict) else ""),
            "chuc_nang": ngan(h.get("dungChoViecGi")), "co_che": ngan(h.get("coChe")), "cong_dung": [],
            "may_chu": [h["laBoPhanCua"]] if h.get("laBoPhanCua") and len(str(h["laBoPhanCua"]).split()) <= 6 else []}

def lay_cum(mo, h, bc):
    if mo in CUM: return CUM[mo]
    cum = llm_nha("Hàng: \"%s\"\nHiểu biết: %s\nLiệt kê CỤM TỪ NGẮN (1–4 chữ) để dò trong biểu thuế/chú giải HS tiếng Việt và tiếng Anh, "
                  "kể cả tên gọi khác trong văn bản luật. JSON {\"ten\":[],\"ten_en\":[],\"chat_lieu\":[],\"cau_tao\":[],\"co_che\":[],"
                  "\"chuc_nang\":[],\"cong_dung\":[],\"may_chu\":[]}" % (mo, json.dumps({k: h.get(k) for k in ("tenDung", "banChat", "coChe", "dungChoViecGi", "laBoPhanCua")}, ensure_ascii=False)))
    nguon = "gpt-oss"
    if not cum or not any(cum.values()):
        cum, nguon = cum_tu_ho_so(mo, h), "ho-so"
    with open(P(A.cum), "a") as f: f.write(json.dumps({"moTa": mo, "cum": cum, "nguon": nguon}, ensure_ascii=False) + "\n")
    CUM[mo] = cum
    return cum

# ---------------- gom ứng viên ----------------
def gom_ung_vien(ca, mo, h, bc):
    tu = tu_khoa(mo, h.get("tenDung"), h.get("banChat"), h.get("coChe"), h.get("dungChoViecGi"))
    cum = lay_cum(mo, h, bc)
    uv = [n for n, _, _ in IDX.tim(cum, top=8)]
    # ứng viên đã gom ở vòng trước (cũ, gồm đề xuất AI) giữ nguyên: không bỏ nhóm đã có
    for x in ca.get("ungVien") or []:
        n = nhom_hop_le(x)
        if n and n not in uv: uv.append(n)
    # điều loại trừ (Chương + Phần) có đích -> thêm nhóm đích khi điều đó dính chữ của hàng
    them = []
    for n in list(uv):
        for id_, nv, dich in DK.dich_loai_tru(n[:2]):
            if not any(t in bo_dau(nv) for t in tu): continue
            for dd in dich:
                if re.fullmatch(r"\d{4}", dd):
                    if dd in TEN and dd not in uv and dd not in them: them.append(dd)
                elif re.fullmatch(r"C\d{2}", dd):  # đích là cả Chương: lấy nhóm của Chương đó khớp hàng nhất
                    ch = dd[1:]
                    r = [m for m, _, _ in IDX.tim(cum, top=40) if m[:2] == ch][:2]
                    for m in r:
                        if m not in uv and m not in them: them.append(m)
    # bộ phận máy: thêm nhóm bộ phận 2(b) ứng với máy chủ tìm được
    mc = h.get("laBoPhanCua")
    if mc and str(mc).lower() not in ("null", "none"):
        maychu = [n for n, _, _ in IDX.tim({"ten": [str(mc)], "may_chu": [str(mc)]}, top=6)]
        for m in DK.nhom_2b_cho(maychu):
            if m not in uv and m not in them: them.append(m)
        for n in maychu:
            if n not in uv and n not in them: them.append(n)
    uv = (uv + them)[: A.toi_da_uv]
    return uv, tu

# ---------------- hồ sơ từng nhóm ----------------
def ho_so_nhom(n, tu):
    st = so_tay(n)
    cgn = CGN.get(n) or {}
    cgn_txt = cgn.get("nhom") if isinstance(cgn, dict) else str(cgn)
    vao = [f"- {x.get('fact','')} {x.get('op','')} {x.get('value','')} (trích: {str(x.get('trich',''))[:140]})" for x in (st.get("dieuKienVao") or [])[:6] if isinstance(x, dict)]
    return (f"### Nhóm {n}: {TEN.get(n,'?')}\n[Chú giải chi tiết {n}] {doan_khop(cgn_txt, tu, 1400)}\n"
            + ("[Sổ tay – điều kiện vào nhóm (trái điều kiện thì LOẠI)]\n" + "\n".join(vao) + "\n" if vao else ""))

def dung_prompt(ca, mo, h, uv, tu):
    chuong = sorted({n[:2] for n in uv})
    khoi, ids = [], set()
    for ch in chuong:
        t, i = DK.khoi(ch, tu); khoi.append(f"=== ĐIỀU KHOẢN HIỆU LỰC CHO NHÓM THUỘC CHƯƠNG {ch} ===\n{t}"); ids |= set(i)
    cg2 = DK.cg2_khoi() if any(DK.la_phan_xvi(c) for c in chuong) else ""
    ho_so = "\n".join(ho_so_nhom(n, tu) for n in uv)
    bc = {k: h.get(k) for k in ("tenDung", "banChat", "dangVatLy", "dungChoViecGi", "coChe", "oDau", "aiDung", "laBoPhanCua", "tenKhac", "canXacNhan") if h.get(k)}
    text_all = "\n".join(khoi) + "\n" + ho_so + "\n" + cg2
    prompt = (
        "Bạn là chuyên gia phân loại HS Việt Nam. CHỈ xét tầng NHÓM 4 số, đúng trình tự ADR-0004 (6 Quy tắc tổng quát):\n"
        "1) Hiểu bản chất hàng (đã có dưới đây). KHÔNG dựa vào tờ khai, KHÔNG dựa vào trí nhớ về mã; chỉ dựa vào văn bản đưa dưới đây.\n"
        "2) Quy tắc 1: với MỖI nhóm ứng viên soát theo thứ tự: (i) các điều LOẠI TRỪ của Chương và Phần (có số hiệu [id]) — nếu một điều loại trừ áp cho hàng thì nhóm bị LOẠI, trích id; "
        "(ii) điều QUY TẮC PHÂN LOẠI; (iii) tên nhóm + chú giải chi tiết + điều kiện vào nhóm; (iv) với bộ phận máy: Chú giải 2 Phần XVI theo thứ tự 2(a)→2(b)→2(c), nhóm định danh riêng (8482, 8483, 8501, 8545...) thắng nhóm bộ phận chung. "
        "Nhóm gọi ĐÚNG TÊN hàng thắng nhóm chỉ nêu theo vật liệu/công dụng chung (\"sản phẩm bằng...\", \"khác\"). Chỉ còn một nhóm thì DỪNG (QT1), không viện Quy tắc 3.\n"
        "3) Chỉ khi Quy tắc 1 không đủ mới dùng 3a→3b→3c, và phải nói rõ vì sao QT1 không đủ.\n"
        "4) PHẢI HỎI, KHÔNG ĐOÁN: nếu hai nhóm trở lên còn khớp mà điểm khác nhau giữa chúng là một dữ kiện hồ sơ hàng KHÔNG có (hoặc nằm trong canXacNhan), "
        "thì nhóm đó là CHUA_RO và daCo=false, kết quả là PHAN_VAN với nhánh điều kiện. Dữ kiện đã có trong hồ sơ (kể cả suy ra chắc chắn từ mô tả) thì daCo=true.\n\n"
        f"HÀNG: \"{mo}\"\nBẢN CHẤT (hồ sơ hàng): {json.dumps(bc, ensure_ascii=False)}\n\n"
        + "\n".join(khoi) + ("\n\n" + cg2 if cg2 else "") + "\n\nHỒ SƠ CÁC NHÓM ỨNG VIÊN:\n" + ho_so +
        "\n\nTrả JSON thuần (không giải thích ngoài JSON):\n"
        "{\"xet\": [{\"nhom\": \"xxxx\", \"ketLuan\": \"KHOP|LOAI|CHUA_RO\", \"dieuKhoan\": [\"id điều khoản áp dụng, đúng số hiệu ở trên\"], "
        "\"trich\": \"trích nguyên văn ≤200 chữ làm căn cứ (điều khoản hoặc tên nhóm/chú giải chi tiết)\", "
        "\"dieuKienVao\": \"đặc điểm QUAN SÁT ĐƯỢC của hàng để vào nhóm này (ngắn)\", "
        "\"duKienQuyetDinh\": \"dữ kiện phân biệt nhóm này với nhóm khác\", \"daCo\": true|false}],\n"
        " \"ketQua\": \"CHOT|PHAN_VAN\", \"nhom\": \"xxxx nếu CHOT\", \"quyTac\": \"QT1|QT3a|QT3b|QT3c\",\n"
        " \"nhanh\": [{\"neu\": \"đặc điểm quan sát được\", \"nhom\": \"xxxx\", \"canCu\": [\"id điều khoản\"]}] (nếu PHAN_VAN, ≥2 nhánh khác nhóm),\n"
        " \"cauHoi\": \"câu hỏi khách, gắn đúng điều kiện luật cần dữ kiện\" (nếu PHAN_VAN)}\n"
        "Mọi nhóm ứng viên đều phải có mặt trong \"xet\"."
    )
    return prompt, ids, text_all

# ---------------- hậu xử lý tất định ----------------
def kiem_trich(trich, nguon):
    """Trích dẫn thật: >=70% cụm 3 chữ của trích có trong văn bản nguồn (đã bỏ dấu)."""
    w = bo_dau(trich).split()
    if len(w) < 4: return False
    gr = [" ".join(w[i:i + 3]) for i in range(len(w) - 2)]
    src = " " + bo_dau(nguon) + " "
    return sum(1 for g in gr if g in src) / len(gr) >= 0.7

def hau_xu_ly(kq, uv, ids, text_all, h):
    xet = {}
    for x in (kq.get("xet") or []):
        n = nhom_hop_le(x.get("nhom"))
        if n and n in uv: xet[n] = x
    for n in xet:
        x = xet[n]
        x["dieuKhoan"] = [i for i in (x.get("dieuKhoan") or []) if i in ids]  # id bịa thì bỏ
        x["trichDung"] = kiem_trich(x.get("trich") or "", text_all)
    S = [n for n, x in xet.items() if x.get("ketLuan") in ("KHOP", "CHUA_RO")]
    out = {"xet": xet, "S": S, "lyDo": []}
    thieu = [n for n in S if xet[n].get("daCo") is False or bo_dau(xet[n].get("ketLuan")) == "chua ro"]
    if len(S) >= 2 and thieu:
        out["ketQua"] = "PHAN_VAN"; out["lyDo"].append("LUAT_CUNG: >=2 nhóm còn khớp và điểm khác là dữ kiện hồ sơ chưa có")
    elif len(S) >= 2:
        llm_chot = nhom_hop_le(kq.get("nhom")) if kq.get("ketQua") == "CHOT" else None
        if llm_chot in S: out["ketQua"], out["nhom"] = "CHOT", llm_chot; out["lyDo"].append("LLM chốt theo thứ tự quy tắc, mọi dữ kiện đã có")
        else: out["ketQua"] = "PHAN_VAN"; out["lyDo"].append("LLM không chốt được trong khi mọi dữ kiện đã có")
    elif len(S) == 1:
        out["ketQua"], out["nhom"] = "CHOT", S[0]; out["lyDo"].append("chỉ còn một nhóm: QT1")
    else:
        out["ketQua"] = "BE_TAC"; out["lyDo"].append("không nhóm nào khớp trong ứng viên (TIM_SOT)")
    if out["ketQua"] == "CHOT":
        x = xet[out["nhom"]]
        out["quyTac"] = kq.get("quyTac") or "QT1"
        out["dieuKhoanApDung"] = x["dieuKhoan"]
        out["chungMinh"] = bool(x["dieuKhoan"]) or x["trichDung"]
        out["trichDan"] = x.get("trich")
    elif out["ketQua"] == "PHAN_VAN":
        nh, thay = [], set()
        for b in (kq.get("nhanh") or []):
            n = nhom_hop_le(b.get("nhom"))
            if n in S and n not in thay and b.get("neu"):
                nh.append({"neu": b["neu"], "nhom": n, "canCu": [i for i in (b.get("canCu") or []) if i in ids] or xet[n]["dieuKhoan"]}); thay.add(n)
        for n in S:  # bổ sung nhánh còn thiếu từ điều kiện vào nhóm
            if n not in thay and xet[n].get("dieuKienVao"):
                nh.append({"neu": xet[n]["dieuKienVao"], "nhom": n, "canCu": xet[n]["dieuKhoan"]}); thay.add(n)
        out["nhanh"] = nh
        out["dapAnDieuKien"] = "; ".join(f"Nếu {b['neu']} → nhóm {b['nhom']} (căn cứ: {', '.join(b['canCu']) or xet[b['nhom']].get('trich','')[:80]})" for b in nh)
        out["cauHoi"] = kq.get("cauHoi") or " / ".join(xet[n].get("duKienQuyetDinh", "") for n in thieu)
        out["quyTac"] = "QT1(thiếu dữ kiện → hỏi)"
        out["chungMinh"] = len(nh) >= 2 and all(b["canCu"] or xet[b["nhom"]]["trichDung"] for b in nh)
    return out

# ---------------- chạy ----------------
def main():
    bc = {}
    for l in open(P(A.bo_chuan)):
        d = json.loads(l); bc[d["ca"]] = d
    cas = json.load(open(P(A.ca_sai)))
    da = set()
    if os.path.exists(A.ra):
        for l in open(A.ra):
            try: da.add(json.loads(l)["ca"])
            except Exception: pass
    for ca in cas:
        if ca["ca"] in da: continue
        mo = chuan(ca["moTa"]); h = HH.get(mo, {})
        uv, tu = gom_ung_vien(ca, mo, h, bc)
        prompt, ids, text_all = dung_prompt(ca, mo, h, uv, tu)
        kq, luot = None, 0
        try:
            for lan in range(2):
                luot += 1
                p = prompt if lan == 0 else prompt + "\n\nLƯU Ý: lần trả lời trước không phải JSON hợp lệ theo mẫu hoặc thiếu nhóm trong xet. Trả lại ĐÚNG mẫu JSON."
                kq = agy.json_tu_chuoi(agy.goi(p, ca=ca["ca"], vong=A.vong))
                if kq and kq.get("xet"): break
        except agy.QuotaError as e:
            print("DUNG: hết hạn mức LLM mạnh:", e, file=sys.stderr); sys.exit(3)
        kq = kq or {}
        r = hau_xu_ly(kq, uv, ids, text_all, h)
        nhan = ca.get("nhomNhan") or ca.get("nhan")
        out = {"ca": ca["ca"], "moTa": mo, "nhanKetQua": ca.get("nhan"), "nhomNhan": nhan, "ungVien": uv, "luotLlm": luot,
               "nhanDinh": h.get("nhanDinh"), "ketQua": r["ketQua"], "nhom": r.get("nhom"), "quyTac": r.get("quyTac"),
               "dieuKhoanApDung": r.get("dieuKhoanApDung"), "dapAnDieuKien": r.get("dapAnDieuKien"), "nhanh": r.get("nhanh"), "cauHoi": r.get("cauHoi"),
               "chungMinh": r.get("chungMinh"), "trichDan": r.get("trichDan"), "lyDo": r["lyDo"], "llmKetQua": kq.get("ketQua"), "llmNhom": kq.get("nhom"),
               "xet": {n: {k: x.get(k) for k in ("ketLuan", "dieuKhoan", "trich", "trichDung", "dieuKienVao", "duKienQuyetDinh", "daCo")} for n, x in r["xet"].items()}}
        with open(A.ra, "a") as f: f.write(json.dumps(out, ensure_ascii=False) + "\n")
        print(ca["ca"], mo[:40], "->", out["ketQua"], out.get("nhom") or [b["nhom"] for b in (out.get("nhanh") or [])], "nhan", nhan, flush=True)

main()
