#!/usr/bin/env node
// scripts/ho-so-ma/tach-dieu-kien.mjs — M-81 (#2410, ADR-0007 + ADR-0008): tách điều kiện nguyên tử theo gói nhóm 4 số qua cổng OpenAI-compatible.
// Chỉ gửi chữ luật công khai (không dữ liệu khách, không tiền lệ tb:, không khoá cứng hay IP nội bộ).
//   node scripts/ho-so-ma/tach-dieu-kien.mjs --nhom 8543 --url <...> --model <...> [--out <tep.jsonl>]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { napLuatCong, chuanSo, vanTay } from './cong.mjs';
import { kiemBanGhi, kiemKhoHoSo, KIEU_DIEU_KIEN, MO_DIEU_KIEN, CACH_GIAI_CHONG } from './khuon.mjs';
import { laLoaiKhacThuan, napBieuMeta } from './bang-anh-em.mjs';
import { dungGoiNhom, lietKeNhom4, DEFAULT_CANH_TRANH_MD, MAX_BYTES_MAC_DINH } from './goi-nhom.mjs';

const require = createRequire(import.meta.url);
const G = require('../../lib/ho-so-ma/ghep.js');

const gon = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

export const HUONG_DAN_TACH_DIEU_KIEN = `Bạn là chuyên gia số hoá luật phân loại HS thành điều kiện nguyên tử (khuôn ho-so-ma@1 / DIEU_KIEN, GIAI_CHONG, CANH_TRANH — ADR-0007 & ADR-0008).
Chỉ đọc chữ luật công khai trong gói nhóm bốn số. Không bịa điều kiện, không dùng kiến thức ngoài, không dùng tiền lệ tb: hay dữ liệu khách.

Quy tắc tách trọn nhóm bốn số (một lượt):
1. Đọc trọn cây biểu thuế trong gói (\`cayBieu\`, kể cả dòng trung gian không mã \`khongMa: true\`, và thừa kế con duy nhất \`suyRa: true\` / \`cungDong\` — đặt điều kiện ở nút cha sáu số, nút tám số con duy nhất tự thừa kế). Không đặt \`DIEU_KIEN\` cho dòng "Loại khác" thuần (\`loaiKhac: true\`), nhưng PHẢI tách cho dòng \`loaiKhacCoVe: true\` và nhánh phần bù có tên ("… khác").
2. Tách nguyên tử từng điều kiện — mỗi đối tượng trong \`dieuKien\` chỉ kiểm đúng MỘT thuộc tính đơn (cấm gộp nhiều điều kiện vào một \`cauHoi\`) và mang rõ \`nut\` (\`bieu:...\`):
   - \`ve\` (số nguyên >= 0): dấu ";" hoặc "hoặc" phân nhánh thay thế => \`ve\` tăng dần (\`1, 2, ...\`). Các điều kiện đồng thời ("và") => CÙNG \`ve\`. Đặt \`ve: 0\` cho điều kiện chung áp lên mọi vế (như mệnh đề loại trừ chung của Phần/Chương/Nhóm áp lên toàn nút).
   - \`phu\` (boolean): \`true\` khi mang nghĩa phủ định ("trừ...", "không kể...", "không phải...") hoặc phủ định phần bù đối với anh em / ngưỡng đứng trước.
   - \`kieu\`:
     * \`GIA_TRI\`: ưu tiên dùng khi các anh em cùng phân chia trên một chiều thuộc tính theo chữ luật (cấm hạ thành \`CO_KHONG\` làm mất trục); BẮT BUỘC kèm \`truc\` (\`<tên trục cục bộ theo chữ luật>\`, một dòng) và \`tap\` (mảng chuỗi nguyên văn). Đặt \`daTri: true\` CHỈ khi một mặt hàng có thể mang đồng thời nhiều giá trị trên trục đó; mặc định \`false\` (đơn trị). Cấm \`nguong\`.
     * \`SO\`: ngưỡng số, BẮT BUỘC trỏ \`nguong\` = id bản ghi NGUONG đã có trong danh mục M-74 (không lặp số; cấm \`tap\`, \`truc\`, \`daTri\`). Nhánh "… khác" đứng sau anh em có ngưỡng phải giữ đủ điều kiện \`phu: true\` trên ngưỡng đó nếu chữ luật loại trừ dải trước.
     * \`CO_KHONG\`: chỉ dùng cho mệnh đề có/không độc lập không tạo thành trục giá trị chung giữa các anh em (cấm \`nguong\`, \`tap\`, \`truc\`, \`daTri\`).
   - \`mo\` (ưu tiên tra định nghĩa/mô tả trong gói trước, chỉ dùng \`NGHIA_THUONG\` khi kho luật thực sự không giải nghĩa):
     * \`DINH_NGHIA_LUAT\`: có định nghĩa pháp lý trong chú giải/SEN (BẮT BUỘC kèm \`moNguon\`: id câu hoặc mảng id câu định nghĩa hợp lệ, kể cả chéo chương; cấm \`tb:\`).
     * \`MO_TA_HUONG_DAN\`: có mô tả chi tiết trong chú giải hướng dẫn / SEN (BẮT BUỘC kèm \`moNguon\`; cấm \`tb:\`).
     * \`NGUONG\`: đi với ngưỡng định lượng (cấm \`moNguon\`).
     * \`NGHIA_THUONG\`: chữ luật thông thường không có câu định nghĩa/hướng dẫn/ngưỡng trong kho (cấm \`moNguon\`).
   - Áp đúng quy tắc chọn vật liệu/thành phần hoặc bộ phận theo Chú giải Phần/Chương trước khi so điều kiện phân nhóm con.
   - \`cauHoi\`: một câu hỏi Có/Không đầy đủ ngữ cảnh pháp lý (một dòng, <= 600 ký tự).
   - \`trich\`: chuỗi con NGUYÊN VĂN của câu \`nguon\`.
   - \`nguon\`: đúng id câu nguồn có trong gói (ví dụ \`bieu:XXXXXXXX#1\`).
3. \`giaiChong\`: rà soát đầy đủ mọi cặp anh em cùng cha có thể cùng thoả trên một mặt hàng thực tế để lập \`{ nut, cap: [A, B], cach: "TRU"|"QUY_TAC_3"|"CHU_GIAI"|"NGUONG", trich, nguon }\` đúng căn cứ luật (phân biệt rõ \`QUY_TAC_3\` với \`CHU_GIAI\`).
4. \`canhTranh\`: bắt buộc lập cho mọi nút mang cụm "chưa được chi tiết hoặc ghi ở nơi khác" từ dữ liệu cạnh tranh trong gói (\`{ nut, nhomCanhTranh: ["bieu:...", ...], phepThu: [{ nguon, trich }], trich, nguon }\` — \`nhomCanhTranh\` phải là id nút hợp lệ).

Trả về DUY NHẤT JSON hợp lệ dạng:
{"dieuKien":[{"nut":"bieu:...","ve":1,"phu":false,"kieu":"CO_KHONG","mo":"NGHIA_THUONG","cauHoi":"...","trich":"...","nguon":"..."}],"giaiChong":[],"canhTranh":[]}`;

