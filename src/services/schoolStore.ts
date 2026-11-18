import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { AttendanceCode, FeePayment, SchoolDB, Student, Teacher } from '../types';

const STORAGE_KEY_V2 = 'aans_v2';
const STORAGE_KEY_V1 = 'aans_v1';

export function createDefaultDB(): SchoolDB {
  return {
    schoolName: 'Ayesha Amir Nursing School',
    campus: 'Mamukanjan',
    admin: { user: 'admin', pass: 'admin123' },
    teachers: [
      { id: '1', name: 'Teacher One', user: 't1', pass: '1234', cls: 'Class 1' },
    ],
    students: [
      { id: '2', roll: '1', name: 'Sample Student', cls: 'Class 1', pass: '1234', fee: 3000 },
      { id: '3', roll: '2', name: 'Sample Student 2', cls: 'Class 1', pass: '1234', fee: 3000 },
    ],
    att: {},
    fees: {},
    nid: 4,
  };
}

export function normalizeDB(raw: unknown): SchoolDB {
  if (!raw || typeof raw !== 'object') return createDefaultDB();
  const obj = raw as Record<string, unknown>;
  const def = createDefaultDB();

  const teachersRaw = Array.isArray(obj.teachers) ? obj.teachers : def.teachers;
  const studentsRaw = Array.isArray(obj.students) ? obj.students : def.students;

  const teachers: Teacher[] = teachersRaw.map((t: Record<string, unknown>, idx) => ({
    id: String(t.id ?? idx + 1),
    name: String(t.name ?? 'Teacher'),
    user: String(t.user ?? `t${idx + 1}`),
    pass: String(t.pass ?? '1234'),
    cls: String(t.cls ?? 'Class 1'),
  }));

  const students: Student[] = studentsRaw.map((s: Record<string, unknown>, idx) => ({
    id: String(s.id ?? idx + 100),
    roll: String(s.roll ?? idx + 1),
    name: String(s.name ?? 'Student'),
    cls: String(s.cls ?? 'Class 1'),
    fee: Number(s.fee) || 0,
    pass: String(s.pass ?? '1234'),
    ...(typeof s.photo === 'string' && s.photo ? { photo: s.photo } : {}),
  }));

  const att: SchoolDB['att'] = {};
  if (obj.att && typeof obj.att === 'object') {
    for (const [dateStr, dayMap] of Object.entries(obj.att as Record<string, unknown>)) {
      if (dayMap && typeof dayMap === 'object') {
        att[dateStr] = {};
        for (const [sid, code] of Object.entries(dayMap as Record<string, unknown>)) {
          if (code === 'P' || code === 'A' || code === 'L') {
            att[dateStr][String(sid)] = code;
          }
        }
      }
    }
  }

  const fees: SchoolDB['fees'] = {};
  if (obj.fees && typeof obj.fees === 'object') {
    for (const [key, val] of Object.entries(obj.fees as Record<string, unknown>)) {
      if (val && typeof val === 'object') {
        const f = val as Record<string, unknown>;
        fees[key] = {
          amt: Number(f.amt) || 0,
          date: String(f.date ?? new Date().toISOString().slice(0, 10)),
        };
      }
    }
  }

  const adminObj = (obj.admin && typeof obj.admin === 'object' ? obj.admin : {}) as Record<
    string,
    unknown
  >;

  return {
    schoolName: String(obj.schoolName ?? def.schoolName),
    campus: String(obj.campus ?? def.campus),
    admin: {
      user: String(adminObj.user ?? def.admin.user),
      pass: String(adminObj.pass ?? def.admin.pass),
    },
    teachers,
    students,
    att,
    fees,
    nid: Number(obj.nid) || 100,
  };
}

export function loadLocalDB(): SchoolDB {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY_V2);
    if (v2) return normalizeDB(JSON.parse(v2));
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const migrated = normalizeDB(JSON.parse(v1));
      saveLocalDB(migrated);
      return migrated;
    }
  } catch {
    // ignore storage errors
  }
  const initial = createDefaultDB();
  saveLocalDB(initial);
  return initial;
}

