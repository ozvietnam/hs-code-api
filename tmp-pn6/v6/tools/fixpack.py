#!/usr/bin/env python3
"""fixpack.py <goi.txt> <spec-dir> <kiem.txt> <out.txt> : prompt vòng sửa cho các PN6 đỏ"""
import sys,re,json
goi,specd,kiem,out=sys.argv[1:5]
G=open(goi).read(); secs={re.search(r'PN6 (\d{6})',x).group(1):x for x in re.split(r'(?==== GÓI PN6 )',G.split('\n\n',1)[1]) if x.strip()}
K=open(kiem,errors='replace').read(); blocks=re.split(r'^=== (\d{6})\n',K,flags=re.M)[1:]
parts=[]
for p,b in zip(blocks[::2],blocks[1::2]):
    lines=b.rstrip('\n').split('\n'); seen=set(); keep=[]; cnt={}
    for l in lines:
        s=l.strip()
        if s.startswith('→'):
            if s in seen: continue
            seen.add(s)
        elif s.startswith('!'): continue
        else:
            code=s.split(':')[0]; cnt[code]=cnt.get(code,0)+1
            if cnt[code]>6: continue
        keep.append(l)
    spec=json.dumps(json.load(open(f'{specd}/{p}.json')),ensure_ascii=False,separators=(',',':'))
    parts.append(f'=== SỬA PN6 {p} ===\nLỗi cổng máy (✗) và cách sửa (→):\n'+'\n'.join(keep)+f'\n\nSpec bạn đã trả (sửa trên bản này):\n```json\n{spec}\n```\n\n'+secs[p])
hdr=(f'VÒNG SỬA — {len(parts)} PN6 bị cổng máy chặn ({" ".join(blocks[::2])}). Với MỖI PN6 trả lại MỘT khối ```json spec ranh-gioi-spec@1 HOÀN CHỈNH đã sửa (không trả diff). '
 'Luật sửa: cong0-phan-con-lai-thua ⇒ bỏ "phanConLai": true ở dòng không phải "Loại khác" thật; cong1-khong-phu-kin ⇒ anh em cùng tầng dùng CÙNG khoá, biên khít (<= X và > X); '
 'cong2-chong-lan ⇒ hai dòng cùng thoả: thêm điều kiện phân biệt lấy từ chữ trích (tiêu đề cha có tên ⇒ khai dieuKienNut) hoặc BO_VE có lý do; cong2-chong-lan-truc ⇒ nhánh chia theo tên cạnh nhánh chia theo công dụng: ghi chongLanVanBan với lý do trích chữ hai nhánh; '
 'cong2-dong-khong-toi-duoc ⇒ dòng con không thoả được vì điều kiện tầng cha/anh em quá hẹp; cong3-*-khong-co-trong-trich ⇒ chữ trích phải chứa mẫu đọc của khoá/đơn vị (xem TỪ VỰNG), không thì đổi khoá hoặc THIEU_KHOA_TU_VUNG; '
 'cong3-liet-ke-trong-mot-chuoi ⇒ chuỗi "A, B hoặc C" không được nhét vào MỘT giá trị tenLoai/congDung/dungCho — tách thành nhiều điều kiện hoặc dùng khoá liệt kê; cong5-ve-gioi-han-bi-bo ⇒ mỗi vế in sau mã phải có điều kiện phủ hoặc BO_VE {ma, loai:"BO_VE", ve, lyDo}. '
 'Không giải thích ngoài các khối json.\n\n')
open(out,'w').write(hdr+'\n'.join(parts)); print(out,len(parts),len(hdr)+sum(map(len,parts)))