/** Tìm đoạn trích nguyên văn trong chữ câu (tương thích logic timTrich của tach-chung.mjs). */
export function timTrichNguyenVan(trich, chu) {
  const cs = chuanSo(chu);
  let t = chuanSo(String(trich || '').replace(/^["“'…\s.]+|["”'…\s]+$/g, ''));
  if (!t) return null;
  let i = cs.indexOf(t);
  if (i < 0) i = cs.toLowerCase().indexOf(t.toLowerCase());
  if (i < 0 && t.replace(/[.;:,]+$/, '') !== t) {
    t = t.replace(/[.;:,]+$/, '');
    i = cs.indexOf(t);
  }
  if (i < 0 && t.includes(cs)) return cs;
  if (i < 0) return null;
  return cs.slice(i, i + t.length);
}

/** Dựng gói chữ luật công khai cho một nút đơn lẻ (tương thích kiểm thử đơn nút). */
export function dungGoiTachDieuKien(nut, L, { nguongSanCo = [] } = {}) {
  const cauNut = [...L.cau.keys()]
    .filter((id) => G.chuCuaCau(id) === nut && !/^tb:/.test(id))
    .sort()
    .map((id) => ({ id, chu: gon(L.chuCau(id)), lop: L.nut.get(L.cau.get(id).nut)?.lop || 'LUAT' }));

  const duong = (G.duongDiNut(nut, L.cay) || []).slice(0, -1);
  const cauTren = [];
  for (const buoc of duong) {
    for (const id of L.cau.keys()) {
      if (G.chuCuaCau(id) === buoc.nut && !/^tb:/.test(id)) {
        cauTren.push({ id, nut: buoc.nut, chu: gon(L.chuCau(id)) });
      }
    }
  }
  const nguongLienQuan = nguongSanCo.filter(
    (g) => g.nut === nut || duong.some((b) => b.nut === g.nut),
  );
  return {
    nut,
    ten: gon(L.cay.theoId.get(nut)?.ten || L.nut.get(nut)?.v || ''),
    cauNut,
    cauTren: cauTren.slice(0, 24),
    nguongSanCo: nguongLienQuan.map((g) => ({ id: g.id, nut: g.nut, dieuKien: g.dieuKien, nguong: g.nguong })),
  };
}

/** Dựng cặp messages OpenAI-compatible để tách DIEU_KIEN cho một nút đơn lẻ. */
export function dungLoiHoiTachDieuKien(goi) {
  const dong = [
    `NÚT: ${goi.nut}`,
    `TÊN NÚT: ${goi.ten}`,
    '',
    'CÂU LUẬT CỦA NÚT:',
    ...goi.cauNut.map((c) => `- [${c.id}] (${c.lop}): ${c.chu}`),
  ];
  if (goi.cauTren.length) {
    dong.push('', 'CÂU PHÍA TRÊN TRÊN ĐƯỜNG ĐI (tham chiếu nếu cần):');
    for (const c of goi.cauTren) dong.push(`- [${c.id}] (${c.nut}): ${c.chu}`);
  }
  if (goi.nguongSanCo.length) {
    dong.push('', 'NGUONG M-74 ĐÃ CÓ (nếu dùng kieu="SO", bắt buộc trỏ đúng id dưới đây, không lặp số):');
    for (const g of goi.nguongSanCo) dong.push(`- ${g.id}: ${g.dieuKien}`);
  }
  return [
    { role: 'system', content: HUONG_DAN_TACH_DIEU_KIEN },
    { role: 'user', content: dong.join('\n') },
  ];
}

/** Dựng cặp messages OpenAI-compatible từ gói nhóm 4 số `goi-nhom@1` (hoặc một phần `goiCon`). */
export function dungLoiHoiGoiNhom(goi, { chunk = null } = {}) {
  const nodes = chunk
    ? [...(chunk.chuoiCha || []), ...(chunk.cayCon || [])]
    : (goi.cayBieu || []);
  const anhEmList = chunk ? (chunk.nhomAnhEmCon || []) : (goi.nhomAnhEm || []);
  const hoSo = chunk ? (chunk.hoSoCon || goi.hoSoSanCo) : goi.hoSoSanCo;
  const cauList = chunk ? (chunk.cauCon || []) : (goi.cauTrongGoi || []);

  const dong = [
    `NHÓM 4 SỐ: ${goi.nhom} (${goi.nut}) — ${gon(goi.ten)}`,
    `BỐI CẢNH: Phần ${goi.phan || '?'} · Chương ${goi.chuong || '?'}${goi.phanChuong ? ` · Phân chương ${goi.phanChuong}` : ''}`,
    ...(chunk ? [`PHÂN ĐOẠN PHÂN NHÓM: ${chunk.nutPhanNhom} — ${gon(chunk.tenPhanNhom)}`] : []),
    '',
    'CÂY BIỂU THUẾ (giữ đủ dòng trung gian khongMa và thừa kế suyRa/cungDong):',
  ];

  for (const n of nodes) {
    const flags = [];
    if (n.khongMa) flags.push('khongMa');
    if (n.loaiKhac) flags.push('loaiKhac');
    if (n.loaiKhacCoVe) flags.push('loaiKhacCoVe');
    if (n.suyRa) flags.push('suyRa');
    if (n.cungDong) flags.push(`cungDong=${n.cungDong}`);
    const pad = '  '.repeat(Math.max(0, (n.gach ?? 0)));
    dong.push(`- ${pad}[${n.id}] (${n.cap || '?'}${flags.length ? `; ${flags.join(', ')}` : ''}): ${gon(n.ten)}`);
  }

  if (chunk?.anhEmCungCap?.length) {
    dong.push('', 'ANH EM CÙNG CẤP VỚI PHÂN NHÓM NÀY (giữ ngữ cảnh tránh chồng):');
    for (const ae of chunk.anhEmCungCap) {
      dong.push(`- [${ae.id}]${ae.loaiKhac ? ' (loaiKhac)' : ''}: ${gon(ae.ten)}`);
    }
  }

  if (anhEmList.length) {
    dong.push('', 'GIA ĐÌNH ANH EM:');
    for (const g of anhEmList) {
      dong.push(`- Cha ${g.cha} (${gon(g.tenCha)}): ${g.con.map((c) => `${c.id}${c.loaiKhac ? '[LK]' : ''}`).join(' | ')}`);
    }
  }

  const pushLuatNen = (tieuDe, items) => {
    if (!items?.length) return;
    dong.push('', `${tieuDe}:`);
    for (const m of items) {
      dong.push(`- [${m.id}] (${m.lop}): ${gon(m.trich)}`);
    }
  };
  pushLuatNen('CHÚ GIẢI PHẦN', goi.luatNen?.phan);
  pushLuatNen('CHÚ GIẢI CHƯƠNG', goi.luatNen?.chuong);
  pushLuatNen('CHÚ GIẢI PHÂN CHƯƠNG', goi.luatNen?.phanChuong);
  pushLuatNen('CHÚ GIẢI CHI TIẾT NHÓM', goi.luatNen?.nhomCt);
  pushLuatNen('CHÚ GIẢI PHÂN NHÓM', goi.luatNen?.cgpn);
  pushLuatNen('CHÚ GIẢI BỔ SUNG SEN', goi.luatNen?.sen);

  if (goi.loaiTru?.ra?.length || goi.loaiTru?.vao?.length) {
    dong.push('', 'CẠNH LOẠI TRỪ / DẪN CHIẾU (LOAI_TRU):');
    for (const e of (goi.loaiTru.ra || []).slice(0, 40)) {
      dong.push(`- [RA ${e.cauId || e.id || '?'} -> ${e.den}] ${gon(e.trich || e.cau)}`);
    }
    for (const e of (goi.loaiTru.vao || []).slice(0, 40)) {
      dong.push(`- [VÀO ${e.cauId || e.tuNut || '?'} -> ${e.den}] ${gon(e.trich || e.cau)}`);
    }
  }

  if (hoSo?.nguong?.length) {
    dong.push('', 'NGUONG M-74 ĐÃ CÓ (khi kieu="SO", bắt buộc trỏ đúng id, không lặp số):');
    for (const g of hoSo.nguong) {
      dong.push(`- ${g.id} (${g.nut}): ${g.dieuKien} | daiLuong="${g.nguong?.daiLuong}" donVi=${g.nguong?.donVi ?? 'null'}`);
    }
  }
  if (hoSo?.dinhNghia?.length) {
    dong.push('', 'DINH_NGHIA M-72/73 ĐÃ CÓ (tham chiếu moNguon):');
    for (const d of hoSo.dinhNghia.slice(0, 40)) {
      dong.push(`- ${d.id} [${d.cau}] thuatNgu="${d.thuatNgu}": ${gon(d.dieuKien)}`);
    }
  }
  if (hoSo?.lietKe?.length) {
    dong.push('', 'CHI_LIET_KE M-75 ĐÃ CÓ:');
    for (const l of hoSo.lietKe.slice(0, 30)) {
      dong.push(`- ${l.id} [${l.cau}]: ${gon(l.dieuKien)}`);
    }
  }

  if (goi.canhTranh?.muc?.length || goi.canhTranh?.canhTranhChung?.length) {
    dong.push('', 'NHÓM CẠNH TRANH SẴN CÓ (từ M-81-canh-tranh.md):');
    for (const m of goi.canhTranh.muc || []) {
      const dsNhom = (m.canhTranh || []).map((c) => `${c.nhom}(${c.kieu})`).join(', ');
      dong.push(`- ${m.nut}: [${dsNhom}]`);
      for (const p of (m.phepThu || []).slice(0, 8)) {
        dong.push(`  * phép thử [${p.nguon}]: ${gon(p.trich)}`);
      }
    }
    for (const cc of goi.canhTranh.canhTranhChung || []) {
      dong.push(`- ${cc.pham} chung: ${(cc.canhTranh || []).slice(0, 15).map((c) => c.nhom).join(', ')}`);
    }
  }

  // Luôn liệt kê đầy đủ danh sách câu hợp lệ để mô hình trích đúng nguon & moNguon
  const cauMap = new Map();
  for (const c of goi.cauTrongGoi || []) cauMap.set(c.id, c);
  for (const c of cauList) cauMap.set(c.id, c);
  const dsCau = [...cauMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  if (dsCau.length) {
    dong.push('', 'CÁC CÂU LUẬT HỢP LỆ TRONG GÓI (dùng làm nguon / moNguon):');
    for (const c of dsCau) {
      dong.push(`- [${c.id}]: ${gon(c.chu)}`);
    }
  }

  return [
    { role: 'system', content: HUONG_DAN_TACH_DIEU_KIEN },
    { role: 'user', content: dong.join('\n') },
  ];
}

function timKhoiJsonCanBang(s, startIdx) {
  const open = s[startIdx];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return s.slice(startIdx, i + 1);
    }
  }
  return null;
}

/** Tách đối tượng `{ dieuKien, giaiChong, canhTranh }` từ chuỗi trả về của LLM. */
export function rutJsonGoiNhom(text) {
  const raw = String(text || '').trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const s = (fenced ? fenced[1] : raw).trim();
  let lastErr = null;
  let sawCandidate = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch !== '{' && ch !== '[') continue;
    sawCandidate = true;
    const block = timKhoiJsonCanBang(s, i);
    if (!block) continue;
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (err) {
      lastErr = err;
      continue;
    }
    if (Array.isArray(parsed)) {
      if (parsed.length === 0 || (parsed[0] && typeof parsed[0] === 'object' && !Array.isArray(parsed[0]))) {
        return { dieuKien: parsed, giaiChong: [], canhTranh: [] };
      }
      continue;
    }
    if (parsed && typeof parsed === 'object') {
      const dieuKien = parsed.dieuKien || parsed.kq;
      const giaiChong = Array.isArray(parsed.giaiChong) ? parsed.giaiChong : [];
      const canhTranh = Array.isArray(parsed.canhTranh) ? parsed.canhTranh : [];
      if (Array.isArray(dieuKien)) {
        return { dieuKien, giaiChong, canhTranh };
      }
    }
  }
  if (!sawCandidate) throw new Error('Không tìm thấy JSON trong phản hồi mô hình');
  if (lastErr) throw lastErr;
  throw new Error('JSON thiếu mảng dieuKien');
}

