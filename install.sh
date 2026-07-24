#!/bin/bash
# Единый установщик ai-timer-worked: локальный PostgreSQL + миграции +
# трей-таймер (timer/) + веб-дашборд (dashboard/), с автозапуском обоих.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
TIMER_DIR="$SCRIPT_DIR/timer"
DASHBOARD_DIR="$SCRIPT_DIR/dashboard"

DB_NAME="ai_timer_worked"
DB_ROLE="ai_timer_worked"
DASHBOARD_PORT="3000"

echo "=== ai-timer-worked — установка ==="
echo ""

echo "[1/8] Системные зависимости (apt)..."
sudo apt-get update -qq
sudo apt-get install -y \
    curl \
    ca-certificates \
    openssl \
    python3-pip \
    python3-venv \
    python3-gi \
    python3-gi-cairo \
    libnotify-bin \
    zenity \
    postgresql \
    postgresql-contrib \
    gir1.2-ayatanaappindicator3-0.1 \
    libayatana-appindicator3-1 2>/dev/null || \
sudo apt-get install -y \
    gir1.2-appindicator3-0.1 2>/dev/null || true

echo "[2/8] Node.js..."
NEED_NODE_INSTALL=1
if command -v node >/dev/null 2>&1; then
    NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
    if [ "$NODE_MAJOR" -ge 22 ] 2>/dev/null; then
        NEED_NODE_INSTALL=0
    fi
fi
if [ "$NEED_NODE_INSTALL" -eq 1 ]; then
    echo "  Устанавливаю Node.js 22.x из NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "[3/8] PostgreSQL: роль и база данных..."
sudo systemctl enable --now postgresql

ROLE_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_ROLE}'")"
DB_PASSWORD=""
if [ "$ROLE_EXISTS" = "1" ] && [ -f "$TIMER_DIR/.env" ]; then
    DB_PASSWORD="$(sed -nE "s#^DATABASE_URL=postgresql://${DB_ROLE}:([^@]+)@.*#\1#p" "$TIMER_DIR/.env")"
fi
if [ "$ROLE_EXISTS" = "1" ] && [ -n "$DB_PASSWORD" ]; then
    echo "  Роль ${DB_ROLE} уже существует, пароль переиспользую из timer/.env."
else
    DB_PASSWORD="$(openssl rand -hex 16)"
    if [ "$ROLE_EXISTS" = "1" ]; then
        sudo -u postgres psql -c "ALTER ROLE ${DB_ROLE} WITH PASSWORD '${DB_PASSWORD}';" >/dev/null
    else
        sudo -u postgres psql -c "CREATE ROLE ${DB_ROLE} WITH LOGIN PASSWORD '${DB_PASSWORD}';" >/dev/null
    fi
fi

DB_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
if [ "$DB_EXISTS" != "1" ]; then
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_ROLE};" >/dev/null
fi

DATABASE_URL="postgresql://${DB_ROLE}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
DASHBOARD_URL="http://localhost:${DASHBOARD_PORT}"

echo "[4/8] Виртуальное окружение таймера и Python-зависимости..."
if [ ! -d "$TIMER_DIR/.venv" ]; then
    python3 -m venv "$TIMER_DIR/.venv" --system-site-packages
fi
"$TIMER_DIR/.venv/bin/pip" install --quiet --timeout 100 --retries 10 --upgrade pip
"$TIMER_DIR/.venv/bin/pip" install --quiet --timeout 100 --retries 10 -r "$TIMER_DIR/requirements.txt"
chmod +x "$TIMER_DIR/timer.py"

echo "[5/8] .env файлы..."
cat > "$TIMER_DIR/.env" <<EOF
DB_BACKEND=postgres
DATABASE_URL=${DATABASE_URL}
DASHBOARD_URL=${DASHBOARD_URL}
EOF
chmod 600 "$TIMER_DIR/.env"

cat > "$DASHBOARD_DIR/.env" <<EOF
DATABASE_URL=${DATABASE_URL}
PORT=${DASHBOARD_PORT}
EOF
chmod 600 "$DASHBOARD_DIR/.env"

echo "[6/8] Миграции БД..."
"$TIMER_DIR/.venv/bin/python" - "$DATABASE_URL" <<'PYEOF'
import sys
sys.path.insert(0, "timer")
import db_backend

applied = db_backend.run_pending_migrations(sys.argv[1])
if applied:
    print(f"  Применены миграции: {', '.join(applied)}")
else:
    print("  Все миграции уже применены.")
PYEOF

echo "[7/8] Установка и сборка дашборда (npm)..."
npm install --prefix "$DASHBOARD_DIR"
npm run build --prefix "$DASHBOARD_DIR"

echo "[8/8] Автозапуск..."
bash "$TIMER_DIR/autostart.sh"
bash "$DASHBOARD_DIR/autostart.sh"

echo ""
echo "=== Готово! ==="
echo ""
echo "Дашборд:            ${DASHBOARD_URL} (запущен как systemd --user сервис ai-work-hours-dashboard)"
echo "Таймер:              автозапуск при следующем входе в систему,"
echo "                     либо сейчас вручную: source ${TIMER_DIR}/.venv/bin/activate && python ${TIMER_DIR}/timer.py"
echo "Открыть дашборд можно и из трей-меню таймера: 🌐 Открыть дашборд"
