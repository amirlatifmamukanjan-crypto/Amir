import React, { useMemo, useRef, useState } from 'react';
import { Camera, Plus, Search, Trash2, Upload } from 'lucide-react';
import { cropPhotoToDataUrl } from '../services/schoolStore';
import type { Student } from '../types';
import { StudentAvatar } from './StudentAvatar';

interface StudentsViewProps {
  students: Student[];
  classes: string[];
  onAddStudent: (data: Omit<Student, 'id'>) => void;
  onUpdateStudentPhoto: (studentId: string, photoDataUrl: string) => void;
  onDeleteStudent: (student: Student) => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  classes,
  onAddStudent,
  onUpdateStudentPhoto,
  onDeleteStudent,
  onNotify,
}) => {
  const [roll, setRoll] = useState('');
  const [name, setName] = useState('');
  const [cls, setCls] = useState('');
  const [fee, setFee] = useState('');
  const [pass, setPass] = useState('1234');
  const [photo, setPhoto] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');

  const newPhotoInputRef = useRef<HTMLInputElement>(null);
  const rowFileInputRef = useRef<HTMLInputElement>(null);
  const activePhotoStudentId = useRef<string | null>(null);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== 'ALL' && s.cls !== classFilter) return false;
      if (!q) return true;
      return (
        s.roll.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.cls.toLowerCase().includes(q)
      );
    });
  }, [students, search, classFilter]);

  const handleNewPhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await cropPhotoToDataUrl(file);
      setPhoto(dataUrl);
    } catch {
      onNotify('Image file valid nahi hai', 'error');
    }
  };

  const handleRowPhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = activePhotoStudentId.current;
    e.target.value = '';
    activePhotoStudentId.current = null;
    if (!file || !targetId) return;
    try {
      const dataUrl = await cropPhotoToDataUrl(file);
      onUpdateStudentPhoto(targetId, dataUrl);
      onNotify('Student photo update ho gayi');
    } catch {
      onNotify('Image file valid nahi hai', 'error');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const r = roll.trim();
    const n = name.trim();
    const c = cls.trim() || 'Class 1';
    const p = pass.trim() || '1234';
    if (!r || !n) {
      onNotify('Roll No aur Name likhein', 'error');
      return;
    }
    if (students.some((s) => s.roll.toLowerCase() === r.toLowerCase())) {
      onNotify('Ye Roll No pehle se mojood hai', 'error');
      return;
    }
    onAddStudent({
      roll: r.slice(0, 32),
      name: n.slice(0, 100),
      cls: c.slice(0, 60),
      fee: Math.max(0, Number(fee) || 0),
      pass: p.slice(0, 64),
      ...(photo ? { photo } : {}),
    });
    setRoll('');
    setName('');
    setFee('');
    setPass('1234');
    setPhoto('');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Naya Student (Add Student)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add student details, monthly fee, portal passcode, and cropped photo
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            Total Students: {students.length}
          </span>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Roll No
            </label>
            <input
              type="text"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              placeholder="e.g. 101"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Student Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Class
            </label>
            <input
              type="text"
              list="aans-class-list"
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              placeholder="Class 1"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Monthly Fee (Rs)
            </label>
            <input
              type="number"
              min={0}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="3000"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
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

          <div className="sm:col-span-2 lg:col-span-6 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <input
                ref={newPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleNewPhotoPick}
              />
              <button
                type="button"
                onClick={() => newPhotoInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{photo ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {photo && (
                <div className="flex items-center gap-2">
                  <StudentAvatar name={name || 'S'} photo={photo} size="sm" />
                  <button
                    type="button"
                    onClick={() => setPhoto('')}
                    className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f7a3d] hover:bg-[#0c6532] px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </div>
        </form>
        <datalist id="aans-class-list">
          {classes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </section>

      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Roll No, Name, or Class..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="student-class-filter"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >
              Class:
            </label>
            <select
              id="student-class-filter"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0f7a3d]"
            >
              <option value="ALL">All Classes ({students.length})</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <input
          ref={rowFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleRowPhotoPick}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1b2f6b] text-white text-left">
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Roll</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Student</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Class</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Monthly Fee</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No students match the current filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
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
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {s.cls}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                      Rs {s.fee.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            activePhotoStudentId.current = s.id;
                            rowFileInputRef.current?.click();
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(s)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
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
