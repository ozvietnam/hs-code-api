#!/usr/bin/env node
// scripts/ho-so-ma/liet-ke.mjs — M-75 (#1967, ADR-0006): Rút & kiểm các vấn đề chỉ liệt kê được (CHI_LIET_KE)
// và ghi BO_QUA có lý do cho mọi câu chứa cụm kích hoạt trên đường đi Chương 76 + Phần XV + GIR 2/3.
//
// Thuần tất định từ data/luat-goc, KHÔNG chứa dữ liệu khách, KHÔNG gọi AI/mạng.
//   node scripts/ho-so-ma/liet-ke.mjs --tao        # dựng/cập nhật data/ho-so-ma/liet-ke/{XV,76}.jsonl
//   node scripts/ho-so-ma/liet-ke.mjs --kiem       # kiểm khuôn, cổng 4/5 phạm vi 76 và độ phủ 100% câu kích hoạt
//   node scripts/ho-so-ma/liet-ke.mjs --bao-cao    # in báo cáo json chi tiết theo nhóm/cụm kích hoạt
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chayCong, giaiPhamVi, napLuatCong } from './cong.mjs';
import { BO_QUA, kiemKhoHoSo } from './khuon.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const sha256 = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');

/** Cụm kích hoạt bắt buộc rà soát cho M-75 trên đường đi Chương 76 (Phần XV + Chương 76 + GIR 2/3). */
export const RE_KICH_HOAT_LIET_KE = /(?:chủ yếu dùng|chủ yếu sử dụng|chủ yếu được dùng|chủ yếu được sử dụng|thích hợp dùng|thích hợp cho|phù hợp dùng|phù hợp để|loại phù hợp để|dùng làm|dùng cho|loại dùng làm|loại dùng để|là loại dùng để|loại sử dụng để|được sử dụng như|dùng trong công nghiệp|đóng gói thành bộ|được sử dụng cùng nhau|sử dụng cùng nhau|chuyên dùng|đặc biệt để|đa chức năng|nhiều chức năng|đặc tính cơ bản|đặc trưng cơ bản|thuộc tính cơ bản|tính chất chủ yếu|bộ hàng được đóng gói để bán lẻ|ở dạng bộ để bán lẻ|chưa hoàn chỉnh|chưa hoàn thiện|chưa lắp ráp|tháo rời|bộ phận có công dụng chung|công dụng chung|bộ phận của|các bộ phận của|phần\s*xvi\b|phần\s*xvii\b|chương\s*84\b|chương\s*85\b|incomplete|unassembled|disassembled|essential character|multi.?function|principally|suitable for)/i;

