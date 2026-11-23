#!/usr/bin/env python3
"""Hiểu hàng bằng LLM xịn có tra web (Antigravity, Gemini 3.8 Flash). Ra jsonl cùng khoá với hieu-hang.py để bước sau dùng lại.
python3 scripts/tang-4so/hh_agy.py <bo-chuan.jsonl> <ra.jsonl>   (bỏ qua ca đã có trong ra.jsonl)"""
import json, subprocess, sys, os
BC, RA = sys.argv[1], sys.argv[2]
P = ("Mọi hàng hoá mua bán đều trả lời được 4 câu: (1) TỒN TẠI Ở DẠNG VẬT LÝ NÀO (trạng thái rắn/lỏng/khí/bột/nhão; chất liệu; "
     "hình dáng: tấm, ống, dải, sợi, khối, chi tiết, thiết bị hoàn chỉnh, bộ; mức gia công; hoàn chỉnh hay bộ phận/chưa lắp ráp); "
     "(2) DÙNG CHO VIỆC GÌ (chức năng, cơ chế); (3) Ở ĐÂU (môi trường làm việc, lắp trên máy/xe/công trình nào, gia đình hay công nghiệp); "
     "(4) AI DÙNG (người tiêu dùng, trẻ em, phụ nữ, công nhân, y tế, nông nghiệp, quân đội...). "
     "Hãy tìm kiếm web (có model/hãng thì tra model trước) để trả lời 4 câu đó cho món hàng dưới đây, rồi CUỐI CÙNG mới đặt tên đúng bản chất. "
     "KHÔNG nêu mã HS. Chỗ mô tả không cho biết và web không chắc thì ghi vào canXacNhan, không bịa.\n"
     "Trả về JSON thuần: {\"model\": \"model/hãng hoặc null\", \"dangVatLy\": {\"trangThai\": \"\", \"chatLieu\": \"\", \"hinhDang\": \"\", "
     "\"mucGiaCong\": \"\", \"hoanChinh\": \"hoàn chỉnh|bộ phận của ...|chưa lắp ráp|bộ\"}, \"dungChoViecGi\": \"\", \"coChe\": \"\", "
     "\"oDau\": \"\", \"aiDung\": \"\", \"laBoPhanCua\": \"máy chủ hoặc null\", \"tenDung\": \"tên đúng bản chất\", "
     "\"tenKhac\": [\"tên khác, tên tiếng Anh\"], \"banChat\": \"1 câu hàng là gì\", "
     "\"nhanDinh\": \"Em tìm kiếm và nghiên cứu thì nhận định hàng anh/chị đang hỏi là: ...\" (≤80 chữ, nêu đủ dạng vật lý, dùng làm gì, ở đâu, ai dùng), "
     "\"canXacNhan\": [\"điểm chưa chắc cần hỏi khách\"]}. Hàng: \"%s\"")
da = set()
if os.path.exists(RA):
    for l in open(RA):
        try: da.add(json.loads(l)["moTa"])
        except Exception: pass
with open(RA, "a") as ra:
    for l in open(BC):
        mo = json.loads(l)["moTa"].replace("\n", " ").strip()
        if mo in da: continue
        out = {"moTa": mo}
        for model in ("gemini-3.8-flash-low", "gemini-3.8-flash-medium"):
            try:
                r = subprocess.run([os.path.expanduser("~/.local/bin/agy"), "-p", P % mo, "--model", model, "--output-format", "json"],
                                   capture_output=True, text=True, timeout=240)
                d = json.loads(r.stdout); txt = (d.get("response") or "").strip()
                txt = txt[txt.find("{"): txt.rfind("}") + 1]
                out.update(json.loads(txt)); out["llm"] = model; break
            except Exception as e:
                out["loi"] = str(e)[:200]
        ra.write(json.dumps(out, ensure_ascii=False) + "\n"); ra.flush()