/** Tách mảng JSON dieuKien từ chuỗi trả về của LLM (tương thích ngược). */
export function rutJsonDieuKien(text) {
  return rutJsonGoiNhom(text).dieuKien;
}

/** Chuyển đổi an toàn boolean (tránh Boolean('false') === true). */
export function docBool(v, macDinh = false) {
  if (v === undefined || v === null) return macDinh;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
    throw new Error(`giá trị boolean số không hợp lệ: ${v}`);
  }
  if (typeof v === 'string') {
    const s = v.normalize('NFC').trim().toLowerCase();
    if (!s) return macDinh;
    if (s === 'true' || s === '1' || s === 'yes' || s === 'có' || s === 'co') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'không' || s === 'khong') return false;
    throw new Error(`giá trị boolean chuỗi không hợp lệ: "${v}"`);
  }
  throw new Error(`kiểu boolean không hợp lệ: ${typeof v}`);
}

/** Chuẩn hoá đề xuất thô từ LLM thành các bản ghi DIEU_KIEN hợp lệ theo khuôn.mjs. */
export function chuanHoaDieuKien(rawList, nut, L, { batDauSo = 8101, nguongSanCo = [], moHinh = null } = {}) {
  const banGhi = [];
  const loi = [];
  const nguongSet = new Set((nguongSanCo || []).map((g) => g.id));
  let stt = batDauSo;

  for (const item of rawList || []) {
    if (!item || typeof item !== 'object') { loi.push(`${nut}: phần tử không phải object`); continue; }
    const nguon = gon(item.nguon || item.cau || `${nut}#1`);
    if (/^tb:/.test(nguon)) { loi.push(`${nut}: từ chối nguồn tiền lệ ${nguon}`); continue; }
    const chu = L.chuCau(nguon);
    if (chu === null) { loi.push(`${nut}: nguon "${nguon}" không tồn tại trong kho luật`); continue; }
    const trich = timTrichNguyenVan(item.trich, chu);
    if (!trich) { loi.push(`${nut}: trich không nguyên văn câu ${nguon} ("${gon(item.trich).slice(0, 60)}")`); continue; }

    let ve = 1;
    if (item.ve === 0 || item.ve === '0') ve = 0;
    else if (Number.isInteger(item.ve) && item.ve >= 1) ve = item.ve;
    else {
      const parsedVe = Number.parseInt(item.ve, 10);
      if (Number.isInteger(parsedVe) && parsedVe >= 0) ve = parsedVe;
    }
    let phu;
    try {
      phu = docBool(item.phu, false);
    } catch (err) {
      loi.push(`${nut}: phu không hợp lệ (${err.message})`);
      continue;
    }
    const kieu = KIEU_DIEU_KIEN.includes(item.kieu) ? item.kieu : 'CO_KHONG';
    const mo = MO_DIEU_KIEN.includes(item.mo) ? item.mo : (kieu === 'SO' ? 'NGUONG' : 'NGHIA_THUONG');
    const truc = kieu === 'GIA_TRI' && item.truc !== undefined ? gon(item.truc) : undefined;
    let daTri;
    if (kieu === 'GIA_TRI' && item.daTri !== undefined && item.daTri !== null && String(item.daTri).trim() !== '') {
      try {
        daTri = docBool(item.daTri, false);
      } catch (err) {
        loi.push(`${nut}: daTri không hợp lệ (${err.message})`);
        continue;
      }
    }
    let moNguon;
    let moNguonVanTay;
    if ((mo === 'DINH_NGHIA_LUAT' || mo === 'MO_TA_HUONG_DAN') && item.moNguon !== undefined) {
      moNguon = Array.isArray(item.moNguon)
        ? item.moNguon.map(gon).filter(Boolean)
        : gon(item.moNguon);
      if (typeof moNguon === 'string' && moNguon && !/^tb:/.test(moNguon)) {
        const mnChu = L.chuCau(moNguon);
        if (mnChu !== null) moNguonVanTay = vanTay(mnChu);
      } else if (Array.isArray(moNguon) && moNguon.length > 0) {
        const entries = [];
        let du = true;
        for (const mnId of moNguon) {
          const mnChu = /^tb:/.test(mnId) ? null : L.chuCau(mnId);
          if (mnChu === null) { du = false; break; }
          entries.push([mnId, vanTay(mnChu)]);
        }
        if (du) moNguonVanTay = Object.fromEntries(entries);
      }
    }
    const cauHoi = gon(item.cauHoi || item.dieuKien || '').slice(0, 600);
    if (!cauHoi) { loi.push(`${nut}: thiếu cauHoi cho trích "${trich.slice(0, 40)}"`); continue; }

    const rec = {
      id: `hs:${nut}:${stt}`,
      nut,
      loai: 'DIEU_KIEN',
      ve,
      phu,
      kieu,
      ...(truc !== undefined ? { truc } : {}),
      ...(daTri !== undefined ? { daTri } : {}),
      ...(kieu === 'SO' && item.nguong ? { nguong: gon(item.nguong) } : {}),
      ...(kieu === 'GIA_TRI' && Array.isArray(item.tap) ? { tap: item.tap.map(gon).filter(Boolean) } : {}),
      mo,
      ...(moNguon !== undefined ? { moNguon } : {}),
      ...(moNguonVanTay !== undefined ? { moNguonVanTay } : {}),
      cauHoi,
      trich,
      nguon,
      vanTay: vanTay(chu),
      ...(moHinh ? {
        phieu: [{
          mo: moHinh,
          trich,
          nguon,
          ve,
          phu,
          kieu,
          moDieuKien: mo,
          ...(truc !== undefined ? { truc } : {}),
          ...(daTri !== undefined ? { daTri } : {}),
          ...(moNguon !== undefined ? { moNguon } : {}),
        }],
      } : {}),
    };

    if (rec.kieu === 'SO' && nguongSet.size && !nguongSet.has(rec.nguong)) {
      loi.push(`${rec.id}: nguong "${rec.nguong}" không có trong danh mục M-74`);
      continue;
    }
    const err = kiemBanGhi(rec);
    if (err.length) {
      loi.push(...err);
      continue;
    }
    if (moNguon !== undefined) {
      const mnIds = Array.isArray(moNguon) ? moNguon : [moNguon];
      const thieuMn = mnIds.find((mnId) => L.chuCau(mnId) === null);
      if (thieuMn) {
        loi.push(`${rec.id}: moNguon "${thieuMn}" không tồn tại trong kho luật`);
        continue;
      }
    }
    stt += 1;
    banGhi.push(rec);
  }
  return { banGhi, loi };
}

