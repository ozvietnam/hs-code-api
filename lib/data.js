const searchData = require('../data/search.json');
const notesData = require('../data/notes.json');
const fs = require('fs');
const path = require('path');
const { loadJson } = require('./data-cache');
const { dataReadPath } = require('./data-paths');
// #239: tax.json nạp qua data-cache — CÙNG một đối tượng với classify.js/so-tay.js (không còn 3 bản 5,6 MB trong RAM).
const taxData = loadJson(dataReadPath('tax.json'));

function loadOptionalJson(fileName, fallback = {}) {
  const fullPath = path.join(__dirname, '..', 'data', fileName);
  if (!fs.existsSync(fullPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch {
    return fallback;
  }
}

const explanatoryNotesData = loadJson(dataReadPath('explanatory-notes.json'), {}); // #239: dùng chung với explanatory-notes-index.js
// TB-TCHQ đã bị Hải quan sửa đổi, thay thế không được trích làm căn cứ lúc chạy (lib/tien-le-thay-the.js, 07/11/2026).
// precedentsGoc = kho nguyên tệp (bảng hiệu chỉnh và tín hiệu lát 1 trỏ vị trí bản ghi trong tệp); cùng đối tượng bản ghi, không nhân bộ nhớ.
const precedentsGoc = loadOptionalJson('precedents.json', {});
const { data: precedentsData, boRa: precedentsBiThayThe, maChetDaGop: precedentsMaChetDaGop } = require('./tien-le-thay-the').locHieuLuc(precedentsGoc);
const conflictsData = loadOptionalJson('conflicts.json', {});
const iso3166Data = loadOptionalJson('iso-3166-vn.json', { countries: [] });
const unitsTchqData = loadOptionalJson('units-tchq.json', { units: [] });
const chapterRulesData = loadOptionalJson('chapter-specific-rules.json', { chapters: {} });
const antiPatternsData = loadOptionalJson('anti-patterns.json', { patterns: [] });

function normalizeHs(hs) {
  return String(hs || '').replace(/\./g, '').trim().padEnd(8, '0').slice(0, 8);
}

function getTaxRecord(hs) {
  return taxData[normalizeHs(hs)] || null;
}

function getChapterFromHs(hs) {
  return String(parseInt(normalizeHs(hs).slice(0, 2), 10)).padStart(2, '0');
}

module.exports = {
  taxData,
  searchData,
  notesData,
  explanatoryNotesData,
  precedentsData,
  precedentsBiThayThe,
  precedentsMaChetDaGop,
  precedentsGoc,
  conflictsData,
  iso3166Data,
  unitsTchqData,
  chapterRulesData,
  antiPatternsData,
  normalizeHs,
  getTaxRecord,
  getChapterFromHs,
};
