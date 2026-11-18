import React, { useMemo, useState } from 'react';
import { CheckCheck, Search } from 'lucide-react';
import type { AttendanceCode, SchoolDB, Teacher } from '../types';
import { StudentAvatar } from './StudentAvatar';

interface AttendanceViewProps {
  db: SchoolDB;
  teacher: Teacher;
  date: string;
  onChangeDate: (date: string) => void;
  onMark: (dateStr: string, studentId: string, status: AttendanceCode) => void;
  onMarkAllPresent: (dateStr: string, classStudents: string[]) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  db,
  teacher,
  date,
  onChangeDate,
  onMark,
  onMarkAllPresent,
}) => {
  const [search, setSearch] = useState('');

  const classStudents = useMemo(
    () => db.students.filter((s) => s.cls === teacher.cls),
    [db.students, teacher.cls]
  );

  const dayRecord = db.att[date] || {};

  const counts = useMemo(() => {
    let P = 0;
    let A = 0;
    let L = 0;
    for (const s of classStudents) {
      const st = dayRecord[s.id];
      if (st === 'P') P++;
      else if (st === 'A') A++;
      else if (st === 'L') L++;
    }
    return { P, A, L, total: classStudents.length };
  }, [classStudents, dayRecord]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (s) => s.roll.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [classStudents, search]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Class Students
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {counts.total}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Present (P)</p>
          <p className="mt-1 text-xl font-bold text-[#0f7a3d] dark:text-emerald-400 tabular-nums">
            {counts.P}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Absent (A)</p>
          <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">
            {counts.A}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Leave (L)</p>
          <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {counts.L}
          </p>
        </div>
      </div>

      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {teacher.cls} &mdash; Attendance
              </h2>
            </div>

            <input
              type="date"
              value={date}
              onChange={(e) => onChangeDate(e.target.value || date)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />

            <div className="relative min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter Roll / Name..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={classStudents.length === 0}
            onClick={() =>
              onMarkAllPresent(
                date,
                classStudents.map((s) => s.id)
              )
            }
            className="inline-flex items-center gap-2 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Sab Present</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1b2f6b] text-white text-left">
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Roll</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Student Name</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">
                  Status (P / A / L)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No students found in {teacher.cls}.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const status = dayRecord[s.id];
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {s.roll}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <StudentAvatar name={s.name} photo={s.photo} size="sm" />
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {s.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {(['P', 'A', 'L'] as AttendanceCode[]).map((code) => {
                            const active = status === code;
                            let activeStyle = '';
                            if (active && code === 'P') {
                              activeStyle = 'bg-[#0f7a3d] border-[#0f7a3d] text-white';
                            } else if (active && code === 'A') {
                              activeStyle = 'bg-red-600 border-red-600 text-white';
                            } else if (active && code === 'L') {
                              activeStyle = 'bg-amber-500 border-amber-500 text-slate-950';
                            } else {
                              activeStyle =
                                'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800';
                            }
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => onMark(date, s.id, code)}
                                className={`w-9 h-8 rounded-md border text-xs font-bold transition-colors cursor-pointer ${activeStyle}`}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
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