export function saveLocalDB(data: SchoolDB): void {
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function cropPhotoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          150,
          150
        );
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export interface CloudKnownIds {
  students: Set<string>;
  teachers: Set<string>;
  attendance: Set<string>;
  fees: Set<string>;
}

export function subscribeSchoolCloud(
  schoolId: string,
  onSchoolPatch: (patch: Partial<SchoolDB>, knownIds: CloudKnownIds, hasRemoteData: boolean) => void,
  onSyncError: (err: Error) => void
): Unsubscribe {
  const knownIds: CloudKnownIds = {
    students: new Set(),
    teachers: new Set(),
    attendance: new Set(),
    fees: new Set(),
  };

  let latestStudents: Student[] | null = null;
  let latestTeachers: Teacher[] | null = null;
  let latestAtt: SchoolDB['att'] | null = null;
  let latestFees: SchoolDB['fees'] | null = null;
  let schoolMeta: Partial<SchoolDB> = {};
  let hasRemoteSchool = false;

  const emit = () => {
    const patch: Partial<SchoolDB> = { ...schoolMeta };
    if (latestStudents !== null) patch.students = latestStudents;
    if (latestTeachers !== null) patch.teachers = latestTeachers;
    if (latestAtt !== null) patch.att = latestAtt;
    if (latestFees !== null) patch.fees = latestFees;
    onSchoolPatch(
      patch,
      knownIds,
      hasRemoteSchool ||
        (latestStudents?.length ?? 0) > 0 ||
        (latestTeachers?.length ?? 0) > 0
    );
  };

  const schoolRef = doc(db, 'schools', schoolId);
  const unsubSchool = onSnapshot(
    schoolRef,
    (snap) => {
      if (snap.exists()) {
        hasRemoteSchool = true;
        const d = snap.data();
        schoolMeta = {
          schoolName: String(d.schoolName || 'Ayesha Amir Nursing School'),
          campus: String(d.campus || 'Mamukanjan'),
          admin: {
            user: String(d.adminUser || 'admin'),
            pass: String(d.adminPass || 'admin123'),
          },
        };
      } else {
        hasRemoteSchool = false;
      }
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `schools/${schoolId}`);
      } catch (e) {
        onSyncError(e as Error);
      }
    }
  );

  const studentsPath = `schools/${schoolId}/students`;
  const unsubStudents = onSnapshot(
    query(collection(db, studentsPath), where('ownerId', '==', schoolId)),
    (snap) => {
      knownIds.students.clear();
      latestStudents = snap.docs.map((docSnap) => {
        knownIds.students.add(docSnap.id);
        const d = docSnap.data();
        return {
          id: docSnap.id,
          roll: String(d.roll || ''),
          name: String(d.name || ''),
          cls: String(d.cls || ''),
          fee: Number(d.fee) || 0,
          pass: String(d.pass || '1234'),
          ...(typeof d.photo === 'string' && d.photo ? { photo: d.photo } : {}),
        };
      });
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, studentsPath);
      } catch (e) {
        onSyncError(e as Error);
      }
    }
  );

  const teachersPath = `schools/${schoolId}/teachers`;
  const unsubTeachers = onSnapshot(
    query(collection(db, teachersPath), where('ownerId', '==', schoolId)),
    (snap) => {
      knownIds.teachers.clear();
      latestTeachers = snap.docs.map((docSnap) => {
        knownIds.teachers.add(docSnap.id);
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: String(d.name || ''),
          user: String(d.user || ''),
          pass: String(d.pass || '1234'),
          cls: String(d.cls || ''),
        };
      });
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, teachersPath);
      } catch (e) {
        onSyncError(e as Error);
      }
    }
  );

  const attPath = `schools/${schoolId}/attendance`;
  const unsubAtt = onSnapshot(
    query(collection(db, attPath), where('ownerId', '==', schoolId)),
    (snap) => {
      knownIds.attendance.clear();
      const map: SchoolDB['att'] = {};
      snap.docs.forEach((docSnap) => {
        knownIds.attendance.add(docSnap.id);
        const d = docSnap.data();
        const dateStr = String(d.date || '');
        const sid = String(d.studentId || '');
        const status = d.status as AttendanceCode;
        if (dateStr && sid && (status === 'P' || status === 'A' || status === 'L')) {
          if (!map[dateStr]) map[dateStr] = {};
          map[dateStr][sid] = status;
        }
      });
      latestAtt = map;
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, attPath);
      } catch (e) {
        onSyncError(e as Error);
      }
    }
  );

  const feesPath = `schools/${schoolId}/fees`;
  const unsubFees = onSnapshot(
    query(collection(db, feesPath), where('ownerId', '==', schoolId)),
    (snap) => {
      knownIds.fees.clear();
      const map: SchoolDB['fees'] = {};
      snap.docs.forEach((docSnap) => {
        knownIds.fees.add(docSnap.id);
        const d = docSnap.data();
        const sid = String(d.studentId || '');
        const month = String(d.month || '');
        if (sid && month) {
          map[`${sid}|${month}`] = {
            amt: Number(d.amount) || 0,
            date: String(d.paidDate || ''),
          };
        }
      });
      latestFees = map;
      emit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, feesPath);
      } catch (e) {
        onSyncError(e as Error);
      }
    }
  );

  return () => {
    unsubSchool();
    unsubStudents();
    unsubTeachers();
    unsubAtt();
    unsubFees();
  };
}

