export type Role = 'admin' | 'teacher' | 'student';
export type AttendanceCode = 'P' | 'A' | 'L';

export interface Student {
  id: string;
  roll: string;
  name: string;
  cls: string;
  fee: number;
  pass: string;
  photo?: string;
}

export interface Teacher {
  id: string;
  name: string;
  user: string;
  pass: string;
  cls: string;
}

export interface FeePayment {
  amt: number;
  date: string;
}

export interface SchoolDB {
  schoolName: string;
  campus: string;
  admin: {
    user: string;
    pass: string;
  };
  teachers: Teacher[];
  students: Student[];
  att: Record<string, Record<string, AttendanceCode>>;
  fees: Record<string, FeePayment>;
  nid: number;
}

export interface SessionUser {
  role: Role;
  id?: string;
}

export type SyncMode = 'local' | 'syncing' | 'synced' | 'offline-queued' | 'error';

export type AdminTab = 'Students' | 'Teachers' | 'Fees' | 'Reports' | 'PC & Cloud Sync';
export type TeacherTab = 'Attendance' | 'Reports';
export type StudentTab = 'My Attendance' | 'My Fees';
export type AppTab = AdminTab | TeacherTab | StudentTab;
