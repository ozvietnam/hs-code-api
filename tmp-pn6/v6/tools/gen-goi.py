#!/usr/bin/env python3
"""gen-goi.py <ten-goi> <pn6,...>  → goi/<ten-goi>.txt  (chạy trong thư mục repo)"""
import subprocess,sys,re
name,pn6s=sys.argv[1],sys.argv[2].split(',')
parts=[]
for p in pn6s:
    g=subprocess.run(['node','scripts/so-hoa-ranh-gioi.mjs','--goi',f'--pn6={p}'],capture_output=True,text=True).stdout
    g=re.sub(r'\nLuật:\n(?:  \*.*\n)+','\n',g)
    g=re.sub(r'\nTừ vựng tu-vung@2[^\n]*\n(?:  .*\n?)+','\n',g)
    parts.append(f'=== GÓI PN6 {p} ===\n{g.strip()}\n')
hdr=(f'Số hoá ranh giới cho {len(pn6s)} phân nhóm 6 số ({" ".join(pn6s)}). Với MỖI PN6 trả về MỘT khối ```json riêng là spec ranh-gioi-spec@1 '
 '(khung ở mục CÁCH VIẾT SPEC), "phien": "https://claude.ai/code/session_01Ce55326chdksgQLsfyrNDS#soan-<pn6>". '
 'Dòng/tiêu đề "Loại khác" trần: KHÔNG đưa vào spec, không ghi DE_TRONG. Mỗi vế GIỚI HẠN/MỞ in trong gói phải có điều kiện phủ tới, '
 'hoặc BO_VE có lý do thật, hoặc THIEU_KHOA_TU_VUNG (+khoaDeXuat). Anh em cùng tầng dùng cùng khoá. Mỗi quyết định một ghiChuSoan QUYET_DINH trích chữ. '
 'Bộ TỪ VỰNG trong system instructions là bản 192 khoá mới nhất: tra kỹ trước khi kết luận thiếu khoá. '
 'Không bỏ sót PN6 nào; nếu sắp hết chỗ đầu ra thì ghi cuối cùng một dòng "CHUA_SOAN: <các pn6>" để được yêu cầu "tiếp". Không giải thích ngoài các khối json.\n\n')
open(f'/home/claude/working/pn6/goi/{name}.txt','w').write(hdr+'\n'.join(parts))
print(name,len(pn6s),len(hdr)+sum(len(x) for x in parts))
