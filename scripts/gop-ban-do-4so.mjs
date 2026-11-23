import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RE_JSON_BLOCK = /```[ \t]*json(?:[ \t]*\r?\n|[ \t]+)([\s\S]*?)(?:```|$)/gi;
const RE_4_DIGITS = /^\d{4}$/;

/**
 * Trích tất cả các khối ```json ... ``` (kể cả khối bị cắt chưa kịp đóng ```).
 * @param {string} text
 * @returns {string[]}
 */
function tachKhoiJson(text) {
  if (typeof text !== 'string' || !text) return [];
  const blocks = [];
  RE_JSON_BLOCK.lastIndex = 0;
  let match;
  while ((match = RE_JSON_BLOCK.exec(text)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

/**
 * Cứu các đối tượng {...} cấp một đã đóng ngoặc trọn vẹn bên trong một mảng JSON bị cắt dở.
 * Bỏ qua ngoặc nằm trong chuỗi "..." và xử lý ký tự thoát \" / \\.
 * @param {string} raw
 * @returns {object[]}
 */
function cuuDoiTuongTrongMang(raw) {
  const salvaged = [];
  const n = raw.length;
  let i = 0;

  // Bỏ khoảng trắng đầu và dấu '[' mở mảng ngoài cùng (nếu có)
  while (i < n && /\s/.test(raw[i])) i++;
  if (i < n && raw[i] === '[') i++;

  let inString = false;
  let escaped = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let objStart = -1;

  for (; i < n; i++) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '[') {
      if (braceDepth === 0) bracketDepth++;
    } else if (ch === ']') {
      if (braceDepth === 0) {
        if (bracketDepth > 0) bracketDepth--;
        else break;
      }
    } else if (ch === '{') {
      if (braceDepth === 0 && bracketDepth === 0) {
        objStart = i;
      }
      braceDepth++;
    } else if (ch === '}') {
      if (braceDepth > 0) {
        braceDepth--;
        if (braceDepth === 0 && bracketDepth === 0 && objStart !== -1) {
          const slice = raw.slice(objStart, i + 1);
          objStart = -1;
          try {
            const parsed = JSON.parse(slice);
            if (
              parsed &&
              typeof parsed === 'object' &&
              !Array.isArray(parsed) &&
              Object.prototype.hasOwnProperty.call(parsed, 'nhom')
            ) {
              salvaged.push(parsed);
            }
          } catch {
            // Bỏ qua đối tượng lỗi cú pháp
          }
        }
      }
    }
  }

  return salvaged;
}

/**
 * Gộp nhiều lượt trả lời văn bản của Gemini thành một bản đồ 4 số theo thứ tự `nhomThuTu`.
 *
 * @param {string[]} cacTraLoi Mảng chuỗi nguyên văn các lượt trả lời của Gemini.
 * @param {string[]} nhomThuTu Mảng mã nhóm 4 số theo thứ tự mong muốn.
 * @returns {{ banDo: object[], thieu: string[], boNgoaiDanhSach: number, khoiHong: number, doiTuongCuu: number }}
 */
export function gopBanDo(cacTraLoi, nhomThuTu) {
  const dsTraLoi = Array.isArray(cacTraLoi) ? cacTraLoi : [];
  const thuTu = Array.isArray(nhomThuTu) ? nhomThuTu.map((m) => String(m).trim()).filter(Boolean) : [];
  const tapNhom = new Set(thuTu);

  const theoNhom = new Map();
  let boNgoaiDanhSach = 0;
  let khoiHong = 0;
  let doiTuongCuu = 0;

  for (const traLoi of dsTraLoi) {
    const khoiList = tachKhoiJson(traLoi);
    for (const rawBlock of khoiList) {
      const trimmed = rawBlock.trim();
      if (!trimmed) continue;

      let items = [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed.filter(
            (el) =>
              el &&
              typeof el === 'object' &&
              !Array.isArray(el) &&
              Object.prototype.hasOwnProperty.call(el, 'nhom')
          );
        } else if (
          parsed &&
          typeof parsed === 'object' &&
          Object.prototype.hasOwnProperty.call(parsed, 'nhom')
        ) {
          items = [parsed];
        }
      } catch {
        khoiHong += 1;
        items = cuuDoiTuongTrongMang(trimmed);
        doiTuongCuu += items.length;
      }

      for (const item of items) {
        const ma = typeof item.nhom === 'string' ? item.nhom.trim() : '';
        if (RE_4_DIGITS.test(ma) && tapNhom.has(ma)) {
          theoNhom.set(ma, item);
        } else {
          boNgoaiDanhSach += 1;
        }
      }
    }
  }

  const banDo = [];
  const thieu = [];
  for (const ma of thuTu) {
    if (theoNhom.has(ma)) {
      banDo.push(theoNhom.get(ma));
    } else {
      thieu.push(ma);
    }
  }

  return {
    banDo,
    thieu,
    boNgoaiDanhSach,
    khoiHong,
    doiTuongCuu,
  };
}

function parseCliArgs(argv) {
  let nhomThuTu = [];
  const files = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--nhom=')) {
      nhomThuTu = arg
        .slice('--nhom='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === '--nhom' && i + 1 < argv.length) {
      nhomThuTu = argv[++i]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (!arg.startsWith('-')) {
      files.push(arg);
    }
  }

  return { nhomThuTu, files };
}

function runCli() {
  const { nhomThuTu, files } = parseCliArgs(process.argv.slice(2));
  if (nhomThuTu.length === 0 || files.length === 0) {
    process.stderr.write(
      'Cách dùng: node scripts/gop-ban-do-4so.mjs --nhom=8451,8536 tra-loi-1.txt [tra-loi-2.txt ...]\n'
    );
    process.exit(2);
  }

  const cacTraLoi = files.map((filePath) => fs.readFileSync(filePath, 'utf8'));
  const { banDo, thieu, boNgoaiDanhSach, khoiHong, doiTuongCuu } = gopBanDo(cacTraLoi, nhomThuTu);

  process.stdout.write(`${JSON.stringify(banDo, null, 2)}\n`);
  process.stderr.write(
    `Gộp xong: có ${banDo.length}/${nhomThuTu.length} nhóm | thiếu (${thieu.length}): [${thieu.join(', ')}] | bỏ ngoài danh sách: ${boNgoaiDanhSach} | khối hỏng: ${khoiHong} | đối tượng cứu: ${doiTuongCuu}\n`
  );

  process.exit(thieu.length > 0 ? 1 : 0);
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  runCli();
}