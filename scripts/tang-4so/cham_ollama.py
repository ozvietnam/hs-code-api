#!/usr/bin/env python3
"""Người chấm cho so_nhom.py --nao tep: đọc D/hoi/<ca>-<luot>.txt chưa có D/dap/<ca>-<luot>.json, gửi NGUYÊN VĂN prompt cho Ollama
(OLLAMA_URL, mô hình OLLAMA_MODEL mặc định gemma4:31b), ghi câu trả lời vào D/dap. Gọi TUẦN TỰ (máy GPU một hàng đợi).
Cùng một lời dặn, cùng tham số cho mọi lượt (không thêm system prompt riêng cho A hay B).

  OLLAMA_URL=http://<máy-gpu>:11434 python3 cham_ollama.py <thư-mục-D>     # trả lời mọi lượt đang chờ
Thoát 0 nếu không còn lượt chờ, 10 nếu vừa trả lời >= 1 lượt (chạy lại so_nhom), 3 nếu máy GPU lỗi 3 lần liên tiếp."""
import json, os, sys, time, urllib.request

D = sys.argv[1]
URL = os.environ["OLLAMA_URL"].rstrip("/")
MODEL = os.environ.get("OLLAMA_MODEL", "gemma4:31b")
NUM_CTX = int(os.environ.get("OLLAMA_NUM_CTX", "65536"))
NUM_PREDICT = int(os.environ.get("OLLAMA_NUM_PREDICT", "8192"))


def hoi(prompt):
    b = {"model": MODEL, "stream": False, "format": "json", "think": False, "keep_alive": "30m",
         "messages": [{"role": "user", "content": prompt}],
         "options": {"num_ctx": NUM_CTX, "num_predict": NUM_PREDICT, "temperature": 0, "seed": 7}}
    r = json.load(urllib.request.urlopen(urllib.request.Request(URL + "/api/chat", json.dumps(b).encode(), {"Content-Type": "application/json"}), timeout=900))
    return (r.get("message") or {}).get("content") or "", r


def main():
    hd = f"{D}/hoi"
    if not os.path.isdir(hd): return 0
    cho = sorted(f[:-4] for f in os.listdir(hd) if f.endswith(".txt") and not os.path.exists(f"{D}/dap/{f[:-4]}.json"))
    os.makedirs(f"{D}/dap", exist_ok=True)
    loi, xong = 0, 0
    for k in cho:
        prompt = open(f"{hd}/{k}.txt", encoding="utf-8").read()
        t0 = time.time()
        try:
            txt, r = hoi(prompt)
            if not txt.strip(): raise RuntimeError("trả lời rỗng")
        except Exception as e:
            loi += 1
            print(f"LOI {k}: {str(e)[:150]}", flush=True)
            if loi >= 3: return 3
            continue
        loi = 0
        open(f"{D}/dap/{k}.json", "w", encoding="utf-8").write(txt)
        xong += 1
        print(f"{k}: {len(prompt.encode())//1024} KB vào, {r.get('prompt_eval_count')} tok, ra {r.get('eval_count')} tok, {time.time()-t0:.0f}s", flush=True)
    return 10 if xong else 0


sys.exit(main())
