#!/usr/bin/env node
/**
 * Runtime đọc cây HS mới (#236 bước 1): tree-metadata (tax-mapper, kg_chapter, build-static), hs-breadcrumb
 * (search, tax-lookup, declaration-options), loai-khac-classifier. Giữ trường cũ, giá trị đúng theo chữ số của mã.
 */
import './test-isolate-data.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getTreeMeta, buildChapterTree, buildChapterMeta } = require('../lib/tree-metadata.js');
const { breadcrumbOf, contextOf } = require('../lib/hs-breadcrumb.js');
const { reasonLoaiKhac, namedSiblingLeaves } = require('../lib/loai-khac-classifier.js');
const { taxData } = require('../lib/data.js');

let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass += 1; console.log(`PASS ${name}`); } else { fail += 1; console.log(`FAIL ${name} ${extra}`); } };

// ── tree-metadata ──
{
  const m = getTreeMeta('85044090');
  check('getTreeMeta: anh em thật của 85044090 (cùng cha 850440), không có 85041000', m.siblingHsCodes.join() === '85044020,85044030,85044040' && !m.siblingHsCodes.includes('85041000'), JSON.stringify(m.siblingHsCodes));
  check('getTreeMeta: trường cũ còn nguyên (indentationLevel, parentSubheadingCode, level)', m.indentationLevel === 2 && m.parentSubheadingCode === '850440' && m.level === 'NATIONAL');
  check('getTreeMeta: trường mới parentCode/treePath/siblingGroupCodes', m.parentCode === '850440' && m.treePath.join('>') === 'P:XVI>85>8504>850440' && m.siblingGroupCodes.join() === '8504401');
  const m2 = getTreeMeta('85042111');
  check('getTreeMeta: 85042111 cha là tiêu đề quốc gia 8504211 (suyRa), anh em chỉ 85042119', m2.parentCode === '8504211' && m2.parentSuyRa === true && m2.siblingHsCodes.join() === '85042119' && m2.parentSubheadingCode === '850421', JSON.stringify(m2));
  check('getTreeMeta: dòng là chính phân nhóm → SUBHEADING; nhóm không chia → HEADING', getTreeMeta('85393200').level === 'SUBHEADING' && getTreeMeta(Object.keys(taxData).find((c) => c.endsWith('0000'))).level === 'HEADING');
  check('getTreeMeta: mã không có → vẫn trả shape, siblings rỗng', getTreeMeta('99999999').siblingHsCodes.length === 0 && getTreeMeta('99999999').level === 'NATIONAL');
}
{
  const t = buildChapterTree('85');
  const n85 = Object.keys(taxData).filter((c) => c.startsWith('85')).length;
  check('buildChapterTree: tổng số lá = số dòng chương 85', t.total === n85, `${t.total} vs ${n85}`);
  const h8504 = t.tree.find((x) => x.code === '8504');
  check('buildChapterTree: tên nhóm từ chú giải nhóm, không phải dòng lá đầu', /^Máy biến điện/.test(h8504.name) && h8504.level === 'HEADING');
  const g = h8504.children.find((x) => x.code === '85042');
  check('buildChapterTree: nút ảo nhóm một gạch + phân nhóm WCO có tên tiếng Anh', g && g.level === 'ONE_DASH_GROUP' && g.suyRa === true && g.children[0].code === '850421' && /transformer/i.test(g.children[0].nameEn));
  const hdr = g.children[0].children.find((x) => x.code === '8504211');
  check('buildChapterTree: tiêu đề quốc gia 8504211 chứa 85042111/85042119, lá giữ trường cũ', hdr && hdr.level === 'NATIONAL_HEADER' && hdr.children.map((c) => c.code).join() === '85042111,85042119' && 'unitVi' in hdr.children[0] && 'hasPolicyWarning' in hdr.children[0]);
  check('buildChapterTree: chương không có → rỗng', buildChapterTree('77').total === 0);
  check('buildChapterMeta: metaIndex có mọi dòng', Object.keys(buildChapterMeta('85').metaIndex).length === n85);
}

// ── hs-breadcrumb ──
{
  const b = breadcrumbOf('85044090');
  check('breadcrumb: tên tiếng Việt chương + nhóm trong trail', /Chương 85: Máy điện/.test(b.trail) && /Nhóm 8504: Máy biến điện/.test(b.trail), b.trail.slice(0, 200));
  check('breadcrumb: phân nhóm WCO + trường cũ (subheadingEn, isResidual, levels)', /Static converters/i.test(b.subheadingEn) && b.isResidual === true && b.levels.length === 5);
  check('breadcrumb: trường mới path/parentId/siblingHsCodes/anhEmCoTen', b.path.join('>') === 'P:XVI>85>8504>850440' && b.parentId === '850440' && b.siblingHsCodes.includes('85044020') && b.anhEmCoTen.includes('8504401') && b.toTienCoTen === '850440');
  const b2 = breadcrumbOf('85042119');
  check('breadcrumb: tiêu đề bị lược hiện trong levels, parentSuyRa=true', b2.levels.some((l) => /Tiêu đề 8504211/.test(l)) && b2.parentSuyRa === true);
  check('breadcrumb: mã cụt / không tồn tại → null; mã thường không có ngữ cảnh dư', breadcrumbOf('7225') === null && breadcrumbOf('99999999') === null && contextOf('96170010') === null);
  const n = breadcrumbOf('96170010');
  check('breadcrumb: mã có tên mô tả → không residual, vẫn có trail', n.isResidual === false && Boolean(n.trail));
}

// ── loai-khac-classifier ──
{
  const sibs = namedSiblingLeaves('85044090');
  check('classifier: anh em có tên của 85044090 theo cây (lá dưới tiêu đề 8504401 + 3 dòng cùng cha), không có 85041000, không có LK trần 85044019', sibs.join() === '85044011,85044020,85044030,85044040', JSON.stringify(sibs));
  check('classifier: anh em có tên của 85044019 chỉ là 85044011 (cùng tiêu đề 8504401)', namedSiblingLeaves('85044019').join() === '85044011', JSON.stringify(namedSiblingLeaves('85044019')));
  const r = reasonLoaiKhac({ tenHang: 'Bộ nghịch lưu năng lượng mặt trời', chatLieu: 'nhôm', congDung: 'đổi điện DC sang AC' }, '85044090');
  check('classifier: hai ứng viên LK trong 850440, kết quả có cha + cờ anhEmTheoCay', r.allCandidates === 2 && ['850440', '8504401'].includes(r.result.cha) && r.result.anhEmTheoCay === true, JSON.stringify({ n: r.allCandidates, cha: r.result.cha }));
  const r2 = reasonLoaiKhac({ tenHang: 'Máy biến đổi đo lường 5 kVA 110 kV', chatLieu: 'thép', congDung: 'đo lường' }, '85042119');
  check('classifier: 85042119 chỉ có một anh em 85042111 (theo cây), không lẫn 8504219x', r2.result.steps.map((s) => s.siblingHs).join() === '85042111', JSON.stringify(r2.result.steps.map((s) => s.siblingHs)));
  check('classifier: không có mã → ok:false', reasonLoaiKhac({ tenHang: 'x' }, '99999999').ok === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