/** Đặc tả vấn đề CHI_LIET_KE trên đường đi Chương 76 (gồm GIR 2/3 gắn ở phan:XV, Phần XV và các nút Chương 76). */
export const DAC_TA_LIET_KE_76 = Object.freeze([
  // ── Quy tắc tổng quát GIR 2/3 (data/ho-so-ma/liet-ke/gir.jsonl) ────────────────────────────────
  {
    id: 'hs:gir:2:a:7501',
    nut: 'gir:2:a',
    cau: 'gir:2:a#1',
    dieuKien: 'Hàng ở dạng chưa hoàn chỉnh hoặc chưa hoàn thiện: hỏi đã có đặc trưng cơ bản của hàng hóa hoàn chỉnh chưa',
    trich: 'mặt hàng đó ở dạng chưa hoàn chỉnh hoặc chưa hoàn thiện cũng thuộc nhóm đó, nếu đã có đặc trưng cơ bản của hàng hóa đó khi đã hoàn chỉnh hoặc hoàn thiện',
    duKien: ['chưa hoàn chỉnh', 'chưa hoàn thiện', 'đặc trưng cơ bản'],
  },
  {
    id: 'hs:gir:2:a:7502',
    nut: 'gir:2:a',
    cau: 'gir:2:a#2',
    dieuKien: 'Hàng ở dạng chưa lắp ráp hoặc tháo rời: hỏi các chi tiết có đủ đặc trưng cơ bản của hàng hoàn chỉnh để lắp ráp đơn thuần không',
    trich: 'hoặc đã có đặc trưng cơ bản của hàng hóa ở dạng hoàn chỉnh hay hoàn thiện (hoặc được phân loại vào dạng hàng hóa đã hoàn chỉnh hay hoàn thiện theo nội dung Quy tắc này), nhưng chưa lắp ráp hoặc tháo rời',
    duKien: ['đặc trưng cơ bản', 'chưa lắp ráp', 'tháo rời'],
  },
  {
    id: 'hs:gir:2:b:7501',
    nut: 'gir:2:b',
    cau: 'gir:2:b#3',
    den: ['gir:3'],
    dieuKien: 'Hàng làm bằng hai loại nguyên liệu hay hai chất trở lên không đủ phân loại theo Quy tắc 1: chuyển xét theo Quy tắc 3',
    trich: 'Việc phân loại những hàng hóa làm bằng hai loại nguyên liệu hay hai chất trở lên phải tuân theo Quy tắc 3',
    duKien: ['hai loại nguyên liệu'],
  },
  {
    id: 'hs:gir:3:b:7501',
    nut: 'gir:3:b',
    cau: 'gir:3:b#1',
    dieuKien: 'Hàng hỗn hợp, đa cấu thành hoặc hàng ở dạng bộ để bán lẻ: hỏi nguyên liệu hay bộ phận cấu thành nào tạo ra đặc tính cơ bản',
    trich: 'Những hàng hóa hỗn hợp bao gồm nhiều nguyên liệu khác nhau hoặc những hàng hóa được làm từ nhiều bộ phận cấu thành khác nhau, và những hàng hóa ở dạng bộ để bán lẻ, nếu không phân loại được theo Quy tắc 3(a), thì phân loại theo nguyên liệu hoặc bộ phận cấu thành tạo ra đặc tính cơ bản của chúng',
    duKien: ['hỗn hợp', 'bộ phận cấu thành', 'ở dạng bộ để bán lẻ', 'đặc tính cơ bản'],
  },
  {
    id: 'hs:gir:3:c:7501',
    nut: 'gir:3:c',
    cau: 'gir:3:c#1',
    dieuKien: 'Khi không xác định được đặc trưng nhất (3a) lẫn đặc tính cơ bản (3b): xếp vào nhóm cuối cùng theo thứ tự đánh số',
    trich: 'Khi hàng hóa không thể phân loại theo Quy tắc 3 (a) hoặc 3(b) nêu trên thì phân loại vào nhóm cuối cùng theo thứ tự đánh số trong số các nhóm tương đương được xem xét',
    duKien: ['nhóm cuối cùng theo thứ tự đánh số'],
  },
  {
    id: 'hs:phan:XV:7508',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:2:a#1',
    den: ['bieu:9021'],
    dieuKien: '[Bộ phận công dụng chung vs 90.21] Hỏi vật kẹp/vít/tán/lò xo kim loại có thiết kế đặc biệt để chuyên dùng cấy ghép y tế, phẫu thuật, nha khoa, thú y (90.21) không',
    trich: 'trừ các sản phẩm được thiết kế đặc biệt để chuyên dùng cấy ghép trong y tế, phẫu thuật, nha khoa hoặc thú y (nhóm 90.21)',
    duKien: ['thiết kế đặc biệt', 'chuyên dùng', 'y tế'],
  },
  {
    id: 'hs:phan:XV:7513',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:2:b#1',
    den: ['bieu:9114'],
    dieuKien: 'Hỏi lò xo hoặc lá lò xo kim loại cơ bản có phải dây cót dùng cho đồng hồ cá nhân hoặc đồng hồ thời gian khác (nhóm 91.14) không',
    trich: 'trừ dây cót dùng cho đồng hồ cá nhân hoặc đồng hồ thời gian khác (nhóm 91.14)',
    duKien: ['dùng cho đồng hồ cá nhân'],
  },
  {
    id: 'hs:phan:XV:7509',
    nut: 'phan:XV',
    cau: 'phan:XV:cg:2:ket#1',
    den: ['phan:XVI', 'phan:XVII'],
    dieuKien: '[Bộ phận có công dụng chung] Hỏi bộ phận trình bày riêng lẻ là bộ phận công dụng chung (Chú giải 2 Phần XV) hay bộ phận chuyên biệt của hàng hóa',
    trich: 'các bộ phận của hàng hóa thuộc các chương này không bao gồm các bộ phận có công dụng chung như đã nêu ở trên',
    duKien: ['bộ phận của hàng hóa', 'các bộ phận có công dụng chung'],
  },
  {
    id: 'hs:phan:XV:7510',
    nut: 'phan:XV',
    cau: 'phan:XV:kq:18#2',
    dieuKien: '[Hỗn hợp kim loại – phi kim] Khi sản phẩm gồm kim loại cơ bản và phi kim loại: hỏi kim loại cơ bản có tạo tính chất chủ yếu (đặc tính cơ bản) cho sản phẩm không',
    trich: 'được áp dụng đối với các sản phẩm được làm một phần từ phi kim loại với điều kiện là theo Qui tắc Chú giải tổng quát, kim loại cơ bản tạo cho các sản phẩm tính chất chủ yếu của chúng',
    duKien: ['phi kim loại', 'kim loại cơ bản', 'tính chất chủ yếu'],
  },
  {
    id: 'hs:phan:XV:7511',
    nut: 'phan:XV',
    cau: 'phan:XV:kq:24#1',
    dieuKien: '[Bộ phận trình bày riêng lẻ] Hỏi mặt hàng có được xác định là bộ phận của một sản phẩm cụ thể thuộc Phần XV/XVI/XVII và không thuộc nhóm riêng hay không',
    trich: 'Nói chung, bộ phận của các sản phẩm xác định được thì phân loại như bộ phận đó theo các nhóm thích hợp của chúng trong danh mục',
    duKien: ['bộ phận của các sản phẩm xác định được'],
  },
  {
    id: 'hs:phan:XV:7512',
    nut: 'phan:XV',
    cau: 'phan:XV:kq:25#1',
    den: ['phan:XVI', 'phan:XVII'],
    dieuKien: '[Bộ phận công dụng chung trình bày riêng] Nếu là vít/bu lông/lò xo/khóa công dụng chung trình bày riêng thì phân loại vào Phần XV, không ghép theo máy/xe',
    trich: 'những bộ phận có công dụng chung (được định nghĩa tại Chú giải 2 Phần này) được trình bày riêng lẻ không được xem xét như là bộ phận của những sản phẩm nhưng vẫn được phân loại vào các nhóm phù hợp trong Phần này',
    duKien: ['bộ phận có công dụng chung', 'trình bày riêng lẻ'],
  },

  // ── Chương 76 (chuong:76 & bieu:76* → data/ho-so-ma/liet-ke/76.jsonl) ─────────────────────────
  {
    id: 'hs:bieu:7601:7501',
    nut: 'bieu:7601',
    cau: 'nhom:7601:ct:2#1',
    dieuKien: '[Chủ yếu dùng cho luyện kim] Với viên nhôm thuộc 76.01: hỏi viên nhôm có chủ yếu được dùng trong ngành luyện kim làm tác nhân khử ôxy hóa không',
    trich: 'viên nhôm, chủ yếu được dùng trong ngành luyện kim (đóng vai trò như tác nhân khử ôxy hóa, đặc biệt trong sản xuất sắt hoặc thép)',
    duKien: ['chủ yếu được dùng', 'luyện kim'],
  },
  {
    id: 'hs:bieu:76042110:7501',
    nut: 'bieu:76042110',
    cau: 'bieu:76042110#1',
    dieuKien: '[Phù hợp để làm…] Hỏi dạng hình rỗng hợp kim nhôm có được tạo dáng/quy cách phù hợp để làm dàn lạnh máy điều hòa không khí cho xe có động cơ không',
    trich: 'Loại phù hợp để làm dàn lạnh của máy điều hòa không khí cho xe có động cơ',
    duKien: ['Loại phù hợp để làm', 'dàn lạnh của máy điều hòa không khí', 'xe có động cơ'],
  },
  {
    id: 'hs:bieu:7607:7501',
    nut: 'bieu:7607',
    cau: 'nhom:7607:ct:6#1',
    den: ['bieu:4811'],
    dieuKien: '[Thuộc tính cơ bản vật liệu ghép] Giấy/bìa lót lá nhôm đựng đồ uống/thực phẩm: hỏi vật liệu có giữ lại thuộc tính cơ bản của giấy và bìa (về 48.11) hay của lá nhôm (76.07)',
    trich: 'Giấy và bìa dùng để sản xuất bao bì đựng sữa, nước ép hoa quả, các sản phẩm thực phẩm khác và được lót với lá nhôm (ví dụ, ở mặt lớp lót trong của bao bì) với điều kiện vật liệu này vẫn giữ lại thuộc tính cơ bản của giấy và bìa (nhóm 48.11)',
    duKien: ['thuộc tính cơ bản của giấy và bìa'],
  },
  {
    id: 'hs:bieu:7608:7501',
    nut: 'bieu:7608',
    cau: 'nhom:7608:ct:14#1',
    den: ['bieu:7610', 'phan:XVI', 'phan:XVII'],
    dieuKien: '[Bộ phận máy/xe Phần XVI & XVII vs kết cấu 76.10] Hỏi ống nhôm đã uốn/khoan/nối thành sản phẩm đặc trưng làm kết cấu (76.10) hay bộ phận của máy (Phần XVI) / phương tiện (Phần XVII)',
    trich: 'Các ống và ống nối làm thành các sản phẩm đặc trưng, như các sản phẩm được dùng trong các kết cấu (nhóm 76.10) các bộ phận của máy móc hoặc của phương tiện giao thông (các Phần XVI và XVII)',
    duKien: ['sản phẩm đặc trưng', 'bộ phận của máy móc', 'Phần XVI', 'XVII'],
  },
  {
    id: 'hs:bieu:7609:7501',
    nut: 'bieu:7609',
    cau: 'nhom:7609:ct:3#1',
    den: ['bieu:7610'],
    dieuKien: '[Chuyên dùng lắp kết cấu] Hỏi kẹp và phụ kiện ghép nối ống có được thiết kế chuyên dùng cho lắp ráp các kết cấu (76.10) thay vì ống dẫn thông thường (76.09) không',
    trich: 'Kẹp và các dụng cụ khác được thiết kế chuyên dùng cho các bộ phận lắp ráp của các kết cấu (nhóm 76.10)',
    duKien: ['được thiết kế chuyên dùng', 'bộ phận lắp ráp'],
  },
  {
    id: 'hs:bieu:7610:7501',
    nut: 'bieu:7610',
    cau: 'bieu:7610#1',
    dieuKien: '[Bộ phận kết cấu] Hỏi tấm/thanh/dạng hình/ống nhôm có đã được gia công định hình để sử dụng làm kết cấu hoặc bộ phận của kết cấu thuộc 76.10 không',
    trich: 'Các kết cấu bằng nhôm (trừ nhà lắp ghép thuộc nhóm 94.06) và các bộ phận của các kết cấu bằng nhôm',
    duKien: ['bộ phận của các kết cấu'],
  },
  {
    id: 'hs:bieu:7610:7502',
    nut: 'bieu:7610',
    cau: 'nhom:7610:ct:5#1',
    den: ['phan:XVI', 'phan:XVII'],
    dieuKien: '[Bộ phận Chương 84–88] Hỏi các bộ phận lắp ráp bằng nhôm có được xác định là bộ phận của máy móc/phương tiện thuộc Chương 84 đến 88 (loại khỏi 76.10) không',
    trich: 'Các bộ phận lắp ráp được xác định như các bộ phận của sản phẩm của Chương 84 tới 88',
    duKien: ['bộ phận lắp ráp', 'Chương 84'],
  },
  {
    id: 'hs:bieu:7611:7501',
    nut: 'bieu:7611',
    cau: 'nhom:7611:ct:3#1',
    den: ['bieu:8609'],
    dieuKien: '[Thiết kế đặc biệt để chuyên chở] Hỏi bể chứa > 300 lít có được thiết kế đặc biệt và trang bị để chuyên chở đa phương thức (nhóm 86.09) không',
    trich: 'không bao gồm các thùng đựng hàng được thiết kế đặc biệt và trang bị để chuyên chở bởi một hoặc nhiều phương thức vận chuyển (nhóm 86.09)',
    duKien: ['thiết kế đặc biệt'],
  },
  {
    id: 'hs:bieu:7612:7501',
    nut: 'bieu:7612',
    cau: 'nhom:7612:ct:6#1',
    den: ['bieu:7616'],
    dieuKien: '[Dùng cho cá nhân hoặc chuyên dụng] Hỏi hộp đựng bằng nhôm là hộp chứa công nghiệp/đóng gói (76.12) hay hộp đựng thuốc lá/phấn/dụng cụ dùng cho cá nhân hoặc chuyên dụng (76.16)',
    trich: 'Hộp đựng thuốc lá, hộp đựng bột, hộp dụng cụ và các đồ chứa tương tự dùng cho cá nhân hoặc chuyên dụng (nhóm 76.16)',
    duKien: ['dùng cho cá nhân hoặc chuyên dụng'],
  },
  {
    id: 'hs:bieu:76129010:7501',
    nut: 'bieu:76129010',
    cau: 'bieu:76129010#1',
    dieuKien: '[Phù hợp dùng đựng sữa tươi] Hỏi đồ chứa đúc liền bằng nhôm (<= 300 lít) có cấu tạo, độ bền và nắp đậy phù hợp dùng để đựng và vận chuyển sữa tươi không',
    trich: 'Đồ chứa được đúc liền phù hợp dùng để đựng sữa tươi',
    duKien: ['được đúc liền', 'phù hợp dùng để đựng sữa tươi'],
  },
  {
    id: 'hs:bieu:76129010:7502',
    nut: 'bieu:76129010',
    cau: 'sen:76129010:1#4',
    dieuKien: '[SEN 7612.90.10] Hỏi đồ chứa đựng sữa tươi bằng nhôm có độ cứng và chiều dày thân phù hợp để chịu va đập khi vận chuyển không',
    trich: 'Đồ chứa có độ cứng và chiều dày thân phù hợp để có thể chịu được va đập khi vận chuyển',
    duKien: ['độ cứng', 'chiều dày thân phù hợp'],
  },
  {
    id: 'hs:bieu:7615:7501',
    nut: 'bieu:7615',
    cau: 'bieu:7615#1',
    dieuKien: '[Bộ phận đồ gia dụng/vệ sinh] Hỏi hàng rời là bộ phận chuyên biệt của bộ đồ ăn/nhà bếp/gia dụng/vệ sinh bằng nhôm (76.15) và không phải bộ phận công dụng chung (Chú giải 2 Phần XV)',
    trich: 'Bộ đồ ăn, đồ nhà bếp hoặc các loại đồ gia dụng khác và các bộ phận của chúng, bằng nhôm',
    duKien: ['bộ phận của chúng'],
  },
  {
    id: 'hs:bieu:761510:7501',
    nut: 'bieu:761510',
    cau: 'bieu:761510#1',
    dieuKien: '[Bộ phận đồ ăn/nhà bếp/gia dụng] Hỏi chi tiết rời có xác định là bộ phận của bộ đồ ăn, đồ nhà bếp hoặc đồ gia dụng khác bằng nhôm (7615.10) không',
    trich: 'Bộ đồ ăn, đồ nhà bếp hoặc các đồ gia dụng khác và các bộ phận của chúng',
    duKien: ['bộ phận của chúng'],
  },
  {
    id: 'hs:bieu:761520:7501',
    nut: 'bieu:761520',
    cau: 'bieu:761520#1',
    dieuKien: '[Bộ phận đồ trang bị vệ sinh] Hỏi chi tiết rời có xác định là bộ phận của đồ trang bị trong nhà vệ sinh bằng nhôm (7615.20) không',
    trich: 'Đồ trang bị trong nhà vệ sinh và bộ phận của chúng',
    duKien: ['bộ phận của chúng'],
  },
  {
    id: 'hs:bieu:7616:7501',
    nut: 'bieu:7616',
    cau: 'nhom:7616:ct:5#1',
    dieuKien: '[Bộ phận của xích] Hỏi chi tiết rời bằng nhôm có phải bộ phận của xích bằng nhôm thuộc 76.16 (và không thuộc bộ phận công dụng chung loại trừ) không',
    trich: 'Xích và các bộ phận của xích làm bằng nhôm',
    duKien: ['bộ phận của xích'],
  },
  {
    id: 'hs:bieu:7616:7502',
    nut: 'bieu:7616',
    cau: 'nhom:7616:ct:10#1',
    den: ['chuong:84', 'chuong:85'],
    dieuKien: '[Bộ phận máy Chương 84/85] Hỏi phên/lưới/vải kim loại nhôm còn ở dạng cuộn/tấm hay đã tạo dáng thành bộ phận của máy móc/thiết bị thuộc Chương 84 hoặc 85',
    trich: 'Vải kim loại,..., đã được tạo dáng thành các bộ phận của máy (ví dụ: bằng việc lắp ráp với các vật liệu khác) Chương 84 hoặc 85)',
    duKien: ['bộ phận của máy', 'Chương 84'],
  },
  {
    id: 'hs:bieu:76169920:7501',
    nut: 'bieu:76169920',
    cau: 'bieu:76169920#1',
    dieuKien: '[Loại phù hợp dùng để…] Hỏi ống/vòng nhôm bịt đầu có kích thước, hình dáng phù hợp dùng để lắp giữ tẩy trong sản xuất bút chì (7616.99.20) không',
    trich: 'Nhôm bịt đầu ống loại phù hợp dùng để sản xuất bút chì',
    duKien: ['loại phù hợp dùng để sản xuất bút chì'],
  },
  {
    id: 'hs:bieu:76042930:7501',
    nut: 'bieu:76042930',
    cau: 'bieu:76042930#1',
    dieuKien: 'Hỏi dạng hình chữ Y bằng nhôm dạng cuộn có dùng cho dây khóa kéo (7604.29.30) không',
    trich: 'Dạng hình chữ Y dùng cho dây khóa kéo, ở dạng cuộn',
    duKien: ['dùng cho dây khóa kéo'],
  },
  {
    id: 'hs:bieu:76109030:7501',
    nut: 'bieu:76109030',
    cau: 'bieu:76109030#1',
    dieuKien: 'Hỏi mái phao trong hoặc mái phao ngoài bằng nhôm có dùng cho bể chứa xăng dầu (7610.90.30) không',
    trich: 'Mái phao trong hoặc mái phao ngoài dùng cho bể chứa xăng dầu',
    duKien: ['dùng cho bể chứa xăng dầu'],
  },
  {
    id: 'hs:bieu:76169940:7501',
    nut: 'bieu:76169940',
    cau: 'bieu:76169940#1',
    dieuKien: 'Hỏi ống chỉ, lõi suốt, guồng quay tơ và sản phẩm tương tự bằng nhôm có dùng cho sợi dệt (7616.99.40) không',
    trich: 'Ống chỉ, lõi suốt, guồng quay tơ và sản phẩm tương tự dùng cho sợi dệt',
    duKien: ['dùng cho sợi dệt'],
  },
]);

