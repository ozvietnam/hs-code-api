#!/usr/bin/env node
// scripts/test-dieu-kien-soi-chong.mjs — M-81 (#2410, ADR-0008): kiểm thử toàn diện khâu soi độc lập soi-chong.mjs.
// Dùng http.createServer lắng nghe 127.0.0.1:0 trong os.tmpdir(), không gọi mạng ngoài, không đụng data/ho-so-ma/.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as soiMod from './ho-so-ma/soi-chong.mjs';
import {
  MO_HINH_SOI_MAC_DINH,
  HE_SOI_CHONG,
  docCauHinhSoi,
  chuanUrlSoi,
  goiMoHinhSoi,
  dungLoiHoiSoiBang,
  hauKiemKetQuaSoiBang,
  soiBangAnhEm,
  soiNhom4,
  ghiVungChongJsonl,
} from './ho-so-ma/soi-chong.mjs';
import { chayCong, napLuatCong, vanTay } from './ho-so-ma/cong.mjs';
import { napBieuMeta, sinhBangAnhEm, taoBangChoCha } from './ho-so-ma/bang-anh-em.mjs';
import { tepCuaNutKhuon, THU_MUC_DIEU_KIEN } from './ho-so-ma/khuon.mjs';
import { dungGoiNhom } from './ho-so-ma/goi-nhom.mjs';

const GOC = fileURLToPath(new URL('..', import.meta.url));
const LUAT_THAT = path.join(GOC, 'data/luat-goc');
const SCRIPT_SOI = path.join(GOC, 'scripts/ho-so-ma/soi-chong.mjs');

let passed = 0;
let failed = 0;
function kiem(ten, ok, chiTiet = '') {
  if (ok) {
    passed += 1;
    console.log(`PASS ${ten}`);
  } else {
    failed += 1;
    const msg = chiTiet ? ` — ${(typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet)).slice(0, 500)}` : '';
    console.log(`FAIL ${ten}${msg}`);
  }
}

async function batLoiAsync(fn) {
  try {
    await fn();
    return null;
  } catch (err) {
    return err;
  }
}

function moMayChuHttp(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        port: addr.port,
        baseUrl: `http://127.0.0.1:${addr.port}`,
        dong: () => new Promise((res) => server.close(() => res())),
      });
    });
  });
}

