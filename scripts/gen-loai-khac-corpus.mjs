#!/usr/bin/env node
/**
 * gen-loai-khac-corpus.mjs
 *
 * Sinh corpus tìm kiếm cho 3,383 mã "Loại khác" — hoàn toàn từ cấu trúc biểu thuế.
 * Không dùng oz-gold, không dùng AI API.
 *
 * Công thức:
 *   Loại khác = [phạm vi heading H] - [tiêu chí từng sibling S1..Sn]
 *
 * Với mỗi mã LK:
 *   1. Trích danh mục từ heading notes (nhom/bao_gom)
 *   2. Tổng hợp 2-3 sản phẩm: [danh mục] + congDung "không phải [sibling1], [sibling2]..."
 *   3. Chạy qua reasoning engine → lấy steps làm lyDo
 *   4. Ghi ra data/loai-khac-corpus.jsonl
 *
 * Usage:
 *   node scripts/gen-loai-khac-corpus.mjs
 *   node scripts/gen-loai-khac-corpus.mjs --dry-run     # 10 mã đầu
 *   node scripts/gen-loai-khac-corpus.mjs --hs 90049090 # 1 mã cụ thể
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { reasonLoaiKhac } = require('../lib/loai-khac-classifier.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.join(__dirname, '..');
const IDX_PATH = path.join(ROOT, 'data', 'loai-khac-index.json');
const ENR_PATH = path.join(ROOT, 'data', 'loai-khac-enriched.json');
const OUT_PATH = path.join(ROOT, 'data', 'loai-khac-corpus.jsonl');

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function clean(s) {
  return (s || '').replace(/\n+/g, ' ').replace(/\s+/g, ' ')
    .replace(/\b[oO]\s+[oO]\s+[oO]\b/g, '').trim();
}

function truncate(s, n) {
  if (!s || s.length <= n) return s || '';
  const cut = s.slice(0, n);
  const last = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '));
  return last > n * 0.5 ? cut.slice(0, last) : cut;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const o = { dryRun: false, hs: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') o.dryRun = true;
    if (args[i] === '--hs') o.hs = args[i + 1];
  }
  return o;
}

// --------------------------------------------------------------------------
// Extract category noun — primary source: sibling names (most reliable)
// Sibling names share a common base noun; strip the specific qualifier
// --------------------------------------------------------------------------

function extractCategoryNoun(headingNote, siblings) {
  // Strategy 1: find common base from sibling names
  // Siblings like ["Bút chì đen", "Bút chì màu"] → common = "Bút chì"
  if (siblings.length >= 1) {
    const sibNames = siblings
      .map(s => s.v.replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').split(/[;(]/)[0].trim())
      .filter(s => s.length >= 3 && s.length <= 60);

    if (sibNames.length >= 2) {
      // Find longest common prefix across all sibling names
      const words0 = sibNames[0].split(' ');
      let commonLen = words0.length;
      for (const name of sibNames.slice(1)) {
        const w = name.split(' ');
        let match = 0;
        for (let i = 0; i < Math.min(commonLen, w.length); i++) {
          if (norm(words0[i]) === norm(w[i])) match++;
          else break;
        }
        commonLen = match;
        if (commonLen === 0) break;
      }
      if (commonLen >= 1) {
        return words0.slice(0, commonLen).join(' ');
      }
    }

    // Only 1 sibling: strip last keyword if sibling is short (≤4 words)
    // Long sibling names (like "Loại có mũi giày được gắn...") are too specific to extract from
    if (sibNames.length === 1) {
      const words = sibNames[0].split(' ');
      if (words.length >= 2 && words.length <= 4) {
        return words.slice(0, -1).join(' ');
      }
    }
  }

  // Strategy 2: first clean noun phrase from bao_gom
  const baoGom = clean(headingNote?.bao_gom || '');
  if (baoGom.length > 8) {
    const stripped = baoGom
      .replace(/^các sản phẩm[^,;]*[,;]\s*/i, '')
      .replace(/^những sản phẩm[^,;]*[,;]\s*/i, '')
      .replace(/^hàng hóa[^,;]*[,;]\s*/i, '')
      .replace(/^sản phẩm[^,;]*[,;]\s*/i, '');
    const first = stripped.split(/[,;(]/)[0].trim();
    if (first.length >= 5 && first.length <= 50
        && !/^nhóm này|^phân nhóm|^loại|^hàng|^sản phẩm/i.test(first)) {
      return first;
    }
  }

  return '';  // caller will use CHAPTER_NOUN fallback
}

