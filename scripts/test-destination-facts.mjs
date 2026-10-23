// Test /api/destination-facts — dữ liệu nước đích (Qatar/GCC đầu tiên) cho ca giao thẳng nước thứ ba (#413)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (name, cond, detail = '') => { if (cond) { passed++; console.log('PASS', name); } else { failed++; console.error('FAIL', name, detail); } };

const handler = require('../api/destination-facts.js');


const mock = () => {
  const h = {};
  return {
    status(code) { this.__code = code; return this; },
    json(body) { this.__body = JSON.stringify(body); return this; },
    setHeader(k, v) { h[k] = v; },
    getHeader(k) { return h[k]; },
    end() {},
    __h: h,
  };
};
const run = async (query = '') => {
  const res = mock();
  await handler({ method: 'GET', url: `http://localhost/api/destination-facts${query}`, headers: {} }, res);
  return { code: res.__code, body: JSON.parse(res.__body || '{}') };
};

const ds = await run();
check('danh sách: trả 200 kèm Qatar', ds.code === 200 && ds.body.danh_sach?.some((x) => x.khoa === 'qatar'), JSON.stringify(ds.body).slice(0, 200));
check('luật: mọi phản hồi kèm cảnh báo dữ liệu = điểm khởi đầu, không phải căn cứ chốt', /điểm khởi đầu/i.test(ds.body.canh_bao || ''));

const q = await run('?quocGia=qatar');
check('qatar: found:true + 5% CIF + GCC C/O → 0%', q.body.found === true && q.body.thue_nhap_chuan?.muc === '5%' && JSON.stringify(q.body.uu_dai).includes('0%'), JSON.stringify(q.body).slice(0, 300));
check('qatar: chứng từ có CI + C/O + chứng thực', /chứng thực/i.test((q.body.chung_tu_yeu_cau || []).join(' ')));
check('qatar: có nguồn dẫn kèm', (q.body.nguon || []).length >= 1);

const miss = await run('?quocGia=atlantis');
check('nước chưa có: found:false + hướng mở issue, không lỗi 500', miss.body.found === false && miss.code === 200);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