function docBodyReq(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function chayCliAsync(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env: opts.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

// ── 1. Kho luật thu gọn trong os.tmpdir() (CHỈ dùng nhóm an toàn: 8543, 8501, 4202, 0201) ──
const TAM = fs.mkdtempSync(path.join(os.tmpdir(), 'm81-soi-chong-'));
const LUAT = path.join(TAM, 'luat-goc');

const CHON_ID_AN_TOAN = (id) => (
  id === 'gir:3:b'
  || ['phan:I', 'phan:VIII', 'phan:XVI'].includes(id)
  || ['chuong:02', 'chuong:39', 'chuong:42', 'chuong:85'].includes(id)
  || id === 'chuong:39:cg:1'
  || id === 'bieu:02' || id === 'bieu:42' || id === 'bieu:85'
  || /^bieu:0201/.test(id)
  || id === 'bieu:4202' || /^bieu:42022/.test(id)
  || id === 'bieu:8501' || id === 'bieu:850110' || id === 'bieu:850110:td1' || /^bieu:8501102/.test(id)
  || id === 'bieu:8543' || /^bieu:854370/.test(id)
  || id === 'bieu:8479'
  || /^nhom:8479:ct:[1-7]$/.test(id)
  || /^nhom:(0201|8501):/.test(id)
  || /^pn:4202/.test(id)
  || /^chuong:(02|42):(kq|cg):/.test(id)
);

const docDong = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()) : []);
function taoKhoLuatTam(dir, chonFn) {
  fs.mkdirSync(path.join(dir, 'cau'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'nghia-canh'), { recursive: true });
  const daChon = new Set();
  for (const kho of ['phan', 'chuong', 'bieu', 'nhom', 'phan-nhom', 'gir', 'sen']) {
    const lines = docDong(path.join(LUAT_THAT, `${kho}.jsonl`)).filter((l) => {
      const o = JSON.parse(l);
      if (chonFn(o.id)) { daChon.add(o.id); return true; }
      return false;
    });
    fs.writeFileSync(path.join(dir, `${kho}.jsonl`), `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
    const cauPath = path.join(LUAT_THAT, 'cau', `${kho}.jsonl`);
    const cauLines = fs.existsSync(cauPath)
      ? docDong(cauPath).filter((l) => daChon.has(JSON.parse(l).id.split('#')[0]))
      : [];
    fs.writeFileSync(path.join(dir, 'cau', `${kho}.jsonl`), `${cauLines.join('\n')}${cauLines.length ? '\n' : ''}`, 'utf8');
  }
  fs.copyFileSync(path.join(LUAT_THAT, 'phan-chuong-nhom.json'), path.join(dir, 'phan-chuong-nhom.json'));
}
taoKhoLuatTam(LUAT, CHON_ID_AN_TOAN);

const L = napLuatCong(LUAT);
const bieuMeta = napBieuMeta(LUAT);

const taoDk = (nut, stt, ve, phu, kieu, mo, cauHoi, trich, nguon, extra = {}) => ({
  id: `hs:${nut}:${8100 + stt}`,
  nut,
  loai: 'DIEU_KIEN',
  ve,
  phu,
  kieu,
  ...extra,
  mo,
  cauHoi,
  trich,
  nguon,
  vanTay: vanTay(L.chuCau(nguon)),
});

let demHoSo = 0;
function ghiHoSoTam({ dkList = [], gcList = [], nguongList = [], sinhBangChuong = [] } = {}) {
  demHoSo += 1;
  const goc = path.join(TAM, `ho-so-${demHoSo}`);
  const theoTep = new Map();
  const day = (tepRel, rec) => {
    if (!theoTep.has(tepRel)) theoTep.set(tepRel, []);
    theoTep.get(tepRel).push(JSON.stringify(rec));
  };
  for (const r of dkList) {
    const ch = tepCuaNutKhuon(r.nut, THU_MUC_DIEU_KIEN);
    day(`dieu-kien/${ch}.jsonl`, r);
  }
  for (const g of gcList) {
    const ch = tepCuaNutKhuon(g.nut, THU_MUC_DIEU_KIEN);
    day(`dieu-kien/${ch}-giai-chong.jsonl`, g);
  }
  for (const n of nguongList) {
    const ch = tepCuaNutKhuon(n.nut, 'nguong');
    day(`nguong/${ch}.jsonl`, n);
  }
  for (const [rel, lines] of theoTep.entries()) {
    const abs = path.join(goc, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, `${lines.join('\n')}\n`, 'utf8');
  }
  for (const ch of sinhBangChuong) {
    sinhBangAnhEm({ chuong: ch, chiNhomCoDieuKien: true, luat: LUAT, hoSo: goc, ghi: true });
  }
  return goc;
}

// ── 2. Kiểm đầu nối rút-cắm, vệ sinh lời nhắc và chuẩn hoá cấu hình ──
{
  const dsExportCanCo = [
    'MO_HINH_SOI_MAC_DINH',
    'HE_SOI_CHONG',
    'docCauHinhSoi',
    'chuanUrlSoi',
    'goiMoHinhSoi',
    'dungLoiHoiSoiBang',
    'hauKiemKetQuaSoiBang',
    'soiBangAnhEm',
    'soiNhom4',
    'ghiVungChongJsonl',
  ];
  kiem(
    'exports: xuất đầy đủ 10 đầu nối ESM bắt buộc và MO_HINH_SOI_MAC_DINH = gemma4:31b',
    dsExportCanCo.every((k) => k in soiMod) && MO_HINH_SOI_MAC_DINH === 'gemma4:31b',
  );

  const reTuCam = new RegExp('\\bv(?:a|\\u00e0)ng\\b', 'iu');
  kiem(
    'HE_SOI_CHONG: lời nhắc hẹp đủ 3 mục (chong, ho, saiPhamViVe0), cấm "Loại khác", không chứa chữ bị cấm',
    HE_SOI_CHONG.includes('"chong"')
    && HE_SOI_CHONG.includes('"ho"')
    && HE_SOI_CHONG.includes('"saiPhamViVe0"')
    && /Loại khác/.test(HE_SOI_CHONG)
    && !reTuCam.test(HE_SOI_CHONG),
  );

  const uOllama1 = chuanUrlSoi('http://127.0.0.1:11434');
  const uOllama2 = chuanUrlSoi('http://127.0.0.1:11434/api/chat/');
  const uOpenAi1 = chuanUrlSoi('http://127.0.0.1:8080/v1');
  const uOpenAi2 = chuanUrlSoi('http://127.0.0.1:8080/v1/chat/completions');
  kiem(
    'chuanUrlSoi: phân biệt chính xác Ollama /api/chat và OpenAI-compatible /v1/chat/completions',
    uOllama1.kieu === 'ollama' && uOllama1.endpoint === 'http://127.0.0.1:11434/api/chat'
    && uOllama2.kieu === 'ollama' && uOllama2.endpoint === 'http://127.0.0.1:11434/api/chat'
    && uOpenAi1.kieu === 'openai' && uOpenAi1.endpoint === 'http://127.0.0.1:8080/v1/chat/completions'
    && uOpenAi2.kieu === 'openai' && uOpenAi2.endpoint === 'http://127.0.0.1:8080/v1/chat/completions',
  );

  const cfgFallbackOllama = docCauHinhSoi({}, {
    OLLAMA_URL: 'http://127.0.0.1:11434',
    ANTHROPIC_API_KEY: 'gia-lap-khoa-anthropic-khong-doc',
    CLAUDE_API_KEY: 'gia-lap-khoa-claude-khong-doc',
    OPENAI_API_KEY: 'gia-lap-khoa-openai-khong-doc',
  });
  kiem(
    'docCauHinhSoi: nhận fallback OLLAMA_URL, mặc định gemma4:31b, phớt lờ ANTHROPIC_API_KEY/OPENAI_API_KEY',
    cfgFallbackOllama.endpoint === 'http://127.0.0.1:11434/api/chat'
    && cfgFallbackOllama.model === 'gemma4:31b'
    && cfgFallbackOllama.apiKey === ''
    && cfgFallbackOllama.timeoutMs === 120_000
    && cfgFallbackOllama.soLanThuLai === 2,
  );
}

// ── 3. Ca dương đầy đủ (Ollama /api/chat) + lọc "Loại khác" & GIAI_CHONG + nối thẳng Cổng 8 ──
{
  const dk8543 = [
    taoDk('bieu:8543', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải máy hoặc thiết bị điện có chức năng riêng không?', 'Máy và thiết bị điện, có chức năng riêng', 'bieu:8543#1'),
    taoDk('bieu:854370', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy và thiết bị khác thuộc phân nhóm 8543.70 không?', 'Máy và thiết bị khác', 'bieu:854370#1', { moNguon: 'bieu:854370#1' }),
    taoDk('bieu:85437010', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy cung cấp năng lượng cho hàng rào điện không?', 'Máy cung cấp năng lượng cho hàng rào điện', 'bieu:85437010#1', { moNguon: 'bieu:85437010#1' }),
    taoDk('bieu:8543702', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị điều khiển từ xa không dùng sóng radio không?', 'Thiết bị điều khiển từ xa, trừ thiết bị điều khiển từ xa bằng sóng radio', 'bieu:8543702#1', { moNguon: 'bieu:8543702#1' }),
    taoDk('bieu:85437021', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải điều khiển từ xa hồng ngoại không dây cho máy chơi trò chơi điện tử video không?', 'Thiết bị điều khiển từ xa hồng ngoại không dây dùng cho máy chơi trò chơi điện tử video', 'bieu:85437021#1', { moNguon: 'bieu:85437021#1' }),
    taoDk('bieu:85437030', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có chức năng phiên dịch hoặc từ điển không?', 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển', 'bieu:85437030#1', { moNguon: 'bieu:85437030#1' }),
    taoDk('bieu:85437040', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy tách bụi hoặc khử tĩnh điện chế tạo PCB/PWB/PCA không?', 'Máy tách bụi hoặc khử tĩnh điện trong quá trình chế tạo tấm mạch PCB/PWBs(1) hoặc PCAs(1)', 'bieu:85437040#1', { moNguon: 'bieu:85437040#1' }),
    taoDk('bieu:85437040', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy đóng rắn vật liệu bằng tia cực tím sản xuất PCB/PWB/PCA không?', 'máy làm đóng rắn vật liệu bằng tia cực tím dùng trong sản xuất tấm mạch PCB/PWBs(1) hoặc PCAs(1)', 'bieu:85437040#1', { moNguon: 'bieu:85437040#1' }),
    taoDk('bieu:85437050', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải bộ khuếch đại vi sóng không?', 'Bộ khuếch đại vi sóng', 'bieu:85437050#1'),
    taoDk('bieu:85437050', 2, 2, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải máy ghi dữ liệu chuyến bay kỹ thuật số không?', 'máy ghi dữ liệu chuyến bay kỹ thuật số', 'bieu:85437050#1', { moNguon: 'bieu:85437050#1' }),
    taoDk('bieu:85437050', 3, 3, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải đầu đọc điện tử di động chạy pin đọc/tái tạo văn bản, hình ảnh, âm thanh không?', 'đầu đọc điện tử di động hoạt động bằng pin để ghi và tái tạo văn bản, hình ảnh tĩnh hoặc tệp âm thanh', 'bieu:85437050#1', { moNguon: 'bieu:85437050#1' }),
    taoDk('bieu:85437060', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải thiết bị xử lý tín hiệu số kết nối mạng để trộn âm thanh không?', 'Thiết bị xử lý tín hiệu kỹ thuật số có khả năng kết nối với mạng có dây hoặc không dây để trộn âm thanh', 'bieu:85437060#1', { moNguon: 'bieu:85437060#1' }),
    taoDk('bieu:85437060', 2, 2, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có được thiết kế đặc biệt để kết nối với thiết bị/mạng điện tín hoặc điện thoại không?', 'các sản phẩm được thiết kế đặc biệt để kết nối với thiết bị hoặc dụng cụ điện tín hoặc điện thoại hoặc với mạng điện tín hoặc điện thoại', 'bieu:85437060#1'),
    {
      id: 'hs:bieu:8543:8190',
      nut: 'bieu:8543',
      loai: 'CANH_TRANH',
      nhomCanhTranh: ['bieu:8479', 'bieu:8543'],
      phepThu: ['nhom:8479:ct:5#1', 'nhom:8479:ct:6#1'],
      trich: 'Không thể phân loại trong bất kỳ một nhóm cụ thể nào khác của chương này',
      nguon: 'nhom:8479:ct:4#1',
      vanTay: vanTay(L.chuCau('nhom:8479:ct:4#1')),
    },
  ];
  const gc8543 = [
    {
      id: 'hs:bieu:854370:8181',
      nut: 'bieu:854370',
      loai: 'GIAI_CHONG',
      cap: ['bieu:85437010', 'bieu:85437030'],
      cach: 'CHU_GIAI',
      trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển',
      nguon: 'bieu:85437030#1',
      vanTay: vanTay(L.chuCau('bieu:85437030#1')),
    },
  ];
  const hoSo8543 = ghiHoSoTam({ dkList: dk8543, gcList: gc8543, sinhBangChuong: ['85'] });

  const reqNhanDuoc = [];
  const srv = await moMayChuHttp(async (req, res) => {
    const raw = await docBodyReq(req);
    const body = JSON.parse(raw);
    reqNhanDuoc.push({ url: req.url, headers: req.headers, body });
    const userPrompt = body.messages?.[1]?.content || '';
    const laBang854370 = userPrompt.includes('NÚT CHA ĐANG SOI: bieu:854370\n') || userPrompt.includes('NÚT CHA ĐANG SOI: bieu:854370 ');
    const kq = laBang854370
      ? {
        chong: [
          // (a) Cặp chồng thật cần giữ lại
          {
            a: '8543.70.30',
            b: 'bieu:85437050',
            matHang: 'Máy từ điển điện tử bỏ túi chạy pin vừa tra từ điển vừa đọc văn bản và phát tệp âm thanh',
            lyDo: 'Cả điều kiện chức năng từ điển (.30) và đầu đọc điện tử di động chạy pin (.50) đều thoả, chưa có GIAI_CHONG',
            nguon: 'bieu:85437050#1',
            trich: 'đầu đọc điện tử di động hoạt động bằng pin để ghi và tái tạo văn bản, hình ảnh tĩnh hoặc tệp âm thanh',
          },
          // (b) Lỗi THỪA kinh điển: cặp dính dòng "Loại khác" thuần 8543.70.90 -> máy phải tự lọc bỏ
          {
            a: 'bieu:85437030',
            b: 'bieu:85437090',
            matHang: 'Máy phiên dịch cầm tay loại khác',
            lyDo: 'Nhầm dòng Loại khác thuần là chồng',
            nguon: 'bieu:85437030#1',
            trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển',
          },
          // (c) Cặp đã có GIAI_CHONG trong kho -> máy phải tự lọc bỏ
          {
            a: 'bieu:85437010',
            b: 'bieu:85437030',
            matHang: 'Thiết bị giả định đã giải chồng',
            lyDo: 'Đã có GIAI_CHONG',
            nguon: 'bieu:85437030#1',
            trich: 'Máy, thiết bị điện có chức năng phiên dịch hoặc từ điển',
          },
          // (d) Cặp không phải con trực tiếp của 854370 (85437021 là con của 8543702) -> máy phải tự lọc bỏ
          {
            a: 'bieu:85437030',
            b: 'bieu:85437021',
            matHang: 'Tay cầm điều khiển có từ điển',
            lyDo: 'Lệch cấp cây',
            nguon: 'bieu:85437021#1',
            trich: 'Thiết bị điều khiển từ xa hồng ngoại không dây',
          },
          // (e) Trích tiền lệ tb: bị cấm -> máy phải tự lọc bỏ
          {
            a: 'bieu:85437050',
            b: 'bieu:85437060',
            matHang: 'Bộ trộn âm thanh vi sóng',
            lyDo: 'Dẫn nguồn tiền lệ cấm',
            nguon: 'tb:123:8543#1',
            trich: 'mẫu tiền lệ',
          },
        ],
        ho: [],
        saiPhamViVe0: [],
      }
      : {
        // Bảng 8543702: giả lập phát hiện hở phủ
        chong: [],
        ho: [
          {
            matHang: 'Điều khiển từ xa bằng tia laser cho cửa công nghiệp',
            lyDo: 'Thuộc thiết bị điều khiển từ xa không dùng sóng radio của 8543.70.2',
            nguon: 'bieu:8543702#1',
            trich: 'Thiết bị điều khiển từ xa, trừ thiết bị điều khiển từ xa bằng sóng radio',
          },
        ],
        saiPhamViVe0: [],
      };

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: { role: 'assistant', content: JSON.stringify(kq) } }));
  });

  try {
    const tepVc = path.join(TAM, 'vung-chong-8543.jsonl');
    const tepBaoCao = path.join(TAM, 'bao-cao-8543.json');
    const bc = await soiNhom4('85.43', {
      url: srv.baseUrl,
      luat: LUAT,
      hoSo: hoSo8543,
      L,
      bieuMeta,
      ghiVungChong: tepVc,
      ra: tepBaoCao,
    });

    kiem(
      'Ollama /api/chat: gửi đúng payload stream=false, format="json", num_ctx=32768, không gắn Authorization khi không đặt khoá, lời hỏi 0 có tb:/wco:',
      reqNhanDuoc.length === 2
      && reqNhanDuoc.every((r) => (
        r.url === '/api/chat'
        && r.headers.authorization === undefined
        && r.body.model === 'gemma4:31b'
        && r.body.stream === false
        && r.body.format === 'json'
        && r.body.options?.num_ctx === 32768
        && r.body.options?.temperature === 0.1
        && !/\b(?:tb|wco):/i.test(r.body.messages?.[1]?.content || '')
      )),
      reqNhanDuoc[0]?.body,
    );

    kiem(
      'Ollama /api/chat: giữ đúng cặp VUNG_CHONG thật kèm trichHopLe=true + giữ hoPhuDeXuat; lọc sạch "Loại khác" thuần, GIAI_CHONG, lệch cấp và tb:',
      bc.vungChongDeXuat.length === 1
      && bc.vungChongDeXuat[0].nut === 'bieu:854370'
      && bc.vungChongDeXuat[0].cap[0] === 'bieu:85437030'
      && bc.vungChongDeXuat[0].cap[1] === 'bieu:85437050'
      && bc.vungChongDeXuat[0].trichHopLe === true
      && bc.vungChongDeXuat[0].nguonPhatHien === 'soi-chong (gemma4:31b)'
      && bc.hoPhuDeXuat.length === 1
      && bc.hoPhuDeXuat[0].nut === 'bieu:8543702'
      && bc.hoPhuDeXuat[0].trichHopLe === true
      && bc.boQua.length === 4,
      { vc: bc.vungChongDeXuat, ho: bc.hoPhuDeXuat, boQua: bc.boQua },
    );

    const dsVcTuTep = docDong(tepVc).map((l) => JSON.parse(l));
    const congTruoc = chayCong({
      luat: LUAT,
      hoSo: hoSo8543,
      phamVi: ['8543'],
      chiTrong: true,
      cong: [8],
      L,
      bieuMeta,
      vungChong: [],
    });
    const congSau = chayCong({
      luat: LUAT,
      hoSo: hoSo8543,
      phamVi: ['8543'],
      chiTrong: true,
      cong: [8],
      L,
      bieuMeta,
      vungChong: dsVcTuTep,
    });
    kiem(
      'Tích hợp Cổng 8: tệp .jsonl do ghiVungChongJsonl xuất truyền thẳng vào chayCong(cong:[8]) làm Cổng 8 ĐỎ đúng cặp chưa có GIAI_CHONG',
      congTruoc.cong[8].loi.length === 0
      && congSau.cong[8].loi.length === 1
      && congSau.cong[8].loi[0].includes('bieu:854370: VUNG_CHONG giữa bieu:85437030 và bieu:85437050 chưa có GIAI_CHONG trích luật')
      && fs.existsSync(tepBaoCao),
      { truoc: congTruoc.cong[8].loi, sau: congSau.cong[8].loi },
    );
  } finally {
    await srv.dong();
  }
}

// ── 4. Chế độ OpenAI-compatible (/v1/chat/completions) + lọc cả cặp truAnhEm lẫn haiNutRoiNhau ──
{
  const dk0201 = [
    taoDk('bieu:0201', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Có phải thịt động vật họ trâu bò tươi hoặc ướp lạnh không?', 'Thịt của động vật họ trâu bò, tươi hoặc ướp lạnh', 'bieu:0201#1', { moNguon: 'nhom:0201:ct:1#1' }),
    taoDk('bieu:020110', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Có phải thịt cả con hoặc nửa con không?', 'Thịt cả con và nửa con', 'bieu:020110#1', { moNguon: 'chuong:02:kq:2#1' }),
    taoDk('bieu:020120', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có xương không?', 'Thịt pha có xương khác', 'bieu:020120#1', { moNguon: 'chuong:02:kq:34#1' }),
    taoDk('bieu:020130', 1, 1, true, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có xương không?', 'Thịt lọc không xương', 'bieu:020130#1', { moNguon: 'chuong:02:kq:34#1' }),
  ];
  const hoSo0201 = ghiHoSoTam({ dkList: dk0201 });

  let reqOpenAi = null;
  const srvOpenAi = await moMayChuHttp(async (req, res) => {
    const raw = await docBodyReq(req);
    reqOpenAi = { url: req.url, headers: req.headers, body: JSON.parse(raw) };
    const kq = {
      chong: [
        // (a) Cặp chồng thật cần giữ lại: 020110 × 020130 (020130 không có chữ "khác" nên không có truAnhEm lên 020110)
        {
          a: 'bieu:020110',
          b: 'bieu:020130',
          matHang: 'Thịt bò tươi nguyên nửa con đã rút toàn bộ xương',
          lyDo: '0201.30 mới hỏi không xương mà chưa loại trừ thịt cả con/nửa con thuộc 0201.10',
          nguon: 'bieu:020130#1',
          trich: 'Thịt lọc không xương',
        },
        // (b) Cặp đã loại trừ phần bù theo cấu trúc (020120 "Thịt pha có xương khác" có truAnhEm=['bieu:020110']) -> phải lọc vào boQua
        {
          a: 'bieu:020110',
          b: 'bieu:020120',
          matHang: 'Thịt bò tươi nửa con có xương',
          lyDo: 'Đã có truAnhEm ở bang-anh-em',
          nguon: 'bieu:020120#1',
          trich: 'Thịt pha có xương khác',
        },
        // (c) Cặp đã rời nhau tất định bằng máy (020120 có xương vs 020130 không xương) -> phải lọc vào boQua
        {
          a: 'bieu:020120',
          b: 'bieu:020130',
          matHang: 'Thịt bò giả định',
          lyDo: 'Cặp bù nhau CO_KHONG',
          nguon: 'bieu:020130#1',
          trich: 'Thịt lọc không xương',
        },
      ],
      ho: [],
      saiPhamViVe0: [],
    };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(kq)}\n\`\`\`` } }] }));
  });

  try {
    const bc = await soiNhom4('0201', {
      url: `${srvOpenAi.baseUrl}/v1`,
      model: 'qwen3-coder:30b',
      env: { SOI_API_KEY: 'khoa-thu-cuc-bo-openai' },
      luat: LUAT,
      hoSo: hoSo0201,
      L,
      bieuMeta,
      tuoi: true,
    });

    kiem(
      'OpenAI /v1/chat/completions: gửi đúng response_format json_object + Bearer SOI_API_KEY, dựng bảng tươi, lọc cả truAnhEm lẫn haiNutRoiNhau',
      reqOpenAi?.url === '/v1/chat/completions'
      && reqOpenAi?.headers?.authorization === 'Bearer khoa-thu-cuc-bo-openai'
      && reqOpenAi?.body?.response_format?.type === 'json_object'
      && bc.vungChongDeXuat.length === 1
      && bc.vungChongDeXuat[0].cap[0] === 'bieu:020110'
      && bc.vungChongDeXuat[0].cap[1] === 'bieu:020130'
      && bc.vungChongDeXuat[0].nguonPhatHien === 'soi-chong (qwen3-coder:30b)'
      && bc.boQua.some((b) => /truAnhEm/.test(b.lyDoBoQua))
      && bc.boQua.some((b) => /haiNutRoiNhau/.test(b.lyDoBoQua)),
      { reqOpenAi, vc: bc.vungChongDeXuat, boQua: bc.boQua },
    );
  } finally {
    await srvOpenAi.dong();
  }
}

