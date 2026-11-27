#!/usr/bin/env node
// scripts/test-dieu-kien-hang-doi.mjs — M-81 (#2410, ADR-0008): kiểm toàn diện hàng đợi ưu tiên cuốn chiếu
// và khoá nguyên tử m81-nhom/<4 số> trên bare Git remote cục bộ trong os.tmpdir().
// Tất định, không gọi mạng ngoài, không đụng data/ho-so-ma/ hay origin thật, sạch 100% nhóm đo mù.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { vanTay, napLuatCong } from './ho-so-ma/cong.mjs';
import { kiemKhoHoSo, kiemThuTuCuonChieu } from './ho-so-ma/khuon.mjs';
import * as HangDoiMod from './ho-so-ma/hang-doi-m81.mjs';
import {
  TTL_KHOA_MAC_DINH_MS,
  TEN_TEP_THU_TU,
  docThuTuCuonChieu,
  demDong8SoTheoNhom,
  xepHangDoiM81,
  lietKeKhoaRemote,
  taoCommitKhoa,
  nhanNhomTiep,
  nhaKhoaNhom,
  donKhoaM81,
} from './ho-so-ma/hang-doi-m81.mjs';

const GOC = fileURLToPath(new URL('..', import.meta.url));
const LUAT_THAT = path.join(GOC, 'data', 'luat-goc');
const SCRIPT_HANG_DOI = path.join(GOC, 'scripts', 'ho-so-ma', 'hang-doi-m81.mjs');

let passed = 0;
let failed = 0;
function kiem(ten, ok, chiTiet = '') {
  if (ok) {
    passed += 1;
    console.log(`PASS ${ten}`);
  } else {
    failed += 1;
    const msg = chiTiet
      ? ` — ${(typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet)).slice(0, 600)}`
      : '';
    console.log(`FAIL ${ten}${msg}`);
  }
}

function chaySync(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} lỗi (${r.status}): ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

function spawnNodeJson(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: opts.cwd || GOC,
      env: { ...process.env, ...(opts.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
    child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      let json = null;
      try {
        json = stdout.trim() ? JSON.parse(stdout) : null;
      } catch {
        json = null;
      }
      resolve({ code: code ?? 1, stdout, stderr, json });
    });
  });
}

const docDong = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()) : []);

const TAM = fs.mkdtempSync(path.join(os.tmpdir(), 'm81-hang-doi-'));

