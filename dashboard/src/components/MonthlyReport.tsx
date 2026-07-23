'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  WorkLogRecord,
  buildWeeklyReport,
  formatDayHeader,
  formatDuration,
  formatDurationDecimal,
  formatElapsed,
  getWeekStart,
  getMonthName,
  DayTasks,
} from '@/lib/report-utils';

interface WeekData {
  days: DayTasks[];
  weekTotalSeconds: number;
  maxTasksPerDay: number;
  weekLabel: string;
}

interface MonthlyReportProps {
  initialRecords: WorkLogRecord[];
  initialMonth: Date;
  initialPlanHours: number | null;
}

export function MonthlyReport({ initialRecords, initialMonth, initialPlanHours }: MonthlyReportProps) {
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState(initialRecords);
  const [planHours, setPlanHours] = useState(initialPlanHours);
  const [loading, setLoading] = useState(false);
  const [weeks, setWeeks] = useState(() => buildMonthWeeks(initialRecords, initialMonth));

  useEffect(() => {
    setWeeks(buildMonthWeeks(records, month));
  }, [records, month]);

  const loadMonth = async (newMonth: Date) => {
    setLoading(true);
    setMonth(newMonth);

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('dashboardMonth', newMonth.toISOString());
    }

    const year = newMonth.getFullYear();
    const month = newMonth.getMonth() + 1;

    const res = await fetch(`/api/report?year=${year}&month=${month}`);
    const data = await res.json();
    setRecords(data.records || []);
    setPlanHours(data.planHours ?? null);
    setLoading(false);
  };

  const prevMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    loadMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    loadMonth(d);
  };

  const currentMonth = () => {
    const now = new Date();
    loadMonth(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  };

  const refresh = () => {
    loadMonth(month);
  };

  const monthTotalSeconds = weeks.reduce((sum, w) => sum + w.weekTotalSeconds, 0);

  return (
    <div className="space-y-3">
      {/* Month label + navigation (left), month total aligned to bottom-right */}
      <div className="flex w-full min-w-[900px] flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Месяц: {getMonthName(month)}</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              disabled={loading}
              className="rounded border border-slate-400 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              ← Предыдущий
            </button>
            <button
              onClick={currentMonth}
              disabled={loading}
              className="rounded border border-slate-400 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              Текущий
            </button>
            <button
              onClick={nextMonth}
              disabled={loading}
              className="rounded border border-slate-400 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              Следующий →
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded border border-slate-400 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              ⟳ Обновить
            </button>
            <Link
              href="/stats"
              className="rounded border border-slate-400 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Статистика
            </Link>
          </div>
        </div>

        <div className="rounded border border-slate-400 bg-white px-6 py-3 shadow-sm text-center">
          <div className="text-sm text-slate-600">Время за месяц</div>
          <div className="text-2xl font-bold text-slate-900">{formatDuration(monthTotalSeconds)}</div>
          <div className="text-sm text-slate-600">{formatDurationDecimal(monthTotalSeconds)} ч.{formatPlanPercent(monthTotalSeconds, planHours)}</div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Загрузка...</p>}

      <div className="space-y-4">
        {weeks.map((week, idx) => (
          <div key={idx} className="overflow-x-auto rounded border border-slate-400 bg-white shadow-sm">
            <div className="grid grid-cols-7 min-w-[900px]">
              {week.days.map((day) => (
                <DayColumn key={day.dayIndex} day={day} />
              ))}
            </div>

            {/* Week total row */}
            <div className="border-t border-slate-400 bg-rose-100 px-3 py-1.5 text-sm">
              <span className="font-semibold text-slate-800">
                Итог за неделю ({week.weekLabel}):
              </span>{' '}
              <span className="font-bold text-slate-900">{formatDuration(week.weekTotalSeconds)}</span>{' '}
              <span className="text-slate-600">({formatDurationDecimal(week.weekTotalSeconds)} ч.)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayColumn({ day }: { day: DayTasks }) {
  const headerHours = day.belongsToMonth ? day.dayTotalSeconds / 3600 : undefined;

  return (
    <div className="border-r border-slate-400 last:border-r-0">
      <div
        className={`px-2 py-1.5 text-center text-xs font-bold border-b border-slate-400 ${
          day.belongsToMonth
            ? 'bg-yellow-200 text-slate-800'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {formatDayHeader(day.date, headerHours)}
      </div>

      <div className="grid grid-cols-[2fr_1fr] border-b border-slate-400 bg-sky-200 text-[10px] font-semibold text-slate-800">
        <div className="px-1 py-1 text-center border-r border-slate-300">Задача</div>
        <div className="px-1 py-1 text-center">Продолж.</div>
      </div>

      <div className="divide-y divide-slate-300">
        {day.rows.map((row, idx) => (
          <div
            key={idx}
            className={`grid grid-cols-[2fr_1fr] min-h-[60px] text-[10px] ${
              row.task ? 'bg-amber-50' : 'bg-amber-50/50'
            }`}
          >
            <div className="border-r border-slate-300 px-1 py-1 align-top font-medium text-slate-800">
              {row.task || ''}
            </div>
            <div className="px-1 py-1 align-top font-semibold text-slate-800 whitespace-nowrap">
              {row.elapsedTime || ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPlanPercent(actualSeconds: number, planHours: number | null): string {
  if (!planHours || planHours <= 0) return '';
  const actualHours = actualSeconds / 3600;
  const percent = (actualHours / planHours) * 100;
  return ` (${percent.toFixed(1)}%)`;
}

function buildMonthWeeks(records: WorkLogRecord[], month: Date): WeekData[] {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

  const firstWeekStart = getWeekStart(monthStart);
  const lastWeekStart = getWeekStart(monthEnd);

  const weeks: WeekData[] = [];

  let current = new Date(firstWeekStart);
  while (current <= lastWeekStart) {
    const report = buildWeeklyReport(records, current, monthStart);
    const weekEnd = new Date(current);
    weekEnd.setDate(current.getDate() + 6);
    const weekLabel = `${current.toLocaleDateString('ru-RU')} — ${weekEnd.toLocaleDateString('ru-RU')}`;

    weeks.push({
      ...report,
      weekLabel,
    });

    current.setDate(current.getDate() + 7);
  }

  return weeks;
}