// ── 5. Kiểm câu soi thứ hai saiPhamViVe0 (điều kiện ve: 0 + phu: true loại nhầm dòng con bên dưới) ──
{
  // Trong kho thu gọn LUAT, bieu:4202 chỉ có 1 con trực tiếp bieu:42022 (-> bieu:420222 -> bieu:42022210).
  // Bổ sung cả ve:0 phu:true (hs:bieu:4202:8106) lẫn ve:1 phu:false (hs:bieu:4202:8101) trên bieu:4202 để kiểm cả nhận đúng và bác bỏ sai.
  const dk4202 = [
    taoDk('bieu:4202', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải túi xách hoặc bao chứa thuộc nhóm 42.02 không?', 'Túi xách tay', 'bieu:4202#1'),
    taoDk('bieu:4202', 6, 0, true, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải túi làm bằng tấm plastic không?', 'Túi làm bằng các tấm plastic, đã hoặc chưa in, có tay cầm, không được thiết kế để sử dụng lâu dài', 'chuong:42:cg:3:A:a#1'),
    taoDk('bieu:42022', 1, 1, false, 'CO_KHONG', 'MO_TA_HUONG_DAN', 'Có phải túi xách tay (có/không quai đeo vai) không?', 'Túi xách tay, có hoặc không có quai đeo vai, kể cả loại không có tay cầm', 'bieu:42022#1', { moNguon: 'bieu:42022#1' }),
    taoDk('bieu:420221', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Chất liệu mặt ngoài là gì?', 'Mặt ngoài bằng da thuộc hoặc da thuộc tổng hợp', 'bieu:420221#1', { truc: 'chất liệu mặt ngoài', tap: ['da thuộc', 'da thuộc tổng hợp'], moNguon: 'pn:420211:ct:1#1' }),
    taoDk('bieu:420222', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Chất liệu mặt ngoài là gì?', 'Mặt ngoài bằng tấm plastic hoặc vật liệu dệt', 'bieu:420222#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic', 'vật liệu dệt'], moNguon: 'bieu:420222#1' }),
    taoDk('bieu:42022210', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Chất liệu mặt ngoài là gì?', 'Mặt ngoài bằng tấm plastic', 'bieu:42022210#1', { truc: 'chất liệu mặt ngoài', tap: ['tấm plastic'], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt', moNguon: 'chuong:39:cg:1#2' }),
    taoDk('bieu:42022220', 1, 1, false, 'GIA_TRI', 'MO_TA_HUONG_DAN', 'Chất liệu mặt ngoài là gì?', 'Mặt ngoài bằng vật liệu dệt', 'bieu:42022220#1', { truc: 'chất liệu mặt ngoài', tap: ['vật liệu dệt'], tapDu: ['tấm plastic', 'vật liệu dệt'], tapDuNguon: 'bieu:420222#1', tapDuTrich: 'tấm plastic hoặc vật liệu dệt', moNguon: 'chuong:39:cg:1#3' }),
  ];
  const hoSo4202 = ghiHoSoTam({ dkList: dk4202, sinhBangChuong: ['42'] });

  let userPrompt4202 = '';
  const srvVe0 = await moMayChuHttp(async (req, res) => {
    const body = JSON.parse(await docBodyReq(req));
    const promptText = body.messages?.[1]?.content || '';
    const laGoc4202 = promptText.includes('NÚT CHA ĐANG SOI: bieu:4202\n') || promptText.includes('NÚT CHA ĐANG SOI: bieu:4202 ');
    if (laGoc4202) userPrompt4202 = promptText;

    const kq = laGoc4202
      ? {
        chong: [],
        ho: [],
        saiPhamViVe0: [
          // (1) Đúng điều kiện ve: 0, phu: true (hs:bieu:4202:8106) loại nhầm dòng con bieu:42022210
          {
            idDieuKien: 'hs:bieu:4202:8106',
            nutConBiLoai: '4202.22.10',
            matHang: 'Túi xách tay thời trang mặt ngoài bằng tấm plastic thiết kế sử dụng lâu dài',
            lyDo: 'Câu hỏi hs:bieu:4202:8106 rút gọn thiếu vế không được thiết kế để sử dụng lâu dài nên loại nhầm toàn bộ 4202.22.10',
            nguon: 'bieu:42022210#1',
            trich: 'Mặt ngoài bằng tấm plastic',
          },
          // (2) Bác bỏ: hs:bieu:4202:8101 là ve: 1, phu: false (KHÔNG phải ve: 0 + phu: true)
          {
            idDieuKien: 'hs:bieu:4202:8101',
            nutConBiLoai: 'bieu:42022210',
            matHang: 'Túi giả định sai loại điều kiện',
            lyDo: 'Không phải ve:0 phu:true',
            nguon: 'bieu:42022210#1',
            trich: 'Mặt ngoài bằng tấm plastic',
          },
          // (3) Bác bỏ: nutConBiLoai nằm ngoài cây 4202
          {
            idDieuKien: 'hs:bieu:4202:8106',
            nutConBiLoai: 'bieu:020110',
            matHang: 'Ngoài cây nhóm',
            lyDo: 'Nút con không thuộc cây 4202',
            nguon: 'bieu:42022210#1',
            trich: 'Mặt ngoài bằng tấm plastic',
          },
        ],
      }
      : { chong: [], ho: [], saiPhamViVe0: [] };

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: { content: JSON.stringify(kq) } }));
  });

  try {
    const tepSaiVe0 = path.join(TAM, 'sai-ve0-4202.jsonl');
    const bc = await soiNhom4('4202', {
      url: srvVe0.baseUrl,
      luat: LUAT,
      hoSo: hoSo4202,
      L,
      bieuMeta,
      ghiSaiVe0: tepSaiVe0,
    });

    kiem(
      'saiPhamViVe0: lời hỏi soi trên nút bieu:4202 (chỉ có 1 con trực tiếp trong kho thử) liệt kê đủ hs:bieu:4202:8106 và dòng cháu đệ quy bieu:42022210',
      userPrompt4202.includes('idDieuKien="hs:bieu:4202:8106"')
      && userPrompt4202.includes('[bieu:42022210]')
      && userPrompt4202.includes('[bieu:42022210#1]'),
      userPrompt4202.slice(0, 400),
    );

    kiem(
      'saiPhamViVe0: bắt đúng hs:bieu:4202:8106 -> bieu:42022210 với trichHopLe=true, bác bỏ điều kiện không phải ve:0+phu:true và nút ngoài cây',
      bc.saiPhamViVe0.length === 1
      && bc.saiPhamViVe0[0].nut === 'bieu:4202'
      && bc.saiPhamViVe0[0].idDieuKien === 'hs:bieu:4202:8106'
      && bc.saiPhamViVe0[0].nutConBiLoai === 'bieu:42022210'
      && bc.saiPhamViVe0[0].trichHopLe === true
      && docDong(tepSaiVe0).length === 1
      && bc.boQua.some((b) => b.loai === 'saiPhamViVe0' && b.idDieuKien === 'hs:bieu:4202:8101' && /ve: 0 \+ phu: true/.test(b.lyDoBoQua))
      && bc.boQua.some((b) => b.loai === 'saiPhamViVe0' && b.nutConBiLoai === 'bieu:020110'),
      { saiPhamViVe0: bc.saiPhamViVe0, boQua: bc.boQua },
    );
  } finally {
    await srvVe0.dong();
  }
}

// ── 6. Kiểm soi trả rỗng / khoảng trắng / JSON hỏng + Thử lại thành công ──
{
  let demRong = 0;
  const srvRong = await moMayChuHttp((_req, res) => {
    demRong += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: { content: demRong === 1 ? '' : '   \n\t  ' } }));
  });
  try {
    const errRong = await batLoiAsync(() => goiMoHinhSoi(
      [{ role: 'system', content: HE_SOI_CHONG }, { role: 'user', content: 'kiem thu rong' }],
      { url: srvRong.baseUrl, soLanThuLai: 2, nghiGiuaLanMs: 15 },
    ));
    kiem(
      'Soi trả rỗng / khoảng trắng: thử lại đủ 3 lần (1 + 2 retry) rồi ném lỗi SOI_TRA_RONG, không im lặng trả 0 lỗi, khẳng định không chuyển sang Claude',
      demRong === 3
      && errRong?.code === 'SOI_TRA_RONG'
      && errRong?.soLanDaThu === 3
      && /không tự chuyển sang Claude/.test(errRong?.message || ''),
      { demRong, code: errRong?.code, msg: errRong?.message },
    );
  } finally {
    await srvRong.dong();
  }

  let demJsonHong = 0;
  const srvJsonHong = await moMayChuHttp((_req, res) => {
    demJsonHong += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: { content: demJsonHong < 3 ? '{bad' : '["khong_phai_object"]' } }));
  });
  try {
    const errJson = await batLoiAsync(() => goiMoHinhSoi(
      [{ role: 'system', content: HE_SOI_CHONG }, { role: 'user', content: 'kiem thu json hong' }],
      { url: srvJsonHong.baseUrl, soLanThuLai: 2, nghiGiuaLanMs: 15 },
    ));
    kiem(
      'Soi trả JSON hỏng / mảng không phải object: thử lại đủ 3 lần rồi ném lỗi SOI_JSON_LOI rõ ràng',
      demJsonHong === 3
      && errJson?.code === 'SOI_JSON_LOI'
      && /không tự chuyển sang Claude/.test(errJson?.message || ''),
      { demJsonHong, code: errJson?.code, msg: errJson?.message },
    );
  } finally {
    await srvJsonHong.dong();
  }

  let demPhucHoiRong = 0;
  const srvPhucHoiRong = await moMayChuHttp((_req, res) => {
    demPhucHoiRong += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    const content = demPhucHoiRong === 1
      ? ''
      : JSON.stringify({ chong: [], ho: [], saiPhamViVe0: [] });
    res.end(JSON.stringify({ message: { content } }));
  });
  try {
    const kq = await goiMoHinhSoi(
      [{ role: 'system', content: HE_SOI_CHONG }, { role: 'user', content: 'lan 1 rong lan 2 dung' }],
      { url: srvPhucHoiRong.baseUrl, soLanThuLai: 2, nghiGiuaLanMs: 15 },
    );
    kiem(
      'Thử lại sau khi trả rỗng: lần 1 trả "", lần 2 trả JSON hợp lệ -> thành công ở soLanGoi = 2',
      demPhucHoiRong === 2 && kq.soLanGoi === 2 && Array.isArray(kq.parsed.chong),
      kq,
    );
  } finally {
    await srvPhucHoiRong.dong();
  }
}