export async function ensureCloudSchoolDoc(schoolId: string, localDb: SchoolDB): Promise<void> {
  const path = `schools/${schoolId}`;
  const ref = doc(db, path);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: schoolId,
        schoolName: localDb.schoolName.slice(0, 120),
        campus: localDb.campus.slice(0, 80),
        adminUser: localDb.admin.user.slice(0, 40),
        adminPass: localDb.admin.pass.slice(0, 64),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function pushLocalToCloud(schoolId: string, localDb: SchoolDB): Promise<void> {
  await ensureCloudSchoolDoc(schoolId, localDb);

  // Batch 1: Students & Teachers (must commit before attendance/fees due to exists() rule)
  const batch1 = writeBatch(db);
  for (const s of localDb.students) {
    const ref = doc(db, `schools/${schoolId}/students/${s.id}`);
    batch1.set(ref, {
      id: s.id,
      ownerId: schoolId,
      roll: s.roll.slice(0, 32),
      name: s.name.slice(0, 100),
      cls: s.cls.slice(0, 60),
      fee: Math.max(0, Number(s.fee) || 0),
      pass: s.pass.slice(0, 64),
      ...(s.photo && s.photo.length <= 100000 ? { photo: s.photo } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const t of localDb.teachers) {
    const ref = doc(db, `schools/${schoolId}/teachers/${t.id}`);
    batch1.set(ref, {
      id: t.id,
      ownerId: schoolId,
      name: t.name.slice(0, 100),
      user: t.user.slice(0, 40),
      pass: t.pass.slice(0, 64),
      cls: t.cls.slice(0, 60),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch1.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `schools/${schoolId}/students`);
  }

  // Batch 2: Attendance & Fees (chunked by 400 ops)
  const studentIds = new Set(localDb.students.map((s) => s.id));
  const ops: Array<() => void> = [];
  let batch2 = writeBatch(db);
  let count = 0;

  const commitChunk = async () => {
    if (count > 0) {
      await batch2.commit();
      batch2 = writeBatch(db);
      count = 0;
    }
  };

  for (const [dateStr, dayMap] of Object.entries(localDb.att)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    for (const [sid, status] of Object.entries(dayMap)) {
      if (!studentIds.has(sid)) continue;
      const attId = `${dateStr}_${sid}`;
      ops.push(() => {
        batch2.set(doc(db, `schools/${schoolId}/attendance/${attId}`), {
          id: attId,
          ownerId: schoolId,
          date: dateStr,
          studentId: sid,
          status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    }
  }

  for (const [key, payment] of Object.entries(localDb.fees)) {
    const [sid, month] = key.split('|');
    if (!sid || !month || !studentIds.has(sid)) continue;
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const feeId = `${sid}_${month}`;
    ops.push(() => {
      batch2.set(doc(db, `schools/${schoolId}/fees/${feeId}`), {
        id: feeId,
        ownerId: schoolId,
        studentId: sid,
        month,
        amount: Math.max(0, Number(payment.amt) || 0),
        paidDate: /^\d{4}-\d{2}-\d{2}$/.test(payment.date)
          ? payment.date
          : new Date().toISOString().slice(0, 10),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  try {
    for (const op of ops) {
      op();
      count++;
      if (count >= 400) {
        await commitChunk();
      }
    }
    await commitChunk();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `schools/${schoolId}/attendance`);
  }
}

export async function cloudSaveStudent(
  schoolId: string,
  student: Student,
  isExisting: boolean
): Promise<void> {
  const path = `schools/${schoolId}/students/${student.id}`;
  const ref = doc(db, path);
  try {
    if (isExisting) {
      await updateDoc(ref, {
        roll: student.roll.slice(0, 32),
        name: student.name.slice(0, 100),
        cls: student.cls.slice(0, 60),
        fee: Math.max(0, Number(student.fee) || 0),
        pass: student.pass.slice(0, 64),
        ...(student.photo && student.photo.length <= 100000 ? { photo: student.photo } : {}),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: student.id,
        ownerId: schoolId,
        roll: student.roll.slice(0, 32),
        name: student.name.slice(0, 100),
        cls: student.cls.slice(0, 60),
        fee: Math.max(0, Number(student.fee) || 0),
        pass: student.pass.slice(0, 64),
        ...(student.photo && student.photo.length <= 100000 ? { photo: student.photo } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function cloudDeleteStudent(schoolId: string, studentId: string): Promise<void> {
  const path = `schools/${schoolId}/students/${studentId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function cloudSaveTeacher(
  schoolId: string,
  teacher: Teacher,
  isExisting: boolean
): Promise<void> {
  const path = `schools/${schoolId}/teachers/${teacher.id}`;
  const ref = doc(db, path);
  try {
    if (isExisting) {
      await updateDoc(ref, {
        name: teacher.name.slice(0, 100),
        user: teacher.user.slice(0, 40),
        pass: teacher.pass.slice(0, 64),
        cls: teacher.cls.slice(0, 60),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: teacher.id,
        ownerId: schoolId,
        name: teacher.name.slice(0, 100),
        user: teacher.user.slice(0, 40),
        pass: teacher.pass.slice(0, 64),
        cls: teacher.cls.slice(0, 60),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function cloudDeleteTeacher(schoolId: string, teacherId: string): Promise<void> {
  const path = `schools/${schoolId}/teachers/${teacherId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function cloudSaveAttendance(
  schoolId: string,
  dateStr: string,
  studentId: string,
  status: AttendanceCode,
  isExisting: boolean
): Promise<void> {
  const attId = `${dateStr}_${studentId}`;
  const path = `schools/${schoolId}/attendance/${attId}`;
  const ref = doc(db, path);
  try {
    if (isExisting) {
      await updateDoc(ref, {
        status,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: attId,
        ownerId: schoolId,
        date: dateStr,
        studentId,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function cloudToggleFee(
  schoolId: string,
  studentId: string,
  month: string,
  payment: FeePayment | null
): Promise<void> {
  const feeId = `${studentId}_${month}`;
  const path = `schools/${schoolId}/fees/${feeId}`;
  const ref = doc(db, path);
  try {
    if (!payment) {
      await deleteDoc(ref);
    } else {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          amount: Math.max(0, Number(payment.amt) || 0),
          paidDate: payment.date,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: feeId,
          ownerId: schoolId,
          studentId,
          month,
          amount: Math.max(0, Number(payment.amt) || 0),
          paidDate: payment.date,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function cloudUpdateAdminPassword(
  schoolId: string,
  newPass: string
): Promise<void> {
  const path = `schools/${schoolId}`;
  try {
    await updateDoc(doc(db, path), {
      adminPass: newPass.slice(0, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
