import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  CalendarCheck2,
  CheckCircle2,
  Cloud,
  CloudOff,
  FileSpreadsheet,
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Sun,
  Users,
  Wallet,
  X,
  AlertCircle,
} from 'lucide-react';
import { auth, signInWithGoogle, signOutCloud } from './firebase';
import {
  cloudDeleteStudent,
  cloudDeleteTeacher,
  cloudSaveAttendance,
  cloudSaveStudent,
  cloudSaveTeacher,
  cloudToggleFee,
  cloudUpdateAdminPassword,
  ensureCloudSchoolDoc,
  loadLocalDB,
  pushLocalToCloud,
  saveLocalDB,
  subscribeSchoolCloud,
  type CloudKnownIds,
} from './services/schoolStore';
import type {
  AdminTab,
  AppTab,
  AttendanceCode,
  Role,
  SchoolDB,
  SessionUser,
  Student,
  StudentTab,
  SyncMode,
  Teacher,
  TeacherTab,
} from './types';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AttendanceView } from './components/AttendanceView';
import { ConfirmModal } from './components/ConfirmModal';
import { FeesView } from './components/FeesView';
import { LoginView } from './components/LoginView';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ReportsView } from './components/ReportsView';
import { StudentPortalView } from './components/StudentPortalView';
import { StudentsView } from './components/StudentsView';
import { SyncBackupView } from './components/SyncBackupView';
import { TeachersView } from './components/TeachersView';

const ROLE_TABS: Record<Role, AppTab[]> = {
  admin: ['Students', 'Teachers', 'Fees', 'Reports', 'PC & Cloud Sync'] as AdminTab[],
  teacher: ['Attendance', 'Reports'] as TeacherTab[],
  student: ['My Attendance', 'My Fees'] as StudentTab[],
};

const TAB_ICONS: Record<AppTab, React.FC<{ className?: string }>> = {
  Students: GraduationCap,
  Teachers: Users,
  Fees: Receipt,
  Reports: FileSpreadsheet,
  'PC & Cloud Sync': Cloud,
  Attendance: CalendarCheck2,
  'My Attendance': CalendarCheck2,
  'My Fees': Wallet,
};

