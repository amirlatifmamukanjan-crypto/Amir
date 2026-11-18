import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Teacher } from '../types';

interface TeachersViewProps {
  teachers: Teacher[];
  classes: string[];
  onAddTeacher: (data: Omit<Teacher, 'id'>) => void;
  onDeleteTeacher: (teacher: Teacher) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const TeachersView: React.FC<TeachersViewProps> = ({
  teachers,
  classes,
  onAddTeacher,
  onDeleteTeacher,
  onNotify,
}) => {
  const [name, setName] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('1234');
  const [cls, setCls] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const u = user.trim();
    const p = pass.trim() || '1234';
    const c = cls.trim() || 'Class 1';

    if (!n || !u) {
      onNotify('Name aur Username likhein', 'error');
      return;
    }
    if (teachers.some((t) => t.user.toLowerCase() === u.toLowerCase())) {
      onNotify('Ye username pehle se mojood hai', 'error');
      return;
    }

    onAddTeacher({
      name: n.slice(0, 100),
      user: u.slice(0, 40),
      pass: p.slice(0, 64),
      cls: c.slice(0, 60),
    });

    setName('');
    setUser('');
    setPass('1234');
    setCls('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Naya Teacher (Add Teacher)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign teacher login credentials and class responsibility
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            Total Teachers: {teachers.length}
          </span>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Teacher Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayesha Khan"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="e.g. t2"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              type="text"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="1234"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Assigned Class
            </label>
            <input
              type="text"
              list="aans-teacher-class-list"
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              placeholder="Class 1"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Teacher</span>
            </button>
          </div>
        </form>
        <datalist id="aans-teacher-class-list">
          {classes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </section>

      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1b2f6b] text-white text-left">
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Teacher Name</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Username</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Assigned Class</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {teachers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No teachers added yet.
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                      {t.name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {t.user}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {t.cls}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteTeacher(t)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