try {
  // ---------- 0. Kiểm danh sách hàm export bắt buộc ----------
  {
    const batBuoc = [
      'TTL_KHOA_MAC_DINH_MS',
      'TEN_TEP_THU_TU',
      'docThuTuCuonChieu',
      'demDong8SoTheoNhom',
      'xepHangDoiM81',
      'lietKeKhoaRemote',
      'taoCommitKhoa',
      'nhanNhomTiep',
      'nhaKhoaNhom',
      'donKhoaM81',
    ];
    kiem(
      'exports: hang-doi-m81.mjs xuất đủ 10 hàm và hằng số chuẩn',
      batBuoc.every((k) => k in HangDoiMod)
      && TTL_KHOA_MAC_DINH_MS === 24 * 60 * 60 * 1000
      && TEN_TEP_THU_TU === 'thu-tu-cuon-chieu.json',
      Object.keys(HangDoiMod),
    );
  }

  // ---------- 1. Tạo kho luật thu gọn trong os.tmpdir() từ các nhóm an toàn ----------
  // Gồm 6 nhóm 4 số an toàn: 0201, 4202, 7605, 7614, 8501, 8543 (7614 & 0201 ít dòng; 7614 vs 0201 kiểm tie-break)
  const LUAT = path.join(TAM, 'luat-goc');
  const CHON_ID = (id) => (
    id === 'gir:3:b'
    || ['phan:I', 'phan:VIII', 'phan:XV', 'phan:XVI'].includes(id)
    || ['chuong:02', 'chuong:42', 'chuong:76', 'chuong:85'].includes(id)
    || ['bieu:02', 'bieu:42', 'bieu:76', 'bieu:85'].includes(id)
    || /^bieu:(0201|4202|7605|7614|8501|8543)/.test(id)
    || /^nhom:(0201|4202|7605|7614|8501|8543):/.test(id)
    || /^pn:(4202|8501|8543)/.test(id)
    || /^chuong:(02|42|76|85):(kq|cg):/.test(id)
  );

  fs.mkdirSync(path.join(LUAT, 'cau'), { recursive: true });
  fs.mkdirSync(path.join(LUAT, 'nghia-canh'), { recursive: true });
  const daChon = new Set();
  for (const kho of ['phan', 'chuong', 'bieu', 'nhom', 'phan-nhom', 'gir', 'sen']) {
    const lines = docDong(path.join(LUAT_THAT, `${kho}.jsonl`)).filter((l) => {
      const o = JSON.parse(l);
      if (CHON_ID(o.id)) {
        daChon.add(o.id);
        return true;
      }
      return false;
    });
    fs.writeFileSync(path.join(LUAT, `${kho}.jsonl`), `${lines.join('\n')}${lines.length ? '\n' : ''}`, 'utf8');
    const cauPath = path.join(LUAT_THAT, 'cau', `${kho}.jsonl`);
    const cauLines = fs.existsSync(cauPath)
      ? docDong(cauPath).filter((l) => daChon.has(JSON.parse(l).id.split('#')[0]))
      : [];
    fs.writeFileSync(path.join(LUAT, 'cau', `${kho}.jsonl`), `${cauLines.join('\n')}${cauLines.length ? '\n' : ''}`, 'utf8');
  }
  fs.copyFileSync(path.join(LUAT_THAT, 'phan-chuong-nhom.json'), path.join(LUAT, 'phan-chuong-nhom.json'));

  const L = napLuatCong(LUAT);
  const CANH_TRANH_RONG = path.join(TAM, 'khong-co-canh-tranh.md');

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

  // Bộ DIEU_KIEN hợp lệ cho nhóm 0201 -> trạng thái DONG trên sổ điểm
  const DK_0201_DONG = [
    taoDk('bieu:0201', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Có phải thịt động vật họ trâu bò tươi hoặc ướp lạnh không?', 'Thịt của động vật họ trâu bò, tươi hoặc ướp lạnh', 'bieu:0201#1', { moNguon: 'nhom:0201:ct:1#1' }),
    taoDk('bieu:020110', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Có phải thịt cả con hoặc nửa con không?', 'Thịt cả con và nửa con', 'bieu:020110#1', { moNguon: 'chuong:02:kq:2#1' }),
    taoDk('bieu:020120', 1, 1, false, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có xương không?', 'Thịt pha có xương khác', 'bieu:020120#1', { moNguon: 'chuong:02:kq:34#1' }),
    taoDk('bieu:020130', 1, 1, true, 'CO_KHONG', 'DINH_NGHIA_LUAT', 'Thịt có xương không?', 'Thịt lọc không xương', 'bieu:020130#1', { moNguon: 'chuong:02:kq:34#1' }),
  ];

  // Bản ghi dở dang cho nhóm 7614 (thiếu các dòng con 8 số -> cổng 6 đỏ -> trạng thái DO)
  const DK_7614_DO = [
    taoDk('bieu:7614', 1, 1, false, 'CO_KHONG', 'NGHIA_THUONG', 'Có phải dây bện tao hoặc cáp bằng nhôm chưa cách điện không?', 'Dây bện tao, cáp, dây tết và các loại tương tự, bằng nhôm, chưa cách điện', 'bieu:7614#1'),
  ];

  let demHoSo = 0;
  function taoHoSoTam({ dkList = [], thuTuContent = undefined, tepLa = [] } = {}) {
    demHoSo += 1;
    const goc = path.join(TAM, `ho-so-${demHoSo}`);
    fs.mkdirSync(goc, { recursive: true });
    const theoCh = new Map();
    for (const r of dkList) {
      const ch = r.nut.slice(5, 7);
      if (!theoCh.has(ch)) theoCh.set(ch, []);
      theoCh.get(ch).push(JSON.stringify(r));
    }
    for (const [ch, lines] of theoCh) {
      const p = path.join(goc, 'dieu-kien', `${ch}.jsonl`);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, `${lines.join('\n')}\n`, 'utf8');
    }
    if (thuTuContent !== undefined) {
      const raw = typeof thuTuContent === 'string' ? thuTuContent : `${JSON.stringify(thuTuContent, null, 2)}\n`;
      fs.writeFileSync(path.join(goc, TEN_TEP_THU_TU), raw, 'utf8');
    }
    for (const tl of tepLa) {
      if (tl.thuMuc) fs.mkdirSync(path.join(goc, tl.ten), { recursive: true });
      else fs.writeFileSync(path.join(goc, tl.ten), tl.noiDung ?? '[]', 'utf8');
    }
    return goc;
  }

  // ---------- 2. Kiểm khuon.mjs với thu-tu-cuon-chieu.json ----------
  {
    const khoHopLe = taoHoSoTam({
      dkList: DK_0201_DONG,
      thuTuContent: {
        moTa: 'Thứ tự ưu tiên cuốn chiếu M-81: nhóm 4 số khách hỏi nhiều trước.',
        nguon: 'Thống kê lượt tra cứu',
        capNhat: '2026-11-28',
        thuTu: [
          { nhom: '84.13', luotKhachHoi: 35 },
          { nhom: '85.43', luotKhachHoi: 22 },
          { nhom: '4202', luotKhachHoi: 15 },
        ],
      },
    });
    const rHopLe = kiemKhoHoSo(khoHopLe);
    kiem(
      'khuon.mjs: chấp nhận thu-tu-cuon-chieu.json hợp lệ (có dấu chấm "84.13" & 4 số "4202") với 0 lỗi',
      rHopLe.loi.length === 0 && rHopLe.banGhi.length === DK_0201_DONG.length,
      rHopLe.loi,
    );

    const khoMangTran = taoHoSoTam({ thuTuContent: ['85.01', '7605'] });
    kiem(
      'khuon.mjs: chấp nhận thu-tu-cuon-chieu.json dạng mảng trần chuỗi 4 số',
      kiemKhoHoSo(khoMangTran).loi.length === 0,
      kiemKhoHoSo(khoMangTran).loi,
    );

    const khoJsonHong = taoHoSoTam({ thuTuContent: '{ "thuTu": [ lỗi json ' });
    const khoSaiTruong = taoHoSoTam({ thuTuContent: { khongPhaiThuTu: [] } });
    const khoSaiMa6So = taoHoSoTam({ thuTuContent: { thuTu: [{ nhom: '8543.70', luotKhachHoi: 5 }] } });
    const khoHaiCham = taoHoSoTam({ thuTuContent: { thuTu: ['85..43'] } });
    const khoChamLechViTri = taoHoSoTam({ thuTuContent: { thuTu: ['8.4.13', '8.413'] } });
    kiem(
      'khuon.mjs: từ chối thu-tu-cuon-chieu.json hỏng JSON / thiếu thuTu / mã 6 số / hai dấu chấm / chấm lệch vị trí',
      kiemKhoHoSo(khoJsonHong).loi.some((l) => /^thu-tu-cuon-chieu\.json:/.test(l))
      && kiemKhoHoSo(khoSaiTruong).loi.some((l) => /^thu-tu-cuon-chieu\.json:/.test(l))
      && kiemKhoHoSo(khoSaiMa6So).loi.some((l) => /^thu-tu-cuon-chieu\.json:/.test(l))
      && kiemKhoHoSo(khoHaiCham).loi.some((l) => /^thu-tu-cuon-chieu\.json:/.test(l))
      && kiemKhoHoSo(khoChamLechViTri).loi.length === 2
      && kiemThuTuCuonChieu('[123]').length === 1,
    );

    const khoCoTepLa = taoHoSoTam({
      thuTuContent: { thuTu: [{ nhom: '85.43', luotKhachHoi: 10 }] },
      tepLa: [
        { ten: 'lat-1.json', noiDung: '[]' },
        { ten: 'ranh-gioi', thuMuc: true },
      ],
    });
    const rTepLa = kiemKhoHoSo(khoCoTepLa);
    kiem(
      'khuon.mjs: VẪN từ chối lat-1.json và thư mục lạ ranh-gioi ở gốc kho hồ sơ',
      rTepLa.loi.length === 2
      && rTepLa.loi.some((l) => l.startsWith('lat-1.json: lạ ở gốc kho hồ sơ'))
      && rTepLa.loi.some((l) => l.startsWith('ranh-gioi: lạ ở gốc kho hồ sơ')),
      rTepLa.loi,
    );
  }

  // ---------- 3. Kiểm demDong8SoTheoNhom & thứ tự ưu tiên xepHangDoiM81 ----------
  {
    const dong8Map = demDong8SoTheoNhom({ luat: LUAT, L });
    const d8501 = demDong8SoTheoNhom('85.01', { luat: LUAT, L });
    const d4202 = dong8Map.get('4202');
    const d8543 = dong8Map.get('8543');
    const d7605 = dong8Map.get('7605');
    const d7614 = dong8Map.get('7614');
    const d0201 = dong8Map.get('0201');
    kiem(
      'demDong8SoTheoNhom: đếm chính xác dòng 8 số thật (không tính tiêu đề/khongMa), hỗ trợ cả Map và mã lẻ',
      d8501 === dong8Map.get('8501')
      && d8501 > d4202
      && d4202 > d8543
      && d8543 > d7605
      && d0201 === 3
      && d7614 >= 2,
      Object.fromEntries(dong8Map),
    );

    // Tạo thêm kho luật nhỏ có 2 nhóm CÙNG số dòng 8 số (0201 có 3 dòng 8 số và 7614 rút còn 3 dòng 8 số) để kiểm hoà soDong8 -> mã tăng dần
    const LUAT_HOA = path.join(TAM, 'luat-hoa');
    fs.cpSync(LUAT, LUAT_HOA, { recursive: true });
    // Kiểm tra số dòng 8 số của 0201 và 7614 trên LUAT thật
    const d7614That = dong8Map.get('7614');
    if (d7614That !== d0201) {
      // Đảm bảo trên LUAT_HOA có 0201 (3 dòng) và 7605 rút còn đúng 3 dòng 8 số để test tie-break chính xác
      const giu7605 = new Set(['bieu:7605', 'bieu:76051', 'bieu:760511', 'bieu:76051100', 'bieu:760519', 'bieu:76051910', 'bieu:76051990']);
      const bieuPath = path.join(LUAT_HOA, 'bieu.jsonl');
      const filteredBieu = docDong(bieuPath).filter((l) => {
        const o = JSON.parse(l);
        if (/^bieu:7605/.test(o.id)) return giu7605.has(o.id);
        return true;
      });
      fs.writeFileSync(bieuPath, `${filteredBieu.join('\n')}\n`, 'utf8');
    }
    const L_HOA = napLuatCong(LUAT_HOA);
    const mapHoa = demDong8SoTheoNhom({ luat: LUAT_HOA, L: L_HOA });
    const hoSoRong = taoHoSoTam();
    const qTie = xepHangDoiM81({ luat: LUAT_HOA, hoSo: hoSoRong, L: L_HOA, canhTranhMd: CANH_TRANH_RONG, nhom: ['7605', '0201'] });
    kiem(
      'xepHangDoiM81 (hoà soDong8): hai nhóm cùng 3 dòng 8 số xếp theo mã nhom tăng dần (0201 trước 7605)',
      mapHoa.get('0201') === 3
      && mapHoa.get('7605') === 3
      && qTie.hangDoi.map((x) => x.nhom).join(',') === '0201,7605',
      qTie.hangDoi.map((x) => `${x.nhom}:${x.soDong8}`),
    );

    // (a) Thiếu thu-tu-cuon-chieu.json + có nhóm DONG (0201) và nhóm DO (7614)
    const hoSoKhongThuTu = taoHoSoTam({ dkList: [...DK_0201_DONG, ...DK_7614_DO] });
    const qKhongThuTu = xepHangDoiM81({
      luat: LUAT,
      hoSo: hoSoKhongThuTu,
      L,
      canhTranhMd: CANH_TRANH_RONG,
    });
    kiem(
      'xepHangDoiM81 (thiếu thu-tu-cuon-chieu.json): bỏ qua DONG (0201) & DO (7614), xếp CHUA theo soDong8 giảm dần (8501 > 4202 > 8543 > 7605)',
      qKhongThuTu.coThuTuCuonChieu === false
      && qKhongThuTu.dong === 1
      && qKhongThuTu.do === 1
      && qKhongThuTu.chua === 4
      && qKhongThuTu.hangDoi.map((x) => x.nhom).join(',') === '8501,4202,8543,7605',
      qKhongThuTu.hangDoi.map((x) => `${x.nhom}:${x.soDong8}`),
    );

    // (b) Có thu-tu-cuon-chieu.json: nhóm ít dòng (76.05, 85.43) được khách hỏi nhiều đưa lên đầu, bỏ qua 02.01 (DONG) & 76.14 (DO), khử trùng lặp
    const hoSoCoThuTu = taoHoSoTam({
      dkList: [...DK_0201_DONG, ...DK_7614_DO],
      thuTuContent: {
        moTa: 'Thứ tự cuốn chiếu thử nghiệm',
        thuTu: [
          { nhom: '02.01', luotKhachHoi: 99 }, // đã DONG -> phải bỏ qua
          { nhom: '76.05', luotKhachHoi: 40 }, // ít dòng 8 số nhưng trong thuTu -> lên #1
          { nhom: '76.14', luotKhachHoi: 38 }, // đang DO -> phải bỏ qua
          { nhom: '85.43', luotKhachHoi: 25 }, // lên #2
          { nhom: '7605', luotKhachHoi: 1 },   // lặp lại -> giữ lần đầu (luotKhachHoi=40)
        ],
      },
    });
    const docTt = docThuTuCuonChieu(hoSoCoThuTu);
    const qCoThuTu = xepHangDoiM81({
      luat: LUAT,
      hoSo: hoSoCoThuTu,
      L,
      canhTranhMd: CANH_TRANH_RONG,
    });
    kiem(
      'xepHangDoiM81 (có thu-tu-cuon-chieu.json): nhóm trong thuTu lên đầu đúng thứ tự (7605 -> 8543), nhóm ngoài xếp sau theo soDong8 giảm dần (8501 -> 4202)',
      docTt.coTep === true
      && qCoThuTu.coThuTuCuonChieu === true
      && qCoThuTu.hangDoi.map((x) => x.nhom).join(',') === '7605,8543,8501,4202'
      && qCoThuTu.hangDoi[0].luotKhachHoi === 40
      && qCoThuTu.hangDoi[1].luotKhachHoi === 25
      && qCoThuTu.hangDoi[2].luotKhachHoi === null,
      qCoThuTu.hangDoi.map((x) => ({ nhom: x.nhom, soDong8: x.soDong8, luotKhachHoi: x.luotKhachHoi })),
    );
  }

  // ---------- Helper dựng bare Git remote + 2 bản clone thợ trong os.tmpdir() ----------
  let demGit = 0;
  function taoCumGitTam() {
    demGit += 1;
    const gocGit = path.join(TAM, `git-cum-${demGit}`);
    const bare = path.join(gocGit, 'remote.git');
    const tho1 = path.join(gocGit, 'tho-1');
    const tho2 = path.join(gocGit, 'tho-2');
    fs.mkdirSync(gocGit, { recursive: true });

    chaySync('git', ['init', '--bare', bare]);
    chaySync('git', ['clone', bare, tho1]);
    chaySync('git', ['-C', tho1, 'config', 'user.name', 'Tho Khoi Tao']);
    chaySync('git', ['-C', tho1, 'config', 'user.email', 'init@oz.local']);
    fs.writeFileSync(path.join(tho1, 'README.md'), '# Kho thử khoá M-81\n', 'utf8');
    chaySync('git', ['-C', tho1, 'add', 'README.md']);
    chaySync('git', ['-C', tho1, 'commit', '-m', 'chore: khoi tao']);
    chaySync('git', ['-C', tho1, 'push', 'origin', 'HEAD:refs/heads/main']);

    chaySync('git', ['clone', bare, tho2]);
    return { bare, tho1, tho2 };
  }

  // ---------- 4. Kiểm Git plumbing không làm bẩn working tree, index hay HEAD ----------
  {
    const { bare, tho1 } = taoCumGitTam();
    const hoSoTest = taoHoSoTam({
      dkList: DK_0201_DONG,
      thuTuContent: { thuTu: [{ nhom: '85.43', luotKhachHoi: 18 }, { nhom: '42.02', luotKhachHoi: 12 }] },
    });

    // Cố tình tạo thay đổi dở dang trong index & working tree của tho1 trước khi khoá
    fs.writeFileSync(path.join(tho1, 'README.md'), '# Đang sửa dở working tree\n', 'utf8');
    fs.writeFileSync(path.join(tho1, 'staged.txt'), 'dữ liệu đang stage\n', 'utf8');
    chaySync('git', ['-C', tho1, 'add', 'staged.txt']);

    const headTruoc = chaySync('git', ['-C', tho1, 'rev-parse', 'HEAD']);
    const statusTruoc = chaySync('git', ['-C', tho1, 'status', '--porcelain']);
    const nowCoDinh = 1_760_000_000_000;

    const kqNhan = await nhanNhomTiep({
      luat: LUAT,
      hoSo: hoSoTest,
      L,
      canhTranhMd: CANH_TRANH_RONG,
      gitCwd: tho1,
      remote: 'origin',
      tho: 'ong-plumbing',
      nowMs: nowCoDinh,
    });

    const headSau = chaySync('git', ['-C', tho1, 'rev-parse', 'HEAD']);
    const statusSau = chaySync('git', ['-C', tho1, 'status', '--porcelain']);
    const dsKhoa = await lietKeKhoaRemote({ gitCwd: tho1, remote: bare, nowMs: nowCoDinh });

    kiem(
      'Git plumbing: nhanNhomTiep tạo nhánh m81-nhom/8543 trên remote mà KHÔNG đổi HEAD, index hay working tree',
      kqNhan.nhanDuoc === true
      && kqNhan.nhom === '8543'
      && kqNhan.nhanhKhoa === 'm81-nhom/8543'
      && headSau === headTruoc
      && statusSau === statusTruoc
      && dsKhoa.danhSach.length === 1
      && dsKhoa.theoNhom.get('8543')?.sha === kqNhan.lockSha
      && dsKhoa.theoNhom.get('8543')?.commitTimeSec === Math.floor(nowCoDinh / 1000),
      { kqNhan, headTruoc, headSau, statusTruoc, statusSau },
    );
  }

  // ---------- 5. ĐUA THẬT: 2 tiến trình thợ song song (Promise.all) đẩy vào cùng 1 bare remote ----------
  {
    const { bare, tho1, tho2 } = taoCumGitTam();
    const hoSoDua = taoHoSoTam({
      dkList: [...DK_0201_DONG, ...DK_7614_DO],
      thuTuContent: {
        thuTu: [
          { nhom: '76.05', luotKhachHoi: 50 }, // Ưu tiên #1
          { nhom: '85.43', luotKhachHoi: 30 }, // Ưu tiên #2
          { nhom: '42.02', luotKhachHoi: 10 }, // Ưu tiên #3
        ],
      },
    });
    const nowDua = 1_760_100_000_000;

    // 5a. Spawn 2 tiến trình Node thật sự đồng thời trên 2 bản clone tho1 & tho2 đẩy vào cùng bare remote
    const baseCliArgs = [
      SCRIPT_HANG_DOI,
      '--nhan',
      '--luat', LUAT,
      '--ho-so', hoSoDua,
      '--canh-tranh', CANH_TRANH_RONG,
      '--remote', 'origin',
      '--now-ms', String(nowDua),
      '--json',
    ];

    const [p1, p2] = await Promise.all([
      spawnNodeJson([...baseCliArgs, '--repo', tho1, '--tho', 'tho-1']),
      spawnNodeJson([...baseCliArgs, '--repo', tho2, '--tho', 'tho-2']),
    ]);

    const nhomNhan = [p1.json?.nhom, p2.json?.nhom].filter(Boolean).sort();
    const krSauDua = await lietKeKhoaRemote({ gitCwd: tho1, remote: bare, nowMs: nowDua });
    const nhanhTrenBare = krSauDua.danhSach.map((x) => x.nhanhKhoa).sort();

    kiem(
      'ĐUA 2 TIẾN TRÌNH THẬT (Promise.all): 1 thợ nhận #1 (7605), thợ kia tự nhận #2 (8543), không trùng nhóm, bare remote có đúng 2 nhánh khoá',
      p1.code === 0
      && p2.code === 0
      && p1.json?.nhanDuoc === true
      && p2.json?.nhanDuoc === true
      && p1.json.nhom !== p2.json.nhom
      && nhomNhan.join(',') === '7605,8543'
      && nhanhTrenBare.join(',') === 'm81-nhom/7605,m81-nhom/8543',
      { p1: p1.json, p2: p2.json, nhanhTrenBare, err1: p1.stderr, err2: p2.stderr },
    );

    // 5b. Ép 2 thợ đẩy CÙNG 1 SHA commit khoá (cả khi chỉ có 1 nhóm CHUA và khi có nhiều nhóm CHUA)
    const { bare: bareSame1, tho1: s1a, tho2: s1b } = taoCumGitTam();
    const cA = await taoCommitKhoa('8543', { gitCwd: s1a, tho: 'cung-tho', nowMs: nowDua, nonce: 'cung-nonce' });
    const cB = await taoCommitKhoa('8543', { gitCwd: s1b, tho: 'cung-tho', nowMs: nowDua, nonce: 'cung-nonce' });

    // Khi chỉ lọc đúng 1 nhóm (--nhom 8543) và ép cả 2 tiến trình đẩy cùng lockSha: chỉ ĐÚNG 1 thợ thắng!
    const sameShaCliArgs = [
      SCRIPT_HANG_DOI,
      '--nhan',
      '--luat', LUAT,
      '--ho-so', hoSoDua,
      '--canh-tranh', CANH_TRANH_RONG,
      '--nhom', '8543',
      '--remote', 'origin',
      '--now-ms', String(nowDua),
      '--lock-sha', cA.lockSha,
      '--json',
    ];
    const [sp1, sp2] = await Promise.all([
      spawnNodeJson([...sameShaCliArgs, '--repo', s1a]),
      spawnNodeJson([...sameShaCliArgs, '--repo', s1b]),
    ]);
    const soThangMotNhom = [sp1.json, sp2.json].filter((x) => x?.nhanDuoc === true).length;
    const soThuaMotNhom = [sp1.json, sp2.json].filter((x) => x?.nhanDuoc === false).length;

    // Và khi có 2 nhóm CHUA (7605, 8543) mà 2 thợ tạo cùng SHA cho mỗi nhóm (cùng tho + nowMs + nonce): 1 thợ lấy #1, 1 thợ lấy #2!
    const { tho1: s2a, tho2: s2b } = taoCumGitTam();
    const [rSameMulti1, rSameMulti2] = await Promise.all([
      nhanNhomTiep({
        luat: LUAT,
        hoSo: hoSoDua,
        canhTranhMd: CANH_TRANH_RONG,
        gitCwd: s2a,
        remote: 'origin',
        tho: 'cung-tho',
        nowMs: nowDua,
        nonce: 'cung-nonce',
      }),
      nhanNhomTiep({
        luat: LUAT,
        hoSo: hoSoDua,
        canhTranhMd: CANH_TRANH_RONG,
        gitCwd: s2b,
        remote: 'origin',
        tho: 'cung-tho',
        nowMs: nowDua,
        nonce: 'cung-nonce',
      }),
    ]);

    kiem(
      'ĐUA CÙNG 1 SHA COMMIT KHOÁ (--force-with-lease=<ref>:): không bị lọt Everything up-to-date, chỉ đúng 1 thợ thắng nhóm #1 và thợ kia sang #2',
      cA.lockSha === cB.lockSha
      && soThangMotNhom === 1
      && soThuaMotNhom === 1
      && rSameMulti1.nhanDuoc === true
      && rSameMulti2.nhanDuoc === true
      && [rSameMulti1.nhom, rSameMulti2.nhom].sort().join(',') === '7605,8543',
      { sha: cA.lockSha, sp1: sp1.json, sp2: sp2.json, rSameMulti1, rSameMulti2 },
    );
  }

  // ---------- 6. Khoá còn hạn (< 24h) vs quá hạn (> 24h), đua CAS thu hồi 25h, nhaKhoaNhom & donKhoaM81 ----------
  {
    const { bare, tho1, tho2 } = taoCumGitTam();
    const hoSoTtl = taoHoSoTam({
      dkList: DK_7614_DO, // 0201 đang là CHUA ở bước đầu, sau đó sẽ mô phỏng gộp PR -> DONG
      thuTuContent: {
        thuTu: [
          { nhom: '85.43', luotKhachHoi: 40 }, // #1
          { nhom: '42.02', luotKhachHoi: 30 }, // #2
          { nhom: '76.05', luotKhachHoi: 20 }, // #3
          { nhom: '02.01', luotKhachHoi: 10 }, // #4
        ],
      },
    });

    const tHienTai = 1_760_500_000_000;
    const t2GioTruoc = tHienTai - 2 * 3600_000;
    const t25GioTruoc = tHienTai - 25 * 3600_000;

    // 6a. Tạo khoá 2 giờ trước trên nhóm #1 (8543)
    const khoa2h = await nhanNhomTiep({
      luat: LUAT,
      hoSo: hoSoTtl,
      L,
      canhTranhMd: CANH_TRANH_RONG,
      gitCwd: tho1,
      remote: 'origin',
      tho: 'tho-cu-2h',
      nowMs: t2GioTruoc,
    });

    // Thợ mới tới ở tHienTai -> thấy khoá 8543 mới 2h (< 24h) -> KHÔNG cướp, tự nhảy sang #2 (4202), donKhoaM81 giữ nguyên cả hai
    const thoiMoi2h = await nhanNhomTiep({
      luat: LUAT,
      hoSo: hoSoTtl,
      L,
      canhTranhMd: CANH_TRANH_RONG,
      gitCwd: tho2,
      remote: 'origin',
      tho: 'tho-moi',
      nowMs: tHienTai,
    });
    const donKhiConHan = await donKhoaM81({
      luat: LUAT,
      hoSo: hoSoTtl,
      L,
      canhTranhMd: CANH_TRANH_RONG,
      gitCwd: tho1,
      remote: 'origin',
      nowMs: tHienTai,
    });

    kiem(
      'TTL < 24h (khoá 2 giờ trước): thợ mới không cướp nhóm #1 (8543) mà nhảy sang #2 (4202); donKhoaM81 giữ nguyên 100%',
      khoa2h.nhom === '8543'
      && thoiMoi2h.nhanDuoc === true
      && thoiMoi2h.nhom === '4202'
      && thoiMoi2h.boQuaDoKhoa.some((b) => b.nhom === '8543' && b.lyDo === 'DANG_KHOA_CON_HAN')
      && donKhiConHan.daNha.length === 0
      && donKhiConHan.giuNguyen.length === 2,
      { khoa2h, thoiMoi2h, donKhiConHan },
    );

    // 6b. Khoá tạo 25 giờ trước (> 24h) + ĐUA CAS 2 thợ cùng lao vào thu hồi song song qua Promise.all
    const { bare: bare25h, tho1: q1, tho2: q2 } = taoCumGitTam();
    const khoaCu25h = await nhanNhomTiep({
      luat: LUAT,
      hoSo: hoSoTtl,
      L,
      canhTranhMd: CANH_TRANH_RONG,
      gitCwd: q1,
      remote: 'origin',
      tho: 'tho-bo-quen-25h',
      nowMs: t25GioTruoc,
    });

    const casCliArgs = [
      SCRIPT_HANG_DOI,
      '--nhan',
      '--luat', LUAT,
      '--ho-so', hoSoTtl,
      '--canh-tranh', CANH_TRANH_RONG,
      '--remote', 'origin',
      '--now-ms', String(tHienTai),
      '--json',
    ];
    const [cas1, cas2] = await Promise.all([
      spawnNodeJson([...casCliArgs, '--repo', q1, '--tho', 'tho-cas-1']),
      spawnNodeJson([...casCliArgs, '--repo', q2, '--tho', 'tho-cas-2']),
    ]);

    const dsCas = [cas1.json, cas2.json];
    const nguoiThang8543 = dsCas.find((x) => x?.nhom === '8543');
    const nguoiSang4202 = dsCas.find((x) => x?.nhom === '4202');
    const krSauCas = await lietKeKhoaRemote({ gitCwd: q1, remote: bare25h, nowMs: tHienTai });

    kiem(
      'TTL > 24h & ĐUA CAS (khoá 25 giờ trước, 2 thợ Promise.all): đúng 1 thợ CAS thu hồi được 8543, thợ kia bị từ chối CAS và tự nhận 4202',
      khoaCu25h.nhom === '8543'
      && Boolean(nguoiThang8543)
      && nguoiThang8543.thuHoiQuaHan === true
      && nguoiThang8543.oldSha === khoaCu25h.lockSha
      && nguoiThang8543.lockSha !== khoaCu25h.lockSha
      && Boolean(nguoiSang4202)
      && krSauCas.theoNhom.get('8543')?.sha === nguoiThang8543.lockSha
      && krSauCas.theoNhom.get('8543')?.conHieuLuc === true,
      { khoaCu25h, cas1: cas1.json, cas2: cas2.json },
    );

    // 6c. Kiểm nhaKhoaNhom (expectedSha sai bị chặn; expectedSha đúng xoá thành công)
    const nhaSaiSha = await nhaKhoaNhom('4202', {
      gitCwd: q1,
      remote: 'origin',
      expectedSha: '0'.repeat(40),
    });
    const nhaDungSha = await nhaKhoaNhom('4202', {
      gitCwd: q1,
      remote: 'origin',
      expectedSha: nguoiSang4202.lockSha,
    });
    const krSauNha = await lietKeKhoaRemote({ gitCwd: q1, remote: bare25h, nowMs: tHienTai });
    kiem(
      'nhaKhoaNhom: expectedSha lệch bị chặn an toàn, expectedSha khớp xoá sạch nhánh trên remote',
      nhaSaiSha.daNha === false
      && nhaDungSha.daNha === true
      && !krSauNha.theoNhom.has('4202')
      && krSauNha.theoNhom.has('8543'),
      { nhaSaiSha, nhaDungSha },
    );

    // 6d. Kiểm donKhoaM81 khi PR đã gộp (nhóm 0201 chuyển sang DONG) và khi có khoá quá hạn 26h
    const { bare: bareDon, tho1: d1 } = taoCumGitTam();
    // Ban đầu 0201 đang CHUA -> khoá 0201 (1 giờ trước), khoá 7605 (26 giờ trước), khoá 8543 (3 giờ trước)
    const k0201 = await taoCommitKhoa('0201', { gitCwd: d1, tho: 'tho-a', nowMs: tHienTai - 1 * 3600_000 });
    const k7605 = await taoCommitKhoa('7605', { gitCwd: d1, tho: 'tho-b', nowMs: tHienTai - 26 * 3600_000 });
    const k8543 = await taoCommitKhoa('8543', { gitCwd: d1, tho: 'tho-c', nowMs: tHienTai - 3 * 3600_000 });
    chaySync('git', ['-C', d1, 'push', 'origin', `${k0201.lockSha}:refs/heads/m81-nhom/0201`]);
    chaySync('git', ['-C', d1, 'push', 'origin', `${k7605.lockSha}:refs/heads/m81-nhom/7605`]);
    chaySync('git', ['-C', d1, 'push', 'origin', `${k8543.lockSha}:refs/heads/m81-nhom/8543`]);

    // Mô phỏng PR của nhóm 0201 đã gộp vào kho hồ sơ -> 0201 đạt DONG trên sổ điểm!
    const hoSoSauGop0201 = taoHoSoTam({ dkList: [...DK_0201_DONG, ...DK_7614_DO] });
    const kqDon = await donKhoaM81({
      luat: LUAT,
      hoSo: hoSoSauGop0201,
      L,
      canhTranhMd: CANH_TRANH_RONG,
      gitCwd: d1,
      remote: 'origin',
      nowMs: tHienTai,
    });
    const krSauDon = await lietKeKhoaRemote({ gitCwd: d1, remote: bareDon, nowMs: tHienTai });

    const daNha0201 = kqDon.daNha.find((x) => x.nhom === '0201');
    const daNha7605 = kqDon.daNha.find((x) => x.nhom === '7605');
    kiem(
      'donKhoaM81: tự xoá m81-nhom/0201 khi nhóm đã DONG (DA_GOP_HOAC_ROI_CHUA), xoá m81-nhom/7605 quá hạn 26h (QUA_HAN_24H), giữ m81-nhom/8543 còn hạn',
      kqDon.daNha.length === 2
      && daNha0201?.lyDo === 'DA_GOP_HOAC_ROI_CHUA'
      && daNha0201?.oldSha === k0201.lockSha
      && daNha7605?.lyDo === 'QUA_HAN_24H'
      && daNha7605?.oldSha === k7605.lockSha
      && kqDon.giuNguyen.length === 1
      && kqDon.giuNguyen[0].nhom === '8543'
      && krSauDon.danhSach.map((x) => x.nhom).join(',') === '8543',
      { kqDon, conLai: krSauDon.danhSach },
    );
  }

  // ---------- 7. Kiểm giao diện CLI mặc định (--xem --khong-mang --json) ----------
  {
    const hoSoCli = taoHoSoTam({
      dkList: [...DK_0201_DONG, ...DK_7614_DO],
      thuTuContent: { thuTu: [{ nhom: '85.43', luotKhachHoi: 12 }] },
    });
    const cliXem = await spawnNodeJson([
      SCRIPT_HANG_DOI,
      '--luat', LUAT,
      '--ho-so', hoSoCli,
      '--canh-tranh', CANH_TRANH_RONG,
      '--gioi-han', '2',
      '--khong-mang',
      '--json',
    ]);
    kiem(
      'CLI hang-doi-m81.mjs: mặc định --xem không đẩy mạng, tôn trọng --gioi-han và trả JSON chuẩn',
      cliXem.code === 0
      && cliXem.json?.khuon === 'hang-doi-m81@1'
      && cliXem.json?.hangDoi?.map((x) => x.nhom).join(',') === '8543,8501',
      { code: cliXem.code, json: cliXem.json, stderr: cliXem.stderr },
    );

    // 7b. Lỗi mạng / quyền ghi / hook từ chối (không phải tranh chấp CAS): dừng NGAY ở nhóm #1, cấm lặp bão > 1.200 lệnh push!
    const { bare: bareLoiQuyen, tho1: lq1 } = taoCumGitTam();
    const hoSoNhieuUngVien = taoHoSoTam({
      thuTuContent: {
        thuTu: [
          { nhom: '85.43', luotKhachHoi: 40 },
          { nhom: '42.02', luotKhachHoi: 30 },
          { nhom: '76.05', luotKhachHoi: 20 },
          { nhom: '02.01', luotKhachHoi: 10 },
        ],
      },
    });
    // Cài pre-receive hook đếm số lần push và từ chối kiểu Permission denied / protected branch
    const demPushFile = path.join(TAM, 'dem-push-hook.txt');
    fs.writeFileSync(demPushFile, '', 'utf8');
    const hookPath = path.join(bareLoiQuyen, 'hooks', 'pre-receive');
    fs.writeFileSync(
      hookPath,
      `#!/bin/sh\necho "1" >> "${demPushFile}"\necho "Permission denied: protected branch policy" >&2\nexit 1\n`,
      { mode: 0o755 },
    );

    let errPushQuyen = null;
    try {
      await nhanNhomTiep({
        luat: LUAT,
        hoSo: hoSoNhieuUngVien,
        L,
        canhTranhMd: CANH_TRANH_RONG,
        gitCwd: lq1,
        remote: 'origin',
        tho: 'tho-khong-quyen',
      });
    } catch (e) {
      errPushQuyen = e;
    }
    const soLanPushHook = docDong(demPushFile).length;

    // Cũng kiểm khi pushUrl đứt mạng / sai đường dẫn (ls-remote qua fetchUrl vẫn thành công, push thất bại exit 128)
    const { tho1: lq2 } = taoCumGitTam();
    chaySync('git', ['-C', lq2, 'remote', 'set-url', '--push', 'origin', path.join(TAM, 'khong-ton-tai-push.git')]);
    let errPushMang = null;
    try {
      await nhanNhomTiep({
        luat: LUAT,
        hoSo: hoSoNhieuUngVien,
        L,
        canhTranhMd: CANH_TRANH_RONG,
        gitCwd: lq2,
        remote: 'origin',
      });
    } catch (e) {
      errPushMang = e;
    }
    let errNhaMang = null;
    try {
      await nhaKhoaNhom('8543', {
        gitCwd: lq2,
        remote: 'origin',
        expectedSha: 'a'.repeat(40),
      });
    } catch (e) {
      errNhaMang = e;
    }

    kiem(
      'Chống bão git push khi lỗi quyền / hook / mạng: dừng ném lỗi ngay ở nhóm đầu tiên (soLanPushHook === 1), nhaKhoaNhom không báo nhầm LECH_SHA_KHOA',
      Boolean(errPushQuyen)
      && /Không đẩy được nhánh khoá/.test(errPushQuyen.message)
      && soLanPushHook === 1
      && Boolean(errPushMang)
      && /Không đẩy được nhánh khoá/.test(errPushMang.message)
      && Boolean(errNhaMang)
      && /Không xoá được nhánh khoá/.test(errNhaMang.message),
      { soLanPushHook, q: errPushQuyen?.message, m: errPushMang?.message, n: errNhaMang?.message },
    );
  }
} finally {
  fs.rmSync(TAM, { recursive: true, force: true });
}

console.log(`\n${passed}/${passed + failed} passed, ${failed} failed (test-dieu-kien-hang-doi)`);
process.exit(failed ? 1 : 0);
