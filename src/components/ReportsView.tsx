import React, { useMemo } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import type { Role, SchoolDB } from '../types';
import {
  daysInMonth,
  exportMonthlyAttendanceExcel,
  getStudentMonthStat,
} from '../utils/exporters';

interface ReportsViewProps {
  db: SchoolDB;
  role: Role;
  selectedClass: string;
  month: string;
  classes: string[];
  onChangeClass: (cls: string) => void;
  onChangeMonth: (month: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  db,
  role,
  selectedClass,
  month,
  classes,
  onChangeClass,
  onChangeMonth,
}) => {
  const totalDays = useMemo(() => daysInMonth(month), [month]);
  const classStudents = useMemo(
    () => db.students.filter((s) => s.cls === selectedClass),
    [db.students, selectedClass]
  );

  return (
    <div className="space-y-4">
      <div className="no-print rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Monthly Attendance Report
            </h2>
          </div>

          {role === 'admin' ? (
            <select
              value={selectedClass}
              onChange={(e) => onChangeClass(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            >
              {classes.length === 0 ? (
                <option value="">No Classes</option>
              ) : (
                classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))
              )}
            </select>
          ) : (
            <span className="text-sm font-semibold text-[#1b2f6b] dark:text-blue-400">
              {selectedClass}
            </span>
          )}

          <input
            type="month"
            value={month}
            onChange={(e) => onChangeMonth(e.target.value || month)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!selectedClass}
            onClick={() => exportMonthlyAttendanceExcel(db, selectedClass, month)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Download</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Print-only school heading */}
      <div className="hidden print:block mb-3">
        <h2 className="text-lg font-bold">
          {db.schoolName}, {db.campus}
        </h2>
        <p className="text-sm">
          Monthly Attendance Report &mdash; {selectedClass} &mdash; {month}
        </p>
      </div>

      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1b2f6b] text-white">
                <th className="px-2.5 py-2 font-medium text-left whitespace-nowrap sticky left-0 bg-[#1b2f6b]">
                  Roll
                </th>
                <th className="px-2.5 py-2 font-medium text-left whitespace-nowrap">Name</th>
                {Array.from({ length: totalDays }, (_, i) => (
                  <th
                    key={i + 1}
                    className="px-1.5 py-2 font-medium text-center tabular-nums min-w-[26px]"
                  >
                    {i + 1}
                  </th>
                ))}
                <th className="px-2 py-2 font-medium text-center">P</th>
                <th className="px-2 py-2 font-medium text-center">A</th>
                <th className="px-2 py-2 font-medium text-center">L</th>
                <th className="px-2.5 py-2 font-medium text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {classStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalDays + 6}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No students in {selectedClass || 'selected class'}.
                  </td>
                </tr>
              ) : (
                classStudents.map((s) => {
                  const stat = getStudentMonthStat(db.att, s.id, month);
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-2.5 py-2 font-mono text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900">
                        {s.roll}
                      </td>
                      <td className="px-2.5 py-2 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {s.name}
                      </td>
                      {stat.days.map((code, idx) => (
                        <td
                          key={idx}
                          className={`px-1 py-2 text-center font-mono font-semibold ${
                            code === 'P'
                              ? 'text-[#0f7a3d] dark:text-emerald-400'
                              : code === 'A'
                              ? 'text-red-600 dark:text-red-400'
                              : code === 'L'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        >
                          {code || '·'}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-mono font-semibold text-[#0f7a3d] dark:text-emerald-400 tabular-nums">
                        {stat.counts.P}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums">
                        {stat.counts.A}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        {stat.counts.L}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                        {stat.percentage}%
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