// ── 7. Kiểm soi hết giờ (timeout) + Thử lại thành công khi lần 2 trả kịp ──
{
  let demTreo = 0;
  const dsTimer = new Set();
  const srvTreo = await moMayChuHttp((_req, res) => {
    demTreo += 1;
    const t = setTimeout(() => {
      dsTimer.delete(t);
      if (!res.destroyed) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ message: { content: '{"chong":[],"ho":[],"saiPhamViVe0":[]}' } }));
      }
    }, 260);
    dsTimer.add(t);
  });
  try {
    const errTimeout = await batLoiAsync(() => goiMoHinhSoi(
      [{ role: 'system', content: HE_SOI_CHONG }, { role: 'user', content: 'kiem thu timeout' }],
      { url: srvTreo.baseUrl, timeoutMs: 65, soLanThuLai: 2, nghiGiuaLanMs: 15 },
    ));
    kiem(
      'Soi hết giờ (timeout): máy chủ treo quá timeoutMs -> thử lại đủ 3 lần rồi ném lỗi SOI_HET_GIO kèm không tự chuyển sang Claude',
      demTreo === 3
      && errTimeout?.code === 'SOI_HET_GIO'
      && errTimeout?.soLanDaThu === 3
      && /Quá hạn giờ 65ms/.test(errTimeout?.message || '')
      && /không tự chuyển sang Claude/.test(errTimeout?.message || ''),
      { demTreo, code: errTimeout?.code, msg: errTimeout?.message },
    );
  } finally {
    for (const t of dsTimer) clearTimeout(t);
    await srvTreo.dong();
  }

  let demTreo1 = 0;
  const dsTimer2 = new Set();
  const srvTreo1 = await moMayChuHttp((_req, res) => {
    demTreo1 += 1;
    if (demTreo1 === 1) {
      const t = setTimeout(() => {
        dsTimer2.delete(t);
        if (!res.destroyed) res.end('{}');
      }, 260);
      dsTimer2.add(t);
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: { content: '{"chong":[],"ho":[],"saiPhamViVe0":[]}' } }));
  });
  try {
    const kq = await goiMoHinhSoi(
      [{ role: 'system', content: HE_SOI_CHONG }, { role: 'user', content: 'lan 1 treo lan 2 kip' }],
      { url: srvTreo1.baseUrl, timeoutMs: 75, soLanThuLai: 2, nghiGiuaLanMs: 15 },
    );
    kiem(
      'Thử lại sau khi hết giờ: lần 1 quá hạn giờ, lần 2 trả kịp -> thành công ở soLanGoi = 2',
      demTreo1 === 2 && kq.soLanGoi === 2 && Array.isArray(kq.parsed.ho),
      kq,
    );
  } finally {
    for (const t of dsTimer2) clearTimeout(t);
    await srvTreo1.dong();
  }
}

