import React, { useMemo } from 'react';
import type { SchoolDB, Student, StudentTab } from '../types';
import { getStudentMonthStat } from '../utils/exporters';
import { StudentAvatar } from './StudentAvatar';

interface StudentPortalViewProps {
  db: SchoolDB;
  student: Student;
  mode: StudentTab;
  month: string;
  onChangeMonth: (month: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  db,
  student,
  mode,
  month,
  onChangeMonth,
}) => {
  const stat = useMemo(
    () => getStudentMonthStat(db.att, student.id, month),
    [db.att, student.id, month]
  );

  const year = month.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Student Profile Header */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <StudentAvatar name={student.name} photo={student.photo} size="lg" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {student.name}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              Roll No: <span className="font-mono font-semibold">{student.roll}</span> &middot;{' '}
              {student.cls}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
              Monthly Tuition Fee: Rs {student.fee.toLocaleString()}
            </p>
          </div>
        </div>

        <input
          type="month"
          value={month}
          onChange={(e) => onChangeMonth(e.target.value || month)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
        />
      </section>

      {mode === 'My Attendance' ? (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Meri Attendance ({month})
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
              <span>
                Present:{' '}
                <strong className="text-[#0f7a3d] dark:text-emerald-400">
                  {stat.counts.P}
                </strong>
              </span>
              <span>
                Absent:{' '}
                <strong className="text-red-600 dark:text-red-400">{stat.counts.A}</strong>
              </span>
              <span>
                Leave:{' '}
                <strong className="text-amber-600 dark:text-amber-400">
                  {stat.counts.L}
                </strong>
              </span>
              <span>
                Rate: <strong className="text-slate-900 dark:text-slate-100">{stat.percentage}%</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
            {stat.days.map((code, idx) => {
              let style =
                'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400';
              if (code === 'P') {
                style =
                  'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 text-[#0f7a3d] dark:text-emerald-300';
              } else if (code === 'A') {
                style =
                  'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300';
              } else if (code === 'L') {
                style =
                  'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';
              }

              return (
                <div
                  key={idx + 1}
                  className={`rounded-lg border p-2 text-center tabular-nums ${style}`}
                >
                  <div className="text-[11px] opacity-75">{idx + 1}</div>
                  <div className="text-sm font-bold font-mono mt-0.5">{code || '—'}</div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Meri Fee ({year})
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              12-Month Annual Fee Ledger
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#1b2f6b] text-white text-left">
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Month</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Fee</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Status</th>
                  <th className="px-4 py-2.5 font-medium whitespace-nowrap">Paid Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {Array.from({ length: 12 }, (_, idx) => {
                  const mKey = `${year}-${String(idx + 1).padStart(2, '0')}`;
                  const payment = db.fees[`${student.id}|${mKey}`];
                  return (
                    <tr
                      key={mKey}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {MONTH_NAMES[idx]} <span className="font-mono text-xs text-slate-500">({mKey})</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                        Rs {(payment?.amt ?? student.fee).toLocaleString()}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
