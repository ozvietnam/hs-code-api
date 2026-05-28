#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { taxData } = require('../lib/data.js');
const { validatePatch, applyAdminPatch, readAuditLog } = require('../lib/admin-update.js');

try {
  validatePatch({ badField: 1 });
  console.error('FAIL should reject unknown field');
  process.exit(1);
} catch (e) {
  if (e.code !== 'VALIDATION') {
    console.error('FAIL wrong error', e);
    process.exit(1);
  }
}

const hs = Object.keys(taxData)[0];
const prev = taxData[hs].vn;
const result = applyAdminPatch(hs, { nameVi: `${prev} [test]` }, { comment: 'unit test', admin: 'test' });
if (!result.ok || result.hsCode !== hs) {
  console.error('FAIL apply', result);
  process.exit(1);
}

const audit = readAuditLog({ hsCode: hs, limit: 1 });
if (!audit.length || audit[0].hsCode !== hs) {
  console.error('FAIL audit log', audit);
  process.exit(1);
}

applyAdminPatch(hs, { nameVi: prev }, { comment: 'restore', admin: 'test' });
console.log('PASS admin-update', hs);
