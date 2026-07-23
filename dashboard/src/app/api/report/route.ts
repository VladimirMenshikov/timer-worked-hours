import { NextResponse } from 'next/server';
import { getWorkLogForRange, getPlanHours } from '@/lib/db';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');

  let year: number;
  let month: number;

  if (yearParam && monthParam) {
    year = parseInt(yearParam, 10);
    month = parseInt(monthParam, 10);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
  }

  // Use UTC midnight bounds so toISOString matches the intended local month
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const records = await getWorkLogForRange(start, end);
  const planHours = await getPlanHours(year, month);

  return NextResponse.json({ records, planHours });
}
