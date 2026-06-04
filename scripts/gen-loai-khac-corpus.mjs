#!/usr/bin/env node
/**
 * gen-loai-khac-corpus.mjs
 *
 * Sinh corpus tìm kiếm cho 3,383 mã "Loại khác" — hoàn toàn từ cấu trúc biểu thuế.
 * Không dùng oz-gold, không dùng AI API.
 *
 * Công thức 4 tầng (GIR Rule 1):
 *   1. Chapter (2 số): phạm vi chương — CHAPTER_NOUN[ch]
 *   2. Heading (4 số): loại hàng cụ thể — từ headingNote.phan_biet / tinh_chat
 *   3. Subheading (6 số): phân nhóm — từ tax.json `en` field (qualifier sau ";")
 *   4. Code (8 số): loại trừ sibling — từ specificSiblings[].vn
 *
 * Với mỗi mã LK:
 *   1. Trích h4Scope từ phan_biet/tinh_chat (phạm vi heading4 dương)
 *   2. Trích h6En từ tax.json `en` (phân nhóm 6 số — tiếng Anh, dùng trong lyDo)
 *   3. Trích categoryNoun từ sibling names / bao_gom (tên loại hàng VN)
 *   4. Build congDung = h4Scope + sibling denials
 *   5. Build lyDo = Ch → H4 → H6 → loại trừ sibs → Loại khác
 *   6. Ghi ra data/loai-khac-corpus.jsonl
 *
 * Usage:
 *   node scripts/gen-loai-khac-corpus.mjs
 *   node scripts/gen-loai-khac-corpus.mjs --dry-run     # 10 mã đầu
 *   node scripts/gen-loai-khac-corpus.mjs --hs 87149290 # 1 mã cụ thể
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT     = path.join(__dirname, '..');
const IDX_PATH = path.join(ROOT, 'data', 'loai-khac-index.json');
const ENR_PATH = path.join(ROOT, 'data', 'loai-khac-enriched.json');
const TAX_PATH = path.join(ROOT, 'data', 'tax.json');
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
// Chapter-level noun and material tables
// --------------------------------------------------------------------------

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

// --------------------------------------------------------------------------
// Level-2: Chapter noun
// --------------------------------------------------------------------------

function chapterNoun(hs) {
  return CHAPTER_NOUN[hs.slice(0, 2)] || '';
}

// --------------------------------------------------------------------------
// Level-4: Heading scope — what this heading covers (positive qualifier)
// Source: phan_biet "Chỉ dùng cho X" pattern (most reliable)
// tinh_chat skipped — often contains garbled OCR fragments
// --------------------------------------------------------------------------

function extractH4Scope(headingNote) {
  if (!headingNote) return '';

  // 1. phan_biet "dùng cho X" / "dành cho X" — explicit positive scope
  const pb = clean(headingNote.phan_biet || '');
  const m = pb.match(/(?:dùng|dành) cho\s+(.{5,100})/i);
  if (m) {
    const raw = m[1]
      .replace(/\([^)]*\)/g, '')   // strip parentheticals like (87.11, 87.12)
      .split(/\.\s+/)[0]            // clip at first sentence boundary
      .replace(/[,\s]+$/, '')
      .trim();
    if (raw.length >= 5 && raw.length <= 100
        && !/^các loại trên|^những loại trên|^nhóm này/i.test(raw)) {
      return raw.slice(0, 80);
    }
  }

  // 2. nhom first sentence — only clean positive descriptions
  const nhomFirst = clean(headingNote.nhom || '')
    .replace(/^\(i\)\s*/i, '')
    .split(/\.\s|\n/)[0].trim();
  if (nhomFirst.length > 15 && nhomFirst.length < 100
      && !/nhóm này|phân nhóm|chú giải|không bao gồm|loại trừ|chúng phải|những loại|tuy nhiên/i.test(nhomFirst.slice(0, 40))) {
    return nhomFirst.slice(0, 80);
  }

  return '';
}

// --------------------------------------------------------------------------
// Level-6: Subheading qualifier — from tax.json `en` field
// Format: "Category; specific qualifier" — extract the qualifier part
// --------------------------------------------------------------------------

function parseEnQualifier(en) {
  if (!en) return '';
  const i = en.indexOf(';');
  if (i < 0) return '';
  const tail = en.slice(i + 1).trim();
  // Skip "n.e.c." / "not elsewhere classified" — these are standalone residuals
  if (/n\.?e\.?c\.?|not elsewhere|not specified/i.test(tail)) return '';
  // Skip pure criteria phrases (not category nouns)
  if (/^parts thereof$|^whether or not|^suitable for use solely/i.test(tail)) return '';
  return tail.slice(0, 80);
}