export default function App() {
  const isOnline = useOnlineStatus();
  const [db, setDb] = useState<SchoolDB>(() => loadLocalDB());
  const [session, setSession] = useState<SessionUser | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('Students');

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedMonth, setSelectedMonth] = useState<string>(todayIso.slice(0, 7));
  const [selectedClass, setSelectedClass] = useState<string>('');

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aans_dark') === '1';
    } catch {
      return false;
    }
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cloudUser, setCloudUser] = useState<FirebaseUser | null>(null);
  const [syncMode, setSyncMode] = useState<SyncMode>('local');

  const knownIdsRef = useRef<CloudKnownIds>({
    students: new Set(),
    teachers: new Set(),
    attendance: new Set(),
    fees: new Set(),
  });
  const initialCloudCheckedRef = useRef<string | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('aans_dark', darkMode ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    saveLocalDB(db);
  }, [db]);

  const classes = useMemo(() => {
    const set = new Set<string>();
    for (const s of db.students) if (s.cls) set.add(s.cls);
    for (const t of db.teachers) if (t.cls) set.add(t.cls);
    return Array.from(set).sort();
  }, [db.students, db.teachers]);

  useEffect(() => {
    if (!selectedClass || !classes.includes(selectedClass)) {
      setSelectedClass(classes[0] || '');
    }
  }, [classes, selectedClass]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      if (!user) {
        setSyncMode('local');
        initialCloudCheckedRef.current = null;
        knownIdsRef.current = {
          students: new Set(),
          teachers: new Set(),
          attendance: new Set(),
          fees: new Set(),
        };
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore when Google user is connected
  useEffect(() => {
    if (!cloudUser) return;
    setSyncMode(isOnline ? 'syncing' : 'offline-queued');

    const schoolId = cloudUser.uid;
    const unsub = subscribeSchoolCloud(
      schoolId,
      (patch, knownIds, hasRemoteData) => {
        knownIdsRef.current = knownIds;
        if (hasRemoteData) {
          setDb((prev) => {
            const next: SchoolDB = {
              ...prev,
              ...(patch.schoolName ? { schoolName: patch.schoolName } : {}),
              ...(patch.campus ? { campus: patch.campus } : {}),
              ...(patch.admin ? { admin: patch.admin } : {}),
              ...(patch.students ? { students: patch.students } : {}),
              ...(patch.teachers ? { teachers: patch.teachers } : {}),
              ...(patch.att ? { att: patch.att } : {}),
              ...(patch.fees ? { fees: patch.fees } : {}),
            };
            saveLocalDB(next);
            return next;
          });
          setSyncMode(navigator.onLine ? 'synced' : 'offline-queued');
        } else if (initialCloudCheckedRef.current !== schoolId && navigator.onLine) {
          initialCloudCheckedRef.current = schoolId;
          // Initialize empty cloud workspace with current local records
          void pushLocalToCloud(schoolId, loadLocalDB())
            .then(() => {
              setSyncMode('synced');
            })
            .catch(() => {
              setSyncMode('error');
            });
        } else {
          setSyncMode(navigator.onLine ? 'synced' : 'offline-queued');
        }
      },
      () => {
        setSyncMode('error');
      }
    );

    return () => unsub();
  }, [cloudUser, isOnline]);

  const handleConnectCloud = useCallback(async () => {
    try {
      const user = await signInWithGoogle();
      await ensureCloudSchoolDoc(user.uid, db);
      notify(`Cloud Sync connected (${user.email || 'Google Account'})`);
    } catch {
      notify('Google Cloud Sync connect nahi ho saka', 'error');
    }
  }, [db, notify]);

  const handleDisconnectCloud = useCallback(async () => {
    try {
      await signOutCloud();
      notify('Cloud Sync disconnected — local mode active');
    } catch {
      notify('Disconnect karne me masla aya', 'error');
    }
  }, [notify]);

  const handlePushLocalToCloud = useCallback(async () => {
    if (!cloudUser) return;
    setSyncMode('syncing');
    try {
      await pushLocalToCloud(cloudUser.uid, db);
      setSyncMode(navigator.onLine ? 'synced' : 'offline-queued');
      notify('Tamam local data Cloud par sync ho gaya');
    } catch {
      setSyncMode('error');
      notify('Cloud par sync karne me error aya', 'error');
    }
  }, [cloudUser, db, notify]);

  const handleLogin = (role: Role, username: string, password: string): boolean => {
    if (role === 'admin') {
      if (username === db.admin.user && password === db.admin.pass) {
        setSession({ role: 'admin' });
        setActiveTab(ROLE_TABS.admin[0]);
        return true;
      }
      return false;
    }

    if (role === 'teacher') {
      const teacher = db.teachers.find((t) => t.user === username && t.pass === password);
      if (teacher) {
        setSession({ role: 'teacher', id: teacher.id });
        setActiveTab(ROLE_TABS.teacher[0]);
        setSelectedClass(teacher.cls);
        return true;
      }
      return false;
    }

    const student = db.students.find((s) => s.roll === username && s.pass === password);
    if (student) {
      setSession({ role: 'student', id: student.id });
      setActiveTab(ROLE_TABS.student[0]);
      return true;
    }
    return false;
  };

  const currentTeacher = useMemo(
    () =>
      session?.role === 'teacher'
        ? db.teachers.find((t) => t.id === session.id) || null
        : null,
    [session, db.teachers]
  );

  const currentStudent = useMemo(
    () =>
      session?.role === 'student'
        ? db.students.find((s) => s.id === session.id) || null
        : null,
    [session, db.students]
  );

  // Mutations (Local-first + Cloud write-through)
  const handleAddStudent = (data: Omit<Student, 'id'>) => {
    const newId = String(db.nid);
    const created: Student = { ...data, id: newId };
    setDb((prev) => ({
      ...prev,
      nid: prev.nid + 1,
      students: [...prev.students, created],
    }));
    notify(`${created.name} add ho gaya`);

    if (cloudUser) {
      void ensureCloudSchoolDoc(cloudUser.uid, db)
        .then(() => cloudSaveStudent(cloudUser.uid, created, false))
        .catch(() => setSyncMode('error'));
    }
  };

  const handleUpdateStudentPhoto = (studentId: string, photoDataUrl: string) => {
    let updatedStudent: Student | null = null;
    setDb((prev) => ({
      ...prev,
      students: prev.students.map((s) => {
        if (s.id === studentId) {
          updatedStudent = { ...s, photo: photoDataUrl };
          return updatedStudent;
        }
        return s;
      }),
    }));

    if (cloudUser && updatedStudent) {
      const exists = knownIdsRef.current.students.has(studentId);
      void cloudSaveStudent(cloudUser.uid, updatedStudent, exists).catch(() =>
        setSyncMode('error')
      );
    }
  };

  const handleDeleteStudent = (student: Student) => {
    setConfirmState({
      title: 'Delete Student',
      message: `Kya aap "${student.name}" (Roll No: ${student.roll}) ko delete karna chahte hain?`,
      onConfirm: () => {
        setConfirmState(null);
        setDb((prev) => ({
          ...prev,
          students: prev.students.filter((s) => s.id !== student.id),
        }));
        notify(`${student.name} delete ho gaya`);
        if (cloudUser) {
          void cloudDeleteStudent(cloudUser.uid, student.id).catch(() =>
            setSyncMode('error')
          );
        }
      },
    });
  };

  const handleAddTeacher = (data: Omit<Teacher, 'id'>) => {
    const newId = String(db.nid);
    const created: Teacher = { ...data, id: newId };
    setDb((prev) => ({
      ...prev,
      nid: prev.nid + 1,
      teachers: [...prev.teachers, created],
    }));
    notify(`Teacher ${created.name} add ho gaya`);

    if (cloudUser) {
      void ensureCloudSchoolDoc(cloudUser.uid, db)
        .then(() => cloudSaveTeacher(cloudUser.uid, created, false))
        .catch(() => setSyncMode('error'));
    }
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    setConfirmState({
      title: 'Delete Teacher',
      message: `Kya aap teacher "${teacher.name}" (${teacher.user}) ko delete karna chahte hain?`,
      onConfirm: () => {
        setConfirmState(null);
        setDb((prev) => ({
          ...prev,
          teachers: prev.teachers.filter((t) => t.id !== teacher.id),
        }));
        notify(`${teacher.name} delete ho gaya`);
        if (cloudUser) {
          void cloudDeleteTeacher(cloudUser.uid, teacher.id).catch(() =>
            setSyncMode('error')
          );
        }
      },
    });
  };

  const handleToggleFee = (studentId: string, month: string) => {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) return;
    const key = `${studentId}|${month}`;
    const existing = db.fees[key];
    const nextPayment = existing
      ? null
      : { amt: student.fee, date: new Date().toISOString().slice(0, 10) };

    setDb((prev) => {
      const nextFees = { ...prev.fees };
      if (!nextPayment) {
        delete nextFees[key];
      } else {
        nextFees[key] = nextPayment;
      }
      return { ...prev, fees: nextFees };
    });

    if (cloudUser) {
      void cloudToggleFee(cloudUser.uid, studentId, month, nextPayment).catch(() =>
        setSyncMode('error')
      );
    }
  };

  const handleMarkAttendance = (
    dateStr: string,
    studentId: string,
    status: AttendanceCode
  ) => {
    setDb((prev) => ({
      ...prev,
      att: {
        ...prev.att,
        [dateStr]: {
          ...(prev.att[dateStr] || {}),
          [studentId]: status,
        },
      },
    }));

    if (cloudUser) {
      const attId = `${dateStr}_${studentId}`;
      const exists = knownIdsRef.current.attendance.has(attId);
      void cloudSaveAttendance(cloudUser.uid, dateStr, studentId, status, exists).catch(
        () => setSyncMode('error')
      );
    }
  };

  const handleMarkAllPresent = (dateStr: string, studentIds: string[]) => {
    setDb((prev) => {
      const dayMap = { ...(prev.att[dateStr] || {}) };
      for (const sid of studentIds) dayMap[sid] = 'P';
      return {
        ...prev,
        att: {
          ...prev.att,
          [dateStr]: dayMap,
        },
      };
    });
    notify(`Sab ${studentIds.length} students Present mark ho gaye`);

    if (cloudUser) {
      for (const sid of studentIds) {
        const attId = `${dateStr}_${sid}`;
        const exists = knownIdsRef.current.attendance.has(attId);
        void cloudSaveAttendance(cloudUser.uid, dateStr, sid, 'P', exists).catch(() =>
          setSyncMode('error')
        );
      }
    }
  };

  const handleRestoreDB = async (restored: SchoolDB) => {
    setDb(restored);
    saveLocalDB(restored);
    if (cloudUser && isOnline) {
      setSyncMode('syncing');
      try {
        await pushLocalToCloud(cloudUser.uid, restored);
        setSyncMode('synced');
      } catch {
        setSyncMode('error');
      }
    }
  };

  const handleChangeAdminPassword = async (newPass: string) => {
    setDb((prev) => ({
      ...prev,
      admin: { ...prev.admin, pass: newPass },
    }));
    notify('Admin password update ho gaya');
    if (cloudUser) {
      try {
        await cloudUpdateAdminPassword(cloudUser.uid, newPass);
      } catch {
        setSyncMode('error');
      }
    }
  };

  // Render login view if not signed in to school portal
  if (!session) {
    return (
      <>
        <LoginView
          db={db}
          cloudUser={cloudUser}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          onLogin={handleLogin}
          onConnectCloud={handleConnectCloud}
          onDisconnectCloud={handleDisconnectCloud}
        />
        <OfflineBanner />
      </>
    );
  }

  const tabs = ROLE_TABS[session.role];
  const currentTab: AppTab = tabs.includes(activeTab) ? activeTab : tabs[0];
  const whoLabel =
    session.role === 'admin'
      ? 'Admin'
      : session.role === 'teacher'
      ? currentTeacher?.name || 'Teacher'
      : currentStudent?.name || 'Student';

  const syncLabel = !cloudUser
    ? 'Local Mode'
    : syncMode === 'synced'
    ? 'Cloud Synced'
    : syncMode === 'syncing'
    ? 'Syncing...'
    : syncMode === 'offline-queued'
    ? 'Offline Queued'
    : 'Sync Issue';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Mobile sidebar backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* 256px Institutional Sidebar */}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 bg-[#1b2f6b] text-white flex flex-col justify-between transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/school-logo.png"
                alt={db.schoolName}
                className="w-10 h-10 rounded-lg bg-white/95 p-0.5 object-contain shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight truncate">{db.schoolName}</p>
                <p className="text-xs text-white/75 truncate">{db.campus}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1" aria-label="Primary navigation">
            {tabs.map((tab) => {
              const Icon = TAB_ICONS[tab];
              const isActive = currentTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#0f7a3d] text-white'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/15 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-white/80">
            <span className="inline-flex items-center gap-1.5">
              {cloudUser ? (
                <Cloud className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{syncLabel}</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{whoLabel}</p>
              <p className="text-xs text-white/70 capitalize">{session.role}</p>
            </div>
            <button
              type="button"
              onClick={() => setSession(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Utility Header */}
        <header className="no-print sticky top-0 z-20 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-500 dark:text-slate-400 capitalize hidden sm:inline">
                {session.role}
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <h1 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentTab}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton variant="outline" label="Install PC App" />
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {currentTab === 'Students' && (
            <StudentsView
              students={db.students}
              classes={classes}
              onAddStudent={handleAddStudent}
              onUpdateStudentPhoto={handleUpdateStudentPhoto}
              onDeleteStudent={handleDeleteStudent}
              onNotify={notify}
            />
          )}

          {currentTab === 'Teachers' && (
            <TeachersView
              teachers={db.teachers}
              classes={classes}
              onAddTeacher={handleAddTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onNotify={notify}
            />
          )}

          {currentTab === 'Fees' && (
            <FeesView
              db={db}
              month={selectedMonth}
              onChangeMonth={setSelectedMonth}
              onToggleFee={handleToggleFee}
            />
          )}

          {currentTab === 'Attendance' && currentTeacher && (
            <AttendanceView
              db={db}
              teacher={currentTeacher}
              date={selectedDate}
              onChangeDate={setSelectedDate}
              onMark={handleMarkAttendance}
              onMarkAllPresent={handleMarkAllPresent}
            />
          )}

          {currentTab === 'Reports' && (
            <ReportsView
              db={db}
              role={session.role}
              selectedClass={
                session.role === 'teacher' && currentTeacher
                  ? currentTeacher.cls
                  : selectedClass
              }
              month={selectedMonth}
              classes={classes}
              onChangeClass={setSelectedClass}
              onChangeMonth={setSelectedMonth}
            />
          )}

          {(currentTab === 'My Attendance' || currentTab === 'My Fees') &&
            currentStudent && (
              <StudentPortalView
                db={db}
                student={currentStudent}
                mode={currentTab}
                month={selectedMonth}
                onChangeMonth={setSelectedMonth}
              />
            )}

          {currentTab === 'PC & Cloud Sync' && (
            <SyncBackupView
              db={db}
              cloudUser={cloudUser}
              syncMode={syncMode}
              isOnline={isOnline}
              onConnectCloud={handleConnectCloud}
              onDisconnectCloud={handleDisconnectCloud}
              onPushLocalToCloud={handlePushLocalToCloud}
              onRestoreDB={handleRestoreDB}
              onChangeAdminPassword={handleChangeAdminPassword}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-[#0f7a3d]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />

      <OfflineBanner />
    </div>
  );
}