/**
 * Các câu có chứa cụm kích hoạt trên đường đi Chương 76 (nut chủ != CHUNG)
 * nhưng KHÔNG tạo câu hỏi CHI_LIET_KE riêng (tiêu đề, mô tả chất liệu/từ điển, câu đã được đặt ở nút/câu cha).
 */
export const DAC_TA_BO_QUA_LIET_KE_76 = Object.freeze([
  { cau: 'chuong:76:kq:2#2', lyDo: 'Mô tả nguồn gốc điều chế nhôm từ bô-xít, không đặt câu hỏi phân loại mở khi đối chiếu hàng hóa' },
  { cau: 'nhom:7610:ct:2#1', lyDo: 'Mô tả vật liệu gắn kết phụ trợ của bộ phận kết cấu đã nằm ở bieu:7610#1 (hs:bieu:7610:7501)' },
  { cau: 'nhom:7612:ct:2#1', lyDo: 'Nêu công dụng phổ biến minh họa của thùng phuy nhôm, không phải điều kiện ranh giới bắt buộc' },
  { cau: 'nhom:7615:ct:8#1', lyDo: 'Mục loại trừ thiết bị điện gia dụng Chương 85 (85.09/85.16), thuộc cạnh loại trừ nhóm 76.15' },
  { cau: 'phan:XV:cg:1:c#1', lyDo: 'Loại trừ hẳn hàng đã là mũ/vật đội đầu hoặc bộ phận mũ sang 65.06–65.07, xử lý bằng cạnh loại trừ' },
  { cau: 'phan:XV:cg:1:f#1', lyDo: 'Loại trừ sản phẩm Phần XVI — thuộc vấn đề KHONG_DUOC_LA (M-72), không lặp lại thành CHI_LIET_KE' },
  { cau: 'phan:XV:cg:1:g#1', lyDo: 'Loại trừ sản phẩm Phần XVII / 86.08 — thuộc vấn đề KHONG_DUOC_LA (M-72), không lặp lại thành CHI_LIET_KE' },
  { cau: 'phan:XV:cg:2#1', lyDo: 'Câu dẫn định nghĩa "các bộ phận có công dụng chung" (quy tắc chính nằm ở cg:2:a và cg:2:ket)' },
  { cau: 'phan:XV:cg:5:c#1', lyDo: 'Định nghĩa thuật ngữ hợp kim (gồm hỗn hợp thiêu kết/nung chảy/liên kim), không phải câu hỏi GIR 3 mở' },
  { cau: 'phan:XV:cg:7#1', lyDo: 'Quy tắc cân khối lượng kim loại cơ bản có hàm lượng trội hơn trong hỗn hợp, thuộc định lượng/so trọng lượng' },
  { cau: 'phan:XV:kq:13#1', lyDo: 'Mục liệt kê giải thích Chú giải 5(c) về hỗn hợp đã thiêu kết, lặp lại phần đã định nghĩa ở cg:5:c' },
  { cau: 'phan:XV:kq:14#1', lyDo: 'Giải thích hỗn hợp thiêu kết và nung chảy được coi như hợp kim theo Chú giải 5(c), không là câu hỏi mở' },
  { cau: 'phan:XV:kq:14#2', lyDo: 'Ví dụ minh họa thỏi nung chảy từ kim loại vụn, không phải điều kiện xét công dụng/đặc tính cơ bản' },
  { cau: 'phan:XV:kq:15#1', lyDo: 'Câu dẫn chiếu sang Chú giải 7 Phần XV về hỗn hợp bột không thiêu kết, không tự đặt thêm câu hỏi mới' },
  { cau: 'phan:XV:kq:23#1', lyDo: 'Tiêu đề mục (C) BỘ PHẬN CỦA CÁC SẢN PHẨM trong Chú giải tổng quát Phần XV' },
  { cau: 'phan:XV:kq:25#4', lyDo: 'Ví dụ minh họa vòng đệm 73.20 vs 87.08 cho nguyên tắc bộ phận có công dụng chung (đã ghi ở kq:25#1)' },
  { cau: 'phan:XV:kq:35#1', lyDo: 'Mục loại trừ cụ thể bộ phận giày dép sang nhóm 64.06 theo Chú giải 2 Chương 64' },
  { cau: 'sen:76042110:1#1', lyDo: 'Câu mở đầu SEN 7604.21.10 lặp lại tên dòng biểu thuế đã được ghi ở hs:bieu:76042110:7501' },
  { cau: 'sen:76061232:1#2', lyDo: 'Mô tả nguyên tố hợp kim chủ yếu (Mn/Mg) trong lá làm lon, kiểm định theo thành phần hợp kim' },
  { cau: 'sen:76061232:1#4', lyDo: 'Mô tả thông lệ nguyên tố hợp kim chủ yếu (Mn) ở thân lon 7606.12.32, không đặt câu hỏi mở' },
  { cau: 'sen:76061232:1#5', lyDo: 'Mô tả thông lệ nguyên tố hợp kim chủ yếu (Mg) ở đáy/nắp lon 7606.12.32, không đặt câu hỏi mở' },
  { cau: 'sen:76129010:1#1', lyDo: 'Câu mở đầu SEN 7612.90.10 lặp tên dòng biểu thuế đã được ghi ở hs:bieu:76129010:7501' },
  { cau: 'sen:76169920:1#1', lyDo: 'Giải thích SEN 7616.99.20 cho nút đã được ghi ở hs:bieu:76169920:7501' },
  { cau: 'chuong:76:kq:4#2', lyDo: 'Mô tả quy trình điện phân sản xuất nhôm nguyên thủy bằng điện cực than, không đặt tiêu chí phân loại hàng hóa' },
  { cau: 'nhom:7602:ct:2#2', lyDo: 'Câu mô tả công dụng thường gặp trong luyện kim, nhóm 76.02 không đặt điều kiện công dụng' },
  { cau: 'nhom:7604:ct:3#1', lyDo: 'Mục loại trừ thanh và dạng hình kết cấu sang nhóm 76.10 (đã ghi ở hs:bieu:7610:7501)' },
  { cau: 'nhom:7612:ct:2#3', lyDo: 'Ví dụ minh họa đồ chứa hình ống (tân dược, kem đánh răng), không phải điều kiện ranh giới bắt buộc' },
  { cau: 'nhom:7616:ct:9#1', lyDo: 'Mục loại trừ vải dệt thoi từ sợi kim loại trang trí nội thất sang nhóm 58.09' },
  { cau: 'sen:76109030:1#1', lyDo: 'Giải thích SEN 7610.90.30 cho nút đã được ghi ở hs:bieu:76109030:7501' },
]);

