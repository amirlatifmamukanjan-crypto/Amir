import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Search } from 'lucide-react';
import type { SchoolDB } from '../types';
import { exportFeesExcel } from '../utils/exporters';
import { StudentAvatar } from './StudentAvatar';

interface FeesViewProps {
  db: SchoolDB;
  month: string;
  onChangeMonth: (month: string) => void;
  onToggleFee: (studentId: string, month: string) => void;
}

export const FeesView: React.FC<FeesViewProps> = ({
  db,
  month,
  onChangeMonth,
  onToggleFee,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  const totals = useMemo(() => {
    let collected = 0;
    let total = 0;
    let paidCount = 0;
    for (const s of db.students) {
      total += s.fee;
      if (db.fees[`${s.id}|${month}`]) {
        collected += s.fee;
        paidCount++;
      }
    }
    return {
      collected,
      pending: Math.max(0, total - collected),
      total,
      paidCount,
      unpaidCount: db.students.length - paidCount,
    };
  }, [db.students, db.fees, month]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.students.filter((s) => {
      const paid = Boolean(db.fees[`${s.id}|${month}`]);
      if (statusFilter === 'PAID' && !paid) return false;
      if (statusFilter === 'UNPAID' && paid) return false;
      if (!q) return true;
      return (
        s.roll.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.cls.toLowerCase().includes(q)
      );
    });
  }, [db.students, db.fees, month, search, statusFilter]);

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Wasool (Collected &middot; {totals.paidCount} Students)
          </p>
          <p className="mt-1 text-2xl font-bold text-[#0f7a3d] dark:text-emerald-400 tabular-nums">
            Rs {totals.collected.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Baqaya (Pending &middot; {totals.unpaidCount} Students)
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            Rs {totals.pending.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Monthly Target ({month})
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            Rs {totals.total.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Controls & table */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => onChangeMonth(e.target.value || month)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />

            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-950">
              {(['ALL', 'PAID', 'UNPAID'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-[#1b2f6b] text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'PAID' ? 'Paid' : 'Unpaid'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => exportFeesExcel(db, month)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Download</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1b2f6b] text-white text-left">
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Roll</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Name</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Class</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Fee</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Status</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Date</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No fee records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const payment = db.fees[`${s.id}|${month}`];
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {s.roll}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-[160px]">
                          <StudentAvatar name={s.name} photo={s.photo} size="sm" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {s.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {s.cls}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                        Rs {s.fee.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            payment
                              ? 'text-[#0f7a3d] dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {payment ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {payment ? payment.date : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleFee(s.id, month)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            payment
                              ? 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                              : 'bg-[#0f7a3d] hover:bg-[#0c6532] text-white'
                          }`}
                        >
                          {payment ? 'Undo' : 'Receive'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
