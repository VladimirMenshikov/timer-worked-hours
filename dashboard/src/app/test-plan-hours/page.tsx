import { getPlanHoursForYear } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function TestPlanHoursPage() {
  const year = new Date().getFullYear();
  const rows = await getPlanHoursForYear(year);
  const total = rows.reduce((sum, row) => sum + (row.work_hours ?? 0), 0);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Плановые часы — {year}</h1>

        {rows.length === 0 && (
          <p className="text-slate-600">Нет данных за текущий год.</p>
        )}

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">Месяц</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Часы</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">{row.month.toString().padStart(2, '0')}.{row.year}</td>
                    <td className="px-4 py-3">{row.work_hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          Всего за год: <strong>{total}</strong> часов
        </div>
      </div>
    </main>
  );
}