const chuanKhoang = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Nút con bieu:* có tên trùng nguyên văn với bất kỳ tổ tiên bieu:* nào ⇒ không sinh vấn đề lặp tầng. */
export function laNutConTrungTenToTien(nut, L) {
  if (!nut || !nut.startsWith('bieu:')) return false;
  const own = chuanKhoang(L.chuCau(`${nut}#1`) || '');
  if (!own) return false;
  let par = L.cay.theoId.get(nut)?.cha;
  while (par && par.startsWith('bieu:')) {
    if (chuanKhoang(L.chuCau(`${par}#1`) || '') === own) return true;
    par = L.cay.theoId.get(par)?.cha;
  }
  return false;
}

/** Kiểm phát hiện bản ghi đặt ở nút con trùng nguyên văn tên tổ tiên (trừ BO_QUA). */
export function kiemTrungTenToTien(banGhi, L) {
  const loi = [];
  for (const r of banGhi || []) {
    if (!r || r.loai === BO_QUA) continue;
    if (r.cau === `${r.nut}#1` && laNutConTrungTenToTien(r.nut, L)) {
      loi.push(`${r.id}: nút con ${r.nut} trùng nguyên văn tên tổ tiên — bỏ qua để ở tổ tiên cao nhất`);
    }
  }
  return loi;
}