/** Chuẩn hoá toàn bộ đầu ra `{ dieuKien, giaiChong, canhTranh }` của một gói nhóm 4 số. */
export function chuanHoaGoiNhom(rawObj, goi, L, { nguongSanCo = null, moHinh = null } = {}) {
  const obj = Array.isArray(rawObj)
    ? { dieuKien: rawObj, giaiChong: [], canhTranh: [] }
    : (rawObj || { dieuKien: [], giaiChong: [], canhTranh: [] });

  const cayNutSet = new Set((goi.cayBieu || []).map((n) => n.id));
  const cayThuTu = new Map((goi.cayBieu || []).map((n, idx) => [n.id, idx]));
  const nguongList = nguongSanCo || goi.hoSoSanCo?.nguong || [];

  const dieuKien = [];
  const giaiChong = [];
  const canhTranh = [];
  const loi = [];

  // 1. DIEU_KIEN gom theo nut trong goi.cayBieu
  const theoNut = new Map();
  for (const item of obj.dieuKien || []) {
    if (!item || typeof item !== 'object') { loi.push(`${goi.nut}: phần tử dieuKien không phải object`); continue; }
    const nut = gon(item.nut || '');
    if (!nut || !cayNutSet.has(nut)) {
      loi.push(`${goi.nut}: DIEU_KIEN nut "${nut || '(thiếu)'}" không thuộc cây nhóm ${goi.nhom}`);
      continue;
    }
    if (!theoNut.has(nut)) theoNut.set(nut, []);
    theoNut.get(nut).push(item);
  }
  const nutSapXep = [...theoNut.keys()].sort((a, b) => (cayThuTu.get(a) ?? 9999) - (cayThuTu.get(b) ?? 9999));
  for (const nut of nutSapXep) {
    const r = chuanHoaDieuKien(theoNut.get(nut), nut, L, { batDauSo: 8101, nguongSanCo: nguongList, moHinh });
    dieuKien.push(...r.banGhi);
    loi.push(...r.loi);
  }

  // 2. GIAI_CHONG
  const sttGcTheoNut = new Map();
  for (const item of obj.giaiChong || []) {
    if (!item || typeof item !== 'object') { loi.push(`${goi.nut}: phần tử giaiChong không phải object`); continue; }
    const nut = gon(item.nut || goi.nut);
    if (!cayNutSet.has(nut)) {
      loi.push(`${goi.nut}: GIAI_CHONG nut "${nut}" không thuộc cây nhóm ${goi.nhom}`);
      continue;
    }
    const nguon = gon(item.nguon || '');
    if (/^tb:/.test(nguon)) { loi.push(`${nut}: GIAI_CHONG từ chối tiền lệ ${nguon}`); continue; }
    const chu = L.chuCau(nguon);
    if (chu === null) { loi.push(`${nut}: GIAI_CHONG nguon "${nguon}" không có trong kho luật`); continue; }
    const trich = timTrichNguyenVan(item.trich, chu);
    if (!trich) { loi.push(`${nut}: GIAI_CHONG trich không nguyên văn câu ${nguon}`); continue; }
    const cach = CACH_GIAI_CHONG.includes(item.cach) ? item.cach : gon(item.cach);
    const cap = Array.isArray(item.cap) ? item.cap.map(gon).filter(Boolean) : [];
    const conCha = new Set(G.conCua(nut, L.cay));
    if (cap.length !== 2 || cap[0] === cap[1] || !conCha.has(cap[0]) || !conCha.has(cap[1])) {
      loi.push(`${nut}: GIAI_CHONG cap [${cap.join(', ')}] không phải 2 anh em trực tiếp của ${nut}`);
      continue;
    }
    const stt = (sttGcTheoNut.get(nut) || 8150) + 1;
    sttGcTheoNut.set(nut, stt);
    const rec = {
      id: `hs:${nut}:${stt}`,
      nut,
      loai: 'GIAI_CHONG',
      cap,
      cach,
      trich,
      nguon,
      vanTay: vanTay(chu),
      ...(moHinh ? { phieu: [{ mo: moHinh, cap, cach, trich, nguon }] } : {}),
    };
    const err = kiemBanGhi(rec);
    if (err.length) { loi.push(...err); continue; }
    giaiChong.push(rec);
  }

  // 3. CANH_TRANH
  const sttCtTheoNut = new Map();
  for (const item of obj.canhTranh || []) {
    if (!item || typeof item !== 'object') { loi.push(`${goi.nut}: phần tử canhTranh không phải object`); continue; }
    const nut = gon(item.nut || goi.nut);
    if (!cayNutSet.has(nut)) {
      loi.push(`${goi.nut}: CANH_TRANH nut "${nut}" không thuộc cây nhóm ${goi.nhom}`);
      continue;
    }
    const nguon = gon(item.nguon || '');
    if (/^tb:/.test(nguon)) { loi.push(`${nut}: CANH_TRANH từ chối tiền lệ ${nguon}`); continue; }
    const chu = L.chuCau(nguon);
    if (chu === null) { loi.push(`${nut}: CANH_TRANH nguon "${nguon}" không có trong kho luật`); continue; }
    const trich = timTrichNguyenVan(item.trich, chu);
    if (!trich) { loi.push(`${nut}: CANH_TRANH trich không nguyên văn câu ${nguon}`); continue; }

    const nhomCanhTranh = Array.isArray(item.nhomCanhTranh) ? item.nhomCanhTranh.map(gon).filter(Boolean) : [];
    const phepThu = [];
    let phepThuLoi = false;
    for (const p of item.phepThu || []) {
      if (typeof p === 'string') {
        const pn = gon(p);
        if (/^tb:/.test(pn) || L.chuCau(pn) === null) {
          loi.push(`${nut}: CANH_TRANH phepThu "${pn}" không có trong kho luật`);
          phepThuLoi = true;
          break;
        }
        phepThu.push(pn);
      } else if (p && typeof p === 'object') {
        const pn = gon(p.nguon || '');
        const pChu = /^tb:/.test(pn) ? null : L.chuCau(pn);
        const pTrich = pChu ? timTrichNguyenVan(p.trich, pChu) : null;
        if (!pTrich) {
          loi.push(`${nut}: CANH_TRANH phepThu "${pn}" không hợp lệ hoặc không nguyên văn`);
          phepThuLoi = true;
          break;
        }
        phepThu.push({ nguon: pn, trich: pTrich });
      }
    }
    if (phepThuLoi) continue;

    const stt = (sttCtTheoNut.get(nut) || 8170) + 1;
    sttCtTheoNut.set(nut, stt);
    const rec = {
      id: `hs:${nut}:${stt}`,
      nut,
      loai: 'CANH_TRANH',
      nhomCanhTranh,
      phepThu,
      trich,
      nguon,
      vanTay: vanTay(chu),
      ...(moHinh ? { phieu: [{ mo: moHinh, nhomCanhTranh, trich, nguon }] } : {}),
    };
    const err = kiemBanGhi(rec);
    if (err.length) { loi.push(...err); continue; }
    canhTranh.push(rec);
  }

  return {
    banGhi: [...dieuKien, ...giaiChong, ...canhTranh],
    dieuKien,
    giaiChong,
    canhTranh,
    loi,
  };
}

