-- Начальная структура базы данных ai-timer-worked (timer + dashboard)
-- Локальный доверенный PostgreSQL: без RLS/ролей anon/authenticated (это конвенция
-- Supabase/PostgREST, здесь не применяется — оба приложения подключаются напрямую).

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    name         text        PRIMARY KEY,
    applied_at   timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wh_work_log (
    id           BIGSERIAL    PRIMARY KEY,
    session_id   UUID         NOT NULL,
    operation    VARCHAR(6)   NOT NULL CHECK (operation IN ('start', 'pause', 'resume', 'stop')),
    task         TEXT,
    event_time   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    elapsed_time TEXT
);

CREATE INDEX IF NOT EXISTS idx_wh_work_log_session    ON public.wh_work_log (session_id);
CREATE INDEX IF NOT EXISTS idx_wh_work_log_event_time ON public.wh_work_log (event_time DESC);

-- Плановое количество рабочих дней/часов по производственному календарю
-- Источник данных: https://www.consultant.ru/law/ref/calendar/proizvodstvennye/2026/ (40-часовая рабочая неделя)
CREATE TABLE IF NOT EXISTS public.wh_plan_work_hourses (
    id         BIGSERIAL PRIMARY KEY,
    year       INTEGER      NOT NULL,
    month      INTEGER      NOT NULL CHECK (month BETWEEN 1 AND 12),
    work_days  INTEGER      NOT NULL,
    work_hours NUMERIC(6,2) NOT NULL,
    UNIQUE (year, month)
);

INSERT INTO public.wh_plan_work_hourses (year, month, work_days, work_hours) VALUES
    (2026, 1,  15, 120.0),
    (2026, 2,  19, 152.0),
    (2026, 3,  21, 168.0),
    (2026, 4,  22, 175.0),
    (2026, 5,  19, 151.0),
    (2026, 6,  21, 167.0),
    (2026, 7,  23, 184.0),
    (2026, 8,  21, 168.0),
    (2026, 9,  22, 176.0),
    (2026, 10, 22, 176.0),
    (2026, 11, 20, 159.0),
    (2026, 12, 22, 176.0)
ON CONFLICT (year, month) DO UPDATE SET
    work_days  = EXCLUDED.work_days,
    work_hours = EXCLUDED.work_hours;

INSERT INTO public.schema_migrations (name, applied_at)
VALUES ('0000_Create_Structure', now()::timestamptz)
ON CONFLICT (name) DO UPDATE SET applied_at = now()::timestamptz;
