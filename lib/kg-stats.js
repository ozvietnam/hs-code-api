// lib/kg-stats.js — Thống kê tổng quan kho tri thức.
//
// Tách khỏi api/dataset.js để bản TĨNH (scripts/build-static.mjs) và bản API
// dùng CHUNG một hàm. Hai đường sinh ra cùng một con số thì không thể lệch nhau
// — mà lệch số liệu giữa website và file tĩnh là kiểu sai âm thầm khó phát hiện
// nhất khi AI bên ngoài đọc cả hai.

const fs = require('fs');
const { taxData, explanatoryNotesData, precedentsData, conflictsData } = require('./data');
const { loadIndex } = require('./tariff-versions');
const { enrichedEntryCount } = require('./enriched-data');
const { getNotesCoverage } = require('./gir-notes');
const { dataReadPath } = require('./data-paths');

function kgStatsPayload() {
  const rows = Object.values(taxData);
  const chapters = new Set(rows.map((r) => r.hs.slice(0, 2)));
  const withWarnings = rows.filter((r) => r.cs && String(r.cs).trim()).length;
  const enrichedPolicies = enrichedEntryCount();
  const versionIndex = loadIndex();

  const enrichedPath = dataReadPath('tax-enriched.json');
  let lastEnrichedAt = null;
  if (fs.existsSync(enrichedPath)) {
    lastEnrichedAt = fs.statSync(enrichedPath).mtime.toISOString();
  }

  return {
    totalHsCodes: rows.length,
    chapters: chapters.size,
    tariffCoverage: {
      withMfn: rows.filter((r) => r.mfn !== null && r.mfn !== '').length,
      withAcfta: rows.filter((r) => r.acfta !== null && r.acfta !== '').length,
      withVat: rows.filter((r) => r.vat !== null && r.vat !== '').length,
      withNameEn: rows.filter((r) => r.en && String(r.en).trim()).length,
    },
    withWarnings,
    enrichedPolicies,
    explanatoryNotes: Object.keys(explanatoryNotesData).length,
    precedentHsCodes: Object.keys(precedentsData).length,
    conflictHsCodes: Object.keys(conflictsData).length,
    tariffVersions: versionIndex.versions.length,
    currentTariffVersion: versionIndex.current || null,
    lastEnrichedAt,
    notesCoverage: getNotesCoverage(),
  };
}

module.exports = { kgStatsPayload };