function chapterNoun(hs) {
  return CHAPTER_NOUN[hs.slice(0, 2)] || '';
}

// --------------------------------------------------------------------------
// Extract material hint — use chapter-level mapping (reliable) not phan_biet
// phan_biet mentions materials as contrasts, not as the product's material
// --------------------------------------------------------------------------

// Chapter-level noun fallback when sibling extraction fails
const CHAPTER_NOUN = {
  '01': 'Động vật sống',       '02': 'Thịt các loại',        '03': 'Thủy sản',
  '04': 'Sữa và sản phẩm sữa', '05': 'Sản phẩm động vật',    '06': 'Cây trồng',
  '07': 'Rau củ các loại',      '08': 'Trái cây',              '09': 'Gia vị',
  '10': 'Ngũ cốc',              '11': 'Bột và tinh bột',       '12': 'Hạt và quả có dầu',
  '13': 'Nhựa cây và chiết xuất','15': 'Dầu mỡ động thực vật', '16': 'Đồ hộp thực phẩm',
  '17': 'Đường và bánh kẹo',    '18': 'Sô cô la',              '19': 'Sản phẩm ngũ cốc chế biến',
  '20': 'Đồ hộp rau quả',       '21': 'Thực phẩm chế biến',    '22': 'Đồ uống',
  '23': 'Thức ăn gia súc',       '24': 'Thuốc lá',              '25': 'Khoáng sản',
  '26': 'Quặng khoáng',          '27': 'Nhiên liệu khoáng',     '28': 'Hóa chất vô cơ',
  '29': 'Hóa chất hữu cơ',      '30': 'Dược phẩm',             '31': 'Phân bón',
  '32': 'Sơn và mực in',         '33': 'Mỹ phẩm và hương liệu', '34': 'Xà phòng và chất tẩy rửa',
  '35': 'Chất kết dính',         '36': 'Chất nổ',               '37': 'Phim ảnh',
  '38': 'Hóa chất hỗn hợp',     '39': 'Sản phẩm nhựa',         '40': 'Sản phẩm cao su',
  '41': 'Da thuộc',              '42': 'Đồ da và túi xách',     '43': 'Lông thú',
  '44': 'Sản phẩm gỗ',          '45': 'Sản phẩm lie',          '46': 'Sản phẩm đan lát',
  '47': 'Bột giấy',              '48': 'Giấy và bìa',           '49': 'Sách và ấn phẩm',
  '50': 'Tơ lụa',                '51': 'Len',                   '52': 'Bông',
  '53': 'Sợi thực vật',          '54': 'Sợi nhân tạo',          '55': 'Sợi staple',
  '56': 'Sản phẩm dệt',          '57': 'Thảm',                  '58': 'Vải đặc biệt',
  '59': 'Vải tráng phủ',         '60': 'Vải dệt kim',           '61': 'Quần áo dệt kim',
  '62': 'Quần áo dệt thoi',      '63': 'Hàng dệt may khác',    '64': 'Giày dép',
  '65': 'Mũ nón',                '66': 'Ô dù',                  '67': 'Lông vũ và hoa giả',
  '68': 'Đá và xi măng',         '69': 'Gốm sứ',               '70': 'Kính và thủy tinh',
  '71': 'Đồ trang sức',          '72': 'Sắt thép',              '73': 'Sản phẩm sắt thép',
  '74': 'Sản phẩm đồng',         '75': 'Sản phẩm niken',        '76': 'Sản phẩm nhôm',
  '78': 'Sản phẩm chì',          '79': 'Sản phẩm kẽm',          '80': 'Sản phẩm thiếc',
  '81': 'Sản phẩm kim loại',     '82': 'Dụng cụ kim loại',      '83': 'Phụ kiện kim loại',
  '84': 'Máy móc công nghiệp',   '85': 'Thiết bị điện',         '86': 'Phương tiện đường sắt',
  '87': 'Phương tiện vận tải',   '88': 'Máy bay',               '89': 'Tàu thuyền',
  '90': 'Thiết bị quang học',    '91': 'Đồng hồ',               '92': 'Nhạc cụ',
  '93': 'Vũ khí',                '94': 'Đồ nội thất và đèn',   '95': 'Đồ chơi và thể thao',
  '96': 'Hàng tạp hóa',          '97': 'Tác phẩm nghệ thuật',
};

