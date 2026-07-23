# WorkMap Report — дашборд

Веб-приложение на Next.js для просмотра недельного/месячного отчёта по задачам из
таблицы `wh_work_log` локальной PostgreSQL. Часть проекта `ai-timer-worked`
(вместе с `../timer/`), устанавливается и настраивается через корневой
`../install.sh`.

## Возможности

- Недельная таблица задач с днями недели (`НН ДДД ДД.ММ.ГГГГ`).
- Выровненная сетка: каждый день содержит столько строк, сколько задач в самом насыщенном дне.
- Итоги: время за неделю и с начала месяца, сравнение с плановыми часами.
- Переключение недель/месяцев (текущий, предыдущий, следующий).
- Без авторизации — предполагается локальный запуск на `localhost`, доступ из сети не предусмотрен.

## Архитектура

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind CSS.
- **Database:** локальный PostgreSQL, подключение напрямую через `pg` (`src/lib/db.ts`), без RLS/ролей.
  - `wh_work_log` — события таймера.
  - `wh_plan_work_hourses` — плановые часы по месяцам.

## Переменные окружения (`.env`, заполняется `install.sh`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_timer_worked
PORT=3000
```

## Локальная разработка

```bash
npm install
npm run dev
```

Откройте http://localhost:3000 — сразу редиректит на `/dashboard`.

## Продакшен-запуск

```bash
npm install
npm run build
npm start
```

Установщик `../install.sh` регистрирует это как systemd `--user` сервис
`ai-work-hours-dashboard`, запускается автоматически при входе в систему.

## Структура проекта

```
.
├── src/
│   ├── app/                  # Next.js App Router: dashboard, stats, test-plan-hours, api/report
│   ├── components/           # React компоненты (MonthlyReport, ProjectStats)
│   └── lib/                  # db.ts (pg), report-utils.ts, stats-utils.ts
├── next.config.js
└── README.md
```
