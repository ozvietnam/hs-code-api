#!/usr/bin/env bash
# Cài/cập nhật harness hs-agent trên vps-hsagent. Chạy bằng user có sudo (oz):
#   sudo bash /srv/hs-code-api/hs-agent/scripts/install.sh [--enable]
# Idempotent: chạy lại an toàn. Không đọc/ghi nội dung /etc/hs-agent/env.
# --enable: bật các timer. Không có cờ này thì chỉ cài unit, để chạy tay thử trước.
set -euo pipefail
APP=/srv/hs-code-api/hs-agent
UNIT_DIR=/etc/systemd/system
JOBS="legal-watch precedent-extract bench-night freshness digest watchdog"

[ "$(id -u)" -eq 0 ] || { echo "Cần sudo."; exit 1; }
id hsagent >/dev/null 2>&1 || { echo "Thiếu user hsagent (§1.2)."; exit 1; }
[ -f /etc/hs-agent/env ] || { echo "Thiếu /etc/hs-agent/env (§1.2)."; exit 1; }

for d in /srv/hs-agent /srv/hs-raw; do install -d -o hsagent -g hsagent -m 755 "$d"; done
install -d -o hsagent -g hsagent -m 700 /srv/hs-private
for d in state logs work reports; do install -d -o hsagent -g hsagent -m 750 "/srv/hs-agent/$d"; done
for d in .cache .npm .config; do install -d -o hsagent -g hsagent -m 700 "/home/hsagent/$d"; done

install -m 644 "$APP/systemd/hs-agent@.service" "$UNIT_DIR/hs-agent@.service"
for j in $JOBS; do install -m 644 "$APP/systemd/hs-agent-$j.timer" "$UNIT_DIR/hs-agent-$j.timer"; done

# Script đồng bộ clone chuẩn về origin/main — cài ra NGOÀI repo.
# Lý do: ExecStartPre gọi nó TRƯỚC khi repo được đồng bộ; nếu nó nằm trong repo
# thì khi repo đang ở commit cũ (không có file đó) → ExecStartPre hỏng → không
# bao giờ đồng bộ được. Ở đây bản trong repo chỉ là dự phòng.
install -d -o hsagent -g hsagent -m 750 /srv/hs-agent/scripts
install -m 755 "$APP/scripts/sync-main.sh" /srv/hs-agent/scripts/sync-main.sh
systemctl daemon-reload

# Bản clone chuẩn do hsagent sở hữu; admin (oz) đọc được mà không bị "dubious ownership".
git config --system --get-all safe.directory | grep -qx /srv/hs-code-api || git config --system --add safe.directory /srv/hs-code-api

if [ "${1:-}" = "--enable" ]; then
  for j in $JOBS; do systemctl enable --now "hs-agent-$j.timer"; done
  echo "Đã bật timer:"; systemctl list-timers 'hs-agent-*' --no-pager
else
  echo "Đã cài unit. Chạy thử: sudo systemctl start hs-agent@legal-watch.service && journalctl -u hs-agent@legal-watch -n 50"
  echo "Bật lịch: sudo bash $0 --enable"
fi
