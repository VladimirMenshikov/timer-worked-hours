#!/bin/bash
# Собирает ai-timer-worked_<version>_all.deb из исходников проекта.
#
# Собирает во временном каталоге на обычной файловой системе, а не прямо в
# репозитории: dpkg-deb требует реальных unix-прав (0755/0644) на файлы
# пакета, а если репозиторий лежит на смонтированном Windows-разделе (NTFS/
# exFAT/9p), права там не сохраняются и сборка падает с ошибкой прав доступа.
#
# Пакет не включает node_modules/.venv/.next — npm install, npm run build и
# pip install выполняются на целевой машине в postinst (см. ../../install.sh,
# та же логика).
set -e

VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$(mktemp -d)"
PKG="$BUILD_DIR/pkgroot"

trap 'rm -rf "$BUILD_DIR"' EXIT

mkdir -p \
    "$PKG/DEBIAN" \
    "$PKG/opt/ai-timer-worked/sql/migrations" \
    "$PKG/opt/ai-timer-worked/timer" \
    "$PKG/opt/ai-timer-worked/dashboard/src" \
    "$PKG/opt/ai-timer-worked/dashboard/public" \
    "$PKG/usr/share/applications"

# --- timer ---
cp "$ROOT_DIR/timer/timer.py" "$PKG/opt/ai-timer-worked/timer/timer.py"
cp "$ROOT_DIR/timer/db_backend.py" "$PKG/opt/ai-timer-worked/timer/db_backend.py"
cp "$ROOT_DIR/timer/requirements.txt" "$PKG/opt/ai-timer-worked/timer/requirements.txt"
cp "$ROOT_DIR/timer/.env.example" "$PKG/opt/ai-timer-worked/timer/.env.example"
cp "$ROOT_DIR/timer/README.md" "$PKG/opt/ai-timer-worked/timer/README.md"
cp "$ROOT_DIR/timer/GUIDE.md" "$PKG/opt/ai-timer-worked/timer/GUIDE.md"
cp "$ROOT_DIR/timer/autostart.sh" "$PKG/opt/ai-timer-worked/timer/autostart.sh"

# --- dashboard (исходники, без node_modules/.next — собираются в postinst) ---
cp "$ROOT_DIR/dashboard/package.json" "$PKG/opt/ai-timer-worked/dashboard/package.json"
cp "$ROOT_DIR/dashboard/package-lock.json" "$PKG/opt/ai-timer-worked/dashboard/package-lock.json"
cp "$ROOT_DIR/dashboard/next.config.js" "$PKG/opt/ai-timer-worked/dashboard/next.config.js"
cp "$ROOT_DIR/dashboard/next-env.d.ts" "$PKG/opt/ai-timer-worked/dashboard/next-env.d.ts"
cp "$ROOT_DIR/dashboard/tsconfig.json" "$PKG/opt/ai-timer-worked/dashboard/tsconfig.json"
cp "$ROOT_DIR/dashboard/tailwind.config.ts" "$PKG/opt/ai-timer-worked/dashboard/tailwind.config.ts"
cp "$ROOT_DIR/dashboard/postcss.config.js" "$PKG/opt/ai-timer-worked/dashboard/postcss.config.js"
cp "$ROOT_DIR/dashboard/.env.example" "$PKG/opt/ai-timer-worked/dashboard/.env.example"
cp "$ROOT_DIR/dashboard/README.md" "$PKG/opt/ai-timer-worked/dashboard/README.md"
cp "$ROOT_DIR/dashboard/autostart.sh" "$PKG/opt/ai-timer-worked/dashboard/autostart.sh"
cp -r "$ROOT_DIR/dashboard/src/." "$PKG/opt/ai-timer-worked/dashboard/src/"
cp -r "$ROOT_DIR/dashboard/public/." "$PKG/opt/ai-timer-worked/dashboard/public/"

# --- общие миграции ---
cp "$ROOT_DIR"/sql/migrations/*.sql "$PKG/opt/ai-timer-worked/sql/migrations/"
cp "$ROOT_DIR/sql/STRUCTURE.md" "$PKG/opt/ai-timer-worked/sql/STRUCTURE.md"

# --- пакет ---
cp "$SCRIPT_DIR/pkg-src/control" "$PKG/DEBIAN/control"
cp "$SCRIPT_DIR/pkg-src/postinst" "$PKG/DEBIAN/postinst"
cp "$SCRIPT_DIR/pkg-src/postrm" "$PKG/DEBIAN/postrm"
cp "$SCRIPT_DIR/pkg-src/work-timer.desktop" "$PKG/usr/share/applications/work-timer.desktop"

sed -i "s/^Version: .*/Version: $VERSION/" "$PKG/DEBIAN/control"

find "$PKG" -type d -exec chmod 0755 {} \;
find "$PKG" -type f -exec chmod 0644 {} \;
chmod 0755 "$PKG/DEBIAN/postinst" "$PKG/DEBIAN/postrm"
chmod 0755 "$PKG/opt/ai-timer-worked/timer/timer.py" \
    "$PKG/opt/ai-timer-worked/timer/autostart.sh" \
    "$PKG/opt/ai-timer-worked/dashboard/autostart.sh"

OUT="$SCRIPT_DIR/ai-timer-worked_${VERSION}_all.deb"
dpkg-deb --root-owner-group --build "$PKG" "$OUT"

echo "Собрано: $OUT"