/** Đọc cấu hình cổng OpenAI-compatible từ đối số hoặc biến môi trường chuẩn (không hardcoded secret/IP). */
export function docCauHinhEndpoint(opts = {}) {
  const urlRaw = opts.url || process.env.DIEU_KIEN_LLM_URL || process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL || '';
  const model = opts.model || process.env.DIEU_KIEN_MODEL || process.env.OPENAI_MODEL || process.env.LLM_MODEL || '';
  const apiKey = opts.apiKey
    || (opts.apiKeyEnv ? process.env[opts.apiKeyEnv] : '')
    || process.env.DIEU_KIEN_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.LLM_API_KEY
    || '';
  return { url: String(urlRaw).trim(), model: String(model).trim(), apiKey: String(apiKey).trim() };
}

export function chuanEndpointChat(url) {
  const u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  return /\/chat\/completions$/i.test(u) ? u : `${u}/chat/completions`;
}

/** Gọi cổng OpenAI-compatible /chat/completions với fetchImpl có thể tiêm giả lập khi kiểm thử. */
export async function goiOpenAICompatible({
  url,
  model,
  apiKey = '',
  messages,
  temperature = 0,
  timeoutMs = 120000,
  fetchImpl = globalThis.fetch,
}) {
  const endpoint = chuanEndpointChat(url);
  if (!endpoint) throw new Error('Thiếu URL cổng OpenAI-compatible (truyền --url hoặc OPENAI_BASE_URL / LLM_BASE_URL)');
  if (!model) throw new Error('Thiếu tên model (truyền --model hoặc OPENAI_MODEL / LLM_MODEL)');
  if (typeof fetchImpl !== 'function') throw new Error('Thiếu fetch implementation');

  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const body = {
    model,
    temperature,
    messages,
    response_format: { type: 'json_object' },
  };
  const resp = await fetchImpl(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Phản hồi OpenAI-compatible thiếu choices[0].message.content');
  }
  return content;
}

