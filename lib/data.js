const taxData = require('../data/tax.json');
const searchData = require('../data/search.json');
const notesData = require('../data/notes.json');

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
  normalizeHs,
  getTaxRecord,
  getChapterFromHs,
};
