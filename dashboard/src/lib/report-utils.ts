export interface WorkLogRecord {
  id: number;
  session_id: string;
  operation: 'start' | 'stop';
  task: string;
  event_time: string;
  elapsed_time: string | null;
}

export interface TaskRow {
  session_id: string;
  task: string;
  startTime: string;
  elapsedTime: string;
}

export interface DayTasks {
  date: Date;
  dayIndex: number;
  rows: TaskRow[];
  belongsToMonth: boolean;
  dayTotalSeconds: number;
}

const DAY_SHORT_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function formatDayHeader(date: Date, includeTotalHours?: number): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const dayName = DAY_SHORT_NAMES[date.getDay()];
  const base = `${dayName} ${dd}.${mm}.${yyyy}`;
  if (includeTotalHours !== undefined) {
    return `${base} | ${includeTotalHours.toFixed(2)}`;
  }
  return base;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseElapsed(elapsed: string | null): number {
  if (!elapsed) return 0;
  let seconds = 0;

  const hoursMatch = elapsed.match(/(\d+)\s*час\.?/i);
  const minutesMatch = elapsed.match(/(\d+)\s*мин\.?/i);
  const secondsMatch = elapsed.match(/(\d+)\s*сек\.?/i);

  if (hoursMatch) seconds += parseInt(hoursMatch[1], 10) * 3600;
  if (minutesMatch) seconds += parseInt(minutesMatch[1], 10) * 60;
  if (secondsMatch) seconds += parseInt(secondsMatch[1], 10);

  return seconds;
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ч.`);
  if (minutes > 0) parts.push(`${minutes} мин.`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} сек.`);

  return parts.join(' ');
}

export function formatDurationDecimal(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  return `${hours.toFixed(2)}`;
}

export function formatDurationHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatElapsed(elapsed: string | null): string {
  const seconds = parseElapsed(elapsed);
  return formatDurationHHMMSS(seconds);
}

function toISODate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function buildWeeklyReport(
  records: WorkLogRecord[],
  weekStart: Date,
  selectedMonth: Date
): {
  days: DayTasks[];
  weekTotalSeconds: number;
  maxTasksPerDay: number;
} {
  const start = getWeekStart(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

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

  const days: DayTasks[] = [];
  let maxTasksPerDay = 0;
  let weekTotalSeconds = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = toISODate(d);
    const belongsToMonth = isSameMonth(d, selectedMonth);

    let dayRows: TaskRow[] = [];
    let dayTotalSeconds = 0;

    if (belongsToMonth) {
      for (const [, s] of Array.from(sessions.entries())) {
        if (!s.start) continue;
        const startDate = new Date(s.start.event_time);
        if (toISODate(startDate) === dateStr) {
          const elapsed = parseElapsed(s.stop?.elapsed_time || null);
          dayRows.push({
            session_id: s.start.session_id,
            task: s.task,
            startTime: s.start.event_time,
            elapsedTime: formatElapsed(s.stop?.elapsed_time || null),
          });
          dayTotalSeconds += elapsed;
        }
      }
      dayRows.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }

    if (dayRows.length > maxTasksPerDay) {
      maxTasksPerDay = dayRows.length;
    }

    weekTotalSeconds += dayTotalSeconds;

    days.push({
      date: d,
      dayIndex: i,
      rows: dayRows,
      belongsToMonth,
      dayTotalSeconds,
    });
  }

  // Pad each day to maxTasksPerDay for aligned grid
  for (const day of days) {
    while (day.rows.length < maxTasksPerDay) {
      day.rows.push({
        session_id: '',
        task: '',
        startTime: '',
        elapsedTime: '',
      });
    }
  }

  return { days, weekTotalSeconds, maxTasksPerDay };
}

export function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function getMonthName(date: Date): string {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}
