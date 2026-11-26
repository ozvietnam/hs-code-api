#!/usr/bin/env node
// scripts/ho-so-ma/liet-ke-rut.mjs — M-75 (#1967, ADR-0006): Rút & kiểm các vấn đề chỉ liệt kê được (CHI_LIET_KE)
// và ghi BO_QUA có lý do cho 100% câu chứa cụm kích hoạt theo chương (không ghép GIR, không wco:, dieuKien không có nhãn [...]).
//
// Thuần tất định từ data/luat-goc, KHÔNG chứa dữ liệu khách/tiền lệ/WCO, KHÔNG gọi AI/mạng.
//   node scripts/ho-so-ma/liet-ke-rut.mjs --chuong 84 --tao
//   node scripts/ho-so-ma/liet-ke-rut.mjs --chuong 84 --kiem
//   node scripts/ho-so-ma/liet-ke-rut.mjs --chuong 84 --bao-cao
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
const chuanKhoang = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Cụm kích hoạt bắt buộc rà soát cho M-75 (cùng biểu thức kiểm độ phủ). */
export const RE_KICH_HOAT_LIET_KE = /(?:chủ yếu dùng|chủ yếu sử dụng|chủ yếu được dùng|chủ yếu được sử dụng|thích hợp dùng|phù hợp dùng|phù hợp để|loại phù hợp để|chuyên dùng|đặc biệt để|đa chức năng|nhiều chức năng|đặc tính cơ bản|đặc trưng cơ bản|thuộc tính cơ bản|tính chất chủ yếu|bộ hàng được đóng gói để bán lẻ|ở dạng bộ để bán lẻ|chưa hoàn chỉnh|chưa hoàn thiện|chưa lắp ráp|tháo rời|bộ phận có công dụng chung|công dụng chung|bộ phận của|các bộ phận của|phần\s*xvi\b|phần\s*xvii\b|chương\s*84\b|chương\s*85\b|incomplete|unassembled|disassembled|essential character|multi.?function|principally|suitable for)/i;

const RE_CU_THE_DU_KIEN = /(?:chỉ sử dụng hoặc chủ yếu sử dụng|chỉ dùng hoặc chủ yếu dùng|chủ yếu được sử dụng|chủ yếu được dùng|chủ yếu sử dụng|chủ yếu dùng|phù hợp để chỉ sử dụng|phù hợp để chỉ dùng|phù hợp dùng để|loại phù hợp dùng|phù hợp dùng|thích hợp dùng|thiết kế chuyên dùng|chuyên dùng|đặc biệt để|đa chức năng|nhiều chức năng|đặc tính cơ bản|đặc trưng cơ bản|thuộc tính cơ bản|tính chất chủ yếu|chưa hoàn chỉnh|chưa hoàn thiện|chưa lắp ráp|tháo rời|bộ phận có công dụng chung|công dụng chung|các bộ phận của|bộ phận của|công dụng chính|chức năng chính|tổ hợp máy|máy liên hợp|khối chức năng|Quy tắc 3\(c\)|Quy tắc 3c)/gi;

/** Trích mọi cụm từ kích hoạt có thật từ nguyên văn câu `chu` làm duKien. */
function rutDuKienTuCau(chu) {
  const ds = [];
  const seen = new Set();
  RE_CU_THE_DU_KIEN.lastIndex = 0;
  let m;
  while ((m = RE_CU_THE_DU_KIEN.exec(chu)) !== null) {
    const val = chuanKhoang(m[0]);
    const k = val.toLowerCase();
    if (val.length >= 4 && !seen.has(k)) {
      seen.add(k);
      ds.push(val);
    }
    if (ds.length >= 4) break;
  }
  if (!ds.length) {
    const m2 = RE_KICH_HOAT_LIET_KE.exec(chu);
    if (m2) ds.push(chuanKhoang(m2[0]));
  }
  return ds;
}

/** Suy nút đích `den` hợp lệ từ danh sách cạnh của câu hoặc đề cập nhóm/phần trong câu. */
function timDenHopLe(cauId, chu0, L) {
  const out = [];
  const seen = new Set();
  const add = (id) => {
    if (!id || id === chu0 || seen.has(id) || !L.nut.has(id)) return;
    if (/^(?:phan:[IVX]+|chuong:\d{2}(?::pc:[IVX]+)?|bieu:\d{2,8}(?::td\d+)*)$/.test(id)) {
      seen.add(id);
      out.push(id);
    }
  };
  for (const e of L.canhTheoTu.get(cauId) || []) add(e.den);
  const txt = L.chuCau(cauId) || '';
  for (const m of txt.matchAll(/nhóm\s+(\d{2})\.(\d{2})/gi)) add(`bieu:${m[1]}${m[2]}`);
  for (const m of txt.matchAll(/chương\s+(84|85|69|70|82|87|90|95|96)/gi)) add(`chuong:${m[1]}`);
  if (/Phần\s+XVI\b/i.test(txt)) add('phan:XVI');
  if (/Phần\s+XVII\b/i.test(txt)) add('phan:XVII');
  if (/Phần\s+XV\b/i.test(txt)) add('phan:XV');
  return out;
}