const CHAPTER_MATERIAL = {
  '39': 'nhựa',  '40': 'cao su', '41': 'da thuộc', '42': 'da',
  '44': 'gỗ',    '45': 'lie',    '48': 'giấy',     '50': 'tơ lụa',
  '51': 'len',   '52': 'bông',   '54': 'sợi nhân tạo', '56': 'sợi tổng hợp',
  '57': 'vải',   '60': 'vải dệt kim', '61': 'vải', '62': 'vải',
  '63': 'vải',   '64': 'nhựa/da', '65': 'vải',    '68': 'đá/xi măng',
  '69': 'sứ/gốm', '70': 'thủy tinh', '71': 'kim loại quý',
  '72': 'sắt thép', '73': 'sắt thép', '74': 'đồng', '75': 'niken',
  '76': 'nhôm',  '78': 'chì',    '79': 'kẽm',    '80': 'thiếc',
  '81': 'kim loại', '82': 'kim loại cơ bản', '83': 'kim loại cơ bản',
};

function extractMaterialHint(hs, siblings) {
  const chapter = hs.slice(0, 2);

  // Only use sibling text for "bằng [material]" explicit patterns — avoid false positives
  // (e.g., "nhom" = nhóm/group, "su" = sử/dụng, "giay" = giày/shoes)
  const BANG_MAT = [
    ['bang nhua',     'nhựa'],    ['bang thep',    'thép'],
    ['bang nhom',     'nhôm'],    ['bang dong',    'đồng'],
    ['bang go',       'gỗ'],      ['bang cao su',  'cao su'],
    ['bang thuy tinh','thủy tinh'],['bang vai',    'vải'],
    ['bang kim loai', 'kim loại'],
  ];
  const sibText = norm(siblings.map(s => s.v).join(' '));
  for (const [key, label] of BANG_MAT) {
    if (sibText.includes(key)) return label;
  }

  return CHAPTER_MATERIAL[chapter] || '';
}

// --------------------------------------------------------------------------
// Build sibling denial phrase for congDung
// Key: explicit "không phải X" triggers high-confidence denial in reasoning engine
// --------------------------------------------------------------------------

function buildDenialCongDung(categoryNoun, siblings, headingNote) {
  const baseUse = inferBaseUse(categoryNoun, headingNote);

  if (siblings.length === 0) {
    return baseUse + ' — thuộc loại thông thường trong phân nhóm này';
  }

  // Take top 4 siblings as explicit denials (most discriminating first)
  // Prioritise siblings with specific discriminating words
  const DISC = ['ngam', 'quan su', 'y te', 'san bay', 'tau', 'gat tan', 'bao ho', 'thuoc'];
  const sorted = [...siblings].sort((a, b) => {
    const an = norm(a.v), bn = norm(b.v);
    const aScore = DISC.some(d => an.includes(d)) ? 1 : 0;
    const bScore = DISC.some(d => bn.includes(d)) ? 1 : 0;
    return bScore - aScore;
  });

  const denials = sorted.slice(0, 4).map(s =>
    s.v.replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').split(/[;(]/)[0].trim().slice(0, 50)
  );

  return `${baseUse}, không phải ${denials.join(', không phải ')}`;
}

