"""Gọi LLM mạnh qua Antigravity (gói thuê bao, có hạn mức). Mỗi lượt ghi vào docs/tang-4so/agy-luot.jsonl.
Gặp lỗi hạn mức thì ném QuotaError: người gọi phải dừng, KHÔNG chuyển sang khoá khác."""
import json, os, subprocess, time

AGY = os.path.expanduser("~/.local/bin/agy")
MODEL = "gemini-3.8-flash-medium"
NHAT_KY = os.environ.get("AGY_LUOT", os.path.join(os.path.dirname(__file__), "..", "..", "docs", "tang-4so", "agy-luot.jsonl"))
DAU_HIEU_HAN_MUC = ("quota", "rate limit", "rate_limit", "resource_exhausted", "429", "exhausted", "usage limit")


class QuotaError(RuntimeError):
    pass


def goi(prompt, ca=None, vong=None, timeout=900):
    t0 = time.time()
    try:
        r = subprocess.run([AGY, "-p", prompt, "--model", MODEL, "--output-format", "json"],
                           capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as e:  # prompt quá dài cho argv, hoặc quá giờ: không tính là hạn mức
        with open(NHAT_KY, "a") as f:
            f.write(json.dumps({"ca": ca, "vong": vong, "model": MODEL, "ok": False, "loi": str(e)[:100], "quota": False}, ensure_ascii=False) + "\n")
        return None
    raw = (r.stdout or "") + "\n" + (r.stderr or "")
    ok, resp, loi, bi_chan, status = False, "", None, False, None
    try:
        d = json.loads(r.stdout)
        resp = d.get("response") or ""
        status = d.get("status")
        bi_chan = bool(d.get("denied_actions"))  # mô hình đòi chạy lệnh/công cụ nhưng bị chặn -> trả rỗng
        ok = status == "SUCCESS" and bool(resp.strip())
        if not ok: loi = f"status={status} bi_chan={bi_chan}"
    except Exception as e:
        loi = f"khong-doc-duoc-json: {e}"
    # Hạn mức: chỉ khi lượt KHÔNG thành công và lỗi nằm ở stderr/trạng thái, không dò trong nội dung trả lời
    ngoai = ((r.stderr or "") + " " + str(status if status != "SUCCESS" else "")).lower()
    quota = (not ok) and (not bi_chan) and any(k in ngoai for k in DAU_HIEU_HAN_MUC)
    with open(NHAT_KY, "a") as f:
        f.write(json.dumps({"ca": ca, "vong": vong, "model": MODEL, "ok": ok, "giay": round(time.time() - t0, 1),
                            "loi": loi, "quota": quota, "biChan": bi_chan}, ensure_ascii=False) + "\n")
    if quota:
        raise QuotaError(raw[:300])
    return resp if ok else None


def json_tu_chuoi(txt):
    if not txt: return None
    a, b = txt.find("{"), txt.rfind("}")
    if a < 0 or b <= a: return None
    try: return json.loads(txt[a:b + 1])
    except Exception: return None