/** Đặc tả riêng các câu cốt lõi ở Phần XVI, Chương 84 và SEN 84 (dieuKien không có nhãn [...] đầu câu). */
const DAC_TA_RIENG_C84 = {
  // Phần XVI
  'phan:XVI:cg:2:a#1': 'Hỏi bộ phận máy trình bày riêng lẻ đã được chi tiết định danh tại một nhóm cụ thể của Chương 84 hoặc 85 (ngoài các nhóm bộ phận dùng chung) hay chưa',
  'phan:XVI:cg:2:b#1': 'Hỏi bộ phận chưa được định danh riêng có phù hợp để chỉ sử dụng hoặc chủ yếu sử dụng cho một loại máy cụ thể hay một số loại máy cùng nhóm không',
  'phan:XVI:cg:2:b#2': 'Hỏi bộ phận có phù hợp để chủ yếu sử dụng cho các hàng hóa thuộc cả nhóm 85.17 và các nhóm từ 85.25 đến 85.28 để xếp vào nhóm 85.17 không',
  'phan:XVI:cg:2:b#3': 'Hỏi bộ phận có phù hợp để chỉ sử dụng hoặc chủ yếu sử dụng cho hàng hóa thuộc nhóm 85.24 để xếp vào nhóm 85.29 không',
  'phan:XVI:cg:3#1': 'Với máy liên hợp hoặc máy được thiết kế để thực hiện hai hoặc nhiều chức năng khác nhau hay bổ trợ lẫn nhau: hỏi bộ phận chính hoặc máy thực hiện chức năng chính là gì',
  'phan:XVI:cg:4#1': 'Với tổ hợp máy gồm các bộ phận cấu thành riêng lẻ kết nối với nhau: hỏi các bộ phận có cùng thực hiện một chức năng xác định rõ thuộc một nhóm của Chương 84 hoặc 85 không',
  'phan:XVI:kq:24#1': 'Hỏi bộ phận trình bày riêng có phù hợp chỉ để sử dụng hoặc chủ yếu sử dụng cho một loại máy hoặc một nhóm máy thuộc Phần XVI (trừ phần bị loại trừ tại Phần I) không',
  'phan:XVI:kq:35#2': 'Hỏi bộ phận đã thuộc nhóm bộ phận cụ thể theo định danh ngay cả khi được thiết kế đặc biệt cho một loại máy khác hay không',
  'phan:XVI:kq:56#1': 'Hỏi bộ phận nhận biết được của máy nhưng không phù hợp để chỉ dùng hoặc chủ yếu dùng cho một máy cụ thể (có thể dùng chung nhiều máy thuộc các nhóm khác nhau) để xếp vào 84.87 hoặc 85.48',
  'phan:XVI:kq:64#1': 'Với máy móc hoặc thiết bị ở dạng chưa hoàn chỉnh thuộc Phần XVI: hỏi mức độ lắp ráp các bộ phận đã có đặc trưng cơ bản của chiếc máy hoàn chỉnh chưa',
  'phan:XVI:kq:67#2': 'Với hàng hóa là tập hợp bộ phận tháo rời để tiện vận chuyển thuộc Phần XVI: hỏi bộ phận tháo rời có tương ứng máy hoàn chỉnh đang xét không',
  'phan:XVI:kq:67#3': 'Với máy móc chưa hoàn chỉnh trình bày ở trạng thái tháo rời: hỏi tập hợp chi tiết đã mang đặc tính của máy hoàn chỉnh chưa',
  'phan:XVI:kq:67#4': 'Hỏi lô bộ phận tháo rời có số lượng vượt quá mức cần thiết của một máy hoàn chỉnh hay máy chưa hoàn chỉnh mang đặc trưng cơ bản không (phần dư xếp nhóm riêng)',
  'phan:XVI:kq:70#1': 'Với máy đa chức năng thuộc Phần XVI: hỏi chức năng nào là chức năng chính của máy để phân loại theo chức năng chính',
  'phan:XVI:kq:73#1': 'Với máy tổ hợp gồm hai hoặc nhiều máy/thiết bị lắp ghép để thực hiện liên tục hoặc đồng thời các chức năng bổ sung: hỏi chức năng chính của tổ hợp là gì',
  'phan:XVI:kq:78#1': 'Hỏi các máy có chỉ gắn trên nền, bệ bê tông, tường hay vách ngăn thiết kế đặc biệt nhưng không tạo thành đế chung liên kết tổ hợp máy không',
  'phan:XVI:kq:83#1': 'Hỏi nhiều bộ phận riêng biệt có dự kiến được sử dụng để cùng nhau thực hiện một chức năng xác định cụ thể tại một nhóm thuộc Chương 84 hoặc 85 theo Chú giải 4 Phần XVI không',
  'phan:XVI:kq:99#1': 'Hỏi các bộ phận không cùng thực hiện một chức năng xác định theo Chú giải 4 Phần XVI thuộc nhóm riêng phù hợp nào',

  // Chương 84
  'chuong:84:cg:2#1': 'Hỏi máy thỏa mãn đồng thời mô tả của một nhóm thuộc 84.01–84.24 (hoặc 84.86) và nhóm thuộc 84.25–84.80 để ưu tiên phân loại vào nhóm 84.01–84.24 hoặc 84.86 không',
  'chuong:84:cg:6:C#1': 'Hỏi thiết bị trình bày kèm hoặc riêng có thỏa mãn đầy đủ các điều kiện để được xem là khối chức năng của hệ thống xử lý dữ liệu tự động (84.71) không',
  'chuong:84:cg:6:C:i#1': 'Hỏi khối chức năng có phải loại chỉ sử dụng hoặc chủ yếu sử dụng trong hệ thống xử lý dữ liệu tự động không',
  'chuong:84:cg:8#2': 'Với máy đa chức năng thuộc Chương 84 mà công dụng chính không mô tả ở nhóm nào hoặc không có công dụng nào là chủ yếu: hỏi có xếp vào nhóm 84.79 không',
  'chuong:84:cg:11:C#1': 'Hỏi máy móc hoặc thiết bị có chỉ sử dụng hoặc chủ yếu sử dụng cho các công đoạn sản xuất thiết bị bán dẫn/mạch tích hợp/màn hình dẹt nêu tại Chú giải 11(C) (nhóm 84.86) không',
  'chuong:84:kq:20#1': 'Hỏi máy, thiết bị có thành phần gốm sứ/thủy tinh đã được xem là không còn mang tính chất của sản phẩm gốm sứ hoặc thủy tinh (để thuộc Chương 84) chưa',
  'chuong:84:kq:34#6': 'Hỏi bộ phận điện nêu tại các nhóm Chương 85 đã được lắp ráp gắn liền với bộ phận khác của máy Chương 84 hay vẫn trình bày ở dạng riêng biệt (thiết kế chuyên dùng vẫn giữ Chương 85)',
  'chuong:84:kq:37#1': 'Hỏi bộ phận không bị loại trừ và không định danh ở nhóm riêng có được thiết kế để chỉ dùng hoặc chủ yếu dùng với một máy cụ thể thuộc Chương 84 không',
  'chuong:84:kq:56#1': 'Với máy thuộc hai nhóm trở lên không nằm trong 84.01–84.24: hỏi nhóm nào mô tả cụ thể nhất hoặc máy có chức năng sử dụng chính là gì',
  'chuong:84:kq:56#2': 'Hỏi máy đa chức năng có các chức năng sử dụng đồng đều trong nhiều ngành công nghiệp khác nhau (như máy dập khoen) để xếp vào nhóm 84.79 không',
  'chuong:84:kq:62#1': 'Hỏi máy hoạt động kết hợp máy xử lý dữ liệu tự động 84.71 thực hiện chức năng cụ thể tách biệt hay cùng thực hiện một chức năng xác định theo Chú giải 4 Phần XVI',

  // SEN 84
  'sen:84145910:1#1': 'Hỏi quạt 8414.59.10 có phải loại chỉ sử dụng hoặc chủ yếu sử dụng để làm mát bộ vi xử lý, thiết bị viễn thông hoặc hệ thống xử lý dữ liệu tự động 84.71 không',
  'sen:84239030:1#2': 'Với bộ phận dùng chung giữa cân xe có động cơ và các loại cân điện tử khác khi không xác định được mục đích sử dụng cụ thể: áp dụng Quy tắc 3(c) để xếp vào nhóm cuối cùng theo thứ tự đánh số',
  'sen:84513010:1#4': 'Hỏi máy ép/là 8451.30.10 có được thiết kế đặc biệt để sử dụng trong nhà (gia đình) theo SEN không',
};