function inferBaseUse(categoryNoun, headingNote) {
  if (!categoryNoun) return 'sử dụng thông thường trong thương mại';
  const n = norm(categoryNoun);

  // Specific use inferences
  if (n.includes('kinh') && n.includes('mat')) return `${categoryNoun} đeo thời trang trang trí`;
  if (n.includes('but') || n.includes('but chi')) return `${categoryNoun} dùng học sinh sinh viên`;
  if (n.includes('cap') || n.includes('day dan')) return `${categoryNoun} dùng kết nối thiết bị điện tử`;
  if (n.includes('den') || n.includes('bong den')) return `${categoryNoun} chiếu sáng thông thường`;
  if (n.includes('dong ho')) return `${categoryNoun} dùng đeo tay xem giờ`;

  return `${categoryNoun} loại thông thường dùng thương mại`;
}

// --------------------------------------------------------------------------
// Synthesize 2-3 product variants per LK code
// --------------------------------------------------------------------------

function synthesizeProducts(hs, lkRec, headingNote) {
  const siblings = lkRec.s || [];
  const rawNoun  = extractCategoryNoun(headingNote, siblings);
  // Reject extracted noun if it looks like a failed parse (too long or is a clause)
  const isClause = !rawNoun || rawNoun.length > 40
    || /^loại có|^đồ chứa|^chưa được|^bao gồm|^nhóm này|^những bộ phận|^phân nhóm này/i.test(rawNoun);
  const noun     = isClause ? '' : rawNoun;
  const mat      = extractMaterialHint(hs, siblings);
  const heading  = hs.slice(0, 4);

  // Best available noun: extracted → chapter noun → generic fallback
  const fallbackNoun = noun || chapterNoun(hs) || `Hàng hóa nhóm ${heading}`;
  const products = [];

  // Variant 1: Generic "thông thường" — explicit denials of all key siblings
  products.push({
    tenHang: `${fallbackNoun} thông thường`,
    chatLieu: mat,
    congDung: buildDenialCongDung(fallbackNoun, siblings, headingNote),
  });

  // Variant 2: "Thương mại / phổ thông" — different qualifier, same denial
  if (siblings.length > 0) {
    const phanBiet = truncate(clean(headingNote?.phan_biet || ''), 80);
    products.push({
      tenHang: `${fallbackNoun} phổ thông`,
      chatLieu: mat,
      congDung: buildDenialCongDung(fallbackNoun, siblings.slice(0, 3), headingNote)
               + (phanBiet ? ` — ${phanBiet}` : ''),
    });
  }

  // Variant 3: Material-specific (only if material not already in the noun)
  if (siblings.length >= 3 && mat && !norm(fallbackNoun).includes(norm(mat))) {
    products.push({
      tenHang: `${fallbackNoun} bằng ${mat}`,
      chatLieu: mat,
      congDung: buildDenialCongDung(fallbackNoun, siblings, headingNote),
    });
  }

  return products;
}

// --------------------------------------------------------------------------
// Format lyDo from reasoning engine steps
// Purpose: human-readable, specific, not a template
// --------------------------------------------------------------------------