/** Quét mọi câu trên đường đi phạm vi 76 (cùng phan:XV và chuong:76) khớp RE_KICH_HOAT_LIET_KE. */
export function quetCauKichHoat(L, phamVi = '76') {
  const pv = giaiPhamVi(phamVi, L);
  const N = new Set([...pv.duoi, ...pv.tren]);
  const ketQua = [];
  for (const cid of [...L.cau.keys()].sort()) {
    if (/^wco:/.test(cid)) continue; // ADR-0006: hồ sơ vấn đề chỉ rút từ luật, không đưa ý kiến WCO vào hồ sơ
    const chu0 = G.chuCuaCau(cid);
    if (!chu0 || !N.has(chu0)) continue; // CHUNG (gir:*) nằm ở liet-ke/gir.jsonl
    if (cid === `${chu0}#1` && laNutConTrungTenToTien(chu0, L)) continue;
    const txt = chuanKhoang(L.chuCau(cid) || '');
    if (RE_KICH_HOAT_LIET_KE.test(txt)) {
      ketQua.push({ cau: cid, chu0, txt });
    }
  }
  return ketQua;
}

/** Dựng toàn bộ bản ghi CHI_LIET_KE và BO_QUA theo đúng khuôn ho-so-ma@1. */
export function dungBanGhiLietKe({ luat = G.LUAT_MAC_DINH } = {}) {
  const L = napLuatCong(luat);
  const theoTep = new Map();
  const loi = [];

  const them = (rel, obj) => {
    if (!theoTep.has(rel)) theoTep.set(rel, []);
    theoTep.get(rel).push(obj);
  };

  for (const d of DAC_TA_LIET_KE_76) {
    const chu = L.chuCau(d.cau);
    if (chu === null) {
      loi.push(`${d.id}: không tìm thấy câu ${d.cau}`);
      continue;
    }
    const nNguon = L.nut.get(L.cau.get(d.cau).nut);
    const key = G.tepCuaNut(d.nut, 'liet-ke');
    if (!key) {
      loi.push(`${d.id}: nút ${d.nut} không thuộc thư mục liet-ke/`);
      continue;
    }
    them(`liet-ke/${key}.jsonl`, {
      id: d.id,
      nut: d.nut,
      loai: 'CHI_LIET_KE',
      dieuKien: d.dieuKien,
      trich: d.trich,
      cau: d.cau,
      ...(d.den ? { den: [...d.den] } : {}),
      duKien: [...d.duKien],
      lop: nNguon.lop,
      nguon: nNguon.nguon,
      van: sha256(chu),
      trangThai: 'KHOP',
    });
  }

  let seqBoQua = 7550;
  for (const b of DAC_TA_BO_QUA_LIET_KE_76) {
    const chu = L.chuCau(b.cau);
    if (chu === null) {
      loi.push(`BO_QUA ${b.cau}: không tìm thấy câu`);
      continue;
    }
    const nut = G.chuCuaCau(b.cau);
    const key = nut ? G.tepCuaNut(nut, 'liet-ke') : null;
    if (!key) {
      loi.push(`BO_QUA ${b.cau}: không ánh xạ được nút tệp liet-ke/ (${nut})`);
      continue;
    }
    seqBoQua += 1;
    them(`liet-ke/${key}.jsonl`, {
      id: `hs:${nut}:${seqBoQua}`,
      nut,
      loai: BO_QUA,
      cau: b.cau,
      lyDo: b.lyDo,
      van: sha256(chu),
    });
  }

  return { L, theoTep, loi };
}

