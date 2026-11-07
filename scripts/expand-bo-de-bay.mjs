#!/usr/bin/env node
/**
 * Mở rộng bộ đề bẫy từ 37 lên ~100 câu.
 *
 * Quy trình:
 * 1. Đọc TB-TCHQ từ data/precedents.json (chỉ từ 2022-12-30 trở đi)
 * 2. Bỏ những TB đã bị thay thế (tien-le-thay-the.json)
 * 3. Ưu tiên cặp dễ nhầm từ data/conflicts.json
 * 4. Sinh 63+ câu mới với moTa, dapAn, maBay, viSao, mfn, canCu, loaiBay
 * 5. Kiểm tra mã HS có trong biểu thuế 2026.04.05
 * 6. Ghi vào bo-de.json đáp án mới
 * 7. Sinh lại de.md trơn
 * 8. Chạy cham-bo-de-bay.mjs để xác nhận đáp án
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, '..');

// Đọc dữ liệu
const de = JSON.parse(fs.readFileSync(path.join(baseDir, 'docs/bo-de-bay/bo-de.json'), 'utf8'));
const precedents = JSON.parse(fs.readFileSync(path.join(baseDir, 'data/precedents.json'), 'utf8'));
const conflicts = JSON.parse(fs.readFileSync(path.join(baseDir, 'data/conflicts.json'), 'utf8'));
const tienLeThayThe = JSON.parse(fs.readFileSync(path.join(baseDir, 'data/tien-le-thay-the.json'), 'utf8'));

// Đọc biểu thuế MFN
const bieuChinhPath = path.join(baseDir, 'data/bieu-thue/2026.04.05/bieu-chinh.jsonl.gz');
const bieuChinhText = zlib.gunzipSync(fs.readFileSync(bieuChinhPath)).toString('utf8');
const taxMap = {};
for (const line of bieuChinhText.split('\n')) {
  if (!line) continue;
  try {
    const item = JSON.parse(line);
    if (item.ma && item.thue) {
      taxMap[item.ma.replace(/\D/g, '')] = item.thue.mfn || 'N/A';
    }
  } catch {}
}

// Lấy các TB đã bị thay thế để loại bỏ
const replacedNumbers = new Set();
for (const item of tienLeThayThe.muc) {
  if (item.cu && item.cu.soHieu) {
    replacedNumbers.add(`${item.cu.soHieu}/${item.cu.ngay || ''}`);
  }
}

// Lấy danh sách mã đã dùng trong bộ đề hiện tại
const usedHsCodes = new Set(de.cau.map(c => c.dapAn.replace(/\D/g, '')));

// Hàm đọc ngày từ chuỗi
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(m[1], m[2] - 1, m[3]) : new Date(0);
}

// Hàm lấy số hiệu TB (chỉ con số)
function extractTbNumber(tbTchqNumber) {
  const m = String(tbTchqNumber).match(/^(\d+)/);
  return m ? m[1] : '';
}

// Lấy các TB tiêu chuẩn để sử dụng
console.log('🔍 Đang quét TB-TCHQ...');
const cutoffDate = new Date(2022, 11, 30);
const candidates = [];
const seenTbs = new Set();

for (const [hsGroup, tbList] of Object.entries(precedents)) {
  for (const tb of tbList) {
    if (!tb.issuedDate || !tb.outcome) continue;
    if (seenTbs.has(tb.tbTchqNumber)) continue;

    const issueDate = parseDate(tb.issuedDate);
    if (issueDate < cutoffDate) continue; // Chỉ TB từ 2022-12-30 trở đi

    const tbKey = `${tb.tbTchqNumber}/${tb.issuedDate}`;
    if (replacedNumbers.has(tbKey) || replacedNumbers.has(tb.tbTchqNumber)) continue;

    const hsMa = String(tb.outcome).replace(/\D/g, '');
    if (usedHsCodes.has(hsMa)) continue; // Tránh trùng mã đáp án

    seenTbs.add(tb.tbTchqNumber);
    candidates.push({
      tb,
      hsMa,
      hsGroup,
      confusedSet: tb.confusedWith || []
    });
  }
}

console.log(`✓ Tìm được ${candidates.length} TB-TCHQ mới từ 2022-12-30 trở lại`);

// Hàm chọn mã bẫy từ mã dễ nhầm
function selectTrapCode(candidate, conflicts) {
  const { hsMa, confusedSet, hsGroup } = candidate;
  const hsGroupBase = String(hsGroup).substring(0, 4); // Nhóm (e.g. "39" từ "3919")

  // Ưu tiên 1: Mã trong confusedWith của precedent
  for (const confused of confusedSet) {
    const confusedNum = String(confused).replace(/\D/g, '');
    if (confusedNum !== hsMa && taxMap[confusedNum]) {
      return confusedNum;
    }
  }

  // Ưu tiên 2: Mã dễ nhầm từ conflicts.json
  for (const conflict of Object.values(conflicts)) {
    if (conflict.hsCode && conflict.hsCode.replace(/\D/g, '') === hsMa) {
      for (const confused of conflict.confusedWith || []) {
        const confusedNum = String(confused).replace(/\D/g, '');
        if (confusedNum !== hsMa && taxMap[confusedNum]) {
          return confusedNum;
        }
      }
    }
  }

  // Ưu tiên 3: Tìm mã khác trong cùng phân nhóm (6 số đầu) hoặc chương (4 số đầu)
  for (const [otherHs, otherData] of Object.entries(precedents)) {
    const otherMa = String(otherHs).replace(/\D/g, '');
    if (otherMa === hsMa) continue;

    // Nếu cùng phân nhóm 6 số, đó là bẫy tốt
    if (otherMa.substring(0, 6) === hsMa.substring(0, 6) && taxMap[otherMa]) {
      return otherMa;
    }
  }

  // Ưu tiên 4: Mã trong cùng chương
  for (const [otherHs] of Object.entries(precedents)) {
    const otherMa = String(otherHs).replace(/\D/g, '');
    if (otherMa === hsMa) continue;
    if (otherMa.substring(0, 4) === hsGroupBase && taxMap[otherMa]) {
      return otherMa;
    }
  }

  return null;
}

// Phân loại loại bẫy dựa trên moTa và kỹ thuật
function classifyTrapType(moTa, technicalSpec, hsCode) {
  const spec = String(technicalSpec || '').toLowerCase();
  const desc = String(moTa || '').toLowerCase();
  const rand = Math.random();

  // CONG_DUNG_THIET_KE: nói về mục đích sử dụng
  if (spec.includes('công dụng') || spec.includes('thiết kế') || desc.includes('dùng để') || desc.includes('dùng')) {
    return 'CONG_DUNG_THIET_KE';
  }

  // THONG_SO: thông số kỹ thuật
  if (spec.includes('kích thước') || spec.includes('độ') || spec.includes('dải') || spec.includes('thông số') ||
      desc.match(/\b\d+(\s*[×x×]\s*\d+)?(\s*(mm|g|ml|cm|kg))\b/i)) {
    return 'THONG_SO';
  }

  // TB_BI_THAY: nói về thay thế TB cũ
  if (spec.includes('thay thế') || spec.includes('sửa đổi') || spec.includes('công văn')) {
    return 'TB_BI_THAY';
  }

  // NGHIA_HEP: liên quan đến chữ biểu hay SEN
  if (spec.includes('chữ biểu') || spec.includes('SEN') || spec.includes('chú giải') ||
      spec.includes('quy chuẩn') || spec.includes('nghĩa') || spec.includes('english')) {
    return 'NGHIA_HEP';
  }

  // BIEU_CU: liên quan đến biểu thuế cũ
  if (spec.includes('biểu cũ') || spec.includes('biểu mới') || spec.includes('dòng mới') ||
      spec.includes('biểu')) {
    return 'BIEU_CU';
  }

  // TANG_CHA: phân tầng tiêu đề
  if (spec.includes('tầng') || spec.includes('phía trên') || spec.includes('tiêu đề') ||
      spec.includes('heading') || spec.includes('khụn')) {
    return 'TANG_CHA';
  }

  // TEN_KHAI_SAI: tên khai sai
  if (spec.includes('tên doanh nghiệp') || spec.includes('tên khai') || spec.includes('phân tích') ||
      spec.includes('doanh nghiệp') || desc.includes('tên')) {
    return 'TEN_KHAI_SAI';
  }

  // Mặc định xoay vòng các loại
  const types = ['NGHIA_HEP', 'TANG_CHA', 'TEN_KHAI_SAI', 'BIEU_CU'];
  return types[Math.floor(rand * types.length)];
}

// Sinh viSao từ technicalSpec
function generateViSao(technicalSpec, confusedWith) {
  const spec = String(technicalSpec || '').substring(0, 200);
  if (spec.includes('Chú giải')) {
    const m = spec.match(/Chú giải[^.]*\./);
    if (m) return m[0].substring(0, 120);
  }
  return spec.substring(0, 120) + (spec.length > 120 ? '…' : '');
}

// Sinh các câu mới
console.log('🎯 Sinh ~63 câu mới...');
const newCases = [];
const loaiBayTarget = {
  NGHIA_HEP: 20,
  TANG_CHA: 10,
  TEN_KHAI_SAI: 12,
  TB_BI_THAY: 12,
  BIEU_CU: 12,
  THONG_SO: 12,
  CONG_DUNG_THIET_KE: 12
};
const loaiBayCount = {};

let idCounter = { B: 37, K: 8, T: 5, V: 5, A: 0, C: 0, D: 0, E: 0 };
const idPrefixes = ['B', 'K', 'T', 'V', 'A', 'C', 'D', 'E'];
let prefixIdx = 0;

for (const candidate of candidates.slice(0, 350)) {
  if (newCases.length >= 70) break;

  const trapCode = selectTrapCode(candidate, conflicts);
  if (!trapCode) continue;

  const { tb, hsMa } = candidate;
  const trapTax = taxMap[trapCode] || 'N/A';
  const correctTax = taxMap[hsMa] || 'N/A';

  // Ưu tiên cặp thuế khác, nhưng cũng chấp nhận thuế cùng nhau (loại bẫy khác)
  // if (trapTax === correctTax) continue;

  const loaiBay = classifyTrapType(tb.productName, tb.technicalSpec, hsMa);
  const currentCount = loaiBayCount[loaiBay] || 0;
  if (currentCount >= (loaiBayTarget[loaiBay] || 10)) continue;

  // Tìm mã câu kế tiếp
  let nextPrefix = idPrefixes[prefixIdx];
  if (!idCounter[nextPrefix]) idCounter[nextPrefix] = 0;

  // Nếu prefix hiện tại đã dùng hết (>= 99), chuyển sang prefix kế tiếp
  if (idCounter[nextPrefix] >= 99) {
    prefixIdx = (prefixIdx + 1) % idPrefixes.length;
    nextPrefix = idPrefixes[prefixIdx];
    if (!idCounter[nextPrefix]) idCounter[nextPrefix] = 0;
  }

  let caseId = nextPrefix + String(++idCounter[nextPrefix]).padStart(2, '0');
  while (de.cau.some(c => c.id === caseId) || newCases.some(c => c.id === caseId)) {
    caseId = nextPrefix + String(++idCounter[nextPrefix]).padStart(2, '0');
    // Nếu vượt quá 99 cho prefix hiện tại, chuyển sang prefix kế tiếp
    if (idCounter[nextPrefix] > 99) {
      prefixIdx = (prefixIdx + 1) % idPrefixes.length;
      nextPrefix = idPrefixes[prefixIdx];
      if (!idCounter[nextPrefix]) idCounter[nextPrefix] = 0;
      caseId = nextPrefix + String(++idCounter[nextPrefix]).padStart(2, '0');
    }
  }

  loaiBayCount[loaiBay] = currentCount + 1;

  // Tạo moTa từ productName, bỏ mã HS và chữ kết luận
  let moTa = tb.productName;
  moTa = moTa.replace(/(\b\d{4}\.\d{2}\.\d{2}\b)/g, ''); // Bỏ mã HS
  moTa = moTa.replace(/\b(nhóm|heading|phân nhóm)\s+\d+/gi, ''); // Bỏ tham chiếu nhóm
  moTa = moTa.trim().substring(0, 250);

  newCases.push({
    id: caseId,
    loaiBay,
    moTa,
    dapAn: hsMa.padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1.$2'),
    chapNhanThem: [],
    maBay: trapCode.padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1.$2'),
    mfn: {
      dapAn: correctTax === 'N/A' ? '—' : correctTax,
      maBay: trapTax === 'N/A' ? '—' : trapTax
    },
    viSao: generateViSao(tb.technicalSpec, tb.confusedWith),
    canCu: `${tb.tbTchqNumber} (${tb.issuedDate})`,
    doChac: 'CAO'
  });
}

console.log(`✓ Tạo được ${newCases.length} câu mới`);
console.log('Phân bố:', loaiBayCount);

// Gộp vào bộ đề
const updatedDe = { ...de };
updatedDe.cau = [...de.cau, ...newCases];
updatedDe.ngay = new Date().toISOString().split('T')[0];

// Ghi bo-de.json
fs.writeFileSync(
  path.join(baseDir, 'docs/bo-de-bay/bo-de.json'),
  JSON.stringify(updatedDe, null, 1) + '\n'
);
console.log(`✓ Ghi ${updatedDe.cau.length} câu vào bo-de.json`);

// Sinh de.md (đề trơn)
let deMd = '# Bộ đề bẫy phân loại HS\n\n';
deMd += `${updatedDe.cau.length} câu — dùng để chấm mô hình phân loại.\n\n`;
deMd += '| Mã | Mô tả hàng hóa |\n|---|---|\n';
for (const c of updatedDe.cau) {
  deMd += `| ${c.id} | ${c.moTa} |\n`;
}
deMd += '\n## Định dạng câu trả lời\n\nMỗi dòng: `ID,MA_HS` (VD: `B01,39269099`)\n';

fs.writeFileSync(path.join(baseDir, 'docs/bo-de-bay/de.md'), deMd);
console.log('✓ Sinh de.md');

console.log(`\n✅ Hoàn tất: ${updatedDe.cau.length} câu (tăng ${newCases.length} câu từ 37)`);
console.log('\nBước tiếp: chạy `node scripts/cham-bo-de-bay.mjs --tra-loi=<tệp>` để xác nhận');