async function goiMoHinh(messages, meta, opts, cfg) {
  if (opts.callModel) {
    return opts.callModel(messages, { ...meta, model: cfg.model });
  }
  return goiOpenAICompatible({
    url: cfg.url,
    model: cfg.model,
    apiKey: cfg.apiKey,
    messages,
    temperature: opts.temperature ?? 0,
    timeoutMs: opts.timeoutMs ?? 120000,
    fetchImpl: opts.fetchImpl || globalThis.fetch,
  });
}

const chuanChuoiGop = (v) => chuanSo(String(v ?? ''));

function chuanVeGop(v) {
  if (v === 0 || v === '0') return 0;
  if (Number.isInteger(v) && v >= 1) return v;
  const parsed = Number.parseInt(v, 10);
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  return v === undefined || v === null || gon(v) === '' ? 1 : gon(v);
}

function chuanBoolGop(v, macDinh = false) {
  try {
    return docBool(v, macDinh);
  } catch {
    return `RAW:${gon(v)}`;
  }
}

/**
 * Gộp kết quả thô `{ dieuKien, giaiChong, canhTranh }` từ các chunk của gói nhóm 4 số.
 * - Khác khoá gộp: giữ cả hai, không cảnh báo.
 * - Trùng khoá gộp và trùng toàn bộ nội dung chuẩn hoá còn lại: gộp bỏ bản lặp êm (chồng chuoiCha giữa goiCon).
 * - Trùng khoá gộp nhưng khác nội dung còn lại: giữ cả hai VÀ ghi cảnh báo vào `canhBao` (chống mất dữ liệu âm thầm).
 */