/** Ghi data/ho-so-ma/liet-ke/{XV,76}.jsonl. */
export function ghiKhoLietKe({ luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH } = {}) {
  const { L, theoTep, loi } = dungBanGhiLietKe({ luat });
  if (loi.length) throw new Error(`Lỗi dựng kho liet-ke:\n${loi.join('\n')}`);
  const outDir = path.join(hoSo, 'liet-ke');
  fs.mkdirSync(outDir, { recursive: true });
  const daGhi = [];
  for (const [rel, list] of [...theoTep.entries()].sort()) {
    fs.writeFileSync(path.join(hoSo, rel), `${list.map((x) => JSON.stringify(x)).join('\n')}\n`, 'utf8');
    daGhi.push({ rel, soBanGhi: list.length });
  }
  return { L, daGhi };
}

/** Kiểm độ phủ: 100% câu kích hoạt trên đường đi Chương 76 phải có CHI_LIET_KE hoặc BO_QUA. */
export function kiemPhuLietKe(banGhi, L, phamVi = '76') {
  const dsKichHoat = quetCauKichHoat(L, phamVi);
  const coCau = new Set(banGhi.filter((x) => x.loai === 'CHI_LIET_KE' || x.loai === BO_QUA).map((x) => x.cau));
  const thieu = [];
  for (const it of dsKichHoat) {
    if (!coCau.has(it.cau)) thieu.push(it);
  }
  return { tongCauKichHoat: dsKichHoat.length, daPhu: dsKichHoat.length - thieu.length, thieu };
}

