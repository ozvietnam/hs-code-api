#!/usr/bin/env node
/**
 * Đào từ điển "tiếng dân buôn → mã HS" từ 5.156 tờ khai GOLD của Oz.
 *
 * VÌ SAO CẦN: biểu thuế đặt tên hàng theo lời văn pháp lý, không theo cách người
 * khai gọi. Mã đúng cho rất nhiều mặt hàng có tên chính thức là "Loại khác" —
 * không từ khoá nào khớp được. Hệ quả: tra "kính mắt thời trang" ra "thân mũ nón
 * bằng nỉ". Bảng alias này bắc cầu giữa hai thứ tiếng đó.
 *
 * NGUỒN: data/oz-gold-final.jsonl — mô tả hàng thật đã thông quan thật.
 *
 * RIÊNG TƯ: đầu ra CHỈ gồm cụm từ + mã + số lần gặp. KHÔNG mang theo brands,
 * models, sizes, specs hay sampleDesc — đó là chi tiết đơn hàng của khách.
 * Xem scripts/test-hs-aliases.mjs: có test khoá chặt điều này.
 *
 * Chạy: npm run data:build-aliases
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GOLD = join(ROOT, 'data', 'oz-gold-final.jsonl');
const OUT = join(ROOT, 'data', 'hs-aliases.json');

/** Bỏ dấu + hạ chữ thường — cùng quy tắc với lib/search-utils.js. */
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hình thái hàng hoá suy từ chương — dùng để chặn nhầm nguyên liệu với thành phẩm.
 *
 * Ví dụ hỏng nếu không có bảng này: "khuôn nhựa" trong kho Oz trỏ về 84807990
 * (khuôn đúc — THÀNH PHẨM). Nhưng "tấm thép làm khuôn nhựa" là THÉP TẤM
 * (nguyên liệu, chương 72). Gợi ý 8480 cho câu sau là sai một cách tự tin.
 *
 * Chỉ khai những chương chắc chắn. Chương không khai → 'unknown' → không chặn gì.
 */
const CHAPTER_FORM = {
  // Kim loại ở dạng cơ bản: thỏi, tấm, cuộn, thanh, dây
  72: 'material', 74: 'material', 75: 'material', 76: 'material',
  78: 'material', 79: 'material', 80: 'material', 81: 'material',
  // Vật liệu phi kim ở dạng nguyên sinh / bán thành phẩm
  25: 'material', 26: 'material', 27: 'material', 28: 'material',
  29: 'material', 31: 'material', 32: 'material', 38: 'material',
  41: 'material', 44: 'material', 47: 'material', 48: 'material',
  50: 'material', 51: 'material', 52: 'material', 53: 'material',
  54: 'material', 55: 'material',
  // Sản phẩm hoàn chỉnh
  61: 'article', 62: 'article', 63: 'article', 64: 'article', 65: 'article',
  66: 'article', 73: 'article', 82: 'article', 83: 'article', 84: 'article',
  85: 'article', 87: 'article', 90: 'article', 91: 'article', 92: 'article',
  94: 'article', 95: 'article', 96: 'article',
};

/** Chương 39/40 chứa CẢ nguyên liệu lẫn thành phẩm — tách theo nhóm 4 số. */
function formOf(hsCode) {
  const hs = String(hsCode).replace(/\D/g, '');
  const ch = Number(hs.slice(0, 2));
  const heading = Number(hs.slice(0, 4));
  if (ch === 39) return heading <= 3914 ? 'material' : 'article';
  if (ch === 40) return heading <= 4006 ? 'material' : 'article';
  return CHAPTER_FORM[ch] || 'unknown';
}

/**
 * Từ chỉ hàng ở DẠNG NGUYÊN LIỆU.
 *
 * GIỮ NGUYÊN DẤU — bắt buộc. Bỏ dấu thì "thỏi" (nguyên liệu) trùng "thời"
 * (thời trang), "tấm" trùng "tạm", "dải" trùng "dài". Đã dính đúng lỗi này:
 * "kính mắt thời trang" bị chặn oan vì khớp "thoi".
 *
 * Danh sách hẹp và chắc. "dây", "ống", "lưới", "thanh" cố tình KHÔNG có mặt:
 * vừa là nguyên liệu vừa là thành phẩm (dây điện 8544, ống thép 7306), đưa vào
 * sẽ chặn nhầm hàng loạt.
 */
const RAW_FORM_TOKENS = [
  'tấm', 'cuộn', 'phôi', 'thỏi', 'khối', 'dải', 'bột',
  'hạt nhựa', 'nguyên liệu', 'phế liệu', 'dạng tấm', 'dạng cuộn', 'dạng thanh',
];