export function gopKetQuaChunk(dsParsed, { nutMacDinh = '' } = {}) {
  const dieuKien = [];
  const giaiChong = [];
  const canhTranh = [];
  const canhBao = [];

  const theoKhoaDk = new Map();
  const theoKhoaGc = new Map();
  const theoKhoaCt = new Map();

  for (const parsed of dsParsed || []) {
    if (!parsed || typeof parsed !== 'object') continue;

    for (const d of Array.isArray(parsed.dieuKien) ? parsed.dieuKien : []) {
      if (!d || typeof d !== 'object' || Array.isArray(d)) {
        dieuKien.push(d);
        continue;
      }
      const nut = gon(d.nut || '');
      const ve = chuanVeGop(d.ve);
      const phu = chuanBoolGop(d.phu, false);
      const nguon = gon(d.nguon || d.cau || (nut ? `${nut}#1` : ''));
      const trich = chuanChuoiGop(d.trich || '');
      const cauHoi = chuanChuoiGop(d.cauHoi || d.dieuKien || '');
      const kieu = KIEU_DIEU_KIEN.includes(d.kieu)
        ? d.kieu
        : (d.kieu === undefined || d.kieu === null || gon(d.kieu) === '' ? 'CO_KHONG' : gon(d.kieu));
      const truc = kieu === 'GIA_TRI' ? chuanChuoiGop(d.truc || '') : '';
      const tapSorted = kieu === 'GIA_TRI' && Array.isArray(d.tap)
        ? [...new Set(d.tap.map(chuanChuoiGop).filter(Boolean))].sort()
        : [];
      const nguong = kieu === 'SO' ? gon(d.nguong || '') : '';

      const khoaGop = JSON.stringify([nut, ve, phu, nguon, trich, cauHoi, kieu, truc, tapSorted, nguong]);

      const daTri = kieu === 'GIA_TRI'
        ? (d.daTri === undefined || d.daTri === null || gon(d.daTri) === '' ? false : chuanBoolGop(d.daTri, false))
        : null;
      const mo = MO_DIEU_KIEN.includes(d.mo)
        ? d.mo
        : (d.mo === undefined || d.mo === null || gon(d.mo) === '' ? (kieu === 'SO' ? 'NGUONG' : 'NGHIA_THUONG') : gon(d.mo));
      let moNguon = null;
      if ((mo === 'DINH_NGHIA_LUAT' || mo === 'MO_TA_HUONG_DAN') && d.moNguon !== undefined && d.moNguon !== null) {
        const mnArr = [...new Set((Array.isArray(d.moNguon) ? d.moNguon : [d.moNguon]).map(gon).filter(Boolean))].sort();
        if (mnArr.length) moNguon = mnArr;
      }
      let tapDuSorted = null;
      if (kieu === 'GIA_TRI' && Array.isArray(d.tapDu)) {
        const tdArr = [...new Set(d.tapDu.map(chuanChuoiGop).filter(Boolean))].sort();
        if (tdArr.length) tapDuSorted = tdArr;
      }
      const ghiChuRaw = d.ghiChu === undefined || d.ghiChu === null ? '' : chuanChuoiGop(d.ghiChu);
      const ghiChu = ghiChuRaw || null;
      const noiDung = JSON.stringify({ daTri, mo, moNguon, tapDu: tapDuSorted, ghiChu });

      if (!theoKhoaDk.has(khoaGop)) {
        theoKhoaDk.set(khoaGop, new Set([noiDung]));
        dieuKien.push(d);
      } else {
        const daCo = theoKhoaDk.get(khoaGop);
        if (daCo.has(noiDung)) continue;
        daCo.add(noiDung);
        dieuKien.push(d);
        canhBao.push(
          `${nut || '(thiếu nut)'}: trùng khoá gộp DIEU_KIEN trên "${nguon}" ("${gon(d.cauHoi || d.dieuKien || '').slice(0, 80)}") nhưng khác nội dung — giữ cả hai`,
        );
      }
    }

    for (const g of Array.isArray(parsed.giaiChong) ? parsed.giaiChong : []) {
      if (!g || typeof g !== 'object' || Array.isArray(g)) {
        giaiChong.push(g);
        continue;
      }
      const nut = gon(g.nut || nutMacDinh);
      const sortedCap = Array.isArray(g.cap) ? [...new Set(g.cap.map(gon).filter(Boolean))].sort() : [];
      const cach = CACH_GIAI_CHONG.includes(g.cach) ? g.cach : gon(g.cach || '');
      const nguon = gon(g.nguon || '');
      const trich = chuanChuoiGop(g.trich || '');
      const ghiChuRaw = g.ghiChu === undefined || g.ghiChu === null ? '' : chuanChuoiGop(g.ghiChu);
      const ghiChu = ghiChuRaw || null;

      const khoaGc = JSON.stringify([nut, sortedCap, cach, nguon]);
      const noiDungGc = JSON.stringify({ trich, ghiChu });

      if (!theoKhoaGc.has(khoaGc)) {
        theoKhoaGc.set(khoaGc, new Set([noiDungGc]));
        giaiChong.push(g);
      } else {
        const daCo = theoKhoaGc.get(khoaGc);
        if (daCo.has(noiDungGc)) continue;
        daCo.add(noiDungGc);
        giaiChong.push(g);
        canhBao.push(
          `${nut || '(thiếu nut)'}: trùng khoá gộp GIAI_CHONG cặp [${sortedCap.join(', ')}] trên "${nguon}" nhưng khác nội dung — giữ cả hai`,
        );
      }
    }

    for (const c of Array.isArray(parsed.canhTranh) ? parsed.canhTranh : []) {
      if (!c || typeof c !== 'object' || Array.isArray(c)) {
        canhTranh.push(c);
        continue;
      }
      const nut = gon(c.nut || nutMacDinh);
      const nhomCtSorted = Array.isArray(c.nhomCanhTranh)
        ? [...new Set(c.nhomCanhTranh.map(gon).filter(Boolean))].sort()
        : [];
      const nguon = gon(c.nguon || '');
      const trich = chuanChuoiGop(c.trich || '');
      const phepThuSorted = Array.isArray(c.phepThu)
        ? [...new Set(
          c.phepThu
            .map((p) => {
              if (typeof p === 'string') {
                const s = gon(p);
                return s ? JSON.stringify(['str', s]) : '';
              }
              if (p && typeof p === 'object' && !Array.isArray(p)) {
                return JSON.stringify(['obj', gon(p.nguon || ''), chuanChuoiGop(p.trich || '')]);
              }
              return '';
            })
            .filter(Boolean),
        )].sort()
        : [];
      const ghiChuRaw = c.ghiChu === undefined || c.ghiChu === null ? '' : chuanChuoiGop(c.ghiChu);
      const ghiChu = ghiChuRaw || null;

      const khoaCt = JSON.stringify([nut, nhomCtSorted, nguon, trich]);
      const noiDungCt = JSON.stringify({ phepThu: phepThuSorted, ghiChu });

      if (!theoKhoaCt.has(khoaCt)) {
        theoKhoaCt.set(khoaCt, new Set([noiDungCt]));
        canhTranh.push(c);
      } else {
        const daCo = theoKhoaCt.get(khoaCt);
        if (daCo.has(noiDungCt)) continue;
        daCo.add(noiDungCt);
        canhTranh.push(c);
        canhBao.push(
          `${nut || '(thiếu nut)'}: trùng khoá gộp CANH_TRANH trên "${nguon}" nhưng khác nội dung — giữ cả hai`,
        );
      }
    }
  }

  return { dieuKien, giaiChong, canhTranh, canhBao };
}

/** Tách trọn một nhóm 4 số theo ADR-0008 (dùng gói đọc từ goi-nhom.mjs, tự chia goiCon khi vượt trần). */
export async function tachGoiNhom(nhom4OrGoi, opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const goi = typeof nhom4OrGoi === 'string'
    ? dungGoiNhom(nhom4OrGoi, {
      luat,
      hoSo,
      L,
      bieuMeta: opts.bieuMeta || null,
      kho: opts.kho || null,
      canhTranhMap: opts.canhTranhMap || null,
      canhTranhMd: opts.canhTranhMd ?? DEFAULT_CANH_TRANH_MD,
      maxBytes: opts.maxBytes ?? MAX_BYTES_MAC_DINH,
      chiaTheo6So: Boolean(opts.chiaTheo6So),
    })
    : nhom4OrGoi;

  const cfg = docCauHinhEndpoint(opts);
  const chunks = (!opts.khongChia && Array.isArray(goi.goiCon) && goi.goiCon.length > 0)
    ? goi.goiCon
    : [null];

  const dsParsed = [];
  for (const chunk of chunks) {
    const messages = dungLoiHoiGoiNhom(goi, { chunk });
    const rawText = await goiMoHinh(messages, { nhom: goi.nhom, nut: goi.nut, goi, chunk }, opts, cfg);
    dsParsed.push(rutJsonGoiNhom(rawText));
  }
  const { canhBao, ...mergedRaw } = gopKetQuaChunk(dsParsed, { nutMacDinh: goi.nut });

  const res = chuanHoaGoiNhom(mergedRaw, goi, L, {
    nguongSanCo: opts.nguongSanCo || goi.hoSoSanCo?.nguong || [],
    moHinh: cfg.model || opts.moHinh || null,
  });

  if (opts.out) {
    const abs = path.resolve(opts.out);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, `${res.banGhi.map((x) => JSON.stringify(x)).join('\n')}${res.banGhi.length ? '\n' : ''}`, 'utf8');
  }

  return {
    nhom: goi.nhom,
    goi,
    ...res,
    canhBao,
  };
}