/** Các câu ghi BO_QUA có lý do rõ ràng thay vì CHI_LIET_KE. */
const DAC_TA_BO_QUA_RIENG_C84 = {
  'phan:XVI#1': 'Tiêu đề Phần XVI chỉ dùng để tra cứu (Quy tắc 1), không tạo câu hỏi mở',
  'chuong:84#1': 'Tiêu đề Chương 84 chỉ dùng để tra cứu (Quy tắc 1), không tạo câu hỏi mở',
  'bieu:84#1': 'Tên Chương 84 trong biểu thuế, trùng tiêu đề Chương 84',
  'phan:XVI:cg:1:g#1': 'Mục loại trừ đích danh bộ phận có công dụng chung sang Phần XV / Chương 39 (thuộc cạnh KHONG_DUOC_LA)',
  'phan:XVI:cg:1:l#1': 'Mục loại trừ đích danh sản phẩm Phần XVII (thuộc cạnh KHONG_DUOC_LA)',
  'phan:XVI:cg:1:o#1': 'Mục loại trừ đích danh dụng cụ 82.07 / bàn chải 96.03 (thuộc cạnh KHONG_DUOC_LA)',
  'phan:XVI:cg:2#1': 'Câu dẫn mở đầu Chú giải 2 Phần XVI (quy tắc chi tiết nằm ở cg:2:a và cg:2:b)',
  'phan:XVI:cg:5#1': 'Định nghĩa thuật ngữ "máy" trong Phần XVI (DINH_NGHIA), không phải câu hỏi lựa chọn mở',
  'phan:XVI:kq:5#1': 'Liệt kê giải thích Chú giải 1(g) về bộ phận có công dụng chung bị loại trừ sang Phần XV/83',
  'phan:XVI:kq:8#1': 'Mục loại trừ đích danh sản phẩm Phần XVII',
  'phan:XVI:kq:11#1': 'Mục loại trừ máy móc đồ chơi/thể thao sang Chương 95 (thuộc KHONG_DUOC_LA)',
  'phan:XVI:kq:12#1': 'Mục loại trừ đích danh chổi 96.03 làm bộ phận máy',
  'phan:XVI:kq:18#1': 'Dẫn chiếu mục loại trừ hàng gốm sứ Chương 69',
  'phan:XVI:kq:19#1': 'Dẫn chiếu mục loại trừ sản phẩm thủy tinh Chương 70',
  'phan:XVI:kq:2#1': 'Câu tổng quan phạm vi Phần XVI, không đặt câu hỏi phân loại mở riêng',
  'phan:XVI:kq:26#1': 'Mục liệt kê cố định trong Chú giải tổng quát: bộ phận 84.07/84.08 về 84.09',
  'phan:XVI:kq:27#1': 'Mục liệt kê cố định: bộ phận 84.25–84.30 về 84.31',
  'phan:XVI:kq:28#1': 'Mục liệt kê cố định: bộ phận 84.44–84.47 về 84.48',
  'phan:XVI:kq:29#1': 'Mục liệt kê cố định: bộ phận 84.56–84.65 về 84.66',
  'phan:XVI:kq:30#1': 'Mục liệt kê cố định: bộ phận 84.70–84.72 về 84.73',
  'phan:XVI:kq:31#1': 'Mục liệt kê cố định: bộ phận 85.01–85.02 về 85.03',
  'phan:XVI:kq:32#1': 'Mục liệt kê cố định: bộ phận 85.19/85.21 về 85.22',
  'phan:XVI:kq:33#1': 'Mục liệt kê cố định: bộ phận 85.25–85.28 về 85.29',
  'phan:XVI:kq:34#1': 'Mục liệt kê cố định: bộ phận 85.35–85.37 về 85.38',
  'phan:XVI:kq:57#1': 'Mục ngoại lệ cố định cho các nhóm dây/cách điện 84.84, 85.44–85.47',
  'phan:XVI:kq:62#1': 'Tiêu đề mục (IV) MÁY MÓC CHƯA HOÀN CHỈNH',
  'phan:XVI:kq:65#1': 'Tiêu đề mục (V) MÁY MÓC ĐƯỢC THÁO RỜI',
  'phan:XVI:kq:67#1': 'Câu giải thích bối cảnh vận chuyển tháo rời, quy tắc chính nằm ở kq:67#2',
  'phan:XVI:kq:68#1': 'Tiêu đề mục (VI) MÁY ĐA CHỨC NĂNG VÀ CÁC MÁY TỔ HỢP',
  'phan:XVI:kq:71#1': 'Ví dụ minh họa máy công cụ dùng dao cụ hoán đổi cho kq:70#1',
  'phan:XVI:kq:72#2': 'Ví dụ minh họa nhóm máy đa chức năng bổ trợ từ 84.25 đến 84.72',
  'phan:XVI:kq:79#1': 'Lưu ý trường hợp máy tổ hợp đã định danh thẳng vào 1 nhóm (ví dụ 84.15)',
  'phan:XVI:kq:80#1': 'Dẫn chiếu sang Chú giải 8 Chương 84 về máy đa chức năng sử dụng nhiều vật liệu',
  'phan:XVI:kq:101#1': 'Dẫn chiếu sang Chú giải Phần XVII cho máy tự hành/di động',
  'phan:XVI:kq:106#1': 'Giải thích thuật ngữ "mục đích ban đầu" trong Chú giải 6 Phần XVI',
  'chuong:84:cg:10#2': 'Quy tắc ưu tiên đích danh 84.85 theo Chú giải 1 Phần XVI (thuộc PHAI_LA/KHONG_DUOC_LA)',
  'chuong:84:cg:11:A#1': 'Dẫn chiếu định nghĩa "thiết bị bán dẫn" từ Chú giải 9 Chương 85',
  'chuong:84:cg:11:D#1': 'Quy tắc ưu tiên đích danh 84.86 theo Chú giải 1 Phần XVI',
  'chuong:84:cg:1:c#2': 'Mục loại trừ đích danh máy/bộ phận bằng thủy tinh sang 70.19/70.20',
  'chuong:84:cg:1:g#1': 'Mục loại trừ đích danh bộ tản nhiệt Phần XVII',
  'chuong:84:cgpn:2#1': 'Định nghĩa "hệ thống" của 8471.49 (phụ thuộc điều kiện tại Chú giải 6(C) đã tách riêng)',
  'chuong:84:kq:3#1': 'Câu dẫn mở đầu phạm vi Chương 84',
  'chuong:84:kq:7#2': 'Mục liệt kê lại loại trừ hàng thủy tinh 70.19/70.20',
  'chuong:84:kq:10#1': 'Mục liệt kê lại loại trừ bộ tản nhiệt Phần XVII',
  'chuong:84:kq:12#1': 'Câu khái quát phân công cơ khí (Ch.84) vs điện (Ch.85)',
  'chuong:84:kq:12#2': 'Giải thích minh họa ranh giới Ch.84 vs Ch.85',
  'chuong:84:kq:13#1': 'Câu dẫn liệt kê ví dụ máy Chương 84 chạy điện',
  'chuong:84:kq:18#1': 'Câu dẫn nguyên tắc hàng gốm sứ/thủy tinh trước tiêu chí xét tính chất tại kq:20#1',
  'chuong:84:kq:29#1': 'Câu mô tả tổng quan bộ phận công dụng chung 84.81–84.84',
  'chuong:84:kq:30#1': 'Câu dẫn mô tả tổng quan 84.86 (quy tắc chính nằm ở cg:11:C#1)',
  'chuong:84:kq:33#1': 'Dẫn chiếu xem Khái quát chung Phần XVI về bộ phận',
  'chuong:84:kq:34#1': 'Danh sách ví dụ linh kiện điện riêng biệt Chương 85 (85.01, 85.04, 85.35...)',
  'chuong:84:kq:40#1': 'Lặp lại quy tắc ưu tiên 84.86 đã ghi ở cg:11:C#1',
  'chuong:84:kq:55#2': 'Dẫn chiếu chung tới Chú giải 3 và 4 Phần XVI',
  'chuong:84:kq:59#1': 'Câu dẫn vào Chú giải 6(E) trước nội dung xét tại kq:62#1',
  'sen:84239030:1#1': 'Danh mục ví dụ minh họa bộ phận cân điện tử của SEN 8423.90.30, phần quy tắc 3(c) nằm ở sen:84239030:1#2',
};

