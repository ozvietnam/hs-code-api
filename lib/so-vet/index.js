// lib/so-vet/index.js — M-51 (#1919): Cổng xuất Sổ ghi vết từng bước.
'use strict';

const khuon = require('./khuon');
const kiem = require('./kiem');

module.exports = {
  ...khuon,
  ...kiem,
};
