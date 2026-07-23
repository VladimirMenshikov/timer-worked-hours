import { getWorkLogForRange, getPlanHours } from '@/lib/db';
import { MonthlyReport } from '@/components/MonthlyReport';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Dashboard always opens at current month; internal state handles navigation.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);

  const records = await getWorkLogForRange(monthStart, monthEnd);
  const planHours = await getPlanHours(monthStart.getFullYear(), monthStart.getMonth() + 1);

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <MonthlyReport initialRecords={records} initialMonth={monthStart} initialPlanHours={planHours} />
      </div>
    </main>
  );
}