/** Sinh câu hỏi CHI_LIET_KE tự nhiên (KHÔNG có nhãn [...]) cho dòng biểu thuế `bieu:84*`. */
function sinhCauHoiBieu(cauId, txt) {
  const ma = cauId.split('#')[0].slice(5);
  const fullClean = txt.replace(/^(?:-\s*)+/, '').replace(/\s*\(SEN\)\s*$/i, '').trim();
  const clean = fullClean.length > 130 ? `${fullClean.slice(0, 125).replace(/\s+\S*$/, '')}…` : fullClean;
  if (/đa chức năng|nhiều chức năng|kết hợp hai hoặc nhiều chức năng/i.test(clean)) {
    return `Với mặt hàng thuộc mã ${ma}: hỏi thiết bị có kết hợp hai hoặc nhiều chức năng hay thực hiện chức năng chính nào theo nội dung "${clean}"`;
  }
  if (/chỉ\s+(?:được\s+)?(?:sử dụng|dùng)\s+hoặc\s+chủ yếu/i.test(clean) || /chủ yếu\s+(?:sử dụng|dùng)/i.test(clean)) {
    return `Hỏi hàng hóa tại mã ${ma} có phải loại chỉ dùng hoặc chủ yếu dùng đúng công dụng mô tả trong dòng (${clean}) không`;
  }
  if (/phù hợp\s+(?:để\s+)?(?:chỉ\s+)?(?:dùng|sử dụng)/i.test(clean) || /thích hợp dùng/i.test(clean)) {
    return `Hỏi đặc điểm kỹ thuật và công năng của hàng hóa tại mã ${ma} có phù hợp để sử dụng đúng mục đích nêu tại dòng (${clean}) không`;
  }
  if (/chuyên dùng/i.test(clean)) {
    return `Hỏi hàng hóa tại mã ${ma} có được thiết kế chuyên dùng theo tiêu chí của dòng (${clean}) hay không`;
  }
  return `Hỏi hàng hóa tại mã ${ma} có phải bộ phận đặc trưng thuộc nhóm máy tương ứng (không thuộc bộ phận công dụng chung Phần XV hay nhóm bộ phận khác) theo "${clean}" không`;
}

