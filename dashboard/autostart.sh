#!/bin/bash
# Регистрирует и запускает дашборд как systemd --user сервис (автозапуск при входе)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SYSTEMD_USER_DIR/ai-work-hours-dashboard.service"

mkdir -p "$SYSTEMD_USER_DIR"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=ai-timer-worked dashboard (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=$SCRIPT_DIR
EnvironmentFile=$SCRIPT_DIR/.env
ExecStart=$(command -v npm) start
Restart=on-failure

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now ai-work-hours-dashboard.service

DASH_PORT="$(sed -n 's/^PORT=//p' "$SCRIPT_DIR/.env" 2>/dev/null | head -1)"
echo "Автозапуск дашборда настроен: $SERVICE_FILE"
echo "Дашборд: http://localhost:${DASH_PORT:-3000}"