// --------------------------------------------------------------------------
// Category noun — the VN product type name
// Primary: common prefix of sibling names
// Secondary: bao_gom first clean item
// --------------------------------------------------------------------------

function extractCategoryNoun(headingNote, siblings) {
  // Strategy 1: find common base from sibling names
  if (siblings.length >= 1) {
    const sibNames = siblings
      .map(s => s.v.replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').split(/[;(]/)[0].trim())
      .filter(s => s.length >= 3 && s.length <= 60);

    if (sibNames.length >= 2) {
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

    // Only 1 sibling: strip last keyword if sibling name is short (≤4 words)
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

  return '';
}

// --------------------------------------------------------------------------
// Level-8: Material hint from sibling text + chapter fallback
// --------------------------------------------------------------------------

function extractMaterialHint(hs, siblings) {
  const chapter = hs.slice(0, 2);
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
// Build congDung: h4Scope (positive) + sibling denials (negative)
// This directly mirrors the GIR Rule 1 requirement: must satisfy ALL levels
// --------------------------------------------------------------------------

function buildCongDung(categoryNoun, siblings, headingNote, h4Scope) {
  // Positive base: what this product IS (heading4 scope)
  let base;
  if (h4Scope && h4Scope.length >= 5 && h4Scope.length < 100) {
    // Check if the noun is already embedded in h4Scope
    const n = norm(categoryNoun);
    const s = norm(h4Scope);
    if (categoryNoun && !s.includes(n.slice(0, 6))) {
      base = `${categoryNoun} — ${h4Scope}`;
    } else {
      base = h4Scope;
    }
  } else {
    base = inferBaseUse(categoryNoun, headingNote);
  }

  if (siblings.length === 0) {
    return base + ' — loại thông thường trong phân nhóm này';
  }

  // Negative: sibling exclusions — take top 4, prioritise discriminating keywords
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

  return `${base}, không phải ${denials.join(', không phải ')}`;
}

function inferBaseUse(categoryNoun, headingNote) {
  if (!categoryNoun) return 'sử dụng thông thường trong thương mại';
  const n = norm(categoryNoun);
  if (n.includes('kinh') && n.includes('mat')) return `${categoryNoun} đeo thời trang trang trí`;
  if (n.includes('but') || n.includes('but chi')) return `${categoryNoun} dùng học sinh sinh viên`;
  if (n.includes('cap') || n.includes('day dan')) return `${categoryNoun} dùng kết nối thiết bị điện tử`;
  if (n.includes('den') || n.includes('bong den')) return `${categoryNoun} chiếu sáng thông thường`;
  if (n.includes('dong ho')) return `${categoryNoun} dùng đeo tay xem giờ`;
  return `${categoryNoun} loại thông thường dùng thương mại`;
}

// --------------------------------------------------------------------------
// Build lyDo — full 4-level hierarchical chain (GIR Rule 1)
// Format: Ch.XX (scope) → nhóm XXXX (h4Scope) → phân nhóm XXXXXX [h6En] → loại trừ sibs → Loại khác HS
// --------------------------------------------------------------------------

function buildHierarchicalLyDo(hs, chNoun, h4Scope, h6En, siblings) {
  const ch = hs.slice(0, 2);
  const h4 = hs.slice(0, 4);
  const h6 = hs.slice(0, 6);

  const chain = [];

  chain.push(`Ch.${ch} (${chNoun || 'hàng hóa chương ' + ch})`);

  if (h4Scope) {
    chain.push(`nhóm ${h4} (${h4Scope.slice(0, 60)})`);
  } else {
    chain.push(`nhóm ${h4}`);
  }

  if (h6En) {
    chain.push(`phân nhóm ${h6} [${h6En.slice(0, 60)}]`);
  }

  if (siblings.length > 0) {
    const sibNames = siblings.slice(0, 3)
      .map(s => s.v.replace(/^[-\s]+/, '').replace(/\s*\(SEN\)\s*/i, '').split(/[;(]/)[0].trim().slice(0, 45))
      .join('; ');
    chain.push(`loại trừ: ${sibNames}`);
  } else {
    chain.push(`mã duy nhất trong phân nhóm ${h6} — áp dụng cho toàn bộ hàng nhóm ${h4} chưa được chi tiết`);
  }

  chain.push(`Loại khác ${hs}`);

  return chain.join(' → ');
}

// --------------------------------------------------------------------------
// Synthesize product variants per Loại khác code
// --------------------------------------------------------------------------

function synthesizeProducts(hs, lkRec, headingNote, taxRec) {
  const siblings = lkRec.s || [];
  const heading  = hs.slice(0, 4);

  const rawNoun = extractCategoryNoun(headingNote, siblings);
  const isClause = !rawNoun || rawNoun.length > 40
    || /^loại có|^đồ chứa|^chưa được|^bao gồm|^nhóm này|^những bộ phận|^phân nhóm này/i.test(rawNoun);
  const noun    = isClause ? '' : rawNoun;
  const mat     = extractMaterialHint(hs, siblings);
  const h4Scope = extractH4Scope(headingNote);
  const h6En    = parseEnQualifier(taxRec?.en);

  // When sibling extraction fails (all siblings start with "Dùng cho..." / use-case descriptors),
  // derive noun from h4Scope first qualifier rather than falling back to chapter-level noun.
  // e.g., 87149290: sib = "Dùng cho xe đạp 8712.00.20", h4Scope = "xe đạp, xe máy"
  //   → noun = "Bộ phận xe đạp/xe máy" (more specific than "Phương tiện vận tải")
  let derivedNoun = noun;
  if (!derivedNoun && h4Scope) {
    const allSibsDungCho = siblings.length > 0
      && siblings.every(s => /^[-\s]*(?:dùng|dành|được dùng) cho/i.test(s.v));
    if (allSibsDungCho) {
      // This heading is about parts/accessories — prefix "Bộ phận"
      const h4First = h4Scope.split(/,|;/)[0].trim();
      const isBoPhan = /bộ phận|phụ kiện/i.test(clean(headingNote?.nhom || '') + clean(headingNote?.bao_gom || ''));
      derivedNoun = isBoPhan ? `Bộ phận ${h4First}` : h4First;
    }
  }

  const fallbackNoun = derivedNoun || chapterNoun(hs) || `Hàng hóa nhóm ${heading}`;
  const products = [];

  // Variant 1: standard "thông thường" — explicit denials of all key siblings
  products.push({
    tenHang: `${fallbackNoun} thông thường`,
    chatLieu: mat,
    congDung: buildCongDung(fallbackNoun, siblings, headingNote, h4Scope),
    h4Scope,
    h6En,
  });

  // Variant 2: "phổ thông" — different qualifier, same logic
  if (siblings.length > 0) {
    const phanBiet = truncate(clean(headingNote?.phan_biet || ''), 80);
    products.push({
      tenHang: `${fallbackNoun} phổ thông`,
      chatLieu: mat,
      congDung: buildCongDung(fallbackNoun, siblings.slice(0, 3), headingNote, h4Scope)
               + (phanBiet ? ` — ${phanBiet}` : ''),
      h4Scope,
      h6En,
    });
  }

  // Variant 3: material-specific (only if material not already in the noun)
  if (siblings.length >= 3 && mat && !norm(fallbackNoun).includes(norm(mat))) {
    products.push({
      tenHang: `${fallbackNoun} bằng ${mat}`,
      chatLieu: mat,
      congDung: buildCongDung(fallbackNoun, siblings, headingNote, h4Scope),
      h4Scope,
      h6En,
    });
  }

  return products;
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  console.log('Loading data...');
  const idx      = JSON.parse(fs.readFileSync(IDX_PATH, 'utf8'));
  const enriched = JSON.parse(fs.readFileSync(ENR_PATH, 'utf8'));
  const tax      = JSON.parse(fs.readFileSync(TAX_PATH, 'utf8'));

  const allHs = opts.hs ? [opts.hs] : Object.keys(idx);
  const todo  = opts.dryRun ? allHs.slice(0, 10) : allHs;

  console.log(`Generating corpus for ${todo.length} mã Loại khác (4-level hierarchy formula)...`);

  const out = fs.createWriteStream(opts.dryRun ? '/dev/stdout' : OUT_PATH, { flags: 'w' });
  let total = 0, errors = 0;

  for (const hs of todo) {
    const lkRec      = idx[hs];
    const heading    = hs.slice(0, 4);
    const headingNote = enriched.headings?.[heading] || {};
    const taxRec     = tax[hs];

    if (!lkRec) { errors++; continue; }

    const products = synthesizeProducts(hs, lkRec, headingNote, taxRec);

    for (const product of products) {
      const lyDo = buildHierarchicalLyDo(
        hs,
        chapterNoun(hs),
        product.h4Scope,
        product.h6En,
        lkRec.s || [],
      );

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