/**
 * Từ chỉ VẬT LIỆU. Chốt chặn chỉ kích hoạt khi câu hỏi có CẢ từ chỉ dạng
 * nguyên liệu LẪN từ chỉ vật liệu — "tấm thép" thì chặn, "tấm lót sàn" thì không.
 * Phép AND này cắt gần hết báo động giả.
 */
const MATERIAL_WORDS = [
  'thép', 'sắt', 'inox', 'nhôm', 'đồng', 'kẽm', 'chì', 'thiếc', 'niken',
  'titan', 'hợp kim', 'nhựa', 'gỗ', 'kính', 'cao su', 'giấy', 'vải', 'sợi',
];

/** Sinh các cụm con mang nghĩa. Tiếng Việt đặt danh từ chính TRƯỚC, nên cụm
 *  con tính từ đầu câu: "kính mắt thời trang" → "kính mắt", "kính mắt thời". */
function leadingNgrams(phrase, minWords = 2) {
  const words = phrase.split(' ').filter(Boolean);
  if (words.length < minWords) return [];
  const out = [];
  for (let n = minWords; n < words.length; n++) out.push(words.slice(0, n).join(' '));
  return out;
}

function main() {
  if (!existsSync(GOLD)) {
    console.error(`Không thấy ${GOLD}. Cần file GOLD để đào alias.`);
    process.exit(1);
  }
  const gold = readFileSync(GOLD, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

  /** phrase -> Map(hsCode -> { count, exact }) */
  const index = new Map();

  function add(phrase, hsCode, count, exact) {
    if (phrase.length < 4) return;
    if (phrase.split(' ').length > 6) return;
    if (!index.has(phrase)) index.set(phrase, new Map());
    const byHs = index.get(phrase);
    const cur = byHs.get(hsCode) || { count: 0, exact: false };
    cur.count += count;
    cur.exact = cur.exact || exact;
    byHs.set(hsCode, cur);
  }

  for (const g of gold) {
    const hs = String(g.hsCode).replace(/\D/g, '');
    if (hs.length < 8) continue;
    const count = Number(g.ozCount) || 1;
    const full = norm(g.tenHang);
    if (!full) continue;

    add(full, hs, count, true);
    // Cụm con: trọng số thấp hơn (chia 2) vì khái quát hơn nên kém chắc chắn.
    for (const sub of leadingNgrams(full)) add(sub, hs, Math.max(1, Math.round(count / 2)), false);
  }

  const aliases = [];
  for (const [phrase, byHs] of index) {
    const cands = [...byHs.entries()]
      .map(([hsCode, v]) => ({ hsCode, count: v.count, exact: v.exact }))
      .sort((a, b) => b.count - a.count);

    const total = cands.reduce((s, c) => s + c.count, 0);
    const top = cands[0];
    const share = top.count / total;

    // Cụm con chỉ xuất hiện 1 lần và không phải tên đầy đủ → nhiễu, bỏ.
    if (!top.exact && total < 2) continue;

    const forms = [...new Set(cands.slice(0, 3).map((c) => formOf(c.hsCode)))];
    aliases.push({
      phrase,
      hsCode: top.hsCode,
      count: top.count,
      // Độ tập trung: 1.0 = mọi tờ khai cùng một mã. Thấp = cụm từ mơ hồ.
      share: Math.round(share * 100) / 100,
      exact: top.exact,
      form: formOf(top.hsCode),
      // Khai mọi ứng viên khi cụm từ mơ hồ, để người tra tự thấy có lựa chọn khác.
      alternatives: cands.length > 1 ? cands.slice(1, 4).map((c) => ({ hsCode: c.hsCode, count: c.count })) : undefined,
      formsSeen: forms.length > 1 ? forms : undefined,
    });
  }

  aliases.sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));

  const out = {
    meta: {
      note:
        'Từ điển cụm từ thương mại → mã HS, đào từ tờ khai đã thông quan. ' +
        'CHỈ chứa cụm từ + mã + tần suất — không có thông tin khách hàng, giá, hay số tờ khai.',
      source: 'data/oz-gold-final.jsonl',
      sourceRecords: gold.length,
      aliasCount: aliases.length,
      rawFormTokens: RAW_FORM_TOKENS,
      materialWords: MATERIAL_WORDS,
      builtBy: 'scripts/build-hs-aliases.mjs',
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    aliases,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 0));

  const exact = aliases.filter((a) => a.exact).length;
  const ambiguous = aliases.filter((a) => a.share < 0.7).length;
  const chapters = new Set(aliases.map((a) => a.hsCode.slice(0, 2)));
  console.log(`Đã ghi ${OUT}`);
  console.log(`  alias         : ${aliases.length} (${exact} tên đầy đủ, ${aliases.length - exact} cụm con)`);
  console.log(`  mơ hồ (<70%)  : ${ambiguous}`);
  console.log(`  phủ chương    : ${chapters.size}/97`);
  console.log(`  dung lượng    : ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
}

main();
