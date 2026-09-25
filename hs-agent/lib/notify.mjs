// Báo cáo (§2.7): ghi tệp digest; có TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID thì gửi Telegram.
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { REPORTS } from './paths.mjs';

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false, reason: 'chưa cấu hình Telegram' };
  const chunks = [];
  for (let i = 0; i < text.length; i += 3800) chunks.push(text.slice(i, i + 3800));
  for (const c of chunks) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: c, disable_web_page_preview: true }),
    }).catch(() => null);
    if (!res?.ok) return { ok: false, reason: `Telegram ${res?.status || 'lỗi mạng'}` };
  }
  return { ok: true };
}

export function writeReport(sub, name, markdown) {
  const dir = join(REPORTS, sub);
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, markdown);
  return p;
}
