// Đường dẫn của harness. Mặc định theo VPS (docs/vps-agent-tu-hanh.md §1.2);
// chạy thử trên máy dev thì đặt HS_AGENT_HOME=./.agent-local.
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const here = dirname(fileURLToPath(import.meta.url));

export const APP_DIR = resolve(here, '..'); // <repo>/hs-agent
export const REPO = process.env.HS_REPO || resolve(APP_DIR, '..'); // bản clone chuẩn (chỉ đọc + fetch)
export const HOME = process.env.HS_AGENT_HOME || '/srv/hs-agent';
export const RAW = process.env.HS_RAW || '/srv/hs-raw';
export const PRIVATE = process.env.HS_PRIVATE || '/srv/hs-private';

export const STATE = join(HOME, 'state');
export const LOGS = join(HOME, 'logs');
export const WORK = join(HOME, 'work');
export const REPORTS = join(HOME, 'reports');
export const STOP_FILE = join(HOME, 'STOP');

export function ensureDirs() {
  for (const d of [HOME, STATE, LOGS, WORK, REPORTS, RAW]) mkdirSync(d, { recursive: true });
}
