import { Pool } from 'pg';
import type { WorkLogRecord } from '@/lib/report-utils';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function getWorkLogForRange(start: Date, end: Date): Promise<WorkLogRecord[]> {
  const { rows } = await pool.query<WorkLogRecord>(
    `SELECT id, session_id, operation, task, event_time::text, elapsed_time FROM wh_work_log
     WHERE event_time >= $1 AND event_time <= $2
     ORDER BY event_time ASC`,
    [start.toISOString(), end.toISOString()],
  );
  return rows;
}

export async function getPlanHours(year: number, month: number): Promise<number | null> {
  const { rows } = await pool.query<{ work_hours: string }>(
    `SELECT work_hours FROM wh_plan_work_hourses WHERE year = $1 AND month = $2 LIMIT 1`,
    [year, month],
  );
  return rows[0] ? Number(rows[0].work_hours) : null;
}

export interface PlanHoursRow {
  id: number;
  year: number;
  month: number;
  work_hours: number;
}

export async function getPlanHoursForYear(year: number): Promise<PlanHoursRow[]> {
  const { rows } = await pool.query<PlanHoursRow>(
    `SELECT id, year, month, work_hours FROM wh_plan_work_hourses
     WHERE year = $1
     ORDER BY month ASC`,
    [year],
  );
  return rows.map((row) => ({ ...row, work_hours: Number(row.work_hours) }));
}