function formatLyDo(product, result, hs) {
  if (!result.ok || !result.result) {
    return `Thuộc nhóm ${hs.slice(0, 4)} — không khớp với bất kỳ mã cụ thể nào → Loại khác ${hs}`;
  }

  const r = result.result;
  const steps = r.steps;
  const total = steps.length;

  // Standalone (no siblings)
  if (total === 0) {
    return `${product.tenHang}: mã duy nhất trong phân nhóm ${hs.slice(0, 6)} — áp dụng cho toàn bộ hàng thuộc nhóm ${hs.slice(0, 4)} chưa được chi tiết tại nhóm con khác`;
  }

  // Group rejection reasons by mechanism type
  const byType = {
    denial:        steps.filter(s => !s.match && s.reason.includes('không phải')),
    contradiction: steps.filter(s => !s.match && s.reason.includes('Mâu thuẫn')),
    discriminating:steps.filter(s => !s.match && s.reason.includes('chuyên biệt')),
    material:      steps.filter(s => !s.match && s.reason.includes('Chất liệu')),
    keyword:       steps.filter(s => !s.match && (s.reason.includes('Từ khóa') || s.reason.includes('Không tìm'))),
  };

  const parts = [];

  // Lead with the most informative reason type
  if (byType.denial.length > 0) {
    const names = byType.denial.slice(0, 3).map(s => `"${s.siblingName.slice(0, 35)}"`).join(', ');
    parts.push(`Khai báo rõ không phải: ${names}`);
  }
  if (byType.contradiction.length > 0) {
    parts.push(byType.contradiction[0].reason.slice(0, 80));
  }
  if (byType.discriminating.length > 0) {
    const names = byType.discriminating.slice(0, 2).map(s => `"${s.siblingName.slice(0, 30)}"`).join(', ');
    const chars = [...new Set(byType.discriminating.slice(0, 2).map(s => {
      const m = s.reason.match(/"([^"]+)"/);
      return m ? m[1] : '';
    }).filter(Boolean))].join('/', '');
    parts.push(`Thiếu đặc điểm chuyên biệt (${chars || 'xem sibling'}) của: ${names}`);
  }
  if (byType.material.length > 0 && parts.length < 2) {
    parts.push(byType.material[0].reason.slice(0, 80));
  }
  if (byType.keyword.length > 0 && parts.length < 2) {
    const topKw = byType.keyword.slice(0, 2).map(s => `"${s.siblingName.slice(0, 30)}"`).join(', ');
    parts.push(`Không có đặc điểm của: ${topKw}`);
  }

  const conclusionPrefix = r.isLoaiKhac
    ? `${total}/${total} mã cụ thể loại trừ`
    : `Cảnh báo: có thể khớp ${steps.filter(s => s.match).length} mã cụ thể`;

  return `${conclusionPrefix} — ${parts.join('; ')} → Loại khác ${hs}`;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  console.log('Loading data...');
  const idx      = JSON.parse(fs.readFileSync(IDX_PATH, 'utf8'));
  const enriched = JSON.parse(fs.readFileSync(ENR_PATH, 'utf8'));

  const allHs = opts.hs ? [opts.hs] : Object.keys(idx);
  const todo  = opts.dryRun ? allHs.slice(0, 10) : allHs;

  console.log(`Generating corpus for ${todo.length} mã Loại khác...`);

  const out = fs.createWriteStream(opts.dryRun ? '/dev/stdout' : OUT_PATH, { flags: 'w' });
  let total = 0, errors = 0;

  for (const hs of todo) {
    const lkRec      = idx[hs];
    const codeRec    = enriched.codes?.[hs];
    const heading    = hs.slice(0, 4);
    const headingNote = enriched.headings?.[heading] || {};

    if (!lkRec) { errors++; continue; }

    const products = synthesizeProducts(hs, lkRec, headingNote);

    for (const product of products) {
      const result = reasonLoaiKhac(product, hs);
      const lyDo   = formatLyDo(product, result, hs);

      const doc = {
        hs,
        heading,
        tenHang:  product.tenHang,
        chatLieu: product.chatLieu || '',
        congDung: product.congDung,
        lyDo,
        riskLevel: lkRec.r,
        dutyGap:   lkRec.g,
        source: 'formula',
      };

      if (opts.dryRun) {
        console.log(JSON.stringify(doc, null, 2));
        console.log('---');
      } else {
        out.write(JSON.stringify(doc) + '\n');
      }
      total++;
    }
  }

  if (!opts.dryRun) {
    await new Promise(r => out.end(r));
    const sz = (fs.statSync(OUT_PATH).size / 1e6).toFixed(1);
    console.log(`\nHoàn thành: ${total} documents | ${sz}MB → ${OUT_PATH}`);
    console.log(`Errors: ${errors}`);
    console.log(`Avg docs/code: ${(total / todo.length).toFixed(1)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
