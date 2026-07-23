# ai-timer-worked — установка на Linux

Готовый `.deb`-пакет для Linux Mint / Ubuntu / Debian: трей-таймер + локальный
PostgreSQL + веб-дашборд, всё в одном.

## Установка

```bash
sudo apt install ./ai-timer-worked_1.0.0_all.deb
```

(`apt install ./...` сам подтянет недостающие системные зависимости —
`python3-gi`, `zenity`, `libnotify-bin`, `postgresql` и т.д.; при установке
через `dpkg -i` их придётся доустанавливать вручную через `apt -f install`.)

Пакет разворачивается в `/opt/ai-timer-worked` и во время установки
(`postinst`, требует интернет и работает несколько минут):

1. ставит/проверяет Node.js 22 (через NodeSource, если нет в системе);
2. создаёт роль и базу данных PostgreSQL, накатывает миграции из `sql/migrations/`;
3. создаёт виртуальное окружение `timer/.venv` и ставит Python-зависимости;
4. прописывает `timer/.env` и `dashboard/.env` с общей строкой подключения;
5. ставит npm-зависимости и собирает продакшен-сборку дашборда (`npm run build`).

## Настройка после установки

1. Запустите Work Timer через меню приложений (пункт «Work Timer») либо командой:
   ```bash
   /opt/ai-timer-worked/timer/.venv/bin/python /opt/ai-timer-worked/timer/timer.py
   ```
2. Автозапуск таймера и дашборда настраивается от вашего обычного
   пользователя (не root — это принципиально для systemd `--user` и
   `~/.config/autostart`):
   ```bash
   bash /opt/ai-timer-worked/timer/autostart.sh
   bash /opt/ai-timer-worked/dashboard/autostart.sh
   ```
   После этого дашборд доступен на http://localhost:3000, а таймер и дашборд
   запускаются автоматически при каждом входе в систему. Дашборд также
   открывается из трей-меню таймера: «🌐 Открыть дашборд».

## Обновление

Установите новую версию `.deb` тем же способом — `postinst` переиспользует
существующие `.env` и пароль роли БД.

## Удаление

```bash
sudo apt remove ai-timer-worked      # оставит .env, venv, node_modules, БД
sudo apt purge ai-timer-worked       # дополнительно удалит .env, venv, node_modules,
                                      # автозапуск таймера и systemd-сервис дашборда
                                      # (сама БД PostgreSQL не удаляется)
```

## Пересборка пакета

Исходники пакета — весь репозиторий (`timer/`, `dashboard/`, `sql/`).
Скрипт [`build_deb.sh`](build_deb.sh) собирает `.deb` заново (например, после
изменения кода или версии — версия задаётся переменной `VERSION` в начале
скрипта).

```bash
bash release/linux/build_deb.sh
```

> Собирать нужно на обычной Linux-файловой системе (не на смонтированном
> Windows-разделе) — `dpkg-deb` требует реальных unix-прав на файлы пакета;
> скрипт уже собирает во временном каталоге `mktemp -d`, поэтому это не
> проблема, даже если сам репозиторий лежит на NTFS/9p.
