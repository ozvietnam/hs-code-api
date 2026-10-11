/**
 * Siêu dữ liệu cây cho một dòng 8 số + cây cả chương — nay đọc từ lib/hs-tree.js (#236, 11/10/2026).
 *
 * TRƯỚC: suy cha/anh em theo số gạch ("cùng phân nhóm 6 số và cùng số gạch" = anh em) → nhóm anh em dính nhau qua
 * ranh giới mã (85042111 và 85042192 bị coi là anh em dù khác cha 8504211 / 8504219), tên nhóm lấy từ dòng lá đầu.
 * NAY: cha/anh em theo chữ số của mã (lib/hs-tree.js); tên nhóm từ chú giải nhóm; tiêu đề bị lược thành nút ảo
 * `suyRa: true`. Giữ nguyên tên trường cũ (ERP đang đọc), chỉ THÊM trường.
 */
const { taxData, normalizeHs } = require('./data');
const T = require('./hs-tree');
const { indentationLevel } = require('./gir-specificity');

/** HEADING = dòng chính là nhóm không chia; SUBHEADING = dòng chính là phân nhóm WCO; NATIONAL = dòng quốc gia. */
function levelOf(n) {
  if (!n.laPhanNhom) return 'NATIONAL';
  return n.laPhanNhom.length === 4 ? 'HEADING' : 'SUBHEADING';
}

/** Phân nhóm 6 số chứa dòng (hoặc nhóm 4 số khi nhóm không chia) — nghĩa cũ của `parentSubheadingCode`. */
function subheadingOf(n) {
  const s6 = T.ancestorsOf(n.id).find((a) => a.cap === 6);
  if (s6) return s6.id;
  if (n.laPhanNhom && n.laPhanNhom.length === 6) return n.laPhanNhom;
  return n.id.slice(0, 4);
}

function getTreeMeta(hs) {
  const code = normalizeHs(hs);
  const n = T.nodeOf(code);
  if (!n || n.cap !== 8) {
    return {
      hsCode: code,
      nameVi: taxData[code]?.vn || null,
      indentationLevel: indentationLevel(taxData[code]?.vn),
      parentSubheadingCode: code.slice(0, 6),
      parentCode: null,
      siblingHsCodes: [],
      level: 'NATIONAL',
      treePath: [],
    };
  }
  const sibs = T.siblingsOf(code);
  const parent = T.nodeOf(n.parent);
  return {
    hsCode: code,
    nameVi: taxData[code]?.vn || null,
    indentationLevel: n.gach,
    parentSubheadingCode: subheadingOf(n),
    // MỚI: cha thật theo chữ số (có thể là tiêu đề quốc gia 7 số bị lược tên → parentSuyRa=true)
    parentCode: n.parent,
    parentSuyRa: Boolean(parent?.suyRa),
    siblingHsCodes: sibs.filter((s) => s.cap === 8).map((s) => s.id),
    // MỚI: anh em là tiêu đề (nhóm con) chứ không phải dòng lá
    siblingGroupCodes: sibs.filter((s) => s.cap !== 8).map((s) => s.id),
    level: levelOf(n),
    treePath: T.ancestorsOf(code).map((a) => a.id),
  };
}

const LEVEL_OF_CAP = { 4: 'HEADING', 6: 'SUBHEADING', NHOM_MOT_GACH: 'ONE_DASH_GROUP', TIEU_DE_QG: 'NATIONAL_HEADER' };

function nodeToTree(id) {
  const n = T.nodeOf(id);
  if (!n) return null;
  if (n.cap === 8) {
    const row = taxData[n.id] || {};
    return {
      code: n.id,
      level: levelOf(n),
      indentation: n.gach,
      name: row.vn || n.tenVi,
      unitVi: row.dvt || null,
      hasPolicyWarning: Boolean(row.cs && String(row.cs).trim()),
      children: [],
    };
  }
  return {
    code: n.id,
    level: LEVEL_OF_CAP[n.cap] || 'NATIONAL_HEADER',
    indentation: n.depth,
    name: n.tenVi || n.tenEn || (n.cap === 4 ? `Nhóm ${n.id}` : null),
    nameEn: n.tenEn || null,
    suyRa: Boolean(n.suyRa), // tiêu đề bị lược khi nhập biểu thuế: cấu trúc chắc (theo chữ số), tên chưa có
    children: n.children.map(nodeToTree).filter(Boolean),
  };
}

function countLeaves(nodes) {
  let c = 0;
  for (const x of nodes) c += x.children.length ? countLeaves(x.children) : 1;
  return c;
}

const chapterMetaCache = new Map();
function buildChapterMeta(chapter) {
  const ch = String(parseInt(chapter, 10)).padStart(2, '0');
  if (chapterMetaCache.has(ch)) return chapterMetaCache.get(ch);
  const rows = Object.values(taxData).filter((r) => r.hs.startsWith(ch)).sort((a, b) => a.hs.localeCompare(b.hs));
  const metaIndex = {};
  for (const row of rows) metaIndex[row.hs] = getTreeMeta(row.hs);
  const payload = { chapter: ch, metaIndex, rows };
  chapterMetaCache.set(ch, payload);
  return payload;
}

function buildChapterTree(chapter) {
  const ch = String(parseInt(chapter, 10)).padStart(2, '0');
  const node = T.nodeOf(ch);
  const tree = node ? node.children.map(nodeToTree).filter(Boolean) : [];
  return { chapter: ch, tree, total: countLeaves(tree) };
}

module.exports = { getTreeMeta, buildChapterTree, buildChapterMeta };