function main() {
  const argv = process.argv.slice(2);
  const idx = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const luat = path.resolve(idx('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(idx('--ho-so') || G.HO_SO_MAC_DINH);

  if (argv.includes('--tao')) {
    const { L, daGhi } = ghiKhoLietKe({ luat, hoSo });
    const kho = kiemKhoHoSo(hoSo);
    const phu = kiemPhuLietKe(kho.banGhi, L, '76');
    console.log('Đã tạo kho M-75:', JSON.stringify({ daGhi, khuonLoi: kho.loi.length, ...phu }));
    if (kho.loi.length || phu.thieu.length) process.exit(1);
    return;
  }

  if (argv.includes('--bao-cao')) {
    const L = napLuatCong(luat);
    const kho = kiemKhoHoSo(hoSo);
    const phu = kiemPhuLietKe(kho.banGhi, L, '76');
    const chiLietKe = kho.banGhi.filter((x) => x.loai === 'CHI_LIET_KE');
    const boQua = kho.banGhi.filter((x) => x.loai === BO_QUA);
    console.log(JSON.stringify({
      chiLietKe: chiLietKe.length,
      boQua: boQua.length,
      phu,
      phanBoNut: chiLietKe.map((x) => ({ id: x.id, nut: x.nut, cau: x.cau, dieuKien: x.dieuKien })),
    }, null, 2));
    return;
  }

  const L = napLuatCong(luat);
  const kho = kiemKhoHoSo(hoSo);
  const rCong45 = chayCong({ luat, hoSo, phamVi: ['76'], cong: [4, 5], L });
  const phu = kiemPhuLietKe(kho.banGhi, L, '76');

  let coLoi = 0;
  console.log(`${kho.loi.length ? 'FAIL' : 'PASS'} khuôn M-75: ${kho.banGhi.length} bản ghi, ${kho.loi.length} lỗi`);
  for (const l of kho.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  for (const k of [4, 5]) {
    const c = rCong45.cong[k];
    console.log(`${c.loi.length ? 'FAIL' : 'PASS'} cổng ${k} ${c.ten} (phạm vi 76): ${c.soKiem} mục kiểm, ${c.loi.length} lỗi`);
    for (const l of c.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  }
  console.log(`${phu.thieu.length ? 'FAIL' : 'PASS'} độ phủ câu kích hoạt Chương 76: ${phu.daPhu}/${phu.tongCauKichHoat}, thiếu ${phu.thieu.length}`);
  for (const t of phu.thieu) { console.log(`  ✗ ${t.cau} (${t.chu0}): ${t.txt}`); coLoi = 1; }
  process.exit(coLoi);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
