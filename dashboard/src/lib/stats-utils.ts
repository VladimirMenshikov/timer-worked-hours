import { parseElapsed } from './report-utils';
import type { WorkLogRecord } from './report-utils';

export interface ProjectStat {
  name: string;
  seconds: number;
  hours: number;
  percent: number;
}

export function aggregateProjects(records: WorkLogRecord[], monthStart: Date): ProjectStat[] {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);

  // Pair start/stop records by session_id
  const sessions = new Map<string, { task: string; start?: WorkLogRecord; stop?: WorkLogRecord }>();
  for (const r of records) {
    if (!sessions.has(r.session_id)) {
      sessions.set(r.session_id, { task: r.task });
    }
    const s = sessions.get(r.session_id)!;
    if (r.operation === 'start') s.start = r;
    else if (r.operation === 'stop') s.stop = r;
    s.task = r.task || s.task;
  }

  const totals = new Map<string, number>();
  let monthTotalSeconds = 0;

  for (const [, s] of Array.from(sessions.entries())) {
    if (!s.start || !s.stop) continue;
    const startDate = new Date(s.start.event_time);
    if (startDate < start || startDate > end) continue;
    const elapsed = parseElapsed(s.stop.elapsed_time);
    if (elapsed <= 0) continue;
    const fullTask = s.task || '(без названия)';
    const projectName = fullTask.split(':')[0].trim() || fullTask;
    totals.set(projectName, (totals.get(projectName) || 0) + elapsed);
    monthTotalSeconds += elapsed;
  }

  const stats: ProjectStat[] = [];
  for (const [name, seconds] of Array.from(totals.entries())) {
    const hours = seconds / 3600;
    const percent = monthTotalSeconds > 0 ? (seconds / monthTotalSeconds) * 100 : 0;
    stats.push({ name, seconds, hours, percent });
  }

  stats.sort((a, b) => b.seconds - a.seconds);
  return stats;
}

export function parseMonthParam(monthParam: string | null): Date | null {
  if (!monthParam) return null;
  const match = monthParam.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function formatMonthParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