/** Phân loại tự động nhưng tất định một câu `nhom:84*` khớp RE_KICH_HOAT_LIET_KE thành CHI_LIET_KE hoặc BO_QUA. */
function phanLoaiCauNhom(cauId, chu0, txt, L) {
  const s = chuanKhoang(txt);
  const coCanNhac = /(?:chỉ\s+(?:được\s+)?(?:sử dụng|dùng)\s+hoặc\s+chủ yếu|chủ yếu\s+(?:sử dụng|dùng)|phù hợp\s+(?:để\s+)?(?:chỉ\s+)?(?:dùng|sử dụng)|thích hợp dùng|thiết kế\s+(?:đặc biệt|chuyên dùng)|chuyên dùng|đặc tính cơ bản|đặc trưng cơ bản|thuộc tính cơ bản|tính chất chủ yếu|đa chức năng|nhiều chức năng|chức năng chính|công dụng chính)/i.test(s);

  // 1. Tiêu đề viết hoa toàn phần hoặc mục đề mục hoặc câu dẫn kết thúc bằng ":"
  if (!/[a-zà-ỹ]/.test(s) || (/^(?:\([A-Z0-9IVX]+\)|(?:PHẦN|CHƯƠNG|MỤC)\b)/i.test(s) && s.length < 70)) {
    return { boQua: true, lyDo: 'Tiêu đề mục trong chú giải chi tiết nhóm, không đặt câu hỏi mở' };
  }
  if (/(?:ngoại trừ|không được coi là (?:các )?bộ phận[^:]*|không bao gồm|loại trừ)\s*:\s*$/i.test(s) && !coCanNhac) {
    return { boQua: true, lyDo: 'Câu dẫn mở đầu danh sách loại trừ (kết thúc bằng dấu hai chấm), không tạo câu hỏi mở' };
  }

  // 2. Loại trừ đích danh (M-72 KHONG_DUOC_LA) khi KHÔNG kèm điều kiện cân nhắc
  const coLoaiSangKhop = (L.canhTheoTu.get(cauId) || []).some((e) => e.loai === 'LOAI_SANG' && e.trangThai === 'KHOP');
  const laLoaiTruMuc = /^(?:\([a-z0-9ivx]+\)\s*)?(?:Nhóm này\s+(?:cũng\s+)?(?:không\s+bao\s+gồm|loại\s+trừ)|Trừ\s|Tuy nhiên,?\s+nhóm này không bao gồm)/i.test(s)
    || /^\([a-z0-9ivx]+\)\s+.*?\((?:các\s+nhóm|nhóm|Chương|Phần)\b/i.test(s)
    || /(?:thì bị loại trừ|bị loại trừ khỏi nhóm|không được coi là (?:các )?bộ phận.*?(?:Phần XV|nhóm|Chương)|bộ phận(?:\s+khác)?\s+có công dụng chung.*?(?:Phần XV|Chú giải 2 Phần XV))/i.test(s)
    || /^(?:Các\s+bộ phận\s+.*?\s+bị loại trừ|không bao gồm\b)/i.test(s);
  if ((coLoaiSangKhop || laLoaiTruMuc) && !coCanNhac) {
    return { boQua: true, lyDo: 'Mục loại trừ / chuyển đích danh sang nhóm khác thuộc cạnh KHONG_DUOC_LA (M-72)' };
  }
  if (/^(?:Ví dụ|Một vài ví dụ|Chẳng hạn)/i.test(s)) {
    return { boQua: true, lyDo: 'Ví dụ minh họa cho quy tắc ở câu trước, không tạo câu hỏi mở riêng' };
  }
  if (/^(?:Xem thêm|Theo các quy tắc chung|Các quy tắc của Chú giải|Những quy tắc)/i.test(s) && !coCanNhac) {
    return { boQua: true, lyDo: 'Câu dẫn chiếu sang Chú giải Phần XVI / Chương 84 đã tách vấn đề ở nút cha' };
  }
  if (/bằng gốm sứ.*?\(Chương 69\)|bằng thủy tinh.*?\(nhóm 70\./i.test(s)) {
    return { boQua: true, lyDo: 'Quy tắc gốm sứ/thủy tinh Chương 69/70 đã xử lý theo loại trừ vật liệu và Chú giải Chương 84' };
  }

  // 3. Tạo câu hỏi CHI_LIET_KE không có nhãn [...]
  const nhomSo = chu0.slice(5);
  let dieuKien;
  if (/đặc tính cơ bản|đặc trưng cơ bản|tính chất chủ yếu|thuộc tính cơ bản/i.test(s)) {
    dieuKien = `Với hàng hóa thuộc hoặc liên quan nhóm ${nhomSo}: hỏi bộ phận/thành phần nào tạo nên đặc tính cơ bản để quyết định nhóm phân loại theo chú giải`;
  } else if (/đa chức năng|nhiều chức năng|hai hoặc nhiều chức năng/i.test(s)) {
    dieuKien = `Với máy thuộc nhóm ${nhomSo}: hỏi máy thực hiện nhiều chức năng đồng thời hay liên tiếp và chức năng nào là chức năng chính quyết định nhóm phân loại`;
  } else if (/chưa hoàn chỉnh|chưa hoàn thiện|chưa lắp ráp|tháo rời/i.test(s)) {
    dieuKien = `Với hàng hóa thuộc nhóm ${nhomSo} ở trạng thái chưa hoàn chỉnh hoặc tháo rời: hỏi chi tiết hiện có đã mang đặc trưng cơ bản của máy hoàn chỉnh chưa`;
  } else if (/chỉ dùng hoặc chủ yếu|chỉ sử dụng hoặc chủ yếu|chủ yếu dùng|chủ yếu sử dụng|phù hợp để|phù hợp dùng|thích hợp dùng/i.test(s)) {
    dieuKien = `Hỏi hàng hóa tại nhóm ${nhomSo} có công dụng chủ yếu hoặc thiết kế phù hợp cho máy/lĩnh vực được nêu trong chú giải để phân định đúng nhóm hay không`;
  } else if (/chuyên dùng|đặc biệt để/i.test(s)) {
    dieuKien = `Hỏi sản phẩm tại nhóm ${nhomSo} có được thiết kế chuyên dùng đặc biệt cho máy/cụm thiết bị nêu trong chú giải thay vì công dụng thông thường không`;
  } else {
    dieuKien = `Hỏi quy chế phân loại bộ phận của nhóm ${nhomSo} theo chú giải: là bộ phận đặc trưng đi theo máy cụ thể hay bộ phận công dụng chung/nhóm riêng`;
  }
  return { boQua: false, dieuKien };
}

/** Quét mọi câu khớp RE_KICH_HOAT_LIET_KE trên đường đi Chương ch2 (LOẠI BỎ wco:, tb:, gir: theo lệnh QT). */
export function quetCauKichHoatChuong(L, chuong) {
  const ch2 = String(chuong).padStart(2, '0');
  const pv = giaiPhamVi(ch2, L);
  const N = new Set([...pv.duoi, ...pv.tren]);
  const ketQua = [];
  for (const cid of [...L.cau.keys()].sort()) {
    if (/^(?:wco|tb|gir):/.test(cid)) continue;
    const chu0 = G.chuCuaCau(cid);
    if (!chu0 || !N.has(chu0)) continue;
    const txt = chuanKhoang(L.chuCau(cid) || '');
    if (RE_KICH_HOAT_LIET_KE.test(txt)) {
      ketQua.push({ cau: cid, chu0, kho: cid.split(':')[0], txt });
    }
  }
  return ketQua;
}

/** Dựng toàn bộ bản ghi CHI_LIET_KE và BO_QUA cho Chương ch2. */
export function dungBanGhiLietKeChuong(chuong, { luat = G.LUAT_MAC_DINH } = {}) {
  const ch2 = String(chuong).padStart(2, '0');
  const L = napLuatCong(luat);
  const hits = quetCauKichHoatChuong(L, ch2);
  const theoTep = new Map();
  const loi = [];
  const seqNut = new Map();

  const them = (rel, obj) => {
    if (!theoTep.has(rel)) theoTep.set(rel, []);
    theoTep.get(rel).push(obj);
  };
  const nextId = (nut) => {
    const k = (seqNut.get(nut) || 0) + 1;
    seqNut.set(nut, k);
    return `hs:${nut}:${8500 + k}`;
  };

  for (const h of hits) {
    const { cau, chu0, kho, txt } = h;
    const chuRaw = L.chuCau(cau);
    const nNguon = L.nut.get(L.cau.get(cau).nut);
    const key = G.tepCuaNut(chu0, 'liet-ke');
    if (!key) {
      loi.push(`${cau}: nút ${chu0} không ánh xạ được tệp liet-ke/`);
      continue;
    }
    const rel = `liet-ke/${key}.jsonl`;

    if (DAC_TA_BO_QUA_RIENG_C84[cau]) {
      them(rel, {
        id: nextId(chu0),
        nut: chu0,
        loai: BO_QUA,
        cau,
        lyDo: DAC_TA_BO_QUA_RIENG_C84[cau],
        van: sha256(chuRaw),
      });
      continue;
    }

    if (DAC_TA_RIENG_C84[cau]) {
      const den = timDenHopLe(cau, chu0, L);
      them(rel, {
        id: nextId(chu0),
        nut: chu0,
        loai: 'CHI_LIET_KE',
        dieuKien: DAC_TA_RIENG_C84[cau],
        trich: chuRaw,
        cau,
        ...(den.length ? { den } : {}),
        duKien: rutDuKienTuCau(chuRaw),
        lop: nNguon.lop,
        nguon: nNguon.nguon,
        van: sha256(chuRaw),
        trangThai: 'KHOP',
      });
      continue;
    }

    if (kho === 'bieu') {
      const dieuKien = sinhCauHoiBieu(cau, txt);
      const den = timDenHopLe(cau, chu0, L);
      them(rel, {
        id: nextId(chu0),
        nut: chu0,
        loai: 'CHI_LIET_KE',
        dieuKien,
        trich: chuRaw,
        cau,
        ...(den.length ? { den } : {}),
        duKien: rutDuKienTuCau(chuRaw),
        lop: nNguon.lop,
        nguon: nNguon.nguon,
        van: sha256(chuRaw),
        trangThai: 'KHOP',
      });
      continue;
    }

    if (kho === 'nhom' || kho === 'pn') {
      const phanLoai = phanLoaiCauNhom(cau, chu0, txt, L);
      if (phanLoai.boQua) {
        them(rel, {
          id: nextId(chu0),
          nut: chu0,
          loai: BO_QUA,
          cau,
          lyDo: phanLoai.lyDo,
          van: sha256(chuRaw),
        });
      } else {
        const den = timDenHopLe(cau, chu0, L);
        them(rel, {
          id: nextId(chu0),
          nut: chu0,
          loai: 'CHI_LIET_KE',
          dieuKien: phanLoai.dieuKien,
          trich: chuRaw,
          cau,
          ...(den.length ? { den } : {}),
          duKien: rutDuKienTuCau(chuRaw),
          lop: nNguon.lop,
          nguon: nNguon.nguon,
          van: sha256(chuRaw),
          trangThai: 'KHOP',
        });
      }
      continue;
    }

    loi.push(`Chưa phân loại câu kích hoạt ${cau}: ${txt.slice(0, 120)}`);
  }

  return { L, theoTep, loi, tongKichHoat: hits.length };
}

/** Ghi các tệp JSONL vào data/ho-so-ma/liet-ke/. */
export function ghiKhoLietKeChuong(chuong, { luat = G.LUAT_MAC_DINH, hoSo = G.HO_SO_MAC_DINH } = {}) {
  const { L, theoTep, loi, tongKichHoat } = dungBanGhiLietKeChuong(chuong, { luat });
  if (loi.length) throw new Error(`Lỗi dựng kho liet-ke C${chuong}:\n${loi.join('\n')}`);
  const outDir = path.join(hoSo, 'liet-ke');
  fs.mkdirSync(outDir, { recursive: true });
  const daGhi = [];
  for (const [rel, list] of [...theoTep.entries()].sort()) {
    fs.writeFileSync(path.join(hoSo, rel), `${list.map((x) => JSON.stringify(x)).join('\n')}\n`, 'utf8');
    daGhi.push({
      rel,
      soBanGhi: list.length,
      chiLietKe: list.filter((x) => x.loai === 'CHI_LIET_KE').length,
      boQua: list.filter((x) => x.loai === BO_QUA).length,
    });
  }
  return { L, daGhi, tongKichHoat };
}

/** Kiểm độ phủ 100% câu kích hoạt Chương ch2. */
export function kiemPhuLietKeChuong(banGhi, L, chuong) {
  const ds = quetCauKichHoatChuong(L, chuong);
  const coCau = new Set(banGhi.filter((x) => x.loai === 'CHI_LIET_KE' || x.loai === BO_QUA).map((x) => x.cau));
  const thieu = ds.filter((x) => !coCau.has(x.cau));
  return { tongCauKichHoat: ds.length, daPhu: ds.length - thieu.length, thieu };
}

function main() {
  const argv = process.argv.slice(2);
  const idx = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const chuong = idx('--chuong') || '84';
  const luat = path.resolve(idx('--luat') || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(idx('--ho-so') || G.HO_SO_MAC_DINH);

  if (argv.includes('--tao')) {
    const { L, daGhi, tongKichHoat } = ghiKhoLietKeChuong(chuong, { luat, hoSo });
    const kho = kiemKhoHoSo(hoSo);
    const phu = kiemPhuLietKeChuong(kho.banGhi, L, chuong);
    console.log(`Đã tạo kho M-75 Chương ${chuong}:`, JSON.stringify({ daGhi, khuonLoi: kho.loi.length, tongKichHoat, ...phu }));
    if (kho.loi.length || phu.thieu.length) {
      for (const l of kho.loi) console.error('  ✗', l);
      process.exit(1);
    }
    return;
  }

  if (argv.includes('--bao-cao')) {
    const L = napLuatCong(luat);
    const kho = kiemKhoHoSo(hoSo);
    const phu = kiemPhuLietKeChuong(kho.banGhi, L, chuong);
    const clk = kho.banGhi.filter((x) => x.loai === 'CHI_LIET_KE');
    const bq = kho.banGhi.filter((x) => x.loai === BO_QUA);
    console.log(JSON.stringify({ chiLietKe: clk.length, boQua: bq.length, phu }, null, 2));
    return;
  }

  const L = napLuatCong(luat);
  const kho = kiemKhoHoSo(hoSo);
  const rCong45 = chayCong({ luat, hoSo, phamVi: [chuong], cong: [4, 5], L });
  const phu = kiemPhuLietKeChuong(kho.banGhi, L, chuong);
  let coLoi = 0;
  console.log(`${kho.loi.length ? 'FAIL' : 'PASS'} khuôn M-75 C${chuong}: ${kho.banGhi.length} bản ghi, ${kho.loi.length} lỗi`);
  for (const l of kho.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  for (const k of [4, 5]) {
    const c = rCong45.cong[k];
    console.log(`${c.loi.length ? 'FAIL' : 'PASS'} cổng ${k} ${c.ten} (phạm vi ${chuong}): ${c.soKiem} mục kiểm, ${c.loi.length} lỗi`);
    for (const l of c.loi) { console.log(`  ✗ ${l}`); coLoi = 1; }
  }
  console.log(`${phu.thieu.length ? 'FAIL' : 'PASS'} độ phủ câu kích hoạt Chương ${chuong}: ${phu.daPhu}/${phu.tongCauKichHoat}, thiếu ${phu.thieu.length}`);
  for (const t of phu.thieu) { console.log(`  ✗ Thiếu ${t.cau}: ${t.txt}`); coLoi = 1; }
  process.exit(coLoi);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
