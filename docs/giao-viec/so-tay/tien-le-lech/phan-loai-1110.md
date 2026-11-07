# Bảng phân loại 26 PN6 — issue #1110

| PN6 | Mã lỗi | Nguyên nhân | Loại | Có sửa trong spec? |
|---|---|---|---|---|
| 210690 | cong1-khong-phu-kin | tầng không mã chưa số hoá | BỘ MÁY | Không |
| 442199 | cong2-chong-lan + dong-khong-toi | cachDieuKhien BANG_TAY chồng | SPECC | Có |
| 681140 | cong2-dong-khong-toi | tên gạch nối, vector không tới | BỘ MÁY | Không |
| 842199 | cong2-dong-khong-toi | 84219991 không tới | BỘ MÁY | Không |
| 842489 | cong2-dong-khong-toi | 84248940 không tới | BỘ MÁY | Không |
| 844331 | cong2-chong-lan | congNgheIn + mauHienThi chồng | SPECC | Có |
| 848620 | cong2-chong-lan | congDung "lớp phủ nhũ tương" chồng | SPECC | Có |
| 848690 | cong1-khong-phu-kin | congDung quá rộng | SPECC | Có |
| 850432 | cong2-dong-khong-toi | 85043220 không tới | BỘ MÁY | Không |
| 850790 | cong2-dong-khong-toi | 85079093 không tới | BỘ MÁY | Không |
| 870899 | cong2-chong-lan | dungCho bình ắc quy + laBoPhan chồng | SPECC | Có |
| 900659 | cong2-dong-khong-toi | 90065921 không tới | BỘ MÁY | Không |
| 140490 | cong2-chong-lan + truc | congDung công nghệ chồng | SPECC | Có |
| 480255 | cong2-chong-lan | chieuRong 149.99985 (biên số thực) | BỘ MÁY | Không |
| 640391 | cong2-chong-lan | chatLieu gỗ + tenLoai Ủng chồng | SPECC | Có |
| 640399 | cong2-chong-lan | chatLieu gỗ + tenLoai Giày chồng | SPECC | Có |
| 741810 | cong2-chong-lan | dungCho Thiết bị nấu + hoatDong chồng | SPECC | Có |
| 741920 | cong2-chong-lan | dungCho Xích + ganThietBi chồng | SPECC | Có |
| 741980 | cong2-chong-lan | dungTich 299.9997 (biên số thực) | BỘ MÁY | Không |
| 830629 | cong2-chong-lan | niken + kimLoaiCoBanKhac (trục VL) | ĐÃ FIX | PR #1127 |
| 848610 | cong2-chong-lan | congDung cắt bán dẫn chồng | SPECC | Có |
| 854370 | cong2-chong-lan | congDung phiên dịch chồng | SPECC | Có |
| 870895 | cong2-chong-lan | laBoPhan + tenLoai Túi khí chồng | SPECC | Có |
| 984943 | cong2-chong-lan | theTich 299.9997 (biên số thực) | BỘ MÁY | Không |
| 870421 | cong2-chong-lan | daLapRap + kieuXeChoHang (cha-con) | BỘ MÁY | Không |
| 870431 | cong2-chong-lan | daLapRap + kieuXeChoHang (cha-con) | BỘ MÁY | Không |
| 870441 | cong2-chong-lan | daLapRap + kieuXeChoHang (cha-con) | BỘ MÁY | Không |
| 870451 | cong2-chong-lan | daLapRap + kieuXeChoHang (cha-con) | BỘ MÁY | Không |
| 870460 | cong1-khong-phu-kin | khoiLuongToanBo 4999.995 (biên) | BỘ MÁY | Không |
| 870850 | cong2-chong-lan | daLapRap + dungCho 87.03 chồng | BỘ MÁY | Không |
| 902129 | — | trục vật liệu | ĐÃ FIX | PR #1127 |

## Tổng: SPECC 13 · BỘ MÁY 13 · ĐÃ FIX 2

## BỘ MÁY — 4 loại lỗi cần công cụ:
1. **Biên số thực** (5): epsilon ±1e-6 tạo vector rơi cả hai dòng
2. **Tên cha-con** (6): kieuXeChoHang cần tenCuTheHon
3. **Dòng không tới** (7): vector không thoả dòng con
4. **Tầng không mã** (1): 210690