/** Tách điều kiện nguyên tử cho một nút (tương thích kiểm thử đơn nút). */
export async function tachDieuKienNut(nut, L, opts = {}) {
  const nguongSanCo = opts.nguongSanCo || [];
  const goi = dungGoiTachDieuKien(nut, L, { nguongSanCo });
  const messages = dungLoiHoiTachDieuKien(goi);
  const cfg = docCauHinhEndpoint(opts);

  const rawText = await goiMoHinh(messages, { nut, goi }, opts, cfg);
  const parsed = rutJsonDieuKien(rawText);
  return chuanHoaDieuKien(parsed, nut, L, {
    batDauSo: opts.batDauSo ?? 8101,
    nguongSanCo,
    moHinh: cfg.model || opts.moHinh || null,
  });
}

/** Tách điều kiện nguyên tử cho danh sách nút, giữ tuần tự tất định và tuỳ chọn ghi JSONL. */
export async function tachDanhSachNut(nuts, opts = {}) {
  const luat = opts.luat || G.LUAT_MAC_DINH;
  const hoSo = opts.hoSo || G.HO_SO_MAC_DINH;
  const L = opts.L || napLuatCong(luat);
  const bieuMeta = napBieuMeta(luat);
  const kho = opts.nguongSanCo ? null : kiemKhoHoSo(hoSo);
  const nguongSanCo = opts.nguongSanCo || kho.banGhi.filter((x) => !x._hong && x.loai === 'NGUONG');

  const banGhi = [];
  const loi = [];
  for (const nut of nuts) {
    if (laLoaiKhacThuan(nut, L, bieuMeta)) continue;
    const r = await tachDieuKienNut(nut, L, { ...opts, nguongSanCo });
    banGhi.push(...r.banGhi);
    loi.push(...r.loi);
  }
  if (opts.out) {
    fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
    fs.writeFileSync(path.resolve(opts.out), `${banGhi.map((x) => JSON.stringify(x)).join('\n')}${banGhi.length ? '\n' : ''}`, 'utf8');
  }
  return { banGhi, loi };
}

async function main() {
  const a = process.argv.slice(2);
  const lay = (k) => { const ds = []; a.forEach((x, i) => { if (x === k && a[i + 1]) ds.push(a[i + 1]); }); return ds; };
  const luat = path.resolve(lay('--luat')[0] || G.LUAT_MAC_DINH);
  const hoSo = path.resolve(lay('--ho-so')[0] || G.HO_SO_MAC_DINH);
  const L = napLuatCong(luat);
  const bieuMeta = napBieuMeta(luat);

  const nhoms = [...lay('--nhom')];
  if (lay('--chuong')[0] && !lay('--nut').length && !lay('--ds-nut').length) {
    nhoms.push(...lietKeNhom4({ chuong: lay('--chuong')[0], luat, L }));
  }

  if (nhoms.length) {
    const kho = kiemKhoHoSo(hoSo);
    const canhTranhMd = lay('--canh-tranh')[0] ? path.resolve(lay('--canh-tranh')[0]) : DEFAULT_CANH_TRANH_MD;
    const maxBytes = lay('--max-bytes')[0] ? Number(lay('--max-bytes')[0]) : MAX_BYTES_MAC_DINH;
    const khongChia = a.includes('--khong-chia');
    const banGhi = [];
    const loi = [];
    const canhBao = [];
    for (const nhom of [...new Set(nhoms)]) {
      const r = await tachGoiNhom(nhom, {
        luat,
        hoSo,
        L,
        bieuMeta,
        kho,
        canhTranhMd,
        maxBytes,
        khongChia,
        url: lay('--url')[0],
        model: lay('--model')[0],
        apiKeyEnv: lay('--api-key-env')[0],
      });
      banGhi.push(...r.banGhi);
      loi.push(...r.loi);
      canhBao.push(...(r.canhBao || []));
    }
    if (lay('--out')[0]) {
      const abs = path.resolve(lay('--out')[0]);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `${banGhi.map((x) => JSON.stringify(x)).join('\n')}${banGhi.length ? '\n' : ''}`, 'utf8');
    }
    console.log(`Tách ${nhoms.length} nhóm 4 số: ${banGhi.length} bản ghi (${banGhi.filter((x) => x.loai === 'DIEU_KIEN').length} DIEU_KIEN, ${banGhi.filter((x) => x.loai === 'GIAI_CHONG').length} GIAI_CHONG, ${banGhi.filter((x) => x.loai === 'CANH_TRANH').length} CANH_TRANH), ${loi.length} lỗi${canhBao.length ? `, ${canhBao.length} cảnh báo` : ''}`);
    for (const cb of canhBao.slice(0, 40)) console.log(`  ! ${cb}`);
    for (const l of loi.slice(0, 40)) console.log(`  ✗ ${l}`);
    if (!lay('--out')[0] && banGhi.length) {
      for (const x of banGhi) console.log(JSON.stringify(x));
    }
    process.exit(loi.length ? 1 : 0);
  }

  let nuts = [...lay('--nut')];
  if (lay('--ds-nut')[0]) nuts.push(...lay('--ds-nut')[0].split(',').map((s) => s.trim()).filter(Boolean));
  nuts = [...new Set(nuts)];
  if (!nuts.length) {
    console.error('Thiếu --nhom <4so>, --chuong <NN> (hoặc --nut / --ds-nut)');
    process.exit(2);
  }
  const r = await tachDanhSachNut(nuts, {
    luat,
    hoSo,
    L,
    url: lay('--url')[0],
    model: lay('--model')[0],
    apiKeyEnv: lay('--api-key-env')[0],
    out: lay('--out')[0],
  });
  console.log(`Tách ${nuts.length} nút: ${r.banGhi.length} bản ghi DIEU_KIEN, ${r.loi.length} lỗi`);
  for (const l of r.loi.slice(0, 40)) console.log(`  ✗ ${l}`);
  if (!lay('--out')[0] && r.banGhi.length) {
    for (const x of r.banGhi) console.log(JSON.stringify(x));
  }
  process.exit(r.loi.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
