'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { aggregateProjects, type ProjectStat } from '@/lib/stats-utils';
import { formatDuration, formatDurationDecimal, getMonthName } from '@/lib/report-utils';
import type { WorkLogRecord } from '@/lib/report-utils';

interface ProjectStatsProps {
  initialRecords: WorkLogRecord[];
  initialMonth: Date;
  initialPlanHours: number | null;
}

const COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
];

export function ProjectStats({ initialRecords, initialMonth, initialPlanHours }: ProjectStatsProps) {
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState(initialRecords);
  const [planHours, setPlanHours] = useState(initialPlanHours);
  const [loading, setLoading] = useState(false);

  // Sync displayed month with dashboard when user navigates back/forward
  useEffect(() => {
    const handleStorage = () => {
      const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('dashboardMonth') : null;
      if (stored) {
        const parsed = new Date(stored);
        if (!isNaN(parsed.getTime())) {
          loadMonth(parsed);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    // Also check on mount (back/forward within same session)
    handleStorage();
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadMonth = async (newMonth: Date) => {
    setLoading(true);
    setMonth(newMonth);

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

  const stats = useMemo(() => aggregateProjects(records, month), [records, month]);
  const totalSeconds = useMemo(
    () => stats.reduce((sum, s) => sum + s.seconds, 0),
    [stats]
  );
  const maxHours = useMemo(
    () => (stats.length > 0 ? Math.max(...stats.map((s) => s.hours)) : 0),
    [stats]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-800">
            Статистика по проектам: {getMonthName(month)}
          </h1>
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
              href="/dashboard"
              className="inline-block rounded border border-slate-400 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              ← Назад к отчёту
            </Link>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Загрузка...</p>}

        <div className="rounded border border-slate-400 bg-white px-6 py-3 text-center shadow-sm">
          <div className="text-sm text-slate-600">Время за месяц</div>
          <div className="text-2xl font-bold text-slate-900">{formatDuration(totalSeconds)}</div>
          <div className="text-sm text-slate-600">
            {formatDurationDecimal(totalSeconds)} ч.
            {planHours && planHours > 0 && (
              <span> ({((totalSeconds / 3600 / planHours) * 100).toFixed(1)}%)</span>
            )}
          </div>
        </div>
      </div>

      {stats.length === 0 ? (
        <p className="text-sm text-slate-500">Нет данных за выбранный месяц.</p>
      ) : (
        <div className="rounded border border-slate-400 bg-white p-4 shadow-sm">
          <div className="space-y-4">
            {stats.map((stat, idx) => (
              <div key={stat.name} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-slate-800">{stat.name}</span>
                  <span className="font-medium text-slate-700">
                    {formatDurationDecimal(stat.seconds)} ч. ({stat.percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-4 w-full rounded bg-slate-200">
                  <div
                    className={`h-4 rounded ${COLORS[idx % COLORS.length]}`}
                    style={{
                      width: maxHours > 0 ? `${(stat.hours / maxHours) * 100}%` : '0%',
                    }}
                    title={`${stat.name}: ${stat.percent.toFixed(1)}%`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-300 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-500">Проектов</div>
                <div className="text-lg font-bold text-slate-800">{stats.length}</div>
              </div>
              <div className="rounded bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-500">Фактических часов</div>
                <div className="text-lg font-bold text-slate-800">
                  {formatDurationDecimal(totalSeconds)} ч.
                </div>
              </div>
              {planHours && planHours > 0 && (
                <div className="rounded bg-slate-50 p-3 text-center">
                  <div className="text-xs text-slate-500">Выполнение плана</div>
                  <div className="text-lg font-bold text-slate-800">
                    {((totalSeconds / 3600 / planHours) * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
