#!/usr/bin/env node
/**
 * scripts/test-quan-ly-skill.mjs — Bộ test cô lập (dùng os.tmpdir()) cho scripts/quan-ly-skill.mjs.
 * Không ghi vào repo thật hay thư mục plugin thật trên máy.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boKiem } from './lib-luat.mjs';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(GOC, 'scripts', 'quan-ly-skill.mjs');
const { kiem, xong } = boKiem('test-quan-ly-skill');

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd: GOC,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: String(err.stdout || ''),
      stderr: String(err.stderr || ''),
    };
  }
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else if (ent.isFile()) fs.copyFileSync(s, d);
  }
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ql-skill-'));

try {
  // ── 1. Kiểm tra .agents/ thật của repo (CI-safe: dùng plugin-dir giả vắng mặt) ─────────────────
  const absentPlugin = path.join(tmpRoot, 'khong-ton-tai-plugin');
  const liveCheck = runCli(['--kiem', `--plugin-dir=${absentPlugin}`]);
  kiem(
    'repo .agents/ thật hợp lệ qua --kiem (EXIT=0)',
    liveCheck.status === 0 && liveCheck.stdout.includes('PASS quan-ly-skill --kiem'),
    liveCheck.stderr || liveCheck.stdout,
  );

  const missingPluginStrict = runCli(['--kiem', `--plugin-dir=${absentPlugin}`, '--bat-buoc-plugin']);
  kiem(
    'ca ngược: --bat-buoc-plugin khi thư mục plugin không tồn tại phải thoát lỗi',
    missingPluginStrict.status !== 0 && missingPluginStrict.stderr.includes('không tồn tại'),
    missingPluginStrict.stdout,
  );

  // Chuẩn bị bản sao repo tạm trong os.tmpdir()
  const tmpRepo = path.join(tmpRoot, 'repo');
  const tmpPlugin = path.join(tmpRoot, 'mock-oz-orchestrator');
  copyDir(path.join(GOC, '.agents'), path.join(tmpRepo, '.agents'));
  fs.mkdirSync(path.join(tmpRepo, 'data', 'luat'), { recursive: true });
  fs.copyFileSync(path.join(GOC, 'data', 'luat', 'bang-co.json'), path.join(tmpRepo, 'data', 'luat', 'bang-co.json'));

  // ── 2. Tạo mới skill và lời nhắc chú ong trong bản sao tạm ───────────────────────────────────
  const taoSkill = runCli([
    '--tao-skill',
    `--repo-dir=${tmpRepo}`,
    '--ten', 'kiem-tra-xuat-xu',
    '--mo-ta', 'Skill mẫu kiểm tra điều kiện xuất xứ C/O Form E theo chương biểu thuế.',
    '--muc-dich', 'Chuẩn hoá kiểm tra xuất xứ trong kho dữ liệu luật.',
  ]);
  kiem(
    'tạo mới skill bằng --tao-skill thành công',
    taoSkill.status === 0 && fs.existsSync(path.join(tmpRepo, '.agents', 'skills', 'kiem-tra-xuat-xu', 'SKILL.md')),
    taoSkill.stderr,
  );

  const taoBee = runCli([
    '--tao-loi-nhac',
    `--repo-dir=${tmpRepo}`,
    '--ten', 'ong-xuat-xu',
    '--vai-tro', 'worker-co-form-e',
    '--skill', 'kiem-tra-xuat-xu,oz-hs-code-ops',
  ]);
  kiem(
    'tạo mới lời nhắc chú ong bằng --tao-loi-nhac thành công',
    taoBee.status === 0 && fs.existsSync(path.join(tmpRepo, '.agents', 'prompts', 'ong-xuat-xu.md')),
    taoBee.stderr,
  );

  const checkAfterCreate = runCli(['--kiem', `--repo-dir=${tmpRepo}`, `--plugin-dir=${absentPlugin}`]);
  kiem(
    'repo tạm có skill mới + lời nhắc mới vượt qua --kiem (EXIT=0)',
    checkAfterCreate.status === 0,
    checkAfterCreate.stderr || checkAfterCreate.stdout,
  );

  // ── 3. Nâng cấp skill & lời nhắc từ JSON bài học tra-tho (#1922/#2157/#2170) + tính luỹ đẳng ──
  const lessonPath = path.join(tmpRoot, 'bai-hoc-tra-tho.json');
  fs.writeFileSync(
    lessonPath,
    JSON.stringify({
      skill: 'ho-so-nguong',
      luatTieuDe: 'Kiểm đối chiếu nút phạm vi nhóm và nhánh HOẶC trước khi mở PR',
      quyTac: 'Không gắn chuong:NN cho chú giải chỉ giới hạn nhóm XX.XX và tách đủ từng nhánh HOẶC kèm duKien nguyên văn.',
      pr: '#2170',
      viDu: 'Chú giải 7(a) Chương 59 áp riêng cho nhóm 59.11, phải gắn bieu:5911 thay vì chuong:59.',
      loiNhac: 'ong-nguong',
      quyTacLoiNhac: 'Rà lại câu chú giải có cụm "Theo mục đích của nhóm..." để chắc chắn gắn bieu:XXXX chứ không gắn chuong:NN.',
      nguon: '#2170',
    }, null, 2),
    'utf8',
  );

  const upSkill1 = runCli(['--cap-nhat-skill', `--repo-dir=${tmpRepo}`, `--tu-json=${lessonPath}`]);
  const skillAfter1 = fs.readFileSync(path.join(tmpRepo, '.agents', 'skills', 'ho-so-nguong', 'SKILL.md'), 'utf8');
  const upSkill2 = runCli(['--cap-nhat-skill', `--repo-dir=${tmpRepo}`, `--tu-json=${lessonPath}`]);
  const skillAfter2 = fs.readFileSync(path.join(tmpRepo, '.agents', 'skills', 'ho-so-nguong', 'SKILL.md'), 'utf8');

  kiem(
    'nâng cấp skill từ --tu-json thêm Luật 8 và giữ nguyên nội dung khi chạy lại (idempotent)',
    upSkill1.status === 0
      && upSkill2.status === 0
      && skillAfter1.includes('### Luật 8 — Kiểm đối chiếu nút phạm vi nhóm và nhánh HOẶC trước khi mở PR')
      && skillAfter1.includes('#2170')
      && skillAfter1 === skillAfter2,
    { status1: upSkill1.status, status2: upSkill2.status, equal: skillAfter1 === skillAfter2 },
  );

  const upBee1 = runCli(['--cap-nhat-loi-nhac', `--repo-dir=${tmpRepo}`, `--tu-json=${lessonPath}`]);
  const beeAfter1 = fs.readFileSync(path.join(tmpRepo, '.agents', 'prompts', 'ong-nguong.md'), 'utf8');
  const upBee2 = runCli(['--cap-nhat-loi-nhac', `--repo-dir=${tmpRepo}`, `--tu-json=${lessonPath}`]);
  const beeAfter2 = fs.readFileSync(path.join(tmpRepo, '.agents', 'prompts', 'ong-nguong.md'), 'utf8');

  kiem(
    'nâng cấp lời nhắc chú ong từ --tu-json chèn checklist mới và idempotent khi chạy lại',
    upBee1.status === 0
      && upBee2.status === 0
      && beeAfter1.includes('Theo mục đích của nhóm...')
      && beeAfter1 === beeAfter2,
    { status1: upBee1.status, status2: upBee2.status, equal: beeAfter1 === beeAfter2 },
  );

  // ── 4. Đồng bộ dry-run và đồng bộ thật sang thư mục mock plugin + --kiem --bat-buoc-plugin ────
  const drySync = runCli(['--dong-bo', '--dry-run', `--repo-dir=${tmpRepo}`, `--plugin-dir=${tmpPlugin}`]);
  kiem(
    '--dong-bo --dry-run không ghi tệp vào thư mục plugin giả',
    drySync.status === 0 && !fs.existsSync(tmpPlugin),
    drySync.stderr,
  );

  const realSync = runCli(['--dong-bo', `--repo-dir=${tmpRepo}`, `--plugin-dir=${tmpPlugin}`]);
  const strictParity = runCli(['--kiem', `--repo-dir=${tmpRepo}`, `--plugin-dir=${tmpPlugin}`, '--bat-buoc-plugin']);
  kiem(
    '--dong-bo sang mock oz-orchestrator khớp nguyên byte khi chạy --kiem --bat-buoc-plugin',
    realSync.status === 0 && strictParity.status === 0 && strictParity.stdout.includes('pluginParity=checked'),
    strictParity.stderr || strictParity.stdout,
  );

  // ── 5. Các ca ngược (Negative tests) phải bị chặn (EXIT != 0) ─────────────────────────────────
  const copyNegRepo = (name) => {
    const d = path.join(tmpRoot, `neg-${name}`);
    copyDir(tmpRepo, d);
    return d;
  };

  // 5a) Thiếu YAML frontmatter ở skill
  const negFm = copyNegRepo('no-fm');
  fs.writeFileSync(path.join(negFm, '.agents', 'skills', 'kiem-tra-xuat-xu', 'SKILL.md'), '# Missing FM\n\n## 1. A\n\n## 2. B\n', 'utf8');
  const resNegFm = runCli(['--kiem', `--repo-dir=${negFm}`, `--plugin-dir=${absentPlugin}`]);
  kiem(
    'ca ngược: skill thiếu YAML frontmatter bị từ chối (EXIT != 0)',
    resNegFm.status !== 0 && resNegFm.stderr.includes('frontmatter'),
    resNegFm.stdout,
  );

  // 5b) Nhắc token HS_* chưa khai báo (ghép chuỗi động để không tạo literal HS_* chưa khai báo trong repo)
  const negHs = copyNegRepo('undeclared-hs');
  const fakeFlag = ['HS', 'TEST', 'CHUA', 'KHAI', 'BAO'].join('_');
  fs.appendFileSync(path.join(negHs, '.agents', 'skills', 'kiem-tra-xuat-xu', 'SKILL.md'), `\nDùng cờ ${fakeFlag}.\n`, 'utf8');
  const resNegHs = runCli(['--kiem', `--repo-dir=${negHs}`, `--plugin-dir=${absentPlugin}`]);
  kiem(
    'ca ngược: nhắc cờ chưa khai báo trong bang-co.json bị chặn (EXIT != 0)',
    resNegHs.status !== 0 && resNegHs.stderr.includes(fakeFlag),
    resNegHs.stdout,
  );

  // 5c) Thiếu mục bắt buộc trong lời nhắc chú ong
  const negSec = copyNegRepo('missing-section');
  const beeFile = path.join(negSec, '.agents', 'prompts', 'ong-xuat-xu.md');
  fs.writeFileSync(beeFile, fs.readFileSync(beeFile, 'utf8').replace('## Lệnh cổng kiểm & Bằng chứng', '## Mục khác'), 'utf8');
  const resNegSec = runCli(['--kiem', `--repo-dir=${negSec}`, `--plugin-dir=${absentPlugin}`]);
  kiem(
    'ca ngược: lời nhắc chú ong thiếu mục bắt buộc bị chặn (EXIT != 0)',
    resNegSec.status !== 0 && resNegSec.stderr.includes('Lệnh cổng kiểm & Bằng chứng'),
    resNegSec.stdout,
  );

  // 5d) Lệch đồng bộ với mock plugin
  const negDrift = copyNegRepo('drift');
  const driftPlugin = path.join(tmpRoot, 'drift-plugin');
  copyDir(tmpPlugin, driftPlugin);
  fs.appendFileSync(path.join(driftPlugin, 'rules', 'AGENTS.md'), '\n<!-- drift -->\n', 'utf8');
  const resNegDrift = runCli(['--kiem', `--repo-dir=${negDrift}`, `--plugin-dir=${driftPlugin}`, '--bat-buoc-plugin']);
  kiem(
    'ca ngược: lệch nội dung giữa .agents/ và plugin bị chặn khi --bat-buoc-plugin (EXIT != 0)',
    resNegDrift.status !== 0 && resNegDrift.stderr.includes('Lệch nội dung byte-for-byte'),
    resNegDrift.stdout,
  );

  // 5e) Chỉ dẫn tự gộp PR không có ngữ cảnh cấm bị chặn
  const negMerge = copyNegRepo('self-merge');
  fs.appendFileSync(path.join(negMerge, '.agents', 'skills', 'kiem-tra-xuat-xu', 'SKILL.md'), '\nHãy chạy `gh pr merge` sau khi xong.\n', 'utf8');
  const resNegMerge = runCli(['--kiem', `--repo-dir=${negMerge}`, `--plugin-dir=${absentPlugin}`]);
  kiem(
    'ca ngược: chỉ dẫn cho phép tự gh pr merge bị chặn (EXIT != 0)',
    resNegMerge.status !== 0 && resNegMerge.stderr.includes('tự gộp PR'),
    resNegMerge.stdout,
  );

  // 5f) Tham chiếu đường dẫn dữ liệu khách hàng ngoài ngữ cảnh cấm bị chặn
  const negPriv = copyNegRepo('private-data');
  fs.appendFileSync(path.join(negPriv, '.agents', 'skills', 'kiem-tra-xuat-xu', 'SKILL.md'), '\nĐọc mẫu từ data/oz-export/sample.json để kiểm tra.\n', 'utf8');
  const resNegPriv = runCli(['--kiem', `--repo-dir=${negPriv}`, `--plugin-dir=${absentPlugin}`]);
  kiem(
    'ca ngược: tham chiếu dữ liệu riêng tư ngoài ngữ cảnh cấm bị chặn (EXIT != 0)',
    resNegPriv.status !== 0 && resNegPriv.stderr.includes('dữ liệu riêng tư'),
    resNegPriv.stdout,
  );
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

xong();
