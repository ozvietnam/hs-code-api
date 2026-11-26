// lib/notes-coverage.js — M-21 (#1908): Kiểm độ phủ chú giải trực tiếp trên kho luật gốc (lib/chu-giai-goc.js).
'use strict';

const { kiemDoPhuKhoGoc } = require('./chu-giai-goc');

const NARRATIVE_CAP = 1990;

function notesCoverage(hs) {
  return kiemDoPhuKhoGoc(hs);
}

function notesCoverageWarning(hs) {
  if (!hs) return null;
  const cov = notesCoverage(hs);
  if (cov.complete) return null;
  return {
    id: 'notes-incomplete',
    description: `Căn cứ chú giải cho ${hs} chưa đầy đủ: ${cov.gaps.map((g) => g.description).join(' ')}`,
    fix: 'Đối chiếu Chú giải chi tiết HS bản đầy đủ trước khi chốt mã hoặc dùng làm căn cứ giải trình.',
  };
}

module.exports = { notesCoverage, notesCoverageWarning, NARRATIVE_CAP };