// ── 8. Kiểm GPU tắt (ECONNREFUSED), HTTP >= 500, thiếu SOI_URL, và chốt chặn CẤM chuyển sang Claude ──
{
  const srvTam = await moMayChuHttp((_req, res) => res.end());
  const urlDaDong = srvTam.baseUrl;
  await srvTam.dong();

  const errGpuTat = await batLoiAsync(() => goiMoHinhSoi(
    [{ role: 'system', content: HE_SOI_CHONG }, { role: 'user', content: 'gpu tat' }],
    {
      env: {
        SOI_URL: urlDaDong,
        ANTHROPIC_API_KEY: 'gia-lap-khoa-anthropic-cam-fallback',
        CLAUDE_API_KEY: 'gia-lap-khoa-claude-cam-fallback',
        OPENAI_API_KEY: 'gia-lap-khoa-openai-cam-fallback',
      },
      soLanThuLai: 1,
      nghiGiuaLanMs: 15,
    },
  ));
  kiem(
    'GPU tắt (ECONNREFUSED) khi môi trường có sẵn ANTHROPIC_API_KEY: ném lỗi SOI_GPU_TAT sau đủ lượt thử và KHÔNG tự chuyển sang Claude',
    errGpuTat?.code === 'SOI_GPU_TAT'
    && errGpuTat?.soLanDaThu === 2
    && errGpuTat?.message.includes(urlDaDong)
    && /không tự chuyển sang Claude/.test(errGpuTat?.message || ''),
    { code: errGpuTat?.code, msg: errGpuTat?.message },
  );

  let dem503 = 0;
  const srv503 = await moMayChuHttp((_req, res) => {
    dem503 += 1;
    res.writeHead(503, { 'content-type': 'text/plain' });
    res.end('model runner busy');
  });
  try {
    const err503 = await batLoiAsync(() => goiMoHinhSoi(
      [{ role: 'system', content: HE_SOI_CHONG }, { role: 'user', content: 'http 503' }],
      { url: srv503.baseUrl, soLanThuLai: 1, nghiGiuaLanMs: 15 },
    ));
    kiem(
      'HTTP >= 400 (503): thử lại đủ số lần rồi ném lỗi SOI_HTTP_LOI kèm không tự chuyển sang Claude',
      dem503 === 2
      && err503?.code === 'SOI_HTTP_LOI'
      && /HTTP 503/.test(err503?.message || '')
      && /không tự chuyển sang Claude/.test(err503?.message || ''),
      { dem503, code: err503?.code, msg: err503?.message },
    );
  } finally {
    await srv503.dong();
  }

  let errThieuUrl = null;
  try {
    docCauHinhSoi({}, {
      ANTHROPIC_API_KEY: 'gia-lap-khoa-anthropic',
      OPENAI_API_KEY: 'gia-lap-khoa-openai',
    });
  } catch (e) {
    errThieuUrl = e;
  }
  kiem(
    'Thiếu SOI_URL & OLLAMA_URL: báo đúng thông điệp tiếng Việt và không đọc khoá Claude/OpenAI',
    errThieuUrl?.code === 'SOI_THIEU_URL'
    && errThieuUrl?.message === 'Thiếu biến môi trường SOI_URL (cổng Ollama máy GPU nhà cho gemma4:31b) — dừng, tuyệt đối không tự chuyển sang Claude',
    errThieuUrl?.message,
  );

  let errCamModelClaude = null;
  try {
    docCauHinhSoi({}, { SOI_URL: 'http://127.0.0.1:11434', SOI_MODEL: 'claude-sonnet-4-6' });
  } catch (e) {
    errCamModelClaude = e;
  }
  let errCamUrlAnthropic = null;
  try {
    docCauHinhSoi({}, { SOI_URL: 'https://api.anthropic.com/v1', SOI_MODEL: 'gemma4:31b' });
  } catch (e) {
    errCamUrlAnthropic = e;
  }
  kiem(
    'Chốt chặn cấm Claude: từ chối ngay cả SOI_MODEL="claude-sonnet-4-6" lẫn SOI_URL="https://api.anthropic.com/v1"',
    errCamModelClaude?.code === 'SOI_CAM_CLAUDE'
    && errCamModelClaude?.message === 'Khâu soi ADR-0008 cấm dùng mô hình Claude — chỉ dùng mô hình hãng khác qua SOI_URL / SOI_MODEL'
    && errCamUrlAnthropic?.code === 'SOI_CAM_CLAUDE'
    && errCamUrlAnthropic?.message === 'Khâu soi ADR-0008 cấm dùng mô hình Claude — chỉ dùng mô hình hãng khác qua SOI_URL / SOI_MODEL',
    { m: errCamModelClaude?.message, u: errCamUrlAnthropic?.message },
  );
}

