#!/usr/bin/env bash
# Nghiệm thu máy theo docs/vps-agent-tu-hanh.md §1.4. Chạy bằng oz (có sudo):
#   bash /srv/hs-code-api/hs-agent/scripts/selfcheck.sh
# Chỉ in TÊN khóa trong /etc/hs-agent/env, không bao giờ in giá trị.
set -uo pipefail
ok=0; bad=0
pass() { echo "  ✓ $*"; ok=$((ok+1)); }
fail() { echo "  ✗ $*"; bad=$((bad+1)); }
chk() { if eval "$2" >/dev/null 2>&1; then pass "$1"; else fail "$1"; fi; }

echo "1. SSH"
chk "password tắt" "sudo sshd -T | grep -qi '^passwordauthentication no'"
chk "cổng khác 22" "! sudo sshd -T | grep -qi '^port 22$'"
echo "2. Công cụ"
chk "node ≥ 22" "node -e 'process.exit(+process.versions.node.split(\".\")[0] >= 22 ? 0 : 1)'"
for c in git curl jq rg; do chk "$c" "command -v $c"; done
echo "3. Git"
chk "hsagent fetch được origin" "sudo -u hsagent git -C /srv/hs-code-api fetch --quiet origin main"
chk "remote là SSH" "sudo -u hsagent git -C /srv/hs-code-api remote get-url origin | grep -q '^git@'"
echo "4. Test"
chk "npm test xanh (chạy bằng hsagent)" "sudo -u hsagent bash -c 'cd /srv/hs-code-api && npm test --silent'"
echo "5. Bí mật (chỉ tên)"
chk "/etc/hs-agent/env chmod 600" "[ \"\$(sudo stat -c %a /etc/hs-agent/env)\" = 600 ]"
KEYS=$(sudo grep -oE '^[A-Z_][A-Z0-9_]*=' /etc/hs-agent/env | tr -d '=' | tr '\n' ' ')
echo "    khóa có: ${KEYS:-(trống)}"
for k in HS_API_TOKEN GITHUB_TOKEN; do chk "có $k" "echo ' $KEYS ' | grep -q ' $k '"; done
if echo " $KEYS " | grep -qE ' (HERMES|GROQ|GEMINI|OPENROUTER|MINIMAX)_API_KEY '; then pass "có ít nhất một khóa LLM"; else fail "chưa có khóa LLM nào (J2 sẽ chờ)"; fi
if echo " $KEYS " | grep -q ' TELEGRAM_BOT_TOKEN ' && echo " $KEYS " | grep -q ' TELEGRAM_CHAT_ID '; then pass "Telegram"; else fail "chưa có Telegram (digest chỉ ghi tệp)"; fi
chk "prod /api/health 200" "curl -sf -o /dev/null https://hs-kb.uythacnhapkhau.com/api/health"
echo "6. Lịch"
n=$(systemctl list-timers 'hs-agent-*' --all --no-pager --no-legend 2>/dev/null | wc -l)
[ "$n" -ge 5 ] && pass "$n timer hs-agent" || fail "mới có $n timer hs-agent (cần 5; chạy install.sh --enable)"
echo "7. Riêng tư"
chk "/srv/hs-private chmod 700" "[ \"\$(stat -c %a /srv/hs-private)\" = 700 ]"
chk "data/oz-export bị gitignore" "git -C /srv/hs-code-api check-ignore -q data/oz-export/x.xlsx"
chk "không có STOP (agent đang được phép chạy)" "[ ! -e /srv/hs-agent/STOP ]"
echo
echo "Kết quả: $ok đạt, $bad chưa đạt."
[ "$bad" -eq 0 ]