// ── 9. Kiểm CLI trực tiếp (thiếu SOI_URL thất bại sạch + chạy thành công qua mock HTTP server) ──
{
  const cliThieuUrl = spawnSync(
    process.execPath,
    [SCRIPT_SOI, '--nhom', '0201', '--luat', LUAT, '--ho-so', path.join(TAM, 'ho-so-2')],
    {
      env: {
        PATH: process.env.PATH,
        ANTHROPIC_API_KEY: 'gia-lap-khoa-anthropic-cli',
      },
      encoding: 'utf8',
    },
  );
  kiem(
    'CLI soi-chong.mjs: thiếu SOI_URL trả mã thoát != 0 và in thông báo dừng không chuyển sang Claude',
    cliThieuUrl.status === 1
    && /Thiếu biến môi trường SOI_URL.*tuyệt đối không tự chuyển sang Claude/.test(cliThieuUrl.stderr || ''),
    { status: cliThieuUrl.status, stderr: cliThieuUrl.stderr },
  );

  const srvCli = await moMayChuHttp(async (_req, res) => {
    const kq = {
      chong: [
        {
          a: 'bieu:020110',
          b: 'bieu:020130',
          matHang: 'Thịt bò tươi nguyên nửa con đã rút toàn bộ xương',
          lyDo: 'Thiếu phủ định thịt cả con/nửa con ở 0201.30',
          nguon: 'bieu:020130#1',
          trich: 'Thịt lọc không xương',
        },
      ],
      ho: [],
      saiPhamViVe0: [],
    };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: { content: JSON.stringify(kq) } }));
  });
  try {
    const outVcCli = path.join(TAM, 'cli-vc-0201.jsonl');
    const outJsonCli = path.join(TAM, 'cli-bc-0201.json');
    const cliOk = await chayCliAsync(
      [
        SCRIPT_SOI,
        '--nhom', '0201',
        '--url', srvCli.baseUrl,
        '--luat', LUAT,
        '--ho-so', path.join(TAM, 'ho-so-2'),
        '--tuoi',
        '--ghi-vung-chong', outVcCli,
        '--ra', outJsonCli,
      ],
      {
        env: { PATH: process.env.PATH },
      },
    );
    kiem(
      'CLI soi-chong.mjs: chạy thành công với --url + --ghi-vung-chong + --ra, thoát 0 và xuất đủ tệp JSONL/JSON',
      cliOk.status === 0
      && /vungChong=1/.test(cliOk.stdout || '')
      && docDong(outVcCli).length === 1
      && JSON.parse(fs.readFileSync(outJsonCli, 'utf8')).vungChongDeXuat.length === 1,
      { status: cliOk.status, stdout: cliOk.stdout, stderr: cliOk.stderr },
    );
  } finally {
    await srvCli.dong();
  }
}

// ── 10. Kiểm hàm đơn lẻ soiBangAnhEm + dungLoiHoiSoiBang + hauKiemKetQuaSoiBang + ưu tiên 4 tầng câu luật ──
{
  const goi0201 = dungGoiNhom('0201', { luat: LUAT, hoSo: path.join(TAM, 'ho-so-2'), L, bieuMeta });
  const dk0201 = goi0201.hoSoSanCo.daCo.dieuKien;
  const dkTheoNut = new Map();
  for (const d of dk0201) {
    if (!dkTheoNut.has(d.nut)) dkTheoNut.set(d.nut, []);
    dkTheoNut.get(d.nut).push(d);
  }
  const bang0201 = taoBangChoCha('bieu:0201', L, { bieuMeta, dkTheoNut });
  const msgs = dungLoiHoiSoiBang(bang0201, { L, goi: goi0201, dkTheoNut });
  const hk = hauKiemKetQuaSoiBang(
    {
      chong: [{
        a: 'bieu:020110',
        b: 'bieu:020130',
        matHang: 'Nửa con bò tươi đã rút xương',
        lyDo: 'Cùng thoả',
        nguon: 'bieu:020110#1',
        trich: 'đoạn trích không khớp nguyên văn để kiểm cờ trichHopLe false',
      }],
      ho: [],
      saiPhamViVe0: [],
    },
    bang0201,
    { L, bieuMeta, dkTheoNut, model: 'gemma4:31b' },
  );

  const kqDon = await soiBangAnhEm(bang0201, {
    url: 'http://127.0.0.1:11434',
    L,
    bieuMeta,
    goi: goi0201,
    dkTheoNut,
    fetchImpl: async () => new Response(
      JSON.stringify({ message: { content: JSON.stringify({ chong: [], ho: [], saiPhamViVe0: [] }) } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  });

  kiem(
    'soiBangAnhEm & hauKiemKetQuaSoiBang: gắn trichHopLe=false khi trích lệch nguyên văn và hỗ trợ tiêm fetchImpl trực tiếp',
    msgs.length === 2
    && hk.vungChongDeXuat.length === 1
    && hk.vungChongDeXuat[0].trichHopLe === false
    && kqDon.cha === 'bieu:0201'
    && kqDon.soLanGoi === 1,
    { hk, kqDonCha: kqDon.cha },
  );

  // Kiểm chống nghẽn thứ tự chữ cái khi có > 250 câu chuong:02:kq:* đứng trước nhom:0201:*, pn:*, sen:* và d.nguon
  const nhieuCauKq = Array.from({ length: 260 }, (_, idx) => ({
    id: `chuong:02:kq:${idx + 100}#1`,
    nut: `chuong:02:kq:${idx + 100}`,
    lop: 'HUONG_DAN',
    chu: `Câu khái quát chương thứ ${idx + 100}`,
  }));
  const goiNhoenKq = {
    ...goi0201,
    cauTrongGoi: [
      { id: 'bieu:0201#1', nut: 'bieu:0201', lop: 'LUAT', chu: L.chuCau('bieu:0201#1') },
      ...nhieuCauKq,
      { id: 'nhom:0201:ct:1#1', nut: 'nhom:0201:ct:1', lop: 'HUONG_DAN', chu: L.chuCau('nhom:0201:ct:1#1') },
      { id: 'pn:020120:ct:1#1', nut: 'bieu:020120', lop: 'HUONG_DAN', chu: 'Chú giải phân nhóm của 0201.20' },
      { id: 'sen:02013000:1#1', nut: 'bieu:020130', lop: 'HUONG_DAN', chu: 'Chú giải SEN của 0201.30' },
    ],
  };
  const promptPhanTang = dungLoiHoiSoiBang(bang0201, { L, goi: goiNhoenKq, dkTheoNut })[1].content;
  kiem(
    'dungLoiHoiSoiBang (phân 4 tầng ưu tiên): > 250 câu chuong:*:kq:* đứng trước KHÔNG làm rớt d.nguon, nhom:*, pn:* hay sen:*',
    promptPhanTang.includes('[nhom:0201:ct:1#1]')
    && promptPhanTang.includes('[pn:020120:ct:1#1]')
    && promptPhanTang.includes('[sen:02013000:1#1]')
    && promptPhanTang.includes('[chuong:02:kq:34#1]'),
    promptPhanTang.slice(-500),
  );
}

fs.rmSync(TAM, { recursive: true, force: true });
console.log(`\ntest-dieu-kien-soi-chong: ${passed}/${passed + failed} passed, ${failed} failed`);
console.log(`${passed}/${passed + failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
